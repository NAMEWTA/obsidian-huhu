# dev 集成分支端到端点测

环境：Obsidian **1.14.5**（`obsidian_1.14.5_amd64.deb`），插件为 `dev` 分支上 `pnpm run build` 生成的 `main.js` / `styles.css`。每次点测使用一次性测试库，经远程调试操作真实界面。截图与本报告一起提交在 `docs/e2e/`。

`pnpm run build` 通过。`pnpm run test:all` 通过：48 个脚本全部通过；其中 Vitest 为 **4300 passed、3 skipped、0 failed**。

## 模型

用户指定整体前端交互设计和疑难问题使用 Opus 5.5。切换被系统拒绝，原因是额度，不是需求变更。因此下面这些界面和疑难点测都不是 Opus 5.5 做的，仍由当时已经在跑的模型完成：高亮检索、筛选、批量、自定义色和导出；版本对照和恢复向导；受管浏览器、同页交接、遮挡拒绝、跨域 iframe 点击、分窗批注、弹出窗口和输入法尝试。本文不把这些结果写成 Opus 5.5 的设计或修复。

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
| #7 评论 F20–F22：命令在排队前复制，关闭后不交付迟到的成功 | `TaskService.execute` 在入队前复制命令；工具在资源返回后复查取消和 ready。回归在 `src/modules/task/services/boundary.test.ts` | [task-module-closed.png](task-module-closed.png) | 仅测试覆盖迟到拒绝。点保存后立刻关闭任务模块，页面变成「此功能已关闭，原有数据仍然保留」，界面上没有「任务已保存」。这次写入在关闭前已经落盘，所以截图只证明关闭后不出现成功提示。产品界面本来也不渲染这句文案。入队后修改参数、以及模块卸载后拒绝迟到成功，仍然只在 `boundary.test.ts` 里 |
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
| 7 感知与动作 | 被挡住的元素点击会拒绝，并在工作台显示原因。页外按钮和跨域 iframe 里的按钮分属不同 frame，可以分别点中 | [browser-occluded-refused.png](browser-occluded-refused.png) 显示「该元素被挡住了。点击已被拒绝，页面没有因此改变。」[browser-click-outside.png](browser-click-outside.png) 点中页外按钮。[browser-click-inside.png](browser-click-inside.png) 点中另一个 frame 里的框内按钮。输入法组字没有完成，见下方说明 |
| 8 工具与账本 | `operation-ledger.ts`、`protocol-service.ts`、CLI。prepare/execute/unknown 由测试锁定 | 无单独按钮。替代验证是浏览器协议测试 |
| 9 身份、文件、安全 | 身份种子、文件标签和临时空间同意都在产品界面里。系统凭据库在此环境不可用，所以新空间必须选临时存储 | [browser-runtime-ready.png](browser-runtime-ready.png)、[browser-managed-page.png](browser-managed-page.png) |
| 10 Hello Halo 阅读包 | 产品按 Halo 的业务边界实现（观察、接管、交接、材料），没有把 Electron webview 拷进 Obsidian | 行为见交接与受管页截图 |
| 11 阶段 P0–P7 | 合同、运行时、交接和恢复已经落在现有模块。P2 的 Windows/macOS 门禁保持「仅 Linux x64 已验证」 | 本机只能证明 Linux x64 |
| 12 开发分工 | 过程说明，不是产品功能 | 无界面 |
| 13 验收合同 | 两篇笔记分到主窗口和弹出窗口，各自划词。主窗口侧栏只有乙笔记的卡片 | [comments-window-a.png](comments-window-a.png) 是甲笔记及其高亮。[comments-window-b.png](comments-window-b.png) 是乙笔记，侧栏摘录只有乙。同一次真实启动里，打开首页工作台计时为 135.1 ms 和 182.4 ms。Issue 写的撤销确认 p95 ≤ 300 ms、输入到新画面 p95 ≤ 250 ms 没有做多次样本，不能把这两次打开工作台当成那两项已达标 |
| 14 文档与迁移 | `docs/browser.md` 等保持现有协议。没有把旧 sync 数据改成浏览器数据 | 文档，不是新界面 |
| 15 PR 门禁 | 集成 PR 仍是 #15，不合并、不关闭 issue | 过程 |
| 16 启动指令 | 历史操作步骤。当前工作在 `dev` | 过程 |
| 17 七个交付问题 | 相对 1236 的浏览器改动已含在 `dev`；同页交接保持原页面；旧连接在交接后失效由交接文案和 `handoffAgent` 测试说明。Windows 与系统凭据仍未验证 | 见上表截图 |

