import { describe, expect, it } from 'bun:test'
import { APIError } from 'payload'
import { requireLocalizedDeleteConfirmation } from '#hooks/plugins/localized-delete/hook'
import { LOCALIZED_DELETE_CONFIRMED_CONTEXT_KEY } from '#hooks/request/localized-delete'

const baseReq = {
  payload: {
    config: { localization: { locales: ['pl', 'en'], defaultLocale: 'pl', fallback: true } },
    findByID: async () => ({
      title: { pl: 'T', en: 'E' },
      slug: { pl: 'pl', en: 'en' },
      _status: { pl: 'published', en: 'draft' },
    }),
  },
}

describe('requireLocalizedDeleteConfirmation', () => {
  it('rejects delete without confirmed context', async () => {
    const hook = requireLocalizedDeleteConfirmation({ loadDoc: true })

    await expect(
      hook({
        id: '1',
        collection: { slug: 'projects' },
        req: { ...baseReq, context: {} },
      } as never)
    ).rejects.toBeInstanceOf(APIError)
  })

  it('allows delete when context flag is set', async () => {
    const hook = requireLocalizedDeleteConfirmation()

    await expect(
      hook({
        id: '1',
        collection: { slug: 'projects' },
        req: {
          ...baseReq,
          context: { [LOCALIZED_DELETE_CONFIRMED_CONTEXT_KEY]: true },
        },
      } as never)
    ).resolves.toBeUndefined()
  })
})
