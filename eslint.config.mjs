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
      '@typescript-eslint': tseslint.plugin,
      '@stylistic': stylistic,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',

      // Stylistic：由 .prettierrc.json 迁移的格式设置
      '@stylistic/indent': ['error', 2], // tabWidth: 2
      // semi: false（行首以 [ 或 ( 开头时，按 Prettier 习惯补前导分号）
      '@stylistic/semi': [
        'error',
        'never',
        { beforeStatementContinuationChars: 'always' },
      ],
      // singleQuote: true（允许转义例外与模板字符串）
      '@stylistic/quotes': [
        'error',
        'single',
        { avoidEscape: true, allowTemplateLiterals: 'always' },
      ],
      // trailingComma: 'all'（多行时数组、对象、import/export、函数参数均要尾逗号）
      '@stylistic/comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'always-multiline',
        },
      ],
      // 类型字面量/接口的成员分隔符：统一用逗号；
      // 多行时最后一个成员后也必须有逗号，单行时不要求
      '@stylistic/member-delimiter-style': [
        'error',
        {
          multiline: { delimiter: 'comma', requireLast: true },
          singleline: { delimiter: 'comma', requireLast: false },
        },
      ],
      '@stylistic/arrow-parens': ['error', 'always'], // arrowParens: 'always'
      '@stylistic/linebreak-style': ['error', 'unix'], // endOfLine: 'lf'
      // 注：Prettier 的 printWidth: 100 是“换行目标宽度”，
      // ESLint 无等价的自动折行规则（max-len 只报错不折行），故不迁移

      // Stylistic：其余既有规则
      '@stylistic/array-bracket-spacing': ['error', 'always'],
      '@stylistic/object-curly-spacing': ['error', 'always', { "overrides": { 
        TSMappedType: 'always',
        TSEnumBody: 'always',
        TSTypeLiteral: 'always'
      } }],
      // 对象仅在属性数 ≥ 2 时换行，0~1 个属性保持一行
      '@stylistic/object-curly-newline': [
        'error',
        {
          ObjectExpression: { minProperties: 2 },
          ObjectPattern: { minProperties: 2 },
          TSTypeLiteral: { minProperties: 2 },
          TSInterfaceBody: { minProperties: 2 },
        },
      ],
      '@stylistic/arrow-spacing': 'error',
      '@stylistic/block-spacing': 'error',
      '@stylistic/object-property-newline': 'error',
      '@stylistic/type-annotation-spacing': 'error',
      // 数组仅在元素数 ≥ 2 时换行，0~1 个元素保持一行
      '@stylistic/array-bracket-newline': ['error', { minItems: 2 }],
      '@stylistic/array-element-newline': ['error', { minItems: 2 }],
      '@stylistic/keyword-spacing': ['error', { before: true, after: true }],
      '@stylistic/key-spacing': ['error', { beforeColon: false }],
      // 中缀运算符两侧必须有空格（a + b、x = 1、a ? b : c 等）
      '@stylistic/space-infix-ops': 'error',
      // 禁止行尾多余空格（原 Prettier 默认行为，可自动修复）
      '@stylistic/no-trailing-spaces': 'error',
    },
  },
)
