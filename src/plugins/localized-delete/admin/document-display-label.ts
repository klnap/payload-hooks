import { buildLocalizedDeleteImpact } from '#hooks/plugins/localized-delete/impact'

const resolveUseAsTitleField = (useAsTitle: unknown): string => {
  if (typeof useAsTitle === 'string' && useAsTitle.length > 0) return useAsTitle
  return 'title'
}

/** Best-effort label from `locale: 'all'` doc using collection `useAsTitle`. */
export const readDocumentDisplayLabel = ({
  doc,
  useAsTitle,
  locales,
  fallback,
}: {
  doc: Record<string, unknown> | null
  useAsTitle?: unknown
  locales: string[]
  fallback: string
}): string => {
  if (!doc) return fallback
  const titleField = resolveUseAsTitleField(useAsTitle)
  const impact = buildLocalizedDeleteImpact({
    locales,
    doc,
    fields: { title: titleField, slug: false },
  })
  const titled = impact.locales.find((entry) => entry.title?.trim())
  return titled?.title?.trim() ?? fallback
}
