---
schema_version: 2
session: "20261105T094057Z"
task: "036-preflight-t16-diffs"
kind: review
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-16"
---
## Goal
Lead assigns existing gpt-6.1-sol high a read-only implementation-risk preflight of T-16's approved diffs.com integration while T-02 acceptance continues. Do not implement T-16 before its dependencies, redesign the approved UI, delegate, or expand the module/domain scope.
## Inputs
Read T-16, spec AC-092/094–099, DESIGN3 §3.7/§5/versioning, ADR-006/reuse-decision and relevant coverage. Follow existing AGENTS/dev/ui/research-and-reuse/licensing/architecture contracts. User explicitly requested https://diffs.com/docs; use official docs, registry, published release declarations and primary source only for unknown API/build facts. Same-session metadata target is @pierre/diffs1.6.4; verify/reuse real evidence rather than assuming online head and pinned release have the same API.
## Workspace and Scope
Current main37fcede4210a19bcc2a74809e7fdd301e5717957, /home/wta/projects/obsidian-huhu. All repo files read-only except your one immutable REPORT here. Process materials only /tmp/huhu-t16-preflight. No install/node_modules changes, product/fixture/build assets/config/dependencies/dictionaries/Git/index/formal state/Evidence writes. T-02 modal/primitive/fixture writers continue independently; do not freeze or validate their whole workspace.
## Acceptance
Trace actual current versioning UI entrypoints, diff model/Worker build, hunk mapping/restore and history/endpoint services. Identify exact minimal seams needed for MultiFileDiff/FileDiff/CodeView/UnresolvedFile, all existing consumers, domain ownership and old tests' risk transfer. Check official pinned API types, missing/empty sides, revision cache and partial hydration, conflict callbacks/remount, selection/annotations, theme bridge and ownerDocument/shadow DOM/Worker lifecycle. Do not copy library engines or propose a replacement for existing Git/domain transactions.
Inspect actual esbuild/NOTICE/budget configuration and installed Shiki graph; propose precise language whitelist/Worker entry integration and verifiable startup/metafile/size checks. Do not raise budgets or mutate generators. State what is proven by static/release inspection versus still requiring true browser/Obsidian tests. Report concrete missing ticket/shared-path permissions or contradictory public contracts if found; no speculative feature expansion. Reuse the existing approved package choice, unless actual incompatible evidence requires return to Lead. Concise implementation preflight and source references, no full suite or broad speculative tests.
## Return
Write immutable REPORT once with ## 聚焦交接, ## 产物与验证, ## 问题与下一步: actual read-only facts, primary URLs/release/source anchors, proposed source/Lead-owned seams, actionable gaps and future verification gates. No Ticket/Goal state or completion claims. Notify Lead; no source repair.
