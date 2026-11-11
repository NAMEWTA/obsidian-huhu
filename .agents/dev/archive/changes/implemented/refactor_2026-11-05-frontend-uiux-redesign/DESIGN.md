---
{
  "schema_version": 1,
  "artifact": "change-design",
  "change": "2026-11-05-frontend-uiux-redesign",
  "revision": 3,
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
    "id": "UI-002",
    "digest": "c9fda6f653bafe1528841d67f03571a52f2663276fd2659743fd03b66e94005a"
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
    "type_scale": "字号档位见 §3.5；中文最低 12px",
    "space": "主网格 4 8 12 16 20 24 32 40 48；微间距仅 2/6",
    "radius": "4 6 8 12 16 full",
    "control": "compact 32 / comfortable 36; lg 36/40",
    "row": "tree 32/36; list 44/52",
    "hit": "desktop 32; touch 44",
    "rail": "52px",
    "panel": "272px (220–480)",
    "header": "52px",
    "detail": "360px (max 440)",
    "breakpoints": "960 / 600 by leaf width; detail inline when main-360 ≥ 640",
    "z": "区域 10/20；浮层按所属 Document 栈递增，见 §7",
    "focus": "2px solid accent, offset 2px",
    "motion": "仅 transform/opacity 120/180ms；减少动效 0",
    "diff": "--hu-diff-add/del/-em/gutter/sel → @pierre/diffs --diffs-* 变量（§3.7）"
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
        "loading",
        "widgets",
        "widget-config",
        "inbox",
        "widget-error"
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
        "empty",
        "inbox",
        "inbox-compose",
        "inbox-failed",
        "accounts",
        "skills",
        "commands",
        "backup",
        "spaces",
        "unavailable"
      ],
      "acceptance": [
        "UX-AGENT-1"
      ]
    },
    {
      "id": "notifications",
      "route": "notifications",
      "task": "处理系统通知",
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
        "empty",
        "initialize",
        "corrupt",
        "recovery",
        "unavailable",
        "edit"
      ],
      "acceptance": [
        "UX-SAFE-1"
      ]
    },
    {
      "id": "versioning",
      "route": "versioning",
      "task": "管理 Git 更改与提交历史，任选两个版本比较差异，按回执恢复笔记",
      "states": [
        "changes",
        "diff",
        "restore-confirm",
        "empty",
        "note-history",
        "history",
        "compare",
        "setup",
        "clone",
        "remote",
        "author",
        "conflict",
        "unavailable",
        "revision-review",
        "stale-review",
        "binary",
        "diff-unified",
        "line-select",
        "hunk-staged",
        "conflict-file",
        "compare-same",
        "large"
      ],
      "acceptance": [
        "UX-VER-1",
        "UX-VER-2",
        "UX-VER-3"
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
        "cancelled",
        "unavailable",
        "stale-plan"
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
        "content",
        "search",
        "dashboard",
        "editor",
        "navigator",
        "terminal",
        "iconic",
        "contacts",
        "automation",
        "versioning",
        "safe",
        "about",
        "onboarding",
        "device-choice",
        "editor-appearance"
      ],
      "acceptance": [
        "UX-SET-1",
        "UX-SET-2"
      ]
    }
  ],
  "overrides": [],
  "updated_at": "2026-11-05T09:10:00Z",
  "confirmation": {
    "by": "user",
    "at": "2026-11-05T09:10:00Z",
    "record": "prototypes/UI-002/approval.md",
    "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66",
    "record_digest": "5cbd2168e0e936ab0da72dfff874b4ef2ac8926ff8f90a386b5a5405766c16c6"
  }
}
---

# Change DESIGN · HUHU 前端彻底重构（纸 / 墨）

本文件是本 change 唯一的设计规则来源。原型源码与证据在 `prototypes/UI-002/design-system.md`，决定来源在 `LOG.md`（LOG-001–LOG-014）和 `ADR.md`（ADR-001–ADR-006）。本 change 是一次明确的 redesign（LOG-001），因此**替换**永久基线 DESIGN-0002 的视觉语言（下文“基线差异”逐条列出）。永久基线在归档时经 A 网关评估发布，本文件不直写永久目录。

## 1. 设计方向

