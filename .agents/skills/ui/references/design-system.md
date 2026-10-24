# 设计系统

[03 设计系统](../../../../docs/design-system.md)提供当前结构与复用入口，本文维护实施约定。精确令牌取值由 `src/ui/styles/tokens.css` 负责，Tailwind 映射见 `src/ui/tailwind/index.css`，组件变体和尺寸见 `src/ui/components/` 与 `src/ui/styles/base.css`；上游来源见[参考映射与许可](../../../../docs/references.md)。React 19 + shadcn/ui（new-york-v4）组件放在 `src/ui/components/`，HUHU 组合组件放在 `components/huhu/`；组件约定见 [ui 技能](../SKILL.md)。

## 令牌速查

令牌定义在 `src/ui/styles/tokens.css` 的 `.huhu-ui` 上，默认派生自 Obsidian 变量，经 `src/ui/tailwind/index.css` 的 `@theme inline` 映射。组件优先写语义工具类（如 `bg-card text-muted-foreground`），不直接写颜色值。

| 用途 | 令牌或工具类 |
|---|---|
| 页面、卡片、弹层 | `--background` / `--foreground`、`--card` / `--card-foreground`、`--popover` / `--popover-foreground` |
| 主操作、次要操作、弱化内容、悬停 | `--primary`、`--secondary`、`--muted`、`--accent` 及各自 `-foreground` |
| 危险、边线、输入、焦点 | `--destructive` / `--destructive-foreground`、`--border`、`--input`、`--ring` |
| 侧栏 | `--sidebar`、`--sidebar-foreground`、`--sidebar-accent`、`--sidebar-accent-foreground`、`--sidebar-border` |
| 状态、智能体等待、图表 | `--status-success`、`--status-warning`、`--status-error`、`--status-info`、`--status-working`、`--agent-question`、`--chart-1`～`--chart-5` |
| 字体 | `--nd-font-sans`（Geist + 中文系统回退）、`--nd-font-mono`（Geist Mono）；终端字体独立设置 |
| 圆角 | `--radius: 0.625rem`；`rounded-sm/md/lg/xl` = 6/8/10/14px，药丸用 `rounded-full` |
| 间距、字号 | 4px 基准；`text-3xs/2xs/xs/sm` = 10/11/12/14px；密集行 `text-[13px]`，数字 `tabular-nums` |
| 阴影 | 细线 → `shadow-xs` + 细线 → 弹层 `shadow-floating`，不另造层级 |
| 层级 | 粘性内容用规范指定的 `z-10`；拖拽、菜单、模态框、提示、通知分别用 `--layer-dragged-item`、`--layer-menu`、`--layer-modal`、`--layer-tooltip`、`--layer-notice`（如 `z-[var(--layer-menu)]`） |
| 动效 | `--anim-duration-fast`、`--anim-duration-moderate`；细则见 [动效与无障碍](motion-a11y.md) |

默认跟随 Obsidian；选择界面主题（设置 → 外观）后，`body.huhu-themed` 同时设置 Obsidian 变量和 `--nt-*` 令牌，`.huhu-ui` 令牌读取它们（`--card`、`--popover`、`--secondary`、`--accent`、`--chart-*` 等优先取 `--nt-*`，没有时回退到 Obsidian 变量），嵌套或直接挂在 body 下的 `.huhu-ui` 都命中同一套令牌，新增表面不要自己写主题分支。HUHU 没有单独的配色或 `data-palette` 属性。看板没有独立主题：`.huhu-dashboard-root` 把 `--db-*` 全部从这组全局令牌派生（`src/modules/home/ui/theme/tokens.css`），不要在看板里写十六进制颜色或新增主题。看板弹窗加 `huhu-dashboard-root` 以获得 `--db-*`，圆角、模糊等装饰覆盖由 `useDashboardAppearance` 镜像。字体由外观设置选择（`--huhu-font-*-user`），默认界面字体是 Geist。

## 组件清单

| 用途 | `src/ui/components/` |
|---|---|
| 操作与表单 | `Button`、`Input`、`Textarea`、`Label`、`Select`、`Switch`、`Checkbox`、`Slider`、`Progress` |
| 切换与容器 | `Toggle`、`ToggleGroup`、`Tabs`、`ScrollArea`、`Separator`、`Collapsible`、`Accordion`、`Resizable` |
| 菜单与选择 | `DropdownMenu`、`ContextMenu`、`Command`（cmdk） |
| 弹层 | `Tooltip`、`Popover`、`HoverCard`、`Dialog`、`Sheet`、`AlertDialog` |
| 展示与反馈 | `Badge`、`Card`、`Skeleton`、`Table`、`Toaster` / `toast`（sonner） |
| HUHU 组合 | `EmptyState`、`SettingsSection`、`SettingsRow`、`SettingsSwitchRow`、`SegmentedControl`、`SettingsBadge`、`StatusDot`、`AgentIcon`、`ObsidianIcon`、`ShortcutKeyCombo`、`RelativeTime`、`InlineRename`、`ConfirmDialog`、`PathPicker`（库内路径输入：模糊匹配建议、规范化为库根相对路径、拒绝 `..` 和隐藏目录；`VaultPathField` 绑定 `app.vault` 并在接受时创建缺失的文件夹）、`IconPicker`、`ColorField`、`NumberField` |