## 输入法

已安装 `ibus` 和 `ibus-libpinyin`，守护进程能起来，`ibus engine` 显示当前引擎是 `libpinyin`。`ibus engine libpinyin` 这次返回失败，dconf 也报 `unix:path` 地址写不进去。用 xdotool 向 Obsidian 发送 `nihao` 时，字母直接进了笔记正文，没有候选框，也没有变成「你好」。截图 [ime-composition.png](ime-composition.png)。所以真实组字没有完成：XTest 按键没有走进 ibus 的组字，Electron 这次也没有把这些键交给输入法。

## PR 提交是否都在 dev

用 `git merge-base --is-ancestor` 核对每个 PR 在 GitHub 上列出的全部提交。基准是当前 `dev`。七个 PR 的 tip 都是 `dev` 的祖先，列出的提交没有缺在 `dev` 之外的，因此没有再合并。

| PR | head | 列出的提交 | 结论 |
|---|---|---|---|
| #10 | `refactor/task-domain-7` @ `c648219` | 8 | 都在 `dev` |
| #11 | `NAMEWTA/6` @ `a735355` | 33 | 都在 `dev` |
| #12 | `fix/safe-notes-polish-20261028` @ `6849c91` | 3 | 都在 `dev` |
| #13 | `feat/archives-definition-domain-3` @ `cbf5209` | 6 | 都在 `dev` |
| #14 | `feat/browser-phase2-issue-1` @ `9396254` | 18 | 都在 `dev` |
| #4 | `feat/git-note-history-issue-2` @ `b9f3891` | 1 | 都在 `dev` |
| #5 | `feat/independent-agent-browser-issue-1` @ `206abb5` | 5 | 都在 `dev` |

## 本轮合并核对

2026-10-29 07:53（台北）重新 `git fetch` 之后，除 `origin/NAMEWTA/terminal` 以外，每个远程分支的 tip 都已经是 `dev`（`31e5404`）的祖先。对 `origin/main` 以及 `feat/archives-definition-domain-3`、`feat/browser-phase2-issue-1`、`feat/git-note-history-issue-2`、`feat/independent-agent-browser-issue-1`、`fix/safe-notes-polish-20261028`、`NAMEWTA/1236`、`NAMEWTA/6`、`NAMEWTA/bot`、`refactor/task-domain-7` 执行 `git merge --no-edit`，结果都是 Already up to date。没有新的合并提交，也没有冲突要解。`origin/NAMEWTA/terminal`（`6016789`）按要求排除，不是 `dev` 的祖先。

开放的 PR #4、#5、#10、#11、#12、#13、#14 的 head 都在上面这些分支里。PR #15 就是 `dev` 对 `main`，保持打开，没有合并，也没有关闭任何 issue 或 PR。`main` 没有被推送或改写。

插件源码相对 `31e5404` 没有再改。随后在 Obsidian 1.14.5 的一次性库里重跑了关键功能。这次点测把首页模块关掉了：上一次把首页留在默认开启时，150 秒内工作台没有出现，当时首页模块仍停在激活中。下面六张是这次关掉首页后新截的，快速切换框已关掉。

