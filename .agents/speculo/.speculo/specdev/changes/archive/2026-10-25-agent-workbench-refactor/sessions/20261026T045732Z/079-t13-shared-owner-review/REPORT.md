# T13 shared owner stage 3 independent review

Session: 20261026T045732Z  
Task: 079-t13-shared-owner-review  
Status: completed  
Reviewer: codex:/root/review_t10_final  
Review mode: source-files working-tree explicit scope  
Frozen scope digest: fc67f98c4422f774cc7aae4e890fe87c429070a07ef3e13093f1956175c87bfb

## 聚焦交接

本轮只读取 TASK 指定的 12 条 changed source/directly affected contract paths，以及 T13 ticket、Spec、Goal、Evidence/T-13、078 TASK/REPORT。未修改产品源、生成物、Evidence/Goal/Map/Ticket 或依赖，未派遣子 Agent。12/12 scope paths 由 `validate-specdev --review-scope --mode source-files` 重新固定，scope drift=0。

输入摘要：078 TASK SHA `c7a8f345dbb365a0f20dc2e1eb713ee357632eef9926f70338bced9a6f9029d7`；078 REPORT SHA `046bef3b0543fc72bb38a8966220a66844669646df68c0c2d5d18b2322142417`；T13 Ticket SHA `00ce92b7e89021fc4d412702320a00b411fa76f4d32de471436bd773a5b3dff8`；T13 Evidence SHA `e949aa27af6fc9f77a5bc79d72e5f964c564f7fe47583851a2c6ddbb573cf271`。

## 标准轴

Reviewer: codex:/root/review_t10_final  
Axis: standards  
Result: request-changes  
Frozen scope digest: fc67f98c4422f774cc7aae4e890fe87c429070a07ef3e13093f1956175c87bfb  
Observed: 12/12 paths revalidated; architecture and focused tests pass, but the shared port has an unused persistence update contract and the formatting gate fails on two changed paths.

通过观察：

- App owns one `SharedWorkspaceOwner`; Agent borrows its `SpaceService`/`WorkspaceStore`, and Browser shared mode does not call `acquire(AGENT_BROWSER_TABS)`; `src/app/main.ts:95-100,244-252`, `src/modules/agent/module.ts:41-141`, `src/modules/browser/module.ts:56-88`.
- WorkspaceService shared disposal retains persistence (`src/modules/agent/services/workspace-service.ts:2450-2465`), while the app owner eventually disposes the shared store; the existing Browser fixture verifies shared open with Agent unavailable (`src/modules/browser/module.test.ts:132-162`).

Finding S-079-1 (high): `SharedBrowserPort.update` is a public owner contract but has no production caller. The factory mutates persisted state only during `open`, `close`, and `activate` (`src/modules/agent/module.ts:81-130`); `src/modules/browser/module.ts:64-88` writes the initial tab only; `src/modules/browser/services/host.ts:397-410,461-517` updates PageHandle local state on navigation/title/profile/zoom but never calls `shared.browser.update`. A page can therefore navigate or change title/profile/zoom while the app-owned layout keeps stale metadata, so restart/recovery loses the current browser state. Fix by wiring one authoritative changed-state callback to `SharedBrowserPort.update` and testing navigation/title/zoom persistence through reload.

Finding S-079-2 (medium): the changed scope paths do not pass the declared formatter gate. `pnpm exec prettier --check ...` exited 126 and reported `src/app/workbench/compose-workbench.ts` and `docs/architecture.md`; `git diff --check` and ESLint pass, but this is a repository quality-contract failure for the delivered paths. Run the project formatter on the two paths and recheck without touching unrelated dirty files.

## 规范轴

Reviewer: codex:/root/review_t10_final  
Axis: specification  
Result: request-changes  
Frozen scope digest: fc67f98c4422f774cc7aae4e890fe87c429070a07ef3e13093f1956175c87bfb  
Observed: AC-041/AC-061 and T13 lifecycle contracts were checked against the current source; no independent production app unload/re-enable test exists in the 078 test set.

Finding P-079-1 (high): Browser open has no visible no-Agent workbench route. `DashboardPlugin.openBrowser` only acquires `BROWSER_OPEN` and calls `browser.value.show(request)` (`src/app/main.ts:373-381`). In shared mode the Browser module creates a PageHandle and persists it through `shared.browser.open`, but never calls `context.shell.open`/`openFocus` or activates a Browser page (`src/modules/browser/module.ts:58-88`). `composeWorkbench` contributes only the Agent `terminal` feature for the existing browser renderer (`src/app/workbench/compose-workbench.ts:72-85`), and the Browser module returns services/settings/activate/dispose without a workbench page contribution (`src/modules/browser/module.ts:33-54,135-140`). When Agent is disabled or there is no Agent page, the open operation can return a pageId while no user-visible browser tab is mounted. This fails AC-041's independent open/restore behavior. Fix by routing shared Browser open/list/activate into an app/Browser-owned visible contribution while preserving the single shared layout owner, then test Agent-off/no-Space open and restore.

