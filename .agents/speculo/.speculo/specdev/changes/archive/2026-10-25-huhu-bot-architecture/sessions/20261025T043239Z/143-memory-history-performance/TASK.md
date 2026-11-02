---
schema_version: 2
session: "20261025T043239Z"
task: "143-memory-history-performance"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-14
---

# 修复完整回归发现的真实长历史问题

## Goal

由原T14作者 native:/root/foundation_research 诊断并最小修复真实单Session50Run消费者的首次失败，保留持久来源、完整祖先和投递门，不能仅增大等待或减少负载。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map38/Goal37/LOG126。完整28票55AC/Agent Team/代码层验收授权持续，真实Provider/Obsidian/目标OS用户后验，无提交推送发布归档，无再委派。

按 Map→dev/testing→T14/I；原126正式REPORT/30源/58工件已Root接纳，保持冻结记录。Root完整Go回归 actual1/Wait235.686251秒，417输入/原快照零漂移；evidence/T-14-logs/lead-memory-regression-r1.json、同名normal.log、failures.json。TestSingleSessionHundredSourceMessagesReachActualHistoryWriter 在构造50Run时GetRun等待出现sqlite3 interrupted，约34秒，不是已经证实的250ms物理投递失败。基线快照 /tmp/huhu-lead-memory-regression-r1-cp7q1xak。Map38窗口见 evidence/T-14-logs/regression-window-map38.md。

## Workspace and Scope

可写原126的T14 Memory生产目录（domain/memory/private、application/memory/context/private/maintenance、adapters/outbound/sqlite/memory）与tests/contract/private-memory；014迁移、API/Core/Executor/Grants/usage/锁/所有其他测试只读。events/history_test.go 为实际消费者只读，不能改其3秒等待、100条History或250ms物理门来消除失败。自己的143 REPORT/logs/manifest与临时探针可写，旧126工件不改。跨域根因需报Root具体路径/原owner。

## Acceptance

1. 当前授唯一Go窗口：先绝对Go1.26.10版本和实际events测试编译/embed闭包；确认无144/145正在修改的协议/chat/foundation/recovery/delegation/groups/budget测试输入，才运行精确原失败。保留单目标原红/绿色、取消/超时/真实耗时/返回状态；不凭完整回归中错误字面猜根因。
2. 用有界探针/剖析与单变量对照确认真实瓶颈或语义问题。若原目标单独绿仍调查完整输入的负载差异，不机械重跑直到绿。修复遵守正文资格前置、完整Derived闭包/128界限、Scope、当前Grant/抑制/Pin/恢复水位；不通过去掉来源、忽略关系、缩小50Run或把查询错误当空成功。
3. 有效最小修复后运行原真实public Core→50Run→History100→物理stdio目标，并保留800实际source message既有正控；若无实际生产缺口，只交证据与分类，不造补丁。实际MemoryFactsReader最大混合subject的既有覆盖缺口可提出有意义的窄消费者，但不复制138fake Facts，也不因覆盖清单无止境扩测。
4. 完成精确检查后立即归Go窗并冻结源码；不自跑全仓normal/race/vet。Root随后重验受影响当前候选及独立审查。每次命令实际Wait，固定原输入/模式/源码差异和首失败，不修改原红日志。

## Return

原生ACK。最终REPORT首h2前有Session: 20261025T043239Z、Task: 143-memory-history-performance、Status: completed；包含聚焦交接/产物与验证/问题与下一步、可证伪根因与真实反例、改动/保留合同、exit/Wait/来源SHA/未验边界。亲自validate-dispatch return actual0后MESSAGE+FINAL，Root维护正式票状态。
