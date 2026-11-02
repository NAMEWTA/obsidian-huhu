# 任务回报

Session: 20261031T062046Z
Task: 013-stop-rereview
Status: completed

## 聚焦交接

T-04 新固定 27 项候选独立复审完成，两轴 pass；010 原快照的 fail 保留。旧两组 finding 的实际代码路径已关闭，同步 batch、异步和限流回复共用准入/写出结算屏障，Go fixture 采用实际阶段观察并严格检查 EOF。未参与任何 T-04 实现或修复，仅写本报告；票级最终验收及 T-06 联合合同仍由 Lead 负责。结束本复审后停止本报告写入，再按独立 014 TASK 开始 T-16。

## 固定输入与独立性

Reviewer `native:/root/sources`，实现者 `native:/root/bundle`；本人只实现过 T-03/T-14，T-16 此时仅预检，独立性成立。base/HEAD 均为 `86c500556db1d64865c4cc7f1aff1dd83de071fa`，working-tree explicit-files 27 项。读取 006、010、011 REPORT 和本轮实际文件，复用未变化的 dev/SpecDev C 方法及 spec AC-281/282、ADR-001/002、Ticket04、execution-boundaries。重新计算 evidence/T-04.md#review-input 的 JSON.stringify SHA256，得到 `9d8a1db2f63871a7d441333b99a2a3701e34e4582ad4732eb8331ba04dca24ac`；27 个 after SHA 和 7 个来源 SHA 全部匹配。未把旧 input 的 pass/fail移植为新结果。

<a id="standards-output"></a>
## Original standards output

Reviewer: native:/root/sources
Axis: standards
Result: pass
Input-SHA256: 9d8a1db2f63871a7d441333b99a2a3701e34e4582ad4732eb8331ba04dca24ac
Observed: 核对实际累计 diff 与此次八项修复、调用双方及回归测试；旧 STD-01/02 均已关闭，未发现本范围新的阻塞问题。本人运行窄 Go 复核通过；未以实现者报告代替代码审查。

- STD-01：`stdio/server.go:120` 的 acceptRequest 与 `:129` finishRequest 共享 requestsMu。最后写入判定与 admissionClosed=true 同锁，实际 Close 在锁外；即使物理关闭尚未发生，新 reader 也不能越过已封闭准入。同步 hello/batch（497）、slots 拒绝（519）、异步 worker（542）都恰好结算一次受理 frame。Close 自身也永久封闭准入，未出现反向重开或锁内调用 Close 的死锁。原来的同步 batch 提前关闭与 last=true 后新受理窗口均已消除。
- `server_lifecycle_test.go` 在不物理 Close 的情况下以 channel 分别选择 reader-first/writer-first 顺序：前者必须保留在途回复，后者必须拒绝后续受理，随后重复受理仍拒绝。它是私有生命周期接缝测试；另 `stop_repair_test.go` 经真实 Core/stdio/net.Pipe 覆盖重复 hello+shutdown batch 与前一 held reply，先验证连接仍开，释放后读回精确旧 ID，再严格 EOF。两层证据对应各自边界，不冒充物理 fsync 或真实宿主。
- STD-02：runner_test 使用原 5 秒 ctx 的 shutdownWire；default_engine_cli_test 使用原 bounded ctx 的 observeShutdown；duplex/完成事实测试同用观察器。`shutdown_observer_test.go` 先验 requested，中间 finished=false 继续请求，剩余总期限收缩 waitMs；最终核对全部四事实和 failures 空。duplex 改为 errors.Is(io.EOF)，读 timeout 不能通过。没有提高原 caller/进程总期限。
- 新真实 observer 用例使用 heldMetadataProbe 阻止 Core drain，首个真实 wire 快照必须未完成；只有第二次观察才释放 Probe，最终检查 Core 结果及 EOF。callback-only 用例与真实生产链测试边界明确。cleanup 的独立一秒 join 仅用于收尾，不延长业务观察总期限。
- 其他固定生产文件与 010 相同：Core 单一 drain、状态互斥与 failures slice 复制、closeErr 经 Done 发布、errors.Join 聚合、真实 WAL Sync/DB close/Profile release 顺序保留。异常停止仍释放其他资源但不虚报持久化完成。未引入新数据库访问、敏感错误泄漏或 Browser 变化。

<a id="specification-output"></a>
## Original specification output

Reviewer: native:/root/sources
Axis: specification
Result: pass
Input-SHA256: 9d8a1db2f63871a7d441333b99a2a3701e34e4582ad4732eb8331ba04dca24ac
Observed: 按 T-04 阶段交付范围核对 AC-281/282、ADR-002 与 shutdown.md；旧 SPEC-01/02 关闭。停止请求、排空、持久化、Profile 释放四事实独立，观察期限不取消 owner；最终 ACK 与受理回复正常写出后关闭。TS 平台消费者明确留待 T-06，不声称 TS↔Go 全链或用户真机已通过。

- AC-281：原真实非空 WAL 文件接缝/3100 ms 断言/锁竞争/后续完成重开测试及 Core/store 本轮摘要未变；不是外层 Close 的空延迟。fsync 错误可 finished/profileReleased=true 且 persistenceComplete=false，符合既定错误后清理语义。
- AC-282：sync.Once 保留单 drain；迟到 producer/Probe/inspection/memory/实际模型收敛在 DB close 前；本轮共同请求屏障补齐退出中并发响应和 batch 旁路。Go fixture 先中间快照再完成的真实回归满足期限观察合同，不再依赖一秒内必完成。
- HAP：hello 与 managed-owner 限制、停止观察绕过 closed-DB guard、非法 waitMs 与 fixed failures/schema 校验保持；普通停止中业务仍拒绝。EOF/信号/传输失败不转移 Core 清理所有权；CLI defer 等真实清理，失败用退出码 1。
- 生成源/schema/Go DTO/方法 fixtures 与 TS schema validator 的既有对齐未变化，010 的只读八个 AJV 正反例结果仍适用于相同字节。无恢复旧 accepted-only 兼容链。checkpoint 调度、T-06 平台消费和预算收口均未越界纳入本票通过结论。

## 产物与验证

本 reviewer 实际执行：

`GOTOOLCHAIN=go1.26.10 GOWORK=off go -C native/huhubot test -p 1 ./internal/adapters/inbound/stdio ./tests/contract/foundation -run 'TestFinalWriterAndAdmissionBarrier|TestHelloShutdownBatchWaitsForEarlierStopReply|TestShutdownObserver' -count=1`

退出 0；stdio 0.010s，foundation 的实际输出已返回成功。检查运行于 Linux，未另起全量/race；011 的完整包及 race 结果是实现者报告证据，已读取其失败和修复记录，不称 reviewer 自己重跑。

原 006 全量 Go 观察失败历史保留，不能合称新快照全量通过；本复审不重复无失效的广泛检查。无 Windows/macOS、物理磁盘性能、真实 Obsidian 证据；Lead/T-06 仍需按分票合同完成最终联合验收。无代码、测试、合同、Ticket、Evidence 或 Git 写入。

## 问题与下一步

本票固定候选审查无阻塞 finding。交 Lead 核验真实返回、执行票级最终验收并记录两轴；T-06 完成后联合验收新停止合同，不提前宣称全链完成。
