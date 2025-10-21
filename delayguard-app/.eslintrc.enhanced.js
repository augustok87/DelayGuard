/**
 * Enhanced ESLint Configuration - World-Class Standards
 * 
 * This configuration implements the highest quality standards for:
 * - TypeScript
 * - React
 * - Accessibility
 * - Performance
 * - Security
 * - Code Style
 */

module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },
  extends: [
    // Core ESLint recommendations
    'eslint:recommended',
    
    // TypeScript recommendations
    '@typescript-eslint/recommended',
    
    // React recommendations
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
    
    // Accessibility recommendations
    'plugin:jsx-a11y/recommended',
    
    // Import/Export recommendations
    'plugin:import/recommended',
    'plugin:import/typescript',
    
    // Security recommendations
    'plugin:security/recommended',
    
    // Performance recommendations (commented out due to compatibility issues)
    // 'plugin:react-perf/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'jsx-a11y',
    'import',
    'security',
    'unused-imports',
    'prefer-arrow',
    // 'react-perf', // Commented out due to compatibility issues
  ],
  rules: {
    // ========================================
    // TYPESCRIPT RULES - STRICT MODE
    // ========================================
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/prefer-string-starts-ends-with': 'error',
    '@typescript-eslint/prefer-includes': 'error',
    '@typescript-eslint/prefer-function-type': 'error',
    '@typescript-eslint/prefer-for-of': 'error',
    '@typescript-eslint/prefer-reduce-type-parameter': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-import-type-side-effects': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    // '@typescript-eslint/no-explicit-any' already defined above at line 71
    '@typescript-eslint/no-var-requires': 'error',

    // ========================================
    // REACT RULES - PERFORMANCE & BEST PRACTICES
    // ========================================
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/display-name': 'error',
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'error',
    'react/jsx-key': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/jsx-no-bind': 'error',
    'react/jsx-no-leaked-render': 'error',
    'react/jsx-no-useless-fragment': 'error',
    'react/jsx-pascal-case': 'error',
    'react/jsx-sort-props': ['error', {
      callbacksLast: true,
      shorthandFirst: true,
      noSortAlphabetically: false,
      reservedFirst: true,
    }],
    'react/no-array-index-key': 'error',
    'react/no-danger': 'error',
    'react/no-deprecated': 'error',
    'react/no-direct-mutation-state': 'error',
    'react/no-find-dom-node': 'error',
    'react/no-is-mounted': 'error',
    'react/no-render-return-value': 'error',
    'react/no-string-refs': 'error',
    'react/no-unescaped-entities': 'error',
    'react/no-unknown-property': 'error',
    'react/no-unsafe': 'error',
    'react/require-render-return': 'error',
    'react/self-closing-comp': 'error',
    'react/sort-comp': 'error',
    'react/function-component-definition': ['error', {
      namedComponents: 'arrow-function',
      unnamedComponents: 'arrow-function',
    }],

    // ========================================
    // REACT HOOKS RULES
    // ========================================
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',

    // ========================================
    // ACCESSIBILITY RULES - WCAG 2.1 AA
    // ========================================
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/html-has-lang': 'error',
    'jsx-a11y/img-redundant-alt': 'error',
    'jsx-a11y/no-access-key': 'error',
    'jsx-a11y/no-redundant-roles': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/scope': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',
    'jsx-a11y/label-has-associated-control': 'error',
    'jsx-a11y/media-has-caption': 'error',
    'jsx-a11y/no-autofocus': 'error',
    'jsx-a11y/no-distracting-elements': 'error',
    'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
    'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
    'jsx-a11y/no-noninteractive-tabindex': 'error',
    'jsx-a11y/no-static-element-interactions': 'error',

    // ========================================
    // IMPORT/EXPORT RULES
    // ========================================
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    'import/no-useless-path-segments': 'error',
    'import/no-duplicates': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-default-export': 'error',
    'import/no-named-as-default': 'error',
    'import/no-named-as-default-member': 'error',
    'import/no-unused-modules': 'error',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': ['error', {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'after-used',
      argsIgnorePattern: '^_',
    }],

    // ========================================
    // SECURITY RULES
    // ========================================
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',

    // ========================================
    // PERFORMANCE RULES
    // ========================================
    // 'react/jsx-no-bind' and 'react/jsx-no-leaked-render' already defined above at lines 111-112

    // ========================================
    // CODE STYLE RULES - STRICT
    // ========================================
    'no-console': 'error',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-duplicate-imports': 'error',
    'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'prefer-destructuring': 'error',
    'prefer-spread': 'error',
    'prefer-rest-params': 'error',
    'prefer-object-spread': 'error',
    'object-shorthand': 'error',
    'template-curly-spacing': 'error',
    'arrow-spacing': 'error',
    'comma-dangle': ['error', 'always-multiline'],
    'comma-spacing': 'error',
    'comma-style': 'error',
    'computed-property-spacing': 'error',
    'func-call-spacing': 'error',
    'key-spacing': 'error',
    'keyword-spacing': 'error',
    'object-curly-spacing': ['error', 'always'],
    'semi': ['error', 'always'],
    'semi-spacing': 'error',
    'space-before-blocks': 'error',
    'space-before-function-paren': ['error', 'never'],
    'space-in-parens': 'error',
    'space-infix-ops': 'error',
    'space-unary-ops': 'error',
    'spaced-comment': 'error',
    'quotes': ['error', 'single', { avoidEscape: true }],
    'quote-props': ['error', 'as-needed'],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'max-len': ['error', {
      code: 100,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
    }],
    'max-lines': ['error', {
      max: 300,
      skipBlankLines: true,
      skipComments: true,
    }],
    'max-lines-per-function': ['error', {
      max: 50,
      skipBlankLines: true,
      skipComments: true,
    }],
    'complexity': ['error', 10],
    'cyclomatic-complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-params': ['error', 4],
    'max-statements': ['error', 20],
    'no-magic-numbers': ['error', {
      ignore: [0, 1, -1],
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true,
    }],
    'no-nested-ternary': 'error',
    'no-unneeded-ternary': 'error',
    'no-else-return': 'error',
    'no-return-assign': 'error',
    'no-return-await': 'error',
    'no-throw-literal': 'error',
    'no-useless-return': 'error',
    'no-useless-concat': 'error',
    'no-useless-escape': 'error',
    'no-useless-rename': 'error',
    'no-void': 'error',
    'no-with': 'error',
    'prefer-arrow/prefer-arrow-functions': ['error', {
      disallowPrototype: true,
      singleReturnOnly: false,
      classPropertiesAllowed: false,
    }],

    // ========================================
    // SORTING RULES
    // ========================================
    // 'import/order' already defined above at line 177
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    'public/',
    '*.config.js',
    '*.config.ts',
    'scripts/',
    'build/',
    '.next/',
    'out/',
  ],
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/tests/**/*.ts', '**/tests/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-magic-numbers': 'off',
        'max-lines-per-function': 'off',
        'max-statements': 'off',
        'complexity': 'off',
        'cyclomatic-complexity': 'off',
        'no-console': 'off', // Allow console in tests for debugging
        'react/display-name': 'off', // Test components don't need display names
      },
    },
    {
      files: ['*.config.js', '*.config.ts', 'webpack.*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
      },
    },
    {
      files: ['**/logger.ts', '**/utils/logger.ts', '**/api/logger.ts'],
      rules: {
        'no-console': 'off', // Logger utilities need console access
      },
    },
  ],
};
