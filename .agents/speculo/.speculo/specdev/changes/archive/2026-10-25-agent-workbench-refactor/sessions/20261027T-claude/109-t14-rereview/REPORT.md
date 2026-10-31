<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
# T-14 re-review after Rounds 4–5: consumer compatibility and legacy Space binding (read-only)

**Verdicts: standards = pass; specification = pass.** All four blocking items from review 105 are closed:

- **S-H1:** the safety regression suite now exits 0.
- **S-M3 / S-M2:** a legacy same-ID retry gets its recorded receipt back.
- **S-M1:** a quick command bound to a gone Space shows a sentence, not a code.
- **S-M4:** quick commands now honour their saved directory inside the Space.

All lows are closed except S-L3 (carried) and P-L5 (accepted). The new code introduced no medium or higher defects. Four new lows are listed at the end. One is a gap in the S-M4 fix: a vault-root or symlinked directory is refused by quick commands but accepted by automations.

## What I checked

- **Frozen scope:** `sha256sum -c SCOPE.sha256` reported all 73 files OK, both at the start and after all runs.
- **vitest** (agent, automations, home, browser, shared, `test/automations`, `test/golden`, with both native binaries):
  - **First run failed:** 4 tests in `workspace-service-spaces.test.ts` failed with `OWNER_CONFLICT:port-in-use` (`EADDRINUSE 127.0.0.1:51594`). The writer port is a hash of the device and the temp-directory identity, and it collided with a port already in use.
  - **Reruns passed:** the file passed on its own (22/22). The full set passed on rerun (319 files passed and 3 skipped; 2291 tests passed and 41 skipped; exit 0). This flake comes from the port design in T-02, not from T-14 logic. Details under New lows.
- **`pnpm run test:safety-regressions`:** exit 0. `Automation session: concurrent duplicate rejected busy; one terminal launched` and `Dashboard conflict …` both ran, and so did the issue regressions after them.
- **tsc** (`tsconfig.test.json --noEmit --skipLibCheck`): exit 0.
- **`pnpm run lint`:** exit 0.
- **`test:i18n`:** passed (4907 keys, placeholders match).
- **`test:architecture`:** passed (1262 modules).
- **`node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce`:** exit 0, "budget: within limits".
- **No repository writes and no `pnpm run build`.** I measured the committed HEAD from a `git archive` copy in scratch, then deleted that copy. Logs are in `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t14r2/`.

## Previous findings

