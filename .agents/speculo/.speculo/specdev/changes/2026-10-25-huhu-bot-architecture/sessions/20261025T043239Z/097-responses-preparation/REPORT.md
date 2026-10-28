# 097 Responses 下一切片准备报告

Session: 20261025T043239Z
Task: 097-responses-preparation
Status: completed

只读研究完成，T09 未激活。派单 TASK SHA256 为 `57cc4f8be669e8c00ed93e07b4dcc4da0d0d8299ec80b3aefdc9a859332c53ec`。按派单 Map23/Goal22 读取；Root 后续通知 T08 已进入 098 独立审查、相关生产继续冻结。本报告是后续 owner 请求，不是 T08/T09 验收或生产写入许可。

## 聚焦交接

**建议采用固定 openai-go/v3 v3.44.0 的直接流入口，加一个有界、可无损回放的 Responses 数据桥，继续运行同一个 common.Engine。** 保留 Eino schema 工具投影和现有 Application/Executor/Broker/Attempts/Blob；不复制 Runner，不造第二套账本，不升级 SDK。固定 agenticopenai v0.2.4 已提供请求和事件映射参考，但其现成转换不能单独承担本票完整 opaque CP 合同。以下事实与建议逐项对应 来源索引（历史日志已清理：`logs/source-index.md`） C1–C7；精确签名草案、原 owner 文件和未运行矩阵见 接缝附件（历史日志已清理：`logs/interfaces-and-matrix.md`）。

本任务没有把任何方案接入生产。建议实现实际调用固定 openai-go 的 ResponseService/Stream/参数 API；不调用 agenticopenai.NewResponsesModel、Generate 或 Stream，也不因研究过它就把该模块列作运行分发。ARCH §7.2 与 Spec 技术风险允许 adapter 内部桥接/替换实现，既有三协议和公共用例合同保持。

### 现存事实

1. `common.Driver.Generate` 目前接收并返回普通 `schema.Message`；common 单循环负责完整工具批先校验、按序 Invoke、首审批暂停、原结果回填、children/question 等待及跨 Resume 的轮数。CP 保存 Messages/Batch/Next/Pending 和配置、工具摘要；其 EngineVersion、内层 Format、外层 metadata 检查都针对当前 Chat v1。普通 `AgenticMessage` 的 ContentBlocks/ResponseMeta 是另一种数据结构，不能直接替换该签名。[C1]
2. 固定 agenticopenai 在 `output_item.added` 读取 reasoning；`output_item.done` 的 reasoning 分支只补 ID/status，生成空 Reasoning，没有补最终 encrypted_content/summary。另一转换把多项 summary 拼成文本，回放再构造单项 summary。function-call 的 item ID 与 call_id 分别保存；不能用一个字符串替代两者。usage 转换无条件创建非 nil TokenUsage，缺失/null 会投影成零。failed/incomplete 也是 metadata，Err nil 不能表示完成；未知事件默认忽略。[C4]
3. 固定底层 SDK 暴露完整 `ResponseOutputItemUnion.RawJSON()`、typed completed/failed/incomplete、每个字段的 `JSON.*.Valid()/Raw()`，以及 `param.Override[ResponseInputItemUnionParam]`（传入 `json.RawMessage(...)`）。这些现存扩点足以编写窄桥，无须 fork SDK。Override 是原始 JSON 的序列化通道，不提供权限或语义验证；先检查 item 类型、ID、结构、关联和界限，才能回放。[C5]
4. Chat 的 HTTP 包装硬编码 `/chat/completions`、n=1、choices/finish_reason/[DONE]，不可直接换 protocol 字符串当 Responses。公共 `ModelAttempts` 已有 Reserve/Dispatch/Settle/AbortUnsent 和 known/estimate/unknown；047 当时“缺逐请求 Port”的观察已解决，不再请求新公开 Port。[C1,C2]
5. bootstrap 只装配 Chat；Broker 的 Bind、PublishSuspension、InspectRecovery 三处使用全局 EngineVersion + FormatVersion "1"。另外 `common/tools.go:135–144` 把 EngineVersion 编入 ToolDigest。只改一个版本常量会改变旧 Chat CP 资格和工具摘要；协议身份必须成套处理。[C3]

### 推荐的数据边界

```text
已有纯 EngineInput / pinned Config / bound Tools、Attempts、Checkpoints
                         |
                同一个 common.Engine
          Messages + Batch / Next / Pending / Turns
                         |
              私有 Driver Turn + ProtocolState
                         |
      Responses typed events + final raw ordered output items
                         |
        固定 SDK NewResponseService.NewStreaming / Next
                         |
     最终请求字节 -> 原 Attempts -> 唯一实际 HTTP -> 真关闭
```

