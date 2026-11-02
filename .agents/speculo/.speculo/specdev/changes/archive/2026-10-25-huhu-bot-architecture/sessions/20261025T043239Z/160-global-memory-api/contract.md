# 160：T-15 公共结果与内部能力接缝

本文件冻结 160 实际新增的纯 API 与后续 owner 的调用方向；不表示 SQLite/HAP/Broker/物理投递已实现。实际 Go 类型以 `internal/application/api/memory.go`、`tooling.go`、`global_memory.go` 为准。现有 HAP 两个 global 方法及 `contracts/hap/v0.1/methods.json` 的 `implemented:false` 暂不改变。

## 已落盘纯 API

```go
type GlobalMemoryToolDraft struct {
    Operation, TargetItemID, Text, ExpectedRevision string
    Scope MemoryScope
}
// ToolCall.GlobalMemory *GlobalMemoryToolDraft `json:"globalMemory,omitempty"`
type GlobalMemoryToolProposal struct {
    ID, Revision, PreviewHash, ExpiresAt, State string
}
// ToolResult.GlobalMemoryProposal *GlobalMemoryToolProposal `json:"globalMemoryProposal,omitempty"`
type GlobalMemoryToolProposer interface {
    ProposeFromTool(context.Context, ToolExecution, string, GlobalMemoryToolDraft) (GlobalMemoryToolProposal, error)
}
func ValidateGlobalMemoryToolCall(ToolCall) error
func GlobalMemoryToolProposalFrom(MemoryProposal) (GlobalMemoryToolProposal, error)
func ValidateGlobalMemoryToolResult(ToolResult) error
```

`GlobalMemoryToolDraft` 的 JSON 字段只有 `operation,targetItemId,scope,text,expectedRevision`；后续 common 必须以严格 schema/unknown-field 拒绝 JSON 来源中的 identity、user、role、sources、grant、claim。`ValidateGlobalMemoryToolCall` 是解码后的第二道纯类型门：只接受 `memory.proposeGlobal`、合法正数 catalog/item head CAS 和三个操作对应文本/目标，并拒绝同一 `ToolCall` 中的 Effect/Collaboration/AgentCreate 负载。`ToolResult` 仅含 body-free handle 和 `Status:"proposed"`；`GlobalMemoryToolProposalFrom` 从合法 pending 完整预览投影，来源、正文、旧目标与权限证明不进入模型工具输出/CP。`ValidateGlobalMemoryToolResult` 拒绝混合 Effect/Approval/其他工具结果。零值 `omitempty` 保持旧工具/CP JSON 形状。

`api.GlobalMemoryAPI` 是既有 owner 命令双方法，仍与 `GlobalMemoryToolProposer` 分离；前者应只由本机 stdio 用户命令构造路径安装在 HAP，后者只交 Broker。普通和 `--managed` 本机 stdio 都是可信 owner 路径；`ManagedOwner` 仅表示托管连接，不当授权依据。model/Leader/工具没有 Resolve API 或 JSON 身份字段。现有未知 `AllowedTools` 字符串配置兼容不改；只对新已知 `memory.proposeGlobal` 完成 pinned/Bind/common schema/CP/Invoke 链，`memory.resolveGlobal` 永不列为模型工具。

`ValidateMemoryResult` 现接受：合法 pending `MemoryProposal` 用于 `memory.proposeGlobal`；proposal `MemoryObject`/纯 proposal page 用于 `memory.get/list`；body-free 的 accepted/rejected/expired/conflicted 安全 stub；合法 `Receipt` 用于 `memory.resolveGlobal`。它检查操作与目标 CAS 的互斥、scope、UTF-8/正文 hash、创建者/来源集合、previewHash 语法、RFC3339Nano expiry、正 revision、单对象 245760 bytes 与整页 262144 bytes。pending 必须有完整 body；terminal 不得携带 body。此纯校验**不**把请求 hash、原文、来源资格或未来时间当 DB 证明；repo 仍须复核。

## 后续 adapter 侧唯一事实 Tx

