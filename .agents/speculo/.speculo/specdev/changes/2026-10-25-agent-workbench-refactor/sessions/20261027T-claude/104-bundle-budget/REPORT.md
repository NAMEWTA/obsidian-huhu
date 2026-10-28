# 104 bundle budget REPORT

## Delivered
- A: editorEmbeddedCodecSource() now generated into src/shared/native/control-wire-editor-codec.generated.ts (in generator --check list, removed from control-wire.generated.ts). native-extensions.ts and host-editor.integration.test.ts import it from there. piEditorArgumentGate moved verbatim to hooks/pi-editor-gate.ts (static; re-exported by native-extensions). system-hooks / automation-hooks / remove-status-hooks use await import('./native-extensions') at point of use.
- B: pi-artifact-profiles.json stays source of truth (no longer imported). pi-artifact-profiles.generate.mjs [--check] emits pi-artifact-profiles.generated.ts (brotli q11, base64, 71.8 KB); program-identity.ts decodes with node:zlib brotliDecompressSync + JSON.parse. Drift test: pi-artifact-profiles.generated.test.ts.
- C: eagerBytes 123904 -> 124928, browser activation 103424 -> 104448 with reasons; evidence evidence/bundle-budget-attribution-GP041.json. outputBytes and agent NOT raised.

## Measured (check-bundle, before -> after)
- main.js 6,822,862 -> 6,749,303 (budget 6,758,400)
- agent activation 1,418,850 -> under 1,370,112 (not printed in over-list; was 1,385.6 KB on first run)
- startup 124,918 (limit now 124,928); browser 104,246 (limit now 104,448)
- home activation 492,566 > 492,544 (+22 B) STILL OVER, pre-existing before my changes (was 492,562 at start); not in my mandate to raise.

## Changed paths
scripts/generate-control-protocol.mjs; scripts/bundle-budget.json; src/shared/native/control-wire.generated.ts; src/shared/native/control-wire-editor-codec.generated.ts (new); native/pty-server/src/control/wire_generated.rs (regenerated, unchanged output); src/modules/agent/platform/desktop/hooks/{pi-editor-gate.ts (new),native-extensions.ts,system-hooks.ts,automation-hooks.ts,remove-status-hooks.ts}; src/host/desktop/native/host-editor.integration.test.ts; src/modules/agent/platform/desktop/agents/{program-identity.ts,pi-artifact-profiles.generate.mjs,pi-artifact-profiles.generated.ts,pi-artifact-profiles.generated.test.ts} (new/edited); evidence/bundle-budget-attribution-GP041.json.

## Commands
- generator --check: exit 0
- tsc -p tsconfig.test.json: exit 0
- eslint touched src (--max-warnings 0): exit 0 (test files are eslint-ignored by config)
- prettier --check program-identity.ts: ok (pi-editor-gate.ts moved verbatim, not prettier-formatted like the rest of hooks/)
- pnpm test:architecture: exit 0
- vitest src/modules/agent src/host with HUHU_TEST_PTY_BINARY/CONTROL_BINARY: exit 0, 178 files passed, 2197 tests passed, 41 skipped
- check-bundle --enforce: exit 126 (only home activation +22 B over)
- cargo test not run: wire_generated.rs content unchanged (generator --check passes).

## Gaps
- Lead decision: home activation +22 B (raise to 493,568 / 482 KiB or trim).
- Real Obsidian/Pi E2E not done.

SOURCE STOPPED

## Round 2
- Moved the generator to scripts/generate-pi-artifact-profiles.mjs (old agents/pi-artifact-profiles.generate.mjs deleted); paths adjusted; `--check` kept; package.json script `generate:pi-profiles` added. Drift test now points at the new script path. Regenerated asset header names the new script.
- `pnpm run lint` (eslint . --max-warnings 0): exit 0.
- vitest pi-artifact-profiles.generated.test.ts + program-identity.test.ts: pass (5 passed, 30 skipped).
- generator --check (direct and via pnpm script): ok.
- `tsc -p tsconfig.test.json`: exit 126-class failure NOT from this task: errors only in src/modules/home/ui/quickbar/SkillList.tsx (undefined `spaces`, in-progress T-14 work). My files typecheck cleanly (earlier run exit 0).
- Home budget untouched.

SOURCE STOPPED

## Round 3
- low 1: automation-hooks.ts now awaits `import('./native-extensions')` before checkOwnedPath / fs.open (both the Pi verify path and the install path).
- low 2: program-identity.ts caches the decoded Pi profiles in module-level `cachedProfiles` (`??=`), decoded once per process.
- low 4: pi-editor-gate.ts prettier-formatted. The embedded text is `Function#toString()` of the compiled function (esbuild reprints it), so source formatting does not reach the extension; native-extensions/hooks tests (which run the embedded extension) pass.
- Checks: vitest src/modules/agent/platform/desktop + src/host with HUHU_TEST_PTY_BINARY/CONTROL_BINARY: 65 files passed (1 skipped), 1225 tests passed, 32 skipped; `pnpm run lint` exit 0; `tsc -p tsconfig.test.json` exit 0. bundle-budget.json not touched.

SOURCE STOPPED

## Round 4
- test/native/control-protocol.test.ts now reads `editorEmbeddedCodecSource` from control-wire-editor-codec.generated (assertion intent unchanged). Grep of src/, test/, scripts/ found no other consumer via the old module (remaining references: host-editor.integration.test.ts, native-extensions.ts, the generator — all on the new module).
- vitest test/native, lint, tsc: see reply for exit codes.

SOURCE STOPPED
