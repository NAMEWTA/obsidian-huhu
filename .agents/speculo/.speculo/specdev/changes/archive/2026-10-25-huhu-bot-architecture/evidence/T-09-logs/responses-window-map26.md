# Responses 联合代码窗口（Map26 / Goal25）

前置已通过：T08及T01/T02/T03/T06/T12必要维护的代码门为evidence/T-08-logs/code-gate-chat-r2.json，独立102两轴pass，正式输入d0f13ca8b86a1c8defdd8e93d9626556c90b426351193ee1d16e4569c6a31768，Root新构建r4产品流程与28票/6条执行AC校验通过。原098两产品反例及全部历史失败保留。新开T09，只重开T08/T01/T06实际共用接缝；原T02/T03/T05/T07/T11/T12/T13/T16已验收职责不作无关扩大。全部28票55AC与DAG保持，G2仍须T09/T10，真实模型/Obsidian/目标OS由用户后验。

## 已采用的技术路线

097固定SDK研究和106原common/chat owner的最小接口方向已经Root回读。Responses使用固定openai-go/v3 v3.44.0公开ResponseService流入口和有界raw item桥；不以agenticopenai空import、Generate捕获重发、整模块fork或浮动版本替代。SDK类型仅在outbound/eino私有树，仍由一个common工具循环通过原Application/Broker/Attempts/CP端口执行。

协议状态必须保留完整有序最终output items、item ID与call ID的区别、reasoning summary数组/加密内容原貌及终结语义。最终done项替换added暂态，completed.output与累积项身份/顺序/语义核对。仅允许已实现的message/reasoning/function_call语义；未知执行/hosted工具安全拒绝，不能静默滤掉再让已知工具执行。回放只从本机完整初始消息、已验证最终items和净化tool result派生，不读取远端历史，不使用previous_response_id/conversation自动缓存。

统一不可变Registry路由明确pinned protocol，供Engine、Inspector、Probe、SupportsProtocol及EngineVersionForProtocol共同使用；没有全局可变当前协议。私有Generation/StateView承载Messages/Initial/Turns/可信原Intent和既有Attempts等请求材料，TurnResult只返回Message与有界ProtocolState；driver的纯ValidateState在成功生成的整批common检查之后、任何Invoke之前，以及Inspect/Resume中执行。原可信Intent核对继续存在，不能让sidecar扩大输入资格。精确签名由106最终交回和后续原owner TASK冻结。

Chat旧EngineVersion、内层Format、完整编码字节、工具摘要{Version,Tools,Aliases}与seed不变；Chat分支禁止携带新增opaque状态。Responses用独立兼容identity/format和必需完整sidecar，缺失、错协议、重排/插入原messages、错CallID/工具投影、重算外壳hash都不能取得兼容性；完整1MiB CP上限包含编码开销。新共享维护不得顺手重写Chat协议判读或既有SDK生产者ACK。

## 原owner及精确边界

- T08 /root/engine_adapter：原common/**内私有类型、Registry、纯状态检查、兼容摘要/编码及必要小型共用HTTP/生命周期辅助；Chat driver的接口适配和实际受影响Chat合同测试。辅助不承载协议items/blocks语义，不复制整个Driver/Runner/结算worker到各协议。具体新文件列入正式实施TASK；其余已接受Chat行为保持。
- T09 /root/foundation_research：仅新增responses/**、tests/contract/engine/responses/**及必要providers/responses fixtures。完整typed events/raw items、请求回放、usage presence、terminal、Probe与真实Close/Done；不改common/chat、bootstrap、Broker或锁。
- T01/T06 /root/foundation_go：bootstrap/core.go、go.mod/go.sum、foundation实际装配回归；Broker service.go/recovery.go的纯EngineVersionForProtocol callback及三处同一metadata helper，approval对应合同测试。默认Engine、Inspector、registry、resolver与metadata成套；显式fake Engine及其旧EngineVersion/Inspector不因补默认Probe变成生产身份。公共HAP、API、SQL迁移、Blob/effect与账本均无已证实新增需求，本窗不写。
- T27 /root/build_integration：待新生产依赖稳定后，原许可/通知写集按真实五目标闭包串行补齐，不把研究缓存依赖当发行依赖。没有根JS/样式输入变化时不机械重建插件。

Broker.Bind早于Engine.Run；空Model/明确未装配协议要继续保留MODEL_DRAFT_INCOMPLETE/ADAPTER_NOT_ASSEMBLED及0Resolve/0HTTP。若无法得到该协议metadata，只在这些已知不可用情形保留原Tools/Attempts、不给Checkpoint能力，让真实Engine返回原错误；不能把任意callback错误吞成正常，发布和恢复无有效metadata一律拒绝。该接缝由原owner以默认产品消费者验证，不能仅测helper。

## 逐请求与终止约束

SDK显式endpoint/key/client/MaxRetries0；store=false、background=false，禁环境/cloud回退、HTTP redirect/隐藏重试和自动历史截断。每次实际最终序列化UTF8 body仍计完整schema/history/results，Reserve→Dispatch→真实传输仅一次；当前授权/成员/额度仍由既有Attempts每次校验。完整有效usage字段presence才known，合法0不同缺失/null/部分，失败终结的实际known费用不退款，未知保守结算。

原raw UTF8、解压后总量/行/event、工具参数、输出、CP、idle/请求/Run上限均保持。SDK Next可能过滤未知事件，driver前观察器仍须识别影响执行的未知语义。最底层RoundTripper在SDK拿到response之前登记tracked Body，覆盖Do已有response但ctx取消/初始SDK Err尚未暴露response的分支。只有实际Next/Do返回、真实Body.Close结束及自有timer/worker join之后可置ProducerEnded；结算持久失败保留原观察和清理责任，Done不提前。

## 调度与验收

先由T09 owner在现有默认公共链新增首条真实Responses loopback消费者，取得当前未装配协议的有效行为红灯；其它owner先只读合同或写自有报告，不破坏该编译输入。初始红灯实际Wait后才开共同生产维护。T01按真实消费固定新SDK依赖，T08提供稳定私有接口；三方可在互不重叠写集实现，唯一Go窗口由Root安排，每次产品验证前冻结完整编译输入。不能用缺包/签名编译错误充作行为红灯，也不因并行写入把漂移输入当固定绿。

097 R01–R14是必需差异风险导航，均须转为实际结果/有依据的不适用/未运行，不把Chat绿当Responses绿。真实默认装配/SDK loopback、完整opaque roundtrip、审批两call/拒绝/重启、当前授权再查、usage/terminal故障、取消及Close barrier为重点；受影响Chat旧CP兼容、空/未装配原因及fake/defaultProbe身份同时回归。不变底座按摘要/影响复用，不机械重复全模块或旧重队列。

最终原owner MESSAGE+FINAL停写、Root全文/源码摘要/return0回读，Root新构建CLI/HAP/Host代码E2E与独立双轴共同验收。维护票和T09在新固定候选共同收口，T27整票仍等最终交付；无提交、推送、发布或归档。
