export type LocalizedDeleteListSelectionPortalTarget =
  | { kind: 'actions'; el: HTMLElement }
  | { kind: 'bar'; el: HTMLElement }

/** Find list-selection toolbars for the active collection list view. */
export const findLocalizedDeleteListSelectionPortalTargets = (
  collectionSlug: string
): LocalizedDeleteListSelectionPortalTarget[] => {
  const root = document.querySelector(`.collection-list--${collectionSlug}`)
  if (!root) return []

  const targets: LocalizedDeleteListSelectionPortalTarget[] = []
  for (const bar of root.querySelectorAll<HTMLElement>('.list-selection')) {
    const actions = bar.querySelectorAll<HTMLElement>('.list-selection__actions')
    const last = actions[actions.length - 1]
    if (last) {
      targets.push({ kind: 'actions', el: last })
    } else {
      targets.push({ kind: 'bar', el: bar })
    }
  }
  return targets
}

const samePortalTargets = (
  a: LocalizedDeleteListSelectionPortalTarget[],
  b: LocalizedDeleteListSelectionPortalTarget[]
): boolean =>
  a.length === b.length &&
  a.every((entry, index) => entry.el === b[index]?.el && entry.kind === b[index]?.kind)

export const mergePortalTargetsIfChanged = (
  prev: LocalizedDeleteListSelectionPortalTarget[],
  next: LocalizedDeleteListSelectionPortalTarget[]
): LocalizedDeleteListSelectionPortalTarget[] => (samePortalTargets(prev, next) ? prev : next)
