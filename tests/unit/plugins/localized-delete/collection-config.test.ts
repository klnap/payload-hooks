import { describe, expect, it } from 'bun:test'
import type { ClientConfig } from 'payload'

import { isLocalizedDeleteCollection } from '#hooks/plugins/localized-delete/admin/collection-config'

describe('isLocalizedDeleteCollection', () => {
  it('reads localized delete flag from admin.custom on the client config', () => {
    const config = {
      collections: [
        {
          slug: 'projects',
          admin: { custom: { localizedDelete: true } },
        },
      ],
    } as unknown as ClientConfig

    expect(isLocalizedDeleteCollection(config, 'projects')).toBe(true)
    expect(isLocalizedDeleteCollection(config, 'media')).toBe(false)
  })
})
