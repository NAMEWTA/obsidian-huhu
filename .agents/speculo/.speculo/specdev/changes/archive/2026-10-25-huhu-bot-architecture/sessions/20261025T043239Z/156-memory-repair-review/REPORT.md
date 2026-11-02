# 私有记忆修复后完整候选复审

Session: 20261025T043239Z
Task: 156-memory-repair-review
Status: completed
Reviewer: native:/root/memory_integration_review
Input-SHA256: e5a2e6e317eb5b37931e34a7e0bbfdb397761f321866d67fd79a18a3a87c175e

## 聚焦交接

151的F1/F2/F3在本固定输入上均已有对应修复与可回读反例验证；155的真实SQLite快照冲突处理未发现新增可达缺陷。**本轮标准轴、规范轴仍为request-changes，原因是完整验收门未完成，非重复指控已修复的三项缺陷。** Root共同Go r3唯一凭证通道红灯在33次限定观察中没有复现，原因仍unconfirmed；自动维护物理E2E在收口时已完成并纳入下表，后续质量检查仍未完成，不能预签通过。没有运行新的Go/DB/CLI、实现产品或测试修复、再派遣、改变正式状态；本156仅交回当前e5a2输入的独立结论，后续157测试候选及新输入应由另一次审查覆盖。

## 来源发现与范围

沿151已读且未变的workspace/catalog→runtime→dev与I独立code-review、C、source-discovery、risk-review、working-tree、Fowler、review-evidence与reviewer-contracts规则继续。保持原未参与实现的 `native:/root/memory_integration_review` 身份；源发现不新建Change或实现Workflow。

repo `/home/wta/orca/workspaces/obsidian-huhu/bot`，branch `NAMEWTA/bot`，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，Map39 / Goal38。G2仍是2063文件历史工作副本ZIP，不冒充另一个Git commit。输入是 `evidence/T-14.md#review-input-memory-full-r2` 与对应input/freeze JSON；独立使用项目真实reviewInputDigest重算得到首部摘要，57权威来源/anchor、2141源码bytes/mode均无漂移，交付前再核仍一致。相对151仅14路径变化，其中4个新测试；没有将整个旧库从零重审，也没有把139组件pass或151旧request-changes直接当新结论。

规范来源保持Spec、ARCHITECTURE、ADR、相关T01/02/03/04/05/06/08/09/10/11/12/13/14/16行为与AC、T14验证合同及115/123/146内部合同。新增回读151/152/153/154/155完整REPORT、Root三份lead-return、修复diff与永久测试、真实输出/输入清单及Root三协议物理CLI/共同回归记录。57来源的准确locator与hash原封保存在 `logs/source-discovery.json`。157观测仅作为后到的失败分类证据列入产物核验，不修改本次冻结的规格或scope。

<a id="standards-output"></a>
## 标准轴

Reviewer: native:/root/memory_integration_review
Axis: standards
Result: request-changes
Input-SHA256: e5a2e6e317eb5b37931e34a7e0bbfdb397761f321866d67fd79a18a3a87c175e
Observed: 独立复审14个变化路径及受影响调用闭包，核验2141源码bytes/mode与57来源无漂移；153/154/155修复、测试和同源证据有效，但Root共同Go r3仍有未解释的原红且后续质量门尚未完结。

没有新增标准轴产品finding。F1持久成功/维护失败隔离、F2既有消费者资格分叉、F3API/wire一致性已被对应代码与强于原151探针的永久反例处理。155限定重试边界、内外层依赖和失败Work隔离未发现违反适用规则；不要求为Fowler目录机械重构。标准轴request-changes保留的是下文G1/G2验收缺口，不能将未复现视为已证实夹具根因，也不能将尚未运行的共同门视为通过。

<a id="specification-output"></a>
## 规范轴

Reviewer: native:/root/memory_integration_review
Axis: specification
Result: request-changes
Input-SHA256: e5a2e6e317eb5b37931e34a7e0bbfdb397761f321866d67fd79a18a3a87c175e
Observed: 对照T14、123、146及156验收逐项检查三项修复、SQLite重规划和真实消费者；F1/F2/F3可在本输入关闭，152旧foundation失败已有独立根因与155实证，完整当前候选必需验收仍未完成。

