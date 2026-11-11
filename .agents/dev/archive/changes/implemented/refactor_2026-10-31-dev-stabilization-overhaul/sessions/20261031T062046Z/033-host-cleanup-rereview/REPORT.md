# 任务回报

Session: 20261031T062046Z
Task: 033-host-cleanup-rereview
Status: completed

## 聚焦交接

T06第二版固定候选独立复审完成，两轴pass；022的S1/S2均已关闭，旧request-changes报告不改。实际核对10文件、9来源、原tracked diff及完整输入摘要，确为四项变化、六项不变。亲跑27项窄控制及022原只读探针，确认失败保留、停止执行一次、真实session reservation拒绝重开。仅写本REPORT并停写；本结论不替Lead最终构建、真实TS↔Go或T04/T06联合门放行。

## 产物与验证

### 固定输入与独立性

- Reviewer：native:/root/sources；实现者native:/root/bundle；Astra low。没有参与T06任何实现/修复，没有产品/测试/Git写入，也无递归代理。
- current/dev，base/实际HEAD均`86c500556db1d64865c4cc7f1aff1dd83de071fa`。
- 输入`evidence/T-06.md#review-input-r2`：`976e93e7ef64dfe98a130eb269166c9727675c9f1d6477e2773708f0cc95ace8`。Node读取原JSON、SHA256逐项检查文件字节、用readArtifactSectionSync提取来源section、执行原tracked_diff_command核对摘要，退出0。
- 四个变化文件：runtime/client-runtime.ts、runtime/client-runtime.test.ts、transport/managed-session.test.ts、transport/runner.test.ts。六个未变文件：transport/managed.ts、managed.test.ts、managed-stop.ts、managed-stop.test.ts、credentials-runner.test.ts、services/events/runner.test.ts。九个来源对象与第一版逐项一致（JSON数组完整比较为true），非只比较文件数量。
- 完整Ticket06及AC281/282、ADR002、T04已验收合同、dev/testing、AGENTS/execution-boundaries复用022已读且本次哈希相同的规范。读取025完整报告、新代码/新增测试/现役module调用链，未以作者报告替代实际实现。T09八项完全冻结；T16及027/028/029/034不属于本轮源码范围。

### 实际执行与证据归属

1. `pnpm exec vitest run src/modules/huhubot/platform/desktop/runtime/client-runtime.test.ts src/modules/huhubot/platform/desktop/transport/managed-stop.test.ts src/modules/huhubot/platform/desktop/transport/managed-session.test.ts`：本review亲跑退出0，3文件27测试，781ms，Linux/Node26.11.1/Vitest5.0.3。
2. 从022 REPORT直接提取原`node --input-type=module`探针代码，以Python subprocess输入Node执行当前源码，退出0。没有重写探针断言/行为来适配修复。真实runtime、managed session、managedStop及reservation执行；仅物理进程/HAP/安装环境替身。实际输出：

```json
{"scenario":"settled refresh cleanup failure","error":"HOST_DISPOSE_FAILED","stopOutcome":"HUHUBOT_STOP_FAILED","state":"failed","shutdownCalls":1,"cleanupCalls":1,"exited":true,"reopen":"HUHUBOT_RECOVERY_REQUIRED"}
{"scenario":"sync reconnect cleanup failure","error":"HOST_CLEANUP_FAILED","stopOutcome":"HUHUBOT_STOP_FAILED","state":"failed","shutdownCalls":1,"cleanupCalls":1,"exited":true,"reopen":"HUHUBOT_RECOVERY_REQUIRED"}
```

3. 源码差异与调用路径只读核对：ownCleanup/finishHost、refresh前后动态inactive、reconnect/start catch/自然退出/stop四条结束路径、managed.stop的retainUntil与reservation删除条件。旧六项未变的EOF/四阶段/exit/forced/路径claim合同沿用022已检查结论。
4. 025作者真实desktop+events为11文件67测试0（25.99s），最终动态inactive等价类型修正后另有27控制/类型/lint0；此为作者来源，不冒称本review重跑。Lead会做最终真实链与构建；本轮没有无理由重复Go构建/全量、没有真实Obsidian或Windows/macOS证据。

### S1/S2关闭依据及交错检查

