# 139：记忆组件 R2 独立双轴复审

Session: 20261025T043239Z
Task: 139-memory-component-rereview
Status: completed

## 聚焦交接

本人与原实现及136/137修复无关，身份为 `native:/root/recovery_review`，未再委派。当前完整固定组件的标准轴、规范轴均为 **pass**。F-133-01/F-133-02 在本 R2 输入下得到修复；未发现新的须修复 finding。133 的 request-changes 报告、原始失败与47工件保持不变，不追改历史。

这是纯 API/HAP/TS/共同 Engine 组件结论，不签整个 T14、默认 Core、SQLite/权限/预算/投递联合门。Go 窗在07实际结束后已原生归还 Root；其后只运行限定 Node 与只读证据核验。全部本人进程均实际 Wait，未写生产、永久测试、正式 Evidence/Map/Goal、他人报告或生成物，没有提交/推送/发布。

<a id="standards-output"></a>
## standards-output

Reviewer: native:/root/recovery_review
Axis: standards
Result: pass
Input-SHA256: e23efa231e65cc212b9f7ebe5e2a5ed1ba3cb8a06530b3dc8c3d1ca1506f7e87
Observed: 独立公开 Router 原五控制与253次非法UTF8字段变体通过预期，精确262144/262145整包边界正确；真实TS客户端七测试通过，合法页保持ready。新增Go helper纯值、限定调用，无SQL/SDK/状态机扩展；原失败与探针前提错误均保留并区分。

按已读未变 dev、I双轴/risk/test-reliability、source-discovery、错误边界和异步规则核查。Go 校验在真正输出消费前检查源元数据和可选字段，避免 Marshal 将坏 UTF8 替换后丢失证据；后置 schema 仍负责闭合形状。TS 改动只有来源 epoch 同族补齐与去掉错误的 entry 预算，未关闭原 schema/Unicode/整包门。新增 helper 不读 DB、不授来源权限，不产生第二份状态或生命周期。

独立探针调用真实 New Router、protocol.hello 和 memory.get，fake 仅承载 typed 应用返回；TS 使用真实 MethodValidation、HapConnection、codec、BotClient 和受控对端。它们验证组件边界，不假称真实 Store/Host 已构造这些值。没有因探针自身未达前提而要求产品修改，也没有为了全绿降低生产断言。

<a id="specification-output"></a>
## specification-output

Reviewer: native:/root/recovery_review
Axis: specification
Result: pass
Input-SHA256: e23efa231e65cc212b9f7ebe5e2a5ed1ba3cb8a06530b3dc8c3d1ca1506f7e87
Observed: F-133-01 的编码前同族元数据缺口和TS来源epoch遗漏已覆盖；F-133-02 的context.get整包262144合同恢复，普通object245760与分页/文本限制保持。模型输入binding、维护私有输出、旧CP与三个driver未变部分按真实SHA及调用影响复用，不把组件通过写成T14联合验收。

权威为原 Spec/T01/T08/T14、115、123、125 R3、132接缝及Map31/33/34/35/36/37。namespace/scope/正Decimal/UTF8、组合 provenance 和对象/整页口径仍沿最终 R3；不是用前置115草案签名覆盖123 Plan/Seal。普通 MemoryObject/params 245760、MemoryPage 262144且单 MemoryObject245760、context.get整包262144、展示文本4096、cursor2048均未改常量或形状。合法 zero usage、optional omission 和 Unicode 继续有效；正 source epoch 与可为零用量不是同一合同。

## 输入、来源与复用核验

正式 scope/sources/exclusions 为 `evidence/T-14-logs/review-input-memory-components-r2.json`，定位 `evidence/T-14.md#review-input-memory-components-r2`。TASK SHA256 `8388fc1b6668ac5745f685d42c63178187b0f77607349ac829a85efa0fc08110`，Map37/Goal36/LOG125。初始及最终核验在 [00](logs/00-input.json)、[10](logs/10-final-freeze.json)：1722 文件/模式、33主源、38来源，重算 scope 相同，file/mode/source/copy drift 全空。HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、index SHA256 `d2a2cc618e08f39b6730478bed302db78480d2d10642879f55b1811035e50494` 未变。

固定检查副本 `/tmp/huhu-review139-cetl_mxa` 原1722项未变，探针为额外文件。`methods_generated.go` 本轮已在固定输入中，保持当前false flags，未 generation。133 实际1719文件旧字节ZIP逐项核验，SHA256 `c56e01b3bdd44c748e300549fd069037ecf060fbd8d5302b20a3aaaeaacdf395`；见 [01 baseline](logs/01-baseline.json) 与[四处原字节diff](logs/01-r1-diff.txt)。三个新增检查路径中包括既存 methods_generated 依赖，不能将额外纳入捕获等同全部本轮新增产品。真实G2更早基线及133的边界说明保持原引用，不用HEAD代替未提交候选旧版本。

