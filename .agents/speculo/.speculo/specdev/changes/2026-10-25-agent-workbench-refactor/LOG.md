# 方案识别与设计访谈日志

本日志属于当前 change。来源原文保持完整；下列识别、用户答复和候选适配方案分别记录，不把提案写成已交付实现。时间均为 2026-10-25（Asia/Taipei）。

**当前阅读规则：** 本文件是按时间保留的历史，不是当前合同。LOG-014 的 D-009 待答状态已由 LOG-015 关闭；LOG-015 的整体共识等待已由 LOG-016 中用户明确进入 S 关闭。LOG-018 的 UI 待确认由 LOG-019 关闭；LOG-019 的永久写入待授权由 LOG-020 关闭，发布与 P/S 封板结果见 LOG-021。当前外部行为见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>，架构见 ADR，视觉/交互见 DESIGN。旧题面和推荐只解释如何形成决定；原文旧规则的逐项处置见 Spec §10。

## LOG-001 — 原文保全与工作范围
- **设计树节点：** 不适用
- **轮次与依赖：** 启动 / 无
- **状态：** confirmed
- **问题：** 本次实际授权与输入是什么？
- **事实与来源：** 用户明确激活 G，要求详细识别指定方案并完整复制到新建 change，主动询问疑问。
- **选项：** 不适用，直接执行用户请求。
- **推荐：** 保留原文为不可变输入，识别与访谈另记。
- **结论：** 原文已完整复制到 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/inputs/HUHU-智能体终端-完整架构与重构方案.md</Path>；1,278 行、101,143 字节，SHA-256 `c71b8637aef44c57f78cd5fd51da08e74ab37b004056c4012d7e6ad03bbb7aee`，与原件逐字节一致，保留原文件模式和时间戳。
- **原因：** 完整保全方案，避免访谈修订覆盖原始判断。
- **影响工件：** README、LOG、设计树。
- **约束或不变量：** 本轮没有修改生产代码、提交、推送或提升永久知识。
- **后续：** 原文作为参考输入；用户最新范围说明优先。
- **替代/被替代：** 无。

## LOG-002 — 完整识别原文的目标、组织与证据层级
- **设计树节点：** 不适用
- **轮次与依赖：** 启动 / 无
- **状态：** confirmed
- **问题：** 原文到底提出了什么，哪些只是方案与验证目标？
- **事实与来源：** 已完整读取原文 §0–18 及附录 A–D；以下是对原文的识别，不表示全部工程建议均已成为当前合同。
- **选项：** 原文提供完整工作台重构方向；用户后续要求以 Herdr 为基底增强终端，两者须按用户最新说明裁剪。
- **推荐：** 保留明确产品目标、可复用机制及风险证据；逐项论证复杂设计是否确有必要。
- **结论：** 原文有 7 个 U 需求、32 个 T 验收场景、13 个 A 架构建议与 P0–P5 实施切片；覆盖已较完整，但复杂度明显高于仅增强终端。
- **原因：** 原文自己将“用户要求”“沿用假设”“工程推荐”“尚需实测”分开，不能把所有建议同等视为实现要求。
- **影响工件：** 后续 Spec / Ticket；当前设计树与 LOG。
- **约束或不变量：** 原文 A01–A13 不是本 change 自动 accepted 的 ADR；原文所称外部文档核验不等于本轮重新核验。
- **后续：** 参考 Herdr 固定版本重新形成必要范围。
- **替代/被替代：** 无；范围纠偏见 LOG-005、LOG-007。

### 原文章节识别

| 原文 | 识别出的实质内容 | 本轮处理 |
|---|---|---|
| §0–1 | Space 顶层；会话与普通终端；Agent 协作；右侧当前 Vault 历史；不重写无关模块 | 保留产品目标，结合用户“增强终端”说明解释范围 |
| §2 | 旧方案的问题矩阵、固定 commit 的关键事实、可复用技术资产 | 与本地代码核对，见 LOG-003 |
| §3 | 左侧空间与会话、中央视图、右侧历史；创建、预览、继续、关闭、停止和归档分离 | 真实终端为主轴；浏览器共享承载已在 Q6 确认 |
| §4 | Space / Session / Execution / Run / Message / Pane 等身份与状态拆分；12 项不变量 | 识别布局与执行脱耦的价值；不默认引入整套业务实体 |
| §5–7 | TS/React/Rust 现有栈；垂直领域；统一应用入口；import 静态边界 | 保留现有工程边界，目录建议不是必须照搬的施工单 |
| §8 | Session 创建和进程启动分离；事务受理；取消、迟到 spawn 与补偿 | 故障窗口有效；是否需要完整事务任务库待终端目标裁剪 |
| §9 | Message/Inbox/Run、幂等、Outbox、队列、循环依赖、共享目录写冲突 | 明确这超出普通 PTY 控制；已确认被动消息主动读取，不自动触发 Run |
| §10 | Provider 能力矩阵；结构化执行与 PTY 两条路线；完成证据与输入仲裁 | 当前用户要求 Herdr 终端控制基底，结构化模式不是默认前提 |
| §11 | 四类持久数据；本机业务 DB；Vault 摄入；分页；精确恢复与不盲重放 | 自有业务备份范围已确认；DB 迁出及凭证搬迁未获单独确认 |
| §12 | 共享 NativeHost、租约、PTY/stdio、流控、快照水位、尺寸 owner、子进程回收 | 核心可借鉴机制；保持 Obsidian 宿主约束 |
| §13 | 一套应用 API、CLI/IPC、身份与错误、机器结果、首次激活策略 | 以 Herdr 实际 CLI/Socket 为参照，避免提前发明额外权限平台 |
| §14 | 初始化、系统资源、字节打包三种懒加载；有界停用；共享资源隔离 | 保留可靠性目标；不将关闭 Pane 等同于停止进程 |
| §15 | 旧数据/账号/标注/布局保全；消费者适配；只读迁移与回滚边界 | 原则保留，补充遗漏的消费者与移动端技能能力 |
| §16 | P0 实验→P1 协作→P2 历史→P3 第二 Provider/终端→P4 迁移→P5 发布 | 根据终端优先方向重排候选，不自动开始实施 |
| §17 | T01–T32；容量与性能建议；可追踪标识 | 保留为验收候选；性能数字不是测量结果 |
| §18 | 13 个决策摘要；Provider、xterm、Windows、耐久、发行门槛 | 不用文件里的“确定”替代用户本轮范围说明 |
| 附录 A–D | 类型片段、未来 CLI Skill、旧约束映射、13 个仓库来源和13个外部来源 | 类型/命令均为目标示例；完整保留，未作为现有 API 使用 |

“历史 P0”是产品优先级，“P2 历史切片”是实施顺序，二者并不矛盾。主要未知是行为合同的范围和取舍，而不是缺少更多类名。

