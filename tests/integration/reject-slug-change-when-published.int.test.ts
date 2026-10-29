import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { ValidationError } from 'payload'

import { rejectSlugChangeWhenPublished } from '#hooks/hooks/reject-slug-change-when-published'
import {
  createTestPayload,
  draftVersions,
  intDatabaseConfigured,
  type TestPayloadHandle,
} from '../helpers/test-payload'

describe.skipIf(!intDatabaseConfigured)('rejectSlugChangeWhenPublished (integration)', () => {
  let handle: TestPayloadHandle
  let articleId: string | number

  beforeAll(async () => {
    handle = await createTestPayload({
      collections: [
        {
          slug: 'articles',
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'slug', type: 'text', required: true },
          ],
          versions: draftVersions,
          hooks: { beforeChange: [rejectSlugChangeWhenPublished()] },
        },
      ],
    })

    const article = await handle.payload.create({
      collection: 'articles',
      data: { title: 'Hello', slug: 'hello' },
      draft: true,
    })
    articleId = article.id

    await handle.payload.update({
      collection: 'articles',
      id: articleId,
      data: { title: 'Hello', slug: 'hello', _status: 'published' },
    })
  })

  afterAll(async () => {
    await handle.destroy()
  })

  it('rejects slug change on a published document', async () => {
    await expect(
      handle.payload.update({
        collection: 'articles',
        id: articleId,
        data: { title: 'Hello', slug: 'hello-renamed', _status: 'published' },
      })
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
