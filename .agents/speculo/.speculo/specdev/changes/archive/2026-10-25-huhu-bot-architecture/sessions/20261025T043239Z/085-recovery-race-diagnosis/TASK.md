---
schema_version: 2
session: "20261025T043239Z"
task: "085-recovery-race-diagnosis"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-16
---

# 联合 race 两处实际失败的只读诊断

## Goal
原 T13/T04 Go owner /root/credential_provider 从080真实11包race失败证据建立最小可证伪回路。沿已有 gpt-6.1-sol/xhigh 偏好，不再委派。081已交回报告与自有冻结是历史，只读且不得改写。本任务只诊断，不授权生产/永久测试修复，不推进任何正式状态。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map20/Goal19，28票55AC。AGENTS发现、dev/testing、SpecDev I error-handling/test-reliability；当前T16窗口与原T13/T04行为合同。当前最终输入080 logs/21-final-joint-source.json tree 02eb94d9c8f4f6caeb2ca378554ad2f9f39c6b65847e7801be622787f0803dea。24-risk-race.log仍在运行，完整退出由Root后续实际通知，不能将未完成命令称已Wait。真实Provider/Obsidian/目标OS用户后验。

## Workspace and Scope
只写自己的REPORT/日志和外部固定副本或overlay诊断。生产、永久测试、旧报告、正式Evidence/Map/Goal全部只读。当前080仍独占Go窗口；现在只读定位，收到Root原生明确释放后才可以顺序执行有界针对性实验。不能抢跑Go/Node/编译/测试，不放宽任何超时、270/seq274/source800/250ms边界、History长度或权限断言。所有真实子进程/producer必须Wait，失败原样保留，无真实账户/用户数据操作。

## Acceptance
实际首个failure：groups/TestOnlyTargetSourceGrantsAuthorizeAtomicBatchAndAttachmentLabelsAreFenced，sources_test.go:123，root已succeeded且B/C Engine各1，但History只有user+1条SOURCE_DERIVED_RESULT，附件仍存在。当前代码finalizeInTx中CheckResult→tree.Finalize→Publish→Run状态UPDATE在同一Tx，因此“仅等发布”目前无证据。检查实际child状态/reason、publication/message行、历史过滤/授权、完整Source/Grant/Group事实和事务顺序。原case无SQL现场的限制明确，不能把猜测当原因。保留正常同输入控制；允许external overlay仅添加诊断或单一受控调度屏障，不能用删断言获得绿色。

第二failure：events/TestCursorSnapshotPreservesEachDurableMessageSourceAndRejectsBadFacts，events_test.go:487，启动inherited-compact返回sqlite3: interrupted；该行不同于已修sourceRun初次wait。原R2普通与17四定向通过只是历史控制，不据此当race失败不存在。不延长3s或250ms，先追哪个context/connection/interrupt拥有者及当前错误来源。当前源夹具2文件修正不撤回、不写第二修法。

每个失败分别给可证伪假设、真实最小命令/exit/Wait、反向控制、确证/推断/未验证边界、精确owner/path修复请求与影响闭包。若外部诊断发现生产缺陷，先报Root批准原owner最小窗口，不直接改代码。普通单次复现绿不得称修复；只在新证据支持时追加实验。别重跑全部11包。

## Return
REPORT首h2前Session/Task/Status准确，原始命令、输入SHA、失败观察与后续最小建议可回读。所有进程真正结束/停写、亲自return0后实际MESSAGE+FINAL；Root决定修复和正式状态。不宣称T16/T13或Goal通过。
