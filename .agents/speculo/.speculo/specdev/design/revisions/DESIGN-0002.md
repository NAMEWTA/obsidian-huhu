---
schema_version: 1
artifact: project-design
revision: DESIGN-0002
owner: specdev/archive-and-consolidate
scope:
  - huhu.plugin
  - huhu.workbench
tokens:
  rail_width: 52px
  sidebar_default_width: 280px
  sidebar_min_width: 220px
  sidebar_max_width: 500px
  standard_header_height: 44px
  spacing_unit: 4px
  control_min_desktop: 32px
  control_min_touch: 44px
  focus_ring: 3px solid var(--interactive-accent)，offset 1px
  font_ui: Geist 加系统中文回退（PingFang SC、Microsoft YaHei、Noto Sans CJK SC）
  font_terminal: GeistMono + 系统等宽字体
  background: var(--background-primary)
  foreground: var(--text-normal)
  muted: var(--text-muted)
  border: var(--background-modifier-border)
  primary: var(--interactive-accent)
  primary_foreground: var(--text-on-accent)
  font_mono: Geist Mono 加系统等宽
  font_size_page: 20px
  font_size_title: 16px
  font_size_body: 14px
  font_size_dense: 13px
  font_size_meta: 12px
  line_height_body: 1.5
  space_unit: 4px
  space_scale: 4/8/12/16/20/24/32px
  control_height_sm: 32px
  control_height_md: 36px
  control_height_lg: 40px
  hit_target_desktop: 32px
  hit_target_touch: 44px
  radius_badge: 6px
  radius_control: 8px
  radius_panel: 12px
  radius_dialog: 14px
  radius_switch_checkbox: switch 为全圆；checkbox 5px；radio 全圆
  muted_foreground: var(--text-muted)
  surface_muted: var(--background-secondary)
  surface_hover: var(--background-modifier-hover)
  border_decorative: var(--background-modifier-border)
  border_control: 不低于背景 3:1，预览回退 86867f / 8d8d86
  status_success: var(--color-green)
  status_warning: var(--color-orange)
  status_error: var(--color-red)
  status_info: var(--color-blue)
  status_working: var(--color-yellow)
  motion_duration: 120ms
  motion_properties: background-color、border-color、color、opacity、transform
  motion_forbidden: "transition: all；hover 改变尺寸；持续循环动画（加载旋转与骨架脉冲除外）"
  shadow_overlay: 仅 Popover、Menu、Dialog、Sheet、Toast 使用单层柔和阴影；窄容器占位 toast 无阴影
  contrast_text: 4.5:1
  contrast_large_and_nontext: 3:1
rules:
  - id: DS-001
    statement: 工作台继承 HUHU 的工具轨、可调整侧栏和主工作区；宿主状态显示归 Obsidian 状态栏，不新增工作台全局页脚。
    scope:
      - huhu.workbench
    verification: approved-intent
    sources: []
  - id: DS-002
    statement: 颜色按 Obsidian 语义 token 适配主题；原型的独立预览回退颜色不能覆盖生产宿主主题。
    scope:
      - huhu.plugin
    verification: approved-intent
    sources:
      - change: 2026-10-31-dev-stabilization-overhaul
        locator: prototypes/UI-001/evidence/review-decisions.md
        digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
  - id: DS-003
    statement: 高密度操作继承项目共享按钮、标签、表单、分隔、Dialog 与 Sheet；图标需可访问名称，状态不能只用颜色表达。
    scope:
      - huhu.plugin
    verification: approved-intent
    sources:
      - change: 2026-10-31-dev-stabilization-overhaul
        locator: prototypes/UI-001/evidence/review-decisions.md
        digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
  - id: DS-004
    statement: 容器宽度至少 960px 时可常驻侧栏，600–959px 保留工具轨并使用侧栏浮层，低于 600px 用合并导航 Sheet；工具内容可另按可用空间收为浮层。
    scope:
      - huhu.workbench
    verification: approved-intent
    sources: []
  - id: DS-005
    statement: 保留可见键盘焦点、语义标签、弹层焦点约束与返回；支持长文本、200% 缩放和 reduced motion，布局适配不代表移动端原生能力获支持。
    scope:
      - huhu.plugin
    verification: approved-intent
    sources:
      - change: 2026-10-31-dev-stabilization-overhaul
        locator: prototypes/UI-001/evidence/review-decisions.md
        digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
  - id: DS-006
    statement: "标签切换不加切场动画；保留 120ms 颜色过渡、必要的 transform/opacity、加载旋转和骨架脉冲；减少动效时停用过渡与循环动画，不用 transition: all 或 hover 尺寸变化。"
    scope:
      - huhu.plugin
    verification: approved-intent
    sources:
      - change: 2026-10-31-dev-stabilization-overhaul
        locator: prototypes/UI-001/evidence/review-decisions.md
        digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
  - id: DS-007
    statement: 内容优先，以 A 的行内主操作列表为主要方向；标识符用等宽，低密度设置可用 B 的分组表面；不把运行、编辑等主操作藏进展开区。
    scope:
      - huhu.plugin
    verification: approved-intent
    sources:
      - change: 2026-10-31-dev-stabilization-overhaul
        locator: prototypes/UI-001/evidence/review-decisions.md
        digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
  - id: DS-008
    statement: 4px 间距网格；控件高度 32/36/40px，默认 36px，桌面命中区至少 32px、触控至少 44px；徽标/控件/面板/对话框圆角 6/8/12/14px，checkbox 5px，仅 switch/radio 全圆。
    scope:
      - huhu.plugin
    verification: approved-intent
    sources:
      - change: 2026-10-31-dev-stabilization-overhaul
        locator: prototypes/UI-001/evidence/review-decisions.md
        digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
  - id: DS-009
    statement: 列表按内容容器宽度响应：不大于 480px 堆叠，介于 480 与 760px 两列，至少 760px 表格式；与工作台 600/960px 断点并存；长名称、日期及主操作保持可读可达。
    scope:
      - huhu.plugin
    verification: approved-intent
    sources:
      - change: 2026-10-31-dev-stabilization-overhaul
        locator: prototypes/UI-001/evidence/review-decisions.md
        digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
  - id: DS-010
    statement: 初载、刷新、空态、无结果、忙碌、失败、离线、未配置、只读、取消与不确定状态分别呈现；失败保留输入和有效数据，持续状态不能仅用 toast；不大于 480px 的容器中 toast 必须在内容顶部占位。
    scope:
      - huhu.plugin
    verification: approved-intent
    sources:
      - change: 2026-10-31-dev-stabilization-overhaul
        locator: prototypes/UI-001/evidence/review-decisions.md
        digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
  - id: DS-011
    statement: 工具审批显式显示对象、范围和风险；只提供批准一次和拒绝，不提供总是允许；提交中防重复，不确定时禁止重复批准并提供核对入口。
    scope:
      - huhu.plugin
    verification: approved-intent
    sources:
      - change: 2026-10-31-dev-stabilization-overhaul
        locator: prototypes/UI-001/evidence/review-decisions.md
        digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
  - id: DS-012
    statement: 终端的停止未确认、清理失败和异常退出持续显示并提供检查/重试入口；技术细节按需展开，状态变化不重建终端实例，不丢输入、选择或滚动。
    scope:
      - huhu.plugin
    verification: approved-intent
    sources:
      - change: 2026-10-31-dev-stabilization-overhaul
        locator: prototypes/UI-001/evidence/review-decisions.md
        digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
  - id: DS-013
    statement: 正文与密集信息至少 13px，辅助信息 12px；普通文字对比度至少 4.5:1，大字及适用控件边界和焦点至少 3:1；区域通过标题命名，保留图标按钮的名称与可见焦点。
    scope:
      - huhu.plugin
    verification: approved-intent
    sources:
      - change: 2026-10-31-dev-stabilization-overhaul
        locator: prototypes/UI-001/evidence/review-decisions.md
        digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
