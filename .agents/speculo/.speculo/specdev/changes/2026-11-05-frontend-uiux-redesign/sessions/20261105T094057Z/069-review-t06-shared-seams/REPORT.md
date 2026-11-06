# 任务回报

Session: 20261105T094057Z
Task: 069-review-t06-shared-seams
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain，既有 gpt-6.1-sol high；没有参与067或本次共享端口实现，没有委派。**standards：request-changes；specification：request-changes。** 完成固定范围的源审查，确认五项P2，均有实际生产组件/应用反例；本报告不将未测的像素、命中或Obsidian宿主边界称为通过。

**明确释放067的35项、Lead的14项及本次7项上下文输入冻结，供各自owner修复。** 首尾56项原字节/文件模式匹配，drift=[]。仓库唯一写入是本不可变REPORT；所有快照、差异、反例代码和原始日志仅在/tmp/huhu-t06-high-review。未改源码、配置、资产、依赖、Git/index、正式状态或Evidence。T05的071产品修复及T16等并行写集不在本报告范围。

三个档案问题S03–S05在067之前的实际baseline已有同类代码，本次不称为067新引入；它们仍是明确要求审查的完整T06编辑、生命周期和关联能力中的可复现缺陷。S01是新增共享草稿端口的受控reset缺口，S02是本次offset控件的新问题。没有把已知Home外观golden失败或旧消费者类型迁移债算成T06自身新问题。

## 产物与验证

### 固定范围、基线与来源

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。实际派遣为本TASK及native:/root对本身份的消息；dispatch校验仅验证结构，不冒称身份认证。

067清单/tmp/huhu-t06-implementation/frozen-sha256.json的SHA256为0c34a0ac3e85c5536c71f7680a12d112aa81096a3f349526e4c5057bcb3acbf6，35项逐字匹配其frozen副本与当前源。模块实际baseline是/tmp/huhu-t06-implementation/baseline.json及baseline/中29项，清单SHA256为23c120124ea5a08083cdd00e0ce8be283f71ec183d1d303b19b17c14177b0b88；相较其增加6、修改24、未变5、删除0。没有把已有staged/unstaged状态归给本次实现。

35项包括两个T06 fixture、services/generic/workbench及相邻单元测试、ui根目录ArchiveCardGrid/labels/settings-page及测试、generic的ArchivePage/RecordEditor/FieldRenderer/RelationPanel/DefinitionStudio/FieldDesigner/QueryBuilder/RecoveryPanel/common/hooks/page-state/workbench-page及相邻测试、belongings页面/年度报告/词典与测试、person阅读/概览/纪事/common及测试。新增6项是两个fixture、workbench.test、PrecisionDateControl、RevisionPanel、field-precision.dom.test；未变5项是ArchiveCardGrid、generic/hooks、page-state、ui/labels、settings-page.dom.test。

14项共享范围来自Lead指定tsconfig的实际源/测试，不把5个声明文件算作交付：app/contracts/workbench；SidePanel及DOM测试；date/Calendar、DateTimeField及新DOM测试、MonthField及新DOM测试、date-value及测试、index；task/core/calendar、services/calendar及新测试。共享baseline分别是已接受T03/T04的真实frozen副本；原task/core/calendar和services/calendar使用HEAD 37fcede4210a19bcc2a74809e7fdd301e5717957的内容，新测试按新增处理。共享14项为修改10、新增4、删除0，完整逐项原/终hash及差异保存在shared-baseline.json、shared-baseline/、shared-diffs/，清单SHA256为733a18e77578da19f3b4c58a3f2f3bb852ff275f7b9ef09183f9f6965b85b477。

7项固定上下文是lazy/ui、lazy/calendar、archives/task/home词典、CalendarBackend、task/core/time。自己的56项快照为candidate/与manifest.json；清单SHA256为7438031efcc61e45f60c53fa8189b7e140c67052b010bf8c11d37a9235be6724。final-verification.json记录首尾无漂移及范围计数。该摘要代表明确文件集合，不是整个工作区、Git clean或完整浏览器依赖图的证明。

