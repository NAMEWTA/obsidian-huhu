# 记忆与短期上下文公共合同切片

Session: 20261025T043239Z
Task: 125-memory-foundation-contract
Status: completed

## 聚焦交接

按[125 TASK](TASK.md)、Map31窗口、dev/I/preflight及已接纳115/123，已完成本切片唯一纯DTO、严格wire/生成、HAP合同路由和adapter-only Hooks。20个源/生成物发生新增或修改，另保护methods.json/golden.json两项未变；[22完整差异](logs/22-final-own.patch)和[范围回读](logs/22-final-scope-readback.json)可复核。

**业务仍未装配。** Core、迁移/旧SQL、依赖/锁、common/三driver、stdio和运行状态机都未写。八个memory方法在静态表仍implemented=false；默认Core的Facade.Memory/GlobalMemory为nil且hello不宣称可用。只对显式fake MemoryAPI证明六路真实Router调用、身份传递、输入/输出校验和server-only subject；这不是记忆存储、模型召回、维护或物理投递通过。T15两方法及proposal/global分支明确不可用。

稳定交接见[interface-contract](logs/interface-contract.md)：Memory/Context纯值及两种canonical binding、Ref.Hash与TextHash/spans分工；唯一MemoryHooks嵌Plan/Seal/ReadContext且保留115其他hook；后续Core将原ContextAccess注入原Store，保持PrepareAndMarkRunning(ctx,Work)，Tx A关闭后原Host资格→Tx B Seal+唯一MarkRunning。当前只有接口声明，没有新调度、Run writer或成功placeholder。

## 产物与验证

最终R3受控22源[21 manifest](logs/21-final-interface-freeze-r3.json)tree `20a576b41d77411a8e51a35642bfc2e98ce2bf5ccb52ca6e5797dd04993b1131`。较R1 [11](logs/11-interface-freeze.json)仅memory.go/context.go和两个对应foundation测试改变，历史freeze不覆盖。主要稳定SHA：

| 接缝 | SHA256 |
|---|---|
| api/memory.go | `7cd35c57182251403d1314d8ae7d56f342613b7c63955d6311ab1a24e381f8ec` |
| api/context.go | `dc8403b6abb23b74d49e8b7230385464f31964c35b8c06b0e3ff68fad6f3cb69` |
| execution/context.go | `40bdd6fb502f3dc7e028eaa750edcc58b657000a4e1ad5ce6c07a4610ec1cf81` |
| execution/maintenance.go | `cb0e24e76cee7f3455d4b39d96720adf6683554309759b16f9f9982f2e61906f` |
| src/modules/huhubot/api.ts | `78948204281914149059429b3e0250143e41efa73642d985c2e31e544cfa0a17` |
| public/embedded schema（同字节） | `2fd592f7a503004b5b315f0becf1fc1ad9e8266aff46bfc12e2473fe73e3a615` |

其余文件逐SHA在21。新MemoryObject恰一pointer、active/forgotten/context/redacted分支、scope/namespace、正Decimal CAS、context-only分页、null/未知权限字段拒绝；Go另校验UTF8 byte、来源合计、body/hash和编码包裹总界。参数预算按decoded typed Go json.Marshal（含omitempty和默认HTML/U+2028/U+2029转义），原frame1MiB；不是原始JSON空格长度。TS127的补字节校验由原owner另行完成，精确算法/每个包裹范围和pointer/空数组差异已交接，不在api.ts塞实现或造自定义schema关键字。

新Engine/两个Inspection字段nil均omitempty；旧序列化控制已跑。新方法/Go TS形状保持72方法/144 validators，302共享样本；独立Unicode/HTML binding golden来自Python计算，仅新增memory-bindings.json，旧CP/golden未改。所有产品命令均Root唯一窗口、Go1.26.10/GOWORK off/GOEXPERIMENT空/GOFLAGS readonly、CGO0；完整输入/原日志/exit/Wait均在每组JSON。没有tidy、race或全module队列。

