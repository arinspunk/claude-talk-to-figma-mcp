/**
 * Tools-specific test setup
 * This file configures the testing environment for new Figma tools
 */

import { jest } from '@jest/globals';

/**
 * Enhanced console methods for test debugging
 */
const originalConsole = global.console;

beforeEach(() => {
  // Reset console between tests but keep functionality for debugging
  global.console = {
    ...originalConsole,
    // Suppress info logs in tests unless explicitly enabled
    info: process.env.TEST_VERBOSE ? originalConsole.info : jest.fn(),
    // Keep error and warn for debugging
    error: originalConsole.error,
    warn: originalConsole.warn,
    log: process.env.TEST_VERBOSE ? originalConsole.log : jest.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
});

/**
 * Global test utilities for tools
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidZodSchema(): R;
      toHaveValidToolResponse(): R;
      toCallWebSocketWithCommand(command: string, params?: any): R;
    }
  }
}

/**
 * Custom Jest matchers for tool testing
 */
expect.extend({
  /**
   * Validates that a Zod schema is properly structured for MCP tools
   */
  toHaveValidZodSchema(received) {
    const pass = received && 
      typeof received === 'object' && 
      typeof received.parse === 'function' &&
      typeof received.safeParse === 'function';
    
    if (pass) {
      return {
        message: () => `Expected schema to NOT be a valid Zod schema`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected a valid Zod schema with parse() and safeParse() methods`,
        pass: false,
      };
    }
  },

  /**
   * Validates MCP tool response format
   */
  toHaveValidToolResponse(received) {
    const hasValidStructure = received &&
      received.content &&
      Array.isArray(received.content) &&
      received.content.length > 0 &&
      received.content.every((item: any) => 
        item.type === 'text' && typeof item.text === 'string'
      );

    if (hasValidStructure) {
      return {
        message: () => `Expected response to NOT have valid MCP tool format`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected response to have valid MCP tool format: { content: [{ type: 'text', text: string }] }`,
        pass: false,
      };
    }
  },

  /**
   * Validates WebSocket command calls
   */
  toCallWebSocketWithCommand(mockSendCommand, expectedCommand, expectedParams?) {
    const calls = mockSendCommand.mock.calls;
    
    if (calls.length === 0) {
      return {
        message: () => `Expected WebSocket to be called with command "${expectedCommand}", but it was not called`,
        pass: false,
      };
    }

    const lastCall = calls[calls.length - 1];
    const [actualCommand, actualParams] = lastCall;

    const commandMatches = actualCommand === expectedCommand;
    const paramsMatch = expectedParams ? 
      JSON.stringify(actualParams) === JSON.stringify(expectedParams) : 
      true;

    if (commandMatches && paramsMatch) {
      return {
        message: () => `Expected WebSocket to NOT be called with command "${expectedCommand}"`,
        pass: true,
      };
    } else {
      return {
        message: () => {
          let msg = `Expected WebSocket to be called with command "${expectedCommand}", but got "${actualCommand}"`;
          if (expectedParams && !paramsMatch) {
            msg += `\nExpected params: ${JSON.stringify(expectedParams)}\nActual params: ${JSON.stringify(actualParams)}`;
          }
          return msg;
        },
        pass: false,
      };
    }
  },
});

/**
 * Global error handlers for better test debugging
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

/**
 * Test environment validation
 */
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

/**
 * Performance monitoring for tests
 */
const testStartTimes = new Map();

beforeEach(() => {
  const testName = expect.getState().currentTestName;
  if (testName) {
    testStartTimes.set(testName, Date.now());
  }
});

afterEach(() => {
  const testName = expect.getState().currentTestName;
  if (testName && testStartTimes.has(testName)) {
    const duration = Date.now() - testStartTimes.get(testName);
    if (duration > 5000) { // Warn for tests taking longer than 5 seconds
      console.warn(`⚠️  Test "${testName}" took ${duration}ms`);
    }
    testStartTimes.delete(testName);
  }
});

export {}; 