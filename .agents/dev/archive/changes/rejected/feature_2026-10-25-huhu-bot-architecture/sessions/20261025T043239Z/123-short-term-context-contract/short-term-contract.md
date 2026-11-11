# 123：短期上下文与摘录式工作摘要合同 v1

**以下新增类型、方法、表列、UI投影及消费者全部为候选 / not-run。产品未写、T14未激活。** 本附件只补115，长期记忆的默认开启、额度零、维护账户族、忘记/修订/全局确认、生命周期仍按115；不修改115历史工件。事实指纹与读取范围见[sources.json](sources.json)、[来源索引](sources.md)。

## 1. 现存链路与唯一推荐

Spec §5、AC-018、ADR-024及DESIGN BOT-MEMORY为权威。当前真实链路为：

```text
Claim：真实Run/config/线程inbox/DelegationInput
  → Executor.PrepareContext：显式Host资料原文（当前最多256KiB）
  → direct.ModelHistory：最多一页20条；群经none/range/成员代筛选
  → 合并真实Sources/Scopes/Grant/Derived → MarkRunning同Tx
  → common：Persona → History → 显式资料 → inbox → 委派要求 → 当前Intent
  → 同Driver/Attempts → CP → DB资格/纯Inspector → 用户恢复
```

- direct.History按seq倒序取limit+1，返回页重新正序；含512KiB页预算。ModelHistory按当前接收方read/send和lease过滤，优先保留最新整条，来源额度不足整条跳过；不追NextCursor。Executor使用limit20。**这是既有选择，不是已实现压缩。**
- 子执行不读目标Bot私聊。Claim的MessagesInTx只读本to_run_id/principal，最多100条/256KiB，并已实际消费来源/私有贡献；DelegationInput从本Run的真实关系读取完整materialized Task/constraints/expected。当前没有独立工作摘要、压缩阶段、摘要模型调用或可查询的实际初始prompt manifest。
- common CP初始前缀当前只独立绑定Persona/accepted Intent，filtered历史正文没有DB独立冻结基线。Chat v1精确DTO及Responses/Anthropic v2 sidecar已有兼容义务；本准备不把缺新功能称当前安全漏洞。

**唯一首版路线：同一准备流程中的确定性摘录压缩，无额外模型请求。** 新Run的近期历史保留整文，较早的已授权消息生成带原引用、UTF8字节区间、遗漏标记的摘录式工作摘要。它减少输入字节但不声称语义概括、事实抽取或完美记住全部历史。先资格过滤，再选择，再摘录；没有第二摘要引擎、后台短期作业、Probe或新账户。不能只把limit20改名“压缩”。

本路线不实现生成式摘要。以后若另行选择生成式压缩，必须新增真实阶段/CP恢复、同Run summary子用途、原root/Profile账户和每HTTP Attempts；不能调用115的maintenance账户。该未来能力不计入本合同通过条件，也不称现有。

## 2. 输入分层、隔离和明确界限

### 2.1 不压缩的控制输入

- 当前accepted Intent完整保留并最后追加一次；direct当前user_message_id从历史候选剔除。已materialized的委派Task就是Intent，不再次作为摘要正文追加；constraints≤32×2048、expected≤8192的原独立界限、Task≤128KiB保持，不能加新的合计128KiB收紧旧200KiB合法输入。
- 原Persona、Tools、完整Delegation要求、显式PreparedContext.Sources和continuation的已持久Decision/Children保留。显式Source仍固定原身份/revision/hash/lease，不从摘录请求读全库，不压缩附件来偷偷改用户意图。
- 本次Claim已经返回/消费的当前to_run_id inbox为必需输入，沿原100条/256KiB上界保留全部正文和问答身份，不用摘要删除未答问题、用户补充或取消信息。若某条正文逐字等于accepted Intent，使用`intent_alias`只发该消息元数据并指向末尾Intent；仍保留原消息hash/资格，不把hash改为空文本hash。这保持现有common避免重复Task的意图，不按相似度删消息。
- inherited/effective资格是已消费闭包，不因本次摘要选择较少而缩减。必需输入或既有来源并集超限明确拒绝，不截正文、来源或旧依赖换成“成功”。

