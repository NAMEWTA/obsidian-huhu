---
schema_version: 2
session: "20261105T094057Z"
task: "027-review-t02-joined-touch-targets"
kind: review
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-02"
---
## Goal
Lead assigns gpt-6.1-sol high a focused additional T-02 hit-target audit for joined short/icon controls, a case absent from the long-label fixture. Independently prove or reject this source hypothesis.
## Inputs
Read T-02, DESIGN section3.6 desktop32/coarse44 and relevant dev/ui rules; current toggle.tsx, toggle-group.tsx, SettingsFormControls SegmentedControl and base.css data-hit rules. Reuse your016/021 private guarded Chrome probe infrastructure if useful. Joined data-hit-group directly limits child ::before width to100%; a small icon item can be32 and a short Chinese segment can be38. Does actual effective hit meet44 on coarse?
## Workspace and Scope
Current repo main37fcede4210a19bcc2a74809e7fdd301e5717957. All source/assets/tests/Git/state read-only; modal focus code is under026 repair and excluded. Freeze only relevant primitive hashes and current styles.css for private probe, verify start/end. Only this REPORT and /tmp/huhu-review-t02-joined-touch outputs may be written. No shared build, dependency edits or delegation.
## Acceptance
Render actual shared controls and generated CSS with desktop/coarse media: joined ToggleGroup sm with two icon-only labeled items; SegmentedControl with short Chinese labels 年/月; a long-label control. Measure real button and pseudo geometry. Use elementFromPoint and real CDP clicks around each independent boundary to distinguish nominal44 from overlapping or partitioned effective targets. Preserve single-dispatch and keyboard semantics. Compare with the approved rule, without class-only assertions or guessed inheritance. If valid, report no issue. If failing, give precise source location and minimum repair achieving44 per independent item without invisible overlap. Distinguish visual32/36 from hit area; do not redesign unrelated controls.
## Return
Write immutable REPORT once with required ## 聚焦交接, ## 产物与验证, ## 问题与下一步, both axes verdict, actual command/geometry/proof and hashes. Notify Lead and release scoped input. No source edits or Ticket completion claim.
