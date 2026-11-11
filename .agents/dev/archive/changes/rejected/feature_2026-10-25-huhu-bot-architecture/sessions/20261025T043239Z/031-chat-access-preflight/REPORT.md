# T03/T05 同库与资料权限接缝只读预检

Session: 20261025T043239Z
Task: 031-chat-access-preflight
Status: completed

## 聚焦交接

可以按下面的最小维护合同准备026/027/028；本预检没有放行实现，也没有修改冻结源码、测试、API、schema、锁文件或正式状态。T03/T05仍为 ready，024/025的结果仍由Lead接收。本片没有重跑T02或访问真实keyring、模型、Vault。

作者 `/root/foundation_go`；复用原owner事实与010/019研究，原派遣记录 requested model 为 `gpt-6.1-sol/xhigh`，不将其声称为工具独立鉴定的底层模型。工作区/HEAD与TASK一致。已回读Map8、适用dev/架构/测试/许可规则、T03/T05正文、026/027/028预备TASK、`evidence/chat-access-preflight.md`、019最终REPORT及下列源码。14份具体源码的哈希与只读观察保存在 `logs/observed-source-hashes.json`、`logs/source-observations.log`；没有运行测试或外部探针。

最关键的四个结论：

1. 当前 Acquire/Release 各自开事务，不能用于“先pin，StartRun忙了再补偿”。须由原owner从SQLite assistant拆出事务内助手，由execution adapter在同一个 `*sql.Tx` 内受理。
2. UsagePort当前在事务外查询；生产装配Run/session后，最终删除还须在同一写事务重新核对真实引用，不能仅依赖应用互斥锁或较早的查询结果。
3. SQL文件003/005按票命名，SQLite版本仍须连续分配3/4；不能跳版本5，也不能伪造空004。
4. 现有Host仅支持effect invoke/receipt，不能用HostReceipt塞来源正文。需要共享owner接纳具体read/search反向合同，并给028原TS协议owner明确维护窗口。

## 产物与验证

### 现存源码事实

`sqlite/base/store.go:165` 的 WithinTx是标准短事务、失败rollback；同Store只有一个有界连接。Application API没有SQL类型。`sqlite/assistant/store.go:450/477` 的 Acquire/Release自行调用WithinTx；Acquire读Profile与enabled，插config_snapshot_pins并推进assistant_usage_clock；Release删pin并GC无head/pin的修订。它们没有Run归属或Session占用。

`store.go:260` 的Mutate先Profile/epoch、再receipt、再CAS；receipt主键为Profile/principal/method/idempotencyKey。它是助手专有结果，不是T03可直接调用的泛型receipt入口。`credentials.go:98` 的BeginDelete在事务内检查所有model_binding_revisions引用并置deleting；配置保存同时拒绝deleting。只要在途pin确实保留相应model revision，已有凭证guard可以复用，不必另造credential引用表或改020 adapter。

`application/assistant/service.go:188` 的Usage查询在SQL事务之前，Unassembled明确包括runs/sessions/memory；API AgentUsage尚无关联direct Session列表。当前应用mutex只协调Assistant Service自身，未来execution/session adapter不会自动共享它。T03实际注入后必须移除runs/sessions的unassembled标记，memory和未实现群上下文继续如实标记。

`application/api/service.go:65–154` 的Host由managed身份附着、按connection持有lease；断开/过期使能力不可用，获取remote后不持Host mutex等待。lease现只有leaseId/workspace/capabilities/expiresAt，没有公开connection/epoch；HostRemote只有Invoke/QueryReceipt。Go stdio已有有界反向call、pending相关与schema校验，可扩展而不新建通道；TS `core/protocol/connection.ts` 目前只路由两个反向方法。

### 026所需最小T02原owner维护

以下是拟议接口，尚未写入、编译或冻结为代码合同。SQL只在outbound adapter之间出现。

```go
// sqlite/assistant，使用调用者的tx，绝不再次BeginTx或调用Provider。
PinInTx(ctx context.Context, tx *sql.Tx, profileID, agentID string) (api.ConfigSnapshot, error)
ReleaseInTx(ctx context.Context, tx *sql.Tx, token string) error
```

原Acquire/Release成为它们的WithinTx包装，保留T02已有消费者。PinInTx必须复用Profile/enabled、配置修订、credential deleting检查以及clock更新；不能经公开Get/Provider.Status间接开事务或调用OS。Repository/Application API继续使用纯HUHU命令，不把tx传到application/domain。

T03在003自己的表内关联runId与pinToken，活动pin必须有唯一Run归属；terminal在保存结果、usage、终态/事件与清占用的同一事务释放pin。保留必要revision审计，不能复制Persona正文或用永久FK使terminal pin不可释放。历史002不改。