以下 SQL 类型仅定义于 `adapters/outbound/sqlite/memory` / `globalmemory`，不放入 application/domain/API。建议 Memory Store 由 T-14 owner 提供此窄端口；具体导出名称可在接线时收紧，但事务归属、参数来源与复核位置不得变：

```go
// memory package; FrozenGlobal holds canonical proposed body, complete actual
// derived/source closure, target/catalog head and creator identity, never a grant.
type GlobalFactTx interface {
    WithGlobalTx(context.Context, bool,
        func(context.Context, *sql.Tx) error) error
    PrepareOwnerGlobalInTx(context.Context, *sql.Tx, api.RequestIdentity,
        api.MemoryGlobalProposal) (FrozenGlobal, error)
    PrepareToolGlobalInTx(context.Context, *sql.Tx,
        api.ToolExecution, string, api.GlobalMemoryToolDraft) (FrozenGlobal, error)
    ApplyApprovedGlobalInTx(context.Context, *sql.Tx, api.RequestIdentity,
        FrozenGlobal) (api.MemoryItem, error)
    CheckGlobalPreviewInTx(context.Context, *sql.Tx, api.RequestIdentity,
        FrozenGlobal) (time.Time, error)
}
```

`WithGlobalTx` 调现有 `memory.Store.transaction`；mutation 在原 `grants.WithReadFence` 下只开一次 `base.WithinTx`，globalmemory 只在传入的 `*sql.Tx` 写 015 proposal 与 `conversation.Receipt/SaveReceipt`，不再开自己的 Tx。Memory 的 `Prepare*`/`Apply*`/`Check*` 复用同包 `readNamespace`/scope、`ReadFactsInTx`、当前 head、`sourceRecords` 与 `qualify`，唯一写 014 的 `newItem`/`replaceItem`/forget-suppression/bump 仍由 Memory Store 执行。015 仅存 proposal 固定预览/来源快照、expiry、状态/CAS、receipt 关联；T-01 在 `migrations/embed.go` 注册实际 schema 11。不得引入第二事实表或新来源授权算法。

`PrepareToolGlobalInTx` 必须从当前 DB 重读 Run/claim、pinned config 的新已知 AllowedTool、实际 Agent/temporary subject（Sponsor 不继承权限）、已消费的完整动态来源闭包与其当前 Grant/Host 资格；`ToolExecution` 仅是期望，模型没有 Sources 字段。无可证明来源拒绝，不转换为独立用户内容。`PrepareOwnerGlobalInTx` 从可信入口处理现有 wire `Sources` 选择；空 `[]` 可为独立用户新意图，但给定选择仍需查当前真实来源。群 coordinator 不代批。两个准备方法固定真实来源/目标/原文，返回 canonical `FrozenGlobal`；previewHash 由 015 adapter 对 ID、expiry、操作、scope、正文、完整源及目标快照规范化计算，纯 API 只检查其形状。

后续 `application/memory/global` 建两个不同具体 wrapper：`OwnerCommands` 实现 `api.GlobalMemoryAPI`，`ToolProposer` 只实现 `api.GlobalMemoryToolProposer`，二者共享不暴露的 repo 端口。Broker 只接收 `ToolProposer` 的具体对象，不能 type-assert 到 Resolve。建议 repo 端口：

```go
type Repository interface {
    ProposeOwner(context.Context, api.RequestIdentity, api.MemoryGlobalProposal) (api.MemoryProposal, error)
    ResolveOwner(context.Context, api.RequestIdentity, api.MemoryResolve) (api.Receipt, error)
    ProposeTool(context.Context, api.ToolExecution, string, api.GlobalMemoryToolDraft) (api.GlobalMemoryToolProposal, error)
}
```

