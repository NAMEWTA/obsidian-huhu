# T05 只读预检回报

Session: 20261105T094057Z
Task: 055-preflight-t05-tasks
Status: completed

## 聚焦交接

本次只交事实地图、范围请求和验证方案，没有实施 T05、修改 Skill/源码/依赖/资产/正式状态或制作私有实现 patch。T15 仍为执行依赖门；T04/054 的候选允许继续变化，本报告不冻结其工作。读取了当前 AGENTS/workspace/catalog、dev/ui、测试/架构参考、docs/task-domain.md、T05/Map16/Spec/DESIGN3/UI-002、coverage/reuse-decision、018 与已接受 T01–03 实际 API；沿用 052 的规则维护预检，不把旧 UI Skill 当新设计权威。

### 实际入口和所有权

| 表面 | 当前真实入口/调用链 | T05 迁移责任与保留能力 |
|---|---|---|
| 独立工作台 | task/manifest.ts → module.ts 的 pages.tasks → ui/workbench-page.tsx 的 taskPage/TaskPresentation/TaskWorkbench → TaskPage | 当前主要是列表；新增批准的分组、看板、日历和右详情，不增 view type。selectedId 导航仍可打开指定任务；ReactSurface 隐藏保留/卸载语义保持 |
| 紧凑任务小组件 | task/contrib/widgets.ts → module.ts 的 views.mount(compact:true) → ui/runtime.tsx mountTasks → TaskPage | Home 只挂载/释放视图，不拥有 Task 服务。保留独立贡献及多实例和 S/M/L/XL 尺寸契约；组件内部统一完成态；不得删除该入口 |
| 活跃编辑入口 | TASK_VIEWS.edit → module.ts 懒 import → runtime.editTask → openReactDialog → TaskEditor | 当前显式保存后关闭；改为批准的 DetailPane 自动保存组合，并保留外部 editor/dialog、新建、AbortSignal、onSaved、关闭释放。不能只改未被生产使用的 TaskEditorForm |
| 共享日历展示 | ui/components/huhu/calendar/{CalendarMonth,CalendarAgenda,TaskRow,TaskComposer,CalendarPreview,TaskEditorForm} | CalendarAgenda 使用 TaskRow；TaskComposer 被 Home/Navigator 使用；TaskEditorForm 目前无生产调用，仅独立 DOM 测试，迁移/删除须说明风险承接，不能宣称它覆盖主表单 |
| 首页小卡/章节/全屏 | home/ui/widgets/CalendarWidget.tsx → calendar/CalendarPanel → CalendarTile/HomeCalendarMonth、MonthGrid/WeekTimeGrid；calendar-modal.ts → CalendarModalPanel/DayAgendaPanel；CalendarDayPanel | 保留月/周切换、周时间轴/全天项/跨周连续条、日议程、今日/月份导航、筛选、手动加载、完整入口、日记/周期笔记动作、预览、添加/提醒/来源/取消；不是仅一张任务清单 |
| 其它真实调用方 | navigator/ui/Calendar.tsx 直接用 CalendarMonth/TaskComposer；navigator/ui/runtime.ts 通过 TASK_CALENDAR；home/module.ts watch TASK_CALENDAR/TASK_VIEWS；automations/services/runtime.ts 用 TASKS，action-host.ts 和 task/contrib/automation-source.ts 用 TaskViews | 跨模块只走 task/api.ts。共享组件的有效周期笔记/键盘语义不能因 T05 重做而丢失；Navigator 本体归 T10，自动化本体归 T07，本票不越界修改 |

Task 服务、仓库、系列与提醒拥有者仍是 task；实际存储 huhu/tasks/tasks.json version 1。homeServices.calendar 只持非拥有引用；useCalendarData 通过快照/订阅附加文件句柄，不扫描或建立第二索引。新增 UI 不另建私有仓库、复制任务、自动生成重复实例，也不以 boardPath 或 Markdown 行号作为身份。

### 字段、动作和设计映射

DESIGN §6 tasks 与 UI-002 final/app.js 的 PAGES.tasks（约 882–975 行）是组合依据：列表分组、list/board/calendar、工具栏、右详情、完成/撤销。原型的少量演示字段不是删除生产字段的许可。

