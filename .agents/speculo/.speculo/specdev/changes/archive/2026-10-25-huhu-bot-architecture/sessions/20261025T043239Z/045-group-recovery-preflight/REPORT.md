# T13 群路由与 T16 调用树恢复只读预检

Session: 20261025T043239Z
Task: 045-group-recovery-preflight
Status: completed

## 聚焦交接

### 结论与证据边界

T13 应把群路由接到既有 Run、配置 pin、Grant、Effect、持久事件和未来 T11/T12 的工作线程/预算合同；T16 应在同一 Executor 上增加树取消、核查和用户恢复。不能复制一个群执行器、另建任务完成库，或用新 Run / 新 effectId 把恢复伪装成重试。Spec 已决定默认仅协调者、显式 @ 仅指定成员、成员撤权立即生效、运行过的树核查后等待用户恢复，没有需要重新向用户确认的产品决定。

本报告是实施接缝研究，不是候选代码审查、测试通过或 T13/T16 开工授权。当前 Map 13 / Goal 12；042/043 的 T06/T04 及原 owner 维护仍在进行，044 已由 Root 实际接收。下文“观察”仅指 observations.json 中的读取时点。2026-10-25 10:36:27 UTC 复核时，`sqlite/execution/executor.go` 与 `sqlite/events/store.go` 已改变，相关具体实现观察已标失效，不将旧行号/旧行为当作后续冻结候选结论；维护目的仍来自 Spec。其他当时摘要相同也不等于冻结或通过。

三个应尽早纳入 owner 窗口的要求：

1. **T07 首次真实 Host 写入就要处理共用连接的取消影响。** 当前 Go 反向 Host RPC 的 ctx 结束会 `s.Close()`；TS 的非读取 Host 操作超时/abort 也会结束连接。T16 仅取消一个子树不能因此关闭其他树共用的 Host/stdio。T07 先建立有界在途效果结算与可核查回执边界，T16 再验树隔离；这不是对当前 fake NotePort 的新增正式缺陷。
2. **T13 成员撤销必须接到实际发送 fence，而且覆盖没有 SourceRefs 的群正文。** 当前 Grant fence 可以串行化撤权事务与物理写出，但空来源会跳过 Grant 受众检查。群成员身份/历史范围应有独立、当前的谓词，结果入库前和真正出站前都检查。
3. **T16 不能接管或阻塞 T06 普通审批续跑。** 当前已有 Resolve/过期持久 continuation → 同一 Executor → Broker.Continue → Engine.Resume。进程重启后尚未领取的已决审批续跑仍属这条正常链路；曾领取并进入执行的树则进入 T16 核查。用户恢复需要可读的恢复资格及代数，不能只暴露一个没有生产消费者的 `runs.resume`。

原 T02 配置/pin owner 是 **foundation_go**，T05 Grant/来源授权 owner 是 **credential_provider**。041 报告 owner 表把 T02 标成 credential_provider 是历史误标，本报告更正归属，不改写已交回的 041。

### 已回读合同与当前调用链

项目根路径为 `/home/wta/orca/workspaces/obsidian-huhu/bot`。下列路径均相对该根；研究工件统一在本 TASK 目录。完整读了 `ticket/13-groups-routing.md`、`ticket/16-cancel-recovery.md` 与 034/036/041 完整报告；相关 `spec.md` §2–4、§6–9、§11，`ARCHITECTURE.md` §5、§8–9、§13，以及 ADR-006/007/008/009/010/011/018/019/022/023/025 是行为依据。

```text
TS BotClient → HAP schema / 路由 → Application Facade
  sessions / runs.start → direct service → SQLite 原子受理
    用户消息 + 根 Run + config pin + Session 占用 + 首事件 + 幂等回执
  Executor 扫描 accepted / 已决审批 continuation
    Claim → PrepareContext / ModelHistory → 当前来源 send 检查 → MarkRunning
    → 同一 Engine.Run 或 Broker.Continue 后 Engine.Resume
    → Finalize / PublishSuspension → 同一 SQLite 事实库
  T04 tail / history / snapshot → 当前读检查 → DeliverySubjects
    → WithDelivery / Grant fence → stdio 实际写出

未来 T13：群当前成员/历史范围 → 上述受理与正文发布边界
未来 T11/T12：工作线程、关系、共享预算/实际出站 permit → 同一 Executor
未来 T16：树屏障、核查资格、用户 Resume → 同一 claim / Engine 边界
```

