# 构建与发版

本文说明当前 React/Tailwind 构建与发布入口，命令以 `package.json` 为准，门禁以 `.github/workflows/` 为准；[开发流程](../../../../docs/development.md)维护当前构建与发布约定。

## 脚本

| 脚本 | 作用 |
|---|---|
| `dev` | esbuild 与 Tailwind 监听，重新生成作用域样式并拼接；开发 JS 内联 sourcemap、不压缩 |
| `build` | 源码/测试/Worker 类型检查、浏览器独立产物、Tailwind 编译与作用域处理、样式校验、插件 esbuild 生产构建 |
| `build:browser` | 构建 `browser-worker.cjs`、固定主进程桥、`browser-cli.cjs` 及摘要 |
| `build:css` | `node scripts/build-tailwind.mjs && node scripts/build-styles.mjs --write`，生成 Tailwind/字体并拼接 `styles.css` |
| `lint` | ESLint，`--max-warnings 0` |
| `lint:css` | 用 stylelint 检查 `src/**/*.css`，文件级基线只减不增（`scripts/stylelint-baseline.json`）；新违规会失败 |
| `check:bundle` | 从 esbuild 元数据得到启动集合和各模块的激活闭包，与 `scripts/bundle-budget.json` 比较；超预算失败（`--files` 列出启动输入） |
| `check:styles` | 报告体积、`!important`、字面量颜色、z-index 和重复选择器 |
| `check:native` | 对 `native/pty-server` 运行 `cargo test --locked` |
| `check:browser-native` | 对 `native/browser-runtime` 运行 `cargo test --locked` |
| `accept:browser-native` | 用指定 helper、Chromium 和新证据目录执行真实浏览器协议探针；保留 Chromium 沙箱 |
| `check:notices` | `THIRD-PARTY-NOTICES.md` 与打包内容和 crate 依赖图一致（`pnpm run notices` 会重写它） |
| `check:similarity` | 对照参考项目计算源码树的 k-gram 相似度（见 `licensing.md`） |
| `format`、`format:check` | 用 prettier 处理 `src/**/*.{ts,tsx}` 和 `scripts/**/*.ts`；不属于 CI |
| `test`、`test:*`、`test:all` | 见 `testing.md` |

`main.js`、`styles.css`、`browser-worker.cjs`、`browser-cli.cjs` 及浏览器产物的 `.sha256` 是受版本管理的产物。`src/modules/browser/platform/desktop/runtime/main-source.generated.json` 和 `worker-digest.generated.json` 同样由构建生成并随源码提交。按 `testing.md` 在对应输入变化时重建并留在工作区；用户授权提交后与源码一起提交。CI 会检查产物与源码是否一致。

## 样式

组件的 Tailwind 类也是样式输入；必要的作者 CSS 放在所属方（`src/ui`、`src/theme`、`src/shell`、`src/app`、`src/modules/<id>`），保持 `src/styles.json` 的明确顺序。运行 `pnpm run build:css`（先编译 Tailwind，再由 PostCSS 展开层并加作用域，最后拼接），不能只重跑拼接器。`src/styles.json` 里的顺序就是层叠顺序，不要按文件名排序。CSS 不能懒加载（Obsidian 只允许一个样式表），所以模块 CSS 限定在模块自己的类名下，或限定在模块激活期间添加的 body 类名下。

清单前部依次是 `fonts.generated.css`、`tokens.css`、`base.css`、`neutralize.css`、`build/tailwind.scoped.css`，然后是其余作者文件。`build/` 不提交，`test:styles` 必须先生成 Tailwind 再执行 `build-styles.mjs --check`，支持新克隆。字体二进制、字体许可与生成的 `src/ui/styles/fonts.generated.css` 随仓库保存；生成 Tailwind 和字体 CSS 不参与作者 stylelint。

样式构建器把每个源文件（包括依赖包的样式表）的 CRLF 统一为 LF。`--write` 输出 LF；`--check` 也会归一化检出的 `styles.css`，因此 Windows 的检出设置不会影响结果。生成的 `styles.css` 和 `THIRD-PARTY-NOTICES.md` 由 `.gitattributes` 固定为 LF 检出，保证各平台的包体预算、许可校验与发行字节一致。

## esbuild

`esbuild.config.mjs` 使用 `scripts/esbuild-options.mjs`（与 `check:bundle` 和 `notices` 共用）：单一 UI 入口（`src/app/main.ts`）、CommonJS、ES2021、生产构建压缩、`.md`/`.svg` 作为文本、`jsxImportSource: react`，不设置兼容运行时别名。外部依赖：`obsidian`、`electron`、`@codemirror/*`、`@lezer/*`、Node 内置模块。横幅内嵌 `LICENSE`、`NOTICE`、图标资源声明、Orca 许可证和打包依赖的许可证。构建期对少数第三方库做按文件哈希固定的适配（Radix 的焦点与弹层、sonner 的样式、react-draggable 的跨窗口节点判断，见 `scripts/radix-owner-document.mjs`、`scripts/draggable-owner-realm.mjs`、`scripts/ui-adapter-inputs.json`）；升级这些库时 `pnpm test:ui-adapters` 会失败，需要重新审阅锚点和哈希。插件仍只有一个 React 入口，原生编辑器使用的 CodeMirror state/view/language 保持 external。版本比较独立 Worker 由 `scripts/versioning-worker.mjs` 自包含编译并作为惰性页面资源内嵌，只计算可序列化的 diff model；其私有依赖不与宿主编辑器共享状态或扩展实例，许可扫描包含 Worker metafile。`@codemirror/merge` 固定版本并打包比较实现。保持浏览器平台的 `process.env.NODE_ENV` 构建替换，不改为 `platform: node`；React 界面约定见 [ui 技能](../../ui/SKILL.md)。

