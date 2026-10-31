<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
# T-16 Independent Review: backup, import preflight and restore

**Verdict:** request-changes on both axes. Two medium findings, both confirmed with scratch probes:
- **M1:** after any partial import, the retry can be refused permanently.
- **M2:** a definition document can pass preflight and then break the automations module.

**Scope check:** `sha256sum -c SCOPE.sha256` passed all 38 files. I changed no repository files. My probes live only in `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t16/`.

## Checks I ran

| Check | Result |
|---|---|
| Requested vitest set, with the native binaries set | 239 files: 235 pass, 2 fail, 2 skipped. 1,939 tests pass. The 2 failures are flaky tests T-16 did not touch, and both pass when re-run alone: `controller-managed-runtimes.test.ts` (port already in use) and `automations/platform/desktop/precheck.test.ts` (868 ms against a 650 ms limit). |
| T-16 suites: `test/agent-backup`, `BackupSection.dom`, automations `backup` and `invocations`, notifications `service`, `app/recovery` | 8 files, 102 tests, all pass |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `pnpm run lint` | exit 0 |
| `pnpm run test:i18n` | exit 0 (33 dictionaries, 5,056 keys) |
| `check-bundle --budget … --enforce` | exit 0. The three raises are each the smallest whole-KiB step and are attributed: `main.js` output, and the automations and notifications activation budgets. `main.js` has 825 B of headroom left. |

## Standards axis: request-changes

### M1 (medium-high): resuming a multi-step import depends on file content, not on a progress record, so after ordinary activity it can never finish

**Where:**
- `src/modules/agent/services/backup/import.ts:132-165`: every step re-plans the whole import (lines 139-143).
- `plan.ts:123-139` and `plan.ts:432`.
- `import.ts:90-98, 169-179`: the progress report is written but never read on retry.
- `BackupSection.tsx:275-280`: there is no way to leave a collection out.

**Failure scenario (reproduced by probe):**
1. A 130-definition import fails part-way: step 3 of 4 hits a write failure, so the result is `partial-import`.
2. The core step, which holds this device's data, is already committed and the owners are released.
3. One ordinary notification arrives, which changes `inbox.json`.
4. The same import, run again, returns `preflight-failed` / `identity-collision` on `notifications-inbox`, and does so on every later retry.

The same thing happens after any Space or layout edit, or any other module writing to a committed file. It can also hit within a single `runImport` call, because each later step re-checks every core file after the lock was released.

**Impact:** the vault stays half-imported. The UI says "Run the same import again to continue" (`backup.ts:154`) and "Leave that collection out" (`backup.ts:92`), but neither works: retry is refused and the UI has no option to leave a collection out. This breaks the "retryable/recoverable" part of AC-051 and the Lead's "resumable progress record" requirement.

**Fix condition:**
- Resume reads a durable progress record (package digest, options, the digests each completed step wrote) and skips completed steps.
- Each step's locked re-plan checks only that step's own paths.
- Order the steps with the core step last.
- Add a test: partial import, then a live write to an already committed file (and a restart), then the retry completes.

### M2 (medium): definition documents are checked less strictly than the real repository reads them

**Where:**
- `src/modules/agent/core/backup/transforms.ts:243-281` checks only `huhu-type`, `huhu-id` and `name`.
- The repository's reader (`automations/core/documents.ts` decode) throws on any document that fails `isDefinition` or names an unknown action.

**Failure scenario:**
1. A package with an intact digest (hostile, or from a newer build with a new action kind) passes preflight and is written.
2. Live adoption (`service.ts:179` `adoptFromDisk` → `refresh` → `definitions.list()`) throws. The result is `ADOPT_FAILED`, the global recovery gate stays held, and every owner stays closed until restart.
3. After restart the automations module fails to load until the user deletes the file from the hidden folder by hand.

**Probe:** the repository's real decoder rejected the test fixture's own documents ("Invalid automation"), and a document with `action: future-kind` ("Invalid action").

**Test gap:** `test/agent-backup/world.ts:245` replaces `definitions.list` with a stub returning `[]`. So no test runs restored documents through the real repository, and the fixture documents (missing `graceMinutes`, `channels`, `notifyOn`, `createdAt`, `updatedAt`) would be invalid in production.

**Fix condition:** preflight decodes every restored document with `automationDocuments`, and refuses as `section-invalid` before any write. Fixtures must be valid repository documents, and at least one test must go through the real codec.

### Low findings

