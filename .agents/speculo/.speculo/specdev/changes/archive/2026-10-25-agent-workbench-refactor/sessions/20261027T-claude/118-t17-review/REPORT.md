<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
# T-17 independent review (CLI delivery: AC-019, AC-062, AC-064)

**Scope:** `sha256sum -c 118-t17-review/SCOPE.sha256` matches all 36 files. I ran it at the start and again at the end, after the session reset, and nothing changed, so every result below is from the frozen snapshot.

**Verdicts**
- **standards: request-changes** (one medium: M1)
- **specification: request-changes** (one medium: M2, an AC-062 gap plus a docs claim that is wrong)

The supply-chain core holds up. The order is digest, then the compat record bound to that exact digest, then the download, then a hash check, an atomic rename and a sealed receipt. The compat facts are sealed into the receipt and checked again on every reuse, online and offline. The plugin itself never runs the CLI. The CI matrix and the release verifier are strict and correct.

## Checks run (all on the frozen snapshot)

| Check | Result |
|---|---|
| `HUHU_TEST_PTY_BINARY=… HUHU_TEST_CONTROL_BINARY=… vitest run test/release src/host/desktop/native src/modules/agent/platform src/shared/native` | exit 0: 539 passed, 31 skipped. The skips predate T-17. |
| `node scripts/verify-pty-helper.mjs …/huhu-pty …/huhu` | exit 0 ("control CLI verified (0.0.1, protocol 1)"; "terminal helper verified (linux, 0.0.1)") |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0. The earlier T-16 errors are gone, and there are none in T-17 files. |
| `pnpm run lint` | exit 0 |
| `pnpm run check:notices` | exit 0 (100 npm packages, 73 crates; the "Linked into huhu-pty and huhu" section is present) |
| `pnpm run test:i18n` | exit 0 (5081 keys; placeholders match) |

Not run: the Herdr similarity check, which needs a network clone (I'm relying on the implementer's run of it); `cargo test` (no native change); the build; and any platform other than Linux x64.

## Findings

### M1 (medium, standards): every terminal and agent launch now waits on the CLI install, network fetch included
- **Where:** `src/modules/agent/services/controller.ts:221-227`. `environment()` awaits `native.cli()`. `src/modules/agent/services/terminal/sessions.ts:456` awaits `this.host.environment()` before it allocates and spawns any session, managed runtimes included.
- **What happens:** `cli()` leads to `diagnoseCli` and `ensureCli`. When the CLI isn't already receipt-verified, that fetches `.sha256`, then `.compat.json`, then the binary, each with a 60 s timeout (`binary.ts:14`). Failures are not cached, and `request.signal` is not passed through.
- **Failure scenario 1:** The helper is verified, but the CLI is in any non-ready state that involves the network, for example:
  - the release is incompatible or has no CLI asset, so every open re-fetches two files;
  - a captive portal or firewall silently drops packets, so the first request hangs until its 60 s timeout.

  Every new terminal, and every automation-launched agent runtime, then waits for that network round trip before it spawns, on every open. The comment "the terminal opens either way" is only true after the wait.
- **Failure scenario 2:** On first use, the multi-MB CLI download is added to the first terminal's start time, one after the other with the helper.
- **Fix condition:** Terminal or runtime spawn must never wait on CLI network work beyond the fast receipt-verified path. Acceptable shapes: a negative result cached per version and session, or install in the background with a short bounded wait and inject only when ready. If anything is still awaited, thread `request.signal` through. Add a test where a slow or hanging `cli()` does not delay `create()`.

### M2 (medium, specification AC-062 + docs accuracy): a release without the CLI asset is reported as "download failed", not as a compatibility refusal
- **Where:**
  - `src/host/desktop/native/binary-cli.ts:57-65`: a 404 maps to `compatMissing` only for the `.compat.json`.
  - `binary.ts:192`: a 404 on the CLI `.sha256` stays `http`.
  - `binary-cli.ts:103`: diagnosis turns that into `downloadFailed`.
  - The test pins this behaviour: `binary-cli.test.ts:122` expects `'http'`.
- **What happens:** For a release that has only the helper (old release, prerelease, or a dev build whose tag has no CLI), the `.sha256` returns 404. The user then sees "The download failed or was interrupted. Check the network and try again from the terminal settings." That is the wrong next step for a deterministic condition, and AC-062 asks for an explicit compatibility error.
- **Docs mismatch:** `docs/agent-workbench-cli.md:167` explicitly claims this case ("例如旧版 Release 只有 helper") is refused with `incompatible`/`compatMissing`. That is not true.
- **Fix condition:** In the CLI spec, map an HTTP 404 on the CLI `.sha256` to `compatMissing` ("This release publishes no compatible command-line tool"). Keep network, timeout and 5xx as `downloadFailed`. Update the test to expect `compatMissing`, and the docs sentence if the wording changes.

### Low findings (separate; not blocking on their own)

**L1. `exposeCli` trusts the asset's current bytes, not the sealed digest** (`binary-cli.ts:116-125`)
- `want = digest(asset)` is recomputed from the asset file at expose time. The copied temp file is never re-hashed before the rename.
- The comment "copy is made from the already-verified file and re-hashed" overstates this.
- Scenario: a write to `.huhu/helpers/...` between `ensureCli`'s hash and `exposeCli`'s copy gets exposed on PATH. The window is narrow and needs same-user or synced write access, which is excluded for `.huhu/helpers/`.
- Fix: return the verified digest (or bytes) from `ensureAsset`, compare the target and temp against it, and verify the temp before the rename.

