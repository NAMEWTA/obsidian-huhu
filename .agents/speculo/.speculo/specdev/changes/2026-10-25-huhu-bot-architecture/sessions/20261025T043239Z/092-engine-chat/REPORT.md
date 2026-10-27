# T08 Chat 完整循环候选交回

Session: 20261025T043239Z  
Task: 092-engine-chat  
Status: completed

## 聚焦交接

按冻结 [TASK](TASK.md)、Map22/Goal21 派遣及 Root 原生补充完成本票自有实现与检查，候选交 Root 回读、外部 E2E 与独立审查；不自行宣布 Ticket、Gate 或 Goal 验收完成。087 只读准备保持不变。已按 AGENTS workspace/catalog 发现、dev 架构/测试/许可及 SpecDev I 实施/预检/错误/可靠测试合同执行；没有再委派，没有改正式状态、公共 API、SQLite/usage、assistant、bootstrap、锁或 notices。

自有源码只有 5 个 common/chat Go 文件、12 个 Chat 合同测试文件，新增 23 个顶层测试。流夹具直接在 loopback Handler 构造，没有复制 SDK parser、改 module cache、生成另一套 SDK、使用 Generate+capture serializer 或新增持久域。模块引入、Profile-bound resolver、默认 CLI/Core 装配和 notices 分属093/094/095；这些是原 owner 的实际证据，不能冒认本作者写入或全部重跑。

[最终17文件清单](logs/24-own-source-manifest.json) SHA256 `4eacd1b5a1ae1845286667fee0f9390f6e3d8a160b0a2f4b0a7d0a3e05e52efb`，own tree `a7524be1481553c12ec4887b806096eb02d2b63e9402b258658c57463aec0cd8`。五生产文件在095最终五目标闭包前已冻结，之后没有变更。21 normal 与22 targeted race 用相同输入 `5b7f3d106efc6e9a1ab4955c68d08140718338767a3f1b1722faf2e2cf7c66f2`；其后只新增身份负控测试，并经23单独通过。

## 实现行为

`chat.NewDriver()` 直接消费固定 EinoExt `NewChatModel/WithTools/Stream`、Eino schema 和固定 fork `GetModel`；`common.NewEngine(driver, Profile-bound resolver)` 同时实现 Engine、Resume、纯 Inspector。兼容身份 `huhu-eino-0.9.22-chat-bridge-v1`，Driver 纯 `SupportsProtocol` 同时供 common 准入和 Assistant selector 消费，当前只支持显式 Chat。空模型返回 `MODEL_DRAFT_INCOMPLETE`，未支持协议返回 `ADAPTER_NOT_ASSEMBLED`，均在 Resolve/HTTP 前失败；没有 fallback。

只读取 pinned Config/Agent 和 Executor 已过滤的 History、Sources、明确 Messages/Delegation。Persona 字面 JSON 原样发送；当前 Intent 只追加一次。子任务约束与 expectedOutput、明确消息的 question/delegation/reply 身份完整保留；同文当前消息的 Text 不再重复发送。目录工具返回已有安全摘要，不含别人的 Persona；proposal 工具只向模型回传提案标识/版本/hash，不回传完整草稿。

有界单 Run 循环在 Run/Resume 共享 turns<=20。每轮输出4096、实际 max_completion_tokens4096/n1。每次真正 POST 的最后 SDK request body 在 RoundTripper 处完整取 UTF-8 字节数（含 schema/历史/结果），然后实际 Reserve→Dispatch callback→transport。无自动重试/redirect/failover；预发送回调尚未进入才 AbortUnsent。只对真实 Attempts 的直接 `*api.Fault` 固定白名单保留预算/当前权限/关闭原因，SDK/provider 原始错误不进入公开 reason。finish_reason 只映射 stop/tool_calls/length/content_filter/未知固定枚举，敏感未知原文不拼入错误。

