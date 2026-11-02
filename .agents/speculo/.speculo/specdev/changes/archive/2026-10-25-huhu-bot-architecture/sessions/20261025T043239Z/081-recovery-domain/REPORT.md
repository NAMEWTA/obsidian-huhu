# T16 调用树恢复业务候选交接

Session: 20261025T043239Z
Task: 081-recovery-domain
Status: completed

## 聚焦交接

实现整棵受影响调用树的持久恢复资格、显式同 Run 恢复、原 T11/T12 真实消费门及 producer 排空计数；016 由080注册为实际 SQLite Version9。本业务切片实现与永久真实消费者已交付，34个自有生产/测试/永久夹具路径全部停写。Root明确允许本切片独立交回；联合矩阵、Root独立验收和代码门仍待080/Root最终证据，本文不宣称T16代码门或整个Goal通过。

作者 `/root/credential_provider`；沿Root请求的 `gpt-6.1-sol/xhigh` 偏好执行，工具没有独立可核验的底层模型身份。依据冻结 [TASK](TASK.md) SHA256 `21140cc642ba7aa89cf2a8c7fdbcf8a00837e7a7930c5749b4d2fea80d91ad43`、Map20/Goal19与正式联合窗口 `3befb9dca2031f81a4e3a0e02577cc80115955d2ef8ee6fd191faa6bedbdca63`。原T04两测试路径仅依Root正式补充 `events-fixture-order-supplement.md`（SHA256 `cbfa57a4134c1b23062925dee8b0c0255770a59ca58e5ca2e4db29ac063fa656`）维护；没有修改T04生产、T05/T13/凭证、旧SQL、依赖、正式状态或他人报告。

实际接口及所有owner边界见 [接口简报](interfaces-and-owners.md)。唯一公共API/schema/配置pin/Executor/CP/关闭由080维护；TS RecoveryClient/EventClient/HapConnection由082维护，均经真实bootstrap装配而非未消费Port。

- `runs.recovery` 的目标Run CAS与 `rootRunId/affectedRunIds/generation/treeRevision` 明确表达整树范围；对子Run查询不展示子范围却释放另一集合。`none/checking/ready/blocked/resuming` 是恢复资格，只有用户明确点击提交后的 `resuming` 才开执行门。
- 两个短SQL事务夹住完整CP/兼容及当前Context核查；水位包括当前树状态、配置/pin、结果/审批/续体/消息/usage、成员及权限事实。核查后发生变化不能发布旧ready；点击再核查并比较原Run CAS/恢复代/树水位。同key回执优先，回包丢失后显式原命令重试，不新建Run或清账。
- 启动只把真实preparing/running中断所涉及的因果树闭门，覆盖其中未领取accepted、待审批与等待祖先/兄弟；另一棵完全未领取树继续扫描。T11 bound actor/任务正文/Reply、T12 Admit/Wake/Claim/Reserve/Dispatch/ReadyParent实际复用同Tx门，未知SQL错误不吞。
- 原 `run/continuation/resume/application` 位置由080唯一执行器保存；081对真实schema8的已claimed parent_results/子结果/问答做纯读重建，不回退完成状态、不重复投递。纯群编排根不制造A配置、模型或CP。
- Stop先同步Store进程门，再持久闭门；失败由080唯一关闭循环重试。已有实际派发的Settle/ProducerEnded不被新准入门挡住。081 `PendingProducers` 参与真实排空：HTTP仍在途时保留Profile锁、DB、slot/pin和原账本，真实producer结束结算后才释放。

## 产物与验证

最终自有清单为 18-own-source-freeze-r2.json（历史日志已清理：`logs/18-own-source-freeze-r2.json`），34文件树 SHA256 `d6ba6d1db4147f4f0495fd89c72e1e1219f9bf796b52df6968e11bc3c9a370fd`。初版 10-own-source-freeze.json（历史日志已清理：`logs/10-own-source-freeze.json`） 的32路径无漂移；新增两条T04测试路径的原SHA和精确diff分别在 15 before（历史日志已清理：`logs/15-events-fixture-before.json`）、16 patch（历史日志已清理：`logs/16-events-fixture-order.patch`）。原T04生产及联合R1中的全部Go生产均无漂移。完整自有逐文件SHA在清单中，不将080/082源冒记为本作者产物。

016新增唯一 `execution_position_json`、恢复树资格表和runtime停止门，没有新完成账本。原T11/T12维护限当前恢复/停止门、旧位置纯读重建和排空计数。旧delegation要求用例仅增加重开后的明确用户恢复操作，原材料化task/constraints/expected、CP、正文及调用次数断言均保留，精确diff见 11（历史日志已清理：`logs/11-requirements-test-diff.patch`）。

