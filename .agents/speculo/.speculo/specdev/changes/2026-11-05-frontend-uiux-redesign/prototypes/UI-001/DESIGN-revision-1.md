---
{
  "schema_version": 1,
  "artifact": "change-design",
  "change": "2026-11-05-frontend-uiux-redesign",
  "revision": 1,
  "status": "approved",
  "scope": [
    "huhu.plugin",
    "huhu.workbench"
  ],
  "baseline": {
    "revision": "DESIGN-0002",
    "digest": "ef5e5080f6c1a8f967397af72fca0050820b9ad4d9a4f57451be3a63ab55b2b1"
  },
  "prototype_ref": {
    "id": "UI-001",
    "digest": "cdec8620804428ffb3556ba0bd562dc33900e2d1295523e5f330fc42af1cb6be"
  },
  "selection": {
    "candidate_id": "huhu-paper"
  },
  "tokens": {
    "theme_default": "paper (light) / ink (dark)",
    "accent_default": "teal #2C6669 / #6FB4AF",
    "accents": "teal, indigo, pine, ochre, plum, graphite",
    "source_modes": "huhu (default) | obsidian",
    "canvas": "#F2EFE8 / #171614",
    "surface": "#FBFAF7 / #1D1C19",
    "raised": "#FFFFFF / #25231F",
    "sunken": "#EFEBE3 / #131210",
    "fg": "#1D1A16 / #EDE9E1",
    "fg_2": "#4F4A42 / #C2BBAF",
    "fg_3": "#6B655B / #9C958A",
    "control_line": "#8C8577 / #7A746A",
    "status": "success #2F6E3F, warning #8F5710, danger #A93A2A, info #335A9A (light)",
    "font_ui": "Geist + 系统中文",
    "font_read": "系统衬线（Iowan/Palatino/Georgia → 宋体/Noto Serif CJK）",
    "font_mono": "Geist Mono + 系统等宽",
    "type_scale": "12/18 13/20 14/22 16/24 20/28 28/36",
    "space": "2 4 6 8 12 16 20 24 32 40 48",
    "radius": "4 6 8 12 16 full",
    "control": "compact 32 / comfortable 36; lg 36/40",
    "row": "tree 32/36; list 44/52",
    "hit": "desktop 32; touch 44",
    "rail": "52px",
    "panel": "272px (220–480)",
    "header": "52px",
    "detail": "360px (max 440)",
    "breakpoints": "960 / 600 by leaf width; detail inline when main-360 ≥ 640",
    "z": "sticky 10, panel 20, sheet 40, dialog 60, popover 65, toast 70, command 80",
    "focus": "2px solid accent, offset 2px",
    "motion": "fast 120ms, base 180ms, cubic-bezier(.2,.8,.2,1); reduced → 0"
  },
  "pages": [
    {
      "id": "home",
      "route": "home",
      "task": "查看今天的重点并快速开始",
      "states": [
        "default",
        "editing",
        "empty",
        "loading"
      ],
      "acceptance": [
        "UX-HOME-1",
        "UX-HOME-2"
      ]
    },
    {
      "id": "tasks",
      "route": "task",
      "task": "整理并完成任务",
      "states": [
        "default",
        "board",
        "calendar",
        "detail",
        "completed",
        "pending",
        "failed",
        "empty",
        "no-results",
        "loading",
        "error"
      ],
      "acceptance": [
        "UX-TASK-1",
        "UX-TASK-2",
        "UX-TASK-3"
      ]
    },
    {
      "id": "diary",
      "route": "navigator/diary",
      "task": "阅读与书写周期日记",
      "states": [
        "default",
        "writing",
        "empty-date"
      ],
      "acceptance": [
        "UX-DIARY-1"
      ]
    },
    {
      "id": "archives",
      "route": "archives",
      "task": "按类型浏览和编辑记录",
      "states": [
        "default",
        "record",
        "belongings",
        "person",
        "studio",
        "search",
        "no-results",
        "dirty",
        "loading",
        "error",
        "empty"
      ],
      "acceptance": [
        "UX-ARCH-1",
        "UX-ARCH-2",
        "UX-ARCH-3"
      ]
    },
    {
      "id": "automations",
      "route": "automations",
      "task": "查看、启停和调试自动化",
      "states": [
        "default",
        "detail",
        "detail-runs",
        "run-detail",
        "editing",
        "toggle-pending",
        "toggle-failed",
        "all-runs",
        "new",
        "empty",
        "missing",
        "loading",
        "error"
      ],
      "acceptance": [
        "UX-AUTO-1",
        "UX-AUTO-2",
        "UX-AUTO-3"
      ]
    },
    {
      "id": "agent",
      "route": "agent",
      "task": "在终端会话中与智能体协作",
      "states": [
        "default",
        "split",
        "blocked",
        "info",
        "history",
        "usage",
        "empty"
      ],
      "acceptance": [
        "UX-AGENT-1"
      ]
    },
    {
      "id": "notifications",
      "route": "notifications",
      "task": "处理收件箱",
      "states": [
        "default",
        "detail",
        "empty",
        "error"
      ],
      "acceptance": [
        "UX-NOTIFY-1"
      ]
    },
    {
      "id": "safe",
      "route": "safe",
      "task": "解锁后查看与复制凭据",
      "states": [
        "locked",
        "error",
        "default",
        "detail",
        "revealed",
        "quick-pick",
        "empty"
      ],
      "acceptance": [
        "UX-SAFE-1"
      ]
    },
    {
      "id": "versioning",
      "route": "versioning",
      "task": "查看检查点并恢复",
      "states": [
        "default",
        "diff",
        "restore-confirm",
        "empty"
      ],
      "acceptance": [
        "UX-VER-1"
      ]
    },
    {
      "id": "health",
      "route": "health",
      "task": "只读扫描与有限修复",
      "states": [
        "idle",
        "scanning",
        "results",
        "repair-plan",
        "partial",
        "cancelled"
      ],
      "acceptance": [
        "UX-HEALTH-1"
      ]
    },
    {
      "id": "notes",
      "route": "host/notes",
      "task": "在宿主笔记中查看导航、批注与版本",
      "states": [
        "default",
        "comment-editing",
        "empty"
      ],
      "acceptance": [
        "UX-NOTES-1"
      ]
    },
    {
      "id": "settings",
      "route": "settings",
      "task": "调整外观与模块设置",
      "states": [
        "appearance",
        "appearance-dark",
        "follow-obsidian",
        "general",
        "icons",
        "content",
        "search"
      ],
      "acceptance": [
        "UX-SET-1",
        "UX-SET-2"
      ]
    }
  ],
  "overrides": [],
  "confirmation": {
    "by": "user",
    "at": "2026-11-05T06:59:57Z",
    "record": "prototypes/UI-001/approval.md",
    "digest": "488fd941e43883038913afbcc0fce5717cff8bfb57e1b514c62b3458fbb51193",
    "record_digest": "bd6bea5a2614d55563f9fd45eecbea5a56f764e34f128a89ad949e94f01d207b"
  },
  "updated_at": "2026-11-05T06:59:57Z"
}
---

