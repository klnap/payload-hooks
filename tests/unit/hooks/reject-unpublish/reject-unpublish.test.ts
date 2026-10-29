import { describe, expect, it } from 'bun:test'
import { APIError } from 'payload'
import { isUnpublishAttempt, rejectUnpublish } from '#hooks/hooks/reject-unpublish'

const publishedDoc = { _status: 'published' as const }
const draftDoc = { _status: 'draft' as const }
const hook = rejectUnpublish()

describe('isUnpublishAttempt', () => {
  it('detects explicit unpublishAllLocales', () => {
    expect(
      isUnpublishAttempt({
        data: draftDoc,
        originalDoc: publishedDoc,
        req: { query: { unpublishAllLocales: 'true' } } as never,
      })
    ).toBe(true)
  })

  it('allows draft saves while published with default allowDraftAutosave', () => {
    expect(
      isUnpublishAttempt({
        data: draftDoc,
        originalDoc: publishedDoc,
        req: { query: { draft: 'true' } } as never,
      })
    ).toBe(false)
  })

  it('treats draft query as unpublish when allowDraftAutosave is false', () => {
    expect(
      isUnpublishAttempt(
        {
          data: draftDoc,
          originalDoc: publishedDoc,
          req: { query: { draft: 'true' } } as never,
        },
        { allowDraftAutosave: false }
      )
    ).toBe(true)
  })
})

describe('rejectUnpublish', () => {
  it('throws on published → draft without draft flag', async () => {
    await expect(
      hook({
        data: { _status: 'draft' },
        originalDoc: publishedDoc,
        req: { query: {} },
        global: { slug: 'work-page' },
        context: {},
      } as never)
    ).rejects.toBeInstanceOf(APIError)
  })

  it('allows draft autosave', async () => {
    const result = await hook({
      data: { _status: 'draft', title: 'Edit' },
      originalDoc: publishedDoc,
      req: { query: { draft: 'true' } },
      global: { slug: 'work-page' },
      context: {},
    } as never)

    expect(result._status).toBe('draft')
  })

  it('rejects draft autosave when allowDraftAutosave is false', async () => {
    const strictHook = rejectUnpublish({ allowDraftAutosave: false })

    await expect(
      strictHook({
        data: { _status: 'draft', title: 'Edit' },
        originalDoc: publishedDoc,
        req: { query: { draft: 'true' } },
        global: { slug: 'work-page' },
        context: {},
      } as never)
    ).rejects.toBeInstanceOf(APIError)
  })

  it('uses custom message when options.message is set', async () => {
    const customHook = rejectUnpublish({ message: 'Custom unpublish message' })
    try {
      await customHook({
        data: { _status: 'draft' },
        originalDoc: publishedDoc,
        req: { query: {} },
        global: { slug: 'work-page' },
        context: {},
      } as never)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(APIError)
      expect((error as APIError).message).toBe('Custom unpublish message')
    }
  })
})
