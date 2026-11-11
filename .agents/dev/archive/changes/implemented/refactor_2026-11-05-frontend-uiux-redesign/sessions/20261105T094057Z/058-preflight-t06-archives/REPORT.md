# 任务回报

Session: 20261105T094057Z
Task: 058-preflight-t06-archives
Status: completed

## 聚焦交接

native:/root/implement_t01，既有 medium，只读预检，未委派。没有启动T-06、写实现/私有patch、安装依赖、运行浏览器或改状态/Skill/资产/Git。T-06仍须T-03、T-04、T-15门；当前T-04的057及Root完整66由Lead判断，052仅是T-15预检，不能冒称新UI Skill已实施。Map17仅新增T05→T10，不改变T06依赖。

全范围可在模块UI与现有命令上替换，不能按原型少数字段缩票。两项生产者接缝须在实施授权前落实：**Lead拥有的SidePanel受控、有界、按叶隔离展开及加载更多呈现；archive日期月精度/offset datetime与共享日期族的真实映射约束**。后者当前没有可调用的archive IANA解析端口，不应伪造validateValue成功或跨模块导入task/automations core。

## 产物与验证

### 已核实入口、数据和调用方

- `src/modules/archives/module.ts:103`懒加载`ui/generic/workbench-page.tsx`；`GenericArchivesSurface`一个ReactSurface管理类型/视图/记录、designer、recovery及归物分支。`ArchivePageState`保存有界section/selectedId/search/offset/layout/filter/sort/states/scroll；`navigate`有generation、AbortSignal、离开guard与列表scroll恢复（workbench-page.tsx:111–155）。替换布局需保留这些导航/生命周期端口，不另建页面根或私有store。
- `api.ts`提供ARCHIVES_WORKBENCH/CATALOG/QUERY/COMMANDS/ARCHIVE_RESOURCES；catalog/query返回entityRevision/schemaRevision、isComplete、diagnostics；beginEdit返回FormSession及baseHash/baseValues/schemaRevisionId，save/create及关系/定义/升级命令返回committed receipt或拒绝。`services/generic/application.ts`持有既有runtime/entities/relations/definitions/recovery/personJournal；UI只订阅与发动作。
- `compose-workbench.ts`消费ARCHIVES_WORKBENCH；task经ARCHIVE_RESOURCES选择/打开档案，home消费ARCHIVES_QUERY；health通过公开repair/service key集成。`GenericArchivesHost.newReminder`保留自动化composer与contacts wire name。此次不需要改这些调用方或public API。
- 实体、不可变定义修订、独立关系、升级备份/回执及附件在可见档案根；恢复FormSession仅在`.huhu/archives/drafts/<设备>/<根摘要>/`。来源：docs/data.md:31–32、83–84及docs/contacts.md“新建、编辑与草稿”。UI不改Markdown/YAML格式、路径、哈希及三方合并，不把纪事内存草稿当实体恢复草稿。
- `ContactsSettings`（shared/contacts-settings.ts）仅rootFolder/maxColumns5|6/layouts list|card；settings-page.tsx先规范化目录、计数预览/确认、等待queue再更新并reload，失败回滚设置。需保留，不因换视觉改变目录或持久偏好。实际archives/API/core/settings、workbench contracts及当前src检索无`sharingScope`字段/端口，不能新增共享开关/声称档案已有分享策略。

### 全部UI/动作覆盖与拟替换边界

