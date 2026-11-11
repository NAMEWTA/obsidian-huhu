---
schema_version: 2
session: "20261105T094057Z"
task: "023-preflight-t04"
kind: planning
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-04"
---
## Goal
Lead assigns gpt-6.1-sol medium read-only preflight of upcoming T-04 to avoid implementation permission/interface surprises. T-02 remains in_progress; do not implement downstream work or change current ticket status.
## Inputs
Read map revision10, T-04, goal-plan, spec AC031–033/114, DESIGN sections4/7 and relevant approved prototype; AGENTS/dev/ui and applicable architecture/i18n/testing rules. Inspect actual shell, content/onboarding/device choice, workbench contracts/compose/routing/state and related tests. T-02 controls are source reference; modal repairs currently active.
## Workspace and Scope
Current repo main37fcede4210a19bcc2a74809e7fdd301e5717957. All source/config/assets/Git/state/dependencies read-only. Only this REPORT and /tmp/huhu-t04-preflight may be written. No builds, tests modifying outputs, installs or delegation.
## Acceptance
Return concrete current entry/caller/dependency map and proposed minimal implementation files, required shared changes and missing exact permissions; verify obsolete folderClick and panels caller migration responsibility. Explain new UI state schema with no old-field compatibility, leaf-width breakpoints/resize persistence, shared DetailPane+Sheet integration and focus/F6 ownership, capabilities/no-secondary-panel and focus-mode navigation, first-run/content/device/status/ribbon scope. Identify source fields and how domain behavior remains intact. Define meaningful tests and real fixtures/gates without fabricating passes. Highlight any conflict/unknown that actually prevents T-04 readiness; optional local choices can be resolved from approved design.
## Return
Write immutable REPORT once with required ## 聚焦交接, ## 产物与验证, ## 问题与下一步 sections, concise exact paths and verification needs. Notify Lead then stop pending separate implementation dispatch after T-02 closes.
