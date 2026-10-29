import { describe, expect, it } from 'bun:test'
import { ValidationError } from 'payload'

import { rejectSlugChangeWhenPublished } from '#hooks/hooks/reject-slug-change-when-published'

const hook = rejectSlugChangeWhenPublished()

const baseReq = { query: {} } as const

describe('rejectSlugChangeWhenPublished', () => {
  it('allows slug changes on draft documents', async () => {
    const data = await hook({
      data: { slug: 'new', _status: 'draft' },
      originalDoc: { slug: 'old', _status: 'draft' },
      req: baseReq,
    } as never)

    expect(data.slug).toBe('new')
  })

  it('rejects slug changes on published documents', async () => {
    await expect(
      hook({
        data: { slug: 'new', _status: 'published' },
        originalDoc: { slug: 'old', _status: 'published' },
        req: baseReq,
      } as never)
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('allows draft autosave that keeps slug while status is draft in payload', async () => {
    const data = await hook({
      data: { slug: 'new', _status: 'draft' },
      originalDoc: { slug: 'old', _status: 'published' },
      req: { query: { draft: 'true' } },
    } as never)

    expect(data.slug).toBe('new')
  })
})
