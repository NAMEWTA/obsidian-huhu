---
schema_version: 8
artifact: goal-plan
change: 2026-10-25-agent-workbench-refactor
status: draft
modes: ["migration", "high-assurance", "reference-conformance"]
orchestration: lead-directed
lead: codex:/root
integration_attempt_limit: 3
ticket_execution: serial
ready_for_execution: false
---

# Goal Plan：HUHU 终端 Agent 工作台

- **本轮模式：** plan；规划已形成，产品实施尚未开始。`draft / ready_for_execution: false` 表示尚未获得 run 授权，不表示遗漏规划内容。
- **计划修订：** GP-001；来源 Tickets Map `plan_revision: 2`。实际派单同时冻结 Goal/Map/Ticket 的内容摘要，不能只比较修订标签。
- **用户总控入口：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>；**行为：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path>；**视觉：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path>。
- **局部交付：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/</Path>；**实施证据目录：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/</Path>。
- **本轮规划证据：** <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/goal-plan-review.md</Path>；该记录不作为任何产品 Gate 的关闭证据。

## 1. Outcome and Authority

### Outcome

在现有 Obsidian HUHU 工作台中交付以 Herdr 为主要参照的终端 Agent 能力：Space 组织、真实 Shell/Agent、独立后台运行、CLI 对同 Vault 明确目标的输入/等待/读屏与面板控制、被动邮箱、原生人工审批、本 Vault 历史与精确继续、独立网页承载和可靠数据恢复。界面落实用户采用的 A 方案，保留现有六种 CLI 入口、账号、技能与自动化的原生结果合同。首个正式版覆盖五种既定 OS/架构组合。

本轮交付正式 Goal Plan 以及必要导航对齐。用户明确要求在计划内允许 Agent Team，并给出实现与 review 的模型分工；该安排保存在 §4，后续获得实现授权后直接沿用，不逐票重复询问已确定的分工。

### Success and False Completion

成功是 64 项 AC、7 项 NFR、四个设计任务面、真实 Provider/宿主和五种平台证据共同成立；原有消费者与数据恢复不退化。所有未取消 Ticket 通过原 I 完成合同、整体独立双轴审查及 G-06 后，才可由 Lead 更新 README Outcome。

18 张票写完、Agent 报告完成、计划/代码静态校验通过、原型可点击、CI 编译成功、wait 返回 idle，均不能独立证明上述产品目标已完成。计划里的 `ready` 也不能替代实际依赖、权限、owner 和 Gate 检查。

### Non-goals

不建设完整 Run/Outbox 调度平台、独立 Chat、额外业务 DB、远程 daemon 或跨 Vault 控制；不迁走登录凭证，不自动替用户批准原生权限。无需为 Agent Team 更换项目栈、创建额外 change/worktree 或固定一套永久团队。此计划不附带提交、推送、发布或生产数据迁移动作。

### Authoritative Inputs

| 来源 | 唯一职责 | 使用与冲突处理 |
|---|---|---|
| 用户最近请求，记录于 LOG-025 | Goal 规划、允许 Agent Team、实现/review 模型默认组合 | 明确选择优先；不由工件文字推导新增执行授权 |
| <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path> | 外部行为、范围、64 AC、NFR 与验证接缝 | 工程路线不能覆盖用户行为；变化先回 S |
| <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path> / <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path> | 已采纳架构决定与名词 | 已闭合 Q1–Q10 不重新猜；架构变化回原 G owner |
| <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path> / <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path> | 获批 A、revision 1 / DESIGN-0001 与 UI-001 | 精确引用维持；设计变化回 P-prototype，不用改截图掩盖偏差 |
| <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path> / 原 Ticket frontmatter | 覆盖、单票状态、依赖、写集与 Skill 调用 | Goal 只安排 Gate/Wave 与资源顺序，不镜像单票进度 |
| <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> | 派生的身份、CLI v1、回执及数据演进 | 同一 schema/帮助/Skill 合同；影响 Spec 时回 S |
| <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path> | 固定开源机制、许可、已知问题与采用理由 | 参考用于研究/适配；不要求复制 Herdr 所有行为 |
| <Path>AGENTS.md</Path> / 真实 dev、ui Skill / 当前代码与 CI | 项目约束及可运行事实 | 按实际输入核验；未来新增陌生功能先研究再写 |