Button 变体为 `default/secondary/outline/ghost/link/destructive`；取消不是危险操作。图标用 `lucide-react`，只有用户配置的 Obsidian 图标名通过 `ObsidianIcon` 包装 `setIcon`。设置页用 React 设置行；自动化在独立看板的页内编辑器中编辑，其他模块通过统一服务弹出新建对话框，入口见[自动化设计](../../../../docs/automation.md)。外观工作室和统计沿用各自现有大对话框。可编辑批注浮窗用受控 `Popover`，不能用 `Tooltip` 或 `HoverCard` 装表单。

溢出规则：任何按钮、标签和工具栏都不得超出自己的容器，文字不得越过按钮边框。`Button` 把裸文字包进省略号标签（`min-w-0 overflow-hidden text-ellipsis`，换行与否继承按钮的 `white-space`），文字按钮带 `min-w-0 max-w-full`，只有图标或元素内容的按钮保持原有盒子；文字按钮只保留最小高度，最小宽度只给图标尺寸。文字按钮在行内保持自然宽度（不收缩，否则 `w-full` 输入框旁的按钮会被截断），所以一行放不下时由工具栏负责：用 `flex-wrap`，或把次要操作收进 `DropdownMenu`，或用容器查询（`@container`、`@max-[…]:`，不用视口断点）收成图标按钮并保留 `aria-label` 与 `Tooltip`。被省略号截断的文字必须有 `title` 或可访问名称。标签条（`ResourceTabs`、智能体标签条）的标签在最小与最大宽度之间收缩，超过最小宽度再横向滚动，滚动箭头只在真正溢出时出现。验收用 `scripts/obsidian-acceptance/overflow-audit.mjs`（逐页遍历按钮与标签，窄宽度、中英文、亮暗与 Minimal 下违规必须为 0）和 `pnpm test:ui-styles` 的溢出样例。

保留上游 Tailwind 类名与 `data-slot`；类名由 `cn()` 合并，调用方 `className` 最后传入。`tailwind-merge` 登记自定义字号 `2xs/3xs`，防止与文字颜色类冲突。表单关联 Label 和说明；IME 组合期间不响应 Enter 提交。可访问名称、焦点和触控尺寸见动效与无障碍参考。

## CSS 与 Portal

隔离算法见 [02 架构文档 §5](../../../../docs/architecture.md)：

- 所有 React 根带 `.huhu-ui`；Tailwind 输出展开 `@layer`，顶层选择器追加 `:is(.huhu-ui, .huhu-ui *):not(#\#)`，把 `:root/:host` 变量限定到 `.huhu-ui`。保留上游类名，不添加类名前缀。
- 中和层只清除 HUHU 作用域内的宿主表单样式，跳过 `.markdown-rendered`、`.huhu-native`、`.cm-editor`。Obsidian `MarkdownRenderer` 的外层加 `huhu-native`。
- 每个 Document 共用按引用计数管理的 `div.huhu-ui.huhu-portal-root`（`display: contents`）。Radix 的所有 Portal 和 sonner 均使用所属窗口的容器；最后一个使用者释放时移除。
- 能用 Tailwind 就不手写 CSS。xterm、CodeMirror、动画关键帧等作者 CSS 放在所属模块的 `styles/`，以 `.huhu-ui` 或模块根类限定。主题令牌和看板主题放在各自专用文件。
- 字面量颜色只在 `src/theme/`、令牌层和获准的看板主题文件中出现；模块布局只用语义令牌。不用 `!important`，不自造裸数字 z-index；粘性元素的 `z-10` 是规范指定例外。
- `pnpm run lint:css` 检查作者 CSS，手写规则不使用 `:has`；上游 Tailwind 的 `has-*` 变体随生成产物保留。`build/tailwind.scoped.css` 和 `src/ui/styles/fonts.generated.css` 不参与作者样式检查。构建顺序见 [构建参考](../../dev/references/build-and-release.md)。

## 允许的库

| 用途 | 允许 |
|---|---|
| 运行时与组件 | `react`、`react-dom`（19 系列）、`radix-ui`、shadcn/ui 源码 |
| 样式与变体 | `tailwindcss` / `@tailwindcss/cli`（v4）、`tw-animate-css`、`class-variance-authority`、`clsx`、`tailwind-merge` |
| 图标、搜索、提示 | `lucide-react`、`cmdk`、`sonner` |
| 状态 | `zustand`；服务层只用 `zustand/vanilla`，分区规则见 dev 架构参考 |
| 拖拽、虚拟列表、分屏 | `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`、`@tanstack/react-virtual`、`react-resizable-panels`、`react-grid-layout`（看板小组件网格） |
| 树 | `@headless-tree/core`、`@headless-tree/react`（经 `src/ui/components/tree.tsx` 使用） |
| 专用渲染 | chart.js（按需加载图表）、`react-activity-calendar`（日历热力图）、xterm.js / `@xterm/*`（终端） |
| 宿主集成 | Obsidian `MarkdownRenderer`、`FuzzySuggestModal`、工作台外 `Notice`、原生设置入口与菜单适配 |

不引入第二套界面库（MUI、Chakra、Ant Design、Bootstrap 等）或 CSS-in-JS。组件来源、版权注释、字体许可和分发声明见 [许可参考](../../dev/references/licensing.md)。