| 功能 | 截图 | 结果 |
|---|---|---|
| 任务 | [recheck-task.png](recheck-task.png) | 通过。新建并保存「合并后点测任务」，未完成计数为 1 |
| 档案 | [recheck-archives.png](recheck-archives.png) | 通过。打开个人档案，侧栏有定义设计器、迁移与恢复、个人档案和企业档案，表格列是名称、别名、地区、电话、邮箱 |
| 高亮 | [recheck-highlight.png](recheck-highlight.png) | 通过。正文「这是一段可以划词高亮的正文」被标黄，侧栏为高亮 (1)，卡片是同一句 |
| 版本历史 | [recheck-versioning.png](recheck-versioning.png) | 通过。历史模式列出 `revise note` 和 `initial note` |
| HuhuBot | [recheck-bot.png](recheck-bot.png) | 通过。本地 Runner 路径下状态为「就绪」，可见「选择一个 Bot 开始对话」，没有 `HUHUBOT_DOWNLOAD_FAILED` |
| 浏览器 | [recheck-browser.png](recheck-browser.png) | 通过。安装钉死的运行包后进入浏览器工作台。页面写明系统凭据保护不可用，空间列表仍是空的「创建浏览器空间以开始使用」。受管页面和同页交接仍以前面的 [browser-managed-page.png](browser-managed-page.png)、[browser-handoff.png](browser-handoff.png) 为准 |

## 第二轮复测

2026-10-29（台北）在 `dev` 上重测。实际使用的模型是 **grok-4.7 xhigh**。环境仍是 Obsidian 1.14.5 和一次性库。`pnpm run build` 通过，`pnpm run lint` 零警告通过。`pnpm run test:all` 通过：48 个脚本全部通过；其中 Vitest 为 **4301 passed、3 skipped、0 failed**。比上一轮多出的 1 条是首页 Cookie 恢复时限的回归测试。

### 首页不再卡住工作台

根因在 `NeteaseAccount.restore()`。首页启动时会读网易云 Cookie。这台环境没有可用的系统凭据服务，`cookies.get` 一直不返回，首页停在 loading，插件要等启动模块结束才赋值工作台。会话目录当时已经验证完成，所以不是会话创建本身。

修复是桌面端这次可选恢复最多等 5 秒。超时后保持未登录，不弹通知，后到的 Cookie 不能登录。计时器用所属窗口。诊断、规格和决定在 `.agents/speculo/.speculo/specdev/changes/2026-10-29-home-cookie-restore-deadline/`。

本轮把全部模块都打开。进度记录在 08:55（台北）仍看到 home 为 loading、工作台还没有；约一分钟内脚本已经打开看板、做完 20 次打开计时并创建了任务。随后强行退出再打开，任务还在，各模块开关仍是开启，页面错误钩子为空。[round2-home.png](round2-home.png) 是首页看板。[round2-restart.png](round2-restart.png) 是重启后的「第二轮任务」。

### 工作台打开耗时

20 次都是：先留下一篇 Markdown，关掉本窗口的工作台叶子，再打开首页。样本（毫秒）：132.2、31.5、31.5、30、29.7、29.7、32.6、34.8、31.4、42、37、49、35.1、48.8、58.8、39.7、36.4、43.2、36.3、47.4。

按从小到大排序后，p95 取第 `ceil(0.95 × 20)` 个，是 **58.8 ms**。中位 36.3 ms，最小 29.7 ms，最大 132.2 ms。见 [round2-perf.png](round2-perf.png)。

这只是工作台打开耗时。撤销确认和输入到新画面的 20 次采样在下面的补测里，两项 p95 都低于预算。

### 验收对照

