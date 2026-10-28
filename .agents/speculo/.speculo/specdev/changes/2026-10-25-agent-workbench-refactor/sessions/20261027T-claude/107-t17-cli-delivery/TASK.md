# 107 — T-17: helper/CLI delivery in the five-platform asset+digest pipeline, help/schema/Skill, provenance/notices
Ticket: CHG/ticket/17-cli-delivery.md (ACs ["AC-019","AC-062","AC-064"]). Read the WHOLE ticket body (目标/行为/有序执行路线/验收/验证方法/执行约束). Read common rules: ../COMMON.md.
Upstream evidence: CHG/evidence/T-01.md … T-16.md and REPORTs under CHG/sessions/20261027T-claude/. Contracts: CHG/implementation-contracts.md (CLI v1, receipts/exit codes, capability).
Deliver per ticket route 1–4. Existing pipelines: .github/workflows (terminal-build, verify-release-artifacts), binary-download digest verification, scripts/third-party-notices.mjs. Integrate the T-07 `huhu` CLI binary alongside huhu-pty into the five-platform asset/digest flow and the plugin's download/verify path; protocol major compatibility check before executing; help/schema generated from the canonical control schema and checked; stdin long body, error output, offline reuse, mixed old/new assets tested; packaged HUHU control Skill resource with examples that are executed by a test (wait ≠ task success, blocked needs a human, timeout never resends); per-file provenance + NOTICE + similarity check. Prepare assets only (local build), no remote actions.
## Rules
No remote delivery: no push, no release, no tag, no workflow dispatch, no uploads. Do not claim any platform passed unless it actually ran here (this machine is Linux x64). No GPL terminal code. User-facing text via t() en+zh.

## Write set (from ticket frontmatter; main.js/styles.css are Lead-only)
native/pty-server/Cargo.toml native/pty-server/Cargo.lock native/pty-server/src/bin/huhu.rs src/modules/agent/platform/desktop/pty/binary*.ts src/modules/agent/platform/desktop/control/** src/modules/agent/core/control/** src/modules/agent/services/skill-manager*.ts src/modules/agent/platform/desktop/skills/** src/modules/agent/i18n.ts .github/workflows/terminal-build.yml scripts/verify-release-artifacts.mjs scripts/verify-pty-helper.mjs scripts/third-party-notices.mjs test/release/** package.json pnpm-lock.yaml NOTICE THIRD-PARTY-NOTICES.md docs/third-party/** docs/agent-workbench-cli.md docs/agent-workbench.md src/host/desktop/native/binary*.ts 
If you need any other path, STOP that branch and report precisely.

## Checks
tsc (test config), vitest on new/touched tests, `pnpm run lint`, `pnpm test:architecture`, `pnpm run test:i18n`, `pnpm run check:notices`, `cargo test --locked --manifest-path native/pty-server/Cargo.toml` if native touched, and the ticket's 验证方法 commands that can run locally.
REPORT: CHG/sessions/20261027T-claude/107-t17-cli-delivery/REPORT.md (if the write is refused, return the full report in your reply; end with SOURCE STOPPED).