- **L3, empty-target check:** `transforms.ts:211-221` treats records as empty without looking at `sharedLayout`, `grants`, `historyOwners` or `selectedSpaceId`. Web tabs opened without a Space on the target are silently replaced (`replace-empty`). Fix: count these as data (a collision) or keep them.
- **L4, `.backup` files:** for the stores built on the shared JSON store (runtime, inbox, stats, history), the plan never looks at or refreshes `<file>.backup`. Only records do (`plan.ts:126, 271-295`), and the store falls back to `.backup` on load (`json-store.ts:28-35`). Two effects:
  - A missing primary with a valid `.backup` is treated as `create`, which overwrites data the store would have loaded.
  - Old `.backup` content can come back over imported data if the primary is later damaged.
- **L5, permission raise through `inherit`:** `settings-codec.ts:94,134` compares raw values. Take a target with global `yolo`, a per-agent `manual` override, and the agent already in `yoloAcknowledgedAgents`. An incoming per-agent `inherit` then makes the effective mode YOLO with no prompt. Fix: compare the effective permission before and after.
- **L6, completion-to-publish boundary:**
  - The completion chain (`service.ts:665-672`, then `publish` at 831) is not counted by `recoveryBusy` (163) or by drain.
  - An export at that moment makes `inbox.send` reject, and the live notification is lost until restart.
  - The snapshot itself stays consistent, because receipts deduplicate and restored runs carry their marker.
  - The ticket's barrier test is only partly there: `failure.test.ts:290` covers a send already in flight, not this boundary.
- **L7, settings overlay:** portable fields such as `quickCommands` replace the target's values entirely, while the UI calls this "merged into yours". A recovery copy does exist. Fix the wording or document it.
- **L8, write set:** `scripts/bundle-budget.json` (Root-only per LOG) and `src/shared/i18n/lazy/backup.ts` are outside the ticket's `writable_paths`, and the frontmatter was not revised.
- **L9, hygiene:**
  - `failure.test.ts:229` asserts `toBeGreaterThan(-1)`, which can never fail.
  - Manifest note codes are not checked (`format.ts:259-262`).
  - `.huhu/exports/` is not in the sync exclude list, so packages full of business data get committed by Git sync. That list is outside this write set; it is a follow-up.

### What holds up

- **Package checks:** version, structure, section whitelist, device-id regex, duplicate identities, per-entry and header digests, and a refusal of unlisted payload entries.
- **Paths:** every target path is derived from the section and device. Definition paths go through `huhuName`, and traversal attempts end up under the definitions folder (tested).
- **Directories:** `bindVaultDirectory` refuses `..` and symlink escape. External grants are always marked revoked.
- **Recovery protocol:** preflight runs before any write, and each step stays within the 64-path cap (at most 48 paths per step).
- **Owners:** automations and notifications register hold, strict drain, adopt and release.
- **Settings:** the export is an allow-list, so env values, arguments, paths and the YOLO acknowledgement are excluded.
- **No side effects:** the restore marker is persisted and has a negative-control test.
- **Crash tests:** the power-loss matrix (clean and torn writes, with restart) is real and thorough.

## Specification axis: request-changes

| Requirement | Status |
|---|---|
| AC-050: owned data complete, manifest lists exclusions, no Agent started | Met. Accounts sharing a session ID, Spaces sharing a cwd, sources, annotations, mailbox ack, stats, results, invocation request/receipt and tombstones all round-trip. Zero dispatch, spawn, notify or deliver across import and restart, with a negative control. The definition round trip is not proven against the real repository (M2). |
| AC-051: never overwrite valid data | Mostly met: collisions are refused, a race after preflight is refused, and failed writes roll back. Edge cases in L3 and L4. |
| AC-051: failures retryable/recoverable | Not met (M1). |
| AC-051: external directories re-verified/re-authorized | Met. |
| Ticket automation list | Present except the completion↔reservation barrier (partial, L6) and the hostile-definition case (M2). Invocation idempotency and conflict, no trimming, offline module reads, active work returning BUSY, identity collision, env exclusion, and source drift during export and after preflight are all tested. |
| AC-061, local page part | DOM tests cover loading, unavailable, error, ready, export, verify, check, import, partial-import retry, and en/zh key parity. Keyboard and size are not checked by automation beyond the native controls. Real-host checks remain the user's, and the docs say so. |
| Docs (`data.md`, `agent-workbench.md`) | Accurate except that they claim the retry resumes (M1) and that definitions are restored "in the original Markdown repository format" (M2). |
| Bundle | Raises are minimal and attributed; the check exits 0. |

## Conditions to pass

1. **M1:** resume uses a durable progress record. A step that was already committed never makes a retry fail, and the regression test above is in place.
2. **M2:** restored definitions are validated with the repository codec before any write, and a test exercises real decoding.
3. Lows are recommended. L3 and L5 are the ones closest to AC-051 and the permission contract.