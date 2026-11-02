---
schema_version: 2
session: "20261025T043239Z"
task: "114-metadata-probe-expectation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# 默认双协议元数据测试的装配预期

## Goal

原T02 owner native:/root/credential_provider维护既有probe_http_test.go的过期Responses未装配预期。保留明确地址、一次GET、无输入泄露、无生成/重试/能力猜测与显式selector负控，生产代码不变。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715，Map28/Goal27。用户完整28票55AC代码层交付与Agent Team授权持续，真实Provider/Obsidian/目标OS用户后验；无提交、推送、发布、归档。沿workspace/catalog、dev/testing与I已读未变规则；Root已接纳110精确model_test.go维护，不能改该源或原报告。

当前默认Registry确已装配Chat和Responses；109/108已有实际默认SDK及metadata GET绿。109静态指出TestDefaultMetadataProbeUsesOnlyExplicitGETAndDoesNotInferCapabilities末段仍切到openai-responses期待ADAPTER_NOT_ASSEMBLED/HTTP2，当前m.ModelID仍为missing-model、fixture404；预计实际单GET后MODEL_PROBE_FAILED。此时仅为可证伪假设，必须先在冻结真实输入实际运行原单例，保留结果与Wait后才修改。

## Workspace and Scope

只写native/huhubot/tests/contract/assistant/probe_http_test.go末段过期断言及必要请求/安全错误观察。本114 REPORT/logs可写；其他测试、生产/API/HAP/SQL/锁、110原源/报告、正式Evidence/Map/Goal只读。保存实际完整before、逐字节diff/源码SHA；不再委派。

当前109还在写自有测试，先只读准备；所有Go与本测试写入均等Root明确窗口。原单例实际结束后可在本范围修正再冻结，报Root后绿窗；不能边共享写边跑Go。固定GOTOOLCHAIN=go1.26.10/GOWORKoff/GOEXPERIMENT空/CGO0/GOFLAGS=-mod=readonly。无全Go/race、插件构建或真实Provider。

## Acceptance

1. 首先实际捕获原单例的真实行为失败，不能把编译/fixture/超时错误当装配预期红。若实际不同则先报告；不改产品使它回到旧未装配行为。
2. 原Chat成功GET、Chat缺模型404与安全错误断言保持。Responses缺模型应只发一次相同明确目的地GET、空body、显式私有凭证，得到安全MODEL_PROBE_FAILED，不生成/重试/跟随其他地址、不泄露原Provider私密错误；准确回读第三请求而非仅改计数。
3. 原单例修正后及只读显式Chat-only selector两个负控实际绿：TestModelListingRequiresDeclaredProtocolAndDoesNotRunProbe、TestUndeclaredProbePreservesExplicitTestingButDoesNotAdvertiseProtocols。不把默认装配能力与注入selector混为一谈；无新生产行为或接口。
4. 实际命令、固定输入、exit/Wait/漂移与原红保留；Go结束立即归窗并停写。不以本候选宣布T02/T09整体完成，Root最终E2E和112双轴负责共同代码门。

## Return

REPORT首h2前Session/Task/Status，含聚焦交接、产物与验证、问题与下一步；完整before/diff、单文件SHA、实际检查与输入清单、所有工件manifest。亲自return0后停写，原生MESSAGE+FINAL交回。新报告引用110历史而不改旧报告。