- **S1已关闭**：client-runtime.ts:100起hostWork按session保存原disposer promise；:106先建立Promise再异步调用，使同步throw与异步reject均作为同一失败保留。refresh的旧disconnect虽清空、hostRefresh虽finally清空，但原清理结果与refresh结果仍在owner集合；finishHost:119读取完整集合并以失败reject hostDone。managed.ts原:358成功分支await ownerCleanup，拒绝后进入claim.failure，不删除reservation。已完成refresh同步/异步失败控制用例及真实runtime+session reservation测试通过，原探针也不再允许重开。
- **S2已关闭**：obsolete分支先调用stopOwned，随后Promise.allSettled等待processStop与finishHost；同步cleanup改由Promise回调执行，不能在构造Promise.all参数时抢先抛错。pendingSession直到两个结果结算才清掉，stops保留同一个promise供后续stop观察；held exit测试先得到STOP_OBSERVATION_TIMEOUT，释放exit后得到failed，二次launch未发生。原探针shutdown从0变为1，exit已结算且recovery-required。
- **重复disposer与后继覆盖**：ownCleanup在调用前缓存completion，多条finishHost/refresh/自然exit路径共享该wrapper；重复调用返回同一结果而不再执行函数。hostWork保留失败，后继成功不会覆盖；hostDone是一次性Promise，finishHost收齐在途refresh与原owner清理再结算，没有先resolve后试图补reject的路径。意图性观察取消可被忽略，但原disposer的拒绝仍在hostWork中，不被同名取消错误抹掉。
- **晚到与自然退出**：初次onConnect返回后立即包装，disposed/closed检查失败时独立启动stopOwned并等待finishHost。refresh在await前后动态检查当前session/closed/disposed；晚到新Host先执行其ownCleanup再退出。自然退出保留session、清空disconnect后调用finishHost，后续stop/reconnect仍引用旧owner；同时启动的finishHost共享已缓存disposer，先等hostRefresh再收集新增结果。当前代码没有让finishHost作为hostRefresh自身的内部等待项，未见自等待循环。
- **进程与Host gate**：stop同步disposed/abort阻止新工作，startPromise收割晚到launch；只有await所有stop结果与Host结果后才closed。上述失败分支不伪造closed或释放reservation。managed failure仍要求显式恢复；模块普通停用重启不是已验证恢复。

<a id="original-standards-output"></a>
## 标准轴原始输出

Reviewer: native:/root/sources
Axis: standards
Result: pass
Input-SHA256: 976e93e7ef64dfe98a130eb269166c9727675c9f1d6477e2773708f0cc95ace8
Observed: 独立核验四改六不变与九来源；亲跑27控制和022原探针全部达到修复目标。S1失败归属与S2进程owner丢失均已关闭，在固定范围未发现新增阻塞问题。

依据dev生命周期/错误归属规则，修复维持单一停止owner并收集同步/异步Host失败；新的包装没有修改业务数据或公共协议。跨runtime回归使用真实createBotRuntime+launchManagedBotSession+managedStop+reservation，未用一条mock错误字符串代替资源占有断言。实际Go新增sync/async场景的finally仅操作自有transport，等待真实退出后才让原fixture删除目录；无固定TERM/KILL升级或时限放宽。UI、恢复API、共享生成物未扩范围。022已核查且哈希不变的六项结论继续适用，旧失败原文保留。

<a id="original-specification-output"></a>
## 规范轴原始输出

Reviewer: native:/root/sources
Axis: specification
Result: pass
Input-SHA256: 976e93e7ef64dfe98a130eb269166c9727675c9f1d6477e2773708f0cc95ace8
Observed: 按完整Ticket06、AC281/282、ADR002及T04合同核对，S1/S2反例不再违反Host完成与唯一owner要求；caller timeout只结束观察，失败reservation不自动重开，固定候选符合本票行为范围。

AC281的释放条件保持四阶段成功+正常child exit+Host清理成功；即使Go事实完整、code0，Host失败仍使runtime failed与recovery-required。AC282重复stop、晚到onConnect/refresh、closed HAP重连和同步/异步清理错误通过统一owner收敛，不重复disposer或漏掉进程停止。未改变NORMAL/FULL、T04生产者、隐私边界或失败恢复政策。未把此规范审查通过写成Windows/Obsidian实测或联合E2E完成；T33呈现与明确恢复边界仍沿原票，Lead负责最终集成门。

## 问题与下一步

无本次发现的阻塞项。报告停写交Lead验证派遣/回收和候选摘要，再按原子集成门完成最终构建及真实TS↔Go；本报告不修改正式Evidence/Ticket状态，不覆盖022的request-changes历史。
