# 架构

移动文件、跨区导入、添加命令或重命名任何持久化内容之前先读本文。[架构文档](../../../../docs/architecture.md)说明当前结构。检查器以当前源码规则执行；React 界面约定见 [ui 技能](../../ui/SKILL.md)。

## 分区

```
src/app/            插件入口（main.ts）、模块注册表、设置运行时、命令、功能区、
                    工作台叶子与组合（app/workbench）、契约（app/contracts）
src/shell/          React 工作台外壳：图标轨、可选侧栏、页面框，以及 Obsidian 状态栏用量项的 React 视图（用 import() 加载）
src/ui/             设计系统：components（shadcn）、lib（cn）、react（挂载/Portal）、tailwind、styles、fonts
src/theme/          主题样式、Markdown 样式、把它们应用到每个窗口的运行时
src/host/           多个模块共用的 Obsidian 与桌面适配器
src/shared/         工具函数、设置 DSL 与存储、存储辅助、i18n 运行时与启动词典
src/types/          环境类型声明
src/modules/<id>/   home | agent | browser | archives | automations | notifications | icons | comments | navigator | versioning | safe
  manifest.ts       纯数据描述，启动时加载
  api.ts            其他模块可导入的类型和 serviceKey()/contributionPoint() 常量
  module.ts         懒加载入口：创建 ModuleInstance
  settings.ts       模块的设置模式
  i18n.ts           模块的文案
  core/             模型、解析、调度、纯规则（不用宿主包）
  platform/         Obsidian 与库的读写；platform/desktop/ 放 Node 与 Electron 代码
  services/         模块业务装配、zustand/vanilla 仓库
  contrib/          对其他模块贡献点的贡献
  ui/               页面、面板、设置页、对话框
  styles/           模块的 CSS（列在 src/styles.json）
native/pty-server/  Rust 终端辅助程序（stdio 帧）
native/browser-runtime/ 独立浏览器监督进程与 Cookie SQLite 读取器
test/               共用样本与跨模块测试（用户格式黄金样本）
```

## 导入矩阵

由 `scripts/verify-architecture.mjs`（`pnpm test:architecture`）检查，覆盖值导入和类型导入，在 TypeScript 擦除之后检查，包括字面量 `import()` 与运行时循环。没有基线：任何违规都会失败。

`src/app/contracts/` 可被除 `shared` 和 `host` 之外的所有区导入；下表省略了它。

| 来自 | 可以导入 |
|---|---|
| `shared` | `shared` |
| `host` | `shared`、`host` |
| `theme` | `shared`、`theme` |
| `ui` | `shared`、`theme`、`ui`；React / React DOM、Radix 等允许的 UI 生态包 |
| `shell` | `shared`、`theme`、`ui`、`shell`、`host`；允许的 React UI 生态包 |
| `app` | `shared`、`host`、`theme`、`ui`、`app`；模块的 `manifest.ts`、`api.ts`、`settings.ts`；`shell` 和模块的 `module.ts` 只能通过 `import()` |
| 模块 `core` | 自己的 `core` 和 `api.ts`、`shared`、其他模块的 `api.ts` |
| 模块 `platform` | 自己的 `core`、`platform`、`api.ts`；`shared`、`host`；其他模块的 `api.ts` |
| 模块 `services` | 自己的 `core`、`platform`、`services`、`contrib`、`api.ts`、`settings.ts`、`i18n.ts`；`shared`、`host`、`theme`；其他模块的 `api.ts`；`zustand/vanilla`（不含 React 绑定） |
| 模块 `contrib` | 自己的 `core`、`platform`、`contrib`、`api.ts`；`shared`、`host`；其他模块的 `api.ts` |
| 模块 `ui` | 整个模块（除 `module.ts` 和 `manifest.ts`）；`shared`、`host`、`theme`、`ui`、`shell`；其他模块的 `api.ts`；允许的 React UI 生态包（含 zustand 的 React 订阅） |
| `module.ts` | 自己的 `core`、`platform`、`services`、`contrib`、`api.ts`、`settings.ts`、`i18n.ts`、`manifest.ts`；`shared`、`host`、`theme`；其他模块的 `api.ts`；自己的 `ui` 只能通过 `import()` |
| `manifest.ts` | 自己的 `api.ts`、其他模块的 `api.ts`；自己的 `module.ts` 只能在 `load()` 里通过 `import()` |
| `api.ts` | 自己的 `core`（类型）、其他模块的 `api.ts`；只导出类型和键常量 |
| `settings.ts` | 自己的 `core`、自己的 `api.ts`；`shared`、`host`、`theme`；其他模块的 `api.ts` |
| `i18n.ts` | 不导入模块代码 |

