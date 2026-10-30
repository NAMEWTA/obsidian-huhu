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


## LOG-027 — 用户授权完整实施与代码验收
- **日期/Work：** 2026-10-25，specdev/goal-plan run；Lead codex:/root。
- **用户请求：** 根据 plan/spec/map 实施，允许 Agent Team，由 Root 编排与最后整体代码验收；用户明确补充“真实的端到端的验收 用户自己进行”。
- **生效合同：** 全部生产功能、自动化、构建与独立代码审查仍须完成。真实 Obsidian、Provider、人工审批及五平台主链交给用户；未运行项保留为人工清单，不冒充 passed。此处是用户改变验收责任，不是因环境不足擅自降低门禁。
- **工作区：** current；NAMEWTA/terminal；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715，启动前 git status --short 为空。README 建立唯一 Execution Context。
- **编排：** GP-002 / Map revision 3，跨票 serial。允许 Lead 将本票源文件委托唯一实际实现者；正式状态/Evidence、生成产物仍由 Lead 负责。模型沿原用户安排；无提交、推送、发布授权。

## LOG-028 — 承接实施前审查与验收依赖修正
- **输入：** 上轮只读审查确认四项 P2：早票的完整 AC 依赖后续 CLI/邮箱；旧业务调用未含 Space；备份跨 owner 缺公开一致性接缝；原型焦点切换后目标显示与发送不一致。
- **处置：** 按原 T/S owner 修订各切片的代码验收与最终组合责任，不删 AC；跨 owner 备份增加真实服务公共接缝和原 owner 写集；生产 UI 依 DESIGN 保持显式目标，不复制原型缺陷。获批原型与历史批准不改写。旧业务运行与 Space 规则已向用户提出聚焦选择，T-01 不受其影响。
- **T-01：** 扩展帧协议与 binary 安装器兼容重导出、Browser 模块装配测试与 controller 回归测试的精确写集；原因是 host 不得反向依赖 Agent，同时需证明未使用不触发扫描。实现者 /root/implement_t01；此前只读预检，正式解锁另在原 Evidence 记录。


## LOG-029 — 备份真实 owner 与恢复合同闭合
- **依据：** 独立 reviewer /root/review_data_and_delivery 的只读真实源码核查，原报告逐字节保存在 evidence/backup-owner-analysis.md；未冒称实现/测试通过。
- **决定：** 按现有“完整业务数据”承诺覆盖工作台相关设备集合、自动化定义及原 run/invocation/result、通知records/read/receipts；来源笔记不递归打包。采用活动BUSY、有界全owner门禁/严格排空、共同快照、journal与启动恢复门，目标为空或同摘要幂等，身份碰撞拒绝。导入及重启不补执行任务/通知，目录/权限确认重新核对，结构化env/凭据不导出。
- **落实：** 公共实施合同 §6 固定局部工程默认值，Spec §3.8 明示可见恢复限制，T-15/T-16补原owner/app/shared的精确写集及故障、竞态、往返、无副作用自动化。保留原数据结构，不新增业务DB/Run平台。T-17补T-01实际迁入host的binary安装器写集。
- **边界：** 不执行用户真实库迁移/导入；实际实现按原票推进，真实端到端由用户进行。

- **修订：** GP-003 / Map revision 4 固定上述恢复合同、已复核的跨票AC组合分工与 T-17 路径修订。T-01 的 AC/写集/实现方案不变；此前 GP-002 派单快照保留，最终审查冻结当前有效合同。


## LOG-030 — 所有旧业务运行必须明确绑定 Space
- **用户原话：** 对“现有自动化和快捷按钮只传cwd、没有Space”的聚焦问题，用户选择“必须绑定 Space，旧入口先要求用户选择”。不采用建议的独立业务运行例外。
- **合同：** 所有受管Shell/Agent及一次性业务运行启动前必须得到明确有效Space；交互入口先选择，无Space先创建，取消无副作用；后台未绑定/失效返回需配置且不启动。绑定在接纳前冻结，不随界面焦点/cwd猜测；原生结果、取消、既有receipt与invocation去重保持。
- **实施责任：** Spec§3.10与公共合同§4.1固定新行为；T-02提供可复用选择/解析，T-14扩展真实消费者/配置schema/UI与测试并绑定ui Skill及原A的Space选择/设置设计，T-15保留旧配置未绑定状态而不自动补值。原设计/原型批准不改写，也不重排无关界面。
- **修订：** GP-004 / Map revision 5。T-01合同和当前写集不变，继续实施；新契约在最终代码审查作为生效规范。

- **T-01 路径补充：** helper 移至 host 后，下载进度/摘要失败提示的词典也需由共享惰性native拥有，不能通过启用Agent取得。GP-005/Maprevision6增 shared/i18n/lazy/native.ts、scripts/module-strings.ts、agent/i18n.ts 最小迁移写集；执行者不变，补i18n验证。

## LOG-031 — T-01 宿主归属事实同步
- **范围：** helper/binary 已实际迁至 host/desktop/native；按 dev 的技能维护规则，仅更新 architecture 参考中终端辅助程序缓存的 owner 单元格。Lead明确将该文件窄行加入T-01写集，实际 writer 仍为 /root/implement_t01。
- **摘要：** architecture 参考变为 `f9ae1496c12ed18be88ade5baafd0a6aca5ebec3a025d0bb522f2bd3698c661f`，所有Ticket中对应真实reference摘要同步；历史派单与原Evidence保留原文。规则内容、AC和产品行为不变。
- **修订：** GP-006 / Map revision 7。实现者已停止源文件写入，Lead开始构建、lint和固定快照独立审查；未宣称票已完成。

## LOG-032 — 原生首用加载与包体预算核实
- **实际失败：** T-01首轮bundle检查超限；实施者用esbuild内存overlay重放HEAD，基线6033579B，新候选6041860B，净增加8281B，旧binary/frames重导出输出0，没有双实现。增加来自NativeHost能力owner/代次、取消/退出等待及接线。
- **改进：** 将app原生工厂移入首次acquire才加载的src/app/native.ts；Root批准该精确写集，源writer仍为原实施者。先减少启动求值，再按最终实测决定最小必要阈值。原启动预算仅比基线多13B，不能据其删除功能合同。
- **预算所有权：** scripts/bundle-budget.json明确允许有记录理由的增长；新增必要代码经逐项归因后由Root独占调整output/eager最小KiB边界，其余阈值和禁止eagerAreas保留。原失败、分析与最终结果都保留，不能冒充原预算已通过。GP-007 / Map revision 8。

## LOG-033 — T-02生产接缝与单writer最小原语
- **依据：** /root/prepare_t02只读生产源码与官方机制比较，逐字节保存 evidence/T-02-preflight.md；没有将预检视为实施或测试。
- **决定：** 采用同TS写进程持有的loopback确定端口互斥；避免helper持锁与TS写入分离的fencing缺口，无新增依赖/native协议/业务控制服务。不同程序或散列碰撞保守冲突，不换端口，不按PID/mtime接管；正常严格排空后释放，崩溃由OS释放，异常效果未知不重放。Windows安全边界保持Spec原定义。
- **存储/接线：** workbench-v2单envelope与v1隔离；生产workspace-service先存身份再启动，model/ops保存稳定引用，真实主空态与module惰性selector接通。旧消费者完整适配仍归T-14，完整迁移T-15。
- **路径/Skill：** T-02补真正生产服务/normalizer/主空态/module/路径常量及架构事实精确写集；vault-identity源保持只读；补实际适用dev参考摘要。GP-008 / Map revision 9。T-02仍ready未分派，只有T-01活动；等其独立审查/验收后才解锁。

## LOG-034 — T-01代码验收与T-02同票协作
- **T-01：** 最终38文件固定快照、构建与适用自动化通过；独立reviewer /root/review_t01 两轴pass，原P2取消竞态已修复，原报告和反例红绿输出保留。代码层面done；真实宿主/Provider/五平台E2E仍由用户验收，G-01尚未关闭。
- **结构核验：** goal-plan检查0错误，5项已按serial处理的后票共享路径警告；ticket-control确认T-01 done，无Evidence错误。
- **T-02：** 按既有GP-008/Map9解锁；先由 /root/prepare_t02 固定core/space三份纯合同，再以不重叠desktop/spaces写集委派第二实现者。每条路径唯一writer，Root持有产物与正式记录；实际派单及摘要记录在T-02 Evidence。

## LOG-035 — T-02最终spawn重验与接口冻结
- **源码事实：** TerminalSessions.create在Controller调用后仍等待helper、environment和Hook；仅在WorkspaceService校验会留下等待窗口。A确认最小CreateSession.beforeSpawn钩子，在最后spawn前重验并再次检查取消/关闭，失败保留failed记录且不spawn。
- **写集：** T-02增加services/terminal/sessions.ts与精确sessions-space.test.ts，由A唯一写；B仍仅desktop/spaces。GP-009 / Map revision 10，行为合同不变，只闭合已要求的最后启动重验。
- **接口：** A三份core/space合同由Root逐字节核对后冻结；B已实际followup_task解锁，接现有6.1-sol/xhigh，实际摘要见T-02-dispatch-b.json。
- **布局：** v2 envelope的sharedLayout承接无Space网页/业务页面显示，仍由同一业务队列和writer持久化；各Space布局保持layouts[spaceId]。v1不被新写入覆盖，独立Browser owner留T-13。属于既定合同内的局部schema选择。

## LOG-036 — T-02已授权库外目录的现有restore接线
- **事实：** 旧resumeAgent在captureLaunchHost前使用canonicalVaultCwd拒绝全部库外目录，不能承接已明确授权的库外Space。
- **最小变更：** 给LaunchHost注入可选validateCwd；只有已持久化并冻结Space/目录的生产restore使用该校验，其余旧调用继续canonicalVaultCwd。账号、原生来源、权限确认保持原链，最终beforeSpawn再次重验。
- **写集：** A独占services/launch/launcher.ts及新增launcher-space.test.ts，验证注入失败零start与未注入的默认边界；不复制launcher、不开放任意字符串授权。GP-010 / Map revision 11，B端口不变。

## LOG-037 — 严格flush失败仍完成清理与后票只读预检
- **T-02事实：** 新workspace严格flush可reject，旧Controller.dispose会提前退出并跳过后续清理。A确认顺序settle全部清理，已启动sessionsStopped立即处理拒绝，最后聚合原始错误而不吞持久失败。新增controller-space.test.ts由A唯一写，使用真实dispose及真实workspace/SpaceService失败验证。
- **T-03只读预检：** /root/prepare_t03报告已逐字节保存在evidence/T-03-preflight.md；证实关闭视图仍remove进程、后台列表仅枚举tabs。补充Sidebar生产/DOM、TerminalTabView DOM与controller-managed-runtimes精确写集；T-03仍ready/unassigned，未授予实现。最终消费T-02接口须在其done后重新回读。
- **修订：** GP-011 / Map revision 12。产品合同未改，T-02 B端口/写集不变。

## LOG-038 — T-02实际包体与架构事实收束
- **停止与事实：** A/B源writer已停；Root核对33+8文件候选清单与当前字节。架构参考仅按实际v2路径/归属更新，所有Ticket的当前Skill引用摘要同步；历史派单与审查原件不改写。
- **实测：** 首次T-02包体门未通过：main.js 6075071B（T-01最终6042405B，+32666B）；styles.css 1421356B（+566B）；Agent激活1013408B，原阈值991232B。启动106输入、123533B仍在既有123904B以内，无新增禁止启动区域、运行依赖或重复原生实现。
- **所有权与恢复：** T-02精确加入scripts/bundle-budget.json，由Root独占；按元数据核对Space业务、目录校验、writer、UI与词典新增后，仅对实测超限的总JS、样式和Agent激活阈值按最小KiB向上取整，保留原失败与归因原件，不将原预算记为通过。GP-012 / Map revision 13；行为/设计合同不变。

