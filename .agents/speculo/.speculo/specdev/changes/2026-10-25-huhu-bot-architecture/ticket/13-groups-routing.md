---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293","phase":"implement","operation":"群聊协调者、显式提及与成员撤销：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/13-groups-routing.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-13.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"1f7c35977291cb15b9e4e0841ca2c7f7b1406daa564b6ef0814e6945131ff65b","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"09d2969a169b9abe7392acc94d0d7be8050bbb56cd22e6560fce75d8d8a60e14","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:groups-routing","huhu-bot:migration-body-013","huhu-bot:group-membership-fence"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-huhu-bot-architecture"
id: "T-13"
title: "群聊协调者、显式提及与成员撤销"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: true
risk: "high"
blocked_by: ["T-04","T-11","T-12"]
contract_ids: ["AC-006","AC-007","AC-008"]
owner: "/root"
expected_changes: ["<Path>native/huhubot/internal/domain/conversation/group/**</Path>","<Path>native/huhubot/internal/application/conversation/group/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/groups/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/013-groups.sql</Path>","<Path>native/huhubot/tests/contract/groups/**</Path>","<Path>src/modules/huhubot/core/mentions/**</Path>","<Path>src/modules/huhubot/services/groups/**</Path>"]
writable_paths: ["<Path>native/huhubot/internal/domain/conversation/group/**</Path>","<Path>native/huhubot/internal/application/conversation/group/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/groups/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/013-groups.sql</Path>","<Path>native/huhubot/tests/contract/groups/**</Path>","<Path>src/modules/huhubot/core/mentions/**</Path>","<Path>src/modules/huhubot/services/groups/**</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/**</Path>","<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path>","<Path>native/huhubot/tests/contract/foundation/**</Path>","<Path>src/modules/huhubot/core/protocol/**</Path>","<Path>native/huhubot/internal/application/assistant/ports.go</Path>","<Path>native/huhubot/internal/application/assistant/service.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go</Path>","<Path>native/huhubot/tests/contract/assistant/assistant_test.go</Path>","<Path>native/huhubot/internal/domain/conversation/direct/**</Path>","<Path>native/huhubot/internal/domain/execution/run/**</Path>","<Path>native/huhubot/internal/application/conversation/direct/**</Path>","<Path>native/huhubot/internal/application/execution/executor/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path>","<Path>native/huhubot/tests/contract/chat/**</Path>","<Path>native/huhubot/internal/application/execution/events/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/events/**</Path>","<Path>native/huhubot/tests/contract/events/**</Path>","<Path>src/modules/huhubot/core/events/**</Path>","<Path>src/modules/huhubot/services/events/**</Path>","<Path>native/huhubot/internal/application/access/context/**</Path>","<Path>native/huhubot/internal/application/access/grants/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path>","<Path>native/huhubot/tests/contract/access/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/approvals.go</Path>","<Path>native/huhubot/internal/application/collaboration/delegate/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/collaboration/**</Path>","<Path>native/huhubot/tests/contract/delegation/**</Path>","<Path>native/huhubot/internal/application/collaboration/messages/**</Path>","<Path>native/huhubot/internal/application/collaboration/scheduler/**</Path>","<Path>native/huhubot/internal/application/collaboration/finalize/**</Path>","<Path>native/huhubot/internal/application/execution/usage/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/usage/**</Path>","<Path>native/huhubot/tests/contract/collaboration-policy/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/base/store.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/reconcile.go</Path>","<Path>native/huhubot/tests/contract/effect-reconcile/reconcile_test.go</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/**</Path>","<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path>","<Path>native/huhubot/tests/contract/foundation/**</Path>","<Path>src/modules/huhubot/core/protocol/**</Path>","<Path>native/huhubot/internal/application/assistant/ports.go</Path>","<Path>native/huhubot/internal/application/assistant/service.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go</Path>","<Path>native/huhubot/tests/contract/assistant/assistant_test.go</Path>","<Path>native/huhubot/internal/domain/conversation/direct/**</Path>","<Path>native/huhubot/internal/domain/execution/run/**</Path>","<Path>native/huhubot/internal/application/conversation/direct/**</Path>","<Path>native/huhubot/internal/application/execution/executor/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path>","<Path>native/huhubot/tests/contract/chat/**</Path>","<Path>native/huhubot/internal/application/execution/events/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/events/**</Path>","<Path>native/huhubot/tests/contract/events/**</Path>","<Path>src/modules/huhubot/core/events/**</Path>","<Path>src/modules/huhubot/services/events/**</Path>","<Path>native/huhubot/internal/application/access/context/**</Path>","<Path>native/huhubot/internal/application/access/grants/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path>","<Path>native/huhubot/tests/contract/access/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/approvals.go</Path>","<Path>native/huhubot/internal/application/collaboration/delegate/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/collaboration/**</Path>","<Path>native/huhubot/tests/contract/delegation/**</Path>","<Path>native/huhubot/internal/application/collaboration/messages/**</Path>","<Path>native/huhubot/internal/application/collaboration/scheduler/**</Path>","<Path>native/huhubot/internal/application/collaboration/finalize/**</Path>","<Path>native/huhubot/internal/application/execution/usage/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/usage/**</Path>","<Path>native/huhubot/tests/contract/collaboration-policy/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/base/store.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/reconcile.go</Path>","<Path>native/huhubot/tests/contract/effect-reconcile/reconcile_test.go</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/hap/**</Path> => T-01","<Path>native/huhubot/internal/bootstrap/core.go</Path> => T-01","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path> => T-01","<Path>native/huhubot/tests/contract/foundation/**</Path> => T-01","<Path>src/modules/huhubot/core/protocol/**</Path> => T-01","<Path>native/huhubot/internal/application/assistant/ports.go</Path> => T-02","<Path>native/huhubot/internal/application/assistant/service.go</Path> => T-02","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go</Path> => T-02","<Path>native/huhubot/tests/contract/assistant/assistant_test.go</Path> => T-02","<Path>native/huhubot/internal/domain/conversation/direct/**</Path> => T-03","<Path>native/huhubot/internal/domain/execution/run/**</Path> => T-03","<Path>native/huhubot/internal/application/conversation/direct/**</Path> => T-03","<Path>native/huhubot/internal/application/execution/executor/**</Path> => T-03","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path> => T-03","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path> => T-03","<Path>native/huhubot/tests/contract/chat/**</Path> => T-03","<Path>native/huhubot/internal/application/execution/events/**</Path> => T-04","<Path>native/huhubot/internal/adapters/outbound/sqlite/events/**</Path> => T-04","<Path>native/huhubot/tests/contract/events/**</Path> => T-04","<Path>src/modules/huhubot/core/events/**</Path> => T-04","<Path>src/modules/huhubot/services/events/**</Path> => T-04","<Path>native/huhubot/internal/application/access/context/**</Path> => T-05","<Path>native/huhubot/internal/application/access/grants/**</Path> => T-05","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path> => T-05","<Path>native/huhubot/tests/contract/access/**</Path> => T-05","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/approvals.go</Path> => T-06","<Path>native/huhubot/internal/application/collaboration/delegate/**</Path> => T-11","<Path>native/huhubot/internal/adapters/outbound/sqlite/collaboration/**</Path> => T-11","<Path>native/huhubot/tests/contract/delegation/**</Path> => T-11","<Path>native/huhubot/internal/application/collaboration/messages/**</Path> => T-12","<Path>native/huhubot/internal/application/collaboration/scheduler/**</Path> => T-12","<Path>native/huhubot/internal/application/collaboration/finalize/**</Path> => T-12","<Path>native/huhubot/internal/application/execution/usage/**</Path> => T-12","<Path>native/huhubot/internal/adapters/outbound/sqlite/usage/**</Path> => T-12","<Path>native/huhubot/tests/contract/collaboration-policy/**</Path> => T-12","<Path>native/huhubot/internal/adapters/outbound/sqlite/base/store.go</Path> => T-01","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/reconcile.go</Path> => T-06","<Path>native/huhubot/tests/contract/effect-reconcile/reconcile_test.go</Path> => T-07"]
---

