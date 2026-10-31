# 066 当前签名、代数与最小owner请求

所有路径相对仓库根；下文G=`native/huhubot/internal`。本表是未来精确联合窗口建议，不提供产品写权。行号对应observations.json的SHA；若最终source-recheck不匹配，相关当前事实失效，交原owner回读。

## 当前生产消费者

```text
bootstrap: Profile锁 → DB/Blob → 配置/凭证 → 同一Executor.New
  → execution.Recover(旧preparing/running→interrupted)
  → usage.RecoverAttemptsInTx → scan

scan: fresh accepted → tree.ClaimInTx
  或 approval Ready→tree Claim→continuation Claim
  或 ReadyParent(自身先tree Claim，读取持久结果/CP)
  → preparing + 新claim → Context/权限 → running → ToolSession
  → 普通Run / 同Engine.Resume / CompletedResult直接Finalize

cancel: effects.CancelSubtreeInTx → usage.CanceledInTx(同Tx)
  → commit → Executor.CancelRun
  → 实际Engine/HTTP producer结束 → slot/pin清理

unknown: EffectsAPI.Reconcile → 持久Effect/Preview → Host.QueryReceipt
  → SaveReconciliation(CAS/幂等回执/事件/terminal pin cleanup)
```

`ReadyParentInTx`现在通过`nextReadyParentInTx → ClaimInTx`先检查祖先/槽位，再修改parent_results/wait edges；不能沿用旧研究猜测它必然先吞等待记录。普通审批ReadyInTx只是选择，实际claimed与Run claim同事务。T16新增树屏障必须同样早于任何消费性更新，并覆盖启动后所有领取通道。

## 已存在的签名（省略receiver名称）

```go
// G/adapters/outbound/sqlite/execution/executor.go:18,54
Recover(ctx context.Context) error
Claim(ctx context.Context) (*executor.Work, error)
// G/adapters/outbound/sqlite/execution/children.go:179
ReadExecutionConfigInTx(ctx context.Context, tx *sql.Tx, runID string)
    (api.TaskConfigSnapshot, api.ExecutionLineage, error)

// G/adapters/outbound/sqlite/effects/approvals.go:247
CancelSubtreeInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity,
    profileID, runID string) ([]string, error)
// G/adapters/outbound/sqlite/usage/canceled.go:15
CanceledInTx(ctx context.Context, tx *sql.Tx, runID string) error
// G/adapters/outbound/sqlite/usage/recover.go:11
RecoverAttemptsInTx(ctx context.Context, tx *sql.Tx) error
// G/adapters/outbound/sqlite/usage/finalize.go:108
ReadyParentInTx(ctx context.Context, tx *sql.Tx) (string, *api.EngineResult, error)

// G/application/api/tooling.go:43-47（纯公共Port）
type CheckpointAccess interface {
    Metadata() api.CheckpointMetadata
    Publish(context.Context, io.Reader) (api.CheckpointArtifact, error)
    Open(context.Context, api.CheckpointArtifact) (io.ReadCloser, error)
}
// G/application/api/conversation.go:141-144（纯公共Port）
type Engine interface {
    Run(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error)
    Resume(context.Context, api.EngineResumeInput, func(api.EngineEvent) error) (api.EngineResult, error)
}
// G/application/tooling/reconcile/service.go:30
Reconcile(ctx context.Context, id api.RequestIdentity, c api.EffectReconcile) (api.EffectView, error)
// G/application/execution/executor/executor.go:300,313
Close() error
CancelRun(run string)
```

以上类型名用api前缀说明归属，不是建议复制一个平行接口。`EngineResumeInput`已有Input、CheckpointRef、Checkpoint、Decision；`RunContinuation`已有Kind、Children、ApprovalID/EffectID/Decision/Generation、Checkpoint，**没有**T16恢复资格。不能把审批Continue当泛化恢复入口：它检查continuation state/claim和审批代数，批准路径还有Host Check/单独dispatch。