# Change DESIGN · HUHU 前端彻底重构（纸 / 墨）

本文件是本 change 唯一的设计规则来源。原型源码与证据在 `prototypes/UI-001/design-system.md`，决定来源在 `LOG.md`（LOG-001–LOG-009）和 `ADR.md`（ADR-001–ADR-004）。本 change 是一次明确的 redesign（LOG-001），因此**替换**永久基线 DESIGN-0002 的视觉语言（下文“基线差异”逐条列出）。永久基线在归档时经 A 网关评估发布，本文件不直写永久目录。

## 1. 设计方向

- **定位**：Obsidian 内的高密度个人工作台（LOG-002）。用户长时间在任务、档案、自动化、智能体之间切换，所以界面要安静，信息要有层级，同类操作在每个模块里位置一致。
- **气质：暖中性 · 纸感**（LOG-007）。米白和暖灰分出层级，正文用深墨色，只有一种强调色（默认墨青），细线分隔，阴影只用在浮层上。阅读类内容（日记、笔记、人物纪事、首页问候）使用衬线阅读字体，工具类内容一律使用无衬线界面字体。
- **主题归属**（ADR-004）：默认使用 HUHU 自有主题“纸”（浅色）和“墨”（深色）；外观设置提供“跟随 Obsidian”，开启后语义 token 改为映射宿主变量。
- **克制原则**：每个区域最多一个主按钮；颜色只表达语义（主操作/选中/焦点、成功/警告/危险/信息），不做装饰；状态不能只靠颜色表达，要同时有图标、文字或形状。

