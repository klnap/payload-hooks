import type { CollectionBeforeChangeHook, GlobalBeforeChangeHook, TypedLocale } from 'payload'
import { ValidationError } from 'payload'

import {
  emptyFieldPaths,
  type RequiredPublishFieldMode,
  requiredLocalizedRules,
  requiredNonLocalizedRules,
} from '#hooks/core/field-paths'
import {
  DEFAULT_FIELD_MESSAGE,
  DEFAULT_PUBLISH_ALL_MESSAGE,
  formatPublishAllErrorPath,
  localeCodes,
  toFieldErrors,
  toPublishAllErrors,
} from '#hooks/core/publish-messages'
import { resolveRequiredPublishModes } from '#hooks/core/required-field-match'
import { isPublishAllLocales } from '#hooks/request/admin-query'

export type RejectPublishWhenRequiredFieldsEmptyArgs =
  | Parameters<CollectionBeforeChangeHook>[0]
  | Parameters<GlobalBeforeChangeHook>[0]

export type RejectPublishWhenRequiredFieldsEmptyOptions = {
  fieldMessage?: string
  publishAllMessage?: string
  /** @default ['localized'] */
  modes?: RequiredPublishFieldMode[]
  /** Shorthand: adds `nonLocalized` to the default localized mode. */
  includeNonLocalizedRequired?: boolean
}

/**
 * beforeChange — block publish when required localized fields are empty
 * (current locale, or every locale on publish-all).
 *
 * Publish-all when `isPublishAllLocales(req)` is true (`req.query` from Admin / REST, or
 * `req.context.publishAllLocales` / mirrored query from `@klnap/revalidation` `beforeOperation`).
 *
 * Multi-locale publish-all validation is skipped on create (no `originalDoc` / `operation === 'create'`).
 *
 * Bulk `update` with `where` is not covered — see package README.
 *
 * Schema coverage: see `requiredLocalizedRules` in core (not full Payload schema).
 */
export const rejectPublishWhenRequiredFieldsEmpty = (
  options?: RejectPublishWhenRequiredFieldsEmptyOptions
) => {
  const hook = async (args: RejectPublishWhenRequiredFieldsEmptyArgs) => {
    const { data, req } = args
    const fieldMessage = options?.fieldMessage ?? DEFAULT_FIELD_MESSAGE
    const publishAllMessage = options?.publishAllMessage ?? DEFAULT_PUBLISH_ALL_MESSAGE

    if (data._status !== 'published') return data

    const fields = 'collection' in args ? args.collection.fields : args.global.fields

    const modes = resolveRequiredPublishModes(options)
    const localizedRules = modes.includes('localized') ? requiredLocalizedRules(fields) : []
    const nonLocalizedRules = modes.includes('nonLocalized')
      ? requiredNonLocalizedRules(fields)
      : []

    if (!localizedRules.length && !nonLocalizedRules.length) return data

    if (nonLocalizedRules.length) {
      const missingScalars = emptyFieldPaths(data, nonLocalizedRules)
      if (missingScalars.length) {
        throw new ValidationError(
          {
            errors: toFieldErrors(missingScalars, fieldMessage),
            req,
          },
          req.t
        )
      }
    }

    if (!localizedRules.length) return data

    if (!isPublishAllLocales(req)) {
      const missing = emptyFieldPaths(data, localizedRules)
      if (missing.length) {
        throw new ValidationError(
          {
            errors: toFieldErrors(missing, fieldMessage),
            req,
          },
          req.t
        )
      }
      return data
    }

    // Global beforeChange has no `operation` — treat missing originalDoc as create.
    const isCreate = 'operation' in args ? args.operation === 'create' : !args.originalDoc
    if (isCreate) return data

    const localization = req.payload.config.localization
    if (!localization) return data

    const missingByLocale: Record<string, string[]> = {}

    for (const localeCode of localeCodes(localization)) {
      const locale = localeCode as TypedLocale
      let localeData: Record<string, unknown>

      if (locale === req.locale) {
        localeData = data
      } else if ('collection' in args) {
        localeData = (await req.payload.findByID({
          collection: args.collection.slug,
          id: args.originalDoc.id,
          locale,
          fallbackLocale: false,
          depth: 0,
          draft: true,
          overrideAccess: true,
          req,
        })) as unknown as Record<string, unknown>
      } else {
        localeData = (await req.payload.findGlobal({
          slug: args.global.slug,
          locale,
          fallbackLocale: false,
          depth: 0,
          draft: true,
          overrideAccess: true,
          req,
        })) as unknown as Record<string, unknown>
      }

      const missing = emptyFieldPaths(localeData, localizedRules)
      if (missing.length) {
        missingByLocale[localeCode] = missing
      }
    }

    const publishAllPath = formatPublishAllErrorPath(missingByLocale, localization)
    const errors = toPublishAllErrors(
      missingByLocale,
      localization,
      publishAllMessage,
      publishAllPath
    )
    if (errors.length) {
      throw new ValidationError({ errors, req }, req.t)
    }

    return data
  }

  return hook as GlobalBeforeChangeHook & CollectionBeforeChangeHook
}
