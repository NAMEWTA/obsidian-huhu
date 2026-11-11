# 任务回报

Session: 20261105T094057Z
Task: 036-preflight-t16-diffs
Status: completed

## 聚焦交接

独立只读预检完成；保留已批准的 `@pierre/diffs` 选择，无需换库或扩大产品范围。**T-16 派发前需要 Lead 补齐最小领域 API 与构建接缝写集，并明确大文件解析、读取上限和跨 Document 实测门。** 当前只读正文不足以完成 AC-097/098 的已有批准行为。这是实施准备结论，不是 T-16 实现/验收通过，不推进 Ticket/Goal。

实际检查以 npm **1.6.4 发布包**为准，未把在线 main/docs 当固定版本。未安装依赖、执行下载的库代码或写 node_modules；未改源码、fixture、资产、配置、Git、正式状态/Evidence，未委派。唯一仓库写入为本不可变 REPORT；过程材料在 /tmp/huhu-t16-preflight。T-02 并行输入未冻结、未全库校验。

## 产物与验证

### 固定依据与实际入口

已读 T-16、AC-092/094–099、DESIGN3 §3.7/§5/versioning/§7、ADR-006、reuse-decision、coverage、AGENTS/dev/ui、调研复用/许可/架构规则。现役恢复边界仍适用：归档资料恢复需要领域 owner；此次 UI 换引擎不授权改写事务或原生草稿。批准设计摘要仍为49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。

