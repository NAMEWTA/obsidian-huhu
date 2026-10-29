---
schema_version: 2
session: "20261026T045732Z"
task: "046-t10-handler-stage2"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 B19 第二阶段 handler 与分页实施任务

## Goal
Lead `codex:/root` 派遣本任务，执行者使用用户已授权的 `gpt-6.1-sol/xhigh` 在已完成 A17 owner 与 B10 protocol 的实际源码上完成 T10 B19 第二阶段：Control inbox handler、commands、bounded paging、Router 接线与组合测试。复用 A17 唯一 InboxService/SpaceService writer 和 B10 canonical/native schema；不另建 writer、队列、数据库或默认目标。成功标准是真实 Host/CLI control 路由能读/发/列/确认已绑定 Space 的邮箱，并保留保存事实、unknown、分页 generation、ID 和错误边界；直到 U14 生产 consumer 也闭合前 capability availability 仍为 false。

必须遵守用户决定：旧自动化/快捷按钮缺 Space 时要求用户选择；不得按当前界面或 cwd 猜 Space。显式 Session 解析其原 Space，消息停止/后台对象可收信但不 spawn/attach/prompt/focus；归档拒收新 send，read/ack 保留。

## Inputs

- 当前 change、Map36、GP035、T10 ticket、`evidence/T-10-engineering-packet.md`、`T-10-write-allocation.json`、`T-10-plan-materialization.json`、`T-10-cli-message-identity-note.md`。
- 已停源依赖报告：sessions/20261026T045732Z/044-t10-owner-stage1/REPORT.md（A17）与 045-t10-protocol-stage1/REPORT.md（B10）；回读实际源而非猜接口。
- `spec.md`、`implementation-contracts.md`、ADR/CONTEXT 与 dev Skill；B/CURRENT control/Router/Paging conventions 必须沿现有 API，native schema/TS/Rust/fixture 已由 B10 冻结。
- 不读取或改写用户人工 E2E 结论；真实 Obsidian/Provider/OS IME/五平台仍由 Lead/用户负责。

## Workspace and Scope

工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`、branch `NAMEWTA/terminal`、base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，已有 T09/A17/B10 未提交改动，先核对保全。仅允许写下列 B19 后续路径及本任务 REPORT：

- `src/modules/agent/services/control/inbox.ts`
- `src/modules/agent/services/control/inbox.test.ts`
- `src/modules/agent/services/control/commands.ts`
- `src/modules/agent/services/control/commands.test.ts`
- `src/modules/agent/services/control/paging.ts`
- `src/modules/agent/services/control/paging.test.ts`
- `src/modules/agent/services/control/router.ts`
- `src/modules/agent/services/control/router.test.ts`
- `src/modules/agent/services/control/control-inbox-native.test.ts`

A17/B10/U14/Root paths、T10 ticket/Goal/Map/formal Evidence、`main.js`/`styles.css`/budget/notices、dependencies、Git index and commits are read-only. Do not modify the B10 paths again. Stop and report any API/schema/path conflict; do not workaround by changing shared contracts.

## Acceptance

1. Implement real handler commands for message send, inbox list/read/ack using the A17 InboxService and B10 canonical wire. Explicit target/Space resolution is mandatory; reject missing/ambiguous/conflicting target without cwd/current UI fallback. Read/ack resolve stored message recipient and do not require connected runtime; send checks archive/scope/capacity before commit.
2. Preserve phase/data facts: `record-saved` and `ack-saved` are domain facts; duplicate ack is `already-acked`/none with no write; unknown retains messageId/body/recipient/diagnostic and never auto-retries. A post-generation local error exposes messageId in normal and JSON output. Do not invent `inputReceipt` or adapter success.
3. Extend existing ControlPaging as a bounded in-process cursor (≤16/10s, token ≤512B) carrying frozen recipient/high-water/generation. Pages include explicit target/sequence summaries; append and first ack preserve valid cursor, delete/reorder/recipient/scope/sequence rollback invalidates. Zero-write fresh-primary/not-found/unknown semantics must not answer from stale cache.
4. Use current Router/commands error and exit conventions, requestId correlation only, and retain `available:false` until A/B/U/production closure. Add tests through actual Router→handler→InboxService seam for same-cwd different Space, stopped/archived target, duplicate/concurrent ack, malformed/unknown records, capacity and paging generation, explicit target errors, post-ID local failures, cancellation and no-spawn behavior.
5. Run focused Vitest plus applicable protocol/native integration tests without modifying Root outputs; record exact commands/exit codes/raw observations. Stop source writes before REPORT. Do not claim UI/full build/Chrome/real host/provider/IME/five-platform or independent review.

## Return

Write one non-overwriting report at `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/046-t10-handler-stage2/REPORT.md` using coordination report-template exact headings. Status terminal only; completed means candidate returned for Lead acceptance. Do not modify TASK/formal Evidence/Goal/Map/Ticket. Return via native channel to `codex:/root`, no recursive dispatch.
