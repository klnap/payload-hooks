import { describe, expect, it } from 'bun:test'

import { stampPublishedAt } from '#hooks/hooks/stamp-published-at'

const hook = stampPublishedAt()

describe('stampPublishedAt', () => {
  it('sets publishedAt on first publish', async () => {
    const data = await hook({
      data: { _status: 'published' },
      originalDoc: { _status: 'draft' },
      req: { query: {} },
    } as never)

    expect(typeof data.publishedAt).toBe('string')
  })

  it('preserves an existing publishedAt on re-publish', async () => {
    const existing = '2020-01-01T00:00:00.000Z'
    const data = await hook({
      data: { _status: 'published', publishedAt: existing },
      originalDoc: { _status: 'published', publishedAt: existing },
      req: { query: {} },
    } as never)

    expect(data.publishedAt).toBe(existing)
  })

  it('clears publishedAt on unpublish when configured', async () => {
    const clearHook = stampPublishedAt({ clearOnUnpublish: true })
    const data = await clearHook({
      data: { _status: 'draft', publishedAt: '2020-01-01T00:00:00.000Z' },
      originalDoc: { _status: 'published', publishedAt: '2020-01-01T00:00:00.000Z' },
      req: { query: {} },
    } as never)

    expect(data.publishedAt).toBeNull()
  })
})
