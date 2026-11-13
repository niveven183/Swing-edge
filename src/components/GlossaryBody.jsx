// src/components/GlossaryBody.jsx — the glossary dialog's content. Loaded ONLY through import() in
// GlossaryShell (⛔ a static import anywhere — test:glossary R8): it pulls the long text of every term
// in 5 languages, which must stay out of the main chunk.
import { useEffect, useMemo, useRef, useState } from "react";
import { TERM_IDS, termCategory, termLabel, termText, hasTerm } from "../glossary/index.js";
import { longText, termMeta } from "../glossary/long.js";
import { glossaryUi, glossaryCategory } from "../glossary/ui.js";

const norm = (s) => String(s ?? "").toLowerCase();

export default function GlossaryBody({ term = "", lang = "he" }) {
  const ui = glossaryUi(lang);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(hasTerm(term) ? term : "");
  const itemRefs = useRef({});

  useEffect(() => {
    if (openId) itemRefs.current[openId]?.scrollIntoView({ block: "start" });
  }, [openId]);

  const groups = useMemo(() => {
    const needle = norm(q).trim();
    const out = [];
    for (const id of TERM_IDS) {
      if (needle && !norm(termLabel(id, lang)).includes(needle) && !norm(termLabel(id, "en")).includes(needle) && !norm(termText(id, lang)).includes(needle)) continue;
      const cat = termCategory(id);
      let g = out.find((x) => x.cat === cat);
      if (!g) out.push((g = { cat, ids: [] }));
      g.ids.push(id);
    }
    return out;
  }, [q, lang]);

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={ui.search}
        aria-label={ui.search}
        className="w-full rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
      />
      {groups.length === 0 && <p className="text-xs text-slate-500">{ui.none}</p>}
      {groups.map((g) => (
        <section key={g.cat}>
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1.5">{glossaryCategory(g.cat, lang)}</h3>
          <ul className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {g.ids.map((id) => {
              const open = openId === id;
              const long = open ? longText(id, lang) : null;
              const meta = open ? termMeta(id) : null;
              return (
                <li key={id} ref={(el) => { itemRefs.current[id] = el; }} data-term-id={id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? "" : id)}
                    className="w-full flex items-center justify-between gap-2 py-2 text-start text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    <span>{termLabel(id, lang)}</span>
                    <span aria-hidden="true" className="text-slate-400 text-xs">{open ? "−" : "+"}</span>
                  </button>
                  {open && (
                    <div className="pb-3 space-y-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                      <p className="whitespace-pre-line">{long ?? termText(id, lang)}</p>
                      {long && <p className="whitespace-pre-line text-slate-500 dark:text-slate-400 text-xs border-s-2 border-emerald-500/40 ps-2">{termText(id, lang)}</p>}
                      {meta.sources.length > 0 && (
                        <p className="text-[11px] text-slate-500">
                          {ui.sources}:{" "}
                          {meta.sources.map((s, i) => (
                            <span key={s.key}>
                              {i > 0 && " · "}
                              <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-500">{s.title}</a>
                            </span>
                          ))}
                        </p>
                      )}
                      {(meta.related ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {meta.related.filter(hasTerm).map((r) => (
                            <button key={r} type="button" onClick={() => { setQ(""); setOpenId(r); }}
                              className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:border-emerald-500">
                              {termLabel(r, lang)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
