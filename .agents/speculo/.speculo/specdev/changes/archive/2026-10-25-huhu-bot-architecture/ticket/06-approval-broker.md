---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293","phase":"implement","operation":"受控写工具、审批与 Checkpoint 原子发布：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/06-approval-broker.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-06.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"1f7c35977291cb15b9e4e0841ca2c7f7b1406daa564b6ef0814e6945131ff65b","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"09d2969a169b9abe7392acc94d0d7be8050bbb56cd22e6560fce75d8d8a60e14","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:approval-broker","huhu-bot:migration-body-006","huhu-bot:fixture-db-042","huhu-bot:run-admission-contract"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-huhu-bot-architecture"
id: "T-06"
title: "受控写工具、审批与 Checkpoint 原子发布"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: true
risk: "high"
blocked_by: ["T-03","T-05"]
contract_ids: ["AC-025","AC-028"]
owner: "/root"
expected_changes: ["<Path>native/huhubot/internal/domain/execution/effect/**</Path>","<Path>native/huhubot/internal/domain/access/approval/**</Path>","<Path>native/huhubot/internal/application/tooling/broker/**</Path>","<Path>native/huhubot/internal/application/access/approvals/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/006-approval-effect.sql</Path>","<Path>native/huhubot/internal/adapters/outbound/blob/store/**</Path>","<Path>native/huhubot/tests/contract/approval/**</Path>"]
writable_paths: ["<Path>native/huhubot/internal/domain/execution/effect/**</Path>","<Path>native/huhubot/internal/domain/access/approval/**</Path>","<Path>native/huhubot/internal/application/tooling/broker/**</Path>","<Path>native/huhubot/internal/application/access/approvals/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/006-approval-effect.sql</Path>","<Path>native/huhubot/internal/adapters/outbound/blob/store/**</Path>","<Path>native/huhubot/tests/contract/approval/**</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/router.go</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/events.go</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/approvals.go</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/server.go</Path>","<Path>native/huhubot/tests/contract/foundation/**</Path>","<Path>native/huhubot/internal/application/execution/executor/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path>","<Path>native/huhubot/internal/domain/execution/run/state.go</Path>","<Path>native/huhubot/tests/contract/chat/**</Path>","<Path>native/huhubot/internal/application/access/context/**</Path>","<Path>native/huhubot/internal/application/access/grants/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path>","<Path>native/huhubot/tests/contract/access/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/output_unix.go</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/output_windows.go</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/output_other.go</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/conversation.go</Path>","<Path>native/huhubot/internal/application/conversation/direct/service.go</Path>","<Path>native/huhubot/internal/application/conversation/direct/ports.go</Path>","<Path>native/huhubot/internal/adapters/outbound/eino/common/**</Path>","<Path>native/huhubot/internal/adapters/outbound/eino/httpcall/**</Path>","<Path>native/huhubot/internal/adapters/outbound/eino/responses/**</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/router.go</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/events.go</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/approvals.go</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/server.go</Path>","<Path>native/huhubot/tests/contract/foundation/**</Path>","<Path>native/huhubot/internal/application/execution/executor/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path>","<Path>native/huhubot/internal/domain/execution/run/state.go</Path>","<Path>native/huhubot/tests/contract/chat/**</Path>","<Path>native/huhubot/internal/application/access/context/**</Path>","<Path>native/huhubot/internal/application/access/grants/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path>","<Path>native/huhubot/tests/contract/access/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/output_unix.go</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/output_windows.go</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/output_other.go</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/conversation.go</Path>","<Path>native/huhubot/internal/application/conversation/direct/service.go</Path>","<Path>native/huhubot/internal/application/conversation/direct/ports.go</Path>","<Path>native/huhubot/internal/adapters/outbound/blob/store/**</Path>","<Path>native/huhubot/internal/application/tooling/broker/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/**</Path>","<Path>native/huhubot/tests/contract/approval/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/approvals.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/reconcile.go</Path>","<Path>native/huhubot/internal/application/access/approvals/**</Path>","<Path>native/huhubot/internal/adapters/outbound/eino/common/**</Path>","<Path>native/huhubot/internal/adapters/outbound/eino/httpcall/**</Path>","<Path>native/huhubot/internal/adapters/outbound/eino/responses/**</Path>","<Path>native/huhubot/internal/application/tooling/broker/service.go</Path>","<Path>native/huhubot/internal/application/tooling/broker/recovery.go</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01","<Path>native/huhubot/internal/bootstrap/core.go</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/hap/router.go</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/hap/events.go</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/hap/approvals.go</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/stdio/server.go</Path> => T-01","<Path>native/huhubot/tests/contract/foundation/**</Path> => T-01","<Path>native/huhubot/internal/application/execution/executor/**</Path> => T-03","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path> => T-03","<Path>native/huhubot/internal/domain/execution/run/state.go</Path> => T-03","<Path>native/huhubot/tests/contract/chat/**</Path> => T-03","<Path>native/huhubot/internal/application/access/context/**</Path> => T-05","<Path>native/huhubot/internal/application/access/grants/**</Path> => T-05","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path> => T-05","<Path>native/huhubot/tests/contract/access/**</Path> => T-05","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/stdio/output_unix.go</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/stdio/output_windows.go</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/stdio/output_other.go</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/hap/conversation.go</Path> => T-01","<Path>native/huhubot/internal/application/conversation/direct/service.go</Path> => T-03","<Path>native/huhubot/internal/application/conversation/direct/ports.go</Path> => T-03","<Path>native/huhubot/internal/adapters/outbound/blob/store/**</Path> => T-06","<Path>native/huhubot/internal/application/tooling/broker/**</Path> => T-06","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/**</Path> => T-06","<Path>native/huhubot/tests/contract/approval/**</Path> => T-06","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/approvals.go</Path> => T-06","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/reconcile.go</Path> => T-06","<Path>native/huhubot/internal/application/access/approvals/**</Path> => T-06","<Path>native/huhubot/internal/adapters/outbound/eino/common/**</Path> => T-08","<Path>native/huhubot/internal/adapters/outbound/eino/httpcall/**</Path> => T-08","<Path>native/huhubot/internal/adapters/outbound/eino/responses/**</Path> => T-09","<Path>native/huhubot/internal/application/tooling/broker/service.go</Path> => T-06","<Path>native/huhubot/internal/application/tooling/broker/recovery.go</Path> => T-06"]
---

