---
schema_version: 2
session: "20261025T043239Z"
task: "118-anthropic-registry"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-08
---

# 第三协议精确Registry注册

## Goal

native:/root/engine_adapter 在自己107已接纳有限私有合同上，以最小维护注册Anthropic独立身份，保持Chat和Responses兼容及生命周期。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map29/Goal28，map29-maintenance-validation.json实际通过；采用合同evidence/T-10-logs/anthropic-window-map29.md SHA256 885623c70ac60d7465cddee7a013cd16381d7462ace073209b4182a3683c3505。前置Responses代码门evidence/T-09-logs/code-gate-responses-r1.json通过，正式输入78900740ccb6b1f7e8bc7c76d71c68257428ed916d121a0a11328fec5b542074；112双轴pass，116只补显式锚点，原Chat历史及失败保持。

按Map→dev→当前Ticket→Goal读取，实际调用I/preflight/有限设计/TDD、异步生命周期与许可规则；已读且不变规则复用。用户完整28票55AC及Agent Team授权持续，只要求代码开发与本地代码层总验收，真实模型/Obsidian/目标OS由用户后验；不索凭证，不提交/推送/发布/归档，不再委派。

回读当前common/protocol.go、registry.go、engine/chat/protocol_common_test.go，117/119与当前105材料仅用于接口协作。115记忆准备不属于本次产品范围。

## Workspace and Scope

仅native/huhubot/internal/adapters/outbound/eino/common/protocol.go、common/registry.go、native/huhubot/tests/contract/engine/chat/protocol_common_test.go以及本任务REPORT/logs可写。其余common、chat、responses、httpcall、Anthropic、bootstrap/锁/Broker/API/SQL/HAP/TS和正式状态只读。若发现其他实际必要修改，给Root精确因果与路径，先不越权。

初始只读准备，117持唯一Go缺失行为红窗口；Root实际接纳并通知后才写上述三文件。你的局部红可用旧Registry+新第三driver stub目标证明合法第三身份被拒绝，测试仍使用现有类型，不因缺常量编译失败造红。Go均须Root授予唯一窗口；可以先写测试后在授权窗验证，随后最小改两源再定向绿。固定Go1.26.10/GOWORKoff/GOEXPERIMENTempty/-mod=readonly，normal CGO0、race CGO1。保持未改输入的既有大套证据，不为形式重跑。

## Acceptance

1. 在原const组新增AnthropicProtocol="anthropic-messages"、AnthropicEngineVersion="huhu-anthropic-sdk-go-1.56.0-messages-bridge-v1"、AnthropicStateFormat="huhu-anthropic-messages-state-v1"，原literal不变。Registry仅增加该精确三元组，不能放宽任意未知协议/版本/format。
2. 原无driver/typednil/重复协议/错误身份负控保持；实际三driver选择、pinned Identity/EngineVersion、三方Stop/Done/Close所有权和成功/失败构造语义在适用现有测试中验证。原明确两driver Registry仍不得广告Anthropic；不要误改现有故意unknownAnthropic+ChatEngineVersion负控。
3. 本维护不改StateView/Generation/CP格式/Engine循环/Broker ToolDigest或旧Chat/Responses字节，保持完整非Chatv2既有分支。若117揭示真实私有接缝不足，给Root明确证据后处理，不能预防性扩API。

## Return

REPORT首h2前Session: 20261025T043239Z、Task: 本任务名、Status，正文含聚焦交接、产物与验证、问题与下一步。保留首次原失败并区分产品/夹具/观察层/环境，列实际命令、固定输入、退出、Wait/原日志、自有差异与SHA、只读接口SHA、已运行/合理复用/未运行边界和manifest。最终亲自validate-dispatch return0，原生MESSAGE+FINAL后停写，交回唯一Go窗口；Root回读后才接纳正式事实。所有命令必须实际Wait，超时终止不能冒充producer结束，未经Root调度不并行Go或tidy。
