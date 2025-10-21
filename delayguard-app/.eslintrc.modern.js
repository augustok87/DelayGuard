/**
 * Modern ESLint Configuration - Practical World-Class Standards
 * 
 * This configuration implements practical, high-quality standards for:
 * - TypeScript
 * - React
 * - Accessibility
 * - Security
 * - Code Style
 * 
 * Focuses on the most impactful rules while maintaining developer productivity.
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
  ],
  rules: {
    // ========================================
    // TYPESCRIPT RULES - PRACTICAL STRICT
    // ========================================
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn', // Start with warning, not error
    '@typescript-eslint/no-non-null-assertion': 'warn', // Start with warning
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/prefer-readonly': 'warn',
    '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
    '@typescript-eslint/prefer-includes': 'warn',
    '@typescript-eslint/prefer-function-type': 'warn',
    '@typescript-eslint/prefer-for-of': 'warn',
    '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off', // Too strict for practical use
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Too strict for practical use
    '@typescript-eslint/no-var-requires': 'error',

    // ========================================
    // REACT RULES - PRACTICAL PERFORMANCE
    // ========================================
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/display-name': 'warn', // Start with warning
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'error',
    'react/jsx-key': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/jsx-no-bind': 'warn', // Start with warning
    'react/jsx-no-leaked-render': 'warn',
    'react/jsx-no-useless-fragment': 'warn',
    'react/jsx-pascal-case': 'error',
    'react/jsx-sort-props': 'off', // Too strict for practical use
    'react/no-array-index-key': 'warn', // Start with warning
    'react/no-danger': 'warn',
    'react/no-deprecated': 'error',
    'react/no-direct-mutation-state': 'error',
    'react/no-find-dom-node': 'error',
    'react/no-is-mounted': 'error',
    'react/no-render-return-value': 'error',
    'react/no-string-refs': 'error',
    'react/no-unescaped-entities': 'error',
    'react/no-unknown-property': 'error',
    'react/no-unsafe': 'warn',
    'react/require-render-return': 'error',
    'react/self-closing-comp': 'warn',
    'react/sort-comp': 'off', // Too strict for practical use
    'react/function-component-definition': 'off', // Too strict for practical use

    // ========================================
    // REACT HOOKS RULES
    // ========================================
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn', // Start with warning

    // ========================================
    // ACCESSIBILITY RULES - WCAG 2.1 AA
    // ========================================
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/click-events-have-key-events': 'warn', // Start with warning
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/html-has-lang': 'error',
    'jsx-a11y/img-redundant-alt': 'error',
    'jsx-a11y/no-access-key': 'error',
    'jsx-a11y/no-redundant-roles': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/scope': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',
    'jsx-a11y/label-has-associated-control': 'warn', // Start with warning
    'jsx-a11y/media-has-caption': 'warn',
    'jsx-a11y/no-autofocus': 'warn',
    'jsx-a11y/no-distracting-elements': 'warn',
    'jsx-a11y/no-interactive-element-to-noninteractive-role': 'warn',
    'jsx-a11y/no-noninteractive-element-to-interactive-role': 'warn',
    'jsx-a11y/no-noninteractive-tabindex': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',

    // ========================================
    // IMPORT/EXPORT RULES - PRACTICAL
    // ========================================
    'import/order': ['warn', {
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
    'import/no-unresolved': 'warn', // Start with warning
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    'import/no-useless-path-segments': 'warn',
    'import/no-duplicates': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'warn',
    'import/no-default-export': 'off', // Too strict for practical use
    'import/no-named-as-default': 'warn',
    'import/no-named-as-default-member': 'warn',
    'import/no-unused-modules': 'off', // Too strict for practical use
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': ['error', {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'after-used',
      argsIgnorePattern: '^_',
    }],

    // ========================================
    // SECURITY RULES - CRITICAL ONLY
    // ========================================
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',

    // ========================================
    // CODE STYLE RULES - PRACTICAL
    // ========================================
    'no-console': 'warn', // Start with warning, not error
    'no-debugger': 'error',
    'no-alert': 'warn',
    'no-duplicate-imports': 'error',
    'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'warn',
    'prefer-template': 'warn',
    'prefer-destructuring': 'warn',
    'prefer-spread': 'warn',
    'prefer-rest-params': 'warn',
    'prefer-object-spread': 'warn',
    'object-shorthand': 'warn',
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
    'spaced-comment': 'warn',
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'quote-props': ['warn', 'as-needed'],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'max-len': ['warn', {
      code: 120, // Increased from 100 for practical use
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
    }],
    'max-lines': ['warn', {
      max: 500, // Increased from 300 for practical use
      skipBlankLines: true,
      skipComments: true,
    }],
    'max-lines-per-function': ['warn', {
      max: 100, // Increased from 50 for practical use
      skipBlankLines: true,
      skipComments: true,
    }],
    'complexity': ['warn', 15], // Increased from 10 for practical use
    'cyclomatic-complexity': ['warn', 15],
    'max-depth': ['warn', 6], // Increased from 4 for practical use
    'max-params': ['warn', 6], // Increased from 4 for practical use
    'max-statements': ['warn', 30], // Increased from 20 for practical use
    'no-magic-numbers': 'off', // Too strict for practical use
    'no-nested-ternary': 'warn',
    'no-unneeded-ternary': 'warn',
    'no-else-return': 'warn',
    'no-return-assign': 'error',
    'no-return-await': 'warn',
    'no-throw-literal': 'error',
    'no-useless-return': 'warn',
    'no-useless-concat': 'warn',
    'no-useless-escape': 'warn',
    'no-useless-rename': 'warn',
    'no-void': 'warn',
    'no-with': 'error',
    'prefer-arrow/prefer-arrow-functions': ['warn', {
      disallowPrototype: true,
      singleReturnOnly: false,
      classPropertiesAllowed: false,
    }],
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
      files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-magic-numbers': 'off',
        'max-lines-per-function': 'off',
        'max-statements': 'off',
        'complexity': 'off',
        'cyclomatic-complexity': 'off',
        'no-console': 'off', // Allow console in tests
      },
    },
    {
      files: ['*.config.js', '*.config.ts', 'webpack.*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
        'import/no-default-export': 'off',
      },
    },
  ],
};
