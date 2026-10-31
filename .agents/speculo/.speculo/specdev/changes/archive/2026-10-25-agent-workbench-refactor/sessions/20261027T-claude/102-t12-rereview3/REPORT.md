<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
# T-12 re-review after Round 5: native resume and native-reference occupancy

## Verdicts
- **Standards: request-changes**
- **Specification: request-changes**

N2 is closed. N1 is closed for managed runtimes, but one path is still open: a lock taken by an automation `specific` run can still be reclaimed after a plugin reload. That is the same class of defect as N1 (labelled NR1 below), and the docs say this cannot happen. The fix is small. NL1, NL2 and NL3 are done, and NL5 is partly done and documented. H1 and M1–M3 have not regressed.

## What I ran
- **Frozen scope:** `sha256sum -c 102-t12-rereview3/SCOPE.sha256` reported all 33 files OK at the start and at the end. I made no repository changes.
- **Rust:** `cargo test --locked --manifest-path native/pty-server/Cargo.toml` exited 0 and every suite passed. That includes `tests/control.rs` (26 tests) with the new `unassigned_history_listing_never_inherits_the_ambient_space`. `cargo build --locked` also passed.
- **Agent tests:** `HUHU_TEST_PTY_BINARY=… HUHU_TEST_CONTROL_BINARY=… pnpm exec vitest run src/modules/agent` exited 0: **148 files passed, 2 skipped; 1149 tests passed, 40 skipped.**
- **Types:** `tsc -p tsconfig.test.json --noEmit --skipLibCheck` exited 0.
- **Lint:** `eslint --max-warnings 0` on the non-test TS/TSX files in scope exited 0. The test files are ignored by the repo config; passing them in only produces "file ignored" warnings.
- **Probes:**
  - I bundled `native-resume.ts` and `occupancy.ts` with esbuild and stubbed `obsidian`. I deleted the bundle afterwards.
  - The adapted reload probe is kept at `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t12r3/reload.cjs`.
  - I re-ran `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t12r2/h1.cjs` against the new bundle.
  - I ran the real `target/debug/huhu` CLI.

## Status of the blocking findings

### N1: plugin reload reclaiming unconfirmed locks. Closed for managed runtimes; still open for automation locks (NR1).
- **What changed:**
  - The instance registry is now process-wide, stored on `process[Symbol.for('huhu.native-refs.instances')]` (`occupancy.ts:95-104`).
  - `NativeResumeService` registers its instance when it is constructed. It unregisters only after `dispose()`, and only once `tracked` and `releasing` are both empty (`settleRegistration`, `native-resume.ts:489-493`).
- **Reload probe, each step evaluating the module again with the `require` cache cleared:**

| Case | Result |
|---|---|
| **A:** load 1 holds a managed lock, runtime still `connected`, then `dispose()`. Load 2 tries the same conversation. | Registry still holds `inst-old`. Load 2 gets **CONFLICT occupied**. ✔ |
| **A2:** the runtime then confirms its exit and `dispose()` runs again. | `inst-old` is unregistered and load 2 gets ACQUIRED. ✔ |
| **D:** a load holding no locks calls `dispose()`. | It is unregistered, so nothing leaks. ✔ |
| **C:** load 1 takes an automation-style lock (`guard()` with no `runtime`), the run never releases it, then `dispose()`. Load 2 tries the same conversation. | Registry no longer holds `inst-auto`. Load 2 gets **ACQUIRED**. ✘ (NR1) |

- The repo test `occupancy.test.ts:205` evaluates the module twice, and `native-resume.test` covers a `disconnected` runtime across repeated disposes. Neither test covers a `guard()` call without a runtime.
- **Can the registry leak forever?** Only by one instance id per load that still holds an unconfirmed managed lock, and only until Obsidian exits. `docs/data.md:81` documents this, so it is acceptable. See NR2 for a wording nuance.

### N2: `history list --unassigned` inside HUHU terminals. Closed.
- `cli.rs:251-259` no longer attaches the ambient `HUHU_SPACE_ID` when the operation is `history.list` with `unassigned` set.
- I ran the real binary with `HUHU_INSTANCE_ID=inst HUHU_SPACE_ID=space-from-env`:

| Command | `target` sent |
|---|---|
| `huhu --json history list --unassigned` | `{"instanceId":"inst"}`, with **no spaceId** ✔ |
| `huhu --json history list` | `{"instanceId":"inst","spaceId":"space-from-env"}`, so the ambient Space is kept ✔ |
| `huhu --json history list --unassigned --space space-B` | `spaceId: "space-B"` is kept, and the service rejects it (`history.ts:159`) ✔ |

- `docs/agent-workbench-cli.md:47` documents the behaviour.
- The cargo test passes.

## New findings

### NR1 (Medium): an automation lock is reclaimed after a plugin reload while its exit is unconfirmed (part of N1 still open)
- **Where:**
  - `native-resume.ts:447-448`: `guard()` with no `runtime` returns a lock it does not track.
  - `native-resume.ts:489-493`: `settleRegistration` looks only at `tracked` and `releasing`.
  - `agent-runtime.ts:599-600` / `633`: an automation run releases only when the root exit is confirmed.
