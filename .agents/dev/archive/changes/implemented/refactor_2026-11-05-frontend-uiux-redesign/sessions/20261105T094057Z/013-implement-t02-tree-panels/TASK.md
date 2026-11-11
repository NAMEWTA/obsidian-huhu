---
schema_version: 2
session: "20261105T094057Z"
task: "013-implement-t02-tree-panels"
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
- src/ui/components/tree.tsx
- src/ui/components/tree.dom.test.tsx
- src/ui/components/resizable.tsx
- src/ui/components/resizable.dom.test.tsx
- src/ui/react/use-density.ts

Read-only all others. No shared artifacts, dictionary, runner, dependency, Git/index, worktree or official status/evidence writes. Extra needed paths/tests go to Lead first. All other components concurrently owned by other workers.
## Acceptance
Own Tree density-aware virtualizer, row selection/expansion/ARIA and panels v4 wrapper. Reuse Headless Tree; leaf has no aria-expanded, one Tab entry, folder name selects and arrow expands. Density compact/comfortable 32/36 and coarse min44 with virtualizer measurement synchronized across ownerDocument changes. Optional use-density.ts is your only writable react helper. panels v4 Group/Panel/Separator uses orientation/groupRef/id-keyed layout; numeric size is pixels, explicit percentages are strings. Agent direct v3 consumers belong T-09, SidePanel folderClick T-04: report migration debt, no compatibility aliases. Test actual behavior including density update and resize keyboard, not static class mirrors.
Use --hu tokens and approved density/font/motion; no parallel engines or compatibility variants. Existing tests' original risks must be carried forward. Run owned DOM tests, scoped lint/type checks; record global pending consumer errors honestly. No broad build or E2E while others write. Lead owns styles.css/main.js and final E2E; notify Lead when style regeneration needed. Send API contract and completion snapshot to integration owner. No claims based on prototype mocks.
## Return
Freeze owned files, write REPORT.md once beside TASK, notify Lead and integration writer. Include changed paths, actual red/green commands/exits, API/caller impact, no-hash-drift snapshot in /tmp/huhu-013-implement-t02-tree-panels, residual limitations and skill execution facts. Process artifacts only /tmp. No whole-ticket or goal completion claim.