# Ticket T-13：群聊协调者、显式提及与成员撤销

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-023、025；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-13.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

<a id="goal-source"></a>

## 目标与来源

普通群消息只唤醒协调者，显式 @ 只调度指定成员；公共消息有持久顺序，成员变更即时收紧投递与任务权限。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-03 liliMozi/openhanako](https://github.com/liliMozi/openhanako/tree/9a6cabf8c513db5edc6cf8179a538c9075885c6e)；[REF-04 CopilotKit/OpenBot](https://github.com/CopilotKit/OpenBot/tree/46642d6c91daa663bccff673595f4e12a419a496)；[REF-05 Fei2411/DeepSeek-Bot](https://github.com/Fei2411/DeepSeek-Bot/tree/1bebe826f74e9a72cabafd3b80602b05af867b38)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

<a id="behavior-scope"></a>

## 行为与范围

IN：group Session、成员/协调者 CAS、@ agentId token 校验、单根多成员子执行、公共 transcript 发布。REUSE：同一协作工具、预算、事件。OUT：广播自动全员回复、额外 Leader 权限、合并成员私聊。

### 有序实施步骤

1. 创建群选择已有成员/协调者，固定新成员可见历史授权；公共 transcript 与各 Bot 工作线程分离。
2. 发送前校验 @ token 绑定与全部目标；无 @ 仅协调者，有任一无效目标则整体拒绝受理并返回可保留草稿错误。
3. 一条群发送只创建一个根意图；指定成员/工具委派产生子执行，公共回复按持久 message sequence 发布。
4. 移除成员先撤销新任务/正文投递并取消群绑定在途任务；协调者仅无活动根时更换；回执保留用于核查。

<a id="acceptance"></a>

## 验收标准

- [ ] AC-006（本票主责）：仅 A 自动回应；A 可派遣其他成员，公共 transcript 可追溯。
- [ ] AC-007（本票主责）：第一次仅 B 被调度；第二次受理前拒绝并保留草稿，不误发 A。
- [ ] AC-008（本票主责）：移除后无新派遣/正文投递并停止绑定工作；更换协调者需任务先结束。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

<a id="verification-method"></a>

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态 | 不 @ 仅 A、@B 仅 B、@B/C 归同根；完成乱序不改变公共历史权威顺序。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | 无效/停用/非成员 @、成员 revision 冲突、移除与晚到结果竞争；无误发/撤权正文。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | Coordinator 与成员工具权限相同；群历史不合并私聊/私有记忆，单聊 busy/幂等合同继续成立。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 在 <Path>native/huhubot/</Path> 执行 `go test ./tests/contract/groups/... -count=1`；关键并发路径加 `-race`（目标工具链支持时），回读每一 fault point 的持久状态 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-13.md</Path> |

- **E2E disposition：** required。以公共命令/查询进入真实 Runner/SQLite（相关票同时经过 TS/Go stdio），固定故障输入，Lead 对持久回执、状态与外部效果作独立回读；无需为纯后端票伪造 UI 验收。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。

<a id="execution-constraints"></a>

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

不能按 UI chunk 到达先后排序持久消息；新成员历史范围不清时拒绝加入请求而非全历史开放。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** 无产品高影响未决。本票合同级 ready 不等于可派单：上游 Spec 因 P 浏览器技术证据缺失仍未 Ready；依赖完成、执行授权及 owner 指派也由总控另行检查。

### 未决问题

无。

## 当前交付验收口径（LOG-051）

用户最新 Goal 要求本轮全面实现并在代码层面总验收，真实操作自行进行。此票的行为、权限、数据与故障合同保持；代码实现、适用自动化验证和独立代码审查是本轮完成/下游开工条件。真实 Provider、Obsidian 交互和用户目标 OS 操作另列 user-owned / not-run，不冒充原 AC 的现场验收通过，也不阻塞独立代码工作。


## 群聊维护窗口（Map17 / Goal16）

Map17/Goal16：072候选3联合代码门已真实接纳；开启T13群聊及原T01/T02/T03/T04/T05/T11/T12必要维护。先冻结可信用户批量受理、群成员代/历史范围、公共发布与同一Executor合同，再由原owner消费。T06/T07只读复用，T16仍等待T13；28票/55AC、DAG与真实操作用户后验边界不变。准备不代表实际派遣或通过。

foundation_go唯一维护T01公共API/schema/Go路由/装配/迁移注册及生成api.ts、T02配置pin与群usage、T03会话/执行/编排根；credential_provider拥有T13新group目录和013正文、原T04 Go投递、T05授权以及T11/T12成员资格/预算/结果消费；foundation_client拥有T13 mentions、原T04 TS和T01 TS协议消费者。每文件单writer；没有新的写权自动扩张，T06效果及T07 Host保持只读。

060研究仅提供旧时点索引，最终漂移文件须回读当前源码。显式@B/C由可信用户批量受理边进入同一树，不能虚构A模型/claim/来源Grant或受模型delegate allowlist限制；各目标的资格/Grant/成员代须同Tx全部验证。普通无@仍只A。群当前成员及历史范围谓词贯穿Context、真实Dispatch、公共结果入库与物理投递，含无SourceRefs正文；remove/rejoin不能恢复旧代任务。用户已合法公开历史与撤销的未发布正文区分。公共seq和Run事件seq分离；局部取消只影响当前群绑定子树。013是唯一新迁移正文，既有001/002/003/005/006/011/012冻结。


## 群聊真实接缝补充（Map18 / Goal17）

Map18/Goal17：T13及原owner维护继续；按073/075真实接缝精确开放base/store.go迁移生命周期与services/groups生产消费者。三作者实际ACK；28票/55AC、DAG和用户后验边界不变。最终合同及实现验收仍待完成。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-13-logs/map18-window-supplement.md</Path> 是当前073/074/075窗口补充；原TASK不改写。


## 群效果核查维护（Map19 / Goal18）

Map19/Goal18：群消费者实测确认成员移除误拦原用户无正文效果核查；恢复原T06/T07精确两文件维护，由073唯一作者修复并重验。T13及既有原owner维护继续；28票/55AC、DAG和真实操作用户后验不变，当前无通过声明。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-13-logs/effect-owner-reconciliation-supplement.md</Path>，SHA256 `813ed67fc1c74e83f888339cb61019f5dd9bb60912aed6b73811f1ceee520d17`。本次有效写集仅见补充；不重开T06/T07其他目录。


## 联合race测试维护（Map21 / Goal20）

Map21/Goal20：085只读诊断已接纳；T16联合维护继续，精确恢复T13 sources_test.go原owner测试维护以覆盖合法公共历史交错。事件3秒是夹具等待预算，先量化race与轮询成本再定修法；产品250ms/800投递门及权限/恢复合同保持。28票55AC、DAG和用户现场后验边界不变。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16-logs/map21-fixture-maintenance.md</Path>，SHA256 `700fd303c43c72463671940d652ca59645f29e1e3172701a8073fd9a84d430de`；仅该文件测试维护，不重新开放T13其他目录。


## Map32 当前记忆消费者维护

从原已接纳代码门精确重开，原credential_provider按115/123与<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/memory-consumers-map32.md</Path>和实际128 TASK维护；其他历史目录不是本次全写权。原证据保留，新共同门未运行，用户真实操作后验。
