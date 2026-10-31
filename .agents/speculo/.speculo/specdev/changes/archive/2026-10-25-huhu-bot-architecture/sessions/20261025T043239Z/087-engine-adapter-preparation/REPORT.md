# T08 当前生产接缝与实施准备

Session: 20261025T043239Z
Task: 087-engine-adapter-preparation
Status: completed

## 聚焦交接

本轮完成当前生产代码与 047 冻结研究的只读对照，交回可供正式 T08 派单的最小切片、原 owner 请求和故障矩阵；不激活 T08，不是协议或 AC 验收。当前 HUHU 已有 Run 绑定的 ModelAttempts、固定配置、完整 CheckpointArtifact、纯 EngineCheckpointInspector 与恢复位置，不应照 047 当时的缺口重建另一套接口。建议优先采用 adapter 内的有限协议循环及窄生命周期桥，复用现有 Executor/Broker/预算事务；保留完整 Eino Runner 集成作为可证伪的备选。唯一装配处的私有 CredentialProvider、Probe 的能力含义/实际收费路径、依赖锁和版本兼容身份仍应由原 T01/T02/T12 等 owner 在正式窗口维护。研究已停在报告交回；Root 仍须收束 T16、回读本报告并锁定真实写集，才能派发实施。

### 边界、依据与读法

- 派遣输入为 Map 21 / Goal 20，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。工作副本早已有大量 tracked/untracked 改动；本文是 `sources.json` 所列读取时点的代码观察，不是干净提交快照，也不替 086 作独立检查。
- 已按 workspace/catalog 发现并读取 dev 与 SpecDev I 授权/写集入口，以及当前 T08 和直接接缝。没有创建 Change、Ticket、正式 Evidence，未写生产、测试、旧报告、永久知识或正式状态。
- “观察”指本地实际源码；“历史”仅复用冻结 047/002；“建议”全部尚未实施。70 个来源的完整路径、字节数、SHA-256、所用行段在 `sources.json`；末次摘要复核在 `source-recheck.json`。
- 047 报告 SHA-256 已重算为 `df2313f9ddcef414a7fbc5e63ed8d2b7d84d2567f571e5fda82f473dcd8f8956`，与 TASK 冻结值一致。该研究的近两年维护活动、许可和官方网页结论保持历史归属；本轮不重新浮动选库、不下载、不调用 Provider。

### 当前生产 trace：T08 直接消费的真实端口

```text
cmd/huhubot/main.go -> bootstrap.Open -> OpenWithOptions
  -> Profile lock + SQLite + private credentials.NewProvider(Catalog)
  -> executions / grants / groups / policy / broker / recovery
  -> assistant.New(Probe: options.Probe, Credentials: private provider)
  -> executor.New(Engine: options.Engine; nil => UnavailableEngine)

Claim -> ReadExecutionConfigInTx => Config + Lineage + Agent snapshot
  -> PrepareContext -> filtered ModelHistory + effective provenance
  -> AuthorizeAdmission -> MarkRunning
  -> broker.Bind(ToolExecution: Identity/Run/Access/Claim/Config/Lineage)
       => Tools + Checkpoints + Attempts, Close
  -> Engine.Run / Engine.Resume
       -> every HTTP: Attempts.Reserve -> Dispatch(callback) -> producer join -> Settle
       -> every local tool: Tools.Invoke
       -> first approval: complete private CP -> Checkpoints.Publish -> suspended result
  -> executor.PublishSuspension -> Blob verification + durable approval/effect/run/events

normal decision / children / question OR qualified user crash recovery
  -> same Executor + new current claim
  -> exact persisted continuation/decision -> same Engine.Resume
  -> ledger-aware Finalize, current body delivery policy, terminal pin cleanup
```