## 2. 技术栈与实现边界（LOG-003、ADR-002）

| 层 | 采用 | 规则 |
|---|---|---|
| 视图 | React 19.2 + TypeScript 5.8 | 沿用；不引入 Router/Next/Vite 应用壳 |
| 样式 | Tailwind 4.1 + `src/ui/styles/tokens.css` 语义变量 | 组件只消费 `--hu-*` 语义 token；不用 CSS-in-JS、全局 reset、裸 z-index、成批 `!important` |
| 组件原语 | shadcn（new-york-v4 源码形态）+ radix-ui 1.6 | Button/Input/Select/Switch/Checkbox/Tabs/Dialog/Sheet/Popover/DropdownMenu/Tooltip 各只有一个实现，位于 `src/ui/components` |
| 变体 | class-variance-authority 0.7 + clsx + tailwind-merge 3.7 | 调用方 className 最后覆盖 |
| 树 | @headless-tree 1.7 + @tanstack/react-virtual 3.14 | 档案、导航器、笔记树共用 `tree.tsx`；行高 32px，必须同步虚拟器 `estimateSize` |
| 日期 | **新增 `@daypicker/react` 10.x** + 现有 Radix Popover | DateField / DateRangeField / DateTimeField 一个组件族；删除所有原生 `type="date"`、`datetime-local` |
| 命令面板 / 提示 | cmdk 1.1 / sonner 2.0 | 视觉按本文件 §5 |
| 图标 | lucide-react 0.577 | 线宽 1.75，尺寸 14/16/20/28 四档 |
| 网格 / 分屏 / 拖拽 | react-grid-layout 2.2 / react-resizable-panels 3.0 / dnd-kit | 首页网格和智能体分屏沿用，不重写 |
| 字体 | Geist / Geist Mono（随包，OFL）+ 系统中文 | 阅读字体用系统衬线栈，不随包新增字体文件 |

原型使用离线嵌入的 Air Datepicker 3.6.0（MIT）来承载日期的视觉和行为规格，**不进入生产**。生产按同一视觉合同直接用 DayPicker v10 实现，不写两库之间的转换层。

## 3. 设计 token

所有值都以 CSS 变量形式实现在原型 `final/styles.css` 的 tokens 段，生产落到 `src/ui/styles/tokens.css`，名称一一对应。

### 3.1 颜色 · 纸（浅色，默认）

| Token | 值 | 用途 | 对比度（实测） |
|---|---|---|---|
| `--hu-canvas` | `#F2EFE8` | 图标轨、二级栏、宿主 chrome | — |
| `--hu-surface` | `#FBFAF7` | 主区页面底 | — |
| `--hu-raised` | `#FFFFFF` | 卡片、输入框、浮层、对话框 | — |
| `--hu-sunken` | `#EFEBE3` | 分段控件轨道、代码、内嵌井 | — |
| `--hu-line` / `--hu-line-strong` | `#E7E2D8` / `#DAD4C8` | 装饰分隔 / 卡片边框 | 装饰 |
| `--hu-control-line` | `#8C8577` | 表单控件边界 | ≥3:1（raised 与 surface 上） |
| `--hu-fg` | `#1D1A16` | 正文 | 16.6:1（surface） |
| `--hu-fg-2` | `#4F4A42` | 次级文字 | 8.4:1 |
| `--hu-fg-3` | `#6B655B` | 元信息 | 5.5:1（sunken 上 4.9:1） |
| `--hu-fg-4` | `#A29B8F` | 占位符、装饰，禁止承载必要信息 | 装饰 |
| `--hu-hover` / `--hu-press` | `rgb(56 44 24 / .055)` / `/.095` | 悬停 / 按下与选中 | — |
| `--hu-success` | `#2F6E3F`（soft `#E6F0E6`） | 成功 | 5.9:1 |
| `--hu-warning` | `#8F5710`（soft `#F7ECDB`） | 警告、运行中 | 5.7:1 |
| `--hu-danger` | `#A93A2A`（soft `#F7E4DF`） | 失败、危险、逾期 | 6.1:1 |
| `--hu-info` | `#335A9A`（soft `#E5EBF5`） | 信息 | 6.6:1 |
| `--hu-highlight` | `#F6E7B8` | 搜索命中与笔记高亮 | 装饰 |

