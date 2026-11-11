# 074 群事务、成员代与实际消费授权

Session: 20261025T043239Z
Task: 074-groups-domain
Status: completed

## 聚焦交接

本作者完成 T13 新群 domain/application/SQLite、013 正文和原 T04/T05/T11/T12 的真实消费适配。沿 AGENTS 发现 → 本票/当前 Map、dev 与 SpecDev I 执行，完整读取 060 报告/接口、T13、当前 Spec/ARCH/ADR 及原维护接口。Root 先后接纳 Map18/Goal17 的附件/迁移、stdio 附件 proof 合并补充，以及 Map19/Goal18 的效果 owner 控制查询补充；最后一项只有 073 写原 T06/T07，本作者没有扩改那些目录。全局 preflight 对联合维护/分支 Ready 的已有诊断保留，不称全局通过。

初始实际 216 个 native 输入见 01（历史日志已清理：`logs/01-source-before.json`）。最终本作者 **37 文件**逐项路径、起始/最终 SHA 见 30-own-freeze-r2.json（历史日志已清理：`logs/30-own-freeze-r2.json`），tree `1975045a4ffa2734a5c753e052d0cdc62c9b887113a4ee7ae2b548ff1b24ec29`；首冻结 26（历史日志已清理：`logs/26-own-freeze-before-joint.json`） 原样保留；gofmt 与 scoped diff-check 都为 0。该清单是本票实际改变/新增文件，不把共享 checkout 中原来未提交文件算成本轮作者改动。源码和测试已停写；所有作者 Go/Node/Runner 子进程已 Wait。

073 是唯一公共 API/schema/生成物、配置 pin、Executor、bootstrap、迁移注册/底座迁移、stdio 合并与 owner effect 核查 writer；其 35 文件摘要见 18（历史日志已清理：`../073-groups-core/logs/18-own-source-freeze-before-joint.json`）。075 是唯一 TS 消费者 writer；已冻结 GroupClient `9a951074020c491e9a96e237589ee613da4df461a7a079dc8ca04115d3f3ca33`、EventClient `1c4813afb2c8a5df25dbec9825c9c286d0d6d1d4892c2184a00aad62ecd1dae0`、mentions `4d9ff0a72e05da4b9406e336a929e91da0a86820f5363ecc70cff42eb2cc2336`。这些是共享消费来源，不冒称本作者实现。 当前共享 api.ts SHA `9cf6d25e4783e203bf47a475852bed436490da4892eaec86c1ba2b78739d4f34`、schema SHA `d45693a3b4b2abbe635cf2f8b4655b63a4419458bb1e4854723f786a63ed1217`；013正文 SHA `26f23f3bae8d6db44c8d9df0510f77278854ac0de679c90a7a3e22a6bd89f2a1`。

## 产物与验证

