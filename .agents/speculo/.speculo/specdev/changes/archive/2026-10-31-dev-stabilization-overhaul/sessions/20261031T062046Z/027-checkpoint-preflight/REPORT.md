# 任务回报

Session: 20261031T062046Z
Task: 027-checkpoint-preflight
Status: completed

## 聚焦交接

T05只读预检完成，没有生产写入或Go测试。建议保持单写连接，在base建立唯一可合并维护owner和提交前背压；成功COMMIT立即确立业务结果，后台维护错误不得反写为业务失败。发现portable两处直接事务入口及assistant删除后的同步TRUNCATE不在Ticket05写集，正式实施前需Lead精确扩围。严格固定WAL字节上限还必须限制单事务物理扩张，只有软高水位阻止后续事务不足以证明硬上限；报告给出最小验证路线而不假称尚未实测的VFS预算已可靠。T04/T06联合门仍未通过，T06的022失败及025修复边界保持；AC284缺Windows实际证据不能done。

## 产物与验证

### 已读事实与调用链

读取完整Ticket05、Spec AC283/284、ADR003、dev/testing、research合同、execution-boundaries、T04实际Store/Core停止代码与Evidence，022原报告及025 TASK。工作区沿用current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa；只写本REPORT，未碰T09八项与T16冻结候选。

- `native/huhubot/internal/adapters/outbound/sqlite/base/store.go:354`：db.Conn(ctx)→可选FULL→WithoutCancel事务→work→COMMIT→同一连接同步restartWALIfLarge(TRUNCATE)→恢复NORMAL→还连接。db最大/空闲连接均为1，autocheckpoint=0、NO_CKPT_ON_CLOSE开启。当前阈值4,096,000B，busy后restartAt=当前大小+阈值；只有尝试节奏，长读者持续写会持续增长。
- COMMIT成功后已不再根据ctx.Err改判失败，这是必须保留的已提交语义。新调度不能让队列满、maintenance错误、caller后来取消覆盖这一结果，也不能在worker中自动重放业务work。
- `base/durability_test.go`固定六屏障：usage.bound.Dispatch、effects.Store.ClaimDispatch、assistant.Store.Reserve/BeginDelete、purge.Store.BeginCleanup、purge.Sessions.Delete。FULL必须覆盖真正COMMIT并在还连接前恢复NORMAL；恢复失败仍丢弃坏连接，不把持久化事实撤回。
- `base/erasure.go:12`的EraseWAL是隐私同步要求，检查TRUNCATE返回busy/frames/checkpointed全部零，否则PROFILE_DB_CLEANUP_PENDING；purge/store.go:223与purge/sessions.go:245消费者不能被普通后台PASSIVE取代。
- `bootstrap/core.go:399`起先recovery.Stop、executor/inspection/probe/memory/producer drain，再收集/关闭provider，442调用CloseWithSync，最后释放Profile并发布finished。Store关闭当前为实际WAL Sync→db.Close，不做checkpoint。新maintenance须被该Store关闭owner收割；caller WaitClosed超时不释放DB/锁，不能发明独立无人等待goroutine。
- `base/checkpoint_test.go`现有4MiB节奏、pinned reader、Close不checkpoint、实际WAL同步接缝可复用；其中“每次提交后立即TRUNCATE”的旧断言需要按新维护owner改写，不应直接删掉机制覆盖。

### 两个必要消费者扩围

| 精确文件/入口 | 事实 | 最小所需变更 | Ticket05当前范围 |
|---|---|---|---|
| `native/huhubot/internal/adapters/outbound/sqlite/portable/store.go:338` BeginForPrincipal、`:642` BeginImport、`:572` transaction.Commit/`:600` Rollback | 两个Database().BeginTx直接写事务绕过WithinTx；Commit直接tx.Commit | 经base新增owned transaction lease取得同一准入/连接，Commit/Rollback释放一次、通知维护，保留import receipt与ctx语义；不能自动重跑整个import | 不在，需Lead批准 |
| `native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go:287` Mutate agents.delete | COMMIT后另持连接同步TRUNCATE且忽略错误 | 明确属于隐私清除还是普通维护：当前代码意图清除旧页，不能盲目改成可丢弃wake。建议通过base显式清除请求/状态保留义务，已提交delete结果仍不改写；如确需同步完成合同应由决定owner明确 | 不在，需Lead批准 |

