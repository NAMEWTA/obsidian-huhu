# 全局记忆物理投递与当前资格接缝（source-only checkpoint）

Session: 20261025T043239Z
Task: 162-global-memory-delivery
Status: completed

This is a completed source-only checkpoint for the assigned slice; T-04/T-05/T-15/Goal remain open.

## 聚焦交接

本轮只实现 T04/T05 允许的 Events/Grants 适配接缝，尚未完成 T15/T14/T01/Core/HAP 集成。唯一公共 reader 形状来自 160 的冻结合同：

```go
type GlobalProposalDeliveryReader interface {
    ReadProposalDeadlineBatchInTx(context.Context, *sql.Tx, api.RequestIdentity, string, []string) (time.Time, error)
}
```

`events.Store` 现在可以注入该 reader，并在既有 `WithReadFence`、同一个 `base.WithinTx` 内将 `memory_proposal` IDs 批量交给它；reader 拥有 015 proposal owner/pending/expiry/preview/head/来源复核，Events 不复制 015 或 Grants/Memory SQL，也不嵌套事务。成功必须返回非零最短 deadline；缺 reader、零 deadline、未知错误和取消均 fail-closed。物理 writer 仅在 SQL 事务关闭、读门仍持有且 deadline context 有效时调用。Application Events 入口只增加 `memory_proposal` subject family，旧 family、重复 ID、800 subject 上限和 250ms gate 不变。

Grants 侧依据 161 的真实 `ReadFactsInTx` 语义增加了一个窄分支：只有 subject 自身 `memory_revision` ID 恰好出现在唯一一个 `Namespace.Kind==global`、`Namespace.ID==profile` 的真实 requirement `RevisionIDs` 中，才认定它是当前 global root。闭包中含 global ancestor 不足以获得此身份。global root 的每个真实 requirement 仍逐项经过原 scope、target read/send、source Grant/recipient/provider、active head、suppression、expiry 和 witness checks；只避免把已证明的 global root 所携带的真实私有祖先误判成 target 直接读取另一 Bot 私有 namespace。直接 private subject、错误 profile/scope、重复/矛盾 root、缺失 reader、未知 SQL/坏事实仍拒绝或原样传播。没有 namespace 重标、父权限扩大或新 API/SQL。

## 产物与验证

- [160 contract](../160-global-memory-api/contract.md) 与 [158 contract](../158-global-memory-contract/global-memory-contract.md) 是接缝来源；[Root scope addendum](../../../evidence/T-15-logs/162-scope-addendum-1.md) 是 service.go 单行入口授权。
- source before（历史日志已清理：`logs/01-source-before.json`） 保存 3 个既有边界文件 bytes/mode；source checkpoint（历史日志已清理：`logs/02-source-checkpoint.json`） 保存本轮 8 文件 SHA、tree 和引用事实；diff（历史日志已清理：`logs/02-source-checkpoint.patch`） 可回读精确改动；git status（历史日志已清理：`logs/03-git-status-source-checkpoint.txt`） 保存工作副本状态。
- 本轮 8 个文件最终 SHA：
  - `events/store.go` `2b2ffbab3f04c2ba2a5e182e8161b4d18f06970b24045b047bf55fcd697159b6`
  - `events/global_delivery.go` `e9bcdb24b146481812571dfdad934834a055b314c015f230b117d01150796291`
  - `events/global_delivery_test.go` `0422a9ab08029221408c60fa7addfb298d56d2005538d1e9b988e9898fa879a6`
  - `application/execution/events/service.go` `4814309548818be2cd42a15371b9e4180f811228f444846a13707dd17f5e3e4b`
  - `grants/memory.go` `8a196362f279a7d06a4cd9cfe7c3028280799c7a1fd418c972de8054d902fdb4`
  - `grants/global_memory_test.go` `c841daa2c959e5a2bf539db7288127e722fc5357a6078d3b113b3b412d6e6137`
  - `tests/contract/access/global_memory_test.go` `7775d91f3b30a00f4e726fd9321bcb25f7593723f47be4e95af2239648518e9d`
  - `tests/contract/events/global_memory_test.go` `6fd775b024d5109a7bd95494fe0e056419aec673929822f080f727c96caf65ab`
  - tree: `cd8531569a767ee42cb8d4182de778b41e577dae1bd0093bc023a4ac1cc52d88` (sorted `sha256 + two spaces + path + LF`, final LF included)
- Existing `events`/`grants` production source and new tests were formatted with the pinned gofmt binary. No Go compiler, `go list`, DB, CLI, Node, race, generator, HAP, Core, API, migration, stdio or Provider command ran in this source-only slice.
- New tests are prepared, not green evidence: proposal same-Tx/deadline/reader refusal/mixed/800 controls and global-root/private-ancestor/incorrect-root/current Grant controls. They require 160 proposal and 161 Memory facts implementations before a real compile or behavior window. No fake reader result is presented as a product acceptance result.

## 问题与下一步

The source-only slice is intentionally stopped for owner readback. Remaining work is the actual 015 proposal reader, T01/HAP subject collection, 161 global Facts/Recall integration, statement/commit rollback, queued stdio physical fence, and Root's normal/race/Go/E2E checks. The original 157 credential artifacts remain untouched. This checkpoint does not close T04/T05, T15, G3, or Goal; no real Provider/Obsidian/target-OS acceptance was performed.
