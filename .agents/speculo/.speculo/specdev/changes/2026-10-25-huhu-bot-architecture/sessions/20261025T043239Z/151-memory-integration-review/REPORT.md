# 私有记忆完整集成双轴审查

Session: 20261025T043239Z
Task: 151-memory-integration-review
Status: completed
Reviewer: native:/root/memory_integration_review
Input-SHA256: f0db44427b4ba9d0290571b922254780c0f098a1d833300a9ab2b710c5322e37

## 聚焦交接

本次独立标准轴与规范轴均为 **request-changes**。在冻结产品的独立 `/tmp` 副本中，通过真实 Core/SQLite 入口确认三项可达缺陷：第65轮普通聊天因维护来源容量超限而未提交成功；具真实群绑定的 temporary 丢失已授权公开历史；真实空 intent alias 的合法 API 查询结果被 HAP schema 拒绝。没有修复产品、委派、改变 Ticket/Evidence 或把139纯组件 pass 代签完整集成。全部自有 Go/测试子进程已实际 Wait，并已明确归还独占窗口；本报告 completed 仅表示审查交付，T14代码门仍不通过，完整28票55AC Goal不在此关闭。

## 范围、来源发现与证据身份

- repo `/home/wta/orca/workspaces/obsidian-huhu/bot`；branch `NAMEWTA/bot`；真实 HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`；Map39 / Goal38 / LOG128。
- 输入是 `evidence/T-14-logs/review-input-memory-full-r1.json` 中完整 scope/sources/exclusions 对象及 `review-freeze-memory-full-r1.json`。使用项目实际 `reviewInputDigest` 与 artifact-section 解析器重算得到上列摘要；52条权威locator/anchor无漂移。独立逐文件核对2137份当前bytes/mode，开始及交付前均无漂移（`logs/source-check.json`、`logs/final-input-check.json`）。
- G2是历史工作副本2063文件bytes/mode ZIP，非另一个Git commit；以其实际文件作差异阅读。相对G2为73改变、74额外补入路径（其中旧清单遗漏检查依赖不误称新增实现）。未提交新模块按实际文件审查，未将HEAD空差异误报为无变化。
- 先从workspace/catalog发现能力，再读runtime与真实dev、I的code-review能力、C及source-discovery/risk-review/working-tree/Fowler/reviewer-contracts/review-evidence；适用规则包括根AGENTS、dev架构/测试、lint/TS/vitest配置。定向搜索native/contracts/客户端范围未发现额外嵌套AGENTS/CLAUDE/CONTRIBUTING规则。完整52条来源及摘要、排除项保存在 `logs/source-discovery.json`，不另造规格。
- 规范依据：Spec、ARCHITECTURE、ADR；T01/02/03/04/05/06/08/09/10/11/12/13/14/16行为与AC，T14验证合同；115 interface-contract、123 short-term-contract、146 resume-inbox-contract。Map31–39及作者125–150报告只解释职责与可复用证据，未作为行为权威替代源码。
- 重点追踪memory Store→Core→Executor/事务→Grants/Host→usage→恢复→三SDK→typed API/HAP→TS校验及实际最后输出门；同时检查144/145/150原消费者迁移与149修复边界。源发现和标准阅读不激活新Change、实现或归档。

<a id="standards-output"></a>
## 标准轴

Reviewer: native:/root/memory_integration_review
Axis: standards
Result: request-changes
Input-SHA256: f0db44427b4ba9d0290571b922254780c0f098a1d833300a9ab2b710c5322e37
Observed: 独立只读审查冻结完整集成，按真实公共入口运行三项有针对性的反例；2137文件bytes/mode无漂移，全部探针子进程实际Wait。

F1违反持久成功与维护失败隔离，F3违反同一typed结果的API/wire一致性，均有独立真实反例。F2是新消费者替换旧历史选择时遗漏已有temporary资格分支；同一群audience规则在旧History与新Plan分别表达，实际已产生行为分叉。这是可定位的正确性问题，不按Fowler目录机械要求重构。

内外层导入、SQLite所有权、API/HAP DTO分离、应用层无SQL/Provider SDK等边界在检查的调用闭包中未发现新增反例。纯组件与原测试证据的来源限制保持清楚，但Root整套回归仍有实际红灯，不能将局部绿测试视为质量完成。

<a id="specification-output"></a>
## 规范轴

Reviewer: native:/root/memory_integration_review
Axis: specification
Result: request-changes
Input-SHA256: f0db44427b4ba9d0290571b922254780c0f098a1d833300a9ab2b710c5322e37
Observed: 以T14行为/AC、123上下文与146恢复合同检查真实实现及消费者；F1/F2独立提出后实测，F3由Root提供具体假设后独立用真实Core结果验证。未以作者报告或139组件pass代替集成结论。

F1直接违反T14“普通聊天成功不依赖维护成功”与失败后聊天已保存；F2违反123 §2.2中temporary经实际GroupBinding取得已授群范围；F3违反123 §6实际上下文可查询、空alias保留身份而不重复正文的合同。以下是两个轴共同引用的可证伪finding，而非把同一问题重复计数。

## Findings

### F1 — P1：合法128来源的普通聊天被自动维护容量错误回滚

位置：`native/huhubot/internal/adapters/outbound/sqlite/memory/completion.go:130`；事务影响点 `native/huhubot/internal/adapters/outbound/sqlite/execution/executor.go:693`。限制来源 `memory/dependencies.go:44`；应用Executor忽略Finalize返回位于 `internal/application/execution/executor/executor.go:336`。

实际入口是 `API.Conversation` 建立direct session并连续发送正常短消息，注入只返回finished文本的Engine，使用默认Core与真实SQLite，未直接修改数据库或关闭权限。每轮等待实际终态，沿用fixture的7秒观察期限。第1–64轮均succeeded；第64轮Run.Derived=127，assistant消息1、completion outbox1。第65轮Run.Derived=128，在7秒截止仍running，assistant消息0、completion outbox0。该fixture没有模型配置，因此task pins为0；本实证不声称泄漏了配置pin。原输出见 `logs/provenance.log`，命令实际Wait40.078067s、exit1，测试自身38.79s。

静态因果链：RecordOutput为刚接受的正常输出保存完整128个已消费依赖；RecordCompletion读取同一Run的128闭包后，把新输出本身source.Ref作为维护输入加入，唯一来源达129，mergeRefs返回RESOURCE_LIMIT/MEMORY_PROVENANCE_LIMIT。该错误直接穿透同一Finalize事务，连已写的assistant消息及succeeded状态一起回滚；应用Executor忽略Finalize错误，因此本次工作退出后数据库仍是running。测试直接证明外部状态，错误码与事务传播由源码确定；没有新增故障注入或人为缩短超时。

最小修复方向：在维护受理处保守处理不可受理的129来源容量，保证普通成功消息、实际完整依赖、终态、会话活跃标记与资源释放原子提交；维护可以留下明确不可受理事实或按合同不启动，但不能把此类维护资格失败变成聊天失败。**不得截断已消费闭包、把128限制提高或删除来源来造绿**。不能只跳过outbox而停止审查下游：输出本身的依赖闭包仍可合法为128；ReadFacts读取该owner的128祖先与下一轮Plan加入该消息自身成为129是不同边界。当前Plan `context_plan.go:201–216` 对可选recent来源的合并RESOURCE_LIMIT会整项省略，inbox必需输入则保守拒绝；ReadFacts/History与qualification仍需保留真实闭包、当前撤权检查，不得把容量当任意坏数据的通用可忽略错误。此下一轮行为只是静态预期，尚未在修复后实测。

必要回归：保留此第65轮反例并继续至第70轮以上，核每轮可终止、消息/回执/active_run一致；检查第65轮完整128依赖和之后history/ReadFacts/模型选中内容一致，省略可选项有安全计数且未截断正文的来源。再覆盖有实际配置pin/child slot、维护预算关闭、必需inbox超限、依赖当前撤权/遗忘、失败和重启；不能仅断言Finalize不报错。

### F2 — P2：temporary的真实群资格没有进入新ShortTerm历史选择

位置：`native/huhubot/internal/adapters/outbound/sqlite/memory/context_plan.go:299`。

真实API创建群及coordinator A、模型成员B；B允许temporary delegate。第一轮由B产生公开 `PUBLIC_SENTINEL_151`，等待完成后第二轮B创建temporary任务。被调用temporary的Config.Kind=temporary、SponsorAgentID=B、Lineage.Group.Members包含同一B、incarnation=1/historyRevision=1；但ShortTerm.Entries=0，完全没有本已公开且获准的第一轮历史。探针原输出见 `logs/temporary.log`，测试0.11s，命令Wait5.584661s、exit1；没有靠复制Sponsor私有库制造候选。

原因是groupAudience只在Namespace.Kind=agent且成员等于Run.AgentID时成立，temporary落入仅查自己work_thread的collaboration_messages分支。新extractive-v1消费路径不再走旧ModelHistory补充，故这不是另一消费者稍后补上的显示遗漏。旧 `groups/history.go:49` 和当前 `groups/context.go:35` 都把temporary的真实群audience解析到已绑定Sponsor；123 §2.2明确允许此实际GroupBinding的公开范围，同时禁止继承Sponsor短期私聊/长期库。

最小修复方向：为新候选选择复用与真实GroupBinding一致的audience资格，再通过现PublicMessageVisible/当前member incarnation/historyRevision及read+send门；保持temporary自己的namespace/thread，绝不将SponsorID替代其私有上下文。验证获准public正文可见，none/range/join_seq正确，member移除/重入后旧binding失效，外部existing无绑定不能取得群历史，Sponsor私聊/长期记忆始终不泄露。保留本两轮真实Core探针，不以仅断言GroupBinding存在替代正文消费证明。

### F3 — P2：合法空intent alias可通过API却不能通过HAP结果schema

位置：`contracts/hap/v0.1/generate.mjs:107`（同函数119行先给所有text设minLength1，partCount分支只覆盖maxLength）；生成的schema.json与Go/TS镜像中readable context entry保留错误下界。

使用现有真实aliasQuestionFixture通过agents.message创建问答child，查询其实际 `Memory.Get(kind=context)`，而非手工构造DTO。结果包含1条state=readable、representation=intent_alias、Text指向空串的真实entry；`api.ValidateMemoryResult("memory.get", object)`通过，JSON共1572bytes；同一JSON的 `wire.ValidateMethod("memory.get","result", raw)`拒绝：`HAP payload does not match contract`。原输出 `logs/alias-wire.log`，测试0.15s、命令Wait1.441299s、exit1。这是Root静态假设经本agent独立复证，不冒称是本agent运行了物理CLI。

API `context.go:287`允许空串，context_view `renderContextEntry`保存空alias的原来源/hash且生成0..0展示片段、PartCount1；此空串正是避免重复Intent正文的合法形态，149也明确验证它。memoryBound的普遍text下界与该合法形态冲突。Root真实物理CLI r2已经记录5个HTTP完成后某HAP查询INVALID_APPLICATION_RESULT；截至本报告其具体查询步骤仍由Root定位，因此独立finding以API→wire反例为证，不把该CLI错误未经确认全部归于本项。

最小修复方向：在context readable的schema生成规则中允许合法空alias展示值，并重建所有受管schema/fixtures/TS产物，保持真正需要非空的记忆正文和请求text下界；不要用向alias填重复正文的方式绕过校验。回归需真实Memory.Get→router/stdio→生产TS结果校验，确认空alias一次可读、元数据/hash/分页语义不变，非空非法alias/缺字段/不合法非alias仍拒绝，三个SDK原始sealed前缀不变。

## 风险覆盖与证据边界

| 风险 | 本次检查与结论边界 |
|---|---|
| 初始seal/恢复hydrate/原始来源 | 阅读Plan、ReadInput/ReadContext、body-free存储、Manifest/BindingDigest及原文hash/namespace校验。149仅将可选View.SourceSpans的nil/empty作语义等价；模型Short.Spans、原ShortTerm、Canonical digest、body/namespace/current principal仍严格，未发现以放宽完整性造绿。空alias向wire失败另见F3。 |
| 当前授权/最后外发 | 跟踪sourceAccess→Grants memory facts→Host/source/current namespace→read+send，以及events/History/context/stdio DeliverySubjects在实际写出前重新入门。ReadFacts保留原来源与接收者双向资格，不因父或B有更宽Grant洗成A权限；temporary私有namespace未替换Sponsor。F2是public选择不足，不是权限扩张。权限竞争作者证据可按闭包复用，未新增全并发压力结论。 |
| 记忆持久化/竞争 | 阅读correct/forget/pin、generation/target head、suppression、candidate/receipt/index/dependency事务与迟到结果丢弃。维护不是全局提升；fixed项/用户修订不能被旧job直接覆盖。F1揭示完成阶段跨事务职责的合法边界遗漏，其他静态未发现反例不等于穷举全部竞争。 |
| 预算/生命周期 | Core实际装配memory、grants、execution；maintenance由同Executor、独立purpose/job/Run和实际Attempts接入。默认额度0不产生HTTP；shutdown先关maintenance admission、实际producer结束后再关DB，不把超时当释放。预算/usage未知、取消、迟到返回相关作者证据只覆盖其测得情形；F1表明零额度也须先通过出错的completion合并，不能以不收费排除影响。 |
| schema8→10/旧checkpoint | 阅读新migration注册及旧SQL/CP保持；ContextPolicy空走旧路径，新上下文/ResumeInbox不回填为旧History。147原opaque/工具位置/前驱receipt继续校验；未对用户真实历史profile作现场迁移。 |
| 146/147 ResumeInbox | SaveResume事务重查、持久Decision已存在不吸晚到消息；SDK共同消费者按receipt identity去重而非同文/hash，恢复pending工具位置与固定sealed前缀。读147三协议真实SDK loopback证据，不能扩大为同一Core/SQL树证明。Root完整r2的非法补充包红灯未被这些绿定向测试抵消。 |
| 149/150原消费者维护 | 149可选显示span修复与坏span/body/namespace反例保持；原三Run两次Resume和新增两Run资源证据明确分开。150改为Decision.ResumeInbox、Input.Messages空，保留CP digest/来源身份/SQL slot+pins与同文不同ID。closed canceled历史wait edge不再调度，不能称物理行全删；后续purge归T17。 |
| 143性能与128边界 | set累积后稳定排序保留身份冲突/cycle及每owner128。真实50Run/100messages门34ms、800sources/400sessions门41ms是作者固定环境证据，前者是稠密有限深度、后者浅图；不推成所有极限图都低于250ms。本独立第65轮反例覆盖其50轮证据未触达的合法上界。 |
| 页预算/typed结果 | 检查UTF8片段、预算含JSON编码/metadata、合法最大页、Go与TS校验一致性及最后delivery门。RootWhite_Space修复与全部Unicode标量等价日志支持TrimSpace边界，包括NEL而不把BOM当空白；本次未重跑全标量。F3显示typed+wire仍存在一个合法形态冲突。 |
| UI/后续工作 | T15 global Propose/Resolve、T24UI等未进入本阶段，显式METHOD_NOT_AVAILABLE不构成本T14遗漏。未请求凭证；真实Provider、Obsidian和目标OS均user-owned/not-run，不能冒称完成现场验收。 |

## 产物与验证

独立探针先获Root明确独占Go窗口，复制冻结范围中424份Go module/contracts文件至 `/tmp/huhu-151-review/repo`，核全部原bytes/mode。只新增3个独立测试文件，未改原测试/产品副本源码。运行固定绝对Go1.26.10；GOTOOLCHAIN=local、GOWORK=off、GOEXPERIMENT空、GOFLAGS=-mod=readonly、GOPROXY=off、CGO_ENABLED=0；串行-p=1/count=1。原始GoList两次共487个distinct package条目、240份本地实际源码/测试/embed闭包（含3探针）见 `logs/actual-go-list-closure.json`；模块/工具链与原GoList均留存，不将只有测试文件的hash冒充完整输入。

| 命令 | 实际结果 |
|---|---|
| 绝对Go version | exit0，Wait0.003498s |
| go list -deps -test -json ./tests/contract/groups ./tests/contract/private-memory | exit0，Wait0.139374s |
| go test -p=1 -count=1 -timeout=60s -v ./tests/contract/groups -run ^Test151TemporaryKeepsAuthorizedGroupTranscript$ | exit1，Wait5.584661s，F2 |
| go test -p=1 -count=1 -timeout=180s -v ./tests/contract/private-memory -run ^Test151OrdinaryChatRemainsTerminalAtProvenanceLimit$ | exit1，Wait40.078067s，F1 |
| go list -deps -test -json ./tests/contract/private-memory（加入alias探针后） | exit0，Wait0.128442s |
| go test -p=1 -count=1 -timeout=60s -v ./tests/contract/private-memory -run ^Test151ReadableEmptyAliasCrossesWire$ | exit1，Wait1.441299s，F3 |

以上开始/结束source与snapshot bytes/mode drift=[]，完整2137交付前复核亦=[]。自有探针无网络模型调用、未运行race/vet或重跑完整矩阵；三者红灯是真实断言失败，非编译/环境失败。`logs/probe-results.json`、`logs/alias-results.json`含实际argv/cwd/exit/wait/output hash；3份probe测试与runner脚本、snapshot清单、原GoList及stdout一并归档。probe源码与模式以最终manifest为准。

另外只读核验Root `lead-memory-regression-r2.json`：完整go test ./... exit1，Wait196.313626622s、424输入source/snapshot无漂移，唯一报红 `foundation/TestInvalidWaitingSupplementDoesNotLeaveRunningClaimOrPins` 的middle Run仍waiting_children Rev4（预期failed）。此前146定向绿不能覆盖该整套红；152仅接受根因诊断，不在本报告杜撰已修复或fixture结论。原r1/145三类红、146/147消费者红、148/149 Claim拒绝均保留，未删或改成pass。

Root `lead-memory-ts-build-r2.json` 的生产pnpm lint/build均exit0（Wait57.0854s/33.9613s），snapshot/source无漂移；构建产物摘要记录在该日志。Root物理CLI r2按其已Wait通知：生产TS→stdio→默认CLI→真实Chat SDK loopback共5HTTP（A2/B2/C1），补充/答案一次及初始prefix断言通过，三Run succeeded、slot/pin0；后段HAP查询INVALID_APPLICATION_RESULT，CLI自然exit0，故整条E2E仍不通过。r1只是Root探针把内部ShortTerm字段误写小写的fixture错误，原证据保留；没有把r2产品候选失败也归为同类。完整Responses/Anthropic新物理E2E、必要race/vet/架构tooling最终门由Root继续组织，本独立审查没有替其签署。

## 问题与下一步

Root需把F1–F3及未解除的foundation整套回归分别交原owner处理并保持源/证据分层。修复后重新冻结实质变化的输入，完成对应反例与受影响消费者验证，再取得独立双轴审查；本f0db快照结论不会因后续修复自动变为pass。T14的最终代码门、CLI查询定位及后续DAG由Root维护。本报告及工件仅151 owner写入；return结构校验原输出和实际Wait见 `logs/return-validation.*`，冻结清单见 `manifest.json`，原生MESSAGE+FINAL后停止写入。
