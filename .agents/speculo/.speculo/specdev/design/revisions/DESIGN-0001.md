---
schema_version: 1
artifact: "project-design"
revision: "DESIGN-0001"
owner: "specdev/archive-and-consolidate"
scope: ["huhu.workbench"]
tokens: {"rail_width": "52px", "sidebar_default_width": "280px", "sidebar_min_width": "220px", "sidebar_max_width": "500px", "standard_header_height": "44px", "spacing_unit": "4px", "control_min_desktop": "32px", "control_min_touch": "44px", "focus_ring": "3px", "font_ui": "Geist + 系统中文字体", "font_terminal": "GeistMono + 系统等宽字体", "background": "var(--background-primary)", "foreground": "var(--text-normal)", "muted": "var(--text-muted)", "border": "var(--background-modifier-border)", "primary": "var(--interactive-accent)", "primary_foreground": "var(--text-on-accent)"}
rules: [{"id": "DS-001", "statement": "工作台继承 HUHU 的工具轨、可调整侧栏和主工作区；宿主状态显示归 Obsidian 状态栏，不新增工作台全局页脚。", "scope": ["huhu.workbench"], "verification": "approved-intent", "sources": []}, {"id": "DS-002", "statement": "颜色按 Obsidian 语义 token 适配主题；原型的独立预览回退颜色不能覆盖生产宿主主题。", "scope": ["huhu.workbench"], "verification": "approved-intent", "sources": []}, {"id": "DS-003", "statement": "高密度操作继承项目共享按钮、标签、表单、分隔、Dialog 与 Sheet；图标需可访问名称，状态不能只用颜色表达。", "scope": ["huhu.workbench"], "verification": "approved-intent", "sources": []}, {"id": "DS-004", "statement": "容器宽度至少 960px 时可常驻侧栏，600–959px 保留工具轨并使用侧栏浮层，低于 600px 用合并导航 Sheet；工具内容可另按可用空间收为浮层。", "scope": ["huhu.workbench"], "verification": "approved-intent", "sources": []}, {"id": "DS-005", "statement": "保留可见键盘焦点、语义标签、弹层焦点约束与返回；支持长文本、200% 缩放和 reduced motion，布局适配不代表移动端原生能力获支持。", "scope": ["huhu.workbench"], "verification": "approved-intent", "sources": []}, {"id": "DS-006", "statement": "标签切换不加切场动画；必要动效仅使用 transform/opacity，并在 reduced motion 下停用。", "scope": ["huhu.workbench"], "verification": "approved-intent", "sources": []}]
sources: [{"id": "huhu-ui", "locator": "docs/design-system.md", "revision": "66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"}, {"id": "huhu-shell", "locator": "src/modules/agent/ui/workspace/WorkspaceLayout.tsx", "revision": "66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"}, {"id": "huhu-tokens", "locator": "src/ui/styles/tokens.css", "revision": "66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"}, {"id": "ui-skill", "locator": ".agents/skills/ui/SKILL.md", "revision": "66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"}]
supersedes: null
updated_at: "2026-10-25T02:58:06Z"
---

# HUHU 工作台设计基线候选

## 范围与来源

本基线只提取现有 HUHU 工作台可复用的布局、主题、共享控件与可访问性规则。面向桌面 Obsidian 中的高密度操作任务，不建立新品牌，不扩大为全插件所有业务页面规范。

原权威仍为 `docs/design-system.md`、UI Skill 与实际组件源码；本文是只读提取后的设计意图。源码检测不等于已经观察生产页面，也不将当前 change 的模拟终端状态称作已实现。规则的 `approved-intent` 表示意图层级；只有通过 A 网关发布的版本才成为正式基线。

## 颜色、文字与层级

语义颜色绑定宿主变量，明暗主题由宿主决定。状态沿用 green/orange/red/blue/yellow 语义，并配状态文字。Geist 用于界面，GeistMono 用于终端、身份和命令，中文沿用系统回退，数字可使用等宽数码。不得把原型的独立回退色变为固定宿主颜色。

## 布局、间距与形状

工具轨、侧栏、主工作区承担导航、对象选择与操作。侧栏默认与范围使用 frontmatter token；具体预览可显示这个范围内的用户调整结果。间距按 4px 网格，圆角与分隔使用共享组件，不以卡片墙替代已有列表。标准标题栏使用现有高度；Agent 自管理的标签、面板头仍由其组件负责。

层级通过表面、边框、焦点和有限浮层表达。宿主边框、页签与状态栏属于 Obsidian；原型可模拟宿主边框帮助理解，但不将它们作为 HUHU 新增 UI。

## 控件、状态与输入

采用现有 Button、Input、Select、Dialog、Sheet、Tabs、Tooltip 和可调整面板的使用方式。错误保留有效数据，提供明确重试或退出；不以短暂 toast 代替需要持续处理的失败。破坏运行的操作明确对象和影响。触屏交互至少保证点击目标，不因窄屏演示而承诺新的平台能力。

DS-001–DS-006 是复用规则；某个 change 的页面名称、Agent 协作语义、数据模型、原型 fixture、颜色回退数值和特殊控制布局均不提升为永久业务规则。本文不接管已有文档 owner。
