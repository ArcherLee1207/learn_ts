// ESLint flat config（ESLint 9+ / 10）
// 由已废弃的 tslint.json 迁移：tslint 不兼容 TypeScript 7，官方迁移方向为 typescript-eslint
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

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
            '@stylistic': stylistic,
        },
        rules: {
            '@stylistic/semi': 'off',
            '@stylistic/array-bracket-newline': ['error', 'always'],
            '@stylistic/comma-dangle': ['error', 'always-multiline'],
        },
    },
)
