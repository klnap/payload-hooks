import { describe, expect, it } from 'bun:test'

import {
  formatAdminLocaleHeading,
  formatLocalizedDeleteLocaleLine,
  localizedDeleteModalMessage,
} from '#hooks/plugins/localized-delete/copy'

describe('localized delete admin copy', () => {
  it('formats locale heading as English (EN)', () => {
    const heading = formatAdminLocaleHeading('en', [{ code: 'en', label: 'English' }], (label) =>
      typeof label === 'string' ? label : (label.en ?? '')
    )
    expect(heading).toBe('English (EN)')
  })

  it('uses a single summary line (trash hint over default)', () => {
    expect(
      localizedDeleteModalMessage({
        trashHint: 'Moves all locale versions of this record to trash.',
        recordCount: 1,
      })
    ).toBe('Moves all locale versions of this record to trash.')
    expect(localizedDeleteModalMessage({ recordCount: 3 })).toBe(
      'Deletes all locale versions of these 3 records.'
    )
  })

  it('formats locale line with english status labels', () => {
    const line = formatLocalizedDeleteLocaleLine(
      {
        code: 'en',
        status: 'published',
        title: 'Hello',
        slug: 'hello',
      },
      'English (EN)'
    )
    expect(line).toBe('English (EN) — published — title: Hello — slug: hello')
  })
})
