---
schema_version: 2
session: "20261025T2355Z-t06-review2"
task: "review-t06-round2"
kind: review
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-06"
---

# T06 independent review

## Goal
Lead codex:/root owns the active user-authorized full 18-ticket Agent Workbench Goal. You are a NEW independent reviewer using the user's gpt-6-astra/high arrangement. Review the full T06 delivered slice on both axes, standards first and specification second. Do not implement fixes or delegate. All production writers are SOURCE STOPPED. T06 remains in_progress; T07–18 production locked.

Implementers to exclude from reviewer identity: codex:/root, codex:/root/prepare_t03 (A), codex:/root/prepare_t05_screen (B), codex:/root/implement_t01 (C). You have not participated in this implementation.

## Inputs
Repository/current workspace: /home/wta/orca/workspaces/obsidian-huhu/terminal.
Change C: .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor.
Current Goal GP-021 / Map22. User requires every new Shell/Agent/oneshot run bound to explicit valid Space; old interactive entry must select first, cancel means zero admission/spawn; background missing/stale Space is typed failure. No inference from cwd/current focus/only candidate. T14/T15 consumers are later tickets, not T06 delivered functionality.

First follow repository AGENTS discovery, then read the actual common Skill .agents/speculo/workflows/specdev/common/skills/code-review/SKILL.md and its source-discovery, fowler-smells, risk-review, reviewer-contracts, review-evidence, working-tree-review references. Also applicable dev/ui project Skills and frozen source list. This is I final independent review, not a separate C work/report namespace.

Frozen input: C/evidence/T-06-review-input-round2.md#review-input, parsed copy /tmp/huhu-t06-review-round2-input.json.
Exact Input-SHA256 (JSON.parse then JSON.stringify): 9385796b452e0c596305021d0a8bb8c73051d6d47cd7f1b58473283ab77fc6a3.
Working-tree base/observed HEAD: 33c21e098ef3188cbab5a09f3e0a01fadb787715.
Complete current 42-path snapshot: /tmp/huhu-t06-review-round2-source/.
Frozen standards/spec sources: /tmp/huhu-t06-review-round2-sources/ (anchor suffix is sha256(anchor)+.section.raw).
Actual incremental diff versus T05 approved delivery: /tmp/huhu-t06-review-round2-increment.diff. Review complete current code and both endpoints/consumers where relevant. Prior T01–05 unchanged delivery hashes: C/evidence/T-06-prior-delivery.json and T-06-reused-prior-round2.json; these are not a substitute for reviewing the T06 change. Scope's excluded_paths has >21k formal evidence paths; parse JSON selectively, do not dump it or raw manifests into output.

Normative input priority: Spec + implementation-contracts + T06 ticket sections + ADR/CONTEXT + approved DESIGN revision1 (digest f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab, PAGE-001/PAGE-003) and original API/resource/presentation contract, reconciliations, GP021 recovery packet/design/API decisions. Recovery changes implementation/verification method, not external AC. Actual original cycle attempts3 and all failed experiments retained. Evidence top summaries in T-06.md may still describe historical pending states; final actual receipts/readbacks in the frozen source list establish what ran, not an approval.

Source discovery: no new commit or remote PR exists; working-tree mode, original HEAD is base. Inspect actual applicable AGENTS (CLAUDE existing 24-byte forwarding stub only), configs and matched docs; explicit specs found. Record found/not-found/not-applicable sequence. Do not browse mutable external references unless necessary; never open GPL reference source. Existing fixed-reference numeric similarity is in final audit.

Current Root actual results: recovery1 candidate2 build, global zero-warning lint, architecture and Promise passed; 47 files / 526 tests / zero skips passed using unchanged immutable native helper SHA68364efe0e253ed9662814f596a904680476e918d2c4fd86207b9c0849417e91. Chrome 11/11 re-run with no unhandled/source drift; Root viewed six current PNGs and read actual 420-event trace/results. I18n31 dictionaries/4701keys reused through current AST equivalence; docs retains original exit1 for six unrelated Bot anchors, not all-pass. Main6310559B SHA3e3aded6f8e81890ddc74ebd5f424248a827f1e17e0b5eafb3dea260aee3dde0; styles1421846B unchanged. Eager123531B/106inputs unchanged; actual 2659B repair delta exactly attributed and minimal KiB caps checked. Prior full39 source similarity plus current seven-path supplement actual result is in frozen audits; inspect numeric readback and scanner limitations, never GPL source.

