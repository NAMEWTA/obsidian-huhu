---
schema_version: 2
session: "20261025T043239Z"
task: "110-model-probe-expectation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# 默认Responses探测错误预期的精确维护

## Goal

原owner native:/root/credential_provider只修正既有消费者在默认Responses真正装配后的过期未装配预期，保持session-memory重开丢失凭证的产品边界。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map27/Goal26，evidence/T-09-logs/probe-expectation-map27.md。原Chat r2已接纳，T09当前仅文本切片通过，不把旧证据称新全票通过。用户完整28票55AC/Agent Team/代码总验收授权持续，真实模型/Obsidian/目标OS用户后验。按Map→dev→T02→Goal读取，未变I/preflight/测试规则复用；本任务无新依赖或陌生功能。

原目标有效失败已由108实跑：sessions/20261025T043239Z/108-responses-foundation/logs/12-assistant-old-expectation-result.json及.log，固定316输入b5557939ffc6bcd57e2bac946b2c40d8578b2773be5700fe58f441bc79d89a93、actual1/Wait1.225755秒、drift[]。model_test.go原SHA256 51e6aed207df9b94dfe72103448bd713a74ca6c46f5145c6b15a8fd2d9438d02；原want ADAPTER_NOT_ASSEMBLED，现实际MODEL_UNAVAILABLE:CREDENTIAL_MISSING。Root已全文回读；不需重复同一旧失败。

## Workspace and Scope

只写native/huhubot/tests/contract/assistant/model_test.go中默认Core重开TestModel的过期断言；其他原凭证生命周期断言保持。生产、其他测试（尤其probe_policy_test.go显式Chat-only selector）、API/HAP/SQL/锁/TS/正式状态全部只读。可写本TASK的REPORT/logs，不再委派。

先核对源与原实际红，改正预期后通知Root申请唯一Go窗口。所有产品Go命令要在Root确认完整实际编译输入冻结后运行；固定GOTOOLCHAIN=go1.26.10/GOWORK=off/GOEXPERIMENT空/CGO0/GOFLAGS=-mod=readonly。可复用历史稳定证据，不跑全Go/race/真实Provider，不查密钥，不提交推送发布归档。

## Acceptance

1. 默认Responses已装配后，session-memory重开missing返回CREDENTIAL_MISSING；原状态、引用不可复用、秘密不落SQLite等断言保持，没有恢复旧未装配语义或触网旁路。
2. 原消费者TestDraftModelAvailabilitySharedCredentialAndSessionReopen定向绿；只读显式Chat-only selector TestModelListingRequiresDeclaredProtocolAndDoesNotRunProbe与TestUndeclaredProbePreservesExplicitTestingButDoesNotAdvertiseProtocols负控绿。原失败完整保留，不把测试预期迁移说成生产缺陷修复。
3. 精确diff、源码/实际输入摘要、原命令/Wait/exit/drift可回读，无进程遗留；归入T09新共同代码门，独立审查和RootE2E由Lead负责。

## Return

REPORT首h2前Session:20261025T043239Z、Task:110-model-probe-expectation、Status及聚焦交接/产物与验证/问题与下一步；真实dev调用与最小变更说明，附原红与新绿/输入/单文件sha/diff/artifact manifest。亲自validate-dispatch return0，原生MESSAGE+FINAL停写交回；Root接收后维护正式状态。不能自报T02或全Goal完成。