规范来源为当前Map22、Goal Plan、Spec、T05/T06完整补充合同、批准DESIGN revision3（designDigest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66）及UI-002。标准来源为AGENTS、dev/ui及适用shell/design-system/motion-a11y/testing规则、公共code-review/risk-review；原始实现与领域schema/codec/runtime/命令、调用方及测试优先于报告声明。八份权威文档私有保存于authority/，清单authority-manifest.json SHA256为4ee1dbe6cb584dcf16ff88d0f5f0f997c69073fc290d084cacd74191f2489835。公开导出/真实调用核对未发现新增业务字段、领域schema、日期引擎、Tree引擎、兼容别名或额外库。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes
Findings: S01, S02, S03, S04, S05（均P2）

**S01 — 受控同日reset令DateTimeField发布的raw draft与可见输入分离。**

位置：src/ui/components/huhu/date/DateTimeField.tsx:31–51、107–117。任一受控value变化会把父层dateDraft重置成合法date；嵌套DateField只有date值变化或clearRevision变化才清理自己的raw文本。实际测试从2026-11-06/12:30/UTC起，输入无效2026-02-31，再只把受控time改成09:00：onDraftChange最后通知合法2026-11-06/09:00/UTC，但日期input仍显示2026-02-31。因此消费者可以按合法通知解除保存阻止，带走与可见无效草稿不同的旧合法日期。这不是仅有显示错误；破坏新增producer信号的用途。

证据：date-reset.dom.test.tsx、counters-final.log。只改变time的反例失败；同时改变date到2026-12-07的配对控制通过；没有非法成功onChange。满足条件：让受控reset同时一致更新嵌套可见raw与外层通知，保持同一输入DOM、焦点/IME和原提交值合同；如需要DateField reset端口，应由Lead先修订精确共享写集，不能让消费者抓DOM或加key重挂规避。

**S02 — 不完整offset被重新解析到未编辑的time部分。**

位置：src/modules/archives/ui/generic/FieldRenderer.tsx:250–259、279–283。分解正则只把完整Z或±HH:mm识别为offset。受控表单从2026-11-01T01:30:05.120-04:00编辑偏移成临时“+”，下一次render输入值成为date=2026-11-01、time=01:30:05.120+、offset空串。用户刚编辑的片段消失并污染未编辑时间；后续编辑/草稿不能保持原始部分身份。

证据：offset-draft.dom.test.tsx的真实ValueForm/state反例及OFFSET_EVIDENCE。完整原子替换+05:30和本测试userEvent连续输入流程均通过，不声称所有逐字键入都失败；已证实的是一次真实change及受控提交render后的“+”状态，非像素或原生输入验收。满足条件：独立保留date/time/offset的无效和未完成草稿，组合回原codec；日期、时间、偏移只更改用户指定部分，保留Z/秒/小数和外部reset语义，不能降精度或引入IANA/epoch转换。

**S03 — 已确认丢弃后等待port期间卸载，晚到完成仍调用cancel。**

位置：src/modules/archives/ui/generic/RecordEditor.tsx:245–253；消费者ArchivePage.tsx:466–492。确认对话框本身已有owner/visible/unmount取消，但确认成功之后仍await pendingDraft、discardDraft，并无alive/session检查地cancel()。实际反例通过生产Dialog接受“Discard local draft”，等真实port被调用后卸载编辑器，释放延迟port，cancel仍被调用一次。当前父closeEditor会清空父session；若父已进入另一编辑会话，旧完成可以清掉新会话。

证据：discard-lifetime.dom.test.tsx，只在外部discard port注入等待；memoryArchives、Application、RecordEditor和Dialog为生产实现。卸载反例失败，持续挂载的完成控制通过。现有只覆盖等待确认框期间隐藏/卸载的测试没有覆盖此await边界。满足条件：确认后的各异步完成检查live owner与原操作/session身份，过期完成不得关闭当前UI；保留已经授权的旧草稿丢弃与正常当前会话完成。关联编辑器的相似close continuation也应按同一有界原则核对；本finding的实际反例只证明RecordEditor。

**S04 — 自定义类型编辑器在真实索引reload期间卸载，恢复后回到旧session值。**

位置：src/modules/archives/ui/generic/ArchivePage.tsx:470–495。编辑中的schema只从瞬时runtime.index查找，未像只读列表/详情一样保留；runtime.reload在异步读文件前重建索引，自定义定义短暂不存在，RecordEditor被卸载。索引恢复后用原始FormSession重新挂载；RecordEditor内部dirty状态已丢失，尽管恢复草稿还在磁盘。内置preset的schema不消失，现有内置类型/只读保留结果测试掩盖此路径。

