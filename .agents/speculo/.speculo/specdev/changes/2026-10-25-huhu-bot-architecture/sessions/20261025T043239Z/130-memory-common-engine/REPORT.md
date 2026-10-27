# 三协议共同上下文、记忆维护与 CP 绑定

Session: 20261025T043239Z  
Task: 130-memory-common-engine  
Status: completed

## 聚焦交接

完成本 TASK 的共同 Engine 组件实现和已授组件检查。4 个生产文件、7 个必要消费者测试的精确摘要见 [28-final-own-source.json](logs/28-final-own-source.json)，自有树 SHA `041f670542476319f9cde6b0f221c906f8b8a5be7d88a6c32c59177eb4942dd9`；相对实施前备份的完整差异见 [29-own-final.patch](logs/29-own-final.patch)。125 R3 API、三个 driver、httpcall、协议 identity/Registry、SQL/Core/Executor/Broker、锁和旧四样本均未改写。未委派、提交、推送、发布或归档，不推进正式 Gate/AC。Root 继续负责共同装配、数据库账户和独立联合验收。

普通新输入先纯校验 sealed canonical digest、accepted IntentHash 和可从 config/session/lineage 获得的 namespace；ShortTerm 存在时拒绝重复 History/Messages。请求保持 Persona→原显式 Sources→完整 delegation requirements→ShortTerm→Memory→Intent。短期块复用 `api.RenderShortTermInput`；原文 Ref.Hash 与摘录 TextHash/spans 保持各自职责，alias 只带空正文元数据。记忆块固定 `HUHU authorized memory input v1\n`，规范小写 camelCase `{bindingDigest,entries:[{role,text}],targets?:[{itemId,revision,revisionId,pinned}]}`，Targets 复制后按 itemId 排序；资料始终为 user data，不因 role 字符串获得 system/tool 权限。

Run、Resume 与纯 Inspector 共用输入重算及规范块逐字比较；新块固定在独立 Intent 之前，改 namespace/ref/body/spans/digest/mode/job 等不能靠重新计算 CP 自报 hash 成为可信。Resume 在 Resolve/新 HTTP/Invoke 前拒绝；Inspector 只读给定 Reader。maintenance 额外要求完整固定前缀与空工具 digest。没有新增 CP DTO 字段、Format、EngineVersion 或 ToolDigest seed，不扩大既有历史/附件全部正文真实性保证。

maintenance 只由可信 Memory.Mode 选择，保留原 pinned Agent/model/Attempts；固定版本指令与实际空工具 schema，不改变 Agent.Config.AllowedTools。任何 provider tool call 均在首次 Invoke 前拒绝。模型文本仅在有界私有 turn buffer 内，成功只返回 MemoryCandidates、Text 空；失败/取消亦 Text 空、Partial=false、无用户 sink 事件。目标白名单在广告请求时独立复制，晚改调用方 slice 不改变该轮权限。候选 wire 仅接受 `{items:[{operation,targetItemId?,text,provenance}]}`，精确区分大小写，拒绝 null/别名/未知字段/重复键/重复候选/重复目标 correction/坏 scalar Unicode/截断；items≤32，create 必须省略 targetItemId，correct 只能使用 server Targets，provenance 仅 observation/inference，每 text≤65536 UTF-8 bytes，完整 JSON≤131072 bytes，空 items 合法。既有纯 Unicode helper 与 StrictJSON 先于 decode。

没有新 worker、HTTP 重试、Run 或账本域。Purpose/AccountID 保持 driver 原默认值，由128实际 DB 绑定账户族；本票没有用 Memory.Mode 或模型文本选择账户。真实 SDK 终结、body.Close、原 producer ACK、unknown 观察及 Settle 继续原路径。取消控制证明 held Close 时 Engine.Done 未关闭且 Settle=0，释放后才 producer ended/unknown settlement/Done。

## 产物与验证

