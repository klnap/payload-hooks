export const LOCALIZED_DELETE_CONFIRMED_CONTEXT_KEY = 'localizedDeleteConfirmed'

type LocalizedDeleteRequest = {
  context?: Record<string, unknown> | null
}

export const isLocalizedDeleteConfirmed = (
  req: LocalizedDeleteRequest,
  contextKey = LOCALIZED_DELETE_CONFIRMED_CONTEXT_KEY
): boolean => req.context?.[contextKey] === true

export const withLocalizedDeleteConfirmed = (
  context: Record<string, unknown> | null | undefined,
  contextKey = LOCALIZED_DELETE_CONFIRMED_CONTEXT_KEY
): Record<string, unknown> => ({
  ...(context ?? {}),
  [contextKey]: true,
})