没有新增规范轴产品finding。该结论不抹去已完成的代码与物理链证据，也不允许仅凭局部通过关闭T14；156 Acceptance 6/7及T14验证合同要求真实共同回归与必要集成验证有明确处置。因此对完整候选继续request-changes。未来T15与T17–28/UI明确未装配不在本轮报为缺陷；全28票55AC Goal不由本报告关闭。

## 原发现处置与风险覆盖

### F1：合法128来源聊天完成 — 本输入已处理

复核 `native/huhubot/internal/adapters/outbound/sqlite/memory/completion.go:126` 起的新分支：只有 `mergeRefs(consumed, source.Ref)` 的精确 `RESOURCE_LIMIT/MEMORY_PROVENANCE_LIMIT`转换为维护拒绝；actualDerived、来源身份、scope与未知SQL仍按原事务失败。输出完整128 consumed依赖保持；拒绝job为blocked/discarded、无Run/config/input/digest，第129个新输出六字段身份保存在outbox，未伪造129可执行输入或截断来源。`maintenance.go:57`扫描仅取commit_state=pending，ReadAdmission也检查终态，拒绝job不会重新受理。

153永久 `TestCompletedChatKeepsFullProvenanceWhenMaintenanceCannotFit`比151原probe覆盖更完整：两组各70轮（含Memory组Forget后第71轮）、精确64=127/65=128、assistant消息/command receipt/会话释放、Run与输出的完整128依赖、拒绝job origin/outbox身份、公有History/ReadFacts、下轮可选来源整项省略与安全计数，以及Forget后祖先失效传播。真实Attempts Reserve/Dispatch/Settle保留known 1+1费用、producer ended和reserved0；每轮实际配置pin从1归0。第二组不是直接修改数据库制造假成功；未知SQL和坏JSON是在成功Core停止后独立事务中的负控，错误继续回滚。关闭后ExecutorPaused重开证明拒绝状态持久，不冒称重启worker已执行。

已独立核其207实际Go/embed/fixture输入与当前bytes/mode完全相同，真实命令exit0/Wait156.699423503s；无需机械重跑更弱的151原probe。131/143的128、cycle/身份冲突、当前read/send/Forget规则未改。此处可关闭F1；具体核验事实来自作者原输出和本人源码/输入审计，不冒称本人新跑了这140+轮。

### F2：temporary群公开历史 — 本输入已处理

复核 `memory/context_plan.go:299`：temporary只用实际Recipient.SponsorAgentID匹配固定Group.Members，普通agent仍用自身；own subject/thread/namespace不变。后续PublicMessageVisibleInTx与当前member incarnation/historyRevision、none/range/join_seq以及每条sourceAccess read+send/完整祖先检查未绕开，也没有查询Sponsor私聊/长期库。

153真实API五场景覆盖already-joined、prejoin-none、prejoin-range、external-existing、removed-and-rejoined；先造实际公开publication及Sponsor私聊、另一子线程、session/profile私有Memory，然后直接断言temporary EngineInput正文与真实source ID，当前撤销/重入旧binding无body。观察修正只处理当前权限拒绝旧GetRun和合法终态后的session CAS；原期限不变，未把编排根误要求为canceled/closed。其最终测试exit0/Wait2.567252955s、207输入与当前一致；Root r3亦运行了该顶层。F2可关闭，私有隔离及当前群资格保持。

### F3：空intent_alias跨wire — 本输入已处理

复核 `contracts/hap/v0.1/generate.mjs:107`：只在readable context分支允许空text，alias须const空串，nonalias仍minLength1；attachment/no-text、redacted无body、私有MemoryBody与请求text不变。独立JSON语义比较仅有memory.get/list四个readable entry共8处变化；公开schema与Go镜像bytes相等，原302方法样本前缀完全保持，新增后313。没有向alias填重复Intent或修改Source.Hash、sealed前缀。

154已有受控typed API→真实wire/Router及生产TS HapConnection/BotClient帧验证，准确区分typed结构验证和wire更窄语义门：非空alias/空nonalias虽可通过typed投影，仍被wire/Router拒绝；缺text、bad hash/partCount、slice长度等由相应层拒绝。Root最终物理链直接从默认Core的Memory.Get producer取得空alias，并在三协议生产TS→stdio→CLI→实际SDK loopback→SQLite/reopen后查询等值；补足154没有运行真实producer的边界。原151 API合法而wire拒绝可关闭。