工具只按现有类型化 Broker 注册映射。显式双向 wire alias（note_write↔note.write 等）满足官方名称 `[A-Za-z0-9_-]{1,64}`，拒未知与碰撞；schema digest 包含有序 schema、canonical/wire 对与版本。严格 JSON 拒重复键、尾部、深度、非法 UTF-8、未知字段与超界参数；全批校验及稳定连续 index/原ID/type 完成后才首个 Invoke。首个 approval_required 立即停止后续调用，完整批次及已完成结果保存到 CP。Resume 仅回填原不可变 Decision，不重 Invoke pending/completed 效果；children 按 RunID 唯一匹配，question 严格按 CP 原 WaitForIDs 顺序与等长 Children 下标匹配，不能用 answer.from_run_id 猜问题身份。混合 children/question 分组逐次等待不丢原批次。

内层 CP 保存兼容版本、协议、Run/Session/Config、工具摘要、完整 messages、初始前缀位置、turn/text、原批序/原ID/参数/结果、Next 和 pending effect/token 或等待 IDs。纯 Inspector 读完整 payload，拒前缀/尾部/重复字段、错绑定、坏角色/顺序、悬空结果和 pending 后插入 user；零凭证/模型/工具/Host。配置摘要保留 pinned 意义，排除实时 CredentialStatus。HUHUCP1 外壳、digest、引用、原子发布和 GC 仍归现有 Blob/Broker，不由 adapter 伪造 Artifact。

流界限：最终 request1MiB、解压后 response4MiB、line256KiB/event512KiB、tool batch32/arguments128KiB/result256KiB、累计可见 text128KiB、CP payload1MiB、Run2min、HTTP45s/idle15s、清理每轮3s。动态下调/撤权/成员代际在下一实际 Attempts 准入复检；不复用首次授权。

metadata Probe 只用显式 endpoint/modelId/key 执行固定 fork GetModel，严格单路径段、无 redirect、10s/64KiB。匹配 ID 返回空 capabilities，表示未实测生成/工具能力，不冒称免费，也不偷偷生成、不新建 Run/账本。生命周期与生成共用 Driver gate/Done；外层 Assistant 从 repo/Resolve 前登记并真实等待，由094/093实现。

## SDK producer 与结算证据

[源码 SHA 与完整生命周期合同](logs/20-sdk-lifecycle-contract.json)记录实际固定源码，不以普通网络 EOF 充当 join：ACL chat_model.go894 的唯一 producer 最后 defer 顺序为 recover→stream.Close897 返回→必要 panic sw.Send899–901→最终 sw.Close903。Eino StreamWriter.Close→closeSend428–430 关闭 items；recv400–407 对该最终 channel-close 才返回精确 io.EOF。无 callback handler 的989–1003 WithConvert 链不新增异步 producer。

Generate 遇取消、sink error/panic、任何 SDK receive error 均 cancel HTTP，继续排空同一尚未 Close 的 reader，直到 `err == io.EOF`（不用 errors.Is、首个错误或 consumer.Close 冒充）。随后关闭 consumer，等待实际 body.Close 返回，再 Settle。无 SDK/global handlers、Copy、自动 Close 或 ResponseModifier；sdkContext 不把继承的 callback values 带入 SDK。F09 用真实 net/http 的 body.Close 阻塞证明：字节已经读完但 writer 最终 ACK 未到时 SQL 仍 dispatched/producer_ended0，Engine.Done/Core.Done 不提前关闭；释放后真实结算和清理结束。

固定 fork client.go182–194 的非2xx CreateStream 同步错误分支读取 error body 却不 Close，ACL885–888 此时没有创建 producer。11真实红灯揭示429/500等待卡住；现明确由调用者在该同步失败分支实际 Close，再等待和结算，12/21/22通过。没有在异步 producer 运行时外部 Close 冒充 ACK。

Settle 只在实际 producer 结束后用独立有界 context。前台失败固定原因返回且账本不能假成功；Driver 内一个本机 worker 保留原不可变观察继续重试（每轮3s、退避/250ms间隔），不新增 HTTP/Run，不在 Stop 时遗弃。PendingSettlements 可纯观察；Driver.Done 包含该 worker。真实 SQL trigger 持续失败时 Run 安全为 MODEL_PRODUCER_UNSETTLED、账本仍 dispatched；恢复 SQL 后同观察结清，Done 才结束。unknown 保留观测到的部分字段并按原预留额计费，不填0；完整已知0可记 known0。

