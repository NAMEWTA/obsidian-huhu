# T11/T12 委派、调用树与预算接缝预检

Session: 20261025T043239Z
Task: 041-delegation-preflight
Status: completed

## 聚焦交接

结论：当前持久受理、配置 pin、有效来源追踪和 accepted 扫描可以复用；但 production 仍只有直接会话根 Run。T11/T12 需要在原 execution/config/access 的事务边界上扩展子 Run、隔离工作线程、当前逐跳授权与预算消费者，不能用现有 runs.start 伪造目标私聊、嵌套 SDK AgentTool 或第二个队列替代。下文明确区分**当前事实**与**建议接缝**；协议中的未来方法目前未装配，本报告不将其缺失当作现有可利用漏洞。

初始 TASK 指定 Map 10 / Goal 9、HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、040 冻结 r2（131 文件/36 来源，标识 SHA `78581af912849fe0591b3bb697859a903e167b2642a099d4185d95c7e2d81588`）。该冻结标识来自 Lead，不是本研究对独立审查的认证。报告收束期间 Lead 通知 040 已接纳、042/043 已开工；本任务仍保持原只读范围，未读取或改写其新实现。自己采样的 57 个来源摘要和交回差异记录在 observations.json。034/036 的审批、CP、pin、Host 证据结论复用，不重新展开 Eino CP 或 Obsidian 研究。

### 1. 当前实际调用链与不能直接复用的地方

```text
TS BotClient / HAP runs.start
  -> Facade.Conversation -> direct.Service.StartRun
  -> execution.Store.StartRun 的同一个 SQLite Tx
       epoch/原回执 -> Session 可见/占用/revision
       -> 持久 Agent PinInTx -> 用户消息
       -> accepted Run + 初始及 effective 来源 -> Grant 检查
       -> Session 占用 + accepted event + command receipt
  -> 提交后 Wake（可丢；100ms 扫描补偿）
  -> Executor Claim accepted -> preparing + 固定 pin
  -> PrepareContext -> ModelHistory 按当前接收方过滤
       -> 合并实际历史来源/Scope/Grant
  -> MarkRunning 同 Tx 复查 read/send 并保存 effective_*
  -> Engine.Run
  -> Finalize 同 Tx：消息/usage/Run/event/释放占用及终态 pin
```

来源：`native/huhubot/internal/application/conversation/direct/service.go:85,126`、`adapters/outbound/sqlite/execution/store.go:47`、`application/execution/executor/executor.go`、`adapters/outbound/sqlite/execution/executor.go:46,84,126`。以下 Go 短路径均相对 `native/huhubot/internal/`。

| 当前事实 | 具体源码 | 后续不可直接套用 |
| --- | --- | --- |
| execution_runs.session_id 必须引用可见 conversation_sessions；后者 kind 仅 direct；非终态唯一索引覆盖同 Session 的全部 Run | `sqlite/migrations/003-conversation-run.sql:1,31,59` | 把 child 塞进父 Session 会冲突；另建 B 私聊会泄漏隔离边界且成为假前台意图。需明确 visibleSessionId 与 workThreadId，根占用和线程占用分开。 |
| readRun 固定 RootRunID=r.ID；数据库没有 parent/root/workThread 列或委派表 | `sqlite/execution/store.go:147–169` | TS Run 有 parent/root 字段不代表树已持久实现。 |
| Claim 查询所有 accepted，但当前唯一生产写者只创建根 Run；加载固定 Agent pin、Intent 和 UserMessageID | `sqlite/execution/executor.go:46–83` | 新 child accepted 行须有可读的执行配置/身份/线程/ContextEnvelope loader；只新增 Delegation 行不会执行。 |
| EngineInput.Agent 是持久 Agent；config_snapshot_pins.agent_id FK 到 agents；ReadPin 从 persona/model revisions 还原 | `api/conversation.go:109`、`sqlite/migrations/002-assistant.sql:31`、`sqlite/assistant/store.go:481–545` | temporary 不能通过 agents.create 取得 pin，也不能伪造 sponsor AgentID 搭配另一 endpoint。 |
| Executor 固定 2 个 slots、每次 execute 2 分钟；只有 Run 调用，Resume 未被调用；suspended 暂映 blocked | `application/execution/executor/executor.go:43,79`、`domain/execution/run/state.go` | 2 是现有根执行保护，不是 Spec 的根 4/Profile 8 子执行额度。父在槽内同步等 child 会耗尽 worker；waiting_children 与 continuation 必须接 T06 的同一执行器。 |
| Finalize 不查询后代/审批/未知效果，finished 直接映 succeeded | `sqlite/execution/executor.go:126` | 子任务完成不等于根可终结；不能复制 Finalize 到 collaboration 形成第二套终态权威。 |
| RunUsage 只有可选 input/output token 和 estimated；缺失计数保留未知，已有 measured zero 区分 | `api/conversation.go:56`、`sqlite/execution/executor.go:121–149` | 最终 usage 汇总不是调用前硬预算；没有 reservation、每模型请求 attempt 或根/用途归属。 |
| ContextAccess.ParentScope 存在；nil 仅适用于用户根意图，空非 nil 不授予来源；InParent 检查来源包含 | `api/access.go:128`、`application/access/context/service.go:61–137` | 当前 readRun 不重建 ParentScope；后续 child 重启后不可置 nil。ParentScope 检查也不等于完成 delegate/deliver/任务范围和目标能力检查。 |
| Grant 精确匹配 SessionID/TaskID、六元接收方、操作、当前撤权/到期 | `domain/access/grants/policy.go:24`、`sqlite/grants/access.go:25` | 把父 GrantIDs 复制给新 child TaskID 不会自动有效；清空 task/session 或改为父身份绕过同样错误。 |
| Agent disable 阻止新 pin；已受理 Run 使用旧 pin，当前测试明确保留其受权来源与历史 | `sqlite/assistant/store.go:325,493`、`tests/contract/access/access_test.go:615` | 新委派必须重新核对目标 enabled；不能把已受理执行的冻结配置全部替换成当前配置，也不能用旧 pin 给停用目标发新任务。 |
| Facade 没有 Collaboration；HAP 未注册 collaboration 方法，默认 METHOD_NOT_AVAILABLE | `api/types.go:99`、`adapters/inbound/hap/router.go:137` | schema 未来形状不是已实现功能。当前 go.mod 也未装 Eino 生产 adapter。 |

