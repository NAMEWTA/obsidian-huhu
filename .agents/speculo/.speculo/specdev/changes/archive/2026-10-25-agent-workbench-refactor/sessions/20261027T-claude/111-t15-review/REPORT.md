<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
**T-15 review: request changes on both axes.** There is one medium crash-consistency defect (standards) and one medium spec miss in the error and limitation UI (specification). Everything else is low, and all the required checks pass.

**Checks** (all on the frozen scope; `sha256sum -c` was run at the start and again after the session reset, with no drift):
- vitest on `src/modules/agent src/shared src/app src/modules/browser test/agent-migrations test/golden` with the `HUHU_TEST_*` binaries: exit 0, 242 files passed and 3 skipped; 1795 tests passed and 41 skipped.
- `tsc -p tsconfig.test.json --noEmit --skipLibCheck`: exit 0.
- `pnpm run lint`: exit 0.
- `check-bundle --budget scripts/bundle-budget.json --enforce`: exit 0. `main.js` and `styles.css` were unchanged (md5 checked before and after).
- Extra: `--project dom src/modules/agent/ui/settings` passed 4 files and 10 tests. `test:i18n` (4928 keys) and `test:architecture` both exit 0.
- Probe: I bundled a small script with esbuild into `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t15/probe1.ts`. It ran in memory only; no vault was touched.

## Standards axis: request-changes

### M-1 (medium): a failed journal write after replacement reopens owners on a state that the next restart reverses
`src/shared/storage/recovery-transaction.ts:297-298` (write `committed`) and `:312` (write `done`) sit outside any handler, and the `finally` at `:319-321` releases every owner whenever the gate is not held.

My probe confirmed both cases:

**Case 1: the `committed` journal write fails** (for example ENOSPC, or the Windows EBUSY/EPERM errors that antivirus or sync tools cause).
- The targets on disk are already new, but no owner has adopted them.
- The owners are released anyway (log `q,d,rel`, `gate.held=false`), and the journal is left at `committing`.
- The startup import in `recovery-start.ts:47-53` only logs the error and lets the modules start. SpaceService then loads the new records with the Import Space and the user works in it.
- On the next start, `recoverPending` rolls back from `committing`. The probe shows the post-release edit being replaced by `old`; the marker is removed and the import runs again. **Everything the user did in that session is lost.**
- For a later runtime T-16 run, released owners also hold stale memory over new files and may write it back.

**Case 2: the `done` journal write fails after adopt.**
- The owners are released and the journal stays at `committed`.
- The next restart rolls forward, and the probe shows the post-release edit being overwritten by `newCopy`.

**Fix condition:**
- Any failure after the first replace (the `committed` or `done` journal write) must not release owners or let startup continue.
- Either hold the gate, which `afterSettings` already turns into a startup stop, or retry and roll back in place with the gate held on failure.
- Add tests that make each journal slot write fail (not just target paths) and assert that no owner is released and the next start converges with no later writes.
- Today `failWrite` is only ever applied to target files.

### Low findings (standards)
- **L-1: a drift rollback interrupted by a crash clobbers the foreign edit** (`recovery-transaction.ts:127-139`). The guard that protects a `prepared` journal looks at the journal it was given. Once `rolling-back` has been written, a restart's `rollBack` restores `old` for every entry.
  - Probe: a foreign edit, then a crash right after the `rolling-back` write; after restart the file is `old`.
  - Fix: record the originating phase in the `rolling-back` journal (for example `from: 'prepared'`) and keep the skip-if-not-ours rule.
- **L-2: the tests and docs say "power loss", but the code and tests only cover a process crash.**
  - All writes go through `adapter.write`, which truncates and writes in place, with no fsync and no rename. Read-back verification only sees the page cache. `FaultStorage` keeps every earlier write and never reorders them.
  - Thanks to the digest checks, a real power loss fails closed (`UNRECOVERABLE`, startup stopped) rather than mixing old and new data. But an old target that was truncated and an old copy that never reached disk can both be lost.
  - `docs/data.md:99` says "中断（断电、磁盘写满）……不会出现新旧混合" without that limitation. Fix: soften the wording, or add fsync and rename through a desktop-only port.
- **L-3: journal entry paths are not validated.** `isRecoveryJournal` (`recovery-contracts.ts:140-151`) never checks `entry.path` with `isSafeRelativePath`; only copy paths are checked in `restore`. A damaged or tampered journal therefore drives `replace` or `remove` on any path the adapter accepts. `remove` also skips the private-storage symlink check (`src/app/recovery.ts:100`). Fix: validate entry paths in the codec.
- **L-4: a missing primary with a valid `workspace.json.backup` is not imported.**
  - In `legacy-workbench.ts:182-192` the backup is only consulted when the primary is `corrupt`. A missing primary gives status `absent`.
  - JsonStore loads the backup in that case (`json-store.ts:28-31`), so this contradicts the "as the old store would have read it" comment.
  - The marker is still written (the startup probe treats a backup alone as legacy data), so the layout is never imported. The backup is copied, though, so nothing is lost.
