<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
# T-16 re-review after Round 3: backup, import preflight and restore

**Verdict:** request-changes on the standards axis, pass on the specification axis.
- M1, M2 and L3–L9 are all closed.
- Round 3 introduced one new medium regression, **N1**: after a resumed import, the final report no longer lists the automations the import switched off or the directories that need re-authorization.

**Scope:** `sha256sum -c SCOPE.sha256` passed all 40 files, and still passed when I re-checked after probing. I changed no repository files. Probes are under `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t16r2/` (`probe-m1`, `probe-m2`, `probe-l6`, `probe-r1`, `probe-r2`, and the matching `out*.txt` results).

Another session is changing files outside the scope in the same worktree at the same time (`binary-cli`, `control/skill`, release scripts). It does not affect the T-16 scope.

## Checks

| Check | Result |
|---|---|
| vitest on `test/agent-backup`, `test/agent-migrations`, `src/modules/automations`, `src/modules/notifications`, `src/app`, `src/shared`, `src/modules/sync`, `src/modules/agent/ui/settings` | 91 files, 784/784 pass, exit 0 |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `pnpm run lint` (full `eslint .`, zero warnings) | exit 0 |
| `pnpm run test:i18n` | exit 0 (33 dictionaries, 5,056 keys) |
| `pnpm test:architecture` | exit 0 (1,289 modules, no violations) |
| `check-bundle --budget … --enforce` | exit 0, details below |

**Bundle:**
- **First run:** `main.js` measured 6,862,410 B. That matches the implementer's figure, and 6,862,848 B is the minimal whole-KiB raise. It is attributed in `outputBudgetReason` and in the `round3` section of the attribution file.
- **Re-run:** 6,862,738 B, because of the concurrent non-T-16 work. That leaves 110 B of headroom.
- **Activation and startup:**
  - Automations activation is 220,121 B against a 220,160 B limit, so 39 B of headroom. It grew about 711 B from Round 3's `deferredPublish` and `publishing` code in `core/service.ts`. The reason text still says activation is "unchanged".
  - Startup is 125,867 B against 125,952 B.

## Earlier findings

| ID | Status | Evidence |
|---|---|---|
| **M1** | **Closed** | See the probe list below. |
| **M2** | **Closed** | `checkAutomationDocument` runs the real `parseDocumentValue` plus `automationDocuments.decode` before any write. In a real `runImport`, these were refused as `section-invalid` with business files byte-identical: `future-kind` ("Invalid action"), a bad channel, `enabled: "yes"`, an `open-url` with `javascript:`, and broken section markers. Documents the codec accepts (`script` with codec defaults, a garbage cron string) import, and `adoptFromDisk` lists them without throwing. The test world now uses the real codec, and fixtures come from `automationDocuments.encode`. |
| L3 | Closed | `isEmptyDocument('records')` now counts `grants`, `layouts`, `historyOwners`, `selectedSpaceId`, a non-empty `sharedLayout` and inbox messages as data. `emptyRecords()` still counts as empty. Only `sharedLayout.closedTabs` is ignored, which is trivial. |
| L4 | Closed | A missing primary with a valid `.backup` is a collision; an empty or identical one is not. Archive-device sidecars are refreshed (both equal their primaries). An identical primary with a stale `.backup` gets the sidecar refreshed on re-import. Edge case: a missing primary with a *corrupt* `.backup` is reported as an identity collision (low). |
| L5 | Closed | Comparing the effective mode works. These raises are refused: `inherit` under a global YOLO, a per-agent YOLO, and a global raise. Lowering is applied, and so is the "global down, row YOLO" case where the agent was already effectively YOLO. |
| L6 | Closed | See the deferred-publish probes below. |
| L7 | Closed | en and zh wording now says "replace the matching ones (recovery copy kept)". |
| L8 | Closed | The ticket's `writable_paths` now include `bundle-budget.json`, `lazy/backup.ts`, `sync/core/excludes.ts`, the sync tests and the attribution JSON. |
| L9 | Closed | The never-failing assertion is replaced. `NOTE_CODES` is enforced in `parsePackage`, with a test. `**/.huhu/exports/` is in `HUHU_EXCLUDE_PATTERNS`, and no later `!` rule re-includes it. The sync test is extended and `data.md` updated. |

**M1 probes** (`probe-m1`):