| ID | Status | Evidence |
|---|---|---|
| **S-H1** safety regression | **Closed** | `automation-session.mjs` now binds `spaceId:'space-a'` and gives the host `spaces.cwd/admit`. The original assertions are unchanged: one launch, one `unknown` and one `failed` run, the duplicate rejected with `busy`, reservations drained. The suite exits 0. |
| **S-M1** raw error code | **Closed** | `quick-commands-port.ts:30-35` maps `ManagedLaunchError` to `t(error.failure.messageKey)` and keeps the `SpaceError` mapping. Both the controller test and the port test now use the real `legacyManagedResult` error shape (`ManagedLaunchError(TARGET_NOT_FOUND,'archived-space')`). `agent.spaces.error.missing` takes no parameters and exists in both en and zh. |
| **S-M2 / S-M3** legacy receipt | **Closed** | `service.ts:347-356` now does the pending and recorded identity lookup before the `spaceRequired` gate. `invocations.test.ts:146` asserts `toEqual(originalReceipt)`, that a new ID still gets `spaceRequired`, no start, and no rewrite. `prompt-port.ts:36-39` forwards an unbound fresh request only when `invocations.receipt(id)` exists. Details on why this cannot return a wrong receipt are below. |
| **S-M4** quick-command cwd | **Closed (Lead's option)** | `controller.ts:1146` resolves the saved directory relative to the vault. `createManagedWithContext` (`workspace-service.ts:863-871`) applies `spaceBoundCwd` and otherwise throws `DIRECTORY_NOT_AUTHORIZED/cwd-outside-space`. The vault-root and canonicalisation gap is new low S-L5. |
| S-L1 business activity | Closed | `markBusinessActivity` → `invalidateActivity('unsupported')` in both the agent `prepare` (`agent-runtime.ts:684`) and the script `prepare` (`:823`). Tested in `agent-runtime-space.test.ts:203`. |
| S-L2 precheck cwd | Closed | `service.ts:501-510`: the precheck runs in `boundCwd(spaceId, cwd)`. |
| S-L3 vestigial `_scope` | Not closed (carried low) | Still present at `platform/history/service.ts:128` and `:362`. |
| S-L4 `spaces.ready` | Closed | Activation awaits `workspace.persistence.ready`, which is `Promise.all([spaces.ready, …])` (`module.ts:156`, `:351`), before the dispatch and Space choices are created. |
| P-L1 raw UUID in facts | Closed | `spaceFact()` renders `automation.spaceTarget` with the Space name. A minor remainder is new low P-L7. |
| P-L2 empty chooser dead end | Closed | `SpacePicker.tsx:14-19` shows a "New Space" button that opens `SpaceForm` and returns the created ID. Details below. |
| P-L3 board QuickActions undocumented | Closed | `docs/agent-workbench.md:139`. |
| P-L4 `AGENT_BROWSER_TABS` fallback | Closed | The service is now `{sessionOrder}` only (`api.ts:218-222`, `module.ts:236-249`). Details below. |
| P-L5 recurring notifications | Unchanged | Accepted behaviour. |
| P-L6 docs | Closed | `data.md:51` lists `history.json` once. `data.md:96` is updated. `agent-workbench.md:92` and `:122` describe the account-level `index.sqlite` as retired. |

## Regression checks on the new code

### Quick-command cwd refusal path
- `startCwd` is checked after `requireSpace`, which only resolves or opens the chooser. That check comes before `prepareSession`, `reserveManaged`, and any launch.
- So a refusal writes no Session record, reserves nothing, and spawns nothing. `controller.runQuickCommand` then returns early: no `typeWhenReady` and no `lastQuickCommand` write.
- Test proof is `workspace-service-spaces.test.ts:118-119`, using the real `JsonStore` and `SpaceService`. A `/forged` directory is rejected with `DIRECTORY_NOT_AUTHORIZED` and `spawn` is not called. Later in the test, layouts and records hold exactly one tab per Space.

### Prompt-port forwarding of an unbound legacy receipt
- The port only decides whether to forward or reject. It never builds a receipt from `receipt()`.
- A forwarded request goes through `invokeAgent`, which compares `dispatchIdentity` against the recorded request:
  - A different prompt, cwd or files, or a recorded *bound* request (its trailing Space element differs), gives `invocationConflict`.
  - Only an exact match returns `recorded.invocation.receipt`.
- Interactive callers whose ID is already recorded skip the chooser.
- Tests: `prompt-port.test.ts:105-112` and `invocations.test.ts:139-150`.

### "Create Space" from the chooser
- **Cancel:** goes through `SpaceForm` → `lifetime.abort()` and `finish()` with no Space. `discardChoice` drops any pending external directory choice, and nothing is persisted until Save. The existing form test at line 46 covers this.
- **Outer chooser aborted mid-form:** unmounting the form aborts and discards the same way.
- **Keyboard:** the name field autofocuses, Enter submits, and an Enter during IME composition is ignored.
- **Nested dialog:** a nested Radix Dialog gets its own focus scope and Escape layer, so Escape closes only the form.
- **Read-only (`!spaces.canWrite`):** the plain hint is shown.
- **No deadlock:** `requireSpace` holds no lock while it awaits `selectSpace`, so `spaces.create` inside the chooser cannot deadlock.
- **Strings:** en "New Space" / zh "新建空间".
- **Test:** `SpaceForm.dom.test.tsx:99-112` creates a Space by keyboard and checks that the chooser returns the new ID, and that no create action appears when Spaces exist.

### `AGENT_BROWSER_TABS` shrink
- The only remaining reader is `browser/module.ts:116`, which uses `peek(...)?.sessionOrder(pageId) ?? []`. With Agent off, this yields `[]`.
- Browser open, list, close and activate use the shared workspace (`ensureSharedWorkspace` from `main.ts:76-86`, which does not depend on Agent activation). Without it, open is rejected explicitly.
- Covered by `browser/module.test.ts:132` (Agent unavailable) and `:206` (no shared owner).
- No other consumer of the removed methods exists in `src` or the tests.

### Budget attribution against a fresh measurement

| Metric | Fresh | Evidence | Limit (before → now) |
|---|---|---|---|
| startup | 124,889 | 124,889 | 124,928 (not raised by T-14) |
| home activation | 492,871 | 492,871 | 492,544 → **493,568** |
| automations activation | 218,093 | 218,093 | 217,088 → **218,112** |
| main.js | 6,757,322 | — | 6,758,400 (T-10 value) |

- Every per-input "after" value in `T-14-budget-attribution.json` equals a fresh metafile measurement:
  - startup: `shortcut-buttons` 794, `skill-shortcuts` 847
  - home: `i18n` 146,995, `module` 5,687
  - automations: `agent` 1,804, `script` 733, `documents` 1,983, `service` 17,106, `i18n` 20,123
  - shared: `agent-dispatch` 377
- Every "before" value equals my committed-HEAD measurement.
- The HEAD-to-now diff of each closure contains no other T-14 inputs.
- Of the T-14 values in `bundle-budget.json`, only home and automations were raised. The startup, browser and agent limits come from GP-041 and T-10; navigator comes from T-04 and T-06.
- Both new limits are the minimum KiB ceiling.

## New lows (none block)

- **S-L5: quick-command cwd is not checked the way automations check it** (`workspace-service.ts:866-871`).
  - **Vault root:** the call passes `vaultRoot ''`, so the "whole-vault default → Space directory" clause of `spaceBoundCwd` never applies. A saved cwd of `.` or the absolute vault path is refused for any Space other than the vault root. Automations map that same value to the Space directory, and the editor's placeholder still shows the vault path.
  - **No canonicalisation:** the requested path is not run through `canonicalVaultCwd`, while `spaceCwd` is a `realpath`. If the vault is opened through a symlink, a subst drive or a mapped drive, every relative quick-command directory is refused.
  - **Platform:** the platform is inferred as `'linux'` for macOS, which changes case folding.
  - **Mitigating:** both cases fail closed with a localized message, and `docs/agent-workbench.md:64` describes exactly this strict behaviour.
  - **Suggested fix:** have the controller canonicalise like `boundCwd` does and pass the vault root, or have the Lead record the divergence.
- **S-L6: the writer-port collision can make the vitest run flaky.** `writerPort(deviceId, root)` can land on a port already in use, which failed 4 tests in `workspace-service-spaces.test.ts` once in this review. The design dates from T-02, not this ticket. Consider an injectable port or retry in tests.
- **P-L7: automation facts can say "Unavailable Space" when the Space is only unknown.** With the Agent module off, `spaceFact()` shows "Unavailable Space" because the lookup returns `undefined`. `SpaceField` tells these cases apart; `spaceFact` does not. The lookup is also a module-level mutable binding set during render (`AutomationsPage.tsx:78`).
- **Evidence note inaccuracy** (`T-14-budget-attribution.json`): it says the other deltas "are already inside the previous limits". For home, the drift that is not T-14 (+201 B: yaml minifier renaming, `grid.ts`, `markdown-document.ts`) already puts HEAD+drift at 492,591, which is 47 B over the old 492,544. The raise is still justified and minimal; only the sentence is wrong.
- **Chooser hint text:** `agent.spaces.noSpacesHint` ("…You can open a webpage now.") is reused in the business chooser opened from Home, where opening a webpage is irrelevant. This is cosmetic.

## Not verified
- A real Obsidian or CLI end-to-end run of the Home, skill, quick-command and automation flows, including Create Space from the chooser inside a real Obsidian modal stack.
- Business-hook env survival with a real `TerminalSessions.create` with `statusHooks` on (carried from review 105; this is still unit-level only).