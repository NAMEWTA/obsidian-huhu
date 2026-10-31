# 本 change 的执行边界与共享写入合同

来源：LOG-017（用户接受十项审计建议）与 LOG-018（用户暂停浏览器开发和修复）。本文件由 Goal/Map 共同引用，细化已批准的范围和执行安排；不授予生产实现、提交或远程写入权限。Ticket frontmatter 拥有 worker 写集；shared_paths 只允许其声明的 Lead owner 写入，不能被 worker 的宽目录匹配覆盖。

## Browser 冻结边界

从 LOG-018 起，HUHU Browser 及其集成面的开发、修复、重构、样式统一、接口迁移、性能优化、测试修复、专用构建与生成物更新全部暂停，留待用户之后单独重构。其他票完成、整体检查失败或新的实现授权均不自动解除冻结；只有用户明确恢复浏览器相关工作才重新规划。

冻结路径（包含其测试、配置与生成文件）：

- `<Path>src/modules/browser/**</Path>`
- `<Path>native/browser-runtime/**</Path>`
- `<Path>src/modules/agent/ui/browser/**</Path>`
- `<Path>src/modules/agent/platform/desktop/browser-material*</Path>`
- `<Path>src/modules/agent/services/browser-material-consumer*</Path>`
- `<Path>src/modules/home/ui/web/**</Path>`
- `<Path>src/host/desktop/browser-*</Path>`
- `<Path>src/host/desktop/retained-browser-file*</Path>`
- `<Path>scripts/*browser*</Path>`
- `<Path>scripts/obsidian-acceptance/agent-browser-v2.mjs</Path>`
- `<Path>.github/workflows/browser-*.yml</Path>`
- `<Path>tsconfig.browser-worker.json</Path>`
- `<Path>browser-worker.cjs</Path>`
- `<Path>browser-worker.cjs.sha256</Path>`
- `<Path>browser-cli.cjs</Path>`
- `<Path>browser-cli.cjs.sha256</Path>`
- `<Path>docs/browser*.md</Path>`
- `<Path>docs/assets/browser/**</Path>`
- `<Path>docs/images/readme/browser.png</Path>`

这是一组最低保护范围，并非仅凭文件名放行。下列混合文件中的 Browser 导入/注册/路由、标签与分屏、账号/Cookie/Profile、存储路径、自动化动作、资料移交、包体预算项、依赖/许可证及构建段落也冻结：

- `<Path>src/app/main.ts</Path>`、`<Path>src/app/manifests.ts</Path>`、`<Path>src/app/workbench/compose-workbench.ts</Path>`、`<Path>src/app/settings/runtime.ts</Path>`；
- `<Path>src/modules/agent/module.ts</Path>`、`<Path>src/modules/agent/manifest.ts</Path>`、`<Path>src/modules/agent/api.ts</Path>`、`<Path>src/modules/agent/services/controller.ts</Path>`、`<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path>`；
- `<Path>src/modules/automations/services/action-host.ts</Path>`、`<Path>src/modules/home/services/home-host.ts</Path>`、`<Path>src/shared/storage/vault-layout.ts</Path>`、`<Path>src/styles.json</Path>`、`<Path>esbuild.config.mjs</Path>`、`<Path>package.json</Path>` 及相关锁文件。

Lead 开工前按真实引用补充冻结清单，固定既有内容摘要；只读查看这些内容以识别边界是允许的。共享 token、组件、Shell、命令、路径或构建变更必须先核对 Browser 消费者；不得借其他模块迁移改变 Browser 行为、移除其仍使用的 API/别名、重新生成 Browser 资产，或增加 Browser 专用补丁。不能在保持冻结面不变的情况下完成的共享子项记为“Browser 冻结而延期”，暂停该子项并继续独立部分，不扩大写集、不制造兼容分支。既有旧引用因此保留时记录准确定位，不伪称全仓零引用。

T-34 只负责 Comments/Icons；T-25 排除 Agent 浏览器标签；T-29 排除 Home 网页面板。T-14 的音乐账号后台恢复仍在范围内，但其 Browser 会话服务调用合同和实现不改。T-16 保持 Browser 路径常量和持久化格式。T-18 的分屏诊断/修复只覆盖非 Browser 窗格。T-21/T-37 不修改 Browser 打包链、资产、模块预算或依赖。

独立 Chrome/Chromium 是其他模块的 UI 验证工具，不是 HUHU Browser 功能。允许运行已有且不改源码/冻结资产的通用只读回归；不建立 Browser 专项开发、诊断、采样或测试修复工作。Browser 既有失败记录为延期，不借机修复或删断言；本次非 Browser 修改引起的回归必须撤回/修正导致回归的非 Browser 修改。

## Lead 独占共享文件