## 产物与验证

01–04 使用 `GOTOOLCHAIN=local`，Root 后来核实本机是 Go1.27.1，并非项目固定1.26.10；原始日志完整保留，sonic fallback warning 是差异证据。这些仅诊断，不作为固定工具链通过结论。06记录实际 `go version go1.26.10 linux/amd64`；06起每次明确 `GOTOOLCHAIN=go1.26.10 GOFLAGS=-mod=readonly`。没有下载/修改锁，Go重检查均由Root唯一窗口。所有命令使用 subprocess.run 等实际子进程退出，sourceDrift 均记录；没有把启动、缓存编译或源码读证当运行成功。

下表每项有同名前缀 `.json` 完整命令/env/输入SHA/exit/耗时/stdout/stderr/Wait 和 `.log` 原始输出，以及 `-input.json` 精确输入：

| 证据 | exit / 秒 | 分类 |
| --- | --- | --- |
| [01-red](logs/01-red.log) | 1 / 1.836 | 夹具缺 expectedRevision，非产品红 |
| [02-red](logs/02-red.log) | 1 / 1.729 | 有效首 HTTP 红：ADAPTER_NOT_ASSEMBLED/HTTP0（1.27.1诊断） |
| [03-first-green](logs/03-first-green.log) | 0 / 7.510 | 初始首链绿（1.27.1诊断） |
| [04-tool-red](logs/04-tool-red.log) | 1 / 1.067 | 有效原批次丢失/无审批红（1.27.1诊断） |
| [06-tool-candidate](logs/06-tool-candidate.log) | 1 / 2.380 | 夹具 approve/reject 枚举错误；非产品红 |
| [07-tool-green](logs/07-tool-green.log) | 0 / 1.016 | 固定工具链首HTTP+两审批绿 |
| [08-settlement-cp-red](logs/08-settlement-cp-red.log) | 1 / 1.378 | 有效 CP 语义红；结算分支另有 typed-nil 夹具 panic |
| [09-settlement-red](logs/09-settlement-red.log) | 1 / 4.392 | 有效原结算失败丢后续重试红；真实Attempts救援清理 |
| [10-settlement-cp-green](logs/10-settlement-cp-green.log) | 0 / 4.632 | 两产品修正绿 |
| [11-matrix-first](logs/11-matrix-first.log) | 1 / 37.905 | 有效非2xx body.Close 红；另有凭证ref重用与fractional/3xx预期错误 |
| [12-restart-http](logs/12-restart-http.log) | 1 / 2.091 | HTTP/usage绿；重开配置摘要临时状态有效红 |
| [13-model-unavailable-red](logs/13-model-unavailable-red.log) | 1 / 0.970 | 有效空/unsupported reason红（Root指出后自有消费者重现） |
| [14-matrix-second](logs/14-matrix-second.log) | 1 / 8.546 | 剩重开夹具 Budget 没继承，合理拒绝HTTP0 |
| [15-delegated-requirements-red](logs/15-delegated-requirements-red.log) | 1 / 1.325 | 实际 SDK 子任务 requirements 丢失红 |
| [16-matrix-third](logs/16-matrix-third.log) | 0 / 6.559 | 当时本票正常矩阵全绿 |
| [17-cancel-bounds-current](logs/17-cancel-bounds-current.log) | 1 / 9.555 | F08/F10绿；F11公共查询正确拒读，夹具需SQL事实观察 |
| [18-question-red](logs/18-question-red.log) | 1 / 1.756 | 双问题实际回复身份正确；当前Intent正文重复红 |
| [19-matrix-complete](logs/19-matrix-complete.log) | 1 / 8.771 | 只剩F11原应用Finalize安全 ACCESS_REVOKED 预期修正 |
| [21-normal-final](logs/21-normal-final.log) | 0 / 9.006 | 全部当时22顶层正常矩阵绿 |
| [22-targeted-race](logs/22-targeted-race.log) | 0 / 30.070 | 11项生命周期/结算/取消/CP/权限/问题race绿 |
| [23-tool-identity](logs/23-tool-identity.log) | 0 / 1.807 | 最终新增5种身份变更负控定向绿 |