规划观察基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`，当前分支 main，已有 AGENTS.md/.gitignore 修改及 SpecDev 未跟踪文档。详见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/goal-plan-baseline.json</Path>；这是规划时的只读观察，实际实施上下文仍在首次 I 时由 README 唯一记录。

## 2. Execution Graph

### DAG and Critical Path

```text
T-01 → T-02 → T-03 → T-04 → T-05 → T-06 → T-07 → T-08 → T-09
                                                           ├→ T-10 ───────┐
                                                           ├→ T-11 → T-12 ├→ T-14 → T-15 → T-16 → T-17 → T-18
                                                           └→ T-13 ───────┘
```

真实依赖以原票 `blocked_by` 为准。无工期估算时不声称已经算出时长关键路径；按依赖层数，T-09 后的 T-11→T-12 是最长分支，T-14 汇合 T-10/T-12/T-13。所有票的公共入口与生成物有语义资源冲突，本 Goal 选择 `serial`：一票完成实现、独立审查和适用验证后再开启下一票。

W-03 的默认串行次序为 T-10 → T-11 → T-12 → T-13 → T-14。这是资源排序，不往 Ticket 里伪造互相阻塞的边；某分支发生局部阻塞时，可在确认其 writer 停止并释放资源后，选择其他真实依赖满足的分支。其余串行路径的前置失败自然阻塞后继。

### Waves and Ownership

| Wave | Ticket 与默认集成顺序 | 开始条件与交付观察点 | 项目写路径范围 | Shared owner | 出口 |
|---|---|---|---|---|---|
| W-01 运行基础 | T-01、02、03、04 | G-00；共享原生租约 → 空 Space/目录授权 → 真实前后台运行 → stop/归档/重启 | host/native、Agent 生命周期/记录/启动及必要 UI；逐路径从原票读取 | 当前票为唯一写入票；公共路径由 Lead 执行 | G-01 |
| W-02 协作主链 | T-05、06、07、08、09 | G-01；权威屏幕/背压 → 状态与原生审批 → 本机 CLI → prompt/wait/read → A 面板控制 | terminal、hooks/status、CLI/control、workspace/UI | 同上；schema、controller、i18n、产物不并发写 | G-02 |
| W-03 兼容工作台 | T-10、11、12、13、14 | G-02；邮箱、历史与精确继续、独立网页齐备后收缩旧消费者接线 | inbox、history、browser/shared view、既有 API 消费者 | 同上；按明确顺序交接共享入口 | G-03 |
| W-04 数据恢复 | T-15、16 | G-03；停止旧 writer、转换/核对/切换，导出导入往返 | migration、backup、settings、数据说明 | 同上；每一恢复事务单 writer | G-04 |
| W-05 正式版验收 | T-17、18 | G-04；匹配 helper/CLI/Skill 资产后运行五平台与整体审查 | native/CLI 资产、CI/验收脚本、来源与用户文档 | 同上；构建/全局测试由 Lead 串行协调 | T-17 后 G-05；T-18 后 G-06 |

Wave 是有出口的里程碑，不表示里面所有票同时启动，也不要求未来票现在已有生产 Evidence。当前已明确的票级合同保持原状；进入实际票前按上游真实产物重审 DoR。若发现上游接口/路径尚不能确定的真实缺口，回原 Ticket 写明生产者、所需 Evidence 与重审条件，并标 draft/ready false；仅等待已定义依赖完成时使用原 `blocked_by`，不人为删合同。

### Ticket Quick Reference

下表只导航；Evidence 在实施产生后才存在。本轮不创建空完成记录、不预分派实现 owner。

| ID | Ticket | Evidence |
|---|---|---|
| T-01 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/01-native-owner.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01.md</Path> |
| T-02 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/02-space-identities.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02.md</Path> |
| T-03 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/03-managed-runtimes.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03.md</Path> |
| T-04 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04.md</Path> |
| T-05 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/05-screen-stream.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-05.md</Path> |
| T-06 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/06-activity-and-approval.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-06.md</Path> |
| T-07 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/07-local-cli.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07.md</Path> |
| T-08 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/08-terminal-coordination.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08.md</Path> |
| T-09 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/09-workbench-panels.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-09.md</Path> |
| T-10 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/10-passive-inbox.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-10.md</Path> |
| T-11 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/11-vault-history.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-11.md</Path> |
| T-12 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/12-native-resume.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-12.md</Path> |
| T-13 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/13-independent-browser.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-13.md</Path> |
| T-14 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/14-consumer-compatibility.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-14.md</Path> |
| T-15 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/15-data-migration.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-15.md</Path> |
| T-16 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/16-backup-restore.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-16.md</Path> |
| T-17 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/17-cli-delivery.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-17.md</Path> |
| T-18 | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/18-platform-acceptance.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-18.md</Path> |

## 3. Gates and Completion Evidence

### Overall Definition of Done

1. 18 个局部交付按原合同真实完成；无需改动的票只能依据事实取消并重新核对覆盖，不能做空提交或写一份 Evidence 冒充实现。
2. Spec 的 64 项 AC、全部 NFR 与 DESIGN 页面/状态有对应证据；当前没有获批延期项。所有 required E2E 已运行且通过，环境缺失不能改成 passed 或降低五平台范围。
3. 全部新增和被改变的公开接口、CLI/schema/帮助/Skill、共享 owner、旧调用点、迁移/备份/回滚一致。源码、main.js/styles.css、必要 docs/i18n/来源声明与最终交付匹配。
4. 每票独立 standards/specification 双轴通过；最终再覆盖从最初实施基线至最终候选的全部实际改动，报告位于 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/final-review.md</Path>，不得只审最后一票。审核发现修复后重冻输入并复核受影响轴。
5. 五种组合分别有真实宿主/终端主链证据：Windows x64、macOS x64、macOS arm64、Linux x64、Linux arm64；整体至少覆盖 Codex 与 Claude Code 两种实际 CLI，记录版本与能力，现有其他四种入口按合同回归。跨平台构建不等同于此项。
6. Lead 核对最终工作副本、产物、证据和所有 writer，关闭适用 Gate 后更新 README Outcome。发布支持承诺以证据为准；实际提交、远程交付和发版仅在用户另有明确要求时属于完成条件。

### Gates

每个 Gate 由 Lead 核验，模型/worker 自报不能关门。未来关闭时在本 Goal 的进度节保存关闭结论与原 Evidence 引用；详细命令、输入和原输出仍由对应 Evidence 拥有。

| Gate | 开启条件 | 不可替代的关闭证据 | 阻塞范围 | Owner / 授权 | 失败恢复 |
|---|---|---|---|---|---|
| G-00 执行入口 | 用户后续明确要求 run；规划来源可回读 | 实现授权、真实 workspace/基线、Ticket/Skill 摘要、当前票 owner、无冲突 writer、当前票所需工具/测试环境；一次性记录 README Execution Context | 未授权时全实现关闭；未来平台局部缺项不阻塞无依赖的前序工作 | codex:/root；授权来自用户请求 | 只做已授权规划/诊断；保存缺项，不启动 implementation 或伪造执行记录 |
| G-01 运行隔离 | W-01 各票通过且输入未漂移 | T-01–04 原 Evidence：真实 PTY 后台/重附加、只关显示、显式 stop/归档/退出、迟到 spawn/Hook、共享 Cookie/helper owner；真实宿主证明 Agent 停用与重启规则 | W-02 及依赖闭包 | Lead；沿已授权隔离验证范围 | 保留旧适配；查询残留与 owner，先停止失败分支，不启动第二 writer 或自动重放 |
| G-02 协作闭环 | G-01，W-02 通过 | T-05–09：屏幕水位/背压/设备回复一次，真实 A→B prompt/wait/read 与同 Vault 跨 Space，blocked 原生人工批准/拒绝，错误/效果未知，GUI/CLI 布局一致；命令和新能力真实可运行 | W-03 及后继 | Lead；原生审批由用户在 TUI 操作 | 状态不可靠降 unknown；超时先查，不重发；回退到可观察运行与稳定协议 |
| G-03 消费者与来源 | G-02；邮箱、精确继续、独立网页及兼容迁移完成 | T-10–14：消息不启动模型；外库正文未摄入；精确 native reference 与占用；Agent-off/无 Space 网页与 Cookie 可用；原生完整答案、existing 只粘贴、移动端轻量入口；旧路由调用点归零 | T-15/16 与依赖后继 | Lead | 任一消费者退化先保留兼容层；来源异常隔离，不删自有标注或用屏幕文本替代结果 |
| G-04 数据往返与恢复 | G-03；最终数据 owner 已固定 | T-15/16：旧样本摘要/计数/引用 dry-run、中断/损坏/重入、单 writer 切换、旧版回退保全新版、导入预检与往返；缺项清单、库外目录重新授权；真实宿主隔离副本演练 | T-17/18 与正式完成 | Lead；用户真实 Vault 的破坏性操作不在计划授权中 | 停写并保留新旧恢复副本，按原迁移记录恢复；不覆盖来源不明数据，不抢锁 |
| G-05 发行输入一致 | G-04；T-17 通过 | helper/CLI 五平台匹配资产与摘要、协议 major 校验、真实 help/schema/Skill 示例、t() en/zh、逐文件来源许可及 notices；资产仅准备，未推送或发布 | T-18 正式候选验收 | Lead | 撤下错误候选，修正构建/兼容合同后重新冻结；不运行未知摘要资产 |
| G-06 最终产品验收 | G-05；全部票 Evidence 可回读 | T-18 的五平台实机/宿主主链、A 四页全部适用状态、端到端负载与恢复；64 AC 汇总及最终独立双轴报告；每项记录候选/版本/环境/命令/实际结果 | Goal 完成与正式支持声明 | Lead；独立 reviewer 返回审查，Lead 关门 | 缺哪种平台/合同就保留哪项待验收；修复回原票，重验影响闭包，未失效证据不重复 |

### Contract and Reference Coverage

64 个 AC 的唯一主要责任仍在 Map §4，不复制第二份逐 AC 进度。下表只规定 Gate 如何组合已有证据。

| 合同或参考要求 | 覆盖 Ticket | 验证接缝 | Evidence / 关闭位置 |
|---|---|---|---|
| 身份、资源、运行与生命周期 | T-01–04 | V-01/03/04/05/06/07/08，相关平台风险由 V-10 补齐 | 原票 Evidence；G-01，最终 G-06 |
| 终端输入/观察/审批/控制 | T-05–09 | V-01/02/03/06/08/09/10 | 原票 Evidence；G-02 |
| 通知、历史/精确继续、网页与消费者 | T-10–14 | V-01–08 的适用接缝，继续占用补 V-10 | 原票 Evidence；G-03 |
| 迁移、备份、数据保全 | T-15–16 | V-04/05/07/08 | 原票 Evidence；G-04 |
| 资产、CLI 文档/Skill、许可与五平台 | T-17–18 | V-02/03/06/08/09/10/11 | 原票与最终审查；G-05/G-06 |
| 获批 A / DESIGN-0001 | 14 张 UI 票的原 design_ref；T-18 汇总 | V-08 与原 V-12 设计意图；实机补 V-10 | digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`；逐票 Design Conformance，G-06 |
| 研究先行与 R-01–05 / K-01–07 | 每张命中陌生能力的票；T-17 汇总来源 | 官方源码/许可/manifest/Issue 与本项目复现；V-11 | reference-notes + 原票采用/不采用理由；不把公开 Issue 当已确认本项目缺陷 |

