# HUHU 设计系统

界面使用 React 19、Tailwind CSS 4、shadcn/ui 与 Radix。共用组件位于 src/ui/components，HUHU 组合位于 components/huhu；不引入第二套组件库或 CSS-in-JS。精确实施约定见[界面技能](../.agents/skills/ui/SKILL.md)及[设计系统参考](../.agents/skills/ui/references/design-system.md)。

## 表面与布局

工作台由图标轨、可选侧栏和页面组成，模块贡献内容；状态显示在 Obsidian 自己的状态栏。新增和编辑沿用现有 Dialog、Popover、DropdownMenu 与 SettingsRow；统计使用已有图表和分析组件。业务状态由服务拥有，组件只订阅并发出动作。

## 令牌与隔离

颜色、字重、圆角、间距、阴影与层级使用语义令牌。huhu-ui 作用域派生宿主颜色，选择主题后由全局主题桥提供一致变量；看板继承同一组令牌，不另设独立主题。字体本地内嵌并保留 OFL。

Tailwind 产物展开层并限定到作用域；中和层跳过 Markdown、CodeMirror 和 huhu-native。弹层进入所属 Document 的 huhu-ui / huhu-portal-root 容器，不能使用全局 window 捕获另一个窗口。

## 可访问性与响应式

可交互项有真实按钮/输入语义、名称、键盘路径和可见焦点；桌面目标至少 32px，触屏 44px。文字按钮允许省略，长行由工具栏换行或收入菜单；窄看板依据容器尺寸调整。仅使用 transform/opacity 动效并尊重减少动效设置。亮暗模式、窄宽度、弹窗和多窗口按实际影响验收。

## 来源

Orca、shadcn/ui、apex-dashboard、主题和字体的使用方式均在[来源说明](references.md)与根 README 列出，实际改编保留原版权，不以功能致敬代替来源声明。