### 2.2 可选择的历史窗口

唯一namespace键为真实`profile/principal + subjectKind/subjectID + SessionID + WorkThreadID`；所有值从Run/config/真实关系产生，wire/模型不能指定可信namespace。

- direct根：只读本Agent、本Session（workThread=Session）的conversation_messages。
- 工作线程：可读本实际执行主体/本workThread此前Run的合法thread消息；只取真实该线程、原to_run属于同主体的记录，不按AgentID扫所有线程。每条仍以当前Run recipient/task/父范围重新read/send；不能借以前recipient或原Grant的TaskID。
- group：候选仍通过当前真实member incarnation/historyRevision及现none/range/join_seq谓词。只取公共transcript，不扫成员私聊/记忆；已经published正文与私有contributors继续按现区别检查。temporary仅通过其实际GroupBinding取得已授群范围；这不授Sponsor私聊/长期库。外部existing未获群成员历史资格仍没有默认群页。
- temporary：自己的随机subject/独立thread，不用SponsorID替代私有上下文namespace。Sponsor只是已验证配置/资格事实；不能继承Sponsor短期或长期库。
- 已在当前inbox、当前Intent或真实delegation.context_json中materialized的同一原消息引用，从可选历史剔除；是按真实OriginKind+ID+body revision去重，不用正文相似度/只按hash去重。跨消息同字不表示同一个来源。

内部candidate分页：每页20个metadata记录，最多3页/60个；conversation按(seq,message_id)，thread按(created_at,message_id)稳定keyset。cursor只在本次准备内使用，绑定实际namespace/水位，不成为公开读取能力。先读有界metadata/真实provenance→当前授权→读取合法正文；单正文≤128KiB、累计读取≤512KiB。达到边界不继续扫库，标记WindowLimited；不为凑满20个合格项无界越过被拒页。只过滤115/原T05已列明的可预期业务拒绝，未知错误/坏JSON不当成缺项；不向模型或UI暴露被拒候选的ID/数量/正文。未返回或未读取的行不生成Derived。

对已授权、实际读出的可选候选，按最新优先执行：

1. **recent整文**：最多8条，每条≤8192 bytes，合计≤65536 bytes；放不下的整条转入下一步，不切出伪“完整消息”。
2. **working_summary摘录**：其余较早候选以及过大的近期候选，最多32条，总原文字节≤32768。正文≤1024 bytes时完整引用；更长时取首≤512和尾≤512 UTF8完整码点字节，区间不可重叠，按原顺序渲染，中间明确`[… omitted …]`。不拼造结论、不删除partial/失败标签。只在实际缩短时标representation=excerpt。
3. 总Entry/来源预算始终受原Derived≤128、Sources+Scopes≤32、GrantIDs≤64、Group tuple≤100限制。必需输入先占预算；可选候选的完整引用/来源若放不下，整条省略并记录安全计数，不保留文本却丢provenance。旧ModelHistory当前较窄Grant集合选择不是放大权限的理由，新增路径仍先通过T05全部规则。

当前inbox之外可选body最多96KiB；一个新ShortTerm数据块的规范JSON≤393216 bytes、持久无正文manifest≤262144 bytes。必需项导致越界为RESOURCE_LIMIT/CONTEXT_INPUT_LIMIT，不能悄悄删问答。可选项在完整Entry边界裁减至限制。所有界限是UTF8/实际JSON bytes，不是UTF16长度、字符或token。实际SDK最终HTTP1MiB、输出、CP1MiB、Tools/Persona等外层限制继续权威；独立子预算不保证任意最大值组合都适合模型。超最终请求边界应在Reserve/Dispatch前明确拒绝，不能截Intent/Persona或暗换模型。

## 3. 唯一纯类型、hash与模型渲染

