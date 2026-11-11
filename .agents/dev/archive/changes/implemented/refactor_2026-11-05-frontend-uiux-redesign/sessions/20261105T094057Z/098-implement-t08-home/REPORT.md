# T08 实施回报

Session: 20261105T094057Z
Task: 098-implement-t08-home
Status: completed

## 聚焦交接

实施者 native:/root/implement_t08；按已分配sol medium实施，未委派、未提交/推送。**实现候选已冻结，等待独立high双轴审查及Root真实视觉/宿主验收；不推进Ticket或正式Evidence。** 当前候选覆盖18 widgets + 14 sections及其既有配置/记录能力，沿用真实BoardStore/SyncEngine、react-grid-layout/dnd-kit、TaskViews、ProductCalendar和共享日期族。源入口仍是DashboardPage→ThemeBridge→BoardCanvas→TileFrame/Section，无新业务仓库/schema/API。

本次真实dirty baseline 246文件原字节/模式保存在/tmp/huhu-t08-implementation/baseline/与baseline.json；最初git状态在git-status-before.txt。最终candidate/和manifest.json固定249项（含只读日历/未改analytics供比对）；115项差异=108修改+5新增+2删除，完整changes.json与逐文件diffs/；所有原calendar/**字节/模式无漂移。manifest SHA256 **0134504ea061075a9b15da8dc010b2c23cd4875e959c85754a8a05f52d7d30ef**。Root新写的home/ui/i18n.ts不在作者写集/候选归属内；真实DashboardPage与独立BoardCanvas入口均已导入注册。全工作区共享变更不按HEAD冒充本票差异。

完成：问候区；统一常驻标题/菜单卡片；显式编辑/完成/取消移动缩放草稿；空板添加/默认布局；尺寸表与多实例不变。菜单尺寸也进入同一草稿，单栏重排取消恢复本页顺序。真实失败测试证实SyncEngine失败后内存可能已有geometry，因此Done链明确flush，避免相同patch早返回后关闭但没落盘。原移除/撤销、内容删除确认及服务动作保留。

全部共享Button/Select/Checkbox与语义字号/颜色源迁移；移除覆盖共享控件的immersive descendant旧样式；命中区有实际独立尺寸。12个原生date/datetime-local位置迁移；倒计时用DateField+受控time纯分量组合，保留无zone的原本地格式/日期精度，不造epoch/IANA。无效草稿阻保存，设置自动更新受有效性门控；共享范围字段替换私有42格引擎；查询月历复用ProductCalendar。TaskList复用TaskContent，仅标题完成态，metadata不划线。

原生Countdown/Anniversary/Album配置边界保留Modal所属Document和关闭生命周期，内部改共享React表单，保存Promise失败保留草稿；完整背景字段与图片选择保留。删除无调用方的旧AnniversaryDateEditor.tsx与widget-background.ts；风险由实际AnniversaryEditor/WidgetBackgroundEditor、共享DateField和现有领域测试承接。AlbumEditor/LocalDateTimeField/其DOM测试及T08 fixture两入口为新增5项。

## 产物与验证

### 32项映射与设计一致性

批准依据DESIGN revision3/UI-002，digest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66，UX-HOME-1/2、AC071/072。dev/ui Skill已实际读取并用于模块/i18n/日期/Portal/字体/控件/验证边界。业务尺寸、schema、core/platform/services均只读；T05日历源只读复用。现有源码来源注释保留，含PandoraReads/apex-dashboard ac4d2c7 MIT、shadcn、react-grid-layout/dnd-kit既有复用；未引入新依赖或外部代码。

| 表面 | 实际入口（home/ui下） | 保留字段/动作 |
| --- | --- | --- |
| widget clock | canvas/ClockWidget.tsx | 时区、格式、天气配置/刷新/取消 |
| widget calendar | widgets/CalendarWidget.tsx → calendar/**（只读） | 周期笔记、任务、日/周/月与完整月历 |
| widget lunar | widgets/LunarWidget.tsx | 农历、黄历、签文 |
| widget year-progress | widgets/YearProgressWidget.tsx | 年/月/周/日进度 |
| widget countdown | widgets/CountdownWidget.tsx | 标签、本地日期/时间、显示精度、提醒、完整背景 |
| widget anniversary | widgets/AnniversaryEditor.tsx | 公历/农历/闰月、原始时间精度/offset、精度、年度提醒、背景 |
| widget pomodoro | widgets/PomodoroWidget.tsx | 开始/暂停/跳过、正倒计时、活动、标签、设置、统计 |
| widget habit | widgets/HabitWidget.tsx | 添加、勾选、昨日补录、热力、统计 |
| widget expense | widgets/ExpenseWidget.tsx | 收入/支出、金额、类别、备注、补录、类别、统计/CSV |
| widget reading | widgets/ReadingWidget.tsx | 书目搜索/手工、书目信息、计时、进度、结束、统计 |
| widget usage | widgets/UsageWidget.tsx | 配额、provider、刷新、显示方式、缺失依赖 |
| widget quick-actions | widgets/QuickActionsWidget.tsx | 命令/文件/链接/智能体/快速记录配置与执行 |
| widget skills | widgets/SkillWidget.tsx | 目录、选择、提示词、运行、缺失依赖 |
| widget fileSearch | widgets/InputWidgets.tsx | 查询、键盘结果选择、打开、Escape |
| widget recent | canvas/RecentWidget.tsx | 最近笔记与打开 |
| widget nav-recent | widgets/NavigatorListWidget.tsx | 导航器最近记录、缺失依赖 |
| widget nav-shortcuts | widgets/NavigatorListWidget.tsx | 导航器书签、缺失依赖 |
| widget album | widgets/AlbumEditor.tsx | 目录/递归/间隔/转场/高度、保留ratio/focal、图片浏览 |
| section memo | inbox/InboxSection.tsx | 真实收件箱内容、新建/打开/删除、闪念草稿/失败/今日记录 |
| section todo | tasks/TasksWidget.tsx | 真实TaskViews挂载；TaskContent由任务生产者渲染 |
| section sticky | cards/Card.tsx | 标题/正文/任务/文档/图片/颜色/保存/删除 |
| section projects | cards/ProjectCard.tsx | 项目目录、笔记列表/查找/新建、封面 |
| section library | sections/types/LibrarySection.tsx | 来源、筛选、日期范围、排序、分页、多视图、属性/新建 |
| section folder | sections/types/LibrarySection.tsx | 目录来源/包含排除、属性、日期范围、显示/新建 |
| section dataview | dataview/DataviewPanel.tsx | 查询、刷新、视图/排序/分页/日期月历/热力、错误 |
| section pm | pm/ProjectSection.tsx | 根目录/阶段/字段、项目、任务/里程碑、详情/归档/删除 |
| section pipeline | pipeline/PipelineSection.tsx | 阶段/筛选/技能scope、条目/任务/截止日期、移动/归档/配置 |
| section skills | skills/SkillsSection.tsx | 来源、搜索/分页、提示词、运行/配置 |
| section calendar | widgets/CalendarWidget.tsx → calendar/**（只读） | 完整复用T05生产日历与任务动作 |
| section rss | rss/RssSection.tsx | 订阅/OPML、筛选/视图、阅读/收藏/保存、错误 |
| section images | media/MediaPanel.tsx | 目录/标签/日期/分组/排序/分页/预览/删除确认 |
| section videos | media/MediaPanel.tsx | 目录/标签/日期/分组/排序/分页/预览/删除确认 |

完整机器映射在/tmp/huhu-t08-implementation/coverage.json。fixture从同一BUILTIN_WIDGETS/SECTION_WIDGETS枚举32项，主/第二Document均挂载真实DashboardPage与BoardStore/SyncEngine；native记录服务在Store之前就绪，内存vault为受控I/O，真实TaskService/TaskViews/Calendar提供任务与日历。另有empty/loading/unavailable/query-error、3实例配置、全部DashboardSettings/AppearanceStudio、目录状态。ThemeRuntime实际观察所有根/Portal，不靠测试预载。fixture的CDP exercise使用trusted指针/键盘，覆盖1440/390编辑取消、桌面真实磁盘拒绝/重试和卸载Portal清理；**本worker仅执行--check，未执行这些浏览器断言，不冒称视觉/宿主通过。** 无真实用户vault、网络/命令/账号/音频写入。第二Document为iframe，不能代替Obsidian popout。

### 实际命令与结果

- pnpm exec vitest run --project dom src/modules/home：退出0；38文件/257测试通过（dom-final.log）。后续影响仅布局保存/卡片/表单组合，定向增量如下；原风险断言保留，36px旧class断言更新为真实共享令牌；原“无编辑模式”断言换成批准编辑行为。
- pnpm exec vitest run --project dom src/modules/home/ui/canvas src/modules/home/ui/widgets/anniversary-editor.dom.test.tsx src/modules/home/ui/widgets/widget-background.dom.test.tsx：退出0；7文件/51测试（dom-layout-final.log）；统一标题死分支删除后2文件/26测试退出0（dom-header-final.log）。
- 最终pnpm exec vitest run --project dom canvas两个文件、expense/records、widgets/anniversary-editor、sections/library：退出0；5文件/59测试通过（dom-closure.log）。包含真实DashboardPage+BoardStore磁盘拒绝→保留草稿/原磁盘→恢复后Done真实flush保存。初次该新增控制仅将尊重minH=6的结果误期望为3，改成实际合同7后完整通过；没有放松行为断言。
- pnpm exec vitest run --project unit src/modules/home：退出0；61文件/196测试（unit-owned.log）。
- pnpm exec vitest run --project unit src/modules/home test/golden：219通过/1黄金快照失败；收集会话退出126（unit.log），未更新样本。唯一失败test/golden/appearance-settings.test.ts，来自Root已有appearance settings格式/默认值基线差异，本票没有core/schema/样本写入。
- pnpm exec eslint src/modules/home/ui --max-warnings 0：退出0，零警告（lint-closure.log）；后续只删除两个无调用源/改注释/格式。fixture被全局lint忽略，未把忽略冒充lint通过；fixture经runner真实编译。
- pnpm exec tsc --noEmit --skipLibCheck --pretty false：本票图无诊断；全仓仅src/modules/task/ui/TaskEditor.tsx:232 TS7030图外债，收集会话退出126（types-delivery.log）。没有修改该冻结生产者；不宣称全仓types通过。
- node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-08 --matrix redesign --check --out /tmp/huhu-t08-implementation/fixture-candidate-final：退出0，preflight、0矩阵case（fixture-candidate-final.log/result.json）；未跑66。
- 格式化受影响源与fixture退出0（format-freeze/format-closure/format-final.log）。未重建main.js/styles.css，未跑native/host/全仓build或CSS生成；统一产物/样式与视觉检查由Root持有。

隐藏页继续保留草稿/服务状态，暂停查询扫描、相册轮播和媒体订阅；查询异步代际失效，所属Document计时/Portal归实际owner。原store.view generation隔离与切换/删除/迟到创建等现有DOM控制保留通过。

## 问题与下一步

本票候选停止写入，交Root独立high双轴审查。Root需在实际最终输入重建样式/产物、运行T08完整视觉矩阵与真实Obsidian1440/390/独立窗口/媒体及记录动作验收，再维护正式Evidence/state；本报告不替代这些门。已知图外TaskEditor TS7030与appearance黄金快照由原owner处理，不在本票放宽断言或改schema。

所有未执行native/浏览器断言均保持待验收；目前仅DOM/unit/静态源码与fixture编译证据。Root纯UI词典归其本人，禁止本报告被解释为提交/发布授权。过程材料只留/tmp，仓库任务目录只新增此不可变REPORT。