## LOG-003 — 本地源码与原文基线核对
- **设计树节点：** 不适用
- **轮次与依赖：** 第 1 轮前事实探索 / 无
- **状态：** confirmed
- **问题：** 原文现状分析是否因仓库变化失效，遗漏了哪些依赖？
- **事实与来源：** 旧 commit `88c90cd319e1b37a627aeeabd7b1146c42bfaa5c` 在本地存在；当前 HEAD `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`。对 Agent、Browser、Rust helper、三份相关 docs 与 package 的 Git diff 为空；期间只有 Speculo 更新提交。
- **选项：** 不适用，源码事实。
- **推荐：** 沿用原文关键源码事实，并把以下遗漏纳入后续适配清单。
- **结论：** §2.2 关键路径未漂移，但不能据此宣称新架构可运行或全仓审查完成。
- **原因：** 固定源码与当前文件均可回读。
- **影响工件：** 当前 LOG，后续 Spec / Ticket 的消费者、迁移与验证边界。
- **约束或不变量：** 静态核对；未构建、未运行真实 Provider，未读取用户真实账号/对话。
- **后续：** 按终端优先方向选择实现切片。
- **替代/被替代：** 无。

| 事实 | 本地证据 | 影响 |
|---|---|---|
| Agent 默认 startup、启用 | <Path>src/modules/agent/manifest.ts</Path> | on-demand 需要盘点消费者 |
| Cookie 接口只提供 readCookies；Browser 依赖 Agent 提供 helper | <Path>src/modules/agent/api.ts</Path>、<Path>src/modules/browser/module.ts</Path>、<Path>src/modules/agent/module.ts</Path> | 不是已经存在的业务 SQLite 事务接口 |
| PTY/history/cookies 共用 helper，owner 在 TerminalSessions | <Path>native/pty-server/src/main.rs</Path>、<Path>src/modules/agent/services/terminal/sessions.ts</Path> | 提取共享 owner 有事实依据；最后一个终端 remove 并不直接 dispose helper |
| account 历史与 vault workspace 索引分离 | <Path>src/modules/agent/platform/history/service.ts</Path>、<Path>docs/agent-workbench.md</Path> | UI 筛选不能冒充摄入隔离 |
| 交互终端/快捷命令可使用库外 cwd，恢复/自动化的部分入口限库内 | <Path>src/modules/agent/platform/desktop/pty/shells.ts</Path>、<Path>src/modules/agent/services/launch/launcher.ts</Path>、<Path>src/modules/agent/platform/desktop/history/canonical-cwd.ts</Path> | Q1 是真实兼容取舍 |
| 网页实体在 Browser，tab/group 布局在 Agent；打开网页转 terminal feature | <Path>src/modules/browser/module.ts</Path>、<Path>src/modules/agent/module.ts</Path>、<Path>src/modules/agent/core/workspace/model.ts</Path>、<Path>src/app/contracts/workbench.ts</Path> | 共享承载需明确独立 owner，而不只是提取 Cookie 接口 |
| Home 用 peek 获取 directory/dispatch/session/skills/catalog/quick commands/usage | <Path>src/modules/home/module.ts</Path> | 改懒加载不可让入口静默消失 |
| Shell 使用 Agent workbench/usage 获取标题、运行状态及订阅 | <Path>src/app/workbench/compose-workbench.ts</Path> | 源文 §15.2 应补 AGENT_WORKBENCH / DIRECTORY / QUICK_COMMANDS |
| 自动化依赖 runtime，existing 投递仅附加材料 | <Path>src/modules/automations/services/runtime.ts</Path> | 不自动把既有粘贴行为变成执行 |
| 移动端仍有可移植技能能力；桌面才创建 Controller | <Path>src/modules/agent/module.ts</Path> | 终端仅桌面不等于撤掉移动端轻量技能 |
| 托管账号、Agent 运行数据当前在库内 | <Path>docs/data.md</Path>、<Path>.agents/skills/dev/SKILL.md</Path> | 新 DB 若迁出须有明确收益及同步文档，不能误写成已有位置 |
| 五种原生发行组合已有 CI 配置 | <Path>.github/workflows/terminal-build.yml</Path> | 配置存在不等于本轮实机通过 |

独立事实探索来自宿主协作者 `/root/agent_refactor_facts`，只读返回；主 Agent 回读了关键 Git 差异、cwd、helper 所有权、Browser 与 Home 调用链。探索中误定位的两个文件路径已经用 `rg --files` 纠正，不据缺失路径作结论。

## LOG-004 — 第 1 轮 — 库外工作目录
- **设计树节点：** D-001
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 对应首轮问题 D-001，完整题面与推荐保存在设计树。
- **事实与来源：** 本轮用户原答复：“保留显式授权的库外目录（推荐）”
- **选项：** 只允许库内；或保留显式授权的库外目录。
- **推荐：** 原推荐见设计树；用户纠偏优先于原推荐。
- **结论：** 保留库外 cwd 能力；由用户显式选择和授权，以 Vault/Space 绑定确定历史归属。
- **原因：** 保留现有能力，避免重构无意收窄交互式终端。
- **影响工件：** 设计树、CONTEXT / ADR 及后续 Spec。
- **约束或不变量：** 仅记录决定，不表示已实现。
- **后续：** 结合固定版本 Herdr 源码收敛实际方案；当前无生产写入。
- **替代/被替代：** 无。

## LOG-005 — 第 1 轮 — 终端增强优先，撤回凭证迁移预设
- **设计树节点：** D-002
- **轮次与依赖：** round 1 / 无
- **状态：** rejected
- **问题：** 对应首轮问题 D-002，完整题面与推荐保存在设计树。
- **事实与来源：** 本轮用户原答复：“我只是对于终端的一个优化，你可以全面、认真地去参考复现，或者说参考 herdr。你以他的一些代码功能实现作为基底，我只是说增强我的终端的能力。”
- **选项：** 原文广泛的 Agent 工作台重构；以 Herdr 为参照的终端增强。
- **推荐：** 原推荐见设计树；用户纠偏优先于原推荐。
- **结论：** 用户没有选择凭证搬迁方案，而是纠正整体范围：以 Herdr 代码/功能为主要参照增强终端。因此撤回“凭证必然搬迁”的提问前提，不记录为已批准搬迁。
- **原因：** 用户最新范围说明优先；已有账号继续按现状保全。
- **影响工件：** 设计树、CONTEXT / ADR 及后续 Spec。
- **约束或不变量：** 仅记录决定，不表示已实现。
- **后续：** 结合固定版本 Herdr 源码收敛实际方案；当前无生产写入。
- **替代/被替代：** 无。

