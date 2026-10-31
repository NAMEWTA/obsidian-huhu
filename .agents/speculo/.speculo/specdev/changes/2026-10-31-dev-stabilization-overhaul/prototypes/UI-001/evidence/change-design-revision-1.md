---
schema_version: 1
artifact: change-design
change: 2026-10-31-dev-stabilization-overhaul
revision: 1
status: approved
scope:
  - huhu.plugin
baseline:
  revision: DESIGN-0002
  digest: ef5e5080f6c1a8f967397af72fca0050820b9ad4d9a4f57451be3a63ab55b2b1
prototype_ref:
  id: UI-001
  digest: 879ff0e8a5cfb47851e78f3a175003310a79a779058eed401782eec306f3e2c2
selection:
  candidate_id: candidate-a
tokens:
  font_ui: Geist 加系统中文回退（PingFang SC、Microsoft YaHei、Noto Sans CJK SC）
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
  background: var(--background-primary)
  foreground: var(--text-normal)
  muted_foreground: var(--text-muted)
  surface_muted: var(--background-secondary)
  surface_hover: var(--background-modifier-hover)
  border_decorative: var(--background-modifier-border)
  border_control: 不低于背景 3:1，预览回退 86867f / 8d8d86
  primary: var(--interactive-accent)
  primary_foreground: var(--text-on-accent)
  status_success: var(--color-green)
  status_warning: var(--color-orange)
  status_error: var(--color-red)
  status_info: var(--color-blue)
  status_working: var(--color-yellow)
  focus_ring: 3px solid var(--interactive-accent)，offset 1px
  motion_duration: 120ms
  motion_properties: background-color、border-color、color、opacity、transform
  motion_forbidden: "transition: all；hover 改变尺寸；持续循环动画（加载旋转与骨架脉冲除外）"
  shadow_overlay: 仅 Popover、Menu、Dialog、Sheet、Toast 使用单层柔和阴影；窄容器占位 toast 无阴影
  contrast_text: 4.5:1
  contrast_large_and_nontext: 3:1
pages:
  - id: UI-GALLERY
    route: final/index.html#gallery
    task: 逐个评审基础控件在全部状态下的外观与交互
    states:
      - default
      - hover
      - focus-visible
      - active
      - disabled
      - busy
      - error
      - read-only
      - selected
      - indeterminate
    acceptance:
      - AC-351
      - AC-352
      - AC-353
  - id: UI-LIST
    route: final/index.html#list
    task: 在约 420px 窄容器内读长名称并保持启停、运行、编辑可达；创建任务并完整读到 Through 日期；运行完成后读通知
    states:
      - wide
      - container-600
      - container-420
      - long-name
      - through-date
      - name-snapshot-notice
      - empty
      - no-results
      - loading
      - error-keeps-input
    acceptance:
      - AC-231
      - AC-241
      - AC-262
      - AC-351
      - AC-352
  - id: UI-SAFE
    route: final/index.html#safe
    task: 编辑含多账户与长备注的保险箱条目，并安全地执行危险操作
    states:
      - locked
      - unlocked
      - long-notes
      - optional-fields
      - generate-copy
      - danger-confirm
      - unsaved-guard
    acceptance:
      - AC-351
      - AC-352
  - id: UI-HOME
    route: final/index.html#home
    task: 浏览 Home 看板与小组件，理解天气七态与音乐账号后台恢复，鼠标悬停空白处不出现整块提示
    states:
      - weather-unconfigured
      - weather-waiting
      - weather-loading
      - weather-cached-refreshing
      - weather-success
      - weather-offline
      - weather-invalidated
      - region-naming
      - music-restoring
    acceptance:
      - AC-211
      - AC-221
      - AC-351
      - AC-352
  - id: UI-BOT
    route: final/index.html#bot
    task: 阅读流式消息，在审批卡中看清对象、范围与风险后作出决定，并处理失败与不确定状态
    states:
      - streaming
      - approval-pending
      - approval-busy
      - approved
      - denied
      - failed-retry
      - uncertain
      - composer-ime
    acceptance:
      - AC-351
      - AC-352
  - id: UI-TERMINAL
    route: final/index.html#terminal
    task: 区分终端的简洁状态与需要判断的状态，并按需展开技术详情
    states:
      - normal
      - stopping
      - stop-unconfirmed
      - cleanup-failed
      - abnormal-exit
      - details-expanded
    acceptance:
      - AC-201
      - AC-202
      - AC-351
      - AC-352
