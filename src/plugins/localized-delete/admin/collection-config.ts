import type { ClientCollectionConfig, ClientConfig } from 'payload'

import {
  isLocalizedDeleteEnabledOnCollection,
  readCollectionLocalizedDeleteCustom,
} from '#hooks/plugins/localized-delete/custom'

export const isLocalizedDeleteCollection = (
  config: ClientConfig,
  collectionSlug: string | undefined
): boolean => {
  if (!collectionSlug) return false
  const collection = config.collections.find((entry) => entry.slug === collectionSlug)
  return isLocalizedDeleteEnabledOnCollection(collection)
}

export const readLocalizedDeleteIntro = (
  collection: ClientCollectionConfig | undefined
): string | undefined => {
  const intro = readCollectionLocalizedDeleteCustom(collection)?.intro
  return typeof intro === 'string' ? intro : undefined
}
