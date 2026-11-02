---
schema_version: 3
artifact: "ui-prototype"
change: "2026-10-25-agent-workbench-refactor"
design_id: "UI-001"
status: "ready"
project_kind: "existing"
platforms: ["desktop"]
candidates: [{"id": "candidate-a", "template_id": "dense-ide", "primary_reference": "huhu-ui", "auxiliaries": [{"reference_id": "herdr-fixed", "dimension": "终端发现、明确目标、输入等待读取与面板控制机制"}], "rationale": "保持现有三栏、标签和分屏习惯，终端协作对象持续可见。", "structural_difference": "空间与会话常驻左侧，中央双终端，右侧工具按需展开。", "task_id": "terminal-coordination", "entry": "comparison/variants/candidate-a.html"}, {"id": "candidate-b", "template_id": "monochrome-console", "primary_reference": "huhu-ui", "auxiliaries": [{"reference_id": "herdr-fixed", "dimension": "终端发现、明确目标、输入等待读取与面板控制机制"}], "rationale": "后台会话较多时先定位需要处理的对象，再进入终端。", "structural_difference": "侧栏仅保留空间，工作区上方常驻会话运行列表，默认单终端。", "task_id": "terminal-coordination", "entry": "comparison/variants/candidate-b.html"}, {"id": "candidate-c", "template_id": "cross-platform-workspace", "primary_reference": "huhu-ui", "auxiliaries": [{"reference_id": "herdr-fixed", "dimension": "终端发现、明确目标、输入等待读取与面板控制机制"}], "rationale": "键盘操作与长时间单终端驻留时减少常驻区域。", "structural_difference": "侧栏按需打开，顶部命令搜索，默认单终端，控制工具在底部。", "task_id": "terminal-coordination", "entry": "comparison/variants/candidate-c.html"}]
candidate_count_override: null
selected_candidate: "candidate-a"
sources: [{"id": "huhu-ui", "locator": "docs/design-system.md", "revision": "66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"}, {"id": "huhu-shell", "locator": "src/modules/agent/ui/workspace/WorkspaceLayout.tsx", "revision": "66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"}, {"id": "huhu-tokens", "locator": "src/ui/styles/tokens.css", "revision": "66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"}, {"id": "huhu-sidebar", "locator": "src/modules/agent/ui/sidebar/AgentSidebar.tsx", "revision": "66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"}, {"id": "huhu-fonts", "locator": "src/ui/fonts/LICENSE.txt", "license": "SIL Open Font License 1.1", "revision": "66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"}, {"id": "herdr-fixed", "locator": "https://github.com/herdrdev/herdr/tree/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01", "url": "https://github.com/herdrdev/herdr", "revision": "2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01", "license": "根 Apache-2.0；未复制其源码或嵌套资产"}]
prototype_files: ["final/index.html", "final/styles.css", "final/app.js"]
browser_evidence: "evidence/browser.json"
updated_at: "2026-10-25T02:58:06Z"
---

# UI-001：HUHU 终端工作台交互原型

本文件保存项目检测、候选与可运行源码/证据。设计规则唯一由本 change 的 `DESIGN.md` 负责；用户已采用 final 的 A 方案，并明确批准发布 6 条公共基线及完成 P/S 封板。完整批准见 approval.md；DESIGN 已批准，DESIGN-0001 已经 A 网关发布并逐字节回读核对。

## 项目检测

- 目标：现有 Obsidian 桌面 HUHU 插件的终端 Agent 工作台与共享网页承载。
- 共同任务：创建 Space/终端 → A 明确选择 B → 提交输入并等待 → 读取输出；同时验证后台、人工审批、历史与网页独立性。
- 检测模式：既有项目 **source-only**；本次 HTML 为 **真实 Chrome 渲染与交互**，两类证据分开。
- 原 owner：项目设计文档和 UI Skill/组件源码。永久 SpecDev DESIGN 在本轮开始时不存在；候选在本包内，不写永久目录。

| 维度 | 已读取的事实 | 项目相对证据 | 结论边界 |
|---|---|---|---|
| 技术与控件 | React 19、Tailwind 4、共享 Radix/shadcn 风格组件、Lucide | `package.json`、`.agents/skills/ui/SKILL.md`、`docs/design-system.md` | 原型用静态 HTML 模拟交互，不替换生产框架 |
| 布局 | 工具轨、可调整侧栏、Agent 自有标签/面板、焦点与分屏 | `src/modules/agent/ui/workspace/WorkspaceLayout.tsx`、`src/modules/agent/ui/sidebar/AgentSidebar.tsx`、`.agents/skills/ui/references/shell.md` | 不宣称已打开当前 Obsidian 实例观察 |
| 主题与密度 | Obsidian 语义 token、Geist/GeistMono、紧凑控件 | `src/ui/styles/tokens.css`、`src/ui/fonts/`、`.agents/skills/ui/references/design-system.md` | 离线颜色仅为宿主回退 |
| 状态与动效 | focus-visible、reduced motion、无标签切场动画 | `.agents/skills/ui/references/motion-a11y.md` | 真实原型验证不代替生产无障碍认证 |
| 业务边界 | 固定 Herdr 源码、用户 Q1–Q10、原生结果消费者兼容 | 当前 change 的 `LOG.md`、`ADR.md`、`spec.md` | 不把参考项目默认行为全部照搬 |

保留既有导航、标签、原生 TUI 和主题；调整 Space/Session 信息归属；补充明确目标控制、通知与右侧历史；共享网页独立于 Agent 生命周期。没有全项目改版。

## 候选组成

缺省 3 个，用户未指定数量，无数量覆盖。三个候选共享同一 fixture、相同控制/历史/状态演示和同等交互深度。

| 候选 | 结构与适合任务 | 迁移成本与取舍 | 状态 |
|---|---|---|---|
| A 空间与分屏 | 现有空间侧栏 + 并排终端 + 右侧工具；持续协作 | 最接近现有习惯；展开工具会减少每个终端宽度 | 已采用，见用户原话 |
| B 会话总览 | 空间侧栏 + 顶部运行列表 + 当前终端；监看多个后台会话 | 需增加总览区域；牺牲终端纵向高度 | 未采用，保留比较依据 |
| C 终端专注 | 命令入口 + 单终端 + 按需空间/底部工具；键盘操作 | 后台状态不常驻，需使用快捷键 | 未采用，保留比较依据 |

主视觉均为 HUHU；模板只提供任务结构。Herdr 只提供机制参照，未复制其 UI、商标或源码。包内线性 SVG 为本次绘制；字体复制自项目并在各运行目录保留 `LICENSE.txt`。不存在 CDN、远程字体、外部图片或运行网络调用。

## 批准包

- change 设计：`DESIGN.md` revision 1，状态 approved；已发布项目基线为 DESIGN-0001，本包 `baseline-draft.md` 保留获批发布输入，与永久 current/快照字节一致。
- 比较入口：`comparison/index.html`；已采用完整预览：`final/index.html`。各候选有独立入口，可离线双击打开。
- 首次基线发布范围：仅 DS-001–DS-006（现有 HUHU 工作台布局、主题、共享控件、响应式、焦点及动效意图），不接管既有设计文档，不提升原型具体业务交互，不包含实现/提交/归档授权。
- 绑定与批准摘要：见 `evidence/preview-binding.json`。发布回执为 `evidence/publication-receipt.json`；网关按批准时永久基线不存在的 CAS 完成首次发布，current、DESIGN-0001 快照与六条规则索引已回读核对。
- 用户确认来源：先明确采用 final 并要求更新 change 文档，后对具体发布范围答复“发布这 6 条基线并完成封板（推荐）”。选择证据保留在 approval-ui.md，完整批准固定在 approval.md 和 `evidence/publication-approval.json`。实际检查见 `evidence/validation.md`。

## 原型源码

以下三个具名源码块是 final 文件的唯一可物化投影；本节不另立设计规则。