UI 包允许列表见 [设计系统参考](../../ui/references/design-system.md)。允许服务导入 `zustand/vanilla` 不代表允许 `zustand` 的 React 绑定或 React 组件进入服务、core、shared；跨模块仍只经 `api.ts`。

检查器还强制以下规则：

- `electron`、Node 内置模块和 `window.require(...)` 只能出现在 `desktop/` 文件夹下。core 和 shared 代码不使用任何宿主包（`obsidian`、`electron`、`react`、`react-dom`、`radix-ui`、`@codemirror/*`、`@xterm/*`），也不使用 `window`、`document`、`navigator`、`process`、`HTMLElement` 这类宿主全局。
- 不要在自己的目录树内部导入包含它的桶文件（`index.ts`）。
- 运行时导入循环（包括经过懒加载导入形成的循环）会失败。

ESLint 另外规定：`desktop/` 文件夹之外不得使用 `process`、`Buffer`、`__dirname`、`__filename`、`global`。

## 启动与懒加载

插件 UI 的 esbuild 构建一个不拆分代码的 CommonJS `main.js`。独立的浏览器 utilityProcess Worker、CLI 和固定主进程桥由专门脚本构建，不作为第二个 React 入口。只能通过 `import()` 到达的 UI 文件被包进懒初始化器，首次导入时才运行；启动代码里只要有一条静态边，就会把它的整个闭包拉进启动集合。因此：

- 启动代码是 `src/app/main.ts` 及它静态导入的内容：注册表、设置运行时、清单、`api.ts` 文件、设置模式、工作台叶子（`app/workbench/workbench-leaf.ts`）、评论叶子、主题运行时和启动词典。
- React、React DOM、Radix 及组件渲染代码不得进入启动集合；`api.ts` 只保留类型和键，不能因声明设置组件或状态段而静态导入 UI。
- 打开工作台叶子时才加载 shell（`import('../../shell/host/workbench-surface')`）。
- 模块代码通过 `manifest.load()` 加载；页面和设置页在首次使用时从 `pages` / `settingsPage` 加载器加载；体积大的库（chart.js、lunar、xterm、图标数据）放在模块内部的第二层 `import()` 之后。
- 说明符必须是字面量。不要依赖导入的副作用来注册任何东西。
- `pnpm run check:bundle` 报告启动集合和每个模块的激活闭包，超出预算（`scripts/bundle-budget.json`）就失败。`--files` 按大小列出每个启动输入。

## 模块系统

`src/app/manifests.ts` 列出所有清单；`ModuleRegistry`（`src/app/modules/registry.ts`）在 `app` 命名空间里的开关打开且平台受支持时创建模块，按清单的 `order` 启用、反向停用，并隔离失败（加载、`activate` 或 `dispose` 抛错的模块进入 `failed`，在图标轨和设置里显示；其他模块继续）。开关的初始值来自清单的 `defaultEnabled`。状态有：`off`、`unsupported`、`idle`、`loading`、`active`、`disposing`、`failed`。重新启用会创建新实例。

模块之间通过以下方式通信：

`agent` 可在移动端激活可移植的 `AGENT_SKILLS` 目录；`module.ts` 在 `context.env.desktop` 为假时不创建终端控制器。技能管理器的 `AGENT_SKILL_CATALOG` 只读接口也会发布，但没有桌面能力时列表为空。终端控制器及其 desktop 依赖只在桌面分支动态加载，终端页面仍由工作台的桌面可用性守卫限制。消费者不要把目录可用误当成终端或派发服务可用。

