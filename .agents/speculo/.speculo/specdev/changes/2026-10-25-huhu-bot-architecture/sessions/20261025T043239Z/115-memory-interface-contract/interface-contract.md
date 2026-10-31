# 115：记忆共享接口候选 v1

**所有下列新类型、签名、表和测试均为候选 / not-run；不是现存产品能力或写授权。** 只固定一条实施路线，待 Root 接纳、T10 实际交回后按新输入重核。`api` 只用标准库；`sql.Tx` 仅出现在 SQLite adapter 内部。来源 ID/实际 SHA 见 `sources.json`。

## 1. 权威、默认和现存边界

- Spec §5/§6、ADR-024、T14/T15为产品权威。UI-001/final/app.js:33 的 `state.auto[id] !== false` 表明默认自动维护开启；099 的默认 off 是未采纳建议，撤回该建议。`enabled=true` 不代表允许 HTTP。默认 MaintenanceTokenLimit 空→`"0"`、Profile 未配或暂停、Bot disabled/无模型/缺凭证/无当前资料资格，均使 `eligible=false` 且给可读 reason；不偷偷补额度、换模型或调用 Probe。用户关闭只暂停维护，不禁已有合法记忆召回。
- 当前八个 memory 方法全部 `implemented=false`，Facade 无 Memory 字段；当前 maintenance binder、记忆表/输入/抑制/投递门均未装配。T14先实际装配六个；T15两个仍 false，proposal 分支也明确 METHOD_NOT_AVAILABLE，不能空成功。当前同 Executor/16本地槽、Run状态、Attempts、恢复/关闭、短delivery fence继续唯一权威。
- 当前 schema=9，已注册至016-recovery.sql。014-memory.sql只是文件名：若T10不改DB，T01注册实际 Version10；T15随后是下一连续版本，不注册Version14/15。实施时重新读取 Ordered；旧SQL不改。
- 013限制 admission_kind 为 model/user_root/user_batch。**不新增 maintenance 枚举，不为此重建execution_runs**：维护仍 execution角色、model admission；唯一 `memory_jobs.run_id` 持久关联决定维护用途。新根使用 task_config_id非空，现有前台单根索引已排除这种独立配置Run；仍须新thread、实际root=self/parent空，不占Session.active_run_id、不插Delegation、不取终态来源旧pin。

## 2. 唯一 API/HAP/TS 候选（T01 单写）

以下Go类型为完整字段集；wire按标注的camelCase生成严格DTO，未知字段拒绝，不能靠指针非nil自行选择权限。已有 CommandMeta、RunUsage、SourceSnapshot、SourceScope、DerivedInput、DeliverySubject复用。所有变更命令先epoch/receipt/idempotency，再适用CAS。`expectedRevision`统一必需正Decimal，不用时间戳覆盖。

