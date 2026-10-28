---
schema_version: 3
plan_contract_version: 1
skill_scan: "2026-10-25: scanned .agents/skills/*/SKILL.md and AGENTS.md; evidence/skill-scan.json; dev applies, ui by actual interface scope; no dedicated Go skill"
skill_bindings: [{"id":"dev","path":"<Path>.agents/skills/dev/SKILL.md</Path>","sha256":"5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293","phase":"implement","operation":"明确附加资料、逐跳授权与 Host 资料能力：实现、边界与风险验证","inputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/05-sources-grants-host.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>"],"outputs":["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-05.md</Path>","适用命令回执与可回读实现快照"],"required":true,"on_failure":"block-ticket","references":[{"path":"<Path>.agents/skills/dev/references/architecture.md</Path>","sha256":"0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/testing.md</Path>","sha256":"1f7c35977291cb15b9e4e0841ca2c7f7b1406daa564b6ef0814e6945131ff65b","when":"实施本票对应职责或验证触发时"},{"path":"<Path>.agents/skills/dev/references/licensing.md</Path>","sha256":"09d2969a169b9abe7392acc94d0d7be8050bbb56cd22e6560fce75d8d8a60e14","when":"实施本票对应职责或验证触发时"}]}]
resource_claims: ["huhu-bot:sources-grants-host","huhu-bot:provenance-and-revocation","huhu-bot:read-delivery-fence"]
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-10-25-huhu-bot-architecture"
id: "T-05"
title: "明确附加资料、逐跳授权与 Host 资料能力"
status: "in_progress"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "跨进程、持久化、权限或并发不变量需要故障窗口及恢复证据"
ready: true
risk: "high"
blocked_by: ["T-01","T-02"]
contract_ids: ["AC-022","AC-024","AC-054"]
owner: "/root"
expected_changes: ["<Path>native/huhubot/internal/domain/access/grants/**</Path>","<Path>native/huhubot/internal/application/access/grants/**</Path>","<Path>native/huhubot/internal/application/access/context/**</Path>","<Path>native/huhubot/internal/adapters/outbound/hostbridge/read/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/005-grants.sql</Path>","<Path>native/huhubot/tests/contract/access/**</Path>","<Path>src/modules/huhubot/platform/obsidian/sources/**</Path>","<Path>src/modules/huhubot/services/host-read/**</Path>","<Path>scripts/obsidian-acceptance/huhu-bot-sources.mjs</Path>"]
writable_paths: ["<Path>native/huhubot/internal/domain/access/grants/**</Path>","<Path>native/huhubot/internal/application/access/grants/**</Path>","<Path>native/huhubot/internal/application/access/context/**</Path>","<Path>native/huhubot/internal/adapters/outbound/hostbridge/read/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/005-grants.sql</Path>","<Path>native/huhubot/tests/contract/access/**</Path>","<Path>src/modules/huhubot/platform/obsidian/sources/**</Path>","<Path>src/modules/huhubot/services/host-read/**</Path>","<Path>scripts/obsidian-acceptance/huhu-bot-sources.mjs</Path>"]
read_only_paths: ["<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>","<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>","<Path>AGENTS.md</Path>","<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>src/modules/huhubot/core/protocol/connection.ts</Path>","<Path>src/modules/huhubot/core/protocol/connection.test.ts</Path>","<Path>src/modules/huhubot/core/protocol/method-validation.test.ts</Path>","<Path>src/modules/huhubot/platform/desktop/transport/runner.test.ts</Path>","<Path>src/modules/huhubot/core/protocol/method-validation.ts</Path>"]
shared_paths: ["<Path>contracts/hap/v0.1/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>src/modules/huhubot/core/protocol/connection.ts</Path>","<Path>src/modules/huhubot/core/protocol/connection.test.ts</Path>","<Path>src/modules/huhubot/core/protocol/method-validation.test.ts</Path>","<Path>src/modules/huhubot/platform/desktop/transport/runner.test.ts</Path>","<Path>src/modules/huhubot/core/protocol/method-validation.ts</Path>","<Path>native/huhubot/internal/application/access/context/**</Path>","<Path>native/huhubot/internal/application/access/grants/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path>","<Path>native/huhubot/tests/contract/access/**</Path>","<Path>src/modules/huhubot/platform/obsidian/sources/**</Path>"]
shared_path_owners: ["<Path>contracts/hap/v0.1/**</Path> => T-01","<Path>native/huhubot/internal/application/api/**</Path> => T-01","<Path>native/huhubot/internal/protocol/hap/**</Path> => T-01","<Path>native/huhubot/go.mod</Path> => T-01","<Path>native/huhubot/go.sum</Path> => T-01","<Path>src/modules/huhubot/api.ts</Path> => T-01","<Path>src/modules/huhubot/core/protocol/connection.ts</Path> => T-01","<Path>src/modules/huhubot/core/protocol/connection.test.ts</Path> => T-01","<Path>src/modules/huhubot/core/protocol/method-validation.test.ts</Path> => T-01","<Path>src/modules/huhubot/platform/desktop/transport/runner.test.ts</Path> => T-01","<Path>src/modules/huhubot/core/protocol/method-validation.ts</Path> => T-01","<Path>native/huhubot/internal/application/access/context/**</Path> => T-05","<Path>native/huhubot/internal/application/access/grants/**</Path> => T-05","<Path>native/huhubot/internal/adapters/outbound/sqlite/grants/**</Path> => T-05","<Path>native/huhubot/tests/contract/access/**</Path> => T-05","<Path>src/modules/huhubot/platform/obsidian/sources/**</Path> => T-05"]
---

