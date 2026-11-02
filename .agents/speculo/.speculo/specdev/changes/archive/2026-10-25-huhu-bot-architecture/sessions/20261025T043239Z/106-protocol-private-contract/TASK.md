---
schema_version: 2
session: "20261025T043239Z"
task: "106-protocol-private-contract"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-09
---

# 多协议私有接口实施准备

## Goal

由原common/chat owner native:/root/engine_adapter 基于097已回读建议，给T09可直接交接的精确私有接口、Chat v1兼容策略及必要共享辅助范围。只读技术准备，不提前改变102冻结候选或激活T09，不再委派。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map25/Goal24。用户完整28票55AC代码和Agent Team授权保持，现场用户后验，无提交推送发布归档。已读AGENTS/dev/I规则可复用，先读097-responses-preparation/REPORT.md及logs/interfaces-and-matrix.md；其展示后继经104修正，研究结论不变。Root已接100/101修复与r4实际重构建E2E；102独立审查仍在进行，本准备不声称通过。

## Workspace and Scope

仅106 REPORT/logs可写；现有common/chat、bootstrap、Broker、研究缓存与他人材料全部只读。无Go/Node产品检查、gofmt生产、下载或Provider；102持唯一Go窗，105另作Anthropic只读准备。记录实际读取源码SHA，发现共享候选变化即说明，不将建议写为已实现。

## Acceptance

1. 对097推荐路线给出具体、有限的私有类型/方法草案：Generation输入/TurnResult、ProtocolState纯校验需要的Messages/Initial/Turns、每协议兼容identity，以及同一registry用于Engine/Inspector/Probe/selector/metadata。可选择最小struct避免继续拉长Generate参数；SDK类型不进Application，不增加第二个Runner/账本/恢复资格服务。
2. Chat旧EngineVersion、工具digest序列化及CP编码保持；新增Responses状态必须完整且受1MiB总限，Chat禁止借新字段装入opaque数据。说明怎样在Generate结果首Invoke前、Inspect及Resume前核对sidecar与Messages/真实CallID/顺序/可信原Intent，格式或state缺失不自动兼容。对已有效Chat CP给明确可复跑兼容控制。
3. private registry中无全局当前协议，Stop/Done/Close涵盖所有已装配driver/Probe/settlement；默认生产Engine与同registry身份一致。显式fake Engine+nil Probe不得获得生产identity；T01 bootstrap和T06 Options纯callback/helper的最小精确签名需求要能直接交另一owner。
4. 比较至多两种HTTP/SDK lifecycle共享办法，推荐最小安全改动。可以只给新Responses/后续Anthropic共享有界raw UTF8/SSE观察、一次实际请求/预留派发/最终Close/结算责任辅助，不为复用重写已通过Chat全Driver；也不能复制整个Driver/结算worker到每个协议。将协议语义（Chat choices、Responses items、Anthropic blocks）留各driver，producer真实ACK依据各SDK不同。新共享文件列确切路径，交Root正式开窗后才能写。
5. 输出T08/T09/T01/T06/T27精确owner写集建议和验证影响：哪些Chat风险因接口/CP/生命周期变化应回归，哪些旧底座保持；不得把本任务的方案或类型草案当运行通过。及时将关键接口建议消息给Root，完整报告仍需事实来源摘要。

## Return

REPORT首h2前Session/Task/Status及聚焦交接、产物与验证、问题与下一步；附接口草案、最小owner路径和来源/未运行矩阵。亲自validate-dispatch return0，停写后native MESSAGE+FINAL。102通过后Root才按新Map/正式实施派单开放产品写入。