- **定位**：Obsidian 内的高密度个人工作台（LOG-002）。用户长时间在任务、档案、自动化、智能体之间切换，所以界面要安静，信息要有层级，同类操作在每个模块里位置一致。
- **气质：暖中性 · 纸感**（LOG-007）。米白和暖灰分出层级，正文用深墨色，只有一种强调色（默认墨青），细线分隔，阴影只用在浮层上。HUHU 阅读类内容（日记、人物纪事、首页问候）使用衬线阅读字体，工具类内容一律使用无衬线界面字体。
- **主题归属**（ADR-004）：默认使用 HUHU 自有主题“纸”（浅色）和“墨”（深色）；外观设置提供“跟随 Obsidian”，开启后语义 token 改为映射宿主变量。
- **克制原则**：每个区域最多一个主按钮；颜色只表达语义（主操作/选中/焦点、成功/警告/危险/信息），不做装饰；状态不能只靠颜色表达，要同时有图标、文字或形状。

## 2. 技术栈与实现边界（LOG-003、ADR-002）

| 层 | 生产选型 | 复用与升级合同 |
|---|---|---|
| 视图与构建 | React / React DOM 19.3.1；TypeScript 6.0.3（typescript-eslint 支持范围内）；esbuild 0.28.2 | 目标为调研日稳定版；T-01 验证类型工具链、宿主与包体后锁定。Obsidian 插件架构不变 |
| 样式 | Tailwind / CLI 4.3.4 + CSS 语义变量 | `src/ui/styles/tokens.css` 唯一色值来源；禁止额外 CSS-in-JS/reset |
| 原语 | 现有 shadcn 源码 + radix-ui 1.8.1 | 同票升级现有组件，不再安装第二套视觉组件库；每类唯一实现 |
| 树与虚拟化 | @headless-tree/core/react 1.8.0 + 现有 TanStack Virtual | 复用 tree.tsx；键盘导航由库负责；行高按密度/指针与 estimateSize 同步 |
| 日期 | @daypicker/react 10.0.2 + 现有 Popover/Input/Select | 仅新增这套日期依赖；DateTime 的时间输入组合既有控件，DayPicker 不提供时间选择器 |
| 网格 / 分屏 / 拖拽 | 现有 react-grid-layout、dnd-kit；react-resizable-panels 4.18.1 | 网格/拖拽沿用成熟实现；分屏升级核对新 API、尺寸单位与键盘行为 |
| 命令 / 通知 / 图标 | 现有 cmdk、sonner、Lucide | 升级至实施当日通过验证的稳定补丁，版本证据见 reuse-decision.md |
| 差异与历史比较 | `@pierre/diffs` 1.6.4（Apache-2.0；React 入口 `@pierre/diffs/react`，Shiki JS 正则引擎，shadow DOM）（ADR-006） | 替换 `@codemirror/merge` MergeView 与自写折叠/改动块标记/diff Worker；单文件 `MultiFileDiff`/`FileDiff`，多文件 `CodeView` 虚拟列表，冲突 `UnresolvedFile`，改动块 `diffAcceptRejectHunk`，Worker 池用包内 worker 入口经现有 blob 构建；语言只打包白名单，其余按纯文本 |
| 编辑 / 终端 / 图表 | 宿主 CodeMirror 6（批注、冲突标记编辑器扩展）、@xterm、现有图表/媒体组件 | 不自造编辑器、终端解析器或绘图引擎；保留 Worker/懒加载与来源许可 |
| 字体 | Geist / Geist Mono（OFL）+ 系统中文 / 阅读衬线 | 不添加远程字体请求 |

版本是实施目标，未宣称已安装或通过生产集成。完整官方依据、候选比较、许可证、维护状态与升级责任见 `reuse-decision.md`。T-01 必须重新查询实施日稳定版；遇到宿主/依赖不支持，记录复现证据后选最新可用稳定版并更新本 change，不能悄悄保留旧版或只改版本号。

离线原型继续使用已登记许可的 Air Datepicker 3.6.0；它不进入生产。原型的差异视图用离线 DOM 按 `@pierre/diffs` 的布局与交互合同示意，不内嵌该库。原型日期字段只证明交互与视觉，时间分区与领域序列化由 T-03 在真实 DayPicker 组件中验收。

## 3. 设计 token

设计值以本节为合同，原型用于视觉核对。生产在 `src/ui/styles/tokens.css` 实现 `--hu-*`，Tailwind/shadcn 的 `background/foreground/muted/accent/border/ring/destructive/chart` 只经这一层语义别名桥接；不要求拆除库本身的标准变量名。

### 3.1 颜色 · 纸（浅色，默认）