```go
// Proposed in application/api/memory.go; context from stdlib.
type MemoryNamespace struct {
    Kind string `json:"kind"` // agent | temporary | global
    ID   string `json:"id"`   // actual agentID | actual temporary subjectID | ProfileID
}
type MemoryScope struct {
    Kind string `json:"kind"` // profile | session | work_thread
    ID   string `json:"id,omitempty"` // absent for profile, required otherwise
}
type MemorySettings struct {
    Namespace MemoryNamespace `json:"namespace"`
    Revision string `json:"revision"` // settings CAS, not catalog CAS
    Enabled bool `json:"enabled"`     // default true for agent namespace
    Eligible bool `json:"eligible"`   // current ability to admit new maintenance, no reservation
    Reason string `json:"reason,omitempty"`
}
type MemoryBody struct {
    Text string `json:"text"`
    Hash string `json:"hash"`
    Provenance string `json:"provenance"` // observation | inference | user
    CreatorKind string `json:"creatorKind"` // user | agent | temporary
    CreatorAgentID string `json:"creatorAgentId,omitempty"`
    JobID string `json:"jobId,omitempty"`
    SourceRefs []SourceSnapshot `json:"sourceRefs"`
    SourceScopes []SourceScope `json:"sourceScopes"`
    Derived []DerivedInput `json:"derived"`
}
type MemoryItem struct {
    ID string `json:"id"`
    Revision string `json:"revision"` // mutable item/head CAS
    RevisionID string `json:"revisionId,omitempty"` // independent immutable revision object
    Namespace MemoryNamespace `json:"namespace"`
    Scope MemoryScope `json:"scope"`
    State string `json:"state"` // active | forgotten
    Pinned bool `json:"pinned"`
    Body *MemoryBody `json:"body,omitempty"`
}
type MemoryCandidate struct {
    ID string `json:"id"`
    Revision string `json:"revision"`
    Namespace MemoryNamespace `json:"namespace"`
    Scope MemoryScope `json:"scope"`
    JobID string `json:"jobId"`
    State string `json:"state"` // pending | applied | superseded | blocked
    Operation string `json:"operation"` // create | correct
    TargetItemID string `json:"targetItemId,omitempty"`
    TargetRevision string `json:"targetRevision,omitempty"`
    Reason string `json:"reason,omitempty"` // e.g. MEMORY_PINNED_CONFLICT
    Body *MemoryBody `json:"body,omitempty"`
}
type MemoryJobRun struct {
    ID string `json:"id"`
    Status string `json:"status"` // projected actual Run, never stored job execution state
    Reason string `json:"reason,omitempty"`
    Usage *RunUsage `json:"usage,omitempty"`
}
type MemoryJob struct {
    ID string `json:"id"`
    Revision string `json:"revision"`
    Namespace MemoryNamespace `json:"namespace"`
    SourceRunID string `json:"sourceRunId"`
    Admission string `json:"admission"` // pending | bound | blocked
    Commit string `json:"commit"`       // pending | committed | candidate | discarded
    Reason string `json:"reason,omitempty"`
    Run *MemoryJobRun `json:"run,omitempty"`
}
type MemoryProposal struct { // T15 only, fixed preview; not recallable
    ID string `json:"id"`
    Revision string `json:"revision"`
    Operation string `json:"operation"` // create | update | delete
    TargetItemID string `json:"targetItemId,omitempty"`
    TargetRevision string `json:"targetRevision,omitempty"`
    Scope MemoryScope `json:"scope"`
    Body *MemoryBody `json:"body,omitempty"`
    PreviewHash string `json:"previewHash"`
    ExpiresAt string `json:"expiresAt"`
    State string `json:"state"` // pending | accepted | rejected | expired | conflicted
}
type MemoryObject struct {
    Kind string `json:"kind"` // item | candidate | job | settings | proposal
    Item *MemoryItem `json:"item,omitempty"`
    Candidate *MemoryCandidate `json:"candidate,omitempty"`
    Job *MemoryJob `json:"job,omitempty"`
    Settings *MemorySettings `json:"settings,omitempty"`
    Proposal *MemoryProposal `json:"proposal,omitempty"`
}
type MemoryQuery struct {
    ProfileID string `json:"profileId"`
    Namespace MemoryNamespace `json:"namespace"`
    Kind string `json:"kind"` // item | candidate | job | proposal; default item
    Scope *MemoryScope `json:"scope,omitempty"`
    Query string `json:"query,omitempty"`
    Limit int `json:"limit,omitempty"`
    Cursor string `json:"cursor,omitempty"`
}
type MemoryGet struct {
    ProfileID string `json:"profileId"`
    Namespace MemoryNamespace `json:"namespace"`
    Kind string `json:"kind"`
    ID string `json:"id,omitempty"` // absent only for settings
}
type MemoryPage struct {
    NamespaceRevision string `json:"namespaceRevision"` // catalog CAS for private add
    Settings *MemorySettings `json:"settings,omitempty"`
    Items []MemoryObject `json:"items"`
    NextCursor string `json:"nextCursor,omitempty"`
    DeliverySubjects []DeliverySubject `json:"-"`
}
type MemoryPin struct {
    CommandMeta
    Namespace MemoryNamespace `json:"namespace"`
    ID string `json:"id"`
    Pinned bool `json:"pinned"`
}
type MemoryCorrect struct {
    CommandMeta
    Namespace MemoryNamespace `json:"namespace"`
    Action string `json:"action"` // add | correct | apply_candidate
    ID string `json:"id,omitempty"`
    Scope *MemoryScope `json:"scope,omitempty"`
    Text string `json:"text,omitempty"`
    CandidateID string `json:"candidateId,omitempty"`
    CandidateRevision string `json:"candidateRevision,omitempty"`
}
type MemoryForget struct {
    CommandMeta
    Namespace MemoryNamespace `json:"namespace"`
    ID string `json:"id"`
}
type MemorySetAuto struct {
    CommandMeta
    Namespace MemoryNamespace `json:"namespace"`
    Enabled bool `json:"enabled"`
}
type MemoryReferenceSelection struct {
    Kind string `json:"kind"` // message | task_result | memory_revision
    ID string `json:"id"`
    Revision string `json:"revision"`
}
type MemoryGlobalProposal struct {
    CommandMeta
    Operation string `json:"operation"` // create | update | delete
    TargetItemID string `json:"targetItemId,omitempty"`
    Scope MemoryScope `json:"scope"`
    Text string `json:"text,omitempty"`
    Sources []MemoryReferenceSelection `json:"sources"`
}
type MemoryResolve struct {
    CommandMeta
    ID string `json:"id"`
    Decision string `json:"decision"` // approve | reject
    PreviewHash string `json:"previewHash"`
}
type MemoryAPI interface { // T14 six real methods
    List(context.Context, RequestIdentity, MemoryQuery) (MemoryPage, error)
    Get(context.Context, RequestIdentity, MemoryGet) (MemoryObject, error)
    Pin(context.Context, RequestIdentity, MemoryPin) (MemoryItem, error)
    Correct(context.Context, RequestIdentity, MemoryCorrect) (MemoryItem, error)
    Forget(context.Context, RequestIdentity, MemoryForget) (MemoryItem, error)
    SetAutoMaintenance(context.Context, RequestIdentity, MemorySetAuto) (MemorySettings, error)
}
type GlobalMemoryAPI interface { // T15 two methods, nil/unimplemented during T14
    ProposeGlobal(context.Context, RequestIdentity, MemoryGlobalProposal) (MemoryProposal, error)
    ResolveGlobal(context.Context, RequestIdentity, MemoryResolve) (Receipt, error)
}
```

Facade拟新增 `Memory MemoryAPI`、T15时再新增 `GlobalMemory GlobalMemoryAPI`；仍只有原八个wire方法。T14不制造两假已实现方法。保留预留方法名，因旧方法从未implemented，T01统一替换其未实现形状，不维持无消费者的双DTO。T01同时生成Go wire/schema/api.ts及正负样本，不由T14另写TS。

**严格分支与真实消费者：**

- MemoryObject恰有与Kind匹配的一个指针。item active要求RevisionID+Body；forgotten禁止Body与旧RevisionID，只保安全新CAS/归属。candidate blocked/superseded可仅安全stub，不把旧正文必填。job无prompt、提炼候选、凭证、私聊正文或CP；其Run状态/usage实时从真实Run派生，重开页可链接原Run/recovery。
- list/get供记忆页的owner/scope/来源、候选选择与作业原因；settings由get(kind=settings)或list.Settings读取，global无自动设置。未知namespace/Kind不是空结果，身份/不存在/未装配分别为Denied/NotFound/METHOD_NOT_AVAILABLE。没有候选或合法条目时才返回空数组。
- add只允许可信用户管理private/temporary namespace，ID/Candidate字段禁用、Scope/Text必需；expectedRevision是namespace catalog CAS，服务器新不可复用itemID，正文是这次用户独立新意图，不承袭被忘内容资格。correct要求当前item ID/CAS/Text，不改Scope，不接受模型provenance；保留原受限来源闭包并记录用户创建者。apply_candidate要求item CAS+CandidateID/CandidateRevision且不接Text，服务重读固定候选和当前来源；显式用户可采纳pin冲突，保留当前pin值。pin/forget均item head CAS，forget返回forgotten stub不返回旧body。全局增改删只能T15 proposal/resolve，private接口拒GLOBAL_CONFIRMATION_REQUIRED。
- setAuto只适用于持久agent；temporary任务记忆不启动sponsor维护。新namespace未物化时只读可返回虚拟默认catalog/settings revision=1、enabled=true；**只在首次写/合法completion同Tx物化这个默认**。CAS变更先物化1再核验/更新，避免只读查询偷偷建数据。已有Agent在014可预置同值。settings revision与catalog revision分开；同receipt重放在CAS前返回原结果。
- T15 create用global catalog CAS；update/delete用target head CAS；resolve用proposal CAS+fixed hash。Sources只是按Kind/ID/Revision选择请求，服务重新读取实际message/result/memory revision和全部Host/Grant来源；hash/owner/provenance由服务生成。模型绑定时来源不得小于实际ToolExecution已经消费的闭包，不能用空Sources洗成独立内容；用户显式独立提案可无旧来源，并经后续确认。未确认proposal永不进入召回。此时不添加memory模型工具；T15若要Agent主动propose，届时精确维护Broker/common工具decoder，协议文件仍无需改变。

