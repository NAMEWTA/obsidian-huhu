# 三协议模型请求与预算接缝预检

Session: 20261025T043239Z
Task: 047-model-protocol-preflight
Status: completed

只读研究交接；不是 T08/T09/T10/T12 验收、产品写权或真实 Provider 联通证明。TASK 的 HEAD/base 为 33c21e098ef3188cbab5a09f3e0a01fadb787715，最后只读 HEAD 核对相同；Map 13 / Goal 12。046 正在独立审查，本文仅描述 observations.json 中各文件读取时点，不替代其冻结候选。全文“观察”是实际读到的代码/原文，“建议”是后续实现合同建议，“历史证据”只复用原报告而未重跑。

## 聚焦交接

### 先给 T01 / T12 的结论

**T12 必须提供绑定可信执行身份、逐实际 HTTP attempt 的持久预算准入与结算 Port。** 当前 EngineInput 只有 Tools/Checkpoints 等执行输入，没有逐请求预算入口；一次 Engine.Run 内会有首次模型、工具返回后的模型、问答、摘要和重试等多次请求，不能只在 Run 入口扣一次。Root 已收到并表示纳入待开工合同的早期简讯：每个 actual attempt 独立 reserve→dispatch→settle，usage 明确 known/estimate/unknown，取消在途不盲退，stream/producer 真结束后释放并发。

当前没有生产 Eino/Provider adapter，UnavailableEngine 返回 ADAPTER_NOT_ASSEMBLED；native/huhubot/go.mod 还没有 Eino/EinoExt/三协议 SDK。下述固定版本来自 002 的研究组合依赖图，不冒称已经进入生产依赖锁。T11/T12 也尚未实现；041/045 的方法名和计划路径不是现存接口，更不是应给当前候选报缺陷的已装配功能。

建议最小纯 Port 职责如下，名称由原 owner 冻结；Application/Domain 不暴露 SDK、HTTP client、sql.Tx 或原始 SSE 类型：

| 职责 | 最小输入/输出与持久约束 |
| --- | --- |
| BindModelExecution | 由同一 Executor 绑定 RequestIdentity、Profile/Session/Run/root/parent/workThread、claim/recovery/cancel 代数、配置 pin/模型修订、固定 recipient、来源/Grant 及当前成员上下文；返回本次执行专用 capability。模型参数不能自报 root、预算账户、用途或授权。 |
| ReserveAttempt | 服务端分配 attemptId，并关联 logicalCallId / model turn、重试序号及前一 attempt；用途区分主/子/问答/摘要/重试/记忆；记忆维护按独立目的/账本归属，不能硬塞进某个已结束根或免除准入。事务内检查根预算、并发资格、当前 Run/claim/cancel、来源/recipient/成员资格并预留本请求输入估计与输出上界；返回不可重用的预留身份，拒绝则真实请求计数为 0。 |
| CommitDispatch / admission callback | 在最后实际出站接缝复核当前授权和代数，原子地把该 attempt 标记为已准入/在途。网络在事务外；不能持 SQL Tx 等 SDK/网络。需明确许可到真正发送间的线性化/fence，不能做完一次 Check 后把整个 Engine.Run 当授权窗口。 |
| SettleAttempt | 按 attemptId 幂等记录状态、usage 质量/观测量/估算依据、是否已派发、是否协议完成、取消/断流/限额原因、请求关联 ID 的安全摘要；只结算一次。已知用量释放余量；未知/部分未知保留可审计负担，不能全退或写 0。重复 settle 不二次扣账/退额；失败持久化不能假装余额已恢复。 |
| AbortUnsent / Drain | 仅能证明未跨出站边界的预留可全退。已派发取消、超时、重启或断流仍可能收费，先停止新准入，有限取消/关闭并等待 producer，结算为已知/估计/未知；不因 caller 返回就释放在途槽。树取消与同级隔离沿 T12/T16，不能用 Profile 全局 Close。 |

这些是职责而非必须新增五个公开方法，也不要求把以上全部信息重复存于每条 wire DTO；可信绑定可由 capability/上下文承载，关键事实仍应可从持久账本核查。HTTP client / RoundTripper 包装只存在 outbound adapter：它必须看见每次 SDK 实际 Do，而 parser 完成/usage 的结算回调仍归该 attempt。HTTP Do 返回响应头不代表 SSE 已结束，不能在 Do 返回处退并发槽。

同一 model turn 的网络重试要有不同 attemptId，逻辑工具意图身份保留；Spec §4 的“新尝试有新 Run、retryOfRunId”是任务级重新尝试，不必把每次 HTTP 429 重试伪造成新 Run。这两个层次必须各自防重。应用决定允许重试时，每次重试重新授权/预留，不复用已结算许可；禁用无限 retry、换协议或自动换模型。

当前 RunUsage 的两个可选十进制计数加 Estimated 只能表达终结投影，不能代替 attempt 账本。现存 sqlite/execution/executor.go:166–176 已将缺失/畸形计数保留为空，实测零才为字符串 "0"；这不是现存“未知记零”缺陷。T12 需增加明确的质量及余额状态，允许输入已知/输出未知、部分流量已观测与估计总量并存；UI 的金额/Token 总量不可把未知子项加成精确 0。费用估计不是美元硬封顶，缓存/推理 token 不重复计入总量。

### 根 4 / Profile 8 与等待的原文边界

Spec §3 第 89 行明确的是“每根最多 4 个并发子执行、Profile 最多 8 个并发子执行”，另明确“排队不占模型并发槽”；同段还有 3 层、32 个子任务、8 次自动问答唤醒以及生效值入 hello/service.status 和根快照。Spec §4 第 93 行定义父 waiting_children；§3 第 74 行规定 question 应答轮受同根预算/次数/权限，notify 不自动生成任务。

