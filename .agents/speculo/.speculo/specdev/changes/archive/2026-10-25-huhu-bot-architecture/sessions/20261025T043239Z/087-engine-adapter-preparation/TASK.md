---
schema_version: 2
session: "20261025T043239Z"
task: "087-engine-adapter-preparation"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-08
---

# T08 当前生产接缝与实施准备（只读）

## Goal
为下一T08 Chat Completions真实协议adapter实现做可直接派单的技术准备。T16代码门尚待Root最后检查/独立review，本任务不激活T08、不写实现，不作协议已完成声明。不要再派Agent。用户已授权完整28票55AC/Agent Team，本轮仅代码交付；真实模型、Obsidian与目标OS由用户验收，勿索凭证。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；branchNAMEWTA/bot；HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715；change .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture；Map21/Goal20。AGENTS先发现workspace/catalog；dev Skill、SpecDev I当前授权/写集。当前Spec/T08及直接接口；研究evidence/engine-port-preflight.md、model-protocol-preflight.md，sessions/20261025T043239Z/047-model-protocol-preflight/REPORT.md（df2313f9ddcef414a7fbc5e63ed8d2b7d84d2567f571e5fda82f473dcd8f8956）与原作者本地来源。已选Eino.9.22、EinoExt chat openai.1.13、ACL解析版本和底层依赖见047，不重新无目的选库。当前 EngineInput/Resume/CheckpointInspector/ModelAttempts/ToolInvoker与 bootstrap.Options、私有CredentialProvider是实际源；不得只按旧研究假设API。

## Workspace and Scope
仅写本任务REPORT、接口建议/命令验证矩阵和来源manifest，不写任何生产/永久测试/正式状态/旧报告。不跑Go/Node/编译/构建/测试/依赖下载，当前086独占重检查。只读可并行，自己的缓存/报告不得污染源码。不开真实Provider/网络模型/系统keyring，不提交发布归档。

## Acceptance
精确指出T08自有common/chat/test切片怎样消费当前纯HUHU端口，并给出必须由原T01/T02/T12 owner维护的最小实际文件/契约请求。重点：目前bootstrap Engine在外注入而CredentialProvider内部构造，如何在唯一装配处让adapter按可信Profile/固定Config解析私密凭证且不进publicAPI/HAP/CP；实际ModelProbe如何走预算/显式凭证与endpoint，不创建绕过通道；go.mod/sum唯一owner与实际MVS锁；Tools/Persona/History/Group来源完整且不泄露私有内容。

围绕实际localHTTP/SSE fixture设计T08可审查故障矩阵：真实一轮/多工具、花括号原人格、明确终结vsEOF、partial/unknown usage、SDK隐藏retry、每次实际HTTP reserve/dispatch/producer join/settle、取消late块/响应丢失、完整可持久CP与HUHUCP1、审批前停止新effects、拒绝/过期/恢复不重写、原CallID/EffectID/工具结果回填。Eino原生工具interrupt/resume能否lossless支持需从047固定源码当前接口判断；不足处给窄adapter bridge方案与可证伪条件，不发明另一个调度器或公开SDK类型。

报告列生产trace与尚缺seam、两个可行局部方案优劣和建议（不替用户更改产品合同）、最小垂直顺序和验证需求、实际来源SHA、遗留明确未决项。阅读/推断/未运行分别说明；不把未来计划冒称实现。任何无法从本地获得的外部事实需primary来源校验，优先复用已冻结本地研究。

## Return
REPORT首h2前Session/Task/Status准确；含产物与验证、问题与下一步。完整来源manifest回读、无生产修改、停写，亲自return结构0后原生MESSAGE+FINAL。Root将其作为T08派单参考，不是T08验收。
