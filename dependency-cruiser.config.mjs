/** @type {import('dependency-cruiser').IConfiguration} */
const config = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-no-payload',
      severity: 'error',
      from: { path: '^src/core/' },
      to: {
        dependencyTypes: ['npm'],
        path: '^(payload|@payloadcms/)',
      },
    },
    {
      name: 'request-no-payload',
      severity: 'error',
      from: { path: '^src/request/' },
      to: {
        dependencyTypes: ['npm'],
        path: '^(payload|@payloadcms/)',
      },
    },
    {
      name: 'hooks-no-cross-internals',
      severity: 'error',
      from: { path: '^src/hooks/([^/]+)/' },
      to: {
        path: '^src/hooks/([^/]+)/',
        pathNot: ['^src/hooks/$1/'],
      },
    },
    {
      name: 'core-no-upstream',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/(hooks|plugins|request|exports)/' },
    },
    {
      name: 'request-no-upstream',
      severity: 'error',
      from: { path: '^src/request/' },
      to: { path: '^src/(hooks|plugins|exports)/' },
    },
    {
      name: 'hooks-no-plugins',
      severity: 'error',
      from: { path: '^src/hooks/' },
      to: { path: '^src/plugins/' },
    },
    {
      name: 'plugins-no-hooks',
      severity: 'error',
      from: { path: '^src/plugins/' },
      to: { path: '^src/hooks/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
}

export default config
