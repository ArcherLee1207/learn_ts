// ESLint flat config（ESLint 9+ / 10）
// 由已废弃的 tslint.json 迁移：tslint 不兼容 TypeScript 7，官方迁移方向为 typescript-eslint
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  // tslint.json 原本没有忽略配置；这里仅忽略编译产物
  {
    ignores: ['dist/**'],
  },

  // 对应原 "extends": ["tslint:recommended"]
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@stylistic': stylistic,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',

      // Stylistic
      '@stylistic/array-bracket-spacing': ['error', 'always'],
      '@stylistic/object-curly-newline': [
        'error',
        {
          ObjectExpression: 'always',
          ObjectPattern: 'always',
        },
      ],
      '@stylistic/arrow-spacing': 'error',
      '@stylistic/block-spacing': 'error',
      '@stylistic/object-property-newline': 'error',
      '@stylistic/type-annotation-spacing': 'error',
      '@stylistic/array-bracket-newline': ['error', 'always'],
      '@stylistic/array-element-newline': ['error', 'always'],
      '@stylistic/keyword-spacing': ['error', { before: true, after: true }],
      '@stylistic/key-spacing': ['error', { beforeColon: false }],
    },
  },
);
