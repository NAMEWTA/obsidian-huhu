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

计划修订：1；输入 Tickets Map `plan_revision: 2`；规划日期：2026-10-25。用户 LOG-045 要求生成本计划，并允许后续调用 Agent Team：实现优先 `gpt-6.1-sol / xhigh`，独立审查优先 `gpt-6-astra / high`。本轮模式为 `plan`，规划交付完整；尚未授权或启动产品实施。

- **总控入口：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>；单票依赖、写集、状态与执行 owner 以原 Ticket 为准。
- **行为与设计：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path>；只实现已确认的 UI-001/final。
- **研究与核验：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-planning-validation.md</Path>。

## 1. Outcome and Authority

### Outcome

在 HUHU 现有 Obsidian 工作台内交付完整 P1：多 Bot 身份与单聊/群聊、协调者和显式 @、已有/临时 Agent 的发现通信派遣与受控再委派、隔离记忆、三种模型协议、资料授权、单笔记审批写入、可靠持久运行/恢复、永久清除、portable 和受管原生运行。Go Domain/Application/Adapter 分层及统一 Application API 支持未来 Web 复用。计划包含原 28 张 Ticket 与全部 55 项 AC；用户没有指定票数，不缩减为单助手版本。

### Success and False Completion

整体成功以 Spec AC-001–055、每票适用验证、最终固定输入的独立双轴审查和真实宿主主路径证据为准。Mock、SDK 具备接口、原型已选中、交叉编译成功、worker 自报完成或 28 张票都标 done，均不能单独证明整体交付。P0 探针嵌入对应实现票，必须转化为可验收实现与锁定合同。

### Non-goals

范围沿用 Spec IN/REUSE/OUT；不加入 Web/HTTP 上线、独立常驻、全库默认索引、任意 shell/MCP、跨设备同步或 CLI Agent 重构。本计划中的 Agent Team 是研发协作安排，与产品内 Bot/子任务的运行限制分别管理。本次交付到文档落盘和计划检查为止；发布、提交、远程写入与永久知识更新不纳入本次完成条件。

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

代码规划基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`，当前分支 `main`；工作区已有用户修改和其他 change。首次实施前重新测量实际输入；当前代码尚无 `native/huhubot`、`src/modules/huhubot`、`contracts/hap` 的本计划实现。输入摘要见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-inputs.json</Path>；原附件、历史日志与批准快照保持原字节/历史事实，不按本计划追改。

## 2. Execution Graph

### DAG and Critical Path

完整边来自 Ticket `blocked_by`，Map §3 为其投影。以下是当前无环图的一条最长依赖链，不是工期估计；T-22 可换成 T-23/24/25 的同深汇合分支。

```text
T-01 → T-02 → T-03 → T-06 → T-11 → T-12 → T-13 → T-16
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
| W3 协作与恢复 | T-12 → T-13 → T-16 | T-11、事件和 T-07 分支；消息/预算/群路由/调用树恢复 | collaboration、groups、recovery；准入与来源语义窗口串行 | G1；关闭后才放行 T-08 |
| W4 真实引擎与记忆 | T-08 → T-09 / T-10 / T-14；T-14 → T-15 | T-08 独立真实协议闭环；其他协议与私有/全局记忆分支 | Eino adapter 与 memory；Engine 合同、额度、schema 冲突串行 | 三协议汇入 G2；记忆分支汇入 G3，互不制造额外等待 |
| W5 数据与运行集成 | T-17 → T-18 → T-19 → T-20 | 按各票依赖；删除/导入/升级证据后接模块启停、安装 | data/maintenance、TS runtime、显式装配；装配归 T-20 | G3 放行 T-20；测试消费者先验证生命周期，实际页面由 T-21/22 提供 |
| W6 完整用户任务 | T-21 → T-22 / T-23 / T-24 / T-25；T-26 在 T-20 后独立推进 | T-21 同时需要三协议和运行集成；六页面及固定负载测量 | UI 自有页面/词典/样式与 diagnostics；宿主实例、构建窗口串行 | UI 汇入 G4；测量汇入 G5 |
| X 共享构建与平台 | T-27 | 现有工程准备无前置票；Go 子步骤等待 T-01；等待最终输入时释放 writer | 根依赖/构建/main.js/styles.css/notices/工程规则仅 T-27 | 为前述各票提供集成窗口；G5 验收前收齐 T-01–26 最终输入 |
| W7 整体交付验收 | T-28 | 原票全部依赖有效，G2–G5 闭合 | 产品验收脚本/夹具；Lead 固定全量实际输入 | G6；最终组合审查、真实宿主结果与55 AC归集 |

