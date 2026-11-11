# 133：记忆组件独立双轴审查

Session: 20261025T043239Z
Task: 133-memory-component-review
Status: completed

## 聚焦交接

本人与本范围实现无关，身份为 `native:/root/recovery_review`；没有再委派或修改产品。标准轴与规范轴均为 **request-changes**：F-133-01 是 typed Memory 返回值的嵌套来源校验缺口；F-133-02 是 TS 对合法 context 页额外施加单 entry 上限。前者不能推论为正常用户可绕过来源资格，后者已通过真实 BotClient/帧连接观察到误拒及断连。本报告只覆盖 TASK 的组件候选，不签整个 T14、默认 Core、数据库、预算绑定或物理投递联合门。

Go 窗在 06 的真实进程返回后已原生归还 Root，此后仅运行 TS、只读回读和交接验证。全部本人产品进程均已实际 Wait；父任务后来进行的联合检查不属于我的实测。两项事实已分别通知 Root，F-133-01 已原生通知原 foundation_go；原 TS owner 未在 live agents，Root 已确认待正式报告后派其修复。未实施修复。

<a id="standards-output"></a>
## standards-output

Reviewer: native:/root/recovery_review
Axis: standards
Result: request-changes
Input-SHA256: 6619727eaa9258e3fd26820b22c9dc82fed23b9cc59d4748f2979022276b0c2d
Observed: F-133-01 的真实 Router 输出门接受非法嵌套值；F-133-02 的合法 context 页在真实 TS 客户端被误拒断连。三协议共同 Engine 九场景通过；没有将组件 fake、历史 race/vet 或默认 Core 未实测范围冒称当前端到端通过。

依据 dev、I 独立双轴/risk/test-reliability、错误边界和来源发现规则，验证应发生在真正消费者。03/05/08 沿纯 API→公开 HAP Router→真实 TS decoder/client，证明 schema 的码点长度和 JSON 字符替换不能代替 Go typed 输出前校验。09/10 沿 MethodValidation→HapConnection→BotClient，证明额外限制会关闭一个本应继续可用的连接。因此两项是可复现实现问题，不是只建议增加测试。

共同 Engine 新增内容仍经统一 common 入口；没有引入第二调度器、SDK 路线或 UI/跨层持久化访问。Run/Resume 在 credential/Attempt/HTTP 前执行 prepareInput；readState/Inspect 使用完整输入 helper，未改用 body-free helper。维护输出在私有缓冲内，错误结果清空 Text/Partial，空 registry 和 ToolCalls 拒绝门都在真实消费点。当前未发现这些组件的第三项须修复问题；这不是对闭包外 SQL/生命周期的批准。

<a id="specification-output"></a>
## specification-output

Reviewer: native:/root/recovery_review
Axis: specification
Result: request-changes
Input-SHA256: 6619727eaa9258e3fd26820b22c9dc82fed23b9cc59d4748f2979022276b0c2d
Observed: F-133-01 不满足 TASK Acceptance 2 和 R3 Go/TS 字节、Unicode、正 Decimal 一致合同；F-133-02 把 R3 context.get 整包 262144 bytes 收紧为未约定的 entry 245760 bytes。其余纯 binding、共同 Engine 和旧 CP 兼容证据按实际输入复用或定向复验，整个 T14 未签。

直接权威为 Spec/T01/T08/T14、115、123、125 R3、132 helper 接缝及 Map31/33/34/35/36/37。115 是前置合同，123 替换其 Prepare 为 Plan/Seal，125 R3 是最终 API 字节口径；没有把旧 115 草案签名当最终实现要求。R3 明确 ordinary object 245760、MemoryPage 262144 且单 MemoryObject 245760、context.get 整个 `{kind,context}` 262144；没有 context entry 的 245760 上限。

## 来源与输入核验

