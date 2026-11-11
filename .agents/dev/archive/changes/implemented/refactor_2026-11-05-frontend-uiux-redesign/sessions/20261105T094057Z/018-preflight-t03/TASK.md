---
schema_version: 2
session: "20261105T094057Z"
task: "018-preflight-t03"
kind: planning
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-03"
---
## Goal
Lead assigns gpt-6.1-sol medium READ-ONLY preflight of next T-03 while T-02 is reviewed. Prepare concrete implementation design and gaps, not production implementation or new Ticket. No delegation.
## Inputs
Read AGENTS/workspace/catalog; map/T03/goal-plan/Spec AC021–023/DESIGN5/7; dev/ui architecture/settings/i18n/testing rules; reuse-decision date references. Inspect current controls/modal/Portal read-only, existing date/time conversion consumers and task/core/time.ts only as domain context. T02 not done yet.
Lead pre-read official docs 2026-11-05: https://daypicker.dev/upgrading confirms preferred scoped v10 package and removed compatibility keys; https://daypicker.dev/guides/timepicker states time input is composed separately and TZDate is available for anchored zones. DESIGN section7 explicitly keeps epoch conversion in existing domain adapters; do not move task/core time algorithms into generic UI. https://daypicker.dev/docs/time-zone redirected to empty readable page, so follow actual documentation navigation rather than assume its content.
Lead additionally queried official registry: https://registry.npmjs.org/@daypicker%2freact/latest is10.0.2/MIT/React>=16.8 and depends on react-day-picker10.0.2; https://registry.npmjs.org/react-day-picker/10.0.2 uses date-fns^4.1.0 and @date-fns/tz^1.4.1, Node>=18. Exact local responses /tmp/huhu-t03-lead-preflight/*.json. No installation performed. Verify exported APIs before proposing imports; avoid direct undeclared transitive imports.
## Workspace and Scope
Current /home/wta/projects/obsidian-huhu main37fcede4210a19bcc2a74809e7fdd301e5717957. All repo files read-only except this REPORT. No dependency installs, source/config/asset/Git/state writes or tests/build changing shared outputs. Research official DayPicker v10 package/docs/types in /tmp/huhu-t03-preflight if needed. Do not edit node_modules.
## Acceptance
Return exact proposed files/API/value semantics/caller contract and missing write permissions. Resolve date-only strict parsing, Range draft/apply/cancel, DateTime structured value/IANA/DST nonexistent+ambiguous behavior using existing qualified library or consumer-owned domain conversion; no copied homegrown timezone algorithm or prohibited ui→module imports. Verify current official latest scoped package/peer/license/exports and proposed locale/weekStart interface, offline source and NOTICE implications. Compare only meaningful local options consistent with approved design. Identify tests/fixtures and gates, no implementation acceptance claim.
## Return
Write immutable REPORT with required ## 聚焦交接, ## 产物与验证, ## 问题与下一步 sections once; concise findings and actual sources/queries. No code or speculative passing results. Notify Lead, then wait for separate implementation task after dependency closes.
