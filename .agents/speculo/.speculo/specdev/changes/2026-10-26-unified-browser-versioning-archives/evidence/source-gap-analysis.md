# 三项重构来源与剩余合同分析

本报告是 Grill 的只读事实探索，不是完整代码审查，不授权新实现，也不更新 change 状态。已完整读取 冻结的来源快照 sources/SRC-001.md 至 SRC-005.md 的三个 Issue 和两个 PR 正文。代码核对固定到共同基线 `33c21e098ef3188cbab5a09f3e0a01fadb787715`、PR #4 `b9f389101a178eaba99566ec805a2b44d5e2e01e`、PR #5 `206abb5182e55bdce820895c2e71eaafdc97b4e0`；未使用正在合并的工作树推断结果。

## 来源与整体判断

| 来源 | 原请求范围 | 现有候选 | 当前结论 |
|---|---|---|---|
| Issue #1 | 独立受管 Chromium、人机控制、身份文件、完整协议与平台验证 | PR #5，Draft | 有大量实现及固定构建证据，明确只支持 Linux x64；完整目标尚未完成 |
| Issue #2 | versioning 公共能力、稳定 Git 布局、笔记历史、三种比较、恢复撤销，后续本地历史等 | PR #4 | PR 声明 A–D 完整闭环，部分 E；需在合并构建上确认回归，E/F 缺口继续保留 |
| Issue #3 | 通用档案类型、字段、多表单、关系、可恢复迁移与同步 | 无对应实现 PR | 两个固定 PR 都没有修改 `src/modules/archives`，主体仍为设计；不能因统一摄入标成已实现 |

三份 Issue 并非互相重复；用户明确要求同一 change，可在一份 Spec 内按领域保留完整来源映射，不必新建三个 change。PR 合入当前分支与 GitHub 远端 PR 的 merged 状态是不同事实。

## Issue #1：独立浏览器

### 必须保留的不变量与验收

- browser 独立启停，Agent 只是消费者；不新增第四个宿主 View，不恢复旧 Electron 执行路径。
- 每个 Space 独占运行进程树和资料；Page 明确归属，不以 UI 活动标签路由；personal 不发 Agent 写能力。
- native gate 是 epoch 权威，撤销 ACK 后拒绝旧写者；人接管同时停止 Agent 实时读取，迟到截图/结果不得泄露人工阶段。
- 结构性 mutation 在派发前持久记录；同操作重试查询已有结果，不因超时或重启重放网站副作用；unknown 与未派发取消不同。
- Cookie 来源只读、语义不降级，staging 与目标分别核验，清理成功后才发布；来源导入成功不等于网站登录成功。
- 持久资料重开失败不能按首次创建失败删除；只恢复目录，不自动启动联网、恢复租约或重放操作；完整 desiredPages 不被部分 live 成功覆盖。
- 上传绑定内容、摘要和执行作用域，路径不公开；下载和删除有归属，可重试清理与进程退出分别记录。
- G-01～G-06 和 T-01～T-22 逐平台、逐实际构建证明；不支持项明确拒绝，宿主测试关闭 sandbox 与受管 Chromium sandbox 必须分开。

### 已有实现与代码核对

- `src/modules/browser/api.ts` 定义独立 workspace/open/材料贡献、Agent access，包含 create/start/stop、takeover、frames、identity、files 和 operation 等窄入口；材料消费者约定只填未发送输入区。
- `src/modules/browser/platform/desktop/runtime/assets.ts` 的 RuntimeManifest 将 platform 固定为 `linux-x64`，Chromium 固定 `156.0.8078.47`，验证 helper/worker 等资产。不能把 Windows 插件 CI 通过解释为 Windows browser runtime 支持。
- `src/modules/browser/core/contracts.ts:116` 的 BrowserObservation 有节点、runtime/document/epoch、truncated，但没有完整 coverage/frameErrors/viewportVersion/观察 scope 合同。
- `src/modules/browser/services/operation-ledger.ts:47` 初始化保留操作记录，dispatching 转 unknown；prepare 串行保存、相同 requestId 核对摘要，约 10,000 条硬上限。没有原 Issue 所述发行序号与持久低水位回收机制。
- `src/modules/browser/services/workspace.ts:1390` 的 sendMaterial 观察整页节点并截图，反复核验 human lease/document 后 deliver；尚不是元素选择、元素 ref 与样式材料的完整链路。
- `workspace.ts` 的事件写入集中于页面事件入口，符合 PR 自述 page/page-closed 子集；health 提供 cursor，poll 有恢复入口，但完整 control/operation/request/download/fault/cleanup 仍未覆盖。