**统一预算：** UTF8合法；text 1..65536 bytes；query≤1024 UTF8 bytes；list limit默认20/1..50，单对象含全部provenance编码≤245760 bytes、序列化页≤262144 bytes，cursor≤2048 bytes；recall最多20项/131072 bytes；candidate set≤32项且整个模型文本≤131072 bytes、单项≤65536 bytes；来源Sources+Scopes≤32、GrantIDs≤64、Derived闭包≤128、Group完整tuple≤100，所有并集溢出明确RESOURCE_LIMIT，不截provenance。ID沿现Opaque≤512 bytes，命令ID/key≤128；Decimal正数CAS，空数组显式[]、缺省只在上述分支允许，null不替代空数组。schema maxLength不是UTF8 byte验证，T01提供Go/TS一致纯字节校验与Unicode/组合emoji边界样本。页满只在完整对象边界分页，不存一个合法但永远无法编码/读取的对象；cursor绑定actual profile/principal/namespace、kind、query hash、scope、catalog/suppression代与稳定末key，不能作为授权凭证，旧绑定返回CURSOR_EXPIRED。更外层HAP页/批、HTTP1MiB、输出4096与CP1MiB仍限制。

## 3. 可信模型输入、无工具维护输出与旧 CP

以下为拟新增纯类型；模型不能构造它们。`DerivedInput.Kind`新增`memory_revision`，ID指独立不可变revisionID，不是itemID+可变revision；这样现Kind+ID去重与lineage主键不会混掉同item两个旧版本。Namespace/Hash/WorkThreadID仍从实际记录构造。

```go
type MemoryInputEntry struct {
    Ref DerivedInput // DB stable message/task_result/memory_revision identity+hash; immutable revision object uses Revision="1"
    Role string      // user | assistant | memory; DB classification
    Text string
}
type MemoryTarget struct { ItemID, Revision, RevisionID string; Pinned bool }
type ExecutionMemoryInput struct {
    Version string // "1"
    Mode string    // recall | maintenance
    Namespace MemoryNamespace
    JobID, JobGeneration, SettingsRevision string // maintenance only
    Entries []MemoryInputEntry
    Targets []MemoryTarget // maintenance only; exact current target heads
    BindingDigest string
}
type MemoryCandidateDraft struct {
    Operation string // create | correct
    TargetItemID string // only a server-supplied Targets entry for correct
    Text string
    Provenance string // observation | inference; never user/global/pinned
}
type MemoryCandidateSet struct { Items []MemoryCandidateDraft }
func CanonicalMemoryInputBinding(ExecutionMemoryInput) (string, error)
```

拟调整：`EngineInput.Memory *ExecutionMemoryInput`；`RecoveryInspection.Memory *ExecutionMemoryInput`；`CheckpointInspection.Memory *ExecutionMemoryInput`；`EngineResult.MemoryCandidates *MemoryCandidateSet`。不往ToolCall塞自报owner/job/account字段，不改变Driver接口或公开CP入口。nil Memory表示没有初始召回/维护块，不代表本Run没有后来取得的记忆依赖；后者由DB完整effective闭包另管。

CanonicalMemoryInputBinding为纯计算：先验证每Entry的`Ref.Hash==sha256(Text)`，再对固定字段顺序的Go结构`{Version,Mode,Namespace,JobID,JobGeneration,SettingsRevision,Entries:[{Ref,Role}],Targets}`用UTF8 json.Marshal（无map）后取`sha256:`小写hex；忽略输入BindingDigest，保Entries实际模型顺序，Targets按itemID排序并拒重复。无隐式endpoint归一、默认来源或模型决定的引用。T01只在internal共享纯类型写此helper；T08消费。关联完整Grant/Group/Host事实不塞模型文本，由DB资格链重查。

**准备与同Finalize消费者：**普通Run在原History/来源准备后，T14只读有界召回→T03同MarkRunning Tx实际Consume，返回固定Entries；实际发送给SDK的只有这些正文，不先读全库再隐藏。维护Run分支跳过原PrepareContext全文与原Session/group ModelHistory；只读取job固定选中message/result文本，不因同Session/group去重扫私聊/群历史或全量附加Host正文。其真实来源/租约仍由原ContextAccess检查，task Intent由应用在受理时持久化，原Intent最后一次追加规则不变。

拟由T08在common中把 `func readState(ctx context.Context, reader io.Reader, run api.Run, config api.TaskConfigSnapshot, intent string, memory *api.ExecutionMemoryInput, r registry, drivers *Registry) (*executionState, error)` 的memory参数完整传入，Run/Resume/InspectCheckpoint这三个现公开方法签名不变、仅共享DTO增字段。common收到Mode=maintenance时：保留原Config/Persona/model；另加固定版本提炼指令，使用**空工具registry**与空Tools schema，不改Config.AllowedTools快照、不让模型返回工具或全局授权。只在内存有界收集生成文本，不向Run text.delta发布候选JSON；真实HTTP照原Attempts/SDK/producer ACK/Settle。结束用严格JSON解析MemoryCandidateSet（重复键/未知字段/截断/越界拒绝，target只能来自Targets），返回Status=finished、Text空、MemoryCandidates非nil、实际Usage。空Items是合法“无记忆”，不是错误。已知无效候选可返回body-free failed/MEMORY_CANDIDATE_INVALID，未知错误保原规则。T14同Finalize二次验证，而非信Engine输出即落库。模型参数没有Namespace/SourceRefs/Grant/owner/pin/state/expectedRevision的写权。

