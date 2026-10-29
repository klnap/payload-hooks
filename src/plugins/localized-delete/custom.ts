export type LocalizedDeleteCustomConfig = {
  enabled?: boolean
  intro?: string
  message?: string
}

export const parseLocalizedDeleteCustom = (custom: unknown): LocalizedDeleteCustomConfig | null => {
  if (!custom || typeof custom !== 'object') return null
  const raw = (custom as { localizedDelete?: unknown }).localizedDelete
  if (raw === false) return { enabled: false }
  if (raw === true) return { enabled: true }
  if (raw && typeof raw === 'object') {
    return { enabled: true, ...(raw as LocalizedDeleteCustomConfig) }
  }
  return null
}

export const isLocalizedDeleteOptedOut = (custom: unknown): boolean =>
  parseLocalizedDeleteCustom(custom)?.enabled === false

export const isLocalizedDeleteEnabledForClient = (custom: unknown): boolean => {
  const block = parseLocalizedDeleteCustom(custom)
  return block?.enabled === true
}

export const mergeLocalizedDeleteCustom = (custom: unknown): Record<string, unknown> | boolean => {
  const prior = parseLocalizedDeleteCustom(custom)
  if (prior?.intro || prior?.message) {
    return { enabled: true, intro: prior.intro, message: prior.message }
  }
  return true
}

/** Payload strips `collection.custom` from the client config — use `admin.custom` in the admin UI. */
export type LocalizedDeleteCollectionLike = {
  custom?: unknown
  admin?: { custom?: unknown }
}

export const readCollectionLocalizedDeleteCustom = (
  collection: LocalizedDeleteCollectionLike | undefined
): LocalizedDeleteCustomConfig | null => {
  if (!collection) return null
  const fromAdmin = parseLocalizedDeleteCustom(collection.admin?.custom)
  if (fromAdmin) return fromAdmin
  return parseLocalizedDeleteCustom(collection.custom)
}

export const isLocalizedDeleteEnabledOnCollection = (
  collection: LocalizedDeleteCollectionLike | undefined
): boolean => readCollectionLocalizedDeleteCustom(collection)?.enabled === true