- 群发送同一事务内创建纯编排 root、全部实际目标 child、固定配置 pin、真实 Delegation/thread、策略计数及 receipt。无 `@` 仅 A；显式 B/C 只运行 B/C，不要求 A 模型、Grant 或模型 allowlist。任何目标不合法/少一份来源授权，全批零 Run、消息、pin、receipt、Host 读取或模型。root 没有 A 身份/pin/claim/正文模型，只占 Session、持有限制/预算归属并汇总状态/usage/partial。
- 013 唯一新增迁移正文是真实 group Session/member 重建，持久成员 incarnation/history_revision/history_scope/join_seq、Run role/admission kind/effective group binding、独立用户 attachment 元数据、发送时私有消息 group proof，以及稳定 child publication。073 注册为实际 Version8，并拥有备份/受控 FK OFF/检查/恢复 ON 的迁移底座；旧 SQL 未修改。
- 实际群 child 进入同一 Executor 与原 3/32/4/8/8 规则；EngineInput.Delegation 来自真实持久关系，user-batch 的用户意图有稳定 message/hash/thread 派生身份。模型再次委派仍用真实 claim、固定 capabilities、逐跳 parent/source/recipient 当前资格，不伪造用户边。
- GroupBinding 是服务端持久的完整 `(agentId,incarnation,historyRevision)` 集合。来源为空仍检查成员。临时任务沿真实成员祖先/Sponsor 继承，不造持久 Agent/成员；贡献者资格只作 exact tuple union，上限100、变更同 Tx 提升 Run.revision，不用新代覆盖旧代或截断。
- 私有子结果、实际 AgentMessage、模型绑定 tasks.get/list 返回的私有正文均先读真实来源与发送时成员证明，再把实际消费来源/Scope/Grant/Derived/Group 合并进当前模型 Run；用户 Facade 只读查询不会改变模型 Run。当前 Attempt.Dispatch、正文 event/finalize、查询和物理投递复核实际 DB 完整资格。073 在 Claim 消息读取后刷新真实事实，group-only event/finalize 也重新读取，避免启动时旧 proof 冒充当前有效集合。
- root 不复制多个成员正文。实际 user-batch child 在唯一发布事务用 MessageInTx 取得公共 seq；稳定 child ID 去重。仅成功或明确 Partial 的接受正文可发布，失败而未接受的草稿无公共正文。发布前当前 read/send/deliver/member 失效转 body-free failed；SQL/坏数据仍回滚，不能留下重复 running 结果。
- 移除在原 delivery fence 下先关成员资格，同短 Tx 只取消本群旧 incarnation 绑定子树，提交后取消实际 context；原效果/HTTP unknown、pin/slot 生命周期保留。rejoin 单调新代不能复活旧工作。另群和私聊同 Bot 独立。普通 root 当前 Members=[]，不能因移除某一成员而扩大成取消全部群工作。
- 已合法发布公共历史按真实 message/publication 与接收成员的 none/range 范围读取，不要求作者永远是当前成员。模型自动历史仅实际执行成员（临时固定 Sponsor）的明确范围，不混入 Bot 私聊/私有线程。显式选入同群公开 message 有服务端 proof，仍受真实接收方 source/Grant 约束。公共 seq 持久，after exclusive/through inclusive，历史分页与大序列使用十进制字符串。
- 用户原文与发送附件标签分离：root user SourceRefs=[]；Attachments 保存完整修订、origin client/view 与 lease 等引用，不含 Host 正文。用户 History 标签经真实 target child 的当前 read proof 逐项过滤，失权不抹原用户文字，模型不消费展示标签。消息 delivery subject 带本次实际返回的标签，物理出队再核；073 stdio 合并同 batch 相同消息的全部 expected labels，首项空标签不能绕过次项 proof。Snapshot 当前保守不返回标签，History 可合法回读。
- 用户对等待中实际 user-batch 成员的 tasks.reply，沿 owned 编排根/真实目标固定 pin 与 read/send/deliver 记录同线程补充，不借 A/模型 claim，不创建新 Run。模型 reply 保留 live ToolExecution 门。真实 CP Resume 消费该补充；幂等回执不重复记录。问答结果仍是私有输入：回答后资格丢失须原子 body-free 终结，不允许 ReadyParent 无期限回滚等待。

## 永久实际消费者与红绿

所有下面测试都在临时独立 Profile；Engine/Host 是明确的受控边界，业务走真实 Facade、SQLite、同 Executor/CP/Attempt/stdio。没有把 mock peer 或 Port 构造算作服务端验收。

