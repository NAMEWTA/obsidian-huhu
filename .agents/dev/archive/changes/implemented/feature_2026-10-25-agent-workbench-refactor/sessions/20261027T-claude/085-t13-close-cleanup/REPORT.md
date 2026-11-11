# 085 REPORT — T-13 explicit Browser close cleanup

## Behavior
- Verified callers: only `WorkbenchPages.close` (explicit tab close, pane-menu close, `context.close`) and `closeResource` (tab strip x, host API) invoke `closeResource`. `closeEntry` paths (dispose/unload, `refreshAvailability`, `releaseWhenHidden`, cancelled opening, prepare failure) never do, so hide/switch/unload/Agent-disable keep the record.
- No recursion: `BrowserEngine.closePage` -> `workspace.close` -> `disposePage` has no listener back into the shell; nothing in src/modules calls the host-level `closeResource`.
- Idempotency: added `removing` map in `WorkbenchPages`; concurrent closes of the same key share one removal; a later close finds no entry/saved page and is a no-op.
- Failure: removal rejection propagates before `closeEntry`/`saved.delete`, so tab and record both stay; callers already `report` errors. Saved-unmounted path same.
- compose-workbench Browser `closeResource` now throws `workbench.notReady` when the Browser service is absent (previously silently dropped the saved tab while the record remained).

## Changed paths
- src/shell/host/workbench-pages.ts
- src/app/workbench/compose-workbench.ts
- src/app/workbench/browser-contribution.test.ts (new test)
- src/shell/host/workbench-pages.dom.test.tsx (new, 5 tests)