### 2. 目录、调用身份与 existing/temporary

**当前合同问题，尚无生产泄露行为：** TS `api.ts:434` 的 collaboration.discover 返回 Page<Agent>；Agent 包含 Persona、ModelBinding、credentialRef 等配置字段。实现前由 T01 改成专用 DirectoryEntry，限 ID、可发现简述、可用性、能力摘要、revision/nextCursor，不能把 Assistant.List 原结果交模型。目录过滤发生于 prompt 注入/分页返回前，按当前调用者/目标协作资格过滤；空页、无可见目标、失败、截断须可区分。分页 cursor 绑定调用者、查询与目录/策略版本；重名只按明确 ID 选定，不能猜名称。描述本身仍是资料，不赋予权限。

**建议 trusted execution context：** 从已领取 Work/claim 和持久 Run 取得 profile/principal、root/parentRun、调用者执行身份、workThread、工具意图 ID、冻结配置及当前策略、有效来源、预算账户。模型只给目标/任务/constraints/expectedOutput/显式上下文；不得自报 requesterAgentId、parent/root、depth、budget、approved 或 claim。普通客户端可提交已授权的用户动作/查询，但 runId 字符串不能使它冒充正在执行的模型。统一 CollaborationAPI 由 HAP 用户入口和受控 Broker 适配，内部 trusted actor 不从 JSON decode。

existing：固定目标 agentId、persona/model revision 与能力配置；创建新的隔离 workThread/child Run，不读取 B 私聊，不增加 agents 数量。B 自身可用权限不扩展父任务；其获准私有记忆召回继续走 Memory/来源边界，结果外发重新检查目的地。T14 尚未实现的记忆不在 T11 临时造全库读取替代。

temporary：保存 taskConfigId、sponsor、明确模型接收方、人格/工具请求、独立 workThread/任务记忆域及版本，重启可定位但不出现在持久 Bot 目录。当前 Agent-only pin 和 GrantRecipient.AgentID 不能直接承载这个区别；T02/T01/T05 需共同固定“临时执行 subject＋sponsor＋实际模型配置”的纯表示、配置持久保留及受权映射。不能以 sponsor 身份偷用其全部记忆/凭证，也不能允许模型提供任意 endpoint/credentialRef 后自动继承发送资格。缺少明确受权配置时拒绝该临时执行，不静默换模型。

proposeCreate 只生成有 ID/版本的受限草稿。确认仍通过用户的 assistant 创建用例；模型工具表不提供 agents.create 的绕过入口。若要原子记录提案被消费与创建回执，需 T02 提供同 Tx 桥接，不能先标确认再独立创建。是否采用既有 agents.create 携带 proposal 关联或窄确认用例，由 T01/T02 收敛；不新增用户审批步骤，也不把返回草稿冒称已永久新增 Bot。

### 3. 委派受理、有效来源与父子事务