真实迁移夹具来源是Root旧schema8代码实际建立并关闭/kill+Wait的完整Profile，分别含legacy CP、公开群和在途children Resume。来源manifest SHA256为 `2e1d9094ae073fa7c9b0d41186d1fdab5aaabcd13de3b117e80f2065cedd3cd4` 与 `0731d0d996c123c73f462a56c540e103aa5e08a1facaa55abe3161c0b8767564`；永久 [manifest](../../../../../../../../../native/huhubot/tests/contract/recovery/testdata/schema8/manifest.json) 保存9份DB/CP逐项SHA。迁移逐表比较所有旧列/行（36或37表）、CP字节及完整备份，未靠空库/改版本号或SQL改status伪造旧状态。

全部作者命令使用Go1.26.10，实际命令与退出值保存在下列原始日志中；`subprocess.run` 返回/PTY最终退出才记Wait，未把工具包装器退出当Go退出。

| 永久真实入口/原始日志 | 实际结果与范围 |
| --- | --- |
| [01 compile](logs/01-compile.log) | bootstrap/recovery/usage窄编译exit0。 |
| `TestSchema8ActualInFlightResumeKeepsClaimedChildrenAndUsageUntilExplicitWholeTreeResume`，[02](logs/02-v8-inflight-first.log)→[03](logs/03-v8-inflight-green.log) | 02仅测试SQL误用event列名，exit1，不算产品红。03 exit0：startup纯Inspector/Run0/Resume0，用户点击同Run新claim、原CP/Decision、Resume1；旧claimed结果未重投，unknown7保留，根终结、slots/pins0，同key换commandId重放原回执。 |
| [04 tree/migration](logs/04-tree-migration-first.log) | exit0：真实中断子任务关全树，原queued sibling不执行而fresh树正常；用户取消不可恢复leaf后显式恢复其余树。三份真实旧DB/CP升级全行保留；缺CP备份失败不应用016。 |
| `TestReadyDoesNotAuthorizeCorruptCheckpointOrStaleGenerationAndResumeReceiptRollsBackAtomically`、`TestConcurrentDifferentResumeKeysReleaseOriginalTreeOnlyOnce`、`TestMembershipMutationDuringOutsideCheckpointInspectionInvalidatesWholeTreePublication`，[05](logs/05-qualification-producer-first.log) | 三组实际case均绿：ready后坏CP、旧代、receipt/inspection SQL触发器全回滚；不同key并发仅一次放行；事务外核查期间真实成员变更使资格失效。05整命令exit1原因另列于下段。 |
| `TestActualDetachedHTTPProducerKeepsProfileAndSlotUntilRealResponseAndSettlement`，[05](logs/05-qualification-producer-first.log) | case绿：实际本地HTTP请求持有，Engine已结束而producer未结束，Close原3秒超时仍持锁/slot，后原bound.Settle真实unknown10、WaitClosed后重开。不是mock producer计数。 |
| `Test016StatementFailureRollsBackPositionColumnAndRetainsCompleteOldRecoverySet`、`TestReadyRecoveryDoesNotPreauthorizeFutureDispatchAfterBudgetPauseOrDownsize`，[06](logs/06-source-budget-migration-ts.log) | 两case均绿：016语句故障使ALTER及新表整Tx回滚，原DB/CP/备份不变；恢复后Reserve再公开pause/downsize，实际Dispatch callback0，Abort只退未派发预留，原unknown7不清零。 |
| `TestRealSourceCheckpointReopenWithNewHostLeaseBlocksWithoutRebindingOrReading`及旧材料化要求重开case，[07](logs/07-source-compatible-manual-resume.log) | 两条Go命令均exit0/Wait。真实Source CP实际Resume后关闭，新Host连接/lease→blocked HOST_LEASE_MISMATCH，Engine/HostRead/Dispatch0。原task边界和临时/已有子配置、实际CP Resume断言保留。 |
| `TestActualRecoveryClientUsesOriginalRunCASAndExplicitUncertainRetryAcrossProcesses`，[09](logs/09-ts-current-member-reanchor.log) | exit0，实际4个Runner+Node均Wait。生产RecoveryClient/EventClient/HapConnection↔stdio/Facade/SQLite/同Executor，12项观测全true：双击同promise、整树范围、目标重锚/兄弟不变、真实丢已提交回包→uncertain、重连不自动RPC、原CAS/gen/key显式retry、移除成员后的当前重锚拒正文、合法公开Transcript保留、原unknown usage不变。 |

05/06真实exit1完整保留：05中预算测试沿旧Options依赖、未公开配置新实例policy，实际明确BUDGET_NOT_CONFIGURED；source夹具只有A Grant而实际child继承全部来源，故未进入预期CP。仅给预算夹具公开configureBudget、给source夹具显式B recipient后继续；06仍误把复用的连接ID当已换连接，改成可信新连接身份后07绿。没有放宽Source/Grant或将这些夹具错误冒称产品红。08 aux记录（历史日志已清理：`logs/08-fixture-aux-cleanup.json`）说明081只读SQLite检查在自有永久副本产生空WAL/SHM；核对全部9份DB/CP字节一致后只删除这两个自有生成物，Root原crash DB/WAL未触碰。永久测试均复制后操作，copyTree拒绝输入aux，最终aux=[]。

