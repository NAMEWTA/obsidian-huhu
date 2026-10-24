---
name: ui
description: >-
  添加、修改或审查本仓库工作台页面、面板、对话框、组件、主题或 CSS 时使用。
  负责布局、设计系统、动效与无障碍；模块装配和构建参照 dev。
  普通产品问答、界面使用说明和仅提到页面或主题的讨论不触发实现与验收流程。
license: LicenseRef-HUHU-1.0
metadata:
  short-description: 工作台界面、设计系统与主题
---

# 工作台界面

本技能只适用于本仓库。`dev` 技能负责分区、模块装配、设置存储、文案和构建；本技能负责界面在屏幕上的样子和行为。现行界面约束见[设计系统](../../../docs/design-system.md)。

界面已统一为 React；旧运行时、原语和迁移期样式已移除，不设置兼容运行时别名。

## 按任务读取

仅读取当前改动触及的参考和章节；不递归展开全部链接。下文流程用于界面实现，只读审查只核对适用约束。

| 要做的事 | 打开 |
|---|---|
| 添加页面，或修改图标轨、侧栏、页头、标签或专注模式 | [references/shell.md](references/shell.md) |
| 选择颜色、间距、圆角、组件或 CSS 做法 | [references/design-system.md](references/design-system.md) |
| 涉及主题样式、Markdown 样式或 设置 → 外观 | [references/theme.md](references/theme.md) |
| 做任何动画，或处理键盘、焦点、读屏 | [references/motion-a11y.md](references/motion-a11y.md) |
| 调用 Obsidian 的 DOM API 或编写 CSS | [../dev/references/obsidian-api.md](../dev/references/obsidian-api.md) |

## 整体形态

HUHU 只注册一个工作台视图。叶子由图标轨、可选侧栏和页面组成；状态指示显示在 Obsidian 自己的底部状态栏。模块贡献页面；shell（`src/shell/`）负责布局、功能导航、侧栏状态和页面生命周期。页面可用 `chrome: 'none'` 自绘顶部；智能体工作区在自己的页面内管理终端、智能体和浏览器标签及分屏，不新增叶子类型。具体尺寸和功能顺序见 `references/shell.md`。

| 需要 | 使用 |
|---|---|
| 用户导航到的一个界面 | 工作台页面（`PageCreate` → `ReactSurface`，继承 `NativeSurface`） |
| 第 ② 栏里供选择的一组对象 | 贡献的 `panel` 模型（`PanelModel`），由模块服务提供数据 |
| 设置 | 模块的 `settingsPage` 懒加载 React 组件，组合 `SettingsSection` / `SettingsRow` |
| 确认、重命名、选择 | `Dialog` / `AlertDialog` / `Popover`；整库模糊文件选择可用 Obsidian `FuzzySuggestModal` |
| 操作菜单 | `DropdownMenu` / `ContextMenu` |
| 临时消息 | HUHU 内用 sonner `toast`；工作台外的全局结果用 Obsidian `Notice` |
| 外观工作室、看板统计 | 按参考设计使用大 `Dialog`，内部分栏 |
| 智能体看板、用量统计 | 智能体工作区的页面标签（固定 id、重复打开只激活、重启恢复） |
| 自动化看板（列表、详情、运行记录、编辑器） | 图标栏上独立的工作台页面；编辑器是页内视图，有未保存修改时离开前页内确认 |
| 其他模块新建自动化（提醒、待办铃铛） | 自动化模块的 `AUTOMATION_COMPOSER` 服务弹出“新建自动化”对话框（`openReactDialog`），不自制对话框 |
| 批注查看与编辑 | 右侧栏视图和受控 Radix `Popover`，不贡献工作台页面 |

## 规则

1. 业务内容用 React 渲染（`ReactSurface`），每个页面一个根；关闭时 `root.unmount()`，隐藏时保留根并通过可见性暂停轮询。自定义侧栏通过 `createPortal` 渲染到 `navigationEl`；Radix 弹层进入所属窗口的 `.huhu-ui.huhu-portal-root`。
2. 页面只订阅所属模块的服务状态并发出动作；服务层 zustand 仓库拥有持久状态，组件不直接读写磁盘或修改仓库。临时界面状态可以放在组件里；有界的叶子状态通过 `getState()` / `stateKeys` 保存，业务持久化归属见 dev 架构参考。
3. 从元素取得窗口（`el.win`、`el.doc`）；绝不在模块顶层捕获 `window` 或 `document`。弹出窗口有自己的 document。
4. 用 `src/ui/components` 的 shadcn 组件和 Tailwind 工具类构建；允许的库见 `references/design-system.md`。照抄 Orca/apex 的布局与类名，替换数据和文案接口；不另造设计系统，不用 CSS-in-JS。
5. 颜色、CSS 隔离、层级和看板主题桥遵守 `references/design-system.md`；所有 React 根带 `.huhu-ui`，弹层也必须留在作用域内，不用 `!important`。
6. 每个可交互元素都是真正的按钮、输入框或 Radix 等价语义控件，有可访问名称，可通过键盘到达，并在 `:focus-visible` 时可见。目标至少 32px（触屏 44px）。
7. 动效只用 `transform` 和 `opacity`，采用 Obsidian 动效时长；减少动效下移除位移、缩放、旋转，细则见 `references/motion-a11y.md`。
8. 文字节点是测试的一部分：改样式时保持措辞和结构稳定。

## 流程

1. 按上面的表格决定放在哪里。如果是页面，按 `references/shell.md` 和 `../dev/references/module-authoring.md` 里的页面步骤做。
2. 文件放进模块的 `ui/` 文件夹：组件用 PascalCase（`InboxPanel.tsx`），逻辑和加载器用 kebab-case（`workbench-page.ts`）。
3. 组合 shadcn 组件，以 Tailwind 类布局；通用组合放进 `src/ui/components/huhu/`，类名用 `cn()` 合并。
4. 必须手写的 CSS 放在所属方并限定作用域；主题令牌与看板主题桥遵守设计系统的专用位置。按 [验证选择表](../dev/references/testing.md) 重建、检查和验收。
5. 局部视觉改动检查受影响的页面、状态与尺寸并截图；主题、全局布局或宿主边界变化按验证选择表扩展矩阵或使用真实 Obsidian。

## 检查清单

- [ ] 在 shell 的页面／侧栏槽位里；自绘顶部保留页面菜单和导航入口；没有新增叶子类型
- [ ] 关闭时卸载；使用元素所在的窗口
- [ ] 使用 shadcn、Tailwind 和令牌；根与 Portal 作用域正确；没有白名单之外的字面量颜色、`!important` 或自造层级
- [ ] 键盘可达、有名称、焦点可见；遵守减少动效
- [ ] 与改动风险相符的视觉、行为和无障碍检查通过
- [ ] 验证选择表要求的检查通过，受影响产物已更新

清单只适用于本次触及的行为；原语未变的局部调整不重验整个工作台。
