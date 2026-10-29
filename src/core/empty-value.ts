const hasLexicalText = (node: unknown): boolean => {
  if (!node || typeof node !== 'object') return false
  const record = node as Record<string, unknown>
  if (typeof record.text === 'string' && record.text.trim()) return true
  return Array.isArray(record.children) ? record.children.some(hasLexicalText) : false
}

/** Empty string / array / nullish / empty Lexical or plain object. */
export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    if ('root' in value && (value as { root?: { type?: string } }).root?.type === 'root') {
      return !hasLexicalText((value as { root: unknown }).root)
    }
    return !Object.values(value as Record<string, unknown>).some((v) => !isEmpty(v))
  }
  return false
}
