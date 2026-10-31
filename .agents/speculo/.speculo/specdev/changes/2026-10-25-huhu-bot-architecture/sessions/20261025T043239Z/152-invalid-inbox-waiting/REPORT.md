# 152：非法补充等待停驻诊断

Session: 20261025T043239Z
Task: 152-invalid-inbox-waiting
Status: completed

## 聚焦交接

Root 完整 Go r2 的新红为 middle Run `waiting_children` Rev4。本人按 152 先只读，并在 `/tmp/huhu-152-invalid-dLrmVB/huhubot` 同源副本作无正文状态/错误探针，证明新红不是 146 已修的父 Run `running` Rev7 SaveResume 错误。原仓库生产与测试源码未修改；诊断窗全部 Go/DB 进程已 Wait 并归还。Root 明确将生产修复移交新 155，152 不冒称产品已修复。

## 产物与验证

- 原 r2 日志中，唯一红 `TestInvalidWaitingSupplementDoesNotLeaveRunningClaimOrPins` 等 8 秒后 middle 仍 `waiting_children` Rev4，见 Root `evidence/T-14-logs/lead-memory-regression-r2-normal.log`。本地测试源 SHA `cfb205ae…aae0b` 与 146 冻结值相同。临时副本的 `go list -deps -test -json ./tests/contract/foundation` 使用绝对 Go1.26.10、`GOTOOLCHAIN=local GOPROXY=off GOWORK=off GOEXPERIMENT= GOFLAGS=-mod=readonly CGO_ENABLED=0`，exit0/Wait0.172883秒，486包、235个本地 source/mod/embed 输入，见 `logs/02-list-receipt.json`、`03-input-before.json`。
- 临时测试仅加三代 Run 的 status/revision/reason/claim 是否存在/slot、父等待结果/edge/delivery 数和叶 Engine 入口观察，不输出消息正文。无 barrier 的原用例 `-count=20` exit1/Wait19.000979秒，两次真实红相同：非法消息改写前叶 `preparing` Rev2、claim1/slot1、从未入 Engine；8 秒后仍 `preparing` Rev2、claim1/slot0，middle `waiting_children` Rev4、edge1/delivery0。见 `logs/08-bounded-repeats.jsonl`。
- 临时 Executor 仅在 Prepare 错误分支打印错误类型与 SQLite 数码，不改变处理。精确目标 `-count=10` exit1/Wait9.946022秒，错误树是 `*errors.joinError`→`sqlite3.ExtendedErrorCode` **517**，主码 **5**，即 `SQLITE_BUSY_SNAPSHOT`；叶停驻、父等待状态完全吻合。见 `logs/15-code-probe10.jsonl`。现有 `PrepareAndMarkRunning` 对此错误直接返回；Executor 对非白名单错误也直接返回，defer `ProducerEnded` 仅释放 slot，不释放持久 preparing claim，故父无法取得叶结果。外部 SQLite 消息改写与两事务 Plan/Seal 交错触发这一真实生命周期缺口。
- 唯一对照改动是让非法 kind 注入等待叶实际进入 Engine；同一非法正文/原失败、无 Resume、slot/pin 断言保留。`-count=5` exit0/Wait1.887721秒，五次叶均 `running` Rev3 且已进入 Engine，父 SaveResume 拒绝非法包并安全终结，见 `logs/17-leaf-entered.jsonl`。这只隔离父 SaveResume 校验窗口，不修复叶准备时的并发错误。
- 第一版临时探针 `04-baseline` 是 `diagnostic` 声明位置导致的编译错误，已保留原输出，不计行为 red。临时模块的 foundation 整包 `07-package` 还因只复制 Go module、合同文件相对路径不在临时根而出现别的 fixture 失败，不计产品回归；本目标该次仍通过。`logs/20-temporary-probe.patch` 精确列出两处仅在 `/tmp` 的观测改动。临时副本与当前原仓库 235 个输入只有这两处差异，见 `logs/21-copy-vs-original.json`；原七个冻结源零漂移、最终对照输入零漂移，见 `logs/18-drift-audit.json`。所有命令原始日志、stderr、实际退出/Wait秒数及输入 SHA 已保存。

## 问题与下一步

产品仍可在真实并发写入下留下 `preparing` claim 与等待父；不应延长测试超时或仅加叶入口 barrier 掩盖它。155 须在原 T01/T03 责任中精确增加 `sqlite/execution/context.go`：仅对已确认、事务已回滚的 `BUSY_SNAPSHOT` 从新 Tx 重做有界 Plan/Seal；耗尽时给明确 typed 故障，并由 Executor 走原资源结算/可恢复处置。未知 SQL/I/O、stale claim 和权限失效不能合并终态。原非法包测试可加叶入口 barrier 固定 SaveResume 负控，同时补真实受控并发回归覆盖叶准备路径。根源修复、定向 Go/完整回归、Root E2E 与独立复审均交 155/Root；152 不修改原 TASK、146/147/150 报告或任何生产源码。真实 Provider、Obsidian、目标 OS 仍由用户后验；未提交、推送、发布、归档。
