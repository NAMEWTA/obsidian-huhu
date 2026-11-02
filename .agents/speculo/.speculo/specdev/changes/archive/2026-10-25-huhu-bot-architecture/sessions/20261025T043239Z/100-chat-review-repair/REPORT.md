# Chat 两项审查缺陷修复候选

Session: 20261025T043239Z  
Task: 100-chat-review-repair  
Status: completed

## 聚焦交接

按冻结 [TASK](TASK.md)（SHA `fee99d72983d06ecc75ade2c54b657fcec232e70fca33b5828edc50981f3c123`）、Map24/Goal23 和 Root 原生窗口完成 F-098-01/F-098-02 的原 T08 写集修复候选。Root 回读、重构建 E2E 与独立复审后决定正式接纳；本文不自行关闭 Ticket/Gate/28票。保持 `huhu-eino-0.9.22-chat-bridge-v1`、原 CP payload/Format 与 ToolDigest 算法/实际工具定义，无新依赖、SQL迁移、HAP字段、SDK替换或模型fallback。

只改3个自有生产文件、1个既有测试并新增2个测试。101原owner只维护两个内部Inspection.Intent、SQLite原同Tx受理Intent与Broker透传，本作者没有写其文件。没有改092或098旧报告/日志、正式Map/Goal/Evidence、go.mod/sum或其它生产；没有再次委派、提交、推送、发布或归档。

已按 AGENTS workspace/catalog 发现、SpecDev I 权威入口及已读实施/预检/风险/失败与可靠测试规则执行，实际调用 dev 的原生Go/恢复/生命周期对应验证。重新读取 dev/SKILL、testing参考与本次TASK/正式窗口/098完整报告、两探针源码和真实原始log；00输入与规则摘要（历史日志已清理：`logs/00-input-and-preflight.json`）保留HEAD、实际来源SHA及17个原自有文件字节副本。HEAD仍 `33c21e098ef3188cbab5a09f3e0a01fadb787715`；共享工作区既有dirty状态不清理或接管。

F-098-01：`readState` 与 `validateTranscript` 从外部获得可信accepted Intent，纯Inspector消费101的 `q.Intent`，Resume消费原 `resume.Input.Intent`。同一校验严格比较 `Messages[Initial-1].Content == intent`，在 applyDecision、Resolve、后续工具/HTTP前拒绝替换。不是在CP自己复制hash，未新增正文事实源。最后初始user角色、Persona、原调用与结果顺序等原检查保留；不把当前刷新后的完整History机械替代/比较旧CP，也不承诺没有独立基线的任意历史真实性。

F-098-02：解压后的response仍经原observedBody，但原始字节先用有状态UTF-8扫描再交SDK。合法完整rune原样送入既有SDK/观察器，只扣留最多3字节未完整后缀；非法单字节、过长/错误编码或EOF时截断rune返回固定 `MODEL_STREAM_INVALID` 并cancel。不会让SDK的JSON解码先把非法字节变U+FFFD；真正合法的U+FFFD（三字节）仍允许。EOF残行也按同一原始检查处理并完成终结事实观察。保留原总量/行/event界限、idle/deadline和完整batch首Invoke前检查。

非法UTF-8会明确清掉usageKnown，保留unknown保守结算；既有cancel→排空到producer-owned最终ACK→实际Body.Close返回→原Attempts.Settle顺序不变。没有提前Close消费者冒充producer结束，也没有在免费路径重新发HTTP修复正文。SDK、Bridge与账本的原owner边界均保持。

## 产物与验证

01稳定候选（历史日志已清理：`logs/01-candidate-source.json`）在101三个生产接口逐SHA匹配后冻结，自有候选SHA `93560d76c69dc04c3042e8cffc777597db70595b0afde7511dabe254d6016274`。Root细化唯一Go窗口允许101仅并行编辑不进入Chat编译的独立foundation测试；本次实际输入固定 production Go/SQL、cmd、锁及全部Chat测试，显式排除其它不编译测试/报告。两命令共同输入 `e7a1a41e8780004d114707be5538ef91c5c472fc704420f3cf31c17ed7b387a8`，sourceDrift均[]；没有将非依赖的101新test写入误报产品漂移。

