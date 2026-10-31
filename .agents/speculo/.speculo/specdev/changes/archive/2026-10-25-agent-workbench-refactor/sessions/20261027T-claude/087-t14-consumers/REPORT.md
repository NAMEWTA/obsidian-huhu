<!-- Saved by Lead from implementer final reply (Sonnet 5.5) — Round 1; write tool refused for the implementer. -->
Starting with item 1: apply the patch.

<!-- Round 2 (saved by Lead from implementer reply) -->
Round 2 is finished: all four follow-ups are done and the full set passes. The write tool refused `REPORT.md` again, so this reply is the Round 2 report.

## Checks

| Check | Exit | Result |
|---|---|---|
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | 0 | clean |
| `eslint` on touched source files, `--max-warnings 0` | 0 | clean |
| `pnpm test:architecture` | 0 | 1262 modules, no violations |
| `pnpm run test:i18n` | 0 | 4908 keys |
| `vitest run` over agent, automations, home, browser, shared, `test/automations`, `test/golden` (with native binaries) | 0 | 318 files passed, 3 skipped; 2279 tests passed, 41 skipped; the 11 earlier failures are gone |

## Follow-ups

1. **Fixture patch applied** to `automation.test.ts`, `core/precheck.test.ts` and `core/actions/registry.test.ts`.
   - Each file now asserts that an unbound fresh agent action fails with `spaceRequired` (`settingsError` text in `registry.test.ts`).
   - In `precheck.test.ts` the same assertion also proves the precheck and the start are never reached.
   - I ran prettier on `precheck.test.ts`; its HEAD version was clean.
2. **Skill buttons persist a Space.**
   - **Changed source:** `SkillShortcut.destination.fresh` gains `spaceId?` in `model.ts`. `readSkillShortcuts` reads it back, and a blank or non-string value reads as unbound. `SkillList.tsx` gets a Space choice, defaulting to "Ask when pressed" and showing "Unavailable Space" for a stale id. Editing the working directory keeps the saved Space.
   - **No change needed:** `core/pipeline/codec.ts`, `platform/board/sync.ts` and `SkillCard.tsx` already pass `destination` through (sync copies it by spread), so I did not change them. The `SkillCard.tsx` launch is a one-off and still asks each time.
   - **Tests:** a new golden `board-skills-space.md` has a bound button and a legacy one that decodes unchanged. The existing `board-skills.md` golden is untouched. I added a read test and a test that the dispatch carries the saved Space.
3. **`docs/data.md` updated.** `workspace-index.sqlite` is described as the only history index; the account-level `index.sqlite` is no longer written and is safe to delete. I also noted the quick command `spaceId` and removed my earlier "skill buttons ask every time" wording in `docs/agent-workbench.md`.
4. **Dead account branch removed.**
   - **`NativeHistory`:** always uses `workspace-index.sqlite` and sends `scope: 'vault'`.
   - **Signatures:** the old `'account'` scope parameter is now the single literal type `'vault'` instead of being deleted. That keeps `control/history.ts` and the controller's positional arguments compiling without edits outside the set.
   - **`HistoryStore`:** now accepts only `'vault'`.
   - **Tests:** the `history-store.test.ts` fixture encoded the old account default, so I updated it. That test's 11-row paging assertions still apply. The `native-history.test.ts` suite needed no change and still passes.
   - **Native helper:** the Rust helper's `account` scope has no TypeScript caller any more (checked). I left it in place, since the Rust tests still use it.

## Still open

- `docs/privacy.md` line 75 still says history is written to an account-wide `index.sqlite` including out-of-vault session content. It is outside the write set and now wrong; please fix or extend my write set.
- The hook-scope fix (`businessAwareHooks`) is still unverified against a real CLI, and the earlier E2E and Design Conformance items still belong to you.

SOURCE STOPPED

<!-- saved by Lead from implementer reply -->
T-14 is implemented, but 11 existing tests in three files outside my write set now fail until the ready fixture patch is applied. `REPORT.md` was refused by the write tool, so this reply is the report. `main.js` and `styles.css` were not touched.