| 路径 | 唯一写入者 | 使用边界 |
|---|---|---|
| `<Path>docs/e2e/dev-overhaul/ledger.md</Path>` | Lead；T-01 首次建立 | 各票提交结果，Lead 汇入；用户真机项只标归属，不跟踪或准备额外清单 |
| `<Path>docs/references.md</Path>` | Lead | T-03 建立来源记录；后续票交付实际采用材料的来源/许可/位置，Lead 在该票验收前串行登记；Browser 部分原样保留 |
| `<Path>src/modules/home/i18n.ts</Path>` | Lead | T-15、T-26–T-30 的 en/zh 补丁；按稳定键去重，固定输入后执行 i18n 检查；网页面板文案冻结 |
| `<Path>main.js</Path>`、`<Path>styles.css</Path>`、`<Path>build/**</Path>`、`<Path>src/ui/styles/fonts.generated.css</Path>` | Lead | 只通过现有生成链更新，worker 不直接写；保留源码和产物在工作区，提交仍未授权 |

上述共享路径在使用票的 shared_paths/shared_path_owners 明示，独立于 worker 的 writable_paths。这不是任意路径扩权。Lead 以“来源记录写入 / Home 词典写入 / build-output”三个互斥临界区串行操作；构建/浏览器几何验收时暂停全部相关 writer，冻结源输入并记录摘要。未获得对应共享 owner 的同步结果，该票不能进入最终验收。共享路径的串行写入不要求把整个模块开发串行化。

## 冻结期的构建和检查

当前 `pnpm build` 和 `pnpm build:browser` 会执行 Browser 专用生成脚本；冻结期间不直接运行它们。由 Lead 在稳定输入上逐条执行以下等价的非 Browser 构建序列（Browser 资产复用已固定版本）：

1. `pnpm exec tsc -noEmit -skipLibCheck`
2. `pnpm exec tsc -skipLibCheck -p tsconfig.test.json`
3. `node scripts/build-tailwind.mjs`
4. `node scripts/build-styles.mjs --write`
5. `node scripts/build-styles.mjs --check`
6. `node esbuild.config.mjs production`
7. `pnpm check:bundle`

不运行 `scripts/build-browser-runtime.mjs`、`scripts/build-browser-client.mjs` 或安装/装配 Browser runtime；不修改这些脚本以绕过冻结。先核验已有 Browser 资产存在且与固定摘要一致，缺失/失配则记录构建受阻，不补建 Browser。生成的聚合 main.js/styles.css 可因非 Browser 输入而变化；Browser 专属代码、资产和作者样式必须未改变，共享行为不产生 Browser 回归。所有文档中的“构建”均指本节序列，不能把它报告成默认 pnpm build 全链已通过。

T-01 固定 package.json 测试目录、命令副作用与冻结项；全量验证以 dev 测试选择表中的适用集合执行。通用套件可只读覆盖冻结代码，但凡命令会启动真实 Obsidian、下载/安装/生成 Browser 资产或专门驱动 Browser 功能，暂停该命令并写明排除原因。不得把跳过项改为通过，也不得为排除项降低断言或预算；AC-903 评价当前已授权范围。不为用户真机验收创建额外 checklist。

## UI 的 agent 验证接缝

T-23 建设独立组件验证入口 `<Path>scripts/ui-review/run.mjs</Path>`（本轮只规划，尚未实现），复用现有 React、esbuild、Obsidian stub 及 UI-001 的独立 Chromium/CDP 操作方式；不引入另一套产品 UI 运行时、不启动 Obsidian、不调用 HUHU Browser。

命令合同：`node scripts/ui-review/run.mjs --ticket T-23 --matrix standard --out docs/e2e/dev-overhaul/ui/T-23`；后续票替换 ticket ID。runner 在执行前识别 Chrome/Chromium，不存在则该项未验收；从票内 UI fixture 配置挂载真实生产组件，mock 仅限宿主/服务边界。每张 UI 票负责自己 ui/ 下的 fixture 和 DOM/交互测试，T-23 只拥有共享 runner。fixture 显式列出入口、适用状态、动作、可观察结果，不用原型替代生产组件。

standard 矩阵：420/600/1440px 容器，en/zh 长文案，亮/暗，键盘与可见焦点，200% 缩放，reduced-motion；依组件能力覆盖正常、失败保留输入/已有数据、重试、防重复、取消/不确定。输出 result.json（输入摘要、ticket、fixture、实际尺寸/主题/语言/状态、动作、断言、异常）与截图。几何断言包括主操作可达、横向溢出和 toast 无交集；happy-dom 仅用于行为测试，不能证明真实像素几何。

不运行 `scripts/obsidian-acceptance/overflow-audit.mjs`：它会启动真实 Obsidian，属于用户真机验收边界。agent 的 E2E required 只指上述独立浏览器中的真实组件路径及相应服务/合同测试。
