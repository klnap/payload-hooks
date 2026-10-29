import { getTranslation, type I18nClient } from '@payloadcms/translations'
import { formatAdminURL } from 'payload/shared'
import {
  formatAdminLocaleHeading,
  formatLocalizedDeleteLocaleLine,
  type LocalizedDeleteLocaleConfig,
} from '#hooks/plugins/localized-delete/copy'
import { buildLocalizedDeleteImpact } from '#hooks/plugins/localized-delete/impact'

export const buildLocalizedDeleteImpactBody = ({
  locales,
  localeConfigs,
  doc,
  intro,
  i18n,
}: {
  locales: string[]
  localeConfigs: LocalizedDeleteLocaleConfig[]
  doc: Record<string, unknown> | null
  intro: string
  i18n: I18nClient
}): string => {
  const translateLabel = (label: string | Record<string, string>) => getTranslation(label, i18n)

  const impact = buildLocalizedDeleteImpact(
    { locales, doc },
    {
      intro,
      localeLine: (entry) =>
        formatLocalizedDeleteLocaleLine(
          entry,
          formatAdminLocaleHeading(entry.code, localeConfigs, translateLabel)
        ),
    }
  )

  return impact.lines.join('\n')
}

export const fetchDocAllLocales = async ({
  api,
  collectionSlug,
  id,
  language,
  trash,
}: {
  api: string
  collectionSlug: string
  id: string
  language: string
  trash?: boolean
}): Promise<Record<string, unknown> | null> => {
  const query = new URLSearchParams({ locale: 'all', depth: '0' })
  if (trash) {
    query.set('trash', 'true')
  }
  const docUrl = formatAdminURL({
    apiRoute: api,
    path: `/${collectionSlug}/${id}?${query.toString()}`,
  })
  const res = await fetch(docUrl, {
    credentials: 'include',
    headers: { 'Accept-Language': language },
  })
  if (!res.ok) return null
  return (await res.json()) as Record<string, unknown>
}