| 观察到的接缝 | 已有可复用机制 | 不可直接推广的当前限制 |
| --- | --- | --- |
| `application/conversation/direct/{service,ports}.go`、`domain/conversation/direct/validation.go`、`sqlite/conversation/store.go` | 命令校验、当前读、分页、message seq、原子消息写入 | Create 只组装 direct/单成员；ReadSession 只读一个成员；ModelHistory 从 Session 取历史。不能给群加几个成员后复用成成员私有工作线程。 |
| `sqlite/execution/store.go`、`migrations/003-conversation-run.sql` | 受理回执先于 busy/CAS；pin、用户消息、Run、首事件、占用同 Tx；读身份与 recipient 来源固定 | Session/Agent FK 和单 Session 非终态唯一索引是 direct 结构；RootRunID 当前回填为自身，尚无真实 ParentRun/Delegation/workThread；只允许该单聊 Bot 目标。 |
| `application/execution/executor/{executor,ports}.go` | 一个后台 Executor；扫描持久任务；按 Run 记取消函数；Engine.Run/Resume；网络与 SQL 分开 | slots=2 是当前执行器 worker 数，不是根 4/Profile 8 子执行预算；当前 ModelHistory 无群历史范围/工作线程输入；普通 Work.Continuation 是审批语义。 |
| `sqlite/execution/executor.go`（10:27:47 观察，后已变动） | accepted/审批 continuation 领取、claim token、running 事件与终态事务 | 当时 Recover 仅把 preparing/running 改 interrupted，无树/CP/人工恢复核查；当时 Finalize 只看本 Run 未决效果。不能把该旧观察当新候选缺陷，也不能把这些方法视为 T16 已实现。 |
| `application/access/approvals/service.go`、`sqlite/effects/{approvals,continuations,store}.go`、`application/tooling/broker/service.go` | 决议持久化及 generation、扫描过期、same effectId、审批后再检查 target/工具版本/来源/lease；dispatch 独立 Tx；终态后接受可信晚到效果事实 | Cancel 当前按一个 Run 操作，之后调用 Executor.CancelRun；没有树边界。Continuation 关联 ApprovalID/EffectID；不能直接当成所有恢复原因的通用结构。 |
| `api/tooling.go`、`adapters/outbound/blob/store/store.go` | CP 元数据、opaque ref、大小/hash/Run/attempt；私有文件不可变发布、DB 引用、reader hold/GC | `HUHUCP1` 信封/hash 通过不证明 SDK payload 可解码或图定义可恢复。现有 NoteWritePort 是 Preview/Check/Invoke，尚无 T07 完整恢复核查 Port。 |
| `sqlite/grants/{access,delivery,store}.go` | recipient/model binding、来源与父 scope/current expiry；Grant mutation 和实际发送共用 fence | 空 sources/scopes 直接通过来源检查；尚无群成员/current history range 谓词，Grant 不是群身份数据库。read/send 授权也不是确切单笔记效果审批的替代品。 |
| `application/execution/events/service.go`、`sqlite/events/store.go`（后者 10:28:21 观察，后已变动） | 有界重复 tail 请求、逐 Run seq、cursor gap/快照、run/message delivery subjects、实际发送前当前权限 | 当时 snapshot 本 Run 最多两条消息，event DTO 尚无树引用/恢复资格；群多结果不得默默截断或比较不同 Run seq 排全局顺序。T04 现有尾读无需为了群另造 push 总线。 |
| `api.ts`、`contracts/hap/v0.1/{methods,schema}.json`、`adapters/inbound/hap/router.go` | 预留 group、updateMembers/setCoordinator、runs.resume 的公共名称；cancel 已装配 | group 更新/用户 resume 的 methods.implemented=false。预留 schema 的 expectedRevision 对这些方法尚非 required；historyScope 两个端点皆可省略；恢复请求有 recoveryGeneration，但没有现成可读资格闭环。这些是未来 owner 补齐项，不是未装配方法现存漏洞。 |

### T13 最小群合同

**受理与路由。** @ 的受信输入是用户已选定的 agentId token/目标列表，不是扫描模型文本或姓名。应用层在任何用户消息、root、pin、派遣、预算预留写入前，一次验证所有目标都存在、启用、属于当前群且符合当前身份/模型配置；一个无效目标整体拒绝。重复目标先按确定规则去重，不重复收费。没有 @ 只调度协调者；有 @ 只调度这些成员，不能隐式补协调者。幂等命中必须回同一 root/子执行身份，CAS 冲突保留前端草稿，不能换 key 自动发送。

一条群用户意图只占用一个前台根 Run。指定成员回复是同根的子执行，借 T11 工作线程及 T12 根预算准入；不要把每个成员放进同一个 direct Session 索引，也不要为它们创建多个前台根。`ARCHITECTURE.md` §5.1 图中根关联已有 Bot 是身份说明；不能因此把“关联根身份”当成额外 Engine 调用许可。实现需要显式区分路由/编排根与需要实际模型调用的执行节点：@B/C 的 Engine 调用集合只能是 B/C。无 @ 的 A 可通过同样的协作工具委派；协调者无额外 Grant、审批或清除权。

**公开与私有上下文。** 持久 message seq 应继续在公共 Session 的同一事务里分配，成员来源/Run/root/结果投递幂等身份应可回读。不同成员先后完成后按实际持久发布顺序公开；chunk 到达顺序不是权威，子 Run seq 也不能全局比较。父模型收到的结构化子结果与公共成员回复是不同投递目标，不能把子执行的隐藏工作/私有历史由现有 Finalize 自动写回群。

新成员明确授予的历史范围，应在 mutation 受理时把同群消息 ID 校验并固化为服务端 seq 范围/授权修订，不能只保存 UI cursor 或动态“目前全部”。需要表达空历史与明确的有界历史；当前 `{afterMessageId?, throughMessageId?}` 无两端的空对象不能默认开放全部，范围缺失/含跨群 ID/颠倒/已失效时拒绝。新增多个成员的单次 mutation 若仅一个 historyScope，应明确全部新增成员共用该显式范围；需要不同范围则分开 CAS 命令，不擅造无界默认值。现有成员历史不因增员操作自动扩宽。当前公共发言可作为明确新输入；过往授权范围不因 rejoin/连接重建变宽。

ModelHistory/ContextEnvelope 应同时接收当前群成员身份与成员授权历史，再按来源 Grant、发送接收方和父 scope 取交集。不能复用 Bot 的 direct Session 历史、整段私聊、其他工作线程或其私有长期记忆作为群默认输入。新增成员可见公共群内容不等于允许任意成员模型读取所有笔记；“公共”也不消除派生结果的 provenance。

**撤销与竞态。** 建议以不可复用 membership incarnation/单调 membership revision 绑定群工作授权，旧成员移除后重新加入不得复活旧任务。它是实现当前成员谓词的建议，不是现有字段。移除事务与同一实际发送 fence 串行，提交时至少关闭该成员在群内的新准入/发布资格，更新 membership 和 Session revision，建立受影响群绑定树/子树的取消屏障；已接纳任务随后有界收尾。模型/委派/审批继续派发和最终结果发布都必须重查该群边界，不能只在 Start 检查一次。

正文在四个点受控：模型 Context 构建及实际模型出站前、公共结果入库前、history/snapshot/tail 读取时、队列中的 frame 真正写出前。最后一个点复用 T04/T05 fence；即使 SourceRefs 为空也检查当前成员/历史范围。删除先拿 DB 锁、发送先拿 fence 会形成锁序风险，所有相关 mutation 应遵守既有 fence → 短 DB Tx → 有界发送的顺序；外部等待不能持有 SQLite Tx。撤权后保留可脱敏核查的状态/回执，不能借“终态核查事件”重新投递正文。TS 清理受影响根/子投影及历史页缓存，不能只卸载一个流。

