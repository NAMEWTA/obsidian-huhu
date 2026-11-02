# 128：Memory 原消费者 adapter 契约候选 v1

Session: 20261025T043239Z
Task: 128-memory-access-budget
Status: preparation-only

这里只记录供 125/126 对齐的精确内部声明与消费语义，**尚未写入 Go、SQL 或测试，未编译、未运行**。115/123 的已接纳产品决定保持；123 的 Plan/Seal 替代旧 PrepareInTx。125 当前独占产品检查，本阶段不与其并写。

## 唯一声明与依赖方向

以下类型由 128 在获准产品窗口后唯一写入 `internal/adapters/outbound/sqlite/grants/memory.go`；126 的 `sqlite/memory.Store` 实现 reader。所有已有 DTO 都引用 `application/api`，不创建第二份 Memory DTO，不让 api 引入 sql。

```go
type MemorySubject struct { Kind, ID string }
// Kind: run | message | memory_revision | memory_candidate | context_entry
type MemoryWitness struct {
    Ref api.DerivedInput
    OriginRunID, PublishedMessageID string
    Sources []api.SourceSnapshot
    Scopes []api.SourceScope
    GrantIDs []string
    Group *api.GroupBinding
}
type MemoryRequirement struct {
    Subject MemorySubject
    Namespace api.MemoryNamespace
    Scope api.MemoryScope
    RevisionIDs []string
    Witnesses []MemoryWitness
}
type MemoryFacts struct {
    Requirements []MemoryRequirement
    Watermark string
}
type MemoryFactsReader interface {
    ReadFactsInTx(context.Context, *sql.Tx, api.RequestIdentity,
        string, []MemorySubject) (MemoryFacts, error) // profileID
}
func (s *Store) SetMemory(MemoryFactsReader)
func (s *Store) CheckMemoryInTx(context.Context, *sql.Tx,
    api.RequestIdentity, string, string, MemoryRequirement,
    []string) (time.Time, error) // profileID, targetRunID
```

这与 115 原字段/签名相同，只按 123 增加 `context_entry` kind。一个 subject 可按实际 namespace/scope 返回多个完整 requirement；不能 first-wins 丢掉另一组。Ref 指不可变正文身份，memory_revision 的 ID 是独立 revisionID、Revision="1"。memory/head/forget/suppression 与完整祖先由 126 本域核验，不靠传入 SourceRefs、当前初始 Memory 是否 nil 或客户端标签证明。

`ReadFactsInTx` 只读当前同一事务的本域关联与稳定来源事实，不调用公开 T05 Check、Host、模型、usage eligibility 或嵌套事务。已核的普通 run/message 没有 memory/context 关联时 Requirements=[]；这不是该对象存在或一般 ownership 已通过的证明。显式 revision/candidate/context-entry 缺失、坏 JSON、身份/Hash/关系矛盾不能伪装成空关联。message 必须由实际持久表/namespace 判别公开消息或私有 thread 消息，不让 payload 决定。

Reader 必须覆盖实际 `run.derived_json`/lineage、sealed 初始 manifest 和真实 output 关联，不能只查初始 Memory 或只查某一份尚未同步的索引。动态私有结果/消息以后取得 memory_revision 时，后续 ReadFacts(run) 也能发现。watermark 只涵盖本批实际关联对象及其当前 head/suppression/输入代，不扫描整个 Profile。

## 当前权限与无递归实现边界

