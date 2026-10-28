---
schema_version: 3
plan_contract_version: 1
plan_revision: 43
requested_deliverables: []
deliverable_policy: "用户要求完整最终 Tickets 与全 change 对齐，未指定票数；按全部 55 AC 拆为 28 个可验收单元，无延后或删减 P1 范围"
artifact: "tickets-map"
change: "2026-10-25-huhu-bot-architecture"
status: "ready"
---

# Tickets Map：HUHU Bot 完整首版

- **Spec / 设计：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path>。
- **Goal 编排：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path> — Wave/Gate、Agent Team 模型偏好、授权与恢复唯一入口；本 Map 保持单票总控导航。
- **执行票 / Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/</Path>。
- **参考 / 计划审查：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/tickets-planning-validation.md</Path>。

当前交付边界以 LOG-051 的最新 Goal 为准：完成全部 P1 代码、适用代码层检查和独立代码审查；真实模型、Obsidian 界面及用户环境的实际操作由用户后续验收。原产品行为/AC 不删减，未运行项如实记录且不阻塞本轮代码交付。

## 1. 目标与拆分策略

用户 LOG-042 授权完整规划，LOG-047 进一步授权全面产品实现、验证和 Agent Team；未请求提交或发布。全部票共同交付首版多 Bot、群聊与同引擎协作、三协议、自动私有/确认全局记忆、资料权限、审批写入、持久恢复与永久清除。55 AC 全覆盖，无隐式 MVP 缩减。

以可观察行为切片。T-01 是有真实启动/持久读取/跨进程消费者的必要基础合同；其他核心票均跨领域/用例/adapter/验证，UI 票以稳定用例形成真实用户任务。T-27 拥有共享构建/规则集成，T-28 建立产品跨边界验收工具，不为每个检查单造一张票。不存在需要先改造 CLI Agent 的 Prefactor。

新增模块采用 expand（独立模块/API/Profile）→ integrate（显式装配/投影/宿主）→ verify；不迁移现有 CLI 历史，不收缩旧模块或删除测试。Profile schema 升级的 expand/backup/migrate/verify/contract 由 T-19 拥有。

**当前开工口径（LOG-051）：** 用户授权完整代码先行与代码层总验收；所有票仍按实际依赖和写集执行。LOG-049 的后端/UI 分支门作为历史保留，P 的新原型摘要与旧批准不混用，Spec/Goal 的历史 draft/false 不再阻止本次已授权代码工作。真实操作仅列用户待验，不伪造通过。

### 总体实施背景

