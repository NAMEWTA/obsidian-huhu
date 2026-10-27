---
schema_version: 2
session: "20261025T043239Z"
task: "002-foundation-research"
kind: research
change: 2026-10-25-huhu-bot-architecture
---

# 任务简报

## Goal
为 T-01 实现准备真实 SQLite driver 比较、Go/Eino 依赖锁定建议与 HAP 边界设计，发现高风险接缝。
项目根 /home/wta/orca/workspaces/obsidian-huhu/bot；当前基线 33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/bot。change 路径 .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture。用户本次明确授权按 Spec/Goal/Map 全面实现，Lead /root；无提交/发布/归档。所有正式状态、Evidence、Spec/Goal/Map/README 均仅 Lead 写。

## Inputs
先完整读 tickets-map.md，再 .agents/skills/dev/SKILL.md 及 architecture/testing/licensing/build-and-release 参考，再 ticket/01-runner-profile-contract.md、Spec §9–12、IMPLEMENTATION-REFERENCES.md 的 REF-01/02/07/08、ARCHITECTURE。遵守 AGENTS 先研究维护活跃且许可明确项目。

## Workspace and Scope
仅可写自己的 task 目录中的研究报告/独立探针源码与结果，临时数据写 /tmp/huhu-bot-foundation-research-*。生产代码/Go module/正式 change 工件均只读。可运行隔离依赖探针，不触碰根 package/lock/node_modules。不得派生 Agent。

## Acceptance
基于实际工具链/两种 SQLite driver 探针比较事务、路径别名锁、备份、取消、真实依赖许可与支持平台；研究官方 Eino/EinoExt 当前可用固定版本，不凭旧记忆选 API。给 T-01 可实现建议、依赖版本和来源，不以编译冒充 OS 验收。
整体产品 E2E 与正式验收由 Lead 负责，本任务不提前标 Ready/done。

## Return
交付 .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/002-foundation-research/REPORT.md，使用 Session/Task/Status 和产物、命令/退出码、未验证项、建议。通过原生 collaboration 向 /root 提问和汇报；不改 TASK 或其他报告，不再派遣。
