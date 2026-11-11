---
schema_version: 2
session: "20261025T043239Z"
task: "148-question-parent-resume"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-12
---

# 问答后的中层等待恢复

## Goal

原T05/T11/T12消费者owner native:/root/memory_access_repair 接145新暴露的实际红：问答答案已正确进入Decision，叶子succeeded后中层B仍waiting_children。精确观测实际拒绝原因，以单变量证据确认并修复本域根因；不将未证解释当结论，不放宽等待预算。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715；Map39/Goal38/LOG127。完整28票55AC/Agent Team/代码层交付已授权，真实Provider/Obsidian/目标OS用户后验，无提交推送发布归档、无再委派。按Map→dev/testing→T05/T11/T12/T14/T16实际责任，145 REPORT/logs原红保持。

精确目标TestQuestionTaskReplyUsesActualSenderScopeAndSupportsWaitingUserAnswer/waiting-user。145两次诊断复测实际exit1/Wait约9.60秒；原8秒等待/root最终succeeded、2次Resume断言不得改。当前Root静态核对usage/waits.go ReadyParent确实会Claim；最终错误需实际捕获，不假定是queue、pin或lineage。当前146负责API/Executor/usage/messages，147负责common，均source-only准备；你的生产必须先保持只读直到明确根因和Root放行。

## Workspace and Scope

以native/huhubot为前缀：允许诊断/回归写tests/contract/delegation/reply_sources_test.go及本包必要新增question_resume_test.go。原生产归属内的internal/adapters/outbound/sqlite/usage/{store,waits,finalize}.go、grants/{groups,memory}.go仅在根因实际证明且Root确认后作最小修复；其他产品、Memory本域、API/Executor、usage/messages、common、schema/旧SQL/锁只读。若问题归Memory/Executor而非本域，向Root报精准源和调用证据，不越权改。

可写本任务REPORT/logs/manifest；145旧材料保持。正式状态/Evidence只Root。

## Acceptance

1. 先只读诊断及实验设计；现在不运行Go/Node/DB。向Root给最小真实Claim/ReadyParent错误观测手段与所需精确写集，Root冻结146/147共享输入并另授唯一Go窗后才执行。
2. 使用实际SQLite/Core/既有公共场景，捕获精确错误或拒绝分支；用单变量对照而非调大timeout、重试至绿或短路权限。恢复当前Grant/Group/recipient/source/父scope和私有记忆资格仍成立，错误不能吞成空正文成功。
3. 最小修复后原目标正常关闭整棵树、准确2次Resume、零残留slots/pins；覆盖实际相关负控，如来源撤销/消息身份变化/损坏CP、无关waiter可继续。范围随证据限定，不为形式重跑所有已绿检查。
4. 实际Go1.26.10固定输入/原日志/exit/Wait和变化，唯一Go窗串行；冻结返回后停止产品命令。Root与146/147共同集成、完整回归和独立双轴，作者候选不等于T14门。

## Return

先ACK和只读计划；最终REPORT首h2前Session:20261025T043239Z、Task:148-question-parent-resume、Status:completed，含真实根因或未确认边界、逐源SHA/mode、红绿和实际Wait。亲自validate-dispatch return0后MESSAGE+FINAL。
