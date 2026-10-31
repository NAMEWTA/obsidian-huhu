<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
**T-15 re-review (Round 5/5b): Standards pass, Specification pass.** M-3, N-1 and N-2 are all closed, and I found nothing new at medium or above. I changed no repository files: `main.js` and `styles.css` had the same md5 before and after the checks, and all probes ran in memory under `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t15r3/`.

## Checks
| Check | Result |
|---|---|
| `pnpm exec vitest run src/shared src/app test/agent-migrations src/modules/agent/services/migrations` | exit 0; 58 files and 484 tests passed |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `pnpm run lint` | exit 0, no warnings |
| `check-bundle --budget scripts/bundle-budget.json --enforce` | exit 0, "within limits"; main.js measures 6635.1 KB, which matches the recorded 6,794,362 B |

**Bundle limit.** `outputBytes` goes from 6,794,240 to 6,795,264, the smallest 1 KiB ceiling above 6,794,362. The Round 5 reason says it is +122 B over the Round 4 limit. The `round5` section of `CHG/evidence/T-15-budget-attribution.json` gives +425 B over the Round 4 measured size: `recovery-transaction.ts` +137, `migration.ts` +258, and about 30 B left over. It says openly that the leftover may come from the session-113 changes to `writer-owner.ts` / `ports.ts`, which are measured together and can't be separated. That is acceptable. eager and agent activation limits were not raised.

## M-3: closed
The fix is at `recovery-transaction.ts:308-315`: a failed write #2 (`committing`) now calls `closeFailed('journal-committing-failed')`. The generic probe (`probe2.ts`) failed each journal write in three ways: fails before landing, lands then throws, and lands but the read-back fails.

| Write | All 3 modes | Owners released | Gate held | After restart |
|---|---|---|---|---|
| #1 | WRITE_FAILED | yes | no | The user's edit made after release is kept (prepared rollback skips it), and a rerun succeeds |
| #2 | UNRECOVERABLE | no | yes | rolled back to all-old; rerun succeeds |
| #3 | UNRECOVERABLE | no | yes | before landing: rolled back to all-old; landed or read-back: rolled forward to all-new |
| #4 | UNRECOVERABLE | no | yes | rolled forward, or nothing to do because the journal already says `done`; all-new |

No case left a mix of old and new files.

**Legacy import** (`probe3.ts`, same 4×3 matrix):
- **#1:** the gate is not held, so startup continues. A `workbench-v2.json` created later in that session is **kept** after restart. This is no regression: owners still release and later edits survive.
- **#2–#4:** the gate is held, so `afterSettings` shows the notice and rethrows, and modules never start. After restart the files are either fully rolled back (followed by a clean `migrated`) or fully rolled forward (followed by `already-migrated`).
- The Round 4 data loss (records deleted after the user had created Spaces) **can no longer happen.**

**Extra probe** (`probe4.ts`) covered the drift rollback and the rollback after a failed replacement:
- **Drift rollback, #2/#3 land then throw:** owners are released. The user's edit and the foreign edit both survive, because the rollback keeps `from: prepared` and skips files edited elsewhere.
- **Replace failure, then the `rolling-back` write lands and throws:** the result is `rollback-failed`, owners stay closed, and the restart converges to all-old.

**Tests and the test helper:** `FaultStorage` now has `landThenThrow` and `failRead`. Tests cover the 2 failure modes × writes #1–#4, both generic (`recovery-transaction.test.ts:354-400`) and legacy (`legacy-migration.test.ts:379-407`).

## N-1: closed
In both en and zh, `agent.migration.blocked` no longer claims "Nothing was overwritten". It now tells the user to fully quit and restart Obsidian, and if the notice appears again, to restore by hand from `.huhu/recovery/transaction/<operation>/`. Both places that show it (`recovery-start.ts:19,51`) are correct.

## N-2: closed
`recovery-transaction.ts:238` rejects more than 64 paths (writes and copies combined, after removing duplicates) with `STAGE_INVALID` before anything is written. Probe results:
- **64 entries:** the run succeeds, changes 64 files, releases owners, and the journal reads back as `done`.
- **64 entries with a crash mid-replace:** the restart rolls everything back.
- **65 entries, or 60 writes plus 15 copies (70 distinct paths):** rejected with `STAGE_INVALID` and 0 writes.

## Low findings (non-blocking)
- **One weak assertion.** In `recovery-transaction.test.ts`, the M-3 check `outcome.status === 'none' || frozen !== undefined` is always true. The all-old/all-new check on the next line is what actually tests the behaviour.
- **The 64 limit is written in two places.** The literal appears in `recovery-contracts.ts:151` and in `recovery-transaction.ts:238`. A shared constant would stop the two drifting apart.
- **Transient failures now stop startup.** A write #2 that fails cleanly before landing (for example a temporary ENOSPC) now stops startup even though no file was replaced. This is deliberate and safe (the restart rolls back to the old files), but stricter than needed.

## Verdict
- **Standards: pass.**
- **Specification: pass.**