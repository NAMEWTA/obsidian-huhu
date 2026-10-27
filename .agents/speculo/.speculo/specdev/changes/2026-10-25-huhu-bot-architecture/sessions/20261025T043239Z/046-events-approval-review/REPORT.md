# T04/T06 与 T01/T02/T03/T05 维护完整候选独立双轴审查

Session: 20261025T043239Z
Task: 046-events-approval-review
Status: completed

## 聚焦交接

标准轴 **request-changes**；规范轴 **request-changes**。独立确认三个 P2：带来源历史的交付授权在原 race 预算下失败；合法最大文本事件无法被当前 EventClient 续读；cursor 恢复快照改变已持久消息的来源归属。三个问题分别列在两轴原文，不以作者或 Lead 的绿灯代替判断，也不将用户现场未验收计作 finding。

Reviewer 为 `native:/root/foundation_review`，未参与本范围实现、修复或永久测试编写，未再委派。沿实际派单的 gpt-6-astra/high 偏好记录，不声称底层模型 attestation。唯一输入为 `evidence/T-06.md#review-input-r1`，SHA256 **a129b2b03c62625b541392a92321f9cf16d74383d2de85dbd3c3b44f92339371**，169 个工作副本文件、46 个来源；HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，Map13/Goal12。

起止均实际重新解析固定输入，并比较工作副本内容、mode、index、基线和全部规范来源。对照 040：70 项新增或变化，99 项字节相同；原 36 来源相同，新加 T04/T06 的 10 个固定章节。旧独立审查只复用摘要相同且本次影响闭包未推翻的观察。完整回读 042/043/044 最终 REPORT，043 REPORT SHA 为 `ab882b67de02a95376eef5f5a8850ce5c803fa30749faed070fb23fbb1ac2716`。Root 的 r2 Facade/SQLite、TS-Go、OS pipe 原始日志及 build/lint 回执已回读；r1 的错误 ToolResult 断言、作者原 race 时限失败与修复历史没有被当作当前通过。

## 产物与验证

[命令与退出码](logs/commands.json)、[原始输入](logs/input.json)、[起始一致性](logs/input-start.log)、[末次一致性](logs/input-final.log)、[隔离副本校验](logs/copy-integrity.json)、[探针与日志摘要](logs/artifacts-sha.json) 可回读。外部副本 `/tmp/huhu-events-review/repo/native/huhubot` 的 132 个固定 native 输入逐项与本轮 SHA 相同；只添加独立探针。生产源码、已有测试、规范、锁与正式状态均未写入。

| 独立实际运行 | 观察 |
| --- | --- |
| `go test -p=1` approval/events/access/chat，`-count=1 -v` | [suites.log](logs/suites.log)，exit0，四包分别 1.670/11.228/1.987/1.421s，166 个 RUN 记录（含子用例，不冒称166个顶层测试）。包含三个真实子进程 CP crash 窗口、DB 回滚、批准/拒绝/过期 Resume、取消/迟到 receipt、权限及历史、实际 TS-Go 和 Linux pipe。 |
| 原最大无来源 History gate，隔离 `-race -p=1` | [max-race.log](logs/max-race.log)，exit0；800 消息/400 Run，158.117112ms <250ms，外人/缺失记录拒绝。普通套件同例 8.279991ms。 |
| 新来源成本探针 v1/v2 | 400 Session 各2条、一来源的集合：normal100/400/800约11/39/79ms通过，race均超250ms；收敛到单Session真实100条、一来源后race238.916557ms通过。原失败和通过都保留，未据临界抖动单独形成 finding。 |
| 新单 Session、真实100条 History、两来源/两Grant、实际 HAP | [race](logs/source-two-page-race.log) exit1：2/20 subjects约11/109ms进入writer；100条250.670949ms中断、writer0；实际 `sessions.history` 返回 HOST_UNAVAILABLE/REQUEST_CANCELED、0 items。[normal](logs/source-two-page-normal.log) exit0：100条22.942022ms、HAP完整100 items。固定页面约94KB，不靠超frame触发。 |
| 新真实生产 EventClient/HapConnection → stdio → Executor/SQLite | [large-actual-r2.log](logs/large-actual-r2.log)，工具exit126，接受断言失败。65000字节对照正常；65536字节Run已succeeded/head5，客户端seq3/running → RESOURCE_LIMIT/EVENT_PAGE_TOO_SMALL、seq0/paused → seq3/running。同Run直接请求协议内524288页可读全部5事件。 |
| 新一致快照来源探针 | [provenance-cursor-r3.log](logs/provenance-cursor-r3.log)，exit1。明确来源Run正常对照通过；后续无显式来源的用户消息，SQLite/History为[]，真实270条文本触发终态压缩与CURSOR_EXPIRED，snapshotSeq274却把继承来源附到该消息。没有直接修改SQL来制造该反例。 |
| TS reducer/EventClient/codec/connection/validator | [ts-suites.log](logs/ts-suites.log)，exit0，5文件62测试。绿灯未覆盖上述大事件消费反例。 |
| Root 全插件 build/lint | 两者exit0，1814项前后输入无漂移；是Root运行并回读的证据，本reviewer未重复全仓构建或改构建产物。 |

