# T05 Task 与产品日历实现候选

Session: 20261105T094057Z
Task: 066-implement-t05-tasks-calendar
Status: completed

## 聚焦交接

T05 实现候选，尚未验收或标记完成。实现角色为 gpt-6.1-sol / medium；未委派、提交、安装依赖、改正式状态或共享构建产物。冻结清单含43个现存自有文件及1个删除，原始35文件基线、SHA256和模式仅留本地：/tmp/huhu-t05-implementation/before.json、responsive-r3-diagnostic-freeze.json。父级负责词典、DateTimeField raw port、date/Calendar 最小后端替换、strictTime 服务接缝、样式与实际浏览器。

交付 Task 列表/看板/月历及稳定 DetailPane 编辑器，保留 open/completed/cancelled、所有现有时间与重复范围、关系、筛选/排序/分页/服务回执。标题与描述统一 TaskContent；日期和关系不画完成线。编辑器串行自动保存，使用捕获版本与实际 revision，回执不覆盖更新草稿；无效原始日期/时间阻止无关自动保存。成功完成保留1.4秒，查询变化清除过渡行，Undo 仅在状态与 revision 仍匹配时执行真实 reopen。失败保留真实状态与草稿，刷新后重试；卸载/abort 阻断迟到 UI 发布。

CalendarBackend 仅包装实际 @daypicker/react10.0.2、locale/lang/UTC 默认值，调用方 props 最后覆盖；无皮肤、领域状态或第二键盘引擎。父级已让原 date/Calendar 消费该后端。ProductCalendar 使用公开 Day/DayButton/Week 插槽，任务控件与日期按钮是兄弟节点；1–5周视窗仅适配公开 DateLib 视图方法，日期生成、选择与 roving focus 仍归 DayPicker。CalendarMonth 对外既有 anchor/selected/weekStart/period/hover/context/locate/composer 能力保持；Navigator 是 T10 消费迁移方。

Home 月历/周时间网格/全屏/今日/日程/预览/周期笔记/源跳转/链接与完成动作保留。窄月格用独立日期/计数入口调用既有 choose→openDay，完整 TaskContent、源与完成动作留在真实日程。TaskPage 月历也在窄格用计数入口、下方完整所选日任务列表；宽主内容容器仍显示格内标题。独立时间网格的横向滚动属于时间投影，不作为7×44月格的裁切方案。

## 产物与验证

使用实际源码、真实 createTaskService 和内存 repository，不写用户 vault。自有9文件107测试通过；另一次 task/Home calendar 领域8文件68测试通过，存在交集，不累加。scoped tsc、ESLint零警告、Prettier及 git diff --check 均退出0。规范 runner --check 退出0，仅 preflight/0 matrix cases，真实 guarded Radix/Sonner adapter counts，不冒充浏览器验收。日志均在 /tmp/huhu-t05-implementation。

TDD：strict resolver 首次缺 API 红后转绿；默认 fold earlier 保持05:30Z，reject 提供稳定 invalid-date-time/invalid-zone/nonexistent-time/ambiguous-time。真实表单+事务验证 NY gap/fold 不写、UTC/Shanghai精确时刻；原始不完整提醒阻止无关保存。公开周视图先暴露反向 PageUp 月边界回退首日，适配 view identity 后44个 calendar DOM 控制通过；未加入手写键盘处理。compact-count-red.log 复现没有窄格独立计数入口，之后计数路由与完整日程、关系 provider 标签/缺失状态、查询隔离等最近控制通过。

删除 TaskEditorForm.tsx：实际生产调用检索为零。保留 TaskComposer Enter/IME/failure 测试；旧非生产表单的关联提醒清理假设迁至真实 TaskEditor 控制，按当前 TaskFields 的独立 reminder 语义验证清除 due 不删除提醒，而非保留无调用的旧表单兼容层。

初次父级390 coarse实际浏览器输入冻结在旧41文件，结构断言通过且两Document真实自动保存成功；父级与实现方查看实际图片后确认 Home 月格标题近逐字换行为视觉失败，故未以 passed JSON 宣称符合设计。原图/结果保留：/tmp/huhu-t05-lead-initial390。当前候选修复该问题并精确修复 ContextMenu 包裹后的 selected/today 皮肤后代选择器；新皮肤的计算颜色及像素验证仍待新冻结实际浏览器。

DesignConformance：严格 UI002/12px最小metadata；语义HU颜色/表面/线条，移除对旧Home widget皮肤导入；保留 dashboard-* 只作稳定DOM标记。272粗指针面板保留显式全日历入口；弹层312、320视口4px碰撞边距、7×44，周数/周期功能置于七列内，未缩小触控或裁切焦点。新生产fixture对两Document设置真实public props，覆盖1–5周×weekStart0/1/6可信原生 ArrowRight/PageDown/PageUp；320几何/颜色/2+2焦点截图、鼠标/触控中心±21.5与邻焦点、真实周期菜单、计数→日程、IME与1440/390五种状态和真实写失败。上述新增浏览器断言尚未执行，不写通过结论。