## Open items for you

1. **11 failing tests in files outside the write set.**
   - **Files:** `src/modules/automations/automation.test.ts`, `core/precheck.test.ts` and `core/actions/registry.test.ts`.
   - **Why:** they start unbound agent actions and expect them to run. That is now a spec-mandated failure, so they need `spaceId: 'space-a'` in their fixtures.
   - **Fix:** the patch is at `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261027T-claude/087-t14-consumers/outside-write-set-fixtures.patch` (apply with `patch -p1` from the repo root).
   - **Check:** with the patch applied temporarily, `vitest run src/modules/automations` passed (15 files, 137 tests). I then restored the three files and confirmed their sha256 is unchanged.
2. **A hook collision I fixed in `controller.ts`.**
   - **Cause:** passing the new managed runtime to `sessions.create` makes it install a second hook scope with the same `HUHU_HOOK_DIR`/`HUHU_HOOK_TOKEN` spool variables. That scope is merged after the automation's own, so the automation would never receive its native answer.
   - **Fix:** `businessAwareHooks` gives runtimes admitted for business runs an empty runtime-hook scope. Other runtimes are unchanged.
   - **Verification:** unit-tested only (`controller-business-admission.test.ts`). It is unverified against a real CLI.
3. **Skill buttons ask for a Space at each delivery and do not save one.** `SkillShortcut.destination` lives in `home/core/board/types/model.ts`, `core/pipeline/codec.ts`, `platform/board/sync.ts`, `SkillCard.tsx` and `SkillList.tsx`, all outside my set. Adding `spaceId?` there plus a select finishes it; the request and identity side already accept it.
4. **`docs/data.md`** (about lines 51 and 143) still describes the account-level `index.sqlite`. It is owned by the T-12 tidy writer and should now say the file is no longer written and can be deleted.
5. **Dead account branch in `platform/history/service.ts`** (the `'account'` default and the `index.sqlite` branch) and the `HistoryStore` `'account'` default are unreachable now. Both are outside my set.

## What was delivered

**Space binding**
- **Dispatch and invocations:**
  - `AGENT_DISPATCH` fresh requests carry `destination.spaceId`, and it is part of `dispatchIdentity`. A different Space under the same invocationId gives `invocationConflict`, in flight and after restart.
  - An old recorded request without a Space is kept as history. A bound retry conflicts with it; it is never rewritten or replayed.
  - `invokeAgent` rejects a fresh request with no Space (`spaceRequired`) before recording anything.
  - The interactive path is `dispatch(req, { signal, interactive })`. With no Space, the existing chooser opens before the invocation exists, and cancelling starts nothing.
- **PromptRunner:**
  - `AgentPromptRequest.spaceId` is required; a missing value fails with `spaceRequired` before any process.
  - An empty `cwd` means the Space directory, not the vault root.
- **Runtime:**
  - Agent and script runs go through a Space gate, then commit the Session record in the Space, then spawn with the reserved runtime and `beforeSpawn`.
  - Error codes are `spaceRequired`, `spaceUnavailable` and `spaceSaveFailed`.
  - A narrower `cwd` must lie inside the Space, or the run fails with `cwdInvalid`.
  - `reuse` requires the same Space as the prior terminal.
- **Automation definitions:**
  - `spaceId` is stored as a frontmatter property, and non-string values are dropped when read.
  - An unbound saved definition fails as a recorded run before the precheck command or any process starts. It is not a throw in `tick`, so there is no silent retry loop.
  - A background run uses the Space frozen in the definition at execution time.
- **Quick commands:**
  - `QuickCommand.spaceId?` is kept for vault scope only; a global command never keeps one.
  - A saved or passed Space is used exactly; a stale one rejects with a readable message.
  - Cancelling the chooser no longer records `lastQuickCommand`. This also fixes an existing bug for terminal-type commands.
- **Home:** agent shortcut buttons keep a saved `spaceId` and dispatch interactively. `AGENT_DIRECTORY` gained `spaces()` instead of a new service key, because `manifest.ts` is outside my set.