**推荐不升级已有CP格式或EngineVersion。** Memory非nil时common在当前Intent之前加入一个固定User数据消息：`HUHU authorized memory input v1\n`+规范模型payload，含BindingDigest与有序{Role,Text}，不以文本授维护身份。纯Inspector/Resume接收从DB读出的同一Memory参数，重算digest并核`Messages[Initial-2]`的Role和完整字节；维护还逐字核固定指令/完整初始前缀、空tool digest。原Intent仍独立由execution_runs.intent核`Initial-1`，不是拿CP自报值。实际purpose只有job→Run的DB关系，故普通用户在历史中输入相似文本不会变维护、借账户或授记忆权限。

Memory=nil的Chat v1/Responses v2编码分支、DTO字段/顺序/nil形态、ToolDigest seed均不增加字段/不改字节；不对旧历史中的相似字面前缀做新拒绝。需要Memory的新Run在DB有不可变prompt manifest，丢失/不匹配时ReadRecovery返回CONFLICT/MEMORY_INPUT_STATE_INVALID，不按legacy降级；CP缺块/改引用/改正文/改purpose则CHECKPOINT_INCOMPATIBLE/INVALID。不允许CP自己选择Mode。后续若实现者不能以旧格式完成这项独立比较，再向Root提出仅新带Memory CP的版本方案，不能静默改旧v1/v2。

维护首版无工具，所以通常没有悬停CP；已发HTTP中崩溃且无完整兼容CP时，原T16应blocked，不能自动重播收费请求。旧known/unknown账和pin保留，用户可取消。普通带召回Run若真的因note审批/children持有CP，原同Run用户恢复机制照用，并按当前记忆资格核查。初始prompt manifest与后来tools.get/私有消息取得的effective依赖区分：后者同Tx追加DB依赖/Run.revision，在每后续HTTP/结果/投递/恢复门查全量；不能拿启动时Memory=nil绕过。

## 4. 唯一 Executor / UoW 合同（adapter-only）

以下类型和interface拟由原T03在 `sqlite/execution/maintenance.go` 声明，T14 Store实现并注入；execution不import memory具体adapter，memory可import execution，避免循环。`Work`、`sql.Tx`、具体Repo不进入Application API。现存Repository/Engine Port仍为调度/状态权威。

```go
// Proposed in package execution, names in this block are adapter-internal.
type MemoryScanCursor struct { CreatedAt, ID string }
type MemoryAdmissionPage struct { JobIDs []string; Next MemoryScanCursor }
type MemoryCompletion struct {
    RunID, MessageID string // from actual terminal write, empty MessageID for private result
}
type MaintenanceAdmission struct {
    JobID, Generation, ProfileID, PrincipalID, AgentID string
    SourceRunID, SessionID, Intent string
    Access api.RunAccessInput // exact sources/Grant/Group to be rechecked for NEW recipient
    Input api.ExecutionMemoryInput
}
type MemoryCommit struct { AppliedRevisionIDs, CandidateIDs []string }
type MemoryHooks interface {
    RecordCompletionInTx(context.Context, *sql.Tx, MemoryCompletion) error
    AdmissionPageInTx(context.Context, *sql.Tx, MemoryScanCursor) (MemoryAdmissionPage, error)
    ReadAdmissionInTx(context.Context, *sql.Tx, api.RequestIdentity, string) (MaintenanceAdmission, error)
    BindRunInTx(context.Context, *sql.Tx, string, string, string) error // jobID,runID,snapshotID
    PrepareInTx(context.Context, *sql.Tx, api.ToolExecution) (*api.ExecutionMemoryInput, error)
    ReadInputInTx(context.Context, *sql.Tx, api.RequestIdentity, string) (*api.ExecutionMemoryInput, error) // runID, immutable initial manifest
    CommitInTx(context.Context, *sql.Tx, api.ToolExecution, api.MemoryCandidateSet) (MemoryCommit, error)
    RecordOutputInTx(context.Context, *sql.Tx, api.ToolExecution, string) error // actual messageID or private result runID
}
func (s *Store) SetMemory(MemoryHooks)
func (s *Store) PrepareAndMarkRunning(context.Context, executorapp.Work) (executorapp.Work, error)
func (s *Store) NewMaintenanceInTx(context.Context, *sql.Tx, api.RequestIdentity, string) (api.Run, error) // jobID only
```

| 时点 / caller | 受信参数、事务、返回/错误 |
|---|---|
| T03最终Finalize→RecordCompletion | Tree/群发布和Run terminal写入后真正有已接受非空正文；只传实际Run/可选message身份，T14按实际publication/result表重读不可变revision/完整来源，不接受模型Result自报owner。纯orchestration、maintenance本身、未接受正文不出outbox；temporary不触发sponsor长期维护，只有自身任务域。可追踪partial标记不被包装成完整事实。未知SQL/Commit错误回滚同Txn；预算/模型/eligibility失败不在此调用HTTP或否定已保存聊天。 |
| 同Claim扫描器→AdmissionPage/ReadAdmission | 一页≤32、keyset稳定(created_at,jobID)，只收一个新维护根/轮，且Profile最多一个被领取/可运行的maintenance作业（真实在途producer未结束也计入），使用原16池，先现有交互/审批/父候选再后台一次；cursor只在外层commit成功发布，短页回卷。无通知仍由现100ms扫描补偿。无资格时job安全reason可记录但不建Run；重配/显式开启可重新评估尚未bound的outbox，不创建无限retry Run。 |
| T03 NewMaintenance | 只接jobID，先通过ReadAdmission重读真实source、namespace/auto/抑制/权限和owner当前配置；再复用PinTaskInTx生成独立snapshot/pin（不是source旧pin），真实root=self、budgetroot=self、parent空、独立thread，Session关联仅归属。沿实际Source的当前接收方read/send/summarize/memory核查，严格缺Grant阻塞；不改active_run_id/不写聊天正文、不插Delegation。最后BindRun同Tx核job唯一未bound并记录真实Run/config；任何后半已写的拒绝/SQL错误须整体回滚，不提交半Run/pin。 |
| T03准备/MarkRunning→Prepare | 实际claim/owner/currentRun验证后只用真实DB选择与来源；返回固定model Input并在同Tx写prompt manifest、initial/effective依赖和lineage，MarkRunning一起commit，随后才入Engine。普通召回需当前read+send；维护额外summarize+memory。来源Host检查在事务外原ContextAccess，不把host/SDK放SQL。两阶段之间水位变更需拒绝/重读，不把旧候选交Engine。 |
| T03 Finalize→Commit | 只对绑定maintenance job和当前claim的finished合法MemoryCandidates调用，先真实producer/费用、恢复/取消、全量当前记忆/来源资格，核job/输入代、settings仍enabled、目标CAS/pin；T14原子写revision/head/来源/index/job提交。固定或目标head冲突只保存可读candidate，不能覆盖；已知资格拒绝body-free终结，未知DB/JSON错误整Tx回滚。普通Run带MemoryCandidates或maintenance Text非空是INVALID_ENGINE_RESULT。 |
| T03消息/私有结果写入→RecordOutput | message/private result持久后同Tx把真正消费的完整memory依赖绑定该输出；user原文没有消费记忆，不绑定整Run依赖。T11/T13输出/跨任务正文副本按实际返回/投递继承，不能只传SourceRefs漏memory revision，也不能把未读页都标成已消费。 |