### 152/155：真实WAL517与生命周期 — 修复范围成立

152观察到叶preparing未进入Engine，错误树为真实driver517、父waiting_children；单独leaf-entered barrier仅隔离SaveResume负控，并没有修复生产。155 `sqlite/execution/context.go:83–229`现在只重试TxB回调失败的单一517或其单分支包装；普通BUSY、混合错误、未知SQL/I/O、Commit不确定结果均不被此重试吞掉。Base.WithinTx回调错误不调用Commit并defer Rollback；固定driver Rollback独立于interrupt执行。这里不扩大为“未知回滚/提交故障一定可安全终结”的保证。

每轮从original Work重读持久Run/claim，再Plan→当前Host→新TxB Seal，失败轮不发布committed Work；只有commit成功后返回。取消/停止不启动下一轮，claim变化仍拒绝，最多两轮；耗尽的body-free CONFLICT/CONTEXT_SNAPSHOT_BUSY由应用Executor `executor.go:229`走原Finalize(failed)。原CONTEXT_PLAN_CHANGED处理保留。

四项真实双连接WAL测试直接得到sqlite3.BUSY_SNAPSHOT，证明一次冲突后新revision/new Host、新一轮Host拒绝、取消不重试和两次冲突耗尽failed/active-run清理、未进入Engine。MemoryHooks和Host是受控端口，不冒充完整Memory竞争或真实外部租约撤销；fixture没有先实际占用child slot，slot0是负控，不夸大成释放已占槽证据。现有Core/foundation共同回归补足受影响入口；155最终237输入与当前一致。原非法SaveResume测试仍保留坏kind、CP/Decision、无Resume及资源断言、8秒期限，新增barrier没有替代生产517回归。Root r3的foundation与private-memory实际通过，152/151中对应旧红在此有明确处置。

### 未变分析与限制

复用151未变的来源revision/hash、Manifest/BindingDigest、body-free hydrate、当前Grants/Host/接收者双向资格、物理delivery门、149 optional span等价而原ShortTerm严格、146/147 ResumeInbox持久receipt/同文不同ID/工具位置、维护purpose/预算/实际Attempts、固定项/用户correct/forget/generation、schema8→10和旧CP分支分析。143仍只证明其真实50Run稠密场景及800浅来源场景的250ms门，不外推所有极限图；新70轮证明边界正确性不自动变成性能门证明。closed canceled历史wait-edge与可调度父资源保持区分，后续purge归T17。没有发现这些未变消费者被本修复破坏的新反例。

## 产物与验证

本agent只运行文件读取、diff、JSON结构比较和hash/mode审计，无Go/DB/CLI或新产品进程；不占Root验证窗口。`logs/input-check.json`记录完整摘要与交付前无漂移，`logs/author-go-input-check.json`记录153/155真实207/237闭包复用，`logs/schema-comparison.json`记录8处schema差异及样本前缀保持，`logs/evidence-audit.json`记录作者工件和Root日志回读。审计脚本、准确来源、证据locator及hash一并冻结，所有自有子进程实际结束。

独立核验作者工件153共75、154共56、155共18份bytes/mode均一致；154的1686源输入、Root物理CLI r3/r4各1892源输入、TS r3的1839输入亦与当前一致。Root三份lead-return摘要及实际return0可回读，不将结构校验当业务通过。

