# 060 最小签名与原owner维护清单

这是未来联合窗口的维护请求，不是当前写入授权。以下 `G` = `native/huhubot/internal`；表中路径均相对仓库根，带G者展开该前缀。现存签名摘录来自observations/read-excerpts；所有新方法/字段均为建议，未实现。

最终摘要显示usage/finalize.go与collaboration/store.go已再次变更而未回读，故下列相关签名/调用链只保留为旧时点索引，不能作为当前冻结候选事实；完整新旧SHA见source-recheck.json，最终行为由原owner确认。

## 现有调用链与不可直接复用处

```text
runs.start → direct.Service.StartRun → execution.Store.StartRun
  → single member PinInTx → its Recipient → AuthorizeInTx
  → Run + root policy + active_run_id + receipt (one Tx)

Engine tool Delegate → current claimed actor + target allowlist + parent grants
  → usage.AdmitInTx → execution.NewChildInTx → PinTaskInTx
  → DeriveChildInTx → child config/thread/budgetRoot
  → same Executor → usage.FinalizeInTx → result_deliveries
  → ReadyParentInTx → parent's read/send/deliver → CompletedResult/CP resume

CancelTask → effects.CancelSubtreeInTx (same Tx) → Executor.CancelRun (after commit)
History/snapshot/tail → Events.WithDelivery → Grant read fence
  → persisted subjects/access + short Tx → physical response write
```

用户@批量受理不能通过反复调用Delegate制造：它要求Engine身份且每次独立提交；ReplyRoot是终结任务后重试协议，也不是用户群根入口。ParentScope缺省当前只允许用户根（api/access.go:131）；为群子任务简单设nil会改变权限语义。需要服务器持久化并验证的用户受理边，B/C各自准确Recipient与来源授权仍必查。现有GrantRecipient绑定agent/model/provider/protocol/endpoint，不建议为编排方便虚构一个A接收者或新增“全群来源Grant”。公开群回复必须有独立发布目标/当前权限判断，不能直接借父A收结果。

## 已存在的精确签名

```go
// G/adapters/outbound/sqlite/assistant/store.go:488,577
PinInTx(ctx context.Context, tx *sql.Tx, profileID, id string) (api.ConfigSnapshot, error)
PinTaskInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity,
  profileID, subjectID, runID, targetID string, temporary *api.TaskConfigDraft)
  (api.TaskConfigSnapshot, string, error)

// G/adapters/outbound/sqlite/execution/children.go:26,179
NewChildInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity,
  c ChildAdmission) (api.Run, error)
ReadExecutionConfigInTx(ctx context.Context, tx *sql.Tx, runID string)
  (api.TaskConfigSnapshot, api.ExecutionLineage, error)

// G/adapters/outbound/sqlite/usage/store.go:57,72
EnsureRootInTx(ctx context.Context, tx *sql.Tx, root string) error
AdmitInTx(ctx context.Context, tx *sql.Tx, parent, root string, question bool) error
// G/adapters/outbound/sqlite/usage/finalize.go:91
ReadyParentInTx(ctx context.Context, tx *sql.Tx) (string, *api.EngineResult, error)

// G/application/api/attempts.go; bound implementation usage/store.go:385
Dispatch(context.Context, api.AttemptReservation, func(context.Context) error) error

// G/adapters/outbound/sqlite/grants/lineage.go:131
DeriveChildInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity,
  parent, child api.RunAccessInput) (api.RunAccessInput, error)

// G/adapters/outbound/sqlite/conversation/store.go:254
MessageInTx(ctx context.Context, tx *sql.Tx,
  sessionID, runID, role, text, agent string, sources []api.SourceSnapshot,
  partial bool, supersedes string) (string, error)

// G/adapters/outbound/sqlite/effects/approvals.go:247
CancelSubtreeInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity,
  profileID, runID string) ([]string, error)

// G/adapters/outbound/sqlite/events/store.go:403
WithDelivery(ctx context.Context, id api.RequestIdentity,
  subjects []api.DeliverySubject, fn func(context.Context) error) error
```

签名省略receiver以便阅读，未宣称它们是独立函数。MessageInTx确为包函数。`ChildAdmission`已有ParentRunID/ParentClaimToken/TargetAgentID/Temporary/Access/Derived/WorkThreadID/ReplyRoot等；它不接受批量且当前父必须有claim。`RunAccessInput`只有ProfileID/SessionID/TaskID/Recipient/Sources/Scopes/GrantIDs/ParentScope，无群绑定。`ExecutionLineage`已有Root/Parent/BudgetRoot/WorkThread/Config/Subject/CancelGeneration/Derived，无群成员代。

## 最小维护请求与冻结顺序

