---
schema_version: 2
session: "20261026T045732Z"
task: "048-t10-controller-injection-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 controller 唯一 InboxService 装配修复

## Goal
Lead `codex:/root` 重新派遣原 A owner（用户授权 `gpt-6.1-sol/xhigh`）补齐 T10 最终接缝：`AgentController` 已创建的唯一 `InboxService` 必须传给懒加载 `ControlCommands`，使真实 native/CLI Router 使用同一个 service/SpaceService writer，而不是三参数构造导致 `CAPABILITY_UNAVAILABLE`。保留 availability 语义，暂不改 canonical schema 或其它 owner。

## Inputs

回读当前真实源码与已停源报告：T10 A17 `044-t10-owner-stage1/REPORT.md`、B19 `046-t10-handler-stage2/REPORT.md`、B10 `045-t10-protocol-stage1/REPORT.md`、U14 `047-t10-ui-stage2/REPORT.md`；T10 packet/ticket/Map36/GP035 及现有 controller/control tests。不要猜旧准备计划；按实际 `new ControlCommands` 调用链核验。

## Workspace and Scope

工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，T10 A/B/U 源已停写。仅允许写：

- `src/modules/agent/services/controller.ts`
- `src/modules/agent/services/controller-control.test.ts`
- `src/modules/agent/services/controller-inbox.test.ts`
- 本任务 REPORT

其它 A/B/U/Root、workspace-context.tsx、formal Evidence/Goal/Map/Ticket、生成物、依赖、Git/index 只读；不提交/推送/发布。

## Acceptance

1. 懒加载控制环境构造 `new ControlCommands(this.spaces, this.workspace, this.sessions, this.inbox)`，且 controller 只持有/装配这一 InboxService；没有第二 writer/实例。
2. 增加真实装配回归，证明 handler 注入的是同一 controller.inbox、没有注入时仍保留旧 capability-unavailable 测试，不改变 pane/terminal 语义或 availability 开关。
3. 运行 controller/control focused tests、架构、源码 lint/types（不重建 Root artifacts），记录 exact commands/exit codes；源停后按 report-template 准确 headings 原子写 REPORT，不改正式状态。

## Return

REPORT：`.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/048-t10-controller-injection-repair/REPORT.md`。只回报候选交回 Lead，不宣称 T10 done；不递归派遣。