| Token | 值 | 用途 | 对比度（实测） |
|---|---|---|---|
| `--hu-canvas` | `#F2EFE8` | 图标轨、二级栏；模拟宿主 chrome 仅用于预览 | — |
| `--hu-surface` | `#FBFAF7` | 主区页面底 | — |
| `--hu-raised` | `#FFFFFF` | 卡片、输入框、浮层、对话框 | — |
| `--hu-sunken` | `#EFEBE3` | 分段控件轨道、代码、内嵌井 | — |
| `--hu-line` / `--hu-line-strong` | `#E7E2D8` / `#DAD4C8` | 装饰分隔 / 卡片边框 | 装饰 |
| `--hu-control-line` | `#8C8577` | 表单控件边界 | ≥3:1（raised 与 surface 上） |
| `--hu-fg` | `#1D1A16` | 正文 | 16.6:1（surface） |
| `--hu-fg-2` | `#4F4A42` | 次级文字 | 8.4:1 |
| `--hu-fg-3` | `#6B655B` | 元信息 | 5.5:1（sunken 上 4.9:1） |
| `--hu-fg-4` | `#A29B8F` | 仅装饰，禁止用于占位符、计数或必要信息 | 装饰 |
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

`--hu-canvas→--background-secondary`、`--hu-surface/raised→--background-primary`、`--hu-sunken→--background-secondary-alt`、`--hu-line→--background-modifier-border`、`--hu-fg→--text-normal`、`--hu-fg-2/3→--text-muted`、`--hu-accent→--interactive-accent`、`--hu-accent-fg→--text-on-accent`、`--hu-accent-text→--text-accent`。

映射后按**实际前景/背景对**检查：正文 7:1，次级、元信息、placeholder、状态文字与主按钮文字 4.5:1，控件边界/焦点 3:1。不达标时按整对回退 HUHU 安全色，不能只换前景却保留冲突背景。全套 paper/ink × 6 accent × 宿主来源 × overlay 状态属于主题矩阵。

作用域仅 HUHU root 与所属 Document 的 HUHU Portal；不覆盖 body/Obsidian 全局 CSS 变量。宿主 Markdown/CodeMirror 的既有正文方案、字体、自定义色和导入导出能力单独保留并重做设置布局，不随纸/墨切换改变。只删除旧工作台 UI token/兼容分支，不能把正文外观功能一并删掉。日记/人物等 HUHU 阅读容器可用阅读字体；模拟 notes 的正文只是宿主示意。

状态色、chart 1–N、terminal ANSI 0–15、终端前景/背景/cursor/selection、diff add/delete、搜索高亮、focus/selection 都在同一 token 表。颜色字面量仅允许 token 定义、带来源的第三方资源、测试夹具，以及用户持久化的显式自定义色；模块静态样式不能以“图表/终端”为由绕过。看板 `--db-*` 仅从这层派生。

### 3.5 字体与字阶

| Token | 值 | 用途 |
|---|---|---|
| `--hu-font-ui` | Geist → PingFang SC / Hiragino / 微软雅黑 / Noto Sans CJK SC | 全部界面 |
| `--hu-font-read` | Iowan Old Style / Palatino / Georgia → 宋体 SC / Noto Serif CJK SC | HUHU 日记阅读、人物纪事、首页问候（宿主正文另设） |
| `--hu-font-mono` | Geist Mono → JetBrains Mono / SF Mono / Menlo / Consolas | 终端、日志、路径、diff |
| xs | 12 / 18 | 元信息、计数、帮助文字（中文不得小于 12px） |
| sm | 13 / 20 | 树、表格、导航、按钮 |
| md | 14 / 22 | 正文、表单（默认） |
| lg | 16 / 24 | 页头 H1、详情标题、对话框标题 |
| xl | 20 / 28 | 统计数值、记录标题 |
| 2xl | 28 / 36 | 阅读页大标题（衬线） |
| 字重 | 400 / 500 / 600 | 正文 / 标签与导航 / 标题 |

数字使用 `tabular-nums`。界面字号为明确档位，不承诺同比缩放；不影响宿主正文：

| 档位 | xs / sm / md / lg / xl / 2xl（px） | 最低行高 |
|---|---|---|
| 13 | 12 / 12 / 13 / 15 / 20 / 28 | 对应 18 / 18 / 20 / 24 / 28 / 36 |
| 14（默认） | 12 / 13 / 14 / 16 / 20 / 28 | 18 / 20 / 22 / 24 / 28 / 36 |
| 15 | 12 / 14 / 15 / 17 / 20 / 28 | 18 / 22 / 24 / 26 / 28 / 36 |

首页问候统一使用 2xl 28/36；日记阅读使用独立 `read-body` 17px/1.95，仅阅读容器可用。其他中文不得使用 11px/11.5px。

### 3.6 间距、形状、层级、动效

