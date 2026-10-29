import { describe, expect, it } from 'bun:test'
import type { Field } from 'payload'
import { ValidationError } from 'payload'
import { isEmpty } from '#hooks/core/empty-value'
import { emptyFieldPaths, requiredLocalizedRules, valueAt } from '#hooks/core/field-paths'
import {
  DEFAULT_FIELD_MESSAGE,
  DEFAULT_PUBLISH_ALL_MESSAGE,
  formatPublishAllErrorPath,
  localeLabel,
  toFieldErrors,
  toPublishAllErrors,
} from '#hooks/core/publish-messages'
import { rejectPublishWhenRequiredFieldsEmpty } from '#hooks/hooks/reject-publish-when-required-fields-empty/reject-publish-when-required-fields-empty'
import { isPublishAllLocales } from '#hooks/request/admin-query'

const emptyLexical = {
  root: {
    type: 'root',
    children: [{ type: 'paragraph', children: [], version: 1 }],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
}

const filledLexical = {
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Hello', version: 1 }],
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
}

const sampleFields: Field[] = [
  {
    type: 'tabs',
    tabs: [
      {
        label: 'Content',
        fields: [
          { name: 'title', type: 'text', required: true, localized: true },
          {
            name: 'description',
            type: 'richText',
            required: true,
            localized: true,
          },
          { name: 'optionalNote', type: 'text', localized: true },
          {
            type: 'group',
            name: 'seo',
            fields: [
              {
                name: 'robots',
                type: 'select',
                required: true,
                localized: true,
                options: [{ label: 'index', value: 'index' }],
              },
            ],
          },
        ],
      },
    ],
  },
  { name: 'slug', type: 'text', required: true, localized: true },
  { name: 'internalCode', type: 'text', required: true },
]

describe('isEmpty', () => {
  it('treats null, undefined, and blank strings as empty', () => {
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty(undefined)).toBe(true)
    expect(isEmpty('')).toBe(true)
    expect(isEmpty('   ')).toBe(true)
  })

  it('treats populated primitives and arrays as non-empty', () => {
    expect(isEmpty('title')).toBe(false)
    expect(isEmpty(0)).toBe(false)
    expect(isEmpty(false)).toBe(false)
    expect(isEmpty(['a'])).toBe(false)
    expect(isEmpty([])).toBe(true)
  })

  it('detects empty vs filled Lexical rich text', () => {
    expect(isEmpty(emptyLexical)).toBe(true)
    expect(isEmpty(filledLexical)).toBe(false)
  })

  it('detects empty nested plain objects', () => {
    expect(isEmpty({ a: '', b: null })).toBe(true)
    expect(isEmpty({ a: 'x' })).toBe(false)
  })
})

describe('requiredLocalizedRules', () => {
  it('collects only required localized fields including nested groups and tabs', () => {
    const scalarPaths = requiredLocalizedRules(sampleFields)
      .filter((rule): rule is { kind: 'scalar'; path: string } => rule.kind === 'scalar')
      .map((rule) => rule.path)
    expect(scalarPaths).toEqual(['title', 'description', 'seo.robots', 'slug'])
  })
})

describe('valueAt / emptyFieldPaths', () => {
  it('reads nested values', () => {
    const data = { seo: { robots: 'index' }, title: 'Hi' }
    expect(valueAt(data, 'seo.robots')).toBe('index')
    expect(valueAt(data, 'missing.path')).toBeUndefined()
  })

  it('returns no paths when all required fields are filled', () => {
    const data = {
      title: 'Projects',
      description: filledLexical,
      seo: { robots: 'index, follow' },
      slug: 'projects',
    }
    expect(emptyFieldPaths(data, requiredLocalizedRules(sampleFields))).toEqual([])
  })

  it('reports a single missing field', () => {
    const data = {
      title: 'Projects',
      description: emptyLexical,
      seo: { robots: 'index, follow' },
      slug: 'projects',
    }
    expect(emptyFieldPaths(data, requiredLocalizedRules(sampleFields))).toEqual(['description'])
  })

  it('reports multiple missing fields', () => {
    const data = {
      title: '',
      description: emptyLexical,
      seo: {},
      slug: 'projects',
    }
    expect(emptyFieldPaths(data, requiredLocalizedRules(sampleFields))).toEqual([
      'title',
      'description',
      'seo.robots',
    ])
  })
})