拟由T01在`application/api/context.go`单写（不存在；不含sql/SDK）：

```go
type ContextNamespace struct {
    SubjectKind, SubjectID, SessionID, WorkThreadID string
}
type ContextTextSpan struct { Start, End int } // 原正文UTF8字节，半开区间
// Message仅为inbox的固定原元数据，Text必须空；正文只在Text/Intent里出现。
type ShortTermEntry struct {
    ID string                        // seal时服务器分配的不可复用entryID
    OriginKind string                // conversation_message | thread_message
    Ref DerivedInput                 // 原完整正文hash/稳定body revision，不是摘录hash
    Use string                       // inbox | recent | working_summary
    Role string                      // user | assistant | data
    Representation string            // full | excerpt | intent_alias
    Message *AgentMessage            // inbox required，others nil
    Partial bool
    Spans []ContextTextSpan
    Text, TextHash string             // 实际片段/拼接结果及sha256(Text)
}
type ContextUsage struct {
    PolicyVersion string `json:"policyVersion"`
    Selected int `json:"selected"`
    Excerpted int `json:"excerpted"`
    OmittedAuthorized int `json:"omittedAuthorized"`
    WindowLimited bool `json:"windowLimited"`
}
type ShortTermInput struct {
    Version string                   // "1" / policy extractive-v1
    Namespace ContextNamespace
    IntentHash string                // sha256(accepted execution_runs.intent)
    Entries []ShortTermEntry          // 最终真实模型顺序
    Usage ContextUsage
    BindingDigest string
}
func CanonicalShortTermBinding(ShortTermInput) (string, error)
func RenderShortTermInput(ShortTermInput) (string, error)
```

`EngineInput.ShortTerm`、`RecoveryInspection.ShortTerm`、`CheckpointInspection.ShortTerm`均拟为`*ShortTermInput`。`Run.ContextUsage *ContextUsage`是安全可见投影，不含正文/来源ID；只从已提交manifest读，不让Engine事件自报。nil表示legacy无独立manifest路径，新路径即使没有候选也用非nil+Entries=[]，明确“实际空”。orchestration/application-only根不调Engine、不制造A的上下文。

hash规则：

- 原Ref由可信reader从实际表/完整body构造。conversation和thread消息分开OriginKind；各自body不可变时Revision="1"，不能把thread消息可变投递status revision冒充body revision。namespace/WorkThreadID取实际存储事实。
- `full`要求一个[0,len(original)) span、Text==original、TextHash==Ref.Hash。`excerpt`先校验完整原文sha256等于Ref.Hash，再核合法/非重叠UTF8 spans、逐字重建Text；Text由各段原字节按固定遗漏标记拼接，TextHash与原Ref.Hash分开。不能将摘录hash写回Derived.Hash，也不能因删除后只剩摘要而继续授权。
- `intent_alias`要求该原消息完整body逐字等于accepted Intent，Text为空、spans=[]、TextHash为空串的sha256；原Ref.Hash仍等于IntentHash。模型只看到别名元数据，末尾Intent仍完整。不是没有依赖。
- CanonicalShortTermBinding按声明顺序的专用无map结构对Version、Namespace、IntentHash、每Entry全部字段（含ID、Ref、固定metadata、spans、TextHash，不含Text）、Usage做UTF8 json.Marshal后sha256小写hex；忽略传入BindingDigest。Entries顺序保留，重复OriginKind+ID+revision拒绝；同一真实ref key若hash/namespace/WorkThreadID矛盾为CONTEXT_INPUT_STATE_INVALID，不能first-wins去重；所有nil/空分支在helper中规范且由正负样本固定。Text必须独立核hash及原spans，不能仅信声明的hash。RenderedBytes实际验证上界，不从hash推token。
- RenderShortTermInput只渲染固定版本标记`HUHU short-term context v1\n`和规范数据JSON：Scope、Usage、每条真实ref/role/partial/representation、选中Text及inbox元数据；明确“摘录不是新事实，遗漏处不推断”。数据始终是user data消息，不能形成额外system指令。