| Probe | Scenario | Result |
|---|---|---|
| P1 | A definitions step fails (`defs-1` of 4) after `defs-0` committed. A committed document is edited live, then restart and retry. | `done`. The edit is kept, all 130 documents are present, the progress file is cleared. |
| P2 | Multiple core steps (adopt plus 9 archive devices). `core-0` (this device's data) is committed and `core-1` fails. A notification is sent through the real service into the committed inbox, then restart and retry. | `done`. The live notification is kept and the progress file is cleared. |
| P3 | The core step itself fails and rolls back, then a plain retry. | `done`. |
| P4b | Tampered progress claims a pending step's inbox path as written; the target inbox holds user data. | Preflight shows that path as "unchanged", but the step's re-plan under the lock refuses with an identity collision. The inbox is untouched. |
| P7 | Saving the progress file fails. | The retry still completes. |

**Can a stale progress record cause data loss?** No overwrite is possible. A finished step's paths are skipped only in the overall pre-check; the locked re-plan always re-checks the running step's own paths. Skipping a finished step writes nothing. The remaining effects are low-severity and listed below.

**Deferred notifications (L6, `probe-l6`):**
- **Duplicates:** if the same run is deferred twice, `notify` runs twice. It is still harmless, because the notification id is `run.id` (`runtime.ts:143`) and `sendNow` drops repeats by receipt.
- **Restart while held:** the deferred list is lost, but `load()` re-publishes any run whose notification was never attempted. The result is exactly one notify across two restarts.
- **Busy count:** a send in progress after release reports `publish:1`, which blocks the next recovery operation as BUSY.

## Standards axis: request-changes

### N1 (medium, new in Round 3): a resumed import drops earlier steps' re-enable and re-authorize lists from the final report

**Where:**
- `plan.ts:405-421`: a skipped (already finished) definition hits `continue` before `if (doc.wasEnabled) disabledAutomations.push(...)`.
- `plan.ts:298-301`: skipped records never call `rebaseRecords`, so `reauthorize` and the related warnings are not produced.
- `import.ts:225, 244`: the resumed run's `report()` overwrites `last.json` with these shortened lists.

**Probes:**
- `probe-r1`: 130 documents, 65 of them enabled at the source. The partial report lists 65 disabled automations. After the resume, both the final report and the returned value list 40, and the warning count drops from 65 to 40.
- `probe-r2`: with `defs-0` and `core-0` finished, the partial report lists `reauthorize: [External]`. The final `done` report has `reauthorize: []` and 0 disabled automations.

**Impact:** documents arrive with `enabled: false`. The docs promise the originally enabled list is written into the import report so the user can turn those automations back on deliberately (`agent-workbench.md`), and the page shows that list. After exactly the resume path M1 was meant to fix, the user silently loses track of which automations to re-enable and which Space directories need re-authorization. The grant stays revoked, so the Space itself is safe; the information is what is lost.

**Fix condition:**
- `wasEnabled` depends only on the package, so record disabled automations before the skip branch.
- For records, either compute `reauthorize` read-only even when skipped, or keep the first run's lists in `progress.json` and merge them into the final report.
- Add a test: partial import, then resume, and the final report keeps the full disabled and re-authorize lists.

### Lows (not blocking)

**Progress record:**
- **Unused digests:** the `written` digests in `progress.json` are recorded but never compared. As a result, a finished-step file the user later *deleted* is shown as "unchanged" in preflight. The resume then reports `done` without restoring it (P5). User data is safe, but the label is misleading.
- **Torn write:** a progress file torn by a crash, or a crash between commit and saving progress, falls back to content comparison. A later edit of a committed file is then a collision again, the old M1 behaviour (P6), in a narrow window.
- **Target device not in the key:** the options key does not include the target device. A progress file copied by a non-Git sync tool could make another machine skip steps (`.huhu/recovery/` is Git-excluded).
- **Tampered record:** a tampered progress record that claims every step is done makes `runImport` return `done` with nothing written. It also saves no report (P4a).

**Report:**
- **Stale `partial`:** `last.json` keeps an old `partial` status when a retry ends as `unchanged`, or when every step is already recorded done. This was already the case before Round 3, at `import.ts` around line 189: that branch never saves the report.

**Refusals that can't be cleared from the page:**
- **New inbox data before retry:** a notification that arrives in an empty target inbox before retrying a rolled-back core step makes the retry refuse with an identity collision (P3 variant). That is the correct "never overwrite" behaviour. But the UI has no way to leave a section out, and receipt tombstones keep the inbox non-empty after it is cleared, so the user must delete the file by hand. The docs say pending steps are still checked.
- **Corrupt `.backup`:** a corrupt `.backup` with a missing primary causes a permanent collision (L4 edge).

**Smaller points:**
- **Duplicate-id blind spot:** the existing-definition scan reads only `<folder>/操作.md`. The real collection reader decodes every `.md` file under the definitions folder and rejects duplicate ids, so a duplicate id in a hand-made non-`操作.md` document is not caught.
- **Stale attribution text:** the bundle reason and the attribution JSON say the codec check lives in `platform/definitions`, but it is in `core/documents.ts`. The activation reason was not updated for the roughly 711 B automations growth; it is within the limit with 39 B to spare.
- **`main.js` not rebuilt:** the `main.js` in the worktree (6,758,061 B) is far older than the source. Under the project's own rules, this must be rebuilt and committed when the work is committed.

## Specification axis: pass

| Requirement | Status |
|---|---|
| AC-050: owned data complete, exclusions in the manifest, nothing started | Met. Definitions now round-trip through the real repository codec. |
| AC-051: never overwrite valid data | Met. Collisions, races under the lock and tampered progress are all refused. L3 and L4 are closed. |
| AC-051: failures retryable or recoverable | Met. A finished step never blocks a retry, after live writes and after a restart, for both definition and core steps. |
| AC-051: external directories re-verified | Met. Grants stay revoked; the report gap is N1. |
| AC-061, local page part | Unchanged and passing. The wording fixes are in en and zh. Real-host checks remain the user's. |
| Docs | Accurate, except that the "enabled list goes into the report" promise breaks after a resume (N1). |

## Conditions to pass

Fix N1 and add a regression test showing the final report after a resume keeps the full disabled-automation and re-authorize lists. The lows are recommended, not required.