## LOG-006 — 第 1 轮 — 备份内容范围
- **设计树节点：** D-003
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 对应首轮问题 D-003，完整题面与推荐保存在设计树。
- **事实与来源：** 本轮用户原答复：“HUHU 完整业务数据和来源引用（推荐）”
- **选项：** 自有数据与引用；或额外包含原生完整 transcript。
- **推荐：** 原推荐见设计树；用户纠偏优先于原推荐。
- **结论：** 备份完整 HUHU 自有数据及来源引用；原生全文和登录凭证另行备份并明确缺项。此回答不构成 DB 位置变更的单独确认。
- **原因：** 保全 HUHU 拥有的业务事实，不扩大到默认复制所有账号历史。
- **影响工件：** 设计树、CONTEXT / ADR 及后续 Spec。
- **约束或不变量：** 仅记录决定，不表示已实现。
- **后续：** 结合固定版本 Herdr 源码收敛实际方案；当前无生产写入。
- **替代/被替代：** 无。

## LOG-007 — 第 1 轮 — 参考 Herdr 的实际控制面，撤回额外权限模型预设
- **设计树节点：** D-004
- **轮次与依赖：** round 1 / 无
- **状态：** rejected
- **问题：** 对应首轮问题 D-004，完整题面与推荐保存在设计树。
- **事实与来源：** 本轮用户原答复：“你参考一下“喝着”里面是怎么实现的嘛。我相当于只是复刻它的一些功能和内容。核心功能和内容你不要想那么多，我感觉应该是可以的，因为它通过 CI 进行管理的话，理论上可以管理终端里的所有内容。”
- **选项：** 额外设计会话控制权限；或先复用 Herdr 实际终端控制机制。
- **推荐：** 原推荐见设计树；用户纠偏优先于原推荐。
- **结论：** 将“喝着”按上下文定位为 Herdr；研究其 CLI / Socket 真实控制能力。撤回默认只能控制自建协作者的建议，不把用户这段说明解释成已经批准任意跨 Vault 或系统操作。具体产品边界由源码证据与现有范围形成候选。
- **原因：** 用户明确要求从成熟实现出发，避免凭空增加产品复杂度。
- **影响工件：** 设计树、CONTEXT / ADR 及后续 Spec。
- **约束或不变量：** 仅记录决定，不表示已实现。
- **后续：** 结合固定版本 Herdr 源码收敛实际方案；当前无生产写入。
- **替代/被替代：** 无。

## LOG-008 — 第 1 轮 — HUHU 内审批
- **设计树节点：** D-005
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 对应首轮问题 D-005，完整题面与推荐保存在设计树。
- **事实与来源：** 本轮用户原答复：“首轮提供 HUHU 内审批（推荐）”
- **选项：** HUHU 内审批；或只允许预授权执行并明确失败。
- **推荐：** 原推荐见设计树；用户纠偏优先于原推荐。
- **结论：** 首轮提供 HUHU 内的人工审批入口，继续原会话/原任务，不自动放行或换后端重放。具体是原终端交互还是结构化审批视图，需要与 Herdr 终端主轴统一。
- **原因：** 用户明确选择可处理后台审批。
- **影响工件：** 设计树、CONTEXT / ADR 及后续 Spec。
- **约束或不变量：** 仅记录决定，不表示已实现。
- **后续：** 结合固定版本 Herdr 源码收敛实际方案；当前无生产写入。
- **替代/被替代：** 无。

## LOG-009 — 第 1 轮 — 浏览器共享承载
- **设计树节点：** D-006
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 对应首轮问题 D-006，完整题面与推荐保存在设计树。
- **事实与来源：** 本轮用户原答复：“保留标签体验，独立共享承载（推荐）”
- **选项：** 共享标签承载；独立浏览器页面；或 Space 内网页。
- **推荐：** 原推荐见设计树；用户纠偏优先于原推荐。
- **结论：** 保留现有入口和标签体验，抽取独立共享视图容器；网页不是 Agent Session，不要求先建 Space，停用 Agent 不关闭网页。
- **原因：** 保持使用习惯并解除 Agent 开关耦合。
- **影响工件：** 设计树、CONTEXT / ADR 及后续 Spec。
- **约束或不变量：** 仅记录决定，不表示已实现。
- **后续：** 结合固定版本 Herdr 源码收敛实际方案；当前无生产写入。
- **替代/被替代：** 无。

## LOG-010 — 第 1 轮 — 被动通知主动读取
- **设计树节点：** D-007
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 对应首轮问题 D-007，完整题面与推荐保存在设计树。
- **事实与来源：** 本轮用户原答复：“Agent 主动读取邮箱（推荐）”
- **选项：** 主动读取；或下次输入时自动注入。
- **推荐：** 原推荐见设计树；用户纠偏优先于原推荐。
- **结论：** 被动消息由 Agent 主动 inbox.list/read/ack，UI 显示未读，不默认自动加入模型上下文或启动新 Run。
- **原因：** 输入与消费时点清楚；实现形式可保持轻量。
- **影响工件：** 设计树、CONTEXT / ADR 及后续 Spec。
- **约束或不变量：** 仅记录决定，不表示已实现。
- **后续：** 结合固定版本 Herdr 源码收敛实际方案；当前无生产写入。
- **替代/被替代：** 无。

## LOG-011 — 第 1 轮 — 五平台首个正式版
- **设计树节点：** D-008
- **轮次与依赖：** round 1 / 无
- **状态：** confirmed
- **问题：** 对应首轮问题 D-008，完整题面与推荐保存在设计树。
- **事实与来源：** 本轮用户原答复：“首个正式版覆盖五种（推荐）”
- **选项：** 五种组合同时作为正式版门槛；或分平台正式交付。
- **推荐：** 原推荐见设计树；用户纠偏优先于原推荐。
- **结论：** 首个正式版覆盖 Windows x64、macOS x64/arm64、Linux x64/arm64；分步验证，但未完成端到端验证的组合不能宣称完成。
- **原因：** 用户明确保留当前发行范围。
- **影响工件：** 设计树、CONTEXT / ADR 及后续 Spec。
- **约束或不变量：** 仅记录决定，不表示已实现。
- **后续：** 结合固定版本 Herdr 源码收敛实际方案；当前无生产写入。
- **替代/被替代：** 无。

## LOG-012 — 用户再次明确整体定位
- **设计树节点：** 不适用（约束当前所有设计分支）
- **轮次与依赖：** 第 1 轮后的范围说明 / 无
- **状态：** confirmed
- **问题：** 是复刻成熟终端能力，还是默认建设原文整套 Agent 平台？
- **事实与来源：** 用户原话：“你这里全面地参考一下，学习或者仿造复刻 herdr 相关的这种功能交互、实现，以及整体的定位。其实，我就是类似于这种终端 Agent 的全面优化改造而已。只不过里面有的功能我可以不需要，不用那么的复杂。”
- **选项：** 原文全量平台方案；以 Herdr 为主要参照的终端 Agent 优化。
- **推荐：** 以成熟终端机制为骨架，保留 HUHU 必要差异，删去没有产品收益的基础设施前置。
- **结论：** 终端 Agent 工作台是本 change 的整体定位；功能、交互和源码均需认真参考 Herdr，但不要求复制其全部产品范围。
- **原因：** 用户最新明确指示。
- **影响工件：** ADR-001、README、设计树及本日志的候选范围。
- **约束或不变量：** 不将用户要求降格成换皮；也不以“全面参考”为由自动引入远程服务、插件生态或任务平台。
- **后续：** 完成固定源码对照，保留唯一有实质语义差异的后续问题。
- **替代/被替代：** 收紧原文工程推荐的默认范围；原文作为历史输入完整保留。