复用 dev 与 SpecDev I 的 owner/预检/TDD/风险/异步可靠性规则；本轮重新核 TASK、workspace/catalog 与入口，采用115/123和125最终 R3，不新增产品决定。实际工具链 [14](logs/14-toolchain-stdout.log) 为 `go version go1.26.10 linux/amd64`。所有产品检查仅 Root 明确授予的独占组件窗：GOWORK=off、GOEXPERIMENT 空、GOFLAGS=-mod=readonly、GOPROXY=off，normal/vet CGO0、race CGO1。未运行默认 Core/SQL/插件构建或真实 Provider。每轮完整命令、有效输入 ZIP/SHA、stdout/stderr、实际 exit/耗时/Wait、sourceDrift 均存同前缀；所有 sourceDrift=[]，所有子进程实际 Wait。

真正的首红由 Root 亲跑：现有 Engine→真实 Chat SDK→本地 HTTP 成功并完成 Attempt 前置断言后，请求仅含 Persona/显式 source/Intent，缺少两新块；exit1、Wait0.652434518s。正式证据为 `evidence/T-14-logs/130-common-initial-red-r1.json` 与对应 log，实际闭包 `130-common-closure-r1.json` SHA `dd16e8790b21b2988ab30338d5662da54f2e57a96561ef98e8c5cad0dc95aa3c`。该证据不是编译红，也不是 Core 未装配红。06 同一真实 SDK 目标转绿。

| 证据 | 实际结果、分类和覆盖 |
| --- | --- |
| 05 closure | 0 / Wait0.111843151s；362 总包、本仓库仅 common/chat/api，无额外包/Error/embed |
| 06 首绿 | 0 / Wait0.874100082s；实际请求规范两块、顺序/Intent alias 一次、真实 SDK Attempt settled |
| 07 maintenance | 0 / Wait0.611717194s；合法/严格负控/精确候选上限/工具零 Invoke/截流无泄漏与 unknown |
| 08 closure | 0 / Wait0.120810930s；相同三包边界 |
| 09 input/CP | 1 / Wait0.579666732s；21 输入前置负控绿，审批夹具漏既有必填 target.workspaceId/baseRevision，故 TOOL_ARGUMENT_INVALID；非产品红 |
| 10 同目标 | 0 / Wait0.628296067s；仅补完整 EffectTarget 夹具，21 输入负控、15 可信参数/工件 CP 篡改负控、原输入一次 Resume |
| 11 closure | 0 / Wait0.117974702s；仍原三包 |
| 12 edges/legacy | 0 / Wait1.020939445s；完整委派、128KiB decoded memory、held Close 取消、Targets copy、旧 Chat 原字节 Inspector/Resume |
| 14 toolchain | 0 / Wait0.009382158s；实际版本见上 |
| 15 final common normal | 11 顶层，0 / Wait0.575085423s；本票共同合同完整定向集合 |
| 16 final common race | 4 顶层，0 / Wait3.157380695s；生命周期/目标快照/可信 CP/旧 nil CP |
| 17 common vet | 0 / Wait0.211013608s |
| 19 protocol closure | 0 / Wait0.118203758s；424 总包，本仓库仅静态7目录，Error/额外 embed/漏快照源均[] |
| 20 old nil overlay | 0 / Wait1.510754087s；旧 common 两源真实 SDK 产出 Responses/Anthropic nil CP，O_EXCL 只写自有 logs |
| 21 current nil | 0 / Wait1.319073165s；当前同两例逐字比旧捕获，Inspector/Resume 正常 |
| 22 protocol normal | 1 / Wait0.802593399s；内容/隐私/CP 均绿，Anthropic text fixture 漏两个显式 cache usage 零值，原 driver 正确保守 unknown；非产品红 |
| 23 corrected protocol normal | 2 顶层/13 场景，0 / Wait1.065173025s；仅补 text fixture 两个零值，3协议普通/维护/非法维护9链与非Chat nil/sealed CP4链，nil继续比旧捕获 |
| 24 final protocol closure | 0 / Wait0.130582834s；仍424包/7目录，unexpected/Error/embed/missingSource/drift均[] |
| 25 protocol race | 同13场景，0 / Wait3.585078032s |
| 26 protocol vet | 0 / Wait0.270597948s |

