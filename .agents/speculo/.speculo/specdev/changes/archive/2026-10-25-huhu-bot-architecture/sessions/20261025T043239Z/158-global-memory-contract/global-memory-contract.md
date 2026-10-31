# T-15 全局记忆内部接缝合同（实施前只读准备）

本文件只固定 142 预检留下的入口、事务和 owner 接缝。T-15 仍被 T-14 阻塞，以下签名是实施目标，不表示已经装配或测试通过。外部合同沿用 `memory.proposeGlobal`、`memory.resolveGlobal`、现有 `MemoryGlobalProposal`/`MemoryResolve`/`MemoryProposal`，不添加自报用户身份的 wire 字段。

## 选择：分离对象能力

| 最小方案 | 调用形状 | 结论 |
| --- | --- | --- |
| **采用：分离 owner 命令与模型 proposer 对象** | 真实本机 stdio owner 构造器给 HAP 一个 `api.GlobalMemoryAPI`；Broker 只收到 `GlobalToolProposer`。前者可 propose/resolve，后者只能 propose。 | 构造图使 `ToolExecution` 无法拿到 resolver；JSON、prompt、Leader、同 principal 不能改变入口种类。保持既有八个 wire 方法。 |
| 单一服务加 Router 铸造不可序列化动作 token | 服务的 `Resolve` 再检查 token；工具 route 不得拿 token。 | 可以安全实现，但每层都须传 token、避免经 context 或共用服务泄露；比两个窄端口多一个容易接错的权限真相，故不采用。 |

`RequestIdentity.Valid()`/`ManagedOwner()` 仅是 transport 连接事实，不是动作来源证明。两个路径均须再检查 profile/principal；不能让请求里的 role、creator、sources、grant、agentID 或 `ManagedOwner` 单独授权确认。真实 stdio 入口应使用显式 `stdio.NewOwner(...)` → `hap.NewOwner(app,id,ownerCommands)`（或等价非 JSON 的私有 constructor 参数）；普通 `hap.New` 不安装 owner 命令，`Router` 的 owner 指针私有。`cmd/huhubot/main.go` 仅在管理的本机 stdio 命令入口调用 owner 构造器，Host callback、Engine、Broker 不调用。HAP 的两个 global 方法仅在 owner 指针存在时暴露；`memory.list/get` 的 global/proposal 读取是只读且每次核 owner/source。此处的边界是受信任的本机进程输入与模型工具，不声称防御已经控制同一 stdio 管道的恶意本机进程。

建议窄内部 Go 形状（名称可因包依赖微调，能力与方向不可变）：

```go
// application/api/tooling.go: internal-only field, not a new HAP wire DTO.
type GlobalMemoryToolDraft struct {
    Operation, TargetItemID, Text, ExpectedRevision string
    Scope MemoryScope
}
// ToolCall: GlobalMemory *GlobalMemoryToolDraft
// ToolResult: GlobalMemoryProposal *MemoryProposal  // common only projects safe fields

// application/memory/global: two separately constructed wrappers over one repository.
type GlobalToolProposer interface {
    ProposeFromTool(context.Context, api.ToolExecution, string /* toolCallID */,
        api.GlobalMemoryToolDraft) (api.MemoryProposal, error)
}
// OwnerCommands implements existing api.GlobalMemoryAPI only; Broker never receives it.
func NewOwnerCommands(repo Repository) api.GlobalMemoryAPI
func NewToolProposer(repo Repository) GlobalToolProposer

// Broker constructor/setter receives only GlobalToolProposer; Core wires both.
func (s *Service) SetGlobalProposer(global.GlobalToolProposer)
```

`common/tools.go` 增一条 canonical `memory.proposeGlobal`、wire `memory_proposeGlobal`，严格解码 `operation,targetItemId,scope,text,expectedRevision`，拒绝未知字段。没有 `sources`、identity、user、role、profile、grantIds、claim 或 previewHash 参数。create 的 `expectedRevision` 是 global catalog；update/delete 是目标 item head；delete 的 `text` 必为空。只在 pinned `Agent.AllowedTools` 明确列出时展示和调用；Broker 在其现有 `allowed` 门后单独路由，不走 Collaboration，也没有 resolve 工具。工具结果给模型的投影仅为提案 ID、revision、previewHash、expiry、pending 状态与必要安全摘要；完整来源/正文须在实际当前资格下由用户查询读取。沿用 common 的严格单结果预算，不截断来源。