生产搜索只发现上述两个BeginTx绕过口以及assistant独立checkpoint；其余Database直接使用主要为读查询。应新增窄消费者测试 `native/huhubot/internal/adapters/outbound/sqlite/portable/backpressure_test.go`、`native/huhubot/internal/adapters/outbound/sqlite/assistant/checkpoint_test.go`（均未创建，均需扩围）。若决定修改外部API/错误映射则另列实际消费者，不能借宽目录自行扩大。

### 最小方案：先把owner/提交语义闭合，再证明字节边界

1. **base唯一owner。** 新`maintenance.go`持有固定容量1的wake（重复请求合并）、一个worker、固定容量的准入等待槽Q、同一DB连接的独占事务lease、stopping/done与结果快照。无每次提交新goroutine、无无界请求数组、无第二条写连接。Q满在执行work之前返回可识别RESOURCE_LIMIT；等待caller取消只退出自己的准入，不停止worker。worker的待执行状态用dirty generation或单pending位，避免busy以后再无新写时永不重试。
2. **提交后不做维护。** 正常事务在COMMIT成功后只提交不可阻塞wake，完成NORMAL恢复/还连接后返回成功；worker取得原池的同一连接，在事务外执行checkpoint。维护错误另存owner；不得回传给已经成功的业务调用。WALHook仅可作为无错误、非阻塞通知，不能返回maintenance错误，因为hook发生在commit之后；最小实现可不引入hook，先统一所有事务出口。
3. **提交前背压。** acquire lease后且BEGIN/work之前检查真实WAL水位与maintenance失败状态；达到高水位则还连接、通知worker、在caller ctx/stop信号/容量变化上等待。不能持唯一连接等待维护。busy只表示读者阻挡，不提高水位；用有上限退避的单定时器重试，保持worker可唤醒。读者无限维持时拒绝/取消新事务是明确可用性代价，不保证持续写吞吐；旧已提交结果保持成功。NORMAL/FULL使用同一gate。
4. **软水位不是硬上限。** 当前`work(*sql.Tx)`可执行任意数量SQL，portable import也是大事务；BEGIN前size<H不能限制该事务超过H。即使COMMIT前检查，也可能已经spill到WAL，rollback不保证物理文件缩短。现无统一“每事务最大WAL页数”可证明常数；不得宣称H+一个未知事务等于配置硬上限。
5. **严格上限的最窄候选。** 若固定字节H是验收合同，建议先在base内部做独立小范围红绿验证：复用已锁ncruces vfs，将Store选定VFS的OPEN_WAL文件包一层WriteAt预算，在写前检查off+len溢出/超过H；连同增长Truncate/SizeHint/ChunkSize路径都不得扩张越界，返回SQLite FULL让未提交事务失败/rollback。只包WAL，主DB文件与原OS锁/共享内存保持原实现；不得用截断活WAL“纠正超限”。新Store启动已有WAL>H时只读恢复/清理并阻止增长，边界为max(打开时大小,H)，不能偷偷删已提交帧。结合第3项提前背压，底层预算只兜底单大事务/绕过写口；事务失败不触发自动业务重试。**这只是可执行验证候选，尚未证明driver错误传播、spill、恢复及Windows optional-interface语义；首个准入/预算probe不通过就不能发布硬上限结论。** 不建议引入新SQLite依赖或第二writer。若Lead选择只保证持续长读者下停止追加而非字节H，须明确修订这一验收口径，不能把它与硬上限混写。
6. **停止顺序。** Core仍负责先停业务/等待生产者，maintenance在这一阶段继续服务背压，不能因RequestStop先停worker导致recovery.Stop等写入永久自锁。Store.CloseWithSync进入唯一close owner后封新事务、唤醒准入等待者、等已准入事务和正在执行的checkpoint、停止定时器并join worker，再同步实际WAL、db.Close；重复Close等待同一结果。不强求停机TRUNCATE成功，否则外部长读者会把“安全刷盘退出”变为不必要死等。正常busy不算持久性失败；不可恢复维护I/O/调度异常保留并与实际sync/close错误明确归属，不能漏掉最后Sync。遇外部长读者把终态记账也背压时Core可能停留executionDrained=false，资源owner继续保留，不能绕过硬限或假称已完成；需读者释放/明确恢复，不能保证无限读者下有限停机时间。
7. **EraseWAL优先但不越界。** 使用同一maintenance/connection lease执行强制TRUNCATE，普通维护不能吞并其“必须清除”的完成条件；busy/取消仍cleanup-pending。清除未成不要删除其pending记录。若达到容量而删除本身仍需写新页，也要失败待处理而不是给privacy写入无上限豁免。

