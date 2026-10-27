# 081 / 080 实际恢复合同

本简报记录已装配的实现合同，不替代 Spec/ADR、正式状态或最终独立验收。081 初版32文件固定于 `logs/10-own-source-freeze.json`，获批原T04两测试夹具顺序修正后最终34文件固定于 `logs/18-own-source-freeze-r2.json`；080 持有唯一 API/schema/装配/Executor/CP/关闭写集，082 持有生产 TS 消费者。HAP 仍为0.1，SQLite 016由080注册实际Version9；永久旧输入为真实Version8完整DB/CP，而非改版本号夹具。

## 唯一公开用例与范围

`runs.recovery({profileId,id})` 返回 `RecoveryStatus{runId,rootRunId,revision,state,generation,treeRevision?,affectedRunIds,reason?,checkedAt?}`。state 为 `none|checking|ready|blocked|resuming`；revision 是被请求Run的CAS，generation是独立恢复代，treeRevision是整棵真实因果树的opaque SHA256。无恢复记录时 generation=`0`、affectedRunIds=`[]`。它只返回owner元数据，不返回CP、配置正文、来源正文、私有结果或本机路径。`runs.get` 的可选Recovery投影在原同一读事务中读取，不重复核查CP或修改资格。

本轮操作范围是**整棵受影响因果调用树**。查询子Run仍明确返回真实RootRunID和全部当前非终态affectedRunIds，不展示子范围而释放另一集合。完整集合、各Run持久状态、原结果/审批/费用/消息、配置pin、当前成员及权限时钟一起进入水位。点击要求被请求Run仍是root或当前affected集合成员；取消后的terminal子Run不借旧身份恢复其余工作。预算root可能与因果root不同，恢复没有改变其中任何一个身份。

`runs.resume` 使用唯一 `RunResume{CommandMeta(强制expectedRevision),id,recoveryGeneration}`，返回原RunReceipt。事务先校验Profile/epoch和原幂等回执，再比较Run CAS、恢复代、ready资格和树水位。事务外重新完整核查CP/兼容及当前Context；第二事务再次比较全部事实，逐实际interrupted/blocked Run调用080唯一ResumeInTx，然后把同树门设为resuming。原命令重试恢复原回执；不同意图/旧代/旧CAS不放行。不是StartRun、重新委派、清账或恢复终态。

## 016与实际消费门

016新增 `execution_runs.execution_position_json`、`execution_recovery_trees` 和 `execution_recovery_runtime`。树记录保存generation/state/treeRevision、affected/interrupted两个真实集合、safe reason/checkedAt，没有第二完成结果库。runtime是当前进程的持久停止门；只在获得原Profile独占锁且旧producer确已结束后重置open。

080原Recover在同Tx把真实preparing/running改interrupted，保留位置并记录其整棵真实root树。081门覆盖同树未领取accepted、审批就绪和等待汇合的祖先/兄弟；全新未领取的另一棵树仍扫描。`checking/ready/blocked` 都关闭执行，只有明确用户点击后的 `resuming` 开门；ready不是一次Claim。

080负责根/群编排根/child受理、所有Claim与T06末门。081在原T11/T12的model-bound actor、任务结果消费、用户Reply、Admit/Wake/Claim/current(Reserve/Dispatch)/ReadyParent复用同Tx门。扫描遇已关闭树跳过，未知SQL/Fault不吞。进程停止还分别先设置各实际Store atomic门，再后台重试持久Stop：即使Stop写事务失败，后续Background Dispatch/受理仍不能通过。Settle/ProducerEnded与已有派发的原结算不被该门阻止。

## 执行位置与CP

唯一内部 `ExecutionPosition{Phase,Continuation?,Decision?,CompletedResult?}` 分为run/continuation/resume/application。080在Claim同Tx保存原continuation或应用结果；实际Engine.Resume前保存原ToolResult决定。恢复resume位置复用原Decision，不再Continue/Invoke/消费子结果。应用汇合直接复用结果，纯群编排root不制造Agent配置pin、模型或CP。

schema8尚无position的旧已claimed parent_results由081 `usage.LegacyPositionInTx` 纯读原持久关系、CP与不可变child/question结果重建；orchestration共用原status-only投影。它不回退claimed→waiting、不重新发结果或Claim。080用原T06事实重建旧审批completed位置，并覆盖CompleteContinuation提交成功、SaveResume失败这一真实两事务窗口。

Inspector使用 `RecoveryInspection{Run,Access,Config,Position}` 与纯 `EngineCheckpointInspector`。080 Broker打开原已登记Artifact，经HUHUCP1完整校验、reader hold、Engine/format/definition及真实checkpoint registry核对，再调用纯兼容检查并完整读取/Close；没有claim、Provider、Host写或模型入口。缺失/损坏/不兼容/未装配明确blocked。检查在两短SQL事务之间进行，不跨SQL等待CP或外部服务。

## 当前身份与关闭边界

各实际执行participant仍经当前read/send及完整Group proof检查；凭证只核当前安全元数据，不读取秘密。Source继续严格绑定原workspace/origin/resource/revision/hash/Host connection/lease/epoch。Runner/Host重开新lease后旧Source明确blocked，不无痕重绑；真实新连接对照已证明Engine/HostRead/Dispatch均0。无Source及身份仍有效的CP可恢复，不把这些绿例泛称为所有资料树均可恢复。

ready不预授未来HTTP额度：恢复后实际每次Reserve/Dispatch仍检查原账户归属、当前pause/额度和原claim/cancel事实。公开pause或下调在Reserve后、Dispatch前提交时callback0，AbortUnsent只退款未派发的新预留，原进程中断的unknown7保留。

080 Core先关闭准入并取消实际上下文，等待原Executor、Inspector和实际dispatched producer全部结束后才关闭DB/Profile锁。Close3s超时只是未排空，后台继续持锁、保DB和原slot/pin/账本；实际HTTP响应结束并用原bound Settle后才WaitClosed。CLI EOF/shutdown使用同一关闭链。

## 真实消费者

081 `tests/contract/recovery` 使用Facade/SQLite/原Executor及真实v8输入，082生产RecoveryClient/EventClient/HapConnection经实际stdio与Go child交互。正常双击共用promise；实际丢已提交回执后uncertain，重连不自动RPC，显式retry保原CAS/gen/key；目标Run重锚不修改兄弟。实际接受回执保持pending至公开成员移除后才交给客户端，accepted仍成立，而重新读取当前Run资格使缓存正文清空/denied，合法已发布Transcript保留。所有Runner及Node实际Wait。

真实Provider、模型、Obsidian、用户Vault和目标OS由用户后验。本简报不宣称T16代码门、全部28票或整个Goal已通过。
