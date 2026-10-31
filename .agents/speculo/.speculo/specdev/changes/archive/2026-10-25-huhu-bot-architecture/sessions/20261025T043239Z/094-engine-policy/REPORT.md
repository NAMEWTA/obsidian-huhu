# 094：模型元数据与预算消费接缝

Session: 20261025T043239Z  
Task: 094-engine-policy  
Status: completed

## 聚焦交接

本轮完成原 Assistant 的协议发现与 Probe 生命周期维护，并通过真实默认 Chat SDK HTTP 消费既有预算账本。T08 common/chat、默认装配与依赖由092/093独占；本任务没有新 HAP、迁移、Probe Run 或账本，usage 生产源码未改。按 Map22/Goal21 与 [私有接缝合同](../../../evidence/T-08-logs/chat-private-contract-map22.md) 实施；本交付不是 Root 的最终代码门或现场验收。

`ListModels` 只在 Probe 的纯 selector 明确支持该协议、且凭证可用时报告 available；没有 selector 保守返回 false。`TestModel` 对明确不支持的协议在 Resolve 前返回 `ADAPTER_NOT_ASSEMBLED`，旧显式无 selector 测试注入仍可调用 Probe。

`StopProbes()` 在同一互斥门内同步拒绝新调用并取消全部已登记 context；`TestModel` 在 repo/Resolve 前登记。`ProbeDone()` 等真正调用返回，secret clear 先于登记清理与 Done。Core 对此接口的生产装配和排空由093负责，不能用本任务的受控 Probe 测试冒认全部 SDK/关闭链已通过。

## 产物与验证

最终五文件与只读 usage 摘要见 10-own-final-freeze.json（历史日志已清理：`logs/10-own-final-freeze.json`），tree SHA256 `1f9158a5f4dfb75aad33e17e55d846420c7132c4f3893277feeb7ee18cc36611`；相对05候选 sourceDrift=[]、usageDrift=[]。原始自有输入及副本见 00-own-before.json（历史日志已清理：`logs/00-own-before.json`），生产精确差异见 10-production.patch（历史日志已清理：`logs/10-production.patch`）。

| 自有最终文件 | SHA256 |
| --- | --- |
| `internal/application/assistant/service.go` | `098a8fae191f017e058f1ed04de9bd5c9f8ab61fd28832eff8866e7199dd6aa7` |
| `internal/application/assistant/ports.go` | `888801284c90cfbdfcfdd19add7c07a21a9e28b43c33c17742d539f779c8ad10` |
| `tests/contract/assistant/probe_policy_test.go` | `3b2d95f9eccc44c9838bcf91f35a79477c6ec987edc5cecb339b6b8bc737e107` |
| `tests/contract/assistant/probe_http_test.go` | `9cdfb0c1204d013097350a9532e5953efc8c0654b4479385875a9575c3c22c3f` |
| `tests/contract/collaboration-policy/chat_http_test.go` | `bcdd76d76fd8a50a65eb969b130e8989620f3b0406b6f4bf88f94ece279f41fe` |

上述路径均以 `native/huhubot/` 为前缀。两个生产文件之外只有本票三个新测试文件；没有修改原策略断言或共享合同。

已执行的定向检查均为 Go1.26.10、CGO_ENABLED=0、`-mod=readonly`：

