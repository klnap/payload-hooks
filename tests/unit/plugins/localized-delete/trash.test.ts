import { describe, expect, it } from 'bun:test'

import { resolveLocalizedDeletePermanently } from '#hooks/plugins/localized-delete/trash'

describe('localized delete trash', () => {
  it('soft-trashes when trash is enabled on the main view', () => {
    expect(
      resolveLocalizedDeletePermanently({
        trashEnabled: true,
        isTrashView: false,
        deletePermanently: false,
      })
    ).toBe(false)
  })

  it('permanently deletes from trash view', () => {
    expect(
      resolveLocalizedDeletePermanently({
        trashEnabled: true,
        isTrashView: true,
        deletePermanently: false,
      })
    ).toBe(true)
  })
})
