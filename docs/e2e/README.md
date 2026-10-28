# dev 集成分支端到端点测

环境：Obsidian **1.14.5**（`obsidian_1.14.5_amd64.deb`），插件为 `dev` 分支上 `pnpm run build` 生成的 `main.js` / `styles.css`。每次点测使用一次性测试库，经远程调试操作真实界面。截图与本报告一起提交在 `docs/e2e/`。

`pnpm run build` 通过。`pnpm run test:all` 再次通过：48 个脚本全部通过；其中 Vitest 为 **4300 passed、3 skipped、0 failed**。

## issue 与截图

| 编号 | 功能 | 截图 | 验证了什么 | 结果 |
|---|---|---|---|---|
| #7、PR #10 | 独立任务领域 | [task-create.png](task-create.png)、[task-saved.png](task-saved.png)、[dashboard-tasks.png](dashboard-tasks.png) | 打开任务工作台，填写「集成点测任务」并保存；首页看板挂载同一任务视图 | 通过。未完成计数变为 1，列表出现该任务及创建时间。首页日历旁的任务小组件显示「未完成 0」是打开看板时的空状态，随后在任务页写入成功 |
| #3、PR #13 | 档案通用化 | [archives-create.png](archives-create.png) | 打开档案，侧栏为类型树（定义设计器、迁移与恢复、个人档案、企业档案），点击新建档案 | 通过。进入通用表单，个人档案字段（名称、别名、地区、电话、邮箱等）按类型渲染，并保留值的存在状态 |
| #6、PR #11 | 高亮摘录 | [highlights.png](highlights.png) | 打开笔记，在正文划词 | 通过。出现高亮卡片「是一段可以划词高」，右侧摘录面板计数为 1，可继续记笔记和打标签 |
| #2、PR #4 | Git 笔记历史 | [versioning-history.png](versioning-history.png)、[note-history.png](note-history.png) | 测试库内两次提交后打开版本管理的历史模式，并打开笔记侧栏的历史标签 | 通过。历史列表出现 `revise note` 与 `initial note`。笔记面板的历史标签列出这两次提交和作者 |
| #12 | 保险箱与笔记完善 | [safe-created.png](safe-created.png)、[navigator.png](navigator.png) | 用主密码创建保险箱；打开笔记导航器 | 通过。保险箱进入空库，可见搜索、新增条目和立即锁定。导航器搜索框常驻，并有「在导航器中定位当前笔记」 |
| #1、PR #5、PR #14 | 独立 Agent Browser 及同页交接 | [browser-runtime-ready.png](browser-runtime-ready.png)、[browser-managed-page.png](browser-managed-page.png)、[browser-handoff.png](browser-handoff.png) | 用项目自己的安装入口装入钉死的 Linux x64 运行包，创建临时任务空间并打开本地页面，进入 Agent 控制后打开交接对话框 | 通过。运行时版本 156.0.8078.47。空间为「资料研究 / Agent 任务空间 · 运行中」，页面标题「HUHU 受管页面」，地址栏是本机夹具。交接对话框标题为「授权同页 Agent 交接」，含目标 Agent ID、外部 Run ID、Attempt ID。系统凭据保护仍不可用，因此空间按产品要求选择了临时存储 |
| `NAMEWTA/bot` | HuhuBot 聊天 | [huhubot-chat.png](huhubot-chat.png) | 用设置里的本地 Runner 路径打开 Bot 对话 | 通过。页眉状态为「就绪」，可见新建对话和「选择一个 Bot 开始对话」。没有 `HUHUBOT_DOWNLOAD_FAILED` |

## 运行包怎么准备

产品行为没有改。浏览器运行包仍必须是钉死的 Chrome for Testing `156.0.8078.47`（归档 SHA-256 `e6c94490f0b6b337225aeb2d2a5034858516b7017356980ba94f5176d8774a50`），由 `scripts/install-browser-runtime.mjs` 校验后组装，再经界面的「安装运行包」选中该目录。点测只在调用安装的那一瞬间把系统文件夹对话框的返回值换成这个目录，用的是 `scripts/obsidian-acceptance/agent-browser-v2.mjs` 已有的夹具方式，不把系统 Chrome 当成运行包。

Bot 的空 `binaryPath` 会向 `https://github.com/NAMEWTA/obsidian-huhu/releases/download/<插件版本>/huhu-bot-linux-x64` 下载。当前插件版本是 `0.0.1`，发行页没有这个附件，所以直接打开页面会得到 `HUHUBOT_DOWNLOAD_FAILED`。这是版本还没有对应发行资产，不是下载地址写错。设置项 `huhubot.binaryPath` 是产品已有的本地覆盖：旁边要有同名 `.json` 和 `.sha256`。点测用 `node scripts/build-huhu-bot.mjs --target linux-x64`（钉死的 Go `go1.26.10`）生成这三份文件，再在设置里填入绝对路径。

