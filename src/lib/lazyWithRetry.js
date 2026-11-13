// src/lib/lazyWithRetry.js — React.lazy with one reload on a stale-chunk error.
//
// Moved from SwingEdge_App.jsx (wave 3, 13.11) so a second lazy surface (the glossary dialog) uses
// the SAME mechanism instead of a copy. Behaviour is unchanged for AdminPanel: same default flag key.
//
// A deploy that removes an old chunk breaks a tab that loaded the old index.html; the first failed
// dynamic import reloads the page once (flag in sessionStorage), a second failure is thrown to the
// nearest error boundary — the user sees the panel's "נסה שוב" card, ⛔ a blank screen.
// It does NOT cover statically preloaded chunks (recharts — B-320): those never reach importFn.
import { lazy } from "react";

export default function lazyWithRetry(importFn, flagKey = "chunk-reloaded-adminpanel") {
  return lazy(() =>
    importFn().catch((err) => {
      const isChunkError =
        /Failed to fetch dynamically imported module/i.test(err?.message || "") ||
        err?.name === "ChunkLoadError";
      if (!isChunkError) throw err;
      if (sessionStorage.getItem(flagKey)) throw err;
      sessionStorage.setItem(flagKey, "1");
      window.location.reload();
      return new Promise(() => {});
    })
  );
}