| 当前文件/入口 | 已具备的事实 | T08 使用义务或剩余接缝 |
| --- | --- | --- |
| `native/huhubot/internal/application/api/conversation.go` | EngineInput 有 Messages、Delegation、Agent、History、PreparedContext、Tools、Checkpoints、Attempts、Config、Lineage；Resume 有完整 Artifact 与确定 Decision。公开事件只有 HUHU Type/Text。 | 保持 SDK/message/stream/raw CP 在 eino 子树。没有 EngineInput.ProfileID；从唯一装配处绑定可信 Profile，不让模型提供 Profile 或 credentialRef。 |
| `native/huhubot/internal/adapters/outbound/sqlite/execution/executor.go:claimInTx` 与 `native/huhubot/internal/application/execution/executor/executor.go:execute` | 从持久配置重建 Config/Lineage；合并已过滤历史、来源和 derived provenance；再授权、MarkRunning、绑定 ToolSession。普通 continuation、恢复位置、CompletedResult 均进同一个执行器。 | 只消费这份固定 Agent/Config。不能从当前 Bot 目录读最新人格/模型，也不自行调度子 Run、决定恢复资格或重领 pin。 |
| `native/huhubot/internal/adapters/outbound/sqlite/usage/store.go` | BindAttempts 绑定可信 Run/claim/recipient/配置；Reserve 与 Dispatch 再查当前状态、恢复 gate、cancel、pin、read/send、父范围及群成员；effect gate 关闭后不再发模型。 | 每一次实际 HTTP 都走绑定 capability，包括工具回填后请求、摘要与允许重试。Root/Profile 的 4/8 是子执行政策，不改成新 HTTP 并发默认值。 |
| 同文件 Reserve/Dispatch/Settle | Reserve 按 Run+claim+LogicalCallID 幂等；同 ID 不同参数冲突。Dispatch 只允许 reserved，并在 callback 前提交账本与 fence，网络在 SQL 外。Settle 必须 ProducerEnded=true；unknown/不足的 estimate 保守计入预留，不当作零。 | 不用同一个 LogicalCallID 表示两次实际 HTTP；retry 用不同 ID，并关联已 settled 的原 attempt。callback 一旦进入，不能以本地网络失败为由 AbortUnsent。 |
| 同文件 `UsageInTx` 与 `native/huhubot/internal/adapters/outbound/sqlite/usage/finalize.go` | 持久 attempt 汇总覆盖引擎自报总量；未结算 producer 阻止假成功/过早清理。Core drain 也等 PendingProducers=0。 | 引擎正常返回前尽量结清所有实际生产者；Settle 持久失败必须可见并保留未决事实，不能假装释放。取消后用有界清理 context，而非已取消请求 context 写结算。 |
| `native/huhubot/internal/application/tooling/broker/service.go` 与 `native/huhubot/internal/adapters/outbound/sqlite/effects/store.go` | 所有工具先核 pinned AllowedTools；note.write 保留 Run+CallID 幂等和参数摘要。首个 prepared effect 的事务关闭 admission_closed。后续 note.write 新意图被 gate 拒绝。 | adapter 还须在首个 approval_required 后立即停止整个 batch 的后续 effectful Tools.Invoke，包括协作类动作；不要把 broker 的 denied 当作工具成功继续发模型。 |
| `native/huhubot/internal/application/api/tooling.go` | ToolCall 已有 note 与协作工具的类型化分支；ToolResult 有 Directory、Delegation、Message、Proposal、Tasks、Children、Effect/Receipt。 | 047 所述“只有 note.write 形状”已过时，不新增任意 JSON 通道。schema 映射到现有分支；不把 CommandMeta/Run 身份字段作为模型权限输入。 |
| `native/huhubot/internal/application/tooling/broker/recovery.go` | 开原不可变 Artifact；校验元数据/持久引用/效果；调用纯 EngineCheckpointInspector；完整读到结束。 | 新 engine 必须实现 InspectCheckpoint；此入口不得构造 Provider、调用模型、工具、Host 或解析凭证。不能只检查前缀/长度。 |
| `native/huhubot/internal/bootstrap/core.go` | Engine、Probe 现为外部 Options 注入；provider 在内部构造；Inspector 从 options.Engine 发现；默认实际 CLI 没有真实 Engine。 | 此处是必须由原 owner 接线的位置。真实 engine 被选定后，应将同一个 engine 给 Executor 与 Inspector；不能只在测试用 Options.Engine 装上就声明产品路径完成。 |

### 唯一装配处：私有凭证与固定配置的最小方案

**观察：** CredentialProvider.Resolve(ctx, profile, ref) 已核目录的 ProfileID/ref、protected/session-memory 模式，返回 caller-owned `[]byte`；没有必要新增 secret store。`bootstrap/core.go` 可从已验证的 `store.ReadMetadata()` 取得真实 ProfileID，`profile.Handle.Directory` 是路径而不是 ProfileID。EngineInput 的 Agent/Config 来自受理时 pin，不能改成取最新 Bot；`Lineage.ConfigSnapshotID`、Config.ID、SubjectID、协议接收方可做内部一致性断言。

**建议：** 在 T01 拥有的 `bootstrap/core.go`、provider 创建后、Tooling Inspector 和 Executor 绑定前，选择一次 engine/probe。默认生产路径构造 eino factory；显式注入 Engine/Probe 保留给隔离测试。factory 仅收到 `resolve(ctx, credentialRef)` 这类已绑定本 Profile 的私有闭包，不拿 CredentialProvider 的 Put/Delete/Close 权力；闭包内部调用当前 provider.Resolve，ProfileID 不由模型或 CP 决定。也可将该 resolver 放入 bootstrap 自有依赖 struct；不必增加公共 HAP 字段或把 secret 加进 EngineInput。

每个 model turn 从 `input.Config.Agent.Model`/同一 pinned `input.Agent` 验证非空 protocol/endpoint/modelId/providerId/ref 与一致性，再在本轮短生命周期解析私密凭证。构造 SDK 时显式传 key、BaseURL、Model、有限 max output；拒绝空值/不支持协议，禁环境 key/base/model 回退、协议切换、failover 和重定向。secret 不写日志、Run、CP、事件或公开 DTO；用后 clear 原 `[]byte`，同时承认 SDK string 拷贝不能保证彻底擦除，避免长生命周期 key 缓存。

