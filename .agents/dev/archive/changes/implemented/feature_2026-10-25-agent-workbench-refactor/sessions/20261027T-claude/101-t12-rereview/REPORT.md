<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
# T-12 re-review after Round 4: exact resume, explicit import, native-reference occupancy

## Verdicts
- **Standards: request-changes**
- **Specification: request-changes**

H1, M1, M2 and M3 are fixed as written, and L3–L8 are closed. Two new medium defects keep both verdicts at request-changes:
- **N1:** the new same-process lock reclaim lets a plugin reload take a lock from a runtime that has not been confirmed as ended. This reopens M2 and AC-038 on the reload path.
- **N2:** `history list --unassigned`, the M3 discovery fix, always fails inside a HUHU terminal.

Both fixes are small.

## What I ran
- **Frozen scope:** `sha256sum -c 101-t12-rereview/SCOPE.sha256` reported all files OK before and after the review. I made no repository changes.
- **Agent tests:** `HUHU_TEST_PTY_BINARY=… HUHU_TEST_CONTROL_BINARY=… pnpm exec vitest run src/modules/agent` exited 0: **148 files passed, 2 skipped; 1145 tests passed, 40 skipped.**
- **Types:** `tsc -p tsconfig.test.json --noEmit --skipLibCheck` exited 0.
- **Lint:** `eslint --max-warnings 0` on the non-test TS/TSX files in scope exited 0. The repo config ignores test files.
- **Other checks:** `test:i18n` passed (4893 keys). `generate-control-protocol --check` reported "bytes match".
- **My own probes:** I bundled `native-resume.ts` and `occupancy.ts` with esbuild, ran them under node, and deleted the bundle afterwards. The probe scripts are kept at `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t12r2/h1.cjs` and `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t12r2/reload.cjs`. I also ran the real `target/debug/huhu` CLI to check how it builds the request target.

## Status of previous findings

### H1: cross-vault occupancy key. Closed.
- The key is now `[provider, realpath(transcript), nativeSessionId]` (`reference.ts` `occupancyIdentity`, `occupancy.ts:117` `canonicalStorePath`). It no longer contains the vault `deviceId` or `HUHU_ACCOUNT_ROOT`.
- The history Continue, tab restore and automation paths all derive the key through `NativeResumeService.identity()`.
- **Probe:** two separate node processes acted as "vault A" and "vault B", with different deviceId, vaultId and instanceId. Vault B reached the transcript through a **symlinked** provider home. They raced `guard()` on the same conversation.
  - Result in 5 out of 5 trials: exactly one `ACQUIRED`, the other `CONFLICT occupied`, and one `.lock` file.
- The repo test `native-resume.test.ts:434` covers the same case.
- The docs (`data.md`, `agent-workbench*.md`) now describe the physical-store key correctly.

### M1: other resume paths did not take the lock. Closed for the spawn paths that existed.
- **Tab restore:** `controller.restoreSession` (`controller.ts:1299-1308`) calls `guard({…, runtime})` before building the launch host.
  - Normal restore of HUHU-launched Sessions still works. In production `WorkspaceService` always has `spaces`, so `restore()` always reserves a managed generation and passes `context.runtime` (`workspace-service.ts:2294-2314`).
  - The new refusal only affects a `WorkspaceService` with no `spaces`, and the earlier `TARGET_REQUIRED` check already blocked that case.
  - If the claim fails, `restore()` → `failLaunch` → `notStarted()` records a confirmed termination, so the lock goes back immediately (`sessions.ts:246-252`). A declined confirmation also ends in a cancelled not-started run.
- **Automation `specific`:** `claimNativeConversation` runs before `host.create` and releases on the `exit` event only. `disconnected` keeps the lock.
  - Every claim error is mapped to `AutomationError('busy')`. That matches the existing in-process busy result: the run fails with `errorCode` `busy`, there is no automatic retry, and receipts behave as before.
  - The only difference is that the claim happens after `hooks.prepare` and `onPrepared`. The catch block closes the hooks and spawns nothing.
- **Sweep:** a new generation no longer releases the lock. It is rebound to the new runtime instead (`sweep` / `continuing`).