- targetRunID 非空时，从 DB 重读真实 owned Run/当前 recipient、config、Session/Task/parent；它必须来自外层 T03/T12 已匹配实际 ToolExecution 的 current claim 门，不能由普通 payload 自证。此 helper 没有 claim 参数，不替代外层 claim-token 比较。模型普通召回用 read+send，维护再加 summarize+memory。输入的 Witness 不能替换目标接收方、借原来源 TaskID 或伪造 ParentScope。维护新根没有真实委派边时，旧 task-bound Grant 继续拒绝。
- 空 targetRunID 只供受信用户 UI 路径且 ops 精确为 read；按 Witness 的真实历史 origin/实际 publication 读取，不把作者整 Run 的后来依赖套到独立消息。temporary 始终是实际随机 subject，不映射 Sponsor 私有库。namespace/scope 本域资格与原 Grant/Group 当前授权都要通过。
- 已公开 transcript 只有 DB 实际 publication 证明才能按既有历史规则读取；未公开私有正文继续保留完整贡献成员 tuple。独立用户原文、合法公开历史和 context-entry 的独立 Intent 不因整 Run 的其他 memory 失效被一刀切隐藏。
- `CheckInTx` 在空 Sources 快返前核实际 run 依赖。内部把原 Grant/Group/recipient/parent 检查拆成**私有无 Memory 回调**路径，供 CheckMemoryInTx 验 Witness；禁止 reader → public Check → reader 回环。不能把公开 bool 或 wire proof 当成跳检查开关。
- 显式 Memory 检查缺 reader 时 fail-closed `ACCESS_NOT_ASSEMBLED`；不存在表/未知 SQL 原样返回，不把它当“功能已装配但无关联”。最终 Core 必须先按 125/126 装配实际 reader；旧对象的空关联由实际 reader 证明，不能用 nil reader 或 Memory=nil 推断。
- 返回 deadline 是当前已授权 coverage 的最早必要期限，调用方取 min；不得增长外层 permit，也不跨请求缓存“已授权”。同 Tx 可复用不可变解码事实，时间/coverage/recipient/parent/当前失效逐 exact requirement 重新判定。

## 维护预算的唯一内部声明

由 128 在 `sqlite/usage/memory.go` 声明并实现，126 仅依赖这些操作；`BindAttempts` 原签名不变：

```go
type AttemptBinding struct {
    Purpose, AccountID, JobID, JobGeneration string
}
func (s *Store) MaintenanceEligibilityInTx(context.Context,
    *sql.Tx, string) (string, error) // profileID; empty reason iff eligible now
func (s *Store) ReadAttemptBindingInTx(context.Context,
    *sql.Tx, api.ToolExecution) (AttemptBinding, error)
```

Eligibility 只读当前 policy、maintenance/profile 已 charged/reserved 和配置/暂停，缺 account 按未花费但仍受显式 policy 限制；不 INSERT account、Reserve、Resolve、Probe 或启动 HTTP。只表示还有潜在 headroom，实际下一次请求金额仍由 Reserve 精确决定。

已读 126 的 `01-store-design.md` 字段草案，预算绑定需要下列同 Tx 只读真实字段；不另造 job DTO/worker/账本：

- memory_namespaces：namespace_id、profile_id、principal_id、kind、subject_id、settings_revision、enabled。
- memory_jobs：job_id、namespace_id、source_run_id、generation、settings_revision、run_id UNIQUE、task_config_id、admission、commit_state。

ReadAttemptBinding 先核 ToolExecution 对应的真实 current Run/claim/pin/config，再读 job→run 唯一关系，核真实 namespace 主体、job 代、当前 settings 代/自动开关与固定 input/config。无 job 的正常 main/child/question 仍绑定 root:<真实 budgetRoot>；有合法维护 job 才绑定 Purpose=maintenance、AccountID=maintenance:<真实 Profile>。不会因调用参数、Sponsor 名或 Memory 文本前缀选择账户。

Bound 保存上述真实绑定，Reserve 与 Dispatch 均重读并比较；q.AccountID 为空或等于绑定账户，q.Purpose 只允许绑定用途或 summary/retry 子标签。accountInTx 按**绑定账户族**选账户，不能按 summary/retry 标签切回 root；RetryOf 必须同真实 Run、claim、账户且原 attempt 已结算。两类账户都继续累计到 Profile 账户。