同一个 Bot 在另一群/私聊/工作线程里的工作不受此移除影响。成员子树被取消后，父收到结构化取消/失败结果；父可以继续处理其他成员已有结果，但不再给已移除成员派新任务。若移除的是当前编排根所属成员，不能为了继续而偷偷换协调者；阻断受其授权支撑的根/后代，待既有根结束或停止后才通过 coordinator CAS 变更。该边界需由 T13 明确记录并用故障夹具固定，不能按 agentId 全局 cancel。

`setCoordinator` 必须与 StartRun 的占用/CAS 同一持久竞争点：新协调者仍是有效成员，无任何活动根（包括等待审批/等待子任务/blocked/interrupted）才成功。不能只查 running，也不能将 UI 看不到 stream 视为无活动根。

### T16 分类、核查与正常审批边界

| 持久事实 | 启动后的允许动作 | 禁止动作 |
| --- | --- | --- |
| 新根 accepted，确实从未领取 | 继续原受理扫描、claim；重新检查当前权限与准入；保留原 idempotency 回执 | 把已有 user message 重新 Start；网络超时换 key |
| preparing / running，或树内存在曾领取但未确定终结的执行 | 先建立整棵相关树的恢复边界，核查 CP/效果/权限/结果；安全则发布可恢复资格，等待用户点击 | 启动自动 Engine.Run/Resume；只看某个 accepted 子节点就越过父树恢复屏障 |
| waiting_approval 且审批 pending | 继续等待明确审批；到期走 T06 既有 expired decision/continuation | 把等待当丢失任务重跑；恢复时默认批准 |
| 已批准/拒绝/过期，continuation pending、尚未 claim | 使用 T06 正常扫描 → Continue → Engine.Resume；批准再派发，拒绝/过期零 Host 写 | 要求用户再点一次 T16 Resume 才消费正常决议；重跑 Engine.Run |
| continuation 已 claim，进程在 Continue/派发/Resume 间中断 | 纳入运行过的树核查，按同 effectId 看 dispatch/receipt，再决定允许恢复片段 | 因审批 approved 就再次 Invoke；从 pending 状态猜测没有写 |
| 未来 waiting_children | 用持久 Delegation/结果回执重建等待；已完成结果按身份复用；若树有运行中断边界则等待用户恢复 | 仅凭内存 Promise 丢失重派子任务；恢复调用不扣预算 |
| canceled / canceled 子树 / 成员已移除 | 维持屏障；允许晚到可信回执补账和无正文核查事件；给父结构化取消结果 | 重启、重新入群或旧 approval 恢复该执行 |
| succeeded / failed / canceled 且有 dispatching/unknown 效果 | 独立核查并更新效果/未决标志；保留已知部分完成事实 | 恢复模型去“试试看”；用新 effectId 再写；把终态改回 running |
| blocked，例如 CP 缺失/不兼容、当前授权不足 | 保留原因与可诊断元数据、必要 pin/引用；条件变化后重新核查资格 | 自动循环重启、删除 CP/回执后重建身份 |

“accepted 可扫描”与“运行过的树需手动恢复”需按树解释：未领取的新根可自动推进；已中断树中尚未领取的后代不能被全局 accepted 扫描器单独绕过父树屏障。先划分树恢复批次，再开放允许 claim 的集合。已正常等待审批的独立树不要被无关树核查阻塞。

**核查不等于执行。** 建议 T16 用纯 Port 组合一个核查用例，名称可由 owner 决定，职责应可测：读取树和版本水位 → 在事务外验证文件/SDK兼容与可用性/Host回执 → 用短事务 CAS 保存资格及阻塞原因。核查期间不请求模型、不发写工具，不对外上传 CP，不在 DB Tx 内等 Host。只读核查与真正 Resume 分离，用户点击后重查当前条件。

| 核查项 | 当前可复用基础 | 最小新增消费者/约束 |
| --- | --- | --- |
| CP ref、hash、size、归属、不可变发布 | T06 Blob Verify/Open、execution_checkpoints DB 引用、reader hold | T16 读时 hold/保留引用；坏/缺 CP blocked。不能把 ref 字符串存在当可恢复。 |
| SDK 格式、Engine 版本、图定义/工具定义摘要 | API CheckpointMetadata；Broker 当前 metadata 与 pinned Agent/工具 descriptor | T08 的纯兼容性检查 Port 必须真正验证 SDK payload/定义，不靠调用 Resume“试验”。复用 034 Eino 结论，未在此重复 SDK 探针。 |
| 配置/pin | T02 ReadPinInTx 能取固定 persona/model 修订；缺 pin 为 RECOVERY_BLOCKED | T16 使用旧快照，不悄悄换成 Bot 当前模型；重新核对当前停用/撤权约束。非终态 blocked/interrupted/等待保留 pin。终态 pin 释放与未知效果资源保留分开，不能删除核查所需 artifact/recipient。 |
| 凭证 | T02 CredentialProvider 的状态/解析 Port；重启会把 session-memory 记录标 missing | 核查可说明 missing/locked/unavailable；实际出站再通过原 Provider 解析。不要把 DB 中 available 视为当前可用，不把凭证放 CP/RecoveryRecord；本次没有调用 Provider。 |
| 当前成员、Grant、来源和实际接收方 | T05 current read/send、recipient/model binding、父 scope；T13 membership/history | 每个未终结节点和结果目标重新取交集。模型参数、协调者角色、旧批准均不能扩权。恢复 read 不等于重新获准 send。 |
| Host workspace/lease/capability 与确切目标 | T06 当前 lease/版本/Preview Check；T07 将提供目标和核查能力 | 旧 lease 重启失效，不简单把旧 effect 换到新 lease 后写。可信新 Host 仅可在原 workspace/效果/目标绑定核查；真正再派发必须满足完整当前批准与基线条件。 |
| Effect dispatching/unknown | T06 ledger、同 effectId、终态晚到 committed；036 已确定 receipt 语义 | T07 纯核查 Port + T16 生产消费者：可信 committed receipt、可证明 postcondition 的 reconciled、仍未知分别记录。kill、超时、原文未变不能证明未发生。 |
| 已完成子任务/投递 | 未来 T11 Delegation、父结果与公共投递幂等回执 | T16 复用子 Run 与投递 ID；分别去重父结果消费和公开消息，不能因父 CP 重播复制结果。 |
| 预算/usage/实际模型出站 | 未来 T12 根余额、reserve/settle；T08 每次真实 Provider 调用 Port | 保留未知费用与未决 reserve，恢复不能重置预算；每个 SDK 重试也经准入。041 研究不是已实现账本。 |