推荐顺序是：先完成无秘密的输入/工具 schema/大小检查和估算 → Reserve → Resolve/本地 SDK 构造 → Dispatch 内唯一实际 Do → 消费/取消/Close/真实 producer join → Settle。解析凭证或构造失败而未进入 Dispatch 时 AbortUnsent；Dispatch callback 已开始则保守结算，即使还没收到响应。provider 必须保持到 Core 的现有 producer drain 之后；adapter 若引入共享 HTTP transport，原装配 owner 还需在 drain 后关闭 idle connections，不能让 test teardown 提前关闭数据库/凭证。

### ModelProbe：先限定连接测试能证明什么

Root 本轮澄清：Spec §1 的连接测试是用户明确动作，显示 protocol/endpoint/modelId，禁止笔记、历史、记忆；通用 Probe 名称不自动意味着收费推理或新增 Run。

**当前实际链：** `assistant.Service.TestModel` 验 identity、ModelDraft、Profile 目录，要求完整 endpoint/model/provider/ref，私有 Resolve 后调用 `Probe(ctx, ModelBindingDraft, []byte)`，返回后 clear secret；没有向 Probe 传 Persona、History、Context、Tools。当前 Probe 没有可信 Profile/attempt capability，故不能直接装上 Generate/Stream 就算安全接线。`model_attempts.run_id` 在 012 schema 中是非空 execution_runs 外键；当前 BindAttempts 也要求真实 active Run+claim，不能伪造 Run、借 chat root，或把探测叫 maintenance 绕过约束。

| 局部探测路线 | 可证明与局限 | 最小接线/门禁 |
| --- | --- | --- |
| **非生成的元数据请求，优先检查可用性** | 冻结 fork 的 `models.go` 有显式 GET `/models/{modelId}` 与 `/models`，返回 ID/owner/permission 等元数据，不含 streaming/tool/cancel/usage 能力字段。它可证明该 endpoint/key 在该模型元数据路由的访问；不能证明 Chat completion、tool use、审批恢复，不能证明兼容 endpoint 一定实现此路由。SDK 源码不能证明任何服务商不收费。 | 只用显式 key/BaseURL，模型 ID 作为单个 path segment 严格处理，不允许它改变目的地。禁自动 redirect/retry；有界 body/deadline/cancel/关闭资源。只返回实际证明的可用性，Capabilities 不照抄 draft 声明；不支持 metadata 时明确不可证，不静默换成生成探测。若此服务的计费/能力含义不明，保持失败或由 Root 冻结探测方式。无需因该路线预先新建执行域。 |
| **固定无资料的生成探测** | 能验证该确切 protocol/model/endpoint 的一小轮生成；只有另有真实测试才能声称 tool/stream 等能力。它可能收费、失败或 usage 未知。 | 必须先补 T01/T02/T12 的可信非聊天探测准入，复用同一预算/attempt 生命周期；下方 owner 请求仅在 Root 选此路线后生效。未补齐则 Probe 仍 fail closed，不能绕过 Attempts 直接调用 SDK。 |

若采用收费路线，最小可信合同是：T02 在验证 Profile 后取得一个只用于这次明确动作的受信 probe capability，将 ModelDraft、现有私有 secret、capability 传给纯 HUHU 的 ModelProbe 输入；T12 以同一 Profile 额度做原子 reserve/dispatch/settle，固定用途和无来源语义；T01 只维护必要私有 Go Port 与迁移登记。当前 Run-only 外键可能要求 owner 对既有统一 attempt 归属作最小演进，须先给出迁移方案及回归，不能在 T08 自建平行账本，也不在本报告擅自指定新表、新 Run 或新产品预算。Probe 的 HTTP 生命周期与停止/drain 也须进入 Core；这不是当前已具备的实现。

### 两个可行局部集成方案及建议

| 方案 | 复用和优点 | 实际代价/可证伪采用条件 |
| --- | --- | --- |
| A：完整 Eino ChatModelAgent + Runner，工具与 CP 都包窄桥 | 复用框架的模型/工具循环、按 CallID 保存的 ExecutedTools、RerunTools、Compose/ADK 中断地址。外层仍只导出 HUHU Engine。 | 必须明确关闭 ADK retry/failover、自定义 GenModelInput 保留 Persona，顺序工具加 adapter gate。Runner Set 失败仍可发 Interrupted；Set 成功才可映射 suspension。须同时保存完整 Runner/Compose 可恢复字节与 HUHU batch/terminal/usage 事实，并证明纯检查器可完整验证兼容性。 |
| **B：eino 子树内有限 turn/batch 循环，固定 SDK/model 桥与 HUHU CP；建议优先** | Application 仍使用同一 Executor/Engine/Broker；循环只处理一次 Run 的协议 turn、tool batch、暂停/恢复，不创建持久调度器。完整 transcript、CallID→EffectID/结果和待执行 index 由窄私有 payload 明确表达，较容易验证审批先停、拒绝不重写及纯 CP 检查。三协议以后复用 common 生命周期/权限/预算，保留各自 lossless payload。 | 不得演变为另一套任务调度/预算/恢复状态机或手写三套 HTTP SDK。仍使用已选 Eino/EinoExt/底层链；只有固定接口无法保留 terminal/Wait 的位置做最小有出处的 stream bridge。若要改编固定源码，T27 同窗口维护 Apache 归属与通知。 |