## 4. Execution and Integration Protocol

**执行入口：** 后续获实现授权后，Lead 与实现者调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，按 Map → 命中的 dev/ui 等项目 Skill → 当前 Ticket 回读并实际执行绑定。I 负责单票实现、独立双轴审查和验证；本 Goal 拥有跨票 Gate。

### Lead Orchestration

**允许调用 Agent Team / 原生 subagent。** 该许可直接来自用户本次安排，并应用于后续已授权的实现和 review。默认在当前 Codex 宿主中编排；一张票可以由多位实现者合作，只需先拆清互不冲突的路径和语义资源，不要求为协作另开工作区。`serial` 限制跨票活动顺序，同票协作仍然可用。

| 用途 | 用户指定的默认模型 | reasoning effort | 工作要求 |
|---|---|---|---|
| 实现、同范围修复与定向测试 | **`gpt-6.1-sol`**（Codex GPT-6.1-sol） | **`xhigh`**（用户所述 X high） | 执行 I 和真实项目 Skill；只写 Packet 分配路径，返回候选/检查结果 |
| 独立 review | **`gpt-6-astra`**（用户所述 6 Astra） | **`high`** | 未参与本次被审范围的实现/修复；只读固定输入，分别返回 standards 与 specification 两轴结论 |
| Lead、公共入口整合与 Gate 验收 | 原 Lead `codex:/root`，沿当前宿主 | 按实际会话记录 | 保持唯一状态/Evidence owner，核验工具返回和最终工作副本；若参与实现也列为 implementer |

