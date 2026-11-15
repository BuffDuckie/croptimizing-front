import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public/results', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Components and pages never touch the model or the network directly.
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/model', '**/model/*'], message: 'Use the usePlan hook instead of importing the model.' }] },
      ],
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Use the API client via usePlan.' }],
    },
  },
);
