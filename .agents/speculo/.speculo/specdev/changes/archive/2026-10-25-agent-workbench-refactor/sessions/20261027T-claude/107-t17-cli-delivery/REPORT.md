# T-17 REPORT (implementer, Linux x64 only)

## Delivered
- CLI joins the five-platform asset flow: terminal-build builds both bins, verifies `huhu` next to `huhu-pty`, packages `huhu-<asset>` + `.sha256` + `.compat.json` (record generated from the just-built binary's `--json version`: schema, asset, cliProtocol, helperProtocol, sha256).
- `verify-release-artifacts` now requires exactly 5 helpers + 5 CLIs + all checksums + 5 compat records; each record must name its own asset/digest and equal control-schema.json protocolVersion (1) and helperProtocol (3).
- Plugin path: `binary.ts` generalised (`AssetSpec`, `ensureAsset`; `ensureHelper` behaviour unchanged). `binary-cli.ts`: `cliAssetName`, `parseCompatibility`, `assertCompatible`, `ensureCli`, `diagnoseCli`. Compat is checked after digest and BEFORE the executable is downloaded; compat detail is stored in the sealed receipt and re-checked on every reuse (online/offline). New error codes `incompatible`, `compatMissing`.
- `verify-pty-helper.mjs <helper> [<cli>]`: CLI version/protocol pairing with helper hello, `schema` == canonical schema, `help` lists every op and param flag, 16 KiB stdin passes / 16 KiB+1 -> CAPACITY_EXCEEDED exit 2, error class via code+exit code.
- Packaged Skill: `src/modules/agent/core/control/skill/huhu-control.{en,zh}.md` + lazy `skill.ts` (`loadControlSkill`). Trigger limited to explicit HUHU use; wait != success, blocked/permission/AGENT_BLOCKED needs a human, WAIT_TIMEOUT never resends, EFFECT_UNKNOWN -> query, long body via --stdin. Not written to any account skill dir.
- Provenance: `docs/third-party/agent-workbench-cli.md` (mechanism-only references Herdr Apache-2.0 @2ecf19a, Wave, tmux docs; no code copied/adapted; NOTICE unchanged on purpose). Similarity run vs Herdr@2ecf19a (shallow clone in scratchpad): 50 ours files / 461 ref files, 0 at or above 0.05.
- Docs: `docs/agent-workbench-cli.md` gained "发布资产与兼容" and "随插件打包的 Skill"; stale "由后续交付完成" sentence replaced.

## Changed paths
.github/workflows/terminal-build.yml; scripts/verify-pty-helper.mjs; scripts/verify-release-artifacts.mjs; src/host/desktop/native/binary.ts; NEW src/host/desktop/native/binary-cli.ts; NEW src/modules/agent/platform/desktop/pty/binary-cli.ts (+ binary-cli.test.ts); NEW src/modules/agent/core/control/skill.ts and skill/huhu-control.{en,zh}.md; test/release/release-artifacts.test.ts (reworked 10-asset cases); NEW test/release/control-skill.test.ts, test/release/cli-assets-workflow.test.ts; docs/agent-workbench-cli.md; NEW docs/third-party/agent-workbench-cli.md. Untouched: Cargo.*, huhu.rs, NOTICE, THIRD-PARTY-NOTICES.md (check passes as is), main.js/styles.css, bundle budget, i18n.ts (no new plugin UI strings), docs/agent-workbench.md.

## Checks (exit codes)
- `vitest run test/release src/modules/agent/platform/desktop/pty`: 0 (45 tests; incl. real CLI + real helper + NativeHost for Skill examples)
- `HUHU_TEST_* vitest run src/host/desktop/native src/modules/agent/platform test/release`: 0 (355 passed, 31 pre-existing skips)
- `node scripts/verify-pty-helper.mjs target/debug/huhu-pty target/debug/huhu`: 0 ("control CLI verified (0.0.1, protocol 1)")
- local simulation of the workflow packaging python (debug bins): produced 5 expected files, valid compat.json
- `pnpm run lint`: 0; `pnpm test:architecture`: 0; `pnpm run test:i18n`: 0; `pnpm run check:notices`: 0 (73 crates current)
- `tsc -p tsconfig.test.json`: only errors are in T-16 `services/backup/import.ts` (`Warning` name, not mine); none in T-17 files
- `pnpm run test:docs`: FAILS, pre-existing, only the huhu-bot-architecture input doc anchors (not T-17)
- cargo test: not run (no native/Cargo change). No `pnpm run build`/`check:bundle` (Lead-owned).

## Decisions
- Assets: CLI named `huhu-<platform>-<arch>[.exe]` (no collision with `huhu-pty-*`); release.yml needs no edit (merges `terminal-*` artifacts; its verify step calls the extended function; its Linux helper smoke step still only runs the helper, could pass the CLI as 2nd arg).
- Compat: sidecar rather than executing the binary to ask its version; execution never precedes the check. Old release (no sidecar/CLI asset) => `compatMissing`/`http`; helper still works. Dev override env `HUHU_CLI_BINARY` skips compat like `HUHU_PTY_BINARY`.
- Protocol: CLI major 1 (`CLI_PROTOCOL_MAJOR`, test pins it to the schema), helper 3.

## Gaps / for Lead
- `ensureCli`, `diagnoseCli`, `loadControlSkill` are not wired into controller/runtime/UI (those files are outside the write set); unreferenced, so no bundle change. Needs a Lead-owned hookup (and t() strings for surfacing diagnoses) if a user-visible install/diagnose entry is wanted.
- release.yml and docs/references.md (should link docs/third-party/agent-workbench-cli.md) are outside the write set; scripts/verify-release-artifacts.d.mts untouched (cliAssets is not typed; tests derive names).
- Proposed text for docs/agent-workbench.md (T-16 holds it), at the helper download paragraph (~line 298): "同一 Release 还发布本机控制 CLI `huhu-<平台>-<架构>`（Windows 加 `.exe`），附 `.sha256` 与 `.compat.json`。下载前核对摘要、CLI 协议主版本（1）与 helper 协议（3），缺失或不符即拒绝且不执行；详见 工作台本机 CLI（`docs/agent-workbench-cli.md#发布资产与兼容`）。"
- docs/privacy.md and development.md still mention only huhu-pty (outside write set).
- Only Linux x64 ran; darwin/win32/arm64 are CI-only and unverified. Real Obsidian/provider E2E is the user's.
- Similarity only vs Herdr; Wave/tmux compared as docs only.

SOURCE STOPPED

# Round 2 (wiring)

## How terminals reached `huhu` before
They did not: only routing env (HUHU_INSTANCE_ID/VAULT_ID/SPACE_ID/STABLE_SESSION_ID/SESSION_ID/HUHU_CONTROL_LOCATOR via ControlEnvironment.routeEnvironment) was injected; no PATH/binary path existed (T-07 evidence and contracts only plan the CLI). Contract chosen: verified copy at `.huhu/helpers/<device>/<plat-arch>/<version>/bin/huhu[.exe]`, its dir prepended to PATH/Path, `HUHU_CLI` = absolute file.

## Wiring delivered
1. Terminal env: `TerminalHost.environment()` in controller.ts now adds `withCliEnvironment(base, await native.cli())` (new `platform/desktop/control/cli-environment.ts`). `NativeHostAccess.cli?()` added (shared/native/host.ts), forwarded by lazy-host.ts; implemented in host/desktop/native/runtime.ts via `diagnoseCli` + new `exposeCli` (binary-cli.ts; copy re-hashed, tampered copy repaired). Not ready (incompatible/compatMissing/offlineMissing/checksum/download/unsupported) => nothing added to env, terminal still opens, one localized Notice per state+version, text with next step. Offline reuse works from sealed receipt, re-checks compat.
2. Settings: Terminal settings "Command-line tool" row + "Check tool" button (controller.checkCli, no notice, shows localized state + next step). Strings: lazy native dict `agent.cli.*` (en+zh) and `agent.settings.cli*` in agent/i18n.ts.
3. Skill: `platform/desktop/skills/packaged.ts` materializes the Skill (UI language) to HUHU-owned `<vault>/.huhu/skills/huhu-control/SKILL.md` (no rewrite if unchanged); `createSkillOps` takes `packaged` dep and scans it as a source; host-ops wires it. The Skills page then lists `huhu-control`; copying into an agent dir happens only via the existing explicit toggle (tested: home dir stays empty until toggle).
4. Docs: privacy.md, development.md, references.md, agent-workbench-cli.md ("终端里如何找到 huhu"), release.yml smoke step now passes the CLI (only the step body; no dispatch). docs/data.md (T-16-held) not touched: it should list `.huhu/skills/` (packaged skill source) and `.huhu/helpers/.../bin/`.

## Added write-set paths (minimal)
src/shared/native/host.ts, src/shared/native/lazy-host.ts (+ lazy-host-cli.test.ts), src/shared/i18n/lazy/native.ts, src/host/desktop/native/runtime.ts (+test), src/modules/agent/services/controller.ts, src/modules/agent/ui/settings/TerminalSettings.tsx, src/modules/agent/i18n.ts, skills/{ops,host-ops,packaged}.ts, control/cli-environment.ts, .github/workflows/release.yml, docs/{privacy,development,references}.md.

## Checks
vitest test/release src/host/desktop/native src/modules/agent/platform src/modules/agent/services src/shared/native (HUHU_TEST_* set): 0, 1178 passed / 40 skipped (pre-existing). tsc: only T-16 backup/import.ts errors. lint 0, architecture 0, i18n 0, check:notices 0, verify-pty-helper debug helper+CLI 0.

## BUNDLE BUDGET: OVER, STOP (not raised)
`node scripts/check-bundle.mjs --budget scripts/bundle-budget.json`: main.js 6878856 > outputBytes 6863872 (+14984B). Eager and every module activation within budget (agent 1336.4KB). My lazy contributions (bytesInOutput): binary-cli.ts 3365, packaged skill md en 2513 + zh 2338 + skill.ts 167, lazy native dict +40 lines (file now 5805), runtime.ts 1519, packaged.ts 578, cli-environment 420, ops/host-ops ~+300, lazy-host +~250, controller/TerminalSettings/agent i18n ~+1.2KB, binary.ts generalisation ~+0.7KB. Minimum 1KiB ceiling for 6878856 would be 6879232. Needs Lead decision (raise with reason, or trim: e.g. ship one Skill language).
Also main.js/styles.css were not rebuilt by me.

## Still open
- Real Obsidian/terminal PATH resolution of `huhu` on any OS is the user's E2E; Windows `Path` handling is unit-tested only.
- Proposed text for docs/agent-workbench.md (T-16 holds it) unchanged from above; add: "终端里自动提供 `huhu` 命令（PATH 与 HUHU_CLI，已校验才提供），状态见终端设置。"

Round 2

SOURCE STOPPED


<!-- Round 3 saved by Lead from implementer reply -->
Round 3 is finished; every check passes. The one exception is the bundle size, which is 985 B over the limit, so `bundle-budget.json` needs your edit.

**Bundle:** `main.js` measures 6881239 B against the 6880256 B limit, so it is 983 B over. Agent activation is 1337.0 KB and the eager startup set is unchanged. I did not edit `bundle-budget.json`. The 1 KiB ceiling for this measurement is 6881280; I did not re-measure after the last lint-only change. `T-17-budget-attribution.json` was not refreshed in this round.

**Mandatory fixes**
- **M1:** terminal launch never waits on CLI network work.
  - A new `CliEnvironment` in `control/cli-environment.ts` waits at most 300 ms for the already-verified local check, and an abort stops the wait immediately.
  - A slower install keeps running in the background and is shared, not restarted. Only terminals launched afterwards get `PATH` and `HUHU_CLI`.
  - A non-ready result is remembered for the life of the controller, so later launches neither wait nor retry. The settings "Check tool" button is the explicit retry and clears the memory on success.
  - `TerminalHost.environment(signal)` now receives `request.signal` from `sessions.ts`.
  - Three new tests cover a hanging install, an aborted launch, and the negative cache. The "doesn't delay `create()`" test sits at the `CliEnvironment` level, not through `create()` itself.
- **M2:** a 404 on the CLI `.sha256` now gives `compatMissing`. The new `absentCode` option on the shared download path does this, and the existing helper behaviour is unchanged. HTTP 503 and timeouts stay `downloadFailed`. `binary-cli.test.ts` and the docs sentence are updated.

**Lows**
- **L1/L9:** `exposeCli` takes the digest verified by `ensureCli` (new `ensureCliVerified`). It checks the existing target against that digest. A new copy is hashed against it before replacing anything, so bytes changed after verification are refused and the old target is left alone. The file is no longer hashed three times per open. A test covers repair, refusal, and no leftover temp file.
- **L2/L3/L8:** `docs/agent-workbench-cli.md` has the corrected header, `downloadFailed` in the state list, and the `HUHU_CLI_BINARY` dev override. It also states the non-blocking launch behaviour.
- **L4:** the settings page always shows text; the new `agent.settings.cliUnavailable` string (en/zh) covers the closed, load and unsupported-host states.
- **L5:** the "unavailable" next-step text is now neutral instead of blaming other Obsidian windows.
- **L6:** the `NativeHostAccess` JSDoc is back above its interface.
- **L7:** the provenance table lists the Round 2 files. The similarity run now covers 1985 of our files against 461 reference files. None has a raw share of 0.15 or more, or a raw run over 40 tokens. 57 files score 0.05 or more on the normalized measure, all dictionary and string-table style; the only T-17 one is `lazy/native.ts` at 0.333 normalized and 0 raw.
- **Docs:** I applied your paragraph to `docs/agent-workbench.md`. In `docs/data.md` I extended the existing helpers row with the `bin/huhu[.exe]` copy and added a row for `.huhu/skills/huhu-control/SKILL.md`.

**Checks**
- vitest on `test/release`, `src/host/desktop/native`, `src/modules/agent/platform`, `src/modules/agent/services` and `src/shared/native`, with the `HUHU_TEST_*` binaries set: 1182 passed, 40 skipped, none failed.
- `verify-pty-helper.mjs` with the debug helper and CLI: exit 0.
- tsc, lint, architecture, i18n and `check:notices`: all clean.
- Only Linux x64 was run.

Round 3

SOURCE STOPPED