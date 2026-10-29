<!-- Saved by Lead from implementer reply (Sonnet 5.5) — Round 1; write refused. -->
T-16 is implemented and the checks pass, except the bundle-size gate, which fails on three limits. I couldn't write REPORT.md (the write was refused), so the full report is below.

## Behavior delivered
- **Package format.** It is one JSON document, `huhu-business-backup` version 1. I chose JSON over a ZIP because every collection is text and no archive library is needed. The manifest lists each collection with its source device, digest, byte count and item count. For each collection it also records whether it came from a running module or was read straight from the file, and it lists the 13 deliberate exclusions. The package contains no file paths. Restore derives every target path from the collection type, the device id and the document's own id and name.
- **Collections covered.** Agent settings (an allow-list, not a block-list), Space/Session/mailbox/ack records, history annotations, usage stats, automation session references, automation runs/invocations/results, notifications with read state and delivery receipts (including cleared-record tombstones), and automation definition documents. The import preflight, collision rules, batching and no-side-effect guarantees are in `docs/agent-workbench.md` and `docs/data.md`.
- **Export.** It reuses the T-15 recovery protocol. It refuses with BUSY if work is active, then closes and drains every owner, reads each collection twice, and aborts if the data changed in between. A collection that exists but can't be read fails the export instead of being written as empty. The file is saved to `.huhu/exports/` and read back.
- **Import.**
  - The package is verified first (version, structure, device ids, every digest). It then goes through a preflight, and each transaction re-runs the plan under the recovery lock.
  - You choose which source device becomes this device. Other devices are restored only as opt-in archives, and their settings are not restored.
  - Different non-empty data in the target is refused. Empty collections are replaced, and identical content counts as done.
  - The plan is split into ordered transactions of at most 48 paths each (the journal limit is 64). Re-running the same import resumes after the last good transaction, and `.huhu/recovery/backup-import/last.json` records progress.
- **Directories and settings.**
  - Space records are re-bound to this vault and device. Vault folders are looked up again on this machine; a missing folder refuses the import unless you choose "import as archived".
  - External directory grants are kept but marked revoked, so you must re-authorize them.
  - Env values, launch arguments, machine paths and the YOLO acknowledgement are never exported, and an import never raises a permission mode to YOLO.
- **No side effects after import or restart.**
  - Running or pending runs become `interrupted`, with the original status kept in `restored[runId].from`.
  - Runs whose notification was never attempted are marked so a restart cannot publish them. A negative-control test confirms the restart would notify without that marker.
  - Imported automation definitions arrive disabled, and the list of formerly enabled ones is shown in the last-import report.
- **Owners.** Notifications register `notifications-inbox`; automations register `automations-runtime` and `automations-definitions`, through their `api.ts` and `module.ts`. A module that is off has no live owner, so its files are read and replaced offline.
- **Settings UI.** There is a new "Backup" tab with the manifest, exclusions, a check-before-import step, a failure entry with retry, and the last-import report. Its en/zh strings load lazily with the page.
- **T-15 N-3.** A settings owner given an unparseable current file now treats it as damaged and allows a whole-file replacement with the old bytes kept as a recovery copy. With a live settings store, a damaged file makes the import fail with `drain-failed` and nothing is written.
- **Shared protocol additions.** `RecoveryStorage.list?`, `RecoveryAccess.has()` and `RecoveryAccess.storage` are new. `list` is guarded against unsafe paths.

## Changed paths
All inside the write set.
- **New:**
  - `src/modules/agent/core/backup/{format,model,paths,settings-codec,transforms}.ts`
  - `src/modules/agent/services/backup/{actions,entry,export,import,owners,plan,records}.ts`
  - `src/modules/agent/ui/settings/{BackupSection.tsx,BackupSection.dom.test.tsx,backup-messages.ts}`
  - `src/modules/automations/core/backup.test.ts`
  - `test/agent-backup/{world,fixtures,roundtrip.test,failure.test,units.test}.ts`
