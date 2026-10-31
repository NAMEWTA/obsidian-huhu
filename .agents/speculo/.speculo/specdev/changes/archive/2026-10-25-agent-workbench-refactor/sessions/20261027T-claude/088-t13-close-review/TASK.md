# 088 — Independent review: T-13 explicit-close resource cleanup (delta after review 081)
You are an INDEPENDENT READ-ONLY reviewer. You did not implement this. Do not modify any file except your REPORT.md.
Repo: /home/wta/orca/workspaces/obsidian-huhu/terminal. CHG = .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor.
Inputs: ticket CHG/ticket/13-independent-browser.md; spec CHG/spec.md (AC-041, AC-061; "close display ≠ destroy"; Browser independent of Agent lifecycle); prior review CHG/sessions/20261026T045732Z/081-t13-final-review/REPORT.md; implementer report CHG/sessions/20261027T-claude/085-t13-close-cleanup/REPORT.md; project rules AGENTS.md, .agents/skills/dev/SKILL.md.
Scope files (frozen hashes in SCOPE.sha256 next to this file; verify with `sha256sum -c`): src/app/contracts/workbench-host.ts src/shell/host/workbench-pages.ts src/shell/host/workbench-pages.dom.test.tsx src/app/workbench/compose-workbench.ts src/app/workbench/browser-contribution.test.ts src/modules/browser/ui/workbench-page.tsx src/modules/browser/services/host.ts src/modules/browser/api.ts
Use `git diff -- <file>` to see changes vs HEAD (note: those diffs also include earlier T-13 work already accepted by 081; focus on closeResource/removal semantics, but report anything high-severity you see).

Return two axes separately:
- standards: correctness, races (concurrent close, close during navigate/restore, dispose during removal), error handling, idempotency, code idiom vs surrounding code, test quality (do tests actually prove the claims?).
- specification: explicit close deletes persisted Browser record; hide/switch/unload/Agent disable/plugin unload never delete; failure keeps tab+record consistent; no recursion; no regression of 081-accepted behavior.
For each finding: severity (high/medium/low), file:line, concrete failure scenario, fix condition. Verdict per axis: pass | request-changes.
You may run read-only checks: vitest on scope tests, tsc --noEmit (test config), eslint on scope files.
Write REPORT.md in this directory; reply with the verdicts and findings summary.
