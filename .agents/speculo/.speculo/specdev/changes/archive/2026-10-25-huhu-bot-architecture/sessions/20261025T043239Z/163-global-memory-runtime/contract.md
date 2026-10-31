# T-15 runtime contract checkpoint

Session: 20261025T043239Z  
Task: 163-global-memory-runtime  
Status: source implementation checkpoint; physical/database acceptance remains with Root.

## Capability boundary

`application/memory/global.OwnerCommands` is the only owner-facing implementation of `api.GlobalMemoryAPI`. `ToolProposer` implements only `api.GlobalMemoryToolProposer`; its concrete type does not expose `ResolveGlobal`. `hap.New` leaves the owner port unset. `hap.NewOwner` and `stdio.NewOwner` receive the capability only from local composition. Ordinary and managed stdio use the same owner constructor; `ManagedOwner`, JSON role fields, and model payload fields are not authorization inputs.

## Persistent proposal port

`adapters/outbound/sqlite/globalmemory.Store` owns proposal rows in migration 015/schema version 11. The row stores the proposal id, profile/principal/namespace, actor, operation, target head and hash, catalog revision, fixed preview/frozen JSON, expiry, state, CAS revision and a receipt association. Confirmed facts are written only through Memory's `GlobalFactTx` port.

The Memory-owned port is:

```go
type GlobalFactTx interface {
    WithGlobalTx(context.Context, bool, func(context.Context, *sql.Tx) error) error
    PrepareOwnerGlobalInTx(context.Context, *sql.Tx, api.RequestIdentity, api.MemoryGlobalProposal) (FrozenGlobal, error)
    PrepareToolGlobalInTx(context.Context, *sql.Tx, api.ToolExecution, string, api.GlobalMemoryToolDraft) (FrozenGlobal, error)
    ApplyApprovedGlobalInTx(context.Context, *sql.Tx, api.RequestIdentity, FrozenGlobal) (api.MemoryItem, error)
    CheckGlobalPreviewInTx(context.Context, *sql.Tx, api.RequestIdentity, FrozenGlobal) (time.Time, error)
}
```

Owner propose and resolve run through one Memory transaction, epoch/receipt checks, fixed preview hashes, current target/source qualification, proposal CAS and receipt persistence. Approve calls `ApplyApprovedGlobalInTx`; reject leaves 014 facts untouched. Tool proposals are derived from the real `ToolExecution`, current run/config/AllowedTools and complete consumed source closure; the model cannot supply sources. Tool receipt keys are scoped by profile/principal and `tool:<callID>`, with input hash bound to the frozen actor/config/source data and no claim token.

Owner metadata-only delete is represented by a pending proposal with `Body == nil`; create/update still require a body. The Memory fact adapter uses actor kinds `owner` and `tool`; owner has no run/subject columns, while tool actors retain durable run/subject/config revisions. `SourceAccess` is preserved only for tool proposals. Source/head/target changes fail closed before any successful receipt.

## Reader and physical delivery seam

`globalmemory.Store` implements Memory's `ProposalReader` and Events' `GlobalProposalDeliveryReader` in the caller's transaction. Get/List re-read fixed JSON and current qualification, return body-free terminal/deleted stubs or a bounded page, and use proposal ids as cursors with profile metadata revision as the page watermark. The delivery reader rejects empty/duplicate/over-800 batches, requires pending body-bearing proposals and returns the earliest expiry. Events owns the existing read fence and 250 ms delivery gate; it does not duplicate proposal SQL.

## Composition

Bootstrap creates one Memory Store, one global proposal Store, installs the Memory ProposalReader and Events reader on that same Store, and exposes `Facade.GlobalMemory` through `OwnerCommands`. Local stdio uses `NewOwner` for both connection modes. The model proposer setter is a separate Broker seam; it must receive `ToolProposer` only and is not a Resolve capability.

## Wire output

`contracts/hap/v0.1/generate.mjs` marks `memory.proposeGlobal` and `memory.resolveGlobal` implemented and emits their DTO/schema/golden fixtures. HAP advertises the two methods only when the owner capability is installed. Body-bearing proposals use `memory_proposal` delivery subjects; metadata-only delete and body-free terminal proposals do not create a body subject.
