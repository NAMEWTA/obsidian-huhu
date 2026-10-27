# 043 持久事件与当前权限投递实现报告

Session: 20261025T043239Z
Task: 043-events-implementation
Status: completed

## 聚焦交接

交回 T04 Go 持久事件、快照恢复，以及原 T05 owner 范围内的当前 read / 到期 / 撤权投递 fence 候选。公共 Facade 已由 042 实际装配本 Service / SQLite Store，生产 stdio 出队使用同一 `WithDelivery`；不是未被消费的内部 helper。执行身份为 native `/root/credential_provider`，沿用已读 dev / SpecDev I 与 LOG066 授权，未再委派、提交、推送或发布。起始 Map11 / Goal10 后，Root 为实际物理输出与精确 message provenance 维护登记到 Map13 / Goal12；本作者不写正式状态。

本轮精确写集为 6 个生产文件及 8 个测试文件，最终逐文件 SHA 在下表和 [source-snapshot.json](logs/source-snapshot.json)。未写公共 API / schema / stdio / bootstrap、SQL 迁移、Host sources/read、凭证或 Go 锁；这些接缝由原 owner 042 维护并参与联合输入。旧 003 / 005、go.mod/sum 和历史 034 报告与本轮起始摘要一致。Map / Goal / T04 Ticket 的合法维护变化在 [final-input-sha.json](logs/final-input-sha.json) 明示，未把它们误报成“全部输入未变”。

生产和测试已停写。联合全 Go 首轮发现旧大序号夹具直接跳 head、遗留中间缺口；仅在同夹具事务平移既有 accepted seq 和 head，保持合法连续后缀，原精度 / 重开断言转绿，未放宽产品 gap 校验。随后并发五包 race 及单独 events race 的 800 subject 均触发 250ms 时限；保留红灯后，Root 仅打开 events/store.go 与 history_test.go 最小窗口，先同事务缓存重复 Run 原始读取、再按有界集合批取 message provenance 并消费 042 唯一 Run batch helper，但 race 仍因重复 profile metadata 超时；Root 最后打开原 T05 私有批检查窗口，消除同事务内重复 metadata 查询，逐消息当前授权不省略，重新停写，最大门普通 / race 转绿，详见下文。所有本作者启动的命令已返回；真实 Node / Go child、stdio worker、pipe fixture 均有 Wait 和关闭路径。联合检查的最终记录在下文单独注明执行者。候选仍待 Root 固定输入及未参与实现者双轴审查，本报告不是正式 Ticket 接纳。

## 产物与验证

`application/execution/events` 只消费唯一 API DTO。Tail 每次从数据库短事务读取并授权，50ms 重查只负责等待，不依赖 wake；取消或关闭订阅只停读，不取消 Run。每 connection/principal/Run 最多一个等待 Tail、全局最多 128 个；等待 0..1000ms。序号使用 canonical 非负 int64 十进制字符串，每个 Run 独立，拒绝非规范 / 超界 / future cursor，不经过 JS Number。

页默认 64、最多 128 个事件，默认 64KiB、最大 512KiB，按完整 JSON 编码字节预算；`nextSeq` 只指实际装入页的最后事件，不跨过被预算挡住的事实。单项过大明确 RESOURCE_LIMIT。SQL 检查保留日志的 min/max/count 连续性及末尾 head，逐行再核对 seq，缺口不被压缩掩盖。终态通常保留末 256 项，只压缩可从持久 Run / messages 准确重建的连续前缀；active 不压缩，含未知 / ledger facts 的 Run 不继续自动压缩。

Snapshot 与 snapshotSeq、Run、该 Run messages 和 facts 在同一 SQLite 事务读取，先关闭 rows 再发下一查询，不嵌套调用独占单连接的应用服务。active pendingText 仅连接 `text/delta/token/text.delta/chunk`；终态以持久 messages 为准。pendingText 上限 256KiB，完整恢复上限 512KiB，facts 上限 128，超限明确错误、不截断假快照。`RunSnapshot.events` 为必需数组，保存不能由 Run/messages/text 重建的 retained facts，seq≤同事务 snapshotSeq。已压缩普通终态之后追加 reconciled fact 时，旧 cursor 的 CURSOR_EXPIRED 恢复也包含该 fact，不会直接跨 seq 永久跳过。仅授权成功的压缩事务才提交，CURSOR_EXPIRED 在提交后返回。

