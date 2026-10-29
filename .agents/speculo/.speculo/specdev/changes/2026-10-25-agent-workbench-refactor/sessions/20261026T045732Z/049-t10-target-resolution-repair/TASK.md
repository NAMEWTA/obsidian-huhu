---
schema_version: 2
session: "20261026T045732Z"
task: "049-t10-target-resolution-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 CLI Session→原 Space 目标解析修复

## Goal
Lead `codex:/root` 派遣原 B19 handler owner（用户授权 `gpt-6.1-sol/xhigh`）修复 T10 的实际 CLI 合同接缝。计划 CLI 是 `message send --to-session <id>`、`inbox list --session <id>`；Session 是稳定业务身份，必须从持久记录解析其原 Space，不能要求 CLI 猜 cwd/当前界面，也不能因 wire target 没有单独 `spaceId` 将合法 session-only 请求错误拒绝。旧入口无 Session/Space 仍明确 `TARGET_REQUIRED`，read/ack 仍按消息原收件人，可选显式 target 必须校验归属。保持 canonical availability=false，本任务不提前宣称完整能力。

## Inputs

回读 T10 A17/B10/B19/U14/048 reports、真实 `ControlInboxHandler`、native CLI parser/schema、T10 packet/ticket/Map36/GP035 与 implementation-contracts §2/§4.1。用户决定保持：旧入口无 Space 先选择，不按 cwd/当前界面猜；已有 Session 解析原 Space。不得改 A17 service 或 controller 已修复的接线。

## Workspace and Scope

工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，T10 当前源已停写。仅允许写：

- `src/modules/agent/services/control/inbox.ts`
- `src/modules/agent/services/control/inbox.test.ts`
- `src/modules/agent/services/control/control-inbox-native.test.ts`
- 本任务 REPORT

其它 A/B10/U/Root、schema/生成物/CLI/native、formal Evidence/Goal/Map/Ticket、main/styles/deps/Git 只读；不提交/推送/发布。

## Acceptance

1. `message.send`/`inbox.list` require `sessionId`; resolve `records.sessions[sessionId].spaceId` when `target.spaceId` is omitted, reject missing session/archived or mismatched explicit Space with stable errors, and return resolved `{spaceId,sessionId}`. No lookup by cwd/name/current selected Space.
2. `inbox.read`/`inbox.ack` allow message-only requests that resolve stored original recipient; if a target is supplied, resolve session-only or full recipient and reject mismatches. Do not require runtime/pane or start any process. Missing old entry remains `TARGET_REQUIRED`.
3. Keep `messageId` in all handler send failures after local preflight/body/target validation; post-ID disappearing target, invalid body/reference and service errors return bounded identity/diagnostic data with `effect:none` or `unknown` correctly. Preserve no-blind-retry, duplicate ack and paging generation semantics.
4. Add real handler/Router tests for CLI-shaped session-only target, same cwd two Spaces, message-only read/ack, target mismatch/missing, target disappearing after capture, and identity-preserving malformed/local failures. Run focused Vitest/architecture/eslint/tsc; source stop then exact report headings.

## Return

REPORT：`.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/049-t10-target-resolution-repair/REPORT.md`。只回报候选，保持 availability=false，不递归派遣。
