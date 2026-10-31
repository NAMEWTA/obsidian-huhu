# 群聊及共同底座独立双轴审查

Session: 20261025T043239Z  
Task: 077-groups-review  
Status: completed  
Reviewer: native:/root/foundation_review（未参与实现；未再次委派）  
Input-SHA256: bac9f195888efe857183f3ff4e5e9ba05ba263a77ea9aba7ad81fd52a2611bc5

## 聚焦交接

**标准轴 request-changes；规范轴 request-changes。** 当前完整候选有一个已实际复现的 P2：`tasks.list` 的字节分页先持久消费下一条私有结果，再决定不返回它，产生并不存在于模型已读正文中的成员依赖。移除这个未读成员会错误取消消费者。正常与 race 均复现；不是权限绕过、正文泄漏或槽位死锁。其余本轮已审影响闭包未发现需要报告的新 finding，原作者及 Root 绿色证据不能覆盖此反例。

唯一输入：[T-13 review-input-groups-r1](../../../evidence/T-13.md#review-input-groups-r1)，299 个实际 scope 文件、87 个来源；Map19/Goal18，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。初次/末次完整核验文件内容、HEAD/index/Git mode 和所有来源摘要一致。相对072为81个新/变路径、218个逐字节不变路径；不将原072通过结论当作新增群行为的证明。

已完整回读073/074/075最终REPORT、五份补充合同、T13及实际维护票、Root交接/E2E/构建回执和相应原始红绿；沿用未变化的dev、I最终独立审查及公共review/risk/error/test-reliability规则。三份作者报告SHA依次为 `2000a25e0d82113bc02c0f8dce960e29720d7482d523993730ecfb92b48acb66`、`9b2d3f5011654a0adc3ac5239957dce7e55855b54a0af510f81e52c61c26b166`、`6f9c27445bff8aca0db60167f2f4b877dd4183cefe969ec1319e875d682b3b7e`。既有 gpt-6-astra/high 偏好不是运行时模型 attestation。

<a id="standards-output"></a>
## 标准轴原始结果

Reviewer: native:/root/foundation_review  
Axis: standards  
Result: request-changes  
Input-SHA256: bac9f195888efe857183f3ff4e5e9ba05ba263a77ea9aba7ad81fd52a2611bc5  
Observed: STD-077-01 / P2，真实公开工具消费者的字节分页错误扩大持久资格，成员移除使未受影响模型任务被取消。正常/race原红及正常对照均已保存。

### STD-077-01 / P2：字节分页未返回的 task result 仍被记为已消费贡献

定位：`native/huhubot/internal/adapters/outbound/sqlite/collaboration/store.go:576–587`（先 `readTaskInTx` 后测524288预算）；该读取在同文件 `505–522` 调用 `ConsumePrivateInTx`，经 `grants/groups.go:68–165` 持久union完整Group/来源/派生并提升revision。后续 `groups/members.go:88–137` 按这个有效binding取消受影响Run，这是正确执行了错误输入，不能通过削弱撤销或Dispatch末门修复。

最小已证实条件：同一合法群内 B 通过实际 `i.Tools.Invoke` 委派四个不同成员，各自结束并产生合法的131072-byte空Source私有结果。用户侧 `Collaboration.GetTask` 等待它们完成，此时SQL证明B仍只有自身成员资格。B随后用原ToolExecution调用 `tasks.list(limit=100)`，总结果不能装进既有524288-byte页。调用返回三份私有正文及nextCursor；第四份没有进入返回页。当前事务却已把第四份结果的成员和task_result派生写进B。没有请求下一页，没有CP Resume或其他读取把该正文交给B。

独立原始证据：

- [最初normal红/正常对照](logs/page-omission.log)：本页396629 bytes，三份正文，各131072 bytes；持久proof却是B+四个成员。不移除时实际Dispatch=1，终结与slots/pins=0。仅移除未返回却绑定的成员后，实际Dispatch=0，原 `want=1` 断言失败，Go exit1。
- [race同条件](logs/page-omission-race.log)：同一反例仍红，消费者持久 `canceled / RUN_CANCELED`；不是仅测试未等够。编排root正常汇总终结，全部slots/pins=0，不是整个root永久waiting。没有race detector报告，不将逻辑失败改称数据竞态。
- [完整状态诊断](logs/page-omission-state.log)：保存admitted与实际returned的delegationId/childRunId/executorAgentId、每份正文大小、真实nextCursor、每个Run的父子关系/最终status/revision/child_slot/完整成员proof。随机delegation排序可能使本页另含B自己的无正文元数据，故两次页大小为396168或396629；三份私有正文、遗漏第四份和错误资格不变。原normal/race日志没有被这次诊断替换。
- [按条数截断的单变量对照](logs/page-count-control.log)：仍是四份131072-byte结果，仅把limit改为3。实际返回两份私有正文+B元数据（264636 bytes），只持久B+两位真实贡献者；移除未返回成员不取消B，Dispatch=1，Go exit0。这说明错误来自字节截断发生在有副作用读取之后，不是所有分页/所有成员移除都错误。

当前没有证据证明未返回正文被发送给模型；已证明的影响是**无关成员撤销导致任务错误取消和结果丢失**。同一错误事务也把遗漏项派生标为已消费，但未把其余可能触发扩大为额外finding。

修复/复验条件：在保持同一事务和实际权限检查的前提下，只对确定进入返回页的私有正文提交消费资格；保留完整tuple去重、revision同Tx更新、来源/派生约束及未知SQL/Commit错误回滚。不能提高页预算、少记实际返回结果的来源、关闭成员撤销或修改探针预期掩盖问题。需原反例转绿，并核查下一页实际读入后才增加资格、撤销真正已读贡献者仍能拒绝Dispatch、条数/字节两种分页的cursor与清理不退化。

### 其他标准轴观察与完整影响闭包

本轮没有重跑同输入十包矩阵。先回读静态事务/生命周期和已有真实消费者，再对新不确定性独立证伪：

1. **多个贡献者与后续派生。** [独立六组race](logs/union-race.log)使用原旧ToolExecution，经连续tasks.get或一次tasks.list读C+D两份私有结果，再委派非成员temporary。实际B与后代均持久完整B/C/D三元组，B revision由3升6，后代Engine输入完整继承。分别移除C、移除D，实际Dispatch均0、公开正文0；不移除Dispatch=1。所有组slots/pins=0。该绿与分页红并不矛盾：六组正文均实际返回且未触发字节截断。
2. **真实SQL失败不部分提交。** [独立race故障控制](logs/union-sql-rollback.log)仅在外部隔离Profile增加SQLite trigger：第二次union UPDATE触发 `RAISE(ABORT,'reviewer_second_union_sql_failure')`。真实tasks.list返回原SQL错误，第一项已经执行的union也回滚；B的Group/derived/source/grants/revision与调用前逐字节相同。移除探针trigger后正常终结，slots/pins=0。此处没有将SQL失败归类为可跳过的业务拒绝，也没有声称模拟了所有Commit故障。
3. **群受理与共同执行底座。** 静态核验StartRun→NewGroupRoot/NewChild同Tx，默认A/显式B,C目标分流、精确receipt重放、整批目标验证/授权失败回滚、pin和user_batch可信边；纯root无配置、模型消息/Attempt/费用、成员proof为空。共同Executor/Claim/Finalize和usage继续提供深度3、累计32、根4/Profile8/wakes8，不新增队列。074与Root实际普通群/显式目标、Grant拒绝原子性、独立公开seq、busy/CAS和配置清理证据在当前摘要有效。
4. **成员、私有消息、CP和结果发表。** 核验移除/rejoin资格、当前DB事实加载、私有AgentMessage发送时proof、消费后fresh Work、真实Attempt和物理投递末门；temporary使用真实祖先而非伪造自身成员。发表只认user_batch稳定child，非partial失败草稿不公开，已接受partial可保留；发布前deliver拒绝转换无正文终态，基础设施错误仍返回。074实际完整CP/问答/补充、temporary、失败草稿/partial、来源撤销及两进程TS-Go证据覆盖这些路径，本轮新增多贡献者后代探针补充旧单贡献者场景。
5. **历史、标签、分页与TS。** 核验公共消息seq与Run event seq分开、none/range按当前目标成员边界、公开作者退出不抹合法公开历史、Source撤权仍生效。模型History移除附件metadata，不以标签获得正文；用户意图与root展示标签分离。stdio同subject的nil/非nil、多个SourceRefs/Scopes必须full-identity union且≤32，失败替换未发出的敏感响应，部分frame必须断开。TS mention使用稳定ID和UTF16边界；GroupClient保留busy/失效草稿、精确重试原命令，不自动重放；transcript BigInt排序且有512/1MiB边界。EventClient严格更高revision proof superset、同revision冲突/旧revision忽略，Session变化先清全部未公开缓存和pending，再runs.get/Snapshot重锚，保留其他有效任务和公共历史。当前19文件180TS与真正TS→Go→Host/合成Vault链有效，但无声称本轮新跑TS套件。
6. **Effect owner与迁移。** 核验Effects.Get/Reconcile仅返回body-free EffectView，内部Preview只进入QueryReceipt；保留真实Profile/Run/Session归属、lease/workspace/connection/fingerprint、CAS/幂等，Approvals正文门未放宽，不重Invoke或重开Run。Root真实Profile重开证明原Invoke1/QueryReceipt1、模型重启0、foreign和Preview拒绝。迁移在完整DB+CP备份后取专用连接，事务外FK OFF，同Tx rebuild+全图FK check，失败rollback、归还前FK ON；旧SQL逐SHA不变。Root真实v7的36张旧表/5份完整CP及缺CP/旧孤儿拒绝证据有效，不把新建空库当兼容迁移。

共享T01/T02/T03/T04/T05/T06/T07/T11/T12的未变内容按072/070/050/040等既有独立观察和本次影响闭包复用：身份/令牌/lease、来源当前授权、bounded stdio/EOF、凭证隔离和有界取消、原白名单/queued撤权/材料化Task合同、CP/槽位和事务错误分类。改到的共享Run/Claim/history/lineage/delivery路径以上重新核查，不能因“218文件不变”忽略其新调用语境。

<a id="specification-output"></a>
## 规范轴原始结果

Reviewer: native:/root/foundation_review  
Axis: specification  
Result: request-changes  
Input-SHA256: bac9f195888efe857183f3ff4e5e9ba05ba263a77ea9aba7ad81fd52a2611bc5  
Observed: SPEC-077-01 / P2，与STD-077-01同一事实：将未向实际模型消费者返回的私有正文计入有效贡献，导致无关成员撤销取消任务；其余已审合同未发现新增规范差距。

### SPEC-077-01：资格应随实际私有正文消费扩大

[private-provenance-supplement](../../../evidence/T-13-logs/private-provenance-supplement.md)规定每份**实际私有贡献正文**核查完整成员资格，并入**实际消费模型Run**的有效GroupBinding；纯编排root不消费正文所以保持emptyMembers，成员变化不应假取消其他有效任务。当前分页返回三份而绑定四份，把服务器为了估算页大小的内部读取误作模型正文消费。真实消费者B尚未读下一页，也没有其它CP/消息来源引入第四位成员；当前取消因此违背有效来源事实，而不是规范要求的保守撤销。该证据与标准轴独立对应同一P2，不重复算成第二个产品缺陷。

T13其他已锁定行为与代码/可复用实际证据一致：无@仅A、明确@仅目标且A可未配模型/Grant/allowlist、全目标同Tx、一根用户意图、真实目标子Run和独立发表；新成员none/明确同群历史、私有thread/私聊隔离、协调者活动根互斥；完整成员代和当前来源/Grant约束贯穿Dispatch/派生/恢复/最终writer；展示metadata不是模型访问权。Effect owner补充仅松开已发生效果的无正文审计读取，不改变Host物理效果或Approval正文授权。上述独立正常与故障控制没有扩大raw三项128KiB/材料化Task另128KiB、单次Host正文、事件/frame、页或并发预算。

合同只保持wire **0.1**、schemaVersion **1**；实际SQLite升级到8不是新wire版本。独立静态合同核验（历史日志已清理：`logs/contract-readback.json`）确认71方法、142验证器、266样本、schema与Go嵌入字节一致，旧SQL不变。073六输出生成复验和075消费同API/schema的证据已回读，未冒称本轮重生成。当前缺陷要求修消费/分页提交顺序，不要求加未来协议或扩合同。

真实Provider/模型、用户Obsidian、目标OS/keyring仍user-owned/not-run；无索取凭证、访问真实Vault、旧默认D-Bus或模型请求。本轮只断言受控Engine、合成数据和现有API/消费者的代码行为，不把未来T08–10/T16等未实施范围或T27完整发行验收算作已交付。原六处docs锚点及全局计划校验已知诊断保留，未称全局文档/计划绿色。

## 产物与验证

独立重窗口由Root明确授予，所有测试串行。工具链实际 **go1.26.10 linux/amd64，CGO_ENABLED=1**，见 [toolchain.log](logs/toolchain.log)。Go commands均在 `/tmp/huhu-groups-review/repo/native/huhubot`，`-mod=readonly -count=1`，只新增隔离探针；237个native/contract原始副本与当前冻结来源最终一致。所有测试真实退出/Wait，既没有后台重试择绿，也未写产品/永久测试。

| 独立执行及目的 | 实际结果 |
| --- | --- |
| `-race -run '^TestReviewerTwoContributorsThenTemporaryDescendant$' -timeout=90s`：两次贡献+旧Tool绑定再派生，六组 | exit0；Go包9.690s |
| `-run '^TestReviewerListPageDoesNotConsumeOmittedResult$' -timeout=45s`：字节分页最初反例 | exit1；包0.254s；正常对照通过、只移除未读成员失败 |
| 同反例 `-race -timeout=60s`，补充消费者持久status | exit1；包3.187s；同逻辑红，无race detector报告 |
| 同反例normal，增加返回ID/完整SQL状态记录 | exit1；包0.254s；仅诊断，不改触发/断言 |
| `-run '^TestReviewerCountLimitedPageDoesNotConsumeOmittedResult$' -timeout=45s`：limit=3控制 | exit0；包0.153s；实际移除未返回成员后Dispatch1 |
| `-race -run '^TestReviewerPrivateUnionSQLFailureRollsBackWholeRead$' -timeout=45s`：真实第二次UPDATE SQL ABORT | exit0；包2.102s；预期SQL错误完整回滚，不吞错 |

完整命令/exit/Wait见 independent-runs.json（历史日志已清理：`logs/independent-runs.json`），代码和最初分页探针原文在 [probes](probes/)，所有原始输出曾写在已清理的 `logs/`。表中时长是Go包输出，不冒充包含编译的wall time。所有数据库为隔离t.TempDir，Core.Close停止并等待Executor，正常/失败路径均释放握手；SQL观测DB与临时目录由测试清理，持久事实原始行已保存日志。

### 复用证据的独立摘要核验

reuse-readback.json（历史日志已清理：`logs/reuse-readback.json`）逐SHA匹配：073联合348输入、075最终9文件、Root E2E当前2066输入、插件1873输入及main.js/styles.css、独立237文件副本。073联合当前tree `49eb41c7b11d57051d2b12edfbf1ae1bfb682b85cd9ac4e0c2de4c1c24595be1`。因此复用作者完整normal/十包race/vet、180TS/类型/架构及Root build/lint；这些都是各原执行人的实跑，非本review重复执行。

Root [E2E r3](../../../evidence/T-13-logs/lead-groups-e2e-r3.json)的新TS/Host链及其明确复用Go公有API/效果重开/v7+CP迁移均已回读。原r1 public用错busy错误kind、r2漏AgentDraft.description是Root外部夹具失败，原日志保留；只修夹具且产品摘要不变后成功，不称原失败本已通过。073首次联合normal确有run-principal single/batch reason不一致；074只修groups/access.go的一行reason，资格谓词和原测试未变，首次exit1、最终normal/race/vet0分别保留。074 private贡献泄漏、失败草稿、waiting用户补充和question撤权卡住的原红/绿已逐项核对；其20反事实overlay是当前代码删除防线的负向控制，不能冒充历史生产快照。075 proof两项红→当前绿及controlled startup已回读；startup controlled executable证明窄reason透传/未知stderr抑制，真实旧库已有孤儿属于备份前置拒绝，不是迁移内生FK失败。

初次/末次冻结核验见 [input-start.log](logs/input-start.log)、[input-final.log](logs/input-final.log)、input.json（历史日志已清理：`logs/input.json`）。核验排除新审查材料造成的excluded inventory元数据变化，未排除任何已选产品/来源/HEAD/index。原072输入和最终报告不变的历史事实继续有效，当前报告不覆盖其原先未启用T13的范围边界。

## 问题与下一步

将STD/SPEC-077-01交原owner修复后重新冻结复审；本review没有实施修复、修改正式票状态或提前接受候选。建议保留本次字节/条数分页对照和真实多贡献者/SQL失败控制，复验只提交实际返回页的资格，不能以整包绿色覆盖反例。

所有自有进程已完成Wait，剩余probe进程为空，237项外部原始输入无漂移，见 process-cleanup.json（历史日志已清理：`logs/process-cleanup.json`）。末次299/87完整输入无漂移；亲自return结构校验输出见 [return.log](logs/return.log)。原生MESSAGE/FINAL交回后停写。产品写入0、永久测试写入0、委派0；没有提交、推送、发版或归档。