15–17 同输入树 `354e71b7b45a6dce8465cb20a878112029b78c35e22947dc7dbd964368d14bd0`；23–26 同当前有效输入树 `eb24e3c19c0b07263f4daf28106d2b002394a932f7615635f09027d89df6d0d3`。新增子包不引入 Core/SQLite/Store；[13 静态闭包](logs/13-protocol-static-closure.json) 和 [24 实际闭包](logs/24-protocol-closure-result.json) 可核无 init/TestMain/embed，三 driver/httpcall 持续只读。

nil 兼容分别有独立字节来源：Chat 读取未改的原107真实 producer 2768-byte样本（SHA `7536db3ef21941d7cef85597e850ef1ed96441fc43fe11c504f49803c5e3b631`），当前编码器从原 accepted inputs/原工具结果重建逐字相等，纯 Inspector 与实际 SDK Resume 保持原调用位置。非 Chat 由 Root 授权，仅将02实施前备份中的原 engine.go/checkpoint.go映射为 Go overlay，其他原common生产SHA保持，新增纯文件无init且旧nil路径不调用它们；原/有效输入、映射、提取SHA在 [18](logs/18-overlay-proof.json) 与20结果。旧/当前 Responses CP1908字节同SHA `3776c26c4e4ac72b104df579a1c54cbd1f0065bb0abcfe375c5a82dc7b175c83`，Anthropic CP1742字节同SHA `13afe82ac0936a3921422443c630ab8247ba4cd1133f278846c9cb8f3546fa7c`。固定端点的受控 RoundTripper用于确定性 codec 对照；3协议新输入/维护则实际 localhost HTTP。原四 fixture/golden 均未覆盖。

[27](logs/27-compatibility-and-fixture-classification.json) 保留两项夹具失败归类和22→23完整单行差异。后者只修文本响应 usage；产出 nil CP 的 tool 响应未变，23仍逐字比较20旧实现捕获。所有旧失败日志保留，没有将夹具错误称有效红。

验收映射：AC1见06/12/15/23的正文顺序、别名、完整requirements与字节界；AC2见10/12/20/21/23/25的可信参数比较、旧三协议字节与恢复；AC3见07/15/23的严格schema、emptyTools、私有buffer和失败零Invoke；AC4见12/16与原attempt调用不变，真实持久账户须128/Root；AC5见真实首红→06首绿及3协议SDK/实际loopback，公共StartRun补充测试已落但尚未运行；AC6见每次闭包/输入/独占窗口/实际Wait与未扩大检查。

## 问题与下一步

组件范围无已知未处理故障，源码/测试已停写、产品 Go 已全部 Wait并交还。只读来源见 [30-readonly-final-sources.json](logs/30-readonly-final-sources.json)；最终工件清单与 return 结构校验在自有 manifest/return 日志中。该校验不等于独立审查或正式代码门。

明确未验：`tests/contract/engine/chat/memory_context_test.go` 的公共StartRun消费者因整个包含尚在实施的Core/SQLite闭包，本票没有编译或运行它；Root联合窗口须接纳该真实公共链。126/128/129与Root负责数据库实际来源授权/Plan–Seal选择、manifest缺失不降legacy、真实maintenance job→账户族/预算、存储提交、HAP/context分页/重开和独立双轴。记录型Attempts仅证明原调用/producer观察，不证明持久额度、Grant或账户。

common只验证收到的sealed输入与CP绑定，不从字符串marker推断新policy或缺manifest，不读取完整原历史/原excerpt来源，也不替DB验证当前授权。维护无工具，通常无可恢复CP；崩溃且无完整兼容CP的既有T16阻塞规则不改变。真实Provider推理、Obsidian与目标OS现场由用户后验，本票不请求凭证。
