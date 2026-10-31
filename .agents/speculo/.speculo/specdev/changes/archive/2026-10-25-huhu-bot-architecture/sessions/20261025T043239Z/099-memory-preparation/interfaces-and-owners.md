# 099：T14/T15 最小接缝与 owner 请求

这是只读实施建议。下列新类型、表和函数均**不存在、未授权写入、未验证**；C/D/W 编号的真实路径与读取 SHA 见 [sources.md](sources.md)。T14 尚未开工。既有 Application 仍只用标准库；以下 `*sql.Tx` 签名仅表达 SQL adapter 内部同一事务，不进入 Application API。

读取后Root开启Map24/Goal23局部修复；[source-recheck.json](source-recheck.json)记录C06/C14变化，以下恢复API事实对应读取快照，不代替该轮最终合同。其余用途/数据/owner建议无需为此追读新实现。

## 1. 055 建议在当前代码上的差量

| 055 当时缺口 | 当前真实事实 | T14 仍须补齐 |
| --- | --- | --- |
| 可信执行身份/namespace | C01/C03：`ToolExecution`、`ExecutionLineage` 有实际 claim、Run/root/parent、workThread、subjectKind、Sponsor、ConfigSnapshotID、Group 和 Derived。C13：临时 subject 独立配置，orchestration 无假 A；C26：实际私有贡献并入接收 Run。 | T14 把真实 subject 映射为 agent/temporary namespace；模型参数不得提供 owner/namespace 权威。现有 WorkThreadID 是隔离键，不是长期记忆表或全局授权。 |
| message/child result 引用 | C10：真实选入 History/current user message 生成稳定 message ID/hash；C12/C19：真实 inbox；C20：实际 child result/answer；C27：真正返回的 tasks.get/list 私有正文才执行 `ConsumePrivateInTx`。C36 有 `collaboration_lineage`。 | 新 memory revision 引用及其当前失效谓词；仅保存 hash 不足以检查 forget。公共 transcript 与私有贡献继续区分，不能把公开作者当前资格强加给所有历史。 |
| T12 账本 | C04/C16：Reserve→Dispatch→Settle/Abort，真实 claim/config/recipient/source/恢复门；C17：公开预算 CAS；C18：崩溃未发退款/已发 unknown，原账不清零。`accountInTx` 已有 maintenance 分支。 | **没有可信 maintenance binder**：`BindAttempts` 只推 main/child/question，调用者不能改 purpose/account 借维护额度。须从真实 job→Run 的持久事实绑定，不能传 `Purpose:"maintenance"` 就算完成。 |
| 固定配置/释放 | C15 `PinTaskInTx/ReadTaskInTx`；C13 `ReleaseTerminalPinsInTx` 终态且真实 HTTP/effect 都结束才释放。task pin FK 必须对应真实 Run（C36）。 | 不可事后拿 terminal 原 Run 的旧 pin。推荐 job 实际受理时固定当时 Bot 配置并取得新 pin；outbox 尚未受理不承诺固定旧配置。 |
| 恢复与停止 | C28–31：整树水位、affected IDs、CAS/generation、ready 仍闭门、显式 Resume；C14 保存实际 continuation/resume/application；C35 等 Executor/Inspector/Probe/真实 producer/账本排空后关 Profile。 | job/记忆修订/forget/config 事实加入同一资格水位与最终门；没有记忆表意味着当前水位当然未包含它们。普通 fresh phase=run 无完整 CP 时 blocked，不能为了维护自动重放收费请求。 |
| Engine/CP/HTTP | C32–34：默认固定 Chat Engine、私有 SDK、完整请求字节预留、有限输出、每 HTTP 结算；C33 CP 固定 config/tool/程序位置/消息/剩余工具批。 | 受信维护用途/有界候选输入，以及记忆输入引用在 CP 与恢复资格中的绑定；不另连 SDK，不用 Probe 代替提炼。其他协议仍按各票实现，不臆称可用。 |
| memory wire | W01–03：八方法均预留 `implemented=false`；Go Facade（C07）无 Memory API；没有 item/job/index 的真实消费者。 | T01 唯一补 DTO/Schema/TS/装配，只有真正实现的方法才切 implemented；不能把该研究作为接口可用证据。 |

