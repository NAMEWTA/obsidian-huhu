# 测试

本文件是本仓库本地验证的唯一选择表；CI 与发行门禁由 workflow 定义。汇报实际命令、结果和未验证项。构建证明类型与产物可生成，组件/DOM 测试证明相应行为，真实 Obsidian 验收证明宿主集成；三者不互相冒充。

## 选择原则

先确定变更范围、受影响行为和失败风险，再选择最接近它们的检查。普通只读审查不构建产物。影响 JavaScript 产物的 TS/TSX、打包资源或构建配置变化时运行 `pnpm run build` 并保留重建的 `main.js`；生产 TS/TSX 变化时运行 `pnpm run lint`。纯 CSS 仅重建 `styles.css` 并执行 CSS 行的检查，不重建 `main.js`。纯文档、规则或测试脚本修改不因此重建插件，使用文档、脚本或测试自身的检查；测试类型变化可单独运行 `pnpm exec tsc -skipLibCheck -p tsconfig.test.json`。

定向 Vitest 使用 `pnpm exec vitest run <测试文件或目录>`，表中的路径是选择线索。共享基础设施、影响面难以界定或定向检查发现跨域问题时扩大回归；`pnpm test` 是全量 Vitest，`test:all` 是完整脚本集合，不把它们当成每个局部修改的默认命令。

缺陷修复和新行为优先增加能暴露目标问题的回归测试；现有测试已经证明目标时可复用。无行为变化或低影响可逆修改不为形式新增测试。持久化、安全、并发和恢复路径仍需对应行为证据。输入、环境与风险未变化的通过结果可复用；新失败、相关改动或新风险才要求重跑。

当前组件与样式验证入口见[架构总览的验证与产物](../../../../docs/architecture.md)；下述 `dom` 项目和 Tailwind 流水线已接入，具体命令与范围以 `package.json` / `vitest.config.ts` 为准。

## 分层

| 层 | 位置 | 运行 |
|---|---|---|
| 单元测试 | 就近的 `src/**/*.test.ts(x)`、`test/**/*.test.ts` | `pnpm test`（Vitest node 项目） |
| React 组件 | `src/**/*.dom.test.tsx` | `pnpm exec vitest run --project dom <测试文件>`（happy-dom + Testing Library） |
| 用户格式黄金样本 | `test/golden/user-formats.test.ts` + `__snapshots__/` | 属于 `pnpm test` |
| 验证脚本 | `scripts/verify-*.ts`，在 `package.json` 里接成 `test:<name>` | `pnpm run test:<name>` |
| 门禁脚本 | 架构、i18n、文档、样式、Promise 回调、工作台入口、构建文本 | `pnpm test:architecture`、`test:i18n`、`test:docs`、`test:styles` 等 |
| 以上全部 | 除自身外的每个 `test:*` 脚本 | `pnpm run test:all` |
| Rust 辅助程序 | `native/pty-server/tests`、单元测试 | `pnpm run check:native`（`cargo test --locked`） |
| 独立浏览器 Rust | `native/browser-runtime` 的单元测试 | `pnpm run check:browser-native`；真实 Chromium 另用 `accept:browser-native` |
| Go Bot Runner | `native/huhubot/tests/contract`、包内测试 | `pnpm check:huhu-bot`；`pnpm build:huhu-bot` 后对本机二进制运行 `node scripts/verify-huhu-bot.mjs <binary>` |
| 真实 Obsidian | `scripts/obsidian-acceptance/`（针对一次性库的 CDP） | 见下文 |

## Vitest

当前配置包含 `unit`（Obsidian 别名到 `scripts/obsidian-stub.ts`，node 环境）、`settings-iconic`（列出的设置/Iconic 测试，使用专用桩）、`dom`（happy-dom，包含 `src/**/*.dom.test.tsx`，Obsidian 使用普通桩）与 `native-integration`。后者使用普通桩，在其余项目完成后以单 worker 串行运行真实 Git 和 Chrome 测试，避免 Windows 子进程启动与磁盘 IO 竞争；各用例保留原有超时和断言。`unit` 排除另三个项目的用例，避免重复执行。JSX 统一为 React，不设置兼容运行时别名；组件约定见 [ui 技能](../../ui/SKILL.md)。初始化文件 `scripts/module-strings.ts` 注册模块词典和懒加载词典，所以组件渲染的是真实文案。`.svg` 和 `.md` 导入与打包一样按文本加载。

纯逻辑测试是就近的 `*.test.ts`，React 交互测试是 `*.dom.test.tsx` 文件，从 `vitest` 导入 `test`/`vi`，而不是新增验证脚本。测试在 `pnpm run build` 期间由 `tsconfig.test.json` 做类型检查。测试依赖的时区或时钟要固定（`vi.useFakeTimers({ now, toFake: ['Date'] })`）。

## 黄金样本