### M2: release before verified exit. Closed within one plugin load; reopened across plugin reloads (see N1).
- `native-resume` disposal now waits for `managedDone` and `nativeDone`.
- Disposal releases only leases whose runtime is confirmed ended (`runtimeEnded` / termination evidence).
- A `track()` that arrives after dispose does not subscribe again.

### M3: wrong-Space import and CLI discovery. Closed in substance; N2 breaks CLI discovery inside HUHU terminals.
- GUI Continue now runs `preflight()` (source, provider, verify, `cwd`) before `importSource` (`controller.ts:1151-1158`). A test asserts the order and that nothing is imported when preflight fails.
- `importSource` refuses a Space whose directory does not match the conversation's, except when re-importing into the Space that already owns it.
- `history list --unassigned` exists:
  - The schema adds a boolean param, and the Rust CLI parses it as a flag.
  - The rows shown leave out `accountKey` and `transcriptPath` and carry no `spaceId`.
  - The cursor is scoped with the `*unassigned*` token.
  - `--space` together with `--unassigned` returns `INVALID_ARGUMENT`.
- The `details` claim was removed from the docs.

### Lows
- **L1, reclaim guard race: not fixed.** `occupancy.ts:323-350` still does read-then-unlink on the guard, and I did not find it described in `docs/data.md`. Accepted as low; nothing changed.
- **L2, hostname change and Windows pid reuse: documented, not fixed.** `docs/data.md:82` describes it. Acceptable.
- **L3, lock directory location: closed.** Linux uses `$XDG_STATE_HOME`, falling back to `~/.local/state/huhu/native-refs`. Windows uses `%LOCALAPPDATA%\HUHU\native-refs`. macOS uses `~/Library/Application Support/HUHU/native-refs`. A relative `XDG_STATE_HOME` is ignored, and there are tests for each platform.
- **L4, catch-all verify reason: closed.** `verifyFailure` now maps to `transcript-missing`, `vault-missing`, `account-mismatch`, `program-missing`, `provider-disabled` or `verify-failed`.
- **L5, focus after Cancel/Escape: closed.**
  - Cancel and Escape set `restoreFocus`, and an effect moves focus back to the Continue trigger (falling back to the row toggle).
  - The row-menu Continue item is `disabled: continueBlocked` when the source is unavailable.
- **L6, English control errors: closed.** All history `ControlProtocolError` texts now go through `t()` (`agent.historyControl.*`).
- **L7, accountKey length: closed.** Over-length evidence is refused before the writer queue with the reason `evidence-too-long`.
- **L8, leftover temp files: closed.** `sweepTemporary` removes `*.tmp` files older than 60 s on every acquire.

## New findings

### N1 (Medium): a plugin reload reclaims locks held by runtimes that have not been confirmed as ended
- **Where:** `occupancy.ts:90-95` and `:216-221`, and `native-resume.ts:204`.
- **How it works now:**
  - `localInstances` is a module-level `Set`.
  - `liveness()` returns `dead` for any record with `pid === process.pid` whose instanceId is not in that Set.
  - When Obsidian disables and re-enables, updates, or reloads the plugin, it evaluates `main.js` again, so the new load starts with an **empty** Set.
- **The result:** every lock taken by the previous load counts as dead, whatever its state. That includes:
  - leases that M2's dispose deliberately **kept** because the stop was not confirmed (`shutdownIncomplete`, a `disconnected` runtime);
  - leases of runtimes that the old load's asynchronous `drainManaged` is still stopping. `onunload` does not wait for it (`main.ts:252-262`).
- **Probe (`reload.cjs`):**
  1. Load 1 takes a lease for a runtime that is still connected, then calls `dispose()`. The lease is kept, as M2 intends.
  2. A second NativeResumeService from the **same** module scope (a HUHU module toggle) gets `CONFLICT occupied`. That is correct.
  3. A NativeResumeService from a **fresh** module evaluation (a plugin reload) gets `ACQUIRED`. It has taken the lock from a runtime that was never confirmed as ended.