用户 `runs.resume` 要求 CommandEpoch、expectedRevision、recoveryGeneration 与同一幂等命令回执；客户端仅提交身份/代数，不提交 CP 字节、核查结果或自行选择可信 effect 状态。`runs.get`/snapshot 或等价既有查询需返回可读的恢复资格、代数、原因，供真实消费者发起命令。当前 `resume_generation` 在 T06 表示审批续跑代数，未来 recoveryGeneration 不得仅重命名后混用：应明确树核查代数、Run revision、cancel epoch、attempt/claim 与 approval continuation generation 各自条件。

同一用户 Resume 重放返回原回执；过期资格/并发第二次 Resume/撤权/新 cancel 与 Resume 竞争只能有一个符合 CAS 的推进。继续原 runId/effectId，换新的执行 attempt/claim/恢复代数，旧 worker/event/结果不得改写新状态。对已派发效果的可信晚到 receipt 是例外：仅补该 effect 的事实，不能重开 Run、重新发布正文或自动推进过时 continuation。root succeeded 的聚合检查须覆盖活动后代、未决审批及 dispatching/unknown；失败/取消可带 effectsUnresolved 和部分结果。

### 取消屏障、实际出站与 EOF

当前 `Approvals.Cancel` 先写单 Run cancel/效果/审批/continuation，再内存 CancelRun；这是可复用的持久先于内存顺序，但不是树取消。T16 必须从可信 Run 关系求出根或指定子树，在持久事务提交屏障，再传播所有已接纳后代，包括 accepted/queued/等待审批/等待子任务/blocked。成员移除使用同一群绑定范围；不可用 Bot ID 全局杀工作。并发 delegate、approve、子结果发布、模型/工具领取必须在同一个树 epoch/当前成员谓词下竞争。先关闭准入，后 cancel context；取消 context 本身不能当屏障。

实际模型网络边界是 T08/T12 的每次 Provider 请求（包括 SDK 内部重试）取得准入许可的位置，不是单次 Engine.Run 入口。取消提交前已领取的动作算在途，取消后不能得到新许可；检查与派发需有明确线性化点，不能“先查 DB 后任意延迟请求”造成取消后新收费。模型响应晚到只结算已知/未知 usage 和必要账本事实，不能重新唤醒已取消树。无关树应继续领取。取消也不能清掉所有 Profile 模型槽或关闭共用 Host 连接。

`adapters/inbound/stdio/server.go` 的反向 `call` 在 ctx 结束时关闭连接；`src/modules/huhubot/core/protocol/connection.ts:361–417` 用 Promise.race，非 read Host 操作被 abort 时结束连接。**这是 T07 首次接入真实 NoteWritePort 就需原 T01 transport owner 维护的接缝，T16 再验证树隔离。** 实施可采用独立、有界的在途效果结算 context 与严格请求关联/有限晚到响应记账；具体实现由 owner 选择。不能将任意未知 response 放行，也不能 Promise.race 超时后立即释放 Host 写锁并声称真实写已停止。需要“真实 Host mutation 已 settle”或“效果仍未知并保留核查”的可观察边界。

EOF 分三类：页面/事件 owner detach 只停订阅；普通临时 HAP 客户端断开不撤销已受理意图；受管 Runner 的父管道 EOF、模块关闭或宿主退出应进入统一有界关闭服务。现有 `chat/transport_test.go` 只模拟临时 HAP 连接 EOF，不能拿来否定受管父 EOF 的生命周期要求。受管 `cmd/huhubot/main.go` 在 server.Run 退出后 defer Core.Close；Executor.Close 取消 worker 并最多等 3 秒，Core 继续 Blob GC/Provider/DB/profile 关闭。TS managed transport 目前 stdin.end 后 4 秒 SIGTERM、再 1 秒 SIGKILL。仅看这些常数不能证明实际预算一致或异步资源都结束。

T16/T20 需同一 ShutdownController 先阻止 API/Executor 的新受理与 claim，持久标记未结事实，然后有界停模型/Host 和后台 worker；最后才关闭 DB/释放 profile lock。当前 Service.Shutdown 的 stopping 标志主要用于 HAP 路由拒绝，不能替代所有 Application 调用/后台出站屏障。若超时强杀，保存为中断/未知，不能宣称无效果；下一进程在核查前不重放。API shutdown、父 EOF、模块卸载、信号路径不能各造不同取消策略。T20 仍需实际生命周期接入，不能依赖 Obsidian 等待 async unload。

### 精确原 owner 维护请求

下表是给 Root 的后续写集请求，不是本研究的写权。目录缩写仅限表内：`Go=`native/huhubot/internal/，`TS=`src/modules/huhubot/；每项都能还原到真实路径。现存文件与未来路径分列；当前派遣窗口结束、原 owner 回读请求并由 Root 精确登记后才可修改。

