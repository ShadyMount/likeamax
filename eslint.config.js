import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier/flat'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
    globalIgnores(['dist/**', '.local/**', '.npm-cache/**', '.vercel/**']),
    {
        files: ['**/*.{js,mjs}'],
        extends: [js.configs.recommended],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: { 'react-hooks': reactHooks },
        rules: {
            '@typescript-eslint/no-deprecated': 'error',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'error',
        },
    },
    {
        files: ['tests/**/*.mjs'],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
    },
    prettier,
])
