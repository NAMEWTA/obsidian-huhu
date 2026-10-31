---
name: dev
description: >-
  修改或审查本仓库插件实现、设置、持久化、测试、依赖、构建和发布配置时使用。
  负责模块边界、懒加载、i18n、数据归属与质量验证；界面渲染同时参照 ui。
  普通产品问答、只读资料查询和未涉及工程规则的文档修订不触发开发流程。
license: LicenseRef-HUHU-1.0
metadata:
  short-description: 插件开发规则
  adapted-from: https://github.com/gapmiss/obsidian-plugin-skill (MIT, skill version 1.11.0, eslint-plugin-obsidianmd v0.4.x)
---

# 插件开发

本技能只适用于本仓库。当前实现见[架构总览](../../../docs/architecture.md)，技术栈规则见 [ui 技能](../ui/SKILL.md)。它改编了 `metadata.adapted-from` 所列的 Obsidian 插件规则；两者冲突时以本文为准。不要新建插件脚手架、不要再更改插件 id、不要把仓库改成网页应用。

## 按任务读取

从下表选择与本次改动有关的参考和章节；不因文件互相链接而展开整套资料。只读审查不执行实现收尾，普通任务的授权和完成标准见根 [AGENTS.md](../../../AGENTS.md)。

| 要做的事 | 打开 |
|---|---|
| 查领域术语、架构决定或当前基线 | [开发文档索引](../../../docs/architecture.md) |
| 移动文件、跨区导入、添加命令、涉及持久化名称 | [references/architecture.md](references/architecture.md) |
| 添加模块、工作台页面、服务或设置页 | [references/module-authoring.md](references/module-authoring.md) |
| 修改 Task 命令、时间/重复规则、公共 API 或 AI 工具 | [Task 领域设计](../../../docs/task-domain.md)，尤其是公共接口与异步边界契约 |
| 添加或修改设置、界面文案或语言规则 | [references/settings-and-i18n.md](references/settings-and-i18n.md) |
| 调用 Obsidian API，或修改 DOM、CSS、计时器 | [references/obsidian-api.md](references/obsidian-api.md) |
| 在工作台里渲染页面、面板或对话框 | [../ui/SKILL.md](../ui/SKILL.md) |
| 涉及评论、高亮或 `.huhu/editor/` | [references/editor-comments.md](references/editor-comments.md) |
| 选择或编写测试，或运行真实 Obsidian 探针 | [references/testing.md](references/testing.md) |
| 构建、检查预算、升版本或发版 | [references/build-and-release.md](references/build-and-release.md) |
| 添加依赖、改编外部代码或修改终端 | [references/licensing.md](references/licensing.md) |
| 修改本技能负责的事实，或编辑技能本身 | [references/skill-maintenance.md](references/skill-maintenance.md) |

## 身份

| | |
|---|---|
| 显示名称 | `HUHU` |
| 插件 id | `huhu` |
| 视图类型 | `huhu-workbench-view`（工作台）、`huhu-comments-view`（评论侧栏）、`huhu-navigator-view`（笔记导航器，左侧栏） |
| 模块 | `home`、`task`、`agent`、`huhubot`、`browser`、`archives`、`automations`、`notifications`、`icons`、`comments`、`navigator`、`versioning`、`safe` |
| `minAppVersion` | `1.13.0`（不要使用标注 `@since 1.13.1` 或更高的 API） |
| `isDesktopOnly` | `false` |
| 许可证 | HUHU Source Available License 1.0（`LICENSE`）；商用须书面授权；第三方许可见 `NOTICE` 与 `THIRD-PARTY-NOTICES.md` |
| 入口 | `src/app/main.ts` → 提交到仓库的 `main.js` |
| 样式 | 一个提交到仓库的 `styles.css`，由 `src/styles.json` 列出的作者文件拼接而成 |
| 原生辅助程序 | `native/pty-server`（Rust `huhu-pty`）与 `native/huhubot`（Go `huhu-bot` 底座），独立构建/测试，二进制仅作发行资产，不提交源码库 |

版本号在 `manifest.json`；升版本的方法见 `references/build-and-release.md`。

## 硬性规则