| 责任 owner / 最早消费者 | 现存最小路径 | 请求目的与必要回归 |
| --- | --- | --- |
| 原 T01 Go（当前维护 042 / foundation_go）；T07 首先消费，随后 T13/T16 | `Go application/api/{types,conversation,tooling,approvals,events,service}.go`、`contracts/hap/v0.1/{schema,methods}.json`、对应 fixtures/generate、`Go protocol/hap/{types,schema,methods_generated}.go` / `schema_generated.json` | 纯 Group/Recovery API、成员与 coordinator 必需 CAS、明确 historyScope、公开 message seq/来源执行身份、树/子树取消、恢复资格 DTO/代数、检查兼容与核查结果纯 Port。T07 的确切目标/回执原因需三边一致；只激活已装配方法，不提前 advertised。生成物保持单源，不手改第二份合同。 |
| 原 T01 TS（foundation_client，028/044）；T07 首先消费 | `TS api.ts`、`TS core/protocol/{connection,method-validation}.ts` 与对应测试 | 必需 CAS/history/resume DTO 与 Go 同步；真实 Host 写的有界结算/超时及晚到请求关联，不把子树取消变成连接级 abort；保留严格 lease/workspace/effectId 绑定与帧失败 fail-closed。 |
| 原 T01 transport / 组合（042 / foundation_go）；T07、T16 | `Go adapters/inbound/stdio/server.go`、已存在的 output 平台适配；`Go adapters/inbound/hap/{router,conversation,approvals}.go`；`Go bootstrap/core.go`、`native/huhubot/cmd/huhubot/main.go` | 最早 T07 处理反向 RPC 共用连接取消接缝；T13/T16 映射真实 group/recovery/cancel 用例并附可信 delivery subjects；启动核查/关闭控制统一装配。平台 output 文件只有相关 IO deadline/settle 合同确需变更才进入精确窗口，不默认全改。 |
| **原 T02 foundation_go**；T11/T13/T16 | `Go adapters/outbound/sqlite/assistant/store.go`、`Go application/assistant/{ports,service}.go` 及非 credentials 的相应回归 | 固定配置 pin/read/release 的同 Tx 消费；group membership/活动后代/未决效果纳入 Usage/删除预检与 usage clock；blocked/interrupted 不丢 pin；临时配置 pin 延续 041 请求。不能为了群改成 UI 自述无使用。 |
| T02 凭证原子能力 owner credential_provider；T16 如确需接口维护 | `Go application/api/credentials.go`（仍 T01 合同 owner）、`Go adapters/outbound/credentials/provider.go`、`Go adapters/outbound/sqlite/assistant/credentials.go` | 首先消费已有状态/Resolve Port，不复制 secret store。仅缺必要可用性结果才请求精确维护；session-memory 重启缺失不能假定可恢复。此行不是把配置/pin owner 转给 credential_provider，也不授权实际 keyring 探测。 |
| 原 T03（当前准入维护 042 / foundation_go）；T11/T13/T16 | `Go application/conversation/direct/{service,ports}.go`、`Go adapters/outbound/sqlite/conversation/store.go`、`Go application/execution/executor/{executor,ports}.go`、`Go adapters/outbound/sqlite/execution/{store,executor}.go` | 共用 Session 读/公共消息 seq、根占用与工作线程索引的演进；ModelHistory 接群范围/隔离线程；受理/claim/Finalize 认识真实 parent/root 与树屏障；同一个 Executor 消费 normal approval/child wait/manual recovery。T03 独有原子受理、busy、历史和单聊回归不可丢。 |
| T01 迁移注册 + 原 T03/T06 表 owner；T11/T13/T16 | `Go adapters/outbound/sqlite/migrations/embed.go`，现有 `003-conversation-run.sql`、`006-approval-effect.sql` **只读参考** | 新票迁移演进 direct CHECK/FK/唯一索引、父子/工作线程/群成员/恢复代数；013/016 由其本票写，注册由 T01 串行。不能改已使用的历史迁移，更不能把票号当当前 schema version。观察时 CurrentVersion=5，注册 001/002/003/005/006。 |
| T04 Go + 原 T05（043 / credential_provider）；T13/T16 | `Go application/execution/events/service.go`、`Go adapters/outbound/sqlite/events/store.go`；`Go application/access/grants/` 的实际被影响 Port/service；`Go adapters/outbound/sqlite/grants/{access,delivery,store}.go` | 群当前成员/历史范围谓词接源读取、模型发送、snapshot/tail/history 与物理发送 fence，含无来源正文；成员 mutation 与 Grant mutation 锁序相同；树引用、恢复资格及晚到核查事件的快照可重建。未来 membership/lineage 应经纯 Port/事务内适配协作，不能 Application 暴露 sql.Tx。 |
| T04 TS（foundation_client）；T13/T16 | `TS services/events/event-client.ts`、`TS core/events/reducer.ts` 及对应测试 | 根事件带子引用、每 Run cursor 独立；公共 message seq 与 Run event seq 分离；恢复资格/代数投影；成员撤销后清理真正失权正文缓存/排队投影；终态后 receipt 事实不把 Run 改回 running。保留 detach 不 cancel。 |
| T06（042 / foundation_go）；T07/T11/T16 | `Go application/tooling/broker/{service,ports}.go`、`Go application/access/approvals/service.go`、`Go adapters/outbound/sqlite/effects/{store,approvals,continuations}.go`、`Go adapters/outbound/blob/store/store.go` | 保留正常 approve/reject/expire Continue→Engine.Resume；树/成员屏障接 dispatch 与 cancellation；恢复核查消费同 effectId，晚到可信 receipt 仅补账；扩展 continuation 原因时不冒用审批字段；CP reader/DB 引用/GC 生命周期保留。Blob 实现若现有 hold 足够，只消费无需改写。 |
| T07（未来 owner，尚未装配）；T16 依赖其输出 | 规划 `Go application/tooling/reconcile/**`、`Go adapters/outbound/hostbridge/write/**`、`TS platform/obsidian/note-effects/**`、`TS services/host-write/**` | 按 036 的真实目标/编辑器 CAS/receipt 设计提供纯核查 Port：原 workspace/target/content/capability/implementation 绑定、committed/reconciled/unknown；T16 真正调用并处理结果。真实 Host adapter 的取消隔离先在 T07 完成；本报告不把这些规划路径当当前已有。 |
| T08（未来 Engine owner）；T16/T12 | 共享 `Go application/api/{conversation,tooling}.go` 的纯 Engine/Checkpoint 合同归 T01；T08 自有 adapter 路径依原票 | 真实 SDK CP inspect/definition check 与 Engine.Resume 消费；每次实际模型请求的 permit、取消及 usage。不能以 Eino Interrupted 标志代替 CP 持久成功；复用 034。 |
| T11（未来 owner，未实现）；T13/T16 | 规划 `Go domain/collaboration/delegation/**`、`Go application/collaboration/{delegate,discover,proposecreate}/**`、`Go adapters/outbound/sqlite/collaboration/**`、`Go application/tooling/collaboration-tools/**`、`011-delegation.sql` | 提供可信关系/root/工作线程/成员授权 incarnation/已完成结果和目标投递幂等 ID；群 fanout 复用受理，恢复复用完成结果，子树取消可求闭包。不得把 041 建议名称当已有方法。 |
| T12（未来 owner，未实现）；T13/T16 | 规划 `Go domain/collaboration/policy/**`、`Go application/collaboration/{messages,scheduler,finalize}/**`、`Go application/execution/usage/**`、`Go adapters/outbound/sqlite/{usage,messages}/**`、`012-budget-message.sql` | 根/子限制、实际出站预留、树 cancel epoch 准入、父终结守卫、重复结果/唤醒防重和未知费用；恢复不能清预算或重复发消息。T11/T12 联合窗口沿 041，不改为第二执行器。 |
| T20 原组合 owner；T16 对接，T27 负责最终集成 | `TS platform/desktop/transport/managed.ts`（现有 T01 transport owner 精确维护）及 T20 未来模块生命周期入口 | 页面 detach 与模块关闭分离；受管父 EOF 与 API shutdown 同一有界策略，强杀仅 fallback；启动/关闭预算在真实进程夹具验证。T27 串行构建/产物，研究不触碰 main.js/styles.css。 |

