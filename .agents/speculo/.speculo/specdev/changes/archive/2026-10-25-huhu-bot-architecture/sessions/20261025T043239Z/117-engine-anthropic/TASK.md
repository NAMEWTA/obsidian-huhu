---
schema_version: 2
session: "20261025T043239Z"
task: "117-engine-anthropic"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-10
---

# Anthropic Messages实际协议实现

## Goal

native:/root/foundation_research 将自己105固定研究转为T10生产实现，复用109已接纳共享接缝，完成默认入口、真实SDK loopback、完整有序blocks、工具审批/恢复/取消与逐实际请求计费。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map29/Goal28，map29-maintenance-validation.json实际通过；采用合同evidence/T-10-logs/anthropic-window-map29.md SHA256 885623c70ac60d7465cddee7a013cd16381d7462ace073209b4182a3683c3505。前置Responses代码门evidence/T-09-logs/code-gate-responses-r1.json通过，正式输入78900740ccb6b1f7e8bc7c76d71c68257428ed916d121a0a11328fec5b542074；112双轴pass，116只补显式锚点，原Chat历史及失败保持。

按Map→dev→当前Ticket→Goal读取，实际调用I/preflight/有限设计/TDD、异步生命周期与许可规则；已读且不变规则复用。用户完整28票55AC及Agent Team授权持续，只要求代码开发与本地代码层总验收，真实模型/Obsidian/目标OS由用户后验；不索凭证，不提交/推送/发布/归档，不再委派。

重点回读自己105 REPORT及logs/interfaces-and-matrix.md A01–A18，以及当前common/{protocol,registry,engine,checkpoint,tools}.go和httpcall。105时建议的共享机制已由107/108/109实际实现，禁止重建。119（foundation_go）将负责真实依赖和默认装配；118（engine_adapter）仅加精确第三协议注册。

## Workspace and Scope

仅native/huhubot/internal/adapters/outbound/eino/anthropic/**、tests/contract/engine/anthropic/**、testdata/providers/anthropic/**以及本任务REPORT/logs可写。common/chat/responses/httpcall、bootstrap、Broker、API/SQL/HAP/TS、go.mod/go.sum、notices、正式Evidence/Map/Goal均只读。

**初始唯一Go窗口归117：先只新增一条使用现存bootstrap/公共API的默认Anthropic真实loopback文本消费者，不导入未存在的包或新接口。** 当前应在ADAPTER_NOT_ASSEMBLED产生有效行为红；编译/缺包错不是红。固定全部实际Go输入，GOTOOLCHAIN=go1.26.10、GOWORK=off、GOEXPERIMENT为空、GOFLAGS=-mod=readonly、CGO_ENABLED=0，只跑目标并实际Wait，立刻交Root。其他作者红之前不改产品。Root接纳后才打开生产共同写窗；以后每个Go/tidy/产品验证均由Root唯一窗口，相关作者停写后固定输入。normal CGO0、race CGO1；不得自行改变公共接口或依赖锁。

## Acceptance

1. 使用固定github.com/anthropics/anthropic-sdk-go v1.56.0公开Messages.NewStreaming；显式endpoint/model/key/client、WithoutEnvironmentDefaults、WithMaxRetries(0)，禁环境/Bedrock/Vertex、redirect、隐藏重试和失败后重发。SDK追加v1/messages，不为成功偷偷修改配置路径。NewDriver()(*Driver,error)，可有thin NewDriverWithTransport用于真实Body边界，不复制通用worker。
2. 身份采用Map29固定anthropic-messages / huhu-anthropic-sdk-go-1.56.0-messages-bridge-v1 / huhu-anthropic-messages-state-v1，消费既有ProtocolDriver与httpcall。SDK前原字节UTF8/strictJSON/未知event和各界限先观察。按index重建完整有序block；start/delta/stop状态、重复/错序/错ID/未知执行/hosted工具不静默吞掉。完整全批第二工具无效也须首Invoke0，文本相同delta不误去重。
3. 完整保存thinking文本/signature/redacted/合法空thinking及原tool_use ID/参数/presence，不用SDK Accumulate重新编码的RawJSON冒充无损。工具Index紧凑编号；回放仅原初始messages、已验证blocks、common净化的tool_result。原审批Token/授权/完整ToolResult不可泄入Provider。纯ValidateState在候选、Inspect、Resume核对当前视图/原可信Intent/轮数/工具投影/完整blocks；重算外层hash也不能洗白破坏。完整CP含编码开销<=1MiB。旧Chat v1与Responses全部身份/字节保持。
4. terminal完整性、工具资格、费用知识分开。message_start/message_delta usage按实际presence累计覆盖，缺失/null/部分不能抹为known0，数字非负安全范围。input=base+cache_creation+cache_read各一次，output已含thinking。完整end_turn/tool_use须匹配实际blocks；max_tokens/refusal/pause_turn/错误不能进入本地工具，已知合法费用仍结算，缺stop/断流未知按原保守规则。
5. 最终真实序列化请求经原Attempts Reserve→Dispatch→唯一HTTP；完整历史/schema/results计费；当前授权/额度每次重查。HTTP429/5xx/3xx只一派发。tracked Body涵盖Do后ctx取消而SDK未暴露response、>=400 ReadAll和正常流；真正SDK返回、原Body.Close、自有回调结束后ProducerEnded，失败结算保留原attempt和worker，Done不能提前。
6. Probe只显式受限metadata GET，校验modelID单路径和实际目标、返回ID一致，capabilities未知为空，无收费生成fallback。默认Core与Registry/Inspector/Broker metadata一致；缺凭证保持实际missing，不伪造session key重开恢复。CP真实重开正控可用受控当前resolver，明确边界。
7. A01–A18转为真实本协议证据或明确合理复用/未运行。重点：默认SDK消费者、mixed blocks/thinking/signature/redacted/两工具批准拒绝及CP重开、同原效果恢复、usage/cache/known0/失败、未知SSE/UTF8/完整批、当前授权、取消晚工具与下次Run、实际Close barrier及SQL结算失败。关键生命周期加定向race；避免无新风险机械重跑旧所有Go/全race。Root另做新构建CLI/生产TS HAP Host E2E和独立双轴，现场user-owned/not-run。

## Return

先交首个有效默认行为红/实际Wait/输入，再分阶段报告共享依赖需求和写停状态。REPORT首h2前Session: 20261025T043239Z、Task: 本任务名、Status，正文含聚焦交接、产物与验证、问题与下一步。保留首次原失败并区分产品/夹具/观察层/环境，列实际命令、固定输入、退出、Wait/原日志、自有差异与SHA、只读接口SHA、已运行/合理复用/未运行边界和manifest。最终亲自validate-dispatch return0，原生MESSAGE+FINAL后停写，交回唯一Go窗口；Root回读后才接纳正式事实。所有命令必须实际Wait，超时终止不能冒充producer结束，未经Root调度不并行Go或tidy。
