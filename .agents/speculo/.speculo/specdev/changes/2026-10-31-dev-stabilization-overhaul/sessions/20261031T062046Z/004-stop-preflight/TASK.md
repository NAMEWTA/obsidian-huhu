---
schema_version: 2
session: "20261031T062046Z"
task: "004-stop-preflight"
kind: research
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-04
---

## Goal
Lead host:codex/root 委派 gpt-6-astra low 在基线测试运行期间做 T-04 只读实现预检，缩短后续正式实施准备。不能开始生产修改或宣称 T-04 完成。

## Inputs
读取 .agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/tickets-map.md（revision 4）、.agents/skills/dev/SKILL.md 及相关参考、.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/ticket/04-runner-stop-phases.md、spec.md、ADR.md、execution-boundaries.md、evidence/T-04.md 的路径修正。SpecDev I 的代码设计预检适用。用户明确指定 Astra low 实现、Lead派遣验收。

## Workspace and Scope
/home/wta/projects/obsidian-huhu，current dev，HEAD 86c500556db1d64865c4cc7f1aff1dd83de071fa。全部业务文件只读；只可写本目录 REPORT.md。T-01仍在运行，因此不得修改代码、运行额外重型测试、生成产物或创建实现状态。不操作Git index/commit/push/checkout、不递归派遣。

## Acceptance
回读真实 Core RequestStop/WaitClosed/Close/drain、Go与TS消费者、Profile锁和sqlite.Close边界，形成具体最小改动与失败注入测试清单。说明四个阶段的正确含义、超时后资源所有权、哪些wire/API需改变、既有测试复用及实际写集缺口。当前已有api实际路径修正到internal/application/api。陌生方案先复用本地决定，需外部研究保留原始引用；不改上层产品合同。

## Return
报告 /home/wta/projects/obsidian-huhu/.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/sessions/20261031T062046Z/004-stop-preflight/REPORT.md；遵循 .agents/speculo/references/coordination/report-template.md，原生消息返回。报告可为后续同agent正式实施输入，Lead另发新TASK开放写入。
