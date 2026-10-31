<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
## T-17 Round 3 re-review

**Verdicts**
- **Standards: pass.**
- **Specification: pass.**

No new findings at medium or above.

### Checks run (working tree, Linux x64)

| Check | Result |
|---|---|
| `HUHU_TEST_* vitest run test/release src/host/desktop/native src/modules/agent/platform src/modules/agent/services src/shared/native` | exit 0: 139 files, 1182 tests passed, 40 skipped (the same skips as before) |
| `node scripts/verify-pty-helper.mjs …/huhu-pty …/huhu` | exit 0: "control CLI verified (0.0.1, protocol 1)" and "terminal helper verified" |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `pnpm run lint` | exit 0 |
| `check-bundle --budget scripts/bundle-budget.json --enforce` | exit 0, "within limits". `outputBytes` is 6881280, recorded with a reason. |

Not run: the build, `cargo test`, and anything on a platform other than Linux.

### M1: closed

I traced the launch path end to end. The path is `sessions.ts:456`, then `controller.ts:222-226`, then `CliEnvironment.apply` in `cli-environment.ts`:
- **Before the bounded wait:** the launch awaits only `terminalEnvironment()` (unchanged) and a local dynamic import of the provider.
- **The wait itself:** a race between the shared `running` promise, a 300 ms timer and the abort signal. Nothing else is awaited.
- **No unbounded wait:**
  - The install lock (`installations` in `ensureVerifiedAsset`, keyed per kind, so separate from the helper) is reached only through `prepare()`.
  - The launch never waits on that promise past the timer, even when a settings Check holds the lock with a network install. The lazy-host `load()` is local.
  - `request.signal` is passed through. An already-aborted or aborted launch resolves immediately, then `throwIfAborted`.
- **Later launches get PATH:**
  - When the background install finishes, `last` becomes ready and `running` is cleared.
  - The next launch runs the fast receipt path again and gets `PATH` and `HUHU_CLI`.
  - The test "slow or hanging install never delays a launch… only later launches get the tool" covers this, and checks that one install is shared rather than restarted.
- **Negative cache:**
  - It lives on the controller-owned provider, so it lasts one module activation.
  - Only `remember()` (the settings Check) or a re-activation clears it. That matches `docs/agent-workbench-cli.md:180`.
  - A `prepare` that throws is not cached and is retried, still within the bound.
  - Ordering between Check and a background run is serialized by the install lock, so a stale failure cannot overwrite a newer Check result in practice.
- **Gap in test coverage:** the test is at the provider level, not through `TerminalSessions.create()`. The wiring in between is a two-line pass-through, so I accept it.

### M2: closed

- `AssetSpec.absentCode` maps an HTTP 404 on `.sha256` to `compatMissing` for the CLI spec only (`binary.ts`, the `published()` helper).
- The test at `binary-cli.test.ts:113-125` serves 404 on every `/huhu-linux-x64*` URL and expects `compatMissing` from both `ensureCli` and `diagnoseCli`. It also checks that 503 and timeout stay `downloadFailed`, and that the helper is still served.
- The docs at line 167 now match.
- **No regression in the helper path:** `HELPER_SPEC` has no `absentCode`, `vet` or `accept`. `binary.test.ts:169` still expects `http` with status 404 and passes.

### Lows from the previous review

- **L1: closed.** `ensureCliVerified` returns the sealed or published digest. `exposeCli` compares both the existing target and the temp copy against it before the rename, and cleans up the temp file on refusal. A test covers this, including poisoning the asset after verification.
- **L2: closed.** The header now says PATH and `HUHU_CLI` are injected only into HUHU's own terminals.
- **L3: closed.** The state list includes `downloadFailed`.
- **L4: closed.** `checkCli` substitutes `agent.settings.cliUnavailable` (en and zh) when the text is empty.
- **L5: closed.** The advice is neutral now; the hint about closing other windows is a conditional fallback.
- **L6: closed.** The JSDoc is back above `NativeHostAccess`.
- **L7: closed.** The provenance table lists `cli-environment`, `packaged`/`ops`/`host-ops`, `runtime`/`host`/`lazy-host` and `controller`/`sessions`/`TerminalSettings`/i18n. The similarity run was redone over the full tree.
- **L8: closed.** `HUHU_CLI_BINARY` is documented at line 180.
- **L9: mostly closed.** A ready launch now hashes the file twice (asset, then target), down from three times.
- **Data docs:** `docs/data.md` has the `.huhu/skills/huhu-control/` row and the `bin/huhu` helper row. `docs/agent-workbench.md` has the CLI paragraph, including "不等待安装".

### New lows (none blocking)

- **N1.** A tool that is already ready is re-verified on every launch, still within the 300 ms bound. If that hashing is slow (slow disk, or Windows antivirus), the launch silently gets no `huhu` even though `last` is ready. Accepted trade-off; documenting it is optional.
- **N2.** The docs' list of remembered non-ready states ("拒绝、离线缺失、下载失败") leaves out `unavailable`, which is also cached. That covers a transient lazy-host `load`/`closed` failure or an `inUse` during expose, and it hides the tool until a settings Check or re-activation.
- **N3 (evidence gap).** `107-t17-cli-delivery/REPORT.md` ends at Round 2. The Round 3 summary the Lead cited is not in the file.