所有计时探针均在 Root 明确让出的独占重测试窗口串行运行；普通/race 的同一夹具各用一次性 Profile，随机ID/时间不要求字节相同。v1集合不是声称可由单条HAP历史请求直接生成；最终 finding 使用真实单Session公开History及实际HAP消费者。正常对照与失败都保存，没有仅挑最慢一次。

大事件探针使用受控 Engine 发出合法文本、真实 Executor/DB/stdio 和生产 TS；不是实际模型。源码与首次/逐次refresh版本在 [probes](probes/)，实际模型/Host/Vault均未调用。Node探针设置非零退出，工具实际返回126；两个Runner均在finally关闭连接、Core并Wait，未触发kill，也没有清理失败。两份Profile仍在 `/tmp/huhu-events-review/large-profiles*`；[持久状态回读](logs/large-persistent.json) 记录两个succeeded/head5及65000/65536正文，原结果未删除。

快照探针的第一次cursor扩展误把已强类型的 `Fault.Details` 当接口作类型断言，编译exit1，见 [provenance-cursor.log](logs/provenance-cursor.log)。改正探针后才得到r2/r3真实行为失败；该准备错误不算产品finding。早期直接Snapshot反例与最终真实Tail/压缩反例都保留。

<a id="standards-output"></a>

## standards-output

Reviewer: native:/root/foundation_review
Axis: standards
Result: request-changes
Input-SHA256: a129b2b03c62625b541392a92321f9cf16d74383d2de85dbd3c3b44f92339371
Observed: 对完整固定候选按生产者、事务事实、授权、物理输出与真实TS消费者审查，并对70项新/变化和99项未变逐项区分。以下三个P2为实际可证伪失败；未另发现新的安全、恢复、资源或Fowler启发式阻断。测试全绿和平台编译只在其实际边界内采用。

### STD-01 / P2：带来源的合法 History 页仍在交付门内逐项重复查询至超时

位置：`native/huhubot/internal/adapters/outbound/sqlite/grants/delivery.go:55–64,73–87`；相关 `grants/access.go` 的 `checkInTx/runRecipient`、`events/store.go:411–427` 与 `stdio/server.go:215–234`。

批量读取只合并了 Profile/Run/message 元数据；每个有来源 input 仍先完整查询 recipient/Grant，随后同一 `readDeadlineInTx` 再读所有 Grant 计算期限，同一Run的两条消息及同一Grant跨消息反复读取。所有工作都占用固定250ms permit。无来源路径提前返回，所以原800条绿灯没有测到这部分成本。

