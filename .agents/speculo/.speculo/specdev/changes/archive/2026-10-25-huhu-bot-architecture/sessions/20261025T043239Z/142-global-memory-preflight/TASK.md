---
schema_version: 2
session: "20261025T043239Z"
task: "142-global-memory-preflight"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-15
---

# 全局记忆实现的只读接缝准备

## Goal

在 T14 共同代码门收口期间，只读准备 T15 的具体实施接缝，形成足以让原 owner 开工的简明方案，不启动尚未满足依赖的产品写入。由 native:/root/memory_access_repair 使用已完成138的权限/账本经验，明确复用现有真实 API、Memory、Grant、receipt、Core 与恢复机制的最小变化。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map37/Goal36/LOG125；用户已授权全部28票/55AC及Agent Team，只要求本轮代码开发和代码层总验收，真实模型/Obsidian/目标OS由用户后验。T15尚未开工，此任务不得写实现。无提交推送发布归档，无再委派。

按 Map → dev/testing → ticket/15-global-memory.md → spec.md 记忆/授权/AC020/022；复用 ARCHITECTURE、ADR-024、115-memory-interface-contract/interface-contract.md、123短期合同和 IMPLEMENTATION-REFERENCES 已核验研究。研究陌生机制时按现有开源复用规则读取既有来源，不臆造外部事实。当前实际源码优先；历史待创建叙述不是现状。

现有 MemoryGlobalProposal/MemoryProposal/MemoryResolve DTO 已冻结；T15两个methods仍未实现。014已支持private事实/来源图，T15需决定最小共享端口而不平行造Memory/Grant权威。T14完整代码仍由Root验证，全部生产只读；141可在foundation新增测试且持唯一Go窗，不影响只读研究。

## Workspace and Scope

只读全部项目/票据/证据/Skill。仅可写本142的 REPORT.md 与必要 plan.md；不写正式 Spec/Map/Ticket/Evidence，不修改其他作者报告，不运行产品检查、数据库、构建、generation、Go/Node/Vitest。可读源及已有结果；不得把推断写成已验证事实。

## Acceptance

1. 给出从 HAP/BotClient 和可信执行者到 propose → preview → trusted-user resolve → 单事务 item/revision/receipt → 私有/全局联合召回的真实入口/owner/所需最小端口。确认增/改/删、重复接受、拒绝、expiry、targetRevision、原文/current来源变化、并发用户决定边界。
2. 结合现有Principal/ToolExecution鉴别身份；参数不能自报用户/Agent，Leader无代批。全局confirm不扩来源或Provider授权，reuse当前ReadFacts/Grant physical gate/传播闭包；说明如何防private维护自动变全局。
3. 比较在既有memory表复用global namespace 与独立globalmemory实现的两个最小选择，给推荐与具体文件写集（T15业务、T14共享、T01 API/装配/迁移注册、T05资格、TS消费者）。解释为何必要，不为路径名单造空目录。保持014旧迁移不变，015新迁移顺序/版本由T01协调。
4. 列有限、可观察的正常/负向/竞态/故障/stdio回读检查和复用已有证据；指出真正缺失的产品决定（若有）与可自行选择的实现细节。尽量避免新增wire，确实需要则给精确DTO差异与消费者。

## Return

原生ACK后开始。REPORT 首h2前含 Session: 20261025T043239Z、Task: 142-global-memory-preflight、Status: completed；聚焦交接/产物与验证/问题与下一步，给真实行号和检查边界。亲自 validate-dispatch return后原生MESSAGE+FINAL。报告完成只是只读准备完成，不宣称T15就绪实现已验或整体Goal通过。