- **服务**（所有者 `api.ts` 里的 `ServiceKey<T>`）：`peek` 只在所有者处于激活状态时返回值，从不激活它；`acquire` 激活所有者并返回租约，所有者停止时租约的 `revoked` 信号中止；`watch` 跟随可用性变化。
- **贡献点**（`ContributionPoint<T>`）：例如首页和档案贡献的自动化来源，自动化贡献的通知打开器。

契约是 `src/app/contracts/module.ts`；怎样编写模块见 `module-authoring.md`。

## 工作台

只有一个工作台视图（`app/workbench/workbench-leaf.ts` 里的 `WORKBENCH_VIEW_TYPE`）。叶子保存自己的状态，打开时加载 shell 表面。`app/workbench/compose-workbench.ts` 声明图标轨条目（功能、图标、面板、可用性），并通过 `plugin.activateModule(id)` 和 `ModuleInstance.pages` 把每个功能对应到模块页面。功能及其所属模块是 `app/contracts/workbench.ts` 里的 `WORKBENCH_FEATURES` / `FEATURE_MODULES`。目标功能列表为 `dashboard`、`terminal`、`browser`、`contacts`、`safe`、`automations`、`notifications`、`icons`、`versioning`、`revision-review`、`content`、`settings`。`terminal` 属于 `agent`，显示名称为「智能体」；`contacts` 属于 `archives`。`safe` 为桌面保险箱，按「设置 → 保险箱」的锁定规则（默认 20 分钟未操作；切换页面、关闭页面可选）锁定，退出 Obsidian 一定锁定，且不保存敏感页面状态。`browser` 是独立工作台功能，自己拥有 Space、Page 和运行进程；智能体标签只是可选查看入口。批注使用右侧栏视图，记录使用看板弹窗，不贡献独立工作台功能。shell 的 `chrome`、可选侧栏和状态栏行为见 [ui shell 参考](../../ui/references/shell.md)。

浏览器通过 `BROWSER_WORKSPACE`、`BROWSER_OPEN` 暴露工作区与打开能力，通过 `BROWSER_MATERIAL_CONSUMERS` 收集已经启用的可选材料接收方。不要从 browser 导入 Agent 的内部代码、借用 PTY SQLite helper，或从 UI 直接访问 CDP。独立 Worker 与 Rust 监督进程使用私有管道；每个 Space 绑定自己的 Chromium 用户目录、运行实例与控制代次。帧查看者不自动取得控制，跨窗口迁移只迁移查看界面。生产运行时仅开放 Linux x64，其他平台返回不支持。

另外有两种侧栏视图，都在 `main.ts` 启动时注册，使保存的叶子能恢复；对应模块关闭时显示「开启模块」的提示，模块启动后切换为模块的 React 面板：

- 评论侧栏（`app/workbench/comments-leaf.ts`，`huhu-comments-view`）：布局就绪后按设置用 `workspace.ensureSideLeaf()` 放入右侧栏，挂载评论模块的面板。
- 笔记导航器（`app/workbench/navigator-leaf.ts`，`huhu-navigator-view`）：由模块开关决定它是否存在，图标轨没有对应条目。模块启动（开关打开，或插件加载时已打开）并布局就绪后，`navigator/module.ts` 用 `ensureSideLeaf()` 确保左侧栏有一个该叶子（已有就复用，运行期间不重复放置）；开关关闭时模块的 `dispose('disabled')` 分离全部该类型叶子，插件卸载（`'unload'`）不动布局；插件加载时开关已关闭，则 `main.ts` 在布局就绪后分离恢复出来的叶子。叶子挂载导航器模块的面板，命令 `navigator-open` 可随时展开它。

侧栏叶子的快捷键：Obsidian 的全局快捷键（如 F2）先于页面监听器，导航器在窗格获得焦点时用 `Scope` 抢先处理自己的按键，其余按键仍交给 Obsidian。

## 命令