证据：editor-reload.dom.test.tsx使用真实memoryArchives/Application，发布自定义类型、创建记录，打开实际ArchivePage并把Name从Before改成Unsaved changed，等待真实draft保存；只在外部read port挂起真实runtime.reload。日志RELOAD_EVIDENCE为heldConnected=false、sameNode=false、visibleValue=Before、recoveryValue=Unsaved changed。这是实际输入断开和可见草稿回退，不是推测永久数据丢失。满足条件：活动FormSession保留其确切schema/编辑器身份，在索引暂时不可用时保留同一控件/草稿/焦点、必要时禁用写动作并显示状态；完成或失败重试不得从原始session悄悄覆盖dirty草稿。RelationPanel.tsx:502相似schema取值应同步核对，但本反例只证明记录编辑器。

**S05 — EntityPicker静默截断，部分合法关联目标没有可达选择路径。**

位置：src/modules/archives/ui/generic/RelationPanel.tsx:55–65、87–114。每类型只query limit50，汇总又slice150，忽略total且没有继续加载/边界提示。实际创建51个相同name/values的有效目标，领域total=51，Select仅有50目标加None；被省略目标的完整ID和path搜索均total=0，name搜索仍得到同一第一页。因此有效目标虽存在并可被实际服务读取，新关联无法选择它。selected pin只使已存在的选择显示，不能帮助新建选择。

证据：entity-picker.dom.test.tsx与PICKER_EVIDENCE（total51/options51/idSearchTotal0/pathSearchTotal0/buttons[]）；同一应用改为已有该selected id时实际combobox显示完整path，配对PICKER_CONTROL通过。满足条件：复用真实offset/limit/total查询，为各类型/汇总提供诚实结果界限与继续加载或等价可达路径，保留selected pin及查询纯度；不能提高硬上限或只提示“更多”却仍无法到达目标。该函数在067 baseline已存在，本次针对T06完整保留能力提出，不归因为新增回归。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes
Findings: V01（S01）、V02（S02）、V03（S03/S04）、V04（S05）

- **V01/P2：T05 Map19受控reset草稿合同未满足。** S01使通知与原始输入不一致，无法保证“其它字段保存不带走旧合法时间”。应按producer修复和真实消费者阻止保存验证关闭；不能用已有同date不变的成功通知断言替代可见raw一致性。
- **V02/P2：T06日期保真补充合同未满足。** S02违反“编辑时间/偏移只替换相应原始部分”“所有非法临时draft进入现有错误/dirty/恢复流程”。完整值codec通过不能证明未完成片段保真。
- **V03/P2：Spec AC-052、DESIGN UX-ARCH-2及ui/shell档案session合同未完全满足。** S03晚到close超出原owner，S04在索引失效时重挂控件并丢失可见dirty状态/焦点。恢复草稿尚存不等于当前编辑session得到保护。既有baseline同类缺口不改变完整T06交付的本项验收义务。
- **V04/P2：T06完整关联端点/动态字段和明确查询结果边界仍有缺口。** S05为全量能力反例；不把Spec AC-053的“超过500目录”数字机械套到50目标选择器，但T06全文明确包含RelationPanel、全库query、显式结果界限/继续加载，UI规则也不允许静默截断。树服务本次修复不自动覆盖这个独立picker。

其余有界源码审查结论：

- Registry保留13种字段；false/0/null/missing、金额字符串、未知/隐藏字段及递归table原rowId/非目标行身份由真实codec和现有表单路径维持。PrecisionDateControl显式选择month/day，month不补日、不经UTC；切day产生未完成草稿等待用户提供日。MonthField使用共享样式/语义、纯月bounds/IME与真实owner边界，不建业务时区引擎。上述不取消S02。
- workbench纯query先于分批limit，500批次继续查找，selected pin不伪装非匹配搜索命中，loaded与total独立；真实1201记录和跨500搜索/重试测试通过。SidePanel按leaf/feature/query持分页，展开去重/上限512/删除branch裁剪，搜索保留手动展开，切query不借旧结果报无命中，异步返回有取消与版本边界；现有实际两叶/controls测试通过。S05是另一条未分页目标选择路径。
- Calendar仅换成薄CalendarBackend，原single/range公开值、locale/lang/UTC配置和DayPicker引擎保留，没有把产品任务内容塞回picker。严格TaskCalendar端口为opt-in，在execute前复用真实wallTime reject，到期/提醒gap/fold拒绝没有写入，UTC/Shanghai与纯日期正常；未选strict的fold-earlier控制保留。未新建领域格式或改变默认策略。
- 阅读了全部生产差异及相关调用：记录/关联保存与expectedHash、草稿写队列和修订、五种定义的预览/发布、升级/恢复、资源、人物阅读/纪事、归物生命周期/撤销和只读年度报告、根目录设置确认/失败回滚。没有另行确认新增缺陷。RevisionPanel是只读真实查询；未发现UI新增业务仓库、隐式数据迁移或删除既有字段/动作。此结论有S03/S04明确例外，不声明所有异步路径已通过宿主验收。
- Map22相关scope与owner分工、T05共享strict/date生产者和T06月精度/Tree端口符合现有规划；不把计划中已分配但尚未产品验证的能力当完成。DESIGN/UI-002未因问题被修改，视觉一致性与原生边界仍待Root新E2E及Design Conformance。

