import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { APIError } from 'payload'

import { rejectDeleteWhenPublished } from '#hooks/hooks/reject-delete-when-published'
import {
  createTestPayload,
  draftVersions,
  intDatabaseConfigured,
  type TestPayloadHandle,
} from '../helpers/test-payload'

describe.skipIf(!intDatabaseConfigured)('rejectDeleteWhenPublished (integration)', () => {
  let handle: TestPayloadHandle
  let publishedId: string | number
  let draftId: string | number

  beforeAll(async () => {
    handle = await createTestPayload({
      collections: [
        {
          slug: 'articles',
          fields: [{ name: 'title', type: 'text', required: true }],
          versions: draftVersions,
          hooks: { beforeDelete: [rejectDeleteWhenPublished()] },
        },
      ],
    })

    const published = await handle.payload.create({
      collection: 'articles',
      data: { title: 'Live' },
      draft: true,
    })
    publishedId = published.id
    await handle.payload.update({
      collection: 'articles',
      id: publishedId,
      data: { title: 'Live', _status: 'published' },
    })

    const draft = await handle.payload.create({
      collection: 'articles',
      data: { title: 'Draft only' },
      draft: true,
    })
    draftId = draft.id
  })

  afterAll(async () => {
    await handle.destroy()
  })

  it('rejects deleting a published document', async () => {
    await expect(
      handle.payload.delete({
        collection: 'articles',
        id: publishedId,
      })
    ).rejects.toBeInstanceOf(APIError)
  })

  it('allows deleting a draft document', async () => {
    await handle.payload.delete({
      collection: 'articles',
      id: draftId,
    })

    const { totalDocs } = await handle.payload.find({
      collection: 'articles',
      where: { id: { equals: draftId } },
      limit: 1,
    })
    expect(totalDocs).toBe(0)
  })
})