| 实际阶段 | exit / Wait / wall | 原始结果与日志 |
|---|---|---|
| 01旧生产形状：typed namespace/context请求被旧schema拒绝 | 1/Wait/1.794s；有效行为红，399输入无漂移 | [结果](logs/01-old-shape-red-result.json)、[log](logs/01-old-shape-red.log) |
| 02/04/08唯一生成 | 全0/Wait；72/144，最终302样本；仅预期生成文件改变 | [02](logs/02-generate-result.json)、[04](logs/04-regenerate-result.json)、[08](logs/08-final-generate-result.json) |
| 03首轮编译 | 1/Wait/0.387s；作者误用不存在的input TargetRevision，修回115实际ExpectedRevision合同；非产品红 | [结果](logs/03-initial-contract-green-result.json)、[log](logs/03-initial-contract-green.log) |
| 05 typed形状/299旧新样本/embedded schema/API依赖边界 | 0/Wait/5.872s | [结果](logs/05-pure-contract-green-result.json)、[log](logs/05-pure-contract-green.log) |
| 06 Router六路/默认未装配与byte实际通过；pure测试夹具别名失败 | 整命令1/Wait/5.826s，不称整体绿 | [结果](logs/06-router-and-bindings-result.json)、[log](logs/06-router-and-bindings.log) |
| 07仅修测试深拷贝后同pure hash/source职责 | 0/Wait/1.692s；生产0变更 | [结果](logs/07-pure-binding-fixture-green-result.json)、[log](logs/07-pure-binding-fixture-green.log) |
| 09最终302 Go shapes/hash/nil序列化；5顶层 | 0/Wait/5.616s | [结果](logs/09-final-go-shapes-result.json)、[log](logs/09-final-go-shapes.log) |
| 10 TS真实MethodValidation shape；6 tests | 0/Wait/2.894s | [结果](logs/10-ts-shape-contract-result.json)、[log](logs/10-ts-shape-contract.log) |
| 12独立Python 144正向/25 decimal变异/302共享 | 0/Wait/1.388s，旧隔离Python，无依赖安装 | [结果](logs/12-independent-python-result.json)、[log](logs/12-independent-python.log) |
| 13→14 JSON padding不应改变decoded预算；修raw guard后同case+受影响byte | 1→0，均Wait；1.697→4.760s | [红](logs/13-canonical-encoding-red-result.json)、[红log](logs/13-canonical-encoding-red.log)、[绿](logs/14-canonical-encoding-green-result.json)、[绿log](logs/14-canonical-encoding-green.log) |
| 15相关四包vet、16 Go架构 | 全0/Wait；0.589/0.085s | [15](logs/15-relevant-vet-result.json)、[16](logs/16-go-architecture-result.json) |
| 17/18 working原文字节边界红→19修正同目标与原golden | 1/1→0，均Wait；1.650/1.699→5.365s | [17](logs/17-working-budget-red-result.json)、[18](logs/18-exact-working-vectors-red-result.json)、[19](logs/19-working-budget-green-result.json)、[绿log](logs/19-working-budget-green.log) |
| 20最后受影响api/foundation vet | 0/Wait/0.644s | [结果](logs/20-final-affected-vet-result.json)、[log](logs/20-final-affected-vet.log) |

06的struct浅拷贝共享Spans数组，故意破坏UTF8的负控污染下一正控；07只深拷贝保留原断言。17已暴露原文/marker预算等问题；18把513+511原字节单span反控提纯，并延长原文使excerpt真的更短，保存四项有效红；19同目标全部绿。working累计32768按原spans之和，marker只计render；full≤1024、每excerpt span≤512，真实原文长度/尾落点/UTF8仍需reader给出的original验证，纯helper不冒称访问了DB。1025附近原文须缩短span，不能机械512+512令摘要更长。

所有阶段完整输入分别保留。最后实际411输入为[20 input](logs/20-final-affected-vet-input.json)，tree `b1d18ffc59b7385a52182dd160276ee2b515e288aba6a144bca6e181810a1b5c`，实跑前后drift=[]；不同历史阶段不冒称同一版本。Root之后已授128窗口，合法下游变化不追称本作者输入。22回读证明20个自有变更、2个未变保护；18项旧testdata/锁无漂移，260个旧非memory fixture完全相同。非memory schema除计划的可选ContextUsage/Derived新增kind外，只有`effects.get.result`及`effects.reconcile.result`的`properties.status.enum`中committed次序前移，集合完全一致；before/current数组在22，Root已接受该非语义生成差异，未以排序重开源或重跑。

## 问题与下一步

产品/测试已停写，全部本作者Go/Node/Python与测试Core实际Wait，无活跃产品进程，唯一窗口已原生交Root。仅完成本REPORT、末次SHA/链接与[return结构校验](logs/23-return-result.json)后停止交接写；工件摘要见[manifest](manifest.json)。原红、编译错、夹具纠错和R1均保留，不把失败改称通过。

当前不是T14业务完成：126真实Store/014、128 Facts/维护账户/投递、129 Core/唯一Runtime/迁移与stdio、130 common新输入/CP、127 TS byte以及T24实际页都仍由对应owner后续验收。默认memory保持未装配；server-only subjects只是合同，没有测试真正的memory物理fence。静态schema只能检结构/码点，不能以302样本或fake API签字真实授权/存储/模型提炼。

未跑全Go/race、真实模型/Provider/Obsidian/目标OS或插件build/lint；T27最终适用TS lint/build/共享产物由Root排原owner，不抢main/styles。未索取真实凭证，无提交、推送、发布、归档或再委派。T14/整票正式代码门与独立审查由Root维护。
