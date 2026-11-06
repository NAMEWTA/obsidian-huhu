---
schema_version: 2
session: "20261105T094057Z"
task: "024-detail-pane-leaf-metrics"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-02"
---
## Goal
Lead assigns original medium shared-component owner to complete the DetailPane leaf/main width contract exposed by023 preflight, after022 snapshot/report is frozen. This is T02 producer completion for approved DESIGN4; no downstreamT04 source implementation.
## Inputs
Original T02/spec/DESIGN4/7/dev/ui/AGENTS;022 final snapshot/report and original019 findings;023 preflight when available. Native messages agree explicit required leafWidth:number prop, not ambient React-context assumption across independent roots.
## Workspace and Scope
Current repo main37fcede4210a19bcc2a74809e7fdd301e5717957. Writable only src/ui/components/huhu/DetailPane.tsx, DetailPane.dom.test.tsx and scripts/ui-review/fixtures/frontend-redesign/T-02/**. No other modal/primitive/tree source, shared assets/config/dictionary/Git/state changes. Preserve022 checkpoint unchanged in/tmp.
## Acceptance
Add explicit leafWidth:number and retain actual parent/main measurement. Inline only when leaf>=960 AND available main>=1000 (360 detail leaves640); fullwidth overlay only leaf<600, medium leaf overlay360/max440 even main<600. No compatibility fallback to guessing leaf from parentmain. Test leaf620/main568 remains360 Sheet, leaf580 fullwidth, largeleaf/main and original draft/instance/selection/scroll/dirty/focus paths still valid. Update owned fixture with actual ownerleaf metrics for each Document, not topbrowser viewport or inherited secondary width. T04 will feed actualleaf measurement; shared component cannot import shell.
Run focused DetailPane/modal regressions and scoped types/lint/diff. Source+fixture freeze then notifyLead for combined high review of022+024 and final fixture; full original011 acceptance remains pending. Need sharedstyles regeneration askLead, no direct writes.
## Return
Write immutable REPORT once with required ## 聚焦交接, ## 产物与验证, ## 问题与下一步. Save frozen precise source checkpoint and logs only /tmp/huhu-t02-detail-metrics. Record publicAPI and exact validation, preserve original snapshots and failures. No delegation or Ticket/Goalcomplete claim.