默认维护额度 0、Profile 未配、paused、headroom 不足均零新 callback；Reserve 后设置变化在 Dispatch 再拒绝。已经 dispatched 的 Settle/unknown 仍按原责任落账，不调用阻止新工作的 memory/stop 门，不退款，不提前释放 producer/pin。

## 精确消费者与待联动落点

1. grants/access、delivery、store：批读取 Memory Facts 与旧 readFacts 同 Tx 复用；800 个旧无关联 subject 是一条有界空批路径，不能为每个 subject/祖先新开 N+1 查询。
2. grants/groups、collaboration 的 tasks.get/list/answer/reply、usage.MessagesInTx/ReadyParent：只在实际返回正文后消费完整 memory_revision/祖先与 Source/Grant/Group，提升接收 Run.revision，同 Tx 写 effective 与 lineage。当前部分私有 Consume 只在 Group 非 nil 触发，Memory 消费不能沿用这个限制；UI 查询不改模型 Run，列表 omitted/lookahead 不消费。
3. Derived 按 Kind+ID 核完整 tuple；相同 key 的 revision/hash/namespace/thread 矛盾明确拒绝，不能 ON CONFLICT DO NOTHING。维持 32 source+scope /64 grants /128 Derived /100 group tuple；超限不截来源。
4. T14 的 RecordOutput 由 125 在唯一结果/消息持久点调用；128 传播真实 Derived/effective，不在 T14 表写第二份 output 状态机。私有结果、群公开 assistant 副本要保持关联，用户独立原文不绑定整个模型 Run。
5. events service/store 显式分组 run/message/memory_revision/memory_candidate/context_entry；新 ID 绝不落默认 Run 分支。共用 800 subjects/250ms、同 T05 fence、min expiry、批 Kind+ID/完整 proof 去重；先关 SQL rows/Tx 再调用实际物理 writer。126 的 correct/forget/自动 head 提交与同门提交线性化，metadata-only stub 不携旧 body。

## 有限安全原因与尚待共同确认项

沿 115：CAPABILITY_DENIED 的 MEMORY_NAMESPACE_DENIED、MEMORY_SCOPE_MISMATCH、MEMORY_REVISION_INACTIVE、MEMORY_FORGOTTEN；RESOURCE_LIMIT 的 MEMORY_PROVENANCE_LIMIT；CONFLICT 的 MEMORY_STATE_INVALID、MEMORY_INPUT_STATE_INVALID。未知 SQL/I/O/坏 JSON 原错误保留，不能当可过滤空项。

预算沿现有 BUDGET_NOT_CONFIGURED、PROFILE_BUDGET_NOT_CONFIGURED、BUDGET_PAUSED、MODEL_BUDGET_EXHAUSTED；伪 purpose/account/retry 与旧 claim 沿原 ATTEMPT_PURPOSE_MISMATCH、BUDGET_ACCOUNT_MISMATCH、INVALID_RETRY_ATTEMPT、MODEL_ATTEMPT_NOT_ACTIVE。建议为合法维护控制变化另用有限 CAPABILITY_DENIED/MEMORY_AUTO_DISABLED、MEMORY_JOB_CHANGED，供 body-free 结束，**这两个技术命名待 125/126/Root 回执后再写入**，不泛吞所有 Denied。

待共同落地而非当前已实现：126 最终 014 字段名/不可变 job settings 语义；125 必须注入 reader/Memory hooks、Claim 已知拒绝分类、当前事实刷新、stdio 新 subjects；原 common/driver 安全 fault 透传若有必要由其 owner 提出精确维护。原 Grant 规则、任务继承、Host 身份/租约、恢复/停止和已发费用责任不变。

当前只读准备结束即可停 turn。产品/测试/Go 均未执行，不写 completed REPORT、不做最终 return，不以接口候选声称 128/T14 已交付；等待 Root followup 的实际源稳定与写/检查窗口。
