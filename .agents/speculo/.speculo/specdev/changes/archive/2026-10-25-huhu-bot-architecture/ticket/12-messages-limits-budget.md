---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293","phase":"implement","operation":"Bot 通信、受控再委派与调用树预算：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/12-messages-limits-budget.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-12.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"1f7c35977291cb15b9e4e0841ca2c7f7b1406daa564b6ef0814e6945131ff65b","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"09d2969a169b9abe7392acc94d0d7be8050bbb56cd22e6560fce75d8d8a60e14","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:messages-limits-budget","huhu-bot:migration-body-012","huhu-bot:collaboration-policy-owner"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-huhu-bot-architecture"
id: "T-12"
title: "Bot 通信、受控再委派与调用树预算"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: true
risk: "high"
blocked_by: ["T-02","T-03","T-05","T-06"]
contract_ids: ["AC-012","AC-013","AC-014","AC-015","AC-045"]
owner: "/root"
expected_changes: ["<Path>native/huhubot/internal/domain/collaboration/policy/**</Path>","<Path>native/huhubot/internal/application/collaboration/messages/**</Path>","<Path>native/huhubot/internal/application/collaboration/scheduler/**</Path>","<Path>native/huhubot/internal/application/collaboration/finalize/**</Path>","<Path>native/huhubot/internal/application/execution/usage/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/usage/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/messages/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/012-budget-message.sql</Path>","<Path>native/huhubot/tests/contract/collaboration-policy/**</Path>"]
writable_paths: ["<Path>native/huhubot/internal/domain/collaboration/policy/**</Path>","<Path>native/huhubot/internal/application/collaboration/messages/**</Path>","<Path>native/huhubot/internal/application/collaboration/scheduler/**</Path>","<Path>native/huhubot/internal/application/collaboration/finalize/**</Path>","<Path>native/huhubot/internal/application/execution/usage/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/usage/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/messages/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/012-budget-message.sql</Path>","<Path>native/huhubot/tests/contract/collaboration-policy/**</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/base/**</Path>","<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/**</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/server.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path>","<Path>native/huhubot/tests/contract/foundation/**</Path>","<Path>src/modules/huhubot/core/protocol/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/credentials.go</Path>","<Path>native/huhubot/internal/application/assistant/ports.go</Path>","<Path>native/huhubot/internal/application/assistant/service.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go</Path>","<Path>native/huhubot/tests/contract/assistant/assistant_test.go</Path>","<Path>native/huhubot/internal/domain/execution/run/**</Path>","<Path>native/huhubot/internal/application/execution/executor/**</Path>","<Path>native/huhubot/internal/application/conversation/direct/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path>","<Path>native/huhubot/tests/contract/chat/**</Path>","<Path>native/huhubot/internal/application/execution/events/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/events/**</Path>","<Path>native/huhubot/tests/contract/events/**</Path>","<Path>native/huhubot/internal/application/access/context/**</Path>","<Path>native/huhubot/internal/application/access/grants/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path>","<Path>native/huhubot/tests/contract/access/**</Path>","<Path>src/modules/huhubot/platform/obsidian/sources/**</Path>","<Path>native/huhubot/internal/adapters/outbound/blob/store/**</Path>","<Path>native/huhubot/internal/application/tooling/broker/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/**</Path>","<Path>native/huhubot/tests/contract/approval/**</Path>","<Path>src/shared/storage/vault-layout.ts</Path>","<Path>src/shared/storage/vault-layout.test.ts</Path>","<Path>src/modules/sync/core/excludes.ts</Path>","<Path>src/modules/sync/platform/desktop/excludes.test.ts</Path>","<Path>docs/data.md</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/base/**</Path>","<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/**</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/server.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path>","<Path>native/huhubot/tests/contract/foundation/**</Path>","<Path>src/modules/huhubot/core/protocol/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/credentials.go</Path>","<Path>native/huhubot/internal/application/assistant/ports.go</Path>","<Path>native/huhubot/internal/application/assistant/service.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go</Path>","<Path>native/huhubot/tests/contract/assistant/assistant_test.go</Path>","<Path>native/huhubot/internal/domain/execution/run/**</Path>","<Path>native/huhubot/internal/application/execution/executor/**</Path>","<Path>native/huhubot/internal/application/conversation/direct/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path>","<Path>native/huhubot/tests/contract/chat/**</Path>","<Path>native/huhubot/internal/application/execution/events/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/events/**</Path>","<Path>native/huhubot/tests/contract/events/**</Path>","<Path>native/huhubot/internal/application/access/context/**</Path>","<Path>native/huhubot/internal/application/access/grants/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path>","<Path>native/huhubot/tests/contract/access/**</Path>","<Path>src/modules/huhubot/platform/obsidian/sources/**</Path>","<Path>native/huhubot/internal/adapters/outbound/blob/store/**</Path>","<Path>native/huhubot/internal/application/tooling/broker/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/**</Path>","<Path>native/huhubot/tests/contract/approval/**</Path>","<Path>src/shared/storage/vault-layout.ts</Path>","<Path>src/shared/storage/vault-layout.test.ts</Path>","<Path>src/modules/sync/core/excludes.ts</Path>","<Path>src/modules/sync/platform/desktop/excludes.test.ts</Path>","<Path>docs/data.md</Path>","<Path>native/huhubot/internal/application/collaboration/messages/**</Path>","<Path>native/huhubot/internal/application/collaboration/scheduler/**</Path>","<Path>native/huhubot/internal/application/collaboration/finalize/**</Path>","<Path>native/huhubot/internal/application/execution/usage/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/usage/**</Path>","<Path>native/huhubot/tests/contract/collaboration-policy/**</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01","<Path>native/huhubot/internal/adapters/outbound/sqlite/base/**</Path> => T-01","<Path>native/huhubot/internal/bootstrap/core.go</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/hap/**</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/stdio/server.go</Path> => T-01","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path> => T-01","<Path>native/huhubot/tests/contract/foundation/**</Path> => T-01","<Path>src/modules/huhubot/core/protocol/**</Path> => T-01","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/credentials.go</Path> => T-02","<Path>native/huhubot/internal/application/assistant/ports.go</Path> => T-02","<Path>native/huhubot/internal/application/assistant/service.go</Path> => T-02","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go</Path> => T-02","<Path>native/huhubot/tests/contract/assistant/assistant_test.go</Path> => T-02","<Path>native/huhubot/internal/domain/execution/run/**</Path> => T-03","<Path>native/huhubot/internal/application/execution/executor/**</Path> => T-03","<Path>native/huhubot/internal/application/conversation/direct/**</Path> => T-03","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path> => T-03","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path> => T-03","<Path>native/huhubot/tests/contract/chat/**</Path> => T-03","<Path>native/huhubot/internal/application/execution/events/**</Path> => T-04","<Path>native/huhubot/internal/adapters/outbound/sqlite/events/**</Path> => T-04","<Path>native/huhubot/tests/contract/events/**</Path> => T-04","<Path>native/huhubot/internal/application/access/context/**</Path> => T-05","<Path>native/huhubot/internal/application/access/grants/**</Path> => T-05","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path> => T-05","<Path>native/huhubot/tests/contract/access/**</Path> => T-05","<Path>src/modules/huhubot/platform/obsidian/sources/**</Path> => T-05","<Path>native/huhubot/internal/adapters/outbound/blob/store/**</Path> => T-06","<Path>native/huhubot/internal/application/tooling/broker/**</Path> => T-06","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/**</Path> => T-06","<Path>native/huhubot/tests/contract/approval/**</Path> => T-06","<Path>src/shared/storage/vault-layout.ts</Path> => T-27","<Path>src/shared/storage/vault-layout.test.ts</Path> => T-27","<Path>src/modules/sync/core/excludes.ts</Path> => T-27","<Path>src/modules/sync/platform/desktop/excludes.test.ts</Path> => T-27","<Path>docs/data.md</Path> => T-27","<Path>native/huhubot/internal/application/collaboration/messages/**</Path> => T-12","<Path>native/huhubot/internal/application/collaboration/scheduler/**</Path> => T-12","<Path>native/huhubot/internal/application/collaboration/finalize/**</Path> => T-12","<Path>native/huhubot/internal/application/execution/usage/**</Path> => T-12","<Path>native/huhubot/internal/adapters/outbound/sqlite/usage/**</Path> => T-12","<Path>native/huhubot/tests/contract/collaboration-policy/**</Path> => T-12"]
---