## Checks
- vitest src/shell/host src/app/workbench/browser-contribution.test.ts src/modules/browser: exit 0, 29 files passed, 109 tests.
- tsc -p tsconfig.test.json --noEmit --skipLibCheck: exit 0.
- eslint on non-test touched files (tests are eslint-ignored): clean, 0 warnings.
- prettier --check on new test files: pass. (compose-workbench.ts was already prettier-reformatted in the dirty tree; workbench-pages.ts uses repo's 1-space style; not reformatted.)
- pnpm test:architecture: exit 0.

## Gaps
- Real Obsidian reload/no-resurrection not verified. Pages opened in other windows' leaves: host-level `closeResource` iterates leaves, the first removal wins and others are no-ops via the saved-page lookup.
- contracts/workbench-host.ts and modules/browser needed no change.

## Round 2 (review 088 findings S-088-1..6)
- S-088-1: `close()` of a page without a binding awaits `entry.ready`, then uses the binding's `closeResource`, or falls back to `contribution.closeResource(entry.target)` (also when create failed). Test: failed/deferred activation.
- S-088-2: `SharedBrowserPort.close` (src/modules/agent/module.ts only; workspace-store.ts needed no change) now awaits `editLayout` and throws on `result.error` or effect `partial`/`unknown`; no-store fallback uses `updateLayout`. Test: src/modules/agent/shared-browser-close.test.ts (completed, error, unknown, missing tab).
- S-088-3: `prepare` returns undefined for a saved key whose removal is in flight, so it cannot be revived into a re-persisted live entry.
- S-088-4: BrowserCanvas uses `tabs[0]` only when no `pageId`; a missing record for a given pageId shows the empty state and never takes over another tab's PageHandle. Note: the "+" new-page button (fresh random id, no record yet) now shows the empty state instead of mirroring tab 0.
- S-088-5: `close(key)` memoized per key (`closes` map): concurrent closes share removal and a single follow-up navigation. Test added.
- S-088-6: tests added: no-binding close, prepare during removal, concurrent close, `BrowserEngine.closePage` ordering (workspace.close rejection leaves page undisposed) in services/host.test.ts, `createBrowserPage` binding closeResource in ui/workbench-page.dom.test.tsx, real shared-port failure path.
- Extra changed paths: src/modules/agent/module.ts, src/modules/browser/ui/workbench-page.tsx, src/modules/browser/ui/workbench-page.dom.test.tsx, src/modules/browser/services/host.test.ts, src/modules/agent/shared-browser-close.test.ts.
- Note: workbench-pages.ts was reformatted by prettier (tabs; it was 1-space unformatted at HEAD), so its diff is large but behavior-neutral.
- Checks: vitest (src/shell/host, browser-contribution, src/modules/browser, agent module.test, shared-browser-close, workspace-store*) exit 0, 34 files / 136 tests passed; tsc test config exit 0; eslint on touched non-test files exit 0; `pnpm test:architecture` exit 0. Prettier --check passes on new/edited tests and workbench-pages.ts; module.ts, workbench-surface.tsx and several untouched browser ui files were already non-prettier before my edits.
- Gaps: real Obsidian reload/no-resurrection still user E2E.

## Round 3 (re-review 091)
- N-1: after a successful removal `closeOnce` unconditionally deletes `saved` (for the original and any re-keyed key), clears `last`, and calls `changed()`, so an earlier retaining close (failed/aborted opening, availability change) cannot leave the tab. Tests: failing create, aborted prepare, refreshAvailability during removal (src/shell/host/workbench-pages.dom.test.tsx).
- N-2: `wasActive` is now read after the removal settles, just before `closeEntry`; also navigates to a neighbour when the page was the latest shown and nothing is active (shown during removal). Test added. Not addressed: a ghost tab recreated from a surface target (could not reproduce from the shell side).
- N-3: `agent.browser.removeFailed` / `agent.browser.removeIncomplete` ({effect}) added to src/modules/agent/i18n.ts (en+zh), used via t() in module.ts.
- N-4: BrowserCanvas exported; DOM test in src/modules/browser/ui/workbench-page.dom.test.tsx: page id without a record renders the empty state and mounts no other tab.
- Out-of-scope 1: the empty state for a page id without a record now has a "New tab" Button (existing `browser.newTab` string, ui Button) that explicitly creates the page with `host.createPage({restoreId})` and persists it through `shared.open`; it disposes the page if open fails. Explicit (not automatic) so a record removed elsewhere is never silently recreated. Tested (click creates record, no auto-open).
- Out-of-scope 2: `changed()` is now called on every explicit close, so closing an inactive mounted tab redraws the strip with no navigation. Tested.
- Item 3 (selected-Space-only list/close): real design limitation, pre-existing; tabs in a non-selected Space are neither listed nor closable by the port. Unchanged.
- Item 4 (open then immediate close): plausibly real but narrow. `open` enqueues its edit without awaiting; `close` looks the tab up with `readLayoutNow`, which only reflects it once the queued edit publishes. Not changed; fix would be to have close wait for the pending edit queue.
- Changed (extra): src/modules/agent/i18n.ts, src/modules/browser/ui/workbench-page.tsx, plus the files above.
- Checks: vitest (src/shell/host, browser-contribution, src/modules/browser, agent shared-browser-close + module.test) exit 0, 32 files / 122 tests passed; tsc test config exit 0; eslint on touched non-test files exit 0; `pnpm test:architecture` exit 0; prettier --write applied to touched files.
- Not verified: real Obsidian; the full i18n parity test (a run without a file list started the whole suite and was stopped).

## Round 3b (item 4: open then immediate close)
- src/modules/agent/module.ts: `edit` records queued `editLayout` promises in `pendingEdits`; `SharedBrowserPort.close` awaits it before looking the tab up, so a close right after `open` sees the new tab (workspace-store.ts unchanged).
- Test (src/modules/agent/shared-browser-close.test.ts): delayed-publish editLayout; open then immediately close leaves no tabs. The first version of the test did not discriminate (it asserted before the delayed publish); it now waits 40 ms after close and was confirmed to fail with the `await pendingEdits` removed and pass with it.
- Checks: vitest (shared-browser-close, agent module.test, workspace-store*) exit 0, 4 files / 23 tests; eslint module.ts exit 0; tsc test config exit 0; `pnpm test:architecture` exit 0.

## Round 4 (review 094)
- F-1: explicit close of a Browser page with running downloads asks first, using the existing `browser.closeDownloads` string. The Agent workspace dialog is a React-local AlertDialog (ConfirmFn lives in AgentWorkspacePage), so it cannot be called from the Browser page; the Browser canvas renders the same kind of in-page AlertDialog (ui/components/alert-dialog, cancel = `ui.cancel`, action = `browser.close`, no new i18n keys) and the binding asks through a late-bound `CloseConfirmer`. workspace-service.ts untouched.
  - Contract: `WorkbenchPageBinding.closeResource` / `WorkbenchContribution.closeResource` may resolve `false` = declined; `WorkbenchPages` then keeps tab and record (mounted and saved paths). `removeResource` now returns a boolean.
  - Unmounted saved page with running downloads: no dialog is possible, so the contribution returns `false` (page kept, no notice), matching the Agent behaviour without a dialog. Downloads normally cannot run on an unmounted page.
  - Tests: binding cancel keeps (closePage not called), confirm removes, no downloads needs no dialog, unmounted+downloads keeps; shell tests for declined mounted and saved removal.
- L-1: New tab button disabled while opening (test: one `open` call); `SharedBrowserPort.close` now removes every browser tab record with that pageId in one edit (test with duplicates).
- L-2: after a saved-page removal, if nothing is active and the removed page was the latest shown, the shell navigates to a neighbour (`neighbour()` extracted from close). Test added.
- L-4: `createPage` throw and `shared.open` rejection are reported with an Obsidian `Notice` (the same path host.ts already uses), the page is disposed, button re-enabled. Tests for both.
- Nit: module.ts prettier-formatted.
- Changed paths: src/app/contracts/workbench-host.ts, src/shell/host/workbench-pages.ts, src/app/workbench/compose-workbench.ts, src/modules/agent/module.ts, src/modules/browser/ui/workbench-page.tsx; tests: src/shell/host/workbench-pages.dom.test.tsx, src/modules/browser/ui/workbench-page.dom.test.tsx, src/app/workbench/browser-contribution.test.ts, src/modules/agent/shared-browser-close.test.ts.
- Checks: vitest (src/shell/host, src/modules/browser, browser-contribution, shared-browser-close, agent module.test) exit 0, 32 files / 132 tests; tsc test config exit 0; eslint on the 5 touched non-test files exit 0; `pnpm test:architecture` exit 0; prettier --check on the 4 main touched files passes.
- Not changed/known: L-3 (silent no-op on stale pane-menu close), L-5 (empty-state flash), raw `partial`/`unknown` token in the localized message remain as reviewed. Real Obsidian not verified.

- Note: src/shell/navigation-state.test.ts now uses a truly unknown feature id for the dashboard fallback and a separate browser case (unknown section and control-character resourceId dropped, result `{feature:'browser'}`); test passes.

SOURCE STOPPED
