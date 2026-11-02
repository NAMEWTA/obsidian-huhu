# 092 REPORT

## Summary
- sidebar.test.ts: fake sessions now provide `getActivitySnapshot: () => ({ sources: [], source: {} })` (T-06 API). Assertions unchanged; status.ts untouched.
- helper-environment.test.ts: root cause was the test, not the helper. Imports pointed at the stale `core/terminal/frames`, and `PtyHelper.dispose()` now waits for both child `exit` and `close` (stdio closed), but the test only emitted `exit`, so dispose hung until the 5s timeout. The test now imports `shared/native/frames` and emits `close` after `exit`. Same assertions (env reaches spawn before first request; dispose not finished until child exit is observed). Moved next to the real owner: src/host/desktop/native/helper-environment.test.ts (old path deleted).
- control-panels-native.test.ts: `test.skipIf(!HUHU_TEST_PANE_EVIDENCE)`; once opted in, a missing HUHU_TEST_EDITOR_RUNTIME_DIR or binaries still throws.
- control-coordination-native.test.ts: `test.skipIf(!HUHU_PI_ARTIFACT_TEST_ROOT)`; once opted in, missing HUHU_PTY_BINARY / HUHU_CLI_BINARY still assert-fail.

## Changed paths
- src/modules/agent/core/workspace/sidebar.test.ts
- src/host/desktop/native/helper-environment.test.ts (new location)
- src/modules/agent/platform/desktop/pty/helper-environment.test.ts (deleted)
- src/modules/agent/services/control/control-panels-native.test.ts
- src/modules/agent/services/control/control-coordination-native.test.ts
(prettier --write was applied to these four; the HEAD versions of sidebar/panels were prettier-clean.)

## Commands
- `HUHU_TEST_PTY_BINARY/HUHU_TEST_CONTROL_BINARY=... pnpm exec vitest run src/modules/agent src/host` -> exit 0; 171 files passed, 3 skipped; 2111 tests passed, 41 skipped, 0 failed.
- Opted in: `HUHU_TEST_EDITOR_RUNTIME_DIR=$(mktemp -d /tmp/hr.XXXX) HUHU_TEST_PANE_EVIDENCE=$(mktemp -d /tmp/hv.XXXX) pnpm exec vitest run .../control-panels-native.test.ts` -> exit 0, 1 passed (real native CLI, all six Pane operations).
- Coordination opt-in NOT run: it needs HUHU_PI_ARTIFACT_TEST_ROOT (official Pi package artifact tree, `artifact/package`), which is not available here. Unverified.
- `pnpm exec tsc -p tsconfig.test.json --noEmit --skipLibCheck` -> exit 0.
- `pnpm exec prettier --check` on 4 files -> pass after write.
- eslint on these files: ignored by the repo's eslint ignore pattern (test files), 0 errors.

## Notes
- I ran `git mv` once for the relocation, then `git reset -q` on those two paths; the old path now shows as ` D` and the new file is untracked. The index is otherwise untouched.
- No tests added, none weakened.

## Remaining
- Coordination native harness opt-in run needs the Pi artifact (user/Lead).

SOURCE STOPPED
