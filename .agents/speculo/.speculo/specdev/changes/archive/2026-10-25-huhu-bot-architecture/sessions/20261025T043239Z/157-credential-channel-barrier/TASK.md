---
schema_version: 2
session: "20261025T043239Z"
task: "157-credential-channel-barrier"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# 凭证通道并发上限测试的实际失败

## Goal

由原T02 owner native:/root/credential_provider 诊断Root共同Go r3唯一红，修复确认的同范围问题。不是重跑到绿；先证明为什么某个请求未到受控backend，保留原红及实际错误。用户已授权全部28票55AC代码和Agent Team，真实Provider/Obsidian/目标OS用户后验，不索凭证，不提交推送发布归档。

## Inputs

repo `/home/wta/orca/workspaces/obsidian-huhu/bot`，branch NAMEWTA/bot，HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map39/Goal38。workspace/catalog → dev/testing → T02 → I error-handling/test-reliability，既读未变复用。Root `evidence/T-14-logs/lead-memory-regression-r3.json`及normal.log：428固定输入、source/snapshot drift=[]，actual exit1/Wait198.577880238s；唯一红 credentials/TestPrivateChannelClosesAtNinthInFlightAndWaitsForWorkers，channel_test.go:177 worker fixture not ready，1.04s。原r2同源目标通过，不能据此忽略新失败。Root物理CLI三协议已过，当前156独立复审固定2141输入仍冻结。

Root静态候选：测试先发8个Register，再等8个backend entered；每个请求先穿过真实catalog.Reserve，存在事务明确失败出口，所以“通道已接8个请求”不必等于“8个backend均进入”。这只是候选根因，必须观察实际返回。禁止凭猜测改超时或把catalog错误一律重试。

## Workspace and Scope

初始产品全只读，仅写本157报告/logs和`/tmp`独立诊断副本。Root实际派遣后授你唯一Go验证窗口；Root与156不跑Go/DB。固定绝对Go1.26.10、GOTOOLCHAIN=local、GOWORK=off、GOEXPERIMENT空、GOFLAGS=-mod=readonly、GOPROXY=off，normalCGO0。保存实际go list、源/fixture bytes+mode、原输出、exit/Wait与漂移。

只准在副本观察真实Registration/catalog Reserve错误类型与代码、实际entered计数，不输出secret。若确认只是fixture尚未达到目标阶段，最小候选为每次send后先等待该真实backend entered，再发送下一次；最后仍必须8个真实backend同时阻塞，原第9帧触发关闭且等待所有worker退出。不能改生产注册/数据库/通道或增加等待期限；不能用fake registration绕开原真实Provider/catalog消费者。

主仓库唯一可申请写集是 `native/huhubot/internal/adapters/outbound/credentials/channel_test.go`。先把诊断和最小diff给Root，Root结束受影响审查固定窗口后明确放行再写。若实际是生产问题，立即给具体路径/反例交Root安排，不越权生产写。

## Acceptance

1. 原Root红保存；实际错误观察区分catalog失败、provider槽不足、调度延迟、取消及超时，不把解释当根因。
2. 保留真实private hello/帧、8个受控backend同时在飞、第9个请求被拒、close取消所有操作并真实Wait。原1s断言与channel请求timeout不变。就绪barrier不得靠sleep或无界等待。
3. 若test-only修正获准，在固定新输入跑精确目标和受影响credentials包；生命周期行为用有意义race覆盖，避免重复全仓。所有实际失败及修正分类可回读，无活跃子进程后归窗。

## Return

REPORT首h2前Session:20261025T043239Z、Task:157-credential-channel-barrier、Status，给精确根因、最小改动、真实验证和未验证项；亲自validate-dispatch return，冻结REPORT/manifest后原生MESSAGE+FINAL。Root负责共同回归证据按影响复用、新审查输入与正式状态，本任务不关闭T14或Goal。
