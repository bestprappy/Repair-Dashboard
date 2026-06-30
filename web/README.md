# Repair Analytics Dashboard (Next.js)

A migration of the original single-file `index.html` dashboard to **Next.js 16
(App Router)** with **shadcn/ui**, **Tailwind v4**, **Jotai** (UI state),
**TanStack Query** (provider scaffolding), and **Recharts** for visualization.

Everything still runs **client-side** — your CSV is parsed in the browser with
PapaParse and never uploaded anywhere.

## Flow

1. **Upload** — drag & drop or pick a repair `.csv`.
2. **Map Columns** — match CSV headers to Company, Status, Group Equipment,
   Year-Month, Amount (Equipment optional). Sensible defaults are auto-guessed.
3. **Dashboard** — `All Companies` aggregate plus a per-company sidebar. Each view
   shows status distribution (bar + donut), monthly amount by group, and — per
   company — group counts by status. Pills filter to a single group/status.

A sample dataset lives at the repo root: `../repair.csv`.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

## Structure

- `src/features/repair-dashboard/lib` — types, CSV transform, and view selectors
  (pure, framework-free; this is where the original aggregation logic lives).
- `src/features/repair-dashboard/state` — Jotai atoms for the upload→map→dash flow.
- `src/features/repair-dashboard/components` — screens, sections, and charts.
- `src/components` — shared primitives (`MetricCard`, `ChartCard`, `FilterPills`)
  and shadcn UI in `src/components/ui`.