新路径common不再遍历EngineInput.History/Messages把同一body送第二遍；它们必须由实际Repository置空（非空且ShortTerm非nil为CONTEXT_INPUT_STATE_INVALID）。新消息顺序固定：Persona→原显式PreparedSources→原完整委派要求→ShortTerm固定数据块→115 Memory固定数据块（如有）→accepted Intent。原legacy nil路径保持原initialMessages完整顺序/字节。此顺序使Memory仍是Initial-2，ShortTerm在其前一项；没有Memory时ShortTerm为Initial-2。

## 4. 实际同Tx与事务外调用顺序

在115既定`PrepareAndMarkRunning`与同一Repository内实施，不新增调度器。为把新增Memory/历史来源的Host身份检查放在SQL之外，**将115唯一MemoryHooks的PrepareInTx替换为以下Plan/Seal两阶段**；其余completion/admission/commit/output/ReadInput签名不变。不是再并行增加第二个Prepare或摘要repo。同一T14 Store实现这三个方法；T03声明adapter内部类型，sql.Tx不进入Application API。

```go
// Proposed in sqlite/execution/context.go; embedded in existing MemoryHooks.
type InitialContextPlan struct {
    ShortTerm *api.ShortTermInput
    Memory *api.ExecutionMemoryInput
    Access api.RunAccessInput       // 完整并集，不能缩减inherited effective
    Derived []api.DerivedInput
    Watermark string
}
type InitialContextHooks interface {
    PlanInTx(context.Context,*sql.Tx,api.ToolExecution)(InitialContextPlan,error)
    SealInTx(context.Context,*sql.Tx,api.ToolExecution,InitialContextPlan)(InitialContextPlan,error)
    ReadContextInTx(context.Context,*sql.Tx,api.RequestIdentity,string)(*api.ShortTermInput,error)
}
// Existing SetMemory(MemoryHooks) injects this same Store; no second setter.
```

精确顺序：

1. Claim按原slot/claim/取消/恢复屏障取得Work。当前inbox已经实际消费的来源/私有贡献保持；完成应用根按原CompletedResult分支终结。若已有seal（Resume或重复准备），读取该同一ShortTerm/Memory，不再选择当前历史。
2. 新Run事务外原PrepareContext只读**原明确附件**，保持当前身份/hash/lease规则。短Tx A中PlanInTx只读：核真实claim/namespace，先当前授权后读取有界消息，构造ShortTerm；再按115选择Memory并精确去重。仅相同Origin+Ref+正文的输入不双发，不能因共享祖先/hash相同删不同memory revision的正文。它返回完整Access/Derived、候选与watermark，不写已消费依赖、entry、running或manifest。
3. Tx A关闭后，原ContextAccess.AuthorizeAdmission验证规划完整Access，含新Memory/历史的当前lease；必要的Hash核查使用原资料接口，但**不能因此把所有历史Host原文加入PreparedContext**。模型仍只有原附件、规划ShortTerm及Memory正文。网络/Host/SDK不在SQL事务。
4. 短Tx B中SealInTx重新核同claim/取消/恢复、全部真实选择/ref/hash/spans、Memory settings/head/forget及来源水位。Plan的Entry.ID为空；Seal在同Tx分配一次真实entryID并据此计算binding，水位比较按原对象/选择顺序，不用新随机ID比较源变化。只能确认A的精确计划；不得增添一个尚未经事务外授权的新来源。变化返回CONFLICT/CONTEXT_PLAN_CHANGED并全Tx回滚，允许原准备阶段在有界重试内从A重做（至多一次；再变化body-free失败，非新HTTP）。未知SQL/I/O/坏JSON原错误保留。A固定历史upper key，新到达该key之后的消息不倒灌本轮选择。
5. 同一个Tx B消费完整依赖、写一份sealed initial manifest/entries、更新effective/lineage/Run.revision并调用唯一markRunningInTx，一条`context.selected`事件只记安全计数。任何statement/commit失败整体回滚，无半manifest/假running。必需旧依赖不被可选选择删掉；Memory binding仍按115独立算法，Entries去重先于绑定。返回的新Work承载实际ShortTerm/Memory，History/Messages清空后才绑定Engine。
6. 后续HTTP的Reserve/Dispatch、动态tools.get/list、Messages/result消费、AppendEvent/Finalize和物理投递仍从DB读当前完整effective。工作摘要只改变表示，不缩依赖。已经消费的源/Grant/Group/forget失效则阻断后续callback/body-free终结，不悄悄删条继续生成。

