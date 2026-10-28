---
schema_version: 2
session: "20261025T043239Z"
task: "108-responses-foundation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# Responses默认装配、依赖与Broker协议身份

## Goal

原owner native:/root/foundation_go 维护T01/T06，使默认Responses实际接到同一Engine/Broker/Attempts/Inspector，保留Chat旧CP、显式fake及空/未装配原因；不扩Application/HAP/SQL合同。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map26/Goal25；evidence/T-09-logs/responses-window-map26.md SHA256 e2b663255603ca32d3fc7fdaa9ec6dd858d2a0e88f29c1573ec32a2aa397af83；28票计划/4执行记录校验0见evidence/map26-maintenance-validation.json。前置evidence/T-08-logs/code-gate-chat-r2.json已接纳，102独立双轴pass，原100/101/093及Root r4可按影响复用。用户完整28票55AC及Agent Team授权持续，真实模型/Obsidian/目标OS用户后验，无提交推送发布归档。

按Map→dev→T01/T06→Goal读取，已读未变I/preflight/测试/错误/许可规则复用。097-responses-preparation/REPORT.md及logs/interfaces-and-matrix.md为已接纳固定SDK路线；106原common owner正收口有限私有签名，Root收到后经原生消息给准确附件/摘要。107负责共同接口，109负责新driver；二者不是本任务写集。

## Workspace and Scope

仅native/huhubot/internal/bootstrap/core.go、go.mod、go.sum，tests/contract/foundation/**内本次实际装配回归，以及internal/application/tooling/broker/service.go、recovery.go、tests/contract/approval/**内metadata合同测试。其余所有生产、旧SQL、API/HAP/生成TS、锁以外依赖文件、他票测试与正式状态只读。本TASK自有REPORT/logs可写，不再委派。

**先只读现接缝、协商106/107签名并写自有材料；不得修改产品或运行Go。109将在当前可编译Chat-only默认入口取得Responses缺失行为红并实际Wait，Root原生通知后才放行共同生产维护。** 之后与107/109仅非重叠写入；任何Go产品命令、锁变动/tidy由Root安排唯一窗口并先确认相关writer停写。固定GOTOOLCHAIN=go1.26.10、GOWORK=off、GOEXPERIMENT为空，常规CGO0/GOFLAGS=-mod=readonly；race明确CGO1。tidy必须在真实SDK import存在后按固定版本串行执行，不用空import保依赖。

## Acceptance

1. 注册Chat与Responses于同一不可变common.Registry，Engine、Inspector、Probe、selector SupportsProtocol与EngineVersionForProtocol由同一registry提供；Profile私有resolver不扩大权限，停止/Done/Close覆盖全部driver与Probe。具体有限签名由106/107在产品写前协商冻结。显式Engine+nil Probe保留原fake EngineVersion/Inspector，不因补Probe而获得生产身份；默认huhu-engine-v1语义保持。构造失败需清理已创建driver并实际等待，无资源泄漏。
2. Broker.Options新增纯EngineVersionForProtocol func(string) (string,error)，Bind/PublishSuspension/InspectRecovery共用一个可信pinned protocol metadata helper，旧EngineVersion只为显式fake/legacy路径使用。Bind在Engine.Run前执行：nil/空model及明确ADAPTER_NOT_ASSEMBLED仅保留Tools/Attempts而不给Checkpoint，让Engine仍返回MODEL_DRAFT_INCOMPLETE/ADAPTER_NOT_ASSEMBLED、零Resolve/HTTP。不得吞任意callback错误，发布/恢复无有效metadata拒绝。无CP自选协议、平行缓存或新授权服务。
3. 实际消费github.com/openai/openai-go/v3 v3.44.0，既有Eino/Chat固定依赖保持；锁按真实导入tidy，不引入agenticopenai空包/云路线，记录新增实际生产闭包请求给T27。禁止修改module cache。
4. 使用真实默认Core/公开API及原CLI相关消费者证明Responses装配、metadata选择/纯恢复和预算端口；验证Chat旧身份/兼容、fake+默认Probe、空/未装配原因、callback意外失败、构造/关闭边界。只跑实际受影响定向测试，底座有效证据复用；不机械全Go/race或旧重队列。不以编译错误作红，109首个真实默认入口红可作为本共同接缝起点。
5. 与107/109冻结组合后给Root准确输入/改动/命令/Wait/退出码及未运行项。检查不得遗留Core/HTTP/SDK/结算worker/子进程；Root独立E2E与新双轴审查在作者返回后执行，不自报全票完成。

## Return

REPORT首h2前Session: 20261025T043239Z、Task: 108-responses-foundation、Status；使用聚焦交接、产物与验证、问题与下一步。记录实际dev调用、最小设计、TDD与本次风险验证、自有文件SHA/diff、只读接口摘要、全部命令原始log/exit/Wait和artifact manifest。亲自validate-dispatch return0，原生MESSAGE+FINAL停写交回；Root回读再更新正式状态。真实现场均user-owned/not-run，不索要密钥。