| 种类 | 位置 |
|---|---|
| shell 命令（打开工作台、打开某个模块的页面、切换主题样式、复制引用） | `src/app/commands.ts`、`src/app/copy-commands.ts`；模块的命令用 `checkCallback` 判断 `plugin.moduleState(id) === 'active'` |
| 模块命令 | 在模块内部用 `context.commands.add(...)`（停用时自动移除）；传入 `nameKey` 让名称跟随语言 |
| 其他模块必须写出的 id | `src/shared/commands.ts` 里的 `HUHU_COMMANDS` |

id 不带插件 id 前缀；名称里不写「命令」二字；没有默认快捷键。

## 状态管理

- `services/` 用 `zustand/vanilla` 的 `createStore` 创建模块仓库，随模块停止订阅与持久化；状态变换放在 `core/` 的纯函数中。
- 同模块 `ui/` 用 `useStore(store, selector)` 只读订阅并调用服务动作，不直接 `setState` 或读写磁盘。选择器返回稳定引用；数组/对象用 `useShallow` 或稳定空值。
- 跨模块服务只暴露只读快照和 `subscribe`，不把仓库对象传到其他模块。
- 业务仓库落盘用现有 `shared/json-store.ts`，防抖 500ms；失败经 `report()` 告知并保留内存状态。设置继续使用设置存储，临时 UI 状态可用组件 `useState`。
- `safe` 使用独立密文仓库和共享文件写队列：手动保存完整认证密文，禁止 JSON 合并、明文恢复草稿和未经认证的自动备份回退；页面状态不持久化敏感内容。
- `browser` 使用自己的系统密钥保护密文存储、不可变身份版本、操作账本与根目录独占所有权，不使用 `JsonStore` 的 JSON 合并或明文恢复副本。系统保护不可用时必须经用户明确同意使用临时模式；运行中的 Chromium 用户目录和文件内容不因元数据加密而变成密文。

## 持久化名称

HUHU 数据分在当前 vault 的两块根里，路径常量统一在 `src/shared/storage/vault-layout.ts`：

- `huhu/`（可见）：用户内容与资料，包括日志、闪念、收件箱、待办归档、项目管理、档案、记账/习惯/番茄钟/阅读记录、RSS、微信读书划线、默认新笔记和导出。经 Obsidian vault API 读写，会被索引、搜索和同步。
- `.huhu/`（隐藏）：HUHU 自己的配置与运行数据。其中只有 `.huhu/dashboards/`（看板布局与小组件配置）和 `.huhu/automation/definitions/`（自动化定义）是由 HUHU 自己索引的 Markdown（`ContentFiles`）。

HUHU 自动生成的文件夹和文件名不含空格，一律经 `huhuName()` 用 `-` 连接（如 `2026-10-21-1654-新备忘.md`）。当前身份不读取或导入旧品牌数据。

下表用于定位工程 owner，完整保存、例外和恢复行为由[数据与恢复](../../../../docs/data.md)说明。系统 CLI 账号、宿主 IndexedDB 与显式导出（含保险箱的加密备份）不能误归为库内数据。不可读文件不能被当作空数据覆盖。

