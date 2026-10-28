# 凭证通道并发测试就绪维护

Session: 20261025T043239Z
Task: 157-credential-channel-barrier
Status: completed

## 聚焦交接

唯一改动是 [channel_test.go](/home/wta/orca/workspaces/obsidian-huhu/bot/native/huhubot/internal/adapters/outbound/credentials/channel_test.go:170)：每次发送私有 Register 帧后，用原 `time.Second` barrier 等待对应真实 backend entered，再发送下一次。8 个实际 backend 仍在等待各自的 ctx 取消，第 9 帧才检验通道拒绝；`ServeChannel` 返回仍经过真实 worker Wait。原 private hello、Provider/catalog、请求期限、第 9 帧及关闭断言全部保留。

这是 Root 接纳的**测试就绪步骤维护**，不是生产修复；原 Root r3 偶发红的原因仍 **unconfirmed**。修改前 SHA256 `0a8cf1d4aacb441526c3a0fded788d100702ebe7ac0909b5431193b84faea85d`，最终 SHA256 `286ef1e481d4af296873a4ad65332c6a65b8ac721d6a2312440a9ee92ea3b9a0`。完整 before（历史日志已清理：`logs/06-channel-before.go.txt`）与最终最小差异（历史日志已清理：`logs/06-channel-barrier.patch`）保存，实际字节与先交 Root 的 05 候选完全相同。所有生产、API、SQL、锁和其他测试未改。

## 产物与验证

沿当前 workspace/catalog、`dev`、SpecDev I 的错误处理与测试可靠性合同执行。先回读 Root [r3 原始结果](../../../evidence/T-14-logs/lead-memory-regression-r3.json)和[原日志](../../../evidence/T-14-logs/lead-memory-regression-r3-normal.log)：actual exit1 / Wait 198.577880238 秒，428 输入无漂移；本目标在 1.04 秒以 `worker fixture not ready` 失败，尚未发送第 9 帧。原输出没有实际 Register/catalog fault，不能断言是 Reserve 失败。

先将同一 428 项真实源码、SQL、JSON、锁和夹具按 bytes + mode 复制到独立 `/tmp` 副本；原输入（历史日志已清理：`logs/01-input-before.json`）对 Root 全部逐项匹配。只在副本包装真实 catalog 的 Reserve/Lookup，原实现照常被调用、原错误原样返回，仅记录错误类型、SQLite Code、api.Fault Kind/Reason、ctx 和进入计数，不打印 secret。观测没有替换 Provider 或伪造成功。

- [单次原目标观测](logs/03-observe-original.log)、命令/Wait/指纹（历史日志已清理：`logs/03-observe-original-result.json`）：actual exit0 / Wait 0.823082972 秒，entered8 / Reserve8 成功 / Lookup 无失败。
- [一次有界 32 轮观测](logs/04-observe-bounded.log)、回执（历史日志已清理：`logs/04-observe-bounded-result.json`）：actual exit0 / Wait 1.518862942 秒，32 轮全部同上。为减少观测扰动，第二轮只即时记录失败，末尾记录计数。
- 共 33 轮未捕获失败，不能推导原事故根因；Root 明确结束复现，选择只维护就绪顺序。没有继续增加控制、重试 catalog 错误或延长期限。结论边界（历史日志已清理：`logs/05-observation-summary.json`）、两次实际观测源码（历史日志已清理：`logs/03-observed-channel-test.go.txt`） / 第二轮源码（历史日志已清理：`logs/04-observed-channel-test.go.txt`）保留。

156 固定旧审查输入交回、Root 短 E2E actual Wait 后才获得唯一文件写入与 Go 窗口。随后在主仓实际新输入运行以下检查，无 overlay：

| 范围与实际参数 | 实际结果 | 证据 |
| --- | --- | --- |
| `go test -mod=readonly ./internal/adapters/outbound/credentials -run '^TestPrivateChannelClosesAtNinthInFlightAndWaitsForWorkers$' -count=1 -v -timeout=60s` | exit0 / Wait **0.637645259 秒** | [原日志](logs/08-target-normal.log)、回执（历史日志已清理：`logs/08-target-normal-result.json`） |
| `go test -mod=readonly ./internal/adapters/outbound/credentials -count=1 -v -timeout=90s` | exit0 / Wait **8.801785009 秒**，23 个顶层 PASS，0 skip | [整包原日志](logs/09-package-normal.log)、回执（历史日志已清理：`logs/09-package-normal-result.json`） |
| `go test -mod=readonly -race ./internal/adapters/outbound/credentials -run '^TestPrivateChannelClosesAtNinthInFlightAndWaitsForWorkers$' -count=1 -v -timeout=60s` | exit0 / Wait **2.987204550 秒**，无 DATA RACE | [原日志](logs/10-target-race.log)、回执（历史日志已清理：`logs/10-target-race-result.json`） |

全部使用绝对 `/home/wta/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.26.10.linux-amd64/bin/go`，`GOTOOLCHAIN=local`、`GOWORK=off`、`GOEXPERIMENT=''`、`GOFLAGS=-mod=readonly`、`GOPROXY=off`，normal CGO0、race CGO1；[实际 version](logs/07-final-go-version.log)和[真实依赖 go list](logs/07-final-go-list.log)保存。工作目录 `native/huhubot`。整包还覆盖注册/删除/EOF、unsafe/partial/slow-consumer 帧、Provider 关闭、受控 worker 超时/崩溃/退出及清理，不把这些合成 fixture 说成用户 OS 凭证验收。

最终 428 项输入（历史日志已清理：`logs/06-input-after-repair.json`） tree `5aea3acc6fdc06268489ea69f864dfc4a9d2ab9af4851423cc7fbb42df19642e`；tree 算法是按路径排序拼接 `sha256 + 两个空格 + path + LF`（含末尾 LF）后取 UTF-8 SHA256，不是 JSON 摘要。每条命令都前后逐项核 bytes/mode，drift=[]；相对 Root r3 精确只差该测试。原生产测试输入完整，dist 未加入实际 Go 输入；检查确认当前 module 的 Go/SQL/JSON/锁无漏项。汇总（历史日志已清理：`logs/11-final-check-results.json`）保留各命令 PID、真实退出、Wait 和边界。

## 问题与下一步

全部诊断和验证进程已实际 Wait，源码停写，Go 窗口已明确归还 Root；后续仅报告、冻结和 return 结构校验。原事故没有底层 fault 证据，因此保持未确认，不将本次测试维护表述为 catalog 或生产根因修复。没有运行新的全仓 Go / 插件 build / Node / 用户真实 Provider、Obsidian 或目标 OS 验收；这些不冒充已完成。

本任务仅交付 T02 测试维护，不关闭 T14、T02 或 Goal。Root 负责组合原 r3 各包证据、本次 credentials 新输入证据、后续审查与正式状态；128 完整任务仍按原记录未完成。
