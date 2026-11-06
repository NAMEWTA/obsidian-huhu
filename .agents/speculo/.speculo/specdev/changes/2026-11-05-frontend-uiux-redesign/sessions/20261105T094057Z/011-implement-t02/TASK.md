---
schema_version: 2
session: "20261105T094057Z"
task: "011-implement-t02"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-02"
---
## Goal
Lead /root assigns gpt-6.1-sol medium implementation of the entire T-02 shared-component contract after T-01 is done. No delegated agents. Deliver all AC-011/012/013, production components and real fixtures, not a cosmetic subset.
## Inputs
Read root AGENTS; tickets-map revision 8 then dev/ui and applicable references, T-02, goal-plan, spec AC-011–013, DESIGN revision 3 sections 3–7 and approved UI-002. Apply SpecDev I preflight, TDD, design/architecture and evidence methods. Approved DESIGN overrides explicitly obsolete visual skill rules; retain lifecycle, architecture, i18n and licensing boundaries.
## Workspace and Scope
Current /home/wta/projects/obsidian-huhu, main HEAD 37fcede4210a19bcc2a74809e7fdd301e5717957. Existing user and T-01 changes must be preserved. Writable source paths are exactly T-02 writable_paths. No Git stage/commit/push, no worktree, dependency or shared artifact writes. Shared ui dictionary changes must be supplied as exact proposed en/zh keys to Lead; Lead owns styles.css/main.js and runner changes if needed. Read-only all other paths. No official Ticket/Map/Evidence edits.
## Acceptance
Inspect imports/callers before edits. Reuse Radix, Headless Tree, existing Portal and installed panels v4; no parallel control engines or compatibility variants. Deliver all approved component variants, FormField/DetailPane/Notice/TaskContent, density-aware tree and virtualizer, modal unsaved confirmation, correct ARIA and owner-document focus restoration. Module pages and dates excluded. Record removed API/variant consumers with responsible tickets. Agent direct panels consumers remain T-09.
Use meaningful behavior red/green tests, existing tests' risks must be preserved if rewritten. Run ticket DOM/architecture and scoped lint/type checks; list actual global migration failures without claiming pass. Fixture T-02/index.tsx/index.mjs must use production components, true en/zh and both Documents, cover normal/disabled/busy/error/keyboard/nested Command-confirmation, dirty Esc/overlay/cancel, focus return, responsive overflow and density. Import readyDocuments read-only if useful. Runner hooks and shared artifacts requests go to Lead. Supply observed adapter graph counts, not disabled guards. Lead owns final E2E on frozen source; worker may run fixture preflight and debugging with distinct /tmp outputs.
## Return
Keep progress updates concise, surface real scope gaps promptly. Once complete freeze all source and return exact file list, API/caller impact, verification commands/exits, regression coverage and missing gates. Write immutable REPORT.md beside this TASK once; use /tmp/huhu-t02-implementation for logs, screenshots and frozen snapshot. No claim whole goal done. Await independent high review and Lead acceptance.
