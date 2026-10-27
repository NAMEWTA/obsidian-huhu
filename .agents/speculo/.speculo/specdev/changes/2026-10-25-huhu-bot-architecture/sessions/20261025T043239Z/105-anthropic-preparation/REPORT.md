# 105 Anthropic 下一协议准备报告

Session: 20261025T043239Z
Task: 105-anthropic-preparation
Status: completed

只读准备完成，T10 未激活。TASK SHA256：`ef9f6f28087496b3296e1b47cf5668395bf1c777220a524a429f66cc4d70036a`；实际 HEAD 为 `33c21e098ef3188cbab5a09f3e0a01fadb787715`，分支 NAMEWTA/bot。启动按 Map25/Goal24 读取 100/101 修复候选，102 当时持唯一 Go 窗口。收尾时 Root 消息通知 102 与 Root 代码门已通过、106 正收敛私有签名；本研究未重跑该门，也不把 106 草案当作现存接口。

## 聚焦交接

**推荐一条路线：在 Eino adapter 内直接调用固定 `anthropic-sdk-go v1.56.0` 的 `Messages.NewStreaming`，增加有界的 Messages block/回放窄桥，复用同一个 common.Engine、Broker、CP 和 Attempts。** 不直接运行 claude / agenticclaude 的 Generate/Stream，不引入第二个 Runner 或账本。两种 Ext 保留为已比较的映射参考；不把研究缓存中的模块、云分支当作实际生产依赖。精确私有形状、原 owner 请求及全部 not-run 矩阵见 [接口与差异附件](logs/interfaces-and-matrix.md)；下文来源编号对应 [完整来源索引](logs/source-index.md)。

1. **固定 Ext 无法原样满足合同。** claude v0.1.26 的 Config/构造没有 SDK MaxRetries 入口；普通 Stream 自建 goroutine，redacted 分支为空，输入 thinking 还要求文本非空。agenticclaude v0.1.7 能保存空 thinking 的签名，但显式丢 redacted，Config 同样没有重试开关。两者都依赖 v1.56.0，而 SDK 默认 MaxRetries=2。直接 SDK 的公开 `WithMaxRetries(0)` 可明确关闭，无须修改 module cache、fork 整包或捕获 Generate 错误后重发。（E1/E2/S2/L1）
2. **097 的私有 Turn/state 方案适用，不能直接移植 Responses item 组装器。** Anthropic 只有 block start/delta/stop；block_stop 不附最终完整 block。需按 index 组装完整有序 content，保存 tool_use ID/参数、thinking 文本与晚到 signature、redacted data 及合法空 thinking。SDK `Message.Accumulate` 会在 stop 时重新编码，注释也承认 JSON presence 不完整，不能把它的 RawJSON 当原始无损状态。工具结果只从 common 已净化投影形成 user/tool_result，原控制 Token、权限和完整 ToolResult 继续留在私有 CP。（S1/S3/C1/H2）
3. **生命周期必须覆盖初始错误。** NewStreaming 同步执行 HTTP，随后由调用方 Next/Err/Close；直接入口没有 Ext 的额外消费 goroutine。SDK 在 Do 返回后若发现 ctx canceled，可早于 response 暴露直接返回；仅靠 WithResponseInto 或 stream.Close 不足以找到原 body。最底层受控 RoundTripper 必须先登记、包装实际 body；>=400 的 ReadAll/关闭/替换错误 body 分支也受限。取消、读循环、真实 Close 与定时回调全部结束后才 Settle(ProducerEnded=true)，结算失败仍由原 driver 生命周期持有。（S1/S2/C2/C3）
4. **终结、工具资格与计费分开判定。** message_start 给初值，message_delta usage 是累计快照而非增量；message_stop 不携 usage。按实际字段 presence 更新，不用缺失/null 的整数零覆盖已有值，更不能从最终零值反推 known。输入总量为 input + cache_creation_input + cache_read_input；output 已包含 thinking，不能再加 thinking_tokens。完整终结和完整可信用量才可记 known；缺 stop、断流、缺字段等保留 unknown/已有估计负担，不以取消盲退。失败/refusal/max_tokens 即使带完整计费数据，也不获得工具资格。（S3/C3/H1）
5. **SDK 前仍须观察原始字节与 SSE 类型。** 固定 ssestream 会忽略未知 event；它的约 32 MiB 单行 scanner 也不是项目界限。须先限制原始 UTF-8、行、event、解压后响应及严格 JSON，再校验 event 标签与 payload 类型、block 状态和终结。未知执行语义、hosted/server 工具不得默默过滤后继续本机写。当前 Chat 已读到 raw UTF-8 防有损解码和独立原受理 Intent 绑定，属于相对 097 的源码变化；105 不用它们替 Anthropic 验收。（S1/C1/C2）
6. **direct 配置与 Probe 不扩权。** 使用显式 endpoint/model/credential、`WithoutEnvironmentDefaults`、受控 HTTPClient 和 retries=0；不自动加载环境/profile/Bedrock/Vertex，不跟随 redirect。SDK 在固定 base 后追加 `v1/messages`，不能为了成功偷偷删改 endpoint 路径。Probe 仅 GET 模型元数据；SDK 将 modelID 直接拼入路径，必须先拦路径控制字符并比对最终目的 URL。它不能证明生成、工具、恢复或价格；未证实 capabilities 返回空，失败不改成收费生成。现有 ModelProbePort/ModelAttempts 足够。（S2/S4/C3/C4）

