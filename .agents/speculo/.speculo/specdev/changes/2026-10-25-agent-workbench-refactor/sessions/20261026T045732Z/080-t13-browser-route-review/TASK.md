---
schema_version: 2
session: "20261026T045732Z"
task: "080-t13-browser-route-review"
kind: review
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-13"
---

# T13 Browser route repair review

## Goal

独立复核 task 078 与 Root 对 079 findings 的修复，确认 Browser 在 Agent-off/no-Space 时有生产 workbench route，shared browser update/chooser lifecycle 正确，且不破坏架构、懒加载和已有入口。

## Inputs

Read T13, 078/079 reports, current source, Spec/Map/Goal and relevant architecture/UI references. Review standards/specification separately. Do not edit source/Evidence.

## Workspace and Scope

Repo `/home/wta/orca/workspaces/obsidian-huhu/terminal`; frozen scope:

- `src/app/contracts/workbench.ts`
- `src/app/workbench/compose-workbench.ts`
- `src/app/contracts/shared-workspace.ts`
- `src/app/contracts/module.ts`
- `src/app/main.ts`
- `src/modules/agent/module.ts`
- `src/modules/agent/services/controller.ts`
- `src/modules/agent/services/workspace-service.ts`
- `src/modules/agent/services/spaces/space-service.ts`
- `src/modules/browser/module.ts`
- `src/modules/browser/module.test.ts`
- `src/modules/browser/ui/workbench-page.tsx`
- `docs/architecture.md`

No source edits. Check route visibility, page lifecycle/React owner document, BrowserEngine/page disposal, update persistence, shared owner creation/disposal, Agent disable/re-enable, Space chooser clearing, lazy loading and existing compatibility fallback.

## Acceptance

Report exact severity/path/evidence findings, tests/checks and verdict. Note user-owned real Obsidian/Provider/IME/five-platform E2E separately.

## Return

Write only REPORT.md in this task directory and run return validator for task 080.
