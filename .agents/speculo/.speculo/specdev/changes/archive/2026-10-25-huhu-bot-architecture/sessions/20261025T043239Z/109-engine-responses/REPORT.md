# Responses 真实协议桥实现候选

Session: 20261025T043239Z  
Task: 109-engine-responses  
Status: completed

## 聚焦交接

按冻结 TASK 与 Root 的分阶段唯一 Go 窗口完成本票 Responses driver，生产和测试现已冻结。完整包 normal 与五项定向 race 均已通过并实际退出；本作者实现候选交回，不宣称联合代码门或 T09 全票接纳。最终自有范围是六个新生产文件和八个新测试文件，逐文件摘要（历史日志已清理：`logs/final-own-source.json`）、完整新增差异（历史日志已清理：`logs/final-own.patch`）均可回读。common/chat/httpcall、Core、Broker、API/SQL/HAP/TS、锁、许可和正式状态未写；没有新增 Runner、预算账本、公共 Provider DTO，也没有提交、推送、发布或再委派。

实际运行固定 `openai-go/v3 v3.44.0` 的公开 ResponseService.NewStreaming、同步 Next/RawJSON、param.Override 与 ModelService.Get，Eino schema 只在私有 adapter 内。agenticopenai/ADK 是固定研究对照，不是运行分发。107 提供同一不可变 Registry、Generation/StateView/TurnResult/纯 ValidateState 和 httpcall；108 提供默认双协议 Core 与 Broker pinned-protocol metadata。本票不复制 Chat driver/结算 worker，也不改变旧 Chat identity、CP 字节或工具摘要。

每次请求显式指定 endpoint/key/client/retries0，使用不读取环境默认值的 Service 构造器。wire 明确 `store=false`、`background=false`、`truncation=disabled`、`include=[reasoning.encrypted_content]`；没有 conversation/previous_response_id、远端历史、自动续跑或 hosted tools。完整 schema、初始可信消息、历史 raw items 和净化工具结果交原 Attempts 按实际最终请求 Reserve→Dispatch→Settle。环境 key/base/org/project/customheaders/proxy 污染、3xx/429/500控制均实际验证单次明确派发。

`items.go/item_events.go/item_validation.go` 保存完整有序 done items，分别追踪 item.id 与 call_id；message/output_text、reasoning 与 flat direct function 是明确支持集。summary 数组、encrypted_content、reasoning.content、phase 的缺失/null/合法值、caller 的缺失/null/direct均保留；程序调用、hosted/未知执行项、namespace null/named等不能悄悄流入回放。相同合法 text delta 不按值去重，reasoning 与Provider错误正文不进入公开历史。completed.output 必须与全部最终项一致，整批工具及 candidate state 经共同 Engine 校验后才首次 Invoke。

`checkpoint.go/request.go` 保存版本化每轮位置、response ID、terminal和 raw item JSON，与 common transcript/Intent/工具调用投影逐一核对；回放仅从这些本地项与净化 function_call_output 生成，原 call_id/结果顺序不变。Responses 独立 identity/state format，不从CP自选协议。生成前、candidate commit前、纯 Inspect 和 Resume 均使用同一校验。最终CP的1MiB限制包括双重编码开销，超限不发布审批或checkpoint。

共享 httpcall 负责唯一实际请求、原Body追踪、字节/行/event/UTF8上限、取消/超时和持久结算责任；本票不另起后台 producer。SDK同步循环结束、真实 Body.Close 与 watcher/timer join 后才 ProducerEnded。Finish错误优先于typed completed/早到usage；坏原始字节强制unknown，合法失败terminal可保留真实费用，缺失/部分usage不能变成known0。Stop后真实SQL结算失败仍保留同一attempt直至成功，Done不提前。新增 `NewDriverWithTransport` 是 internal adapter 内的薄基础设施构造接缝，默认 NewDriver 行为不变，不暴露为 Application API。

