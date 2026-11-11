---
schema_version: 2
session: "20261026T045732Z"
task: "058-t10-domain-type-boundary-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 domain type and UTF-8 boundary repair

## Goal
在 056/057 已停源后收紧两个可回读的边界：`InboxListResult.rows` 的 TypeScript 类型必须真实表达 summary-only 运行时合同；InboxService failure diagnostic 不得先用 UTF-16 `slice` 再交给 UTF-8 截断器。保持现有行为和唯一 writer，不扩大产品范围。

## Inputs
回读 055 S2、056 REPORT（SHA `a75b88965c50d79271a4f33f8ff167b1fb049679467636ab60645cd571244495`）、057 REPORT（SHA `71667499c24c5623608d2561e3ab2ae75ed8386ee90b304cfad046d482d62996`）及当前源。确认 `InboxMessageSummary` 已由 model 定义，UI 已消费 summary。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`。只允许修改：

- `src/modules/agent/services/spaces/space-service.ts`
- `src/modules/agent/services/spaces/space-service-inbox.test.ts`
- `src/modules/agent/services/inbox/service.ts`
- `src/modules/agent/services/inbox/service.test.ts`
- 本任务 `REPORT.md`

其它源、UI、生成物、正式 Evidence/Goal/Map/Ticket、依赖、Git index 只读；不提交/推送/发布。

## Acceptance
1. `InboxListResult.rows` 声明为 `readonly InboxMessageSummary[]`，实现不再通过 `unknown` cast 伪装成完整 `InboxMessage`；受影响测试/调用仍通过，read 仍是正文边界。
2. `InboxService.failObservation` 直接使用 `truncateUtf8` 与 `INBOX_LIMITS.presentationDiagnosticBytes`，任何诊断路径不再先按 UTF-16 code unit `slice(0, 4096)`；补多字节 failure diagnostic 回归。
3. 运行受影响 Vitest、ESLint、`tsc --skipLibCheck`、architecture 与 `git diff --check`，写明真实退出码；不改 UI 或正式状态，不宣称 T10 完成。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板的“聚焦交接”“产物与验证”“问题与下一步”三节，Status 只能为 completed/blocked/failed/cancelled；完成后运行 `validate-dispatch.mjs --stage return`，源停写后回报 `codex:/root`，不得递归派遣。