模型分工来自本次明确要求，覆盖流程中“未指定时执行期选择”的默认值；不是给每票预分配 Agent 身份，也不写成项目全局配置。本轮工具目录确实列出这两个模型及 effort，但 **尚未调用**。运行时再次检查实际可用性，并记录真正使用的 model/effort/工具句柄；不可用时保留受影响任务待处理并报告实际限制，不能用其他结果冒称已由指定模型完成。

宿主原生派遣若使用模型覆盖，按当前工具合同使用 `fork_turns: "none"`，由 Task Brief 提供完整且精简的输入；模型参数可分别采用 `{"model":"gpt-6.1-sol","reasoning_effort":"xhigh","fork_turns":"none"}` 与 `{"model":"gpt-6-astra","reasoning_effort":"high","fork_turns":"none"}`。这些是本轮已核验接口的计划参数，不是执行回执；具体任务名、agent ID、会话句柄只在真实派遣返回后记录。

| 编排项 | 决定与依据 |
|---|---|
| Ticket scheduling | `serial`；沿 Map 的共享公共入口/生成物约束，一票实现、审查、验证完成后再开下一票；review 阶段仍属于当前活动票 |
| Implementation agents | 用户没有指定固定实现者人数，不设置 `concurrent_implementation_limit`；同票非冲突写集按实际宿主能力分配，Lead 实际参与写入也计入 |
| 当前宿主限制 | 本轮提供最多 4 个同时活动槽位，包含 Lead；这只是当次工具能力，恢复时重查，不当作项目永久人数规则或 review 专属上限 |
| Read-only agents | review/research/test-observation 不额外占票据槽；仍服从宿主槽位、固定审查输入及真实工具能力，不要求填满 Agent 数 |
| Integration attempts | 有效上限 3，来源为 execution-policy 的缺省；若后续实际 config 有更严格值取其值。相同 blocker 无新证据就停止重复，不等到次数耗尽才停 |
| Shared owner | 沿原 Ticket 的 `lead:agent-workbench-integration`，实际角色由唯一 Lead 承担；当前票作为本次独占修改窗口的 owner Ticket，其他票只读 |
| Dispatch | 执行期动态产生；计划不创建 worker 注册表、不预填真实身份、不为 plan 启动团队 |

