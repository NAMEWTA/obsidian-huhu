# Chat 修复后完整候选独立双轴复审

Session: 20261025T043239Z
Task: 102-chat-repair-review
Status: completed

## 聚焦交接

标准轴 **pass**，规范轴 **pass**，没有新增 finding。F-098-01、F-098-02 在本次固定候选中已修复；原098实际失败、正常控制和信任边界保持。独立新增的真实Chat重开资格检查、gzip解压后多字节分片、先usage再坏第二工具控制 normal/race 均通过。103检查器的精确改动也在本次范围内，没有放宽整个native或原始输入的检查。

Reviewer: native:/root/recovery_review。我未参与100/101/103实现，已原生ACK；没有再次委派，没有写生产、永久测试、正式Evidence/Map/Goal或他人报告，没有提交、推送、发布、归档。仅本102报告/log及外部固定副本探针。用户既有reviewer模型偏好继续适用，工具未独立证明底层模型身份，不把偏好当实际证明。

这是固定Chat候选及必要维护的代码审查，不宣布其他协议、T27发行或28票55AC/Goal完成。真实Provider/Obsidian/用户目标OS继续user-owned/not-run，不索凭证。

## 固定输入与复用边界

正式来源 `evidence/T-08.md#review-input-chat-r2`，Input-SHA256 `d0f13ca8b86a1c8defdd8e93d9626556c90b426351193ee1d16e4569c6a31768`。通过原 `reviewInputDigest` 对scope/sources/exclusions计算，与冻结值一致；28来源含anchor的实际文本逐SHA全部匹配，[来源复核](logs/03-sources.json)。TASK SHA256 `5fce8d96e2bdcb4bcd165127acf6818a0a37106fa116621048c8781f3816784c`。

