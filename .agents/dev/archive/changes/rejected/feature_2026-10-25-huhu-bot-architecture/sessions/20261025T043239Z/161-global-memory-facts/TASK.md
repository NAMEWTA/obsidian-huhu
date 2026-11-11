---
schema_version: 2
session: "20261025T043239Z"
task: "161-global-memory-facts"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-14
---

# 已确认全局事实与联合召回

## Goal

原153 Memory owner native:/root/foundation_research 实现原014事实图的global Tx端口和private/global联合召回，复用当前来源/忘记/传播/恢复机制。015提案状态与命令receipt留给T15主业务，不复制另一份global事实。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map41/Goal40。完整28票55AC和Agent Team实现授权持续，真实Provider/Obsidian/目标OS用户后验，不索凭证、不提交推送发布归档。T14已在d52ab固定2141文件/59来源经159双轴pass及Root code-gate-memory-full-r3接纳；本票只为T15新范围重开原owner，不抹旧门或旧红。当前真实基线为T-15-logs/review-baseline-global-r1.json/.zip。

按workspace/catalog→Map→dev/testing/architecture→本票及T15→I所需codebase-design/TDD/agent-experience/并发门；复用已读未变规则。读158 global-memory-contract.md与158-lead-return.json、160实际contract checkpoint，当前Spec/ADR/ARCHITECTURE唯一权威。Root两项细化：unknown AllowedTools配置兼容不普遍收紧；owner确认不依赖ManagedOwner，普通/managed受信任本机stdio用明确owner能力，模型仅proposer。


## Workspace and Scope

可写native/huhubot/internal/adapters/outbound/sqlite/memory/global_facts.go（必要同前缀纯adapter文件/测试）、store.go、namespace.go、revisions.go、facts.go、sources.go、private.go、context_plan.go、context_read.go的确切窄接缝；tests/contract/private-memory/global_recall_test.go和同目录为本新行为必要测试。014旧DDL、API、globalmemory/015、Events/Grants、Core、Engine、锁/生成全只读。可写161自身contract/REPORT/logs/manifest与/tmp。

当前source-only：160持api纯组件检查，已证其闭包仅api+stdlib，你不能改API或运行Go/go list/DB/CLI/race。先读160签名/与该原生agent协调准确最小接口；缺签名则先分析当前代码给具体需求，不猜造平行API。准确API冻结后可在本写集继续源码；新行为测试先写，任何因资源窗口未执行的red如实列出，得到Root窗口才实跑。

## Acceptance

1. WithGlobalTx必须复用本Store admission/cancel/Stop和原Grant read-fence+一次Tx；Prepare/ApplyApproved/CheckPreview在同一传入Tx，无nestedTx。应用/领域不引SQL，Tx接口归adapter；实际名字与160合同一致。
2. Prepare重读owner/tool实际actor、Run/claim/config/pinned工具和完整已消费来源闭包；model不能给空sources洗白或借Sponsor私有权。create catalogCAS、update/delete exact head/revision/hash，scope用真实session/thread owner；全局namespace不能因agentID为空漏资格，也不能读另Bot private。
3. ApplyApproved只调用原Memory newItem/replace/forget/index/dependencies/bump；同Tx重新检查目标/当前来源/权限，未批准不能进入该能力。global proposal adapter只通过窄端口调用，检查结果/Hash不冒充长期授权。update保留原闭包；来源撤销后的delete只使用实际可证明的body-free元数据新预览，不吞未知SQL/权限错误。
4. 原namespace/global item ListGet在当前资格下可用；proposal ListGet挂窄reader，同Tx不nested，稳定绑定cursor/页水位，不把提案水位当create item catalog。当前reader未安装明确拒绝。
5. private+global候选共同最多20/131072UTF8 bytes稳定选择，过滤权限后读body；ExecutionMemoryInput.Namespace仍实际Run private，DerivedInput每条保留真global namespace；恢复当前head/源/接收方资格，不读其他Bot private。新global不影响private自动维护/generation/Forget，原128祖先/129job阻止保持。
6. meaningful测试覆盖有权跨Bot已确认global召回/无权过滤、联合限额/稳定排序、source撤销恢复、target/source变化Apply不写、原事务取消/原子性。component setup可用可信port但不冒称已跑用户确认公共链；T15主业务与Root最终真实API/CLI链另验。

## Return

首h2前Session:20261025T043239Z、Task为本任务ID、Status；实际源码/来源/工件hash与模式、接口checkpoint、完整原始检查exit/Wait及未验证项。亲自validate-dispatch return，所有进程Wait后归窗停写；Root负责共同消费者/物理E2E和独立最终双轴。不能以单组件签整个T15、G3或完整Goal。