| 验收项 | 结果 | 截图 |
|---|---|---|
| 全部模块开启后工作台出现，首页为 active | 通过。browser、home、task、comments、navigator、archives、agent、icons、notifications、automations、versioning 为 active；safe、huhubot 按需 idle。错误钩子为空 | [round2-home.png](round2-home.png) |
| 任务创建 | 通过。「第二轮任务」，未完成 1 | [round2-task.png](round2-task.png) |
| 停用再启用任务模块 | 通过。关闭后是「此功能已关闭，原有数据仍然保留」，重新打开后任务还在 | [round2-task-off.png](round2-task-off.png) |
| 重启后任务和模块开关还在 | 通过。磁盘上的 `huhu/任务/tasks.json` 有这条任务，界面也能看到。home、task、archives、comments、versioning、browser、safe、huhubot 仍为开启 | [round2-restart.png](round2-restart.png) |
| #7 F20–F22 迟到成功 | 补测已在真实 Obsidian 进程里复现。入队后改标题仍保存「入队前的标题」；卸载任务模块后，被挡住的搜索返回 `unavailable`。工作台没有能按住资源查询的按钮，所以这一步是进程内复现，单测仍在 `boundary.test.ts` | [round2f-task-f20.png](round2f-task-f20.png)、[round2f-task-f20-closed.png](round2f-task-f20-closed.png) |
| #3 个人档案列表 | 通过。定义设计器、迁移与恢复、个人档案、企业档案；列是名称、别名、地区、电话、邮箱 | [round2-archives.png](round2-archives.png) |
| #3 定义设计器 | 通过 | [round2-archives-designer.png](round2-archives-designer.png) |
| #3 关系类型 | 通过。设计器里新建「关系类型」，可见源端、目标端和两端类型 | [round2-archives-relation.png](round2-archives-relation.png) |
| #3 迁移与恢复 | 通过。只读预检后向旧档追加「故障注入」再迁移，页面报「操作已停止，草稿仍保留。 write-conflict」，旧档仍是 `huhu-type: person` | [round2f-archives-preflight.png](round2f-archives-preflight.png)、[round2f-archives-migration-fault.png](round2f-archives-migration-fault.png) |
| #3 新建档案表单 | 通过。名称写入「第二轮档案」并保存，文件落在 `huhu/档案/个人档案/第二轮档案-e53614e4-9bfc-46d0-96c3-dd9f761c9bcd/基本信息.md` | [round2f-archives-form.png](round2f-archives-form.png)、[round2f-archives-saved.png](round2f-archives-saved.png) |
| #3 P0–P1 文件协议里不能在界面上逐项点的规则 | 由改写后的黄金测试锁定，不是这次新点出来的页面 | 无新截图 |
| #3 P5 | 未做。正文：「P0 至 P4 组成第一轮可正式使用的重构。P5 可以按需求分批交付。关系图、复杂计算和导入不应抢在稳定身份、文件协议和迁移能力之前。」CSV 导入、Lookup/Rollup、局部图谱、项目集成都没有实现 | 无 |
| #6 划词高亮 | 通过。侧栏高亮 (1)，卡片是划中的句子 | [round2-highlight.png](round2-highlight.png) |
| #6 搜索 | 通过。搜索框里是「划词」，卡片还在 | [round2-highlight-search.png](round2-highlight-search.png)、[round2-highlight-bulk.png](round2-highlight-bulk.png) |
| #6 按颜色筛选 | 通过。点击「按颜色筛选」后按向下键和回车，选中值是 `yellow`、标签是「黄色」。侧栏只剩黄色句子 | [round2f-highlight-filter.png](round2f-highlight-filter.png) |
| #6 批量 | 通过。已选 1 条，可见全选、四色、标签、归档、删除 | [round2-highlight-bulk.png](round2-highlight-bulk.png) |
| #6 自定义颜色 | 通过。设置里增加了「琥珀」 | [round2-highlight-color.png](round2-highlight-color.png) |
| #6 导出 Markdown | 通过。通知写着已导出到 `huhu/导出/高亮/highlights-2026-10-29T02-18-47-939Z.md`。文件含黄色句子和 `Color: yellow`，不含蓝色句子，打开后内容一致 | [round2f-highlight-export-notice.png](round2f-highlight-export-notice.png)、[round2f-highlight-export-file.png](round2f-highlight-export-file.png) |
| #6 P2 | 未做。正文把 PDF、EPUB 和可选 AI 排除在首版之外 | 无 |
| #2 历史列表 | 通过。`revise note` 与 `initial note` | [round2-versioning.png](round2-versioning.png) |
| #2 左右对照 | 通过。同一文件左右两栏 | [round2-versioning-side.png](round2-versioning-side.png) |
| #2 上下对照 | 通过。上下两栏 | [round2-versioning-stacked.png](round2-versioning-stacked.png) |
| #2 行内对照 | 通过。`.huhu-versioning-diff` 的 `data-layout` 为 `unified`，行内单选为选中，对照区只有一个编辑器，新增行以行内绿底显示 | [round2f-versioning-inline.png](round2f-versioning-inline.png) |
| #2 恢复向导 | 通过。历史列出 `revise note` 与 `initial note`。确认「恢复此版本？」后，`共同笔记.md` 不再含蓝色句子，页面为「已恢复」；撤销后蓝色句子回到文件，页面为「已撤销恢复」 | [round2f-versioning-history.png](round2f-versioning-history.png)、[round2f-versioning-restore.png](round2f-versioning-restore.png)、[round2f-versioning-restored.png](round2f-versioning-restored.png)、[round2f-versioning-undo.png](round2f-versioning-undo.png) |
| 保险箱 | 通过。主密码创建后进入空库，可见搜索、新增条目、立即锁定 | [round2-safe.png](round2-safe.png) |
| HuhuBot | 通过。本地 Runner 下状态为「就绪」，没有 `HUHUBOT_DOWNLOAD_FAILED` | [round2-bot.png](round2-bot.png) |
| #1 系统凭据不可用 | 通过界面提示。文案是「系统凭据保护不可用，创建新空间需明确选择临时存储。」这台环境没有系统钥匙串，不能验证持久凭据库 | [round2-browser-credentials.png](round2-browser-credentials.png) |
| #1 遮挡点击 | 通过。`pageAction` 返回 `browser_element_obscured`，横幅是「该元素被挡住了。点击已被拒绝，页面没有因此改变。」 | [round2-browser-occluded.png](round2-browser-occluded.png) |
| #1 页外按钮 | 通过。页面变成「页外已点击」 | [round2-browser-outside.png](round2-browser-outside.png) |
| #1 跨域 iframe | 通过。点击框内按钮后，框内变成绿色「框内已点击」，外层镜像同步，页外状态仍是「页外未点击」 | [round2f-browser-inside.png](round2f-browser-inside.png)、[round2f-browser-inside-page.png](round2f-browser-inside-page.png) |
| #1 同页交接 | 通过。空间先处于暂停，点「交回 Agent」后控制权变为 Agent，再点「转交给另一个 Agent」。对话框标题是「授权同页 Agent 交接」，含目标 Agent ID、外部 Run ID、Attempt ID。对话框后面还开着快速切换，不影响对话框本身 | [round2-browser-handoff.png](round2-browser-handoff.png) |
| #1 弹出窗口 | 通过。主窗口和弹出窗口打开同一篇 `共同笔记.md`，两侧都有黄、蓝两张卡片。主窗口先选中时弹出窗口还不是「已选 1 条」，弹出窗口自己选中后也显示「已选 1 条」 | [round2f-popout-main.png](round2f-popout-main.png)、[round2f-popout-window.png](round2f-popout-window.png) |
| 输入法组字 | Obsidian 编辑器没有出现系统候选窗。同一套 IBus 在独立 GTK 输入框里可以弹出候选。见补测 | [round2f-ime-candidates.png](round2f-ime-candidates.png)、[round2f-ime-gtk-candidates.png](round2f-ime-gtk-candidates.png) |
| Windows / macOS 浏览器运行包 | 未验证。这台机器只有钉死的 Linux x64 运行包。系统钥匙串同样无法在本机验证 | 无 |