**建议单次原子受理（不是现有方法）：** 一个 application repository 调用，在 adapter 同一 UoW 中读取原命令/工具意图回执；相同意图返回原 delegation/child/thread，异输入冲突。然后检查父 claim/取消与效果准入门、真实 root/父关系、目标当前可见和 enabled、配置/能力、有效来源逐跳流向、深度/累计数/预算策略；同 Tx 提交固定 child 配置、ContextEnvelope、Delegation、workThread、child accepted Run、预算/计数引用、父子事件和回执。之后仅 Wake。已有 `base.WithinTx`/PinInTx/CheckInTx/AddEventInTx 可以组合，但公共 Application Port 不暴露 *sql.Tx，Tx 回调内不进入模型、Host 或另一个 WithinTx；当前 base 只有一个 DB connection，嵌套公共调用还会等待自身连接。

命令幂等继续沿 profile＋principal＋method＋idempotencyKey 与 command epoch；`commands.Hash` 去掉 transport commandId。模型调用应绑定稳定 logical tool invocation/effect 身份并随 CP 恢复保留；不能只用任务正文 hash 去重。相同参数的新用户任务/新逻辑工具调用仍是新意图，计入资源；同一调用的网络重投/Resume 不能换 key。重放先读回执但仍检查当前读取资格，不返回已撤权正文。

**effective 来源是关键现有资产。** 当前 ModelHistory 按新 Run 接收方及原记录 provenance 的 read/send 检查过滤，Executor 把实际采用历史的 Sources/Scopes/GrantIDs 合并，MarkRunning 同事务保存 effective_*；后续 Finalize 的助手消息和 History 读取使用这些事实。`tests/contract/chat/provenance_test.go` 已有重开后的来源传播用例（本研究未运行）。T11 的父范围必须从这些持久有效事实及当前工具已实际读入的来源构造，不只读取初始 source_json。未来工具搜索/记忆/摘要新增实际输入也须更新同一 provenance 机制，不能只改内存 ContextEnvelope。

ContextEnvelope.messageIds 必须解析为当前父线程确实可见/可外发的持久消息；excerpts 必须验证绑定的确切来源/范围，不能相信模型附一个 SourceRef 就证明文本归属。由模型根据多个私有输入生成的 task/question/result 不能靠空 sourceRefs 变无来源文字；保守继承实际有效输入的来源集合，或使用能够证明来源的受信摘录构造器。完整来源超限时拒绝/整项截断并告知，不能保留正文却截掉 provenance。

逐跳授权至少分四次：受理 child、领取/模型请求前、消息/结果发布前、读任务历史/投影前。父有效范围＋当前有效父 Grant＋目标受权配置/接收方＋任务/工作区＋操作交集必须全部成立；delegate 和 deliver 是已有操作值，当前生产路径仅用了 read/send/search，不能宣称它们已执行。父任务限定 Grant 如何随合法派生链作用于 child，应由 T05 根据持久 lineage 明确证明，而不是新增一个放大的 Grant、复制有效审批或将 ParentScope 置 nil。

结果投回 A 时使用 A 当前被允许的接收方和结果 provenance；B 对其输入有 read/send 不代表 A/群当前还能接收结果。撤权/移除成员后的旧回执可留核查，正文不得重新投递。直接 user History 可见与 model send 同意继续分开；既有 T05 区分要扩展到工作线程和消息结果，不能调用普通 History 来给模型拼上下文。

### 4. wait、通信、取消与终结的最小持久闭环

T11 delegate 返回 durable accepted ID，不在工具内无限等待一个内存 Promise。父需要子结果时，通过 T06 已规划的纯暂停/continuation Port 进入 waiting_children，保存兼容 CP 与待等任务/结果版本。T06 当前尚未装配，本报告不假设审批 Resolve/Engine.Resume 已存在。子完成或 reply 的事务写结果投递回执、可恢复 continuation 唤醒事实；同一 Executor CAS 领取后调用 Engine.Resume。两个子同时完成只能合并为一个合法父 continuation/代数，不能并发恢复同一 parent。

必须测试“child 在 parent 发布 wait 前已完成”：wait 发布事务读已完成投递，立即形成可消费 continuation，不能依赖未来内存通知。父等待审批/孩子/问答时释放模型执行槽，保留非终态配置 pin/工作线程占用；父工作完全终结才按共享 execution 事务释放。T06 正常审批 continuation 与 T16 崩溃手动恢复仍有原边界，不因加入 child 把已 running 的树重启后自动收费续跑。

