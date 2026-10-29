import { describe, expect, it } from 'bun:test'

import { isPublishAllLocales } from '#hooks/request/admin-query'

describe('isPublishAllLocales', () => {
  it('reads query string and boolean flags', () => {
    expect(isPublishAllLocales({ query: { publishAllLocales: 'true' } })).toBe(true)
    expect(isPublishAllLocales({ query: { publishAllLocales: true } })).toBe(true)
    expect(isPublishAllLocales({ query: {} })).toBe(false)
  })

  it('reads req.context for Local API callers', () => {
    expect(
      isPublishAllLocales({
        query: {},
        context: { publishAllLocales: true },
      })
    ).toBe(true)
  })
})
