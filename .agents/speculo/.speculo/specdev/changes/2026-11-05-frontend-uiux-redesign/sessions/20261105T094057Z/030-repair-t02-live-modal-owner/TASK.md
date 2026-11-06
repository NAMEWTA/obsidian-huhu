---
schema_version: 2
session: "20261105T094057Z"
task: "030-repair-t02-live-modal-owner"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-02"
---
## Goal
Lead assigns original gpt-6.1-sol medium modal owner to repair028's verified owner-liveness regression and finish the relevant011 fixture proof. Preserve prior successful focus ownership fixes; no delegation.
## Inputs
028 final REPORT and its five exact FocusScope/source controls,026/011 frozen snapshots/reports, original025 failures, approved DESIGN3/dev/ui/AGENTS. Keep every old failure and immutable report unchanged.
## Workspace and Scope
Current main37fcede4210a19bcc2a74809e7fdd301e5717957. Writable only src/ui/react/modal-layer.tsx, src/ui/react/modal-regressions.dom.test.tsx and scripts/ui-review/fixtures/frontend-redesign/T-02/**. No other component/ref/primitive/tree sources, shared assets/config/package/dictionary/Git/state edits. Need another path: ask Lead first.
## Acceptance
Separate logical owner lifetime/visibility from focus-target availability. A connected visible owning page may legitimately be aria-hidden by its surviving parent Radix modal; that must not suppress nested Dialog or dirty-confirmation close focus. Keep strict aria-hidden/disabled/hidden filtering for actual focus targets. Do not infer liveness solely from Radix marker attributes, add broad global listeners, remove destroyed-owner guards, or disable all parent focus restoration.
Reproduce all five028 failures then prove exact original source after real FocusScope unmount event and queued work: Dialog/Sheet KeepEditing and Esc, ordinary nested Dialog. Original025 contents fallback, parent actual discard, whole owner destruction and conditional Dialog-unmount controls must remain green. Keep owner identity across multiple roots, no stealing existing focus.
Fixture must assert exact source for nested cancellation after event completion, plus owner destruction and parent actual close. Check secondary iframe viewport/clientWidth and dialog actual geometry when brought onscreen; resolve fixture sizing or report actual source issue without silently adjusting expected product width. Account for sample CSS width/zoom and each owner Document, not only screenshot pixel size.
Run scoped production/test types, lint/diff and focused original regressions. First debug one-case native path; freeze source and report before independent delta. Do not rerun final66 until pending027 short/icon joined target repair is integrated, avoiding a known incomplete candidate. No fixed sleeps or first-transient-focus assertions.
## Return
Immutable REPORT once with required ## 聚焦交接, ## 产物与验证, ## 问题与下一步. New snapshot/logs only /tmp/huhu-t02-live-owner-repair, truthful checks/failures and remaining gates. Final candidate fixture report under a later integration task; original011 remains immutable. Notify Lead and await high review. No Ticket or Goal completion claim.
