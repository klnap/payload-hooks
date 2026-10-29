export type LocalizedDeleteRequestBody = {
  permanently?: boolean
}

export const resolveLocalizedDeletePermanently = ({
  trashEnabled,
  isTrashView,
  deletePermanently,
}: {
  trashEnabled: boolean
  isTrashView: boolean
  deletePermanently: boolean
}): boolean => {
  if (!trashEnabled) return true
  if (isTrashView) return true
  return deletePermanently
}

const recordPhrase = (recordCount: number): string =>
  recordCount === 1 ? 'this record' : `these ${recordCount} records`

export const localizedDeleteTrashHint = ({
  trashEnabled,
  isTrashView,
  deletePermanently,
  recordCount = 1,
}: {
  trashEnabled: boolean
  isTrashView: boolean
  deletePermanently: boolean
  recordCount?: number
}): string | null => {
  if (!trashEnabled) return null
  const target = recordPhrase(recordCount)
  if (isTrashView || deletePermanently) {
    return `Permanently deletes all locale versions of ${target}.`
  }
  return `Moves all locale versions of ${target} to trash.`
}