新来源/失效检查沿115 MemoryFactsReader增加实际context-entry关系；T14只本域/来源关系，T05核原read/send/Grant/Group/parent/recipient，不相互递归。纯摘录无需模型summarize额度，不能为它创建model_attempt或收维护费用；原Host操作授权仍照旧，绝不通过压缩放宽read/send或全库范围。所有pure helper由Executor原ctx/Stop/Done覆盖，无新goroutine或生命周期。

## 5. 014、纯CP和恢复

不另建短期“记忆事实”、summary job或第二输入库。扩展115拟`memory_run_contexts`同一run_id唯一行：policy_version、manifest_revision=1、sealed、short_term_json（只含ref/span/metadata/hash，**无重复body**）、short_term_digest、memory_manifest/原binding；新增`memory_context_entries(entry_id PK,run_id,ordinal,origin_kind,origin_id,body_revision,hash,representation,spans_json,metadata_json,UNIQUE(run_id,ordinal))`供精确失效/投递反查，可用既有dependencies承载相同索引而不物理重复表。首版选独立entries表，以免遍历JSON授权。初始行和entries只在同MarkRunning Tx提交，不对纯查询建manifest。

014仍由T14写正文，T01串行注册；当前Ordered=9，若实施前无别迁移则实际Version10，绝不注册14。原SQL不改。entries保留原source依赖和reverse索引，不存独立摘要body；摘要按已固定spans/原source重读恢复。T17必须遍历run_contexts/entries/dependencies/CP及受管备份；原source正文删掉后context为redacted/不可恢复，不能因为还有CP/摘要片段就当可继续。forget逻辑失效与物理擦除继续分开。

- T03 ReadRecoveryInTx从真实DB读accepted Intent、原config/position和同一sealed ShortTerm/Memory；原记录缺或hash/spans/namespace错为CONFLICT/CONTEXT_INPUT_STATE_INVALID，不能降为legacy。物化后source不存在为受控不可读/blocked，SQL/I/O/坏JSON原错误保持，不泛吞为“无上下文”。
- Broker只透传两pure输入，Inspector不碰SQL/Provider/Host/model。common Run/Resume/Inspect走同一个validator，重算ShortTerm digest并逐字核CP固定数据块；对Memory继续115比较。新前缀原accepted Intent/Persona仍独立核，不拿CP自报内容当基线。new continuation不追最新History或把后来inbox塞回旧prefix；新answer/child结果通过原固定Decision/程序位置进入后缀，实际后读消息由原工具事实进入effective。
- 保持CP外层Metadata/EngineVersion和Chat v1/Responses/Anthropic v2 DTO/顺序不变；仅新带ShortTerm的数据块不同。**旧数据库无context行且新特性未启用的旧Run**走nil legacy分支，旧2768-byte Chat及两协议真实CP不得更新golden。需要区分新Run应有manifest而缺失：014增加执行侧`context_policy_version TEXT NOT NULL DEFAULT ''`，只在新受理的普通模型执行Run标`extractive-v1`（orchestration/application-only不标，115 maintenance分支仍按自身Memory manifest，不启用短期历史）；T03单一writer在受理Tx写标记，markRunning必须有完整seal。legacy默认空不回填虚假历史。
- 在运行前崩溃的accepted/preparing恢复按原T16；已发HTTP无完整CP仍blocked，不因能重建输入自动重播。新Run有合法CP但原manifest/source改变则blocked；恢复资格水位加入本树实际context policy/digest/entries及115 memory有效代，不扫全Profile。第二短Tx、用户CAS/generation、最终Dispatch再查。Decision/结果唯一性、原Run/newclaim/unknown费用完全不变。