- 正式唯一 scope/sources/exclusions 为 `evidence/T-14-logs/review-input-memory-components-r1.json`，对应 `evidence/T-14.md#review-input-memory-components-r1`；TASK SHA256 `207e524a9a4993f6c9eef50ee5a040abaaebf8fda1b43b34b0f80623fb716541`。Map37/Goal36/LOG124。
- 初始输入（历史日志已清理：`logs/00-input.json`）与最终核对（历史日志已清理：`logs/13-final-freeze.json`）：31 主文件、1719 固定文件及模式、31 来源，scope 重算相同、source/file/mode/copy drift 全空。HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、index SHA256 `d2a2cc618e08f39b6730478bed302db78480d2d10642879f55b1811035e50494` 均未变。固定副本 `/tmp/huhu-review133-9yin8zqa` 的原 1719 项未变，探针为额外文件。
- G2 实际工作副本不是未提交 HEAD：独立复用核对（历史日志已清理：`logs/11-reuse-verification.json`）验证原 1697 项及 ZIP，SHA256 `4d05eb7b0fd74a2e6da5512b71e1dfddfc184d6c79893aa928d2f559bda87cea`。12 changed/22 addedSinceG2 中，四个旧配置/setup 仅是 G2 捕获缺项，不能称本次新增。31 主文件的真实旧字节比较在 diff（历史日志已清理：`logs/11-primary-g2.diff.txt`）。
- 五作者 REPORT 全文、原失败分类、最终报告及 119+29+108+18+26=300 个工件逐 SHA 核验无漂移；Root 五份接纳回执与报告/manifest 对应。131 当前 1647 项、130 自有 11 项、132 当前 API/vet 23 项再次核对无漂移，见复用源（历史日志已清理：`logs/14-reused-final-sources.json`）。
- Root 额外授予纯 typedHAP 窗：仅增加只读 `methods_generated.go`，131820 B、mode0600、SHA256 `cbfeab29e5dad9f4eef8d17e7ead5c0abde7b6e41651bc29030681f155487049`。授权为 `evidence/T-14-logs/133-hap-probe-window.json`；04 输入（历史日志已清理：`logs/04-hap-extra-input.json`）与12 回读（历史日志已清理：`logs/12-review-observations.json`）证明原件及副本一致。原正式 reviewInput 未改变。
- 先真实 go list：基础 428 packages、7 本仓目录；HAP 扩展 131 packages、3 本仓目录，与基础合计 9 个纯目录，未导入 Core/SQL/活动 writer。原输出及提取位于 01/02/04。闭包外来源路径仅为可达性静态追踪，SHA 和不作执行证明的边界记于 12，不偷加为本轮已测组件。

## Findings

### F-133-01 / P2：typed Memory 结果未验证嵌套来源字段，非法数据可通过真实输出门

位置：`native/huhubot/internal/application/api/memory.go:359` 的 validateMemoryBody、`:424` 的 ValidateMemoryResult；实际消费者 `native/huhubot/internal/adapters/inbound/hap/memory.go` 的 memoryHandle，之后 Router 只对已 Marshal 的结果做 wire schema 校验。原 owner：foundation_go。

可证伪假设是“所有 Memory 结果字符串在 Marshal 前已被纯 API 验证，后置 schema 不会洗掉非法值”。03 从合法 active item 构造正控：source ResourceID 为 170 个“中”加 `ab`，恰 512 UTF8 bytes。四个单变量反控为再加 `c`（513 bytes）、source revision=`9223372036854775808`、ResourceID 含原始 Go `0xff`、可选 title 含原始 Go `0xff`。正文/hash、namespace、scope、其他来源字段保持合法。结果全是 typedError=nil。