# Ticket T-12：Bot 通信、受控再委派与调用树预算

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-023；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-12.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

<a id="goal-source"></a>

## 目标与来源

Agent 可通知、询问、回复及再委派；并行子任务在根预算内运行，父结果如实包含失败与部分完成。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-03 liliMozi/openhanako](https://github.com/liliMozi/openhanako/tree/9a6cabf8c513db5edc6cf8179a538c9075885c6e)；[REF-04 CopilotKit/OpenBot](https://github.com/CopilotKit/OpenBot/tree/46642d6c91daa663bccff673595f4e12a419a496)；[REF-06 openclaw/openclaw](https://github.com/openclaw/openclaw/tree/090e6213e25e6b09f03590a41da2fddeaf9f611e)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

<a id="behavior-scope"></a>

## 行为与范围

IN：agents.message/tasks.reply、送达/应答/完成回执、wait graph、深度/数量/并发/唤醒上限、预算预留结算、父子终结。REUSE：T-11 的持久任务与授权。OUT：无限自动重试、独立长期 Task 平台、精确美元封顶承诺。

### 有序实施步骤

1. 区分 notify 不唤醒与 question 有界应答；按投递身份去重，reply 保持原线程，终态后的新工作用新 Run。
2. 用真实调用/等待图检查循环，并按 spec 候选 3/32/4/8/8 限制；排队不占模型并发。固定夹具实测后只显式更新限制/hello。
3. 每个调用先原子预留根额度，再结算已知/估计/未知 usage；工具、摘要、问答、重试、子任务都走同一入口；记忆作业另有归属额度。
4. 父 running/waiting_children 只从权威 Run/Delegation 投影；禁止有活动后代/未决效果时 succeeded，失败和局部结果有结构化依据。

<a id="acceptance"></a>

## 验收标准

- [ ] AC-012（本票主责）：回执区分送达/应答/完成；问答受根限额，重复不无限唤醒。
- [ ] AC-013（本票主责）：合法委派成功；其余 RESOURCE_LIMIT，未开始被拒的模型调用。
- [ ] AC-014（本票主责）：预算原子预留，额度不足停止新调用；总量可追踪，unknown 不计作零。
- [ ] AC-015（本票主责）：展示部分结果及失败原因；有活动/未知效果后代时不能 succeeded。
- [ ] AC-045（本票主责）：可关联身份/修订/耗用、known/estimate/unknown，诊断不泄露私有正文。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

<a id="verification-method"></a>

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态 | 合法二次委派完成；notify 不收费唤醒；并发抢最后额度只有合格请求出站；父视图汇总 usage 和部分结果。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | 循环等待、越深/越数/越并发/问答链上限、usage 缺失；RESOURCE_LIMIT 或 unknown，可见原因且无被拒模型请求。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | 同一 Bot 的新隔离线程不因名字相同误判循环；重试新 Run 保留 retryOfRunId/预算归属。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 在 <Path>native/huhubot/</Path> 执行 `go test ./tests/contract/collaboration-policy/... -count=1`；关键并发路径加 `-race`（目标工具链支持时），回读每一 fault point 的持久状态 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-12.md</Path> |

- **E2E disposition：** required。以公共命令/查询进入真实 Runner/SQLite（相关票同时经过 TS/Go stdio），固定故障输入，Lead 对持久回执、状态与外部效果作独立回读；无需为纯后端票伪造 UI 验收。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。

<a id="execution-constraints"></a>

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

费用信息不完整时不能标零。原子预留或父终结不变量失败暂停整个收费准入；修复后重跑并发夹具。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** 无产品高影响未决。本票合同级 ready 不等于可派单：上游 Spec 因 P 浏览器技术证据缺失仍未 Ready；依赖完成、执行授权及 owner 指派也由总控另行检查。

### 未决问题

无。

## 当前交付验收口径（LOG-051）

用户最新 Goal 要求本轮全面实现并在代码层面总验收，真实操作自行进行。此票的行为、权限、数据与故障合同保持；代码实现、适用自动化验证和独立代码审查是本轮完成/下游开工条件。真实 Provider、Obsidian 交互和用户目标 OS 操作另列 user-owned / not-run，不冒充原 AC 的现场验收通过，也不阻塞独立代码工作。


## 当前联合维护窗口（Map14 / Goal13）

Map14/Goal13：LOG072已接纳事件/审批代码门。现开启T07与T11/T12联合实施及原T01/T02/T03/T05/T06必要维护；T27先提供宿主最小回执根/排除/数据文档窗口，完整发行资产仍最终重建。先冻结唯一API/Port/SQL形状，再由原owner分别消费。实际派遣以各TASK工具回执为准，当前准备不代表已开工或通过。真实模型/Obsidian/目标OS用户后验。

foundation_go拥有T07 Go和原T01公共API/schema/Go传输/路由/装配/迁移注册、T02配置/pin、T03执行/线程/取消屏障、T06 Broker/effects/Blob及T01迁移前DB+引用Blob恢复集；credential_provider拥有T11/T12新业务和011/012正文、原T05 Go lineage/授权，以及原T02 sqlite/assistant/credentials.go临时配置引用删除guard（其余凭证实现只读）；T04保持done只读，若确有事件生产改动先由Root另开精确窗口；foundation_client拥有T07 TS HostWrite/Obsidian adapter与原T01 TS协议生命周期、原T05来源目标准备；build_integration只持T27精确共享路径窗口。原owner职责不转移，不写旧SQL或凭证实现。

共享run-admission-contract先由唯一API owner与业务owner冻结Port/事务边界，再在各自目录消费；每个共享文件单writer。T11/T12同一业务writer，011/012正文与注册按实际下一版本串行。T12原开工依赖T11调整为与T11相同已完成上游；原因是T11合法受理本就需要T12真实准入策略。必须先冻结T11合同/缺策略默认拒绝，再完成T12真实策略与共同消费者，两票联合验收后才供T13使用，禁止以恒放行或部分Done绕过产品合同。T07独立但共享合同由同一原owner集成。

同一Engine/Executor消费已有或temporary独立workThread/TaskConfigSnapshot；caller来自执行上下文。每次真实模型HTTP attempt单独预算/dispatch/known-estimate-unknown结算，覆盖循环、工具后续、摘要、问答、重试、子任务与未来记忆消费者；不以Engine.Run一次预留替代。最小持久子树cancel/admission屏障供T13移除成员使用，完整用户恢复仍T16。默认3/32/4/8/8遵守Spec，任何收紧须显式更新相应合同与夹具。


## 群聊维护窗口（Map17 / Goal16）

Map17/Goal16：072候选3联合代码门已真实接纳；开启T13群聊及原T01/T02/T03/T04/T05/T11/T12必要维护。先冻结可信用户批量受理、群成员代/历史范围、公共发布与同一Executor合同，再由原owner消费。T06/T07只读复用，T16仍等待T13；28票/55AC、DAG与真实操作用户后验边界不变。准备不代表实际派遣或通过。

foundation_go唯一维护T01公共API/schema/Go路由/装配/迁移注册及生成api.ts、T02配置pin与群usage、T03会话/执行/编排根；credential_provider拥有T13新group目录和013正文、原T04 Go投递、T05授权以及T11/T12成员资格/预算/结果消费；foundation_client拥有T13 mentions、原T04 TS和T01 TS协议消费者。每文件单writer；没有新的写权自动扩张，T06效果及T07 Host保持只读。

060研究仅提供旧时点索引，最终漂移文件须回读当前源码。显式@B/C由可信用户批量受理边进入同一树，不能虚构A模型/claim/来源Grant或受模型delegate allowlist限制；各目标的资格/Grant/成员代须同Tx全部验证。普通无@仍只A。群当前成员及历史范围谓词贯穿Context、真实Dispatch、公共结果入库与物理投递，含无SourceRefs正文；remove/rejoin不能恢复旧代任务。用户已合法公开历史与撤销的未发布正文区分。公共seq和Run事件seq分离；局部取消只影响当前群绑定子树。013是唯一新迁移正文，既有001/002/003/005/006/011/012冻结。


## 取消与恢复维护（Map20 / Goal19）

Map20/Goal19：078修复后的079群聊完整候选已由Root接纳；开启T16取消/恢复及原T01/T03/T04/T06/T11/T12必要维护。T02/T05/T07/T13先只读复用，新增路径须实际最小请求。先冻结唯一资格/检查/领取/关闭合同，再消费并共同验证；28票55AC、原DAG和用户真实操作后验不变。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16-logs/recovery-window-map20.md</Path>，SHA256 `3befb9dca2031f81a4e3a0e02577cc80115955d2ef8ee6fd191faa6bedbdca63`。仅按该联合窗口与实际原生TASK分配写入；完整原owner目录不是自动扩写指令。


## Chat协议原owner联合窗口（Map22 / Goal21）

Map22/Goal21：T16与底座代码门及G1已接纳；开启T08 Chat协议实现及原T01默认装配/依赖、T02元数据Probe、T12真实HTTP预算必要维护。T27稍后仅接实际许可闭包，全部发行资产仍最终重建。28票55AC与原DAG不变，真实模型/Obsidian/目标OS由用户后验。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-08-logs/engine-chat-window-map22.md</Path>，SHA256 `ca9ae6fa9e9e50720c4f93a705510d9726df87d525ea5ea6ad2a14610f712f8c`。只按实际原生TASK写入；全目录职责不等于自动扩大本轮写集。


## Map32 当前记忆消费者维护

从原已接纳代码门精确重开，原credential_provider按115/123与<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/memory-consumers-map32.md</Path>和实际128 TASK维护；其他历史目录不是本次全写权。原证据保留，新共同门未运行，用户真实操作后验。
