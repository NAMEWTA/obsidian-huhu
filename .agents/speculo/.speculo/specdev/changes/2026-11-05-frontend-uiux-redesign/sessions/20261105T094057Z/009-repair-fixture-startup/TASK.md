---
schema_version: 2
session: "20261105T094057Z"
task: "009-repair-fixture-startup"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-01"
---
## Goal
Lead /root assigns medium minimal repair of deterministic iframe document-readiness race discovered during independent Lead E2E. No recursive delegation.
## Inputs
Read AGENTS/dev/ui/implement contracts, 007 and008 reports. Actual failure /tmp/huhu-t01-lead-acceptance-retry/result.json: before0cases TypeError null.append; theme.tsx reads iframe.contentDocument at module load then doc.body.append while srcdoc navigation may not finish. First Lead run exit143 interruption distinct; no full result. Root cause must be confirmed, not only assumed.
## Workspace and Scope
Current /home/wta/projects/obsidian-huhu HEAD37fcede4210a19bcc2a74809e7fdd301e5717957. Write only scripts/ui-review/run.mjs, run.test.mjs, fixtures/frontend-redesign/shared/theme.tsx/theme.mjs and focused fixture readiness tests within shared/. No production/theme/CSS/config/dependencies/assets/state/index changes. Candidate 007 otherwise remains approved by008. No broad Chrome/node cleanup; own handles only.
## Acceptance
Wait on real main/iframe readiness with check+event race-safe ordering; never cache initial about:blank Document before srcdoc loads, no arbitrary sleep or swallowed failure. Cover slow iframe/main startup with actual regression; both Documents mount once, readiness timeout must fail. Preserve all66 samples and132 overlays/locale/contrast/motion assertions. Run targeted startup regression and full matrix at least once on repaired bytes; source freeze/report when stable. Lead repeats final matrix and high reviews delta.
## Return
Write /home/wta/projects/obsidian-huhu/.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/sessions/20261105T094057Z/009-repair-fixture-startup/REPORT.md once. Process outputs /tmp/huhu-fixture-startup. Tell Lead when frozen, paths/tests/actual exit codes; preserve original failures. No official status/Evidence.
