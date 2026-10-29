import type { CollectionConfig, Endpoint, Plugin } from 'payload'

import {
  isLocalizedDeleteOptedOut,
  mergeLocalizedDeleteCustom,
  parseLocalizedDeleteCustom,
} from './custom'
import { createLocalizedDeleteEndpoint, localizedDeleteEndpointPath } from './endpoint'
import {
  isLocalizedDeleteConfirmationHook,
  type RequireLocalizedDeleteConfirmationOptions,
  requireLocalizedDeleteConfirmation,
} from './hook'

export const localizedDeleteEditMenuItemPath =
  '@klnap/payload-hooks/client#LocalizedDeleteEditMenuItem'

export const localizedDeleteListBulkButtonPath =
  '@klnap/payload-hooks/client#LocalizedDeleteListBulkButton'

export type DeleteAllLocalesConfirmationOptions = {
  /**
   * Hook options applied to every collection unless overridden via
   * `collection.custom.localizedDelete.message` (and other hook fields later).
   */
  hook?: RequireLocalizedDeleteConfirmationOptions
  /** Host-owned collections to skip (pass the same `CollectionConfig` as in `config.collections`). */
  exclude?: CollectionConfig[]
  /**
   * When set, only these collections get delete-all-locales confirmation. Default: all collections.
   */
  include?: CollectionConfig[]
}

const slugsFromCollections = (collections: CollectionConfig[]): Set<string> =>
  new Set(collections.map((collection) => collection.slug))

const hasLocalizedDeleteHook = (collection: CollectionConfig): boolean =>
  (collection.hooks?.beforeDelete ?? []).some(isLocalizedDeleteConfirmationHook)

const listEndpoints = (endpoints: CollectionConfig['endpoints']): Omit<Endpoint, 'root'>[] => {
  if (!endpoints) return []
  if (typeof endpoints === 'boolean') return []
  return endpoints
}

const hasLocalizedDeleteEndpoint = (collection: CollectionConfig): boolean =>
  listEndpoints(collection.endpoints).some(
    (endpoint) => endpoint.path === localizedDeleteEndpointPath && endpoint.method === 'post'
  )

const componentPathMatches = (item: unknown, fragment: string): boolean => {
  if (typeof item === 'string') return item.includes(fragment)
  if (item && typeof item === 'object' && 'path' in item) {
    const path = item.path
    return typeof path === 'string' && path.includes(fragment)
  }
  return false
}

const hasLocalizedDeleteListButton = (collection: CollectionConfig): boolean =>
  (collection.admin?.components?.beforeList ?? []).some((item) =>
    componentPathMatches(item, 'LocalizedDeleteListBulkButton')
  )

const hasLocalizedDeleteMenuItem = (collection: CollectionConfig): boolean =>
  (collection.admin?.components?.edit?.editMenuItems ?? []).some((item) =>
    componentPathMatches(item, 'LocalizedDeleteEditMenuItem')
  )

const shouldApplyToCollection = (
  collection: CollectionConfig,
  options?: DeleteAllLocalesConfirmationOptions
): boolean => {
  if (options?.exclude?.length && slugsFromCollections(options.exclude).has(collection.slug)) {
    return false
  }
  if (options?.include?.length && !slugsFromCollections(options.include).has(collection.slug)) {
    return false
  }
  if (isLocalizedDeleteOptedOut(collection.custom)) return false
  return true
}

const injectLocalizedDeleteHook = (
  collection: CollectionConfig,
  options?: DeleteAllLocalesConfirmationOptions
): CollectionConfig => {
  if (hasLocalizedDeleteHook(collection)) return collection

  const customBlock = parseLocalizedDeleteCustom(collection.custom)
  const hook = requireLocalizedDeleteConfirmation({
    ...options?.hook,
    ...(customBlock?.message ? { message: customBlock.message } : {}),
  })

  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      beforeDelete: [...(collection.hooks?.beforeDelete ?? []), hook],
    },
  }
}

/** Wires hook (when missing), admin delete UI, and confirmed-delete endpoint. */
export const enhanceCollectionForDeleteAllLocalesConfirmation = (
  collection: CollectionConfig,
  options?: DeleteAllLocalesConfirmationOptions
): CollectionConfig => {
  if (!shouldApplyToCollection(collection, options)) {
    return collection
  }

  const withHook = injectLocalizedDeleteHook(collection, options)

  const endpoints = listEndpoints(withHook.endpoints)
  const editMenuItems = withHook.admin?.components?.edit?.editMenuItems ?? []
  const beforeList = withHook.admin?.components?.beforeList ?? []
  const existingCustom =
    withHook.custom && typeof withHook.custom === 'object' ? withHook.custom : {}
  const localizedDeleteCustom = mergeLocalizedDeleteCustom(existingCustom)
  const existingAdminCustom =
    withHook.admin?.custom && typeof withHook.admin.custom === 'object' ? withHook.admin.custom : {}

  return {
    ...withHook,
    disableBulkDelete: withHook.disableBulkDelete ?? true,
    custom: {
      ...existingCustom,
      localizedDelete: localizedDeleteCustom,
    },
    endpoints: hasLocalizedDeleteEndpoint(withHook)
      ? withHook.endpoints
      : [...endpoints, createLocalizedDeleteEndpoint(withHook.slug)],
    admin: {
      ...withHook.admin,
      custom: {
        ...existingAdminCustom,
        localizedDelete: localizedDeleteCustom,
      },
      components: {
        ...withHook.admin?.components,
        beforeList: hasLocalizedDeleteListButton(withHook)
          ? beforeList
          : [...beforeList, localizedDeleteListBulkButtonPath],
        edit: {
          ...withHook.admin?.components?.edit,
          editMenuItems: hasLocalizedDeleteMenuItem(withHook)
            ? editMenuItems
            : [...editMenuItems, localizedDeleteEditMenuItemPath],
        },
      },
    },
  }
}

/**
 * Register once in `payload.config` `plugins`. Requires explicit confirmation before
 * deleting all locale versions of a document. Applies to all collections by default
 * (opt out with `exclude` or `custom.localizedDelete: false`). Globals are not
 * supported — Payload has no `beforeDelete` on globals.
 */
export const deleteAllLocalesConfirmation =
  (options?: DeleteAllLocalesConfirmationOptions): Plugin =>
  (config) => ({
    ...config,
    collections: config.collections?.map((collection) =>
      enhanceCollectionForDeleteAllLocalesConfirmation(collection, options)
    ),
  })