独立浏览器使用专门的 Node 构建：`build-browser-runtime.mjs` 生成 utilityProcess Worker、固定主进程桥和 Worker 摘要，`build-browser-client.mjs` 生成 CLI/MCP 客户端。主进程桥的源码来自固定构建输入，不能拼接网页或调用方提供的 JavaScript。完整浏览器运行包包含固定版本 Chromium、Rust 监督进程、匹配摘要的 Worker、逐项文件/链接清单和许可；用户选择安装时先校验，再复制并原子发布。浏览器用户目录另有最后写入版本保护，更新或回退运行包不能绕过它。详细流程见[浏览器运行时](../../../../docs/browser-runtime.md)。

## 预算

`scripts/bundle-budget.json`：

- `eagerBytes`：插件加载时运行的内容，数值以预算文件为准。
- `moduleActivationBytes`：每个模块开启时执行的内容（不含页面、设置页和第二层 `import()`）。
- `forbiddenEagerAreas`：绝不能进入启动集合的库，包含 `npm:react-dom`、`npm:radix-ui`；React 渲染按需加载。
- `outputBytes`、`stylesBytes`：`main.js` 和 `styles.css` 总大小的上限。代码变小时调低；重构依赖增量在相应 `*Reason` 字段记录理由，迁移结束后收紧预算，不为过检查无理由调高。

## CI

`.github/workflows/lint.yml` 可被 workflow_call 复用；Linux Node22/24 与 Windows Node24 使用同一完整检查集合：安装、构建、插件与浏览器生成产物差异、包体、lint/CSS、test:all、许可和 Rust。终端 helper 由 `terminal-build.yml` 为五个平台构建，各平台执行 stdio 验证。

`browser-runtime-build.yml` 仅为生产启用的 Linux x64 构建独立浏览器：测试并编译 Rust、组装固定官方 Chromium 与 Worker、保留沙箱运行真实 Chromium 探针、核对完整库存和摘要，再打包许可齐全的运行包。其余平台仍为不支持，不能由 TypeScript 或终端 CI 推导出浏览器支持。Release 同时依赖同一 SHA 的 checks、terminal、browser 三组任务全部成功；失败、取消或跳过均阻止发布。工作流定义和实际成功证据须分别报告。

pnpm 版本固定在 `package.json`；CI 使用 `pnpm install --frozen-lockfile`。

## 升版本

在同一次提交里一起修改，否则不要发版：

| 文件 | 修改 |
|---|---|
| `manifest.json` 的 `version` | 新版本号，不带 `v` 前缀 |
| `package.json` 的 `version` | 相同 |
| `versions.json` | `"<version>": "<minAppVersion>"` |
| `CHANGELOG.md` | 有一个 `## <version>` 小节，且没有「未发布」小节 |
| `main.js` | 用该提交重建 |

`scripts/verify-release-artifacts.mjs <version>` 把前四项与标签核对，`CHANGELOG.md` 里有 `## Unreleased` 小节时失败。提高 `minAppVersion` 会让部分用户无法升级；只有在有记录的理由时才这样做。

当前版本以 `manifest.json`、`package.json` 和 `versions.json` 为准。标签中 `-` 之后带后缀的版本会成为 GitHub 预发布，不会标为最新版。

## 发版

推送 `main`，再推送标签（`git tag <version> && git push origin <version>`）。`.github/workflows/release.yml` 是唯一创建 Release 的地方：

1. 通过同一 SHA 的完整质量检查、五平台终端构建（`terminal-build.yml`）和 Linux x64 浏览器构建及沙箱探针（`browser-runtime-build.yml`）。
2. 把标签与 `manifest.json`、`package.json`、`versions.json`、`CHANGELOG.md` 核对，构建，并在 `main.js`、`styles.css`、浏览器 Worker/CLI、摘要或生成桥接文件与提交不同时失败。
3. 收集 `main.js`、`manifest.json`、`styles.css`、浏览器 Worker/CLI 与摘要、许可和 `huhu-<version>.zip`，用 `scripts/verify-release-artifacts.mjs --plugin` 检查，并为对应插件产物生成来源证明。
4. 用各自的 `.sha256` 文件核对五个 `huhu-pty-<平台>-<架构>[.exe]` 二进制，并用 `scripts/verify-pty-helper.mjs` 运行 Linux 版本。
5. 收集并证明 `huhu-browser-runtime-linux-x64.tar.gz` 的来源，为所有附件写入 `SHA256SUMS.txt`，再创建带插件文件、zip、终端 helper、浏览器运行包、校验和、`LICENSE`、`NOTICE` 和 `THIRD-PARTY-NOTICES.md` 的 GitHub Release。

Obsidian 的标准插件文件是 `main.js`、`manifest.json` 和 `styles.css`；完整 zip 还包含匹配构建的浏览器 Worker、CLI、摘要与许可。独立浏览器运行包由用户另行下载、解压并在浏览器页选择安装，安装到 `.huhu/browser/<device-id>/v2/runtime/`，不会自动回退到系统 Chrome。第一次使用终端时，插件从自己版本的 Release 下载当前平台的终端辅助程序，校验正式 SHA-256 并保存在当前 vault 的 `.huhu/helpers/<device-id>/<platform-arch>/<version>/`（开发 override 只复制到库内执行）。永远不要提交原生辅助程序的二进制文件。