notify 只持久投递，不自动模型唤醒；question 可以形成受根次数/预算/权限控制的应答执行；reply 指向原 delegation/workThread 并 CAS expectedRevision。区分 received/delivered、answered、task completed，不能把成功插消息当任务完成。任务终结后的新工作用新 Run 并明确关联，不修改旧 terminal。公开 AgentMessage 当前只有 from/to/text/time，缺 kind、thread/delegation、delivery/answer/completion 与 provenance，需 T01 补合同。已有 message.sourceRefs / reply.sourceRefs 只是入口数据，不能代替已验证传播来源。

调用树与等待图分别检查。深度沿真实 parent/root，环路沿 workThread/Run 等待边；同一 Bot 的不同隔离线程可以合法委派。notify 不加入等待边；question/reply/await-child 在建立等待边的同一 Tx 做可达性检查，两个并发对向等待不能各自通过。取消根在一个持久屏障后禁止本树新 child、message wake 和 model-call reservation，再覆盖所有已受理后代；只取消子树不波及同 Bot 无关 Session。取消与 child admission 竞争必须同 Tx/代数解决，不能只迭代一个旧内存 children 列表。

父 finished 不直接写 succeeded。T12 finalize 通过 T03/T06 共享原子终结接缝复查：无活动后代、未决审批、dispatching/unknown 效果；否则保持等待或以 failed/canceled＋effectsUnresolved/partial 明确结束。孩子失败可以形成可交付部分结果，但不能隐藏仍活动的后代。晚到可信效果核查可以追加事件，不能重开根状态或重复投递正文。Run/Delegation 共同投影任务状态，不新建可互相矛盾的“任务完成事实库”。

### 5. 限额和预算必须有真实出站消费者

Spec §3 的起点是子层深度 3、每根累计子任务 32、每根并发子执行 4、Profile 并发子执行 8、自动问答链消息唤醒 8；不是测得吞吐保证。T12 应冻结计数语义并在 hello/service.status 和根快照公布生效值/策略版本。当前 hello 仅 frame/batch，service.status 没这些字段。根为 0 层、累计任务完成后不返还累计数量；排队不占模型槽，waiting 状态不长期占用模型槽但仍属于未终结后代。并发子执行与每请求模型槽的精确释放点需在策略中显式表示，不能用现有 slots=2 或 status 非终态数量替代。单 Profile 全局额度由共享持久账户/有效领取事实协调，不是每个 root 各有 8。

**建议纯 Port，名称由原 owner 冻结：**

| 职责 | 最小输入/输出与实际消费者 |
| --- | --- |
| AdmissionPolicy / AdmitChild | 受信父/根/线程、目标配置、来源传播、当前取消代数、深度/数量/限额版本；在受理 Tx 原子检查并保留累计数/任务资格。T11 消费，T12 policy 提供；缺策略拒绝。 |
| ReserveModelCall | budgetAccountId、root/run、logicalCall/attemptId、用途、确定模型接收方与版本、受限输入/最大输出、当前有效来源/取消；原子预留并给单次出站 permit。 |
| BeginDispatch / SettleModelCall | permit 及具体请求身份，调用前再校验；用实际 usage/estimate/unknown 幂等结算、释放可证明的余量并保存观察依据。 |
| ThreadWait / DeliverResult / ClaimContinuation | 持久 workThread/Run/Delegation 版本、结果投递身份和来源、等待条件；T11/T12 用例经 T03/T06 同一 Executor 领取、Resume。 |
| CanFinalizeTree / CancelSubtree | 同事务读真实后代、等待、effect、approval、预算在途状态；由 execution 保持唯一 Run 状态与 event/pin 释放。 |

逐模型请求准入比 Engine.Run 粒度更细：一次 Engine.Run 内可能多次模型调用、工具回合、摘要和 SDK retry。只有结束时 RunUsage 无法阻止第二个请求；需要由未来 T08–T10 的受控 model-call adapter 在实际 network call 前消费 T12 permit，辅助摘要/问答/后续记忆也走同一入口。SDK 自动重试关闭或每次尝试单独记账；不能用总量 observer、工具调用数或 prompt 要求“少调用”冒充硬门。当前未装模型 adapter，T11/T12 自动化用 fake Engine/model-call consumer 验证真实预约链；三协议实际 adapter 接入另按各票验收。

预算计费账本区分 root/run/用途/重试/模型/attempt；同 attempt 重复结算不得重复扣费，根聚合不得把父汇总与 child 原始量重复计算。数值用受限精确整数/十进制及溢出检查。未知 input 或 output 不能当 0；取消/断网后 Provider 可能已收费，pending reservation 不能无证据全部释放，保留 unknown/estimate 负担并停止不足额度的新请求。已知 usage 结算后释放确认未用余量；Provider 实际超出预测要记录超额/停止后续，不能改写账本装作未超限。硬请求次数/输出上限可约束，美元费用无完整价格/usage 时不能承诺精确封顶。

