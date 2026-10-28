# T-04 固定独立审查输入

```json
{
  "scope": {
    "version": 1,
    "mode": "working-tree",
    "review_mode": "working-tree",
    "outcome": "changes",
    "base_sha": "33c21e098ef3188cbab5a09f3e0a01fadb787715",
    "observed_head": "33c21e098ef3188cbab5a09f3e0a01fadb787715",
    "selection": "explicit-files",
    "scope_paths": [
      "docs/agent-workbench.md",
      "main.js",
      "native/pty-server/Cargo.toml",
      "native/pty-server/src/bootstrap.rs",
      "native/pty-server/src/job.rs",
      "native/pty-server/src/main.rs",
      "native/pty-server/src/session.rs",
      "native/pty-server/tests/session_tree.rs",
      "native/pty-server/tests/stdio.rs",
      "scripts/bundle-budget.json",
      "src/host/desktop/native/helper.test.ts",
      "src/host/desktop/native/helper.ts",
      "src/host/desktop/native/host.integration.test.ts",
      "src/host/desktop/native/host.test.ts",
      "src/host/desktop/native/host.ts",
      "src/modules/agent/core/space/errors.ts",
      "src/modules/agent/core/workspace/managed-runtime.ts",
      "src/modules/agent/i18n.ts",
      "src/modules/agent/services/agent-runtime.test.ts",
      "src/modules/agent/services/agent-runtime.ts",
      "src/modules/agent/services/controller-managed-runtimes.test.ts",
      "src/modules/agent/services/controller-space.test.ts",
      "src/modules/agent/services/controller.ts",
      "src/modules/agent/services/launch/managed-errors.ts",
      "src/modules/agent/services/spaces/messages.ts",
      "src/modules/agent/services/spaces/records.test.ts",
      "src/modules/agent/services/spaces/records.ts",
      "src/modules/agent/services/spaces/space-service-lifecycle.test.ts",
      "src/modules/agent/services/spaces/space-service.ts",
      "src/modules/agent/services/terminal/clock.ts",
      "src/modules/agent/services/terminal/session.ts",
      "src/modules/agent/services/terminal/sessions-cancellation.test.ts",
      "src/modules/agent/services/terminal/sessions-space.test.ts",
      "src/modules/agent/services/terminal/sessions.e2e.test.ts",
      "src/modules/agent/services/terminal/sessions.ts",
      "src/modules/agent/services/workspace-service-launch-failures.test.ts",
      "src/modules/agent/services/workspace-service-native.test.ts",
      "src/modules/agent/services/workspace-service-spaces.test.ts",
      "src/modules/agent/services/workspace-service-stop-native.test.ts",
      "src/modules/agent/services/workspace-service-stop.test.ts",
      "src/modules/agent/services/workspace-service.test.ts",
      "src/modules/agent/services/workspace-service.ts",
      "src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx",
      "src/modules/agent/ui/AgentWorkspacePage.tsx",
      "src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx",
      "src/modules/agent/ui/sidebar/AgentSidebar.tsx",
      "src/modules/agent/ui/sidebar/SpaceNavigation.dom.test.tsx",
      "src/modules/agent/ui/sidebar/SpaceNavigation.tsx",
      "src/modules/agent/ui/sidebar/managed-lifecycle.tsx",
      "src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx",
      "src/modules/agent/ui/terminal/TerminalTabView.tsx",
      "src/modules/browser/module.test.ts",
      "src/shared/native/host.ts",
      "src/shared/native/termination.test.ts",
      "src/shared/native/termination.ts",
      "styles.css",
      "test/fixtures/native/terminal-termination-v1.json"
    ],
    "changed_paths": [
      "docs/agent-workbench.md",
      "main.js",
      "native/pty-server/Cargo.toml",
      "native/pty-server/src/bootstrap.rs",
      "native/pty-server/src/job.rs",
      "native/pty-server/src/main.rs",
      "native/pty-server/src/session.rs",
      "native/pty-server/tests/session_tree.rs",
      "native/pty-server/tests/stdio.rs",
      "scripts/bundle-budget.json",
      "src/host/desktop/native/helper.test.ts",
      "src/host/desktop/native/helper.ts",
      "src/host/desktop/native/host.integration.test.ts",
      "src/host/desktop/native/host.test.ts",
      "src/host/desktop/native/host.ts",
      "src/modules/agent/core/space/errors.ts",
      "src/modules/agent/core/workspace/managed-runtime.ts",
      "src/modules/agent/i18n.ts",
      "src/modules/agent/services/agent-runtime.test.ts",
      "src/modules/agent/services/agent-runtime.ts",
      "src/modules/agent/services/controller-managed-runtimes.test.ts",
      "src/modules/agent/services/controller-space.test.ts",
      "src/modules/agent/services/controller.ts",
      "src/modules/agent/services/launch/managed-errors.ts",
      "src/modules/agent/services/spaces/messages.ts",
      "src/modules/agent/services/spaces/records.test.ts",
      "src/modules/agent/services/spaces/records.ts",
      "src/modules/agent/services/spaces/space-service-lifecycle.test.ts",
      "src/modules/agent/services/spaces/space-service.ts",
      "src/modules/agent/services/terminal/clock.ts",
      "src/modules/agent/services/terminal/session.ts",
      "src/modules/agent/services/terminal/sessions-cancellation.test.ts",
      "src/modules/agent/services/terminal/sessions-space.test.ts",
      "src/modules/agent/services/terminal/sessions.e2e.test.ts",
      "src/modules/agent/services/terminal/sessions.ts",
      "src/modules/agent/services/workspace-service-launch-failures.test.ts",
      "src/modules/agent/services/workspace-service-native.test.ts",
      "src/modules/agent/services/workspace-service-spaces.test.ts",
      "src/modules/agent/services/workspace-service-stop-native.test.ts",
      "src/modules/agent/services/workspace-service-stop.test.ts",
      "src/modules/agent/services/workspace-service.test.ts",
      "src/modules/agent/services/workspace-service.ts",
      "src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx",
      "src/modules/agent/ui/AgentWorkspacePage.tsx",
      "src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx",
      "src/modules/agent/ui/sidebar/AgentSidebar.tsx",
      "src/modules/agent/ui/sidebar/SpaceNavigation.dom.test.tsx",
      "src/modules/agent/ui/sidebar/SpaceNavigation.tsx",
      "src/modules/agent/ui/sidebar/managed-lifecycle.tsx",
      "src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx",
      "src/modules/agent/ui/terminal/TerminalTabView.tsx",
      "src/modules/browser/module.test.ts",
      "src/shared/native/host.ts",
      "src/shared/native/termination.test.ts",
      "src/shared/native/termination.ts",
      "styles.css",
      "test/fixtures/native/terminal-termination-v1.json"
    ],
    "excluded_paths": [
      ".agents/skills/dev/references/architecture.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/LOG.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/README.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01-checks.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01-dispatch.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01-logs/huhu-t01-budget-analysis.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01-logs/huhu-t01-bundle-optimized.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01-logs/huhu-t01-controller-mutation.sha256",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01-logs/huhu-t01-review-rebuild-probe.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01-logs/huhu-t01-startup-boundary.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01-repair-checks.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01-review-round1.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01-review-round2.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01-startup-checks.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-01.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-checks-a-layout.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-checks-a-repair.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-checks-b.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-checks-root-layout.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-checks-root-repair.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-checks-root.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-dispatch-a.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-dispatch-b.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-dispatch-layout-repair.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-final-current-review.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-handoff-a-layout.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-handoff-a-repair.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-handoff-a.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-layout-repair-plan.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-a-layout-assert-observations.py",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-a-layout-rebuild-probes.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-a-repair-layout-probe.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-a-repair-storage-probe.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-a-visual.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-b-tsconfig.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-final-goal-validate.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-layout-probe-entry.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-layout-probe.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-layout-selection-probe-entry.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-layout-selection-probe.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-review-freeze-check.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-review-freeze-check.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-review-rebuild-probes.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-review-rebuild-selection-probe.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-review-round2-freeze-final.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-review-round2-freeze.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-review-round2-freeze.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-review-round3-freeze-final.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-root-budget-analysis.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-root-bundle-initial.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-root-layout-bundle-analysis.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-root-layout-bundle-final-analysis.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-root-repair-bundle-analysis.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-round2-layout.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-round2-storage.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-round3-extra-entry.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-round3-extra.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-round3-extra.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-round3-layout-selection.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-round3-layout.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-round3-rebuild-extra.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-round3-storage.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-storage-probe-entry.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-storage-probe.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-logs/huhu-t02-storage-probe.stdout",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-ports-draft.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-reused-t01.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-review-input-round1.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-review-input-round2.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-review-input.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-review-round1.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-review-round2.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-review-round3.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-source-a-round1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-source-a-round2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-source-a.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-source-b.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-visual/empty-480-theme-dark-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-visual/error-800-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-visual/form-480-theme-dark-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-visual/loading-800-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-visual/no-spaces-480-theme-light-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-visual/normal-1200-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-visual/normal-800-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-visual/results.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-api-frozen.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-api-proposal.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-budget-attribution-round1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-budget-attribution.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-bundle-report-round1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-bundle-report.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-checks-a-repair.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-checks-a.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-checks-b-v1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-checks-b.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-checks-c-fixture.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-checks-c.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-checks-root-repair.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-checks-root-round1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-checks-root.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-dispatch-a-repair.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-dispatch-a.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-dispatch-b.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-dispatch-c-fixture.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-dispatch-c.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-dispatch-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-final-current-review-after-format.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-final-current-review.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-frontier.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-handoff-a-repair.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-handoff-a.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-handoff-b.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-handoff-c-fixture.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-handoff-c.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-inputs-a.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-check-runner.py",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-a-repair-dispatch-pre-receipt.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-a-repair-dispatch-with-receipt.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-dom-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-dom-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-lint-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-lint-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-menu-focus-probe-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-menu-focus-probe.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-menu-green-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-menu-green-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-menu-green-v3.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-menu-green-v4.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-menu-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-omnibox-green-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-omnibox-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-reopen-probe-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-reopen-probe-red-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-reopen-probe-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-reopened-menu-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-reopened-menu-lint.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-reopened-menu-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-sidebar-green-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-sidebar-green-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-sidebar-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-terminal-green-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-terminal-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-visual-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-visual-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-visual-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-visual-v3.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-visual-v4.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-visual-v5.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-visual-v6.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-visual-v7.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-b-visual-v8.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-c-fixture-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-c-fixture-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-c-fixture-tsconfig.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-c-fixture-types-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-c-fixture-types.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-dispatch-validation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-done-goal-validator.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-final-implement-validator.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-native-c-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-native-c-tsconfig.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-native-c-types-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-native-c-types-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-native-c-verbose.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-repair-run.py",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-repair-upstream-0.txt",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-repair-upstream-1.txt",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-repair-upstream-2.txt",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-repair-upstream-3.txt",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-audit.py",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-probe-check.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-probe.cjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-probe.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-audit.py",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-checks.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-final-check.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-probe-check.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-probe.cjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-probe.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-record.py",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-report.py",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-run.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-unknown-probe-check.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-unknown-probe.cjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-unknown-probe.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-unknown-run.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-verify-fixed.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-round2-verify.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-run.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-review-verify.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-architecture.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-build-css.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-build.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-bundle-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-bundle-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-docs.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-i18n.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-integration-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-integration.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-lint-css.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-lint.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-promise.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-repair-architecture.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-repair-build.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-repair-bundle-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-repair-bundle-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-repair-integration.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-repair-lint.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-repair-promise.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-root-test-types-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-scope-revision.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-session-before-mutation.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-logs/huhu-t03-sessions-before-mutation.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-prior-delivery.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-repair-research.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-reused-prior-round1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-reused-prior.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-review-dispatch-round1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-review-dispatch-round2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-review-input-round1.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-review-input.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-review-round1.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-review-round2.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-source-a-round1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-source-a.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-source-b-v1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-source-b.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-source-c-fixture.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-source-c-native-only.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-source-c-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-source-c.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-ui-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-ui-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/behaviors.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/huhu-t03-b-reopen-probe.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/huhu-t03-b-visual.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/menu-error-800-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/menu-loading-480-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/menu-normal-1200-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/menu-normal-320-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/menu-short-320-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/results.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/sidebar-attached-actions-800-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/sidebar-empty-320-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/sidebar-normal-1200-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/sidebar-normal-800-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/terminal-disconnected-800-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/terminal-failed-480-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/terminal-normal-960-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/terminal-pending-480-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03-visual/terminal-restored-320-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-03.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-api-frozen.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-api-i18n-v2.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-api-record-view.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-browser-checks.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-browser-handoff.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-browser-source.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-business-api-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-checks-a.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-checks-b.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-checks-c.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-dispatch-a.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-dispatch-b-focus.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-dispatch-b.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-dispatch-c-browser.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-dispatch-c.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-final-scope-goal-validator.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-frontier-unassigned.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-frontier.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-handoff-a.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-handoff-b.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-handoff-c.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v1-frames.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v1-host.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v1-terminal-termination-v1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v1-termination.test.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v1-termination.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v2-frames.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v2-host.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v2-terminal-termination-v1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v2-termination.test.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v2-termination.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v3-frames.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v3-host.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v3-terminal-termination-v1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v3-termination.test.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/api-v3-termination.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/business-api-i18n-v2.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/business-api-v1-host.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/business-api-v1-i18n.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/business-api-v1-managed-runtime.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/business-api-v1-termination.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/business-api-v1-workspace-service.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-api-scoped-types.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-api-tsconfig.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-api-types.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-bridges-second.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-bridges-third.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-business-regression.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-final-business-boundaries.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-final-combination.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-final-lint-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-final-lint.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-final-types-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-final-types-v3.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-final-types.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-green-archive.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-green-durable.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-green-late-archive-cancel.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-green-record-state.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-green-registry-drain.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-green-restart-provenance-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-green-restart-provenance-v3.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-green-restart-provenance.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-green-stop.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-legacy-entry-regression.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-legacy-entry-second.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-lint-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-lint-fourth.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-lint-second.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-lint-third.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-native-binary-after.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-native-binary-before.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-native-compat-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-native-compat-second.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-native-explicit-missing.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-native-stop-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-open-api-types-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-open-api-types.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-parser-release.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-pending-and-bridges.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-recovery-open.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-red-archive.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-red-durable.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-red-late-archive-cancel-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-red-late-archive-cancel.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-red-pending-retry.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-red-record-state.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-red-registry-drain.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-red-restart-provenance-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-red-restart-provenance.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-red-stop.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-regression-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-retained-fixture-cleanup.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-scoped-all-types.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-shutdown.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-stop-and-bridges.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-a-stop-extended.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-blur-generation-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-blur-generation-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-confirm-focus-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-confirm-focus-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-dom-candidate.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-first-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-lifecycle-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-lint-candidate.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-lint-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-menus-green-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-menus-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-page-boundaries.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-page-focus-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-page-focus-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-prepare-visual.py",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-record-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-record-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-scoped-green-v4.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-space-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-states-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-terminal-states.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-final-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-final-v3.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-tail.txt",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-v3.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-v4.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-v5.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-v6-resume.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-v6.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-v7.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-v8.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual-v9.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-b-visual.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-budget-attribution-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-budget-attribution-v2.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-budget-attribution.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-budget-attribution.mjs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-before-format-cookies.rs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-before-format-data.rs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-before-format-frame.rs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-before-format-inherited_fds.rs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-bootstrap-gate-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-bootstrap-gate-tests.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-browser-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-browser-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-browser-tsconfig.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-browser-types.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-codec-coercion-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-codec-coercion-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-codec-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-codec-red-behavior.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-codec-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-drain-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-drain-red-behavior.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-drain-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-drain-timeout-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-drain-timeout-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-exit-output-order-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-exit-output-truncation-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-first-stop-deadline-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-first-stop-deadline-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-fixed-copy-host.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-format-cookies.rs.diff",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-format-data.rs.diff",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-format-drift-cookies.rs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-format-drift-data.rs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-format-drift-frame.rs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-format-drift-inherited_fds.rs",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-format-frame.rs.diff",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-format-inherited_fds.rs.diff",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-helper-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-helper-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-host-green-slice.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-host-red-behavior.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-host-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-host-regression.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-known-observation-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-known-observation-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-lint-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-lint-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-linux-candidate-tree.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-lock-cargo-timeline.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-lock-current95.lock",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-lock-order.diff",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-lock-probe-locked-test.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-lock-probe-metadata.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-native-escape-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-native-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-native-force-mutation-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-native-full-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-native-source-frozen.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-native-tree-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-native-tree-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-pending-fifo-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-real-host-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-rust-build-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-rust-codec-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-rust-codec-red.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-rust-session-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-rust-session-regression.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-rustfmt-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-rustfmt-frozen.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-stdio-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-stdio-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-toolchain.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-ts-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-ts-post-lint.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-ts-regression.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-types-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-types-post-lint.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-verify-helper-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-verify-helper-frozen.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-windows-check-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-windows-check-green.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-windows-final-check.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-windows-frozen.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-windows-ownership-check.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-c-windows-target-install.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-focus-scope-validator.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-native-handoff-pre-lock-audit.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-architecture.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-browser-scope-validator.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-budget-attribution-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-budget-attribution.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-build-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-build-text.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-build.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-bundle-final-data.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-bundle-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-bundle-first-data.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-bundle-first.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-css.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-docs.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-i18n.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-integration-argv.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-integration.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-lint.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-lock-clean-base",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-lock-order-drift",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-promise.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/huhu-t04-root-styles-write.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/record-api-i18n.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/record-api-workspace-service.ts",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/scope-v16-goal-plan.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/scope-v16-ticket.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/scope-v16-tickets-map.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/scope-v17-goal-plan.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/scope-v17-ticket.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-logs/scope-v17-tickets-map.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-design.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-format-incident.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-linux-candidate.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-linux-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-lock-audit.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-lock-restoration.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-public-api-final.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-public-api-v1.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-public-api-v2.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-public-api-v3.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-prior-delivery.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-root-a-audit.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-root-c-audit.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-root-format-audit.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-root-format-restoration.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-root-lock-audit.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-runtime-proposal.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-runtime-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-scope-goal-validator.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-source-a.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-source-b.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-source-c.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-ui-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-ui-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/archive-long-keyboard-footer-320x360.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/behaviors.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/results.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-archive-confirmation-480-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-archive-long-320-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-archive-result-320-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-confirmation-320-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-empty-320-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-loading-800-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-normal-1200-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-partial-320-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-root-exit-480-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-save-error-480-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-stopped-960-theme-light-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-stopping-800-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-unconfirmed-320-theme-dark-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/sidebar-unknown-800-theme-dark-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/terminal-partial-320-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/terminal-restored-800-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/terminal-root-exit-480-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/terminal-stopping-960-theme-dark-en.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-visual/terminal-unconfirmed-320-theme-light-zh.png",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-05-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-05-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-06-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-06-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-07-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-09-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-09-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-10-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-10-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-11-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-11-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-12-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-12-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-13-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-13-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-14-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-14-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-15-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-15-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-16-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-16-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-17-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-17-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-18-preflight-before-page-correction.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-18-preflight.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-18-source-observation.json",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/backup-owner-analysis.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/backup-owner-recheck.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/run-start.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/slice-recheck.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/01-native-owner.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/02-space-identities.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/03-managed-runtimes.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/05-screen-stream.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/06-activity-and-approval.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/07-local-cli.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/08-terminal-coordination.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/09-workbench-panels.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/10-passive-inbox.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/11-vault-history.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/12-native-resume.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/13-independent-browser.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/14-consumer-compatibility.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/15-data-migration.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/16-backup-restore.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/17-cli-delivery.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/18-platform-acceptance.md",
      ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md",
      "docs/architecture.md",
      "docs/data.md",
      "scripts/module-strings.ts",
      "src/app/contracts/module.ts",
      "src/app/main.ts",
      "src/app/native.ts",
      "src/host/desktop/native/binary.ts",
      "src/host/desktop/native/runtime.test.ts",
      "src/host/desktop/native/runtime.ts",
      "src/modules/agent/api.ts",
      "src/modules/agent/core/space/model.ts",
      "src/modules/agent/core/space/ports.ts",
      "src/modules/agent/core/terminal/frames.ts",
      "src/modules/agent/core/workspace/model.ts",
      "src/modules/agent/core/workspace/ops.ts",
      "src/modules/agent/module.ts",
      "src/modules/agent/platform/desktop/pty/binary.ts",
      "src/modules/agent/platform/desktop/pty/helper-environment.test.ts",
      "src/modules/agent/platform/desktop/pty/helper.ts",
      "src/modules/agent/platform/desktop/server/cookie-client.ts",
      "src/modules/agent/platform/desktop/spaces/directories.test.ts",
      "src/modules/agent/platform/desktop/spaces/directories.ts",
      "src/modules/agent/platform/desktop/spaces/ports.test.ts",
      "src/modules/agent/platform/desktop/spaces/ports.ts",
      "src/modules/agent/platform/desktop/spaces/writer-owner.fixture.ts",
      "src/modules/agent/platform/desktop/spaces/writer-owner.test.ts",
      "src/modules/agent/platform/desktop/spaces/writer-owner.ts",
      "src/modules/agent/platform/desktop/spaces/writer-process.test.ts",
      "src/modules/agent/services/controller-native.test.ts",
      "src/modules/agent/services/launch/foreground-intent.dom.test.tsx",
      "src/modules/agent/services/launch/foreground-intent.ts",
      "src/modules/agent/services/launch/launcher-space.test.ts",
      "src/modules/agent/services/launch/launcher.ts",
      "src/modules/agent/services/spaces/layout-merge.ts",
      "src/modules/agent/services/spaces/space-service-recovery.test.ts",
      "src/modules/agent/services/spaces/space-service.test.ts",
      "src/modules/agent/services/workspace-store-spaces.test.ts",
      "src/modules/agent/services/workspace-store.ts",
      "src/modules/agent/ui/create/NewTabMenu.dom.test.tsx",
      "src/modules/agent/ui/create/NewTabMenu.tsx",
      "src/modules/agent/ui/create/Omnibox.dom.test.tsx",
      "src/modules/agent/ui/create/Omnibox.tsx",
      "src/modules/agent/ui/create/SpaceEmptyState.tsx",
      "src/modules/agent/ui/create/SpaceForm.dom.test.tsx",
      "src/modules/agent/ui/create/SpaceForm.tsx",
      "src/modules/agent/ui/create/SpacePicker.tsx",
      "src/modules/agent/ui/create/space-errors.ts",
      "src/modules/agent/ui/workspace/WorkspaceLayout.tsx",
      "src/modules/browser/module.ts",
      "src/modules/browser/services/host.ts",
      "src/shared/i18n/lazy/native.ts",
      "src/shared/native/abort.ts",
      "src/shared/native/cookies.ts",
      "src/shared/native/frames.ts",
      "src/shared/native/lazy-host.test.ts",
      "src/shared/native/lazy-host.ts",
      "src/shared/storage/vault-layout.ts"
    ],
    "working_snapshot": [
      {
        "path": "docs/agent-workbench.md",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "f42e6e041fe683fb971bf9eee93ca0d35c77aa15",
          "sha256": "b190467a67944651dac8bf284758e4532f6b72bb238381770fcc7418bf1a71e8"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "003688e3182ffcbed685140b195fc73993b969f425dccf9255f51f2a5a74ad52",
          "bytes": 29989
        }
      },
      {
        "path": "main.js",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "ab30504a07e6cd5ae8ca4468e4f1e40e3a6ef94f",
          "sha256": "d9d91103ba8885a76b2ed6f7eeb90fbff9f714ee92fe1d838e10783ffcdf4cb6"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "ec42eb1eedba309df6badebef921da79365c04938544f43a9b66ff12a2b27171",
          "bytes": 6147898
        }
      },
      {
        "path": "native/pty-server/Cargo.toml",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "beee3947fca3601cf9b354ec6c36b627948fdebb",
          "sha256": "e0559a4673c6d3b1c0e45de3d10b057dd8248205b7baa1d2d70b7d808d695a9d"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "4dd55ffe7cb9d45b97934650463e06a2d3872a4abb055c926386d03de562678c",
          "bytes": 876
        }
      },
      {
        "path": "native/pty-server/src/bootstrap.rs",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "8b58d4e00d498779ac201e4ec109bb6e2af8bcce5f417a29742ad5d9fb6bbda8",
          "bytes": 22732
        }
      },
      {
        "path": "native/pty-server/src/job.rs",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "7a708a8cfe24728b28e14a2747da63a4dd644b4f",
          "sha256": "49c9fecfc1c9d5a931f3aebd4786f2791186b04ad614b3595e05959e4accd540"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "3c74f8bc5996afca7744e47e9dae7434cd500f9c33d857dacb351cc414d1ab83",
          "bytes": 15567
        }
      },
      {
        "path": "native/pty-server/src/main.rs",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "7bbb1d7f28d5ebebccab669d41eb05a1ac2d034c",
          "sha256": "cc4080ae15d34684f9216710f916b21bd8f5e9530c668b149837640a428cb1fe"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "ede0ebd60a46dd859772c028d9d6679be484edff10e4cd9146416bee82148f8b",
          "bytes": 7582
        }
      },
      {
        "path": "native/pty-server/src/session.rs",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "82b114af65ffc4b3f351cc56227bc099b8b7189a",
          "sha256": "e66231fc943fc37e2db244bec8fd67111a7a97cb986cf43fc06f532c0db8c928"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "2589a3cbb077115653d8b080ed621a22aa8ca5d232f342ef35389f68927c0dfb",
          "bytes": 33398
        }
      },
      {
        "path": "native/pty-server/tests/session_tree.rs",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "67bdb60890d6ec0691550eacf64fb63cb01dc695979adf29fbee1e7656d3f6dd",
          "bytes": 12650
        }
      },
      {
        "path": "native/pty-server/tests/stdio.rs",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "0da5a835abcf2c7043912ea87e7cd4a2a1bba2c4",
          "sha256": "821862321ebd753a2216d743ee0ba91e97ad2626e36e99a7e1e7677d83859049"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "da693b665b0050389913a3453b1a7322bb421172dac5d2ef62ea2bbd73500a2a",
          "bytes": 11081
        }
      },
      {
        "path": "scripts/bundle-budget.json",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "1db15b9dd4481f1fc7dc957fca201181d144419e",
          "sha256": "b973f61437e04a65041dfa6db81acdb925d2eb9e4cfee6af6136dca141735242"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "0608d70c15ea0a96c63eb5a4d59f967836662f06a1a9d993d7e4b2351bc69452",
          "bytes": 2427
        }
      },
      {
        "path": "src/host/desktop/native/helper.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "b077bccb0f4a5e4196c59bc5dd1415662b13fedb6b50d054236f7cb377004ae3",
          "bytes": 4555
        }
      },
      {
        "path": "src/host/desktop/native/helper.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "99c83f27f65ebc6203dda1f4f937f5159369cea656a31e63ba77c7beddd58167",
          "bytes": 11031
        }
      },
      {
        "path": "src/host/desktop/native/host.integration.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "332ea053f34bc93d24f2f2d2dae05dd467b5c6ec1323098c4218aa15e06ea7f0",
          "bytes": 2667
        }
      },
      {
        "path": "src/host/desktop/native/host.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "f9b95d00ff970d26704fbdcc585fb934b212972aedc8f53b83e0d6601f348598",
          "bytes": 14370
        }
      },
      {
        "path": "src/host/desktop/native/host.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "d1c4b479b595fd3d18efd9a642ab1e4b34ca5840ac25bb7bdde386e147c1c36b",
          "bytes": 13023
        }
      },
      {
        "path": "src/modules/agent/core/space/errors.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "d23415cafb588ada8764fac41790fa05e9f768148de163e0fe58b0b57a548a0b",
          "bytes": 781
        }
      },
      {
        "path": "src/modules/agent/core/workspace/managed-runtime.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "a543fc74b401d8eb5917286a2007db147442877bd6aeed38be3f3b39b66784fd",
          "bytes": 6060
        }
      },
      {
        "path": "src/modules/agent/i18n.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "e9d315b417828da4340367192d44f8fe303fc2c4",
          "sha256": "e345439b16f312e8a785d43cb97ac4920996755c96d890255b7696dc97d49416"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "223a12cb6b915ddc4f486074b8c38f2d5b00e2f1d3067799b195cce42b280ef8",
          "bytes": 65783
        }
      },
      {
        "path": "src/modules/agent/services/agent-runtime.test.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "4d1ce0d6513185b0eb5842202cc26257e0d9b3d0",
          "sha256": "38cf10656a008f97766c0dd8ea30f1832a5f10756715d16888784ddf86a23152"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "b917878b1c27c8934c82f60a6c40b5e9539e1f8bb180cc568678455bbbe59177",
          "bytes": 5124
        }
      },
      {
        "path": "src/modules/agent/services/agent-runtime.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "74bbfcae3c2029eb4331af5b784b861d05311ea3",
          "sha256": "499dba720ad4b5a357bb79b0605044199a9bc110cc5173ab3f12ce4c60d8b2fc"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "4df5489210382cc52e9276f96746f11a3757f27d9cde47acc6d58b78094a6c9c",
          "bytes": 23052
        }
      },
      {
        "path": "src/modules/agent/services/controller-managed-runtimes.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "7aff7c1bd554d09f706c9e0e3d2cd93e3bc09463d947c4510095938349d44963",
          "bytes": 9632
        }
      },
      {
        "path": "src/modules/agent/services/controller-space.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "afc1ef1c4da6f45ca96b17d259cd8dcb111953c22447b616b12211955f4f489e",
          "bytes": 3065
        }
      },
      {
        "path": "src/modules/agent/services/controller.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "72cd1dc69114f96517ccfbba8c8cf025255ea7c8",
          "sha256": "08db5f2c7a6569ac25fd8d832f0035c8c99cc564644fc2eb1b660fca68b569c3"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "1207b19bd828dfb90a1f3cb1ce68602db123750b4b65c0d89275e9c92b607c66",
          "bytes": 44841
        }
      },
      {
        "path": "src/modules/agent/services/launch/managed-errors.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "fa472a8ca5f2bf3c43fd6379da804621b2073a478679fab5b6789daf7c480a07",
          "bytes": 3842
        }
      },
      {
        "path": "src/modules/agent/services/spaces/messages.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "bc2b4a37fc955128198d49710bf665b31872bbf5964a6e2e8842a04c8326da33",
          "bytes": 1183
        }
      },
      {
        "path": "src/modules/agent/services/spaces/records.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "44236f8a398d8acc53fad9f5a0bb94766a29c12a0f2b85f70413fbfc6730fb95",
          "bytes": 2248
        }
      },
      {
        "path": "src/modules/agent/services/spaces/records.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "46bf4dadae3af5c985ca60dbda3c15d3acabb062aa3eff68d0bd535e52c4c944",
          "bytes": 5673
        }
      },
      {
        "path": "src/modules/agent/services/spaces/space-service-lifecycle.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "afd85ce623a4300f561707f008fce955fe866ee80eaef162f773b7e606807e7f",
          "bytes": 4501
        }
      },
      {
        "path": "src/modules/agent/services/spaces/space-service.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "f04d30a206782996c448aec8b7f7a5cf8501a730f54b7f51bce2e713aa17515a",
          "bytes": 23354
        }
      },
      {
        "path": "src/modules/agent/services/terminal/clock.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "f67ca8cdd9b19733183dc4dcc40f9b724345ee5d3e335d314c04c3ec38713b18",
          "bytes": 649
        }
      },
      {
        "path": "src/modules/agent/services/terminal/session.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "1d92f963da0fe608bd004bb9cff2a3093c81efee",
          "sha256": "483203afdcb172c92e934bd2db6c95ef180fdc703f1e53eea4a9f9da2277072b"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "b12a8b22b0c6371523cfbca8934b2ebddcb59bd9a24525c4620a42fe257163fa",
          "bytes": 15892
        }
      },
      {
        "path": "src/modules/agent/services/terminal/sessions-cancellation.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "db65040d334382e42dd0e7a90ef4ebeff7f22f518d97a20f3e3323b6bd0e3b19",
          "bytes": 6274
        }
      },
      {
        "path": "src/modules/agent/services/terminal/sessions-space.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "c426e4c687c39a9ba1a1585a899997611babc869dcaa4707890cfaaec926afc7",
          "bytes": 9353
        }
      },
      {
        "path": "src/modules/agent/services/terminal/sessions.e2e.test.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "cc41b9ebe12e5f7f8635daf80c2bcb30821c9c6a",
          "sha256": "a8bbf19af860e762ed246f2c31bc0a71955330c9d9c29451b494a2efa8045841"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "ef0b1ddfdd238e8dd53d0cd29739919ed49d264ea4cbfb528cfb636e98058472",
          "bytes": 3049
        }
      },
      {
        "path": "src/modules/agent/services/terminal/sessions.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "c07d20677103024ee33b66464a7318c2e201fcb3",
          "sha256": "82709ade00035eb4e94526021d04f5bda463df338737fe579d65cec5bbf61a35"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "120bcb0746a47a92cd6059d239e1487a579836a1a539ac146ce067ea40d1b998",
          "bytes": 25192
        }
      },
      {
        "path": "src/modules/agent/services/workspace-service-launch-failures.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "489c0834665bacab2f558c6dc097f7a54885f465a5bd1d94e505a6f0e5741eb2",
          "bytes": 7093
        }
      },
      {
        "path": "src/modules/agent/services/workspace-service-native.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "d62249e965166e00d11e1f88cb13d60d1e81836ffd9cc639fe0fcc2bcef381bc",
          "bytes": 13064
        }
      },
      {
        "path": "src/modules/agent/services/workspace-service-spaces.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "0c628f4082ae59019ce7fb225a87ea01df9bf0fa536e0bd6d44c380c08884aca",
          "bytes": 31016
        }
      },
      {
        "path": "src/modules/agent/services/workspace-service-stop-native.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "c39e4ee735ea1bd9b525e10781c65f9d1c3ecfc8a55b913e7240f2600200e562",
          "bytes": 9454
        }
      },
      {
        "path": "src/modules/agent/services/workspace-service-stop.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "881aba4bef24aec8e44be6b45d2f8eb0021936da88d70650873437b5517d6f7a",
          "bytes": 28353
        }
      },
      {
        "path": "src/modules/agent/services/workspace-service.test.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "13aeec5bbacb2a01cdcba27f60cf313cd5bc2e08",
          "sha256": "ecd86c1da4292119503163be734af413d3a8060a59c5e7d45f391e7d719e6362"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "2d622a5ecdb1c62ac6bf61688b0e68d2f7f3c8202b5c45f3b22fa8c26593b665",
          "bytes": 9797
        }
      },
      {
        "path": "src/modules/agent/services/workspace-service.ts",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "dfb1ffa084cd243684a39736a29a535d64df2d92",
          "sha256": "07771169fde31acfde5475dd6310c9a23761e4934c024db2f7a0a7a6bab0ffcc"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "28b54dbb8ec02e7114fd789886e1a58847f9f4afd889a25a4fdc710318187ab5",
          "bytes": 55619
        }
      },
      {
        "path": "src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "1dd1a10471d7d250bf357ca81b32d696a894d615",
          "sha256": "7b0d025c658348dd3d763fa5ff7501381b894cadd365336645c8b8daccc90eed"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "2b46272e18a19f7bc971dfc517510ad5ec59d745ef90fd89b630c5f834625645",
          "bytes": 8364
        }
      },
      {
        "path": "src/modules/agent/ui/AgentWorkspacePage.tsx",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "714708604923eed5d9f57f4fce400c8656bfd51c",
          "sha256": "3ee917ed96c126f862ad20c4563e31fce5610188d2df25d5078a63e042d7635c"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "07f60e9b4b2f73978a76b9239d19c1c02b580210433566bd49b53657ee62ef3b",
          "bytes": 14545
        }
      },
      {
        "path": "src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "01f97c4d81d4ba56393c598a25b13bbf3ec8aa3c",
          "sha256": "10b9a809885db1a52ce51e5fe002b2695ea2522026f8c81bc2a4fe80c7519235"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "fcc42139af562b582faf3dd88f38c11580f7aa1136f131ccead83458d8a19a02",
          "bytes": 17326
        }
      },
      {
        "path": "src/modules/agent/ui/sidebar/AgentSidebar.tsx",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "7e393e6bf17f95c3fdc313ccb031c9b3c1ea98f9",
          "sha256": "b7c33d130526a7b3cdfa7af4ad2b473807b2abd24d97ce6d10942109897005c7"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "0f500b21596a56374801ca3733d1af81feb6d23ecde4c912031210035ef2014f",
          "bytes": 23176
        }
      },
      {
        "path": "src/modules/agent/ui/sidebar/SpaceNavigation.dom.test.tsx",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "1137fc1383297c9d13529e049a86e8d4bc45c01b91eb44aeb405508c57485378",
          "bytes": 4656
        }
      },
      {
        "path": "src/modules/agent/ui/sidebar/SpaceNavigation.tsx",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "59347afe0120b5b8391668feb9884a6dcc6fe19e2c0a17373f04c25a9d7aa10c",
          "bytes": 4781
        }
      },
      {
        "path": "src/modules/agent/ui/sidebar/managed-lifecycle.tsx",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "dbae64ac0ace3368f2968259d92edd701154e6ff47779d8b028043048f3d8a8d",
          "bytes": 8390
        }
      },
      {
        "path": "src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "39713b42ecc4807c3018deb63d6bf7a7027399a1",
          "sha256": "83c4396b94611b006490f9ad80eb1b2edb5d57f86da1b2deb1a28ff9a3d9023f"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "600aa330dac48149275644c91c8c30ee90d4a7b8d88ae572faed78696b3dae42",
          "bytes": 9144
        }
      },
      {
        "path": "src/modules/agent/ui/terminal/TerminalTabView.tsx",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "74037337fd0e40d6568944249ad969d025260150",
          "sha256": "5a6e005dd77ff978f0daf1ba49742d10ab0ace4e4e31a85b18d2ffa4434ed53f"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "aeab120959e66cc22c8ce453e44bc2d57e37893d0a07fd535f632e982feb772b",
          "bytes": 18878
        }
      },
      {
        "path": "src/modules/browser/module.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "b2175b6625a4033760e963ea404f4d2b4f275a69b47449561a3991b35d7c5842",
          "bytes": 5318
        }
      },
      {
        "path": "src/shared/native/host.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "2e39c4f4c74b4c371b59ed16b76c60759ab90e19d232f58dc72d5744e7977eeb",
          "bytes": 3480
        }
      },
      {
        "path": "src/shared/native/termination.test.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "c71410e533ddcf0fe734cb678d6dc6dbf4b5619300292e0599fe87655a57370e",
          "bytes": 637
        }
      },
      {
        "path": "src/shared/native/termination.ts",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "d5bc6bbcd4df5a48a766225b241898ca402cefee81dc0ee14ee67ee436f0400c",
          "bytes": 5135
        }
      },
      {
        "path": "styles.css",
        "change": "modified",
        "before": {
          "mode": "100644",
          "oid": "f0d752b3c346ec1fa31295e023779a2a2bf4f06f",
          "sha256": "c5d820899088c2d6b734f1691c837e8dde088ff8bf81f0d199ac1b61446ba43b"
        },
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "820605c3fffd20f0f6fda86be72846967daefd87738e0fd63edc49e4db345430",
          "bytes": 1421846
        }
      },
      {
        "path": "test/fixtures/native/terminal-termination-v1.json",
        "change": "added",
        "before": null,
        "after": {
          "kind": "file",
          "mode": "100644",
          "sha256": "18194c49e178a4e1cb17f0f918cc655b4a545756e9729e6c3d1c26a61829a28a",
          "bytes": 22923
        }
      }
    ],
    "index_sha256": "10a283748f5edff250e8b5af2378b1c3d898beaf650c92826a5885b282a8ead1",
    "inventory_sha256": "77b84955a48ed11e6e77b8565a7da7f40b13b88128c5a391328ad7da34ab3049",
    "tracked_diff_sha256": "2a02e81785a8daaa9f1990137b37e38694072eb55b5fedfd671223d16c1799df",
    "tracked_diff_command": [
      "git",
      "diff",
      "--no-color",
      "--no-ext-diff",
      "--no-textconv",
      "--binary",
      "--no-renames",
      "33c21e098ef3188cbab5a09f3e0a01fadb787715",
      "--",
      ":(literal)docs/agent-workbench.md",
      ":(literal)main.js",
      ":(literal)native/pty-server/Cargo.toml",
      ":(literal)native/pty-server/src/bootstrap.rs",
      ":(literal)native/pty-server/src/job.rs",
      ":(literal)native/pty-server/src/main.rs",
      ":(literal)native/pty-server/src/session.rs",
      ":(literal)native/pty-server/tests/session_tree.rs",
      ":(literal)native/pty-server/tests/stdio.rs",
      ":(literal)scripts/bundle-budget.json",
      ":(literal)src/host/desktop/native/helper.test.ts",
      ":(literal)src/host/desktop/native/helper.ts",
      ":(literal)src/host/desktop/native/host.integration.test.ts",
      ":(literal)src/host/desktop/native/host.test.ts",
      ":(literal)src/host/desktop/native/host.ts",
      ":(literal)src/modules/agent/core/space/errors.ts",
      ":(literal)src/modules/agent/core/workspace/managed-runtime.ts",
      ":(literal)src/modules/agent/i18n.ts",
      ":(literal)src/modules/agent/services/agent-runtime.test.ts",
      ":(literal)src/modules/agent/services/agent-runtime.ts",
      ":(literal)src/modules/agent/services/controller-managed-runtimes.test.ts",
      ":(literal)src/modules/agent/services/controller-space.test.ts",
      ":(literal)src/modules/agent/services/controller.ts",
      ":(literal)src/modules/agent/services/launch/managed-errors.ts",
      ":(literal)src/modules/agent/services/spaces/messages.ts",
      ":(literal)src/modules/agent/services/spaces/records.test.ts",
      ":(literal)src/modules/agent/services/spaces/records.ts",
      ":(literal)src/modules/agent/services/spaces/space-service-lifecycle.test.ts",
      ":(literal)src/modules/agent/services/spaces/space-service.ts",
      ":(literal)src/modules/agent/services/terminal/clock.ts",
      ":(literal)src/modules/agent/services/terminal/session.ts",
      ":(literal)src/modules/agent/services/terminal/sessions-cancellation.test.ts",
      ":(literal)src/modules/agent/services/terminal/sessions-space.test.ts",
      ":(literal)src/modules/agent/services/terminal/sessions.e2e.test.ts",
      ":(literal)src/modules/agent/services/terminal/sessions.ts",
      ":(literal)src/modules/agent/services/workspace-service-launch-failures.test.ts",
      ":(literal)src/modules/agent/services/workspace-service-native.test.ts",
      ":(literal)src/modules/agent/services/workspace-service-spaces.test.ts",
      ":(literal)src/modules/agent/services/workspace-service-stop-native.test.ts",
      ":(literal)src/modules/agent/services/workspace-service-stop.test.ts",
      ":(literal)src/modules/agent/services/workspace-service.test.ts",
      ":(literal)src/modules/agent/services/workspace-service.ts",
      ":(literal)src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx",
      ":(literal)src/modules/agent/ui/AgentWorkspacePage.tsx",
      ":(literal)src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx",
      ":(literal)src/modules/agent/ui/sidebar/AgentSidebar.tsx",
      ":(literal)src/modules/agent/ui/sidebar/SpaceNavigation.dom.test.tsx",
      ":(literal)src/modules/agent/ui/sidebar/SpaceNavigation.tsx",
      ":(literal)src/modules/agent/ui/sidebar/managed-lifecycle.tsx",
      ":(literal)src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx",
      ":(literal)src/modules/agent/ui/terminal/TerminalTabView.tsx",
      ":(literal)src/modules/browser/module.test.ts",
      ":(literal)src/shared/native/host.ts",
      ":(literal)src/shared/native/termination.test.ts",
      ":(literal)src/shared/native/termination.ts",
      ":(literal)styles.css",
      ":(literal)test/fixtures/native/terminal-termination-v1.json"
    ],
    "input_sha256": "b25fd2cf65e80c01b0e075bc952e711b781dbeaa053d7c778e51a212ff54e2f4"
  },
  "sources": [
    {
      "kind": "instructions",
      "locator": "AGENTS.md",
      "sha256": "a7cc886d44ccb3211b464853cac926b26eca8cdff81e3cce364fd084d47f8fa8"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/dev/SKILL.md",
      "sha256": "1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/ui/SKILL.md",
      "sha256": "ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/dev/references/architecture.md",
      "sha256": "c8d02dad082e075be91fbbc33d669169756a617c7b598d56c4cd9e5954a26bf2"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/dev/references/testing.md",
      "sha256": "bc37d64b9b3468a86df3348bd0400316bfb091186e7653d31e152d7f00363103"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/dev/references/licensing.md",
      "sha256": "27969c1917d167c111fda6aabc90fc403232ee876aa8ed6daedea8b32fc0d9e3"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/dev/references/module-authoring.md",
      "sha256": "ac00352dbace247a46730da89a7ad43a06202ab951be49613130ea9adfd5728b"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/dev/references/settings-and-i18n.md",
      "sha256": "8ab588cba6ad602ab22e8f2ef4d89003331b7b26afb0af02721593af256c22c1"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/dev/references/obsidian-api.md",
      "sha256": "9fac8f21f8d4806331176cc8bf62cd1ffff94aaec3b58ba5a6c06bf348479417"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/dev/references/build-and-release.md",
      "sha256": "44a6c8f5697effc90ed3b944de0bbb279dd07e0d294bbf34deb70bfd7bf5c114"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/ui/references/design-system.md",
      "sha256": "3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/ui/references/shell.md",
      "sha256": "f78a998af570d4b9cfc290a257db41023ba21af7a223571016e5c7bae2933d74"
    },
    {
      "kind": "standards",
      "locator": ".agents/skills/ui/references/motion-a11y.md",
      "sha256": "76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md",
      "sha256": "d204c7a0b3178a60ddeb291a8153f79cb8e3864427c5317b7660832182d12618"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md",
      "sha256": "f13ca8cf0ef1185065e7c6d4e537a787f50ac813678aec428e498c0a8f03e397"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md",
      "sha256": "f54b94009192820a3f8a82ab24a62b6c36502443b77e30fbb2326aee2bd45fa8"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md",
      "sha256": "3066ec7de2155732fa5e1c9f3259d38e26d229305ffcf41eec61684944857de3"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md",
      "sha256": "150813a6e37c1426db13a01fb5da75ded9ac36dd816d6a319c616cfc5902faeb"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md",
      "sha256": "5c84504ba7fb6911c8a5789953125d867c2d69db342d83e174585ec4d939bde3"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md#purpose",
      "sha256": "efa0dc745febf48cb51386bd95e4b3f0474322af480a501a48534e43659bc486"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md#scope",
      "sha256": "a4cbf0b9368c5f65ea66870a5e31b7cf7de9dc6ca3f55e08643b71c1166a0a73"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md#research",
      "sha256": "820d19442e5fec5b580e49c94c17fe9544ae425994aa0909ee1b87a8fc77e196"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md#route",
      "sha256": "0497638a9363f00815811f3c4ad4b4643d489234f2edd3fb81cb669b42ce08d2"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md#acceptance",
      "sha256": "d7c7ac1bb94c9d79d5d71e431fccdb939ccf1056deae199bf29046c5b2a5e8a8"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md#verification",
      "sha256": "f01c5f5038bf21c1be0fc0aa9b5d17e385743b42495d2647b3d8c80e234fd883"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md#constraints",
      "sha256": "d2971644346d0a2dd25e789acb39735b80d244a539e5cf0609c05bcc95a6ebed"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-runtime-proposal.md",
      "sha256": "9307a35ade6d9b00639111dcad090299befc19f6049080fd6436887fd0ae78ee"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-native-design.md",
      "sha256": "fac5017e35a2f25b17ae8bb35193c1cd713ff7510f7667b98666f6b15c3bd6b5"
    },
    {
      "kind": "specification",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-api-record-view.md",
      "sha256": "8b97dbc3dbfd6998f56b17fef6dfdc6b608c446dd768734579b2ca6e30dc1f7f"
    },
    {
      "kind": "instructions",
      "locator": ".agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md#execution-protocol",
      "sha256": "5c3369a8694de335d0ae588c7043a7fb6f9a2e504c8f966e41a1bdaeca672610"
    }
  ],
  "exclusions": "仅排除本change计划/状态/Evidence及前序T-01/T-02/T-03已独立通过且当前SHA未变的产品文件。T-04完整实际源码、测试、原生、文档、必要预算和生成物纳入，新增/删除不遗漏。前序98路径及字节快照见T-04-prior-delivery.json，当前逐SHA复用清单见T-04-reused-prior.json；T-03通过输入cdc8b69094eaae3db8a18f890b6f403ea190a3203b8c14ba71876f442ac92ad4。共享路径审查当前完整字节，并提供相对前序冻结字节的增量定位。"
}
```
