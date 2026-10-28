# T-19 独立双轴审查原始报告

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（按 Lead TASK；派遣原始凭据由 Lead 核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: d3736a5231a43ccd089e9726d32bf8905f2a44944d1831b972bd35df67f18076

本人未参与 T19 实现、修复或测试编写，保持原生 gpt-6.1-sol / high 独立 reviewer 身份。只读审查对象，唯一写入为本报告；未改源码、正式状态、Evidence、Ticket、Map、前序报告或生成物，未再派遣 Agent。

## review-input

完整冻结对象：[T-19-review-input.json](T-19-review-input.json)。上述摘要为该对象 JSON.parse 后再 JSON.stringify 的 UTF-8 SHA256，不是 scope 内部摘要。

开始与结束核对：24 个工作副本文件与 46 个来源原字节全部 MATCH。新 form-definitions/form-store 与 UI 文件均按实际原字节审查。前序 T17r2/T18r2 的实际实现作为调用依赖回读，不把共同 HEAD 当成所有未提交字节相同的证明。结束前重跑原 review-scope 的同一显式 24 路径选择，base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256 均 MATCH。

## 来源与实际检查范围

来源 found：AGENTS、dev、ui、原 T19、Spec AC018/019/020、完整冻结 Issue3、ADR、Map、SRC010、DESIGN revision2、approval-sealed 与原型源码。Ticket design_ref.digest 与已读 DESIGN/封板最终绑定均为 f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c，适用 PAGE001/002；没有把 PAGE005 的完整动态树/T23、T20关系或后续迁移视为本票交付。

code-review 的工作副本、来源发现、风险、独立双轴、证据、错误恢复/测试可靠性合同仍适用。新增界面读取 ui design-system/motion-a11y/shell references 与 design-contract；实际补充原字节摘要列报告末。未发现新增适用 AGENTS/CONTRIBUTING/CODING_STANDARDS。

影响闭包：真实 module → archiveServices → catalog/forms/publishForms/createEntity/updateEntity；可见 form revisions/current；实体 v1/v2 路由、T18 schema proof/native guard/YAML patch；工作台 surface/ContactsPresentation → ArchiveWorkspace/EntityForm/TypeDesigner；settingsPage 直接挂同一 Workspace；完整13种 renderer registry、受限条件与模板。另回读 settings CategoryContent/ModuleSettings 的实际卸载行为以核对设置入口草稿生命周期。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: request-changes
Input-SHA256: d3736a5231a43ccd089e9726d32bf8905f2a44944d1831b972bd35df67f18076
Observed: 固定源码、真实调用关系、生产代码内存反例与 happy-dom 生产组件反例；5 项已确认 finding。

### S-01 — P1：发布前未冻结新 staged 修订，失败仍把 current 切到损坏定义

- Path：`src/modules/archives/core/form-store.ts:83`（77–99）。
- 可达前提：已有有效表单 F1，publishForms 创建 F2 文件并完成第一次读回校验；随后在 captureType 之前，外部同步/源码编辑改变 F2。captureType 重新加载后捕获新的 repository 代次，checkForms 只捕获前序 F1，均不再验证 F2 本身。
- 已执行反例：F2 第一次 read 返回原字节后立即模拟外部把 F2 的 format-version 改为99、mtime变化并 invalidate；发布仍 CAS 替换 current 指向 F2，最后 this.read 报 invalidDefinition。命令失败后 current 已失去有效 F1，后续 forms 查询继续 invalidDefinition。
- 风险：不是“只留下未引用 staged revision”的可恢复失败，而是失败后把活动表单目录破坏。也缺少对新 staged 文件自身的原生叶/身份/字节最终检查。
- 依据：dev 持久化安全、error-handling 部分提交保证；类注释承诺“Unreferenced revisions are retained after failed publication”，而此处失败留下已被引用的坏修订。
- 修复满足条件：把新 staged 修订的预期 raw/hash、TFile identity/stat/变动代次及相关原生叶纳入发布 proof，在最终 current process/create 前复核。捕获期间被修改或损坏时保留旧 current（首次发布则仍无 current），只保留未引用 staged 证据；提交后的读失败仍需明确区分真实已提交结果。增加读回→captureType、capture→current commit 的确定性竞态与正常发布/恢复负例。

### S-02 — P2：v1 创建仅预读表单版本，排队期间变更后仍按旧模板写入