独立最终触发：一个Session中50个真实公开Run，首Run1来源，后49Run各2明确Source/2有效Grant；受控Host读取、受控Engine返回ok，真实Executor持久成功，公开History得到100条约94KB。没有撤权、自然到期、异常DB或慢消费者。在隔离race下，2/20条正常，100条读被250ms打断且writer0；实际HAP同页返回 `HOST_UNAVAILABLE/REQUEST_CANCELED`。相同夹具normal100条约23ms成功；这是有来源路径在本票明确要求的race/原预算环境失败，不声称所有普通机器必然超时。原无来源800 race158ms正常作为对照。

影响：合法来源历史在声明范围内无法交付，错误伪装成Host/取消故障；较慢执行条件下重试仍重复昂贵查询。依据为仓库risk-review/test-reliability的性能与消费者边界要求，以及当前历史维护合同800subjects/250ms且不能无故拒绝正常历史。不是授权泄露finding。

最小满足条件：同一单Session100条/两来源输入在normal和隔离race下由实际HAP成功返回，保持250ms预算和原800上限；继续拒绝外人、缺失/坏JSON、混合message/run污染、撤权/到期，并保持短SQL在physical writer前结束。可以在同事务内消除重复事实读取，但不能跨事务沿用授权或放宽预算来消除反例。

### STD-02 / P2：合法65536字节文本事件会永久阻断 EventClient 续读

位置：`src/modules/huhubot/services/events/event-client.ts:148–150,166–173`；相关 `native/huhubot/internal/adapters/outbound/sqlite/execution/executor.go:126–127` 与 `events/store.go:126–140`。

Engine sink允许单事件文本65536 UTF8 bytes；Tail按包含runId、seq、sourceRefs等JSON的完整页计费，而EventClient固定 `maxBytes:65536`。单事件无法装下时服务端正确返回 `EVENT_PAGE_TOO_SMALL`；客户端按通用错误清正文/归零cursor/暂停，手动refresh又从零重读相同前缀，未调整请求或取得可恢复快照。

实际生产TS→Go链中，65000字节正常对照达到seq5/succeeded；65536字节文本已在真实SQLite持久化且Run为succeeded/head5，连续刷新为seq3/running、paused/RESOURCE_LIMIT/seq0、再seq3/running。直接同Run请求已有合同允许的524288页，5个事件及终态完整可读。最终日志保留每次状态；不存在模型超限、撤权或假事件注入。

影响：用户看到已完成任务仍running，正文与终态无法经正常EventClient恢复。JSON转义或来源元数据也会占页预算，因此不能只把65536当裸文本大小。依据为可用性/有界分页与真实消费者一致性；当前协议frame、服务端最大页和客户端投影都有独立上限，需要彼此兼容。

最小满足条件：同一65536输入经当前EventClient达到succeeded/head5，正文无丢失/重复；65000对照、JSON转义和来源附加开销仍正确；遵守既有协议/frame/投影上限，不把正文权限、Grant重验或旧响应失效绕开。失败后不能无限清零重放同一前缀。

### STD-03 / P2：恢复快照用Run有效来源覆盖消息持久来源

位置：`native/huhubot/internal/adapters/outbound/sqlite/events/store.go:195–205`；消费端 `src/modules/huhubot/core/events/reducer.ts:88–100` 原样保留snapshot.messages。

snapshot查询没有读取 `conversation_messages.source_json`，却给每条用户/assistant消息赋 `in.Sources`（Run effective provenance）。用户本轮显式来源与Engine从旧历史合法继承的来源并不相同。

独立公共链：首Run明确附一个Source，正常Snapshot每消息一个来源；第二Run的命令 `SourceRefs:[]`，合法继承前轮历史，受控Engine发270条文本并成功。真实Tail(after0)触发terminal compaction/CURSOR_EXPIRED，snapshotSeq274。第二Run同一user message的SQLite `source_json=[]`、公开History.SourceRefs=[]，恢复snapshot却有前轮的Source。无需修改SQL、伪造cursor水位或调用未来UI。

