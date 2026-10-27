# 默认真实装配的旧空模型负控维护

Session: 20261025T043239Z
Task: 096-default-model-fixture
Status: completed

## 聚焦交接

按冻结 [TASK](TASK.md) 与 [Map23 精确窗口](../../../evidence/T-08-logs/default-model-fixture-map23.md)，沿 dev 测试/架构及 SpecDev I 实施/错误/可靠性合同，只维护原 T03 `tests/contract/chat/workflow_test.go` 的一个尾段。当前默认真实 Chat Engine 已装配，seed 未配置模型应诚实报告 `MODEL_DRAFT_INCOMPLETE`；旧 `ADAPTER_NOT_ASSEMBLED` 占位器预期不再适用。

实际分支 `NAMEWTA/bot`、HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`，复用 current 工作区；Map23/Goal22 及 Root 原生派遣为精确授权，不改正式状态。093 已完成交回并保持冻结；本次没有修改生产、Executor、锁、API、其它测试或任何 093 产物。

## 产物与验证

[00 初始字节与写集](logs/00-read-input-and-scope.json)核原测试 SHA `f71fde5f5b470d3bf54a20441af4ec22f4e7d2d92d4ce538fe795b280e19951b` 与 TASK SHA，保存[完整原字节](logs/00-workflow-before.go.txt)。[精确 patch](logs/01-workflow.patch)只把默认尾段拿到真实 locator、更新缺配置理由，并新增按实际 RunID 查询持久 `model_attempts` 必须为 0；原 `Usage == nil`、两个 `none/partial` 子例与其它全部函数字节不变。

默认空模型/不支持协议的原生产目标红由 092 实际 [13 原始结果](../092-engine-chat/logs/13-model-unavailable-red.json)引用：actual exit1/Wait，两个理由被泛化成 `MODEL_EXECUTION_FAILED`，Resolve/HTTP 均 0。092 在其 common 写集内修正；本任务没有制造第二套生产修复或重复反事实。此历史生产红与本次旧测试预期维护分别记录。

092 原生确认其 16/17 命令实际 Wait、生产短暂稳定且无 Go 进程后，按 TASK 允许的信号接窄窗口，已提前通知 Root。[02 实际测试输入](logs/02-single-test-input.json)固定 175 个 internal Go/内嵌 SQL、chat 测试 Go 与锁文件，tree `322b0f3e80eaa0b89fd02dfec1e9c103f3e1ddfca3e33e1fb3c32e33575d5fa9`。

在 `native/huhubot` 实际执行：

```sh
GOTOOLCHAIN=go1.26.10 CGO_ENABLED=1 go test -mod=readonly -p=1 ./tests/contract/chat -run '^TestFailedPartialResultAndProductionUnavailableRemainHonest$' -count=1 -timeout=60s -v
```

[03 完整原始日志](logs/03-single-test.log) / [结果](logs/03-single-test-result.json)：actual exit0 / Wait 1.831s，原 case 0.13s，none/partial 两子例与默认空模型尾段均通过，sourceDrift=[]。默认缺模型 Run 真实失败、理由精确、usage=nil、持久 attempt0；选择的用例不创建子进程或外部网络 endpoint，Core worker 沿原清理退出。没有运行整个 chat 大队列包、race 或重复生产 counterfactual。检查结束立即原生交还 Root/092，此后无自有 Go/Node/Runner 检查进程。

最终 [04 自有一文件清单](logs/04-own-final-source.json)与 patch 可反推完整旧字节；测试新 SHA `d1b559bf42090e6b7ad138cf6af8dad08e042203a683675003eda8b221390378`。本票只有这一测试文件变更，非全产品最终 joint 候选；T08 作者继续其已授权范围。

## 问题与下一步

本票单例必要检查通过、无待写源码；交回结构校验及最终 SHA 回读保存在本目录 logs。未运行整包/全模块/race、插件 build/lint、schema 生成、Root 独立 E2E 或真实 Provider/Obsidian/目标 OS；纯测试预期维护不触发这些范围。当前无新增生产缺口，无外部动作、提交、推送或发布。Root 结合 T08 共同稳定输入及独立审查推进正式状态；本次不宣称 T03/T08/Goal 已完成。