- Path：`src/modules/archives/core/catalog.ts:650`（639–660）；关联 application.create 的共享 create 队列。
- 可达前提：person/company createEntity 传入 F1 revision/hash 和模板；预读成功、模板值已合成后等待 create 队列。期间另一次 publishForms 成功将当前定义切到 F2。
- 已执行反例：以 barrier 占住共享 create 队列，发起 F1 模板创建；队列等待时发布模板默认值改变的 F2；释放队列后创建成功，值为 FROM_OLD_TEMPLATE，而 current 已是F2。
- 原因：legacy 分支直接 createLegacy，没有把 form/schema capture guard 传进实际 create 的最终写入；v2 分支有入队后版本校验和最终 checkForms，此分支没有。
- 风险：新公开表单安全合同在两个预设类型上断开，旧表单/模板上下文变化不被报告，调用方无法保留草稿并按新定义重试。
- 依据：dev 公共契约两端一致、异步写入前置条件；API/现有v2语义都要求捕获的表单版本仍成立才提交。
- 修复满足条件：v1 create 的实际共享队列与最终 Vault.create 也消费捕获的表单 proof；变化时无新实体文件，返回稳定 formChanged/definitionConflict，保留输入。补充 person/company 排队和最终 create 前的表单变更/原生叶变化，及无变更正常创建；不隐式迁移旧格式。

### S-03 — P2：条件校验与求值使用不同的联合类型判据，非法条件可发布后崩溃

- Path：`src/modules/archives/core/form-definitions.ts:63`；关联50–56。
- 可达前提：公开 publishForms 收到 `visibleWhen={op:'eq',fieldId:'name',value:'X',conditions:'invalid'}` 等含不相容附加成员的 JSON 对象。
- 已观察：validCondition 按 op 进入 eq 分支接受该对象，publishForms 成功；conditionMatches 却按 `'conditions' in condition` 进入分组分支，抛 TypeError `condition.conditions.some is not a function`。条件读取/发布均无法过滤该异常，生产 EntityForm 渲染直接调用求值，ErrorBoundary 会接管整块界面。
- 风险：非法元数据成为可见当前修订，打开表单可能崩溃并丢失当前 React 草稿。没有观察到脚本执行；缺陷是受限表达式的结构验证与解释器不一致。
- 依据：dev 不可信持久数据运行时收窄、错误处理保证，闭集表达式不能靠 TS 静态类型排除真实 JSON 的额外字段。
- 修复满足条件：校验与求值都以已验证 op/同一规范化结构分派，拒绝不相容节点，未知字段不得改变解释分支；非法输入发布前返回 invalidDefinition，旧current不变，求值无任意 TypeError。覆盖 eq/contains 带 conditions、and/or 缺/错数组、深度/字段引用边界。

### S-04 — P1：设置页没有离开保护或草稿 owner，正常切分类会静默丢失编辑

- Path：`src/modules/archives/ui/settings-page.tsx:116`；关联 `ArchiveWorkspace.tsx:28`、`ArchiveTypeDesigner.tsx` 的本地 useState。
- 可达前提：用户从真实设置→档案入口编辑新类型/表单/模板，随后切设置分类再返回。该入口只传 services/settings，没有 registerLeave；父设置 ModuleSettings 在分类改变时卸载该组件，也没有相应草稿 owner。
- 已执行 DOM 反例：以实际 ArchiveWorkspace(settings=true) 输入 UNSAVED TYPE DRAFT，模拟真实分类切换的 unmount/remount；回来草稿不存在，没有确认。源码追踪确认真实 settingsPage 正是这个无 registerLeave 组合，状态全在被卸载组件 useState 中。
- 风险：用户可投入大量字段/模板编辑，普通设置导航便丢失。本地 dirtyState 仅禁用 Workspace 自己的几个按钮，不能保护外层设置导航。
- 依据：ui 生命周期/草稿与页面导航安全；当前设计明确输入后切区域保留草稿、跨实体/上下文离开须明确选择。真实设置入口不能比工作台入口弱化此保证。
- 修复满足条件：为设置入口接入真实离开/取消流程，或将未提交设计草稿放到可靠的模块 owner 并在返回时恢复；不得以卸载清空冒充取消。覆盖真实设置 category 组件切换、新类型/既有定义/模板、继续编辑/明确放弃和忙碌期间导航。不要自动发布来保存草稿。

### S-05 — P2：重复ID的只读记录点击按ID取第一项，展示错误文件