| 现有路径 / source anchor | 保留行为与新组合 |
|---|---|
| generic/ArchivePage.tsx:175、page-state.ts | 类型及保存view、search/字段和关系筛选、all/any嵌套/比较、排序、draft/active/archived、同一查询table/card、50条分页/total/incomplete、创建模板、恢复draft、打开原始note、归档impact确认、显式upgrade。用共享Table/Badge/SegmentedControl/Notice/EmptyState，不重写查询解释器。 |
| generic/RecordEditor.tsx:22–146 | 同一FormSession切多form；missing/null/空值/false/0；dirtyFields、串行草稿写入后commit，真实create/save、错误字段聚焦、冲突保留、cancel/discard与离开确认。底部未保存条不能重挂输入或改焦点；保留现有“保留恢复草稿后离开”语义，不误删draft。 |
| generic/RelationPanel.tsx:33、177、396 | 目标稳定ID选择/搜索（当前50条需明确结果界限/继续查询）、允许类型、先建目标再关联、双向同一relation、角色contextRefs、生命周期/validFrom/validTo、独立schema、draft/recover/三方冲突、archive。失败不得删除先创建目标。 |
| generic/DefinitionStudio.tsx:39/113/268/430、FieldDesigner、QueryBuilder | 五种definition：type/form/template/relation-type/view；稳定id/storageKey/翻译label、自定义字段/选项/子表、条件可见/只读/1–3列、多form、defaults/body、关系方向/基数/重复/自环/无环/context roles；父修订/head/fork、preview影响/fingerprint后publish，显式upgrade。没有原型演示不能删除分支。 |
| generic/RecoveryPanel.tsx:19/57/149 | diagnostics路径打开、升级预览与prepare/resume/rollback、部分提交/失败/incomplete；保留真正owner操作，不把扫描当授权提交。 |
| generic/ArchivePage.tsx:34 Resources | 实际附件发现、名称/路径搜索、60条分页、新建资源笔记、批量文件导入（每项部分成功/失败）、实际owner window打开；资源不是entity属性副本。现有UI无全库通用“导入/导出实体”命令，不按原型增加虚构操作。 |
| belongings/BelongingsPage.tsx、report/BelongingsReport.tsx | KPI按币种、状态using/idle/sold/discard、年/名称/时间排序/搜索、card/detail、通用editor入口、预设install、transition日期/退出日/转售金额、五分钟同owner条件undo/冲突；年度购入/退出/月趋势/分类/持有分布、unknown与0、旧报告+旧年份在刷新失败时保留。报告当前只读，无导出主库。 |
| person/PersonReadingPage.tsx、PersonOverview、PersonJournal | 仅稳定预设人物ID的overview/profile/relations/journal，企业/同名自定义类型仍generic；头像、最近3条纪事、关系target-ID；journal日期/title/content/relatedEntityIds/rowId、增改/确认删除、内存dirty guard、显式旧schema升级、自定义schema拒覆盖；读失败/reload保留草稿。 |
| settings-page.tsx、ArchiveCardGrid.tsx、generic/common.tsx | 目录预览/应用、maxColumns5/6、类型/视图layout；移除旧outline/default/link变体、--nd-hit-size和全局“所有button h-auto”等局部覆盖，采用新组件/token；保留标签/ARIA/IME/异步pending错误。旧通用Select/Check/Section只是薄UI包装，改成唯一共享原语组合，不复制键盘/日期引擎。 |

批准来源为DESIGN revision3 §3–7、archives UX-ARCH1–3、Spec AC051–053、frontend-coverage档案行；原型`UI-002/final/app.js:1045–1234`展示type→record、views/management、table/card、dirty底条、人物/归物/设计器。其原型删除移回恢复中心/复制记录等演示与当前真实domain未提供的命令不能直接兑现，更不能因此删除现有完整relation/recovery/field分支。原型Air Datepicker仅视觉演示，生产继续唯一DayPicker日期族。

### 字段与日期合同

`core/schema/model.ts`及`fields.ts:6–155`为唯一领域权威，`FieldRendererRegistry`确有13种。实施验证须枚举，不仅测text：

| kinds | 精确保存/约束 |
|---|---|
| text / markdown | string原文，电话前导0、换行保留；不执行内容 |
| integer / decimal | 有限number；integer安全整数，非法临时输入保留为draft后由domain拒绝 |
| money | `{amount: 十进制string,currency:三位大写}`，不转浮点/不把unknown变0 |
| boolean | false与missing/null区别 |
| date | `YYYY-MM`或`YYYY-MM-DD` string，field.precision month/day/mixed；不可补1日或经UTC转换纯日 |
| datetime | 明确Z或±HH:mm的ISO string，允许秒/1–3位小数；不是epoch，也没有存储IANA zone。现有codec验证合法日期/时分秒/偏移及Date.parse，**不做IANA DST消歧**。 |
| select / multiselect | option稳定ID用于UI、保存option.value；历史archived option保留解释，禁止新增已归档选项；多选唯一 |
| strings / file | string数组及可选uniqueItems；安全vault相对文件引用，缺失保持原文+diagnostic，FuzzySuggestModal来源窗口 |
| table | ≤10000稳定rowId及values、递归列校验，删除一行不改其他row身份 |