## LOG-039 — T-02独立反例修复与再次冻结
- **原始审查：** 独立reviewer两轴request-changes，复现future格式降级、foreign scope写后拒绝、首次writer load EIO后无效实例缓存、切Space双启动丢标签；原报告/输入/反例保留，不以首轮常规绿灯覆盖。
- **修复所有权：** 仅原A写SpaceService/WorkspaceService及邻近测试4文件；每次primary/backup读取与写前在同permit分类版本/完整scope，成功初始化才采用disk，追加布局在业务队列中使用最新值。产品/设计/写集合同不变，无新增授权问题。
- **实际验证：** 正式红灯后94条相关测试与8条DOM通过；Root build、全lint、架构/回调检查通过。架构与临时夹具脚本并行造成的扫描失败已保留并串行复验；不再并行这两项。
- **预算：** 修复后main.js6075528B（+457B）、Agent激活1013868B（+460B），启动仍123533B/106输入；原2 over失败和最小KiB阈值6076416/1014784理由均保存。下一步固定45文件独立复审，当前票仍in_progress。

## LOG-040 — T-02选择/布局闭包新反例与实质恢复
- **复审：** round2关闭版本/scope与首次读取恢复原缺陷，但独立控制select写入与后台append顺序后复现新P2：A当前界面未adopt刚保存的terminal，后续正常UI保存将其删除。原报告与probe字节已核对保留。
- **复盘与恢复：** 前集成周期3次尝试已保留；新证据要求把原A的workspace-store bridge纳入修复，在选择、服务变换和本地dirty/在途save之间协调同一布局。输入/方法/责任范围有实质变化，按Goal deviation-control开启新Packet/周期，不盲目原样重试；原总票写集和GP-012/Map13不变。
- **边界：** 原A继续唯一源码writer，B/UI/词典/docs不动；独立reviewer已停审后才解冻。T-03只读准备，仍不允许生产实施。无用户待决定项、无新增产品范围。

## LOG-041 — T-02布局草稿协调闭包与第三轮冻结
- **实施：** 原A在原总写集中协调每Space base/view/dirty/在途回执；UI提交冻结base/value，业务队列与后台transform合并，同ID新布局可见且保留后续本地编辑和焦点。真实既有字段冲突拒绝并保留双方；无定时补偿或自动重放。
- **验证：** 精确反例正式红灯后14文件116测试通过，三条原probe当前源重建观察均修复；Root完整回读清单/命令原件，build/full lint/架构/Promise检查通过。原UI/B源码未变，按证据闭包复用。
- **预算与审查：** 最终main6077894B/Agent1016228B，新增2366B/2360B；原超限保留，Root仅必要KiB阈值6078464/1016832及理由更新后bundle通过。47文件冻结，实际调用原独立reviewer第三轮，未返回前T-02保持in_progress、T-03未解锁。GP-012/Map13与产品/设计合同不变。

## LOG-042 — T-02代码验收通过
- **独立回执：** 原reviewer第三轮standards/specification均pass，前两轮反例全部关闭；额外两个晚关闭/append断言及6文件74测试通过。Root逐字节保存原报告，核对12份产物SHA并回读源/原输出。
- **最终输入：** 47文件/28来源/31份T-01复用源无漂移，Input-SHA256 `1eab3f4af09475cad4c562fecbe4be304f06b16389c67f579a6763661fe33901`；Root在解锁下一票前实际checkCurrent:true/requireDelivery:true校验errors=[]。
- **投影：** T-02代码层面done；真实宿主/Provider/五平台E2E按用户分工未运行，完整Goal/Gates尚未完成。保持GP-012/Map13与串行调度，下一frontier是T-03；没有提交/推送/发版/归档。

## LOG-043 — T-03正式解锁与同票接口先行
- **前置：** T-02最终当前输入核验及Goal结构通过；分配A owner后ticket-control返回唯一frontier T-03、errors=[]。原T-02 47文件与此前总78路径字节快照已保存。
- **真实派单：** Root实际followup_task解锁 /root/prepare_t03（既有6.1-sol/xhigh）；先冻结纯DTO、公开方法和en/zh键，再给 /root/prepare_t02 单独解锁不重叠UI。当前B只读预备，无提前生产写入。
- **边界：** 唯一TerminalSessions运行owner，SpaceService持久owner，WorkspaceService只编排/投影；Root保留产物和正式状态。Controller取消/失败/后台/迟到失效不得无条件open，旧菜单和六Provider语义保持。GP-012/Map13、已批准产品/设计不变；真实E2E仍用户负责。

## LOG-044 — T-03真实接口冻结与界面接线
- **已核验：** Root逐字节回读A回执，纯managed-runtime DTO与en/zh键SHA一致，create/query/subscribe/attach公开方法已经落源且订阅函数绑定稳定。A首次生产类型检查更正旧rename调用后通过；这只是接口里程碑，不是整票验收。
- **真实派单：** 实际followup_task解锁原B句柄 /root/prepare_t02（6.1-sol/xhigh）；只写指定create、Sidebar、TerminalTabView及邻近DOM。冻结原件与派单摘要保存在evidence/T-03-api-frozen.md及T-03-dispatch-b.json。
- **协调：** A继续服务/生命周期内部实现，i18n仍A唯一owner；B消费缓存快照并保留原菜单。接口变更先通知，整库生成/检查等双方停写后由Root执行。GP-012/Map13、用户Space决定与设计合同保持。

## LOG-045 — T-03隔离真实Shell组合测试委派
- **范围：** A确认workspace-service-native.test.ts尚不存在且不再准备写；Root实际followup_task分配给原 /root/implement_t01（6.1-sol/xhigh），从A原workspace-service*.ts分配中精确排除。总Ticket写集与GP-012/Map13不变。
- **目的：** 真实desktop Space/JsonStore、WorkspaceService、TerminalSessions与NativeHost/helper组合证明后台、detach、同runtime/PID/屏幕重新附加及无额外spawn；有界等待、只清理自有测试进程。C不改生产源与其他测试，不冒充用户Obsidian/Provider/五平台E2E。
- **协调：** C先收尾T-14只读预检后实施当前T-03；后票仍不解锁。Root等A/B/C停写后生成、固定快照与审查；派单原件见evidence/T-03-dispatch-c.json。

## LOG-046 — T-03候选收尾的菜单实例时序修复
- **新观察：** B停写后自查发现旧Omnibox请求等待期间菜单关闭并重新打开，旧created回调可能关闭新实例。尚未固定整票候选，不能把先前43条DOM通过视为覆盖该顺序。
- **实际协调：** Root实际send_message仅解除B自有Omnibox与NewTabMenu DOM两路径冻结，要求确定顺序红灯、卸载后忽略旧UI回调的最小修复；不能取消已提交的业务运行。其余B路径和C真实native测试保持停写，A仍收尾自己的服务写集。
- **边界：** 无公共签名、词典、产品或设计变化，无扩展Ticket写集；GP-012/Map13保持。待再次STOPPED并核对完整清单后再统一构建、冻结和独立审查。

## LOG-047 — T-03统一回归与实测预算的精确补集
- **原始结果：** Root统一build通过。扩大原入口回归为16文件91测试，89通过、2失败，均controller-native.test.ts旧fixture缺getBasePath，真实Space目录门拒绝空路径；未删除或跳过这两条lazy/discovery/native零副作用断言。原输出及exit126保留。
- **测试边界：** T-03补controller-native.test.ts精确写集，拟由C唯一适配为有效隔离临时Vault并验证完整清理；生产目录门和Controller不放宽，A/B其他源保持STOPPED。C原真实Shell组合文件仍冻结。
- **预算实测：** main.js6104991B，较T-02最终+27097B；Agent激活1037298B，+21070B；styles1421645B，仍在原阈值内。初次budget真实exit126、2 over；启动106输入仍在原阈值，未增依赖。Root先核对元数据归因，再按最小KiB仅调整必要总JS/Agent阈值，保留失败原件。
- **修订：** 同时补scripts/bundle-budget.json，Root唯一writer。GP-013 / Map revision14；没有产品或设计决定变化，原派单与先前证据不回写。

## LOG-048 — T-03独立审查反例与原owner修复
- **实际审查：** 新独立reviewer codex:/root/review_t03（Astra/high）对29文件固定输入返回两轴request-changes；Root全文回读报告及生产链探针/真实输出、逐SHA保存原件。明确不存在Shell仍EFFECT_UNKNOWN、原Shell选择在attach→restart丢失，两项均为AC-005既定闭包；YOLO覆盖整份设置假设已证伪。
- **精确补集：** 补shared/native/host.ts、host/desktop/native/helper.ts及helper.test.ts、native main.rs与tests/stdio.rs，native session.rs已在原票写集。允许原A单一writer建立结构化已知拒绝/未知区分并修配置来源；不得按人类错误字符串判断，也不得把Rust post-spawn初始化失败无条件标零进程。旧helper无新增证据字段须保守处理；现有owner隔离与早exit保持。
- **修订：** GP-014 / Map revision15；产品/设计合同不变，原输入/报告/命令与首轮source另存，不覆盖失败历史。Root构建/预算/正式状态，B所有UI与C两测试继续冻结。
- **尝试：** 首次集成旧fixture失败为attempt1，修复后29文件候选独立审查失败为attempt2；同范围修复进入attempt3。只改两项已证实行为与必要类型/原生证据接缝，新增正式红灯回归和真实helper闭包后重新冻结复审；T04仍不解锁。

## LOG-049 — T-03代码验收通过
- **复审：** 独立Astra/high reviewer第二轮standards/specification均pass，两项旧P2关闭且新增0；Root回读原报告/真实探针与22份原件，源与SHA核对一致。
- **实际检查：** 当前build、22文件115测试零skip、全库lint、架构、Promise与最终预算exit0；Rust36测试零ignored与helper验证通过，UI未变复用44DOM及13状态14截图。范围外Bot文档6锚点失败及用户负责的真实E2E明确保留。
- **冻结与校验：** 37文件/28来源/61前序复用，Input cdc8b69094eaae3db8a18f890b6f403ea190a3203b8c14ba71876f442ac92ad4；状态投影前checkCurrent/requireDelivery errors=[]。Evidence机器字段缺失造成的校验126保留，格式补齐后implement 0errors/5serial warnings。
- **投影：** T-03代码层面done；GP-014/Map15保持，G-01仍待T-04。下一frontier T-04需按已完成T-03与只读提案核定精确路径/合同后派单；全18票Goal继续，未提交/推送/发布/归档。

