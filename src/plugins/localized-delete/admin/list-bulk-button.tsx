'use client'

import { getTranslation } from '@payloadcms/translations'
import {
  Button,
  toast,
  useAuth,
  useConfig,
  useModal,
  useRouteCache,
  useSelection,
  useTranslation,
} from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation.js'
import { Fragment, useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { localizedDeleteDefaultIntro } from '#hooks/plugins/localized-delete/copy'
import {
  localizedDeleteTrashHint,
  resolveLocalizedDeletePermanently,
} from '#hooks/plugins/localized-delete/trash'
import { readLocalizedDeleteIntro } from './collection-config'
import { LocalizedDeleteConfirmationModal } from './confirmation-modal'
import { readDocumentDisplayLabel } from './document-display-label'
import { fetchDocAllLocales } from './fetch-doc-all-locales'
import { buildLocalizedDeleteImpactView, type LocalizedDeleteImpactView } from './impact-view'
import {
  findLocalizedDeleteListSelectionPortalTargets,
  type LocalizedDeleteListSelectionPortalTarget,
  mergePortalTargetsIfChanged,
} from './list-selection-portal'
import { postLocalizedDelete } from './post-delete'

const modalSlugPrefix = 'localized-delete-list'
const selectAllAcrossPages = 'allAvailable'

const collectionSlugFromPath = (pathname: string): string | undefined => {
  const match = pathname.match(/\/collections\/([^/]+)/)
  return match?.[1]
}

/** List view bulk delete — injected via `beforeList` when the collection uses localized delete. */
export function LocalizedDeleteListBulkButton() {
  const pathname = usePathname()
  const collectionSlug = collectionSlugFromPath(pathname ?? '')
  const isTrashView = Boolean(pathname?.includes('/trash'))
  const { config, getEntityConfig } = useConfig()
  const { i18n, t } = useTranslation()
  const { openModal } = useModal()
  const { permissions } = useAuth()
  const { count, selectedIDs, selectAll, toggleAll } = useSelection()
  const router = useRouter()
  const { clearRouteCache } = useRouteCache()
  const [view, setView] = useState<LocalizedDeleteImpactView | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(false)
  const [portalTargets, setPortalTargets] = useState<LocalizedDeleteListSelectionPortalTarget[]>([])

  const collectionConfig = collectionSlug ? getEntityConfig({ collectionSlug }) : undefined
  const trashEnabled = Boolean(collectionConfig?.trash)
  const useAsTitle = collectionConfig?.admin?.useAsTitle
  const {
    routes: { api },
    localization,
  } = config

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

  const intro = readLocalizedDeleteIntro(collectionConfig) ?? localizedDeleteDefaultIntro

  const modalSlug = `${modalSlugPrefix}-${collectionSlug ?? 'unknown'}`
  const selectingAll = selectAll === selectAllAcrossPages
  const ids = useMemo(
    () => (selectingAll ? [] : selectedIDs.map(String)),
    [selectingAll, selectedIDs]
  )

  const permanently = resolveLocalizedDeletePermanently({
    trashEnabled,
    isTrashView,
    deletePermanently: false,
  })

  const trashHint = localizedDeleteTrashHint({
    trashEnabled,
    isTrashView,
    deletePermanently: false,
    recordCount: ids.length > 0 ? ids.length : count,
  })

  const collectionPermissions = collectionSlug
    ? permissions?.collections?.[collectionSlug]
    : undefined
  const hasDeletePermission = Boolean(collectionPermissions?.delete)
  const hasTrashPermission = hasDeletePermission
  const canShowBulkDelete = isTrashView
    ? hasDeletePermission
    : hasDeletePermission || (trashEnabled && hasTrashPermission)

  useLayoutEffect(() => {
    if (!collectionSlug || count === 0 || !canShowBulkDelete) {
      setPortalTargets([])
      return
    }

    const syncSelectionDeleteUi = () => {
      const next = findLocalizedDeleteListSelectionPortalTargets(collectionSlug)
      setPortalTargets((prev) => mergePortalTargetsIfChanged(prev, next))
    }

    syncSelectionDeleteUi()
    const frame = requestAnimationFrame(syncSelectionDeleteUi)

    const root = document.querySelector(`.collection-list--${collectionSlug}`)
    const observer = new MutationObserver(syncSelectionDeleteUi)
    if (root) {
      observer.observe(root, { childList: true, subtree: true })
    } else {
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      setPortalTargets([])
    }
  }, [canShowBulkDelete, collectionSlug, count])

  const loadImpact = useCallback(async () => {
    if (!collectionSlug || ids.length === 0) return null
    const records = []
    for (const id of ids) {
      const doc = await fetchDocAllLocales({
        api,
        collectionSlug,
        id,
        language: i18n.language,
        trash: isTrashView,
      })
      const heading =
        ids.length === 1
          ? undefined
          : readDocumentDisplayLabel({
              doc,
              useAsTitle,
              locales: localeCodes,
              fallback: `#${id}`,
            })
      const recordView = buildLocalizedDeleteImpactView({
        locales: localeCodes,
        localeConfigs,
        doc,
        intro: '',
        i18n,
        useAsTitle,
        recordKey: id,
        recordHeading: heading,
      })
      records.push(...recordView.records)
    }

    return {
      intro: '',
      records,
    }
  }, [api, collectionSlug, i18n, ids, localeCodes, localeConfigs, isTrashView, useAsTitle])

  const openDeleteModal = useCallback(async () => {
    if (selectingAll) {
      toast.error(
        'Select specific rows on this page. Deleting all pages at once is not supported for localized delete.'
      )
      return
    }
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
  }, [loadImpact, modalSlug, openModal, selectingAll])

  const afterDelete = useCallback(() => {
    toggleAll()
    clearRouteCache()
    router.refresh()
  }, [clearRouteCache, router, toggleAll])

  const handleConfirmDelete = useCallback(async () => {
    if (!collectionSlug || ids.length === 0) return
    let failures = 0
    for (const id of ids) {
      const { ok, json } = await postLocalizedDelete({
        api,
        collectionSlug,
        id,
        language: i18n.language,
        permanently,
      })
      if (!ok) {
        failures += 1
        const message = json.errors?.[0]?.message ?? json.message
        if (message) toast.error(message)
      }
    }
    if (failures === 0) {
      const label = getTranslation(
        ids.length > 1
          ? (collectionConfig?.labels?.plural ?? collectionSlug)
          : (collectionConfig?.labels?.singular ?? collectionSlug),
        i18n
      )
      if (trashEnabled && !permanently) {
        toast.success(t('general:trashedCountSuccessfully', { count: ids.length, label }))
      } else {
        toast.success(t('general:deletedCountSuccessfully', { count: ids.length, label }))
      }
      afterDelete()
      return
    }
    if (failures < ids.length) {
      toast.error(t('error:unknown'))
      afterDelete()
    }
  }, [
    afterDelete,
    api,
    collectionConfig?.labels?.plural,
    collectionConfig?.labels?.singular,
    collectionSlug,
    i18n,
    ids,
    permanently,
    t,
    trashEnabled,
  ])

  if (!collectionSlug) {
    return null
  }

  const renderDeleteButton = (portalKey: string) => (
    <Button
      aria-label={t('general:delete')}
      buttonStyle='none'
      className='list-selection__button localized-delete-list-bulk-action'
      key={portalKey}
      onClick={() => void openDeleteModal()}
    >
      {t('general:delete')}
    </Button>
  )

  return (
    <Fragment>
      {count > 0 &&
        canShowBulkDelete &&
        portalTargets.map((target, index) => {
          const portalKey = `localized-delete-list-action-${index}`
          if (target.kind === 'actions') {
            return createPortal(renderDeleteButton(portalKey), target.el, portalKey)
          }
          return createPortal(
            <Fragment>
              <span aria-hidden={true}>—</span>
              <div className='list-selection__actions'>
                {renderDeleteButton(`${portalKey}-btn`)}
              </div>
            </Fragment>,
            target.el,
            portalKey
          )
        })}
      <LocalizedDeleteConfirmationModal
        loading={loadingImpact}
        localeConfigs={localeConfigs}
        modalSlug={modalSlug}
        customIntro={intro}
        onConfirm={handleConfirmDelete}
        trashHint={trashHint}
        view={view}
      />
    </Fragment>
  )
}