最小共享维护仍归 T08 /root/engine_adapter 的 common/{engine,checkpoint,tools}.go 及必要 Chat 接口适配，T01/T06 /root/foundation_go 的 bootstrap/core.go 与 Broker 三处 metadata 选择。Chat 旧 EngineVersion、内层 Format、工具摘要 seed 和编码字节保持；Responses 与 Anthropic 分别独立身份。显式 fake Engine、nil Probe 补装配及默认 huhu-engine-v1 路径保持原语义。若 106/T09 先冻结这些能力，T10只消费并注册自己的 validator/identity，不重做共享机制；当前无已证实的新 API、SQL、HAP 或 TS 维护需求。（C1/C4/H2）

## 产物与验证

- [接口、精确 owner 与故障矩阵](logs/interfaces-and-matrix.md)：全部行为 **not-run**，包含 block/工具/opaque/usage/恢复/关闭/认证/Probe 接缝；列举数量不是后续测试上限。
- [来源索引](logs/source-index.md)、[机器来源清单](logs/sources.json)、[逐次观察](logs/observations.json)、[原文行段](logs/read-excerpts.log)：固定本地源码优先；历史官方资料仅复用 047 在 2026-10-25 的实际读取记录，本次没有新网络查询。
- [来源复核](logs/source-recheck.json) 和 [工作区读取](logs/workspace-read.json)：记录本次读取时摘要与最终是否漂移。与 047 可按原路径对齐的 6 个来源无差异；与 097 对齐的 26 个来源中，common/engine.go、common/checkpoint.go、chat/body.go、Broker/recovery.go 与 tickets-map.md 共 5 个已有变化，完整旧/新 SHA 保留，未改旧证据。
- [探索日志](logs/exploration-notes.md)、[结构 return](logs/return.json)、[产物自核](logs/artifact-check.json)、[manifest](logs/manifest.json)：只做本任务轻量读取、字节/链接核对和 TASK 指定结构交回；结构结果不认证研究建议的运行行为。

使用 dev 的架构/测试/许可边界及 I 只读准备入口；未进入 T10 实施。实际依赖仍以现有 go.mod 为准，本次没有下载或改锁。Anthropic SDK 的本地 LICENSE 为 MIT，两个 Ext 为 Apache-2.0；未来 T01/T27 应按真正生产五目标闭包决定 notices，不能复制研究依赖全集。（A0/L1）

## 问题与下一步

本研究足以交 106 原 owner 冻结最小私有合同及未来 T10 正式派单；不等待新协议开工。推荐签名和文件名均是建议，准确写集须由 Root 另派，不代表 T10 已实现或三协议已通过。

未运行 Go、Node 产品检查、docs、构建、数据库、SDK/loopback/Provider 请求、Obsidian 或 keyring；未访问凭证、未安装、未再委派。真实 Provider/Obsidian/目标 OS 继续 user-owned / not-run，不索凭证。本任务仅写 105 自有材料；所有命令同步退出，交回后停写，等待后续正式 TASK。