overrides: []
confirmation:
  by: user
  at: 2026-10-31T05:14:27.748Z
  record: prototypes/UI-001/evidence/approval.md
  digest: 4f0e23702e4f78f0f46fe0f0426dc281b0ecc72cfbe6167811bf6d10162162b0
  record_digest: 93923a3b35f010644d7b3085f946a44fb2da177460191928025fc829567a8582
updated_at: 2026-10-31T05:14:27.748Z
---

# Change Design: HUHU 全插件 UI 统一（#37 W6）

本文件是当前 change 的视觉与交互合同，由 P 拥有；用户已确认九项推荐，批准来源与摘要绑定见 confirmation；这里只规定设计意图，不表示生产实现完成。可运行证据在 `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/`，页面入口均相对该目录。

## Scope and Baseline

- **用户、任务与成功条件：** 在 Obsidian 桌面端高频使用 HUHU 工作台的单个用户。成功条件：同类操作在全部模块外观与行为一致；关键名称与主操作在 420px 容器内始终可见可达；所有异步状态由真实业务投影驱动；亮暗主题、中英文、长文本、200% 缩放、键盘与 reduced-motion 均可用（AC-351 至 AC-353）。
- **页面模式：** 操作型为主（列表、表单、终端、审批）；Home 为信息浏览；不含转化型营销页面。
- **基线：** 固定 DESIGN-0002（全插件），继承 DESIGN-0001 的 DS-001/DS-004 工作台边界，并合并 DS-002/003/005/006 与新增 DS-007–DS-013。DS-006 明确允许 120ms 颜色过渡、加载旋转和骨架脉冲，减少动效时关闭；不是旧版“仅 transform/opacity”原文不变。新版本由 A 网关按本轮明确授权发布；发布过程及例外见 `prototypes/UI-001/evidence/publication-receipt.json`。
- **明确保持项：** 语义令牌命名与 Obsidian 变量绑定；shadcn/Radix 组件集合；工具轨、侧栏、主区三栏；不改变加密、剪贴板策略、xterm、diff 引擎与存储；不引入第二套 UI 运行时或图表库（LOG-007）。
- **排除项与用户约束（LOG-007）：** 不用紫蓝霓虹渐变、发光边线、大面积玻璃模糊、卡片套卡片、巨大欢迎标题、持续跳动动画；不用 `transition: all`；hover 不改变元素尺寸；不把所有控件做成药丸形。ADR-001：不保留兼容层，可直接删除 `--db-*` 旧别名。
- **产品/架构来源：** `spec.md` 的 AC-201、AC-202、AC-211、AC-221、AC-231、AC-241、AC-262、AC-351 至 AC-353；`ADR.md` ADR-001；`LOG.md` 的 LOG-007、LOG-011、LOG-013；`source.md` §9.2 至 §9.7 与 §10。

## Selected Direction

**采用 candidate-a：均衡圆润的内容优先工作台**（用户已确认，组合 C 的等宽 ID 与 B 的低密度分组）。主模板 cross-platform-workspace，参考 Notion 的中性表面与分组方式，Linear 只提供行节奏与密度；Galaxy、Radix Themes、Primer 仅作比例与交互参考，未下载、未复制代码。

