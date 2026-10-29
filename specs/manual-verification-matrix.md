# Manual verification matrix — `@klnap/payload-hooks`

**Goal:** One thorough manual pass of the publish/unpublish `beforeChange` hook factories in **your** Payload host. The package ships **hook factories only** (not a Payload plugin) — you register them on collections/globals. Each row is one scenario to check off.

Use before release or after changes to `rejectUnpublish`, `rejectPublishWhenRequiredFieldsEmpty`, or `src/request/`.

## Related docs

| Topic | Doc |
| :--- | :--- |
| Public API, limits (bulk, publish-all query) | [README.md](../README.md) |
| Exports, layout, adding hooks | [AGENTS.md](../AGENTS.md) |
| Postgres integration tests (reference harness) | [docs/adr/0001-test-layout.md](../docs/adr/0001-test-layout.md) |

## Reference harness (suggested test bed)

Build a minimal host (or staging project) that mirrors [tests/integration/](../tests/integration/):

| Slug | Type | `beforeChange` hooks | Purpose |
| :--- | :--- | :--- | :--- |
| `{GLOBAL_A}` e.g. `landing` | Global, drafts + autosave | `[rejectUnpublish(), rejectPublishWhenRequiredFieldsEmpty()]` | Unpublish lock + publish validation |
| `{GLOBAL_B}` e.g. `site` | Global, drafts | `[rejectPublishWhenRequiredFieldsEmpty()]` only | Publish validation without unpublish lock |
| `{COLLECTION_A}` e.g. `pages` | Collection, drafts | `[rejectUnpublish()]` | Unpublish on collections |
| `{COLLECTION_B}` e.g. `articles` | Collection, drafts | `[rejectPublishWhenRequiredFieldsEmpty()]` | Publish guard on collections |

**Fields (minimal):** at least one top-level `text` with `required: true`, `localized: true`, plus a nested `group` with a required localized child (see `localizedPublishFields()` in [tests/helpers/test-payload.ts](../tests/helpers/test-payload.ts)).

**Localization:** two or more locales (e.g. `en`, `de`); record `defaultLocale` and `fallback` in the session header — they affect publish-all and per-locale behavior.

Document **your** production slugs in the session header if they differ from the harness.

## Legend

| Column | Meaning |
| :--- | :--- |
| **ID** | Stable id (`H-x.y.z`) for reports |
| **Trigger** | Admin UI action or Local API call |
| **Pre** | Preconditions (document state, locale, versions) |
| **Expected** | Toast, field errors, HTTP status, `_status` in DB |
| **Fail** | Must not happen |
| **□** | Pass / Fail / Skip / N/A |

Constants: `{ADMIN}` (Payload admin base URL), `{API}` (Payload REST prefix, often `/api`).

Admin query flags (see [src/request/admin-query.ts](../src/request/admin-query.ts)): `publishAllLocales`, `draft`, `unpublishAllLocales`.

**Publish validation scope:** only fields with **`required: true`** and **`localized: true`** (whitespace-only text counts as empty). Does not replace Payload `validate` or conditional `required`.

## Before you start

| ID | Check | □ |
| :--- | :--- | :--- |
| H-0.1 | Host runs; database available; admin reachable at `{ADMIN}` | |
| H-0.2 | Logged-in user with permission to update/publish guarded entities | |
| H-0.3 | Hooks imported from `@klnap/payload-hooks` (or subpaths) on intended `beforeChange` arrays | |
| H-0.4 | Drafts (and autosave if testing H-2.2) enabled on guarded globals/collections | |
| H-0.5 | At least one **published** document on `{GLOBAL_A}` and one row on `{COLLECTION_B}` | |
| H-0.6 | DevTools → Network: can inspect failed Publish / Publish all responses | |
| H-0.7 | Optional: switch document locale in admin for multi-locale cases | |

**Session header:** date, package version / git commit, tester, Payload version, harness slugs, locale list, custom hook options (`message`, `fieldMessage`, `publishAllMessage`, `allowDraftAutosave`), notes.

---

## 1. Registration and smoke

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-1.1 | Open `{GLOBAL_A}` in admin | Logged in | Editor loads; no 500; published state visible if seeded | Import/resolve error for package | |
| H-1.2 | Open `{COLLECTION_B}` → existing row | — | Edit works; publish guard active on publish | | |
| H-1.3 | Open `{GLOBAL_B}` | Hooks registered | Publish guard runs; unpublish **not** blocked unless `rejectUnpublish` added | | |
| H-1.4 | Create new row on `{COLLECTION_B}` as draft | — | Draft saves without forced publish | | |
| H-1.5 | Entity **without** hooks (control) | Plain collection/global | No package errors; normal Payload behavior | | N/A |

---

## 2. `rejectUnpublish` — block unpublish

Default message (overridable via `rejectUnpublish({ message })`): *This page cannot be unpublished. It must remain published.*

Apply this section only to globals/collections where **`rejectUnpublish()`** is registered (harness: `{GLOBAL_A}`, `{COLLECTION_A}`).