describe('isPublishAllLocales', () => {
  it('detects the publish-all query flag', () => {
    expect(isPublishAllLocales({ query: { publishAllLocales: 'true' } })).toBe(true)
    expect(isPublishAllLocales({ query: { publishAllLocales: true } })).toBe(true)
    expect(isPublishAllLocales({})).toBe(false)
  })
})

describe('localeLabel', () => {
  it('resolves string and object labels', () => {
    expect(
      localeLabel(
        {
          locales: [
            { code: 'de', label: 'German' },
            { code: 'pl', label: { en: 'Polish', pl: 'Polski' } },
          ],
        },
        'de'
      )
    ).toBe('German')

    expect(
      localeLabel({ locales: [{ code: 'pl', label: { en: 'Polish', pl: 'Polski' } }] }, 'pl')
    ).toBe('Polish')

    expect(localeLabel({ locales: ['en'] }, 'en')).toBe('en')
  })
})

describe('error formatting', () => {
  it('uses default field and publish-all messages', () => {
    expect(toFieldErrors(['title'], DEFAULT_FIELD_MESSAGE)[0]?.message).toBe(DEFAULT_FIELD_MESSAGE)
    expect(
      toPublishAllErrors({ de: ['title'] }, { locales: [{ code: 'de', label: 'German' }] })[0]
        ?.message
    ).toBe(DEFAULT_PUBLISH_ALL_MESSAGE)
  })

  it('accepts custom fieldMessage via toFieldErrors', () => {
    expect(toFieldErrors(['title'], 'Custom field')).toEqual([
      { path: 'title', message: 'Custom field' },
    ])
  })

  it('accepts custom publishAllMessage via toPublishAllErrors', () => {
    expect(
      toPublishAllErrors(
        { de: ['title'] },
        { locales: [{ code: 'de', label: 'German' }] },
        'Custom publish-all'
      )[0]?.message
    ).toBe('Custom publish-all')
  })

  it('accepts both custom messages independently', () => {
    expect(toFieldErrors(['a'], 'Field A')[0]?.message).toBe('Field A')
    expect(
      toPublishAllErrors(
        { en: ['b'] },
        { locales: [{ code: 'en', label: 'English' }] },
        'Publish B'
      )[0]?.message
    ).toBe('Publish B')
  })

  it('builds single-locale field errors with real paths', () => {
    expect(toFieldErrors(['title', 'description'], DEFAULT_FIELD_MESSAGE)).toEqual([
      {
        path: 'title',
        message: DEFAULT_FIELD_MESSAGE,
      },
      {
        path: 'description',
        message: DEFAULT_FIELD_MESSAGE,
      },
    ])
  })

  it('formats publish-all paths as locale labels only', () => {
    const localization = {
      locales: [
        { code: 'de', label: 'German' },
        { code: 'pl', label: 'Polish' },
      ],
    }

    expect(
      formatPublishAllErrorPath(
        { de: ['title', 'description'], pl: ['title', 'description'] },
        localization
      )
    ).toBe('Missing required fields in locales: German · Polish')

    expect(formatPublishAllErrorPath({ de: ['title'] }, localization)).toBe(
      'Missing required fields in locale: German'
    )
  })

  it('builds one publish-all error listing incomplete locales', () => {
    const errors = toPublishAllErrors(
      { de: ['title', 'description'], pl: ['title'] },
      {
        locales: [
          { code: 'de', label: 'German' },
          { code: 'pl', label: 'Polish' },
        ],
      }
    )

    expect(errors).toEqual([
      {
        path: 'Missing required fields in locales: German · Polish',
        message: DEFAULT_PUBLISH_ALL_MESSAGE,
      },
    ])

    expect(errors[0]?.path.includes(',')).toBe(false)
    expect(errors[0]?.path.includes('\n')).toBe(false)
  })

  it('builds a single-locale publish-all error', () => {
    expect(
      toPublishAllErrors(
        { de: ['title', 'description'] },
        { locales: [{ code: 'de', label: 'German' }] }
      )
    ).toEqual([
      {
        path: 'Missing required fields in locale: German',
        message: DEFAULT_PUBLISH_ALL_MESSAGE,
      },
    ])
  })

  it('returns no errors when every locale is complete', () => {
    expect(toPublishAllErrors({}, { locales: [{ code: 'de', label: 'German' }] })).toEqual([])
  })
})

