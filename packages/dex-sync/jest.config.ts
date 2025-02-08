// jest.config.js
module.exports = {
  transform: {
    '^.+\\.ts?$': ['@swc/jest'],
  },
  transformIgnorePatterns: ['/node_modules/(?!drizzle-orm)'],
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/tests/vite/'],
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  collectCoverage: true,
  coverageReporters: ['cobertura', 'html'],
  coveragePathIgnorePatterns: [
    '<rootDir>/packages/.+/build', // ignore every build/ of every sub directory of packages
    '<rootDir>/packages/.+/dist',
    '<rootDir>/node_modules/',
    '<rootDir>/packages/.+/node_modules/',
    '<rootDir>/packages/.+/tests/',
  ],
};