`blob.Store.Open`先增加hold，再完整读取HUHUCP1 envelope，核对metadata、size和payload SHA，返回带释放器的reader。`CheckpointAccess.Open`另检查持久引用/Run/Metadata。Executor现有children/question续跑先Open/Close进行预检，再把同一Access交Engine；这不代表未来SDK已实现全程读取hold。恢复Inspector必须使用完整reader生命周期，不能只查ref字符串或仅比Metadata。

## 代数和持久事实不能混用

|当前事实|真实用途|T16消费者要求|
|---|---|---|
|Profile command_epoch、CommandMeta及命令回执|幂等重放/清除后拒绝旧命令|resume沿用，不由客户端决定CP或核查状态。|
|Run revision / claim_token|持久CAS / 本次执行worker权威|用户resume发布后使用新claim；旧worker sink/finalize不获权。|
|cancel_epoch、task_admission_closed、admission_closed|取消代、树任务准入、首个待批效果闸门|不能靠清零cancel复活；树恢复资格需独立水位/代，落实到所有领取与出站消费者。|
|resume_generation / execution_continuations.generation|现有审批decision续跑|不是用户recoveryGeneration；正常pending、claimed、completed分别处理。|
|collaboration_parent_results.generation/state/checkpoint_json、wait edges|children/question等待及CP续跑|未领取保持待消费；已claim中断需保留原恢复位置，不能简单改waiting重投正文。|
|root_run_id/parent_run_id、budget_root_run_id、work_thread_id、task_config_id|真实调用树、费用归属、上下文/配置身份|树屏障按真实关系；预算根不是额外树身份，恢复不重建预算/线程/配置。|
|execution_checkpoints、Effect/Approval、result_deliveries、attempt ledger|已发布CP、已发生或未知效果、已完成结果、费用/producer|核查后复用身份；真实Effect结果可晚到，不能借此重开终态或自动外发旧正文。|

新恢复记录最小职责：绑定指定真实树及受影响Run集合、当前版本水位、核查代、资格/阻塞原因和已验证CP/配置身份。建议以两短事务夹事务外检查，不复制第二份任务完成库。核查与点击之间发生任何相关事实变化，CAS拒绝旧资格；精确字段/放置由原owner联合冻结。

## 新Port建议（当前不存在）

1. 只读恢复检查：可信服务端读取持久Run/树、旧pin、已发布Artifact及结果/效果事实；不要求执行claim。提供完整reader hold与纯兼容检查，区分可恢复/不兼容/损坏/缺失，不调用模型、写工具或上传CP。SDK payload语义留adapter，公共类型不含Eino/OpenAI类型。可先由受控Engine实现，后T08消费同Port。
2. 用户恢复用例与资格查询：在现有API/Facade、Run查询投影上接入；不改方法名runs.resume，不接收客户端CP。用户命令只使符合当前代数的一次继续可领取，再走同Executor。当前预留wire/TS的expectedRevision须按CAS合同冻结；implemented仍应保持false直到真实消费者具备。
3. 树核查复用T07效果逻辑：用户EffectsAPI已可独立核查，不要求model claim；若启动内部核查需要新纯Port，提取同一规则，不伪造用户HAP命令或另造Host写入通路。持久读取→事务外Host.QueryReceipt→当前条件CAS；不可把旧lease直接改成新lease再Invoke。
4. 统一关闭：关闭新受理/claim/delegate/实际派发，再取消、有限join、保存事实。API shutdown ack仅代表接受关闭请求，不是排空证明。真实producer未停时不得先关DB/锁或宣称slot已释放；超时保持隔离和unknown，受管终止后下一进程才按锁证明处理旧producer。临时连接断开不进入服务关闭。

## 原owner最小维护清单

