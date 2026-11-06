# 设计系统与组合

批准依据和读取路由见 [ui 入口](../SKILL.md)。本文件维护组件、值与样式边界；令牌完整数值只查 `src/ui/styles/tokens.css`，Tailwind 映射查 `src/ui/tailwind/index.css`，组件 props 查 `src/ui/components/`。不要在多个参考复制数值表。来源、版权与许可保留在改编文件及 [来源映射](../../../../docs/references.md)，许可操作由 [dev](../../dev/references/licensing.md) 负责。

## 令牌和组件

HUHU UI 使用独立 paper/ink 语义色；颜色来源/字体设置见 [theme](theme.md)。布局只用语义令牌，不在模块写色值或靠旧主题变量恢复旧 UI。`--background/--card/--primary/--accent` 等 shadcn 别名、`--nd-font-sans/mono` 是从 HU 令牌派生的适配，不是独立色板；不要因名称旧而删除仍有效的桥接。

| 决定 | 真实生产来源 |
|---|---|
| 背景、文字、边线、强调、语义状态 | `--hu-canvas/surface/raised/sunken`、`--hu-fg`、`--hu-fg-2`、`--hu-fg-3`、`--hu-line/control-line`、`--hu-accent/-soft/-text/-fg`、success/warning/danger/info；不猜不存在的令牌 |
| 字体与类型 | `--hu-font-ui/read/mono`：Geist、阅读衬线、Geist Mono 及 CJK 回退；`--hu-text-*`/行高/字重，数字 tabular-nums。中文和必要 metadata 不小于批准的最小字号，不能继续旧 10/11px 密集文字 |
| 间距、形状、密度 | `--hu-space-*`、`--hu-radius-*`、`--hu-ctl-h/row-h/list-row-h/card-pad`；密度与命中尺寸分开，虚拟器按实际行高重测；`--hu-shadow-card`、`--hu-shadow-pop` 按角色使用 |
| 图标 | lucide-react；保留组件规定的尺寸、描边和视觉/命中区别。用户配置 Obsidian 图标名才用 ObsidianIcon/setIcon，不新引图标引擎 |
| 特殊表面 | 图表 `--hu-chart-*`、终端 `--hu-term-*`、差异 `--hu-diff-*` 桥接；终端、编辑器和 shadow DOM 由其适配器消费，不靠外层选择器穿透 |

| 需求 | 从 `src/ui/components/` 复用 |
|---|---|
| 操作/输入 | Button、Input、Textarea、Label、Select、Switch、Checkbox、Slider；Button variants 为 primary/secondary/ghost/danger/danger-ghost，sizes 为 sm/md/lg/icon-sm/icon-md/icon-lg；取消用 secondary/ghost，不标危险 |
| 表单/设置 | huhu/FormField、SettingsSection、SettingsRow、SettingsSwitchRow、SegmentedControl、PathPicker/VaultPathField、NumberField/ColorField；先核实对应专用控件值域和必需 props |
| 日期 | huhu/date 的 Calendar、DateField、MonthField、DateRangeField、DateTimeField；值与领域映射见下节 |
| 展示/反馈 | Badge（neutral/accent/success/warning/error）、Table、Card、Skeleton、huhu/Notice（info/success/warning/error）、EmptyState、TaskContent |
| 导航/容器 | Tabs、ScrollArea、Separator、Accordion、Collapsible、Tree；分屏用 ResizablePanelGroup/ResizablePanel/ResizableHandle（panels v4），尺寸数字为 px，百分比为字符串 |
| 弹层/菜单 | Popover、Dialog、Sheet、AlertDialog、Tooltip、HoverCard、DropdownMenu、ContextMenu、Command；编辑表单不用 Tooltip/HoverCard |

Button 的 busy 使用真实 Promise 阶段，锁住重复提交且宽度稳定；slotted 原生/自定义按钮也要保留 type/disabled 语义，不能依赖样式“禁用”。非控件包装不冒充 labelable element。`FormField` 只接一个可关联的 React 控件；money/table/多选等组合用 fieldset/legend 或正确的 ARIA 组。保留 false/0/missing/null、隐藏字段原值及领域只读约束。

Table 的表头36，正文随密度为44/52；Tree行高与粗指针目标分别由共享组件和虚拟器度量，不在页面统一改所有行高度。

TaskContent 只让 title/description 随 completed 划线并变次级色，日期/关联放 metadata，不划线；用于任务列表、看板、月历和首页，避免各处自写完成态。Tree 的 branch 展开与选中分离，Headless Tree 管键盘/typeahead，TanStack Virtual 管呈现；搜索保留祖先、清空恢复。分页、总数和已加载量是领域/模型责任，虚拟化阈值或展开上限不能静默截断记录。