### 3.2 颜色 · 墨（深色）

| Token | 值 | Token | 值 |
|---|---|---|---|
| `--hu-canvas` | `#171614` | `--hu-fg` | `#EDE9E1`（14.1:1） |
| `--hu-surface` | `#1D1C19` | `--hu-fg-2` | `#C2BBAF`（8.9:1） |
| `--hu-raised` | `#25231F` | `--hu-fg-3` | `#9C958A`（5.7:1） |
| `--hu-sunken` | `#131210` | `--hu-fg-4` | `#6C665C`（装饰） |
| `--hu-line` / `-strong` | `#2C2A25` / `#38352F` | `--hu-control-line` | `#7A746A`（≥3:1） |
| 状态色 | success `#7CBE8A` · warning `#E2A55A` · danger `#EE8B7B` · info `#8FB0EA`，soft 为同色 14% | 阴影 | 更深的纯黑叠加，外加 1px 暖白描边 |

### 3.3 强调色族（`data-accent`）

强调色只用于主按钮、选中、焦点环、进度和当前日期，每种都成对给出浅/深两套值。主按钮上的文字对比度都 ≥ 6:1。

| 名称 | 浅色 accent | 浅色 soft / text | 深色 accent | 深色前景 |
|---|---|---|---|---|
| 墨青 teal（默认） | `#2C6669` | `#E3EEEC` / `#22585B` | `#6FB4AF` | `#0F1F1E` |
| 靛蓝 indigo | `#3B57A3` | `#E6EAF6` / `#334C90` | `#93A9EA` | `#111A33` |
| 松绿 pine | `#356E43` | `#E4EFE5` / `#2E603A` | `#7FBD8C` | `#10220F` |
| 赭石 ochre | `#9A4E26` | `#F5E8DF` / `#86431F` | `#E39C72` | `#2A140A` |
| 梅紫 plum | `#764689` | `#EFE6F2` / `#683D79` | `#C59DD8` | `#24132B` |
| 石墨 graphite | `#34312D` | `#E9E6E0` / `#34312D` | `#D9D4CB` | `#1A1917` |

### 3.4 跟随 Obsidian（`data-source="obsidian"`）

`--hu-canvas→--background-secondary`、`--hu-surface/raised→--background-primary`、`--hu-sunken→--background-secondary-alt`、`--hu-line→--background-modifier-border`、`--hu-fg→--text-normal`、`--hu-fg-2/3→--text-muted`、`--hu-accent→--interactive-accent`、`--hu-accent-fg→--text-on-accent`、`--hu-accent-text→--text-accent`。状态色和控件边界仍使用 HUHU 值；当宿主正文对比度低于 7:1 或控件边界低于 3:1 时，回退到 HUHU 的安全值。笔记正文编辑器的字体与配色永远由用户的 Obsidian 设置决定。

### 3.5 字体与字阶

| Token | 值 | 用途 |
|---|---|---|
| `--hu-font-ui` | Geist → PingFang SC / Hiragino / 微软雅黑 / Noto Sans CJK SC | 全部界面 |
| `--hu-font-read` | Iowan Old Style / Palatino / Georgia → 宋体 SC / Noto Serif CJK SC | 日记、笔记阅读、人物纪事、首页问候 |
| `--hu-font-mono` | Geist Mono → JetBrains Mono / SF Mono / Menlo / Consolas | 终端、日志、路径、diff |
| xs | 12 / 18 | 元信息、计数、帮助文字（中文不得小于 12px） |
| sm | 13 / 20 | 树、表格、导航、按钮 |
| md | 14 / 22 | 正文、表单（默认） |
| lg | 16 / 24 | 页头 H1、详情标题、对话框标题 |
| xl | 20 / 28 | 统计数值、记录标题 |
| 2xl | 28 / 36 | 阅读页大标题（衬线） |
| 字重 | 400 / 500 / 600 | 正文 / 标签与导航 / 标题 |

