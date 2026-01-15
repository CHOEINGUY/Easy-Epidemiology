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
    customExportConditions: ["node", "node-addons"],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,vue}',
    '!src/**/*.d.ts',
    '!src/main.ts'
  ]
}
