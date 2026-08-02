import { useState, useEffect, useMemo, useRef, useId } from "react";
import { Upload, X, FileSpreadsheet, AlertTriangle, CheckCircle2, Download, ArrowLeft, ArrowRight } from "lucide-react";
import useModalA11y from "../hooks/useModalA11y.js";
import { parseFile } from "../import/parseFile.js";
import { detectColumns } from "../import/detectColumns.js";
import { buildImport, rejectedToCSV } from "../import/buildImport.js";
import { MAPPABLE_FIELDS, REQUIRED_FIELDS } from "../import/synonyms.js";
import { detectProfile, applyProfile } from "../import/brokerProfiles.js";

// Universal journal import wizard (Wave 10). Three steps: upload -> map -> review.
// Pipeline lives entirely in src/import/*; this component is the UI shell and
// hands the parent a ready-to-persist array of trade objects via onImport.
//
// props:
//   open, lang, t (translations dict), capital, accountCurrency, existingTrades,
//   onClose, onImport(trades)
export default function ImportJournalModal({ open, lang, t: tr = {}, capital = 0, accountCurrency = "USD", existingTrades = [], onClose, onImport }) {
  const isHe = lang === "he";
  const titleId = useId();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);              // 1 upload · 2 map · 3 review
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState(null);       // { headers, rows, sheetNames?, file }
  const [applied, setApplied] = useState(null);     // broker profile result, or null for the generic route
  const [sheetNames, setSheetNames] = useState([]);
  const [colField, setColField] = useState([]);     // per-column field | ""
  const [dateFormat, setDateFormat] = useState("DD/MM");
  const [importDupes, setImportDupes] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const t = (key, vars) => {
    const raw = tr[key] ?? key;
    if (!vars) return raw;
    return Object.keys(vars).reduce((s, k) => s.replaceAll(`{${k}}`, vars[k]), raw);
  };

  useEffect(() => {
    if (!open) return;
    setStep(1); setFileName(""); setParsed(null); setApplied(null); setSheetNames([]);
    setColField([]); setDateFormat("DD/MM"); setImportDupes(false);
    setError(null); setBusy(false);
  }, [open]);

  const modalRef = useModalA11y({ active: open, onClose: () => { if (!busy) onClose?.(); } });

  // Build mapping {field:index} from the per-column selects; first column wins.
  const mapping = useMemo(() => {
    const m = {};
    colField.forEach((f, idx) => { if (f && m[f] == null) m[f] = idx; });
    return m;
  }, [colField]);

  const dateDetected = mapping.date != null;
  const missingRequired = REQUIRED_FIELDS.filter((f) => mapping[f] == null);

  // Live pipeline result (step 3), recomputed when mapping/format/dupes change.
  const result = useMemo(() => {
    if (step !== 3 || !parsed) return null;
    return buildImport(parsed.rows, mapping, {
      dateFormat, capital, existingTrades,
      sideResolver: applied?.sideResolver,
      tickerResolver: applied?.tickerResolver,
      unitResolver: applied?.unitResolver,
      defaultCurrency: accountCurrency,
      skipped: applied?.skipped,
      skippedByKind: applied?.skippedByKind,
      // A broker file is a transaction log — one row per buy, one per sell — so
      // its rows have to be matched before they are trades. A generic file
      // already carries entry and exit on one row and must never be matched.
      fifo: !!applied,
    });
  }, [step, parsed, applied, mapping, dateFormat, capital, existingTrades]);

  if (!open) return null;

  const applyDetection = (headers, rows) => {
    const det = detectColumns(headers, rows);
    const cf = headers.map(() => "");
    Object.entries(det.mapping).forEach(([field, idx]) => { cf[idx] = field; });
    setColField(cf);
    setDateFormat(det.dateFormat);
  };

  const firstNonBlank = (matrix) => {
    const row = (matrix || []).find((r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim() !== ""));
    return row ? row.filter((c) => String(c ?? "").trim() !== "").join(" | ").slice(0, 80) : "";
  };

  // A broker profile engages only on a full column fingerprint. When one does, it
  // — not the first non-blank line — decides where the header sits and which rows
  // are trades. No profile means the generic route, byte-for-byte unchanged.
  // Returns the {headers, rows} to display, or null when it has already errored.
  const ingest = (res) => {
    const profile = detectProfile(res.matrix);
    if (!profile) {
      setApplied(null);
      applyDetection(res.headers, res.rows);
      return { headers: res.headers, rows: res.rows };
    }
    const ap = applyProfile(profile, res.matrix);
    if (ap.headerIdx < 0) {
      setApplied(null);
      setError(t("imp_no_header_found", { firstRow: firstNonBlank(res.matrix) }));
      return null;
    }
    setApplied(ap);
    applyDetection(ap.headers, ap.rows);
    return { headers: ap.headers, rows: ap.rows };
  };

  const reportFailure = (e, ctx) => {
    console.error("[import] parse failed:", ctx, e);
    const reason = e?.message ? String(e.message) : String(e);
    setError(`${t("imp_parse_error")} — ${reason}`);
  };

  const handleFile = async (file, sheetName) => {
    if (!file) return;
    setBusy(true); setError(null); setApplied(null);
    try {
      const res = await parseFile(file, sheetName);
      if (!res.rows || res.rows.length === 0) { setError(t("imp_empty_file")); setBusy(false); return; }
      const view = ingest(res);
      if (!view) { setBusy(false); return; }
      setFileName(file.name);
      setParsed({ ...res, ...view, file });
      setSheetNames(res.sheetNames && res.sheetNames.length > 1 ? res.sheetNames : []);
      setStep(2);
    } catch (e) {
      reportFailure(e, { file: file?.name, size: file?.size, sheet: sheetName ?? null });
    }
    setBusy(false);
  };

  const pickSheet = async (name) => {
    if (!parsed?.file) return;
    setBusy(true); setError(null);
    try {
      const res = await parseFile(parsed.file, name);
      const view = ingest(res);
      if (!view) { setBusy(false); return; }
      setParsed({ ...res, ...view, file: parsed.file });
    } catch (e) {
      reportFailure(e, { file: parsed.file?.name, size: parsed.file?.size, sheet: name });
    }
    setBusy(false);
  };

  const downloadRejected = () => {
    if (!result?.rejected?.length) return;
    const csv = rejectedToCSV(result.rejected, parsed.headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rejected-rows.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const confirmImport = () => {
    if (!result) return;
    const toImport = importDupes
      ? [...result.valid, ...result.duplicates.map((d) => d.trade)]
      : result.valid;
    if (toImport.length === 0) { setError(t("imp_nothing")); return; }
    onImport?.(toImport);
  };

  const fieldLabel = (f) => t(`imp_field_${f}`);
  const preview = parsed ? parsed.rows.slice(0, 5) : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="presentation" onClick={() => { if (!busy) onClose?.(); }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[var(--bg-elevated)] dark:bg-[#0d1424] border border-white/10 rounded-2xl shadow-2xl overflow-hidden focus:outline-none">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-cyan-400" />
            <span id={titleId} className="text-sm font-bold text-white">{t("imp_title")}</span>
            <span className="text-[11px] text-slate-500">· {step}/3</span>
          </div>
          <button onClick={() => { if (!busy) onClose?.(); }} aria-label={t("imp_cancel")}
            className="text-slate-500 hover:text-white transition"><X size={16} /></button>
        </div>

        <div className="p-5 overflow-y-auto">
          {/* ── Step 1 — Upload ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">{t("imp_step1_title")}</h4>
                <p className="text-xs text-slate-400 mt-1">{t("imp_step1_body")}</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-white/15 hover:border-cyan-500/50 bg-white/[0.02] hover:bg-cyan-500/[0.04] transition py-10 flex flex-col items-center gap-2 text-slate-400">
                <Upload size={24} className="text-cyan-400" />
                <span className="text-sm">{t("imp_dropzone")}</span>
                <span className="text-[11px] text-slate-600">CSV · XLSX · XLS</span>
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; handleFile(f); }} />
              {busy && <p className="text-xs text-slate-500">…</p>}
              {error && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">{error}</div>}
            </div>
          )}

          {/* ── Step 2 — Map columns ── */}
          {step === 2 && parsed && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">{t("imp_step2_title")}</h4>
                <p className="text-xs text-slate-400 mt-1">{t("imp_step2_body")}</p>
              </div>

              {sheetNames.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-400">{t("imp_sheet_pick")}</span>
                  {sheetNames.map((n) => (
                    <button key={n} onClick={() => pickSheet(n)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] border transition ${parsed.sheet === n ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {applied && (
                <div className="inline-flex items-center gap-1.5 text-[11px] text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-2.5 py-1">
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span>{t("imp_profile_detected", { label: applied.profile.label })}</span>
                </div>
              )}

              {missingRequired.length > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div>{t("imp_missing_required", { fields: missingRequired.map(fieldLabel).join(", ") })}</div>
                    {/* Say what we saw, not only what we lack: a user told the file
                        has 13 columns and 0 recognised ones knows where to look. */}
                    {!applied && (
                      <div className="text-amber-300/70">
                        {t("imp_profile_unknown", {
                          n: parsed.headers.length,
                          rows: parsed.rows.length,
                          missing: missingRequired.map(fieldLabel).join(", "),
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!dateDetected && (
                <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{t("imp_no_date_warn")}</span>
                </div>
              )}

              {dateDetected && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{t("imp_dateformat_label", { fmt: dateFormat })}</span>
                  <button onClick={() => setDateFormat((f) => (f === "DD/MM" ? "MM/DD" : "DD/MM"))}
                    className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition">
                    {t("imp_dateformat_switch")}
                  </button>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-white/[0.03]">
                      {parsed.headers.map((h, idx) => (
                        <th key={idx} className="p-2 align-top min-w-[130px] text-start">
                          <div className="text-slate-400 font-normal truncate mb-1" title={String(h)}>{String(h) || `#${idx + 1}`}</div>
                          <select
                            value={colField[idx] || ""}
                            onChange={(e) => setColField((cf) => { const n = [...cf]; n[idx] = e.target.value; return n; })}
                            className="w-full bg-[#0d1424] border border-white/10 rounded px-1.5 py-1 text-slate-200 focus:border-cyan-500/50 focus:outline-none">
                            <option value="">{t("imp_col_ignore")}</option>
                            {MAPPABLE_FIELDS.map((f) => (
                              <option key={f} value={f}>
                                {fieldLabel(f)}{REQUIRED_FIELDS.includes(f) ? " *" : ""}
                              </option>
                            ))}
                          </select>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, ri) => (
                      <tr key={ri} className="border-t border-white/5">
                        {parsed.headers.map((_, ci) => (
                          <td key={ci} className="p-2 text-slate-300 truncate max-w-[160px]">{String(row[ci] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-600">{t("imp_preview_rows", { n: preview.length })}</p>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition inline-flex items-center gap-1.5">
                  <ArrowLeft size={14} /> {t("imp_back")}
                </button>
                <button onClick={() => setStep(3)} disabled={missingRequired.length > 0}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900/40 disabled:text-cyan-300/40 disabled:cursor-not-allowed text-white text-sm font-bold transition inline-flex items-center justify-center gap-1.5">
                  {t("imp_continue")} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 — Review & confirm ── */}
          {step === 3 && result && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">{t("imp_step3_title")}</h4>
                <p className="text-xs text-slate-400 mt-1">{t("imp_step3_body")}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center">
                  <div className="text-lg font-bold text-emerald-300">{result.counts.valid}</div>
                  <div className="text-[10px] text-emerald-400/80">{t("imp_count_valid", { n: result.counts.valid })}</div>
                </div>
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-center">
                  <div className="text-lg font-bold text-rose-300">{result.counts.rejected}</div>
                  <div className="text-[10px] text-rose-400/80">{t("imp_count_rejected", { n: result.counts.rejected })}</div>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-center">
                  <div className="text-lg font-bold text-amber-300">{result.counts.duplicates}</div>
                  <div className="text-[10px] text-amber-400/80">{t("imp_count_dupes", { n: result.counts.duplicates })}</div>
                </div>
              </div>

              {/* Shown even at zero. A counter that appears only when there is
                  something to report teaches the reader that its absence means
                  "everything went in" — which is exactly where a silent loss hides. */}
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-1">
                <div className="text-xs text-slate-200">
                  {result.counts.skipped > 0
                    ? t("imp_skipped_summary", { valid: result.counts.valid, skipped: result.counts.skipped })
                    : t("imp_skipped_none", { valid: result.counts.valid })}
                </div>
                {result.counts.skipped > 0 && (
                  <div className="text-[11px] text-slate-400">
                    {t("imp_skipped_kinds", {
                      kinds: Object.entries(result.skippedByKind)
                        .sort((a, b) => b[1] - a[1])
                        .map(([kind, n]) => `${kind} ${n}`)
                        .join(" · "),
                    })}
                  </div>
                )}
                {/* An addition to the line above, not a replacement: that one
                    counts file rows, this one counts the trades they became.
                    They are different populations and must not be read as one. */}
                {result.fifo && (
                  <div className="text-[11px] text-cyan-300/90">
                    {t("imp_fifo_summary", { closed: result.counts.closed, open: result.counts.open })}
                  </div>
                )}
                {result.fifo?.log?.reversedFileOrder && (
                  <div className="text-[11px] text-slate-400">{t("imp_fifo_reversed")}</div>
                )}
                {result.counts.unresolvedSymbol > 0 && (
                  <div className="text-[11px] text-amber-300/90">
                    {t("imp_unresolved_symbols", { n: result.counts.unresolvedSymbol })}
                  </div>
                )}
              </div>

              {result.noStopCount > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{t("imp_nostop_notice", { n: result.noStopCount })}</span>
                </div>
              )}

              {result.rejected.length > 0 && (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03]">
                    <span className="text-[11px] font-bold text-slate-300">{t("imp_rejected_title")}</span>
                    <button onClick={downloadRejected}
                      className="text-[11px] text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1">
                      <Download size={12} /> {t("imp_rejected_download")}
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto divide-y divide-white/5">
                    {result.rejected.slice(0, 50).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
                        <span className="text-slate-600 w-8 shrink-0">#{r.rowNumber}</span>
                        <span className="text-rose-300">{isHe ? r.detail?.he : r.detail?.en}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.duplicates.length > 0 && (
                <div className="rounded-xl border border-white/10 p-3 space-y-2">
                  <p className="text-[11px] text-slate-300">{t("imp_dupe_prompt")}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setImportDupes(false)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] border transition ${!importDupes ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200" : "bg-white/5 border-white/10 text-slate-300"}`}>
                      {t("imp_dupe_skip")}
                    </button>
                    <button onClick={() => setImportDupes(true)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] border transition ${importDupes ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200" : "bg-white/5 border-white/10 text-slate-300"}`}>
                      {t("imp_dupe_import")}
                    </button>
                  </div>
                </div>
              )}

              {error && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">{error}</div>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition inline-flex items-center gap-1.5">
                  <ArrowLeft size={14} /> {t("imp_back")}
                </button>
                <button onClick={confirmImport}
                  disabled={(importDupes ? result.valid.length + result.duplicates.length : result.valid.length) === 0}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900/40 disabled:text-emerald-300/40 disabled:cursor-not-allowed text-white text-sm font-bold transition inline-flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={14} />
                  {t("imp_confirm", { n: importDupes ? result.valid.length + result.duplicates.length : result.valid.length })}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
