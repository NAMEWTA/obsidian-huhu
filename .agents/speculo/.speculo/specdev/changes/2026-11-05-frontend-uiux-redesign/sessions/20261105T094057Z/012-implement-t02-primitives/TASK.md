---
schema_version: 2
session: "20261105T094057Z"
task: "012-implement-t02-primitives"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-02"
---
## Goal
Lead assigns gpt-6.1-sol medium a disjoint T-02 implementation partition. Full ticket integrated by /root/implement_t01, independent high review after freeze. No delegation.
## Inputs
Read AGENTS; tickets-map revision 8; dev/ui applicable rules; T-02; goal-plan; spec AC-011–013; DESIGN revision 3 sections 3–7 and UI-002. Apply SpecDev I methods, meaningful red/green behavior tests and source/caller impact preflight. Approved DESIGN replaces obsolete visual skill rules only.
## Workspace and Scope
Current /home/wta/projects/obsidian-huhu main HEAD37fcede4210a19bcc2a74809e7fdd301e5717957. Preserve existing T-01/user changes. Exact writable paths:
- src/ui/components/accordion.tsx
- src/ui/components/badge.tsx
- src/ui/components/button.dom.test.tsx
- src/ui/components/button.tsx
- src/ui/components/card.tsx
- src/ui/components/checkbox.tsx
- src/ui/components/collapsible.tsx
- src/ui/components/huhu/ActionButton.tsx
- src/ui/components/huhu/AgentIcon.tsx
- src/ui/components/huhu/AgentQuestionIcon.tsx
- src/ui/components/huhu/AgentWorkingSpinner.tsx
- src/ui/components/huhu/Choice.tsx
- src/ui/components/huhu/ColorField.tsx
- src/ui/components/huhu/EmptyState.tsx
- src/ui/components/huhu/IconPicker.tsx
- src/ui/components/huhu/InlineRename.tsx
- src/ui/components/huhu/NumberField.tsx
- src/ui/components/huhu/ObsidianIcon.tsx
- src/ui/components/huhu/PathPicker.dom.test.tsx
- src/ui/components/huhu/PathPicker.tsx
- src/ui/components/huhu/RelativeTime.tsx
- src/ui/components/huhu/SegmentedControl.tsx
- src/ui/components/huhu/SettingsBadge.tsx
- src/ui/components/huhu/SettingsDisabledControlTooltip.tsx
- src/ui/components/huhu/SettingsFormControls.tsx
- src/ui/components/huhu/SettingsRow.tsx
- src/ui/components/huhu/SettingsSection.tsx
- src/ui/components/huhu/SettingsSubsectionHeader.tsx
- src/ui/components/huhu/SettingsSwitchRow.tsx
- src/ui/components/huhu/ShortcutKeyCombo.tsx
- src/ui/components/huhu/StatusDot.tsx
- src/ui/components/huhu/VaultPathField.tsx
- src/ui/components/huhu/WorkspaceUsage.tsx
- src/ui/components/huhu/agent-icons/**
- src/ui/components/input.tsx
- src/ui/components/label.tsx
- src/ui/components/progress.tsx
- src/ui/components/scroll-area.tsx
- src/ui/components/select.tsx
- src/ui/components/separator.tsx
- src/ui/components/skeleton.tsx
- src/ui/components/slider.tsx
- src/ui/components/switch.tsx
- src/ui/components/table.tsx
- src/ui/components/tabs.tsx
- src/ui/components/textarea.tsx
- src/ui/components/toggle-group.tsx
- src/ui/components/toggle.tsx
- src/ui/components/huhu/FormField.tsx
- src/ui/components/huhu/FormField.dom.test.tsx
- src/ui/components/huhu/Notice.tsx
- src/ui/components/huhu/Notice.dom.test.tsx
- src/ui/components/huhu/TaskContent.tsx
- src/ui/components/huhu/TaskContent.dom.test.tsx

Read-only all others. No shared artifacts, dictionary, runner, dependency, Git/index, worktree or official status/evidence writes. Extra needed paths/tests go to Lead first. All other components concurrently owned by other workers.
## Acceptance
Own primitive visuals/forms, FormField/Notice/TaskContent and listed tests. Button keeps Button/buttonVariants exports, asChild/ref/className; variants primary/secondary/ghost/danger/danger-ghost; sizes sm/md/lg/icon-sm/icon-md/icon-lg, default primary/md. Coordinate API changes with modal writer /root/implement_t01 via messages. All confirmation/layer/focus logic belongs to modal writer; consume shared components, do not duplicate. No domain types/imports in presentation components. Existing caller-provided translated ReactNode supports copy. Preserve real disabled/busy, keyboard and ARIA semantics. Identify out-of-partition consumers instead of changing them.
Use --hu tokens and approved density/font/motion; no parallel engines or compatibility variants. Existing tests' original risks must be carried forward. Run owned DOM tests, scoped lint/type checks; record global pending consumer errors honestly. No broad build or E2E while others write. Lead owns styles.css/main.js and final E2E; notify Lead when style regeneration needed. Send API contract and completion snapshot to integration owner. No claims based on prototype mocks.
## Return
Freeze owned files, write REPORT.md once beside TASK, notify Lead and integration writer. Include changed paths, actual red/green commands/exits, API/caller impact, no-hash-drift snapshot in /tmp/huhu-012-implement-t02-primitives, residual limitations and skill execution facts. Process artifacts only /tmp. No whole-ticket or goal completion claim.