## LOG-013 — Herdr 固定源码研究
- **设计树节点：** D-009 的事实前置
- **轮次与依赖：** 第 2 轮前事实探索 / 无
- **状态：** confirmed
- **问题：** Herdr 的定位、交互和实现究竟提供哪些能力，哪些不是它的现成机制？
- **事实与来源：** 官网 <Url>https://herdr.dev/</Url> 指向 <Url>https://github.com/herdrdev/herdr</Url>。本轮冻结 v0.9.5，tag object `7573e821895d32c8d1f78b3f6c9a2f85a46df4ac`，实际 commit `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`。原仓库读取位于项目外临时目录，没有复制进 HUHU 生产代码。
- **选项：** 不适用，固定源码研究；不能从同名 fork 或浮动主页推断固定版本机制。
- **推荐：** 复用机制与必要代码边界，保留 HUHU 的宿主、UI 和数据所有权。
- **结论：** Herdr 是以真实终端为中心、由 CLI/Socket 驱动的 Agent 运行与管理工具；其协作不要求持久 Message/Run/Outbox 平台。
- **原因：** 协议结构、输入提交、等待、读取、运行时与保存恢复代码均已定位。
- **影响工件：** D-009、ADR-001、后续 Spec / Ticket 的参考和可复用边界。
- **约束或不变量：** 静态研究；没有实机验证、检测准确率测量或跨平台运行证明。
- **后续：** 以如下事实与适配清单收敛首轮实现范围。
- **替代/被替代：** 无。

### 定位与交互

| 主题 | Herdr v0.9.5 实际行为 | 对 HUHU 的意义 |
|---|---|---|
| 工作组织 | Workspace → Tab → Pane；新 workspace/tab 同时建 root pane；支持不抢焦点创建 | 保留 Space 产品名，参考布局与后台创建；HUHU 允许空 Space 是自身差异 |
| 真实终端 | Agent 是受管 PTY 中识别出的前台程序，也识别用户手动运行的 CLI | 保留用户已安装 CLI、账号、原生 TUI；无需先重建 Chat |
| 终端操作 | pane run/send-text/send-keys/read/wait-output/resize/close 等 | 一个可编程控制面可服务 Shell、Agent、测试进程等，不用每个功能另写流程 |
| Agent 操作 | start/get/list/rename/prompt/read/send-keys/wait/focus/explain | A 可以用 CLI 控制 B；只对当前选中 server 的受管终端生效 |
| 状态汇总 | 前台进程、屏幕检测、集成信号共同形成工作/阻塞/空闲/未知；done 还包含 seen 信息 | 左侧汇总与待处理跳转有成熟参考；任务执行结果与未读可保持区分 |
| 输入与审批 | blocked 时 agent.prompt 拒绝投递；用户可读取界面并发定向按键 | HUHU 内审批可优先通过提示→定位原终端→用户交互完成，不必先造全 Provider 审批 UI |
| 布局交互 | 鼠标焦点、分屏拖动、右键菜单、复制、键盘导航 | 借交互关系，适配 Obsidian/React/xterm，不移植 ratatui 外壳 |
| 断开 | client detach 保留 server 与终端；pane.close 会回收其无引用终端 | 关闭工作台、关闭视图、停止终端必须分清，不笼统称为 detach |
| 保存恢复 | 保存布局、cwd、原生会话引用与 resume argv；可选屏幕历史 | 不是完整对话数据库；HUHU 历史抽屉继续用自己的原生历史能力 |
| 宿主范围 | 独立 server、远程机器、SSH、多客户端、插件和 worktree 能力 | 属于完整 Herdr 的扩展；本轮不用默认引入 |

### 关键实现证据与适配

| ID | 已核对事实与证据 | 可借鉴的边界 |
|---|---|---|
| H01 | TerminalRuntimeRegistry 在 AppState 外按稳定 TerminalId 保存 PTY/parser/detector/channel。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/terminal/runtime_registry.rs</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/terminal/runtime.rs</Url> | runtime 与 React/布局生命周期分离；不必同时新建 Session/Execution/Run 全套领域 |
| H02 | Unix PTY actor 独占 I/O，用户输入与控制通道分离；控制先处理。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/pty/actor/unix.rs</Url> | write/resize/stop 单一 owner，慢输入不能阻塞停止。其所有队列并非都按字节有界，HUHU 仍需补约束 |
| H03 | SubmitUserInput 把文本与 Enter 组成顺序提交；受 bracketed-paste 影响；完成回执仅是输入完成。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/app/api/agents.rs#L139</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/pty/actor/unix.rs#L587</Url> | UI 键盘、粘贴、CLI 共用输入仲裁；不把写入成功显示为任务成功 |
| H04 | agent prompt --wait 用终端身份、状态序号和新活动窗口，等 settled 状态；不追踪单个 turn。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/api/wait.rs#L196</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/docs/next/website/src/content/docs/agent-automation.mdx#L72</Url> | 可靠避免旧 idle 命中有价值，但不是“这条 prompt 已产出关联最终答案”；D-009 决定是否接受终端级语义 |
| H05 | CLI agent start 在原始 Socket 返回后继续等待 ready；裸 Socket start 可能仍 launch_pending。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/cli/agent.rs#L372</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/app/api/agents.rs#L73</Url> | 统一 HUHU CLI/UI 契约时区分启动已发出与已可交互 |
| H06 | read 返回屏幕/近期文本或 ANSI；部分全屏长读取会主动滚屏并回到底部。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/app/api_helpers.rs#L109</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/server/alt_screen_read.rs</Url> | 默认读取有界；显式区分被动快照与可能改变视口的历史提取，不能宣传所有 read 无交互 |
| H07 | Ghostty parser 是权威屏幕，content_seq 发布变化；设备查询回复回到 I/O actor。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/pane.rs#L2704</Url> | HUHU 保留 xterm/headless，可借所有权和订阅机制；Ghostty 代码不证明 xterm 快照精确性 |
| H08 | 每客户端独立控制队列与 render 槽；落后时回退全量重绘，不推进未成功帧的基线。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/server/client_transport.rs#L268</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/server/headless/retained_surface.rs#L565</Url> | 慢视图单独重同步；可舍弃展示帧，不能丢未解析的原始 ANSI 字节 |
| H09 | session.json 和 session-history.json 分离；写入经过临时文件、sync、替换；native restore 去重，不把旧 ANSI 变成新输入。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/persist/snapshot.rs</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/persist/io.rs#L45</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/persist/restore.rs#L813</Url> | 借版本化保存、元数据与原生引用、恢复去重；并不要求迁出 Vault 建新 SQLite |
| H10 | 本版本 resume_agents_on_restore 默认 true；client detach 与 pane.close 不同。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/config/model.rs#L265</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/server/headless.rs#L2640</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/app/api/panes.rs#L1989</Url> | HUHU 保留宿主内运行和重启显式继续的原方案方向，作为明确适配差异 |
| H11 | Request 只带 id+method/params；本机 IPC 以 Unix 0600、Windows 当前账号/SYSTEM DACL 等限制。Agent 寻址遍历选中 server 各 workspace。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/api/schema.rs#L35</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/api/server.rs#L341</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/platform/windows.rs#L45</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/app/terminal_targets.rs#L74</Url> | 不虚构 Herdr 已有 per-session capability/角色；HUHU 仍须精确路由当前 Vault 实例，未决定新增跨 Vault 控制 |
| H12 | child waiter 取得退出；关闭分阶段结束受管进程并记录残留。Windows PTY 回收不能因其他用途代码有 JobObject 就宣称全覆盖。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/pane.rs#L1702</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/platform/windows.rs#L2620</Url> | 明确 stop 请求、已退出与残留；平台实际效果需测试 |
| H13 | portable-pty 0.9.0 有本地补丁与补丁台账。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/Cargo.toml</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/vendor/portable-pty.patches.md</Url> | 优先复用问题与回归场景；只选择与 HUHU 依赖/发行适配的补丁 |
| H14 | 所查 Agent API、快照模型与执行链没有持久 Message/Inbox/Run/Outbox；EventHub 是内存有界事件集合。<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/api/schema/response.rs#L97</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/persist/snapshot.rs</Url>；<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/api/event_hub.rs</Url> | 不能把原文任务数据库说成复刻 Herdr 的必需前置。轻量通知邮箱是 HUHU 选择的额外能力 |