### 2.1 Admin UI

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-2.1.1 | **Unpublish** / revert to draft | Document **published** | Rejected; stays **published**; configured `message` in UI/API | `_status` becomes `draft` | |
| H-2.1.2 | Change status to draft via UI control (if exposed) | Published | Same as H-2.1.1 | Silent draft | |
| H-2.1.3 | Repeat on second guarded global/collection | Published | Consistent behavior | | |

### 2.2 Draft autosave on published document

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-2.2.1 | Edit field on published `{GLOBAL_A}`; wait for autosave | `allowDraftAutosave` default `true`, autosave enabled | Autosave succeeds; draft version exists; **live** remains published | 400 on autosave | |
| H-2.2.2 | **Publish** after H-2.2.1 | Draft with edits | **Published** with new content | Cannot republish | |
| H-2.2.3 | Reload admin document view | After H-2.2.2 | Consistent published state | | |

### 2.3 `unpublishAllLocales`

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-2.3.1 | Unpublish-all action in UI (if exposed) | Multi-locale published | **400** / error; no mass draft | All locales → draft | |
| H-2.3.2 | Local API: update with `req.query.unpublishAllLocales=true` | Published | `APIError` 400 | Unpublish succeeds | |

### 2.4 Entity without `rejectUnpublish`

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-2.4.1 | Revert `{COLLECTION_B}` to draft (if UI allows) | Was published | **Allowed** (no unpublish hook) | Unpublish lock message from another hook | |
| H-2.4.2 | Publish again | After draft | Published | | |

### 2.5 `allowDraftAutosave: false`

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-2.5.1 | Autosave / draft transition without `?draft=true` | `rejectUnpublish({ allowDraftAutosave: false })` | Reject published → draft | Default autosave behavior | |
| H-2.5.2 | `isUnpublishAttempt(args, options)` in host UI | Same options as hook | Helper matches server rejection | UI enables action server rejects | |

---

## 3. `rejectPublishWhenRequiredFieldsEmpty` — single-locale publish

Default field message: `DEFAULT_FIELD_MESSAGE` in [src/core/publish-messages.ts](../src/core/publish-messages.ts) (override with `fieldMessage`).

### 3.1 Collection `{COLLECTION_B}`

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-3.1.1 | **Publish** with all required localized fields filled | Draft | **Published** | | |
| H-3.1.2 | Clear top-level required field → Publish | Draft | `ValidationError`; field paths; custom `fieldMessage` if set | Published | |
| H-3.1.3 | Clear nested required localized field (e.g. `meta.label`) → Publish | Draft | Same as H-3.1.2 | Published | |
| H-3.1.4 | Whitespace-only in required text | Draft | Treated empty → blocked | Published | |
| H-3.1.5 | **Save draft** with empty required fields | — | Draft saved; no publish-guard error | Draft blocked | |
| H-3.1.6 | Autosave with empty required fields | Draft + autosave | Autosave OK | Publish error on autosave | |

### 3.2 Global `{GLOBAL_B}` or `{GLOBAL_A}`

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-3.2.1 | Publish with complete active locale | Required localized filled | **Published** | | |
| H-3.2.2 | Missing required localized → Publish | — | Validation error | Published with gaps | |
| H-3.2.3 | Localized field without `required: true` empty → Publish | — | **Published** (hook ignores) | False error | |

### 3.3 Locale switching (single publish)

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-3.3.1 | Complete locale B; Publish in B | Locale A published or draft | B **published** independently | | |
| H-3.3.2 | Publish B with gaps; A complete | — | Error for **active** locale only | Publish-all aggregate error | |
| H-3.3.3 | `fallback: false` | Empty B, full A | B publish blocked | Silent fallback in validation | |

---

## 4. Publish all locales (`req.query.publishAllLocales`)

Default publish-all copy: `DEFAULT_PUBLISH_ALL_MESSAGE` (override with `publishAllMessage`). Error path often includes locale labels via `formatPublishAllErrorPath` (e.g. *Missing required fields in locales: English · German*).

### 4.1 Success

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-4.1.1 | **Publish all** on `{GLOBAL_B}` | Every locale complete | All locales published | Partial publish | |
| H-4.1.2 | **Publish all** on existing `{COLLECTION_B}` row | Not first create; all locales complete | All locales published | | |

### 4.2 Rejection — another locale incomplete

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-4.2.1 | Locale A complete; B incomplete → **Publish all** from A | `originalDoc` exists | `ValidationError`; `publishAllMessage`; lists incomplete locales | Only A published | |
| H-4.2.2 | Fix B → retry **Publish all** | After H-4.2.1 | Success | | |
| H-4.2.3 | Multiple incomplete locales | — | Multiple locales in error path | Single locale only | |

### 4.3 Create + publish all (package contract)

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-4.3.1 | First save of new `{COLLECTION_B}` row with **Publish all** | `operation === 'create'` | Multi-locale scan **skipped**; active locale still validated if `_status: published` | Errors for locales not yet edited | |
| H-4.3.2 | Second save **Publish all** with gap in B | `originalDoc` present | Full all-locale validation | | |

