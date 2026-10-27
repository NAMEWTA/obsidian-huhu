# Anthropic Messages 真实协议桥实现候选

Session: 20261025T043239Z  
Task: 117-engine-anthropic  
Status: completed

## 聚焦交接

按冻结 TASK、Map29/Goal28 与 Root 分阶段唯一 Go 窗口，完成 T10 分配写集：六个新增生产文件、八个新增测试文件。完整 Anthropic 包 normal 为 17 项顶层、98 个子场景通过；六项 CP/当前资格/生命周期定向 race 全过并实际退出。14 源已冻结，Go 窗口已归还，后续仅本报告与证据交接。此 completed 表示作者交付，不替代 Root 的独立 E2E、双轴审查、许可闭包和全票接纳。

[最终源清单](logs/final-source.json)的自有摘要为 `0d62aa95e796fa4188e9f0fa6dfc8f0bf2a6f577852fd33860321f7e919a35b5`，[完整新增差异](logs/final-own.patch)保留所有14文件。仅写 `internal/adapters/outbound/eino/anthropic/**`、`tests/contract/engine/anthropic/**` 与本任务材料；未写 common/chat/responses/httpcall、Core、Broker、API/SQL/HAP/TS、锁、notices 或正式状态。没有另造 Runner、公共 Provider DTO、账本或后台结算 worker，没有提交、推送、发布、归档或再委派。

实际执行固定 `github.com/anthropics/anthropic-sdk-go v1.56.0` 的公开 `Messages.NewStreaming`、同步 `Next`/`Close`、受控 `param.Override` 与 `Models.Get`。105 比较过的 claude/agenticclaude 与云认证入口只作研究，没有加入本票运行 imports。118 提供精确第三 identity/Registry tuple，119 提供默认三协议装配与真实依赖锁；本票直接消费107已经实现的 Generation、StateView、TurnResult、纯 ValidateState 和 httpcall。Anthropic identity 为 `anthropic-messages` / `huhu-anthropic-sdk-go-1.56.0-messages-bridge-v1` / `huhu-anthropic-messages-state-v1`，旧 Chat/Responses 字节与身份未由本票改动。

`driver.go/request.go` 显式提供 endpoint/model/key/client，设置 `WithoutEnvironmentDefaults` 和 `WithMaxRetries(0)`。SDK 按配置追加 `v1/messages`，不偷偷裁剪重复路径来获得成功；禁环境 key/base/profile/header、云认证、重定向、自动续跑或失败后重发。最终真实请求包含原可信 system/messages、全部工具 schema、已验证 blocks 与净化结果，再交原 Attempts 按真实字节 Reserve→Dispatch→Settle。`NewDriverWithTransport` 仅为 internal adapter 的薄基础设施构造接缝，默认 `NewDriver()(*Driver,error)` 不变。

`blocks.go/json.go` 在 SDK 解码前同步验证原 SSE 标签、strict JSON、index/start/delta/stop 和所有执行语义。按原顺序保存 text、thinking、redacted_thinking、tool_use；多个 open block 可交错，相同合法文本 delta 不去重。完整 thinking 文本、晚到分段 signature、合法空 thinking、redacted data、工具 ID/参数及字段 presence 保留；caller 仅缺失或 direct，null/program/hosted/未知执行拒绝。工具 Index 紧凑编号，block 数独立有界，不把32工具限制误作32所有 blocks。第二工具无效时整批拒绝，首审批/Invoke/Host 均为0。

Anthropic 没有最终完整 item 事件，本桥保存经 start/delta 验证后构成的完整 block；保留 opaque 字符串值、字段 presence 和顺序，不声称存在一份服务端最终 JSON 的逐字节副本，也不使用 SDK Accumulate 重编码冒充原貌。`checkpoint.go` 保存版本化轮数、消息位置、message ID、terminal 与 blocks；校验 common transcript、可信 Intent、工具投影/结果顺序。候选提交、纯 Inspect 与真实 Resume 都核验，重算外层 HUHUCP1 hash 不能洗白结构或语义破坏。opaque 签名只做形状/必需性检查，不假装本地验证 Provider 签名真实性。回放仅原初始消息、完整 assistant blocks、common 净化的相应 user/tool_result；原审批 Token、授权和完整 ToolResult 不进入请求。

