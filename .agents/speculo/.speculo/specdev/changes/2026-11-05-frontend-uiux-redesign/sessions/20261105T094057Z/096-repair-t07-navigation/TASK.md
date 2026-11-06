---
schema_version: 2
session: "20261105T094057Z"
task: "096-repair-t07-navigation"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-07"
---
## Goal
sol medium仅修093实际导航取消P2，并补Root实际Chrome fixture启动缺口与当前真实SSR provider迁移测试；不重启整票。
## Inputs
AGENTS/workspace/catalog/dev/ui、SpecDev I/Map33/T07/Spec/UI002；批准设计摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。用户授权medium实现/high审查16票。
093不可变REPORT SHAd88b03b679983ead81d34249a76af2124183976c42d1181bcbbed2f0e0a7f370，真实navigation-counter.dom.test.tsx与navigation-counter-real.log在/tmp/huhu-t07-high-review：生产binding→surface→EditorView脏guard→DiscardDialog await期间abort导航signal，确认后仍target=Beta；未abort配对对照通过。072完整59候选仍基线，093已释放76输入。Root原390样本/tmp/huhu-t07-first-native/result.json startup failed doc.body.createDiv is not a function；现fixture hostDOM未给createDiv，生产Obsidian有该扩展，补fixture不改Portal产品。全模块161/162，唯一旧automation.test.ts inbox SSR因T11 InboxPanel新增useLeafMetrics缺HuhuProviders；Map33仅加该测试精确写集。
## Workspace and Scope
仅automations/ui/workbench-page.ts、实际presentation导航实现及相邻DOM必要源，T07/index.tsx fixture，src/modules/automations/automation.test.ts；完整59+必要新增测试上下文冻结。过程/tmp/huhu-t07-navigation-repair。services/core/api/词典/shared/构建/资产/state/Evidence/index只读，不委派/提交，不动真实vault。
## Acceptance
导航AbortSignal贯穿关键dirty await，取消后不能更改旧target；保留当前dirty/discard和关闭保护、正确未取消导航与lifetime信号、hide保留草稿。最小真实原反例转绿，必要并发owner校验，禁止删除guard或扩推测状态树。
fixture只按现有其它票在每个真实ownerDocument HTMLElement.prototype提供createDiv；不模拟真popout/服务成功。SSR测试用真实HuhuProviders与其测试Document包装现生产InboxPanel，不mock useLeafMetrics/删语言去重断言。
T07定向DOM、原真实navigation控制、模块162应恢复通过、适用types/lint/--check。worker不跑全66/改CSS/状态。完成冻结完整复合candidate+diff/modehash、真实原红终绿、局限并停止待high。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步，实际命令退出、原症状解除与未测边界。validate-dispatch return0后释放写权，不改正式Evidence。