**原文没有把 4/8 定义为所有根/子/摘要/记忆 HTTP 请求的统一并发默认值，也没有精确定义 waiting_approval、waiting_children、question 等待期怎样计入“并发子执行”。** 不应以研究建议新增限额、静默修改既有值，或借不同用途排除费用。当前 Executor 的 slots=2 与凭证 worker 的 MaxInFlight=8 分别是执行 worker / 凭证操作实现容量，也不是 Spec 的子执行限制。

建议 T12 明确区分：
- 子执行调度占位：持久树关系、queued/running/waiting 状态与 4/8 的计数谓词，由 owner 在既定合同内冻结，重新唤醒须原子重领资格。不能把 4/8 偷换为完全不同的 HTTP 计数规则；等待态计入与否须显式谓词，也不能在队列期间长期占模型槽。
- 实际模型在途槽：当前请求真实 HTTP body/producer 的生命周期；进入 waiting_children / question 等待 / waiting_approval 且没有在途请求后可释放，恢复时重领，避免所有槽被等子结果的父占满。此条是实现建议，不把它冒称原文的全部子执行计数公式。
- 预算 reservation：与并发槽独立；等待本身不收费、不长期预留尚未发出的未来模型回合，但已发未明费用不能随等待清零；Run/工作线程身份、配置 pin、未决效果和 CP 引用保持到真实终结。

T12 的受控夹具须覆盖 多个父各自等待合法子结果时仍能调度获准应答，真实等待环则拒绝、question 链最多 8 次和取消后不再唤醒；不能把 question 自动解释为可无限生新 childRun，不能在 notify 到达时自动发模型。父等子/审批的普通 continuation 与 T16 崩溃后用户 resume 继续通过同一 Executor，等待与取消不新建第二执行器。

### 当前共享接口能复用什么、还缺什么