当前权限投递使用同一个 grants Store gate：Grant Create/Revoke 持 gate 到 SQL commit；stdio 出队先取得 gate，在短事务重读 profile/owner、当前 read 和真实 expiry，关事务后才同步调用物理 writer。permit 总长不超过 250ms，且不超过每份来源所需有效 read coverage / parent Grant 的最早到期；替代有效 Grant 不被无关到期项误杀，不以 Grant clock 代替当前到期检查。callback 必须在底层 IO 已停后才返回，permit 释放顺序由 042 的实际输出 adapter 执行；SQL 不跨 pipe 等待。

`DeliverySubject{kind,id}` 仅由服务端构造。run 检查实际持久 effective provenance；message 从 DB 重取该 message 的 source_json、所属 Run / session / principal，仅保留这些来源关联的 scope，不拿整个 Run effective sources 误拒合法子集。原 T05 `FilterHistory` 同样通过 `HistoryReadInput` 裁剪 scopes。source-free 消息仍验证真实归属，批读也不豁免外人、缺失或错 Profile。内部最多 800 个去重 subject，对应 batch8×page100，仍共用一个 250ms 总预算，不扩大协议页 / frame。前端不能提交 provenance 代替持久事实。同一个短事务以 ≤800 ID 的参数化 IN 查询批取每条 message 的持久 source_json，缺项明确 MESSAGE_NOT_FOUND、坏 JSON 明确 MESSAGE_CONTEXT_INVALID，返回前关闭 rows；Run / session owner、profile、recipient / effective context 由 042 唯一 `execution.ReadAccessBatchInTx` 批读并沿用单读 decoder / ACL。所得 map 仅当前事务使用，每个 subject 仍独立 `HistoryReadInput`；`ReadDeadlineBatchInTx` 在当前事务验证真实 profile 一次并逐项匹配 ProfileID，逐项调用原私有 read/deadline 逻辑（含 Validate、recipient、Grant、parent、当前 wall clock、coverage / expiry 和 ctx 取消），仅省掉不可变化的 metadata 重查。公开单读 `CheckInTx` / `ReadDeadlineInTx` 保持原路径，不接受外部跳检查标志。只按值窄化输入并新建 Scopes，不回存窄化结果、不跨请求缓存资格。新增同组“合法 message 在前、撤权 whole Run 在后”仍整体拒绝，防止窄化污染原始 cache。

永久行为入口与实际证据：

| 文件 / 入口 | 验证范围 |
|---|---|
| `events_test.go`：`TestDurableTailUsesDeliveredCursorAndBoundedPages`、`TestTailPollsDatabaseWithoutWakeAndCancellationDoesNotCancelRun` | delivered cursor、有限页、重复读取、无 wake 新增、取消读不取消 Run |
| 同文件 `TestSnapshotSequenceAndTextComeFromTheSameTransaction` | 24 次实际 WAL 并发追加与 snapshot 一致 |
| 同文件 `TestCursorRecoveryCompactsOnlyReconstructibleTerminalPrefix`、`TestTerminalLedgerFactsAreNotCompactedOrAppendedToBody`、`TestTerminalCompactionCannotHideAMiddleLogGap` | 过期恢复、先压缩后晚到 fact、ledger 不当正文、真实 middle gap 保留错误 |
| 同文件 `TestEventCursorValidationOwnershipAndGapAreExplicit`、`TestPageAccountsForJSONEscapingAndSnapshotRejectsOversize`、`TestRunSequencesStayIndependentAboveJavaScriptIntegerRangeAndSurviveReopen` | malformed/future/profile/principal、JSON 控制符预算、超量 snapshot 不删除 active 事实、>2^53 及重开/小 Run 独立 seq |
| `delivery_test.go` 四项 | 查询后撤权、无 clock 变化自然到期、撤权 commit 排队在物理发送后、250ms permit 取消并释放；callback 内同 DB 查询证明未持 SQL 事务 |
| `writer_test.go` 三项 | 真 stdio / net.Pipe：正文及 CURSOR_EXPIRED details 查询后排队撤权；排队到期；五个编码大页超过 2MiB 队列字节、未满 32 slots 即关闭并 Wait，不靠之后 1s 物理写超时 |
| `pipe_linux_test.go`：`TestActualOSPipeStopsBeforeExpiredPermitReturnsAndRevokeCommits` | 真 os.Pipe 填满跨到期，物理 Write 已返回后才允许 Revoke commit；drain 旧内核 buffer 后无额外字节，server Wait |
| `history_test.go` 三项 | 11 个实际 Facade Run / 22 message 的真实 history 出队，>8 合法；排队撤一 Grant 整旧响应拒绝、重查合法 source-free 子集保留；message 精确来源及同组 cache 不污染；400 实际 Run / 800 message subject 的单 gate 合法上界与最后一项外人消息拒绝 |
| `access_test.go`：`TestHistoryReadKeepsOnlyScopesRelatedToMessageProvenance` | 撤销无关旧 scope 不隐藏合法该消息正文；撤该消息所需 scope 后隐藏整条，plain 保留 |
| `access/delivery_test.go`：`TestBatchReadDeadlinesPreserveSingleChecksAndRejectMixedProfiles` | 真 SQLite 同事务批单等价 8 子例：plain/source、混合 Profile、无效 source、接收方变化、撤权、到期、父撤权、有效替代 Grant；另独立错 Profile 参数拒绝 |
| `ts_test.go`：`TestActualTSClientConsumesDurableGoEventsSnapshotsAndLateFacts` | 生产 TS EventClient/reducer/HapConnection/HostReadService ↔ 实际 Go bootstrap/stdio/SQLite 子进程；详见下一段 |

