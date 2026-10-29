# Common rules for every implementer in this session (Lead: claude:/root)

Repo: /home/wta/orca/workspaces/obsidian-huhu/terminal (git worktree, branch NAMEWTA/terminal). Work in place; do NOT create worktrees/branches.
Change dir: .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor (abbrev. CHG).

- Read AGENTS.md first, then .agents/skills/dev/SKILL.md (and .agents/skills/ui/SKILL.md if you touch UI). Follow them.
- Authorities: CHG/spec.md (behavior, ACs), CHG/DESIGN.md (UI), CHG/implementation-contracts.md (cross-ticket contracts/CLI), your ticket file in CHG/ticket/. Read only the sections you need.
- Write ONLY the paths listed in your TASK "Write set". Many other files in the worktree are dirty from earlier tickets — that is expected; never revert, reformat or "clean up" them.
- Do NOT run `pnpm run build`, do NOT modify main.js / styles.css (Lead owns generated bundles). Do NOT commit, push, stash, or touch git index.
- Do NOT edit CHG/*.md, tickets, evidence, goal-plan or tickets-map (Lead owns them). Write your report to the REPORT.md path in your TASK.
- User-facing strings via t() with both en and zh in the owning dictionary.
- No GPL terminal code copying. Unfamiliar functionality: briefly check an actively maintained, clearly licensed OSS project for the approach and cite it in your report.
- Allowed verification: `pnpm exec tsc -p tsconfig.test.json --noEmit --skipLibCheck`, `pnpm exec vitest run <files>`, `pnpm exec eslint <files> --max-warnings 0`, `pnpm exec prettier --check <files>`, `pnpm test:architecture`, `cargo test --locked --manifest-path native/pty-server/Cargo.toml <filter>`, `cargo clippy` if used in CI. Never delete/skip tests or weaken assertions to get green.
- Real Obsidian / real Provider / five-platform E2E is the USER's job; do not claim it.
- If you hit a blocker that needs a write outside your set or a product decision, stop that branch and describe it precisely in REPORT.md.

REPORT.md must contain: summary of behavior delivered; exact changed paths; each command run with exit code and key output lines; tests added; remaining gaps/risks; explicit "SOURCE STOPPED" line at the end.
