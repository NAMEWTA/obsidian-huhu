---
schema_version: 2
session: "20261105T094057Z"
task: "025-review-t02-modal-repair"
kind: review
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-02"
---
## Goal
Lead assigns gpt-6.1-sol high independent combined review of 022 modal fixes and 024 explicit leaf/main contract. Preserve unchanged 019 observations; do not implement or delegate.
## Inputs
Read 019 final REPORT and independent repros; 022 and 024 TASK/REPORT/snapshots; T-02, Map revision11, approved DESIGN3 sections4/7, AGENTS/dev/ui and code-review methods. 017 tree and 021 primitives remain separate valid evidence.
## Workspace and Scope
Current repo main HEAD37fcede4210a19bcc2a74809e7fdd301e5717957. Exact final modal/react production and test paths frozen by 024, combined with 022 checkpoint and new compose-refs/regression files. T02 fixture/** is still edited by011 and excluded from this review. No source/config/assets/Git/state edits; only REPORT here and /tmp/huhu-review-t02-modal-repair.
## Acceptance
Reproduce all five 019 findings against final source; prove exact ref cleanup for returned/legacy/object refs and StrictMode lifecycle; visibility predicate covers hidden ancestors/inert/aria-hidden/disabled/CSS, top F6 and removed/hidden source fallback, no second trap. Stable DetailPane child instance/local state/uncontrolled draft/selection/scroll survives actual bidirectional aside↔Sheet transition, real close/discard disposes exactly once and restores focus. Keep dirty cancel/Esc/outside/imperative/Command IME and per-Document stack controls.
Explicit required leafWidth:number separates leaf from observed main. Verify leaf620/main568 gets 360 overlay, leaf580 fullwidth; inline only leaf>=960 AND main>=1000. When porting original019 repro to this API add leafWidth1100 without weakening assertions and assert actual mode transition, preventing an undefined prop from making the test vacuously remain Sheet. Check missing leaf measurement consumers only within allowed new component calls, no hidden compatibility alias.
Run meaningful focused tests and scoped production/test types/lint on stable source; hash before/after. Assess new stable-host portal/context/adoption/close lifecycle and ref helper against React19 semantics. Final real adapter browser/physical geometry/combined fixture/Obsidian gates remain explicit pending, not claimed from happy-dom. Reuse unchanged source evidence without rerunning unrelated suites.
## Return
Write immutable REPORT once with required ## 聚焦交接, ## 产物与验证, ## 问题与下一步, both axes verdict and precise findings/evidence. Notify Lead and explicitly release frozen candidate. No whole-ticket/Goal completion claim.
