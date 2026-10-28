# 笔记与协作候选二独立双轴复审

Session: 20261025T043239Z  
Task: 070-notes-collaboration-r2-review  
Status: completed  
Reviewer: native:/root/foundation_review（未参与实现；未再次委派）  
Input-SHA256: 3edb78e691126e3377c2d1b00f286cc1b0524ba91bea4bbe5892f69033384e02

## 聚焦交接

标准轴 **request-changes**；规范轴 **request-changes**。059 原三个产品反例已在当前输入独立关闭；本轮新增 **一个 P2 测试可靠性问题**，两个轴引用同一问题，不重复计算。完整候选没有发现另一个需要报告的产品缺陷。失败不是产品槽位死锁，也没有证据把原因归给本轮 Claim 修复。

当前唯一输入为 [T-07 review-input-notes-r2](../../../evidence/T-07.md#review-input-notes-r2)：265 文件、69 来源，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，工作副本候选二。初次及末次按真实 scope_paths 解析完整 HEAD/index/mode/工作副本及来源；全部一致。相对059，当前253个文件及原65个来源字节不变；12个路径变化/新增，新增4个任务或审查来源。没有重取输入以掩盖失败。

本轮完整回读068/069最终报告、三项原反例及其正常对照、关键红绿/Claim故障原始日志；另独立核对作者307文件、Root E2E2032文件、插件复用1867文件摘要，均无漂移。实际独立工具链为 **go1.27.1 linux/amd64**；作者/本次Root修复验证记录的 go1.26.10 按原记录保留，不能拼成同环境重复结果。既有 gpt-6-astra/high 派遣偏好不是运行时模型证明。

<a id="standards-output"></a>
## 标准轴原始结果

Reviewer: native:/root/foundation_review  
Axis: standards  
Result: request-changes  
Input-SHA256: 3edb78e691126e3377c2d1b00f286cc1b0524ba91bea4bbe5892f69033384e02  
Observed: 原059三个缺陷关闭；新增 STD-070-01 P2，实际整包 race 红灯、合法交错确定性红灯及释放后完整终态证据成立。

### STD-070-01 / P2：并发槽位测试在释放叶任务前依赖未保证的受理顺序

定位：`native/huhubot/tests/contract/delegation/wait_test.go:153–219`，特别是162–179的并发委派、181–185的叶任务阻塞，以及204–214的等待/释放顺序。最小审查行段为205–207。

测试让 root 顺序发出六次 parent-child 委派，同时已经启动的 parent-child 创建 leaf 并发布 children checkpoint；所有 leaf 在测试的 `release` 上阻塞。之后测试要求数据库同时出现 **7个 waiting_children、4个占槽任务**，才在214行释放 leaf。测试没有保证六个 parent-child 在任一 leaf 前全部进入受理队列。生产按受理时间及 run_id 调度，允许较早受理的四个 leaf 先占满根的四个槽位，末两个 parent-child 正确地保持 accepted/slot0。因此7个 waiting_children的测试前提不一定可达；此时继续等5秒不会改变状态。

实际证据分三层，保留各自含义：

1. **未修改产品或永久测试的当前整包 race**：chat、delegation、approval、effect-reconcile 串行包执行；delegation仅此测试在5.36秒失败，原错误为 `waiting children retained slots or queued leaves deadlocked`。其他三个包通过，没有数据竞争报告。原始失败在 [impact-race.log](logs/impact-race.log)。这一次失败未在清理前抓取SQL状态，不能声称其确切调度已被事后证明。
2. **相同生产字节、原受理顺序的独立正常对照**：仅在外部测试副本加入失败时状态输出与最后计数；独立 race 单项通过，2.52秒，calls13/resumes6/slots0。[slots-observed-race.log](logs/slots-observed-race.log)。这说明存在通过的合法顺序，不能覆盖整包原红灯。
3. **单变量合法交错**：外部副本只加入同步屏障：root 发出前四个 parent-child 后，等四个 leaf 确实进入 Engine，再发出第五/六个 parent-child；保持真实公共工具受理、生产 Claim/SQLite、原5秒断言、四槽上限及原终态断言。到原5秒边界，SQL实测 leaf running/slot1=4、parent-child waiting_children/slot0=4、parent-child accepted/slot0=2、root waiting_children/slot0=1；完整 created_at/run_id 顺序支持 leaf先于末两个parent。waitEdges=4，已分派模型producer记录为0，实际 Engine calls=9/resumes=0（不能把producer记录计数解释为没有四个正在执行的leaf）。测试仍以原断言报错。外部诊断仅将 Fatal 改为 Error 后继续，让原 release 真正关闭，再执行原终态断言：root succeeded、calls13、resumes6、slots0全部满足。该探针仍 exit1，未将失败改绿。[slots-forced-schedule.log](logs/slots-forced-schedule.log)、[完整外部差异](probes/wait-probe.diff)。

这组结果证明测试依赖的前提对合法调度不成立；不证明产品保留了已停止producer的槽位。四个占槽者都是由测试故意持有的真实 leaf。释放后所有消费者与生命周期正常完成。它也不是053/LOG082中旧的 `TestActualChildClaimsRespectRootFourProfileEightAndQueuedWorkDoesNotConsumeSlots` 终态发布早于defer释放问题；那一历史问题通过Finalize同事务ProducerEndedInTx处理，不能混同。

影响：合法运行可使当前合同测试/整包race非确定性失败，并给出不成立的产品死锁诊断；当前候选所需的并发生命周期验证不能据一次 isolated绿认定完成。

最小满足条件：仅修复测试同步或夹具调度，使“全部parent已经可进入waiting”的前提由可观察握手建立，再验证原释放/重占合同；保留原5秒时限、根4/profile8槽位上限、queued不占槽、pin/producer真实终结、最终calls13/resumes6/slots0等约束。保留并解释本次合法早到leaf交错，证明其释放后正常完成。不通过扩大时限、sleep碰运气、循环重试、删除原断言、修改生产排序或扩大权限来获得绿色。后续作者改动须另冻输入并复验；本报告未实施修复。

### 原059三项关闭与实际影响闭包

- **059 STD-01 工具白名单**：`broker/service.go:164` 在进入协作和笔记分支前使用同一固定Agent配置判定。原白名单允许/禁止对照探针（实际调用agents.delegate与agents.message）完整重放：未授权协作工具返回 CAPABILITY_DENIED/TOOL_NOT_ALLOWED，child/message/childEngine均0；合法对照分别产生预期一次事实/调用。审查existing、temporary、嵌套与已受理配置固定语义；Sponsor及运行时配置头不能扩大当前模型绑定权限。合法用户公共API授权仍与模型工具身份分开，Source/recipient/claim/generation/预算下游门仍保留。note.write原结构化拒绝形状保留。未用泛化fixture权限掩盖拒绝。
- **059 STD-02 撤权队首饥饿**：`execution/executor.go:54,148,205,225,341` 只在MessagesInTx阶段把固定白名单的typed业务拒绝，交同事务共享Finalize路径持久失败，再继续选择候选；拒绝任务不入Engine。原公开撤权/取消恢复/无关root正常对照通过。独立新增真实checkpoint消费者：四个被持有child后排队question，撤权后持久GRANT_REVOKED、question Engine0，父Resume恰1次收到不带正文的failed/QUESTION_UNANSWERED，父以CHILD_PARTIAL_FAILURE完成，槽位和wait边归零。不是只检查DTO存在。
- **059 STD-03 已受理委派要求丢失**：`usage/delegation.go:14` 从当前child的持久委派关系读取task/constraints/expectedOutput，`executor.go:190` 安装到启动与恢复的EngineInput，`api/delegation_input.go` 校验范围，`collaboration/store.go:391` 准入复用。原existing及temporary marker在真实Engine收到的Delegation及完整EngineInput均存在。普通root保持nil；只读当前Run对应事实，无私聊历史/跨thread读取。后续T08尚未交付不影响本轮端口真实消费验证。

进一步独立检查事务边界：首个候选已在事务内转换拒绝后，让第二候选的实际SQL查询报missing table；Claim必须返回原SQL错误和nilWork，两候选都仍accepted/revision1，pin与Session占用保持，零新增终态事件/slot。移除同一SQL故障后才恰一次失败事件并返回正常Work。另把同一GRANT_REVOKED从DelegationInput读取阶段注入，确认原错误不被Messages专用分类器吞掉，全部受理状态回滚。原作者未知Fault/Query/Scan/rows.Err/损坏记录/提交失败11场景及共享WithinTx/Commit实现也已回读。没有将所有读取错误等同业务拒绝，也没有声称每种未来故障都做过独立注入。

共享Finalize、control/tree、usage/parent aggregation、ProducerEnded、CP continuation、pin/Session/event/Bump的调用及同事务边界均复查。真正SQL/提交错误返回nilWork并回滚；已知拒绝跳过第二次access仅用于无正文失败事实。后续候选未知错误使之前本事务的拒绝一并回滚，这是明确保留的原子保证。取消、正常父聚合、CP续跑和不实成功风险由上述真实消费者及当前race范围共同覆盖。

<a id="specification-output"></a>
## 规范轴原始结果

Reviewer: native:/root/foundation_review  
Axis: specification  
Result: request-changes  
Input-SHA256: 3edb78e691126e3377c2d1b00f286cc1b0524ba91bea4bbe5892f69033384e02  
Observed: 原059三项规范差距均关闭；当前生产授权/持久输入/原子拒绝行为符合本轮已核合同；并发生命周期验收夹具仍错误排除一种合法调度，SPEC-070-01对应同一个P2。

**SPEC-070-01 / P2**：与STD-070-01为同一问题。既定合同限制根4/profile8与等待任务不占运行槽位，没有要求全部一级parent总是在二级leaf之前受理。当前测试在未建立该前提时，把不足7个waiting判成deadlock，不能作为合同的可靠验收证据。规范没有要求改变产品调度。满足条件为上述夹具同步修复并保留原权限、时限、槽位、pin、终态及真实调用计数；当前request-changes针对有效验收缺口，不新增产品约束。

原规范轴逐项核对：

- 固定配置白名单是模型工具入口的前置能力门；协作来源、目标、Grant、recipient及执行时复验仍独立成立。原拒绝不得有持久副作用及Engine调用；正常授权对照必须保留。原059反例及当前入口审查满足这些条件。
- 被撤权的已受理question应持久形成可恢复的失败结果且不阻塞无关accepted工作；不能通过删Grant复验、吞基础设施错误、伪成功或重复结果实现。当前共享Finalize与实际父Resume证据满足；异常回滚探针进一步验证了边界。
- raw task+constraints+expectedOutput合计128KiB与Context材料化Task另128KiB是两个门。当前实现保留raw字段原各项限制，不收紧为材料化后总128KiB。已受理大Context控制合计140962 bytes实际进入Run，并在两次重开后真实CP Resume；本轮整包race中该永久测试通过。原准入合法输入保持兼容；损坏JSON/关系/越界数据保留错误。Constraints原nil兼容归一为空集合；Task与Intent同一已选择上下文，后续适配器不应重复拼接。
- 源码/合同未增加SQL迁移、wire DTO、依赖、TS Host写入路径。本轮完整候选包含T07/T11/T12与共享维护T01/T02/T03/T05/T06、T27已交切片，实际调用影响T04事件生命周期亦已按闭包核。未变253文件及65来源支持复用059的Host来源/receipt/HMAC/预算/lineage/恢复/迁移/事件性能观察；共享Claim/Finalize实际影响以本轮新测试补充，不笼统复用旧全绿。250ms事件门未放宽、未在本轮重跑无影响性能矩阵。
- 未实现T08–10/T13/T16等不被冒充完成。真实Provider、Obsidian及用户目标OS/keyring均user-owned/not-run；未索取凭证、未运行旧默认D-Bus配置。不以用户现场缺失制造本轮finding，不将当前代码门等同T27或28票55AC完成。

## 产物与验证

原始输入及复用证据：

- [input-start.log](logs/input-start.log)、[input-final.log](logs/input-final.log)、完整当前输入（历史日志已清理：`logs/input.json`）、[核验脚本](probes/check-input.mjs)。脚本按scope_paths核完整来源/hash与HEAD/index/mode；排除新报告造成的excluded inventory元数据差异，未排除任何实际审查文件。
- upstream-input-readback.json（历史日志已清理：`logs/upstream-input-readback.json`）：作者307、Root2032、插件1867、外部精确副本209均errors空。068报告SHA `44c778e6202d83852c5fa8930b78bc518896127e98ec1e80c1f392ca6174d896`；069 `eab4d29acc11fe22017009069f2f00690898ae10f9d420ec773f5aa222bcca62`；059 `78ed3de83b397366443b76e82fb166814516032f941d485e8cdfbb6c3ba6db17`，全量回读一致。
- 068 Claim故障日志、069三项old-input red、修复green及claim-token夹具修正均回读；早期绿色前的额外“终态claim_token必须空”假设已明确移除，原终态保留token用于迟到账本，不把夹具错误报成产品缺陷。作者joint最终8 normal/5 race/vet结果为上游证据，不冒称本review重跑。
- Root [lead-note-repair-r2.json](../../../evidence/T-07-logs/lead-note-repair-r2.json)及原059回放、公共协作、真实TS/HAP/stdio/Go/SQLite/Host日志已回读；Root当前2032输入无漂移。插件151TS/build/lint及迁移按明确未变闭包复用；没有在本轮冒称重新构建。067全局docs仍有6个原输入anchor失败，未报告全局docs绿。

独立命令与真实结果（均 `-mod=readonly`，输出未删）：

| 工作目录 / 命令重点 | 结果与原始证据 |
| --- | --- |
| 外部精确副本：`go test -v ./tests/contract/delegation -run '^TestReviewer(Queued\|Delegated\|Bound)' -count=1 -timeout=45s` | exit0；[original059.log](logs/original059.log)，包0.566s；三个原probe字节未改 |
| 当前仓库Go模块：`go test -race -timeout=8m -p=1 -count=1 -v ./tests/contract/chat ./tests/contract/delegation ./tests/contract/approval ./tests/contract/effect-reconcile` | exit1；chat14.436s通过，delegation54.452s失败（唯一上述测试），approval19.333s、effect-reconcile9.547s通过；[impact-race.log](logs/impact-race.log) |
| 外部副本：`go test -race -v -count=1 -run '^TestReviewer(ClaimRollback\|RecognizedReason\|DeniedQueued)' -timeout=45s ./tests/contract/chat ./tests/contract/delegation` | exit0；chat1.727s、delegation2.693s；[adjacent-probes.log](logs/adjacent-probes.log) |
| 外部原受理顺序诊断：`go test -race -count=1 -v -run '^TestChildCheckpointWaitReleasesAndAtomicallyReclaimsRootSlots$' -timeout=30s ./tests/contract/delegation` | exit0；包3.542s；[slots-observed-race.log](logs/slots-observed-race.log) |
| 外部单变量强制合法交错：同上一命令但无`-race` | exit1；包5.135s；[slots-forced-schedule.log](logs/slots-forced-schedule.log)；原5s失败后继续观察最终完整成功，未覆盖失败 |

外部源码探针保存在 [probes](probes/)：原059三个probe、新Claim事务/真实question Resume探针、wait原始/仅观察/强制调度三个版本及精确diff。它们没有写入生产或永久测试。原始包失败、isolated绿色与forced红色三种事实全部保留，未机械重跑整包求绿。外部诊断wait_test已恢复精确当前原字节，209项复核仍一致。 process-cleanup.json（历史日志已清理：`logs/process-cleanup.json`）记录所有自有exec会话实际结束并Wait、剩余probe进程空，产品写入0、子代理0。

## 问题与下一步

本轮审查工作已完成，当前候选两轴均request-changes，只有STD/SPEC-070-01这一个P2待处置。请原测试owner在新任务仅修复该测试同步，再冻结新输入，独立核验原正常/合法交错与整包失败对应的影响范围；当前报告不宣布修复或通过。059三个产品问题在本候选已关闭，但不能用其关闭覆盖新测试缺口。Root负责正式状态与后续派遣。

已完成末次完整输入核验、外部副本恢复/摘要检查及所有自有进程Wait；return结构校验实际结果保存在 [return.log](logs/return.log)。交回后停止写入并释放重测试窗口。没有提交、推送、发布、归档或生产实现。