**Space-binding UX** (added to existing flows; nothing re-laid-out)
- **Automation editor:** the agent and script Options get a "Space" field, never pre-selected. A deleted or archived id shows as unavailable with an error and blocks saving. The detail page shows the target.
- **Shortcuts config:** an agent button gets a Space choice with "Ask when pressed" as the default.
- **Quick commands:** a per-row Space select in agent settings. This is the only place to bind a quick command, because `QuickCommandEditor.tsx` is outside my set.

**Account-scope index disposition** (carried from T-11): every consumer now uses the vault projection (`workspace-index.sqlite` with `ownedSessions`), and the account-wide `index.sqlite` is no longer written.
- **Rationale:** all consumers only need sessions inside this vault, and a relocated index would still ingest other vaults' sessions, which AC-034 forbids. Stripping titles would break the automation session picker.
- **Rewired:** `listSessions`, `sessionUsage` and the `controller.resume` transcript lookup read the vault projection.
- **L-1 fixed:** the resume title now comes from `workspaceHistoryService().meta()`, the single vault-scope owner.
- **Removed:** `history()`, `historyService` and the dead `recentHistory`/`findHistory`/`refreshHistory`. Nothing constructs an account-scope history owner any more.

**Unchanged by design:**
- **Native answers and cancel:** the native answer, cancel and timeout paths, and `existing` delivery (one paste, no Enter), are untouched and their tests pass.
- **Mobile skills:** `module.test.ts` still asserts that only skills load on mobile.
- **Browser and Shell reads:** no code change was needed; I added a clarification to `docs/browser.md`.

## Changed paths

Source:
- `src/modules/agent/api.ts`, `module.ts`
- `src/modules/agent/services/{agent-runtime,prompt-runner,prompt-port,quick-commands-port,controller}.ts`
- `src/modules/agent/core/terminal/settings.ts`
- `src/modules/agent/ui/settings/QuickCommandsSection.tsx`
- `src/modules/agent/i18n.ts`
- `src/shared/agent-dispatch.ts`, `src/shared/automation/types.ts`
- `src/modules/automations/core/{service,documents}.ts`
- `src/modules/automations/core/actions/{agent,script}.ts`
- `src/modules/automations/ui/actions/{agent,script}.tsx`
- `src/modules/automations/i18n.ts`
- `src/modules/home/module.ts`
- `src/modules/home/services/{shortcut-run,skill-shortcuts,instances}.ts`
- `src/modules/home/core/board/shortcut-buttons.ts`
- `src/modules/home/ui/widgets/ShortcutsConfig.tsx`
- `src/modules/home/i18n.ts`

Docs: `docs/agent-workbench.md` (new "业务入口的 Space 绑定" section), `docs/automation.md`, `docs/browser.md`.

Tests:
- Updated: `prompt-runner`, `prompt-port`, `quick-commands-port`, `agent-runtime`, `controller-space`, `invocations`, `AutomationsPage.dom`, `skill-shortcuts`, `shortcut-buttons` and `test/golden/user-formats.test.ts`.
- New: `agent-runtime-space.test.ts`, `controller-quick-command.test.ts`, `controller-business-admission.test.ts`, `home/services/shortcut-run.test.ts`, and golden snapshots `automations-bound.md` and `space-bindings.json`.
- The legacy `automations.md` golden is unchanged, and an assertion proves old definitions are never given a Space.

## Checks

