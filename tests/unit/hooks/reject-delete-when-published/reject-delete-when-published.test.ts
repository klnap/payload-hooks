import { describe, expect, it } from 'bun:test'
import { APIError } from 'payload'

import { rejectDeleteWhenPublished } from '#hooks/hooks/reject-delete-when-published'

describe('rejectDeleteWhenPublished', () => {
  it('rejects delete when loaded doc is published', async () => {
    const hook = rejectDeleteWhenPublished()
    const findByID = async () => ({ id: '1', _status: 'published' })

    await expect(
      hook({
        id: '1',
        collection: { slug: 'pages' },
        req: {
          payload: { findByID },
        },
      } as never)
    ).rejects.toBeInstanceOf(APIError)
  })

  it('allows delete when doc is draft', async () => {
    const hook = rejectDeleteWhenPublished()
    const findByID = async () => ({ id: '1', _status: 'draft' })

    await expect(
      hook({
        id: '1',
        collection: { slug: 'pages' },
        req: {
          payload: { findByID },
        },
      } as never)
    ).resolves.toBeUndefined()
  })
})