**固定源码能支持什么：** Eino v0.9.22 的 ToolsNode 从保存的 Input.ToolCalls 恢复，按原 CallID 复用 ExecutedTools/ExecutedEnhancedTools，并对中断项保存 RerunTools；Runner.ResumeWithParams 支持针对组件/工具地址的 resume data。工具可用 GetInterruptState/GetResumeContext 与 GetToolCallID 将 HUHU Decision 回填原待批调用，能力并非空白。但这仅证明存在机制，不证明 HUHU 的完整 lossless CP/先停效果合同已满足。

**不能原样采用的三处：** ToolsNode 默认并行；即使 ExecuteSequentially=true，sequentialRunToolCall 遇到 interrupt/error 后仍继续遍历后续任务；Runner 在 checkpoint store.Set 失败后仍会发 Interrupted。因此 A 需要每个工具包装先检查共享的本 batch 停止 gate，未执行项保持“待续”而不是成功，批准后只对保存地址注入确定结果，不重新 Tools.Invoke 原 pending effect。`ChatModelAgentResumeData.HistoryModifier` 只能改历史，单靠删改消息不等价于定点工具决定/控制位置。任一 executed-result 重复、CallID 丢失、未知 effect 重发或 CP Set 失败仍公布审批，都立即否证该集成方式。

**两方案都要的窄 stream bridge：** 当前固定 ACL.Stream 自起 goroutine，fork.Recv 把 `[DONE]` 和底层 EOF 都归成 io.EOF，Eino StreamReader.Close 只关消费侧，没有 producer Wait。不能宣称仅 Close、body.Close、读取 EOF 或 OnEnd callback 就严格 join 了隐藏 producer。优先在 chat 内用可控 body/SSE 观察保存明确 terminal/usage-presence 和解压后界限，并让窄桥显式拥有或暴露生产者 done；若固定 EinoExt 公共 Stream 无法给出 done，使用同一固定底层 fork 的 CreateChatCompletionStream/RecvRaw/Close 建立局部、可 join 的 producer 与 Eino message 映射，或有出处地最小改编对应 Stream 生命周期，不能盲改 module cache。不能因为 fork 有 RecvRaw 就忽略它仍吞终结区别，terminal 事实仍须在读取层保存。该桥必须通过真实 loopback HTTP 计数及取消 barrier 证伪，当前未运行。

### T08 自有切片应如何落地

正式派单仍限 `native/huhubot/internal/adapters/outbound/eino/common/**`、`.../chat/**`、`native/huhubot/tests/contract/engine/chat/**`、`native/huhubot/testdata/providers/chat/**`；以下是职责建议，不要求提前建空文件。

| 切片 | 最小职责 |
| --- | --- |
| common 的 Engine/factory/请求生命周期 | 实现 HUHU Run/Resume/InspectCheckpoint 外壳、固定配置校验、受控错误映射、逐实际 HTTP 的准入与 producer 所有权、私有 resolver 注入。shared common 只抽已出现的三协议不变量，不导出 SDK 类型至 application。 |
| common 的工具 registry/严格 decode | pinned AllowedTools 与实际已实现 schema 的交集；当前 note.write 加 8 个协作语义。本地完整 JSON object/schema/未知字段/重复键/长度/UTF-8 检查后构造已有 ToolCall 类型化分支；CallID 不是权限。未知工具不能自行变成 shell/Host/MCP。 |
| chat 的 SDK/config/流观察 | 仅 openai-chat-completions；显式 SDK配置，n=1、无 ADK retry/failover、无重定向。choice/index 交错聚合、稳定唯一非空 ID/name、完整合法参数；finish/拒绝/截断/空结果/终结/usage presence 分别判断。等待 usage-only 尾块后才归类费用，不在 tool_calls finish 时提前关流。 |
| common + chat 的私有 checkpoint | payload 保留协议、SDK/桥版本、tool schema digest、固定 Config/Run 身份、完整有序 transcript/必要 opaque 字段、turn/batch/index、已完成结果、待批 CallID/EffectID/token、未执行项及 loop 位置；禁止凭证。HTTP 生产者结束后才进入工具/CP 阶段。 |
| tests/testdata | loopback 本地 HTTP/SSE fixture 走真实 SDK和同一公共 API/Executor/Broker/SQLite；最小 fake resolver/一次性 Host，独立临时 Profile，标记 barrier 不用 sleep 拼竞争。fixtures 只含合成数据与假 key。 |

**输入与隐私来源：** Persona 直接取 pinned Agent.Persona，原样构造 system message，避免默认 FString 在 SessionValues 非空时解析字面花括号；History 只取 Executor 已过滤的 input.History，Context 只取 input.Context.Sources 的授权内容，当前 Intent 只放一次。Messages/Delegation/Decision.Children 来自当前执行或显式传递的工作线程，不能再查目标 Agent 私聊/全量目录/长期记忆。Lineage.Group 是授权与成员事实，不能把成员整段私聊拼入 prompt；orchestration root 由应用聚合，adapter 不抢协调者选人/群发布权。目录通过绑定 Tools.Invoke 的 agents.discover 取得安全摘要和分页，结果只列 ID/简述/可用性/允许能力/revision；不把 Agent、ModelBinding、Persona 或凭证通用 JSON 序列化进发现结果。工具参数/结果和 CP 正文同属私密内容，不进诊断日志。

