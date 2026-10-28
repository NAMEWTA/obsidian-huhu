# T-19 repair-1 独立双轴审查原始报告（r2）

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（按 Lead TASK；原生派遣回执由 Lead 核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: 7b33c43cf7a8edb899f1b933654f73ba2b4082d277872f59faddebead3215651

本人未参与 T19 或 repair-1 的实现、修复和测试编写，保持原生 gpt-6.1-sol / high 独立 reviewer 身份。唯一写入为本 r2 报告；未改源码、正式 Evidence、Ticket/Map、旧输入/旧报告、生成物或 index，未再派遣 Agent。

## review-input

完整冻结对象：[T-19-review-input-r2.json](T-19-review-input-r2.json)。上述 Input-SHA256 为完整对象 JSON.parse 后再 JSON.stringify 的 UTF-8 SHA256，与 scope 内部摘要区别。

开始及结束检查：27 个工作副本文件和 51 个来源原字节全部 MATCH。新增实际路径包括 legacy-adapter.ts、services/form-drafts.ts、ui/use-archive-draft.ts。输入已补入 r1 读取的四份 UI reference。本次按实际新闭包审查，未直接把 r1 结论改为 pass。

结束前重跑原 review-scope 的同一显式27路径，base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256 全部 MATCH。源码与来源未在本次审查中漂移。

## 原五项修复复核

以下是原 finding 的各自闭合结论；本轮新增问题另列，不把原修复重新说成未做。

| 原标准/规范 finding | r2 实际实现与证据 | 本轮结论 |
| --- | --- | --- |
| S01/A01 staged修订损坏仍切current | form-store 对新文件保存 identity/rawHash/stat/mutationGeneration，捕获 staged 原生叶，schema/form捕获后再次读取原字节；最终 current create/process 同时复核全部proof | 已闭合。独立原反例在首次与已有current两种情形均拒绝且旧current不变；新增回归覆盖最终门及原生叶。提交后读失败使用 formPublicationUnverified + committed-unverified/revisionId/pointerPath，不伪称回滚 |
| S02/A02 v1排队创建未复核form | LegacyArchiveCreator增加prepareCommit；真实 application.create 在共享create队列内捕获，传最终beforeCommit到实际Vault create | 已闭合。独立person/company阻塞队列→发布新form→释放均formChanged、0实体；新增回归另覆盖final create前变化与正常v1创建 |
| S03/A03 条件判别不一致 | validCondition 按op闭集、拒绝不相容成员与非JSON值/超深结构，求值也按同一op分支 | 已闭合。原eq/contains夹带conditions、错误and节点均稳定invalidDefinition；无任意TypeError；字段引用、false/null与边界有新增回归 |
| S04/A04 设置分类切换丢草稿 | module单实例ArchiveDraftOwner；真实settingsPage拿同owner、按root加key/命名scope；hook同步保存编辑与异步结果；设计snapshot基准也保存；明确discard清scope，dispose阻止迟到set | 已闭合于原设置入口。新增测试通过真正CategoryContent/ModuleSettings分类卸载重挂，覆盖新类型、已有设计/模板、busy成功/失败、明确放弃、root A/B返回与dispose。后文新增问题仅在未加key的workbench入口 |
| S05/A05 重复ID只读打开错误文件 | open直接接收点击行的ArchiveEntity，列表显示只读path，raw/base来自所选文件；唯一后才调用beginEdit(id) | 已闭合。新增回归覆盖不同名、同名同ID不同path、各自raw、只读禁止保存和重复解除后正常编辑；没有放宽原唯一身份写门 |

特别核对了“保留旧设计但把CAS换成新修订”的潜在反例：DesignEditor 的/base键确实保存原snapshot。独立DOM恢复F1草稿到F2 props后，实际publish请求仍是F1/H1，旧基准未被改绑；该风险假设已证伪，不作为finding。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: request-changes
Input-SHA256: 7b33c43cf7a8edb899f1b933654f73ba2b4082d277872f59faddebead3215651
Observed: 原五项修复闭合；新增owner的workbench根切换出现以下1项已确认问题。

### S-r2-01 — P2：workbench切根只换draftScope，继承旧根的脏状态与局部表单缓存

- Path：`src/modules/archives/ui/contacts-presentation.tsx:138`；关联 `src/modules/archives/ui/ArchiveWorkspace.tsx:30`（30–32、58–64、90–94）。
- 可达前提：通用工作台根A的定义编辑有未保存草稿，另一设置页将archives.rootFolder改为B。ContactsPresentation.onOpen订阅settings变化会render；renderContent对同一ArchiveWorkspace只换draftScope字符串，没有按root/context设置React key。对应settings入口已有key=root，不属于本缺陷。
- 已执行DOM反例：使用同一实际Workspace、同一owner，A根改显示标签为“A DRAFT”；把服务当前目录切到RootB、rerender为B scope，等公开catalog显示RootB。此时B没有任何编辑，New archive type与Types and forms按钮仍disabled=true；A草稿仍正确保存在owner的A scope。
- 原因：useArchiveDraft管理的view/session键会随scope切换，但dirtyState/busyState、dirty/busy refs、forms/formLoaded、错误/请求等局部状态没有同步隔离或重置。旧子编辑器卸载不会重置父dirty ref；B的forms加载还可能因旧dirty&&formLoaded而被跳过。props scope变化不等于组件生命周期变化。
- 风险：正常切根后新根继承旧根的操作锁和表单缓存，类型设置入口被禁用；等待中的旧scope回调还可作用于复用组件的无scope局部状态。此处没有观察到跨根磁盘写入，不将其夸大为已证实的数据覆盖。
- 依据：ui 生命周期与正确状态owner，dev数据归属/上下文边界；新owner修复不能只隔离Map键而继续复用前一根的交互状态。
- 修复满足条件：workbench按完整root/context重新建立Workspace生命周期，或等价地隔离/取消并恢复所有局部状态与异步请求；保留模块owner中的A草稿，不因切B而清掉A。覆盖真实workbench入口A→B→A：B不继承A dirty/busy/forms/formLoaded/错误/确认状态，A回来继续原草稿；切根期间旧异步结果不能回写B，正常/忙碌成功/失败均有断言。settings已正确按root加key的入口保持。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: request-changes
Input-SHA256: 7b33c43cf7a8edb899f1b933654f73ba2b4082d277872f59faddebead3215651
Observed: 原T19、Spec AC018/019/020、ADR、Issue3与PAGE001/002重核；原五项合同缺口已闭合，新增1项root/context边界未闭合。

