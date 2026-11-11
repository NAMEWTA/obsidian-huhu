<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
## Final re-review of T-13 explicit Browser close cleanup (094)

**Verdicts**
- **Standards: pass.** I found no medium or higher correctness, race or error-propagation defect in the code. Lows are listed below.
- **Specification: request-changes.** Every criterion listed for this round passes. The blocker is one medium gap I found outside that list (F-1): closing a Browser tab with an explicit close silently cancels its in-progress downloads, with no warning first. The old close entry warned first. If you rule download confirmation out of T-13, the specification verdict becomes **pass**.

### Checks
- **Scope:** `sha256sum -c` on 094 `SCOPE.sha256` reported all 13 files OK (no drift).
- **vitest:** I ran `src/shell/host`, `src/modules/browser`, `browser-contribution.test.ts`, `shared-browser-close.test.ts` and `agent/module.test.ts`. Exit 0: 32 files passed and 1 skipped; 123 tests passed and 1 skipped.
- **tsc** (`tsconfig.test.json --noEmit --skipLibCheck`): exit 0.
- **eslint** (`--max-warnings 0`) on the 8 non-test scope files: exit 0.
- **prettier --check:**
  - `src/modules/agent/module.ts:116` is new code from Round 3 and is not formatted. The implementer's report says `prettier --write` was applied, which is not accurate for this line.
  - `src/app/contracts/workbench-host.ts` already failed at HEAD (the import line).
  - Prettier is not part of `pnpm run lint`, so neither is blocking.
- **Mutation checks:** I ran copies of the repo test file against modified copies of `workbench-pages.ts` in the scratchpad.
  - Removing the unconditional `saved.delete` (line 286) makes 3 tests fail: failing create, aborted prepare, and availability change during removal.
  - Removing `changed()` (line 289) makes the inactive-tab redraw test fail.
  - So the N-1 and item-2 tests catch real breakage.
- **Race probes:** probes P5, P6, P6b and P10–P14 are in `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/probe/race.probe.tsx`. All behave as expected, apart from two low residuals (P11, P14) listed below.

### Status of earlier findings
| Item | Status | Evidence |
|---|---|---|
| N-1 (tab stays after record removed) | **Closed** | `src/shell/host/workbench-pages.ts:286-289`: after a successful removal, `saved` is cleared for the original and re-keyed keys, `last` is cleared and `changed()` runs. The 3 new tests catch the bug (mutation check). Probe P5: a failed removal during an availability change keeps the tab saved. P6/P6b: closing while the page is opening, then navigating away, removes both record and tab. |
| N-2 (blank workbench after close) | **Closed** for mounted pages | Lines 282-283: `wasActive`/`wasLatest` are read after the removal settles. Probe P12: if the user moves to another feature during removal, it does not navigate back. Saved-page residual: L-2. |
| N-3 (hardcoded English errors) | **Closed** | `agent.browser.removeFailed` / `removeIncomplete` exist in en (`i18n.ts:4-5`) and zh (`:789-790`). They are registered at the top of `module.ts`, before the app-created owner can run, and `{effect}` interpolation works through `runtime.ts:95`. Nit: the raw token `partial`/`unknown` appears in the user-facing text. |
| N-4 (test for page id without a record) | **Closed** | `workbench-page.dom.test.tsx:27`: `getPage` returns another tab's handle for any id, and the test asserts `mount` is never called. It would have failed with the old `?? tabs[0]` fallback. |
| Item 1 (new page with no record) | **Fixed (explicit)** | `src/modules/browser/ui/workbench-page.tsx:68-90`: the empty state shows a "New tab" Button (`browser.newTab` en/zh, a real button with an accessible name). Clicking it creates the page and its record, with the same pageId as the shell tab. Nothing opens automatically, so a record removed elsewhere is never silently recreated. Low notes: L-1, L-4. |
| Item 2 (closing an inactive tab did not redraw) | **Fixed** | `changed()` runs on every explicit close; the test catches it. |
| Item 3 (only the selected Space is seen) | **Unchanged, as expected** | `module.ts:77`: `snapshot()` and `close` still use `selected()`. |
| Item 4 (open then immediate close) | **Fixed** | `module.ts:79-84,105`: `pendingEdits` is read once per close, so a steady stream of `update` edits cannot stall it. The queued edit has a `.catch(report)` attached, so the chain never rejects. The test (wait 40 ms, then assert) fails without the fix. |