**预算与终结细节：** Chat 固定 fork 当前该请求路径只有一次 HTTPClient.Do，没有自己的 retry 循环；仍需测试 SDK/HTTP client/redirect/自定义 transport 未隐藏增加请求。任何显式 retry 先结束/结算旧 producer，再独立 Reserve/Dispatch，LogicalCallID 含 turn 与 attempt 序号，RetryOfAttemptID 指向原 settled attempt；不改任务级 Run retry 语义。InputEstimate 与 OutputBound 不得空或假零：以完整实际请求（含 tool schema/history/results）使用已声明保守估算，SDK 的有限 max_completion_tokens 与预留 OutputBound 一致。当前 ModelBinding 没有生成参数字段，初始有限界限应由正式 owner 冻结到私有版本化 adapter 选项，不无声新增 HAP 字段或美元封顶承诺。usage 完整且有效时 known；仅 input 已知/无最终统计时 unknown 并保留已观测字符串，不能用非 nil Usage 或零值推导 known；多 chunk 累计值不相加，多真实请求逐次相加由账本负责。

**审批和 CP：** 首个 approval_required 立即暂停本批新效果；完整 transcript 中的其他调用保持原顺序与未执行身份。由 Checkpoints.Publish 交付的是 payload，不是 HUHUCP1 外壳；blob store 负责 `HUHUCP1\n`、header、摘要、RunID/claim 与不可变原子发布，payload 现有上限 1 MiB。之后仅返回 EngineSuspension，让原 PublishSuspension 做同事务审批发布；不得 adapter 直接写 DB 或把 SDK Interrupted 当审批发布。outer FormatVersion=1 不应混作 inner 协议格式；当前 metadata.EngineVersion 可由 bootstrap 显式传稳定且 <=64 字节的兼容标识，inner payload 再校验确切协议/SDK/桥/tool schema digest。若改真实 schema/桥语义须 bump 兼容身份，不能共用无差别 huhu-engine-v1。

Resume 从原 Artifact 完整读取并纯校验；以 CP pending slot 的原 CallID/EffectID 校验 Decision，正确回填已完成/denied/children 的结果，只注入一次。approved 的真正 Host 写已由 Broker.Continue 控制；Engine.Resume 不重新调用该 pending Tools.Invoke。rejected/expired 用原 denied 结果回模型，不重试原效果；后续明确新 CallID 的合法意图仍由当前 Broker 判断。未知或 dispatching 效果由现有恢复/核查用例阻挡，adapter 不自动重写。CP 内旧正文不能成为永久外发权：每次模型请求仍走 Attempts 的当前授权，不能用 CP 覆盖应用给的当前 Config/provenance，也不能从 CP 取另一个 endpoint。

### 原 owner 最小请求（只供 Lead 开窗，不授予本任务写权）

| 请求 | 原 owner 与实际最小路径 | 请求的精确内容与验收 |
| --- | --- | --- |
| O1 固定生产依赖与通知 | T01：`native/huhubot/go.mod`、`native/huhubot/go.sum`；T27：既有 Go notices 输入/生成通知 | 按下面固定版本接入实际 Chat 消费者。不要复制整个研究 go.mod、引入未消费云 SDK 或浮动升级；真实 MVS/许可证/编译闭包由唯一 owner 串行回读。T08 写集无 module 锁权限。 |
| O2 真实默认装配与私有 resolver | **Root 已确认当前精确 owner T01/foundation_go**：`native/huhubot/internal/bootstrap/core.go`；必要的 `native/huhubot/tests/contract/foundation/**` | provider 创建后绑定真实 ProfileID，选择生产 engine/factory，给 Executor 与 Inspector 同一实例，按选择接 Probe；保留显式 fake 注入。无新 public Engine secret 字段，当前 CredentialProvider.Resolve 不必修改。T20 后续负责模块装配，不能据泛称组合入口抢此文件。 |
| O3 Probe 语义及固定输入 | T02：`native/huhubot/internal/application/assistant/service.go`、`.../ports.go`、`native/huhubot/tests/contract/assistant/**`；纯 Go Port 如需由 T01 维护 `native/huhubot/internal/application/api/assistant.go` | Root 先在元数据/收费探测中冻结实际含义；不泛称全能力验证。元数据路线可沿现 Probe 参数消费显式私有 key；收费路线才要求可信 capability 传递。两者均无笔记/历史/记忆/人格、无协议/endpoint fallback、无凭证泄漏。 |
| O4 仅收费 Probe 才需要的预算接缝 | T12：`native/huhubot/internal/adapters/outbound/sqlite/usage/store.go`、`.../budget.go` 与对应 `native/huhubot/tests/contract/collaboration-policy/**`；纯 Port T01：`native/huhubot/internal/application/api/attempts.go`；迁移由 T01 登记唯一新升级窗口 | 复用 Profile 预算/逐 HTTP attempt 账本，可信显式用途且不借 chat/maintenance；不假造 conversation Run。当前非空 run FK 是实际约束，须先给最小归属/迁移方案；不回改已应用的012，不在 adapter 自建另一账本。此条件分支不提前实施。 |
| O5 固定 generation bound 与结算 consumer 回归 | T12 原 owner + T08 common/chat；必要纯合同仍 T01 | 确认私有 finite output 配置和 estimate 规则，现有 API 足以表达 known/estimate/unknown；不因真实 SDK接入就扩大公有 usage schema。新增真实 HTTP消费证明 reserve/dispatch/actual join/settle 与取消/unknown charge，已有政策测试由原 owner 维护。 |
| O6 CP/工具兼容身份 | T08 自有 common/chat；装配配置 T01；若需更改 broker metadata 才由 T06：`native/huhubot/internal/application/tooling/broker/{service,recovery}.go` | 优先沿现 EngineVersion + inner digest，不先改 CheckpointAccess 或 envelope。确有 metadata 缺口再向原 owner 提出最小变更；不拆另一 CP 仓库、审批事务或恢复执行器。 |