影响：客户端重建时同一消息的来源事实变化，错误声称用户本次意图附带了继承资料，和正常History不一致。这是当前持久数据投影错误；现有whole-Run读校验仍在，没有证据说明它已经造成正文越权，不扩大为泄露finding。

最小满足条件：同一真实cursor恢复中，各VisibleMessage保留其持久source_json，用户空来源保持空、assistant派生来源保持完整；显式来源正常对照保持；未知/损坏消息provenance安全失败，snapshotSeq与消息仍同Tx，现有整体读取资格和交付重验不退化。

**其他完整候选观察。** Broker将身份/claim/recipient/definition固定在执行端，首个等待意图在事务内关闭整Run新写准入；原toolCall恢复先找原effect/receipt，新意图另建effect。可信preview与目标/版本/当前lease重新检查，审批CAS与cancel屏障决定派发资格。CP大小、摘要、不可变发布、DB原子引用与reader hold有代码链和实际三个crash窗口/DB失败回归；未知效果不假装成功，可信迟到receipt只补账，Run终态未重开。普通approve/reject/expire由同一Executor.Resume消费；暂停pin/Session、配置修订和效果未决删除保护可追溯。

事件seq在事务提交内推进，Tail按真正交付cursor分页、空洞在压缩前检查，snapshotSeq同Tx；terminal ledger不被text拼接/错误压缩，TS BigInt及不同Run隔离保持。Engine不能写保留的Run/approval/effect生命周期事实；非生命周期观察被当opaque ledger而不是Run状态。当前裸waiting_approval/canceled消费链实跑通过，ledger状态不覆盖终态。

当前read与send仍分离；History出队按持久message来源窄化，混合message/run批读不污染共享输入，owner/Profile/member/recipient/坏JSON检查保留。撤权与physical writer共门，许可到期取消真实Linux pipe，返回/释放门前物理写已停止，排空旧pipe缓冲后无新bytes；SQL不跨外部等待。队列字节/帧、反向调用、监听器、Run/owner数及EOF/dispose清理有界。Windows同步WriteFile取消/thread handle/ack/Close路径已代码审查，五目标编译证据仅复用作者实际结果，不声称Windows/Darwin现场实跑。

旧040已关闭的来源对象替换、UTF16长坐标、Grant commandId归一化，及033凭证/WAL/锁/有界退出等未受影响观察按相同SHA复用；本轮没有重跑旧默认D-Bus或接触真实keyring。模块边界/懒加载、SQL归属、唯一schema、无新增依赖等未见新的硬违例；不把小型重复helper本身升级成Fowler阻断。

<a id="specification-output"></a>

## specification-output

Reviewer: native:/root/foundation_review
Axis: specification
Result: request-changes
Input-SHA256: a129b2b03c62625b541392a92321f9cf16d74383d2de85dbd3c3b44f92339371
Observed: 独立按T04 AC-030/031、T06 AC-025/028、T03消息与持久执行、T05来源/当前读资格、T01/T02维护及Spec/ARCH/ADR/LOG051判断。以下三项分别违反可交付历史、终态可续读和一致快照合同；此轴结论不由标准轴结果代替。真实Provider/Obsidian/目标OS后验保持user-owned，不作为本轮代码门缺陷。

### SPEC-01 / P2：合法带来源历史未满足既定有界交付合同

权威：T04行为步骤3/4、AC-031和verification-method的真实消费者/关键并发验证；T06/T04当前历史出队维护约束明确 `batch8×page100`、800subjects、总250ms，不能无故拒绝正常历史；T03历史可读与T05每条消息精确来源维护。代码位置同STD-01，尤其 `grants/delivery.go:55–87`。

单Session100条真实公开History仅2来源/2Grant、约94KB，在原预算的独立race条件下无法发出；实际HAP返回REQUEST_CANCELED。normal23ms和无来源800 race158ms均通过，明确表明当前优化尚未覆盖有来源成本。不存在缺少用户OS现场的前提，也未使用真实Provider。此项要求保留当前授权语义/250ms并使同一受影响合法页真正可交付；外人/撤权/到期仍拒绝，不能把失败测试改成允许Host错误。最小满足条件与STD-01相同，另须将有来源路径纳入本票可回跑并发验收证据。