| 类别 | Token |
|---|---|
| 间距（4px 主网格；2/6 仅图文微间距） | 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 |
| 表单 | 标签→控件 6，控件→帮助 6，字段间 16，章节间 24 |
| 页面内边距 | 宽 24 / 窄 16；内容最大宽 1120，表单最大宽 640 |
| 圆角 | xs 4（复选框、kbd）· sm 6（徽标、树行、菜单项）· md 8（控件）· lg 12（卡片、浮层）· xl 16（对话框、Sheet）· full（开关、头像） |
| 控件高度（紧凑 / 舒适） | 32 / 36；大号 36 / 40；树行 32 / 36；列表行 44 / 52；卡片内边距 16 / 20 |
| 命中区 | 桌面 ≥ 32，触控（`pointer:coarse`）≥ 44，紧凑模式也不缩小 |
| 阴影 | card：`0 1px 2px rgb(40 30 12/.05)`；pop：三层柔和暖色阴影 + 1px 描边，只用于 Popover/Menu/Dialog/Sheet/Toast |
| 层级 | sticky 10 · panel 20；Sheet/Dialog/Command 为同一浮层栈，起点 40，嵌套每层 +10；日期/菜单在其父层之上，Toast 独立非模态，详见 §7 |
| 焦点 | `outline: 2px solid var(--hu-accent)`，offset 2px；输入框改为强调色边框加 3px 半透明光晕 |
| 动效 | fast 120ms（按下、出现）；base 180ms（浮层、Sheet、开关）；缓动 `cubic-bezier(.2,.8,.2,1)`；只动画 transform / opacity；颜色、宽高和阴影立即切换；系统减少动效或设置开启时全部为 0 |
| 密度 | `data-density="compact"`（默认）/`comfortable`，只改行高、内边距、段落，字阶不变 |

### 3.7 差异视图 token（`@pierre/diffs`）

差异组件在 shadow DOM 内渲染，只能经 `--diffs-*` 自定义属性与 `unsafeCSS` 定制。HUHU 在 DiffView 容器上把下表映射过去；不在组件外写 shadow 内部选择器，不另造颜色。`unsafeCSS` 只允许放 HUHU 自有的 hunk 分隔与操作区排版，必须引用 token。

| HUHU token | 值（纸 / 墨） | 映射到 |
|---|---|---|
| `--hu-diff-add-bg` / `--hu-diff-del-bg` | success / danger 与 surface 9% / 8% 混合 | `--diffs-bg-addition-override` / `--diffs-bg-deletion-override` |
| `--hu-diff-add-em` / `--hu-diff-del-em` | 同色 24% / 22% 混合（词级强调） | `--diffs-bg-addition-emphasis-override` / `--diffs-bg-deletion-emphasis-override` |
| `--hu-success` / `--hu-danger` / `--hu-accent` | §3.1–3.3 | `--diffs-addition-color-override` / `--diffs-deletion-color-override` / `--diffs-modified-color-override` |
| `--hu-diff-gutter` | `--hu-sunken` | `--diffs-bg-context-gutter-override` |
| `--hu-diff-sel` | accent 14% | `--diffs-bg-selection-override`、`--diffs-selection-color-override` |
| `--hu-font-mono` · 12.5/22 · tab 4 | §3.5 | `--diffs-font-family`、`--diffs-font-size`、`--diffs-line-height`、`--diffs-tab-size` |
| `--hu-font-ui` | §3.5 | `--diffs-header-font-family` |

语法高亮主题用 `registerCustomCSSVariableTheme` 登记一套 `huhu` 主题，从 `--hu-*` 派生；不使用 pierre-light/dark 等内置配色。纸/墨切换只改变量，组件不重建。

## 4. 布局合同