## LOG-050 — T-04 停止/归档/恢复真实接缝与唯一 owner
- **前置：** T-03 已done，Root状态投影前最终当前审查errors=[]，implement/goal-plan均0errors；98份前序产品源与完整字节快照保存T-04-prior-delivery.json，HEAD/branch未变。旧预检中的已修复early-exit假设不重复实施。
- **补集：** T-04增加实际SpaceService/records及回归、managed-runtime/必要model/ops、Controller停止恢复测试、限定旧runner停止适配、TerminalTabView/confirm DOM、真实shared/native与desktop host/helper、Windows内部bootstrap、既有windows-sys必要features及Root测量后预算。所有路径实际写者仍按派单唯一，条件路径不要求必改。
- **局部决定：** 首次Session/运行尝试持久提交先于spawn；归档冻结集合并在单队列关准入/复核，等待不占磁盘队列；根exit与native清理证据分开。Windows选择受控bootstrap私有gate与单Session Job，Unix保留可证范围与partial/unknown，不宣称任意宿主外daemon均可控制。停用Agent必须保留Browser租约；恢复读取无自动执行。
- **修订：** GP-015 / Map revision16。产品/设计合同及用户Space决定不变；既有官方研究/许可原件保留，T-04具体API提案须Root回读后随正式派单冻结，未以只读报告预填实现通过。

- **派单前最终提案补充：** Root全文回读A最后只读提案（SHA9307a35ade6d9b00639111dcad090299befc19f6049080fd6436887fd0ae78ee），在C packet投递前同次GP015/Map16补SpaceError/messages、launcher权限等待取消和唯一test/fixtures/native/terminal-termination-v1.json；该packet尚未投递，不覆盖已发生派单。采纳protocol3可选capability/版本化termination notice、四个业务方法与pre-spawn checkpoint/归档闸；numeric exit、root-only或坏字段不得合成cleanup confirmed。

## LOG-051 — T-04 实际双 owner 派单与协议先行
- **实际工具：** Root分别followup_task原 /root/implement_t01 原生C与 /root/prepare_t03 业务A，沿用户指定6.1-sol/xhigh；两份实际packet/输入SHA/路径与调用回执在T-04-dispatch-c.json、T-04-dispatch-a.json。同票并行，跨票仍serial。
- **接口顺序：** C首先实际落源统一native纯类型/codec/单一Rust+TS fixture，Root回读后A消费；A先可做自身持久准入/归档队列，公开四方法/DTO/词典落源冻结后才给B UI写权。C拥有cargo与debug binary lane，A真实helper测试等待新binary交接；Root统一生成与全局验证。
- **状态：** T-04 in_progress、attempts0，无预填代码/审查通过。T-05–18保持锁定，原始失败/前序证据不改写。所有writer只修改获分配源，Root不并写其源码，无新增用户批准事项。

## LOG-052 — T-04 实际业务接口冻结与 UI 派单
- **已核对：** Root全文回读A公开DTO、stop/wait/previewArchive/archive四方法与en/zh文案，5份源SHA一致；scoped API类型检查exit0。C codec数组类型反例红→绿及35项唯一fixture也已核验，原v1和失败输出保留。
- **实际工具：** followup_task解锁原B /root/prepare_t02，沿6.1-sol/xhigh与GP015/Map16。只写sidebar、TerminalTabView与条件confirm精确路径；A业务/词典、C原生/host、Root生成物与正式记录继续唯一owner。
- **边界：** 公共签名停改但内部实现未完，B按固定目标确认、结构化结果和恢复准入接线；真实生产组件Chrome验证与用户真实E2E分列。全局生成/检查待writer停写，T04仍in_progress/attempts0，后票保持锁定。

## LOG-053 — T-04 真实确认焦点反例的精确范围补集
- **观察：** B实际Chrome取消停止确认时effects=[]、dialog=false，但焦点未回原按钮。分离confirm与业务busy后第二次仍复现；原v2/v3日志保留。Root回读页面受控AlertDialog没有Trigger及原真实日志，问题属于本票键盘/焦点合同。
- **补集：** GP-016 / Map17，仅新增src/modules/agent/ui/AgentWorkspacePage.tsx及其DOM测试到B写集；捕获原document/trigger并按连接、可见、窗口与用户焦点意图恢复，隐藏/卸载不抢焦点，不用延时强制focus。其他源owner不变，原GP015工件字节另存T-04-logs/scope-v16-*。
- **接口闭包：** 无Pane的恢复记录需由WorkspaceService显式打开只读占位，零helper/scan/spawn，再复用明确继续；Root已接受A最小openManagedRecord提案，实际冻结另存，不使UI自行造runtime。原产品、设计、18票目标与用户E2E分工不变。

## LOG-054 — T-04 原生中间候选与业务组合验收
- **已回读：** Host后置numeric exit缺失超时红绿、Unix已知成员不可读反例红绿及隔离真实进程树通过，原始输出/SHA在T-04-logs；不把根退出或读取失败当完整清理。
- **实际协调：** C冻结独立Linux helper副本，Root核SHA后实际send_message交A，仅经显式HUHU_TEST_PTY_BINARY运行生产Workspace/Space/NativeHost停止、归档和重开零执行组合。C继续独占cargo/target与Windows实现，中间副本不可覆写。
- **环境验证：** 允许C向现有rustup cache添加同版本Windows std target进行cargo check --locked；无新增仓库依赖、锁或权限要求，交叉类型检查与真实平台运行分列。GP016/Map17和产品/设计合同不变，整票仍in_progress/attempts0。

## LOG-055 — T-04 整合回归与旧 Browser 测试补集
- **实际结果：** Root全build在正常重生成styles后exit0；lint、架构、Promise、i18n、CSS及构建文本通过。最终固定helper组合37文件234测试中233通过、1失败：旧browser/module.test.ts只模拟numeric exit，当前生产正确返回清理未确认。原始失败保留，不放宽生产断言。
- **补集：** GP-017 / Map18仅新增src/modules/browser/module.test.ts到本票共享写集，拟委派C唯一适配，原17路径生产源保持停止。测试仍证明Browser惰性与Cookie在Agent停用后完成，并分别观察已确认清理和旧协议未知失败；不改Browser生产实现或T-13范围。
- **构建观察：** main6147898B、Agent1066150B、Navigator202878B导致3项预算超限；启动123518B/106输入未变，styles1421846B在原阈值内。Root继续核对逐输入归因后才调整必要最小阈值；文档仍为范围外Bot原6锚点，不记全绿。
- **范围审计：** 另发现Cargo.lock仅huhu-pty package区块顺序变化，Root按解析package图证实依赖/版本/校验相同，要求保留原件后恢复干净固定base字节。C以实际记录/隔离复现区分事实和mtime推断，不覆盖已冻结helper或原producer证据。没有新增依赖或修改许可范围。

## LOG-056 — T-04 独立审查三项反例与同范围修复
- **实际审查：** 原独立Astra/high返回standards/specification均request-changes，57文件/30来源交付复核未漂移。原报告SHA2fd68b12ef9d8954fdfe60425235ea60502b41caca66aa8d60cb09f76e2d6772及四组真实反例已Root回读/保全，见T-04-review-root-audit-round1.json。
- **处置：** F1残余后代首stop/force零请求；F2pending持久化使关闭/归档观察无界；F3quiesce后旧请求仍spawn/adopt。均属原T04合同，交原A修复；不可取消write须保持owner隔离/未知事实，不能提前释放writer或晚到归档。F3不提前T14消费者绑定迁移。
- **执行：** GP017/Map18与原写集不变；先核A只读修复方案，实际Packet后才解锁。原红灯、冻结快照及attempts2保留；第三轮集成须在实质修复后执行，独立review未通过前T04保持in_progress、G01open、T05仅只读预检。

## LOG-057 — T-04代码验收与G-01代码关闭
- **复审：** 新独立Astra/high /root/review_t04_round2两轴pass，F1/F2/F3及对应规范问题闭合；Root全文回读原报告、实际5probe和58修复测试日志，核8报告SHA/3命令记录并保全22原件。原request-changes不改写。
- **整合：** 第3次build、37文件262tests零skip、lint零warning、architecture1226模块、Promise及最终预算exit0；docs仍另一Bot六个既有锚点。UI/Rust未改源证据按原范围复用；main修复增量2316B/Agent2310B只调整最小两阈值。
- **冻结：** Input22acab5546bc320876cbf8030e00f2fe8e8234d84e0d647f8a639fbe16e9fa00，57scope/31来源/58前序复用；投影前checkCurrent/requireDelivery errors=[]，implement0errors/5既有serial warnings。T04 review→done，attempts3保留。
- **Gate：** Root按Goal G01核对T01–04与当前生产组合，代码部分关闭；真实宿主/Provider/五平台仍由用户待验收。下一frontier T05先核定精确范围与K03复现，再实施；18票Goal继续，无提交/推送/发版/归档。

## LOG-058 — T-05真实源准入与精确范围补集
- **前置：** T04 done与G01代码关闭，最终goal-plan校验0errors/5既有serial warnings。115份前序产品源字节快照在T-05-prior-delivery.json，原T04审查与历史输入不覆盖。
- **路线：** Root全文回读算法、native、Session和view窄提案；后两份32+20源SHA全部一致。选择固定xterm6集中语义投影，单headless接收raw；source/target对象不共享，normal/alt/extended/OSC8及事件桥需真实证明。native采用相关整笔输入准入、单公平有界outbox与独立parser reply，不以write(false)当未写。候选字段/profile尚待K03后实际冻结。
- **补集：** GP018/Map19增加A两个paste+Enter调用端和Controller失败分类、B集中view adapter/资格测试、C真实shared/desktop host及main/outbox/data/cookies/agent_data生产前预算、唯一cross-language fixture；Root条件pin现有xterm/search版本和预算。无新运行平台、无enginefork、无默认依赖升级或node_modules改写。
- **先后：** 第一实际子任务仅K03在当前6.0.0复现及相邻行为测试；A返回原源/命令/输出后再解锁生产DTO/native实现，B等待实际接口冻结。容量必须覆盖model/combining/link/parser/clone和native生产前预算，不能以队列有界伪称RSS无界风险已解决。

## LOG-059 — T-05 K03核验与当前版本固定
- **事实：** 原A返回SOURCE STOPPED；Root核验5次实际运行全部源/命令/UTC/退出码/日志与115前序字节，保全73原件。最终16tests/0skip/exit0；人工缺行两probe真实exit126，自然fixture坐标失败单独保留，不冒充生产根因。
- **决定：** 自然路径未复现缺行，不做engine升级、补行或reset修复；仅精确pin已有解析版本xterm6.0.0/search0.16.0，依赖图不变。后续集中adapter验证固定版本shape。
- **执行门：** A先交实际纯screen/Session public API，C先交实际统一wire fixture/TS合同；Root读取真实源再解锁B。生产副作用与检查以实际Packet/工具回执为准，整票保持in_progress/attempts0。

## LOG-060 — T-05实际接口冻结与界面生产派单
- **接口：** Root回读C实际input/wire v1、v2和output credit常量，TS/Rust同fixture及原失败日志分别保全；native enforce/压力仍在C实施。A实际pure DTO、Session stream/lease/input包装及source effects核读，5命令源/日志SHA无差异，140原件保存；public字段/签名/11双语键冻结，内部继续。
- **界面：** B临时真实Chrome可行性49原件已审计，stock滚动IME限制如实保留，不冒充生产验收。Root现通过实际followup_task派B在10条精确路径实施生产target adapter/接线/Chrome验收，T-05-dispatch-b.json记录原准备SHA与实际回执；不改engine、依赖或原设计。
- **测量：** C可在显式测试env和自有临时目录写一次有限队列峰值，默认无I/O，不改wire；只采真实生产计数器，未知、逻辑预算与RSS分列。尚未交付的测量不记已通过。
- **状态：** A/B/C并行独占各自写集，Root待SOURCE STOPPED后串行整合和独立双轴审查；T05仍in_progress/attempts0，后继票未解锁。

