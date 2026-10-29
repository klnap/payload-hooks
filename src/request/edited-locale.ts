/** Active admin locale tab (publish-all leaves `req.locale` on the last iterated locale). */

const asLocaleCode = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 && value !== 'all' ? value : undefined

export const getAdminEditedLocale = (req: {
  locale?: string | null
  query?: Record<string, unknown>
}): string | undefined =>
  asLocaleCode(req.query?.publishSpecificLocale) ??
  asLocaleCode(req.query?.locale) ??
  asLocaleCode(req.locale)
