# T04 / T06 事件、审批与 Checkpoint 接缝预检

Session: 20261025T043239Z
Task: 034-events-approval-preflight
Status: completed

研究交回；不表示 T-04 / T-06 已实施或验收。观察基线为 Map 10 / Goal 9、HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`，T03/T05 工作区候选源码仍须 Root 接纳。源码摘要与观察时间见 [observations.json](observations.json)；当前产品事实、候选设计和后续验证分别记录。

## 聚焦交接

### 可立即交给下一窗口的结论

1. **T04 可复用现有事件表开始实现有界数据库尾读。** `execution_events(run_id,seq)` 是唯一日志；`execution_runs.event_seq` 是持久高水位。查询、快照及当前读权限检查放同一短事务，等待和传输放事务外。现有库只有一个连接，嵌套调用会再次开事务的应用权限 API 会阻塞自己。
2. **T06 必须补接 RunExecutor，不能仅在新目录增加 Broker。** 当前 `EngineResult` 只有一个字符串 `CheckpointRef`；`suspended` 映射 `blocked`，通用 `Finalize` 没有 Approval/Effect 发布。需要明确的暂停发布分支，只有校验过的不可变 Blob 才能进入同一业务事务。等待审批保留 Session 占用和配置 pin。
3. **Eino 中断信号不证明 checkpoint 已写成。** 固定 v0.9.22 保存失败会先产生错误事件，随后仍产生 Interrupted 事件；没有 checkpoint ID 时也可产生中断。adapter 必须消费完整结果、记录保存成功并验证对应 Blob，不能只检查 `Action.Interrupted`。
4. **整个 Run 的效果闸门不可省略。** Eino ToolsNode 默认并行；即使开启 sequential，其循环仍继续处理后续 task。首个待审批意图必须原子关闭 Run 后续效果准入，再让 SDK 进入中断收集；第二个工具不得取得新的效果资格。普通 mutex 和 SDK 工具执行顺序都不是这个闸门。
5. **最容易漏的共享维护点是错误编解码器。** `CURSOR_EXPIRED` 已有错误码，但两端错误结构没有 snapshot / snapshotSeq；TS `codec.ts` 明确拒绝额外 error.data 字段。只改 schema 或返回类型，真实连接仍会拒收。

### 当前实际源码与约束

下表路径均相对仓库根；行号对应 observations.json 保存的源码摘要，不表示工作区之后不会变化。

| 接缝 | 实际路径 / 行 | 已证实行为及影响 |
| --- | --- | --- |
| 事件表与序号 | `native/huhubot/internal/adapters/outbound/sqlite/migrations/003-conversation-run.sql:32`、`:61` | Run 有 `event_seq`、有效来源/范围/Grant、CP 字符串引用；事件主键为 Run＋seq，body 为 JSON。没有审批、效果、CP 兼容元数据或准入闸门。 |
| 迁移版本 | `.../sqlite/migrations/embed.go:12`、`:18`、`:30` | 003→数据库版本 3；005→版本 4。006 文件不等于版本 6，后续注册必须取连续下一版本。不能回写已接纳 003/005。 |
| 初始事件 | `.../sqlite/execution/store.go:47`、`:114`、`:134` | StartRun 在同事务插 Run、消息、pin、占用、accepted 事件及回执。accepted 是直接 INSERT 的特殊首事件。 |
| 后续事件 | `.../sqlite/execution/store.go:243` | `AddEventInTx` 在调用方事务内递增 event_seq 并插入；无独立内存权威，也没有终态后禁止追加的过滤，适合后续核查事件。 |
| 一致读接缝 | `.../sqlite/base/store.go:40`、`:161`、`:165` | 仅一个 SQL 连接；`Database` 为 adapter-only，`WithinTx` 明确禁止网络、Host、模型与人工等待。初版 T04 不要求为尾读先扩连接池。 |
| 读权限 | `.../sqlite/grants/access.go:25`、`:125`；`.../application/access/context/service.go:145` | `CheckInTx(...,[read])` 可在事件短事务内复用；`AuthorizeRead` 自己开事务，不能在已占单连接的事务里调用。只读路径允许终态 Run 无 pin，不能换成 read＋send。 |
| 派生来源 | `.../sqlite/execution/store.go:145`；`.../sqlite/execution/executor.go:84` | Run 查询取 effective sources/scopes/grants。执行前合并模型历史来源后持久化；事件含正文时至少按此有效并集授权，不能只按最初附件。未来新增来源必须先持久纳入有效集，再发布派生事件。 |
| Grant 变化 | `.../sqlite/grants/store.go:155`；`.../sqlite/migrations/005-grants.sql:17` | 每次变更提升 `access_grants_clock`。可以作为权限投递代数的依据；它不替代当前逐对象授权，也不会因时间到期自行增长。 |
| 执行扫描 / 恢复 | `.../application/execution/executor/executor.go:35`、`:52`、`:80`；`.../sqlite/execution/executor.go:15`、`:46` | Runner 自有执行上下文、2 槽、100ms 扫描；仅领取 accepted。启动时 preparing/running→interrupted，不自动模型重跑。等待审批应保持停驻；无 CP 的 closing 意图不得自动放开。 |
| 现有终结 | `.../sqlite/execution/executor.go:126`；`.../domain/execution/run/state.go` | suspended 只检查 CP 字符串非空并变 blocked。Finalize 仅接受 preparing/running 与相同 claim，保存消息/usage/事件，终态释放 pin/占用；没有审批发布。 |
| 终结消费者 | `.../application/execution/executor/executor.go:177`；`.../executor/ports.go:15` | execute 总是走通用 Finalize，且其返回值当前被丢弃。T06 发布失败不可伪装等待审批成功，也不能发布成功后再让此路径覆盖状态。此处为后续接缝维护请求，不接管 T03 候选审查。 |
| pin / Usage | `.../sqlite/execution/store.go:195` | Usage 计入所有非终态 Run；waiting_approval 自然继续阻止删除。T06 不需另造 pin 仓库；未来终态 unknown 效果是否阻止删除要由效果 Usage 接缝补齐。 |
| Engine 纯边界 | `.../application/api/conversation.go:108` | Input/Resume/Result 没有工具消费者、暂停意图、CP 兼容描述或定向恢复结果；需要 T01 owner 扩展 HUHU 自有类型。 |
| 现有 subscribe 声明 | `src/modules/huhubot/api.ts:428`；`contracts/hap/v0.1/schema.json:3412` | 仅 profileId/runId/afterSeq/limit→subscriptionId/events/nextSeq。limit≤100；无 snapshot、等待参数、权限代数/清理结果；Go HAP 尚未装配此方法。 |
| 当前 TS 消费 | `src/modules/huhubot/core/protocol/connection.ts:247` | 无 ID 通知直接忽略；服务器请求一律进 Host 路由。不能凭 subscribe 名称宣称已存在持续事件通道。 |
| 错误形状 | `.../application/api/types.go:11`；`.../protocol/hap/frame.go:25`；`.../inbound/hap/router.go:35`；`src/.../api.ts:25`、`core/protocol/codec.ts:98` | Fault 没详情，wire 只有 kind/reason/retryable/correlationId；FromError 不复制额外数据；TS/Go 严格解码器和 schema 必须同步。 |
| 传输队列 | `.../adapters/inbound/stdio/server.go:18`、`:75`、`:115` | 最大 32 帧、约 2MiB、1 秒写等待；writeJob 只存已编码字节，没有 Run/授权代数或出队校验。Close 清 Host 和 pending；尚无订阅生命周期清理。 |
| 当前审批声明 | `src/modules/huhubot/api.ts:272`、`:479` | Approval 只有字符串 preview 等；resolve 要 previewHash，但返回 Approval 无 previewHash / effectId / 结构化目标版本；expectedRevision 继承可选 CommandMeta。T06 必须闭合预览绑定与 CAS 合同。 |

### T04 候选最小实现与迁移判断

**数据读取形状。** 在 `application/execution/events` 定义入口无关的 `Tail(identity, profileId, runId, afterSeq, limit)` 和一致快照结果；SQLite adapter 在一个短事务内校验 Profile、当前 Principal、Session 可见性、Run 有效来源的 read 权限，读持久高水位 H，再取 `(afterSeq,H]` 的有界页。按字节预算截页，不能只依赖 100 条；100×64KiB 事件会超过 1MiB HAP 帧。游标按十进制 64 位整数验证，TS 用 BigInt/字符串比较，不转 Number。

`nextSeq` 是实际交付并可应用的最后序号，不是有剩余页时的 H；无正文的新事件也须有明确消费语义。`afterSeq>H` 是确定的未来游标错误，不能悄悄跳到 H。每个 Run 独立游标；Run＋seq 已满足去重，不必只为 eventId 增加列。若公开 eventId，可由这对不可复用键稳定导出。

**建议优先重复有界尾读请求。** Spec §8（第 148–150 行）明确数据库 cursor 尾读、持续投递授权与恢复结果；ARCHITECTURE §11.1 接受请求/响应/通知语义，但 §11.3 没有要求必须以服务器通知推送。重复有界 tail 请求可以履行现有合同；无需为 push 扩大本窗口机制。下面保留替代方案的接口成本，供原 owner 对照，不请求新产品取舍。

| 方案 | 最小消费者与代价 |
| --- | --- |
| 重复有界尾读 / 有界 long-poll | 沿用 runs.subscribe 请求结果，每次从持久游标读；无数据时在事务外等通知/短 deadline，再重新查库。每连接/Run 最多一个等待者，最多一个未应用批次。subscriptionId 必须定义为有界逻辑流身份，不能每次轮询积累新订阅。客户端取消只停订阅；固定超时确保取消请求未传到服务器时也会释放。 |
| 显式服务器通知推送 | 需新增具名通知 schema/validator、路由、订阅关闭与失效消息、出队授权检查；TS 当前忽略通知，必须由 foundation_client 改实际连接。通知内容来自 DB 页而不是内存广播。不能让无限事件占满 Host/普通 RPC 预算。 |

两方案都可满足数据库尾读；初版按请求模式冻结即可，不因名字 subscribe 引入第二事件系统。定时重查为正确性保障，内存 wake 仅降低延迟。等待前后再读 DB 或使用唤醒代数，可覆盖“补读结束→开始等待”窗口；丢失通知最多影响延迟。terminal 不终止日志尾读能力，后来的 reconciled/unknown 事件仍可读取。页面释放只取消此读取上下文，不能使用 Run 的取消上下文。

**快照与保留。** `CURSOR_EXPIRED` 的快照正文与 snapshotSeq 必须在同一短事务中读取并授权，客户端替换可重建投影后只应用 `seq>snapshotSeq`。已保存用户消息不是事件缓存，不能随 cursor reset 删除。既有表可推导保留前缀下界：最小保留 seq；无剩余事件则结合 Run 高水位。只能删除连续、可重建前缀；禁止用中间洞伪装正常 cursor。

因此，T04 首版尾读/终态可重建前缀保留**不必新增迁移**。但不能由此宣称任意活跃流片段都可丢：当前运行中的文本只在事件中，尚无累计投影。若资源边界要求压缩活跃 Run 的旧 chunk，现有 Run/message 字段不足以重建该段；才申请新的 `004-durable-events.sql`，增加带 `run_id/snapshot_seq/format_version/body` 的可重建快照及明确保留下界，并在同事务推进压缩边界。它只是派生快照，不成为平行业务权威。具体保留数/字节/等待时间需在 T04 测量冻结，不能本报告编造通过值。

**持续撤权与队列。** 在每页/快照授权之外，交付时还须验证当前读权限、到期时间、连接代数及 Grant 变化；read 不等于模型 send。待发项至少带 Run、Principal、授权代数，不能只有裸 frame。撤权失效后清除待发正文、等待者和客户端同 Run 派生投影；回复仅含足以定位清理对象的非正文数据。客户端在权限拒绝、失效消息或连接代数失效时拒绝迟到批次。

只在查询后检查一次，不能覆盖“已进入 writer 队列→撤权→出队”。最低需由原权限 owner 和传输 owner 共同实现交付校验/失效接缝。若要严格序列化撤权提交与最后一个正文写出，可用 adapter/application 交付 fence：出队持有限时交付许可，短事务验证后关闭事务再写；撤权在同一 fence 下提交并使旧许可/队列失效。禁止拿 SQL 事务等待 pipe，也不能声称能撤回已写出的 OS pipe 字节。慢消费者必须触发有界断开；后续重连重新授权，从 DB 恢复。应用层等待预算须小于客户端 RPC timeout，避免正常无事件被误判连接故障。

### T06：Eino 固定来源与实际暂停时序

已读取 REF-01/02/04 和官方固定源码；模块缓存 Origin 证明 Eino `v0.9.22` 对应 `0a5ca53b9d3bf7b661dccc863465ec568a421eea`。参考已核验活动日分别为 2026-10-19、2026-10-19、2026-10-24，均在两年内；本任务没有重新声称全量 issue/安全审计。

| 来源、许可 | 实际接口 / 机制 | HUHU 采用差异 |
| --- | --- | --- |
| [Eino CheckPointStore](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/internal/core/interrupt.go#L31)，Apache-2.0 | `Get(ctx,id) ([]byte,bool,error)` / `Set(ctx,id,bytes) error`；Delete 为可选接口。 | 只在 Eino adapter 实现；SDK bytes 不进入 HAP。无 Delete 不等于 HUHU 无 GC；已提交引用与在途使用由 HUHU 维护。 |
| [ADK Runner](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/adk/runner.go#L271)，Apache-2.0 | 本地原始行 310–343：中断分支先保存再发中断；保存错误也发 Err 后继续发中断。Resume 先 Load，再以原逻辑 checkpoint ID 运行并保存。 | 必须给每次执行绑定 checkpoint store / ID，完整处理错误与中断。SDK Resume 调用成功不等于应用已批准或派发。 |
| [ADK 保存与恢复](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/adk/interrupt.go#L223)，Apache-2.0 | Get 后 gob decode、恢复 interrupt state；保存 gob 编码的 run context、interrupt 映射和 streaming 模式后调用 Set。 | 格式/引擎/定义版本属于私有兼容元数据。不能允许客户端上传 CP；不以任意同路径文件或字符串充当已验证 CP。 |
| [Compose checkpoint](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/compose/checkpoint.go#L75)，Apache-2.0 | Compose 提供独立 `WithWriteToCheckPointID`；ADK 的 WithCheckPointID 与 Resume 不是此接口。 | ADK adapter 用每次 attempt 的 store 分离“读取已提交旧 Blob”和“保存新不可变 Blob”；相同 SDK 逻辑 ID 不得覆盖已发布文件。 |
| [ToolsNode](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/compose/tool_node.go#L1079)，Apache-2.0 | 默认并行；sequentialRunToolCall 遍历未执行 task，无首个 interrupt 后 break。 | 可以串行降低并发，但每个工具进入 HUHU Broker 时仍检查整个 Run 的关闭闸门。同响应后续工具不因轮到自己而获准。 |
| [工具中断](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/components/tool/interrupt.go#L71)，Apache-2.0 | StatefulInterrupt 保存工具状态；定向 Resume 以 interrupt address 传恢复数据。 | 持久 effectId、意图身份及拒绝/批准结果在 HUHU ledger；SDK address 仅 adapter 私有恢复定位，不能成为授权凭证。 |
| [EinoExt OpenAI](https://github.com/cloudwego/eino-ext/blob/eee37f63ff9548c5eaec48fc157863339f8eda07/components/model/openai/chatmodel.go#L245)，Apache-2.0 | WithTools 把 schema.ToolInfo 交给模型客户端。 | 模型能看到工具 schema 不表示可直接执行 Host；所有可调用工具仅由 Broker 包装注册。三协议、重试/取消证据仍归 T08–T10。 |
| [OpenBot durable queue](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/work/queue.ts)，MIT | 持久工作项是事实，通知只唤醒；队列 claim 用 Postgres 事务/租约，区分尝试次数及可能已产生外部效果。 | 借鉴 DB-first＋可丢 wake；不引入 Postgres/Mastra/自动重试 lease，也不把工作队列当 HUHU 事件或审批事实。 |

源码参考没有直接复制入生产，无新增依赖。网页工具会压缩空行，精确原始行与 SHA-256 以 observations.json 中本地固定模块文件为准。

**候选顺序（内部执行，不增加产品审批步骤）：**

```text
可信 Work / 固定配置 / 当前有效来源
  -> Broker 校验工具、范围、目标与预算
  -> 短事务：稳定 intent/effect 身份 + 原子关闭本 Run 后续效果准入
  -> Broker 返回暂停要求；SDK 收集工具中断并产出可恢复 CP
  -> CP Set：受限临时文件 -> 长度/摘要/格式检查 -> sync -> 不覆盖发布
  -> 完整消费 SDK 结果，确认本 attempt 的已验证 Blob
  -> 短事务 CAS：CP 引用/兼容信息 + Approval + Effect.awaiting_approval
                 + Run.waiting_approval + 同一 execution_events 事件
  -> 用户 resolve 短事务：身份/版本/有效期/预览绑定/取消屏障 + 决定
  -> 真正 dispatch 短事务：重验 Grant/取消/工具及目标版本 + CAS dispatching
  -> 事务外 Host 调用；持久可信回执或 unknown；同 effectId 核查
