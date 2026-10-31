---
schema_version: 3
artifact: ui-prototype
change: 2026-10-31-dev-stabilization-overhaul
design_id: UI-001
status: ready
project_kind: existing
platforms:
  - desktop
candidates:
  - id: candidate-a
    template_id: cross-platform-workspace
    primary_reference: notion
    auxiliaries:
      - reference_id: linear
        dimension: 行节奏与密度
    rationale: 最接近现有 shadcn/Radix 控件体系与 DESIGN-0001；主操作始终可见，满足 AC-241
    structural_difference: 行内主操作簇列表（ul/li）加下方通知面板，容器宽度决定堆叠
    task_id: automation-list-420
    entry: comparison/variants/candidate-a.html
  - id: candidate-b
    template_id: soft-personal-ai
    primary_reference: apple
    auxiliaries:
      - reference_id: figma
        dimension: 选中与焦点处理
    rationale: 圆润感最强，适合低密度设置与引导页面；用于验证圆润上限
    structural_difference: 分组表面内的展开式行（details/summary），运行与编辑收进展开区
    task_id: automation-list-420
    entry: comparison/variants/candidate-b.html
  - id: candidate-c
    template_id: monochrome-console
    primary_reference: vercel
    auxiliaries:
      - reference_id: ibm
        dimension: 表格密度与等宽标识符
    rationale: 数据密度最高，适合审计型表格；用于验证密度上限
    structural_difference: 真实表格加底部检查器，窄容器改为堆叠行
    task_id: automation-list-420
    entry: comparison/variants/candidate-c.html
candidate_count_override: null
selected_candidate: candidate-a
sources:
  - id: huhu-design-system
    locator: docs/design-system.md
  - id: huhu-tokens
    locator: src/ui/styles/tokens.css
  - id: huhu-button
    locator: src/ui/components/button.tsx
  - id: huhu-ui-skill
    locator: .agents/skills/ui/SKILL.md
  - id: baseline-design-0001
    locator: .agents/speculo/.speculo/specdev/design/revisions/DESIGN-0001.md
    revision: DESIGN-0001
  - id: galaxy-ref
    locator: 仅作形态参考，未下载、未复制代码（LOG-007 / source.md W6.19）
    revision: adbd2adde0a299a3956ea288fb444ec01891ca41
  - id: radix-themes-ref
    locator: 仅作比例与交互参考，未下载、未复制代码（source.md W6.20）
  - id: primer-ref
    locator: 仅作比例与交互参考，未下载、未复制代码（source.md W6.20）
prototype_files:
  - final/index.html
  - final/styles.css
  - final/app.js
browser_evidence: evidence/browser.json
updated_at: 2026-10-31T05:14:27.748Z
---

# UI Prototype UI-001: HUHU 全插件 UI 统一（#37 W6.18）

本文件只保存检测、候选和源码/验证证据。设计规则唯一位于 `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/DESIGN.md`。用户已确认全部九项推荐；本包随批准摘要与浏览器复核封板，当前状态见 frontmatter。DESIGN-0002 是按既有用户批准人工发布的例外，标准 promotion 预检拒绝记录保持。

## Project Evidence

- **Target app / scope:** HUHU Obsidian 插件的非 Browser 界面（非 Browser Shell 与其余 12 模块；Agent 浏览器标签和 Home 网页面板也排除），本包验证 W6.18 规定的三个真实内容原型与 BOT/终端复杂状态；未单独渲染且未冻结的页面沿用同一规则迁移；Browser 开发/修复暂停。
- **Primary users / shared task:** 在 Obsidian 桌面端高频使用工作台的单个用户；共同任务 `automation-list-420`：窄容器（约 420px）里读长名称，并保持启停、运行、编辑可达，运行完成后收到以运行时名称快照为主文案的通知。
- **Platforms and input methods:** Obsidian 桌面（Electron）为主；容器宽度适配到 420px 仅是布局压力，不代表新增移动端支持；键盘与鼠标为主，触控命中区 44px 作为模式演示。
- **Evidence mode:** source-only（项目代码与文档）加 rendered（本包 HTML 的真实 Chrome 观察）。生产页面本身未在本任务中打开，生产宿主内表现属用户真机验收。
- **Existing design authority and owner:** `docs/design-system.md` 与 `.agents/skills/ui/SKILL.md`（项目自有）；永久基线 DESIGN-0001（owner `specdev/archive-and-consolidate`，scope 仅 `huhu.workbench`，规则 DS-001 至 DS-006）。
- **Baseline revision and inspected rule IDs:** DESIGN-0001；已读取 DS-001 至 DS-006。DS-001 工作台与宿主状态栏边界、DS-004 响应式断点、DS-005 键盘/焦点/缩放/动效、DS-006 无切场动画直接被本包继承；DS-002 颜色绑定宿主语义变量，本包的颜色仅为预览回退。

| Dimension | Observed fact | Project-relative evidence | Confidence |
|---|---|---|---|
| Framework, styling, components and icons | React 19、Tailwind CSS 4、shadcn/ui 与 Radix；基础控件在 `src/ui/components`，产品组合在 `components/huhu`；不引入第二套 UI 运行时 | `docs/design-system.md`；`src/ui/components/`（button、input、dialog、sheet、tabs、table 等） | high |
| Layout, themes, typography and density | 语义令牌派生自 Obsidian 变量（`--background-primary`、`--text-normal`、`--interactive-accent` 等）；界面字体 Geist 加系统中文回退，等宽 Geist Mono；工具轨、侧栏、主区三栏 | `src/ui/styles/tokens.css`；DESIGN-0001 tokens | high |
| Shapes, elevation, interaction and states | 现有 Button 高度 24/32/36/40，圆角 `rounded-md`，焦点 `ring-[3px]`，`transition-[transform,opacity]`；`--radius` 默认 0.625rem；状态色 green/orange/red/blue/yellow 语义 | `src/ui/components/button.tsx`；`src/ui/styles/tokens.css` | high |
| Responsive and accessibility | 容器宽度驱动布局；桌面命中区 32px、触控 44px；弹层进入所属 Document 的 `huhu-ui` 容器；reduced-motion 与 200% 缩放要求写在基线与 UI 技能中 | DESIGN-0001 DS-004/DS-005；`.agents/skills/ui/references/` | medium（宿主内表现未实机观察） |

### Keep, Adjust, Replace, Add

| Action | Observation and proposed change | Evidence and reason |
|---|---|---|
| Keep | 语义令牌命名与 Obsidian 变量绑定；shadcn/Radix 组件集合；工具轨/侧栏/主区；Geist 加中文回退；32/36/40 控件档与 4px 网格 | tokens.css；DESIGN-0001；LOG-007 要求单一令牌源、不引入第二套运行时 |
| Adjust | 按钮 hover 只改色（不改尺寸）；统一 6/8/12/14 四档圆角；焦点环统一 3px；状态徽标同时用图标与文字；去掉 `--db-*` 等旧别名（ADR-001，不保留兼容层） | LOG-007 禁止项；AC-353；DS-003 |
| Replace | 以容器宽度而非视口宽度决定列表布局；整块区域的 `aria-label` 改为 `aria-labelledby` 加可见/隐藏标题；toast 不再是失败的唯一来源 | AC-211、AC-241；source.md W5.3/W5.5/W6.6 |
| Add | 全状态矩阵（含 busy、read-only、indeterminate）；天气七态；终端状态分层；审批的范围/风险/不确定状态；运行时名称快照通知 | source.md W4.6、W5.2、W5.4、W6.10；LOG-011 |

## Candidate Composition

frontmatter 的 candidates/sources 是结构化记录；此处解释采用理由及冲突裁决，不重复令牌值。三个候选使用同一任务 `automation-list-420` 与同一虚构数据，都在 #37 §10.1 方向内（圆润、克制、内容优先），差异体现在行结构、操作入口、密度与形状语言，不是换色。

| Candidate | Primary / auxiliary dimensions | Structural difference | Cost and risk | Feedback |
|---|---|---|---|---|
| candidate-a | cross-platform-workspace；notion；辅助 linear（行节奏与密度） | 行内主操作簇列表加下方通知面板；容器 ≤480px 堆叠，启停/运行/编辑始终可见 | 迁移成本低，最贴近现有控件；风险是窄容器操作需换行，需验证 44px | 已确认取舍，见批准记录 |
| candidate-b | soft-personal-ai；apple；辅助 figma（选中与焦点） | 分组表面内展开式行，运行/编辑在展开区 | 成本中高；运行/编辑多一步，与 AC-241“主操作可见”冲突，密集列表效率低 | 已确认取舍，见批准记录 |
| candidate-c | monochrome-console；vercel；辅助 ibm（表格密度与等宽标识符） | 真实表格加底部检查器，窄容器改堆叠行 | 成本中；32px 命中区仅达桌面下限，视觉偏控制台，圆润度不足 | 已确认取舍，见批准记录 |

- **Candidate count:** config default（3）。`.agents/speculo/.speculo/specdev/config.json` 不存在，使用 P Work 缺省 3 个；用户未指定数量。
- **Recommended final:** candidate-a（已确认，组合 C 的等宽 ID 与 B 的低密度分组）。理由见 comparison 页与 change DESIGN 的 Selected Direction。
- **Rejected candidates and reasons:** candidate-b 违背主操作始终可见且密度不足；candidate-c 圆润度与触控命中区不足。用户已选择 A，并组合 B 的低密度分组与 C 的等宽 ID 样式。
- **Composition boundary and conflicts resolved:** 主模板拥有整体视觉语言，辅助来源只负责明确维度；Galaxy、Radix Themes、Primer 只作比例与交互参考，未下载、未复制任何代码，不引入完整运行时；若最终采用具体文件，须重新核对并走 W8 来源登记。

## Approval Package

- **Change design:** `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/DESIGN.md`
- **基线候选：** `baseline-draft.md` 固定 DESIGN-0002，替代 DESIGN-0001 当前指针并保留旧快照；这是已获授权的实施前设计意图发布，非首次 bootstrap。
- **用户确认来源：** 本会话“全部按你的推荐落盘”，以及导航缺陷反馈；不可变记录 `evidence/approval.md` 与 `evidence/review-decisions.md`。
- **批准摘要：** 见 change DESIGN revision 2 的 confirmation 与 `evidence/approval-scope-revision-2.md`（原 revision 1 批准保留在 evidence/approval.md）；最新浏览器复核见 `evidence/recheck.json`。
- **历史人工发布例外回执：** `evidence/publication-receipt.json`，记录实施前发布例外、CAS、不可变快照与索引回读。
- **预览绑定：** `evidence/approval.md` 固定 HTML SHA-256 与完整 prototype digest。

原 revision 1 确认覆盖当时 HTML/交互、修复和新基线发布例外；本轮 revision 2 确认只修订范围与执行边界，不再次发布永久基线。两次确认都不授予生产实现或归档移动权限，分别由不可变记录保留。

## Prototype Sources

命名源码块只保存可运行源码；规则与令牌含义见 change DESIGN。物化后的文件必须与下列块逐字一致。

<!-- PROTOTYPE-FILE: final/index.html -->
```html
<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HUHU UI-001 final · 设计包评审 / Design package review</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <defs>
      <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></symbol>
      <symbol id="i-edit" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></symbol>
      <symbol id="i-copy" viewBox="0 0 24 24"><path d="M9 9h10v10H9z"/><path d="M5 15V5h10"/></symbol>
      <symbol id="i-trash" viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/></symbol>
      <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5"/></symbol>
      <symbol id="i-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></symbol>
      <symbol id="i-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
      <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></symbol>
      <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
      <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></symbol>
      <symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/></symbol>
      <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/></symbol>
      <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
      <symbol id="i-lock" viewBox="0 0 24 24"><path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3"/></symbol>
      <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 6h6l2 2h10v11H3z"/></symbol>
      <symbol id="i-cal" viewBox="0 0 24 24"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/></symbol>
      <symbol id="i-term" viewBox="0 0 24 24"><path d="M4 6h16v12H4zM8 10l3 2-3 2M13 15h4"/></symbol>
      <symbol id="i-cloud" viewBox="0 0 24 24"><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1A4.5 4.5 0 0 1 17 18z"/></symbol>
      <symbol id="i-stop" viewBox="0 0 24 24"><path d="M7 7h10v10H7z"/></symbol>
      <symbol id="i-send" viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-3-7z"/></symbol>
      <symbol id="i-key" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/></symbol>
      <symbol id="i-music" viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/></symbol>
      <symbol id="i-filter" viewBox="0 0 24 24"><path d="M4 5h16l-6 8v6l-4-2v-4z"/></symbol>
      <symbol id="i-up" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></symbol>
      <symbol id="i-link" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></symbol>
    </defs>
  </svg>

  <header class="harness">
    <div class="harness-in">
      <h1><span data-zh="HUHU UI-001 评审包（虚构数据，离线）" data-en="HUHU UI-001 review package (fictional data, offline)">HUHU UI-001 评审包（虚构数据，离线）</span></h1>
      <button id="opts-toggle" class="btn btn-outline sm" type="button" data-act="toggleOpts" aria-expanded="false" aria-controls="opts-panel"><span data-zh="显示选项" data-en="View options">显示选项</span></button>
      <div id="opts-panel" class="opts-panel open">
        <div class="opts" role="group" aria-label="View options">
          <button class="btn btn-outline sm" type="button" data-act="lang" data-v="zh" aria-pressed="true">中文</button>
          <button class="btn btn-outline sm" type="button" data-act="lang" data-v="en" aria-pressed="false">English</button>
          <button class="btn btn-outline sm" type="button" data-act="theme" data-v="light" aria-pressed="true" data-zh="亮" data-en="Light">亮</button>
          <button class="btn btn-outline sm" type="button" data-act="theme" data-v="dark" aria-pressed="false" data-zh="暗" data-en="Dark">暗</button>
          <button class="btn btn-outline sm" type="button" data-act="w" data-v="wide" aria-pressed="true" data-zh="容器：宽" data-en="Container: wide">容器：宽</button>
          <button class="btn btn-outline sm" type="button" data-act="w" data-v="600" aria-pressed="false">600px</button>
          <button class="btn btn-outline sm" type="button" data-act="w" data-v="420" aria-pressed="false">420px</button>
          <button class="btn btn-outline sm" type="button" data-act="long" aria-pressed="false" data-zh="长文本" data-en="Long text">长文本</button>
          <button class="btn btn-outline sm" type="button" data-act="touch" aria-pressed="false" data-zh="触控 44px" data-en="Touch 44px">触控 44px</button>
          <button class="btn btn-outline sm" type="button" data-act="motion" aria-pressed="false" data-zh="减少动效" data-en="Reduce motion">减少动效</button>
          <button class="btn btn-outline sm" type="button" data-act="zoom" aria-pressed="false" data-zh="200% 缩放" data-en="200% zoom">200% 缩放</button>
        </div>
      </div>
      <nav class="nav" aria-label="Review pages">
        <button type="button" data-act="route" data-route="gallery" data-zh="组件画廊" data-en="Component gallery">组件画廊</button>
        <button type="button" data-act="route" data-route="list" data-zh="任务 / 自动化列表" data-en="Tasks / automations">任务 / 自动化列表</button>
        <button type="button" data-act="route" data-route="safe" data-zh="保险箱长表单" data-en="Safe long form">保险箱长表单</button>
        <button type="button" data-act="route" data-route="home" data-zh="Home 小组件" data-en="Home widgets">Home 小组件</button>
        <button type="button" data-act="route" data-route="bot" data-zh="BOT 流式与审批" data-en="BOT stream and approval">BOT 流式与审批</button>
        <button type="button" data-act="route" data-route="terminal" data-zh="终端状态分层" data-en="Terminal status layers">终端状态分层</button>
      </nav>
    </div>
  </header>

  <div class="stage">
    <div id="frame" class="frame" data-w="wide">
      <div id="toasts" class="toasts" role="status" aria-live="polite"></div>
      <main id="main" tabindex="-1">
        <h2>Loading</h2>
        <button class="btn btn-outline" type="button" disabled>Loading</button>
      </main>
    </div>
    <p class="preview-note" style="margin-top:12px" data-zh="颜色为仅预览的回退值（生产绑定 Obsidian 语义变量）；字体 Geist 未随包分发，使用系统回退。" data-en="Colors are PREVIEW-ONLY fallbacks (production binds Obsidian semantic variables); Geist is not bundled, system fallback is used.">颜色为仅预览的回退值（生产绑定 Obsidian 语义变量）；字体 Geist 未随包分发，使用系统回退。</p>
  </div>
  <script src="app.js"></script>
</body>
</html>
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/styles.css -->
```css
/* UI-001 final (candidate-a: balanced rounded workbench).
 * Token names mirror src/ui/styles/tokens.css (DS-002): semantic tokens read Obsidian variables.
 * The --background-* / --text-* / --interactive-* values below are PREVIEW-ONLY fallbacks, not host colors. */
