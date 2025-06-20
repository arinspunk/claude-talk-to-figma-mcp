# Testing Structure for Figma Tools

## 📋 Overview

This directory contains the testing infrastructure specifically designed for the new Figma MCP tools. The structure follows TDD principles and provides comprehensive coverage for all tool categories.

## 🏗️ Directory Structure

```
tests/
├── config/
│   └── jest.tools.config.cjs     # Jest configuration for tools
├── mocks/
│   └── websocket-mock.ts         # WebSocket mocking utilities
├── setup/
│   └── tools-setup.ts            # Tools-specific test setup
├── templates/
│   └── tool-test-template.ts     # Reusable test templates
├── utils/
│   └── test-results-processor.js # Enhanced test reporting
├── integration/                  # Integration tests
│   ├── variable-tools.test.ts
│   ├── style-tools.test.ts
│   └── ...
└── unit/                        # Unit tests
    └── tools/
        └── ...
```

## ⚙️ Configuration Files

### Jest Configuration (`tests/config/jest.tools.config.cjs`)

Specialized Jest configuration for tool testing with:

- **Tool-specific test patterns**
- **100% coverage requirements** for new tools
- **Individual tool coverage thresholds**
- **Enhanced reporting** with custom processors
- **Optimized timeouts** for WebSocket operations

### Tools Setup (`tests/setup/tools-setup.ts`)

Provides:

- **Custom Jest matchers** for tool validation
- **Enhanced console logging** for debugging
- **Performance monitoring** for test duration
- **Error handling** for unhandled rejections

## 🔧 WebSocket Mocking

### Mock Scenarios (`tests/mocks/websocket-mock.ts`)

Pre-configured scenarios for testing:

```typescript
import { MockScenarios } from '../mocks/websocket-mock';

// Use specific scenarios
const mock = MockScenarios.variableOperations();
const mock = MockScenarios.networkError();
const mock = MockScenarios.timeout();
```

Available scenarios:
- `success` - Standard successful responses
- `networkError` - Connection failures
- `timeout` - Slow response simulation
- `figmaError` - Figma API errors
- `variableOperations` - Variable-specific responses
- `styleOperations` - Style-specific responses
- `booleanOperations` - Boolean operation responses
- `layoutOperations` - Layout operation responses

## 📝 Test Templates

The tool test template provides standardized testing structure for all new tools following TDD principles.

## 🧪 Writing Tests

### Using the Tool Test Template

For new tools, use the standardized template to ensure consistent testing:

```typescript
// Example test structure for new tools
describe('Tool Name', () => {
  // Tool registration tests
  // Parameter validation tests  
  // Functionality tests
  // Error handling tests
  // Performance tests
});
```

## 📊 Coverage and Reporting

### Coverage Requirements

Each new tool file requires **100% coverage**:
- **Lines**: 100%
- **Functions**: 100%  
- **Branches**: 100%
- **Statements**: 100%

### Enhanced Reporting

Custom test results processor generates detailed reports for tool categories and performance metrics.

## 🚀 Best Practices

1. **Follow TDD** - Write tests before implementation
2. **Use mock scenarios** - Leverage predefined WebSocket mocks
3. **Test all paths** - Cover success, error, and edge cases
4. **Monitor performance** - Ensure tests complete under 5 seconds
5. **Maintain coverage** - Achieve 100% coverage for new tools

## 🔍 Getting Started

1. Review existing test files for patterns
2. Use the tool test template for new tools
3. Configure appropriate mock scenarios
4. Ensure full coverage before implementation
5. Run tests with enhanced reporting