| 当前领域事实 | 批准组合及验证重点 |
|---|---|
| TaskFields：title、description、timezone、due {date,time?}、planDate、reminderAt、relations | 全字段进入详情；title/description 用同一 TaskContent 完成态；metadata 的日期/时区/关联不划线。保留无 due、仅日期、含时刻、独立计划日和独立提醒 |
| status 仅 open/completed/cancelled，overdue/effectiveDate 为派生值 | 列表按逾期/今天/明天/之后/无日期/已完成；看板按原型无日期/有日期/已完成投影，不引入 doing/project/priority/tags。cancelled 仍保留审计、禁止普通编辑/重开；不能当不存在或物理删除 |
| TaskQuery：all/open/completed/overdue、text、timeField、from/to、order、offset/limit、related/recursive/includeCancelled | 保留四类筛选、effectiveDate/due/createdAt/reminderAt/completedAt 时间维度、分页与计数；使用 DateRangeField 替代两原生日期框。列表/看板/月历只是同一查询的投影，不能静默截断前 50/500 项冒充全量 |
| TaskDraft.recurrence 与系列 expression/start/end；仅本次/本次及以后 | 保留 daily/weekdays/weekly/monthly/yearly/custom、结束日、schedule/reminders 能力不可用说明；预览 virtual/seriesRevision 只读，显式动作由现有服务 materialize，UI 不自己生成后续任务 |
| TaskResources：file/folder path、archive id；search/resolve/open(ownerWindow) | ResourcePicker 保留去重、搜索、missing/unavailable、异步过期结果防护和实际目标窗口；关系对象和正文不搬入任务库。历史/createdAt/updatedAt/completedAt/原 due 与逾期责任继续可见 |
| complete/reopen/cancel/update/update-series/cancel-series，commandId/expectedRevision/TaskResult | 保存中真实 busy/禁止重复；失败保留草稿、回退 UI、重试；成功后 open 筛选约 1.4 秒保留并提供 undo。撤销用领域允许的 reopen/最新 revision，不靠改本地 checked；取消没有领域逆命令，不伪造撤销。reopen 不重发过去提醒的既有规则保持 |

现有完成展示分散：TaskPage 没用 TaskContent，TaskRow 只划标题，CalendarPreview/CalendarTile 自写 line-through，CalendarGrids 有独立事件呈现；必须逐项统一标题/说明和 metadata 边界。现有旧 Button variants、size=icon 和原生 date/datetime-local 输入是预期迁移债，不能以当前整体编译/DOM 通过为既成事实。TaskPage 当前 toggle 操作结束即清 pending，没有 1.4 秒留行/undo；TaskEditor 捕获初始 original revision、成功关闭，尚无自动保存的晚回执/新草稿防覆盖。

## 产物与验证

### 可复用的真实组件与布局端口

- 日期族从 ui/components/huhu/date/index.ts 导入：DateField 的 CalendarDate|null、DateRangeField 的 {from,to}（两端可 null）、DateTimeField 的 {date,time,timeZone}|null；DateTime 必需 initialTimeZone 和同步 validateValue→{code,message}|null。纯日历日不经 UTC。due 仅日期与可选 time 要保持独立，不能为了 DateTime 三字段强制给无时刻 due 补 00:00；计划日/重复结束日用 DateField，提醒用 DateTime，并由 task 适配为 reminderAt。
- DateFieldCommon 支持 label/id/description/error/aria-describedby、disabled/readOnly、today/weekStartsOn、collisionBoundary。FormField 克隆一个 labelable child 并合并关联，日期族本身已组合 FormField；避免双重标签和嵌套表单。输入 draft-invalid 必须阻止后续自动保存旧有效值，不能仅依赖 DateTime 的 onChange 不触发。
- TaskContent(title,description,completed,metadata) 已验收，可用于四处完成态。Notice/EmptyState、Button 的 primary/secondary/ghost/danger/danger-ghost、typed SegmentedControl、真实 ScrollArea/Sheet/Dialog 等沿用共享实现，不重建原语。
- useLeafMetrics(ownerElement?) 返回 element/width/ref；DetailPane 必需 leafWidth，inline 条件为 leaf>=960 且可用 main>=1000，叶宽<600 的 Sheet 使用实际 leafWidth。独立 React 根和 Dialog portal 要显式传逻辑 owner/collisionBoundary；不能用 viewport 或 display:contents PortalRoot 当叶边界。此为当前 T04 生产契约，待其正式接受后再绑定最终 source receipt。

