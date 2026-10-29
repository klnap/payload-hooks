import type { CollectionBeforeChangeHook, GlobalBeforeChangeHook } from 'payload'

import { statusOf } from '#hooks/core/publication-status'

export type StampPublishedAtArgs =
  | Parameters<CollectionBeforeChangeHook>[0]
  | Parameters<GlobalBeforeChangeHook>[0]

export type StampPublishedAtOptions = {
  field?: string
  clearOnUnpublish?: boolean
  statusField?: string
}

const nowIso = (): string => new Date().toISOString()

export const stampPublishedAt = (options?: StampPublishedAtOptions) => {
  const field = options?.field ?? 'publishedAt'
  const clearOnUnpublish = options?.clearOnUnpublish ?? false
  const statusField = options?.statusField ?? '_status'

  const hook = async (args: StampPublishedAtArgs) => {
    const { data, originalDoc } = args
    const previous = statusOf((originalDoc as Record<string, unknown> | undefined)?.[statusField])
    const next = statusOf(data[statusField])

    if (next === 'published' && previous !== 'published') {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        data[field] = nowIso()
      }
      return data
    }

    if (clearOnUnpublish && previous === 'published' && next === 'draft') {
      data[field] = null
    }

    return data
  }

  return hook as GlobalBeforeChangeHook & CollectionBeforeChangeHook
}