数字一律 `tabular-nums`。界面字号提供 13/14/15 三档（`data-ui-size`），同比例缩放，不影响笔记正文。

### 3.6 间距、形状、层级、动效

| 类别 | Token |
|---|---|
| 间距（4px 网格） | 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 |
| 表单 | 标签→控件 6，控件→帮助 6，字段间 16，章节间 24 |
| 页面内边距 | 宽 24 / 窄 16；内容最大宽 1120，表单最大宽 640 |
| 圆角 | xs 4（复选框、kbd）· sm 6（徽标、树行、菜单项）· md 8（控件）· lg 12（卡片、浮层）· xl 16（对话框、Sheet）· full（开关、头像） |
| 控件高度（紧凑 / 舒适） | 32 / 36；大号 36 / 40；树行 32 / 36；列表行 44 / 52；卡片内边距 16 / 20 |
| 命中区 | 桌面 ≥ 32，触控（`pointer:coarse`）≥ 44，紧凑模式也不缩小 |
| 阴影 | card：`0 1px 2px rgb(40 30 12/.05)`；pop：三层柔和暖色阴影 + 1px 描边，只用于 Popover/Menu/Dialog/Sheet/Toast |
| 层级 | sticky 10 · panel 20 · sheet 40 · dialog 60 · popover 65（对话框内的日期与菜单浮在对话框之上）· toast 70 · command 80 |
| 焦点 | `outline: 2px solid var(--hu-accent)`，offset 2px；输入框改为强调色边框加 3px 半透明光晕 |
| 动效 | fast 120ms（悬停、按下、颜色）；base 180ms（浮层、Sheet、开关）；缓动 `cubic-bezier(.2,.8,.2,1)`；只动画 transform / opacity / color；系统减少动效或设置开启时全部为 0 |
| 密度 | `data-density="compact"`（默认）/`comfortable`，只改行高、内边距、段落，字阶不变 |

## 4. 布局合同

| 区域 | 规格 |
|---|---|
| 图标轨 | 52px；36×36 按钮，圆角 10；当前项为白底浮起，左侧 3px 强调色条；底部固定通知（数字徽标）与设置 |
| 二级栏 | 默认 272px，可拖动 220–480，双击复位，方向键步进 8px；页头 52px；搜索框 30px；分组标题 11px/600；没有内容的模块（自动化、体检、通知）不显示二级栏 |
| 主区页头 | 52px：导航切换（窄宽）· 面包屑 · H1（16/600）· 副标题（12 元信息）· 右侧操作区（主按钮在最右） |
| 工具栏 | 页头下方 12px 上下内边距：搜索（弹性，最大 280）· 分段筛选 · 日期范围 · 排序 |
| 右详情 | 360px（最大 440），非模态 `aside`；页头 52px（标题 + 主开关 + 更多 + 关闭）；底部操作栏固定 |
| 宿主 chrome | 原型中模拟 Obsidian 标签栏（38px）与状态栏（24px）；生产不新增全局页脚，状态贡献到 Obsidian 原生状态栏（保留 DS-001） |

**宽度规则（按所属叶子宽度，不按浏览器视口）**

| 叶子宽度 | 二级栏 | 右详情 |
|---|---|---|
| ≥ 960 | 内联 | 主区宽度 − 360 ≥ 640 时内联，否则改为右侧覆盖 Sheet |
| 600–959 | 覆盖层（页头左侧按钮打开） | 覆盖 Sheet |
| < 600 | 图标轨与二级栏合并为左侧 Sheet | 全宽 Sheet，带关闭/返回 |