:root {
  color-scheme: light;
  /* PREVIEW-ONLY Obsidian fallbacks (light) */
  --background-primary: #ffffff;
  --background-primary-alt: #f8f8f6;
  --background-secondary: #f1f1ee;
  --background-modifier-hover: #e9e9e5;
  --background-modifier-border: #deded9;
  --text-normal: #1f1f1d;
  --text-muted: #5b5b56;
  --text-on-accent: #ffffff;
  --text-error: #b3261e;
  --interactive-accent: #1d6b64;
  --color-green: #1c7436;
  --color-orange: #8a5300;
  --color-red: #b3261e;
  --color-blue: #1d5ea6;
  --color-yellow: #6f5a00;
  /* semantic tokens (single source in production: src/ui/styles/tokens.css) */
  --background: var(--background-primary);
  --foreground: var(--text-normal);
  --card: var(--background-primary-alt);
  --muted: var(--background-secondary);
  --muted-foreground: var(--text-muted);
  --accent: var(--background-modifier-hover);
  --primary: var(--interactive-accent);
  --primary-foreground: var(--text-on-accent);
  --destructive: var(--text-error);
  --border: var(--background-modifier-border);
  --input: #86867f;
  --ring: var(--interactive-accent);
  --status-success: var(--color-green);
  --status-warning: var(--color-orange);
  --status-error: var(--color-red);
  --status-info: var(--color-blue);
  --status-working: var(--color-yellow);
  --tint-success: color-mix(in srgb, var(--color-green) 11%, var(--background));
  --tint-warning: color-mix(in srgb, var(--color-orange) 12%, var(--background));
  --tint-error: color-mix(in srgb, var(--color-red) 10%, var(--background));
  --tint-info: color-mix(in srgb, var(--color-blue) 10%, var(--background));
  --tint-working: color-mix(in srgb, var(--color-yellow) 13%, var(--background));
  --tint-primary: color-mix(in srgb, var(--interactive-accent) 12%, var(--background));
  /* scale */
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 20px; --s6: 24px; --s8: 32px;
  --h-sm: 32px; --h-md: 36px; --h-lg: 40px;
  --hit: 32px;
  --r-sm: 6px; --r-md: 8px; --r-lg: 12px; --r-xl: 14px;
  --fs-body: 14px; --fs-dense: 13px; --fs-meta: 12px; --fs-title: 16px; --fs-page: 20px;
  --font-ui: "Geist", system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, "Noto Sans Mono CJK SC", monospace;
  --shadow-pop: 0 6px 20px rgb(0 0 0 / 14%), 0 1px 3px rgb(0 0 0 / 10%);
  --dur: 120ms;
}
html[data-theme="dark"] {
  color-scheme: dark;
  --background-primary: #1c1c1a;
  --background-primary-alt: #222220;
  --background-secondary: #272725;
  --background-modifier-hover: #323230;
  --background-modifier-border: #3b3b38;
  --text-normal: #e9e9e5;
  --text-muted: #a9a9a2;
  --text-on-accent: #07201d;
  --text-error: #ff8d84;
  --interactive-accent: #62bfb3;
  --color-green: #6fcf8a;
  --color-orange: #f0b058;
  --color-red: #ff8d84;
  --color-blue: #7db7f2;
  --color-yellow: #dcc65a;
  --input: #8d8d86;
  --shadow-pop: 0 6px 20px rgb(0 0 0 / 50%), 0 1px 3px rgb(0 0 0 / 40%);
}
html[data-touch="1"] { --hit: 44px; --h-sm: 44px; --h-md: 44px; --h-lg: 48px; }
html[data-zoom="2"] body { zoom: 2; }

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; min-width: 320px; background: var(--muted); color: var(--foreground); font: var(--fs-body)/1.5 var(--font-ui); overflow-x: hidden; }
h1, h2, h3, h4, p { margin: 0; }
h1 { font-size: var(--fs-page); line-height: 28px; font-weight: 650; letter-spacing: 0; }
h2 { font-size: var(--fs-title); line-height: 24px; font-weight: 600; }
h3 { font-size: var(--fs-body); line-height: 20px; font-weight: 600; }
.meta { color: var(--muted-foreground); font-size: var(--fs-meta); line-height: 16px; }
.mono { font-family: var(--font-mono); font-size: var(--fs-dense); }
.wrap { overflow-wrap: anywhere; }
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
svg.i { width: 16px; height: 16px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.preview-note { color: var(--muted-foreground); font-size: var(--fs-meta); }

/* ---- prototype harness (not part of HUHU UI) ---- */
.harness { position: sticky; top: 0; z-index: 30; background: var(--background); border-bottom: 1px solid var(--border); }
.harness-in { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s2) var(--s4); padding: var(--s2) var(--s4); max-width: 1480px; margin: 0 auto; }
.harness h1 { font-size: var(--fs-title); line-height: 24px; margin-right: auto; }
.nav { display: flex; flex-wrap: wrap; gap: var(--s1); width: 100%; }
.nav [data-route] { font-family: inherit; cursor: pointer; background: transparent; display: inline-flex; align-items: center; min-height: var(--hit); padding: 0 var(--s3); border-radius: var(--r-md); color: var(--muted-foreground); text-decoration: none; font-size: var(--fs-dense); font-weight: 500; border: 1px solid transparent; }
.nav [data-route]:hover, .nav [data-route].is-hover { background: var(--accent); color: var(--foreground); }
.nav [data-route][aria-current="page"] { background: var(--tint-primary); color: var(--foreground); border-color: color-mix(in srgb, var(--primary) 40%, transparent); }
.opts { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s2); }
.opts-panel { display: flex; }
#opts-toggle { display: none; }
@media (max-width: 720px) {
  #opts-toggle { display: inline-flex; }
  .opts-panel { display: none; width: 100%; }
  .opts-panel.open { display: flex; }
}
.stage { max-width: 1480px; margin: 0 auto; padding: var(--s4); }
.frame { container-type: inline-size; container-name: frame; width: 100%; max-width: var(--fw, 100%); margin: 0 auto; background: var(--background); border: 1px solid var(--border); border-radius: var(--r-lg); padding: var(--s4); min-height: 240px; }
.frame[data-w="600"] { --fw: 600px; }
.frame[data-w="420"] { --fw: 420px; padding: var(--s3); }
.page-head { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--s2) var(--s4); margin-bottom: var(--s4); }
.page-head > div { flex: 1 1 260px; min-width: 0; }
.page-head p { color: var(--muted-foreground); font-size: var(--fs-dense); margin-top: 2px; }
.sec { border-top: 1px solid var(--border); padding-top: var(--s4); margin-top: var(--s5); }
.sec > h2 { margin-bottom: var(--s1); }
.sec > .meta { margin-bottom: var(--s3); display: block; }
.grid { display: grid; gap: var(--s3); grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); align-items: start; }
.grid.w2 { grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); }
.cell { display: flex; flex-direction: column; gap: var(--s2); min-width: 0; }
.cell > .lbl { font-size: var(--fs-meta); color: var(--muted-foreground); font-family: var(--font-mono); }
.row-wrap { display: flex; flex-wrap: wrap; gap: var(--s2); align-items: center; }

/* ---- Button ---- */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--s2); min-height: var(--h-md); min-width: var(--hit); padding: 0 var(--s3); border: 1px solid transparent; border-radius: var(--r-md); background: transparent; color: var(--foreground); font: 500 var(--fs-dense)/20px var(--font-ui); cursor: pointer; white-space: nowrap; text-decoration: none; transition: background-color var(--dur) ease, border-color var(--dur) ease, color var(--dur) ease, opacity var(--dur) ease; }
.btn.sm { min-height: var(--h-sm); padding: 0 var(--s2); }
.btn.lg { min-height: var(--h-lg); padding: 0 var(--s4); font-size: var(--fs-body); }
.btn.icon { padding: 0; width: var(--h-md); }
.btn.icon.sm { width: var(--h-sm); } .btn.icon.lg { width: var(--h-lg); }
.btn-primary { background: var(--primary); color: var(--primary-foreground); }
.btn-primary:hover, .btn-primary.is-hover { background: color-mix(in srgb, var(--primary) 88%, var(--foreground)); }
.btn-primary:active, .btn-primary.is-active { background: color-mix(in srgb, var(--primary) 78%, var(--foreground)); }
.btn-secondary { background: var(--muted); border-color: var(--border); }
.btn-secondary:hover, .btn-secondary.is-hover { background: var(--accent); }
.btn-secondary:active, .btn-secondary.is-active { background: color-mix(in srgb, var(--accent) 80%, var(--foreground) 8%); }
.btn-outline { border-color: var(--input); background: var(--background); }
.btn-outline:hover, .btn-outline.is-hover { background: var(--accent); }
.btn-outline:active, .btn-outline.is-active { background: color-mix(in srgb, var(--accent) 80%, var(--foreground) 8%); }
.btn-ghost:hover, .btn-ghost.is-hover { background: var(--accent); }
.btn-ghost:active, .btn-ghost.is-active { background: color-mix(in srgb, var(--accent) 80%, var(--foreground) 8%); }
.btn-danger { background: var(--background); border-color: var(--destructive); color: var(--destructive); }
.btn-danger:hover, .btn-danger.is-hover { background: var(--tint-error); }
.btn-danger:active, .btn-danger.is-active { background: color-mix(in srgb, var(--tint-error) 80%, var(--destructive) 12%); }
.btn-danger.solid { background: var(--destructive); color: var(--background); }
:where(.btn, .nav [data-route], .field, .check input, .radio input, .switch input, .tab, .menu-item, .row-btn, summary, .scroll-region):focus-visible,
.btn.is-focus, .field.is-focus, .tab.is-focus { outline: 3px solid var(--ring); outline-offset: 1px; }
.btn:disabled, .btn[aria-disabled="true"], .is-disabled { opacity: .5; cursor: not-allowed; }
.btn[aria-busy="true"], .btn.is-busy { cursor: progress; }
.btn[aria-busy="true"] { pointer-events: none; }
.spin { width: 14px; height: 14px; border: 2px solid color-mix(in srgb, currentColor 30%, transparent); border-top-color: currentColor; border-radius: 50%; animation: spin .8s linear infinite; flex: none; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ---- Fields ---- */
.field-wrap { display: flex; flex-direction: column; gap: var(--s1); min-width: 0; }
.field-wrap > label, .label { font-size: var(--fs-dense); font-weight: 500; line-height: 20px; }
.field { width: 100%; min-height: var(--h-md); padding: 6px var(--s3); border: 1px solid var(--input); border-radius: var(--r-md); background: var(--background); color: var(--foreground); font: var(--fs-body)/22px var(--font-ui); transition: border-color var(--dur) ease, background-color var(--dur) ease; }
textarea.field { resize: vertical; min-height: 72px; }
.field::placeholder { color: var(--muted-foreground); }
.field:hover, .field.is-hover { border-color: var(--foreground); }
.field:focus-visible, .field:focus, .field.is-focus { outline: 3px solid var(--ring); outline-offset: 0; border-color: var(--ring); }
.field.is-error, .field[aria-invalid="true"] { border-color: var(--destructive); }
.field[readonly], .field.is-readonly { background: var(--muted); border-style: dashed; cursor: default; }
.field:disabled, .field.is-disabled { background: var(--muted); opacity: .55; cursor: not-allowed; }
.field.is-busy { background-image: linear-gradient(90deg, transparent, var(--accent), transparent); background-size: 200% 100%; animation: sweep 1.4s linear infinite; }
@keyframes sweep { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.help { font-size: var(--fs-meta); line-height: 16px; color: var(--muted-foreground); }
.help.err { color: var(--destructive); display: flex; gap: var(--s1); align-items: flex-start; }
.input-group { display: flex; gap: var(--s2); align-items: stretch; }
.input-group .field { flex: 1 1 0; min-width: 0; }
select.field { appearance: none; padding-right: 32px; background-image: linear-gradient(45deg, transparent 50%, var(--muted-foreground) 50%), linear-gradient(135deg, var(--muted-foreground) 50%, transparent 50%); background-position: calc(100% - 17px) 50%, calc(100% - 12px) 50%; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; }

/* ---- Check / Radio / Switch ---- */
.check, .radio, .switch { display: inline-flex; align-items: center; gap: var(--s2); min-height: var(--hit); font-size: var(--fs-body); cursor: pointer; }
.check input, .radio input { appearance: none; width: 18px; height: 18px; margin: 0; border: 1px solid var(--input); background: var(--background); display: grid; place-content: center; cursor: inherit; flex: none; transition: background-color var(--dur) ease, border-color var(--dur) ease; }
.check input { border-radius: 5px; } .radio input { border-radius: 50%; }
.check input:hover, .radio input:hover, .is-hover > input { border-color: var(--foreground); }
.check input:checked, .check input:indeterminate { background: var(--primary); border-color: var(--primary); }
.check input:checked::after { content: ""; width: 9px; height: 5px; border: solid var(--primary-foreground); border-width: 0 0 2px 2px; transform: translateY(-1px) rotate(-45deg); }
.check input:indeterminate::after { content: ""; width: 9px; height: 2px; background: var(--primary-foreground); }
.radio input:checked { border-color: var(--primary); border-width: 5px; background: var(--background); }
.check input[aria-invalid="true"] { border-color: var(--destructive); }
.check:has(input:disabled), .radio:has(input:disabled), .switch:has(input:disabled) { opacity: .5; cursor: not-allowed; }
.switch input { appearance: none; width: 36px; height: 20px; margin: 0; border-radius: 10px; background: var(--input); position: relative; cursor: inherit; flex: none; transition: background-color var(--dur) ease; }
.switch input::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--background); transition: transform var(--dur) ease; }
.switch input:checked { background: var(--primary); }
.switch input:checked::after { transform: translateX(16px); }
.switch input:hover { filter: brightness(.94); }
.switch.is-busy input { opacity: .6; }

/* ---- Tabs ---- */
.tabs { display: flex; gap: var(--s1); border-bottom: 1px solid var(--border); overflow-x: auto; scrollbar-width: thin; }
.tab { display: inline-flex; align-items: center; gap: var(--s2); min-height: var(--h-md); padding: 0 var(--s3); border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--muted-foreground); font: 500 var(--fs-dense)/20px var(--font-ui); cursor: pointer; white-space: nowrap; border-radius: var(--r-sm) var(--r-sm) 0 0; margin-bottom: -1px; transition: color var(--dur) ease, background-color var(--dur) ease; }
.tab:hover, .tab.is-hover { background: var(--accent); color: var(--foreground); }
.tab[aria-selected="true"] { color: var(--foreground); border-bottom-color: var(--primary); }
.tab:disabled { opacity: .5; cursor: not-allowed; }

/* ---- Badge / status ---- */
.badge { display: inline-flex; align-items: center; gap: var(--s1); min-height: 22px; padding: 0 var(--s2); border-radius: var(--r-sm); font-size: var(--fs-meta); font-weight: 500; line-height: 16px; background: var(--muted); color: var(--foreground); border: 1px solid var(--border); white-space: nowrap; }
.badge.success { background: var(--tint-success); color: var(--status-success); border-color: color-mix(in srgb, var(--status-success) 35%, transparent); }
.badge.warning { background: var(--tint-warning); color: var(--status-warning); border-color: color-mix(in srgb, var(--status-warning) 35%, transparent); }
.badge.error { background: var(--tint-error); color: var(--status-error); border-color: color-mix(in srgb, var(--status-error) 35%, transparent); }
.badge.info { background: var(--tint-info); color: var(--status-info); border-color: color-mix(in srgb, var(--status-info) 35%, transparent); }
.badge.working { background: var(--tint-working); color: var(--status-working); border-color: color-mix(in srgb, var(--status-working) 35%, transparent); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: none; }

/* ---- Empty / skeleton / banner ---- */
.empty { display: flex; flex-direction: column; align-items: flex-start; gap: var(--s2); padding: var(--s5) var(--s4); border: 1px dashed var(--input); border-radius: var(--r-lg); color: var(--muted-foreground); }
.empty h3 { color: var(--foreground); }
.skel { display: block; height: 14px; border-radius: var(--r-sm); background: var(--accent); animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: .5; } }
.banner { display: flex; gap: var(--s3); align-items: flex-start; padding: var(--s3); border-radius: var(--r-md); border: 1px solid var(--border); background: var(--muted); font-size: var(--fs-dense); }
.banner.error { background: var(--tint-error); border-color: color-mix(in srgb, var(--status-error) 40%, transparent); }
.banner.warning { background: var(--tint-warning); border-color: color-mix(in srgb, var(--status-warning) 40%, transparent); }
.banner.info { background: var(--tint-info); border-color: color-mix(in srgb, var(--status-info) 40%, transparent); }
.banner.success { background: var(--tint-success); border-color: color-mix(in srgb, var(--status-success) 40%, transparent); }
.banner > div { flex: 1; min-width: 0; }
.banner .acts { display: flex; flex-wrap: wrap; gap: var(--s2); margin-top: var(--s2); }

/* ---- Settings row ---- */
.group { border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; }
.group-h { padding: var(--s2) var(--s4); background: var(--muted); font-size: var(--fs-meta); font-weight: 600; color: var(--muted-foreground); letter-spacing: .02em; }
.srow { display: flex; align-items: center; gap: var(--s4); padding: var(--s3) var(--s4); border-top: 1px solid var(--border); min-height: 56px; }
.srow:first-of-type { border-top: 0; }
.srow > div:first-child { flex: 1; min-width: 0; }
.srow > .ctl { flex: none; max-width: 50%; display: flex; gap: var(--s2); align-items: center; }
@container frame (max-width: 480px) { .srow { flex-wrap: wrap; } .srow > .ctl { max-width: 100%; width: 100%; } }

/* ---- Table / scroll ---- */
.scroll-region { overflow: auto; border: 1px solid var(--border); border-radius: var(--r-md); max-height: 280px; scrollbar-width: thin; }
table.tbl { border-collapse: collapse; width: 100%; font-size: var(--fs-dense); }
.tbl th, .tbl td { text-align: left; padding: var(--s2) var(--s3); border-bottom: 1px solid var(--border); vertical-align: middle; white-space: nowrap; }
.tbl th { position: sticky; top: 0; background: var(--muted); font-weight: 600; color: var(--muted-foreground); font-size: var(--fs-meta); }
.tbl tr:hover td { background: var(--accent); }
.tbl tr[aria-selected="true"] td { background: var(--tint-primary); }