sources:
  - id: huhu-ui
    locator: docs/design-system.md
    revision: 66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93
  - id: huhu-shell
    locator: src/modules/agent/ui/workspace/WorkspaceLayout.tsx
    revision: 66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93
  - id: huhu-tokens
    locator: src/ui/styles/tokens.css
    revision: 66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93
  - id: ui-skill
    locator: .agents/skills/ui/SKILL.md
    revision: 66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93
  - id: baseline-design-0001
    locator: .agents/speculo/.speculo/specdev/design/revisions/DESIGN-0001.md
    revision: DESIGN-0001
    digest: 50f0d924ee393fddca02d4765bd2d7bb49ba70f5e9f3bbf08ac20456b1cd651f
  - id: ui-001-approved-decisions
    locator: .agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/evidence/review-decisions.md
    digest: 1b283863ac032e84d45bcb15d175b2a71b890507bf2870fb52b34e4782735341
supersedes: DESIGN-0001
updated_at: 2026-10-31T05:14:27.748Z
---

# HUHU 全插件设计基线

## 范围与验证等级

本版本继承 DESIGN-0001 的工作台布局，并将共享视觉、交互及可访问性规则覆盖到全插件。当前所有规则均为用户已批准的设计意图（approved-intent），不是已实现或已通过真实 Obsidian 验收。原版本不可变快照保留，当前版本只经 A 网关发布。

## 规则级变更

- 保留 DS-001（宿主布局边界）与 DS-004（工作台 600/960 断点）及其工作台范围。
- DS-002、DS-003、DS-005 的共享颜色、控件、键盘规则扩展到全插件。
- DS-006 按用户决定增加 120ms 颜色过渡及加载例外，并在减少动效下全部停用；这是对旧版“仅 transform/opacity”的显式替代。
- 新增 DS-007–DS-013，固定方向、尺寸、圆角、内容容器布局、反馈、审批和终端持续状态。
- A 为整体方向；B/C 仅借用分组表面与等宽标识符，不提升其展开式主操作或紧凑表格为默认。

## 来源与实施边界

沿用 DESIGN-0001 的代码与项目规范来源；本轮九项决定来自 .agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/evidence/review-decisions.md。细节与六个页面见该 change 的 DESIGN.md，HTML 仅为离线虚构数据原型。既有 docs/design-system.md 与 UI Skill 记录现行实现；后续 T-23–T-36 按批准合同实施并同步实际规范，不在本次原型批准中改动生产代码。

工作台布局不扩展为第二套运行时；不更改加密、剪贴板、xterm、diff 引擎或持久化规则。真实触屏、输入法、用户主题与宿主集成由后续实施验收负责。