Retry 创建新 Run、retryOfRunId 和新 attempt，但预算归属/已发生量不可因换 Run、Agent、endpoint、发 question 或拆任务而重置。明确的新用户意图与本树自动重试分开处理。记忆作业有独立用途额度且计入 Profile 总账，T12 先给其纯 Port，T14 再接消费者；不趁本票实施记忆产品。

### 6. 最小原 owner 请求

以下均是后续 Root 内部写集维护请求，不是本报告或 T11/T12 自动获得这些文件写权。表中 proposed 文件需由 owner 合并/命名后冻结；不得写旧已接纳 migration 来凑模型。

| 原 owner | 精确路径 | 最小目的 |
| --- | --- | --- |
| T01 / foundation_go | 新 `internal/application/api/collaboration.go`、必要 `api/usage.go`；现有 `api/types.go`、`api/conversation.go`、`api/assistant.go`、`api/access.go` | Facade.Collaboration、窄 DirectoryEntry、可信 actor/执行配置 variant、完整 Delegation/AgentMessage/ContextEnvelope、树/预算及 wait/continuation 的纯 Port；不给 Application 暴露 SQL/SDK。 |
| T01 schema owner | `contracts/hap/v0.1/schema.json`、`methods.json`、`fixtures/methods.json`、`fixtures/golden.json`；必要 `generate.mjs`；`internal/protocol/hap/types.go`、生成 methods/schema；`src/modules/huhubot/api.ts` | 替换 discover 的完整 Agent 返回；现有协作 DTO 补关联/来源/receipt 状态；严格 user 输入与 internal actor；hello/status 限额和 usage known/estimate/unknown 形状，两端有效/无效夹具同步。 |
| T01 routing/bootstrap | 新 `internal/adapters/inbound/hap/collaboration.go`；现有 `hap/router.go`、`internal/bootstrap/core.go` | 用户与模型工具入口映射到同一应用服务；装配 policy/config/access/usage/executor，只有实际可用才公告 capability；不追加第二个业务服务器。 |
| T02 / credential_provider 原配置 owner | `internal/application/assistant/ports.go`、`service.go`、`internal/adapters/outbound/sqlite/assistant/store.go`；必要在同目录新增配置接缝文件 | 受权目录摘要/目标状态读取；existing PinInTx 复用；temporary 的非持久身份配置保存/读取/释放、明确 CredentialRef 生命周期与接收方；提案确认复用创建用例。新派遣按最新停用/协作限制，旧受理 pin 不被静默改写。 |
| T03 / foundation_go 原执行 owner | `internal/application/execution/executor/ports.go`、`executor.go`；`internal/adapters/outbound/sqlite/execution/store.go`、`executor.go`；`internal/domain/execution/run/state.go` | AddChildInTx/LoadWork、持久 root/parent/thread/取消代数、claim child/continuation、模型请求受控消费者、waiting_children、树终结检查；读回有效 ParentScope，防 stale claim；按真实终结释放 pin。维持唯一 Run/event 权威。 |
| T03 原会话 owner | `internal/application/conversation/direct/ports.go`、`service.go`；`internal/adapters/outbound/sqlite/conversation/store.go` | 将可见 Session 与内部 workThread 历史加载/结果发布接缝明确分离；子结果不能由原 Finalize 无条件写成 B 私聊或父公开消息；复用来源过滤和 message seq。根一活动 Run 与每线程一活动 Run 分别约束。 |
| T05 / credential_provider 原授权 owner | `internal/application/access/context/service.go`、`internal/adapters/outbound/sqlite/grants/access.go`、必要 `grants/store.go`、`internal/domain/access/grants/policy.go` | 从持久父 effective_* 和 lineage 建 ParentScope；delegate/deliver/current recipient/任务限定 Grant 的同 Tx 检查；temporary subject 受权匹配；消息/问答/结果派生来源过滤。不是复制/放宽 Grant 或信模型 refs。 |
| T06 审批/Broker owner（后续实际目录） | 既定 `internal/application/tooling/broker/**`、approval/effect Store 与已冻结 ToolInvoker/EngineSuspension/continuation Port；跨原 executor 文件仍归 T03 | 协作工具经同一 Run 效果准入门，审批关闭时不能继续派生；为 child/question wait 与结果消费保留具名暂停/继续语义。沿 034 的正常 Resume、同 effect、pin、取消屏障，不把 child 等待当获批工具或 T16 自动恢复。具体既有票路径以其合法派遣为准。 |
| T01 migration owner + T11/T12 SQL 作者 | T11 `migrations/011-delegation.sql`、T12 `012-budget-message.sql`；T01 `migrations/embed.go` | 新迁移明确 Run/thread/temporary 配置与原 FK/唯一索引的演进，预算/消息/等待/回执约束；注册顺序连续。当前数据库版本为 4，不把文件 011/012 直接当 user_version，也不修改 002/003/005 历史正文。 |
| 原 TS client owner / foundation_client | `src/modules/huhubot/core/protocol/method-validation.ts`、`method-validation.test.ts`；按实际字段影响的 `codec.ts`/测试、`connection.ts`/测试 | 消费唯一 schema 的严格限额/错误/结果形状与方法数；协议客户端不保存第二个运行事实库。仅形状变化不要求另造专用传输。 |
| 原测试 owner | `native/huhubot/tests/contract/chat/{admission,run,provenance,durability,workflow,transport}_test.go`、`access/{access,host_ts}_test.go`、assistant 原有 pin/删除测试 | 原路径回归现有根受理/未知 usage/派生历史/停止语义；T11/T12 新矩阵放各自新 suite，不借研究权改这些测试。 |
| T08–T10 model adapter owner；T14 后续消费者 | 未来已冻结 `internal/adapters/outbound/engine/eino/**` 及三协议 adapter 实际文件；T12 只提出纯 Port | 每次真实模型出站消费 permit、正确结算 SDK retry/取消/usage。当前无这些生产文件，不在研究中杜撰已存在方法或安装依赖。 |

