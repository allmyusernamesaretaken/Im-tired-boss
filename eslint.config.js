import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/', 'web-ext-artifacts/', 'node_modules/'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Allow `const { omitted: _x, ...rest } = obj` to drop fields.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Build and config scripts are plain Node files outside the TypeScript project.
    files: ['*.js', '*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
);
