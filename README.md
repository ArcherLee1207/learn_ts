# 从零搭建 Node.js + TypeScript 7 + ESLint 项目指南

本文件记录了 `learn_ts` 项目从零到当前结构的完整搭建步骤，包含每一步的原因和踩坑经验。

---

## 目录结构总览

```
learn_ts/
├── .idea/                  # WebStorm 项目配置（被 .gitignore 忽略）
├── src/
│   └── index.ts            # 入口源码
├── .env                    # 环境变量（由 dotenv 读取）
├── .gitignore
├── eslint.config.mjs       # ESLint flat config（格式化规则也全部在这里）
├── tsconfig.json           # TypeScript 编译配置
├── package.json            # 依赖与脚本
├── package-lock.json       # 依赖锁定文件，需要提交到 git
└── README.md               # 本文件
```

---

## 第 1 步：初始化项目

```bash
mkdir learn_ts && cd learn_ts
npm init -y
```

创建源码目录和入口文件：

```bash
mkdir src
```

`src/index.ts` 初始内容：

```typescript
const greet = (name: string): string => `Hello, ${name}`
console.log(greet('TypeScript'))
```

---

## 第 2 步：安装 TypeScript 7（原生 Go 编译器）

TypeScript 7.0 于 2026-07-08 发布 GA，是原生 Go 重写版本，比 5.x 快约 10 倍。

```bash
npm install -D typescript
```

安装后 `npx tsc --version` 应显示 `7.0.2`。

### 关键注意：TS 7 不提供编程 API

TS 7.0 **不提供编程用 Compiler API**（`ts.ScriptTarget`、`ts.sys` 等全部为 `undefined`），推迟到 7.1。这导致所有依赖该 API
的工具（TSLint、typescript-eslint 等）在 TS 7 下直接崩溃。

