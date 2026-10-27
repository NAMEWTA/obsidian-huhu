---
schema_version: 2
session: "20261025T043239Z"
task: "086-recovery-fixture-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-13
---

# 合法群历史夹具修复与事件等待成本定位

## Goal
原T13/T04 owner /root/credential_provider 修复085已证明的群测试假定，并通过外部观察量化事件race等待成本，交回可审查候选。沿用户gpt-6.1-sol/xhigh偏好，不另派Agent。Root仅编排和验收，正式状态归Root。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715；Map21/Goal20，28票55AC，LOG051及最新用户代码验收口径。读AGENTS发现、dev/testing、SpecDev I/test-reliability、原T13/T04/T16及evidence/T-16-logs/map21-fixture-maintenance.md SHA700fd303c43c72463671940d652ca59645f29e1e3172701a8073fd9a84d430de。
085 REPORT已由Root全读/实际MESSAGE+FINAL/return0/377sha接纳，REPORT83dd81cc0712660aa746257cb79b0bbc1585b1eec79049787cdc5f355d846d47。当前生产输入080 logs/21-final-joint-source.json tree02eb94d9c8f4f6caeb2ca378554ad2f9f39c6b65847e7801be622787f0803dea；085诊断生产零改。081/082正式已交回报告只读。

## Workspace and Scope
唯一永久可写产品仓库文件是 native/huhubot/tests/contract/groups/sources_test.go；其余只读。写自有REPORT/logs、外部固定overlay；事件当前只做外部观察，不改永久测试/生产，也不落地已否证的joined guard优化。共享Go检查窗口由本次实际原生派遣授予，080/Root无重检查；顺序运行窄命令，不重跑11包矩阵。无真实账户/模型/Obsidian/目标OS、提交或远程操作。全部进程/producer实际Wait。

## Acceptance
1. 用严格根用户消息provenance与实际授权History匹配替换Derived恰好1，不使用len>=1宽断言；所有原两目标调用、A零调用、History3项、缺Grant整批零写、附件身份、撤权断言保持。永久同文件回归可用Host测试替身/engine有界barrier控制两种合法顺序，不修改生产Executor。不凭通道进入代替实际publication；验证两个真实子任务均成功、实际公开消息完整。保留085原red，对真实旧谓词的负向对照可复用。针对性普通/race检查后回读diff/SHA。
2. 事件3秒来自waitTerminal夹具，Spec/T04没有270条3秒产品要求；真实800/250ms投递门不变。085确认3秒到期后约0.2秒自然完成，不是产品卡死。先相同实际270路径正常和-race进度量化，再拆5ms GetRun轮询竞争与AppendEvent成本，最多必要的几条新信息实验，不无变化择绿。通过真实时点/阶段观察，不能先假设生产性能有缺陷；不跨Tx缓存权限、不减270/seq274、不更改产品语义。可外部单变量改变观察方式以测开销，但必须注明仅诊断，不能冒称原测试通过。
3. 若证据表明3秒是过紧的测试lane预算，提出按目标行为、实际负载、race开销和有界失败响应设计的最小夹具方案，等待Root核对精确路径再落地；不盲目抬全套超时或修改产品以迎合没有规格依据的期限。若生产成本确需修复，精确归属请求080/原owner，当前不开生产写权。执行直到获准最小修复完成并交回或发现需新owner的明确阻塞。
4. 任何已通过9包输入未变的旧证据按影响范围复用；本任务不得称T16/T13代码门或全Goal已通过。

## Return
REPORT首h2前Session/Task/Status；列实际作者、输入与所有变更SHA、完整命令/exit/Wait、原红绿/失效分类、未验证项、精确下一步。原081/085报告不改，正式状态不写。实际停写/全部Wait、亲自return0后MESSAGE+FINAL，Root做代码E2E/build与独立review。