| 数据 | 位置 | 负责方 |
|---|---|---|
| 保险箱 | `.huhu/safe/vault.enc`、`.backup` 与随机冲突/恢复前密文副本；固定 `huhu-safe` version 1 | safe |
| 设置（整库） | `.huhu/config/settings.json`（`{ version: 1, namespaces: { app, theme, home, agent, browser, automations, comments, … } }`） | app |
| 设置（本机） | `.huhu/config/devices/<device-id>.json` | app |
| 快捷命令 | 设置命名空间 `agent.quickCommands` | agent |
| 设备 id | `.huhu/config/identity.json`，库内设备映射与宿主只读身份 | host |
| 智能体工作区布局 | `.huhu/terminal-agent/<device-id>/workspace.json`（标签组、会话/页面标签，以及浏览器 Space/Page 引用；不拥有浏览器运行资料） | agent |
| 智能体工作空间 token 索引 | `.huhu/terminal-agent/<device-id>/workspace-index.sqlite`（与账号历史 `index.sqlite` 分开） | agent |
| 智能体统计 | `.huhu/terminal-agent/<device-id>/workspace-stats.json`（工作空间计数） | agent |
| 智能体历史与缓存 | `.huhu/terminal-agent/<device-id>/history.json`、`automation-sessions.json`、可重建的 `index.sqlite` | agent |
| 托管智能体账号与运行文件 | `.huhu/agents/<device-id>/accounts/<provider>/<id>/`；生命周期 Hook、配置与事件在账号内的 `runtime/` | agent |
| 系统 CLI 账号 | 沿用真实 CLI 数据根；运行事件在库内，状态 Hook 会维护用户主目录中的约定文件，见数据正文 | agent |
| 终端辅助程序 | `.huhu/helpers/<device-id>/<platform-arch>/<version>/`，官方摘要与本机受保护回执 | agent |
| 浏览器目录、操作记录与身份 | `.huhu/browser/<device-id>/v2/records/*.sealed`、`digest-key.sealed` 和 `identities/<版本 ID>.sealed` | browser |
| 浏览器运行资料与下载暂存 | 同一 `v2/` 下的 `profiles/<Space ID>/`、`downloads/<Space ID>/`，各 Space 独立 | browser |
| 浏览器受管文件 | 同一 `v2/` 下的 `files/data/<文件 ID>/<安全文件名>` 与 `files/metadata.sealed`；内容私有，元数据认证加密，上传保留文件名与扩展名 | browser |
| Cookie 导入与清理任务 | 同一 `v2/` 下的 `import-staging/<UUID>/` 与 `cleanup/import-staging.json`；回收失败保留任务 | browser |
| 浏览器运行包与本地连接 | 同一 `v2/` 下的 `runtime/`、`connections/<UUID>.json`；凭据不进入 Agent 标签状态 | browser |
| 交付给智能体的网页截图 | `.huhu/browser-materials/activation-<UUID>/`，正常停用接收模块时清理 | agent |
| 自动化定义 | `.huhu/automation/definitions/<名称>-<id>/操作.md` | automations |
| 自动化运行 | `.huhu/automation/<device-id>/runtime.json` | automations |
| 批注 | `.huhu/editor/comments/`（`index.json`、`pending.json`、`files/<hash>.json`，version 3） | comments；细则见 [编辑器批注](editor-comments.md) |
| 看板 | `.huhu/dashboards/<名称>.md`，默认 `.huhu/dashboards/dashboard.md`，采用 apex 格式，可多份 | home |
| 天气预报缓存 | `.huhu/cache/weather/` | home |
| 看板记录 | `huhu/习惯/`、`huhu/记账/`、`huhu/番茄钟/`、`huhu/阅读/`（各含 `*.json` 与 Markdown 记录） | home |
| 收件箱（含闪念） | 条目 `huhu/收件箱/YYYY-MM-DD-HHmm-标题.md`，每天的闪念 `huhu/收件箱/YYYY-MM-DD-闪念.md`（一条一行 `- HH:mm 内容`），平铺（小组件类型 id 仍为 `memo`，设置 `memoSavePath`） | home |
| 待办归档 | `huhu/待办/已完成.md`（设置 `taskArchivePath`；必须是库里可见的路径，不能以点开头） | home |
| 项目管理、RSS、微信读书划线、新笔记、导出 | `huhu/项目管理/`、`huhu/RSS/`、`huhu/微信读书/划线/`、`huhu/笔记/`、`huhu/导出/`（默认值见 `src/shared/storage/vault-layout.ts` 与 `home/core/board/default-paths.ts`） | home、agent |
| HUHU 文件页 | 浏览 `huhu/`（vault API），新建笔记落在 `huhu/笔记/` 或所选文件所在文件夹 | app |
| 看板技能库 | 不单独存储：经 `agent` 的 `AGENT_SKILL_CATALOG` 只读列出技能管理器发现的技能 | home、agent |
| 图标与规则 | `.huhu/icons/iconic.json` + `.backupN`（Iconic 模式） | icons |
| 笔记导航器元数据缓存 | 浏览器 IndexedDB 库 `huhu-navigator-<vault-id>`（可随时重建，不在 vault 目录内） | navigator |
| 笔记导航器设置 | 设置命名空间 `navigator`；显示与行为随库，布局、尺寸、展开状态和选中项在设备文件 | navigator |
| 周期笔记（日志档案） | 库内可见目录，固定结构 `<日志文件夹>/日记/YYYY/MM/YYYY-MM-DD.md`、`周记/gggg/gggg-Www.md`、`月记/YYYY/YYYY-MM.md`、`季记/YYYY/YYYY-Qq.md`、`年记/YYYY.md`；日志文件夹默认 `huhu/日志`（设置 `navigator.periodicRoot`），路径由 `src/shared/periodic-paths.ts` 的纯函数生成，导航器和看板日历共用 | navigator（看板经 `NAVIGATOR_PERIODIC` 读取） |
| 通知 | `.huhu/notifications/<device-id>/inbox.json` | notifications |
| Git 同步设备状态 | `.huhu/sync/<device-id>/<repository-hash>.json` | versioning |
| Git 同步的排除规则 | 仓库 `.gitignore` 与 `.git/info/exclude` 里带起止标记的 HUHU 托管区块（`.huhu/browser/`、`.huhu/browser-materials/`、智能体账号与运行目录、辅助程序、各设备的自动化运行、缓存、恢复、迁移、锁与临时文件；`huhu/`、`.huhu/dashboards/`、`.huhu/automation/definitions/` 不排除）；清单在 `src/modules/versioning/core/excludes.ts` | versioning |
| 恢复草稿与看板冲突 | `.huhu/recovery/drafts/`、`.huhu/recovery/dashboard/conflicts/` | 共享存储、home |
| 受管内容移动与回收 | `.huhu/content-moves/manifest.json`；恢复材料在 `.huhu/recovery/content-creates/`、`renames/`、`trash/` | host、shared |
| 缓存 | `.huhu/cache/`（微信读书进度） | home |
| 档案 | 库内可见目录（设置 `archives.rootFolder`，默认 `huhu/档案`），`huhu/档案/个人档案/<姓名>/基本信息.md`、`huhu/档案/企业档案/<名称>/基本信息.md`（姓名/名称中的空白换成 `-`），由 `app.vault` 读写，不在 `.huhu/` | archives |
| 库本地界面状态 | `.huhu/config/` 下的内部状态；叶子状态由宿主保存，业务工作区布局使用上表专用文件 | 所属模块 / shell |
| 功能区 id | `src/app/ribbon.ts` 的 `ribbon-<id>`（稳定 id，标签翻译） | app |