官方解决方案是 **双 npm 别名**：让工具看到 TS 6 API 垫片，同时保留 TS 7 的 `tsc`
二进制。详见 [第 5 步](#第-5-步迁移到-eslint必读ts-7-兼容方案)。

---

## 第 3 步：配置 tsconfig.json

当前配置（带注释，TS 的 JSON 支持注释）：

```jsonc
{
  // Visit https://aka.ms/tsconfig to read more about this file
  "compilerOptions": {
    // File Layout
    // "rootDir": "./src",
    // "outDir": "./dist",

    // Environment Settings
    // See also https://aka.ms/tsconfig/module
    "module": "esnext",
    "target": "esnext",
    "types": [],
    // For nodejs:
    // "lib": ["esnext"],
    // "types": ["node"],
    // and npm install -D @types/node

    // Other Outputs
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    // Stricter Typechecking Options
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    // Style Options
    // "noImplicitReturns": true,
    // "noImplicitOverride": true,
    // "noUnusedLocals": true,
    // "noUnusedParameters": true,
    // "noFallthroughCasesInSwitch": true,
    // "noPropertyAccessFromIndexSignature": true,

    // Recommended Options
    "strict": true,
    "jsx": "react-jsx",
    "verbatimModuleSyntax": false,
    "isolatedModules": false,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "auto",
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

关键选项说明：

| 选项                             | 作用                                    |
| -------------------------------- | --------------------------------------- |
| `strict: true`                   | 开启所有严格类型检查                    |
| `module: "esnext"`               | 输出最新 ESM 语法（最初为 `nodenext`，实验中调整） |
| `target: "esnext"`               | 编译到最新 ES 标准                      |
| `verbatimModuleSyntax: false`    | 不强制保留类型导入语法（最初为 `true`，实验中关闭） |
| `isolatedModules: false`         | 不强制单文件独立编译（最初为 `true`，实验中关闭） |
| `noUncheckedIndexedAccess: true` | 索引访问结果自动加 `undefined`          |
| `exactOptionalPropertyTypes: true` | 可选属性不自动包含 `undefined`，要显式写 `c?: string \| undefined` 才能赋 `undefined` |
| `skipLibCheck: true`             | 跳过 `.d.ts` 类型检查以加速编译         |

---

## 第 4 步：安装开发工具链

```bash
npm install -D tsx npm-run-all @types/node
```

| 包            | 用途                                               |
| ------------- | -------------------------------------------------- |
| `tsx`         | 直接运行 `.ts` 文件，无需预编译；支持 `watch` 模式 |
| `npm-run-all` | 并行/串行运行多个 npm scripts                      |
| `@types/node` | Node.js 类型声明                                   |

在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:run dev:typecheck dev:lint",
    "dev:run": "tsx watch src/index.ts",
    "dev:typecheck": "tsc --noEmit --watch",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "build": "tsc",
    "serve": "node dist/index.js"
  }
}
```

`npm run dev` 并行执行：

- `dev:run`：tsx 监听文件变化并重新运行
- `dev:typecheck`：tsc 监听并做类型检查（不产出文件）
- `dev:lint`：ESLint 监听并自动修复（见第 6 步）

---

## 第 5 步：迁移到 ESLint（必读：TS 7 兼容方案）

### 背景：为什么不能用 TSLint

项目最初使用 TSLint（`tslint.json`），但 TSLint 5.20.1 是 2019 年的最后一版，已停止维护。它在 TS 7 下直接崩溃：

```
TypeError: Cannot read properties of undefined (reading 'ES5')
```

原因：TS 7 的 `require("typescript")` 只导出 `version` 和 `versionMajorMinor`，`ts.ScriptTarget` 等全为 `undefined`。

### 官方双别名方案

参考 [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)，使用两个 npm 别名：

```bash
# 1. 将 typescript 替换为 TS6 API 垫片（供 eslint 等工具使用）
npm install -D "typescript@npm:@typescript/typescript6@^6.0.2"

# 2. 用另一个别名保留 TS 7 的 tsc 二进制
npm install -D "@typescript/native@npm:typescript@^7.0.2"
```

安装后 `package.json` 的 `devDependencies` 中：

```json
{
  "@typescript/native": "npm:typescript@^7.0.2",
  "typescript": "npm:@typescript/typescript6@^6.0.2"
}
```

验证分工：

- `npx tsc --version` → `Version 7.0.2`（来自 `@typescript/native`，走 TS 7 原生 Go 编译器）
- `node -e "require('typescript').version"` → `6.0.3`（来自垫片，供 ESLint 等工具使用）

### 安装 ESLint 工具链

```bash
npm install -D eslint @eslint/js typescript-eslint @stylistic/eslint-plugin
```

| 包                         | 用途                            |
| -------------------------- | ------------------------------- |
| `eslint`                   | ESLint 10，flat config 原生支持 |
| `@eslint/js`               | ESLint 官方 recommended 规则集  |
| `typescript-eslint`        | TS parser + TS 专用规则         |
| `@stylistic/eslint-plugin` | 代码风格规则（分号、尾逗号等）  |

### 创建 eslint.config.mjs（最初版本）

```javascript
// ESLint flat config（ESLint 9+ / 10）
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

export default tseslint.config(
  {
    ignores: ['dist/**'],
  },

  // 对应原 tslint:recommended
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/semi': 'off', // 不强制分号
      '@stylistic/array-bracket-newline': ['error', 'always'], // 数组 [ 后 ] 前必须换行
      '@stylistic/comma-dangle': ['error', 'always-multiline'], // 多行尾逗号必须
    },
  },
)
```

> **踩坑**：`@stylistic/array-bracket-newline` 的值必须写成 `['error', 'always']`，不能只写 `"always"`。ESLint 规则格式是
> `['severity', 'options']`，如果只传一个字符串，ESLint 会把它当严重级别解析，导致启动崩溃，**所有规则都不生效**。
>
> 注：该规则在[第 9 步](#第-9-步移除-prettier格式化统一收归-eslint最新状态)调整为 `{ minItems: 2 }`，完整配置也以第 9 步为准。

### 删除 tslint.json

```bash
rm tslint.json
```

### 添加 lint 脚本

在 `package.json` 的 `scripts` 中：

```json
{
  "lint": "eslint ."
}
```

---

## 第 6 步：文件监听自动修复（onchange）

`eslint-watch` 不兼容 ESLint 10（peer 依赖限制 `eslint >=8 <9`），改用轻量的 `onchange`：

```bash
npm install -D onchange
```

在 `package.json` 中添加：

```json
{
  "dev:lint": "onchange \"src/**/*.ts\" -- eslint . --fix"
}
```

效果：`npm run dev` 启动后，每次保存 `.ts` 文件，`onchange` 自动触发 `eslint . --fix`，自动修复可修复的问题（如补尾逗号、
`let` → `const` 等）。

---

## 第 7 步：使用 dotenv 管理环境变量

安装运行时依赖 `dotenv`（不加 `-D`，上线运行时也需要）：

```bash
npm install dotenv
```

在项目根目录创建 `.env` 文件：

```ini
AUTHOR=ArcherLee
```

在入口文件**最顶部**通过副作用导入加载配置，之后即可从 `process.env` 读取：

```typescript
import 'dotenv/config'

console.log(process.env.AUTHOR) // 拿变量 AUTHOR
```

> 提示：本项目的 `.env` 只含非敏感的 `AUTHOR`，所以直接提交进了 git。真实项目中 `.env` 通常包含密码、密钥等敏感信息，
> 应把 `.env` 加入 `.gitignore`，改为提交一份 `.env.example` 模板。

---

## 第 8 步：引入 Prettier（一段弯路，后已移除）

这一步曾用来与 ESLint 分工：Prettier 管格式、ESLint 管代码质量。

```bash
npm install -D prettier eslint-config-prettier
```

- `eslint-config-prettier`：关闭 ESLint 中所有与 Prettier 冲突的格式规则
- `.prettierrc.json` 当时的内容：

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- `.prettierignore`：忽略 `node_modules`、`dist`、`package-lock.json` 等
- 脚本：`"format": "prettier --write ."`、`"format:check": "prettier --check ."`，并把 `format` 加进了 `dev` 并行任务

### 为什么又移除了

实际使用中发现 `@stylistic` 的格式规则比 Prettier **更细化、更可控**，而两套格式化工具并存时，保存文件触发的
`eslint --fix` 与 Prettier 会**反复互相覆盖**（典型如分号：Prettier 要加分号、ESLint 风格是无分号），文件在两种格式间
来回横跳。最终决定：**一个项目只保留一个格式化工具**，格式化全部交给 ESLint `@stylistic`。

---

## 第 9 步：移除 Prettier，格式化统一收归 ESLint（最新状态）

对应提交：`refactor: 迁移 Prettier 配置到 ESLint 并移除 Prettier 依赖`。

### 9.1 卸载并删除配置文件

```bash
npm remove prettier eslint-config-prettier
rm .prettierrc.json .prettierignore
```

### 9.2 Prettier 选项 → @stylistic 规则迁移对照

| Prettier 选项                | 迁移后的 @stylistic 规则                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `tabWidth: 2`                | `'@stylistic/indent': ['error', 2]`                                                      |
| `semi: true`                 | `'@stylistic/semi': ['error', 'never', { beforeStatementContinuationChars: 'always' }]`。迁移时乘势统一为项目原本的**无分号**风格；当行首是 `[` 或 `(` 时自动补前导分号，防止与上一行连成表达式 |
| `singleQuote: true`          | `'@stylistic/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: 'always' }]` |
| `trailingComma: 'all'`       | `'@stylistic/comma-dangle'` 的**对象形式**，`arrays`/`objects`/`imports`/`exports`/`functions` 五项全部设为 `'always-multiline'`。注意 @stylistic **不接受字符串 `'all'`** |
| `arrowParens: 'always'`      | `'@stylistic/arrow-parens': ['error', 'always']`                                         |
| `endOfLine: 'lf'`            | `'@stylistic/linebreak-style': ['error', 'unix']`                                        |
| `printWidth: 100`            | **无等价规则**：`max-len` 只报错不会自动折行，故不迁移，长行需手动断行                    |

### 9.3 额外补齐/调整的格式规则

- `'@stylistic/member-delimiter-style'`：类型字面量/接口成员统一用逗号分隔，多行时最后一个成员后也必须有逗号。
  因为 `comma-dangle` **不监听 `TSTypeLiteral` 节点**，类型成员的尾逗号只能靠这条规则管。
- `'@stylistic/object-curly-newline'`：`ObjectExpression`/`ObjectPattern`/`TSTypeLiteral`/`TSInterfaceBody`
  均用 `{ minProperties: 2 }`——0~1 个成员保持一行，≥2 个才换行（`TSTypeLiteral` 必须显式配置，否则规则不覆盖）。
- `'@stylistic/array-bracket-newline'` / `array-element-newline`：从最初的 `'always'` 改为 `{ minItems: 2 }`，
  空数组和单元素数组保持一行。
- `'@stylistic/space-infix-ops'`：中缀运算符两侧必须有空格（`a + b`、`x = 1`、`a ? b : c`）。
- `'@stylistic/no-trailing-spaces'`：禁止行尾多余空格（补齐 Prettier 的默认行为，可自动修复）。
- `'@stylistic/object-curly-spacing'`：对 TS 映射类型、枚举体、类型字面量通过 `overrides` 显式要求内侧空格。

### 9.4 当前完整的 eslint.config.mjs

```javascript
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
      '@stylistic/object-curly-spacing': ['error', 'always', {
        overrides: {
          TSMappedType: 'always',
          TSEnumBody: 'always',
          TSTypeLiteral: 'always',
        },
      }],
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
```

### 9.5 脚本调整

- 删除 `format` 和 `format:check` 两个脚本（格式化统一走 `eslint . --fix`）
- `dev` 并行任务去掉 `format`，顺序调整为 lint → typecheck → run：

```json
"dev": "npm-run-all --parallel dev:lint dev:typecheck dev:run"
```

### 9.6 新增 .gitignore

```
/node_modules/
/.idea/
```

注意 `package-lock.json` **不**被忽略，它锁定完整依赖树，需要提交到 git；`.env` 本项目也未忽略（见第 7 步的提示）。

### 9.7 src/index.ts 改为类型字面量测试用例

入口文件目前用于验证上面的格式规则与 `exactOptionalPropertyTypes` 等严格选项：

```typescript
let a: {
  b?: number,
  c?: string | undefined,
  [key: number]: boolean,
}

a = { b: 1 }
a = {
  b: 1,
  c: undefined,
}
a = {
  b: 1,
  c: 'd',
}
a = { 23: true }
```

要点：开启 `exactOptionalPropertyTypes` 后，可选属性 `c?: string` 的类型不自动包含 `undefined`，
想写 `c: undefined` 必须把声明写成 `c?: string | undefined`。

---

## 第 10 步：在 WebStorm 中启用 ESLint

1. 打开 **Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint**
2. 选择 **Automatic ESLint configuration**（自动识别项目内的 ESLint 和 flat config）
3. 勾选 **Run eslint --fix on save**（可选，保存时自动修复）

> 项目不再安装 Prettier 插件/配置，保存时只需 ESLint 一个修复入口，不会再有两个工具互相覆盖。

---

## 最终 package.json

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:lint dev:typecheck dev:run",
    "dev:lint": "onchange \"src/**/*.ts\" -- eslint . --fix",
    "dev:run": "tsx watch src/index.ts",
    "dev:typecheck": "tsc --noEmit --watch",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "build": "tsc",
    "serve": "node dist/index.js"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@stylistic/eslint-plugin": "^5.10.0",
    "@types/node": "^26.6.2",
    "@typescript/native": "npm:typescript@^7.0.2",
    "eslint": "^10.11.0",
    "npm-run-all": "^4.1.5",
    "onchange": "^7.1.0",
    "tsx": "^4.23.15",
    "typescript": "npm:@typescript/typescript6@^6.0.2",
    "typescript-eslint": "^8.70.1"
  },
  "dependencies": {
    "dotenv": "^18.0.3"
  }
}
```

---

## 常用命令速查

| 命令                 | 作用                                                          |
| -------------------- | ------------------------------------------------------------- |
| `npm run dev`        | 并行启动：ESLint 自动修复 + 类型检查 + 运行（均监听文件变化） |
| `npm run start`      | 直接运行 `src/index.ts`（tsx，无监听）                        |
| `npm run typecheck`  | 一次性类型检查（不产出文件）                                  |
| `npm run lint`       | 一次性 ESLint 检查（不修复）                                  |
| `npx eslint . --fix` | 手动触发全项目 ESLint 自动修复（含格式化，已取代 Prettier）   |
| `npm run build`      | 编译到 `dist/`                                                |
| `npm run serve`      | 运行编译产物 `dist/index.js`                                  |

---

## 关键经验总结

1. **TS 7 不兼容旧工具**：TS 7.0 移除了编程 API，TSLint、typescript-eslint 等工具需要官方垫片 `@typescript/typescript6`
   才能工作。
2. **TSLint 已废弃**：2019 年停止维护，官方迁移方向是 ESLint + typescript-eslint。
3. **ESLint 规则格式**：`['severity', 'options']`，不能只写选项字符串，否则 ESLint 启动崩溃。
4. **eslint-watch 不兼容 ESLint 10**：用 `onchange` 替代实现文件监听 + 自动修复。
5. **格式化只保留一个工具**：Prettier 与 ESLint `@stylistic` 并存时会在保存时互相覆盖、反复横跳；统一到 `@stylistic`
   后规则更细、可控性更强。
6. **Prettier → @stylistic 迁移要点**：`trailingComma: 'all'` 要拆成五项 `'always-multiline'`（不接受字符串
   `'all'`）；`printWidth` 没有等价的自动折行规则；类型字面量的尾逗号靠 `member-delimiter-style`，换行靠
   `object-curly-newline` 显式配置 `TSTypeLiteral`。
7. **括号换行策略**：数组用 `{ minItems: 2 }`、对象/类型字面量用 `{ minProperties: 2 }`，0~1 个成员保持一行。
8. **dotenv 读取环境变量**：`npm install dotenv`（运行时依赖），入口顶部 `import 'dotenv/config'`，随后通过
   `process.env` 访问；含敏感信息的 `.env` 不应提交 git。
9. **package-lock.json 要提交**：它锁定完整依赖树的精确版本和完整性哈希，是 `npm ci` 和团队环境一致性的保证；
   `node_modules/` 才是应该被忽略的目录。
10. **WebStorm 缓冲区 vs 磁盘**：编辑器中未保存的修改，命令行工具（eslint、tsc）看不到。排查问题前先 Ctrl+S 保存。