|原owner|精确候选路径|需提供的最小接缝|
|---|---|---|
|foundation_go，T01 API/wire|`G/application/api/{conversation,tooling,types,service}.go`、`G/adapters/inbound/hap/{conversation,router}.go`、`contracts/hap/v0.1/{schema,methods}.json`|用户resume及资格投影/纯CP检查与统一shutdown合同；保留现有方法，严格CAS/身份，正常continuation区别清楚。|
|foundation_go，T03执行/装配|`G/application/execution/executor/{ports,executor}.go`、`G/adapters/outbound/sqlite/execution/{executor,children,store}.go`、`G/bootstrap/core.go`|启动分类早于scan，所有claim通道消费恢复屏障；同Run新claim/正确恢复阶段；统一stop/drain，实际结束再资源清理。|
|foundation_go，T02 pin|`G/adapters/outbound/sqlite/assistant/store.go`；凭证状态经现有`G/application/api/credentials.go`/Provider|恢复读取旧快照，不用CloneTask；非终态与未决效果保留pin；当前凭证状态和能力另查。`assistant/credentials.go`已有StartSession session-memory missing，通常只需复用；不重写凭证库。|
|foundation_go，T06/07 CP/效果|`G/application/tooling/broker/{service,ports}.go`、`G/adapters/outbound/blob/store/store.go`、`G/adapters/outbound/sqlite/effects/{store,continuations,approvals,reconcile}.go`、`G/application/tooling/reconcile/service.go`|非执行claim的CP检查、兼容身份、原effect/continuation阶段复用、unknown核查；不得为恢复直接再次Invoke。完整reader hold及引用保持到消费结束。|
|credential_provider，T11/T12|`G/adapters/outbound/sqlite/usage/{recover,store,waits,finalize,canceled}.go`、`G/adapters/outbound/sqlite/collaboration/{store,cancel}.go`|树资格谓词进入Claim/问答领取/Attempt.Dispatch；结果身份去重/partial；已发送账本不盲退，重启结算只在进程锁证明成立后。|
|credential_provider，T05/T04 Go|`G/application/access/context/service.go`、`G/adapters/outbound/sqlite/grants/{access,lineage,delivery}.go`、`G/adapters/outbound/sqlite/events/store.go`|恢复当前Grant/接收方/有效来源，恢复资格与快照/尾读当前权限；T13成员谓词未来冻结后再接，零来源也不能跳过群身份。|
|foundation_go，T01生命周期/注册|`native/huhubot/cmd/huhubot/main.go`、`G/adapters/inbound/stdio/server.go`、`G/adapters/outbound/sqlite/base/store.go`、`G/runtime/profile/profile.go`、`G/adapters/outbound/sqlite/migrations/embed.go`|区分受管进程EOF与连接EOF；统一关闭返回/超时资源顺序；016正文接纳后注册，旧SQL不改。base/profile优先保持现有关闭原语，只改调用顺序，确有接口需求才维护。|
|foundation_client，T01/T04 TS消费者|`src/modules/huhubot/core/protocol/{connection,codec}.ts`、`src/modules/huhubot/services/events/event-client.ts`、`src/modules/huhubot/platform/desktop/transport/managed.ts`|`src/modules/huhubot/api.ts`仍由T01 foundation_go唯一生成，client只消费并维护TS消费者，不转移owner。消费resume代数/资格与事件投影；关闭/退出等待与临时连接区分，复用已有exited/后备kill；不把transport.close当完整T20模块关闭。|
|Root下一窗口指定，T16新代码|`G/application/execution/{cancel,recovery}/**`、`G/domain/execution/recovery/**`、`G/adapters/outbound/sqlite/recovery/**`、`G/adapters/outbound/sqlite/migrations/016-recovery.sql`、`native/huhubot/tests/contract/recovery/**`|持久资格/核查编排与取消关闭消费者；报告八组仅为起始场景，实际风险与合同决定验证覆盖，不设测试数量上限。路径来自T16，现未创建。|

不是要求所有列出的文件都修改；先冻结真实消费者需要的最小合同，再由原owner决定最小写集。T13新群接口没有提前假定签名，不把060建议当已实现API。T20模块装配和真实目标OS验收仍由其后续票消费。