## 日期与精度

从 `src/ui/components/huhu/date/index.ts` 使用当前类型：

- DateField：CalendarDate（严格 `YYYY-MM-DD`）或 null；DateRangeField：`{from: CalendarDate|null,to: CalendarDate|null}`，清空两端，不另造顶层 null。纯日历日保留分量，不能经 UTC 时间戳往返；手输无效草稿、IME、required/readOnly/disabled 和外部受控 reset 均保持语义。
- DateTimeField：`{date,time: HH:mm,timeZone: IANAZone}|null`；必需 initialTimeZone 和真实领域 `validateValue(value): {code,message}|null`。错误 code 稳定，message 由调用方 t()。控件不输出 epoch、不实现第二时区引擎；任务/自动化适配由各自既有解析器严格拒绝 gap/fold，并用真实 NY 缺失/重复时间与 UTC/Shanghai 正常值联合验证表单和服务。不能用 `()=>null` 或 TZDate 自动纠正充当领域证据。
- DateFieldCommon 的 label/id/description/error/ARIA、bounds、weekStartsOn/today、collisionBoundary 直接复用。弹层边界顺序是显式 boundary、触发器最近 `[data-huhu-leaf]`、所属 Document viewport；Dialog portal 不再有原叶 DOM 祖先，调用方应传逻辑叶元素。标准 picker 280、coarse312/七日各44，不压进默认272侧栏；完整任务月历不是 picker API 已有的能力。
- 月精度使用 date/index.ts 导出的 MonthField 与 CalendarMonth 类型、parseMonth/validateMonth，值为严格 `YYYY-MM` 或 null，不是 CalendarDate。档案 month/mixed 由 `archives/ui/generic/PrecisionDateControl.tsx` 真实消费，不补成1日；保留同一领域 codec 与精度标签。产品月历同名组件位于 calendar/CalendarMonth.tsx，与这里的月份值类型不同。
- 档案已有 `Z/±HH:mm` ISO datetime 含秒/小数和偏移，不是 IANA/分钟值。用 DateField 日期部分与共享纯时间/偏移控件组合原档案 codec，保留精度/offset，不推断 IANA、不截秒、不重写 epoch。缺组合能力回生产者；没有 IANA 解析端口就不能套 DateTimeField 假装成功。原 save/dirty/error/recovery 归属保持。
- DateField 的 `value/onChange` 表达已提交的语义日期；`draftValue/onDraftChange` 配对表达父表单持有的 raw 文本，包含非法/未完成输入。父 raw 可跨卸载保留；只更新 value 或改变 draftResetKey 都不会覆盖受控 draftValue，父表单 reset 必须同时重置自己持有的 raw。未传 draftValue 时，value 或 draftResetKey 变化才同步控件的本地文本，不用重挂输入模拟 reset。真实受控调用见 `navigator/ui/diary/SearchWritePanel.tsx` 的 writeRaw/writeDate。
- DateTimeField 的 `onDraftChange` 通知 `{date,time,timeZone}` 原始分量，包含尚不能触发有效 onChange 的输入；控件按完整 value/initialTimeZone 同步本地草稿，内部 draftResetKey 让同日期但 time/zone 改变的 reset 也清除旧日期 raw，保留输入节点与焦点。这不改变 DateField 受控 raw 仍由父表单重置的规则。
- 父表单用 raw 状态承接 IME、clear、无效/未完成输入与 required 规则，阻止其它字段的手动/自动保存带走旧有效值；不能等 onChange 才判断是否允许保存。clear 按各字段可空/必填规则处理，不将合法清空一概判错；组合确认不提交。失焦/Enter 的严格校验与领域提交前校验都需承接。已有 `src/ui/components/huhu/date/date-draft.dom.test.tsx` 覆盖父 raw 跨卸载、语义变化及 clear，`DateTimeField.dom.test.tsx` 覆盖 unrelated save、IME/clear 和同日期 time/zone reset；这些回归不替代具体领域解析或宿主验收。

完整月历的复用合同是薄通用 DayPicker 基座加产品包装：日期按钮保留库焦点/键盘/ARIA，任务动作是其兄弟节点，不嵌套 button；受控月份、locale、周期笔记菜单、周号和1–5周窗口由生产者验证。固定六周/月份数量不等于任意周条边界 API；不能裁行后让末日方向键失效，也不另造键盘引擎。现有实现位于 `src/ui/components/huhu/calendar/CalendarBackend.tsx`（DayPicker 公共 API 薄基座）、`ProductCalendar.tsx`（产品布局）与 `CalendarMonth.tsx`（周期笔记/月历及周窗口包装），由 `navigator/ui/Calendar.tsx` 和 `diary/DiaryReader.tsx` 消费。picker 的 date/Calendar 不承接完整产品月历；新增能力仍回所属生产者核对实际 API。周号/周记标签保留现有 periodic helpers 的领域规则，周时间轴是产品数据投影。

