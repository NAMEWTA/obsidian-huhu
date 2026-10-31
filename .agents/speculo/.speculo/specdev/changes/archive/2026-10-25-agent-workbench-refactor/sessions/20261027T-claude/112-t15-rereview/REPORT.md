<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
**T-15 re-review (Round 4/4b): request changes on Standards, pass on Specification.** The original M-1 and M-2 are closed. One new medium remains: if the `committing` journal write lands on disk but then reports an error, the edits made in the following session are lost on the next start (my probe shows it). All other findings are low.

## Checks
I ran all checks against the frozen scope. `sha256sum -c` on `SCOPE.sha256` (43 files) passed at the start and again at the end, with no drift. I modified no repository files, and `main.js` / `styles.css` md5 were unchanged after the bundle check.

| Check | Result |
|---|---|
| vitest (`src/modules/agent src/shared src/app src/modules/browser test/agent-migrations test/golden`, `HUHU_TEST_*` set) | **1st run:** 1 failure, in `pty/binary.test.ts` (5 s timeout), plus an unhandled `hook-spool` rmdir ENOENT. Both are outside T-15 scope, and both files pass alone (8 files, 85 tests).<br>**2nd full run:** exit 0. 242 files passed, 3 skipped; 1816 tests passed, 41 skipped. |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `pnpm run lint` | exit 0 |
| `check-bundle --budget scripts/bundle-budget.json --enforce` | exit 0, "within limits" |
| Extra: `--project dom src/modules/agent/ui/settings` | 4 files, 18 tests passed |
| Extra: `test:i18n` | 4935 keys OK |

**Bundle raise.** `outputBytes` goes from 6,789,120 to 6,794,240, the smallest 1 KiB ceiling above the measured 6,793,937. It is attributed in `outputBudgetReason` and in `CHG/evidence/T-15-budget-attribution.json` (`round4`). The per-input deltas add up to about 4.8 KB, which matches the +4,817 B. eager and agent activation were not raised.

**Probes.** I adapted the earlier probe and ran everything in memory with esbuild:
- `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t15r2/probe2.ts` covers the generic transaction. It fails each journal write #1–#4 in two ways: "fails before landing" and "lands, then throws". It also covers L-1 and a 70-entry journal.
- `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t15r2/probe3.ts` covers the legacy import.

## Standards axis: request-changes

### M-1: closed for the condition that was stated
| Journal write | Mode | Result | Gate held | Owners released | Restart | Edits made later |
|---|---|---|---|---|---|---|
| #3 `committed` | fails | UNRECOVERABLE `journal-committed-failed` | yes | no | rolled-back to all-old | none admitted |
| #3 | lands, then throws | UNRECOVERABLE | yes | no | rolled-forward to all-new | none admitted |
| #4 `done` | fails | UNRECOVERABLE `journal-done-failed` | yes | no | rolled-forward to all-new | none admitted |
| #4 | lands, then throws | UNRECOVERABLE | yes | no | none (already `done`) | none admitted |

- The failure paths for rollback and adopt also keep owners closed (`recovery-transaction.ts:311-318`, `332-339`). The `finally` block at `:352-355` respects `keepClosed` even when no gate is passed.
- **Startup stops.** `runDesktopLegacyMigration` passes `host.gate` through. `afterSettings` (`recovery-start.ts:49-53`) shows the persistent `agent.migration.blocked` notice and rethrows. `main.ts:112` awaits it, so modules never start.
- **Convergence.** The legacy-import M-1 test plus the probe show that the next start converges, and the import then completes exactly once.

### M-3 (new, medium): a `committing` write that lands and then reports an error reopens owners, and the next start rolls back everything done in between
- **Where:** `recovery-transaction.ts:306-307`. Write #2 is treated as "before any replacement" and releases owners. But `writeVerified` can land the bytes and still throw, for example when the read-back fails with EBUSY or EPERM (Windows antivirus or sync tools) or the adapter rejects after the data is written.
- **Why it loses edits:** the slot then holds a valid `committing` journal. On the next start, `rollBack` restores `old` unconditionally for that origin; only `prepared` keeps the skip-if-not-ours rule.
- **Generic probe:** `#2 landed: WRITE_FAILED, journal=committing, gate.held=false, released=true`. After the user edits and restarts: `rolled-back`, and the target is back to `old-a`. **The user's edit is lost.**
- **Legacy-import probe:** the import throws WRITE_FAILED and the gate is not held, so `afterSettings` only logs it and startup continues. SpaceService then creates `workbench-v2.json` in that session. On the next start `recoverPending` → `rolled-back` **removes `workbench-v2.json`** because its `oldDigest` is null.
  - That session's Spaces are gone, except whatever `.backup` holds.
  - The re-import is then refused as `records-backup-only`.
- **Write #1 is safe** in both modes: a `prepared` rollback skips files that were edited elsewhere, and the probe keeps the user's edit.
- **Tests miss it:** `FaultStorage.failWrite` throws before landing, so the #1/#2 tests (`recovery-transaction.test.ts:273-286`) never cover this.
- **Fix condition:**
  - A failed `committing` write must not reopen owners or let startup continue. Either use `closeFailed`, or immediately rewrite the same slot as `rolling-back` with `from:'prepared'` and only `closeFailed` if that fails too.
  - Add a FaultStorage mode where the write lands and then throws (or the read-back fails), applied to every journal slot write.

