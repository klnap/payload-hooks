import { describe, expect, it } from 'bun:test'

import { buildLocalizedDeleteImpact } from '#hooks/plugins/localized-delete/impact'

describe('buildLocalizedDeleteImpact', () => {
  it('reads per-locale title, slug, and localized _status map', () => {
    const impact = buildLocalizedDeleteImpact({
      locales: ['pl', 'en', 'de'],
      doc: {
        title: { pl: 'PL tytuł', en: 'EN title' },
        slug: { pl: 'pl-slug', en: 'en-slug', de: 'de-slug' },
        _status: { pl: 'published', en: 'draft', de: 'draft' },
      },
    })

    expect(impact.publishedLocaleCodes).toEqual(['pl'])
    expect(impact.hasAnyPublishedContent).toBe(true)
    expect(impact.locales).toEqual([
      { code: 'pl', status: 'published', title: 'PL tytuł' },
      { code: 'en', status: 'draft', title: 'EN title' },
      { code: 'de', status: 'empty' },
    ])
    expect(impact.lines[0]).toContain('every locale')
  })

  it('treats scalar published _status as published for every locale', () => {
    const impact = buildLocalizedDeleteImpact({
      locales: ['pl', 'en'],
      doc: {
        title: { pl: 'A', en: 'B' },
        _status: 'published',
      },
    })

    expect(impact.locales.every((l) => l.status === 'published')).toBe(true)
  })

  it('marks missing locales when doc is null', () => {
    const impact = buildLocalizedDeleteImpact({
      locales: ['pl', 'en'],
      doc: null,
    })

    expect(impact.locales).toEqual([
      { code: 'pl', status: 'missing' },
      { code: 'en', status: 'missing' },
    ])
    expect(impact.hasAnyPublishedContent).toBe(false)
  })
})
