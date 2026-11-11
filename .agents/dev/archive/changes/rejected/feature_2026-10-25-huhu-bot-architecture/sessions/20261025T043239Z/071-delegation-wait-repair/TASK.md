---
schema_version: 2
session: "20261025T043239Z"
task: "071-delegation-wait-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-11
---

# 断点等待槽位回归的确定性同步修复

## Goal
原 /root/credential_provider 修复070发现的现有等待测试顺序假设。本任务由Root接收070最终报告后原生followup启动。沿既有实现者偏好gpt-6.1-sol/xhigh，不再委派；不把偏好说成运行时模型证明。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map16/Goal15、LOG051/082、28票55AC不变。AGENTS发现→当前Map/dev/测试规则/T11维护→I错误恢复与test-reliability。完整读070最终REPORT、原impact-race失败、外部强制合法顺序探针/状态输出、isolated原断言绿及其不同意义；原068/069修复与失败历史只读。070实际证明的是测试等待条件依赖未约束调度，不能称产品slot死锁。

070最终REPORT SHA 7a5044ad9a4a22ec79b343216582a39a811e807dd8dd5821cc622865854deb07；Root全读、实际MESSAGE/FINAL、return0与265文件/69来源核验已完成，唯一finding已写evidence/070-lead-return.json和T-07-logs/review-failure-current-notes-r2.json；八票in_progress/active、verification failed、attempts2保留，Root实际E2E仍passed。当前唯一测试文件旧SHA 160126a3a10ec2dae92ba3a769bf92fdc18ae9991da620505653da0fbe3481bd。

旧测试在释放所有held leaf前要求7个waiting_children：合法调度可先有4 leaf running/slot1、4 parent waiting/slot0、另2 parent accepted/slot0、root waiting。原5s失败后释放leaf，真实root succeeded、calls13/resumes6/slots0。不要靠放宽时间、循环重跑、吞错或调整产品调度策略使测试通过。

## Workspace and Scope
唯一产品仓库可写文件：native/huhubot/tests/contract/delegation/wait_test.go。维护原TestChildCheckpointWaitReleasesAndAtomicallyReclaimsRootSlots；同文件其他已通过用例保持。自有TASK REPORT/log可写；临时外部快照的诊断/变异可写并记录，生产Go/TS/wire/SQL/依赖/其他测试/正式Evidence/Map/其他REPORT均只读。若确有必要增加路径或发现产品问题，向Root提出真实证据后再动，不自行扩写。无提交、推送、发布、归档或真实Provider/Obsidian操作。

## Acceptance
通过实际Engine信号/barrier与公开Tools/同Executor/SQLite/完整CP观察合法时序，保留原目标：停止的waiting producer不占slot；queued不占slot；Resume实际重新取得原树限制下的slot；同根活跃不超4/Profile不超8；全部6 child-parent与6 leaf正常完成、13 Run调用、6 Resume、最终slots0、真实子结果正确。使用同步点安排可证明的状态，不以sleep固定偶然次序，不把所有parent先waiting作为未约束的前置条件。应明确承接070强制“先4leaf占槽、后2parent受理”的合法交错，并保留正常批量受理路径的原风险覆盖；具体最小测试组织由作者决定，避免镜像实现。

先精确复用或重现070的原确定性红灯，确认当前生产摘要不变与故障只由测试时序前提引出；记录原断言、barrier及改变清单。修后跑必要定向normal/race及整个delegation包normal/race，使用GOTOOLCHAIN=go1.26.10。Root协调唯一重窗口；新失败保留，先查明原因，不机械重复。只改测试无需重跑不受影响的TS/build/lint/跨平台/迁移；已有这些证据仅按当前摘要复用。检查所有生产文件逐SHA与070固定输入一致，当前变更只1测试路径。

允许测试在失败后释放held叶子用于观察后续真实终态，但必须保留原失败，不能由最终通过反写原检查成功。所有自有执行者/进程/reader必须实际收尾Wait，取消时也完整清理。

## Return
REPORT首h2前准确Session/Task/Status；列原测试故障因果、旧断言每项承接、新同步点/实际状态、完整diff及SHA、真实命令/exit/原始日志、生产不变证明和未运行边界。亲自return0后真实MESSAGE+FINAL，代码/测试/日志全部停写。Root全读并按输入影响复用现有E2E，再冻结候选3独立审查；不自称八票或28票整体完成，不重置attempts或改070结论。
