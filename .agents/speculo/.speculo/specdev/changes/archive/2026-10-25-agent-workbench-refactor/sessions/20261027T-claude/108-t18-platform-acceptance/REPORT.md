<!-- Saved by Lead from implementer reply (Sonnet 5.5); write refused. -->
T-18 is done at code level, with one open finding on AC-061. The REPORT.md write was refused, so the full report is below. I did not run `pnpm run build`, and I made no commits or remote actions. Only Linux x64 ran here; nothing was run on a real Obsidian, a real Codex/Claude or the other four platforms.

## What I did
- **Frozen input:** HEAD `207371164a68…`; the 55 changed non-`.agents` paths hash to `021a4bc8991c…`; `main.js` is `ac59749c…`; `styles.css` is `2eb07b0f…`; Linux x86_64, Node v26.11.1.
- **CI matrix:** `terminal-build.yml` has all five rows (Linux x64/arm64, macOS x64/arm64, Windows x64). Each row runs `cargo test --locked`, a release build, `verify-pty-helper.mjs` (helper plus CLI), and packages checksums and compat records. It needed no change.
- **AC matrix:** 64 rows. 63 are passed-code, AC-061 is open-finding F-1, none failed, and no real-host item was run. The matrix, the NFR table, the cross-ticket slices (AC-002, 004, 006, 021, 046) and the four-page DESIGN audit (digest `f4692734…`) are in `evidence/T-18-ac-matrix.md`.
- **AC-061 / F-1:** below 600px the toolbar control toggle measures 32×32; the DESIGN and `agent.css` rule require ≥44×44.
  - **Cause:** the shared `.huhu-ui :is(button, …)` hit-size rule has higher specificity than the `agent.css` container rule.
  - **Fix needed outside my write set:** `src/modules/agent/styles/agent.css`, then rebuild `styles.css` and rerun the coordination harness.
  - **Not proven:** the pane-header and group-strip buttons may be affected the same way.
- **Checklists:** `docs/agent-workbench-acceptance.md` has a record sheet, a five-row platform matrix with results left as "待填", scenarios M-01 to M-17 and per-platform items. M-01 to M-17 cover Spaces, background A/B, cross-Space control, approval, reattach, history conflict, web, exit recovery, Codex/Claude, six entries, IME, multiline, permissions, migration, backup and UI. It also records the writer-port symptom and workaround. I linked it from `agent-workbench.md` and `agent-workbench-cli.md`, and `evidence/T-18-manual-checklists.md` indexes it.

## Changed paths
- **Docs:** `docs/agent-workbench-acceptance.md` (new), `docs/agent-workbench.md`, `docs/agent-workbench-cli.md`, `docs/data.md`. In `data.md` I added the writer-port symptom and workaround, and reworded the skills path so `test:docs` stops flagging it.
- **New test:** `test/release/platform-acceptance.test.ts`, four tests on the CI matrix and checklist.
- **Harnesses in `scripts/obsidian-acceptance/`:**
  - `agent-workbench-panels.mjs`, `-coordination.mjs` and `-activity.mjs` had drifted. I added a `FileSystemAdapter` stub and a `node:*` banner so the browser bundle builds.
  - `terminal-reliability.mjs` now stops with a message on anything but win32-x64.
- **CHG evidence:** `evidence/T-18-ac-matrix.md`, `evidence/T-18-manual-checklists.md`.

## Checks
| Command | Exit | Result |
|---|---|---|
| full `vitest run` | 1 | 4807 passed, 6 failed, 42 skipped; the 6 failures are `host-editor.integration` (5) and `host-control.integration` (1) lacking `HUHU_TEST_PTY_BINARY/HUHU_TEST_CONTROL_BINARY`; no timeout flakes |
| `cargo test --locked` | 0 | 173 passed |
| `cargo build --locked --release` | 0 | built |
| `verify-pty-helper.mjs` | 0 | CLI 0.0.1, protocol 1; helper linux 0.0.1 |
| integration, sessions.e2e, release-artifacts and control-native with the env vars | 0 | 5 files, 17 tests |
| `vitest run test/release` | 0 | 31 tests |
| `tsc -p tsconfig.test.json` | 0 | clean |
| `pnpm run lint` | 0 | clean |
| `test:architecture`, `test:i18n` (5082 keys), `check:notices`, `test:promise-callbacks`, `test:ui-styles`, `test:ui-adapters`, `test:ui-runtime`, `test:build-text`, `test:workbench-entry` | 0 | pass |
| `test:docs` | 1 | only failures outside my set: the 107 REPORT link and six anchors in the huhu-bot-architecture input |
| `test:styles` | 1 | `styles.css` is stale against its 23 sources (missing `.border-destructive/50`); you need to rebuild |

Chrome harnesses (`panels` needs `HUHU_PANELS_STYLES_SHA256`; these ran against the stale `styles.css`):

| Harness | Exit | Result |
|---|---|---|
| screen | 0 | 20 checks |
| panels | 0 | 30 checks |
| panels `--inbox` | 0 | pass |
| activity | 0 | 11 checks |
| coordination | 1 | 13 of 14 pass; the failure is F-1 |

