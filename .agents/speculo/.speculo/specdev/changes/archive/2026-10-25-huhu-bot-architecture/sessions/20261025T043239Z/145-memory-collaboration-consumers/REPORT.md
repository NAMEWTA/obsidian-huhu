Session: 20261025T043239Z
Task: 145-memory-collaboration-consumers
Status: completed

## 聚焦交接

已将 T14 完整 Go 首轮中本任务范围的旧 History/Messages 消费测试迁到真实 sealed ShortTerm、固定 Resume Decision 和当前资格合同；本次只改 12 个许可测试源码，未改生产、API、迁移或其他测试。Go 1.26.10 下原失败集合的 12 个顶层定向目标实际执行，9 绿、3 红；两组晚到用户补充仍是可复现的产品缺口，另一个问答在通过真实答案 Decision 后暴露中层子任务无法从已成功叶子恢复，已保留失败诊断。三类红均未放宽断言或伪装为通过，Root 已接收交接并安排产品 owner；本 REPORT 是作者候选交回，不宣称 T11/T14/Goal 或共同门完成。

## 产物与验证

- 改动范围：`native/huhubot/tests/contract/delegation/` 下 6 个测试源码、`tests/contract/groups/` 下 5 个、`tests/contract/collaboration-policy/chat_http_test.go` 1 个；逐文件 SHA256 见 `manifest.json`。`logs/source-checkpoint.json` 固定原 T14 30 条失败记录及源码阶段；没有重跑不相关目标。
- Inbox 断言核验真实 `ShortTerm.Entries` 的 `Use=inbox`、`OriginKind=thread_message`、`Ref.Kind=message`、Message.ID/线程/namespace、完整文本或合法 intent alias，且原始 `Input.Messages` 保持为空；群历史断言检查实际选中 public recent/working summary、来源 ID/hash 和晚到顺序。原不继承私聊、群代与来源范围、贡献者撤销、费用账户、独立意图均保留。
- `tasks.reply` 问答的真实答案位于 `Decision.Children[0]`：测试核验其 Text、精确 reply message ID、revision、SHA256、线程及来源。队列撤权固定为当前 `SelectInTx` 检查顺序下的 `RECIPIENT_NOT_GRANTED`，同时核验数据库 grant 已撤销，并保留 failed-commit 回滚、零 child slot/pin/HTTP 与失败结果无正文。HTTP 预算测试以两次实际序列化请求字节作额度控制，只规范化新建 Profile 的 SessionID/WorkThreadID/BindingDigest；真实 HTTP、账本和最后额度仅一个成功断言保持。
- 工具链实测 `/home/wta/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.26.10.linux-amd64/bin/go version` 为 `go version go1.26.10 linux/amd64`。三次 Go 检查均使用 `GOTOOLCHAIN=local GOPROXY=off GOWORK=off GOEXPERIMENT= GOFLAGS=-mod=readonly CGO_ENABLED=0`，在 `native/huhubot` 下运行，无编译失败。首轮精确 12 顶层目标命令、原 JSONL、exit 1、Wait 13.026 秒见 `logs/01-targeted-go-meta.json` 与 `logs/01-targeted-go.jsonl`；仅 `Question.../waiting-user` 的诊断复测两次分别 exit 1、Wait 9.598/9.593 秒，见 `logs/02-question-waiting-*`、`logs/03-question-waiting-*`。
- Go 输入先后快照为 `logs/01-targeted-input-before.json`、`logs/04-targeted-input-after.json`：同一 389 个 Go/SQL/HAP 输入完整回读，期间唯一变化是本任务的 `delegation/reply_sources_test.go` 增加失败态 SQL 诊断，所有生产输入零漂移。Go 窗已冻结归还。未运行整包、race、vet、Node/build、生成器、物理 stdio、真实模型、Obsidian 或目标 OS。

## 问题与下一步

- `TestTaskReplySourceBoundaryAndWaitingUserSupplementReachActualResume` 的 active-user、active-model、waiting-user 三子例及 `TestUserSupplementToWaitingGroupMemberReachesSameCheckpointThread` 仍红。晚到补充已持久化并有有效 lineage；原 sealed ShortTerm 对应初始 CP，当前 `execution/context.go` Resume 清空 `Input.Messages`，`Decision.Children` 又没有这条普通补充，真实 Engine.Resume 观察为空。这与问答答案已进入 Decision 的情况不同，须由产品 owner 加入经资格重查、去重、持久化的恢复增量，不能回灌或改写 sealed 前缀。
- `TestQuestionTaskReplyUsesActualSenderScopeAndSupportsWaitingUserAnswer/waiting-user` 在实际 answer Decision 文本、message ID/hash/revision/线程验证通过后，叶子 Run `succeeded` Rev 4，中层 B 仍 `waiting_children` Rev 4 `WAITING_children`、parent result `waiting` 且 admission open；root 保持 `waiting_children` Rev 8 `CHILDREN_ACTIVE` 达 8 秒。两次同一子目标复现。具体 Claim/ReadyParent 拒绝原因尚未实测，交 Root 的恢复 owner 追查；测试保留红与失败时状态诊断。
- Root 继续产品窄修复、共享 Go/race 和独立审查。用户真实模型、Obsidian 与目标 OS 后验仍由用户完成；本作者无提交、推送、发布或归档。