生产TS输入明确为082冻结SHA：RecoveryClient `2db067395ef098ce7171ce80961736455daa265726746f0d9718aaff70f00367`、EventClient `31ac66ee70cc75b381e3f0289aa52ad57a88b92e318fed78c1caff611684dca8`、HapConnection `5fb8fe71047273993f19f8a8633d32475760184eb8b1723770dda346a4822d25`。实际frame harness只丢/持有真实回复，不伪造恢复RPC或计数代替业务结论。

联合R1由080执行，377文件树 `68b4115aeba1d786ebab562699f01b37ace1d47f64da75dc4aad56d3fc01b52a`，全模块普通实际exit1/Wait93.803s、drift=[]；race/vet未启。仅events夹具首次private Run原3秒未终结，以及foundation旧capability/schema版本断言失败。详见080 [13 normal](../080-recovery-core/logs/13-normal.log) / 14结果（历史日志已清理：`../080-recovery-core/logs/14-normal-result.json`）。

对events的有界证伪与最小修正如下，不把无变化重跑绿当修复：

- [12 original](logs/12-events-original-reproduction.log)单次绿、[13诊断overlay](logs/13-events-diagnostic-interleavings.log)30次绿，均保留；没有据此认定原事故不存在。
- 单一外部overlay、同一原case/3秒/业务断言，仅控制独立fixture append发生在MarkRunning读事务之前或读取后。[14 before](logs/14-events-controlled-before.log) exit0/Wait0.362s；[14 during](logs/14-events-controlled-during.log) exit1/Wait3.059s，真实错误 `sqlite3: database is locked`，Run preparing/rev2、claim非空/position=run，只有accepted/preparing/独立delta，无running。没有采集扩展SQLite错误码，不声称观测了特定扩展码。
- 这证明**强制同类交错的fixture独立写冲突**；R1原事故未采集Run/SQL错误，因此“原事故同源”仍是推断。外部overlay不进入产品/永久测试。
- Root批准后，16 patch（历史日志已清理：`logs/16-events-fixture-order.patch`）仅记录ExecutorPaused，active sourceRun先沿原3秒waitTerminal再附原synthetic delta；paused仍原样。所有原业务、270/seq274/来源/坏JSON/撤权断言不动，生产不改。[17定向](logs/17-events-fixture-order-green.log)4例actual exit0/Wait1.412s，原失败case0.32s，另含paused队列撤权/自然到期/物理完成fence对照。

联合R2当次核验输入由080固定于 17 joint-r2（历史日志已清理：`../080-recovery-core/logs/17-joint-source-r2.json`）：377文件树 SHA256 `6de04fa6e5cb3b1897105fda4f34d26e482ce093911a68a24452a63203046b08`，相对R1仅081两处events测试与080三处foundation测试有差异，全部生产无变化，081自有34路径逐SHA一致。[18实际普通日志](../080-recovery-core/logs/18-r2-affected-normal.log)与19实际回执（历史日志已清理：`../080-recovery-core/logs/19-r2-affected-normal-result.json`）：events整包exit0/16.916s，含原270/seq274与source800原250ms门；foundation仍有一处旧runs.resume“未实现”负控失败，两包总命令actual exit1/Wait27.080s、drift=[]。该剩余负控由080在其原路径修正，后续联合输入/11包race/vet/schema/architecture及Root独立审查仍pending，不将当次R2水位冒作修正后最终联合输入。其余R1已通过普通包按相同生产字节/闭包复用，未声称重新跑全模块普通。Root明确本081可据当前自有冻结清单独立交回，由Root组合080后续正式证据；本报告不提前填入未完成退出值。

## 问题与下一步

候选源码/测试/永久夹具已停止写入，081启动的所有Go/Node/Runner/本地HTTP producer均已实际Wait；无遗留实际producer。后续仅报告、输入回读和return，不自行追加重测。Root独立旧v8故障/TS端到端/build/lint和独立审查另行，不写成本作者已完成。

旧Host lease身份失效的含资料树明确blocked，不能静默换Source身份；本轮无可信handoff扩展。资格ready不是未来预算或效果许可，真正Reserve/Dispatch仍逐次受当前pause/额度/身份/取消约束。真实模型/Provider协议（T08–10）、SDK CP兼容、Obsidian、真实用户Vault/OS keyring及目标macOS/Windows运行均未执行，由用户或对应owner后验；没有请求秘密值或触碰凭证实现。