### 日期复用的真实缺口与最小请求

批准 reuse-decision 选择 @daypicker/react，当前实际安装 10.0.2/MIT；T03 date/Calendar.tsx 明示唯一 DayPicker adapter，CalendarProps 只有 single/range、value/onChange、bounds、weekStartsOn/today/disabled/readOnly。没有受控 month、day-content、任务按钮槽或完整月份网格接口。UI-002 PAGES.tasks.calendar 是可点任务的 mcal 格，已有共享 CalendarMonth 则自写 calendarRows/焦点键盘，Home 的 CalendarGrids 另有完整月格/周时间轴。不能把日期弹窗控件直接称为完整任务日历，也不能新增第三套日期/键盘引擎。

建议 Lead 在实施派单前明确最小公共生产者接缝：统一 DayPicker adapter 可承载受控月份及有界日期内容/动作，T05 的 calendar/** 只接任务投影、周期笔记菜单及布局。若需要修改 date/Calendar.tsx 或相邻日期测试，当前 T05 没有这些路径权限，须由 Lead 作为共享生产者交付或精确补范围，独立复核 T03 的 popup 行为；本预检不自行修补或另选库。批准复用已足以决定库，不需要新安装/重新选型。

T03 弹窗 fine280/coarse312、coarse 七日 7×44=308 是已验收约束；不能缩成 272px Panel 内无重叠的七列。任务月历位于 main，任务二级栏是原型任务导航而非强塞日期弹窗。Home 小尺寸当前有 short/today/agenda/full 入口：后续测量实际卡片、窄叶与 pointer，不直接删完整月/周功能或缩小粗目标；若原型组合仍无法容纳，交 Lead 明确合法切换，不凭 preflight 发明新设计。

### 真实 DST 适配与 TDD 顺序

现有 task/core/time.ts 的 wallTime(date,time,timezone) 用 Intl 时区 offset 候选：无候选抛 TaskError invalid-input，重复候选返回首项。service.test.ts 已锁定 NY 2026-03-08 02:30 拒绝、2026-11-01 01:30→05:30Z（earlier）。validateFields/deadline/validateDraft、服务日历 createTask 与既有内部调度仍依赖该默认行为，不能全局改为 reject 或改 schema。

最小实现顺序：
1. 在已授权 core/time.ts + time.test.ts 增加 opt-in 严格策略，复用同一候选计算；原 wallTime 未 opt-in 的 earlier 语义保持。严格入口需要稳定地区分 invalid-zone、nonexistent-time、ambiguous-time（错误 reason 或结果联合均可），不解析英文错误文本、不复制候选算法到 UI。最终 API 在实施时先与 Lead 固化。
2. UI 内薄适配调用严格入口，给 DateTime.validateValue 返回本模块 t() 错误；在提交/自动保存前对 due.time、reminder、本次/后续 recurrence.start 重新严格验证和转换。纯 date/planDate/end 不做 epoch 往返；领域原有 validateFields/TaskService.execute 仍作最终校验。
3. 先写真实函数 NY gap/fold 红例，再实现 strict opt-in；验证相同 NY 普通时刻、UTC/Asia/Shanghai 有效对照、非法 zone/日期、原 earlier 控制。由于本次只读，尚未新增或执行这些目标测试。
4. 生产表单 DOM 测试直接使用真实 parser 和 createTaskService/内存事务仓库：非法 gap/fold 显示字段错误、保持草稿、没有 execute/仓库写入；有效值穿过 DateTime→UI adapter→真实服务，核对 due、timezone、reminderAt epoch 和 recurrence.start。模拟 validateValue=成功只能证明组件端口，不能作为领域 DST 证据。表单外显式已有 instant/工具/旧调度默认不受新 opt-in 影响。

### 精确范围与共享交接

当前 T05 writable 已足够涵盖 task/core/time.ts、time.test.ts、task/ui/**、huhu/calendar/**、home/ui/calendar/**、T05 fixture/**；api.ts/services/** 只读。以下是待 Lead 确认的共享接缝，不是已获写入许可：

- 词典：task/i18n.ts 已由 Lead 拥有；实际共享日历词在 shared/i18n/lazy/calendar.ts，Home calendar.* 在 home/i18n.ts。后两路径未列当前 T05 shared_paths，若键有修改/新增应补 Lead shared seam；不要塞入 UI 英文常量，也不为方便改 services/calendar.ts。
- 日期 adapter 若扩展，范围如上；Navigator 真实调用方继续使用有效契约或由 T10 显式迁移，不能无意让外票失编译。calendar/styles 的原生/伪元素层级应转用已验收 owner-aware primitive，不新增私有 z。
- T08 明确排除 home/ui/calendar，T05 负责其完整冻结交接。CalendarWidget.tsx、Home renderer/settings/core/platform 位于范围外，保留其 props、filter settings access 与 reload weakmap 即无需修改；若确有必须改变的签名，再提出精确调用方路径给 Lead/T08，不先越界。
- T04 新 workbench-state/pageViews 的保存端口若任务视图需持久化，当前 TaskPresentation 尚未接入，应先核对最终 PagePresentation 合同；不要在 task domain JSON 加 UI view/filter/selection 字段。

### 已执行检查与后续验证地图

只读执行：pnpm exec vitest run --project unit src/modules/task/services/service.test.ts src/modules/task/services/boundary.test.ts，退出 0，2 文件 / 39 测试通过；日志 /tmp/huhu-t05-preflight/domain-baseline.log。包含现有 gap 拒绝/fold-earlier、完成重开、提醒、幂等/冲突和重复所有权基线，**不证明新 strict fold 拒绝或新 UI 已通过**。

66 个相关源/测试与重要外部调用方的读取时 SHA 清单在 /tmp/huhu-t05-preflight/source-facts.json；time.ts SHA b5a768809f09a6a7325da80177015603d34dcf8ff8a757ffc93df75f017c66e8。该清单是事实时点，不冻结 T04 或外票。报告冻结前同批 66 个文件 drift[]；return validate-dispatch 退出 0，errors[]/warnings[]，日志 /tmp/huhu-t05-preflight/return-validator.log。

后续实施检查按风险选：

| 风险 | 必要验证 |
|---|---|
| 时间/重复/服务 | 新 time.test 真实 strict 红绿 + 既有 service/boundary 回归；不改既有 earlier 断言；reminder<=deadline、仅本次/后续、预览显式实例化和 unavailable 能力 |
| 完成/撤销 | 四表面共享 TaskContent；title+description 同划线、metadata 不划；真实 pending/单次写入、失败恢复/重试、约1.4秒留行、离开/卸载取消定时器、undo 与 stale revision/另一窗口变更 |
| 自动保存 | 一个在途序列化队列/草稿代次、expectedRevision 与真实回执；晚到成功不覆盖新输入、失败保留可重试、切任务/切 aside-Sheet/关闭 dirty、取消与模块 abort、IME 不提前提交 |
| 全字段/入口回归 | task-domain.dom、calendar DOM、Home day-agenda/calendar-names/preview/tile；月/周/全天/来源/关联/过滤/排序/分页、周期笔记显式创建和失效 providers；替换旧选择器时写出风险承接 |
| 生产图与宿主 | T05 fixture 用真实组件和真实 DST adapter；1440/390 为票据必需，代表 320/200%、实际 leaf599/600/959/960 与 main999/1000、en/zh、paper/ink、normal/reduce、fine/coarse、两 Document，按固定 runner redesign 矩阵执行，不自造矩阵成功声明；测布局/44独立命中/可见焦点/Portal/Escape/精确来源/保留编辑和滚动。Lead 最终跑完整 runner/构建、i18n/architecture/样式检查；真实 vault/Obsidian popout/卸载由宿主验收，不能用 iframe 冒充 |

## 问题与下一步

1. 等 T04 正式接受、T15 实施并经独立评审以及 Lead 刷新下游 binding/关闭 G-CONTRACT 后，才可执行 T05。票据当前 ready 是规划字段，不等于本次获得实施资格。
2. 派单前由 Lead 明确完整月份 DayPicker 复用接缝和必要日期生产者写集、两处额外词典 shared owner。现有 time.ts opt-in 范围已经明确，不需扩成服务/调度重构。
3. 无新用户问题、无新库决定或新领域模型需要补充。本次未运行旧 UI 的 DOM/全局 tsc 或完整66；它们目前含已知旧 variants/native-date 迁移债。所有未执行项保留为计划，没有以服务基线冒称 AC-023/041–043 或 T05 完成。
