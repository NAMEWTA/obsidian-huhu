# T05 Go 资料交集授权实现候选

Session: 20261025T043239Z
Task: 027-access-implementation
Status: completed

## 聚焦交接

T05 Go 自有切片已完成并停写，交回代码候选。真实 Facade / SQLite 验证两份明确资料、第三份前置零读取、同主体两个入口、幂等/CAS、撤权、接收方与父范围、Host lease、来源正文校验和用户历史过滤；真实 Go bootstrap/stdio ↔ 生产 TS HapConnection/HostReadService ↔ Engine 捕获器验证了实际模型输入、换 endpoint 后的历史外发过滤、Unicode 选区和应用层搜索分页。最终定向 suite、race、vet、架构检查全部 exit 0；本任务 Node / Go 子进程已 Wait / exit，临时 Profile、bundle 与管道已清理。

工作区 `/home/wta/orca/workspaces/obsidian-huhu/bot`，branch `NAMEWTA/bot`，base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。作者仍为 `/root/credential_provider`；沿用原派遣 requested model `gpt-6.1-sol/xhigh`，不把偏好冒称工具独立鉴定的底层模型。已完整回读TASK、031预检、Map9/Goal8、T05与相关Spec/ARCH/ADR、dev和I执行规则；Map10/Goal9仅增加028的固定schema计数维护，已回读增量，不扩大本写集。

本任务只写10个下列源码/测试文件及027日志/报告，未写原T02凭证、API/schema/TS/CLI/bootstrap/迁移注册/Go锁/工程产物或正式状态，没有派遣、提交、推送或发布。026统一维护共享接缝，028维护可信来源与TS路由。completed 不是T05正式done，也不替代独立双轴复审、Lead联合验收或原复合AC的后续消费者证据。

## 产物与验证

### 接缝与行为

共享owner先实际冻结 `api/access.go`：严格 SourceSnapshot 绑定 resource/kind/workspace/originClient/originView/hostConnection/hostLease/epoch/revision/hash，selection.range为原文UTF-16 offset，scopeResourceIds为Host注册的opaque祖先handle。SourceScope是明确捕获的folder/vault范围，仅可用于有限搜索；默认不取得这些范围。普通客户端或模型不能在JSON自封Principal、Host或ParentScope。

Grant持久绑定Profile/由连接注入的principal、workspace、source/folder/vault的精确opaque resource、operations、typed recipients、可选Session/Task、active/revoked状态、revision和expiry。typed recipient逐字段匹配真实Bot/固定model revision/provider/model/protocol/endpoint，不以名称、credentialRef或路径包含关系授予权限。新准入检查真实启用状态和head配置，已受理Run则核对真实run/session/principal/profile/recipient_json及该Run自己的pin token、agent/model/persona关联；不能借另一个Run的任意pin保留旧配置资格。历史读根据持久Run接收方与当前Grant判断，终结释放pin或停用Bot不会抹去仍合法的用户历史。

`005-grants.sql` 只由027编写，持久access_grants及其分页revision clock；026串行注册为实际Version4，003为Version3，旧001/002不改，不造空004。Create/Revoke沿用现有command_receipts和CommandMeta，Profile/epoch检查先于旧receipt，同key同输入返回同一Grant/Receipt，异输入冲突，Revoke有CAS。旧create回放返回当前revoked状态，不把旧active回执当现权限。分页游标绑定Profile/principal/Grant clock，状态变化后失效，重开仍保留撤权。

应用Context提供真实消费者窄口：AuthorizeAdmission、PrepareContext、AuthorizeRead、FilterHistory、FilterModelHistory、Search。SQL短事务不跨Host等待。准备上下文在全部来源前置授权后才调用Host；逐次读取前后重新查当前Grant、父Grant和本地lease，失败返回空PreparedContext。ParentScope不扩大Sources/Scopes，持久父Grant任一撤销或过期即拒绝，即便目标Bot有独立、更大的合法Grant也不能续权。该ParentScope为内部受信端口，T11的持久委派链不在本票实施范围。

用户历史FilterHistory只过滤明确权限/来源失效，整条Text及provenance一起剔除；SQL、持久状态损坏或其他内部错误返回失败，不伪装成成功空历史。FilterModelHistory使用本次Run的recipient/task/parent范围，加每条消息原Run持久GrantIDs/Scopes做read+send交集；UI可读不等于模型外发许可，换endpoint或失去send时整条正文/派生结果不进Engine。026将合法历史的实际Sources/Scopes/GrantIDs合并到effective集合，MarkRunning同一事务复核并持久化，Finalize以effective来源保存助手结果，后续撤权继续传播。027未跨写执行表或另建正文/授权库。

