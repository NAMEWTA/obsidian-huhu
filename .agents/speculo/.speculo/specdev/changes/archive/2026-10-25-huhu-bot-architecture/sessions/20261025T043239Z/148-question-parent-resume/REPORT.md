Session: 20261025T043239Z
Task: 148-question-parent-resume
Status: completed

## 聚焦交接

已在 145 原 waiting-user 红例的真实 Core 与 SQLite 临时 Profile 中分段观测恢复路径。`ReadyParentInTx` 能选中中层 B 并返回 `resume_children` 和成功叶子的结果，错误发生在后续 `execution.Store.Claim`：实际返回 `work=nil`、`*api.Fault CONFLICT: MEMORY_INPUT_STATE_INVALID`，其事务回滚。这个结果排除了本任务原拟的 `usage` ReadyParent/等待资格根因；通用错误码尚不能区分 Memory `ReadInputInTx`、`ReadContextInTx` 及其内部当前资格检查，已交 Root 与 Memory owner 做下一次单变量定位。148 的临时 unsafe 诊断源码已全部清除，正式测试恢复 145 原 SHA；原行为仍红，不宣称 T12/T14/Goal 完成。

## 产物与验证

- 原场景保持 root 等待 `succeeded` 的 8 秒上限和准确 2 次 Resume 断言。两次 148 观测都复现 root `waiting_children` Rev 8 `CHILDREN_ACTIVE`、中层 B `waiting_children` Rev 4 `WAITING_children`、叶子 `succeeded` Rev 4；B/root 的 parent result 均为 waiting、admission open。没有提高 timeout、重试至绿或放宽来源、权限、费用断言。
- 第一阶段在失败后对真实 Core 已装配 `usage.Store` 调用 `ReadyParentInTx`，使用真实 Profile SQLite 事务并立即 Rollback：选中 B，结果 `resume_children`，叶子 `succeeded`/Text=`child`、含两条消息来源 Ref，`err=nil`。Go 1.26.10 定向原子目标实际 exit 1、Wait 9.460265462 秒；原始输出 `logs/04-question-diagnostic-go.jsonl`，输入 `logs/02-input-before.json`，后检查 `logs/06-input-after.json` 为 390 文件零漂移。
- 第二阶段在原断言已经失败、SQL 状态已记录后，调用同一真实 Core 的 `execution.Store.Claim(ctx)` 一次，原 `claimGate` 序列化；实际 `work=nil`、`err=*api.Fault CONFLICT: MEMORY_INPUT_STATE_INVALID`，没有占用新的 Work。定向原子目标实际 exit 1、Wait 9.373277910 秒；原始输出 `logs/08-claim-diagnostic-go.jsonl`（SHA256 `58f90662d6c2c2bc5b39082dfa86b354e1fa086be77f4605a45a01387436ee1c`），输入 `logs/07-input-before-claim.json`，后检查 `logs/10-input-after-claim.json` 为 390 文件零漂移。
- 两次命令均为 `/home/wta/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.26.10.linux-amd64/bin/go test ./tests/contract/delegation -run '^TestQuestionTaskReplyUsesActualSenderScopeAndSupportsWaitingUserAnswer/waiting-user$' -json -count=1`，环境 `GOTOOLCHAIN=local GOPROXY=off GOWORK=off GOEXPERIMENT= GOFLAGS=-mod=readonly CGO_ENABLED=0`。`go version` 实际 exit 0，输出 `go version go1.26.10 linux/amd64`，见 `logs/03-go-version.json`；原始 exit/Wait 见 `logs/05-question-diagnostic-meta.json` 与 `logs/09-claim-diagnostic-meta.json`。没有编译错误或新增行为绿灯。
- 精确各源 SHA256/mode 由 `logs/01-source-only-checkpoint.json`、两份完整 Go 输入快照与 `manifest.json` 保存。临时 `question_resume_test.go` 已删除，`reply_sources_test.go` 恢复 145 正式 SHA256 `a58064f3ac83296d4ad5acdceb32021c45cdd5c64e987c5857668de71df52b19`、mode 0600，见 `logs/11-cleanup-checkpoint.json`。148 最终无产品或测试源码改动，Go 窗已归还；未运行整包、race、vet、Node/build、DB CLI、生成器、物理 stdio、真实模型、Obsidian 或目标 OS。

## 问题与下一步

- Memory owner 需在同一可复现 Claim 事务中进一步标出 `MEMORY_INPUT_STATE_INVALID` 的具体读取边界与不变量，再用单变量对照修复。`answer.go` 会把原 question 行状态和元数据 revision 更新，但 `memory/sources.go` 的 thread message 正文 Ref 固定 revision 1，当前证据不支持把 metadata revision 变化直接认定为根因。`usage.ReadyParentInTx` 已通过真实回滚观测，148 不在没有反例的情况下修改 `usage`/`grants` 生产代码。
- 修复后的同一目标仍需证明整棵树正常关闭、B 与 root 的 Resume 总数准确、无残留 slot/pin；来源撤销、消息身份变化、损坏 CP 与无关 waiter 负控由实际根因 owner 和 Root 共同验收。Root 负责共同 Go/race 与独立双轴审查。本作者不改正式状态/Evidence，不提交、推送、发布或归档。