## 6. T24可读的实际“本轮上下文”

DESIGN要求三个入口及每条内容/来源/修订/自动人工/作用域。**复用同一Memory API，不新增wire方法**：只给115候选窄增Kind=`context`及`MemoryObject.Context`；memory.get以ID=真实RunID，list以namespace+Scope(session/work_thread)列实际manifest，默认20/最多50及115页字节界。用户owner可查询，模型工具不提供该管理接口；temporary从任务详情用actual temporary namespace+RunID，不映射成Sponsor Bot页。

```go
// Proposed additions to api/memory.go, not new method family.
type ExecutionContextEntryView struct {
    ID string `json:"id"`                 // actual context-entry ID
    Kind string `json:"kind"`             // intent | inbox | recent | working_summary | memory_recall | attachment
    Representation string `json:"representation"` // full | excerpt | intent_alias | metadata
    State string `json:"state"`           // readable | redacted
    Text *string `json:"text,omitempty"`  // absent iff redacted or attachment metadata
    Source *DerivedInput `json:"source,omitempty"`
    SourceRefs []SourceSnapshot `json:"sourceRefs,omitempty"` // only currently readable labels
    Revision string `json:"revision"`     // immutable entry/body revision, not tree CAS
    Reason string `json:"reason,omitempty"`
    ContentHash string `json:"contentHash,omitempty"` // 整条实际rendered Text的hash
    SourceSpans []ContextTextSpan `json:"sourceSpans,omitempty"`
    DisplaySlice *ContextTextSpan `json:"displaySlice,omitempty"` // rendered Text的UTF8偏移
    PartIndex int `json:"partIndex,omitempty"`
    PartCount int `json:"partCount,omitempty"`
    CreatorKind string `json:"creatorKind"` // user | agent | temporary
    PreparationKind string `json:"preparationKind"` // explicit | selected | automatic_extractive | memory_recall
    Provenance string `json:"provenance,omitempty"` // memory原observation/inference/user，不改写
    Scope MemoryScope `json:"scope"`
    Partial bool `json:"partial,omitempty"`
}
type ExecutionContextView struct {
    RunID string `json:"runId"`
    RunRevision string `json:"runRevision"`
    ManifestRevision string `json:"manifestRevision,omitempty"` // "1" when sealed
    State string `json:"state"`           // pending | sealed | redacted | legacy_untracked
    Reason string `json:"reason,omitempty"`
    Namespace MemoryNamespace `json:"namespace"`
    Scope MemoryScope `json:"scope"`
    Usage *ContextUsage `json:"usage,omitempty"`
    Entries []ExecutionContextEntryView `json:"entries"`
    NextCursor string `json:"nextCursor,omitempty"`
}
```

