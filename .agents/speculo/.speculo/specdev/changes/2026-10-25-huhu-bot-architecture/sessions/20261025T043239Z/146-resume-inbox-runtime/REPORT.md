# 146：可信恢复补充包与运行持久重放

Session: 20261025T043239Z
Task: 146-resume-inbox-runtime
Status: completed

## 聚焦交接

已按 146/147 共同合同，在原 `ExecutionPosition.Decision` 中持久化可信恢复补充包，未增加 SQL 表、迁移、外部 wire 或第二恢复 writer。原 `ShortTerm`、其 `BindingDigest` 和 checkpoint 前缀不改；续跑的 `Input.Messages` 清空。Root 授窗后，本人完成真实 Core/SQLite/Executor 定向检查并归还唯一 Go 窗口。147 负责 common 与三个 SDK 对同一包的实际模型结果消费者，150 负责原 145 协作测试断言迁移；本报告不冒称其验收。

## 产物与验证

- 唯一内部 DTO：`ToolResult.ResumeInbox` 含已资格核验的 `Messages{Message,Ref}` 和正文为空的 `AnswerReceipts{QuestionID,Ref}`。正文 Ref 沿现有 memory source 合同使用真实消息 ID、固定 body revision `"1"`、SHA256 与线程；mutable SQL 行 revision 只用于核对当前 question child 的真实 answer 自 Ref。同正文不同 ID 不丢；同 ID 身份冲突拒绝。100 条候选/32 答案、256 KiB 正文、2 MiB 内部编码上界为纯校验；147 在排重后沿用模型工具结果 256 KiB 与 CP 1 MiB 上界。`resume-inbox-contract.md` 是 146/147 唯一交接。
- 原 Claim 仅保留当时已资格核验的候选 ID/正文；若已有 `RecoveryDecision`，不扫描更新 inbox。原 `usage.MessagesInTx` 的 recipient、Grant、Group、父 scope、source、`read/send` 与 PrivateMessage/ConsumePrivate 校验被选定 ID 重用。`SaveResume` 在同一事务重查冻结 ID、排除 sealed `ShortTerm.Use=inbox` 的完整 Ref，并在 Engine.Resume 之前把包和原工具决策写到原执行位置。恢复仅重放原 Decision 包，并重新验证包内当前身份；晚到消息不会并入已保存决策。
- question receipt 读取原 `collaboration_parent_results.checkpoint_json` 的 `WaitForIDs[j]`，用与原 finalize 相同的真实 question→reply SQL 选择答案自身；核对当前合格 inbox 行、`Children[j].Text/RunID` 和真实 metadata revision 的精确 Derived 成员后，仅持久 body Ref1 与 question ID。祖先 Derived 和相同正文不被当作已投递证据。
- 原首次真红 `logs/04-negative-red.jsonl`：已接收消息的持久 metadata 被控制性改为非法 kind；`SaveResume` 返回已知校验错误后，Run 留在 `running` Rev 7，未进入 Engine.Resume，exit 1 / Wait 9.455382 秒，固定输入零漂移。最小修复仅将已知 `RESUME_INBOX_INVALID/CHANGED/LIMIT` 与装配错误交原 `Finalize` 终结路径；当前权限失效仍按 body-free `ACCESS_REVOKED`，stale claim 与未知 SQL/I/O 保留原恢复路径。相同真实反例现 exit 0 / Wait 2.897861 秒，Run failed、slots/pins 为零、持久位置无补充正文。
- 首次重启测试原红 `logs/08-reopen-first.jsonl` 是测试夹具根 Run 活跃但没有 CP，树被正确阻断 `CHECKPOINT_MISSING`；给根 Run 原有等待机制发布真实 CP 后，原测试 exit 0 / Wait 1.931787 秒。停止/重开后的 `Recovery.Get` 实际 ready，纯 Inspector 读到原 CP 与保存的唯一补充 Ref，保存决策后接受的第二条同线程回复未被合并。
- 当前撤权测试通过真实 Host 来源、三方 Grant、委托和用户补充构造；撤销中层 recipient Grant 后，实际 Run `failed`、reason `RECIPIENT_NOT_GRANTED`、无 Engine.Resume、slots/pins 为零。首轮用公共 GetRun 观察失败态被当前 Grant 拒绝（原日志 `13-revoke-first.jsonl`），改为只读 SQL 状态观察后 exit 0 / Wait 4.197724 秒，未放宽实际拒绝条件。

Go 工具链为绝对路径 Go 1.26.10，`GOTOOLCHAIN=local GOPROXY=off GOWORK=off GOEXPERIMENT= GOFLAGS=-mod=readonly CGO_ENABLED=0`。`go list -deps -test -json ./tests/contract/foundation` exit 0 / Wait 0.067946 秒，486 包、220 个本地 Go/embed/mod 输入，150 的 delegation/groups 测试不在本闭包。最终五个精确目标同跑 exit 0 / Wait 1.679445 秒、五 PASS、stderr 空、220 输入零漂移，见 `logs/15-final-five-input-before.json`、`16-final-five.jsonl`、`18-final-input-drift.json`。首次与中间失败原 JSONL/stderr 均保留；所有 Go 进程已 Wait。149 的 `memory/context_view.go` 在本闭包保持其冻结 SHA `6642a952…22f46`。

八个本任务源码逐文件前后 SHA256/mode、来源树 `275566d3ec4318b4309c835a10951e0f9539f96008bf65724f0109a04310fd08` 见 `logs/17-final-source-checkpoint.json`；完整实际 exit/Wait 与原输出哈希见 `logs/19-command-receipts.json`。共享 API `tooling.go` SHA `a43cd597…9752c`、`resume_inbox.go` SHA `964aea3a…56c5` 已冻结给 147，运行生产/测试源码也已冻结归 Root。

本人执行 `validate-dispatch --stage return` 并 Wait，实际 exit 0，stdout 的 errors/warnings 均空，见 `logs/20-return-validation.stdout`；stderr 空。

## 问题与下一步

146 的真实 SQLite/Executor 决策持久、重启、当前撤权和失败资源释放已由定向目标证明。147 的 common/Responses/Anthropic 对模型可见后缀与旧 CP 兼容、150 的原 145 红项、Root 的合并后完整 Go/必要 race/vet 与 TS/本地联调、独立审查仍需共同验收；未运行真实 Provider、Obsidian 或目标 OS。未提交、推送、发布或归档。
