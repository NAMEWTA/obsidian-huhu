# 问答后记忆恢复：149 作者交回

Session: 20261025T043239Z
Task: 149-memory-question-restore
Status: completed

## 聚焦交接

已修复实际命中的 Memory 恢复拒绝：合法 `intent_alias` 的可选显示 span 经 JSON 往返变为 nil，而独立 SQL 列保留空数组；原比较把两者判为不同，导致 `CONFLICT / MEMORY_INPUT_STATE_INVALID`。唯一生产改动为 `native/huhubot/internal/adapters/outbound/sqlite/memory/context_view.go`，另新增本域 `alias_restore_test.go`。原 waiting-user 消费者、8 秒等待、恰两次 Resume、原 CP 与来源合同、API/Executor/usage/grants/common/DDL/模块锁均未改。本报告交回 149 作者候选；Root 共同回归、协议 E2E 与独立审查另行验收。

根因由原消费者的单变量观察和实际对照确认：

1. 在 `readContextEntries` 原 span 比较分支临时增加无正文观察；其他 ID/kind/representation/revision/Text-null 检查已先通过。原 waiting-user 实际失败时命中 82 次，唯一观察为 `repr="intent_alias" viewNil=true viewLen=0 sqlNil=false sqlLen=0 shortPresent=true`。没有输出正文、凭证或工具参数。见 诊断原日志（历史日志已清理：`logs/06-span-diagnostic.jsonl`） 与 观察 patch（历史日志已清理：`logs/05-observer.patch`）。
2. `ShortTermEntry.Spans` 的合法 alias 是非 nil 空数组；`sealEntries` 将其复制进 View，同时保存 `spans_json=[]`。View 的 `sourceSpans` 带 `omitempty`，metadata 解码因此得到 nil。`reflect.DeepEqual(nil, [])` 的失败属于可选显示元数据往返，并非正文修订变化。question 的 metadata revision 与稳定正文 Ref revision 不可混同。
3. 清除观察后，原完整生产字节再次跑原消费者仍失败。该次文件名历史上叫 `08-original-fixed`，实际是**未修生产的干净基线红**：准备脚本恢复旧字节后误断言 reflect 调用总数只有一处，断言失败但后续命令仍运行。输入 ZIP 证明编译的是旧 SHA；完整输出与 分类（历史日志已清理：`logs/08-run-classification.json`） 保留，没有将其冒称修复后的失败或绿色。
4. 仅将可选 View 与 SQL spans 的比较改为 `slices.Equal` 后，未改原 waiting-user 成功，原两次 Resume 和真实 answer ID/hash/revision/thread/来源断言通过。新增真实 Core 消费者在 question 仍为 delivered、metadata revision 仍为 1、尚未 answer 时便读取同一个 alias；该正控也成功，独立排除了“必须 metadata revision+1 才出错”的解释。

修复只按 span 元素比较可选显示元数据，保留非空 span 的精确比较。模型输入的非 nil Spans、原 `ShortTermEntry` 完整相等、namespace/thread、正文 Ref/hash、当前来源权限、`ValidateShortTermOriginal`、canonical binding 和持久 digest 比较全部保持。没有更新已 seal 输入、修改来源 revision、重新选择前缀或把错误转为空成功。最小 patch（历史日志已清理：`logs/07-fix.patch`） 与 因果/证据范围（历史日志已清理：`logs/17-causal-and-scope-evidence.json`） 可逐项回读。

## 产物与验证

| 源码 | 修改前 | 最终 |
| --- | --- | --- |
| `memory/context_view.go` | 17434 bytes、0664、`c9de8cb9a1a45b311f16c7a00fddeaebb80bedabab614d16157a3b24bd4f98ad` | 17594 bytes、0664、`6642a95211d695d0d20bcd8c64fa1f6ceb64db48a28813254651baf745e22f46` |
| `tests/contract/private-memory/alias_restore_test.go` | 不存在；本次新增 | 12752 bytes、0664、`2ff21198b84a568d9d0c770e51a4e85eb45989af5321d08af33c3e089aad5bac` |

新增测试通过真实 Core、公开 Agent/Conversation/Collaboration/Memory API、实际 SQLite 和同一个 Memory reader；仅 Engine 是受控进程内实现，没有 Provider 请求。合法数据由实际运行生成，坏 span/manifest/正文负控在各自 SQL 事务内修改并回滚，不手工注册 DDL 或构造成功 manifest。新增两个顶层目标：

- `TestIntentAliasContextRestoresBeforeAnswerAndRejectsCorruptSpans`：公开 context 能读到原 alias；省略 View spans 和显式空 View spans 两种合法编码均恢复与实际初始 ShortTerm 完全相同的输入；非空 SQL span、模型 nil Spans、不同 manifest thread、被改源正文、外 principal 共五种负控拒绝且不返回模型输入。回滚后公开 answer/原 CP Resume 正常完成，恰一次 Resume，实际 slots/pins/wait edges 均零。
- `TestIntentAliasRestoreRechecksForgottenCurrentMemory`：真实自动回忆已消费的 private item 经公开 Forget 后，`ReadContextInTx` 与 `ReadInputInTx` 都返回 `MEMORY_FORGOTTEN` 且无正文。公开 Cancel 后实际 Core `WaitClosed`，两 Run 均 canceled/admission closed、slots/pins 零、可调度 parent 零、Resume 零。

实际使用绝对路径 Go1.26.10，先执行并保存 `go version go1.26.10 linux/amd64`。环境为 `GOTOOLCHAIN=local`、`GOWORK=off`、`GOEXPERIMENT=`、`GOFLAGS=-mod=readonly`、`GOPROXY=off`、`CGO_ENABLED=0`。所有测试串行、`-p=1 -count=1 -timeout=60s -json`；60 秒是命令级上限，原消费者内部 8 秒没有修改。

