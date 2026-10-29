import type { WalkableField } from './field-paths'

export type RequiredPublishFieldMode = 'localized' | 'nonLocalized'

export type RequiredPublishRulesOptions = {
  modes?: RequiredPublishFieldMode[]
  includeNonLocalizedRequired?: boolean
}

export const defaultRequiredPublishModes: RequiredPublishFieldMode[] = ['localized']

export const resolveRequiredPublishModes = (options?: {
  modes?: RequiredPublishFieldMode[]
  includeNonLocalizedRequired?: boolean
}): RequiredPublishFieldMode[] => {
  if (options?.modes?.length) {
    const modes = [...options.modes]
    if (options.includeNonLocalizedRequired && !modes.includes('nonLocalized')) {
      modes.push('nonLocalized')
    }
    return modes
  }

  if (options?.includeNonLocalizedRequired) {
    return ['localized', 'nonLocalized']
  }

  return defaultRequiredPublishModes
}

export const matchesRequiredPublishField = (
  field: WalkableField,
  modes: RequiredPublishFieldMode[]
): boolean => {
  if (!field.name || !field.required) return false
  if (field.localized) return modes.includes('localized')
  return modes.includes('nonLocalized')
}