TS 联调用 inline esbuild fixture，不新增 Node 生产入口；`TestEventsRunnerProcess` 为 opt-in Go child helper。真实链验证 Unicode `甲😀\n乙`、duplicate、snapshot、late ledger、BigInt，且 big Run 仍 attached 时读取更小 seq 的 private / hold Run，证明各 Run 不互比 seq；source Grant 先授权正文后通过实际公开 Revoke 或自然到期，下一次 refresh 的真实 Go 安全错误清除 pendingText / messages / facts 正文，保留终态。dispose 后公开 GetRun 仍 running，另一个实际 Run 释放受控 Engine 后正常终结。

同一链还通过公开 Facade StartRun → 同一 Broker Tools.Invoke → Checkpoints.Publish 真实等待、公开 Approval.Resolve → 同 Executor.Resume / checkpoint 打开 → succeeded，以及公开 Cancel → canceled。首次真实链捕获 `approval.pending` 被误当 Run 状态的生产缺口：Go waiting_approval 但 TS projection 仍 running（[13 红灯](logs/13-actual-ts-go-approval-first.log)）。042 修复同事务 ledger `approval.pending(status pending)` + bare `waiting_approval`、Cancel bare `canceled` 后，同消费断言 11 项全部 true（[14 绿灯](logs/14-actual-ts-go-approval-green.log)）；ledger 自己的 committed 等状态不覆盖 Run 终态。

上述 TS 链为真实生产模块 / Go 服务链，外部 Engine、HostSources 和 NoteWritePort 是有限受控替身；大序号及 late ledger 用明确测试 SQL 构造。它不是发行 CLI 的真实模型 / Vault / Obsidian 现场验收。Node finally 关闭服务与 transport，等待 Go child exit0 / stderr 空；超时 kill fallback 视失败，父 Go `cmd.Run` 等待 Node 退出。

实际命令除注明外在 `native/huhubot`，工具链 `GOTOOLCHAIN=go1.26.10`、`-mod=readonly`、定向常规使用 `CGO_ENABLED=0`。日志保存完整命令与 exit；下表不把中途旧输入的有限套件误称最终全部通过。

