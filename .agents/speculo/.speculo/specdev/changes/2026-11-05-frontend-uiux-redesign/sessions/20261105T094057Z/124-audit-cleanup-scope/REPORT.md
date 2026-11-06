# T13 实施前只读影响清单

Session: 20261105T094057Z
Task: 124-audit-cleanup-scope
Status: completed

## 聚焦交接

本轮只完成实施前影响清单，不是正式独立review、未启动仍受依赖约束的T13，不给产品通过结论。按真实源确认旧图标入口、hit令牌生产/消费、旧宿主探针与两份旧fixture的准确接缝；TextField日期适配、HU派生字体桥和当前合法状态结构均保留。相同规则在37fcede精确复现原618文件，当前671文件的逐路径归属/新增/删除/字节变化已生成在/tmp；这些不是逐文件验收回执。Root需要先对精确路径补充T13权限和单写owner，再在模块门满足后实施；当前正式66输入没有被本任务修改。

## 产物与验证

全部分析在/tmp/huhu-cleanup-scope-audit；仓库只新增本REPORT。执行过只读rg/文件读取、git ls-files/ls-tree/show/status/diff和分析枚举；没有运行测试、类型、lint、构建、fixture --check、66、真实宿主或git写入，也没有生成源码/文档/guard候选。

### 1. 旧入口、状态与设置边界

- src/app/contracts/workbench.ts:12/31/49：WORKBENCH_FEATURES仍有icons、FEATURE_MODULES仍有icons，iconSettingsTarget是明确的旧入口兼容映射。src/app/workbench/compose-workbench.ts:6/262–275仍导入并贡献icons重定向/旧create分支。最小生产写集就是这两文件；保留icons模块、ICONS_SERVICE、settings/iconic与其六个iconic-*资源页。
- src/shell/navigation-state.test.ts:10/50–64仍直接测试iconSettingsTarget；需迁成“当前settings/iconic + resourceId/focusId直接路由”和“旧icons feature不接受/不重定向”的正负控制。此测试不在T13当前writable里，必须补精确路径。contracts/workbench.ts:78的NavigationItem.aliases只有声明、app/shell无生产消费，可在同文件核对后清掉死形状；不是删除笔记属性aliases的理由。
- src/app/contracts/workbench-state.ts:30–94已经只读huhu-workbench-ui/1的route/navigation{width,open,lastRoutes}/mode/pageViews；src/shell/navigation-state.ts只是重导出，没有发现旧target/focus/panelOpen/panelWidth/lastTargets封套解码分支需要重写。src/app/contracts/workbench-state.test.ts:12起已经有旧字段不读取的负控制。panelWidth函数是当前合法220–480夹取；SavedPage.target、WorkbenchView.focusMode、focusId也是当前功能，不能按词名删除。
- 当前设置路径src/app/workbench/settings-page.tsx:40–44验证真实category；settingsCategories + PRODUCT_MODULES中的iconic→icons、versioning→versioning是当前模块映射，非旧页回退。icons/ui/settings-page.tsx:23验证resourceId并默认iconic-general，属于保留的新设置页行为。app/settings/appearance.ts:4–13只接受huhu-appearance/version2，无v1导入分支，本轮没发现应恢复/删除的旧生产设置解码。
- 旧settings类别sync实存于scripts/obsidian-acceptance/workbench-probe.mjs:94与overflow-audit.mjs:399；必须改versioning。BuiltInSettings的feature文案key sync、statusBar.segments.sync、huhu-sync-page内部Surface标识及Git操作名称仍可能合法，禁止全局sync替换。

### 2. 令牌、selector与日期守卫

