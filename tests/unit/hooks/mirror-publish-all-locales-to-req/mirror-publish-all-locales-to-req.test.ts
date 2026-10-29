import { describe, expect, it } from 'bun:test'

import { mirrorPublishAllLocalesFlagsToReq } from '#hooks/hooks/mirror-publish-all-locales-to-req'
import { isPublishAllLocales } from '#hooks/request/admin-query'

const hook = mirrorPublishAllLocalesFlagsToReq()

type MirrorReq = {
  query: Record<string, string>
  locale?: string
}

describe('mirrorPublishAllLocalesFlagsToReq', () => {
  it('mirrors Local API publishAllLocales onto req.query', async () => {
    const req: MirrorReq = { query: { locale: 'pl' } }

    await hook({
      req,
      args: { publishAllLocales: true, req },
    } as never)

    expect(isPublishAllLocales(req)).toBe(true)
    expect(req.query).toEqual({ locale: 'pl', publishAllLocales: 'true' })
  })

  it('pins query.locale from Local API locale when publish-all', async () => {
    const req: MirrorReq = { query: {}, locale: 'en' }

    await hook({
      req,
      args: { publishAllLocales: true, locale: 'pl', req },
    } as never)

    expect(req.query).toEqual({ publishAllLocales: 'true', locale: 'pl' })
  })

  it('mirrors unpublishAllLocales and publishSpecificLocale', async () => {
    const req: MirrorReq = { query: {} }

    await hook({
      req,
      args: {
        unpublishAllLocales: true,
        publishSpecificLocale: 'de',
        req,
      },
    } as never)

    expect(req.query).toEqual({
      unpublishAllLocales: 'true',
      publishSpecificLocale: 'de',
    })
  })
})