共享文件和根产物始终只有一个实际 writer。其他实现者可对非共享路径直接写入；需要修改共享入口时把候选交给 Lead，由 Lead 在当前票写集内整合并计入实现者。不能把“Lead 最后解决冲突”当作多人同时写同一文件的许可。现有角色/票据边界不足时，先由原 owner 修订路径合同，不能仅因 Agent Team 可用就扩大写集。

### Dispatch Packet and Review

每次真实派遣按 <Path>{roots.references}/coordination/task-brief.md</Path> 提供：目标 Ticket/本次子任务；GP-001 与当前 Map revision/摘要；Spec、原设计和命中 Skill；已通过的依赖 Evidence；实际 change-workspace；冻结输入/上游 checkpoint；允许路径、共享 owner、禁写路径；适用检查、停止条件和返回位置。陌生能力研究要求和对应开源参考必须随输入提供。任务者不能靠猜测 Lead 的对话补合同，也不递归开启另一套 Goal。

同票团队先明确每个子任务可观察交付和不重叠的写集，完成候选后由 Lead 整合。review 前停止当前被审范围的全部 writer，冻结实际 commit 或完整未提交快照；未经授权不为审查而创建提交。默认由一位新的 Astra reviewer 按 <Path>{roots.workflows}/specdev/common/skills/code-review/SKILL.md</Path> 完成两个轴，需要时可由不同独立 reviewer 分别审查。