PrepareAndMarkRunning是实际SQL Repository对现MarkRunning逻辑的单一封装：在一个Tx中核preparing/claim，把原History的已选来源/Derived准备事实暂存到该Tx，调用Memory.PrepareInTx实际选择/记录初始manifest和依赖，刷新Work.Access/Lineage/Memory，调用唯一markRunningInTx并返回新Work。任何失败全部回滚；不在应用层拿旧Work继续绑定。Executor通过窄可选接口调用此方法；旧测试Repository的MarkRunning保持原适用路径，实际Store的两入口共享同一个markRunningInTx，不保留第二生产调度机制。原Host读取/lease验证仍在事务外，新增记忆来源需要现ContextAccess验证；用PrepareContext作身份/Hash验证时，其附加来源正文不得自动再注入模型，仅原显式附件和固定Memory entries进入输入。MarkRunning后的完整当前权限确认失败零模型，不能用便捷SQL替换Host身份规则。

尚未bound job不占原Run pin；受理时选择当前Bot配置，不冻结终态source配置。受理后所有重开/尝试坚持其独立snapshot；原T02/T17删除预检须见活动job/新pin/记忆项。PinTaskInTx现已覆盖凭证删除屏障，terminal实际producer/未决effect结束后仍调用唯一ReleaseTerminalPinsInTx；不另写释放SQL。Agent usage组合增加memory引用与revision token，去掉现Unassembled=[memory]，不能嵌套SnapshotUsage开事务。

可信预算另由T12声明并实现窄接口，供T03受理及Bind消费：

```go
// Proposed in package usage (adapter-only).
type AttemptBinding struct { Purpose, AccountID, JobID, JobGeneration string }
func (s *Store) MaintenanceEligibilityInTx(context.Context, *sql.Tx, string) (string, error) // profileID; empty reason iff configured/unpaused/headroom
func (s *Store) ReadAttemptBindingInTx(context.Context, *sql.Tx, api.ToolExecution) (AttemptBinding, error)
```

Eligibility仅读当前policy/accounts，不Reserve；零维护或Profile额度、paused/耗尽返回原有限reason，SQL原样。ReadAttemptBinding先核真实Run/claim/pin/recipient，查唯一memory_jobs.run_id、namespace/代与维护开关；有合法job才Purpose=maintenance、AccountID=maintenance:<actualProfile>。普通main/child/question维持root:<budgetRoot>。BindAttempts原签名不变，返回的bound从该DB绑定固定账户族。Reserve的q.Purpose仅允许绑定用途或summary/retry子标签，q.AccountID非空必须相同；**accountInTx按binding账户族选择，不能按q.Purpose="summary"/"retry"切回root**。重读时绑定族/job代变化拒绝；RetryOf只同Run/claim/account，不能旧父或其他job。Dispatch再次当前资格/auto/policy/源检查，真实callback事务外；已发照原Settle/unknown，不因pause/forget/cancel退款或停止结算。当前maintenance binder未实现，所以这是未来必要接缝，不称现产品漏洞。

## 5. 当前资格、实际派生与物理投递的一条门

T14只核namespace/head/immutable revision/抑制/真实输入关系，返回持久事实；T05再核原Grant/Group/recipient/Host范围。禁止T14→公开T05 Check→T14的递归环。以下接口拟在grants adapter声明，T14实现；只接原owner生成的subject，不接wire proof。

```go
// Proposed in package grants, adapter-only.
type MemorySubject struct { Kind, ID string } // run | message | memory_revision | memory_candidate
// A witness is read from the actual source record, not payload sourceRefs.
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
type MemoryFacts struct { Requirements []MemoryRequirement; Watermark string }
type MemoryFactsReader interface {
    ReadFactsInTx(context.Context, *sql.Tx, api.RequestIdentity, string, []MemorySubject) (MemoryFacts, error) // profileID
}
func (s *Store) SetMemory(MemoryFactsReader)
// Empty targetRunID is permitted only for an actual user UI read and ops=[read].
// Otherwise the current target Run/claim lineage is read, not supplied recipient.
func (s *Store) CheckMemoryInTx(context.Context, *sql.Tx, api.RequestIdentity, string, string, MemoryRequirement, []string) (time.Time, error) // profileID,targetRunID
```

ReadFacts在同Tx从实际run/message/candidate/revision关系批读，核本域全部当前资格/完整祖先闭包，不调用Grant/Host/模型；没有记忆关联的旧对象返回空Requirements，不能用客户端传空列表或Memory=nil断言无关联。每批≤800 subjects，单Run/Revision闭包≤128，无跨请求缓存。T05的CheckInTx在空Sources快返前消费真实run依赖；ReadDeadlineBatch复用同Tx批事实，仅增加常数批读取而非800逐项SQL。T05内部已有Grant/Group原检查仍对每个exact事实运行；不得用“已检查”客户端标记跳过、改TaskID、把旧recipient当新模型或删Task/Session限制。CheckMemoryInTx是原T05内部专用reader消费：模型用当前targetRun，UI读使用实际revision作者/授权Run的历史recipient只核read；来源仍由原policy.Authorize校验。Group中“执行者是成员”与“正文私有贡献者”分开，不能拿整个作者Run.Group错误遮住合法published历史，也不能把私有contributors清空。单个revision的来源并集仍受32/64/100界限；大量旧路径没有memory关系时一条批空查询，不把每个祖先都当一个新的800顶层subject。Witness批查询有界分块、同Tx关闭rows、deadline全程不增长。