阈值/模式先保留为可测候选，测试可用小H制造边界；生产软阈值256KiB/4MiB及硬H需Windows结果决定，不以提高阈值掩盖问题。

### 红绿接缝与最小验证

| 场景 | 当前红灯/缺口 | 目标断言与真实接缝 |
|---|---|---|
| COMMIT后checkpoint阻塞/错误 | 调用者仍持连接等TRUNCATE | 在真实checkpoint调用前置gate；业务COMMIT与receipt已成功并返回；释放gate后worker处理；不额外执行work |
| 大量wake | 尚无调度 | 记录worker活跃数始终1、pending不超过1、准入Q有界；不以sleep/耗时证明 |
| 长读者+多次写 | restartAt不断上移 | 真实独立只读连接固定snapshot；水位触发后后续work尚未进入、ctx取消返回；文件不继续随新请求增长；释放reader后一次owner恢复，无饥饿/忙循环 |
| 单事务超大写/spill | 任意work可超过水位 | 真实WAL VFS size预算/commit-error回路，验证文件不越界、事务无receipt/业务半提交、旧记录可恢复；budget拒绝是提交前失败，不能影响已提交交易 |
| FULL六屏障 | 已有AST与runtime level测试 | 保留六调用点；门等待/维护后FULL→COMMIT→NORMAL，FULL错误和NORMAL恢复失败覆盖；外部effect不能越过实际FULL完成 |
| privacy erasure | 现强TRUNCATE | 实际canary在WAL中；pinned reader使cleanup-pending，释放后TRUNCATE且canary消失；不能只断言被调用 |
| stop/维护并发 | 新worker生命周期未知 | gate住checkpoint及实际WAL Sync；close/WaitClosed观察超时后worker仍owned，Profile不可先释放；放gate后按顺序退出，无残留任务，错误仍收割 |
| portable/agent consumers | 当前绕过base | 实际import超水位未开始/可取消，Commit只通知一次；删除清除义务有证据，不能回退同步错误改写成功 |

预计修改（均在原Ticket05写集）：`base/store.go`、`base/erasure.go`、新增`base/maintenance.go`、`base/maintenance_test.go`、`base/wal_budget.go`与`base/wal_budget_test.go`（严格预算候选通过才保留）、`base/checkpoint_test.go`、`base/durability_test.go`、新增`base/storage_measurement_test.go`、`.github/workflows/huhubot-storage-windows.yml`、`docs/huhu-bot-performance.md`、`docs/e2e/dev-overhaul/storage/**`。optional transaction lease辅助可落`base/transaction.go`。bootstrap/core.go和purge生产文件保持只读；若现有stop接缝不能覆盖联合生命周期，最小新增`native/huhubot/internal/bootstrap/checkpoint_stop_test.go`需另批，不能先写。

先定向base红绿，再portable/assistant批准测试；之后相关purge、bootstrap/foundation既有合同只读运行。最终Lead按Ticket执行pnpm check:huhu-bot与bench；不在预检重复全量/T09。

### 分阶段测量与Windows候选

连接等待：从请求db.Conn到取得，另计准入gate等待，不能把两者合为SQL时间。事务work单列；COMMIT只包tx.Commit。FULL屏障包括FULL切换、其COMMIT及恢复NORMAL分别记录，COMMIT是FULL总时段的子项，不能叠加当总时间。checkpoint以worker取得连接后真实PRAGMA/Raw WALCheckpoint调用区间计，另列模式、busy/log/checkpointed、实际WAL前后/峰值；同步WAL使用CloseWithSync的实际os.File.Sync接缝，db.Close另计。低层预算wrapper可观测真实Sync/WriteAt，但不省略实际系统调用；统计固定桶/有界ring，避免每SQL无限存样本。wall-clock、CPU、WAL逻辑长度/分配空间、durability Sync次数分别解释。