| 阶段/目标 | exit / 整个命令实际 Wait | 包时间与结果 | 原始证据 |
| --- | --- | --- | --- |
| 原 waiting-user，仅临时观察 | 1 / 12.043544911s | 8.153s；真实拒绝分支命中 | 06 result（历史日志已清理：`logs/06-span-diagnostic-result.json`） |
| 原 waiting-user，清理后的旧生产 | 1 / 9.902396928s | 8.160s；干净基线红，文件名不代表实际字节 | 08 result（历史日志已清理：`logs/08-original-fixed-result.json`） |
| 原 waiting-user，最小生产修复 | 0 / 1.961521358s | 0.206s；1 top / 1 sub，完整原目标成功 | 09 result（历史日志已清理：`logs/09-span-fixed-result.json`）、JSONL（历史日志已清理：`logs/09-span-fixed.jsonl`） |
| 新 alias 两目标与旧 context 隔离目标初测 | 1 / 1.750951627s | 0.382s；2 top / 9 sub 通过，仅额外历史 edge 假设失败 | 11 result（历史日志已清理：`logs/11-alias-controls-result.json`）、分类（历史日志已清理：`logs/12-failure-classification.json`） |
| 收窄额外取消断言后的两个新目标 | 0 / 1.473828424s | 0.200s；2 top / 9 sub 全通过 | 13 result（历史日志已清理：`logs/13-alias-controls-fixed-result.json`）、JSONL（历史日志已清理：`logs/13-alias-controls-fixed.jsonl`） |

原目标全名为 `TestQuestionTaskReplyUsesActualSenderScopeAndSupportsWaitingUserAnswer/waiting-user`。复用且在 11 实际通过的旧目标为 `TestActualContextIsolationExcerptsAndFragmentPagination`，覆盖真实隔离/摘录/分页；仅修改新增测试的取消断言后没有无理由重跑这个已绿目标。原始两次 Resume 是三 Run 原消费者的证据；slots/pins 和正常 wait-edge 零是新增两 Run alias 消费者的 SQL 证据。原三 Run 源码本身没有 slots/pins SQL 断言，不把两者合并冒称同树核验；该精确边界已另发 Root。

初测唯一额外失败是我给未答取消树附加了“全部历史 wait_edges 必须删除”的假设，超出 149 合同；并非 span 修复引入的产品错误。Root 确认后只修该新增测试：正常回答树仍要求 edge 零；取消树要求全部终态/closed、实际 producer 结束后 slots/pins 零、无可调度等待、任何残留 edge 的两端均属于 closed canceled 树。实际记录历史 edge=1、schedulable parent=0。`nextReadyParentInTx` 当前只选择 waiting_children 且 admission 未关闭的父 Run。保留 原测试完整字节（历史日志已清理：`logs/12-alias-controls-before.go.txt`） 和 断言范围 patch（历史日志已清理：`logs/12-assertion-scope.patch`）；没有修改 usage/effects 或把历史边删除扩为此次产品要求。

两次真实 `go list -deps -test -json` 均为 483 包；仓库实际编译/embed/锁输入分别为 199（delegation）和 204（private-memory），完整外部模块/toolchain 选择保留在原 Go list。5 次测试输入全程 drift=[]；5 个不可变 ZIP 的 199/199/199/204/204 文件均已逐字节/SHA/mode 复核，见 归档核验（历史日志已清理：`logs/15-archive-verification.json`）。原 delegation 文件 SHA 一直为 `a58064f3ac83296d4ad5acdceb32021c45cdd5c64e987c5857668de71df52b19`，模式0600。

2 源冻结（历史日志已清理：`logs/14-final-source-freeze.json`） tree 为 `dde201f0192b46b6e4672f33f64b8d4950372db588b667f15e4fcbca817b9c38`；与143已接纳30源比较，仅 context_view.go 改变，加新测试后31源 tree 为 `79c1a89b47fe8754892ecbd9edb36179d28582fe025373ef23ca925b91845b86`，见 逐源对照（历史日志已清理：`logs/16-domain-source-comparison.json`）。143 的 dependencies.go 保持 `2fdae080990d702d2d8cc41ec3e2d5487985c1821d28fd87b06a1b0875c75d0e`；旧 REPORT/manifest/return 不动。唯一新增生产 import 是标准库 slices，无 build tag/embed/模块锁/迁移变化。临时诊断已清除，保存的旧字节、诊断字节和最终绿输入明确分开。所有 Go/test/Core 已实际结束，无自有 HTTP 子进程，源码停写且已向 Root 归窗。

## 问题与下一步

本次实际 span 拒绝和本域当前资格负控已闭合。Root 继续共同稳定候选的回归与独立审查；原三 Run 同树 slots/pins 若要求额外 SQL 证据，应在共同窗补观察，不能由终态自动推断，也不能修改只读原消费者降低要求。新增两 Run 资源控制的范围如上。

取消树残留的是 closed 历史 edge，本次实际不可再调度；后续 T17 purge 按其合同覆盖这些持久关系。本任务不扩为 T16 调度/清理修复。当前未跑全部 delegation/private-memory、race、vet、三协议 SDK/CLI、800性能或真实模型/Obsidian/目标 OS。祖先算法未改，143既有性能/128闭包证据保留；共享146/147代码独立进展不由本报告代验。真实现场由用户后验，未访问凭证。Return 仅校验交接结构，行为结论来自上述实际日志与冻结输入。