05 不直接调用私有 handler：实际 New Router+Service、公开 protocol.hello 成功 Ready、显式 fake MemoryAPI.Get 返回该 typed 对象，再调用真实 memory.get。每个 case calls=1、RouterError=nil；非法 Go 字符被 encoding/json 替换为 U+FFFD。08 将实际 Router 字节作为真实 TS 客户端响应：512-byte 正控通过；513-byte ID 和越界 revision 触发 INVALID_METHOD_RESULT/closed；已替换的两个字符串通过，因为原始坏字节已丢失。见 API 探针（历史日志已清理：`logs/03-review133-api-probe.go.txt`）、[API 原红](logs/03-api-boundary.log)、Router 探针（历史日志已清理：`logs/05-review133-hap-probe.go.txt`）、[Router 原红](logs/05-hap-boundary.log)、实际字节（历史日志已清理：`logs/05-router-results.json`）、TS 探针（历史日志已清理：`logs/07-review133-ts-probe.ts.txt`）、TS 回执（历史日志已清理：`logs/08-ts-router-controls.json`）。

影响与前提：这是明确承诺的 typed 输出合同缺口，错误/损坏的应用返回可形成不兼容响应或静默字符替换。**没有证明正常用户经当前来源受理链能构造上述坏值，更不是权限突破。** 静态追踪 ContextAccess sourceIdentity→grants.Opaque/Positive，正常入站 Source 的超长 ID/越界 revision 已被拒绝；Go 非法字符串不是合法 JSON wire 值。来源进入 MemoryBody 是真实已消费 Access.Sources/Scopes 的拷贝，持久 JSON 亦有自己的编解码边界。探针 fake 的责任是验证 TASK Acceptance 2 的非法 typed 返回门，不假装是实际 SQL producer。

同根因静态覆盖（尚未逐项另跑）：`MemoryBody.JobID` 未校验，`CreatorAgentID` 仅非 user 分支校验；candidate/job 的可选 Reason 未验证 UTF8；job 只在 bound 时检查 Run.ID，Run.Reason/Usage 内标量没有纯 API 验证；eligible=true 时 settings Reason 亦短路。`context.go:243` 起的 view/entry Reason、SourceRefs 及可选元数据也应覆盖相同的编码前义务。SourceRefs/SourceScopes 内 IDs、scopeResourceIds、revision、hostLeaseEpoch 都是同类边界。后置 schema 已有的 enum/required/range/数字形状会继续拒绝不合法形状，不将它们一概说成 wire 绕过；它无法恢复被 Marshal 替换掉的原始 UTF8。对 Run.Usage 等原字段应遵守自身允许零/非负数的合同，不机械强制所有数字正数。TS 的 positiveDecimals 名单还漏 source `hostLeaseEpoch`，而真实 sourceIdentity 对其用 Positive；这项同族静态遗漏需与原 TS owner 一并核齐，不能只修 SourceSnapshot.Revision 一个字段。

最小修复：在纯 API 结果验证中对所有可输出字符串先检查 UTF8，再按实际 DTO 的完整 nested source/scope/可选元数据补对应 ID 字节、Decimal 和原有语义；共享纯 helper 由 body/context 等分支消费。不能靠 Marshal 后再 ValidateMemoryJSON 找已被替换的字节，不能放宽 TS；TS 的来源 epoch 语义需一致。验证条件：同一公开 Router 反控在输出前拒绝；合法 512-byte/MaxInt64/正常 Unicode 正控继续通过；Scope、可选 JobID/CreatorAgentID、Reason、context.SourceRefs 与合法零用量等同类正反控覆盖，按 schema 已有职责避免制造无效红灯。无需引入 SQL/权限读取到纯 helper。

### F-133-02 / P2：TS 把合法 context.get 页误判为非法响应并关闭连接

位置：`src/modules/huhubot/core/protocol/method-validation.ts:138`，memoryContext 无条件对每 entry 执行 `memoryEncodedBytes(entry)>MEMORY_OBJECT_BYTES`。原 owner：foundation_client。

