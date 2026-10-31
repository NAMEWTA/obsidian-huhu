---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293","phase":"implement","operation":"调用树取消、崩溃核查与用户恢复：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/16-cancel-recovery.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"1f7c35977291cb15b9e4e0841ca2c7f7b1406daa564b6ef0814e6945131ff65b","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"09d2969a169b9abe7392acc94d0d7be8050bbb56cd22e6560fce75d8d8a60e14","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:cancel-recovery","huhu-bot:migration-body-016","huhu-bot:run-admission-contract","huhu-bot:fixture-db-081"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-huhu-bot-architecture"
id: "T-16"
title: "调用树取消、崩溃核查与用户恢复"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: true
risk: "high"
blocked_by: ["T-07","T-12","T-13"]
contract_ids: ["AC-016","AC-017","AC-033"]
owner: "/root"
expected_changes: ["<Path>native/huhubot/internal/application/execution/cancel/**</Path>","<Path>native/huhubot/internal/application/execution/recovery/**</Path>","<Path>native/huhubot/internal/domain/execution/recovery/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/recovery/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/016-recovery.sql</Path>","<Path>native/huhubot/tests/contract/recovery/**</Path>","<Path>src/modules/huhubot/services/recovery/**</Path>"]
writable_paths: ["<Path>native/huhubot/internal/application/execution/cancel/**</Path>","<Path>native/huhubot/internal/application/execution/recovery/**</Path>","<Path>native/huhubot/internal/domain/execution/recovery/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/recovery/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/016-recovery.sql</Path>","<Path>native/huhubot/tests/contract/recovery/**</Path>","<Path>src/modules/huhubot/services/recovery/**</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>native/huhubot/internal/adapters/inbound/**</Path>","<Path>native/huhubot/cmd/huhubot/**</Path>","<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path>","<Path>src/modules/huhubot/core/protocol/connection.ts</Path>","<Path>src/modules/huhubot/core/protocol/codec.ts</Path>","<Path>src/modules/huhubot/core/protocol/method-validation.ts</Path>","<Path>src/modules/huhubot/platform/desktop/transport/managed.ts</Path>","<Path>native/huhubot/internal/domain/execution/run/**</Path>","<Path>native/huhubot/internal/application/execution/commands/**</Path>","<Path>native/huhubot/internal/application/execution/executor/**</Path>","<Path>native/huhubot/internal/application/conversation/direct/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path>","<Path>src/modules/huhubot/services/events/event-client.ts</Path>","<Path>native/huhubot/internal/application/tooling/broker/**</Path>","<Path>native/huhubot/internal/application/access/approvals/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/**</Path>","<Path>native/huhubot/internal/adapters/outbound/blob/store/**</Path>","<Path>native/huhubot/internal/application/collaboration/delegate/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/collaboration/**</Path>","<Path>native/huhubot/internal/application/collaboration/messages/**</Path>","<Path>native/huhubot/internal/application/collaboration/scheduler/**</Path>","<Path>native/huhubot/internal/application/collaboration/finalize/**</Path>","<Path>native/huhubot/internal/application/execution/usage/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/usage/**</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>native/huhubot/internal/adapters/inbound/**</Path>","<Path>native/huhubot/cmd/huhubot/**</Path>","<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path>","<Path>src/modules/huhubot/core/protocol/connection.ts</Path>","<Path>src/modules/huhubot/core/protocol/codec.ts</Path>","<Path>src/modules/huhubot/core/protocol/method-validation.ts</Path>","<Path>src/modules/huhubot/platform/desktop/transport/managed.ts</Path>","<Path>native/huhubot/internal/domain/execution/run/**</Path>","<Path>native/huhubot/internal/application/execution/commands/**</Path>","<Path>native/huhubot/internal/application/execution/executor/**</Path>","<Path>native/huhubot/internal/application/conversation/direct/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path>","<Path>src/modules/huhubot/services/events/event-client.ts</Path>","<Path>native/huhubot/internal/application/tooling/broker/**</Path>","<Path>native/huhubot/internal/application/access/approvals/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/**</Path>","<Path>native/huhubot/internal/adapters/outbound/blob/store/**</Path>","<Path>native/huhubot/internal/application/collaboration/delegate/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/collaboration/**</Path>","<Path>native/huhubot/internal/application/collaboration/messages/**</Path>","<Path>native/huhubot/internal/application/collaboration/scheduler/**</Path>","<Path>native/huhubot/internal/application/collaboration/finalize/**</Path>","<Path>native/huhubot/internal/application/execution/usage/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/usage/**</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01","<Path>native/huhubot/internal/adapters/inbound/**</Path> => T-01","<Path>native/huhubot/cmd/huhubot/**</Path> => T-01","<Path>native/huhubot/internal/bootstrap/core.go</Path> => T-01","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/*.go</Path> => T-01","<Path>src/modules/huhubot/core/protocol/connection.ts</Path> => T-01","<Path>src/modules/huhubot/core/protocol/codec.ts</Path> => T-01","<Path>src/modules/huhubot/core/protocol/method-validation.ts</Path> => T-01","<Path>src/modules/huhubot/platform/desktop/transport/managed.ts</Path> => T-01","<Path>native/huhubot/internal/domain/execution/run/**</Path> => T-03","<Path>native/huhubot/internal/application/execution/commands/**</Path> => T-03","<Path>native/huhubot/internal/application/execution/executor/**</Path> => T-03","<Path>native/huhubot/internal/application/conversation/direct/**</Path> => T-03","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path> => T-03","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path> => T-03","<Path>src/modules/huhubot/services/events/event-client.ts</Path> => T-04","<Path>native/huhubot/internal/application/tooling/broker/**</Path> => T-06","<Path>native/huhubot/internal/application/access/approvals/**</Path> => T-06","<Path>native/huhubot/internal/adapters/outbound/sqlite/effects/**</Path> => T-06","<Path>native/huhubot/internal/adapters/outbound/blob/store/**</Path> => T-06","<Path>native/huhubot/internal/application/collaboration/delegate/**</Path> => T-11","<Path>native/huhubot/internal/adapters/outbound/sqlite/collaboration/**</Path> => T-11","<Path>native/huhubot/internal/application/collaboration/messages/**</Path> => T-12","<Path>native/huhubot/internal/application/collaboration/scheduler/**</Path> => T-12","<Path>native/huhubot/internal/application/collaboration/finalize/**</Path> => T-12","<Path>native/huhubot/internal/application/execution/usage/**</Path> => T-12","<Path>native/huhubot/internal/adapters/outbound/sqlite/usage/**</Path> => T-12"]
---