对 T02 当前 stop/disable 语义只提出新委派所需维护，不把旧已受理 Run 保留 pinned 配置改成未授权的全局强杀策略；停用活动任务如何处理仍沿 Spec 与后续取消用例。T01/T03/T05 维护必须配共享故障夹具，不能仅编译通过。

### 7. T11/T12 写集、资源与受控顺序

T11 独立拥有 `domain/collaboration/delegation/**`，`application/collaboration/{delegate,discover,proposecreate}/**`，`sqlite/collaboration/**`，`migrations/011-delegation.sql`，`application/tooling/collaboration-tools/**`，`tests/contract/delegation/**`。实现受权名册、现有/临时委派、任务 get/list/cancel 的应用/工具映射和创建提案，引用共享执行与授权合同。

T12 独立拥有 `domain/collaboration/policy/**`，`application/collaboration/{messages,scheduler,finalize}/**`，`application/execution/usage/**`，`sqlite/{usage,messages}/**`，`migrations/012-budget-message.sql`，`tests/contract/collaboration-policy/**`。它实现消息投递/问答、wait graph/限制、预算账本及父子终结策略；scheduler 只是同一 Executor 的 policy/持久唤醒协作，不是另一引擎。

两票都声明 sqlite-schema 与 run-admission-contract 资源，迁移、共享 API/schema、同 Tx 接缝及集成窗口必须串行。T12 的消息工具适配最终会触及 T11 `collaboration-tools/**`；T12 不能跨票修改它，应由 T11 原 owner 追加 message/reply 描述和真实调用映射。T12 如需要 collaboration 数据访问，也从 T11 提供窄同 Tx/查询 Port，不能重复 Delegation 表或跨目录直接改 store。

有一处真实计划先后耦合：T11 明文要求缺准入策略时保守拒绝，完整策略由 T12 注入；T12 又 blocked_by T11。建议 Root 在既有授权下冻结联合窗口：先 T11 消费合同和可编译候选（默认拒绝）→ T12 实装受限生产 policy/预算/消息 → 原 owner 完成组合维护 → 从公共链联合验收 T11 正常派遣及 T12 上限。T11 使用有限 fixture policy 可以证明接口，但不能用 always-allow 或 fake policy 冒称生产主路径完成；不能以循环依赖为由先无限放行。Root 已确认可在后续 Map 精确联合窗口解决，无需用户再批准。本研究不改票/Map/Gate。

### 8. 固定上游参考：复用机制与差异

已复用 `evidence/reference-audit.json` 的近两年活动、固定许可/manifest 摘要，本次网页核对并下载六个固定原始文件，HTTP 均 200，逐文件 SHA 在 observations-upstream.json；没有安装或运行上游，也未复制实现进产品。

