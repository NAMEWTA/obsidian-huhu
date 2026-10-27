# 事件与审批候选 2 独立双轴复审

Session: 20261025T043239Z
Task: 050-events-approval-rereview
Status: completed

## 聚焦交接

标准轴 **pass**；规范轴 **pass**。原 046 三项 P2 在原输入和断言下均已独立转绿，实际影响闭包未发现新的需修复 finding。此结论只针对当前固定代码候选，不代表真实模型、Obsidian、用户 Vault 或 Windows/macOS 现场通过，也不代表后续票或全部验收完成。

Reviewer：`native:/root/foundation_review`，未参与本范围实现/修复或永久测试编写，未再委派。沿派遣的 gpt-6-astra/high 偏好记录，不声称运行时模型 attestation。唯一输入 `evidence/T-06.md#review-input-r2`；Input SHA256 **b7701a7987833a19f91387607feedb7eb5314864bdd0ac953ea61ceb02d1de33**；169 文件、46 来源；HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，branch `NAMEWTA/bot`，Map13/Goal12。

起止独立解析固定输入、重新解析实际 scope_paths，比较工作副本内容、mode、index、基线和全部来源。相对 046：**10 文件变化、159 文件不变，46 来源全部相同**。完整回读 048/049 最终 REPORT、真实红绿输出和变化；检查 5 个生产变更（4 Go、1 TS）、5 个测试变化及调用闭包。原 046/040/033 观察仅在逐项摘要相同且本次影响未推翻时复用；没有将上一轮失败候选作为当前通过。

先提出并验证三个假设：同 Tx 事实复用可能错误复用首项授权；大页补读可能越过 generation/撤权边界；快照从消息表取来源可能放松整体 Run 资格。以下代码检查、原反例、独立差分和受影响套件均未支持这些失败假设。没有以作者新测试绿灯代替独立判定。

## 产物与验证

[固定输入](logs/input.json)、[起始核对](logs/input-start.log)、[末次核对](logs/input-final.log)、[命令与实际退出](logs/commands.json)、[隔离副本摘要](logs/copy-integrity.json)、[探针摘要](logs/probe-artifacts.json) 可回读。外部副本 `/tmp/huhu-events-rereview/repo/native/huhubot` 的 132 个固定 native 文件逐项与当前输入相同；046 三份 Go probe 和 `large.ts` 逐字节不变，只在外部副本追加独立 probe。原 046 失败、原临时数据库及作者中间失败日志均未改写。

| 独立实际运行 | 结果与边界 |
| --- | --- |
| 原 046 来源历史 + 真实 cursor 快照，normal | [original-normal.log](logs/original-normal.log)，exit0。单 Session、50 个真实公开 Run、100 条合法来源消息约 94KB；2/20/100 subjects，100 条门 1.749775ms，实际 HAP History 返回100项。明确来源正常对照成立；第二 Run 用户空来源在 SQLite/History/真实 CURSOR_EXPIRED snapshotSeq274 中均为空。 |
| 原 046 同一来源 History，独占 race | [original-race.log](logs/original-race.log)，exit0。原2/20/100规模未改，100条26.434614ms <250ms、writer实际调用，HAP100项。保留真实 Source/Grant，不以无来源测试替代。 |
| 原 046 生产 EventClient→HapConnection→stdio→Executor/SQLite，重建当前 Go binary | [original-large.log](logs/original-large.log)，exit0。65000/65536均 seq3→seq5/succeeded，正文分别完整65000/65536，第三次refresh无重复；同 Run 524288页仍完整5事件。当前持久库只读回核见 [large-persistent.json](logs/large-persistent.json)。 |
| 受影响 access/events/chat/approval，normal `-p=1 -count=1` | [contracts-normal.log](logs/contracts-normal.log)，四包exit0，分别1.611/14.736/1.194/1.236s；177条RUN记录含子用例，不冒称177个顶层测试。含当前批单语义、坏数据/parent/alternative、832 Grant分块、来源历史、快照、实际TS-Go、pipe、审批恢复与3个真实checkpoint crash窗口。 |
| access/events，独占 `-race -p=1 -count=1` | [contracts-race.log](logs/contracts-race.log)，两包exit0，8.626/92.854s，无data race。来源100门25.214423ms；来源800门**200.480037ms <250ms**；下一Tx公开Revoke拒绝相同集合。无来源800门114.600948ms。800例是400个独立Session/真实Run的直接gate上界，未冒充一条跨Session History RPC。 |
| 新独立批单授权差分，race | [policy-differential-race.log](logs/policy-differential-race.log)，exit0。先32项同Grant合法输入，末项分别改变source scope、workspace、session、task，批读与单读都给出相同拒绝reason。相同事务内第二次batch在显式fixture revoke后也重新读事实并拒绝。源码见 [reviewer_policy_test.go](probes/reviewer_policy_test.go)；这是adapter差分，不冒充33个公开Run。 |
| TS reducer/codec/connection/validator/EventClient | [ts-suites.log](logs/ts-suites.log)，5文件75项exit0，1.30s。精确错误补读、转义、最大仍不足、显式refresh、失效前后竞态和正文清理均通过。 |
| Root全插件 build/lint | 回读 `evidence/T-04-logs/lead-ts-build-result-r2.json`：均exit0，39.787/73.385s，1814项输入drift[]。这是Root运行证据，本reviewer没有重复构建插件或改产物。 |

