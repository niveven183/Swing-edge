// ─────────────────────────────────────────────────────────────────────────────
// NotebookTab.jsx — B3 free-form trader notebook (NOT tied to a trade).
// Distinct from mentor_notes (trade-scoped mentor feedback) and trades.notes.
// Persists to public.journal_notes (RLS: users see only their own rows).
// v3 design language · he/en i18n · RTL/dark aware.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { NotebookPen, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";

const PANEL =
  "bg-[var(--v3-bg-panel)] border border-[var(--border-subtle)] dark:border-white/[0.06] rounded-[var(--v3-radius-card)]";

function formatStamp(iso, lang) {
  try {
    return new Date(iso).toLocaleString(lang === "he" ? "he-IL" : "en-US", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function NotebookTab({ authUser, t, lang, isRTL }) {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [err, setErr] = useState(null);

  const canDB = isSupabaseConfigured && supabase && authUser?.id;

  const load = useCallback(async () => {
    if (!canDB) return;
    const { data, error } = await supabase
      .from("journal_notes")
      .select("*")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false });
    if (error) { console.error("journal_notes load:", error); setErr(error.message); return; }
    setErr(null);
    setNotes(data || []);
  }, [canDB, authUser?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const content = draft.trim();
    if (!content || !canDB || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("journal_notes")
      .insert({ user_id: authUser.id, content });
    setSaving(false);
    if (error) { console.error("journal_notes insert:", error); setErr(error.message); return; }
    setDraft("");
    load();
  };

  const startEdit = (note) => { setEditingId(note.id); setEditDraft(note.content); };
  const cancelEdit = () => { setEditingId(null); setEditDraft(""); };

  const handleUpdate = async (id) => {
    const content = editDraft.trim();
    if (!content || !canDB) return;
    const { error } = await supabase
      .from("journal_notes")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { console.error("journal_notes update:", error); setErr(error.message); return; }
    cancelEdit();
    load();
  };

  const handleDelete = async (id) => {
    if (!canDB) return;
    if (typeof window !== "undefined" && !window.confirm(t.nb_deleteConfirm || "Delete this note?")) return;
    const { error } = await supabase.from("journal_notes").delete().eq("id", id);
    if (error) { console.error("journal_notes delete:", error); setErr(error.message); return; }
    load();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <NotebookPen size={18} className="text-[var(--v3-accent)]" />
        <h2 className="text-lg font-bold text-[var(--v3-text-hi)]">{t.notebookTab}</h2>
      </div>

      {/* Composer */}
      <div data-tour="notebook" className={`${PANEL} p-4`}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.nb_placeholder}
          rows={4}
          maxLength={10000}
          className="w-full resize-y bg-white/5 border border-[var(--border-subtle)] rounded-[var(--v3-radius-chip)] px-3 py-2 text-sm text-[var(--v3-text-hi)] placeholder:text-[var(--v3-text-lo)] focus:border-[var(--v3-accent)] focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] font-mono text-[var(--v3-text-lo)]">{draft.length}/10000</span>
          <button
            onClick={handleSave}
            disabled={!draft.trim() || saving || !canDB}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--v3-radius-chip)] text-sm font-semibold bg-[var(--v3-accent-glow)] border border-[#00C076]/30 text-[var(--v3-accent)] hover:bg-[var(--v3-accent)]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={15} />
            {saving ? (t.nb_saving || "…") : t.nb_save}
          </button>
        </div>
        {!canDB && (
          <div className="mt-2 text-[11px] text-[var(--v3-text-lo)]">
            {lang === "he" ? "התחבר כדי לשמור רשומות." : "Sign in to save notes."}
          </div>
        )}
      </div>

      {err && (
        <div className="text-xs text-[var(--v3-loss)] px-1">{err}</div>
      )}

      {/* List */}
      {notes.length === 0 ? (
        <div className={`${PANEL} p-8 text-center text-sm text-[var(--v3-text-lo)]`}>
          {t.nb_empty}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className={`${PANEL} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-block px-2 py-1 rounded-[var(--v3-radius-chip)] bg-white/5 text-[11px] font-mono text-[var(--v3-text-mid)]">
                  {formatStamp(note.created_at, lang)}
                </span>
                {editingId !== note.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(note)}
                      title={t.nb_edit}
                      className="p-1.5 rounded-md text-[var(--v3-text-lo)] hover:text-[var(--v3-accent)] hover:bg-white/5 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      title={t.nb_delete}
                      className="p-1.5 rounded-md text-[var(--v3-text-lo)] hover:text-[var(--v3-loss)] hover:bg-white/5 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {editingId === note.id ? (
                <div>
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={4}
                    maxLength={10000}
                    className="w-full resize-y bg-white/5 border border-[var(--border-subtle)] rounded-[var(--v3-radius-chip)] px-3 py-2 text-sm text-[var(--v3-text-hi)] focus:border-[var(--v3-accent)] focus:outline-none"
                  />
                  <div className="mt-2 flex items-center gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--v3-radius-chip)] text-xs font-semibold text-[var(--v3-text-lo)] hover:bg-white/5"
                    >
                      <X size={13} /> {t.cancel || "Cancel"}
                    </button>
                    <button
                      onClick={() => handleUpdate(note.id)}
                      disabled={!editDraft.trim()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--v3-radius-chip)] text-xs font-semibold bg-[var(--v3-accent-glow)] border border-[#00C076]/30 text-[var(--v3-accent)] hover:bg-[var(--v3-accent)]/20 disabled:opacity-40"
                    >
                      <Check size={13} /> {t.nb_save}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--v3-text-hi)] whitespace-pre-wrap break-words leading-relaxed">
                  {note.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