### 4.4 Admin vs Local API (documented limit)

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-4.4.1 | Admin **Publish all** | Incomplete secondary locale | Rejected (query flag set) | | |
| H-4.4.2 | Local API: `publishAllLocales: true` **option** without `req.query.publishAllLocales` | Incomplete secondary locale | May publish active locale only ([README](../README.md)) | Assume Admin parity | |

---

## 5. Draft, versions, and status

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-5.1 | **Save draft** with empty required fields | Guarded entity | `_status: draft`; no publish-guard toast | | |
| H-5.2 | Publish → edit without publishing again | Published + draft version | Live unchanged until publish | Live content changes without publish | |
| H-5.3 | `localizeStatus: true` (if enabled) | Publish one locale only | Per-locale status per Payload | Unexpected cross-locale status | |

---

## 6. Schema coverage (extended harness)

Optional rows — extend harness fields per [README](../README.md) and [src/core/field-paths.ts](../src/core/field-paths.ts).

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-6.1 | Nested group: empty required localized leaf | — | Publish blocked | | |
| H-6.2 | **Array** with row: empty required localized field | Non-empty array | Publish blocked | | |
| H-6.3 | **Empty array** | — | No per-row checks | False error | |
| H-6.4 | **Blocks**: required fields on block A; row is block B | — | Skips non-matching block types | Wrong block validated | |
| H-6.5 | Empty Lexical rich text | `required` + `localized` richText | Treated empty → blocked | Published | |
| H-6.6 | `required` without `localized` | — | Hook does **not** run for that field | False hook error | |
| H-6.7 | Conditional required via custom `validate` only | — | Payload validation only; hook may allow publish | Assume hook covers all Admin rules | |

---

## 7. Messages and factory options

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-7.1 | Unpublish rejected | Custom `message` passed to factory | UI shows custom text | Package default only | |
| H-7.2 | Field publish rejected | Custom `fieldMessage` | Shown on field errors | `DEFAULT_FIELD_MESSAGE` | |
| H-7.3 | Publish-all rejected | Custom `publishAllMessage` | Shown with locale list | `DEFAULT_PUBLISH_ALL_MESSAGE` | |
| H-7.4 | Change options; redeploy host | Updated factory options | New copy visible | Stale messages | |

---

## 8. Contract limits (negative / awareness)

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-8.1 | Bulk `payload.update({ where, data: { _status: 'published' } })` | Script | Guard **not** guaranteed per README | Same as single-document Admin | |
| H-8.2 | Seed/import bypassing Payload hooks | External job | No hook execution | Assume hooks ran | |
| H-8.3 | Entity without package hooks | Control collection | Normal Payload only | | N/A |

---

## 9. Package entry points

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H-9.1 | Host build: `@klnap/payload-hooks` barrel | — | Compiles; hooks run | | |
| H-9.2 | `@klnap/payload-hooks/reject-unpublish` | — | Compiles | | |
| H-9.3 | `@klnap/payload-hooks/reject-publish-when-required-fields-empty` | — | Compiles | | |
| H-9.4 | `bun run check:exports` in package | After API change | Snapshot matches | | |

---

## 10. Automated regression (package)

From package root (see [AGENTS.md](../AGENTS.md)):

```bash
bun run test
bun run test:unit
bun run test:int   # PAYLOAD_HOOKS_TEST_DATABASE_URL or scripts/with-ephemeral-postgres.mjs
bun run check:exports
bun run check:boundaries
```

| ID | Check | □ |
| :--- | :--- | :--- |
| H-10.1 | Unit: `reject-unpublish`, `reject-publish-when-required-fields-empty`, core `field-paths` / `publish-messages` | |
| H-10.2 | Int: unpublish, publish-all via `req.query`, bulk update semantics, Local API publish-all option | |
| H-10.3 | `check:boundaries` — no cross-imports between `src/hooks/*` | |
| H-10.4 | Host admin starts and resolves `@klnap/payload-hooks` after upgrade | |

---

## Suggested order

| Block | ID range | Estimated time |
| :--- | :--- | :--- |
| Setup + smoke | H-0.*, H-1.* | 30–45 min |
| Unpublish + autosave | H-2.* | 45–60 min |
| Single-locale publish | H-3.* | 45–60 min |
| Publish all | H-4.* | 45–60 min |
| Draft/status + messages | H-5.*, H-7.* | 30 min |
| Optional schema + limits | H-6.*, H-8.*, H-9.* | 1–2 h |
| Automation | H-10.* | 15 min |

## Summary sheet

| Area | Pass | Fail | Skip | Notes |
| :--- | ---: | ---: | ---: | :--- |
| Registration / smoke | | | | |
| rejectUnpublish | | | | |
| Autosave + republish | | | | |
| Single-locale publish | | | | |
| Publish all locales | | | | |
| Draft / versions | | | | |
| Custom messages | | | | |
| Contract limits | | | | |
| Package tests (unit/int) | | | | |

**Signed:** _______________ **Date:** _______________
