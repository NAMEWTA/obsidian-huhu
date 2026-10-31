# Map29 Anthropic联合代码窗口

前置为LOG-114已接纳Responses与共享代码门，正式输入78900740ccb6b1f7e8bc7c76d71c68257428ed916d121a0a11328fec5b542074；Chat历史门及全部原失败保留。全部28票55AC继续，真实Provider/Obsidian/目标OS由用户后验，无提交推送发布归档。

## 采用合同

采用105已接纳的固定anthropic-sdk-go v1.56.0公开Messages.NewStreaming，显式endpoint/model/key/client/retries0、WithoutEnvironmentDefaults；claude/agenticclaude只作已比较参考，不作为运行入口。保持现有common.ProtocolDriver/Generation/StateView/TurnResult和httpcall，不新建Engine/worker/账本。协议标识固定anthropic-messages，EngineVersion=huhu-anthropic-sdk-go-1.56.0-messages-bridge-v1，StateFormat=huhu-anthropic-messages-state-v1；独立有序content blocks私有状态使用现存非Chat CP v2路径，Chat v1/Responses身份与原字节不得改动。

block start/delta/stop自建有界状态机，完整保存thinking/signature/redacted及合法空thinking，工具紧凑Index与原ID分开；不得用SDK重新编码的Accumulate RawJSON冒充原presence。完整流、所有block与全工具批先验证再首Invoke。message_delta usage按presence累计快照覆盖，input合并base/cache_creation/cache_read各一次，output不重复加thinking。工具资格与已知合法费用分别判定；end_turn/tool_use须完整一致，max_tokens/refusal/pause_turn/错误保留partial及可信费用但不调用本地工具。

原SDK前UTF8/strict JSON/未知SSE/界限观察沿真实httpcall；当前授权和额度逐请求检查，原Body真实Close、SDK和callback结束再结算，失败不释放原worker。纯CP验证固定原Intent/完整blocks/工具净化结果及当前配置；Probe仅受限metadata GET，不能生成fallback。A01–A18逐项说明真实验证/可复用/未验边界，研究清单不是测试数量上限。

## 原owner与写集

- 117 / foundation_research：T10 anthropic/**、tests/contract/engine/anthropic/**、testdata/providers/anthropic/**。先现有默认Core公共API的有效行为红；尚未存在包的编译错误不算红。初始唯一Go窗口归117，实际Wait后交回。
- 118 / engine_adapter：T08仅common/protocol.go、common/registry.go及tests/contract/engine/chat/protocol_common_test.go。新增精确第三协议身份和注册/选择负控；其他common/chat/httpcall只读，发现真实需求先报Root。117红前只读，之后允许精确写入。
- 119（待115实际交回）/ foundation_go：T01仅bootstrap/core.go、go.mod/go.sum与foundation必要装配合同测试。固定SDK的真实import闭包、默认第三driver及所有失败清理/Stop→Done→Close。115仍只读，不能以该准备任务写产品。
- T06 Broker当前按Registry泛化，T02当前无已证实旧默认Anthropic断言，无预防性重开；需要时先给真实证据。T27原build_integration在真实依赖稳定后接五目标许可闭包。

## 调度与验证

117首红和Root接纳之前，不改变生产/锁输入。之后117/118/119可编辑各自不相交文件，Go/tidy/产品检查始终由Root授予唯一窗口并冻结相关写者，固定GOTOOLCHAIN=go1.26.10、GOWORK=off、GOEXPERIMENT为空、GOFLAGS=-mod=readonly；normal CGO0、race CGO1，真正新增依赖tidy仅T01明确窗口例外。每个实际命令Wait/退出/原输出保存，先失败分类再最小修复，不用超时强杀冒充producer结束。依赖稳定后Root新构建CLI/真实SDK loopback/生产TS HAP Host代码E2E，再冻结最终输入交独立双轴。现场仍user-owned/not-run。

本轮T01/T08从已接纳Responses基线重开有限维护，attempts=0表示新Anthropic范围，保留此前全部attempt与失败；T10首次实施。T14未激活，115独立只读准备可继续。