const publishFields: Field[] = [{ name: 'title', type: 'text', required: true, localized: true }]

describe('rejectPublishWhenRequiredFieldsEmpty hook messages', () => {
  const baseArgs = {
    data: { title: '', _status: 'published' as const },
    req: { query: {} },
    global: { slug: 'test', fields: publishFields },
    context: {},
  }

  it('throws ValidationError with custom fieldMessage from options', async () => {
    const hook = rejectPublishWhenRequiredFieldsEmpty({ fieldMessage: 'Need title to publish' })

    try {
      await hook(baseArgs as never)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      const validationError = error as ValidationError
      expect(validationError.data.errors[0]?.message).toBe('Need title to publish')
    }
  })

  it('uses default fieldMessage when options omitted', async () => {
    const hook = rejectPublishWhenRequiredFieldsEmpty()

    try {
      await hook(baseArgs as never)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      const validationError = error as ValidationError
      expect(validationError.data.errors[0]?.message).toBe(DEFAULT_FIELD_MESSAGE)
    }
  })

  it('uses custom fieldMessage when options.fieldMessage is set', async () => {
    const hook = rejectPublishWhenRequiredFieldsEmpty({ fieldMessage: 'Custom field required' })

    try {
      await hook(baseArgs as never)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      const validationError = error as ValidationError
      expect(validationError.data.errors[0]?.message).toBe('Custom field required')
    }
  })
})

describe('rejectPublishWhenRequiredFieldsEmpty non-localized required', () => {
  const fields: Field[] = [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'internalCode', type: 'text', required: true },
  ]

  it('ignores non-localized required fields by default', async () => {
    const hook = rejectPublishWhenRequiredFieldsEmpty()
    const result = await hook({
      data: { title: 'Hello', internalCode: '', _status: 'published' },
      req: { query: {} },
      global: { slug: 'test', fields },
      context: {},
    } as never)

    expect(result.internalCode).toBe('')
  })

  it('validates non-localized required fields when includeNonLocalizedRequired is set', async () => {
    const hook = rejectPublishWhenRequiredFieldsEmpty({ includeNonLocalizedRequired: true })

    await expect(
      hook({
        data: { title: 'Hello', internalCode: '  ', _status: 'published' },
        req: { query: {} },
        global: { slug: 'test', fields },
        context: {},
      } as never)
    ).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('rejectPublishWhenRequiredFieldsEmpty create + publish-all', () => {
  it('skips multi-locale validation on collection create when publish-all query is set', async () => {
    let findByIDCalled = false
    const hook = rejectPublishWhenRequiredFieldsEmpty()

    const result = await hook({
      operation: 'create',
      data: { title: 'Hello', _status: 'published' },
      originalDoc: undefined,
      req: {
        query: { publishAllLocales: 'true' },
        locale: 'en',
        payload: {
          config: {
            localization: {
              locales: [
                { code: 'en', label: 'English' },
                { code: 'de', label: 'German' },
              ],
            },
          },
          findByID: async () => {
            findByIDCalled = true
            return {}
          },
        },
      },
      collection: { slug: 'articles', fields: publishFields },
      context: {},
    } as never)

    expect(result._status).toBe('published')
    expect(findByIDCalled).toBe(false)
  })

  it('skips multi-locale validation on global create when publish-all query is set', async () => {
    let findGlobalCalled = false
    const hook = rejectPublishWhenRequiredFieldsEmpty()

    const result = await hook({
      data: { title: 'Hello', _status: 'published' },
      originalDoc: undefined,
      req: {
        query: { publishAllLocales: 'true' },
        locale: 'en',
        payload: {
          config: {
            localization: {
              locales: [
                { code: 'en', label: 'English' },
                { code: 'de', label: 'German' },
              ],
            },
          },
          findGlobal: async () => {
            findGlobalCalled = true
            return {}
          },
        },
      },
      global: { slug: 'site', fields: publishFields },
      context: {},
    } as never)

    expect(result._status).toBe('published')
    expect(findGlobalCalled).toBe(false)
  })
})