- **首屏结构：** 面向内容的单栏工作区；页面标题加一句说明，工具栏（搜索、筛选、新建），内容列表或表单，最后是辅助面板。不设大型欢迎区。
- **主要路径：** 列表行内同时呈现名称、元数据与启停/运行/编辑；通知详情在下方面板；表单按“基础、账户、可选、危险”分段；终端与审批在原位显示状态而不是弹出。
- **内容层级：** 表面层级只有三级（页面底、内容面、浮层）；用 1px 装饰边框与不超过一层的阴影表达层级；强调色仅用于主操作、选中与焦点。
- **候选取舍：** candidate-b 把运行/编辑收进展开区，与 AC-241“主操作可见”冲突；candidate-c 命中区仅 32px 且偏控制台。二者的可取之处可组合：c 的等宽标识符样式、b 的分组表面用于低密度设置页。

## Tokens and Components

frontmatter 的 tokens 是本次解析后的精确值，CSS 是可运行投影，原型中的 `.huhu-ui` 之外没有第二套规则。

- **字体：** 界面字体 Geist 加系统中文回退，等宽用于终端、ID、命令与路径。页面标题 20px，区块标题 16px，正文 14px，密集列表 13px，辅助信息 12px；正文与密集列表不低于 13px，仅辅助信息用 12px，关键内容不压到 10 至 11px；行高 1.5，不使用负字距。
- **间距：** 4px 网格；区块间 16 至 20px，控件间 8px，行内元素间 4 至 8px。
- **控件高度与命中区：** 32、36、40px；默认控件 36px；桌面命中区至少 32px；触控模式（粗指针或手动开启）统一 44px。图标按钮是方形，宽等于高。
- **圆角：** 徽标与小标签 6px，控件 8px，面板与列表容器 12px，Dialog 与 Sheet 14px；switch 与 radio 是全圆，checkbox 5px。不把所有控件做成药丸。
- **色彩与层级：** 全部颜色经语义令牌读取 Obsidian 变量（DS-002）；状态色 success、warning、error、info、working 对应 green、orange、red、blue、yellow，状态徽标同时有图标或圆点与文字。预览用的回退色仅供独立评审，生产不得固定。装饰性分隔线使用低对比的 border，控件边界使用不低于 3:1 的 input 边框。
- **阴影与层级：** 仅 Popover、Menu、Dialog、Sheet、Toast 使用单层柔和阴影；页面内部用边框而不是阴影。
- **共享组件边界：** 基础控件继续在 `src/ui/components`，产品组合在 `components/huhu`；需要至少两个真实使用场景才抽取组合。本原型的 Button、Field、Check/Radio/Switch、Tabs、Badge、Banner、Empty、Skeleton、Dialog、Sheet、Popover、Menu、Tooltip、Table、SettingsRow、WidgetPanel 可一一映射为现有组件的变体；`asChild`、`data-slot`、className 合并、IME 保护等行为在实现票中以等价测试保持（W6.5）。

## Pages and Interaction

每个页面的入口都是 `final/index.html` 的 hash 路由，可通过顶部导航或直接访问；`?` 参数可预置语言、主题、容器宽度、状态（例如 `#terminal?term=unconfirmed&details=1`）。评审导航直接切换页面，即使宿主禁止 URL 修改也能工作；支持键盘按钮和 URL 深链接。所有数据为虚构，状态是内存模拟，不证明真实服务或性能。

### UI-GALLERY（AC-351、AC-352、AC-353）

- 覆盖 Button 与图标按钮、Input、Textarea、日期字段、路径字段、Checkbox、Switch、Radio、Select、Tabs、Dialog、Sheet、Popover、Menu、Tooltip、Table、ScrollArea、状态徽标、空态、骨架屏、设置行与分组。
- 状态：default、hover、focus-visible、active、disabled、busy、error、read-only、selected、checked、indeterminate；静态格用 `.is-*` 类强制展示，同一控件也响应真实交互。
- 行为：busy 时重复点击被忽略（提交计数为 1）；Dialog 焦点被约束，Esc 关闭并回到触发器；Menu 方向键；Tabs 左右方向键（roving tabindex）；Tooltip 悬停或键盘聚焦出现。hover 只改色，不改尺寸。

### UI-LIST（AC-231、AC-241、AC-262）