跨字段必须保留missing/undefined、null、空string/array、0/false、required仅active、archived字段不可改、readOnly、visibleWhen不清隐藏值；归物BELONGING_FIELDS在presets.ts:198被form标readOnly，投影由生命周期owner生成；id/schemaRevision/hash也不能可编辑。关系PrecisionDate另为`{value,precision}`，仍月/日，无时区。

T03 `huhu/date/index.ts`已交付DateField/DateRangeField/DateTimeField；DateField只接受完整CalendarDate或null，DateTimeValue为`{date,time(HH:mm),timeZone:IANA}`、必需validateValue领域端口及initialTimeZone（DateTimeField.tsx:10–20），不负责epoch/DST转换。当前archives没有IANA转换器，不能导入其他模块core；T05/T07的域DST授权不自动授予T06。最小可确定迁移：day日期用DateField，关系day包装/解包、journal及归物流转用原纯日；month/mixed保留明确月精度编辑控件（共享Input/FormField +原codec），不能强送DateField。datetime必须先由Lead/域owner确定保留offset/秒精度的映射：固定UTC显示可避免DST但现有DateTimeField允许编辑zone且仅分钟，不能静默舍秒/偏移；若支持IANA，需真实公开转换/候选消歧端口及相邻测试/权限，不能写()=>null。未锁定此适配前不宣布日期迁移ready。

### 共享接缝与最小权限请求

1. `services/generic/workbench.ts:66–119`当前仍发已删folderClick、defaultExpandedIds全部类型、每类型limit500；API/Tree不接受folderClick。`core/generic/query.ts:32`单次limit上限500，index.ts:369–416已支持offset/limit/total/stable ID排序，**无需放宽core或一次拉全库**。workbench.test.ts尚不存在，T06已授权可新增：501/1201记录分批加载、最后一页、revision变化/删除、错误/未完成及重试。
2. 最小Lead共享写集：`src/app/contracts/workbench.ts`的PanelTree/PanelModel，`src/shell/panel/SidePanel.tsx`及其相邻DOM测试。当前PanelTree只有defaultExpandedIds/target/select，SidePanel:314直接无受控Tree。建议SidePanel拥有按叶/模型身份隔离、上限+去重+只留现存branch的手动expandedIds，传Tree的expandedIds/onExpandedChange；不要在singleton ArchivesWorkbench中保存跨叶共享展开。Tree已实现搜索临时祖先展开、清空恢复、title选中/chevron展开、键盘/typeahead和TanStack Virtual，直接复用。
3. module分页模型建议显式`tree.pagination?: {loaded:number,total:number,loading:boolean,loadMore:()=>void|Promise<void>}`（若每类型独立需带typeId的数组/节点动作），错误仍走已有report/Notice；模型subscribe发更新。具体签名由Lead确定，不能让“继续加载”冒充record目标/键盘导航或仅增加render阈值。全库搜索必须明确是已加载过滤还是域query结果，并保留完整总数/可继续加载；不能仅搜前500便宣称无结果。扩展共享producer的测试权限尚未列于T06 frontmatter，需Lead补精确路径。不需要改所有shell或new store。
4. i18n只有`src/modules/archives/i18n.ts`为Lead共享；`contacts.*`与`archives.*`同文件已有键尽量复用，建议新增en/zh键职责：tree.loadedCount（已加载/总数）、loadMore/loadingMore/loadFailed/retry；pendingSave/unsaved/save/discard/keepEditing；monthPrecision/offsetTimestamp/unsupportedTimeZone（仅实际适配决定后）。`ui/belongings/report/report-i18n.ts`在UI写集内，可保持现有report域键；不擅改shared/i18n/main。
5. DetailPane必须显式leafWidth；使用`useLeafMetrics(owner)`实际logical leaf element/width，父main可用宽由DetailPane测量；leaf≥960且main≥1000 inline，leaf<600全叶宽，其余360/440。Date popup传collisionBoundary=logical leafElement，不能用Dialog portal viewport推断leaf。同一editor child跨aside/Sheet保留草稿、selection/scroll；dirty确认与页面已有async leave guard必须单一决策，不能双重确认或忽略保存失败。
6. 现成FormField只克隆一个labelable element，money/table/多选group需fieldset/legend或现有ARIA组，不把div误装成labelable控件；Notice承接error/status/retry，TaskContent只在真实任务式摘要适用，不强塞每条档案。现有Table header36/body44或52、Tree row32/36及coarse44、虚拟化密度估算已由唯一组件交付。resizable v4 wrapper仅若页面真需可拖宽layout才用orientation、百分比string等新API，不另建内部分割器。