- `MemoryQuery.Kind=context`要求Scope明确session/work_thread；沿namespace/principal真实权限，只列该范围实际Run，不按AgentID列其他线程。get校验Run实际namespace；Kind字段与Context恰一pointer，其他item/candidate/job/proposal/settings字段禁用。无需改115长期MemoryBody或让context进入召回/index/pin/correct/forget/auto-write；这些写方法收到context明确CONTEXT_READ_ONLY。
- 新accepted尚未准备：pending/CONTEXT_NOT_PREPARED，Entries=[]；不是“模型输入为空”。旧Run：legacy_untracked/CONTEXT_MANIFEST_UNAVAILABLE，不能用现History反填伪造当时输入。orchestration根不属于任何Agent模型输入，T24依据Run.Role显示“无模型输入”，不拿A的namespace查询或制造A费用；查询要求不存在的Agent上下文明确拒绝。
- sealed投影只按实际初始manifest/当前可读source重建，既包含已用recent/inbox/working摘要，也标明真实recall的memory revision及原用户Intent/附件标签；不另读History拼页，不显示未入模型的候选。Intent从原执行行读且hash核验；附件仅发送时可读label，不从Host抓正文。late工具输入不是初始prefix，若T24需要展示，明确单列115已消费effective记录，不能无依据插入初始有序表。
- “自动/人工”是实际来源创建者与**automatic_extractive选择方式**，不是用户确认/长期事实。excerpt始终显示原对象revision/hash、部分选取与作用域；UI可按Source打开既有来源接口，但不自己拿摘要当原文重算hash。Memory recall保留自身observation/inference/user来源，不因被选择改为extractive事实。
- 当前失效逐条redacted stub只保本Run内安全entryID、kind、state/reason、scope；无旧Text/Hash/SourceRefs或外人身份。原用户Intent独立，不因一个memory/context entry撤权抹掉所有用户文字；已经消费此项的Run仍受完整资格屏障，UI可读残留与恢复可执行不是同一问题。
- 为精确物理dequeue，T01/T04 server-only DeliverySubject新增`context_entry`，ID=实际entries表对象，不是runID+任意client ordinal。可读Intent/attachment/recall投影也各有实际entry行并关联各自本域资格；T14 ReadFactsInTx增加该Kind，当前字段/来源/抑制精确复核。payload内的readable正文都绑定subject，metadata-only stub无正文subject。query后forget/revoke/delete在同一WithReadFence提交后旧页不得出正文，重读可得stub；不用整个Run的所有依赖遮住独立合法用户原文。
- list/get遵守115页预算；**MemoryGet窄增`Cursor string`、`Limit int`仅kind=context**，View有NextCursor。context list只给每Run安全摘要（Entries=[]），get按实际entry ordinal分页。单条可读Text再按UTF8完整码点切成≤4096 bytes展示片段，保同一entryID/ContentHash、Source原hash及SourceSpans，DisplaySlice是rendered Text的半开区间；PartIndex从0、PartCount固定，UI键为ID+PartIndex。这只是显示分页，绝不改变实际模型输入或原Ref.Hash。每页1..50片段/默认20及≤262144编码bytes，完整片段边界停，不丢后续；redacted只一个无body stub、不带hash/片段数。cursor绑定Run/manifest digest、namespace/principal/scope、资格水位和(entryOrdinal,displayOffset)；其他kind禁止Cursor/Limit。不能用“单entry太大”让合法128KiB Intent永远无法读，也不能以只显示首片段假称全文。T01统一schema/fixtures/api.ts，T24消费真实分页。

## 7. 最小原owner写集请求与顺序

均是待Root开窗请求，不是本轮写权；根为native/huhubot，123没有写产品。

| owner | 精确路径/职责 |
|---|---|
| T14新owner | `domain/memory/private/`的纯extractive选择规则；`application/memory/context/`（纯planner+安全view），`adapters/outbound/sqlite/memory/`（同Run candidate reader、seal/read/entry资格投影），`migrations/014-memory.sql`及`tests/contract/private-memory/`；只补本附件，长期方案复用115。 |
| foundation_go T01 | `application/api/{conversation,recovery,events}.go`、拟`context.go`及115拟`memory.go`；Run.ContextUsage和两个Inspector参数、Kind=context/严格query分页；原HAP memory路由/stdio批subjects，contracts唯一生成、`src/modules/huhubot/api.ts`；无新SDK/依赖。 |
| foundation_go T03/T16 | `application/execution/executor/{ports,executor}.go`，`sqlite/execution/{store,executor,children,groups,recovery}.go`与拟`context.go`；各受理路径同Tx标新policy、同一PrepareAndMarkRunning、完整provenance、ReadRecovery原manifest；`sqlite/recovery/{snapshot,commands}.go`水位；Broker `application/tooling/broker/recovery.go`只透传pure ShortTerm，无Host/SDK。 |
| credential_provider T05/T11/T12/T13 | `sqlite/{grants,usage,groups,collaboration}`原115列出的实际message/历史/consume落点；只按新reader真实来源事实接现权限，不改Grant规则，不因工作摘要开maintenance binder，不复制Run/slot状态机。新thread历史只允许当前实际subject/thread+原消息授权。 |
| credential_provider T04 | `sqlite/events/store.go`及events应用接口，处理context_entry与原memory subjects分类/批deadline；原800/250ms热路径需独立控制，不做每项N+1。stdio仍T01 owner。 |
| engine_adapter T08共同层 | `eino/common/{engine,checkpoint}.go`：新ShortTerm block/legacy分支、readState相同DB输入验证；三协议driver预计无改动，均已有有界message映射/真实Attempt。若实际consumer需改SDK桥再给具体证明，不为上下文先重写协议。 |
| T24客户端owner | 在原记忆页实际写集消费同memory.list/get(context)，本轮/temporary链接及redacted/pending/legacy/分页/摘要标记；不从History推导模型实际输入。不得在本准备中造新manager/UI。 |

