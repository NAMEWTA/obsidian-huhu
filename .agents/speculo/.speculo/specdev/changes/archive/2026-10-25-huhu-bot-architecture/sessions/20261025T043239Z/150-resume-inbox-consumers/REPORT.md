Session: 20261025T043239Z
Task: 150-resume-inbox-consumers
Status: completed

## 聚焦交接

原 145 两个晚到补充消息红例已迁到 146/147 的可信 `Decision.ResumeInbox.Messages` 消费位置。只改 delegation、groups 各自的原测试与已有测试 helper 共四个文件；生产、API、SQL、147 common 和 145/148 历史工件均未改。Go 1.26.10 下两个精确原目标实际通过，delegation 的 active-user、active-model、waiting-user 三变体和 groups 的同文不同 ID 双补充均绿。此结果证明原消费者收到真实恢复决策，并保留原 CP、来源、Run、回执与清理断言；147 三协议 SDK、Root 完整 T14、race 与物理 CLI 仍由各 owner 单独验收。

## 产物与验证

- 源码：`native/huhubot/tests/contract/delegation/reply_sources_test.go` SHA256 `d946bd7ef06b87d36709033b5b072a822302f82426918215640f060fa8cc9a49`、mode 0600；同包 `short_term_assert_test.go` SHA256 `84ead3db0ee68b52c854a8cc3cfac11e323ab50c118f6892425b60067ba4b248`、mode 0664；`tests/contract/groups/reply_test.go` SHA256 `132d2cc8618ba6abdbe9435f8f09ec1fb2ce127bd6f6672a644186979fd7203b`、mode 0600；同包 `short_term_assert_test.go` SHA256 `462f717f85b30bbb3ffb188632423a5f45b0008e7e784ed9a0b7105b5839b6ff`、mode 0664。完整 SHA/mode 与源阶段记录见 `logs/01-source-before.json`、`logs/02-source-after.json`、`logs/03-input-before.json` 和 `manifest.json`。
- 两包 helper 均要求恢复包中消息的完整 `AgentMessage` 与真实 Reply 回执相同，`Ref.Kind=message`、ID 相同、正文 revision `"1"`、`sha256(text)`、namespace/thread 精确对应，当前 `Input.Lineage.Derived` 含相同身份且无冲突；`api.ValidateResumeInbox` 必须通过。`Input.Messages` 必须为空，children 等待的 `AnswerReceipts` 必须为空。首次 Run 封存的 `ShortTerm.BindingDigest` 与同 CP Resume 保持一致；旧 CP 正文与 child outcome 的原断言保留。
- delegation 仍检查三种发送者的当前来源、越界来源拒绝、实际 SQL source provenance、命令幂等回执、已结束模型 claim 不得再发、没有额外 Run/model 及外源 Host 零读取。groups 在原用户补充和重放之外新增第二个同正文、不同 idempotency key 的真实用户 Reply，按最新 task revision 投递；要求两个独立 message ID 都在 ResumeInbox 中，原群 CP、3 Run、一次 Resume、最终零 child slot/task pin 断言保留。
- `go version` 实际 exit 0，输出 `go version go1.26.10 linux/amd64`。唯一 Go 检查在 `native/huhubot` 下执行绝对 Go 路径，环境 `GOTOOLCHAIN=local GOPROXY=off GOWORK=off GOEXPERIMENT= GOFLAGS=-mod=readonly CGO_ENABLED=0`，命令为 `go test -p=1 ./tests/contract/delegation ./tests/contract/groups -run '^(TestTaskReplySourceBoundaryAndWaitingUserSupplementReachActualResume|TestUserSupplementToWaitingGroupMemberReachesSameCheckpointThread)$' -json -count=1`：actual exit 0、Wait 3.346339147 秒。原始 JSONL `logs/05-targeted-go.jsonl` SHA256 `ce04821718cbf2445778b538d35e8ba959328242a3966fcd37eb715ab9a9ad01`；版本和命令回执见 `logs/04-go-version.json`、`logs/06-targeted-go-meta.json`。
- `logs/03-input-before.json` 与 `logs/07-input-after.json` 固定同一 394 个 Go/SQL/HAP 输入并显示零漂移。146 的 `01-go-list.json` 静态解析不含 delegation/groups 两包；150 在 146/147 各自独占 Go 窗期间只写测试源码，没有运行 Go/Node/DB。150 自有 Go 窗所有命令均已 Wait、冻结归还。未跑整包、race、vet、Node/build、生成器、物理 stdio、真实模型、Obsidian 或目标 OS。

## 问题与下一步

本作者范围的两个原消费者目标已绿，未观察到新问题。此回执不覆盖 147 common 对 Chat Completions、Responses、Anthropic SDK 的续跑呈现，也不替代 146 对已存 Decision、撤权、恢复与持久化的独立证明。Root 在稳定共同输入上完成 T14 全量 Go/race、物理 CLI 与独立双轴审查后决定整体 Gate；用户真实 Provider、Obsidian 与目标 OS 后验仍由用户完成。本作者不提交、推送、发布、归档或写正式状态/Evidence。
