---
schema_version: 2
session: "20261026T045732Z"
task: "068-t10-ui-state-roundtrip-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 UI state round-trip repair

## Goal

接收 067 r5 独立审查发现的唯一 R5：compose-workbench 将 agentTool 列入 stateKeys，但 AgentWorkspacePage.createAgentPage.getState 漏回该字段，导致 Inbox 工具选择无法由宿主保存/恢复。只在原 U14 写集内补齐生产 state seam 与真实回归，保持旧入口必须显式选择 Space。

## Inputs

067 r5 REPORT：`sessions/20261026T045732Z/067-t10-final-independent-review-r5/REPORT.md`，标准轴/规范轴 request-changes，R5 指向 `src/modules/agent/ui/AgentWorkspacePage.tsx:494-511`。本任务只写 U14 中 `src/modules/agent/ui/AgentWorkspacePage.tsx` 与 `src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx`。

## Workspace and Scope

同一 change-workspace，当前 branch/base/head 沿 README Execution Context。不得修改 Root 产物、协议、Space 绑定、Ticket、Evidence、Goal/Map、Git index 或依赖；不得从 cwd/current UI 推断 Space。

## Acceptance

1. createAgentPage.getState 返回 agentTool，并由宿主 stateKeys 消费。
2. 选 Inbox 后 getState round-trip 保留 inbox；旧 state 缺省 agentTool 仍由 createWorkspaceView 回退 control。
3. 运行 U14 定向 DOM/贡献/类型/lint/diff 检查并记录实际退出码，源停后返回本报告。

## Return

源停后写一次性 REPORT.md，列出实际修改路径、命令/退出码、未运行项、Source STOPPED 和 return validator：
`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 068-t10-ui-state-roundtrip-repair --stage return`

不改正式 T10 状态/Evidence/Goal/Map，不派遣子 Agent。