成员谓词应按用途区分“新任务接收者”“新结果发布者”“当前模型历史接收者/读者”，不能把移除 Bot 等同于抹掉用户已经合法可见的整个公共历史。阻止的是该成员后续新任务、无权正文流转和被撤销的排队结果；合法保留的公共记录与脱敏核查仍按各自当前权限返回。

### 票内写集、共享资源与顺序

T13 自有写集为 `native/huhubot/internal/{domain,application}/conversation/group/**`、`native/huhubot/internal/adapters/outbound/sqlite/groups/**`、`migrations/013-groups.sql`、`native/huhubot/tests/contract/groups/**`、`src/modules/huhubot/core/mentions/**`。资源是 groups-routing、sqlite-schema、provenance-and-revocation；正式依赖 T04/T11/T12。原票未列出的现存 T01–T06 路径需以上 owner 请求追加精确窗口，不能由 group 目录绕过共享维护。

T16 自有写集为 `native/huhubot/internal/application/execution/{cancel,recovery}/**`、`native/huhubot/internal/domain/execution/recovery/**`、`native/huhubot/internal/adapters/outbound/sqlite/recovery/**`、`migrations/016-recovery.sql`、`native/huhubot/tests/contract/recovery/**`。资源是 cancel-recovery、sqlite-schema、run-admission-contract；正式依赖 T07/T12/T13。

推荐 Root 按既有授权安排以下顺序，不新增审批：先冻结/接纳当前 T04/T06，T07 在真实写入口解决 receipt/在途结算/共享 transport；T11/T12 按 041 联合合同窗口形成可消费的工作线程/树准入/预算；T13 在该基础上接成员/群路由与公共投递；T16 最后接完整启动分类、核查和用户恢复，再与 T20 闭合生命周期。相同 sqlite-schema、run-admission-contract、provenance-and-revocation 的语义资源不能仅因目录不同而并发变更。

有一处需要提前安排而不能推迟验收：T13 已要求“移除成员取消群绑定在途任务”，但它不依赖 T16，T16 又依赖 T13。T11/T12/原 T03/T06 的共同准入层应先提供可被 T13 使用的最小持久子树屏障及在途取消能力；T16 消费/完善该能力并加恢复/统一关闭。Root 可通过精确联合 owner 窗口处理，不必人为加循环依赖或让 T13 以“等 T16”冒称完成。它也不是提前实施全部 T16；共享原 owner 先交付 T13 验收实际所需最小能力。

## 产物与验证

### 后续最小故障矩阵（本次全部未运行）

T13 主入口应是公共 Facade / HAP 的真实 SQLite 受理，再以 fake Engine/可计数模型出站端验证；T16 使用同一持久实现、fake Engine/Host receipt 和明确故障点。T07 传输取消的验证必须实际经过 TS↔Go 反向 RPC，而非仅直接 fake NotePort。以下是验收建议，不是新增永久测试文件或通过记录。