| 区域 | 规格 |
|---|---|
| 图标轨 | 52px；36×36 按钮，圆角 8；当前项为白底浮起，左侧 3px 强调色条；底部固定通知（数字徽标）与设置 |
| 二级栏 | 默认 272px，可拖动 220–480，双击复位，方向键步进 8px；页头 52px；搜索框最小 32px；分组标题 12px/600；没有内容的模块（自动化、体检、通知）不显示二级栏 |
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
| Button | primary（强调色底，内高光 + 1px 投影）· secondary（白底、strong 边框）· ghost · danger · danger-ghost；紧凑 sm/md 32、lg 36；舒适 sm/md 36、lg 40（sm 仅减少水平留白）；图标 16，间距 6；忙碌时图标旋转、禁止重复点击 |
| Input / Select / Textarea | 白底，`--hu-control-line` 边框，圆角 8；悬停边框加深；聚焦为强调色边框和光晕；错误为危险色边框和 soft 光晕，错误文字通过 `aria-describedby` 关联 |
| DateField | 输入框左侧日历图标、右侧清除；可以手输，失焦/回车时严格校验（`2026-02-31` 报错，不滚到 3 月）；浮层宽 280，单元格 34，圆角 8；今天用强调色文字加底点，选中为强调色实底，范围中间为 soft；底部“今天 / 清除”；Esc 只关浮层 |
| DateRangeField | 一个触发按钮（激活后 soft 强调色）+ 独立清除按钮；浮层内有预设（今天、未来 7 天、本月、过去 30 天）、起止输入、内嵌日历、取消/应用；结束早于开始时禁用“应用”并显示错误 |
| DateTimeField | DateField + 小时/分钟 Input/Select + 明确 IANA 时区；不使用滑块作为唯一输入；值合同见 §7 |
| Switch | 34×20，滑块 14，开启为强调色；提交中 `aria-busy` 并禁用；旁边显示“启用 / 停用 / 保存中”文字；点击不触发所在行 |
| Checkbox | 18px，圆角 4（任务为圆形）；提交中边框变虚线 |
| SegmentedControl | 轨道 sunken，选中项为白底浮起；单选语义 `radiogroup` |
| Tabs | 下划线式，选中 2px 强调色 |
| Card / KPI | 白底、line 边框、card 阴影、圆角 12；卡片头 44px |
| List row | 44 / 52 高，圆角 8；选中为 soft 强调色底加左侧 3px 强调色条；行内次要操作悬停才出现，键盘聚焦时也出现 |
| Tree | 紧凑 32 / 舒适 36，触控至少 44 行高，缩进 14，箭头只负责展开/收起，点名称才选中；搜索命中用 highlight 标记，祖先自动展开；清空搜索后恢复手动展开状态；底部标明已加载数量与分页 |
| Table | 表头 36（12/600 sunken 色，吸顶），行 44；数值列右对齐 |
| Badge / Count / Dot | 徽标高 20、圆角 6；状态点 8px，“运行中”带呼吸光晕 |
| Notice | 图标 + 标题 + 正文 + 可选操作，按 info/success/warning/error 使用 soft 底 |
| Empty | 52px 图标块 + 标题（14/600）+ 一句说明 + 与当前筛选相关的下一步按钮 |
| Dialog / Sheet | 圆角 16，pop 阴影；页头 20px 内边距；底部“取消 / 主操作”，主按钮在右；有未保存内容时 Esc 或点遮罩先确认；焦点限制在内部，关闭后回到触发元素 |
| Toast | 深墨底、反白文字（深色主题反之），左侧语义图标，可带“撤销 / 重试”；失败用 `role=alert` |
| Command | 宽 620，输入框 52 高；分组；↑↓ 选择，回车执行；输入法组合期间回车不执行 |
| Tooltip | 只作补充；图标按钮必须有可访问名称 |
| DiffView | 包装 `@pierre/diffs/react`：文件头 40（状态字母徽标 M/A/D/R/!、路径，重命名显示旧→新、+n −m、折叠），改动块头 36（`@@` 范围 + 块操作），行高 22，行号槽 44（窄宽 36）；分栏/堆叠分段控件，叶子宽 < 600 自动堆叠并禁用分栏；换行、词级高亮开关；未改动内容折叠为“N 行未改动”按钮，按需加载全文；上一处/下一处改动按钮；点行号选行、Shift 扩展，出现“复制所选行 / 复制位置”条 |
| CompareEndpoints | A/B 两个端点胶囊（A 用 danger soft、B 用 success soft，带角色字母，不只靠颜色）+ 交换 + 文件数与 +/− 汇总；任一历史行带 A/B 切换按钮（`aria-pressed`），A=B 时显示无差异空态 |

## 6. 页面、状态与验收映射

页面 ID 与原型路由一致。核心流程与代表状态在 UI-002 原型面板可切换；全部现有表面逐文件映射见 `frontend-inventory.json`，模板/状态/入口/owner 见 `frontend-coverage.md`。复用同一表单/卡片模板的所有字段以当前领域 schema 为准，不凭代表原型省略字段。浏览器证据仅覆盖报告列出的原型路径，生产覆盖由各票 fixtures 逐项回执。

### home · 首页
任务：查看今天的重点并快速开始。问候区使用衬线 28px 标题，下面一行显示逾期、会话、下一个自动化；小组件为 12 栏网格（今日任务、日历、专注、智能体用量、自动化、闪念、最近档案）；编辑布局时出现拖动手柄、上移/下移、移除和撤销。
- UX-HOME-1：今日任务小组件与任务页共用完成态（删除线）和快速添加。
- UX-HOME-2：编辑布局可增删、排序小组件；空看板给出“添加小组件”和“使用默认布局”。