- 普通模型召回与维护：用**实际当前目标Run** recipient/Session/Task向原Sources/Grant交集重验。维护另核summarize/memory；新的独立根没有现delegation/reply继承映射，原仅task-bound Grant不能自动跨到维护或新Session。首版保持blocked，用户可通过已有公开grants.create授足够且精确的Session/Profile资格；不新增假Delegation/ParentScope或task ID别名。scope只可收窄原来源：source-free直接Bot互动可Bot/profile私有；来源原有Session/任务或群范围则不自动晋升profile范围。
- 用户只读记忆页：owner读资格与模型send分开。逐Witness调用原历史读逻辑，PublishedMessageID只有DB实际publications证明才可放宽作者current成员；原Grant仍当前read。私有task/message贡献保持真实Group tuple当前资格；global确认仅可发现，不授send。temporary是自己的subject/task namespace，不因Sponsor取得长期库。
- 动态tasks.get/list、private AgentMessage/子结果真正返回正文时，T11/T13把其memory_revision及完整祖先并入接收Run DB effective依赖与lineage、提升Run.revision；T03 AppendEvent/Finalize、T12每次Reserve/Dispatch、T06实际效果末门从当前DB取全部依赖，不只启动时Work/ToolExecution。zero Host Sources也不跳过。普通无关联页一条空批路径，不为本功能提前优化旧guard。
- 持久assistant/public群message或private结果按真正被消费的memory输入绑定。原用户文字、附件标签、已公开transcript的合法范围不被整Run记忆依赖一刀切吞掉；message fence核其自身关联，类似现Message.source_json窄读。T17清除后续遍历这些实际输出关联。

拟复用现 `EventsAPI.WithDelivery`，不新增Memory独立写者/第二门。server-only DeliverySubject新增Kind=`memory_revision`（ID=immutable revisionID）及`memory_candidate`（ID=immutable candidate body对应对象）。列表/get/Pin/Correct有正文的响应由T01路由绑定这些subjects；metadata-only job/settings/forgotten stub无需正文subject。新增类型不能落到现events“其他Kind一律视作Run”的分支；T04必须显式分组再批读取。批中按Kind+ID精确去重，保持32引用/800subject上界，不用首个nil proof吞后面正文。

T14 pin/correct/forget、自动head提交以及T15 resolve的正文资格变更都复用T05.WithReadFence：先取得相同门，短Tx提交失效/回执，释放；查询在物理dequeue同门重验当前head/候选/来源/expiry，SQL关闭后才实际frame写。沿原250ms permit和取消完成后释放、partial frame断连、不跨模型HTTP持门。新head提交之后旧rev页只能安全error，重读新页；不能以客户端隐藏代替物理阻断。对空记忆800旧路径、mixed batch/nil首份和当前expiry的回归仍需真实跑，当前not-run。

已知安全拒绝：CAPABILITY_DENIED/MEMORY_NAMESPACE_DENIED、MEMORY_SCOPE_MISMATCH、MEMORY_REVISION_INACTIVE、MEMORY_FORGOTTEN；超量RESOURCE_LIMIT/MEMORY_PROVENANCE_LIMIT；坏JSON/缺关系/身份矛盾为CONFLICT/MEMORY_STATE_INVALID，不泛吞SQL/未知Fault。初次召回可以先过滤不可用条目再匹配；已经实际消费后发生失效，则后续请求/回调body-free终结，不把所需输入悄悄删掉继续运行。T03现有限claim拒绝集只精确新增这些已证实业务reason，不把全部Denied当可跳过。

## 6. 恢复、关闭和配置预检

```go
// Proposed in sqlite/recovery, adapter-only; T14 Store implements.
type MemoryRecovery interface {
    RecoveryWatermarkInTx(context.Context, *sql.Tx, api.RequestIdentity, string, []string) (string, error) // profileID, actual tree runIDs<=33
}
func (s *Store) SetMemory(MemoryRecovery)

// Proposed private bootstrap/application lifecycle, no independent scheduler.
type MemoryLifecycle interface {
    StopAdmission()
    Done() <-chan struct{}
}
```

T03 ReadRecoveryInTx在同Tx以真实Run读ReadInput，保持原accepted Intent/独立config/ExecutionPosition；不是Inspector去SQL。存在prompt引用却缺manifest/Hash不符为持久异常，不能当nil旧Run。T16水位加入本树实际job/initial manifest/effective依赖、相关item head/suppression、maintenance settings与目标head；不扫描全部Profile memory造成无关树失效。既有Grant/Group/预算/来源水位照旧，Host旧lease重开仍blocked。两短Tx夹纯CP/Inspector不变，第二Tx同hash/CAS/generation才发布ready或Resume；click与最终Dispatch再核当前memory/auto，ready不是额度或继续执行授权。

水位返回opaque sha256（空关联可为确定空值），只涵盖id/revision/hash/状态/代，不外发正文/CP/路径；不把恢复代数当item CAS。current memory资格在CP I/O前核本域有效性，纯Inspector再比较绑定块；检查不Resolve、不模型/Host写/重提炼。实际恢复仍原Run/newclaim/原job/账户/config/decision，不能重开已完成子结果、退掉unknown或新job代替缺CP。未bound outbox可继续受理，已经running树的任何新申请/后代都不得绕原恢复屏障。

Core同步StopAdmission先于可能失败的持久Stop事务，对Memory API新管理/受理/Prepare/Commit也闭门；取消实际call的ctx并等MemoryLifecycle.Done实际返回。SQLhelper由原Executor/Inspector/stdio writer的实际生命周期覆盖，不自开提炼goroutine或第二worker；现有server先停止/实际join物理writer。Core继续等Executor、model Registry所有driver、Probe、Inspector、在途HTTP和会计结算后才关Provider/DB/Profile；Close3s只是超时返回，同Done/WaitClosed唯一排空不重复cleanup。已Dispatch的原Settle不被Memory停止门拦截。auto pause只阻新维护HTTP/自动提交，不禁用户read/correct/forget和普通合法聊天；实际已发费用不撤销。