/* ---- Overlays ---- */
dialog.dlg { border: 1px solid var(--border); border-radius: var(--r-xl); padding: 0; background: var(--background); color: var(--foreground); width: min(480px, calc(100vw - 24px)); box-shadow: var(--shadow-pop); }
dialog.dlg::backdrop { background: rgb(0 0 0 / 40%); }
dialog.sheet { margin: 0 0 0 auto; height: 100dvh; max-height: 100dvh; width: min(380px, 100vw); border-radius: var(--r-xl) 0 0 var(--r-xl); }
dialog.sheet.bottom { margin: auto 0 0 0; width: 100vw; max-width: 100vw; height: auto; max-height: 85dvh; border-radius: var(--r-xl) var(--r-xl) 0 0; }
.dlg-h { padding: var(--s4) var(--s4) var(--s2); }
.dlg-b { padding: var(--s2) var(--s4) var(--s4); display: flex; flex-direction: column; gap: var(--s3); }
.dlg-f { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--s2); padding: var(--s3) var(--s4); border-top: 1px solid var(--border); background: var(--card); }
.static-dlg { position: static; display: block; margin: 0; box-shadow: none; width: min(440px, 100%); border: 1px solid var(--border); border-radius: var(--r-xl); background: var(--background); }
.pop { position: absolute; z-index: 40; min-width: 200px; max-width: min(320px, calc(100vw - 24px)); background: var(--background); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-pop); padding: var(--s1); }
.pop.pad { padding: var(--s3); }
.pop[hidden] { display: none; }
.anchor { position: relative; display: inline-block; }
.menu-item { display: flex; align-items: center; gap: var(--s2); width: 100%; min-height: var(--h-sm); padding: 0 var(--s2); border: 0; border-radius: var(--r-sm); background: transparent; color: var(--foreground); font: var(--fs-dense)/20px var(--font-ui); text-align: left; cursor: pointer; }
.menu-item:hover, .menu-item.is-hover, .menu-item:focus-visible { background: var(--accent); }
.menu-item.danger { color: var(--destructive); }
.menu-item:disabled { opacity: .5; cursor: not-allowed; }
.menu-sep { height: 1px; background: var(--border); margin: var(--s1) 0; }
.tip { position: absolute; z-index: 50; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); background: var(--foreground); color: var(--background); font-size: var(--fs-meta); line-height: 16px; padding: 4px var(--s2); border-radius: var(--r-sm); white-space: nowrap; pointer-events: none; }
.tip[hidden] { display: none; }
.tip.static { position: static; transform: none; display: inline-block; }
.toasts { position: fixed; right: var(--s4); bottom: var(--s4); z-index: 60; display: flex; flex-direction: column; gap: var(--s2); width: min(360px, calc(100vw - 32px)); }
.toast { background: var(--background); border: 1px solid var(--border); border-left: 3px solid var(--primary); border-radius: var(--r-md); box-shadow: var(--shadow-pop); padding: var(--s3); font-size: var(--fs-dense); }
.toast.error { border-left-color: var(--status-error); }
.toast .t { font-weight: 600; overflow-wrap: anywhere; }
@container frame (max-width: 480px) {
  .toasts { position: static; width: 100%; margin-bottom: var(--s3); }
  .toasts:empty { margin-bottom: 0; }
  .toast { box-shadow: none; }
}