| 永久 Go test | 实际观察 |
|---|---|
| TestPublicGroupsAreAssembledAndExplicitTargetsBypassCoordinatorModel；routing_test.go 的批次/CAS/默认及公共历史例 | A 无模型仍显式 B/C，A0/B1/C1；整批非法零写、同 key 换 commandId 原 receipt；busy/coordinator CAS；默认仅当前 A。C 先结束则公共 seq 在 B 前，重读不重复，根一份、实际 child 两份。新成员 none、rejoin range、稳定分页不读私聊。 |
| TestOnlyTargetSourceGrantsAuthorizeAtomicBatchAndAttachmentLabelsAreFenced | 只有 B/C Grant，无 A Grant；少 C 时零 Host 读取/全批拒绝；真实中文/emoji/换行 Host body/hash 与 root message lineage；完整 originView 标签；一目标撤权但另一当前 proof 合法仍可标签，全部撤权后 queued labels 被拒，重读保用户原文并过滤派生正文/标签。 |
| TestPrivateSourceFreeChildContributorIsRevokedAfterActualCheckpointResume | 实际 Tools.delegate → 完整 CP Publish/Open → 同 Engine.Resume，消费 C 私有结果后 B 的持久 Group 包含 B/C；移除 C 后 B 已保留 reservation 的实际 Dispatch 回调0、无私有正文公开，slot/pin0。 |
| TestTaskGetAndListConsumePrivateMembershipProofWithoutMutatingUserQueries | tasks.get/list ×合法/移除四控制；用户查询不改消费资格，bound tool 真返回私有正文则提升持久 proof/revision；合法 callback1/公开1，移除后 callback0/公开0，实际 producer 结束后释放。 |
| TestPrivateAgentMessageCurrentQualificationIsConsumedBeforeEngineAndDispatch | 合法 inbox 进入实际 Engine.Messages/Derived/Group；C 给 queued B 发消息后移除，B Engine0、原子 failed/current reason/body-free outcome，无关 Session 仍继续；B 已消费后移除 C 则实际 callback0。先前合法公开 C 历史保留。 |
| publication_test.go 三例 | failed 非 Partial 草稿不发布；接受 Partial 仍发布；来源缺 deliver 整批零写；受理后仅 deliver 撤销，成员结果 body-free failed，root partial，无 running 卡住。 |
| TestUserSupplementToWaitingGroupMemberReachesSameCheckpointThread | 真实 B→C 等待，公开用户给 B 补充，同一 CP Resume 真读到消息；Engine.Run 2次/Resume 1次（含编排根共3持久 Run）、同 receipt、无额外 Run、slot/pin0，无 A 模型。 |
| TestAnsweredPrivateQuestionChecksCurrentContributorBeforeCheckpointResume | 合法真实 Tools.question/answer → 完整 CP 同 Executor Resume，答案与完整 B/C proof；回答后/交 CP 前移除 C 则零 Resume、body-free failed/current GROUP_MEMBER_REMOVED、root partial、无公共正文、slot/pin0。 |
| TestSourceFreeRemovalFencesQueuedBodyAndRejoinDoesNotReviveOldWork | 来源为空的实际 active Tail0/Snapshot 先取得正文，移除后 queued subject callback0、actual Dispatch0；另群/私聊同 Bot 继续；已发布历史可物理交付；rejoin incarnation2，旧 Run 拒绝、新工作成功。 |
| TestNestedTemporaryGroupWorkUsesActualMemberAncestorAndCurrentDispatchFence | temporary→temporary / temporary→existing ×合法/移除四控制；真实祖先 B/Sponsor 不被临时身份替代，合法 callback1、移除祖先 callback0，仍3次实际 Engine、无 fake agents、终态 slot/pin0。 |
| TestHundredMemberGroupSessionsPageWithinWireBudgetWithoutOmissions | 100 真实成员×32 群，公开 ListSessions 两页、32 唯一无遗漏/重复，每页 JSON≤524288 bytes。 |
| TestActualGroupClientConsumesAtomicGoGroupsAndPhysicalRemovalFence | 生产 GroupClient/mentions/EventClient/HapConnection → 实际 stdio/Facade/SQLite/同 Executor，14项：默认仅A/显式仅BC、整批拒绝完整 draft、同receipt、公共序、真实 Unicode Host、撤权、排队物理 fence、全部Run缓存失效/合法C重取、rejoin旧代拒绝、保公开历史、两次实际 Runner 重开稳定。测试仅在 permit 前用有界 queue barrier，普通 updateMembers 实际提交后，真实 production WithDelivery/writer 拒绝旧页；无新增测试 RPC。 |

真实产品红灯均保留：