列表与详情各自只有一个滚动区；打开、切换、关闭详情时列表 DOM 不卸载，滚动位置与筛选保持不变。

## 5. 组件合同

| 组件 | 规格要点 |
|---|---|
| Button | primary（强调色底，内高光 + 1px 投影）· secondary（白底、strong 边框）· ghost · danger · danger-ghost；尺寸 sm 28 / md 32 / lg 36；图标 16，间距 6；忙碌时图标旋转、禁止重复点击 |
| Input / Select / Textarea | 白底，`--hu-control-line` 边框，圆角 8；悬停边框加深；聚焦为强调色边框和光晕；错误为危险色边框和 soft 光晕，错误文字通过 `aria-describedby` 关联 |
| DateField | 输入框左侧日历图标、右侧清除；可以手输，失焦/回车时严格校验（`2026-02-31` 报错，不滚到 3 月）；浮层宽 280，单元格 34，圆角 8；今天用强调色文字加底点，选中为强调色实底，范围中间为 soft；底部“今天 / 清除”；Esc 只关浮层 |
| DateRangeField | 一个触发按钮（激活后 soft 强调色）+ 独立清除按钮；浮层内有预设（今天、未来 7 天、本月、过去 30 天）、起止输入、内嵌日历、取消/应用；结束早于开始时禁用“应用”并显示错误 |
| DateTimeField | 同 DateField 加时间滑块；时区写在帮助文字里 |
| Switch | 34×20，滑块 14，开启为强调色；提交中 `aria-busy` 并禁用；旁边显示“启用 / 停用 / 保存中”文字；点击不触发所在行 |
| Checkbox | 18px，圆角 4（任务为圆形）；提交中边框变虚线 |
| SegmentedControl | 轨道 sunken，选中项为白底浮起；单选语义 `radiogroup` |
| Tabs | 下划线式，选中 2px 强调色 |
| Card / KPI | 白底、line 边框、card 阴影、圆角 12；卡片头 44px |
| List row | 44 / 52 高，圆角 8；选中为 soft 强调色底加左侧 3px 强调色条；行内次要操作悬停才出现，键盘聚焦时也出现 |
| Tree | 32 行高，缩进 14，箭头只负责展开/收起，点名称才选中；搜索命中用 highlight 标记，祖先自动展开；清空搜索后恢复手动展开状态；底部标明已加载数量与分页 |
| Table | 表头 36（12/600 sunken 色，吸顶），行 44；数值列右对齐 |
| Badge / Count / Dot | 徽标高 20、圆角 6；状态点 8px，“运行中”带呼吸光晕 |
| Notice | 图标 + 标题 + 正文 + 可选操作，按 info/success/warning/error 使用 soft 底 |
| Empty | 52px 图标块 + 标题（14/600）+ 一句说明 + 与当前筛选相关的下一步按钮 |
| Dialog / Sheet | 圆角 16，pop 阴影；页头 20px 内边距；底部“取消 / 主操作”，主按钮在右；有未保存内容时 Esc 或点遮罩先确认；焦点限制在内部，关闭后回到触发元素 |
| Toast | 深墨底、反白文字（深色主题反之），左侧语义图标，可带“撤销 / 重试”；失败用 `role=alert` |
| Command | 宽 620，输入框 52 高；分组；↑↓ 选择，回车执行；输入法组合期间回车不执行 |
| Tooltip | 只作补充；图标按钮必须有可访问名称 |

## 6. 页面、状态与验收映射

页面 ID 与原型路由一致。每页每个状态都在终版原型中可直接切换（原型面板“页面/状态”），并有 1440px 与 390px 的浏览器证据。

### home · 首页
任务：查看今天的重点并快速开始。问候区使用衬线 26px 标题，下面一行显示逾期、会话、下一个自动化；小组件为 12 栏网格（今日任务、日历、专注、智能体用量、自动化、闪念、最近档案）；编辑布局时出现拖动手柄、上移/下移、移除和撤销。
- UX-HOME-1：今日任务小组件与任务页共用完成态（删除线）和快速添加。
- UX-HOME-2：编辑布局可增删、排序小组件；空看板给出“添加小组件”和“使用默认布局”。