/* ---- list rows (automations / tasks / entries) ---- */
.toolbar { display: flex; flex-wrap: wrap; gap: var(--s2); align-items: center; margin-bottom: var(--s3); }
.toolbar .field { flex: 1 1 160px; width: auto; }
.list { border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; }
.item { margin: 0; border: 0; border-top: 1px solid var(--border); display: grid; gap: var(--s1) var(--s3); padding: var(--s3); align-items: center; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "name acts" "meta acts"; }
.item:first-child { border-top: 0; }
.item:hover { background: var(--accent); }
.item[aria-selected="true"] { background: var(--tint-primary); }
.item .nm { grid-area: name; min-width: 0; font-weight: 600; font-size: var(--fs-body); overflow-wrap: anywhere; }
.item .mt { grid-area: meta; display: flex; flex-wrap: wrap; gap: var(--s1) var(--s3); align-items: center; color: var(--muted-foreground); font-size: var(--fs-meta); min-width: 0; }
.item .ac { grid-area: acts; display: flex; align-items: center; gap: var(--s1); }
.item .cols { display: none; }
@container frame (max-width: 480px) {
  .item { grid-template-columns: minmax(0, 1fr); grid-template-areas: "name" "meta" "acts"; }
  .item .ac { justify-content: flex-start; flex-wrap: wrap; padding-top: var(--s1); }
  .item .ac .lbl-sw { margin-right: auto; }
}
@container frame (min-width: 760px) {
  .item.auto { grid-template-columns: minmax(200px, 2fr) minmax(120px, 1fr) minmax(140px, 1fr) 110px auto; grid-template-areas: "name trg last st acts"; }
  .item.auto .mt { display: contents; }
  .item.auto .mt > * { grid-area: auto; }
}
.tag-row { display: flex; flex-wrap: wrap; gap: var(--s1); }
.chip { display: inline-flex; align-items: center; gap: var(--s1); min-height: 24px; padding: 0 var(--s2); border-radius: var(--r-sm); background: var(--muted); border: 1px solid var(--border); font-size: var(--fs-meta); }
.chip button { border: 0; background: transparent; color: inherit; cursor: pointer; padding: 0; min-width: 20px; min-height: 20px; border-radius: var(--r-sm); display: inline-grid; place-items: center; }
.chip button:hover { background: var(--accent); }
.chip button:focus-visible { outline: 3px solid var(--ring); }
.split { display: grid; gap: var(--s4); grid-template-columns: minmax(0, 1fr); }
@container frame (min-width: 760px) { .split { grid-template-columns: minmax(240px, 300px) minmax(0, 1fr); } .split.even { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.pane { min-width: 0; display: flex; flex-direction: column; gap: var(--s3); }
.kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: var(--s1) var(--s3); font-size: var(--fs-dense); }
.kv dt { color: var(--muted-foreground); } .kv dd { margin: 0; overflow-wrap: anywhere; }
.notif { border: 1px solid var(--border); border-radius: var(--r-md); padding: var(--s3); display: flex; flex-direction: column; gap: var(--s1); }
.notif.unread { border-left: 3px solid var(--primary); }
.notif .t { font-weight: 600; overflow-wrap: anywhere; }

/* ---- widgets ---- */
.board { display: grid; gap: var(--s3); grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); align-items: stretch; }
.widget { border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--card); padding: var(--s3) var(--s4); display: flex; flex-direction: column; gap: var(--s2); min-width: 0; min-height: 132px; }
.widget header { display: flex; align-items: center; gap: var(--s2); }
.widget header h3 { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.big { font-size: 28px; line-height: 34px; font-weight: 600; font-variant-numeric: tabular-nums; }
.bar { height: 8px; border-radius: 4px; background: var(--accent); position: relative; overflow: hidden; }
.bar > i { position: absolute; inset: 0 auto 0 0; background: var(--primary); }
.legend { display: flex; flex-wrap: wrap; gap: var(--s3); font-size: var(--fs-meta); color: var(--muted-foreground); }

/* ---- chat / bot ---- */
.chat { border: 1px solid var(--border); border-radius: var(--r-lg); display: flex; flex-direction: column; min-height: 0; }
.stream { overflow: auto; max-height: 420px; padding: var(--s4); display: flex; flex-direction: column; gap: var(--s4); scrollbar-width: thin; }
.msg { display: flex; flex-direction: column; gap: var(--s1); max-width: 100%; min-width: 0; }
.msg .who { font-size: var(--fs-meta); color: var(--muted-foreground); font-weight: 600; }
.msg .body { overflow-wrap: anywhere; white-space: pre-wrap; }
.msg.user .body { background: var(--muted); border-radius: var(--r-lg); padding: var(--s2) var(--s3); align-self: flex-start; max-width: 100%; }
.caret { display: inline-block; width: 7px; height: 14px; background: var(--foreground); vertical-align: -2px; margin-left: 2px; opacity: .7; }
.tool { border: 1px solid var(--border); border-radius: var(--r-md); padding: var(--s2) var(--s3); display: flex; gap: var(--s2); align-items: center; font-size: var(--fs-dense); background: var(--card); flex-wrap: wrap; }
.approval { border: 1px solid color-mix(in srgb, var(--status-warning) 50%, var(--border)); border-radius: var(--r-md); padding: var(--s3); display: flex; flex-direction: column; gap: var(--s2); background: var(--tint-warning); }
.approval[data-st="approved"] { background: var(--tint-success); border-color: color-mix(in srgb, var(--status-success) 50%, var(--border)); }
.approval[data-st="denied"], .approval[data-st="failed"] { background: var(--tint-error); border-color: color-mix(in srgb, var(--status-error) 50%, var(--border)); }
.approval[data-st="uncertain"] { background: var(--tint-info); border-color: color-mix(in srgb, var(--status-info) 50%, var(--border)); }
.composer { display: flex; flex-direction: column; gap: var(--s2); padding: var(--s3); border-top: 1px solid var(--border); }
.newpill { align-self: center; }

/* ---- terminal ---- */
.termbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s2) var(--s3); padding: var(--s2) var(--s3); border: 1px solid var(--border); border-radius: var(--r-md) var(--r-md) 0 0; background: var(--muted); }
.termbar[data-st="stopping"] { background: var(--tint-working); }
.termbar[data-st="unconfirmed"], .termbar[data-st="cleanup"] { background: var(--tint-warning); }
.termbar[data-st="crashed"] { background: var(--tint-error); }
.termbar .msg-t { flex: 1 1 200px; min-width: 0; font-size: var(--fs-dense); }
.tech { border: 1px solid var(--border); border-top: 0; padding: var(--s3); background: var(--card); }
.term { border: 1px solid var(--border); border-radius: 0 0 var(--r-md) var(--r-md); background: #121211; color: #dcdcd6; font-family: var(--font-mono); font-size: 13px; line-height: 20px; display: flex; flex-direction: column; }
.term-out { height: 190px; overflow: auto; padding: var(--s2) var(--s3); white-space: pre-wrap; overflow-wrap: anywhere; }
.term-in { display: flex; gap: var(--s2); align-items: center; padding: 0 var(--s3) var(--s2); }
.term-in input { flex: 1; min-width: 0; background: transparent; border: 0; border-bottom: 1px solid #77776f; color: inherit; font: inherit; min-height: 28px; }
.term-in input:focus-visible { outline: 2px solid #62bfb3; outline-offset: 2px; }
.term-in input:disabled { opacity: .5; }

/* ---- layout contracts ---- */
.rule-list { margin: 0; padding-left: var(--s5); display: flex; flex-direction: column; gap: var(--s1); font-size: var(--fs-dense); }
html[data-motion="reduce"] *, html[data-motion="reduce"] *::before, html[data-motion="reduce"] *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
@media (pointer: coarse) { :root { --hit: 44px; --h-sm: 44px; --h-md: 44px; --h-lg: 48px; } }
@media (max-width: 720px) { .stage { padding: var(--s2); } .harness-in { padding: var(--s2); } .frame { padding: var(--s3); } }

/* ---- additions: clamp, container layouts, safe navigation ---- */
.clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rot svg { transform: rotate(90deg); }
.grow { flex: 1; }
.item .c-trg { grid-area: auto; }
@container frame (min-width: 760px) {
  .item.auto .c-trg { grid-area: trg; } .item.auto .c-last { grid-area: last; } .item.auto .c-st { grid-area: st; }
}
.sf .back { display: none; }
@container frame (max-width: 759px) {
  .sf[data-view="edit"] .lp { display: none; }
  .sf[data-view="list"] .ep { display: none; }
  .sf .back { display: inline-flex; }
}
.item.btn-ghost:hover { background: var(--accent); }
.item[aria-current="true"] { background: var(--tint-primary); }

.widget .list { border: 0; border-radius: 0; }
.widget .item { padding-left: 0; padding-right: 0; }
.widget .btn { align-self: flex-start; }
.widget .banner .btn, .widget .row-wrap .btn { align-self: auto; }
.row-wrap.top { align-items: flex-start; }
.stack { display: flex; flex-direction: column; gap: var(--s3); }
.vname { font-size: var(--fs-meta); font-weight: 600; color: var(--muted-foreground); }
[hidden] { display: none !important; }
.stream { max-height: 560px; }
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/app.js -->
```javascript
/* UI-001 final. In-memory mock only: no network, no persistence, fictional data. */
(function () {
  'use strict';
  const root = document.documentElement;
  const main = document.getElementById('main');
  const frame = document.getElementById('frame');
  const S = {
    lang: 'zh', theme: 'light', route: 'gallery', w: 'wide', long: false, touch: false, motion: false, zoom: false,
    listTab: 'auto', listMode: 'normal', q: '', expanded: {}, notifs: [], selNotif: null, taskFail: false, taskDraft: '', taskThrough: '2026-11-13',
    tasks: [
      { id: 't1', title: 'Prepare the quarterly review notes and attach the vault statistics export', done: false, proj: 'Review', from: '2026-11-02', through: '2026-11-13' },
      { id: 't2', title: '整理本周闪念并归档到对应项目', done: false, proj: '个人', from: '2026-11-03', through: '2026-12-05' },
      { id: 't3', title: 'Renew the domain', done: true, proj: 'Ops', from: '2026-10-28', through: '2026-11-01' }
    ],
    autos: [
      { id: 'a1b2c3d4', name: 'Daily digest: summarize the inbox and weekly review notes into the journal', trigger: 'cron', on: true, last: 'ok', ago: 12 },
      { id: 'e5f6a7b8', name: '每日闪念整理', trigger: 'file', on: true, last: 'fail', ago: 95 },
      { id: 'c9d0e1f2', name: 'Backup vault snapshots to the external drive every Sunday night', trigger: 'cron', on: false, last: 'none', ago: 0 },
      { id: '0a1b2c3d', name: '', trigger: 'manual', on: true, last: 'ok', ago: 1500 },
      { id: '4e5f6a7b', name: 'Sync-reading-list-to-the-RSS-collection-and-notify-when-new-items-arrive-from-the-folder-Reading-2026-Q4-unbroken-token', trigger: 'cron', on: true, last: 'ok', ago: 300 }
    ],
    safeUnlocked: true, mp: '', pwVals: {}, safeErr: false, safeBusy: false, safeView: 'edit', safeDirty: false, optOpen: false, pwShown: false, copied: '', safeSel: 0, tags: ['demo', 'finance'], draftNotes: '',
    weather: 'success', music: 'restoring', layoutEdit: false, widgets: ['weather', 'music', 'tasks', 'notes', 'chart', 'pomo'],
    bot: { phase: 'done', text: '', appr: 'pending', outcome: 'ok', stick: true, ime: '', sent: [] },
    term: { st: 'normal', details: false }
  };
  const L = (zh, en) => (S.lang === 'zh' ? zh : en);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ic = (n) => '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>';
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const LONG = 'A very long automation name that keeps going to prove the row still keeps its primary actions reachable at four hundred twenty pixels';
  const LONGZH = '这是一个非常长的中文名称用来验证窄容器里名称仍然可读并且启停运行编辑等主要操作始终可见可达而不是被挤出可视区域';

  /* ---------- small builders ---------- */
  function btn(label, o) {
    o = o || {};
    const cls = ['btn', 'btn-' + (o.v || 'outline'), o.size || '', o.icon && !label ? 'icon' : '', o.cls || ''].join(' ').trim();
    const attrs = [o.act ? 'data-act="' + o.act + '"' : '', o.id ? 'data-id="' + esc(o.id) + '"' : '', o.fid ? 'data-fid="' + o.fid + '"' : '', o.dis ? 'disabled' : '', o.busy ? 'aria-busy="true"' : '', o.pressed != null ? 'aria-pressed="' + o.pressed + '"' : '', o.aria ? 'aria-label="' + esc(o.aria) + '"' : '', o.tip ? 'data-tip="' + esc(o.tip) + '"' : '', o.exp != null ? 'aria-expanded="' + o.exp + '"' : '', o.ctrl ? 'aria-controls="' + o.ctrl + '"' : '', o.extra || ''].join(' ');
    return '<button type="' + (o.type || 'button') + '" class="' + cls + '" ' + attrs + '>' + (o.busy ? '<span class="spin" aria-hidden="true"></span>' : o.icon ? ic(o.icon) : '') + (label ? '<span>' + label + '</span>' : '') + '</button>';
  }
  const badge = (kind, text, icon) => '<span class="badge ' + kind + '">' + (icon ? ic(icon) : '<span class="dot" aria-hidden="true"></span>') + esc(text) + '</span>';
  const cell = (lbl, html, st) => '<div class="cell"' + (st ? ' data-state="' + st + '"' : '') + '><span class="lbl">' + esc(lbl) + '</span>' + html + '</div>';
  let secN = 0;
  const sec = (h, meta, body) => { const k = 's-' + (++secN); return '<section class="sec" aria-labelledby="' + k + '"><h2 id="' + k + '">' + esc(h) + '</h2>' + (meta ? '<span class="meta">' + meta + '</span>' : '') + body + '</section>'; };
  const head = (h, p) => '<div class="page-head"><div><h2 style="font-size:20px;line-height:28px">' + esc(h) + '</h2><p>' + p + '</p></div></div>';
  function field(label, o) {
    o = o || {};
    const id = 'f-' + Math.random().toString(36).slice(2, 8);
    const cls = 'field ' + (o.cls || '');
    const control = o.tag === 'textarea'
      ? '<textarea id="' + id + '" class="' + cls + '" ' + (o.attrs || '') + '>' + esc(o.value || '') + '</textarea>'
      : o.tag === 'select'
        ? '<select id="' + id + '" class="' + cls + '" ' + (o.attrs || '') + '>' + (o.options || []).map((x) => '<option>' + esc(x) + '</option>').join('') + '</select>'
        : '<input id="' + id + '" class="' + cls + '" type="' + (o.type || 'text') + '" value="' + esc(o.value || '') + '" ' + (o.attrs || '') + '>';
    const msg = o.err ? '<p class="help err" id="' + id + '-m">' + ic('alert') + '<span>' + o.err + '</span></p>' : o.help ? '<p class="help" id="' + id + '-m">' + o.help + '</p>' : '';
    return '<div class="field-wrap"><label for="' + id + '">' + label + '</label>' + (o.group ? '<div class="input-group">' + control + o.group + '</div>' : control) + msg + '</div>';
  }
  const fmtDate = (iso, long) => {
    const d = new Date(iso + 'T00:00:00');
    return new Intl.DateTimeFormat(S.lang === 'zh' ? 'zh-CN' : 'en-US', long ? { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' } : { year: 'numeric', month: 'numeric', day: 'numeric' }).format(d);
  };
  const ago = (m) => (m < 1 ? L('刚刚', 'just now') : m < 60 ? L(m + ' 分钟前', m + ' min ago') : L(Math.round(m / 60) + ' 小时前', Math.round(m / 60) + ' h ago'));
  const autoName = (a) => a.name.trim() ? a.name : L('未命名自动化', 'Untitled automation');
  const dispName = (a, i) => (S.long && i === 1 ? (S.lang === 'zh' ? LONGZH : LONG) : autoName(a));

  /* ---------- toasts ---------- */
  function toast(title, body, kind, ms) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = '<div class="t">' + esc(title) + '</div><div class="meta">' + esc(body || '') + '</div>';
    document.getElementById('toasts').appendChild(el);
    later(() => el.remove(), ms || 4000);
  }

  /* ---------- GALLERY ---------- */
  function gBtn() {
    const vs = [['primary', L('主要', 'Primary')], ['secondary', L('次要', 'Secondary')], ['outline', L('描边', 'Outline')], ['ghost', L('幽灵', 'Ghost')], ['danger', L('危险', 'Danger')]];
    const states = [['default', ''], ['hover', 'is-hover'], ['focus-visible', 'is-focus'], ['active', 'is-active'], ['disabled', 'dis'], ['busy', 'busy']];
    let rows = '';
    vs.forEach(([v, n]) => {
      rows += '<div><div class="vname">' + n + ' (' + v + ')</div><div class="row-wrap top">' + states.map(([s, c]) => cell(s, btn(n, { v, cls: c === 'dis' || c === 'busy' ? '' : c, dis: c === 'dis', busy: c === 'busy' }), s)).join('') + '</div></div>';
    });
    rows = '<div class="stack">' + rows + '</div>';
    const sizes = '<div class="row-wrap top" style="margin-top:12px">' + [['sm', 32], ['', 36], ['lg', 40]].map(([s, h]) => cell(h + 'px', btn(L('按钮', 'Button'), { v: 'primary', size: s }))).join('') +
      cell('icon 32/36/40', btn('', { icon: 'plus', aria: L('新建', 'New'), size: 'sm' }) + btn('', { icon: 'edit', aria: L('编辑', 'Edit') }) + btn('', { icon: 'trash', aria: L('删除', 'Delete'), size: 'lg', v: 'danger' })) +
      cell(L('带提示图标按钮', 'icon + tooltip'), btn('', { icon: 'copy', aria: L('复制', 'Copy'), tip: L('复制', 'Copy') })) +
      cell(L('切换(aria-pressed)', 'toggle (aria-pressed)'), btn(L('已按下', 'Pressed'), { v: 'secondary', pressed: 'true', act: 'toggle', extra: 'data-state-demo="selected"' })) +
      cell(L('点击演示：忙碌时防重复提交', 'live: busy blocks resubmit'), btn(L('保存', 'Save'), { v: 'primary', act: 'busyDemo' }) + '<span class="meta" id="busy-count"></span>') + '</div>';
    return sec(L('Button / 图标按钮', 'Button / icon button'), L('状态：default / hover / focus-visible / active / disabled / busy；hover 只改颜色，不改尺寸。', 'States: default / hover / focus-visible / active / disabled / busy; hover changes color only, never size.'), rows + sizes);
  }
  function gFields() {
    const f = [
      [L('默认', 'default'), 'default', ''], [L('悬停', 'hover'), 'hover', 'is-hover'], [L('焦点', 'focus-visible'), 'focus-visible', 'is-focus'],
      [L('禁用', 'disabled'), 'disabled', '', 'disabled'], [L('只读', 'read-only'), 'read-only', '', 'readonly'], [L('忙碌', 'busy'), 'busy', 'is-busy', 'aria-busy="true"']
    ];
    const inp = f.map(([lbl, st, cls, a]) => cell('Input · ' + st, field(lbl, { cls, attrs: (a || '') + ' placeholder="' + L('输入内容', 'Type here') + '"', value: st === 'read-only' ? L('只读内容', 'Read-only value') : '' }), st)).join('') +
      cell('Input · error', field(L('名称', 'Name'), { cls: 'is-error', attrs: 'aria-invalid="true" aria-describedby="x"', value: '??', err: L('名称不能包含 ? 字符；已输入的内容会保留。', 'Name cannot contain ?; what you typed is kept.') }), 'error');
    const ta = cell('Textarea · ' + L('自适应(输入试试)', 'auto-grow (type)'), field(L('备注', 'Notes'), { tag: 'textarea', cls: 'autogrow', attrs: 'rows="2"', value: L('这是一段会随输入增长的备注。\n第二行。', 'A note that grows as you type.\nSecond line.') }), 'default') +
      cell('Textarea · error', field(L('备注', 'Notes'), { tag: 'textarea', cls: 'is-error', attrs: 'aria-invalid="true"', value: 'x', err: L('至少 10 个字符。', 'At least 10 characters.') }), 'error') +
      cell('Textarea · read-only', field(L('备注', 'Notes'), { tag: 'textarea', attrs: 'readonly', value: L('只读备注', 'read-only note') }), 'read-only');
    const date = cell('Date', field(L('截止日期 (Through)', 'Through date'), { type: 'date', value: '2026-11-13', help: fmtDate('2026-11-13', true) }), 'default') +
      cell('Date · error', field(L('截止日期', 'Through date'), { type: 'date', value: '2026-10-01', cls: 'is-error', attrs: 'aria-invalid="true"', err: L('截止日期早于开始日期。', 'Ends before it starts.') }), 'error');
    const path = cell('Path', field(L('备份目录', 'Backup folder'), { value: 'huhu/backups', group: btn(L('浏览', 'Browse'), { icon: 'folder' }), help: L('相对库根；语言切换不改目录。', 'Vault-relative; language switch never renames folders.') }), 'default') +
      cell('Path · error', field(L('备份目录', 'Backup folder'), { value: 'huhu/missing', cls: 'is-error', attrs: 'aria-invalid="true"', group: btn(L('浏览', 'Browse'), { icon: 'folder' }), err: L('目录不存在，可创建或重新选择。', 'Folder not found; create it or pick another.') }), 'error');
    return sec('Input / Textarea / ' + L('日期 / 路径', 'Date / Path'), '', '<div class="grid">' + inp + '</div><div class="grid" style="margin-top:12px">' + ta + date + path + '</div>');
  }
  function gChoice() {
    const chk = [['unchecked', ''], ['checked', 'checked'], ['indeterminate', 'data-ind="1"'], ['disabled', 'disabled'], ['error', 'aria-invalid="true"']].map(([s, a]) =>
      cell('Checkbox · ' + s, '<label class="check"><input type="checkbox" ' + a + '><span>' + L('选项', 'Option') + '</span></label>', s === 'checked' || s === 'indeterminate' ? s : s === 'unchecked' ? 'default' : s)).join('');
    const rad = cell('Radio · selected', '<div role="radiogroup" aria-label="r"><label class="radio"><input type="radio" name="rg" checked><span>' + L('每日', 'Daily') + '</span></label><label class="radio"><input type="radio" name="rg"><span>' + L('每周', 'Weekly') + '</span></label><label class="radio"><input type="radio" name="rg" disabled><span>' + L('禁用', 'Disabled') + '</span></label></div>', 'selected');
    const sw = cell('Switch', '<label class="switch"><input type="checkbox" role="switch"><span>' + L('关', 'Off') + '</span></label><label class="switch"><input type="checkbox" role="switch" checked><span>' + L('开', 'On') + '</span></label><label class="switch"><input type="checkbox" role="switch" disabled><span>' + L('禁用', 'Disabled') + '</span></label><label class="switch is-busy" aria-busy="true"><input type="checkbox" role="switch" checked disabled><span>' + L('保存中', 'Saving') + '</span></label>', 'busy');
    const sel = cell('Select', field(L('触发方式', 'Trigger'), { tag: 'select', options: [L('定时', 'Schedule'), L('文件变更', 'File change'), L('手动', 'Manual')] }), 'default') +
      cell('Select · error', field(L('触发方式', 'Trigger'), { tag: 'select', cls: 'is-error', attrs: 'aria-invalid="true"', options: [L('请选择', 'Choose')], err: L('请选择触发方式', 'Choose a trigger') }), 'error') +
      cell('Select · disabled', field(L('触发方式', 'Trigger'), { tag: 'select', attrs: 'disabled', options: [L('定时', 'Schedule')] }), 'disabled');
    return sec('Checkbox / Switch / Radio / Select', '', '<div class="grid">' + chk + rad + sw + sel + '</div>');
  }
  function gTabs() {
    const tabs = (id) => '<div class="tabs" role="tablist" aria-label="' + id + '" data-tabs>' + [[L('概览', 'Overview'), true], [L('活动', 'Activity'), false], [L('设置', 'Settings'), false], [L('禁用', 'Disabled'), false, true]].map(([n, sel, dis], i) =>
      '<button type="button" role="tab" class="tab" aria-selected="' + !!sel + '" tabindex="' + (sel ? 0 : -1) + '" ' + (dis ? 'disabled' : '') + ' data-act="tab">' + n + '</button>').join('') + '</div>';
    return sec('Tabs', L('左右方向键切换（roving tabindex），无切场动画（DS-006）。', 'Arrow keys move selection (roving tabindex); no tab transition (DS-006).'), cell('Tabs · selected / hover / focus / disabled', tabs('demo'), 'selected') + '<div class="row-wrap" style="margin-top:8px">' + cell('hover', '<button class="tab is-hover" type="button" role="tab" aria-selected="false">' + L('悬停', 'Hover') + '</button>') + cell('focus-visible', '<button class="tab is-focus" type="button" role="tab" aria-selected="false">' + L('焦点', 'Focus') + '</button>') + '</div>');
  }
  function gOverlays() {
    const live = '<div class="row-wrap">' + btn('Dialog', { act: 'dlg', id: 'dlg-demo', v: 'outline' }) + btn('Sheet →', { act: 'dlg', id: 'sheet-demo' }) + btn('Sheet ↑', { act: 'dlg', id: 'sheet-b-demo' }) +
      '<span class="anchor">' + btn('Popover', { act: 'pop', id: 'pop1', exp: 'false', ctrl: 'pop1' }) + '<div class="pop pad" id="pop1" hidden><h3>' + L('提示信息', 'Popover') + '</h3><p class="meta">' + L('Esc 关闭，焦点回到触发器。', 'Esc closes and returns focus to the trigger.') + '</p></div></span>' +
      '<span class="anchor">' + btn('Menu', { act: 'pop', id: 'menu1', exp: 'false', ctrl: 'menu1', icon: 'chev' }) + '<div class="pop" id="menu1" role="menu" hidden><button class="menu-item" role="menuitem" type="button">' + ic('edit') + L('编辑', 'Edit') + '</button><button class="menu-item" role="menuitem" type="button">' + ic('copy') + L('复制 ID', 'Copy ID') + '</button><button class="menu-item" role="menuitem" type="button" disabled>' + ic('lock') + L('禁用项', 'Disabled') + '</button><div class="menu-sep"></div><button class="menu-item danger" role="menuitem" type="button">' + ic('trash') + L('删除…', 'Delete…') + '</button></div></span>' +
      btn('', { icon: 'info', aria: L('说明', 'About'), tip: L('悬停或聚焦显示 Tooltip', 'Tooltip on hover or focus'), id: 'tip-demo' }) + '</div>';
    const stat = '<div class="grid w2" style="margin-top:12px">' + cell(L('Dialog（静态预览）', 'Dialog (static)'), dlgBody('static', true), 'default') +
      cell('Menu / Tooltip（' + L('静态', 'static') + '）', '<div class="pop" style="position:static"><button class="menu-item is-hover" type="button">' + ic('edit') + L('编辑', 'Edit') + '</button><button class="menu-item" type="button">' + ic('copy') + L('复制 ID', 'Copy ID') + '</button></div><div><span class="tip static">' + L('复制', 'Copy') + '</span></div>', 'hover') + '</div>';
    return sec('Dialog / Sheet / Popover / Menu / Tooltip', L('点击打开真实弹层：焦点约束、Esc、关闭后焦点返回；嵌套时先关最内层。', 'Real overlays: focus trap, Esc, focus return; nested ones close innermost first.'), live + stat) + overlayHost();
  }
  function dlgBody(id, stat) {
    return '<div ' + (stat ? 'class="static-dlg"' : '') + '><div class="dlg-h"><h2>' + L('移入回收站？', 'Move to trash?') + '</h2></div><div class="dlg-b"><p>' + L('将把“示例银行账号（演示）”及 2 个账户移入回收站，30 天内可恢复。', 'This moves “Example bank account (demo)” and 2 accounts to the trash; restorable for 30 days.') + '</p></div><div class="dlg-f">' + btn(L('取消', 'Cancel'), { act: stat ? '' : 'closeDlg', v: 'outline' }) + btn(L('移入回收站', 'Move to trash'), { v: 'danger', cls: 'solid' }) + '</div></div>';
  }
  function overlayHost() {
    return '<dialog class="dlg" id="dlg-demo" aria-labelledby="dd-h"><div class="dlg-h"><h2 id="dd-h">' + L('对话框', 'Dialog') + '</h2></div><div class="dlg-b"><p>' + L('焦点被约束在对话框内。', 'Focus is trapped here.') + '</p>' + field(L('名称', 'Name'), { value: 'demo' }) + '</div><div class="dlg-f">' + btn(L('取消', 'Cancel'), { act: 'closeDlg' }) + btn(L('确定', 'OK'), { act: 'closeDlg', v: 'primary' }) + '</div></dialog>' +
      '<dialog class="dlg sheet" id="sheet-demo" aria-labelledby="sd-h"><div class="dlg-h"><h2 id="sd-h">Sheet</h2></div><div class="dlg-b"><p>' + L('侧边抽屉（窄屏用于导航/详情）。', 'Side sheet (nav/detail on narrow).') + '</p></div><div class="dlg-f">' + btn(L('关闭', 'Close'), { act: 'closeDlg' }) + '</div></dialog>' +
      '<dialog class="dlg sheet bottom" id="sheet-b-demo" aria-labelledby="sb-h"><div class="dlg-h"><h2 id="sb-h">Sheet</h2></div><div class="dlg-b"><p>' + L('底部抽屉。', 'Bottom sheet.') + '</p></div><div class="dlg-f">' + btn(L('关闭', 'Close'), { act: 'closeDlg' }) + '</div></dialog>';
  }
  function gTable() {
    const rows = [['a1b2c3d4', 'Daily digest', 'cron', 'success'], ['e5f6a7b8', L('每日闪念整理', 'Flash note sorting'), 'file', 'error'], ['c9d0e1f2', 'Backup snapshots', 'cron', 'warning'], ['0a1b2c3d', L('未命名自动化', 'Untitled automation'), 'manual', 'info'], ['4e5f6a7b', 'Sync reading list', 'cron', 'working'], ['99aa00bb', 'Weekly export', 'cron', 'success'], ['77cc11dd', 'Tag cleanup', 'file', 'success']];
    const t = '<div class="scroll-region" tabindex="0" role="region" aria-label="' + L('可滚动表格', 'Scrollable table') + '"><table class="tbl"><thead><tr><th scope="col">ID</th><th scope="col">' + L('名称', 'Name') + '</th><th scope="col">' + L('触发', 'Trigger') + '</th><th scope="col">' + L('结果', 'Result') + '</th><th scope="col">' + L('备注（二维表格可局部横向滚动）', 'Note (2D tables may scroll locally)') + '</th></tr></thead><tbody>' +
      rows.map((r, i) => '<tr ' + (i === 1 ? 'aria-selected="true"' : '') + '><td class="mono">' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + badge(r[3], { success: L('成功', 'Success'), error: L('失败', 'Failed'), warning: L('警告', 'Warning'), info: L('信息', 'Info'), working: L('运行中', 'Running') }[r[3]]) + '</td><td>' + 'Fictional row ' + (i + 1) + ' · stays on one line to prove local scroll' + '</td></tr>').join('') + '</tbody></table></div>';
    return sec('Table / ScrollArea', '', cell(L('表头粘性 · 选中行 · 键盘可聚焦滚动区', 'sticky head · selected row · focusable scroll region'), t, 'selected'));
  }
  function gStatus() {
    const b = '<div class="row-wrap">' + [['success', L('成功', 'Success'), 'check'], ['warning', L('警告', 'Warning'), 'alert'], ['error', L('失败', 'Failed'), 'alert'], ['info', L('信息', 'Info'), 'info'], ['working', L('运行中', 'Running'), ''], ['', L('中性', 'Neutral'), '']].map(([k, n, i]) => badge(k, n, i)).join('') + '</div><p class="meta" style="margin-top:4px">' + L('状态同时用图标/文字表达，不只靠颜色（DS-003）。', 'State is conveyed by icon/text, not color alone (DS-003).') + '</p>';
    const emp = '<div class="grid w2" style="margin-top:12px">' + cell(L('空态', 'empty'), '<div class="empty"><h3>' + L('还没有自动化', 'No automations yet') + '</h3><p>' + L('创建第一个自动化来开始。', 'Create your first automation.') + '</p>' + btn(L('新建自动化', 'New automation'), { v: 'primary', icon: 'plus' }) + '</div>', 'default') +
      cell(L('筛选无结果', 'no results'), '<div class="empty"><h3>' + L('没有匹配“zzz”的结果', 'No results for “zzz”') + '</h3>' + btn(L('清除筛选', 'Clear filter'), {}) + '</div>', 'default') +
      cell(L('失败（不当空态）', 'error (not an empty state)'), '<div class="banner error">' + ic('alert') + '<div><strong>' + L('加载失败', 'Failed to load') + '</strong><p class="meta" style="color:inherit">' + L('网络不可达。已保留上次的数据。', 'Network unreachable. Last data is kept.') + '</p><div class="acts">' + btn(L('重试', 'Retry'), { size: 'sm' }) + '</div></div></div>', 'error') +
      cell(L('骨架屏', 'skeleton'), '<div aria-busy="true" aria-label="' + L('加载中', 'Loading') + '" role="status" style="display:flex;flex-direction:column;gap:8px"><span class="skel" style="width:60%"></span><span class="skel" style="width:90%"></span><span class="skel" style="width:40%"></span></div>', 'busy') + '</div>';
    return sec(L('状态徽标 / 空态 / 骨架', 'Status badge / empty / skeleton'), '', b + emp);
  }
  function gSettings() {
    const grp = '<div class="group"><div class="group-h">' + L('外观', 'APPEARANCE') + '</div>' +
      '<div class="srow"><div><h3>' + L('主题', 'Theme') + '</h3><p class="meta">' + L('跟随 Obsidian 语义变量；预览回退色仅供评审。', 'Follows Obsidian semantic variables.') + '</p></div><div class="ctl">' + field('<span class="sr-only">t</span>', { tag: 'select', options: [L('跟随系统', 'System'), L('亮', 'Light'), L('暗', 'Dark')] }) + '</div></div>' +
      '<div class="srow"><div><h3>' + L('减少动效', 'Reduce motion') + '</h3><p class="meta">' + L('关闭骨架脉冲与旋转。', 'Stops skeleton pulse and spinners.') + '</p></div><div class="ctl"><label class="switch"><input type="checkbox" role="switch" aria-label="' + L('减少动效', 'Reduce motion') + '"></label></div></div>' +
      '<div class="srow is-disabled"><div><h3>' + L('同步到云端', 'Sync to cloud') + '</h3><p class="meta">' + L('不可用：当前库为只读。', 'Unavailable: this vault is read-only.') + '</p></div><div class="ctl"><label class="switch"><input type="checkbox" role="switch" disabled aria-label="sync"></label></div></div></div>';
    return sec(L('设置行 / 分组', 'Settings row / group'), '', grp);
  }
  function pageGallery() {
    const mat = '<ul class="rule-list">' + [L('状态矩阵：default / hover / focus-visible / active / disabled / busy / error / read-only / selected / checked / indeterminate。', 'State matrix: default / hover / focus-visible / active / disabled / busy / error / read-only / selected / checked / indeterminate.'), L('hover/focus/active 用 .is-* 类在静态格里强制展示；真实控件同样响应真实交互。', 'hover/focus/active are forced with .is-* classes in static cells; the real controls respond to real input too.'), L('控件 32/36/40px；触控模式 44px；4px 间距网格；圆角 6/8/12/14。', 'Controls 32/36/40px; touch mode 44px; 4px grid; radii 6/8/12/14.')].map((x) => '<li>' + x + '</li>').join('') + '</ul>';
    return head(L('基础组件全状态画廊', 'Component state gallery'), L('覆盖 #37 W6.4 全部控件族；全部为虚构内容。', 'Covers every #37 W6.4 control family; all content is fictional.')) + mat + gBtn() + gFields() + gChoice() + gTabs() + gOverlays() + gTable() + gStatus() + gSettings();
  }

  /* ---------- LIST (tasks / automations) ---------- */
  function autoRow(a, i) {
    const nm = dispName(a, i);
    const exp = !!S.expanded[a.id];
    const lastB = a.last === 'ok' ? badge('success', L('成功', 'Succeeded'), 'check') : a.last === 'fail' ? badge('error', L('失败', 'Failed'), 'alert') : badge('', L('从未运行', 'Never ran'));
    return '<div class="item auto" role="listitem" data-state-row="' + a.id + '">' +
      '<div class="nm"><span class="' + (exp ? '' : 'clamp') + '">' + esc(nm) + '</span>' + (nm.length > 40 ? ' ' + btn(exp ? L('收起', 'Less') : L('展开全名', 'Full name'), { size: 'sm', v: 'ghost', act: 'expand', id: a.id, exp: String(exp) }) : '') + '</div>' +
      '<div class="mt"><span class="c-trg">' + (a.trigger === 'cron' ? L('定时 · 每天 08:00', 'Schedule · daily 08:00') : a.trigger === 'file' ? L('文件变更', 'File change') : L('手动', 'Manual')) + '</span><span class="c-last">' + lastB + ' ' + (a.ago ? ago(a.ago) : '') + '</span><span class="c-st">' + (a.on ? badge('success', L('已启用', 'Enabled')) : badge('', L('已停用', 'Disabled'))) + '</span></div>' +
      '<div class="ac"><label class="switch lbl-sw"><input type="checkbox" role="switch" ' + (a.on ? 'checked' : '') + ' data-act="toggleAuto" data-id="' + a.id + '" aria-label="' + esc(L('启用 ', 'Enable ') + nm) + '"><span class="sr-only">' + L('启用', 'Enable') + '</span></label>' +
      btn(L('运行', 'Run'), { size: 'sm', icon: 'play', act: 'runAuto', id: a.id, aria: L('运行 ', 'Run ') + nm, tip: '' }) + btn(L('编辑', 'Edit'), { size: 'sm', icon: 'edit', act: 'noop', aria: L('编辑 ', 'Edit ') + nm }) +
      '<span class="anchor">' + btn('', { size: 'sm', icon: 'more', v: 'ghost', act: 'pop', id: 'm' + a.id, aria: L('更多操作 ', 'More actions for ') + nm, exp: 'false', ctrl: 'm' + a.id }) + '<div class="pop" id="m' + a.id + '" role="menu" hidden style="right:0"><button role="menuitem" class="menu-item" type="button" data-act="renameAuto" data-id="' + a.id + '">' + ic('edit') + L('改名（演示）', 'Rename (demo)') + '</button><button role="menuitem" class="menu-item" type="button" data-act="copyId" data-id="' + a.id + '">' + ic('copy') + L('复制 ID', 'Copy ID') + '</button><div class="menu-sep"></div><button role="menuitem" class="menu-item danger" type="button" data-act="delAuto" data-id="' + a.id + '">' + ic('trash') + L('删除…', 'Delete…') + '</button></div></span></div></div>';
  }
  function autosBlock() {
    const q = S.q.trim().toLowerCase();
    const rows = S.autos.map((a, i) => [a, i]).filter(([a]) => !q || autoName(a).toLowerCase().includes(q));
    let body;
    if (S.listMode === 'loading') body = '<div class="list" aria-busy="true" role="status" aria-label="' + L('加载中', 'Loading') + '">' + [1, 2, 3].map(() => '<div class="item" style="grid-template-areas:\'name\' \'meta\';grid-template-columns:1fr"><span class="skel" style="width:55%"></span><span class="skel" style="width:35%"></span></div>').join('') + '</div>';
    else if (S.listMode === 'empty' || !S.autos.length) body = '<div class="empty"><h3>' + L('还没有自动化', 'No automations yet') + '</h3><p>' + L('创建第一个自动化。', 'Create your first automation.') + '</p>' + btn(L('新建自动化', 'New automation'), { v: 'primary', icon: 'plus' }) + '</div>';
    else if (!rows.length) body = '<div class="empty"><h3>' + L('没有匹配“', 'No results for “') + esc(S.q) + L('”的结果', '”') + '</h3>' + btn(L('清除搜索', 'Clear search'), { act: 'clearQ' }) + '</div>';
    else body = (S.listMode === 'error' ? '<div class="banner error" role="alert" style="margin-bottom:12px">' + ic('alert') + '<div><strong>' + L('刷新失败：网络不可达', 'Refresh failed: network unreachable') + '</strong><p class="meta" style="color:inherit">' + L('下方仍显示 2 分钟前的数据，没有被清空。', 'The list below is the data from 2 minutes ago; nothing was cleared.') + '</p><div class="acts">' + btn(L('重试', 'Retry'), { size: 'sm', act: 'listMode', id: 'normal' }) + '</div></div></div>' : '') +
        (S.listMode === 'refresh' ? '<p class="meta" role="status" style="margin-bottom:8px"><span class="spin" style="display:inline-block;vertical-align:-2px"></span> ' + L('正在刷新，保留已有内容…', 'Refreshing; existing rows stay…') + '</p>' : '') +
        '<div class="list" role="list" aria-label="' + L('自动化', 'Automations') + '">' + rows.map(([a, i]) => autoRow(a, i)).join('') + '</div>';
    return '<div class="toolbar">' + '<input class="field" type="search" id="q" value="' + esc(S.q) + '" placeholder="' + L('搜索自动化', 'Search automations') + '" aria-label="' + L('搜索自动化', 'Search automations') + '" data-fid="q">' + btn(L('筛选', 'Filter'), { icon: 'filter' }) + btn(L('新建', 'New'), { v: 'primary', icon: 'plus' }) + '</div>' + body;
  }
  function notifBlock() {
    const sim = '<div class="row-wrap">' + btn(L('模拟：运行完成', 'Simulate: run ok'), { size: 'sm', act: 'simRun', id: 'ok' }) + btn(L('模拟：运行失败', 'Simulate: run failed'), { size: 'sm', act: 'simRun', id: 'fail' }) + btn(L('运行后改名 #1', 'Rename #1 after run'), { size: 'sm', act: 'renameAuto', id: 'a1b2c3d4' }) + btn(L('运行后删除 #1', 'Delete #1 after run'), { size: 'sm', act: 'delAuto', id: 'a1b2c3d4' }) + btn(L('空名称运行', 'Run unnamed'), { size: 'sm', act: 'simRun', id: 'empty' }) + btn(L('重置', 'Reset'), { size: 'sm', v: 'ghost', act: 'resetNotifs' }) + '</div>';
    const list = S.notifs.length ? S.notifs.map((n) => '<button type="button" class="notif ' + (n.unread ? 'unread' : '') + ' btn-ghost" style="text-align:left;font:inherit;cursor:pointer;width:100%;background:transparent;color:inherit" data-act="selNotif" data-id="' + n.id + '" aria-pressed="' + (S.selNotif === n.id) + '"><span class="t">' + esc(n.snap) + ' · ' + (n.res === 'ok' ? L('成功', 'succeeded') : L('失败', 'failed')) + '</span><span class="meta">' + ago(n.min) + ' · ' + (n.res === 'ok' ? L('已写入日志', 'wrote journal') : L('保留在通知中心，需要处理', 'kept here until handled')) + '</span></button>').join('') : '<div class="empty"><h3>' + L('暂无通知', 'No notifications') + '</h3><p>' + L('点上面的模拟按钮。', 'Use the simulate buttons above.') + '</p></div>';
    let detail = '';
    const n = S.notifs.find((x) => x.id === S.selNotif);
    if (n) {
      const cur = S.autos.find((a) => a.id === n.autoId);
      const curName = cur ? autoName(cur) : L('已删除', 'Deleted');
      detail = '<div class="notif" aria-live="polite"><h3>' + L('详情', 'Detail') + '</h3><dl class="kv"><dt>' + L('运行时名称', 'Name at run time') + '</dt><dd>' + esc(n.snap) + '</dd><dt>' + L('当前名称', 'Current name') + '</dt><dd>' + esc(curName) + (cur && curName !== n.snap ? ' ' + badge('info', L('已改名', 'renamed')) : !cur ? ' ' + badge('warning', L('已删除', 'deleted')) : '') + '</dd><dt>ID</dt><dd class="mono">' + n.autoId + ' ' + btn('', { size: 'sm', icon: 'copy', aria: L('复制 ID', 'Copy ID'), act: 'copyId', id: n.autoId }) + '</dd><dt>' + L('结果', 'Result') + '</dt><dd>' + (n.res === 'ok' ? L('成功', 'Succeeded') : L('失败：', 'Failed: ') + 'HTTP 502, token=••••••• ' + L('(已脱敏)', '(redacted)')) + '</dd></dl></div>';
    }
    return sim + '<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">' + list + detail + '</div>';
  }
  function taskBlock() {
    const rows = S.tasks.map((t) => '<div class="item" role="listitem" style="grid-template-columns:auto minmax(0,1fr)"><label class="check" style="grid-row:1/3"><input type="checkbox" ' + (t.done ? 'checked' : '') + ' data-act="toggleTask" data-id="' + t.id + '" aria-label="' + esc(t.title) + '"></label><div class="nm" style="grid-area:auto;' + (t.done ? 'text-decoration:line-through;color:var(--muted-foreground)' : '') + '">' + esc(S.long && t.id === 't2' ? (S.lang === 'zh' ? LONGZH : LONG) : t.title) + '</div><div class="mt" style="grid-area:auto"><span>' + esc(t.proj) + '</span><span class="wrap">' + L('从 ', 'From ') + fmtDate(t.from, true) + ' · <strong style="color:var(--foreground)">' + L('截止至 ', 'Through ') + fmtDate(t.through, true) + '</strong></span></div></div>').join('');
    const form = '<form class="pane" data-form="task" style="margin-top:12px"><h3>' + L('新建任务', 'New task') + '</h3>' + (S.taskFail ? '<div class="banner error" role="alert">' + ic('alert') + '<div><strong>' + L('保存失败，输入已保留', 'Save failed; your input is kept') + '</strong><p class="meta" style="color:inherit">' + L('存储暂时不可用。', 'Storage is temporarily unavailable.') + '</p></div></div>' : '') +
      field(L('标题', 'Title'), { attrs: 'name="title" data-fid="ttl" placeholder="' + L('任务标题', 'Task title') + '"', value: S.taskDraft }) + field(L('截止日期 (Through)', 'Through'), { type: 'date', attrs: 'name="through"', value: S.taskThrough, help: fmtDate(S.taskThrough, true) }) +
      '<div class="row-wrap">' + btn(L('保存', 'Save'), { v: 'primary', cls: '', type: 'submit' }) + btn(L('模拟失败', 'Simulate failure'), { act: 'taskFail', pressed: String(S.taskFail) }) + '</div></form>';
    return '<p class="meta" role="status" style="margin-bottom:8px">' + L('共 ', '') + S.tasks.filter((t) => !t.done).length + L(' 项未完成 / ', ' open / ') + S.tasks.length + L(' 项（计数与列表同源）', ' total (count and list share one source)') + '</p><div class="list" role="list" aria-label="' + L('任务', 'Tasks') + '">' + rows + '</div>' + form;
  }
  function pageList() {
    const tabs = '<div class="tabs" role="tablist" aria-label="' + L('列表类型', 'List type') + '">' + [['auto', L('自动化', 'Automations')], ['task', L('任务', 'Tasks')]].map(([k, n]) => '<button type="button" role="tab" class="tab" aria-selected="' + (S.listTab === k) + '" data-act="listTab" data-id="' + k + '">' + n + '</button>').join('') + '</div>';
    const modes = '<div class="row-wrap" style="margin:12px 0" role="group" aria-label="' + L('状态预览', 'State preview') + '"><span class="meta">' + L('状态预览：', 'State preview:') + '</span>' + [['normal', L('正常', 'Normal')], ['loading', L('加载', 'Loading')], ['refresh', L('刷新中', 'Refreshing')], ['empty', L('空', 'Empty')], ['error', L('失败保留', 'Error keeps data')]].map(([k, n]) => btn(n, { size: 'sm', act: 'listMode', id: k, pressed: String(S.listMode === k) })).join('') + '</div>';
    return head(L('任务 / 自动化密集列表', 'Dense tasks / automations list'), L('容器宽度决定布局（≥760 表格式，≤480 堆叠）；用顶部“容器”按钮切换 420/600/宽。', 'Container width drives layout (≥760 table-like, ≤480 stacked); use the Container buttons above.')) + tabs + modes +
      (S.listTab === 'auto' ? '<div class="split" style="margin-top:4px"><div class="pane" style="grid-column:1/-1" aria-label="">' + autosBlock() + '</div></div>' + sec(L('通知（运行时名称快照）', 'Notifications (name snapshot at run time)'), L('主文案使用那一次运行时的名称；详情按稳定 ID 解析现名或“已删除”。失败通知不会随 toast 消失。', 'Primary text keeps the name at run time; detail resolves the current name by stable ID or “Deleted”. Failures outlive the toast.'), notifBlock()) : taskBlock());
  }

  /* ---------- SAFE ---------- */
  function acct(i) {
    const id = 'ac' + i;
    return '<div class="pane" style="border-top:1px solid var(--border);padding-top:12px"><div class="row-wrap" style="justify-content:space-between"><h3>' + L('账户 ', 'Account ') + (i + 1) + '</h3><div class="row-wrap">' + btn('', { size: 'sm', icon: 'up', aria: L('上移账户 ', 'Move account up ') + (i + 1) }) + btn('', { size: 'sm', icon: 'trash', aria: L('移除账户 ', 'Remove account ') + (i + 1), v: 'ghost' }) + '</div></div>' +
      field(L('用户名', 'Username'), { value: 'demo.user' + (i + 1), group: btn('', { icon: 'copy', aria: L('复制用户名', 'Copy username'), tip: L('复制用户名', 'Copy username'), act: 'copy', id: 'u' + i }) }) +
      field(L('密码（演示）', 'Password (demo)'), { type: S.pwShown ? 'text' : 'password', value: S.pwVals[i] || 'demo-Pa55-' + (i + 1), attrs: 'data-fid="pw' + i + '" autocomplete="off"', group: btn('', { icon: 'eye', aria: S.pwShown ? L('隐藏密码', 'Hide password') : L('显示密码', 'Show password'), act: 'pw', pressed: String(S.pwShown) }) + btn('', { icon: 'key', aria: L('生成密码', 'Generate password'), tip: L('生成密码', 'Generate password'), act: 'gen' }) + btn('', { icon: 'copy', aria: L('复制密码', 'Copy password'), tip: L('复制密码', 'Copy password'), act: 'copy', id: 'p' + i }) }) +
      '<p class="help" role="status">' + (S.copied ? ic('check') + ' ' + (S.copied === 'u' ? L('已复制用户名；剪贴板将按现有策略自动清除。', 'Username copied; clipboard clears per existing policy.') : L('已复制密码；剪贴板将按现有策略自动清除。', 'Password copied; clipboard clears per existing policy.')) : '&nbsp;') + '</p>' +
      (S.optOpen ? field(L('邮箱（可选）', 'Email (optional)'), { type: 'email', value: '', attrs: 'placeholder="name@example.invalid"' }) + field(L('账户备注（可选）', 'Account note (optional)'), { tag: 'textarea', cls: 'autogrow', attrs: 'rows="1"', value: '' }) : '') + '</div>';
  }
  function pageSafe() {
    if (!S.safeUnlocked) {
      return head(L('保险箱', 'Safe'), L('已锁定。', 'Locked.')) + '<form class="pane" data-form="unlock" style="max-width:380px"><div class="banner">' + ic('lock') + '<div>' + L('输入主密码解锁（演示：任意不含 “bad” 的值）。', 'Enter the master password (demo: anything not containing “bad”).') + '</div></div>' +
        field(L('主密码', 'Master password'), { type: 'password', cls: S.safeErr ? 'is-error' : '', value: S.mp, attrs: 'name="pw" data-fid="mp" autocomplete="off"' + (S.safeErr ? ' aria-invalid="true"' : '') + (S.safeBusy ? ' disabled' : ''), err: S.safeErr ? L('主密码不正确，请重试。已输入的内容保留。', 'Wrong master password. Try again; your input is kept.') : '' }) +
        '<div class="row-wrap">' + btn(S.safeBusy ? L('解锁中…', 'Unlocking…') : L('解锁', 'Unlock'), { v: 'primary', busy: S.safeBusy, type: 'submit' }) + '</div></form>';
    }
    const entries = [['Example bank account (demo)', 'finance'], [S.long ? (S.lang === 'zh' ? LONGZH : LONG) : '邮箱与社交（演示）', 'personal'], ['Streaming service', 'media']];
    const list = '<div class="pane lp"><div class="toolbar"><input class="field" type="search" placeholder="' + L('搜索条目', 'Search entries') + '" aria-label="' + L('搜索条目', 'Search entries') + '">' + btn('', { icon: 'plus', aria: L('新建条目', 'New entry'), v: 'primary' }) + '</div><div class="list" role="list">' + entries.map((e, i) => '<button type="button" class="item btn-ghost" role="listitem" style="text-align:left;font:inherit;color:inherit;background:transparent;grid-template-areas:\'name\' \'meta\';grid-template-columns:minmax(0,1fr);cursor:pointer;width:100%" data-act="selEntry" data-id="' + i + '" aria-current="' + (i === S.safeSel) + '" ' + (i === S.safeSel ? 'aria-selected="true"' : '') + '><span class="nm">' + esc(e[0]) + '</span><span class="mt"><span class="badge">' + esc(e[1]) + '</span>' + (i === 0 ? '<span>' + ic('lock') + '</span>' : '') + '</span></button>').join('') + '</div></div>';
    const ed = '<div class="pane ep"><div class="row-wrap">' + '<span class="back">' + btn(L('返回条目', 'Entries'), { size: 'sm', act: 'safeBack', icon: 'chev', cls: 'rot' }) + '</span><h3 style="flex:1">' + L('编辑条目', 'Edit entry') + '</h3>' + (S.safeDirty ? badge('warning', L('未保存', 'Unsaved'), 'alert') : '') + '</div>' +
      field(L('标题', 'Title'), { value: entries[S.safeSel][0], attrs: 'data-fid="ttl" data-dirty="1"' }) + field(L('网址', 'Website'), { value: 'https://example.invalid/login', group: btn('', { icon: 'link', aria: L('打开网站', 'Open website'), tip: L('打开网站', 'Open website') }) }) +
      acct(0) + acct(1) +
      '<div class="row-wrap">' + btn(L('添加账户', 'Add account'), { icon: 'plus', size: 'sm' }) + btn(S.optOpen ? L('隐藏可选字段', 'Hide optional fields') : L('显示可选字段', 'Show optional fields'), { size: 'sm', v: 'ghost', act: 'opt', exp: String(S.optOpen) }) + '</div>' +
      '<div class="field-wrap"><span class="label">' + L('标签', 'Tags') + '</span><div class="tag-row">' + S.tags.map((t) => '<span class="chip">' + esc(t) + '<button type="button" aria-label="' + L('移除标签 ', 'Remove tag ') + esc(t) + '" data-act="rmTag" data-id="' + esc(t) + '">' + ic('x') + '</button></span>').join('') + '</div><input class="field" data-fid="tag" data-tagin="1" placeholder="' + L('输入后回车添加（输入法组合中不会提交）', 'Enter to add (not while IME composing)') + '"></div>' +
      field(L('备注（自适应高度，上限后滚动）', 'Notes (auto-height, scrolls past a cap)'), { tag: 'textarea', cls: 'autogrow', attrs: 'rows="3" data-fid="notes" style="max-height:220px"', value: S.draftNotes || (L('第一行。\n第二行。\n', 'Line one.\nLine two.\n') + (S.long ? Array.from({ length: 10 }, (_, i) => 'Long note line ' + (i + 1) + ' to exercise auto-grow and the height cap.').join('\n') : '')) }) +
      '<div class="group"><div class="group-h" style="color:var(--destructive)">' + L('危险操作', 'DANGER ZONE') + '</div><div class="srow"><div><h3>' + L('移入回收站', 'Move to trash') + '</h3><p class="meta">' + L('可在 30 天内恢复。', 'Restorable for 30 days.') + '</p></div><div class="ctl">' + btn(L('移入回收站…', 'Move to trash…'), { v: 'danger', act: 'dlg', id: 'dlg-trash' }) + '</div></div><div class="srow"><div><h3>' + L('永久删除', 'Delete forever') + '</h3><p class="meta">' + L('不可恢复，需输入标题确认。', 'Irreversible; type the title to confirm.') + '</p></div><div class="ctl">' + btn(L('永久删除…', 'Delete forever…'), { v: 'danger', act: 'dlg', id: 'dlg-forever' }) + '</div></div></div>' +
      '<div class="row-wrap"><span class="grow"></span>' + btn(L('取消', 'Cancel'), { act: 'safeCancel' }) + btn(L('保存', 'Save'), { v: 'primary', act: 'safeSave' }) + '</div></div>';
    const dlgs = '<dialog class="dlg" id="dlg-trash" aria-labelledby="dt-h"><div class="dlg-h"><h2 id="dt-h">' + L('移入回收站？', 'Move to trash?') + '</h2></div><div class="dlg-b"><p>' + L('对象：', 'Object: ') + '<strong>' + esc(entries[S.safeSel][0]) + '</strong>' + L('（2 个账户，1 个标签）。', ' (2 accounts, 1 tag).') + '</p><p class="meta">' + L('影响：条目从列表消失，30 天内可从回收站恢复；不改变加密与剪贴板策略。', 'Impact: the entry leaves the list and is restorable from trash for 30 days; encryption and clipboard policy are unchanged.') + '</p></div><div class="dlg-f">' + btn(L('取消', 'Cancel'), { act: 'closeDlg' }) + btn(L('移入回收站', 'Move to trash'), { v: 'danger', cls: 'solid', act: 'closeDlg' }) + '</div></dialog>' +
      '<dialog class="dlg" id="dlg-forever" aria-labelledby="df-h"><div class="dlg-h"><h2 id="df-h">' + L('永久删除？', 'Delete forever?') + '</h2></div><div class="dlg-b"><p>' + L('此操作不可恢复，将同时删除 2 个账户及其备注。输入标题以确认：', 'Irreversible: deletes 2 accounts and their notes. Type the title to confirm:') + '</p><p class="mono wrap">' + esc(entries[S.safeSel][0]) + '</p>' + field(L('标题', 'Title'), { attrs: 'data-confirm="' + esc(entries[S.safeSel][0]) + '"' }) + '</div><div class="dlg-f">' + btn(L('取消', 'Cancel'), { act: 'closeDlg' }) + btn(L('永久删除', 'Delete forever'), { v: 'danger', cls: 'solid', dis: true, extra: 'data-confirm-btn="1"', act: 'closeDlg' }) + '</div></dialog>' +
      '<dialog class="dlg" id="dlg-unsaved" aria-labelledby="du-h"><div class="dlg-h"><h2 id="du-h">' + L('放弃未保存的修改？', 'Discard unsaved changes?') + '</h2></div><div class="dlg-b"><p>' + L('切换条目会丢失当前编辑。', 'Switching entries discards your edits.') + '</p></div><div class="dlg-f">' + btn(L('继续编辑', 'Keep editing'), { act: 'closeDlg' }) + btn(L('放弃', 'Discard'), { v: 'danger', cls: 'solid', act: 'discard' }) + '</div></dialog>';
    return head(L('保险箱长表单', 'Safe long form'), L('不改加密/剪贴板策略；展示长备注自适应、可选字段、生成/复制按钮与危险操作确认。所有值为演示。', 'Encryption and clipboard policy unchanged; shows auto-grow notes, optional fields, generate/copy and danger confirmations. All values are demo.')) +
      '<div class="row-wrap" style="margin-bottom:12px">' + btn(S.safeUnlocked ? L('锁定', 'Lock') : L('解锁', 'Unlock'), { icon: 'lock', size: 'sm', act: 'safeLock' }) + '</div>' +
      '<div class="split sf" data-view="' + S.safeView + '">' + list + ed + '</div>' + dlgs;
  }

  /* ---------- HOME ---------- */
  const WSTATES = ['unconfigured', 'waiting', 'loading', 'refreshing', 'success', 'offline', 'invalid'];
  function weatherBody(st) {
    const city = L('上海（演示）', 'Springfield (demo)');
    const temp = '<div class="big">22°</div><p class="meta">' + L('多云 · 体感 21° · 湿度 58%', 'Partly cloudy · feels 21° · 58% humidity') + '</p>';
    const m = {
      unconfigured: '<p>' + L('尚未设置位置。', 'No location set.') + '</p>' + btn(L('设置位置', 'Set location'), { v: 'primary', size: 'sm', icon: 'cal' }),
      waiting: '<p>' + city + '</p><p class="meta" role="status">' + badge('', L('等待启动', 'Waiting to start')) + ' ' + L('看板尚未激活，轻量排队，不显示 Loading。', 'Board not active yet; queued, not shown as Loading.') + '</p>' + btn(L('立即刷新', 'Refresh now'), { size: 'sm', icon: 'refresh' }),
      loading: '<p>' + city + '</p><div aria-busy="true" role="status" aria-label="' + L('加载中', 'Loading') + '" style="display:flex;flex-direction:column;gap:8px"><span class="skel" style="width:40%;height:28px"></span><span class="skel" style="width:80%"></span></div><p class="meta">' + L('预算 12 秒，超时转入失败。', 'Budget 12 s, then falls to failure.') + '</p>' + btn(L('取消', 'Cancel'), { size: 'sm' }),
      refreshing: '<p>' + city + '</p>' + temp + '<p class="meta" role="status"><span class="spin" style="display:inline-block;vertical-align:-2px"></span> ' + L('缓存于 18 分钟前 · 正在刷新', 'Cached 18 min ago · refreshing') + '</p>',
      success: '<p>' + city + '</p>' + temp + '<p class="meta">' + badge('success', L('已更新 · 刚刚', 'Updated just now'), 'check') + '</p>',
      offline: '<p>' + city + '</p><div style="opacity:.65">' + temp + '</div><div class="banner warning" role="alert">' + ic('alert') + '<div><strong>' + L('离线：主备源均不可达', 'Offline: primary and backup unreachable') + '</strong><p class="meta" style="color:inherit">' + L('显示 3 小时前的缓存，已标注过期，不当作新数据。', 'Showing a 3 h old cache, marked stale, not presented as fresh.') + '</p><div class="acts">' + btn(L('重试', 'Retry'), { size: 'sm' }) + btn(L('配置', 'Configure'), { size: 'sm', v: 'ghost' }) + '</div></div></div>',
      invalid: '<p class="meta">' + badge('info', L('已失效', 'Invalidated')) + '</p><p>' + L('位置已更改为另一城市，旧请求结果已丢弃，不会写入当前看板。', 'The location changed; the old response was discarded and not applied to this board.') + '</p>' + btn(L('重新获取', 'Load again'), { size: 'sm', icon: 'refresh' })
    };
    return m[st];
  }
  const WLABEL = { unconfigured: ['未配置', 'Not configured'], waiting: ['等待启动', 'Waiting to start'], loading: ['加载', 'Loading'], refreshing: ['有缓存且刷新中', 'Cached, refreshing'], success: ['成功', 'Success'], offline: ['离线 / 失败', 'Offline / failed'], invalid: ['已失效', 'Invalidated'] };
  function widget(kind) {
    const hid = 'w-' + kind;
    const hd = (name, icon, extra) => '<header>' + ic(icon) + '<h3 id="' + hid + '">' + name + '</h3>' + (extra || '') + (S.layoutEdit ? btn('', { size: 'sm', icon: 'up', aria: L('上移 ', 'Move up ') + name, act: 'moveW', id: kind, v: 'ghost' }) : '') + '</header>';
    const wrap = (inner) => '<section class="widget" aria-labelledby="' + hid + '" data-widget="' + kind + '">' + inner + '</section>';
    if (kind === 'weather') return wrap(hd(L('天气', 'Weather'), 'cloud', btn('', { size: 'sm', icon: 'refresh', aria: L('刷新天气', 'Refresh weather'), tip: L('刷新', 'Refresh'), v: 'ghost' })) + weatherBody(S.weather));
    if (kind === 'music') {
      const m = {
        restoring: '<p role="status"><span class="spin" style="display:inline-block;vertical-align:-2px"></span> ' + L('正在后台恢复音乐账号…', 'Restoring the music account in the background…') + '</p><p class="meta">' + L('首页与工作台已可用，不等待此项。', 'Home and workbench are already usable; nothing waits on this.') + '</p>' + btn(L('跳过', 'Skip'), { size: 'sm', act: 'music', id: 'out' }),
        restored: '<p>' + badge('success', L('已登录 · demo_user', 'Signed in · demo_user'), 'check') + '</p><p class="meta">' + L('正在播放：演示曲目（不真实播放）', 'Now playing: demo track (not real audio)') + '</p><div class="row-wrap">' + btn('', { icon: 'play', aria: L('播放', 'Play') }) + btn('', { icon: 'stop', aria: L('停止', 'Stop') }) + '</div>',
        failed: '<div class="banner warning" role="alert">' + ic('alert') + '<div><strong>' + L('账号恢复失败（网络）', 'Account restore failed (network)') + '</strong><p class="meta" style="color:inherit">' + L('不影响其他组件。', 'Other widgets are unaffected.') + '</p><div class="acts">' + btn(L('重试', 'Retry'), { size: 'sm', act: 'music', id: 'restoring' }) + btn(L('重新登录', 'Sign in again'), { size: 'sm', v: 'ghost' }) + '</div></div></div>',
        out: '<p>' + L('未登录。', 'Not signed in.') + '</p>' + btn(L('登录', 'Sign in'), { size: 'sm', v: 'primary' })
      };
      return wrap(hd(L('音乐', 'Music'), 'music') + m[S.music]);
    }
    if (kind === 'tasks') return wrap(hd(L('任务', 'Tasks'), 'check') + '<ul style="margin:0;padding-left:18px;font-size:var(--fs-dense)"><li class="wrap">' + esc(S.tasks[0].title) + '</li><li class="wrap">' + esc(S.tasks[1].title) + '</li></ul><p class="meta">' + fmtDate(S.tasks[0].through, true) + '</p>');
    if (kind === 'notes') return wrap(hd(L('笔记', 'Notes'), 'folder') + '<div class="list"><div class="item" style="grid-template-columns:1fr;grid-template-areas:\'name\' \'meta\'"><span class="nm">' + (S.long ? (S.lang === 'zh' ? LONGZH : LONG) : L('无封面的长标题笔记：季度复盘与路线图草稿', 'Cover-less long title note: quarterly review and roadmap draft')) + '</span><span class="mt">' + L('3 天前', '3 d ago') + '</span></div></div>' + '<p class="meta">' + L('搜索无结果示例：', 'No-results example: ') + L('没有匹配“xyz”的笔记', 'No notes match “xyz”') + '</p>');
    if (kind === 'chart') return wrap(hd(L('本周支出', 'Weekly spend'), 'cal') + '<div role="img" aria-label="' + L('一周支出柱状图，摘要见下', 'Weekly spend bars; summary below') + '" style="display:flex;gap:6px;align-items:flex-end;height:64px">' + [30, 55, 0, 80, 42, 15, 60].map((h, i) => '<div style="flex:1;height:' + Math.max(h, 3) + '%;background:' + (h ? 'var(--chart,var(--primary))' : 'var(--accent)') + ';border-radius:4px 4px 0 0"></div>').join('') + '</div><p class="meta">' + L('合计 ¥1,284.00（CNY，本周，上海时区）· 周三为 0（无支出，不是缺失）。', 'Total ¥1,284.00 (CNY, this week, Shanghai TZ) · Wednesday is 0 (no spend, not missing).') + '</p><div class="legend"><span>' + badge('', L('单位：元', 'Unit: CNY')) + '</span></div>');
    return wrap(hd(L('番茄钟', 'Pomodoro'), 'play') + '<div class="big">25:00</div><div class="row-wrap">' + btn(L('开始', 'Start'), { v: 'primary', size: 'sm' }) + '</div>');
  }
  function pageHome() {
    const sel = '<div class="row-wrap" role="group" aria-label="' + L('天气状态', 'Weather state') + '" style="margin:8px 0"><span class="meta">' + L('天气状态：', 'Weather state:') + '</span>' + WSTATES.map((s) => btn(L(WLABEL[s][0], WLABEL[s][1]), { size: 'sm', act: 'weather', id: s, pressed: String(S.weather === s) })).join('') + '</div>' +
      '<div class="row-wrap" role="group" aria-label="' + L('音乐账号状态', 'Music account state') + '"><span class="meta">' + L('音乐账号：', 'Music account:') + '</span>' + [['restoring', L('后台恢复中', 'Restoring')], ['restored', L('已恢复', 'Restored')], ['failed', L('恢复失败', 'Failed')], ['out', L('未登录', 'Signed out')]].map(([k, n]) => btn(n, { size: 'sm', act: 'music', id: k, pressed: String(S.music === k) })).join('') + btn(L('编辑布局', 'Edit layout'), { size: 'sm', act: 'layoutEdit', pressed: String(S.layoutEdit), cls: '' }) + '</div>';
    const board = '<section aria-labelledby="home-h"><h2 id="home-h" class="sr-only">' + L('Home 看板', 'Home board') + '</h2><div class="board" id="board">' + S.widgets.map(widget).join('') + '</div></section>';
    const all = sec(L('天气七种状态', 'Seven weather states'), L('每个状态都是真实的业务投影；没有位置/没有数据不会一律显示 Loading；旧缓存标注时间。', 'Each state is a real projection; “no data yet” is never shown as Loading; stale cache is time-labelled.'), '<div class="board">' + WSTATES.map((s) => '<section class="widget" aria-labelledby="ws-' + s + '" data-state="weather-' + ({ refreshing: 'cached-refreshing', invalid: 'invalidated' }[s] || s) + '"><header>' + ic('cloud') + '<h3 id="ws-' + s + '">' + L(WLABEL[s][0], WLABEL[s][1]) + '</h3></header>' + weatherBody(s) + '</section>').join('') + '</div>');
    const insp = sec(L('Home 区域命名（AC-211）', 'Home region naming (AC-211)'), L('鼠标停在整块空白处不会出现提示：区域经 aria-labelledby 命名，且不设 title / aria-label；图标按钮仍有名称与 Tooltip。', 'Hovering a blank region shows no tooltip: regions are named with aria-labelledby, without title or aria-label; icon buttons keep names and Tooltips.'), '<div class="list" id="inspector"></div><div style="min-height:72px;margin-top:8px;border:1px dashed var(--input);border-radius:8px;display:grid;place-items:center" class="meta" data-blank="1">' + L('空白悬停测试区（无 title / aria-label）', 'Blank hover test area (no title / aria-label)') + '</div>');
    return head(L('home 小组件集合', 'Home widget collection'), L('看板区域、小组件、状态与后台恢复；不做卡片套卡片。', 'Board region, widgets, states and background recovery; no cards inside cards.')) + sel + board + all + insp;
  }
  function fillInspector() {
    const el = document.getElementById('inspector');
    if (!el) return;
    const regs = Array.from(main.querySelectorAll('section[aria-labelledby]'));
    el.innerHTML = regs.slice(0, 8).map((r) => {
      const h = document.getElementById(r.getAttribute('aria-labelledby'));
      const bad = r.hasAttribute('title') || r.hasAttribute('aria-label');
      return '<div class="item" style="grid-template-columns:1fr auto;grid-template-areas:\'name acts\'"><span class="nm">' + esc(h ? h.textContent : '?') + '</span><span class="ac">' + badge(h && h.classList.contains('sr-only') ? 'info' : 'success', h && h.classList.contains('sr-only') ? L('隐藏标题', 'hidden heading') : L('可见标题', 'visible heading')) + badge(bad ? 'error' : 'success', bad ? 'title/aria-label !' : L('无整块提示源', 'no region tooltip source')) + '</span></div>';
    }).join('');
  }

  /* ---------- BOT ---------- */
  const BOT_TEXT = {
    zh: '我已经读完收件箱里的 3 条闪念，并整理成待办草稿。下一步需要把草稿写入 demo/inbox/ 目录；这会覆盖 1 个同名文件，所以先请你确认范围。\n\n- 写入位置：demo/inbox/\n- 工具：files.write（一次性）\n- 不会读取保险箱或访问网络。',
    en: 'I read the 3 flash notes in the inbox and drafted a to-do list. Next I need to write the draft into demo/inbox/, which overwrites 1 existing file, so please confirm the scope first.\n\n- Write location: demo/inbox/\n- Tool: files.write (once)\n- No safe access, no network.'
  };
  function apprCard() {
    const a = S.bot.appr;
    const info = '<dl class="kv"><dt>' + L('对象', 'Object') + '</dt><dd>demo/inbox/ · 3 ' + L('个文件', 'files') + '</dd><dt>' + L('范围', 'Scope') + '</dt><dd>' + L('仅此一次 · 仅该目录', 'Once · this folder only') + '</dd><dt>' + L('风险', 'Risk') + '</dt><dd>' + L('覆盖 1 个同名文件', 'Overwrites 1 same-name file') + '</dd></dl>';
    const m = {
      pending: ['warning', L('等待你的审批', 'Waiting for your approval'), btn(L('批准一次', 'Approve once'), { v: 'primary', size: 'sm', act: 'approve' }) + btn(L('拒绝', 'Deny'), { size: 'sm', act: 'deny' }) + btn(L('查看完整命令', 'View full command'), { size: 'sm', v: 'ghost' })],
      approving: ['info', L('正在提交审批…', 'Submitting approval…'), btn(L('批准中', 'Approving'), { v: 'primary', size: 'sm', busy: true }) + btn(L('拒绝', 'Deny'), { size: 'sm', dis: true })],
      approved: ['success', L('已批准并执行', 'Approved and executed'), btn(L('重置演示', 'Reset demo'), { size: 'sm', act: 'resetAppr' })],
      denied: ['error', L('已拒绝，未执行任何写入', 'Denied; nothing was written'), btn(L('重置演示', 'Reset demo'), { size: 'sm', act: 'resetAppr' })],
      failed: ['error', L('审批提交失败：决定已保留，可重试', 'Approval failed to submit: your decision is kept, retry'), btn(L('重试批准', 'Retry approve'), { v: 'primary', size: 'sm', act: 'approve' }) + btn(L('拒绝', 'Deny'), { size: 'sm', act: 'deny' })],
      uncertain: ['info', L('无法确认是否已执行。请先核对，不要重复批准。', 'Cannot confirm whether it ran. Reconcile first; do not approve twice.'), btn(L('核对结果', 'Reconcile'), { v: 'primary', size: 'sm', act: 'reconcile' })],
      expired: ['warning', L('审批已过期', 'Approval expired'), btn(L('重新请求', 'Request again'), { size: 'sm', act: 'resetAppr' })]
    }[a];
    return '<div class="approval" data-st="' + a + '" role="group" aria-label="' + L('审批请求', 'Approval request') + '"><div class="row-wrap">' + badge(m[0], m[1], a === 'approved' ? 'check' : 'alert') + '</div>' + info + '<div class="row-wrap">' + m[2] + '</div></div>';
  }
  function botStream() {
    const b = S.bot;
    const txt = b.phase === 'streaming' || b.phase === 'stopping' || b.phase === 'stopped' ? b.text : BOT_TEXT[S.lang];
    return '<div class="msg user"><span class="who">' + L('你', 'You') + '</span><div class="body">' + L('帮我整理收件箱，并把待办写到 demo/inbox。', 'Sort my inbox and write the to-dos into demo/inbox.') + '</div></div>' + (b.sent.map((s) => '<div class="msg user"><span class="who">' + L('你', 'You') + '</span><div class="body">' + esc(s) + '</div></div>').join('')) +
      '<div class="msg"><span class="who">Agent <span id="phase">' + (b.phase === 'streaming' ? badge('working', L('生成中', 'Streaming')) : b.phase === 'stopping' ? badge('info', L('取消请求中', 'Cancel requested')) : b.phase === 'stopped' ? badge('', L('已停止（已确认）', 'Stopped (confirmed)')) : '') + '</span></span><div class="body" id="bot-body" aria-live="off">' + esc(txt) + (b.phase === 'streaming' ? '<span class="caret" aria-hidden="true"></span>' : '') + '</div></div>' +
      '<div class="tool">' + ic('folder') + '<span>' + L('读取 demo/inbox（3 个文件）', 'Read demo/inbox (3 files)') + '</span>' + badge('success', L('完成', 'Done'), 'check') + '</div>' + (b.phase === 'done' || b.phase === 'stopped' ? apprCard() : '');
  }
  function pageBot() {
    const b = S.bot;
    const ctl = '<div class="row-wrap" style="margin-bottom:8px">' + btn(L('重放流式', 'Replay stream'), { size: 'sm', act: 'botStart', dis: b.phase === 'streaming' || b.phase === 'stopping' }) + btn(L('停止', 'Stop'), { size: 'sm', icon: 'stop', act: 'botStop', dis: b.phase !== 'streaming' }) + '<span class="meta">' + L('审批结果模拟：', 'Simulated outcome:') + '</span>' + [['ok', L('成功', 'Success')], ['fail', L('失败', 'Fail')], ['uncertain', L('不确定', 'Uncertain')]].map(([k, n]) => btn(n, { size: 'sm', act: 'outcome', id: k, pressed: String(b.outcome === k) })).join('') + '</div>';
    const chat = '<div class="chat"><div class="stream" id="stream" tabindex="0" role="log" aria-label="' + L('消息', 'Messages') + '">' + botStream() + '</div>' + '<div class="composer"><div class="row-wrap" style="justify-content:space-between"><span class="meta" id="ime-state" role="status">' + (b.ime || L('提示：输入法组合中按回车不会发送。', 'Tip: Enter does not send while IME composing.')) + '</span><button type="button" class="btn btn-secondary sm newpill" id="newpill" data-act="toBottom" hidden>' + ic('chev') + L('有新内容', 'New content') + '</button></div><div class="input-group"><textarea class="field" id="composer" rows="2" data-fid="composer" aria-label="' + L('消息输入', 'Message input') + '" placeholder="' + L('向 Agent 提问…（Shift+Enter 换行）', 'Ask the agent… (Shift+Enter for newline)') + '"' + (b.phase === 'streaming' ? ' aria-busy="true"' : '') + '></textarea>' + btn('', { v: 'primary', icon: 'send', aria: L('发送', 'Send'), act: 'botSend', dis: b.phase === 'streaming' || b.phase === 'stopping' }) + '</div></div></div>';
    return head(L('BOT 流式消息与审批', 'BOT streaming and approval'), L('流式滚动、取消确认、审批范围/风险、失败保留决定、不确定状态与输入法保护。', 'Streaming scroll, cancel confirmation, approval scope/risk, kept decisions on failure, uncertainty and IME protection.')) + ctl + chat;
  }
  let streamTimer = null;
  function botStart() {
    const b = S.bot;
    clearInterval(streamTimer);
    b.phase = 'streaming'; b.text = ''; b.appr = 'pending';
    const full = BOT_TEXT[S.lang];
    let i = 0;
    renderKeep();
    streamTimer = setInterval(() => {
      i += 3;
      b.text = full.slice(0, i);
      const body = document.getElementById('bot-body');
      const st = document.getElementById('stream');
      if (body) { let tn = body.firstChild; if (!tn || tn.nodeType !== 3) { tn = document.createTextNode(''); body.insertBefore(tn, body.firstChild); } tn.nodeValue = b.text; }
      if (st && S.bot.stick) st.scrollTop = st.scrollHeight; else if (st) { document.getElementById('newpill').hidden = false; }
      if (i >= full.length) { clearInterval(streamTimer); b.phase = 'done'; renderKeep(); }
    }, 40);
  }
  function botStop() {
    clearInterval(streamTimer);
    S.bot.phase = 'stopping'; renderKeep();
    later(() => { S.bot.phase = 'stopped'; renderKeep(); }, 700);
  }
  function approve() {
    S.bot.appr = 'approving'; renderKeep();
    later(() => { S.bot.appr = S.bot.outcome === 'ok' ? 'approved' : S.bot.outcome === 'fail' ? 'failed' : 'uncertain'; renderKeep(); }, 900);
  }

  /* ---------- TERMINAL ---------- */
  let termPane = null, termCreates = 0;
  function ensureTerm() {
    if (termPane) return termPane;
    termCreates++;
    termPane = document.createElement('div');
    termPane.className = 'term';
    termPane.innerHTML = '<div class="term-out" tabindex="0" role="log" aria-label="Terminal output">' + Array.from({ length: 48 }, (_, i) => '$ demo-task --step ' + (i + 1) + '   ok').join('\n') + '</div><div class="term-in"><span aria-hidden="true">$</span><input aria-label="Terminal input" placeholder="type a command (demo)"></div>';
    return termPane;
  }
  const TERM = {
    normal: { chip: ['success', ['运行中', 'Running']], msg: ['终端运行正常。', 'Terminal is running normally.'], acts: ['停止', 'Stop'] },
    stopping: { chip: ['working', ['停止中', 'Stopping']], msg: ['正在请求停止进程，等待确认…', 'Asked the process to stop; waiting for confirmation…'], acts: null },
    unconfirmed: { chip: ['warning', ['停止未确认', 'Stop not confirmed']], msg: ['无法确认进程已停止，它可能仍在运行。请检查停止结果后再继续。', 'Could not confirm the process stopped; it may still be running. Check the stop result before continuing.'], acts: ['检查停止结果', 'Check stop result'], retry: ['再次停止', 'Stop again'] },
    cleanup: { chip: ['warning', ['清理失败', 'Cleanup failed']], msg: ['进程已停止，但有 2 个临时文件未能清理。', 'The process stopped, but 2 temporary files could not be cleaned.'], acts: ['查看详情', 'View details'], retry: ['重试清理', 'Retry cleanup'] },
    crashed: { chip: ['error', ['异常退出', 'Exited abnormally']], msg: ['进程以退出码 137 异常结束，输出已保留。', 'The process ended abnormally with exit code 137; output is preserved.'], acts: ['查看输出', 'View output'], retry: ['重新启动', 'Restart'] }
  };
  function termStatus() {
    const t = TERM[S.term.st];
    const needDetails = S.term.st !== 'normal';
    return '<div class="termbar" data-st="' + S.term.st + '" id="termbar"><span role="status">' + badge(t.chip[0], L(t.chip[1][0], t.chip[1][1]), S.term.st === 'normal' ? 'check' : S.term.st === 'stopping' ? '' : 'alert') + '</span><span class="msg-t">' + L(t.msg[0], t.msg[1]) + '</span>' + (t.acts ? btn(L(t.acts[0], t.acts[1]), { size: 'sm', act: S.term.st === 'normal' ? 'termStopReq' : 'termDetail' }) : '') + (t.retry ? btn(L(t.retry[0], t.retry[1]), { size: 'sm', v: 'outline', act: 'termRetry' }) : '') + btn(L('技术详情', 'Technical details'), { size: 'sm', v: 'ghost', act: 'termToggle', exp: String(S.term.details), ctrl: 'tech' }) + '</div>' +
      (S.term.details ? '<div class="tech" id="tech"><dl class="kv"><dt>Root</dt><dd class="mono">&lt;vault&gt;/.huhu/run/term-7f3a</dd><dt>' + L('阶段', 'Phase') + '</dt><dd>' + L('停止→等待退出→清理', 'stop → await exit → cleanup') + '</dd><dt>' + L('清理', 'Cleanup') + '</dt><dd>' + (S.term.st === 'cleanup' ? L('2 个文件未删除', '2 files not removed') : L('无待清理项', 'nothing pending')) + '</dd><dt>' + L('输出校验', 'Output check') + '</dt><dd>' + (S.term.st === 'unconfirmed' ? L('未验证', 'unverified') : L('已验证', 'verified')) + '</dd><dt>ID</dt><dd class="mono">term-7f3a · pid 4•••</dd></dl>' + btn(L('复制详情（已脱敏）', 'Copy details (redacted)'), { size: 'sm', icon: 'copy', act: 'noop' }) + '</div>' : '');
  }
  function pageTerminal() {
    const sw = '<div class="row-wrap" role="group" aria-label="' + L('状态预览', 'State preview') + '" style="margin:8px 0"><span class="meta">' + L('状态：', 'State:') + '</span>' + [['normal', L('正常', 'Normal')], ['stopping', L('停止中', 'Stopping')], ['unconfirmed', L('停止未确认', 'Stop unconfirmed')], ['cleanup', L('清理失败', 'Cleanup failed')], ['crashed', L('异常退出', 'Abnormal exit')]].map(([k, n]) => btn(n, { size: 'sm', act: 'termSt', id: k, pressed: String(S.term.st === k) })).join('') + '</div>';
    return head(L('终端状态分层', 'Terminal status layers'), L('默认只显示简洁状态；技术字段在可展开详情；需要判断的状态持续可见。折叠/展开与切换状态不重建终端窗格。', 'Concise by default; technical fields in an expandable detail; states needing judgement stay visible. Toggling never rebuilds the terminal pane.')) + sw +
      '<div id="term-status">' + termStatus() + '</div><div id="term-host"></div><p class="meta" id="term-meta" style="margin-top:8px"></p><p class="meta">' + L('此窗格是模拟终端，不是 xterm；用于验证“状态变化不丢输入、选择、滚动位置”的合同。', 'This pane is a mock terminal, not xterm; it demonstrates that status changes keep input, selection and scroll.') + '</p>';
  }
  function mountTerm() {
    const host = document.getElementById('term-host');
    if (!host) return;
    if (ensureTerm().parentNode !== host) { host.appendChild(termPane); const o = termPane.querySelector('.term-out'); if (o && S.term.top != null) o.scrollTop = S.term.top; }
    const inp = termPane.querySelector('input');
    inp.disabled = S.term.st === 'stopping' || S.term.st === 'crashed';
    document.getElementById('term-meta').textContent = L('终端实例创建次数：', 'Terminal pane created: ') + termCreates + L('（应始终为 1）', ' (must stay 1)');
  }

  /* ---------- render ---------- */
  const PAGES = { gallery: pageGallery, list: pageList, safe: pageSafe, home: pageHome, bot: pageBot, terminal: pageTerminal };
  function applyChrome() {
    root.lang = S.lang === 'zh' ? 'zh-CN' : 'en';
    root.dataset.theme = S.theme;
    root.dataset.touch = S.touch ? '1' : '0';
    root.dataset.motion = S.motion ? 'reduce' : 'normal';
    root.dataset.zoom = S.zoom ? '2' : '1';
    frame.dataset.w = S.w;
    document.querySelectorAll('[data-zh]').forEach((e) => { e.textContent = S.lang === 'zh' ? e.dataset.zh : e.dataset.en; });
    document.querySelectorAll('[data-act="lang"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === S.lang)));
    document.querySelectorAll('[data-act="theme"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === S.theme)));
    document.querySelectorAll('[data-act="w"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === S.w)));
    [['long', S.long], ['touch', S.touch], ['motion', S.motion], ['zoom', S.zoom]].forEach(([a, v]) => { const b = document.querySelector('[data-act="' + a + '"]'); if (b) b.setAttribute('aria-pressed', String(v)); });
    document.querySelectorAll('.nav [data-route]').forEach((a) => { if (a.dataset.route === S.route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = 'HUHU UI-001 · ' + S.route;
  }
  function render() {
    const active = document.activeElement;
    const fid = active && active.dataset ? active.dataset.fid : null;
    const val = active && fid && 'value' in active ? active.value : null;
    const st = document.getElementById('stream') ? document.getElementById('stream').scrollTop : 0;
    if (termPane && termPane.parentNode) { S.term.top = termPane.querySelector('.term-out').scrollTop; termPane.parentNode.removeChild(termPane); }
    secN = 0; main.innerHTML = PAGES[S.route]();
    main.setAttribute('aria-label', '');
    main.removeAttribute('aria-label');
    applyChrome();
    afterRender();
    if (fid) { const el = main.querySelector('[data-fid="' + fid + '"]'); if (el) { if (val != null && 'value' in el) el.value = val; el.focus({ preventScroll: true }); } }
    const s2 = document.getElementById('stream'); if (s2) s2.scrollTop = S.bot.stick ? s2.scrollHeight : st;
  }
  function renderKeep() { render(); }
  function afterRender() {
    main.querySelectorAll('textarea.autogrow').forEach(grow);
    main.querySelectorAll('input[type=checkbox][data-ind]').forEach((c) => { c.indeterminate = true; });
    if (S.route === 'terminal') mountTerm();
    if (S.route === 'home') fillInspector();
    const nb = document.getElementById('newpill'); if (nb) nb.hidden = true;
  }
  function grow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, parseInt(t.style.maxHeight || '9999', 10)) + 'px'; t.style.overflowY = t.scrollHeight > parseInt(t.style.maxHeight || '9999', 10) ? 'auto' : 'hidden'; }

  /* ---------- events ---------- */
  function openDlg(id, opener) { const d = document.getElementById(id); if (!d) return; d._opener = opener; d.showModal(); }
  function closeAllPops(except) { main.querySelectorAll('.pop:not(dialog)').forEach((p) => { if (p !== except && !p.hidden) { p.hidden = true; const t = main.querySelector('[aria-controls="' + p.id + '"]'); if (t) t.setAttribute('aria-expanded', 'false'); } }); }
  function simRun(kind) {
    const a = kind === 'empty' ? S.autos.find((x) => x.id === '0a1b2c3d') : S.autos[0];
    const snap = autoName(a);
    const res = kind === 'fail' ? 'fail' : 'ok';
    const n = { id: 'n' + (S.notifs.length + 1), autoId: a.id, snap: kind === 'empty' ? L('未命名自动化', 'Untitled automation') : snap, res, min: 0, unread: true };
    S.notifs.unshift(n); S.selNotif = n.id;
    toast(n.snap + ' · ' + (res === 'ok' ? L('成功', 'succeeded') : L('失败', 'failed')), res === 'ok' ? L('点击通知查看详情', 'Open the notification for details') : L('失败已保留在通知中心', 'Failure kept in notification center'), res === 'ok' ? '' : 'error', 2500);
    render();
  }
  function onAct(t, e) {
    const a = t.dataset.act, id = t.dataset.id;
    switch (a) {
      case 'route':
        readHash('#' + t.dataset.route);
        try { history.pushState(null, '', '#' + t.dataset.route); } catch { /* Embedded previews may disallow URL changes. */ }
        window.scrollTo(0, 0);
        break;
      case 'lang': S.lang = t.dataset.v; render(); break;
      case 'theme': S.theme = t.dataset.v; applyChrome(); break;
      case 'w': S.w = t.dataset.v; applyChrome(); break;
      case 'long': S.long = !S.long; render(); break;
      case 'touch': S.touch = !S.touch; applyChrome(); break;
      case 'motion': S.motion = !S.motion; applyChrome(); break;
      case 'zoom': S.zoom = !S.zoom; applyChrome(); break;
      case 'toggleOpts': { const p = document.getElementById('opts-panel'); const o = p.classList.toggle('open'); t.setAttribute('aria-expanded', String(o)); break; }
      case 'busyDemo': {
        if (t.getAttribute('aria-busy') === 'true') return;
        const c = document.getElementById('busy-count'); t.dataset.n = (+t.dataset.n || 0) + 1;
        t.setAttribute('aria-busy', 'true'); t.insertAdjacentHTML('afterbegin', '<span class="spin" aria-hidden="true"></span>');
        later(() => { t.removeAttribute('aria-busy'); const s = t.querySelector('.spin'); if (s) s.remove(); if (c) c.textContent = L('已提交 ', 'Submitted ') + t.dataset.n + L(' 次', ' time(s)'); }, 1200);
        break;
      }
      case 'toggle': t.setAttribute('aria-pressed', String(t.getAttribute('aria-pressed') !== 'true')); break;
      case 'dlg': openDlg(id, t); break;
      case 'closeDlg': { const d = t.closest('dialog'); if (d) d.close(); break; }
      case 'pop': {
        const p = document.getElementById(id); const open = p.hidden;
        closeAllPops(p); p.hidden = !open; t.setAttribute('aria-expanded', String(open));
        if (open && p.getAttribute('role') === 'menu') { const f = p.querySelector('.menu-item:not(:disabled)'); if (f) f.focus(); }
        break;
      }
      case 'tab': { const tabs = Array.from(t.parentNode.querySelectorAll('[role=tab]:not(:disabled)')); tabs.forEach((x) => { x.setAttribute('aria-selected', String(x === t)); x.tabIndex = x === t ? 0 : -1; }); break; }
      case 'expand': S.expanded[id] = !S.expanded[id]; render(); break;
      case 'toggleAuto': { const x = S.autos.find((q) => q.id === id); x.on = t.checked; render(); break; }
      case 'runAuto': {
        if (t.getAttribute('aria-busy') === 'true') return;
        t.setAttribute('aria-busy', 'true'); t.disabled = false;
        const a2 = S.autos.find((q) => q.id === id);
        later(() => { S.notifs.unshift({ id: 'n' + (S.notifs.length + 1), autoId: id, snap: autoName(a2), res: 'ok', min: 0, unread: true }); toast(autoName(a2) + ' · ' + L('成功', 'succeeded'), '', '', 2500); render(); }, 900);
        t.querySelector('svg') && t.querySelector('svg').insertAdjacentHTML('beforebegin', '<span class="spin" aria-hidden="true"></span>');
        break;
      }
      case 'renameAuto': { const x = S.autos.find((q) => q.id === id); if (x) x.name = L('每日摘要（已改名）', 'Daily digest (renamed)'); render(); break; }
      case 'delAuto': S.autos = S.autos.filter((q) => q.id !== id); render(); break;
      case 'copyId': toast(L('已复制 ID', 'ID copied'), id, '', 1500); break;
      case 'simRun': simRun(id); break;
      case 'selNotif': S.selNotif = id; render(); break;
      case 'resetNotifs': S.notifs = []; S.selNotif = null; render(); break;
      case 'clearQ': S.q = ''; render(); break;
      case 'listMode': S.listMode = id; render(); break;
      case 'listTab': S.listTab = id; render(); break;
      case 'toggleTask': { const x = S.tasks.find((q) => q.id === id); x.done = t.checked; render(); break; }
      case 'taskFail': S.taskFail = !S.taskFail; render(); break;
      case 'pw': S.pwShown = !S.pwShown; render(); break;
      case 'gen': { const arr = new Uint8Array(12); crypto.getRandomValues(arr); const pw = Array.from(arr, (x) => 'abcdefghjkmnpqrstuvwxyz23456789!#'[x % 33]).join(''); const i = main.querySelector('[data-fid="pw0"]'); if (i) { S.pwVals[0] = 'demo-' + pw; S.safeDirty = true; } S.copied = ''; render(); break; }
      case 'copy': S.copied = id[0]; render(); later(() => { S.copied = ''; render(); }, 2500); break;
      case 'opt': S.optOpen = !S.optOpen; render(); break;
      case 'rmTag': S.tags = S.tags.filter((x) => x !== id); S.safeDirty = true; render(); break;
      case 'selEntry': if (S.safeDirty) { S.pending = +id; openDlg('dlg-unsaved', t); } else { S.safeSel = +id; S.safeView = 'edit'; render(); } break;
      case 'discard': S.safeDirty = false; S.safeSel = S.pending == null ? S.safeSel : S.pending; S.safeView = 'edit'; render(); break;
      case 'safeBack': S.safeView = 'list'; render(); break;
      case 'safeCancel': case 'safeSave': S.safeDirty = false; toast(a === 'safeSave' ? L('已保存', 'Saved') : L('已取消', 'Cancelled'), '', '', 1500); render(); break;
      case 'safeLock': S.safeUnlocked = !S.safeUnlocked; S.safeErr = false; render(); break;
      case 'weather': S.weather = id; render(); break;
      case 'music': S.music = id; render(); break;
      case 'layoutEdit': S.layoutEdit = !S.layoutEdit; render(); break;
      case 'moveW': { const i = S.widgets.indexOf(id); if (i > 0) { S.widgets.splice(i - 1, 0, S.widgets.splice(i, 1)[0]); } render(); break; }
      case 'botStart': botStart(); break;
      case 'botStop': botStop(); break;
      case 'outcome': S.bot.outcome = id; render(); break;
      case 'approve': approve(); break;
      case 'deny': S.bot.appr = 'denied'; render(); break;
      case 'reconcile': S.bot.appr = 'approved'; render(); break;
      case 'resetAppr': S.bot.appr = 'pending'; render(); break;
      case 'toBottom': { const st = document.getElementById('stream'); st.scrollTop = st.scrollHeight; S.bot.stick = true; t.hidden = true; break; }
      case 'botSend': sendMsg(); break;
      case 'termSt': S.term.st = id; refreshTerm(); break;
      case 'termToggle': S.term.details = !S.term.details; refreshTerm(); break;
      case 'termStopReq': S.term.st = 'stopping'; refreshTerm(); later(() => { S.term.st = 'unconfirmed'; refreshTerm(); }, 900); break;
      case 'termRetry': S.term.st = S.term.st === 'crashed' ? 'normal' : 'stopping'; refreshTerm(); if (S.term.st === 'stopping') later(() => { S.term.st = 'normal'; refreshTerm(); }, 800); break;
      case 'termDetail': S.term.details = true; refreshTerm(); break;
      default: break;
    }
  }
  function refreshTerm() {
    const el = document.getElementById('term-status');
    const bar = el && el.querySelector('[aria-expanded]');
    const hadFocus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.act : null;
    el.innerHTML = termStatus();
    document.querySelectorAll('[data-act="termSt"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === S.term.st)));
    mountTerm();
    if (hadFocus) { const n = el.querySelector('[data-act="' + hadFocus + '"]'); if (n) n.focus(); }
  }
  function sendMsg() {
    const c = document.getElementById('composer'); if (!c || !c.value.trim()) return;
    S.bot.sent.push(c.value.trim()); c.value = ''; S.bot.ime = L('已发送。', 'Sent.'); render();
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (t && !t.disabled) onAct(t, e);
    if (!e.target.closest('.anchor')) closeAllPops();
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form'); if (!f) return;
    e.preventDefault();
    if (f.dataset.form === 'unlock') {
      const v = f.elements.pw.value; S.mp = v; S.safeBusy = true; S.safeErr = false; render();
      later(() => { S.safeBusy = false; if (/bad/.test(v)) { S.safeErr = true; } else { S.safeUnlocked = true; S.mp = ''; } render(); }, 700);
    } else if (f.dataset.form === 'task') {
      const title = f.elements.title.value.trim(); S.taskDraft = f.elements.title.value; S.taskThrough = f.elements.through.value;
      if (S.taskFail) { render(); return; }
      if (title) { S.tasks.push({ id: 't' + (S.tasks.length + 1), title, done: false, proj: L('新建', 'New'), from: '2026-11-04', through: S.taskThrough }); S.taskDraft = ''; }
      render();
    }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.classList && t.classList.contains('autogrow')) grow(t);
    if (S.route === 'safe' && t.closest('.ep')) S.safeDirty = true;
    if (t.id === 'q') { S.q = t.value; const pos = t.selectionStart; render(); const q = document.getElementById('q'); q.focus(); q.setSelectionRange(pos, pos); }
    if (t.dataset && t.dataset.confirm != null) { const b = t.closest('dialog').querySelector('[data-confirm-btn]'); b.disabled = t.value !== t.dataset.confirm; }
  });
  let composing = false;
  document.addEventListener('compositionstart', () => { composing = true; S.bot.ime = L('输入法组合中…回车仅确认候选词', 'IME composing… Enter only commits the candidate'); const m = document.getElementById('ime-state'); if (m) m.textContent = S.bot.ime; });
  document.addEventListener('compositionend', () => { composing = false; });
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.id === 'composer' && e.key === 'Enter' && !e.shiftKey) {
      if (composing || e.isComposing || e.keyCode === 229) { const m = document.getElementById('ime-state'); if (m) m.textContent = L('组合中的回车被忽略，未发送。', 'Enter during composition ignored; nothing sent.'); return; }
      e.preventDefault(); sendMsg(); return;
    }
    if (t.dataset && t.dataset.tagin && e.key === 'Enter') {
      e.preventDefault(); if (composing || e.isComposing || e.keyCode === 229) return;
      const v = t.value.trim(); if (v && !S.tags.includes(v)) { S.tags.push(v); S.safeDirty = true; render(); }
      return;
    }
    if (t.getAttribute && t.getAttribute('role') === 'tab' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') && t.hasAttribute('data-act') && t.dataset.act === 'tab') {
      const tabs = Array.from(t.parentNode.querySelectorAll('[role=tab]:not(:disabled)')); let i = tabs.indexOf(t);
      i = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[i].focus(); tabs[i].click(); e.preventDefault(); return;
    }
    const menu = t.closest && t.closest('[role=menu]');
    if (menu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      const items = Array.from(menu.querySelectorAll('.menu-item:not(:disabled)')); let i = items.indexOf(t);
      i = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[i].focus(); e.preventDefault(); return;
    }
    if (e.key === 'Escape') {
      const open = main.querySelector('.pop:not([hidden])');
      if (open && !document.querySelector('dialog[open]')) { open.hidden = true; const tr = main.querySelector('[aria-controls="' + open.id + '"]'); if (tr) { tr.setAttribute('aria-expanded', 'false'); tr.focus(); } e.preventDefault(); }
    }
  });
  document.addEventListener('close', (e) => { const d = e.target; if (d.tagName === 'DIALOG' && d._opener && document.contains(d._opener)) d._opener.focus(); }, true);
  /* Tooltip: hover or keyboard focus on [data-tip]; never on regions. */
  let tipTimer = null, tipEl = null;
  function hideTip() { clearTimeout(tipTimer); if (tipEl) { tipEl.remove(); tipEl = null; } }
  function showTip(t) {
    hideTip();
    tipTimer = setTimeout(() => {
      const host = t.closest('.anchor') || t.parentNode; if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      tipEl = document.createElement('span'); tipEl.className = 'tip'; tipEl.setAttribute('role', 'tooltip'); tipEl.textContent = t.dataset.tip; host.appendChild(tipEl);
    }, 200);
  }
  document.addEventListener('pointerover', (e) => { const t = e.target.closest('[data-tip]'); if (t && t.dataset.tip) showTip(t); });
  document.addEventListener('pointerout', (e) => { if (e.target.closest('[data-tip]')) hideTip(); });
  document.addEventListener('focusin', (e) => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t && t.dataset.tip && t.matches(':focus-visible')) showTip(t); });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); }, true);
  document.addEventListener('scroll', (e) => {
    if (e.target && e.target.id === 'stream') { const s = e.target; S.bot.stick = s.scrollHeight - s.scrollTop - s.clientHeight < 24; if (S.bot.stick) { const p = document.getElementById('newpill'); if (p) p.hidden = true; } }
  }, true);

  /* ---------- routing: #route?lang=en&theme=dark&w=420&long=1&touch=1&motion=1&zoom=1&weather=offline&music=failed&term=cleanup&details=1&mode=error&tab=task&appr=failed&bot=stream ---------- */
  function readHash(hash = location.hash) {
    const raw = hash.replace(/^#/, '');
    const [r, qs] = raw.split('?');
    if (PAGES[r]) S.route = r;
    const p = new URLSearchParams(qs || '');
    if (p.get('lang')) S.lang = p.get('lang') === 'en' ? 'en' : 'zh';
    if (p.get('theme')) S.theme = p.get('theme') === 'dark' ? 'dark' : 'light';
    if (p.get('w')) S.w = p.get('w');
    if (p.has('long')) S.long = p.get('long') === '1';
    if (p.has('touch')) S.touch = p.get('touch') === '1';
    if (p.has('motion')) S.motion = p.get('motion') === '1';
    if (p.has('zoom')) S.zoom = p.get('zoom') === '1';
    if (p.get('weather')) S.weather = p.get('weather');
    if (p.get('music')) S.music = p.get('music');
    if (p.get('term')) S.term.st = p.get('term');
    if (p.has('details')) S.term.details = p.get('details') === '1';
    if (p.get('mode')) S.listMode = p.get('mode');
    if (p.get('tab')) S.listTab = p.get('tab');
    if (p.get('appr')) S.bot.appr = p.get('appr');
    if (p.has('locked')) S.safeUnlocked = p.get('locked') !== '1';
    if (p.has('opt')) S.optOpen = p.get('opt') === '1';
    timers.forEach(clearTimeout); timers.clear(); clearInterval(streamTimer);
    document.getElementById('toasts').replaceChildren();
    render();
    if (p.get('bot') === 'stream') botStart();
    if (p.get('sim')) simRun(p.get('sim'));
  }
  window.addEventListener('hashchange', () => readHash());
  window.addEventListener('popstate', () => readHash());
  if (window.innerWidth < 720) { const op = document.getElementById('opts-panel'); if (op) op.classList.remove('open'); }
  readHash();
  window.__huhuProto = { S, render, botStart };
})();
```
<!-- /PROTOTYPE-FILE -->

## Validation and Handoff

| Command or observation | Exit code / result | Evidence locator |
|---|---|---|
| materialize-prototype.mjs --check | 0，verified 3 prototype files | design-system.md |
| validate-design-package.mjs --check-preview | 0，valid | evidence/browser.json |
| validate-design-package.mjs --check-ready | 0，valid | evidence/approval.md / evidence/publication-receipt.json |
| validate-specdev.mjs --stage prototype --prototype-id UI-001 | 0，0 错误、0 警告 | evidence/closure-checks.json / change LOG-016 |
| desktop 1440 与 narrow 390/420 浏览器任务（亮暗） | 继承 40 个旧案例；新增 19 项定向检查与 42 张截图，控制台错误 0 | evidence/browser-before-approval.json / evidence/recheck.json |
| independent design critique | 执行者自评，非用户批准 | evidence/design-review.md |
| technical audit and recheck | 本轮定向复核通过；未改动状态继承原证据 | evidence/technical-review.md |

- [x] 三个候选各有独立的 comparison HTML。
- [x] final 源码块与物化文件逐字一致，且离线。
- [x] 键盘、focus、长文本、缩放（近似）、reduced motion 与各页面状态已脚本化检查。
- [x] 桌面与窄屏截图无空白、遮挡或无意横向溢出。
- [x] 设计确认、prototype digest、基线 revision 与源码字节一致，见不可变批准记录。
- [x] 九项设计决定已确认；旧 REPORT 的待决问题由 evidence/approval.md 及 review-decisions.md 结清。

- **Design authority:** `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/DESIGN.md`
- **Comparison:** `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/comparison/index.html`
- **Runnable final:** `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/final/index.html`
- **Next Work:** 设计发布与绑定已完成；生产实施须另有授权并满足 Ticket 依赖。
- **Unverified items / recovery point:** 宿主 Obsidian 内表现、真实触屏、真实输入法、生产主题对比度、全部 13 模块与全部 home 子项。

## 范围修订（LOG-017、LOG-018）

用户已批准十项一致性修订并完全暂停 Browser 开发与修复。本包 HTML/CSS/JS、候选、视觉与交互未变，prototype digest 和浏览器证据继续只证明原型路径；生产组件验证采用 execution-boundaries 的独立 runner。当前 change DESIGN revision 2 与票据绑定已更新，旧批准、发布回执、截图和 review 报告保留为历史，不作为 Browser 实施授权。