**可以调用 Agent Team。** 例如 T-03 与 T-05、T-04 与已有依赖满足的 T-07 可在精确写集和资源分离后合作；T-22 与 T-24 可分别实现页面。相同 `resource_claims` 默认串行，只有证明资源实例与读写窗口可分离并先更新原票/Map 合同时才细化并行。T-09/T-10 共用 Engine 合同和真实 Provider 额度，不因文件不同就同时启动；真实宿主验收始终由 Lead 协调。

### Shared Ownership and Completion Boundaries

| 共享表面 | 唯一写入责任 | 消费者与恢复 |
| --- | --- | --- |
| HAP schema/生成类型、Application API、TS api.ts、go.mod/go.sum、全局迁移顺序 | T-01 | 消费者提交精确变更请求；owner 更新并回归受影响接缝 |
| 模块/设置/导航注册、i18n 聚合、Go bootstrap/modules.go | T-20 | 页面拥有自有组件，入口由 owner 集成；禁止平行装配机制 |
| 根依赖、构建产物、样式注册、许可、现行 docs 与 dev/ui 规则 | T-27 | build 前停相关源码 writer；记录实际输入；Skill 变化重绑受影响票并重审相应 Evidence |
| change 正式状态、Evidence、Gate、README Outcome | 原 Lead | worker 交候选，Lead 核对再写正式事实；不创建另一份任务状态库 |

T-27 的 `blocked_by: []` 只允许先准备现有构建/共享 owner 窗口；Go 子步骤等 T-01 的真实产物验收，G5 是全票完成条件。此安排解决 T-01 需要共享构建而 T-27 又等待 T-01 的循环，不把后续消费者加入 T-27 开始依赖。准备工具后逐切片集成；等待时没有活跃写入者，但若票处于 in_progress/review，仍计入活动票数。不得提前把 T-27 标 done 后继续无记录地写共享产物。其他已验收 owner 因后续请求修改共享合同，先使受影响证据失效、按 I 恢复维护和验收；原职责不转让给消费者，也不自动让无关分支失效。

### Ticket Quick Reference

下列 Evidence 是实施时由 Lead 生成的目标路径，当前未创建实施记录。每票开始条件为 G0＋原 `blocked_by` 的有效完成证据＋本票 DoR/owner/资源；工作区均引用 README 既有 current 选择；验证层级和失败恢复回读原票。这里只导航，不复制状态和验收结果。

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
| G0 执行入口 | 计划已落盘；补齐 P 浏览器技术材料并获产品实施指示 | P preview/ready、S readiness、当前 Map/Ticket/Skill/工作区复核、实际实现授权与初次 Execution Context | 当前整个 change 的派单 | Lead；设计已由用户 LOG-040 批准 | 保持 draft/false；只补缺失技术事实，不重问 final 选择 |
| G1 受控执行底座 | T-01–07、T-11–13、T-16 对应依赖完成 | 真实 HAP/SQLite、幂等/事件、逐跳来源、Host 写/回执丢失、预算/取消/重启故障证据；fake Engine 与同一用例接通 | T-08 及依赖闭包；其他基础准备可继续 | Lead 核验 S1/S2/S3/S5/S6 | 定位失败票/事务窗口；保留 unknown 原证据，修复后仅重验闭包 |
| G2 三协议对等 | T-08/09/10 各自可验证 | 各协议真实流式、工具审批/拒绝、取消/恢复、usage/error；准确版本与目标，无静默协议回退 | T-21、T-28；T-14 只需 T-08，不等待另两协议 | Lead 核验 S4 | 暂停失败协议分支；adapter 内修复；合同降低回用户 |
| G3 数据与记忆完整性 | T-14–19 对应依赖完成 | 私有隔离/自动维护、全局确认、forget 迟到作业、删除传播/最小安全记录/代数、portable 冲突、备份迁移和坏库恢复 | T-20 与数据消费者；其他协议分支可继续 | Lead 核验 S1–S4/S6 | 一次性 Profile 留现场；核查后恢复；不靠空库或复活被删数据通过 |
| G4 宿主与唯一界面 | T-20–25 各票依赖和原型门满足 | 实际 Obsidian 的六页面、leaf/Portal、键盘/状态、审批/资料/恢复/清除；根/子任务身份与最终数据一致 | T-28；不阻塞独立 T-26 或平台准备 | Lead 核验 S6/S8 与 Design Conformance | 回对应用例或 UI owner；设计改动回 P，不混入其他候选 |
| G5 最终构建与平台 | T-01–26 生产输入已固定；T-26 测量完成，T-27 收齐消费者 | 对同一输入构建、许可/包体/i18n/边界/Skill 更新记录；每个声明支持 OS/架构真实启动/TLS/DB/凭证/关闭；测量样本/阈值与结果 | T-27 完成与 T-28 开始 | Lead；共享写入由 T-27 | 失败归属具体源票，修复/重建/重验影响范围；未通过目标不列支持 |
| G6 产品整体完成 | T-28 原依赖有效且 G2–G5 闭合 | 从附加资料/建群/委派/审批写，到崩溃恢复/记忆/清除的真实主路径；55 AC 归集、最终组合双轴审查、无未决高影响差异 | Goal/README Outcome 完成 | Lead | 保留完整快照与反例，返回源票；修复后重新核验受影响整体接缝 |