### tasks · 任务
任务：按日期、状态与关联资料整理并完成任务。列表按“逾期 / 今天 / 明天 / 之后 / 无日期 / 已完成”分组；视图分为列表、看板、日历三种；工具栏含搜索、完成状态、日期范围、排序；点击行打开右详情（标题、description、timezone、due（date/time）、planDate、reminderAt、重复规则和 file/folder/archive relations，自动保存）。
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
任务：在终端会话里与 Claude/Codex 协作。二级栏按工作区列出会话（状态点），并提供历史、收件箱、用量、账号入口；主区为会话标签条、终端面板（mono 13/21，跟随主题的 `--hu-term-*`），可左右分屏（窄屏改上下）；会话等待回答时显示横幅，默认动作是定位对应终端；没有结构化 CLI 提问协议时不提供统一“允许/拒绝”按钮；会话信息放在右详情。
- UX-AGENT-1：等待回答的会话在横幅、标签状态点和图标轨角标三处都有提示。

### notifications · 通知
任务：处理系统通知。可筛选未读/全部、全部标为已读；右详情显示来源、投递回执和“打开来源”。
- UX-NOTIFY-1：打开即标为已读，图标轨角标和状态栏同步更新。

### safe · 保险箱
任务：解锁后查看和复制凭据。锁屏卡片带主密码输入和显示切换，错误提示来自领域错误，不臆造剩余尝试次数；解锁后二级栏为分类和快速取密；详情中密码默认遮罩，可显示/复制，复制后 30 秒仅在剪贴板仍等于本次复制值时清除；锁定后清除明文。
- UX-SAFE-1：快速取密（Obsidian 命令或模块内按钮，无默认全局快捷键）支持键盘选择，回车复制密码，⇧回车复制用户名。

### versioning · 版本
任务：管理 Git 更改、提交历史、两个版本比较，以及独立笔记历史/恢复。更改模式区分冲突、未暂存、已暂存；同一文件可出现在两组，分别比较 index→工作树、HEAD→index。提交区仅在更改页，暂存/取消暂存/提交/拉取/推送都为显式操作，有运行中、失败、取消和首次上游确认。历史页按分支/引用筛选，合并提交选择父提交；比较页固定版本 A/B；不因浏览而切分支或改 index。

接入页覆盖 Git 缺失、非仓库、init、clone、remote、author、首次上游、认证失败、冲突/索引锁、同步暂停/继续。克隆遵循当前库外新/空目录与临时目录规则。独立 `revision-review` 叶子保留来源笔记和首次捕获的当前快照，后续修改提示刷新，不自动换端点。

**差异阅读**统一由 DiffView（`@pierre/diffs`，§2/§3.7/§5）承担，包括更改页、提交详情、A⇄B 比较、笔记历史与 revision-review。布局：
- **更改页**：左栏文件列表，按冲突 / 未暂存 / 已暂存分组，每行状态徽标、文件名、目录、+/−。底部固定提交说明、“提交已暂存 · N”、拉取、推送。右侧顶部显示端点徽标（index → 工作树 / HEAD → index / 当前分支 ⇄ 传入）；工具栏、选行条之后是单文件 DiffView。
- **改动块操作**：未暂存块提供“暂存此块”和“还原此块”（还原需确认，先建检查点，结果可撤销）；已暂存块提供“取消暂存此块”。实现基于 `diffAcceptRejectHunk` 计算目标内容，交给 versioning 领域写 index/工作树，UI 不直接写文件。冲突文件用 `UnresolvedFile` 提供“采用当前 / 采用传入 / 两者都保留”，写回由领域确认。
- **提交历史**：左栏为分支/引用筛选和提交图（主线 + 侧线、合并点实心、工作树点为警告色、HEAD/分支/标签徽标）。点一行看该提交相对第一父提交的改动；合并提交可切换父提交。每行 A/B 按钮可把任意两个版本（含工作树）设为比较端点，选中即进入“比较 A ⇄ B”。
- **比较 A ⇄ B**：顶部 CompareEndpoints，下方 `CodeView` 多文件虚拟列表，每个文件可折叠。端点也可在“比较”页直接输入引用。
- **笔记历史**：时间线混合本地采样、手动检查点和当前编辑器快照，三者分别标注；同样用 A/B 任选两点比较，A 不是当前快照时提供“恢复为 A”（走 UX-VER-1）。

二进制显示大小与“在系统中打开”；超过渲染上限只显示统计，可选择“仍然渲染”并可取消；缺失端点说明原因。浏览、选择端点和折叠都不切分支、不改 index。

