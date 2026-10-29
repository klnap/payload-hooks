'use client'

import { getTranslation } from '@payloadcms/translations'
import {
  PopupList,
  toast,
  useConfig,
  useDocumentInfo,
  useDocumentTitle,
  useModal,
  useRouteTransition,
  useTranslation,
} from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation.js'
import { formatAdminURL } from 'payload/shared'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { localizedDeleteDefaultIntro } from '#hooks/plugins/localized-delete/copy'
import {
  localizedDeleteTrashHint,
  resolveLocalizedDeletePermanently,
} from '#hooks/plugins/localized-delete/trash'
import { readLocalizedDeleteIntro } from './collection-config'
import { LocalizedDeleteConfirmationModal } from './confirmation-modal'
import { fetchDocAllLocales } from './fetch-doc-all-locales'
import type { LocalizedDeleteImpactView } from './impact-view'
import { buildLocalizedDeleteImpactView } from './impact-view'
import { postLocalizedDelete } from './post-delete'

const modalSlugPrefix = 'localized-delete'
const stockDeleteButtonId = 'action-delete'
const permanentDeleteButtonId = 'action-permanently-delete'
const localizedDeleteButtonId = 'action-localized-delete'

/** Injected by `deleteAllLocalesConfirmation` on collections using `requireLocalizedDeleteConfirmation`. */
export function LocalizedDeleteEditMenuItem() {
  const { id, collectionSlug, hasDeletePermission, hasTrashPermission, isTrashed } =
    useDocumentInfo()
  const { config, getEntityConfig } = useConfig()
  const { i18n, t } = useTranslation()
  const { title } = useDocumentTitle()
  const { openModal } = useModal()
  const pathname = usePathname()
  const router = useRouter()
  const { startRouteTransition } = useRouteTransition()
  const [view, setView] = useState<LocalizedDeleteImpactView | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(false)
  const [deletePermanently, setDeletePermanently] = useState(false)

  const {
    routes: { admin: adminRoute, api },
    localization,
  } = config

  const collectionConfig = collectionSlug ? getEntityConfig({ collectionSlug }) : undefined
  const singularLabel = collectionConfig?.labels?.singular
  const trashEnabled = Boolean(collectionConfig?.trash)
  const useAsTitle = collectionConfig?.admin?.useAsTitle
  const configCollection = collectionSlug
    ? config.collections.find((entry) => entry.slug === collectionSlug)
    : undefined
  const intro = readLocalizedDeleteIntro(configCollection) ?? localizedDeleteDefaultIntro

  const localeCodes = useMemo(() => {
    if (!localization) return []
    return localization.locales.map((locale) => (typeof locale === 'string' ? locale : locale.code))
  }, [localization])

  const localeConfigs = useMemo(() => {
    if (!localization) return []
    return localization.locales.map((locale) =>
      typeof locale === 'string' ? { code: locale, label: locale } : locale
    )
  }, [localization])

  const modalSlug = useMemo(
    () => `${modalSlugPrefix}-${collectionSlug}-${id ?? 'new'}`,
    [collectionSlug, id]
  )

  const isTrashContext = Boolean(isTrashed) || Boolean(pathname?.includes('/trash'))

  const trashHint = localizedDeleteTrashHint({
    trashEnabled,
    isTrashView: isTrashContext,
    deletePermanently,
  })

  useEffect(() => {
    if (!hasDeletePermission || !collectionSlug) return
    for (const buttonId of [stockDeleteButtonId, permanentDeleteButtonId]) {
      const el = document.getElementById(buttonId)
      if (el) el.style.display = 'none'
    }
    return () => {
      for (const buttonId of [stockDeleteButtonId, permanentDeleteButtonId]) {
        const el = document.getElementById(buttonId)
        if (el) el.style.display = ''
      }
    }
  }, [collectionSlug, hasDeletePermission])

  const loadImpact = useCallback(async () => {
    if (!id || !collectionSlug) return null
    const doc = await fetchDocAllLocales({
      api,
      collectionSlug,
      id: String(id),
      language: i18n.language,
      trash: isTrashContext,
    })
    return buildLocalizedDeleteImpactView({
      locales: localeCodes,
      localeConfigs,
      doc,
      intro: '',
      i18n,
      useAsTitle,
      recordKey: String(id),
    })
  }, [api, collectionSlug, i18n, id, isTrashContext, localeCodes, localeConfigs, useAsTitle])

  const openDeleteModal = useCallback(async () => {
    setDeletePermanently(false)
    setLoadingImpact(true)
    setView(null)
    try {
      const nextView = await loadImpact()
      setView(nextView)
      openModal(modalSlug)
    } catch {
      setView({ intro: '', records: [] })
      openModal(modalSlug)
    } finally {
      setLoadingImpact(false)
    }
  }, [loadImpact, modalSlug, openModal])

  const handleConfirmDelete = useCallback(async () => {
    if (!id || !collectionSlug) return
    const permanentlyNow = resolveLocalizedDeletePermanently({
      trashEnabled,
      isTrashView: isTrashContext,
      deletePermanently,
    })
    const { ok, json } = await postLocalizedDelete({
      api,
      collectionSlug,
      id: String(id),
      language: i18n.language,
      permanently: permanentlyNow,
    })
    try {
      if (ok) {
        const label = singularLabel ? getTranslation(singularLabel, i18n) : collectionSlug
        if (trashEnabled && !permanentlyNow) {
          toast.success(t('general:titleTrashed', { label, title }) || json.message)
        } else {
          toast.success(t('general:titleDeleted', { label, title }) || json.message)
        }
        startRouteTransition(() =>
          router.push(
            formatAdminURL({
              adminRoute,
              path: `/collections/${collectionSlug}${isTrashContext ? '/trash' : ''}`,
            })
          )
        )
        return
      }
      if (json.errors?.length) {
        for (const error of json.errors) {
          toast.error(error.message)
        }
      } else {
        toast.error(json.message ?? t('error:deletingTitle', { title }))
      }
    } catch {
      toast.error(t('error:deletingTitle', { title }))
    }
  }, [
    adminRoute,
    api,
    collectionSlug,
    i18n,
    id,
    isTrashContext,
    deletePermanently,
    router,
    singularLabel,
    startRouteTransition,
    t,
    title,
    trashEnabled,
  ])

  if (!id || !collectionSlug || !hasDeletePermission) {
    return null
  }

  const showPermanentCheckbox =
    trashEnabled && hasTrashPermission && hasDeletePermission && !isTrashed

  return (
    <Fragment>
      <PopupList.Button id={localizedDeleteButtonId} onClick={() => void openDeleteModal()}>
        {t('general:delete')}
      </PopupList.Button>
      <LocalizedDeleteConfirmationModal
        deletePermanently={deletePermanently}
        loading={loadingImpact}
        localeConfigs={localeConfigs}
        modalSlug={modalSlug}
        customIntro={intro}
        onConfirm={handleConfirmDelete}
        onDeletePermanentlyChange={setDeletePermanently}
        showDeletePermanently={showPermanentCheckbox}
        trashHint={trashHint}
        view={view}
      />
    </Fragment>
  )
}
