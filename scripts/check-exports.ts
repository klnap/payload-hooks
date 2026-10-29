import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const snapshotPath = join(root, 'scripts/exports-snapshot.json')
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Record<string, string[]>

const toSpecifier = (subpath: string): string =>
  subpath === '.' ? '@klnap/payload-hooks' : `@klnap/payload-hooks${subpath.slice(1)}`

const writeErr = (line: string) => {
  process.stderr.write(`${line}\n`)
}

const writeOut = (line: string) => {
  process.stdout.write(`${line}\n`)
}

let failed = false

for (const [subpath, expected] of Object.entries(snapshot)) {
  const specifier = toSpecifier(subpath)
  let mod: Record<string, unknown>
  try {
    mod = await import(specifier)
  } catch (error) {
    writeErr(`[check:exports] Failed to import ${specifier}: ${String(error)}`)
    failed = true
    continue
  }

  const actual = Object.keys(mod).sort()
  const expectedSorted = [...expected].sort()

  const missing = expectedSorted.filter((name) => !actual.includes(name))
  const extra = actual.filter((name) => !expectedSorted.includes(name))

  if (missing.length || extra.length) {
    failed = true
    writeErr(`[check:exports] Mismatch for ${subpath} (${specifier})`)
    if (missing.length) writeErr(`  missing: ${missing.join(', ')}`)
    if (extra.length) writeErr(`  extra: ${extra.join(', ')}`)
  }
}

if (failed) {
  process.exit(1)
}

writeOut('[check:exports] All public subpaths match exports snapshot.')
