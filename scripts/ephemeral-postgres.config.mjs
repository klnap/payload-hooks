export default {
  containerName: 'payload-hooks-test-db',
  hostPort: 5435,
  envVar: 'PAYLOAD_HOOKS_TEST_DATABASE_URL',
  image: 'postgres:16-alpine',
  password: 'postgres',
}