### 来源与许可边界

根 LICENSE 与 Cargo.toml 声明 Apache-2.0：<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/LICENSE</Url>、<Url>https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/Cargo.toml</Url>。这是固定版本的事实，不依据旧 fork 的 AGPL 声明否定当前主仓，也不据根 LICENSE 给所有嵌套文件统一许可。

本次核对发现 vendor/portable-pty 根为 MIT；Ghostty vendor 内存在另行许可的 shell 集成与 libintl 文件。后续只选择实际需要且许可适用的源文件；不整包搬入 vendor。GPL 终端代码仍按 HUHU 原规则排除。当前只读研究不修改 NOTICE、依赖或生产代码；实际改编时记录原路径、commit、许可和修改，并维护分发声明。

### 研究范围与限制

宿主协作者 `/root/agent_refactor_facts` 核对控制协议、状态、寻址与权限；`/root/herdr_runtime_reference` 核对 I/O、屏幕、持久化、关闭与实际候选许可。主 Agent 回读关键源码，包括 prompt 验证/提交、wait、Request、RuntimeRegistry、Snapshot 和 HUHU 当前对应链路。当前是覆盖关键机制的静态研究，不是全仓审计，也不是所有 UI/OS 行为已实测。

## LOG-014 — HUHU 可复用资产与精简候选
- **设计树节点：** D-009
- **轮次与依赖：** 第 2 轮前 / Herdr 核对已完成
- **状态：** deferred
- **问题：** 首轮是否采用 Herdr 式终端控制语义，避免以可靠任务平台作为前置？
- **事实与来源：** LOG-012 的用户范围；LOG-013 的源码研究；HUHU 当前代码。
- **选项：** 终端级 prompt/wait/read，结合实际输出和产物核对；或每个任务必须持久受理、幂等投递及最终结果关联。
- **推荐：** 前者符合用户“终端全面优化、不要太复杂”；明确 wait 只表示终端/Agent 状态达到条件。
- **结论：** 形成如下具体候选范围，等待 D-009 回答；不提前宣称共识或实施完成。
- **原因：** 这是会实质改变原文数据库、适配器与消息模型复杂度的决定，不能用参考源码替用户选择保证级别。
- **影响工件：** 设计树、后续 Spec；原文不修改。
- **约束或不变量：** 已确认的库外目录、备份、HUHU 内审批、网页承载、主动邮箱、五平台要求均保留。
- **后续：** 回答 D-009 后同步 ADR，再进行整轮共识检查；该高影响未决项阻止 Spec / Ticket Ready，不能以推荐答案替代用户回答。
- **替代/被替代：** 无。

### 当前 HUHU 已有的基底

- <Path>src/modules/agent/services/terminal/session.ts</Path> 已有唯一 headless 模型、序列化、解析回调返还输出信用、粘贴、屏幕文本读取及快照订阅；重构应核对与补强输入顺序和订阅一致性，不从零再造终端。
- <Path>src/modules/agent/core/workspace/model.ts</Path> 与 <Path>src/modules/agent/ui/workspace/WorkspaceLayout.tsx</Path> 已有 tab/group/分屏和网页混排；需要补 Space 归属与稳定终端引用，保留既有用户布局和交互资产。
- <Path>src/modules/agent/platform/desktop/hooks/</Path>、<Path>src/modules/agent/platform/history/</Path> 与 <Path>src/modules/agent/core/launch/catalog.ts</Path> 已有 Hook、历史、账号和 Provider 启动经验；不能把既有 CLI 能用误写成所有新状态检测已验证。
- <Path>native/pty-server/</Path> 已有跨平台 PTY 与 history/cookies。共享 owner、关闭隔离和控制优先级可在这条发行链上改进，没必要先引入另一套桌面程序。

### 建议的首轮范围（未替代用户最终共识）

| 处理 | 范围 |
|---|---|
| 重点复现 | Space/标签/分屏；真实 Shell 与 Agent TUI；后台运行与切换；识别 working/blocked/idle/unknown；不抢焦点创建；统一 CLI list/get/start/prompt/read/wait/send-keys/stop/focus |
| 借鉴实现 | 终端稳定 ID 和 runtime 所有权；输入与 Enter 顺序提交；屏幕单一权威；慢观察者独立恢复；关闭与退出核验；版本化布局与 native resume 去重 |
| 保留 HUHU 差异 | 当前 Vault 隔离；显式授权的库外 cwd；右侧 Vault 历史抽屉；独立共享网页标签；已确认的备份范围；HUHU 内审批入口；轻量被动消息邮箱主动读取 |
| 初始审批交互 | 状态/未读提示→定位原终端→用户在原生 CLI 界面作出批准或拒绝；可靠原生事件可辅助展示。是否需要每个 Provider 的结构化审批卡，留待具体交互需求而非首轮前置 |
| 生命周期适配 | 切换/隐藏视图不结束运行；明确停止才结束；Obsidian 退出后不引入独立 daemon 保活；重启恢复记录并显式继续，不偷偷重放提示词 |
| 首轮不作为前置 | 自定义 Chat 替代 CLI；结构化 stdio Provider 平台；完整 Message/Run/Outbox 任务数据库；账号搬迁；新角色/细粒度会话权限系统 |
| 可以省略 | SSH/远程机器、跨设备运行、server 热升级交接、插件市场、自动 worktree 编排、完整终端图形协议、自建 ratatui/Ghostty 外壳 |
| 保留验证目标 | 五种平台、输入/输出/resize 竞态、blocked/unknown、连接丢失、关闭并发、旧会话恢复、历史和浏览器/自动化消费者适配 |

