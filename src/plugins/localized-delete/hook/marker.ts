import type { CollectionBeforeDeleteHook } from 'payload'

const markerKey = '__klnapLocalizedDeleteConfirmation'

type MarkedHook = CollectionBeforeDeleteHook & {
  [markerKey]?: true
}

export const markLocalizedDeleteConfirmationHook = (
  hook: CollectionBeforeDeleteHook
): CollectionBeforeDeleteHook => {
  Object.defineProperty(hook, markerKey, {
    value: true,
    enumerable: false,
  })
  return hook
}

export const isLocalizedDeleteConfirmationHook = (hook: unknown): boolean =>
  typeof hook === 'function' && (hook as MarkedHook)[markerKey] === true
