import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { APIError } from 'payload'

import { rejectUnpublish } from '#hooks/hooks/reject-unpublish'
import {
  createTestPayload,
  draftVersions,
  intDatabaseConfigured,
  type TestPayloadHandle,
  withDraftQuery,
  withUnpublishAllQuery,
} from '../helpers/test-payload'

describe.skipIf(!intDatabaseConfigured)('rejectUnpublish (integration)', () => {
  let handle: TestPayloadHandle

  beforeAll(async () => {
    handle = await createTestPayload({
      globals: [
        {
          slug: 'landing',
          fields: [{ name: 'title', type: 'text' }],
          versions: draftVersions,
          hooks: { beforeChange: [rejectUnpublish()] },
        },
      ],
      collections: [
        {
          slug: 'pages',
          fields: [{ name: 'title', type: 'text' }],
          versions: draftVersions,
          hooks: { beforeChange: [rejectUnpublish()] },
        },
      ],
    })

    await handle.payload.updateGlobal({
      slug: 'landing',
      data: { title: 'Live', _status: 'published' },
      locale: 'en',
    })

    const page = await handle.payload.create({
      collection: 'pages',
      data: { title: 'Live page' },
      locale: 'en',
      draft: true,
    })

    await handle.payload.update({
      collection: 'pages',
      id: page.id,
      data: { title: 'Live page', _status: 'published' },
      locale: 'en',
    })
  })

  afterAll(async () => {
    await handle.destroy()
  })

  it('rejects unpublishing a published global to draft without draft query', async () => {
    await expect(
      handle.payload.updateGlobal({
        slug: 'landing',
        data: { title: 'Live', _status: 'draft' },
        locale: 'en',
      })
    ).rejects.toBeInstanceOf(APIError)
  })

  it('allows draft autosave on a published global when draft query is set', async () => {
    const doc = await handle.payload.updateGlobal({
      slug: 'landing',
      data: { title: 'Live edit', _status: 'draft' },
      locale: 'en',
      req: withDraftQuery,
    })

    expect(doc.title).toBe('Live edit')
  })

  it('rejects explicit unpublishAllLocales on a global', async () => {
    await expect(
      handle.payload.updateGlobal({
        slug: 'landing',
        data: { title: 'Live', _status: 'draft' },
        locale: 'en',
        req: withUnpublishAllQuery,
      })
    ).rejects.toBeInstanceOf(APIError)
  })

  it('allows republishing after a draft autosave', async () => {
    await handle.payload.updateGlobal({
      slug: 'landing',
      data: { title: 'Autosaved', _status: 'draft' },
      locale: 'en',
      req: withDraftQuery,
    })

    const republished = await handle.payload.updateGlobal({
      slug: 'landing',
      data: { title: 'Autosaved', _status: 'published' },
      locale: 'en',
    })

    expect(republished._status).toBe('published')
  })

  it('rejects unpublishing a published collection document without draft query', async () => {
    const { docs } = await handle.payload.find({ collection: 'pages', limit: 1 })
    const id = docs[0]?.id
    expect(id).toBeDefined()

    await expect(
      handle.payload.update({
        collection: 'pages',
        id: id!,
        data: { title: 'Live page', _status: 'draft' },
        locale: 'en',
      })
    ).rejects.toBeInstanceOf(APIError)
  })

  it('still rejects unpublish when overrideAccess is false', async () => {
    await expect(
      handle.payload.updateGlobal({
        slug: 'landing',
        data: { title: 'Live', _status: 'draft' },
        locale: 'en',
        overrideAccess: false,
      })
    ).rejects.toBeInstanceOf(APIError)
  })
})
