<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
**T-18 Round 2 re-review: Standards pass, Specification pass. No medium or higher findings remain.**

S-1, S-2, P-1, P-2a and P-2b are all closed. I changed no repository files. The panels harness only accepts output under `/tmp/huhu-t09-production-ui-*`, so I ran it there and then moved the output into `/tmp/c2/`.

**Checks I ran** (`styles.css` a2fa4037…, `main.js` 13adfbab…; both unchanged from start to finish)

| Check | Result |
|---|---|
| `vitest run src/modules/agent/ui src/ui test/release` | 43 files, 337 tests passed |
| `test:styles` | Passed: 23 sources, 1,423,871 B |
| `lint:css` | No new violations |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `pnpm run lint` | exit 0 |
| `check-bundle --enforce` | Within limits |
| Coordination harness (`TMPDIR=/tmp/c2`) | 15 of 15 passed |
| Panels harness (with the current `HUHU_PANELS_STYLES_SHA256`) | 39 of 39 passed |

**S-1 (44px targets below 600px): closed**
- **Cascade:** The `min-h-8`/`min-w-8` utilities are gone from the pane title and the scroll buttons. The narrow rules are now (0,4,1) for the toolbar, pane-header and strip buttons and (0,4,0) for tab close. The shared rule is (0,3,1). Both the cascade and the `agent.css` comment are correct.
- **Not order-dependent:** The rules now win on specificity, not file order. The only thing that could undo this is a Tailwind `min-*` utility, which has ID-level specificity, coming back on these elements. The comment says so.
- **Measured in panels output:** At 390, 480, 599 and 600px, all 21 targets measured 44×44 (pane titles 44px tall) and none escaped the strip. The targets were the toolbar buttons, tab close, new tab, both Quick Commands buttons, the group menu, the pane title and pane close.
- **No regression at 800px:** Every target was 32×32 and the background count was visible. The 390 and 800px screenshots look normal.
- **Negative control:** I ran the panels harness on a symlinked copy whose `styles.css` had the single-class selectors (`/tmp/c2/neg`). It exited 1, and the new size check failed at all four narrow widths, so the check really asserts the rule.
- **Scroll buttons:** No harness makes the tabs overflow, so the scroll buttons never render there. A Chrome probe of the real `styles.css` with the production markup (`data-hit-control`, `size-6`) measured 44×44 at 480px and 32×32 at 900px, with no escape from the strip.

**P-2a (continue confirmation dialog): closed**
- `SessionHistoryPanel` now uses an AlertDialog. The title, Provider and directory are in the dialog, and focus lands on Cancel by default.
- `onCloseAutoFocus` returns focus to Continue after Cancel or Escape. The resume DOM tests assert both, and they pass.
- The dialog reuses existing keys, all present in en and zh.

**P-2b (status not colour-only): closed**
- `StatusDot` gives each state its own shape: done check, failed X, interrupted pause, idle grey dot, working spinner, waiting/permission question mark, unknown dashed circle.
- `aria-label` and the tooltip are kept, and the outer box size is unchanged.
- The other users (AgentBoard, JumpPalette, the gallery and the pane header) only change their failed and interrupted icons, from a red dot to an X and a pause glyph. The layout does not shift.
- The sidebar no longer has a dot-only path. `StatusDot.dom.test.tsx` checks all seven states are distinct at both sizes.

**S-2 (manual checklist docs): closed**
- M-12 now uses `huhu --json message send --to-session … --stdin` and tests 16 KiB and 16 KiB + 1 byte. I checked this against `cli.rs`: `--stdin` exists only for `message.send`, the body limit is 16,384 bytes, the error is `CAPACITY_EXCEEDED` with exit code 2, and `agent prompt` is limited by the 32,768-byte request.
- M-17 has the 44px narrow-width rule and the shape check.
- The writer-port wording in `docs/agent-workbench-acceptance.md` and `docs/data.md` is corrected, and the per-OS code-path table is added.

**P-1 (AC matrix): closed**
- AC-061 is passed-code. It cites the coordination harness at 15/0 and panels at 39/0, which match my runs.
- AC-063 reads "code deliverables complete; AC pending user E2E", and the manual checklist matches.
- No `undefined` cells remain. AC-007, AC-020 and AC-022 now cite named tests, and every cited test or script path exists.

**Lows (none block)**
1. The matrix is out of date on `main.js`. Line 3 still records digest `bb8491fc…` and says the TSX changes are not built in, and the `check-bundle` row asks for a rebuild. The current `main.js` is `13adfbab…` and does contain the Round 2 changes (`data-status-shape` ×4, `min-h-7`, no `h-7` wrapper). The digest and bundle row should be updated before closure.
2. No harness makes the tab strip overflow, so the scroll buttons have only my standalone probe as evidence. The coordination check is also weak: it requires only `targets.length>=2` and never covers tab close or the pane header. Panels covers those.
3. After pressing the dialog's confirm button, focus is sent back to the Continue button, which is disabled while the resume runs. Focus therefore falls to the page body. This is not a regression; the old inline confirmation behaved the same.
4. `StatusDot.dom.test.tsx` lives in `src/modules/agent/ui/tabs/`, but the component it tests is in `src/ui/components/huhu/`.
5. `evidence/T-18.md`, the completion record, still does not exist. The ticket needs it at closure.

Scratch output is in `/tmp/c2/` (`coord`, `panels-review`, `panels-neg`, `neg`, `probe`) and in `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t18r2/`.