**L2. The docs header contradicts the delivered behaviour** (`docs/agent-workbench-cli.md:3`)
- It says "PATH 管理仍不在本交付范围内", but the new section "终端里如何找到 `huhu`" says HUHU prepends `bin/` to PATH and sets `HUHU_CLI` for HUHU terminals.
- Fix: say that the PATH is per-terminal and injected, and that HUHU does not touch the shell config or the global PATH.

**L3. The docs state list leaves out `downloadFailed`** (`docs/agent-workbench-cli.md:167`)
- The list of diagnosis states omits `downloadFailed`, which exists in the code and the i18n.

**L4. The settings "Check tool" button can silently show nothing** (`lazy-host.ts:20,24`, `controller.ts:953`)
- The `closed`, `load` and `unsupported-host` states return `text: ''`. `TerminalSettings` shows `cli || description`, so clicking "Check tool" visibly does nothing.
- Fix: use localized `agent.cli.state.unavailable` / `next` text.

**L5. `agent.cli.next.unavailable` gives the wrong advice for most causes**
- It says "Close other Obsidian windows that use it", but `unavailable` also covers unknown, permission and receipt errors, not only `inUse`.
- Fix: split out `inUse`, or make the text neutral.

**L6. Orphaned doc comment** (`src/shared/native/host.ts:233`)
- The JSDoc for `NativeHostAccess` ("Acquisition is lazy and abortable…") now sits above `NativeCliState`, so it no longer documents the interface. Move it back.

**L7. The provenance registry is incomplete** (`docs/third-party/agent-workbench-cli.md`)
- The per-file table and the similarity `--ours` set cover Round 1 files only.
- Missing from both: `platform/desktop/control/cli-environment.ts`, `platform/desktop/skills/packaged.ts`, and the Round-2 edits to `runtime.ts`, `lazy-host.ts`, `controller.ts` and `TerminalSettings.tsx`.
- All are original work, but the document claims to be per-file.

**L8. `HUHU_CLI_BINARY` is undocumented**
- This dev override skips the compat check (same as `HUHU_PTY_BINARY`) and is not mentioned in any doc.

**L9. Performance**
- Each terminal open hashes the CLI file three times: once in `ensureAsset` and twice in `exposeCli`. It's small, but it adds to M1.

**Already known / out of scope**
- `docs/data.md` and `docs/agent-workbench.md` (held by T-16) still need the `.huhu/skills/` and `.huhu/helpers/.../bin/` text. The implementer listed this.
- Nothing checks the Cargo crate version against the release tag. This was already true for the helper. `verify-pty-helper` does check that the CLI version equals the helper hello version.

## Axis notes

**Supply chain**
- Order is correct: digest, then vet (compat `asset` must equal the name and `sha256` must equal the published digest), then `accept`, then download, then hash check, write and rename.
- Compat detail is sealed in the receipt with context `[dir, name]`, in a separate `huhu-cli.json` stamp, so a helper receipt cannot vouch for the CLI.
- Offline and online reuse both re-run `accept`. A receipt with no compat detail is rejected; there is a test for this.

**Windows**
- `huhu-win32-x64.exe` and `bin/huhu.exe` are handled.
- `Path` keeps its original case via a case-insensitive lookup, with a `;` separator. This is unit-tested only.
- The rename over a running exe is avoided when the digest already matches.

**PATH prepend**
- The directory contains only `huhu[.exe]`, so the only thing it can shadow is a user tool named `huhu`.
- Prepending is the right choice so the verified copy wins.
- Nothing is added unless the state is `ready`.

**CI**
- 5-entry matrix; both binaries are run through the verify script on their own runner.
- The compat record is generated from the just-built binary's `--json version` output.
- `release.yml` smoke-tests the packaged Linux CLI.
- `verify-release-artifacts` requires exactly 10 binaries, 10 checksums and 5 compat records, with no unexpected fields, and the protocol majors must equal `control-schema.json`.
- Tests for these are good: wrong major, wrong helper protocol, foreign digest, asset name, extra fields, invalid JSON, stray file.

**Skill**
- Written only to `.huhu/skills/huhu-control/SKILL.md`. A test shows the account home stays empty until the existing explicit toggle; the stale copy marker is reused.
- Every English example runs against the real CLI, helper and host, and is forwarded exactly once to the right operation.
- The zh examples have the same shape; the test compares them, it doesn't execute them.
- A 16 KiB stdin body arrives intact; 16 KiB + 1 gives `CAPACITY_EXCEEDED` with exit 2 before the workbench is reached.
- `WAIT_TIMEOUT`, `AGENT_BLOCKED` and `EFFECT_UNKNOWN` are forwarded once and never retried, and `session get` is used for recovery.
- Every exit code the Skill names matches the schema.

**AC-019**
- `help` and `schema` are checked against the canonical schema in CI and locally.
- Error classes come from `code` and exit codes, not text.

**AC-064**
- All new user text goes through `t()` with en and zh.
- The provenance doc covers Herdr (Apache-2.0 at `2ecf19a`), Wave and tmux docs, and states mechanism-only: nothing copied, no GPL. This matches reference-notes K-07.
- Within that, see L7.

## Fix conditions to reach pass
1. **M1:** CLI preparation no longer blocks terminal or runtime spawn on network I/O, or is strictly bounded, abortable and negatively cached, with a test.
2. **M2:** a missing CLI `.sha256` (404) gives `compatMissing`; test and docs updated.
3. Recommended along with these: L1, L2, L3, L4. The other lows can be done at your discretion.