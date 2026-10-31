---
schema_version: 2
session: "20261025T043239Z"
task: "153-memory-integration-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-14
---

# 私有记忆集成审查：完成上限与临时群历史

## Goal

原Memory owner native:/root/foundation_research 在当前T14职责内修复151独立实证的两个缺陷：合法128来源的普通聊天不能被后续维护候选129上限回滚；实际拥有群绑定的temporary应保留获准公开群历史。原151反例和全部旧证据保持，不降低来源完整性、隔离、当前资格或128边界。空intent_alias的wire/schema问题由独立154共同合同窗口负责，不在本任务修改。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/bot；Map39/Goal38，28票55AC完整代码目标与Agent Team授权持续。真实Provider/Obsidian/目标OS由用户后验，不索凭证，不提交推送发布归档。

按workspace/catalog、Map → dev/testing/architecture → T14 → I实际修复流程读取，已读未变复用。规范为Spec、115 interface-contract、123 short-term-contract、原T14及当前源；151 TASK/REPORT/logs是发现入口而非可直接复制实现。固定旧候选为evidence/T-14-logs/review-freeze-memory-full-r1.json，Input-SHA256 f0db44427b4ba9d0290571b922254780c0f098a1d833300a9ab2b710c5322e37，2137文件/mode；151的/tmp原探针和实际输入保留在其logs。

151实证A：真实Core、公开两轮群交互及temporary delegate，实际SponsorAgentID与Group.Members匹配，但temporary首次ShortTerm.Entries=0，首轮公开哨兵消失。context_plan.go仅agent设置groupAudience，旧groups.ModelHistoryPage原本以temporary sponsor选择群页。只恢复既有授权视图，不能默认继承sponsor私聊/长期记忆或把所有temporary当群成员。

151实证B：正常普通聊天第1–64轮成功，第64真实derived127；第65合法输入128但结束仍running，assistant messages0、completion outbox0。RecordCompletionInTx把新output Ref加入128后变129，返回错误使execution Finalize事务回滚。原probe无模型配置，不能声称该probe证明task pin泄漏；修复验证按真正资源事实回读。

## Workspace and Scope

初始只读分析和/tmp备源；151正式报告/Root回收前主产品停写。Root随后明确开放source-only及Go窗口，不自行启动Go/Node/DB/产品进程。152正有独占/tmp Go诊断，主源保持f0db冻结；154 schema/TS窗口须与Go实际闭包协调。

允许的生产写集：`native/huhubot/internal/adapters/outbound/sqlite/memory/completion.go`、`context_plan.go`；需要最小本域辅助时先给Root精确路径和理由，不能默认为全目录可改。允许新增/维护 `native/huhubot/tests/contract/private-memory/` 内本两行为的真实Core回归，现有fixture与断言保持。其它Memory源、API/Executor/usage/groups/grants/Engine/HAP/schema/generator/TS/DDL/锁只读；根因跨owner时交Root路由。原143祖先算法与149alias修复保持。

## Acceptance

1. 复用151已实际有效红并保存对应输入，不为形式重跑旧红。先给最小局部方案和错误/事务边界；沿已确认原合同自主实现，不增加用户审批。
2. F1：已成功聊天结果、回执、终态及资源释放不受自动维护不可受理影响。仅处理已识别维护容量/资格失败，记录既有合同要求的可观察拒绝/跳过状态；未知SQL/I/O、状态冲突与部分提交仍按原原子事务处理，不吞全体错误。绝不提高128、截断实际已消费闭包或删除来源来造绿。
3. F1同时验证128输入后的实际output依赖、公共历史/读取和后续至少一轮Run，当前来源撤销/遗忘仍传播；可选历史候选超预算应沿既有保守过滤与Usage规则，不能只修当前Finalize、留下下轮preparing/running停驻。普通聊天和维护的费用/副作用各有实际证据，不新造旁路存储或writer。
4. F2：复用实际temporary sponsor/固定GroupBinding与公开消息当前资格，初次上下文包含获准群哨兵；sponsor其它私聊、另一线程、私有长期项不混入，撤群/错误成员资格不能读。Group publication/review_queue/current audience语义不变，所有消息仍走原sourceAccess/read+send/祖先闭包。
5. 原alias/恢复补充/三协议prefix、128冲突cycle/稳定顺序、250ms既有有效证据按影响复用；不无理由重跑全部SDK/性能矩阵。新定向真实Core检查保存实际GoList/源hash/mode/原输出/exit/Wait，source+snapshot无漂移。Go固定绝对1.26.10、GOTOOLCHAINlocal/GOWORKoff/GOEXPERIMENT空/GOFLAGSreadonly/GOPROXYoff、CGO0；race仅Root协调后按实际风险运行。

## Return

REPORT首h2前Session: 20261025T043239Z、Task: 153-memory-integration-repair、Status；聚焦交接/产物与验证/问题与下一步，说明每条finding因果、范围、实际验证与未验边界。原字段/正文不进诊断日志。最终source前后SHA/mode、manifest、亲自validate-dispatch return实际exit/Wait和原始输出齐后归窗停写。Root负责153/154/152合并后最终共同门、独立差异复审和后续T15–28，不在本任务结束Goal。