轻量邮箱与任务执行保证分开：用户已确认的主动通知读取并未撤销，但不因需要通知就自动引入 Outbox、持久 Run 或全量数据库迁移。正常模块组织、源码职责、类型化公开入口与必要错误处理仍保留；简化产品范围不等于忽略边界。

### 候选用户操作路径

以下把原文产品目标、Herdr 机制与已确认决定接成具体操作过程，是可评审候选，不是现有功能说明。CLI 名称和参数留给后续 Spec 定义，不在此伪造可运行命令。

| 用户要做什么 | HUHU 中建议的操作与反馈 | 采用的依据 |
|---|---|---|
| 开始一项工作 | 选择或创建 Space，选工作目录，打开 Shell 或已安装的 Agent CLI；保留原生 TUI 与账号使用方式 | 原文 Space 目标、ADR-001/002；Herdr 的受管终端与启动机制 |
| 同时看多个 Agent | 标签切换、分屏、后台创建；左侧汇总工作中、待处理、空闲或未知，点状态定位对应终端 | Herdr 布局与状态；HUHU 已有标签/分屏基底 |
| 让 A 调用 B 协作 | A 用 HUHU CLI 找到或启动 B、发送输入、等状态、读取输出或检查产物；超时先检查现状再决定是否重发 | H03–H06；等待是否足够由 D-009 决定 |
| 只给另一个 Agent 留消息 | 写入接收者邮箱、显示未读；B 在需要时主动读取并确认，不因收到通知自动执行 | ADR-006，属于 HUHU 保留的额外能力 |
| 处理后台审批 | 提示有待处理状态，点击回到对应终端，在原 CLI 中人工批准或拒绝，然后继续该会话 | ADR-004；Herdr blocked 与定向交互机制 |
| 找回以前的工作 | 右侧查看当前 Vault 历史，预览来源，明确选择继续；存在原生会话引用时使用其继续机制，来源失效时准确说明 | 原文历史目标、H09；HUHU 已有历史资产 |
| 临时切走或打开网页 | 切换/隐藏视图保留终端；明确停止才结束进程；网页保留标签体验且可独立于 Agent 使用 | 原文生命周期目标、ADR-005；H10 是需适配的差异 |

```text
用户在 HUHU 操作                 Agent 调用 HUHU CLI
        |                                |
        +-------------+------------------+
                      v
          同一套终端控制与状态查询入口
                      |
            当前 Vault / Space 的终端
                      |
          真实 PTY + 原生 Shell / Agent CLI
                      |
            屏幕、状态、原生会话引用
                      |
          视图展示 / 输出读取 / 历史继续

附加能力：主动读取的通知邮箱、共享网页、HUHU 数据备份
```

该图表达候选职责关系，不要求增加同名类或完整新服务层；可复用现有控制器和 native helper。普通终端输入、粘贴与 Agent CLI 输入需要共用顺序控制，细节由实现者结合现有代码确定。

### 建议的薄切片

1. 先在现有 PTY 上跑通：GUI 启动 A/B → A 经 HUHU CLI 给 B 输入 → 等状态 → 读终端/检查结果；同时验证输入顺序、blocked 和超时语义。
2. 接入 Space、终端 ID、标签/分屏与后台状态；保证切换不会重建进程，明确关闭/停止入口。
3. 接入右侧 Vault 历史、精确 native resume、轻量通知与 HUHU 内人工处理入口。
4. 收口共享 native owner、浏览器承载、其他消费者与旧布局数据；完成五平台和故障场景验证。

这些只是 G 中的可评审候选，尚未创建 Ticket、启动实现或执行真实 Provider。

## LOG-015 — 第 2 轮 — 采用 Herdr 式终端协作
- **设计树节点：** D-009
- **轮次与依赖：** 第 2 轮 / LOG-013 的固定源码研究与 LOG-014 的范围候选
- **状态：** confirmed
- **问题：** 首轮是否采用发送输入、等待 Agent 状态、读取终端输出或检查产物的协作方式，而不要求每条任务都持久受理并关联最终结果？
- **事实与来源：** 用户在 Q9 及其推荐总结后明确答复：“采用”。完整题面及推荐保存在设计树，技术事实见 LOG-013 H03–H06、H14。
- **选项：** Herdr 式终端级协作；或首轮即保证逐任务持久受理、可靠投递和最终结果关联。
- **推荐：** 前者，符合用户以成熟终端机制增强 HUHU、控制复杂度的范围。
- **结论：** 用户采纳终端级协作。首轮通过 CLI 对受管终端输入、等待状态、读取输出或检查结果文件；wait 达到条件不表示特定任务已经成功。不把持久 Run/Outbox、新任务数据库或结构化 Provider 平台作为首轮前置。
- **原因：** 用户在已说明保证差异的基础上选择推荐方案；它能承接终端 Agent 协作目标，并沿用现有 PTY、CLI 和原生会话能力。
- **影响工件：** D-009 关闭为 answered，追加 ADR-008，补充 CONTEXT 的终端协作与状态等待术语，README 更新接续。
- **约束或不变量：** 保留已确认的授权库外目录、HUHU 数据与来源引用备份、人工审批、独立网页标签、主动读取邮箱及五平台要求。blocked、未知状态和等待超时不能被当作任务成功；超时也不证明输入没有生效，重发前先核实当前终端与产物。
- **后续：** 设计树没有 open/blocked 节点，frontier 为空；进行一次整体共识确认。原文继续完整保留，尚不自动启动 S、Ticket 或产品实现。
- **替代/被替代：** 关闭 LOG-014 中 D-009 的待答状态；该条中的交互细节与薄切片作为后续 Spec 的候选输入，不因本答复自动成为已实现事实。

