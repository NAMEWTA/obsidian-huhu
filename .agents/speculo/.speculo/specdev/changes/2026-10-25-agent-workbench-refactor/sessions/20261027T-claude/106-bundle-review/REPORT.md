<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
**Verdicts**
- **Standards: pass**
- **Specification: pass**

I found no medium-or-higher problems in this change's own parts. Two budgets are over right now, but the cause is concurrent T-14 work, not this change. It does use up the new startup ceiling, so it needs a Lead decision (details under "Measured bundle numbers").

**Scope check:** `sha256sum -c SCOPE.sha256` passed on all 17 files, and again after your message. Nothing in the repo was modified. I wrote one stray file outside my scratch area by mistake (`/home/wta/orca/workspaces/obsidian-huhu/meta.mjs`) and deleted it straight away. My in-memory builds used `write:false`. `main.js` and `styles.css` show as modified only because of earlier sessions.

## What I verified

**(1) Codec split and lazy `native-extensions`**
- **Generator:** `editorEmbeddedCodecSource()` is now generated only into `src/shared/native/control-wire-editor-codec.generated.ts`. It no longer appears in `control-wire.generated.ts`, and the new file is in the generator's `--check` list (`scripts/generate-control-protocol.mjs:404-417`).
- **Generator output:** regenerating into scratch gave byte-identical copies of all three outputs.
- **`--check` covers the new file:** it fails if that file is altered and fails if it is missing.
- **Codec text unchanged:** the bundling step itself is unchanged. I compared the codec text with the copy in the old `main.js`. The only differences are schema data from other tickets (`unassigned`, `history.open` now `available:!0`).
- **Importers:** both are updated (`native-extensions.ts:5`, `host-editor.integration.test.ts:90`). No production code still imports `native-extensions` statically. The remaining static importers are tests and `scripts/verify-pi-editor.mjs`, which still works because `native-extensions` re-exports `piEditorArgumentGate`.
- **Dynamic import sites:**
  - Install and remove in `system-hooks.ts:465` and `:537`.
  - `automation-hooks.ts:61` and `:446`.
  - `remove-status-hooks.ts:28`.
  - All of them sit in async paths. A failed import now throws where the old static import could not fail, and that error goes to the same handlers as before. The Pi verify path still ends in `catch → return undefined`.
- **`piEditorArgumentGate` moved verbatim:** its minified body in the old `main.js` and in a fresh build is identical apart from the function name. That matters because the function's source text is embedded into the Pi extension. `automation-hooks` still calls it synchronously through the static `pi-editor-gate.ts`.
- **Agent activation contents:** the metafile no longer puts `native-extensions` or the codec in agent activation. Only `pi-editor-gate`, `hook-spool` and `event-payload` remain.

**(2) Pi artifact profiles asset**
- **JSON not bundled:** `pi-artifact-profiles.json` is not an input to `main.js`, and only the generator and the test still reference it.
- **Lazy, desktop-only decode:** the 71.7 KB generated asset is reached only through `program-identity.ts`, which `sessions.ts:601` loads with a dynamic import. `node:zlib` is external, and the asset is not part of agent activation.
- **Decode matches:** `brotliDecompressSync` + `JSON.parse` gives the same object as the JSON (the test uses `toEqual`, the generator's check compares stringified output).
- **Drift test is real:** in a scratch copy, changing one `fileSetSha256` made `--check` fail with "stale". Regenerating fixed it, and regenerating from the real JSON reproduced the committed file byte for byte.
- **Package script:** `generate:pi-profiles` is sane. The only other `package.json` changes are xterm version pins from other tickets. No new dependencies, so licensing is fine.

**(3) Budgets**
- This change raises only `eagerBytes` (123,904 → 124,928) and browser activation (103,424 → 104,448).
- `outputBytes` (6,758,400) and agent activation (1,370,112) were not raised; their current values come from T-10. The navigator raise comes from T-04/T-06 and is recorded in their evidence.
- **Evidence matches a fresh measurement:** every per-input number in `evidence/bundle-budget-attribution-GP041.json` (6 startup and 6 browser inputs) equals what I measured now, and browser activation is exactly 104,246 as recorded.

## Measured bundle numbers
From `node scripts/check-bundle.mjs --budget scripts/bundle-budget.json`, latest run. T-14 is editing concurrently, so these can still shift.

| Metric | Measured | Limit | Status |
|---|---|---|---|
| main.js | 6,758,270 | 6,758,400 | under, but only 130 B of headroom |
| startup | 125,026 | 124,928 | **over by 98** |
| agent activation | 1,353,033 | 1,370,112 | under |
| browser activation | 104,246 | 104,448 | under |
| home activation | 492,909 | 492,544 | **over by 365** |
| automations activation | 218,728 | 217,088 | **over by 1,640** |

- **Startup overage is not from this change.** It rose from the evidenced 124,918 by +108 bytes, all from T-14 home board code: `src/modules/home/core/board/skill-shortcuts.ts` grew 942 → 1,006 and `shortcut-buttons.ts` grew 727 → 771.
- **Decision for you:** T-14 should either trim those two files or raise startup with its own attribution. The GP-041 ceiling should not absorb it.
- **Home and automations overages** are also concurrent T-14 work. Home is now 365 bytes over, not the ~18 you mentioned.
- **main.js:** concurrent growth has eaten almost all the headroom from the brotli change (6,749,303 when it was made).

## Low findings (none block)
1. **Import runs while the file is open:** `automation-hooks.ts:61` imports `native-extensions` after `fs.open`. So the first evaluation of `native-extensions` happens while the file handle is open and counts against the 2 s deadline. The effect is negligible. Fix: move the import before `checkOwnedPath` or `fs.open`.
2. **Profiles decoded on every launch:** `program-identity.ts:141-143` decompresses and parses about 175 KB of JSON each time `verifyPiArtifact` runs, where the old JSON module was cached once. Each run costs a few ms. Fix: cache the decoded object in a module-level variable.
3. **Corrupt asset error type:** a corrupt asset would throw a plain Error rather than `Unavailable`. The caller in `sessions.ts` catches everything, so the behaviour is the same, and the drift test prevents it.
4. **Formatting:** `pi-editor-gate.ts` was moved verbatim and not run through Prettier. Lint passes.

## Checks run
- `generate-control-protocol.mjs --check`: passed. `generate-pi-artifact-profiles.mjs --check`: passed.
- Vitest on `desktop/hooks`, `desktop/agents` and `src/host` with both native binaries: 46 files passed, 1 skipped; 1,140 tests passed, 31 skipped.
- `host-editor.integration` (5 tests) and the profile drift tests passed.
- `pnpm run lint`: exit 0.
- `tsc -skipLibCheck -p tsconfig.test.json`: exit 0. The earlier T-14 errors in `SkillList.tsx` are gone.

**Not verified:**
- The `program-identity` tests that need a real Pi artifact (30 tests). They skip without `HUHU_PI_ARTIFACT_TEST_ROOT`, and the evidenced root `/tmp/huhu-t08-b-producer-proof` no longer exists. So the decoded profile has not been checked against a real Pi install, though it deep-equals the source JSON.
- Real Obsidian/Pi end-to-end.
- `cargo test`: not needed, because `wire_generated.rs` is byte-identical.

Scratch files are in `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/bundle-review/`.