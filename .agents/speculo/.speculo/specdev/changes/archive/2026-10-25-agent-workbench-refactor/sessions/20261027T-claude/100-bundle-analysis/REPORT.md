<!-- Saved by Lead: read-only bundle attribution analysis (Sonnet 5.5). -->
The tree no longer matches the numbers you gave, and two budgets can be fixed with code changes instead of raising them. I wrote nothing to the repo. All work is under `.../scratchpad/bundle/`: a `git archive HEAD` copy with a `node_modules` symlink, the analysis scripts, and `cur.json`, `head.json` and `real.json`.

## 1. How each metric is measured

`scripts/check-bundle.mjs` rebuilds in memory with `pluginBuildOptions({production:true})` and reads `bytesInOutput` per input from the metafile.
- **main.js** is `outputs['main.js'].bytes`, the whole file including the banner.
- **startup-evaluated** is the sum over inputs reachable from `src/app/main.ts` through static edges only.
- **module activation** is, for `src/modules/<id>/module.ts`, its static closure plus every `import()` target in `module.ts` that is not `*-page.ts(x)`, minus the startup set. Pages and second-level dynamic imports count as "deferred".

My run of `check-bundle.mjs --budget` on the current tree, compared with the figures you gave:

| Metric | Your figure | Current tree | Budget | HEAD |
|---|---|---|---|---|
| main.js | 6,785,753 | **6,813,291** | 6,758,400 | 6,033,579 |
| startup | 124,918 | **124,918** | 123,904 | 122,867 |
| agent | 1,386,063 | **1,409,693** | 1,370,112 | 990,665 |
| browser | 104,246 | **104,246** | 103,424 | 102,450 |

Agent and main.js are 23.6 KB and 27.5 KB larger than what you saw. Startup and browser are identical. Source files such as `control-wire.generated.ts`, `i18n.ts`, `controller.ts`, `native-resume.ts`, `space-service.ts`, `SessionHistoryPanel.tsx` and `control/*` are newer than the committed `main.js`, so the tree has changed since your measurement. Re-measure before recording any budget.

## 2. Attribution

### Startup (+2,051 vs HEAD, over by 1,014)
| Input | Bytes added |
|---|---|
| `src/app/main.ts` | +1,055 |
| `src/app/workbench/compose-workbench.ts` | +629 |
| `src/shared/storage/vault-layout.ts` | +146 |
| `src/host/obsidian/storage/device-id.ts` | +120 |
| `src/host/obsidian/storage/private-storage.ts` | +72 |
| `src/app/contracts/workbench.ts` | +28 |

- **`main.ts`** (T-01/T-02/T-13): the lazy native-host accessor (`import('./native')`), `ensureSharedWorkspace` (`import('../modules/agent/module')`), their dispose paths, and two extra fields on the module context.
- **`compose-workbench.ts`** (T-13): the `browser` feature definition (rail, navigation, availability, `closeResource`).
- **`vault-layout.ts`**: `agentWorkbenchPath`.

No new module entered the startup graph. `lazy-host`, `host.ts` and `helper.ts` are not startup inputs, and the browser workbench page and the shared-workspace owner both load behind `import()`. Most of the large git diff in these files is Prettier reformatting and does not change the bytes.

### Browser activation (+1,796, over by 822)
| Input | Bytes added |
|---|---|
| `src/shared/native/cookies.ts` (new) | +805 |
| `src/modules/browser/module.ts` | +764 |
| `src/modules/browser/services/host.ts` | +197 |
| `src/host/desktop/browser-session-migration.ts` | +21 |
| `src/host/desktop/private-mode.ts` | +5 |
| `src/host/desktop/huhu-paths.ts` | +4 |

- **`cookies.ts`**: the Browser-owned cookie lease (replaces `NATIVE_HELPER_SQLITE`).
- **`module.ts`**: the `SharedWorkspaceOwner` adapter, which also keeps the old `AGENT_BROWSER_TABS` fallback branch.
- **`ui/workbench-page.tsx`**: not counted, because it is already behind a `-page` dynamic import.

Nothing new can be made lazy without behaviour change. All of it is T-13 feature code.

### Agent activation (+419,028 vs HEAD)
Largest contributors, with the lazy-ness verdict:

| Input | Bytes added | Verdict |
|---|---|---|
| `shared/native/control-wire.generated.ts` | +86,629 | See below. |
| `agent/i18n.ts` | +39,875 | Registered at module load and shared by services and UI. UI-only prefixes (`inbox`, `tools`) total only about 6 KB, so a split is not worth it. |
| `services/workspace-service.ts` | +37,216 | Core. |
| `services/spaces/space-service.ts` | +31,437 | Core, and also a dynamic root of `module.ts`. |
| `services/terminal/session.ts` | +25,214 | Core. |
| `services/terminal/session-screen.ts` | +21,161 | Static from `session.ts` and `sessions.ts`, created synchronously. |
| `services/terminal/session-screen-xterm.ts` | +8,362 | Same. |
| `platform/desktop/hooks/native-extensions.ts` | +18,466 | Lazy-able, see below. |
| `platform/desktop/hooks/hook-spool.ts` | +16,733 | Reached from `native-extensions.ts` and `automation-hooks.ts`. |
| `services/terminal/sessions.ts` | +12,829 | Core. |
| `services/workspace-service-panes.ts` | +12,043 | Core. |
| `services/controller.ts` | +11,302 | Core. |
| `shared/native/control-wire.ts` | +10,357 | Core. |

`control-wire.generated.ts` is 86,629 bytes in the bundle. Measured by transforming each part with esbuild:
- `editorEmbeddedCodecSource()` is a 48,664-byte string literal holding a standalone Node-free codec for the Pi extension.
- `controlDescriptor()` is 34,201 bytes and is used by the runtime validators, so it must stay.
- The rest is constants and types, about 3.9 KB.

By ticket (path-heuristic buckets, approximate; i18n and `module.ts` land in T-09):

| Ticket(s) | Agent activation | main.js total |
|---|---|---|
| T-08 control wire, CLI, coordination | +118,421 | +159,969 |
| T-09 workbench panels and workspace | +105,450 | +146,547 |
| T-02 spaces | +44,178 | +50,131 |
| T-06 hooks and activity | +43,412 | +43,412 |
| T-01/03/04 native owner, managed runtime, stop | +43,292 | +111,128 |
| T-05 screen stream | +33,318 | +49,151 |
| T-12 native resume, Pi artifact | +13,162 | +167,179 |
| T-10 inbox | +8,821 | +28,173 |
| T-11 vault history | +7,965 | +14,039 |
| T-13 browser | +805 | +4,961 |

### main.js total (+779,675 vs HEAD, over by 54,891)
The big single items are:

| Input | Bytes added |
|---|---|
| `agents/pi-artifact-profiles.json` | +145,937 |
| `control-wire.generated.ts` | +86,629 |
| `i18n.ts` | +39,875 |
| `workspace-service.ts` | +37,216 |
| `host/desktop/native/helper.ts` | +35,868 |
| `host/desktop/native/host.ts` | +24,330 |

The profiles JSON alone is larger than the main.js overage.

No test or fixture files are bundled, and no new npm dependencies appeared (only lucide `send`, +264 bytes). Both findings were checked in the metafile.

## 3. Proposed code changes (all avoid raising budgets)

**A. Agent activation: defer the Pi editor codec and `native-extensions` (expected −71 KB, brings agent to about 1.339 MB).**
1. Change `scripts/generate-control-protocol.mjs` (around lines 360–366 and the `--check` list at about line 399) to emit `editorEmbeddedCodecSource()` into its own file, for example `src/shared/native/control-wire-editor-codec.generated.ts`. Remove it from `control-wire.generated.ts`. This takes about 48.7 KB out of `control-wire.generated.ts`, which `control-wire.ts` imports statically. Update the two importers:
   - `native-extensions.ts:5`.
   - The test `src/host/desktop/native/host-editor.integration.test.ts:90`, which currently imports it from `control-wire`.
2. In `hooks/system-hooks.ts` (lines 8, 467, 538), `hooks/automation-hooks.ts` (lines 5, 61, 73, 445) and `hooks/remove-status-hooks.ts` (lines 4, 29), replace the static `import … from './native-extensions'` with `await import('./native-extensions')` at the point of use. All those sites are already in async functions.
3. `automation-hooks.ts:31` calls `piEditorArgumentGate` synchronously. Move that function, which has no dependencies on the template strings, into a small sibling file such as `hooks/pi-editor-gate.ts` and keep that import static.

