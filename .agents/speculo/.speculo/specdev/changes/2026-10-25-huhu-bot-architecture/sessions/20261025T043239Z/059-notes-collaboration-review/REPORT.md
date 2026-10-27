# 单笔记效果与协作策略联合候选独立双轴审查

Session: 20261025T043239Z
Task: 059-notes-collaboration-review
Status: completed

## 聚焦交接

标准轴 **request-changes**；规范轴 **request-changes**。发现三个独立问题：**P1 协作工具绕过固定 AllowedTools；P2 撤权的 queued question 反复回滚 Claim，阻塞无关根任务；P2 委派 constraints/expectedOutput 未传入子 Engine**。每项均通过当前生产装配、真实 Executor/SQLite 和受控 Engine 复现，含正常对照；没有修改生产实现或永久测试。通过的现有套件不能覆盖这三个反例。

Reviewer: `native:/root/foundation_review`，未参与本候选实现/修复，未再委派。沿既有 gpt-6-astra/high 派遣偏好，不冒称运行时模型 attestation。本轮实现者为原 `native:/root/foundation_go`、`native:/root/credential_provider`、`native:/root/foundation_client` 与 `native:/root/build_integration`；052/053/054/058/061/062最终REPORT均完整回读。历史候选的其他实现者/独立审查身份沿其原始记录，未改名自审。

唯一输入：`evidence/T-07.md#review-input-notes-r1`，**Input-SHA256: 63e74529e1059fcd86c814621dce91c22c9ad9440c47ba8ecc0f779978b74a98**；257文件、65来源；HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，branch `NAMEWTA/bot`，Map16/Goal15。TASK SHA256 `5412b03db39ac9e1091936f60483eb6b4b5ffaa34ceeff849fb82cfd04cc9c6c`。

独立重新解析实际 `scope.scope_paths`，比较完整工作副本、index、mode、HEAD/base及所有来源原字节/锚点。相对050，140文件变化或新增、117文件相同，20来源变化/新增、45来源相同。完整输入保存于 [input.json](logs/input.json)，差异清单 [changed.json](logs/changed.json)，起始、测试后及末次核对分别在 [input-start.log](logs/input-start.log)、[input-after-tests.log](logs/input-after-tests.log)、[input-final.log](logs/input-final.log)。范围外导航/报告工件增加不改变冻结scope，不重新取候选。旧050/040/033等结论只在文件摘要相同且本次影响未推翻时复用，不把旧通过当新代码已验收。

先按TASK提出可证伪假设：Host异步间隙可能误写；取消/重建可能提前归还真实资源；回执可能伪造成功；迁移恢复集可能遗漏终态CP；协作受理/Claim/工具端可能绕过当前权限或丢失参数；取消/汇合可能复活旧父或掩盖partial；预算和来源在重开、等待、Reply时可能换根失效。下面分别记录实际支持的反例和其余闭包观察。

## 产物与验证

所有新增反例仅在 `/tmp/huhu-notes-review/repo` 的当前精确副本追加探针；副本201个冻结Go/合同文件逐项与候选一致，见 [external-copy-manifest.json](logs/external-copy-manifest.json)。只新增外部probe，不改副本生产代码。源探针保存在本任务 [probes](probes/)，未加入永久测试。临时Profile由测试创建并Close清理；持久SQL状态的实际查询结果保存在原始日志，未假称已保留这些已清理Profile的数据库文件。