## LOG-061 — T-05失败收束与明确放弃显示
- **实际问题：** Root只读核得history预检/实际行间并发更新、spawn本地容量拒绝被当未知scope、失败spawn提前释放reader/ACK归属；C已复现第一项红绿，其余按原写集修复，最终证据待交。
- **最小方案：** 失败spawn采用Host内部output/ACK计数和failedNone专用drain，native失败帧按SID排在既收raw之后，保留retiring资源；不新增waitSessionDrained API。
- **显式丢弃：** 模型超限后不得ACK未解析raw；仅靠旧协议会永久留native credit。Root批准可选outputAbandon:1和captured abandonOutput：明确截断显示、单独释放raw credit，encoded outbox/reader/scope责任继续。普通stop仍解析到最后；legacy不猜新能力。C先交v3实际合同，Root核后A消费。
- **界面组合：** B真实生产Chrome抓到一次批量滚屏结构增量非法，交A内部修正，B严格trim检查保留；不修改固定DTO或放宽断言。上述尚非整票通过。

## LOG-062 — T-05公共丢弃接口核定与生产组合反例
- **实际接口：** C交付v3真实outputAbandon/abandonOutput及strict控制fixture；Root核7公共源SHA、TS/Rust各29份源码快照、2原命令/日志，保全72原件。TS六测试通过；Rust同一fixture在两个binary执行，不重复计数。Root已实际发消息交A消费，内部enforcement和压力仍未验收。
- **界面反例：** B实际Session→Chrome捕获长批次trim非法、同owner重复focus后失去尺寸资格、?12l未覆盖用户光标闪烁默认；原失败保留，交A修模型，B严格验证不放宽。不是Obsidian/真实OS IME验收。
- **调度审读：** Root从当前Outbox发现burst不复位会使持续输出后的high控制饥饿，high与bulk持续时又可饿死stream；u32::MAX游标也不能依saturating_add轮换。已交C同范围先复现再修，尚无通过声明。
- **状态：** T05继续in_progress/attempts0，A/B/C各守原写集，整合和独立审查待实际SOURCE STOPPED；后继票保持依赖锁定。

## LOG-063 — T-05多视图分配前准入与中间证据保全
- **实际核验：** B于13:58:27Z停源的10条分配路径、28次原命令及浏览器工件完成812项SHA检查，816原件保全于T-05-logs/b-production-v1；31项定向测试与15项真实Chrome检查通过，三张可读生产pane截图已Root查看。A在这些检查后仍修改，旧结果不冒充最终组合通过。
- **最小解冻：** Root/B实际读得mount先new Terminal/open后registerView，拒绝仍留empty Terminal，无法兑现分配前总预算。Root已实际send_message仅解冻B原写集中的View与必要回归，将lease准入前移、拒绝零bootstrap、构建失败释放partial资源。A内部按lease保留多视图shadow/xterm/search及传输峰值高水位，hide不减账；不扩公开DTO或产品合同。
- **窄修复：** C两端公平调度/u32最大SID红绿、history并发读红绿与A稳定read/UTF8/历史snapshot预算检查，共9次实际记录及源码273原件已核SHA。A历史read最早红灯为parse ACK timeout，不把它当隔离预算反例；最终测试固定Date并分别检查明确容量拒绝和受控到期。详见T-05-midfixes-root-audit.json。
- **剩余：** C真实压力中慢stdout/无ACK后显式放弃通过；blocked-input业务断言通过但helper强退前metrics未生成，原失败保留，正在查retiring资源。Linux不可变候选交接、A真实Session压力、全局整合与独立审查仍待完成。GP018/Map19及attempts0不变。

## LOG-064 — T-05界面再次停源与压力结果纠偏
- **B最终局部交付：** 14:29:23Z v3停源，普通dispose与bootstrap失败共用完整清理、lease最后释放；原抛错回归失败保留。Root回读34项定向测试、scoped类型检查、16项真实Chrome结果及三张pane截图，核12次v2/v3命令与356份源检查、保全420原件，当前B十路径SHA一致。见T-05-b-production-final-root-audit.json；最终A/C组合及独立审查仍未完成。
- **压力纠偏：** C一份exit0压力原件仍含ACK容量错误与12285B未确认raw，撤回该通过判定；后续每SID有界ACK合并及Unix可取消writer定向运行3项通过且无consumer错误，最终credit与三个handle待完成计数均零。EOF时点slot尚待监控线程收束，不冒充最终全局资源快照；真实handle drop顺序、保留Browser再spawn及不可变二进制交接仍待C收尾。
- **文案窄补：** A发现非破坏性scrollback拒绝不能复用“已请求清理”文案。Root实际消息授权仅新增agent.screen.retentionRejected双语键及既有setScrollback拒绝提示，原11键冻结历史保留，DTO/方法不变。最终行为证据待交，不扩大产品范围。
- **只读准备：** B生产保持停写，Root仅委派它复用T06旧预检核对当前UI/定位接缝，输出临时只读报告；未解锁T06实施。GP018/Map19、T05 attempts0及后票依赖不变。

## LOG-065 — T-05最终组合中的生命周期回归与窄测试补集
- **稳定组合：** A在C的TS停写窗口完成真实3000行UTF-8压力，raw/ACK同为91915B、两个scope confirmed/drained、自有PID均退，before/after无源码漂移。所用7e03不可变helper仍是中间候选，C后续原生修复须在最终组合重验。
- **实际回归：** C完整cargo发现typed-none启动失败后立即复用SID时，旧reader/writer/master尚未drop；保留原红灯，仅在worker内对零raw的本地资源有界观察真实drop，不占main/control锁、不提前释放slot。定向原用例已绿，全native仍在收尾。
- **测试补集：** A真实T04三项组合2过1失败，失败发生在业务断言完成后finally再次停止已retired SID，释放链被异常短路。Root读原源/日志后授权A仅新增workspace-service-stop-native.test.ts，按confirmed事实避免重复stop，各清理独立执行且保留错误。GP019/Map20补此唯一路径；不放宽生产unknown SID拒绝或原业务断言。
- **后继只读：** B的T06入口报告及29来源观察已保全；既有split命中只activate tab、未选目标pane为静态发现，尚无运行复现。T06继续依赖锁定。整票仍in_progress/attempts0。

## LOG-066 — T-05原生最终停源接收与旧Session兼容回归
- **C接收：** 最终正常helper ebbf169532e29e5eaeb706a1ec286b8d13285d2b1b0a2da1160c28df2dbbf0a6、0555/25714024B及12份Rust/Cargo来源已核。完整cargo、verify、Windows交叉类型与最终4文件24tests/0skip通过；Root核78原命令及1566源快照、保全1785原件，19失败和1 invalid green保持。原早期源/metrics缺口不补造。
- **最终范围：** C仅格式化的helper.test.ts已按Root派单恢复T05前序字节，原v1保留；v2实际24允许路径+5只读native输入核SHA一致。其余源/cargo停止。最终native与command/current-source审计分别见T-05-c-linux-final-root-audit.json、T-05-c-production-commands-root-audit.json、T-05-c-production-final-root-audit.json。
- **A兼容：** 旧真实T04清理修复后3项通过；70项相邻单元出现3处原契约回归，保留原红灯。异步订阅时序与提前exit身份修复后相关47项通过；Root另指出pending输出已进snapshot又重放的静态风险及legacy保留量，A继续原写集验证水位和聚合预算。不是整票通过。
- **后继：** C仅获T06 hooks/detection实际证据接缝只读提案，T05生产继续停源，T06未解锁。最终A停源、Root整合、真实组件Chrome与独立双轴审查仍待完成；GP019/Map20、attempts0不变。

## LOG-067 — T-05 最终停源与统一整合启动

2026-10-25 15:21Z。Root已接收原A最终交接，核对A/B/C共56当前源和原始副本无差异，全部产品writer保持SOURCE STOPPED。冻结1948构建/测试输入，开始T-05整合第1轮，使用C最终ebbf1695… helper。T06仅只读准备，尚未解锁实施。


## LOG-068 — T-05 两轮集成、生产Chrome及诊断恢复

- **整合：** 两次实际build通过；第一轮182/183tests，旧4字节非法header立即拒绝回归由C窄修且14项通过。第二轮184/185tests，final helper屏幕压力3000行/raw=ACK91915B、设备回复一次、双scope确认并自有PID退出；唯一blocked-input失败的cleanup master=1可能覆盖primary，未放宽或宣称根因。
- **恢复方法：** 一次/tmp隔离probe按原34cycles/断言/预算通过，不能证明组合稳定。Root仅解锁C原host-stream.integration.test.ts，保留primary与每层cleanup并记录有界stage/cycle/SID；生产源/helper不变。下一次整合为attempt3，原计数与失败不清空。
- **UI与门禁：** Root真实Chrome生产组件16/16通过，输入48源无漂移，三张pane图实际核对；明确fake native/Obsidian边界。lint零警告、架构、Promise、i18n、notices通过；docs仅六个既有无关Bot锚点失败。原始Markdown快照改扩展名保留字节，未改guard。
- **归因：** 完整相似度在12GiB堆完成，4GiB OOM原件保留；唯一raw阈值命中既有MIT StatCard且本轮字节未变。只读T04覆盖精确归因main+77459B/Agent+42511B，启动和其他模块不增；Root按实测最小KiB更新两个预算，最终检查待执行。
- **后票：** A/C/B三份T06只读提案及48/58/29来源回核已保存；API、实施范围及实现仍未解锁。T05 in_progress、GP019/Map20、G02 open。


## LOG-069 — T-05 独立审查拒绝当前候选并形成修复输入

2026-10-25 16:11Z。第3轮30文件185tests与预算检查通过，随后独立Astra/high对固定48交付/43来源完成双轴审查，均request-changes。四项为已产生输入终态被exit越过、RIS选择及同步模式残留、resize失败运行中不可见、reply容量拒绝无Session诊断。Root核读并保全原报告、全部有效与装配失败探针及终审收据；reviewer及产品writer均停写。原第2轮压力主因仍未知，不能由本次Outbox反例推认。原周期attempts3保留，Root将以新确定反例及精确跨owner修复合同开启下一周期，不降低断言或产品范围。T06只读API候选已保存及15源回核，尚未冻结/编译/解锁。


## LOG-070 — T-06 精确接缝与写集就绪前核验

T-05最终代码验收和独立两轴通过后，Root回读三方只读提案及对账，将原T-06宽泛路径替换为A20/B7/C14/Root3共44精确路径。GP020/Map21只落实既定活动证据、原生人工入口和呈现后已读切片，不改变Spec或批准DESIGN，不提前实施T07/T08/T09。真实接口先由A落源，Root回读后C/B消费；物理资源额度、原始答案保全、双来源与未知状态、精确seen和异步清理均保留。此记录是DoR重审，是否启动以随后真实校验和派遣回执为准。


## LOG-071 — T-06 真实显示意图与几何不变量恢复

原三次整合后，Root通过固定源码实际Chrome对照确认旧夹具漏接真实foreground：中间companion自动focus撤销Sidebar导航token，exact attach返回focused:false。另一个受控seen barrier实验确认同owner合法102×38→102×37→102×38也使原resize次数断言失败；新验证直接检查lease/实际请求与拒绝非owner。全部原件与旧失败保留，两个问题不互相冒充因果。

GP021/Map22仅增加foreground-intent实现/DOM测试和Workspace真实foreground组合DOM测试三路径，总47，owner不变。服务先完成显示提交，再由精确Host一次消费原token；所有用户撤销源、精确身份和原split/modal兼容保持。Root沿原授权形成窄Packet，旧周期attempts3保存，新恢复周期从0计且上限仍3；是否实施以正式重审与实际派遣为准，不改变Spec、DESIGN、T08前台安全责任或用户真实E2E分工。

