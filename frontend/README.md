# ClaimGuard — Frontend

Next.js 16 (App Router, RSC) dashboard wired to the FastAPI backend, built with
shadcn/ui (preset `b5KcMrk3P` — luma style, blue/mist theme, hugeicons, Geist).

## Prerequisites

The backend must be running and seeded first (see `../backend/README.md`):

```bash
# from ../backend, with the venv active and Docker Postgres up
python seed.py
uvicorn app.main:app --port 8000
```

The backend has CORS enabled for `http://localhost:3000` so the browser-side
upload and appeal mutations work.

## Run

```bash
npm install        # first time
npm run dev        # http://localhost:3000
```

`.env.local` sets `NEXT_PUBLIC_API_URL=http://localhost:8000`. Server Components
fetch from it during SSR; client mutations (upload, appeal edits) call it from
the browser. In production (Vercel) point it at the live AWS API:
`NEXT_PUBLIC_API_URL=https://apiclaimguard.otito.site`.

```bash
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm run start      # serve the production build
```

## Pages (TRD §9)

- `/` — dashboard: metric cards + Denial Rate by Payer / Revenue at Risk by
  Category charts
- `/claims` — status-filterable claims table; rows open the detail
- `/claims/[id]` — claim info, AI denial reasoning + classification, editable
  appeal letter with submit/won/lost actions, activity timeline
- `/needs-action` — drafted appeals with a deadline within 7 days
- `/upload` — drag-and-drop EOB PDF → live pipeline result

## Layout

- `app/(app)/` — route group sharing the sidebar + ledger-header shell
- `components/` — ClaimGuard primitives: `code-stamp`, `status-badge`,
  `deadline-chip`, `metric-card`, plus view components and `charts/`
- `lib/api.ts` — typed client to the backend; `lib/types.ts` mirrors the API
  schemas; `lib/format.ts` for currency/date/percent
- design tokens: preset theme in `app/globals.css`, with `--status-*` tokens
  added for the semantic claim/appeal colors