- **Why it matters:** this contradicts the ticket ("只有核实退出后释放；旧占用要用实例存活证据判断") and the M2 fix itself. A Continue, tab restore or automation run in the reloaded plugin can start a second writer while the old process may still be writing. `docs/data.md:81` presents this takeover ("同一进程里的 HUHU 实例已卸载时，其他实例会接管") as safe.
- **Fix condition:**
  - Keep the instance registry in process-wide state that survives reloads, for example `globalThis[Symbol.for('huhu.native-refs.instances')]`.
  - The old load then stays registered until its dispose has released every lease after confirmed exits. Only after that is its record treated as dead.
  - Add a test that loads the module twice.

### N2 (Medium): `history list --unassigned` always fails inside a HUHU terminal
- **Where:**
  - `history.list` declares `target: ["spaceId"]`.
  - The Rust CLI fills in `spaceId` from `HUHU_SPACE_ID` whenever an operation's target includes it (`native/pty-server/src/control/cli.rs:250-262`).
  - `commands.ts:384` and `history.ts:159` then reject `unassigned` together with a `spaceId` as `INVALID_ARGUMENT`.
- **Probe:** with `HUHU_SPACE_ID=space-from-env`, `target/debug/huhu --json history list --unassigned` sent `"target":{"spaceId":"space-from-env"}`. The control side rejects that combination.
- **Why it matters:**
  - Agents running in HUHU-managed terminals, the main CLI users, always have `HUHU_SPACE_ID` set, so the documented discovery step for `history import` cannot work there.
  - The only way around it is `env -u HUHU_SPACE_ID`, which is not documented.
  - The docs (`agent-workbench-cli.md:47`) do not mention the env Space.
- **Fix condition:**
  - Skip filling in the env Space for `history.list` when `--unassigned` is given, or have the CLI reject the combination only when `--space` was passed explicitly.
  - Add a CLI test with `HUHU_SPACE_ID` set.

## New lows (do not block on their own)
- **NL1, fresh launches never take the claim:** `guard()` is called only for resume paths (`controller.ts:353, 1301`).
  - A fresh HUHU-launched conversation that is still running holds no lock.
  - An automation `specific` run on that conversation in the same instance (its in-process busy check covers only automation slots), or a Continue from another instance, can therefore start a second writer.
  - This gap existed before T-12, but AC-038 says at most one HUHU writable runtime. Consider claiming the lock once the native id and transcript are known.
- **NL2, tab restore keys on the stored path:** tab restore uses the record's stored `transcriptPath` for the key. `resumeAgent` may then remap that path through `restoredAccountReference`, for example after the vault was moved.
  - If the stored path no longer exists, `canonicalStorePath` falls back to `path.resolve` and the key differs from the history path's key.
  - Automation already uses the remapped path. Restore should key on the remapped path the same way.
- **NL3, automation needs a transcript path:** an automation `specific` run now needs `transcriptPath` and fails with `sessionMissing` without it. `AgentSessionRef.transcriptPath` is optional, so older definitions saved without it, which ran before, now fail. Current history rows always carry a path.
- **NL4, automation lock owner fields:** the automation lease records `spaceId: ''` and `sessionId: automation-<runId>`, so a conflict message shown to another instance names no Space.
- **NL5, root exit only:** automation releases its lock on the root `exit` event, not on confirmed cleanup (`terminationConfirmed`). The history path is stricter, so the two differ slightly.

## Specification coverage
- **AC-037:** met. Attach only when live. An ended Session gets an exact resume on the same Session with a new generation; the lock carries over to the new generation without a gap.
- **AC-038:** not fully met. Cross-vault, cross-instance, tab restore and automation are now covered (H1 and M1 are closed). N1 lets a plugin reload break the guarantee, and NL1 remains.
- **AC-039:** met. Refusals happen before anything is persisted, there is no fork, and no empty Session is created.
- **AC-040:** met for the GUI and outside HUHU terminals. N2 blocks CLI discovery inside HUHU terminals.
- **AC-061 (PAGE-002):** the focus-return and disabled-state gaps are closed. Real viewport, theme and screenshot checks belong to the user.

## Not verified
Real Codex/Claude end-to-end runs, two real Obsidian instances, an actual Obsidian plugin reload (N1 was shown by evaluating the module twice in node), and macOS/Windows locking.