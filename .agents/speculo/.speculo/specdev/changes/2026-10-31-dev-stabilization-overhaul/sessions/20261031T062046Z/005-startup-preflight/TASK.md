---
schema_version: 2
session: "20261031T062046Z"
task: "005-startup-preflight"
kind: research
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-14
---

## Goal
Lead host:codex/root 委派原 gpt-6-astra low 执行 T-14 只读预检。当前基线仍运行，准备后续实施，不得修改生产或宣称完成。

## Inputs
.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/tickets-map.md revision4；.agents/skills/dev/SKILL.md；.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/ticket/14-optional-init-off-critical-path.md、spec.md、ADR.md、execution-boundaries.md、evidence/T-14.md。SpecDev I代码设计步骤适用。

## Workspace and Scope
/home/wta/projects/obsidian-huhu current dev HEAD86c500556db1d64865c4cc7f1aff1dd83de071fa。全部业务路径只读，仅本目录REPORT可写，不运行额外重型测试/构建，不操作Git，不递归派遣。Browser合同保持冻结。实际调用链module.ts→MusicService.load→NeteaseAccount.restore已核对，T-14写集已加入music-service.ts。

## Acceptance
精确核对启动装配、lifetime、恢复/登录/登出/销毁/迟到结果竞争、订阅与错误状态。给出最小完整实施方案、消费者和验证接缝（含永不返回cookies.get），并列写集缺口。只复用本地事实，不擅自改变Browser服务或UI。

## Return
/home/wta/projects/obsidian-huhu/.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/sessions/20261031T062046Z/005-startup-preflight/REPORT.md；使用通用report-template并原生通知，Lead后续发新TASK开放正式实现。
