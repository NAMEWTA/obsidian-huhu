---
schema_version: 2
session: "20261105T094057Z"
task: "016-review-t02-primitives"
kind: review
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-02"
---
## Goal
Lead assigns gpt-6.1-sol high independent review of frozen012 primitive/forms partition and Lead shared ui dictionary changes. This is candidate subreview; full T02 browser and pending iframe coverage remain integration gates.
## Inputs
Read012 TASK/REPORT and snapshot; T02, map, spec AC011–013, DESIGN3 sections3–7/UI002, AGENTS/dev/ui and code-review/risk methods. Original main base37fcede4210a19bcc2a74809e7fdd301e5717957. No source implementation by reviewer.
## Workspace and Scope
Review exact012 writable files actually changed, plus src/shared/i18n/lazy/ui.ts Lead keys. Other modal/tree files are under parallel repairs: necessary read-only context but no broad suite/build or freezing those files. No source/Git/state/asset edits; only REPORT here and /tmp/huhu-review-t02-primitives.
## Acceptance
Both axes: full approved primitive variants/sizing/density/token semantics and caller debts, Button busy/disabled/asChild/ref/keyboard, inputs/checkbox/switch/segmented/tabs/select, form label/help/error associations, generic presentation component boundaries, async pending SettingsSwitchRow feedback, keyboard/ARIA and controlled values. Confirm existing controls are actually reused and old variants removed without hiding unported consumers. Source attribution and meaningful real tests. Independently run focused stable tests/types/lint; verify frozen hashes before/after.
Known raw Vitest iframe SegmentedControl failure lacks production radix-owner-document transform. Do not patch production to satisfy an unadapted dependency. Lead requires equivalent two-Document ArrowRight/Left/focus/selection in actual guarded browser fixture before raw duplicate removal. Record this still-pending coverage, preserve failure. Main-document DOM regression remains required. Do not pass whole ticket or waive browser checks. Assess primary shadow semantic adaptation against approved appearance in final generated CSS later; no guessed visual pass.
## Return
Write immutable REPORT once with standards/specification verdict, exact findings/reproductions, actual checks/exits, input snapshot, residual pending integration. Notify Lead and release candidate. No delegation.
