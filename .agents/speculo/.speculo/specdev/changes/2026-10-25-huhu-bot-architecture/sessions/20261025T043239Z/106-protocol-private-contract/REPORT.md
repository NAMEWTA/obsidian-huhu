# 106 多协议私有接口只读准备

Session: 20261025T043239Z  
Task: 106-protocol-private-contract  
Status: completed

## 聚焦交接

推荐单一不可变 common.Registry，按 pinned Model.Protocol 选择同一协议实例，统一供 Engine/Inspector/Probe/SupportsProtocol 与 Broker EngineVersionForProtocol callback 使用。Generation struct 取代继续增长的参数列表；TurnResult 显式返回 Message 与完整 ProtocolState。ValidateState(StateView{Messages,Initial,Turns,Intent}, bytes) 只做受限本地校验。Generate 成功后必须先 common 整批检查，再候选 native state 检查，然后才首次 Invoke。私有 SDK 类型不进入 Application，不新增 Runner、账本或恢复资格服务。

完整有限签名、构造失败归属、身份 literal、state/CP 校验时机、精确 owner 路径及未运行控制见 interface-contract.md（历史日志已清理：`logs/interface-contract.md`）。核心交付：

- Chat 保持 huhu-eino-0.9.22-chat-bridge-v1、huhu-model-state-v1、原 `{Version,Tools,Aliases}` digest seed/编码与严格 legacy DTO。Chat sidecar 必须为空，不能把 opaque 数据塞入新字段。Responses 使用独立 version/state identity、完整 raw items 与必需 state；总 CP 实际编码仍限 1MiB，缺失或错误不自动兼容。
- Registry 成功构造后转移各 driver 所有权；失败清理归调用方。Engine.Stop→Registry.Stop→全部 drivers.Stop；Done 必须覆盖活动 Run/Probe、各 SDK 真实 producer 结束、真实 body.Close、watcher 与结算；Close 只在 Done 后释放 idle transport。没有全局当前协议或仅关最后一个 driver。
- T01 默认生产同 Registry 装配。T06 Options 增加纯 callback `EngineVersionForProtocol func(string)(string,error)`，同 `metadataForAgent(api.Agent)` helper 用于 Bind/Publish/Inspect。显式 fake Engine 不获生产 callback；即使补默认 Probe 也保持旧 fake identity。
- Bind 在 Run 前：仅 nil Model 的 MODEL_DRAFT_INCOMPLETE 和未装配协议的 ADAPTER_NOT_ASSEMBLED 可继续绑定 Tools/Attempts 但 Checkpoints=nil，保留 Engine 的安全原因和 Resolve/HTTP0；其他 metadata 错误不可吞。Publish/Inspect 不可用身份必须拒绝，不写伪兼容值。
- HTTP 采用方案 A：仅新增 eino/httpcall/{runtime,attempt,body}.go 供 Responses/后续 Anthropic，共用一次实际请求/最终 body 计数/原 Attempts/raw UTF8/SSE 边界/真实 Close/本地结算 worker。Chat 只作薄接口兼容，保留已验收的请求/ACK/worker。各 SDK 的真实 producer 证明不同，不以 typed completed、普通 EOF 或取消代替。

本人与 Root 已通过原生消息对齐上述方向；Root 最新消息采纳辅助方案 A，并准备按实际报告另开 107/108/109 等正式派单。本任务没有因此获得生产写权。

## 产物与验证

本次仅新增 106 REPORT 与 logs。sources.json 记录实际读取的来源文件 SHA；source-recheck.json 在交回时复核这些输入。已有 AGENTS/Speculo/dev/I 规则按当前任务复用；本次仅做研究准备，不把发现或规则阅读当作新 Workflow 激活。

实际核对的接缝包括 current common.Driver/Engine、legacy CP/transcript/Intent、工具 digest、Chat Driver/raw body、Core 默认装配、Broker Bind/Publish/Inspect、Assistant Probe selector，以及固定 openai-go/v3 v3.44.0 的 NewStreaming/Next/Close/requestconfig。097 的 REPORT 与 interfaces-and-matrix 全文已读，采用 direct SDK 保留最终完整 item 原始字节的路线，不采用其过时 Chat 基线推断。

相对 097 研究时的候选，当前 100/101 已增加独立 accepted Intent 校验和 SDK 前原始 UTF8 校验；本合同明确保留这些修复。当前实际 SHA 以来源 manifest 为准，没有修改任何旧研究记录或旧报告。Root 原生告知 102 独立两轴 pass 和 code-gate-chat-r2 接纳；这是 Root 交接事实，本人本轮没有重跑该门。

本轮未运行 Go、gofmt、编译、测试、依赖操作、下载、Node 产品检查、Provider 请求或 Obsidian/目标 OS。唯一运行检查是交回所需 validate-dispatch --stage return；首轮因本报告 Status 未使用机器枚举而 exit126，改为 completed 后重跑。真实 exit/耗时/完整输出在 logs/return.json 与 logs/return.log，首轮原输出另存 return-01。所有新接口、共享 helper 与回归控制均为未实现/未运行建议，不声称通过。

## 问题与下一步

Root 正式冻结 owner 写集后，T08 原 owner 负责 common/Chat 薄接口与新 httpcall，T09 负责 Responses 语义和真实 SDK 消费，T01 负责装配/锁图，T06 负责 metadata helper/绑定负控，T27 负责实际五目标闭包/许可。各方必须先消费同一精确签名，不能各猜一个版本或越过原 owner 改共享文件。

需要在实施时获得新证据的风险是：旧 Chat CP/digest 的逐字兼容、完整 reasoning/raw-item 重放、sidecar 首 Invoke 前整批校验、fake Engine/default Probe 身份隔离、共享 Runtime 对 SDK 隐含清理/替换 body 的实际 join，以及 Stop 后本地结算仍未完成时 Done 不关闭。interface-contract 的六组控制和 097_R01–R14 为未运行矩阵，不以旧绿替代。

本任务不扩大“完整 history 真实性”承诺，也不新增持久域或公开 API。真实模型服务、Obsidian 与目标 OS 继续由用户后验，不索取凭证。本人 return 校验成功并发原生交回后停止全部自有工作，等待新的正式实施派单。
