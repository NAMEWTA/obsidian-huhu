# Anthropic 最终候选独立双轴审查

Session: 20261025T043239Z
Task: 121-anthropic-review
Status: completed

## 聚焦交接

本人 `native:/root/recovery_review` 未参与本轮实现，没有委派或修改产品；沿用户已选独立 reviewer 身份审查本轮真实差异及影响闭包。结论为标准轴 **pass**、规范轴 **pass**，未确认需要修复的产品 finding。这是冻结代码候选的结论，Root 回读后维护正式票状态；不宣告 T27 或全部 Goal 完成。

唯一正式输入为 [T10 review-input-anthropic-r1](../../../evidence/T-10.md#review-input-anthropic-r1)，共同 Input-SHA256 `2a649a6cf8959681c6dc87f5dc59151f3895c8c7938eab5e98e9ab36a2c2c1b4`。最终逐字节/模式/来源/工作树 scope 核对 2063 文件、30 来源、347 外部副本原文件，全部无漂移；HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715` 和 index SHA256 `d2a2cc618e08f39b6730478bed302db78480d2d10642879f55b1811035e50494` 未变。见 初始输入（历史日志已清理：`logs/00-input.json`）、冻结复核（历史日志已清理：`logs/07-final-freeze.json`）。已读且未变的 workspace/catalog、dev/testing/licensing、I 独立双轴/风险/异步/错误规则按原证据复用。

<a id="standards-output"></a>

## 标准轴

Reviewer: native:/root/recovery_review
Axis: standards
Result: pass
Input-SHA256: 2a649a6cf8959681c6dc87f5dc59151f3895c8c7938eab5e98e9ab36a2c2c1b4
Observed: 追踪默认 Core/精确 Registry/同一 Engine、SDK 原始 Read/Close、原 Attempts/SQLite 与 Broker 物理派发门；外部固定副本的完整 message_stop 后 gzip 尾部屏障、正常尾部、坏 CRC、公共 Cancel 三控制在 normal/race 均实际0，定向 vet 与57文件架构检查实际0。2063文件及模式、30来源、347副本、scope、HEAD/index无漂移；283作者工件、173生产许可输入、五目标实际编译图及51模块根法律文本复核相符。未变 Chat/Responses/common/httpcall 按字节及真实接缝复用，没有用共享旧 pass 冒充 Anthropic producer 验收。

<a id="specification-output"></a>

## 规范轴

Reviewer: native:/root/recovery_review
Axis: specification
Result: pass
Input-SHA256: 2a649a6cf8959681c6dc87f5dc59151f3895c8c7938eab5e98e9ab36a2c2c1b4
Observed: 对照105的A01–A18、Map29采用合同、Map30单断言维护及T10/T01/T02/T06/T08/T27验收，核对完整有序blocks和opaque/presence回放、全批首Invoke前校验、可信Intent及CP候选/Inspect/Resume、原effect/decision与每HTTP当前资格。独立实测message_stop已消费仍不能提前批准或ProducerEnded；正常尾部两请求known26且写1拒绝1，坏CRC及Cancel单请求unknown4905=原预留且审批/CP/写0。Root真实CLI/生产TS HAP Host/SDK受控Vault E2E的2032输入只122测试断言变化，163实际非测试编译文件与二进制/TS bundle匹配，7POST/1GET、两进程自然exit0、7settled/producer1和零pin/slot/reserved相符。真实Provider/Obsidian/目标OS保持user-owned/not-run。

## 产物与验证

### 可证伪假设与独立三控制

假设 H1：SDK 已读取完整 `message_stop` 和合法 usage，但 HTTP 解压器尚未验证 gzip 尾部时，Engine 可能提前返回完整工具批并进入审批，或者错误地标记 ProducerEnded。反例前提必须实际到达原始流读取接缝，不能只让 fixture 返回自造错误。

探针为 完整原码（历史日志已清理：`logs/01-review121_test.go.txt`），SHA256 `96434bf734963663081a0f0eb67fb75a850402b1f712d45ceaa2086260d767c5`，只放在外部固定副本 `/tmp/huhu-review121-6fhb3yc4/native/huhubot/tests/contract/engine/anthropic/review121_test.go`。使用生产 Anthropic Driver + Registry + common.Engine、真实 SDK、真实 httptest HTTP/gzip、真实 Executor/Broker/SQLite；credential resolver 和 NoteWriter 为显式受控 fixture，不能据此称默认凭证管道或生产 TS Host 已被本探针测到，后两者由 Root E2E 单独证明。

向真实 gzip.Writer 写入含六 block、交错工具、晚 signature、非 ASCII、redacted 和空 thinking 的 3868 字节完整 SSE，Flush 后发送 752 字节压缩前缀，暂扣剩余 13 字节（结束压缩块及 CRC/长度尾部）。Transport 明确观察 `response.Uncompressed`，原体包装每次 Read 限为 1/2/1/3/4/1/5 字节；收到下一次 Read 的屏障才能证明先前完整 `message_stop` 已通过 raw observer。屏障期间 50ms 仅作不提前执行的负向观察，不以睡眠替代 producer 完成 ACK。

| 控制 | 尾部屏障时实际 SQL/效果 | 放行或取消后的实际结果 |
| --- | --- | --- |
| valid_trailer | attempt=dispatched、producer_ended=0；审批/CP/Host写/Close各0 | 原尾部成功后才批准第一工具、拒绝第二；HTTP2、Close2、审批2、CP2、写1；Run succeeded；2条settled/ended，总known input19/output7，charged26。第二请求六blocks逐值/presence/顺序相同，公开History无opaque |
| bad_crc | 同上，前缀与正常控制完全相同 | 仅翻转暂扣尾部CRC首字节；HTTP1、Close1，Run failed/MODEL_STREAM_FAILED；审批/CP/Host写0，单attempt settled/ended，unknown且charged4905=该原reservation |
| cancel_before_trailer | 同上，已经消费完整语义终结，但物理流未终结 | 实际公共 Approvals.Cancel 使用当前Run revision；服务端观察ctx结束并完成handler，再真实关闭/结算；HTTP1、Close1，Run canceled/RUN_CANCELED；审批/CP/写0，unknown4905=原reservation |

正常 Read1933 次，两个负控各1595次；normal 和 race 一致。原日志字段 `originalReserved=11133` 在正常控制中来自两条 attempt 的 SQL `sum(reserved_tokens)`，是两请求原预留总和，不是首请求单独预留，也不是最终剩余预算。两个负控只有一条 attempt，该字段4905才是其单条原预留。所有真实体、handler、Engine.Done、Core fixture cleanup 和测试进程都实际等待结束。

H1 未被证实；坏 CRC/取消的完整对照也表明并非因未到达有效工具批前提而偶然拒绝。gzip 尾部失败能覆盖“较早合法终结/usage 已到、较晚物理完整性失败”的接缝，不能宣称穷尽所有压缩算法或所有 EOF 排列。

| 本人实际检查 | 退出 / 实际 Wait | 原输出 |
| --- | --- | --- |
| 固定 Go1.26.10、CGO0，`go test -count=1 -timeout=90s -run '^TestReview121' -v ./tests/contract/engine/anthropic` | 0 / 4.277199102s；1顶层3子控制 | receipt（历史日志已清理：`logs/02-gzip-normal.json`）、[log](logs/02-gzip-normal.log) |
| 同一探针CGO1、`-race -count=1 -timeout=120s` | 0 / 8.499749758s；同3控制 | receipt（历史日志已清理：`logs/03-gzip-race.json`）、[log](logs/03-gzip-race.log) |
| 定向 `go vet`：Anthropic/common/httpcall/bootstrap及Anthropic/assistant合同包 | 0 / 1.364066670s | receipt（历史日志已清理：`logs/04-vet.json`）、[log](logs/04-vet.log) |
| `pnpm test:huhu-bot-architecture` | 0 / 0.635357815s；57生产文件 | receipt（历史日志已清理：`logs/05-architecture.json`）、[log](logs/05-architecture.log) |

以上 Go 均 GOWORK=off、GOFLAGS=-mod=readonly、GOEXPERIMENT空；产品 Go 在固定副本串行运行，架构检查在仓库只读执行。没有复跑旧全模块/大队列/三协议矩阵，没有重复插件 build/lint。检查执行器和字节验证脚本保存在 logs，实际结果与原始日志保留，没有把 wrapper0 代替被检查命令退出码。

### 公开入口、事务与末门追踪

H2：新协议可能自建执行/账本或让第一工具先执行再验证第二工具。六文件实际实现只提供 ProtocolDriver；`driver.Generate` 在既有 httpcall 中序列化并校验实际SDK请求，Reserve→Dispatch→一次 RoundTrip。raw observer 验 event label、原 UTF8/strict JSON、index/type/start/stop，`assembly.finish` 检查完整终结、reason与整批blocks，`appendRound`形成私有状态；common Engine 再解码全部工具/schema并验证候选，之后才到 Broker.Invoke。无并行流中 Invoke、模型自动工具 runner 或第二HTTP补问通路。117的21批次负控同时查真实approval/CP/Host0；不是只有返回Fault断言。

H3：用后来的完整 CP envelope 可能洗白错序工具/Intent 或旧权限。Anthropic validator与common检查共同验证回合/MessageIndex、唯一message/callID、blocks投影、结果顺序及状态、可信原Intent；Generate、Inspector、Resume复用同一纯语义入口，恢复前不Resolve或HTTP。117的17新合法HUHUCP1 artifact负控走实际Blob发布和两消费者；不能将此解释成检测所有自洽历史正文篡改或本地校验opaque签名真伪。当前授权/预算沿原Dispatch重查：117实际撤权source后第二POST0；单批批准/拒绝和重开保持原effect。CP编码膨胀40k/90k正反控制分别在有效原行/event前提下触发真正CP界限；超限不是先撞wire上限。

H4：第三驱动或SDK内部隐藏Body会提前释放Profile/SQLite。`bootstrap.OpenWithOptions`的第三构造失败停止前两个、Registry失败停止三个，调用既有 `stopModelRuntimes`，顺序是所有Stop→所有Done→所有Close，随后provider/store/profile；默认Engine、Probe、Inspector和Broker identity从同一个精确Registry消费，显式fake身份保留。119外部overlay验证的是实际空闲构造失败清理，不是构造期活动HTTP。117真实SDK的Do后ctx取消、>=400 ReadAll隐藏Body、Close barrier及SQL trigger使实际Settle失败均有实际消费者/race；取消并不释放未完成settlement责任。本人gzip控制补充完整终结已到而原读取未结束的独立风险。

### 合同与历史证据的实际适用边界

完整回读 105研究矩阵（历史日志已清理：`../105-anthropic-preparation/logs/interfaces-and-matrix.md`）、[Map29采用合同](../../../evidence/T-10-logs/anthropic-window-map29.md)、[117报告](../117-engine-anthropic/REPORT.md) 和 A01–A18矩阵（历史日志已清理：`../117-engine-anthropic/logs/risk-matrix.md`），以及 [118](../118-anthropic-registry/REPORT.md)、[119](../119-anthropic-foundation/REPORT.md)、[120](../120-anthropic-notices/REPORT.md)、[122](../122-hap-default-expectation/REPORT.md) 报告及Root接纳回执。五作者工件逐项复核88+24+70+79+22=283，全部匹配；各自产品写集14/3/5/5/1也相符。见 复用字节和图核验（历史日志已清理：`logs/06-reuse-verification.json`）。

- A01–A05：有序原blocks、迟到signature/空thinking/redacted、紧凑工具Index、原tool_use_id、未知执行语义整批拒绝均有源码及实际SDK控制；本人gzip小Read与合法Unicode跨读补充A03/A05/A16。保留字段值和presence，不声称Anthropic提供最终完整block JSON原字节。
- A06–A09：usage四分量独立presence、累计覆盖及safe加法，TTL/thinking明细不再次相加；显式0与unknown分开。message_stop、完整block和stop_reason决定工具资格；已知合法拒绝/截断/error费用仍可结算，错误原字节/断流不能用早usage洗白。117原始normal实际17顶层/98子场景，race只6顶层/2隐藏response子场景，均0，不能将98子场景称全部race。
- A10–A12：审批/CP/原decision及当前source资格真实运行；session-memory重开实际missing。117恢复正控显式synthetic resolver并将隔离DB当前credential metadata置available；119默认Inspector正控也是metadata资格模拟，两者都不是真实secret恢复。本审查未要求或自行修改这些生产事实源。
- A13–A18：原Body、回调error/panic、真实SQL失败、Probe/stop/精确identity与旧协议兼容分别有相应消费者；118 Registry路由stub只证明tuple/路由/join，不证明SDK。旧Chat v1原bytes/digest、Responses恢复与默认CLI、fake消费者由119当时真实运行；117后续两源变化与其历史336/339输入保留，不把旧完整快照冒称当前全量字节相同。

基线字节核对（历史日志已清理：`logs/08-baseline-reuse.json`）确认旧Chat、Responses六文件、common Engine/checkpoint/tools及httpcall三文件未变，只有protocol/registry新增精确第三tuple；NOTICE未变。许可/MVS真实变化由120及119旧协议目标检查承担，不能仅因旧本地源码不变而忽略jsonparser升级。最终117的347历史输入与当前只相差122的hap_test.go断言；六生产文件/合同测试与当前一致。

117原初始 ADAPTER_NOT_ASSEMBLED、mixed MODEL_STREAM_INVALID、slice3 stop_sequence/refusal_details/provider_error六个真实失败保留并回读；不是编译失败当行为红。120原两轮SDK/辅助模块登记和CRLF断言失败保留，原子命令观测126与真实断言错误分开，不虚构inner exit1。122原Root失败只打印pointer，122实际诊断展开MODEL_UNAVAILABLE/CREDENTIAL_MISSING/retryable=false，之后只改一行reason，assistant整包18顶层实际0/Wait28.741469595s。本人一次只读清单路径误用 `logs/manifest.json` 返回1，正确文件为 `logs/artifact-manifest.json`，分类回执（历史日志已清理：`logs/09-readback-correction.json`）保留；无产品检查被该读路径错误触发，不计产品finding或修复。

### 默认CLI/HAP/Host与五目标许可

本人独立比对Root [原E2E](../../../evidence/T-10-logs/lead-anthropic-e2e-r1.json) 的2032历史快照逐文件，与 [after122复用证明](../../../evidence/T-10-logs/lead-anthropic-e2e-r1-reuse-after122.json) 的2032当前输入，唯一差异是122测试断言；163个实际非测试编译文件无差异，原CLI二进制及TS bundle摘要相符。原实际Go build0/Wait2.782s、TS bundle0/.569s、E2E0/.830s；7POST/1GET、两自然exit0、批准写1拒绝1、7settled且producer1、known4总58/unknown3总13024、完整SQLite/外键、pins/slots/reserved全0。这里 unknown总量为13024，不沿用Responses历史13240。该r1未重跑未改写；DesktopHapTransport过滤子环境，此E2E不能替代117 Go污染环境隔离控制。受控Vault Host确用生产TS适配器，但不等于真实Obsidian。

120的173非测试生产输入含嵌入文件及锁逐SHA未变；本人重新解析其原五目标 `go list -deps -json`：linux-x64 471包/49模块、linux-arm64 437/45、darwin-x64 469/48、darwin-arm64 435/44、win32-x64 473/50，第三方并集51，另加Go runtime共52。各图确有Anthropic自身JSON包10个编译文件，固定SDK根MIT与独立Go BSD补充同时保留；不是借OpenAI的声明替代。模块根LICENSE/COPYING/NOTICE逐摘要相符，webhooks使用libraries子模块MIT，yaml/v4保留MIT及Apache完整条款。没有把SDK整个require表当真实闭包；也没有把五图称五平台二进制或目标OS执行。许可生成器新增精确版本/附加义务，无算法职责外扩；CRLF修正仅测试读取规范化。当前NOTICE横幅未变，故此轮不新增插件构建要求。

## 问题与下一步

无新增产品finding。保留具体未验边界：未在121重新执行审批过期/重复Resume/unknown Host receipt、recipient或群成员变化、children/question恢复、三真实SDK同时运行、完整45s/15s时钟墙、所有大小/压缩排列和全模块race；这些未改基础合同按影响复用，不称Anthropic专用全覆盖。Provider opaque签名只原样保存并结构验证；不主张本地验真。真实Provider、Obsidian、目标OS及用户keyring均user-owned/not-run，不以现场缺失阻塞本次代码门。

本人亲自用 `readArtifactSectionSync` 提取本报告两个真实HTML锚点核对五字段，见 锚点回执（历史日志已清理：`logs/10-anchor-check.json`）。结构return及实际Wait见 return回执（历史日志已清理：`logs/11-return.json`）、[原输出](logs/11-return.log)。最终 [artifact-manifest](artifact-manifest.json) 固定全部自有交接材料；所有检查、生产者与子进程实际结束后通过原生MESSAGE+FINAL交回唯一Go窗并停写。Root全文回读后处理正式状态；本任务不写生产、永久测试、正式Evidence/Map/Goal、他人报告或永久知识，无提交、推送、发布、归档。
