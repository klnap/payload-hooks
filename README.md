# @klnap/payload-hooks

Reusable **Payload CMS 3** hook factories and an optional **delete-all-locales confirmation** plugin for collections.

## Table of contents

- [Purpose](#purpose)
- [Getting started](#getting-started)
- [Examples by hook](#examples-by-hook)
- [Hook reference](#hook-reference)
- [Localized delete: hook vs plugin](#localized-delete-hook-vs-plugin)
- [Request helpers](#request-helpers)
- [Exports and packaging](#exports-and-packaging)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Purpose

Editorial guardrails that Payload does not ship by default:

- Block **publish** when required localized fields are empty (including publish-all)
- Block **unpublish**, **slug changes** on published docs, **delete** of published rows
- Set **`publishedAt`** when a document transitions to published (Payload drafts manage **`_status`**, not a publish timestamp)
- Require explicit confirmation before **deleting all locale versions** of a document (see [Localized delete: hook vs plugin](#localized-delete-hook-vs-plugin))

Hooks are **factories** you attach to `beforeChange` / `beforeDelete`. Core validation logic in `src/core/` avoids importing Payload in pure helpers.

**Localized delete** is the only feature with two integration styles: a **manual `beforeDelete` hook** and an optional **config plugin** that adds admin UI. Editorial hooks (`rejectPublish…`, `rejectUnpublish`, etc.) are independent — pick any subset per collection.

There is **no** package-owned i18n registry — override messages via hook options or Payload `t()` where noted.

---

## Getting started

### Requirements

| Peer | Version |
| ---- | ------- |
| `payload` | `3.90.2` |
| `@payloadcms/ui` | `3.90.2` |
| `react` / `react-dom` | `^19.0.0` |
| `next` | `>=15.0.0` (localized-delete admin UI only) |

Node `^24`, Bun `>=1.4` for package scripts.

### Minimal usage

Attach **one hook at a time** while learning; combine only the guards you need on each collection.

```ts
import { rejectPublishWhenRequiredFieldsEmpty } from '@klnap/payload-hooks'

export const Articles = {
  slug: 'articles',
  hooks: {
    beforeChange: [rejectPublishWhenRequiredFieldsEmpty()],
  },
}
```

Subpath imports match each hook name (see [Exports and packaging](#exports-and-packaging)). More copy-paste examples: [Examples by hook](#examples-by-hook).

**Localized delete** is not in the minimal snippet above — use either the [manual hook](#manual-requirelocalizeddeleteconfirmation) or the [plugin](#plugin-deletealllocalesconfirmation), not both for the same behavior unless you know you need a custom mix (the plugin skips injecting a duplicate confirmation hook if one is already present).

---

## Examples by hook

Each block is standalone. Merge arrays on one collection when you want several guards.

### Publish guard

```ts
import { rejectPublishWhenRequiredFieldsEmpty } from '@klnap/payload-hooks'

hooks: {
  beforeChange: [rejectPublishWhenRequiredFieldsEmpty()],
}
```

### Unpublish guard

```ts
import { rejectUnpublish } from '@klnap/payload-hooks'

hooks: {
  beforeChange: [rejectUnpublish()],
}
```

### Slug lock after publish

```ts
import { rejectSlugChangeWhenPublished } from '@klnap/payload-hooks'

hooks: {
  beforeChange: [rejectSlugChangeWhenPublished()],
}
```

### `publishedAt` on first publish

```ts
import { stampPublishedAt } from '@klnap/payload-hooks'

hooks: {
  beforeChange: [stampPublishedAt()],
}
```

### Block delete of published documents

```ts
import { rejectDeleteWhenPublished } from '@klnap/payload-hooks'

hooks: {
  beforeDelete: [rejectDeleteWhenPublished()],
}
```

### Typical editorial stack (no localized delete)

```ts
import {
  rejectUnpublish,
  rejectPublishWhenRequiredFieldsEmpty,
  rejectSlugChangeWhenPublished,
  stampPublishedAt,
  rejectDeleteWhenPublished,
} from '@klnap/payload-hooks'

export const Articles = {
  slug: 'articles',
  hooks: {
    beforeChange: [
      rejectUnpublish(),
      rejectPublishWhenRequiredFieldsEmpty(),
      rejectSlugChangeWhenPublished(),
      stampPublishedAt(),
    ],
    beforeDelete: [rejectDeleteWhenPublished()],
  },
}
```

Add [localized delete](#localized-delete-hook-vs-plugin) via the plugin (admin UI) or the manual hook (API-only confirmation).

---

## Hook reference

### `rejectPublishWhenRequiredFieldsEmpty`

**When:** `beforeChange` on publish or publish-all.

**Default:** checks **`required: true` + `localized: true`** fields only. Set `includeNonLocalizedRequired: true` or `modes: ['localized', 'nonLocalized']` for shared required fields.

**Options:** `fieldMessage`, `publishAllMessage`, `modes`, `includeNonLocalizedRequired` (defaults in `src/core/publish-messages.ts`).

**Publish-all detection:** `isPublishAllLocales(req)` — query `publishAllLocales=true` or `req.context.publishAllLocales`. Helpers in `@klnap/payload-hooks/request`. `@klnap/revalidation` can mirror flags in `beforeOperation`.

**Create + publish-all:** skips multi-locale validation on create; single-locale publish checks still apply.

**Schema coverage:** tabs, groups, arrays (per row), blocks (per block type), Lexical via `isEmpty`. Not a replacement for Payload field `validate` or conditional required.

**Bulk update:** `payload.update({ where })` is **not** guaranteed to run the same guards.

### `rejectUnpublish`

**When:** `beforeChange` blocks transition away from published.

**Options:** `message`, `allowDraftAutosave` (honors `?draft=true` autosaves when true).

**Helper:** `isUnpublishAttempt(args, options?)` — same options as the hook.

### `rejectSlugChangeWhenPublished`

**When:** `beforeChange` after document has been published.

**Options:** `paths` (default `['slug']`), `allowDraftAutosave`.

### `stampPublishedAt`

**Why:** With drafts enabled, Payload adds and updates **`_status`**; it does **not** automatically set or maintain **`publishedAt`** (or another date field you define in the schema).

**When:** `beforeChange` on collections and globals.

Set the target field (default **`publishedAt`**) when `_status` **transitions** to `'published'`. Does **not** replace a value already present on that publish. Saves while the document **stays** published leave the timestamp unchanged. Optional **`clearOnUnpublish`** clears the field when status moves from published back to draft.

**Options:** `field` (default `publishedAt`), `clearOnUnpublish` (default `false`), `statusField` (default `_status`).

### `rejectDeleteWhenPublished`

**When:** `beforeDelete` on collections.

Loads document; rejects if `_status === 'published'` or any per-locale status is published.

---

## Localized delete: hook vs plugin

Deleting a localized document removes **all locale versions**. Payload does not ask for extra confirmation by default. This package enforces confirmation in two related ways:

| Approach | What you register | Admin UI | When delete is allowed |
| -------- | ----------------- | -------- | ---------------------- |
| **Manual hook** | `requireLocalizedDeleteConfirmation()` on `beforeDelete` | None (unless you build it) | `req.context` includes the confirmed flag — set via Local API with `withLocalizedDeleteConfirmed()` or your own endpoint |
| **Plugin** | `deleteAllLocalesConfirmation()` once in `plugins[]` | Edit menu item + list bulk flow + collection `POST /:id/localized-delete` | Same hook logic; UI and endpoint call the hook with context set |

### Choosing one or combining

- **Pick one primary path for localized delete:** use the **plugin** when editors delete from the Payload admin (recommended). Use the **manual hook alone** when deletes only come from scripts, jobs, or a custom API you control — you set `withLocalizedDeleteConfirmed` on the request before `payload.delete`.
- **Do not** add `requireLocalizedDeleteConfirmation()` on every collection **and** expect to skip the plugin unless you also wire UI/endpoints yourself — the hook alone blocks deletes from stock admin delete actions.
- **Plugin + manual hook on the same collection:** safe. The plugin detects an existing confirmation hook and **does not inject a second copy** ([`hasLocalizedDeleteHook`](src/plugins/localized-delete/plugin.ts)).
- **Plugin + `rejectDeleteWhenPublished()`:** compose both. Payload runs `beforeDelete` hooks **in array order**. The plugin **appends** `requireLocalizedDeleteConfirmation()` after hooks already on the collection ([`injectLocalizedDeleteHook`](src/plugins/localized-delete/plugin.ts)), so `beforeDelete: [rejectDeleteWhenPublished()]` plus the plugin becomes **`[rejectDeleteWhenPublished(), requireLocalizedDeleteConfirmation()]`** — the published guard runs **first**, then confirmation. A published document is rejected before localized-delete confirmation runs (stock admin will not show the delete-all-locales modal for that case). To run confirmation **before** the published guard, list `requireLocalizedDeleteConfirmation()` **first**, then `rejectDeleteWhenPublished()`; the plugin sees an existing confirmation hook and **does not append** another copy.
- **Editorial hooks** (`rejectPublish…`, `stampPublishedAt`, …) are unrelated — enable them with or without either localized-delete approach.

**Globals:** not supported (Payload has no `beforeDelete` on globals). Use `buildLocalizedDeleteImpact` from `@klnap/payload-hooks/localized-delete-impact` for custom warnings only.

### Manual: `requireLocalizedDeleteConfirmation`

Import from `@klnap/payload-hooks` or `@klnap/payload-hooks/require-localized-delete-confirmation`.

```ts
import { requireLocalizedDeleteConfirmation } from '@klnap/payload-hooks'

hooks: {
  beforeDelete: [
    requireLocalizedDeleteConfirmation({
      message: 'Confirm delete — all locale versions will be removed.',
    }),
  ],
}
```

The hook rejects deletes until `isLocalizedDeleteConfirmed(req)` is true (default context key `localizedDeleteConfirmed`). Without the plugin, nothing in the default admin sets that flag for normal delete clicks.

### Plugin: `deleteAllLocalesConfirmation`

Register **once** in `payload.config.ts`:

```ts
import { buildConfig } from 'payload'
import { deleteAllLocalesConfirmation } from '@klnap/payload-hooks/plugin'
import { Users } from './collections/Users' // exported CollectionConfig from your app

export default buildConfig({
  plugins: [
    deleteAllLocalesConfirmation({
      hook: { message: '…' },
      exclude: [Users], // CollectionConfig refs, not slug strings
    }),
  ],
})
```

For each matching collection the plugin:

- Appends `requireLocalizedDeleteConfirmation()` to the **end** of `beforeDelete` when that hook is not already present (existing hooks keep their order and run first)
- Adds `POST /:id/localized-delete` ([`localizedDeleteEndpointPath`](src/plugins/localized-delete/endpoint.ts))
- Sets `disableBulkDelete: true` when unset (bulk delete goes through the list UI button flow)
- Registers admin component paths on `beforeList` and `edit.editMenuItems`

Opt out per collection: `custom: { localizedDelete: false }`. Customize copy: `custom.localizedDelete.intro` / `.message`. Limit scope with plugin `include` / `exclude` (collection configs).

### Import map (plugin only)

Payload resolves `#Component` strings from your import map (e.g. `app/(payload)/admin/importMap.js`). After enabling the plugin, regenerate the map:

```bash
bunx payload generate:importmap
```

| Import map key | Registered on | Role |
| -------------- | ------------- | ---- |
| `@klnap/payload-hooks/client#LocalizedDeleteEditMenuItem` | `admin.components.edit.editMenuItems` | Document edit menu — delete all locales with confirmation |
| `@klnap/payload-hooks/client#LocalizedDeleteListBulkButton` | `admin.components.beforeList` | Collection list — bulk delete with confirmation |

Exports live on `@klnap/payload-hooks/client` ([`LocalizedDeleteEditMenuItem`](src/plugins/localized-delete/admin/edit-menu-item.tsx), [`LocalizedDeleteListBulkButton`](src/plugins/localized-delete/admin/list-bulk-button.tsx)). Path constants are also exported from `@klnap/payload-hooks/plugin` as `localizedDeleteEditMenuItemPath` and `localizedDeleteListBulkButtonPath`.

The confirmed-delete **endpoint** is collection config, not an import-map entry. Verify component names: `bun run check:exports` · [`scripts/exports-snapshot.json`](scripts/exports-snapshot.json).

---

## Request helpers

`@klnap/payload-hooks/request`:

- `isPublishAllLocales`, `mirrorPublishAllLocalesFlagsToReq`, `preserveLocalesOnPublishAll`, `restoreLocalesAfterPublishAll`
- `isDraftSave`, `isExplicitUnpublishAll`
- `LOCALIZED_DELETE_CONFIRMED_CONTEXT_KEY`, `withLocalizedDeleteConfirmed`, `isLocalizedDeleteConfirmed`

---

## Exports and packaging

| Subpath | Contents |
| ------- | -------- |
| `.` | All hook factories + request helpers + impact builders |
| `./reject-*`, `./stamp-published-at` | Single-hook entry points |
| `./plugin` | `deleteAllLocalesConfirmation` |
| `./client` | Admin UI components (import map) |
| `./localized-delete-impact` | `buildLocalizedDeleteImpact`, `formatLocalizedDeleteSummaryLines` |

Verify: `bun run check:exports`.

---

## Testing

| Layer | Command |
| ----- | ------- |
| Unit + arch | `bun run test:unit`, `bun run test:arch` |
| Integration | `bun run test:int` — requires **`PAYLOAD_HOOKS_TEST_DATABASE_URL`** (isolated DB) |

Without the DB URL, integration tests skip.

---

## Troubleshooting

| Issue | Fix |
| ----- | --- |
| Publish-all not validating all locales | Ensure `publishAllLocales` on request; use `mirrorPublishAllLocalesFlagsToReq` |
| Delete proceeds without modal | Use `deleteAllLocalesConfirmation` + import map keys above; or manual hook + set `withLocalizedDeleteConfirmed` on the request |
| Hook message still English | Pass `message` / `fieldMessage` options |
| Stock admin delete still works with manual hook only | Expected — hook blocks until context is set; add plugin or custom API |
| Duplicate localized-delete hook | Plugin skips injecting if confirmation hook already present |

Conventions: [AGENTS.md](./AGENTS.md).

---

## License

See repository license.