| 命令 / 输入 | 实际结果 |
|---|---|
| `go test -mod=readonly ./tests/contract/events -run TestDurableTailUsesDeliveredCursorAndBoundedPages -count=1` | [01](logs/01-facade-red.log) exit1 为测试未用 import 编译准备错误，不算行为红灯；[02](logs/02-facade-behavior-red.log) exit1 为实际 Facade.Events 未装配行为红灯 |
| `go test -mod=readonly -v ./tests/contract/events -count=1` | 首批 [03](logs/03-facade-first.log) exit0 / 0.923s；扩展快照后 [05](logs/05-events-boundaries-green.log) exit0 / 0.972s，均为当时测试集合 |
| `go test -mod=readonly -v ./tests/contract/events -run '^TestCursorRecoveryCompactsOnlyReconstructibleTerminalPrefix$' -count=1` | [04](logs/04-late-ledger-recovery-red.log) exit1，旧 snapshot 无 late fact；修复后包含在05及14绿 |
| `go test -mod=readonly -v ./tests/contract/events -run '^TestActualWriter' -count=1` | [06](logs/06-actual-queue.log) exit0 / 0.571s，实际排队撤权 / 自然到期 |
| `go test -mod=readonly -v ./tests/contract/events -run '^TestActualOSPipe' -count=1` | [07](logs/07-actual-os-pipe.log) exit1 是断言只接纳 context 而未接纳实际 os.ErrDeadlineExceeded；仅扩大正确 deadline 错误识别后 [08](logs/08-actual-os-pipe-green.log) exit0 / 2.133s，buffer65536<完整 frame，之后无新字节 |
| `go test -mod=readonly -v ./tests/contract/events -run '^TestActualTSClient' -count=1` | [09](logs/09-actual-ts-go-first.log) exit0 / 1.311s 初始链；[10](logs/10-actual-ts-go-private.log) exit0 / 2.335s 加真授权；[13](logs/13-actual-ts-go-approval-first.log) Go exit1 / Node126，真实 Broker 状态红灯；同输入修复后 [14](logs/14-actual-ts-go-approval-green.log) exit0 / 2.250s，11 观察 true |
| `go test -mod=readonly -v ./tests/contract/events -run '^TestActualHistory|^TestMessageDelivery' -count=1` | [11](logs/11-history-provenance.log) exit0 / 0.326s |
| `go test -mod=readonly -v ./tests/contract/access -run '^TestHistoryReadKeepsOnlyScopesRelatedToMessageProvenance$' -count=1` | [12](logs/12-history-scope-old-behavior-red.log) 自有隔离副本恢复旧 whole-scope 赋值的受控反例 exit1，不声称未改基线；当前 [16](logs/16-access-history-scope-green.log) exit0 / 0.025s |
| `go test -mod=readonly -v ./tests/contract/events -run '^TestMaximumEightHistoryPagesDeliverySubjectsFitOneBoundedGate$' -count=1` | [15](logs/15-max-delivery-subjects.log) exit0 / 3.453s；400 实际 Run、800 持久消息授权仅 70.749065ms<250ms，最后外人消息 writer0（最终测试另加最后 missing message 同样 writer0）。运行与 Root build/lint CPU 窗口重叠但仍通过，未据此虚构吞吐基准或放宽预算 |
| `go test -mod=readonly -v ./tests/contract/events -run '^TestTerminalCompactionCannotHideAMiddleLogGap$' -count=1` | [17](logs/17-gap-before-retention-red.log) 自有隔离副本用先前043 store 的受控反例 exit1；当前 [18](logs/18-gap-before-retention-green.log) exit0 / 0.065s |
| `go test -mod=readonly -v ./tests/contract/events -run '^TestRunSequencesStayIndependentAboveJavaScriptIntegerRangeAndSurviveReopen$' -count=1` | 042 联合 allGo 首轮因旧 fixture 真 gap 失败，原 [19-all-go](../042-approval-implementation/logs/19-all-go.log) 保留；仅修测试连续后缀后 [19](logs/19-bigint-fixture-green.log) exit0 / 0.029s，产品未改 |
| `go test -mod=readonly -v ./tests/contract/events -run '^TestMessageDeliveryUsesItsOwnPersistedSourceSubset$' -count=1` | 缓存修复后的原子 provenance 反例 [23](logs/23-cache-provenance-green.log) exit0 / 0.035s；精确两文件前后 SHA 在 [22](logs/22-cache-repair-before.json) / [24](logs/24-cache-repair-after.json) |
| `go test -mod=readonly -v ./tests/contract/events -run '^TestMessageDeliveryUsesItsOwnPersistedSourceSubset$' -count=1` | 最终批读消费后 [26](logs/26-batch-provenance-green.log) exit0 / 0.030s；保持 mixed message/Run 当前授权与 cache 隔离断言 |
| `go test -mod=readonly -v ./tests/contract/events -run '^TestMaximumEightHistoryPagesDeliverySubjectsFitOneBoundedGate$' -count=1` | 最终批 metadata 方案 [28](logs/28-max-batch-deadline-normal.log) exit0 / 3.130s，实际 gate 6.764491ms；800 subject / 250ms 原断言、foreign-last 与 missing-message writer0 均保留 |
| `CGO_ENABLED=1 go test -mod=readonly -v -race ./tests/contract/events -run '^TestMaximumEightHistoryPagesDeliverySubjectsFitOneBoundedGate$' -count=1` | [29](logs/29-max-batch-deadline-race.log) exit0 / 21.000s，实际 gate 105.477891ms，无 data race；不是抬时限、改断言或 race 跳测试 |
| `go test -mod=readonly -v ./tests/contract/access -run '^TestBatchReadDeadlinesPreserveSingleChecksAndRejectMixedProfiles$' -count=1` | [30](logs/30-batch-single-equivalence.log) exit0 / 0.030s；之后仅加 batch ctx.Err / 测试非Fault诊断，最终受影响套件验证该最终输入 |
| `node scripts/verify-huhu-bot-architecture.mjs`（repo 根） | [20](logs/20-architecture.log) exit0，38 production files |
| `gofmt -w <本轮精确写集>`、`git diff --check`（repo 根） | 命令均 exit0；最后仅 big seq 测试再 gofmt。初次路径错 cwd 的格式命令已在正确根目录补执行，不算代码行为红灯 |