普通笔记、宿主数据、Git 元数据保留原位；已删除功能的旧数据不由插件清理。Obsidian Sync 不同步点开头的文件夹，`.huhu/` 需要 Git、iCloud、Syncthing 等。

## TypeScript

`strict`、`noUncheckedIndexedAccess`、`noImplicitReturns`、`useUnknownInCatchVariables`，目标 ES2021。未处理的 Promise 是错误（有意不等待时用 `void`）。不要在 Promise 回调里返回 Obsidian 的链式控件（`huhu/no-obsidian-thenable`）。文件和文件夹用 kebab-case；React 业务组件文件用 PascalCase（复制的 shadcn 组件保留上游 kebab-case）；其他文件导入的常量（视图类型、键）用 `SCREAMING_SNAKE`。只用相对路径导入。

## 档案定义领域

`archives/core/schema` 定义八类模型、字段规则与修订 DAG，`core/generic` 负责 v2 保真协议、元数据索引、查询和 v1 适配。`services/generic` 统一命令、迁移和恢复；`platform` 提供 Vault 与私有草稿适配；通用界面在 `ui/generic`，按需加载。跨模块通过 `ARCHIVES_CATALOG / ARCHIVES_QUERY / ARCHIVES_COMMANDS / ARCHIVES_WORKBENCH` 消费，Home 使用资源分类排除业务元数据。定义和恢复计划是可见业务协议，不能迁到私有缓存；真实宿主验收边界见[实施方案](../../../../docs/archives-implementation.md)。