21实际 exit0/9.006s（包7.564s）；22 `-race` 实际 exit0/30.070s（包14.065s）；23实际 exit0/1.807s。当前23顶层测试的执行组合是21全当时包+23新增负控，不伪称在23新输入重跑整包。22 race 输入与21相同且无数据竞争输出；23只新增测试，没有变更 production/global shared fixtures。

11的429/500原失败确实出现 Core.Close timeout/Done 未结束，原输出保留，不能声称该红轮所有内部清理通过；Go test 子进程实际退出。修复后的正常与race同类消费者全部真实完成，barrier、server、Driver/Core/Settle 均释放等待。09红灯用捕获的真实 bound Attempts 对已结束 producer 做幂等结算救援，仅为失败清理，不能当作生产后台修复证据；10及22才证明实际保留 worker。没有留下自有 Go/Node/Runner/服务器/producer 或待排检查。

## F01–F20 对照与复用界限

| 项 | 本轮证据与含义 |
| --- | --- |
| F01 | OneHTTP…：真实 Eino→loopback SSE→默认 Executor/SQLite，Persona/Intent、持久消息、known9+4、单HTTP/settled/producer1；07及21绿。 |
| F02 | InterleavedEmptyObject…：两index交错、ID/name仅首片、`{`/`}`跨片，原序 IDs 回填、两个真实HTTP/attempt；SuspendedBatch…与children/question进一步验证原调用位置。23补 index身份变更负控。未将 UTF-8 每字节网络切割单独当已测。 |
| F03 | 首链原字面 Persona；Interleaved…创建另一个含敏感Persona的真实Agent，后续目录工具请求无私人人格；Unavailable…假环境不能补空模型。已过滤 History/Context 的资格仍由原Executor/access基线拥有。 |
| F04 | UsageKnowledge… known/实测0/missing/partial/null字段/negative/fractional，SQL保留unknown与部分观察；fractional由真实SDK拒收但账本仍unknown。finish后usage-only仍被读；双模型轮独立加总30+8。094真实missing usage整额计费另复用。 |
| F05 | BrokenOrRejected…：缺DONE/finish、空流、DONE-only、半JSON、length/filter/refusal、敏感finish、finish/toolcall不一致，全部无Broker effect且固定安全原因/真实结算。 |
| F06 | EntireToolBatch…未知/wire非法/额外身份/坏schema/重复key/缺参数/错误空object/重复ID，首合法调用也不执行；Interleaved…合法{}可执行；23同index改ID/名、负/跳号index/非function均effect0。 |
| F07 | HTTPFailures…429 Retry-After0、500、302/307，真实原服务请求1/redirect目标0，无SDK自动重试；固定工厂仅单Stream且send门拒第二RoundTrip。连接前取消另F08保守unknown。未注入一个有意隐藏重试的第三方client来替代正式配置事实。 |
| F08 | CancellationAfterReserve…真实Reserve后取消、Dispatch前拒绝，账本aborted/charged0/HTTP0；DispatchedCancellationBeforeNetwork…callback已入但网络0仍settled unknown整reserve；CanceledStream…服务器已见body后取消，无晚tool/新HTTP且下一Run成功。 |
| F09 | FinalSDKProducerAck…真实HTTP body.Close held、writer末尾ACK、Driver/Core/SQL保留后实际释放；22 race。sink error/panic drain路径按同实现源码约束，未另声称已实测每种panic/Close组合。 |
| F10 | DecodedStreamAndToolBounds…实际长行、无空行大event、gzip解压总量、大文本/参数、33工具、20轮上限，全无effect/无额外修复HTTP且结算；CP size另F16。request/result/总deadline/idle每个阈值由固定实现明确约束，未逐一耗尽45s/2min做墙钟压力试验。 |
| F11 | RevokedGrantAfterTool…无source正文仅scope，真实工具完成后撤Grant：公共读拒、原应用Finalize ACCESS_REVOKED，模型第二HTTP0；RemovedGroupMember…无source正文移除当前成员，旧准入不可复用，HTTP/attempt各1。 |
| F12 | 首链显式key/base/model、假环境空配置HTTP0；HTTPFailures…跨endpoint redirect0与敏感error body固定reason；敏感finish/refusal负控。凭证/stdio秘密通道及默认CLI由093实测。 |
| F13 | SuspendedBatch…两note原批首pending时Host0/HTTP1，批准一次后第二pending Host1/HTTP仍1，再拒绝原序回填，既不重复效果也不丢未执行调用；完整batch预检在所有Invoke前。 |
| F14 | 原批准/拒绝；ExpiredReplayedAndUnknown…过期Host0、同一拒绝请求重复投递不多HTTP；真实持久Decision重开回填原CallID，不重复Host。审批CAS/Host返回后崩溃恢复资格沿原T06/T16已接纳基线，不冒称本票新kill-process。 |
| F15 | unknown Host：真实Broker调用受控NoteWriter一次产生unknown_outcome、Run失败/effectsUnresolved、模型HTTP停在1；撤Grant/成员取消无后续模型。dispatching/reconciliation/claim漂移原T16网关复用，不直接裸Resume。 |
| F16 | CP Publication…实际filesystem不可写目标、>1MiB内层、Blob成功后SQLite发布trigger失败，全部无假pending approval、后续HTTP/Host0；外壳/孤儿GC归原Blob。 |
| F17 | Inspector…实际合法新HUHUCP1重新计算外壳/digest后错版本/协议/Run/tool digest/位置/effect/CallID/尾添user仍拒绝；截尾/尾加payload拒绝。调用计数证明0新resolve/HTTP/Host。 |
| F18 | ChatCheckpointSurvivesRestart…真实默认SDK已产生完整CP、两次Core关闭重开、持久拒绝Decision、字节引用不变、同Executor原ID回填。仅重开生成的私有resolver注入synthetic（session-memory ref不可重用），不冒称受保护凭证重开现场。完整migration backup/CompletedResult和进程崩溃矩阵复用原091已接纳前置，不重跑。 |
| F19 | SettlementFailure…真实SQLite trigger回滚、Run非成功/原账本未决、恢复SQL后本机worker同观察结清、Done保留；09红→10/22绿。094公开Budget真实默认SDK0HTTP未配置、并发最后余额只有赢家HTTP、未知整额收费另复用；重复/冲突Settle原usage合同不修改。 |
| F20 | 094公开 Assistant→默认实际GetModel：matching ID空caps、404安全error、unsupported HTTP0；093真实默认CLI含metadata GET与Probe/Core join反事实+当前绿。不创建收费Probe，不以元数据冒认推理/工具能力。 |

