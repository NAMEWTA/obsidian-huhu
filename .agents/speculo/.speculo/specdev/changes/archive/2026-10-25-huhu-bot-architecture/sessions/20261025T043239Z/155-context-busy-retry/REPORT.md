# 155：上下文 Seal 快照冲突与 Run 生命周期

Session: 20261025T043239Z
Task: 155-context-busy-retry
Status: completed

## 聚焦交接

152 已实证的叶 Run `preparing` 停驻来自 SQLite `BUSY_SNAPSHOT` 517：Seal 的读事务在外部写入后升为写事务，原代码直接丢弃此错误，Executor 仅释放进程 slot。现在只在 TxB **回调**实际返回单一 517、`WithinTx` 未调用 Commit 且已执行 Rollback 后有界重做新 TxA Plan→当前 Host 授权→TxB Seal。失败轮的 Work 不再提前发布；两轮内成功才发布提交后的候选。若 Commit 自身返回错误，提交结果不能由本层证明，错误原样返回；普通 `BUSY`、其他 SQL/I/O、claim 变化、权限拒绝和取消均不被此重试吞并。

两次 517 耗尽返回 body-free `CONFLICT/CONTEXT_SNAPSHOT_BUSY`，Executor 只对此精确故障走原 `Finalize(failed)` 生命周期，让已终止 producer 释放 slot/pin 并使父树可观察结果。原 `CONTEXT_PLAN_CHANGED` 分支保留。原非法 SaveResume 测试仅在叶实际进入 Engine 后注入无效消息 kind，仍检验原消息、CP、Decision、无 Resume、reason 与 slot/pin，保持 8 秒窗口。

## 产物与验证

- 四个同域文件最终 SHA：`sqlite/execution/context.go` `bafbaa593d9fb66a5a36bc248f483b374638edb1447bcfe464fbe10bc853a44a`；新增 `context_retry_test.go` `2f36c3187fb8927ba35fb69244cd88da5ae9329973991612dcb642bb05a0ebfb`；`application/execution/executor/executor.go` `9fb78358cb5f5cca26d42b97ef82dc76fc4846a7fcfe25a9d14907129bd29196`；`foundation/resume_inbox_test.go` `b5f12b91a94bc246d0b1c1a03ab16f4e60b38caf3e0ede0fecf5c171a1756d81`。没有改 API、Memory、SQL schema、Base.WithinTx 或其他 owner 文件。
- 固定绝对 Go1.26.10、`GOTOOLCHAIN=local GOWORK=off GOEXPERIMENT= GOFLAGS=-mod=readonly GOPROXY=off CGO_ENABLED=0`。`go version` exit0/Wait；`go list -deps -test -json` exit0/Wait，488 records、61 本地包、237 个本地编译/嵌入文件含迁移 SQL、go.mod/go.sum，见 `logs/02-list.json` 与 `03-input-before.json`。新增资格拒绝测试后只有 `context_retry_test.go` 输入变化，最终 `06-input-before.json` 固定 237 个；`09-drift-audit.json` 对该最终输入零漂移。全部退出码、Wait 秒数与精确参数在 `10-command-receipts.json`。
- 真实双连接 WAL 测试在 TxB 已读 `execution_runs` 后，由另一连接提交 `profile_metadata` 写入，再让原事务写 `execution_runs`。测试直接断言驱动返回 `sqlite3.BUSY_SNAPSHOT`，不是手造 Fault。一次冲突后新 Plan 看到递增的持久 revision、Host 再授权且 MarkRunning 成功；连续两次冲突后经实际 Executor 到 `failed/CONTEXT_SNAPSHOT_BUSY`，Session 不再 active，pin/child slot 为零，未进入 Engine；取消在首个 517 后不启动第二次 Plan。首轮 3 目标 exit0/Wait，见 `04-snapshot-first.jsonl`。
- 补充资格负控：第一次真实 517 后第二轮 Host 明确拒绝，只有一次 Seal，新的 Plan 与 Host 均运行两次，Executor 以 `ACCESS_REVOKED` 终结，没有旧授权绕行。四个目标一起 exit0/Wait，见 `07-snapshot-with-denial.jsonl`。这验证重新授权的行为边界；未模拟一个真实外部 Host 租约撤销协议。
- 原非法 SaveResume `-count=5` 全部通过，exit0/Wait，见 `05-invalid-first.jsonl`。受影响的四个等待补充/恢复目标与一个 Core 停止目标均通过，exit0/Wait，见 `08-foundation-affected.jsonl`。所有 Go/DB 进程已 Wait 并归还窗口。首轮和最终测试均无行为红；一次日志统计小脚本 TypeError 只影响摘要打印，原 Go 日志与退出码完整保留。

## 问题与下一步

本任务精确目标通过，未运行全模块 Go、race 或目标 OS/真实 Provider/Obsidian。Root 正协调 153/154 共同输入的完整回归、物理 CLI E2E 与独立复审；这些全局门禁不在 155 的定向通过结论内。对不确定的 Commit/未知 SQL 错误保留原恢复责任，不宣称已能安全终结。真实用户环境后验仍由用户完成；无提交、推送、发布或归档。