### 补测原先未验证的项

2026-10-29 10:18（台北）在同一台 Obsidian 1.14.5 一次性库里补测。实际模型仍是 **grok-4.7 xhigh**。机器是 Linux x64、4 核 Xeon、约 16003 MiB。浏览器空间用的是钉死的 Linux 运行包。这次没有改插件源码，所以没有新的修复提交。

性能各采 20 次。p95 是从小到大排序后的第 `ceil(0.95 × 20)` 个。撤销确认量的是 `runtime.setControl(undefined)` 返回撤销应答的耗时；输入到新画面量的是人工点击开始，到带上这次输入序号的画面出现。

| 指标 | n | 中位数 | p95 | 最大值 | 预算 | 结果 |
|---|---|---|---|---|---|---|
| 撤销确认 | 20 | 3.4 ms | 5.8 ms | 7.8 ms | ≤ 300 ms | 达标 |
| 输入到新画面 | 20 | 42.9 ms | 44.5 ms | 53.2 ms | ≤ 250 ms | 达标 |

输入画面见 [round2f-browser-perf.png](round2f-browser-perf.png)，页面文字是「已输入 20」。

| 补测项 | 结果 | 截图 |
|---|---|---|
| 高亮按颜色筛选 | 通过。真实下拉：点开「按颜色筛选」，向下键再回车。选中值 `yellow`，显示「黄色」，侧栏只留黄色卡片 | [round2f-highlight-filter.png](round2f-highlight-filter.png) |
| 高亮导出 Markdown | 通过。右上角通知给出 `huhu/导出/高亮/highlights-2026-10-29T02-18-47-939Z.md`。打开后是黄色句子和 `Color: yellow` | [round2f-highlight-export-notice.png](round2f-highlight-export-notice.png)、[round2f-highlight-export-file.png](round2f-highlight-export-file.png) |
| 行内对照 | 通过。`data-layout="unified"`，一个编辑器 | [round2f-versioning-inline.png](round2f-versioning-inline.png) |
| 笔记历史恢复向导 | 通过。先有 `initial note` 和 `revise note`。[round2f-versioning-history.png](round2f-versioning-history.png) 是列表。[round2f-versioning-restore.png](round2f-versioning-restore.png) 是「恢复此版本？」。确认后文件去掉蓝色句子，状态为「已恢复」。对照区右侧仍是恢复前的固定快照，并提示来源笔记已变。[round2f-versioning-undo.png](round2f-versioning-undo.png) 是「已撤销恢复」，文件里蓝色句子回到原处 | 见左 |
| 弹出窗口两侧批注 | 通过。两侧路径都是 `共同笔记.md`。主窗口选中时弹出窗口尚未显示「已选 1 条」，弹出窗口自己选中后才显示 | [round2f-popout-main.png](round2f-popout-main.png)、[round2f-popout-window.png](round2f-popout-window.png) |
| 跨域 iframe | 通过。框内绿色区域写着「框内已点击」，页外仍是「页外未点击」 | [round2f-browser-inside.png](round2f-browser-inside.png)、[round2f-browser-inside-page.png](round2f-browser-inside-page.png) |
| #7 F20–F22 | 通过（进程内）。`tasks.execute` 返回前把命令改成别的标题，保存下来的仍是「入队前的标题」，不存在 `task:changed-after-queue`。随后挡住档案 `list`，调用 `task.resources.search`，在它返回前 `setModuleEnabled('task', false)`。结果是 `{ok:false, error:{code:'unavailable', message:'Task repository is not ready'}}`。关闭页见截图。重新打开后标题仍是入队前的标题。工作台没有按钮能按住这次查询，所以界面上只能看到关闭页和入队前标题；单测 `src/modules/task/services/boundary.test.ts` 保留 | [round2f-task-f20-closed.png](round2f-task-f20-closed.png)、[round2f-task-f20.png](round2f-task-f20.png) |
| #3 新建并保存 | 通过。名称「第二轮档案」写入后保存，记录页标题和名称字段都是这个名字 | [round2f-archives-form.png](round2f-archives-form.png)、[round2f-archives-saved.png](round2f-archives-saved.png) |
| #3 迁移故障 | 通过。只读预检后向 `huhu/档案/个人档案/故障样本/基本信息.md` 追加「故障注入」，再点「准备并迁移」。红色提示是「操作已停止，草稿仍保留。 write-conflict」。旧档仍含 `huhu-type: person` 和「故障注入」 | [round2f-archives-preflight.png](round2f-archives-preflight.png)、[round2f-archives-migration-fault.png](round2f-archives-migration-fault.png) |
| 系统输入法候选窗 | 未在 Obsidian 里出现。IBus 1.5.29、`libpinyin` 已安装，本机没有 fcitx。配置是 `ibus-daemon -drx`（保留面板）、`ibus engine` 显示 `libpinyin`、`GTK_IM_MODULE=ibus`、`XMODIFIERS=@im=ibus`、`IBUS_ENABLE_SYNC_MODE=1`，并把 IBus 地址文件放进 Obsidian 的 `XDG_CONFIG_HOME`。`ibus engine libpinyin` 退出码是 1，标准错误为空，查询结果仍是 `libpinyin`。Xvfb 上有 xfwm4。焦点在「输入法.md」时用 xdotool 发送 `n i h a o`，笔记仍是「# 输入法」，`ibus-ui-gtk3` 保持 10×10，没有候选窗。[round2f-ime-candidates.png](round2f-ime-candidates.png)、[round2f-ime-committed.png](round2f-ime-committed.png)。同一画面上另开的 GTK 输入框也没有收到按键，见 [round2f-ime-gtk.png](round2f-ime-gtk.png)。独立画面 `:122` 上，同样的 IBus 和 xfwm4 让 GTK 输入框出现候选「你好 / 1.你好 2.你好吗」，见 [round2f-ime-gtk-candidates.png](round2f-ime-gtk-candidates.png)。Electron 没有把这次按键交给 IBus | 见左 |
| Windows、macOS 运行包和系统钥匙串 | 未验证。本机没有这两份运行包，也没有系统钥匙串。界面仍提示系统凭据保护不可用 | 无 |

