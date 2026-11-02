<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
# T-18 review: platform acceptance (AC-061, AC-063)

**Standards: request-changes. Specification: request-changes.**

Two medium findings block standards, and three block specification. The CI matrix, the release tests, the harness fixes, the budget arithmetic and the "never claims a real-machine pass" discipline are all sound. The blockers are:

- The F-1 fix is incomplete for some controls below 600px.
- The AC matrix still reports F-1 as open and was not re-run after the fix.
- One step in the manual checklist describes a CLI flag and a size limit that `agent prompt` does not have.

I changed no repository files. My scratch files are under `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t18/`.

## Checks I ran

| Check | Result |
|---|---|
| `sha256sum -c 121-t18-review/SCOPE.sha256` | All 16 files OK |
| `vitest run test/release …/ports.test.ts …/writer-owner.test.ts` | 10 files, 41 tests passed |
| `pnpm run test:styles` | Passed: `styles.css` matches its 23 sources (1,423,502 B) |
| `pnpm run lint:css` | No new violations |
| `check-bundle --enforce` | Within limits |
| `pnpm run test:ui-styles` | Passed |
| `pnpm run test:docs` | Fails only on the six anchors in `huhu-bot-architecture/inputs/…` (outside scope); the docs T-18 added have no failures |
| `agent-workbench-coordination.mjs` | **Could not run.** Chrome refuses to start because its singleton socket path inside the required scratch directory is too long. |
| Headless Chrome probe of the real `styles.css` at 480px and 900px workspace width | See S-1 |

For the probe I loaded the real `styles.css` into a small page that copies the class and attribute markup of the toolbar, tab strip, Quick Commands, pane header and tab-close controls. It is not the production React tree; the coordination harness still needs a re-run (P-1).

## Standards axis

**S-1 (medium): the F-1 fix covers the toolbar, but two other controls stay at 32px below 600px.**

- **The toolbar fix is correct.** The shared rule `.huhu-ui :is(button, input:not([type…]), …):not([data-hit-control])` has specificity (0,3,1). The new rule `.huhu-ui.huhu-ui .huhu-workspace-toolbar button` also has (0,3,1). The two tie, and the agent rule wins because it comes later (line 21856 against line 94).
  - The probe measured the toolbar button, the pane-header close and tab-close at 44×44 at 480px. At 900px they stay at 32×32 and the background count stays visible, so there are no side effects at other widths.
- **Tailwind utilities override the agent rule.** In `styles.css` they compile to `.x:is(.huhu-ui, .huhu-ui *):not(#\#)`, which has ID-level specificity. Two controls lose to them:
  - The pane title / focus button in `TerminalTabView.tsx` (`className="min-h-8 min-w-0 …"`) is 32px tall at 480px.
  - The tab-strip scroll buttons in `TabStrip.tsx` (`min-h-8 min-w-8`) are 32×32 at 480px.
- **DESIGN requires 44px.** DESIGN line 93 says "可点击目标桌面至少 32px，窄屏至少 44px".
- **The harnesses do not catch this.** The coordination harness measures only the control dialog and the toggle. The panels harness measures only header height and close buttons.
- **Fix options:** drop or condition those utilities (for example, a container variant), or add explicit selectors that outrank them. Then add these controls to the narrow-geometry check.

**S-2 (medium): checklist scenario M-12 in `docs/agent-workbench-acceptance.md` is wrong.**

- It tells the user to use "`agent prompt --stdin` 风格的长正文" and expects "正文 16 KiB 以内通过，超出被明确拒绝".
- In `native/pty-server/src/control/cli.rs`, `--stdin` is accepted only for `message.send`.
- The `agent.prompt` schema allows `text` up to 262,144 characters, bounded in practice by `requestBytes` 32,768.
- The 16 KiB limit (`messageBodyBytes` 16,384) belongs to `message send`.
- A user following M-12 would either hit an argument error or see a 20 KiB prompt accepted, and would record a false failure.
- **Fix:** point M-12 at `huhu --json message send --to-session … --stdin`, or describe the real `agent prompt` limit.

**Lows**

- The new `agent.css` comment says the shared rule is "(0,3,0)" and that the fix "outranks" it. In fact both are (0,3,1) and the fix wins only because it comes later in the file. Correct the comment. Otherwise a future reorder of the style sources would silently bring F-1 back, and only the Chrome harness would notice.
- The `banner` proxy added to the harnesses returns a throwing function for every property. Function calls fail loudly, as intended, but non-function reads such as `path.sep` would quietly return a function. That is acceptable for these fixtures, but it is not "fails loudly" for every use.
- The `stylesBudgetReason` credits the 1,423,502 B measurement entirely to F-1. The regenerated `styles.css` also includes the `.border-destructive/50` utility (about 250 B), which was missing before. The ceiling arithmetic is correct: 1,424,384 is the smallest KiB ceiling. The attribution should mention both.
- `controller-managed-runtimes.test.ts` still uses hashed writer ports. The implementer already listed this as a residual.
- The `ports.test.ts` and `writer-owner.test.ts` changes are fine. They use `freeWriterPorts()`, the production hash default is still pinned by the `writerPort('device', …) === 17249` assertions, and no check was weakened.
- The `terminal-reliability.mjs` guard is correct and placed before launch. It still uses the Space-less `newShell('cmd')` and has not been re-verified on Windows; the docs say so.
- `platform-acceptance.test.ts` is meaningful but shallow. It checks that the CI matrix is self-consistent, that the checklist covers each runner, target and asset name, that every result reads "待填", and that M-01 to M-17 are present with four cells each. The per-row `cargo test` and `verify-pty-helper` steps are covered separately by `cli-assets-workflow.test.ts`. Its test that rejects pass claims is loose but adequate.