复用来源：[093报告](../093-engine-foundation/REPORT.md) 与 [094报告](../094-engine-policy/REPORT.md) 已完整回读，SHA在最终manifest。093默认CLI真实进程/私有key/HAP/SSE/持久known10+2、旧fake CP明确blocked；094 metadata与预算真实链均有原命令Wait及输入。095完整五目标闭包/notices由Root原生接纳，本作者没有跑或修改。前置091/T16的已接纳代码门不等于本轮重新运行其全部旧队列；不重复扩大基础矩阵。

## 精确自有源码

以下均相对仓库根；没有改相邻owner源码。

| 路径 | SHA256 |
| --- | --- |
| `native/huhubot/internal/adapters/outbound/eino/chat/body.go` | `8e8a4e4479310ff3282b14a0357562f74c8caf0515d0fc8002be2511a93c9d9a` |
| `native/huhubot/internal/adapters/outbound/eino/chat/driver.go` | `6874c6274e344b1802f11aade758ad3b3f5e35f90056778bafe56e5af6b6f320` |
| `native/huhubot/internal/adapters/outbound/eino/common/checkpoint.go` | `696db729f33be0e69bfc243bbf15e86c1bf9a65c675061f4b8ee71c5c509ab62` |
| `native/huhubot/internal/adapters/outbound/eino/common/engine.go` | `40bc23f7c0a719a9d51d2b71a3bd97df9ba62b3bf2e7ec949fc5033e3b398d7f` |
| `native/huhubot/internal/adapters/outbound/eino/common/tools.go` | `bdcd172963f55be18630709eed9de82592e9b28e309ea2e9dfa20b59401ab351` |
| `native/huhubot/tests/contract/engine/chat/bounds_cancel_test.go` | `e87dce1acb31949de63402bdc1941f0d3eed79be3ca9bceb003cf159e76753c2` |
| `native/huhubot/tests/contract/engine/chat/checkpoint_test.go` | `212823c0f797139bed32d2e48118887c8fe3e809ed5c73a0990ffe994956d844` |
| `native/huhubot/tests/contract/engine/chat/collaboration_test.go` | `ae047e71d582f05866fba4cbd95dc266d0cabdec9e071bc3be018ea7fd55662f` |
| `native/huhubot/tests/contract/engine/chat/current_gate_test.go` | `ce64f42a75663698f8b1c9625ba77dd1cc1907476b534ea74f5a09a10a7fa6cc` |
| `native/huhubot/tests/contract/engine/chat/decisions_test.go` | `dd55edd3c9087bacdbc0a405419fd4f493d15eea1790453dcc2e0c7ebcf37bf5` |
| `native/huhubot/tests/contract/engine/chat/engine_test.go` | `cc12cdc56f05c8ac63a7e49ee4e4c06a21e990f30e8144f15b5bdf2df858bd7c` |
| `native/huhubot/tests/contract/engine/chat/lifecycle_test.go` | `318bf65f6740d7900bfa10795ec94c4c6d265ee252301a52137d586b7cacb5c5` |
| `native/huhubot/tests/contract/engine/chat/protocol_test.go` | `994be4cf675d000e8458269596aefe08f97c819197a0d7519bfebd467bdd6805` |
| `native/huhubot/tests/contract/engine/chat/question_test.go` | `74116ed29519512a9b7b98c261f94fe443b475b27a459cba485356aead8e0d8f` |
| `native/huhubot/tests/contract/engine/chat/settlement_test.go` | `78cab27aad33489f424aa3cda002c06597fe7ef0e98bae93e3c301a962bc7075` |
| `native/huhubot/tests/contract/engine/chat/tool_identity_test.go` | `3af1ada35ab79d2ecd562069ac4a64e65357f0afaf6b790e9ba7217da020c13d` |
| `native/huhubot/tests/contract/engine/chat/tools_test.go` | `d5061e63054a89197bed4a1ede29bfac05760953d1187f23a58076f848ea0ec9` |

