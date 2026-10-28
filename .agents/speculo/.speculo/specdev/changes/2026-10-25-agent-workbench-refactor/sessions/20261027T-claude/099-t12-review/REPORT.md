<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
# T-12 review: exact resume, explicit import, native-reference occupancy

**Verdicts**
- **Standards: request-changes**
- **Specification: request-changes**

Both verdicts rest on one high-severity defect: the protection against two HUHU instances running the same conversation does not work across different vaults. That is the case the spec (§3 line 174) and the docs say it covers. Three medium findings add to it.

## What I ran
- Frozen scope check (`sha256sum -c` on `099-t12-review/SCOPE.sha256`): all files OK, before and after the review.
- The vitest command from the brief, with `HUHU_TEST_*` set: **35 files passed, 2 skipped; 285 tests passed, 3 skipped.**
- `tsc -p tsconfig.test.json --noEmit --skipLibCheck`: exit 0.
- `eslint --max-warnings 0` on the non-test TS/TSX files in scope: exit 0. The repo config ignores test files.
- `test:i18n`: OK, 4880 keys, en and zh match.
- One probe of my own, built with esbuild and run under node in the scratchpad, then deleted (details in H1).
- I made no repository changes.

## High

### H1. Occupancy key changes per vault, so the lock does not stop a second vault (AC-038)
- **Where:**
  - `src/modules/agent/platform/desktop/native-reference/reference.ts:54-60`: `nativeOccupancyKey` hashes `[provider, accountKey, deviceId, nativeSessionId]`.
  - `src/shared/storage/vault-identity.ts:28-73`: `deviceId` is a random UUID per vault. The device map and the fingerprint salt are stored inside each vault.
  - `src/modules/agent/platform/desktop/agents/accounts.ts:84-95`: for the system account, `accountKey` includes `HUHU_ACCOUNT_ROOT=<vault>/.huhu/agents/<device>/system`, which `historyAccountEnv` returns unchanged.
- **Failure:** vault A and vault B are open on the same machine and both use the system Claude account, so they share `~/.claude`. Each continues the same native conversation. The two digests differ, both `acquire()` calls succeed, and two writable runtimes resume the same transcript.
  - My probe used `NativeOccupancy` and `nativeReferenceOf` with identities shaped exactly as the code above produces them. Result: `A: acquired B: acquired lockfiles: 2`.
  - Managed accounts live inside each vault, so the main shared store across vaults is the system account. That is also the default.
- **Why the tests miss it:** `native-resume.test.ts` fixes `deviceId: 'device'` and uses an `accountKey` with no vault root.
- **Docs also wrong:** `docs/agent-workbench.md`, `docs/data.md` and `docs/agent-workbench-cli.md` all claim the lock works "跨 HUHU 实例（包括不同的库）".
- **Fix condition:**
  - Build the occupancy key from the physical provider store, not from vault-local identity. For example: provider + canonical real path of the provider home/config dir (system or managed) + native id. Or use the canonical transcript real path.
  - Do not use the vault `deviceId` or the vault-local `HUHU_ACCOUNT_ROOT` in this key.
  - Keep the full reference only for de-duplicating imports.
  - Add a test with two vault identities (different `deviceId` and `HUHU_ACCOUNT_ROOT`, same provider store) and require exactly one winner.

## Medium

### M1. Other HUHU resume paths start writable runtimes without taking the lock (AC-038; ticket says "CLI 与 GUI 同路")
- **Where:**
  - `workspace-service.ts:2233-2315`: `restore()` (the tab "恢复会话"/continue button) calls `controller.ts:~1250-1313` `resumeSession` → `resumeAgent`.
  - The automation `sessionMode: 'specific'` resume (`agent-runtime.ts:329`).
  - Neither calls `NativeOccupancy`.
  - `NativeResumeService.sweep()` also releases the lock as soon as the generation changes (`runtime.runtimeId !== entry.runtimeId`).
- **Failure:**
  - In instance A, a history-resumed conversation exits and its lock is released.
  - The user clicks the tab's restore button in A. A new writable runtime starts with no lock.
  - Instance B's `history resume` then acquires the lock and starts a second runtime.
  - The reverse order also works: B holds the lock and A's tab restore ignores it.
  - Round 2 made imported Sessions show `canRequestContinue: true`, which widens the set of entries that reach this unguarded path.
- **Fix condition:** every HUHU path that spawns a native resume, including tab restore and automation-specific sessions, acquires the same occupancy lease before spawning. At minimum, route them through `NativeResumeService`. A path that cannot do this refuses explicitly. Add a test for tab restore against a lock held by another instance.

### M2. Locks are released on module dispose before the runtimes are confirmed to have exited
- **Where:**
  - `controller.ts:1585-1619`: `settle('native-resume', () => nativeResumeService.dispose())` runs in the same `Promise.all` as `settle('native', () => this.sessions.dispose())` and `drainManaged`.
  - `native-resume.ts:334-341` releases every lease immediately.
- **Failure:**
  - The user disables the module or reloads the plugin. The locks disappear while the helper is still stopping its children.
  - If stopping fails (`shutdownIncomplete`, or a runtime left unknown), the locks are already gone, and another instance can resume while the old process may still be writing.
  - This contradicts the ticket ("只有核实退出后释放") and the report's own claim.
