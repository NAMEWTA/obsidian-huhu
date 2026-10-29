<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
**T-16 Round 5 re-review**

**Verdicts**
- **Standards: pass.** I found no new problem of medium or higher severity. There are three lows, listed below.
- **Specification: pass.**

I changed no repository files. The probes are in `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t16r5/probe-r5.test.ts`, with results in `out.txt` in the same folder.

**Checks**
- **vitest** on the paths you listed: 80 files, 725 of 725 tests pass, exit 0.
- **tsc** (`tsconfig.test.json`, `--noEmit --skipLibCheck`): exit 0.
- **test:i18n**: passes with 33 dictionaries and 5,081 keys. The new `step-file-changed` and `step-file-missing` strings have both `en` and `zh`.
- **`plan.ts`** has no changes against HEAD. Round 5 is entirely in `import.ts` (`loadProgress`, `resolvePlan`, and the report save on the unchanged path).

**Earlier lows**

| Low | Status | Probe evidence |
|---|---|---|
| S2: missing file in a finished step re-merges changed settings | **Closed** | `core-0` was trusted. Preflight shows the settings file as `unchanged`, with notes `step-file-changed` (`dev-b.json`) and `step-file-missing` (`history.json.backup`). The retry ends `done` with the user's settings bytes intact, the `.backup` not recreated, and `reauthorize` kept. |
| S1: delete one definition and edit another in the same step blocks the retry | **Closed** | No problems in preflight. The retry ends `done`, the edited document is kept, the deleted one stays deleted, both notes appear in the report, and the progress file is cleared. |
| P4c: tampered all-done record saves no report | **Closed** | The forged record naming the user's inbox fails the path-set check, so it is dropped. Preflight and run both refuse with `identity-collision` and no business data changes. That refusal is correct, because the user really has data there. P4a (empty `written`) now runs normally and saves a `done` report. |
| Docs out of date | **Closed** | `docs/data.md` and `docs/agent-workbench.md` now describe both notes and the rule that a step reruns only when all of its files are missing. |
| Digests taken from the first plan, not the locked re-plan | Still open | The code is unchanged. It can only produce a false "changed" label. |
| Torn progress file (P6) | Still open | Unchanged. |

**Your three questions**
- **Can a resume rewrite a changed file or recreate a deleted one?** Not for a trusted step. Its paths are placeholders in the first plan and outside `own` in every locked re-plan. The one exception is the documented "every file of the step is missing" case, covered in new low 1.
- **Can a legit partial import complete without a false "forged" rejection?** Yes in every normal case I probed: S1, S2, U1, R1, and N3 (renaming one of several definitions in a step completes and the original is not recreated). The refusal loop in new low 1 is the only exception I found.
- **Are preflight and run consistent?** Yes. Both go through `resolvePlan`. In N4, preflight and the run report have identical warnings and disabled list (30), and the deleted document shows as `unchanged` in both.

**New lows**
1. **When every file of a finished step is gone, the step reruns.** Through the normal UI this means:
   - **N1:** a 49-document package has a 1-document `defs-1` step. If the user deletes that automation after a partial import, the retry recreates it.
   - **N2:** if the user renames that automation instead (its folder moves), every retry refuses with `definition-collision` for "Doc-9" and the progress file stays. The core data is never imported until the user deletes or renames it back. The refusal is clear about what to fix and nothing is overwritten.

   The docs cover the rerun but not this effect. The path-set check already rejects the P4a and P4c forgeries, so the "all files missing" rule only adds protection against a forged record with exact paths, at the cost of N1 and N2. Possible fix: trust a step whose recorded path set matches the plan exactly, even when all its files are missing.
2. **Notes are duplicated across chained resumes (W2).** A note raised on one resume goes into the saved progress `lists`. If a later step then succeeds, the next resume adds the note again, so the final report shows `step-file-changed` twice. It only affects the label.
3. The digests issue from the earlier list still stands; this round did not change it.