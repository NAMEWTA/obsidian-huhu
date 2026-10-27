# 多协议 common 与共享 HTTP 维护候选

Session: 20261025T043239Z  
Task: 107-protocol-common  
Status: completed

## 聚焦交接

按冻结 TASK、106 有限合同及 Map26 补充完成原 T08 写集维护。仅维护 9 个生产文件、7 个 Chat 测试和 4 个旧 producer 样本；[完整自有源摘要](logs/16-own-final-source.json)与[实际差异](logs/15-own-final.patch)可回读。未修改 Responses/Anthropic、bootstrap、Broker、API/HAP/SQL/TS、锁或 notices；没有再委派、提交、推送、发布或归档。正式联合代码门由 Root 决定。

common 新增有限 ProtocolIdentity、StateView、Generation、TurnResult、ProtocolDriver 与不可变 Registry。同一 registry 按 pinned protocol 路由 Engine/Inspector/Probe/selector/纯 EngineVersion callback；无当前协议或 fallback。构造拒绝 empty/nil/typed nil/重复/非冻结身份，成功才转移 driver 所有权。Engine/Registry Stop→Done→Close 覆盖所有注册 driver、活动 Run/Probe、真实 producer 和结算，Close 不能替代 join。108/109 已消费精确签名，未各自另造一套。

common 每轮入口执行纯 native state 校验，模型返回后先完整 message/工具批检，再 candidate StateView/sidecar 校验，随后复制提交消息与状态，才开始首次 Invoke；纯文本终结同核。Inspect/Resume 仍保留独立 accepted Intent、原 Decision、完整 transcript/程序位置校验，不扩大旧 history 正文真实性保证。ProtocolState 复制，非 Chat 使用必需 state 的 v2 DTO，最终整个 CP 实际编码 ≤1MiB。

Chat 仅薄接口适配，原请求实现、SDK writer 最终 ACK、body.go 和结算 worker 保留。EngineVersion 仍 `huhu-eino-0.9.22-chat-bridge-v1`，inner Format 仍 `huhu-model-state-v1`，legacy DTO 字段/顺序/nil 形态完全保持；工具 `{Version,Tools,Aliases}` 的 Chat seed/digest 未变。Chat 拒绝非空 sidecar 和未知新字段。Responses 使用独立 `huhu-openai-go-3.44.0-responses-bridge-v1` / `huhu-openai-responses-state-v1`，没有 Anthropic 占位。

新增 httpcall/runtime.go、attempt.go、body.go 只依赖标准库与既有 api，供新协议共用：

- Call/ProbeCall.Context、一次准确 POST/GET gate、SDK 最终原始 body 纯检查、字节数 Reserve/Dispatch、禁重定向/环境 proxy；Probe 仅准确 GET/10s/64KiB，不接受 Attempts 也不能走生成 POST。
- SDK 解码前 raw UTF8/总量/line/event 边界及同步 SSEEvent{Event,Data} observer，保留标签和多 data 行 LF 拼接。callback 错误/异常终止调用；原始字节错误覆盖早到 usage 为 unknown。
- 跟踪真实原 Body，包括 SDK Do 后 ctx 取消未暴露响应、错误状态提前读取/关闭/替换 body；SDK 真实结束回调、原 Close 返回与 timer/watcher join 后才 Settle ProducerEnded。cleanup 超时保留唯一责任，不提前 Done。
- 每 Runtime 一个本地结算 worker，Stop 后仍重试原账本，不增加 HTTP/Run；finished/finishErr 最终 ACK 在 release/Done 之前，重试 worker 也等 ACK 后才释放。

SDK producer 证明按各 SDK 区分：Chat 原固定 ACL/Eino writer 最终精确 io.EOF ACK 不变；新辅助由消费者提供固定 SDK 同步 Next/Do 实际结束与 Close 的回调，不能把 typed completed、网络 EOF 或 Cancel 单独当证明。109 的协议 items/usage/state 语义仍归其 driver。

## 产物与验证

实际使用 dev 的原生 Go/持久化兼容/异步生命周期验证，复用未变化的 I/preflight/设计/TDD/错误/可靠测试/风险规则；[输入与计划](logs/00-input-and-plan.json)记录 AGENTS、TASK、冻结合同 SHA、HEAD 与 owner 边界。HEAD 保持 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。所有 Go 检查均在 Root 唯一窗口，固定 go1.26.10/GOWORK=off/GOEXPERIMENT空/readonly；normal CGO0，race CGO1。

生产改写前，实际旧 Chat SDK→Executor→Broker→SQLite 产生“第一原调用批准并物理写 1 次、第二原调用待审批”的 CP，再实际拒绝第二原调用成功结束；HTTP2、物理写1。保存原 CP 2768 字节（SHA `7536db3ef21941d7cef85597e850ef1ed96441fc43fe11c504f49803c5e3b631`）、真实 Config/Intent/Inspection/Resume Decision 和两份 wire，四样本之后保持原字节。[legacy 摘要](logs/03-legacy-baseline.json)记录原字段顺序与 ToolDigest `sha256:a44fe0c483fdea2896c66cf9070454768e893e18e1353d0f01a5fcf55ac2e80a`。

