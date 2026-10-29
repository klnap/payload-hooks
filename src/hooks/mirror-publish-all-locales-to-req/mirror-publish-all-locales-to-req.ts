import type {
  CollectionBeforeOperationHook,
  GlobalBeforeOperationHook,
  PayloadRequest,
} from 'payload'

type PublicationFlags = {
  publishAllLocales?: boolean
  unpublishAllLocales?: boolean | string
  publishSpecificLocale?: string
  /** Local API `locale` option — pin as `query.locale` so edit-tab stays stable across publish-all. */
  locale?: string | null
}

const asLocaleCode = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 && value !== 'all' ? value : undefined

const applyPublicationFlagsToReq = (req: PayloadRequest, flags: PublicationFlags): void => {
  const query = { ...(req.query ?? {}) }

  if (flags.publishAllLocales) {
    query.publishAllLocales = 'true'
    const locale = asLocaleCode(flags.locale) ?? asLocaleCode(req.locale)
    if (locale && !asLocaleCode(query.locale) && !asLocaleCode(query.publishSpecificLocale)) {
      query.locale = locale
    }
  }

  const unpublish = flags.unpublishAllLocales
  if (unpublish === true || unpublish === 'true') {
    query.unpublishAllLocales = 'true'
  }

  if (typeof flags.publishSpecificLocale === 'string' && flags.publishSpecificLocale.length > 0) {
    query.publishSpecificLocale = flags.publishSpecificLocale
  }

  req.query = query
}

type MirrorArgs = {
  args: PublicationFlags & { req?: PayloadRequest }
  req: PayloadRequest
}

/**
 * `beforeOperation` — mirror Local API `publishAllLocales` / `unpublishAllLocales` onto
 * `req.query` so `isPublishAllLocales(req)` matches Admin / REST (hooks only see `req`).
 * Also pins `query.locale` from the Local API `locale` option so preserve/restore keep
 * the edited tab when Payload mutates `req.locale` during publish-all.
 */
export const mirrorPublishAllLocalesFlagsToReq = () => {
  const hook = async (input: MirrorArgs) => {
    const { args, req } = input
    applyPublicationFlagsToReq(req, args)
    if (args.req && args.req !== req) {
      applyPublicationFlagsToReq(args.req, args)
    }
    return input.args
  }

  return hook as unknown as GlobalBeforeOperationHook & CollectionBeforeOperationHook
}