reviewer 不参与修复；发现交回实现者处理，随后重冻并复审受影响范围。换个角色名、重新开同一实现者会话或更换模型都不能抹掉实施者身份。最终整体 reviewer 必须未参与整个被审范围实现，所有实现/修复者包含 Lead 均如实列出。没有独立 reviewer 时只阻塞审查完成，不能以 Lead 自审代替。

### Change Workspace and Verification

工作区选择为 **current**，复用本仓库现有 checkout。首次 I 在 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/README.md</Path> 的 `Execution Context` 保存一次实际 workspace/base/head/owner/授权事实；本轮 plan 不创建该运行记录，也不新建分支/worktree。所有票、协作者、review 和修复使用同一工作区；五平台测试使用同一冻结交付输入的可追溯构建/一次性测试环境，不成为额外代码写入工作区。

定向测试按原 dev testing 选择表；共享构建、main.js/styles.css、全局检查与 Git index 操作串行协调。未来存在 Git 授权才执行相应操作，脏工作区本身不是清空用户文件的理由。保留 AGENTS.md/.gitignore 与范围外 change，不将其混入本次交付。

### Authorization Matrix

| 动作 | 当前状态 | 目标与条件 |
|---|---|---|
| 形成 Goal Plan、同步本 change 导航与规划检查 | 已授权 | 当前用户请求，纯文档范围 |
| 将 Agent Team 和上述模型分工写入计划 | 已授权 | 本 change 后续实现/review 沿用；plan 阶段不实际派遣 |
| Change workspace implementation / 修复 | 尚未授权启动 | 后续用户明确 run；无需重新确认已选 A、产品范围或模型默认组合 |
| Change workspace verification | 本轮文档检查已授权；产品验收随 run | 实际 run 核对当前票所需环境/账号/一次性库；不隐式修改真实用户资料 |
| Change worktree creation | 未请求 | current 已足够，不从协作推导额外工作区 |
| Implementation commit / merge / parent update | 未请求 | 不作为本地实现完成的默认门；如请求则核对精确目标 |
| Push / PR / remote merge / release | 未授权 | 本计划只准备可验证产物，不执行远程交付 |
| Branch/worktree cleanup | 未授权 | 不清理其他会话或用户已有内容 |
| Deploy / 用户真实库迁移 / 生产副作用 | 未授权 | 产品迁移能力在隔离副本验证；真实目标动作另按具体用户授权执行 |

### Evidence Return

实现者返回实际身份、使用模型/effort、工作区/快照、变动路径、命令/退出/原输出、未验证项、blocker 和 writer 是否已停止。reviewer 返回固定输入摘要、独立身份与两轴原始结论。Lead 回读工具返回和真实工作副本后，写原 Ticket Evidence 的 Skill Execution Records、Workspace Execution Record、Independent Review 与 Design Conformance（适用时）；不把完成自报直接改为 done。

最终整体审查保存在 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/final-review.md</Path>，跨票 Gate 验收引用原票/整体证据；不创建第二份 Agent 状态账本或空完成文件。纯 plan 的自查记录与这些未来实现证据分开。

## 5. Constraints, Risk and Recovery

### Non-negotiable Constraints

保持已批准行为：默认当前 Space、明确同 Vault 跨 Space，禁止跨 Vault；库外 cwd 必须显式授权；关显示只 detach；退出宿主收束运行、重启不自动 replay；后台原生审批由人操作；被动邮箱不唤醒模型；历史先归属后摄入、完整来源引用精确继续；Browser 与 Agent 生命周期分离；既有完整原生结果保持。

遇到陌生功能先检索近两年活跃且许可明确的同类 GitHub 项目，比较机制、依赖和已知问题，更新原参考与当前票采用理由。已有 R-01–05/K-01–07 可沿用有效证据；源码、依赖或参考 commit 变化时再核验。继续禁止复制/改写 GPL 终端或来源不明、不兼容代码。研究先行不能演变成整包移植或无限搜索。

