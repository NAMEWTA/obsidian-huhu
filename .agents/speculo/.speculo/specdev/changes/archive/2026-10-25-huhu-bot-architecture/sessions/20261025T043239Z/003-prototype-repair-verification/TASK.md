---
schema_version: 2
session: "20261025T043239Z"
task: "003-prototype-repair-verification"
kind: verification
change: 2026-10-25-huhu-bot-architecture
---

# 任务简报

## Goal
Lead /root 已修复原型技术检查暴露的未保存输入丢失、表单初始焦点、coarse pointer 触区缺陷。独立复验修正版，保持唯一原布局与六页合同，不宣称用户已批准新摘要。

## Inputs
先读前任务 001-prototype-validation/REPORT.md 与本 change DESIGN、原始浏览器记录；继续执行 P/UI 验证技能。当前 prototypeDigest 为 81f7196f901463c29f10cb0e114f75e555233e691b8cd7c352499b9685457bb2，原批准与 bindings 仍是旧版本，允许报告 pending-approval，不修改它们。

## Workspace and Scope
复用 /home/wta/orca/workspaces/obsidian-huhu/bot，baseline 33c21e098ef3188cbab5a09f3e0a01fadb787715。产品与原型源只读；只可在 prototypes/UI-001/evidence/repair-1/ 和本任务 REPORT.md 写复测脚本/截图/观察。不要覆盖原始 evidence/browser.json/observations.json/screenshots 或原任务报告。可在修订脚本改输出根/精确行为断言并验证清理完成，不能放宽原义。原生消息向 /root 汇报，不再派遣。

## Acceptance
复跑原范围并重点验证：创建/编辑 Bot 打开焦点在名称输入；有未保存修改时 Escape/取消/关闭均显示提醒，继续编辑保留值，明确放弃才关闭，保存仍正常，原触发点焦点恢复；touch emulation 控件至少44×44，布局无溢出。使用真实事件，缺陷按真实条件 fail。对 browser 的每个 true 提供实际检查或清晰横切依据。输出新 browser.json 的 prototype_digest 从真实源码计算，不读取旧 bindings 当新 hash。保存浏览器版本、命令、退出与边界。检查完成停止所有浏览器/测试 writer。

## Return
写 .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/003-prototype-repair-verification/REPORT.md（Session/Task/Status、产物/命令/未验证项），通过 collaboration 返回精确路径、结果和截图位置。正式批准/状态/Spec Gate 仍归 Lead。
