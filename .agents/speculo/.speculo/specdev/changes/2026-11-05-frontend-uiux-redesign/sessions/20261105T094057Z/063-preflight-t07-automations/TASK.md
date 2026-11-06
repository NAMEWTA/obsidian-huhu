---
schema_version: 2
session: "20261105T094057Z"
task: "063-preflight-t07-automations"
kind: planning
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-07"
---
## Goal
Read-only T07 implementation preflight while T15 independent review is running. Identify actual entry points/callers/fields/commands and exact write/verification range. No module implementation before G-CONTRACT. No delegation.
## Inputs
AGENTS/dev/current candidate ui, T07/Map18/Goal/DESIGN3/UI002, actual automations ui/schema/API/services and zoned-occurrences resolver. Treat author reports only as claims; production source authoritative.
## Workspace and Scope
Repository READONLY except this immutable REPORT. Process materials /tmp/huhu-t07-preflight only. No product code, formal state, shared dictionary, assets, dependency, build, index or Git writes. Existing old work is preserved.
## Acceptance
List actual pages/settings/editor/action fields, all schedule types and live service write ports, list/selection/detail/runs/deeplinks lifecycle and dirty/late failure responsibilities. Confirm full migration scope, shared dictionary seams, required DateTime props and opt-in strict DST adapter using current resolver; no second timezone engine or mock-only domain validation. Inspect callers and API exports, list concrete unknowns and minimal source-backed decisions. Outline meaningful nearest tests and actual component fixture integration; do not implement or claim acceptance. Keep report concise and actionable, not duplicated whole spec.
## Return
Immutable REPORT with ## 聚焦交接, ## 产物与验证, ## 问题与下一步, exact source snapshots and actual checks. Validate dispatch return; do not mark T07 started/done or T15 accepted.
