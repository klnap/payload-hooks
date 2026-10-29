import { isLocalePublished } from '#hooks/core/locale-status'
import { readDocStatus } from '#hooks/core/publication-status'

export type LocalizedLocaleImpactStatus = 'published' | 'draft' | 'empty' | 'missing'

export type LocalizedLocaleImpact = {
  code: string
  status: LocalizedLocaleImpactStatus
  title?: string
  slug?: string
}

export type LocalizedDeleteImpact = {
  locales: LocalizedLocaleImpact[]
  publishedLocaleCodes: string[]
  hasAnyPublishedContent: boolean
  lines: string[]
}

export type LocalizedDeleteImpactFieldNames = {
  /** Display field per locale (e.g. collection `admin.useAsTitle`). */
  title?: string
  /** Set to `false` to omit slug from impact. */
  slug?: string | false
  status?: string
}

export type BuildLocalizedDeleteImpactInput = {
  locales: string[]
  doc: Record<string, unknown> | null
  fields?: LocalizedDeleteImpactFieldNames
  /** When true (default), `_status` may be a per-locale map. */
  localizeStatus?: boolean
}

export type FormatLocalizedDeleteSummaryOptions = {
  intro?: string
  localeLine?: (entry: LocalizedLocaleImpact) => string
}

const defaultFields: LocalizedDeleteImpactFieldNames = {
  title: 'title',
  slug: false,
  status: '_status',
}

const readLocalizedScalar = (
  doc: Record<string, unknown> | null,
  field: string,
  locale: string
): string | undefined => {
  if (!doc) return undefined
  const raw = doc[field]
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const value = (raw as Record<string, unknown>)[locale]
    return typeof value === 'string' ? value : value != null ? String(value) : undefined
  }
  if (typeof raw === 'string') return raw
  return undefined
}

const hasMeaningfulContent = (title?: string, slug?: string): boolean => {
  const t = title?.trim() ?? ''
  const s = slug?.trim() ?? ''
  return t.length > 0 || s.length > 0
}

const resolveLocaleStatus = ({
  doc,
  locale,
  statusField,
  localizeStatus,
  title,
  slug,
}: {
  doc: Record<string, unknown> | null
  locale: string
  statusField: string
  localizeStatus: boolean
  title?: string
  slug?: string
}): LocalizedLocaleImpactStatus => {
  const statusValue = readDocStatus(doc, statusField)
  const published = isLocalePublished(statusValue, locale, localizeStatus)

  if (published) return 'published'
  if (!hasMeaningfulContent(title, slug)) {
    if (!doc) return 'missing'
    const statusMap =
      localizeStatus &&
      statusValue &&
      typeof statusValue === 'object' &&
      !Array.isArray(statusValue)
        ? (statusValue as Record<string, unknown>)[locale]
        : statusValue
    if (statusMap === 'draft') return 'empty'
    return 'missing'
  }
  return 'draft'
}

export const formatLocalizedDeleteSummaryLines = (
  impact: Pick<LocalizedDeleteImpact, 'locales'>,
  options?: FormatLocalizedDeleteSummaryOptions
): string[] => {
  const intro =
    options?.intro ?? 'Deleting this document removes every locale version tied to the same record.'
  const localeLine =
    options?.localeLine ??
    ((entry: LocalizedLocaleImpact) => {
      const parts = [entry.code.toUpperCase(), entry.status]
      if (entry.title) parts.push(`title: ${entry.title}`)
      if (entry.slug) parts.push(`slug: ${entry.slug}`)
      return parts.join(' — ')
    })

  return [intro, ...impact.locales.map(localeLine)]
}

export const buildLocalizedDeleteImpact = (
  input: BuildLocalizedDeleteImpactInput,
  summaryOptions?: FormatLocalizedDeleteSummaryOptions
): LocalizedDeleteImpact => {
  const fields = { ...defaultFields, ...input.fields }
  const titleField = fields.title ?? 'title'
  const slugField = fields.slug === false ? undefined : (fields.slug ?? 'slug')
  const statusField = fields.status ?? '_status'
  const localizeStatus = input.localizeStatus !== false

  const locales: LocalizedLocaleImpact[] = input.locales.map((code) => {
    const title = readLocalizedScalar(input.doc, titleField, code)
    const slug = slugField ? readLocalizedScalar(input.doc, slugField, code) : undefined
    const status = resolveLocaleStatus({
      doc: input.doc,
      locale: code,
      statusField,
      localizeStatus,
      title,
      slug,
    })
    return {
      code,
      status,
      ...(title?.trim() ? { title: title.trim() } : {}),
      ...(slug?.trim() ? { slug: slug.trim() } : {}),
    }
  })

  const publishedLocaleCodes = locales
    .filter((entry) => entry.status === 'published')
    .map((entry) => entry.code)

  const lines = formatLocalizedDeleteSummaryLines({ locales }, summaryOptions)

  return {
    locales,
    publishedLocaleCodes,
    hasAnyPublishedContent: publishedLocaleCodes.length > 0,
    lines,
  }
}
