---
schema_version: 8
artifact: goal-plan
change: 2026-10-25-huhu-bot-architecture
status: draft
modes: [migration, high-assurance, reference-conformance]
orchestration: lead-directed
lead: /root
integration_attempt_limit: 3
ticket_execution: auto
ready_for_execution: false
---

# Goal Plan：HUHU Bot 完整首版与 Agent Team 实施编排

计划修订：42；输入 Tickets Map `plan_revision: 43`；规划日期：2026-10-25。用户 LOG-045 要求生成本计划，并允许后续调用 Agent Team：实现优先 `gpt-6.1-sol / xhigh`，独立审查优先 `gpt-6-astra / high`。本线程按 LOG-047 进入 `run`：用户已授权全面实施；当前以 LOG-051 完整代码交付和代码层总验收为准，真实操作由用户后验；P 摘要与旧批准关系单独保留，不阻塞已授权代码工作。

- **总控入口：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>；单票依赖、写集、状态与执行 owner 以原 Ticket 为准。
- **行为与设计：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path>；只实现已确认的 UI-001/final。
- **研究与核验：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-planning-validation.md</Path>。

当前交付边界以 LOG-051 的最新 Goal 为准：完成全部 P1 代码、适用代码层检查和独立代码审查；真实模型、Obsidian 界面及用户环境的实际操作由用户后续验收。原产品行为/AC 不删减，未运行项如实记录且不阻塞本轮代码交付。

## 1. Outcome and Authority

### Outcome

在 HUHU 现有 Obsidian 工作台内交付完整 P1：多 Bot 身份与单聊/群聊、协调者和显式 @、已有/临时 Agent 的发现通信派遣与受控再委派、隔离记忆、三种模型协议、资料授权、单笔记审批写入、可靠持久运行/恢复、永久清除、portable 和受管原生运行。Go Domain/Application/Adapter 分层及统一 Application API 支持未来 Web 复用。计划包含原 28 张 Ticket 与全部 55 项 AC；用户没有指定票数，不缩减为单助手版本。

### Success and False Completion

整体成功以 Spec AC-001–055、每票适用验证、最终固定输入的独立双轴审查和真实宿主主路径证据为准。Mock、SDK 具备接口、原型已选中、交叉编译成功、worker 自报完成或 28 张票都标 done，均不能单独证明整体交付。P0 探针嵌入对应实现票，必须转化为可验收实现与锁定合同。

### Non-goals

范围沿用 Spec IN/REUSE/OUT；不加入 Web/HTTP 上线、独立常驻、全库默认索引、任意 shell/MCP、跨设备同步或 CLI Agent 重构。本计划中的 Agent Team 是研发协作安排，与产品内 Bot/子任务的运行限制分别管理。本次交付为完整 P1 实现与适用验证；发布、提交、远程写入与永久知识更新不纳入本次完成条件。

### Authoritative Inputs

| 来源 | 负责内容 | 冲突与变更路由 |
| --- | --- | --- |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/LOG.md</Path>：LOG-033/034、040、042、045 | 完整多 Bot/记忆、唯一 final、先研究再实现、团队与模型偏好 | 最新明确用户决定优先；更新真正拥有决定的工件 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path> | 外部行为、55 AC、S1–S9 | 不由 Goal/Ticket 改写产品合同；范围取舍回 G/S |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path> 与 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/bindings.json</Path> | revision 2 已批准设计与不可变 final 绑定 | 交互变化回 P；技术证据缺口不撤销设计批准 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/CONTEXT.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path> | 现行决策、领域语义、分层；ADR-012/015 已替代 | 按已接受新合同实施；永久知识只走 A 网关 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path> 与 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/</Path> | 票级实施合同、依赖、路径与 Skill | Map 结构修订/输入摘要漂移时重新 preflight；Goal 只拥有跨票编排 |
| <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> | 九个仓库的固定源码、活动/许可、机制与采用限制 | 研究材料不授予 HUHU 权限或证明其已验证；新陌生点继续按 ADR-026 研究 |
| 实测当前代码、AGENTS.md 与各票真实 dev/ui Skill | 工程现状、检查命令、集成约束 | 可逆实现细节由执行者选择；合同冲突交 Lead 和原 owner |

最初规划时的基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`、分支 `main`，当时尚无 `native/huhubot`、`src/modules/huhubot`、`contracts/hap` 实现；该历史输入摘要见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-inputs.json</Path>。当前执行基线、分支与源码快照以 README Execution Context 和各票最新 Evidence 为准，不能把规划时的未实现状态当成当前事实。原附件、历史日志与批准快照保持原字节，不按实现结果追改。

## 2. Execution Graph

### DAG and Critical Path

完整边来自 Ticket `blocked_by`，Map §3 为其投影。以下是当前无环图的一条最长依赖链，不是工期估计；T-22 可换成 T-23/24/25 的同深汇合分支。

```text
T-01 → T-02 → T-03 → T-06 → {T-11,T-12 联合} → T-13 → T-16
     → T-08 → T-14 → T-15 → T-17 → T-18 → T-19 → T-20
     → T-21 → T-22 → T-28

关键侧路：T-03 → T-04；T-02 → T-05 → T-06 → T-07 → T-16
          T-08 → T-09 / T-10 → T-21
          T-20 → T-26 → T-28
共享集成：T-27 现有工程准备可先开始；T-01 产物 → Go 资产子步骤
          全部最终生产输入 → T-27 完成验收 → T-28