## LOG-016 — 明确进入 S，生成详细 Spec 并统一当前合同
- **设计树节点：** 不适用（已关闭分支的整体接续）
- **状态：** confirmed
- **事实与来源：** 用户明确要求激活 `specdev-s-spec`，针对本 change “生成全面详细的spec”，并要求“所有文档都不能存在冲突，都已最新的为准，无法把握的则请你向我询问”。该请求承接已展示的整体范围，明确授权进入下一 Work，不再重复请求 G 总体确认。
- **结论：** 本轮撰写完整行为 Spec、检查当前工件一致性；原文保持历史快照身份，最新用户决定经 ADR/CONTEXT/Spec 统一表达。保留历史答复并加替代导航，不改写用户原话。
- **事实核验：** HEAD 仍为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；相关生产源码/文档/package 路径无漂移。当前用户工作区已有 `.gitignore` 修改和未跟踪 SpecDev 目录，均不清理。编辑前六份工件保存在 `/tmp/huhu-spec-before-05fylyhw/2026-10-25-agent-workbench-refactor`，仅作本机恢复副本，不作为长期证据。
- **补充发现：** 现有六种 CLI 启动入口与 `AGENT_PROMPT_RUNNER` 原生完整答案、自动化 invocation 去重、existing 仅粘贴语义必须保留；终端协作简化不覆盖这些既有合同。证据为 <Path>src/modules/agent/api.ts</Path>、<Path>src/modules/agent/core/launch/catalog.ts</Path>、<Path>src/modules/agent/services/prompt-runner.test.ts</Path>、<Path>src/modules/agent/services/prompt-port.test.ts</Path>。
- **影响工件：** spec.md、README、inputs/README、CONTEXT、ADR、设计树。
- **约束：** 本轮仅文档/设计；无产品实现、提交、发版或永久知识写入。历史全文摘要保持不变。

## LOG-017 — S 聚焦确认：同 Vault 跨 Space 控制
- **设计树节点：** D-010
- **轮次与依赖：** 第 3 轮 / D-009 已确认，Herdr H11 与原文 §9.1 存在范围差异
- **状态：** confirmed
- **问题：** Herdr 允许同一服务内跨工作区，而原文仅允许同 Space；首轮 HUHU 采用哪种作用域？
- **选项：** 同 Vault 内明确目标可跨 Space，默认查询当前 Space；或仅同 Space。
- **推荐：** 同 Vault 内明确寻址，保留跨 Vault 禁止。
- **事实与来源：** 用户原答复：“允许同 Vault 跨 Space 明确寻址（推荐）”。
- **结论：** 查询默认当前 Space；明确提供稳定目标后可控制当前 Vault 其他 Space 的终端/Agent/面板，也可发送通知。控制不迁移归属；同名歧义不猜测；跨 Vault 不支持。
- **影响工件：** D-010 answered、ADR-009、CONTEXT、Spec CLI/作用域/验收及原文映射。
- **替代/被替代：** 替代原输入 §9.1 的同 Space 限制和 `CROSS_SPACE_DENIED` 示例；不会恢复已撤回的自建协作者角色体系。

## LOG-018 — 激活 P，沿用 HUHU 前端设计终端控制体验
- **设计树节点：** 不适用（设计 Work 授权与约束）
- **状态：** confirmed
- **事实与来源：** 用户要求激活 `specdev-p-prototype`，针对同一 change，“基于当前项目的整体的前端的布局交互作为基底”，并允许完善 change 文档；再次说明目标是复刻 Herdr 终端能力，提供终端之间的面板控制、Agent 控制，为后续智能体编排提供基础。
- **结论：** 在当前 S 工作基础上增加 P；保留 HUHU 图标轨/侧栏/页面、语义 token、标签与分屏，设计可操作离线原型。三个同任务候选比较不同入口组织，默认推荐最贴合现有工作台的一种，不重选整套视觉风格。
- **影响工件：** DESIGN、prototypes/UI-001、Spec UI 绑定和 README 接续；相关能力纳入 Spec 的面板控制接口与 AC。
- **约束与后续：** 用户尚未看到并确认具体 HTML；完成浏览器预览检查后集中确认。P 不改生产 UI，Spec 在具体设计获批前保持 draft。首轮产品范围已确认，不以 UI 原型动画冒充真实 PTY/Agent 验收。

## LOG-019 — 用户采用 UI-001/final 的 A 方案
- **状态：** confirmed（UI 方向与 change 文档维护）
- **来源：** 用户明确指定本 change 的 prototypes/UI-001/final，并答复“这个方案非常的好，就用这个吧。然后更新这个change下所有相关的文档”。
- **结论：** 采用 A，保持空间侧栏、原生标签/分屏与右侧控制/通知/历史。B/C 仅保留比较依据，不再等待方案选择。
- **固定记录：** prototypes/UI-001/approval-ui.md；记录完整原型、final HTML、change DESIGN 和候选基线摘要，并说明技术收尾范围。
- **影响工件：** README、Spec、DESIGN、原型包、比较页采用状态；ADR/CONTEXT 仅补 owner 导航，不另立 UI 规则。设计树仍为产品决定共识，P 的选择由 DESIGN/本日志负责。
- **边界：** 尚未向用户明确展示 change 外的永久规范目标，不能将页面采用扩大为永久写入授权；按 P 网关补齐该唯一发布范围决定。原始方案副本不改写。

## LOG-020 — 首次设计基线与 P/S 封板授权
- **状态：** confirmed
- **来源：** 用户对明确列出的 DESIGN-0001 候选及永久 current/快照/索引写入范围答复：“发布这 6 条基线并完成封板（推荐）”。
- **结论：** 授权 P 经 A-owned bootstrap 网关发布 DS-001–DS-006，核验后正式封板 P 与 S；不要求再次选择 UI。
- **固定确认：** prototypes/UI-001/approval.md，及 evidence/publication-approval.json；包含准确内容、候选字节/规范摘要、完整原型、final HTML、absent CAS、时间与目标。
- **边界：** 原 owner 保持当前 P 会话，A 只发布首次基线；不进行整个 change 归档或产品实现。

