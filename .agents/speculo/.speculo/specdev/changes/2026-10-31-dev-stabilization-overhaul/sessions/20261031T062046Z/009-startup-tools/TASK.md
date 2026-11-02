---
schema_version: 2
session: "20261031T062046Z"
task: "009-startup-tools"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-14
---

## Goal
Astra low按T14-D02修复007候选的验证工具归属问题，完成本票原定lint，无生产功能扩大。

## Inputs
复用007 TASK/REPORT、当前Map revision9、Ticket14及evidence/T-14.md T14-D02、dev/testing；current dev固定基线86c500556db1d64865c4cc7f1aff1dd83de071fa。

## Workspace and Scope
唯一工作区/home/wta/projects/obsidian-huhu。只写本票新建docs/e2e/dev-overhaul/startup工具与引用、新scripts/fixtures/dev-overhaul-startup/**及本REPORT；不改现有生产补丁，不动根eslint/tsconfig/忽略规则，不写其他worker路径、shared产物、Ticket/Evidence/ledger，不Git、不递归派遣。旧007 TASK/REPORT保持不变。

## Acceptance
将实际Node计时fixture/config/native stub放到scripts/fixtures/dev-overhaul-startup，docs仅报告/输出；删除你为错误放置临时新建的docs目录tsconfig，修正文档和命令路径。没有必要扩大globalIgnore。重跑计时fixture确认真实activate区间及10个核心用例仍过；重跑pnpm lint，保留原失败。不得削弱规则，脚本语法与真实运行正常。保持原有计时原始观察，不覆盖基线历史。Lead最终负责workbench-entry/lifecycle与冻结构建，真实Obsidian由用户负责。

## Return
本目录仅TASK.md与REPORT.md，按coordination/report-template.md返回真实结果并停止写入。