1. 只注册上面的三种视图类型：工作台，以及评论和笔记导航器两个侧栏视图（各由对应模块挂载面板，模块关闭时显示开启提示）。产品页面是模块通过 `pages` 返回的工作台页面；「在新标签页／分屏打开」打开的是专注模式的工作台叶子，不是另一种视图类型。
2. 代码按区组织（`app`、`shell`、`ui`、`theme`、`host`、`shared`、`modules/<id>/{core,platform,services,contrib,ui}`）。导入遵守 `references/architecture.md` 里的矩阵，类型导入也算；`pnpm test:architecture` 对任何违规都会失败。模块之间只通过对方的 `api.ts` 互相访问。
3. 模块代码是懒加载的。启动代码（`app`、清单、`api.ts`、启动词典）不得静态导入模块的 `module.ts`、`core`、`platform`、`services`、`contrib` 或 `ui`，`module.ts` 也不得静态导入自己的 `ui/`。`pnpm run check:bundle` 检查启动预算和各模块预算。
4. 模块自己启动、自己停止。它创建的一切都在 `dispose()` 里，或通过 `context.lifetime`、`context.commands`、`context.editor` 释放；关闭模块后不得留下监听器、命令、编辑器扩展、body 类名或进程。一个模块失败不影响其他模块。
5. 设置是设置存储里的命名空间：用 `context.settings.bind(name, schema)` 绑定模块的模式，用 `update` 修改值。不要新增平铺的插件设置，也不要调用 `saveData`。
6. HUHU 库内数据分两块根：用户内容与资料（日志、闪念、收件箱、档案、记账等记录、RSS 等）在可见的 `huhu/`，经 vault API 读写；配置、身份、运行状态、看板与自动化定义（`.huhu/dashboards/`、`.huhu/automation/definitions/`）、浏览器 Cookie/缓存/下载、托管 CLI 账号/HOME/临时目录/Hook、加密保险箱（`.huhu/safe/`）及 helper 在隐藏的 `.huhu/`，按领域、设备和身份隔离。路径常量统一在 `src/shared/storage/vault-layout.ts`，自动生成的文件名不含空格。Bot Profile 使用独立 OS 本机数据根，系统 CLI 账号沿用本机目录，系统状态 Hook、导航器 IndexedDB 缓存及显式导出有已实现的例外，见[数据边界](../../../docs/data.md#库之外的数据)。插件目录仅保留宿主加载资产及发行许可声明；普通笔记、宿主数据和 Git 元数据不搬迁。评论从不改写笔记。看板、档案、自动化和记录由黄金样本锁定，评论旁路文件由评论测试锁定，`iconic.json` 由 Iconic 移植测试锁定。格式只在有意变更时修改并同步样本；当前身份只使用 huhu/ 与 .huhu/，不读取或迁移旧品牌数据；数据格式变化必须有意实施并同步相关样本。
7. 每条面向用户的文案都通过 `t()`，在模块自己的 `i18n.ts` 里同时提供 `en` 和 `zh`，在 `module.ts` 加载时注册。`src/shared/i18n/` 里的启动词典只放启动代码读取的键。
8. Node 和 Electron 只在 `desktop/` 文件夹里使用，且只在桌面端到达。core 和 shared 代码完全不使用宿主包。
9. 代码检查零警告通过（`pnpm run lint`）。不要为此关闭规则；修改代码，或在 `eslint.config.mts` 里记录带理由的局部例外。
10. 终端代码是为 HUHU 编写的。不得复制或改写 GPL 许可的终端项目的代码；允许的参考来源见 `references/licensing.md`。
11. 范围、提交授权和文档语言遵守根 [AGENTS.md](../../../AGENTS.md)，不在本技能另设一套规则。
12. 修改本技能负责的事实时，在同一次变更里更新负责它的那一份文件（`references/skill-maintenance.md`）。

## 完成之前

按 [references/testing.md](references/testing.md) 选择验证和需要重建的产物。已通过的检查在输入、环境和风险未变时复用。把必要产物留在工作区；获得提交授权后与源码一起提交。

## 检查清单

只检查本次触及的约束；不适用项不产生额外任务。

- 视图、导入或启动边界变化：核对视图契约、架构和包体。
- 生命周期变化：核对关闭、重开及失败路径的资源释放。
- 新增或修改产品文案：所属词典保留 en/zh。
- 持久化变化：保持格式兼容，或按有意变更更新样本与相关文档。
- 构建输入变化：适用检查通过，产物与源码一致。