## LOG-021 — DESIGN-0001 发布、回读与 P/S 正式封板
- **状态：** completed（仅本轮设计与规格工作）
- **授权依据：** LOG-019 的 A 方案选择和 LOG-020 的明确基线发布、封板答复；完整固定记录为 prototypes/UI-001/approval.md。
- **发布：** `publish-design.mjs` bootstrap 先 dry-run 通过，再以 `--expect-absent --apply` 完成 validated、revision-written、current-published、index-written。实际回执保存于 prototypes/UI-001/evidence/publication-receipt.json。
- **回读：** 永久 DESIGN.md 与 revisions/DESIGN-0001.md 均与获批 baseline-draft.md 逐字节一致，SHA-256 为 `50f0d924ee393fddca02d4765bd2d7bb49ba70f5e9f3bbf08ac20456b1cd651f`；规范摘要为 `ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331`。INDEX 的版本摘要和 DS-001–DS-006 均已回读。
- **绑定：** change DESIGN revision 1 已登记同一批准记录并设 approved；规范摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab` 未变化。UI-001/candidate-a 完整原型摘要 `b8bcf55791eabb1d620c990e2aaaad49f7ccec9ab6a0f557e65ba3baa12fe1af` 与浏览器证据一致。
- **验证：** materialize `--check` 验证 3 文件，design package `--check-ready` 退出 0；prototype/UI-001 与 spec 两个 stage 均为 0 errors、0 warnings。沿用未失效的浏览器证据：8 个独立 case、40 个 final 状态、289 条完整观察及比较页 2 条定向复核、13 张截图。
- **影响工件：** README、Spec、DESIGN 的确认元数据、原型包与证据更新为当前状态；S 固化设计硬引用并设 ready / ready_for_tickets true。ADR/CONTEXT 的已采纳产品取舍和术语继续有效；原始输入、历史答复及固定批准记录保持原文。
- **边界与接续：** 没有未决产品或设计问题；change 仍 active，因为产品未实现。后续按授权进入 T 或 I，不在本次自动实现、提交、推送、发版或整体归档。全仓文档检查中的范围外问题与其他未验证项见 UI-001/evidence/validation.md。


## LOG-022 — 激活 T、研究先行要求与范围冻结
- **日期/Work：** 2026-10-25，specdev/tickets；当前 change owner 仍为 codex:/root。
- **用户授权：** 激活 T，“形成最终的 tickets”，并“将这个 change 里所有的文档都进行全面的对齐”；找到参考直接写入对应文档，方便实施检索。
- **追加约束原意：** 不熟悉的功能不立即从零实现；先找 GitHub 近两年活跃、许可证明确的同类项目，比较设计/依赖/已知问题，优先经过验证的机制，不直接复制不兼容或来源不明的代码。
- **输入：** 已封板 Spec、ADR-001–009、CONTEXT、获批 DESIGN revision 1 / A / DESIGN-0001 与原始输入；已读 T、计划审查、研究辅助和真实项目 dev/ui 入口及相关参考。
- **边界：** 只写本 change 计划与说明；本轮不改生产、永久基线、其他 change，不启动实施、提交、推送、发版或归档。工作区已有 AGENTS.md/.gitignore 改动保持原状。用户已明确要求最终规划，未发现需要重新询问的高影响决定。

## LOG-023 — 五个维护活跃参考与工程接缝核查
- **检索窗口：** 2024-10-25 至 2026-10-25，以官方仓库实际 commit/release 和许可全文/manifest 核查；不是仅凭 star 或自动许可证标签。
- **主要参照：** Herdr 继续固定 v0.9.5 `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`；补充 Wave block controller/wsh、tmux Control Mode、xterm headless/flow control 和 portable-pty 平台边界。版本、来源、依赖、许可与已知问题见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> 和 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/reference-sources.json</Path>。
- **限制：** 没有运行这些参考产品，也没有引入它们的生产代码。WezTerm 的 stable release 较旧但窗口内 commit 活跃，实际 MIT 文本已回读；xterm #6063 是待本项目复现的风险，portable-pty #4784 是旧版已关闭报告，均不冒充 HUHU 已确认缺陷。
- **地形：** 核查 controller/TerminalSessions、Browser 服务键、headless 写确认、workspace store、历史来源、自动化/Home/Shell 调用方、Rust stdio/Job、既有 native 五平台构建与测试选择表；据此形成共享 owner、版本化 CLI 和迁移接线约定。

## LOG-024 — 最终 Tickets 与全 change 对齐
- **交付：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path> 导航 18 张完整票，64 项 AC 各有主要责任，无延期/遗漏；UI 票引用同一获批设计，项目 dev/ui 使用实际路径/摘要和 implement/verify 调用合同。
- **对齐：** README 接续至 T；Spec 增加最新复用要求、CLI 约定与票据入口；ADR-001 补研究依据；CONTEXT/输入说明/原型包补导航，清除原型包中已过期的待基线发布描述。公共实施合同与参考文档不覆盖 Spec/DESIGN。
- **保全：** 原始全文、历史问答/日志、设计树、已固定批准、获批 DESIGN/原型运行文件与永久基线保持原貌；并非为“所有文档一致”而重写历史。逐类检查与摘要见本轮 Evidence。
- **验证/审查：** 实际命令、逐票计划审查、路径/资源冲突处置、范围外文档问题和未实施项集中在 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/tickets-review.md</Path>；不把本轮计划就绪解释为产品通过。票级状态由原票拥有，后续只从原票回读。
- **接续：** 本次请求的最终计划已形成；后续可按用户授权经 Goal Plan 编排并由 I 实施，五平台与迁移等 required 验收保持完整。change 仍 active。


## LOG-025 — 激活 Goal Plan 与 Agent Team 模型安排
- **日期/Work：** 2026-10-25，specdev/goal-plan，mode=plan；Lead codex:/root。
- **用户请求：** 激活指定 Goal Plan Skill，“形成一个 goal plan”，在其中强调可调用 Agent Team；实现可使用 Codex GPT-6.1-sol X high，review 可使用 6 Astra high。
- **标准化安排：** 实现默认 `gpt-6.1-sol` / `xhigh`；独立 review 默认 `gpt-6-astra` / `high`。当前工具说明列出了相应模型与 effort，但本轮只写计划，没有派遣或执行。真实调用留到后续获授权 run 时记录。
- **输入/事实：** 沿现有 Spec、18 张 Ticket、64 AC、获批 A/基线和 T 的参考研究；实测 main / HEAD `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`，用户既有 AGENTS.md/.gitignore 与范围外 change 保持。当前没有项目 coordination/project.json，不为此次安排创建全局默认配置。
- **执行边界：** 用户本轮要求 plan，不自动取得产品实施或 Git/远程交付授权；沿 current 工作区选择，不创建 implementation worktree、Execution Context、空完成 Evidence 或 Agent 注册表。

## LOG-026 — 单 change Goal 编排与导航对齐
- **产物：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md</Path>，schema v8，修订 GP-001，来源 Map revision 2；5 个 Wave、G-00 执行入口与 G-01–06 产品验收 Gate。
- **调度：** 保留真实 DAG，跨票 serial；同票允许 Agent Team 的非冲突子任务。公共入口/产物沿原票共享 owner 串行写入；冻结输入后由未参与被审范围实现的 Astra reviewer 返回标准/规范双轴，Lead 核验并维护正式状态。
- **恢复：** 模型不可用、writer 未知、输入漂移、局部环境缺项、迁移失败及重复 blocker 均有对应暂停范围和恢复条件；当前宿主槽位只是当次能力，不新增项目固定实现者人数。
- **对齐：** README 更新当前 Work 和接续；Map 只导航 Goal 的 Gate/Wave/团队安排并递增 revision；Spec 补正式 Goal 导航。T-01 的 required E2E 明确限定共享 native/Cookie 租约，不再把 T-13/AC-041 的完整独立网页交互提前作为完成前置，消除隐含循环；责任覆盖与产品验收要求没有删减。其余 Ticket 内容、所有票状态/依赖、批准记录、DESIGN、原型、输入和旧 Evidence 保留。
- **验证：** 逐轴规划自查、结构校验、只读 ticket-control 与文档检查结果见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/goal-plan-review.md</Path>。规划交付完成；Goal 仍为 draft / ready_for_execution false，因为尚未收到 run 指令，不能将计划通过冒充已获实现授权。