## LOG-072 — T-06恢复周期1正式派遣
- **预检：** GP021/Map22的ticket-control与goal validator实际通过，0 errors/no drift；五条未来票重叠警告由串行策略处理。2096份前输入与两条原回执保全于T-06-recovery1-preflight-root-audit.json。
- **实际动作：** 原Lead通过followup_task派原A实施六路径焦点修复与组合红绿，原B先实施独立浏览器真实capture/几何所有权验证。B的Host接线等待Root核验A实际API，C及其余产品源停写。见T-06-recovery1-dispatch.json。
- **状态：** T06 in_progress，恢复周期1 attempts0；原周期attempts3保留。T07–18依赖锁定，18票Goal保持active，无提交/推送/发布/归档。


## LOG-073 — T06代码验收完成与T07精确接缝重审

T06恢复周期1第二次候选完成526tests/0skip、构建/零警告lint/受影响guards与Chrome11/11；新独立Astra/high对完整42路径双轴pass，真实原反例关闭。Root当前交付校验errors=[]，review阶段实现验证退出0后将原票置done；旧失败、三次原周期及恢复两次计数保留，真实宿主/Provider/五平台E2E仍用户负责。

GP022/Map23只把T07真实接缝和写集落为65精确路径。A/B/C只读回读均无新增产品决定或必需路径；Root补清最后spawn同代检查、capture一次性交接/非撤回onReserved、C新raw codec与B纯帧包装、Rust/Node真实闭环归属。选择有限本机IPC、同helper owner与单源wire，CI前移已有native构建测试，不增加daemon/HTTP/业务store。该记录不冒充DoR校验或派遣成功；T07生产仍待实际预检和消息解锁，后续接口必须按真实源码逐段交接。


## LOG-074 — T07 实际旧夹具影响与关闭终态顺序

A真实定向controller-managed-runtimes用例exit1，假transport缺localControl导致prepare失败与原environment门等待超时；9项是名称筛选未执行，不是通过。GP023/Map24仅增加该1个旧测试路径给原A，成为66精确路径；不绕生产注册、不删除生命周期/前景断言，不宣称尚未运行的controller-native失败。原实施继续，新增路径待实际结构校验与续派；Root整合attempts仍0。

C真实原生反例发现unregistered已被Host收到、core.current尚待2ms轮询才清造成立即重注册误BUSY。Root澄清实际资源/call/socket收束并取得固定ACK permit、成功有序排队后先提交终态；ACK自身permit仍持有至物理write结算，TS仍需实际ACK及本地结算。两个终态和传输额度不混为一谈；详细条件见T-07-close-ack-order-decision.md。


## LOG-075 — 编排接替与模型切换（2026-10-27）

用户原话：“请你根据 plan spec map 继续完成，你作为编排和验收，实现可以派遣subagent sonnet 5.5，真实的端到端的验收 用户自己进行。” Claude Code 会话接替 Lead；实现改用 Sonnet 5.5，独立 review 用新 Opus 5.5 子代理。接续点：T01–T10 done；T13 代码阶段 081 双轴 pass，显式关闭清理增量未测；T11 082 接线中断（commands.ts 7 处类型错误）。T11 OpenCode 安全来源按 GP040 快照副本方案恢复。无提交/推送/发布。

## LOG-076 — 用户提交与 bundle 预算合并（2026-10-29）

工作区出现用户本人于 2026-10-28 22:56 创建的提交 `2073711 feat(agent): 完成终端工作台重构`（非 Lead/子代理执行）；此后改动以该提交为基线继续，Lead 不推送、不改写历史。Lead 合并 T16 round5 与 T17 round2 的懒加载增长，将 outputBytes 设为最小 KiB 上限 6,880,256（归因见 T-16/T-17 budget attribution）。


## LOG-077 — T18 审查后的设计符合性决定（2026-10-29）

T18 独立审查 121 指出两处 DESIGN 偏差。Lead 按 DESIGN 权威收敛实现、不改设计：T12 历史“继续”确认由行内改为确认对话框（AlertDialog，焦点与 Escape 合同保持）；会话状态点在所有分组下提供非颜色区分（每状态独立形状 + 标签/aria-label），满足 AC-061“状态非仅颜色”。同时修正 <600px 全部工作台控件 ≥44×44（不依赖源顺序）、清单 M-12/M-17 与 writer-port 说明；stylesBytes 以最小 KiB 上限调整并归因。另修复 sync 测试因私有存储修复遍历未结算导致的 vitest teardown 未处理错误（测试侧注入惰性存储，生产不变）。

## LOG-078 — 合入 dev（2026-10-29）

把 `origin/NAMEWTA/terminal` 的 `f3b7730` 合入 `dev` 的 `2670608`。只读该分支，不改写、不推送、不删除。ADR-001 至 ADR-009 与 DESIGN 不改。这一条只记录合入时两边意图如何同时留下。

