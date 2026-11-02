# 联合 race 两处实际失败：只读诊断交回

Session: 20261025T043239Z
Task: 085-recovery-race-diagnosis
Status: completed

## 聚焦交接

本任务仅诊断，生产、永久测试、081历史报告、正式状态均未修改。群聊缺一条回复的**合法交错触发fixture主动报错**已由双模式对照确证；事件失败已确认为**真实270条事件仍正常推进时，3秒轮询context先到期**，不是第二次StartRun失败、旧context泄漏或永久卡死。针对恢复guard的单SQL候选未达到现有helper的3秒门，不能作为已验证修复。该3秒来自waitTerminal测试夹具，不是已找到的Spec/T04产品性能要求；是否需要产品优化或正确配置测试lane，仍待原owner量化后决定。

Root正式派遣 [TASK](TASK.md)，作者 `/root/credential_provider`，沿请求的 `gpt-6.1-sol/xhigh` 偏好执行，不声称工具可独立核验实际底层模型。按dev/testing与SpecDev D的单变量/失败保留规则执行，未另派代理。输入为080 21-final-joint-source.json（历史日志已清理：`../080-recovery-core/logs/21-final-joint-source.json`），377文件树 SHA256 `02eb94d9c8f4f6caeb2ca378554ad2f9f39c6b65847e7801be622787f0803dea`；00输入逐SHA（历史日志已清理：`logs/00-input.json`）无漂移。

原证据080 [24-risk-race.log](../080-recovery-core/logs/24-risk-race.log) / 24实际结果（历史日志已清理：`../080-recovery-core/logs/24-risk-race-result.json`）：11包race实际exit1、Wait563.245s，仅groups/events各一失败，其余9包通过，无DATA RACE报告，377输入drift=[]。Root明确释放此进程结束后的唯一085窗口，才开始以下七条定向Go命令；不是在080矩阵期间抢跑。

## 群聊：确证fixture把合法公开历史当失败

原case `TestOnlyTargetSourceGrantsAuthorizeAtomicBatchAndAttachmentLabelsAreFenced`：根succeeded、B/C Engine计数各1，但公开History只有用户文字与一条SOURCE_DERIVED_RESULT，附件仍存在。原24现场没有child reason/publication SQL，因此该次事故与下述机制同源仍是推断，不补造旧现场。

规范依据是spec§2：成员可见合法公共transcript（仍受其join/range与当前来源授权），不保证同批所有成员读取同一时刻快照；并行成员回复以持久seq排序。实际groups.ModelHistoryPage依当前成员范围读取公开行，direct.ModelHistory为实际读到的消息增加Derived，Executor按Kind+ID去重。源fixture却先calls++，再要求Derived恰好1，合法额外公开消息会使其返回 `user batch lineage missing`。

只在 [groups external overlay](probes/groups-overlay-input.json) 中加调度barrier与观测；原Engine、全部History长度/附件/来源/权限断言保留。两个模式用同一overlay，仅env `HUHU_DEBUG_085_GROUP_ORDER` 不同，无sleep制造顺序，barrier监听真实ctx取消。

| 单变量顺序 | 实际观察 | 退出/Wait |
| --- | --- | --- |
| `late-history`：第二worker等首child Finalize真正提交后才读取ModelHistory | 首Engine只有用户message Derived；首child succeeded并提交公开seq2。第二Engine实际History含用户+该合法公开回复，Derived=2；fixture主动报错。真实child failed/MODEL_EXECUTION_FAILED，publication failed/message=NULL；根succeeded/CHILD_PARTIAL_FAILURE；History恰为user+1正文。Finalize无SQL错误，不是漏发布或需要多等一会。 | [01日志](logs/01-groups-late-history.log) actual exit1/Wait，case0.99s、外层3.424s。 |
| `both-history`：两worker都读取完History后才进入Engine | 两Engine均只有用户Derived；两个child succeeded、publication seq2/3、History3项。原整批缺Grant零写、附件身份、撤权后正文/标签与物理fence等后续断言全部通过。 | [02日志](logs/02-groups-both-history.log) actual exit0/Wait，case1.07s、外层2.646s。 |

最小修复契约仅请求原T13测试owner的 `native/huhubot/tests/contract/groups/sources_test.go`：验证真实根用户消息的稳定Derived kind/ID/hash/namespace/thread存在且唯一，并验证额外Derived对应实际允许的公开History；不能只改成len>=1，更不能删History3项、两目标各一次、A零模型、来源/附件/整批回滚/撤权断言。永久回归应覆盖两种合法顺序；可在同文件sourceHost测试替身于第二次受控Read前等待首publication，早读控制在两Engine已进入前不允许首结果发布，保持真实同Executor/Host/SQL，不把测试barrier写进生产Executor。现有生产公开历史语义保持。

## 事件：确证deadline到期，成本细分仍未闭合

原日志是 `events_test.go:487: sqlite3: interrupted`。Root最初消息及TASK对齐成第二次StartRun，随后用nl与SHA正式更正：实际483 StartRun/485其错误，487为waitTerminal调用；history_test.go:27独立WithTimeout3s，30用bounded调用GetRun，32原样t.Fatal。当前events_test.go SHA256 `75aa64dfb41bb510f9949802b75716fea5d4e4447979355c09c7ef5466d59cf4`。保留此纠正，不继续按旧行号解释。

