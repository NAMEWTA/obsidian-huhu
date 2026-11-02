---
schema_version: 2
session: "20261026T045732Z"
task: "075-t11-stage1-independent-review-final"
kind: review
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-11"
---

# T11 stage1 independent current-worktree review (final frozen snapshot)

## Goal

对 T11 stage1 在 Root 完成 metadata-only、lazy preview 与原生准入修复后的当前工作树做独立标准轴/规范轴审查。核对 metadata-only/preview、revision fence、Vault/Space 归属、OpenCode explicit reject、Grok metadata admission、UI/i18n、CLI history adapter 是否接线，以及是否越过 T11 writable boundary。F1/F2/F3 SQLite blocker 必须保持开放，不得被测试通过误报为已关闭。

## Inputs

审查模式：working-tree explicit-files。输入路径清单的 manifest digest 为 `248b0333c583b9eae68c4e03aa96e97826f9155d0f3d9ef1bc2ad68cc6a0e386`。

## Workspace and Scope

工作区：`/home/wta/orca/workspaces/obsidian-huhu/terminal`。只读取以下路径；不修改产品源、生成物、正式 Evidence/Goal/Map/Ticket、依赖或用户数据：

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
- `src/modules/agent/services/control/commands.ts`
- `src/modules/agent/services/controller.ts`
- `src/shared/native/control-schema.json`
- `src/shared/native/control-wire.generated.ts`

## Acceptance

1. 分别给出 standards 与 specification 结果（`pass` 或 `request-changes`）。
2. 记录精确文件/行号证据；区分本轮新发现与已知 F1/F2/F3 blocker。
3. 记录 scope/writable-path、UI/i18n、CLI adapter 接线状态，以及真实验证命令和退出码。
4. 只写本任务目录 `REPORT.md`，完成后运行：
   `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 075-t11-stage1-independent-review-final --stage return`

## Return

不实施修复，不推进 T11 状态，不修改正式工件。报告完成并通过 return validator 后回交 Root。
