export type PublicationStatus = 'draft' | 'published'

export const statusOf = (value: unknown): PublicationStatus | undefined => {
  if (value === 'draft' || value === 'published') return value
  return undefined
}

/** True when `_status` is published or any per-locale status is published. */
export const isPublishedStatus = (value: unknown): boolean => {
  const scalar = statusOf(value)
  if (scalar === 'published') return true
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value as Record<string, unknown>).some((entry) => entry === 'published')
  }
  return false
}

export const readDocStatus = (
  doc: Record<string, unknown> | null | undefined,
  statusField = '_status'
): unknown => doc?.[statusField]
