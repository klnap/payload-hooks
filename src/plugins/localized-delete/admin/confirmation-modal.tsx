'use client'

import './confirm-body.scss'

import { ConfirmationModal, useTranslation } from '@payloadcms/ui'
import type { LocalizedDeleteLocaleConfig } from '#hooks/plugins/localized-delete/copy'
import { LocalizedDeleteConfirmBody } from './confirm-body'
import type { LocalizedDeleteImpactView } from './impact-view'

export const LocalizedDeleteConfirmationModal = ({
  modalSlug,
  view,
  localeConfigs,
  loading,
  trashHint,
  customIntro,
  onConfirm,
  confirmLabel,
  showDeletePermanently,
  deletePermanently,
  onDeletePermanentlyChange,
}: {
  modalSlug: string
  view: LocalizedDeleteImpactView | null
  localeConfigs: LocalizedDeleteLocaleConfig[]
  loading: boolean
  trashHint?: string | null
  customIntro?: string
  onConfirm: () => void | Promise<void>
  confirmLabel?: string
  showDeletePermanently?: boolean
  deletePermanently?: boolean
  onDeletePermanentlyChange?: (checked: boolean) => void
}) => {
  const { i18n, t } = useTranslation()

  return (
    <ConfirmationModal
      body={
        <LocalizedDeleteConfirmBody
          deletePermanently={deletePermanently}
          i18n={i18n}
          loading={loading}
          localeConfigs={localeConfigs}
          onDeletePermanentlyChange={onDeletePermanentlyChange}
          customIntro={customIntro}
          showDeletePermanently={showDeletePermanently}
          trashHint={trashHint}
          view={view}
        />
      }
      cancelLabel={t('general:cancel')}
      confirmLabel={confirmLabel ?? t('general:delete')}
      confirmingLabel={t('general:deleting')}
      heading={t('general:confirmDeletion')}
      modalSlug={modalSlug}
      onConfirm={onConfirm}
    />
  )
}