- Path：`src/modules/archives/ui/ArchiveWorkspace.tsx:67`；关联97。
- 可达前提：query 正确保留两个同ID、不同path且readOnly=true的实体。列表为每个文件生成独立行，但点击只传 entity.id；open 再用 find(id) 取第一条。
- 已执行 DOM 反例：FIRST/SECOND 两个只读文件同ID，点击 SECOND，实际 Archive form 只出现 FIRST，没有 SECOND；fallback baseline 中 raw 也来自第一文件。
- 风险：用户无法通过第二行查看对应损坏/歧义文件的原始内容，身份诊断场景误导调查。只读避免了本次写坏，但不保证浏览正确。
- 依据：dev 身份/路径事实与 UI 读失败/只读可浏览合同；发现重复时不能再把 ID 当作足以唯一选定文件的定位符。
- 修复满足条件：只读/歧义浏览必须保留点击行的精确 path+identity 或实际实体引用，展示对应 raw/值/诊断；继续禁止通过非唯一 ID 开始可写编辑。覆盖两行分别打开、同名不同path、重复解除后的正常编辑。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: request-changes
Input-SHA256: d3736a5231a43ccd089e9726d32bf8905f2a44944d1831b972bd35df67f18076
Observed: 按原T19完整合同与Issue3、PAGE001/002独立核对；5项规范轴缺口如下，不以单元测试绿色代替。

### A-01 — P1：失败发布改变活动current，破坏可回读表单合同

- Path：`src/modules/archives/core/form-store.ts:83`。
- 合同：AC018/020 的定义版本与损坏资料安全；Issue3 不可变修订/发布前置/失败诊断；PAGE002 发布前影响与只读状态保留原有效资料。
- 反例与风险：F2 staged 在读回后损坏，最终指针仍切到F2，命令报错后原有效F1不再是current，后续forms全失败。
- 满足条件：新修订也有原字节/原生叶最终proof；坏staged不能成为current，旧current维持，失败材料可定位且不自动重放。

### A-02 — P2：预设实体的创建未保持formRevisionId合同

- Path：`src/modules/archives/core/catalog.ts:650`。
- 合同：T19 要求真实公开create/update消费表单修订；AC020 在定义/表单版本改变时检查，而不是给旧草稿静默套语义；个人企业继续开箱即用而非绕过通用内核。
- 反例与风险：F1模板已进入等待队列、current更新F2后，person创建仍按旧默认值成功。v2的相应变更会被拒绝，预设路径合同不一致。
- 满足条件：v1也在实际创建队列与最终写入点核对表单/hash/原生叶，变更后不建实体并保留草稿；无变更继续以原v1 codec创建。

### A-03 — P2：受限条件允许非法结构成为已发布元数据

- Path：`src/modules/archives/core/form-definitions.ts:63`。
- 合同：AC019 的受限条件、T19失败矩阵“非法codec/条件失败可解释并保留草稿”；Issue3受控表达式树。
- 反例与风险：eq夹带conditions字符串能发布，生产求值TypeError。未执行脚本并不足以满足条件安全可用；已接受的节点必须可稳定解释。
- 满足条件：统一判别与运行时验证，非法条件写前拒绝且旧current不变，正常eq/contains/and/or与false/null行为保留。

### A-04 — P1：实际设置入口不满足未保存草稿的导航保证

- Path：`src/modules/archives/ui/settings-page.tsx:116`、`src/modules/archives/ui/ArchiveWorkspace.tsx:28`。
- 合同：PAGE001“输入后切区域保留草稿”，PAGE002现有有效资料与返回/重试，T19保持草稿和真实消费者；来源关于FormSession保存脏字段和草稿。
- 反例与风险：设置分类切换卸载，新类型字段/表单/模板的本地状态丢失，无保存/留存/放弃选择。
- 满足条件：真实设置导航保护或可恢复owner状态覆盖该入口，不只是测试单独Designer；明确放弃才清空，失败/返回均可继续编辑。

### A-05 — P2：只读重复身份文件不能按用户选择浏览

- Path：`src/modules/archives/ui/ArchiveWorkspace.tsx:67`、`:97`。
- 合同：AC020危险资料只读诊断，T19“只读损坏数据”失败路径；PAGE001“只读仍可浏览”。T17/T18已建立重复ID只读事实，本票必须正确消费。
- 反例与风险：点击第二同ID文件仍显示第一文件，违反具体文件/raw可定位的只读浏览语义。
- 满足条件：按精确path展示点击文件，保持只读且不放宽唯一身份编辑门，分别打开/返回有回归证据。

## 已检查成立的范围与设计一致性