[09 复用回执](logs/09-evidence-reuse.json)逐SHA核验136的19工件/1647 TS输入和137的36工件/35纯Go输入，无漂移；两份最终REPORT全文、最终原红/绿日志及Root回执已回读。133原REPORT SHA `875f1e58db2e2e0ad14e044db3f21361eecf35b7b0c7e91609060d91a8381179`、manifest SHA `8e28e8782105cb5dee2f1deb66abc71f8f52cb6b91ea952361282dea49766b9b`及47工件无漂移。137作者为 `native:/root/foundation_api_repair`，135容量失败不是其产品红，也不影响本人独立性。

七个纯模型输入函数逐函数旧字节一致：CanonicalMemoryInputBinding、CanonicalMemoryInputManifestBinding、其共用实现、ValidateMemoryJSON、CanonicalShortTermBinding、ValidateShortTermOriginal、RenderShortTermInput；24个 Eino 生产文件与133逐字一致。新 helper 只被结果投影验证调用，没有替换模型正文验证入口。因而133三协议真实SDK九场景及130原normal/race/CP控制在该影响边界内复用；没有宣称本轮重跑这些矩阵，也不拿它们证明新结果门。

## Findings 与修复处置

### F-133-01：resolved on this R2 input

实物为 `api/memory_result_validation.go`、`api/memory.go`、`api/context.go`。共享纯 helper 覆盖 SourceSnapshot/SourceScope 的合法UTF8、ID512字节、canonical正int64 epoch/revision、hash、ScopeResourceIDs、kind/range；Body 的可选 JobID/user CreatorAgentID，candidate/job/Run Reason、Usage、eligible settings Reason及context view/entry元数据均在对应输出分支检查。后置 schema 对枚举/required/range仍有独立职责，不把 shape 拒绝误称全由新 helper实现。

独立可证伪假设有两层：原五反例是否真的在公开输出门修复；同族字段是否仍有遗漏或误拒合法对象。

1. 原133公开Router探针保持正常512-byte中文ID、513-byte、越界revision、坏UTF8 ID/title五控制。新候选正常值成功，四个坏 typed 返回被拒；原133失败原件不动。
2. 对六个合法对象（item、candidate、job、eligible settings、readable attachment context、redacted context）先验证公开调用成功，再逐个污染所有实际存在的字符串槽，含原来空的可选字段；每次新 clone、单变量变更、请求身份固定，MemoryAPI.calls=1。**253次非法UTF8字段变体均被真实 Router 拒绝**。零用量/普通Unicode/合法redacted元数据在正控中保持。具体输入、源码和逐字段结果见 [05对象](logs/05-object-inputs.json)、[07探针](logs/07-corrected-independent-go-probe.go.txt)、[07完整输出](logs/07-independent-go.log)；未走到的可选pointer/scope分支不冒称该遍历已覆盖，结合137实测及静态共享helper检查。
3. 作者137永久真实Router覆盖 SourceScopes、scopeResourceIds、epoch/修订MaxInt64及溢出、optional IDs512/513、zero/省略/max usage、context元数据；当前35输入及Go1.26.10 test/vet实际0证据可复用。136与本人Node控制均验证 source epoch1/Max允许、0/前导零/Max+1拒绝，zero usage仍合法。

前提边界保持：这是 typed 输出合同修复，正常来源受理此前已拒所测越界ID/revision；没有把旧 finding升级成用户可绕权限漏洞。非法Go字符串不等于合法JSON入站字符串。当前生产Source权限/租约/数据库关系仍属闭包外本域门，不由新纯helper授予。

### F-133-02：resolved on this R2 input

TS只删除 `memoryContext` 中错误的单entry245760限制，仍通过真实 method result预算计算整个context包。本人直接复用原133独立客户端向量，并补精确整包上界：

| 控制 | entry bytes | 整包 bytes | 实际TS结果 |
|---|---:|---:|---|
| 原低预算 | 243683 | 243882 | resolve / ready |
| 原合法反例 | 249443 | 249642 | resolve / ready |
| 原整体超限 | 266723 | 266922 | INVALID_METHOD_RESULT / closed |
| 精确最大值 | 261945 | 262144 | resolve / ready |
| 最大值加一 | 261946 | 262145 | INVALID_METHOD_RESULT / closed |

每个值先经实际schema形状正控；精确最大值用普通合法title补齐，不依赖坏字符或超限ID。大小按R3 Go HTML转义计数，实际输入/结果见 [08预算](logs/08-budget-results.json)，真实客户端源码见 [08探针](logs/08-final-client-probe.ts.txt)。每次 finally close，错误响应确实关闭连接，允许响应保持ready。