`test/golden/user-formats.test.ts` 通过生产代码写出看板、档案、自动化定义，以及习惯、记账、阅读和番茄钟文档，把字节与 `__snapshots__/` 比较，再读回来。普通重构保持快照不变；有意改变格式时同步样本并验证读写。新身份不导入旧品牌数据；同身份格式转换按实际协议验证。如果任务就是修改格式，用 `pnpm vitest run test/golden -u` 更新并检查差异。评论旁路文件由评论测试锁定，`iconic.json` 由 Iconic 移植测试锁定。

`.gitattributes` 让黄金样本在所有平台都保持 LF，避免检出设置改变断言所比较的字节。

## 改了什么就跑什么测试

| 你修改了 | 运行 |
|---|---|
| 模块生命周期、注册表、命令、设置存储、语言 | 对应注册表、设置或语言测试；词典/语言行为变化加 `pnpm test:i18n`；生命周期变化检查关闭、重开与失败释放 |
| 导入、移动文件、启动代码 | `pnpm test:architecture`、`pnpm run check:bundle` |
| 产品文案 | `pnpm test:i18n`；影响打包输入时按上文重建；仅文字变化不自动要求全量 UI 探针 |
| CSS / Tailwind 类 | 按 [构建参考](build-and-release.md) 先生成并拼接样式，再跑 `pnpm run lint:css`、`pnpm test:styles`；TSX 类名也是样式输入 |
| 批注 | 存储与锚点测试、浮窗/面板的 `dom` 交互测试；CodeMirror、多窗口、侧栏生命周期补宿主验证 |
| 看板解析、小组件、记录 | 对应单元测试及功能匹配的看板 `test:*`；格式变化加黄金样本 |
| 自动化、通知 | 对应测试套件；执行目标、时间、会话或冲突安全变化加 `pnpm run test:safety-regressions` |
| 档案 | `src/modules/archives/archives.test.ts`；索引、批量处理或性能变化加 `pnpm run accept:contacts-scale` |
| 保险箱 | `src/modules/safe/` 下的模型、真实 WebCrypto、密文仓库、文件、会话与 DOM 测试；原生文件选择器、剪贴板、多窗口迁移、隐藏锁定和重启恢复补真实桌面宿主验收 |
| 图标 | `src/modules/icons/iconic-port.test.ts` 中相关 Iconic 对照 |
| 版本管理 | `src/modules/versioning` 对应测试；Git 流程、历史和恢复暂停用 `test/sync/` 的真实临时仓库；笔记恢复补原生编辑器与多叶宿主验证 |
| 终端模型、键盘、呈现 | `src/modules/agent/**` 中对应测试；原生辅助程序变化加 `pnpm run check:native` 和 `node scripts/verify-pty-helper.mjs <二进制>` |
| 独立浏览器 | `src/modules/browser/{core,services,platform/desktop,ui}` 中对应测试；Worker 类型与产物用 `pnpm build:browser`，Rust 用 `pnpm check:browser-native`；协议、进程和输入隔离变化补真实 Chromium 及受影响的 Obsidian 宿主场景 |
| Go Runner、HAP 或其工程脚本 | `pnpm check:huhu-bot`、`pnpm test:huhu-bot-architecture`、`pnpm test:huhu-bot-tooling`；构建后运行本机 stdio 冒烟；依赖变化重算完整 notices。TS 协议/客户端另跑对应 Vitest；Rust 检查不能代替 Go |
| 升版本、发版文件 | `test/release/release-artifacts.test.ts` 和 `node scripts/verify-release-artifacts.mjs <version>`；实际发布遵守完整发行门禁 |
| 文档或技能 | `pnpm test:docs` 及变更事实/链接核对；触发、权限或流程语义变化验证对应正常、近邻不触发和失败分支 |
| SpecDev 合同 | `node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --self-check`；状态工件变化再验证相关 change，不创建无关工件 |
| 构建/校验脚本、测试配置 | 运行所改工具与有意义的正反例；影响插件构建时再运行 build，不以语法检查替代工具行为 |
| 工作台、页面、设置界面、终端界面、浏览器 | 按下节视觉范围与宿主边界选择检查 |

`test:docs` 检查项目文档的结构、链接与部分源码事实，不证明全部文档语义正确，也不要求创建 SpecDev 的可选知识目录或已退役状态索引。SpecDev 工件的生命周期/schema 由所属 `validate-specdev`、`validate-retro` 校验；工具包不在项目严格链接集合内，本次触及的引用仍须核对。

浏览器的身份与文件测试应保留真实临时目录、完整 Cookie 语义、错 Run/租约、篡改和恢复失败场景；系统密钥桩只证明加密协议，不证明真实 OS 密钥链可用。根目录独占与 RPC 测试会监听本机回环地址，受限沙箱的 `listen EPERM` 是环境限制，不是测试通过，也不能用桩替换后声称实际监听通过。RPC 重点覆盖 Host/Origin/令牌/启动代次、连接隔离、重复请求、撤权后的结果脱敏与并发上限。

## UI 与宿主验证范围

