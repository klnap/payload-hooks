# ADR-0002: No package-owned translation registry

## Status

Accepted

## Context

`@klnap/payload-hooks` previously exposed `@klnap/payload-hooks/i18n` with custom `payloadHooks:*` keys and default translation blobs for hosts to merge into `config.i18n.translations`.

## Decision

- Remove the `./i18n` export and all package-owned translation key infrastructure.
- Publish guards use **static English** defaults (`src/core/publish-messages.ts` and hook options).
- Admin UI uses **Payload-native** `useTranslation` / `getTranslation` keys where Payload already defines suitable copy.
- Hosts do not register package-specific translation namespaces for this library.

## Consequences

- Breaking change for consumers of `@klnap/payload-hooks/i18n` only.
- Simpler public surface (11 `package.json` export keys after removal).
