---
schema_version: 2
session: "20261025T043239Z"
task: "103-doc-checker-maintenance"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-27
---

# T27文档检查最小修复

## Goal

修复095实际发现的native测试夹具分类与中文顿号锚点误报，保留原输入文档和有效文档质量检查。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715，Map25/Goal24。读取evidence/T-27-logs/docs-checker-map25.md和095 logs/13-docs.log/json。原owner native:/root/build_integration，用户完整28票55AC代码/Agent Team授权持续，真实操作由用户后验。沿已读SpecDev I/dev/testing/文档检查规则执行。Root实际已浏览GitHub官方章节链接规则，来源链接/结论在窗口说明；不需要重做陌生功能广泛研究。

## Workspace and Scope

仅scripts/documentation-policy.mjs、scripts/verify-docs.mjs、test/release/documentation-checker.test.ts、test/release/documentation-policy.test.ts和本TASK REPORT/logs。最小处理已证实U+3001，明确native/huhubot测试夹具分类。全部Go/SQL/SDK/锁/NOTICE/main/styles、原用户inputs文档、永久Skill与状态只读。没有新依赖、不关strict检查、不改原输入，禁止顺带重构通用Markdown解析。

## Acceptance

复用095实际七红，不为同输入重复采红；先用真实checker隔离fixture证明中文顿号链接与native测试夹具的当前错误，再最小修复。保留坏链接/未知native文档负控和既有slug行为；两个原Vitest文件定向通过、pnpm test:docs实际通过，保存实际子命令/outer exit、Wait、input hash/patch/完整logs。只有轻量Node检查；开始前确认Root当前重型Go窗口，避免资源竞争，不跑全仓build/lint/Go。源码变更仅检查脚本和测试，不重建插件。发现额外真实问题先准确回报，不改别人文件或原输入。无提交推送发布归档。

## Return

REPORT首h2前Session: 20261025T043239Z、Task: 103-doc-checker-maintenance、Status。交回完整自有四文件摘要/patch、原输入README等只读摘要、实际检查与未运行项、artifact manifest。亲自validate-dispatch return0后停写，native MESSAGE+FINAL；Root回读与独立检查后接纳局部证据，本任务不宣布T27或Goal完成。