联合检查故障保留与收敛：042 首次全 Go 仅上述 BigInt 夹具 gap 失败；修夹具后的全 Go r2 已 exit0。五包并发 race 无 data race，但 800 subject 门 250.959665ms 超固定 250ms（[22](../042-approval-implementation/logs/22-joint-race.log)）；控制变量为独立 events race 仍 251.149488ms（[26](../042-approval-implementation/logs/26-events-race-isolated.log)）。首个同 Tx Run cache 修复后独立 race 仍 251.115ms（[28](../042-approval-implementation/logs/28-events-race-r3.log)），没有靠重跑或改预算掩盖失败。

只读成本分析：800 message / 400 Run 在首个 cache 后仍约 2801 次 SQL（profile1、message800、Run各 metadata/read/session1200、每 subject metadata800）。Root 接受有界批读方案；043 精确两文件批 message，042 原 T03 新 `execution/delivery.go` 和 `store.go` 复用 decoder / owner ACL，中间 r4 降为常数项 batch + 800 次逐 subject 当前 metadata 检查，但 r4 race 仍 250.720647ms 超预算（[33](../042-approval-implementation/logs/33-affected-race-r4.log)）。最后 Root 放行原 T05 access.go 私有 helper 与 delivery.go / events/store.go：只去除同事务内重复不可变 metadata，逐 input 先核真实 Profile 一致，其他当前检查不缓存。无来源路径约 4 查询，最大 gate normal 6.764491ms、race 105.477891ms 双绿；有来源例仍完整验证每项当前 recipient / Grant / parent / expiry。没有新增 wire/API/schema/锁或扩大功能。

最终联合 r5 由 **042 实际执行并 Wait**，本作者完整回读日志 / 摘要，不冒称自己运行。139 文件联合输入 SHA `c0950eccd0d2395833ef71a9b726b58cf3f5a1d53159985550a35df26f077b2e` 固定在 [joint-source-r5.json](../042-approval-implementation/logs/joint-source-r5.json)，与本作者最终 14 文件一致。最初 136 文件 `5c9bcc68...` 和中间 r2/r3/r4 不当作最终输入。

| 042 最终命令（cwd `native/huhubot`） | 实际结果 |
|---|---|
| `go test -mod=readonly -p=1 -v ./tests/contract/approval ./tests/contract/chat ./tests/contract/access ./tests/contract/events -count=1` | [38](../042-approval-implementation/logs/38-affected-r5.log) exit0；approval1.376s / chat1.199s / access1.435s / events9.591s；最终 800 gate 6.115088ms，missing / foreign / mixed provenance 断言均运行 |
| `CGO_ENABLED=1 go test -mod=readonly -p=1 -race -v ./tests/contract/approval ./tests/contract/chat ./tests/contract/access ./tests/contract/events -count=1` | [39](../042-approval-implementation/logs/39-affected-race-r5.log) exit0；approval9.154s / chat5.622s / access6.955s / events35.867s；最终 800 gate108.12745ms<250ms，无 data race；真实 OS pipe、TS 11 观察、scope / batch 当前权限等同输入全绿 |
| `go vet -mod=readonly ./internal/adapters/outbound/sqlite/execution ./internal/adapters/outbound/sqlite/events ./internal/adapters/outbound/sqlite/grants ./internal/application/tooling/broker ./tests/contract/approval ./tests/contract/chat ./tests/contract/access ./tests/contract/events` | [40](../042-approval-implementation/logs/40-vet-r5.log) exit0 |

