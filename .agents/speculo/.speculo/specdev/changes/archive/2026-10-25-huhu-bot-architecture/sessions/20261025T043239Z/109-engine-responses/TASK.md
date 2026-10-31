---
schema_version: 2
session: "20261025T043239Z"
task: "109-engine-responses"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-09
---

# Responses实际协议实现

## Goal

native:/root/foundation_research 将自己097固定研究转为可运行T09：默认产品入口、真实固定SDK loopback、完整有序items、工具/审批/恢复/取消与逐实际请求预算，复用同一common Engine和原Application合同。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map26/Goal25；evidence/T-09-logs/responses-window-map26.md SHA256 e2b663255603ca32d3fc7fdaa9ec6dd858d2a0e88f29c1573ec32a2aa397af83；map26-maintenance-validation.json计划/执行0。前置Chat代码门evidence/T-08-logs/code-gate-chat-r2.json通过，102独立双轴pass、Root r4新构建真实CLI/HAP/SDK/生产Host本地流程通过；Chat通过不证明Responses。

按Map→dev→T09→Goal，I/preflight/设计/TDD/错误/异步生命周期及许可规则实际调用；已读且不变的规则复用。自己097 REPORT与logs/interfaces-and-matrix.md的R01–R14为固定SDK差异依据，104仅Markdown展示后继；105 Anthropic只是未来参考，不扩本票。原common/chat owner106有限接口正在收口，Root将给准确附件摘要，由107实现；108负责默认装配/锁/Broker metadata。用户完整28票55AC和Agent Team授权持续，当前再次明确只需代码层验收，真实模型/Obsidian/目标OS由用户后验。不索凭证，无提交推送发布归档。

## Workspace and Scope

仅native/huhubot/internal/adapters/outbound/eino/responses/**、tests/contract/engine/responses/**、testdata/providers/responses/**及本任务REPORT/logs可写。common/chat/httpcall、bootstrap、Broker、API/SQL/HAP/TS、go.mod/go.sum、notices和正式状态均只读。107唯一common/chat/httpcall作者；108唯一bootstrap/Broker/Go锁作者；不得复制整个Chat Driver/worker或另建Engine/账本绕过原owner。不再委派。

**初始独占验证窗：先只新增一条通过现存bootstrap/公共API启动默认Responses的真实loopback消费者，使用现有类型/fixture，不导入尚不存在的新driver或接口。** 当前Chat-only输入应因ADAPTER_NOT_ASSEMBLED而失败；缺包/编译错不算红。固定完整Go编译输入与环境，实际运行并Wait，保存原日志/结果，立即通知Root。107/108在该有效行为红之前禁止产品写。初始命令使用GOTOOLCHAIN=go1.26.10、GOWORK=off、GOEXPERIMENT为空、CGO_ENABLED=0、GOFLAGS=-mod=readonly；只跑这条目标红，不整suite。

之后待Root通知共同写窗及有限接口附件才实现生产；与原owner协商接口，不越权。每次后续Go/tidy/产品检查须经Root唯一窗口并相关writer冻结，避免漂移输入。各自独立源码编辑可并行，验证不可互相踩。命令必须实际Wait、资源完整join；不把外层deadline/close调用当producer结束。

## Acceptance

1. 直接消费固定github.com/openai/openai-go/v3 v3.44.0公开ResponseService.NewStreaming/Next/RawJSON/param.Override，Eino schema只在adapter私有树；实际import由108锁定，不运行agenticopenai/ADK、不fork/改缓存、不捕获失败后重发。显式endpoint/key/client/retries0，禁环境/cloud回退、redirect、隐藏重试。store=false、background=false，禁远端conversation/previous_response_id、自动截断/缓存和内建工具。
2. 使用107的Generation/TurnResult、不可变Registry身份、纯ValidateState和httpcall辅助。完整ordered final items保留reasoning summary数组/加密内容与原ID/presence；item ID与call ID分开，工具Index按实际tool batch紧凑编号。output_item.done替换added暂态；completed.output与全部最终项一致，未知/hosted执行语义、重复/错序/错ID、完整批第二工具无效都在首Invoke之前拒绝。相同合法文本delta不按值误去重。无损状态不进入公开消息/日志。
3. 回放只用可信initial messages、每轮已验完整items及common净化tool results；原call_id/原结果顺序，不能把审批Token、授权、完整ToolResult或pending当成功结果。新Responses独立compatibility identity/state format；Chat旧bytes/digest保持。纯ValidateState核对位置/轮数/文本/tool投影/原Intent，Generate首Invoke前、Inspect/Resume都调用；缺失/伪造/重算外壳hash不能洗白内部状态。完整CP含编码开销<=1MiB，无远端历史权威。
4. 逐实际最终序列化请求通过既有Attempts Reserve→Dispatch→唯一HTTP，完整schema/history/results计费；当前授权及额度每次重新检查。usage字段严格presence/非负整数/安全范围，合法0区别缺失/null/部分；terminal完整性与费用知识分开，完整失败usage不退款，未知按原保守规则。429/5xx/3xx只一实际派发，无换endpoint或协议。
5. 原始UTF8/strict JSON、解压后响应/行/event/参数/输出/CP/idle/请求/Run界限在SDK前生效；观察SDK可能忽略的未知SSE，不能滤掉未知执行事件后继续工具。最底层tracked response Body覆盖Do后ctx取消且SDK尚未暴露response、>=400 ReadAll及正常流。同步SDK Next/Do真正返回、真实Body.Close与自有timer/callback join后才ProducerEnded；持久结算失败留原观察和worker责任，Done不得提前。协议driver不能各复制结算worker。
6. Probe仅显式受限metadata GET，校验modelID单路径和返回匹配，capabilities未知为空；无生成fallback/费用或能力猜测。默认装配的selector/Engine/Inspector/Probe/metadata同Registry，未装配/空配置在Resolve/HTTP前拒绝。与108共同验证，不写其文件。
7. R01–R14逐项转为真实已跑证据、合理复用或明确not-run，不把Chat检查当Responses检查。重点：默认SDK真实consumer、两个混合items工具批准/拒绝/跨重启CP、完整opaque roundtrip、当前授权再查、缺terminal/失败/usage缺失与0、取消/真实Close barrier/结算失败；对实际生命周期关键点加定向race。有效红→最小实现→定向绿，保存首次失败原貌并分类；无新风险不机械跑旧全Go/全race或无关lint/build。Root另做最终CLI/HAP/Host代码E2E和独立双轴，现场仍user-owned/not-run。

## Return

先报告首个有效行为红的实际Wait和输入，再分阶段同步接口/写停状态；最终REPORT首h2前Session: 20261025T043239Z、Task: 109-engine-responses、Status，含聚焦交接、产物与验证、问题与下一步。记录dev/OpenAI Docs实际调用、源码/固定依赖依据、有限设计及真实TDD、完整风险矩阵、自有文件SHA/diff、只读接口SHA、全部实际命令/退出码/Wait/原日志、manifest及未运行项。亲自validate-dispatch return0后原生MESSAGE+FINAL并停写；Root全文/实际源回读才推进正式事实，不自报全项目完成。
