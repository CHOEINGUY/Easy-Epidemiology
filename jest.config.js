module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.ts$': 'ts-jest'
  },
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },
  // v3 quality ratchet: measure the strict-core surface first and expand it as legacy code is migrated.
  collectCoverageFrom: [
    'src/components/DataInputVirtualScroll/utils/validationUtils.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 100,
      lines: 90,
      statements: 90
    }
  }
};