### tasks · 任务
任务：按清单、项目、标签整理并完成任务。列表按“逾期 / 今天 / 明天 / 之后 / 无日期 / 已完成”分组；视图分为列表、看板、日历三种；工具栏含搜索、完成状态、日期范围、排序；点击行打开右详情（标题、截止日期、提醒、优先级、项目、重复、标签、备注、关联资料，自动保存）。
- UX-TASK-1：完成后标题与说明同时划线并降为 `--hu-fg-3`，日期和关联资料不划线；在“未完成”筛选下先保留约 1.4 秒再移除，并给出可撤销的提示。
- UX-TASK-2：提交中显示虚线复选框和“正在保存”；失败恢复原状态并提供重试。
- UX-TASK-3：所有日期输入使用 DateField / DateRangeField。

### diary · 日记
任务：按天阅读和书写周期日记。二级栏为月历加本月列表；主区为书页（左侧装订阴影，衬线 17px，行高 1.95），可以前后翻天、写作并自动保存；没有日记的日期显示文件路径和“写这一天”。
- UX-DIARY-1：书页只是周期笔记的投影，写入一日一文件。

### archives · 档案
任务：按类型浏览和编辑记录。二级栏为“类型 → 记录”树，加上视图组和管理组（类型设计器、归物年度报告、恢复中心）；主区包括类型表格/卡片、记录编辑（字段网格、关联、修订标签）、归物（KPI 加卡片）、人物阅读（头像、资料、纪事时间线）、类型设计器。
- UX-ARCH-1：树的展开与选中分离，支持方向键、Home/End、首字定位；搜索时保留祖先，清空后恢复。
- UX-ARCH-2：编辑记录后出现底部未保存提示条且不丢失焦点；离开前要求确认是否放弃。
- UX-ARCH-3：显示已加载数量，大目录按需分页，不静默截断。

### automations · 自动化
任务：查看、启停和调试自动化。没有二级栏；列表行包括类型图块、名称、触发、上次结果、下次运行和开关；右详情分概览与运行记录，可进入单次运行详情（日志），底部有立即运行、编辑和更多；编辑在弹窗中进行（首次运行用 DateTimeField，结束日期用 DateField）；新建自动化与全部运行记录是独立页面。
- UX-AUTO-1：打开、切换、关闭详情时列表不卸载，滚动和筛选保持；Esc 关闭后焦点回到来源行。
- UX-AUTO-2：Switch 提交中禁止重复点击；失败时列表和详情同步恢复真实值并提示；启停不取消已开始的运行。
- UX-AUTO-3：深链指向不存在的实例时，列表保留，详情显示缺失状态。

### agent · 智能体
任务：在终端会话里与 Claude/Codex 协作。二级栏按工作区列出会话（状态点），并提供历史、收件箱、用量、账号入口；主区为会话标签条、终端面板（mono 13/21，跟随主题的 `--hu-term-*`），可左右分屏（窄屏改上下）；会话等待回答时显示横幅，可以直接允许或拒绝；会话信息放在右详情。
- UX-AGENT-1：等待回答的会话在横幅、标签状态点和图标轨角标三处都有提示。

### notifications · 通知
任务：处理收件箱。可筛选未读/全部、全部标为已读；右详情显示来源、投递回执和“打开来源”。
- UX-NOTIFY-1：打开即标为已读，图标轨角标和状态栏同步更新。

### safe · 保险箱
任务：解锁后查看和复制凭据。锁屏卡片带主密码输入和显示切换，错误时提示剩余次数；解锁后二级栏为分类和快速取密；详情中密码默认遮罩，可显示/复制，复制后 30 秒清除；锁定后清除明文。
- UX-SAFE-1：快速取密（⌘⇧P）支持键盘选择，回车复制密码，⇧回车复制用户名。

### versioning · 版本
任务：查看检查点并恢复。二级栏为有历史的文件；主区为时间线（手动检查点为实心点）加预览或逐行 diff；恢复前确认，并先把当前内容存为检查点。
- UX-VER-1：恢复操作可以撤销，确认文案写明实际后果。

