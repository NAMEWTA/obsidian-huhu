# 前端覆盖与实施责任（revision 4）

设计规则唯一来自 DESIGN.md。本文件是源码 → 表面模板 → Ticket → 验证的索引，不再定义独立视觉值。初始清单以 frontend-inventory.json 中记录的 Git 基线 37fcede 为准，不将“12 个顶级页面”当作全部前端；实施期间新增、移动与删除的源码在各票留证，并由 T-13 汇总更新。

`frontend-inventory.json` 保留原 **618 个非测试前端源码文件**，当前同规则为 **671 个有效路径与7个删除条目**（347修改、264字节未改、60新增），每个文件只有一个主 owner；源码清理/最终回查属于 T-13。字段、状态、业务动作来自对应领域 API/schema；所有原有字段均须经共享组件重绘。原型显示代表布局，不能据此删除未画出的功能。T-01 建立 runner 后，模块票逐表面补 fixtures 与实际回执，设计阶段的 planned 不等于生产通过。

| 表面 | 源码范围/来源 | Owner | 原型/模板 | 必须覆盖 |
|---|---|---|---|---|
| 全局主题、字体、CSS 生成与启动桥接 | src/ui/styles/**；src/theme/** | T-01 | tokens；settings/appearance；notes | 主题/对比度/窗口卸载；保留正文外观能力 |
| 共享组件、弹层、树、设置行、命令、选择器 | src/ui/components/**；src/ui/react/** | T-02 | DESIGN §5/7；各页共享模板 | normal/disabled/busy/error；嵌套层/焦点/ARIA；日期与日历排除另归属 |
| 日期族与全部日期使用点 | src/ui/components/huhu/date/**；日期输入所在调用方按模块票 | T-03 | datefield/range/time | 非法/必填/清除/时区/DST/所属窗口 |
| 外壳、状态栏、Ribbon、命令与路由 | src/shell/**；src/app/workbench/** | T-04 | 所有页骨架 | 叶子 320/390/600/820/960/1100/1440；无二级栏窄屏导航；能力过滤 |
| 内容树、新笔记、欢迎、设备选择 | src/app/content/**；src/app/intro-*；src/app/device-choice.ts | T-04 | settings/content/onboarding/device-choice | 空/加载/失败/取消；路径冲突；模块禁用；来源焦点 |
| 任务列表/看板/详情/重复规则编辑与日历 | src/modules/task/ui/**；src/ui/components/huhu/calendar/**；src/modules/home/ui/calendar/** | T-05 | tasks/* | 日期/状态/关联投影；保存竞态；取消/失败/重复任务 |
| 档案类型/记录/归物/人物/设计器/年度报告/恢复中心 | src/modules/archives/ui/** | T-06 | archives/*；record/list/editor/restore 模板 | 分页/搜索/动态字段/导入/冲突/历史/恢复；不遗漏档案管理子页 |
| 自动化列表/新建/模板/编辑/全部运行/单次运行/设置 | src/modules/automations/ui/** | T-07 | automations/* | 列表常驻；Switch 回执/竞态；草稿/运行日志/缺失实例 |
| 首页 18 widgets + 14 sections 全目录及编辑器 | src/modules/home/ui/**（排除 calendar）；core/board/widget-table.ts 只读来源 | T-08 | home/default/editing/widgets/widget-config/widget-error | 五类卡片模板；每项原字段/动作逐个适配；布局/重复添加/大小/拖拽/键盘 |
| 首页收件箱、闪念、便笺、习惯、记账、阅读、番茄钟 | home/ui/inbox,notes,habit,expense,reading,pomodoro 等 | T-08 | home/inbox；记录表单模板 | 捕捉/处理/校验/失败/空/撤销能力；不得跳到系统通知替代 |
| 目录/资料/项目/Dataview/流程/RSS/媒体 | home/ui/sections,library,pm,pipeline,rss,media,dataview 等 | T-08 | home/widgets 五类模板 | 来源配置/依赖缺失/安全外链/媒体失败/分区拖拽；现有功能全保留 |
| 智能体会话/空间/历史/用量/收件箱/账号/技能/命令/备份 | src/modules/agent/ui/**；src/modules/agent/styles/** | T-09 | agent/* | 定位终端；指定收件人；账号/CLI 状态；备份恢复预览；终端生命周期 |
| 日记、导航器、多周期/双栏/缓存与设置 | src/modules/navigator/ui/** | T-10 | diary/*；notes；settings/navigator | 日/周/月/季/年；搜索/选中/日历/空日期；原周期路径合同 |
| Git 更改/暂存/提交/历史/比较/接入/同步 | src/modules/versioning/ui/**；styles/** | T-16 | versioning/changes/history/compare/compare-same/hunk-staged/line-select/conflict-file/diff-unified/large/setup/clone/remote/author/conflict | 端点正确；改动块暂存/还原/取消暂存；冲突三选一；A/B 任选比较；首次上游；取消/认证/冲突/索引锁；二进制/超限/缺失 |
| 差异引擎与打包 | DiffView/CompareEndpoints（versioning/ui/diff/）；scripts/versioning-worker.mjs；scripts/diffs-languages.mjs | T-16 | DESIGN §3.7/§5；UI-002 versioning 全部差异状态 | `@pierre/diffs` 主题映射；语言白名单；Worker 所属窗口与释放；启动闭包与 NOTICE；移除 `@codemirror/merge` |
| 本地历史/笔记历史/独立比较/恢复/撤销 | versioning UI（T-16）+ app/editor-panel/panel-host.tsx 宿主外壳（T-10） | T-16 | versioning/note-history/diff/revision-review/stale-review/restore-confirm | 笔记历史 A/B 任选；源叶/正文/HEAD/index 指纹；多窗口；暂停同步；恢复副本与回执 |
| 批注列表/编辑/回复/锚点/编辑器侧栏 | src/modules/comments/ui/**；styles/**；src/app/editor-panel/** | T-10 | notes/*；表单/详情/Notice 模板 | 回复/解决/孤立锚点/删除确认；正文不被改写；跟随与固定 |
| 通知、保险箱、体检全部状态与设置 | src/modules/notifications,safe,health/ui/** | T-11 | notifications/*；safe/*；health/* | 通知来源；初始化/恢复/校验/锁定/剪贴板所有权；有限 owner repair |
| 设置壳、正文外观、模块设置、图标规则/选择器 | src/app/settings/**；src/modules/icons/ui/**；icons/styles/** | T-12 | settings/*；agent 管理入口 | 真实字段索引/标签页定位；导入导出；模块设置由各模块票改造 |
| 独立 CSS、旧入口清理、维护文档与遗漏核对 | frontend-inventory.json 全量复核；docs/** | T-13 | 全表面最终回查 | 所有文件明确迁移/复用/删除与验证；不接受“模块目录整体覆盖”代替逐项回执 |
| UI 技能、规则映射与负例 | .agents/skills/ui/** | T-15 | 基于 DESIGN revision 3 与 T-01–T-04 共享合同，在模块页面开工前完成；T-14 核对漂移 | 配色/组件/交互/布局/间距/字阶/像素/页面一致性；刷新下游摘要 |
| 最终集成与真实宿主 | src/ 只读验证；脚本与产物按票 | T-14 | 全部最终 fixtures | 全部门禁；真实窗口/触屏/主题/数据验证待实际执行 |

## 模板细化

- 时间/统计：Card header + tabular 数值 + 图表/进度/日期；菜单配置范围；加载保持尺寸，失败局部 Notice，不遮住整页。
- 记录表单：FormField + Label/Control/Help/Error；金额/数量用领域数值规则，正文用现有编辑控件；提交中锁定提交，错误保留草稿。
- 导航/内容：Toolbar + Tree/List/Table + DetailPane；搜索与选中独立；虚拟化/分页互不替代；空目录、过滤无结果、无权限分别呈现。
- 媒体：固定比例容器 + 来源标题 + 播放/预览动作；图片/视频解码错误与网络订阅错误分开；图片预览不能变成页面级横滚。
- 设置：Section + SettingsRow；控件以原字段 enum/boolean/number/path/color 为准。实际值的校验范围、默认值、可见条件来自 schema。危险写入打开现有领域预览/确认，不由演示默认值驱动。
- 宿主贡献：仅装饰 HUHU 面板、图标、状态与注释锚点；源码中挂到宿主的 DOM/CSS 都要验证多窗口、卸载和主题作用域。

## 首页完整目录

BUILTIN_WIDGETS：clock、calendar、lunar、year-progress、countdown、anniversary、pomodoro、habit、expense、reading、usage、quick-actions、skills、fileSearch、recent、nav-recent、nav-shortcuts、album。

SECTION_WIDGETS：memo、todo、sticky、projects、library、folder、dataview、pm、pipeline、skills、calendar、rss、images、videos。允许尺寸、多实例和默认档位逐项来自 `src/modules/home/core/board/widget-table.ts`，不使用统一虚构尺寸。设计稿控件类型只是模板，数据归属不改变。

## 设置完整来源

应用通用/外观来自 `src/app/settings/react/` 与 `src/theme/settings.ts`；模块 settings-page 及 agent/ui/settings、home/ui/settings、icons/ui/settings 提供实际字段；navigator 的 settings-productivity 承接全部周期笔记配置。T-12 负责壳/搜索/外观/图标，T-05–T-11 各自负责模块设置内容，避免多个票写同一模块。

## 完整性检查

实施开始和 T-13 各重新枚举同一规则：清单中的每个源文件标记已迁移、复用理由或删除后继；新增/移动文件补入清单。每个 registry kind、每个可见设置分组、每个工作台/编辑器 contribution 至少有一个 fixture；失败/空/不可用与破坏性操作另验。未映射源文件或 UI 面视为缺口，不能由总数相等掩盖。

## T-13 最终逐路径投影

T-13交接时的frontend-inventory.json revision 4（当前revision 5增量见末节）为678条逐路径记录：每条保留原/新增归属、原/当前摘要、迁移/复用/删除分类、后继、正式 Evidence、真实报告和 fixture。264条字节未改仅说明基线差异；复用理由与所属表面报告分别列出，不把相同字节称为逐行审查。原完整审查、后续修复窄审与Root最终浏览器回执按各 Evidence 的明确范围组合；历史 request-changes 不改写为pass。T-13 本轮只是清理与投影，T-14 的同构建、真正宿主与整体视觉门仍待执行。

### 首页注册到生产表面与状态

注册源为 src/modules/home/core/board/widget-table.ts；DashboardPage → BoardCanvas → TileFrame/WIDGET_COMPONENTS（widget）或 Section（section）分派。以下每项同时连实际生产入口与 T-08 fixture state；index.tsx 中 states 是12个通用/配置状态加32个registry状态，共44。index.mjs 对双Document逐状态检查真实挂载、原生日期、嵌套按钮、溢出及exercise，不能用总数代替内容。原66与最终12字体组合回执详见 evidence/T-08.md，104完整审查的发现沿113/126/131各自修复边界闭合。

| 注册项 | 生产入口/保留能力 | fixture state | 回执 |
|---|---|---|---|
| widget:clock | src/modules/home/ui/canvas/ClockWidget.tsx；时区、格式、天气配置/刷新/取消 | T-08/clock | evidence/T-08.md；104/113/126/131 REPORT |
| widget:calendar | src/modules/home/ui/widgets/CalendarWidget.tsx → calendar/**（只读）；周期笔记、任务、日/周/月与完整月历 | T-08/calendar | evidence/T-08.md；104/113/126/131 REPORT |
| widget:lunar | src/modules/home/ui/widgets/LunarWidget.tsx；农历、黄历、签文 | T-08/lunar | evidence/T-08.md；104/113/126/131 REPORT |
| widget:year-progress | src/modules/home/ui/widgets/YearProgressWidget.tsx；年/月/周/日进度 | T-08/year-progress | evidence/T-08.md；104/113/126/131 REPORT |
| widget:countdown | src/modules/home/ui/widgets/CountdownWidget.tsx；标签、本地日期/时间、显示精度、提醒、完整背景 | T-08/countdown | evidence/T-08.md；104/113/126/131 REPORT |
| widget:anniversary | src/modules/home/ui/widgets/AnniversaryEditor.tsx；公历/农历/闰月、原始时间精度/offset、精度、年度提醒、背景 | T-08/anniversary | evidence/T-08.md；104/113/126/131 REPORT |
| widget:pomodoro | src/modules/home/ui/widgets/PomodoroWidget.tsx；开始/暂停/跳过、正倒计时、活动、标签、设置、统计 | T-08/pomodoro | evidence/T-08.md；104/113/126/131 REPORT |
| widget:habit | src/modules/home/ui/widgets/HabitWidget.tsx；添加、勾选、昨日补录、热力、统计 | T-08/habit | evidence/T-08.md；104/113/126/131 REPORT |
| widget:expense | src/modules/home/ui/widgets/ExpenseWidget.tsx；收入/支出、金额、类别、备注、补录、类别、统计/CSV | T-08/expense | evidence/T-08.md；104/113/126/131 REPORT |
| widget:reading | src/modules/home/ui/widgets/ReadingWidget.tsx；书目搜索/手工、书目信息、计时、进度、结束、统计 | T-08/reading | evidence/T-08.md；104/113/126/131 REPORT |
| widget:usage | src/modules/home/ui/widgets/UsageWidget.tsx；配额、provider、刷新、显示方式、缺失依赖 | T-08/usage | evidence/T-08.md；104/113/126/131 REPORT |
| widget:quick-actions | src/modules/home/ui/widgets/QuickActionsWidget.tsx；命令/文件/链接/智能体/快速记录配置与执行 | T-08/quick-actions | evidence/T-08.md；104/113/126/131 REPORT |
| widget:skills | src/modules/home/ui/widgets/SkillWidget.tsx；目录、选择、提示词、运行、缺失依赖 | T-08/skills | evidence/T-08.md；104/113/126/131 REPORT |
| widget:fileSearch | src/modules/home/ui/widgets/InputWidgets.tsx；查询、键盘结果选择、打开、Escape | T-08/fileSearch | evidence/T-08.md；104/113/126/131 REPORT |
| widget:recent | src/modules/home/ui/canvas/RecentWidget.tsx；最近笔记与打开 | T-08/recent | evidence/T-08.md；104/113/126/131 REPORT |
| widget:nav-recent | src/modules/home/ui/widgets/NavigatorListWidget.tsx；导航器最近记录、缺失依赖 | T-08/nav-recent | evidence/T-08.md；104/113/126/131 REPORT |
| widget:nav-shortcuts | src/modules/home/ui/widgets/NavigatorListWidget.tsx；导航器书签、缺失依赖 | T-08/nav-shortcuts | evidence/T-08.md；104/113/126/131 REPORT |
| widget:album | src/modules/home/ui/widgets/AlbumEditor.tsx；目录/递归/间隔/转场/高度、保留ratio/focal、图片浏览 | T-08/album | evidence/T-08.md；104/113/126/131 REPORT |
| section:memo | src/modules/home/ui/inbox/InboxSection.tsx；真实收件箱内容、新建/打开/删除、闪念草稿/失败/今日记录 | T-08/section-memo | evidence/T-08.md；104/113/126/131 REPORT |
| section:todo | src/modules/home/ui/tasks/TasksWidget.tsx；真实TaskViews挂载；TaskContent由任务生产者渲染 | T-08/section-todo | evidence/T-08.md；104/113/126/131 REPORT |
| section:sticky | src/modules/home/ui/cards/Card.tsx；标题/正文/任务/文档/图片/颜色/保存/删除 | T-08/section-sticky | evidence/T-08.md；104/113/126/131 REPORT |
| section:projects | src/modules/home/ui/cards/ProjectCard.tsx；项目目录、笔记列表/查找/新建、封面 | T-08/section-projects | evidence/T-08.md；104/113/126/131 REPORT |
| section:library | src/modules/home/ui/sections/types/LibrarySection.tsx；来源、筛选、日期范围、排序、分页、多视图、属性/新建 | T-08/section-library | evidence/T-08.md；104/113/126/131 REPORT |
| section:folder | src/modules/home/ui/sections/types/LibrarySection.tsx；目录来源/包含排除、属性、日期范围、显示/新建 | T-08/section-folder | evidence/T-08.md；104/113/126/131 REPORT |
| section:dataview | src/modules/home/ui/dataview/DataviewPanel.tsx；查询、刷新、视图/排序/分页/日期月历/热力、错误 | T-08/section-dataview | evidence/T-08.md；104/113/126/131 REPORT |
| section:pm | src/modules/home/ui/pm/ProjectSection.tsx；根目录/阶段/字段、项目、任务/里程碑、详情/归档/删除 | T-08/section-pm | evidence/T-08.md；104/113/126/131 REPORT |
| section:pipeline | src/modules/home/ui/pipeline/PipelineSection.tsx；阶段/筛选/技能scope、条目/任务/截止日期、移动/归档/配置 | T-08/section-pipeline | evidence/T-08.md；104/113/126/131 REPORT |
| section:skills | src/modules/home/ui/skills/SkillsSection.tsx；来源、搜索/分页、提示词、运行/配置 | T-08/section-skills | evidence/T-08.md；104/113/126/131 REPORT |
| section:calendar | src/modules/home/ui/widgets/CalendarWidget.tsx → calendar/**（只读）；完整复用T05生产日历与任务动作 | T-08/section-calendar | evidence/T-08.md；104/113/126/131 REPORT |
| section:rss | src/modules/home/ui/rss/RssSection.tsx；订阅/OPML、筛选/视图、阅读/收藏/保存、错误 | T-08/section-rss | evidence/T-08.md；104/113/126/131 REPORT |
| section:images | src/modules/home/ui/media/MediaPanel.tsx；目录/标签/日期/分组/排序/分页/预览/删除确认 | T-08/section-images | evidence/T-08.md；104/113/126/131 REPORT |
| section:videos | src/modules/home/ui/media/MediaPanel.tsx；目录/标签/日期/分组/排序/分页/预览/删除确认 | T-08/section-videos | evidence/T-08.md；104/113/126/131 REPORT |

全部状态：default、empty、loading、unavailable、query-error、countdown-config、anniversary-config、album-config、appearance、settings、catalog、analytics-custom，以及表中32项。SECTION_WIDGETS 的 section-* key 与业务 sectionType 对照，不按另一份简化类型表计数。

### 设置实际链

settingsCategories → PRODUCT_MODULES → module.settingsPage 与 settings-search-index；真实字段来自模块 schema/UI，任务/体检/通知没有独立设置产品，其开关仍在 General。可选 components 来自 devGallery，不计作模块。

| 分类 | 真实生产者 | Owner/fixture | 回执 |
|---|---|---|---|
| general / appearance / about / components（可选） | app/settings/react 与 theme/settings | T-12 | evidence/T-12.md；089/122 REPORT |
| dashboard | home.settingsPage；src/modules/home/settings.ts、src/modules/home/ui/settings-page.tsx、src/modules/home/ui/settings-access.ts、src/modules/home/services/settings-store.ts、src/modules/home/platform/widget-settings-host.ts、src/modules/home/core/board/settings.ts、src/modules/home/ui/widgets/anniversary-settings-modal.ts、src/modules/home/ui/widgets/album-settings-modal.ts | T-08/index.tsx | evidence/T-08.md |
| editor | comments.settingsPage；src/modules/comments/settings.ts、src/modules/comments/ui/settings-page.tsx | T-10/index.tsx | evidence/T-10.md |
| navigator | navigator.settingsPage；src/modules/navigator/settings.ts、src/modules/navigator/ui/settings-page.tsx、src/modules/navigator/ui/settings-productivity.tsx | T-10/index.tsx | evidence/T-10.md |
| terminal | agent.settingsPage；src/modules/agent/settings.ts、src/modules/agent/ui/settings-page.tsx、src/modules/agent/platform/desktop/hooks/settings-write.ts、src/modules/agent/core/backup/settings-codec.ts、src/modules/agent/core/terminal/settings.ts、src/modules/agent/ui/settings/settings-context.ts | T-09/index.tsx | evidence/T-09.md |
| iconic | icons.settingsPage；src/modules/icons/ui/settings-page.tsx | T-12/index.tsx | evidence/T-12.md |
| contacts | archives.settingsPage；src/modules/archives/settings.ts、src/modules/archives/ui/settings-page.tsx | T-06/index.tsx | evidence/T-06.md |
| automation | automations.settingsPage；src/modules/automations/settings.ts、src/modules/automations/ui/settings-page.tsx | T-07/index.tsx | evidence/T-07.md |
| versioning | versioning.settingsPage；src/modules/versioning/settings.ts、src/modules/versioning/ui/settings-page.tsx | T-16/index.tsx | evidence/T-16.md |
| safe | safe.settingsPage；src/modules/safe/settings.ts、src/modules/safe/ui/settings-page.tsx | T-11/index.tsx | evidence/T-11.md |

### 工作台与宿主贡献

compose-workbench.ts 当前13个贡献，旧icons已删除，图标只经settings/iconic。每行绑定真实fixture所属票，宿主边界以各票Evidence为限。

| contribution | Owner/fixture | 正式回执 |
|---|---|---|
| dashboard | T-08/index.tsx | evidence/T-08.md |
| task | T-05/index.tsx | evidence/T-05.md |
| terminal | T-09/index.tsx | evidence/T-09.md |
| automations | T-07/index.tsx | evidence/T-07.md |
| contacts | T-06/index.tsx | evidence/T-06.md |
| health | T-11/index.tsx | evidence/T-11.md |
| navigator | T-10/index.tsx | evidence/T-10.md |
| safe | T-11/index.tsx | evidence/T-11.md |
| versioning | T-16/index.tsx | evidence/T-16.md |
| revision-review | T-16/index.tsx | evidence/T-16.md |
| notifications | T-11/index.tsx | evidence/T-11.md |
| content | T-04/index.tsx | evidence/T-04.md |
| settings | T-12/index.tsx | evidence/T-12.md |

三个宿主view：huhu-workbench-view → T-04；huhu-comments-view → app/editor-panel → COMMENTS_PANEL（T-10）/NOTE_HISTORY_PANEL（T-16）；huhu-navigator-view → NAVIGATOR_PANEL（T-10）。独立React根的visible/setVisible/dispose由宿主显式传递，各链接到evidence/T-04.md、T-10.md、T-16.md及对应最终报告，iframe回执不能代替真实Obsidian popout。T-34/T-35旧fixture只适配当前handle；不替代redesign票据矩阵。

清单规则之外的必要上下文：app/contracts/workbench-state、editor-context、workbench-host、shared/i18n/lazy/huhu-ui、comments/versioning api.ts/module.ts、home registry/module.ts、app-schema、src/styles.json，以及versioning-worker/diffs-languages/third-party-notices/esbuild-options。这些沿所属T-01/T-04/T-08/T-10/T-12/T-16报告检查，不混入671的规则数量。

## T-14 最终共享生产者补证

真正宿主暴露的focus-outline与Sheet转inline焦点循环，已分别由146/149和147/151回共享生产者修复并独立复核。inventory revision5仅同步Tailwind与DetailPane两项当前摘要、保留原归属/分类和历史报告；T09页面/xterm/领域与Rust无改动。Root最终同构建组件矩阵与宿主结果仍由evidence/T-14.md承接，不把此前诊断当最终通过。

## 最终视觉修复与清单同步

inventory revision6已逐路径重读671个当前文件与7个删除后继，保持618原路径责任。154/160修复裸控件focus与任务圆形/32或44px独立命中、PM窄屏行；156移除通知显式二级栏，保留快速导航元数据；158与162落实Health/Git单主动作。161独立复验的唯一未闭Git分支已由162精确纠正，后续163单源审查与T-14统一门承接；不将历史旧构建结果冒称当前通过。

## Map60共享事件归属修复

171/172在真实Radix延期outside路径取得确定性旧红/新绿：子确认已关闭后原父outside重开。修复复用既有每Document modal有序栈，在pointerdown捕获原nativeEvent/真实ownerDoc与lower-owner不可变快照；迟到outside只阻止落到背景owner，正常无owner外点/Discard仍保留。Dialog/Sheet/Alert三个消费者精确接线，独立根/多Doc/adoption和原字段选区回归通过；inventory7同步4生产源，批准布局/令牌与领域不改。最终新main与13x66/真正宿主由T14新checkpoint承接。
