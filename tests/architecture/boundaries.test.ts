import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const pkgRoot = join(import.meta.dir, '../..')

describe('architecture — dependency boundaries', () => {
  test('dependency-cruiser passes on src/', () => {
    const result = spawnSync('bun', ['run', 'check:boundaries'], {
      cwd: pkgRoot,
      encoding: 'utf8',
      env: process.env,
    })
    if (result.status !== 0) {
      expect(`${result.stdout}\n${result.stderr}`).toBe('')
    }
    expect(result.status).toBe(0)
  }, 30_000)
})
