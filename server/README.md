# Australian Helper API

NestJS modular monolith implementing the legacy `/api/*` contract while modules migrate from the JSON service. Local development can run without PostgreSQL in memory mode; production must set `DATABASE_URL` and use the SQL repositories behind the same services.

```powershell
npm install
npm run dev
```

Health: `GET http://localhost:4242/api/health`.

For Expo Go on a physical phone, keep `HOST=0.0.0.0` and use the computer's LAN IPv4 address (for example `http://192.168.110.200:4242`) in `app/.env`; do not use `localhost` on the phone.

Dependency diagnostics: `GET http://localhost:4242/api/health/dependencies`. This reports configuration and availability only; it never returns credentials.

With PostgreSQL and Redis running, apply the schema before starting the service:

```powershell
$env:DATABASE_URL="postgres://helper:helper@localhost:5432/australian_helper"
npm run db:migrate
```

For Expo Go on a phone, copy `.env.lan.example` to `.env.local`, replace the LAN address in `CORS_ORIGINS` if needed, and keep `HOST=0.0.0.0`. Nest loads `.env.local` automatically. Start the API with `npm run start` after building. The phone must use the computer's LAN address, never `localhost`.

The current compatibility store keeps the MVP usable without external services. Set `DATABASE_URL` and replace the in-memory store with the repository adapters before production cutover. Stripe, Expo Push, Redis and WebSocket credentials are supplied through environment variables. Run `npm run smoke` while the server is running to validate health, public task listing, registration and authenticated task creation without external credentials.

Stripe integration is enabled when `STRIPE_SECRET_KEY` is set. `POST /api/stripe/payment-sheet` creates a PaymentIntent and accepts an `Idempotency-Key` header. `POST /api/stripe/connect/account-link` creates an Express onboarding link, and `POST /api/stripe/transfers/release` creates a Connect transfer. Configure `STRIPE_WEBHOOK_SECRET` and expose `POST /api/stripe/webhook` to Stripe; the endpoint verifies the `Stripe-Signature` header against the raw request body and deduplicates event IDs. Without Stripe credentials these routes return explicit `mode: "mock"` responses for local development.

Use `GET /api/stripe/status` to inspect whether Stripe and webhook verification are configured. Payments and webhook events currently live in compatibility memory collections; migrate them to the `payments` and `stripe_webhook_events` tables before production.
