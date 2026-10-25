---
schema_version: 3
plan_contract_version: 1
plan_revision: 2
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

## 1. 目标与拆分策略

用户 LOG-042 授权本轮完成最终规划、参考检索和文档对齐，不是产品实现/提交/发布授权。全部票共同交付首版多 Bot、群聊与同引擎协作、三协议、自动私有/确认全局记忆、资料权限、审批写入、持久恢复与永久清除。55 AC 全覆盖，无隐式 MVP 缩减。

以可观察行为切片。T-01 是有真实启动/持久读取/跨进程消费者的必要基础合同；其他核心票均跨领域/用例/adapter/验证，UI 票以稳定用例形成真实用户任务。T-27 拥有共享构建/规则集成，T-28 建立产品跨边界验收工具，不为每个检查单造一张票。不存在需要先改造 CLI Agent 的 Prefactor。

新增模块采用 expand（独立模块/API/Profile）→ integrate（显式装配/投影/宿主）→ verify；不迁移现有 CLI 历史，不收缩旧模块或删除测试。Profile schema 升级的 expand/backup/migrate/verify/contract 由 T-19 拥有。

**重要门禁：** 本 Map 的 ready 只表示拆分结构与合同完整。Spec 仍 draft / ready_for_tickets:false，原因是 UI-001 缺浏览器技术证据；控制器会阻止整个 change 派单。非 UI Ticket 的 ready 表示其自身合同完整，不能绕过上游门禁；UI Ticket 保持 blocked。P 的原 owner 补真实记录、S 重验就绪后才能重新判断派单，不重新请求已取得的 final 设计确认。本轮按 T 允许的“用户材料已等价覆盖合同”完成规划，没有伪造上游 Ready。

### 总体实施背景

