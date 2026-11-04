# 任务回报

Session: 20261031T062046Z
Task: 004-stop-preflight
Status: completed

## 聚焦交接

已完成 T-04 只读预检，未实施或运行测试。现有单一 drain 已保留真实生产者、数据库与 Profile 的生命周期，主要缺口是停止观察合同、固定 3 秒 Close 包装和传输提前断开。建议保留现有 drain 次序，在其真实完成点发布停止事实，并使 HAP 的有期限停止请求能返回快照、随后继续观察。正式实施前须补齐下述实际写集；本报告不使 T-04 或 G-BASELINE 完成。

## 产物与验证

### 依据与真实链路

读取 Map revision 4、T-04、其 Evidence 路径修正、change ADR-001/002/003、Spec AC-281/282、execution-boundaries、dev 及 architecture/build-and-release/testing；复用本会话已读 SpecDev I 设计/预检合同。永久依据为 `.agents/speculo/.speculo/specdev/adr/2026-10-31-huhu-bot-architecture.md` ADR-027：正常关闭 fsync WAL 后关闭句柄，无关闭检查点；不撤销持久屏障。全部结论来自本地实现，无新增依赖或陌生外部方案，无外部引用需要转写。

- `native/huhubot/internal/bootstrap/core.go:370`：RequestStop 的 sync.Once 先 Stop executor，再关 memory/collaboration/recovery/execution/effects/policy admission、Probe、model、Service 和 inspection；此取消先后由 stop_order_test.go 保护。
- `core.go:396`：唯一 drain 重试 recovery.Stop；等 executor、inspection、Probe、memory；轮询 PendingProducers 到 0；等 models.Done；GC；关闭 models/provider/store/profile；最后关闭 Done。调用方等待 context 取消不取消 drain。
- `core.go:449`：WaitClosed 仅返回 error；Close 自建 3 秒 context，所有期限失败映射为 EXECUTOR_STOP_TIMEOUT。无法区分执行排空和 WAL 慢同步。
- `cmd/huhubot/main.go:94`：defer 调 Close，任何错误都记为 EXECUTOR_STOP_TIMEOUT，再无限 WaitClosed；错误归因不准确。
- `internal/adapters/outbound/sqlite/base/store.go:289`：Close 先 syncWAL，再 db.Close；sync 错误会被返回，但仍关闭 DB。`internal/runtime/profile/profile.go:180`：Handle.Close once 解锁并关闭锁文件，返回错误。Core 当前即使 store.Close 错误也调用 profile.Close，故不能以 Done 或最后一次 phase 推断持久化成功。
- `internal/application/api/service.go:59`：Shutdown 只请求 stop，不等待；Status 在 stopping 时拒绝。`internal/adapters/inbound/hap/router.go:91` 在 stopping 时一概拒绝新请求；:170 只返回 accepted:true。
- `internal/adapters/inbound/stdio/server.go:503` 在 shutdown ACK 或最后在途响应写完后关闭连接；:469 的 hello/batch 分支也会在 stopping 后返回。仅改 API/schema 不能实现超时后继续观察。
- `src/modules/huhubot/platform/desktop/runtime/client-runtime.ts:255`：stop 直接 current.close()，等 exited 后 finally 标 closed。`transport/managed.ts:270` fail 断 stdin，默认 4 秒后 kill，再 1 秒 SIGKILL。真实正常停止不使用 service.shutdown，因此 T-06 必须改生产入口，而不只改 runner.test.ts。
- `contracts/hap/v0.1/generate.mjs:8` 的权威输入是 `src/modules/huhubot/api.ts` BotMethodMap（shutdown 在 :719），不是手写 schema。生成器写 contracts schema/methods/fixtures、Go methods/schema；Go `types.go` 中另有手写 ShutdownResult，需同步。

### 四种事实与最小实现建议

四种事实应独立可观察，错误情况下不能用单一序号隐式声称之前全部成功：

| 事实 | 发布时点 | 不代表 |
|---|---|---|
| 停止请求已接收 | RequestStop 的同步准入关闭与取消请求完成 | SQL stop fence 已提交、执行已退出 |
| 执行器已排空 | executor 与 inspection/Probe/memory、真实 producer ledger、models 全部收敛 | WAL 已 fsync、Profile 已解锁 |
| 持久化已完成 | Store.Close 的 WAL 同步和关闭成功返回 | Profile 已释放 |
| Profile 已释放 | Profile.Close 成功确认 | 在异常清理路径中持久化必然成功 |