新Windows workflow仅workflow_dispatch、contents:read、指定github.sha，沿仓库现有actions/setup-go@v6与Go1.26.10；固定GOWORK=off、相同wasm driver，不修改通用huhu-bot.yml。单worker串行矩阵：PASSIVE/RESTART/TRUNCATE × 256KiB/4MiB × 无reader/固定长reader/reader释放；普通NORMAL与FULL混合批量固定输入，记录吞吐p50/p95、读者等待、FULL时段、WAL逻辑与磁盘占用、清理Sync、重开恢复时间及记录校验。故障恢复只杀本job直接拥有的子进程，临时目录等真实退出后删除。测试失败/超时也上传原始JSON/log与环境；不靠提高timeout当优化。候选参数仍待实测，不将PASSIVE不等待读者等同Windows底层I/O有硬时间界。

此处只有方案，没有workflow文件，也未触发远程CI。Windows job确实执行并形成可回读表之前AC284保持待验收。T09的50/100/200现有基线冻结；比较至少固定同一模型的before/after I/O调度，再固定同一I/O配置的before/after T10模型，最终组合另列；禁止把两改动混在同一对照后都宣称收益。

### 外部核验、复用与限制（2026-10-31）

先读本仓与已锁依赖，研究缺口限定在checkpoint忙语义、硬WAL边界与现driver接缝。没有复制外部代码或引入依赖。

- [SQLite WAL并发/性能](https://www.sqlite.org/wal.html#concurrency)：长读者可阻止checkpoint推进；据此推导“无限长reader+持续写+固定WAL硬上限”不能三者同时无限满足，必须提交前背压。这是项目设计推论，官方材料不替本仓证明实现。
- [官方checkpoint模式](https://www.sqlite.org/c3ref/wal_checkpoint_v2.html)：PASSIVE不调用busy handler，RESTART等待可复用，TRUNCATE还缩至0；用于设计测量候选，不提前选赢家。[journal_size_limit](https://www.sqlite.org/pragma.html#pragma_journal_size_limit)约束checkpoint后保留文件，不能当活跃长读者硬限。
- 已锁[ncruces v0.35.6 config.go](https://raw.githubusercontent.com/ncruces/go-sqlite3/v0.35.6/config.go)提供WALCheckpoint、提交后WALHook；[vfs/api.go](https://raw.githubusercontent.com/ncruces/go-sqlite3/v0.35.6/vfs/api.go)提供File.WriteAt/SizeHint/Truncate及SQLite错误返回接缝，支持预算probe但不证明包装兼容性。只复用已有API设计，未抄实现。
- ncruces [v0.35.6许可](https://github.com/ncruces/go-sqlite3/blob/v0.35.6/LICENSE)明确MIT；[发布页](https://github.com/ncruces/go-sqlite3/releases/tag/v0.35.6)维护活跃，GitHub API实际读取published_at为2026-09-23T14:34:11Z，满足近两年。web工具API入口报不可访问，后用Python urllib只读原API成功，未将初次失败隐去。SQLite[官方版权说明](https://www.sqlite.org/copyright.html)为public domain。本轮借鉴设计，不新增许可文本或代码依赖。
- 未选另一个SQLite driver/异步数据库库：当前ncruces已满足单连接checkpoint/VFS接缝，换driver或第二writer违反范围且无法自动解决长读者容量矛盾。无需为“比较”新增无目的依赖。

实际验证仅只读rg/sed/源码追踪、官方来源查询与GitHub发布元数据；未运行Go或新性能测量。所有设计/红绿目标均标为拟实施，不冒称已证明。

## 问题与下一步

Lead先固定T04/T06联合合同并批准两消费者及必要窄测试扩围，再派正式实施。必须决定“固定字节H”是否为硬合同；若是，先做真实WAL预算/rollback/重开probe，不以软阈值替代。assistant agents.delete的既有截断义务应明确记录后迁移，不静默变成可丢弃通知。Windows尚无实际结果，AC284不能done。本报告结束停写；按Lead安排先处理028与029两个验收窄修，保持T06未参与实现者身份供后续复审。