Round1 independently confirmed two findings on both axes; preserve that report as history. Current repair covers only A4/C3 within original47 allocation: OpenCode registration first-root fence (raw full answers untouched); consumer retains whole bounded pending Map and immediately declares gap; Session observeOrdered preflights structure/sequence/budget then batches final notification, preserving actual Stop N and hard lifecycle/HookError/close priority. Read T-06-review-repair1-packet.md and API decision plus actual source, original review report/probes and A/C red/green/final handoffs. Independently verify both original counterexamples are closed and regression surfaces remain sound. Do not infer closure from 526 green tests or Root summary. This is recovery1 attempt2, not a new cycle; original cycle3 and recovery1 attempt1 remain recorded. Treat repair packet as additional implementation contract, not permission to narrow review to seven files.

Highest-risk semantic areas (do not limit findings to them): immutable exact original runtime/Space identity; source provenance/freshness/unknown/expiry; stop/exit/transport invalidation; no textual completion/approval; durable completion/seen cannot overwrite newer state or replay; spooling allocation/token/tombstone/path validation/bounded memory, failure recovery; original-terminal read-only and focus behavior; real ForegroundIntent -> Controller -> Workspace -> Host -> exact mounted View/textarea/lease, render/subscription gap, pending->connected, replacement same Session, cancellation/navigation/blur, deadline/bounded observers; dispose/reopen ownership; physical writer vs logical timeout; trusted keyboard and resize-owner invariants; package boundaries/lazy-loading/i18n/docs consistency and permission policy unchanged. OS foreground identity remains unknown until T08; actual Obsidian/Provider/five-platform E2E is user-owned, not claimed as automated proof.

## Workspace and Scope
All repository production/test/config/docs/formal files READ ONLY. Do not modify any repo file, source, test, main.js, styles.css, budget, tickets, Evidence or baseline. Do not commit/push/PR/release/archive. Do not edit TASK.
Allowed writes: /tmp/huhu-t06-review-r2-* reports, read-only probes/fixtures/bundles/results and isolated test caches as necessary. Use own unique prefixes. No global build/lint/Chrome/helper rebuild runs (Root owns those); no global shared fixture producer. Focused independent probes may import frozen/current real code and run isolated runtime models; retain actual inputs, raw output, exit codes. If a necessary probe needs repo writes or shared resource, send Root a precise proposal first. Frozen bytes must remain same; report drift instead of silently refreshing scope. You may inspect current unmodified caller context outside42paths only as needed to judge real behavior; distinguish pre-existing issues from T06 regressions.

## Acceptance
Validate frozen digest/source snapshot. Cover all applicable risk categories with falsifiable failure hypotheses, trace callers/implementations/tests/recovery. Existing greens/hashes/schema do not replace semantic review. No arbitrary finding cap. Every finding has severity, precise path/lines, reachable precondition, impact, normative basis, minimal fix and regression verification. Separate confirmed, inferred and unverified. No edit to manufacture pass. Report each axis pass/request-changes; I cannot skip specification. Review whole T06 A/B/C feature, not only recovery focus fix.

## Return
Write /tmp/huhu-t06-review-r2-report.md and optional /tmp/huhu-t06-review-r2-probes.json. Raw report must contain two independently anchored sections in this exact order, each with fields on their own lines, Observed text on SAME LINE:

<a id="standards"></a>
Reviewer: codex:/root/review_t06_round2
Axis: standards
Result: pass | request-changes
Input-SHA256: 9385796b452e0c596305021d0a8bb8c73051d6d47cd7f1b58473283ab77fc6a3
Observed: concrete read/check facts, then findings and limits below.

<a id="specification"></a>
Reviewer: codex:/root/review_t06_round2
Axis: specification
Result: pass | request-changes
Input-SHA256: 9385796b452e0c596305021d0a8bb8c73051d6d47cd7f1b58473283ab77fc6a3
Observed: concrete read/check facts, then findings and limits below.

Use your actual tool-provided identity if different. Send Root early material findings but finish both axes. Final response gives report path, SHA256, actual checks and source STOPPED. Only Root preserves raw report and updates formal state. Do not claim T06/Goal done yourself.