Host读取实际装配为 `context.New(store, readbridge.New(host))`。桥接核对完整快照、实际UTF-8正文hash、format/bytes、selection UTF-16长度及lease；同lease换resource/revision/hash/scope、截断或超大响应都不能进入Context。没有Go Vault filesystem fallback，opaque ID也不允许绝对路径成为读取资格。Host祖先关系由受管TS registry核对，不能只把客户端scopeResourceIds当授权。

Search入口最终为可选cursor的内部Port，实际透传HostSearchRequest.Cursor，不新增HAP方法。每页前后复核当前交集与lease，结果须在明确Sources或获准Scope内，有数量/总bytes/cursor限制。每个去重后的完整SourceSnapshot每页最多一次64KiB有界Read来验证整源hash，再核对UTF-16 excerpt；selection先减captured range.start，拒绝拆开surrogate。重复match不重复读；超过64KiB明确RESOURCE_LIMIT，truncated不能充当完整哈希证据。授权scope不会让PrepareContext自动搜索或读取所有文件。

### 永久行为测试与实际观察

`native/huhubot/tests/contract/access/access_test.go` 从真实产品bootstrap/Facade与隔离SQLite进入，仅外部Host为受控边界。测试名及主要观察如下，完整最终结果见[15-final-access.log](logs/15-final-access.log)：

| 永久测试 | 实际观察 |
| --- | --- |
| TestAccessFacadePersistsGrantAndOnlyReadsExplicitSources | owner/second同主体都只取明确两项；加入未授权第三项在任何新Host读取前拒绝，第三项0读取、0PreparedSource |
| TestGrantCommandsUseSharedReceiptsCASAndSubject | 8个同key并发只得同一Grant；异输入冲突；Revoke CAS仅一胜；回放Receipt一致、他主体无可见Grant、旧create不复活active |
| TestRevocationDuringHostReadDropsAllTextAndHistoryProvenance | Host阻塞时另一入口能提交撤权，证明未持SQL事务跨等待；迟到文本全部丢弃，派生历史Text一起移除，搜索也拒绝 |
| TestHostLeaseReplacementOfflineAndForgedPathsFailBeforeReads | 读取中replace使晚回执失败，旧lease不再次到Host；绝对路径在读前拒绝；detach后明确HOST_OFFLINE，不回退文件系统 |
| TestParentScopeAndConfiguredRecipientCannotBeExpanded | 父范围缺项、显式空父范围、DB不匹配endpoint及跨workspace均在Host前拒绝 |
| TestHostReceiptHashMismatchCannotEnterPreparedContext / TestHostReadSnapshotAndByteBoundsAreValidatedAtProductFacade | 错正文hash、resource/revision/hash/scope变化、truncated、超64KiB均返回空Context |
| TestInvalidPersistedGrantReturnsHistoryErrorInsteadOfEmptySuccess | 一次性DB中置入损坏expiry后返回GRANT_STATE_INVALID，不返回成功空历史；这是故障注入，未操作用户库 |
| TestRevokedParentGrantCannotBorrowSeparateTargetGrant / TestRevokedOrExpiredParentCannotBorrowMorePrivilegedBotGrant | 父撤权/过期后，即便另一个Bot拥有两项独立授权，子范围仍拒绝且没有新Host读取；expiry用隔离DB固定过去时刻，边界时钟另由领域测试覆盖 |
| TestDisabledAdmittedRunRetainsPinnedSourceAndReadableHistory | 真正StartRun paused持pin→disable→原Run仍可准备固定来源且History仍可读；新意图准入AGENT_DISABLED |
| TestSearchVerifiesUTF16ExcerptAndDeduplicatesSnapshotReads | 中文/emoji选区使用原文绝对offset，重复match只完整读取一次 |
| TestSearchRejectsUnverifiableExcerptScopeRangeAndOversize | 外来源、假scope成员、错revision、错excerpt、错UTF-16长度、surrogate拆分及超大整源拒绝，没有读取第三项 |
| TestGrantPaginationAndReopenKeepCurrentRevocation | 分页后撤权使旧cursor失效，Profile重开仍revoked/revision2 |
| TestFolderAndVaultScopesRequireExplicitGrantAndNeverAutoRead | scope-only Prepare不自动读；只有显式Scope+匹配Grant才能读/搜成员，仅自报祖先handle不够；有限scope请求实际传到Host |

领域 `TestGrantRequiresCurrentSubjectScopeAndRecipientIntersection` 独立验证主体、workspace、撤销、到期、Session/Task、operation、Bot、endpoint和model revision交集，领域仅依赖标准库。

`host_ts_test.go` 的永久 `TestActualGoTSHostPermissionsAndEngineContext` 使用生产Go bootstrap/stdio、实际SQLite、生产TS HapConnection与HostReadService；仅外部Vault有限registry和Options.Engine捕获器是替身，不另造生产进程管理器或协议。Node启动Go test-child进入 `TestAccessHostRunnerProcess`，它不是cmd/huhubot产品CLI本身；该child复用真实产品装配/双向stdio，Engine注入避免访问模型或keyring。028拥有实际ObsidianSources/Vault替身及现场probe，026另拥有真实CLI与完整聊天/事务回归，互不冒称。

