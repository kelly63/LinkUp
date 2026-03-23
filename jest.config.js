module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '^web-push$': '<rootDir>/tests/__mocks__/web-push.js',
  },
  testTimeout: 30000,
};
