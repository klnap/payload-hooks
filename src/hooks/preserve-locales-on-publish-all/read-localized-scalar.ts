/** Read a localized scalar from a per-locale Payload document (handles prior corruption). */
export const readLocalizedScalar = (
  doc: Record<string, unknown>,
  field: string,
  locale: string
): string | undefined => {
  const value = doc[field]

  if (typeof value === 'string') {
    if (value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value) as Record<string, unknown>
        const fromParsed = parsed[locale]
        if (typeof fromParsed === 'string') return fromParsed
      } catch {
        // not JSON — use as-is
      }
    }
    return value
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entry = (value as Record<string, unknown>)[locale]
    if (typeof entry === 'string') return entry
  }

  return undefined
}
