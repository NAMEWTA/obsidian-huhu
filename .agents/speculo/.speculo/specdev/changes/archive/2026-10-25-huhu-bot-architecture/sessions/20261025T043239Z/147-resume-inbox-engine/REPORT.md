# 147：可信恢复补充消息的共同 Engine 消费者

Session: 20261025T043239Z
Task: 147-resume-inbox-engine
Status: completed

## 聚焦交接

完成本票共同 Engine 与 Responses/Anthropic checkpoint 的最小消费修复。新正文仅取 146 已冻结的 `Decision.ResumeInbox`；在原 pending 工具结果的一个固定位置写入可选 `resumeInbox`，不追加后来 user message，不修改 sealed ShortTerm、Intent、BindingDigest、初始 CP 前缀、协议身份或外层编码。五个生产文件、一个 common SDK 消费者测试已冻结；未改 API、SQLite、Executor、各 driver 行为、锁文件或旧 fixtures。Root 已接回唯一 Go 窗口，并明确由整体回归及真实 TS/HAP/default CLI 三协议 E2E 验证 146+147 的实际组合，不扩大本票永久 Core 测试。

## 产物与验证

`common/resume_inbox.go` 从初始 `ShortTerm.Use=inbox` 完整正文身份、旧 CP 显式 `resumeInbox.Messages[].Ref/AnswerReceipts[].Ref` 建立已呈现集合。身份按消息 ID 加完整 body Ref 比较；完全相同者跳过，同 ID 不同 revision/hash/线程者拒绝，同正文不同 ID 保留。已完成批次的 saved Result 会被清空，因此读取历史 tool messages 的显式 marker，而非只读当前 Batch。普通 recent/working_summary、任意 `Children.Derived` 或相同正文不被用来猜测已投递。

question receipt 先绑定当前 pending 的 `WaitForIDs[j]` 与对应 `Children[j]`，验证正文 hash 和答案自身 ID/hash/线程成员；SQL 已由 146 核实可变行 metadata revision，消费者保留稳定正文 revision `"1"`。答案正文仍走原 Children 路径，receipt 本身不含正文；下一次等待可按该显式 receipt 排除 inbox 中重复答案。approval 后缀在原对应结果，children/question 后缀只在第一个 pending index，其他工具结果不复制。过滤创建新值，不改原持久 Decision。

`common/checkpoint.go` 的已呈现集合仅为非序列化字段；`common/tools.go` 保持字段缺省省略，并在最终完整工具结果编码后继续执行原 256 KiB 上界，CP 仍执行原 1 MiB 上界，不截断。Responses/Anthropic 的既有 allowed-key 集合只新增 `resumeInbox`，存在时必须通过 common 的严格纯校验：API 有界 DTO、精确字段投影、UTF-8、Unicode 标量、null/大小写别名/未知字段/重复 key。字段缺省继续接受旧格式，未放宽 native opaque state、工具 ID/顺序或旧 CP 外层规则。

本票实际检查均固定 Go 1.26.10，`GOTOOLCHAIN=go1.26.10 GOWORK=off GOEXPERIMENT= GOFLAGS=-mod=readonly CGO_ENABLED=0 GOPROXY=off`。实际 `go list` 的标准库路径指向 `toolchain@v0.0.1-go1.26.10.linux-amd64`。每轮完整命令、58/57 输入 SHA/ZIP、stdout/stderr、实际 exit/耗时/Wait 和漂移结果均保留在日志。

| 证据 | 实际结果与性质 |
|---|---|
| `02-sdk-closure` | exit 0 / Wait 0.130127 秒；423 包，本仓库只含 common/chat/responses/anthropic/httpcall/api 六目录，无额外 embed/Error/缺失输入。 |
| `03-sdk-red` | **有效产品行为红**，exit 1 / Wait 1.694573 秒。三个真实 SDK 均已完成 HTTP1→CP1→合法 Decision→HTTP2/CP2，但实际工具结果仅有原 denied/effectId/reason，缺补充正文。编译、SDK 与 fixture 前置成功；无编译红或 fixture 红冒充产品红。 |
| `04-green-closure` | exit 0 / Wait 0.119536 秒；相同六目录、423 包，新增 helper 未扩大本仓库闭包。 |
| `05-sdk-green` | exit 0 / Wait 1.653678 秒；原三协议双等待用例转绿，HTTP3/Invoke2，初始 inbox 不重注，原消息 ID 只一次，同文新 ID 保留，原 CP 初始前缀逐字不变。 |
| `06-resume-controls` | exit 0 / Wait 1.082316 秒；四顶层全部 PASS。三 SDK question 自身 receipt/metadata revision7 与 body revision1/同文祖先不同 ID/跨下一等待去重；三协议各七种非法包与最终结果大小负控，均无新增 Resolve/HTTP/Invoke，失败 body-free；另有严格 marker JSON 负控。 |
| `07-legacy-sealed-cp` | exit 0 / Wait 0.932132 秒；旧 Chat 原 fixture 逐字、纯 Inspector、实际 Resume，以及 sealed context/CP 篡改拒绝控制通过。 |

全部命令实际 Wait，无超时，stderr 均空，各轮 sourceDrift 均空；最后 58 输入仍零漂移。`00-before-owned-seams.zip` 保存实施前原字节/mode，`08-green-owned-source.zip` 保存最终六源，`09-owned.patch` 是相对真实原字节的完整本票 diff。前后逐源 SHA/mode、最终输入、命令回执及只读来源见 `manifest.json`。原四个 Chat v1 fixtures 未写入或重生，`common/engine.go` 保持本票原 SHA。

验证层次：本票三协议用例直接消费实际 SDK 与 loopback HTTP，Attempt/Checkpoint 为明确的 Engine-port fixture，不冒称实际账本/SQL 身份资格；146 最终报告的真实 Core/SQLite/Executor 持久、重启、当前撤权与失败释放证据复用其原责任边界。本票不重复运行已有效旧红。145 原回归断言迁移由 150 负责，本票未改。

本人已执行 `validate-dispatch --task 147-resume-inbox-engine --stage return` 并实际 Wait，exit 0，errors/warnings 均空、stderr 空，见 `logs/10-return-*`。这是交回结构检查，不替代上述真实行为证据。

## 问题与下一步

本票限定实现与窄检查完成并冻结，无活跃 Go/Node/DB 检查。Root 接续完整回归、实际三协议 CLI/SQLite 组合、适用 race/vet 与独立 151 双轴审查；本报告不预签这些结果。未跑真实 Provider、Obsidian 或目标 OS，未提交、推送、发布或归档。