### health · 体检
任务：只读扫描，再有限修复。包括介绍与检查范围、扫描进度（分模块步骤，可取消）、结果（KPI 加按模块分组的问题）、修复计划弹窗（勾选、执行前创建检查点）、部分成功与取消状态。
- UX-HEALTH-1：取消后保留已完成检查的结果；部分失败时写明哪项失败及原因。

### notes · 笔记（宿主叶子）
任务：在 Obsidian 笔记中查看导航器、批注和版本。左叶子为导航器树，中间为阅读视图（衬线、高亮），右叶子为批注/版本标签页，可以添加批注。
- UX-NOTES-1：批注单独保存，不改动正文；这些宿主叶子使用与工作台相同的 token。

### settings · 设置
任务：调整外观和各模块设置。二级栏为设置搜索加分组；外观页可设置配色来源（HUHU / 跟随 Obsidian）、明暗（浅/深/跟随系统）、强调色色板、界面字号、界面字体、密度、减少动效，右侧有实时预览卡；另有通用、图标选择、内容与受管文件、设置搜索（命中高亮）。
- UX-SET-1：外观修改立即作用于整个工作台，包括浮层和日期弹层。
- UX-SET-2：设置行统一为“标签 + 说明 | 控件”，窄屏改为上下排列。

## 7. 交互、可访问性与状态规则

- **键盘**：F6 在图标轨、二级栏、主区、详情之间循环；⌘/Ctrl+K 打开命令面板；Esc 由内向外依次关闭日期弹层、菜单/对话框、导航 Sheet、右详情；列表行和树行都可以通过 Tab 到达，回车或空格打开。
- **焦点**：浮层关闭后焦点回到触发元素；关闭详情后回到来源行；列表重建时保留焦点所在的行。
- **输入法**：组合输入期间回车不提交（命令面板、快速取密、表单）。
- **异步**：每个异步操作都有提交中、成功、失败三态；失败时恢复服务端真实值并提供重试；只有领域确实有逆操作时才提供“撤销”。
- **列表状态**：初次加载用骨架屏；刷新时保留旧内容；空数据、无搜索结果、读取失败、能力不可用要区分开，失败不能显示成空列表。
- **ARIA**：开关用 `role=switch` 加 `aria-checked="true|false"`，分段控件用 `radiogroup`，树用 `tree`/`treeitem` 加 `aria-expanded`/`aria-selected`，详情 Sheet 用 `role=dialog aria-modal`。
- **长文本**：标题最多两行，路径单行省略并保留完整的可访问名称；200% 缩放时不出现页面级横向溢出。

## 8. 基线差异（相对 DESIGN-0002）

| DESIGN-0002 规则 | 本 change | 依据 |
|---|---|---|
| DS-002 颜色映射 Obsidian 语义变量 | 由 HUHU 自有主题（纸/墨 + 6 种强调色）取代；跟随 Obsidian 改为可选模式 | ADR-004 |
| 焦点 3px，offset 1px | 改为 2px outline、offset 2px；输入框用边框加光晕 | §3.6 |
| 标准页头 44px | 改为 52px（容纳 H1 加副标题加操作） | §4 |
| 二级栏默认 280 | 改为 272（4px 网格，220–480） | §4 |
| 运动 120ms 单档 | 改为 fast 120 / base 180 两档 | §3.6 |
| 自动化详情为独立页 | 改为列表加右详情 | ADR-003 |
| 浏览器原生日期 | 改为统一 DateField 族 | ADR-002 |
| DS-001 无全局页脚、状态归宿主状态栏 | 保留 | LOG-002 |

## 9. 交接给 S / T / I

- S 引用本文件的 revision、designDigest 与 `prototype_ref`，把 §6 的 UX-* 映射为 AC，把交付包 `source/Frontend_Refactor_Plan.md.txt` §9 的删除清单写成可验收条目。
- T 的 UI 票使用 `design_ref`，取值为本文件页面 ID 与 UX-*；执行者不得重新选风格。
- I 在 Design Conformance 中记录真实 Obsidian 宿主截图与原型的差异。原型只证明原型路径，不证明真实服务、多窗口和持久化。
