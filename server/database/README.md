# Database migration

Run `schema.sql` against PostgreSQL 15+. During Strangler Fig rollout the legacy JSON service remains the read fallback. For each module, backfill rows, compare response snapshots, enable the NestJS route owner, then disable legacy writes for that module. `migration_id_map` preserves legacy identifiers so clients see unchanged IDs.

Required production services are PostgreSQL, Redis and an object store. Set `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, Stripe and Expo credentials in the deployment secret manager.