## 2. 自动维护：比较与推荐

**推荐：完成事实 outbox＋同一 Executor 的独立 maintenance Run。** 唯一替代方案是另起后台 worker 直接调用同 Engine，再自行绑定预算和恢复；它仍需复制 Claim、Stop、CP、receipt 和恢复阶段，增加第二调度权威，因此不选。不是增加新的任务引擎。

1. 交互结果真正被接受后，在原 Finalize 短 Tx 插入 T14 completion/outbox 事实。唯一键至少含 namespace、真实来源对象/不可变修订（不是单 body hash）、触发身份和维护规则版本。原 Run、消息/结果与该小事实原子提交；没有网络。维护 eligibility/模型失败不能把已经完成的聊天改成失败。未知 SQL/Commit 失败仍如实回滚，不能伪装已保存聊天。
2. 仅为持久 Bot 的获准完成输入受理长期自动维护；temporary 使用自己的任务 namespace，不能触发 Sponsor 长期库。持久 Bot 可把真正收到的临时子结果纳入自己的完整来源交集。群 orchestration 根配置为空且没有实际模型 owner，不为未点名A产生维护调用；真正执行的B/C按各自合法结果受理。maintenance Run 完成不再触发 maintenance outbox，防自激循环。
3. outbox 待处理时**没有 Run claim/pin 的承诺**。在实际受理短 Tx，复查 owner enabled、auto-maintenance settings revision、源/墓碑、真实 Group/来源接收方和明确维护额度；选用此时 Bot 的模型/Persona 配置，新建独立 pin。配置以后不换到最新值；新 endpoint 无精确 Grant 就阻塞资料作业。独立 Run `root=self,parent=''`，独立 workThread，保留现有execution role并用受信 `admission_kind=maintenance`＋真实job关联区分用途，不另造Run状态。关联原 Session 只为归属/删除，**不写 Session.active_run_id，不插假 Session/Agent/Delegation**。现有 `NewChildInTx` 的 live parent/ReplyRoot/UserBatch 校验不能放宽来伪造这一入口。
4. T03 为同一扫描器增加有界 job admission hook，在同 Tx 建 job→Run 关系及真实配置/输入后才排队；`execution_runs` 是执行状态权威，job 只记录来源、受理结果和候选提交结果。使用现有有界 worker 池、公平分页、Stop 和事件；不能有内存通知丢失就永远不受理。可保守一次只领取一个后台 job，实际并发策略由 T12/T03 冻结，不能把维护伪装成4/8 child 或无限新 lane。
5. T12 依据持久 maintenance 关系绑定 purpose/account，复用 `maintenance:<profile>` 与 Profile 总账，拒借普通 root/其他 namespace/旧 claim。每真实 HTTP 沿原 Reserve/Dispatch/producer ACK/Settle；摘要、重试同样收费。额度0/未配/耗尽、全局或 owner 暂停均零新 HTTP，原因可读；不默认免费值。quota 拒绝不由定时器无限新 Run 重试，显式配置/用户动作后才重新受理，并记录因果身份。
6. 推荐受信 `EngineInput.Maintenance` 描述 jobID、namespace、输入修订与提炼任务，而不是伪造 Delegation/Host Source。相同 Engine 接收有界数据；工具取原配置允许集与维护用途允许集交集（首版可为空），不能改 Agent/Config 的快照身份来暗中删改权限。CP 必须绑定用途、候选格式/工具摘要与输入引用，Inspector 同样核验。
7. 模型只输出候选。T14 提交 hook 在真正 Finalize 的同 Tx 核 job→Run/current claim、任务/恢复/取消门、forget/source generation、当前 Grant/Group、目标 CAS 与 pin。成功才写 item revision/来源边/索引有效性/job 提交结果；已知旧资格拒绝转 body-free 失败，SQL/坏数据仍整体回滚，不让某作业毒化后续队列。maintenance workThread 与 Session 不同，沿当前 C12 Finalize 条件不生成前台 assistant 消息。

