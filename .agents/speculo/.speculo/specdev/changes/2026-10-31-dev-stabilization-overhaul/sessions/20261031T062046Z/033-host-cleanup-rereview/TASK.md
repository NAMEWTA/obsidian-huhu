---
schema_version: 2
session: "20261031T062046Z"
task: "033-host-cleanup-rereview"
kind: review
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-06
---

## Goal
native:/root/sources保持T06独立审查，核验025对022 S1/S2修复并绑定当前10项完整候选。034仅衔接已完成，不再写T09。

## Inputs
Map17、完整Ticket06、dev/testing、AC281/282、ADR002、T04已固定合同、execution-boundaries；022两轴及原探针，025完整报告和r2 input。Input-SHA256 976e93e7ef64dfe98a130eb269166c9727675c9f1d6477e2773708f0cc95ace8。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。仅写本REPORT，产品/测试/其他报告只读；允许git diff/show/status，无Git写入/递归代理/真实宿主/直接修复。先核验10文件/9来源/diff与完整摘要，四项变动而六项不变；规范来源可复用经核验未变者。

## Acceptance
S1已结算refresh同步/异步清理失败必须持久归原owner，stop失败与真实reservation阻止重开；S2同步throw不跳过process stop、不丢owner，held exit前caller只超时观察、最后准确failed。检查ownCleanup最多一次、finishHost对在途/晚到refresh/自然exit/重连/stop交叉无自等待/过早释放，已提交成功清理结果与错误不被后继覆盖。不得借保持错误引入新的无主资源/引用问题。新增控制测试使用真实runtime+managed+reservation，真实Go67例来源清晰。
亲跑必要窄控制/原探针；无理由不重复全部真实Go，Lead会执行最终TS↔Go。两轴明确anchor original-standards-output / original-specification-output、Reviewer native:/root/sources、Axis/Result/Input-SHA256/Observed。剩余问题需具体触发/行号/影响。

## Return
标准REPORT含真实命令/退出和S1/S2结论，停写交Lead。可复用022未变结论但不能覆盖失败原记录。通过不代表最终构建或T04/T06联合门已由你放行。
