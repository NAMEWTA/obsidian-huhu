# Chat 私有接缝冻结（Map22 / Goal21）

Root 已实际接收 092/093/094 的原生 ACK 与接口建议，并回读固定 SDK 源码。本文补充原 engine-chat-window-map22.md，不修改三份已派发 TASK，不改变写集、公共 API、DAG、28 票 55 AC 或用户现场后验边界。源码判读不是已经通过的运行验收。

## 装配与生命周期

- `chat.NewDriver() *Driver` 同时承担私有协议驱动、既有 `api.ModelProbePort` 与本地纯 `SupportsProtocol(string) bool`。
- `common.NewEngine(driver, resolver) *Engine` 实现既有 Engine 和 CheckpointInspector；resolver 类型为 `func(context.Context, string) ([]byte, api.CredentialStatus, error)`。093 从实际 store metadata 绑定可信 ProfileID，只传 Resolve 闭包；不传 Provider 生命周期或写能力。
- 生产兼容身份固定为 `huhu-eino-0.9.22-chat-bridge-v1`。同一个真实 Engine 注入 Executor 与 Inspector。显式 Options.Engine/Probe 注入保持旧测试语义；旧 fake checkpoint 不因 outer 格式相同而取得新生产 Engine 兼容性。
- Engine.Stop 同步拒绝新 Run 并取消活动 Run，驱动 Stop 同步拒绝新 HTTP/Probe 并取消活动请求。Engine.Done 代表运行、真实 producer 和结算清理结束；Driver 公开的内部 Done 覆盖自身所有请求，包括 Probe。Close 只在这些 Done 后释放 idle transport。
- 094 的 assistant.Service.StopProbes 同步 gate/cancel，TestModel 在 repo.List 与 Resolve 前登记并使用取消派生 context；ProbeDone 覆盖真正 Resolve/Probe 返回。093 Core.RequestStop 同步关双方准入；drain 保持原 Executor/Inspector/账本 pending producer 条件，并等两方新 Done，最后关 transport/provider/DB/Profile。超时不冒充 drain 完成。

## 元数据访问

TestModel 对 selector 明确不支持的协议，在 Resolve 前返回现有 `ADAPTER_NOT_ASSEMBLED`；显式无 selector 的 fake Probe 保留原 TestModel 调用。ListModels 只有 selector 支持且凭证可用才报告 available；无 selector 保守 false。只有 Chat 协议本轮支持，Responses/Anthropic 留给对应后票。

Probe 使用明确模型 GET、固定 endpoint、无 redirect、匹配模型 ID、10 秒 deadline 与 64 KiB body 上限；ID 不得改写 URL 路径目的地。只读元数据，不生成、不 fallback、不携带业务正文、不新增 Run 或账本。未证明的 capabilities 返回空；不宣称生成、工具、stream 验证或第三方免费。

## SDK 生产者完成确认

采用原直接 `EinoExt.NewChatModel/WithTools/Stream` 和 Eino schema。不采用 Generate 加零网络 capture 的序列化变体，不 replace 整个 ACL，也不修改 module cache。

Root 实际回读固定 ACL `chat_model.go:867–1003`：CreateStream 失败同步返回；唯一 producer 的最后 defer 依次 recover、`stream.Close()`、必要的 panic error Send、`sw.Close()`，sw.Close 是最后动作。固定 Eino 的 StreamWriter.Close 只关闭 items channel；Recv 在 channel 真正关闭后才返回精确 io.EOF。没有额外 callbacks 时两层 WithConvert 不创建 producer，不更换该完成信号。因此，此 **producer 自己完成所有清理后关闭的 channel** 可作完成 ACK；网络 body EOF、消费者 Close 或首次错误均不可作 ACK。

要求：取消、sink 失败、SDK error 后取消 HTTP 但继续排空原 reader，直到精确 `err == io.EOF`；不可用宽泛 errors.Is 将错误包装成最终完成。最后才 Close 消费端。确认 body.Close 已实际返回，完成自有读循环/取消任务，再置 producer done。该路线不安装额外 SDK/global handler、Copy、自动 Close 或 ResponseChunkMessageModifier；今后增加这些功能必须重验此闭包。F09 必须用真实 SDK 与受控 body.Close 延迟证明 ACK 前不结算、不释放资源，不只检验消费者关闭。

源码 SHA256：

| 固定源 | SHA256 |
| --- | --- |
| ACL v0.1.18-0.20260924031408-10df7cac3f6d chat_model.go | 403786db3b985926b5c9c6dc17c4abd6fda15b928887632e976856dfeffe2f52 |
| Eino v0.9.22 schema/stream.go | b7b154c587960d9db504dfc83bf95929dfc7aa4bf8ebd2a4ba3203b0c77a15a4 |
| Eino callbacks/aspect_inject.go | a5fdf90a17ad8d3b55c17446d47a4811b6c6b664064f88af482b3c0141f92214 |
| Eino internal/callbacks/inject.go | a28b3074bc6d64a53002ae157e40ce37cafeb6a650dc0d704d43d37bc140b7be |
| Eino internal/callbacks/manager.go | 13ad4c8134cc540f0d8246df549d6dd195678aef866262fb9ceb4f47bcd700d2 |
| EinoExt openai v0.1.13 chatmodel.go | 62395a9fd31e2b35c463c78459b55e55df28cd632edb01bb9ccd5d26197ab5b7 |

## 有限界限与每请求记账

私有首版上限：output 4096、n=1；跨 Resume 累积最多 20 模型轮；最终请求体 1 MiB；响应解压后总量 4 MiB；单行 256 KiB、单 event 512 KiB；工具批 32、每工具参数 128 KiB、结果 256 KiB；可见文本 128 KiB；完整 checkpoint 1 MiB。单 Run 沿原 Executor 2 分钟；HTTP 45 秒、idle 15 秒；Probe 10 秒。结算清理使用独立有界 context（首版 3 秒），失败继续保留账本未决和 drain 门，不把时限耗尽当成功。

必须按 SDK 最终完整请求计 UTF-8 字节估算，包含 schema/history/results；真实出站前 Reserve/Dispatch，所有真实 HTTP 各自一个 attempt。可在实际 RoundTripper 读取最终序列化 body 并执行绑定 Attempts，随后仅一次真实 transport；具体私有 types 由原 owner 对齐。不能为准确估算再虚构第二次 SDK generation。完整且有效 usage 才 known；缺失或部分为 unknown，保守费用不可为零。尾 usage、协议终结标记与 producer 完成 ACK 分别验证，不以其中一个替代其他两个。

## 当前运行事实

三方已获独立自有写集实现授权。092 首条默认 bootstrap 公共链测试首次 exit1/Wait，原因是夹具缺合法 ExpectedRevision，尚非有效产品红灯；原日志保留，修正公共前提后只重跑同一测试。唯一 Go 窗口先由092取得有效红灯并实际交还，随后由093准备固定真实消费依赖；未获窗口者不跑重检查。全部 F01–F20、默认 CLI、许可一致与独立审查仍待实际结果，不在本文预写通过。