`usage.go` 按 presence 分别跟踪 input/cache creation/cache read/output，累计更新覆盖前值，三个输入分量各算一次；TTL/thinking明细不重复收费。缺失/null/部分/非法数值保持 unknown，合法显式全0可 known。业务完成、工具资格与费用知识分开：end_turn 或具有显式字符串字段的 stop_sequence 只允许无工具；tool_use 必须有完整批。max_tokens/refusal/pause/未知终结不能执行工具或自动补问；合法 refusal details/结构化 Provider error 可保留已有完整费用。无 message_stop 的断流、坏原始 UTF8、迟到冲突事件等按不可信流处理，不以早到 usage 放行。

SDK 循环、自有回调、原始 Body.Close 与共享 watcher/timer 真正结束后才 ProducerEnded；Finish 错误优先于早到终结/usage。真实 Close 被屏障挡住、SDK 隐藏了 response，或 SQLite Settle 暂失败时，仍持有原 attempt 与 drain 责任，Done 不提前。Probe 只作明确的受限 metadata GET，拒绝可改变路径的 modelID，要求返回 ID 一致，未证明 capabilities 返回空，不 fallback 到生成 POST。

## 产物与验证

实际沿用已读的 AGENTS 能力发现、dev/I/preflight、有限设计、TDD、错误处理、原生 Go 与异步生命周期规则。[初始预检](logs/initial-preflight.json)记录授权/版本/来源，复用105已固定开源与许可研究及本地 SDK 源码，没有临时浮动版本或复制第三方 Runner。全部 Go 在 Root 的唯一窗口，固定 `GOTOOLCHAIN=go1.26.10 GOWORK=off GOEXPERIMENT='' GOFLAGS=-mod=readonly`；normal CGO0，独立 race 捕获脚本内部明确 CGO1。

每轮保留实际命令、原始 stdout/stderr、退出码、实际 Popen.wait、源码/锁/fixtures清单和不可变 ZIP。输入使用 `git ls-files -c -o --exclude-standard -- native/huhubot`，排除 ignored dist；快照是完整输入上界，不把其中未选中的测试说成已运行。[命令索引](logs/command-index.json)含完整参数和逐测试结果；[ZIP核验](logs/input-archives-verification.json)逐项校验11轮全部历史文件字节与SHA，早期文件保留其当时版本。

| 阶段 / 原始结果 | exit / 实际 Wait秒 | 事实 |
| --- | --- | --- |
| [initial-red](logs/initial-red-result.json) | 1 / 0.936455 | 默认公共入口可编译，ADAPTER_NOT_ASSEMBLED、HTTP0，有效缺失红 |
| [首文本绿，119原回执](logs/slice1-green-receipt.json) | 0 / 8.199739 | 同一原消费者由119装配后运行，本作者没有重记其执行权 |
| [slice2-red](logs/slice2-red-result.json) | 1 / 1.222109 | 完整合法 mixed blocks 尚未支持，MODEL_STREAM_INVALID、无审批，有效缺失红 |
| [slice2-green](logs/slice2-green-result.json) | 0 / 1.610893 | 同混合两工具/opaque消费者绿 |
| [slice2-text-impact](logs/slice2-text-impact-result.json) | 0 / 1.055009 | 首文本直接影响回归 |
| [slice3-initial](logs/slice3-initial-result.json) | 1 / 3.614578 | 60子场景中54通过，6个有效协议处理缺口 |
| [slice3-fixed](logs/slice3-fixed-result.json) | 0 / 4.523875 | 同60子场景全部通过 |
| [slice4-initial](logs/slice4-initial-result.json) | 0 / 1.534996 | 纯CP/真实重开，加原mixed/text影响控制，4顶层17子场景 |
| [slice5-initial](logs/slice5-initial-result.json) | 0 / 2.127238 | 当前授权/取消/原Close/SQL结算，5顶层2子场景 |
| [slice6-initial](logs/slice6-initial-result.json) | 0 / 1.961236 | CP编码开销/Probe/空对象/callback/零预算，5顶层19子场景 |
| [final-normal](logs/final-normal-result.json) | 0 / 5.003979 | 全 Anthropic 包，17顶层98子场景 |
| [final-race](logs/final-race-result.json) | 0 / 32.636840 | 六项关键CP/资格/生命周期，含2个隐藏response子场景 |

