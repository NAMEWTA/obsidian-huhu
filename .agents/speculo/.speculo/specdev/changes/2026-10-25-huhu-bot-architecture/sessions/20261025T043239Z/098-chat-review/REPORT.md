# Chat 默认产品链独立双轴审查

Session: 20261025T043239Z
Task: 098-chat-review
Status: completed

## 聚焦交接

标准轴 **request-changes**，规范轴 **request-changes**。确认两项 P2：恢复载荷没有与原受理 Intent 绑定；原始 SSE 中非法 UTF-8 经 SDK 解码后绕过工具参数的严格检查。均有固定副本、实际 SDK/HTTP/Application/Broker/SQLite 的独立反例及正常控制。没有修改生产或永久测试，没有提交、推送、发布或归档，没有再次委派。

Reviewer: native:/root/recovery_review。我未参与本轮实现，已原生 ACK 精确输入。用户既有 reviewer 模型偏好继续适用；工具未提供可独立核验的底层模型身份，不把偏好当实际模型证明。Root 回读后维护正式状态，本报告不宣布 T08、相关维护票或 28票/55AC 完成。

## 固定输入与依据

- branch `NAMEWTA/bot`，base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。
- 冻结 `evidence/T-08-logs/review-input-chat-r1.json`，2032 文件；Input-SHA256 `5f30fe1c5e4d8a359dbafde9c7a651bef03fcd878fdf5b8e4b50ffdd8a8d12ae`。TASK SHA256 `af17cb72430afa9837a56672e863813b3cbdd28569247c65c613a5b45a9e4b28`。
- 初始输入与315文件副本（历史日志已清理：`logs/00-input.json`），最终逐文件/模式/HEAD/报告摘要复核（历史日志已清理：`logs/05-final-input.json`）：2032文件零漂移，外部315原文件零漂移，副本与当前模式相同。当前 index SHA256 `d2a2cc618e08f39b6730478bed302db78480d2d10642879f55b1811035e50494`；本次初始未单独记录 index，故不声称独立比较了098首尾index，也不拿091旧值误报漂移。
- 已按 workspace/catalog 发现规则采用 dev、测试/许可及 SpecDev I 独立审查、risk/error/test-reliability 规则；未变化规则沿前轮已读来源复用。实际依据包含 T08、T01/02/03/12 必要维护、Spec §4/6/7/8、AC-017/023/036/044，ARCHITECTURE §7/8，chat-private-contract-map22 与 engine-chat-window-map22。LOG051的代码验收/用户后验界限优先于旧票现场验收措辞。
- 092–096完整 REPORT 已回读；Root五份接收凭据和报告 SHA 全部匹配。重点原始日志另回读：092最终normal/race/identity和11真实非2xx红；093 Probe join反向红与当前生命周期绿；094 metadata/实际预算消费者；095许可命令与docs红；096单测试。作者历史失败与夹具观察错误保持，未以最后绿删除原红。

<a id="standards-output"></a>

## 标准轴

Reviewer: native:/root/recovery_review
Axis: standards
Result: request-changes
Input-SHA256: 5f30fe1c5e4d8a359dbafde9c7a651bef03fcd878fdf5b8e4b50ffdd8a8d12ae
Observed: F-098-01、F-098-02 均为实际消费者反例。前者忽略已存在的可信原意图，后者把原始字节检查放在有损 SDK 解码之后。独立 Go vet 与架构检查 actual0；这些静态检查不能抵消两项行为失败。

### F-098-01 / P2：Resume 未将 CP 最后一条初始用户消息绑定原受理 Intent

**可证伪假设：** 即使错误内层载荷取得完整的新 HUHUCP1 外壳和引用，恢复仍应对照当前可信的原受理 Intent 拒绝替换，且在下一次 Resolve/HTTP/工具前停止。

**路径与原因：** `native/huhubot/internal/adapters/outbound/eino/common/engine.go:194` 将 RunID/SessionID、Config 交给 readState，却不传 `resume.Input.Intent`；到199直接 applyDecision，202继续 runState。`common/checkpoint.go:182` 的初始区只校验角色及 Persona，220仅要求最后一条是 user，没有正文绑定。可信原意图已由 `internal/adapters/outbound/sqlite/execution/executor.go:282` 从 `execution_runs.intent` 读取到 Work.Input.Intent，实际 Executor 在 `internal/application/execution/executor/executor.go:280` 传入 Resume，并非需要另造事实源。