- 终端工作台（Space、PTY、CLI、收件箱、备份、`workbench-v2.json`）来自 terminal。`native/pty-server` 自合并基线后只在 terminal 上有改动，整份进入 dev。
- 独立浏览器留在 dev：`BROWSER_WORKSPACE`、`BROWSER_OPEN`、`composeBrowserWorkspace`、`native/browser-runtime`。terminal 的 `BrowserEngine`、`BROWSER_HOST` 和 `src/modules/browser/services/host.ts` 不再作为生产浏览器。Agent 控制器、工作台装配和终端标签上的打开动作改接到 `browserWorkspace()` / `browserOpener()`。新开的智能体标签只保存 Space 与 Page 引用。旧布局里没有浏览器 Space、但带有地址的网页标签在读盘时保留 `pageId`、`url`、`profileId` 和 `zoom`，所以一次性导入后仍能从所选 Space 的布局里找到。
- `cookie-client.ts` 仍是 `nativeCookieReader` 的薄再导出，并继续登记 `NATIVE_HELPER_SQLITE`。浏览器模块不再借用 PTY helper 读 Cookie。原先挂在 `module.test.ts` 上的「已准入 Cookie 读取熬过 confirmed/legacy 终端清理、且不新开 helper」断言改到 `src/modules/agent/services/terminal/cookie-survives-cleanup.test.ts`，断言不变。
- dev 上已推送的 huhubot 修复（Windows `file:C:/` DSN、预检空普查确认、CLI 通道 EAGAIN）不在冲突文件里，合入后仍在。合入之后的检查里，授权截止仍是 `DeliveryLifetime` 250ms；读栅栏上的 SQL 上下文单独用 2s，避免并行 `go test` 时成员和记忆语句被 250ms 取消。写许可在资格检查之后仍被 250ms 截断。Windows 导出仍先同步文件内容；目录句柄上的 FlushFileBuffers 会拒绝访问，所以目录同步与备份、附件库一样在 Windows 上跳过。Windows 上 `go test` 一次只跑一个包，避免并行把已经接受的命令报成超时；250ms 历史门和 3 秒关闭上限不变。
- 工作台功能列表留 dev：含 task、huhubot、versioning、revision-review，不含旧 `sync` 功能名。`FEATURE_MODULES` 里重复的 `browser` 键删掉。
- 依赖留 dev 的 `@xterm/xterm` `^6.0.0`，以及 notices 需要的 `ajv` / `ajv-formats`。`.gitignore` 同时保留 browser-runtime 构建产物和 terminal 的证据目录忽略。
- 词典、自动化动作的 `spaceId`、导航测试和模块上下文字段取并集。定时任务去重留 dev 的更宽条件（凡 `create-task`，不只日历）。关闭终端视图不确认、不拆除运行时；停止仍走 `end()`。
- `main.js` 与 `styles.css` 按合入后的源码重新生成，不手改冲突块。包体按实测最小 KiB 上调：main.js 8251339 字节，上限 8058 KiB；agent 激活 1384588 字节，上限 1353 KiB。styles.css 1436333 字节，仍低于原 1408 KiB。第三方声明按 pty-server 与 browser-runtime 两份 crate 图重写。
- 真实 Obsidian 点测和当时的检查结果写在 `docs/e2e/README.md` 的「terminal 合入」。Windows ConPTY、macOS 与系统输入法不在这台 Linux x64 上验证。
- 合入后的 Actions 里，控制技能的 `cargo build` 跑在测试临时家目录下，rustup 因此找不到默认工具链。构建子进程改回宿主上已存在的 `RUSTUP_HOME` / `CARGO_HOME`（没有环境变量时用原来家目录里的 `.rustup` 和 `.cargo`），示例断言不变。Windows CLI 夹具清空环境后把 `LOCALAPPDATA` 指到夹具目录，缺失定位器仍必须是 `CONNECTION_UNAVAILABLE`（退出码 4）。GUI 容量最后一格的等待从默认 5 秒改为 20 秒，容量和重新打开的断言不变。审批过期用例的真实寿命从 60ms 改为 8s，以便忙的运行器仍能先看到 `waiting_approval`，随后仍必须等到过期并成功；私有通道第九个在途请求仍必须被拒绝，收割等待从 1s 改为 5s。Windows 上缺失程序在进程创建前读到的 ConPTY 字节先留在内存里，创建失败就丢掉，不作为子进程输出发出；成功后再发出。音乐库夹具删除临时目录时对 ENOTEMPTY 重试，登录断言不变。组成员停掉之后，子槽和 pin 必须变成 0；运行状态先结束时最多再等 5 秒，到点仍在就失败。
- Windows 缺失程序仍必须是 `program-rejected` / `effect: none`，同一个会话号随后仍要能启动并得到真实退出码。`34c1f72` 上约 4 秒后的 `unconfirmed` / `unknown` 来自锚点清理没能确认没有用户进程。文件不存在时系统错误号 2、3、123、161、193、206、267 在进程出现前就记为 `program-rejected` / `none`。`6e18b84` 上缺失程序已经返回这个结果，但 `cmd.exe` 仍停在 `CreateProcess`：辅助程序附着在测试进程的控制台上。启动时 `FreeConsole`，管道句柄保留。辅助程序自己不再加入 kill-on-close 作业，否则伪控制台里的 `cmd.exe` 会停在 `CreateProcess`；子进程仍在进程出现后加入会话作业。`FreeConsole` 之后创建仍然超时，因此 `huhu-pty` 改为 Windows 子系统，测试进程的控制台不会在进入 `main` 之前附上，管道帧不变。上游 portable-pty 的 `PSEUDOCONSOLE_INHERIT_CURSOR` 会让 `CreateProcess` 一直等光标回复；缺失程序在这之前就失败，`cmd.exe` 则不返回。本地这份只去掉该标志。macOS 上私有根按规范化之后的套接字长度选择，`/var` 展开成 `/private/var` 时不再听一个超过 100 字节的路径。macOS 上监听套接字是非阻塞的，接受下来的连接要改回阻塞才能读完定位器帧。载荷仍由 portable-pty 解析完整路径后创建，会话作业在进程出现后加入。同一个会话号仍要得到退出码 7。断言不放宽。macOS 临时目录超过 50 字节时显式定位器被判在私有根外；夹具改短，并按规范化路径承认目录符号链接（`/tmp` 与 `/private/tmp`，`/var` 与 `/private/var`）。`dev` 相对 `main` 超过 3000 个文件，GitHub 的路径过滤只看前 3000 个，终端、Bot、浏览器和批注工作流因此没有在合入后的提交上启动。这些工作流对 `dev` 的推送不再做路径过滤。
- Windows 上 Bot 的 `TestAcceptedDelegationRequirementsReachActualChildEngine/temporary` 在父引擎进入前就失败，随后 `Core.Close` 的 3 秒预算报 `EXECUTOR_STOP_TIMEOUT`。扫描循环在工作者还没准备好时就再次 `Claim`，和准备阶段抢同一条 SQLite 连接。准备占用这把闸，进入引擎前放开，子运行仍能在父引擎阻塞时被领取。1 秒存活等待和 3 秒关闭上限都不改。凭证子进程在 Windows 上脱离父控制台，进程出现后尽量放进带 `KILL_ON_JOB_CLOSE` 的作业；嵌套作业被拒绝时退回 `Process.Kill`，不把这次拒绝当成凭证失败。`go mod download` 在 Node 与 Bot 工作流里最多试 5 次；事件集成测试只在模块代理的网络错误上重试 `go build`，断言不变。
- 本机互斥端口分成三段，避免一种锁被另一种监听误认：Hook 读取 16384–32767，空间写入 32768–49151，浏览器主人 49152–65535。撞上本段里活着的监听仍然拒绝。空间写入的固定样例端口改为 33633。晚到的本机恢复预约会等到 `launch` 真正进入再关闭模块；预约回调仍必须在关闭之后登记，并只在确认退出后释放。浏览器夹具若第一次没拿到主人端口，会换一个目录再要；用到的那一份仍必须可写。
- 生产空间锁仍是按库身份算出的固定端口，撞上活着的监听就拒绝。控制器测试改用操作系统分配的端口，避免并行套件把两个不同的库哈希到同一端口；关停用例的第二主人用同一份分配器，所以占用期间仍是 `OWNER_CONFLICT`，放开之后仍能接手。跨进程空闲用例若第一次就撞上占用中的端口，换一个新目录再证明进程会自己退出，连续四次仍占用才失败。笔记效果子进程仍必须自己退出：`Core.Close` 有 3 秒预算，夹具在标准输入结束后最多再等 10 秒，到点仍要强杀就失败。外层用例时限从 40 秒改为 60 秒，避免父进程先把还在退出的子进程取消掉。
- 合入 portable-pty 源码后，`verify-docs` 把 `native/pty-server/third_party/portable-pty/LICENSE.md` 报成未归类的 Markdown。文档分类把 `native/<包>/third_party/<crate>/LICENSE*.md` 记为 `license`，与 `THIRD-PARTY-NOTICES.md` 同类；同目录其他 Markdown 仍未归类，仍会失败。检查本身不关。
- macOS 两个平台上控制套接字 `listen` 失败的真实原因是 interprocess 的 `mode(0o600)`：它在 `bind` 之前对未绑定的套接字做 `fchmod`，macOS 对此返回 EINVAL，被报成 `Unsupported`，于是每次注册都是 `CONNECTION_UNAVAILABLE`。与路径长度无关。只有遇到 `Unsupported` 时才不带 mode 重建：这时还没有任何名字落盘，先重新确认父目录是本用户的 0700 目录，`bind` 之后仍立刻收窄到 0600。Linux 仍在 `bind` 前设 mode。
- macOS 上 `verify-pty-helper` 的流控检查在输出还没涨到 1 MiB 暂停点时就开始比对，两次读数仍在增长（605184 → 667648）。原因是读线程在非阻塞主端读到 `WouldBlock` 后固定睡 5ms，而 macOS 每次只交出很小一块，洪泛输出只有每秒几十 KiB。读线程改为持有一份主端副本，用 `select` 最多等 5ms 可读（macOS 的 `poll` 不支持终端设备），拿不到描述符时仍是原来的睡眠。副本和读线程一起关闭，暂停点、恢复点和断言都不变。
- Windows 上 `missing_program_has_no_child_evidence_and_does_not_consume_the_session_id` 超时的真实原因不在 `CreateProcess`。CI 跟踪显示缺失程序 11ms 内是 `program-rejected` / `none`，随后同一会话号的 `cmd.exe` 4ms 就创建成功并发出 `spawned`，50ms 内根进程以 7 退出。伪控制台在最后一个客户端退出后仍然开着，输出管道要等 `ClosePseudoConsole` 才到 EOF，所以要等满 3 秒 DRAIN 才发 `exit`，输出还被记成 `truncated`；用例对每条消息只等 2 秒。现在 Windows 上根进程已退出且会话作业为空时立即关闭伪控制台，读线程读完关闭时刷出的最后几十字节后得到 EOF，输出记为 `drained`。作业里还有其他进程时仍按原来的 DRAIN 处理。用例和等待时长不变。
- 上一条的 `select` 在 Linux 上让逐行输出的生产者每行一帧。`session-screen-native` 在并行套件里每次都卡在 `continuous producer finish`：屏幕投影和日志被几千个小补丁撑到 `resource-limit` / `native-output-admission`，单独跑才能过。读线程现在第一块不足 2 KiB 时在同一块里继续收最多 5ms，最多收到 2 KiB，等待仍用 `select`，有数据立即收；第一块已达 2 KiB 就原样发出。上限最初写成 64 KiB，洪泛时帧变成 64 KiB，`host-stream` 的输出帧上限检查只到 65 帧就先撞上 4 MiB 字节上限（期望 256 帧），所以合并只针对小块。逐行输出回到每个窗口一帧，macOS 的小缓冲仍一可读就被取走。收的过程中遇到 EOF 或错误，先发已收的字节再结束。屏幕预算和用例的 30 秒上限都不改。
- 标准输入结束（EOF 或 `shutdown`）后不会再读到确认。已退出会话的最后一段输出若没被确认，会话一直留在表里，辅助程序要等满停止预算才退出；Windows 上 `cmd.exe` 退出前写的 86 字节就让 `missing_program…` 在丢掉标准输入后 8 秒内没退出。`end_all` 每轮都把仍在表里的会话和待启动会话的未确认额度清零，不记成 `truncated`。
- Windows 上 Bot 的 `Core.Close` 超时（`EXECUTOR_STOP_TIMEOUT`、历史写入 `context deadline exceeded`）由 goroutine 快照查明：调用方期限到了的事务被 database/sql 回滚时会丢掉连接。Profile 只有一条连接，丢掉就是关闭最后一个 SQLite 句柄，要做一次完整的 WAL 检查点和 `FlushFileBuffers`，Windows 上要几秒，其他调用都在等这条连接。`WithinTx` 仍用调用方期限等连接和执行每条语句，事务本身不再随它结束，到期时经延迟的 `Rollback` 把连接放回池里。`synchronous=FULL`、单连接和 3 秒关闭上限都不改。
- Linux 上 `TestDefaultCLIEngineUsesPrivateCredentialAndPersistsActualAttempt` 偶发 EOF：服务进入停止后，标准输入服务器在任何一个工作者写完回包时就关连接，还在路上的其他回包（包括 `shutdown` 的回包）丢了。现在只有写失败、本批含 `shutdown`，或停止中最后一个在途工作者写完时才关。
- 为查上面两处 Windows 问题加的临时跟踪（`HUHU_PTY_TRACE`、`HUHU_BOT_CLOSE_DIAG`、失败时的启动诊断脚本和工作流步骤）已整体删除。
- `541c8e5` 上 linux-x64 终端构建的 `changed_capability_entity_is_not_deleted_and_retains_original_sid_until_restored` 失败在用例自己的 `bounded Node discovery`：`cargo test` 同时跑着别的用例时，`node -p process.execPath` 两次都没在 2 秒内返回。失败与辅助程序无关，也不是最新提交引入。终端工作流先装 Node 再跑 `cargo test`，Linux 上用用例本来支持的 `HUHU_TEST_NODE` 指定解释器；2 秒上限和用例断言都不改。
- Linux 上 `workspace-service-launch-failures` 的“缺失 Shell 后改正再启动”和 `missing_program…` 偶发清理确认不了：改正后的 `sh -c 'exit 7'` 退出码已到、输出已排空，但证据一直是 `scope-unverified` / `unknown`，会话不出表，辅助程序要等满 8 秒停止预算才退出，随后被强制结束。立即退出的根进程在 `do_exit` 里先放开控制终端、后变成僵尸；捕获作用域时恰好读到这一刻，它像一个没有终端的活成员，整个会话被记成无法验证。捕获时遇到“活着但没有终端”的根进程，最多再读 100ms，直到它是带终端的活成员或僵尸；其他情况仍记为无法验证，判定条件本身不放宽。
- `acec248` 上 linux-x64 终端构建的 `locator_and_socket_identity_permissions_and_physical_binding_are_checked_without_following_replacements` 偶发 `!path.exists()` 失败（本机 90 次 1 次，改前提交 60 次 0 次，属原有竞态）。用例恢复定位文件时先删符号链接再改名，中间有一瞬间路径不存在；正在关闭的辅助程序此时撤回定位文件，看到路径已不存在就认定撤回完成，随后用例把原文件改名回来。辅助程序的判断是对的。用例改为一次 `rename` 原子替换符号链接，所有断言不变；修改后本机 80 次全过。
- Node 工作流的 Windows 作业从未通过（`main` 上也一样）。`541c8e5` 上它第一次越过 Go 步骤，vitest 报 19 个文件 61 个失败，按根因分别处理：
  - `scripts/isolate-home.ts` 删掉了 `APPDATA` / `LOCALAPPDATA`。Windows 上这两个变量没有从家目录推出的默认值：Bot Profile 根报 `HUHUBOT_PROFILE_ROOT_INVALID`，控制私有根报 `Private endpoint root unavailable`（连带控制技能、`control-native` 的 `prepare-failed`），`go build` 报 `GOCACHE is not defined and %LocalAppData% is not defined`（三个 Bot 集成套件）。现在 Windows 上把它们指到临时家目录里的 `AppData\Roaming` / `AppData\Local`。Go 的构建和模块缓存与 rustup 一样按宿主原位置固定，避免每个套件冷编译。
  - 面板与终端标签视图的 33 个 5 秒超时：夹具把清理证据写死成 `unix-session`，`NativeHost` 按真实 `process.platform` 校验，在 Windows 上丢弃这份证据，于是每次清理都等满 10 秒。夹具改为按平台给 `windows-job`，与 `workspace-service-spaces` 已有写法一致。
  - Runner 的临时目录是 8.3 短名（`RUNNER~1`），`realpath` 后变成长名。自动化 `boundCwd` 把规范化后的请求目录和未规范化的 Space 目录比，Space 里的子目录被判在外；工作区快捷命令同样拿用户写法和规范化的 Space 目录比。两处都先把双方变成真实写法再比（新增 `realPathOr` 与目录端口可选的 `canonicalPath`），越界仍拒绝。用例的期望改为真实路径。在 Linux 上把 `TMPDIR` 指向符号链接即可复现，改前失败、改后通过。
  - `host.integration` 的“清理未确认”：该租约没有输出回调，ConPTY 总会写启动序列，这些字节永远没人确认，`release` 按约定等满 10 秒（`helper-stream` 的 late-ACK 用例证明租约可以不挂回调、稍后自己确认，所以 Host 不能替它确认）。夹具改为像所有生产租约一样确认收到的输出。Linux 上让子进程先写几字节即可复现，改前失败、改后通过。
  - 编辑器事务只在 Linux 上提供（`foreground::supported()`），Windows 辅助程序不声明这项能力。`host-editor` 的五个用例按仓库已有写法只在 Linux 跑；其他平台新增一个用例，证明辅助程序不声明这项能力、编辑器启动被拒且什么都没启动。
  - Windows 的 Actions 有意用 `core.autocrlf=true` 检出。`generate-control-protocol --check` 比对的三个生成文件（Rust 文件把描述符逐字节嵌进辅助程序）和打包的控制技能 Markdown，按 `.gitattributes` 已有的逐文件约定固定为 LF，其余文件仍按 CRLF 检出。
  - `native-reference/occupancy` 在 darwin/linux 分支用 `path.posix` 拼路径，不再随宿主变成反斜杠；`pi-artifact` 生成检查用 `fileURLToPath`，不再把 `/D:/…` 当路径；`automation-hooks` 的期望按宿主路径和 `realpath` 写。`runtime.test` 的执行位断言只在 POSIX 宿主上检查（`exposeCli` 在那里设 0700，Windows 没有这一位）。
  - Hook 读线程每轮对每个作用域逐槽 `access`（每种 8 + 2 次），32 个作用域一轮就是几百次文件系统往返，Windows 上 96 个事件在 1.8 秒内收不完。改为每种一次 `readdir`，槽位范围和顺序不变。