|顺序与原owner|必要路径|必须冻结的方向|
|---|---|---|
|1 foundation_go，T01公开合同|`G/application/api/conversation.go`、`access.go`、`collaboration.go`；`G/adapters/inbound/hap/conversation.go`；`contracts/hap/v0.1/{methods,schema}.json`|补同一ConversationAPI的成员/协调者CAS入口；复用RunStart.targetAgentIds；服务器可信群绑定与用户受理边的纯结构。明确历史none/bounded编码及当前权限，无客户端伪造身份。methods预留项只有消费者落地后才标implemented。|
|1 foundation_client，T01 TS|`src/modules/huhubot/api.ts`、`core/protocol/codec.ts`及相应合同测试|与Go/wire一致的CAS必填、历史范围显式值；保留现有方法名。mentions只产出验证后的agentId列表。|
|2 foundation_go，T02配置pin|`G/adapters/outbound/sqlite/assistant/store.go`|目标各自PinTask；无模型编排根不得强制A模型pin。现有Pin允许Model=nil，不应通过放宽Recipient修补。SnapshotUsage需真正纳入group membership，变更同步usage clock；具体拼装还涉及下行execution/store.go。|
|2 foundation_go，T03执行|`G/adapters/outbound/sqlite/execution/{store,children,executor,delivery}.go`；`G/application/execution/executor/{ports,executor}.go`；`G/application/conversation/direct/{ports,service}.go`、`G/adapters/outbound/sqlite/conversation/store.go`|可信批量受理入口（建议，尚无方法）、根执行角色、Claim配置加载、同Executor无模型聚合、群公共发布事务、当前成员的delivery查询。direct保持单成员规则，通过群业务路由复用底层UoW。对SnapshotUsage当前Unassembled groups补真实引用消费者。|
|2 credential_provider，T11/T12|`G/adapters/outbound/sqlite/collaboration/{store,cancel}.go`；`G/adapters/outbound/sqlite/usage/{store,finalize,waits}.go`|用户批量受理不借模型allowlist；继承同一root limits/budgetRoot；Attempt.current/Dispatch读取群当前代；父结果与群公共发布分离；取消outcome先由现作者核查。保留槽位/在途结算与CP语义。|
|2 credential_provider，T05|`G/application/access/context/service.go`；`G/adapters/outbound/sqlite/grants/{access,lineage,delivery}.go`|区别可信用户边与模型父边，不扩大Grant；来源为空也查成员/历史版本；来源/接收者变更维持当前拒绝。Context用于成员模型的历史范围独立于用户公开历史。|
|2 foundation_go，T06|`G/adapters/outbound/sqlite/effects/approvals.go`|复用现有CancelSubtreeInTx；交回前已新增同Tx CanceledInTx hook，由原owner完成下游验证。保留dispatching→unknown、审批关闭、pin/回执；不把旧版本观察当当前缺陷。|
|3 credential_provider，T13新路径|`G/domain/conversation/group/**`、`G/application/conversation/group/**`、`G/adapters/outbound/sqlite/groups/**`、`G/adapters/outbound/sqlite/migrations/013-groups.sql`、`native/huhubot/tests/contract/groups/**`|群受理、成员incarnation、明确历史区间、public seq/去重关联、根占位、局部取消选择、协调者CAS；这些路径是Ticket写集/未来新代码。|
|3 foundation_go，T01装配与注册|`G/bootstrap/core.go`、`G/adapters/outbound/sqlite/migrations/embed.go`|把群服务接现有Conversation/Executor/Events；注册013并保持连续版本。当前CurrentVersion=7；不改已通过的旧SQL。|
|4 credential_provider，T04 Go|`G/adapters/outbound/sqlite/events/store.go`；必要时`G/application/api/events.go`交T01|WithDelivery在物理发送前执行群/历史谓词；群公共History与根/子Run事件引用的有界快照消费者，不能把当前单Run LIMIT3快照直接扩大成无界群正文。优先已有History分页/ListTasks及稳定引用，不强制新push。|
|4 foundation_client，T04 TS/mentions|`src/modules/huhubot/services/events/event-client.ts`、未来`src/modules/huhubot/core/mentions/**`及相应测试|消费稳定公共顺序、根/子任务引用、断线快照与当前成员结果；单次提交全部targetAgentIds、busy保留草稿、普通姓名不自动委派。|

上述为精确候选维护路径，不要求每个文件都必须改；先冻结必要合同再决定最小实现。API/wire共同归T01原owner，T13不能自行放宽权限。T13公共展示若复用已有分页/子任务引用即可满足，不为展示方便扩充完整树正文DTO。

## 数据流与最小故障观察点（均未运行）

建议服务器事实链：用户命令+Session revision → 全目标资格/当前成员代/各自Recipient与Grant → 根与成员子Run同Tx → 子Run/派生任务继承群绑定 → Prepare/Dispatch → 当前成员及来源复核 → MessageInTx分配公共seq+结果去重 → WithDelivery复核 → 用户可见。模型Context只取本群允许的既有公开区间，不自动拼入目标私聊/私有记忆。

先冻结四个边界：①受理原子性及真实用户边，②群绑定的存储与纯Port，③公共发布与已有父结果的分工，④cancel后结构化outcome/unknown/pin终结。Report中的六组场景是必要公共消费者验证清单，不是已跑测试或新增产品规则。Spec未要求复用A模型完成广播，不能把实现限制反写成授权前提。