T02 Agent删除usage组合：原execution SnapshotUsageInTx不再永远Unassembled(memory)，同Tx加入namespace项/待处理job/candidate引用与单调revision token；不能嵌套公共SnapshotUsage开Tx。维护已bound的新task_config pin沿现凭证删除谓词可见，未bound job没有凭证pin，Bot停用/删掉后不能自动受理。T17删除还要关闭/列出outbox、job、revision/body、candidate、input/context/输出关联、索引、CP与受管备份。forget是即时逻辑不可召回，不声称已物理擦除或修改独立Vault笔记。

## 7. 014最小表、唯一性与同Tx约束

这是DDL形状合同，不是已写SQL。T14写014正文，T01在迁移/完整DB+CP备份后串行注册。可合并纯元数据表；不得合并Run/Attempt状态或弱化不可变revision。

| 表/键候选 | 必需内容、索引与约束 |
|---|---|
| memory_namespaces | namespace_id PK；UNIQUE(profile,principal,kind,subject)；catalog_revision/settings_revision/suppression_revision单调正整数，enabled默认1；global不跑auto，temporary无Sponsor授权。纯查询未物化默认不写。 |
| memory_items / memory_revisions | item_id PK+namespace/scope/state/pinned/head_revision_id/CAS；revision_id独立不可复用PK，UNIQUE(item_id,ordinal)，不可变text/hash/provenance/creator/job；可把body独立一表便于T17删正文仍留最小metadata。索引(namespace,state,item_id)、revision→item。pin只改pin/CAS，不把同一正文伪装新语义revision；correct新body修订、旧head不可召回。 |
| memory_completion_outbox / memory_jobs | completion_id PK；UNIQUE(namespace,source_kind,source_id,source_revision,rule_version)；source为实际已接受message/private result，不仅bodyhash。job_id PK、completion唯一、run_id UNIQUE nullable、source/job代、settings快照、admission/commit结果及safe reason；索引(admission,created_at,job_id)。不另存queued/running/succeeded，Run投影唯一。 |
| memory_run_contexts / memory_dependencies | run_id UNIQUE，immutable initial prompt manifest（引用/hash/顺序/role，不重复保存可重读source body）、binding_digest、optional真实job；另按(owner_kind,owner_id,ancestor_kind,id,revision,relation)保存完整effective/输出依赖，支持run/message/private_result/revision/candidate/job；反向索引ancestor→owner供失效/T17。新记忆实际消费与Run.effective来源/Group/lineage/revision同Tx。 |
| memory_candidates | candidate_id PK、job_id+ordinal UNIQUE、fixed draft/target head/pin expectation/source代/状态及CAS；模型不得提供owner/scope/source proof，目标只取受理时真实列表。冲突保留candidate，不覆盖head；来源无效则body不可读，不把冲突候选当可召回事实。 |
| memory_suppressions | PK(namespace,origin_kind,origin_stable_id,rule_kind)，generation/receipt/保护itemID；**无正文、无可逆prompt、无语义向量**。forget使用deny_automatic，correct/人工保护可用protect_item；按完整namespace+原始对象身份，不靠模型fact ID/new item/hash判新意图。 |
| memory_index | 只含item/revisionID+检索派生数据/validity token，能删后重建；所有读取先回表当前head/授权，不授资格。 |

同Tx核心不变量：

1. Finalize完成正文/结果、其实际provenance、去重outbox一起提交；不能HTTP内等待提炼。未知SQL失败如实整Tx回滚，不能假称聊天已保存；普通维护无资格/模型失败则发生在后续job，不撤销原聊天。
2. correct/forget/pin按receipt优先+CAS提交head/索引/来源作业代/抑制/安全回执。旧callback读旧代被拒；新job即使取新代仍查稳定祖先规则，不能换hash/job/itemID复活。保守规则覆盖同一旧origin及其后续自动revision，不以source revision变大当用户新意图；无关独立origin可继续。明确用户private add产生新独立内容，不清除旧自动suppression。
3. correct保护该人工head：后续同旧origin只能形成该item的候选，不能自动create另一ID绕开；自动维护不直接覆盖user创建/纠正的head，即便仅pin标记未开启，用户仍可明确apply_candidate；forget为deny_automatic。不能准确切分事实时，保守约束整旧来源闭包，而非长期保存被忘全文做语义匹配。Grant撤销仍让人工修订的受限来源失效，不因user creator免检。
4. audit supersedes与有效内容依赖分开。新修订不把自己的被替代旧head当“必须仍current”的活动依赖；同item旧来源展开到其原始受限祖先，supersedes仅审计。对其他memory revision的真正依赖仍要求有效，跨item间接自依赖拒为candidate/冲突，禁止通过循环或任意截断绕失效。原Run已经消费旧rev仍会失效，不因新head关系免检。
5. 每个维护job→Run→snapshot及提交至少一个安全结果原子；重复Finalize/回执不能多条revision/candidate。Memory候选提交失败未知SQL回滚，原producer/attempt状态和会计责任不能靠新HTTP重做。namespace/水位增量到上界须RESOURCE_LIMIT、RowsAffected检查，不溢出回0。

## 8. 精确 owner 请求与串并行阶段

下列是**待Root开窗请求**。根目录均为native/huhubot；不存在的候选文件不是本轮新增产品文件。三协议driver文件没有预计写需求：它们已消费同一有限Generation/消息/空Tools；若T10实际回交改变接口，以真实consumer再报，不借T14重写协议。