| 检查 | 实际可回读结果与边界 |
|---|---|
| 153永久F1/F2反例 | exit0，实际Wait156.699423503s / 2.567252955s；207同源输入，本文已核具体断言，不重复运行 |
| 154 TS/wire/Router | TS四文件81 tests、313共享样本；Go HAP实际5顶层/40子场景，真实Go包proto本身no test files；报告明确typed受控非SQL producer。源码1686与原输出hash匹配 |
| 155真实517/恢复 | 四目标与原SaveResume count5、受影响foundation/stop目标均0，最终237输入无漂移；真实WAL、受控Memory/Host边界保留 |
| Root TS lint/build r3 | exit0/exit0，Wait57.621083872s/33.186019034s，1839输入无漂移，产物摘要见原记录 |
| Root物理恢复链 | `lead-memory-inbox-combined-r1.json`：Chat/Responses采用r3，Anthropic采用r4，1892同产品输入；各5实际SDK HTTP、3Run succeeded、5known settled、80charged、reserved/pin/slot0、3context、两次自然CLIexit0且reopen不重放 |
| Root自动维护物理链 | `lead-memory-model-r3.json` complete=true，1892同源输入；三协议各6真实SDK HTTP、6known settled、maintenance独立16/profile96、reserved/pin/activeSessionRun0、job bound/committed、下一轮automaticRecallDependency=1及两次自然CLIexit0/reopen持久；实际协议命令Wait1.235814058s/1.243363334s/1.204150453s，均exit0 |
| Root共同Go r3 | exit1、Wait198.577880238s、428输入source/snapshot drift=[]；仅跳过精确同源且已通过的153长链顶层，其余全模块实际运行。foundation/private-memory通过，唯一红见G1 |

Root r3 Anthropic工具流fixture漏cache使用量0，导致正确保守unknown；原exit126与输出保留。r4仅修该工具流fixture两字段，三协议所有生产输入相同；本人读实际HTTP探针与SQLite回读，确认没有伪装生产修复。三协议恢复结果证明恢复/alias链；收口时新到的 `lead-memory-model-r3.json` 另行证明自动维护真实受理→模型→commit→下一轮召回，两个场景不混称同一组Run。

### G1：共同回归原红尚未确因，不能声明完整共同门通过

实际位置 `native/huhubot/internal/adapters/outbound/credentials/channel_test.go:177`，用例 `TestPrivateChannelClosesAtNinthInFlightAndWaitsForWorkers`；Root共同r3输出 `worker fixture not ready`，测试1.04s。它先发8个真实Register再等8个backend entered；失败发生在第9个请求断言之前。根源未被该日志证明，不能据此断言是生产catalog失败，也不能断言是纯超时fixture。

后到157仅在/tmp通过受控wrapper观测原目标1+32次，均Reserve8/Lookup8/entered8、实际Wait，未观察Reserve/Lookup失败；`05-observation-summary.json`明确 `originalIncidentCause=unconfirmed`、permanentEdits=[]、proposalOnly=true。这33次绿只证明本次未复现，不能反向解释或抹除r3原红。Root拟议每个send后等原1秒backend entered、最终保持8个backend并发阻塞至第9个请求的测试维护尚未进入本输入，本报告不预签该patch，不称其已修复已确认事故根因。

最小下一步是保留原红/未复现分类，在新的明确固定输入中验证该测试就绪步骤及真实8并发、第9拒绝、实际worker退出、原deadline与资源断言；必要共同结果按准确未变闭包复用，不能把本r3 exit1改写成0。不要求为未确认原因扩张产品修复或无限重复原用例。

### G2：其余必要共同质量门未完成

截至本次最终交付，后续vet/必要race/architecture/tooling尚未完成；无证据支持在本报告把它们写为通过。自动维护物理E2E已在Root实际Wait后到达，本人逐项核当前1892输入、读取并独立摘要原日志与三协议SQLite回读，并纳入上表，不再列作缺口。157后续一文件候选会产生新固定输入，应随新结果由Root交新159审查，不覆写本报告或151原红。

## 问题与下一步

本输入没有新增已证实产品缺陷，F1/F2/F3可关闭，155修复审查范围成立；完整候选仍有G1/G2验收缺口，故两轴request-changes。Root完成新候选及必要共同检查后，以新输入继续独立复审和T14代码门，不以“旧输入修复已看过”代替最后同源验证。真实Provider、Obsidian和目标OS始终user-owned/not-run，不索凭证，也不成为停止已授权代码工作的理由。

仅写本156 REPORT/logs/manifest与/tmp，产品、旧报告、正式Evidence、Ticket/Goal未改。亲自validate-dispatch return原始输出、exit和Wait见 `logs/return-validation.log/.json`；冻结 `manifest.json`后原生MESSAGE+FINAL交回并停写。completed仅为审查交付，不宣称T14或28票55AC完成。