| 独立执行 | 实际结果与证据 |
| --- | --- |
| 八包 normal：effect-reconcile、delegation、collaboration-policy、approval、access、chat、events、foundation；`go test -mod=readonly -timeout=6m -p=1 -count=1 -v` | [normal-suites.log](logs/normal-suites.log)，exit0，全部完成/Wait。含真实Go→Node生产TS Host factory、审批/恢复、CP crash、历史授权、HAP合同与取消。各包1.271/3.868/0.285/1.733/1.645/1.556/15.360/4.419s。 |
| 独占 race：events、delegation、collaboration-policy、effect-reconcile；`go test -mod=readonly -race -timeout=8m -p=1 -count=1 -v` | [race-suites.log](logs/race-suites.log)，exit0，无data race；166.448/47.094/4.030/10.364s。原有来源100与800门保持250ms，实际分别32.10404ms、220.73975ms；无来源800为151.55026ms。 |
| 同一来源门 normal | 100 source messages/单Session50个公开Run为2.290958ms；800 source messages为14.017664ms。800是400个实际Run的直接gate上界，未冒称单条跨Session History RPC。normal/race均保留当前来源、Grant、撤权拒绝与writer断言。 |
| 151 TS消费者 | [ts-consumers.log](logs/ts-consumers.log)，15文件151项exit0、2.01s；connection/codec/validator/config-hash、Sources、note-effects/receipt/key、HostWrite/HostRead、EventClient/reducer/assistant。包含65536最大事件补页及取消/迟到状态边界。 |
| 原真实schema5 waiting/terminal恢复集 | [migration-old-v5.log](logs/migration-old-v5.log)，8个子场景exit0、0.148s。复制并完整回读Root原 [lead-migration_test.go](probes/lead-migration_test.go) 后独立执行，明确不是本reviewer原创探针。使用原 `/tmp/huhu-lead-v5-fixtures-v87ic335/fixtures`，两个472-byte完整HUHUCP1 envelope摘要e8a8e61f…/69b517e1…；迁移5→7、独立恢复、live被移除后仍可读、非硬链接；缺失/损坏、manifest失败、无完整CP处理器均迁移前拒绝。 |
| queued question撤权反例与正常对照 | 最终 [queue-revocation-r3.log](logs/queue-revocation-r3.log)，exit1来自行为断言；未撤权对照通过，撤权后无关根1200ms仍accepted，总child_slot=0，公开CancelTask后无重启恢复。初版 [queue-revocation.log](logs/queue-revocation.log) 和 [r2](logs/queue-revocation-r2.log) 原样保留；r2额外SQL误用了type列，是探针错误，已改为event_type，不算产品finding。最终探针 [reviewer_queue_test.go](probes/reviewer_queue_test.go)。 |
| 委派要求与工具白名单反例 | [delegation-boundaries.log](logs/delegation-boundaries.log)，exit1来自三个实际负向分支：existing/temporary要求丢失及allowed=false工具绕过；allowed=true正常对照通过。源 [reviewer_envelope_test.go](probes/reviewer_envelope_test.go)、[reviewer_tools_test.go](probes/reviewer_tools_test.go)。 |
| Root插件及联合E2E证据 | 完整回读 `evidence/T-07-logs/lead-note-e2e-r2.json`、`lead-plugin-checks-r3.json`、`e2e-fixture-reuse-r1.json`及实际原始日志。Root build exit0/38.506s，最终lint exit0/66.667s，151TS exit0；r2真实TS→Go→Host3次mutation（2update/1create）、新lease只读恢复、协作/预算/Reply均通过。属于Root执行，本reviewer没有重新构建插件或改main.js/styles.css。 |

命令/退出见 [commands.json](logs/commands.json)；前三次queue探针提供可复放的等价argv，不冒称重建了原工具调用的逐字节argv，原输出与各版源码均保留。本reviewer为 [toolchain.log](logs/toolchain.log) 所示 **go1.27.1 linux/amd64**；052/053/Root本轮所记录为 **go1.26.10**。两者不合并成同环境重复样本；计时仅为此次独占窗口观察，不承诺所有机器耗时相同。本轮没有为择绿重跑同一性能测量。

历史红灯均保留且已回读：052原默认bridge审批后waiting、整Go r2删除Assistant在单连接事务内checkpoint自锁超时；053 LOG080取消/嵌套partial原失败与实际后继绿、LOG082 tasks.reply来源及agents.message kind=reply提前分支原失败与修复；052 r3的270/3s SQLite interrupted、800 source 252.987151ms超250ms、终态child_slot未结束三个并发失败。孤立270和policy投影控制、最终Run-only projection改善及producer真正结束清理有原始依据，没有抬预算或删除来源输入。本次独立normal/race在最终候选通过支持该处置，但不改写早期失败。