## 问题与下一步

真实 Provider、模型实际能力/计价、Obsidian、Windows/macOS 现场、系统keyring/D-Bus/受保护密钥重开均未运行，按原用户决定保留现场后验，不请求凭证。所有loopback key和正文都是合成夹具；metadata不证明收费生成能力。没有全模块test/vet/race、插件build/lint/Node产品检查，也没有提交、推送、发布、归档。仅必要结构return维护命令，不能当产品功能验收。

部分F条包含的所有排列（sink panic、墙钟2min、每字节UTF-8切割、恶意隐藏retry client、真实Host返回即kill等）未在本票逐一新跑；上表明确实际覆盖、固定源码约束和原owner基线复用，没有将这些并为“全部故障组合实测”。现场Provider若不返回[DONE]/finish或输出未知finish将严格失败，保留部分文本/unknown费用，不自动兼容/修复重发；这是本票冻结判据。长期SQLite不可写会保留单一本机结算worker及Profile/DB所有权，Close可超时而Done未完成；不能为了退出伪造结算。恢复可写后真实自动结清已测。

T09/T10复用点：Driver.Generate/SupportsProtocol/Stop/Done/Close和common的私有Eino消息/typed tools/CP循环已在本票；只接受新协议driver明确归一化的function call index/type，CP绑定Protocol。后票若需改变EngineVersion/CP格式/共享工具语义/预算界限，须Root给原T08 common owner必要维护窗口，不能自行越权改shared common；不预造Responses/Anthropic占位或fallback。

当前生产与测试全部停写；所有自有Go进程实际Wait，无活跃producer/后台任务。Go窗口已交Root。本人已执行 readonly return 结构检查，最终回执见 logs/26-return.json（首轮报告缺模板标题的结构失败见25，已只修报告）；通过原生 MESSAGE+FINAL 全面停写交回，候选最终接纳归Root。
