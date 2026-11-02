# 091 — Independent re-review: T-13 explicit close (after 088 fixes)
Reviewer: independent Opus 5.5 subagent (not an implementer). Saved by Lead from the reviewer's returned report.
Scope: 12 files, SCOPE.sha256 OK, no drift. vitest 116 passed/1 skipped; tsc 0; eslint 0. Race probes in Lead scratchpad (P1–P6), no repo files modified.

Verdicts: standards **request-changes**; specification **request-changes**.

088 status: S-088-1 closed for the record but not the shell (N-1); S-088-2 closed; S-088-3 closed for re-save (nav side effects N-2); S-088-4 closed (untested, N-4); S-088-5 closed; S-088-6 closed.

- **N-1 (medium)** `src/shell/host/workbench-pages.ts:282` — closeOnce relies on `closeEntry(entry,false)` to delete `saved[key]`; if the entry was already closing with retain=true (prepare failure/cancel :209/:221, refreshAvailability :339) the earlier promise is returned and saved is never cleared. Probes P1 (restore+activation fail+close), P6 (closing while opening + navigate away), P4 (module disabled during removal): record removed, `list('browser')` still has the tab. Fix: after successful removal unconditionally `saved.delete`, clear `last`, `changed()`; tests for (a) failing create (b) aborted prepare (c) refreshAvailability during close.
- **N-2 (low)** `workbench-pages.ts:268`, `:132`, `:313-322` — `wasActive` read before awaiting removal; page activated during removal → blank workbench, no navigate; refused prepare also blank; ghost tab may be recreated from surface target. Fix: compute active just before closeEntry; navigate to sibling/recent when nothing active; test.
- **N-3 (nit)** `src/modules/agent/module.ts:108-110` — hardcoded English error strings reaching user; use t() en/zh.
- **N-4 (low)** no DOM test for S-088-4 (pageId without record → empty state, no other tab's page mounted).

Spec axis: explicit close met except N-1 races; hide/switch/unload/Agent disable never delete: met (P5 dispose during removal safe); failure consistency met except N-1; no stolen webview met; no 081 regression.

Out of round scope (Lead to decide):
1. "+"/first rail visit opens a page with a resourceId but no record → EmptyState without address bar/action (previously showed tab 0's webview = stealing bug). AC-041 "keep existing entry/tab experience" likely needs onNew via BROWSER_OPEN.open() or empty state with address bar.
2. Closing an inactive mounted tab calls neither changed() nor navigate (exists at HEAD).
3. Close/list only see the selected Space's layout (earlier T-13 design point).
4. open() writes layout without awaiting edit; close right after open can miss it (earlier code, narrow).