停止复用 C35 全部同步准入门与实际 Done；outbox 不自开 goroutine。fresh accepted 未领取可继续扫描；已 running 树必须经原 T16 检查并等待用户对该 maintenance 根点击恢复。恢复原 Run/config/thread/account/CP/Decision，新 claim，旧 unknown 不清零。无可兼容 CP 的普通提炼只能 blocked；以后由明确新意图创建 retry Run，不能自动假装恢复。Source 旧 connection/lease/epoch 在重开后失效仍 blocked，不无痕换 lease。

**准备分支也必须实际维护。** C10 当前 `Group!=nil` 总会取群ModelHistory，`PrepareContext` 又会把Access中的Host来源读成模型正文；仅换workThread还不够。maintenance分支应只用outbox固定的实际选中消息/结果/摘录，保留全部Access来源作资格检查，不能因此再扫原私聊/群页或自动附上所有来源全文。需要原T03在同Engine前调用T14受信reader，并沿原ContextAccess检查租约/资料身份。

短期上下文压缩不是长期维护：先有界选择/工作摘要；若确实用模型压缩，归当前真实Run的summary子用途与原root账，不借maintenance额度，也不自动写长期事实。C16允许summary子用途，但C32/C34当前还没有独立压缩消费者阶段，不能称已支持。具体需要的pure输入计划与Driver私有purpose传递由T03/T08在实际消费者实现时冻结，无需另建摘要引擎。

## 3. T14 的最小持久职责与事务

建议014只建这些本域职责，可合表；绝不复制 Run/attempt/配置/effect 状态机：

| 职责 | 最小事实与唯一性 |
| --- | --- |
| namespace/settings | profile/principal、kind=agent/temporary、真实 ownerSubject/taskConfig、context scope、revision/generation、auto enabled；全局为 profile namespace，仅 T15 确认写。 |
| item/head＋immutable revision | itemID/headRevision、**独立不可变 revisionID**、正文/状态/观察或推断或 user、creator、pinned、scope、完整来源；head CAS。Derived 的 ID 可指 immutable revisionID，避免 C10/C36 当前 Kind+ID 去重/主键丢掉同 item 不同版本；不可伪装 message 或 Host Source。 |
| completion/job | 唯一来源意图、namespace/规则版本、输入引用/水位、settings revision、受理原因；admitted 后指向真实 Run。queued/running/terminal 从 Run 推导，不另存矛盾完成状态。 |
| candidate | 有界解析结果、预期 head/pin revision、来源/作业代、状态；人工 pin 冲突只候选，不静默替换。 |
| dependency/input edges | 指向不可变 message/task_result/memory_revision、来源/Grant及私有 Group 资格；包括**模型实际已消费**的 memory revision。用 runID/current claim 关联，原输出及跨线程副本保留祖先。 |
| derived index | item/revisionID＋有效水位；仅检索加速，查询必须回表确认当前 head、scope、源资格。 |
| suppression/watermark | 无正文的 namespace＋祖先对象身份/版本/失效代＋可信用户命令身份；旧来源扫描也检查，不只旧 job callback。 |

correct/pin/forget 都按原 CommandMeta、Profile/epoch、原 receipt、expectedRevision 同 Tx。correct 新修订、旧索引失效；旧作业不能覆盖新 head；手动固定冲突形成可读候选。forget 将 head/召回/索引失效、提升对应代、关闭旧 candidate/job 提交资格并写 suppression/receipt；任一 SQL/Commit 失败全部回滚。

**挡两种复活：** callback 比较它受理时的来源/namespace generation；新 job 即便拿新 generation，也须查旧祖先 suppression。不能靠换 job/item ID、同义改写或新索引绕过。不能为识别忘记事实永久存被忘全文/可逆 prompt。不能准确细分事实时，保守禁止同一旧来源闭包的自动再提炼，其他独立来源继续；Host revision虽为wire Decimal，但不同来源/租约不是一个全局递增水位，不可跨身份做数字 `<=`。新版本同来源的自动处理边界应采用明确 source generation/抑制范围，而非假定 hash 改变即用户新意图。只有可信用户明确 add 才产生独立新意图，模型自报及重扫不算。