## Specification axis

**P-1 (medium): AC-061 has no closing evidence.**

- `T-18-ac-matrix.md`, which is inside the frozen scope, still says:
  - "AC-061 open-finding F-1";
  - coordination harness 13 of 14 passed;
  - `test:styles` failing;
  - the old `main.js` and `styles.css` digests.
- Nothing records a re-run of the coordination or panels harness on the regenerated `styles.css`. The panels harness needs the new `HUHU_PANELS_STYLES_SHA256`.
- Together with S-1, AC-061 (and the DESIGN §5 narrow-target rule it is audited against) cannot move to passed-code yet. Required:
  - fix S-1;
  - re-run the coordination and panels harnesses on the current input;
  - update the matrix summary, the frozen digests and the page-audit rows.

**P-2 (medium): the DESIGN conformance audit has gaps that are not recorded.**

- The audit says narrow-width target size fails only on F-1, but S-1 shows two more controls.
- The audit also says "状态带文字标签" is covered. In the sidebar (`sidebar` StatusDot) and the pane header, idle, done, failed and interrupted are plain dots that differ only in colour.
  - The visible text comes from the status bucket headings under the default "status" grouping, plus tooltip and `aria-label` text.
  - With grouping set to "agent" or "none", the visible distinction is colour alone.
  - This predates T-18, but AC-061 says "状态非仅颜色" and T-18 owns the full proof. It should be recorded as a deviation or fixed.
- The T-12 deviation (inline continue confirmation, where DESIGN line 66 asks for a confirmation dialog) is recorded but marked "待 Lead 判断". The ticket says design drift goes back to P, so this needs a decision before closure.

**AC-063: passes at code level.**

- The five rows in `terminal-build.yml` match the checklist exactly: runners, target triples, `huhu-pty-*` and `huhu-*` asset names, and the `.exe` suffix.
- Per-row `cargo test --locked`, the release build and `verify-pty-helper.mjs` (helper plus CLI) are present.
- The step-0 commands match how `verify-pty-helper.mjs` takes its arguments.
- Every platform result reads "待填". `T-18-manual-checklists.md` labels four platforms "仅 CI 配置核对；未运行" and Linux x64 as local checks only.
- Nothing claims a real-machine pass, which follows Spec §11.
- Low: the matrix marks AC-063 as `passed-code`, while the spec says the AC itself needs real end-to-end results on every platform. Wording such as "code deliverables complete; AC pending user E2E" would read more safely. The "AC-063 说明" section already explains this.
- Low: the per-OS code paths are only implied. The checklist does not point to `src/host/desktop/native/binary.ts`, `control/unix.rs` or `control/windows.rs` for each platform.

**AC matrix spot-check**

- All cited paths exist; I re-checked every one.
- I sampled 16 ACs: 001, 003, 004, 006, 007, 011, 012, 020, 022, 026, 029, 031, 053, 057, 059 and 063.
  - **Real tests that cover the AC:**
    - AC-001: `space-service.test.ts`, distinct identities.
    - AC-003: `directories.test.ts`, realpath escape and replacement revalidation.
    - AC-004: `control-native.test.ts`, `TARGET_REQUIRED`.
    - AC-006: `control-native` background create, plus `router-foreground.dom`.
    - AC-011: `commands.test.ts`, explicit B while A is selected, result keeps `spaceId` B; plus the `session list --space` run in `control-skill`.
    - AC-012: `router.test.ts` stale runtime and wrong Space, plus `control.rs`.
    - AC-026: `workspace-service-native.test.ts`, a real PTY detach and reattach.
    - AC-029: old helper events cannot change a new runtime.
    - AC-053: `writer-process.test.ts`.
    - AC-057: `browser/module.test.ts`.
    - AC-059: `lazy-host.test.ts` and `controller-native.test.ts`.
    - AC-031: partial; only the size-owner test turned up in my search.
  - **Low, traceability:** AC-007 and AC-022 (and partly AC-020) cite production source files and a review report, not named tests. They are copied from T-06's evidence. Tests do exist (`sessions-control`, `status.test.ts`), but the matrix should cite them.
  - **Low, generation bug:** the "用户待验收" cell reads `undefined` for AC-057 and AC-059.
- Items left to the user are clearly marked not run, and the NFR table keeps real-machine work with the user.

## Other lows

- M-17 says "目标至少 32px（触屏 44px）". DESIGN requires 44px at narrow widths, so the user would not check that.
- The `data.md` and checklist workaround suggests "重启 Obsidian 后重试". The port is a fixed hash of the vault and device, so a restart helps only if the program holding the port is short-lived or is a stale HUHU process. That should be stated.
- The Quick Commands buttons (`h-7` wrapper inside `[data-group-strip]`) are forced to 44px tall and spill out of the 28px wrapper. This predates T-18; the probe shows them reaching past the 36px strip when no tab row makes it taller. It is worth a look under the no-overflow part of AC-061.
- `evidence/T-18.md`, the required completion record with Design Conformance and Skill Execution Records, does not exist yet. The ticket expects it at closure.

## To clear request-changes

1. Make the pane title button and the tab-strip scroll buttons reach 44×44 below 600px, and add them to the harness's narrow-geometry check.
2. Fix M-12 (`message send --stdin` and the 16 KiB limit), and add the narrow 44px rule to M-17.
3. Re-run the coordination and panels harnesses on the current `styles.css`. Then update `T-18-ac-matrix.md`: the AC-061 status, the digests, the `test:styles` row and the `undefined` cells.
4. Record a decision on the T-12 inline-confirmation deviation and on colour-only status dots when grouping is not "status".
5. Optionally: correct the specificity comment in `agent.css` and the styles-budget attribution.