### SPEC-02 / P2：正常事件边界使AC-030最终状态不可续读

权威：Spec第8节持久事件cursor、重复/缺口及重建合同（spec.md:148–150）；T04目标和AC-030明确不丢不重复最终状态，verification-method要求消费者补齐后与DB最终投影一致。代码位置 `event-client.ts:148–173`，服务端允许输入/整页计费分别见STD-02。

65536-byte事件是当前sink合法输入，最终正文/Run已持久成功；EventClient却固定读不下并清零暂停，重连/刷新复现相同阻塞，而协议内较大页可直接拿到全部事实。它不是慢消费者被合理断开，而是一个快消费者面对合法单事件永远无法推进。65000正常对照与真实TS-Go/SQLite证据直接支持该差异。

最小满足条件：原合法最大事件及JSON/来源开销经实际EventClient推进到DB的同一终态/seq，重复与后续事件仍去重，保持授权、frame/投影有界和旧响应隔离；不得丢弃该事件或将Run误报失败以绕过恢复合同。

### SPEC-03 / P2：CURSOR_EXPIRED快照不等价于消息持久事实

权威：Spec消息历史来源绑定发送时修订/origin（spec.md:65,124），Spec一致snapshot/snapshotSeq（148），T04 verification-method要求补齐/重建与数据库最终投影一致；T03/T05区分本次明确来源与合法派生历史。代码位置 `events/store.go:195–205`。

原用户消息明确SourceRefs=[]并持久为[]，正常History也为[]；真实270-event压缩恢复却把Run继承Source附到该消息。该来源并非用户本次发送的引用，snapshot不能凭Run有效上下文重写它。当前错误发生在已装配公共Tail返回的typed recovery，TS reducer复制messages后会继承该错误，不需要未来UI才能成立。没有把此事实扩大为尚未证明的正文越权。

最小满足条件：原公开Run/History/Tail反例在同snapshotSeq下逐消息来源一致，空用户来源、非空assistant派生来源、明确引用的正常对照均保留；当前资格、撤权交付保护与坏provenance拒绝不退化。

**其余规范闭包。** T06预览目标/参数/来源/版本绑定、拒绝不写Host、整Run写门与原子CP/Approval、正常持久continuation及取消后无新派发资格均有当前实现/实跑依据；假Engine/NoteWriter验证应用和合同接缝，不冒充真实Vault效果。T04每次Tail/snapshot/出队当前读资格、排队后撤权与无Grant mutation的自然到期、实际OS writer停止、重启cursor/BigInt/late fact、TS清理与旧响应隔离在本次套件通过。T01唯一协议/schema、T02 pin/Usage/凭证生命周期、T03受理/最终化事务与T05 read-send/历史派生来源的旧有效证据仅按未变和影响闭包复用，三个当前反例明确使本候选代码门未通过。

## 问题与下一步

由Root在完整回读并实际接纳本交回后安排原owner修复三个P2，再冻结新输入复审。Reviewer只报告反例及最小满足条件，未实施修复，也未修改Ticket/Map/Goal/正式Evidence或提交。

全部重测试已结束，独立probe/Node/Go子进程均完成Wait；没有存活writer。末次固定169文件/46来源/HEAD/index/mode一致。return结构校验及最终清理回执见 `logs/return.log`、`logs/final-cleanup.log`；该结构校验成功不表示两轴通过。

真实模型、用户Obsidian/Vault、目标Windows/Darwin/keyring现场均为user-owned/not-run。T07实际Vault写入/receipt核查、T08–10真实协议adapter、T11–16群/树/用户恢复、T20模块/UI仍是后续范围；未把OUT当本轮finding，也未声称28票/55AC全部完成。T27发行资产与许可另由其owner接纳。