| 固定参考 | 本次源码事实 | 采用与不采用 |
| --- | --- | --- |
| REF01 Eino `0a5ca53b9d3bf7b661dccc863465ec568a421eea`，2026-10-19，Apache-2.0 | AgentTool 内部建立嵌套 runner/bridge store，转发事件不自动进入父 runSession；可选择全文聊天输入，Message/AgenticMessage 路径有限制。[agent_tool.go](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/adk/agent_tool.go) | 仅 adapter 内复用模型/工具抽象；不用嵌套 Runner 代替 HUHU 的持久 child、预算或授权。拒绝全聊天自动继承；三协议/中断仍由各票验证。 |
| REF03 Hana `9a6cabf8c513db5edc6cf8179a538c9075885c6e`，2026-10-11，Apache-2.0 | 子任务与 threadId/目标 Agent 分离，立即返回后后台交付；有父会话范围检查和进程内并发计数；子执行拦截再派生工具。[subagent-tool.ts](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/tools/subagent-tool.ts)、[permission mode](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/session-permission-mode.ts) | 借鉴身份/线程/返回状态清晰区分；其 TS/Electron/pi/Hono/better-sqlite3 体系不迁入 Go。内存计数不能承担崩溃后的根累计上限；禁止所有子再委派与本 Spec 不同，不沿用。 |
| REF04 OpenBot `46642d6c91daa663bccff673595f4e12a419a496`，2026-10-24，MIT | 每跳查授权/状态，offer 持久工作并限 fanout；目标使用 scratch thread；有当前 run assertion 核验。[handoff.ts](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/agents/handoff.ts)、[handoff-tool.ts](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/agents/handoff-tool.ts)、[delivery](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/agents/handoff-delivery.ts) | 借鉴持久投递身份、逐跳现权、隔离线程。其按 run＋任务内容生成 hop key、depth 上限和 lease 重试不等于 HUHU 逻辑调用幂等、wait graph 或手动恢复；不引入 Postgres/Mastra/CopilotKit 服务。 |

以上不是全仓安全审计或运行兼容证明。使用依赖/直接改编代码需要各自真实实施证据及许可流程；本研究纯机制参考，不新增 NOTICE 项或依赖。

### 9. 后续最小真实公共消费者故障矩阵

本次均未运行。T11/T12 suite 应通过 Facade/真实 SQLite，至少一组经过生产 TS BotClient↔Go HAP；fake Engine 在真实工具 Port 上发出调用并消费 Resume，fake model-call 记录实际获 permit 的请求数。直接操作 private store 或返回预制成功不能替代公共链。

| 输入或故障点 | 必须回读的事实 |
| --- | --- |
| 多 principal/不可见目录、重名、停用/缺配置目标、目录变化中翻页 | 只见窄摘要；不含 Persona/credential/私聊；空与失败不同；明确 ID；拒绝没有 child/model request。 |
| 模型/普通客户端伪造 parent/root/depth/actor/预算、temporary 换 endpoint/凭证 | trusted Work 决定身份；数据接收方不扩大；无新持久 Bot、无未授权出站。 |
| existing B 委派时 B 有私聊；temporary 运行后重开 | 新隔离线程不读 B 私聊；临时配置/线程可回读，agents 数量不增加，pin/credential 引用正确。 |
| 同工具意图跨 commandId 重投、并发重投、CP Resume 重投；同参数新用户意图 | 原 delegation/child/thread/receipt 仅一份；异输入冲突；新意图不被任务正文 hash 吞掉。 |
| admission 每个写点/commit 失败；提交后丢 wake/独立进程退出 | Delegation、child、thread、pin、计数/预留、event/receipt 同进同退；accepted 重开可扫描一次；无孤立先启动子执行。 |
| 父 effective 历史含来源 X，但当前只显式附 Y；模型 task/消息删掉 X refs | 子上下文/结果保持真实派生来源；撤销 X 后不能从任务文字/摘要/结果回流。检查 Engine 实际输入及持久 effective_*。 |
| 父 Grant 撤销/到期、target model revision 或 endpoint 变化、task/session 限定 Grant、ParentScope 空/缺失 | 父链及目标流向交集正确；待领取/待出站/待投递重查；非根不能 nil ParentScope 放宽。无被拒的 Host/模型请求。 |
| B 返回含自身受限资料，A/群在投递前撤权或成员移除 | 当前 deliver/send/read 检查阻断正文；保留非正文回执/结构化拒绝，不以 B 的访问权替 A 批准。 |
| notify 重投；question/reply 乱序/重复/终态后新工作 | notify 零自动模型请求；问答只领取一次，送达/应答/完成不同；expectedRevision 生效，终态不重开。 |
| A→B→A 实际等待环与同 Bot 不同线程的合法委派；并发建立两条相反等待边 | 同 Tx 图检查拒绝真正环，合法同 Agent 新线程允许；不是仅比较 agentId。 |
| 3→4 层、32→33 子任务、根 4/Profile 8 并发、问答第 9 次；完成后再请求 | RESOURCE_LIMIT 具体 reason；拒绝未出站；累计数不因完成/重启返还；排队不占模型槽。 |
| 多父占满 worker 并等待 child；child 先完成后 parent 才发布 wait；双 child 同时完成 | waiting 持久且释放模型槽；无丢唤醒/饥饿死锁；同 parent 只一有效 continuation/claim/Resume。 |
| 多个请求抢最后预算；Engine 单 Run 触发多个模型回合/SDK retry；换模型/子任务/问答 | 只有有预留的请求出站，所有路径共享账户；同 attempt settle 幂等，统计无重复，硬额度不被换身份重置。 |
| usage 缺一项/全缺/估算/零/溢出；出站后取消、断网、settle Tx 失败、late usage | unknown 不计 0；预留/结算状态重开可查；未确认余量不凭取消全部释放；late settle 不重复扣账。 |
| 根取消与 child admission/问答 wake/reservation 并发；只取消一个子树 | 屏障后无新准入；全部已受理后代受影响，同 Bot 无关 Session/兄弟任务按范围保留。 |
| 父 finished 时子仍 running/approval/unknown；子失败有部分输出；Finalize commit 失败 | 不能 succeeded；明确 partial/effectsUnresolved；同事务消息/usage/事件/状态/pin/占用一致，不假称保存成功。 |
| 重启前分别是 accepted、running、waiting_approval、waiting_children、已取消；结果已送达但 continuation 未领取 | accepted 可扫描；原 running 按 T16 手动恢复；正常等待/投递不丢身份，不复活取消；已完成结果不再次计费/重复投递。 |
| 提案重复生成/用户确认重投/未确认模型文本请求；删除或停用目标配置竞争 | 未确认不新增 Bot；明确用户创建回执幂等；配置保留/新派遣拒绝和原执行 pin 生命周期一致。 |

