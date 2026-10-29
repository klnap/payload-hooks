/** Payload Admin / Local API query flags used by hook factories. */

const isTruthyFlag = (value: unknown): boolean => value === 'true' || value === true

type PublishAllLocalesRequest = {
  query?: Record<string, unknown>
  context?: Record<string, unknown> | null
}

/**
 * Publish-all detection for hook guards.
 *
 * - Admin / REST: `req.query.publishAllLocales`
 * - Local API: set `req.context.publishAllLocales` when passing `publishAllLocales: true`
 *   (Payload does not mirror the option onto `req.query` for collection hooks).
 */
export const isPublishAllLocales = (req: PublishAllLocalesRequest): boolean =>
  isTruthyFlag(req.query?.publishAllLocales) || isTruthyFlag(req.context?.publishAllLocales)

export const isDraftSave = (req: { query?: Record<string, unknown> }): boolean =>
  req.query?.draft === 'true' || req.query?.draft === true

export const isExplicitUnpublishAll = (req: { query?: Record<string, unknown> }): boolean =>
  req.query?.unpublishAllLocales === 'true' || req.query?.unpublishAllLocales === true