本地历史采样与配额沿用 `src/modules/versioning/ui/settings-page.tsx` 的实际字段（docs/sync.md 中“后续阶段”描述已落后于代码，由 T-13 更新）；恢复前检查点另列，不能混称持续自动历史。
- UX-VER-1：恢复前预览来源/目标并确认；领域重新核对源叶、文件身份、正文、HEAD/index 与其他编辑器，创建回执/检查点后应用。撤销只在内容与回执仍匹配时允许；新编辑或分歧时提供比较/恢复副本，不承诺随时撤销。只恢复正文，不 reset HEAD/index；暂停同步由领域解除。
- UX-VER-2：差异阅读一致。分栏/堆叠、换行、词级高亮、展开未改动、上一处/下一处改动、选行复制在所有差异入口行为相同，偏好跨入口保持。暂存/还原/取消暂存改动块只作用于该块；冲突三种选择写回前确认。
- UX-VER-3：历史选择。在提交历史或笔记历史中，任一行都能设为 A 或 B，可交换、可设 B 为工作树或当前快照；端点变化立即更新文件列表与 +/− 汇总，焦点留在被按下的按钮上；A=B 显示无差异。

### health · 体检
任务：对现有 HealthScope（archives、belongings、periodic、safe）只读扫描，展示 pass/warning/error/skipped/unavailable/locked/cancelled/incomplete；锁定不等于授权解锁。结果按代码、计数、不可逆 reference 投影，不显示敏感原文或路径。

修复仅允许已注册 owner 的 `rebuild-index` 与 `belonging-projection`，先预览再确认；计划过期、版本变化、部分成功、取消、失败、恢复依据领域回执展示。没有通用 Git 检查点或“重新生成重复任务”的自动修复按钮。
- UX-HEALTH-1：取消保留已完成结果；失败区分未写入、已写待核对与可恢复，不把部分成功显示为全部通过。

### notes · 笔记（宿主叶子）
任务：在 Obsidian 笔记中查看导航器、批注和版本。左叶子为导航器树，中间为宿主阅读视图（尊重正文外观设置），右叶子为批注/版本标签页，可以添加批注。
- UX-NOTES-1：批注单独保存，不改动正文；HUHU 贡献的导航器/批注/历史面板使用同一 token，宿主正文不在 HUHU 主题作用域内。

### settings · 设置
任务：调整外观和各模块设置。二级栏为设置搜索加分组；外观页可设置配色来源（HUHU / 跟随 Obsidian）、明暗（浅/深/跟随系统）、强调色色板、界面字号、界面字体、密度、减少动效，右侧有实时预览卡；另有通用、图标选择、内容与受管文件、设置搜索（命中高亮）。
- UX-SET-1：外观修改立即作用于整个工作台，包括浮层和日期弹层。
- UX-SET-2：设置行统一为“标签 + 说明 | 控件”，窄屏改为上下排列。

## 7. 交互、值与能力合同