I simulated step 2 with the metafile edges: cutting the three static edges removes `native-extensions.ts` (22,391 bytes). Splitting the codec string adds about 48,664 bytes of saving. Together that is about 71 KB, taking agent from 1,409,693 to roughly 1,338,6xx. `main.js` total is unchanged by this, since the code is still bundled.

Risk: moderate. It touches the generator, its `--check`, and the install and verify paths for the Pi extension (T-06/T-08).

**B. main.js total: gzip the Pi artifact profile (expected −60 KB, about 6.753 MB).**
`pi-artifact-profiles.json` is 145,937 bytes in the bundle (174,747 on disk). Its 1,279 records are hashed into `fileSetSha256`, so they cannot be pruned. I measured `zlib.compress` at level 9 of the minified JSON and got 64,221 bytes, or 85,628 base64.
- Ship the profile as a generated text or base64 asset, using the build's existing `.md`/`.svg` text-loader pattern in `scripts/esbuild-options.mjs`.
- In `program-identity.ts` (the `import('./pi-artifact-profiles.json')` at about line 131), replace the import with `JSON.parse(zlib.gunzipSync(Buffer.from(b64, 'base64')))`. `node:zlib` is a Node builtin, already external and used on desktop only.

That gives about 6,813,291 − 60,300 ≈ 6,753,000, under 6,758,400 with about 5 KB of headroom. The decoded object is identical, so behaviour does not change. A cheaper alternative that drops only the base64 overhead is not worth it.

**C. Startup and browser: no avoidable growth found.** Both are small feature code with no lazy opportunity (see §2).
- Startup:
  - Moving the `closeResource` body out of `compose-workbench.ts` into a dynamic import would save about 300 bytes.
  - The shared-workspace loader in `main.ts` could shrink by a similar amount.
  - Together that is under the 1,014 needed, so I do not recommend it.
- Browser: dropping the legacy `AGENT_BROWSER_TABS` fallback branch in `browser/module.ts` is a behaviour decision for T-13, not a size fix.

## 4. Proposed budget update (T-03 convention)

Do this after A and B land and the numbers are re-measured. The convention is minimum-KiB ceilings plus `*BudgetReason` strings that reference an evidence JSON such as `T-XX-budget-attribution.json`.

| Budget | Current | If A and B land | If only raised |
|---|---|---|---|
| `outputBytes` | 6,758,400 | **unchanged**, measures about 6.753 MB | 6,813,696 (6,654 KiB) |
| `moduleActivationBytes.agent` | 1,370,112 | **unchanged**, measures about 1.339 MB | 1,410,048 (1,377 KiB) |
| `eagerBytes` | 123,904 | **124,928** (122 KiB) | 124,928 |
| `moduleActivationBytes.browser` | 103,424 | **104,448** (102 KiB) | 104,448 |

- **Startup and browser raises are justified.**
  - Startup measures 124,918 bytes, so 124,928 leaves 10 bytes of headroom.
  - Browser measures 104,246 bytes, so 104,448 leaves 202 bytes.
- **Startup attribution (+2,051 vs HEAD):** `main.ts` +1,055, `compose-workbench.ts` +629, `vault-layout.ts` +146, `device-id.ts` +120, `private-storage.ts` +72, others +29.
  - Native-host and shared-workspace lazy accessors: T-01/T-02.
  - `browser` feature definition: T-13.
  - `agentWorkbenchPath`: T-09.
- **Browser attribution (+1,796 vs HEAD):** `cookies.ts` +805, `module.ts` +764, `host.ts` +197, the rest +30. All T-13 Browser-owned cookie lease and shared-workspace adapter.
- **Evidence files:** write the per-input tables above into a new `T-13-budget-attribution.json` and a bundle report, and reference them from `eagerBudgetReason` and `moduleActivationBudgetReason`. Use the numbers from the post-fix build, not from this snapshot.

If A and B are rejected, the fallback is raising all four budgets to the "If only raised" column. That needs the attribution tables in §2 recorded per ticket, and I would flag the 145.9 KB profiles JSON as the one item that is avoidable.