## 问题与下一步

等待父级新CSS/source receipt与实际单例原生运行；不得把初次结构 pass 当新候选或完整66矩阵验证。需要实际查看新窄格/日程、选中背景和边缘焦点图片，再送 high 独立审查及父级完整矩阵。当前生产与fixture均冻结，不继续修改直到输入边界释放。

明确下游债务：Navigator calendar-consistency/productivity 两文件16测试中12通过、4个旧DOM断言失败：button data-selected、data-has-note、aria-selected（实际DayPicker选择在gridcell/datebutton aria-pressed，note状态在可访问标签）。未修改T10文件或回加旧renderer；迁移须保持原始实际领域/导航风险。日志 frozen-navigator-consumers.log，不声称所有调用方通过。未执行全仓build/全仓types或真实Obsidian popout；第二Document是同源iframe，fixture服务为真实内存实现，host源打开仅记录端口调用。

第二次父级 bounded run 为 harness red：/tmp/huhu-t05-lead-responsive390/result.json 在 selected 色相等断言停止，actual rgb(227,238,236)，expected rgba(0,0,0,0)。预期色 span 原挂于 HU 作用域外 body，导致 var 无值；仅将该临时 span 挂到真实按钮父节点，并增加实际 viewport/body/owner-leaf/popup 诊断消息，未放松任何几何/颜色/2+2/触控断言，未改布局或生产代码。R3 等待父级实际执行；旧失败截图完整保留。R2 CSS SHA8abca67e08b4dcac858751ca5894bace9c31590bb94adf49b7e02f2db68af1eb。该过程材料不是最终验收。


冻结补充：最终R3 fixture SHA 为78ce4d2fbe9a650b3e7b8c8ccf3964e1b6f3f3427e914f4f2fa63473cd089808，其余生产与自有测试源等于 responsive-candidate-freeze.json。仅预期色作用域/诊断消息获父级授权作fixture增量。R3当前由父级排队执行，未获得新结果；本报告明确交付候选并释放实现槽位供高审查，不宣布原生验证、T05或任何Gate完成。后续实际反例需保留并修复。

审查关注：实际320诊断需分辨长specimen页面外层原生滚动条导致clientWidth305与真实固定宿主viewport；当前没有隐藏滚动条或改布局以规避断言。另发现TaskRow的Remind+More同时存在时，size-8/gap0.5可能在粗指针下产生44目标重叠；尚未采集该组合原生几何，当前fixture缺少onRemind同时存在的控制，应在正式接受前补该真实组合并检验，不能以当前单More控制代替。

实际写入文件（相对基线，未列未改但冻结的文件）：

- src/modules/task/core/time.ts
- src/modules/task/core/time.test.ts
- src/modules/task/ui/ResourcePicker.tsx
- src/modules/task/ui/runtime.tsx
- src/modules/task/ui/TaskEditor.tsx
- src/modules/task/ui/task-domain.dom.test.tsx
- src/modules/task/ui/time-validation.ts
- src/modules/task/ui/TaskPage.tsx
- src/ui/components/huhu/calendar/CalendarPreview.tsx
- src/ui/components/huhu/calendar/calendar.dom.test.tsx
- src/ui/components/huhu/calendar/TaskComposer.tsx
- src/ui/components/huhu/calendar/CalendarMonth.tsx
- src/ui/components/huhu/calendar/ProductCalendar.dom.test.tsx
- src/ui/components/huhu/calendar/task-editor.dom.test.tsx
- src/ui/components/huhu/calendar/CalendarAgenda.tsx
- src/ui/components/huhu/calendar/TaskRow.tsx
- src/ui/components/huhu/calendar/CalendarBackend.tsx
- src/ui/components/huhu/calendar/ProductCalendar.tsx
- src/modules/home/ui/calendar/CalendarGrids.tsx
- src/modules/home/ui/calendar/CalendarDayPanel.tsx
- src/modules/home/ui/calendar/CalendarModalPanel.tsx
- src/modules/home/ui/calendar/calendar-tile.dom.test.tsx
- src/modules/home/ui/calendar/calendar-styles.ts
- src/modules/home/ui/calendar/CalendarTile.tsx
- src/modules/home/ui/calendar/calendar-names.dom.test.tsx
- src/modules/home/ui/calendar/calendar-layout.ts
- src/modules/home/ui/calendar/calendar-add-task.ts
- src/modules/home/ui/calendar/CalendarNav.tsx
- src/modules/home/ui/calendar/CalendarPanel.tsx
- src/modules/home/ui/calendar/calendar-controls.tsx
- scripts/ui-review/fixtures/frontend-redesign/T-05/index.mjs
- scripts/ui-review/fixtures/frontend-redesign/T-05/index.tsx

删除：src/ui/components/huhu/calendar/TaskEditorForm.tsx。其余共享源码/词典/依赖/生成资产/正式状态不是本实现者写入。
