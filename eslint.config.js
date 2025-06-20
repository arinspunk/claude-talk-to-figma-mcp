import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends(
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ),
  
  {
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    
    // Global rules for all TypeScript files
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/prefer-const': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
    },
  },
  
  // Specific rules for tools directory
  {
    files: ['src/talk_to_figma_mcp/tools/**/*.ts'],
    rules: {
      // Strict rules for tools
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      
      // Code quality for tools
      'complexity': ['error', 10], // Max cyclomatic complexity
      'max-lines-per-function': ['error', { max: 50 }],
      'max-depth': ['error', 4],
      'max-params': ['error', 4],
      'no-magic-numbers': ['error', { ignore: [0, 1, -1] }],
      
      // Documentation requirements
      'require-jsdoc': ['error', {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
        },
      }],
      'valid-jsdoc': ['error', {
        requireReturn: true,
        requireParamDescription: true,
        requireReturnDescription: true,
      }],
      
      // Tool-specific patterns
      'prefer-template': 'error',
      'no-duplicate-imports': 'error',
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
    },
  },
  
  // Specific rules for utils directory
  {
    files: ['src/talk_to_figma_mcp/utils/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      'complexity': ['error', 15], // Slightly higher for utilities
      'max-lines-per-function': ['error', { max: 100 }],
      'require-jsdoc': ['error', {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
        },
      }],
    },
  },
  
  // Test files have relaxed rules
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
      'require-jsdoc': 'off',
      'valid-jsdoc': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_|^mock' }],
    },
  },
  
  // Configuration files
  {
    files: ['*.config.js', '*.config.ts', '*.config.cjs'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-console': 'off',
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.js', // Only for generated JS files
      'bun.lock',
    ],
  },
]; 