base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`，branch `NAMEWTA/bot`，首尾index SHA256 `d2a2cc618e08f39b6730478bed302db78480d2d10642879f55b1811035e50494`。2018文件字节/模式无漂移；外部副本303原文件无漂移。[初始输入](logs/00-input.json)、[最终输入与前轮比较](logs/10-final-input.json)。用原resolveReviewScope重新生成完整working-tree范围，按正式validator同样规则只排除范围外编排文件引起的excluded_paths/inventory/input汇总变化，余scope完整相同，[正式范围复核](logs/09-formal-scope.json)。这里使用正式reviewInputDigest，不混用原098的自定义文件表SHA。

与098共同2011文件中只有7项变化（6个Go生产、1既有测试）；新增入scope7项为3个新Go测试和103的4文件。21个旧全票/编排输入退出产品范围，由稳定behavior-scope/acceptance来源anchor及正式instructions替代，避免正式状态自指，并非缩减生产闭包。8生产/脚本与6测试的本轮差异均已回读。其余默认装配、SDK/锁、预算、权限/取消/Host、许可来源及原底座按相同字节与实际影响复用098的完整独立审查；未用原pass覆盖新变化。

已按workspace/catalog发现，沿已读且未变化的dev/testing/licensing、I独立审查/risk/error/test-reliability与原098合同执行；新102 TASK、Map24修复、Map25文档精确窗口和100/101/103完整报告、生产patch、测试及关键原始log另行回读。092–096/098报告及100/101/103报告的当前SHA全部与Root原生接收回执匹配，见10记录；原作者历史失败仍保留。

<a id="standards-output"></a>

## 标准轴

Reviewer: native:/root/recovery_review
Axis: standards
Result: pass
Input-SHA256: d0f13ca8b86a1c8defdd8e93d9626556c90b426351193ee1d16e4569c6a31768
Observed: F-098-01原意图通过同Tx权威读取供给共用语义门；F-098-02在有损SDK解码前用有状态原始UTF8扫描，并保持producer/结算归属。完整影响闭包未发现新增正确性、资源、错误处理或边界缺陷。独立normal/race、定向vet和架构检查actual0，正式范围/28来源/2018字节模式均匹配。

**F-098-01处置：已修复。** `internal/adapters/outbound/sqlite/execution/recovery.go:38` 在原事务同一SELECT读取既有intent与position；api仅两个内部Inspection结构增Intent，`tooling/broker/recovery.go:83`原样透传。没有公共HAP字段、迁移、新正文事实源或CP自证hash。common的readState/validateTranscript由Inspector接收q.Intent、由Resume接收原Input.Intent，最后初始user正文必须严格相同；错误发生在applyDecision、Resolve、HTTP与后续Invoke之前。已有原角色/Persona/批序/结果/pending/身份检查保持。

**独立可证伪假设：** 只有单独调用Inspector才消费新字段，真实停止/重开资格链可能仍遗漏它。外部探针用实际Chat/SDK生成note.write和CP，内层Publish前仅正常或替换Intent，仍经真实Broker生成新HUHUCP1/ref。公共reject后，受控Engine装饰器在实际Resume入口等待ctx取消，随后真实Core停止；持久原decision/CP/Run完整，未改SQL业务事实。重开使用真实common Inspector，原Repository→Broker→Inspector链返回坏Intent `blocked/CHECKPOINT_INVALID`，HTTP/Resolve仍各1，公开Resume也拒绝。同一原Run1、attempt1 settled/producer1、completedContinuation1、Host0，Blob字节/ref保持。

正常控制的真实边界是 `blocked/CREDENTIAL_MISSING`：session-memory凭证重开后失效，私有literalResolver不替代当前准入。代码 `sqlite/recovery/snapshot.go` 的inspect先对interrupted成员调用真实Inspector、错误立即返回，再AuthorizeAdmission；因此该正常CP先通过语义门，随后被独立凭证门拒绝，不是仅凭reason猜测。正常控制没有声称ready或第二HTTP。本人的初次探针错期待ready产生actual1，已原样保留；修正测试期待而未改产品/SQL/凭证。真正正常批准/拒绝/历史刷新与原身份执行由100的真实消费者和Root新r4证据共同覆盖。

不把任意历史正文变化当新增漏洞。当前Intent来自独立受理事实；原初始History/Sources/message正文没有同等独立冻结基线，合法刷新不被机械比较/替换。098 prefix_insert观察继续保留其限定意义，既不虚称修复了完整历史真实性，也不要求扩建事实域。

**F-098-02处置：已修复。** `chat/body.go` 解压后读取有界raw块，utf8.FullRune/DecodeRune只允许合法完整rune通过，最多扣留3字节未完整尾部；非法编码、EOF未完整后缀在SDK JSON解码前设置固定MODEL_STREAM_INVALID、清usageKnown并cancel。合法U+FFFD的三字节编码正常。任意Read分片不被当完整字符串，合法跨Read多字节不误拒。ready缓冲、总response/line/event界限、idle计时及EOF残行处理有界，未将网络EOF/consumer.Close冒充真正producer ACK。

**独立可证伪假设：** 经过gzip解压、不同分片且早先已经观察完整usage时，后续非法第二tool可能让首工具执行或错误保留known少扣费。独立真实HTTP返回gzip，transport.Uncompressed被实际观察；decoded Body按1/2/1/3/4/1/5字节循环切片。合法“漢�😀é”到审批，Invoke1/effect1/approval1，原文相同、known收费7。坏第二tool分别为非法代理区UTF8编码ED A0 80及EOF截断F0 9F 98；虽然此前收到完整3+4 usage，两者Invoke0/effect0/approval0，unknown收费完整reserved4981，HTTP1，原attempt settled/producer1，Host0。普通与race均同结果，所有Body/Engine/Core实际Done。

完整batch仍在common预检后才首Invoke。此次没有改Driver的真实Dispatch、SDK排空/Close或settlement worker：最后producer ACK仍先于Settle，持久结算失败仍保留单观察worker并阻止Done。100原 held Body.Close控制在normal/race绿，独立新故障路径也实际清理完成。新扫描无依赖变化，不改变SDK配置/回退/重试或许可闭包。

**103检查器：通过。** verify-docs只在既有slug字符类增加U+3001移除；大小写/空白、其它非ASCII、下划线/连字符及重复slug算法保持。documentation-policy只新增native/huhubot/tests/contract单包/testdata范围，没有忽略native产品资料或SpecDev原输入。真实checker隔离临时仓库覆盖六原标题、非ASCII和重复slug，坏anchor/未知native文档仍失败；5/5原始绿与原红均已回读。没有修改用户原输入或为了消除错误放宽链接提取器。

<a id="specification-output"></a>

## 规范轴

Reviewer: native:/root/recovery_review
Axis: specification
Result: pass
Input-SHA256: d0f13ca8b86a1c8defdd8e93d9626556c90b426351193ee1d16e4569c6a31768
Observed: 在用户明确代码验收边界内，原受理Intent在纯检查/实际Resume保留，完整新CP外壳不能洗白该语义损坏；原始非法UTF8在整批工具首Invoke前拒绝，未知usage保守结算及实际producer结束保持。原Run/config/decision/callID、当前授权和凭证门没有因修复放宽，原两项finding不再阻塞当前Chat候选。真实Provider/Obsidian/目标OS未验，其他票和Goal不在此结论内。

Spec §4/6/7/8与AC-017/023/036/044的相关接缝沿实际入口复核：默认bootstrap仍绑定已验证Profile与显式Chat配置；metadata仅GET，无能力推断或收费fallback；完整最终SDK请求体仍用于Reserve，每次实际HTTP均单独Dispatch，后续模型轮次继续当前权限/预算门；SDK内部模型消息不跨Application边界。审批原ID/原Decision与同一Run恢复保持，拒绝不写，批准仅原一次Host效果；没有新Run/第二intent或重放已完成效果。原091/T16公平性、取消/恢复/事务、Host末门未变，不机械重跑旧重型队列。

100的8顶层normal、3顶层race和101同Tx→Broker真实重开透传单例均实际0/Wait；100默认路径log的invocations=0是未安装计数器默认值，仅使用其SQL零事实作为证据，准确Invoke0来自byte控制和本独立gzip控制的真实ToolInvoker包装。没有把受控端口计数冒称default实例计数。101的受控引擎只证明透传，不能单独替代真实Chat语义拒绝，本轮独立重开补足该接缝。

Root r4已重新构建当前Go CLI及TS/HAP探针，1988输入SHA `35d4e3d2ddcad4969d7b8d121d4663f25e3e7bd2024d53390f8ea1f60e148836`；build/TS/CLI实际0并Wait，7POST/1metadata、两自然CLI exit0，一次批准物理Vault写、一拒绝；SQL7settled producer1，known4总58/unknown3总13102，pin/slot/reserved0、integrityok/FK[]。已回读完整结果和原始日志，这是Root运行而非本人重跑，受控Vault不是Obsidian现场。r1/r2探针错误及r3旧结果不改写。

092 F01–F20原矩阵按已实测/源码约束/底座复用/未排列边界继续表述；原11非2xx真实红与夹具观察错误分开保留。本轮并未穷举所有墙钟/panic/kill组合，也未把旧Go1.27诊断当正式证据。095固定40第三方模块及Go runtime41、实际五目标许可正文/来源和failclosed工具测试按未变字节复用，不等于未来T27全部发行完成。

## 产物与验证

外部副本 `/tmp/huhu-review102-ttu5zngd/native/huhubot`，原303文件无修改，只增加本review102测试。首次与修正版本、命令/完整环境、actual退出/Wait全部留存。

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| 首次独立normal | actual1 / Wait，2.820s；坏Intent和gzip三控制通过，正常CP误期待ready，被真实CREDENTIAL_MISSING拒绝；探针前提错误，非产品finding | [原探针](logs/01-probe.go.txt)、[原始log](logs/02-normal.log)、[结果](logs/02-normal.json) |
| 修正前提后的独立normal | 两顶层/五控制，actual0 / Wait，1.167s；未改产品 | [修正探针](logs/04-probe-r2.go.txt)、[log](logs/05-normal-r2.log)、[结果](logs/05-normal-r2.json) |
| 相同独立探针race | actual0 / Wait，8.334s，CGO1，无race诊断；五控制与清理全部通过 | [log](logs/06-race.log)、[结果](logs/06-race.json) |
| 定向Go vet | common/chat/sqlite execution/Broker/api，actual0 / Wait，0.270s | [结果](logs/07-vet.json)、[空log](logs/07-vet.log) |
| 仓库架构 | actual0 / Wait，57 production files，0.458s | [结果](logs/08-architecture.json)、[log](logs/08-architecture.log) |
| 正式scope与来源 | resolveReviewScope比较一致；28来源实际anchor/文件摘要一致 | [scope](logs/09-formal-scope.json)、[来源](logs/03-sources.json) |
| 最终固定输入 | 2018字节/模式、303原副本、HEAD/index无漂移，9份报告SHA与真实接收凭据匹配 | [最终记录](logs/10-final-input.json) |

全部Go命令固定Go1.26.10、GOWORK=off、GOFLAGS=-mod=readonly、GOEXPERIMENT空；normal/vet CGO0，race CGO1。没有全模块/旧大队列重跑，没有用户真实凭证或keyring操作。所有测试子进程真实Wait；SDK/body/settlement以及显式注入Engine/Core均实际停止、Done；服务器/transport由cleanup收尾，无未结束进程。记录脚本outer0不覆盖Go首轮actual1。

## 问题与下一步

没有需实现者继续修复的本轮finding。Root全文回读后决定正式票据/代码门；本reviewer不改状态。

原095七项docs红由103精确修复关闭；103随后只剩097两行代码展示误报的inner1/outer126仍保留。104原owner两行展示后继与旧字节留存已由Root接纳，Root `evidence/T-27-logs/docs-after-104.json/log`实际0/Wait0.854s，762 Markdown/1650 local links、sourceDrift[]，本人已回读。没有扩大103解析器范围，也不以该文档绿宣布整个T27结束。

真实Provider、Obsidian、用户目标OS仍由用户后验；完整初始历史真实性仍不在Intent绑定的独立事实保证内。正常session-memory重开继续缺凭证，不能用私有resolver测试接缝绕过当前资格门。return结构验证结果随后写入logs/11-return.json；全部停止写入后原生MESSAGE+FINAL交回唯一Go窗口。