推荐在 application/api 定义可序列化 StopStatus（四个事实、当前阻塞/失败步骤及固定词汇错误；无路径/秘密），Core 用互斥保护快照及阶段通知。继续唯一 drain，不为每个等待者启动清理，也不让调用方 context 进入 drain。RequestStop 保持幂等；新增有期限的等待/快照入口供 CLI/HAP，共享同一状态。WaitClosed 保留最终资源清理语义；Close 可改为明确的无期限资源清理便捷方法，删除内部 3 秒与假归因，普通 defer Close 调用无需机械改写，但已依赖其超时的调用必须迁移为 RequestStop + 有期限观察。若实施选择 Close(ctx) 则调用迁移范围更大，不建议为本目标采用。

Go caller 的 deadline 结束返回快照和 context 错误；完成与 deadline 同时就绪时重读最终状态，避免已完成却报过期。所有阶段单调，失败记录与“资源清理已结束”独立；聚合 close 错误而不是仅保留第一个导致误归因。尤其不能把 store.Close 失败后 profile.Close 成功渲染成“持久化完成”。是否对 fsync 错误保锁并可重试属于需在正式局部设计明确的恢复策略；现存 Store.Close 会关 DB，单纯重跑整个 drain 不安全，不应顺手新增无限重试。至少保持错误事实、禁止报告正常完成，期限不触发提前解锁或强杀。

HAP 最小候选：扩展现有 service.shutdown 而不新增第二套停止方法；params 带有限 waitMs（0 为只请求/观察，上限仅防资源滥用，不是全流程固定时限），result 返回 StopStatus。首次请求触发停止；期限内未完成也以真实状态返回，可再次调用等待。停止期间仅允许经过 managed-owner 权限校验的此方法，绕过任何访问已关闭 DB 的 Profile Restricted/Status 查询，其他业务继续 SERVICE_STOPPING。stdio 保持读响应能力和有界写队列；仅在最终停止响应已成功写出后结束正常 HAP，不能因任意“最后在途回复”关闭。对 EOF/信号/传输错误，CLI 自己继续等待 Core 真正清理；终端错误与无 ACK 情况须留明确故障结果。正常重复观察不应把 Host 迟到回复丢弃或重复结算。

此候选需要 T-06 同批迁移：正常 stop 先请求 shutdown，期限后保持 session/transport owner 和 stopping 状态，继续观察；真实释放且进程退出后再允许重开。fail/EOF/强杀路径区分于正常停止，不能自动 4 秒强杀后称 closed 成功。进程退出本身不证明正常持久化完成，HAP 最终状态与退出原因均应保留。

### 必须补齐的写集

当前许可路径足够 Core、CLI、Application API、foundation、wire 产物与 core/protocol；以下不在 T-04 当前写集：

1. `native/huhubot/internal/adapters/inbound/hap/router.go`：生产路由、停止准入白名单、params/result 映射、避免停止观察访问关闭 DB。
2. `native/huhubot/internal/adapters/inbound/stdio/server.go`：ACK/连接关闭时机，晚响应与阶段观察。
3. `src/modules/huhubot/api.ts`：生成器真实输入。应归 T-04 wire 合同 owner，不能只在 T-06 改后再使 T-04 生成物漂移。
4. `native/huhubot/tests/contract/recovery/producer_test.go:90,129`：明确期待 Close 固定 3 秒/EXECUTOR_STOP_TIMEOUT；须改为 caller deadline 与真实阶段，保留实际 HTTP producer/late Settle/锁断言。foundation 的 recovery_lifecycle/default_probe_lifecycle 已在写集。
5. 慢 WAL 注入：现有 `base.syncWAL` 是包内变量，仅 base/checkpoint_test.go 可直接替换；Core 的 store 是具体 *base.Store。可在 bootstrap 引入私有 close 接缝并在同包构造测试，将 held wrapper 放在真实 Store.Close 之前/之后，证明 Core 的慢关闭归属，但它不等于真实 fsync 已挂起。若 AC 要求精确 fsync 边界注入，应由 Lead 扩到 base 对应测试/窄接缝并与 T-05 串行协调，不能虚报 wrapper 为 fsync 注入。不改检查点调度或 syncWAL 生产行为。
6. `docs/huhu-bot*` 等维护文档若当前描述 accepted ACK 即关闭须进一步定向检索后按 owner 更新，不能先把宽 docs 写集视为已授权。

