# 日历内容适配私有方案回报

Session: 20261105T094057Z
Task: 056-propose-calendar-content-adapter
Status: completed

## 聚焦交接

建议选择 **B：共享一个无业务的薄 DayPicker 基座，日期选择器与产品月历分别组合样式/内容**，而不是把完整任务月历塞入现有 Calendar 的 single/range props。这是 API/reuse 建议及有边界的私有证明，不是生产实现或批准像素原型。完整月历的内容组合已证明可行；既有 1–5 周条的边界焦点仍有明确反例，不能宣称整个 CalendarMonth 已可直接替换。所有仓库源码/Skill/依赖/资产/状态保持只读，未启动 T05/T15 或重开/完成 T03。

读取并沿用 055/052、T03/T05/T10/T15、Map16、DESIGN3/UI-002 与 reuse-decision。比较方法遵循 ResearchAndReuse/ChangeScope；无新增库、无安装或 vendor 私有 API。源码注释 sole adapter 是当前实现说明，不单独构成新产品要求；“一个 backend”指复用已选 DayPicker 的日期/焦点/键盘能力，不能据注释拒绝合理的内容组合。

### 两个最小方案的比较

| 方案 | 形状 | 成本与结论 |
|---|---|---|
| A 扩展现有 date/Calendar | 给原 CalendarProps 加 presentation/content 分支、controlled month/onMonthChange/renderDayContent，并按分支改 Day/ClassNames | 少一个文件，但现有 picker 内部持有 month、selectedStart 同步、280/312 布局、单/范围联合都需加分支；完整月份/周条/任务动作会混进选择器接口与焦点裁切样式。不是只加一个 ReactNode 属性，回归面较大，不推荐 |
| B 薄通用 CalendarBackend + 产品包装 | 新无状态基座只组合公开 DayPickerProps；现有 date/Calendar 原 props 与 skin 不变；产品 CalendarMonth 持有产品 anchor、period controls、day-state/content slots | 新增很薄文件及一次 picker import 替换；保持两个外观职责独立，用同一个 vendor 日期与 roving 引擎。公开组件 slot 足以支持完整月份的独立任务按钮。推荐，但不把周条裁行小样当全功能生产者完成 |

最小基座可只有 `CalendarBackend(props: DayPickerProps) => <DayPicker {...props}/>`，不做存储/任务 DTO、第二套日期算术、键盘、locale 周号或时区转换。内部实现可保留 vendor 类型，面向模块的产品 props 继续是 CalendarDate/回调/ReactNode；模块不得因此绕过 task/api.ts。locale/lang/timeZone/default classNames 在一次生产提取时明确归属，不能隐式覆盖调用方，也不把全量 props 重写成新的框架。

产品层建议明确 `month/onMonthChange`（日历日/月组件）、selected/onSelect、weekStartsOn、day state/content、day/period action、hover/context callbacks；不传 TaskService 或模块业务 import 到 ui。其 Day 组合必须保留收到的 children（真实 DayButton），并将任务区域放在兄弟节点；DayButton 的 ref、ARIA、tabIndex、onFocus/onKeyDown/onClick 交给库。Task 按钮不放入 formatDay/DayButton 内，也不在整个 td 统一绑定“选择日期”而让任务事件冒泡变成选日。

## 产物与验证

### 一手 API 与适用限制

查证日期 2026-11-06，实际 @daypicker/react 10.0.2 / MIT，scoped 包公开重导出 react-day-picker；使用固定安装版本 declarations/components，不引用内部 helpers/useFocus。以下为实际读取的官方资料：

- https://daypicker.dev/guides/custom-components ：公开 components.Day 可扩展 cell 内容，应保留 props 并组合默认组件；私有小样使用 `<Day {...props}>{props.children}<div>{slot}</div></Day>`，不复制库算法。
- https://daypicker.dev/docs/navigation ：month/onMonthChange 为受控月份端口；小样使用该端口和原生 DayButton 验证跨年焦点。
- https://daypicker.dev/docs/grid-and-months ：fixedWeeks 只提供固定六周，numberOfMonths 是整月数量，**不是任意 1–5 周窗口 API**。
- https://daypicker.dev/docs/week-numbers-and-footer ：showWeekNumber/WeekNumber 是公开扩展点。实际 10.0.2 WeekNumberProps 是 `{week: CalendarWeek,...thProps}`，不是页面简例里的旧式 props.weekNumber；以安装声明和编译结果为准。领域周号必须由现有 shared/periodic-paths.weekOfYear(日期,weekStart) 决定，不能悄悄用 locale/ISOWeek 开关替代 Vault 周记的 week-year 规则。

实际声明位置：安装包公开导出的 DayProps/WeekProps/WeekNumberProps/DayPickerProps。Day 的声明 HTMLAttributes 元素类型与运行时 td 不完全一致，小样不自行构造 td，而转发公开 Day；无需依赖内部 DOM 算法。