| ID / 首要票 | 输入或故障窗口 | 必须回读的判据 |
| --- | --- | --- |
| G1 / T13 | 无 @；@B；@B/C；重复 @B；姓名文本但无 token | 一个根意图/用户消息/占用；实际模型调用集合分别仅 A、B、B/C、去重 B、A；不隐式调用 A；子执行身份/预算/回执固定。 |
| G2 / T13 | @B 加未知/停用/非成员；成员在预检和受理间被删；重复同 key / 不同输入 | 全部目标原子拒绝，零新消息/root/pin/delegation/模型预留；重复命令返回原回执，异输入冲突；TS 草稿和 token 不被丢弃。 |
| G3 / T13 | Start 与 setCoordinator 竞争；根 waiting_approval / blocked / interrupted 时换人 | 持久占用/CAS 仅一个胜者；存在任何活动根都不能漂移协调者；错误结果不含私有数据。 |
| G4 / T13 | 增员未给历史范围/空对象/跨群 ID/反向区间；明确空历史/有界历史 | 无默许全历史；合法范围被固定；分页、ModelHistory、snapshot/tail 都不越界；private direct/workThread/记忆正文未混入。 |
| G5 / T13+T04 | 多成员乱序完成、重复结果、断线/慢消费、cursor 过期、seq > 2^53 | 公共 message seq 持久排序；逐 Run event seq 独立去重；snapshot 可重建所有合法公共结果和子引用；无重复公开/无静默截断。 |
| G6 / T13+T05 | 空 SourceRefs 和有来源两种正文排队后移除成员；实际写出前阻塞 fence | 移除提交后零失权正文出站，允许必要无正文状态；合法用户历史保留；不依赖来源数组非空才检查成员；当前 Grant 仍取交集。 |
| G7 / T13 | 移除与 delegate/模型 permit/approval Resolve/公共 Finalize 竞争；随后重新加入 | 旧 membership incarnation 的任务不再派发/发布；旧批准不能写；旧任务不复活；可信晚到 receipt 只补核查；其他群/私聊同 Bot 继续。 |
| G8 / T13 | 移除协调者/编排根所属成员；其他成员子结果已完成 | 不隐式更换协调者；只取消被群授权支撑的范围；父/根的取消或部分完成可回读，已完成合法结果不复制；新协调者待无活动根再 CAS。 |
| R1 / T16 | 受理提交后未 claim 就杀进程；另树曾 running | 新 accepted 根恢复扫描且只执行一次；运行过的树模型调用数保持 0，发布核查资格等用户；其 accepted 后代不能绕过树屏障。 |
| R2 / T06 回归 | waiting_approval 重启；已 reject/expired/approved continuation 未 claim 重启 | pending 审批继续等；已决正常 continuation 被同 Executor 恢复一次；reject/expired Host Invoke=0；approve 保留 effectId 且只一次合法派发；不新增用户 Resume 阻碍。 |
| R3 / T16 | claim 后/dispatch 前、dispatch 后/回执前、CP 写入/DB 引用之间崩溃 | 执行过的部分核查前不重派；引用/孤儿文件状态真实；effect dispatching/unknown 留账；批准、CP、Run、事件不出现半提交。复用 034/036 既有故障点。 |
| R4 / T16 | CP 字节改坏、缺文件、SDK 格式/定义不兼容、pin 缺失 | blocked 且原因可回读，模型/写调用为 0；必要 pin/DB 引用未被 GC 错删；可诊断但不返回 CP/私有内容。 |
| R5 / T16 | 核查后 Grant/成员/工具能力/目标版本/Host lease/凭证变化再点 Resume | 资格失效或重新核查；不改模型/目标绕过；current send/历史范围重新收紧；session-memory 缺凭证不自动收费。 |
| R6 / T16 | 双击/重放 Resume；旧 recoveryGeneration、revision、CommandEpoch；cancel 竞争 | 同输入同回执；只有一条可执行 claim/attempt；旧代数失败；同 runId/effectId；无客户端 CP 注入，无重复预算预留。 |
| R7 / T16 | 已完成子结果/父消费/群公开投递在不同提交点后重启 | 子模型不重跑；父消费与公共投递分别按稳定 ID 去重；根不在活动后代/审批/未知效果存在时 succeeded。 |
| R8 / T16+T12 | 根取消与新委派/approved dispatch/SDK 第一次请求及重试竞争 | 屏障后零新许可；屏障前已领取者有界结算；所有已接纳后代被传播；另一根同 Bot 的出站继续；不重置 unknown usage。 |
| R9 / T16 | 只取消子树 B，兄弟 C 正在运行；被取消 B 晚到 chunk/结果/receipt | C 继续；父收到结构化取消；B 的旧 claim/代数不能改正文/状态；可信 receipt 更新原 effect，不使 B 复活。 |
| R10 / **T07 最早**，T16 复核 | 两树共用 stdio/Host；B 的 host.invoke 已开始后取消/超时，C 正在请求 | 实际 Host mutation settle/unknown 边界有记录；连接不因 B 的树取消击穿 C；晚到 response 严格关联且资源有界；无假无效果、无重写。 |
| R11 / T07+T16 | 可信 receipt、无 receipt 但目标命中 postcondition、目标仍原文、目标被外部改写 | 分别 committed / 可证明的 reconciled / 仍需 unknown 核查；不把原文未变或进程被杀当未执行；实际检查绑定 workspace/resource/版本/content/effectId。 |
| R12 / T16+T20 | 页面 detach、临时连接 EOF、受管父 EOF、API shutdown、模块关闭；Host/模型拒绝响应 | 页面/临时读者离开不撤销持久意图；受管退出统一关闭新准入、有界收尾并保留未决；DB/锁生命周期正确；下一进程不盲重放，强杀结果仍未知。 |
| R13 / T16+T04 | 终态 canceled/failed 后晚到已知 receipt；snapshot/cursor compaction/重新连接 | 可显示核查变化但 Run 保持终态；撤权正文不回流；新事实有持久 event seq，快照重建相同状态；保留未知效果阻止冲突资源盲重写。 |

测试设计应检查数据库里的消息数、pin、claim、continuation、审批/效果、member revision、tree generation、预算/usage 和命令/投递回执，再对 fake Engine/Host 的真实调用计数；只比较返回 DTO 不够。真实 Provider、Obsidian 未保存编辑器和用户目标 OS 的行为仍由用户后验，不因本研究矩阵被视为已验证。

### 已有测试源码与外部参考的复用

本次只读了 `tests/contract/chat/transport_test.go` 的临时连接 EOF 用例、`chat/workflow_test.go` 的关闭后 interrupted 不自动重播用例，以及当前 `approval/recovery_test.go` 的 cancel 后晚到可信 receipt、unknown effect、waiting restart/拒绝 continuation 和坏 CP 相关代码。它们说明现在打算覆盖的语义，**没有执行，因此不宣称通过**。T16 应保留这些回归并增加树/成员/真实传输边界，不因已有单 Run fake 成功假定整树恢复已经闭合。

采用固定提交而非浮动 main。许可/活跃性/依赖沿既有 `IMPLEMENTATION-REFERENCES.md` 和 `evidence/reference-audit.json` 的 2026-10-25 记录；本次只额外读取两个固定官方仓库源文件，HTTP 均 200，完整文件 SHA 和命中行保存在 observations-upstream.json，没有安装、执行或复制第三方代码。