假设是“context.get 遵守整个返回 262144 bytes，合法 Source metadata 不因普通 MemoryObject 的 245760 限制被误拒”。09/10 使用 attachment/metadata/readable entry、3 个合法 SourceSnapshot，各自 32 个不同 ScopeResourceID。ID 用合法 `<` 字符，最大 434 UTF8 bytes，Go 默认 HTML 转义按 R3 计数；没有非法 Go 字符、超长 ID、越界 Decimal、超过 source 数量或伪造正文 hash 的前提。闭包中实际 schema 验证为 true。

| 控制 | entry bytes | 整包 bytes | MethodValidation / 真实 client |
|---|---:|---:|---|
| 低于单 entry 阈值 | 243683 | 243882 | true，resolve，ready |
| 合同内反例 | 249443 | 249642 | false，INVALID_METHOD_RESULT，closed |
| 超出整包阈值 | 266723 | 266922 | false，INVALID_METHOD_RESULT，closed，符合拒绝预期 |

09 首次红保留；10 使用真实 HapConnection、codec、hello、BotClient.memory.get，并在每分支 finally close，四测试三通过一失败。完整请求值、精确预算、source ID 上界和连接状态在10 原始结果（历史日志已清理：`logs/10-budget-results.json`）、10 探针（历史日志已清理：`logs/10-review133-ts-budget-controls.ts.txt`）、[10 日志](logs/10-ts-budget-controls.log)。Go API 的 ValidateMemoryResult context 分支静态设置 max=MemoryPageBytes，ValidateExecutionContextView 不设置此 entry 上限；本轮未重新执行 Go budget case，因为 Go 窗已归还。

可达性和限制：这不是要求真实 Core 能返回任意内部 typed 假形状。闭包外的当前 `sqlite/memory/context_view.go:89` 会把全部 ExplicitSources 放在同一 attachment view，`:326` 原样返回该 metadata entry。3×32 scope IDs 各自符合来源形状/字节约束，Scope IDs 是不透明标识；本例不依赖控制字符或不可解析 UTF8。**这是实际 producer 的静态路径证明，尚未做 Store/SQL/Host 权限端到端受理复现。** 正常有效 Host/Grant/lease 仍是实际调用前提，本组件结论不认证它们。该限制已经足以拒绝合同明确允许的纯公开结果；约 250 KiB 的合法页使用户无法读取本轮上下文，并牵连整个 HAP 连接。

最小修复：移除 context entry 的普通 object 上限，保留 context.get 整包 262144、文本分片 4096、字节/Unicode/来源形状等现有门；MemoryPage 中每 MemoryObject 的 245760 不变。增加同一真实连接的以上三控制，确保合同内页保持 ready，整体超限仍拒绝。无需改变规范预算或生成新 wire 方法。

## 产物与验证

所有命令的真实 argv/cwd/env、actualExit、waitSeconds、完整 stdout/stderr 摘要均在同名 JSON/log，执行器 runner（历史日志已清理：`logs/runner.py.txt`）。固定 Go1.26.10、GOWORK=off、GOEXPERIMENT 空、GOFLAGS=-mod=readonly、GOPROXY=off；本轮独立 Go 为 CGO0 normal，没有宣称新跑 race。

| 本轮命令 / 工件前缀 | 实际退出 | Wait 秒 | 观察 |
|---|---:|---:|---|
| 01 go list 基础闭包 | 0 | 0.178493 | 七个纯目录 |
| 03 typed nested source 探针 | 1 | 0.367806 | 正控1通过、反控4真实失败，F01 |
| 04 go list HAP 闭包 | 0 | 0.109509 | 合计九个纯目录，无 Core/SQL |
| 05 公开 Router 探针 | 1 | 0.749693 | 正控1通过、反控4真实失败，F01 |
| 06 三协议真实 SDK 消费 | 0 | 2.982213 | 1 top/9 sub，ordinary、maintenance、invalid maintenance |
| 07 pnpm 启动 TS | 126 | 0.936922 | 未进测试，pnpm 自动安装前检测因无 TTY 中止 |
| 08 直接 installed Vitest | 0 | 1.677252 | 1 test，五个实际 Router 响应的客户端控制 |
| 09 context budget 首红 | 126 | 2.139549 | 2 tests/1 failed，F02 |
| 10 context 三预算控制 | 126 | 3.809483 | 4 tests/1 failed，F02；没有把真实126改记1 |