控制台：全部模块就绪时和重启后再打开任务时，页面上的 `console.error` / 未处理拒绝钩子都是空的。Obsidian 自己的日志里只有测试配置文件不存在的 ENOENT，没有插件报错。补测这次没有再改源码，也没有新的插件报错需要记。

## terminal 合入

2026-10-29 16:38–16:41（台北）把 `origin/NAMEWTA/terminal` 的 `f3b7730` 合入当时的 `dev` `2670608`。该分支只读：没有向它推送，没有改它，没有删它。`main` 没有动。冲突按两边的意图留下，不改技术栈。

| 冲突 | 处理 |
|---|---|
| 浏览器 | 留下 dev 的独立运行时：`BROWSER_WORKSPACE`、`BROWSER_OPEN`、`native/browser-runtime`。terminal 的 `BrowserEngine` / `BROWSER_HOST` / `host.ts` 不再当生产浏览器。新开的智能体标签只保存 Space 和 Page。旧布局里没有浏览器 Space 的网页标签仍保留 `pageId`、`url`、`profileId` 和 `zoom`，升级后还找得到 |
| 终端工作台 | 留下 terminal 的 Space、PTY、CLI、收件箱、备份和 `.huhu/terminal-agent/.../workbench-v2.json`。`native/pty-server` 自合并基线后只在该分支上有改动，整份进入 dev |
| huhubot | 不在冲突文件里。dev 上已有的 Windows `file:C:/` 数据库地址、预检空普查确认、CLI 通道 EAGAIN 修复仍在 |
| 工作台功能 | 留下 dev 的 task、huhubot、versioning、revision-review。去掉重复的 `browser` 键。不恢复旧的 `sync` 功能名 |
| 依赖与忽略 | `@xterm/xterm` 保持 `^6.0.0`，保留 `ajv` 与 `ajv-formats`。`.gitignore` 同时忽略浏览器运行时构建产物和 terminal 的证据目录 |
| 测试与文案 | 词典、导航断言、自动化 `spaceId` 取并集。关闭终端视图不确认、不拆运行时；停止仍走 `end()`。Cookie 读取熬过终端清理的断言改挂到 `cookie-survives-cleanup.test.ts`，不断言变弱 |
| 产物 | `main.js`、`styles.css` 按合入后的源码重写。main.js 实测 8251339 字节，上限 8058 KiB；agent 激活 1384588 字节，上限 1353 KiB。styles.css 1436333 字节，仍低于 1408 KiB。第三方声明按 pty-server 与 browser-runtime 两份依赖重写 |

