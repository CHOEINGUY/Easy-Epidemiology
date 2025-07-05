// Jest setup file

// Mock Vuex
jest.mock('vuex', () => ({
  createStore: jest.fn(),
  useStore: jest.fn()
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
}; 