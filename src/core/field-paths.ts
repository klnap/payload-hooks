import { isEmpty } from './empty-value'
import {
  matchesRequiredPublishField,
  type RequiredPublishFieldMode,
  type RequiredPublishRulesOptions,
  resolveRequiredPublishModes,
} from './required-field-match'

export type { RequiredPublishFieldMode, RequiredPublishRulesOptions } from './required-field-match'

/** Minimal field shape for schema walking (no Payload import in core). */
export type WalkableField = {
  type?: string
  name?: string
  required?: boolean
  localized?: boolean
  fields?: WalkableField[]
  tabs?: { name?: string; fields: WalkableField[] }[]
  blocks?: { slug: string; fields: WalkableField[] }[]
}

export type RequiredFieldRule =
  | { kind: 'scalar'; path: string }
  | { kind: 'arrayItem'; arrayPath: string; itemPath: string }
  | { kind: 'blockField'; blocksPath: string; blockSlug: string; itemPath: string }

const pushScalarRules = (
  rules: RequiredFieldRule[],
  fields: WalkableField[],
  prefix: string,
  modes: RequiredPublishFieldMode[]
): void => {
  for (const field of fields) {
    if (field.fields && field.type !== 'array' && field.type !== 'blocks') {
      const next = field.name ? `${prefix}${field.name}.` : prefix
      pushScalarRules(rules, field.fields, next, modes)
    }

    if (field.tabs) {
      for (const tab of field.tabs) {
        const next = tab.name ? `${prefix}${tab.name}.` : prefix
        pushScalarRules(rules, tab.fields, next, modes)
      }
    }

    if (matchesRequiredPublishField(field, modes)) {
      rules.push({ kind: 'scalar', path: `${prefix}${field.name}` })
    }
  }
}

const pushArrayItemRules = (
  rules: RequiredFieldRule[],
  fields: WalkableField[],
  arrayPath: string,
  modes: RequiredPublishFieldMode[],
  itemPrefix = ''
): void => {
  for (const field of fields) {
    if (field.fields && field.type !== 'array' && field.type !== 'blocks') {
      const next = field.name ? `${itemPrefix}${field.name}.` : itemPrefix
      pushArrayItemRules(rules, field.fields, arrayPath, modes, next)
    }

    if (field.tabs) {
      for (const tab of field.tabs) {
        const next = tab.name ? `${itemPrefix}${tab.name}.` : itemPrefix
        pushArrayItemRules(rules, tab.fields, arrayPath, modes, next)
      }
    }

    if (matchesRequiredPublishField(field, modes)) {
      const itemPath = `${itemPrefix}${field.name}`.replace(/^\./, '')
      rules.push({ kind: 'arrayItem', arrayPath, itemPath })
    }
  }
}

const pushBlockFieldRules = (
  rules: RequiredFieldRule[],
  fields: WalkableField[],
  blocksPath: string,
  blockSlug: string,
  modes: RequiredPublishFieldMode[],
  itemPrefix = ''
): void => {
  for (const field of fields) {
    if (field.fields && field.type !== 'array' && field.type !== 'blocks') {
      const next = field.name ? `${itemPrefix}${field.name}.` : itemPrefix
      pushBlockFieldRules(rules, field.fields, blocksPath, blockSlug, modes, next)
    }

    if (field.tabs) {
      for (const tab of field.tabs) {
        const next = tab.name ? `${itemPrefix}${tab.name}.` : itemPrefix
        pushBlockFieldRules(rules, tab.fields, blocksPath, blockSlug, modes, next)
      }
    }

    if (matchesRequiredPublishField(field, modes)) {
      const itemPath = `${itemPrefix}${field.name}`.replace(/^\./, '')
      rules.push({ kind: 'blockField', blocksPath, blockSlug, itemPath })
    }
  }
}

const collectRequiredRules = (
  fields: WalkableField[],
  modes: RequiredPublishFieldMode[],
  prefix = ''
): RequiredFieldRule[] => {
  const rules: RequiredFieldRule[] = []
  pushScalarRules(rules, fields, prefix, modes)

  for (const field of fields) {
    if (field.type === 'array' && field.name && field.fields) {
      pushArrayItemRules(rules, field.fields, `${prefix}${field.name}`, modes)
    }

    if (field.type === 'blocks' && field.name && field.blocks) {
      const blocksPath = `${prefix}${field.name}`
      for (const block of field.blocks) {
        pushBlockFieldRules(rules, block.fields, blocksPath, block.slug, modes)
      }
    }
  }

  return rules
}

/**
 * Rules for required + localized fields this hook can validate.
 *
 * Supports tabs, groups, arrays, blocks, nested scalars (incl. Lexical).
 */
export const requiredLocalizedRules = (fields: WalkableField[], prefix = ''): RequiredFieldRule[] =>
  collectRequiredRules(fields, ['localized'], prefix)

export const requiredNonLocalizedRules = (
  fields: WalkableField[],
  prefix = ''
): RequiredFieldRule[] => collectRequiredRules(fields, ['nonLocalized'], prefix)

export const requiredPublishRules = (
  fields: WalkableField[],
  options?: RequiredPublishRulesOptions,
  prefix = ''
): RequiredFieldRule[] => collectRequiredRules(fields, resolveRequiredPublishModes(options), prefix)

const missingInArray = (
  data: Record<string, unknown>,
  arrayPath: string,
  itemPath: string
): string[] => {
  const arr = valueAt(data, arrayPath)
  if (!Array.isArray(arr)) return [`${arrayPath}.0.${itemPath}`]
  if (arr.length === 0) return []

  const missing: string[] = []
  arr.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      missing.push(`${arrayPath}.${index}.${itemPath}`)
      return
    }

    if (isEmpty(valueAt(entry as Record<string, unknown>, itemPath))) {
      missing.push(`${arrayPath}.${index}.${itemPath}`)
    }
  })

  return missing
}

const missingInBlocks = (
  data: Record<string, unknown>,
  blocksPath: string,
  blockSlug: string,
  itemPath: string
): string[] => {
  const blocks = valueAt(data, blocksPath)
  if (!Array.isArray(blocks)) return [`${blocksPath}.0.${itemPath}`]

  const missing: string[] = []
  blocks.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return
    const block = entry as Record<string, unknown>
    const type = block.blockType ?? block.blockName
    if (type !== blockSlug) return
    if (isEmpty(valueAt(block, itemPath))) {
      missing.push(`${blocksPath}.${index}.${itemPath}`)
    }
  })

  return missing
}

export const emptyFieldPaths = (
  data: Record<string, unknown>,
  rules: RequiredFieldRule[]
): string[] => {
  const missing: string[] = []

  for (const rule of rules) {
    if (rule.kind === 'scalar') {
      if (isEmpty(valueAt(data, rule.path))) missing.push(rule.path)
      continue
    }

    if (rule.kind === 'arrayItem') {
      missing.push(...missingInArray(data, rule.arrayPath, rule.itemPath))
      continue
    }

    missing.push(...missingInBlocks(data, rule.blocksPath, rule.blockSlug, rule.itemPath))
  }

  return missing
}

export const valueAt = (data: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[key]
  }, data)