命令/exit/耗时汇总见 [41-r5-checks.json](../042-approval-implementation/logs/41-r5-checks.json)。042 先前 r2 全 Go / vet 及未受影响 foundation race 按影响复用；它先前五目标 CLI 编译成功，最后共享 Go 内部收敛后未重发资产，不拿编译代替目标 OS 现场 IO。Root 的全插件 build/lint 已实际 exit0、1814 项 TS/schema/工程输入前后不漂移，证据 `evidence/T-04-logs/lead-ts-build-result-r1.json` 由 Root 执行，非本作者运行。最终格式、diff、14文件无漂移 / exec 清理在 [31](logs/31-final-r5-freeze.json)；最后 metadata 修复前后 SHA 引用 042 r4 原 manifest 记录于 [32](logs/32-metadata-repair-before-after.json)。


最终本作者写集 SHA256：

| 文件（以 `native/huhubot/` 为根） | SHA256 |
|---|---|
| `internal/adapters/outbound/sqlite/events/store.go` | `11591101a4829b890c16a2cc1a480828ad5847381fa9bb381c76edde89082e8d` |
| `internal/adapters/outbound/sqlite/grants/access.go` | `078ca90db0e4c627851b61d33e6f8d1bafec33c85eb37c81822ef701d30f7de7` |
| `internal/adapters/outbound/sqlite/grants/delivery.go` | `b421f14b2efce4bac227b8acba058c859bef1e374c6361a97d29601efa37a56d` |
| `internal/adapters/outbound/sqlite/grants/store.go` | `aeb1d48842a427b2ff24cac827cc37045c76d9ab1952a1295b407afd2aa6599f` |
| `internal/application/access/context/service.go` | `49854b78cfedbc531f537eeb2715f47ca6842c2a02de5a78a2eabb272ea425de` |
| `internal/application/execution/events/service.go` | `67b6a9bb8ae6f46da621be7cf329f22f79d1f378b845a015d36ec867bf6ce3ee` |
| `tests/contract/access/access_test.go` | `b8bd796d469fc35a6af382a89a7efb9cf448d8bf6822fa90d88addae516a09a9` |
| `tests/contract/access/delivery_test.go` | `1fa58191aacf2f58239cd2a444cf754b884353a925ec2bb493c3f81e2be390b9` |
| `tests/contract/events/delivery_test.go` | `4ca181345027e1b4a832c68f0c40c36ef4f78346128d595e2b10ae2405d06ea4` |
| `tests/contract/events/events_test.go` | `c3e6aa5f909d8f1090e4977c04e31dce99ddfb58db1172fad9f308837f0f662b` |
| `tests/contract/events/history_test.go` | `75d4808578494aa6bdeed9121e721427f56f2edc8f479bbfa00167803ed27ea8` |
| `tests/contract/events/pipe_linux_test.go` | `eba3ec992298728f88f8b28a1fbf5436829fa7e01117197d25227e2dccecf94e` |
| `tests/contract/events/ts_test.go` | `73ea69f550624791b24b5550115b1f317df1a2e7338bce9b316d2f520a00926d` |
| `tests/contract/events/writer_test.go` | `f4d95f43806b5304d0826d761db08c8499ab095e8132c73e55634efc930429e6` |

来源：已完整读取 034 预检 REPORT/observations，复用其 DB-first、明确故障和窄 Port 设计判断，未将其未运行矩阵标 pass。新增代码为本仓独立实现，未复制或改编外部代码、未新增 import 依赖模块 / Go 锁 / 许可来源；stdlib 与既有仓内 api/sqlite/grants 依赖不变。完整编译闭包及 notices 仍由原工程 owner 按联合冻结输入复核。

## 问题与下一步

本轮明确保留的界限：Linux 的真实 os.Pipe 验证不能替代 Windows / macOS 现场 IO；已进入内核 buffer 的到期前字节无法追溯撤回，测试证明 permit 结束后旧 writer 不再追加字节且不交付完整旧 frame，不宣称撤回此前已写字节。公共 `WithDelivery` 端口要求 callback 同步停止真实 IO，不能用后台 goroutine 超时返回来提前释放 gate。真实模型、用户 Vault / Obsidian、目标 OS keyring 均未运行，未索密钥，未运行旧默认 D-Bus 探针。

本轮无未解决的实现失败；早期 feature / ledger / lifecycle / gap 红灯、准备错误、旧 fixture 不相容及各次真实 race 时限失败全部保留。最终 r5 受影响普通 / race / vet 全部 exit0，所有 writer/probe 停写、已 Wait。本作者仅完成本 REPORT、return 结构校验与真实 MESSAGE / FINAL 交回；Root 随后固定输入、实际回放及双轴独立审查。return 结果与最终报告 SHA 保存于本目录 logs，不改正式 Ticket/Map/Goal/Evidence。