- `a0e72b8` 上 Bot Runner Windows 构建的 `TestActualTSClientConsumesDurableGoEventsSnapshotsAndLateFacts` 报 `run did not reach succeeded,failed,canceled`：不是停止预算。`compact` 这个 Run 连发 270 个文本增量，每个增量是一次独立的 `synchronous=FULL` 提交，各自 `FlushFileBuffers`。本机这个 Run 230ms，其他 Run 约 15ms；Windows Runner 上 270 次刷盘超过用例的 5 秒。引擎流式观察（文本、工具增量）改用 `WithinObservationTx`：同一条连接、同样的检查与顺序，只把这一次提交设为 `synchronous=NORMAL`，结束后恢复 FULL，恢复失败就丢弃这条连接。Profile 是 WAL 模式，之后任何一次 FULL 提交（最迟是 Run 的生命周期或终态事实）都会把之前的帧一起刷盘；断电只可能丢掉一个还没有后续持久事实的 Run 的尾部增量。生命周期、效果、审批和授权事实不走这条路径。新增 `TestObservationTxRelaxesOnlyItsOwnCommit`，证明只有观察提交是 NORMAL，前后（包括失败的观察之后）的普通提交仍是 FULL。5 秒等待和 270 个事件的断言不变。
- `a0e72b8` 上 Node Windows 作业新出现 `create-workspace` 三个用例 `source_changed`：读取身份源文件时第一次 `lstat` 不是 BigInt，NTFS 的 64 位文件号超过 2^53 时 `Number` 丢精度，与句柄上 BigInt 的文件号永远不相等，未改动的文件也被判成已替换。偶发是因为只有文件号足够大时才出现。第一次 `lstat` 起就用 BigInt 比较，判定条件不变。
- 上面几条 Windows 修复给产品代码加了真实路径比较、目录端口 `canonicalPath` 和 BigInt 文件号比较，`main.js` 从 8251392 字节的上限多出 501 字节（8251893）。按 LOG-078 的做法把 `outputBytes` 上调到能容下实测值的最小整 KiB：8059 KiB（8252416 字节），并按源码重新生成 `main.js`。启动求值和各模块激活上限不变。
- 修正 TestCredentialWorkerExitsWithoutParentSupervisor 的时钟基准：6s 回收截止原先在 cmd.Start 之前创建，而 4s 独立上限从 Start 之后计时；Windows 首次启动新构建的 exe 耗时约 2s，回收 ctx 先杀掉了 worker（退出码 1、ctx 已过期）。改为 Start 之后用 time.AfterFunc(6s) 武装回收，与 4s 上限同一起点；4s 上限、≥2.8s、退出码 1、无输出等断言均不变。
- delegation 合同测试 `TestParentResultDeduplicatesSharedHistoryAndTerminatesOversizedResult/false` 在 Windows 上 10 秒仍 `waiting_children`：根任务委派 32 个子任务，共 184 次写提交（每个子任务 Claim/PrepareAndMarkRunning/Finalize/ProducerEnded 各一次，另有 Delegate），每次 `synchronous=FULL` 一次 `FlushFileBuffers`，串行在唯一连接上。按用户拍板的方案 B，Profile 改为 WAL + `synchronous=NORMAL`（huhu-bot ADR-027、LOG-132、spec NFR-005）。模型请求出站、效果 `ClaimDispatch`、凭据 `Reserve`/`BeginDelete`、Profile `BeginCleanup`、Session `Delete` 这六个外部动作前的提交改用新的 `WithinDurableTx`：单次 FULL，WAL 刷盘把此前提交一并落盘。断电最坏丢最近若干次提交，Run 可能退回 queued 自动重跑，但不会遗忘已出站的模型请求或已派发的效果；进程崩溃语义不变。798e1ba 的观察提交路径并入普通提交并删除，`TestObservationTxRelaxesOnlyItsOwnCommit` 按新语义改为 `TestDurableTxRaisesOnlyItsOwnCommit`（普通 NORMAL、屏障 FULL、屏障前后及失败后恢复 NORMAL），新增 `TestExternalActionCommitsAreDurableBarriers` 锁定六个屏障点。委派等待时长和其他断言不变。
- 回退 96f7764（后台云端代理推送，把委派汇合等待从 8 秒放宽到 20 秒，属于减弱测试）：恢复 `wait(t, c, r.RunID, status)` 与 8 秒上限，删除 `waitWithin`。该用例的 Windows 耗时由 ADR-027（WAL + NORMAL 与外部动作屏障）从产品侧解决。
- Ubuntu Node 作业 `host-stream.integration` 偶发“原生辅助程序没有正常停止”（653ca1e 的 pre-reservation 用例、d7538d2 的 blocked-PTY 用例）：d7538d2 日志里第 15 轮被强制结束的会话 18，`release` 等满 8033ms（`STOP_BUDGET` 8 秒）才失败；stdin EOF 时的指标为 `liveSlotsAtSample=1`、`masterHandlesPending=1`、读写线程都已结束。原因在 Unix 作用域观察：会话首进程退出时内核先 `session_clear_tty` 清掉整个会话（包括它自己）的控制终端，之后才变僵尸。观察恰好落在这一刻时，首进程仍算“活着”，于是自己和成员的 tty 0 被记成 `escaped`（不可逆），作用域再也确认不了，只能等停止预算到期，槽位不释放；而 Node 的正常停止只等 4 秒就 SIGTERM。本机实测 SIGKILL 后 300 次中 110 次读到首进程活着且 tty 0。现在首进程只有在活着且仍持有会话 tty 时才算持有终端；同一会话内 tty 0 的进程仍计入作用域、仍会被信号，首进程持有 tty 时成员自行脱离终端仍判为逃逸。新增两条单测，旧逻辑下前一条失败。测试阈值不变。
- `verify-pty-helper.mjs` 超时时附上辅助程序所有子孙进程的状态（Windows：CPU 时间、线程数及各线程状态/等待原因、命令行、创建时间；Unix：`ps` 的状态、wchan、CPU 时间），用来区分会话程序是在跑、被阻塞还是没启动。只在失败时运行，阈值不变。起因是 `653ca1e` 上 Windows 的 flood output 超时：PowerShell 已创建且在会话作业中，ConPTY 初始化字节已送达，但 30 秒无输出，现有日志无法再往下判断。
- Windows Node 作业 `client-runtime.test.ts` 失败：生产代码按平台用 `path.resolve` 求插件目录，Windows 上得到 `D:\vault\.obsidian\plugins\huhu`，而用例硬编码 POSIX 字符串。生产行为正确，用例改为与 `resolve('/vault', '.obsidian/plugins/huhu')` 比较，断言强度不变（仍精确比较启动 cwd）。
- Windows Node 作业 `automation-hooks.test.ts` 的 Pi 注册失败（真实产品缺陷）：`pi-editor-gate` 以 `value.includes(':')` 拒绝 URL/包说明符，但这也拒绝了 Windows 盘符绝对路径，于是 Windows 上 HUHU 自己的扩展路径（如 `D:\isolated\pi\extensions\huhu-status.ts`）永远被判为不受支持，Pi 编辑器无法注册。现仅放行“开头盘符 + 分隔符、其后再无冒号、且本平台 `isAbsolute` 判为绝对”的那一个冒号；`npm:`/`git:`/`https:`/`file:`、盘符相对路径 `D:x`、路径中再出现冒号、以及 POSIX 上的盘符形值依旧拒绝。新增用例分别以 `path.win32`/`path.posix` 直接验证，旧代码下该用例失败。main.js 重新构建（8251960 B，预算内，未改预算）。
- Windows Node 作业 control-skill（3 例）、host-control.integration、control-native 统一表现为真实 CLI 返回 `CONNECTION_UNAVAILABLE`（或 exit 4/5），所有 Windows 日志均如此，从未通过。根因在命名管道封装（真实产品缺陷）：CLI 与 broker 两端都用 PIPE_NOWAIT；管道为空时 ReadFile 返回 `ERROR_NO_DATA`，std 映射为 `BrokenPipe`，interprocess 2.4.6 的 `downgrade_eof` 再把它变成 `Ok(0)`，于是“暂时无数据”被 `ipc::Reader` 当作对端关闭——broker 在客户端认证帧到达前轮询即丢弃连接，客户端在等待较慢回复/超时期间同样提前判 EOF（故 WAIT_TIMEOUT 变成 CONNECTION_UNAVAILABLE）。修复：`windows::Stream::read` 先 `PeekNamedPipe` 取缓冲字节数，已连接且为空返回 `WouldBlock`，对端关闭（BROKEN_PIPE/PIPE_NOT_CONNECTED/NO_DATA）且缓冲读尽后才返回 EOF；`write` 在 NOWAIT 字节管道缓冲满时“成功写入 0 字节”按背压返回 `WouldBlock` 而非 WriteZero。新增 Windows 单测 `nonblocking_pipe_distinguishes_no_data_yet_from_a_closed_peer`（旧实现首个断言即失败），由 Rust Windows 作业的 `cargo test` 执行。
- Bot linux-arm64 作业（8938998）`TestDefaultAnthropicCheckpointUsesRegistryIdentityAfterInterruptedResumeReopen` 失败：重开后恢复状态为 `none`（修订号 8、无恢复树），即首个进程已把运行写成终态。根因（真实产品竞态）：`Core.RequestStop` 先 `models.Stop()`（直接取消在途模型 HTTP）并关闭各准入门，最后才 `executor.Stop()` 取消执行器上下文；其间 Engine.Resume 因 HTTP 被取消而返回错误，worker 看到 `e.ctx.Err()==nil`，便以 `MODEL_EXECUTION_FAILED` Finalize，关停中断被记成终态失败，重启恢复永远看不到它。本地在 `models.Stop()` 后注入 100ms 延迟可稳定复现同一签名（`{… 8 none 0 [] }`）。修复：`RequestStop` 第一步先取消执行器，再关闭其依赖的门；注入延迟下两个协议用例均通过。新增 `TestRequestStopCancelsExecutorBeforeClosingItsDependencies`（AST 校验 8 个门全部在 `executor.Stop` 之后，旧顺序下失败）。`go test ./...` 全部通过。
- 在 891a5f4（另一云端代理提交）之上合并文档门禁修复：保留其“清单写入文件句柄再交给 `git check-ignore`”（Git for Windows 管道 EOF 问题）、`windowsHide` 与 10 s 子进程上限，并抽成共用的批量查询；缺失链接不再逐个同步起 `git check-ignore`（本仓库每次 748 个进程、Windows 37 s），而是按序占位后一次批量判定，仓库外路径直接失败。一次运行 2 个 Git 进程；输出与 836eeeb 及 891a5f4 的脚本逐字相同，缺失/越界/被忽略链接行为不变。
- 撤销 891a5f4 对 `documentation-checker.test.ts` 的放宽（用例超时 90 s、每次子进程 20 s），恢复 vitest 默认 5 s，保留 `windowsHide`。真正的慢由上一条批量查询解决，并按 `vitest.config.ts` 既有约定（真实 Git 仓库与子进程密集用例在 Windows 上争用进程启动）移入串行 `native-integration` 项目；断言不变。
- 删除 198fb00 的临时关停诊断（`internal/bootstrap/diag_stop_tmp.go` 及 `core.go` 中全部 `diagPhase`/`diagTimeout` 调用）；`core.go` 与诊断前相比只剩 e3af8f9 的关停顺序修复。`go test ./...` 全部通过。
- 恢复 ADR-027 的正常关闭持久性：836eeeb（另一云端代理提交）关闭了 checkpoint-on-close，使正常关闭不再刷盘最后一个屏障之后的 NORMAL 提交。`Store.Close` 现在先对 `-wal` 文件 fsync 再关闭句柄（不做检查点、不复制数据库页；提交在 WAL 超过 256 KiB 时 TRUNCATE，故通常有界），下次打开由 WAL 重放。新增 `TestCloseFlushesTheWALWithoutCheckpointing`（去掉修复即失败）。
- 补记 836eeeb（另一云端代理提交）的 Profile 检查点语义与 9d18720 的关闭刷盘：huhu-bot-architecture 的 ADR-027、spec NFR-005/DEC-001、LOG-133。
- Profile WAL 检查点节奏：836eeeb（另一云端代理提交）的 256 KiB 阈值使检查点频繁约 16 倍，且读者钉住 WAL 时每次提交都重试并等待 busy_timeout，导致 Windows 上委派合同超出 90 秒准备预算。阈值改为 SQLite 默认的 1000 页（4 MiB），阻挡后等 WAL 再增长一个阈值才重试；新增 `TestWALRestartIsPacedBySizeAndBackedOffByAPinnedReader`；ADR-027、NFR-005、LOG-133 同步。
- `TestActualTSGoProductionNoteHost` 在 891a5f4 的 Windows Node 轮次中一次报 `Error: EOF`（生产子进程在取消场景中途退出），本机含 CPU 压力下 70 次未复现。仅补失败证据：TS 侧 EOF 错误带子进程退出码、信号与 stderr 开头；子进程入口区分 `server.Run` 错误（4）与 `Close` 错误（5），1 仍只表示 stdio Windows 输出的停机兜底。断言不变。
- 浏览器存储所有权端口：`DesktopBrowserPersistence` 把根目录哈希到 49152–65535 中的一个固定端口。Windows 保留的动态端口段 listen 报 `EACCES`，初始化直接抛错（16eb173 的 Windows Node 轮次 `listen EACCES 127.0.0.1:49833`）；同一路径永远落在同一端口，用户的浏览器存储就一直不可用。现改为 `EACCES` 时按同一 SHA-256 摘要的下一个候选端口重试（最多 16 个），第 0 个候选与旧端口相同；所有实例跳过相同的保留端口，仍在同一端口上互斥，`EADDRINUSE` 仍表示已有其它实例拥有。新增单测（去掉修复即失败），集成夹具的端口探测与生产一致。
- 钩子池排空吞吐（Windows「32 scopes」用例在 891a5f4、2ec5cf2、9d18720 的 Windows Node 轮次中仍超时）：每轮全局最多 16 个事件、每个 scope 最多 1 个，但只有看到同一 scope 还有积压时才立即开始下一轮，否则空闲 300 ms。发布进程仍在写入时，每个 scope 通常只挂着一个事件，于是每批之后都空闲等待。现改为只要本轮消费过事件就立即开始下一轮，只在空轮后空闲；原积压判定被这一条件涵盖，已删除。用例 1.8 s 上限不变，仅在超时时报告收到数与距最后一个发布者的耗时。
- 撤回 891a5f4 对 agent 激活预算的提高（1385472→1386496）：那次 +304 B 全部来自它自己的 hook-spool.ts 改动；cac7803 删除冗余积压判定后 agent 实测 1385359 B，低于原上限，`bundle-budget.json` 恢复为 836eeeb 的内容。
- `TestRealRunnerShutdownWithParentPipeOpenAndEOFReopen` 在 fb430d1 的 Bot Windows 轮次中首次报 `EOF`（Runner 在 hello 前结束）。仅补失败证据：失败时记录是第几次启动、退出错误、耗时与 stderr。断言与 5 s 截止不变。
- 钩子池读取半写引用：发布者用 `wx` 先创建 `ref.json` 再写入内容，读者在两步之间打开会读到空或半截 JSON，整个 scope 被报告 `hookSpoolReadFailed`（0d11e38 的 Windows 轮次）并推迟消费（e719602：1.8 s 后只收到 91/96）。现在 scope 仍活跃时，无法解析的引用视为“尚未写完”，下一轮重试；scope 关闭时照旧报告，永久损坏仍会暴露。`claim.json` 在 `ref.json` 之前已写完，无需同样处理。新增注入“首次读到空 ref.json”的单测（去掉修复即报 `hookSpoolReadFailed`）。agent 激活实测 1385395 B，仍低于原上限。
- macos-15-intel 上 `TestSavedResumeInboxReopensWithoutLaterMessage` 的 `CHECKPOINT_MISSING`（a5957fa 轮次）不是数据丢失：恢复树检查所有非终态成员，包括根 Run。根引擎先发出委派，然后才发布自己的检查点并挂起；测试一收到委派就继续，若根的挂起尚未提交便关停，根会以无续点的 run 阶段被中断，整棵树按设计被阻止。本机让根在委派后保持运行即可得到逐字段相同的状态（blocked、generation 1、revision 8、两个受影响 Run、CHECKPOINT_MISSING）。用例在关停前等待根到达 waiting_children，断言不变。836eeeb 的关闭不做检查点与 9d18720 的 WAL fsync 与此无关：同进程重开读的是页缓存中的 WAL，darwin 与 linux 同用 OFD 锁。
- Windows events 合同的 `EXECUTOR_STOP_TIMEOUT` 与 30 s 内 Run 未终止：失败日志表明 `GetRun` 本身等满 30 s，即唯一的 Profile 连接被占用。ncruces Windows VFS 中 shm 锁均为非阻塞，WAL 路径不会无限等待，本机无法复现。仅补失败证据：这两处失败时记录本模块的 goroutine 栈（有上限），断言与时限不变。
- 产品缺陷：持久化时刻用 `time.RFC3339Nano` 写入，它会去掉小数末尾的 0，文本顺序于是不等于时间顺序（“…24.5Z”排在“…24.55Z”之后）；SQL 却按文本排序（如 `Claim` 的 `ORDER BY created_at,run_id`）。macOS 时钟为微秒精度，末尾为 0 很常见，较晚受理的 Run 可能被先领取（3d9cc5c 的 macOS arm64 轮次 `TestClaimInboxRefusalFinalizationIsAtomicAndUnknownErrorsRollback/unknown-denial`）。新增 `api.TimestampLayout`（固定 9 位小数），全部 44 处 `Format(time.RFC3339Nano)` 改用它；解析仍用 RFC3339Nano，两种形式都可读。新增排序回归测试（换回旧格式即失败）。已有数据中的旧格式值未迁移，只有升级前后同一秒内的值在过渡期可能排序不准。
- 产品缺陷（ubuntu Node 24，206d89c 轮次 host-stream "explicit abandoned display…" 读取 metrics.json 得 `Unexpected end of JSON input`）：pty-server 的 `metrics_file` 用 `create_new` 先建文件、再在线程里写入，主线程只等 50 ms 就继续退出；负载高时进程在写完之前 `exit`，留下空文件。修复：先写同目录 `.<pid>.partial` 再 rename 到位（读者只会看到"不存在"或"完整"），并把等待并入既有的 5 s 最终刷新期限（共用同一截止时刻，不增加最坏关闭时间）；已存在的文件仍不覆盖。新增 Rust 单测 `metrics_are_renamed_into_place_complete_and_reported_when_written`。
- 910a26f 的新单测在 macOS 失败：macOS 临时目录位于 `/var -> /private/var` 符号链接之下，产品代码按设计拒绝含符号链接祖先的路径，因此不写文件。测试改为按平台事实断言两种契约：存在符号链接祖先时什么都不写且接收端照常完成；否则原子写入且不覆盖已有文件（本地用符号链接 TMPDIR 模拟两条路径均通过）。
- 产品缺陷（windows Node 24，2864d3f 轮次 hook-spool 32 scopes：最后一个发布者结束 1.8 s 后仍只收到 94/96，用例耗时 8192 ms）：读者每轮严格串行地访问 32 个 scope，每个 scope 约 8 次文件系统往返（含每轮探测 `fault.json` 的 open），每个事件消费再约 38 次，且每轮最多 16 个小事件；墙钟时间 = 往返次数 × 单次延迟。本地用给每次 fs 调用加固定延迟的代理复现：≈1 ms/次时 96 个事件的尾部 6137 ms，2 ms 时 11137 ms，3 ms 时 15 s 仍只到 89。修复：一轮内最多 4 个 scope 并发（`readerConcurrency`，与 libuv 默认线程池一致；每个 scope 内仍顺序，保持其事件顺序）；批次预算在 await 前同步预留、未消费则归还，16/1 的上限不变；`fault.json` 仅在 scope 目录列表中出现时读取；预算用尽或已取过的 kind 不再列目录。同一代理下尾部降为 1199 / 2391 / 3427 ms（全部 96）。测试阈值未改。为守住 agent 激活体积预算（未放宽），同文件内把重复的 ENOENT 忽略分支收为 `ignoreMissing`/`list`，语义不变：agent 1385428 ≤ 1385472。
- ubuntu Node 22（3449dec 轮次）`workspace-service-stop-native` 首次出现“unrelated Session still accepts input/output”超时（已保存的 225 份日志中仅此一次；本地空闲与 CPU 饱和下各 6 次均未复现）。`text()` 取末 200 行、夹具每秒约 20 行，窗口约 10 s，排除滚出可见范围；尚无法区分“输入丢失”与“输出停滞”。只加失败时证据（running、发送前后 READY 行数、末尾 400 字符），超时不变。
- approval `waitApproval` 超时诊断此前用占位 id `not-yet-known` 调 GetRun，必然打印空 Run，毫无证据（8d73b6f 轮 Windows `TestStoppingHostProducerPersistsUnknownBeforeProfileRelease` 即如此）。改为经独立只读句柄列出各 Run 的 status 与最后事件，并附项目 goroutine 栈（有界）；3 s 上限不变。仅测试诊断。
- e5d961f 后 Windows 仍有一次 95/96（此前 85–94）：读者一轮已约百毫秒级，剩 1 个事件跨约十轮未被消费，更像单个事件卡住而非吞吐。失败信息原先不含已收集的 errors；现在失败时附缺失 id、errors、各 scope 槽位与全局槽位的剩余文件（有界）。1.8 s 上限不变，仅测试诊断。