### Low findings (standards)
| ID | Status | Evidence |
|---|---|---|
| L-1 | closed | `from` is stored on `rolling-back` (`:127-141`), and the codec accepts it. Probe: crash right after the `rolling-back` write → restart → `foreign-edit` is kept. A test is present. |
| L-2 | closed | `docs/data.md:99` now limits the guarantee to process interruption, with no fsync or rename, and says a power loss fails closed and needs a manual restore. One nit: "摘要核对会发现不一致" is not guaranteed if writes are reordered or lost, since a lost `committing` write can look like `prepared`. |
| L-3 | closed, with a latent issue (N-2 below) | The codec validates `entry.path`, `oldCopy` and `newCopy` (`recovery-contracts.ts:153-164`). `remove` reads through private storage first (`src/app/recovery.ts:100-104`). Paths produced by the transaction pass the same `isSafeRelativePath` at stage time (`:239`), so a valid path can't be rejected. |
| L-4 | closed | A missing primary with a valid backup now imports the backup (`legacy-workbench.ts:188`, note `from-backup`), consistent with `JsonStore.loadNow`. A test is present. Backup handling is safe: the backup is copied, not changed, and only used if it is `importable` or `empty`. |
| L-5 | closed | Documented in `docs/data.md:99` and the UI `agent.migration.reimport`. |
| L-6 | closed, with a latent issue (N-3 below) | The `RecoveryOwner.validate` hook plus the settings owner reject any change to a namespace that isn't restored (`src/app/recovery.ts:120-131`). A test (`recovery.test.ts:176-203`) shows nothing from the stage is applied. |

### New lows
- **N-1: the blocked notice is not accurate or actionable** (`agent.migration.blocked`, en/zh, used by `startRecovery` and `afterSettings`).
  - It says "Nothing was overwritten", which is false after M-1 `closeFailed`: the targets were already replaced.
  - It gives no next step. Here the step is "fully restart Obsidian". For a recovery copy that can't be verified, it is "restore manually from `.huhu/recovery/transaction/<op>/`".
  - After `closeFailed` the writer-lease listener intentionally stays open in-process (`legacyOwner` is never released). Disabling and re-enabling the plugin without restarting Obsidian therefore gives BUSY or Space-writer `OWNER_CONFLICT`. The notice should say "restart Obsidian".
- **N-2: the 64-entry cap makes valid large journals unreadable** (latent).
  - `isRecoveryJournal` rejects more than 64 entries (`recovery-contracts.ts:151`), but `runRecoveryTransaction` never caps the entries it writes.
  - Probe: a successful 70-path operation is followed by `readJournal` → `JOURNAL_UNREADABLE` (both slots invalid), so **every later start is blocked**.
  - It can't happen today: the legacy import has at most 8 entries and nothing calls `run()` in production. T-16 could hit it.
  - Fix: return STAGE_INVALID for more than 64 paths before writing anything, or drop the cap.
- **N-3: settings `validate` refuses a stage whose `before` text is unparseable** (`src/app/recovery.ts:122-123`, `JSON.parse` throws → STAGE_INVALID).
  - This fails closed, but a future T-16 restore over a damaged `settings.json` would be refused forever.
  - Note for T-16: treat an unparseable `before` explicitly.

## Specification axis: pass

### M-2: closed
- **Status file:** the last refusal, BUSY or failure is written best-effort to `legacy-import-status.json`, outside the transaction and not owned by `legacyOwner` (`legacy-workbench.ts:128`). It is cleared on success, and write errors are swallowed (`:397-412`, `desktop-startup.ts:41-56`).
- **Read-only inspect:** `inspectLegacyImport` now reports `marker-unreadable`, and when legacy data exists without a marker it reports `pending` or the saved problem, instead of "no legacy data" (`:418-443`).
- **Settings tab:** it shows `role="alert"` text with the reason and the next step for scope mismatch, records problems (damaged, newer, backup-only), unreadable marker, BUSY, failure and pending, in en and zh.
- **Tests:** DOM tests cover these, and the migration test covers inspect.
- **Degradations, acceptable:**
  - If the status write itself fails, the tab shows "pending — restart to import". Restarting won't help for a scope mismatch.
  - The `failed` text "was rolled back; your data is unchanged" doesn't fit an UNRECOVERABLE code. Startup is stopped in that case, and the next start rewrites or ignores the status, so users don't actually see it.

### Other specification items
- **L-7:** recorded as a hand-off for the user's real-host E2E (`docs/agent-workbench.md:152` and implementer Round 4). It stays open until that E2E runs.
- **L-8:** closed. `docs/agent-workbench.md:148` states that no production code calls `recovery.run()`, and that this isn't a delivered runtime import.
- **AC-047, AC-048, AC-049, AC-061 (part):** no regressions found against the previous review's verified list. AC-049's "限制清晰" and the AC-061 error state are now met through M-2.

## Verdict
- **Standards: request-changes (M-3).** M-1 as stated is closed. N-1 to N-3 are non-blocking.
- **Specification: pass.** M-2 is closed; L-7 is a user E2E hand-off.