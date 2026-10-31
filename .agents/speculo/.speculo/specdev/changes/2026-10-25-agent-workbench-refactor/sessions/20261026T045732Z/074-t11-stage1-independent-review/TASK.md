---
schema_version: 2
session: "20261026T045732Z"
task: "074-t11-stage1-independent-review"
kind: review
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-11"
---

# T11 stage1 independent current-worktree review

## Goal

独立复核 073-t11-owner-stage1 当前工作树增量，分别完成 standards/specification 双轴审查。重点核对 metadata-only/preview、revision fence、Vault/Space 归属、OpenCode explicit reject 是否泄漏旧索引、Grok metadata admission、UI/i18n、CLI history adapter 是否接线，以及是否越过 T11 writable_paths。073 报告中的 F1/F2/F3 SQLite blocker 继续保持开放，不得视为已关闭。

## Frozen input and scope

审查模式：working-tree explicit-files；本任务在 073 Root 窄修后冻结以下 16 条路径。Root 随后又更新了 \\`history-store.ts\\` 与 \\`history.test.ts\\` 的窄回归修复，本报告以该修复后的快照为准；manifest SHA256：83c5181d6578b509a9bc6e8d890a670226cfe55acfe5a7aec657bdea33024e71。

- `src/modules/agent/core/history/types.ts`
- `src/modules/agent/platform/desktop/server/agent-data-client.ts`
- `src/modules/agent/platform/history/service.ts`
- `src/modules/agent/services/history-store.ts`
- `src/modules/agent/services/history-store.test.ts`
- `src/modules/agent/services/control/history.ts`
- `src/modules/agent/services/control/history.test.ts`
- `src/modules/agent/ui/history/SessionHistoryPanel.tsx`
- `src/modules/agent/i18n.ts`
- `native/pty-server/src/agent_data.rs`
- `native/pty-server/src/data.rs`
- `docs/agent-workbench.md`
- `src/modules/agent/services/control/commands.ts` (read-only seam check; outside T11 writable_paths)
- `src/modules/agent/services/controller.ts` (read-only seam check; outside T11 writable_paths)
- `src/shared/native/control-schema.json` (read-only seam check; outside T11 writable_paths)
- `src/shared/native/control-wire.generated.ts` (read-only seam check; outside T11 writable_paths)

The first 12 paths are the T11 stage1 implementation/writable boundary (with `data.rs` retained as prior shared dirty input); the last 4 are explicit read-only integration seams needed to assess the unconnected CLI adapter and overreach. All other dirty paths are excluded and are not code inputs. Do not modify source, generated artifacts, formal Evidence/Goal/Map/Ticket, dependencies, or user data.

## Acceptance

1. Report standards and specification results separately.
2. Record exact findings with file/line evidence, including open F1/F2/F3; distinguish new findings from known blockers.
3. Record scope/writable-path check, UI/i18n and CLI adapter disposition, and validation commands/results.
4. Write only this task directory's REPORT.md, then run the return validator:
`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 074-t11-stage1-independent-review --stage return`