| owner/票 | 最小精确路径请求与职责 |
|---|---|
| foundation_go / T01 | internal/application/api/{types,conversation,recovery,events,collaboration,attempts}.go及拟memory.go（纯DTO/Memory参数/新Derived kind），internal/adapters/inbound/hap/{router.go,拟memory.go}、internal/adapters/inbound/stdio/server.go（新增subject分类/批合并）、contracts/hap/v0.1/{methods.json,schema.json,generate.mjs,validate.py,fixtures/golden.json,fixtures/methods.json}及internal/protocol/hap/{schema_generated.json,methods_generated.go}、src/modules/huhubot/api.ts、internal/bootstrap/core.go；六用例装配、nil能力真实性、唯一生成与Memory Stop/Done。生成器路径已按当前实际目录核对，不扩大锁或新依赖。 |
| foundation_go / T03/T16 | internal/application/execution/executor/{ports.go,executor.go}；internal/adapters/outbound/sqlite/execution/{store.go,executor.go,recovery.go,拟maintenance.go}；internal/adapters/outbound/sqlite/recovery/{snapshot.go,commands.go,store.go}：同Claim bounded admission、原配置/Run唯一writer、准备分支/同Finalize/当前输出关联/树水位。没有生产pause seam。 |
| foundation_go / T02 | internal/adapters/outbound/sqlite/assistant/store.go（复用PinTask/ReadTask、必要同Txusage组合）；T03 store.go SnapshotUsageInTx；不能把T14 Store的公共API嵌套到T02事务。凭证raw Provider不动。 |
| credential_provider / T05/T11/T12/T13 | sqlite/usage/{store.go,budget.go,必要recover.go}（trusted绑定/账户族/逐HTTP末门与账本查询），sqlite/grants/{access.go,delivery.go,store.go,groups.go,必要lineage.go,拟memory.go}（Memory事实hook和批读），sqlite/collaboration/{store.go,messages.go,answer.go,followup.go,message_read.go}、sqlite/usage/{messages.go,finalize.go,waits.go}与sqlite/groups/{history.go,publication.go,access.go}只在实际跨正文消费者落点需要时维护。其中memory.go拟新增，其他路径已核存在；仅在具体consumer需要时请求，不要求整目录重写。 |
| credential_provider / T04 | 由043-events-implementation/TASK.md明确原owner，不凭099猜：internal/application/execution/events/service.go（现Repository也在此）、internal/adapters/outbound/sqlite/events/store.go、tests/contract/events/**；显式处理memory_revision/candidate与原run/message分类、当前deadline/批页fence。stdio仍foundation_go T01维护。 |
| engine_adapter / T08 | internal/adapters/outbound/eino/common/{engine.go,checkpoint.go,tools.go,必要protocol.go}：Memory纯输入块/Inspector参数/maintenance空工具候选解析；保legacy编码与实际Attempts，三driver不重开。 |
| T14新owner待Root分配 | 原ticket的domain/memory/private/**、application/memory/{context,private,maintenance}/**、adapters/outbound/sqlite/memory/**、migrations/014-memory.sql、tests/contract/private-memory/**；实现本域表/条件/六用例/上述Hooks与Facts，不复制配置/Run/Attempt/Group状态机。 |
| T15后续owner | 原global三层/015/global-memory tests，T01另注册下个版本及两API；T14只预留形状，T15两方法/提案召回在本阶段均false。T17只接遍历合同，不宣称清除实现。 |

阶段顺序：

1. Root在T10交回后复核真实schema/Registry/CP，冻结本附件的API/Memory输入、Hooks、预算族、事实/水位与014表键；先原owner范围/DAG开窗，T01串行纯DTO/schema，T14与T12可并行非重叠编辑。
2. T14先公开private add/correct/pin/forget/status真实SQLite切片，T04/T05补同门；T03与T14一次冻结completion→admission→prepare→commit，T08 common接实际纯输入（不先空实现厂）。
3. 真实loopback SDK同Executor维护→新revision→下一聊天实际HTTP的召回/费用闭环；随后独立数据/并发/恢复最小矩阵。所有新表/复合hooks最后统一冻结，Root授唯一重窗。T15另按proposal确认开票，不扩大本准备任务。

## 9. 最小红→绿 consumer（全部 not-run）

只列比099更精确的接缝断言，不重复18行总矩阵：

- **默认状态/CAS与无隐式写**：空namespace list/get显示enabled=true/eligible=false/维护额度原因且DB无新namespace写；正常聊天成功outbox1/提炼HTTP0；公开显式预算后同一个pending completion才可bound新Run。private add/correct/pin/forget双CAS只一成功，旧epoch/改payload回执冲突；固定冲突只candidate，apply_candidate实际用户选择。T15两个方法及proposal分支仍false/明确不可用。
- **可信账户族**：普通Run造Purpose=maintenance/他jobID拒绝；真实job绑定中用summary/retry仍只扣maintenance+Profile，不生成/借root账户；旧claim、跨Run RetryOf、另一Profile/account、公开pause介于Reserve/Dispatch callback0，原unknown不退款。必须捕获实际HTTP与SQLite account_id，不只fake Reserve次数。
- **真实模型上下文/CP**：A两线程、B私聊、group none/range、temporary哨兵；默认Registry真请求只含实际Entry/Intent各一次，维护空Tools、候选严格解析同Finalize；CP篡改绑定/Mode/引用/正文无新HTTP。Memory=nil旧Chat2768-byte样本字节和Responses已验历史仍兼容，不能“更新golden”迁就；带Memory的实际note CP重开独立核currentref，运行中forget后下一POST0/结果bodyfree。
- **提交与双防复活**：完成正文/outbox/Run受理/新pin任一statement/commit错均同Tx不半发布；correct/forget介于生成与Commit，旧callback不能写；同旧origin新job/新hash仍抑制，source独立控制可继续；用户明确add为新独立意图。普通user原文字无memorydeps仍可历史读取，private result/群公开assistant副本须失效传播。
- **实际物理页/关闭/恢复**：真实stdio queued memory页→forget/correct提交后原body不出帧，mixed batch同ID多个proof不漏，expiry无clock也拒；旧800/250ms完整控制。真实维护HTTP Dispatch后kill/Wait：原账/Run/job/config保留、无CP blocked；同树闭门不挡其他accepted。Close持久Stop失败仍同步闭门且等实际SDK/结算/Memory调用，后台callback不能新提交。每个HTTP/Core/子进程失败路径也实际Wait。

产品权威已定（自动私有/人工全局、true默认+零未配HTTP、统一Engine/权限/恢复），无需新增用户审批；页/输入字节界、keyset32、一轮一个维护根及内部background capacity=1、虚拟默认元数据和旧CP绑定块是本候选的可复核实现选择。读取期间Root已由Map28/Goal27转Map29/Goal28并开启T10；118仅给protocol.go加三个Anthropic literal、registry.go加精确tuple，StateView/Generation/CP未变，见sources中的已知漂移。不得把本准备称最终产品冻结，T10后须重核装配/注册/版本。T14/T15/T17仍未实现，本附件不推进Ticket/Goal或任何模型质量/现场验收。
