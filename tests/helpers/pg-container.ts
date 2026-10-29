import { randomBytes } from 'node:crypto'
import { Client } from 'pg'

/** Dedicated integration server only — never fall back to app `DATABASE_URL`. */
export const resolveTestDatabaseUrl = (): string | undefined =>
  process.env.PAYLOAD_HOOKS_TEST_DATABASE_URL?.trim() || undefined

export const intDatabaseConfigured = Boolean(resolveTestDatabaseUrl())

const parsePostgresUrl = (url: string): { adminUrl: string; database: string } => {
  const parsed = new URL(url)
  const database = parsed.pathname.replace(/^\//, '') || 'postgres'
  parsed.pathname = '/postgres'
  return { adminUrl: parsed.toString(), database }
}

export const createIsolatedDatabase = async (
  baseUrl: string
): Promise<{ url: string; database: string }> => {
  const database = `hooks_int_${randomBytes(6).toString('hex')}`
  const parsed = new URL(baseUrl)
  parsed.pathname = `/${database}`
  const url = parsed.toString()

  const { adminUrl } = parsePostgresUrl(baseUrl)
  const client = new Client({ connectionString: adminUrl })
  await client.connect()
  try {
    await client.query(`CREATE DATABASE "${database}"`)
  } finally {
    await client.end()
  }

  return { url, database }
}

export const dropIsolatedDatabase = async (baseUrl: string, database: string): Promise<void> => {
  const { adminUrl } = parsePostgresUrl(baseUrl)
  const client = new Client({ connectionString: adminUrl })
  await client.connect()
  try {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [database]
    )
    await client.query(`DROP DATABASE IF EXISTS "${database}"`)
  } finally {
    await client.end()
  }
}