本轮独立执行环境 [toolchain.log](logs/toolchain.log) / [toolchain-env.json](logs/toolchain-env.json) 为 **go1.27.1 linux/amd64**；048作者明确 `GOTOOLCHAIN=go1.26.10`，其最终来源800为202.843077ms；Root自己的go1.27.1原100 race为28.067005ms。三方独立结果分别记录，不合并成同环境重复采样。计时均在Root授予独占重窗口内串行运行，未为择绿重复同一性能测试。200ms只是本机受控窗口观察，不宣称任意机器和任意合法多来源组合恒定耗时。

048原来源100 race250ms失败、原快照错误，及首次新增800 race251.380989ms失败均保留；JSON解码复用后的229.663508ms为中间结果，随后还有不可变policy转换/纯验证复用的源码变化，最终独立验证的是完整最终候选。049原Go旧binary下的单变量TS红绿仅用作作者修复证据；本轮原大事件重新构建当前Go候选，不把旧binary当联合验收。本 reviewer 初次读取报告时的目录拼写错误仅为准备性错误，不构成产品观察，未据此判通过或失败。

<a id="standards-output"></a>

## standards-output

Reviewer: native:/root/foundation_review
Axis: standards
Result: pass
Input-SHA256: b7701a7987833a19f91387607feedb7eb5314864bdd0ac953ea61ceb02d1de33
Observed: 对169文件完整候选按风险复审；10变化逐项检查，159未变与46相同来源仅复用有效旧观察。原046 STD-01/02/03的原输入、原断言和当前实际消费者均通过，未发现新的安全、可靠性、资源、性能或工程规则阻断。以下为本轴独立依据，不由规范轴或测试数量代替。

**STD-01 关闭：同事务事实复用保留每条当前授权。** `grants/store.go:127` 收集前逐 input 完整Validate，按256引用分块、参数化查询；Grant过滤真实profile/principal；RunRecipient批取后仍由 `access.go:186` 逐条核本行owner/profile/session及固定recipient/agent/model。事实仅在当前调用/Tx局部map，不在Store持久缓存；相同recipient JSON仅借解码结果，不借前一Run的ACL。SQL rows在函数返回前关闭，短事务在physical writer前结束。

`store.go:78` 缓存的是原始Grant的不可变domain表示/解析结果；`access.go:125` 每条仍构造当前请求并运行 `policy.Authorize(..., now)`，不是“已允许”的memo。每次Source/Scope、operation、recipient、session/task、workspace及当前时间重新判断；Parent状态/期限、alternative最长有效覆盖和最终最小交付期限仍按当前输入计算。旧单读、Mutate/List共用scanner/decoder的错误语义经受影响合同复核；坏operations/recipients/expiry、缺失/外人、recipient变化、混合Profile、父撤权/到期均拒绝。832 unique Grant夹具证明未把800主体误收紧成800全部Grant。独立32+1差分进一步证伪复用首项verdict的风险。

