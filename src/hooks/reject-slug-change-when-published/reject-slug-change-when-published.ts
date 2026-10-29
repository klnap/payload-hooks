import type { CollectionBeforeChangeHook, GlobalBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'
import { valueAt } from '#hooks/core/field-paths'
import { isPublishedStatus, readDocStatus } from '#hooks/core/publication-status'
import { isDraftSave } from '#hooks/request/admin-query'

export type RejectSlugChangeWhenPublishedArgs =
  | Parameters<CollectionBeforeChangeHook>[0]
  | Parameters<GlobalBeforeChangeHook>[0]

export type RejectSlugChangeWhenPublishedOptions = {
  /** Field paths to lock after publish. Default `['slug']`. */
  fields?: string[]
  message?: string
  allowDraftAutosave?: boolean
  statusField?: string
}

const defaultMessage = 'This slug cannot be changed after the document is published.'

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) return true
  if (typeof left === 'string' && typeof right === 'string') {
    return left.trim() === right.trim()
  }
  return false
}

export const rejectSlugChangeWhenPublished = (options?: RejectSlugChangeWhenPublishedOptions) => {
  const fields = options?.fields ?? ['slug']
  const message = options?.message ?? defaultMessage
  const allowDraftAutosave = options?.allowDraftAutosave ?? true
  const statusField = options?.statusField ?? '_status'

  const hook = async (args: RejectSlugChangeWhenPublishedArgs) => {
    const { data, originalDoc, req } = args
    if (!originalDoc) return data

    if (!isPublishedStatus(readDocStatus(originalDoc as Record<string, unknown>, statusField))) {
      return data
    }

    if (allowDraftAutosave && isDraftSave(req) && data._status === 'draft') {
      return data
    }

    const previous = originalDoc as Record<string, unknown>
    const next = data as Record<string, unknown>

    const changedPaths = fields.filter(
      (path) => !valuesEqual(valueAt(previous, path), valueAt(next, path))
    )

    if (!changedPaths.length) return data

    throw new ValidationError({
      errors: changedPaths.map((path) => ({ path, message })),
      req,
    })
  }

  return hook as GlobalBeforeChangeHook & CollectionBeforeChangeHook
}