## 评论合成后的需求对照

#2、#3、#6 没有评论。#1 有两条评论：一条把 Hello Halo 定为必须学习的范本，一条是第二阶段实施计划。#7 有五条评论，用独立 `task` 领域取代旧的 Home 兼容和自动迁移，并补上 F01–F22。#3 正文把 P5 放在首轮之外，见 [实施方案](../archives-implementation.md)。

| 需求（含评论） | 实现 | 截图 | 结果 |
|---|---|---|---|
| #7 评论：独立任务、四类列表、创建后出现在工作台；Home 只挂载视图 | `src/modules/task`，主库 `huhu/任务/tasks.json`；无 Home 任务别名 | [task-create.png](task-create.png)、[task-saved.png](task-saved.png)、[dashboard-tasks.png](dashboard-tasks.png) | 通过。创建并保存后列表计数为 1 |
| #7 评论 F20–F22：命令在排队前复制，关闭后不交付迟到的成功 | `TaskService.execute` 在入队前复制命令；工具在资源返回后复查取消和 ready。回归在 `src/modules/task/services/boundary.test.ts` | 无单独界面。关闭任务页不会弹出「迟到成功」，失败留在工具结果里，不写成功回执 | 测试覆盖。宿主上没有可截的成功提示 |
| #3 P0–P4：自定义类型表单、可见迁移 | 通用档案 `core/generic` 与 `RecoveryCommands`。旧黄金样本已改写到这套 API，不适用的外层时间戳、日期兄弟键、关系 `status` 和旧备份路径记在实施方案 | [archives-create.png](archives-create.png) | 通过。打开的是通用个人档案表单 |
| #3 P5：CSV 导入、Lookup/Rollup、局部图谱、项目集成 | 未实现 | 无 | 正文排除在首轮之外：「P0 至 P4 组成第一轮可正式使用的重构。P5 可以按需求分批交付。关系图、复杂计算和导入不应抢在稳定身份、文件协议和迁移能力之前。」 |
| #6 P0：划词高亮、侧栏卡片、不改笔记正文 | 高亮实体与侧栏 | [highlights.png](highlights.png)、[highlights-search.png](highlights-search.png) | 通过。划词后出现色卡，侧栏可搜索 |
| #6 P1 检索与按颜色筛选 | 侧栏搜索框、颜色下拉、按文件/颜色/标签分组 | [highlights-search.png](highlights-search.png)、[highlights-filter.png](highlights-filter.png) | 通过。搜索「划词」留下该卡片；颜色筛为黄色 |
| #6 P1 批量换色、打标签、归档、删除确认 | 批量管理条 | [highlights-bulk.png](highlights-bulk.png) | 通过。可见全选、四色、标签、归档和删除 |
| #6 P1 自定义颜色 | 设置 → 编辑器 | [highlights-custom-color.png](highlights-custom-color.png) | 通过。已添加「琥珀」，并出现在侧栏颜色筛里 |
| #6 P1 导出 Markdown | `exportHighlights`，目录 `huhu/导出/高亮` | [highlights-export.png](highlights-export.png) | 通过。通知写明已导出到该目录下的 Markdown |
| #6 P2 PDF / EPUB / 可选 AI | 未实现 | 无 | 正文排除：「P2 — 单独拆分后续 Issue（不作为本 Issue 首版阻塞项）」。文末又写「建议按 P0 → P1 实现，P2 再分别开独立 Issue」 |
| #2 历史列表与笔记历史 | `src/modules/versioning` | [versioning-history.png](versioning-history.png)、[versioning-note-history.png](versioning-note-history.png) | 通过。`revise note` 与 `initial note` 同时出现在版本管理和笔记历史 |
| #2 左右对照 | Diff 布局「左右」 | [versioning-side-by-side.png](versioning-side-by-side.png) | 通过。同一文件左右两栏 |
| #2 上下对照 | Diff 布局「上下」 | [versioning-stacked.png](versioning-stacked.png) | 通过。上下两栏 |
| #2 行内对照 | Diff 布局「行内」 | [versioning-inline.png](versioning-inline.png) | 通过。同一栏里红绿相邻 |
| #2 恢复向导 | 笔记历史打开版本对比后的恢复对话框 | [versioning-restore.png](versioning-restore.png) | 通过。标题「恢复此版本？」，三步为检查点、核对编辑器、应用版本 |
| #1 / PR #5：独立任务空间、受管 Chromium、Agent 控制 | 浏览器模块 + 钉死运行包 | [browser-managed-page.png](browser-managed-page.png) | 通过。空间运行中，页面已打开，状态为 Agent 控制 |
| #1 评论 / PR #14：同页交接对话框 | `HandoffAgentButton`，只在任务空间且 Agent 持有控制权时出现 | [browser-handoff.png](browser-handoff.png) | 通过。对话框真实打开 |
| Bot 聊天页在 Runner 就绪后打开 | 本地覆盖路径，不改下载规则 | [huhubot-chat.png](huhubot-chat.png) | 通过。状态为就绪 |