**真实前提/触发：** 独立探针（历史日志已清理：`logs/01-checkpoint-probe.go.txt`） 包装真实 CheckpointAccess.Publish，在真实 Engine 生成 payload 后、交 Broker 发布前，仅替换 `Messages[Initial-1].Content`；随后原 Publish 写新 Blob/外壳/摘要/DB引用。无持久 SQL 修改，也没有把旧Blob损坏后沿用原摘要。通过公共 Approval.Resolve 拒绝原审批，再由真实 Executor/SDK恢复。这是持有内层生产错误注入能力的语义恢复防御测试，不是普通客户端能提交任意 CP 的证明，也不是 HUHUCP1 摘要失效。

**实测：** [原始输出](logs/01-checkpoint-probe.log)及actual exit/Wait（历史日志已清理：`logs/01-checkpoint-result.json`）：正常控制成功；尾部插入、Persona替换被 Inspector 拒绝，HTTP保持1；Intent替换则 Inspector返回nil，原Run succeeded，HTTP=2/Resolve=2，第二请求携带替换文本且原Intent不再出现。原CallID和原APPROVAL_REJECTED仍对应，SQL attempts=2、settled且producer结束=2，Host=0。可见问题不是新建Run或重Invoke已审批效果，而是同一Run在后续收费请求中换了任务正文。独立命令 actual1，全部 Core/Engine/SDK 已实际收尾。

**纯 Inspector 的精确边界：** 当前 `api.CheckpointInspection` (`api/recovery.go:53`) 只有 Run/Config/Position/Checkpoint/Reader；`api.Run` 没有Intent。它不能凭空比较未提供的原意图。最小 common 修复首先在 Resume 比较最后初始user正文与原Input.Intent，在任何新模型/工具动作前失败。若要满足当前恢复资格门在 Inspector 阶段即 blocked 的合同，由原 T01/T03/T16 owner 将现有受理Intent作为内部 inspection 载荷传至同一纯校验；不加公共HAP字段，不新增DB正文事实源，不从CP自身复制一份digest冒充独立绑定。T08负责共同校验消费，T01/T03/T16只维护这一必要内部接缝。

**初始历史附加观察，不扩大finding：** 同一探针 prefix_insert（插入user并增加Initial）也被接受并发给SDK。此控制证明现有检查只验证结构，不验证全部初始正文来源，但本报告不把它单独定为同等级完整性漏洞：Inspector无独立旧History/Sources/message正文基线，Resume取得的是当前获准上下文，可能与暂停时合法历史不同；完整新artifact下任意模型/历史正文变化不能一概视为越权篡改。已成立的确定缺陷是可直接核对、不可替换的原受理Intent。角色/顺序/Persona/原工具结果的结构绑定与任意正文真实性必须分开。无需为关闭本finding承诺完整历史锚定，更不能盲目比较暂停前后所有history字节。

**验证条件：** 保留正常审批拒绝/批准和原CallID控制；替换Intent必须在纯Inspector（若扩内部载荷）和Resume均安全拒绝，HTTP/Resolve不增加、原效果不重Invoke。保留Persona/尾部破坏负控及合法历史变化控制；修复不得把当前新历史机械替代旧CP或新造Run。

### F-098-02 / P2：非法原始 UTF-8 工具参数在 SDK 解码后被接纳

**可证伪假设：** Provider SSE中的工具参数含非法原始UTF-8字节时，完整batch应在首Invoke之前拒绝；合法中文UTF-8的正常控制应仍能进入审批。

