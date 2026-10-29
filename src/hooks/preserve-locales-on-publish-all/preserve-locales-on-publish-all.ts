import type { CollectionBeforeChangeHook, GlobalBeforeChangeHook, TypedLocale } from 'payload'

import { localeCodes } from '#hooks/core/publish-messages'
import { isPublishAllLocales } from '#hooks/request/admin-query'
import { getAdminEditedLocale } from '#hooks/request/edited-locale'

import {
  PRESERVE_LOCALES_EDITED_PATCH_CONTEXT_KEY,
  PRESERVE_LOCALES_SNAPSHOTS_CONTEXT_KEY,
} from './context'
import { readLocalizedScalar } from './read-localized-scalar'

const asLocaleCode = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 && value !== 'all' ? value : undefined

const readRequestLocale = (req: {
  locale?: string | null
  query?: Record<string, unknown>
}): string | undefined => {
  const fromReq = asLocaleCode(req.locale)
  if (fromReq) return fromReq
  return asLocaleCode(req.query?.publishSpecificLocale) ?? asLocaleCode(req.query?.locale)
}

const isLocaleMap = (value: unknown, localeCodesList: readonly string[]): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  if (!keys.length) return false
  return keys.every((key) => localeCodesList.includes(key))
}

const mergeScalarsFromLocaleDoc = ({
  incoming,
  localeDoc,
  locale,
  localeCodesList,
}: {
  incoming: Record<string, unknown>
  localeDoc: Record<string, unknown>
  locale: string
  localeCodesList: readonly string[]
}): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...incoming }

  for (const [key, value] of Object.entries(out)) {
    const source = localeDoc[key]

    if (isLocaleMap(value, localeCodesList)) {
      if (typeof source === 'string' || source === null) {
        const merged = { ...(value as Record<string, unknown>) }
        if (typeof source === 'string') {
          merged[locale] = source
        }
        out[key] = merged
        continue
      }

      if (source && typeof source === 'object' && !Array.isArray(source)) {
        const merged = { ...(value as Record<string, unknown>) }
        const localeEntry = merged[locale]
        if (localeEntry && typeof localeEntry === 'object' && !Array.isArray(localeEntry)) {
          merged[locale] = mergeScalarsFromLocaleDoc({
            incoming: localeEntry as Record<string, unknown>,
            localeDoc: source as Record<string, unknown>,
            locale,
            localeCodesList,
          })
        }
        out[key] = merged
        continue
      }
    }

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !isLocaleMap(value, localeCodesList) &&
      source &&
      typeof source === 'object' &&
      !Array.isArray(source)
    ) {
      out[key] = mergeScalarsFromLocaleDoc({
        incoming: value as Record<string, unknown>,
        localeDoc: source as Record<string, unknown>,
        locale,
        localeCodesList,
      })
    }
  }

  return out
}

type PreserveLocalesArgs =
  | Parameters<CollectionBeforeChangeHook>[0]
  | Parameters<GlobalBeforeChangeHook>[0]

const fetchPublishedLocaleDoc = async (
  args: PreserveLocalesArgs,
  locale: string
): Promise<Record<string, unknown>> => {
  const { req } = args
  if ('collection' in args) {
    return (await req.payload.findByID({
      collection: args.collection.slug,
      id: args.originalDoc?.id,
      locale: locale as TypedLocale,
      fallbackLocale: false,
      depth: 0,
      draft: false,
      overrideAccess: true,
      req,
    })) as unknown as Record<string, unknown>
  }

  return (await req.payload.findGlobal({
    slug: args.global.slug,
    locale: locale as TypedLocale,
    fallbackLocale: false,
    depth: 0,
    draft: false,
    overrideAccess: true,
    req,
  })) as unknown as Record<string, unknown>
}

/**
 * Admin publish-all sends stale localized values for tabs that were not open.
 * Restore non-active locales from the last published snapshot before save.
 */
export const preserveLocalesOnPublishAll = () => {
  const hook = async (args: PreserveLocalesArgs) => {
    const { data, req } = args

    if (!isPublishAllLocales(req)) return data
    if (req.context?.preserveLocalesRestore) return data

    const localization = req.payload.config.localization
    if (!localization) return data

    const editedLocale = getAdminEditedLocale(req)
    if (!editedLocale) return data

    const codes = localeCodes(localization)
    const requestLocale = readRequestLocale(req)

    if (requestLocale && requestLocale !== editedLocale) {
      const published = await fetchPublishedLocaleDoc(args, requestLocale)
      return {
        ...published,
        _status: (data as Record<string, unknown>)._status ?? published._status,
      }
    }

    let merged = { ...(data as Record<string, unknown>) }

    // Plain-string title on publish-all: Payload may write it onto the wrong locale.
    // Keep the string for the active write, snapshot siblings, and stash the edited
    // patch so `restoreLocalesAfterPublishAll` can force the active locale after save.
    if (typeof merged.title === 'string') {
      const snapshots: Record<string, Record<string, unknown>> = {}
      for (const code of codes) {
        if (code === editedLocale) continue
        const published = await fetchPublishedLocaleDoc(args, code)
        const title = readLocalizedScalar(published, 'title', code)
        snapshots[code] = title ? { title } : published
      }
      req.context = {
        ...(req.context ?? {}),
        [PRESERVE_LOCALES_SNAPSHOTS_CONTEXT_KEY]: snapshots,
        [PRESERVE_LOCALES_EDITED_PATCH_CONTEXT_KEY]: { title: merged.title },
      }
      return merged
    }

    for (const locale of codes) {
      if (locale === editedLocale) continue

      const localeDoc = await fetchPublishedLocaleDoc(args, locale)
      merged = mergeScalarsFromLocaleDoc({
        incoming: merged,
        localeDoc,
        locale,
        localeCodesList: codes,
      })
    }

    return merged
  }

  return hook as GlobalBeforeChangeHook & CollectionBeforeChangeHook
}