### 私有可回读产物

全部位于 /tmp/huhu-calendar-content-proposal：

- spike.tsx：A 的扩展类型草图、B 的薄基座、Day 兄弟 slot、5周窗口/领域周号试验、未修改的实际生产 Calendar 控制。
- spike.css：明确标注 PRIVATE 的布局容器与局部原生横向滚动；不是 HUHU 正式 skin 或批准原型。
- build.mjs / native.mjs：私有 esbuild 与独立 Chrome/CDP 驱动；没有跑共享 build、写 node_modules 或修改生产生成器。
- types-final.log、result.json、inputs.json、snapshot.json；inputs 为本次实际 bundle 源图和复制的 CSS 字节，snapshot 为私有产物哈希。引用的生产源码仍是读取时来源，不冻结 T04 的继续修改。

关键 SHA256：

| 私有文件 | SHA256 |
|---|---|
| spike.tsx | e6b115add616b6cfc46b9b701abfafa3f3e1fa2250c957c792b1f15722b6f7fa |
| spike.css | 95d4671953aeb6111e7c355c7e98d0d975e40d65f1205f65deba129d3708e0fb |
| native.mjs | 5ef9e47fd66c04bd056fa4c8f7d66b99a46a48ed7401f85fff8f0b0527f23b71 |
| bundle spike.js | 61104a8881f5b24e02f0d3e945e1f7244650a76c96c2e9b63253dec9971c41e7 |
| 私有复制 styles.css | 70dfb92f8e96fd828019dc6fa6c82790602d276f87c47596fb7a439cf125209a |
| result.json | c132ef1facbe06999a92cbf1d9a084655ab5b2d421cdd5e848aced6624b21ad2 |

### 实际检查结果

- `pnpm exec tsc -p /tmp/huhu-calendar-content-proposal/tsconfig.json` 退出 0。仅为小样/导入图类型证明，非全仓检查。初次 compiler 的 Week 返回 null 不满足公开 JSX.Element 返回类型，改为 fragment；另补宿主 createDiv 最小声明。失败保存在 types.log，没有更改 vendor 声明或忽略目标错误。
- `node /tmp/huhu-calendar-content-proposal/build.mjs` 退出 0；实际生产 Calendar 原文件未替换，独立内容组合用公开 DayPicker，普通 picker 回归是未修改生产图对照，**不冒称已提取 B 后的生产回归**。
- `node /tmp/huhu-calendar-content-proposal/native.mjs` 最终退出 0，12 项正向断言通过，errors[]。两真实 Document（主文档、同源 iframe）：无 button 嵌套；日期按钮与任务按钮为兄弟；真实 CDP 点击任务只触发一次任务回调且不选日期；真实 ArrowRight 从 2026-12-31 到 2027-01-01；实际生产 Calendar 的 ArrowLeft 仍到 12-30。任务按钮先显式 focus 仅为前置条件，点击由原生 Input.dispatchMouseEvent 完成。
- 保留 harness 失败：harness-missing-createDiv.json（补真实宿主扩展最小桩）；harness-unsettled-task-focus.json / harness-enter-no-char.json（仅 keyDown/keyUp 没产生按钮 Enter 激活；最终用可信 mouse 明确验证回调）。它们不是组件已证明缺陷，也没有以合成 DOM click 当 native 输入。
- 320 CSS px、真实可用主宽305/第二文档290：局部原生 scroll 下，月格最小内容308、带16px周号最小324，日期按钮实际>=44×44，同一行相邻按钮零面积重叠。200% 控制按有效160 CSS px、实际145宽量测：内部scrollWidth308，而 document scrollWidth145，无页面横溢。**这是容器可行性证明，未批准产品采用该 skin/周号宽度；截图、焦点 paint、触摸全部内点及完整可访问性仍未验。** 不能缩成305/7而牺牲44目标。

### 真实周条反例，不能隐藏

小样通过公开 Week 选择已有行、hidden matcher 限制窗口，静态呈现 2026-12-28 至 2027-01-31 五周且不复制日期生成算法。但在两 Document 中聚焦末日01-31再按 ArrowRight，焦点都停在01-31；现有 CalendarMonth 的有效行为是推进02-01并 onAnchor(next)。结果保存在 result.json.stripBoundary，desiredExistingBehavior 与实际值并列。最终脚本成功表示这个预期负控制被观察并记录，不表示周条等价已通过。

原因边界：裁 DOM/隐藏窗口外日期也隐藏了库下一焦点目标；单靠公开 Week slots 不能自然获得原先滑动周窗口的边界语义。现有 PageUp/Down 对周条按 weeks×7 导航，而 DayPicker 默认按整月，也需要明确迁移证明。不能删除这些功能、接管一套重复 Arrow/Home/End 引擎、在极窄宽换新模式，或保留按 prop 分支回旧 renderer 来伪装完成。

