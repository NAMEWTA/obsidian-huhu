## Session

`20261025T043239Z`

## Task

`161-global-memory-facts` / T-15 global facts adapter and private/global recall.

## Status

Source candidate implemented and frozen for Root/163 compilation. This is not a full T-15 completion claim: Go, DB, Node, HAP, Events, Provider, and physical proposal checks are pending Root windows.

## 聚焦交接

`memory/global_facts.go` now owns the adapter-only `FrozenGlobal` contract and all five transaction seams: `WithGlobalTx`, `PrepareOwnerGlobalInTx`, `PrepareToolGlobalInTx`, `CheckGlobalPreviewInTx`, and `ApplyApprovedGlobalInTx`. Owner proposals use actor kind `owner`; tool proposals use actor kind `tool` (their body creator remains `agent` or `temporary`) and require the active Run claim, pinned configuration and `memory.proposeGlobal` in AllowedTools. Confirmation checks frozen actor revisions, full source closure, exact global target head/revision/hash/scope, and current qualification without requiring the original Run to remain running or its pin to remain present. Owner source-revoked delete can remain body-free; tool delete does not receive that exemption. Updates merge the old body closure but retain the old head only for CAS/audit.

`namespace.go` uses the canonical `global:<profile>` principal. `private.go` routes proposal Get/List through the installed same-transaction reader and denies when absent. `context_plan.go` joins Run-private and profile-global candidates with a 20-item/131072-byte bound while preserving each item's real namespace in `DerivedInput`; `context_read.go` verifies current memory head/namespace/thread before body hydration.

## 产物与验证

Source-only formatting was run with `gofmt` on the six owned adapter files. The final narrow repair also rechecks a tool FrozenGlobal `SourceAccess` through the original `CheckInTx(read,send)` inside `CheckGlobalPreviewInTx`; owner previews with nil SourceAccess do not take this branch. It also verifies a retained task snapshot or live pin by decoding its Agent and matching the frozen `ConfigDigest`; when both are released, the durable Run actor revisions remain the confirmation identity. No Go compilation, `go list`, DB, Node, CLI, Provider, HAP, Events, or race checks were run under this ticket. Root/163 owns the next compile and physical proposal/approval window.

Source hashes are recorded in `logs/02-source-checkpoint-r2.json` and interface semantics in `logs/interface-checkpoint.md`.

## 问题与下一步

The candidate must be compiled with 163's proposal adapter and then tested through owner create/update/delete, stale target/source rejection, model proposal after Run completion, proposal reader Get/List, cross-agent global recall, and Stop/Done cancellation. Any compile or schema mismatch remains an open integration issue; no unsupported success is claimed here.