### 剩余工作不能被合并动作消除

1. Windows/macOS 原生收容、系统凭据、sandbox、资产发行与真实宿主门禁；Linux ARM64 的支持边界也必须明确。
2. 宿主/Worker/supervisor 强杀、饱和 IPC、popup POST/opener、初始 realm/iframe/OOPIF 的完整矩阵。
3. FR-10 完整感知覆盖、逐 frame 失败、scope/mode/root、viewport 版本及输出 schema。
4. 完整状态事件投影、可靠 resync 与订阅窗口。
5. 持久发行序号/低水位压缩、结果保留与老票拒绝。
6. FR-26 元素定位与设计材料、完整消费者交付链。
7. p95/CPU/RSS 基准、原位 IME、PRIMARY selection、真实原生文件选择与 OS key provider 的实机证明。
8. localStorage/IndexedDB 等原本扩展项保留 unsupported，不误列为首轮必须全支持；最小 MCP 与原 Issue 的 SDK 建议有实现差异，可记低影响实现选择，除非互操作验收暴露合同差异。

PR #5 的 3428 passed、19 原生、50 宿主等为原作者在原 head 构建上的来源证据；本探索没有执行这些测试。新集成 main.js 的摘要不同后，原记录只能作组件历史证据。

## Issue #2：Git 与笔记历史

### 必须保留的不变量与验收

- 提交导航、文件导航和比较区域独立，选择记录不改变导航行高度；模式与 A/B 端点一致。
- 只读历史浏览保留原 Markdown leaf、buffer、undo，B 固定为首次审阅快照，显式刷新才变；窗口和来源 leaf 不串用。
- 左右、上下和行内是三种独立可用布局；切换保留版本、选择与差异位置，粗略/截断结果不得用于精确恢复。
- index→worktree、HEAD→index、历史→buffer 分开；root/merge-parent/rename/delete-recreate/MM/特殊路径等有语义夹具。
- prepare→checkpoint→revalidate→apply→verify→receipt→undo；预览取消只读，检查点失败禁止覆盖，迟到计划/新编辑拒绝，失败保留证据而不自动覆写。
- 恢复是当前笔记的新编辑，保留 HEAD/index，不隐含 commit/push；自动同步持久 hold 直到用户明确处理。
- 批注经 prepare/commit/abort 一次映射，消息不回滚，歧义锚点进入待定位；副本后续有正文或批注时不被旧撤销删除。
- 恢复检查点不是缓存，清理须保留未闭合恢复引用；用户笔记、Git 历史与原资料不可随模块重命名删除。

### 已有实现与残余

PR #4 交付声明是 A–D，另包括任意提交比较与 Git 重命名追踪。`src/modules/versioning/api.ts` 提供 VERSION_HISTORY、NOTE_HISTORY_PANEL；`services/restore-service.ts` 实际具备 plan、前置快照、gate、checkpoint、participant、重复调用与 revalidate 流程；`src/host/obsidian/document-mutation.ts` 实际比较各打开编辑叶、使用 Editor.transaction/MarkdownView.save 或 Vault 路径，复用共享写队列。

