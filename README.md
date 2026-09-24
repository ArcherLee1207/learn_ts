# 从零搭建 Node.js + TypeScript 7 + ESLint 项目指南

本文件记录了 `learn_ts` 项目从零到当前结构的完整搭建步骤，包含每一步的原因和踩坑经验。

---

## 目录结构总览

```
learn_ts/
├── .idea/                  # WebStorm 项目配置
├── src/
│   └── index.ts            # 入口源码
├── eslint.config.mjs       # ESLint flat config
├── tsconfig.json           # TypeScript 编译配置
├── package.json            # 依赖与脚本
├── package-lock.json
└── SETUP_GUIDE.md          # 本文件
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
console.log(greet("TypeScript"))
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

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "target": "esnext",
    "types": [],
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "strict": true,
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  }
}
```

关键选项说明：

| 选项                               | 作用                          |
|----------------------------------|-----------------------------|
| `strict: true`                   | 开启所有严格类型检查                  |
| `module: "nodenext"`             | 使用 Node.js 原生 ESM 模块解析      |
| `target: "esnext"`               | 编译到最新 ES 标准                 |
| `verbatimModuleSyntax: true`     | 禁止 `import type` 以外的类型导入被擦除 |
| `noUncheckedIndexedAccess: true` | 索引访问结果自动加 `undefined`       |
| `skipLibCheck: true`             | 跳过 `.d.ts` 类型检查以加速编译        |

---

## 第 4 步：安装开发工具链

```bash
npm install -D tsx npm-run-all @types/node
```

| 包             | 用途                                |
|---------------|-----------------------------------|
| `tsx`         | 直接运行 `.ts` 文件，无需预编译；支持 `watch` 模式 |
| `npm-run-all` | 并行/串行运行多个 npm scripts             |
| `@types/node` | Node.js 类型声明                      |

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

| 包                          | 用途                         |
|----------------------------|----------------------------|
| `eslint`                   | ESLint 10，flat config 原生支持 |
| `@eslint/js`               | ESLint 官方 recommended 规则集  |
| `typescript-eslint`        | TS parser + TS 专用规则        |
| `@stylistic/eslint-plugin` | 代码风格规则（分号、尾逗号等）            |

### 创建 eslint.config.mjs

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
            '@stylistic/semi': 'off',                                  // 不强制分号
            '@stylistic/array-bracket-newline': ['error', 'always'],   // 数组 [ 后 ] 前必须换行
            '@stylistic/comma-dangle': ['error', 'always-multiline'],   // 多行尾逗号必须
        },
    },
)
```

> **踩坑**：`@stylistic/array-bracket-newline` 的值必须写成 `['error', 'always']`，不能只写 `"always"`。ESLint 规则格式是
`['severity', 'options']`，如果只传一个字符串，ESLint 会把它当严重级别解析，导致启动崩溃，**所有规则都不生效**。

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

## 第 7 步：在 WebStorm 中启用 ESLint

1. 打开 **Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint**
2. 选择 **Automatic ESLint configuration**（自动识别项目内的 ESLint 和 flat config）
3. 勾选 **Run eslint --fix on save**（可选，保存时自动修复）

> TSLint 设置页保持默认即可（包已卸载，不会再生效）。

---

## 最终 package.json

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:run dev:typecheck dev:lint",
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
  }
}
```

---

## 常用命令速查

| 命令                   | 作用                                    |
|----------------------|---------------------------------------|
| `npm run dev`        | 并行启动：运行 + 类型检查 + ESLint 自动修复（均监听文件变化） |
| `npm run start`      | 直接运行 `src/index.ts`（tsx，无监听）          |
| `npm run typecheck`  | 一次性类型检查（不产出文件）                        |
| `npm run lint`       | 一次性 ESLint 检查（不修复）                    |
| `npm run build`      | 编译到 `dist/`                           |
| `npm run serve`      | 运行编译产物 `dist/index.js`                |
| `npx eslint . --fix` | 手动触发全项目 ESLint 自动修复                   |

---

## 关键经验总结

1. **TS 7 不兼容旧工具**：TS 7.0 移除了编程 API，TSLint、typescript-eslint 等工具需要官方垫片 `@typescript/typescript6`
   才能工作。
2. **TSLint 已废弃**：2019 年停止维护，官方迁移方向是 ESLint + typescript-eslint。
3. **ESLint 规则格式**：`['severity', 'options']`，不能只写选项字符串，否则 ESLint 启动崩溃。
4. **eslint-watch 不兼容 ESLint 10**：用 `onchange` 替代实现文件监听 + 自动修复。
5. **WebStorm 缓冲区 vs 磁盘**：编辑器中未保存的修改，命令行工具（eslint、tsc）看不到。排查问题前先 Ctrl+S 保存。