最终[14](logs/14-go-ts-unicode-pagination.log)及[15](logs/15-final-access.log)的实际链路观察：twoExplicit=true，thirdReads=0，oneReads=1，twoReads=4，revokedHistory=0，disabledHistory=4，removedSource=true，endpointHistoryFiltered=true，unicodeSelection=true，applicationCursorPages=true。twoReads的4次为首次Prepare、移除旧来源后的Prepare，以及两页Search各一次去重完整校验；并非读取了4个不同资料。每页重复match仍最多一次整源Read，错误query/变更范围的cursor请求没有额外正文读取。

Unicode对照为原文选区range1..7、text=`😀\n乙😀`（换行是真实LF），query/excerpt=`乙😀`，回执原文range4..7，3个UTF-16 units / 7个UTF-8 bytes。Node crypto产生整选区UTF-8 SHA-256，Go读取与片段验证通过。换endpoint后无附件新Run仍可从UI读旧两条来源历史，实际Engine.History必须为空；停用后仍显示合法来源历史。撤权先使原来源和派生助手结果都从History移除，下一Run只用第二项并且没有旧历史混入。

### 红绿与失败保留

[01-policy-red.log](logs/01-policy-red.log)真实exit1：最初未执行交集检查，领域反例逐项失败；最小策略实现后[02](logs/02-policy-green.log)exit0。真实Core的首个[03-facade-red.log](logs/03-facade-red.log)在SQLite启动后因T05 Grants/Context尚未装配失败；026接入已落实现，完全相同命令/输入在[04](logs/04-facade-first.log)exit0，两份/第三份零读取观察随后扩展保留。

首批跨语言harness失败[08](logs/08-actual-go-ts-first.log)、[09](logs/09-actual-go-ts-diagnostic.log)保留：替身最初误用业务终态succeeded作为EngineResult，产品合同实际要求finished；[10](logs/10-actual-go-ts-green.log)文件名虽含green，实际exit1，为fixture用旧Session revision触发CAS冲突。修正fixture以真实Engine合同及实时Session revision运行后，[11](logs/11-actual-go-ts-current.log)exit0。没有将这些fixture错误当产品行为红灯。

[12-endpoint-history-red.log](logs/12-endpoint-history-red.log)实际exit1，失败停在移除旧来源/Search阶段，尚未走到目标endpoint分支；日志没有足够细节单独归因，不能把文件名当成已证明的endpoint越权反例。源码检查同时发现正常Search空Sources/Scopes会编码null而违背严格数组schema，已在实际应用构造口统一为空数组，后来[13](logs/13-go-ts-model-history-search.log)、[14](logs/14-go-ts-unicode-pagination.log)及最终全套通过。Root发现的历史只read却被外发风险，由026/027共同补独立model历史口和effective来源门；本报告不虚构修复前实际endpoint红灯。未删测试、放宽旧断言、吞掉失败或用skip制造通过。

### 最终命令与资源完成

Go命令cwd为 `native/huhubot/`，实际Linux/amd64，全部真实exit0：

| 命令 | 结果 | 日志 |
| --- | --- | --- |
| `go test -mod=readonly -v ./internal/domain/access/grants ./internal/application/access/... ./internal/adapters/outbound/sqlite/grants ./internal/adapters/outbound/hostbridge/read ./tests/contract/access -count=1 -timeout=60s` | domain0.004s；access1.290s，含实际Node/Go进程 | [15](logs/15-final-access.log) |
| 上述去-v、加-race、timeout90s | domain1.018s；access5.234s，实际child也随race binary运行 | [16](logs/16-final-access-race.log) |
| `go vet -mod=readonly ./internal/domain/access/grants ./internal/application/access/... ./internal/adapters/outbound/sqlite/grants ./internal/adapters/outbound/hostbridge/read ./tests/contract/access` | 无诊断 | [17](logs/17-final-vet.log) |
| 根目录 `node scripts/verify-huhu-bot-architecture.mjs` | 24 production files checked | [18](logs/18-final-architecture.log) |
| 所持文件 `git diff --check -- <paths>` | exit0；新增文件为untracked，另用逐文件内容hash固定，不把git空差异当实现证明 | [19](logs/19-freeze-diff-check.log) |
| 比较026共同冻结manifest中的全部10个本任务文件 | 完全一致 | [20](logs/20-joint-snapshot-check.log) |

子进程有超时、readiness/退出观察；Node finally关闭连接和服务，Go child关闭stdio/Core，父测试实际Wait。异常有kill兜底，正常验证没有强制kill；超时context、临时目录和bundle均释放。08–14各次已结束，无遗留本任务probe；未运行旧默认D-Bus探针、真实OS keyring、真实模型或用户Vault。