### 实际检查

以下均由本reviewer执行，原始输出在/tmp/huhu-t06-high-review；既有author报告只是另列背景：

| 命令/检查 | 实际退出与结果 |
| --- | --- |
| pnpm exec vitest run --project dom src/modules/archives/ui | 0；7文件40测试；module-dom.log |
| pnpm exec vitest run --project unit src/modules/archives/services/generic/workbench.test.ts | 0；1文件3测试；paging.log |
| pnpm exec vitest run --project dom src/ui/components/huhu/date src/shell/panel/SidePanel.dom.test.tsx src/shell/ShellRoot.dom.test.tsx | 0；7文件59测试；shared-dom.log |
| pnpm exec vitest run --project unit src/modules/task/services/calendar.test.ts | 0；1文件5测试；strict-calendar.log；真实service/repository路径，仅外部ports stub |
| pnpm exec vitest run --config /tmp/huhu-t06-high-review/vitest.config.mts | **126**；最终5失败/4通过，共9测试；counters-final.log。五个red分别对应S01–S05；正控制覆盖改变date reset、完整offset两流程、持续挂载discard，picker另在同一反例中证明已selected pin可达 |
| pnpm exec tsc -p /tmp/huhu-shared-module-seams/tsconfig.json | **126**；3项Obsidian vendor声明TS2420（Menu/Modal/PopoverSuggest与HistoryHandler），无本次14路径诊断；shared-types.log。不是通过 |
| pnpm exec tsc --skipLibCheck -p /tmp/huhu-shared-module-seams/tsconfig.json | 0；shared-types-skiplib.log空；只证明指定共享图，不是全仓type pass |
| pnpm exec eslint --max-warnings 0 <34项owned/shared生产源> | 0、0警告；production-lint.log。初次把49项连测试/fixture一起传入，退出0但有15条已配置忽略警告（focused-lint.log），未把被忽略项算作lint通过 |
| validate-specdev.mjs --stage tickets --repo 当前repo 当前change | 0；0errors、1条既定conclusion-report提示；tickets-validator.log |
| validate-dispatch.mjs --stage dispatch（当前TASK） | 0；errors=[]/warnings=[]；dispatch-validator.json |
| 自有56项及模块/共享baseline逐字核对 | drift=[]；initial-/final-verification.json、manifest.json、shared-baseline.json |

067作者记录40DOM/3paging、architecture0；其全仓类型383项/119文件、OWN0和Home appearance golden23/24（一项expected eye-care、actual system/source/accent/density/uiSize/motion）如实保留为作者报告，不将未独立重跑项改称本reviewer通过。其T06 runner只做preflight，0执行/66计划、2611inputs，不能当产品E2E。Root正在固定输入上运行新的native/完整矩阵；本review未重跑已接受T03/T04的完整66、未build资产、未写styles/main。DOM测试不证明物理命中、真实Obsidian popout、vault窗口或插件启停。

## 问题与下一步

五项具体问题与相应规范缺口交还Lead：S01由共享日期producer按精确scope修复；S02–S05由档案owner修复，避免跨owner写源。所有输入已明确释放，不需等待本reviewer进一步确认。保留本不可变报告与原始红测试；修复应同时保留对应正控制，再冻结新输入独立复审。

当前不能据既有绿DOM/type或正在运行的native宣告T06、T05/shared或G-MODULES完成。Root继续持有最终native、视觉/命中、剩余产品集成与全仓债务门；修复这些已确认问题不能通过修改已批准DESIGN、弱化合法输入断言或删除原风险测试关闭。
