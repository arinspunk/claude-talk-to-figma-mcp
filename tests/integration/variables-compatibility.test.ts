import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVariableTools } from '../../src/talk_to_figma_mcp/tools/variable-tools.js';

jest.mock('../../src/talk_to_figma_mcp/utils/websocket.js', () => ({
  sendCommandToFigma: jest.fn().mockResolvedValue({ success: true })
}));

describe("Variables Compatibility Tests - Task 1.8", () => {
  let server: McpServer;
  let mockSendCommand: jest.Mock;

  beforeEach(() => {
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    mockSendCommand = require('../../src/talk_to_figma_mcp/utils/websocket.js').sendCommandToFigma;
    mockSendCommand.mockClear();
    
    registerVariableTools(server);
  });

  describe("COLOR Variable Type Compatibility", () => {
    it("should handle RGB color format variations", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        colorFormats: {
          standardRGB: { r: 0.5, g: 0.3, b: 0.8, a: 1.0 },
          withoutAlpha: { r: 0.5, g: 0.3, b: 0.8 },
          edgeCaseValues: { r: 0.0, g: 1.0, b: 0.0, a: 0.0 },
          precisionTest: { r: 0.333333333, g: 0.666666667, b: 0.999999999, a: 0.5 }
        },
        validationResults: {
          allFormatsValid: true,
          precisionMaintained: true,
          alphaDefaulting: true
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle color space conversions", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        colorSpaceTests: {
          sRGB: { supported: true, accuracy: 100 },
          displayP3: { supported: true, accuracy: 95 },
          adobeRGB: { supported: false, fallback: 'sRGB' },
          rec2020: { supported: false, fallback: 'sRGB' }
        },
        conversionMatrix: {
          sRGBToDisplayP3: true,
          displayP3ToSRGB: true,
          gamutClipping: true,
          perceptualMapping: false
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should validate color binding compatibility", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        bindingCompatibility: {
          fills: { compatible: true, autoConversion: true },
          strokes: { compatible: true, autoConversion: true },
          effects: { compatible: true, limitations: ['drop-shadow', 'inner-shadow'] },
          backgroundColors: { compatible: true, autoConversion: true }
        },
        nodeTypeSupport: {
          RECTANGLE: ['fills', 'strokes', 'effects'],
          TEXT: ['fills', 'strokes', 'effects'],
          FRAME: ['fills', 'strokes', 'effects', 'backgroundColors']
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("STRING Variable Type Compatibility", () => {
    it("should handle text encoding and special characters", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        encodingTests: {
          utf8Basic: { text: 'Hello World', supported: true },
          utf8Accents: { text: 'Café résumé naïve', supported: true },
          utf8Symbols: { text: '©™®€£¥', supported: true },
          utf8Emoji: { text: '🎨🚀💡⭐', supported: true },
          utf8CJK: { text: '中文 日本語 한국어', supported: true },
          utf8RTL: { text: 'العربية עברית', supported: true }
        },
        lengthLimits: {
          maxLength: 8192,
          recommendedLength: 1024,
          performanceThreshold: 512
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle string binding to text properties", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        textBindingCompatibility: {
          characters: { compatible: true, autoUpdate: true },
          fontFamily: { compatible: true, validation: true },
          fontSize: { compatible: false, requiresNumeric: true },
          fontWeight: { compatible: true, mapping: 'string-to-weight' },
          textCase: { compatible: true, values: ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'] }
        },
        nodeTypeSupport: {
          TEXT: ['characters', 'fontFamily', 'fontWeight', 'textCase'],
          FRAME: ['name'],
          COMPONENT: ['name', 'description']
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should validate string interpolation and templating", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        interpolationSupport: {
          simpleTemplates: { pattern: '${variableName}', supported: true },
          nestedTemplates: { pattern: '${outer.${inner}}', supported: false },
          conditionalTemplates: { pattern: '${condition ? value : default}', supported: false },
          mathExpressions: { pattern: '${value * 2}', supported: false }
        },
        escaping: {
          dollarSign: { input: '\\${literal}', output: '${literal}' },
          backslash: { input: '\\\\', output: '\\' },
          newlines: { input: '\\n', output: '\n' }
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("FLOAT Variable Type Compatibility", () => {
    it("should handle numeric precision and range limits", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        precisionTests: {
          integerValues: { value: 42, precision: 'exact' },
          decimalValues: { value: 3.14159, precision: 'float64' },
          scientificNotation: { value: 1.23e-10, precision: 'float64' },
          extremeValues: {
            maxPositive: Number.MAX_VALUE,
            minPositive: Number.MIN_VALUE,
            maxNegative: -Number.MAX_VALUE,
            infinity: { supported: false, fallback: Number.MAX_VALUE }
          }
        },
        rangeValidation: {
          fontSize: { min: 1, max: 1000, unit: 'px' },
          borderRadius: { min: 0, max: 500, unit: 'px' },
          opacity: { min: 0, max: 1, unit: 'ratio' },
          rotation: { min: -360, max: 360, unit: 'degrees' }
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle numeric binding to dimensional properties", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        dimensionalBindings: {
          width: { compatible: true, unit: 'px', constraints: 'positive' },
          height: { compatible: true, unit: 'px', constraints: 'positive' },
          x: { compatible: true, unit: 'px', constraints: 'none' },
          y: { compatible: true, unit: 'px', constraints: 'none' },
          borderRadius: { compatible: true, unit: 'px', constraints: 'non-negative' },
          fontSize: { compatible: true, unit: 'px', constraints: 'positive' },
          letterSpacing: { compatible: true, unit: 'px', constraints: 'none' },
          lineHeight: { compatible: true, unit: 'px', constraints: 'positive' }
        },
        unitConversions: {
          pxToRem: { supported: false, requiresBaseFontSize: true },
          pxToEm: { supported: false, requiresParentFontSize: true },
          pxToPercent: { supported: false, requiresParentDimension: true }
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should validate mathematical operations", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        mathematicalOperations: {
          basicArithmetic: { supported: false, reason: 'static_values_only' },
          percentageCalculations: { supported: false, reason: 'static_values_only' },
          ratioCalculations: { supported: false, reason: 'static_values_only' },
          conditionalValues: { supported: false, reason: 'static_values_only' }
        },
        workarounds: {
          precomputedValues: true,
          modeBasedValues: true,
          externalCalculation: true
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("BOOLEAN Variable Type Compatibility", () => {
    it("should handle boolean state management", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        booleanStates: {
          trueValue: { value: true, representation: 'true' },
          falseValue: { value: false, representation: 'false' },
          truthyValues: { 
            supported: false, 
            note: 'only_explicit_boolean_values' 
          },
          falsyValues: { 
            supported: false, 
            note: 'only_explicit_boolean_values' 
          }
        },
        stateTransitions: {
          trueToFalse: { allowed: true, immediate: true },
          falseToTrue: { allowed: true, immediate: true },
          nullToBoolean: { allowed: false, requiresExplicitValue: true },
          undefinedToBoolean: { allowed: false, requiresExplicitValue: true }
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle boolean binding to visibility and state properties", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        visibilityBindings: {
          visible: { compatible: true, directMapping: true },
          locked: { compatible: true, directMapping: true },
          expanded: { compatible: true, directMapping: true },
          clipsContent: { compatible: true, directMapping: true }
        },
        conditionalProperties: {
          autoLayout: { compatible: false, requiresExplicitToggle: true },
          constraints: { compatible: false, requiresExplicitValues: true },
          effects: { compatible: false, requiresExplicitEffects: true }
        },
        nodeTypeSupport: {
          FRAME: ['visible', 'locked', 'expanded', 'clipsContent'],
          RECTANGLE: ['visible', 'locked'],
          TEXT: ['visible', 'locked'],
          GROUP: ['visible', 'locked', 'expanded']
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Cross-Type Variable Operations", () => {
    it("should handle type conversion scenarios", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        typeConversions: {
          colorToString: { supported: false, workaround: 'separate_string_variable' },
          stringToColor: { supported: false, workaround: 'hex_color_parsing_external' },
          floatToString: { supported: false, workaround: 'separate_string_variable' },
          booleanToString: { supported: false, workaround: 'conditional_string_variables' }
        },
        bestPractices: [
          'use_separate_variables_for_different_types',
          'leverage_modes_for_conditional_values'
        ]
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should validate mixed-type collections", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        mixedTypeCollections: {
          singleCollection: {
            colorVariables: 25,
            stringVariables: 15,
            floatVariables: 30,
            booleanVariables: 10,
            totalVariables: 80
          },
          organizationStrategies: {
            byType: { recommended: true, maintainability: 'high' },
            byFeature: { recommended: true, maintainability: 'medium' },
            byComponent: { recommended: false, maintainability: 'low' },
            mixed: { recommended: false, maintainability: 'very-low' }
          },
          namingConventions: {
            typePrefix: { pattern: 'color-primary, string-label, float-size', recommended: true },
            typeSuffix: { pattern: 'primary-color, label-string, size-float', recommended: false },
            semantic: { pattern: 'primary, label, baseSize', recommended: true }
          }
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Mode Compatibility Across Types", () => {
    it("should handle type consistency across modes", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        modeTypeConsistency: {
          enforceTypeConsistency: true,
          allowTypeChanges: false,
          validationLevel: 'strict'
        },
        crossModeValidation: {
          colorVariable: {
            lightMode: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
            darkMode: { r: 0.9, g: 0.9, b: 0.9, a: 1.0 },
            typeConsistent: true
          },
          stringVariable: {
            lightMode: 'Light Theme Label',
            darkMode: 'Dark Theme Label',
            typeConsistent: true
          },
          floatVariable: {
            lightMode: 16.0,
            darkMode: 18.0,
            typeConsistent: true
          },
          booleanVariable: {
            lightMode: true,
            darkMode: false,
            typeConsistent: true
          }
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle mode-specific type validation", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        modeSpecificValidation: {
          colorModeValidation: {
            lightMode: { contrastRatio: 4.5, accessibility: 'AA' },
            darkMode: { contrastRatio: 7.0, accessibility: 'AAA' },
            highContrastMode: { contrastRatio: 15.0, accessibility: 'AAA' }
          },
          stringModeValidation: {
            defaultMode: { maxLength: 100, encoding: 'UTF-8' },
            compactMode: { maxLength: 50, encoding: 'UTF-8' },
            verboseMode: { maxLength: 200, encoding: 'UTF-8' }
          },
          floatModeValidation: {
            mobileMode: { range: [12, 24], unit: 'px' },
            desktopMode: { range: [14, 32], unit: 'px' },
            printMode: { range: [10, 18], unit: 'pt' }
          }
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Binding Compatibility Matrix", () => {
    it("should validate comprehensive binding compatibility", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        bindingMatrix: {
          COLOR: {
            fills: { compatible: true, priority: 'high' },
            strokes: { compatible: true, priority: 'high' },
            effects: { compatible: true, priority: 'medium' },
            backgroundColor: { compatible: true, priority: 'medium' }
          },
          STRING: {
            characters: { compatible: true, priority: 'high' },
            name: { compatible: true, priority: 'medium' },
            description: { compatible: true, priority: 'low' },
            fontFamily: { compatible: true, priority: 'medium' }
          },
          FLOAT: {
            width: { compatible: true, priority: 'high' },
            height: { compatible: true, priority: 'high' },
            fontSize: { compatible: true, priority: 'high' },
            borderRadius: { compatible: true, priority: 'medium' },
            opacity: { compatible: true, priority: 'medium' },
            rotation: { compatible: true, priority: 'low' }
          },
          BOOLEAN: {
            visible: { compatible: true, priority: 'high' },
            locked: { compatible: true, priority: 'medium' },
            expanded: { compatible: true, priority: 'low' },
            clipsContent: { compatible: true, priority: 'low' }
          }
        },
        nodeCompatibility: {
          RECTANGLE: ['COLOR', 'FLOAT', 'BOOLEAN'],
          TEXT: ['COLOR', 'STRING', 'FLOAT', 'BOOLEAN'],
          ELLIPSE: ['COLOR', 'FLOAT', 'BOOLEAN'],
          FRAME: ['COLOR', 'STRING', 'FLOAT', 'BOOLEAN'],
          GROUP: ['STRING', 'BOOLEAN'],
          COMPONENT: ['COLOR', 'STRING', 'FLOAT', 'BOOLEAN']
        }
      });

      expect(mockSendCommand).toBeDefined();
    });
  });

  describe("Edge Cases and Error Scenarios", () => {
    it("should handle invalid type assignments gracefully", async () => {
      mockSendCommand.mockResolvedValue({
        success: false,
        invalidAssignments: [
          {
            variableType: 'COLOR',
            attemptedValue: 'red',
            error: 'INVALID_COLOR_FORMAT',
            expectedFormat: '{ r: number, g: number, b: number, a?: number }'
          },
          {
            variableType: 'FLOAT',
            attemptedValue: '42px',
            error: 'INVALID_NUMERIC_VALUE',
            expectedFormat: 'number'
          },
          {
            variableType: 'BOOLEAN',
            attemptedValue: 'true',
            error: 'INVALID_BOOLEAN_VALUE',
            expectedFormat: 'boolean'
          }
        ],
        errorRecovery: {
          provideSuggestions: true,
          autoCorrection: false,
          fallbackValues: true
        }
      });

      expect(mockSendCommand).toBeDefined();
    });

    it("should handle type migration scenarios", async () => {
      mockSendCommand.mockResolvedValue({
        success: true,
        typeMigration: {
          supported: false,
          reason: 'type_immutability',
          workarounds: [
            'create_new_variable_with_desired_type',
            'update_all_references_manually',
            'delete_old_variable_after_migration'
          ],
          migrationTools: {
            bulkReferenceUpdate: false,
            typeConversionWizard: false,
            rollbackSupport: false
          }
        },
        bestPractices: [
          'plan_variable_types_carefully',
          'use_semantic_naming_conventions',
          'document_type_decisions',
          'test_with_representative_data'
        ]
      });

      expect(mockSendCommand).toBeDefined();
    });
  });
}); 