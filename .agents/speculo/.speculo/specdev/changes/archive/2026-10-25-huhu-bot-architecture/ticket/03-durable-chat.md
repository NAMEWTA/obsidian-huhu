---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293","phase":"implement","operation":"单聊意图原子受理、历史与可靠终结：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/03-durable-chat.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-03.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"1f7c35977291cb15b9e4e0841ca2c7f7b1406daa564b6ef0814e6945131ff65b","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"09d2969a169b9abe7392acc94d0d7be8050bbb56cd22e6560fce75d8d8a60e14","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:durable-chat","huhu-bot:run-admission-contract"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-huhu-bot-architecture"
id: "T-03"
title: "单聊意图原子受理、历史与可靠终结"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: true
risk: "high"
blocked_by: ["T-01","T-02"]
contract_ids: ["AC-005","AC-027","AC-032"]
owner: "/root"
expected_changes: ["<Path>native/huhubot/internal/domain/conversation/direct/**</Path>","<Path>native/huhubot/internal/domain/execution/run/**</Path>","<Path>native/huhubot/internal/application/conversation/direct/**</Path>","<Path>native/huhubot/internal/application/execution/commands/**</Path>","<Path>native/huhubot/internal/application/execution/executor/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/003-conversation-run.sql</Path>","<Path>native/huhubot/tests/contract/chat/**</Path>"]
writable_paths: ["<Path>native/huhubot/internal/domain/conversation/direct/**</Path>","<Path>native/huhubot/internal/domain/execution/run/**</Path>","<Path>native/huhubot/internal/application/conversation/direct/**</Path>","<Path>native/huhubot/internal/application/execution/commands/**</Path>","<Path>native/huhubot/internal/application/execution/executor/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/003-conversation-run.sql</Path>","<Path>native/huhubot/tests/contract/chat/**</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go</Path>","<Path>native/huhubot/internal/application/assistant/ports.go</Path>","<Path>native/huhubot/internal/application/assistant/service.go</Path>","<Path>native/huhubot/tests/contract/assistant/**</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go</Path>","<Path>native/huhubot/internal/application/assistant/ports.go</Path>","<Path>native/huhubot/internal/application/assistant/service.go</Path>","<Path>native/huhubot/tests/contract/assistant/**</Path>","<Path>native/huhubot/internal/application/execution/executor/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path>","<Path>native/huhubot/internal/domain/execution/run/state.go</Path>","<Path>native/huhubot/tests/contract/chat/**</Path>","<Path>native/huhubot/internal/application/conversation/direct/service.go</Path>","<Path>native/huhubot/internal/application/conversation/direct/ports.go</Path>","<Path>native/huhubot/internal/domain/execution/run/**</Path>","<Path>native/huhubot/internal/application/conversation/direct/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path>","<Path>native/huhubot/internal/domain/conversation/direct/**</Path>","<Path>native/huhubot/internal/application/execution/commands/**</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go</Path> => T-02","<Path>native/huhubot/internal/application/assistant/ports.go</Path> => T-02","<Path>native/huhubot/internal/application/assistant/service.go</Path> => T-02","<Path>native/huhubot/tests/contract/assistant/**</Path> => T-02","<Path>native/huhubot/internal/application/execution/executor/**</Path> => T-03","<Path>native/huhubot/internal/adapters/outbound/sqlite/execution/**</Path> => T-03","<Path>native/huhubot/internal/domain/execution/run/state.go</Path> => T-03","<Path>native/huhubot/tests/contract/chat/**</Path> => T-03","<Path>native/huhubot/internal/application/conversation/direct/service.go</Path> => T-03","<Path>native/huhubot/internal/application/conversation/direct/ports.go</Path> => T-03","<Path>native/huhubot/internal/domain/execution/run/**</Path> => T-03","<Path>native/huhubot/internal/application/conversation/direct/**</Path> => T-03","<Path>native/huhubot/internal/adapters/outbound/sqlite/conversation/**</Path> => T-03","<Path>native/huhubot/internal/domain/conversation/direct/**</Path> => T-03","<Path>native/huhubot/internal/application/execution/commands/**</Path> => T-03"]
---

