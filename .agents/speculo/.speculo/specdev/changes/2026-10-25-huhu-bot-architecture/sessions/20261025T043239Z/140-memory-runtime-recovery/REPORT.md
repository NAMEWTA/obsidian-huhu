# 140：记忆运行集成接续与消费者回归

Session: 20261025T043239Z
Task: 140-memory-runtime-recovery
Status: completed

本域作者候选；Root 共同 CLI/E2E 与独立门未签。

## 聚焦交接

本轮接续 129/134 的运行集成职责。134 冻结的 22 个集成来源中，20 个字节未变；本轮只在既有 `memory_runtime_test.go`、`memory_transaction_test.go` 增加回归，在 `qualification_test.go` 增加恢复回归，并真实运行生成器使六个 private Memory 方法可用。生产运行源码保持 134 checkpoint，六个生成输出中只有 `methods.json` 改变。全部本人启动的 Go/Node 检查均已 Wait；现冻结产品源码和输出，Go 窗口已归还 Root。

129/134 已接入的生产路径包括：默认 Core 装配与关闭、014 迁移注册、stdio proof，Executor 的短事务 Plan/Seal、Host admission、Finalize、维护 Run 唯一 writer 与候选提交，execution/recovery 的严格 manifest/安全元数据读取，以及 direct History/ModelHistory 的真实 Memory 资格过滤、最终可见来源与祖先闭包。详细旧源差异和当时未编译边界保留于 `134-memory-runtime-consumers/logs/01-source-checkpoint.json` 与 `02-checkpoint-handoff.md`；本轮以实际 Go 回执和 Root 已验旧回执补足，不把旧 source-only checkpoint 当成验收。

## 产物与验证

- `tests/contract/foundation/memory_runtime_test.go`：真实 Core Stop 先同步关闭 Memory admission，Executor 中忽略取消的运行未 Done 前 Profile/DB 不释放；Done 后可重新打开。另用默认 Core/公开 HAP hello 与真实 Router 证明六个 private Memory 方法均 advertised 且可调用，T15 两个 global 方法既不 advertised 也不能调用。
- `tests/contract/chat/memory_transaction_test.go`：控制 Seal 计划改变，外部 Host admission 后只允许一次重新 Plan/Host/Seal；第二次改变拒绝且不调用 Engine。新策略 Run 的 manifest 删除后，`GetRun` 仍可读安全元数据，严格 `ReadRecoveryInTx` 拒绝缺失 manifest。Seal fault 为可控端口注入，证明消费者边界，不冒称真实 Store 自发竞态。
- `tests/contract/recovery/qualification_test.go`：在 recoverable schema8 树旁添加并更正无关 private Memory 项，实际 Recovery ready TreeRevision/Generation 不变化。
- `contracts/hap/v0.1/methods.json`：真实 `node contracts/hap/v0.1/generate.mjs` 将 `memory.list/get/pin/correct/forget/setAutoMaintenance` 六个 implemented 从 false 变 true，其他字段不变；`memory.proposeGlobal/resolveGlobal` 仍 false。六个生成输出的 SHA 前后见 `logs/11-generation-diff.json`：schema、fixtures 与 `methods_generated.go` 均字节不变；输入 `src/modules/huhubot/api.ts` 亦字节不变；后者只生成 DTO，不编码 implemented 标志。Root 已接纳该真实单输出事实。

固定 Go 1.26.10 路径、`GOWORK=off`、`GOEXPERIMENT=`、`GOFLAGS=-mod=readonly`、`GOPROXY=off`、`CGO_ENABLED=0`、`GOTOOLCHAIN=local`。命令详情、原输出、实际退出和 Wait 时间见同名前缀日志。`02` 的 foundation+chat 实际依赖 490 包/58 本地目录，固定 244 文件及模式，检查后 `06-target-drift.json` 为零漂移；`12` 的 foundation+recovery 实际依赖 489 包/58 本地目录，固定 238 文件及模式，检查后 `16-final-fixed-input-drift.json` 为零漂移。两闭包均排除 126 的 private-memory 测试来源。最终 24 个本域来源/生成输出逐文件 SHA 与 134 差异见 `17-final-source-checkpoint.json`；其中 134 仅上述两个既有测试变更，生成输出无后续漂移。

| 回执 | 实际目标 | exit | Wait 秒 | 结果 |
| --- | --- | ---: | ---: | --- |
| `logs/02-go-list-result.json` | `go list -deps -test -json` foundation + chat | 0 | 0.150472 | 固定首次编译闭包 |
| `logs/04-core-target.json` | Core Stop、admission、真实 drain/Profile 定向测试 | 0 | 1.320994 | PASS |
| `logs/05-prepare-target.json` | Executor Plan/Host/Seal 与新 manifest 严格恢复定向测试 | 0 | 1.328156 | PASS |
| `logs/10-generation.json` | 真实 Node 生成器，Go 1.26.10 gofmt | 0 | 0.844237 | 仅 methods.json 六旗标改变 |
| `logs/12-generation-test-list-result.json` | `go list -deps -test -json` foundation + recovery | 0 | 0.144576 | 固定生成后闭包 |
| `logs/14-recovery-target.json` | 无关 Memory 不改 ready tree revision 定向测试 | 0 | 1.213153 | PASS |
| `logs/15-default-hap-target.json` | 默认 Core/HAP 六方法实际调用与 T15 不可用 | 0 | 1.503418 | PASS |

旧 129/134 已实施运行行为的 Root 回执复用 `evidence/T-14-logs/first-joint-core-return.json`：默认 Core 管理绿，11 运行目标先 10 绿、1 个新 group 预期与既有聚合状态不符；`128-history-expectation-repair-return.json` 保留旧红并证实仅修新测试预期后两个精确 group 目标绿，生产未改。`126-consumer-batch1-return.json` 记录 7 top/11 sub private 管理/短期/维护目标绿。138 的跨 job/800 subject 两个定向目标由 Root 另有 `138.../logs/06-two-target-result.json` 回执。本轮不重复这些未失效输入上的检查，也不把它们说成完整票门。

`validate-dispatch --stage return` 初次报告状态行附注不符，工具返回 126 和 `REPORT: invalid terminal status`，记录在 `logs/18-return-validation-initial.json`；改为准确 `Status: completed` 后亲自执行并 Wait，实际 exit 0、0.068096 秒、errors/warnings 均空，见 `logs/18-return-validation.json`。

## 问题与下一步

本域没有新增生产失败。尚未由本作者运行全 Go 矩阵、race/vet、正式管理 CLI、三协议本地 SDK、真实模型、Obsidian 或目标 OS；Root 正接手共同 CLI/E2E 和后续独立验收。本报告仅交 T01/T03 所委托运行接缝候选，不宣称 T14、28 票或整体 Goal 签收。无提交、推送、发布或归档。