```

第一事务中的 prepared 意图与关闭闸门不是“已发布审批”。CP 尚未写好时不得出现可读取的 pending Approval、waiting_approval 或声称可恢复的 CP 引用。该预留使 crash 前已分配的 effectId 不会因恢复重新生成；若另选无预留方案，必须证明稳定意图键和恢复闸门同样成立。第二个写工具即使参数完全相同，也不能复用第一个效果的授权；关闭状态下不再准入新效果。

Blob 发布应在 Profile 私有根内进行，由 bootstrap 提供 root；拒绝任意绝对路径/穿越/覆盖。文件写完、受限校验、文件 sync、不可变发布及目标 OS 必要目录持久化都在 SQL 之外。Eino 的 Set 收到的是完整 bytes，输入大小仍须限制；具体 Blob 文件语义与目标 OS 验证由 T06/T27 负责。每次恢复产生新 Blob，旧已提交引用保持可读。Blob 发布后 DB 失败可以留孤儿，但同一重试不能反复扩大孤儿量；GC 保护正在发布/提交的对象，提交结束后再释放在途保护。

发布事务必须核对 Run/claim/预留意图与当前状态；若取消先提交，不能进入等待审批。等待阶段不持有执行槽中的人工等待，也不持有 SQL/文件句柄。CP 字符串非空不再是 suspended 的充分条件。恢复通过 HUHU 的当前账本决定构造定向 resume；rejected/expired/canceled 不能被裸 SDK Resume 解释成批准。已 dispatching/unknown 的 effect 先核查，不能换 effectId 或盲目再调用。

**审批资格与来源 Grant 分开。** 当前 `GrantOperation` 只有 read/search/send/summarize/memory/delegate/deliver，没有 write。本票不能顺手增设全库 write Grant。来源 read/send 证明资料可读取/送往固定接收方；单笔记效果是否允许执行，由当前用户 Principal 对确切 effect 的批准、当前 Run 取消屏障及受信工具能力共同决定。模型参数只能描述动作，不提供用户身份、审批状态或能力。T06 的纯目标 Port 应传 `workspaceId/resourceId/create-or-update/baseRevision/capabilityVersion/implementationVersion/previewHash` 等确定数据；T07 再接入 Host 侧当前目标版本、create 已存在、未保存编辑器输入和实际变更前复核。这里不以 read/send 冒充写批准，也不以批准解除来源授权限制。

**恢复与 pin 闭环必须在共享执行器中接上。** 当前只 claim accepted，不能仅把审批状态改 approved 然后依赖扫描自动继续。T06 的 Resolve/过期处理必须把持久决定交给明确 continuation 接缝：若继续引擎，记录可领取的恢复意图/代数，提交后唤醒执行器，执行器通过 `Engine.Resume` 注入 HUHU 的 approved/denied/expired 结果；若本次不再继续，则走原子终结。T06 用 fake Engine 验证此通路，T08–T10 替换为真实 SDK adapter，不在 T06 增加模型调用。拒绝/过期返回结构化 denied 工具结果，不能令恢复工具取得 dispatch；取消走取消屏障和收尾，不能裸 Resume 去解释或执行被取消工具。具体产品续跑策略沿原 Spec，不在本报告另造自动付费重试。

这里与 T16 的边界有明确原文：Spec §4 第 101 行要求崩溃后“对已 running 的树”安全核查后“等待用户点击”，且 waiting_approval 继续等明确审批；§7 第 134 行则规定“拒绝、过期、取消解除等待但不执行该效果”，并允许模型解释拒绝。§7 没有逐字要求过期后一定再次调用模型，也没有要求正常 resolve 后再点一次崩溃恢复。建议 T06 正常批准/拒绝在决定提交后即由同一 Executor 领取 continuation，经纯 Engine.Resume 交回该决定，形成真实 fake-Engine 闭环；过期同样进入可消费的 denied/expired 通路，必要的终结策略不能停在仅改表。T16 负责崩溃 interrupted/recoveryGeneration 的安全检查和手动恢复，不能成为 T06 正常审批链未装配的理由。

continuation 只允许恢复绑定的 Run/意图/effectId，不把旧 gate 无条件改 open；批准工具仍单独 ClaimDispatch，拒绝/过期只产生 denied 结果。当前效果结果持久处理完后，才按后续意图准入规则开放下一阶段；并行迟到调用和旧 claim 不能借新代数获得资格。

等待审批、恢复意图待领取和非终态引擎继续均保留同一 pin/Session 占用。决定不能单独释放 pin，也不能让旧 Execute 的 Finalize 与新 continuation 各自释放一次。终结在一个事务写结果/usage/事件并解除占用、释放不再需要的运行 pin；失败的事务不呈现释放成功。若未来已 dispatching/unknown 效果仍需核查，ledger 应保存核查所需确定版本，Usage 接缝继续阻止破坏证据的删除；不要靠无限保留一个无法恢复的运行 pin 代替效果依赖管理。原 CP Blob 在 DB 引用和在途恢复结束前不得 GC。

### HUHU 纯 Port 最小形状建议

以下为可冻结接口的职责草案，不是新增正式 API；名字由原 owner 收敛。Go Domain/Application 只依赖标准库和 HUHU 类型。

| 接缝 | 必要输入 / 输出与边界 |
| --- | --- |
| `ToolInvoker.Invoke(ctx, ToolCall)` | ToolCall 仅 toolCallId、能力名/版本和受限参数；可信 Run、Principal、recipient、父范围及 claim 在创建 invoker 时绑定。结果为 completed / denied / approval_required，加稳定 effectId / 暂停 token；不把 caller 交给模型参数。 |
| `EngineInput` / `EngineResumeInput` | 保持当前 Run、配置和已授权上下文，增加上述受控消费者；Resume 输入为已提交 CP 描述和 HUHU 决定。SDK message/Action/interrupt state 不透出 adapter。 |
| `CheckpointPublisher.Publish(ctx, boundedReader, metadata)` | 标准库 io.Reader 与自有 metadata；返回内部 `CheckpointArtifact{ref,digest,size,engineVersion,formatVersion,definitionDigest}`。ref 是 opaque ID，不是客户端路径。实际 bytes 仅 Engine→Blob adapter，不能放 HAP DTO/日志。 |
| `EngineSuspension` | 暂停 token/稳定意图与已确认 artifact，禁止任意 bare CheckpointRef 直接变等待审批。应用对 artifact 的来源/归属再校验。 |
| `Broker.PublishSuspension` / Repository | 一个应用调用，一笔 SQL adapter 内 UoW，完成上面的审批发布 CAS 与事件。`*sql.Tx` 仅存在 effects/execution/grants 等 adapter 之间。 |
| `ApprovalsAPI.List/Get/Resolve` | 当前 Principal、Profile/命令代数、必需 expectedRevision、预览摘要、确切 effect/目标/能力/策略/有效期。公开可审核预览与 hash，不公开 SDK CP。重复相同 key 返回原决定，异输入冲突。 |
| `ClaimDispatch` | 根据确切 effect 的持久用户批准，在短事务内重验当前来源 Grant、Run 取消屏障、版本和目标基线，再 CAS；返回内部受控派发许可，事务外才调用 fake/真实 Host。现有 Grant 没有 write；不能由 read/send 或 resolve 回执直接当许可。 |
| `CancelBarrier` | T06 为本票批准竞争需要一个真实持久取消入口/接缝，使发布及派发都检查同一 Run 状态或代数。T16 再完成整个取消/恢复产品流程；不能拿内存 fake 标志证明 AC-028。 |

006 的必要持久信息：效果身份/稳定意图唯一键及状态、确切目标/参数/能力/策略版本、审批决定/修订/到期及预览绑定、CP 引用及兼容摘要、Run 级准入闸门与发布归属。可以在现有 Run 表加少量控制列，或用以 run_id 唯一关联的控制行；本报告不锁定二者。已有 Run revision/status 能作为取消 CAS 时，不再冗造第二套取消权威。已存在 checkpoint_ref 不能代替 CP 完整元数据，也没有地方持久表达关闭准入。

### 精确 owner 维护请求

所有请求由 Root 更新原 Ticket/Map 后才成为写权。本任务没有授予权限；各 owner 保持原职责，T04/T06 实施者不跨目录自行修共享文件。

| 唯一 owner | 请求路径 | 最小目的 / 顺序 |
| --- | --- | --- |
| foundation_go / T01 | `native/huhubot/internal/application/api/types.go`、`conversation.go`；新增 `api/events.go`、`api/approvals.go`、必要 `api/tooling.go` | 一次冻结 Events / Approvals Facade、typed cursor details、纯 Tool/CP/Suspension Port 与必需 CAS 字段。新文件名为建议，可合并；不能另建平行 Application API。 |
| foundation_go / T01 | `contracts/hap/v0.1/schema.json`、`methods.json`、`fixtures/methods.json`、`fixtures/golden.json`、`generate.mjs`（仅确需）；`native/huhubot/internal/protocol/hap/frame.go`、`methods_generated.go`、`schema_generated.json`；`src/modules/huhubot/api.ts` | 同一窗口更新 subscribe/快照错误/审批预览绑定，生成两端合同与有效/无效夹具。若选推送，再明确通知形状；不能只新增 TS 类型。 |
| foundation_go / T01 | `native/huhubot/internal/adapters/inbound/hap/router.go`、新增 `hap/events.go` / `hap/approvals.go`、`native/huhubot/internal/bootstrap/core.go` | 路由、稳定错误详情映射、已实现 capability、事件/Broker/Blob/审批与执行器装配；Bootstrap 只构造依赖。 |
| foundation_go / 原 T03 owner | `native/huhubot/internal/application/execution/executor/ports.go`、`executor.go`；`native/huhubot/internal/adapters/outbound/sqlite/execution/store.go`、`executor.go`；`native/huhubot/internal/domain/execution/run/state.go` | 授权的一致 Run snapshot 读取辅助、统一事件追加、prepared→waiting 发布接缝、暂停分支避免通用 Finalize 覆盖、发布失败可观察、重启 closing/pending 处置、取消屏障，以及批准/拒绝/过期 continuation 的持久领取→Engine.Resume→终结。完整维护 pin/占用与旧事件序号。原 owner 维护相关既有测试；T06 新故障夹具放本票测试目录。 |
| foundation_go / T01 传输 owner | `native/huhubot/internal/adapters/inbound/stdio/server.go`；既有 `native/huhubot/tests/contract/foundation/duplex_test.go`、`frame_test.go`、`fixtures_test.go`，按实际触发维护 | 订阅清理、writer 队列身份/出队授权/失效接缝、可恢复慢消费者结果；沿用现有有界单 writer，不另开无界通道。轮询模式仍需处理查询完成后排队撤权窗口。 |
| foundation_client / 原 T01 TS owner | `src/modules/huhubot/core/protocol/codec.ts`、`codec.test.ts`、`connection.ts`、`connection.test.ts`、`method-validation.ts`、`method-validation.test.ts`；实际跨进程夹具按消费接缝维护 | 同步严格错误详情校验；仅选 push 时新增通知路由；两方案均需要关闭/失效/迟到批次的生命周期出口。方法形状计数由唯一 schema 得出或同步精确值，不能重复 122→126 接缝遗漏。 |
| credential_provider / 原 T05 owner | `native/huhubot/internal/adapters/outbound/sqlite/grants/access.go`、`store.go`；`native/huhubot/internal/application/access/context/service.go`；必要 `application/access/grants/service.go` | 复用当前 read 检查，提供授权版本/到期及撤权失效协作；dispatch 保持来源 read/send 检查，确切单笔记 effect 的用户批准另由 T06 处理，不增加全库 write Grant。交付 fence / Mutation 后失效通知如采用，由此 owner 与传输 owner 联调；不是先拿全权限再 UI 隐藏。 |
| T04 Go 实施者 | 原票 `application/execution/events/**`、`adapters/outbound/sqlite/events/**`、`tests/contract/events/**` | 实际 DB 尾读、快照、授权、有界等待与故障夹具；默认不申请迁移。需 active stream 压缩时另提 004 正文必要性。 |
| T04 TS 实施者 | 原票 `src/modules/huhubot/core/events/**`、`services/events/**` | 按 Run 投影、去重/补洞/快照恢复、撤权清理和页面 detach；消费者走真实 BotClient，不直接读 DB。 |
| T06 Go 实施者 | 原票 effect/approval domain、broker/approvals application、sqlite/effects、blob/store、`006-approval-effect.sql`、`tests/contract/approval/**` | 新业务及 Blob 实现；只使用已冻结共享 Port。借用 AddEventInTx / CheckInTx 的同库 adapter 接缝，不能从应用暴露 SQL。 |
| foundation_go / T01 schema owner | `native/huhubot/internal/adapters/outbound/sqlite/migrations/embed.go` | 006（及若确需 004）正文稳定后串行 embed/注册。当前下一版为 5，按实际接纳顺序；不修改已接纳旧 SQL。 |

目前不需要为研究新增 go.mod/go.sum 变动；真实 Eino 依赖及三协议构造在 T08–T10 的 original owner 窗口锁定。CP/Blob root 可直接从现有 `profile.Handle.Directory` 由 bootstrap 注入，无需向客户端开放路径。T06 没有读取真实 Vault，也不接管 T07 的写入与回执。

### 后续最小故障矩阵

下列均为待实施验收，未在本研究运行；每项必须从真实公共 API / Runner / SQLite 观测，并使用独立一次性 Profile。关键并发追加 race；真实 SDK 相关项在 T08–T10 用离线协议服务器覆盖三条路径。

| 场景 | 必须回读的结果 |
| --- | --- |
| 首个 intent 关闭后，CP 临时文件未完成就退出 | 无 pending Approval / waiting_approval / 可恢复 CP 引用；没有 Host 调用；临时文件不被 Load；重启不自动重新放行第二工具或重开模型。稳定已预留 effect 身份可解释。 |
| Blob 已不可变发布，DB 发布事务任一写失败 / commit 失败 | CP/Approval/Run/Effect/event 全部回滚到一致先前状态；无半张审批；孤儿只可在无引用、无在途保护后回收。重新读取证明原 Blob 未被覆盖。 |
| Eino Set 失败但随后有 Interrupted；未设置 CP ID；SDK gob 失败 | adapter 不发布审批，不把中断或字符串 ref 当持久成功；给出安全故障且结束 SDK 流/资源。 |
| 一个响应含两写工具，同时/顺序进入 | 仅首个合法意图关闭闸门，后一个无新效果资格，无两份互相竞争的 pending；同意图恢复 effectId 不变，同参数新意图不冒用旧批准。 |
| 批准 vs 拒绝 / 过期 / 取消 | 版本与状态 CAS 只有一个合法决定；重复同命令可读原回执。取消提交后再争派发必失败；先取得 dispatching 的不伪装被撤回，进入已发生/unknown 核查。 |
| 已批准后 Grant 撤销、目标/能力/策略变更 | dispatch 再校验失败，Host 调用数为 0；不把先前审批回执当派发许可。目标实际版本由 T07 Host 写前再次检查。 |
| pending 审批重启、pin 删除竞争 | 查询只能看到完整已发布 CP/预览/效果/Run；等待不自动执行；Session 仍占用、配置仍 pinned，Usage 阻止不安全删除。 |
| 批准/拒绝/过期后恢复领取、取消后 SDK 迟到结果 | fake Engine 真实经 Engine.Resume 收到确定决定；拒绝/过期工具没有派发资格，取消不进入裸 Resume。决定→continuation→最终结果的 pin/占用只释放一次，崩溃与 stale claim 不覆盖新状态。 |
| 快照读中追加新事件 / 补读和等待之间追加且丢 wake | snapshot 内容与 snapshotSeq 一致，后续仅取 `>snapshotSeq`；无丢失/重复最终状态。尾读来自 DB，丢 wake 不丢事实。 |
| 重复、乱序、洞、未来/过期 cursor、不同 Run 相同 seq | 去重后状态一致，补洞或一致快照；未来 cursor 明确拒绝。不可比较不同 Run seq；terminal 后核查仍可应用。 |
| 撤权发生于查询后、writer 排队中、无新事件等待中 | 不再投递旧授权正文，清待发队列/等待者；有非正文失效/错误可让客户端清投影。重连和快照同样拒绝；到期无需等 clock 变化。 |
| 慢消费者/超大单页/页面卸载/连接关闭 | 帧和字节有界，无无限等待、goroutine/订阅积累；清客户端失效缓存但不删用户消息；Run 在页面关闭后继续；重连重新授权后可续读。 |

## 产物与验证

- 本报告与 [observations.json](observations.json) 是唯一写入。后者保存 52 个项目/固定 Eino 文件 SHA-256、关键原始行、模块 Origin、HEAD、读取纠正和官方链接。
- 已按 TASK 回读 workspace/catalog/runtime、Map/Goal、dev 架构/测试/许可参考、T04/T06、相关 Spec/ARCHITECTURE/ADR、两个预读 Evidence 与 REF01/02/04；不激活新的 change/workflow，不改变票状态。
- 实际验证为只读源码和官方固定来源核验。`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/bot --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture --session 20261025T043239Z --task 034-events-approval-preflight --stage return` 已退出 0，errors/warnings 均为空，原始回执在 observations.json。没有运行测试/build、实际 Eino 中断探针或产品 E2E；Root 正在验证的 T03/T05 不被本报告代验收。
- 交回前重新计算来源摘要，产品源码/合同/固定模块与观察快照一致；只有并行维护的 goal-plan.md 内容变化，已只读核对其仍为 Goal 9 / Map 10。本任务未写该文件，不把并行计划进度当作本研究产品验收。
- 没安装新依赖，没有访问真实模型、Obsidian/Vault/keyring，没有启动 dbus 夹具、后台进程或子 Agent，没有生产文件/正式工件/他人报告改动。当前工具命令均已退出。
- 个别首次按猜测路径读取返回文件不存在，已用 rg 找到实际路径并回读；原始纠正见 observations.json。不存在的路径不作为事实或验证证据。
- 官方固定源码仅用于机制研究；Eino/EinoExt 为 Apache-2.0，OpenBot 为 MIT；没有复制代码入产品，不据此新增分发声明。

## 问题与下一步

Root 接纳 T03/T05 后，可优先冻结 T04 有界重复 tail 请求及两端错误/快照、T06 审批预览与恢复合同，再把上表精确共享路径交原 owner 维护。随后可并行 T04 Go、T04 TS、T06 Go，但共享 schema/API/注册以及最终生成物/全局 build 窗口串行；每组数据库夹具独立。

本次未锁定保留阈值、CP 最大尺寸/格式兼容政策或新的产品选择；这些参数在实施测量中按既定 Spec 收敛。当前没有新授权或用户审批缺口。T04/T06 的真实 SQLite 故障、TS/Go 队列与撤权、Eino 三协议暂停恢复、文件不可变发布的目标 OS 耐久性仍待各票验证；真实模型/Obsidian/目标 OS 现场继续遵循用户后验安排。研究 completed 只表示此只读交接完成。