### Verification Integrity

每票都已声明 required E2E，不推迟到最终票统一补造；T-18 只汇总并补真实跨平台/集成风险。DOM/原型、native 测试、真实 Provider、真实 Obsidian 和五平台证据分别成立。编译、skip、Mock、截图动画、会话空闲均不能替代所需真实路径。性能先固定工作量和原始样本，具体限额按公共合同公开并回归，不复活原输入未验证数字。

冻结输入漂移只使相关证据失效；最终审查覆盖全部交付与来源，变更配置/依赖/环境/Skill/设计时核对影响。不能删测试、放宽断言、吞掉错误、换来源数据或降低产品范围来制造通过。

### Migration or Release Sequence

Expand（T-01–13 保留原适配与隔离新格式）→ 消费者迁移/观察（T-14 各真实调用方通过）→ 接线 contract（旧控制路由归零）→ 数据迁移（T-15 stop-writer、恢复副本、暂存转换、计数/身份/引用验证、切单 writer）→ 数据恢复观察（T-15/16 中断/重入/导入与回退）→ 存储 contract（不再有旧 writer）→ 资产准备与五平台 verify（T-17/18）。

每次收缩前都有调用点、版本和恢复证据；不可归属历史保留报告与原件，账号/原生日志不搬。新版写过数据后先停写和备份，再回退程序或恢复旧副本，不把程序降级解释成数据已逆向转换。产品实际发版不在此计划的授权动作中，未创建发布/远程账本。

### Risks, Monitoring and Recovery

| 风险 | 观察和停止条件 | 恢复与责任 |
|---|---|---|
| 多 Agent 写集冲突 / 未知 writer | 文件/公共 schema 正在被另一个未关闭任务修改，快照漂移 | 仅暂停重叠路径和依赖；Lead 查真实句柄和写入结果，确认停写再交接，不靠超时推断已停止 |
| 模型/团队能力不可用 | 工具拒绝所需 model/effort 或没有独立 reviewer | 记录实际限制与未运行项；保留相关验收待执行，继续无依赖的已授权工作，不伪造指定模型结果 |
| 状态/Hook/TUI 变化 | blocked/unknown 被错判、原始输入有歧义 | T-06/08 回到 unknown 与原终端，核对版本/屏幕/原生事件，先查现状，不重发 |
| helper/PTY/IPC 异常 | 残留进程、回入死锁、旧 runtime、慢客户端阻塞控制 | T-01/04/05/07 依据代次与 owner 定位，保留恢复记录，暂停新副作用，限额/取消/退出保证必须真实验证 |
| 历史/迁移/恢复错误 | 无归属正文混入、占用冲突、计数/摘要不符、旧 writer 仍在 | T-11/12/15/16 停相应写入，保留旧有效版本与副本；不抢锁/覆盖原件 |
| 五平台/真实 Provider 环境不齐 | 某 required 场景缺机器、账号或不能实际运行 | 阻塞相应票/平台证据与 G-06；可以继续尚未受影响的前序已授权工作，不能降低五平台数量 |
| 验证基线已有失败 | 当前全仓文档检查含另一 change 的六处旧锚点错误 | 保留归因和原输出；修复当前新引入问题，不静默改别的 change 或关闭检查；后续 run 重新判定受影响检查 |

### Deviation Control

遵循 <Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>。局部实现可在原合同内决定；Ticket 写集/路线变化由原 owner 更新并重新校验；外部行为回 S、架构回 G、视觉回 P-prototype、永久知识回 A。跨票顺序/模型安排/共享 owner 变化先改本 Goal 与 Map 修订，旧 Packet 标明失效范围；任何执行者不得先越界再补文档。

相同 blocker 无新证据不重复派发；失败达到有效 integration_attempt_limit 后由 Lead 在原票 Evidence 复盘。只有输入、方法、环境、范围或责任处置有实质变化，才可发新 Packet 并按原规则重置尝试；换 Agent、换模型或清空计数不算恢复。