**路径与原因：** `native/huhubot/internal/adapters/outbound/eino/chat/body.go:70` 到98直接 `json.Unmarshal` 观察SSE数据，无原始UTF-8门。实际固定SDK `github.com/meguminnnnnnnnn/go-openai@v0.1.6/stream_reader.go:41` 经 `internal/unmarshaler.go` 的encoding/json先解码，非法字节可被替换为U+FFFD。`common/tools.go:168`、231再对解码后的 Arguments 做utf8.Valid/StrictJSON已经不能看到原始错误。common整批decode在Invoke前这一顺序正确，但其输入已被有损归一化。

**真实前提/触发：** 独立探针（历史日志已清理：`logs/02-utf8-probe.go.txt`） 使用默认bootstrap Engine、合成测试凭证、真实loopback HTTP/SDK与实际工具Broker。Provider回正常SSE tool_call JSON，将参数content哨兵替换为原始单字节0xff；正常控制替为合法“漢字”。实际wire utf8.Valid明确false/true。无Checkpoint包装器，无持久状态篡改，无模型Port假结果。

**实测与影响：** [原始输出](logs/02-utf8-probe.log)和actual exit/Wait（历史日志已清理：`logs/02-utf8-result.json`）：两者都到 waiting_approval，HTTP=1、SQL execution_effects=1、access_approvals=1；非法输入没有按合同fail-closed。Host物理写入=0，审批门仍在，因此这是严格协议/参数准入缺陷，不声称已越过用户批准写入笔记。命令actual1；两个Core.Done均已到达，SDK producer结束。

**最小修复：** 在有界原始SSE数据仍可见、SDK有损解码之前验证UTF-8，并把错误接到既有安全失败/取消/排空/结算路径。不能按每次任意Read分片独立判UTF-8，否则合法多字节字符跨read会被误拒；利用完整有界line/event或有状态UTF-8扫描。原始检查不能延迟到批次Invoke之后，也不能丢弃已Dispatch attempt的unknown结算或实际producer Wait。主责T08 chat/common，无需修改SDK缓存、公共HAP或凭证域。

**验证条件：** 本反例变绿；正常中文和跨Read多字节保持成功；两工具batch后项非法时首项也无Invoke/Effect/Approval；invalid wire的Run安全失败且零工具事实，原attempt保守结算、真实producer结束；错误/日志不回显Provider正文。

<a id="specification-output"></a>

## 规范轴

Reviewer: native:/root/recovery_review
Axis: specification
Result: request-changes
Input-SHA256: 5f30fe1c5e4d8a359dbafde9c7a651bef03fcd878fdf5b8e4b50ffdd8a8d12ae
Observed: F-098-01 违反当前冻结CP合同的原Intent保留及坏语义不因新外壳洗白；F-098-02 违反严格UTF-8/JSON、整批首Invoke前校验合同。Spec AC-017/023/036对应恢复/受控工具接缝仍待修复；不将真实Provider/Obsidian/目标OS未跑另立为代码门阻塞。

沿真实调用闭包已核：Application绑定Config/Agent/Lineage，默认bootstrap绑定已验证Profile resolver，SDK和协议消息留adapter；metadata只显式GET，未知能力为空；实际序列化完整请求体计入Reserve，Dispatch中唯一HTTP，不重试/重定向；后续每轮仍通过同一Attempts门。原回执、审批、Host末门以及父子/预算底座按未变源和实际消费者证据复用，没有借091pass覆盖新SDK问题。

生命周期代码将精确reader io.EOF与Body.Close分开，并在SDK producer结束后结算；失败结算保留不可变观察的本机worker，Done等待它。同步Stream错误的实际Body关闭补丁回应092原11非2xx真实红。Core等待Executor、Inspector、Probe及model runtime后再释放Profile/SQLite。093反向控制确证移除Probe join会过早释放，当前真实绿；094实际预算并发消费者确证最后额度只一个HTTP。这些成立点不抵消本轮两项新反例。

092 F01–F20矩阵按照其报告区分：正常流/显式绑定、工具schema/身份/批次、审批恢复、known/unknown、HTTP错误与重定向、撤权/预算、取消/settlement等有真实fixture和SQL观察；全部墙钟/panic/kill组合并未逐一新跑。原01/06/14/17/19等夹具预期/前提错误与11真实产品红分列保留；Go1.27诊断不能替代固定Go1.26.10正式结果。本轮没有重复整个race/旧大队列或全模块矩阵。