本表定义验收门而非重复 Ticket 状态。当前 G0 待满足，其余 Gate 尚未执行。技术缺口按 <Path>{roots.workflows}/specdev/specdev-p-prototype/SKILL.md</Path> 的原要求处理：“设计绑定、批准、浏览器证据与源码全门通过后才设置 ready”。用户 LOG-036 选择自行验证，现有 LOG-040 只有设计确认；本计划不新增浏览器替代方式或伪造技术记录。

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

**执行入口：** 后续用户明确要求实施且 G0 关闭后，调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>。Lead 与 worker 按 Map → 适用项目 Skill → 当前 Ticket 调用真实 dev/ui；每票 `skill_bindings` 的 ID、摘要、输入、输出和失败动作继续有效。研究先行与模型偏好不替代实施、独立审查及证据合同。

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
| Dispatch | `execution-time dynamic` | 票开始时确认真实执行者、模型与可用性；本次不预建/调用团队 |

用户给的是优先选项；执行时优先按上述模型派单，记录真实 model/effort。若不可用，说明原因并记录可用替代和实际安排，不冒称使用指定模型；不自动安装服务或切换外部账户。独立性是硬约束：实现者不能通过换模型、改名或新会话审查自己的改动；没有合格独立 reviewer 时仅阻塞相应审查与完成，不能由实现者自审替代。无需为同一已明确的团队偏好逐票再询问。

推荐的任务闭环是 **Lead 分配 → 实现 worker 交候选 → 未参与实现的 Astra reviewer 双轴审查 → 原实现者修复 → reviewer 核验受影响范围 → Lead 验收**。可由一名独立 reviewer 覆盖两轴，不强制固定多个角色。最终组合审查必须覆盖实际最终交付；若某 reviewer 后来写了实现，应重新选择不具作者冲突的人。

### Dynamic Dispatch Packet

每次原生委派使用真实工具句柄，发送可独立理解的简报：当前 Goal 修订及摘要、Map revision、Ticket/AC、已满足 Gate/依赖 Evidence、工作区与不可变基线、允许写集/共享 owner、必调 Skill、研究结论、实际验证/停止条件和候选返回位置。不要假定 worker 自动看到了本对话；需模型覆盖而使用独立上下文时显式传入这些材料。

实现者只执行分配的 Ticket/子任务和写集，不接管其他票、正式状态或原 Gate。审查者收到同一冻结候选及两个轴所需来源，默认只读产品文件。外部派遣仅在后续明确选择外部方式时按共享 TASK v2 保存交接；当前不制造外部 session。返回内容包含实际作者/模型、变更路径、快照、命令/退出码、未验证项、findings/blocker 和下一安全动作；Lead 回读后再更改正式事实。

### Change Workspace and Verification

沿 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 的 current 选择，所有执行者复用 `/home/wta/projects/obsidian-huhu`。本次只是规划，不创建 implementation worktree、Execution Context 或 Workspace Execution Record。真正进入 I 时，Lead 在 README 的 `Execution Context` 记录一次实际工作区/base/branch/owner；每票 Evidence 引用它，另记真实实现者、固定快照、Skill 调用和验证。工作副本快照可固定未提交产物，不要求每票 commit。