Broker 在每次调用以 `ToolExecution` 绑定的真实 Run/claim/config 为输入；global Store 同一事务重读 Run 当前状态、claim、Profile/principal、实际 Agent 或 temporary subject 的 pinned AllowedTools 与 config snapshot，再从 DB 取该 Run **已经实际消费的完整来源闭包**。`x.Lineage`/`x.Access` 仅作相等性期望，不作来源真相；动态读入的依赖也不能漏掉。模型工具不可选择、删除或缩减 Sources；由服务器生成 `MemoryGlobalProposal.Sources` 及 `CommandMeta`。模型闭包为空或无法证明完整已消费来源时拒绝，不得转成用户独立提案。用户在 owner HAP 主动 propose 可显式 `Sources: []`，代表独立用户正文；给定 Sources 只是选择，服务仍重读真实 owner/head/hash/闭包与资格。temporary creator 记实际 temporary subject/config，Sponsor 不变成创建者或权限；群 coordinator/Leader 仍仅实际 Run 作者，不能代批，也不能以群角色继承其他 Bot 私有库。

工具名从配置到执行的完整准入链必须一起修改，不能只加 common 定义和 Broker switch：

1. `domain/assistant/validation.go` 当前仅限制 `AllowedTools` 数量/长度/去重，**未检查已支持名称**。T-01/Engine owner 应在纯工具目录中加入 `memory.proposeGlobal` 并使 AgentDraft 新建/更新和 temporary draft 校验拒绝未知工具名；Broker 与 common 引用同一受支持名称集合或有一致性测试，不得让目录静默分叉。现存配置读取时若遇不支持名称，`Bind` 明确拒绝，不把未知值默默略过。
2. `api.CanonicalTaskConfigHash` 已逐项包含 AllowedTools；`assistant.Store` 读取 temporary snapshot 时还会确认其工具是当前 Sponsor 配置的子集。新名字走这两条既有固定链，模型使用原 pinned snapshot；`broker.definitionDigest` 必须纳入新工具 descriptor/版本，common registry digest 必须纳入其严格 schema，旧 CP 不可在工具合同变化后假装兼容。
3. `broker.Bind` 对当前 Run/claim/config 及受支持名单建 session；`bound.Invoke` 仍先做 pinned `allowed` 再路由。对新名字单独走 proposer，不能落到 Collaboration 的 default。缺失安装、失效 claim、配置收窄或被禁用返回显式 deny/fault，不能借当前 Leader 身份旁路。
4. `common.executionTools/newRegistry` 的 allowed 名单现在会静默忽略未知定义，实施时改成明确不支持错误；三 SDK 均从这一个 registry 展示 `memory_proposeGlobal` 严格 JSON schema、统一解码，且在 Chat/Responses/Anthropic 实际返回的工具调用里经同一 Broker gate。`toolMessage` 投影安全字段并做完整编码大小检查；私有 CP 保存可信结果，恢复时继续核原 definition/registry digest。无 `memory.resolveGlobal` toolDefinition、decode 分支或 Broker 分支，三个 SDK 的恶意同名调用都应拒绝且不触达 owner port。

模型幂等键由服务端从稳定的 `(profile,principal,runID,toolCallID)` 导出并限于 128 字节；相同键不同草案/绑定来源得到 `IDEMPOTENCY_INPUT_MISMATCH`。输入 hash 必须覆盖草案、真实 actor Run/config 及实际来源闭包，而不只覆盖模型 JSON；重放 receipt 可返回同一 proposal，但不能在当前用户读取/物理发送时绕过现在资格。claim token 仅用于当次活跃资格，不放入跨恢复稳定幂等键。普通用户命令保留 wire `CommandMeta` 的 key、epoch 和 ExpectedRevision，`commands.Hash`/`conversation.Receipt` 语义继续适用。

## 一条事实图、一条事务门

`014-memory.sql` 的 global namespace、`memory_items`、`memory_revisions`、`memory_revision_bodies`、`memory_index`、`memory_dependencies` 是唯一已确认事实。015 只增加 proposal ID/owner/actor、operation、固定 scope/body/source/target 快照、previewHash/expiry、正整数 proposal revision、`pending|accepted|rejected|expired|conflicted` 状态、决议 receipt 关联与必要索引/约束；不建第二组 global body/index/dependency 表。014 已迁移文件不改；T-01 在 `migrations/embed.go` 注册 015 为连续数据库 **schema version 11**（目前 CurrentVersion=10）。未确认 proposal 永不写 `memory_items`，因此不存在被 recall 的入口。

