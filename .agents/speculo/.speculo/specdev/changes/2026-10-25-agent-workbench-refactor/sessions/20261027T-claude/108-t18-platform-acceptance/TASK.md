# 108 — T-18: platform acceptance — code-level aggregation, DESIGN page audit, five-platform manual checklists
Ticket: CHG/ticket/18-platform-acceptance.md (ACs ["AC-061","AC-063"]). Read the WHOLE ticket body (目标/行为/有序执行路线/验收/验证方法/执行约束). Read common rules: ../COMMON.md.
Upstream evidence: CHG/evidence/T-01.md … T-16.md and REPORTs under CHG/sessions/20261027T-claude/. Contracts: CHG/implementation-contracts.md (CLI v1, receipts/exit codes, capability).
Deliver per ticket route 1–5 within code-level scope: freeze source digest; verify CI matrix config for all five OS/arch for native/CLI build+test; run all local automation on Linux x64; aggregate 64-AC automation evidence into CHG/evidence/T-18-ac-matrix.md (AC → tests/evidence → status; manual items marked user-owned not run); add meaningful cross-ticket regressions only where gaps exist (no stubs); audit DESIGN four pages' production components/states/focus/size/i18n/a11y with DOM/style automation; produce per-OS/arch executable manual checklists (docs/agent-workbench-acceptance.md or the ticket's named path) covering two Spaces, background A/B, cross-Space prompt/wait/read, human approval, close panel reattach, history continue/conflict, independent browser, exit recovery, Codex/Claude, six entries, IME, multiline, directory/permission differences, migration/backup restore. Do NOT write CHG/evidence/final-review.md (Lead commissions the final independent review separately).
## Rules
No remote delivery: no push, no release, no tag, no workflow dispatch, no uploads. Do not claim any platform passed unless it actually ran here (this machine is Linux x64). No GPL terminal code. User-facing text via t() en+zh.

## Write set (from ticket frontmatter; main.js/styles.css are Lead-only)
.github/workflows/terminal-build.yml scripts/obsidian-acceptance/agent-workbench-*.mjs scripts/obsidian-acceptance/terminal-reliability.mjs scripts/obsidian-acceptance/workbench-probe.mjs scripts/verify-pty-helper.mjs test/release/** docs/agent-workbench.md docs/agent-workbench-cli.md docs/data.md 
If you need any other path, STOP that branch and report precisely.

## Checks
tsc (test config), vitest on new/touched tests, `pnpm run lint`, `pnpm test:architecture`, `pnpm run test:i18n`, `pnpm run check:notices`, `cargo test --locked --manifest-path native/pty-server/Cargo.toml` if native touched, and the ticket's 验证方法 commands that can run locally.
REPORT: CHG/sessions/20261027T-claude/108-t18-platform-acceptance/REPORT.md (if the write is refused, return the full report in your reply; end with SOURCE STOPPED).

## Lead carry-overs for T-18 (known residuals to include in the acceptance/hand-off docs and AC matrix)
- T-02 writer lease port is a deterministic hash of device + directory identity (writer-owner.ts writerPort, range 16384–65535). If an unrelated local process holds that port, Space writes fail closed with OWNER_CONFLICT:port-in-use for that vault. Tests now use injectable free ports (sessions/20261027T-claude/113-writer-port-flake). Document symptom + workaround (free the port / restart) in the user hand-off; production semantics unchanged.
- Observed load flakes: pty/binary.test.ts 5 s timeout and hook-spool rmdir ENOENT unhandled error under full parallel vitest (both pass alone). Investigate and fix if test-only (timeouts/cleanup races) — tests/fixtures are in your write set only if listed; otherwise report.
- Remaining controller-managed-runtimes.test.ts, ports.test.ts, writer-owner.test.ts still use hashed ports (same flake exposure); switch to freeWriterPorts() if in write set, else report.