```

T-08 的真实模型调用必须等 T-12 的预算准入与 T-16 的取消/恢复合同；T-16 先用 fake Engine 验证，避免依赖真实模型或记忆形成循环。T-14 再复用同一模型/恢复合同。T-28 的依赖闭包覆盖其余全部 27 张票。

### Waves and Ownership

Wave 是导航分组，不增加全组屏障。每张票满足自己的依赖、DoR、下表有关 Gate 与资源条件即可推进；同一行不保证并行。项目路径为职责摘要，精确可写/只读/共享路径仍查原票，绝不据本表扩大写集。

| Wave | Ticket 与组内次序 | 前置/可观察出口 | 项目路径与共享 owner | Gate/集成顺序 |
| --- | --- | --- | --- | --- |
| W1 基础接通 | T-01 → T-02 | G0；真实进程/SQLite/双端 HAP，再建立 Bot/模型与凭证登记 | contracts/hap、Runner 基础、TS client；公共合同归 T-01 | 先稳定 schema/API/依赖，再开放消费者 |
| W2 持久行为与宿主效果 | T-03、T-05；T-04 在 T-03 后；T-06 在 T-03/05 后；T-07、T-11 在各依赖满足后 | 持久回执、事件续读、逐跳来源授权、审批和真实 Host 写效果 | 各票 application/adapter/test 切片；SQLite 顺序由 T-01 协调 | 逐票固定证据，汇入 G1；不借 UI 代替服务验证 |
| W3 协作与恢复 | T-11/T-12 联合 → T-13 → T-16 | T11合同先冻结、T12真实策略，两票同门；事件和 T-07 分支；消息/预算/群路由/调用树恢复 | collaboration、groups、recovery；准入与来源语义窗口串行 | G1；关闭后才放行 T-08 |
| W4 真实引擎与记忆 | T-08 → T-09 / T-10 / T-14；T-14 → T-15 | T-08 独立真实协议闭环；其他协议与私有/全局记忆分支 | Eino adapter 与 memory；Engine 合同、额度、schema 冲突串行 | 三协议汇入 G2；记忆分支汇入 G3，互不制造额外等待 |
| W5 数据与运行集成 | T-17 → T-18 → T-19 → T-20 | 按各票依赖；删除/导入/升级证据后接模块启停、安装 | data/maintenance、TS runtime、显式装配；装配归 T-20 | G3 放行 T-20；测试消费者先验证生命周期，实际页面由 T-21/22 提供 |
| W6 完整用户任务 | T-21 → T-22 / T-23 / T-24 / T-25；T-26 在 T-20 后独立推进 | T-21 同时需要三协议和运行集成；六页面及固定负载测量 | UI 自有页面/词典/样式与 diagnostics；宿主实例、构建窗口串行 | UI 汇入 G4；测量汇入 G5 |
| X 共享构建与平台 | T-27 | 现有工程准备无前置票；Go 子步骤等待 T-01；等待最终输入时释放 writer | 根依赖/构建/main.js/styles.css/notices/工程规则仅 T-27 | 为前述各票提供集成窗口；G5 验收前收齐 T-01–26 最终输入 |
| W7 整体交付验收 | T-28 | 原票全部依赖有效，G2–G5 闭合 | 产品验收脚本/夹具；Lead 固定全量实际输入 | G6；最终组合审查、真实宿主结果与55 AC归集 |

**可以调用 Agent Team。** 例如 T-03 与 T-05、T-04 与已有依赖满足的 T-07 可在精确写集和资源分离后合作；T-22 与 T-24 可分别实现页面。相同 `resource_claims` 默认串行，只有证明资源实例与读写窗口可分离并先更新原票/Map 合同时才细化并行。T-09/T-10 共用 Engine 合同和真实 Provider 额度，不因文件不同就同时启动；真实宿主验收始终由 Lead 协调。

### Shared Ownership and Completion Boundaries

| 共享表面 | 唯一写入责任 | 消费者与恢复 |
| --- | --- | --- |
| HAP schema/生成类型、Application API、TS api.ts/ModuleId、go.mod/go.sum、全局迁移顺序 | T-01 | 消费者提交精确变更请求；owner 更新并回归受影响接缝 |
| 模块/设置/导航注册、i18n 聚合、Go bootstrap/modules.go | T-20 | 页面拥有自有组件，入口由 owner 集成；禁止平行装配机制 |
| 根依赖、构建产物、样式注册、许可、现行 docs 与 dev/ui 规则 | T-27 | build 前停相关源码 writer；记录实际输入；Skill 变化重绑受影响票并重审相应 Evidence |
| change 正式状态、Evidence、Gate、README Outcome | 原 Lead | worker 交候选，Lead 核对再写正式事实；不创建另一份任务状态库 |

T-27 的 `blocked_by: []` 只允许先准备现有构建/共享 owner 窗口；Go 子步骤等 T-01 的真实产物验收，G5 是全票完成条件。此安排解决 T-01 需要共享构建而 T-27 又等待 T-01 的循环，不把后续消费者加入 T-27 开始依赖。准备工具后逐切片集成；等待时没有活跃写入者，但若票处于 in_progress/review，仍计入活动票数。不得提前把 T-27 标 done 后继续无记录地写共享产物。其他已验收 owner 因后续请求修改共享合同，先使受影响证据失效、按 I 恢复维护和验收；原职责不转让给消费者，也不自动让无关分支失效。

### Ticket Quick Reference

下列 Evidence 是实施时由 Lead 生成的目标路径，当前未创建实施记录。每票开始条件为适用的 G0 分支＋原 `blocked_by` 的有效完成证据＋本票 DoR/owner/资源；工作区均引用 README 既有 current 选择；验证层级和失败恢复回读原票。这里只导航，不复制状态和验收结果。

| ID | Ticket | 实施 Evidence 目标 |
| --- | --- | --- |
| T-01 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/01-runner-profile-contract.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-01.md</Path> |
| T-02 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/02-bot-model-credentials.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-02.md</Path> |
| T-03 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/03-durable-chat.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-03.md</Path> |
| T-04 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/04-durable-events.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-04.md</Path> |
| T-05 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/05-sources-grants-host.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-05.md</Path> |
| T-06 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/06-approval-broker.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-06.md</Path> |
| T-07 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/07-note-write-reconcile.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-07.md</Path> |
| T-08 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/08-engine-chat-completions.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-08.md</Path> |
| T-09 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/09-engine-responses.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-09.md</Path> |
| T-10 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/10-engine-anthropic.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-10.md</Path> |
| T-11 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/11-delegation-directory.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-11.md</Path> |
| T-12 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/12-messages-limits-budget.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-12.md</Path> |
| T-13 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/13-groups-routing.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-13.md</Path> |
| T-14 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/14-private-memory.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14.md</Path> |
| T-15 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/15-global-memory.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-15.md</Path> |
| T-16 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/16-cancel-recovery.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16.md</Path> |
| T-17 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/17-permanent-purge.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-17.md</Path> |
| T-18 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/18-portable-import-export.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-18.md</Path> |
| T-19 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/19-profile-upgrade-backup.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-19.md</Path> |
| T-20 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/20-module-runtime.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-20.md</Path> |
| T-21 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/21-chat-ui.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-21.md</Path> |
| T-22 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/22-agent-group-ui.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-22.md</Path> |
| T-23 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/23-tasks-access-ui.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-23.md</Path> |
| T-24 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/24-memory-ui.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-24.md</Path> |
| T-25 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/25-data-ui.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-25.md</Path> |
| T-26 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/26-diagnostics-performance.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-26.md</Path> |
| T-27 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/27-build-platform-notices.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-27.md</Path> |
| T-28 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/28-product-integration.md</Path> | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-28.md</Path> |

## 3. Gates and Completion Evidence

### Overall Definition of Done

1. 全部 55 AC 的必需接缝按 Map 主责归集；三协议各有真实 endpoint/model 证据，六页面匹配已批准 final，无未经用户决定的删减或 deferred。
2. 每个非取消 Ticket 有真实代码/产物、已执行的项目 Skill、适用检查、独立标准轴/规范轴通过证据和固定输入；无需改动的票只能基于事实取消并重新处理覆盖，不能 Evidence-only done。
3. G1–G6 的应用/数据/效果/平台/产品证据闭合；支持平台只写真实验证通过目标。所有生产 TS/样式/原生资产、依赖、notices、现行工程文档一致，最终组合由独立 reviewer 审查。
4. 无活跃 writer、未验证交付或未决高影响偏差；恢复/回滚可回读。Lead 核对真实工作区、Ticket、Map、Goal 和 README Outcome 后才宣布产品完成。此次仅完成计划，不满足上述产品 DoD。

### Gates

| Gate | 开启条件 | 关闭证据 | 阻塞范围 | owner/批准人 | 失败恢复 |
| --- | --- | --- | --- | --- | --- |
| G0 分支执行入口 | LOG-047 已授权；LOG-049 按真实 UI 依赖分支 | 后端：Spec 业务合同、Map/Ticket/Skill/工作区与逐票 DoR；UI：另需 P preview/ready、S UI readiness 与有效批准摘要 | 独立后端 T-01–19 和 T-27 非 UI 准备已开放；UI/全局验收保留门禁 | Lead；既有方向沿用 LOG-040，修复摘要关系由 P 维护 | 不以 UI 材料阻塞独立后端；不伪造全局 Ready |
| G1 受控执行底座 | T-01–07、T-11–13、T-16 对应依赖完成 | 真实 HAP/SQLite、幂等/事件、逐跳来源、Host 写/回执丢失、预算/取消/重启故障证据；fake Engine 与同一用例接通 | T-08 及依赖闭包；其他基础准备可继续 | Lead 核验 S1/S2/S3/S5/S6 | 定位失败票/事务窗口；保留 unknown 原证据，修复后仅重验闭包 |
| G2 三协议对等 | T-08/09/10 各自可验证 | 各协议真实流式、工具审批/拒绝、取消/恢复、usage/error；准确版本与目标，无静默协议回退 | T-21、T-28；T-14 只需 T-08，不等待另两协议 | Lead 核验 S4 | 暂停失败协议分支；adapter 内修复；合同降低回用户 |
| G3 数据与记忆完整性 | T-14–19 对应依赖完成 | 私有隔离/自动维护、全局确认、forget 迟到作业、删除传播/最小安全记录/代数、portable 冲突、备份迁移和坏库恢复 | T-20 与数据消费者；其他协议分支可继续 | Lead 核验 S1–S4/S6 | 一次性 Profile 留现场；核查后恢复；不靠空库或复活被删数据通过 |
| G4 宿主与唯一界面 | T-20–25 各票依赖和原型门满足 | 实际 Obsidian 的六页面、leaf/Portal、键盘/状态、审批/资料/恢复/清除；根/子任务身份与最终数据一致 | T-28；不阻塞独立 T-26 或平台准备 | Lead 核验 S6/S8 与 Design Conformance | 回对应用例或 UI owner；设计改动回 P，不混入其他候选 |
| G5 最终构建与平台 | T-01–26 生产输入已固定；T-26 测量完成，T-27 收齐消费者 | 对同一输入构建、许可/包体/i18n/边界/Skill 更新记录；每个声明支持 OS/架构真实启动/TLS/DB/凭证/关闭；测量样本/阈值与结果 | T-27 完成与 T-28 开始 | Lead；共享写入由 T-27 | 失败归属具体源票，修复/重建/重验影响范围；未通过目标不列支持 |
| G6 产品整体完成 | T-28 原依赖有效且 G2–G5 闭合 | 从附加资料/建群/委派/审批写，到崩溃恢复/记忆/清除的真实主路径；55 AC 归集、最终组合双轴审查、无未决高影响差异 | Goal/README Outcome 完成 | Lead | 保留完整快照与反例，返回源票；修复后重新核验受影响整体接缝 |

本表定义验收门而非重复 Ticket 状态。当前 G0 后端分支已满足，UI 分支待满足；其余 Gate 尚未执行。技术缺口按 <Path>{roots.workflows}/specdev/specdev-p-prototype/SKILL.md</Path> 的原要求处理：“设计绑定、批准、浏览器证据与源码全门通过后才设置 ready”。用户 LOG-036 选择自行验证，现有 LOG-040 只有设计确认；本计划不新增浏览器替代方式或伪造技术记录。

### Contract and Reference Coverage

逐项 AC→主责/接缝的唯一矩阵是 Map §4；以下只汇总跨票验收责任，不另写第二套 AC。

| 合同/参考 | 责任分支与 Gate | 证据目标与采用边界 |
| --- | --- | --- |
| 55 AC、S1–S9 | 全部 Ticket；T-28 归集 G6 | 原票 Evidence＋最终真实产品证据，covered 不等于 pass |
| 三协议、同一 Engine | T-08/09/10，G2；REF-01/02 | 锁定 Eino/EinoExt 子模块与最终依赖图；历史问题作回归线索，Responses 单独实证 |
| Bot 发现/协作/群聊/记忆 | T-11–15，G1/G3；REF-03–06 | 借鉴工具与上下文隔离；不继承参考的越权 Leader、自动全局写或禁用再委派等差异 |
| SQLite/凭证/平台 | T-01/02/19/27，G1/G3/G5；REF-07–09 | 真实驱动与 OS 保护探针、许可/传递依赖；当前不预先宣称采用所有参考 |
| 唯一 final 与 HUHU 现有基底 | T-20–25/27/28，G4/G6 | DESIGN revision 2 与现行绑定；生产 t()、en/zh、leaf/Portal、可访问性 |
| 陌生功能先研究 | 每个出现陌生点的当前票，开工相应子步骤前 | 查询日期、仓库/固定 commit、近两年活动、LICENSE、机制/依赖/已知问题比较、采用/不采用理由进入对应文档及票 Evidence |

研究使用 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 的 GitHub/源码/issue 链接作为起点；计算“近两年”以实际研究日期为准。先读已有机制与已知问题，再做最小探针；找不到活跃且明确许可的合适实现时记录检索/排除理由，按本合同设计小范围方案。直接引入或改编必须经过项目许可规则；来源/许可不明时不能复制。仅借鉴思路也写来源及差异，不把外部产品规则直接移入 HUHU。

## 4. Execution and Integration Protocol

**执行入口：** 用户已通过 LOG-047/051 明确授权完整代码实施，按实际依赖调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>。Lead 与 worker 按 Map → 适用项目 Skill → 当前 Ticket 调用真实 dev/ui；每票 `skill_bindings` 的 ID、摘要、输入、输出和失败动作继续有效。研究先行与模型偏好不替代实施、独立审查及证据合同。

### Lead Orchestration

| 项目 | 决定 | 来源与边界 |
| --- | --- | --- |
| Lead | 本线程 Codex `/root`；接续时核对原 owner/授权和活动 writer | 正式状态、Evidence、跨票验收、整体 E2E 和最终交付由 Lead 负责 |
| Ticket scheduling | `ticket_execution: auto` | 依据 DAG、Gate、精确写集/语义资源和宿主能力选择串并行；不设虚构票数上限 |
| Agent Team | **允许使用宿主原生 subagent / Agent Team**，按任务动态组合 | 用户 LOG-045；采用当前宿主 `mode: lead`，不另建团队注册库、不启动额外 CLI 或 worktree |
| 实现模型偏好 | Codex **GPT-6.1-sol，xhigh**；工具标识 `gpt-6.1-sol`、`reasoning_effort: xhigh` | “X high”规范为 xhigh；实现/同范围修复可交 worker，Lead 按需参与 |
| Review 模型偏好 | **GPT-6-Astra，high**；工具标识 `gpt-6-astra`、`reasoning_effort: high` | reviewer 必须未参与被审范围实现；冻结同一候选，分别返回标准轴和规范轴结果 |
| Implementation agents | 用户未指定人数，不写 `concurrent_implementation_limit` | 执行时查询真实可用工具/槽位；Lead 实际写代码也算实现者；不从票数或产品 Bot 并发上限推导 |
| Integration attempts | 3 | execution-policy 缺省；实际 config 更严格时取更严格值，同 blocker 无新证据不继续尝试 |
| Read-only agents | research/review/test-observation 默认不写业务代码 | 不另加 SpecDev 数字上限，仍受宿主能力限制；review 中的原票仍计活动票数 |
| Dispatch | `execution-time dynamic` | 票开始时确认真实执行者、模型与可用性；按 LOG-047 实际派遣，TASK/REPORT 保存在本 change sessions |

用户给的是优先选项；执行时优先按上述模型派单，记录真实 model/effort。若不可用，说明原因并记录可用替代和实际安排，不冒称使用指定模型；不自动安装服务或切换外部账户。独立性是硬约束：实现者不能通过换模型、改名或新会话审查自己的改动；没有合格独立 reviewer 时仅阻塞相应审查与完成，不能由实现者自审替代。无需为同一已明确的团队偏好逐票再询问。

推荐的任务闭环是 **Lead 分配 → 实现 worker 交候选 → 未参与实现的 Astra reviewer 双轴审查 → 原实现者修复 → reviewer 核验受影响范围 → Lead 验收**。可由一名独立 reviewer 覆盖两轴，不强制固定多个角色。最终组合审查必须覆盖实际最终交付；若某 reviewer 后来写了实现，应重新选择不具作者冲突的人。

### Dynamic Dispatch Packet

每次原生委派使用真实工具句柄，发送可独立理解的简报：当前 Goal 修订及摘要、Map revision、Ticket/AC、已满足 Gate/依赖 Evidence、工作区与不可变基线、允许写集/共享 owner、必调 Skill、研究结论、实际验证/停止条件和候选返回位置。不要假定 worker 自动看到了本对话；需模型覆盖而使用独立上下文时显式传入这些材料。

实现者只执行分配的 Ticket/子任务和写集，不接管其他票、正式状态或原 Gate。审查者收到同一冻结候选及两个轴所需来源，默认只读产品文件。外部派遣仅在后续明确选择外部方式时按共享 TASK v2 保存交接；当前不制造外部 session。返回内容包含实际作者/模型、变更路径、快照、命令/退出码、未验证项、findings/blocker 和下一安全动作；Lead 回读后再更改正式事实。

### Change Workspace and Verification

沿 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 的 current 选择，所有执行者复用用户当前指定 checkout，准确分支和基线以 README 的 Execution Context 为准。当前工作区由用户环境指定为 NAMEWTA/bot，真实 base/branch/owner 已写 README 的 `Execution Context`；每票 Evidence 引用它，另记真实实现者、固定快照、Skill 调用和验证。工作副本快照可固定未提交产物，不要求每票 commit。

票级验证按原票接缝运行；Lead-owned E2E 在稳定工作区上执行。冻结前确认相关 writer 已停，记录实际源/依赖/构建/配置/样本/模型/OS/设计摘要。单票 review 可冻结其相关范围；全局 build、共享依赖、真实 Obsidian 实例、最终组合 review/E2E 使用串行窗口。不得暂存、覆盖或回滚本任务外的 `.gitignore`、AGENTS.md 用户改动及其他 change；T-27 将来获分配 AGENTS.md 相关更新时先保留已有用户差异，再做最小改动。

### Authorization Matrix

| 动作 | 当前状态 | 目标与条件 |
| --- | --- | --- |
| 本 change 的 Goal/Ticket/参考文档维护与静态检查 | allowed | LOG-042/045/047/051；随实现同步 |
| Change workspace implementation | authorized: LOG-047 | 用户明确要求全面实施；G0/逐票 DoR 通过后连续推进 |
| 原生 Agent Team 实施与 review 安排 | 已派遣，见当前 sessions | 实现 gpt-6.1-sol/xhigh，独立审查按既有偏好；无需重复确认 |
| Change worktree creation | not-requested | 复用 current，不从并行推导新 checkout |
| Change workspace verification | 代码层检查 authorized: LOG-051 | 本地自动化与独立审查；真实模型/宿主/用户环境操作由用户后续验收 |
| Implementation commit | not-requested | 保留源码/产物与工作副本快照；没有默认提交动作 |
| Merge / parent update | not-requested | 当前无跨分支集成要求 |
| Push / PR / remote merge | not-authorized | 不从实施或 review 推导远程授权 |
| Branch/worktree cleanup | not-authorized | 不删除他人/未决产物 |
| Deploy / migration / production actions | not-authorized | 实施用一次性 Profile/Vault 验证；真实用户库破坏性操作、发布与升级另按实际动作授权 |

### Evidence Return

候选报告不是 done。Lead 核对真实写集、快照、Skill、双轴审查与适用检查，在原 `evidence/T-xx.md` 写结果；Gate 只汇总这些原证据。若本票验收涉及外部条件而暂不可运行，保留精确 pending/blocker 和恢复条件，不把 skip 改写为 pass；可独立已授权分支继续。

## 5. Constraints, Risk and Recovery

### Non-negotiable Constraints

采用现行 Spec 的分层、资料最小授权、逐跳接收方检查、private 自动/global 确认、调用树预算与取消屏障、审批与效果幂等、手动恢复、删除传播/代数和未知效果核查。Domain/Application 不依赖 Obsidian/React/SQL/SDK；Host 拥有 Vault 写入。所有生产用户文案经 t() 与 en/zh，Profile 位于 Vault 外；未来 Web 只保留入口兼容。所有实现与参考借鉴遵守原票写集和许可证。

### Verification Integrity

整体 **E2E disposition: required**：三条真实协议、真实 Obsidian 主任务和每个声明支持平台的原生行为；不能由领域单测、DOM mock、截图或交叉编译替代。S7 离线原型检查与 S8 产品宿主证据分别保存。Go 检查在新模块中运行，现有 `pnpm check:native` 仅证明 Rust PTY；适用 TS/build、i18n、边界、许可、包体检查按 dev 选择表执行，不扩大为无意义全量重跑。

后续复用证据须输入、代码/锁、Skill、环境和实际输出匹配。已知原附件 6 处历史目录锚点错误继续单独标明；原件不可改，不隐藏为全绿。新的链接或格式问题必须本轮修复。模型/平台/浏览器缺失分别记录实际范围；产品不满足必需证据就不能关闭对应 Gate。

### Migration or Release Sequence

新增 Bot 的顺序是 expand（独立模块、API、OS Profile）→ integrate（显式入口与 UI 投影）→ verify，不迁移 CLI Agent 历史。Profile 升级由 T-19 按停止新受理/处置在途→锁与一致备份→迁移→观察与兼容验证→满足证据后收缩执行；坏库不覆盖空库，旧 binary 不兼容须拒绝。删除测试用一次性数据，unknown 先核查再允许全清；rollback 不能通过恢复旧备份复活已删正文。本计划准备资产和验证支持范围，没有发布窗口或自动部署，因此不启用 release-coordination 模式。

### Risks, Monitoring and Recovery

| 风险/失败信号 | owner 与处置 | 可恢复条件 |
| --- | --- | --- |
| Eino 多模块锁版/Responses 桥接无法满足工具、取消或恢复 | T-01/08/09/10；保留请求/工具/CP 反例，修复 adapter | 同一合同重验通过；若需改外部行为回 G/S/用户 |
| SQLite/凭证原生依赖不支持目标 OS | T-01/02/27；比较已研究驱动/保护适配，记录真机限制 | 选择与许可明确、实际目标实证；不能仅凭上游 README 列支持 |
| 写效果未知、重复投递、删除后迟到作业 | T-07/12/16/17；留最小核查记录，冻结受影响动作 | 原幂等身份/代数/核查网关闭合；不靠换 key 或清库恢复 |
| API/迁移/Skill/生成物并写或输入漂移 | T-01/20/27 与 Lead；停止冲突 writer，保留双方改动 | owner 明确、新快照固定、受影响证据重验 |
| 模型额度/宿主/平台环境缺失 | 对应票 Lead 记录准确缺口 | 配置目标、凭证/可用额度、一次性环境实际就绪；独立分支继续 |
| 相同 blocker 无新证据或达到有效尝试上限 | Lead 停止重复派发，原 Evidence 保存失败历史 | 新输入/方法/范围/环境或责任处置有实质变化；仅换 Agent/清 attempts 无效 |

### Deviation Control

按 <Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>：产品范围/权限/数据语义/设计变化交原 G/S/P owner；纯实现与 adapter 细节可在合同内选择。依赖/写集/资源/Skill/AC 变更先更新 Ticket 与 Map revision，再更新本计划输入引用与受影响 Gate，不继续派发旧 Packet。局部阻塞只暂停依赖闭包；全局授权或入口门缺失时不派发任何实现。计划文件中的文字不能自行授予权限。

## 6. Progress and Decisions

### Current Status

Map24/Goal23：098两项P2交原T08修复，原T01/T03/T06仅透传数据库既有Intent供纯检查；T06重开，T08 attempts=1。T02/T12候选及T27维护保持，T16/G1原基线复用；修复后新构建Root E2E与独立复审。28票55AC、DAG及用户现场后验不变。

### Pending Decisions and Blockers

当前无新的产品取舍需要询问。已有final和Agent Team/模型偏好沿用；原型技术复测与owner/Skill重绑已完成，P/S的历史形式状态单独保留。按LOG-051，代码实现使用真实本地进程/SQLite和可控Provider故障夹具；真实endpoint/model/安全凭证、Obsidian与目标OS操作由用户后续验收，不再索取凭证或把现场条件作为代码派单阻塞。

### Resume Protocol

恢复先读 README→本计划修订与输入摘要→Map revision→当前 Ticket/依赖 Evidence，再核对实际工作区/branch/base、活动 writer、Skill 与未决副作用。按 LOG-051 回读当前代码交付口径；UI 沿既有 DESIGN 实施，P 的历史形式门和用户后续现场验收不阻塞代码派单。后续同范围实现、审查、修复和下一 Ready 票连续推进，不逐票等待“继续”。任何 dispatch 结果不明先核查原 writer/事务，不能直接再派同一副作用；没有新证据时保留检查点并停止空转，不承诺后台运行。

## Assumptions

用户“可以使用”的两组模型按优先偏好记录，实际工具以派单时可用性为准。current 工作区与完整 P1 范围均沿既有决定；具体实现者、支持平台和 Provider 实例没有假定已就绪。LOG-047 已补实施授权；UI 修复技术证据及摘要关系仍待闭合，因此全局 `ready_for_execution` 保持 `false`，独立后端按 LOG-049 执行。

## Execution Policy Source

- 用户 LOG-045 明确要求 Goal Plan、可调用 Agent Team、实现 `gpt-6.1-sol / xhigh` 与 review `gpt-6-astra / high`；LOG-042 固定陌生功能先研究和全部文档对齐。
- <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path>：默认 auto、current，验证失败复盘缺省 3 次；只在明确要求时写票数/人数上限。此次未发现 <Path>{roots.state}/specdev/config.json</Path> 或 <Path>{roots.state}/coordination/project.json</Path>，没有创建配置或虚构限制。
- <Path>{roots.workflows}/specdev/common/rules/coordination.md</Path> 与 <Path>{roots.references}/coordination/coordination-contract.md</Path>：宿主原生团队、同一工作区、固定输入、未参与实现的独立双轴 reviewer、Lead 维护正式事实。实际平台限制在派单时核对，不把当前临时槽位固化为项目规则。
- 唯一工作区选择导航到 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path>；本计划 v8 及当前 schema 为结构依据。计划与实现授权分别核对，当前已启动 runtime Goal，独立后端按 LOG-049 执行。

### Map9原owner维护窗口

LOG061在依赖代码门实际关闭后开放026/027/028。026兼任原T01 Go共享owner与T02 pin/Usage owner，027持T05 Go/005正文，028持T05 TS和原T01协议路由维护；先协商冻结一份API/schema，再消费。只有026改embed/CurrentVersion/Ordered，两个SQL正文和临时Profile资源分开，根build/notices/资产继续由Lead/T27串行。原r2与slice3结论只覆盖其固定输入；新维护从attempts0记录，历史相同失败/修复不清除。不增加产品行为、依赖边或审批条件。

Map10 / Goal9只追加028原T01 TS owner的method-validation.ts精确固定计数维护：新read/search的单一schema与方法总数必须一致。026/027其余合同和资源不变，见LOG062。


### Map11原owner维护与下一执行窗口

Map14/Goal13：LOG072已接纳事件/审批代码门。现开启T07与T11/T12联合实施及原T01/T02/T03/T05/T06必要维护；T27先提供宿主最小回执根/排除/数据文档窗口，完整发行资产仍最终重建。先冻结唯一API/Port/SQL形状，再由原owner分别消费。实际派遣以各TASK工具回执为准，当前准备不代表已开工或通过。真实模型/Obsidian/目标OS用户后验。

042先收敛Events/Approvals/Tool/CP纯公共Port、typed cursor错误和两端schema，冻结后043/044消费；042的T03/T06准入/暂停/恢复同一writer，043的T04/T05权限/fence同一writer，044仅自身TS与原T01协议codec。SQL注册/唯一生成合同由042，最终根build/产物仍Root/T27串行；没有空004或历史SQL重写。新维护阶段attempts0，LOG066保留旧阶段attempts2及035失败。T02不重开，除非出现真实新共享写入请求。


Map12 / Goal11补充042原T01三平台stdout适配精确维护，来自实际deadline失败probe；其余042/043/044职责/依赖/资源保持，API独立工作继续。用户授权与原验收口径不变，不请求新现场测试。


Map13 / Goal12补充原T03历史可见消息的可信TaskID传播与原T01历史HAP路由出队标记；042唯一维护原owner路径，043拥有gate/实际排队验证。历史页及batch的有界guard数量需覆盖正常多Run历史，未验证前不记通过；无需新增用户决定。


### Map14原owner与联合协作窗口

Map14/Goal13：LOG072已接纳事件/审批代码门。现开启T07与T11/T12联合实施及原T01/T02/T03/T05/T06必要维护；T27先提供宿主最小回执根/排除/数据文档窗口，完整发行资产仍最终重建。先冻结唯一API/Port/SQL形状，再由原owner分别消费。实际派遣以各TASK工具回执为准，当前准备不代表已开工或通过。真实模型/Obsidian/目标OS用户后验。

foundation_go拥有T07 Go和原T01公共API/schema/Go传输/路由/装配/迁移注册、T02配置/pin、T03执行/线程/取消屏障、T06 Broker/effects/Blob及T01迁移前DB+引用Blob恢复集；credential_provider拥有T11/T12新业务和011/012正文、原T05 Go lineage/授权，以及原T02 sqlite/assistant/credentials.go临时配置引用删除guard（其余凭证实现只读）；T04保持done只读，若确有事件生产改动先由Root另开精确窗口；foundation_client拥有T07 TS HostWrite/Obsidian adapter与原T01 TS协议生命周期、原T05来源目标准备；build_integration只持T27精确共享路径窗口。原owner职责不转移，不写旧SQL或凭证实现。

T12开工依赖从T11改为T02/T03/T05/T06：不是删掉策略要求，而是先共同冻结T11准入合同、默认拒绝无策略，再在一组候选完成T11/T12，两票共同验收后向T13供给。T07的最小Host回执和TS取消接缝与共同Owner串行装配；T27小窗口先完成共享根/排除后释放writer。下游真实模型接入仍等待T12与T16，047研究已真实交回并接纳于evidence/model-protocol-preflight.md，其故障矩阵尚未运行。


### Map15 共享后验脚本维护

Map15/Goal14：052/053/054 已实际派遣，T07 与 T11/T12 联合实现及原 T01/T02/T03/T05/T06 维护仍在进行；051 共享根已接纳，正式代码门尚未通过。LOG077 仅补 fresh-vault.mjs 的 T27 精确 owner，T07/T28 只读；下一空闲槽由 build_integration 修复强杀后的 Wait，并收口本机回执/HMAC 数据说明。DAG、28 票/55 AC、已有 writer 写集与用户后验边界不变。

054 不接管共享 helper；新增 T27 单写窗口待真实空闲槽派发。HMAC 说明沿既定数据 owner，实际代码稳定后精确记载键名与路径并重绑受影响 Skill 摘要。Root 不把脚本语法通过当作真实 Obsidian 验收。


### Map16 数据归属参考重绑

Map16/Goal15：054 客户端与058三路径维护已真实交回，Root全读报告、亲自return0与摘要核验；052 Go候选停写等待053共同冻结，053仍在补齐故障与生命周期验证。Root联合E2E/构建和059独立审查尚未运行，正式代码门未通过。058仅两行持久化owner事实使architecture参考摘要变化，27张未完成票已重绑；T04既有已接纳证据保持历史输入。DAG、全部28票/55AC、writer写集及真实操作用户后验边界不变。

旧摘要6f64334012acc1cb213bfa72fdc7bf214e96e07d0c2c9738b26c9ffebc420ce0，现摘要0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42。Root实际回读058精确patch、HMAC/receipt/工厂源事实和受控进程红绿日志，确认不改变Go架构/验证规则。052/053已获原生通知；当前联合审查使用新参考并分别保留作者启动/返回摘要。T04历史050验收不改写成使用新规则的执行，也不重复无关验证。


### Map17 群聊与原owner维护

foundation_go唯一维护T01公共API/schema/Go路由/装配/迁移注册及生成api.ts、T02配置pin与群usage、T03会话/执行/编排根；credential_provider拥有T13新group目录和013正文、原T04 Go投递、T05授权以及T11/T12成员资格/预算/结果消费；foundation_client拥有T13 mentions、原T04 TS和T01 TS协议消费者。每文件单writer；没有新的写权自动扩张，T06效果及T07 Host保持只读。

Map17/Goal16：072候选3联合代码门已真实接纳；开启T13群聊及原T01/T02/T03/T04/T05/T11/T12必要维护。先冻结可信用户批量受理、群成员代/历史范围、公共发布与同一Executor合同，再由原owner消费。T06/T07只读复用，T16仍等待T13；28票/55AC、DAG与真实操作用户后验边界不变。准备不代表实际派遣或通过。


### Map18 精确接缝补充

Map18/Goal17：T13及原owner维护继续；按073/075真实接缝精确开放base/store.go迁移生命周期与services/groups生产消费者。三作者实际ACK；28票/55AC、DAG和用户后验边界不变。最终合同及实现验收仍待完成。


### Map19效果核查接缝补充

Map19/Goal18：群消费者实测确认成员移除误拦原用户无正文效果核查；恢复原T06/T07精确两文件维护，由073唯一作者修复并重验。T13及既有原owner维护继续；28票/55AC、DAG和真实操作用户后验不变，当前无通过声明。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-13-logs/effect-owner-reconciliation-supplement.md</Path>。


### Map20取消与恢复联合窗口

Map20/Goal19：078修复后的079群聊完整候选已由Root接纳；开启T16取消/恢复及原T01/T03/T04/T06/T11/T12必要维护。T02/T05/T07/T13先只读复用，新增路径须实际最小请求。先冻结唯一资格/检查/领取/关闭合同，再消费并共同验证；28票55AC、原DAG和用户真实操作后验不变。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16-logs/recovery-window-map20.md</Path>。当前仅七票实施/维护联动；G1仍待T16代码门，T08不可先行调用模型。


### Map21原测试owner维护

Map21/Goal20：085只读诊断已接纳；T16联合维护继续，精确恢复T13 sources_test.go原owner测试维护以覆盖合法公共历史交错。事件3秒是夹具等待预算，先量化race与轮询成本再定修法；产品250ms/800投递门及权限/恢复合同保持。28票55AC、DAG和用户现场后验边界不变。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16-logs/map21-fixture-maintenance.md</Path>。当前八票实施/维护联动，T08仍等T16代码门。


### Map22 Chat协议联合窗口

Map22/Goal21：T16与底座代码门及G1已接纳；开启T08 Chat协议实现及原T01默认装配/依赖、T02元数据Probe、T12真实HTTP预算必要维护。T27稍后仅接实际许可闭包，全部发行资产仍最终重建。28票55AC与原DAG不变，真实模型/Obsidian/目标OS由用户后验。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-08-logs/engine-chat-window-map22.md</Path>。G1仅按LOG051代码口径关闭；原现场验收仍not-run，不把fixture当真实Provider通过。


### Map23 默认模型负控维护

原T03 owner仅维护tests/contract/chat/workflow_test.go中过期的默认未装配预期；实际默认Engine已存在，空模型明确MODEL_DRAFT_INCOMPLETE、未支持协议ADAPTER_NOT_ASSEMBLED，Resolve/HTTP/attempt均不能发生。T08生产由092继续负责，不改Executor、不扩公开reason枚举。冻结补充见evidence/T-08-logs/default-model-fixture-map23.md；原28票/55AC与DAG不变。


### Map24 Chat审查修复

用户完整28票55AC与Agent Team授权持续，最新回复再次明确真实模型/Obsidian/目标系统由用户后验，代码开发与本地验证继续。Root已亲自接收098：2032输入和15产物无漂移、return0，两轴request-changes；原始报告及两个真实红探针保持，见 evidence/098-lead-return.json。

F-098-01：把既有execution_runs.intent作为可信原受理Intent传入纯检查，并由同一common校验在Inspector和Resume比较最后初始user正文。不得从CP自身复制摘要充当独立基线，不承诺无可信旧历史基线的完整历史真实性，不机械比较刷新后全部history。保持Chat v1格式/身份/ToolDigest、同Run/CallID和原审批效果。

F-098-02：在解压后有界SSE原始字节、SDK有损JSON解码前校验UTF-8；合法多字节跨Read必须通过，EOF残行必须检查，非法后项阻止整批首Invoke。保持取消、排空、Body.Close、ProducerEnded与unknown保守结算及安全错误。

## 原owner与精确窗口

- 100 / engine_adapter：T08 common/{checkpoint,engine,tools}.go、chat/{body,driver}.go及tests/contract/engine/chat/**内必要测试。仅按最小修改，不换SDK/Engine循环。API/Broker/SQLite只读。
- 101 / foundation_go：T01 internal/application/api/recovery.go；T03 internal/adapters/outbound/sqlite/execution/recovery.go；T06 internal/application/tooling/broker/recovery.go；新增tests/contract/foundation/recovery_intent_test.go。仅两内部Inspection结构加Intent、原同Tx读取既有intent、原Broker透传；公共Run/HAP、迁移/SQL、go.mod/sum和bootstrap不变。字段统一Intent string。

T06由done重开in_progress，旧T16/G1完整接纳及T06历史证据保留；T16生产/测试无改动，保持其已接纳基线。本内部接缝和T08共同复验。T01/T02/T03/T08/T12原候选继续，T08累计attempts=1，不清空原失败。T27许可和七项docs记录保留，完整集成仍待后续。T09/T14研究不授予实施，DAG不变。

两作者可编辑各自不相交文件，但类型接缝稳定前不执行Go产品命令。101先完成透传并通知Root/100；Root在两方停写后给唯一检查窗，固定Go1.26.10/-mod=readonly。复用098既有真实红；一次受影响定向normal/race验证即可，无新失败不扩大旧重型全队列。作者实际Wait交回后Root新构建E2E，不复用旧二进制；再冻结新输入独立复审。所有日志/失败按原样保留，无真实凭证/外部模型/真实Vault，无提交推送发布归档。



### Map25 独立T27检查器维护

原T27 owner四路径维护095已有七项docs失败，具体因果与窗口见evidence/T-27-logs/docs-checker-map25.md。Chat100/101维持Map24冻结写集与检查调度，其他frontier未改变，全部28票55AC和用户后验不变。


### Chat代码门已接纳（LOG-110）

Root在正式输入d0f13ca8b86a1c8defdd8e93d9626556c90b426351193ee1d16e4569c6a31768接纳T08与T01/T02/T03/T06/T12必要维护，原102独立双轴pass、Root新构建r4本地代码E2E与结构/AC校验均完成。代码门evidence/T-08-logs/code-gate-chat-r2.json。G1保持；G2尚等T09/T10，G3及其余后续票继续。真实Provider/Obsidian/目标OS仍由用户后验，无提交推送发布归档。后续共享维护从此明确已验收基线打开，不抹除098失败历史。


### Map26 Responses联合代码窗口

T08与其必要维护已于LOG-110完成代码门。现从该明确已验收基线启动T09，并重开T08/T01/T06实际共享接缝；T02/T03/T12继续done，不扩大生产写集。原Chat r2验收、098失败历史及全部回执保留；新维护attempts从0计，是新T09范围而非规避原失败上限。当前用户回复再次确认只要求代码开发及代码层正确性，真实Provider/Obsidian/目标OS由用户后验。

采用097固定openai-go/v3 v3.44.0公开流接口，106原owner有限私有Registry/ProtocolState/metadata方案和httpcall辅助A；完整合同与调度见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-09-logs/responses-window-map26.md</Path>。107原common/chat owner、108原foundation/Broker/锁owner、109 Responses作者的具体TASK校验后分别实际派遣；准备不等于已派遣或通过。先109真实默认入口行为红，再共同写入、串行固定输入验证、Root新构建本地E2E及独立双轴。T27后续只接真实新增依赖闭包。G2仍等两新增协议，继续全部28票55AC，无提交推送发布归档。


### Map27默认Responses探测测试维护

首条Responses文本默认消费者已实际红→绿，108默认CLI/Broker目标通过；固定输入的旧T02模型测试失败来自协议已装配后的过期错误预期，不是凭证恢复或探测绕过。T02仅由原credential_provider维护model_test.go，并用原目标及显式Chat-only selector负控验证；不改变生产代码、不扩大原各作者写集。下一空闲槽派110，派遣前完成结构校验；与Responses共同冻结、独立审查和Root E2E收口，当前不宣称整票通过。全部28票55AC、G2等待T09/T10、用户现场后验与不提交推送发布归档保持。


### Map28现有元数据消费者维护

109发现T02另一个默认Probe测试仍期待Responses未装配。Root实际回读后，114由原owner先核真实红，再只改probe_http_test.go末段为当前单GET/安全404行为；不改变产品，不把显式Chat-only selector误改。T02现行维护attempts不重置，110历史结果保持。113已实际派遣修复两类文档checker语义，四原路径/T27范围不变；Root已修T06两历史锚点。两候选并入112同一最终冻结输入。28票55AC/DAG、唯一Go窗口和用户现场后验保持。


### Responses代码门已接纳（LOG-114）

T09与T01/T02/T06/T08必要维护已在78900740…2074固定输入通过Root本地代码E2E与112独立双轴，116只补显示锚点。正式门见evidence/T-09-logs/code-gate-responses-r1.json。G2仍等T10；115只读准备记忆接口，原28票55AC与用户现场后验范围不变。


### Map29 Anthropic联合代码窗口

从LOG-114已接纳Responses基线启动T10，T08/T01仅原owner必要维护；105固定SDK研究由117转为实际第三协议。采用合同见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-10-logs/anthropic-window-map29.md</Path>。117/118先派遣，119等原foundation_go交回115只读准备后再派。T27后续接真实依赖闭包。G2待T10代码门，其余28票55AC继续，真实操作用户后验。


## Map30 / Goal29 精确测试维护

Map30/Goal29仅重开T02的tests/contract/assistant/hap_test.go，由原credential_provider修正默认Responses已装配后的过期未装配断言；生产/API/凭证/锁及110/114测试只读。Root原单例实际exit1/Wait1.946400363秒，固定2032输入且无漂移；先观察实际fault，再最小迁移预期，保留strict DTO/秘密拒绝，并运行assistant整包覆盖同类默认消费者。原Responses及本轮Root Anthropic E2E历史证据保留，最终共同输入包含这项测试维护。全部28票55AC、DAG与用户现场后验不变。


## G2 代码门接纳（LOG-117）

T10及原T01/T02/T08共同候选已在2a649a6c…c1b4固定输入经Root新构建CLI代码E2E和121独立双轴pass。正式门见evidence/T-10-logs/code-gate-anthropic-r1.json；与Chat r2/Responses r1共同满足G2本轮代码验收。T27仍partial，G3/后续28票55AC继续。123/124仅只读补具体消费者合同，不取代T14及UI实施；真实Provider/Obsidian/目标OS用户后验。


## Map31 / Goal30 记忆实施

Root已核123/124报告、实际工件/来源与原生交回，准备接纳回执分别123/124-lead-return.json。采用115长期路线与123短期Plan/Seal/真实context投影，T14激活、T01/T03原owner先维护唯一纯合同；精确边界见evidence/T-14-logs/memory-window-map31.md。125/126须实际校验并派遣后开工。其他必要消费者由原owner随后开窗，当前不把准备或接口当产品通过。124的activeRun/enable/群reanchor请求排在原UI集成前；全28票55AC持续，现场由用户后验。


## Map32 / Goal31 记忆消费者

126实际依赖的MemoryFacts/维护预算由128原credential_provider先定义唯一adapter契约，再接T04/T05/T11/T12/T13真实消费者。125原纯合同、126本域、127原TS byte校验写集保持；当前125独占检查窗，其余初始只读。Root逐阶段协调014/装配/共同Engine，不把接口当实现通过，最终共同门覆盖当前资格/费用/传播与实际物理投递。全28票55AC与用户现场后验不变。


## Map33 / Goal32 记忆运行消费者

129原foundation_go接默认Core/014注册、同Executor维护、Plan/Seal、真实上下文及恢复/配置引用；130原engine_adapter接common模型块与Checkpoint绑定。精确窗口见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/memory-runtime-map33.md</Path>。125完成前仅准备，实际写入/检查按Root单一窗口；当前不签新共同门。


## Map34 / Goal33 独立校验窗口

127生产TS/限定Node检查与128 Go数据库组件窗口按真实无交叉输入细分；125公共协议保持只读。边界见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/independent-ts-go-window-map34.md</Path>；默认Core跨语言总验收及其他公共检查继续Root串行。

## Map35 / Goal34 共同Engine组件窗口

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/common-component-window-map35.md</Path> 细分130唯一Go组件检查与126/129闭包外源码写入；必须先实际确认Go闭包，再执行真实SDK行为红。任何公共输入变化或Core/SQL组合检查回Root串行冻结。127已有检查与Root新红均保留，131待空槽补最小修复。28票55AC继续，不改变用户真实操作后验边界。

## Map36 / Goal35 记忆清单接缝

130组件与131客户端修复已按实际输入接纳，仍不代表T14共同门。132先补合法维护旧scope所需的纯manifest绑定；129保留未完成checkpoint，126/128继续source-only。详见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/manifest-helper-window-map36.md</Path>。后续仍完成全部28票55AC。

## Map37 / Goal36 历史与运行接线

126首次20源Hooks已交回source checkpoint，132纯helper稳定后进入133组件独立审查；134原owner消费真实HistoryMemory、ContextUsage和DeriveMaintenance接缝并接续129全部剩余验收。窗口见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/history-runtime-window-map37.md</Path>。组件结论不替代T14联合门，继续全部28票55AC。


Map38/Goal37：首轮完整Go回归原红已保留；143归原T14诊断实际长历史失败，144归T01/T03/协议/恢复测试消费者维护，145归原授权/协作/群消费者测试维护。只读或闭包外测试源码可并行，Go检查按真实编译输入串行授权。原G2代码证据在旧输入下保留，当前T14共同门未通过。完整28票55AC与用户代码层交付授权持续。

Map39/Goal38：143 单变量祖先累加修复通过原50Run及真实800来源，144消费者测试迁移交回；145两个真实waiting补充消费者仍红。146原T01/T03与147原Engine owner按精确恢复包合同维修实际漏正文，不改初始CP前缀，不以旧字段测试兼容代替模型可见性。先145完全归窗，再冻结纯DTO合同，两作者源码分离、所有Go检查串行。详见evidence/T-14-logs/resume-inbox-window-map39.md；T14共同门及后续T15–28继续，真实操作用户后验。


## Map40 / Goal39 全局记忆实施

T14最终完整代码候选及原owner维护已通过159双轴和Root代码验收；原失败/未知原因/用户现场后验保留。T15激活，原T01 owner先完成唯一纯合同。精确阶段与写集见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-15-logs/global-window-map40.md</Path>。其余全部28票55AC持续，G3和完整Goal尚未完成。


## Map41 / Goal40 全局事实与投递消费者

161/162由原Memory与权限事件owner分别接原014事实/联合召回和当前物理投递门；160仅api+stdlib真实闭包允许与两者source-only分离。详见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-15-logs/global-consumers-map41.md</Path>。共享DB/Go组合待源码稳定由Root开窗，完整目标继续。


## Map42 / Goal41 全局提案事务与owner入口

160四源/27输入纯合同已Root接纳，161指出pending metadata-only owner delete需最小验证修正。163由同API owner完成015提案业务、独立owner/proposer能力、T01装配与真实用户入口；161/162仍独占本域源码。详见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-15-logs/global-main-map42.md</Path>。共同Go/DB验证仍待组合冻结，T15与完整Goal未完成。


## Map43 / Goal42 TS全局结果消费

Root作为T01原实施owner在唯一TS窗口维护core/protocol/method-validation.ts与新增global-memory-validation.test.ts，补与160/163一致的提案状态/正文/目标和页面互斥。准确窗口见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-15-logs/global-ts-map43.md</Path>。163生成器待Root协调；纯Node与Go source-only分离，全功能共同门仍待。