## 4. 召回、每次出站、投递和恢复的一条当前资格链

推荐 T14 提供同 Tx `CheckRunInputsInTx(ctx,tx,id,runID,ops)` 与 `ConsumeInTx(ctx,tx,actualExecution,revisionIDs)`；这是未来 adapter-only hook，当前没有。Consume 从 DB 取真实 namespace/head/revision/scope/来源，不接受模型自报 proof；先授权，再原子保存本 Run 实际输入引用、Host 来源并集及私有贡献 Group 完整 tuple，实际改变需提升 Run.revision。ModelInput/CP/派生结果保留此事实。

实现时避免 T05↔memory 互相递归调用：memory 的同Tx检查只核本域身份/修订/代数/抑制并返回有界可信来源事实，T05再用其内部原Grant/Group校验处理这些事实；memory检查不再次调同一个公开T05聚合入口。任何内部“已核本域”标记只来自实际DB reader，不能由payload选择。派生memory保存全部受限祖先修订，不能只核当前item head而漏掉它依赖的旧memory版本。

T05 在现有 `checkInTx` **空 Sources 快返之前**调用本域当前资格；无 memory 输入的旧热路径保持常数空路径/同 Tx 批量事实，不能拖坏原800/250ms门。原 C16 current 每 Reserve/Dispatch 从真实 Run 读后调用 T05，因此忘记/修订/撤权/成员移除后的下一请求可阻断，不只准备时检查。C12 AppendEvent/Finalize 和 T14 candidate commit、T16 current/watermark 同样重查；已经发出的 HTTP 不能声称可收回，必须停止后续处理并拒绝旧回调写入。

同 Agent 两线程只召回其合法 contextScope；temporary 只自己的 subject/task namespace，不因 Sponsor 获长期库。群不建自动共享库：成员私有且限定群范围的条目或用户确认 global。私有 message/result 的贡献者 Group tuple 保持当前资格；合法已公开 transcript 按发布事实与该读者 none/range 范围，不要求作者仍是成员。全局 confirmed 只放宽可发现范围，不授任何 endpoint/send；未确认 proposal 绝不进入召回。

**Task/Session Grant 不能悄悄变成长期通行证。** C25 现有 task-bound 继承只认真实 delegation/reply 关系，新 maintenance 根没有这种关系。推荐首版保持严格：item contextScope 不宽于原 Session/任务限制，新的 job/recall Run 无精确适用 Grant 或明确持久继承证明就 blocked。合法同 Session/Profile scope 的明确 memory/summarize/send 授权可用；不能改 Grant.TaskID、伪造 ParentScope/Delegation 或把新 jobID当原 taskID。若产品要让仅原 Task 授权支持跨独立维护/后续 Session，Root/T05 必须先冻结用户 memory 操作所允许的窄派生证明与公开授权方式；当前代码没有这个能力，本研究不替其扩大权限。

UI read 与模型 read/send 继续分开；自动摘要/保存还核实际 summarize/memory 操作与当前来源。查询先限制 namespace/scope/有效状态/资格再匹配正文，index 不是权限；缓存/cursor 绑定身份、scope、settings/forget/head与权限代，旧页必须重新核资格。用户 memory body 页还需物理出帧门：建议 T01/T04 增 server-only memory_revision delivery subject，T14 correct/forget 与原 Grant mutation 共用短 fence，当前 Tx 重验后 SQL 关闭再写 frame，慢写实际停止后归还。不可把250ms gate横跨长模型 stream。

T16 当前 watermark 只有 C31 的既有表清单，没有014 job/namespace/suppression；需经原owner加入本树关联的这些水位并在最终 Resume/Dispatch/current hook检查。pure `CheckpointInspection` 还须收到由实际DB读取的记忆输入摘要/用途，供common与CP所存manifest比较，不能让Inspector自己读SQL或信CP自报。CP 带老正文并不使其有权限；forget 的即时不可召回与 T17 后续物理删除分开记。Host租约仍经原ContextAccess路径，不在SQL hook内读Host/网络或改写旧Source。

