# T13 Browser route independent review

Session: 20261026T045732Z  
Task: 080-t13-browser-route-review  
Status: completed  
Reviewer: codex:/root/review_t10_final  
Review mode: source-files working-tree explicit scope  
Frozen scope digest: c7a125e50c91e31cc72f7176e208cd5b772b2ab03f1d23555cbe4a7a0f2c57ed  
Scope drift: 0/13  

## 聚焦交接

本轮只读取 TASK 冻结的 13 条 scope paths，以及 T13、078、079 交接材料；未修改产品源、生成物、Evidence、Goal、Map、Ticket，未派遣子 Agent。13/13 scope paths 已复核，scope drift=0。

## 标准轴

Reviewer: codex:/root/review_t10_final  
Axis: standards  
Result: request-changes  
Input-SHA256: c7a125e50c91e31cc72f7176e208cd5b772b2ab03f1d23555cbe4a7a0f2c57ed

Browser now has a desktop workbench rail entry and lazy module page loader (compose-workbench.ts:109-120). Browser opens through shell.open with the app-owned shared port (browser/module.ts:22-27,57-90). The route mounts in the owning document and persists page-store changes through shared.update (browser/ui/workbench-page.tsx:25-43).

Finding S-080-1 (high): Agent chooser cleanup is not exception-safe. Activation installs the chooser (agent/services/controller.ts:213-216), but module disposal awaits current.dispose before clearing it (agent/module.ts:381-385). Controller disposal can reject during native/lifecycle cleanup; then setSpaceChooser(undefined) is skipped, leaving a disposed Agent chooser reachable from the app-owned SpaceService. Clear it in finally and add a rejection-path regression test.

Finding S-080-2 (medium): The Browser route takes a one-time shared-tab snapshot and never subscribes to SharedBrowserPort.subscribe (browser/ui/workbench-page.tsx:19-24,64-90). Shared open/close/activate/update events from another Browser entry therefore do not cause this route to re-render or select the new active page. Subscribe and tear down with page lifecycle, or document immutability.

## 规范轴

Reviewer: codex:/root/review_t10_final  
Axis: specification  
Result: request-changes  
Input-SHA256: c7a125e50c91e31cc72f7176e208cd5b772b2ab03f1d23555cbe4a7a0f2c57ed

The route closes the prior Agent-off/no-route finding and preserves lazy ownership, but these contracts remain open:

- P-080-1 (high): Agent-off/no-Space operation must not retain a callable Agent-owned chooser after disable. Rejection during cleanup violates disable/re-enable lifecycle.
- P-080-2 (medium): Shared Browser owner state must round-trip and reflect current selection across workbench entries. The route does not observe the shared port, so persisted updates can be written while visible UI remains stale.

User-owned real Obsidian rendering, Chromium/Provider behavior, IME, and five-platform behavior were not exercised.

## 产物与验证

Reviewed all 13 frozen paths and T13/078/079 handoff reports. Root reports current tsc, architecture, 42 focused tests, eslint, and prettier checks pass; this review did not rerun those long checks. No source, formal Evidence, Goal, Map, Ticket, or excluded path was modified. This REPORT is the only task output.

## 问题与下一步

Resolve S/P-080-1 with exception-safe chooser clearing and a rejection regression test. Resolve S/P-080-2 by subscribing the Browser route to the shared port with teardown and testing cross-entry open/activate/update visibility. Re-run focused checks, then repeat independent review.

## validate-dispatch return receipt

Command:
`node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 080-t13-browser-route-review --stage return`

Receipt: exit 0
```json
{"errors":[],"warnings":[],"caveat":"Read-only structure checks do not authenticate tool identity, transcript content, authorization or completion; external histories are never opened."}
```