- **Edited:**
  - `src/shared/storage/recovery-contracts.ts`
  - `src/app/recovery.ts`
  - `src/app/recovery.test.ts`
  - `src/modules/agent/module.ts`
  - `src/modules/agent/ui/settings-page.tsx`
  - `src/modules/automations/{api.ts,module.ts,services/runtime.ts,core/service.ts}`
  - `src/modules/notifications/{api.ts,module.ts,core/service.ts,core/service.test.ts}`
  - `docs/data.md`
  - `docs/agent-workbench.md`
- **Not touched:** `main.js`, `styles.css` and the git index. `src/modules/agent/i18n.ts` and `platform/desktop/backup` were not needed.

## Checks
| Command | Exit | Result |
|---|---|---|
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` and `tsc -noEmit -skipLibCheck` | 0 | clean |
| `eslint . --max-warnings 0` | 0 | clean |
| `prettier --check` on new files | 0 | clean |
| `pnpm test:architecture` | 0 | 1289 modules, no violations |
| `pnpm run test:i18n` | 0 | 4935 keys |
| `vitest run` on `test/agent-backup`, `test/agent-migrations`, automations, notifications, `src/shared`, `src/app`, `src/modules/agent`, `src/modules/browser`, `test/golden`, with native binaries set | 0 | 264 files passed, 3 skipped; 2047 tests passed, 41 skipped |
| `pnpm test:docs` | 1 | pre-existing: missing anchors only in the huhu-bot-architecture specdev input; nothing about the two docs I edited |
| `check-bundle --enforce` | 1 | three limits exceeded, below |

The `vitest` run covers the json-store and vault-identity suites and the dom project. After that run only `test/agent-backup` grew; it now has 53 passing tests.

**Bundle budget (stopped, `scripts/bundle-budget.json` is outside my write set).** Startup code is 122.8 KB against a 125,952 limit and the agent activation closure is 1,331.4 KB against 1,370,112. Both are within limits, and the backup code stays lazy. These three are over:

| Limit | Measured | Limit now | Suggested KiB ceiling |
|---|---|---|---|
| `main.js` output | 6,858,951 | 6,795,264 | 6,859,776 |
| automations activation | 219,410 | 218,112 | 220,160 |
| notifications activation | 21,285 | 20,480 | 21,504 |

The output growth is about 63.7 KB of lazy backup code, with the message dictionary the largest part (about 20 KB). The two activation overruns are the minimum hold/drain/adopt methods and owners. I could not avoid them without removing required behavior. Raising the ceilings is your decision.

## Tests added
- **`test/agent-backup/roundtrip.test.ts`** covers:
  - full export and import between live vaults;
  - zero notify/deliver/start across import and restart, plus the negative control;
  - invocation idempotency, tombstones, and a repeated import being a no-op;
  - offline modules, and no trimming of 150 runs.
- **`test/agent-backup/failure.test.ts`** covers:
  - 10 hostile or damaged packages;
  - collisions, missing or unauthorized directories, and a malicious definition name;
  - BUSY, export drift, an unreadable collection, write-failure rollback, and a race after preflight;
  - power loss at every step (clean and torn), with live owners including settings;
  - 130 definitions resuming across transactions;
  - damaged settings.
- **`test/agent-backup/units.test.ts`** covers the package format, the settings allow-list and merge rule, and the restore transforms.
- **Owner and UI tests:** `src/modules/automations/core/backup.test.ts`, additions to `src/modules/notifications/core/service.test.ts` and `src/app/recovery.test.ts`, and `BackupSection.dom.test.tsx` (including zh/en key parity).

## Open gaps and risks
1. The bundle ceilings above need your decision.
2. The multi-transaction import is ordered and resumable, but it is not atomic across transactions. A crash between them is shown in the report and finished by re-running the same import.
3. A live settings store that finds its file damaged by someone else refuses the import, so the user must restart before importing.
4. A vault folder missing on the target refuses the import. The only non-destructive alternative is importing that Space as archived, because there is no repair API to re-point a Space.
5. The backup dictionary lives in `ui/settings/backup-messages.ts` because `src/shared/i18n/lazy/` is outside the write set. `verify-i18n` does not scan it; the dom test enforces key and placeholder parity instead. Moving it to `lazy/backup.ts` would bring it under the script.
6. Provider `extraArgs`, env and CLI paths are excluded entirely (a conservative choice). Quick-command `cwd` text is carried as written.
7. These remain the user's real-host checks and are not claimed:
   - the two-vault round trip in real Obsidian;
   - source-missing prompts and the directory authorization flow;
   - Windows and mobile behavior;
   - visual and keyboard checks (PAGE-004 is DOM-tested only).
8. No new dependency, and no code was copied. The approach follows the T-15 write-ahead journal, with sha256 digests via Web Crypto as in T-15.

SOURCE STOPPED

<!-- Round 2 saved by Lead -->
Round 2 is done. `check-bundle --enforce` now exits 0, with the three limits you named raised. REPORT.md is not saved (the earlier write was refused), so the Round 1 report is in my previous message and Round 2 is here.

**Dictionary move**
- The backup messages now live in `src/shared/i18n/lazy/backup.ts`, and `ui/settings/backup-messages.ts` is deleted.
- `BackupSection.tsx` and its DOM test import from the new file, and the DOM test still checks en/zh key parity.
- `pnpm run test:i18n` exits 0 and now scans 33 dictionaries and 5056 keys, including the backup one.

**Budget**
- The new measurement matches Round 1: `main.js` is 6,858,951 B, the automations activation closure is 219,410 B and the notifications one is 21,285 B. Eager startup and agent activation are unchanged and within their limits.
- I raised only these three in `scripts/bundle-budget.json`:

| Limit | Old | New |
|---|---|---|
| `outputBytes` | 6,795,264 | 6,859,776 |
| `moduleActivationBytes.automations` | 218,112 | 220,160 |
| `moduleActivationBytes.notifications` | 20,480 | 21,504 |

- `outputBudgetReason` and `moduleActivationBudgetReason` have new T-16 text that points to `CHG/evidence/T-16-budget-attribution.json`.
- The new T-16 inputs total 60,982 B in the production metafile. The attribution file records the causes of the activation growth.
- **Measurement limit:** the post-T-15 per-input sizes were not retained, the same limit T-15 stated. New inputs carry their full size and edited inputs carry only their after-size. The file says so.

**Checks**
- `eslint . --max-warnings 0` exits 0.
- `tsc -p tsconfig.test.json --noEmit --skipLibCheck` exits 0.
- `vitest run test/agent-backup src/modules/agent/ui/settings/BackupSection.dom.test.tsx` passes: 4 files, 62 tests.
- I did not re-run the wider vitest set or `pnpm test:docs`; neither is affected by the move or the budget edit.

Changed in Round 2: `src/shared/i18n/lazy/backup.ts` (new), `ui/settings/backup-messages.ts` (deleted), `BackupSection.tsx`, `BackupSection.dom.test.tsx`, `scripts/bundle-budget.json`, and `CHG/evidence/T-16-budget-attribution.json` (new).

SOURCE STOPPED

<!-- Round 3 saved by Lead -->
Round 3 is done and all the listed checks pass. I couldn't write REPORT.md (the write is refused), so this reply is the Round 3 report.

**M1 – durable resume**
- **Progress record.** `.huhu/recovery/backup-import/progress.json` holds the package digest, the options, and a digest for every file each finished step wrote. It is written after each step and removed when the import completes.
- **Retry behavior.** A retry with the same package and options skips the finished steps, and the paths they wrote no longer count as conflicts. A live edit or a restart no longer blocks the retry. A different package or different options ignore the record.
- **Step scoping.** Each step's locked re-plan checks only that step's own paths. The step layout still depends only on the package and options.
- **Step order.** Definitions now come first and the core data last, so records, inbox and runtime are replaced at the very end.
- **UI text.** I removed the "Leave that collection out" wording, since no such option exists. The "run the same import again" text is now true. Docs updated in `docs/data.md` and `docs/agent-workbench.md`.
- **Tests (`failure.test.ts`).**
  - A partial import (core step fails) resumes after a live edit of a committed definition plus a restart.
  - A live edit between steps within one run does not abort it.
  - Progress from another package is not trusted.

**M2 – real codec check**
- **Preflight.** `checkAutomationDocument(path, text)` is exported from `automations/api.ts`. It lazily loads a function in `core/documents.ts` that decodes the document with the real repository codec, and preflight reports `section-invalid` before any write.
- **Fixtures.** Definition fixtures are now generated by `automationDocuments.encode` instead of by hand.
- **Test world.** The world's `definitions.list` is the real codec reading the written files, with no canned list.
- **Tests.** A document with an unknown action `future-kind` is refused with nothing written. Missing required fields, an unreadable schedule and broken frontmatter are each refused. The roundtrip reads every restored document back through the codec.

**L3–L9**
- **L3:** `isEmptyDocument('records', …)` now treats `sharedLayout`, `grants`, `historyOwners`, `selectedSpaceId` and `layouts` as data; a target with only a Space-less web layout is an identity collision. Unit and integration tests cover it.
- **L4:**
  - A missing primary with a valid `.backup` is data (a collision), unless that backup is empty or identical to the import.
  - Every shared-store file gets a refreshed `.backup` in the same transaction (an inert `backup-sidecar` owner for non-records files). A test checks `.backup` equals the primary for runtime, inbox, history and records.
- **L5:** `mergePortableAgentSettings` compares the effective permission before and after, so `inherit` under a global YOLO cannot raise an agent. Tested, including that lowering is applied.
- **L6:**
  - A publish during the hold is deferred and sent once after release, only if the run still exists.
  - A notice being sent counts in `recoveryBusy` as `publish:N`.
  - Tested: deferral, discarding a deferred notice for a replaced run, and the busy count. This is a unit-level barrier test; I did not build an end-to-end one.
- **L7:** The "merged" wording now says matching portable settings are replaced and a recovery copy is kept (en/zh).
- **L9:**
  - The never-failing assertion is fixed.
  - Manifest note codes are validated against a list, with a test.
  - `**/.huhu/exports/` is added to `src/modules/sync/core/excludes.ts`, with the sync test extended.
  - `docs/data.md` now says exported backups are not committed by Git sync.

**Bundle**
- `check-bundle --enforce` exits 0. Eager startup, agent, automations and notifications activation stay within their limits.
- `main.js` measured 6,862,410, so I raised `outputBytes` from 6,859,776 to 6,862,848, the minimal KiB ceiling. `outputBudgetReason` now includes the Round 3 cause, and `T-16-budget-attribution.json` has a `round3` section.
- Two layering failures along the way, both fixed. The first check function placement in `platform/definitions.ts` broke the architecture rule that the api layer may only import core. The second, in `core/service.ts`, created an import cycle with `api.ts`. The function now lives in `core/documents.ts`, with a one-line lazy stub in `api.ts`.

**Checks**
- `tsc -p tsconfig.test.json --noEmit --skipLibCheck`: exit 0.
- `eslint` over `src/modules/agent`, `automations`, `notifications`, `sync`, `src/app` and `src/shared`: exit 0. I did not re-run the full-repo `eslint .` this round.
- `pnpm run test:i18n`: exit 0 (33 dictionaries, 5056 keys).
- `pnpm test:architecture`: exit 0.
- `check-bundle --enforce`: exit 0.
- vitest on `test/agent-backup`, `test/agent-migrations`, automations, notifications, `src/app`, `src/shared`, `src/modules/sync` and the agent settings UI (`src/modules/agent/ui/settings`, includes `BackupSection.dom`): 91 files, 784 tests, all pass.

**Caveats**
- Because the core step is now last, no test can show a live write to a committed core file followed by a retry. The live-edit and restart tests use finished definition steps, which are the files committed before a core failure.
- The old test "failing write rolls back" now ends as `partial-import` (the core step rolls back, the definitions step stays done). I updated the three affected tests to match.
- `src/modules/automations/core/service.ts` was run through prettier, which reformatted a few lines that were already there.
- Real-host checks (two-vault round trip, source-missing prompts, authorization flow, keyboard and size) remain the user's.

SOURCE STOPPED

<!-- saved by Lead -->
Round 4: N1 and the listed lows are fixed, and the `check-bundle --enforce` gate fails by 858 B on `main.js` (stopping here, as instructed). REPORT.md is still refused, so this reply is the report. I did not touch the T-17 files.

**N1 – final report after a resume**
- `progress.json` now also stores the first run's `disabledAutomations`, `reauthorize` and `warnings`, the lists produced by the run that planned every step. A resumed run and its preflight view use those recorded lists, since the skipped steps cannot rebuild them. The final `last.json` therefore keeps the full lists.
- Regression test: the partial import has 60 definitions, 30 of them enabled at the source, plus one external Space. After a restart and resume, the preflight view and the final report both still list 30 disabled automations, 1 directory to re-authorize, and the `automations-disabled` count of 30.

**Lows**
- **Changed or missing files on resume.** Resume loads the recorded `written` digests.
  - A finished-step file that exists but differs gets a new `step-file-changed` warning (en/zh in the lazy dictionary), in both preflight and the final report. It is kept as it is and never rewritten.
  - A step whose file is missing is no longer trusted and runs again; nothing is there to overwrite.
- **Tampered record.** A forged progress record that claims every step done now writes the real data, because its claimed files don't exist. The test confirms records and definitions are written.
- **Target device in the options key.** The key now includes the target device id, and a record for another device is ignored.
- **Final report always saved.** The unchanged-retry path now writes `last.json` as `done` and reuses the earlier lists for the same package. It does not recompute them from the retry. The test sets `last.json` to `partial`, retries, and gets `done`.
- **Reason text.** The attribution file and `bundle-budget.json` reason text now say the codec check lives in `core/documents.ts`, and that automations activation grows about 711 B to 220,121 against a 220,160 limit.
- The other lows are documented only.

**Checks**
| Check | Result |
|---|---|
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `eslint` over agent, automations, notifications, `src/shared` | exit 0 |
| `pnpm run test:i18n` | exit 0 (5057 keys) |
| `pnpm test:architecture` | exit 0 (1292 modules) |
| vitest on `test/agent-backup`, `test/agent-migrations`, automations, notifications, `src/app`, `src/shared`, `src/modules/sync`, agent settings UI (with BackupSection DOM) | 91 files, 788 tests pass |
| `check-bundle --enforce` | **exit 1** |

**Bundle: STOPPED, over by 858 B**
- `main.js` measures 6,863,706 against the 6,862,848 limit. Eager startup, the agent closure and the notifications closure are within limits. Automations activation is within its limit (the 220,121 B above was the reviewer's measurement; this run's gate output reports only the main.js overrun).
- The worktree also carries concurrent non-T-16 changes from T-17, so the number is not purely mine. The review measured 6,862,738 before this round, and Round 4 adds about 1 KB (progress lists, digest verification, one warning string pair).
- I did not raise the limit. The smallest 1 KiB ceiling that covers 6,863,706 is 6,863,872, if you want it raised. I recorded the numbers in a `round4` section of `T-16-budget-attribution.json`.

SOURCE STOPPED

<!-- saved by Lead -->
Round 4b done. `check-bundle --enforce` now exits 0 ("budget: within limits").

- **Limit change:** `outputBytes` in `scripts/bundle-budget.json` went from 6,862,848 to 6,863,872, the minimal 1 KiB ceiling. `main.js` still measures 6,863,706, which leaves 166 B of headroom.
- **Other limits:** startup-evaluated is 122.9 KB against 125,952 B, and the agent, automations and notifications activation limits are unchanged and within bounds.
- **Honest note on the 858 B:** the worktree also held concurrent T-17 edits when I measured, so the 858 B over the old limit is not purely T-16. The T-16 part is the progress lists, the recorded-digest verification and one warning string pair. Both the `outputBudgetReason` text and the `round4` section of `T-16-budget-attribution.json` say this. Per-input sizes after Round 3 were not retained.

SOURCE STOPPED

<!-- saved by Lead -->
Round 5: the data-safety lows are fixed and tests pass. `check-bundle --enforce` still exits 1 and I did not raise the limit (numbers below).

REPORT.md is still refused, so this reply is the report. No T-17 files were touched.

**What changed**
- **Per-file resume.** A recorded step is no longer dropped when one of its files is missing. Existing files stay settled and are never rewritten. A file changed since the import (digest differs) is reported with `step-file-changed`. A user-changed settings file is therefore no longer silently re-merged (probe S1).
- **Deleted files are not resurrected.** I chose to respect user deletions: a recorded file that is missing is reported with a new `step-file-missing` warning (en and zh) and is not recreated. One deleted definition plus one edited definition in the same step no longer blocks the retry (S2).
- **Forged records are not trusted.** A step is re-run, not trusted, in any of these cases: its `written` list is empty, none of its recorded files exist, or its recorded path set differs from the paths the plan gives that step. Such tampered "all done" records (P4c: an empty step, a step naming unrelated files, and one naming nonexistent files) still import the real data and save a final `done` report. The check is shared by `runImport` and `preflightImport` through a new `resolvePlan` in `import.ts`, so the preflight view and the run agree.
- **Reports on a fully resumed retry.** An unchanged retry reuses the earlier lists and appends the new step warnings, replacing any old ones, so the finished-file notes show in the final report.
- **Docs.** `docs/data.md` (the failure-and-recovery bullet) and `docs/agent-workbench.md` (the step-splitting bullet) now describe the missing-file and changed-file behavior, and when a step re-runs.
- **Tests.** `test/agent-backup/failure.test.ts` gains S1, S2 and three P4c cases, and the earlier changed-or-gone test is updated to the new "not recreated" behavior.
- **Attribution file.** My earlier size script overwrote `T-16-budget-attribution.json`, so I re-added the `round3`, `round4` and `round5` sections.

**Checks**
- `tsc -p tsconfig.test.json --noEmit --skipLibCheck`: exit 0.
- `eslint` over `src/modules/agent`, `automations`, `notifications` and `src/shared`: exit 0.
- `pnpm run test:i18n`: exit 0 (5081 keys).
- `pnpm test:architecture`: exit 0 (1294 modules).
- vitest on `test/agent-backup`, `test/agent-migrations`, automations, notifications, `src/app`, `src/shared`, `src/modules/sync` and the agent settings UI: 92 files, 794 tests pass.

**Bundle:** `check-bundle --enforce` exits 1. `main.js` measures 6,879,559 against the 6,863,872 limit, 15,687 B over.
- **T-16's share is small.**
  - The T-16 inputs total 65,256 B now, against 60,982 B at Round 2, a growth of about 4.3 KB across all rounds.
  - Roughly 1 KB of that is this round: `resolvePlan` with step verification and the `step-file-missing` string pair.
  - The remaining ~14 KB is not T-16; it comes from the T-17 work running in the same worktree.
- I did not raise the limit, as instructed.

SOURCE STOPPED