015 的最小表可为 `memory_global_proposals(proposal_id PK, profile_id, principal_id, namespace_id, actor_kind, actor_run_id, actor_subject_id, operation, target_item_id, target_revision, target_revision_id, target_body_hash, expected_catalog, scope_kind, scope_id, frozen_json, preview_json, preview_hash, expires_at, state, revision, decided_receipt_key, created_at)`；`frozen_json` 保存完整来源/资格与拟写正文的规范快照，`preview_json` 保存当时向用户展示的固定预览，按现有对象预算约束解码后再返回。状态/operation/actor 有 `CHECK`，revision 正数，`namespace_id` 指向 014 global namespace，`(profile_id,principal_id,state,proposal_id)` 提供有界页索引。`command_receipts` 保持唯一正式幂等账本，015 的 `decided_receipt_key` 只是指向既有决议的关联，不复制 receipt JSON。实现可按 SQLite 实际约束微调列名，但不能把 `frozen_json` 当作当前资格证明。

建议 Memory Store（T-14 owner）暴露以下最小 Tx 端口；类型放 Memory 包或其纯内部合同，globalmemory 只依赖接口，Memory 不反向 import globalmemory：

```go
type GlobalFactTx interface {
    WithGlobalTx(context.Context, bool /* mutate */,
        func(context.Context, *sql.Tx) error) error
    PrepareGlobalInTx(context.Context, *sql.Tx, api.RequestIdentity,
        GlobalActor, api.MemoryGlobalProposal) (FrozenGlobal, error)
    ApplyApprovedGlobalInTx(context.Context, *sql.Tx, api.RequestIdentity,
        FrozenGlobal) (api.MemoryItem, error)
    CheckGlobalPreviewInTx(context.Context, *sql.Tx, api.RequestIdentity,
        FrozenGlobal) (time.Time, error)
}
```

`GlobalActor` 是内部 discriminated `owner|tool` 值；tool 分支含真实 RunID、toolCallID 和 config/claim 期望，owner 分支由 owner wrapper 创建，不能从 JSON 解码。`FrozenGlobal` 含 catalog CAS（create）、目标 item head ID/revision/hash（update/delete）、固定 scope/text/body、实际源 refs/scopes/derived 闭包、actor/target、生成的 preview 内容；仅 proposal adapter 持久化和回读，不暴露为 wire 权限。`PrepareGlobalInTx` 复用 Memory `readNamespace`/`scope`、`ReadFactsInTx`、`sourceRecords`/head/资格和现有大小界限；`ApplyApprovedGlobalInTx` 先在**同一 Tx** 重新检查目标/catalog、当前原文和来源资格，然后调用 Memory 自己的 `newItem`/`replaceItem`/forget-suppression/bump 路径写 014。`CheckGlobalPreviewInTx` 是只读相同资格与 head 的复核，供 proposal Get/List 和 T-04 物理投递调用；当前 proposal state/expiry 由 globalmemory adapter 同 Tx 检查。不得在 globalmemory 复制来源资格 SQL 或直接手写 014 的事实/索引。

`WithGlobalTx` 委托现有 `memory.Store.transaction`：非 mutation 一次 read Tx，mutation 同一个 `grants.WithReadFence` 下的一次 `base.WithinTx`。globalmemory adapter 在回调里读写自己的 015 表和 `conversation` receipt，不再开第二个 Tx；Memory admission/Stop/Done 覆盖这些调用。T-04 Events 的物理投递仍用自己的 `WithReadFence` + `WithinTx`，在**其已有 Tx** 调 proposal reader，不调用 `WithGlobalTx`，避免嵌套。具体原 SQL helper 如何安全暴露给外包是 T-14 实施接缝，可把上面三个事实方法收在 Memory Store 上；不能因此把 Memory 事实写权移给 globalmemory。

事务顺序：

