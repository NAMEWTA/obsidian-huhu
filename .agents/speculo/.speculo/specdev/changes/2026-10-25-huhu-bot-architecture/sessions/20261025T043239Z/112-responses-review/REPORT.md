# Responses 最终候选独立双轴审查

Session: 20261025T043239Z
Task: 112-responses-review
Status: completed

## 聚焦交接

本轮标准轴与规范轴均 **pass**，没有确认的阻断 finding。结论限于本次冻结的 Responses 与必要共享维护代码候选，不表示 T27 全平台资产、三协议整体或 Goal 已完成。本人身份为 **native:/root/recovery_review**，未参与107/108/109/110/111/113/114实现，未委派；沿用户指定独立审查角色执行。模型名称/推理配置沿宿主派遣偏好，不以报告自证运行时配置。

正式输入是 [T-09 审查输入](../../../evidence/T-09.md#review-input-responses-r1)，唯一 Input-SHA256 为 `78900740ccb6b1f7e8bc7c76d71c68257428ed916d121a0a11328fec5b542074`。HEAD/base 为 `33c21e098ef3188cbab5a09f3e0a01fadb787715`，branch `NAMEWTA/bot`，index SHA256 为 `d2a2cc618e08f39b6730478bed302db78480d2d10642879f55b1811035e50494`。2048文件/32来源，适用工作区发现规则、dev/架构/测试/许可，以及已读 I 独立审查、风险、错误和异步可靠性规则；未变化的102规则与底座按实际SHA/影响复用。115只读准备排除在被审产品外。

## standards-output

Reviewer: native:/root/recovery_review
Axis: standards
Result: pass
Input-SHA256: 78900740ccb6b1f7e8bc7c76d71c68257428ed916d121a0a11328fec5b542074
Observed: 沿最终默认Core/Registry/Broker及真实SDK调用和原Attempts/SQLite追踪权限、批次、生命周期与依赖边界；外部固定副本四项独立gzip/小Read/terminal门控反例及正常对照在normal/race均实际0，定向vet和57文件架构检查实际0。2048文件字节/模式、32来源、332副本、scope、HEAD/index最终无漂移。旧Chat、构造清理、真实SQL结算失败及五平台许可闭包按各自实际输入和未改变接缝复核，没有用历史pass代替新Responses审查。

没有标准轴 finding。Go SDK 类型留在 outbound 私有树，httpcall 仅依赖 std/api；原 Application/HAP/TS 与 SQL 域未为协议扩张。最终网络 body 在一次性 gate 内核验、Reserve、Dispatch；SDK retry0、自有 transport/明确目的地、禁redirect/环境fallback。Stop关闭准入，真实Next/Close/watcher与结算完成后才Done；失败结算保留原attempt责任。公开错误为固定原因，raw reasoning与Provider敏感错误不进入公开History。测试中显式transport/credential/Host seam与生产默认路径分别说明，没有把包装器返回值或控制fixture当真实故障证明。

## specification-output

Reviewer: native:/root/recovery_review
Axis: specification
Result: pass
Input-SHA256: 78900740ccb6b1f7e8bc7c76d71c68257428ed916d121a0a11328fec5b542074
Observed: 对照T09及T01/T02/T06/T08/T27稳定验收anchor、097差异矩阵与106采用合同，核对完整有序raw items、双ID/工具批原子校验、同协议State候选/Inspect/Resume、可信Intent、旧Chat CP/digest兼容、原effect恢复与每请求当前授权/预算。独立门控实测确认完整工具items尚不足以开始审批，bad UTF8或无terminal仍零效果，failed合法零usage与unknown保守计费分开。Root新buildCLI/生产TS/HAP/Host受控Vault E2E的2017输入逐字节匹配，7POST/1GET、写1拒绝1、两进程自然exit0与SQL回读相符。真实Provider/Obsidian/目标OS为user-owned/not-run。

没有规范轴 finding。本轮没有新增外部历史正文真实性、远端签名验证、支持全部Responses联合类型或全部目标OS运行等承诺。未知/未支持执行语义安全拒绝；初始历史正文缺独立信任锚的边界与102一致，可信原Intent及实际程序位置受检。后续真实现场验收不阻塞用户授权的本次代码门。

## 可证伪假设与公开调用追踪

1. **H1：完整工具items可能在terminal前被提前执行，或解压/分片使坏UTF8被SDK洗成合法内容。** 从公开 StartRun，经Executor、common.Engine、Responses.Generate、固定SDK NewStreaming/同步Next、httpcall原body观察，最后经common整批decode和candidate.ValidateState进入首Invoke。`responses/driver.go:78`、`items.go:148`、`httpcall/body.go:35`、`common/engine.go:197`的顺序与下面实际门控相符。完整有效5735字节prefix已被真正交给SDK，终结事件尚未发送时，账本仍dispatched/producer_ended0，审批、CP、物理写均0。正常末尾证明相同前提确实可进入两审批；坏尾与DONE-only证明未过门时不执行。此假设被当前实际对照否证。
2. **H2：typed completed、EOF或Cancel可能提前释放原producer/结算。** 固定SDK `packages/ssestream/ssestream.go` 的Next同步调用decoder，没有另一隐含生成goroutine；DONE继续排空，并不自行证明结束。真实Generate退出Next后defer Finish；`httpcall/runtime.go:201,248` 先实际SDK Close、原body Close与watcher ACK，再取observation、Settle。`attempt.go:125,138` 保留失败Settle，worker必须等finished后才能释放；Core仍等原PendingProducers和models.Done才关DB/Profile。复核107的隐藏error body/Do取消/非EOF错误/cleanup超时/worker ACK证据和109真实SQL trigger/held Close normal、race；本探针另实测每请求原body Close后才出现审批/terminal，所有Core实际WaitClosed。未把本探针正常Close冒称再次运行held-Close或SQL故障。
3. **H3：完整失败终结的合法0可能被当unknown，或缺终结被当known0退款。** `items.go`的terminal/usage分别判定，失败usage仍可known，presence/null/范围/overflow不由SDK整数零值猜测。独立failed+0工具批的Run失败、Host0、账本known0 charged0；坏UTF8与DONE-only均unknown且charged5008等于原reserved5008。正常两次请求charged26与19输入/7输出一致，无重复结算。
4. **H4：sidecar、配置或新registry可能绕过原CP资格/原效果身份。** 默认Core只在实际生产Engine装配时设置registry版本callback；同registry服务Engine/Probe/Inspector，Broker Bind/Publish/Inspect由同`metadataForAgent`从pinned Agent取身份。只有typed draft缺失/未装配两个错误可保留Tools/Attempts但无CP；其他错误不吞。common `checkpoint.go:74,273,390`从可信配置选decoder，校验原Intent/程序位置/净化结果后调用协议纯validator，最终编码≤1MiB才Publish。Responses `checkpoint.go:56`逐轮核对Turn/MessageIndex/ResponseID/raw items/工具结果对应，`request.go:13,74`仅由完整本地items与净化原call_id结果形成新请求。复核作者15项重新包装有效外壳的语义损坏负控与真实正常恢复；没有把“磁盘payload损坏但原digest未变”和“新artifact内容本身错误”混为一类能力。
5. **H5：维护检查可能用旧源码或放松文档规则掩盖缺口。** 111原167源码快照与最终候选确有driver/items/item_events三文件差异；从109原ZIP按旧SHA找到对应字节，比对imports/build/embed及文件集合。唯一新增import为std `net/http`，五个历史真实go-list图都已包含，锁/生产文件集合不变。items两个文件无图变化，因此复用的是45模块许可闭包，绝非声称旧源码SHA等于最终源码。113完整patch只掩闭合等长inline code span、处理本机绝对file:正整数行号；实际文件/realpath/范围/anchor门继续保留。其相邻坏链接、未闭合/转义分隔符、坏行号、目录/缺失/越界负控及Root最终docs结果相符。

原物理效果门仍是原Broker/审批授权与Host派发事务；本轮私有raw items不获得写权限。每次HTTP仍过原Dispatch当前Grant/预算，旧CP不能直接发出旧来源正文。109公开撤权第二HTTP0与公开Cancel晚工具0、后继Run正常，以及Root真实TS Host只写一次覆盖此新消费者；未重新铺旧底座队列/race矩阵。

## 产物与验证

外部副本 `/tmp/huhu-review112-6a9053en` 的332原模块文件逐字节匹配冻结输入；只新增外部 `review112_test.go`，完整副本留在 [探针源码](logs/01-review112_test.go.txt)，SHA256 `af62a7dec2995eb33188220e71ecc9fed4eb534919290638b3bf64c0acf7ce76`。共享fixture只负责公开Core/SQLite/NoteWriter建置，本人新控制在真实HTTP loopback上发送gzip并在已解压body强制1/2/1/3/4/1/5字节Read，实际记录Uncompressed、read/close次数。显式注入的是生产Responses Driver/Registry/common.Engine加只读transport观察和受控resolver，不能称这四项为默认装配或真实Provider；默认装配另由Root/108已验路径支撑。没有SQL写入/触发器模拟、没有改持久凭证或生产源码。

| 独立控制 | 实际结果（normal/race一致） |
| --- | --- |
| completed正常 | prefix5735已消费时dispatched/0，审批/CP/写0；放行后HTTP2/gzip解压2/read3884/原Close2，审批2/CP2，首批准写1、次拒绝写0；原raw items下一请求语义及字段presence保持；2 settled/ended2，charged26，known19+7 |
| 坏UTF8尾部 | 完整合法items后才发0xff；HTTP1/read2366/Close1；failed MODEL_STREAM_INVALID，approval/CP/写0；1 settled/ended1，unknown charged5008=原reserved5008 |
| 只有DONE没有terminal | HTTP1/read2369/Close1；failed MODEL_STREAM_INVALID，approval/CP/写0；1 settled/ended1，unknown charged5008=原reserved5008 |
| failed+合法零usage | HTTP1/read2931/Close1；failed MODEL_STREAM_FAILED，approval/CP/写0；1 settled/ended1，known input0/output0/charged0，原reserved5008 |

| 本人命令 | actual exit / Wait | 原始输出 |
| --- | --- | --- |
| `go test -count=1 -timeout=90s -run '^TestReview112' -v ./tests/contract/engine/responses` | 0 / 2.564574331s，1顶层4子控制 | [normal](logs/02-gzip-normal.log)、[receipt](logs/02-gzip-normal.json) |
| 同控制 `go test -race -count=1 -timeout=90s` | 0 / 7.492119740s，无race报告 | [race](logs/03-gzip-race.log)、[receipt](logs/03-gzip-race.json) |
| `go vet ./internal/adapters/outbound/eino/... ./internal/bootstrap ./internal/application/tooling/broker ./internal/application/assistant ./tests/contract/engine/responses` | 0 / 1.378543335s | [receipt](logs/04-vet.json)、[log](logs/04-vet.log) |
| `pnpm test:huhu-bot-architecture` | 0 / 0.386628929s，57生产文件 | [receipt](logs/05-architecture.json)、[log](logs/05-architecture.log) |

全部Go使用 `GOTOOLCHAIN=go1.26.10 GOFLAGS=-mod=readonly GOWORK=off GOEXPERIMENT=''`；normal/vet CGO0，race CGO1。执行器用subprocess.run实际等待，工具运行session也已亲自Wait回收；每个Core/Engine/HTTP server/body按测试cleanup真实结束。此次独立产品探针首跑即0，没有被隐藏或改写的产品失败。只读路径定位曾有不存在文件的命令错误，随后按实际目录重读；它们不是产品/探针结果。

## 作者、Root证据与复用边界

完整回读106合同、107/108/109/110/111/113/114最终报告及Root对应lead-return，097矩阵、109全风险矩阵；按代码实际影响比对，不只看新增测试。保留107原legacy夹具lexical错误和helper读错红、108重开凭证资格与构造overlay边界、109实际incomplete/error修复红及错误fixture、111外层126/内层docs1的四项原红、113语义红→绿和114过期断言红。没有将Root冻结定位anchor修正或旧报告展示维护算产品修复。

- **107/旧Chat**：改动是新私有接口薄包装与common候选验证，原Chat body/producer实现未迁入helper。旧生产者实际2768字节CP SHA `7536db3ef21941d7cef85597e850ef1ed96441fc43fe11c504f49803c5e3b631`、digest `sha256:a44fe0c483fdea2896c66cf9070454768e893e18e1353d0f01a5fcf55ac2e80a`及前后请求对照，在新Inspector/Resume/编码中保持；107 final normal13、race8实际0。旧样本测试不是旧进程数据库现场重开；新真实恢复由108/109另证。102只复用未改底座，不代替这些新接缝。
- **108/110/114**：真实默认双协议CLI、Broker metadata负控、构造失败all Stop→all Done→all Close及fake identity分离均相符。108恢复ready对照明确只模拟当前credential metadata，不能称恢复session secret；生产重开CREDENTIAL_MISSING、旧ref不可重注册仍保持。110仅ADAPTER→CREDENTIAL_MISSING过期断言；114新增第三次实际metadata GET并期待MODEL_PROBE_FAILED，空正文/鉴权/单次GET/显式selector负控不削弱。
- **109**：final normal14顶层73子场景与race5顶层均实际0，输入332文件 `b869b93ee94d6689df4ed3f245c0ea3728bd73eabf74761cff3259cb57716266` 已由本人逐文件重核无漂移。完整opaque CP、15损坏控制、公开撤权/取消、heldClose、真实SQL结算失败后同attempt重试、最终编码40k正常/90k超限均按原实验边界复用。相同原始结果未再机械全量重跑。
- **111/许可**：本人解析五份实际go-list JSON流，包数443/409/441/407/445、第三方模块43/39/42/38/44，并集45；SDK v3.44.0与其内置JSON十文件各目标实际进入编译闭包，SDK Apache与内置Go BSD全文义务并存。当前通知/旧18法律文件/NOTICE及锁按冻结校验；没有新NOTICE横幅输入，不要求无关插件重build。最终五平台资产/目标OS运行仍不属于本次已验证内容。
- **113/docs**：完整四文件patch、七测试负控与已接纳真实checker输出一致；Root最后docs actual0/Wait1.264198s、796 Markdown/1803 local links，外链未fetch。以后新报告带来的计数变化不能回填旧观察。
- **Root生产E2E**：`lead-responses-e2e-r1.json` 的2017文件/input `9a79af0ecca957327cf3f1084383ccc59e2f996a4daafc5e86fca3c198ec8a0f` 本人逐字节重核无漂移。实际新CLI build0/2.697s、TS bundle0/2.673s、运行0/0.858s；生产TS/HAP/Host适配器受控Vault，7POST/1GET，两进程自然exit0，写1拒绝1。SQL7 settled/producer1，known4合58、unknown3合13240，pins/slots/reserved0、integrity ok；这是代码E2E，不是Obsidian现场。完整原请求中的store/background=false、truncationdisabled、encrypted include、本地完整items及净化结果与实现相符。

本人复核记录见 [证据交叉核对](logs/06-evidence-crosscheck.json)。没有把作者、Root运行说成本人重新执行；没有用模块require列表冒充五平台实际编译闭包。

## 问题与下一步

[初始输入](logs/00-input.json) 与 [最终输入核对](logs/07-final-freeze.json) 记录2048原文件、文件模式、32来源section/全文SHA、332外部副本全部无漂移；用正式reviewInputDigest复算仍为同一输入，用resolveReviewScope复算选定scope一致，HEAD/index不变。111旧源与当前三处差异单列，不隐瞒历史快照变化。探针自身仅写112日志及外部固定副本。

没有运行真实Provider、真实Obsidian/Vault/系统keyring或目标OS现场；没有本轮五平台资产build，没有重复未变插件build/lint，没有Responses专用再跑全部审批过期/重复resolve/unknown Host/群成员/children/question排列、完整45s/15s/2min墙钟上限。它们分别由原未改共享合同证据及实际源码影响审查支撑或留给后续对应任务，不能冒称逐项现场通过。T10/T14及之后功能不在此结论中。

首次return实际126/Wait0.057156717s，仅因本人报告缺三个协调模板标题；[原失败回执](logs/08-return-first.json)、[原输出](logs/08-return-first.log)及原报告SHA保留。仅修报告标题，产品、冻结输入与两轴结论均未变，随后本人重跑return。

本人所有检查/探针进程已实际Wait，生产/永久测试/正式Evidence/Map/Goal/他人报告未写，无提交/推送/发布/归档。[return校验回执](logs/08-return.json)与[原输出](logs/08-return.log)记录本人最终结构校验；以实际exit为准。原生MESSAGE和FINAL交回后停止写入，唯一Go窗口归Root。Root应全文回读后自行维护正式代码门状态。
