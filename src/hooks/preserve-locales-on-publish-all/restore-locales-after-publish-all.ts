import type {
  CollectionAfterChangeHook,
  GlobalAfterChangeHook,
  PayloadRequest,
  TypedLocale,
} from 'payload'
import { isPublishAllLocales } from '#hooks/request/admin-query'
import { getAdminEditedLocale } from '#hooks/request/edited-locale'

import {
  PRESERVE_LOCALES_EDITED_PATCH_CONTEXT_KEY,
  PRESERVE_LOCALES_SNAPSHOTS_CONTEXT_KEY,
} from './context'

/** Nested locale writes must not re-enter publish-all hooks; pin target locale for revalidate. */
const restoreChildReq = (req: PayloadRequest, locale: string): PayloadRequest => {
  const query = { ...(req.query ?? {}) }
  delete query.publishAllLocales
  delete query.unpublishAllLocales
  query.locale = locale
  return {
    ...req,
    locale: locale as PayloadRequest['locale'],
    query,
    context: { preserveLocalesRestore: true },
  }
}

type RestoreArgs = Parameters<CollectionAfterChangeHook>[0] | Parameters<GlobalAfterChangeHook>[0]

const writeLocalePatch = async ({
  args,
  req,
  docId,
  locale,
  data,
}: {
  args: RestoreArgs
  req: PayloadRequest
  docId: string | number
  locale: string
  data: Record<string, unknown>
}) => {
  if ('collection' in args) {
    await req.payload.update({
      collection: args.collection.slug,
      id: docId,
      locale: locale as TypedLocale,
      data,
      draft: false,
      overrideAccess: true,
      context: { preserveLocalesRestore: true },
      req: restoreChildReq(req, locale),
    })
    return
  }

  await req.payload.updateGlobal({
    slug: args.global.slug,
    locale: locale as TypedLocale,
    data,
    draft: false,
    overrideAccess: true,
    context: { preserveLocalesRestore: true },
    req: restoreChildReq(req, locale),
  })
}

/**
 * After publish-all with a plain-string localized field, Payload may write the active
 * locale's value onto the wrong locale. Re-apply sibling snapshots and force the
 * edited-locale patch captured in `preserveLocalesOnPublishAll`.
 */
export const restoreLocalesAfterPublishAll = () => {
  const hook = async (args: RestoreArgs) => {
    const { doc, req } = args

    if (!isPublishAllLocales(req)) return doc

    const snapshots = req.context?.[PRESERVE_LOCALES_SNAPSHOTS_CONTEXT_KEY] as
      | Record<string, Record<string, unknown>>
      | undefined
    const editedPatch = req.context?.[PRESERVE_LOCALES_EDITED_PATCH_CONTEXT_KEY] as
      | Record<string, unknown>
      | undefined

    if (!snapshots && !editedPatch) return doc

    const editedLocale = getAdminEditedLocale(req)
    if (!editedLocale) return doc

    if (snapshots) {
      for (const [locale, snapshot] of Object.entries(snapshots)) {
        if (locale === editedLocale) continue
        if (!snapshot || typeof snapshot !== 'object') continue
        await writeLocalePatch({
          args,
          req,
          docId: doc.id,
          locale,
          data: snapshot,
        })
      }
    }

    if (editedPatch && typeof editedPatch === 'object') {
      await writeLocalePatch({
        args,
        req,
        docId: doc.id,
        locale: editedLocale,
        data: editedPatch,
      })
    }

    const nextContext = { ...req.context }
    delete nextContext[PRESERVE_LOCALES_SNAPSHOTS_CONTEXT_KEY]
    delete nextContext[PRESERVE_LOCALES_EDITED_PATCH_CONTEXT_KEY]
    req.context = nextContext

    return doc
  }

  return hook as GlobalAfterChangeHook & CollectionAfterChangeHook
}
