---
schema_version: 2
session: "20261025T043239Z"
task: "152-invalid-inbox-waiting"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-03
---

# 完整回归中非法补充仍停 waiting_children

## Goal

原146 owner native:/root/foundation_api_repair 调查 Root 完整共同回归的新反例，确认因果后执行同范围最小修复。先只读，不预判为夹具、不延长超时、不删失败或资源断言。此任务延续146责任，原REPORT/manifest与所有红绿不变；状态和验收归Root。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/bot，Map39/Goal38/LOG128。用户授权28票55AC完整代码实现及Agent Team，真实Provider/Obsidian/目标OS自行后验，不索凭证、不提交推送发布归档。

读取workspace/catalog、实际dev/testing、I实施/可靠性/错误处理与146 TASK/REPORT及resume-inbox-contract。Root新固定候选为151冻结2137文件，Input-SHA256 f0db44427b4ba9d0290571b922254780c0f098a1d833300a9ab2b710c5322e37，原review仍在只读进行。整个Go r2实际exit1/Wait196.313626622s，424输入零漂移；evidence/T-14-logs/lead-memory-regression-r2.json、lead-memory-regression-r2-normal.log，原输入副本 /tmp/huhu-lead-memory-regression-r2-mi1lzq3y。

唯一失败 TestInvalidWaitingSupplementDoesNotLeaveRunningClaimOrPins：resume_inbox_test.go:273 等8秒后 middle Run仍waiting_children、revision4，未到failed。与146最初running/rev7的症状不同，不用旧根因直接解释。整套其他目标通过，原146五定向绿都保留。先核实际父/叶状态与启动、持久等待、Claim/Memory/Finalize错误，必要观察必须无正文并能回滚；用同一反例作单变量因果核验。

## Workspace and Scope

初始所有产品只读；仅写本152 REPORT/logs、/tmp探针。Root当前独占Go进行物理CLI E2E，151 reviewer随后还有单一独立反例窗口；没有Root明确窗口不得运行Go/Node/DB/生产进程。先回报静态假设、所需实际观察闭包和最小范围。

确定根因并由Root确认开始修复后，可写原146职责的 application/execution/executor/{executor,ports}.go、sqlite/execution/{executor,recovery}.go、sqlite/usage/messages.go、tests/contract/foundation/resume_inbox_test.go。API/纯DTO、147 common/协议、149 Memory、其他测试、DDL、锁、HAP全只读；若根因属于其它owner先交Root路由，不越界。禁止变更本TASK或他人报告。生产未改前任何诊断可在/tmp真实副本执行，实际输入哈希/模式与独立观测保留。

## Acceptance

1. 分清真实产品故障、调度先后敏感测试和额外不成立假设，不能把定向绿当不存在故障；给可证伪因果与精确持久状态/错误。
2. 修复保留已知非法补充进入模型前body-free失败、原waiting/CP/单Run、slots/pins释放；不得将未知SQL/I/O/stale claim统统改成终态。若测试触发错误窗口，先明确其原问题与重现实验，再建立确定窗口，不用sleep/延长时限制造稳定。
3. 只跑有实际变化依据的精确目标/受影响包，Go1.26.10绝对路径/GOTOOLCHAINlocal/GOWORKoff/GOEXPERIMENT空/GOFLAGSreadonly/GOPROXYoff，normalCGO0。全部实际Wait，输入/原始输出/漂移完整保存。
4. 151固定输入及Root未结束检查不受源写漂移；任何产品修改必须先取得Root的资源确认。不新增审批需求，本条仅协调共享工具和作者窗口。

## Return

REPORT首h2前包含Session: 20261025T043239Z、Task: 152-invalid-inbox-waiting、Status；聚焦交接/产物与验证/问题与下一步。交回精确文件前后SHA/mode、实际命令exit/Wait/原日志、未验边界。亲自validate-dispatch return、报告manifest冻结并实际消息归窗。Root负责最后完整代码门与151差异复审；本任务不结束Goal。