061只修旧TS limits夹具为既定3/32/4/8/8，原150通过/1失败保留；062只在既有工具测试分类增加两个精确MJS，src生产规则未屏蔽。Root E2E r1将metadata-only CancelTask误当含Outcome回执的exit1保留；r2立即公开GetTask核对Outcome，不是放宽产品断言。051/056/057研究矩阵未当作实跑结果。058 fresh-vault强杀后新增Wait与文档只读核对，未运行真实Obsidian。

<a id="standards-output"></a>

## standards-output

Reviewer: native:/root/foundation_review
Axis: standards
Result: request-changes
Input-SHA256: 63e74529e1059fcd86c814621dce91c22c9ad9440c47ba8ecc0f779978b74a98
Observed: 对257文件完整候选及65来源执行风险审查，复用逐项相同且未失效的历史观察，独立验证实际消费者与三个新反例。本轴以正确性、安全、错误隔离、资源、并发、恢复和项目边界判断；三个finding未由现有通过套件消除。

### STD-01 · P1 · 协作工具跳过固定工具白名单

位置：`native/huhubot/internal/application/tooling/broker/service.go:161–171`；`internal/application/tooling/collaboration-tools/service.go:20–45`；`internal/adapters/outbound/sqlite/collaboration/store.go:302–306`（均以`native/huhubot/`为根）。

Broker的`c.Name != "note.write"`分支直接调用collaboration，位于`allowed(x.Agent)`之前。协作工具入口核身份/claim及payload形状，但没有检查固定Agent的AllowedTools；existing委派只核AllowedCollaborationTargets，而temporary另核agents.delegate。结果是**明确禁止工具的执行仍可创建子执行和持久消息**，目标白名单不能代替工具白名单。

最小实际输入：A固定`AllowedTools=[]`，`AllowedCollaborationTargets=[B]`，无Source；通过公开Assistant/Session/Run API启动A，真实Engine使用Executor提供的绑定Tools分别Invoke `agents.delegate(target=existing B)`与`agents.message(kind=notify,target=B)`。两者error均nil，SQLite child=1、notifyMessage=1，真实子Engine calls=1。同一配置只增加两个允许工具的控制组正常通过。未自造ToolExecution或直接调用Store，未访问真实Provider。这不是未来模型adapter才有的问题：当前受信Broker已接受并提交禁止的命令。未据此声称绕过Source/Grant或写Vault，其他资格仍独立存在。

依据：仓库安全边界与固定配置合同；受信调用入口不能只靠未来模型工具列表隐藏方法。工具路由与能力判定分离使note.write与协作形成可绕过分支。

最小满足条件：绑定工具边界对实际固定配置中的每个工具做明确判定，不能因existing target有权限就绕过工具capability；原空白名单反例须在任何任务/消息/receipt副作用前拒绝，两个正常控制仍通过。核对同一协作路由的其余工具、temporary及嵌套工具，但不把用户公开API误当模型工具强行套错主体；保持原Source/recipient/claim/取消/预算检查。

### STD-02 · P2 · queued question撤权使无关accepted根长期饥饿

位置：`native/huhubot/internal/adapters/outbound/sqlite/execution/executor.go:64–98,166–172`；`internal/adapters/outbound/sqlite/usage/messages.go:58–65`；`internal/application/execution/executor/executor.go:80–83`。

Claim按created_at选择最早accepted并在Tx里占槽/改preparing，随后MessagesInTx对持久question正文复核当前read/send。撤销目标Grant后返回typed `CAPABILITY_DENIED`；Claim直接返回错误，整个Tx回滚，所以该Run仍accepted、无preparing事件且槽位归零。scan遇error停止本轮，100ms后再次选择同一项。后续其他Session、无来源的新根也无法进入Engine。

实际反例：源A/B均先有合法Grant；根运行中创建4个真实held子占满默认rootChildren=4，第5个question合法受理且accepted/child_slot=0；公开Revoke B Grant，再释放4个实际producer并等总slot=0，随后启动独立source-free根。1200ms后question与无关根均accepted、question preparing事件0、4个held子均已failed且slot0、question持久消息1；不是运行槽未释放。公开取消该question后，无需重启，无关Engine立即进入。未撤权对照正常。

依据：可区分的业务拒绝不应使无关已授权工作失去进展；当前行已不具备执行资格，却仍作为调度首项重复失败。错误处理规则要求保留失败事实并允许独立工作继续。实际观察窗口为1200ms；静态路径显示在该行/父状态或授权被其他操作改变之前反复选择同项，不声称已经观测无限时间。

