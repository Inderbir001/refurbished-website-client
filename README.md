# RefurbShield Marketplace

RefurbShield is a production-oriented, single-store electronics marketplace built as a modular Next.js monolith. It sells new, certified-refurbished and used phones plus audio, charging, wearable, computer and mobile accessories. PostgreSQL is the source of truth; the browser never supplies trusted prices, stock, discounts or payment status.

## Stack and architecture

- Next.js 15 App Router, React 19 and strict TypeScript
- PostgreSQL with Prisma migrations (local Docker or Supabase-compatible)
- Password hashing with bcrypt and signed, httpOnly, SameSite sessions
- Server-side role authorization for `SUPER_ADMIN`, `ADMIN`, `PRODUCT_MANAGER`, `ORDER_MANAGER` and `CUSTOMER`
- Razorpay REST integration and authenticated webhooks
- PhonePe Standard Checkout v2 through PhonePe's official Node SDK
- Supabase Storage REST adapter for validated media uploads
- Adapter boundaries for Snapmint, courier providers and notification providers

The application is intentionally a modular monolith for low-cost Vercel/Render operation. `Store` and `Seller` ownership is already represented in the schema so later multi-store or multi-vendor work does not require rebuilding the catalog.

## Implemented commerce capabilities

- Database-driven homepage sections/banners, categories, brands and collections
- 29 clearly marked demo products and 43 variants across all 15 seeded categories, covering every requested electronics category
- Nested category and brand/collection administration
- Product create/edit/archive/duplicate, variants, prices, images, stock, SEO, specifications, tags, grade and warranty
- Encrypted IMEI storage with explicit admin-only access auditing
- Inventory adjustments/history, low-stock thresholds, atomic stock reservations and expiry release
- Product CSV template/import, products/inventory/orders export and bulk catalog APIs
- Search by product/SKU/brand/category/tag, suggestions, popular/recent searches, filters and sorting
- Guest/authenticated persistent cart, wishlists, coupons and server-side totals
- Saved/different billing addresses, configured delivery rules, GST with CGST/SGST/IGST breakdown and checkout
- Orders, state-machine enforcement, fulfilment, shipment tracking, cancellation/return stock handling and refunds
- Customer profile, addresses, orders/tracking, wishlist, reviews, notifications and password reset
- Verified-purchase review moderation
- Real database analytics, audit logs, users/roles and storefront/settings administration
- Dynamic metadata, canonical links, structured product/breadcrumb data, sitemap and robots rules
- CSRF-origin checks, rate limiting, security headers, upload validation and credential-gated external integrations

No code path simulates payment success. Without merchant credentials checkout correctly reports that no gateway is active.

## Local setup

Requirements: Node.js 20+, npm, and PostgreSQL 16+ (Docker is optional).

1. Copy `.env.example` to `.env` and set at least `DATABASE_URL`, `AUTH_SECRET`, `DEVICE_DATA_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL` and `CRON_SECRET`.
2. If you need local PostgreSQL, run `docker compose up -d`.
3. Install dependencies with `npm install`.
4. Apply the committed schema with `npx prisma migrate deploy`.
5. Load demo data with `npm run db:seed`.
6. Start the application with `npm run dev`.
7. Open `http://localhost:3000`.

Seeded administrator (local/demo only):

```text
admin@refurbshield.local
ChangeMe123!
```

Change that password before exposing any non-local environment.

## Verification commands

```bash
npx prisma validate
npx prisma migrate status
npx tsc --noEmit
npm test
npm run build
```

The test suite includes unit coverage for prices, products, inventory, carts, coupons, payment signatures and the order state machine, plus PostgreSQL integration coverage for cart → order → reservation expiry and idempotent payment confirmation.

## External provider activation

Razorpay needs `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`. Register `POST /api/payments/webhook/razorpay` for payment events.

PhonePe needs `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, `PHONEPE_CLIENT_VERSION`, callback username/password and the selected sandbox/production environment. Register `POST /api/payments/webhook/phonepe`. The adapter uses hosted checkout, then verifies order status server-side before confirming an order.

Snapmint merchant API documentation is private/account-specific. The adapter stays credential-gated and cannot be enabled until the merchant base URL, signing contract, request/response schema and webhook verification instructions are supplied. The implementation deliberately does not guess this contract.

Supabase Storage needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `STORAGE_BUCKET`. The service-role key is server-only. Create a public delivery bucket or adapt the returned URL to signed delivery before production if product images must remain private.

Email, SMS and WhatsApp are queued through provider-neutral notifications. Add an implementation and its server credential before enabling each external channel; in-app notifications work without paid services.

## Scheduled operations

Call these with `Authorization: Bearer $CRON_SECRET` from Vercel Cron, Render Cron, or another scheduler:

- `POST /api/maintenance/release-reservations`
- `POST /api/maintenance/reconcile-payments`
- `POST /api/notifications/dispatch`

## Documentation

- [Architecture and operations](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Deployment guide](docs/DEPLOYMENT.md)

`GET /api/health` is the deployment health check. `GET /api/docs` returns a machine-readable endpoint summary.
