# 动效与无障碍

当前输入、焦点与反馈机制见 [03 设计系统](../../../../docs/design-system.md)，shell 的尺寸和焦点区域见 [shell.md](shell.md)。本文维护对应实施约定，具体实现和验证范围如下。

## 动效

- 只对 `transform` 和 `opacity` 做动画，不对宽度、高度、网格轨道或内边距做动画。
- 时长用 Obsidian 的 `--anim-duration-fast` 和 `--anim-duration-moderate`，实际数值跟随宿主变量，可通过 Tailwind 与 `tw-animate-css` 应用；映射见 `src/ui/styles/base.css` 与 `src/ui/tailwind/index.css`。
- 布局先提交最终尺寸，再用位移表现过渡；终端等需要测量的内容在动效结束后适配一次，不逐帧重排。终端和浏览器标签切换不做动画，输入与终端输出的热路径不加动画。
- `prefers-reduced-motion: reduce` 下，`src/ui/styles/base.css` 在 HUHU 作用域关闭 CSS animation、transition 和平滑滚动，包括淡入淡出；转圈显示静止的工作中图形。脚本滚动用所属窗口的 `matchMedia` 决定 `auto` 或 `smooth`。
- 按钮异步操作预留宽度，避免文字变化导致跳动；按实际操作状态提供禁用态、阶段文字或可确定的进度，错误保留重试入口。

## 键盘

| 位置 | 按键与行为 |
|---|---|
| Shell | F6 / Shift+F6 在图标轨、侧栏、页面之间循环，跳过隐藏区域 |
| 图标轨、侧栏 | 方向键、Home/End 移动；Enter/Space 激活（按控件语义） |
| 侧栏分隔条 | 方向键调整宽度，Home/End 到两端 |
| 覆盖层、Sheet、Dialog | Radix 管理 Esc、焦点约束和关闭后的焦点恢复，使用所属窗口 Portal |
| 工作区标签条 | 方向键、Home/End 选择，Delete 和中键关闭 |
| Command / 菜单 / Select | 使用 cmdk 或 Radix 的键盘模型，不另写一套点击列表 |
| 表单 | 打开时聚焦主输入；IME 组合期间不执行 Enter 提交；批注 Ctrl/Cmd+Enter 保存 |

全局命令不设默认快捷键；组件内快捷键与提示必须一致。编辑批注时 Esc 先取消编辑，再关闭浮窗；未保存内容不因鼠标离开丢失。

## 语义与焦点

- 图标轨是 `nav`，侧栏是 `aside`，页面是 `main`。当前功能用 `aria-current`；有侧栏的开关用 `aria-expanded`。
- 使用真正的 `button/input` 或 Radix 提供的等价语义控件。列表采用 `listbox/option` 或 `menu/menuitem`；分组有标题关联。
- 图标按钮同时提供 `aria-label` 和 Tooltip（`TooltipTrigger asChild`）；表单 Label、说明与错误分别关联，帮助文字用 `aria-describedby`，错误用 `aria-invalid`。
- 保留共享组件的可见键盘焦点。Button/Input 默认使用 `:focus-visible` 的 `ring-[3px] ring-ring/50`，Accordion 使用 2px，Textarea 的 cell 变体使用 1px；按 `src/ui/components/` 的现有变体复用。菜单的键盘高亮、当前项与悬停态沿用共享 DropdownMenu、ContextMenu、Command 和 Select，不能仅删除焦点提示。
- 路由变化通过 polite 实时区域播报；忙碌提示 `role="status"`，错误 `role="alert"`。
- 隐藏页面保持 `hidden` + `inert`，关闭弹层恢复到仍存在的触发器。弹出窗口内的焦点、计时器和监听器始终属于该窗口。

## 尺寸与对比度

- 桌面点击区域至少 32px，触屏至少 44px。24～28px 的视觉图标通过布局或伪元素扩大点击区域，不与相邻目标重叠。
- 状态必须同时有图标或文字，不只靠颜色。`src/theme/presets.test.ts` 遍历已声明界面主题和编辑器方案的亮/暗令牌组合：正文在页面背景至少 7:1、卡片和侧栏至少 4.5:1，次要文字至少 4.5:1，指定淡色文字至少 3:1；编辑器文字在各同模式主题及指定 Obsidian/Minimal 参考背景上至少 4.5:1。具体表面、状态与阈值以测试为准，自定义推导另见 `custom.test.ts`。这些静态颜色检查不证明所有宿主主题和实际交互表面都已验收；淡色文字仅用于非必要内容。新令牌和组件需检查亮暗、社区主题及实际背景/状态的对比度，看板仍复用全局令牌，不新增独立主题。
- 原生 Markdown 保留其宿主语义与样式，外层 `huhu-native` 防止中和层破坏原生控件。
