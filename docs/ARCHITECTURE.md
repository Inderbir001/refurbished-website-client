# Architecture and operations

## Module boundaries

The Next.js application hosts server-rendered storefront/admin pages and route handlers in one deployable unit. Business rules live under `lib/services`; provider-specific code lives under `lib/payments` and `lib/notifications`; Prisma owns database access and migrations. UI components do not decide trusted prices, inventory, coupon eligibility or payment success.

`Store` owns categories, brands, products, sellers, collections, media, shipping/tax rules and storefront content. `Seller` is present for future vendor expansion. Orders snapshot name, SKU, unit price, tax rate and addresses so later catalog edits cannot rewrite history.

## Inventory lifecycle

Checkout executes a serializable transaction. Each selected variant is decremented only when sufficient stock exists, an `ORDER_RESERVATION` transaction is written, and a 15-minute reservation is created. A verified payment finalizes the reservation. The expiry job atomically restores stock and cancels an unpaid order. Cancellation/returns write their own stock history.

## Payment lifecycle

All providers implement one server-only interface: create, verify, authenticated webhook, status and refund. Browser redirects are never treated as success. The payment table has a unique idempotency key and transaction/event IDs are unique. Replayed success callbacks return the existing state without creating another capture/coupon use/notification.

Razorpay verification checks both the HMAC response and the captured payment fetched from Razorpay (order ID, amount and currency). PhonePe uses its official SDK for OAuth, hosted checkout, status, callbacks and refunds. Snapmint stays disabled until its merchant-specific contract is available.

## Security

- bcrypt password hashes; signed sessions in httpOnly, secure production cookies
- role checks in every admin page and mutating admin endpoint
- same-origin enforcement for browser mutations, with explicit webhook/cron exemptions
- login/register/reset throttles and generic password-reset responses
- Zod request validation and Prisma parameterization
- server-only secrets and validated MIME/size-limited image uploads
- AES-256-GCM encrypted IMEIs, a separate encryption key and audited reads/writes
- security headers for framing, MIME sniffing, referrers and browser permissions

The in-memory throttle is a practical free-tier baseline, not a global distributed limiter. If abuse volume requires global enforcement, add a compatible persistent rate-limit adapter at the edge.

## Operational jobs

Run reservation release every 5 minutes, reconciliation every 5–15 minutes, and notification dispatch every minute. Each endpoint requires `CRON_SECRET`. Monitor `/api/health`, failed notifications, `FAILED` or long-running `PROCESSING` payments, low stock and migration status.