### 固定依赖与 MVS：研究锁和生产锁分开

当前 `native/huhubot/go.mod` 只有 keyring/DBus/SQLite/jsonschema/xsys 等，没有 Eino。研究 `002-foundation-research/artifacts/combined-probe/go.mod` 是**三协议组合 MVS 实值**；不是现在生产已安装/已消费声明。

| 项目 | 既定版本/来源 | 组合 go.sum 的模块内容摘要 |
| --- | --- | --- |
| Eino | v0.9.22；commit 0a5ca53b9d3bf7b661dccc863465ec568a421eea；Apache-2.0 | `h1:qBSgj+H5geYTysjta/bgdE9OVXX+9MVXP74vA6QA4GQ=` |
| EinoExt Chat | components/model/openai v0.1.13；commit 0ebab92e14f26088411dbc440a1ebdc904ccd8a1；047/002 根 Apache 许可来源 | `h1:5XHRTiTD5bt9KQrMHcfvuWNklEC3tpm3XHejdozt9vM=` |
| 实际 ACL | libs/acl/openai v0.1.18-0.20260924031408-10df7cac3f6d | `h1:FaBHOMj/ZDBmtsI9UMoDMDu9CNZPbjJwK/O26JFuZ8k=` |
| Chat 底层 fork | meguminnnnnnnnn/go-openai v0.1.6；Apache-2.0 | `h1:c74nk9F3+/agOd09eHeQt/Ayty4pw54X2Dj5JHdxcys=` |

不能按 Chat 子模块原始 go.mod 选较低 ACL，也不能把官方 openai-go/v3 当这条 Chat wrapper。三协议组合另外选中了 agenticopenai v0.2.4 / openai-go v3.44.0、claude v0.1.26（备选 agenticclaude v0.1.7）/ anthropic-sdk-go v1.56.0；本轮不替后票改选型。T01 正式接入时记录完整选中图与 go.mod/go.sum SHA、实际编译/分发闭包，T27 按真实消费者生成 notices。上表是复用固定历史锁，不是本轮执行 go list、编译或许可生成的结果。

### 本地 HTTP/SSE 故障矩阵（全部未运行）

每格的最小 harness 是 loopback httptest + 脚本化 SSE + 独立临时 Profile/SQLite + 假私有 resolver + 一次性 Host。记录真实请求号/endpoint/path/安全模型标识、请求 body 是否到达、body close/producer done、Attempt 与 Effect 行、持久事件/终态；敏感测试正文只在合成 fixture 与受控断言内。命名 barrier 控制发送、撤权、取消和结算，不用固定 sleep 判断顺序。Engine单元端口测试用于定位，完成证据必须经过同一 application API/Executor/Broker。