### A-r2-01 — P2：新根上下文继承旧根交互锁，通用设置入口不可用

- Path：`src/modules/archives/ui/contacts-presentation.tsx:138`；`src/modules/archives/ui/ArchiveWorkspace.tsx:30`。
- 合同：T19真实Workspace/Settings入口和编辑草稿生命周期；PAGE001输入/切区域保留草稿与明确导航，PAGE002可继续操作及恢复；Issue3根目录切换保护与FormSession上下文归属。保留A草稿不意味着B应被A未保存状态锁住。
- 反例/风险：实际Workspace根A有草稿后，同实例换B scope并显示B目录，但新建类型/类型设置被禁用；B不存在该草稿也没有可消除该旧dirty的编辑器。不是T23完整树或T21迁移功能缺失，而是本票新增根scope消费方式自身不完整。
- 满足条件：workbench的root/context切换建立独立视图状态与异步边界，B正常可操作，A返回仍恢复草稿；无旧请求写入新scope。不得通过丢掉所有owner草稿来制造“新根不脏”。

## 实际检查与原始输出

来源沿用本轮51项已绑定合同：AGENTS、dev/ui及分支references、T19/Spec/ADR/完整Issue、Map、SRC010、DESIGN/封板与前序T17/T18。设计仍为revision2/PAGE001002原批准范围；无新增UI方案或扩展许可。

除上述新增问题外，实际源码显示：表单/实体公开服务接线仍完整，T18同步最终门、schema proof、native叶/编辑代次、null范围补丁未被修复撤回；字段变化仍经codec、草稿/complete分离，隐藏旧值不清空，模板仅create应用。新owner只在模块内存保存草稿，未引入另一业务磁盘真源或隐式发布。

本轮独立执行了Node/esbuild write:false生产代码内存bundle，重放首次/已有staged反例、v1排队创建、postcommit读失败和非法条件；另用happy-dom/Testing Library直接操作当前生产TypeDesigner/Workspace，核对原snapshot基准与根切换。没有修改测试文件、源码或生成物，没有跑真实宿主。

```text
STAGED false rejected definitionConflict old current retained true
STAGED true rejected definitionConflict old current retained true
LEGACY person rejected formChanged entities 0
LEGACY company rejected formChanged entities 0
POSTCOMMIT formPublicationUnverified committed-unverified reported actual revision true
CONDITION eq invalidDefinition
CONDITION contains invalidDefinition
CONDITION and invalidDefinition
UI REQUEST {"baseRevisionId":"F1","baseContentHash":"H1","label":"LOCAL","formName":"P","templates":0}
ROOT scope B visible new-type disabled true types-and-forms disabled true
ROOT A retained draft A DRAFT
base_sha MATCH
observed_head MATCH
working_snapshot MATCH
index_sha256 MATCH
tracked_diff_sha256 MATCH
byte check 27 51 MATCH
```

一个DOM夹具最初未注册NodeFilter，未到达发布；补齐后，期待“过期草稿发布成功”的假设没有成立，后续捕获实际请求确认基准仍F1/H1。缺失全局或未成立假设都不记作产品finding；仅上述RootB操作锁为新增已确认问题。

原设置生命周期回归已逐项回读其真实CategoryContent/ModuleSettings消费者和owner：busy完成结果写owner后在重挂消耗，不自动重新发命令；dispose的active门阻止late set；显式discard清scope。读取了原五项的新增生产测试而不无理由重跑整套。

## 未验证与结论边界

作者报告12文件195tests、末次DOM12、全testtsc、15生产lint/末次UIlint、architecture1252/i18n5073/diffcheck全0；本reviewer未复跑这些全套，只把它们作为作者检查事实，实际独立反例如上，未用测试数量代替语义判断。

真实Obsidian Vault/多窗/平台、人工视觉和性能按SRC010由用户负责，本轮未运行；happy-dom只证明组件状态，不证明布局/宿主事件时序。build和共享生成物不在本reviewer写集。没有跨域修改。

本次standards=request-changes、specification=request-changes，仅剩上述新增P2 root/context问题；原五项修复结论分别保持已闭合。修复后需新冻结受影响输入并复审，原r1/r2报告保留。完成本报告后停写交回。