Driver 继续交给 common 一份 assistant 文本/函数工具投影，同时交付独立、有界的协议状态。协议状态按每个模型轮保存完整、按 output_index 排序的最终 items、response 关联元数据、终结类型和与 Messages 中该轮的对应位置；每项保留 item_id、call_id、原类型、状态及完整 raw item。reasoning summary 数组、其元素原貌、encrypted_content 和未知非语义附加字段不经拼接重建。CP 可用字节数组或字符串保存原始 JSON；不要误称一般 map 或反序列化再 Marshal 会保留原始字节。[C1,C4,C5]

added/delta 用于受限增量处理；done 替换暂存 item，completed.output 与最终项身份/顺序/语义一致性需核对，矛盾时失败。两项 function_call 原 output_index 若为 1、3，给 common 的 ToolCall.Index 必须是紧凑的 0、1，ID 用 call_id；原 item index/ID 仍留在协议状态。回填只把 common 已净化的 toolMessage 转成 function_call_output(call_id, output)，不把 CP 中完整 ToolResult、SuspensionToken 或原始配置转发给模型。下一轮按原 items 顺序及对应工具结果回放，不能从 VisibleMessage.Text 复原被中断的执行。[C1]

当前 CP 已保存完整本地输入前缀；新增协议状态覆盖本 Run 的模型轮与每个可恢复位置。日常本机可见历史继续走现有消息，不以远端 response ID 可读性为前提；本方案不新增“已完成 Run 的 SDK 全量审计表”。opaque 只在 adapter/私有 Blob 中，不进入公共 HAP、群消息或可见 text.delta。未知会改变工具或恢复语义的 item、Provider 内建工具、远程 MCP 等必须阻断该轮工具准入，不能丢弃后继续。[C6]

只推荐上述一项可实施路线。原封使用 agenticopenai.Stream 是已比较但不满足合同的路线；若坚持它，需要另捕获原 SSE final items/presence 并覆盖输入构造、验证回放及 producer ACK，反而有两份解析状态。直接使用其固定底层 SDK 保留现有 SDK 实现和 Eino 公共循环，范围更小。没有必要使用 Generate 零网络捕获再重发。

### 请求、终结与真实完成

- 构造前验证明确 protocol/endpoint/model/credential。用 `NewResponseService` 和显式 WithBaseURL/WithAPIKey/WithHTTPClient/WithMaxRetries(0)，该 service 本身不自动读环境；不经带环境默认值的顶层 client、Azure 或自动路由。请求显式 store=false、background=false，关闭自动缓存，不传 previous_response_id/conversation；禁止自动截断本机历史。若消费 agenticopenai 任何部分，还需明确 EnableAutoCache=false。SDK 重试默认是额外两次，不能靠未填配置关闭。[C4,C5]
- 最终实际序列化请求体包含完整历史、opaque items、工具 schema/结果和输出界限；原绑定 Attempts 在唯一 transport 前 Reserve→Dispatch。固定路径为已验证 endpoint 下的 POST responses，HTTP client 禁 redirect，底层不作 SDK/自定义重试；同一请求包装二次发送必须拒绝。可从原 Chat owner 抽取协议无关的计费/清理部分，Chat SSE 判读保持各自驱动。[C2]
- typed terminal、usage 可信程度、真实 producer 完成是三件事。只有完成且所有 items/参数合法的轮次才交 common 执行工具；failed/incomplete/error、缺终结、冲突终结都保留已有 partial 文本并阻断工具。终结响应中 usage 对象及所需 input/output 字段必须分别存在、非 null 且是合法非负整数，才可 known；真实 0 与缺失有不同判据。失败终结也可能有真实已知 usage，不因业务失败全退；created/in_progress 的暂时零值不是最终结算。[C5]
- `NewStreaming` 同步执行请求，底层 `Stream.Next` 在调用者 goroutine 解码；它没有 agenticopenai 那个额外 producer。Next false、Err nil、[DONE]、typed completed 或请求 context canceled 均不等于 body.Close 已返回。驱动必须持有实际响应 body，停读/取消后 Close 并等自有读循环与取消任务真正退出，再标 ProducerEnded/结算/释放。HTTP >=400 的 SDK 分支同步读完并 Close；取消恰好发生在 Do 返回后时 requestconfig 会先返回 context error，甚至未把 raw response 交给流，必须由 transport 保留的 body 引用兜底关闭。成功与错误 body 都受解压后字节/行/event/idle/总期限限制。[C2,C5]
- 如果使用 agenticopenai.Stream，其 defer 顺序是 panic error Send → upstream Close → writer.Close，且发送方忽略 Send closed；必须取消并排空到该真实生产者最终 ACK，不能拿 Chat 的固定证明直接套用。推荐直接 SDK 路线无需这个额外 channel 协议。结算持久化失败沿现有 pending/drain 门，清理期限耗尽不假装已结算。[C4]

047 官方资料是 2026-10-25 的历史读取，本次没有重新联网。其 reasoning 指南记录 legacy include 支持、不能一概声称必需；固定 SDK 支持该参数。正式实现应按固定协议测试 final encrypted_content 的完整回放，不能以请求了 include 推断响应必然完整，也不把 store=false 解释成 Provider 的零留存承诺。[C6]