1. **Propose**：`WithGlobalTx(true)` 内检查 epoch/同 key receipt → 重新读 actor、目标/catalog 和全部来源 → Memory prepare → 生成固定 proposal/expiry/previewHash 并插入 015 pending → `conversation.Bump`（仅 proposal 列表水位）→ 保存 receipt → commit 后返回。create 的 catalog ExpectedRevision 在此读取，但 proposal 本身**不增加 global item catalog**；多个同 catalog 提案可并存，仅一个后续 approve 能按旧 catalog 成功。不得在失败后落 proposal 或 receipt。
2. **Resolve**：仅 owner wrapper，`WithGlobalTx(true)` 内先查同 key receipt（同 hash 返回先前 `Receipt`）→ epoch、pending revision `ExpectedRevision`、previewHash、expiry 与 owner → 复核固定原文/head/来源/当前权限。approve 才由 Memory apply 写 014 并 bump global catalog/profile；reject 只使 proposal 终态并 bump profile。015 状态 CAS、决议关联和 receipt 在同一 Tx 写入；竞争接受/拒绝只有一方成功。旧 previewHash、过期、head 或来源变化不得写 item/revision/index；需要新提案与新预览。过期/冲突是否物化 terminal 状态可由独立同 Tx 状态转换实现，但失败调用绝不产生成功 receipt 或半效果。
3. **Get/List**：Memory `memory.list/get` 先按当前 profile/principal/global namespace 路由；kind=item 复用原 `readItem`，kind=proposal 调已安装的窄 proposal reader，同一个 Memory 只读 Tx 检查 owner、state、expiry 与每个带正文 proposal 的当前来源。终态或撤销时只返回安全 body-free stub/资格错误，不把旧 body 交付。proposal 页 cursor 绑定 profile/principal/kind/filter 和 proposal 变化水位；item 页仍绑定 global catalog/suppression，二者不能互换。`NamespaceRevision` 对 proposal 页只是该页的变化水位，不充作 create CAS；create 以 global item catalog 查询结果的水位提交。

Preview hash 规范对固定操作、scope、正文 hash、完整来源身份/资格快照、target head、actor、expiry 与 proposal ID 做规范化摘要；不能仅 hash 文本。delete 预览在有当前正文资格时可展示要删除的旧内容；没有资格时不泄露旧正文，需返回 body-free 的删除目标/范围信息并要求新 preview。update 保留旧事实来源闭包并合并新选择，不能仅因用户修改文本就自动洗掉原受限祖先。真实来源改变或 Grant 撤销使旧确认失效；用户要删除已不可读事实时仍可用当前 owner/target 元数据重新提案，确认动作不依赖再次看到被撤销正文。该 delete 细节是建议的最小可实施策略，实施前须用当前 `Forget`/source checker 的真实行为验证，不能靠忽略 `ReadFactsInTx` 的错误实现。

## 读取、召回和物理投递

T-01 的 `ValidateMemoryResult` 必须补 `MemoryProposal`、proposal `MemoryObject`、`Receipt` 的严格 UTF-8/字段、正文及序列化预算；HAP 移除 `memory.list/get` 的 global/proposal 无条件拒绝，仅当 reader 已安装才宣告两个 global 方法 implemented。`contracts/hap/v0.1/methods.json` 仅把两个 T-15 方法的 `implemented` 改 true，并以真实 generator 更新所需产物；现有 schema/Go/TS DTO 不添新身份字段。若新工具草案是 Go 内部字段，不属于 HAP generator 输入。

T-04 为含正文的 proposal 添加 `DeliverySubject{Kind:"memory_proposal",ID:proposalID}`；`events.Store.WithDelivery` 的现有 250ms 读门中通过注入的 proposal reader，在同一 Tx 检查 pending/owner/expiry/frozen head/完整当前来源并返回最短 deadline。HAP `memorySubjects` 对 `MemoryProposal` 和 page/object 中每个带正文 proposal 加 subject；终态 body-free stub 无敏感 subject。stdio dequeue 在 SQL 关闭后且门仍持有时才写 frame，revoke/reject/expiry 与 queued frame 交错必须拦截；mixed batch 每个 subject 均检查。任何把 proposal 正文塞进普通 `memory_revision` subject 的办法都不成立，因为 proposal 尚不是 revision。