### 精确调用方与范围计划

| 生产者 / 调用方 | 预期最小改动与保持点 | Owner / 验证 |
|---|---|---|
| 建议新增 ui/components/huhu/calendar/CalendarBackend.tsx | 仅公开 DayPicker 组合/共享 defaults，名字与是否对模块公开由 Lead 固化；无业务数据、无第二焦点引擎 | 需 Lead 正式指定生产者票；可落 T05 原 calendar/** 写集，但上游 date import 另需明确授权 |
| ui/components/huhu/date/Calendar.tsx | 最多改为消费 base；Calendar/DateField/Range/Time 的公共 props、280/312/7×44、strict dates、UTC component转换、TZ/IME/Portal保持；不加 content union 或整体重排 | 不在当前 T05 writable，Lead 精确补源和 date DOM/fixture 回归责任。提取后必须复跑 single/range 真键盘、边缘paint/命中/弹层回归；本小样未执行提取 |
| ui/components/huhu/calendar/CalendarMonth.tsx | 产品 Month 包装负责 month/anchor、period header/menu、day状态/预览slots；用 DayPicker 默认 DayButton，任务内容为兄弟；保留 calendarDate/calendarIso/calendarRows 等实际调用导出或协调迁移所有消费者，不造旧别名分支 | T05 当前拥有共享calendar，但必须先解决/明确 weeks1–5 producer义务；不是只替换整月分支就宣布共享替换完成 |
| home/ui/calendar/HomeCalendarMonth.tsx | 保留 day/period inspection、Navigator weekStart/weeks/weekNumbers/images、active、ownerWindow、canSplit、创建/打开/tab/split/diary；只翻译到新产品 month API | T05；旧 functional props 可继续有效存在，非旧 UI 兼容层。主月/周时间轴仍是任务数据投影，不能冒称 DayPicker 已提供 hours/连续条 lane API |
| navigator/ui/Calendar.tsx | 当前直接使用共享 CalendarMonth/TaskComposer，周条1–5、周号、period note菜单、modifier-open、hover、显式创建必须继续可达 | T10 独占其源；若函数props保持可不改，但源码回归仍必需。若改签名，Lead 应把调用方适配作为原子 producer集成或调整DAG/精确scope，不能留给未来票承担未记账断裂 |
| home CalendarTile/Panel/Grids/DayPanel 与外部 CalendarWidget | 保留小卡今日/议程/full入口、完整月/周时间轴和已有filter设置；T05 calendar目录内组合，T08 排除该目录，外部CalendarWidget props保持或由T08/Lead适配 | 完整month可在main；272 panel/更窄卡不强塞312控件。周号列和200%按实际宽测量，可用已有局部原生scroll/完整入口，但产品最终呈现需符合批准组合，不把POC作为新模式决定 |

无需新字典概念或翻译框架。当前 calendarUnified/tasks.* 在 shared/i18n/lazy/calendar.ts、Home calendar.* 在 home/i18n.ts；新可访问名称/完整入口文案若确需增加，由 Lead 依 055 的精确共享请求提供 en/zh，不把 provider 内字串硬编码进生产。Task 时区 strict opt-in/DST 仍归 T05 core/time，与本无业务基座分开。

## 问题与下一步

- Lead 可选择 B 的边界作为后续 producer 任务输入，但 **完整 month 方案可行不等于既有 CalendarMonth 所有功能已被证明**。周条末端推进/PageUpDown、年边界/所有 weekStart/领域周号、当前笔记定位和period上下文菜单需要独立 bounded producer方案与真实输入证明；本次保留明确未解项，未给出未经验证的键盘补丁。
- 若 producer 需要跨 date/** 与 Navigator 源，先由 Lead 更新准确 Scope/Map/DAG 和对应回归 owner，再写源码；不得由 T05 仅因共享路径影响到 T10 就自行改文件。不要新增长期旧 renderer 分支；阶段未迁移事实如需保留须有明确责任票和清除门，不能写成已接受共享能力。
- 后续正式候选应提供三层证明：抽取前后原 picker 行为/像素不变、完整 Month 的 siblings/控制月份/locale/ownerDocument 键盘与任务单回调、周条/周期笔记/窄宽和native滚动完整保持。再由 high 独立审查及 Lead 生产矩阵验收。
- 本报告不更新 T15 已接受事实清单、不声明 G-CONTRACT 已关闭。T04 修复、T15 启动和生产者修订由 Lead 正式决定；return validate-dispatch 退出 0，errors[]/warnings[]，日志 /tmp/huhu-calendar-content-proposal/return-validator.log。当前只读私有任务到此释放。
