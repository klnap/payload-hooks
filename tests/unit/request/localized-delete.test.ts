import { describe, expect, it } from 'bun:test'

import {
  isLocalizedDeleteConfirmed,
  LOCALIZED_DELETE_CONFIRMED_CONTEXT_KEY,
  withLocalizedDeleteConfirmed,
} from '#hooks/request/localized-delete'

describe('localized delete request helpers', () => {
  it('isLocalizedDeleteConfirmed reads req.context', () => {
    expect(isLocalizedDeleteConfirmed({ context: {} })).toBe(false)
    expect(
      isLocalizedDeleteConfirmed({
        context: { [LOCALIZED_DELETE_CONFIRMED_CONTEXT_KEY]: true },
      })
    ).toBe(true)
  })

  it('withLocalizedDeleteConfirmed merges context', () => {
    expect(withLocalizedDeleteConfirmed({ foo: 1 })).toEqual({
      foo: 1,
      [LOCALIZED_DELETE_CONFIRMED_CONTEXT_KEY]: true,
    })
  })
})