仍待完成/验收：持续自动本地历史、容量和保留/回收、精确按块恢复、复杂重命名边界的完整覆盖；可选 F 的 Markdown 渲染、历史附件、blame 和批量恢复不能默认为已交付。Windows/macOS、最低宿主 1.13 的图形宿主验证仍缺。PR 的 335 定向测试与 25 宿主断言是原构建证据，本轮未实测。

重要整合风险：Issue #2 明确要求业务 Markdown 经 owner 写入。`versioning/module.ts:194` 的 allowPath 只检查仓库范围；DocumentMutationCoordinator 的 path 验证只检查非隐藏 Markdown 与 allowPath，participant 目前为 comments。未来 archive v2 的类型/关系/迁移文件不能直接恢复某个旧文件而破坏跨文件切换。建议将“受管档案恢复经 archives 预检/公开命令，或明确只读拒绝”的行为作为跨域 AC；这是静态边界风险，未复现数据损坏，不应写成已确认 bug。

## Issue #3：通用档案

### 代码现状

两次 `git diff --name-only <base> <head> -- src/modules/archives` 均为空。基线 `core/model.ts:1` 仍是 person/company 两种 RecordKind、固定 Fields、EmploymentRecord/PersonRelation；PersonRelation.kind 已允许任意字符串，因此不能声称完全没有自定义关系称谓。`core/persist/markdown.ts:183` 只识别 person/company；不是 v2 动态类型 codec。`platform/vault-files.ts` 的 checkEditor/checkFolderEditors 为空，实际通过 Vault.process 写文件，不能当作已解决原生未保存编辑保护。

### 首轮 P0–P4 的行为合同

- 无代码创建第三种类型（项目/税务），字段/枚举/类型/实体/关系均有稳定 ID；label/path 不承担身份；字段 storageKey 不随普通改名变化。
- 两套表单改同一实体，不复制字段值；隐藏字段不清空；草稿与完成校验分离，旧 schema 草稿不得被强行套新语义。
- 字段 codec 保留前导零、false、缺失与空值、decimal 金额和年月精度；受限条件树，不执行用户脚本或远程 schema。
- 独立关系 Markdown 单一真源，有向/对称、端点、基数（含历史/当前）、时间/角色/contextRefs 明确；任职反向列表是投影，不能再迁移出重复边。
- v2 外层标记使用 archive-record/archive-relation，业务 typeId 独立，防当前 v1 parser 误写；保留原 huhu-id、附件、提醒身份。
- 定义、不可变修订、关系、迁移清单/回执可携带于可见档案目录；隐藏区只放可丢缓存与设备恢复材料；完整目录复制到干净 vault 能重建业务。
- 保存按字段/区域三方合并，未知 YAML、注释和自由正文保持；不同字段合并，同字段冲突保存草稿；未知定义、未来版本、重复 ID、损坏文件可见而非空覆盖。
- 定义修订用 parent graph 识别并发发布；当前指针被同步覆盖也不能忽略另一分支头；破坏性字段变化显式迁移。
- v1 可读、既有基本字段可继续路由 v1 写入；编辑旧关系或使用 v2 字段需显式迁移 owner，不读取即迁移。
- 迁移冻结源 hash 和稳定关系映射，先写关系再校验，再 CAS 切 owner，最后可携带完成回执；重试复用 ID、只做未完步骤。
- owner 仍 v1 时 staged 关系不双计；owner v2 关系缺件时报告不完整；完成后 owner 丢失不让关系退回 staged；v1 回流不自动回退；tombstone 防复活。
- 回退覆盖 owner、关系和清单的明确协议，遇后续用户编辑保留冲突/副本，不能只恢复旧 owner 或清空新关系求表面一致。
- 默认归档，硬删除显示依赖、附件、提醒影响；失去端点的独立关系保留诊断，不自动级联删其他实体。
- 动态 shell/type/view 路由、用户标签、提醒回跳、recent 文档分类经公开服务适配；项目主资料/关系由 archives，任务/里程碑/执行由 home，首期只引用不双写。
- 桌面与移动端分别记录性能与宿主行为；1000实体/5000关系、5000实体/25000关系、清缓存重建和同步乱序作为目标样本，不能把旧单实体规模成绩迁作新方案成绩。

