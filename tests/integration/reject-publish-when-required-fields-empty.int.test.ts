import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { ValidationError } from 'payload'

import { rejectPublishWhenRequiredFieldsEmpty } from '#hooks/hooks/reject-publish-when-required-fields-empty'
import {
  createTestPayload,
  draftVersions,
  intDatabaseConfigured,
  localizedPublishFields,
  type TestPayloadHandle,
  withPublishAllQuery,
} from '../helpers/test-payload'

const filled = {
  title: 'Hello',
  meta: { label: 'Label' },
}

describe.skipIf(!intDatabaseConfigured)(
  'rejectPublishWhenRequiredFieldsEmpty (integration)',
  () => {
    let handle: TestPayloadHandle
    let collectionId: string | number

    beforeAll(async () => {
      handle = await createTestPayload({
        globals: [
          {
            slug: 'site',
            fields: localizedPublishFields(),
            versions: draftVersions,
            hooks: { beforeChange: [rejectPublishWhenRequiredFieldsEmpty()] },
          },
        ],
        collections: [
          {
            slug: 'articles',
            fields: localizedPublishFields(),
            versions: draftVersions,
            hooks: { beforeChange: [rejectPublishWhenRequiredFieldsEmpty()] },
          },
        ],
      })

      const article = await handle.payload.create({
        collection: 'articles',
        data: { ...filled },
        locale: 'en',
        draft: true,
      })
      collectionId = article.id
    })

    afterAll(async () => {
      await handle.destroy()
    })

    it('allows publishing a global when required localized fields are filled', async () => {
      const doc = await handle.payload.updateGlobal({
        slug: 'site',
        data: { ...filled, _status: 'published' },
        locale: 'en',
      })

      expect(doc._status).toBe('published')
    })

    it('rejects publishing a global when a top-level required field is empty', async () => {
      await expect(
        handle.payload.updateGlobal({
          slug: 'site',
          data: { title: '   ', meta: { label: 'Label' }, _status: 'published' },
          locale: 'en',
        })
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('rejects publishing a global when a nested group field is empty', async () => {
      await expect(
        handle.payload.updateGlobal({
          slug: 'site',
          data: { title: 'Hello', meta: { label: '' }, _status: 'published' },
          locale: 'en',
        })
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('allows draft saves with empty required fields', async () => {
      const doc = await handle.payload.updateGlobal({
        slug: 'site',
        data: { title: '', meta: { label: '' }, _status: 'draft' },
        locale: 'en',
        draft: true,
      })

      expect(doc._status).toBe('draft')
    })

    it('allows autosave with empty required fields on a collection', async () => {
      const doc = await handle.payload.update({
        collection: 'articles',
        id: collectionId,
        data: { title: '', meta: { label: '' } },
        locale: 'en',
        draft: true,
        autosave: true,
      })

      expect(doc.title).toBe('')
    })

    it('rejects single-locale publish when the active locale is incomplete', async () => {
      await expect(
        handle.payload.updateGlobal({
          slug: 'site',
          data: { title: '', meta: { label: 'Label' }, _status: 'published' },
          locale: 'en',
        })
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('rejects publish-all when another locale is incomplete (req.query)', async () => {
      await handle.payload.updateGlobal({
        slug: 'site',
        data: { ...filled, _status: 'published' },
        locale: 'en',
      })

      await handle.payload.updateGlobal({
        slug: 'site',
        data: { title: '', meta: { label: '' } },
        locale: 'de',
        draft: true,
      })

      await expect(
        handle.payload.updateGlobal({
          slug: 'site',
          data: { ...filled, _status: 'published' },
          locale: 'en',
          req: withPublishAllQuery,
        })
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('allows publishing a collection when required fields are filled', async () => {
      const doc = await handle.payload.update({
        collection: 'articles',
        id: collectionId,
        data: { ...filled, _status: 'published' },
        locale: 'en',
      })

      expect(doc._status).toBe('published')
    })

    it('rejects publishing a collection when a nested required field is empty', async () => {
      await expect(
        handle.payload.update({
          collection: 'articles',
          id: collectionId,
          data: { title: 'Hello', meta: { label: '  ' }, _status: 'published' },
          locale: 'en',
        })
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('does not apply single-document publish guard semantics to bulk update with where', async () => {
      const result = await handle.payload.update({
        collection: 'articles',
        where: { id: { equals: collectionId } },
        data: { title: '', meta: { label: 'L' }, _status: 'published' },
        locale: 'en',
      })

      expect(Array.isArray(result.docs)).toBe(true)
    })

    it('does not treat Local API publishAllLocales option as publish-all query signal', async () => {
      await handle.payload.updateGlobal({
        slug: 'site',
        data: { title: 'EN', meta: { label: 'L' }, _status: 'published' },
        locale: 'en',
      })

      await handle.payload.updateGlobal({
        slug: 'site',
        data: { title: '', meta: { label: '' } },
        locale: 'de',
        draft: true,
      })

      const doc = await handle.payload.updateGlobal({
        slug: 'site',
        data: { title: 'EN', meta: { label: 'L' }, _status: 'published' },
        locale: 'en',
        publishAllLocales: true,
      })

      expect(doc._status).toBe('published')
    })
  }
)