- **L-5: a damaged or newer source is stamped as migrated for good.** The marker is written, and the v1 writer then refuses. After the user repairs the file, the only way to re-import is deleting `legacy-import.json` by hand, and that isn't documented. This is acceptable for the first version but should be documented.
- **L-6: the settings owner covers more than it reloads.** `settingsOwner` claims both settings files in full, but `adopt` only reloads the `agent` namespace. A future stage that changes another namespace would be overwritten by stale memory. Fix: in stage or the owner, enforce that only the listed namespaces differ.

### Verified OK (standards)
- **Two-slot journal:** seq is monotonic (`pending.seq+1`), slots alternate by `seq%2`, and the highest valid seq wins. A torn write at every phase falls back exactly one phase with the right direction (committing goes back, committed goes forward). An unreadable slot fails closed.
- **Owner protocol:**
  - BUSY is checked before any quiesce.
  - Everything is quiesced, then everything is strictly drained, then one common snapshot is taken.
  - A drain failure rejects, and a quiesce failure still releases.
  - Adopt reloads the baselines (settings namespace and persisted baseline, SpaceService records and JsonStore baseline, layout drafts dropped).
  - Release runs on every path except a held gate.
- **Startup order:** `recoverPending` runs before `loadSettings` and before any module, the import runs before modules, and `createSharedWorkspaceOwner` awaits `settled()`.
- **Import safety:**
  - Re-entry is keyed by the source digest plus a deterministic Space id.
  - Damaged, foreign, newer or backup-only records are refused byte-for-byte, never replaced by an empty default.
  - The v1 writer refuses, including instances that were already open.
- **Crash-matrix tests:** they cover every mutating step, clean and torn, plus a second crash during recovery and an unverifiable copy. Within process-crash semantics they are sound.

## Specification axis: request-changes

### M-2 (medium): refused or failed imports are invisible, and the report then says "no legacy data"
- **Where:**
  - `recovery-start.ts:45-53`: `refused` and a thrown error only reach `console.error`; BUSY only shows a transient Notice.
  - `legacy-workbench.ts:338`: the refusal is never persisted.
  - `LegacyImportSection.tsx:38` with `inspectLegacyImport`: no marker means the tab shows the empty state.
- **Scenario:** the vault is copied or restored to another disk, so dev/ino change and the result is `records-scope-mismatch`. Or `workbench-v2.json` is damaged, or the marker is unreadable. The import is then refused on every start, while the "旧数据导入" tab says "未发现旧工作台数据。" even though `workspace.json` exists.
- **Why it matters:** this misses AC-049 "限制清晰" and the error state for AC-061 PAGE-004.
- **Fix condition:**
  - Write the last refusal or failure to a report file outside the transaction, or recompute it read-only in `loadLegacyImport`: legacy source present, marker absent or unreadable, and the reason.
  - Show a localized error state with the reason and the next step (en and zh).
  - Add a DOM test.

### Low findings (specification)
- **L-7: imported terminal tabs are not checked end to end.** They keep legacy `sessionIds` with no Session records. Nobody has verified what the Import Space shows for those panes in the new runtime; the browser part is tested, the terminal part is not. Real-host E2E is the user's, but this should go in the handoff list.
- **L-8: the T-16 protocol has no production caller.** Runtime owners are registered, but nothing calls `recovery.run`, so the live-owner paths are proven only by tests. That matches the stated scope; keep it from being reported as a delivered runtime import.

### Verified OK (specification)
- **AC-047:** the Import Space is named "导入空间 · 旧工作台" / "Import Space · Legacy workbench" and points at the vault root. The layout is stored as parsed, with counts and identities checked before commit. Same-cwd tabs and existing same-directory Spaces are not merged, and the existing selection is kept. Credentials and native logs are untouched, and `index.sqlite` is reported, never read.
- **AC-048:** sources and replaced records get verified copies under `.huhu/recovery/transaction/<op>/`. Nothing is overwritten with an empty default, and the digest re-entry check prevents duplicates (all tested).
- **AC-049:** old-writer refusal is in place and rollback guidance appears in both docs and UI. It is incomplete only through M-2.
- **LOG-030:** legacy automation and shortcut definitions stay unbound (state flag plus notice), and nothing is bound automatically.
- **Retired account index:** it is reported, not migrated.
- **Legacy browser tabs:** keeping them in the Import Space layout and reaching them by selecting that Space is acceptable. It is documented and tested in both cases.
- **Settings tab:** loading, empty, report, source-changed and error states exist in en and zh, with `role=status`/`alert` and `aria-live`.
- **Bundle:** the budget raises are minimal KiB ceilings with an attribution file. `eagerBytes` goes 124928 → 125952 for a measured +325 B (main.ts hooks plus the store `held` flag). `outputBytes` goes 6758400 → 6789120 for lazy code. `moduleActivationBytes.agent` was not raised.

## Verdict
- **Standards: request-changes (M-1).**
- **Specification: request-changes (M-2).**
- L-1 to L-8 are non-blocking.