`events/store.go:356` 只按同次调用的完整source_json字节复用解码；HistoryReadInput按值窄化、Scopes新建，下游不原地改嵌套Source。相同解码不替换各message本身的RunID/owner/来源上下文。原合法单Session100页normal/race真正HAP交付，来源800实际gate通过，250ms/800subjects未改。撤权仍和物理输出共门，真实Linux pipe到期后writer返回、revoke提交、排空旧缓冲后无新bytes；自然到期和排队期间撤权仍拒绝输出。性能改善没有靠延长授权生命周期取得。

**STD-02 关闭：有限大页补读与消费者边界相容。** `event-client.ts:146–169` 捕获同一bot/generation/controller与cursor，只对 `BotRpcError RESOURCE_LIMIT/EVENT_PAGE_TOO_SMALL` 从65536补一次524288，同options/signal；结果应用前仍核current。预算按Run entry保留，invalidate重置；最大页再失败即旧paused路径，无自动重试timer，显式refresh至多再一次。错误不是目标reason时不扩大，不重放写命令。

补读前失效不会派第二次；补读在途lease/client/Profile/EOF/dispose/detach失效会abort并丢弃晚到响应。撤权错误走原清正文/messages/facts路径，旧响应不能复活。真正生产TS-Go原65000/65536向量与新增escaped65536、带Source65536向量正文exact、终态seq5，并且重复刷新不增量重复。普通ASCII、NUL、引号/反斜杠的编码开销在单元覆盖。已有64KiB文本、512KiB页、1MiBframe、pending/projection/facts/Run数量边界未改；最大仍读不下时有界暂停可见，不无限从前缀重放。

**STD-03 关闭：恢复快照逐消息来源与持久事实一致。** `events/store.go:193–219,313` 从每条message自己的source_json反序列化，[]保留；null/损坏/未知或重复来源拒绝，必须为已授权effective来源精确子集。读取r/in/head和消息仍同Tx，整体Run当前read检查未被user空来源绕开。原真实270事件Tail/CURSOR_EXPIRED seq274，user[]与assistant派生来源分别与SQL/History一致；明确来源正常对照成立，wholeRun revoke仍拒绝。原finding是来源归因错误，本次不夸大为已证明的正文泄露。

**完整候选其余风险。** Broker/Executor/checkpoint/effect生产路径摘要未变；通过本轮chat/approval普通回归复核共享Grant读语义的影响，原三个crash窗口与DB回滚、approve/reject/expire同Executor.Resume、取消unknown与迟到账本未退化。配置pin/Session写屏障、可信preview与当前目标/版本/lease重查、Approval CAS及不可变CP原子发布按046有效代码观察继续成立。事件seq/Tail缺口/终态compaction/BigInt/late ledger/Run隔离与TS生命周期当前套件再次通过。

read/send分离、历史精确来源与派生范围、Host对象身份/UTF16长坐标/Grant commandId归一化，及033凭证取消/WAL/锁等未变闭包复用此前有效证据；本轮未再跑不相关凭证或五平台测试。Windows写取消/句柄回收仅复用相同代码审查与旧编译证据，不冒称现场运行。模块边界、SQLite归属、唯一schema、依赖/许可和根规则无新变化；局部helper复用没有绕过domain或建立第二授权真源，未见需提升为finding的Fowler问题。

Findings: []

<a id="specification-output"></a>

## specification-output

Reviewer: native:/root/foundation_review
Axis: specification
Result: pass
Input-SHA256: b7701a7987833a19f91387607feedb7eb5314864bdd0ac953ea61ceb02d1de33
Observed: 独立按Spec/ARCH/ADR、T04 AC-030/031、T06 AC-025/028及T01/T02/T03/T05维护和LOG051判断；三项原合同反例在当前固定输入满足最小条件，未发现额外规范偏离。真实用户现场仍按约定后验，不纳入本轮代码门缺陷。