## 最小组合例

以下示例放在模块 `ui/` 时使用真实相对 import；文案 props 来自调用方的 t()，业务保存和错误不藏进示例。输入表单：

```tsx
import { FormField } from '../../../ui/components/huhu/FormField';
import { Input } from '../../../ui/components/input';

export function TitleField({ label, value, error, onChange }: {
  label: string; value: string; error?: string; onChange(value: string): void;
}) {
  return <FormField label={label} error={error}>
    <Input value={value} onChange={event => onChange(event.currentTarget.value)} />
  </FormField>;
}
```

设置和错误反馈共享真实状态；SettingsSwitchRow 的 onChange 是无参数回调，busy 由外部真实异步操作驱动，不传猜测的 checked 参数：

```tsx
import { SettingsSection } from '../../../ui/components/huhu/SettingsSection';
import { SettingsSwitchRow } from '../../../ui/components/huhu/SettingsSwitchRow';
import { Notice } from '../../../ui/components/huhu/Notice';
import { Button } from '../../../ui/components/button';

export function EnabledSetting(p: {
  title: string; label: string; checked: boolean; busy: boolean; error?: string;
  retryLabel: string; onChange(): void; retry(): void;
}) {
  return <SettingsSection title={p.title}>
    <SettingsSwitchRow label={p.label} checked={p.checked} busy={p.busy} onChange={p.onChange} />
    {p.error && <Notice tone="error" title={p.error}
      action={<Button variant="secondary" onClick={p.retry}>{p.retryLabel}</Button>} />}
  </SettingsSection>;
}
```

## CSS 与复用边界

- 所有 React 根带 `.huhu-ui`，Tailwind 经作用域流水线限制到该根，保留上游类名/data-slot及改编处的原始来源、revision、MIT等版权声明；`cn()` 合并，调用方 className 最后传。语义工具类是 HU 令牌适配，不复活旧主题别名或旧 Button variant。
- 中和层排除 `.markdown-rendered`、`.huhu-native`、`.cm-editor`；MarkdownRenderer 外层加 huhu-native。作者 CSS 留所属模块并限定根；能用共享组件/Tailwind 就不新增 CSS，不用 !important。手写规则与生成工具变体的允许范围以实际 lint/style 配置为准。
- Portal 每 Document 一份引用计数的 `.huhu-ui.huhu-portal-root`（display:contents），Radix/sonner 使用该容器，最后使用者释放。它没有有效几何框，不能当 collision boundary。层级与物理 owner 见 motion-a11y，不私设永远最高 z-index。
- 文字按钮、标签、工具栏不越界；min-w-0、换行/收次要操作、容器查询或局部原生滚动按内容选择。截断有完整可访问名称/必要 title；图标化保留名称/Tooltip。代码、终端、宽表/时间轴的有界滚动不能演变成页面横溢，也不能通过 overflow-hidden 丢掉操作或焦点。
- 复用库：React/ReactDOM、shadcn/Radix、Tailwind/CVA/clsx/tailwind-merge、Lucide/cmdk/sonner、Headless Tree/TanStack Virtual、panels、dnd-kit/react-grid-layout、既有 chart.js/activity-calendar/xterm。领域状态按 dev，服务可用 zustand/vanilla；不要求所有服务强行采用一种 store。版本查 package/lock，不把选型表当已安装事实。
- Git 差异采用 @pierre/diffs，真实入口为 `src/modules/versioning/ui/DiffSurface.tsx`、`ui/diff/MultiDiffView.tsx`、`ConflictDiffView.tsx` 与 `CompareEndpoints.tsx`（后三者均在 versioning/ui/diff）。不存在可通用导入的 DiffView；从所属模块真实端口组合。保留领域写入、端点/回执与只读浏览边界；parser/worker/虚拟化复用库，shadow DOM 仅通过 `--diffs-*`/批准 unsafeCSS token 桥接，不复制引擎或外部后代选择器穿透。现有 DiffSurface/MultiDiffView 通过 useDensityRowHeight 与内联 `--diffs-line-height` 将密度传入 Shadow，行/头/块分隔的虚拟度量同步；具体键盘与命中合同见 motion-a11y。
