/** @type {import('jest').Config} */
module.exports = {
  // Extend base configuration
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Root paths for tools testing
  roots: ['<rootDir>/../../tests', '<rootDir>/../../src/talk_to_figma_mcp/tools'],
  
  // Test patterns specifically for tools
  testMatch: [
    '**/tests/integration/*-tools.test.ts',
    '**/tests/unit/tools/**/*.test.ts',
    '**/src/talk_to_figma_mcp/tools/**/*.test.ts'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 
      useESM: true,
      tsconfig: {
        module: 'esnext',
        target: 'es2020'
      }
    }],
  },
  
  // Coverage configuration specific to tools
  collectCoverageFrom: [
    'src/talk_to_figma_mcp/tools/**/*.{ts,tsx}',
    'src/talk_to_figma_mcp/utils/**/*.{ts,tsx}',
    '!src/talk_to_figma_mcp/tools/**/index.ts',
    '!src/talk_to_figma_mcp/**/*.d.ts',
    '!src/talk_to_figma_mcp/**/*.test.ts'
  ],
  
  // Coverage thresholds for tools
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Individual tool coverage requirements
    'src/talk_to_figma_mcp/tools/variable-tools.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/talk_to_figma_mcp/tools/style-tools.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/talk_to_figma_mcp/tools/boolean-tools.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  
  // Coverage output directory
  coverageDirectory: '<rootDir>/../../coverage/tools',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
    'cobertura'
  ],
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../src/$1',
    '^@tools/(.*)$': '<rootDir>/../../src/talk_to_figma_mcp/tools/$1',
    '^@utils/(.*)$': '<rootDir>/../../src/talk_to_figma_mcp/utils/$1',
    '^@tests/(.*)$': '<rootDir>/../../tests/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/../../tests/setup.ts',
    '<rootDir>/../setup/tools-setup.ts'
  ],
  
  // Test timeout for complex tool operations
  testTimeout: 15000,
  
  // Verbose output for detailed testing information
  verbose: true,
  
  // ES modules support
  extensionsToTreatAsEsm: ['.ts'],
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Performance optimization
  maxWorkers: '50%',
  
  // Test result processor for better reporting
  testResultsProcessor: '<rootDir>/../utils/test-results-processor.js'
}; 