顺序：T14实施派单时先以T10最终已验源重核本附件→T01纯类型/014唯一版本与owner精确窗口→T14 planner+context read真实SQL→T03同UoW+common真实SDK输入→memory去重组合→T04物理页/恢复/旧CP控制→T24消费。没有需要再次向用户要默认/额度/权限批准的产品决定；技术签名/界限由Root在正式派单前统一接纳。

## 8. 最低实际消费者（全为 not-run）

| 候选消费者 | 真实入口与必须断言 |
|---|---|
| C1 隔离/无新增费用 | public API建A两Session/两thread、B、temporary和group none/range哨兵；默认三个Registry真实loopback请求只含本范围。原Intent/requirements/Persona/显式Source完整且各在指定位置一次；纯压缩总HTTP仍是原一次、没有summary/maintenance attempt/job。 |
| C2 明确压缩 | >20历史、超8192大消息、含中文/组合emoji/控制字节；分页最多3×20、recent/working各界限、真实首尾spans和两hash验证、明确遗漏/WindowLimited；完整ref来源不丢。空合法上下文与pending/legacy未跟踪不同。 |
| C3 必需与失效 | 当前question/reply用户补充不被摘要吞掉，to_run≤100/256KiB原边界；Grant/Sponsor/Provider/group代变化先过滤；实际已消费后撤权/forget下次Dispatch0/bodyfree终结。未知SQL/坏JSON/hash矛盾不当成可过滤业务失败。 |
| C4 Memory组合 | 相同Origin+Ref精确body不双注入；不同memory revision即使共享祖先不误删，祖先provenance完整去重；work摘要不变长期item、不触发completion/maintenance自循环；Maintenance模式继续115固定输入、不扫历史。 |
| C5 事务/Stop | seal/entry/lineage/running任一statement及commit故障零半提交/零HTTP；资料两阶段之间改水位拒绝；重复Prepare复用同seal；真实Stop持久失败仍同步闭门，原Done实际排空，无新shortterm worker。 |
| C6 CP/恢复 | 新ShortTerm真实note/children CP→kill/Wait→原Run/CAS/gen恢复；恢复前插新历史不改变初始block，篡改Ref/span/body/digest/namespace/Intent拒绝0HTTP；source删除/forget blocked。原unknown不退，已发无CP不重放。nil旧Chat2768字节+Responses/Anthropic已验CP原bytes/metadata/Inspector/Resume不变，不更新golden。 |
| C7 DESIGN实际页/物理门 | 真实memory.get/list(context)与SDK初始block逐Entry同ID/hash/顺序；大manifest entry分页不漏，owner/namespace/cursor篡改拒绝，temporary不冒Sponsor。query后撤权/forget→真实queued stdio页旧正文不出、stub无正文；旧legacy只能明确未跟踪，不能展示当前History冒称实际上下文。 |

以上没有执行、产品能力没有改变。仅本123来源/链接/结构校验可执行；不以候选矩阵替代红绿、T14验收或现场模型质量。