最小满足条件：当前权限拒绝须得到可见、持久且有界的该任务处置，使后续无关accepted项继续执行；不得调用被撤权question的Engine或删去授权复核。原正常对照、撤权失败隔离、零资源泄漏、普通父结果消费应成立。**不能把所有读取错误吞成跳过/成功**：SQL Query/Scan/rows.Err、损坏持久数据等仍需原样保持错误与事务保证；`api.Fault`业务拒绝与基础设施失败须按真实类型/阶段区分。此轮实际证明的是正常公共Revoke导致的稳定拒绝，不是注入数据库损坏。

### STD-03 · P2 · 委派约束与预期输出仅保存，未进入执行输入

位置：`native/huhubot/internal/adapters/outbound/sqlite/collaboration/store.go:352–395,404`；`internal/adapters/outbound/sqlite/execution/children.go:12–18,93`；`internal/adapters/outbound/sqlite/execution/executor.go:151,179`；`internal/application/api/conversation.go`的EngineInput。

Delegate验证并持久保存Constraints和ExpectedOutput，但构造ChildAdmission时仅传`task`及上下文正文，ChildAdmission没有这两个字段；Claim仅从execution_runs.intent读Intent。全实现检索显示两字段仅在校验/INSERT出现，无下游读取。GetTask/绑定工具结果也不提供这些要求供子执行补取。

实际反例分别使用existing与temporary目标，Task=`summarize records`，非空Constraints/ExpectedOutput放独有标记。SQL查得两个字段完整持久化，真实子Engine的Intent正确且已执行；序列化全部EngineInput数据字段后，两个标记均不存在（仅移除Tools/Attempts/Checkpoints服务接口）。因此合法委派可以忽略明确的限制和输出格式并报告成功。尚未接真实模型不是豁免：当前Engine port已经丢数据，未来adapter无法恢复未收到的信息。

依据：公共命令的有效字段必须到达其真实消费者；保存并返回accepted不能代替执行合同。要求的丢失不是人格配置变化，也不是子工作线程隔离的必要代价。

最小满足条件：两类子执行应从实际持久受理事实获得完整task/constraints/expectedOutput（结构化或明确、有界的执行输入），启动及恢复/Resume保持一致；不从调用者临时对象或其他Bot私聊补齐。原标记输入真实到达Engine，约束/正文总预算、ContextEnvelope及provenance保持，已有只读目录不泄露私有任务正文。

### 其余适用风险闭包

Host写入：factory只装配一个BotHost/Source registry；更新目标来自捕获的TFile/leaf，创建来自可信TFolder与候选名。prepare/check/invoke核完整identity/lease/revision/hash/fingerprint；所有匹配编辑器叶子及deferred状态检查、异步后registry对象身份和同步Vault.process CAS仍在。审批后目标变化/dirty/rename/delete/replacement均拒绝。仅原可信路径调用Vault.create/process，不创建新通用文件写入口。当前Host suite与真实Go→TS受控Vault集成均通过，未见额外可复现误写。

生命周期：App共享8个真实操作/2MiB与目标队列跨dispose保留；逻辑取消/超时不释放未settle的Vault promise，drained等实际结束。HAP每请求取消只影响对应server-request；迟到关联集合、pending/byte/TTL和seen上界可定位，唯一late response被吸收，未知仍严格关闭。取消一个写不杀兄弟，已取消Run收到迟到实际完成只记效果，不复活Run。Node/Go当前真实集成含 held write、cancel、健康兄弟、late reconcile与Wait。

回执：32-byte随机HMAC key仅App localStorage，回执/index签名与完整归属/指纹绑定；received不是committed，缺坏key不覆盖/自动生成，query只读不重放；completed写入和读回后才可证明原commit，缺失/损坏证据只能核真实后置hash作reconciled/unknown。目录/文件摘要、长度/数量上界及同步排除与docs吻合；文档不声称防御恶意宿主/OS或已完成portable/清除。原正文、CP和Provider secret不写该回执，key不经HAP。