Probe只执行明确受限metadata GET，检查单路径modelID和返回ID；capabilities未知为空，不能猜测生成能力或fallback到POST。默认公开 TestModel八项控制实测只有三个GET、零Run/attempt/POST。

## 产物与验证

实际使用 dev 的原生Go、持久化、异步生命周期与许可规则，复用未变的 SpecDev I/preflight/设计/TDD/error/reliability。最初已实际调用 OpenAI Docs 搜索并打开[官方 Responses 流事件文档](https://developers.openai.com/api/reference/resources/responses/streaming-events)，再以固定SDK源码核对实现；初始预检（历史日志已清理：`logs/initial-preflight.json`）保留调用、来源与未成功抓取页面的边界。最终只读接口/SDK来源摘要（历史日志已清理：`logs/final-readonly-sources.json`）记录实际输入，不能把摘要数量当作生成SDK全文已读。

Go环境固定1.26.10、GOWORK=off、GOEXPERIMENT空、readonly；normal CGO0，定向race明确CGO1并用独立捕获器，避免外层环境被原脚本CGO0覆盖。每轮完整stdout、stderr、实际命令、退出码、Wait、全部native源码/锁/embed/fixture ZIP及前后漂移均保留；历史失败不覆盖。后续输入由 git ls-files tracked+untracked 精确选择并排除dist；slice1历史输入曾包含未参与的旧dist摘要，保留事实，没有拿旧发行物证明本票。

| 阶段 / 原始回执 | exit / 实际 Wait秒 | 分类 |
|---|---|---|
| initial-red（历史日志已清理：`logs/initial-red-result.json`） | 1 / 0.808958 | 默认缺失行为红 |
| slice1-green（历史日志已清理：`logs/slice1-green-result.json`） | 0 / 11.503932 | 同默认文本绿 |
| slice2-red（历史日志已清理：`logs/slice2-red-result.json`） | 1 / 0.933581 | mixed缺失行为红 |
| slice2-green（历史日志已清理：`logs/slice2-green-result.json`） | 0 / 1.199296 | mixed工具/opaque绿 |
| slice2-text-regression（历史日志已清理：`logs/slice2-text-regression-result.json`） | 0 / 0.874481 | 首文本影响回归 |
| slice3-initial（历史日志已清理：`logs/slice3-initial-result.json`） | 1 / 4.722263 | 合法incomplete item有效红 |
| slice3-fixed（历史日志已清理：`logs/slice3-fixed-result.json`） | 0 / 2.982059 | 同组修正与负控绿 |
| slice4-initial（历史日志已清理：`logs/slice4-initial-result.json`） | 0 / 1.257426 | 纯CP/真实重开窄批 |
| slice5-initial（历史日志已清理：`logs/slice5-initial-result.json`） | 0 / 2.022443 | 当前授权/取消/Close/SQL结算 |
| slice6-initial（历史日志已清理：`logs/slice6-initial-result.json`） | 1 / 2.563799 | 两缺陷与夹具/预期分类 |
| slice6-error-valid-red（历史日志已清理：`logs/slice6-error-valid-red-result.json`） | 1 / 1.145494 | 合法error单变量有效红 |
| slice6-fixed（历史日志已清理：`logs/slice6-fixed-result.json`） | 0 / 219.114202 | 同四目标+malformed负控绿 |
| final-normal（历史日志已清理：`logs/final-normal-result.json`） | 0 / 10.879097 | 完整Responses normal |
| final-race（历史日志已清理：`logs/final-race-result.json`） | 0 / 50.131796 | 五项CP/生命周期 race |

命令索引（历史日志已清理：`logs/command-index.json`）保留所有精确参数、环境、原始日志路径、输入SHA和逐测试结果；表内Wait是实际子进程等待时长。

关键失败均先保留再分类。最初默认公共入口可编译但 ADAPTER_NOT_ASSEMBLED、HTTP0，是有效缺失行为红。mixed首红包含尚未支持的reasoning/function事件，不把单一分支冒充唯一根因。slice3有效红是合法incomplete item导致过早拒绝真实incomplete terminal和费用；最小修正后增加“incomplete item+completed terminal”负控。slice6原首轮36/39通过：summary interrupted 是自有处理缺陷；error正例param:null类型不合固定SDK，单变量改为字符串后仍实际红，才修已知error路由，原null保留malformed负控；opaque超限的内部 Fault 被 Executor安全投影为 MODEL_EXECUTION_FAILED，是测试观察层误期望。精确最后补丁（历史日志已清理：`logs/slice6-fix.patch`）只改两个自有handler及测试，不改共享错误合同。

最后同四目标40子场景全绿；命令Wait219.114202秒而包测试3.801秒，包含真实磁盘/编译/链接等待，不冒称协议超时或取消测试持续219秒。最终normal14顶层/73子场景全通过，Wait10.879097秒、包8.933秒。最终race五顶层全部通过，Wait50.131796秒、包6.696秒；实际环境CGO1。共同332输入SHA `b869b93ee94d6689df4ed3f245c0ea3728bd73eabf74761cff3259cb57716266`，当前各轮drift=[]。

完整R01–R14映射（历史日志已清理：`logs/risk-matrix.md`）区分本票实测、共享复用和not-run。主要真实消费者穿过Core/Executor/Broker/SQLite/Blob/SDK，note Host为受控fixture。两个混合工具先批准物理写1、后拒绝不写；完整CP15种语义篡改即使重算合法HUHUCP1外壳hash，Inspect/Resume仍在凭证/HTTP/Host前拒绝。当前read/send Grant撤销后第二请求为0；公开Cancel后迟到有效工具不进入审批/Host，下一Run仍可请求。真实原Body.Close屏障及SQLite trigger阻断settle证明Stop不提前释放资源，恢复结算只处理原attempt、不再HTTP。

跨重启正控确实重开真实Profile并用原完整CP/原决策继续：首先生产默认重开按缺凭证阻断；最后实际Resume使用显式固定假resolver，并在一次性DB只模拟同ref/profile当前credential_metadata available。它不证明生产secret恢复，未重注册失效ref；108另有实际 CREDENTIAL_REF_REUSED 负控。CP编码上限测试显式包装真实common.Engine，仅捕获其内部返回Fault，再由真实Executor/Broker/SQL观察安全公开失败；不是默认Core内部窥探，也没有改变Engine结果或产品配置。

107的旧Chat原producer字节兼容、Registry与真实SDK helper normal/race，以及108默认CLI/Broker/fake/heldProbe，按未变共享输入复用；这些不代替本票上述协议消费者。111的五目标模块许可图可复用：slice5唯一新增生产import为已有标准库net/http，最后handler修正没有imports/build tags/embed/锁变化。111原167源码/选中文件SHA仍为其历史快照，不宣称与本票最终新driver字节相同。固定SDK为公开依赖，无复制第三方Runner或SDK源码。

## 问题与下一步

本作者范围没有剩余必需产品改动、检查或已知未处理的本票缺陷；没有把全部合同矩阵分支冒称已单独运行。Responses专用审批过期/重复resolve/unknown Host receipt、更换recipient/群成员/children/question等待、满45s请求/15s idle/2minRun或不断ping时间墙未另跑，映射中注明未变共同合同复用与实际边界。真实Provider、Obsidian、目标OS持续user-owned/not-run，未索凭证；未跑全模块Go、广域race、插件build/lint或自行推进正式状态。

Root的独立CLI/HAP/Host E2E另记在其证据中，独立双轴与正式接纳仍归总控，本报告不复制或冒领。最终normal/race已实际Wait，Go窗归还回执（历史日志已清理：`logs/go-window-return.json`）和14源再核摘要齐全；本人亲自执行只读return结构校验并生成工件manifest（历史日志已清理：`logs/artifact-manifest.json`），原生MESSAGE+FINAL后停写。return结构校验不认证产品行为或联合验收。
