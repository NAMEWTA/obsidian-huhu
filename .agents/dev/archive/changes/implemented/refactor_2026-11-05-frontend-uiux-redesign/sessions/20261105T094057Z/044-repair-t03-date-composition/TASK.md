---
schema_version: 2
session: "20261105T094057Z"
task: "044-repair-t03-date-composition"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-03"
---
## Goal
Existing gpt-6.1-sol medium implementer repairs all five independent 042 findings in one batch. Preserve approved UI-002 exactly; no compatibility, alternate engine, or discretionary redesign. No delegation.
## Inputs
Current AGENTS/dev/ui/SpecDev I and 040 TASK/REPORT, 042 immutable REPORT, T-03, DESIGN3/UI-002. 042 has released its 12-source/shared-context freeze. Native focused counterexamples and independent tests are in /tmp/huhu-review-t03. The original standalone calendar proof is valid only for its stated boundary and does not close actual popup failures.
## Workspace and Scope
Current main HEAD37fcede4210a19bcc2a74809e7fdd301e5717957. Write only src/ui/components/huhu/date/** and scripts/ui-review/fixtures/frontend-redesign/T-03/**, this immutable REPORT, and /tmp/huhu-t03-repair. All shared components/modal-layer/dictionaries/dependencies/assets/config/Git/index/formal state/Evidence read-only, owned by Lead. Lead is independently integrating a cross-root floating-owner candidate and leaf metrics/main lifecycle. Do not build shared styles or run source-bound native probes until Lead supplies a new source/CSS boundary. Date Today/Clear labels already exist in ui dictionary. Request any missing shared seam with concrete evidence.
## Acceptance
Close S01: Esc/outside/Cancel discard unapplied range drafts/errors without onChange, retaining true external error and controlled replacements. Close S02: actual DateField and Range popups retain full standard 2px outline +2px offset around edge cells. Close S03: constrained-height Range vertical scrolling preserves all seven independent 44px day targets without horizontal compensation or scrollbar clipping. Keep desktop280/day34 and coarse312/grid308/day44; do not shrink targets/grid/focus or substitute inset rings.
Close V01: approved DateField footer Today/Clear, localized and sharing validation/commit; honor min/max/required/readOnly/disabled/clearable and DateTime single composite clear. Close V02: left calendar icon and approved accent-text/bottom-dot today marker. Inspect exact UI-002 and DESIGN before implementation, no freehand substitute.
Preserve all existing strict date/value, IME, controlled draft, open range, year0..99, caller time-zone/domain validation ports, ownerDocument/adoption and cleanup contracts. No parallel Radix focus/positioning engine. Add meaningful actual-component regression tests from the independent red controls, reuse trusted browser driver at actual popup/scroll boundaries and both documents. Preserve standalone controls. Submit classes-ready message early for coordinated CSS. Run applicable scoped tests/types/lint; honest atomic global gate debt stays pending. Freeze exact source+fixture snapshot, report actual results and limits for independent high review; Lead owns full66 E2E/formal completion.
## Return
Immutable REPORT with ## 聚焦交接, ## 产物与验证, ## 问题与下一步; five findings mapped to fixes and actual red/green/native evidence, exact hashes, API changes if any, shared requests and unverified gates. No Ticket/Goal state changes, commits, pushes or releases.