T-14 `context_plan.go` 把本 Run 私有 namespace 与同 Profile global namespace 的候选按稳定排序联合选取，**合计**最多 20 条/131072 UTF-8 bytes；每条当前 `ReadFactsInTx` 与真实接收 Run 的 `read+send`/Grant/Host 资格先过滤再读取 body。别的 Bot 私有 namespace 完全不在查询集合。`ExecutionMemoryInput.Namespace` 仍是实际目标 Run 私有 namespace，每条 `DerivedInput.Namespace` 是其真实源 namespace；global revision ref 不可错写成 Run 私有 namespace。`context_read.go` 恢复按当前 head/来源/授权重读每条 revision 并核原 binding，原始正文变化或撤销不能靠已存 manifest 绕过。私有自动维护的 apply/commit 路径保持 agent/temporary 限制，不自动提升 global。

## 精确 owner 写集与差异验收

| owner | 实施时需申请/协调的文件 |
| --- | --- |
| T-15 global 业务 | `internal/domain/memory/global/**`（仅纯状态/hash规则如需）、`internal/application/memory/global/**`、`internal/adapters/outbound/sqlite/globalmemory/**`、`internal/adapters/outbound/sqlite/migrations/015-global-memory.sql`、`tests/contract/global-memory/**`。 |
| T-14 Memory | `internal/adapters/outbound/sqlite/memory/store.go`, `namespace.go`, `revisions.go`, `facts.go`, `sources.go`, `private.go`, `context_plan.go`, `context_read.go` 的确切窄接缝；不挪出 014 fact writer。 |
| T-01 API/HAP/bootstrap/schema | `internal/application/api/memory.go`, `tooling.go`, `types.go`（若入口类型需要）, `internal/adapters/inbound/hap/memory.go`, `router.go`, `internal/adapters/inbound/stdio/server.go`, `cmd/huhubot/main.go`, `internal/bootstrap/core.go`, `internal/adapters/outbound/sqlite/migrations/embed.go`, `contracts/hap/v0.1/methods.json` 与实际 generator 输出；现有 HAP wire shape 原则上不改。 |
| T-05 grants | `internal/adapters/outbound/sqlite/grants/memory.go` 仅审核/修复 global 与 source 当前资格、current recipient；不得默认扩大 ops/grants。 |
| T-04 physical delivery | `internal/adapters/outbound/sqlite/events/store.go`、HAP subject 接缝和 stdio 混合 batch 回归。 |
| Engine/Broker 与 Agent 配置 | `internal/domain/assistant/validation.go` 的严格受支持工具名、`internal/application/assistant/service.go` 的 draft 门、`internal/adapters/outbound/sqlite/assistant/store.go` 的 pinned/temporary 复核、`internal/application/tooling/broker/service.go` 的 supported/Bind/definitionDigest/Invoke、`internal/adapters/outbound/eino/common/tools.go`/`context.go`/`checkpoint.go` 及 Chat/Responses/Anthropic 的实际工具/结果测试。`api/task_config_hash.go` 现已包含 AllowedTools，原则上只需回归而不改算法。tool 只能 Propose。UI 固定预览/显式用户确认消费者归对应产品票，现有 `src/modules/huhubot/api.ts` 仅有协议映射。 |

差异测试只覆盖新边：create/update/delete 的 pending 不召回、approve 一次生效、reject/expiry 不写；同 proposal/同键重放与异键竞争 CAS；target head/正文/hash、source head/Grant/expiry 改变时 no item/revision/receipt 半写；AgentDraft 未知工具名、temporary Sponsor 收窄、旧配置不支持、Bind/claim/config 变更、三 SDK 工具 schema/结果/恢复 digest 和伪造 `memory.resolveGlobal` 必须逐层拒绝；模型试图传 user/role/sources 或直接 resolve、temporary/group 变化拒绝；queued proposal/body 在 revoke/reject/expire 后物理零泄露；private+global 联合 20/128KiB、别的 Bot private 不读、恢复重新资格。对 statement/commit fault 回读 014/015/receipt 三者原子性。T-14/T-05 已有效检查不为本准备重复运行。

待实施时验证的具体接缝：`memory.Store` 的 global scope 当前按 agent member 绑定，需用真实 session/thread owner 规则改；015 proposal cursor 与 PreviewHash 规范需用实际 API 大小界限检验；delete 在来源撤销后重新提案的安全 stub 必须由真实 checker 验证。上述均属代码实现与测试问题，不改变用户已批准的产品确认策略。本 158 未运行产品检查，不能据此声称 T-15 可用。