- --nd-hit-size不是dead：src/ui/styles/base.css:2生产别名，29/30/38/43/45–48消费，50再定义coarse；src/ui/components/scroll-area.tsx:30/54/55消费viewport padding与横纵滚动条。需两文件同批迁到已存在的--hu-hit；tokens.css已经有fine32/coarse44生产者，不能只删base定义。Root需统一生成Tailwind/styles产物；对局部--hu-hit覆盖和coarse滚动条验证真实计算值/独立目标，而非仅判断字符串已无旧名。
- base.css:72–81的native picker规则仍包含date/datetime-local/month/week旧selector，但time仍活跃：SchedulePicker.tsx:133、LocalDateTimeField.tsx:61、CalendarAgenda.tsx:294，以及PipelineCard/ProjectBoard经TextField的纯时间输入。可在已有base.css写集中收窄无消费者selector并改说明，不能删整条时间适配。dashboard-*上游选择器/board-*派生适配有真实调用与来源，不按前缀当dead CSS删除。
- --nd-font-sans/mono由tokens.css:39从--hu-font-ui/mono派生，消费在ui/tailwind/index.css、sonner.tsx及既有host-font探针/测试；UI技能明确允许，保留。不能用禁--nd-*的粗守卫误伤字体桥。
- 本轮直接原生date只定位到src/ui/components/huhu/analytics/Analytics.tsx:71/81两处Input，已归123，不接管。PipelineCard.tsx:235的TextField type=date进入sections/P1Controls.tsx:86的DateField分支（含draftValue）；skills/PromptField.tsx:27同样已有DateField分支。navigator/core/search/parse.ts的type:'date'是领域token，CSS属性selector也不是原生JSX输入。
- 建议新增test/guards/frontend-cleanup.test.ts（当前权限已容纳新test/guards/**）：用TS AST识别小写input、真实Input导入及其别名上的date/datetime-local字面属性（含JSX表达式），跳过已确认DateField适配的TextField/领域对象；守卫有正负例，动态spread/type不能默认为安全。另精确禁止生产iconSettingsTarget/旧icons feature入口、--nd-hit-size、src中的@codemirror/merge；不要粗禁所有target、sync、aliases、type=date字符串。该路径目前尚不存在；本轮未写guard代码。
- src/modules/versioning/core/hunk-restore.ts:39仅剩@codemirror/merge来源注释，算法已经接收HunkDiff，实际hunk-proof.ts从Pierre FileDiffMetadata构造范围。只需改注释为当前范围边界/EOF夹取合同，不动算法；T13现将modules/**列只读，需Root加此一行说明的精确例外。

### 3. 旧fixture与失效宿主probe

- legacy-fixtures.json逐一静态核对20份顶层T-*.tsx：相对源码import没有缺失，扫描未见旧Button variant/size字面值；唯一明确的现API调用缺口是T-34.tsx:128和T-35.tsx:143。
- T-34须为mountCommentsPanel提供真实内存EditorContextAccess与初始visible，保存EditorPanelHandle并dispose；T-35对mountNoteHistoryPanel传initialVisible并调用handle.dispose。只改这两tsx已足够消除已确认调用不兼容；mjs driver目前无需为本问题扩写。保留原exercise/cleanup断言；当前runner仍明确支持legacy suite，不能直接删除20组旧fixture或把其旧同号当redesign票据覆盖。
- 实际旧feature入口共7份宿主脚本：workbench-probe.mjs:57、navigator-notes.mjs:220、overflow-audit.mjs:405/433、workspace-refinement.mjs:61、vault-storage.mjs:44、sync-autostash.mjs:17、sync-clone.mjs:68。icons改settings/iconic并将旧section变resourceId；sync feature改versioning。sync-clone.mjs:41/42的data-feature=sync也失效，应跟真实Rail标识；shell/page/rail的当前data-shell-region与data-rail-button仍存在，不做无依据selector重写。
- 不止这7份：legacy-seeds-map.json列出35份obsidian-acceptance脚本的精确path、line、原文，均仍以modules.sync或MODULES含sync构造开关种子。当前app-schema按MODULE_IDS逐项读取，versioning默认开启，忽略sync:false可能无意开启版本模块；versioning/module.ts:32绑定的namespace也是versioning。需逐处把模块开关及确为版本设置的namespaces.sync改当前名，保留CLI场景名、状态segment id和内部Surface名等合法sync语义。
- 这35条准确路径（连同两fixture）已列proposed-scope.json，不建议用scripts/**泛写集。未来先语法/类型/编译检查，Root再按受影响的临时vault宿主任务验收；本轮未执行任何probe。

### 4. 文档真实差异与来源

以下7份维护文档/开发参考均已在T13可写清单中：

- docs/comments.md:13与dev/references/editor-comments.md:55–56：gutter已是非交互状态图像，不再悬停/点击添加；精确动作由当前命令、panel和高亮浮层承担。editor-comments.md:53还须同步mount(container,documents,visible)→EditorPanelHandle，说明独立root隐藏暂停/恢复与dispose。存储v3、锚点、恢复协调和来源原文保留。
- dev/references/build-and-release.md:34：删“打包@codemirror/merge/单diff-model Worker/只有一个React入口”的过时事实；当前是一个esbuild主入口、多个所属容器React根，Pierre shiki-js高亮Worker与parse Worker两图，gzip内嵌/fflate解压，统一语言策略及多图metafile许可。实际依据scripts/versioning-worker.mjs、diffs-languages.mjs、third-party-notices.mjs:20–25与diff/workers/owner-pool；保持来源、Apache/MIT/OFL等原始许可链，不简化成一个Worker被主图扫描覆盖。
- docs/sync.md:55/57/91/259：CodeMirror比较和本地历史/精确hunk恢复“后续阶段”已过时，hunk级暂存也不再是“不包含”。应写当前Pierre比较、A/B端点、自动本地历史、按块/行领域恢复与保真回执；仍未做的blame/分支界面/子模块等继续保留边界。保留obsidian-git原始来源URL与许可，补当前差异实现的既有Pierre来源定位。
- docs/workbench.md:13/17/39等：补日记与体检/任务实际页面、删除icons旧链接别名行；Panel是默认272、220–480，不是280/220–500；按真实leaf宽分段。保留“Obsidian导航器左侧栏”与“navigator/diary工作台页”区别；自动化无二级栏但有列表+右详情/新建和运行路由，依据AutomationsPage.tsx:469及其真实路由补写。
- docs/design-system.md:7–13：明确paper/ink独立HU语义、source=huhu/obsidian与派生适配，DetailPane/DateField族和所属Document约束；不要继续说界面总是从宿主颜色派生。
- docs/architecture.md：更新当前huhu-workbench-ui/1封套与编辑器贡献handle/隐藏生命周期的事实/链接，保持域服务与数据归属、懒加载、native边界。只补当前事实，不改永久ADR/context、不把维护文档变为新的设计权威。

### 5. 618清单的实际差集与覆盖接法

- inventory-enumerator.py仅在/tmp，按“全src非测试TSX/CSS、所有ui目录及theme/shell与指定app范围TS、明确onboarding TS”重建基线，得618，和原inventory集合差集均空。当前671=346原路径字节修改+265原字节未改+60新增；原618另有7删除，即346+265+7=618。inventory-map.json逐行有path、原owner/新增主owner、Git基线/当前tracked、分类、当前SHA/mode、未逐项验收标记；SHA256=16c4bb75bcc1941c71891f50a58aaeaa38a3ac88cd76ecca9e54b101dbac5666。
- 60新增的主票归属：T04 1、T12 1、T09 2、T06 2、T07 4、T11 3、T05 6、T08 5、T10 1、T16 18、T02 9、T03 8。每条准确path都在inventory-map.json；目录推导的primary ticket还需Lead核对共享生产者/单写writer，尤其新增ui/i18n仍为Lead单写。不能按60这个总数代替逐文件绑定。
- 7删除后继在deleted-successors.json：Home AnniversaryDateEditor→AnniversaryEditor、widget-background→WidgetBackground/WidgetBackgroundEditor（098明确无调用方删除）；Calendar TaskEditorForm→真实task/TaskEditor与TaskComposer/openEditor（T05）；T16四个旧diff编辑/model/worker源→diff/MultiDiffView、parse/hunk-proof、workers/compressed-asset、parse-worker及Pierre高亮Worker。保留原删除证据，不恢复旧CM链。
- 原规则不含测试、core/services/API、打包脚本、资源及shared词典；Root六源visibility/API、contracts/workbench-state.ts、shared/lazy/huhu-ui和两个Worker/许可图须作必要补充回执，不错误计入671或当作“没有变动”。补充只读路径见proposed-scope.json。
- 目录覆盖必须再连三条真实注册链：①widget-table.ts的18 BUILTIN+14 SECTION共32项→canvas-model/TileFrame/WIDGET_COMPONENTS与实际section渲染→T08 fixture同registry枚举/每项状态回执；不要只数12个SECTION_TYPES或21个WIDGET_COMPONENTS键，后者含业务别名，不在T13随手删。②settingsCategories/PRODUCT_MODULES当前9模块设置产品+General/Appearance/About及可选gallery，配各module.settingsPage和真实设置索引字段；task/health/notifications没有独立settingsPage不等于漏类，模块开关仍在General。③compose-workbench当前14个contribution（icons清掉后13），加三个宿主view及COMMENTS_PANEL/NOTE_HISTORY_PANEL/NAVIGATOR_PANEL独立装配，分别绑定所属报告与fixture。
- 可复用报告均真实存在并有SHA导航：reports.json共24条。T05 094/111、T06 078、T07 093完整+101旧finding/105修复、T08 104完整+113修复（098另有32项coverage定位）、T09 103完整+111窄修复、T10 109完整+115修复、T11 097完整+101窄复验、T12 081/083/089与122同store夹具闭合、T16 095与105焦点增量；共享01–04和T15也列实际报告。request-changes历史不能被改称pass；只沿其后续固定输入修复回执有界复用。Root正在跑的最终66与123未完成日期修复不被本报告认证。

## 问题与下一步

精确建议写集在proposed-scope.json：worker 11路径（两生产路由源、navigation-state.test、新guard、上述7文档）；Lead独占inventory/coverage正式投影2路径；Root共享40路径（base/scroll-area、hunk-restore注释、两旧fixture、35宿主种子/路由probe）。除已有路由源/docs/guard授权外，至少41路径需要T13补精确权限/owner；modules/**只读规则还需给hunk-restore注释单独例外。scripts/verify-architecture.mjs仍Root独占，目前未发现必须改动的理由；新增test/guards会被既有unit glob收集，不需要为此改package.json或vitest配置。

实施后最小验证建议（本轮均未跑）：

- 路由/当前设置：新guard、shell/navigation-state、contracts/workbench-state、compose-workbench、settings/nav与icons-settings定向测试，类型/架构；验证settings/iconic直接入口保留、旧icons不再解码回退。
- hit迁移：Root生成样式，lint:css/test:styles及真实scroll-area的fine/coarse计算宽高/viewport padding和所属Document命中；保留native time选择器与字体桥控制。不是为清理字符串而加兼容shim。
- T34/T35：独立类型/编译或--check只能记录预检，保留实际cleanup/visibility再由Root验收；不能据此报告浏览器通过。35probe先node --check，再由Root选真实受影响临时vault流程，不运行用户vault。
- 文档：pnpm test:docs；hunk注释只改事实，不为此重跑无关Git领域矩阵。覆盖：重枚举同规则、逐文件原/新增/删除后继+owner报告/检查/状态映射，全部settings/32kind/contribution有真实回执；265 unchanged不自动变成已复用通过。
- 正式T13仍等待模块依赖与Root正在进行的门，之后再实施/审查；UI技能及永久知识不在普通T13写集，若约束漂移回原T15/A owner。最终产物、整体构建/lint、66与真实宿主由Root/T14统一处理。
