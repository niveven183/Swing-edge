# SwingEdge

An AI-coached trading journal for swing traders — logs trades, scores entries
against your own edge, and tracks habits over time.

**Live:** https://swing-edge.vercel.app

## Stack
React 18 · Vite 6 · Tailwind 3 · Recharts · Supabase (auth + storage) ·
Vercel (hosting + serverless functions) · Sentry (errors) · Claude Vision
(chart OCR).

## Local dev
```bash
npm install
npm run dev        # local dev server
npm run build      # production build
npm run preview    # preview a production build
npm run test:smoke # Playwright smoke suite
```
Copy `.env.example` to `.env` and fill in Supabase credentials before
running.

## Docs
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — codebase map: what lives
  where, the i18n systems, load-bearing strings, deploy flow.
- [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md) — phase status and roadmap.
- [docs/AGENTS.md](docs/AGENTS.md) — the agent/workflow team living in
  GitHub Actions.
- [docs/LEGAL_NOTES.md](docs/LEGAL_NOTES.md) — open items for legal review
  before scaling.
- [CONTEXT.md](CONTEXT.md) — deep product/engine reference (unified analysis
  engine, R/R conventions, etc.) — more detail than ARCHITECTURE.md covers.
- [HIVE_ARCHITECTURE.md](HIVE_ARCHITECTURE.md) — the separate Python demo-data
  agent system (`agents/`, `core/`) that seeds Supabase via MCP.

## CI
Build gate on every push/PR · Health Monitor every 30 min · Smoke tests
daily + on push.

## Working agreement
One session at a time. Plan Mode for anything non-trivial. `docs/` is the
source of truth — update it alongside the code it describes.
