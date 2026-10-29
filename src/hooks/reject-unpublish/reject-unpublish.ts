import type { CollectionBeforeChangeHook, GlobalBeforeChangeHook } from 'payload'
import { APIError } from 'payload'
import { statusOf } from '#hooks/core/publication-status'
import { isDraftSave, isExplicitUnpublishAll } from '#hooks/request/admin-query'

export type RejectUnpublishArgs = Parameters<GlobalBeforeChangeHook>[0]

export type RejectUnpublishOptions = {
  message?: string
  allowDraftAutosave?: boolean
}

/**
 * beforeChange — block unpublishing essential page globals.
 * Allows draft autosaves (`?draft=true`) after a publish.
 */
const defaultMessage = 'This page cannot be unpublished. It must remain published.'

export const rejectUnpublish = (options?: RejectUnpublishOptions) => {
  const hook = async ({ data, originalDoc, req }: RejectUnpublishArgs) => {
    const message = options?.message ?? defaultMessage
    const allowDraftAutosave = options?.allowDraftAutosave ?? true

    if (isExplicitUnpublishAll(req)) {
      throw new APIError(message, 400)
    }

    const previous = statusOf(originalDoc?._status)
    const next = statusOf(data._status)

    if (previous === 'published' && next === 'draft' && !(allowDraftAutosave && isDraftSave(req))) {
      throw new APIError(message, 400)
    }

    return data
  }

  return hook as GlobalBeforeChangeHook & CollectionBeforeChangeHook
}

export const isUnpublishAttempt = (
  { data, originalDoc, req }: Pick<RejectUnpublishArgs, 'data' | 'originalDoc' | 'req'>,
  options?: Pick<RejectUnpublishOptions, 'allowDraftAutosave'>
): boolean => {
  const allowDraftAutosave = options?.allowDraftAutosave ?? true

  if (isExplicitUnpublishAll(req)) return true
  return (
    statusOf(originalDoc?._status) === 'published' &&
    statusOf(data._status) === 'draft' &&
    !(allowDraftAutosave && isDraftSave(req))
  )
}
