# `@klnap/payload-hooks`

Reusable Payload **hook factories** plus the optional **`deleteAllLocalesConfirmation`** (`/plugin`, `/client`).

## Entry points

| Import | Use |
| :--- | :--- |
| `@klnap/payload-hooks` | All hook factories + request helpers + `isUnpublishAttempt` |
| `@klnap/payload-hooks/reject-unpublish` | Unpublish guard only |
| `@klnap/payload-hooks/reject-publish-when-required-fields-empty` | Publish guard only |
| `@klnap/payload-hooks/reject-slug-change-when-published` | Slug lock after publish |
| `@klnap/payload-hooks/stamp-published-at` | `publishedAt` on first publish |
| `@klnap/payload-hooks/reject-delete-when-published` | Delete guard for published docs |
| `@klnap/payload-hooks/require-localized-delete-confirmation` | Delete confirmation context guard |
| `@klnap/payload-hooks/localized-delete-impact` | Per-locale delete impact (`src/plugins/localized-delete/impact`) |
| `@klnap/payload-hooks/request` | `isPublishAllLocales`, `isDraftSave`, `isExplicitUnpublishAll`, localized delete context (public; used by `@klnap/revalidation`) |
| `@klnap/payload-hooks/plugin` | `deleteAllLocalesConfirmation` + admin component path strings |
| `@klnap/payload-hooks/client` | Localized delete admin React components |

Public surface is locked by `scripts/exports-snapshot.json` and `bun run check:exports`.

No package-owned i18n export: publish guards use static English defaults (override via hook options); admin UI uses Payload-native keys where applicable.

Package-internal cross-directory imports use **`@/…`** → `src/…` (`tsconfig` `paths`). Same-directory / same-folder siblings use **`./…`**. Public imports stay **`@klnap/payload-hooks[/…]`**.

## Layout

- `src/core/` — empty checks, field-path walking, publish message defaults (**no `payload` import**)
- `src/request/` — Admin / Local API query flags (`publishAllLocales`, `draft`, `unpublishAllLocales`)
- `src/hooks/<hook-name>/` — factory + hook-specific types (`index.ts` + implementation)
- `src/plugins/localized-delete/` — feature plugin, admin UI, impact, endpoint, hooks
- `src/exports/` — public barrels (`package.json` subpaths for `.`, `client`, `plugin`); use **relative** re-exports here so workspace consumers typecheck without this package’s `@/` paths

Do not import another hook’s internals across `src/hooks/*/` (`bun run check:boundaries`).

## Adding a hook

1. Create `src/hooks/<kebab-name>/` with `<kebab-name>.ts` + `index.ts`.
2. Re-export from `src/exports/index.ts` and add subpath in `package.json` if tree-shaking is needed.
3. Update `scripts/exports-snapshot.json`.
4. Unit tests under `tests/unit/hooks/<kebab-name>/`; integration under `tests/integration/<kebab-name>.int.test.ts`.
5. Document contracts and limits in [README.md](./README.md).

## Commands

```bash
bun run test:unit
bun run test:int
bun run test:arch
bun run check:exports
bun run check:boundaries
bun run typecheck
bun run build          # compile-check src (no dist)
bun run build:dist     # emit dist/
```

Test layout: [docs/adr/0001-test-layout.md](docs/adr/0001-test-layout.md). Postgres int tests: `scripts/with-ephemeral-postgres.mjs` in this package (`payload-hooks-test-db`, port 5435).
