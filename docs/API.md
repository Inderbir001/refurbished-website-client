# API reference

Responses use `{ "data": ... }` on success and `{ "error": "..." }` on failure. Validation failures also include `fields`. Session authentication uses the signed `session` cookie. Admin endpoints require the role appropriate to the operation.

## Authentication and accounts

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`
- `PATCH /api/account/profile`
- `GET|POST|PATCH|DELETE /api/account/addresses`
- `GET|POST|DELETE /api/account/wishlist`
- `POST /api/account/reviews`

## Storefront and discovery

- `GET /api/products`, `GET /api/products/:id`
- `GET /api/categories`, `GET /api/brands`, `GET /api/collections`
- `GET /api/search/suggestions`, `POST /api/search/events`
- `GET /api/cart`, `POST|PATCH|DELETE /api/cart/items`
- `PATCH|DELETE /api/cart/coupon`
- `GET /api/orders`, `GET /api/orders/:id`

## Checkout and payments

- `POST /api/checkout`
- `POST /api/payments/create`, `POST /api/payments/verify`, `POST /api/payments/retry`
- `POST /api/payments/webhook/:gateway` (provider-authenticated)

## Admin

- `POST /api/admin/products`, `PATCH|DELETE|POST /api/admin/products/:id` (POST duplicates)
- `GET /api/admin/products/export`, `GET /api/admin/products/template`, `POST /api/admin/products/import`, `POST /api/admin/products/bulk`
- `GET|PUT /api/admin/products/:id/sensitive`
- `POST|PATCH|DELETE /api/admin/catalog/:entity` for categories, brands and collections
- `POST /api/admin/inventory`, `GET /api/admin/inventory/export`
- `PATCH /api/admin/orders/:id`, `PATCH /api/admin/orders/:id/status`, `GET /api/admin/orders/export`
- `POST /api/admin/shipments`
- `POST /api/admin/refunds`, `POST /api/admin/refunds/:id/process`
- `POST|PATCH /api/admin/coupons`, `PATCH /api/admin/reviews`
- `PATCH /api/admin/settings`, `POST|PATCH|DELETE /api/admin/shipping-rules`, `POST|PATCH /api/admin/tax-rules`
- `POST|PATCH /api/admin/homepage`, `GET|POST|DELETE /api/admin/media`, `PATCH /api/admin/users`

## Operations

- `GET /api/health`
- `POST /api/maintenance/release-reservations`
- `POST /api/maintenance/reconcile-payments`
- `POST /api/notifications/dispatch`

The three operational POST endpoints use `Authorization: Bearer <CRON_SECRET>`.