真实模型、Obsidian/Vault 与目标 OS 现场由用户后验。三协议真实工具 schema/模型可见 prompt、模型收到的过滤上下文、SDK retry/取消/usage 需由 T08–T10 接入后验证；本研究不要求现在运行产品测试或真实收费调用。

## 产物与验证

- `REPORT.md` 是本任务完整交接；`observations.json` 保存 57 个本地来源的 SHA-256/字节数、关键原行、HEAD/branch 和读取纠正；`observations-upstream.json` 保存六个固定上游文件 HTTP 状态/摘要与定向原行。
- 完整读取 TASK、T11/T12；读取 Spec §1–4/6–9、ARCH §5/7–9、ADR-023/024及已有034/036相关约束，沿用未变化 AGENTS 能力发现与 dev 架构/测试/许可。来源摘要记录是研究采样，不代表 040 独立审查或任何票通过。
- 实际工具行为只有文件读取、rg 定位、上游网页/原始固定文件读取和自有报告日志写入。六个固定原始文件下载 HTTP 200；网页固定 GitHub 来源可回读。没有检出/执行上游、安装依赖或复制产品代码。
- 首次猜测 `tests/contract/conversation/` 与 `conversation-run/` 的 rg 返回 exit 2（路径不存在）；之后用 rg --files 找到真实 `tests/contract/chat/` 并读取，错误路径不作依据。其他读取/采样命令已正常退出。
- 没有运行 Go/TS 测试、build/lint、产品进程、SDK/runtime probe、模型、Vault、keyring 或 D-Bus；没有再委派。所有自有命令均已结束，没有后台 writer/临时运行资源。产品、永久测试、正式 Ticket/Map/Goal/Evidence 及他人报告未写。
- return 结构校验、实际退出码、最终 source hash 差异和 REPORT SHA-256 记录在同目录 `return-validation.log`。校验只证明交回结构，不认证运行通过或 Lead 接纳；以实际日志为准。

## 问题与下一步

Root 可以在既有授权下，先冻结第 6 节 T01/T02/T03/T05/T06 的最小共享合同，再安排 T11/T12 联合窗口；不用新增用户审批。尤其需一次解决工作线程与根 Session 约束、temporary 配置/接收方、有效 ParentScope 重建、逐模型请求预算消费者及同一 Executor continuation，不能在各票分别造“暂时”替代品。

T11 默认拒绝缺策略的生产派遣，T12 实装后再联合验收；future collaboration 方法需实际装配才公告。当前硬编码 2 slots/2 分钟/128 非终态队列和已给的 3/32/4/8/8 产品起点分别记录，后续数值变更由固定夹具与对应规范/协议同步，研究不自行调参。

未覆盖真实模型/宿主、运行压力或三协议工具/预算桥接；没有复测独立审查或展开新参考仓库。这些保留项不阻止已授权的独立代码工作，但不能记为通过。本研究 completed 只表示只读核对与可回读报告完成；交回校验后停写，待 Root 实际阅读接纳或新派遣。

