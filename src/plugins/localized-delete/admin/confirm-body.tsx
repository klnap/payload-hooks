'use client'

import type { I18nClient } from '@payloadcms/translations'
import { Banner, CheckboxInput, Pill, useTranslation } from '@payloadcms/ui'
import {
  type LocalizedDeleteLocaleConfig,
  localizedDeleteModalMessage,
} from '#hooks/plugins/localized-delete/copy'
import type { LocalizedLocaleImpact } from '#hooks/plugins/localized-delete/impact'
import type { LocalizedDeleteImpactView } from './impact-view'
import { formatLocaleHeading } from './impact-view'

const statusPillStyle = (
  status: LocalizedLocaleImpact['status']
): 'success' | 'warning' | 'light' | 'dark' => {
  switch (status) {
    case 'published':
      return 'success'
    case 'draft':
      return 'warning'
    case 'empty':
      return 'light'
    default:
      return 'dark'
  }
}

const LocaleImpactTable = ({
  locales,
  localeConfigs,
  i18n,
}: {
  locales: LocalizedLocaleImpact[]
  localeConfigs: LocalizedDeleteLocaleConfig[]
  i18n: I18nClient
}) => {
  const { t } = useTranslation()

  return (
    <div className='table localized-delete-impact__table'>
      <table cellPadding={0} cellSpacing={0}>
        <thead>
          <tr>
            <th className='localized-delete-impact__th-locale'>
              <span className='field-label unstyled'>Locale</span>
            </th>
            <th className='localized-delete-impact__th-status'>
              <span className='field-label unstyled'>Status</span>
            </th>
            <th className='localized-delete-impact__th-title'>
              <span className='field-label unstyled'>Document</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {locales.map((entry) => {
            const heading = formatLocaleHeading(entry.code, localeConfigs, i18n)
            const display = entry.title?.trim()
            const statusText =
              entry.status === 'published'
                ? t('version:published')
                : entry.status === 'draft'
                  ? t('version:draft')
                  : entry.status === 'empty'
                    ? 'Empty'
                    : t('general:noValue')

            return (
              <tr key={entry.code}>
                <td className='cell-locale localized-delete-impact__cell-locale'>
                  <span>{heading}</span>
                </td>
                <td className='cell-status localized-delete-impact__cell-status'>
                  <Pill pillStyle={statusPillStyle(entry.status)} size='small'>
                    {statusText}
                  </Pill>
                </td>
                <td className='cell-title localized-delete-impact__cell-title'>
                  <span>{display || t('general:noValue')}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export const LocalizedDeleteConfirmBody = ({
  view,
  localeConfigs,
  i18n,
  loading,
  trashHint,
  customIntro,
  deletePermanently,
  onDeletePermanentlyChange,
  showDeletePermanently,
}: {
  view: LocalizedDeleteImpactView | null
  localeConfigs: LocalizedDeleteLocaleConfig[]
  i18n: I18nClient
  loading: boolean
  trashHint?: string | null
  customIntro?: string
  showDeletePermanently?: boolean
  deletePermanently?: boolean
  onDeletePermanentlyChange?: (checked: boolean) => void
}) => {
  const { t } = useTranslation()

  if (loading || !view) {
    return (
      <div className='localized-delete-impact localized-delete-impact--loading'>
        <Banner type='info'>Loading…</Banner>
      </div>
    )
  }
  const message = localizedDeleteModalMessage({
    trashHint,
    customIntro,
    recordCount: view.records.length,
  })

  return (
    <div className='localized-delete-impact'>
      <p className='localized-delete-impact__summary'>{message}</p>
      {showDeletePermanently ? (
        <div className='localized-delete-impact__checkbox'>
          <CheckboxInput
            checked={Boolean(deletePermanently)}
            id='localized-delete-forever'
            label={t('general:deletePermanently')}
            name='localized-delete-forever'
            onToggle={(event) => onDeletePermanentlyChange?.(event.target.checked)}
          />
        </div>
      ) : null}
      <div className='localized-delete-impact__scroll'>
        {view.records.map((record) => (
          <section className='localized-delete-impact__record' key={record.key}>
            {record.heading ? (
              <h4 className='localized-delete-impact__record-heading'>{record.heading}</h4>
            ) : null}
            <LocaleImpactTable i18n={i18n} localeConfigs={localeConfigs} locales={record.locales} />
          </section>
        ))}
      </div>
    </div>
  )
}