- **Smaller related case:** if dispose happens while a resume is in flight, the late `reserved` callback calls `track()` again after dispose. That re-subscribes to a disposed workspace and leaks the lease until Obsidian exits.
- **Fix condition:**
  - Release only after `sessions.dispose()` / `drainManaged` settle, and only for leases whose runtime has a confirmed end.
  - On failure, keep the lease; renderer pid liveness reclaims it later.
  - Make `track()` a no-op after dispose that releases the lease only once exit is verified.

### M3. Wrong-Space imports cannot be undone, and the CLI cannot reach unassigned rows (AC-040, AC-039, docs)
- **Irreversible binding:**
  - `controller.ts:1141-1150`: GUI Continue on an unassigned row calls `importSource`, which persists `historyOwners` plus a Session, before `resumeSource` checks that the Space's cwd equals the row's cwd (`native-resume.ts:255-257`).
  - If the user picks a Space with a different directory, the continue fails with `cwd-not-authorized`, but the source stays bound to that Space.
  - Importing into the right Space then fails with `OWNER_CONFLICT`. I found no code path that removes a binding (grep for any `historyOwners` removal found none).
  - The explicit "Import into Space…" action has the same trap.
- **CLI discovery:**
  - `history list` and `history preview` return only rows already bound to the given Space (`control/history.ts:180,268`).
  - So the CLI can never find an unassigned `sourceRef` to import.
  - The CLI docs still say "`--source` 是 `list` 返回的 `sourceRef`" for `import`.
- **Docs claim missing data:** the CLI docs say `OWNER_CONFLICT` carries `details` naming the holder. The wire does not carry `details` (the report records this as a T-07 follow-up).
- **Fix condition:**
  - Run the cwd, provider and account pre-checks against the chosen Space before persisting the import in the Continue flow. For explicit import, warn about or refuse a directory mismatch, or provide unbind/move.
  - Give the CLI a way to list unassigned rows explicitly (for example an explicit "unassigned" scope), or correct the docs.
  - Remove the `details` claim from the docs until the wire carries it.

## Low (do not block on their own)
- **L1, `occupancy.ts:252-279`:** the stale-guard takeover uses read-then-unlink. If a crashed reclaimer left a guard older than 30 s, two reclaimers can both "own" the guard, and one can unlink the other's newly created lock. Rare. Fix: claim the lock by renaming it to a unique tombstone and verifying its `lockId`, or create the guard with link-based exclusion and never unlink a guard you do not own.
- **L2, `occupancy.ts:167`:** liveness returns `unknown` when the hostname differs. On macOS the hostname can change with the network, so a crashed instance's lock is never reclaimed automatically. Also on Windows there is no start marker, so a recycled pid reads as alive. Both are safe but can get stuck. The documented manual deletion is the only way out.
- **L3, `occupancy.ts:85-89`:** `~/.huhu/native-refs` lands inside the vault's `.huhu/` (synced) when the vault is the home directory. Prefer an OS app-state directory (XDG_STATE_HOME, %LOCALAPPDATA%, Application Support).
- **L4, `native-resume.ts:244-253`:** every non-`ManagedLaunchError` from `verify` is reported as `account-mismatch`, including a missing transcript, a missing vault and I/O errors. Every non-`provider-disabled` `ManagedLaunchError` is reported as `program-missing`. Map them to `source-missing` and similar specific reasons.
- **L5, `SessionHistoryPanel.tsx:279-306`:** the inline confirmation does not return focus to the Continue trigger after Cancel or Escape, so focus falls to the body. This conflicts with motion-a11y ("关闭弹层恢复到仍存在的触发器") and AC-061. Also, the row menu's Continue item is not disabled when the source is unavailable; the service does refuse it explicitly.
- **L6, Round-3 `router.ts`:** the router now forwards every `ControlProtocolError.message`. Some of those messages are hard-coded English strings rather than `t()` text, such as `'history requires an explicit Space'`, `'history source is not indexed'` and `'invalid history limit'`, so CLI users now see them.
- **L7, `records.ts:73,92-101`:** `nativeImport.accountKey` must be at most 4096 characters. A managed account's env JSON with a deep vault path can exceed that, and `importHistorySession` does not check the length before writing. Check it before the writer queue.
- **L8, `occupancy.ts:225-250`:** if the process crashes between creating the temporary file and linking it, `*.tmp` files are left behind and never swept.

## Specification coverage
- **AC-037: met for the history path.** A live runtime is attached. An ended one is resumed with a literal argv as a new generation of the same Session (`prepareSession(..., existingSessionId)`). M1 shows other paths bypass the guarantee.
- **AC-038: not met.** See H1 (cross-vault) and M1 (unlocked paths). The same-instance and same-key race tests are sound.
- **AC-039: mostly met.** Refusals are explicit and create no Session or process, and no fork exists anywhere. But see M3: a failed continue can leave a permanent wrong-Space import.
- **AC-040: met for preview (no Session) and exact import de-duplication** (two accounts are never merged). The CLI cannot reach unassigned rows (M3).
- **CLI explicit Space (LOG-030): met.** `history.import` and `history.resume` require `spaceId`. `open` derives the Space from the Session and returns `SCOPE_MISMATCH` when the given Space differs.
- **GUI (PAGE-002):** confirmation, loading, error with dismiss, unsupported (disabled with a reason) and Escape all work. The confirmation is inline rather than a dialog, which the report records as a deviation. Focus return is missing (L5). Real viewport, theme and screenshot checks belong to the user and were not run.
- **en/zh:** complete.
- **Docs:** inaccurate in H1 and M3.

## Not verified
Real Codex/Claude end-to-end runs, two real Obsidian instances, macOS `ps lstart` behaviour, and Windows locking. The ticket assigns all of these to the user.