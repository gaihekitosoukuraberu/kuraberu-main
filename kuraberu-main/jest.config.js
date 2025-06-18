/**
 * Jest configuration for the Kuraberu LP project
 */

module.exports = {
  // JavaScript files
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  
  // Test match pattern
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
  ],
  
  // Coverage reporting
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  
  // Mocks and setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module resolution
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '\\.css$': 'identity-obj-proxy',
  },
  
  // Transform ESM to CommonJS for Jest
  transformIgnorePatterns: [
    '/node_modules/(?!.*\\.mjs$)'
  ],
};