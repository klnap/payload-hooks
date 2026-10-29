import { getTranslation, type I18nClient } from '@payloadcms/translations'
import {
  formatAdminLocaleHeading,
  type LocalizedDeleteLocaleConfig,
} from '#hooks/plugins/localized-delete/copy'
import {
  buildLocalizedDeleteImpact,
  type LocalizedLocaleImpact,
} from '#hooks/plugins/localized-delete/impact'

export type LocalizedDeleteRecordImpactView = {
  key: string
  heading?: string
  locales: LocalizedLocaleImpact[]
}

export type LocalizedDeleteImpactView = {
  intro: string
  records: LocalizedDeleteRecordImpactView[]
}

const resolveUseAsTitleField = (useAsTitle: unknown): string => {
  if (typeof useAsTitle === 'string' && useAsTitle.length > 0) return useAsTitle
  return 'title'
}

export const buildLocalizedDeleteImpactView = ({
  locales,
  doc,
  intro,
  useAsTitle,
  recordKey = 'doc',
  recordHeading,
}: {
  locales: string[]
  localeConfigs: LocalizedDeleteLocaleConfig[]
  doc: Record<string, unknown> | null
  intro: string
  i18n: I18nClient
  useAsTitle?: unknown
  recordKey?: string
  recordHeading?: string
}): LocalizedDeleteImpactView => {
  const titleField = resolveUseAsTitleField(useAsTitle)
  const impact = buildLocalizedDeleteImpact({
    locales,
    doc,
    fields: { title: titleField, slug: false },
  })

  return {
    intro,
    records: [
      {
        key: recordKey,
        heading: recordHeading,
        locales: impact.locales,
      },
    ],
  }
}

export const formatLocaleHeading = (
  code: string,
  localeConfigs: LocalizedDeleteLocaleConfig[],
  i18n: I18nClient
): string => formatAdminLocaleHeading(code, localeConfigs, (label) => getTranslation(label, i18n))