### Specification criteria
- **Explicit close removes the record in all states, and the shell tab matches:** met. This covers mounted, saved-unmounted, still opening, failed activation, aborted opening, and an availability change mid-close.
- **Hide, switch, unload and Agent disable never delete:** met.
  - Only `close` and `closeResource` call the remove hooks.
  - `dispose` and `refreshAvailability` only affect the in-memory list.
  - The shared port is app-owned (`createSharedWorkspaceOwner`), so disabling Agent does not touch Browser records.
  - Probe P10: disposing during a removal causes no navigation and no error report.
- **Failure consistency end to end:** met. The chain is: `editLayout` returns an error or a `partial`/`unknown` effect → the port throws → `BrowserEngine.closePage` rejects before `disposePage` → the binding rejects → `removeResource` rejects → the tab is kept → callers report the error. Probe P13: concurrent closes share the failure, and a retry succeeds.
- **No stolen webview:** met.
- **New page usable:** met (via the button).
- **No regression of review 081 behavior:** none seen.

### Finding (medium, specification)
**F-1: explicit close silently cancels in-progress downloads.** Locations: `src/shell/host/workbench-pages.ts:278-279`, `src/modules/browser/services/host.ts:150-153`, and `src/modules/browser/platform/desktop/page.ts:500-503`.
- **What happens:** A download is running in a Browser workbench tab. The user clicks the strip's x, or "Close page" in the pane menu. The chain is `closePage` → `workspace.close` → `disposePage` → `PageHandle.dispose`, which ends in native dispose calling `item.cancel()` on every download. The download is lost with no prompt.
- **What the old entry did:** `WorkspaceService.close` (`src/modules/agent/services/workspace-service.ts:2016-2026`, also present at HEAD) asks `browser.closeDownloads` before closing.
- **Why it matters:** AC-041 says the original entry and tab experience is kept, and ticket step 3 moves the original close entry onto the shared host. Neither is met for this case.
- **It is not new in Round 3.** It has existed since the independent Browser workbench page was added. Earlier reviews did not raise it.
- **Fix condition:**
  - Before the record is removed, an explicit workbench close of a page with downloads still running asks for confirmation. One option is a confirm hook on `WorkbenchPageBinding.closeResource`, or in `createBrowserPage`, using the existing `browser.closeDownloads` string and a built-in dialog (the Obsidian `confirm` used elsewhere).
  - Cancelling leaves both the record and the tab.
  - Add a test: with a running download, cancel leads to no removal; confirm leads to removal.

### Lows (non-blocking)
- **L-1: the "New tab" button allows duplicate records** (`workbench-page.tsx:70-86`, `module.ts:104-107`).
  - Two clicks before the first record is published (possible when a layout save is in flight) both reach `shared.open`. They create two tab records with the same pageId: `createPage` returns the existing page, and `ops.openTab` does not deduplicate by pageId.
  - `SharedBrowserPort.close` removes only the first match (`find`), so after an explicit close the second record survives in the Agent workspace.
  - Fix: disable the button while the open is pending, and/or make `close` remove every tab with that pageId.
- **L-2: blank workbench after a saved-page close** (`workbench-pages.ts:320-329` together with `:132`).
  - The user closes an unmounted saved tab, then clicks the same tab while the removal is pending. `prepare` refuses (correctly), `show(undefined)` leaves the workbench blank, and the saved-page path never navigates afterwards. Confirmed by probe P11.
  - Fix: after a saved-page removal, navigate to a sibling when nothing is active and the current target is the removed page.
- **L-3: silent no-op from a stale pane-menu close** (`workbench-pages.ts:266-267`).
  - `close(key)` on an entry that an availability change has already closed (keeping it saved) does nothing: no removal, no error. Reachable only through a pane-menu action captured earlier. Probe P14. The result is consistent (tab and record both stay), just silent.
- **L-4: button errors are not surfaced** (`workbench-page.tsx:74,85`).
  - `host.createPage` can throw synchronously (`browser_profile_deleting`, invalid home URL) inside `onClick`, and it is not reported.
  - `.catch(() => host.disposePage(...))` swallows the `shared.open` rejection with no report or notice.
- **L-5: empty-state flash on new tabs.** `BROWSER_OPEN.open` → `shell.open` can render before the record is published. The empty state with the "New tab" button flashes until publish, and clicking it in that window leads to L-1.
- **Nits:**
  - `module.ts:116` is not prettier-formatted.
  - The `partial`/`unknown` effect tokens appear raw in localized text.
  - The `effect === 'partial' | 'unknown'` branch at `module.ts:117` cannot be reached today, because `editLayout` returns those effects only together with an error, which line 116 already throws on. It is harmless.

### Not verified
- Real Obsidian: reload with no resurrection, popout windows, download behavior. These are user-owned end-to-end checks.
- The full i18n parity suite; I checked the keys by hand only.