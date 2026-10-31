---
schema_version: 2
session: "20261026T045732Z"
task: "078-t13-shared-factory"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-13"
---

# T13 shared owner factory stage 3

## Goal

在不复制 SpaceService writer 的前提下，沿 scope revision 38 让 app 在桌面启动时通过 Agent module 的懒入口创建一个跨 Agent 生命周期的共享 owner；AgentController/WorkspaceService 借用 owner，Browser module 直接消费共享 browser port，不 acquire `AGENT_BROWSER_TABS` 才能 open/list/activate/close。Agent disable 只释放终端资源，app unload 才 dispose owner。旧交互入口继续要求显式 Space 选择；无绑定的自动化/快捷入口不得按 cwd 猜 Space。

## Inputs

回读 T13 ticket、077 blocker report、现有 Agent module/controller/SpaceService/WorkspaceStore 和 Browser module。

## Constraints

- 保留现有 SpaceService、JsonStore、recovery、lease、Inbox 和 layout merge 语义；不得复制 writer 或新建第二 v2 文件。
- app 只通过字面量 `import('../modules/agent/module')` 获取工厂，不直接导入 Agent services；浏览器只依赖 app contract 和 shared owner，不 acquire Agent。
- 共享 owner 工厂可以复用 Agent module 内部现有 SpaceService/createSpaceWorkspaceStore/desktop ports；增加 `SpaceService.setSpaceChooser` 仅为 Agent 激活后注入 UI chooser。
- 不改 native/T11/T12/T14/T15；root 负责 build/main.js/styles.css。

## Workspace and Scope

工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`。

## Writable paths

- `src/app/contracts/shared-workspace.ts`
- `src/app/contracts/module.ts`
- `src/app/main.ts`
- `src/modules/agent/module.ts`
- `src/modules/agent/services/controller.ts`
- `src/modules/agent/services/controller*.test.ts`
- `src/modules/agent/services/spaces/space-service.ts`
- `src/modules/agent/services/spaces/space-service*.test.ts`
- `src/modules/agent/services/workspace-store.ts`
- `src/modules/agent/services/workspace-service.ts`
- `src/modules/agent/services/workspace-service*.test.ts`
- `src/modules/browser/module.ts`
- `src/modules/browser/module.test.ts`
- `src/modules/browser/services/host*.ts`
- `src/modules/browser/api.ts`
- `src/app/workbench/compose-workbench.ts`
- `src/modules/agent/ui/**`
- `docs/architecture.md`
- `main.js`
- `styles.css`

## Acceptance

1. `pnpm test:architecture` passes and no app/shell import reaches Agent services directly.
2. Shared owner is instantiated once by app, remains alive across Agent module off/on, and is disposed exactly once by app unload.
3. Agent controller borrows owner spaces/workspace store and injects chooser after activation; existing Agent UI and tests preserve behavior.
4. Browser open path uses shared owner browser port directly; compatibility `AGENT_BROWSER_TABS` may remain only for active Agent consumers. No Browser `acquire(AGENT_BROWSER_TABS)`.
5. Old interactive methods still call `requireSpace(..., {interactive:true})`; automated/quick/dispatch paths with no explicit space return a stable target-required/configuration error before spawning. Do not infer from cwd.
6. Focused tests, tsc, architecture, eslint/prettier/diff check; root later runs build/lint/tests as applicable.

## Return

Write REPORT.md under this task and source paths above. Run return validator for task 078. Stop with exact blocker if any additional path outside this list is required.