固定环境：`GOTOOLCHAIN=go1.26.10 GOFLAGS=-mod=readonly GOWORK=off GOEXPERIMENT=`；normal明确CGO0，race明确CGO1。没有使用local/go1.27.1，没有锁操作/下载，没有全模块或旧重型大队列重跑。Root授予窗口后才执行Go，类型稳定前只读/编辑/gofmt。

| 检查 | 实际结果与证据 |
| --- | --- |
| 原098产品红复用 | [098原报告](../098-chat-review/REPORT.md)、01 CP探针actual1/2.240s/Wait、02 raw wire探针actual1/0.929s/Wait已完整回读，SHA收录00。原正常控制通过；Intent替换实际第二HTTP/Resolve、原始0xff实际effect/approval1，均为真实SDK/Application/Broker/SQLite反例。未重跑不变原红，未把正常历史前缀变动扩大成第三finding。 |
| 02定向normal（历史日志已清理：`logs/02-target-normal.json`） / [完整log](logs/02-target-normal.log) | actual0/4.485s/Wait，包1.906s，8顶层。新Intent六控制、raw UTF8七控制，加原完整CP语义、审批两调用、真实重开、SDK held body.Close、HTTP错误/redirect及decoded limits/20轮。全通过，sourceDrift=[]。 |
| 03受影响race（历史日志已清理：`logs/03-target-race.json`） / [完整log](logs/03-target-race.log) | actual0/21.891s/Wait，包14.900s，3顶层：新Intent、rawUTF8与真实SDK body.Close末端ACK。无race诊断，sourceDrift=[]，没有扩大旧全队列。 |

02的完整命令为 `go test ./tests/contract/engine/chat -run '^(TestCheckpointIntentUsesAcceptedRunBeforeResumeIO|TestRawWireUTF8BeforeSDKAndEntireToolBatch|TestCheckpointInspectionRejectsCompleteSemanticDamageWithoutIO|TestSuspendedBatchKeepsOriginalCallsAndDoesNotRepeatEffects|TestChatCheckpointSurvivesRestartAndOriginalDecision|TestFinalSDKProducerAckWaitsForBodyCloseAndSettlement|TestHTTPFailuresAndRedirectsNeverRetryOrLeak|TestDecodedStreamAndToolBoundsFailWithoutEffects)$' -count=1 -timeout=90s -v`。03同包仅保留新Intent/rawUTF8/SDK body.Close三个名字并加 `-race`；精确argv/env/stdout/stderr/时间/输入SHA/Wait均在JSON，日志原样保留。

本轮两次命令首跑均绿，没有本轮新的产品/夹具失败需要抹除。TDD红证据是098已接纳的真实反例，本轮不复制改写其原探针来造红；新永久用例在同一路径加上更精确控制。

Intent永久消费者通过真实Engine→包装CheckpointAccess.Publish→真实新HUHUCP1/引用发布→公共Approval.Resolve→Executor→Resume。错误注入只在内层生产后/发布前替换Intent，不改SQL、digest、决策或原CallID；纯Inspector用101新字段的原input.Intent独立比较。坏Intent/Persona/tail在Inspector拒绝，Resolve/HTTP保持1、Host0；public拒绝后Resume同样失败且没有新Resolve/模型/工具，原attempt已settled/producer1。正常批准/拒绝恢复各HTTP2、原CallID与结果保持；批准仅Host1、拒绝Host0。history_refresh控制只在Run初始前缀加入历史，Resume由真实Executor重新给当前过滤内容，保存前缀仍保留且原Intent一次，说明本修复没有冒充完整历史冻结真实性。

raw wire永久消费者的default_*变体使用默认bootstrap/私有合成凭证/真实HTTP/SDK/Broker/SQLite。合法“漢字🙂�”保持原文并到审批；原始0xff单工具与第二工具均安全failed、effect0/approval0、HTTP1/Host0。byte_*变体只在私有transport测试接缝把真实HTTP decoded Body.Read严格限制为每次1字节，同时包装真实bound ToolInvoker做准确计数，没有stub账本或返回假模型结果：合法控制读取425次、Invoke1；第二工具0xff读取442次而Invoke0；EOF截断rune读取443次而Invoke0；合法EOF残行读取424次仍到审批。全部attempt为settled unknown/producer1，charged==完整reserved且>0，固定reason无Provider正文，资源实际join。

