import type { LocalizedLocaleImpact } from './impact'

export const localizedDeleteDefaultIntro = 'Deletes all locale versions of this record.'

export const localizedDeleteBulkIntro = (count: number): string =>
  `Deletes all locale versions of these ${count} records.`

export const localizedDeleteModalMessage = ({
  trashHint,
  customIntro,
  recordCount,
}: {
  trashHint?: string | null
  customIntro?: string
  recordCount: number
}): string => {
  if (trashHint) return trashHint
  if (customIntro) return customIntro
  if (recordCount > 1) return localizedDeleteBulkIntro(recordCount)
  return localizedDeleteDefaultIntro
}

export const localizedDeleteStatusLabel: Record<LocalizedLocaleImpact['status'], string> = {
  published: 'published',
  draft: 'draft',
  empty: 'empty',
  missing: 'missing',
}

export type LocalizedDeleteLocaleConfig = {
  code: string
  label: string | Record<string, string>
}

export const formatAdminLocaleHeading = (
  code: string,
  locales: LocalizedDeleteLocaleConfig[],
  translateLabel: (label: string | Record<string, string>) => string
): string => {
  const entry = locales.find((locale) => locale.code === code)
  if (!entry) return code.toUpperCase()
  const name = translateLabel(entry.label)
  return `${name} (${code.toUpperCase()})`
}

export const formatLocalizedDeleteLocaleLine = (
  entry: LocalizedLocaleImpact,
  localeHeading: string
): string => {
  const parts = [localeHeading, localizedDeleteStatusLabel[entry.status]]
  if (entry.title) parts.push(`title: ${entry.title}`)
  if (entry.slug) parts.push(`slug: ${entry.slug}`)
  return parts.join(' — ')
}