| Command | Exit | Result |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json --noEmit --skipLibCheck` | 0 | clean |
| `pnpm exec eslint <24 touched source files> --max-warnings 0` | 0 | clean |
| `pnpm test:architecture` | 0 | 1262 modules, no violations |
| `pnpm run test:i18n` | 0 | 4908 keys |
| `pnpm run test:docs` | 1 | only the pre-existing `huhu-bot-architecture/inputs/*` anchor findings |
| `vitest run` over agent, automations, home, browser, shared, `test/automations`, `test/golden` (with native binaries) | 1 | 315 files and 2263 tests passed; the only 11 failures are the three out-of-set files above |

- **Whole-directory eslint:** it reports one parse error in `pi-artifact-profiles.generate.mjs`, which belongs to the bundle-budget implementer.
- **Prettier:** the new test files and the files I reformatted are clean. Many touched files were already non-prettier at HEAD, and I did not reformat those.
- **Not run:** `pnpm run build` (forbidden by COMMON), `test:safety-regressions` (no such script in `package.json`) and cargo (no native change).

## Other risks and gaps

- Whether the managed runtime shows an activity state in the workbench for automation sessions was not exercised. Activity still comes only from the automation `receive` path, as before.
- Real Obsidian, real provider and multi-platform end-to-end runs are not claimed, and the Design Conformance screenshots for the new fields are the user's.

I chose "bind through the existing admission use case" (`prepareSession`, then `reserveManaged`, then spawn), the same pattern as the interactive `admitLegacyLaunch`. No third-party code was copied and no dependency was added.

SOURCE STOPPED

<!-- saved by Lead from implementer reply -->
Round 3 done: I edited two lines in `docs/privacy.md` (docs only). `pnpm run test:docs` reports no `privacy.md` finding.

- **Line 73:** the old text said usage analysis and history use different indexes. It now says usage, the history drawer, the CLI, automation session choice and resume lookup share one index, `workspace-index.sqlite`. That index holds only sessions whose working directory is in this vault or that this vault's HUHU sessions started. The account-level `index.sqlite` is no longer created or written, and an old file can be deleted. Titles from other vaults or unrelated projects do not enter the index.
- **Line 75:** I dropped the "本库/全部" display-filter claim and the statement that titles, prompt text, working directories and usage from out-of-vault sessions are written to `index.sqlite`. It now says:
  - The drawer lists only the current vault's projection, with no account-wide history and no "全部" switch.
  - HUHU enumerates the system and managed account session sources to build the projection, but writes only metadata for sessions owned by this vault into `workspace-index.sqlite`. That metadata is title, prompt text, working directory and usage, with no conversation body.
  - Other vaults' and unrelated out-of-vault sessions are neither written nor shown.
  - Resume requires the working directory to be inside the vault or authorized.
  - The index travels with `.huhu/` on backup or sync. The sentences about reading only session logs and rejecting symlinks are kept.

I found no other account-wide index or out-of-vault ingestion statements in the file.

SOURCE STOPPED

<!-- saved by Lead from implementer reply -->
Round 4 is complete: every item you listed is fixed, and all the required checks pass.

## Checks

| Check | Result |
|---|---|
| `pnpm run test:safety-regressions` | exit 0; "Automation session: concurrent duplicate rejected busy; one terminal launched" prints |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `pnpm run lint` | exit 0 (whole repo, zero warnings) |
| `pnpm test:architecture` | no violations, 1262 modules |
| `pnpm run test:i18n` | 4908 keys, OK |
| Full vitest set (agent, automations, home, browser, shared, `test/automations`, `test/golden`, with `HUHU_TEST_*` binaries) | 319 files passed, 3 skipped; 2291 tests passed, 41 skipped; no failures |
| `pnpm run test:docs` | no finding for the files I touched |

## Mandatory items

- **S-H1:** `scripts/regressions/automation-session.mjs` now binds `spaceId` and gives the host `spaces.cwd` and `spaces.admit`. Both scheduler runs reach the session reservation, and the original single-holder/`busy` assertions are unchanged. There is no `nativeLease` in that fixture; the busy check there is the runtime's own reservation, as before.
- **S-M2/S-M3:**
  - `invokeAgent` now runs the pending and recorded identity lookup first. The `spaceRequired` gate only stops brand-new invocations.
  - `prompt-port` forwards an unbound non-interactive request to the journal when `invocations.receipt(id)` exists. The journal then answers: the original receipt, or a conflict if the content differs. I did this instead of returning the receipt directly so a same-ID request with different content cannot get a wrong receipt.
  - The old test that pinned `spaceRequired` now expects the recorded receipt and no start. New tests cover both layers.
- **S-M1:** `quick-commands-port` maps `ManagedLaunchError` to localized text through `failure.messageKey`. The test uses the real error shape thrown by `legacyManagedResult` (`TARGET_NOT_FOUND` / `archived-space`), and the controller test now uses it too.
- **S-M4:**
  - Quick commands keep their saved cwd; relative paths resolve against the vault. `workspace-service` checks it against the chosen Space with `spaceBoundCwd` before any Session record is written. A directory outside the Space fails with `DIRECTORY_NOT_AUTHORIZED` (`cwd-outside-space`), writes nothing and spawns nothing.
  - I did not reuse the automation code `cwdInvalid` here, because the managed-launch failure shape has no such code.
  - Empty cwd means the Space directory. The sentence saying the field no longer decides the launch location is gone from the docs.
  - One existing test changed. In `workspace-service-spaces.test.ts`, "never write v1" used to pass `cwd: '/forged'` and expect it to be silently ignored; it now expects an explicit refusal, and the new test covers that case.

## Lows

- **S-L1:** business runtimes call `invalidateActivity('unsupported')`. The managed snapshot then reports `source.health: 'unavailable'` with that reason (tested on a real `TerminalSession`), so `wait` returns "unavailable" instead of hanging on no source.
- **S-L2:** a new `AgentRuntimePort.boundCwd` is public on the runtime and wired in `module.ts`. The service uses it so the precheck runs in the Space-bound directory. If the binding is unusable, the run fails before the precheck.
- **S-L4:** `controller.prepare()` awaits `spaces.ready`, tolerating a failed load so it cannot break preparation. Dispatch calls `prepare()` before `has()`.
- **P-L1:** the detail rows show "Space: Name" via `automation.spaceTarget`, and "unavailable" if the Space is gone or the agent module is off. The detail component (`AutomationDetail.tsx`) is outside my write set and calls `facts(action)` without the host. So `AutomationsPage` hands the list to a small module-level lookup, `bindSpaceLookup`, in `ui/actions/agent.tsx`. The cleaner fix is to pass the host into `facts` from `AutomationDetail`.
- **P-L2:** the empty chooser (`SpaceChoices`) now offers "Create Space" using the existing `SpaceForm`. The new Space is returned as the choice and the launch continues in it. `pickSpace` takes the `SpaceService` from `module.ts`. The docs claim "无 Space 时先创建" is now true.
- **P-L3:** board QuickActions of agent type always ask; this is now documented.
- **P-L6:** fixed in docs:
  - the duplicated `history.json` in `docs/data.md`
  - the stale "后续功能完成" line in `docs/data.md`
  - the retired account index paragraph at `agent-workbench.md` line 122

## P-L4 caller enumeration (route-shrink evidence)

The scan covers `src` and `test`: every reference to `AGENT_BROWSER_TABS`, plus the browser module's `workspace.*` calls.

| | Before | After |
|---|---|---|
| `browser/module.ts`, non-shared fallback | `acquire(AGENT_BROWSER_TABS).open`, `peek(...).list`, `.close`, `.activate` | none; `open` rejects with `browser_agent_unavailable`, `list` returns `[]`, `close` and `activate` do nothing |
| `browser/module.ts`, `sessionOrder` | `peek(AGENT_BROWSER_TABS)?.sessionOrder(pageId)` | unchanged (the only live consumer) |
| `agent/api.ts` `AgentBrowserTabs` | `sessionOrder`, `open`, `close`, `list`, `activate` | `sessionOrder` only |
| `agent/module.ts` provider | implemented all five | `sessionOrder` only |

Production always supplies `ensureSharedWorkspace`, so the fallback was unreachable.

- **Remaining references after the change:** the type and key in `api.ts`, the provider in `agent/module.ts`, the `sessionOrder` consumer in `browser/module.ts`, and the `provides` entry in `manifest.ts`.
- **Test:** a new browser test asserts the shared-workspace-less workspace rejects and never reaches the Agent module.

Other call sites from Round 1 for the report: `AGENT_PROMPT_RUNNER` and `AGENT_DISPATCH` have no in-repo callers beyond Home (shortcut and skill dispatch) and the module wrappers; the `recentHistory` family had zero callers and was deleted.

## Open

- `_scope: 'vault'` parameters in `platform/history/service.ts` and `HistoryStore` are still kept only for positional compatibility (S-L3).
- Real-CLI end-to-end for the hook-scope fix and for the new precheck directory is still the user's. Not claimed.
- Files touched this round: the three named in the write set (`scripts/regressions/automation-session.mjs`, `docs/privacy.md` from Round 3, `src/modules/browser/module.ts`), plus others in the earlier set, mainly `workspace-service.ts`, `controller.ts`, `agent-runtime.ts`, `module.ts`, `SpacePicker.tsx`, `agent.tsx`, `AutomationsPage.tsx`, `service.ts` and the docs.

SOURCE STOPPED

<!-- saved by Lead from implementer reply -->
Round 5 is done: the startup bundle is back under its limit without raising `eagerBytes`, and the home and automations activation ceilings are raised by the minimum amount. `node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce` exits 0.

## Bundle numbers

| Budget | Before | After | Limit |
|---|---|---|---|
| startup-evaluated | 125,026 | 124,889 | 124,928, unchanged |
| home activation | 492,909 | 492,871 | 492,544 → 493,568 (minimum 1 KiB ceiling) |
| automations activation | 218,868 | 218,093 | 217,088 → 218,112 (minimum 1 KiB ceiling) |

## What changed

**1. Startup.** The Space-id parsing stays in the two eager board parsers but is now shared.
- `shortcut-buttons.ts` exports `isStr`, `text` and `spaceField`.
- `skill-shortcuts.ts` uses `isStr` in place of its repeated `typeof … !== 'string'` checks, and a small `str` helper for the optional string fields.
- The per-file numbers are 727→794 for `shortcut-buttons.ts` and 942→847 for `skill-shortcuts.ts`.
- Behavior is unchanged: the home and golden tests pass, including the legacy fixtures.

**2. Activation, avoidable growth trimmed first.**
- **Dropped:** the unused `automation.spacePlaceholder` string, and the duplicate run-start `spaceRequired` guards in the agent and script actions. The service and the runtime already guard those cases.
- **Merged:** the two identical Space decode wrappers into one shared `withSpaceDecode`.
- **Shortened:** the en and zh Space strings in the automations dictionary and `shortcuts.space.unavailable` in the home dictionary. I removed the "never chosen for you" sentence from `automation.spaceHelp`.
- **Not trimmed:** `bindSpaceLookup` is in the page-lazy automations UI, so it does not count toward activation. I did not pull the Space chooser or `SpaceForm` into module activation; they stay lazy.

**3. Budgets.**
- Only `moduleActivationBytes.home` (493,568) and `.automations` (218,112) were raised, and `moduleActivationBudgetReason` was extended with the T-14 attribution.
- Home's remaining T-14 growth is `i18n.ts` +232 and `module.ts` +48, for a measured 492,871.
- Automations' remaining T-14 growth is `service.ts` +443, `actions/agent.ts` +218, `actions/script.ts` +72, `agent-dispatch.ts` +62, `documents.ts` +10 and `i18n.ts` +1017, for a measured 218,093.
- The per-input attribution is in `CHG/evidence/T-14-budget-attribution.json`, written from the production metafile. The baseline is a clean `git archive HEAD` build in scratch space, not a git worktree. The `shortcut-buttons.ts` and `skill-shortcuts.ts` "before" values (727, 942) are the Lead-reported HEAD sizes. My baseline build of the eager set picked up the current files, so I did not trust its numbers for those two.

## Checks

| Check | Result |
|---|---|
| `check-bundle … --enforce` | exit 0, "within limits" |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `pnpm run lint` | exit 0 |
| `pnpm run test:i18n` | 4907 keys (was 4908; one unused key removed) |
| `pnpm test:architecture` | no violations |
| vitest on home, automations, shared, `test/golden` | 138 files, 982 tests, all passed |

I did not rerun the agent and browser suites this round, because only automations, home and the bundle budget files changed.

SOURCE STOPPED