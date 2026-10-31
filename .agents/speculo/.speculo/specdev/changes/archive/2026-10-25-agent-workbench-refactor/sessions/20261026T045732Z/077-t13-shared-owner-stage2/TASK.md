---
schema_version: 2
session: "20261026T045732Z"
task: "077-t13-shared-owner-stage2"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-13"
---

# T13 shared owner and Browser carrier stage 2

## Goal

沿 T13 scope revision 37 / GP-036，把唯一 v2 layout/Space owner 从 Agent-only lifetime 提升到 app/shell shared owner，令 Browser open/list/activate/close/restore 在 Agent disabled 或无 Space 时仍可工作；Agent disable 只 drain terminal/runtime consumers，不关闭 shared layout owner。保留既有 pageId/profile/zoom/restore、Cookie owner、旧入口、single-writer 和移动端懒加载合同。

## Inputs

回读 T13 ticket、T13-preflight、076 blocker report、`/tmp/huhu-t13-arch-probe.md`、T09 final Evidence、Spec/Map/Goal GP-036、DESIGN revision1/PAGE-001/PAGE-004、implementation-contracts，以及当前真实 app/module/Agent/Browser/workspace 源。不要复制未来 API 或创建第二 writer。

## Workspace and Scope

工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`。T11 writer 已停止。允许修改 T13 revision 37 writable_paths：

- `src/app/contracts/shared-workspace.ts`, `src/shell/shared-workspace/**`, `src/app/contracts/module.ts`, `src/app/main.ts`
- `src/app/contracts/workbench*.ts`, `src/app/workbench/compose-workbench.ts`, `src/app/workbench/browser-contribution.test.ts`
- `src/modules/agent/services/controller.ts`, `controller*.test.ts`, `workspace-store.ts`, `workspace-store*.test.ts`, `workspace-service.ts`, `workspace-service*.test.ts`
- `src/modules/agent/module.ts`, `src/modules/agent/api.ts`, `src/modules/agent/ui/AgentWorkspacePage.tsx`, `src/modules/agent/ui/browser/**`, `src/modules/agent/ui/tabs/TabStrip.tsx`, `src/modules/agent/ui/tabs/WorkspaceTab.tsx`, `src/modules/agent/ui/workspace/**`, `src/modules/agent/ui/workbench-page.ts`
- `src/modules/browser/api.ts`, `src/modules/browser/module.ts`, `src/modules/browser/module.test.ts`, `src/modules/browser/services/host*.ts`, `src/modules/browser/ui/**`, `src/modules/browser/i18n.ts`
- `scripts/obsidian-acceptance/browser-cookie-import.mjs`, `docs/browser.md`, `docs/architecture.md`, `main.js`, `styles.css`

Do not modify T11 history/control, T12/T14 consumers, native SQLite, dependencies, user data or Git. Root alone generates main.js/styles.css.

## Acceptance

1. Implement a provider-neutral shared owner/contract with one v2 writer and lifecycle that outlives Agent module disposal; preserve SpaceService recovery/merge/lease semantics rather than duplicating them.
2. Browser module must use the shared browser-tab port directly. Keep `AGENT_BROWSER_TABS` only as an active-Agent compatibility adapter; Browser acquisition must not activate Agent or start PTY/provider/history.
3. AgentController/WorkspaceService/UI must consume the injected owner and retain existing terminal behavior. Agent dispose must drain terminal/runtime resources while leaving Browser pages/layout available.
4. Add focused owner/controller/browser/DOM tests for Agent-off/no-Space open/restore, same owner across disable/re-enable, page close/split/focus and Cookie route. Tests must exercise production seams, not only mocks.
5. Run applicable Vitest, architecture, tsc/lint, formatting, build/bundle and browser-cookie script checks. Real Obsidian/Provider/OS IME/five-platform E2E remains user-owned.

## Return

Only write this task's REPORT.md and source paths above. Stop and report if preserving SpaceService semantics requires an additional path outside revision 37. Run:
`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 077-t13-shared-owner-stage2 --stage return`