# Ticket T-05：明确附加资料、逐跳授权与 Host 资料能力

- **总体 Map：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。
- **上游 Spec：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；ADR-013、016、020、023；用户 LOG-042。
- **完成 Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-05.md</Path>（实施后创建，本轮没有实施通过记录）。
- **执行入口：** 获得实现授权后调用 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>，Lead/实现者按 Map → 适用项目 Skill → 本票读取；I 负责实现、检查点、独立双轴审查与 Lead Evidence。本计划不授权提交/发布。

<a id="goal-source"></a>

## 目标与来源

用户附加的资料在发送时固定来源/视图/修订；切换页面不换资料，扩大范围或换接收方必须通过真实授权。

代码基线为 `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；Bot 的 Go/module/contracts 路径均待本 change 创建，不把新测试命令说成当前已有。真实生产消费者是 BotClient、对应应用 API 及模块 UI/宿主能力，具体调用链按下列步骤落地。

**开源参考：** [REF-03 liliMozi/openhanako](https://github.com/liliMozi/openhanako/tree/9a6cabf8c513db5edc6cf8179a538c9075885c6e)；[REF-04 CopilotKit/OpenBot](https://github.com/CopilotKit/OpenBot/tree/46642d6c91daa663bccff673595f4e12a419a496)。具体文件、许可、依赖与已知限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 对应 REF。遇到本票未覆盖的陌生点，实施前先按该文件的检索流程补比较，在本票 Evidence 记录采用/拒绝理由，再写代码；不从未经核验的示例直接复制。

<a id="behavior-scope"></a>

## 行为与范围

IN：SourceRef/ContextEnvelope、Grant、Host 注册/lease、选择/读取/搜索与外发过滤。REUSE：Vault API、现有 references.ts 的来源定位。OUT：Go 直接读 Vault、全库自动索引、HTTP。

### 有序实施步骤

1. 实现受信 Host 附着与 epoch，普通客户端/模型不得自报 Host；每个来源绑定 workspace/origin/lease/hash。
2. 默认只收明确附加项；文件夹/全库/Agent/endpoint 是额外范围，读取、摘要、召回和结果投递共用交集检查。
3. 实现宿主读取与修订快照，撤权后使缓存/派生上下文资格失效；内存缓存不是绕过入口。
4. 双 fake 入站客户端和真实 Obsidian 来源样本验证窗口切换、Host 掉线、目标模型变化与撤销。
5. 本票新增 huhu-bot-sources 宿主接缝探针，在一次性 Obsidian 库直接调用真实 Host adapter/API，无需等完整聊天页面；完整用户附加流程由 T-21/28 补 S8 证据。

<a id="acceptance"></a>

## 验收标准

- [ ] AC-022（本票主责）：在读取/外发前拒绝或过滤，不借 B 更大权限，不直接读另一 Bot 私有库。
- [ ] AC-024（本票主责）：默认仅两份进入模型，origin/revision 固定；全库需新授权，撤权后过滤。
- [ ] AC-054（本票主责）：同一用例/DB决定 busy/幂等；普通客户端不能成 Host，离线不直写 Vault。

复合 AC 的完整通过还需 Map 标出的其他接缝 Evidence；本票不得把局部通过记为整个 AC 或整个 change 完成。

<a id="verification-method"></a>

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
| --- | --- | --- | --- | --- |
| 正常主路径 | 公共 API/持久状态 | 两附加笔记进入待发上下文，其余笔记没有读取/模型外发；同一个用例对两个客户端给出相同判断。 | 得到 Spec 对应外部结果；回执、消息、状态相互一致 | 本票 Evidence 的正常记录 |
| 失败与竞争 | 实际影响的故障窗口 | 撤权、Host 断线/租约更新、伪造 absolute path/Host 身份；明确 denied/unavailable，不退回 Go 文件访问。 | 错误可见、无越权/重复效果/假持久成功 | 本票 Evidence 的失败记录 |
| 回归边界 | 现有消费者＋新接缝 | 资料传给权限更大 Bot 仍不能扩权；只读来源引用打开提示内容修订变化。 | 既有合同保持，新行为不绕过共同边界 | 本票 Evidence 的回归记录 |
| 可复跑入口 | 本票创建/维护的 suite | 在 <Path>native/huhubot/</Path> 执行 `go test ./tests/contract/access/... -count=1`；关键并发路径加 `-race`（目标工具链支持时），回读每一 fault point 的持久状态 | 原始命令、输入、退出码与断言可回读；不以 skip 代替通过 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-05.md</Path> |

- **E2E disposition：** required。真实 Obsidian 两窗口附加/切换/撤权；Lead 核对模型捕获器收到的来源和 Host lease。
- **运行环境：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/README.md</Path> 指定的唯一 change-workspace（current checkout）。Lead-owned E2E 使用固定源码/构建/配置和一次性数据，协作者复用同一工作区；没有单票 worktree。
- **工程检查：** 按 dev 测试选择表，仅跑适用项；生产 TS/TSX 改动需 lint/build，样式/i18n/边界改动跑相应检查。共享生成物由 T-27 串行更新，不能因未获该文件写权省略 build。`pnpm check:native` 仍只证明 Rust PTY。

<a id="execution-constraints"></a>

## 执行约束

路径/深度/资源/依赖与 Skill 调用以 frontmatter 为权威。预测路径实际不符时先由 Lead 改本票及 Map、校验 ownership 后再写；不创建空壳文件来凑路径。项目内部链接用完整 Path。模型的工具 schema/prompt/返回有变化时，检查模型真实收到的输入以及空结果、错误、分页/截断和取消行为。

共享 API/schema/go.mod 归 T-01；模块注册/组合入口归 T-20；根构建输出/依赖通知/当前工程文档归 T-27。消费者提出精确改动请求，owner 在受控窗口更新并重验，不能靠新建平行 API 或重复数据表绕过 owner。SQLite migration 使用本票编号命名；序号不表示可以跳过依赖，迁移注册/顺序由 T-01 协调，提交 schema 变更串行。

调用 skill_bindings 中的真实技能，并在完成 Evidence 的 `Skill Execution Records` 记录 ID/phase/operation/sha256/status/可回读证据；阅读入口不是执行通过。若 T-27 同步现行规则造成摘要改变，先比较变更、重绑受影响票并失效相关验证，不继续沿用旧摘要。

## 未决事项与风险

上下文内容可能敏感；测试仅用一次性库哨兵文本，失败停止外发，不用生产 Vault 进行破坏验证。

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


## 当前联合维护窗口（Map14 / Goal13）

Map14/Goal13：LOG072已接纳事件/审批代码门。现开启T07与T11/T12联合实施及原T01/T02/T03/T05/T06必要维护；T27先提供宿主最小回执根/排除/数据文档窗口，完整发行资产仍最终重建。先冻结唯一API/Port/SQL形状，再由原owner分别消费。实际派遣以各TASK工具回执为准，当前准备不代表已开工或通过。真实模型/Obsidian/目标OS用户后验。

foundation_go拥有T07 Go和原T01公共API/schema/Go传输/路由/装配/迁移注册、T02配置/pin、T03执行/线程/取消屏障、T06 Broker/effects/Blob及T01迁移前DB+引用Blob恢复集；credential_provider拥有T11/T12新业务和011/012正文、原T05 Go lineage/授权，以及原T02 sqlite/assistant/credentials.go临时配置引用删除guard（其余凭证实现只读）；T04保持done只读，若确有事件生产改动先由Root另开精确窗口；foundation_client拥有T07 TS HostWrite/Obsidian adapter与原T01 TS协议生命周期、原T05来源目标准备；build_integration只持T27精确共享路径窗口。原owner职责不转移，不写旧SQL或凭证实现。

共享run-admission-contract先由唯一API owner与业务owner冻结Port/事务边界，再在各自目录消费；每个共享文件单writer。T11/T12同一业务writer，011/012正文与注册按实际下一版本串行。T12原开工依赖T11调整为与T11相同已完成上游；原因是T11合法受理本就需要T12真实准入策略。必须先冻结T11合同/缺策略默认拒绝，再完成T12真实策略与共同消费者，两票联合验收后才供T13使用，禁止以恒放行或部分Done绕过产品合同。T07独立但共享合同由同一原owner集成。


## 群聊维护窗口（Map17 / Goal16）

Map17/Goal16：072候选3联合代码门已真实接纳；开启T13群聊及原T01/T02/T03/T04/T05/T11/T12必要维护。先冻结可信用户批量受理、群成员代/历史范围、公共发布与同一Executor合同，再由原owner消费。T06/T07只读复用，T16仍等待T13；28票/55AC、DAG与真实操作用户后验边界不变。准备不代表实际派遣或通过。

foundation_go唯一维护T01公共API/schema/Go路由/装配/迁移注册及生成api.ts、T02配置pin与群usage、T03会话/执行/编排根；credential_provider拥有T13新group目录和013正文、原T04 Go投递、T05授权以及T11/T12成员资格/预算/结果消费；foundation_client拥有T13 mentions、原T04 TS和T01 TS协议消费者。每文件单writer；没有新的写权自动扩张，T06效果及T07 Host保持只读。

060研究仅提供旧时点索引，最终漂移文件须回读当前源码。显式@B/C由可信用户批量受理边进入同一树，不能虚构A模型/claim/来源Grant或受模型delegate allowlist限制；各目标的资格/Grant/成员代须同Tx全部验证。普通无@仍只A。群当前成员及历史范围谓词贯穿Context、真实Dispatch、公共结果入库与物理投递，含无SourceRefs正文；remove/rejoin不能恢复旧代任务。用户已合法公开历史与撤销的未发布正文区分。公共seq和Run事件seq分离；局部取消只影响当前群绑定子树。013是唯一新迁移正文，既有001/002/003/005/006/011/012冻结。


## Map32 当前记忆消费者维护

从原已接纳代码门精确重开，原credential_provider按115/123与<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/memory-consumers-map32.md</Path>和实际128 TASK维护；其他历史目录不是本次全写权。原证据保留，新共同门未运行，用户真实操作后验。


### Map34 资源实例说明

本票当前仅127限定TS字节校验或128限定Go数据库组件实例，依据 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-14-logs/independent-ts-go-window-map34.md</Path> 的真实输入分离可并行。共享API/schema/fixtures只读；新增生成、全仓或跨语言harness检查先回Root串行，不扩大原TASK写集。