## Residual risks for you
- **Flakes:** the `pty/binary.test.ts` 5 s timeout and the hook-spool rmdir ENOENT did not reproduce. I ran one full parallel run and three repeated subset runs of 93 files each, and all passed. Those test files are outside my write set, so I changed nothing.
- **Hashed ports:** `controller-managed-runtimes.test.ts`, `ports.test.ts` and `writer-owner.test.ts` still use hashed ports. They are outside my write set, so I did not switch them to `freeWriterPorts()`.
- **DESIGN deviation to judge:** the T-12 continue confirmation is inline, but DESIGN specifies a dialog.
- **`terminal-reliability.mjs`:** it is win32-x64 only and still uses the old Space-less `newShell('cmd')`. I did not re-verify it on Windows.
- **Not run:** real Obsidian, Provider, IME, load, real-vault migration and backup restore, and the other four platforms (CI config checked only).
- **Bundle budget:** I added no plugin code and did not touch `bundle-budget.json`.
- **References:** I added no new dependencies or copied code.

SOURCE STOPPED

<!-- Round 2 saved by Lead -->
Round 2

All five items are done and checked on Linux x64. Nothing was run on a real Obsidian, a real Codex/Claude, or any other platform.

**S-1 (44px targets below 600px)**
- I removed the fixed Tailwind min-size utilities from the pane title button and from the tab-strip scroll buttons. Those utilities were overriding `agent.css`.
- The Quick Commands wrapper is now `min-h-7` instead of `h-7`, so its buttons no longer spill out of the tab strip.
- The narrow rules in `agent.css` now use three root classes, so they win on specificity rather than on source order. I corrected the comment: the shared rule is (0,3,1), and the old doubled-class fix only won by order.
- I extended the narrow-geometry checks in the coordination and panels harnesses to cover the toolbar, pane header, tab strip, Quick Commands and tab-close buttons. They require at least 44×44 below 600px and no escape from the strip.
- I did not run a negative control, meaning I did not restore the old class names and rerun to see the new checks fail.

**P-2a (continue confirmation)**
- The inline confirmation in `SessionHistoryPanel` is now an AlertDialog.
- Focus lands on Cancel by default. Cancel and Escape return focus to the Continue button.
- I updated the four affected cases in `SessionHistoryPanel.resume.dom.test.tsx`.

**P-2b (status not colour-only)**
- `StatusDot` now uses a different shape per state, in the sidebar and pane header alike:
  - done: check circle
  - failed: X circle
  - interrupted: pause circle
  - idle: grey dot
  - running: spinner
  - blocked: question mark
  - unknown: dashed circle
- Labels and `aria-label` are kept. I removed the `sidebar` prop, which was no longer used.
- The new `StatusDot.dom.test.tsx` asserts distinct shapes plus labels for all seven states at both sizes.
- `StatusDot` lives in `src/ui/components/huhu/`, which is not strictly under `src/modules/agent/ui/**`. I read your "StatusDot components" as covering it; only the agent UI and the component gallery use it.

**S-2 (docs)**
- M-12 now uses `huhu --json message send --to-session … --stdin` with 16 KiB and 16 KiB + 1 byte, and notes the 32768-byte request limit for `agent prompt --text`.
- M-17 now includes the 44px narrow rule and the status-shape check.
- The writer-port wording in `docs/agent-workbench-acceptance.md` and `docs/data.md` now says to free the port first. A restart only helps if the holder is short-lived or a stale HUHU process.
- I added a per-OS code-path table to the acceptance doc.

**Matrix (`evidence/T-18-ac-matrix.md`)**
- AC-061 is now passed-code, with the Round 2 evidence cited.
- AC-063 now reads "code deliverables complete; AC pending user E2E".
- The `undefined` cells are filled, and AC-007, AC-020 and AC-022 now cite named tests.
- It also holds the new digests, the `test:styles` row, the DESIGN decisions and the per-OS code paths. `evidence/T-18-manual-checklists.md` carries the same AC-063 wording.

**Checks**
- `styles.css` was regenerated with `node scripts/build-tailwind.mjs && node scripts/build-styles.mjs --write`: sha256 `a2fa4037…`, 1,423,871 B.
- Passing at exit 0: `tsc`, `pnpm run lint`, `lint:css`, `test:styles`, `test:i18n`, `test:architecture`, `test:ui-styles`.
- `vitest run src/modules/agent/ui src/ui test/release`: 43 files, 337 tests passed.
- The coordination harness passed 15 checks with 0 failures. I used `TMPDIR=/tmp/c1` to avoid the Chrome socket-path problem.
- Panels passed 39 checks with 0 failures. The `--inbox` variant also passed, as did the activity and screen harnesses.
- `check-bundle.mjs --budget scripts/bundle-budget.json` exited 0 ("within limits"). Startup-evaluated is 122.9 KB, lazy is 6412.7 KB, and agent activation is 1337.2 KB (+1539.6 KB deferred). I did not edit the budget.
- `test:docs` still fails on the same six anchors in the huhu-bot-architecture inputs, outside my scope.

**For you**
- `main.js` is not rebuilt after my TSX changes. Its sha256 is `bb8491fc…`, which predates them. Rebuild it and re-measure the bundle before closing.
- `evidence/T-18.md` (the completion record with Design Conformance and Skill Execution Records) still does not exist. The ticket expects it at closure.

The REPORT.md write was refused again, so this reply is the report.

SOURCE STOPPED