## Issue #1 第二阶段计划（评论第 0–17 章）

这 18 节是实施合同，不是 18 个新页面。能在本环境点开的界面已有截图。协议、账本、原生隔离由既有测试覆盖。Windows/macOS 运行包、系统凭据库、真实输入法组字不在这台 Linux 容器里，不能冒充已点测。

| 章 | 在 dev 上的实现 | 证据 |
|---|---|---|
| 0 继续什么 | 独立浏览器、单 writer、同页交接已在 `src/modules/browser` | [browser-managed-page.png](browser-managed-page.png)、[browser-handoff.png](browser-handoff.png) |
| 1 引用与基线 | 代码入口仍是 `api.ts`、`workspace.ts`、`operation-ledger.ts`、`run-events.ts`、desktop runtime | 静态对照。不是界面 |
| 2 分支合同 | 当时要求从 `NAMEWTA/1236` 开分支。后续指示改为只在 `dev` 上集成，没有另开分支，也没有动 `main` | 过程约束，无界面 |
| 3 对现有实现的判断 | 账本、事件流、材料接口保留在上述服务里，没有另起一套浏览器 | 同上 |
| 4 FR-01～28 | 模块、Space、只读/接管、交接、身份与文件页都在现有工作台 | 空间与交接见上；身份种子和文件是同一页的标签，见 [browser-runtime-ready.png](browser-runtime-ready.png) |
| 5 架构职责 | 仍是一套 Workspace / Worker / 原生 Gate / 独占 Chromium，没有第二套 UI 框架 | 运行时版本 156.0.8078.47，见 [browser-managed-page.png](browser-managed-page.png) |
| 6 同页接力 | `handoffAgent` 与交接对话框。确认后不重新打开 URL | [browser-handoff.png](browser-handoff.png) |
| 7 感知与动作 | `driver.ts` 的观察、引用和截图。本环境能看到受管页第一帧 | [browser-managed-page.png](browser-managed-page.png)。遮挡、OOPIF、输入法没有在这台机器上逐项点测 |
| 8 工具与账本 | `operation-ledger.ts`、`protocol-service.ts`、CLI。prepare/execute/unknown 由测试锁定 | 无单独按钮。替代验证是浏览器协议测试 |
| 9 身份、文件、安全 | 身份种子、文件标签和临时空间同意都在产品界面里。系统凭据库在此环境不可用，所以新空间必须选临时存储 | [browser-runtime-ready.png](browser-runtime-ready.png)、[browser-managed-page.png](browser-managed-page.png) |
| 10 Hello Halo 阅读包 | 产品按 Halo 的业务边界实现（观察、接管、交接、材料），没有把 Electron webview 拷进 Obsidian | 行为见交接与受管页截图 |
| 11 阶段 P0–P7 | 合同、运行时、交接和恢复已经落在现有模块。P2 的 Windows/macOS 门禁保持「仅 Linux x64 已验证」 | 本机只能证明 Linux x64 |
| 12 开发分工 | 过程说明，不是产品功能 | 无界面 |
| 13 验收合同 | 同页交接、受管页、临时空间已点测。多窗口、真实 Bot 工具链、性能预算不在这次点测里 | 截图加上 `pnpm run test:all` 里的浏览器测试 |
| 14 文档与迁移 | `docs/browser.md` 等保持现有协议。没有把旧 sync 数据改成浏览器数据 | 文档，不是新界面 |
| 15 PR 门禁 | 集成 PR 仍是 #15，不合并、不关闭 issue | 过程 |
| 16 启动指令 | 历史操作步骤。当前工作在 `dev` | 过程 |
| 17 七个交付问题 | 相对 1236 的浏览器改动已含在 `dev`；同页交接保持原页面；旧连接在交接后失效由交接文案和 `handoffAgent` 测试说明。Windows 与系统凭据仍未验证 | 见上表截图 |
