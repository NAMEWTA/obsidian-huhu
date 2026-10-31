# 085 — T-13: explicit Browser page close removes persisted resource
Ticket: CHG/ticket/13-independent-browser.md (AC-041, AC-061). Read common rules: ../COMMON.md. Prior evidence: CHG/evidence/T-13.md (reviews 078–081 passed).

The previous Lead added, uncommitted and untested:
- `WorkbenchPageBinding.closeResource?` and `WorkbenchContribution.closeResource?(target)` in src/app/contracts/workbench-host.ts
- src/shell/host/workbench-pages.ts: `close(key)` awaits `entry.binding?.closeResource?.()`; `closeResource(feature,id)` for saved-but-unmounted pages awaits `contribution.closeResource(target)`
- browser contribution in src/app/workbench/compose-workbench.ts calls `BROWSER_HOST.closePage(resourceId)`; src/modules/browser/ui/workbench-page.tsx binding calls `host.closePage`.

## Deliver
1. Verify semantics: explicit user close of a Browser tab removes the shared-workspace browser record (no resurrection after reload); merely hiding/detaching/switching tabs or plugin unload/Agent disable must NOT delete it (Spec: closing display ≠ destroying; Browser independent of Agent lifecycle). Check every caller of `WorkbenchPages.close` / `closeEntry` to ensure only explicit close paths trigger deletion (not dispose/unload/eviction/`releaseWhenHidden`).
2. Check for recursion/double-close: does `host.closePage` → shared workspace close → any listener → shell `closeResource` → binding.closeResource → closePage again? Make it idempotent and non-recursive.
3. Failure handling: if closeResource rejects, the page should not silently vanish while the record remains — choose consistent behavior (report error, keep tab) and test it.
4. Tests: extend src/shell/host/workbench-surface.dom.test.tsx and/or a workbench-pages test, and src/app/workbench/browser-contribution.test.ts: mounted close deletes, unmounted saved close deletes, unload/hide does not delete, failure path, idempotency.

## Write set
src/shell/host/**, src/app/workbench/compose-workbench.ts, src/app/workbench/browser-contribution.test.ts, src/app/contracts/workbench-host.ts, src/modules/browser/** (ui/services/tests).
NOT yours: src/modules/agent/** (T-11 tasks running in parallel), src/app/main.ts unless strictly needed (then report first, do not edit).

## Checks
tsc (test config), vitest on touched tests + src/modules/browser + src/shell/host, eslint+prettier on touched files, `pnpm test:architecture`.

REPORT: CHG/sessions/20261027T-claude/085-t13-close-cleanup/REPORT.md
