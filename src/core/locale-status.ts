/** Per-locale publish check when `versions.drafts.localizeStatus` is enabled. */
export const isLocalePublished = (
  status: unknown,
  locale: string,
  localizeStatus = true
): boolean => {
  if (!localizeStatus) {
    return status === 'published'
  }
  if (typeof status === 'object' && status !== null && !Array.isArray(status)) {
    return (status as Record<string, unknown>)[locale] === 'published'
  }
  if (status === 'published') {
    return true
  }
  return false
}