当前 `ready` **不等于有模型额度**：恢复current核Grant/config，费用仍由后续真实Reserve/Dispatch当次重验；maintenance暂停/余额耗尽后零HTTP，不应把某次ready当付费通行证。原budget policy已在水位中，账本和已派发unknown沿原身份保留。

## 5. 有界公共 DTO 与八方法增量提案

W01–03 的实际切片保存在 [wire-memory-current.json](wire-memory-current.json)。目前 private/global 混合 visibility 与 scope、owner可选、SourceRef不完整、CAS未必需、auto只有enabled、proposal只ID。建议 T01 统一纯 Go API＋TS＋schema，不分头手写。

建议首版边界（待 T01/T14 一致冻结）：item text≤64KiB UTF-8；list 1..50/default20、页总≤256KiB；query≤256 units；实际 recall≤20项/128KiB；候选≤32项且总≤256KiB，单项≤64KiB；Host sources+scopes≤现32、Grant≤64、Derived≤128、Group≤现100；输入/CP/最终 HTTP 仍受原 Engine 更外层界限。超限明确分页/RESOURCE_LIMIT，不能截 provenance 或存半 JSON。

Go/TS runtime必须用一致UTF-8字节语义执行bytes预算，schema的string maxLength不冒充UTF-8 byte count；具体黄金向量/校验helper归唯一T01。此为未来DTO建议，不判断正在100/101维护的实现。

`MemoryItem` 增 namespace(kind/subject)、immutable revisionID、typed contextScope(profile/session/thread)、status、creator、完整 SourceSnapshot/SourceScope/Derived、相关水位。`scope:private|global` 继续只表示可见层；inactive/forgotten 只给安全 metadata，不能继续强制返回正文。`DerivedInput.kind` 新增 `memory_revision`，ID指不可变修订对象；此为未来 schema 增量，不是当前枚举。

| 预留方法 | 最小增量建议 |
| --- | --- |
| list | typed objectKind=item/proposal/job 与 namespace/context scope/状态过滤；有界页、可回读 owner 维护 paused reason/job RunID。普通模型绑定不靠传 ownerId 越权。 |
| get | objectKind+ID 查询 item 或 T15 proposal 固定预览/作业安全状态，便于重开后回读；不同结果严格 discriminant，不能把 proposal伪装item。 |
| pin | expectedRevision **必填**；仅可信用户管理，返回实际item修订/回执。pin不是脱离来源的隐式授权。 |
| correct | expectedRevision必填，当前head校验；建议显式 `action:correct|add`：add仅用户且仅private namespace、服务器新itemID＋namespace CAS，作为forget后的明确新意图。现8方法没有add入口，不能偷偷复用旧job重放当“重新添加”；这是需Root/T01冻结的预留形状补口，不是本研究已授予的新方法。global增改删始终走proposal。 |
| forget | expectedRevision必填；返回 receipt＋最新失效代/安全metadata，不返回旧正文。 |
| setAutoMaintenance | 用户 identity，owner settings CAS；默认关闭；结果回读 enabled/reason/revision，维护额度仍由已有 collaboration.budget/configureBudget 管理，不双存余额。 |
| proposeGlobal | 固定 operation/targetRevision、typed scope、完整实际来源；返回有界 full preview/proposalRevision/hash/expiry，不能只proposalId。模型来源从绑定事实生成；用户payload也需核proposed subset。 |
| resolveGlobal | 用户identity＋proposal expectedRevision/hash，接受同Tx写item/revision/index/receipt；拒绝/过期/改源/改scope/target冲突不写item。global改删不能绕private correct/forget。 |

T14只先实现自身六个方法/上下文消费者，T15两方法仍 false 直至实际装配；kind的未实现分支明确拒绝。记忆自动写仅内部受信用例，不加公有auto-write或把维护候选当已确认global。此处没有要求新增模型memory工具；若后续实际消费者需要，由原Broker owner另精确开口。

## 6. 原 owner 精确维护请求（不授写权）

路径前缀 Go=`native/huhubot/internal/`。新增文件均需 Root 正式纳入写集；下面只是最小消费者需求。