P5 的 CSV、Lookup/Rollup、局部图谱和完整项目 API 是后续扩展，不应压在稳定文件协议和可恢复迁移之前。首个端到端接缝可用“项目类型→简版/完整表单→关联个人企业→重启→完整可见目录迁到干净库”。现有 archives 单元、DOM、golden 和 accept:contacts-scale 作为回归起点，真实打开编辑器/分屏/删除/迁移必须补宿主证据。

## 最少高影响待决定项

本次本地合并和摄入都已有用户授权，无需因以下未来产品问题阻塞。推荐先生成带残余清单的 draft Spec，避免把“PR 已合入”当作“整个 Issue 完成”。

1. **统一 change 的后续完成边界**：推荐保留三份 Issue 的完整目标，同时明确首阶段是 browser Linux x64 已有能力收敛＋versioning A–D 集成回归＋archives P0–P4；browser 跨平台/完整协议及 versioning E、archives P5 不静默取消，由用户决定是否纳入同轮硬完成门。选全目标将明显扩大实现和实机资源需求。
2. **档案四个基础设计的采纳**：Issue #3 是“建议”，且末尾明确要求实施前固定：v2 envelope/稳定身份；独立关系文件和权威切换；可见定义/修订/迁移事实；home 项目与自动化/shell 兼容边界。推荐按原文整体采纳，再以可见恢复与三万业务文件样本验证；若改变任一项必须先调整迁移和验收。

无需重新询问是否同一 change、是否本地合并两个 PR、是否保留旧资料，这些已有明确请求或来源约束。实现细节（目录细拆、ID 生成实现、表单按钮排序、MCP 包选择）不制造用户决定节点。UI 未有本 change 批准 DESIGN 时保留对应 Ready 缺口，不能凭已有 PR 截图宣布新的档案设计已获批准。

## 两 PR 合并与统一处理风险

- 共同基线相同但为兄弟分支；22 个同路径交集包括 app module/workbench/compose、shell navigation、vault-layout、package/lock、预算、notice 脚本、主产物和工程文档。机械“选一边”会丢失另一功能。
- PR #4 将 sync 整体重命名 versioning；PR #5 仍在 sync/core/excludes.ts 增加 `**/.huhu/browser-materials/`。必须确认合并后的 versioning/core/excludes.ts 保留它，防材料被自动提交。
- build scripts/许可扫描须同时包含 versioning 的私有 diff Worker 和 browser 的 utility Worker/CLI；主插件 CM core external 不代表 Worker 也应 external。
- 预算须含 browser 新增闭包和 versioning 改名后的条目，缺模块应失败。main.js/styles.css 不能选一个 PR 的产物作为最终集成结果，应重建并保留新摘要。
- 新 browser 功能导航与 versioning/revision-review 必须同时可达，仍只有三个宿主 View；关闭其一不影响另一模块。
- browser 运行/材料目录与 versioning 检查点都排除；未来 archives 业务定义/关系/迁移回执留可见区可同步，不能误加到运行排除目录。
- archive v2 与 versioning 的单文件历史恢复存在 owner 边界，首阶段要锁定拒绝或受管恢复策略，不能放任绕过迁移状态。
- PR #4 提到的六个文档锚点失败在 PR #5 有 githubSlug 修正，需重新跑文档门禁，不能机械继承旧“已知失败”结论。

## 本轮验证与限制

只执行来源全文读取、固定 git show、git diff --name-only 和精确代码搜索，均未改仓库代码/索引，也未执行构建、测试或宿主验收。两次试探文件路径不存在（restore.ts、app/editor/editor-context.ts）已用真实路径纠正，不影响以上固定文件证据。最终集成状态与适用检查由主 Agent 记录。