- 自动化列表由容器宽度驱动：容器至少 760px 为表格式，介于 480 与 760 之间为两列，不大于 480px 堆叠。名称两行省略并提供“展开全名”；启停、运行、编辑、更多始终可见。
- 状态：wide、container-600、container-420、long-name、through-date、name-snapshot-notice、empty、no-results、loading、error-keeps-input；另有刷新中（保留已有内容并提示）。失败的刷新保留旧数据并显示重试，不把失败显示成空态。
- 任务：Through 日期按本地化长格式完整显示并允许换行；创建失败保留输入且不产生重复行；计数与列表来自同一数组。
- 通知（LOG-011）：主文案是运行时名称快照与结果；详情按稳定 ID 解析现名，已改名显示现名，已删除标注“已删除”，空名称显示“未命名自动化”，ID 可复制；失败通知在 toast 消失后仍在通知中心；错误详情脱敏。

### UI-SAFE（AC-351、AC-352）

- 锁定态：错误后保留已输入内容并显示可恢复的错误。解锁后为条目列表加编辑表单；窄容器下列表与表单分屏切换并带返回。
- 备注自适应高度，到上限后在框内滚动；可选字段（邮箱、账户备注）默认折叠；密码有显示/隐藏、生成、复制按钮，均有可访问名称，复制后有可见确认。
- 危险操作：移入回收站的对话框写明对象与影响；永久删除要求输入标题才启用确认；有未保存修改时切换条目先弹出“放弃/继续编辑”。不改动加密与剪贴板策略。

### UI-HOME（AC-211、AC-221）

- 天气七态：未配置、等待启动、加载、有缓存且刷新中、成功、离线/失败、已失效；“没有位置”或“没有数据”不一律显示 Loading，旧缓存标注时间，加载有预算说明与取消，离线显示原因与重试/配置，已失效说明旧请求结果已丢弃。
- 区域命名：Home 区域用 `aria-labelledby` 指向可见或隐藏标题，不设 `title` 与 `aria-label`，因此鼠标停在空白处不会出现整块提示；图标按钮保留可访问名称，并由共享 Tooltip 提供提示。
- 音乐账号后台恢复：恢复中显示非阻塞状态，不影响其他组件；失败给出重试与重新登录；未登录与已恢复也有明确状态。
- 其他小组件展示：任务、笔记（无封面长标题与搜索无结果）、图表（零值与空数据区分，文字摘要，标注单位与范围）、番茄钟；布局编辑模式提供键盘上移替代拖拽。小组件是同一层级的面板，不做卡片套卡片。

### UI-BOT（AC-351、AC-352）

- 流式消息：增量追加；用户向上滚动后停止自动跟随并出现“有新内容”入口；停止先显示“取消请求中”，确认后显示“已停止（已确认）”。
- 审批卡：显示对象、范围、风险；仅提供“批准一次 / 拒绝”，不提供“总是允许”；提交中禁用并显示忙碌；成功、拒绝、失败（保留决定并可重试）、不确定（禁止重复批准，提供核对）、过期。不因追求简洁隐藏审批范围（W6.10）。
- 输入：输入法组合期间的回车不发送；Shift+Enter 换行；流式期间发送按钮禁用。

### UI-TERMINAL（AC-201、AC-202）

- 默认只显示简洁状态与必要动作；Root、阶段、清理、输出校验、ID 在可展开的技术详情中，详情内容脱敏且可复制。
- 停止中、停止未确认、清理失败、异常退出以用户文案持续可见，并按状态提供“检查停止结果/查看详情/重试清理/重新启动”，不以 toast 代替，不统一隐藏成调试信息。
- 切换状态与展开/收起详情不重建终端窗格：同一 DOM 节点，输入、选择与滚动位置保持；“实例创建次数”始终为 1。窗格是模拟终端，不是 xterm，宿主内表现属用户真机验收。

### 反馈与异步合同

- 初次加载用骨架并带 `aria-busy`；已有内容的刷新保留原内容并显示轻量刷新提示；保存中禁用并显示忙碌；失败保留输入与已有数据并提供重试；不确定状态说明下一步安全动作；空态与筛选无结果各有文案和操作；成功不先于真实结果。
- toast 只用于瞬时确认，不是错误的唯一来源；失败与持续状态必须同时在通知中心或原位保留。容器不大于 480px 时 toast 在内容面板顶部占位，不遮挡列表行、开关、运行和编辑入口。