| owner | 精确路径/未来符号与理由 |
| --- | --- |
| T14本域 | 原票 `domain/memory/private/**`、`application/memory/{context,private,maintenance}/**`、`adapters/outbound/sqlite/memory/**`、014正文、private-memory tests；上述item/revision/outbox/candidate/input/suppression/index及实际当前资格。 |
| T01 / foundation_go | `application/api/{types,conversation,collaboration,tooling}.go`＋拟`memory.go`；Facade.Memory、pure MemoryRevision/Namespace/MaintenanceInput、Derived新枚举；`contracts/hap/v0.1/{methods,schema}.json`/生成器/夹具、Go protocol生成物、`src/modules/huhubot/api.ts`；唯一DTO/schema writer。 |
| T03 / foundation_go | `adapters/outbound/sqlite/execution/{store,executor,children}.go`＋拟`maintenance.go`；`NewMaintenanceInTx`（可信job事实、独立Run/thread/configpin、不占前台）、完成outbox hook/当前input持久化/Finalize提交hook；`application/execution/executor/{ports,executor}.go` 在同Engine前组合memory输入与维护指令、同扫描器admission，不新worker。 |
| T02配置 / foundation_go | `adapters/outbound/sqlite/assistant/store.go`；优先复用 `PinTaskInTx`，新maintenance Run同Tx own pin，原删除usage预检须计维护引用。不可复活source旧pin。 |
| T12 / credential_provider | `adapters/outbound/sqlite/usage/{store,budget,recover}.go`；从真实job→Run推可信maintenance purpose/account，保持current/claim/Policy末门、unknown/late Settle与Stop；禁止调用参数自证。原Root/Profile4/8、维护额度0语义不变。 |
| T05 / credential_provider | `adapters/outbound/sqlite/grants/{access,delivery,groups}.go`、必要`application/access/context/{ports,service}.go`；空Sources前Memory资格hook、实际消费并集、记忆投递/当前权限。无输入保持同Tx批量800/250ms既有性能；纯域 `domain/access/grants/policy.go` 只在实际op规则确需时。 |
| T11/T13 / credential_provider | `adapters/outbound/sqlite/{collaboration,usage,groups}/` 的实际消息/结果消费者；把真实已选记忆不可变引用沿现derived传递，不能给未返回页的任务预消费。公共发布与私人贡献身份仍分开。只有具体受影响路径经Root批准才写。 |
| T16 / foundation_go | `adapters/outbound/sqlite/recovery/{snapshot,commands}.go`＋`execution/recovery.go`；追加job/source/forget水位与资格，仍两短Tx夹Inspector/CP、整树用户CAS恢复，纯checking不模型请求。 |
| T08 / engine_adapter | `adapters/outbound/eino/common/{engine,checkpoint,tools}.go`；受信维护模式/有界候选/记忆输入编码、用途/引用纳入CP兼容核验；每次HTTP沿同Driver/Attempts，不新SDK或默认模型。 |
| T01入站/装配 / foundation_go | `adapters/inbound/hap/router.go`、`bootstrap/core.go`；真实六/八用例装配、用户与绑定模型身份区分、Stop/Done、server-only delivery subjects。`adapters/outbound/sqlite/migrations/embed.go` 仅注册014为当前9之后的实际下一版本（最终由owner核），旧SQL只读；015随后独立注册。 |
| T04物理fence原owner | 仅获准时 `adapters/outbound/sqlite/events/store.go` 与T01 stdio server；memory revision subject同门核当前失效/expiry，页/批去重完整proof、实际writer取消后释放；不是本研究可写范围。 |
| T15 / 后续owner | `domain/memory/global/**`、`application/memory/global/**`、`adapters/outbound/sqlite/globalmemory/**`、015正文/global-memory tests；用户确认事务与未确认不可召回。 |

T17只接最小遍历/失效合同：按真实来源ID/revision找到受影响item/job/candidate/Run/CP/Blob及跨Session派生；先闭门排空，再按引用计数清除正文/索引/受管备份。fixed/global独立保留必须有用户预检/新独立内容scope；最小费用/effect核查记录无正文/可恢复CP。forget仅逻辑失效，不冒充T17已清除；不删除独立Vault成果。