- 文档实际阅读：[官方 docs](https://diffs.com/docs)、[官方完整文本](https://diffs.com/llms-full.txt)。包事实来自[固定1.6.4元数据](https://registry.npmjs.org/@pierre/diffs/1.6.4)及[同版本发布tarball](https://registry.npmjs.org/@pierre/diffs/-/diffs-1.6.4.tgz)，以下 `dist/...` 均指该档案内文件。未依赖非官方文章。
- tarball SHA256：6419ae2f0489d9619dac3b3b1348a92d44a998c11324ebfa9bfb47436179a441；实际SHA1及SHA512分别匹配registry shasum与SRI。版本1.6.4、Apache-2.0、React peer ^18.3.1或^19，发布包包含LICENSE.md。dependencies实际为diff9.0.0、shiki^3或^4、lru_map0.4.1、@pierre/theme2.0.0、@pierre/theming1.0.2、@pierre/highlights0.4.0、hast-util-to-html9.0.5。
- 当前 package.json、lock和node_modules中均无Pierre/Shiki；不存在可声称已验证的“已安装Shiki版本/语法图”。只读registry最新Shiki元数据为4.6.0，但**未选定或安装它**。后续实际lock才决定Shiki及grammar闭包。
- Git入口：module.ts动态加载 ui/workbench-page.ts → SyncPresentation/sync-presentation.tsx → GitWorkbench.tsx；更改、提交详情、比较三处消费 AsyncDiffSurface。revision-review从 ui/history/review-page.tsx → NoteReviewPage.tsx消费DiffSurface。NoteHistoryPanel/history-panel-page.tsx复用同一NoteHistoryHost与reviews服务，不能漏掉其A/B选择与来源失效行为。
- 旧实现链为 DiffSurface → diff-editors/diff-model → CM Chunk；diff-worker-factory经virtual:versioning-diff-worker生成blob。消费者还包含GitWorkbench、NoteReviewPage、review-page的DiffLayout/Preferences类型。删除旧文件时必须同时迁移这些真实导入，不能只移除渲染器。
- 现有HistoryQueryService负责pin commit及不可变comparison；RevisionReader保留原始BOM/EOL/hash；NoteReviewService固定源叶/首次当前快照；RestoreService保留prepare、checkpoint、apply、receipt、undo及复核。上述职责继续保留。

### 固定API与最小 UI 适配

下表的已证事实来自发布包声明及相邻JS实现；不是运行通过证明。

| 接缝 | 1.6.4事实与实施要求 |
|---|---|
| 单文件/多文件 | `dist/react/MultiFileDiff.d.ts`用oldFile/newFile直接比较；FileDiff消费FileDiffMetadata；CodeView有受控items与独立initialItems模式、稳定id/version、ref.scrollTo。单文件与多文件复用ui/diff/的薄包装，全部浏览保持edit=false，不引入库内编辑事务。 |
| missing/empty | `dist/types.d.ts:36–73`的DiffFileInput明确一侧可null，双null不成立；空文件为contents:''真实对象。将domain missing与真实空文本分开，两端均missing走空态，不调用解析器。binary/error/too-large保留领域原因，不伪装空文件。 |
| cache/hydration | FileContents.cacheKey至少绑定repo/immutable endpoint id、hash、name、lang。解析metadata按比较身份memoize；partial hydration修改同一对象，`utils/hydratePartialDiff.js`会改isPartial、行数组及key后缀。loadDiffFiles没有AbortSignal参数，包装闭包需持有本次比较generation/AbortController，失效后拒绝旧结果，不能重算partial对象丢已加载内容。 |
| hunk | `utils/diffAcceptRejectHunk.d.ts`返回**新的FileDiffMetadata**，并非最终字符串/写入回执；accept选择additions，reject选择deletions。index→worktree暂存更新index侧；HEAD→index取消暂存更新index侧；index→worktree还原更新worktree侧。显示交换不能倒转授权方向。使用完整metadata与规范化行边界建立HunkDiff，交现有restoreHunks验证全部重建/原始快照投影，保留BOM/CRLF/混合EOL/emoji/EOF与未选区字节；不能仅把precise设true或把显示行号当UTF-16偏移。partial、截断或proof失败只读。 |
| 冲突 | `react/UnresolvedFile.d.ts`及useUnresolvedFileInstance.js证实React输入非受控，初次useState解析file，换文件/版本必须key重建。React options没有vanilla的onMergeConflictResolve公共输入，内部还接管onMergeConflictAction。不能照vanilla示例给React传回调便声称写回。可由renderMergeConflictUtility提供三种同名HUHU操作，借getInstance().resolveConflict取得候选file/fileDiff，再确认并调用领域；成功以新源hash重建，失败保持旧源/重试。不要依赖默认按钮先改内部预览后自动落盘。 |
| 选行/批注 | `SelectedLineRange`是1-based side/endSide语义；annotations为side+lineNumber+metadata，不是屏幕row。CodeView selection另带item身份。复制从固定snapshot按所选side取行，跨side范围需明确定义UI已有语义；annotation元信息用稳定应用id，不能用虚拟DOM位置持久化。 |
| 键盘 | `utils/hast_utils.js:46–60`的gutter为div/span；InteractionManager只挂click/pointer事件，未提供行号Enter/Shift键盘行为。DESIGN§7行号键盘、改动块导航后真实焦点不能仅凭库鼠标选行认定通过。需要ui/diff内有界a11y适配，经onPostRender mount/update/unmount覆盖虚拟行回收；沿库selection/scroll API实现，不另造Tab trap。真实按钮/焦点语义与清理方式须由spike验证。 |
| 主题 | `registerCustomCSSVariableTheme(name, variableDefaults, fontStyle?)`第二参数必需；DESIGN中的单参数写法只是意图。注册huhu并补齐--diffs-foreground/background/token-*与DESIGN全部override；只用huhu主题，不依赖内置Pierre配色。主题变量从宿主容器继承进shadow，unsafeCSS只含获批token布局。themeType/纸墨对比度与selection颜色需实际双Document验证。 |

线上docs的missing、cache、partial与非受控冲突说明与发布类型一致；更细API判断均以上表固定声明/JS为准。采用方式保持批准能力，不新增编辑模式、评审线程或其他功能。

### 三类领域缺口须分开处置

**A · 改动块index写入及冲突写回缺少API/写集。** SyncService:616–635仅stage(paths)、unstage(paths)、discard(paths)、markResolved；GitRepo:237起是整文件git add/restore，没有hunk/CAS内容写index接口。RestoreService现有PrepareRestore可接候选正文并复用回执，但SyncService.restoreGate:563–579明确拒绝operation/conflicted，因此**冲突动作不能原样走普通restore gate**。Git工作台host也未获得restores，只有NoteHistoryHost已暴露它。

最小方向：新增/扩展domain typed请求，绑定repo/path、预期HEAD/index OID、worktree/body hash、操作类型与候选proof；复用既有串行队列和真实Git boundary。index更新只触及选中文件/块、保留其他已暂存路径，fresh验证失败即拒写；正文还原复用checkpoint/receipt/undo。冲突必须有明确且仅限已核对冲突文件的领域准入，保留普通恢复遇冲突的拒绝，不全局放宽restoreGate、不静默markResolved/继续merge。由Lead选择最小API后补权限，不能让UI调用裸git或写vault。

**B · B=工作树、多文件及统计查询缺口。** core/history.ts的VersioningQueries.changedFiles(leftCommit,rightCommit)只接commit；GitRepo:522–546将两端requireCommit，不能直接传worktree。RevisionFileChange也仅path/from/status，未提供+/−统计。新增领域端点列表/numstat能力或最小扩展既有查询，覆盖commit/index/worktree差异与renames，仍由VersioningQueries读取。笔记历史A/B可复用已有inline/local-snapshot比较，不应为它另建Git引擎。

**C · 读取硬上限与解析取消不是同一问题。**

- reader平台MAX_SNAPSHOT_BYTES=2MiB，resolve的maxBytes还被Math.min硬夹紧；公开VersioningQueries.resolve甚至只暴露signal。故“仍然渲染”不能取得被reader拒绝的正文。UI总显示limit（旧diff-model为两侧合计2,000,000字符）与单端读取byte硬上限需独立表达：允许对已经安全取得的内容解除渲染阈值；超reader硬上限仍需明确原因，若批准行为要读更多，Lead需定义有限opt-in reader上限/取消API，不做无限读取。 |
- 发布`utils/parseDiffFromFile.js`同步调用createTwoFilesPatch；React useEffectiveFileDiff:179–187在useMemo内调用它，ParseDiffOptions继承Nonabortable。`worker/types.d.ts`只有initialize/set-render-options/file/diff(metadata)高亮请求。库Worker不承担原始双文本解析，不能等价替换旧120,000字符以上computeDiff Worker，也不能把卸载后的结果忽略称为取消同步计算。
- 首选利用可取消领域patch读取+FileDiff，避免UI重复整文件解析；但大文件全文/强制渲染、hydration路径仍需测量和边界。如果必须异步parse，提交一个只import库parser的薄计算Worker facade候选（非复制算法），与官方高亮Worker分开。该额外入口与当前“只换成官方worker.js”的严格表述需Lead先明确；未证明前不预选方案、不保留旧CM引擎兼容层。

### ownerDocument/Worker：先实测，再决定补丁

固定源已有明确风险：`react/WorkerPoolContext.js`的provider使用模块全局instanceCount与workerPoolSingleton，第二个Document的factory不会建立独立池。可用已导出的WorkerPoolContext与WorkerPoolManager写有界的HUHU所有权包装（initialize/terminate、ownerWindow.Worker/blob/URL及关窗清理），无需复制Worker引擎或使用全局singleton。

DOM层则**不能在本预检批准一种未经实测的realm补丁**。`components/web-components.js`只对ambient customElements注册HTMLElement子类，懒建一个共享CSSStyleSheet；CodeView:194–196/383/391、FileDiff:1401起、Virtualizer:56–64/147–169有ambient document/window/观察器及跨realm instanceof。附带InteractionManager的document pointer监听。新Document直接创建自定义标签与已升级标签adopt是两条不同路径；constructed sheet和注册不随React owner context自动变正确。仅改Worker factory不满足AC099。

初始实际spike应在固定包+生产构建选项下同时挂main/iframe两个Document：分别首次创建FileDiff/CodeView/UnresolvedFile、交换活动窗口、真实滚动/resize/选行、复制、挂/卸载、adopt后继续渲染，核对shadowRoot样式与真实监听/Worker归属，再在Obsidian浮窗验证。保存实际失败后才选最小修复；若采用构建转换，沿现有Radix模式用完整源hash、锚数量、图数量及正反控制保护。补丁仍无法满足窗口/清理合同则回Lead，不扩大替换引擎范围或改approved UI。

### 构建、语言与许可接缝

官方[Shiki细粒度打包指南](https://shiki.style/guide/bundles)说明全量目录即使动态导入仍增加浏览器/Worker分发体积。当前esbuild为单CJS无splitting，这个风险实际存在。

- scripts/diffs-languages.mjs提供同一插件给主包和buildVersioningWorker：将shiki/langs替换为只公开markdown/yaml/json/css/javascript/typescript/html/shellscript的loader表，通过Shiki所属resolveDir解析细粒度@shikijs/langs入口，不能把全量bundledLanguages再filter。对实际grammar传递依赖按锁定metafile核验，不在未安装时宣称只有8个物理文件。
- filename自动推断也需白名单归一：固定包getFiletypeFromFileName将.sh/.bash推为zsh而非shellscript，.tsx等也不在本白名单。只缩loader会导致未知语言抛错；DiffView在创建FileContents/metadata时明确给allowlist lang，其余text，shell别名映射shellscript。保持该逻辑与脚本单测共用的唯一表。
- 仅设置preferredHighlighter:'shiki-js'**不会消除打包分支**。固定包普通backends/shiki.js和worker/shiki-*.js都仍含oniguruma/wasm动态导入，另有普通/hashed highlights模块及themeResolver的highlights主题loader。插件必须对实际源保护后裁掉不可达后端，或以明确throw的窄stub阻断分发；未知路径/源应构建失败。不要更改node_modules、悄悄external后留运行时require，或从库复制引擎。内置主题catalog也要检查体积，不能因为运行时只用huhu便假设树摇掉。
- scripts/versioning-worker.mjs现有write:false/IIFE/browser/metafile形态可复用，入口解析官方@pierre/diffs/worker/worker.js（不是portable），嵌入blob前确保已无外部import、wasm和highlights；高亮主题/语言按官方协议由主线程解析后发送。旧UI diff-worker*删除与新pool工厂应同批落地。
- scripts/esbuild-options.mjs由Lead接入同一插件；scripts/bundle-budget.json由Lead添加forbiddenEagerAreas的npm:@pierre/diffs、npm:shiki及实际Shiki子包禁止项，**不提高**现有output8,252,416、eager135,168、versioning激活195,584、styles1,441,792阈值。新包应留在动态UI闭包，不能静态拉进module.ts/api.ts/manifest。
- check-bundle.mjs只分析主包图；blob内嵌Worker的依赖不能靠主包npm归因完整看见。现有buildVersioningWorker返回metafile，scripts/diffs-languages.test.mjs应分别检查主包和Worker图、八类语言/外语text、hashed后端、无wasm/highlights/portable/宿主externals，另测篡改源/额外入口的拒绝。报告实际字节与闭包差异，不能提高预算制造通过。
- third-party-notices.mjs已经合并主包+Worker两份metafile，因此无需预先改生成器；Lead安装锁依赖、删除CM merge后运行原生成/检查流程。仅实际分发的包进入通知；不能因包依赖里列highlights就声称其必已打入产物，反之也不能漏掉Worker内包或CSS许可。

### 建议Lead补齐的精确最小路径

| 责任 | 路径与边界 |
|---|---|
| T-16现有UI写集 | ui/diff/**新薄包装/endpoint adapter/hunk proof/selection/theme/a11y/pool所有权；GitWorkbench.tsx、DiffSurface.tsx迁移及旧diff-model/editors/worker删除；history/NoteReviewPage.tsx、review-page.tsx、NoteHistoryPanel.tsx；对应现有DOM及hunk-mapping测试。现有styles/**与T-16 fixture足够。 |
| 必需新增领域权限 | src/modules/versioning/core/history.ts、core/repo.ts、services/history-query.ts、services/sync-service.ts、module.ts；分别为端点列表/统计、受验证index动作、队列/准入、既有restore实例装配。api.ts仅重导VersioningQueries时无需为了新增方法机械修改。 |
| 有证据再开放 | platform/desktop/revision-reader.ts与core/history.ts的有限opt-in读取；core/restore.ts及services/restore-service.ts只在最小冲突操作准入/回执语义确有需要时扩展。当前普通恢复事务与core/hunk-restore.ts无需因换渲染器直接重写。 |
| 领域真实测试权限 | test/sync/git-history.test.ts（端点/worktree/rename/限额）；新增test/sync/git-hunks.test.ts（真实Git选块index写入、其他staged保留、过期proof拒绝）；services/restore-service.test.ts、core/hunk-restore.test.ts保留并按新增准入增例；必要时test/sync/git-boundary.test.ts仅补同一scope边界。当前T-16未授权这些test/sync路径。 |
| T-16构建候选 | 已有scripts/diffs-languages.mjs、scripts/diffs-languages.test.mjs、scripts/versioning-worker.mjs与src/types/versioning-worker.d.ts。若大文件spike证明需要，ui/diff/parse-worker.ts薄parser任务入口（在现有ui/**写集内）及scripts/versioning-worker.mjs双构建入口合同先由Lead明确。 |
| Lead集中守卫/共享 | 若realm spike确认需适配，新增scripts/diffs-owner-document.mjs及相邻scripts/diffs-owner-document.test.mjs由Lead集中拥有；若复用ui-adapter-guard，scripts/ui-adapter-inputs.json及scripts/verify-ui-adapters.mjs须补共享权限。esbuild-options、package/lock、bundle-budget、词典/THIRD-PARTY-NOTICES和产物沿既有Lead所有权。勿在T-16拥有者未明确时顺手改共享guard。 |

这份路径表是供Lead修订Map/Ticket的建议，不是worker自行获得写权。依赖T-03/T-04/T-15完成前不实施T-16。

### 旧测试风险转移与实际验证边界

保留 core/hunk-restore.test.ts 全部raw-range负例、services/restore-service.test.ts 的检查点失败/新编辑/身份变化/真实index变化/回执失败/undo与restart语义，以及history/hunk-restore.dom.test.tsx的真实prepare→checkpoint→apply→receipt→undo链。旧hunk-mapping中的BOM、CRLF、混合EOL、emoji、EOF逐例改为Pierre metadata适配，不删后仅靠截图。

旧diff-model Worker的过期id/取消/失败/大输入拒绝风险转到新pool/解析边界测试；diff.dom.test.tsx中的切文件立即清旧结果、迟到请求不覆盖、取消重试、只读端点及展开键盘语义必须保留。旧CM三布局/独立stacked分隔器/滚动实现断言按批准DESIGN的split/unified新呈现重写，不能作为保留旧引擎的理由。新真实浏览器门覆盖Shadow DOM、选区、行号键盘、虚拟行回收和两窗口；happy-dom或mock DiffSurface不证明这些能力。

本预检实际执行：只读rg/sed/cat沿调用链；官方web浏览；curl/urllib读取registry和tarball；Python重算SHA1/SHA512并安全解压到/tmp；发布声明/JS与本地关键文件SHA记录在release-inputs.json、local-inputs.json。无安装、编译、测试套件、bundle/notices生成或浏览器运行。首次urllib取tarball悬置后终止，curl成功取固定包；另一个Shiki grammar档案请求超时，未采用不完整内容。未把静态检查写成渲染/性能/运行验证通过。

## 问题与下一步

建议Lead先修订T-16/Map的领域与真实测试权限、冲突准入、读取opt-in及parser Worker合同；保持OOS-001只补最小API。依赖就绪后先做锁定包的双Document/大输入spike、语言/后端构建图检查，再让实现者沿最小源接缝完成既定页面。

待验收事项明确保留：锁定后完整依赖/许可与语言grammar图、实际产物预算/启动闭包、差异计算可取消性与渲染响应、hunk raw等价和真实Git CAS、冲突三选失败回滚、全入口偏好与A/B race、纸墨×强调色对比度、真实Obsidian主窗/浮窗/关窗。当前证据支持风险定位和实施接缝，不支持T-16 Ready运行门或任何产品完成声明。
