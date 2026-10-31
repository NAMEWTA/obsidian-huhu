---
schema_version: 2
session: "20261026T045732Z"
task: "047-t10-ui-stage2"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 U14 第二阶段生产 Inbox/UI 实施任务

## Goal
Lead `codex:/root` 派遣本任务，执行者使用用户已授权的 `gpt-6.1-sol/xhigh` 在已完成 A17 owner/B10 protocol 的实际源码上完成 T10 U14 生产 Inbox consumer：工作台工具抽屉/Tab、工具栏、InboxPanel、workspace-view 状态恢复、compose/contribution 接缝、i18n 与现有生产 Chrome acceptance 脚本及 DOM tests。复用 A17 InboxService/presentation 与现有 T09 工作台布局/焦点 owner，不复制终端控制逻辑。成功标准是消息到达只更新计数，主动 read 与显式 ack 分开，unknown/pending 保留可核对身份，关闭/切换/窄宽不丢状态；没有 Space 的旧入口要求用户选择，UI 不从 cwd/当前界面猜 Space。保持 availability=false，直到 B46 handler 与 Root 整体验证闭合。

## Inputs

- 当前 change、Map36、GP035、T10 ticket、`evidence/T-10-engineering-packet.md`、`T-10-write-allocation.json`、`T-10-plan-materialization.json`。
- 已停源依赖报告：sessions/20261026T045732Z/044-t10-owner-stage1/REPORT.md 与 045-t10-protocol-stage1/REPORT.md；回读真实 service/presentation API、T09 Workspace UI 与 design baseline，不猜准备计划。
- 必读批准 `DESIGN.md` revision1/digest、PAGE-003、现有 T09 DOM/Chrome acceptance contract，以及项目 `ui` Skill、dev testing 参考。只实现 T10 绑定的 Inbox UI，不重新选设计。
- 用户 Space 规则与真实 E2E 分工保持不变；Chrome/Obsidian/Provider/OS IME/五平台由 Lead/用户验收。

## Workspace and Scope

工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`、branch `NAMEWTA/terminal`、base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，已有 T09/A17/B10 未提交改动，先核对保全。仅允许写下列 U14 后续路径及本任务 REPORT：

- `src/modules/agent/ui/AgentWorkspacePage.tsx`
- `src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx`
- `src/modules/agent/ui/workspace/WorkspaceToolbar.tsx`
- `src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx`
- `src/modules/agent/ui/workspace/WorkspaceTools.tsx`
- `src/modules/agent/ui/inbox/InboxPanel.tsx`
- `src/modules/agent/ui/inbox/InboxPanel.dom.test.tsx`
- `src/modules/agent/services/workspace-view.ts`
- `src/modules/agent/services/workspace-view.test.ts`
- `src/app/workbench/compose-workbench.ts`
- `src/app/workbench/agent-contribution.test.ts`
- `src/modules/agent/i18n.ts`
- `docs/agent-workbench.md`
- `scripts/obsidian-acceptance/agent-workbench-panels.mjs`

A17/B10/B46/Root paths, T10 ticket/Goal/Map/formal Evidence, `main.js`, `styles.css`, budget/notices, dependencies, Git index and commits are read-only. Do not modify A17 service/presentation contracts; if UI cannot compile against actual API, stop and report the precise mismatch rather than editing A paths.

## Acceptance

1. Use approved A design and existing T09 WorkspaceLayout/TerminalControlPanel composition. `WorkspaceTools` remains the original 312px aside or <600px Dialog with Radix tabs; existing control/history semantics and focus return survive. Persist only the tool enum/open state via workspace-view/compose stateKeys; never persist message body, messageId, recipient, pending/unknown, or raw attachments in host page state.
2. Inbox arrival updates bounded current-Vault unread count only; no auto-opening drawer, Space switch, focus theft, model spawn, PTY input or implicit ack. Recipient list includes stopped/background/detached sessions from persisted metadata, not only connected runtimes; same cwd/name shows explicit Space identity. Missing Space/ambiguous old entry requires explicit selection.
3. Read, send, ack and unknown reconciliation remain distinct visible actions. Generated/known messageId, original recipient/body/reference and diagnostic survive drawer close, history switch, narrow-width remount and leaf detach through A presentation owner; no automatic retry or new draft fill. Reopen can explicitly inspect/verify fresh primary.
4. Implement en/zh strings with t(), a11y labels/focus/keyboard/200%/reduced-motion and current design tokens. Preserve existing toolbar behavior and only add necessary Inbox UI. Add DOM tests for empty/loading/error/unread/pending/unknown/read/ack, same-cwd multiple Space, stopped target, narrow Dialog, close/reopen and focus return; update production Chrome script for Inbox states without claiming real Obsidian.
5. Run scoped DOM tests, applicable existing workspace/contribution tests, type/lint for U paths without generating Root artifacts. Record exact commands/exit codes and design conformance. Stop source writes before REPORT. Do not claim B handler/full build/Chrome execution/real host/provider/IME/five-platform or independent review.

## Return

Write one non-overwriting report at `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/047-t10-ui-stage2/REPORT.md` using coordination report-template exact headings. Status terminal only; completed means candidate returned for Lead acceptance. Do not modify TASK/formal Evidence/Goal/Map/Ticket. Return via native channel to `codex:/root`, no recursive dispatch.
