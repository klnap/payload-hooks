import { APIError, type Endpoint } from 'payload'
import { withLocalizedDeleteConfirmed } from '#hooks/request/localized-delete'

import type { LocalizedDeleteRequestBody } from './trash'

export const localizedDeleteEndpointPath = '/:id/localized-delete'

export const createLocalizedDeleteEndpoint = (collectionSlug: string): Endpoint => ({
  path: localizedDeleteEndpointPath,
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }

    const rawId = req.routeParams?.id
    if (rawId == null || rawId === '') {
      throw new APIError('Missing document id', 400)
    }
    const id = typeof rawId === 'number' ? rawId : String(rawId)

    let body: LocalizedDeleteRequestBody = {}
    if (typeof req.json === 'function') {
      try {
        body = (await req.json()) as LocalizedDeleteRequestBody
      } catch {
        body = {}
      }
    }

    const collectionConfig = req.payload.config.collections.find(
      (entry) => entry.slug === collectionSlug
    )
    const trashEnabled = Boolean(collectionConfig?.trash)
    const permanently = body.permanently === true || !trashEnabled

    req.context = withLocalizedDeleteConfirmed(req.context)

    if (trashEnabled && !permanently) {
      await req.payload.update({
        collection: collectionSlug,
        id,
        data: { deletedAt: new Date().toISOString() },
        req,
      })
      return Response.json({ ok: true, trashed: true })
    }

    await req.payload.delete({
      collection: collectionSlug,
      id,
      req,
      ...(trashEnabled && permanently ? { trash: true } : {}),
    })

    return Response.json({ ok: true, trashed: false })
  },
})