### 保持旧 Chat 与 fake Engine 兼容

原 Chat EngineVersion 字面量 `huhu-eino-0.9.22-chat-bridge-v1`、内层 `huhu-model-state-v1`、外层 FormatVersion "1"、原字段编码与 ToolDigest 的旧 version seed 均保留。Responses 使用独立兼容 identity 和必需的有界私有状态。不要只增加可选字段后把缺项当合法 Responses CP；不要把旧 Chat/fake CP 的 opaque 缺失补成空状态后放行。

建议 T08 增加私有 protocol→identity/CP validator 接缝；registry 接受显式兼容 seed，但 Chat 仍给旧 seed，工具 schema、aliases 及摘要结构保持。Chat v1 读写分支保持原序列化形状，Responses 新分支增加 payload；旧格式保留严格解码和原语义验证，不迁移/覆盖原 Blob。两者都先校验 protocol/config/tool digest/位置，再调用纯协议状态验证。[C1]

T01/T06 的最小内部接缝是 Broker Options 增加纯 `EngineVersionForProtocol func(string) (string, error)`，用同一 helper 为三处产生 metadata，DefinitionDigest 仍由 Broker 按可信 pinned Agent 计算，外层格式仍 "1"。默认真实装配把同一私有 factory/registry 的 selector、Engine、Inspector、metadata resolver 绑定一起；未知协议明确拒绝。并发 Chat/Responses Run 按各自 pinned protocol 选择，不能使用可变全局“当前驱动”。[C3]

显式 Options.Engine 注入继续原 Options.EngineVersion 分支；未传版本仍是原 huhu-engine-v1，且只消费该 Engine 自己的 Inspector。**只补默认 Probe 不能给 fake Engine 套真实协议 identity。** 显式 Probe 保留旧测试路径；生产 Engine 的兼容解析不能由另一个 Probe 或模型输入自报决定。以上是最小建议签名，不是现存实现。[C3]

## 产物与验证

- 接口与矩阵（历史日志已清理：`logs/interfaces-and-matrix.md`）：原 owner 的精确文件/签名草案、旧 Chat/fake 控制路径和 Responses 差异场景；所有行为场景均未跑。
- 来源索引（历史日志已清理：`logs/source-index.md`）、完整来源清单（历史日志已清理：`logs/sources.json`）、逐次读取记录（历史日志已清理：`logs/observations.json`）、[源码行摘录](logs/read-excerpts.log)：记录绝对路径、实际读取 UTC、行段、字节数和 SHA256，并将 C1–C7 与来源关联。
- 末次来源复核（历史日志已清理：`logs/source-recheck.json`）：保留首次/后续读取与交回时差异；它只证明这些实际来源，不证明整个工作区冻结。
- 探索说明（历史日志已清理：`logs/exploration-notes.md`）：路径误定位和裁剪均保留，没有把失败读取当成功证据。
- return 回执（历史日志已清理：`logs/return.json`）、[原始输出](logs/return.log)、产物清单（历史日志已清理：`logs/manifest.json`）：仅本任务结构校验与产物字节核对，不是产品验收。

本次仅只读源码/规则与写自有报告日志；未执行 Go、产品 Node 检查、build/test、数据库、Provider、真实模型、Obsidian、系统 keyring、目标 OS 或下载/安装。全部轻量命令结束，没有本任务后台产品进程。依 TASK 运行的 validate-dispatch return 是唯一 Node 结构检查；实际结果以回执为准。

固定许可再次读到 agenticopenai v0.2.4 与 openai-go/v3 v3.44.0 均 Apache-2.0，完整本地 LICENSE 已记录 SHA。生产当前 go.mod 尚未消费这条 Responses 链。直接底层 SDK 方案只让实际用到的固定模块进入依赖，不空引 agenticopenai 凑版本，也不复制 002 研究锁。T01 以后维护 go.mod/go.sum；T27 按新生产真实闭包生成许可，095 的 Chat 闭包不能代替 T09。若实际改编上游源码，按文件注明固定来源和版权、保留全文许可；本研究未复制产品实现。[C7]

## 问题与下一步

最早需要冻结的是 T08 私有 Driver/CP identity 与 T01/T06 metadata resolver，随后才是 T09 driver；详细 owner 请求已交 Root。当前 API、HAP、TS 生成物、SQL、effects/Blob 生命周期和 T12 公共账本无已证实的新增改动需求，维持原 owner、不给 T09 扩写权。

T08 不变的授权/审批/效果/预算/等待/恢复底座可以按相同 hash 和输入复用既有证据；新增数据桥、default selector/metadata、SDK parser/关闭链与 Responses loopback 必须独立证明。附件矩阵只是起始覆盖，实际风险与正式合同决定覆盖，不设测试上限。没有真实 Responses endpoint/model 验收；真实模型、Obsidian 和目标 OS 继续 user-owned / not-run，不索取凭证。T09 开工由 Root 的后续依赖代码门与实际派单决定。