## 产物与验证

唯一独立检查副本 `/tmp/huhu-review098-b5srp0t4/native/huhubot`；仅新增两个外部review098测试文件，源码副本与2032冻结输入均未改。

| 检查 | 结果与回读 |
| --- | --- |
| 独立 CP 五控制 | actual1 / Wait，2.240s；正常、尾部破坏、Persona破坏控制PASS；prefix_insert和intent_replace红。后者是F-098-01确定绑定缺陷，前者严格按前述边界解释。探针（历史日志已清理：`logs/01-checkpoint-probe.go.txt`） / [log](logs/01-checkpoint-probe.log) / 命令环境（历史日志已清理：`logs/01-checkpoint-result.json`） |
| 独立 wire UTF8 两控制 | actual1 / Wait，0.929s；合法中文PASS，原始0xff被真实工具接纳。探针（历史日志已清理：`logs/02-utf8-probe.go.txt`） / [log](logs/02-utf8-probe.log) / 命令环境（历史日志已清理：`logs/02-utf8-result.json`） |
| 定向 Go vet | 固定Go1.26.10、CGO0、modreadonly，common/chat/bootstrap/assistant，actual0 / Wait，1.513s。结果（历史日志已清理：`logs/03-vet-result.json`） / [原始空log](logs/03-vet.log) |
| 仓库架构检查 | `pnpm test:huhu-bot-architecture` actual0 / Wait。结果（历史日志已清理：`logs/04-architecture-result.json`） / [log](logs/04-architecture.log) |
| Root真实生产链回读 | lead-chat-e2e-r3完整记录及原始CLI/build日志：实际TS/HAP、默认CLI私有fd3/4、实际SDK、生产Host适配器与受控Vault；7生成/1metadata、两自然CLI exit0；SQL七settled/producer1，known4共58、unknown3共13102，一committed一rejected，pin/slot/reserved0、integrityok/FK[]。不是本reviewer再执行，也不是真Obsidian。r1/r2探针自身错误保留，不冒称产品修复。 |
| 095许可回读 | 实际五目标GoFiles闭包40第三方模块，加Go runtime为41；不等于MVS98。精确版本/sourceSHA、Ext固定提交Apache全文、Sonic Boost/附加署名、golangasm Inferno、Logrus atexit MIT、YAML MIT AND Apache有对应完整文本；26工具测试及notices/checknotices实际0。未来协议新增依赖须重新算闭包，非T27发行完成。 |

所有自己的Go命令固定 `GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 GOFLAGS=-mod=readonly`；没有远端Provider/用户凭证、真实Vault/keyring或Obsidian。两个探针均真实调用 Core.Close/Done（CP另Engine.Stop/Done），HTTP server cleanup完成，无SDK producer/settlement worker未结束；命令由subprocess.run实际Wait。日志中的actual1为产品反例，运行记录脚本自身exit0仅表示记录完成。

本轮读取时出现过错误路径检索与把带Command前缀的CLI文本log误按JSON解析的读取错误；随后按实际路径和文本完整回读，未触及产品或重跑检查，不将这些读取错误登记为产品finding。无生产TS/NOTICE/main/styles变化，按影响复用既有build/lint，不重复插件构建。

## 问题与下一步

Root可将F-098-01交T08与必要原T01/T03/T16内部载荷owner，将F-098-02交T08。保持当前两个红探针/原始输入，修复后冻结新输入再做定向正反验收及独立复审；我不写修复。

095原docs校验仍actual1：六个原输入文档锚点及claim-fairness README分类共七项；这是既有集成待办，未重跑或伪报绿，正式原owner最终集成继续追踪。真实Provider、Obsidian和用户目标OS均user-owned/not-run，不索凭证。完整初始历史真实性不因本Intent最小修复自动获得，不添加没有独立事实来源的保证。

最终输入和产物摘要见05记录；return结构校验的实际命令/exit/Wait写入 `logs/06-return.json`。全部产品子进程已停止；完成return后原生MESSAGE+FINAL交回唯一检查窗并停止写入。return0只是结构有效，不是双轴pass。