基线 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`。当前是 TypeScript/React Obsidian 插件和 Rust PTY，无 Bot Go Runner。ModuleRegistry、ServiceKey、ReactSurface、Vault API、lazy manifest、token/i18n 与构建检查复用；`agent` 私有代码不跨模块导入。Go 模块在 native/huhubot，TS 客户端在 src/modules/huhubot，wire 在 contracts/hap/v0.1，均是规划路径。

领域不依赖 SQL/SDK/Obsidian；Application API 是统一业务入口；HAP DTO、SQLite Row、Engine 消息与 React 投影分别转换。六上下文仍共用一库/UoW，跨域用例只持短事务。持久 Bot/会话/委派/Run 分开，Leader 没额外权限，临时执行不自动变持久身份。未来 Web 只保留可替换入站接缝，P1 不开网络 listener。

当前 dev 的库内存储规则与 ui 的 zustand 持久状态描述针对已实现模块。Bot 的库外 Profile 和客户端投影例外已由 ADR-003/020 获准；T-27 在真实功能集成时更新当前规则和数据文档。本轮不提前把规划写成已实现，也不要求执行者违反旧规则猜设计。

真实现有接缝：src/app/manifests.ts、src/app/contracts/module.ts/workbench.ts、src/app/settings/nav.ts、src/shell/navigation-state.ts/icon.tsx、scripts/module-strings.ts；原生参考 src/modules/agent/platform/desktop/pty/binary.test.ts 与 src/host/desktop/private-mode.test.ts；宿主参考 scripts/obsidian-acceptance/workbench-probe.mjs；工程检查 package.json/scripts/test/release。新路径在各票明确为待创建。

### 项目 Skill 读取矩阵

Lead 与实现者先完整读 Map，再读适用项目 Skill，最后读当前 Ticket；矩阵是最低集合，不是 allowlist。按真实变更范围发现其他入口时先同步 Map/Ticket。扫描范围与摘要保存在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/skill-scan.json</Path>，当前工程规则重绑记录见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/skill-rebind-20261025.json</Path>；已扫描 14 个项目 Skill 入口，工作流路由不冒充项目工程规则，没有编造 Go 专用 Skill。

| Applies To | Project Skill | Trigger / Scope | Read Timing | Purpose |
| --- | --- | --- | --- | --- |
| ALL | <Path>.agents/skills/dev/SKILL.md</Path> | 新模块/原生代码、持久化、依赖、验证、构建与工程文档 | Map 后、当前 Ticket 前；实现及验证实际调用 | 边界、生命周期、i18n、许可、产物与风险验证 |
| T-20, T-21, T-22, T-23, T-24, T-25, T-27, T-28 | <Path>.agents/skills/ui/SKILL.md</Path> | 页面/导航/控件/样式、生成 UI 资产或宿主 UI 验收 | dev 后、本票前；界面实现与检查时 | 继承 final、主题/叶子/Portal/键盘和真实宿主 |

## 2. 执行清单

| ID | Ticket 与可观察产物 | 跨票 Gate/依赖导航 |
| --- | --- | --- |
| T-01 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/01-runner-profile-contract.md</Path> — 可启动、可重连的 Profile Runner 与公共合同 | 基础入口；见 §6 |
| T-02 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/02-bot-model-credentials.md</Path> — 持久 Bot、配置修订与受保护模型凭证 | T-01；见 §6 |
| T-03 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/03-durable-chat.md</Path> — 单聊意图原子受理、历史与可靠终结 | T-01, T-02；见 §6 |
| T-04 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/04-durable-events.md</Path> — 持久事件续读与撤权后的客户端清理 | T-03；见 §6 |
| T-05 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/05-sources-grants-host.md</Path> — 明确附加资料、逐跳授权与 Host 资料能力 | T-01, T-02；见 §6 |
| T-06 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/06-approval-broker.md</Path> — 受控写工具、审批与 Checkpoint 原子发布 | T-03, T-05；见 §6 |
| T-07 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/07-note-write-reconcile.md</Path> — 单笔记写入与回执丢失核查 | T-05, T-06；见 §6 |
| T-08 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/08-engine-chat-completions.md</Path> — OpenAI Chat Completions 真实工具与恢复闭环 | T-02, T-03, T-05, T-06, T-07, T-12, T-16；见 §6 |
| T-09 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/09-engine-responses.md</Path> — OpenAI Responses 对等工具、取消与恢复 | T-08；见 §6 |
| T-10 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/10-engine-anthropic.md</Path> — Anthropic Messages 对等工具、取消与恢复 | T-08；见 §6 |
| T-11 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/11-delegation-directory.md</Path> — 发现 Bot、派遣已有或临时执行与创建提案 | T-02, T-03, T-05, T-06；见 §6 |
| T-12 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/12-messages-limits-budget.md</Path> — Bot 通信、受控再委派与调用树预算 | T-02, T-03, T-05, T-06；T11合同先冻结，两票联合验收；见 §6 |
| T-13 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/13-groups-routing.md</Path> — 群聊协调者、显式提及与成员撤销 | T-04, T-11, T-12；见 §6 |
| T-14 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/14-private-memory.md</Path> — 隔离上下文与 Bot 自动私有记忆 | T-03, T-05, T-08, T-11, T-12；见 §6 |
| T-15 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/15-global-memory.md</Path> — 全局记忆提案与用户确认事务 | T-14；见 §6 |
| T-16 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/16-cancel-recovery.md</Path> — 调用树取消、崩溃核查与用户恢复 | T-07, T-12, T-13；见 §6 |
| T-17 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/17-permanent-purge.md</Path> — 正文清除、来源传播与 Profile 永久删除 | T-07, T-13, T-14, T-15, T-16；见 §6 |
| T-18 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/18-portable-import-export.md</Path> — 可预览的 Bot、记忆和会话 portable 迁移 | T-13, T-15, T-17；见 §6 |
| T-19 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/19-profile-upgrade-backup.md</Path> — Profile 一致备份、迁移与坏库恢复边界 | T-17, T-18；见 §6 |
| T-20 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/20-module-runtime.md</Path> — Bot 模块独立激活、受管安装与完整退出 | T-01, T-02, T-03, T-16, T-19；见 §6 |
| T-21 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/21-chat-ui.md</Path> — 唯一 final 的 Bot 名册、单聊与群聊主路径 | T-04, T-05, T-08, T-09, T-10, T-13, T-20；见 §6 |
| T-22 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/22-agent-group-ui.md</Path> — Bot 配置与群成员管理界面 | T-02, T-13, T-20, T-21；见 §6 |
| T-23 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/23-tasks-access-ui.md</Path> — 任务关系、写入审批与资料权限界面 | T-05, T-06, T-07, T-12, T-16, T-21；见 §6 |
| T-24 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/24-memory-ui.md</Path> — 私有、短期与全局记忆管理界面 | T-14, T-15, T-21；见 §6 |
| T-25 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/25-data-ui.md</Path> — 删除预检、Profile 清除与 portable 交互 | T-17, T-18, T-19, T-21；见 §6 |
| T-26 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/26-diagnostics-performance.md</Path> — 脱敏诊断、运行耗用与固定负载测量 | T-04, T-12, T-16, T-19, T-20；见 §6 |
| T-27 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/27-build-platform-notices.md</Path> — Go 资产构建、许可覆盖与平台启动验证 | 无前置票；Go 子步骤等待 T-01；见 §6 |
| T-28 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/28-product-integration.md</Path> — 完整产品主路径与跨边界回归验收 | T-08, T-09, T-10, T-21, T-22, T-23, T-24, T-25, T-26, T-27；见 §6 |

状态、Ready、执行 owner、深度、风险、Skill 摘要和写集仅由各 Ticket frontmatter 拥有，不在 Map 复制运行状态。可观察交付详见票的目标/AC；当前实施状态和可复验记录回读原票/Evidence。

## 3. 依赖 DAG

每行 `下游 <- 上游` 表示真实开始条件；同层不是并行承诺，仍检查写集与语义资源。T-27 可先基于现有工程准备共享构建/许可窗口，Go 子步骤等待 T-01 实际产物验收；持有共享文件并接受后续切片集成，完成时必须基于最终生产输入并通过 Goal G5；T-28 是最终汇合点。

```text
T-01 <- (无前置 Ticket)
T-02 <- T-01
T-03 <- T-01, T-02
T-04 <- T-03
T-05 <- T-01, T-02
T-06 <- T-03, T-05
T-07 <- T-05, T-06
T-08 <- T-02, T-03, T-05, T-06, T-07, T-12, T-16
T-09 <- T-08
T-10 <- T-08
T-11 <- T-02, T-03, T-05, T-06
T-12 <- T-02, T-03, T-05, T-06
T-13 <- T-04, T-11, T-12
T-14 <- T-03, T-05, T-08, T-11, T-12
T-15 <- T-14
T-16 <- T-07, T-12, T-13
T-17 <- T-07, T-13, T-14, T-15, T-16
T-18 <- T-13, T-15, T-17
T-19 <- T-17, T-18
T-20 <- T-01, T-02, T-03, T-16, T-19
T-21 <- T-04, T-05, T-08, T-09, T-10, T-13, T-20
T-22 <- T-02, T-13, T-20, T-21
T-23 <- T-05, T-06, T-07, T-12, T-16, T-21
T-24 <- T-14, T-15, T-21
T-25 <- T-17, T-18, T-19, T-21
T-26 <- T-04, T-12, T-16, T-19, T-20
T-27 <- (无前置 Ticket；Go 子步骤等待 T-01，完成门见 Goal G5)
T-28 <- T-08, T-09, T-10, T-21, T-22, T-23, T-24, T-25, T-26, T-27
```

T-08 依赖 T-12 的调用前预算准入和 T-16 的取消/恢复用例，避免第一条真实模型接入时存在收费或恢复旁路；T-16 先用 fake Engine 验证树恢复，T-14 后续把记忆作业接入同一合同；T-09/T-10 只复用 T-08 的稳定 Engine 合同，各自拥有协议实现/证据。T-14 的自动维护使用同一预算/模型路径。UI 消费已稳定的用例，并不承担另一套业务状态机。

## 4. 合同覆盖矩阵

主责 Ticket 负责收齐该 AC 的各必需接缝；其他列中的票是局部实现/验证 owner，不是互相替代的重复通过。`covered` 表示已纳入计划，绝非验收已通过；没有 deferred。

| Contract ID | 覆盖 Ticket | 验证接缝 | 状态 | 说明 |
| --- | --- | --- | --- | --- |
| AC-001 | T-20；T-21, T-28 | S6/S8 | covered | 主责 T-20；按各票覆盖的实际接缝合并证据 |
| AC-002 | T-02；T-11, T-22 | S1/S2/S8 | covered | 主责 T-02；按各票覆盖的实际接缝合并证据 |
| AC-003 | T-02；T-22 | S1/S2/S4 | covered | 主责 T-02；按各票覆盖的实际接缝合并证据 |
| AC-004 | T-02；T-22 | S1/S2/S8 | covered | 主责 T-02；按各票覆盖的实际接缝合并证据 |
| AC-005 | T-03；T-21, T-28 | S2/S3/S8 | covered | 主责 T-03；按各票覆盖的实际接缝合并证据 |
| AC-006 | T-13；T-21, T-28 | S1/S2/S4/S8 | covered | 主责 T-13；按各票覆盖的实际接缝合并证据 |
| AC-007 | T-13；T-21, T-28 | S1/S3/S8 | covered | 主责 T-13；按各票覆盖的实际接缝合并证据 |
| AC-008 | T-13；T-22 | S1/S2/S3 | covered | 主责 T-13；按各票覆盖的实际接缝合并证据 |
| AC-009 | T-11 | S1/S3/S4 | covered | 主责 T-11；按各票覆盖的实际接缝合并证据 |
| AC-010 | T-11 | S1/S2/S4 | covered | 主责 T-11；按各票覆盖的实际接缝合并证据 |
| AC-011 | T-11 | S1/S2/S4/S8 | covered | 主责 T-11；按各票覆盖的实际接缝合并证据 |
| AC-012 | T-12 | S1/S2/S4 | covered | 主责 T-12；按各票覆盖的实际接缝合并证据 |
| AC-013 | T-12 | S1/S2/S4 | covered | 主责 T-12；按各票覆盖的实际接缝合并证据 |
| AC-014 | T-12 | S2/S4 | covered | 主责 T-12；按各票覆盖的实际接缝合并证据 |
| AC-015 | T-12；T-28 | S1/S2/S8 | covered | 主责 T-12；按各票覆盖的实际接缝合并证据 |
| AC-016 | T-16；T-23 | S1/S2/S4/S5 | covered | 主责 T-16；按各票覆盖的实际接缝合并证据 |
| AC-017 | T-16；T-23, T-28 | S2/S4/S6 | covered | 主责 T-16；按各票覆盖的实际接缝合并证据 |
| AC-018 | T-14；T-24 | S1/S4 | covered | 主责 T-14；按各票覆盖的实际接缝合并证据 |
| AC-019 | T-14；T-24, T-28 | S2/S4/S8 | covered | 主责 T-14；按各票覆盖的实际接缝合并证据 |
| AC-020 | T-15；T-24, T-28 | S1/S2/S8 | covered | 主责 T-15；按各票覆盖的实际接缝合并证据 |
| AC-021 | T-14；T-24 | S1/S2/S4 | covered | 主责 T-14；按各票覆盖的实际接缝合并证据 |
| AC-022 | T-05；T-14, T-15, T-23, T-24 | S1/S3/S4 | covered | 主责 T-05；按各票覆盖的实际接缝合并证据 |
| AC-023 | T-08；T-09, T-10, T-22, T-28 | S4 | covered | 主责 T-08；三协议 T-08/09/10 均须独立证据，T-28 产品汇合 |
| AC-024 | T-05；T-23, T-28 | S4/S5/S8 | covered | 主责 T-05；按各票覆盖的实际接缝合并证据 |
| AC-025 | T-06；T-07, T-23, T-28 | S2/S5/S8 | covered | 主责 T-06；按各票覆盖的实际接缝合并证据 |
| AC-026 | T-07；T-23 | S2/S5 | covered | 主责 T-07；按各票覆盖的实际接缝合并证据 |
| AC-027 | T-03；T-11 | S2/S3 | covered | 主责 T-03；按各票覆盖的实际接缝合并证据 |
| AC-028 | T-06 | S1/S2/S4 | covered | 主责 T-06；按各票覆盖的实际接缝合并证据 |
| AC-029 | T-07；T-23, T-28 | S2/S5/S8 | covered | 主责 T-07；按各票覆盖的实际接缝合并证据 |
| AC-030 | T-04 | S2/S3 | covered | 主责 T-04；按各票覆盖的实际接缝合并证据 |
| AC-031 | T-04；T-23, T-28 | S2/S3/S8 | covered | 主责 T-04；按各票覆盖的实际接缝合并证据 |
| AC-032 | T-03 | S2/S6 | covered | 主责 T-03；按各票覆盖的实际接缝合并证据 |
| AC-033 | T-20；T-16, T-28 | S6/S8 | covered | 主责 T-20；按各票覆盖的实际接缝合并证据 |
| AC-034 | T-01 | S2/S6 | covered | 主责 T-01；按各票覆盖的实际接缝合并证据 |
| AC-035 | T-01 | S3/S6 | covered | 主责 T-01；按各票覆盖的实际接缝合并证据 |
| AC-036 | T-08；T-09, T-10 | S4/S8 | covered | 主责 T-08；三协议 T-08/09/10 均须独立证据，T-28 产品汇合 |
| AC-037 | T-19 | S2/S6 | covered | 主责 T-19；按各票覆盖的实际接缝合并证据 |
| AC-038 | T-17；T-25, T-28 | S2/S4/S8 | covered | 主责 T-17；按各票覆盖的实际接缝合并证据 |
| AC-039 | T-17；T-25, T-28 | S2/S5/S8 | covered | 主责 T-17；按各票覆盖的实际接缝合并证据 |
| AC-040 | T-17；T-25, T-28 | S2/S3/S6 | covered | 主责 T-17；按各票覆盖的实际接缝合并证据 |
| AC-041 | T-18；T-25, T-28 | S2/S3/S8 | covered | 主责 T-18；按各票覆盖的实际接缝合并证据 |
| AC-042 | T-02；T-20 | S3/S4/S6 | covered | 主责 T-02；按各票覆盖的实际接缝合并证据 |
| AC-043 | T-20；T-27 | S6/S9 | covered | 主责 T-20；按各票覆盖的实际接缝合并证据 |
| AC-044 | T-01；T-08, T-27 | S1/S9 | covered | 主责 T-01；按各票覆盖的实际接缝合并证据 |
| AC-045 | T-12；T-26, T-28 | S2/S4/S8 | covered | 主责 T-12；按各票覆盖的实际接缝合并证据 |
| AC-046 | T-26 | S2/S6/S8 | covered | 主责 T-26；按各票覆盖的实际接缝合并证据 |
| AC-047 | T-21；T-20, T-22, T-28 | S7/S8 | covered | 主责 T-21；按各票覆盖的实际接缝合并证据 |
| AC-048 | T-21；T-28 | S7/S8 | covered | 主责 T-21；按各票覆盖的实际接缝合并证据 |
| AC-049 | T-23；T-28 | S7/S8 | covered | 主责 T-23；按各票覆盖的实际接缝合并证据 |
| AC-050 | T-24；T-28 | S7/S8 | covered | 主责 T-24；按各票覆盖的实际接缝合并证据 |
| AC-051 | T-21；T-20, T-22, T-23, T-24, T-25, T-28 | S7/S8 | covered | 主责 T-21；按各票覆盖的实际接缝合并证据 |
| AC-052 | T-21；T-23, T-28 | S7/S8 | covered | 主责 T-21；按各票覆盖的实际接缝合并证据 |
| AC-053 | T-21；T-23, T-24, T-25, T-28 | S7/S8 | covered | 主责 T-21；按各票覆盖的实际接缝合并证据 |
| AC-054 | T-05；T-01, T-28 | S2/S3/S5 | covered | 主责 T-05；按各票覆盖的实际接缝合并证据 |
| AC-055 | T-27；T-28 | S6/S8/S9 | covered | 主责 T-27；按各票覆盖的实际接缝合并证据 |

## 5. 并行与路径所有权

调度、Agent Team 与模型偏好以 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path> §4 / Execution Policy Source 为权威，依据 DAG/资源/实际能力推进。所有票复用 README 指定 current 工作区，不增加 worktree。实施授权已由 LOG-047 给出，按 G0 分支与逐票 DoR 分配 owner/进入 I。读研究/审查不成为写入授权；Git index 与全局验证由 Lead 串行协调，不碰其他 change 的改动。

| 共享对象 | 唯一写入 Ticket | 消费者规则 |
| --- | --- | --- |
| HAP schema/生成类型、公共 API、Go 依赖锁 | T-01 | 先提出精确合同变更；owner 更新两端与夹具，再重验受影响消费者 |
| 模块装配/注册、设置导航/入口词典（ModuleId 公共类型例外见下） | T-20 | 子用例与 UI 输出自有模块，组合入口改动由 owner 集成 |
| 根 package/lock、样式输入、main.js/styles.css、notices、现行工程文档/Skill | T-27 | 实现票请求串行构建窗口；owner 更新共享文件，记录输入/hash，build 失败返回具体源票 |
| ModuleId 公共类型/键约束（src/app/contracts/module.ts） | T-01 | T-01 先扩展类型；运行时 MODULE_IDS 由 T-20 请求 owner 更新，不提前注册/激活模块 |
| SQLite 迁移顺序与全局 schema | T-01 协调；各票仅写自己的编号迁移 | schema-registry由T-01唯一串行维护；003/005正文和独立临时Profile资源分别归T-03/T-05。旧票的sqlite-schema仍须走同一注册窗口，不能并发改注册或历史迁移 |
| T02配置pin/Usage同事务接缝 | T-02原owner（026兼任） | T03只读共享路径；store.go、application/assistant ports/service和非credentials*回归的精确窗口，SQL类型不进入Application |
| Host read/search TS协议路由及相关测试 | T-01原TS owner（028） | connection.ts/connection.test.ts/method-validation.ts/method-validation.test.ts/runner.test.ts；不扩到凭证client或另建通道 |
| change 状态、Map、Evidence | 当前 Lead | 只在原工件记录，不由实现者覆盖他票状态；记录真实固定输入 |

共享 owner 是职责，不能用“Lead 合并”授权消费者越界。已完成 owner 因合同变化需按失效闭包重新核验/维护；禁止完成状态掩盖新的写入。T-27 的长生命周期允许先准备工程机制，再整合后续输入；等候依赖产物时不保持活跃 writer，不占用额外实现者。

| Ticket A | Ticket B | Writable 交集 | 真实依赖 | 处理 |
| --- | --- | --- | --- | --- |
| T-04 | T-05 | 当前读权限/撤权fence共享接缝 | 原T05 owner 043唯一维护；T04只读消费 | T04 Go与T05维护为同一writer，TS独立目录；所有测试库/Host使用不同一次性数据 |
| T-09 | T-10 | 无 | 均依赖 T-08 | Engine 合同/真实 Provider 额度语义资源相同，相关窗口串行，不因文件分开就并发 |
| T-22 | T-24 | 无 | 各自依赖满足后无互赖 | 代码可独立；真实宿主验收与 T-27 build 串行冻结 |
| T-06 / T-11 / T-12 | 各自其他票 | 原owner共享接缝不转移 | T11/T12同上游、先冻结合同后联合验收 | 公共API/执行器/Broker由foundation_go唯一维护；T11/T12业务及SQL正文由credential_provider同一writer，注册串行 |
| 任一生产 TS/UI 票 | T-27 | 消费者不写共享生成物 | 无人造顺序边 | 先停相关源码 writer，T-27 构建与记录快照；再验证该源票 |

## 6. Gate、Wave 与集成点

跨票 Wave、Gate、实施授权与恢复由 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path> 拥有；本 Map 不再维护第二份可编辑里程碑。具体导航：

- Goal §2：W1–W7 与 T-27 共享集成线、关键路径、可并行条件、共享 owner。
- Goal §3：G0 执行入口；G1 受控底座；G2 三协议；G3 数据/记忆；G4 宿主/唯一界面；G5 最终构建/平台；G6 产品整体完成。
- Goal §4：用户 LOG-045 允许 Agent Team；实现优先 GPT-6.1-sol/xhigh，独立 review 优先 GPT-6-Astra/high；详细选择、回退和独立性只在 Goal 维护。
- T-27 的既有工程准备不再等待 T-01 done，以便支持首票构建。Go 资产子步骤仍等 T-01，最终验收由 Goal G5 收齐全部生产输入；这不是提前完成或绕过任一 AC。

Map revision 5 补齐 T-27 的构建/规则写集，并保留 revision 3 在 revision 2 基础上把 ModuleId 公共契约归到 T-01，并明确 migrations 的 Go embed/注册写集，解决首票真实 TS build 与后续模块装配的依赖。28 票、55 AC、精确写集与共享 owner 不变。LOG-049 将 G0 按实际 UI 依赖分支，后端按已确认的行为合同进入实施；UI 与全局 Ready 仍需 P/S。

## 7. 横切契约与风险

1. 数据访问/外发按当前 Grant、目标 Bot/模型和 provenance 交集；默认只有明确附加。工具描述不能代替访问控制。
2. Run/委派原子受理、事件先持久、审批先 CP 后发布、派发再校验、unknown 先核查，任何超时不自动换 key 重放。
3. Private 自动、Global 确认、forget 代数、删除派生传播与 commandEpoch 是一套可组合合同；portable 不带有效授权/秘密/队列，备份不复活已删内容。
4. 现有 SDK/driver 只在 adapter，真实依赖版本由 P0 锁定；陌生点必须继续检索近两年活跃且许可明确的项目。REF 只证明已阅读机制/依赖，不证明 HUHU 已运行通过。
5. 凭证登记需要受管专用路径；业务 HAP、argv、普通环境、日志、CP、导出都没有秘密。凭证库在 OS 上不满足该约束时替换具体 adapter，不能悄悄放宽。
6. DESIGN revision 2 / digest `aa62a53b30d0ca32f03a5580be8ce5b4921b9c3c1767793b9173eadfde92dc6e`；prototype `3c93a0c085cf3458148befdeb29ff445fe444601861c3bacb8dc9e421706444b`。真实 UI 验收缺失与设计已批准分别记录。
7. 缺模型、OS/宿主环境或必需 browser 证据只让对应验证保持 pending；不得把 skip、编译或用户选方案冒作真实运行通过。整体完成仍服从 Spec 的全部验收；分支开工依 LOG-049。

## 8. 维护规则

- 进度只更改原 Ticket/Evidence；Map 仅在增删票、依赖、路径/资源/AC/Skill 合同改变时递增 plan_revision。
- 每项 AC 主责明确；修改部分接缝时保持其他必需 Evidence 可追溯，不能相互覆盖。产品范围变化先回 G/S，UI 变化回 P。
- Skill 文件更新后重新计算绑定摘要及受影响验证闭包；旧 Evidence 保留不冒用。开源固定引用是历史事实，实施版本变化追加新核验记录。
- 原输入、source 捕获、confirmation 快照、历史 LOG/静态报告不追改历史；最新状态在 README/Spec/Ticket，各有唯一权威。
- 基线/head、代码、依赖、配置、样本、协议/CP、平台或设计变化使相关 Evidence 失效；只重跑实际受影响范围。

## 9. 总控与恢复

先读 README→Spec→Map→当前 Ticket/Evidence→真实代码/工作区与活动 writer；按授权调用 I。控制器只读分析，不执行实现、不授予权限。

```sh
node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --stage tickets --repo /home/wta/projects/obsidian-huhu --method-root .agents/speculo --state-root .agents/speculo/.speculo .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture
node .agents/speculo/workflows/specdev/common/tools/ticket-control.mjs --map .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md --repo /home/wta/projects/obsidian-huhu --method-root .agents/speculo --state-root .agents/speculo/.speculo
```

派单前回读 G0 分支适用性、源 Spec 合同、依赖 done 且 Evidence 有效、owner、path/resource 冲突及真实授权。未决事务先查原网关，失败不以清库/换 key/换执行者恢复。跨票编排读取现有 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path> 并沿用同一 workspace、revision 和授权记录。全部票完成后仍需 T-28 整体证据与用户实际请求的交付核对，未授权提交/发布/归档不自动加入完成条件。


### 当前工程接缝补充（LOG-053）

`eslint.config.mts` 的本 change 唯一 owner 为 T-27。HAP Node 构建生成器位于 contracts/，全量lint发现其误落入插件TypeScript projectService；T-27维护准确的构建工具规则范围，不能削弱src产品规则。


Map revision 8：根据 T-02 实施预检补齐 assistant-client.test.ts 的准确测试写集；共享 API/schema/迁移/受管 transport 仍由 T-01 owner 在受控维护窗口接纳。独立凭证 adapter 与助手 SQLite 切片可按不同文件/资源实例分工；共享合同先冻结再消费，不改变依赖或 28 票/55 AC。

Map revision 9：依据031只读预检和LOG060已验收依赖，T03补T02 pin/Usage共享路径且仍由原owner写入；T05补T01 TS read/search路由共享路径且由原TS owner写入。T01的schema-registry独占，T02维护assistant-pin-usage；T03/T05按migration-body-003/005和fixture-db-026/027分开正文与临时库，注册/API冻结后再消费。SQL文件003→Version3、005→Version4，后来的004按实际接纳顺序升版本；不改002或空造迁移。28票/55 AC、依赖边和用户后验范围不变。

Map revision 10：028实际读回method-validation.ts发现固定122形状总数门；新增host.read/search后必须由原T01 TS owner同步唯一schema的精确总数，否则全部方法被METHOD_VALIDATOR_LIMIT拒绝。补该文件到T05只读共享路径，028仅维护固定计数及原有夹具测试；不放宽schema或Ajv行为，不扩大其它写集/依赖/AC。


Map revision 11：依据034只读预检与LOG066实际代码门，开启T04/T06及T01/T03/T05原owner维护。042负责T06、T01公共API/schema/Go stdio/路由/装配与006注册、T03暂停/正常continuation；043负责T04 Go及T05当前授权/撤权投递fence；044负责T04 TS及T01 codec/connection/validator准确路径。原owner写集未转给消费者，shared/read_only/owner同步各票。T03/T06共享准入由同一042串行控制；T01仅schema注册，006正文实际Version5，旧SQL冻结，T04默认复用事件表不加004。各自Profile fixture隔离；T02维持done且不开放新写权。实际dispatch见sessions与Evidence，28票/55AC/原DAG/用户后验范围不变。


Map revision 12：042实际probe确认CLI继承stdout不支持SetWriteDeadline，外层ctx返回不足以证明写已物理停止。将inbound/stdio/output_unix.go、output_windows.go、output_other.go精确补入T01原owner共享窗口和T04/T06只读消费；042只在server.go唯一调用可取消/有界受管输出，适用foundation真实pipe测试随原写集。公共平台接口与新依赖不扩张，原T01 inbound/**所有权不变。不得释放权限gate后继续后台写或无限占gate，实际目标OS现场仍用户后验。


Map revision 13：实际读回发现sessions.history旧响应未携带出队授权来源；042原T03精确维护direct/service.go及必要ports.go，原T01维护hap/conversation.go与已授权api MessagePage内部标记。T04/T06只读消费，不转移写权、不改旧SQL或wire形状。043事件权限gate以真实页/batch边界支持超过8个Run来源，短事务当前授权与实际输出同步；实际queue/撤权测试待本候选证实。完整28票/55 AC、依赖与用户后验边界不变。


Map13内部合同已由042/043收敛为仅Go内的DeliverySubject（run/message）：history标服务端可见message IDs，出队同gate重读持久provenance，避免整Run.effective误拒合法消息；无新路径，原sqlite/conversation/store.go保持只读，wire形状不变。800主体由8条batch×100条page得出，总权限deadline仍有界。早先TaskID方案保留在实施观察中但不作为冻结实现要求。


Map revision 14：Map14/Goal13：LOG072已接纳事件/审批代码门。现开启T07与T11/T12联合实施及原T01/T02/T03/T05/T06必要维护；T27先提供宿主最小回执根/排除/数据文档窗口，完整发行资产仍最终重建。先冻结唯一API/Port/SQL形状，再由原owner分别消费。实际派遣以各TASK工具回执为准，当前准备不代表已开工或通过。真实模型/Obsidian/目标OS用户后验。

foundation_go拥有T07 Go和原T01公共API/schema/Go传输/路由/装配/迁移注册、T02配置/pin、T03执行/线程/取消屏障、T06 Broker/effects/Blob及T01迁移前DB+引用Blob恢复集；credential_provider拥有T11/T12新业务和011/012正文、原T05 Go lineage/授权，以及原T02 sqlite/assistant/credentials.go临时配置引用删除guard（其余凭证实现只读）；T04保持done只读，若确有事件生产改动先由Root另开精确窗口；foundation_client拥有T07 TS HostWrite/Obsidian adapter与原T01 TS协议生命周期、原T05来源目标准备；build_integration只持T27精确共享路径窗口。原owner职责不转移，不写旧SQL或凭证实现。

原T12<-T11为实施顺序依赖，改为共同已完成上游以解决T11合法派遣与T12真实策略的接缝，产品合同/55AC不变；先T11合同/默认拒绝、再T12真实策略、两票共同代码门且T13继续等待双方done。T27只新增五个真实共享路径；旧SQL001/002/003/005/006冻结，011/012实际注册顺序由T01唯一控制。所有既有通过证据按新维护影响闭包失效并保留历史，不能继续标done掩盖写入。


Map revision 15：Map15/Goal14：052/053/054 已实际派遣，T07 与 T11/T12 联合实现及原 T01/T02/T03/T05/T06 维护仍在进行；051 共享根已接纳，正式代码门尚未通过。LOG077 仅补 fresh-vault.mjs 的 T27 精确 owner，T07/T28 只读；下一空闲槽由 build_integration 修复强杀后的 Wait，并收口本机回执/HMAC 数据说明。DAG、28 票/55 AC、已有 writer 写集与用户后验边界不变。

共享脚本当前 stop 强杀分支少一次 await exited 是实际代码事实；本次只补准确路径归属，不新增实现票或验收流程。052/053/054 的冻结 TASK 保持原字节；本次不扩大三位作者写集，helper 由后续真实 T27 派遣完成。


Map revision 16：Map16/Goal15：054 客户端与058三路径维护已真实交回，Root全读报告、亲自return0与摘要核验；052 Go候选停写等待053共同冻结，053仍在补齐故障与生命周期验证。Root联合E2E/构建和059独立审查尚未运行，正式代码门未通过。058仅两行持久化owner事实使architecture参考摘要变化，27张未完成票已重绑；T04既有已接纳证据保持历史输入。DAG、全部28票/55AC、writer写集及真实操作用户后验边界不变。

本次只更新已存在Skill引用的精确摘要，无新工程规则、职责或依赖。058回执见evidence/058-lead-return.json，摘要影响判断见evidence/skill-rebind-map16.json；052/053/054/058已派遣TASK保持原字节。


Map revision 17：Map17/Goal16：072候选3联合代码门已真实接纳；开启T13群聊及原T01/T02/T03/T04/T05/T11/T12必要维护。先冻结可信用户批量受理、群成员代/历史范围、公共发布与同一Executor合同，再由原owner消费。T06/T07只读复用，T16仍等待T13；28票/55AC、DAG与真实操作用户后验边界不变。准备不代表实际派遣或通过。

foundation_go唯一维护T01公共API/schema/Go路由/装配/迁移注册及生成api.ts、T02配置pin与群usage、T03会话/执行/编排根；credential_provider拥有T13新group目录和013正文、原T04 Go投递、T05授权以及T11/T12成员资格/预算/结果消费；foundation_client拥有T13 mentions、原T04 TS和T01 TS协议消费者。每文件单writer；没有新的写权自动扩张，T06效果及T07 Host保持只读。

原T04维护前重绑architecture当前摘要，旧接纳不改写；DAG和55AC不变。013正文/注册串行，不以群实现依赖T16形成循环；复用既有取消屏障，完整用户恢复后续。


Map revision 18：Map18/Goal17：T13及原owner维护继续；按073/075真实接缝精确开放base/store.go迁移生命周期与services/groups生产消费者。三作者实际ACK；28票/55AC、DAG和用户后验边界不变。最终合同及实现验收仍待完成。

详见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-13-logs/map18-window-supplement.md</Path>。


Map revision 19：Map19/Goal18：群消费者实测确认成员移除误拦原用户无正文效果核查；恢复原T06/T07精确两文件维护，由073唯一作者修复并重验。T13及既有原owner维护继续；28票/55AC、DAG和真实操作用户后验不变，当前无通过声明。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-13-logs/effect-owner-reconciliation-supplement.md</Path>。


Map revision 20：Map20/Goal19：078修复后的079群聊完整候选已由Root接纳；开启T16取消/恢复及原T01/T03/T04/T06/T11/T12必要维护。T02/T05/T07/T13先只读复用，新增路径须实际最小请求。先冻结唯一资格/检查/领取/关闭合同，再消费并共同验证；28票55AC、原DAG和用户真实操作后验不变。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16-logs/recovery-window-map20.md</Path>。T16新增services/recovery归其本票，T01 api.ts/协议仍原owner，T04单Run重锚由原TS owner维护；016正文与注册串行、旧SQL不改，所有重检查按Root唯一窗口。


Map revision 21：Map21/Goal20：085只读诊断已接纳；T16联合维护继续，精确恢复T13 sources_test.go原owner测试维护以覆盖合法公共历史交错。事件3秒是夹具等待预算，先量化race与轮询成本再定修法；产品250ms/800投递门及权限/恢复合同保持。28票55AC、DAG和用户现场后验边界不变。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16-logs/map21-fixture-maintenance.md</Path>。


Map revision 22：Map22/Goal21：T16与底座代码门及G1已接纳；开启T08 Chat协议实现及原T01默认装配/依赖、T02元数据Probe、T12真实HTTP预算必要维护。T27稍后仅接实际许可闭包，全部发行资产仍最终重建。28票55AC与原DAG不变，真实模型/Obsidian/目标OS由用户后验。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-08-logs/engine-chat-window-map22.md</Path>。先由原T01与T08固定factory/resolver/EngineVersion，再由原owner消费；不引入新的Probe账本或公有选项。重检查与共享许可写入串行。


Map revision 23：默认真实Chat装配使旧T03空模型负控的ADAPTER_NOT_ASSEMBLED预期过期。仅开放原T03 owner的tests/contract/chat/workflow_test.go精确维护；T03生产、Executor和恢复合同保持只读。T08由原owner将空配置/未支持协议映射为既有MODEL_DRAFT_INCOMPLETE/ADAPTER_NOT_ASSEMBLED。原G1和T16已接纳基线不作废，本接缝与T08共同代码验收；28票55AC、DAG和用户现场后验不变。见evidence/T-08-logs/default-model-fixture-map23.md。


Map revision 24：098独立审查确认原受理Intent未绑定与原始SSE非法UTF8被有损解码两项P2。由原T08修复消费端、原T01/T03/T06精确透传既有可信Intent；T06重开，T03扩原测试窗口到execution/recovery.go，公共HAP/迁移/依赖不变。T08 attempts=1，保留原红与正常E2E；T16/G1原基线复用，修复后共同代码复验。详见evidence/T-08-logs/chat-repair-map24.md。28票55AC、DAG及用户现场后验不变。


Map revision 25：独立T27四路径维护修复文档checker遗漏U+3001与native测试夹具分类，原输入文档不改、检查不豁免。100/101仍按冻结Map24修复，其写集不变；28票55AC/DAG与用户现场后验保持。见evidence/T-27-logs/docs-checker-map25.md。


Map revision 26：LOG-110 Chat联合代码门已接纳，开启T09 Responses及T08/T01/T06原owner最小共享维护。T08新增httpcall/{runtime,attempt,body}.go，统一不可变协议Registry与纯状态校验；T01默认装配/固定SDK真实依赖，T06按pinned protocol派生checkpoint metadata，T09只写Responses目录。前置已验收基线与本次共同窗口分开，不抹除旧失败或把维护票重开当T09缺前置。T10仅只读准备，其他已完成票保持。28票55AC/DAG、G2和用户现场后验不变。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-09-logs/responses-window-map26.md</Path>。先109默认消费者有效行为红及实际Wait，再允许107/108共同产品维护；共享路径仍原owner，唯一Go验证窗由Root冻结输入后授予。


Map revision 27：108在固定输入实际只读测试发现T02默认Responses重开探测的旧未装配断言过期，实际为CREDENTIAL_MISSING。仅重开原T02 owner的tests/contract/assistant/model_test.go精确预期维护，生产代码与显式Chat-only selector合同不变；并入当前Responses共同代码门。107/108/109既定TASK/写集和28票55AC/DAG保持；原Chat r2历史验收保留。原因、窗口和证据见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-09-logs/probe-expectation-map27.md</Path>。


Map revision 28：在当前Responses同次共同维护中，仅扩T02测试写窗到probe_http_test.go末段过期未装配预期及必要GET/安全错误观察；先实际原红，原owner114再维护。T02仍active/pending/attempts0，110原红绿保留；无生产/API/权限/锁改变。113沿T27已登记四checker路径修正Markdown语义误报，不修改冻结历史报告。细节见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-09-logs/metadata-probe-map28.md</Path>。全部28票55AC/DAG和用户现场后验不变，T09联合门仍pending。


Map revision 29：LOG-114 Responses代码门已接纳，开启T10及原T08第三协议注册、原T01默认装配/锁的有限维护。T02/T06等已验收职责保持；115记忆只读准备不激活T14。采用合同与精确写集见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-10-logs/anthropic-window-map29.md</Path>。先117默认公共入口有效红，再共同写入、串行验证和Root独立E2E/审查。原28票55AC/DAG及用户现场后验不变。


Map revision 30：Map30/Goal29仅重开T02的tests/contract/assistant/hap_test.go，由原credential_provider修正默认Responses已装配后的过期未装配断言；生产/API/凭证/锁及110/114测试只读。Root原单例实际exit1/Wait1.946400363秒，固定2032输入且无漂移；先观察实际fault，再最小迁移预期，保留strict DTO/秘密拒绝，并运行assistant整包覆盖同类默认消费者。原Responses及本轮Root Anthropic E2E历史证据保留，最终共同输入包含这项测试维护。全部28票55AC、DAG与用户现场后验不变。 见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-10-logs/hap-default-map30.md</Path>。


## Map31 记忆共享合同入口

T14与原T01/T03按115+123进入唯一合同窗口，精确写集/阶段见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/memory-window-map31.md</Path>。API/生成归T01，adapter-only Run Hooks归T03，014正文/条目/manifest/planner归T14。其他原owner依实际后续TASK开窗；28票55AC、DAG和用户现场后验不变。


## Map32 记忆的原授权/预算消费者

原T04/T05/T11/T12/T13精确重开，原credential_provider维护单一MemoryFacts/当前资格/物理投递/传播与可信维护账户族。详见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/memory-consumers-map32.md</Path>；125/126/127既定写集保持，014与原Run/配置/Engine writer不变。全部28票55AC、DAG和用户现场后验保持。


## Map33 记忆运行消费者

精确原owner窗口见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/memory-runtime-map33.md</Path>。原DAG、28票55AC和用户现场后验边界保持。


## Map34 TS/Go资源实例分离

125公共合同冻结后，127限定TS字节校验与128限定Go数据库组件检查的真实输入可分离，具体证明与回退边界见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/independent-ts-go-window-map34.md</Path>。共享生成/跨语言/全仓检查仍由Root串行协调。

## Map35 共同Engine实际输入窗口

130 direct Engine/Chat SDK 组件的静态本仓库闭包仅common/chat/api与锁，先由实际go list确认再运行定向红灯；126/129只写闭包外源码且不检查。具体冻结、扩大闭包和组合联调规则见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/common-component-window-map35.md</Path>。127报告保留，namespaceRevision漏校验由131原owner后继修复。全部状态与DAG不变。

## Map36 无正文清单绑定接缝

原API owner在132最小窗口提供body-free canonical manifest校验，126/128继续各自闭包外source-only工作；组件检查与后续共同门规则见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/manifest-helper-window-map36.md</Path>。不改变wire、DAG、状态及用户现场后验边界。

## Map37 真实历史与维护消费者

134原owner接续129的剩余运行集成，并补direct历史记忆过滤与generator六方法源事实；精确范围和133组件审查分离见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/history-runtime-window-map37.md</Path>。全部产品合同、状态与DAG保持。


## Map38 完整记忆接入回归

Root 固定417输入的首轮完整Go回归actual1/Wait235.686秒、零漂移，暴露旧History/Messages及协议消息位置断言、schema版本预期与一个真实单Session50Run性能/取消问题。按原责任开放精确测试迁移与T14本域诊断，见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/regression-window-map38.md</Path>。T09/T10仅重开测试维护；原G2历史门不抹除，生产协议只读。原28票55AC、DAG、用户现场后验边界不变。

## Map39 等待期间补充消息恢复

145 与 Root 已沿实际消息写入、Claim、当前权限、Prepare 和 Decision 回读确认一般补充消息在 Resume 前被清空，且未进入原子任务结果。146 原 T01/T03 owner 与147原共同 Engine owner 分别维护可信恢复包及固定工具结果后缀；精确窗口见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/resume-inbox-window-map39.md</Path>。T09/T10 生产仅开放已有 checkpoint 结果键验证的必要兼容维护，其余协议行为只读。初始 ShortTerm、当前权限、恢复重放、费用与28票55AC/DAG保持；不新增用户决定或现场验收。


## Map40 / Goal39 全局记忆实施

T14最终完整代码候选及原owner维护已通过159双轴和Root代码验收；原失败/未知原因/用户现场后验保留。T15激活，原T01 owner先完成唯一纯合同。精确阶段与写集见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-15-logs/global-window-map40.md</Path>。其余全部28票55AC持续，G3和完整Goal尚未完成。


## Map41 / Goal40 全局事实与投递消费者

161/162由原Memory与权限事件owner分别接原014事实/联合召回和当前物理投递门；160仅api+stdlib真实闭包允许与两者source-only分离。详见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-15-logs/global-consumers-map41.md</Path>。共享DB/Go组合待源码稳定由Root开窗，完整目标继续。


## Map42 / Goal41 全局提案事务与owner入口

160四源/27输入纯合同已Root接纳，161指出pending metadata-only owner delete需最小验证修正。163由同API owner完成015提案业务、独立owner/proposer能力、T01装配与真实用户入口；161/162仍独占本域源码。详见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-15-logs/global-main-map42.md</Path>。共同Go/DB验证仍待组合冻结，T15与完整Goal未完成。


## Map43 / Goal42 TS全局结果消费

Root作为T01原实施owner在唯一TS窗口维护core/protocol/method-validation.ts与新增global-memory-validation.test.ts，补与160/163一致的提案状态/正文/目标和页面互斥。准确窗口见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-15-logs/global-ts-map43.md</Path>。163生成器待Root协调；纯Node与Go source-only分离，全功能共同门仍待。