更细的记录在 specdev 的 LOG-078。

点测用一次性库，脚本是 `scripts/obsidian-acceptance/terminal-merge.mjs`。Obsidian 1.14.5，可执行文件 `/tmp/obsidian-root/opt/Obsidian/obsidian`。辅助程序是这次源码 `cargo build --release --locked` 得到的 `/tmp/pty-release/release/huhu-pty`，通过 `HUHU_PTY_BINARY` 交给插件，没有下载已发布的附件。界面语言是中文。同时打开了首页、任务、智能体、浏览器、档案、自动化、通知、版本管理、保险箱和 Bot。机器是 Linux x64。

| 步骤 | 结果 | 截图 |
|---|---|---|
| 打开终端 | 通过。图标轨进入 AI Agent，空状态是「尚未选择空间」 | [terminal-merge-empty.png](terminal-merge-empty.png) |
| 新建空间 | 通过。点「新建空间」，名称「合并验收」，保存后可选「新建终端」 | [terminal-merge-space.png](terminal-merge-space.png) |
| 输入并看到输出 | 通过。点「新建终端」得到 bash。在终端里输入 `echo HUHU_TERMINAL_MERGE_OK` 并回车，下一行是 `HUHU_TERMINAL_MERGE_OK` | [terminal-merge-output.png](terminal-merge-output.png) |
| 第二个会话 | 通过。点「新建标签」再点「新建终端」。两个 bash 标签、侧栏两张会话卡。第二个输入 `echo HUHU_TERMINAL_SECOND`，输出是 `HUHU_TERMINAL_SECOND` | [terminal-merge-two.png](terminal-merge-two.png) |
| 关闭再打开 | 通过。点标签上的「关闭标签」，画面只剩一个终端。点「查找」，从最近关闭里打开刚才那一个。两个输出都还在 | [terminal-merge-closed.png](terminal-merge-closed.png)、[terminal-merge-reopened.png](terminal-merge-reopened.png) |
| 和其他模块并存 | 通过。点「任务待办」，再点「首页」，再回到 AI Agent。两个会话的输出都还在 | [terminal-merge-task.png](terminal-merge-task.png)、[terminal-merge-coexist.png](terminal-merge-coexist.png) |
| 控制台 | 通过。页面上的 `console.error` 和未处理拒绝都是空的。Obsidian 日志只有测试配置文件不存在的 ENOENT | 无 |

新建标签的菜单由指针按下打开，因为这个按钮只在 `pointerdown` 时切换。其余点击是鼠标按下和松开。命令通过聚焦终端输入区后插入文字并按回车。

这台机器不能验证的项：Windows ConPTY 的真实界面、macOS 伪终端、系统输入法在终端里的组字、已安装的 CLI 智能体（这次没有配置 Codex / Claude 等可执行文件）、以及从 GitHub 下载已发布辅助程序。那些仍要在对应系统上看。CI 里没有 Obsidian。

合入后的 Windows `check:native` 里，缺失程序曾经在约 4 秒后变成 `unconfirmed` / `unknown`。ConPTY 在程序创建前发出的光标查询改由辅助程序本地回答，不作为子进程输出。失败结果仍必须是 `program-rejected` / `none`。随后同一个会话号启动 `cmd.exe` 时，Rust `Command` 仍会带上 `STARTF_USESTDHANDLES`，真正的控制台程序在创建过程中卡住，2 秒内没有任何帧。引导进程改为不设置标准句柄的 `CreateProcessW`，让载荷挂到锚点已经连上的伪控制台。同一个会话号仍要跑起来并得到退出码 7。这次点测没有因此重跑。

