# Integration tests (PostgreSQL)

See `scripts/ephemeral-postgres.config.mjs`.

- Container: **`payload-hooks-test-db`**
- Port: **5435**
- Env: **`PAYLOAD_HOOKS_TEST_DATABASE_URL`**

`bun run test:int` starts Postgres in Docker when the env var is unset, runs tests, then **removes** the container.

Each `createTestPayload()` creates an isolated `hooks_int_*` database on that server.
