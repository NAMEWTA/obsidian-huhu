# 088 — Independent review: T-13 explicit-close cleanup

Reviewer: independent Opus 5.5 subagent (did not implement 085). Saved by Lead because the subagent harness blocked its file write; content is the reviewer's returned report, unedited in substance.
Scope: 8 files frozen in SCOPE.sha256, all matched (no drift).

## Verdicts
- Standards: **request-changes**
- Specification: **request-changes**

## Checks
- vitest scope tests + src/modules/browser: exit 0, 107 passed / 1 skipped
- tsc -p tsconfig.test.json --noEmit --skipLibCheck: exit 0
- eslint 8 scope paths --max-warnings 0: exit 0

## Standards findings
- **S-088-1 (medium)** `src/shell/host/workbench-pages.ts:151` — `close()` uses `entry.binding?.closeResource?.()`; a page still opening (no binding, e.g. awaiting activateModule('browser') or activation failed) closes the tab but leaves the Browser record, which resurrects (Agent workspace tabs; after reload BrowserCanvas `?? tabs[0]`). Fix: fall back to `contribution.closeResource(entry.target)` or await `entry.ready`; add deferred-create test.
- **S-088-2 (medium)** `src/modules/agent/module.ts:76-79,99-104`, `workspace-store.ts:327-329` — `SharedBrowserPort.close` fires `void editLayout().catch(report)`; editLayout resolves `{effect,error}` and never rejects, so `BrowserEngine.closePage` resolves before removal and write failure/conflict/module-off are silently lost. Fix: await editLayout, throw on error/unexpected effect, test.
- **S-088-3 (low)** `workbench-pages.ts:167-175` — saved-page removal awaited while key still in `saved`; concurrent navigation can prepare a live entry that is re-persisted without a record. Fix: prepare waits/refuses keys in `removing`, or close live entry after success.
- **S-088-4 (low)** `src/modules/browser/ui/workbench-page.tsx:26` — `?? tabs[0]` fallback now reachable: a mounted entry whose record was removed re-renders onto another tab's PageHandle and steals/blanks its webview. Fix: render empty/closed state when pageId set but missing.
- **S-088-5 (low)** `workbench-pages.ts:146-161` — concurrent close() on active key share removal but both navigate(); memoize the whole close per key.
- **S-088-6 (low, tests)** missing: no-binding close, BrowserEngine.closePage ordering (workspace.close rejection leaves page undisposed), createBrowserPage binding closeResource, real shared-port failure path.

Confirmed correct: idempotent removal via `removing`; rejection propagates before closeEntry/saved.delete; dispose during removal safe; compose-workbench throws workbench.notReady without service; idiom matches.

## Specification
- Explicit close deletes record: partial (fails for opening/failed-activation pages, S-088-1).
- Hide/switch/unload/Agent disable/plugin unload never delete: met by reading (only close/closeResource call hooks; BrowserEngine.dispose never calls workspace.close).
- Failure keeps tab+record consistent: shell layer only; end-to-end not met (S-088-2).
- No recursion: met. No regression of 081: met.
Real Obsidian/popout/reload not exercised (user-owned E2E).
