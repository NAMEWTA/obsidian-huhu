<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
## T-13 explicit Browser close: re-review after Round 4 (095)

**Verdicts**
- **Standards: pass.** I found no medium or higher correctness, race or error-handling defect. The low issues are listed below.
- **Specification: pass.** F-1 is closed on the path users can actually reach: a mounted page with running downloads now asks before anything is removed. Cancel keeps both the tab and the record, and confirm removes them. Every item I was asked to re-check holds, apart from one low item that is only partly fixed (L-2).

### Checks
- **Scope:** `sha256sum -c 095-t13-close-review4/SCOPE.sha256` reported all 12 files OK.
- **vitest** on `src/shell/host`, `src/modules/browser`, `browser-contribution.test.ts`, `shared-browser-close.test.ts` and `agent/module.test.ts`: exit 0. 32 files passed and 1 skipped; 132 tests passed and 1 skipped.
- **tsc** (`tsconfig.test.json --noEmit --skipLibCheck`): exit 0.
- **eslint** (`--max-warnings 0`) on the 7 scope files that are not tests: exit 0.
- **prettier --check:** only `src/app/contracts/workbench-host.ts` fails. It already failed at HEAD (the import line), and prettier is not part of `pnpm run lint`. `module.ts` now passes, so the earlier nit is fixed.
- **New probes** (scratchpad `probe4/shell.probe.tsx` and `probe4/browser.probe.tsx`):
  - **A:** a declined mounted close does not navigate or report, and the page stays active. A later close then removes it.
  - **B / B2:** a declined saved close clears `removing`. After that, `prepare` revives the page normally and a retry removes it.
  - **C:** the scenario from the 094 L-2 finding. The workbench still ends up blank (see L-2).
  - **D:** two concurrent closes share one confirmation, and a single "decline" settles both.
  - **E / F:** Escape gives `false`. Focus starts on Cancel, Tab moves to Close, and Enter gives `true`. The dialog has `aria-labelledby` and `aria-describedby`.
  - **G:** a surface hidden with `setVisible(false)` still shows the dialog, because it is portalled to `body`.
  - **H2:** if the record disappears while the dialog is open, the close hangs (see L-6).
- **Earlier race probes** P5, P6, P6b, P10, P12 and P13 were re-run against the current code and all pass, so nothing regressed. P11 and P14 behave the same as before (L-2 and L-3).

### F-1: closed
- **The binding now checks first.** In `src/modules/browser/ui/workbench-page.tsx:221-233`, `closeResource` counts downloads that are still `progressing`. If any are running, it asks through a confirmer bound late. Cancel returns `false` before `host.closePage` runs, so nothing is removed.
- **This matches the old entry.** The guard is the same as `workspace-service.ts:2016-2026` and uses the same message string.
- **The dialog uses existing pieces.** It is the `ui/components/alert-dialog` primitive, which follows the UI SKILL rule ("confirm → AlertDialog") and mirrors the dialogs in `AgentWorkspacePage.tsx:432` and `terminal/confirm.tsx`. It adds no new i18n keys:
  - `browser.close` comes from `src/shared/i18n/lazy/browser.ts:44/132` (en and zh).
  - `ui.cancel` comes from `src/shared/i18n/lazy/ui.ts`.
  - `browser.closeDownloads` comes from `browser/i18n.ts:16/172`, with `{count}` filled in.
- **Keyboard and accessibility:** focus starts on Cancel; Escape and the overlay both decline; Tab then Enter confirms; the title and description are linked through ARIA. The confirm button's click handler runs before Radix's `onOpenChange(false)`, so the second `finish(false)` does nothing.
- **Visibility:** the dialog portals to the document-level `huhu-portal-root`, and the Browser view is a DOM `<webview>`. The overlay therefore covers it, and closing an inactive (hidden) tab still shows the dialog (probe G).
- **Unmount:** when the canvas unmounts (on unload, an availability change or dispose), the effect cleanup resolves the pending confirmation as `false`. The shell then keeps the tab.
- **Tests:** they cover cancel keeping the page, confirm removing it, no dialog when no downloads are running, and an unmounted page with downloads being kept.

