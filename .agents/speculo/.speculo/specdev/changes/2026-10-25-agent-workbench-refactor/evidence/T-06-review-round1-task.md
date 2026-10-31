---
schema_version: 2
session: "20261025T2306Z-t06-review"
task: "review-t06-round1"
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

Frozen input: C/evidence/T-06-review-input-round1.md#review-input, parsed copy /tmp/huhu-t06-review-round1-input.json.
Exact Input-SHA256 (JSON.parse then JSON.stringify): 0c6a73b7c544dd6eb53222c63e3a13f8a1d02608d4a8abb7feb38eff04b0a40f.
Working-tree base/observed HEAD: 33c21e098ef3188cbab5a09f3e0a01fadb787715.
Complete current 42-path snapshot: /tmp/huhu-t06-review-round1-source/.
Frozen standards/spec sources: /tmp/huhu-t06-review-round1-sources/ (anchor suffix is sha256(anchor)+.section.raw).
Actual incremental diff versus T05 approved delivery: /tmp/huhu-t06-review-round1-increment.diff. Review complete current code and both endpoints/consumers where relevant. Prior T01–05 unchanged delivery hashes: C/evidence/T-06-prior-delivery.json and T-06-reused-prior-round1.json; these are not a substitute for reviewing the T06 change. Scope's excluded_paths has >21k formal evidence paths; parse JSON selectively, do not dump it or raw manifests into output.

Normative input priority: Spec + implementation-contracts + T06 ticket sections + ADR/CONTEXT + approved DESIGN revision1 (digest f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab, PAGE-001/PAGE-003) and original API/resource/presentation contract, reconciliations, GP021 recovery packet/design/API decisions. Recovery changes implementation/verification method, not external AC. Actual original cycle attempts3 and all failed experiments retained. Evidence top summaries in T-06.md may still describe historical pending states; final actual receipts/readbacks in the frozen source list establish what ran, not an approval.

Source discovery: no new commit or remote PR exists; working-tree mode, original HEAD is base. Inspect actual applicable AGENTS (CLAUDE existing 24-byte forwarding stub only), configs and matched docs; explicit specs found. Record found/not-found/not-applicable sequence. Do not browse mutable external references unless necessary; never open GPL reference source. Existing fixed-reference numeric similarity is in final audit.

Current Root actual results: recovery1 candidate1 build, global zero-warning lint, architecture (1232 modules), Promise, bundle passed; 32 files / 356 tests / zero skips passed with fixed existing native helper SHA68364efe0e253ed9662814f596a904680476e918d2c4fd86207b9c0849417e91. 20 unchanged test files reuse original pass with exact source/risk audit. I18n31 dictionaries/4701keys reused through AST input equivalence. Chrome 11/11, six screenshots read, no unhandled/source drift. Similarity39 codefiles/33627 references, raw max.006/run36; scanner-template limitation explicit. Docs command remains exit1 for six pre-existing unrelated Bot anchors, not all-pass. Main6307900B SHA bc0422968f6fa5a76bd3319385c25250dbafa2a83c41ca92ce1284082176517c; styles unchanged. Eager123531B/106inputs unchanged; budget minimal attributed KiB update. Review actual logs/audits selectively, not just these statements.

Highest-risk semantic areas (do not limit findings to them): immutable exact original runtime/Space identity; source provenance/freshness/unknown/expiry; stop/exit/transport invalidation; no textual completion/approval; durable completion/seen cannot overwrite newer state or replay; spooling allocation/token/tombstone/path validation/bounded memory, failure recovery; original-terminal read-only and focus behavior; real ForegroundIntent -> Controller -> Workspace -> Host -> exact mounted View/textarea/lease, render/subscription gap, pending->connected, replacement same Session, cancellation/navigation/blur, deadline/bounded observers; dispose/reopen ownership; physical writer vs logical timeout; trusted keyboard and resize-owner invariants; package boundaries/lazy-loading/i18n/docs consistency and permission policy unchanged. OS foreground identity remains unknown until T08; actual Obsidian/Provider/five-platform E2E is user-owned, not claimed as automated proof.

## Workspace and Scope
All repository production/test/config/docs/formal files READ ONLY. Do not modify any repo file, source, test, main.js, styles.css, budget, tickets, Evidence or baseline. Do not commit/push/PR/release/archive. Do not edit TASK.
Allowed writes: /tmp/huhu-t06-review-r1-* reports, read-only probes/fixtures/bundles/results and isolated test caches as necessary. Use own unique prefixes. No global build/lint/Chrome/helper rebuild runs (Root owns those); no global shared fixture producer. Focused independent probes may import frozen/current real code and run isolated runtime models; retain actual inputs, raw output, exit codes. If a necessary probe needs repo writes or shared resource, send Root a precise proposal first. Frozen bytes must remain same; report drift instead of silently refreshing scope. You may inspect current unmodified caller context outside42paths only as needed to judge real behavior; distinguish pre-existing issues from T06 regressions.

## Acceptance
Validate frozen digest/source snapshot. Cover all applicable risk categories with falsifiable failure hypotheses, trace callers/implementations/tests/recovery. Existing greens/hashes/schema do not replace semantic review. No arbitrary finding cap. Every finding has severity, precise path/lines, reachable precondition, impact, normative basis, minimal fix and regression verification. Separate confirmed, inferred and unverified. No edit to manufacture pass. Report each axis pass/request-changes; I cannot skip specification. Review whole T06 A/B/C feature, not only recovery focus fix.

## Return
Write /tmp/huhu-t06-review-r1-report.md and optional /tmp/huhu-t06-review-r1-probes.json. Raw report must contain two independently anchored sections in this exact order, each with fields on their own lines, Observed text on SAME LINE:

<a id="standards"></a>
Reviewer: codex:/root/review_t06
Axis: standards
Result: pass | request-changes
Input-SHA256: 0c6a73b7c544dd6eb53222c63e3a13f8a1d02608d4a8abb7feb38eff04b0a40f
Observed: concrete read/check facts, then findings and limits below.

<a id="specification"></a>
Reviewer: codex:/root/review_t06
Axis: specification
Result: pass | request-changes
Input-SHA256: 0c6a73b7c544dd6eb53222c63e3a13f8a1d02608d4a8abb7feb38eff04b0a40f
Observed: concrete read/check facts, then findings and limits below.

Use your actual tool-provided identity if different. Send Root early material findings but finish both axes. Final response gives report path, SHA256, actual checks and source STOPPED. Only Root preserves raw report and updates formal state. Do not claim T06/Goal done yourself.
