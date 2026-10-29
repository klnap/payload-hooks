# ADR-0001: Test layout

## Status

Accepted

## Context

`@klnap/payload-hooks` mixes pure core logic, thin request helpers, and Payload integration tests on **Postgres only** (`PAYLOAD_HOOKS_TEST_DATABASE_URL`). Without that URL, `test:int` suites are skipped.

## Decision

| Directory | Role | Script |
| :--- | :--- | :--- |
| `tests/unit/` | Core + hook units (no DB) | `test:unit` |
| `tests/architecture/` | dependency-cruiser gate | `test:arch` |
| `tests/integration/` | Hook behavior via Local API | `test:int` |
| `tests/helpers/` | Shared harness (`createTestPayload`) — not exported from `src/` | — |

## Consequences

- `bun run test` runs unit + arch + `test:int` (integration skipped without `PAYLOAD_HOOKS_TEST_DATABASE_URL`).
- `check:boundaries` is invoked from `tests/architecture/boundaries.test.ts`.