- [02](logs/02-assembly-first.log) 实际 Groups 未装配（exit1）；073 装配后 [05](logs/05-assembly-green.log) 同输入 exit0，0.076s。
- [08b](logs/08b-private-contributor-red.log) 实际私有 CP 结果未累积 contributor，移除后 callback1/私有正文公开（exit1）；[09](logs/09-private-contributor-green.log) 同永久例 exit0，0.079s。
- [14](logs/14-failed-draft-red.log) failed/非 Partial 草稿被公开（exit1）；[15](logs/15-publication-green.log) 三项实际公开结果控制 exit0，0.218s。
- [16](logs/16-group-reply-red.log) 公开用户等待补充被 RUN_CONFIG_NOT_PINNED 误拒（exit1）；[17](logs/17-group-reply-green.log) 同 CP 消费与幂等/无新 Run 控制 exit0。
- [18b](logs/18b-question-red.log) 已回答后移除导致 root waiting_children 卡住（exit1，5.133s）；[19c](logs/19c-question-green.log) 原合法与失权两控制 exit0。
- [21](logs/21-membership-first.log) 实际新 child Tail0 为 EVENT_LOG_GAP（exit1）；073 将新 child accepted 真正写 seq1，未改旧 SQL/Gap 检测；[22](logs/22-membership-green.log) 同永久消费者 exit0，0.120s。
- 缺 deliver 两个 guard 已先由两 owner 按合同修正，未伪称当时跑过旧代码。20-overlay.json（历史日志已清理：`logs/20-overlay.json`）、精确差异（历史日志已清理：`logs/20-counterfactual.diff`） 仅在 Go overlay 恢复 child 的原 read/send 与结果前原 membership-only guard，**是当前输入上的受控 counterfactual，不是完整历史快照**；[20 red](logs/20-deliver-counterfactual-red.log) 同永久例实际表现缺 deliver 受理、发布前撤 deliver 后 root 卡住，exit1/5.083s。生产 15 保留两项 exit0。

夹具/命令失败另列，不冒称产品红：[08a](logs/08a-fixture-compile.log) 错 Attempt 字段/Abort 返回值，[10](logs/10-private-closure-compile.log) 本作者新文件漏 import，[12/12b](logs/12-task-getters-first.log) 单 ToolCall 同时填两种具体载荷被合法拒绝；修成单一载荷后 [12c](logs/12c-task-getters-green.log) 四控制 exit0/0.268s。[18](logs/18-question-red.log) 新测试错误读取不存在 Run.Partial；[19/19b](logs/19b-question-diagnostic.log) 新断言误指定包装 reason，实际 Claim 保留 current GROUP_MEMBER_REMOVED，未为断言改变产品。最初 shell 工作目录/重定向两处失败未实际启动 Go，后来一律用 repo 根 `go -C native/huhubot`，没有把失败算通过。

[23](logs/23-ts-go-first.log) 首次 TS queue fixture 只 refresh 一次，早于 Engine 设 queue，因此未达到 barrier，exit1；改为同一有界 fixture 在入队前继续 refresh，未改变生产 TS/Go。最终 [24](logs/24-ts-go-second.log) 14 项 exit0/1.181s，两 Runner 与 Node 已 Wait；[25](logs/25-temporary-pagination-first.log) 四临时任务控制与100成员分页 exit0/0.655s。旧失败日志不覆盖。

主要定向命令统一在 repo 根：`GOTOOLCHAIN=go1.26.10 go -C native/huhubot test ./tests/contract/groups -run '<permanent test selector>' -count=1 -v`。15 selector=`TestFailedUnacceptedDraft|TestMissingDeliver|TestPublicationDeliver`；17=`^TestUserSupplementToWaitingGroupMember`；19c=`^TestAnsweredPrivateQuestion`；22=`^TestSourceFreeRemoval`；24=`^TestActualGroupClient`；25=`TestNestedTemporaryGroup|TestHundredMember`。20 在相同命令中额外指定该实际绝对 overlay 路径，selector=`TestMissingDeliver|TestPublicationDeliver`。所有上述命令的真实 exit 与 Wait 已记载，没有用日志存在替代命令成功。

## 同一冻结输入与最终联合检查

073 在共同停写输入采 19-joint-source-before-checks.json（历史日志已清理：`../073-groups-core/logs/19-joint-source-before-checks.json`），348 文件 tree `62c543c90a4191e733b228ab2c71eaa0e522d43cbea5252421ae2c56e046ac22`。其 [20 普通全模块](../073-groups-core/logs/20-joint-normal.log) / 23结果（历史日志已清理：`../073-groups-core/logs/23-joint-check-results.json`） 实际 exit1/Wait，71.004s，前后 drift=[]；唯一失败为原 access 单读/批读 run-principal 对相同失配返回不同 reason，race/vet 因失败未启动，未冒称全绿。

