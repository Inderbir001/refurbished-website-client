# Deployment guide

## Recommended: frontend on Vercel, backend on Render, database on Supabase

```
Browser ──► Vercel (frontend: pages)  ──/api/*──►  Render (backend: API, payments, cron)  ──►  Supabase (PostgreSQL)
                    └── server-rendered pages read data through Render, never from the database directly
```

The repository is one codebase deployed twice. The **only** switch is the `BACKEND_URL` variable: set on Vercel it makes that
deployment a pure frontend; left unset (Render, local development, any single-host setup) the app behaves as a normal full app.

| | Vercel (frontend) | Render (backend) |
|---|---|---|
| `BACKEND_URL` | your Render URL, e.g. `https://mobilenmore-api.onrender.com` | *(not set)* |
| `INTERNAL_API_SECRET` | same random value (32+ chars) | same random value |
| `NEXT_PUBLIC_APP_URL` | public site address | public site address |
| `DATABASE_URL`, `AUTH_SECRET`, `DEVICE_DATA_ENCRYPTION_KEY`, `CRON_SECRET`, `RAZORPAY_*` | **not set** | set |
| `STOREFRONT_CACHE_SECONDS` | optional, default `20` (`0` turns it off) | – |
| `API_ONLY` | `true` on Render only | backend host serves only `/api/*`; page requests redirect to the public site |
| `ALLOWED_ORIGINS` | – | extra site addresses (e.g. the `*.vercel.app` alias), comma separated |

How it works
- Vercel forwards every `/api/*` request to Render (`next.config.ts` rewrite), so the browser sees one site and cookies stay first-party.
- Pages rendered on Vercel fetch data through Render's private `/api/internal/db` (read-only, protected by `INTERNAL_API_SECRET`,
  never reachable from the public site). Login cookies are also verified by Render, so the frontend holds no auth secret.
- Payment webhooks and cron jobs can call Render directly (`https://<render-url>/api/payments/webhook/razorpay`, `/api/maintenance/...`).
- `BACKEND_URL` is read at **build** time on Vercel, so redeploy after changing it.

Free-tier note: a free Render instance sleeps after ~15 minutes without traffic and takes ~30-50 seconds to wake, and every page depends on it.
Either use Render's paid "Starter" plan, or keep it awake with a free scheduler (cron-job.org) calling `GET https://<render-url>/api/health` every 5-10 minutes.

## Vercel

Import the repository and keep the detected Next.js preset. For the split setup add only `BACKEND_URL`, `INTERNAL_API_SECRET` and `NEXT_PUBLIC_APP_URL`. For a single-host setup (no Render) add every variable from `.env.example` instead and leave `BACKEND_URL` unset.

Before switching traffic, run `npx prisma migrate deploy` (with the Supabase session-pooler string). Production stores should use `npm run db:bootstrap` to create the first admin and store without demo data; `db:seed` is for local demo data only. Configure scheduled POSTs for reservation expiry, reconciliation and notification dispatch with a bearer `CRON_SECRET`.

## Render

`render.yaml` defines the backend web service (build `npm ci --include=dev && npm run build`, start `next start`, health check `/api/health`). In the Render dashboard choose **New → Blueprint** (or create a Web Service from the repo) and enter the secret values. Use the Supabase *transaction pooler* string with `?pgbouncer=true&connection_limit=5` as `DATABASE_URL`.

## Supabase

1. Create a PostgreSQL project and obtain pooled and direct connection strings.
2. Run `npx prisma migrate deploy` with the direct URL during release.
3. Create the `STORAGE_BUCKET` bucket and choose public product-image delivery or adapt the media response to signed URLs.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side. Do not ship it to the browser.
5. Enable backups and restrict any direct database clients. The application itself uses Prisma, so browser-side table access is not needed.

Supabase Auth is optional in this version because application sessions are implemented internally. Moving to Supabase Auth later is isolated behind the auth/session boundary.

## Go-live checks

- Replace the seeded admin password and all local/demo secrets.
- Confirm HTTPS callback/redirect URLs with Razorpay and PhonePe.
- Exercise real sandbox payment, webhook replay, failure, timeout and refund scenarios.
- Verify the correct GST home state/rates and business invoices with the merchant's tax adviser.
- Configure notification providers or keep those channels disabled.
- Confirm reservation/reconciliation/notification schedules and health monitoring.
- Run validation, migration status, TypeScript, tests and a production build.