StartRun固定顺序：Profile/epoch检查 → 同Profile/principal/method/key旧receipt（同输入返回旧Run，不先判断busy/新revision；不同输入冲突）→ 新意图权限/CAS/busy → 同tx pin、用户消息、Run accepted、Session占用/修订、来源引用、首event、receipt → commit后通知。busy/失败必须零pin；新key的相同正文仍是新意图。旧epoch先拒绝，旧receipt返回仍需当前读取权限，不重公开撤权正文。

T03复用现有command_receipts表/key，不复用助手专有MutationResult codec、不新建第二套receipt库；检查Bot擦除时T03最小核查receipt与正文清理的关联。终结失败rollback全部状态，扫描只处理accepted，preparing/running旧工作不自动再次付费。

### Usage与竞争的最小维护

T03 adapter提供实际SnapshotUsage，并暴露仅adapter的`SnapshotUsageInTx(ctx, tx, agentID)`供assistant最终Delete/Preview使用。最终删除在同一写事务核对真实Usage token/digest/引用，不能只依赖早先查询或Assistant Service自身mutex；已有tx内不能调用外层SnapshotUsage/WithinTx造成单连接死锁。AgentUsage最小补关联direct Session说明，生产不再将runs/sessions标记unassembled，memory/未装配群上下文继续显式标记；不自行决定自动删除历史。

StartRun先提交则pin保护旧修订，随后disable只阻止新准入，delete/credential BeginDelete看到引用而拒绝。disable/delete先提交则新PinInTx失败且无副作用。credential guard先置位则新绑定/准入拒绝；Run先提交且保留model revision则删除凭证拒绝。OS Resolve/Status不进SQL事务，不另存秘密或复制credential引用表。

### 精确维护路径与owner申请

| 路径 | owner/所需维护 |
| --- | --- |
| `native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go` | 原foundation_go；拆PinInTx/ReleaseInTx、保留包装，接入事务内Usage最终guard |
| 同目录 `credentials.go` | 默认只读复用；仅当PinInTx需复用ref/deleting验证时由原owner抽私有helper，不改provider行为 |
| `native/huhubot/internal/application/assistant/{ports,service}.go` | 原foundation_go；Usage真实注入/描述，Repository接缝最小调整；不引入SQL类型 |
| `native/huhubot/internal/application/api/{assistant,types,service}.go` 及拟新增纯DTO文件 | 026作为共享原owner；AgentUsage关联Session、Conversation/Run/Access/Host ports与Facade装配 |
| `native/huhubot/tests/contract/assistant/` 非credentials*用例 | 原foundation_go；真实Run/session与disable/delete/credential并发回归；credentials*仍原020/029 owner |
| `sqlite/migrations/002-assistant.sql` | 不写；历史迁移不可重排修改 |
| `sqlite/migrations/{embed.go,003-conversation-run.sql}` | 026；注册唯一owner，003归T03 |
| `sqlite/migrations/005-grants.sql` | 027唯一SQL正文owner；仅将完成的SQL交026注册，不自行改embed |
| `sqlite/base/store.go` | 026原owner；必要时使backup命名反映真实起始版本，维持一致备份与原子迁移，不复制Store |
| `src/modules/huhubot/api.ts`、`contracts/hap/v0.1/**`、Go protocol/inbound HAP | 026独占；双方先提出字段请求，再一次冻结/生成 |
| `src/modules/huhubot/core/protocol/connection.ts` 与受影响protocol/runner测试 | 需Lead追加028原TS协议owner受控维护权；现028写集没有这些路径，单靠host-read目录无法路由新反向方法 |
| `native/huhubot/internal/bootstrap/core.go` | 026；同Store注入config/Usage/Access、扫描executor；不由027另造启动入口 |

026/027/028其余自有目录按预备TASK不变，Go依赖目前无需新增；若后来需要SDK，另交原owner/工程owner接纳，不能因为Engine Port而提前加Eino。

### 003/005资源与顺序

当前CurrentVersion=2，注册要求`Version==index+1`。建议003文件注册Version3，005文件注册Version4；文件号标票号、user_version标实际迁移顺序。将来的004事件票应分配下一个实际DB版本，不能倒插已发布迁移。无需造空004。

两个SQL正文可分别编写，embed/CurrentVersion/Ordered与迁移验证由026持有串行窗口。005尚未落地注册前，027可做纯策略/fixture准备，不能自行对产品DB附加未注册DDL。两份SQL可用后一次注册freeze，然后两票真实SQLite测试分别使用独立临时HOME/XDG/managed Profile；语义资源拆为`schema-registry`串行、`db:<隔离profile实例>`独立，不能把同一个运行Profile让并行测试抢锁。schema2→3→4和schema2直升4的备份/失败回滚需覆盖；不改变HAP schemaVersion=1来代替DB升级。

