import type { CollectionBeforeDeleteHook, PayloadRequest } from 'payload'
import { APIError } from 'payload'
import { buildLocalizedDeleteImpact } from '#hooks/plugins/localized-delete/impact'
import {
  isLocalizedDeleteConfirmed,
  LOCALIZED_DELETE_CONFIRMED_CONTEXT_KEY,
} from '#hooks/request/localized-delete'
import { markLocalizedDeleteConfirmationHook } from './marker'

export type RequireLocalizedDeleteConfirmationOptions = {
  message?: string
  contextKey?: string
  /** Load document with `locale: 'all'` and append impact lines to the error message. Default true. */
  loadDoc?: boolean
  /** Override config locales; defaults to `req.payload.config.localization`. */
  locales?: string[]
  localizeStatus?: boolean
}

const defaultMessage =
  'Delete only after confirming in the admin panel (all locale versions will be removed).'

const listConfigLocales = (req: PayloadRequest): string[] => {
  const localization = req.payload.config.localization
  if (!localization) return []
  return localization.locales.map((locale) => (typeof locale === 'string' ? locale : locale.code))
}

const loadAllLocalesDoc = async ({
  req,
  collection,
  id,
}: {
  req: PayloadRequest
  collection: string
  id: string | number
}): Promise<Record<string, unknown> | null> => {
  try {
    return (await req.payload.findByID({
      collection,
      id,
      locale: 'all',
      depth: 0,
      overrideAccess: true,
      req,
    })) as Record<string, unknown>
  } catch {
    return null
  }
}

const appendImpact = async ({
  req,
  collection,
  id,
  baseMessage,
  locales,
  localizeStatus,
}: {
  req: PayloadRequest
  collection: string
  id: string | number
  baseMessage: string
  locales: string[]
  localizeStatus: boolean
}): Promise<string> => {
  const doc = await loadAllLocalesDoc({ req, collection, id })
  const impact = buildLocalizedDeleteImpact({
    locales,
    doc,
    localizeStatus,
  })
  if (!impact.lines.length) return baseMessage
  return `${baseMessage}\n${impact.lines.join('\n')}`
}

/**
 * beforeDelete — requires `req.context.localizedDeleteConfirmed` (set via Local API or
 * `deleteAllLocalesConfirmation` confirmed-delete endpoint).
 */
export const requireLocalizedDeleteConfirmation = (
  options?: RequireLocalizedDeleteConfirmationOptions
): CollectionBeforeDeleteHook => {
  const message = options?.message ?? defaultMessage
  const contextKey = options?.contextKey ?? LOCALIZED_DELETE_CONFIRMED_CONTEXT_KEY
  const loadDoc = options?.loadDoc !== false
  const localizeStatus = options?.localizeStatus !== false

  const hook: CollectionBeforeDeleteHook = async ({ id, req, collection }) => {
    if (isLocalizedDeleteConfirmed(req, contextKey)) return

    const locales = options?.locales ?? listConfigLocales(req)
    const detail =
      loadDoc && locales.length > 0
        ? await appendImpact({
            req,
            collection: collection.slug,
            id,
            baseMessage: message,
            locales,
            localizeStatus,
          })
        : message

    throw new APIError(detail, 400)
  }

  return markLocalizedDeleteConfirmationHook(hook)
}