迁移：数据库锁/预检后，在旧schema迁移前独立备份DB与**全部已登记**CP，包括终态；CopyEnvelope验证完整编码artifact与大小/hash，fsync并最后发布manifest；迁移失败保留原schema，不以DB-only副本冒充完整恢复。独立运行旧5→7 waiting/terminal原库及故障集合支持，不把当前制造的marker4夹具单独当旧版本迁移证据。SQLite/Profile与Vault回执权威没有混合。

协作：existing/temporary/再委派共用原Executor；独立thread与临时config/credential pin、真实Sponsor/currentrecipient与template映射有持久来源，公开Go/TS config-hash goldens一致。查询最小字段、B私聊隔离、来源继承/收紧、当前recipient/read/send/deliver分别核查。除上述三项外，显式SourceRefs在普通message与reply提前分支均检查，不静默接受foreign source；subset保留实际完整provenance。当前normal/race的正常与拒绝输入、CP真实Resume/parent_results通过。

取消/汇合：受理、固定策略、task/receipt/线程在同Tx；accepted不占运行槽，实际producer结束再释放；waiting期间可子执行。取消子树原子关闭准入，queued/waiting/running均落无正文Outcome，普通汇合、CP Resume/GetTask消费其partial；嵌套取消+成功逐层partial不会被某个成功兄弟抹掉。终态Reply新执行根保留原budgetRoot，旧父不复活。最早queued消息资格失败的进展问题单独列STD-02，不因其余取消测试绿而隐藏。

预算：物理模型请求绑定Attempts，默认三项canonical零；根受理同Tx固定3/32/4/8/8与预算，重开Options不覆盖，用户CAS持久配置不暴露给模型工具；Reserve/Dispatch间下调/暂停、共享Profile/maintenance、unknown保守计费与幂等撤回当前套件通过。取消或终态Reply不换budgetRoot规避。源/事件共享读优化只省Run读中无用policy投影，当前100/800/250ms、832Grant、65536事件、逐消息snapshot来源与当前撤权语义未放宽。

模块/标准：按AGENTS→workspace/catalog→dev与code-review/risk/error/test规则检查；新业务仍在application/domain/adapters边界，生成合同唯一，TS宿主使用Vault API，库外Profile归Go；无新远端服务/依赖/许可引入。Fowler启发式用于定位风险，未把命名/文件长度等偏好列为finding。051运行根、058三路径和062精确lint切片只按当前范围验，不宣称T27整票完成。117个未变文件的凭证、锁/WAL等未受影响观察按050/033复用，未重跑旧默认D-Bus或平台全矩阵。

Findings: STD-01(P1), STD-02(P2), STD-03(P2).

<a id="specification-output"></a>

## specification-output

Reviewer: native:/root/foundation_review
Axis: specification
Result: request-changes
Input-SHA256: 63e74529e1059fcd86c814621dce91c22c9ad9440c47ba8ecc0f779978b74a98
Observed: 独立按Spec/ARCH、T07/T11/T12各固定锚点、T01/T02/T03/T05/T06维护、LOG051及LOG072–082和对应项目标准判断。相同三个实证违反当前公开执行合同，以下为本轴原始判定；不由标准轴或作者全绿推导通过。

### SPEC-01 · P1 · AllowedTools与协作目标没有形成能力交集

`spec.md:51`区分允许工具与协作目标，`:128`要求工具经HUHU Broker；T11行为/实施合同要求受理前目标、来源、接收方、**能力**交集。`tooling/broker/service.go:161–165`提前路由、`collaboration-tools/service.go:20`无白名单核验、`collaboration/store.go:302–306`existing仅核目标，导致固定AllowedTools=[]的真实Engine仍委派并notify，实际持久child/message且child执行。正常允许组通过，原始输入/输出见delegation-boundaries.log。

此为当前工具能力合同违例，不依赖未来T08–10真实协议、不是缺UI验收。最小满足条件同STD-01的实际反例：在模型绑定端拒绝不在固定白名单中的协作工具且无副作用，允许组及独立Source/target/预算/claim合同仍成立；用户显式API主体不混同模型主体。未证明任意Source泄漏或note.write审批绕过，不扩大影响。

### SPEC-02 · P2 · 当前撤权生效却破坏其他任务的有界进展