# Ticket T-03：单聊意图原子受理、历史与可靠终结

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-006–008；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-03.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

<a id="goal-source"></a>

## 目标与来源

通过公开 API 发送一条消息并取得持久回执，fake Engine 完成后从历史读取同一结果；超时重试和崩溃不制造第二收费意图。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-01 cloudwego/eino](https://github.com/cloudwego/eino/tree/0a5ca53b9d3bf7b661dccc863465ec568a421eea)；[REF-04 CopilotKit/OpenBot](https://github.com/CopilotKit/OpenBot/tree/46642d6c91daa663bccff673595f4e12a419a496)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

<a id="behavior-scope"></a>

## 行为与范围

IN：direct Session、StartRun/FinalizeRun、accepted 扫描、会话占用、完整/部分消息和分页/归档。REUSE：T-01 UoW/API、T-02 配置。OUT：真实模型、群成员、UI、自动 retry。

### 有序实施步骤

1. 把根意图、幂等回执、配置/SourceRef、Session 修订/占用和首事件纳入同一短事务；优先回读同 key 回执再判断 busy。
2. 实现 fake Engine 驱动的 accepted→preparing→running→终态执行，事务外调用引擎；提交后唤醒仅优化，后台扫描补偿。
3. 终结事务保存消息、usage、终态与释放占用；失败保留旧持久事实，不向客户端报告已保存。
4. 实现历史分页/归档和编辑后新意图关联；所有读取接入当前访问检查 Port，测试故障注入。

<a id="acceptance"></a>

## 验收标准

- [ ] AC-005（本票主责）：新意图 busy 且草稿保留；原意图只返回原回执。
- [ ] AC-027（本票主责）：同输入一次提交、异输入冲突；扫描不丢消息/任务，终结失败不报保存成功。
- [ ] AC-032（本票主责）：无虚假持久成功，重启依据旧事实核查，Session 不产生双占用。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

<a id="verification-method"></a>

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态 | 同 key 同输入重复/并发返回相同 Run；新 key 在忙时 SESSION_BUSY；终结后历史完整且下次可发送。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | 同 key 异输入冲突；提交与唤醒间 kill、磁盘满或终结提交失败后重启不丢意图、不双占用。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | 读取历史、归档、修改人格不触发模型；新的相同正文意图不会被内容 hash 吞掉。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 在 <Path>native/huhubot/</Path> 执行 `go test ./tests/contract/chat/... -count=1`；关键并发路径加 `-race`（目标工具链支持时），回读每一 fault point 的持久状态 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-03.md</Path> |

- **E2E disposition：** required。以公共命令/查询进入真实 Runner/SQLite（相关票同时经过 TS/Go stdio），固定故障输入，Lead 对持久回执、状态与外部效果作独立回读；无需为纯后端票伪造 UI 验收。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。

<a id="execution-constraints"></a>

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

DB 事务不能包围网络调用；出现不确定终结时保留原 intent/receipt，禁止用新 key 兜底。

**停止/恢复：** 只暂停受影响闭包，保存固定输入、原错误、回执/CP/变更快照；回到原事务网关核查后再续做，不靠新 idempotencyKey、删除数据或更换执行者消除失败。任何改变外部行为、权限、数据生命周期或首版范围的方案先回 G/S 明确，局部实现选择可在已批准合同内完成。

**证据失效：** 代码/构建 head、锁文件、schema、配置/样本、Provider model/endpoint、OS、DESIGN 或 Skill 摘要改变时重跑实际受影响证据与下游；保留旧记录并标明失效原因，不重复全量跑已有效的无关检查。

**就绪说明：** 无产品高影响未决。本票合同级 ready 不等于可派单：上游 Spec 因 P 浏览器技术证据缺失仍未 Ready；依赖完成、执行授权及 owner 指派也由总控另行检查。

### 未决问题

无。

## 当前交付验收口径（LOG-051）

用户最新 Goal 要求本轮全面实现并在代码层面总验收，真实操作自行进行。此票的行为、权限、数据与故障合同保持；代码实现、适用自动化验证和独立代码审查是本轮完成/下游开工条件。真实 Provider、Obsidian 交互和用户目标 OS 操作另列 user-owned / not-run，不冒充原 AC 的现场验收通过，也不阻塞独立代码工作。

## 当前实施接缝（Map9 / Goal8）

T01/T02依赖已在LOG060接纳为代码done/verified，当前由原owner打开联合维护，不是借消费者名义越过原owner。026持T03与T01 Go公共合同/迁移注册写权，并维护T02精确pin/Usage接缝；027仅T05 Go自有目录/005 SQL正文；028仅T05 TS自有目录及T01明确read/search路由与相关测试维护。共享公共API先冻结，消费方不得复制DTO；002等历史迁移不改。SQL文件003/005分别注册实际Version3/4，未来004分配下一个真实版本；注册只有026写入，不能空造004。两票数据库验证使用独立临时Profile，不共享运行实例。读回031预检与各自TASK；正式状态和Evidence由Lead维护。


## 当前原owner维护窗口（Map11 / Goal10）

LOG066已接纳T01/T02/T03/T05联合r2代码门。042持T06与原T01公共合同/Go传输/装配/006注册、原T03执行器暂停和正常continuation；043持T04 Go及原T05当前读权限/撤权/到期fence；044持T04 TS及原T01严格协议codec/生命周期。共享API/schema先由042冻结再消费，所有生产写入仍需Root实际派遣。T03/T06 run-admission-contract由同一原owner在受控窗口维护，无两个writer；SQL006正文Version5，旧SQL不改，不空造004。原T02已验收pin/Usage仅消费，不再开放写入；新增必要共享路径先精确请求。正式状态由Root维护。


## 历史分页出队保护维护（Map13 / Goal12）

042沿原T03维护direct/service.go（必要时ports.go），从实际过滤后的HistoryPage提取可信可见message IDs，放入仅Go内部、json忽略的delivery标记；沿原T01维护hap/conversation.go复制到已有受保护响应。唯一内部合同为DeliverySubject{Kind:run|message,ID}，043在同gate从持久message.source_json及关联Run owner/recipient/scopes/grants精确重验，scope仅保留该消息来源实际引用的handles，普通用户消息不受后来继承来源误拒。旧SQL/原会话存储查询不改，不新增wire字段；来源已撤权时丢弃旧响应并允许客户端重新读取合法子集。guard按batch8×page100固定800、总250ms/到期预算有界，验证超过8个Run的合法页面与其中一个Run撤权，不能无故拒绝正常长历史。


## 当前联合维护窗口（Map14 / Goal13）

Map14/Goal13：LOG072已接纳事件/审批代码门。现开启T07与T11/T12联合实施及原T01/T02/T03/T05/T06必要维护；T27先提供宿主最小回执根/排除/数据文档窗口，完整发行资产仍最终重建。先冻结唯一API/Port/SQL形状，再由原owner分别消费。实际派遣以各TASK工具回执为准，当前准备不代表已开工或通过。真实模型/Obsidian/目标OS用户后验。

foundation_go拥有T07 Go和原T01公共API/schema/Go传输/路由/装配/迁移注册、T02配置/pin、T03执行/线程/取消屏障、T06 Broker/effects/Blob及T01迁移前DB+引用Blob恢复集；credential_provider拥有T11/T12新业务和011/012正文、原T05 Go lineage/授权，以及原T02 sqlite/assistant/credentials.go临时配置引用删除guard（其余凭证实现只读）；T04保持done只读，若确有事件生产改动先由Root另开精确窗口；foundation_client拥有T07 TS HostWrite/Obsidian adapter与原T01 TS协议生命周期、原T05来源目标准备；build_integration只持T27精确共享路径窗口。原owner职责不转移，不写旧SQL或凭证实现。

共享run-admission-contract先由唯一API owner与业务owner冻结Port/事务边界，再在各自目录消费；每个共享文件单writer。T11/T12同一业务writer，011/012正文与注册按实际下一版本串行。T12原开工依赖T11调整为与T11相同已完成上游；原因是T11合法受理本就需要T12真实准入策略。必须先冻结T11合同/缺策略默认拒绝，再完成T12真实策略与共同消费者，两票联合验收后才供T13使用，禁止以恒放行或部分Done绕过产品合同。T07独立但共享合同由同一原owner集成。


## 群聊维护窗口（Map17 / Goal16）

Map17/Goal16：072候选3联合代码门已真实接纳；开启T13群聊及原T01/T02/T03/T04/T05/T11/T12必要维护。先冻结可信用户批量受理、群成员代/历史范围、公共发布与同一Executor合同，再由原owner消费。T06/T07只读复用，T16仍等待T13；28票/55AC、DAG与真实操作用户后验边界不变。准备不代表实际派遣或通过。

foundation_go唯一维护T01公共API/schema/Go路由/装配/迁移注册及生成api.ts、T02配置pin与群usage、T03会话/执行/编排根；credential_provider拥有T13新group目录和013正文、原T04 Go投递、T05授权以及T11/T12成员资格/预算/结果消费；foundation_client拥有T13 mentions、原T04 TS和T01 TS协议消费者。每文件单writer；没有新的写权自动扩张，T06效果及T07 Host保持只读。

060研究仅提供旧时点索引，最终漂移文件须回读当前源码。显式@B/C由可信用户批量受理边进入同一树，不能虚构A模型/claim/来源Grant或受模型delegate allowlist限制；各目标的资格/Grant/成员代须同Tx全部验证。普通无@仍只A。群当前成员及历史范围谓词贯穿Context、真实Dispatch、公共结果入库与物理投递，含无SourceRefs正文；remove/rejoin不能恢复旧代任务。用户已合法公开历史与撤销的未发布正文区分。公共seq和Run事件seq分离；局部取消只影响当前群绑定子树。013是唯一新迁移正文，既有001/002/003/005/006/011/012冻结。


## 取消与恢复维护（Map20 / Goal19）

Map20/Goal19：078修复后的079群聊完整候选已由Root接纳；开启T16取消/恢复及原T01/T03/T04/T06/T11/T12必要维护。T02/T05/T07/T13先只读复用，新增路径须实际最小请求。先冻结唯一资格/检查/领取/关闭合同，再消费并共同验证；28票55AC、原DAG和用户真实操作后验不变。

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16-logs/recovery-window-map20.md</Path>，SHA256 `3befb9dca2031f81a4e3a0e02577cc80115955d2ef8ee6fd191faa6bedbdca63`。仅按该联合窗口与实际原生TASK分配写入；完整原owner目录不是自动扩写指令。


## Map23 默认装配负控维护

本轮仅原owner维护tests/contract/chat/workflow_test.go的空模型reason预期及必要无attempt断言，消费T08真实装配；无T03生产改动。原T16/G1基线复用，此测试接缝随T08新共同输入验收，真实操作仍用户后验。详见evidence/T-08-logs/default-model-fixture-map23.md。


## Chat审查修复维护（Map24 / Goal23）

精确窗口见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-08-logs/chat-repair-map24.md</Path>；仅原owner在实际100/101派遣后写入。098两项真实红保留，修复后共同代码门，用户真实操作后验。


## Map31 当前记忆窗口

本轮从已接纳G2代码基线继续，精确范围和原owner见<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/memory-window-map31.md</Path>。115与123接纳为实施合同，未运行的新消费者不算通过；全部历史验收保留，正式开工以实际TASK/原生派遣为准。

### Map37 历史与运行消费者窗口

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/history-runtime-window-map37.md</Path>定义原direct/Run/Core/generator owner的134后继写集及128窄资格端口。133组件冻结路径只读；generation和默认Core检查继续Root串行。