07 是执行前提问题，保留原日志，不记产品 finding；没有继续 install、设置 CI 绕过或有意改 node_modules。改为直接 Node 调用已安装 Vitest 后才有 08/09/10 实际产品结果。08 使用保存的初版探针只运行一个 test；后续文件扩展为 09/10，不能用最终四测试源码冒称 08 执行过四测试。

复用边界与审查覆盖：

- 125 的 schema/typed/Unicode/decoded envelope、302 shared samples、144 validators、nil/golden、独立 Python、相关 vet/架构证据按最终未变部分复用。其03是字段使用编译错误，06是 span 浅拷贝夹具错误；13和17/18是真正预算红，14/19才是修复绿，均保留。
- 127/131 的75条最终测试与两类 TS 类型检查当前输入未变；127 前期 Unicode/连接红与自身 whitespace/NUL预算夹具误设分开。131 修 namespaceRevision 的 Root finding 不被旧127绿掩盖。本轮 F02 是原样本未覆盖的合法 metadata 组合，不否认那些测试确实执行通过。
- 130 自有11源未变，历史 common normal、race、protocol normal/race/vet 回执保持原输入语义。132 改共享 API helper 后，06 特别重跑三个实际 SDK 的 ordinary/maintenance/invalid maintenance 消费，验证完整 helper 仍在真实入口；不追称 130 旧 race 是132最终字节的新执行。
- 132 body-free helper 与完整入口共用固定编码，manifest 拒绝带 Text，完整入口仍检查 hash/UTF8/正文预算；Targets 复制排序、不改调用方，golden不变。132 4 top/60 sub 与 API vet 的23项当前字节一致。132容量报错是作者终端能力事件，Root已独立接纳其正式工件/Wait；不记产品失败或伪造新的作者正常终态。
- common prepare/bind/CP 路径按源码审查：ShortTerm 的可信 Intent/namespace/digest、History/Messages 排他、原 Source/Delegation 顺序、Memory 固定位置和 maintenance 完整前缀、strict候选解析、无工具/无 sink/空公开 Text；source 当前资格和原 span 真实文本仍由 Store reader承担，纯 helper 不越权。三协议 SDK 映射未分叉。
- 原 nil Memory/ShortTerm CP 的 DTO/顺序/toolseed未动；130 已从真实旧工作副本捕获 Chat2768/Responses1908/Anthropic1742 bytes，legacy 对照、原保护 fixtures 未改。以真实 G2 ZIP 和作者原字节工件核对复用，不以当前实现重新生成“旧 golden”。

未运行默认 Core、foundation/engine-chat 整包、数据库/锁/迁移、实际 maintenance 账户绑定、全仓矩阵、插件 build/lint、真实 Provider/Obsidian/目标 OS。六静态 memory implemented=false 与后续装配明确排除，不能作为本轮实现缺陷或宣称完整可用；T15两方法仍非本轮。真实现场为 user-owned/not-run，不索凭证。

## 问题与下一步

Root 在完整回读后为两原 owner 开新修复窗口，保留本轮冻结输入、首次红与历史证据；修复后以新输入复审 F01/F02及其影响面，不改本报告结论为绿。未发现阻碍读取当前候选的资源问题。本人的完整探针/结果/复用/冻结与双锚点/return 工件由最终 manifest 固定；return validator 只验证交接结构，不代替此处的失败结论。无生产写、无永久测试写、无正式 Evidence/Map/Goal 写、无提交发布。
