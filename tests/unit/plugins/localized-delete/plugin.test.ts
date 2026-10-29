import { describe, expect, test } from 'bun:test'
import type { CollectionConfig } from 'payload'

import { localizedDeleteEndpointPath } from '#hooks/plugins/localized-delete/endpoint'
import { isLocalizedDeleteConfirmationHook } from '#hooks/plugins/localized-delete/hook'
import {
  enhanceCollectionForDeleteAllLocalesConfirmation,
  localizedDeleteEditMenuItemPath,
  localizedDeleteListBulkButtonPath,
} from '#hooks/plugins/localized-delete/plugin'

describe('deleteAllLocalesConfirmation — enhanceCollectionForDeleteAllLocalesConfirmation', () => {
  test('injects hook and admin wiring for a plain collection', () => {
    const collection: CollectionConfig = { slug: 'projects', fields: [] }

    const enhanced = enhanceCollectionForDeleteAllLocalesConfirmation(collection)

    expect((enhanced.hooks?.beforeDelete ?? []).some(isLocalizedDeleteConfirmationHook)).toBe(true)
    expect(Array.isArray(enhanced.endpoints) && enhanced.endpoints).toHaveLength(1)
    expect(Array.isArray(enhanced.endpoints) ? enhanced.endpoints[0]?.path : undefined).toBe(
      localizedDeleteEndpointPath
    )
    expect(enhanced.admin?.components?.edit?.editMenuItems).toContain(
      localizedDeleteEditMenuItemPath
    )
    expect(enhanced.admin?.components?.beforeList).toContain(localizedDeleteListBulkButtonPath)
    expect((enhanced.custom as { localizedDelete?: boolean })?.localizedDelete).toBe(true)
    expect((enhanced.admin?.custom as { localizedDelete?: boolean })?.localizedDelete).toBe(true)
    expect(enhanced.disableBulkDelete).toBe(true)
  })

  test('skips collection with custom.localizedDelete: false', () => {
    const collection: CollectionConfig = {
      slug: 'users',
      fields: [],
      custom: { localizedDelete: false },
    }

    expect(enhanceCollectionForDeleteAllLocalesConfirmation(collection)).toEqual(collection)
  })

  test('respects exclude list', () => {
    const media: CollectionConfig = { slug: 'media', fields: [] }
    const collection: CollectionConfig = { slug: 'media', fields: [] }

    const enhanced = enhanceCollectionForDeleteAllLocalesConfirmation(collection, {
      exclude: [media],
    })

    expect(enhanced.hooks?.beforeDelete ?? []).toHaveLength(0)
  })

  test('does not duplicate hook or wiring on second pass', () => {
    const once = enhanceCollectionForDeleteAllLocalesConfirmation({
      slug: 'projects',
      fields: [],
    })
    const twice = enhanceCollectionForDeleteAllLocalesConfirmation(once)

    expect(twice.hooks?.beforeDelete?.filter(isLocalizedDeleteConfirmationHook)).toHaveLength(1)
    expect(twice.endpoints).toHaveLength(1)
    expect(twice.admin?.components?.edit?.editMenuItems).toHaveLength(1)
  })
})