### The `false` (declined) contract in every caller
| Caller | Handling | OK |
|---|---|---|
| `WorkbenchPages.closeOnce`, mounted entry (`workbench-pages.ts:269-280`) | It uses `!== false`, so a `void` result still counts as success. When declined, it returns before `closeEntry`, `saved.delete`, `changed()` and navigation. Tab and record both stay. | yes |
| `WorkbenchPages.closeResource`, saved page (`:322-324`) | Declined → `return` before `saved.delete`. No report and no navigation. | yes |
| Browser contribution `closeResource` (`compose-workbench.ts:112-125`) | Running downloads on a page that is not mounted give `false`. With no service, it throws `workbench.notReady`, which is still treated as an error. | yes (see L-7) |
| Host `WorkbenchSurface.closeResource` / tab-strip `onClose` (`workbench-surface.tsx:89,272`), pane menu `context.close` (`:214`), `workbench-leaf.ts:48`, `compose-workbench.ts:575` (loop over leaves), `main.ts:141` → `ModuleContext.closeResource` | These are `Promise<void>`. A decline resolves normally, so `.catch(report)` does not fire and nothing reports an error. No module calls `context.closeResource` (checked with grep), so nothing needs to tell "declined" apart from "done". | yes |
| Memo cleanup | `closes` and `removing` are cleared in `finally` (`:261`, `:337`). After a decline, a later close runs a new removal, and saved `prepare` is no longer blocked (probes A, B, B2). | yes |

### Status of earlier findings
| Item | Status |
|---|---|
| **F-1** | **Closed** (see above). |
| **L-1** (duplicate records) | **Fixed.** The New tab button is disabled while an open is pending, and the test checks that `open` is called once. `SharedBrowserPort.close` now removes every record with the same pageId in one edit (`module.ts:104-125`), with a test. |
| **L-2** (blank workbench after closing a saved page) | **Partly fixed.** The fix (`:321,329`) only handles the case where the removed saved page was `last` before the removal. The scenario from the 094 finding is still open: close a saved tab that is not the latest, then click it while the removal is pending. `prepare` returns undefined, `show(undefined)` runs, `wasLatest` is false, there is no navigation and the workbench stays blank (probes C and P11). Still low. Fix: also navigate when nothing is active and the surface's current target (`state.target`) is the removed page. |
| **L-4** (button errors not surfaced) | **Fixed.** A throw from `createPage` and a rejection from `shared.open` both raise a `Notice`, the page is disposed and the button is enabled again. Both cases are tested. |
| **N-1 to N-4, S-088-\*, 081, Item 4** | **No regression.** The probes and the full scope suite pass. The `removing` guard in `prepare` (S-088-3), the shared close (S-088-5), the re-key and `saved` clearing (N-1) and the read of `wasActive` after the removal settles (N-2) are unchanged. |
| **L-3, L-5, raw `partial`/`unknown` token** | Unchanged, as the implementer stated. |

### Lows (non-blocking)
- **L-6: the close hangs if the record disappears while the dialog is open.** Locations: `workbench-page.tsx:57-73` and `:110-186`.
  - **Cause:** the confirmer is bound whether or not a page exists, but `<AlertDialog>` is only rendered when one does. If the shared record goes away while the dialog is open, the canvas switches to the empty state. The dialog disappears, but its promise never settles (probe H2: `dialog count 0`, still pending). How the record can go away meanwhile:
    - the tab is closed from the Agent workspace in another window;
    - the selected Space changes;
    - the layout changes externally.
  - **Effect:** the shell's `closes` and `removing` entries stay pinned for that key, so pressing x again does nothing until the surface closes. Clicking "New tab" brings back the stale dialog. The same applies if `host.getPage` has a page with running downloads but there is no record.
  - **Fix:** render the dialog in both branches, or resolve any pending confirmation as `false` when `page` becomes undefined.
- **L-7: some declines give no feedback.**
  - **Where:** a saved, unmounted page with running downloads (`compose-workbench.ts:121`), or a binding whose `confirmer.ask` is not bound yet (`workbench-page.tsx:229`, which falls back to `?? false`).
  - **What happens:** pressing x does nothing, with no notice. This can happen when the same pageId is live in the Agent workspace with a download running.
  - **Assessment:** the result is consistent and protects the download. A `Notice` with `browser.closeDownloads`, or opening the page so it can ask, would make the outcome clear.
- **L-8: missing test for the contribution's decline branch.** No test covers the `running → false` branch of `compose-workbench.ts`. `browser-contribution.test.ts` always uses `getPage: () => undefined`. The implementer's "unmounted+downloads keeps" test exercises the binding, not the contribution.
- **Nits:**
  - The dialog's confirm button uses hand-written destructive classes instead of `buttonVariants({ variant: 'destructive' })`, so it misses the dark-mode token variants. This copies the existing Agent dialog pattern.
  - There is no `AlertDialogHeader` wrapper.
  - The `workbench-host.ts` prettier failure predates this round.

### Not verified
- Real Obsidian end-to-end: an actual download, the dialog over a real `<webview>`, popout windows, reload. These are user-owned checks.
- The full i18n parity suite. I checked the keys by hand.