- React 关键交互用 Testing Library / user-event 验证「+」菜单键盘、标签关闭确认、状态栏折叠、批注浮窗与设置行；不要把 DOM 结果当作真实样式或原生边界证据。
- 样式隔离可用 `scripts/verify-ui-styles.mjs`（无头 Chrome + Obsidian app.css）检查亮暗的常态/悬停/聚焦及 `.huhu-native` 不受污染；缺少宿主样式或 Chrome 时脚本会跳过，退出码 0 本身不证明样式通过；该可选脚本不自动成为每次修改的阻塞项。
- 局部视觉修改：检查受影响页面及状态并截图，选择能暴露问题的尺寸和明暗模式；组件测试验证可独立观察的交互。
- 主题令牌、全局样式、shell 或响应式布局：检查受影响的明暗模式、代表性的界面主题与编辑器配色和宽度（≥960、600–960、<600／手机）；只扩展相关维度，避免无差别组合。
- Obsidian API、弹出窗口、编辑器集成、生命周期、终端/浏览器原生边界或重启恢复：在真实 Obsidian 验证受影响场景。局部场景足够时不强制遍历所有模块；全工作台探针用于跨模块集成或广泛回归。

环境不可用时继续可执行的独立检查，报告未验证边界及影响；必需宿主验收未完成时保持待验收，不能用构建成功声明全部通过。可选平台扩展不阻塞已经约定并完成的交付。

## 真实 Obsidian 探针

`scripts/obsidian-acceptance/` 里每个脚本都用 `fresh-vault.mjs` 创建一次性的库、配置目录和临时 HOME，用远程调试启动 Obsidian 并安装当前构建的插件；证据（JSON 和截图）写入 `<root>/evidence/`。每次运行都用新的根目录，它必须尚不存在。

`versioning-history.mjs` 验证笔记历史在真实编辑器中的浏览、恢复、撤销、批注、多叶、Worker、重启与弹出窗口；只初始化一次性本地 Git 仓库，没有远端。传入尚不存在的绝对目录，沿用 `HUHU_OBSIDIAN_EXECUTABLE`、`HUHU_PLUGIN_SOURCE` 与 `HUHU_ACCEPTANCE_PORT`。

`workbench-probe.mjs` 是工作台的整体探针：三种宽度下的布局和溢出、图标轨上的每个页面、点击当前图标折叠侧栏、全部设置分类、模块开关增删图标轨条目、重启后回到上次的页面，以及没有未处理的原生错误。其余脚本各验证一个功能的宿主集成（看板网格与日历、评论、独立浏览器、同步克隆与自动暂存、导航器日志、智能体账号与标签、笔记移动与引用更新、溢出审计、主题矩阵等）；纯逻辑和组件交互由 Vitest 覆盖，不要为它们再写探针。DOM 改版后先跑受影响的脚本，选择器随界面一起更新，找不到元素时修脚本或删脚本，不留失效的验收。

`agent-browser-v2.mjs <新根目录> <完整运行包>` 验证真实 Obsidian、utilityProcess 和受管 Chromium 的组合：独立 Space、只读查看、接管及旧权限失效、宿主焦点/剪贴板、身份预检、文件授权和跨窗口查看。探针记录插件、Worker 和运行包摘要；只引用对应构建实际通过的断言。其文件选择器结果由夹具提供，不证明操作系统原生文件对话框；经宿主文本框插入中文也不等于验证系统输入法的完整组字流程。独立 Chromium 探针保留浏览器沙箱，宿主探针对 Obsidian 自身沙箱的测试环境设置需另行说明。

```sh
pnpm run build
cargo build --release --manifest-path native/pty-server/Cargo.toml
HUHU_PTY_BINARY=$PWD/native/pty-server/target/release/huhu-pty \
HUHU_OBSIDIAN_EXECUTABLE=/opt/Obsidian/obsidian \
xvfb-run -a -s "-screen 0 1600x1100x24" node scripts/obsidian-acceptance/workbench-probe.mjs /tmp/huhu-probe-<name>
```

从仓库根目录运行。`HUHU_PTY_BINARY` 让插件使用本地终端辅助程序，而不下载 Release 附件。`HUHU_ACCEPTANCE_PORT` 改用别的调试端口，几个脚本才能并行；`HUHU_PLUGIN_SOURCE` 从另一个目录（含 `main.js`、`styles.css`、`manifest.json`）安装插件，不用工作区里的产物。浏览器探针另外接收完整运行包，Worker 必须匹配该插件构建的摘要，不能混用旧包。个别脚本用环境变量指定根目录（`overflow-audit`、`agent-page-tabs`、`agent-skills-settings`、`p3-shell`、`status-bar`），脚本开头有写明。`terminal-reliability.mjs` 需要联网下载发布的辅助程序，`release-vault-install.mjs` 需要发布附件。`theme-matrix.mjs` 为主题样式在阅读、实时预览和源码模式下截图。你引用的证据要自己保留；临时目录会被清理。

CI 没有 Obsidian 运行环境；浏览器 CI 的 Linux x64 原生 Chromium 探针不代替真实宿主验收，也不证明其他平台支持。Windows 和 macOS 上的终端行为（ConPTY、输入法、CLI 智能体）在真实机器上检查，已验证和未验证的内容写入任务报告；永久验收记录只通过 SpecDev A 网关更新，不在普通实现中直接改写。