- **What happens:**
  - An automation `specific` run (`nativeLease` → `guard` without `runtime`) holds its lock outside `tracked`.
  - When the controller disposes, `NativeResumeService.dispose()` sees `tracked` empty and unregisters the instance right away, even though that automation lock was never released.
  - The lock file still carries `pid === process.pid` and the now-unregistered instanceId, so a freshly evaluated load treats it as `dead` and reclaims it (probe case C).
- **Why the release can be missing:**
  - The release happens only on a confirmed root `exit`.
  - At unload, `sessions.dispose()` releases the helper leases and then calls `session.dispose()`. `TerminalSession.exit()` returns early once the session is disposed (`session.ts:1350`).
  - A disconnected or late exit therefore never releases the lock, and the next load takes it anyway.
- **Why it matters:**
  - It contradicts AC-038 and the ticket's rule to release only after a verified exit.
  - `docs/data.md:81` says an unconfirmed claim stays a conflict for the reloaded plugin. `docs/agent-workbench.md:117` says every resume path, automation included, follows this rule.
  - Whether a second writer actually appears depends on whether helper teardown happens to kill the automation child. That is exactly the kind of unverified evidence the design refuses to rely on.
- **Fix condition (small):**
  - Record untracked `guard()` leases in an `outstanding` set and remove each entry when its `release()` settles.
  - Make `settleRegistration` also require `outstanding.size === 0`.
  - Add a reload test that uses `NativeResumeService.guard()` without `runtime`.

## Status of earlier lows
- **NL1, fresh launches now take the lock: done. No double claim and no leak.**
  - `controller.claimRunningNative` runs on every `sessions` change. It claims once per terminal session, and only for managed agent sessions that are running with both a native id and a transcript.
  - Unmanaged sessions, including automation terminals, are skipped.
  - When a resume or restore already holds the same conversation, `take()` finds the tracked entry and throws `resume-in-progress`; that error is swallowed, so no second lock is taken. When `acquire` would hit a lock this instance already holds, it returns `self` and is swallowed the same way.
  - The release follows the managed lifecycle (`guard({runtime})` → `track` → `sweep` on a confirmed end).
  - Normal launches cannot regress: the claim is asynchronous and best-effort, and errors are swallowed.
  - The test (`controller-resume.test.ts:116`) checks the claim fires once, the skip rules, and a late native id. It does not test the release on exit, but that path is the same one already tested for resume and restore.
- **NL2, tab restore keys on the stored path: done.** `restoreSession` keys on `restoredAccountReference(...).transcriptPath` (`controller.ts:1347-1361`), and a test asserts the remapped path reaches `guard`.
- **NL3, automation needs a transcript path: done.** `transcriptFor` searches the vault projection by native id and matches provider and account name. If nothing is found it fails with `sessionMissing`. Tests cover found, not found and lookup failure.
- **NL5, root exit only: partly done.** A release now requires `exitEvidence.confirmed`. In the catch path, connection `exited` already means confirmed, and `failed` means nothing was spawned. The limitation is documented at `agent-workbench.md:117`. Its interaction with plugin reload is NR1.
- **NL4 and L1:** left as-is and documented. Still acceptable as lows.

## Not blocking
- **NR2 (Low): a confirmation that arrives after dispose never releases the lock.**
  - `dispose()` unsubscribes from managed changes, and the controller caches its `disposing` promise. In practice nothing calls `NativeResumeService.dispose()` again.
  - So a lock that was unconfirmed at unload stays held until Obsidian exits, even if the runtime confirms its exit a moment later.
  - This is the safe direction, but `data.md:81` ("直到它确认退出并释放了全部占用之后…") reads as if a late confirmation would free it. Either keep a sweep subscription alive after dispose, or reword the docs.
- **NR3 (Low): the fresh-launch claim never retries.** `claimedNative` is never pruned, which is a small per-load growth of strings. A claim that failed for a transient reason (for example an fs error) is never retried. If the native id changes mid-run, the new conversation is not claimed.
- **NL4 and L1:** unchanged, as above.

## No regression of earlier fixes
- **H1:** I re-ran the cross-vault race between two processes, with vault B reaching the transcript through a symlink. In 5 out of 5 trials exactly one side got ACQUIRED, the other got `CONFLICT occupied`, and there was one `.lock` file.
- **M1:** tab restore, Continue and automation still take the lock before spawning.
- **M2:** dispose still waits for `managedDone` and `nativeDone`. `drainManaged` keeps the summaries, so unconfirmed runtimes keep their locks.
- **M3:** preflight still runs before import, and the import refuses a mismatched directory. The vitest suite is green.

## Specification coverage
- **AC-037:** met.
- **AC-038:** not fully met. Managed, restore, fresh-launch, cross-instance and cross-vault cases are covered, but NR1 leaves the automation plus plugin-reload path open.
- **AC-039:** met.
- **AC-040:** met. N2 is closed, so discovery now works inside HUHU terminals too.

## Not verified
- Real Codex/Claude end-to-end runs.
- An actual Obsidian plugin reload; I simulated it by evaluating the module again in node.
- Whether the helper teardown actually kills automation children at unload.
- Two real Obsidian instances.
- macOS and Windows locking.