### 实施后的验证次序（本次未执行）

1. 先将当前workbench500截断与未受控展开写成红灯；producer test覆盖两叶互不污染、删除后prune/上限、搜索期间操作+clear恢复。服务测试>500连续加载/总数/重试/修订变化，虚拟行少于总量仍能定位最后条，不能仅断言array长度。
2. 保留/扩展archives DOM所有文件：13字段枚举+递归table/missing/null/false/0/月/offset秒；RecordEditor多form同draft、焦点稳定、底部dirty、冲突恢复；RelationPanel两端/先建后失败/roles/precision；designer五类定义preview/publish/heads；person/belongings/report/settings全分支与abort/late error。旧测试若改选择器需逐项记录风险转移，不删回归。
3. 风险回归命令：`pnpm exec vitest run --project dom src/modules/archives`；`pnpm exec vitest run src/modules/archives/services/generic/workbench.test.ts`；`pnpm exec vitest run test/golden`（archives-v2.test.ts锁前导0、月、false、精确金额/Markdown、归物生命周期、journal；archive-relation.test.ts锁独立关系）；按触及运行services/generic、schema、belongings lifecycle/statistics、personJournal与safety-regressions。已有对应原测试事实不当作本次执行通过。
4. 新T06 fixture目前不存在，生产导入actualUI+真实in-memory domain port，不写另套demo。沿唯一runner/严格adapter，在1440/390覆盖全部prototype状态和真实管理子页，额外leaf620/main568、leaf580/viewport1440、两个Document、normal/reduce、en/zh、fine/coarse、320/zoom2；真实Tree chevron≥44/四边focus/内部鼠标触摸、键盘菜单/Date popup/IME/两层Esc、dirty焦点、分页最后条、实际用户wheel后adoption/隐藏保留。避免T04旧无条件向下wheel到底陷阱；先真实负wheel+scrollend回top再positive，不程序赋值冒充用户意图。
5. scoped类型/lint/架构/i18n/CSS与Lead统一构建；原全仓旧variant/native-date错误为待迁移债，不能宣称全局绿。新T15 Skill完成后重新读取绑定，独立双轴high→Lead冻结E2E；真实Obsidian主窗/popout/关闭模块清理、原生未保存note写保护仍需宿主门。

## 问题与下一步

本次仅文档/源码事实查询，未运行插件测试/构建/原生探针；不存在“新代码通过”结论。没有用外部新库方案，复用已安装/验收的Tree、日期族与共享overlay合同；现有第三方署名留原处，本次未重新联网核验历史来源。

Lead后续先结束T04门、完成T15与绑定刷新，再冻结T06实施TASK。补精确shared producer测试/contract权限，并决定month/offset datetime保真适配；不要为了清类型删除字段或把IANA无端口隐藏成成功。除此之外现有T06 UI/** +workbench服务/test+fixture写集覆盖页面替换，无依据申请core/entities/recovery/runtime/持久化修改。预检没有改变Ticket owner/status/DAG，054/051冻结报告与生产输入保持不动。