| 证据 | 实际结果与范围 |
| --- | --- |
| [03 selector counterfactual](logs/03-selector-counterfactual-red.log) | exit1，Wait 2.681s。仅外部 overlay 恢复旧 `ListModels` 全局 Probe 谓词；Responses、Anthropic 与无 selector 注入误报 available。只证明 selector 缺口，不是旧整体 bootstrap 或 Stop 行为红灯。 |
| [04 三个生产用例](logs/04-assistant-policy-green.log) | exit0，Wait 1.195s。协议发现无网络、无 selector 显式测试兼容、取消与真正返回/secret clear 的区分均通过。 |
| 03–04 共同回执（历史日志已清理：`logs/03-04-results.json`） | 每命令实际 Wait；所采生产、锁与 Assistant 测试输入 sourceDrift=[]。 |
| [06 默认 metadata HTTP](logs/06-metadata-http.log) / 07 回执（历史日志已清理：`logs/07-metadata-result.json`） | exit0，Wait 1.509s，sourceDrift=[]。公开 Assistant→默认工厂→真实 loopback GET；列表无网络，匹配 ID 返回空 capabilities，404 原始正文/假 key 不外泄，未实现协议没有第三次 HTTP。 |
| [08 真实 SDK 预算消费](logs/08-budget-http.log) / 09 回执（历史日志已清理：`logs/09-budget-http-result.json`） | exit0，Wait 1.896s，sourceDrift=[]。仅一个永久用例；默认工厂、公开配置、真实 HTTP、实际 SQL 账本与公开根预算投影全部参与。 |

直接关闭测试先进入实际受控 Probe，再 Stop；取消发生但 held Probe 未返回时 Done 不关闭。释放 barrier 后调用返回 `MODEL_PROBE_FAILED`，调用者 secret 切片已全清，Done 才关闭。关闭后持有的 Assistant 引用仍拒绝 Background 新调用，不进入 repo/Resolve/Probe。

辅助脚本初次因错误祖先层数选择 `repo/.agents`，在生成 Go 子进程前 exit1，见 02-runner-setup-failure.txt（历史日志已清理：`logs/02-runner-setup-failure.txt`）；修正路径发现后才执行03/04。这不是产品红灯。

08的实际断言：默认预算未配时 `BUDGET_NOT_CONFIGURED`、HTTP0、attempt0；用户通过 CAS 配置后第一次真实 HTTP 完整 usage=9+4，charged=13。预留额严格等于网络捕获的最终完整 UTF-8 请求字节数+4096，实际请求 n=1。然后把 Profile 额度设成13加这一完整预留额，两个 fresh root 使用相同意图竞争：赢家实际 HTTP 被 barrier 保持，败者在赢家结束前以 `MODEL_BUDGET_EXHAUSTED` 终结且 attempt0；两根合计仅一次出站。释放赢家后，其缺失 usage 明确 unknown/estimated，并按整个预留额收费；Profile reserved归零、charged=13+完整预留额，公开 `Budget(runId)` 同样返回 unknown 和真实费用。不是固定缩小请求后构造的伪竞争。

这些新测试只使用 loopback 与私有 session-memory 假 key。首次真实 SDK 接线、故障理由传播由092实现；本票只是通过公开消费者证实它们，没有复制 SDK 序列化或新增 Attempts 接口。

原 T12 `TestPublicBudgetChangeAfterReserveFencesActualDispatchAndPreservesSettlement`、`TestPublicBudgetLastReservationEveryHTTPAttemptAndUnknownSettlement`、`TestSettlementFailureRollsBackBalancesAndCanRetryOnlyAccounting` 仍分别承担下调/暂停后的 Dispatch 门、用途/归属与重复结算、SQL 故障全回滚的受控 Port 证据。本票回读它们与未变化的 usage 当前实现，按已接纳基线复用；没有把这些旧受控 Engine/Port 用例说成本次新 SDK 全链重测，也没有重跑整包。

## 问题与下一步

没有发现需要修改 usage 生产政策的缺口，保留 Root/Profile 额度、维护隔离、当前权限/群成员/恢复/关闭门与原4/8孩子并发。未执行本票整包/race、全模块、SDK全部故障矩阵、许可检查或插件 build/lint；这些由 Root 按联合候选组织，不能用五个定向绿冒认全部验收。真实 Provider、模型能力/计价、Obsidian 和目标 OS 均未运行，保留用户现场后验。

所有自有 Go 命令均已实际 Wait，无 Node/Runner 进程；窗口每轮交还 Root。生产、测试均已停写，剩余只做报告与结构 return 回执。自有五文件由10摘要绑定；092/093后续产品更改和联合检查应使用其实际最终输入另行核对，不能把本票局部无漂移外推成全仓冻结。
