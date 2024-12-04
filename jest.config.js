/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/temporal/__tests__/**/*.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest']
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/temporal/__tests__/setup.ts'
  ],
  maxWorkers: 1,
  testTimeout: 10000
};