| 实际文件/接口 | 当前可复用事实 | 后续最小接缝 |
| --- | --- | --- |
| application/api/conversation.go，executor/{executor,ports}.go | 同一个 Engine.Run/Resume；Work 有可信 Identity/Access/ClaimToken；Executor 合并已过滤历史的 provenance，重新 AuthorizeAdmission 后 MarkRunning；正常审批 continuation 已调用 Continue→Engine.Resume。 | Bind 上述逐请求 capability；当前入场检查不是第二/第三模型回合的权限；final usage 必须从持久 attempt 汇总或校验，不能仅相信引擎自报一次总额。 |
| application/api/tooling.go | ToolInvoker、CheckpointAccess、Artifact/Metadata、ToolExecution、EngineSuspension/RunContinuation 是 HUHU 类型。Artifact 绑定 RunID/AttemptID、ref/digest/size/兼容元数据，io.Reader 不泄露 SDK。 | 当前 ToolCall 的 Target/Content 与 ToolResult 的 Effect/Receipt 是 note.write 形状；T11/T12 的目录、委派和消息需通用、有限且严格 schema 的 args/result，不能给 SDK 自由执行原生工具。新增合同由 T01，而非协议 adapter 跨目录改。 |
| application/tooling/broker/service.go，sqlite/effects/*，blob/store/store.go | Bind/Publish/Open、已发布引用检查、不可变 Blob、PublishSuspension→repo.Publish、正常 Continue；当前 CP 1 MiB 上限，EngineVersion 默认 huhu-engine-v1，FormatVersion=1，DefinitionDigest 来自 Agent 修订/草稿和 note.write Descriptor。 | T08 的真实 Eino 版本、图/工具定义、协议桥格式需进入稳定兼容身份；不能不同 SDK/协议都沿一个无差别常量。不得先删限制再测：完整协议 CP 超限应安全失败、无 pending 审批；如需改阈值由原 owner 明确冻结。 |
| application/api/assistant.go，sqlite/assistant/store.go | 模型绑定显式有 Protocol/Endpoint/ProviderID/ModelID/CredentialRef/revision；受理固定配置 pin。 | Engine 建造必须消费已 pin 的配置；禁用删除/切换当前 Bot 配置影响已有 Run。T02 配置/pin 原 owner 是 foundation_go，纠正历史 041 owner 表误标。 |
| application/api/credentials.go，outbound/credentials/provider.go | Resolve 返回私有 caller-owned []byte，调用方使用后擦除；有 Profile/catalog 校验、有界 worker/cancel/join。ModelProbePort 已只接显式模型配置和私有密钥。 | 无需新凭证库或让 HAP 传 secret。可由 adapter 构造依赖接受受限 resolver / run-bound provider factory；需要缩窄权限时才改纯 Port。现有 Resolve 可直接复用，SDK 字符串拷贝不能保证内存彻底擦除，应最小生命周期、不缓存到 CP/日志。 |
| application/access/context/service.go，api/access.go，sqlite/grants/{access,delivery}.go | read/send、parent scope、固定 recipient、来源/Grant、历史 provenance；当前 WithReadFence 用于有界实际投递，250ms，与 Grant mutation 共享 gate。 | 出站模型每次发送重查同一批真实历史/来源，T13 后并入当前成员谓词，尤其无 Source 正文也要验证。当前 checkInTx 无 source/scope 时直接返回，不能把它当未来成员/Run fence。现有 250ms 尾读交付 fence 不能直接包整个长 SSE，会阻塞撤权/过早超时。需原 owner 维护适合请求启动/已发排空的有限接缝。 |

这些路径当前的真实消费者是单聊/审批/事件。群成员、工作线程和子树预算列为未来必要消费者，未装配方法不记为当前漏洞。Grant 的 read/send 等来源权限与确切 note.write effect 的用户批准分开，不新增全库 write Grant；模型工具参数、tool_call_id、remote response ID 都不是权限凭据。

### 逐协议：固定实现与受控桥要求

**Chat Completions（T08）**

固定链：eino-ext/components/model/openai v0.1.13 → 组合图实际选中的 libs/acl/openai v0.1.18-0.20260924031408-10df7cac3f6d → meguminnnnnnnnn/go-openai v0.1.6。不是官方 openai-go v3 的 Chat wrapper。

实际源码：
- ACL chat_model.go:867–987 将 StreamOptions.IncludeUsage 设 true，创建 upstream 后起 goroutine，defer stream.Close / writer.Close；按 choice 0 生成 delta，tool index/ID/name/arguments 进入 schema.Message。1234–1282 保留 FinishReason 与 usage；1338–1361 有缓存/推理细分。
- fork client.go:182–223 该请求路径只有一次 HTTPClient.Do，没有这里的 SDK retry 循环。该观察不保证自定义 HTTP transport/redirect/middleware 没有额外真实请求；这些必须也受预算控制。
- fork stream_reader.go:54–117 逐行 ReadBytes，没有本路径字节总量限制；[DONE] 与底层 io.EOF 都会向调用者呈现 EOF。ACL 的正常 EOF 分支没有协议终结断言。
- Eino schema/message.go:1743–1774 对一个流的用量取最大值而非相加；不要把同请求多个累计 usage chunk 当多个请求相加，也不要把多个请求一起 Concat 后漏算。

官方 function-calling 指南要求按 tool-call index 聚合参数增量，ID/name 可能只在首个片段出现；strict schema 有 additionalProperties/required 约束。Chat 流 include_usage 的最终统计块在中断/取消时可能缺失。[函数工具与流式聚合](https://developers.openai.com/api/docs/guides/function-calling)、[Chat 流事件](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events)。

建议：固定 n=1 的受支持配置，按 choice + tool index 聚合；核对同一 index 的 ID/name 稳定、所有 ID 非空且唯一、参数完整有界且严格 JSON object/schema 通过后才交 Broker。finish_reason=tool_calls 与完整合法 tool batch 才进入工具阶段；length、content_filter、refusal、空流、未见明确终结的 EOF 单独映射，保留 partial/原因/unknown，不把半截 JSON 补成可执行参数。零参数工具可按已确认完整的 {} 处理，不能把未知空片段一律变 {}。UI 可显示有界文本 delta，但工具不随 delta 立即执行。

仅用该 fork 暴露的 Recv 无法区分 [DONE] 与异常关闭；受控桥应在 body/SSE 观察层保留终结事实或最小适配该路径。不能宣称“SDK EOF 无 error 所以完成”。最终用量块可在 tool finish 之后，不能见 tool_calls 就提前 Close 而假定费用已知。

**Responses（T09）**

固定链：agenticopenai v0.2.4 → openai-go/v3 v3.44.0；AgenticMessage 与普通 Message 是不同桥，不应压成 VisibleMessage.Text 后再恢复。

实际源码：
- responses_model.go:40–71 有 MaxRetries *int / HTTPClient / 显式模型参数；178–222 传 WithMaxRetries，可显式设 0。直接 NewResponseService，不经过客户端环境自动装配：SDK responses/response.go:29–46 确认服务本身不会自动读取环境。仍应拒绝空 endpoint/model/credential，不依赖默认公共 base URL。
- 620–677 populateCache 会在 auto cache 下利用 previous response ID 缩短本地 history，并可能令 store=true。HUHU 独立恢复需显式 Store=false、关闭 enableAutoCache、不给 previous_response_id/conversation 充当历史权威。
- responses_event_convertor.go:35–302 区分 typed events，content/tool/reasoning 事件按输出/内容索引；Completed/Failed/Incomplete 进入 metadata，不能仅看 Err()==nil 认成功。sender.send 忽略 sw.Send 的 closed；producer 会继续读取，需取消 HTTP context 与实际结束观测。
- responses_convertor.go:694–711/867–941 分别保存 FunctionToolResult.CallID 与 function call 的 call_id，item ID 是另一个身份；2128–2160 将 encrypted_content 存于 Reasoning.Signature 并保留 item ID/status。2253–2274 对任何 response 都创建非 nil TokenUsage，而未检查 usage 是否缺失；不能用该指针非 nil 推导 known。
- input/output reasoning summary 会在桥中拼接为文本再构造 summary；若要求原样完整 item，需验证并补全 item 快照，不能用“字段看起来都有”代替序列化 round-trip。remote ID 仅诊断/协议关联，不是恢复/授权令牌。

官方 typed events 区分 completed/failed/incomplete；output_item.added 中 reasoning encrypted_content 可能未完整，后续输入应用 output_item.done 的最终 item。当前官方 reasoning 文档说明 store=false 下 encrypted_content 默认提供，legacy include=reasoning.encrypted_content 仍兼容但不再必需；固定 SDK/兼容 endpoint 的具体行为仍需夹具与现场验证，不沿旧印象硬说必须 include。[Responses 事件](https://developers.openai.com/api/reference/resources/responses/streaming-events)、[独立保存 reasoning](https://developers.openai.com/api/docs/guides/reasoning)。

建议 CP 保存本地完整有序 input/output items、call_id/item_id、最终 opaque reasoning、tool result、terminal/error/incomplete metadata 和当前控制循环位置；不要求远端还存着 previous_response_id。store=false 只是一项请求参数，不等于已获 ZDR 或任意代理零留存承诺。只有已支持的本地 function tools 可进入 Broker；SDK 可解析的远端 MCP/web/file/code/computer 等 hosted tool 类型不因此在 HUHU 首版开放。未知无害事件可忽略但必须仍受字节/时间界限；未知会改变工具/恢复语义的 item 不能静默抹掉后继续写。

**Anthropic Messages（T10）**

固定候选 claude v0.1.26；同次 002 已编译的备选 agenticclaude v0.1.7 只作对照，不擅自替 T10 决定两套并存或升级。两者均落到 anthropic-sdk-go v1.56.0。

实际源码：
- claude.go:65–165 支持 Bedrock/Vertex 默认认证和 ANTHROPIC_MODEL fallback；349–368 显式 direct APIKey/AuthToken 时手工直接服务，避免环境凭证贡献第二把 key，但仍会先采 ANTHROPIC_BASE_URL，显式 BaseURL 才覆盖。HUHU 构造前必须验证完整 direct 配置，不传云配置、不从空值进入环境分支。
- 398–483 Stream 的 goroutine 拥有 SDK stream，关闭本地 reader 不等于 HTTP 接收已经结束；1453–1586 的 convStreamEvent 丢弃 MessageStop/ContentBlockStop，普通转换 API 不提供终结证据。
- ToolUse / InputJSONDelta 进入工具参数；1617–1646 用当前工具编号而非保留全部 content block index，且把 {} 初值归为空参数字符串。须用按 block index 的完整 batch 状态验证交错/重放/空对象，不直接执行仍不完整的输入。
- 1389–1448 将 input/cache-read/cache-creation 加成 PromptTokens，并保留 output/推理细分；流 message_delta 是累计值，不是每块费用。只收到 message_start / 部分 delta 时仍不能宣称最终完整已知。
- 1057–1119 的输入重建要求 thinking 文本与签名均非空；1453–1511 对 RedactedThinkingBlock 是空分支。备选 agenticclaude/convertor.go:637–639 也明确 drop redacted，event_convertor.go:82–104 未转该 block；换成备选不能自动修复。
- agenticclaude 可以保留空文本 thinking 的 Signature（convertor.go:285–286/624–628），显式 direct auth 通过 WithoutEnvironmentDefaults 禁环境 key，随后显式 BaseURL 覆盖环境 base；但 Config 同样没有直接 MaxRetries 开关。

官方 Messages 流按 block index 聚合 partial_json，block_stop 后才解析；message_delta usage 累计，message_stop 终结。工具返回用 user 内 tool_result 对应 tool_use_id，可空结果，错误用 is_error；thinking/signature/redacted blocks 在工具轮必须完整原样传回，空 thinking 文本不代表可丢签名。[Messages 流](https://platform.claude.com/docs/en/build-with-claude/streaming)、[工具结果](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)、[Thinking 保存](https://platform.claude.com/docs/en/build-with-claude/thinking)。

建议 T10 在已选 SDK 基础做受控 lossless bridge/最小修补，或对尚不支持的配置明确 capability denied；不能假称两候选原封不动即可满足完整 CP。最终 stop_reason 必须归一：end_turn/stop_sequence 与 tool_use 分开；max_tokens/上下文截断保留 partial，refusal 不触发工具，pause_turn/未知 stop 不自动免费续跑。官方示例的增加 max_tokens/retry 不能变成绕过根预算的默认行为。[停止原因](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)。

### SDK retry、数据边界与资源结束

OpenAI v3.44.0 requestconfig.go:192–198 和 Anthropic v1.56.0 requestconfig.go:168–176 默认 MaxRetries=2，即初次之外最多再试两次；shouldRetry 包括无响应、408/409/429/5xx 及显式 retry header。实际 retry loop 每次重新调用 handler/Do，并在下一次前关闭旧 body；这不是一次逻辑 Generate/Stream 的单请求成本。Eino v0.9.22 adk/chatmodel.go:403–407 的 ModelRetryConfig=nil 才关闭 ADK 层重试，另有 ModelFailoverConfig，首版不要装配自动 failover。SDK retries 与 ADK retries 叠加可能放大请求次数。

优先在受控 SDK 构造中 WithMaxRetries(0)，由公共请求控制器有界重试。Responses 已有 Config 字段；claude / agenticclaude 固定 Config 无此开关，需 T10 选择可传 SDK option 的窄桥/维护点，不能声称当前配置已关闭。若保留 SDK retries，HTTP 最底层每次实际尝试必须重新 reserve/dispatch/settle，拒绝后不得 Do；也需界定等待/backoff 和关闭上界。禁止盲目改 module cache、用大量补丁复制整个 SDK 或为绕开一处缺口重新实现三协议。

实际 SDK parser 也不是产品资源限制：Chat fork ReadBytes 可累积无界单行；OpenAI/Anthropic ssestream 的 Scanner 使用 MaxScanTokenSize<<9（单行约 32 MiB），同一 SSE event 的多 data 行写入 bytes.Buffer，没有同样的 event 总量阈值。schema.Pipe(1) 只限通道项数，不限单项/累积文本；OpenAI SDK 见 [DONE] 后仍读到底层 EOF。故建议：
- 配置/上下文合成、序列化请求、response body（按解压后读）、单 event/行、output item/块数、单工具参数、单工具结果、最终文本、CP、队列与 event sink 都须有显式界限及 deadline/idle deadline；不能只限最终 UI 文本。具体数值沿既有合同/实施测量，不在研究新增隐藏默认值。
- JSON 在完整边界后严格解码：object/schema、未知字段、重复键歧义、深度/长度、数值范围、UTF-8 与截断；服务端 strict 不能替代本地校验。模型给的权限/文件路径不成为授权。
- 空成功文本/空工具结果与 nil/EOF/error/truncated 分开；不把未执行标 completed，不用截断有效 JSON 的方式凑上限。超限结束本请求和 producer，费用留真实/未知，不无预算“修复 JSON 再问一次”。
- 控制器拥有 child context、SDK stream / body、消费者与 producer 的 join；取消顺序是禁止新发送→cancel→Close→Wait/有限 drain→记录结算并释放在途容量。公开 schema.StreamReader.Close 只关闭消费侧，没有 producer Wait；现有 EinoExt 自建 goroutine 需可观察结束的最小桥/包装，不能宣称调用 Close 就已 join。等待超时仍占有/隔离未明资源或交统一关闭处理，不启动无界“等它结束”的补偿 goroutine。
- 日志不记录 prompt、工具参数/结果、source 正文、opaque reasoning、Authorization/header、SDK 原始 API error body、CP payload。错误映射用有限 code/status/attempt 与安全 reason；当前 SDK error 字符串可能含服务端文本，不能直接作为 Run.Reason/诊断日志。清除 secret []byte 不等于 SDK string 拷贝被擦除。

### CP / 首个待批 / 无新效果恢复

复用 034 已有实际 Eino v0.9.22 证据：Runner 保存 CP 失败仍可能随后发 Interrupted；未设置 CP ID 也可中断。此次没有重跑。SDK ADK store.Set/Get 与 Compose 的不同 checkpoint option 不混用；一次 attempt 读取旧已发布 Blob、写新不可变 Blob，逻辑 checkpoint ID 相同也不能覆盖旧引用。

建议三协议在同一受控循环履行以下顺序：

1. 消费完整模型 turn，确认协议终结/工具参数/usage 分类，并结束当前 HTTP producer。工具 batch 中每项建立稳定 provider-call 身份与顺序；“模型又生成一次相同参数”不等于原意图。
2. 所有工具只调用已绑定 ToolInvoker/Broker。第一个合法待批意图先关闭 Run 的新效果准入闸门；SDK 并行回调中的迟到意图只能记录/拒绝/待续，不取得第二份写效果资格。不能把 permission denied 或“等待审批”当工具成功自动继续模型。
3. CP 包含完整协议 transcript/opaque items、批次顺序、已完成结果、当前待批 intent、尚未执行意图和 SDK interrupt 地址/循环位置。Broker 返回的暂停 token / effectId 与 CP 对齐；未执行意图不是已预批效果。CP 写失败/超过 1 MiB/序列化不兼容时不得公布等待审批。
4. 通过 CheckpointAccess.Publish 得到已确认 Artifact，再让现有 PublishSuspension 做同 Tx 审批/Run/Effect/event 发布。SDK 的 Set 成功与真实 Blob 可验证必须共同成立；只见 Interrupted 不足够。
5. 正常批准/拒绝/过期由现有同一 Executor Continue→Engine.Resume 注入确定工具结果；批准后的真实写继续由 Broker 的单独 dispatch 事务控制，拒绝/过期无 Host 写。Resume 不再次执行已提交工具、不换 effectId，后续未执行意图按当前权限重新走 Broker；模型下一回合重新请求预算许可。
6. 崩溃前 running 树的恢复资格/用户点击由 T16 负责；恢复先验证当前 Grant/成员/固定配置/CP/效果版本、cancel/claim 代数。未知效果先核查，不裸 Resume 自动重写；pin 与已发布 CP 不在 waiting 时释放。CP 不是来源权限快照的永久通行证：旧正文已撤权时不得外发，必要时恢复 blocked，不能为满足签名连续性继续泄露撤权内容。

当前只有 note.write 的恢复结果，T11/T12 扩工具时需原 owner 明确 batch 位置和工具结果多态。单一公共 Engine 合同不要求三个协议使用同一种 SDK Message；私有桥可保留各自完整状态，公共合同只承载受控输入、结果、事件及 artifact 身份。

### 最小原 owner 维护清单

下表给 Root 后续精确窗口，不授予本研究任何写权。Go 路径前缀是 native/huhubot/internal/，TS 是 src/modules/huhubot/；“规划”路径目前不是现存实现。

| 原 owner / 最早消费者 | 现存最小文件或明确规划路径 | 维护目标 |
| --- | --- | --- |
| T01 Go 公共合同 owner foundation_go；T12 首先 | Go application/api/{conversation,tooling,access}.go；按需要新增本域纯 api 文件 | run-bound 模型请求预算/结算与生命周期 capability；通用有界 ToolCall/ToolResult；typed usage 质量；不泄露 SDK/Tx。新增文件也先进入 T01 精确写集。 |
| T01 schema + 原 TS owner foundation_client；T12 需要公开 usage/limit 时 | contracts/hap/v0.1/schema.json、相关 fixtures/generator；Go protocol/hap/{types,schema,methods_generated}.go 与 schema_generated.json 中受影响生成物；TS api.ts、core/protocol/{codec,method-validation}.ts 及对应测试 | 目前多个嵌套 Run/Result schema 都只有 inputTokens/outputTokens/estimated；统一明确 quality/unknown 与真实 limits。只维护实际受影响生成物，不提前扩 implemented methods 或新增未必要公有模型请求 API。 |
| T03 / foundation_go；T11/T12、随后 T08 | Go application/execution/executor/{executor,ports}.go、adapters/outbound/sqlite/execution/{store,executor}.go | 同一 Executor 绑定 capability；每次调用的持久身份/取消交接；final ledger 汇总；普通审批/等待唤醒/人工恢复不双执行、不二次 release pin。原单聊/续跑回归继续保留。 |
| **T02 配置/pin foundation_go**；T11/T12/T08 | Go application/assistant/{ports,service}.go、adapters/outbound/sqlite/assistant/store.go | fixed config/temporary pin 复用与 usage/deletion 依赖。模型运行使用受理时 snapshot，不偷偷读最新配置。 |
| 凭证子能力原 owner credential_provider，纯接口仍 T01；T08 | Go application/api/credentials.go、adapters/outbound/credentials/provider.go；application/api/assistant.go 的 ModelProbePort 及 application/assistant/service.go 如需 | 先用已有 Resolve，只有所需受限 resolver/factory 或 Probe 真实装配缺失才请求改；不新建 secret store。models.test 是独立显式探测且不收来源/对话，当前无 probe；后续真实装配也须有界/可取消并记清用途，不能拿它作业务调用预算旁路。 |
| T05 credential_provider；T12/T08，T13 后续 | Go application/access/context/service.go、adapters/outbound/sqlite/grants/{access,delivery,store}.go；api/access.go 由 T01 | 所有实际模型出站的 read/send/固定 recipient/parent provenance 与 cancel/成员共同 fence；不能拿 250ms read-delivery gate 套长 stream。无来源内容同样有可信 Run/成员/recipient 检查。 |
| T06 原 owner foundation_go；T08/T11/T12 | Go application/tooling/broker/{service,ports}.go、adapters/outbound/sqlite/effects/{store,continuations,approvals}.go、adapters/outbound/blob/store/store.go | CP 真实 SDK/协议/工具定义兼容身份、完整 batch/多工具结果、恢复幂等与 gate；原不可变发布/同 Tx/批准派发语义不被 adapter 复制。按实需维护，不假设必须改所有文件。 |
| T12 新 owner；先于 T08 | 规划 Go domain/collaboration/policy/**、application/collaboration/{messages,scheduler,finalize}/**、application/execution/usage/**、adapters/outbound/sqlite/{usage,messages}/**、migrations/012-budget-message.sql | attempt 账本、原子 reserve/dispatch/settle、4/8 计数/等待重领、8 次 question 唤醒、所有用途归属与树屏障；先 fake Engine/受控请求 consumer 闭环。 |
| T01 依赖/迁移注册 owner；T12 及 T08 | native/huhubot/{go.mod,go.sum}、Go adapters/outbound/sqlite/migrations/embed.go | 012 注册串行，历史迁移只读；真实 Eino 锁使用 002 组合图实值及许可证，生产引入按真实消费者，不能研究顺手写锁。 |
| T08 公共 Engine + Chat owner | 规划 Go adapters/outbound/eino/{common,chat}/**、native/huhubot/tests/contract/engine/chat/**、native/huhubot/testdata/providers/chat/** | 共用循环/预算/授权/secret/stream owner/CP bridge、Chat decoder终结事实；不越域拥有全局许可/账本。 |
| T09 Responses owner | 规划 Go adapters/outbound/eino/responses/** 及本票 tests/testdata | 完整 Agentic item、stateless local CP、usage presence、typed terminal、关闭/Wait。只消费稳定 T08 公共合同。 |
| T10 Anthropic owner | 规划 Go adapters/outbound/eino/anthropic/** 及本票 tests/testdata | 在 claude / agenticclaude 选一个受控入口，处理 redacted/空 thinking、显式 direct auth、SDK retry option、block终结和usage。 |
| T16 / T20 相关原 owner | T16 规划恢复用例、T20 组合根；当前 Go bootstrap/core.go 的实际装配窗口 | 真实 Engine factory/probe/model capability 只在正式组合窗口接入；正常审批 continuation 与用户崩溃恢复分开；统一关闭有界 join。公共 transport 的 T07 取消隔离请求沿 045，不因模型研究重复扩大。 |

T08 依赖 T12/T16（Map 第 120 行明确为避免收费/恢复旁路），T09/T10 依赖 T08。可先在 T01/T12 冻结纯合同并用 fake consumer 证明 request 生命周期，再由 T08–T10 接真实 SDK；不需要用户重新批准 28 票，也不能把尚未生产消费的 stub 标成完成。

## 产物与验证

### 实际资料来源与版本

本任务使用 OpenAI Docs 技能，已实际搜索并打开官方相关段落；不是把 Root 打开的导航当证据。源码首选既有 Go module cache，无下载/执行外来程序，无安装。时间、文件 SHA256、行段见 observations.json；官方网页访问与成功/失败读取说明见 sources.json。网页按 2026-10-25 读取时内容解释，不把当前文档模型示例作为选型建议。

002 完整 REPORT 已回读；其 SHA256 是 40c8b71e009a35b055c53541754ce41fea70e290d667c567d80ee2a3df995be1。直接模块来源/许可证和组合运行图再次读到：
- Eino v0.9.22，commit 0a5ca53b9d3bf7b661dccc863465ec568a421eea，Apache-2.0。
- EinoExt openai v0.1.13，commit 0ebab92e14f26088411dbc440a1ebdc904ccd8a1；该子模块没有自带 license 文件，002 已保存此 commit 根 LICENSE-APACHE，SHA256 69849221bfb90053de2134ef5e6d540287b4b98062326492f1f96f5da685524b。
- agenticopenai v0.2.4、claude v0.1.26、备选 agenticclaude v0.1.7 均来自 commit 3603a39473c3e7b2aa3bfc11216487c94b8c7fd9，Apache-2.0。002 已核对近两年活动，047 不重新做浮动 @latest 查询或建议升级。
- 组合 MVS 的 ACL openai 是 v0.1.18-0.20260924031408-10df7cac3f6d；openai-go/v3 v3.44.0 与 meguminnnnnnnnn/go-openai v0.1.6 均 Apache-2.0；anthropic-sdk-go v1.56.0 为 MIT。不能用某单模块原 go.mod 的较低间接版本代替组合图。
- 002 Go 1.26.10 组合 compile/driver 探针为历史实际证据；它证明该组合可编译，不证明三协议流/真实工具/恢复通过。047 未重跑这些探针。

适用许可证只用于上述已有开源代码的研究/后续复用归属；本文没有复制产品实现或改 module cache。官方文档仅记录链接/短事实摘要，不推断整页有开源再发布许可。T27 最终 notices 仍须以实际生产依赖图生成。

已完整读 T08/T09/T10/T12；对应 SHA256：
- T08 f988cb84428882d6cde3619f09f25b3ec41a4734fc93e9962ac26fb68358d11d
- T09 9f9bc7f00769f7f4befa8c3cfd4c9f658dd2a1db201bca711dc0e89cf4c3cbd9
- T10 459e55626725b03f6720e7028ce08b6ad8ace7b7e69755409a7c20489c660f5a
- T12 39388147bff72713216071c25e84bf70a658fcb4d5d1224c473a72bf013247f8

Spec 3c1414c294ca55b2d6c8210d4b93f43169adf0e938f59a7501ff62119e89be2d；ARCHITECTURE 534114d3f9325f1ef9f13b33bc684f8835b676b60168227b5476cccf72556fe9；ADR d05a6885c3e87f263c341d8730f6bad3328b07c0c87e6263370f3a112f780138。只读相关段落，未改正式规范。034 的 SDK 中断证据、036 的 T07 target/receipt 边界、041 的未来 delegation/预算、045 的群与恢复接缝依原报告保留；不把历史产品观察当本次冻结审查结论。D-Bus 现场/真实 keyring 历史未测边界保持，047 没有再次触碰。

### 本地受控 HTTP/SSE 故障矩阵建议（全部未运行）

后续在本票各自 testdata/providers 与 tests/contract/engine 目录建 httptest 服务，只监听一次性 loopback，显式 endpoint 与假 key。服务按请求序号执行脚本：状态码/headers、单个 chunk、flush、停在命名 barrier、断开 body、等待 req.Context.Done。记录 request start/body read/close、并发峰值；fake budget/当前权限/NotePort 与临时 DB 记录每个 attempt 和 effect。用 barrier 控制竞争，不靠固定 sleep 证明顺序。每一格同时断言真实 HTTP 请求数、持久 attempt/usage、producer 完结、工具调用数和最终状态；临时 DB 与其他 Agent 隔离。

| 夹具/可操作脚本 | 必需断言与最早票 |
| --- | --- |
| B01 同一 Engine 首轮→工具结果→第二轮→摘要，各返回可辨 usage | 每个实际请求独立 attempt，根汇总等于逐次 ledger；不能只第一次扣账。T12 fake consumer，T08 真实 SDK。 |
| B02 预算只余一个请求，两个 child 在 dispatch barrier 同时争取 | 原子仅一方真正发送；拒绝方无 SDK Do。根/Profile 子执行计数与 HTTP数分别断言。T12。 |
| B03 返回 429+Retry-After，再 500，再 200；分别 SDK 默认/显式关 retry | 默认真实请求数可暴露 SDK重试；生产策略没有预算外 Do，每 retry 独立预留/settle。上限/取消打断 backoff。T08–T10。 |
| B04 Reserve 后取消先提交；另一变体请求 body 已到服务端再取消 | 前者计数 0 且可退；后者取消/Close/Wait 后记 known/estimate/unknown，不能全退或假 zero。同级模型仍能完成。T12/T16/T08。 |
| B05 响应头已回而 body 阻塞，消费者提前 Close 或 event sink 返回错误 | 真实请求 context canceled，body 关闭、producer 结束后槽才释放；无只返回 EOF 却泄漏 goroutine。T08–T10。 |
| B06 有持续 ping/空 data、超长一行、多 data 行不空行、无界 tool item | 在配置界限/idle 总期限内失败并结束资源；上界实际作用在解压后字节和累计 item，不只最终Text。T08–T10。 |
| C01 Chat 两个工具 index 交错，ID/name 仅首片，JSON跨Unicode边界 | 恰好两个稳定有序合法调用；无重复ID串用/字符串半截执行。T08。 |
| C02 Chat tool_calls finish 后 usage-only chunk / 无 usage / [DONE]缺失干净EOF | 正常 final usage 正确；缺失非 0；未明确终结不成功执行工具。T08。 |
| C03 Chat length/content_filter/refusal/空 choices/坏 JSON/零参数{} | 按完整/截断/拒绝/空结果分支；坏或不完整参数 Host 调用0。T08。 |
| R01 Responses added/delta/done，两工具 item_id≠call_id | result 回填 call_id；ordered完整items保留；不能把 item ID当权限或工具结果ID。T09。 |
| R02 reasoning added暂值、done最终opaque，Store=false且远端previousID查询拒绝 | 本地 CP→Resume 含最终opaque与完整output，不调用远端存储恢复，不依赖previous_response_id。T09。 |
| R03 response.failed / incomplete / error / 正常transport EOF但无terminal；usage:null | 不能仅 Err nil/TokenUsage非nil 判成功或known；部分文本保留且无写。T09。 |
| A01 text/thinking/tool blocks，重复或错index、半截partial_json | block有界且合法终结后才工具执行；同一tool_use_id结果一一对应。T10。 |
| A02 空thinking+signature、redacted_thinking、工具结果后Resume | 字节/顺序与opaque完整；两候选现有丢弃路径被夹具揭示/修正；无静默丢块。T10。 |
| A03 message_start input/cache + 多次累计output delta + message_stop；再去掉stop | 不累计相加重复收费；去掉终结时未知/partial不伪成功。T10。 |
| A04 refusal/max_tokens/tool_use/pause_turn；空成功result与is_error | 拒绝/截断不派发；错误可结构化回模型但新请求另准入；不隐式提高max_tokens。T10。 |
| P01 两写工具同批，首意图关闭gate，第二迟到 | 一个待批intent；CP含尚未执行意图，第二无Host写/无偷跑；批准/拒绝/过期同EffectId恢复。T06共享回归/T08–T10。 |
| P02 Eino Set失败后Interrupted、无CP ID、CP>1MiB、Blob成功Tx失败 | 无虚假waiting_approval；无后续工具/模型旁路；原Blob不覆盖，孤儿有限且GC不误删在途。T08 + 原T06。 |
| P03 已完成工具后crash，CP重复Resume/重复delivery，effect dispatching/unknown | 已完成结果复用、不重复Host；unknown先核查；claim/cancel代数和pin保持。T16/T08–T10。 |
| X01 第一次请求结束后撤权/换recipient/成员移除，再开始工具后模型 | 真实第二请求数0；CP旧正文不外发；无source正文也验当前成员。T12/T13/T08。 |
| X02 传假环境API key/base/model与显式配置，假云认证路径可检测 | 只用显式选择，缺配置直接拒绝；不云fallback/协议fallback，不把secret打印或写CP。T08–T10。 |
| X03 302/307跨endpoint、兼容endpoint未知事件、后端返回敏感error body | 无未授权redirect请求；未知工具语义阻止效果，安全错误不泄露正文/header。T08–T10。 |
| W01 4/8边界、父waiting_children、question唤醒8次、notify | 计数依明确谓词，queued不占模型槽；父不持无HTTP模型槽导致死锁；保留pin/任务事实，question每轮预算，notify不启动模型。T12。 |
| W02 settlement事务失败、重复settlement、crash在dispatch后/费用未知 | 余额不能错误释放/二次结算；重启不可把unknown当未发送免费重试。T12/T16。 |

此矩阵是可执行夹具设计，不是新增永久测试文件、执行结果或证明所有兼容 Provider 都遵从官方协议。真实三协议 user-owned Provider、目标模型能力/工具组合、收费、平台网络断开与真实 Obsidian 写入均 not-run；后续依票分别交真实证据。

### 实际命令与停止状态

实际只读命令为 rg --files / rg -n、cat、Python 标准库 read/hash/JSON、git rev-parse HEAD；通过 apply_patch/Python 只写 047 目录。没有 go build/test、pnpm、产品进程、受控服务器、Provider/model、真实 keyring/Vault 请求，也没有后台子进程。终端工具均同步返回，没有 exec session 待回收。

探索异常如实保留：一次误用大写 SPEC.md 的 Python read exit 1，随后 rg --files 定位小写 spec.md，成功读取 exit 0；一次 rg 指向尚不存在的 sqlite/tooling 和 outbound/checkpoint 路径，rg 报 ENOENT（管道末尾 sort 令整条命令 exit 0），随后从整个 outbound 实际文件清单定位 effects 与 blob/store。最后路径核对时也发现 application/bootstrap 不存在（同样 rg 报 ENOENT、管道整体 exit 0），从实际清单改正报告为 internal/bootstrap/core.go；context 目录仅有 service.go，已移除不存在的 ports.go。若干大范围搜索/网页输出被截断；必需完整报告/四票已独立完整读取，具体结论只取后来实际可见的行段。官方 Responses create 页面一次读取/定位未成功，.md 读取返回 unsupported content-type；以实际成功打开的 stream events / reasoning 正文作结论，不使用失败读取或搜索摘要佐证。

首次 return 实际 exit 126，结构检查要求精确 h2“聚焦交接”，原稿写成“交接”；只在本 REPORT 修正标题，首次记录保留 return-attempt1.json / return-attempt1.log。后续 return 结构校验的实际命令、stdout/stderr、exit 与本任务最后源文件复核见 return.json / return.log、source-recheck.json；manifest.json 给出交回产物摘要。它们仅是 047 的研究交回日志，不是正式 Evidence/Map/验收文件。研究停止后没有产品 writer 或需由 Root 接管的进程。

## 问题与下一步

可以据此冻结 T01/T12 的逐 attempt 合同及共享 owner 窗口；当前没有新增用户授权/产品方向问题。T12 需明确“并发子执行”的等待/重领计数谓词，保留 Spec 的 4/8 及公开生效值，不把研究的 HTTP 生命周期建议升级成新的默认限额。根/用途账本的未来消费者先接 fake Engine 与实际请求计数边界，T08 生产接入才可消费真实 SDK。

T08–T10 的关键未验收项是：完整协议终结识别、每实际 attempt预算、真实取消/Close/Wait、协议完整 CP/opaque 数据、当前权限下恢复、Claude redacted/空thinking 和 Responses usage presence；这些都不能被 002 编译成功或已有 fake Engine 验证替代。SDK minimum bridge/fix 的具体形状由各票 owner 在明确写集内实施，变更版本需重核依赖/许可/兼容，047 不提前改代码或默认改 SDK。

本研究的结论与矩阵已经足够供后续实施，不等待生产开工、不扩大外部检索。Root 全读 REPORT、核对摘要与 return 后决定接纳；completed 仅表示本次只读交接完成。

