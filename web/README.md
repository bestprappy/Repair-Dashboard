# Repair Analytics Dashboard (Next.js)

A migration of the original single-file `index.html` dashboard to **Next.js 16
(App Router)** with **shadcn/ui**, **Tailwind v4**, **Jotai** (UI state),
**TanStack Query** (provider scaffolding), and **Recharts** for visualization.

CSV parsing runs **client-side** with PapaParse, so uploaded files are never sent
to the application server. Authentication is enforced server-side.

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

## Password protection and deployment

Create `web/.env.local` for local development:

```dotenv
AUTH_PASSWORD=use-a-long-unique-random-password
NEXT_PUBLIC_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
```

The protected app requires a Next.js server and cannot be deployed securely to
GitHub Pages. Deploy the `web` directory to a server-capable host such as Vercel,
Netlify, or a Node server and set `AUTH_PASSWORD` in the hosting provider's
environment-variable settings. Never prefix it with `NEXT_PUBLIC_`, commit
`.env.local`, or place the real password in a GitHub Actions workflow.

Login creates an eight-hour signed `HttpOnly`, `SameSite=Strict` cookie. Password
comparison and session verification happen only on the server. CSV parsing still
happens in the browser and uploaded files are not sent to the application server.

## Structure

- `src/features/repair-dashboard/lib` — types, CSV transform, and view selectors
  (pure, framework-free; this is where the original aggregation logic lives).
- `src/features/repair-dashboard/state` — Jotai atoms for the upload→map→dash flow.
- `src/features/repair-dashboard/components` — screens, sections, and charts.
- `src/components` — shared primitives (`MetricCard`, `ChartCard`, `FilterPills`)
  and shadcn UI in `src/components/ui`.