## Responsive and Accessibility

- **布局：** 由容器宽度而非视口决定（container query）。工作台继承 DS-004 的 960 与 600 断点；列表在 760 与 480 切换；普通页面不产生无解释的整页横向溢出，二维表格、代码与画布可局部滚动且滚动区可聚焦。320px 是压力测试，不据此宣称新增移动端支持。
- **键盘与 focus：** 全部交互元素有真实语义；焦点环 3px，不依赖颜色深浅；Dialog 与 Sheet 约束焦点、Esc 关闭、焦点返回触发器；嵌套弹层先关最内层；Tabs 与 Menu 用方向键；输入法组合期间回车不提交。
- **触控：** 触控模式命中区 44px；原型模拟 viewport 不证明真实触屏手势。
- **对比度目标（AC-352）：** 普通文本不低于 4.5:1，大文本与适用的非文本控件边界、焦点环不低于 3:1；装饰分隔线不机械套用。原型预览色的实测值记录在证据评审中；生产色以 Obsidian 主题为准，需在实现票中对内置亮暗主题复核。
- **缩放与长文本：** 200% 缩放按 CSS 视口减半验证；长英文无空格词、长中文名称使用 `overflow-wrap: anywhere` 或两行省略加展开；日期、路径与 ID 允许换行。
- **Reduced motion：** 停用骨架脉冲、旋转与滑动；仅保留颜色变化的 120ms 过渡也在 `prefers-reduced-motion` 下关闭；标签切换无切场动画（DS-006）。
- **验证方式：** 真实 Chrome 的桌面（1440px）与窄屏（390px、420px）截图，亮暗各一；对键盘 Tab 顺序、焦点环、溢出、200% 缩放、reduced-motion 与各页面状态的脚本化检查，记录在 `evidence/browser.json` 与评审文件；宿主 Obsidian 内的表现属用户真机验收。

## Baseline Overrides

none。相对于固定的 DESIGN-0002 无 change 局部例外；新基线的 scope 扩展与 DS-006 动效修改已显式记录在其规则级变更中。`--db-*` 旧别名的删除来自 ADR-001，不是设计例外。

## Confirmation and Handoff

用户“全部按你的推荐落盘”确认本轮九项决定，并授权修复导航。confirmation 固定最终设计、基线和修复后的原型摘要；G-DESIGN 在发布及校验成功后关闭。后续实施仍遵守逐票依赖与 Goal 的实施授权门（LOG-013）。

- **原型源码与检测证据：** `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/design-system.md`
- **实际浏览器证据：** `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/evidence/browser.json`
- **Spec AC / Ticket / implementation evidence 绑定：**

| 页面 ID | 入口 | Spec AC | 说明 |
|---|---|---|---|
| UI-GALLERY | `final/index.html#gallery` | AC-351、AC-352、AC-353 | 基础控件全状态；AC-353 的清理项由实现票以样式检查验证 |
| UI-LIST | `final/index.html#list` | AC-231、AC-241、AC-262 | 420px 容器、长名称、Through 日期、运行时名称快照通知 |
| UI-SAFE | `final/index.html#safe` | AC-351、AC-352 | 长表单、可选字段、生成/复制、危险确认 |
| UI-HOME | `final/index.html#home` | AC-211、AC-221 | 区域命名、天气七态、音乐账号后台恢复 |
| UI-BOT | `final/index.html#bot` | AC-351、AC-352 | 流式、审批、失败/不确定、输入法保护 |
| UI-TERMINAL | `final/index.html#terminal` | AC-201、AC-202 | 终端状态分层与不重建窗格 |

- **归档候选：** 可跨 change 复用的规则（令牌与尺寸、状态矩阵、容器宽度布局、异步反馈合同、focus 与 reduced-motion）；一次性页面内容与未采纳的 candidate-b、candidate-c 不提升。
