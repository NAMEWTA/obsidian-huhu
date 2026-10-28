# 内部恢复检查的可信原请求透传

Session: 20261025T043239Z
Task: 101-recovery-intent-foundation
Status: completed

## 聚焦交接

按冻结 [TASK](TASK.md)、[Map24/Goal23 精确窗口](../../../evidence/T-08-logs/chat-repair-map24.md) 与 Root 原生派遣，沿已实际读取的 dev、测试/架构、SpecDev I 实施/错误/可靠性规则，只关闭 F-098-01 的原请求供给接缝。本作者不维护 Engine 的语义否定控制或原始 SSE UTF-8 修复，二者由100原owner实施。三生产文件与一新增测试已停写，Root唯一窗口中的精确测试已实际通过；正式联合验收由Root组合。

## 产物与验证

00 读取与生产初始字节（历史日志已清理：`logs/00-input-and-production-before.json`）核 TASK/正式窗口、098完整报告、两个真实探针源码/原始log/结果及精确SHA。098 F-098-01独立红（历史日志已清理：`../098-chat-review/logs/01-checkpoint-result.json`） actual1/Wait2.240s：原Intent被替换后Inspector仍接受并进入第二次真实SDK请求；F-098-02独立红（历史日志已清理：`../098-chat-review/logs/02-utf8-result.json`） actual1/Wait0.929s归100的字节准入修复。历史原件不改，无必要不制造重复红。

01 三生产精确patch（历史日志已清理：`logs/01-three-production.patch`）与稳定接缝摘要（历史日志已清理：`logs/01-production-interface-stable.json`）：

- `api/recovery.go` 仅两内部结构 `RecoveryInspection` / `CheckpointInspection` 增加 `Intent string`。
- `sqlite/execution/recovery.go` 在原 `ReadRecoveryInTx` 事务、原同一 SELECT 同时读取既有 `execution_runs.intent` 与 `execution_position_json`，不新增表、正文事实源或第二次查询。
- `tooling/broker/recovery.go` 向纯 Inspector 原样传 `q.Intent`，不从CP复制/计算替代基线。

三生产已先通知 Root/100 稳定摘要，再写新增foundation测试；没有改公共Run/HAP/生成器、SQL迁移、锁、bootstrap、T16生产/测试或其它文件。

02 自有四文件冻结（历史日志已清理：`logs/02-own-before-checks.json`） tree `3661506f7b1bd3dcfb80f7e4ebdf4aa5facd45e5381309f9ef85893147796fff`；新增测试为 `TestRecoveryInspectionKeepsAcceptedIntentThroughRepositoryAndBroker`。通过公开真实受理、审批与Blob CP发布、公开reject、实际Engine.Resume后停止/Done、同Profile重开启动检查及公开Recovery.Get，捕获真实Broker送给受控纯Inspector的载荷。CP故意含不同decoy intent，断言收到原Unicode/换行Intent及原Run/Session/config/CP/已完成decision；同时检查没有新工作、attempt或Host动作。没有SQL改状态制造可恢复事实。该受控引擎证明内部透传，不冒充真实Chat语义拒绝或SDK恢复验证。

100定向normal/race实际Wait后，Root明确授予本作者单例normal窗口。03 实际输入（历史日志已清理：`logs/03-single-case-input.json`）固定178个internal Go/内嵌SQL、foundation测试Go与锁，tree `697e1744984812f4e7cdc68057e3ddd69bb707ef8323ad5732f896931ee87744`。

在 `native/huhubot` 实际执行：

```sh
GOTOOLCHAIN=go1.26.10 GOFLAGS=-mod=readonly GOWORK=off GOEXPERIMENT= CGO_ENABLED=1 go test -mod=readonly -p=1 ./tests/contract/foundation -run '^TestRecoveryInspectionKeepsAcceptedIntentThroughRepositoryAndBroker$' -count=1 -timeout=60s -v
```

[04 完整原始日志](logs/04-single-case.log) / 结果（历史日志已清理：`logs/04-single-case-result.json`）：首次actual exit0/Wait2.037s，case0.08s、sourceDrift=[]。两次纯Inspector（启动核查与公开资格查询）均实际读取完整原CP，收到原受理Intent；原Run/Session/config/CP/phase及已完成拒绝decision一致。SQL只读核1Run/1CP/1completedcontinuation/attempt0，实际Run1 Resume1 Host0；没有SQL状态修改或新模型调用。两个Core都RequestStop并WaitClosed/Done，选择的测试没有子进程、HTTP或SDK producer。实际Wait后立即交还Root窗口，不再产品检查。

最终 05 四文件清单（历史日志已清理：`logs/05-own-final-source.json`） tree `3661506f7b1bd3dcfb80f7e4ebdf4aa5facd45e5381309f9ef85893147796fff` 与完整精确patch（历史日志已清理：`logs/05-final-own.patch`）保存全部新字节及原三生产来源；四文件相对02均无漂移。该清单是本作者精确写集，03才是该次实际编译/执行输入，不冒充整个联合候选。

## 问题与下一步

本票精确透传测试首次通过，无本作者新增行为失败或待改源码；检查清理和正式return结构回执见本目录logs。098原两实际红按原件复用，未被末次绿覆盖。100的实际Chat否定控制/并发normal-race属于其真实作者证据，本作者不重复跑同一纯透传测试race、整包/全module或旧大队列；Root按实际影响组合。未运行schema生成、插件build/lint或许可重算，本次没有这些输入变化。当前不承诺无可信旧历史基线的完整历史真实性，不机械比较全部刷新history。

真实Provider/Obsidian/目标OS均user-owned/not-run，无提交推送发布归档。正式状态、Root E2E/独立复审和票/Goal完成仍由Root组合，本作者只交精确候选与真实证据。
