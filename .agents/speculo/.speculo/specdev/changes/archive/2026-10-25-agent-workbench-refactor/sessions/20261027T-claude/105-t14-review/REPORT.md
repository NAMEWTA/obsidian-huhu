<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
# T-14 review: consumer compatibility and legacy Space binding (read-only)

**Verdicts: standards = request-changes; specification = request-changes.** The most serious problem is that a required ticket check fails: `pnpm run test:safety-regressions` exits non-zero at `automation-session`, and the three regressions after it never run. The Space binding itself is mostly right. Two medium spec misses remain: a legacy invocation retried with the same ID gets `spaceRequired` instead of its recorded receipt, and quick commands silently ignore their saved working directory. On the standards side, a Home quick button bound to an archived Space shows a raw error code because the test mocks an error the real path never throws.

## What I checked

- **Frozen scope:** `sha256sum -c SCOPE.sha256` reported all 60 files OK.
- **vitest:** the requested set (agent, automations, home, shared, `test/automations`, `test/golden`, with the native binaries) passed. 291 test files passed and 2 were skipped; 2171 tests passed and 40 were skipped. Exit 0.
- **tsc** (`tsconfig.test.json --noEmit --skipLibCheck`): exit 0.
- **`pnpm run lint`:** exit 0.
- **`pnpm run test:i18n`:** passed (4908 keys).
- **`pnpm test:architecture`:** passed (1262 modules).
- **`pnpm run test:safety-regressions`** (a required command in the ticket's verification table): **failed**. Details under specification finding S-H1.
  - I then ran the three skipped regressions (`dashboard-conflict`, `issue-content-targets`, `issue-conflict-revisions`) one at a time. All three exit 0.
- I made no repository writes and ran no build. Logs are in `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t14/`.

## Standards axis: request-changes

### Your question about `businessAwareHooks` (`controller.ts:111-118`, used at `:207`)

- **It does prevent the duplicate hook scope.**
  - `admitBusiness` (`controller.ts:986-1020`) adds the reserved runtime ID to `businessRuntimes` before `sessions.create`.
  - `TerminalSessions.create` calls `prepareRuntimeHooks` once, synchronously within create, before spawn (`sessions.ts:558-576`).
  - For a business runtime that call returns `{env:{}}`, so the automation runtime's own spool variables (`request.env` ← `hook.env`, `agent-runtime.ts:651-657`) are not overwritten.
  - The ID is removed in `created`/`abandon`. That is safe, because hooks are never prepared again for the same runtime ID; a resume gets a new runtime ID.
  - Interactive runtimes are never in the set, so they keep the managed hooks.
- **The native answer is preserved.** The answer still arrives through `TerminalAutomationRuntime.receive` and its `last_assistant_message`/`nativeAnswerMissing` semantics. The prompt-runner tests "complete native answer…" and "native failure never returns terminal output" still pass.
- **Status has a gap (see S-L1).**
  - A business runtime now appears in the sidebar as a Space Session, but no managed activity source is ever bound to it, so the managed activity snapshot stays without sources.
  - Workbench pending/approval detection and CLI `wait` on that runtime cannot observe it; only the legacy `setActivity` field updates.
  - This is not a regression compared with before T-14, when business runs were not managed at all.
  - Test proof is unit-level only (`controller-business-admission.test.ts:8`). No test runs a real `TerminalSessions.create` with `statusHooks` on to show the automation hook env survives. The implementer also says this was never checked against a real CLI.

### S-M1 (Medium): a quick button bound to a gone Space shows a raw error code

- **Where:** `quick-commands-port.ts:27-31`, `workspace-service.ts:1824-1830` and `:845`, `controller-quick-command.test.ts:64-70`.
- **Scenario:**
  1. A Home "quick" button runs a vault quick command saved against an archived Space.
  2. `newTerminal`/`newAgent` reach `createManagedWithContext`. Its `try` catches the `SpaceError` from `requireSpace` and returns `{status:'failed'}`.
  3. `legacyManagedResult` then throws `ManagedLaunchError`, whose message is `TARGET_NOT_FOUND:archived-space`.
  4. The port only translates `SpaceError`, so its mapping never applies. `shortcut-run.ts:101` shows `errorText(error)` and the user sees the raw code.
- **Test proof:** the controller test mocks `newTerminal` rejecting with a `SpaceError`, which the real path never does, so the test proves the wrong thing.
- **Fix condition:** the port also maps `ManagedLaunchError` (for example through `failure.messageKey` / `spaceErrorMessage`). Add a test using the real `legacyManagedResult` error shape that asserts a localized sentence.

### S-M2 (Medium): a test pins the wrong legacy-receipt behavior

- **Where:** `invocations.test.ts:138-147` asserts `await f.service.invokeAgent(legacy)` → `{errorCode:'spaceRequired'}`.
- **Problem:** this hard-codes the contract violation described in S-M3 below. It also contradicts the T-14 preflight, item 4: "精确重复旧历史请求应先复用已记 receipt，不能被'所有旧请求缺 Space 都拒绝'的新准入提前截断".
- **Fix condition:** fix the test together with S-M3.

### Lows (standards)

- **S-L1:** business runtimes have no managed activity source (described above). Either bridge the automation hook events into the bound activity runtime, or invalidate business-runtime activity with an explicit reason so the UI and CLI report "unavailable" rather than an open, source-less state. Needs a Lead decision.
- **S-L2:** precheck still runs in the raw `d.action.cwd` (`service.ts:~497`), not the Space-bound directory. For an external-directory Space bound with the vault-root cwd, the precheck runs at the vault root while the action runs in the Space directory.
- **S-L3:** the `_scope: 'vault' = 'vault'` parameters (`platform/history/service.ts:128` and `:362`) are kept only to preserve positional arguments. They are vestigial; record them for later shrinking.
- **S-L4:** `spaceChoices()` and `has()` read `spaces.list()` synchronously, and `prepare()` does not await `spaces.ready`. A dispatch before the Space store has loaded could be falsely rejected with `spaceUnavailable`. I believe activation awaits `persistence.ready` first, but this is unproven.

## Specification axis: request-changes

### S-H1 (High): the required safety regression fails and the race it guards is no longer exercised

- **Where:** `scripts/regressions/automation-session.mjs:44-63`, `:121-146`.
- **Observed:** both definitions are unbound `specific`-session agent actions. They now finish `failed/spaceRequired` before any session is prepared. The script throws "scheduler finished before preparing a session" and the runner exits non-zero (`run-safety-regressions.mjs` breaks on the first failure).
- **Consequences:**
  - The cross-automation native-session race regression (the T-12 lease semantics T-14 was told to keep) no longer runs at all.
  - The ticket rule "不以删测试消除失败" is effectively breached.
  - The implementer's reported check table omits this command.
- **Constraint:** `scripts/regressions/**` is outside T-14's write set.
- **Fix condition:** the Lead extends the write set. The fixture then binds a `spaceId` and gives its host `spaces.cwd/admit`, so both runs reach the lease and the original single-holder/`busy` assertion still holds. `pnpm run test:safety-regressions` must exit 0.

### S-M3 (Medium): a legacy same-ID retry no longer returns its original receipt

- **Where:** `automations/core/service.ts:336-338` (the `spaceRequired` reject runs before the pending/recorded lookup at `:347-353`) and `prompt-port.ts:33-34`.
- **Scenario:**
  1. An invocation accepted before T-14 is recorded without a Space.
  2. An exact retry with the same request returns `rejected/spaceRequired` instead of the recorded receipt.
- **Contract:** this breaks §3.10 ("invocation 去重保证仍保持"), §6 ("原 invocationId 同请求仍返回原 receipt"), and the preflight item 4 quoted under S-M2. Nothing is replayed, which is correct, but the caller gets a false "configure a Space" answer for a delivery that may already have started.
- **Practical exposure:** low, because Home generates `randomUUID` per press. The contract miss is still explicit.
- **Fix condition:**
  - In `invokeAgent`, run the pending/recorded identity lookup before the `spaceRequired` gate. That gate should only stop new invocations.
  - In `prompt-port`, check `invocations.receipt(invocationId)` for a non-interactive unbound fresh request before rejecting.
  - Update the test to expect `toEqual(originalReceipt)` and no start.

### S-M4 (Medium): quick commands silently drop their saved working directory

- **Where:** `controller.ts:1142` computes `cwd` and passes it to `workspace.newAgent/newTerminal`. With Spaces present, `createManagedWithContext` ignores it (`workspace-service.ts:1751-1762`, `1786-1797`, `857-862`) and always uses `admission.cwd`.
- **Inconsistency:**
  - `QuickCommandEditor.tsx:120-124` still shows and saves the "working directory" field.
  - Automation and prompt runs do honor a narrower directory inside the Space (`spaceBoundCwd`).
  - `docs/agent-workbench.md` documents that the field "不再决定启动位置", but the ticket says "保留原语义" and AC-044 says "原服务消费者可用".
- **Fix condition:** either
  - apply `spaceBoundCwd` semantics to quick commands (a narrower directory inside the Space is honored, anything else is rejected), or
  - have the Lead record an accepted behavior change, then remove the dead `cwd` computation and mark the editor field as inactive.

  If the Lead accepts the documented change, this drops to Low.

### Confirmed acceptable against the spec

- **Legacy entries bind an explicit Space:**
  - Home buttons (`shortcut-run.ts:83-88`), skill buttons, quick commands, `PromptRunner` (`prompt-runner.ts:72-74`), the `AgentDispatch` fresh path, and automation agent/script actions all bind an explicit Space.
  - Interactive entries use the PAGE-001 chooser before the invocation exists. Cancel returns `cancelled` with no invoke, no recorded run and no `lastQuickCommand` write.
  - A background run with no binding fails `spaceRequired` and is recorded and notified before any precheck.
  - An archived, deleted or unauthorized Space gives `spaceUnavailable` or `cwdInvalid`, with no substitution.
  - Nothing is inferred from cwd, UI focus or the Space count.
- **Freezing and conflicts:**
  - `dispatchIdentity` appends the Space as a trailing element, so old identities keep their element positions.
  - The Space is frozen at acceptance.
  - Re-using an invocation ID with a different Space conflicts both in flight and after restart.
  - Page unload after acceptance neither cancels nor replays the run.
- **Codecs and golden samples:** the automation agent/script frontmatter `spaceId`, quick-command `spaceId` (dropped for global commands), and shortcut-button and skill destination `spaceId` all round-trip. New golden samples (`automations-bound.md`, `board-skills-space.md`, `space-bindings.json`) were added and the legacy fixtures are untouched.
- **AC-043:** the native full answer path and `nativeAnswerMissing` are unchanged, and screen text is never used as the answer.
- **AC-045:** `module.test.ts` still asserts that mobile does not evaluate the controller or the external-directory reader. Both the architecture check and that test pass.
- **AC-034 (account-scope index):**
  - The account-scope `index.sqlite` is no longer written.
  - `listSessions`, `sessionUsage`, `transcriptFor` and resume all use the vault projection.
  - `historyStore === workspaceHistoryStore`, which resolves review-096 L-1.
  - `recentHistory/findHistory/refreshHistory` are removed.
  - `docs/privacy.md` and `docs/data.md` are updated accordingly.

### Lows (specification and docs)

- **P-L1:** the automation facts rows show the raw Space UUID (`agent.tsx:207-215`, `script.tsx:82-86`) instead of the Space name. The `automation.spaceTarget` key ("Space: {name}") is defined but unused. The ticket asks for target identity display.
- **P-L2:** with zero Spaces, the chooser is a dead-end hint ("先新建或选择空间") with no create action. Spec §3.10 says "无 Space 时先创建", and the preflight item 1 flagged this as T-14 work. `docs/agent-workbench.md` (the binding-rules bullet) repeats "无 Space 时先创建" as if a creation path exists.
- **P-L3:** board QuickActions of agent type (`board-store.ts:480-489`) have no binding field, so they always open the chooser. This is allowed, but the docs don't mention it.
- **P-L4:** the old route shrink is not evidenced.
  - The `AGENT_BROWSER_TABS` fallback `open/list/close/activate` in `browser/module.ts:101-114` is unreachable in production because `main.ts` always provides `ensureSharedWorkspace`. `sessionOrder` remains a live consumer.
  - The implementer's Round-1 report with the caller enumeration and before/after observations was lost (`REPORT.md` contains one line). The "old route call sites = 0" claim therefore has no artifact beyond the preflight.
  - `browser/module.ts` is outside T-14's write set, so this needs a Lead disposition.
- **P-L5:** an unbound legacy recurring definition fails and notifies on every occurrence. This is acceptable ("拒绝"), but a frequent cron could produce a lot of notifications.
- **P-L6 (docs):**
  - `docs/data.md:51` lists `history.json`（标注） twice.
  - `docs/data.md:96` still says "其他业务入口的完整空间适配仍由后续功能完成", which is stale after T-14.
  - `docs/agent-workbench.md:122` describes the account-scope `index.sqlite` as an existing independent file. It is now retired.
- **UI:** the changes only add fields (Choice/Select or SearchChoice in `ShortcutsConfig`, `SkillList`, `QuickCommandsSection` and the automation Options) with no relayout. en/zh strings are present, and the i18n check passes.

## Fixes required before a pass

1. Repair the `automation-session` safety regression (needs a write-set extension) and get `test:safety-regressions` to exit 0. (S-H1)
2. Return the original receipt for a legacy same-ID retry, and fix the test that asserts the opposite. (S-M2, S-M3)
3. Map `ManagedLaunchError` to a localized message for Home quick commands, with a test using the real error shape. (S-M1)
4. Either honor quick-command `cwd` inside the Space, or have the Lead record the change and remove the dead code. (S-M4)

The Low items can be handled separately.