基线 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`。当前是 TypeScript/React Obsidian 插件和 Rust PTY，无 Bot Go Runner。ModuleRegistry、ServiceKey、ReactSurface、Vault API、lazy manifest、token/i18n 与构建检查复用；`agent` 私有代码不跨模块导入。Go 模块在 native/huhubot，TS 客户端在 src/modules/huhubot，wire 在 contracts/hap/v0.1，均是规划路径。

领域不依赖 SQL/SDK/Obsidian；Application API 是统一业务入口；HAP DTO、SQLite Row、Engine 消息与 React 投影分别转换。六上下文仍共用一库/UoW，跨域用例只持短事务。持久 Bot/会话/委派/Run 分开，Leader 没额外权限，临时执行不自动变持久身份。未来 Web 只保留可替换入站接缝，P1 不开网络 listener。

当前 dev 的库内存储规则与 ui 的 zustand 持久状态描述针对已实现模块。Bot 的库外 Profile 和客户端投影例外已由 ADR-003/020 获准；T-27 在真实功能集成时更新当前规则和数据文档。本轮不提前把规划写成已实现，也不要求执行者违反旧规则猜设计。

真实现有接缝：src/app/manifests.ts、src/app/contracts/module.ts/workbench.ts、src/app/settings/nav.ts、src/shell/navigation-state.ts/icon.tsx、scripts/module-strings.ts；原生参考 src/modules/agent/platform/desktop/pty/binary.test.ts 与 src/host/desktop/private-mode.test.ts；宿主参考 scripts/obsidian-acceptance/workbench-probe.mjs；工程检查 package.json/scripts/test/release。新路径在各票明确为待创建。

### 项目 Skill 读取矩阵

Lead 与实现者先完整读 Map，再读适用项目 Skill，最后读当前 Ticket；矩阵是最低集合，不是 allowlist。按真实变更范围发现其他入口时先同步 Map/Ticket。扫描范围与摘要保存在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/skill-scan.json</Path>；已扫描 14 个项目 Skill 入口，工作流路由不冒充项目工程规则，没有编造 Go 专用 Skill。

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
| T-12 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/12-messages-limits-budget.md</Path> — Bot 通信、受控再委派与调用树预算 | T-11；见 §6 |
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

状态、Ready、执行 owner、深度、风险、Skill 摘要和写集仅由各 Ticket frontmatter 拥有，不在 Map 复制运行状态。可观察交付详见票的目标/AC；本轮没有 done 票或实施 Evidence。

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
T-12 <- T-11
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

调度、Agent Team 与模型偏好以 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path> §4 / Execution Policy Source 为权威，依据 DAG/资源/实际能力推进。所有票复用 README 指定 current 工作区，不增加 worktree。只有获得后续实施授权才分配 owner/进入 I。读研究/审查不成为写入授权；Git index 与全局验证由 Lead 串行协调，不碰其他 change 的改动。

| 共享对象 | 唯一写入 Ticket | 消费者规则 |
| --- | --- | --- |
| HAP schema/生成类型、公共 API、Go 依赖锁 | T-01 | 先提出精确合同变更；owner 更新两端与夹具，再重验受影响消费者 |
| 模块装配/注册、设置导航/入口词典 | T-20 | 子用例与 UI 输出自有模块，组合入口改动由 owner 集成 |
| 根 package/lock、样式输入、main.js/styles.css、notices、现行工程文档/Skill | T-27 | 实现票请求串行构建窗口；owner 更新共享文件，记录输入/hash，build 失败返回具体源票 |
| SQLite 迁移顺序与全局 schema | T-01 协调；各票仅写自己的编号迁移 | resource_claims 标记同一 sqlite-schema；迁移接纳/版本分配串行，禁止并发改同一注册/既有迁移 |
| change 状态、Map、Evidence | 当前 Lead | 只在原工件记录，不由实现者覆盖他票状态；记录真实固定输入 |

共享 owner 是职责，不能用“Lead 合并”授权消费者越界。已完成 owner 因合同变化需按失效闭包重新核验/维护；禁止完成状态掩盖新的写入。T-27 的长生命周期允许先准备工程机制，再整合后续输入；等候依赖产物时不保持活跃 writer，不占用额外实现者。

| Ticket A | Ticket B | Writable 交集 | 真实依赖 | 处理 |
| --- | --- | --- | --- | --- |
| T-04 | T-05 | 无 | 无 | 可独立推进；同一测试库/宿主实例需要不同一次性数据，验证时协调 |
| T-09 | T-10 | 无 | 均依赖 T-08 | Engine 合同/真实 Provider 额度语义资源相同，相关窗口串行，不因文件分开就并发 |
| T-22 | T-24 | 无 | 各自依赖满足后无互赖 | 代码可独立；真实宿主验收与 T-27 build 串行冻结 |
| T-06 / T-11 / T-12 | 各自其他票 | 无预期同文件写入 | 按 DAG | run-admission-contract 与 sqlite-schema 共享，变更窗口串行 |
| 任一生产 TS/UI 票 | T-27 | 消费者不写共享生成物 | 无人造顺序边 | 先停相关源码 writer，T-27 构建与记录快照；再验证该源票 |

## 6. Gate、Wave 与集成点

跨票 Wave、Gate、实施授权与恢复由 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path> 拥有；本 Map 不再维护第二份可编辑里程碑。具体导航：

- Goal §2：W1–W7 与 T-27 共享集成线、关键路径、可并行条件、共享 owner。
- Goal §3：G0 执行入口；G1 受控底座；G2 三协议；G3 数据/记忆；G4 宿主/唯一界面；G5 最终构建/平台；G6 产品整体完成。
- Goal §4：用户 LOG-045 允许 Agent Team；实现优先 GPT-6.1-sol/xhigh，独立 review 优先 GPT-6-Astra/high；详细选择、回退和独立性只在 Goal 维护。
- T-27 的既有工程准备不再等待 T-01 done，以便支持首票构建。Go 资产子步骤仍等 T-01，最终验收由 Goal G5 收齐全部生产输入；这不是提前完成或绕过任一 AC。

Map revision 2 只修正 T-27 开始依赖和增加 Goal 导航；28 票、55 AC、精确写集与共享 owner 不变。整体入口仍需真实 P 浏览器材料、S Ready、用户实施指示和逐票 DoR；当前只交计划，未进入实施。

## 7. 横切契约与风险

1. 数据访问/外发按当前 Grant、目标 Bot/模型和 provenance 交集；默认只有明确附加。工具描述不能代替访问控制。
2. Run/委派原子受理、事件先持久、审批先 CP 后发布、派发再校验、unknown 先核查，任何超时不自动换 key 重放。
3. Private 自动、Global 确认、forget 代数、删除派生传播与 commandEpoch 是一套可组合合同；portable 不带有效授权/秘密/队列，备份不复活已删内容。
4. 现有 SDK/driver 只在 adapter，真实依赖版本由 P0 锁定；陌生点必须继续检索近两年活跃且许可明确的项目。REF 只证明已阅读机制/依赖，不证明 HUHU 已运行通过。
5. 凭证登记需要受管专用路径；业务 HAP、argv、普通环境、日志、CP、导出都没有秘密。凭证库在 OS 上不满足该约束时替换具体 adapter，不能悄悄放宽。
6. DESIGN revision 2 / digest `aa62a53b30d0ca32f03a5580be8ce5b4921b9c3c1767793b9173eadfde92dc6e`；prototype `3c93a0c085cf3458148befdeb29ff445fe444601861c3bacb8dc9e421706444b`。真实 UI 验收缺失与设计已批准分别记录。
7. 缺模型、OS/宿主环境或必需 browser 证据只让对应验证保持 pending；不得把 skip、编译或用户选方案冒作真实运行通过。整体入口仍服从 Spec 状态。

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

派单前回读源 Spec Ready、依赖 done 且 Evidence 有效、owner、path/resource 冲突及真实授权。未决事务先查原网关，失败不以清库/换 key/换执行者恢复。跨票编排读取现有 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path> 并沿用同一 workspace、revision 和授权记录。全部票完成后仍需 T-28 整体证据与用户实际请求的交付核对，未授权提交/发布/归档不自动加入完成条件。
