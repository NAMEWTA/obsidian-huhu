<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
**T-16 Round 4/4b re-review**

**Verdicts:**
- **Standards: pass.** N1 is closed. I found no new medium-or-higher problem. Two new lows are worth fixing.
- **Specification: pass.**

I changed no repository files. Everything I wrote is in `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t16r3/`. The probes are in `probe-r4.test.ts` there, with results in `out.txt`.

**Checks**

| Check | Result |
|---|---|
| vitest on the requested paths | 91 files, 788/788 pass, exit 0 |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `pnpm run test:i18n` | exit 0 (33 dictionaries, 5,080 keys); `step-file-changed` has both en and zh |
| eslint, zero warnings, on the backup, automations core and sync core files | exit 0 (eslint is configured to skip `test/agent-backup`) |
| `check-bundle --enforce` on the full worktree | **1 over**: `main.js` is 6,878,873 B against 6,863,872 B (+15,001 B) |

The bundle overage comes from T-17's concurrent edits, not T-16. I rebuilt in an isolated copy made of HEAD plus only the T-16 files from the worktree:
- **T-16 alone:** `main.js` is 6,863,366 B, within limits, with 506 B to spare. That is +956 B over the Round 3 figure.
- **Startup and activation**, unchanged between the T-16-only and full builds except agent: startup 125,867 B, automations 220,121 B (limit 220,160), notifications 21,285 B.
- **Agent activation:** 1,363,365 B for T-16 alone, 1,368,555 B with T-17 (limit 1,370,112). The extra 5,190 B is T-17's.
- **Biggest changed inputs in the full build that aren't T-16:** `controller.ts`, agent `i18n.ts`, `binary.ts`/`binary-cli.ts`, `lazy/native.ts`, the control skill and the skills ops files.

The new limit of 6,863,872 B is the smallest whole-KiB ceiling for both the implementer's 6,863,706 B and my 6,863,366 B, so it is justified. The reason text says honestly that its own measurement included T-17 edits. Round 3's stale wording is fixed: the 711 B automations activation growth is now stated, and the codec location now reads `core/documents.ts`.

**N1: closed**
- **probe-r1** (130 documents, failing in `defs-1`, then restart and resume): the partial report, preflight, returned report and saved `last.json` all show 65 disabled automations. Warnings include `automations-disabled` with count 65 and `directory-reauthorize`.
- **probe-r2** (several core steps): the final report is `done` with `reauthorize: [External]`.
- The new regression test in `failure.test.ts` covers the same case.

**Earlier lows**

| Low | Status | Evidence |
|---|---|---|
| Unused `written` digests / P5 | Closed | A deleted document now shows in preflight as `create`, and the resume restores it. A changed file gets a `step-file-changed` warning and its bytes stay as the user left them. |
| Target device not in the key | Closed | `optionsKey` now includes the device, and a test covers it. |
| Stale `partial` after an unchanged retry | Closed | Probe U1: the saved report is `done` and keeps the earlier lists. |
| Torn progress file (P6) | Still open, low, unchanged | It falls back to content comparison, so a committed document the user edited becomes a `definition-collision` refusal. |
| Tampered "all done" record (P4a) | **Partly closed** | Forged digests for missing files now rerun. Two variants still don't: an empty `written`, or `written` naming a file that exists (P4c). Both return `done` with 0 files changed, nothing restored, and **no report saved**. The loop that skips every step reaches `return` without calling `saveReport`. User data stays byte-identical, and this needs a hand-edited progress file. |

**New lows**

1. **A changed file is rewritten when another file in its step is missing (settings only).** This answers your "can a missing finished-step file overwrite user data?" question. `loadProgress` drops the whole step when any one of its files is missing, which removes the protection for the step's files that still exist. In probe S2:
   - `core-0` finished, then the user changed `fontSize`/`fontFamily` in `.huhu/config/devices/dev-b.json`, then `history.json.backup` was deleted.
   - The retry re-merged settings and **silently reverted the user's edit** to the package values. It gave no `step-file-changed` warning; preflight did list the settings action as "merge".
   - The old bytes survive only in `.huhu/recovery/transaction/<id>/old-0.txt`.
   - This contradicts the `loadProgress` comment ("never written over"). Core files only go missing by manual deletion, which is why it stays low.
   - Every other section in a dropped step refuses instead of overwriting (`identity-collision` or `definition-collision`), so nothing else is overwritten.
   - **Fix:** keep the step's existing files settled, re-plan only the missing paths, and still emit the change note.
2. **Deleting one imported automation and editing another in the same step blocks the retry.** This is the same root cause, reachable through the normal UI. In probe S1, deleting one imported definition and editing another in the same 48-document step makes the whole step rerun. The result is a `definition-collision` refusal; the edited document is kept and nothing is written. This partly brings back the old M1 problem, and the deleted automation would be re-created. The same fix covers it.
3. **Docs are slightly out of date.** `docs/data.md` line 132 and `docs/agent-workbench.md` line 171 promise that changing files a finished step wrote never blocks a retry. They don't mention that a missing file makes the step rerun, or the `step-file-changed` warning.
4. **Digests are taken from the first plan, not the locked one.** `written` digests come from the plan computed before the lock, not from what the locked re-plan actually wrote. If settings or records change between the two, a later resume shows a false `step-file-changed` warning. This affects the label only.

**Your other two questions**
- **A changed file in a step that is still trusted** is never rewritten. It is skipped in the first plan and left out of every other step's locked re-plan. Probes W1 and P2 and the new test agree.
- **A missing file in a finished step** reruns the step. That cannot overwrite user data in any section except settings (new low 1).

None of the lows block the review.