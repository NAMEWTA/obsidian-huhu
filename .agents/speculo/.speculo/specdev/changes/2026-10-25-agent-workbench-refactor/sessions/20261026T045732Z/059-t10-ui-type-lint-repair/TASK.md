---
schema_version: 2
session: "20261026T045732Z"
task: "059-t10-ui-type-lint-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 UI summary type lint repair

## Goal
清除 058 收紧 `InboxListResult.rows` 为 `InboxMessageSummary[]` 后 057 UI 中两个已失效的 `unknown` 类型断言，恢复全仓 lint 零警告；不改变 Inbox 行为、分页、Read/ack、核对或 Space 选择规则。

## Inputs
回读 057 REPORT（SHA `71667499c24c5623608d2561e3ab2ae75ed8386ee90b304cfad046d482d62996`）、058 REPORT（SHA `781983aaf42ce7c0406af175da4defa75b10fb7e975d561374b2568e6537c01e`）及 lint 输出：`InboxPanel.tsx:44`、`WorkspaceToolbar.tsx:20` 的 `as unknown as readonly InboxMessageSummary[]` 已由接口类型覆盖。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`。只允许修改：

- `src/modules/agent/ui/inbox/InboxPanel.tsx`
- `src/modules/agent/ui/workspace/WorkspaceToolbar.tsx`
- 本任务 `REPORT.md`

其它源、测试、产物、正式 Evidence/Goal/Map/Ticket、依赖、Git index 只读；不提交/推送/发布。

## Acceptance
1. 删除两个不必要的 summary 类型断言，保持运行时和静态类型均为 `InboxMessageSummary[]`。
2. 运行两文件 ESLint、受影响 DOM/Vitest、`tsc --skipLibCheck`、`git diff --check`，报告真实退出码；不宣称全仓 lint/build，Root 负责随后复验。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板的“聚焦交接”“产物与验证”“问题与下一步”三节，Status 只能为 completed/blocked/failed/cancelled；完成后运行 `validate-dispatch.mjs --stage return`，源停写后回报 `codex:/root`，不得递归派遣。