Root 释放最小窗口后只修 groups/access.go **一行**：真实 DB profile/principal/session scope mismatch 恢复原 RUN_SCOPE_MISMATCH，真正 BindingContains/成员代错误仍原 Group reason，所有实际 DB 查询/成员检查/nil 防伪不变，旧测试不改。27 精确差异（历史日志已清理：`logs/27-scope-reason.diff`） 与 前后 SHA（历史日志已清理：`logs/27-scope-reason-source.json`） 保留。`GOTOOLCHAIN=go1.26.10 go -C native/huhubot test -mod=readonly ./tests/contract/access -run '^TestBatchReadFactsKeepSingleDecoderRecipientAndCurrentTransactionSemantics$' -count=1 -v`，见 [28](logs/28-single-batch-scope-green.log)，exit0/Wait，0.053s；同前缀 groups `-run 'TestSourceFreeRemoval|TestOnlyTargetSourceGrants'`，见 [29](logs/29-scope-group-controls-green.log)，exit0/Wait。重新冻结37文件，26→30精确仅此一行。

最终 r2 已固定于073 25-joint-source-r2.json（历史日志已清理：`../073-groups-core/logs/25-joint-source-r2.json`），348文件 tree `49eb41c7b11d57051d2b12edfbf1ae1bfb682b85cd9ac4e0c2de4c1c24595be1`，相对首轮联合输入仅上述一行。348清单中沿用的五份旧 dist JSON 只作支持输入冻结，不表示本轮重建了五目标二进制。073按Root协调独占串行执行以下三条，最终 29-joint-check-results-r2.json（历史日志已清理：`../073-groups-core/logs/29-joint-check-results-r2.json`） 全部实际 **exit0 / Wait**，348输入 before/each/after drift=[]。这些联合命令由073实际执行，本作者引用同一输入，不冒称独立再跑：

| module cwd=`native/huhubot`，固定 GOTOOLCHAIN=go1.26.10 | 真实结果 |
|---|---|
| `CGO_ENABLED=0 go test -mod=readonly -p 1 ./... -count=1` | [26](../073-groups-core/logs/26-joint-normal-r2.log)，exit0，wall69.309s；全模块普通测试 |
| `CGO_ENABLED=1 go test -mod=readonly -race -p 1 ./tests/contract/groups ./tests/contract/access ./tests/contract/events ./tests/contract/delegation ./tests/contract/collaboration-policy ./tests/contract/chat ./tests/contract/approval ./tests/contract/effect-reconcile ./tests/contract/foundation ./tests/contract/assistant -count=1` | [27](../073-groups-core/logs/27-joint-race-r2.log)，exit0，wall462.458s，无 data-race 报告；10包全部通过 |
| `CGO_ENABLED=0 go vet -mod=readonly ./...` | [28](../073-groups-core/logs/28-joint-vet-r2.log)，exit0，wall0.788s |

race各包真实耗时：groups34.965s、access17.730s、events169.537s、delegation73.336s、policy5.644s、chat23.349s、approval26.871s、effect-reconcile12.389s、foundation48.943s、assistant36.802s。旧100/800实际来源250ms门、snapshot message provenance、270事件/3s及071完整等待交错断言均保留并在此次实际执行通过；没有提高阈值/改旧断言或择绿重跑。最终作者只读回验与进程事实见 31（历史日志已清理：`logs/31-final-source-and-process-receipt.json`）。

## 问题与下一步

复用仓内已接纳的 Profile UoW/command receipt、固定 config pin、同 Executor、069 Delegation loader、T05 read/send/delegate/deliver、T04 physical delivery permit、真实 CP、T06 CancelSubtree/producer guard 与 GroupClient；未新增依赖、复制/改编外部项目源码或修改锁、凭证/provider/keyring/D-Bus。新测试 Node/esbuild 只在自有测试 harness，不进入 Host-free 生产包。

没有访问真实用户库/Obsidian/系统凭证、真实 provider HTTP/模型，也没有运行旧默认 bus 探针。目标 OS 的真实宿主/模型操作仍 user-owned/not-run；Root 后续独立 E2E、build/lint 与代码审查尚非本作者完成。没有提交、推送、发布或更改正式票据状态/失败 attempts。最终所有自有 probe/子进程 Wait，保持源码/测试停写，报告/回执完成后原生 MESSAGE+FINAL 交回。
