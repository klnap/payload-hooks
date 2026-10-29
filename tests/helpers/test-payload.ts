import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { postgresAdapter } from '@payloadcms/db-postgres'
import {
  buildConfig,
  type CollectionConfig,
  type Config,
  type GlobalConfig,
  getPayload,
  type Payload,
} from 'payload'

import {
  createIsolatedDatabase,
  dropIsolatedDatabase,
  resolveTestDatabaseUrl,
} from './pg-container'

export { intDatabaseConfigured } from './pg-container'

export type TestPayloadHandle = {
  payload: Payload
  tempDir: string
  destroy: () => Promise<void>
}

const testSecret = 'payload-hooks-test-secret-32chars!!'

export const localizedPublishFields = (): GlobalConfig['fields'] => [
  { name: 'title', type: 'text', required: true, localized: true },
  {
    type: 'group',
    name: 'meta',
    fields: [{ name: 'label', type: 'text', required: true, localized: true }],
  },
  { name: 'note', type: 'text' },
]

export const draftVersions = {
  drafts: {
    localizeStatus: true,
    autosave: true,
  },
}

export type CreateTestPayloadOptions = {
  globals?: GlobalConfig[]
  collections?: CollectionConfig[]
  localization?: Config['localization']
}

export async function createTestPayload(
  options: CreateTestPayloadOptions = {}
): Promise<TestPayloadHandle> {
  const basePgUrl = resolveTestDatabaseUrl()
  if (!basePgUrl) {
    throw new Error('PAYLOAD_HOOKS_TEST_DATABASE_URL required for integration tests')
  }

  process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = 'true'
  const tempDir = mkdtempSync(join(tmpdir(), 'payload-hooks-'))
  const isolated = await createIsolatedDatabase(basePgUrl)
  const connectionString = isolated.url
  const isolatedDatabase = isolated.database

  const config = buildConfig({
    secret: testSecret,
    localization: options.localization ?? {
      locales: ['en', 'de'],
      defaultLocale: 'en',
      fallback: true,
    },
    db: postgresAdapter({
      pool: { connectionString },
      push: true,
    }),
    globals: options.globals ?? [],
    collections: options.collections ?? [],
  })

  const payload = await getPayload({ config, key: connectionString })

  const destroy = async () => {
    if (payload.db.destroy) {
      await payload.db.destroy()
    }
    rmSync(tempDir, { recursive: true, force: true })
  }

  return { payload, tempDir, destroy }
}

export const withPublishAllQuery = {
  query: { publishAllLocales: 'true' as const },
}

export const withDraftQuery = {
  query: { draft: 'true' as const },
}

export const withUnpublishAllQuery = {
  query: { unpublishAllLocales: 'true' as const },
}