票级验证按原票接缝运行；Lead-owned E2E 在稳定工作区上执行。冻结前确认相关 writer 已停，记录实际源/依赖/构建/配置/样本/模型/OS/设计摘要。单票 review 可冻结其相关范围；全局 build、共享依赖、真实 Obsidian 实例、最终组合 review/E2E 使用串行窗口。不得暂存、覆盖或回滚本任务外的 `.gitignore`、AGENTS.md 用户改动及其他 change；T-27 将来获分配 AGENTS.md 相关更新时先保留已有用户差异，再做最小改动。

### Authorization Matrix

| 动作 | 当前状态 | 目标与条件 |
| --- | --- | --- |
| 本 change 的 Goal/Ticket/参考文档维护与静态检查 | allowed | LOG-042/045；本轮仅执行此范围 |
| Change workspace implementation | not-authorized | 用户后续明确实施本计划，且 G0/逐票 DoR 通过后连续推进 |
| 原生 Agent Team 实施与 review 安排 | 计划偏好已确认，尚未派遣 | 随已授权实施按本节动态调用，无需重复确认团队偏好 |
| Change worktree creation | not-requested | 复用 current，不从并行推导新 checkout |
| Change workspace verification | 文档静态检查 allowed；产品验证尚未启动 | 后续在实施范围内按票验证；真实模型目标/凭证/额度和一次性测试数据先确认可用 |
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

本次 plan 产物完成；G0 待满足，其余 Gate 尚未执行。Goal 保持 `draft / ready_for_execution:false`。单票状态仅查原 Ticket，当前控制结果及文档核验见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-planning-validation.md</Path>；不创建实施 Evidence、不宣称模型或产品测试已经通过。

### Pending Decisions and Blockers

当前无新的产品取舍需要询问。已有 final 和 Agent Team/模型偏好沿用。执行前待补：实际浏览器技术记录→P/S Ready；用户明确产品实施指示；首次派单时的工作区/owner/Skill 复核。真实协议的 endpoint/model/安全凭证与额度、拟支持平台的环境在对应验证前落实，记录于原票，不现在编造具体值或请求用户粘贴密钥。

### Resume Protocol

恢复先读 README→本计划修订与输入摘要→Map revision→当前 Ticket/依赖 Evidence，再核对实际工作区/branch/base、活动 writer、Skill 与未决副作用。G0 未满足时只推进获授权的文档/补证工作；就绪并获实施指示后由 I 进入真实 frontier，分配 owner 后开始首票。后续同范围实现、审查、修复和下一 Ready 票连续推进，不逐票等待“继续”。任何 dispatch 结果不明先核查原 writer/事务，不能直接再派同一副作用；没有新证据时保留检查点并停止空转，不承诺后台运行。

## Assumptions

用户“可以使用”的两组模型按优先偏好记录，实际工具以派单时可用性为准。current 工作区与完整 P1 范围均沿既有决定；具体实现者、支持平台和 Provider 实例没有假定已就绪。缺少执行授权与 P 技术事实已列 G0，因此 `ready_for_execution` 必须为 `false`。

## Execution Policy Source

- 用户 LOG-045 明确要求 Goal Plan、可调用 Agent Team、实现 `gpt-6.1-sol / xhigh` 与 review `gpt-6-astra / high`；LOG-042 固定陌生功能先研究和全部文档对齐。
- <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path>：默认 auto、current，验证失败复盘缺省 3 次；只在明确要求时写票数/人数上限。此次未发现 <Path>{roots.state}/specdev/config.json</Path> 或 <Path>{roots.state}/coordination/project.json</Path>，没有创建配置或虚构限制。
- <Path>{roots.workflows}/specdev/common/rules/coordination.md</Path> 与 <Path>{roots.references}/coordination/coordination-contract.md</Path>：宿主原生团队、同一工作区、固定输入、未参与实现的独立双轴 reviewer、Lead 维护正式事实。实际平台限制在派单时核对，不把当前临时槽位固化为项目规则。
- 唯一工作区选择导航到 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path>；本计划 v8 及当前 schema 为结构依据。计划与实现授权分别核对，本轮没有启动 runtime Goal 或产品执行。