# Ticket T-06：受控写工具、审批与 Checkpoint 原子发布

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-007–009；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-06.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

<a id="goal-source"></a>

## 目标与来源

模型提出单笔记效果时生成可审批的确切预览；首个等待审批关闭后续效果准入，恢复读到完整 CP/Approval/Effect 一致状态。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-01 cloudwego/eino](https://github.com/cloudwego/eino/tree/0a5ca53b9d3bf7b661dccc863465ec568a421eea)；[REF-02 cloudwego/eino-ext](https://github.com/cloudwego/eino-ext/tree/eee37f63ff9548c5eaec48fc157863339f8eda07)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

<a id="behavior-scope"></a>

## 行为与范围

IN：Broker、Effect ID、审批摘要/有效期/版本、CP 不可变发布、批准/拒绝/取消竞争。REUSE：Grant 与短事务。OUT：任意 shell/MCP/Provider 内建工具、真实 Vault 写入（T-07）。

### 有序实施步骤

1. 先形成目标/基线/diff/来源/能力版本预览与 Effect 身份，工具参数不包含可自授权的 caller。
2. 首个待审批意图出现时关闭 Run 后续效果准入；CP 写临时→校验→不可变发布，短事务原子发布 CP 引用/Approval/Run/Effect/事件。
3. 批准/拒绝/过期以 CAS 和用户 Principal 处理；派发另一次短事务重查 grant、取消、工具/目标版本。
4. fake Host/fake Engine 模拟一响应多写工具和竞态，验证孤儿 Blob 可回收、已发布 CP 不可变；为三协议提供同一 Broker 合同夹具。

<a id="acceptance"></a>

## 验收标准

- [ ] AC-025（本票主责）：目标/diff/来源明确；批准绑定确切效果，拒绝没有笔记修改。
- [ ] AC-028（本票主责）：准入门关闭，CP/票据原子可读；取消提交后无新派发资格。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

<a id="verification-method"></a>

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态 | 批准绑定单一 effect；拒绝/过期没有宿主写入；重启可完整读取已发布审批及 CP。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | CP 写完前 crash、DB 提交失败、批准与取消竞争、一响应多工具；无半发布和取消屏障后的派发资格。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | 所有 adapter 只注入 Broker 包装工具；同参数新意图有新 effect，同意图恢复保留 ID。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 在 <Path>native/huhubot/</Path> 执行 `go test ./tests/contract/approval/... -count=1`；关键并发路径加 `-race`（目标工具链支持时），回读每一 fault point 的持久状态 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-06.md</Path> |

- **E2E disposition：** required。以公共命令/查询进入真实 Runner/SQLite（相关票同时经过 TS/Go stdio），固定故障输入，Lead 对持久回执、状态与外部效果作独立回读；无需为纯后端票伪造 UI 验收。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。

<a id="execution-constraints"></a>

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

无法冻结恢复身份或发现 SDK 绕过 Broker 时停止；未决效果不能自动重新创建。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** 无产品高影响未决。本票合同级 ready 不等于可派单：上游 Spec 因 P 浏览器技术证据缺失仍未 Ready；依赖完成、执行授权及 owner 指派也由总控另行检查。

### 未决问题

无。

## 当前交付验收口径（LOG-051）

用户最新 Goal 要求本轮全面实现并在代码层面总验收，真实操作自行进行。此票的行为、权限、数据与故障合同保持；代码实现、适用自动化验证和独立代码审查是本轮完成/下游开工条件。真实 Provider、Obsidian 交互和用户目标 OS 操作另列 user-owned / not-run，不冒充原 AC 的现场验收通过，也不阻塞独立代码工作。


## 当前原owner维护窗口（Map11 / Goal10）

LOG066已接纳T01/T02/T03/T05联合r2代码门。042持T06与原T01公共合同/Go传输/装配/006注册、原T03执行器暂停和正常continuation；043持T04 Go及原T05当前读权限/撤权/到期fence；044持T04 TS及原T01严格协议codec/生命周期。共享API/schema先由042冻结再消费，所有生产写入仍需Root实际派遣。T03/T06 run-admission-contract由同一原owner在受控窗口维护，无两个writer；SQL006正文Version5，旧SQL不改，不空造004。原T02已验收pin/Usage仅消费，不再开放写入；新增必要共享路径先精确请求。正式状态由Root维护。


## 历史分页出队保护维护（Map13 / Goal12）

042沿原T03维护direct/service.go（必要时ports.go），从实际过滤后的HistoryPage提取可信可见message IDs，放入仅Go内部、json忽略的delivery标记；沿原T01维护hap/conversation.go复制到已有受保护响应。唯一内部合同为DeliverySubject{Kind:run|message,ID}，043在同gate从持久message.source_json及关联Run owner/recipient/scopes/grants精确重验，scope仅保留该消息来源实际引用的handles，普通用户消息不受后来继承来源误拒。旧SQL/原会话存储查询不改，不新增wire字段；来源已撤权时丢弃旧响应并允许客户端重新读取合法子集。guard按batch8×page100固定800、总250ms/到期预算有界，验证超过8个Run的合法页面与其中一个Run撤权，不能无故拒绝正常长历史。


## 当前联合维护窗口（Map14 / Goal13）

Map14/Goal13：LOG072已接纳事件/审批代码门。现开启T07与T11/T12联合实施及原T01/T02/T03/T05/T06必要维护；T27先提供宿主最小回执根/排除/数据文档窗口，完整发行资产仍最终重建。先冻结唯一API/Port/SQL形状，再由原owner分别消费。实际派遣以各TASK工具回执为准，当前准备不代表已开工或通过。真实模型/Obsidian/目标OS用户后验。

foundation_go拥有T07 Go和原T01公共API/schema/Go传输/路由/装配/迁移注册、T02配置/pin、T03执行/线程/取消屏障、T06 Broker/effects/Blob及T01迁移前DB+引用Blob恢复集；credential_provider拥有T11/T12新业务和011/012正文、原T05 Go lineage/授权，以及原T02 sqlite/assistant/credentials.go临时配置引用删除guard（其余凭证实现只读）；T04保持done只读，若确有事件生产改动先由Root另开精确窗口；foundation_client拥有T07 TS HostWrite/Obsidian adapter与原T01 TS协议生命周期、原T05来源目标准备；build_integration只持T27精确共享路径窗口。原owner职责不转移，不写旧SQL或凭证实现。

共享run-admission-contract先由唯一API owner与业务owner冻结Port/事务边界，再在各自目录消费；每个共享文件单writer。T11/T12同一业务writer，011/012正文与注册按实际下一版本串行。T12原开工依赖T11调整为与T11相同已完成上游；原因是T11合法受理本就需要T12真实准入策略。必须先冻结T11合同/缺策略默认拒绝，再完成T12真实策略与共同消费者，两票联合验收后才供T13使用，禁止以恒放行或部分Done绕过产品合同。T07独立但共享合同由同一原owner集成。


## 群效果核查维护（Map19 / Goal18）

Map19/Goal18：群消费者实测确认成员移除误拦原用户无正文效果核查；恢复原T06/T07精确两文件维护，由073唯一作者修复并重验。T13及既有原owner维护继续；28票/55AC、DAG和真实操作用户后验不变，当前无通过声明。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-13-logs/effect-owner-reconciliation-supplement.md</Path>，SHA256 `813ed67fc1c74e83f888339cb61019f5dd9bb60912aed6b73811f1ceee520d17`。本次有效写集仅见补充；不重开T06/T07其他目录。


## 取消与恢复维护（Map20 / Goal19）

Map20/Goal19：078修复后的079群聊完整候选已由Root接纳；开启T16取消/恢复及原T01/T03/T04/T06/T11/T12必要维护。T02/T05/T07/T13先只读复用，新增路径须实际最小请求。先冻结唯一资格/检查/领取/关闭合同，再消费并共同验证；28票55AC、原DAG和用户真实操作后验不变。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16-logs/recovery-window-map20.md</Path>，SHA256 `3befb9dca2031f81a4e3a0e02577cc80115955d2ef8ee6fd191faa6bedbdca63`。仅按该联合窗口与实际原生TASK分配写入；完整原owner目录不是自动扩写指令。


## Chat审查修复维护（Map24 / Goal23）

精确窗口见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-08-logs/chat-repair-map24.md</Path>；仅原owner在实际100/101派遣后写入。098两项真实红保留，修复后共同代码门，用户真实操作后验。


## Map26当前代码窗口

本票只开放broker/service.go、recovery.go及approval对应合同测试，其余历史写集本次只读。原owner和调度见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-09-logs/responses-window-map26.md</Path>。原Chat r2代码门保留；本次共同门未运行，真实操作user-owned/not-run。