| 固定参考与已核验许可/活跃性 | 对本任务采用的思路 | 明确不照搬 |
| --- | --- | --- |
| [REF-04 OpenBot group.ts](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/channels/group.ts)，MIT，提交 2026-10-24 | 每个请求/每次 Bot turn 重新取成员资格；群 turn 使用共同 handoff/持久队列和限制。支持将成员检查放在真实消费点、复用共享调度。 | 它的 Hono/Mastra/Drizzle/Postgres 与 Web 客户端依赖、lease/队列实现不搬入 HUHU。它的继续队列语义不能替代本项目“已运行树核查后用户恢复”。 |
| [REF-05 DeepSeek-Bot groups.js](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/groups.js)，Apache-2.0，提交 2026-10-23 | 成员 group Session 与 room log 分离；await 后重新检查成员/room 身份，晚到发布也重查成员。可借鉴异步竞态的检查位置。 | 它会把 own-chat brief 带入群线程，且有全员/admin 顺序轮次、基于名称的提及与按人数设 relay 上限；这些都与 HUHU 私聊隔离、agentId token、默认仅协调者及固定预算合同不同。其宿主/Session 依赖不引入本项目。 |

REF-05 不是 DeepSeek 官方模型 SDK。以上只是固定源文件观察与设计取舍，不声称调查其全部故障/安全问题。Eino CP 的真实 Set 错误/Interrupted 边界、不可变发布、单连接 SQLite 事务限制、SDK 重试以及 OpenClaw/delegation 参考沿 034/041 已有报告，本次不重复网络/执行研究。T07 真实 Obsidian Vault.process、编辑器基线及 receipt 持久性沿 036，不接触用户 Vault。

### 研究产物、来源摘要与实际命令

本 TASK 只写 `REPORT.md`、`observations.json`、`observations-upstream.json` 及本目录中的 return/摘要日志。observations 记录逐文件 UTC 读取时点、SHA-256、读取范围，另有结束复核、解析后的预留 wire 字段和只读 Git 状态。报告引用文件在别的 writer 下变化时只标观察失效，不冒充冻结。

| 关键输入 | SHA-256 |
| --- | --- |
| TASK.md | `69dc8d424fbdadaa5507b264b3f226354459e8a471809a982c70f5ae763fa813` |
| 034 REPORT | `b322ac16d7f68aff30260f656fadf402fd3f2335fc4d357a30625554aee12691` |
| 036 REPORT | `5b5b3292c08084ce31dcdab386e8c429631efb147cb131b3288d3cfa687f925d` |
| 041 REPORT | `c58cad4f502274a5392d89fa9240a2df4b30e451662622e94a6a07d5fbdda30b` |
| T13 / T16 | `c78790c96193fd2d7c2bf251070d766dfcb02fceca2f0101ad11b40d514b3943` / `16c9fa8bcf6dd6ac801297770830c31d73a9ff0c71b3d78fb6c756fd770bceae` |
| spec.md | `3c1414c294ca55b2d6c8210d4b93f43169adf0e938f59a7501ff62119e89be2d` |
| ARCHITECTURE.md / ADR.md | `534114d3f9325f1ef9f13b33bc684f8835b676b60168227b5476cccf72556fe9` / `d05a6885c3e87f263c341d8730f6bad3328b07c0c87e6263370f3a112f780138` |

实际只读命令使用 `rg --files`、`rg -n`、`sed -n`、Python 标准库读取/JSON解析/hash 与 Git branch/head/status；产物通过 apply_patch/Python 写入本 TASK 目录。成功读取、JSON/hash 和 Git 命令 exit 0；探索中两类错误路径（`core/transport/connection.ts`、`sqlite/{credentials,configuration}`）及一次猜测的 042 TASK 路径使 rg exit 2，随后从真实文件清单定位到 `core/protocol/connection.ts`、`sqlite/assistant` 与已有 Goal/Map owner 记录；无产品写入。较长组合读取的工具输出曾截断，必须完整读的三份报告/两票已有分开完整回读，不能把截断输出当新增执行证明。

只读 Git 返回 branch `NAMEWTA/bot`、HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`，均 exit 0；共享工作区有既有/并行产品修改，本研究不把它们归为自己改动，也没有重置/暂存。在线仅固定公开源码 read，两个 HTTP 200；无远程执行、无安装。return validator 已实际执行，exit 0，errors/warnings 均为空；stdout/stderr/exit 保存在 `return.log` 与 `return.json`，最终产物摘要在 `artifacts.sha256`。它只检查交回结构，不认证工具身份、授权、测试通过或产品完成。

未运行产品进程、Go/TS 测试、build/lint、真实模型请求、Vault/Obsidian、OS keyring、默认 D-Bus 会话探针。历史 D-Bus 边界保留，不将此前事件重新解释成此次授权或重新试探。未新增 agent、未运行后台任务；交回前所有本 TASK shell/读取进程均已结束。本研究无法认证当前实际运行模型名称，只沿既有研究角色和偏好，不伪造模型认证。

## 问题与下一步

当前代码观察已经足够给后续 T13/T16 制定精确原 owner 请求，没有扩大产品范围或新审批要求。后续实施需回读已冻结的 T04/T06 最终候选，重新核验本报告已失效的两个文件观察；随后按上表分别维护真实生产消费者。当前 T13/T16、T07 的真实 receipt 核查、T11/T12 的委派预算、T08 SDK 恢复能力和 T20 生命周期均不因本报告被标成已装配或通过。

Root 重点保留三个交接点：T07 最早消费 Host RPC 的在途取消/连接隔离维护；T13 在同一 fence 加入无来源正文的当前成员/历史边界；T16 在同一 Executor 区分正常审批 continuation 与运行过的树用户恢复，并让 RecoveryRecord/Resume/核查 Port 都有生产消费者。T13 所需最小子树屏障提前由共同准入 owner 交付，避免与 T16 的正式依赖形成悬空验收。

本 TASK 完成只读研究与报告后停止写入。只有 Root 全读报告、核对摘要和实际 return 回执并接收 MESSAGE/FINAL 后才记接纳；本报告不修改正式 Evidence、Ticket、Map、Goal 或其他报告。