表中 Wait 是整个实际命令等待，final race 包时间6.709秒，编译/链接时间未冒称协议时限。最终normal/race同347输入 SHA `01d10895351e842d1c92bbc8d13d2d1b360fa4cd41e96d29de42f5b7f70c9345`，全部 drift=[]；Root另已逐项核验normal当前源/ZIP与17/98计数，未为计数重跑测试。六个生产源在 slice3-fixed 后完全未变，最终 imports/文件集合已交120消费；本作者不把119早期336/339字节快照冒称当前347，也不替120声明五平台许可闭包完成。

首次失败没有覆盖或改成预期成功。[mixed分类](logs/slice2-red-classification.json)与[最小实现差异](logs/slice2-implementation.patch)保留过程。slice3的6失败分属三类：合法 stop_sequence 未支持且 missing/null原因错误、合法 refusal details 未支持、合法结构化error在起始/已有usage后被误拒。没有编译/环境/夹具错误冒充产品红；[分类](logs/slice3-initial-classification.json)及[最小补丁](logs/slice3-fix.patch)可回读。只改自有 blocks/checkpoint；stop_sequence 必须有真实字符串字段、只允许无工具，未新增用户自定义停止参数；error终结不能恢复工具资格。后续CP/权限/生命周期/边界批次首跑即绿，没有人为制造新红。

[完整A01–A18映射](logs/risk-matrix.md)区分本协议实测、共享证据复用和未运行细项。默认 Core/Executor/Broker/SQLite/Blob/真实 SDK loopback 是主要消费者；Host为隔离fixture。混合两工具先批准实际写1、再拒绝不写，原tool_use_id和净化is_error/结果顺序保留，公开History不含thinking/opaque。17种CP破坏即使重算合法外壳也在 resolver/HTTP/Host 前被纯Inspector和真实Engine拒绝；当前 read/send Grant撤销后第二HTTP0，取消后迟到合法工具不生成审批，下一Run仍可运行。

跨重开实测先保留原CP/首次已写effect/第二待决位置，默认生产重开明确 CREDENTIAL_MISSING；之后正控通过显式固定假resolver，并只在一次性DB模拟同ref/profile的当前credential_metadata available，真实Resume继续原批、拒绝第二工具、原写入不重复。它不证明生产secret恢复，也未重注册失效ref；119另实测 CREDENTIAL_REF_REUSED。CP语义/大小及回调控制显式包装真实common.Engine，用于捕获内部CP原因或注入callback，仍由真实Executor/Broker/SQL处理结果；不是伪Engine绕过协议，也不冒称默认Core公开暴露内部原因。

共享复用仅限真实不变机制：[107](../107-protocol-common/REPORT.md)的原Body/UTF8分片/多data/字节行event界限/finished ACK/settlement helper证据与[118](../118-anthropic-registry/REPORT.md)精确三身份路由；[119](../119-anthropic-foundation/REPORT.md)默认三driver构造失败清理、默认metadata Probe生命周期、旧Chat原CP字节/Responses重开/显式fake路径回归。新Anthropic的隐藏response、真实SQLite结算故障、CP和usage已由本票另行证明。只读共享最终摘要见[来源记录](logs/final-readonly-sources.json)：118仅protocol/registry、119仅Core/锁的预期变化，原common循环/CP/tools、httpcall、Broker/Executor保持本票初读字节。

## 问题与下一步

本作者写集没有剩余必需产品改动、检查或已知未处理的本票缺陷。105矩阵是风险起点，未把每个例子都声称单独运行：Anthropic审批过期/重复Resolve/Resume、未知Host回执、recipient/群成员变化、children/question等待、三协议真实SDK同时运行、每种未知事件字面、压缩/满45秒请求/15秒idle/不断ping等未另跑；共享边界及理由在映射中明确。未运行全module/race/vet、插件build/lint、真实Provider/Obsidian/目标OS或系统keyring，未索取凭证。用户现场验证仍user-owned/not-run。

Root独立CLI/HAP/Host E2E、121双轴、120最终许可闭包及正式接纳归对应owner；本报告不复制或冒领其未完成证据。[Go窗口归还回执](logs/go-window-return.json)记录actual Wait、14源与共享摘要无漂移、无本作者Go/测试/独立HTTP/Core进程。最终工件链接预检曾在return材料生成前因前向链接不存在退出1，见[原观察](logs/report-link-precheck.json)；补齐材料后再校验，不涉及产品修复或重跑。本人亲自执行只读return结构校验，结果见[return](logs/return.json)，最终[工件manifest](logs/artifact-manifest.json)覆盖完整交付；结构校验不认证产品行为或总票验收。原生MESSAGE+FINAL后停止全部写入。