| ID / HTTP或故障脚本 | 必须可审查的断言 |
| --- | --- |
| F01 正常一轮 SSE text→finish(stop)→usage→[DONE] | 实际 HTTP=1；Reserve/Dispatch/producerDone/Settle 各1且顺序成立，known 用量等于 ledger；持久消息可读，只有有界 delta。 |
| F02 两工具 index 交错，ID/name 只首片，arguments 跨 UTF-8/JSON片；随后工具结果→第二模型轮 | 两个稳定有序原 CallID，合法完整 batch 才 Invoke；第二轮请求工具结果的 tool_call_id 与原 ID 一一对应；每个真实 HTTP独立记账。 |
| F03 Persona 含字面 JSON/花括号，SessionValues 非空；混入未授权 History/成员私聊诱饵 | 实际收到的 Persona 原样，Intent只一次；仅过滤后 History/Context/Messages/明确结果；无私聊诱饵、人格正文目录泄漏、secret 或环境 fallback。 |
| F04 tool_calls finish→usage-only→[DONE]；去usage；usage:null/部分字段；实测0 | 完整 known 与 unknown/partial观测分开；不能因Finish即关流，也不把缺失值写0；同请求累计usage不相加，多请求账本累加。 |
| F05 依次去[DONE]、去finish、直接干净EOF、半JSON、空choices/空流、length/content_filter/refusal | terminal 与运输 EOF独立；不完整/拒绝/截断不得触发工具，保留部分文本与安全原因。finish+[DONE]要求的精确判据由 chat decoder冻结；EOF不能掩盖缺失终结。 |
| F06 同index变ID/name、重复ID、未知工具、坏schema/多余字段/重复JSONkey/零参数{} | 非法调用 Host=0；允许的空object与未收到参数不同；不能补JSON或无预算再问；模型自报 Profile/Run/CommandMeta 不取得权限。 |
| F07 429+Retry-After、500、连接失败；另设会偷偷重试的 client/middleware变体 | 真实服务端计数揭示hidden retry；正式配置无SDK/ADK隐藏重试/自动failover；允许的每次retry新attempt并链接前次，拒绝预算后实际请求0。 |
| F08 Reserve后取消先提交；Dispatch已提交但服务端未见body；服务端见body后取消 | 前者才可AbortUnsent；callback已入后一律保守settle，不能盲退；真实body/producer结束后才ProducerEnded；同级Run可继续。 |
| F09 headers后卡body、sink error、消费者Close、取消后late chunk、close/producer故意滞后 | 不接受晚块/新工具/新HTTP；cancel+Close+有限join；done之前不settle/释放，不能以Reader.Close或Do返回代替；Core drain保留DB/provider直到结束。 |
| F10 一行超长、gzip解压巨量、无空行多data、永续ping/空data、巨tool/文本/结果 | 解压后总字节、行/event/参数/结果/最终文本/CP与总时限实际生效；资源失败无效果、无免费修复请求，producer结束并unknown结算。具体数值由正式界限合同给出。 |
| F11 首轮后撤Grant、换recipient、成员移除（含无source正文），再工具后模型轮 | 当前 Attempts复检拒绝，第二真实HTTP=0；CP旧正文不外发；不直接复用首次授权/250ms尾读fence包长流。 |
| F12 显式假key/base/model对抗假环境；302/307跨endpoint；敏感error body | 只命中固定destination，redirect目标请求0；缺项fail closed；SDK原始error/prompt/header无日志/Run.Reason/CP泄漏。 |
| F13 同批两个note.write，首个pending，第二tool callback迟到；协作effectful tool在后 | 首次gate关闭后后续effectful Invoke=0，pending仅1；CP保存全批原序/已完成结果/待续项，既不伪成功也不丢调用。 |
| F14 approval批准/拒绝/过期→Resume；重复相同delivery/Resume；crash发生在Host返回后 | 原CallID/EffectID与CP pending一致，已提交结果只回填一次；拒绝/过期Host=0，approved复用原回执；Resume不重新Invoke原pending。新明确意图须新CallID并重新走当前Broker。 |
| F15 effect dispatching/unknown、撤权后恢复、cancel generation/claim漂移 | 由现恢复资格/核查阻挡，不裸Resume/重发Host；无新模型HTTP；原pin/Artifact/不可变decision保持。 |
| F16 CP Set失败仍Interrupted、无CP ID、Blob Publish失败、>1MiB、Blob成功事务失败 | 无虚假waiting_approval；后续工具/模型0；旧Artifact不覆盖，孤儿沿原GC；只有实际Publish Artifact并同事务发布才能pending。 |
| F17 CP尾部截断/多余payload/坏版本/错协议/错Run/错工具digest；header/digest合法但语义坏 | 纯Inspector读完整语义且模型/工具/Provider/Host调用0；HUHUCP1 outer与inner分开验；metadata兼容不足安全blocked，不能前缀通过。 |
| F18 已有完整HUHUCP1再backup/restart/恢复；应用位置已存Decision/CompletedResult | 外壳与payload不混淆，引用与字节稳定；恢复纯检查后同Executor，saved decision不重复审批dispatch，CompletedResult不进Engine。 |
| F19 Settle事务失败、重复同观察/冲突观察、预算耗尽、两个请求并发争最后额度 | 失败保留dispatched未决且不假成功；相同settle幂等、冲突拒绝；只有获准请求真正出站，unknown非0；不改既有4/8/等待计数政策。 |
| F20 metadata Probe成功/404/不支持/未知模型；若选收费Probe则另加取消/unknown/retry | metadata结果不冒称tool/stream验证；无业务正文；收费变体必须逐HTTP准入账本，与chat/probe用途隔离且同Profile预算，不假建Run或绕过维护额度。 |

### 最小垂直实施顺序与验证需求

1. Root 完成 T16 当前收尾/独立审查与 086 回执，锁当前生产输入、原 owner 和真实 T08 写集；接纳 087 仅是研究，不推进 T08状态。
2. T01/T02/T12 先在各自窗口冻结 O1/O2/O3 与按实际 Probe选择触发的 O4/O5；优先不改公共 wire。定版 EngineVersion/内层CP版本/工具digest和私有输出界限；缺项保持不可用。
3. T08 自有目录先做一条真实SDK到loopback SSE、原Persona、Reserve/Dispatch/join/Settle与 finished持久消息的垂直路径，F01/F03/F04/F05/F08/F09先有红灯后实现。不要先做三个协议空架子。
4. 同一个应用用例加入工具合法化、完整batch、note pending→CP→批准/拒绝/过期→Resume、原ID/结果回填，再补 crash/unknown/CP损坏/取消late与并发预算，覆盖 F02/F06/F11/F13–F19。
5. 原owner接入真实默认bootstrap与Probe选定路线，回读CLI产品链可到此Engine；完成适用回归、共享依赖通知和未参与实现者独立审查。T09/T10消费已稳定common合同，各自再补完整协议证据。真实Provider/Obsidian/目标OS仍由用户验收，不请求凭证。

