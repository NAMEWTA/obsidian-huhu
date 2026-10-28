# 144：短期输入与 schema 既有消费者迁移

Session: 20261025T043239Z
Task: 144-memory-context-consumers
Status: completed

## 聚焦交接

在 Root 的完整 Go 原红（417 固定输入，exit 1、Wait 235.686251 秒，零漂移）上迁移 T01/T03/T08/T09/T10/T16 的 16 个测试文件。只改原失败的 chat、foundation、recovery、三协议测试及 chat 同包必要的 `captureEngine.Resume` 包装；生产、API、schema、fixture、140/141 工件均未改。先 source-only，143 归还 Go 窗和冻结 `dependencies.go` SHA `2fdae080…` 后才运行精确 Go 检查。全部本人进程已 Wait，唯一 Go 窗已归还 Root。

## 产物与验证

- `chat/provenance_test.go`：新 extractive Run 要求旧 `History`/`Messages` 为空；在真实 `ShortTerm.Entries` 上核对两条原消息的 `Ref`、hash、Text、role、`recent/full`、canonical binding，并继续核有效来源持久化、UI 历史和重开后的撤权。send 撤销及 endpoint 变更负控同时要求 ShortTerm 无旧条目、旧 Context 来源不注入；独立用户可读历史仍保留。
- `foundation/default_protocol_recovery_test.go` 与三协议 engine/checkpoint/tools/protocol_edges 测试：精确计入初始 ShortTerm block，核 marker、`BindingDigest`、`IntentHash` 与首 Run 无虚构历史。原 Persona 字面量、接受 Intent 一次、Responses 原生 opaque item、Anthropic block、工具 ID/结果顺序与错误状态、usage、恢复/取消检查保留。没有把固定长度改成下界或删除原序列断言。
- `engine/chat/question_test.go`：真实 inbox 从旧 `Messages` 搬到 ShortTerm。根据 r1 原始协议请求证明 `intent_alias` 使用空 Text、原消息 metadata、原 Ref.Hash=IntentHash；首子任务请求以接受 Intent 还原显示文本，恢复后的 tool-result 轮只验绑定/原工具结果，不把末尾结果 JSON 当新 Intent。原 QuestionID、DelegationID、FromAgentID、单次 Intent 与两结果原顺序仍精确断言。
- `engine/chat/review_intent_test.go` 与同包 `checkpoint_test.go`：旧 `history_refresh` 夹具把 legacy `History` 与 sealed `ShortTerm` 并存，按新合同在第一个 HTTP 前拒绝。受控 Engine 测试 seam 现在明确用 `ShortTerm=nil` 的 legacy Run/Resume 输入，Run 旧历史、Resume 当前新历史，验证原 checkpoint 前缀不被当前值替换；正常 extractive 子例把实际 ShortTerm 交给纯 Inspector 校验绑定。没有伪造 SQL 来源、放宽 CP/决策安全断言或改生产。
- `foundation/groups_migration_test.go`、`recovery/migration_test.go`：当前精确 schema 版本 10；schema7/8 升级的全部旧表、行、列、外键、CP bytes、备份独立恢复集合与失败回滚断言保持原样。三份真实 schema8 快照分别保留 37 旧表，CP 数为 5/0/1。

逐文件 SHA256、来源树 `859c381f606f82d4d5e5f5e96b670d336e1840dd4dd842bfd38d397b378c92bf` 见 `logs/10-final-source-checkpoint.json`；原红定位、改前 16/16 与 r1 快照一致的来源和 source-only 阶段见 `logs/01-r1-owned-failure-map.json`、`02-source-only-checkpoint.json`。实际 Go1.26.10 使用 `GOWORK=off`、`GOEXPERIMENT=`、`GOFLAGS=-mod=readonly`、`GOPROXY=off`、`CGO_ENABLED=0`、`GOTOOLCHAIN=local`。`go list -deps -test -json` 覆盖六目标包，502 实际依赖包、62 本地目录、302 编译/embed/运行夹具文件及模式；末次比较仅两份本任务测试因第一次检查后修正而漂移，其他 300 不变，143 冻结生产 SHA 不变，见 `logs/05-fixed-input.json`、`09-final-input-drift.json`。

| 回执 | 实际检查 | exit | Wait 秒 | 结果 |
| --- | --- | ---: | ---: | --- |
| Root 原红 `lead-memory-regression-r1.json` | 完整 `./...`、417 输入 | 1 | 235.686251 | 原始失败与快照保留；其中有其他 owner 任务 |
| `logs/03-go-version.json` | 明确 Go 1.26.10 | 0 | 0.003461 | 工具链固定 |
| `logs/04-go-list-result.json` | 六目标包实际编译闭包 | 0 | 0.161069 | 302 文件/模式固定 |
| `logs/06-six-package-target.json` | 六包 16 个精确目标，首次 | 1 | 8.212741 | 本任务 provenance 测试字段编译错误；question 第二轮 Intent 断言错误；其余可运行目标绿 |
| `logs/07-chat-provenance-question.json` | chat 来源/撤权与 question，首次修正 | 1 | 3.556230 | provenance 错把 source ancestry 当新的 Host PreparedSource；question 错把 tool-result 轮末尾 JSON 当首 Intent |
| `logs/08-chat-provenance-question-recheck.json` | 同三目标及子例最终 | 0 | 5.411879 | provenance、send 撤销、endpoint 变更、question 均 PASS |

首次和第二次失败的完整原输出均保留。实际来源与代码显示：ShortTerm 选中的来源仍写入 Run 的 `effective_source_json`，不重复放进 `PreparedContext.Sources`；question 保存的 IntentHash 属于原首轮任务，工具结果轮末项是决策正文。修正仅限这两份测试，未将真实产品失败归为测试过期。首轮已绿的 foundation/recovery/Responses/Anthropic/chat checkpoint 目标输入未随最后两份测试改变，未机械复跑。

本人执行 `validate-dispatch --stage return` 并 Wait，实际 exit 0、0.072837 秒，errors/warnings 均空，见 `logs/11-return-validation.json`。

## 问题与下一步

本域未运行全仓复测、race/vet、真实 Provider、Obsidian 或目标 OS。Root 将对合并后的代码统一回归及独立验收；其他 owner 的 delegation/groups/collaboration-policy/events 原红不属于本写集。146 待 Root 正式派遣处理新发现的补充消息生产接缝，不在本 144 候选中改写。无提交、推送、发布或归档。