<!-- PROTOTYPE-FILE: final/index.html -->
```html
<!doctype html>
<html lang="zh-CN" data-theme="dark">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HUHU · 终端工作台 · A · 空间与分屏</title><link rel="stylesheet" href="styles.css"></head>
<body class="huhu-ui variant-a" data-variant="a">
<a class="skip" href="#workspace">跳到终端工作台</a>
<div class="prototype-bar"><strong>交互原型</strong><span>A · 空间与分屏 · 示例数据，本页不会启动真实进程</span><div class="spacer"></div><button data-action="theme" aria-label="切换明暗主题">◐ <span class="wide-label">主题</span></button><button data-action="scenarios">状态演示</button><button data-action="reset" aria-label="重置演示">重置</button></div>
<div class="host-tabs"><span class="obsidian-mark" aria-hidden="true">◇</span><span class="host-title">个人知识库</span><span class="host-tab">HUHU <span aria-hidden="true">×</span></span><span class="muted">＋</span></div>
<div class="shell">
<nav class="rail" aria-label="HUHU 模块"><span class="brand" aria-label="HUHU">H</span><button data-action="home" aria-label="首页" data-icon="home"></button><button class="rail-active" data-action="agent" aria-label="智能体工作台" data-icon="terminal"></button><button data-action="web" aria-label="浏览器" data-icon="globe"></button><button data-action="history" aria-label="当前 Vault 历史" data-icon="history"></button><div class="spacer"></div><button data-action="settings" aria-label="终端设置与数据说明" data-icon="settings"></button></nav>
<aside class="sidebar" id="sidebar" aria-label="空间与会话"></aside>
<main id="workspace" class="workspace" tabindex="-1">
<header class="workspace-toolbar"><button data-action="spaces" data-icon="panel" aria-label="打开空间列表"></button><div class="workspace-title"><h1>终端工作台</h1><span id="current-space" class="muted"></span></div><div class="spacer"></div><button data-action="new-terminal" class="new-terminal">＋ <span>新建终端</span></button><button data-action="split" data-icon="split" aria-label="切换单面板与分屏"></button><button data-action="direction" data-icon="layout" aria-label="切换分屏方向"></button><button data-action="palette" data-icon="command" aria-label="打开命令面板"></button><button data-action="control" data-icon="sliders" aria-label="打开终端控制"></button><button data-action="history" data-icon="history" aria-label="打开历史抽屉"></button></header>
<div class="structure-hint" id="structure-hint">空间组织会话；关闭面板后，终端仍可在后台运行。</div>
<nav class="tabbar" aria-label="工作区标签" id="tabs"></nav>
<div class="surface"><section class="stage" id="stage" aria-label="终端面板"></section><dialog id="inspector" class="inspector" aria-label="终端工具"><div id="inspector-content"></div></dialog></div>
</main></div>
<div class="host-status"><span>Obsidian · 个人知识库</span><span>示例环境 · 本地终端工作台</span></div>
<dialog id="sheet" class="sheet" aria-label="空间列表"><div class="dialog-heading"><h2>空间</h2><button data-action="close-dialog" data-dialog="sheet" aria-label="关闭空间列表">×</button></div><div id="sheet-content"></div></dialog>
<dialog id="modal" class="modal" aria-labelledby="modal-title"></dialog>
<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
<script src="app.js"></script></body></html>
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/styles.css -->
```css
@font-face { font-family: Geist; src: url("Geist-Variable.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: GeistMono; src: url("GeistMono-Variable.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
:root {
  color-scheme: dark;
  --background-primary: #1e1e20; --background-secondary: #252527; --background-primary-alt: #232325;
  --text-normal: #e6e6e9; --text-muted: #aeafb8; --text-faint: #888a96;
  --background-modifier-border: #39393f; --background-modifier-hover: #303035; --interactive-accent: #ab9bff; --text-on-accent: #201b36;
  --color-green: #8ecaa7; --color-orange: #edbd80; --color-red: #f3a1ab; --color-blue: #9abffc; --color-yellow: #dfcf81;
  --terminal-background: #19191b; --preview-background: #141416; --overlay-shade: #00000080; --shadow-color: #00000040;
  --surface-selected: #333044; --terminal-selection: #39334d; --color-inverse: #ffffff;
  --background: var(--background-primary); --foreground: var(--text-normal); --muted-foreground: var(--text-muted); --border: var(--background-modifier-border);
  --primary: var(--interactive-accent); --primary-foreground: var(--text-on-accent); --ring: var(--interactive-accent);
  --sidebar: var(--background-secondary); --card: var(--background-primary-alt); --accent: var(--background-modifier-hover);
  --radius-control: 6px; --radius-panel: 8px; --space-unit: 4px; --rail-width: 52px; --sidebar-width: 232px; --inspector-width: 312px; --control-height: 32px;
  --layer-popover: 20; --layer-toast: 30; --font-ui: Geist, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; --font-mono: GeistMono, "SFMono-Regular", Consolas, "Microsoft YaHei", monospace;
}
:root[data-theme="light"] { color-scheme: light; --background-primary: #ffffff; --background-secondary: #f4f4f6; --background-primary-alt: #f8f8fa; --text-normal: #25252c; --text-muted: #595b68; --text-faint: #6b6d79; --background-modifier-border: #dedee5; --background-modifier-hover: #eaeaf0; --interactive-accent: #6651bd; --text-on-accent: #ffffff; --color-green: #27784c; --color-orange: #925b16; --color-red: #b13d4e; --color-blue: #3162a7; --color-yellow: #796515; --terminal-background: #fafafd; --preview-background: #ededf1; --surface-selected: #eae6f8; --terminal-selection: #e6e0f5; --shadow-color: #29233a20; }
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; min-width: 0; height: 100%; }
.huhu-ui { background: var(--background); color: var(--foreground); font: 13px/1.5 var(--font-ui); }
button, input, textarea, select { font: inherit; color: inherit; }
button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: var(--control-height); border: 1px solid transparent; border-radius: var(--radius-control); padding: 4px 8px; background: transparent; cursor: pointer; text-align: center; }
button:hover { background: var(--accent); } button:active { background: var(--surface-selected); }
button:disabled { opacity: .48; cursor: not-allowed; }
button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, [tabindex]:focus-visible { outline: 3px solid var(--ring); outline-offset: -3px; }
input, textarea, select { min-width: 0; width: 100%; border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--background); padding: 7px 9px; }
textarea { resize: vertical; min-height: 92px; line-height: 1.6; }
label { display: block; color: var(--muted-foreground); font-size: 12px; margin: 0 0 6px; }
h1, h2, h3, p { margin: 0; } h1 { font-size: 13px; font-weight: 600; } h2 { font-size: 14px; font-weight: 600; } h3 { font-size: 12px; font-weight: 600; }
a { color: var(--primary); } svg { width: 17px; height: 17px; flex-shrink: 0; }
code, kbd, .mono { font-family: var(--font-mono); } kbd { font-size: 10px; padding: 1px 4px; border: 1px solid var(--border); border-radius: 4px; color: var(--muted-foreground); }
small, .small { font-size: 11px; } .muted { color: var(--muted-foreground); } .spacer { flex: 1; } .grow { flex: 1; min-width: 0; }
.truncate { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.row { display: flex; align-items: center; gap: 8px; min-width: 0; } .wrap { flex-wrap: wrap; } .stack { display: grid; gap: 12px; } .mt { margin-top: 12px; }
.primary { background: var(--primary); color: var(--primary-foreground); font-weight: 600; } .primary:hover { background: var(--primary); filter: brightness(1.07); }
.outline { border-color: var(--border); } .danger { color: var(--color-red); } .full { width: 100%; }
.skip { position: fixed; transform: translateY(-140%); padding: 12px; background: var(--background); z-index: var(--layer-toast); } .skip:focus { transform: none; }
.prototype-bar { height: 36px; display: flex; align-items: center; padding: 0 12px; gap: 10px; border-bottom: 1px solid var(--border); background: var(--preview-background); color: var(--muted-foreground); font-size: 11px; }
.prototype-bar strong { color: var(--primary); font-weight: 500; white-space: nowrap; } .prototype-bar button { min-height: 28px; font-size: 11px; }
.host-tabs { height: 36px; display: flex; align-items: center; gap: 16px; padding: 0 16px; background: var(--sidebar); border-bottom: 1px solid var(--border); font-size: 12px; }
.obsidian-mark { color: var(--primary); font-size: 24px; } .host-title { width: 216px; color: var(--muted-foreground); }
.host-tab { display: flex; align-items: center; justify-content: space-between; width: 180px; height: 32px; padding: 0 14px; background: var(--background); border-radius: 6px 6px 0 0; align-self: end; }
.shell { display: flex; height: calc(100dvh - 94px); min-height: 420px; overflow: hidden; }
.rail { display: flex; flex-direction: column; align-items: center; gap: 8px; width: var(--rail-width); flex-shrink: 0; padding: 12px 6px; border-right: 1px solid var(--border); background: var(--sidebar); }
.brand { display: grid; place-items: center; width: 28px; height: 28px; margin-bottom: 12px; color: var(--foreground); border: 1px solid var(--border); border-radius: 8px; font-size: 16px; font-weight: 700; }
.rail button { width: 36px; height: 36px; color: var(--muted-foreground); } .rail .rail-active { color: var(--primary); background: var(--surface-selected); }
.sidebar { width: var(--sidebar-width); flex-shrink: 0; border-right: 1px solid var(--border); background: var(--sidebar); overflow-y: auto; padding: 12px 10px; }
.sidebar-heading { display: flex; align-items: center; gap: 6px; padding: 0 4px 12px; } .sidebar-heading h2 { font-size: 13px; }
.space-item { width: 100%; justify-content: flex-start; gap: 8px; text-align: left; margin-bottom: 2px; padding: 8px; }
.space-item.selected { background: var(--surface-selected); } .space-item small { display: block; color: var(--muted-foreground); margin-top: 2px; }
.space-icon { width: 26px; height: 26px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 6px; font-size: 11px; flex-shrink: 0; }
.section-label { display: flex; align-items: center; justify-content: space-between; padding: 18px 7px 7px; color: var(--text-faint); font-size: 11px; }
.session { width: 100%; justify-content: flex-start; text-align: left; padding: 8px; margin-bottom: 3px; gap: 8px; }
.session.selected { background: var(--accent); } .session small { display: block; color: var(--muted-foreground); margin-top: 3px; }
.dot { height: 7px; width: 7px; border-radius: 50%; background: var(--text-faint); flex-shrink: 0; } .dot.idle { background: var(--color-green); } .dot.working { background: var(--color-yellow); } .dot.blocked { background: var(--color-orange); }
.badge { display: inline-flex; gap: 5px; align-items: center; color: var(--muted-foreground); font-size: 10px; white-space: nowrap; border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; font-variant-numeric: tabular-nums; }
.badge.idle { color: var(--color-green); } .badge.working { color: var(--color-yellow); } .badge.blocked { color: var(--color-orange); } .badge.accent { color: var(--primary); border-color: var(--primary); }
.sidebar-note { margin: 20px 8px; padding-top: 12px; border-top: 1px solid var(--border); color: var(--muted-foreground); font-size: 11px; line-height: 1.7; }
.workspace { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.workspace-toolbar { display: flex; align-items: center; min-height: 44px; gap: 3px; padding: 6px 10px; border-bottom: 1px solid var(--border); } .workspace-title { min-width: 0; padding: 0 8px; } #current-space { display: block; font-size: 10px; max-width: 240px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.workspace-toolbar button { flex-shrink: 0; } .new-terminal { margin-right: 6px; border-color: var(--border); }
.structure-hint { padding: 6px 16px; font-size: 11px; color: var(--text-faint); background: var(--card); border-bottom: 1px solid var(--border); }
.tabbar { display: flex; align-items: stretch; gap: 2px; min-height: 38px; border-bottom: 1px solid var(--border); overflow-x: auto; flex-shrink: 0; }
.tabbar button { flex-shrink: 0; border-radius: 0; min-height: 38px; padding: 0 14px; font-size: 12px; color: var(--muted-foreground); border-bottom: 2px solid transparent; }
.tabbar button.selected { border-bottom-color: var(--primary); color: var(--foreground); background: var(--card); }
.surface { display: flex; min-height: 0; flex: 1; overflow: hidden; } .stage { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; overflow: auto; }
.terminal-grid { display: grid; grid-template-columns: minmax(0,var(--split,1fr)) 6px minmax(0,1fr); flex: 1; min-height: 0; }
.terminal-grid.single { grid-template-columns: 1fr; } .terminal-grid.vertical { grid-template-columns: 1fr; grid-template-rows: minmax(0,var(--split,1fr)) 6px minmax(0,1fr); }
.pane { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: var(--terminal-background); border: 1px solid transparent; }
.pane.focused { border-color: var(--primary); } .pane-head { display: flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 8px; border-bottom: 1px solid var(--border); background: var(--card); font-size: 11px; }
.pane-head strong { font-weight: 500; } .pane-head button { padding: 0 5px; min-width: 32px; min-height: 32px; } .pane-head .grow { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.terminal { font-family: var(--font-mono); font-size: 12px; line-height: 1.8; overflow: auto; min-height: 100px; padding: 18px 18px 12px; flex: 1; overflow-wrap: anywhere; }
.terminal p { margin-bottom: 10px; white-space: pre-wrap; } .terminal .term-brand { margin-bottom: 16px; display: block; color: var(--foreground); font-size: 14px; }
.term-meta { color: var(--text-faint); font-size: 10px; } .term-user { color: var(--foreground); border-left: 2px solid var(--primary); padding-left: 10px; margin: 18px 0; }
.term-tool { color: var(--color-blue); } .term-pass { color: var(--color-green); } .term-warn { color: var(--color-orange); }
.terminal-input { display: flex; align-items: center; gap: 6px; border-top: 1px solid var(--border); padding: 9px 12px; color: var(--primary); }
.terminal-input input { background: transparent; border: 0; font: 12px var(--font-mono); padding: 6px; } .terminal-input button { min-height: 32px; min-width: 32px; padding: 0 6px; }
.pane-caption { font-size: 10px; padding: 0 16px 9px; color: var(--text-faint); }
.split-handle { display: flex; justify-content: center; background: var(--sidebar); } .split-handle input { appearance: none; border: 0; padding: 0; margin: 0; border-radius: 0; width: 6px; background: var(--border); writing-mode: vertical-lr; cursor: col-resize; }
.split-handle input::-webkit-slider-thumb { appearance: none; width: 6px; height: 28px; background: var(--text-faint); border-radius: 3px; }
.vertical .split-handle input { width: 100%; height: 6px; writing-mode: horizontal-tb; cursor: row-resize; }
.inspector { position: static; flex-shrink: 0; width: var(--inspector-width); max-width: none; max-height: none; height: 100%; border: 0; border-left: 1px solid var(--border); padding: 0; margin: 0; color: inherit; background: var(--card); overflow-y: auto; }
.inspector:not([open]) { display: none; } .tool-tabs { display: flex; align-items: center; gap: 0; min-height: 42px; padding: 4px 8px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--card); }
.tool-tabs [role="tab"] { font-size: 12px; } .tool-tabs [aria-selected="true"] { color: var(--primary); background: var(--surface-selected); } .tool-tabs .close-tool { margin-left: auto; }
.tool-content { padding: 16px; } .tool-section + .tool-section { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
.tool-title { margin-bottom: 12px; } .target-meta { font-size: 11px; color: var(--muted-foreground); margin-top: 6px; line-height: 1.7; overflow-wrap: anywhere; }
.callout { padding: 10px 12px; border-left: 2px solid var(--primary); background: var(--surface-selected); font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.callout.warning { border-color: var(--color-orange); background: var(--card); } .callout.error { border-color: var(--color-red); background: var(--card); }
.feedback { margin-top: 12px; font-size: 11px; line-height: 1.8; color: var(--muted-foreground); } .feedback strong { color: var(--foreground); }
.screen-preview { margin: 10px 0; padding: 10px; white-space: pre-wrap; overflow-wrap: anywhere; background: var(--terminal-background); border: 1px solid var(--border); border-radius: 6px; font: 11px/1.7 var(--font-mono); }
.mail-item, .history-item { padding: 12px 0; border-bottom: 1px solid var(--border); } .mail-item p, .history-item p { color: var(--muted-foreground); font-size: 12px; margin: 6px 0; overflow-wrap: anywhere; }
.mail-heading { font-size: 12px; } .mail-heading .badge { margin-left: 6px; } .history-item button { text-align: left; justify-content: flex-start; width: 100%; padding: 4px 0; font-weight: 500; }
.empty { display: grid; align-content: center; justify-items: center; gap: 12px; min-height: 240px; padding: 32px; text-align: center; flex: 1; color: var(--muted-foreground); } .empty h2 { color: var(--foreground); } .empty p { max-width: 360px; line-height: 1.8; }
.banner { padding: 10px 16px; border-bottom: 1px solid var(--border); font-size: 12px; display: flex; align-items: center; gap: 10px; background: var(--card); }
.native-approval { padding: 14px; border: 1px solid var(--color-orange); border-radius: 6px; margin: 14px 0; } .native-approval p { color: var(--color-orange); }
.host-status { height: 22px; display: flex; justify-content: space-between; padding: 0 12px; align-items: center; background: var(--sidebar); border-top: 1px solid var(--border); color: var(--text-faint); font-size: 10px; }
.modal, .sheet { border: 1px solid var(--border); color: var(--foreground); background: var(--background); border-radius: 10px; width: min(520px,calc(100% - 32px)); max-height: calc(100dvh - 40px); padding: 24px; box-shadow: 0 16px 48px var(--shadow-color); }
dialog::backdrop { background: var(--overlay-shade); } .dialog-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; } .dialog-heading h2 { flex: 1; } .dialog-heading button { width: 32px; }
.dialog-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-top: 20px; } .modal p { color: var(--muted-foreground); line-height: 1.8; } .modal .stack p { font-size: 12px; }
.sheet { padding: 16px; max-width: 360px; } .sheet .session-tree { display: block; }
.inspector:modal { position: fixed; inset: 0; width: min(430px,calc(100% - 24px)); height: calc(100dvh - 40px); max-height: calc(100dvh - 40px); margin: auto; border: 1px solid var(--border); border-radius: 10px; }
.palette-list { margin-top: 12px; display: grid; gap: 4px; } .palette-list button { justify-content: flex-start; text-align: left; width: 100%; min-height: 44px; } .palette-list button small { margin-left: auto; color: var(--muted-foreground); }
.scenario-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; } .scenario-grid button { border: 1px solid var(--border); min-height: 44px; justify-content: flex-start; }
.toast { position: fixed; bottom: 34px; left: 50%; transform: translateX(-50%); background: var(--foreground); color: var(--background); padding: 10px 16px; border-radius: 8px; font-size: 12px; max-width: calc(100vw - 32px); z-index: var(--layer-toast); box-shadow: 0 4px 16px var(--shadow-color); }
.web-address { margin: 12px 16px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; color: var(--muted-foreground); }
.web-page { margin: 0 auto; max-width: 680px; padding: 44px 40px; font-size: 14px; line-height: 1.9; } .web-page h2 { font-size: 25px; line-height: 1.5; margin: 12px 0 20px; } .web-page h3 { font-size: 15px; margin: 24px 0 8px; } .web-page p { color: var(--muted-foreground); }
.control-deck { padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--card); } .control-deck header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; } .control-deck header span { font-size: 11px; color: var(--muted-foreground); } .deck-row { display: flex; align-items: center; gap: 12px; min-height: 38px; border-top: 1px solid var(--border); } .deck-row > span:first-child { width: 120px; } .deck-row .mono { color: var(--muted-foreground); font-size: 11px; } .variant-b .session-tree { display: none; } .variant-b { --sidebar-width: 220px; }
.focus-nav { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); } .focus-nav > button:first-child { border: 1px solid var(--border); min-width: 290px; justify-content: flex-start; } .focus-nav span { color: var(--muted-foreground); font-size: 11px; }
.variant-c .sidebar { display: none; } .variant-c .surface { flex-direction: column; } .variant-c .inspector:not(:modal) { width: 100%; height: 320px; border-left: 0; border-top: 1px solid var(--border); } .variant-c .inspector:not(:modal) .control-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; } .variant-c .inspector:not(:modal) .tool-section + .tool-section { margin: 0; padding: 0; border: 0; } .variant-c .terminal { padding-left: 28px; }
@media (max-width: 1190px) and (min-width: 960px) { :root { --sidebar-width: 220px; --inspector-width: 286px; } .workspace-title { padding-inline: 4px; } .new-terminal { font-size: 11px; } .terminal { padding: 12px; } }
@media (max-width: 959px) { .sidebar { display: none; } .inspector:not(:modal) { display: none; } .host-title { width: auto; } .workspace-toolbar { flex-wrap: wrap; } .workspace-title { flex: 1; } .workspace-toolbar .spacer { display: none; } .terminal-grid { grid-template-columns: 1fr; grid-template-rows: minmax(0,var(--split,1fr)) 6px minmax(0,1fr); } .terminal-grid.single { grid-template-rows: 1fr; } .split-handle input { width: 100%; height: 6px; writing-mode: horizontal-tb; } .focus-nav span { display: none; } }
@media (max-width: 599px) { :root { --control-height: 44px; } .rail { display: none; } .prototype-bar { height: auto; min-height: 42px; padding: 4px 8px; gap: 5px; flex-wrap: wrap; } .prototype-bar > span { display: none; } .prototype-bar button { min-height: 34px; } .host-tabs { height: 32px; padding-inline: 10px; gap: 12px; } .host-title { font-size: 11px; } .host-tab { height: 28px; width: 140px; } .shell { height: calc(100dvh - 96px); min-height: 420px; } .host-status { font-size: 9px; } .host-status span:last-child { display: none; } .workspace-toolbar { gap: 1px; padding: 4px 6px; min-height: 96px; } .workspace-title { flex-basis: calc(100% - 56px); } .workspace-toolbar button { min-width: 44px; } .workspace-toolbar .new-terminal { flex: 1; margin: 0; } .structure-hint { display: none; } .tabbar button { min-height: 44px; padding: 0 10px; } .terminal { padding: 12px; font-size: 11px; } .pane-head { min-height: 44px; padding: 0 6px; } .pane-head button { min-width: 44px; min-height: 44px; } .pane-head .badge { font-size: 9px; } .terminal-input { padding: 4px 8px; } .terminal-input input { min-height: 44px; } .terminal-input button { min-height: 44px; min-width: 44px; } .pane-caption { padding: 2px 12px 6px; } .tool-tabs { min-height: 50px; } .tool-tabs .close-tool { min-width: 44px; } .web-page { padding: 24px 20px; } .web-page h2 { font-size: 22px; } .banner { flex-wrap: wrap; } .modal { padding: 18px; } .control-deck { padding: 8px 12px; max-height: 210px; overflow: auto; } .control-deck header span { display: none; } .deck-row { gap: 6px; flex-wrap: wrap; } .deck-row .mono { display: none; } .focus-nav { flex-wrap: wrap; padding: 6px 10px; } .focus-nav > button:first-child { min-width: 0; flex: 1; } .focus-nav > button:last-of-type { display: none; } .variant-c .terminal { padding: 12px; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none; animation: none; scroll-behavior: auto; } }
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/app.js -->
```javascript
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const variant = document.body.dataset.variant;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {
    home:'<path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/>',
    terminal:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m6 0h4"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-6 5-6 13 0 18 6-5 6-13 0-18Z"/>',
    history:'<path d="M3 5v5h5M4 9a9 9 0 1 1 0 7m8-9v6l4 2"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
    panel:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    split:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
    layout:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/>',
    command:'<path d="M8 8H5a3 3 0 1 1 3-3v14a3 3 0 1 1-3-3h14a3 3 0 1 1-3 3V5a3 3 0 1 1 3 3H8Z"/>',
    sliders:'<path d="M6 3v6m0 6v6M12 3v10m0 6v2m6-18v2m0 6v10"/><path d="M3 9h6v6H3Zm6 4h6v6H9Zm6-8h6v6h-6Z"/>'
  };
  function paintIcons() { document.querySelectorAll('[data-icon]').forEach(e => { e.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[e.dataset.icon] || ''}</svg>`; }); }
  const initial = () => ({
    spaces:[{id:'space-terminal',name:'终端重构',cwd:'项目 / obsidian-huhu',external:false},{id:'space-docs',name:'文档维护',cwd:'本机授权目录 / workspace-docs',external:true}],
    sessions:[{id:'ses-main',name:'主控',provider:'Codex',space:'space-terminal',status:'idle',visible:true,log:[]},{id:'ses-review',name:'代码审阅',provider:'Claude Code',space:'space-terminal',status:'idle',visible:variant==='a',log:[]},{id:'ses-shell',name:'构建验证',provider:'Shell',space:'space-terminal',status:'working',visible:false,log:[]},{id:'ses-docs',name:'文档助手',provider:'Codex',space:'space-docs',status:'idle',visible:false,log:[]}],
    current:'space-terminal',focus:'ses-main',partner:'ses-review',target:'ses-review',scope:'space',tool:'control',tab:'terminals',split:variant==='a',vertical:false,ratio:50,
    messages:[{id:'msg-01',from:'文档助手',target:'ses-main',body:'文档中已补充视图关闭与停止运行的区别，请核对。',read:false,ack:false},{id:'msg-02',from:'主控',target:'ses-review',body:'请检查输入仲裁与后台会话恢复的边界。',read:false,ack:false}],
    feedback:null,screen:false,scenario:'default',history:'default',query:'',preview:null,notes:{},agentEnabled:true,restored:false,newCounter:0
  });
  let state=initial(), timer, toastTimer, operation=0, lastTrigger;
  const statusText = {idle:'空闲',working:'工作中',blocked:'待确认',stopped:'已停止',unknown:'状态未知'};
  const getSession=id=>state.sessions.find(s=>s.id===id);
  const currentSpace=()=>state.spaces.find(s=>s.id===state.current);
  const getTarget=()=>getSession(state.target);
  const badge=s=>`<span class="badge ${s.status}"><span class="dot ${s.status}"></span>${statusText[s.status]}</span>`;
  function notify(text) { clearTimeout(toastTimer); $('#toast').textContent=text; $('#toast').hidden=false; toastTimer=setTimeout(()=>{$('#toast').hidden=true;},4000); }
  function openModal(title,body,actions='') {
    lastTrigger=document.activeElement; const d=$('#modal');
    d.innerHTML=`<div class="dialog-heading"><h2 id="modal-title">${title}</h2><button data-action="close-dialog" data-dialog="modal" aria-label="关闭对话框">×</button></div>${body}${actions?`<div class="dialog-actions">${actions}</div>`:''}`;
    if(!d.open)d.showModal();
  }
  function closeModal(){ $('#modal').close(); }
  function sidebarHTML(){
    return `<div class="sidebar-heading"><h2>智能体</h2><div class="spacer"></div><button data-action="create-space" aria-label="新建空间">＋</button></div>
      <div class="section-label" style="padding-top:0">当前 Vault · 个人知识库</div>
      ${state.spaces.map((sp,i)=>`<button class="space-item ${sp.id===state.current?'selected':''}" data-action="space" data-id="${sp.id}"><span class="space-icon">${String(i+1).padStart(2,'0')}</span><span class="grow"><strong class="truncate" title="${esc(sp.name)}">${esc(sp.name)}</strong><small>${state.sessions.filter(s=>s.space===sp.id&&s.status!=='stopped').length} 个运行 · ${sp.external?'库外已授权':'Vault 内目录'}</small></span></button>`).join('')}
      ${state.spaces.length?'':'<p class="muted small">尚未创建空间</p>'}
      <button class="full outline mt" data-action="create-space">＋ 新建空间</button>
      <div class="session-tree"><div class="section-label">当前空间 · 会话 <span>${state.sessions.filter(s=>s.space===state.current).length}</span></div>
      ${state.sessions.filter(s=>s.space===state.current).map(s=>`<button class="session ${s.id===state.focus?'selected':''}" data-action="session" data-id="${s.id}"><span class="dot ${s.status}"></span><span class="grow"><span class="truncate" title="${esc(s.name)}">${esc(s.name)}</span><small>${s.provider} · ${statusText[s.status]}${!s.visible&&s.status!=='stopped'?' · 后台':''}</small></span>${state.messages.some(m=>m.target===s.id&&!m.ack)?'<span class="badge accent">'+state.messages.filter(m=>m.target===s.id&&!m.ack).length+'</span>':''}</button>`).join('')}</div>
      <div class="section-label">工具</div><button class="session" data-action="history">↶ <span>本 Vault 历史</span></button><button class="session" data-action="web">◎ <span>参考资料</span><span class="badge">网页</span></button>
      <div class="sidebar-note">${esc(currentSpace()?.cwd||'创建空间后可绑定工作目录')}<br>关闭面板后，可从会话列表再次显示。</div>`;
  }
  function terminalHTML(s){
    const focused=s.id===state.focus;
    let content='';
    if(s.status==='stopped')content=`<div class="empty"><h2>运行已结束</h2><p>会话记录仍然保留。继续会话会启动新的运行。</p><button class="outline" data-action="resume-session" data-id="${s.id}">继续会话</button></div>`;
    else if(s.provider==='Shell')content=`<p><span class="term-pass">❯</span> pnpm run build</p><p class="muted">&gt; tsc -noEmit -skipLibCheck<br>&gt; node scripts/build-styles.mjs --check</p><p class="term-tool">正在检查类型与样式…</p><p class="term-meta">这是演示输出，未执行真实命令。</p>`;
    else if(s.id==='ses-review')content=`<strong class="term-brand">✳ Claude Code</strong><p class="term-meta">系统账号 · 项目 / obsidian-huhu</p><div class="term-user">审查终端运行与显示面板的关系。</div><p>我会先核对会话身份与关闭逻辑。</p><p class="term-tool">● Read WorkspaceLayout.tsx</p><p class="muted">  已检查面板切换与关闭入口。<br>  后台会话不应依赖 React 视图存活。</p><p class="term-pass">✓ 审阅意见已整理</p><p>关闭视图后保留运行；停止操作单独提供，并核实进程退出。</p>`;
    else content=`<strong class="term-brand">›_ Codex</strong><p class="term-meta">系统账号 · 项目 / obsidian-huhu<br>当前会话：${esc(s.id)}</p><div class="term-user">把代码审阅交给另一个终端，并查看它的反馈。</div><p>我会定位审阅终端，然后提交输入、等待状态变化并读取屏幕。</p><p class="term-tool">• 已发现代码审阅 · Claude Code</p><p class="muted">  Space：终端重构<br>  会话：ses-review<br>  输入：可用</p><p>可以在右侧控制面中查看同一目标。跨空间操作会明确显示目标归属。</p><p class="term-meta">终端状态只描述运行情况，结论还需读取输出或核对产物。</p>`;
    if(s.status==='blocked')content+=`<div class="native-approval"><p>需要你确认 · 原生终端审批</p><p class="small">Claude Code 请求执行：pnpm run build</p><div class="row wrap"><button class="outline" data-action="human-approve" data-id="${s.id}">允许本次</button><button class="outline" data-action="human-reject" data-id="${s.id}">拒绝</button></div></div>`;
    if(s.status==='unknown')content+=`<div class="callout warning">连接已中断，暂时无法确认运行状态。<button data-action="reconnect">重新连接</button></div>`;
    content+=s.log.map(l=>`<p class="${l.kind==='input'?'term-user':'term-tool'}">${esc(l.text)}</p>`).join('');
    return `<article class="pane ${focused?'focused':''}" data-session="${s.id}"><header class="pane-head"><button data-action="focus" data-id="${s.id}" aria-label="聚焦${esc(s.name)}">${s.provider==='Shell'?'$':'›_'}</button><strong class="grow" title="${esc(s.name)}">${esc(s.name)}</strong>${badge(s)}<button data-action="detach" data-id="${s.id}" aria-label="关闭${esc(s.name)}显示面板">×</button></header><div class="terminal" tabindex="0" aria-label="${esc(s.name)}终端输出">${content}</div><form class="terminal-input" data-session="${s.id}"><span aria-hidden="true">›</span><input id="input-${s.id}" aria-label="${esc(s.name)}原生终端输入" placeholder="输入内容，Enter 提交" ${['stopped','blocked','unknown'].includes(s.status)?'disabled':''}><button type="submit" aria-label="提交到${esc(s.name)}" ${['stopped','blocked','unknown'].includes(s.status)?'disabled':''}>↵</button></form><div class="pane-caption">${s.provider} · ${statusText[s.status]} · ${focused?'当前焦点':'点击标题聚焦'}</div></article>`;
  }
  function stageHTML(){
    if(state.tab==='web')return `<div class="web-address">◎　参考资料 / 终端协作 · 离线示例网页</div>${!state.agentEnabled?'<div class="banner">智能体模块已关闭，网页保持打开。<button class="outline" data-action="enable-agent">启用智能体</button></div>':''}<article class="web-page"><span class="badge">参考资料</span><h2>让多个终端<br>一起完成一件事。</h2><p>这是原型内的离线网页示例。正式产品沿用网页标签、浏览器配置和收藏入口；网页不依赖 Space 或 Agent 运行。</p><h3>01　发现与定位</h3><p>找到明确的终端身份，再查看它的状态。相同目录可以拥有不同的工作空间。</p><h3>02　输入与等待</h3><p>提交文本到原生终端，等待可观察的状态变化。需要人工确认时回到原终端。</p><h3>03　读取与核对</h3><p>读取终端输出，或检查实际生成的文件。状态变化本身不代表任务成功。</p><button class="outline mt" data-action="agent">返回智能体</button></article>`;
    if(!state.agentEnabled)return `<div class="empty"><h2>智能体已停用</h2><p>会话记录已保留。参考资料网页仍可继续使用。</p><button class="primary" data-action="enable-agent">启用智能体</button><button data-action="web">打开参考资料</button></div>`;
    if(!state.spaces.length)return `<div class="empty"><h2>从一个空间开始</h2><p>空间组织终端与 Agent。选择工作目录后，再创建需要的终端。</p><button class="primary" data-action="create-space">新建空间</button><button data-action="web">先打开参考资料</button></div>`;
    if(state.scenario==='loading')return `<div class="empty"><h2>正在连接终端…</h2><p>已有会话记录保留，暂时不可提交输入。</p><button class="outline" data-action="reconnect">重新检查连接</button></div>`;
    const inSpace=state.sessions.filter(s=>s.space===state.current&&s.visible);
    if(!inSpace.length)return `<div class="empty"><h2>${state.sessions.some(s=>s.space===state.current)?'面板已关闭，会话仍在后台':'这个空间还没有终端'}</h2><p>从会话列表再次显示已有终端，或创建一个 Agent / Shell。</p><button class="primary" data-action="new-terminal">新建终端</button><button class="outline" data-action="spaces">显示会话列表</button></div>`;
    let chosen=[getSession(state.focus),getSession(state.partner),...inSpace].filter((s,i,a)=>s&&s.visible&&s.space===state.current&&a.findIndex(x=>x?.id===s.id)===i).slice(0,state.split?2:1);
    return `${state.restored?'<div class="banner">已恢复布局；上次运行已结束。<button class="outline" data-action="resume-session" data-id="'+state.focus+'">明确继续</button></div>':''}<div class="terminal-grid ${chosen.length<2?'single':''} ${state.vertical?'vertical':''}" style="--split:${state.ratio/(100-state.ratio)}fr">${chosen.map((s,i)=>(i?`<div class="split-handle"><input type="range" min="25" max="75" value="${state.ratio}" aria-label="调整分屏比例" id="split-ratio"></div>`:'')+terminalHTML(s)).join('')}</div>`;
  }
  function controlHTML(){
    const t=getTarget(); const options=state.sessions.filter(s=>state.scope==='vault'||s.space===state.current);
    if(!t)return `<div class="empty"><h2>没有可控制的终端</h2><button class="outline" data-action="new-terminal">新建终端</button></div>`;
    const sp=state.spaces.find(s=>s.id===t.space);
    const blocked=!state.agentEnabled||['blocked','stopped','unknown'].includes(t.status);
    return `<div class="control-layout"><section class="tool-section"><h2 class="tool-title">目标终端</h2><label for="target-scope">查找范围</label><select id="target-scope"><option value="space" ${state.scope==='space'?'selected':''}>当前空间</option><option value="vault" ${state.scope==='vault'?'selected':''}>本 Vault 的所有空间</option></select><label class="mt" for="target-session">明确选择目标</label><select id="target-session">${options.map(s=>`<option value="${s.id}" ${s.id===t.id?'selected':''}>${esc(s.name)} · ${s.provider}</option>`).join('')}</select><div class="target-meta">${esc(sp?.name||'未知空间')} · <code>${esc(t.id)}</code><br>${esc(sp?.cwd||'')}<br>${badge(t)} ${t.space!==state.current?'<span class="badge accent">跨 Space · 同 Vault</span>':''}</div><div class="row mt wrap"><button class="outline" data-action="locate">定位面板</button><button class="outline" data-action="attach-target">分屏显示</button></div><div class="mt callout">控制目标由会话身份确定，切换面板不会改变发送目标。</div></section>
    <section class="tool-section"><div class="row tool-title"><h2>发送到原生终端</h2></div><label for="prompt">输入内容</label><textarea id="prompt" placeholder="例如：检查关闭面板后会话是否仍可恢复。" ${blocked?'disabled':''}>${esc(state.promptDraft||'请检查终端输入仲裁，并把结论写入审阅记录。')}</textarea><p class="target-meta">来源：${esc(getSession(state.focus)?.name||'用户')} · 提交文本与 Enter</p>${t.status==='blocked'?'<div class="callout warning mt">目标正在等待人工确认。普通协作输入暂停。<button data-action="locate">回到原终端处理</button></div>':''}
    <div class="row wrap mt"><button class="primary" data-action="send-wait" ${blocked?'disabled':''}>发送并等待</button><button class="outline" data-action="send-only" ${blocked?'disabled':''}>只发送</button></div>
    ${state.feedback?`<div class="feedback" role="status"><strong>${esc(state.feedback.title)}</strong><br>${esc(state.feedback.body)}${state.feedback.kind==='waiting'?'<br><button class="outline mt" data-action="cancel-wait">取消等待</button>':''}${state.feedback.kind==='timeout'?'<br><button class="outline mt" data-action="retry-wait">再次等待状态</button>':''}</div>`:''}
    <div class="row wrap mt"><button class="outline" data-action="read-screen" ${t.status==='stopped'?'disabled':''}>读取屏幕</button><button class="danger" data-action="stop" ${t.status==='stopped'?'disabled':''}>停止运行</button></div>
    ${state.screen?`<pre class="screen-preview">会话 ${esc(t.id)} · 当前屏幕快照\n${esc(t.log.at(-1)?.text||'关闭视图后保留运行；停止操作单独核实。')}\n[有界快照 · 不代表完整对话]</pre>`:''}
    <p class="target-meta mt">输入已提交或状态为空闲，都不代表任务已完成。请读取输出或核对实际产物。</p></section></div>`;
  }
  function inboxHTML(){
    const mine=state.messages.filter(m=>m.target===state.focus);
    return `<h2>会话邮箱</h2><p class="target-meta">${esc(getSession(state.focus)?.name||'当前会话')} · Agent 主动读取后确认收到</p><div class="callout mt">消息只进入邮箱，不启动新运行，也不自动输入原生终端。</div>
    ${mine.length?mine.map(m=>`<article class="mail-item"><div class="mail-heading">${esc(m.from)}<span class="badge">${m.ack?'已确认收到':m.read?'已读取':'未读'}</span></div>${m.read?`<p>${esc(m.body)}</p><button class="outline" data-action="ack" data-id="${m.id}" ${m.ack?'disabled':''}>确认收到</button>`:`<p>有一条待主动读取的消息</p><button class="outline" data-action="read-message" data-id="${m.id}">读取消息</button>`}</article>`).join(''):'<p class="muted mt">暂无消息</p>'}
    <section class="tool-section mt"><h3>发送被动通知</h3><p class="target-meta">收件人：${esc(getTarget()?.name||'未选择目标')}</p><label class="mt" for="mail-body">消息正文</label><textarea id="mail-body" placeholder="留一条通知，不打断对方的终端。"></textarea><button class="outline mt" data-action="send-message" ${!getTarget()?'disabled':''}>发送到邮箱</button></section>`;
  }
  const records=[{id:'history-01',title:'终端状态与恢复边界',provider:'Codex',origin:'本机 · 系统账号',time:'今天 10:24',missing:false},{id:'history-02',title:'面板关闭后继续代码审阅',provider:'Claude Code',origin:'本机 · 系统账号',time:'昨天 18:42',missing:false},{id:'history-03',title:'旧设备上的会话记录',provider:'Codex',origin:'来源设备不可用',time:'10 月 20 日',missing:true}];
  function historyHTML(){
    const r=records.find(r=>r.id===state.preview);
    if(r)return `<button class="outline" data-action="back-history">← 返回历史</button><h2 class="mt">${r.title}</h2><p class="target-meta">${r.provider} · ${r.origin}<br>归属：个人知识库 / 终端重构</p>${r.missing?'<div class="callout error mt">原生来源不可用。元数据和标注仍保留，当前不能预览原生正文或继续。可重新关联正确来源后重试。</div><button class="outline mt" data-action="retry-source">重新检查来源</button>':`<div class="screen-preview">只读预览 · 示例原生对话\n\n用户：关闭面板后如何恢复？\nAgent：从会话列表重新附加；进程无需重启。\n\n此处不会启动 Agent。</div><button class="primary mt" data-action="resume-history">继续原生会话</button>`}<label for="annotation" class="mt">HUHU 标注</label><textarea id="annotation">${esc(state.notes[r.id]??'保留视图与运行分离的结论。')}</textarea><button class="outline mt" data-action="save-note">保存标注</button>`;
    const found=records.filter(r=>r.title.includes(state.query));
    return `<div class="row"><h2 class="grow">当前 Vault 历史</h2><button data-action="reload-history" aria-label="刷新历史">↻</button></div><p class="target-meta">个人知识库 · ${records.length} 条示例记录</p><label class="mt" for="history-search">搜索标题或元数据</label><input id="history-search" value="${esc(state.query)}" placeholder="搜索本 Vault 的历史…"><div id="history-results">${state.history==='loading'?'<div class="empty"><p>正在读取原生来源…</p></div>':`${state.history==='partial'?'<div class="callout warning mt">1 个来源暂不可读。其他记录可继续浏览。<button data-action="reload-history">重试来源</button></div>':''}${found.length?found.map(r=>`<article class="history-item"><button data-action="preview" data-id="${r.id}">${r.title}</button><p>${r.provider} · ${r.time}</p><span class="badge">${r.missing?'来源不可用':'可预览'}</span></article>`).join(''):'<div class="empty"><h2>没有匹配的历史</h2><p>只查当前 Vault 的标题和元数据。</p><button class="outline" data-action="clear-search">清除搜索</button></div>'}`}</div>`;
  }
  function renderInspector(){
    const active=document.activeElement; const aid=active?.id; const start=active?.selectionStart; const end=active?.selectionEnd;
    $('#inspector-content').innerHTML=`<div class="tool-tabs" role="tablist" aria-label="终端工具"><button role="tab" data-action="control" aria-selected="${state.tool==='control'}" tabindex="${state.tool==='control'?0:-1}" id="tool-control">控制</button><button role="tab" data-action="inbox" aria-selected="${state.tool==='inbox'}" tabindex="${state.tool==='inbox'?0:-1}" id="tool-inbox">通知${state.messages.some(m=>m.target===state.focus&&!m.ack)?' · '+state.messages.filter(m=>m.target===state.focus&&!m.ack).length:''}</button><button role="tab" data-action="history" aria-selected="${state.tool==='history'}" tabindex="${state.tool==='history'?0:-1}" id="tool-history">历史</button><button class="close-tool" data-action="close-tool" aria-label="关闭工具面板">×</button></div><div class="tool-content" role="tabpanel" aria-labelledby="tool-${state.tool}">${state.tool==='control'?controlHTML():state.tool==='inbox'?inboxHTML():historyHTML()}</div>`;
    if(aid){const el=document.getElementById(aid);if(el){el.focus({preventScroll:true});if(typeof start==='number'&&el.setSelectionRange)el.setSelectionRange(start,end);}}
  }
  function render(){
    $('#sidebar').innerHTML=sidebarHTML(); if($('#sheet').open)$('#sheet-content').innerHTML=sidebarHTML();
    $('#current-space').textContent=currentSpace()?.name||'未创建空间';
    $('#tabs').innerHTML=`<button class="${state.tab==='terminals'?'selected':''}" data-action="agent">›_ 终端${state.agentEnabled?'':' · 已停用'}</button><button class="${state.tab==='web'?'selected':''}" data-action="web">◎ 参考资料 <span class="badge">网页</span></button><div class="spacer"></div>`;
    $('#stage').innerHTML=stageHTML();
    if($('#deck'))$('#deck').innerHTML=state.sessions.filter(s=>s.space===state.current).map(s=>`<div class="deck-row"><span class="truncate">${esc(s.name)}</span>${badge(s)}<span class="mono">${s.provider} · ${s.visible?'已显示':'后台'}</span><div class="spacer"></div><button data-action="session" data-id="${s.id}">打开终端</button><button data-action="target" data-id="${s.id}">控制</button></div>`).join('');
    renderInspector(); paintIcons();
  }
  function tool(which){ state.tool=which; const d=$('#inspector'); const small=matchMedia('(max-width:959px)').matches; if(!d.open){if(small)d.showModal();else d.show();}renderInspector(); }
  function showSession(id){ const s=getSession(id); if(!s)return;state.current=s.space;state.focus=id;s.visible=true;state.tab='terminals';if($('#sheet').open)$('#sheet').close();render(); }
  function selectTarget(id){state.target=id;state.feedback=null;state.screen=false;state.scope=getTarget()?.space===state.current?'space':'vault';render();tool('control');}
  function send(wait){
    const t=getTarget(), prompt=$('#prompt')?.value.trim();if(!t||!prompt)return notify('先输入要提交的内容。');
    if(['blocked','stopped','unknown'].includes(t.status)||!state.agentEnabled)return notify('目标当前不可提交普通协作输入。');
    state.promptDraft=prompt;const alreadyWorking=t.status==='working';t.log.push({kind:'input',text:prompt});t.status='working';state.feedback={kind:wait?'waiting':'sent',title:'输入已提交',body:wait?'正在等待目标状态变化；这不是逐任务结果。':'仅提交输入，不自动等待或判定结果。'};render();const op=++operation;clearTimeout(timer);
    timer=setTimeout(()=>{if(op!==operation)return;if(state.scenario==='timeout'){if(wait&&state.target===t.id){state.feedback={kind:'timeout',title:'等待超时 · 目标仍在运行',body:'没有重发输入，也没有停止终端。可以再次等待或读取屏幕。'};render();}return;}t.status='idle';t.log.push({kind:'output',text:'审阅结论已写入示例审阅记录。请核对实际产物。'});if(wait&&state.target===t.id)state.feedback={kind:'matched',title:'观察到空闲',body:alreadyWorking?'发送时目标已经工作中。状态匹配不代表这条输入已完成，请核对输出。':'状态发生变化；请读取屏幕或检查产物，确认实际结果。'};render();},1800);
  }
  function createSpace(){openModal('新建空间',`<div class="stack"><p>空间只组织会话。创建后再启动需要的终端。</p><div><label for="space-name">空间名称</label><input id="space-name" required placeholder="例如：终端重构"></div><div><label for="space-directory">工作目录</label><select id="space-directory"><option value="vault">当前 Vault 目录</option><option value="external">选择库外本机目录（演示）</option></select></div><label class="row"><input type="checkbox" id="external-allow" style="width:auto">明确允许使用所选库外目录</label><p class="small">演示目录为 workspace-docs。正式界面使用本机目录选择器，不以手填路径代替授权。</p></div>`,`<button class="outline" data-action="close-dialog" data-dialog="modal">取消</button><button class="primary" data-action="confirm-space">创建空间</button>`);}
  function newTerminal(){if(!state.agentEnabled)return notify('请先启用智能体模块。');if(!state.spaces.length)return createSpace();openModal('新建终端',`<div class="stack"><p>创建到「${esc(currentSpace().name)}」，打开原生终端。</p><div><label for="new-provider">终端类型</label><select id="new-provider">${['Shell','Codex','Claude Code','Gemini CLI','OpenCode','Pi','Grok'].map(x=>`<option>${x}</option>`).join('')}</select></div><div><label for="new-name">会话名称</label><input id="new-name" placeholder="例如：验证测试"></div><label class="row"><input type="checkbox" id="background-start" style="width:auto">在后台启动，不切换当前面板</label></div>`,`<button class="outline" data-action="close-dialog" data-dialog="modal">取消</button><button class="primary" data-action="confirm-terminal">创建终端</button>`);}
  function palette(){openModal('命令与会话',`<label for="palette-search">查找当前 Vault 的会话或操作</label><input id="palette-search" placeholder="输入名称…"><div class="palette-list" id="palette-results">${paletteItems('')}</div>`);$('#palette-search').focus();}
  function paletteItems(q){const items=state.sessions.filter(s=>(s.name+s.provider).includes(q)).map(s=>`<button data-action="session" data-id="${s.id}">${esc(s.name)}<small>${esc(state.spaces.find(sp=>sp.id===s.space)?.name||'')} · ${s.provider}</small></button>`);if(!q||'新建空间'.includes(q))items.push('<button data-action="create-space">＋ 新建空间<small>不启动进程</small></button>');if(!q||'本 Vault 历史'.includes(q))items.push('<button data-action="history">↶ 本 Vault 历史</button>');return items.join('')||'<p class="muted">没有匹配的会话或操作。</p>';}
  const scenarios={default:'默认双终端',empty:'空 Space',noSpaces:'无 Space',loading:'连接中',lost:'连接失联',approval:'原生权限审批',timeout:'等待超时',historyError:'历史来源失败',restore:'重启后恢复',long:'长名称与文案',disabled:'关闭 Agent，保留网页'};
  function scenario(name){clearTimeout(timer);operation++;state=initial();state.scenario=name; if(name==='empty'){state.current='space-empty';state.spaces.push({id:'space-empty',name:'新的工作空间',cwd:'当前 Vault',external:false});}if(name==='noSpaces'){state.spaces=[];state.sessions=[];state.current=null;}if(name==='lost')state.sessions.forEach(s=>s.status='unknown');if(name==='approval'){getSession('ses-review').status='blocked';getSession('ses-review').visible=true;state.focus='ses-review';state.split=true;}if(name==='historyError'){state.history='partial';state.tool='history';}if(name==='restore'){state.restored=true;state.sessions.forEach(s=>s.status='stopped');}if(name==='long'){state.spaces[0].name='终端协作与跨空间恢复验证——含很长的中文名称、English context and additional details';state.sessions[0].name='主控智能体：验证所有终端面板在复杂任务中仍可稳定恢复';state.promptDraft='请认真检查终端控制、原生权限审批与跨空间目标识别，在长中文名称以及 English mixed content 下核对可读性。'.repeat(4);}if(name==='disabled'){state.agentEnabled=false;state.sessions.forEach(s=>s.status='stopped');state.tab='web';}closeModal();render();if(['approval','timeout','historyError'].includes(name))tool(state.tool);else if(matchMedia('(max-width:959px)').matches||name==='disabled')$('#inspector').close();notify('已切换演示：'+scenarios[name]);}
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;
    if(a==='theme'){document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';return;}
    if(a==='close-dialog'){document.getElementById(b.dataset.dialog).close();return;}
    if(a==='scenarios'){openModal('状态演示',`<p>所有状态均为本页模拟，可随时重置。</p><div class="scenario-grid mt">${Object.entries(scenarios).map(([k,v])=>`<button data-action="scenario" data-id="${k}">${v}</button>`).join('')}</div>`);return;}
    if(a==='scenario'){scenario(id);return;}if(a==='reset'){scenario('default');return;}
    if(a==='spaces'){lastTrigger=b;$('#sheet-content').innerHTML=sidebarHTML();$('#sheet').showModal();return;}
    if(a==='create-space'){if($('#sheet').open)$('#sheet').close();createSpace();return;}
    if(a==='confirm-space'){const name=$('#space-name').value.trim();if(!name){$('#space-name').setCustomValidity('请输入空间名称');$('#space-name').reportValidity();return;}const ext=$('#space-directory').value==='external';if(ext&&!$('#external-allow').checked){$('#external-allow').setCustomValidity('请明确授权所选库外目录');$('#external-allow').reportValidity();return;}const sp={id:'space-new-'+(++state.newCounter),name,cwd:ext?'本机授权目录 / workspace-docs':'当前 Vault',external:ext};state.spaces.push(sp);state.current=sp.id;state.tab='terminals';closeModal();render();notify('空间已创建，尚未启动终端。');return;}
    if(a==='space'){state.current=id;state.focus=state.sessions.find(s=>s.space===id)?.id||null;state.target=state.focus;state.tab='terminals';state.scope='space';$('#sheet').close();render();return;}
    if(a==='session'){closeModal();showSession(id);return;}if(a==='target'){selectTarget(id);return;}
    if(a==='new-terminal'){newTerminal();return;}if(a==='confirm-terminal'){const provider=$('#new-provider').value,background=$('#background-start').checked;const s={id:'ses-new-'+(++state.newCounter),name:$('#new-name').value.trim()||provider,provider,space:state.current,status:'idle',visible:!background,log:[]};state.sessions.push(s);closeModal();if(!background)state.focus=s.id;render();notify(background?'已在后台创建终端，当前焦点保留。':'已打开新终端。');return;}
    if(a==='agent'){state.tab='terminals';render();return;}if(a==='web'){state.tab='web';$('#inspector').close();render();return;}
    if(a==='home'){openModal('HUHU 首页', '<p>本原型聚焦终端工作台。首页沿用当前项目，不在此原型中重新设计。</p>');return;}
    if(a==='palette'){palette();return;}
    if(['control','inbox','history'].includes(a)){closeModal();if(a==='history')state.preview=null;tool(a);return;}if(a==='close-tool'){$('#inspector').close();return;}
    if(a==='split'){const list=state.sessions.filter(s=>s.space===state.current);if(list.length<2){notify('需要两个会话才能分屏；可先新建终端。');return;}state.split=!state.split;if(state.split)list.slice(0,2).forEach(s=>s.visible=true);render();return;}
    if(a==='direction'){state.vertical=!state.vertical;render();return;}
    if(a==='focus'){state.focus=id;render();document.getElementById('input-'+id)?.focus();return;}
    if(a==='detach'){getSession(id).visible=false;state.focus=state.sessions.find(s=>s.space===state.current&&s.visible)?.id||null;render();notify('显示面板已关闭；终端仍保留，可从会话列表再次显示。');return;}
    if(a==='locate'||a==='attach-target'){const tid=state.target;if(!tid)return;if(a==='attach-target'&&getTarget().space===state.current&&state.focus!==tid){getTarget().visible=true;state.partner=tid;state.split=true;state.tab='terminals';render();if(matchMedia('(max-width:959px)').matches)$('#inspector').close();notify('目标已分屏显示，当前焦点保持不变。');return;}showSession(tid);if(matchMedia('(max-width:959px)').matches)$('#inspector').close();state.scope='space';render();document.getElementById('input-'+tid)?.focus();notify('已定位同一会话，未重新启动终端。');return;}
    if(a==='send-wait'||a==='send-only'){send(a==='send-wait');return;}
    if(a==='cancel-wait'){operation++;clearTimeout(timer);state.feedback={kind:'cancelled',title:'等待已取消',body:'目标仍在运行；没有停止或重发输入。'};render();return;}
    if(a==='retry-wait'){const retryTarget=getTarget();state.feedback={kind:'waiting',title:'继续等待状态',body:'没有重新发送提示词。'};render();timer=setTimeout(()=>{retryTarget.status='idle';if(state.target===retryTarget.id)state.feedback={kind:'matched',title:'观察到空闲',body:'请读取输出确认结果。'};render();},1000);return;}
    if(a==='read-screen'){state.screen=true;renderInspector();return;}
    if(a==='stop'){openModal('停止目标运行？',`<div class="stack"><p>将停止「${esc(getTarget().name)}」的当前进程。关闭显示面板可以保留运行。</p><div class="callout">目标：${esc(state.spaces.find(s=>s.id===getTarget().space)?.name)} / ${esc(getTarget().id)}<br>会话记录与历史仍然保留。</div></div>`,`<button class="outline" data-action="close-dialog" data-dialog="modal">取消</button><button class="outline danger" data-action="confirm-stop">停止运行</button>`);return;}
    if(a==='confirm-stop'){operation++;clearTimeout(timer);getTarget().status='stopped';state.feedback={kind:'stopped',title:'已核实运行结束（模拟）',body:'会话与历史保留。'};closeModal();render();return;}
    if(a==='human-approve'||a==='human-reject'){const s=getSession(id);s.status='idle';s.log.push({kind:'output',text:a==='human-approve'?'用户在原终端允许本次操作；继续当前会话。':'用户在原终端拒绝操作；原会话保留。'});render();notify(a==='human-approve'?'人工确认已提交给原终端。':'已拒绝本次操作。');return;}
    if(a==='read-message'){state.messages.find(m=>m.id===id).read=true;renderInspector();return;}if(a==='ack'){state.messages.find(m=>m.id===id).ack=true;render();return;}
    if(a==='send-message'){const body=$('#mail-body').value.trim();if(!body)return notify('请输入消息正文。');state.messages.push({id:'msg-'+Date.now(),from:getSession(state.focus)?.name||'用户',target:state.target,body,read:false,ack:false});render();notify('消息已进入目标邮箱，没有启动运行。');return;}
    if(a==='preview'){state.preview=id;renderInspector();return;}if(a==='back-history'){state.preview=null;renderInspector();return;}
    if(a==='reload-history'){state.history='loading';renderInspector();setTimeout(()=>{state.history='default';renderInspector();},900);return;}
    if(a==='clear-search'){state.query='';renderInspector();return;}
    if(a==='retry-source'){notify('来源仍不可用；已保留元数据与标注。');return;}
    if(a==='save-note'){state.notes[state.preview]=$('#annotation').value;notify('标注已保存在本页演示状态。');return;}
    if(a==='resume-history'){const r=records.find(r=>r.id===state.preview);openModal('继续原生会话',`<div class="stack"><p>继续「${r.title}」将显式启动原生 Agent；只读预览不会启动。</p><div class="callout">${r.provider} · 系统账号<br>当前 Vault / 终端重构<br>工作目录：项目 / obsidian-huhu</div><p>如果该原生会话已有受管运行，将定位已有终端。</p></div>`,`<button class="outline" data-action="close-dialog" data-dialog="modal">取消</button><button class="primary" data-action="confirm-resume-history">继续会话</button>`);return;}
    if(a==='confirm-resume-history'){const record=records.find(r=>r.id===state.preview),historySessionId='ses-'+record.id;closeModal();let s=getSession(historySessionId);if(s){showSession(s.id);notify('已定位现有受管运行，没有重复启动。');}else{s={id:historySessionId,name:'历史 · '+record.title,provider:record.provider,space:'space-terminal',status:'idle',visible:true,log:[]};state.sessions.push(s);showSession(s.id);notify('已从明确的原生来源继续（模拟）。');}return;}
    if(a==='resume-session'){getSession(id).status='idle';state.restored=false;showSession(id);notify('已显式启动新运行，没有重发历史输入。');return;}
    if(a==='reconnect'){state.scenario='default';state.sessions.forEach(s=>{if(s.status==='unknown')s.status='idle';});render();notify('已重新检查并连接（模拟）。');return;}
    if(a==='enable-agent'){state.agentEnabled=true;state.tab='terminals';render();return;}
    if(a==='settings'){openModal('终端设置与数据',`<div class="stack"><p>沿用 HUHU 现有账号、终端主题、字体与快捷键设置。本次增加控制与后台会话入口。</p><h3>数据与备份</h3><p>导出包含 HUHU 会话信息、标注、通知与来源引用。原生完整对话及系统登录凭证由各自来源管理；导出清单应说明未包含项。</p><p>已有业务数据沿用当前 Vault 的 HUHU 数据根，不为本次终端增强迁移已有账号。</p><h3>快捷键</h3><p>Ctrl / ⌘ K：命令面板<br>Alt 1：空间　Alt 2：终端焦点　Alt 3：控制<br>Escape：关闭当前弹层</p></div>`,`<button class="outline danger" data-action="disable-agent">停用智能体（演示）</button><button class="primary" data-action="close-dialog" data-dialog="modal">完成</button>`);return;}
    if(a==='disable-agent'){closeModal();scenario('disabled');return;}
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='target-scope'){state.scope=e.target.value;const opts=state.sessions.filter(s=>state.scope==='vault'||s.space===state.current);if(!opts.some(s=>s.id===state.target))state.target=opts[0]?.id;state.feedback=null;renderInspector();}
    if(e.target.id==='target-session'){state.target=e.target.value;state.feedback=null;state.screen=false;renderInspector();}
    if(e.target.id==='external-allow')e.target.setCustomValidity('');
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='space-name')e.target.setCustomValidity('');
    if(e.target.id==='prompt')state.promptDraft=e.target.value;
    if(e.target.id==='history-search'){state.query=e.target.value;renderInspector();}
    if(e.target.id==='palette-search')$('#palette-results').innerHTML=paletteItems(e.target.value);
    if(e.target.id==='split-ratio'){state.ratio=Number(e.target.value);$('.terminal-grid').style.setProperty('--split',state.ratio/(100-state.ratio)+'fr');}
  });
  document.addEventListener('submit',e=>{if(!e.target.matches('.terminal-input'))return;e.preventDefault();const s=getSession(e.target.dataset.session),input=e.target.querySelector('input');if(!input.value.trim())return;s.log.push({kind:'input',text:input.value.trim()});s.log.push({kind:'output',text:'输入已提交（演示），请核对原生输出。'});state.focus=s.id;render();document.getElementById('input-'+s.id)?.focus();});
  document.addEventListener('keydown',e=>{
    if(e.key==='Tab'){
      const modal=[...document.querySelectorAll('dialog[open]')].filter(d=>d.matches(':modal')).at(-1);
      if(modal){const controls=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(first&&(!modal.contains(document.activeElement)||(!e.shiftKey&&document.activeElement===last)||(e.shiftKey&&document.activeElement===first))){e.preventDefault();(e.shiftKey?last:first).focus();return;}}
    }

    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();palette();return;}
    if(e.altKey&&e.key==='1'){e.preventDefault();$('[data-action="spaces"]').click();}
    if(e.altKey&&e.key==='2'){e.preventDefault();document.getElementById('input-'+state.focus)?.focus();}
    if(e.altKey&&e.key==='3'){e.preventDefault();tool('control');$('#target-scope')?.focus();}
    if(e.target.getAttribute('role')==='tab'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const names=['control','inbox','history'],i=names.indexOf(state.tool);tool(names[(i+(e.key==='ArrowRight'?1:2))%3]);$('#tool-'+state.tool).focus();}
    if(e.key==='Escape'&&!$('#modal').open&&!$('#sheet').open&&$('#inspector').open){$('#inspector').close();$('[data-action="control"]').focus();}
  });
  ['modal','sheet'].forEach(id=>document.getElementById(id).addEventListener('close',()=>{if(lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});}));
  matchMedia('(max-width:959px)').addEventListener('change',()=>{$('#inspector').close();});
  render();if(variant==='a'&&innerWidth>=960)$('#inspector').show();
})();
```
<!-- /PROTOTYPE-FILE -->

## 验证与接续

浏览器逐项记录见 `evidence/browser.json` 与 `evidence/observations.json`，任务评估见 `evidence/design-review.md`，技术检查见 `evidence/technical-review.md`。命令与结果汇总见 `evidence/validation.md`。

真实浏览器检查只证明本页 fixture 的交互与布局。没有真实 PTY、Provider、原生审批、IPC、生产数据读写、宿主集成、性能或五平台产品证据。窄屏仅为桌面小窗口/重排验证。

用户已选择 A 并授权发布六条基线；DESIGN-0001 已经 A 网关发布，S 的设计引用已封板。T 的生产实施导航见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path>，UI 票逐一绑定原 DESIGN revision/digest/pages/acceptance；本轮没有重新选方案或改动获批原型运行源码。新增源码机制与已知问题引用在 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>，仅辅助实现，不替代视觉合同或产品运行验收。