日志中default_*的 `invocations=0` 是未装计数包装器的默认值，**不作为默认路径直接Invoke计数证明**；默认路径证据是实际SQL effect/approval0。精确0 Invoke由byte_invalid_second/byte_eof_truncated的真实Broker包装计数证明，两个变体都没有用受控Attempts替代原预算账本。既有F09 held真实Body.Close控制在normal与race均通过，SDK producer最后清理/真实结算资源等待未回退。

所有Core.Close/Done、显式Engine.Stop/Done、HTTP Server/Transport cleanup与Go子进程均已实际完成；没有悬挂producer/settlement worker或Go产品检查。两次输出Wait已原生通知Root，唯一Go窗口交回101。101自身的可信同Tx→Broker透传测试及Root新构建E2E/复审另由原owner提供，不冒认为本作者运行。

精确自有diff（历史日志已清理：`logs/04-own-final.patch`） SHA `e5c46d1ec2cb62ad06da6913ebb621b48c94cd5594fdb481694cb599dd87254f`；最终六文件与接缝摘要（历史日志已清理：`logs/05-own-final.json`） SHA `3485cc5561178af3848d3c32472b1ee07b8d6132dc6d94f8e256840997beaacb`，own tree `926199cdc6d4934be20de7b97e59d2f22edb462e97933fb492bc03da7acfc023`。00内未涉及的原自有源码逐SHA无漂移。

| 自有路径（仓库根相对） | SHA256 |
| --- | --- |
| `native/huhubot/internal/adapters/outbound/eino/common/checkpoint.go` | `c4abed58b0a9d9278ef1bbf72a841a6b0470a3d510c6088eaf8ef514d5f2c431` |
| `native/huhubot/internal/adapters/outbound/eino/common/engine.go` | `84762d74262fa956ff164400609a0deb0c6761ea8ca824ebfda18442d6b7fbea` |
| `native/huhubot/internal/adapters/outbound/eino/chat/body.go` | `bb00b4933ca8641f120b4728bfc035b0efe3828fdd0486c630b3de728b20c100` |
| `native/huhubot/tests/contract/engine/chat/checkpoint_test.go` | `f0923a8a0b39b8af3e4df1f0d209150f2de38f23aba5d2bdec9d0932b8b877ba` |
| `native/huhubot/tests/contract/engine/chat/review_intent_test.go` | `b20f0a7f6a96d5552384ce0345d6962dfe852ff239db60699b04751c34791713` |
| `native/huhubot/tests/contract/engine/chat/review_utf8_test.go` | `b2979fff5e83f2ab32678176f71bf1233920dd86baa461f23d275655d98ec994` |

只读101接缝：

| 路径 | SHA256 |
| --- | --- |
| `native/huhubot/internal/application/api/recovery.go` | `a20bc1d0eb926b1b4f474a81b794c9668b5833a6cdc4d15f00688f977fd13e7f` |
| `native/huhubot/internal/adapters/outbound/sqlite/execution/recovery.go` | `1e0bf54b3b2eef209185def12b8e5e56c7c7f84ba23063111beb7c8f8a9131d3` |
| `native/huhubot/internal/application/tooling/broker/recovery.go` | `e47187c30b84ed91b29151550eb89c27cf6019f77c786ed86b680e7d919edee6` |

## 问题与下一步

本候选没有已知未修两finding的代码缺口，仍需Root按新固定生产重新构建E2E并派独立复审；作者局部绿不是双轴pass。没有运行其它旧队列、整包/全模块/vet、全量race、五目标重闭包、插件build/lint或notices生成。此次仅标准库UTF-8检查，无依赖/构建/许可闭包变化，095旧许可事实按Root影响复用；本次正文边界/producer生命周期用上述近端真实消费者与race验证。

未运行真实Provider/模型计价能力、Obsidian、真实Vault、目标OS或系统keyring；按用户明确决定user-owned/not-run，不索凭证。历史完整来源真实性不因Intent核对自动成立；原098 prefix_insert附加观察没有可信独立历史基线，不将它在本票升级承诺。CP格式、Chat v1/EngineVersion和ToolDigest继续与原候选兼容。

当前生产与测试已停写，全部自有进程已Wait并交还唯一Go窗；仅完成本报告/artifact manifest及本人readonly return结构校验。最终回执见logs/06-return.json，之后原生MESSAGE+FINAL全面停写交回。正式状态、F-098接纳和Ticket/Gate/Goal推进归Root；不自行归档。