Propose 的 `WithGlobalTx(true)` 内先查 epoch/同 key receipt，再 Memory prepare，插 015 pending、bump proposal 页水位并写 receipt，commit 后返回。create 的 `ExpectedRevision` 是 global item catalog；proposal 插入本身不 bump 014 catalog，所以多个 pending 可有同 catalog，只有首个 approve 可按它成功。Resolve 的同一 Tx 内先查同 key receipt，核 proposal revision `ExpectedRevision`/previewHash/expiry/owner，再 `CheckGlobalPreviewInTx` 复核固定 head、原文和当前来源；approve 调 `ApplyApprovedGlobalInTx` 写 014，reject 不写 014；终态 CAS、Profile 水位和 receipt 同 Tx。旧 source/head/hash 失效时不得写 item/revision/index/成功回执。重复同键同输入返回原 receipt，不因当前 proposal 已终态而二次应用；不同输入同键冲突。工具提案服务端幂等键由 `(profile,principal,runID,toolCallID)` 稳定生成且限 128 bytes，输入 hash 同时绑定实际 actor/config/来源，不把 claim token 纳入跨恢复稳定 key。

## Get/List 与物理门窄 reader

T-14 Memory Store 的 `List/Get` 先验证 profile/principal 与 global namespace；kind=item 走原 Memory item reader，kind=proposal 通过 Memory 包定义、globalmemory 实现的 `ProposalReader` 在**原只读 Tx** 中代理，不能嵌套事务：

```go
type ProposalReader interface {
    GetProposalInTx(context.Context, *sql.Tx, api.RequestIdentity,
        string /* profile */, string /* proposalID */) (api.MemoryProposal, error)
    ListProposalsInTx(context.Context, *sql.Tx, api.RequestIdentity,
        api.MemoryQuery) (api.MemoryPage, error)
}
func (s *memory.Store) SetGlobalProposalReader(ProposalReader)
```

Reader 逐对象查 owner、pending/expiry 与 `CheckGlobalPreviewInTx` 当前来源；撤销或终态只返回安全 body-free stub 或明确拒绝，cursor 绑定 proposal 变化水位而非 global item catalog。global item Get/List 当前正文仍按 Memory `readItem`/`ReadFactsInTx`/Grant。proposal 绝不进 recall。

T-04 Events 包定义、globalmemory 实现独立的 proposal 物理 reader：

```go
type GlobalProposalDeliveryReader interface {
    ReadProposalDeadlineBatchInTx(context.Context, *sql.Tx,
        api.RequestIdentity, string /* profile */, []string /* proposal IDs */) (time.Time, error)
}
func (s *events.Store) SetGlobalProposalReader(GlobalProposalDeliveryReader)
```

HAP 对含正文 proposal 输出加 `DeliverySubject{Kind:"memory_proposal",ID:proposalID}`，Events 在其现有 `WithReadFence` + **同一个** `base.WithinTx` 调 reader 核 pending/owner/expiry/目标/完整来源，取最短 deadline；stdio SQL 关闭后但读门仍持有才写 physical frame。不得用 `memory_revision` 冒充尚未确认 proposal。拒绝、撤销、过期、mixed batch 均逐 subject 复核。终态 body-free stub 无敏感 subject。普通与 managed stdio 使用相同 owner 命令入口。

T-14 联合召回仅查本 Run 私有 namespace 与本 Profile global namespace，合计 20 项/131072 UTF-8 bytes；逐项当前目标 Run 的 `read+send`/Grant/Host 资格，`ExecutionMemoryInput.Namespace` 保持 Run 私有，revision `DerivedInput.Namespace` 是条目的真实 global/private namespace，恢复重新 hydrate/qualify。其他 Bot 私有 namespace 不在查询集合。

## 此阶段能与不能证明的边界

160 已实际证明纯 DTO 合法/非法结果、模型草案互斥、body-free 工具结果投影，及原 api 包回归；红灯原因为旧结果验证器硬拒合法 proposal。160 未装配 HAP/Broker/SQLite/Events/三 SDK，不能证明用户 authority、claim、完整来源、statement/commit 原子性、queued physical delivery、联合召回、恢复或 T-15 的 AC-020/022。后续每个 owner 仍须用真实入口与当前持久状态跑对应差异测试；两 global wire 方法保持 `implemented:false`，直到整条运行路径可用。
