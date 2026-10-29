import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { APIError, ValidationError } from 'payload'
import { rejectPublishWhenRequiredFieldsEmpty } from '#hooks/hooks/reject-publish-when-required-fields-empty'
import { rejectUnpublish } from '#hooks/hooks/reject-unpublish'
import {
  createTestPayload,
  draftVersions,
  intDatabaseConfigured,
  localizedPublishFields,
  type TestPayloadHandle,
} from '../helpers/test-payload'

describe.skipIf(!intDatabaseConfigured)('hook registration (integration)', () => {
  let handle: TestPayloadHandle

  beforeAll(async () => {
    handle = await createTestPayload({
      globals: [
        {
          slug: 'ordered-global',
          fields: localizedPublishFields(),
          versions: draftVersions,
          hooks: {
            beforeChange: [rejectUnpublish(), rejectPublishWhenRequiredFieldsEmpty()],
          },
        },
      ],
      collections: [
        {
          slug: 'ordered-posts',
          fields: localizedPublishFields(),
          versions: draftVersions,
          hooks: {
            beforeChange: [rejectUnpublish(), rejectPublishWhenRequiredFieldsEmpty()],
          },
        },
      ],
    })

    await handle.payload.updateGlobal({
      slug: 'ordered-global',
      data: {
        title: 'Published',
        meta: { label: 'L' },
        _status: 'published',
      },
      locale: 'en',
    })

    const post = await handle.payload.create({
      collection: 'ordered-posts',
      data: { title: 'Post', meta: { label: 'L' } },
      locale: 'en',
      draft: true,
    })

    await handle.payload.update({
      collection: 'ordered-posts',
      id: post.id,
      data: { title: 'Post', meta: { label: 'L' }, _status: 'published' },
      locale: 'en',
    })
  })

  afterAll(async () => {
    await handle.destroy()
  })

  it('runs publish guard on a global registered with both hooks', async () => {
    await expect(
      handle.payload.updateGlobal({
        slug: 'ordered-global',
        data: { title: '', meta: { label: 'L' }, _status: 'published' },
        locale: 'en',
      })
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('runs unpublish guard on a global registered with both hooks', async () => {
    await expect(
      handle.payload.updateGlobal({
        slug: 'ordered-global',
        data: { title: 'Published', meta: { label: 'L' }, _status: 'draft' },
        locale: 'en',
      })
    ).rejects.toBeInstanceOf(APIError)
  })

  it('runs publish guard on a collection registered with both hooks', async () => {
    const { docs } = await handle.payload.find({ collection: 'ordered-posts', limit: 1 })
    const id = docs[0]?.id
    expect(id).toBeDefined()

    await expect(
      handle.payload.update({
        collection: 'ordered-posts',
        id: id!,
        data: { title: 'Post', meta: { label: '  ' }, _status: 'published' },
        locale: 'en',
      })
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