后续命令需求（本轮未运行）：在 `native/huhubot/` 用固定 toolchain、`-mod=readonly` 执行 `go test ./tests/contract/engine/chat/... -count=1` 与适用 race；原owner分别复跑受影响的 assistant、approval、collaboration-policy、recovery/foundation 合同，不能由T08接管旧测试。Lead再按 dev选择表运行 `pnpm check:huhu-bot` / `pnpm test:huhu-bot-architecture` / `pnpm test:huhu-bot-tooling` 及构建后 stdio 冒烟；依赖变化由T27生成/核对 notices。若没有生产TS改动，不因Go实现强行重建main.js；若装配改动触及TS，再由相应owner执行lint/build并保留产物。真实 live suite允许保留显式user-owned/not-run，skip不算AC现场通过。

## 产物与验证

- 自有产物：本 REPORT、`sources.json`（完整来源SHA/范围）、`source-recheck.json`（最后来源复核）、`return.json` / `return.log`（只读交接结构校验实录）、`manifest.json`（交回产物字节/SHA）。所有路径均在 087 自有目录。
- 实际命令仅为 cat/sed/rg、git status/rev-parse、sha256sum、Python标准库读/哈希/JSON与自有报告原子落盘；同步退出，无产品/Provider/Host/keyring进程、无后台任务。没有Go、编译、下载、安装、测试、受控HTTP服务器或产品Node命令。
- TASK的“无Go/Node”与亲自return要求经原生通道澄清：Root明确只允许最终运行 `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/bot --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture --session 20261025T043239Z --task 087-engine-adapter-preparation --stage return`。实际exit/stdout/stderr以 `return.json` 为准；这不占086产品重检查窗口，也不证明实现正确。
- 只读探索的路径失误如实保留：猜测 `usage/purposes.go` 不存在，cat返回1；猜测 `application/api/profile.go` 不存在，rg返回2。随后使用真实 `usage/store.go` 的用途绑定与 `base/store.go:ReadMetadata`，结论不依赖缺失路径。部分批量输出截断，必需047与当前核心接缝已分段回读；来源清单中的范围区分只作发现/哈希与语义读取。
- 本轮所有 F01–F20、Go/Node产品检查、真实模型、Obsidian、目标OS、keyring/D-Bus和收费观察均 **not-run**。没有实现或协议通过结论，没有新提交/推送/发布/归档。

## 问题与下一步

没有需要用户凭证或新增产品授权的问题。Root接纳后需明确：Probe当前采用元数据可用性验证还是实际生成验证；有限输出/输入估算策略；A/B局部集成选择与兼容身份。上述是正式owner维护时的技术决定，不应为本次准备提前改Spec或扩大持久模型。

固定 Eino/EinoExt 现有接口的 lossless interrupt+producer join 仍需 F13/F16/F17/F09 实际证伪；本报告没有把源码阅读等同运行证明。真实T08不可只装入测试Options，必须由原T01装配默认产品路径，且原T16依赖门仍由Root维护。

作者交回后停止全部自有写入与命令，不再委派、不继续T08。Root回读REPORT、核对manifest和return，再决定接纳与正式实施派单。

### 核心来源 SHA-256（完整清单见 sources.json）

- `native/huhubot/internal/bootstrap/core.go`：`a114c9297befbe0c61aee5dd86d6d5a36e8bff481d8aa6acbe6341f907820a67`
- `native/huhubot/internal/application/api/conversation.go`：`e66c6fb6fa5fde5b2fb106d6e8951062735b71931e8f8d6f1f740807820fff4a`
- `native/huhubot/internal/application/api/attempts.go`：`100af5f4f77c709e1cc1b318fe8abe7dfca1d754637a9a1b0690964ac84e67e4`
- `native/huhubot/internal/adapters/outbound/sqlite/usage/store.go`：`6600cf9abfae1cd463dccb8acbd86cb4e186bf0dacfcc06faf288a43d1e2d3a6`
- `native/huhubot/internal/application/tooling/broker/recovery.go`：`e26c4401ceaed66bd1c3e86b5f872389fb98e97f840781ba223b8179d5cbaea3`
- `native/huhubot/internal/adapters/outbound/blob/store/store.go`：`2b41bd1c19af36b4ee1be3ef672885260e42031befaf3c0590eaa842f5404f53`
- `native/huhubot/go.mod`：`b0dbcd2d694eccaedc15a7074bd91bcb66db9f07c5ab341a3df721a7ee829c3b`
- `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/002-foundation-research/artifacts/combined-probe/go.mod`：`043859b73148e4c177dcd02905825fc1cf43b0b7f26a61b67acd856a434ce891`