没有删除 Core.Close 的需要时，不必扩大到所有数百个 `.Close()` 调用；它们包含大量非 Core 对象。正式实施用类型/具体引用核对，不能文本批量替换。独立 Executor.Close 仍有自身 3 秒语义但 Core 不调用；不在本票无条件改写。

### 失败注入与回归清单

1. 慢于 3 秒关闭：真实 Profile/Store，受控阻塞点，caller 短期限先返回“执行已排空、持久化未完成、Profile 未释放”；保持阻塞超过旧 3 秒以证明无固定上限释放；真实第二 Open 必须 INSTANCE_CONFLICT；放行后完成并可重开。以 channel 控制，只有跨 3 秒合同必需处使用墙钟等待。
2. 并发重复 RequestStop/等待者取消：清理各步骤一次、快照单调；一个 waiter 超时不影响另一 waiter 和 drain；已完成再等待稳定；`-race` 覆盖。
3. stop fence 失败：复用 foundation/recovery_lifecycle_test.go 的 SQL reject_stop trigger，准入关闭、Profile 保锁、fence 恢复后收敛；快照不能跳到 persisted。
4. Engine/HTTP/Probe/memory 尚未实际返回：复用 foundation/recovery_lifecycle、default_probe_lifecycle、memory_runtime，以及 recovery/producer_test；保持凭据 provider/DB 可服务其 owned settlement；取消不等于生产者结束。
5. WAL/模型/provider/profile 关闭故障：每种错误归对应步骤，不能变成 EXECUTOR_STOP_TIMEOUT；Profile release 与 persistence flags 准确；不重复 store close/结算。Profile 解锁故障需窄注入，不通过“Done 已关”冒充释放。
6. 真实 stdio：shutdown wait 超时后同连接再次查询；旧请求迟回复不抢先断连；Host 响应直接投递仍工作；业务新请求拒绝；非 managed owner 拒绝；最终 ACK 写出后才退出；EOF/信号仍等 Core owner。复用 foundation/duplex_test.go 现有流量与关闭测试。
7. wire 正反例：四事实合法组合、waitMs 边界/非整数/负数、未知字段/未知阶段、旧 accepted-only 结果按新合同拒绝；生成物可重现；Go 与 TS method validation 一致。不用兼容分支掩盖旧消费者。
8. T-06 联合回归：生产 client-runtime stop，等待超时保持 stopping/资源，收到完成后重开；强杀/异常退出保持恢复信息；runner.test.ts 的 `{accepted:true}` 精确断言要迁移。

建议正式验证顺序：先定向新增 bootstrap/foundation 红灯；实现后同目标绿灯及 `-race`；生成并跑 wire 与 TS protocol 测试；`pnpm test:huhu-bot-architecture`、`test:huhu-bot-tooling`；全量 `pnpm check:huhu-bot` 由 Lead 在稳定输入协调运行。待 T-06 的 TS 旧契约失败逐项列出，不伪称全链通过。Lead 负责真实 Go fixture 与双轴审查，高风险需要真正独立审查上下文。

### 本次实际验证

只运行 cat/sed/rg 等只读定位；没有运行 Go/Vitest/build、没有改业务文件或状态。本报告为静态预检，不证明建议实现正确或测试通过。尚未对未知 EOF 根因作判断（T-07 诊断门保持）。

## 问题与下一步

Lead 待 T-01 完成后，修订准确写集/验证接缝并发新 TASK 才可生产实现。优先明确 HAP 观察合同、关闭错误事实表示、精确慢 fsync 注入的归属；这些局部设计须保持 ADR-002/027，不改变产品合同。T-04 与 T-05 的 stop-lifecycle/profile-lock 语义资源串行，T-04/T-06 同批联合验收前不独立集成。报告交回后停写。