Spec当前撤权交集与T11/T12受理/queued执行/取消结果合同要求真实资格在执行时再验，独立的合法工作仍可调度。`sqlite/execution/executor.go:166–172`把MessagesInTx当前拒绝当整轮Claim失败，`executor/executor.go:80–83`立即break；最早accepted保持不变，下一tick再次重试。公开四slot+queued question+Revoke+独立无Source根的实际输入表明总slot0仍不执行，公开取消毒化question后立即恢复；未把1200ms实测夸大为无限时间观测。

不能通过取消权限重验或让旧question继续执行满足合同；应给拒绝任务有界可见的持久结果，同时后续独立根可继续，父/CP/query正确消费，基础设施故障不能被伪装成功。当前仅证明公共Revoke触发的typed业务拒绝路径；未知SQL错误是需保持的边界，不是假称已全面故障注入通过。

### SPEC-03 · P2 · agents.delegate公开的执行要求没有消费者

`spec.md:75`的agents.delegate包含task、constraints、expectedOutput、ContextEnvelope并隔离执行；当前`collaboration/store.go:395,404`保存后仅task进入ChildAdmission，`execution/executor.go:179`只读intent。existing与temporary公开命令都已持久受理且子Engine真正运行，但全部EngineInput数据没有两字段标记，查询也无法补取。

最小满足条件为真实子执行能从原受理事实获得并消费所有要求，恢复路径一致，保留预算/来源/线程隔离，不通过删除字段或将其解释成无效展示字段规避。未知Provider行为留给后续票，但当前Engine输入必须完整，不能等未来adapter凭空恢复。

### 其余规范与验收边界

T07现有真实App factory、可信捕获、单笔记approve/reject/cancel、dirty/lease/revision/CAS、丢包/回执损坏只读核查、未知不重派合同有生产路径与受控实际消费者支撑。LOG074本机HMAC键归属、LOG077 helper归属及051运行根边界与docs一致；T07 code验收不等于真实Obsidian/OS已运行。

T11临时配置/公开hash、独立工作线程、真实来源流向、目录与proposal最小数据、同Executor/Engine没有伪造持久Bot；T12策略固定、根/全局slot、waiting、取消Outcome/partial、CP Resume、旧budgetRoot和公共持久预算由当前实际normal/race验证，三项缺陷之外未见额外已证实偏离。LOG080/082红绿均保留，不把研究矩阵当验收；Constraints丢失不能用“已存入数据库”代替规范执行。

T01/T02/T03/T05/T06共享维护实际核对protocol取消/有限关联、schema/DTO strict、配置pin、历史与精确来源、准入与审批CP、既有事件门。旧schema5完整恢复集门已独立实跑；没有将其称为T16/T17/T19完整用户恢复/清除/备份交付。T08–10真实协议adapter、T13群路由、记忆、portable、模块UI和T27最终资产/许可仍按后续票，不作为本轮额外缺陷，也不提前宣布28票/55AC完成。

Findings: SPEC-01(P1), SPEC-02(P2), SPEC-03(P2). 与标准轴对应同三项实际缺陷，跨轴不重复计为六项。

## 问题与下一步

请Root完整回读后按原owner安排三项精确修复，再固定新候选补审；本reviewer未修生产、未改永久测试、未提交/推送/发布或更新正式状态。以上最小满足条件保留原失败输入/权限语义/资源预算，不预设吞错或扩大能力的修复。

所有自有测试命令均实际结束并Wait，Go Core.Close等待Executor及producer；测试子进程/pipe/Node fixture均走自己的完成与Wait，未留下writer。最后进程清点、完整输入与结构校验在 [final-cleanup.json](logs/final-cleanup.json)、[input-final.log](logs/input-final.log)、[return.log](logs/return.log)。结构校验仅验证交回格式，不认证审查质量或抹去request-changes。完成实际交回后停写并释放重测试窗口。

真实Provider/模型、Obsidian、用户Vault、目标Windows/macOS及宿主keyring现场均 **user-owned / not-run**。未索凭证、未访问用户keyring或运行旧默认D-Bus自动激活fixture。本轮受控Engine/Host、Linux pipe、SQLite与生产TS→Go消费者证明其明确列出的代码边界，不等同用户现场验收。
