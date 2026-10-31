---
schema_version: 2
session: "20261025T043239Z"
task: "068-shared-review-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-07
---

# 059 三项发现的原共享 owner 修复

## Goal
原 /root/foundation_go 修复当前候选的共同 Broker、Executor 与 Engine 输入接缝；与原业务作者 069 协作关闭 059 全部 findings，不再委派。Root 实际 followup 才开始。用户要求全面开发并完成代码验收；真实 Provider、Obsidian、目标 OS 留用户，不请求凭证。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map16/Goal15、原052/053/054/058/061/062及066/067接纳、LOG082与059失败回执。先全读059 REPORT及三项原始反例/探针，再读当前Spec/ARCH/ADR相关合同和T01/T02/T03/T06/T07。本任务引用的059 REPORT最终SHA由Root真实派遣消息提供。原独立候选1失败、attempts1保留；旧绿测不覆盖新增反例。

AGENTS → Map → dev及所涉架构/测试规则 → I权威入口；失败与恢复、agent-experience适用。当前没有新产品决定或DAG变化；最小修复既定合同，不重做全部功能。

## Workspace and Scope
仅可写原有共享owner路径中与三项问题直接相关的文件：native/huhubot/internal/application/api/**、internal/application/tooling/broker/**、internal/application/execution/executor/**、internal/adapters/outbound/sqlite/execution/**、tests/contract/chat/**、tests/contract/approval/**、tests/contract/foundation/**（以上后续相对项均在native/huhubot/）。共同装配如果确需调整可用原T01 internal/bootstrap/core.go；先告知Root准确文件与理由。无需修改公共wire schema、旧SQL、模型协议、TS、依赖、其他工程文件或后续票。
069独占collaboration/usage/grants业务及delegation/collaboration-policy/access测试；你不写这些目录。他提出共享API/事务消费者需求，你唯一实现；先用原生消息冻结字段/返回/调用顺序再消费。不修改正式状态、Evidence、TASK或他人报告。只另写本TASK下REPORT/logs。无commit/push/release/archive。

## Acceptance
1. Broker绑定执行上下文后的实际工具调用统一检查固定配置的AllowedTools，覆盖所有现有协作工具、existing/temporary路径；不是只隐藏工具schema。缺权限时零委派/消息/回执/费用/模型副作用，保持现有获准行为及note.write合同。与069确认单一权威网关，不堆叠不一致的白名单。普通用户公共API的合法授权不能被模型工具策略误伤。
2. Claim读取消息时，预期的typed当前权限/来源/业务拒绝不得使同一accepted项无限回滚并饿死其他root。失败任务无模型请求、原因持久可查，按原Run/父子结果合同结束或阻塞；释放其实际占用，保留其他任务与真实producer安全性。不能用跳过全部error、清消息或宽松授权绕过；SQL/IO/未知错误必须保持原错误/原子回滚，提交故障不能留下假终结。与069确认Claim/Finalize/ProducerEnded同一生命周期。
3. accepted委派已保存的constraints和expectedOutput必须通过真实持久记录进入existing与temporary的实际EngineInput，并在合法续跑仍可用，任务正文、要求、配置/来源职责清楚；不得把有字段/存库当消费者完成。共同API由你唯一维护，持久业务读取由对应owner维护，避免平行类型/额外副本和私聊泄露。将接缝交后续T08使用，但不提前实现T08。

069拥有三项主要公共路径红→绿回归；你负责必要的共同故障/事务断言。先确保旧059输入能复现，再保持相同正常对照及权限/零调用等断言修复。只有明确夹具此前违反合法前提时才改夹具并记录，禁止放宽不变量。

重Go普通/race/build与Root协调串行。可先编译或窄单项，待两owner停写后执行真实影响闭包；不重复未受影响TS/lint/build/跨OS矩阵。原始命令、cwd、工具链、exit、时长、Wait/清理及准确输入manifest保留。Root将独立复跑新边界并再次派独立双轴审查；你不标代码门通过。

## Return
REPORT首个h2前Session: 20261025T043239Z、Task: 068-shared-review-repair、Status: completed；交付各finding闭合链、最终文件SHA、前后差异/真实原始命令、相邻风险、复用边界、后续T08输入合同与未跑用户验收。完整报告/产物落盘、自己的进程全部Wait并停写，亲自return校验0后实际MESSAGE+FINAL，Root再全读核验。超出写集先精确请求，不接管原业务owner。
