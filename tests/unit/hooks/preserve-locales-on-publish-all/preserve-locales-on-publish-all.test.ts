import { describe, expect, it, mock } from 'bun:test'

import { preserveLocalesOnPublishAll } from '#hooks/hooks/preserve-locales-on-publish-all'

const hook = preserveLocalesOnPublishAll()

const baseReq = {
  locale: 'pl',
  query: { locale: 'pl', publishAllLocales: 'true' },
  payload: {
    config: {
      localization: {
        locales: [
          { code: 'pl', label: 'PL' },
          { code: 'en', label: 'EN' },
          { code: 'de', label: 'DE' },
        ],
      },
    },
    findGlobal: mock(({ locale }: { locale: string }) => {
      if (locale === 'de') {
        return Promise.resolve({ title: 'MANUAL-MATRIX-FULL-HOME-DE-01' })
      }
      if (locale === 'en') {
        return Promise.resolve({ title: 'MANUAL-MATRIX-FULL-HOME-EN-01' })
      }
      return Promise.resolve({ title: 'MANUAL-MATRIX-FULL-HOME-PL-03' })
    }),
  },
}

describe('preserveLocalesOnPublishAll', () => {
  it('restores non-active locales from stored drafts on publish-all', async () => {
    const data = {
      title: {
        pl: 'MANUAL-MATRIX-FULL-HOME-PL-04',
        en: 'MANUAL-MATRIX-FULL-HOME-EN-01',
        de: 'MANUAL-MATRIX-FULL-HOME-PL-04',
      },
      _status: 'published',
    }

    const result = await hook({
      data,
      req: baseReq,
      originalDoc: { title: { pl: 'x', en: 'y', de: 'z' } },
      global: { slug: 'home-page', fields: [] },
    } as never)

    expect(result.title).toEqual({
      pl: 'MANUAL-MATRIX-FULL-HOME-PL-04',
      en: 'MANUAL-MATRIX-FULL-HOME-EN-01',
      de: 'MANUAL-MATRIX-FULL-HOME-DE-01',
    })
  })

  it('keeps published snapshot when publish-all writes a non-active locale', async () => {
    const result = await hook({
      data: { title: 'MANUAL-MATRIX-FULL-HOME-PL-08', _status: 'published' },
      req: {
        locale: 'de',
        query: { locale: 'pl', publishAllLocales: 'true' },
        payload: {
          config: baseReq.payload.config,
          findGlobal: mock(() =>
            Promise.resolve({
              title: 'MANUAL-MATRIX-FULL-HOME-DE-01',
              _status: 'published',
            })
          ),
        },
      },
      originalDoc: { title: 'x' },
      global: { slug: 'home-page', fields: [] },
    } as never)

    expect(result.title).toBe('MANUAL-MATRIX-FULL-HOME-DE-01')
  })

  it('captures snapshots when publish-all sends a plain string title', async () => {
    const req = { ...baseReq, context: {} as Record<string, unknown> }
    const result = await hook({
      data: { title: 'MANUAL-MATRIX-FULL-HOME-PL-R31', _status: 'published' },
      req,
      originalDoc: { title: 'x' },
      global: { slug: 'home-page', fields: [] },
    } as never)

    expect(result.title).toBe('MANUAL-MATRIX-FULL-HOME-PL-R31')
    expect(req.context?.preserveLocalesOnPublishAllSnapshots).toEqual({
      en: { title: 'MANUAL-MATRIX-FULL-HOME-EN-01' },
      de: { title: 'MANUAL-MATRIX-FULL-HOME-DE-01' },
    })
    expect(req.context?.preserveLocalesOnPublishAllEditedPatch).toEqual({
      title: 'MANUAL-MATRIX-FULL-HOME-PL-R31',
    })
  })

  it('no-ops on single-locale publish', async () => {
    const data = { title: { pl: 'A', en: 'B', de: 'C' } }
    const result = await hook({
      data,
      req: { ...baseReq, query: { locale: 'pl' } },
      originalDoc: { title: { pl: 'Old', en: 'B', de: 'C' } },
      global: { slug: 'home-page', fields: [] },
    } as never)

    expect(result).toEqual(data)
  })
})
