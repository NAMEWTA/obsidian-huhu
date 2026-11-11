<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
**Re-review verdict (T-14 Round 6): standards pass, specification pass.** S-L5 is closed, P-L7 is mostly closed, and the evidence sentence is fixed. I found no new medium or high issues, and I changed no repository files.

**Checks run, all green:**
- **vitest** with the real PTY and control binaries on `src/modules/agent/services` and `src/modules/automations`: 85 files passed and 2 skipped; 769 tests passed and 9 skipped.
- **tsc** (`tsconfig.test.json --noEmit --skipLibCheck`): no errors.
- **Bundle check** (`check-bundle.mjs --budget scripts/bundle-budget.json --enforce`): "budget: within limits".

**S-L5 (quick-command working directory): closed.**
- **Path handling:** `runQuickCommand` (`controller.ts:1147-1179`) first resolves the saved directory against the vault, folding `.` and `..`. It then runs that path and the vault itself through `canonicalVaultCwd`, which resolves symlinks. It passes `cwdScope = {vaultRoot: <real vault root>, platform: runtimeProcess().platform}`, so macOS is no longer treated as Linux. This now matches how automations check their directory (`agent-runtime.ts:759-776`).
- **Old commands (AC-044):** the vault path and `.` become the real vault root. `spaceBoundCwd`'s same-root clause then maps that to the Space directory, in any Space. A relative folder inside the Space is honoured; a relative folder outside it is refused. The symlinked-vault test in `controller-quick-command.test.ts` covers the vault path, `.` and `inner`. The test at `workspace-service-spaces.test.ts:473-496` covers the vault path starting in the Space directory.
- **Refusals:** a directory outside the vault, a missing one, or one that can't be read makes `canonicalVaultCwd` throw. The caller catches that and turns it into `SpaceError('DIRECTORY_NOT_AUTHORIZED','cwd-outside-space')` before any workspace call. Nothing is recorded or spawned, and nothing crashes; the tests assert the call count and the `update` count. A directory that is in the vault but outside the Space is refused in `createManagedWithContext` before `prepareSession`. The test confirms there is no new Session record and no spawn.
- **No regression without `cwdScope`:** interactive `newTerminal`/`newAgent` (menu, JumpPalette, SpaceEmptyState) pass no directory, so the check is skipped. With a directory but no `cwdScope` (vault path unknown), the old behaviour remains: vault root `''` and platform guessed from the path's spelling. All UI callers catch the error (`.catch(report)`, or the Omnibox try block).

**P-L7 (automation fact rows): mostly closed.**
- `spaceFact` now separates an unknown Space list (`undefined`, agent module off) from a Space that is gone. The first shows "Space: <id>", the second "Unavailable". `AutomationsPage.dom.test.tsx` covers both.
- What remains is low: the module-level mutable `bindSpaceLookup` is still set during render (`AutomationsPage.tsx:78`). When the agent module is off, the raw ID is shown, which is a deliberate trade-off.

**Evidence wording: fixed.** `T-14-budget-attribution.json` now says that the other inputs' differences from HEAD come from earlier tickets and are not covered by the file. The old, wrong "already inside the previous limits" claim is gone. `bundle-budget.json`'s reason text matches.

**Low findings:**
1. **Windows UNC vault paths:** `resolveRequestedCwd` (`agent-runtime.ts:227-236`) turns a UNC vault root into a POSIX-style path. With vault `\\server\share\vault`, `.` becomes `/server/share/vault` and `inner` becomes `/server/share/vault/inner`, which I checked with node. Old relative and `.` quick commands on a UNC-hosted Windows vault are therefore refused. HEAD's `sessionDirectory` used `path.resolve` and handled this. It fails closed with a message, and the absolute vault path still works. Fix: use `path.win32`/`path.posix` resolve, or keep the `\\` prefix.
2. **Misleading refusal reason:** a missing or unreadable folder is reported as `cwd-outside-space` ("not in the Space's authorized range") rather than as missing.
3. **Docs slightly stale:** `docs/agent-workbench.md:64` doesn't say that the whole-vault path or `.` maps to the Space directory. A reader would expect those to be refused.
4. **Carried over:** S-L3 (vestigial `_scope`), S-L6 (writer-port collision flakiness, which did not occur this run), and the cosmetic chooser hint text.

**Not verified:** a real Obsidian run, a Windows or UNC vault, and macOS case folding at runtime.