Finding P-079-2 (high): persisted browser state cannot round-trip after live page changes. The app contract includes `update(pageId, ...)` (`src/app/contracts/shared-workspace.ts:13-22`), but no Browser production code calls it; only initial tab creation is persisted. Consequently a restored tab may reopen the original URL/title/profile/zoom instead of the current page after navigation or profile/zoom changes. This is an AC-041 recovery violation independent of the writer singleton.

Finding P-079-3 (medium): Agent disable leaves a stale UI Space chooser in the app-owned SpaceService. `AgentController` injects `dialogs.selectSpace` into the shared owner (`src/modules/agent/services/controller.ts:212-216`), and `SpaceService.requireSpace` later invokes that callback for interactive requests (`src/modules/agent/services/spaces/space-service.ts:472-495`). Agent module disposal only disposes the controller and never calls `setSpaceChooser(undefined)` (`src/modules/agent/module.ts:355-370`); the shared owner remains alive. A later interactive call can retain or invoke a disposed Agent picker after disable, violating the disable/re-enable lifecycle boundary and retaining UI resources. Clear the chooser on Agent disposal, then re-inject it on activation; add a disable→Browser/use→re-enable test.

Finding P-079-4 (medium): required lifecycle proof is absent from the production seam tests. `src/modules/browser/module.test.ts:132-204` covers shared open and Cookie read during Agent cleanup, but does not instantiate `createSharedWorkspaceOwner`, verify exactly-once app-unload disposal, exercise Agent disable→re-enable with the same owner, or verify chooser clearing and persistence round-trip. The 078 report explicitly leaves real app startup/restore, disable→re-enable and app unload unverified. Add focused factory/controller lifecycle tests before accepting AC-041.

规范通过项：单 writer 复用、shared WorkspaceService retain-persistence、Browser 不 acquire Agent 的静态接缝、旧 `AGENT_BROWSER_TABS` fallback 兼容及 Space `requireSpace` 的 explicit/interactive 分支均可定位；上述可见入口、状态回写和生命周期证据缺口使规范不能 accept。

## 产物与验证

- `node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --review-scope --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --mode source-files --file <12 paths>`：exit 0；12/12 snapshot paths，scope drift=0；canonical source-snapshot digest `fc67f98c4422f774cc7aae4e890fe87c429070a07ef3e13093f1956175c87bfb`。
- `pnpm exec vitest run src/modules/browser/module.test.ts src/modules/browser/services/host.test.ts src/modules/agent/services/controller-space.test.ts src/modules/agent/services/workspace-store-spaces.test.ts src/modules/agent/services/workspace-service-spaces.test.ts`：exit 0，5 files / 42 tests passed。
- `pnpm exec tsc --noEmit --skipLibCheck`：exit 0。
- `pnpm test:architecture`：exit 0，1255 modules，无 zone/host-package/desktop-only/barrel/cycle violations。
- `pnpm exec eslint --no-warn-ignored <scope paths>`：exit 0。
- `pnpm exec prettier --check <scope paths>`：exit 126；compose-workbench.ts、docs/architecture.md 报格式问题。
- `git diff --check -- <scope paths>`：exit 0。
- 未运行真实 Obsidian/Vault/Provider/IME/五平台 E2E、真实 app unload/re-enable、完整 build/lint/bundle/Cookie acceptance；不把 fixture 通过当作这些场景已通过。

## 问题与下一步

1. 为 shared Browser 增加独立可见的 app/Browser workbench route，并确保 Agent-off/no-Space open/restore 有真实生产接缝。
2. 把 BrowserPage 的 changed state 接到唯一 `SharedBrowserPort.update`，覆盖 URL/title/profile/zoom 的持久化恢复。
3. Agent disable 时清除共享 Space chooser；补 shared factory exactly-once dispose、disable→re-enable、app unload 顺序和恢复测试。
4. 修复 compose-workbench.ts 与 docs/architecture.md 的 Prettier 失败后重新冻结输入并复审。

## validate-dispatch return receipt

Command:
`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 079-t13-shared-owner-review --stage return`

Receipt: pending; run after report write and append exact validator JSON/exit code.

Validator result (actual): exit 0
```json
{"errors":[],"warnings":[],"caveat":"Read-only structure checks do not authenticate tool identity, transcript content, authorization or completion; external histories are never opened."}
```