**SPEC-01 关闭：有来源历史满足当前交付与重验合同。** T04 AC-031/verification-method、T03 History与T05精确来源维护要求的是有当前资格的真实消息可在既定边界内交付。原一个Session50真实Run100消息/两Source两Grant/约94KB输入在normal与隔离race由真实HAP完整返回；原250ms未增加。800主体的来源上界夹具同样通过，但明确只是直接gate测试。批取仅复用同Tx事实，末项改变scope/workspace/session/task仍拒，父Grant/替代覆盖/坏状态和新Tx公开撤权未沿用旧授权，physical writer之前SQL结束。未添加uniqueGrant800规则，也未把Host错误改为允许结果。

**SPEC-02 关闭：合法最大事件可续读到持久终态。** Spec第8节持久cursor与T04 AC-030/verification-method要求去重、补齐和最终投影一致。原65536-byte合法Engine事件当前生产EventClient确实到达DB同一seq5/succeeded并保留全文；65000对照、JSON转义及Source开销在真TS-Go链和单元均成立。补读只有一次、沿同一cursor和生命周期，不丢事件、不假装终态、不改变Server或投影预算。最大仍不足和非目标限额有界暂停；显式refresh不形成自动无限回放。权限、cancel/lease/EOF/旧响应失效合同继续成立。

**SPEC-03 关闭：typed cursor恢复与每条消息来源一致。** Spec消息发送时来源/origin绑定与一致snapshot/snapshotSeq、T03/T05本次明确来源和历史派生范围要求分别保留。原第二Run显式SourceRefs=[]用户消息，在真实terminal compaction/Tail after0/CURSOR_EXPIRED中仍[]；assistant有效派生来源完整，显式来源正常对照成立，SQL/History/快照逐条一致。坏JSON/null/未知/重复provenance拒绝；整个Run当前资格、出队再验和同Tx snapshotSeq保留。

**其余规范闭包。** T06可信预览绑定、批准与拒绝/过期、整Run写准入、CP与Approval原子性、同Executor.Resume及取消后无新派发资格继续由未变代码和本轮真实应用回归支持；三个真实子进程crash均reap并按既定状态恢复，未知效果未被伪装成功。T04断线cursor/重复/缺口/快照/BigInt/late fact和当前读资格、实际Linux慢writer取消维持。T01协议/schema、T02配置pin/Usage/凭证生命周期、T03受理与最终化事务、T05历史派生与read/send合同只复用逐项相同且当前影响未推翻的观察。

本候选不包含T07真实Vault写入接线、T08–10真实协议adapter、T11–16群/树/恢复、T20模块UI；这些明确OUT没有当作规范缺失。T27资产/许可由其独立owner接纳，不由本轴代替。没有宣称28票/55AC或用户端全部完成。

Findings: []

## 问题与下一步

本轮无需产品修复；交由Root完整回读并实际接纳双轴报告。Reviewer只写050报告/日志/外部隔离探针，未改产品、永久测试、规范、锁、Ticket/Map/Goal/正式Evidence，没有提交/推送/发布。

所有本轮命令已实际退出/Wait；原Node脚本finally等待Go退出，强杀fallback若触发会失败，本轮未触发。Go合同的Core/pipe/worker与三个故意crash子进程均由测试Wait清理。大事件一次性Profile保留供回读，无存活writer；末次输入与进程清点、return结构校验见 `logs/final-cleanup.json`、`logs/input-final.log`、`logs/return.log`。结构校验仅验证交回格式，不代替本两轴判断。

真实Provider/模型、用户Obsidian/Vault、目标Windows/Darwin/系统keyring现场均user-owned/not-run。未索凭证、未运行旧默认D-Bus自动激活fixture、未访问真实用户keyring。受控Engine/Host/NoteWriter和Linux pipe只能证明报告标明的应用与进程边界。
