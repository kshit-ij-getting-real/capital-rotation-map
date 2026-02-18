# Capital Rotation Map Monorepo

Production-ready Next.js monorepo with two independently deployable Vercel projects:

- **App A (`apps/global`)**: Global Capital Rotation Map (Region → ETF)
- **App B (`apps/india`)**: India Sector Rotation Map (Sector → Stock)

Both apps use server-side data pipelines, resilient fallbacks, cache layers, scheduled refresh, and interactive treemap UI.

---

## 1) Repository structure

```txt
.
├── apps
│   ├── global
│   │   ├── app
│   │   │   ├── api/treemap/route.ts
│   │   │   ├── api/refresh/route.ts
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/treemap-client.tsx
│   │   ├── data/etfs.json
│   │   ├── lib/data-sources/*
│   │   └── vercel.json
│   └── india
│       ├── app
│       │   ├── api/treemap/route.ts
│       │   ├── api/refresh/route.ts
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/treemap-client.tsx
│       ├── data/india_universe.csv
│       ├── data/india_etf_universe.csv
│       ├── scripts/update-constituents.mjs
│       ├── lib/data-sources/*
│       └── vercel.json
├── packages
│   └── core/src/index.ts
└── pnpm-workspace.yaml
```

---

## 2) Local setup

### Prerequisites

- Node 20+
- pnpm 9+

### Install & run

```bash
pnpm install
pnpm dev
```

- Global app: `http://localhost:3000`
- India app: `http://localhost:3001`

### Build/test

```bash
pnpm build
pnpm test
```

---

## 3) Environment variables

Set these per app in Vercel Project Settings → Environment Variables.

### Required

- `CRON_SECRET` - shared secret for `/api/refresh` endpoint auth.

### Recommended (cache)

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Data provider

- `TWELVE_DATA_API_KEY` (optional, enables preferred real-time provider via Twelve Data).
- Without `TWELVE_DATA_API_KEY`, India app automatically uses fallback Yahoo latest prices and shows a delayed-data badge in UI.

### Optional India universe updater

- `INDIA_CONSTITUENTS_CSV_URL` (for `apps/india/scripts/update-constituents.mjs`)

---

## 4) Vercel deployment (two projects)

### A. Import repo twice

1. In Vercel, **Add New Project** and import this repo for **Global** project.
2. Repeat import for **India** project.

### B. Set root directory per project

- Project 1 root: `apps/global`
- Project 2 root: `apps/india`

### C. Build settings

- Install command: `pnpm install`
- Build command: `pnpm build`
- Output: Next.js default

### D. Environment variables

Set all required/recommended vars for each project.

### E. Cron jobs

Cron schedules are already defined in each app's `vercel.json`:

- `apps/global/vercel.json`
  - `*/15 13-20 * * 1-5` (US market window, UTC)
  - `0 */6 * * *` (off-hours refresh)
- `apps/india/vercel.json`
  - `*/15 3-10 * * 1-5` (polled every 15 min; API enforces 09:00–15:45 IST market window)
  - `0 */6 * * *` (off-hours refresh every 6 hours)

Both hit `/api/refresh` and require header `Authorization: Bearer $CRON_SECRET`.

---

## 5) API contracts

### `GET /api/treemap`

Query params:

- `timeframe`: `1D | 1W | 1M | 3M | YTD`
- `size`: `weight | marketCap | tradedValue`
- `normalize`: `true | false`

Returns normalized treemap JSON (groups + leaf nodes with returns/sizes/meta).

### `GET /api/refresh`

- Requires `Authorization: Bearer $CRON_SECRET`
- Refreshes data pipeline and repopulates cache.
- India app writes treemap snapshots to Upstash KV and UI reads from KV snapshots only.
- India app automatically skips refresh outside market hours unless `?force=1`.

---

## 6) Operations guide

### Add tickers

- Global ETFs: edit `apps/global/data/etfs.json`
- India ETF universe: edit `apps/india/data/india_etf_universe.csv`
- India sector→stock universe: edit `apps/india/data/india_universe.csv`

### Change grouping

- Global grouping key is `region` and optional `bucket`
- India grouping key is `sector` across ETF and stock modes

### Change weight method

- UI selector switches between:
  - `weight`
  - `marketCap`
  - `tradedValue` (= `price * volume` fallback)
- Shared logic lives in `packages/core/src/index.ts`

### Debug data failures

- Check Vercel Function logs for `/api/refresh` and `/api/treemap`
- Failing tickers gracefully fallback to mock generated time series
- Switch `DATA_PROVIDER=mock` temporarily to validate UI/infra independent of vendor issues

---

## 7) Troubleshooting

### Empty treemap or flat colors

- Ensure `DATA_PROVIDER` is valid.
- Verify API provider availability/rate limits.
- Call `/api/refresh?force=1` manually with auth header.

### Cache not working

- Confirm Upstash env vars are set.
- Without Upstash, app still runs but uses live fetch + fallback data only.

### Cron not firing

- Confirm `vercel.json` is in each app root.
- Redeploy after cron edits.
- Verify `CRON_SECRET` and auth handling.

### India data stale off-hours

- Expected behavior. Use `?force=1` for manual refresh.

---

## 8) Notes

- No client-side secrets are used.
- Runtime validation via Zod.
- Unit tests included for returns + normalization in `packages/core`.