- **日期值**：DateField=`YYYY-MM-DD | null`；DateRangeField=`{from: CalendarDate|null,to: CalendarDate|null}`；DateTimeField=`{date:CalendarDate,time:HH:mm,timeZone:IANAZone} | null`。适配层映射任务 timezone/due/reminderAt 与自动化时间戳，不改变领域数据 schema。纯日历日不经 UTC；时刻交给已有时间域转换。DST 不存在/重复时间按领域拒绝或显式消歧，无默认静默纠正；原型本地时间演示不算 DST 验收。
- **差异键盘**：DiffView 是一个区域。行号按钮可聚焦，Enter 选行、Shift+Enter 扩展；改动块头的操作按钮按顺序可达；“上一处 / 下一处改动”把焦点移到对应改动块头。不注册全局 j/k 或 n/p，不拦截编辑器、终端的按键。
- **键盘**：树仅一个 Tab 入口，方向键/Home/End/首字由 Headless Tree 管理，Tab 离开树；行内按钮不能制造每行多组 Tab 停靠。列表/表单保持语义焦点顺序。无模态时 F6 在当前 HUHU 叶子区域循环，有模态时限制在顶层。命令通过 Obsidian 注册，默认不抢全局 Ctrl/Cmd+K、Ctrl/Cmd+Shift+P；终端/编辑器/输入法保留原键位。
- **浮层栈**：每个 ownerDocument 独立 Portal/焦点/监听；顶层 Esc 消费事件，只关闭最内层日期/菜单，再 Dialog/Sheet。Command 不享有固定永远最高层级，其确认框和日期层必须覆盖父层。背景 inert，只有最上层模态捕获 Tab/F6；关闭按栈恢复焦点，来源已卸载时回到同区域的合理后备。Sheet 与 Dialog 共用 Radix 原语，不手写另一套生产 trap。
- **ARIA**：布尔属性通过 React 布尔值正确序列化；checkbox 允许 `mixed`，叶节点省略 aria-expanded，开关/选中按真实角色输出。active descendant、live region、错误帮助与输入逐一关联，不能把所有属性强行限为两个字符串。
- **保存**：按实体排队/合并请求，最新编辑有独立 revision；晚到成功/失败不能覆盖新输入，切换记录或关闭叶子清理监听。提交中/成功/失败可见，失败保留草稿并可重试；只有领域返回可用逆操作时展示撤销。
- **任务边界**：不新增 project/priority/tags 或 UI 私有任务库。看板只投影 existing open/completed/cancelled 与日期分组，不能以拖动引入 doing 状态；关联是现有 file/folder/archive，首页“项目笔记/项目看板”属于 home 数据，不是任务项目字段。重复实例由任务域创建。
- **列表状态**：骨架仅首次加载；刷新保留数据；空/无结果/失败/不可用分别显示。长列表保持虚拟化、分页与选中锚点，密度/触屏变化后同步重测。展开上限不能成为记录加载上限。
- **能力边界**：窄叶子不等于移动端。agent/safe/versioning 的移动端支持以 manifest 为准，不支持时显示不可用，不加载桌面进程。原型 unavailable 独立可切换；390px 同时用于桌面窄分屏。
- **长文本/缩放**：标题可两行，路径省略保留完整名称；320 CSS px 与 200% 下主页面无横向溢出。终端/diff 的明确内部横滚不等于页面溢出。减少动效覆盖第三方日历、图表与终端外壳，不能只置零自有 transition。

### 7.1 全表面组合规则

首页以现有 `BUILTIN_WIDGETS` 18 项和 `SECTION_WIDGETS` 14 项为完整目录。时间/统计、记录表单、导航列表、内容表格/看板、媒体五类共用 Card、工具栏、设置表单和 Empty/Loading/Error；每项保留当前领域配置与功能，不用相同的虚构字段替代。添加/编辑/删除/撤销布局和键盘排序复用 react-grid-layout/dnd-kit。RSS/Dataview 依赖缺失、媒体读取错误、空目录、表单校验、外部链接打开都要有状态。看板主题面板只调整受管 token 与用户显式装饰，不能再建立第二套基础控件主题。

首页收件箱负责捕捉与内容处理；智能体收件箱负责带空间/会话收件人的投递及回执；通知是系统事件与来源跳转。三个入口、标题、空态与命令独立。智能体补齐空间、新会话、历史恢复、收件箱编辑/投递失败、用量、账号/CLI、技能、快捷命令、备份与恢复确认；终端与分屏仍复用 xterm 与 panels。

设置分类由 `app/settings/nav.ts` 与 `settings-categories.ts` 的能力过滤生成：general/appearance/dashboard/editor/navigator/terminal/iconic/contacts/automation/versioning/safe/about，以及开发者 gallery。模块完整字段继续由各 settings-page 与 settings schema 提供，统一 SettingsRow/FormField/Section；搜索索引来自真实字段标签与帮助文字，跳转具体分组/页签/行。UI-002 演示代表字段，不作为删除未画字段的许可。正文外观、主题导入导出、模块开关、通知配置、图标规则和路径选择全部有对应模板与验收 owner。

首次欢迎、设备选择、模块禁用/能力缺失、ContentPanel 新建笔记与目录树、宿主 ribbon/status、编辑器 panel-host、批注回复/孤立锚点与历史比较叶子纳入同一尺寸/焦点/状态规则。详细源码归属与模板清单见 `frontend-coverage.md`；新增/移动前端文件必须更新清单，不能只核对 12 个顶级路由。

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
| 未规定差异引擎（现状 CodeMirror merge + 自写折叠/改动块标记） | 统一 `@pierre/diffs` DiffView，主题经 `--diffs-*` 从 `--hu-*` 映射 | ADR-006 |

## 9. 交接给 S / T / I

- S 引用本文件的 revision、designDigest 与 `prototype_ref`，把 §6 的 UX-* 映射为 AC，把交付包 `source/Frontend_Refactor_Plan.md.txt` §9 的删除清单写成可验收条目。
- T 的 UI 票使用 `design_ref`，取值为本文件页面 ID 与 UX-*；执行者不得重新选风格。
- I 在 Design Conformance 中记录真实 Obsidian 宿主截图与原型的差异。原型只证明原型路径，不证明真实服务、多窗口和持久化。