- 公开catalog.forms/publishForms实际发布在api/service/module链路；UI经公共服务读取定义、命令创建/更新，没有UI直接写磁盘。新增类型初始字段归类型本体，form design只引用已存在fieldId，未知fieldId拒绝；未观察到表单暗建字段或脚本/eval/远程schema。
- 两表单共享values/changes，切表单不主动清空；隐藏/disabled字段不参与可见渲染但原值仍在baseline，提交只传显式changes。fieldSettings标签与字段身份分离，兼容最新展示定义不批量改实体，符合Issue§488。模板仅在create应用，更新不重新套默认值。
- 新v2字段/金额/月/null/false/Markdown仍走既有codec，完成校验与草稿分离；T18基准raw/hash、schema proof、原生叶和最后同步process门仍在v2更新路径。v1 save接入额外表单检查，只有新建分支存在S02漏口。旧资料未因纯读迁移。
- module页面/settings懒加载边界保持；现有工作台增加页内通用入口，完整动态树/路由属于T23。PAGE001字段区、表单切换、草稿/完成、字段冲突比较、信息栏与PAGE002类型/字段/多表单/模板/发布确认在源码可对应。复用现有Button/Input/Choice/Dialog与语义令牌，无新增主题/CSS体系。粗指针触控最小高度由共享base样式补齐，未仅按默认Button类误报尺寸。
- 设计文字和批准已读；真实1440/390、明暗、键盘/焦点、弹出窗、视觉/性能证据本轮不运行，按SRC010由用户负责，不把DOM渲染当这些验收。

## 实际执行与原始反例结果

本轮实际做了：

1. 24文件/46来源/完整Input-SHA256与同一scope末次核验。
2. Node/esbuild write:false内存bundle，直接执行实际ContactsApplication/archiveServices/formStore/form validators/codec，注入内存ContactsFiles及确定性barrier，确认staged发布与legacy排队创建竞态、非法条件发布后求值错误。
3. happy-dom + Testing Library、真实ArchiveWorkspace/TestProviders，无源码或测试文件写入；确认重复文件选错、settings组合卸载重挂丢草稿。该DOM试验只证明组件行为；真实settings类别卸载关系另沿CategoryContent/ModuleSettings源码追踪。

```text
LEGACY stale form create accepted FROM_OLD_TEMPLATE current form changed true
PUBLISH staged corruption error invalidDefinition current pointer replaced true staged mutated true
PUBLISH subsequent forms broken invalidDefinition
CONDITION malformed publication accepted
CONDITION render/evaluate error TypeError condition.conditions.some is not a function
DUPLICATE clicked SECOND opens FIRST true contains SECOND false
SETTINGS draft before switch UNSAVED TYPE DRAFT
SETTINGS draft after remount present false
base_sha MATCH
observed_head MATCH
working_snapshot MATCH
index_sha256 MATCH
tracked_diff_sha256 MATCH
all bytes 24 46 MATCH
```

DOM夹具首轮缺HTMLFormElement全局导致未到达目标，补齐happy-dom构造器后首个选择器还未计入只读状态文本而未选中目标；改用匹配完整可访问名称后才得到上述实际反例。前两轮不记作产品缺陷或通过证据。

未重复作者已报告的12文件168tests/最后DOM3tests、限定archives TS/TSX、21生产lint、architecture1248/i18n5068/diffcheck；已读现有回归断言与所测生产路径，这些数量没有覆盖本轮反例。

全test类型检查此前在T04活动中的snapshot/signature失败，归该域中间态，不跨域修复，也不改写成T19已通过。Lead随后告知T04核心4文件59测试和局部红灯已转绿、最终全tsc仍在运行；本reviewer没有自行复跑或验证该域最终结果，待Lead统一闭合。共享生成物归Lead/T32。

未运行真实Obsidian、平台、人工视觉或性能验收；遵循SRC010，不请求或代跑用户负责的真实验收。两轴request-changes只说明当前固定T19尚有本票内缺陷，未要求提前实现关系/迁移/树壳。修复后需新冻结输入与独立复审，原报告保留。

## 补充实际读取的标准/指令原字节

这些ui分支reference未列入原46来源，现如实记录；不伪称原Input-SHA256已包含它们：

- `.agents/speculo/workflows/specdev/common/rules/design-contract.md`：10d961892c212bd00780746ee09be8bd6fad99aa1327c43e6dbef27f3d3e396c
- `.agents/skills/ui/references/design-system.md`：3aed1cce7dccf6ebf7517158a9b6c509c5196c6301487bbf3533319c3ff33d3e
- `.agents/skills/ui/references/motion-a11y.md`：76043cfedd62e7278102a74325668269953d51e2076d9f0711862cb357354de7
- `.agents/skills/ui/references/shell.md`：b6ac9252068575207ddab36f78c122d6cc012ce113669230b1e2c62fe441f328