Go独立精确上界控制还使用真实 `json.Marshal` 计算到262144/262145，再交公开Router，分别成功/拒绝。该正常/反向控制可排除“TS只是一起放宽所有预算”的误判。136的四文件79测试、原普通object/page精确边界与144-validator缓存控制当前源码未变，按1647项完整摘要复用。没有修改schema或增加wire方法。

未发现新增须修复finding。合法的Note/Selection/source scope语义在新helper与原实际Source门之间做过静态对照；没有要求重复整个实际权限/Core链才能判断该纯组件修复。

## 产物与验证

全部命令参数、cwd、环境、原stdout/stderr、actualExit与Wait位于同名前缀JSON/log。Go仅在Root明确释放139窗口之后运行，使用绝对 `/home/wta/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.26.10.linux-amd64/bin/go`；GOTOOLCHAIN=local、GOWORK=off、GOFLAGS=-mod=readonly、GOPROXY=off、GOEXPERIMENT空、CGO0。Node直接调用已安装Vitest，未安装依赖、未改node_modules。

| 本人检查 | actualExit | Wait秒 | 实际观察 |
|---|---:|---:|---|
| 03 version | 0 | 0.003669 | 实际Go1.26.10 |
| 04 go list -deps -test -json | 0 | 0.144879 | 156包，只有api/HAP/protocol三个本仓目录，无Core/SQL |
| 06 首次独立Go探针 | 1 | 0.742945 | 六个请求前提错误，非产品红；其他目标及精确预算已通过 |
| 07 修正前提后的独立Go | 0 | 0.517687 | 三top，五原控制、六合法对象/253字符串反控、精确两预算 |
| 08 独立真实TS客户端 | 0 | 3.103989 | 七tests全通过，五预算及epoch/zero控制 |
| 10 完整冻结/源/HEAD/index核验 | 0 | 10.076910 | 1722/38/1722，零漂移 |

06 原因：探针 helper 用被污染的返回 `Kind` 同时生成请求 Kind，六次收到 INVALID_METHOD_PARAMS、MemoryAPI未调用；这不能证明输出门失败。[05原探针](logs/05-full-independent-go-probe.go.txt)和[06原日志](logs/06-independent-go.log)保留。07仅将请求Kind由未污染的对应pointer分支确定，返回值污染不改，原六目标均真正到 MemoryAPI 后被拒绝，没有生产改动或缩减断言。

08第一测试特意使用保存的133旧Router字节，证明客户端对旧超长/越界wire仍拒绝；其U+FFFD值已经是合法替换后字符串，仍可接收。它不宣称修复后Go还会产生这些坏返回，修复后Go证据是07。探针源码版本各自单独保留，不以最终源码替代首次前提错误输入。

137初始默认Go1.27.1探索及其原报告不隐藏；最终证据是明确Go1.26.10下的旧133真实字节红、新源test/vet绿。16原红有18个失败子用例，另有eligible settings inline拒绝断言失败；未将这些计成两次独立修复。136旧TS原红2 failed/2 passed、当前79绿及测试类型检查0均回读；没有放宽旧断言造绿。元数据核对脚本初次将137扁平输入映射误当带files包装，KeyError后按真实结构读取成功；这不涉及产品执行或输入改变。

未变组件的完整审查判断仍承担：canonical binding的namespace/Intent/ref/hash/顺序、使用/spans、job代/Targets固定，body-free入口拒正文，Engine/Inspector继续使用完整入口；普通输入排他和顺序、维护空tools/私有缓冲/无sink及严格候选解析、原CP DTO/version/toolseed、nil旧Chat2768/Responses1908/Anthropic1742真实字节义务保持。按133旧实际输入和本轮七函数/24生产文件不变证明复用这些证据；当前结果验证器变化不会改变credential/Attempt/HTTP之前的模型输入路径。所有数据库当前资格、真实producer/Close/账户绑定仍按后续联合门，不从组件fake推定。

## 问题与下一步

本组件复审无未解决finding。Root可在全文回读、独立return核验后登记本R2组件结论，继续T14剩余联合门；本报告不自行关闭整票或Goal。六memory静态flags仍false、T15两方法未装配属于冻结排除边界，未generation，不记新缺陷也不称默认可用。

未运行Core/SQL、完整foundation/engine-chat、全SDK/race矩阵、插件build/lint、真实Provider/Obsidian/目标OS。作者最终vet/类型证据按相同当前输入复用，本人没有虚称重跑。现场为user-owned/not-run，不索凭证。本报告及工件manifest、显式双HTML锚点提取和实际return结构校验完成后本人原生MESSAGE+FINAL停写；结构校验不是行为通过的替代证据。
