<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
## T-12 re-review 4 (after Round 6): native resume claims

## Verdicts
- **Standards: pass**
- **Specification: pass**

NR1 is closed with no regression of N1 cases A, A2 and D. NR3 is closed. NR2 is closed in the code and in tests, but it never happens in the real plugin, so `docs/data.md` overstates it. That is a new low finding (NR4). There are no medium-or-higher findings, and I made no repository changes.

## What I ran
- **Agent tests** (`HUHU_TEST_PTY_BINARY=… HUHU_TEST_CONTROL_BINARY=… pnpm exec vitest run src/modules/agent`): exit 0. 148 files passed and 2 were skipped; 1151 tests passed and 40 were skipped. The previous round had 1149 passed, so the two new tests (NR1 and NR3) are included.
- **Types** (`tsc -p tsconfig.test.json --noEmit --skipLibCheck`): exit 0.
- **Lint** (`eslint --max-warnings 0` on `native-resume.ts` and `controller.ts`): exit 0.
- **Reload probe:** I bundled the code with esbuild, using a stubbed `obsidian`, and loaded it again in node with the require cache cleared each time. The adapted probe is `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t12r4/reload.cjs`. Its fake `subscribeManaged` is real, so a late exit can be delivered after dispose. I deleted the bundle afterwards.

| Case | Result |
|---|---|
| **A:** a managed claim is still `connected` when the plugin unloads | Still registered, 1 listener left; the new load gets **CONFLICT occupied** ✔ |
| **A-noise:** an unrelated change arrives while the runtime is still connected | Still CONFLICT. No unconfirmed claim was released ✔ |
| **A2:** a confirmed exit arrives after dispose | Unregistered, 0 listeners; the new load gets ACQUIRED ✔ |
| **C (NR1):** an automation `guard()` with no runtime, never released, then dispose | Still registered; the new load gets **CONFLICT occupied** ✔. After `release()` it is unregistered and the new load gets ACQUIRED ✔. A second `release()` is harmless (`lease.release` is memoised) ✔ |
| **G:** one load holds an automation claim and a managed claim | Still registered after the automation claim is released but the managed one is unconfirmed. Unregistered only after the managed exit, with 0 listeners ✔ |
| **D:** an idle load is disposed | Unregistered, 0 listeners. No leak ✔ |
| **H:** `guard()` is called after dispose | Refused with `module-closing` ✔ |

## NR1: closed
- **The fix:**
  - `guard()` with no runtime adds the claim to `outstanding` (`native-resume.ts:450`).
  - Its `release()` removes it in a `finally` and then re-checks registration (`:452-458`).
  - `settleRegistration` now requires `tracked`, `releasing` and `outstanding` all to be empty (`:499`).
- **Edge cases checked:**
  - If the claim reuses an earlier tracked one, it moves from `tracked` to `outstanding` (`:449`). Automation claims use `spaceId ''`, so they can never actually reuse a managed claim.
  - If releasing an automation claim fails to delete its file, the instance is unregistered anyway. That is correct: the caller only releases after a confirmed exit, so the leftover file is fair to take over.
- **Test:** `native-resume.test.ts:714` reloads the module with `vi.resetModules()` and expects `conflict/held` while the claim is held, then `acquired` after it is released. This matches my probe.

## NR2: closed in the code; the docs overstate it (see NR4)
- **The code:**
  - `dispose()` keeps the managed subscription while any claims remain (`sweep` only unsubscribes when `tracked` is empty).
  - A late confirmed exit then releases the claim, unregisters the instance and drops the listener.
  - A reservation that lands after dispose also subscribes, through `track`.
- **Tests:** both M2 tests now check 1 listener before the exit and 0 after.
- **Can it release an unconfirmed claim?** No. After dispose, `sweep` still only releases on `runtimeEnded` or a missing summary. `sessions.dispose()` never clears its `managed` map, so a summary is kept for every runtime that is still unconfirmed (`sessions.ts:262`, `891-925`).
- **Can it leak subscriptions forever?** No. The watch ends when `tracked` empties. In the real plugin, `workspace.dispose()` (the controller's final `writer` step, which runs after the `native-resume` step) clears `managedListeners` and `managedOff` (`workspace-service.ts:2458-2459`). So the watch never outlives the module, whatever happens.

## NR3: closed
- **The fix:**
  - `claimRunningNative` removes sessions from `claimedNative` once they are no longer running (`controller.ts:612-618`).
  - A failure that is not a `NativeResumeError` deletes the entry, so the next sessions change retries it. A refusal stays final (`:643`).
- **No duplicate claims:** at most one claim attempt is in flight per session, because the entry stays in `claimedNative` while it runs.
- **No leaked lock on retry:** the failures that get retried can only happen before a lock is held (`canonicalPath` or `occupancy.acquire`). `bind` errors are swallowed.
- **Test:** `controller-resume.test.ts:158` covers the retry, a final refusal, and pruning.

## No regression of earlier fixes
- **N1:** cases A, A2 and D behave as before (probe above).
- **N1 repeated-dispose test:** `native-resume.test.ts:699` still passes.
- **M2:** the summaries kept during drain still hold claims whose end is unconfirmed.

## New findings
There are no medium-or-higher findings. Lows:

- **NR4 (Low, docs accuracy):** the end of `docs/data.md:81` says the unloaded load keeps watching and, once a later exit is confirmed, releases the claim and unregisters. In the real plugin that cannot happen:
  - `sessions.dispose()` has already run, and `TerminalSession.exit()` returns early once a session is disposed (`session.ts:1350`), so no late exit arrives.
  - Soon after, `workspace.dispose()` clears every managed listener and stops `refreshManaged`.
  - In practice, a claim that is unconfirmed at unload stays until Obsidian exits. The sentence's last clause, "若始终没能确认，该占用保留到 Obsidian 退出为止", is what actually happens.
  - This errs on the safe side. Either reword the sentence to "在模块完全关闭前若确认退出则释放，否则保留到 Obsidian 退出", or keep the watch alive somewhere that survives `workspace.dispose()`. `docs/agent-workbench.md:117` is already accurate.
- **NR5 (Low, test naming):** two M2 test titles no longer match what they assert.
  - `native-resume.test.ts:558` is titled "...later tracking never resubscribes", and `:612` "...tracked without a subscription". Both now assert that a post-dispose subscription exists (`listeners.size === 1`).
  - Rename them.
- **NR6 (Low, retry frequency):** a persistent failure that is not a `NativeResumeError` is retried on every `sessions` change, with at most one attempt in flight per session. Examples are a missing transcript file during `canonicalPath`, or an unwritable state directory.
  - The cost is bounded, but it is an fs probe per change event.
  - A small backoff or retry cap would be enough. It is not required.
- **Carried over:** NL4 and L1 are unchanged, documented, and still low.

## Not verified
- A real Obsidian plugin reload; I simulated it by reloading the module in node.
- Real Codex/Claude end-to-end runs.
- Whether helper teardown kills automation children at unload.
- macOS and Windows locking.

I did not re-run cargo, because no Rust file was in scope for this round.