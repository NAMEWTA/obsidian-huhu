---
schema_version: 2
session: "20261025T043239Z"
task: "001-prototype-validation"
kind: verification
change: 2026-10-25-huhu-bot-architecture
---

# 任务简报

## Goal
补齐唯一已批准 UI-001/final 的真实浏览器技术证据；保留批准的 HTML/CSS/JS/设计合同字节。
项目根 /home/wta/orca/workspaces/obsidian-huhu/bot；当前基线 33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/bot。change 路径 .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture。用户本次明确授权按 Spec/Goal/Map 全面实现，Lead /root；无提交/发布/归档。所有正式状态、Evidence、Spec/Goal/Map/README 均仅 Lead 写。

## Inputs
读取 .agents/speculo/workflows/specdev/specdev-p-prototype/SKILL.md、common/rules/design-contract.md、.agents/skills/ui/SKILL.md 和 change 的 DESIGN.md、prototypes/UI-001/bindings.json、design-system.md、REVIEW.md。执行恢复后的浏览器实测分支，不重新选方案。

## Workspace and Scope
只可写 prototypes/UI-001/evidence/ 下本次真实技术材料（browser.json、截图、可复跑脚本、日志）及自己的 REPORT.md；bindings、design-system、DESIGN、final 源码和所有产品源码只读。若发现需修改批准内容，报告精确缺陷给 Lead，不擅改。独占原型浏览器测试资源，可用当前环境现有 Chrome/Playwright/CDP；新装工具先报告。

## Acceptance
实际打开 final，覆盖桌面/窄屏、六页面、关键审批/任务/记忆/删除交互和失败/空/取消/键盘/焦点/reduced-motion 等设计要求；截图与观察真实保存。按设计包 schema 组织 browser.json，并运行原型 preview/ready 校验（状态缺口交给 Lead）。报告环境/视口/操作/结果/不可运行部分；严禁伪造通过。
整体产品 E2E 与正式验收由 Lead 负责，本任务不提前标 Ready/done。

## Return
交付 .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/001-prototype-validation/REPORT.md，使用 Session/Task/Status 和产物、命令/退出码、未验证项、建议。通过原生 collaboration 向 /root 提问和汇报；不改 TASK 或其他报告，不再派遣。
