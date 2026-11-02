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