| 命令/插桩 | 实际结果 |
| --- | --- |
| 原case，不加overlay | [04日志](logs/04-events-original.log) actual exit1/Wait4.351s，原487同样sqlite3: interrupted，case3.79s。独跑仍红，不能归因11包同时运行。 |
| 只加context/进度/错误观测，不改门限或生产判断 | [05日志](logs/05-events-observed.log) actual exit1/Wait6.405s。GetRun真实交易context为timerCtx，elapsed3.000535s，bounded.Err=deadline exceeded，包级Background.Err=nil。失败时compact仍running/seq248，Engine context未取消；270条emit实际3.079449s，失败后207.9ms自然succeeded/seq274。 |

[events overlay](probes/events-overlay-input.json) 保原3秒、270与seq274及所有业务断言。独立最多5秒观察只在原3秒条件**已失败之后**读取临时Profile，原断言无论随后是否成功仍失败；不是延长通过期限。其间没有重启或新Claim，真实seq持续增长，反证“永久卡死/StartRun失败/旧worker取消污染新背景事务”。日志末尾若见Core.Close后Claim因executor context canceled中断，属于原失败后的清理，与当刻bounded GetRun超时分开。

### 恢复guard单变量候选的负向结论

T16 AppendEvent现每条调用原恢复guard，依次读runtime/root/tree。本轮获Root明确授权，仅在外部 [guard overlay](probes/guard-overlay-input.json) 把非空Run的三次查询合成同Tx LEFT JOIN；空Run仍只读runtime。未做任何跨事务缓存，未删除资格检查。

[07语义日志](logs/07-guard-equivalence.log) actual exit0/Wait3.177s，15子例逐项比较原函数与候选：fresh、checking、ready仍关闭、blocked、resuming、runtime优先于缺Run、invalid runtime优先、缺Run sql.ErrNoRows、缺runtime、空Run不访问tree、root空值回退、坏tree state、SQL fault、已取消context，以及同一Tx内无tree→ready→resuming每次重读。覆盖范围不等于对所有损坏schema/多故障优先序的完备证明，候选不据此自动进入生产。

- [08原断言+joined guard](logs/08-events-joined-guard.log)：actual exit1/Wait4.667s，仍在原3秒deadline失败，不能算修复绿灯。
- 为比较进度，只把05相同插桩与该query候选叠加，[10日志](logs/10-events-joined-observed.log) actual exit1/Wait5.634s：270 emit3.029438s；3秒时running/seq255，失败后167ms自然succeeded/seq274。

3.079449与3.029438各是单次样本，不宣称稳定提速；关键结论是候选仍超原门，**三SQL合一不够且不是已验证修法**。不能把全部新增成本归因恢复guard、选择性重跑择绿、抬3秒、减少270或跨Tx缓存授权。

事件后续最小诊断建议归原080/T16与原T04消费者，不能预设必须修改生产：先量化正常与-race的差异、270个真实事务及5ms GetRun轮询的观察竞争，再在 `native/huhubot/internal/adapters/outbound/sqlite/execution/executor.go` 的AppendEvent对现有恢复门、claim/token、当前来源授权、AddEvent及commit做阶段成本测量，必要时原 `sqlite/recovery/guard.go` 做同Tx谓词合并验证。任何实际修改需Root新窗口；本085没有证明产品本身违反Spec性能合同，也未提出已足够的性能修复。3秒是history_test.go:27的夹具终止预算，区别于既有800 subject/250ms投递产品门。T05读取/授权、250ms/800门及其他历史断言继续只读保留，不凭当前结果扩大为全仓性能票。

## 产物与验证

所有七条命令为Go1.26.10、CGO_ENABLED=1、`go -C native/huhubot test -race -mod=readonly`，选单个完整原测试名、`-count=1`，完整参数与overlay绝对定位均保存在各原始日志。组结果汇总 03（历史日志已清理：`logs/03-groups-results.json`），事件原/诊断 06（历史日志已清理：`logs/06-events-results.json`），query对照 09（历史日志已清理：`logs/09-guard-query-results.json`），同插桩对比 11（历史日志已清理：`logs/11-events-observed-query-result.json`）。所有进程均实际subprocess.run返回/PTY最终Wait，未用包装器exit0冒充其中真实exit1。没有Node、真实Provider、模型、Obsidian、用户数据或keyring操作。

外部唯一 `[DEBUG-085]` 插桩仅保存在本任务probes与原始日志中，overlay执行结束后不挂接到后续命令；生产/永久测试没有debug代码。guard probe比较helper在首次运行前补当前subtest的testing.T参数，prepared SHA回执已注明并校正为实际执行字节，原生产候选未变。所有overlay原/替换逐文件SHA均可回读。首次return结构校验exit126仅因本节标题未用要求的“产物与验证”，已修文案并保留 13回执（历史日志已清理：`logs/13-return-first.json`），不当业务失败；后续实际return结果另记。自有原始红/绿保留，不修改081报告。

## 问题与下一步

只读诊断已交付、所有实验停止。群测试精确修复契约可交原owner实施；事件的deadline机制确证，但3秒只来自测试helper，Spec/T04未找到“270条必须3秒”的产品要求；应先量化-race、270事务与5ms轮询的成本再决定产品或测试lane处置，不把负向query候选冒称Ready修复。Root据此决定原owner最小维护窗口与后续独立审查，本报告不宣称T16/T13或Goal通过。