## 6. Progress and Decisions

### Current Status

本轮 plan 已写入，尚未进入运行。G-00 等待用户后续实现指令；W-01 未开始，G-01–06 均未验收。此处只拥有跨票状态，单票 Ready/owner/进度从原 Ticket 和 Evidence 读取。未创建产品执行上下文、实际 Agent Team、实施/审查回执或产品通过记录。

### Pending Decisions and Blockers

没有待答的产品范围、A 方案或模型分工问题。本次请求仅要求计划，缺少 run 授权是可见的执行前提，故 `ready_for_execution: false`；无需为了交付本计划额外询问。实际环境、owner、Skill 摘要和当前票依赖在 G-00/逐票派单时核验，五平台资源只在相应验收阶段成为局部阻塞，不一开始阻止所有准备工作。

### Resume Protocol

恢复先读本 Goal、Map 当前 revision、README Outcome/Execution Context（若已实际建立）、当前候选票与直接依赖 Evidence；核对用户授权是否持续、Lead 身份、Git/工作副本、真实 writer、工具/模型能力、Skill 与设计摘要。plan 阶段不凭文件里的建议开始 implementation。

已授权 run 后从最早依赖满足且 DoR 通过的票继续，完成当前实现、独立 review、验证和同范围修复后再推进下一票，不逐票要求用户说“继续”。中断派遣先核验原执行者和已落地结果，再接续；迁移/输入的未知副作用先查询，不重复。局部阻塞仅暂停其依赖闭包；如果所有可行分支都阻塞，保存精确缺口与恢复条件后交回，不声称仍在后台执行。

## Assumptions

- 用户所述 “X high” 对应当前工具参数 `xhigh`，“6 Astra high” 对应 `gpt-6-astra` / `high`；属于已给定模型名的标准化，未另选模型。
- 同票路径可安全拆开时使用 Agent Team；拆不开就按原票由一个实际 writer 执行，独立 review 资格保持。
- 当前 checkout 可继续作为未来实施工作区；首次 run 以真实 Git/owner 再验证，不把本次规划观察冒充最终执行基线。
- 全局产品/设计合同已闭合。若实际发现高影响假设，`ready_for_execution` 必须为 `false` 或暂停受影响分支，不能靠更详尽的文字掩盖缺口。

## Execution Policy Source

| 决定 | 可回读来源 | 本次处理 |
|---|---|---|
| 仅 plan 与 Agent Team 模型分工 | 本次用户请求；LOG-025 | 写入当前 Goal；未启动实现或派遣，不修改全局编排默认 |
| serial 与共享 owner | Map §5、全部原票 resource_claims/shared_path_owners、execution-policy | 跨票串行；同票允许非冲突团队，公共文件仍唯一实际 writer |
| 不设项目固定票数/人数上限 | 用户未指定；项目 config 只有语言/外部写确认，coordination/project.json 不存在 | 不新增 max_parallel_tickets / concurrent_implementation_limit 或空配置；serial 的活动票语义依原协议 |
| 当次最多 4 活动槽位（含 Lead） | 当前宿主 collaboration 工具说明 | 派遣时按实际工具容量核验；不固化为跨会话不变事实 |
| integration_attempt_limit = 3 | <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 缺省 | 只限制重复失败后的复盘；若后来发现更严格真实 config，按原义取共同上限 |
| current 与一次性运行记录 | <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path>；README | 规划只记录选择；首次 I 才建立唯一 Execution Context，不增建 worktree |
| 单票/最终独立 review | <Path>{roots.workflows}/specdev/common/rules/coordination.md</Path> 与 code-review Skill | 默认未参与实现的 Astra reviewer，两轴分别返回；Lead 不自审替代 |
| 研究与许可、Git 边界 | AGENTS 与用户上一轮新增要求；Spec NFR-007 | 已有研究可回读，新陌生功能先比较；无默认提交/推送/发版 |

运行前使用只读 `ticket-control.mjs --map`，再由已获授权的 I 执行；控制器不能替代真实授权或 Gate 验收。规划检查使用 `validate-specdev.mjs --stage goal-plan --repo .`；通过表示结构和绑定成立，不把 draft 提升为已获执行授权。