共享API/生成物修改先于三方消费者实施，注册freeze后才能并行联调；最终全局build/notice/资产由Lead/T27统一窗口，不并发生成根产物。

### 最小Source/Grant/Host冻结请求

以下是待026/027/028协商后由共享owner写入的字段请求，不是已实现或另立产品设计：

- 保留一般SourceRef；Run受理/Host回执使用严格SourceSnapshot，必需resourceId、revision、hash、workspaceId、originClientId、originViewId、hostConnectionId、hostLeaseId、hostLeaseEpoch，另有note/selection种类及可选捕获范围/标题。由可信TS adapter捕获明确view和当时正文，Go不把客户端自报身份或绝对路径当权限。
- ContextEnvelope的message/excerpt带来源/派生provenance及父范围标识；接收Agent、固定ModelBindingRevision/endpoint、任务从服务端事实取值。撤权时不能只删sourceRefs而保留含私有内容的text。
- 原Grant补workspaceId、必需operations、typed recipients、active/revoked状态及revision；create目前缺operations/agent/session等表达，需统一补齐。typed recipient至少绑定Agent与模型接收方provider/model/protocol/endpoint；recipientIds可保留展示，不能单独授权。revoke必需CAS，不把credentialRef当接收方，不另造权限表。
- HostLease补服务器生成hostConnectionId/leaseEpoch。新增具体host.read/host.search反向方法，不用HostReceipt装正文；请求/回执带完整lease、范围、快照身份与有界limit。Read返回text/格式/revision/hash；Search必须先有有限授权scope。普通客户端反向调用拒绝，离线HOST_UNAVAILABLE，无Go FS fallback。
- 兼容现有仅写Host可新增窄HostReadRemote、TS可选read/search能力；026统一method direction/schema/Go DTO/validator/fixture，028原协议owner维护connection路由。现Go call把remote reason归一HOST_REJECTED，读取路径需有限白名单保留SOURCE_CHANGED等语义，不透传私有正文。

先冻结字段/方法/错误语义和原owner写集 → 026生成同一schema/DTO/夹具 → 027/028消费 → 真实Go↔TS联合。Host前检查Grant/父范围/接收方交集，返回后检查当前lease/撤权与hash，外发/派生/投递前再次检查。DB事务与Host mutex不包网络等待；迟到或撤权正文不能进入Engine/缓存。

Engine只定义纯HUHU输入/事件/finished-failed-suspended结果，测试通过Go Options注入fake，生产未装配返回MODEL_UNAVAILABLE/ADAPTER_NOT_ASSEMBLED。Access未装配且有来源时CAPABILITY_DENIED/ACCESS_NOT_ASSEMBLED，不丢来源后假回答；无来源仍校验Profile/Session owner/current read。具体执行器设计留026，不在预检展开。

### 实施时新增验证，复用而不重跑本次T02

可复用019/029有效的配置/epoch/credential guard/schema/worker证据，本次没有重跑。实施必须新增：

- 旧receipt先于busy、新key相同正文、同key同/异输入并发；消息/Run/pin/占用/event/receipt逐故障rollback，commit后唤醒前退出重开扫描，终结失败不报持久成功。
- StartRun与disable/delete/credential guard竞争；Usage在查询与delete提交间变化；检查真实SQL归属与无泄漏pin，不仅运行应用mutex的race测试。
- 两份明确附加资料的Host/Engine捕获计数，以及第三份零读取/零外发；跨workspace、绝对路径/伪资源、旧lease、view切换/未保存选区、撤权、endpoint/Bot变化与较小父scope反例。
- Host读取途中detach/replacement、重连缓存/历史分页当前权限、两个入站同Facade，以及真实Go↔TS帧/严格DTO/取消关闭。Obsidian与真实模型现场仍由用户验收。

研究复用来源为Lead的`evidence/chat-access-preflight.md`固定OpenBot队列、Eino chatmodel与OpenHanako PathGuard比较，以及IMPLEMENTATION-REFERENCES固定commit/许可；本任务没有新增外部依赖、复制源码或把路径范围模型当完整授权模型。

## 问题与下一步

结论足够让Lead在024/025门通过后补精确维护写集、schema注册资源与028协议维护窗口，再正式派发026/027/028。上面所有新接口/字段是待共享owner实施冻结的建议，不是已存在功能，不声明T03/T05 AC通过。

本任务仅写031报告与只读日志；未修改任何冻结输入，未运行T02、模型、keyring或宿主探针，无后台子进程。返回结构校验保存于 `logs/return-validation.log`，完成后停止报告写入。Lead已通知024发现Linux取消回执问题；其正式finding和修复由Lead另行处置，031未调查或修改该闭包。