# Ticket T-16：调用树取消、崩溃核查与用户恢复

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-007–011、019；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

<a id="goal-source"></a>

## 目标与来源

取消只影响指定树或子树；重启后先核查状态/权限/效果，安全的已运行任务也等待用户点击恢复。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-01 cloudwego/eino](https://github.com/cloudwego/eino/tree/0a5ca53b9d3bf7b661dccc863465ec568a421eea)；[REF-04 CopilotKit/OpenBot](https://github.com/CopilotKit/OpenBot/tree/46642d6c91daa663bccff673595f4e12a419a496)；[REF-06 openclaw/openclaw](https://github.com/openclaw/openclaw/tree/090e6213e25e6b09f03590a41da2fddeaf9f611e)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

<a id="behavior-scope"></a>

## 行为与范围

IN：取消屏障、后代传播、bounded drain、CP/配置兼容核查、恢复资格/代数、已完成结果防重投。REUSE：Run/Effect/Delegation/Grant 事实。OUT：自动继续已运行模型、回滚已发生写入。

### 有序实施步骤

1. 取消先提交屏障阻止新准入，再传播已接纳后代；单子树取消不污染另一棵树。
2. 恢复扫描按 accepted、waiting_approval、已 running/canceled 等事实分类；检查 CP hash/版本、Grant、Host、工具版本与 effect。
3. dispatching/unknown 交核查；completed 子结果复用回执，坏 CP blocked；安全 running 树只发布可恢复资格。
4. 用户 resume 时再次检查资格/代数，继续原身份；模块关闭/父 EOF 也走同一有界关闭服务。

<a id="acceptance"></a>

## 验收标准

- [ ] AC-016（本票主责）：仅指定树受屏障和取消；在途效果如实结算，无关树继续。
- [ ] AC-017（本票主责）：核查前不重派，安全后等点击，已完成子结果不复制；坏 CP blocked。
- [ ] AC-033（本票接缝；总主责 T-20）：页关闭继续；模块/宿主退出有界收尾，不依赖 async unload 被等待。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

<a id="verification-method"></a>

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态 | 同 Bot 服务两树，只取消指定树；重启已完成子结果不复制；点击后才继续模型。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | cancel 与 delegate/approve 竞争、坏 CP、撤权、未知效果、关闭超时；无新派发或错误复活。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | accepted 未领取继续扫描，waiting_approval 仍等待，已 canceled 不恢复；终态可接核查事件。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 在 <Path>native/huhubot/</Path> 执行 `go test ./tests/contract/recovery/... -count=1`；关键并发路径加 `-race`（目标工具链支持时），回读每一 fault point 的持久状态 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16.md</Path> |

- **E2E disposition：** required。以公共命令/查询进入真实 Runner/SQLite（相关票同时经过 TS/Go stdio），固定故障输入，Lead 对持久回执、状态与外部效果作独立回读；无需为纯后端票伪造 UI 验收。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。

<a id="execution-constraints"></a>

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

kill 不能作无效果证明；不可恢复保留 blocked 原因与诊断，不无限重启。对 adapter CP 变更重跑三协议恢复。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** 无产品高影响未决。本票合同级 ready 不等于可派单：上游 Spec 因 P 浏览器技术证据缺失仍未 Ready；依赖完成、执行授权及 owner 指派也由总控另行检查。

### 未决问题

无。

## 当前交付验收口径（LOG-051）

用户最新 Goal 要求本轮全面实现并在代码层面总验收，真实操作自行进行。此票的行为、权限、数据与故障合同保持；代码实现、适用自动化验证和独立代码审查是本轮完成/下游开工条件。真实 Provider、Obsidian 交互和用户目标 OS 操作另列 user-owned / not-run，不冒充原 AC 的现场验收通过，也不阻塞独立代码工作。


## 取消与恢复维护（Map20 / Goal19）

Map20/Goal19：078修复后的079群聊完整候选已由Root接纳；开启T16取消/恢复及原T01/T03/T04/T06/T11/T12必要维护。T02/T05/T07/T13先只读复用，新增路径须实际最小请求。先冻结唯一资格/检查/领取/关闭合同，再消费并共同验证；28票55AC、原DAG和用户真实操作后验不变。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16-logs/recovery-window-map20.md</Path>，SHA256 `3befb9dca2031f81a4e3a0e02577cc80115955d2ef8ee6fd191faa6bedbdca63`。仅按该联合窗口与实际原生TASK分配写入；完整原owner目录不是自动扩写指令。


## 联合检查后测试诊断（Map21 / Goal20）

Map21/Goal20：085只读诊断已接纳；T16联合维护继续，精确恢复T13 sources_test.go原owner测试维护以覆盖合法公共历史交错。事件3秒是夹具等待预算，先量化race与轮询成本再定修法；产品250ms/800投递门及权限/恢复合同保持。28票55AC、DAG和用户现场后验边界不变。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16-logs/map21-fixture-maintenance.md</Path>。当前不修改事件永久测试与产品实现。
