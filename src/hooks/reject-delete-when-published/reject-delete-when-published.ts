import type { CollectionBeforeDeleteHook, PayloadRequest } from 'payload'
import { APIError } from 'payload'

import { isPublishedStatus, readDocStatus } from '#hooks/core/publication-status'

export type RejectDeleteWhenPublishedOptions = {
  message?: string
  statusField?: string
  /** When true (default), loads the document by id before delete. */
  resolveDoc?: boolean
}

const defaultMessage = 'Published documents cannot be deleted.'

const loadCollectionDoc = async ({
  id,
  req,
  collection,
}: {
  id: string | number
  req: PayloadRequest
  collection: string
}): Promise<Record<string, unknown> | null> => {
  try {
    return (await req.payload.findByID({
      collection,
      id,
      depth: 0,
      overrideAccess: true,
      req,
    })) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * beforeDelete — block delete when the document (or localized status map) is published.
 */
export const rejectDeleteWhenPublished = (
  options?: RejectDeleteWhenPublishedOptions
): CollectionBeforeDeleteHook => {
  const message = options?.message ?? defaultMessage
  const statusField = options?.statusField ?? '_status'
  const resolveDoc = options?.resolveDoc ?? true

  return async ({ id, req, collection }) => {
    if (!resolveDoc) return

    const doc = await loadCollectionDoc({ id, req, collection: collection.slug })
    if (doc && isPublishedStatus(readDocStatus(doc, statusField))) {
      throw new APIError(message, 400)
    }
  }
}

/** Alias for `rejectDeleteWhenPublished` (explicit collection naming). */
export const rejectDeleteWhenPublishedCollection = rejectDeleteWhenPublished
