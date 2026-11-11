---
schema_version: 2
session: "20261025T043239Z"
task: "069-collaboration-review-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-11
---

# 059 业务接缝与公共消费者反例修复

## Goal
原 /root/credential_provider 负责059三项发现的协作业务修复与永久公共路径回归，配合068原共享owner形成新候选；不再委派。Root实际followup才开始。真实Provider/Obsidian/目标OS由用户后验，不索要凭证。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map16/Goal15与LOG082，当前059完整独立报告及原始三项反例。059 REPORT最终SHA以Root真实派遣消息为准；候选1失败/attempts1保留，既有测试通过范围不覆盖新反例。复用原053职责，读当前T11/T12/T05必要合同及Spec/ARCH/ADR；AGENTS → Map → dev架构/测试 → I及错误恢复、agent-experience。

## Workspace and Scope
只写与本次三项风险有关的自有路径（均native/huhubot/内）：internal/application/collaboration/{delegate,messages}/**、internal/application/tooling/collaboration-tools/**、internal/adapters/outbound/sqlite/collaboration/**、internal/adapters/outbound/sqlite/usage/**、internal/domain/collaboration/{delegation,policy}/**、tests/contract/delegation/**、tests/contract/collaboration-policy/**。原T05仅确需typed权限分类/边界时可维护internal/application/access/{context,grants}/**、internal/adapters/outbound/sqlite/grants/**、tests/contract/access/**，先向Root说明精确影响。不得改011/012或任何旧SQL、凭证、公共API/schema/生成物、Executor/Broker/装配、其他测试或正式状态。
068唯一维护共同API、执行器/存储、Broker与对应原owner测试。先商定准确持久读取/错误/生命周期合同，再由唯一writer修改自己的路径。可写本TASK的REPORT/logs，不改TASK或别人的报告。无commit/push/release/archive。

## Acceptance
全读059三项findings并保留相同真实入口：
- 实际Engine接到绑定Tools后调用白名单外工具必须拒绝，持久副作用与子Engine调用均零；允许对照正常。至少覆盖实际agents.delegate及agents.message，按所有同一网关工具、temporary与现有Bot检查相邻路径，当前配置pin不得被运行期间编辑扩大。通用Broker由068修复；你维护真实业务额外前提与回归，不能仅修改Discover/schema或泛化allowlist夹具。
- queued question在接收后、Claim前失去来源Grant，仍不得进入模型，但其他来源无关root必须继续，且此任务有稳定持久处置/原因、无占用泄漏。保留正常控制、原CancelTask恢复观察；覆盖合法重领/等待续跑及失败提交的相邻窗口。仅typed预期业务失败可以按已批准状态语义处置，真正SQL故障必须保留/回滚；不得一律吞error继续扫描。usage/消息读取由你维护，Claim/Finalize共享接缝由068。
- existing与temporary的constraints、expectedOutput已经接受/持久化却未到Engine；与068冻结明确EngineInput合同，按实际持久委派身份加载，完整到达实际Run/必要续跑消费者，不靠字符串搜索虚假字段或扩大目标私聊。实际工作输入与来源/派生身份保持一致。

你持有三项主要永久红→绿用例，可从059可回读探针整理为本项目风格但必须亲自观察旧候选的反例，保留准确输入与正常对照。结合公开Facade/真实SQLite/同一Executor/绑定ToolInvoker，模型由受控Engine计数；不以直接私有函数绿色代替。若需要共享字段先发068，由其唯一修改；无Schema/SQL迁移预期。

重Go普通/race/build与Root协调串行。先与068约定红灯冻结，保存源码/命令/exit/Wait；两owner新代码稳定后再跑影响闭包，避免彼此写入使结果失效。TS/Host等未变化证据可按hash复用。禁止旧DBus真实探针、真实Provider与密钥读取。

## Return
REPORT首个h2前Session: 20261025T043239Z、Task: 069-collaboration-review-repair、Status: completed。交回完整三项风险闭合表、自己与共享owner边界、原始红/绿/故障命令和exit、最终自有文件/hash、共同输入及真实Wait/清理，准确说明未跑项。原有失败记录保留；不得自行改正式验收或宣称全change完成。亲自return0并停写后实际MESSAGE+FINAL，Root完整核验后再次独立审查。
