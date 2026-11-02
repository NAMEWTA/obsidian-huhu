# 任务回报

Session: 20261031T062046Z
Task: 010-stop-review
Status: completed

## 聚焦交接

对 T-04 固定 24 项候选完成独立双轴审查，标准轴与规范轴均为 fail，需修改后重新固定输入复审。发现正常完成 ACK 的关闭路径没有完整覆盖同步 batch 与新请求受理竞争，以及部分 Go 夹具仍把一秒观察当作停止完成。Core 的单一 drain、四事实、超时保留 owner、真实 WAL Sync 接缝和 Profile 锁顺序未发现阻塞问题。未修改代码或运行重型 Go；Lead 正在执行的 Go 观察不冒充 reviewer 自己的通过证据。

## 固定输入与独立性

- Reviewer：`native:/root/sources`；Implementer：`native:/root/bundle`。本人仅参与 T-03/T-14，不参与 T-04 实现/修复，独立性成立。
- Review mode：working-tree / explicit-files；base 与 observed HEAD：`86c500556db1d64865c4cc7f1aff1dd83de071fa`。
- Input：`evidence/T-04.md#review-input`，24 项源码/测试/wire 和 7 个规范/标准来源。
- Input-SHA256：`b33a8e97de87af17fb9fa0b66ebba2318d4aac89dd5285c98439ea67357425af`。
- 实际重新计算 `SHA256(JSON.stringify(input))` 与上述值一致；逐项检查 24 个 after.sha256 和 7 个来源摘要，无不匹配；完成阅读后再次检查 24 项，无漂移。
- 来源发现：无新增 commit，故 commit-message 引用不适用；显式 Ticket04、spec AC-281/282、ADR-001/002、execution-boundaries 已读取；本地 `contracts/hap/v0.1/shutdown.md` 为实现交付合同。标准采用根 AGENTS、dev SKILL/testing 及 SpecDev C/公共 review、风险与可靠性方法；相关 native/contracts/src 子树未发现额外 AGENTS/CONTRIBUTING/CODING_STANDARDS。

<a id="standards-output"></a>
## Original standards output

Reviewer: native:/root/sources
Axis: standards
Result: fail
Input-SHA256: b33a8e97de87af17fb9fa0b66ebba2318d4aac89dd5285c98439ea67357425af
Observed: 阅读实际固定 diff、Core/stdio/router/CLI/持久化实现与 Go Close 调用方，并核对实际生成源、schema 和测试；确认下面两个范围内问题。未执行新增故障注入，反例为可达代码路径与明确线程交错推导，不伪称动态重现。

### STD-01：完成 ACK 的关闭判定绕过在途响应所有权（medium / P2）

位置：`native/huhubot/internal/adapters/inbound/stdio/server.go:454`、`:467`、`:489`、`:509`。

触发条件与观察：连接已 hello；第一个 shutdown 处理已得到完成事实，但在返回/写出前被延迟（现有 `heldStopReply` 就提供这个精确接缝）。客户端发送合法 batch，包含新的请求 ID 的重复 `protocol.hello` 和另一个 `service.shutdown`。`containsHello` 使整批走同步分支；重复 hello 返回错误，不拒绝整批；第二个 shutdown 得到 finished=true。batch 写出后第 467 行直接 return，defer 先执行 `s.Close()` 再 `workers.Wait()`，因此旧响应尚未写出就关闭传输。释放旧 handler 后 `s.write` 得到 EOF，旧请求响应丢失。frame.go 允许 1–8 项 batch，因此不是不可达输入。

同一关闭合同在异步分支还有明确的交错窗口：最后一个 worker 的 `inflight.Add(-1)` 返回 0 后、调用 Close 前，reader 可以在第 489–490 行受理并递增另一个请求；旧 worker 仍使用已保存的 last=true 关闭。原子计数并未让“关闭准入+确认无在途响应”成为原子操作。

影响：一个已认证 owner 的并发停止观察或其他已经受理请求失去响应，违反本次新增的所有在途回复写出后正常关闭语义。现有 `TestFinalStopReplyDoesNotDropAnotherInflightReply` 仅覆盖两个异步 worker，不能覆盖同步 batch 分支或最后回复/新受理竞争。

建议：由一个共同 owner 协调请求受理和终止 ACK 后关闭，所有正常写出分支使用同一结算逻辑，关闭决定与准入不能分离。增加上述 held reply + hello/shutdown batch 回归及确定性 admission/last-write 交错测试；不要用扩大超时替代。

### STD-02：Go 停止夹具忽略阶段，合法慢清理可失败或假通过（medium / P2）

位置：`native/huhubot/tests/contract/foundation/runner_test.go:89`–`:94`、`default_engine_cli_test.go:258`–`:259`、`duplex_test.go:251`–`:264`。

触发条件：实际清理在 1000 ms 观察期限之后完成。前两处只加了 waitMs=1000，却不解析 finished/failures，收到无 RPC error 的中间快照后直接 cmd.Wait。新服务明确在中间快照之后保留连接等待再次观察；即使清理最终完成，这两处也不再请求最终事实，父进程期限随后终止子进程并把合法慢清理报成失败。

