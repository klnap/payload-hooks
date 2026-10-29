export type LocalizationConfig = {
  locales: { code: string; label: string | Record<string, string> }[] | string[]
}

export const DEFAULT_FIELD_MESSAGE = 'This field is required to publish this locale.'
export const DEFAULT_PUBLISH_ALL_MESSAGE =
  'Fill in all required fields for each locale listed below, then try publishing all locales again.'

export const localeLabel = (localization: LocalizationConfig, locale: string): string => {
  const entry = localization.locales.find((l) =>
    typeof l === 'string' ? l === locale : l.code === locale
  )
  if (!entry || typeof entry === 'string') return locale
  const label = entry.label
  return typeof label === 'string' ? label : (label?.en ?? locale)
}

export const localeCodes = (localization: LocalizationConfig): string[] =>
  localization.locales.map((locale) => (typeof locale === 'string' ? locale : locale.code))

export const toFieldErrors = (
  paths: string[],
  message: string
): { path: string; message: string }[] => paths.map((path) => ({ path, message }))

/**
 * Publish-all toast shows ValidationError `path` after Payload's
 * "The following field is invalid:" prefix — use a locale-focused sentence, not field paths.
 */
export const formatPublishAllErrorPath = (
  missingByLocale: Record<string, string[]>,
  localization: LocalizationConfig
): string => {
  const labels = localeCodes(localization)
    .filter((code) => (missingByLocale[code]?.length ?? 0) > 0)
    .map((code) => localeLabel(localization, code))

  if (!labels.length) return ''

  const list = labels.join(' · ')
  const noun = labels.length === 1 ? 'locale' : 'locales'
  return `Missing required fields in ${noun}: ${list}`
}

export const toPublishAllErrors = (
  missingByLocale: Record<string, string[]>,
  localization: LocalizationConfig,
  message: string = DEFAULT_PUBLISH_ALL_MESSAGE,
  pathOverride?: string
): { path: string; message: string }[] => {
  const path = pathOverride ?? formatPublishAllErrorPath(missingByLocale, localization)
  if (!path) return []
  return toFieldErrors([path], message)
}
