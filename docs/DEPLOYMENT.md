# Deployment guide

## Vercel

Import the repository, keep the detected Next.js preset and build command `npm run build`, then add every production environment variable from `.env.example`. Use a pooled Supabase PostgreSQL URL at runtime; run migrations with the direct connection URL from a trusted release step. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS origin. Do not expose service-role, gateway, callback, cron or encryption secrets as `NEXT_PUBLIC_*` variables.

Before switching traffic, run `npx prisma migrate deploy` and `npm run db:seed` only if demo data is appropriate. Production stores should replace/remove demo credentials and products. Configure scheduled POSTs for reservation expiry, reconciliation and notification dispatch with a bearer `CRON_SECRET`.

## Render

`render.yaml` defines one Node web service with build `npm ci && npm run build`, start `npm start`, and health check `/api/health`. Add the same environment variables in the Render dashboard. A separate backend is not required; the modular monolith is the intended MVP topology.

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
