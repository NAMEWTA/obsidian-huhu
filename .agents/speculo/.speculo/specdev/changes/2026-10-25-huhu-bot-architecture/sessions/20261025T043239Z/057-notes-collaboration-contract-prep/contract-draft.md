# 057 小型签名草案（未冻结、未实现）

以下是角色/职责草案，不是可编译代码或新增公共方法承诺。052/053/054实际派遣后共同冻结名字、具体字段与严格schema；公共API仍唯一owner维护。

```text
BoundExecution = Profile/epoch + trusted principal
  + Subject(agent|temporary, subjectId, sponsorId?) + ConfigSnapshotRef
  + root/parent/run/workThread + claim/cancel/generation + recipient
  + effective Host sources/scopes + trusted derived input lineage

ToolArgs = NoteWrite | Discover | Delegate | Message | Reply | CancelTask
ToolResult = Effect | DirectoryPage | DelegationReceipt | DeliveryReceipt
BindTools(BoundExecution) -> ToolInvoker // 模型只给typed args与稳定调用ID
BindAttempts(BoundExecution, PurposeAccount) -> ModelAttempts
ModelAttempts.Reserve(LogicalCall, RetryOfAttempt?, InputEstimate, OutputBound) -> Reservation
ModelAttempts.Dispatch(Reservation, start callback) -> InFlight
ModelAttempts.Settle(InFlight, Observation{known|estimate|unknown}, ProducerEnded) -> Receipt
ModelAttempts.AbortUnsent(Reservation) -> Receipt
```

Dispatch以当前授权/claim/取消/额度短事务领取真实发送资格；callback启动网络在SQL外，跨过此边界即在途，不能取消后全退。producer尚未结束时不能谎报释放HTTP槽。维护purpose/account独立，未配置/暂停/耗尽为0请求；不是公开任意模型HTTP API。

```text
// 以下仅SQLite adapter helper可以带Tx；Application只调一次Repository.Admit。
AdmitChildInTx(tx, BoundParent, Intent, Target, VerifiedContext)
  -> policy reserve + existing/config-task pin + root/parent/workThread
  -> child accepted + lineage + delegation + counters + receipt + first events
ReadExecutionConfigInTx(tx, SnapshotRef) -> fixed ExecutionConfig
PublishWaitInTx(tx, claim, VerifiedCP, ChildOrQuestionCondition) -> durable continuation
FinalizeTreeInTx(tx, claim, Result) -> actual descendants/effects/usage guard + original finalizer
CancelSubtreeInTx(tx, trusted actor, subtree, expected epoch) -> barrier + accepted descendants
```

Root visible Session与child workThread分开；011演进原active-root索引与loader，不创建B私聊。temporary snapshot不是agents行，不冒用Sponsor记忆；凭证/配置保留引用同时进入原删除/GC屏障。消息/子结果lineage只由应用解析真实输入生成，kind先有message/task_result；Host SourceSnapshot不伪装记忆。

```text
WriteBinding = profile/workspace/origin + original lease/connection/epoch
  + run/effect/approval revision + opaque target/preparation/version
  + beforeHash + contentHash + parametersHash + previewHash
  + capability/implementation/policy version + expiry/dispatch generation
PrepareWrite(trusted context, proposal) -> trusted binding/diff
CheckWrite(binding) -> unchanged-or-reject             // 只读、不换批准目标
InvokeWrite(current connection, original binding, content) -> bound evidence
QueryReceipt(current connection, original fingerprint) -> evidence // 永不mutation
Reconcile(user CAS command, effectId) -> committed|reconciled|unknown
```

建议由真实Preview/Check消费者决定具名reverse prepare/check方法；现host.invoke/queryReceipt增强原绑定，不能让普通客户端自报路径。公开reconcile只提交effect身份/CAS，证据由服务查询并验证。received不是committed；可信completed保留原事实，只有后置条件为reconciled；原文未变/timeout均不能推断未写。

反向取消建议严格具名控制通知`$/cancelRequest{requestId}`：仅受信方向/同连接创建的ID可取消。保留active/canceled-awaiting/settled的有界关联记录（method/fingerprint/generation/TTL/bytes），取消不Close sibling连接；无法容纳新关联时拒绝新请求，任意未知/重复响应仍拒绝。写端promise实际settle前继续持quota，最多一次标准response；迟到可信证据只补原effect，过期关联后走持久query，不跨新连接匹配。

迁移恢复集采用Root已选方案：锁内旧DB一致副本→从副本枚举CP引用→复用Artifact校验复制完整HUHUCP1编码文件→DB/Blob大小/hash/版本/Profile/epoch清单最后同步发布→才迁移。Blob.Open只是payload，不能当完整CP备份。独立备份不在live checkpoints，GC不删其唯一副本；T17纳入完整/半成品恢复集清除，T19再负责完整恢复。缺失/损坏/发布失败停迁移，不rename替换仍被原inode锁保护的数据库。