duplex 用例同样不检查 finished，且 `wire.ReadFrame` 只要求 err!=nil：一秒读期限的 timeout 也会通过“shutdown left transport open”的断言，不能证明 CleanEOF。该任意错误断言原先已存在，但本票迁移到阶段观察后仍作为本票关闭证据，不足以满足新合同。

建议：Go fixture 在自身总期限内观察阶段，取得 finished 后核对 persistenceComplete/profileReleased/failures，再等待实际退出；EOF 断言使用 errors.Is(err, io.EOF)。增加首次返回未完成、随后真实完成的控制屏障，保留现有进程总期限，不简单提高 waitMs 或放松断言。

<a id="specification-output"></a>
## Original specification output

Reviewer: native:/root/sources
Axis: specification
Result: fail
Input-SHA256: b33a8e97de87af17fb9fa0b66ebba2318d4aac89dd5285c98439ea67357425af
Observed: 对照 Ticket04、AC-281/AC-282、ADR-002 与 shutdown.md，Core 四事实及慢真实 Sync/锁顺序符合目标；STD-01 使退出中并发响应及最终 ACK 时序未满足，STD-02 使“迁移全部 Go 调用方”和真实阶段观察的验证未完成。TS 平台消费者尚未迁移明确属于 T-06，不以该项要求旧兼容链，也不报告 TS↔Go 全链通过。

### SPEC-01：并发停止响应合同未完整满足（medium / P2）

对应 STD-01 的路径与反例。依据 AC-282“退出中到达响应”、Ticket 明确完成 ACK 时序，以及 `contracts/hap/v0.1/shutdown.md:14` 的“最终结果和所有已受理的在途响应写出后关闭正常 HAP”。同步分支和最后 worker 的准入竞态都可提前关闭已受理响应。满足条件是所有正常终止分支共享可靠受理/写出/关闭屏障，并由精确并发回归证明。

### SPEC-02：Go 调用合同迁移仍有首个响应即完成的假设（medium / P2）

对应 STD-02。依据 Ticket04 IN“迁移全部 Go 调用方”、AC-281 期限返回真实阶段且之后可观察完成、ADR-002“超时不等于已停止”。这里只改 Go fixture 的 waitMs 没有迁移完成观察逻辑，不能归为 T-06 的 TS 消费者待迁移项。满足条件是上述 Go 调用方按阶段等完成及严格 EOF，慢路径不靠观测期限延长获得通过。

## 产物与验证

只写本 REPORT。实际阅读与正向观察：

- Core RequestStop 使用 sync.Once，先关准入/停止生产者再发布 requested；唯一 drain 重试 durable Stop、等待 Executor/Inspections/Probe/Memory、真实 producer settlement 和 model Done，再推进 executionDrained。
- store.CloseWithSync 在实际已打开的 WAL 文件执行注入函数；默认 f.Sync，随后关闭文件/DB，errors.Join 保留 sync 与 close 错误。慢 Sync 测试检查真实非空 WAL 路径、阻塞超过 3100 ms、期间同 Profile Open 得 INSTANCE_CONFLICT，释放后只 Sync 一次且可重开；其旧三秒实现反例有效。本人未重跑该 Go 测试。
- fsync 失败后仍关闭 DB/释放 Profile，与原行为相符；persistenceComplete=false、finished=true、固定 failure 分类，不把释放事实当持久化成功。StopStatus 复制 failures slice；closeErr 在 Done 关闭前写入，WaitClosed 经 channel 发布读取。
- Shutdown 在 hello 和 managed-owner 检查后进入特殊观察路径，避开 closed-DB Profile guard；waitMs schema 限定整数 0–30000，context 只限制等待。普通 stopping 请求被拒绝；EOF/信号由 CLI defer 实际 Close，清理错误使命名退出码为 1。
- 扫描 Go Close/RequestStop/WaitClosed/WaitStopped 调用：生产 CLI 与 effect-reconcile 子入口仍通过 Close 等实际 owner 清理；阻塞 producer 的旧固定 Close 断言已迁移 caller deadline。Executor 自己仍有三秒 Close，但 Core 不调用它，未据字符串残留虚报本票问题。Go HAP fixture 未完全迁移见 STD-02。
- 生成真源是 `src/modules/huhubot/api.ts`；generate.mjs 加 waitMs 上下界、旧 ACK/非法 wait/failure 反例；schema 与 Go schema 镜像逐字节一致，手写 Shutdown DTO、生成 ContractServiceShutdown DTO 字段对应。TS method-validation 直接导入 schema，因此该校验消费已更新；平台消费仍属 T-06。
- 轻量只读 Node/AJV 检查退出 0：service.shutdown 的 4 个 params 与 4 个 result 正反例全部符合 expected valid，两个 schema 镜像相同。没有运行会写生成物的 generate.mjs。
- 未启动重型 Go，与 Lead/实现者的唯一 Go 运行协调约束一致。已知全量 Go 观察退出 1 与后续修正 fixture 的复验状态仅来自 Lead 通知；未把它推测成环境失败或既定通过，也未据此否定/替代上述实际代码发现。

## 问题与下一步

交 Lead/实现者处理两个本票 finding，保持原有效测试断言与资源所有权。修复后重新固定输入，由未参与修复的 reviewer 对受影响两轴复审；本次快照不能给 pass。没有代码修复、Git 写入、递归派遣或真实 Obsidian 操作。
