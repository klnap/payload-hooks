import { describe, expect, it } from 'bun:test'
import type { Field } from 'payload'

import { isEmpty } from '#hooks/core/empty-value'
import {
  emptyFieldPaths,
  requiredLocalizedRules,
  requiredNonLocalizedRules,
  valueAt,
} from '#hooks/core/field-paths'
import { formatPublishAllErrorPath } from '#hooks/core/publish-messages'

const emptyLexical = {
  root: {
    type: 'root',
    children: [{ type: 'paragraph', children: [], version: 1 }],
    version: 1,
  },
}

describe('core publish validation', () => {
  it('treats whitespace-only strings as empty', () => {
    expect(isEmpty('\n\t  ')).toBe(true)
  })

  it('treats 0 and false as non-empty primitives', () => {
    expect(isEmpty(0)).toBe(false)
    expect(isEmpty(false)).toBe(false)
  })

  it('treats null and empty arrays as empty', () => {
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty([])).toBe(true)
  })

  it('treats empty Lexical documents as empty', () => {
    expect(isEmpty(emptyLexical)).toBe(true)
  })

  it('treats nested objects as empty only when every leaf is empty', () => {
    expect(isEmpty({ a: { b: '' } })).toBe(true)
    expect(isEmpty({ a: { b: 'x' } })).toBe(false)
    expect(isEmpty({ a: { b: 0 } })).toBe(false)
  })

  it('collects required localized fields inside arrays', () => {
    const fields: Field[] = [
      {
        name: 'items',
        type: 'array',
        fields: [{ name: 'caption', type: 'text', required: true, localized: true }],
      },
    ]

    expect(requiredLocalizedRules(fields)).toEqual([
      { kind: 'arrayItem', arrayPath: 'items', itemPath: 'caption' },
    ])
  })

  it('flags empty required localized array rows', () => {
    const rules = requiredLocalizedRules([
      {
        name: 'items',
        type: 'array',
        fields: [{ name: 'caption', type: 'text', required: true, localized: true }],
      },
    ])

    expect(emptyFieldPaths({ items: [{ caption: 'ok' }, { caption: '  ' }] }, rules)).toEqual([
      'items.1.caption',
    ])
  })

  it('collects required localized fields inside blocks', () => {
    const fields: Field[] = [
      {
        name: 'layout',
        type: 'blocks',
        blocks: [
          {
            slug: 'hero',
            fields: [{ name: 'heading', type: 'text', required: true, localized: true }],
          },
        ],
      },
    ]

    expect(requiredLocalizedRules(fields)).toEqual([
      { kind: 'blockField', blocksPath: 'layout', blockSlug: 'hero', itemPath: 'heading' },
    ])
  })

  it('flags empty required localized block fields by blockType', () => {
    const rules = requiredLocalizedRules([
      {
        name: 'layout',
        type: 'blocks',
        blocks: [
          {
            slug: 'hero',
            fields: [{ name: 'heading', type: 'text', required: true, localized: true }],
          },
        ],
      },
    ])

    expect(
      emptyFieldPaths(
        {
          layout: [
            { blockType: 'hero', heading: '' },
            { blockType: 'other', heading: '' },
          ],
        },
        rules
      )
    ).toEqual(['layout.0.heading'])
  })

  it('scalar required localized rules expose a single scalar path', () => {
    const fields: Field[] = [{ name: 'title', type: 'text', required: true, localized: true }]
    expect(requiredLocalizedRules(fields)).toEqual([{ kind: 'scalar', path: 'title' }])
  })

  it('collects required non-localized scalar fields', () => {
    const fields: Field[] = [
      { name: 'title', type: 'text', required: true, localized: true },
      { name: 'internalCode', type: 'text', required: true },
    ]
    expect(requiredNonLocalizedRules(fields)).toEqual([{ kind: 'scalar', path: 'internalCode' }])
  })

  it('returns undefined from valueAt for empty path segments', () => {
    expect(valueAt({ title: 'x' }, '')).toBeUndefined()
  })

  it('returns an empty publish-all summary when every locale list is empty', () => {
    expect(formatPublishAllErrorPath({}, { locales: [{ code: 'en', label: 'English' }] })).toBe('')
  })
})
