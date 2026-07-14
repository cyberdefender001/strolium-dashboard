# Strolium — Boss financial-control dashboard

Standalone React (Vite) web app: the executive cockpit for Strolium's AI
financial control. It logs in against your Strolium backend and shows your
real org's data. If the backend is unreachable it falls back to a self-contained
demo so it always renders.

## Run locally

```
npm install
npm run dev
```

Open http://localhost:5173

## Demo login (give these to award judges — §8.6 login/password)

- Email: `boss@demo.uz`
- Parol: `demo1234`

## What is live vs demo right now

- LIVE (from your backend `/api/web/dashboard`): company name, KPIs
  (total spend, projects, workers, open tasks), the projects list, the workers
  list. Top-right shows a "jonli" badge when data is live, "demo" when offline.
- DEMO (labelled "namuna" in the UI): the fraud flags, the money trail, the
  reconciliation table, the trend. These go live once the audit brain (step 2)
  computes them from real delivery notes / invoices.

## Configure the backend URL

Copy `.env.example` to `.env` and set:

```
VITE_API_BASE=https://web-production-18d55.up.railway.app
```

(No trailing slash, no `/api`.) Default is already the Railway domain.

## Backend (deploy the patch first)

The matching backend patch adds two files: `app/api/web.py` (login + dashboard
API) and an updated `app/main.py` (CORS + router). No new Python dependencies.
Optional env vars on Railway:

```
WEB_DEMO_EMAIL=boss@demo.uz        # default
WEB_DEMO_PASSWORD=demo1234         # default — change for real judging
WEB_DEMO_NAME=Demo Rahbar          # shown in the sidebar
WEB_DEMO_ORG_ID=<uuid>             # which org the boss sees; defaults to the
                                   # owner's org, else the first org
```

## Build + deploy the dashboard

```
npm run build
```

Deploy the `dist/` folder to any static host (Vercel / Netlify / Cloudflare
Pages) on a clean subdomain. Set `VITE_API_BASE` there too.

## File map

- `src/config.js` — API base URL.
- `src/auth.js` — boss login (backend + offline fallback).
- `src/api/client.js` — the data seam (real backend + demo audit layer).
- `src/data/seed.js` — the demo audit data (flags / trend / reconciliation).
- `src/pages/`, `src/components/` — UI.
- `src/theme.css` — the design system.