新兼容测试直接读取这份独立旧字节：新 Inspector 纯检、新 Engine.Resume 与真实 Chat SDK bridge 接受旧 CP，原完成工具不重复 Invoke；新编码器用同一可信输入及记录的原工具结果重建，2768 字节逐字相等，涵盖原 digest。此 codec/Resume 控制重绑私有 memory CP/attempt/tool 夹具和受控 RoundTripper，不冒称重开已删除的临时 Profile；实际 Core/SQLite 重开另由 10 的原 restart 用例覆盖。capture 助手显式 opt-in，且已存在样本时硬拒绝覆盖。

| 证据 | 实际结果与分类 |
| --- | --- |
| 01 legacy capture | exit1/Wait1.025477s；夹具误取 lexical 首 CP 检第二审批，非产品红，原日志保留 |
| 02 legacy capture | exit0/Wait0.991469s；只修夹具为 Run 精确 checkpoint_ref 和真实 denied/APPROVAL_REJECTED，真实旧 producer 样本成功 |
| 07 helper red | exit1/Wait1.475518s；有效两反例：原 Body 非 EOF 读错仍 known；nil endSDK 消耗 FinishOnce 并提前结算 |
| 08 same targets | exit0/Wait1.452328s；只修 Runtime 两处最小防御；其他 raw 边界负控均通过 |
| 09 new contracts | 12 top tests，exit0/Wait0.797330s；旧字节/Registry/批次原子性/真实 SDK helper 边界 |
| 10 affected Chat | 9 top tests，exit0/Wait5.387606s；CP/审批/重开、100 Intent/rawUTF8 两修复、F09真实 ACK/Close、F19真实 SQLite retry |
| 13 final normal | 13 top tests，exit0/Wait1.644690s；补 cleanup timeout 后仍 held、native buffer copy、转义后最终 CP >1MiB 不 Publish |
| 14 final race | 8 top tests，exit0/Wait34.221674s；Registry 并行路由/Probe、raw observer、once、超时 Close、结算 worker、旧/新 CP |

每轮完整 stdout、实际命令、go version、输入 SHA、exit、Wait 与 drift 在同前缀 input/result/log；全部 source drift=[]。13/14 共同输入 SHA `681fe8fd2dae1cdb0792185592b009425886c5030a5e2bec6e0c64dac158edbf`，最终 normal/race 没有追加修复。10 的旧 Chat 生产面之后未变，按 Root 要求复用，不机械重跑旧队列。

helper 直接控制使用固定真实 openai-go/v3 SDK、受控原始 Body/真实 loopback wire 与可诱发故障的 Attempts port：先 usage 后非法 UTF8/非 EOF error/未知事件/界限全部 unknown；合法中文/emoji/合法 RuneError 逐字节 Read 与多 data 行保持；Reserve/Dispatch 拒绝和隐藏重试不多发；Do 后取消及429替换 body 的 Close 实际 held 至 Finish 超时后仍无结算/Done，释放后才结束；本机 Settle 故障跨 Stop 保留，恢复后原观察仅结算一次。该层不冒称所有故障都通过真实 SQLite；真实新 Responses 默认 SDK→SQLite 消费者由109负责，原底座 SQLite/F09/F19 有 10 的实际回归。

自有差异的 8 个既有文件基线从100已接纳 before+patch重建，逐个与107生产改写前02输入 SHA相等后才生成 diff；12个新文件按新增记录，未把旧实现整片冒作107新增。return 只运行只读结构校验，记录于 logs/17-return.json/log；正式文件/来源漂移及工件清单在最终 manifest。

## 问题与下一步

本任务没有剩余必需产品检查或已知未处理的本票故障。109 仍负责完整 Responses items/opaque replay/工具和恢复业务/权限与实际用量矩阵；108 负责默认装配、Broker metadata 与锁图；T27/Root 负责最终真实依赖闭包/许可、新 E2E 和独立双轴。107 不借自己的 helper/codec 夹具通过替代这些结论，不自行推进正式 Ticket/Gate/AC。

后续新协议必须复用同 Registry/HTTP 辅助，提供自身完整 native state 校验与 SDK producer 结束依据，不复制新 worker、不借 Chat 空 state 或全局版本回退。现有共用控制和未变底座证据可按真实输入/风险边界复用。

真实 Provider、Obsidian 与目标 OS 仍由用户后验，未索密钥；本次未运行全模块、无用户现场验收声明。全部产品源/tests/四旧样本已冻结、全部自有 Go 进程实际退出；本人完成 return0、原生 MESSAGE+FINAL 后停止工作，等 Root 回读接纳。