026已原生回告同一105文件共同树的全Go suite、chat/foundation/assistant race、vet、架构及schema/fixtures/decimal检查0；原始日志和共享schema变动归026报告，本作者未重复执行或把其命令冒称自跑。028的最终Runner/TS结果归028与Lead。跨平台发行编译和根build/notices由Lead/T27串行接纳，不由本票擅写。

### 冻结摘要与研究来源

[source.sha256](logs/source.sha256)固定本任务10文件，manifest SHA `6934e02072c0aa0f2eda59e756092d65df5d711662cc103f57d6910f0add2833`：

| 文件（均位于native/huhubot） | SHA-256 |
| --- | --- |
| internal/domain/access/grants/policy.go | `53d64fefec6ff22f72d1e8605a782d027847a220de4929f326b6a9a2cea779ad` |
| internal/domain/access/grants/policy_test.go | `1bb79455a4a9209aa285134b0cef82223372c0900e716556e8cd2ecf54f4cd31` |
| internal/application/access/grants/service.go | `0defb1bb0c7310f1ffa3f8fd0aac67c25e0167b94533073420fd6b0004c3e8d7` |
| internal/application/access/context/service.go | `7a07e13a6c2f3e4626cb688b64c7fb24708e0203fff7a2853e2ab796e6850509` |
| internal/adapters/outbound/hostbridge/read/bridge.go | `27b61095313e425b95f59ccd1bbe853b878ada3d260b7199473830d1dea2e3b6` |
| internal/adapters/outbound/sqlite/grants/store.go | `33ce4c0e7dd36a57f06219bb6aa4b9605981b4295a66934b1140a78354b3b8ba` |
| internal/adapters/outbound/sqlite/grants/access.go | `a5b20b3f257f43b52f13dfbacf1b38a5265b0ff0e3a47e8bc95a75308433cf13` |
| internal/adapters/outbound/sqlite/migrations/005-grants.sql | `e7958f23e0f8b4247e9faaa8653f7f4fd3664ca64feb5eba908b05fe5bc75a0b` |
| tests/contract/access/access_test.go | `0bd4743d986e1fa262096a092b6a2ae6fc39f99e87638d8f9dc1e1c6c19b5a5e` |
| tests/contract/access/host_ts_test.go | `812b324f2ec329580c328765e4eface5706b14374a9383ce0243b46dd9fe82bc` |

[inputs.sha256](logs/inputs.sha256) SHA `73173e72b2ed0e4816dab0a733fb530bf93dc1c5b4152c5f954b86f5d194f6d0` 固定TASK/Map/Goal/T05/规范、031预检、共享API/Host/stdio/bootstrap/executor/SQL注册、Go锁、TS生产协议/Host及schema。026共同冻结105文件树 `4187569a76a91f343b456a7e930f58b21c2cabd5120060ea95c4be038dd9585c`，全部10个本任务文件已逐项核对一致。

研究复用031与IMPLEMENTATION-REFERENCES的固定活动/许可证据，并实际回读官方固定源码：[OpenHanako PathGuard](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/sandbox/path-guard.ts)（Apache-2.0）与[OpenBot handoff](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/agents/handoff.ts)（MIT，固定LICENSE已回读）。采用先授权再访问、逐跳解析真实主体和持久意图的设计思路；不采用路径FULL或更大Bot权限扩张，不移植Postgres/外部Agent服务、不复制上游代码。近两年活动日期与许可定位沿用本change已核实REF-03/04，没有冒称执行上游测试。

无新增依赖、无复制/改编、无Go锁变化，不需新增第三方代码声明；只使用已有SQLite/TS编译与协议依赖。Agent/endpoint资料不进入argv/env/诊断；本票没有传入用户秘密。独立审核或工程生成物仍由各原owner处理。

## 问题与下一步

本作者没有残留活动writer或后台probe，当前代码/测试冻结。交Lead固定联合输入，进行公共Facade/真实TS-Go回验和未参与实现者的独立标准轴/规范轴审查；不自行更改Ticket/Map/Goal/Evidence。回交结构校验按validate-dispatch return执行，原始输出另存本任务日志。

真实Obsidian两窗口/未保存编辑器/来源打开交互与用户模型、目标OS现场仍为 user-owned / not-run；有限Vault registry、Engine捕获器和Go test-child不等于现场通过。028提供的实际ObsidianSources测试/probe和026的Run事务/派生来源证据由Lead合并，不能用本票局部结果宣布AC-022/024/054全部消费者或整个P1已完成。T06/T11/T08及记忆/事件等后续票仍按自己的真实依赖实施，复用当前窄Port，不由本票提前增设权限框架或工具入口。
