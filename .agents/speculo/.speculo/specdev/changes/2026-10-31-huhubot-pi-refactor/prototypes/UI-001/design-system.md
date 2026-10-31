---
schema_version: 3
artifact: ui-prototype
change: 2026-10-31-huhubot-pi-refactor
design_id: UI-001
status: blocked
project_kind: existing
platforms:
- desktop
candidates:
- id: candidate-a
  template_id: '03'
  primary_reference: HUHU-UI-001
  auxiliaries:
  - reference_id: DESIGN-0002
    dimension: 统一token、密度、可访问性与宿主壳
  rationale: 用户指定复刻既有UI-001；仅比较同一视觉体系下的交互结构
  structural_difference: 会话、建议与运行详情并置；建议后审批
  task_id: weekly-plan-review
  entry: comparison/variants/candidate-a.html
- id: candidate-b
  template_id: '03'
  primary_reference: HUHU-UI-001
  auxiliaries:
  - reference_id: DESIGN-0002
    dimension: 统一token、密度、可访问性与宿主壳
  rationale: 用户指定复刻既有UI-001；仅比较同一视觉体系下的交互结构
  structural_difference: 同内容但详情默认收起，点击打开
  task_id: weekly-plan-review
  entry: comparison/variants/candidate-b.html
- id: candidate-c
  template_id: '03'
  primary_reference: HUHU-UI-001
  auxiliaries:
  - reference_id: DESIGN-0002
    dimension: 统一token、密度、可访问性与宿主壳
  rationale: 用户指定复刻既有UI-001；仅比较同一视觉体系下的交互结构
  structural_difference: 同内容但待审批变更先于解释
  task_id: weekly-plan-review
  entry: comparison/variants/candidate-c.html
candidate_count_override: null
selected_candidate: null
sources:
- id: HUHU-UI-001
  locator: .agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001
  revision: 974105b47e03c108df0f5e0c3fc9606fe4b79aee
- id: DESIGN-0002
  locator: .agents/speculo/.speculo/specdev/design/DESIGN.md
  revision: DESIGN-0002
  digest: ef5e5080f6c1a8f967397af72fca0050820b9ad4d9a4f57451be3a63ab55b2b1
- id: STYLE-INDEX
  locator: .agents/speculo/workflows/specdev/specdev-p-prototype/design-library/style-index.md
  revision: 974105b47e03c108df0f5e0c3fc9606fe4b79aee
prototype_files:
- comparison/index.html
- comparison/variants/candidate-a.html
- comparison/variants/candidate-b.html
- comparison/variants/candidate-c.html
- final/app.js
- final/index.html
- final/styles.css
browser_evidence: evidence/browser-results.json
updated_at: '2026-10-31T12:35:39.569838+00:00'
---

# UI Prototype UI-001：虎虎 BOT

本文件仅拥有项目检测、候选、原型源码与验证证据。规则唯一在 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/DESIGN.md</Path>。status=blocked 是正式原型检查工具闭包/设计摘要与用户批准尚缺，不代表HTML不可运行；不能标ready。

## Project Evidence

目标为Obsidian桌面工作台中的huhubot。用户任务：带来源安排周计划、预览差异并单次审批、追踪协作、确认与忘记记忆。输入：鼠标/键盘/中文IME；窄pane与触控尺寸仅为可访问性预览，不改变Bot desktop-only产品边界。

Evidence mode：既有项目source-only核对 + 本次原型真实headless Chromium渲染。未运行既有UI-001完整页面，不能宣称逐像素比对。已有框架/风格证据：package.json、.agents/skills/ui/SKILL.md、永久DESIGN-0002、旧change DESIGN与UI-001 design-system/styles.css。置信边界见reuse-map。

| 动作 | 内容 | 原因 |
|---|---|---|
| Keep | 已有A方向、统一圆角/间距/主题/壳、显式主操作 | 用户明确指定复刻，不重新创造产品风格 |
| Adjust | Bot会话/运行/审批内容与详情显隐 | Issue #39的新产品行为 |
| Replace | 旧Runner/HAP安装与旧UI文案 | 未来产品不保留旧运行链路；本PR尚未改生产 |
| Add | 未知效果、审批失效、记忆忘记、三图、恢复解释 | 让状态与风险可见，不用聊天文本充当回执 |

## Candidate Composition

读取设计库style-index后，任务骨架对照03（个人助手会话/上下文），仅采用职责分工，不采用其品牌常量；精确视觉由用户指定的本项目UI-001/ DESIGN-0002覆盖。没有复制设计库示例代码或字体。三个候选遵循P默认数量，均为同一任务与同一视觉体系：A详情并置、B按需详情、C审批优先。推荐A，其他候选未被用户拒绝；selected_candidate=null表示仍待实际选择，不把推荐作为批准。

## Approval Package

本change DESIGN revision1与推荐final一起提交评审。首次基线发布不适用，本次不提升永久基线。用户确认来源：尚无。正式designDigest/prototype digest：原生算法未运行；evidence/source-manifest.json保存可复现本地源码集合hash，仅作完整性校验。正式通过check-preview及内容绑定后再登记批准；不能借用旧change的approved记录。

## Validation and Handoff

| 检查 | 结果 | 边界 |
|---|---|---|
| node --check final/app.js | 实际通过 | 原型语法，不是生产构建 |
| Playwright 浏览器 | 98项通过 | 9页面×2主题×4宽度+26个行为/资源检查；实际结果文件为准 |
| 候选结构与窄屏 | 6项通过 | 三候选×1440/420，非独立人工设计批准 |
| HTML/CSS/JS具名代码块一致 | verify-docs.py检查 | 本地辅助检查，不伪称原生materializer已运行 |
| materialize-prototype --check / design --check-preview / --check-ready | NOT RUN | 完整项目工具闭包不可用，且未获用户确认 |
| SpecDev --stage prototype / 原工作流Gate | NOT RUN | 发布前在完整dev工作区运行 |
| 真实Obsidian / OS-IME / 读屏 / 四平台 | NOT RUN | 本次不实现生产；不能由此截图替代 |

浏览器通过Playwright set_content载入逐字相同HTML与本地CSS/JS内联结果，原因是容器管理员策略禁止file://导航。无外部网络请求。最终分文件HTML仍可普通离线打开；方便评审的单文件版由相同源生成。浏览器JSON是本次补充证据格式，**不是冒称符合尚未运行的原生prototype-browser-evidence gate**。

实际结果与截图：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/prototypes/UI-001/evidence/browser-results.json</Path>、<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/prototypes/UI-001/evidence/candidate-results.json</Path>。初次检查的3个失败保存在browser-results-initial.json；关闭Dialog残留按钮与reduced-motion优先级已修复，重跑通过。真实IME只有合成组字事件证据，不声称操作系统输入法全测。

Comparison：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/prototypes/UI-001/comparison/index.html</Path>。推荐final：<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/prototypes/UI-001/final/index.html</Path>。下一Work：用户设计评审 / P正式验证；实现仍未授权。

## Prototype Sources

以下具名源码与物化文件逐字一致，不将本演示脚本移入生产架构。

<!-- PROTOTYPE-FILE: comparison/index.html -->
```html
<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UI-001 · 同一设计基线下的交互对照</title><link rel="stylesheet" href="../final/styles.css"></head><body class="huhu-ui"><main class="page"><div class="page-intro"><div><h1>虎虎 BOT · 同一视觉体系，三种交互侧重</h1><p>均继承 DESIGN-0002 / 既有 UI-001 A 方向，不是三个新设计系统。任务与示例数据完全相同。</p></div><span class="status warning">待用户确认</span></div><div class="stack"><section class="surface"><h2>A · 上下文与运行详情并置 · 推荐</h2><p>默认会话导航 / 聊天 / 可收起详情。审批在建议之后；适合持续跟进工作。</p><p><a class="btn outline" href="variants/candidate-a.html">打开 A</a></p></section><section class="surface"><h2>B · 专注聊天，详情按需打开</h2><p>同样的来源、计划和审批，右侧详情默认收起。主内容更宽，查看运行信息多一次操作。</p><p><a class="btn outline" href="variants/candidate-b.html">打开 B</a></p></section><section class="surface"><h2>C · 待审批变更优先</h2><p>聊天中的审批预览先于建议解释出现。处理审批较快，但需要特别防止在未读解释时批准。</p><p><a class="btn outline" href="variants/candidate-c.html">打开 C</a></p></section></div><div class="section"><h2>推荐稿与确认边界</h2><p>推荐 A。三者使用同一圆角、间距、主题和组件语言，未引用旧 change 的批准作为本次批准。</p><p><a class="btn primary" href="../final/index.html">打开推荐 final</a></p><p class="footer-note">所有操作使用虚构数据，不访问真实 Vault、模型或网站。确认本原型只确认设计，不授权生产实现或修改永久基线。</p></div></main></body></html>
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: comparison/variants/candidate-a.html -->
```html
<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>A · 上下文与运行详情并置（推荐）</title>
<link rel="stylesheet" href="../../final/styles.css">
</head>
<body class="huhu-ui" data-candidate="candidate-a">
<a class="skip" href="#main">跳到主要内容</a>
<div class="preview-bar" aria-label="原型预览控制">
 <span><strong>HUHU · A</strong><span class="preview-label">交互原型 · 示例数据 · 不操作真实 Vault</span></span>
 <div class="inline"><label class="sr-only" for="scenario">模拟运行状态</label><select id="scenario" class="input scenario"><option value="waiting_approval" selected>等待审批</option><option value="loading" >加载历史</option><option value="queued" >已排队</option><option value="running" >正在处理</option><option value="retrying" >重试中</option><option value="waiting_user" >等待回答</option><option value="waiting_children" >等待子任务</option><option value="read_only" >只读模式</option><option value="interrupted" >已中断</option><option value="failed" >失败保留输入</option><option value="cancelled" >已停止</option><option value="unknown_effect" >效果未知</option></select><button class="btn small" id="theme" aria-label="切换深色主题">深色</button><button class="btn small" id="touch" aria-pressed="false">触控尺寸</button><button class="btn small" id="reset">重置演示</button></div>
</div>
<div id="announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
<div id="workspace" class="workspace">
 <div class="shell">
  <nav class="rail" aria-label="工作台功能">
   <span class="brand" aria-label="HUHU 工作台">H</span>
   <button class="rail-button active" data-page="chat" aria-label="虎虎 BOT 会话" title="会话"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9H13a8.5 8.5 0 0 1 8 8v.5Z"/></svg></button>
   <button class="rail-button" data-page="runs" aria-label="运行与协作" title="运行与协作"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/></svg></button>
   <button class="rail-button" data-page="approvals" aria-label="审批中心" title="审批中心"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg></button>
   <button class="rail-button" data-page="memory" aria-label="长期记忆" title="长期记忆"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v16M12 5C9 2 3 3 3 3v16s6-1 9 2c3-3 9-2 9-2V3s-6-1-9 2Z"/></svg></button>
   <button class="rail-button" data-page="browser" aria-label="浏览器共作" title="浏览器共作"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg></button>
   <button class="rail-button" data-page="automation" aria-label="自动化交付" title="自动化交付"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></button>
   <div class="rail-bottom"><button class="rail-button" data-page="bots" aria-label="管理 Bot" title="管理 Bot"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-3-5"/></svg></button><button class="rail-button" data-page="settings" aria-label="Bot 设置" title="设置"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><circle cx="12" cy="12" r="5"/></svg></button><button class="rail-button" data-page="data" aria-label="数据与恢复" title="数据与恢复"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></svg></button></div>
  </nav>
  <aside class="sidebar" aria-label="Bot 与会话导航">
   <div class="sidebar-top"><button class="profile-switch" data-page="bots"><span class="avatar">虎</span><span><strong>虎虎 BOT</strong><small>个人工作空间</small></span><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9 4 4 4-4"/></svg></button><button class="btn outline full" id="new-chat"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg> 新建会话</button><label class="search-label"><span class="sr-only">搜索会话</span><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="search" placeholder="搜索会话" autocomplete="off"></label></div>
   <div class="sidebar-label">今天 <span>2</span></div>
   <button class="conversation selected" data-conversation="weekly"><span>整理下周的行动计划</span><small>等待确认 · 3 个来源</small></button>
   <button class="conversation" data-conversation="research"><span>研究个人知识管理方案</span><small>协作中 · 2 个子任务</small></button>
   <div class="sidebar-label">工作空间</div>
   <button class="side-link" data-page="runs"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/></svg> 运行与协作 <span class="count">2</span></button>
   <button class="side-link" data-page="approvals"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg> 待我审批 <span class="count" id="approval-count">1</span></button>
   <button class="side-link" data-page="memory"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v16M12 5C9 2 3 3 3 3v16s6-1 9 2c3-3 9-2 9-2V3s-6-1-9 2Z"/></svg> 长期记忆</button>
   <button class="side-link" data-page="browser"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg> 浏览器共作</button>
   <button class="side-link" data-page="automation"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> 自动化交付</button>
   <div class="sidebar-bottom"><p class="meta">页面关闭不会停止运行。</p><p class="meta">退出 Obsidian 后不继续执行。</p><div class="inline"><span class="status success">● 服务就绪</span><span class="meta">模拟</span></div></div>
  </aside>
  <div class="main-area">
   <header class="page-header"><div class="inline"><button class="btn icon nav-toggle" id="nav-toggle" aria-label="打开导航"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><span class="breadcrumb">虎虎 BOT</span><span class="separator">/</span><strong id="page-label">会话</strong></div><div class="inline"><span class="status neutral" id="top-status">等待审批</span><button class="btn icon" id="detail-toggle" aria-label="打开运行详情" title="运行详情"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg></button></div></header>
   <main id="main" tabindex="-1"></main>
  </div>
 </div>
</div>
<dialog id="dialog" aria-labelledby="dialog-title"><div class="dialog-top"><h2 id="dialog-title"></h2><button class="btn icon" id="dialog-close" aria-label="关闭对话框"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div id="dialog-body"></div><div id="dialog-actions" class="dialog-actions"></div></dialog>
<script src="../../final/app.js"></script>
</body></html>
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: comparison/variants/candidate-b.html -->
```html
<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>B · 专注聊天，按需打开详情</title>
<link rel="stylesheet" href="../../final/styles.css">
</head>
<body class="huhu-ui" data-candidate="candidate-b">
<a class="skip" href="#main">跳到主要内容</a>
<div class="preview-bar" aria-label="原型预览控制">
 <span><strong>HUHU · B</strong><span class="preview-label">交互原型 · 示例数据 · 不操作真实 Vault</span></span>
 <div class="inline"><label class="sr-only" for="scenario">模拟运行状态</label><select id="scenario" class="input scenario"><option value="waiting_approval" selected>等待审批</option><option value="loading" >加载历史</option><option value="queued" >已排队</option><option value="running" >正在处理</option><option value="retrying" >重试中</option><option value="waiting_user" >等待回答</option><option value="waiting_children" >等待子任务</option><option value="read_only" >只读模式</option><option value="interrupted" >已中断</option><option value="failed" >失败保留输入</option><option value="cancelled" >已停止</option><option value="unknown_effect" >效果未知</option></select><button class="btn small" id="theme" aria-label="切换深色主题">深色</button><button class="btn small" id="touch" aria-pressed="false">触控尺寸</button><button class="btn small" id="reset">重置演示</button></div>
</div>
<div id="announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
<div id="workspace" class="workspace">
 <div class="shell">
  <nav class="rail" aria-label="工作台功能">
   <span class="brand" aria-label="HUHU 工作台">H</span>
   <button class="rail-button active" data-page="chat" aria-label="虎虎 BOT 会话" title="会话"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9H13a8.5 8.5 0 0 1 8 8v.5Z"/></svg></button>
   <button class="rail-button" data-page="runs" aria-label="运行与协作" title="运行与协作"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/></svg></button>
   <button class="rail-button" data-page="approvals" aria-label="审批中心" title="审批中心"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg></button>
   <button class="rail-button" data-page="memory" aria-label="长期记忆" title="长期记忆"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v16M12 5C9 2 3 3 3 3v16s6-1 9 2c3-3 9-2 9-2V3s-6-1-9 2Z"/></svg></button>
   <button class="rail-button" data-page="browser" aria-label="浏览器共作" title="浏览器共作"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg></button>
   <button class="rail-button" data-page="automation" aria-label="自动化交付" title="自动化交付"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></button>
   <div class="rail-bottom"><button class="rail-button" data-page="bots" aria-label="管理 Bot" title="管理 Bot"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-3-5"/></svg></button><button class="rail-button" data-page="settings" aria-label="Bot 设置" title="设置"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><circle cx="12" cy="12" r="5"/></svg></button><button class="rail-button" data-page="data" aria-label="数据与恢复" title="数据与恢复"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></svg></button></div>
  </nav>
  <aside class="sidebar" aria-label="Bot 与会话导航">
   <div class="sidebar-top"><button class="profile-switch" data-page="bots"><span class="avatar">虎</span><span><strong>虎虎 BOT</strong><small>个人工作空间</small></span><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9 4 4 4-4"/></svg></button><button class="btn outline full" id="new-chat"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg> 新建会话</button><label class="search-label"><span class="sr-only">搜索会话</span><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="search" placeholder="搜索会话" autocomplete="off"></label></div>
   <div class="sidebar-label">今天 <span>2</span></div>
   <button class="conversation selected" data-conversation="weekly"><span>整理下周的行动计划</span><small>等待确认 · 3 个来源</small></button>
   <button class="conversation" data-conversation="research"><span>研究个人知识管理方案</span><small>协作中 · 2 个子任务</small></button>
   <div class="sidebar-label">工作空间</div>
   <button class="side-link" data-page="runs"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/></svg> 运行与协作 <span class="count">2</span></button>
   <button class="side-link" data-page="approvals"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg> 待我审批 <span class="count" id="approval-count">1</span></button>
   <button class="side-link" data-page="memory"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v16M12 5C9 2 3 3 3 3v16s6-1 9 2c3-3 9-2 9-2V3s-6-1-9 2Z"/></svg> 长期记忆</button>
   <button class="side-link" data-page="browser"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg> 浏览器共作</button>
   <button class="side-link" data-page="automation"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> 自动化交付</button>
   <div class="sidebar-bottom"><p class="meta">页面关闭不会停止运行。</p><p class="meta">退出 Obsidian 后不继续执行。</p><div class="inline"><span class="status success">● 服务就绪</span><span class="meta">模拟</span></div></div>
  </aside>
  <div class="main-area">
   <header class="page-header"><div class="inline"><button class="btn icon nav-toggle" id="nav-toggle" aria-label="打开导航"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><span class="breadcrumb">虎虎 BOT</span><span class="separator">/</span><strong id="page-label">会话</strong></div><div class="inline"><span class="status neutral" id="top-status">等待审批</span><button class="btn icon" id="detail-toggle" aria-label="打开运行详情" title="运行详情"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg></button></div></header>
   <main id="main" tabindex="-1"></main>
  </div>
 </div>
</div>
<dialog id="dialog" aria-labelledby="dialog-title"><div class="dialog-top"><h2 id="dialog-title"></h2><button class="btn icon" id="dialog-close" aria-label="关闭对话框"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div id="dialog-body"></div><div id="dialog-actions" class="dialog-actions"></div></dialog>
<script src="../../final/app.js"></script>
</body></html>
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: comparison/variants/candidate-c.html -->
```html
<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>C · 优先审阅待审批变更</title>
<link rel="stylesheet" href="../../final/styles.css">
</head>
<body class="huhu-ui" data-candidate="candidate-c">
<a class="skip" href="#main">跳到主要内容</a>
<div class="preview-bar" aria-label="原型预览控制">
 <span><strong>HUHU · C</strong><span class="preview-label">交互原型 · 示例数据 · 不操作真实 Vault</span></span>
 <div class="inline"><label class="sr-only" for="scenario">模拟运行状态</label><select id="scenario" class="input scenario"><option value="waiting_approval" selected>等待审批</option><option value="loading" >加载历史</option><option value="queued" >已排队</option><option value="running" >正在处理</option><option value="retrying" >重试中</option><option value="waiting_user" >等待回答</option><option value="waiting_children" >等待子任务</option><option value="read_only" >只读模式</option><option value="interrupted" >已中断</option><option value="failed" >失败保留输入</option><option value="cancelled" >已停止</option><option value="unknown_effect" >效果未知</option></select><button class="btn small" id="theme" aria-label="切换深色主题">深色</button><button class="btn small" id="touch" aria-pressed="false">触控尺寸</button><button class="btn small" id="reset">重置演示</button></div>
</div>
<div id="announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
<div id="workspace" class="workspace">
 <div class="shell">
  <nav class="rail" aria-label="工作台功能">
   <span class="brand" aria-label="HUHU 工作台">H</span>
   <button class="rail-button active" data-page="chat" aria-label="虎虎 BOT 会话" title="会话"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9H13a8.5 8.5 0 0 1 8 8v.5Z"/></svg></button>
   <button class="rail-button" data-page="runs" aria-label="运行与协作" title="运行与协作"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/></svg></button>
   <button class="rail-button" data-page="approvals" aria-label="审批中心" title="审批中心"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg></button>
   <button class="rail-button" data-page="memory" aria-label="长期记忆" title="长期记忆"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v16M12 5C9 2 3 3 3 3v16s6-1 9 2c3-3 9-2 9-2V3s-6-1-9 2Z"/></svg></button>
   <button class="rail-button" data-page="browser" aria-label="浏览器共作" title="浏览器共作"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg></button>
   <button class="rail-button" data-page="automation" aria-label="自动化交付" title="自动化交付"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></button>
   <div class="rail-bottom"><button class="rail-button" data-page="bots" aria-label="管理 Bot" title="管理 Bot"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-3-5"/></svg></button><button class="rail-button" data-page="settings" aria-label="Bot 设置" title="设置"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><circle cx="12" cy="12" r="5"/></svg></button><button class="rail-button" data-page="data" aria-label="数据与恢复" title="数据与恢复"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></svg></button></div>
  </nav>
  <aside class="sidebar" aria-label="Bot 与会话导航">
   <div class="sidebar-top"><button class="profile-switch" data-page="bots"><span class="avatar">虎</span><span><strong>虎虎 BOT</strong><small>个人工作空间</small></span><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9 4 4 4-4"/></svg></button><button class="btn outline full" id="new-chat"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg> 新建会话</button><label class="search-label"><span class="sr-only">搜索会话</span><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="search" placeholder="搜索会话" autocomplete="off"></label></div>
   <div class="sidebar-label">今天 <span>2</span></div>
   <button class="conversation selected" data-conversation="weekly"><span>整理下周的行动计划</span><small>等待确认 · 3 个来源</small></button>
   <button class="conversation" data-conversation="research"><span>研究个人知识管理方案</span><small>协作中 · 2 个子任务</small></button>
   <div class="sidebar-label">工作空间</div>
   <button class="side-link" data-page="runs"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/></svg> 运行与协作 <span class="count">2</span></button>
   <button class="side-link" data-page="approvals"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg> 待我审批 <span class="count" id="approval-count">1</span></button>
   <button class="side-link" data-page="memory"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v16M12 5C9 2 3 3 3 3v16s6-1 9 2c3-3 9-2 9-2V3s-6-1-9 2Z"/></svg> 长期记忆</button>
   <button class="side-link" data-page="browser"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg> 浏览器共作</button>
   <button class="side-link" data-page="automation"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> 自动化交付</button>
   <div class="sidebar-bottom"><p class="meta">页面关闭不会停止运行。</p><p class="meta">退出 Obsidian 后不继续执行。</p><div class="inline"><span class="status success">● 服务就绪</span><span class="meta">模拟</span></div></div>
  </aside>
  <div class="main-area">
   <header class="page-header"><div class="inline"><button class="btn icon nav-toggle" id="nav-toggle" aria-label="打开导航"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><span class="breadcrumb">虎虎 BOT</span><span class="separator">/</span><strong id="page-label">会话</strong></div><div class="inline"><span class="status neutral" id="top-status">等待审批</span><button class="btn icon" id="detail-toggle" aria-label="打开运行详情" title="运行详情"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg></button></div></header>
   <main id="main" tabindex="-1"></main>
  </div>
 </div>
</div>
<dialog id="dialog" aria-labelledby="dialog-title"><div class="dialog-top"><h2 id="dialog-title"></h2><button class="btn icon" id="dialog-close" aria-label="关闭对话框"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div id="dialog-body"></div><div id="dialog-actions" class="dialog-actions"></div></dialog>
<script src="../../final/app.js"></script>
</body></html>
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/app.js -->
```javascript
/* Offline interaction model only. No SDK, filesystem, network or production runtime.
 * Every apparent effect/receipt is fictional. User text is escaped before rendering. */
'use strict';
(() => {
 const $ = (s, root=document) => root.querySelector(s);
 const $$ = (s, root=document) => [...root.querySelectorAll(s)];
 const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const names={chat:'会话',runs:'运行与协作',approvals:'审批中心',memory:'长期记忆',bots:'Bot 管理',settings:'设置',browser:'浏览器共作',automation:'自动化交付',data:'数据与恢复'};
 const initial=()=>({page:'chat',approval:'pending',runView:'tree',memoryTab:'candidates',memConfirmed:false,memText:'你偏好在周日整理下一周计划',memRevision:1,memForgotten:false,learning:true,mcp:false,autoCount:0,sourceCount:3,branch:'weekly',draft:'',messages:[],questionAnswered:false,rootReviewed:false,cancelled:false,chatNew:false,diagnostic:'healthy',browserFilled:false,browserEffect:'none',modelConfigured:true,settingsSaved:false,feedback:'',runState:'waiting_approval',inspector:document.body.dataset.candidate!=='candidate-b'});
 let s=initial(),opener=null;
 const dialog=$('#dialog'),main=$('#main');
 const button=(text, action, kind='outline', attrs='')=>`<button type="button" class="btn ${kind}" data-action="${action}" ${attrs}>${text}</button>`;
 const badge=(text,kind='neutral')=>`<span class="status ${kind}">${text}</span>`;
 const intro=(title,desc,actions='')=>`<div class="page-intro"><div><h1>${title}</h1><p>${desc}</p></div>${actions}</div>`;
 const shell=body=>`<div class="page">${s.feedback?`<div class="callout info persistent-feedback" role="status">${escape(s.feedback)}</div>`:''}${body}</div>`;
 const actionRow=(title,desc,actions)=>`<li class="item-row"><div><h3>${title}</h3><p>${desc}</p></div><div class="actions">${actions}</div></li>`;
 const statusText=()=>({pending:'等待审批',approved:'模拟交付完成',rejected:'已拒绝 · 未执行',changed:'来源已变更',unknown:'效果待核对'}[s.approval]);
 const statusKind=()=>({pending:'warning',approved:'success',rejected:'neutral',changed:'warning',unknown:'error'}[s.approval]);
 function announce(text){$('#announcement').textContent='';requestAnimationFrame(()=>$('#announcement').textContent=text);}
 function feedback(text){s.feedback=text;render();announce(text);}
 function navigate(page){if(!(page in names))return;storeDraft();s.page=page;s.feedback='';location.hash=page;render();main.focus({preventScroll:true});}
 function storeDraft(){const input=$('#composer');if(input)s.draft=input.value;}
 function closeDialog(){if(dialog.open)dialog.close();}
 function openDialog(title,body,actions=[],className=''){
   opener=document.activeElement;$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=body;$('#dialog-actions').innerHTML=actions.join('');dialog.className=className;dialog.showModal();
 }
 dialog.addEventListener('close',()=>{if(dialog.open)return;$('#dialog-body').innerHTML='';$('#dialog-actions').innerHTML='';if(opener?.isConnected)opener.focus({preventScroll:true});else main.focus({preventScroll:true});});
 $('#dialog-close').addEventListener('click',closeDialog);
 function approvalSummary(){
  if(s.approval==='approved')return `<div class="callout success"><strong>模拟完成 · 生成文本与实际效果分开记录</strong><p>以下是演示回执，未创建真实文件或待办。</p><div class="receipt"><strong>周计划笔记 + 2 项 Todo</strong><p class="mono">effect-demo-01 · checked / committed</p>${button('查看模拟回执','receipt','small outline')}</div></div>`;
  if(s.approval==='unknown')return `<div class="callout error"><strong>结果未知，不能再次批准</strong><p>模拟：Host 调用后连接中断。不能证明未写入，也不能宣称成功。保留原 effect ID，先核对。</p><div class="actions">${button('核对效果','reconcile','outline')}${button('再次批准','approve','primary','disabled')}</div></div>`;
  if(s.approval==='rejected')return `<div class="callout info"><strong>你已拒绝此操作</strong><p>未执行写入，草稿与来源仍保留。修改需求后可重新生成独立预览。</p>${button('重新生成预览（模拟）','new-preview','small outline')}</div>`;
  if(s.approval==='changed')return `<div class="callout warning"><strong>来源版本变化，旧批准已失效</strong><p>「项目复盘」已从 revision 18 变为 19。请核对新差异；不会覆盖未保存编辑。</p>${button('重新预览差异','new-preview','small outline')}</div>`;
  return `<div class="approval-card"><div class="card-head"><h3>确认后再写入</h3>${badge('1 项审批','warning')}</div><dl class="kv"><dt>目标</dt><dd>周计划 / 2026-W45.md · 新建 2 项待办</dd><dt>接收方</dt><dd>当前授权模型 · 仅已选 3 个来源</dd><dt>影响</dt><dd>创建笔记与任务；不修改原笔记</dd></dl><div class="actions">${button('查看差异并审批','review-approval','primary')}${button('拒绝','reject','outline')}</div><p class="meta" style="margin-top:8px">本次一次有效。参数、来源或接收方变化后须重新审批。</p></div>`;
 }
 function inspector(){return `<aside class="inspector" aria-label="当前运行详情"><section><div class="card-head"><h2>运行详情</h2>${badge('模拟')}</div><dl class="kv"><dt>状态</dt><dd>${statusText()}</dd><dt>运行</dt><dd class="mono">run-demo-weekly</dd><dt>会话分支</dt><dd>主线 / 周计划</dd><dt>模型</dt><dd>已配置的默认模型</dd></dl>${button('查看完整执行树','open-runs','small outline')}</section><section><h3>本次计划</h3><ul class="tiny-list"><li><span>✓ 读取授权来源</span><span class="meta">完成</span></li><li><span>✓ 整理候选计划</span><span class="meta">完成</span></li><li><span>3. 写入笔记与任务</span><span class="meta">${s.approval==='approved'?'模拟完成':'待确认'}</span></li></ul></section><section><h3>根运行预算</h3><div class="inline"><strong>3,200</strong><span class="meta">/ 10,000 tokens · 示例</span></div><div class="progress-track" aria-label="示例 token 预算已用 32%"><div class="progress-fill"></div></div><p class="meta" style="margin-top:8px">涵盖子任务、重试、摘要与压缩。缺失 usage 显示未知，不计作零。</p></section><section><h3>来源与授权</h3><p class="subtle">仅本次选择的笔记和 Todo。没有整库、保险箱或 shell 权限。</p>${button('查看权限范围','source-scope','small')}</section></aside>`;}
 function chat(){
 const existing=`<div class="message user"><div class="message-header"><span class="avatar">我</span>你 <span class="meta">刚刚</span></div><div class="message-body">根据最近的项目复盘和待办，帮我整理下周的重点。先给我看计划，确认后再创建笔记和任务。<div class="sources"><button class="source-chip" data-action="source-scope">▤ 项目复盘.md</button><button class="source-chip" data-action="source-scope">▤ 本周记录.md</button><button class="source-chip" data-action="source-scope">✓ Todo · 6 项</button></div></div></div><div class="message"><div class="message-header"><span class="avatar">虎</span>虎虎 <span class="meta">只读整理完成 · 模拟</span></div><div class="message-body"><p>下周可以集中在两件事：完成浏览器公共接口的确认，以及整理个人 Agent 的交付标准。</p><ol class="plan-lines"><li><span class="step-num">1</span><div><strong>确认浏览器协作边界</strong><p class="subtle">核对 Space / Page 的授权、导航和提交回执。</p></div></li><li><span class="step-num">2</span><div><strong>整理验收样例</strong><p class="subtle">将周计划、研究协作与自动化结果逐项回链。</p></div></li></ol><p class="subtle">我准备了一篇周计划草稿和两项待办，尚未写入你的库。</p>${approvalSummary()}</div></div>`;
 let extra=s.messages.map(m=>`<div class="message user"><div class="message-header"><span class="avatar">我</span>你</div><div class="message-body">${escape(m.text)}</div></div><div class="callout info">已加入模拟 ${m.mode==='steer'?'steer 当前运行':'follow-up 队列'}。原型不会调用模型或执行工具。</div>`).join('');
 let banner='';
 if(['queued','running','retrying','waiting_user','waiting_children','read_only'].includes(s.runState))banner=`<div class="callout info"><strong>${({queued:'已排队',running:'正在处理',retrying:'重试中',waiting_user:'等待你的回答',waiting_children:'等待子任务',read_only:'只读模式'})[s.runState]}（模拟）</strong><p>状态不等于外部效果。重试保留原 lineage 与根预算；只读模式不允许发出新写入审批。</p></div>`;
 if(s.runState==='loading')banner='<div class="callout info" aria-busy="true"><strong>正在加载历史（模拟）</strong><div class="loading-bar"></div><div class="loading-bar"></div></div>';
 if(s.runState==='failed')banner='<div class="callout error"><strong>模型请求失败（模拟）</strong><p>保留输入和有效结果，未重复执行任何工具。可检查配置后创建新的 attempt。</p></div>';
 if(s.runState==='interrupted')banner='<div class="callout warning"><strong>上一次运行已中断</strong><p>先核对外部效果，再决定是否建立新 attempt；会话恢复不等于恢复旧调用栈。</p></div>';
 if(s.runState==='cancelled')banner='<div class="callout info"><strong>模拟运行已停止</strong><p>已确认的外部效果不会因停止而撤销；未知效果仍需核对。</p></div>';
 return `<div class="chat-layout ${s.inspector?'':'no-inspector'}"><div class="chat-column"><div class="chat-title"><h1>${s.chatNew?'新的会话':'整理下周的行动计划'}</h1><div class="inline"><span class="tag">个人助理</span><button class="btn small" data-action="open-branches">⑂ 主线 / 周计划</button><span class="meta">只共享明确选择的来源</span></div></div>${s.feedback?`<div class="callout info persistent-feedback" role="status">${escape(s.feedback)}</div>`:''}${banner}${s.chatNew?`<div class="empty"><h2>从一项具体的工作开始</h2><p class="subtle">先选择来源，再发送需求。新会话不会自动读取整库。</p></div>`:existing}${extra}<div class="composer-wrap"><form id="composer-form" class="composer"><label class="sr-only" for="composer">输入你的需求</label><textarea id="composer" placeholder="继续补充需求，或添加一份来源…">${escape(s.draft)}</textarea>${s.sourceCount>3?'<div class="sources"><span class="source-chip">▤ 新附加来源 · 尚未发送</span></div>':''}<div class="composer-toolbar"><div class="inline">${button('＋ 添加来源','attach-source','small')}${button('停止','stop','small',s.runState==='cancelled'?'disabled':'')}</div><div class="inline"><label class="sr-only" for="send-mode">发送方式</label><select id="send-mode" class="input" style="width:auto;min-height:32px;padding:4px 8px"><option value="followup">Follow-up</option><option value="steer">Steer 当前运行</option></select><button type="submit" class="btn primary" ${s.modelConfigured?'':'disabled'}>发送 ↑</button></div></div></form><div class="composer-hint">Enter 发送 · Shift + Enter 换行 · 输入法组字期间不发送</div></div></div>${s.inspector?inspector():''}</div>`;
 }
 function approvals(){return shell(intro('审批中心','每次批准只绑定这一份参数、来源版本、接收方与权限快照。',badge(statusText(),statusKind()))+approvalSummary()+`<section class="section"><h2>测试失败边界</h2><p class="subtle">以下按钮切换虚构情境，用于评审界面，不产生外部操作。</p><div class="actions" style="margin-top:12px">${button('模拟来源变更','change-source')}${button('模拟效果未知','unknown')}${button('重置为待审批','new-preview')}</div></section><section class="section"><h2>本次授权</h2><dl class="kv"><dt>主体</dt><dd>当前本机用户 → 虎虎</dd><dt>工具</dt><dd class="mono">notes.create@1 / task.create@1</dd><dt>数据范围</dt><dd>3 个显式来源；禁止读取保险箱</dd><dt>执行前</dt><dd>再次核对 lease、owner generation、资源 revision 与审批有效期</dd><dt>重复请求</dt><dd>只回读同一操作标识的结果，不重复写入</dd></dl></section>`);}
 function runButton(title,detail,state,action,kind='neutral',cls=''){return `<button class="run-row ${cls}" data-action="${action}"><span class="avatar">${title[0]}</span><span><strong>${title}</strong><small>${detail}</small></span>${badge(state,kind)}</button>`;}
 function runs(){
 const lead=runButton('Lead · 研究个人知识管理方案','run-research · attempt 1 · 独立根预算',s.cancelled?'已取消':s.rootReviewed?'已验收':'等待子任务','node-lead',s.rootReviewed?'success':'neutral','root-node');
 const a=runButton('资料研究员','临时 Agent · 只共享公开参考','结果已提交','node-a','success');
 const b=runButton('方案审查员','临时 Agent · 未继承父级私有记忆',s.cancelled?'已取消':s.questionAnswered?'结果已提交':'等待你的回答','node-b',s.questionAnswered?'success':'warning');
 let content='';
 if(s.runView==='tree')content=`<div aria-label="执行父子关系">${lead}<div class="run-child">${a}${b}</div></div><div class="callout info">执行树表达 Run/Attempt 与委派关系。子任务成功不代表根任务已经验收。</div>`;
 if(s.runView==='graph'||s.runView==='communication')content=`<div class="graph" aria-label="模拟执行图"><svg class="edges" viewBox="0 0 600 420" preserveAspectRatio="none" aria-hidden="true"><path d="M300 95V145H150V230M300 145H450V230"/>${s.runView==='communication'?'<path class="comm" d="M200 275Q300 370 400 275"/>':''}</svg>${lead}${a}${b}<p class="graph-note">实线：委派 ancestry。${s.runView==='communication'?'虚线：单独的通信覆盖层，不改写执行父子关系。':'节点打开真实产品中对应的 transcript、权限与产物详情。'}<br>原型采用固定示例排布；生产拟复用 React Flow + Dagre，不以此 HTML 实现布局引擎。</p></div>`;
 if(s.runView==='branches')content=`<div class="callout info"><strong>Pi 会话分支，不是执行树</strong><p>这里只展示同一 session 的 entry ancestry；选中分支的上下文不混入兄弟分支。</p></div><div class="history-line"><p>entry-01 · 用户提出周计划需求</p></div><div class="history-line"><p>entry-02 · 助理整理只读草稿</p></div><div class="branch-indent"><div class="history-line ${s.branch==='weekly'?'selected':''}"><p><strong>周计划分支</strong> · leaf-03</p>${button('选择周计划分支','branch-weekly','small')}</div><div class="history-line ${s.branch==='alternative'?'selected':''}"><p><strong>备选：只整理、不写入</strong> · leaf-04</p>${button('选择备选分支','branch-alternative','small')}</div></div><p class="footer-note">选中：${s.branch==='weekly'?'leaf-03':'leaf-04'}。没有修改任何 Pi 文件。</p>`;
 return shell(intro('运行与协作','一项工作、一次 attempt、消息投递与最终验收各有自己的状态。',`<div class="actions">${button('回答子任务','question','outline')}${button('取消运行树','cancel-tree','danger',s.cancelled?'disabled':'')}</div>`)+`<div class="tabs" role="tablist" aria-label="运行关系视图">${[['tree','执行树'],['graph','执行画布'],['branches','Pi 会话分支'],['communication','通信覆盖层']].map(([id,n])=>`<button role="tab" class="tab" data-run-view="${id}" aria-selected="${s.runView===id}">${n}</button>`).join('')}</div><div role="tabpanel" aria-label="${s.runView}">${content}</div><section class="section"><h2>结果与验收</h2><ul class="item-list">${actionRow('资料对照报告','artifact-demo-research · 3 个公开来源 · 已投递，不等于已验收',button('查看产物','artifact')+button('审查并验收','review-root','primary'))}</ul><p class="footer-note">候选限额：子执行并发 2 · 委派深度 2 · root 总 attempts 16。根等待时释放全局容量。</p></section>`);
 }
 function memory(){
 let rows='';
 if(s.memForgotten) rows='<div class="empty"><h2>这条事实已忘记</h2><p class="subtle">演示 tombstone 已保留：不会从尚存的会话自动重新学习。原始会话没有被删除。</p></div>';
 else if(s.memoryTab==='candidates'&&!s.memConfirmed)rows=`<ul class="item-list">${actionRow(escape(s.memText),'自动抽取的候选，不是已确认事实。来源：周计划会话 / entry-02；范围：当前 Bot。',button('查看来源','memory-source')+button('编辑','memory-edit')+button('确认事实','memory-confirm','primary')+button('忽略','memory-ignore'))}</ul>`;
 else if(s.memoryTab==='facts'&&s.memConfirmed)rows=`<ul class="item-list">${actionRow(escape(s.memText),`用户已确认 · revision ${s.memRevision} · 当前 Bot · 来源可追溯`,button('查看来源','memory-source')+button('编辑','memory-edit')+button('忘记','memory-forget','danger'))}</ul>`;
 else rows=`<div class="empty"><h2>${s.memoryTab==='candidates'?'没有待确认的候选':'还没有确认的长期事实'}</h2><p class="subtle">仅经确认的事实进入长期记忆。没有事实时也能继续聊天。</p></div>`;
 return shell(intro('长期记忆','让记忆有来源、有范围，也能被更正和忘记。',`<label class="permission-line"><input type="checkbox" class="switch" id="learning" ${s.learning?'checked':''}> 允许产生候选</label>`)+`<div class="tabs" role="tablist" aria-label="记忆类型"><button class="tab" role="tab" data-memory-tab="candidates" aria-selected="${s.memoryTab==='candidates'}">候选事实</button><button class="tab" role="tab" data-memory-tab="facts" aria-selected="${s.memoryTab==='facts'}">已确认事实</button></div>${s.learning?'':'<div class="callout info">学习已暂停；现有会话与已确认事实继续可读。</div>'}${rows}<section class="section"><h2>检索与隐私</h2><div class="grid-two"><div class="surface"><h3>事实 + 标签 + FTS5</h3><p class="subtle">第一版为本地可解释检索；向量是可选派生索引，不是会话存储。</p>${badge('索引健康 · 模拟','success')}</div><div class="surface"><h3>来源权限会重新检查</h3><p class="subtle">跨 Bot、会话与 provider 的共享需要授权。删除、来源撤销会清除相关检索投影。</p></div></div></section>`);
 }
 function bots(){return shell(intro('管理 Bot','持久身份和临时执行者分开管理；成员关系不等于授权。',button('新建 Bot','new-bot','primary'))+`<ul class="item-list">${actionRow('虎虎 · 个人助理','默认 Bot · 显式笔记/Todo 来源 · 事实候选需确认',badge('可用','success')+button('编辑配置','edit-bot')+button('开始会话','new-conversation'))}${actionRow('研究伙伴','仅公开资料 · 无笔记写入、保险箱和 shell 权限',button('编辑配置','edit-bot')+button('开始会话','new-conversation'))}</ul><section class="section"><h2>当前 Team</h2><div class="surface"><h3>个人知识管理研究</h3><p class="subtle">Lead：虎虎。临时执行者：资料研究员 / 方案审查员。独立 Pi session、缩减后的能力与根预算。</p><div class="actions" style="margin-top:12px">${button('查看协作','open-runs')}${button('查看共享范围','team-scope')}</div></div><p class="footer-note">临时 Agent 不会自动出现在永久 Bot 列表。@Bot 只表达路由意图，不授予额外权限。</p></section>`);}
 function settings(){return shell(intro('设置','本地配置与运行快照分离。更改在下一安全边界生效。')+`<nav class="settings-nav" aria-label="设置章节"><a href="#model-section">模型与凭据</a><a href="#skills-section">Skills</a><a href="#tools-section">工具</a><a href="#mcp-section">MCP</a><a href="#budget-section">预算</a></nav><section id="model-section"><h2>模型与凭据</h2><div class="surface" style="margin-top:12px"><div class="card-head"><h3>默认模型绑定</h3>${badge(s.modelConfigured?'已配置 · 示例':'未配置',s.modelConfigured?'success':'warning')}</div><dl class="kv"><dt>Provider</dt><dd>用户配置的服务商（示例，不固定推荐）</dd><dt>凭据引用</dt><dd class="mono">credential-ref-demo · 无真实密钥</dd><dt>Fallback</dt><dd>更换数据接收方时重新检查来源授权</dd></dl>${button('模拟配置 / 未配置','toggle-model')}${button('查看凭据边界','credential-info','small')}<p class="meta">原型不输入或保存密钥。生产必须使用受保护引用或非持久化降级。</p></div></section><section id="skills-section" class="section"><h2>Skills 与资源快照</h2><ul class="item-list">${actionRow('周计划 · 内置 Markdown Skill','已批准根 / resources/weekly · hash 固定 · 下一 attempt 更新',button('查看快照','skill-snapshot'))}${actionRow('第三方可执行 Extension','默认禁用。utilityProcess 不是恶意代码安全沙箱。',badge('禁用'))}</ul></section><section id="tools-section" class="section"><h2>工具权限</h2><ul class="item-list">${actionRow('笔记与 Todo','读取按来源范围；写入需要一次性审批和效果回执。',button('查看授权','source-scope'))}${actionRow('Shell / Powershell / 任意 CDP','默认关闭，不因设置 cwd 或隐藏 UI 就成为安全沙箱。',badge('未开放'))}${actionRow('保险箱秘密读取','不作为模型可检索内容。必要动作由 Host 代办。',badge('不可读取'))}</ul></section><section id="mcp-section" class="section"><h2>MCP</h2><div class="surface"><div class="switch-row"><div><h3>本地 MCP Server</h3><p class="subtle">外部客户端使用独立身份与 grant，不继承内部 Bot 权限。</p></div><button class="btn ${s.mcp?'outline':'primary'}" data-action="mcp-toggle">${s.mcp?'关闭 MCP 演示':'启用 MCP 演示'}</button></div><div class="inline" style="margin-top:12px">${badge(s.mcp?'已启用 · 纯模拟':'默认关闭',s.mcp?'warning':'neutral')}<span class="meta">没有监听端口，没有启动进程。</span></div><p class="meta">P0/T-20 冻结 SDK / protocolVersion / transport 组合，不能混用 v1/v2 规范。</p></div></section><section id="budget-section" class="section"><h2>根预算与资源限额</h2><div class="grid-two"><label class="field">Root token 上限（示例）<input class="input" type="number" min="1" value="10000" id="budget-tokens"></label><label class="field">子执行并发（候选）<input class="input" type="number" min="1" value="2" id="budget-concurrency"></label><label class="field">最大委派深度（候选）<input class="input" type="number" min="0" value="2" id="budget-depth"></label><label class="field">Root 总 attempts（候选）<input class="input" type="number" min="1" value="16" id="budget-attempts"></label></div><div class="callout info">usage 缺失显示 unknown，不记成零。费用上限依赖供应商计量，不能承诺普遍精确的货币硬上限。</div>${button('保存模拟设置','save-settings','primary')}</section>`);}
 function browser(){return shell(intro('浏览器共作','同一个 Space、同一个 Page：用户先登录，Bot 只使用获准的公共能力。',badge('依赖 #38 · 未接真实浏览器','warning'))+`<div class="callout info">以下是虚构的页面内容，不是 WebView。没有 Cookie、CDP、网络请求或影子 Chromium。</div><div class="mock-browser"><div class="browser-toolbar"><span class="tag">工作 Space</span><span class="address mono">example.invalid / team / weekly</span>${badge('Page demo-01')}</div><div class="browser-page"><h2>团队周报</h2><p class="subtle">你已在这个 Page 人工登录（模拟）。</p><label class="field">标题<input class="input" id="browser-title" value="${s.browserFilled?'下周重点与交付标准':''}" placeholder="等待受控填写"></label><label class="field">内容<textarea class="input" rows="4" id="browser-content" placeholder="先预览，再提交">${s.browserFilled?'确认浏览器公共接口；整理个人 Agent 验收样例。':''}</textarea></label><div class="actions">${button('模拟 Bot 填写','browser-fill')}${button('预览并批准提交','browser-submit','primary',s.browserFilled&&s.browserEffect!=='committed'?'':'disabled')}</div><p class="footer-note">导航、关闭页面、身份或权限变化后，旧提交批准失效。</p>${s.browserEffect==='committed'?'<div class="callout success">模拟提交回执：effect-demo-browser。未向任何网站发送数据。</div>':''}</div></div>`);}
 function automation(){return shell(intro('自动化交付','复用现有 Automations 调度；Bot 只提供 action 和结果回链。')+`<ul class="item-list">${actionRow('周日行动计划','每周日 20:00 · Asia/Taipei · 示例规则，不创建真实调度',button('模拟一次触发','auto-trigger','primary')+button('重投递同一 occurrence','auto-trigger'))}</ul><section class="section"><h2>交付记录</h2>${s.autoCount?`<div class="surface"><div class="card-head"><h3>一个逻辑工作</h3>${badge('已受理 · 模拟','info')}</div><dl class="kv"><dt>Occurrence</dt><dd class="mono">occ-demo-weekly-001</dd><dt>Run</dt><dd class="mono">run-demo-auto-001</dd><dt>投递次数</dt><dd>${s.autoCount}</dd><dt>逻辑工作数</dt><dd>1（重复投递回读同一受理回执）</dd><dt>通知</dt><dd>仅摘要与跳转，不泄露来源正文或秘密</dd></dl>${button('查看来源与回执','auto-receipt')}</div>`:'<div class="empty"><h2>暂无演示交付</h2><p class="subtle">触发一次后，重投递同一 occurrence 检查去重展示。</p></div>'}</section><div class="callout warning section"><strong>宿主关闭时不会后台执行</strong><p>错过触发后的跳过/补偿由现有自动化策略决定，不创建第二套 cron，也不宣称 24 小时云端常驻。</p></div>`);}
 function data(){return shell(intro('数据与恢复','会话、控制账本、审计与派生索引各有明确的 owner。',badge('诊断演示'))+`<div class="split-options"><label class="field" style="margin:0">故障夹具<select class="input" id="diagnostic"><option value="healthy" ${s.diagnostic==='healthy'?'selected':''}>正常</option><option value="index" ${s.diagnostic==='index'?'selected':''}>派生索引损坏</option><option value="state" ${s.diagnostic==='state'?'selected':''}>权威状态库不可用</option><option value="jsonl" ${s.diagnostic==='jsonl'?'selected':''}>Pi JSONL 尾部不完整</option></select></label>${button('生成诊断摘要（模拟）','diagnostic-report')}</div>${s.diagnostic==='state'?'<div class="callout error"><strong>已停止新增副作用</strong><p>审批、预算、幂等账本不可读，必须 fail-closed。禁止用空库或重建索引冒充恢复授权。</p></div>':s.diagnostic==='index'?`<div class="callout warning"><strong>索引不可用，会话仍可读取</strong><p>从保留的权威来源受控重建派生索引，不删除会话与控制状态。</p>${button('模拟重建索引','rebuild-index')}</div>`:s.diagnostic==='jsonl'?'<div class="callout warning"><strong>会话尾部不完整</strong><p>先隔离备份并通过所选 Pi SDK 支持的恢复方式检查，不静默裁剪中间记录。</p></div>':'<div class="callout success">本地 owner、会话与账本健康（模拟）。没有访问真实磁盘。</div>'}<ul class="item-list">${actionRow('sessions/ · Pi 原生 JSONL','唯一写入者为 Pi SessionManager；分支与 compaction 保持官方格式。',badge('不可删除重建'))}${actionRow('state.sqlite · 权威控制状态','审批、预算预留、幂等、效果回执、确认事实与事务 outbox。',badge('不可删除重建'))}${actionRow('run-events/ · HUHU 审计','使用自己的 schema/eventId，引用 Pi session/entry，不冒充 Pi 原生记录。',badge('控制真相在事务库'))}${actionRow('index.sqlite · 派生检索','索引可重建；不能由此推断丢失控制库也能安全恢复。',button('模拟重建','rebuild-index','outline',s.diagnostic==='state'?'disabled':''))}</ul><section class="section"><h2>备份与旧数据</h2><div class="actions">${button('查看一致性备份方案','backup')}${button('查看旧数据边界','old-data')}</div><p class="footer-note">旧 Bot 文件默认保持不动，不自动读取为新格式、不自动迁移、不自动清空。清理必须独立显式授权。</p></section>`);}
 function render(){
  const views={chat,approvals,runs,memory,bots,settings,browser,automation,data};
  main.innerHTML=views[s.page]();if(document.body.dataset.candidate==='candidate-c'&&s.page==='chat'){const card=$('.message:not(.user) .approval-card');if(card)card.parentElement.prepend(card);}$('#page-label').textContent=names[s.page];$('#approval-count').textContent=s.approval==='pending'?'1':'0';
  $('#top-status').textContent=s.page==='chat'||s.page==='approvals'?statusText():'本地工作空间';
  $('#top-status').className='status '+(s.page==='chat'||s.page==='approvals'?statusKind():'neutral');
  $$('.rail-button[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===s.page);if(b.dataset.page===s.page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $$('.tab[role=tab]').forEach(b=>b.tabIndex=b.getAttribute('aria-selected')==='true'?0:-1);
 }
 function approvalDialog(){
  if(s.runState==='read_only'){announce('只读模式下不可发起审批。');return;}
  if(s.approval!=='pending'){announce('当前审批不可重复提交。');return;}
  openDialog('核对差异 · 单次审批',`<div class="callout warning">只批准本次参数与来源版本。执行前仍须核对 lease、revision 与接收方。</div><dl class="kv"><dt>目标</dt><dd>周计划 / 2026-W45.md；新增 2 项 Todo</dd><dt>接收方</dt><dd>当前授权 Provider / 模型（示例）</dd><dt>来源版本</dt><dd>项目复盘 revision 18 · 本周记录 revision 7</dd><dt>审批绑定</dt><dd class="mono">attempt-demo-01 / params-hash-demo / grant-demo</dd><dt>有效期</dt><dd>本次 attempt 的 5 分钟演示窗口</dd></dl><pre class="diff"><span class="add">+ # 下周行动计划\n+ - 确认 Browser 公共接口\n+ - 整理个人 Agent 验收样例</span></pre><p class="meta">这只是交互演示，批准不会实际写入 Vault 或调用模型。</p>`,[button('拒绝','reject'),button('批准一次（模拟）','approve','primary')]);
 }
 const actions={
 'review-approval':approvalDialog,
 'approve':()=>{if(s.approval!=='pending')return;s.approval='approved';closeDialog();render();announce('已生成模拟效果回执，未创建真实文件。');},
 'reject':()=>{if(s.approval!=='pending')return;s.approval='rejected';closeDialog();render();announce('已拒绝，未执行写入。');},
 'new-preview':()=>{s.approval='pending';render();announce('已生成独立模拟预览，之前批准不可复用。');},
 'change-source':()=>{s.approval='changed';render();},'unknown':()=>{s.approval='unknown';render();},
 'reconcile':()=>openDialog('先核对，不自动重试','<p>演示查询：保留 effect-demo-01。需要由真正执行者核对目标资源与回执。当前仍未知；这个按钮不会伪造已确认结果。</p><p class="footer-note">生产恢复必须有宿主证据。没有证据时保持 unknown_effect，不能重新批准。</p>',[button('保持待核对','dialog-done','primary')]),
 'receipt':()=>openDialog('模拟效果回执','<div class="callout success">演示状态：committed。没有真实写入。</div><dl class="kv"><dt>笔记</dt><dd>artifact-note-demo · 周计划/2026-W45.md</dd><dt>Todo</dt><dd>task-demo-01 / task-demo-02</dd><dt>效果</dt><dd class="mono">effect-demo-01 / owner-generation-demo</dd><dt>重试行为</dt><dd>相同幂等键返回这份回执，不再次创建</dd></dl>',[button('知道了','dialog-done','primary')]),
 'source-scope':()=>openDialog('来源与接收方范围','<p>当前允许：项目复盘.md、本周记录.md、选定 6 项 Todo。没有整库、私人档案或保险箱授权。</p><dl class="kv"><dt>接收方</dt><dd>当前 Bot 绑定的 Provider 与模型</dd><dt>操作</dt><dd>读取/摘要；写入另行一次性审批</dd><dt>失效条件</dt><dd>来源变更、lease 撤销、provider 变化或审批到期</dd></dl>',[button('关闭','dialog-done','primary')]),
 'attach-source':()=>{storeDraft();s.sourceCount++;render();announce('已附加示例来源，尚未发送。');},
 'stop':()=>{storeDraft();s.runState='cancelled';render();announce('模拟已停止；已发生效果不撤销。');},
 'open-runs':()=>navigate('runs'),'open-branches':()=>{s.runView='branches';navigate('runs');},
 'branch-weekly':()=>{s.branch='weekly';render();},'branch-alternative':()=>{s.branch='alternative';render();},
 'node-lead':()=>openDialog('Lead · 运行详情','<dl class="kv"><dt>工作</dt><dd>研究个人知识管理方案</dd><dt>运行</dt><dd class="mono">run-research / attempt-1</dd><dt>等待</dt><dd>释放全局容量，保留本会话单写所有权</dd><dt>完成标准</dt><dd>两份子产物通过根审查，不由模型文本直接宣布成功</dd></dl>',[button('查看产物','artifact'),button('关闭','dialog-done','primary')]),
 'node-a':()=>openDialog('资料研究员 · 独立执行','<p>只共享公开参考。临时 Agent 不继承父级私有记忆、密钥或完整聊天。</p><dl class="kv"><dt>Pi session</dt><dd class="mono">pi-demo-research-a</dd><dt>Mailbox</dt><dd>结果 accepted / consumed；根尚未验收</dd><dt>产物</dt><dd>三项参考对照，附来源</dd></dl>',[button('查看产物','artifact'),button('关闭','dialog-done','primary')]),
 'node-b':()=>actions.question(),
 'question':()=>{closeDialog();openDialog('回答子任务的问题',`<div class="callout info">方案审查员询问：优先验证本地可解释检索，还是先引入向量检索？</div><label class="field">你的回答<textarea id="answer" class="input" rows="3">优先事实、标签与 FTS5；向量作为后续可选派生索引。</textarea></label><p class="meta">回答只投递到该子任务，不扩大其数据范围或工具权限。</p>`,[button('取消','dialog-done'),button('发送回答（模拟）','answer','primary')]);},
 'answer':()=>{const a=$('#answer').value.trim();if(!a){$('#answer').setAttribute('aria-invalid','true');$('#answer').focus();return;}s.questionAnswered=true;closeDialog();render();announce('模拟回答已消费，子任务返回演示结果。');},
 'cancel-tree':()=>openDialog('取消这一棵运行树？','<p>停止新 admission，向所有孩子和工具传播取消。已提交的不可逆效果不保证撤回；未确认终止的外部调用仍需核对。</p>',[button('保留运行','dialog-done'),button('确认模拟取消','confirm-cancel','danger')]),
 'confirm-cancel':()=>{s.cancelled=true;closeDialog();feedback('运行树已模拟取消。不可逆效果不会自动撤销。');},
 'artifact':()=>{closeDialog();openDialog('资料对照报告 · 模拟产物','<h3>交付摘要</h3><p>Pi 作为唯一 harness；Hana 借鉴薄门面和事实检索；协作采用独立 session 与受限共享。</p><div class="receipt"><p>来源：固定版本 Pi / Hana / OpenClaw；完整定位见文档 reuse-map.md。</p><p class="meta">此处是交互样例，不代表新 Agent 已执行研究。</p></div>',[button('关闭','dialog-done','primary')]);},
 'review-root':()=>{if(s.cancelled||!s.questionAnswered){openDialog('尚未满足根验收条件','<p>仍有子任务等待回答，或运行已取消。先完成子任务交付并核对未知效果，不能跳过根验收条件。</p>',[button('关闭','dialog-done','primary')]);return;}openDialog('审查根任务交付','<p>检查来源、交付标准、权限和未解决效果。子结果收到或子任务成功，都不自动证明根任务通过。</p><label class="permission-line"><input class="checkbox" type="checkbox" id="review-check"> 我已检查这份模拟产物</label>',[button('返回','dialog-done'),button('验收（模拟）','accept-root','primary')]);},
 'accept-root':()=>{if(!$('#review-check').checked){$('#review-check').focus();announce('请先勾选已检查模拟产物。');return;}s.rootReviewed=true;closeDialog();feedback('根任务模拟验收完成；未记录任何生产执行结果。');},
 'memory-source':()=>openDialog('事实来源','<dl class="kv"><dt>会话</dt><dd>整理下周的行动计划</dd><dt>Pi entry</dt><dd class="mono">session-demo / entry-02</dd><dt>状态</dt><dd>候选来自自动抽取；需人工确认</dd><dt>范围</dt><dd>当前 Bot，未共享给其他 Bot 或 provider</dd></dl>',[button('关闭','dialog-done','primary')]),
 'memory-confirm':()=>{s.memConfirmed=true;s.memoryTab='facts';feedback('事实已模拟确认；生产应事务写入权威库并更新派生索引。');},
 'memory-ignore':()=>{s.memForgotten=true;feedback('候选已忽略（模拟），不会直接成为用户事实。');},
 'memory-edit':()=>openDialog('编辑事实候选',`<label class="field">事实文本<textarea class="input" id="memory-text" rows="3">${escape(s.memText)}</textarea></label><p class="meta">仅更改演示内存；生产需来源和 revision 冲突检查，不能静默覆盖。</p>`,[button('取消','dialog-done'),button('确认修改预览','memory-preview','primary')]),
 'memory-preview':()=>{const val=$('#memory-text').value.trim();if(!val){$('#memory-text').focus();return;}s.memText=val;s.memRevision++;closeDialog();feedback('模拟事实已修改，仅在当前演示内存生效；没有写入磁盘。');},
 'memory-forget':()=>openDialog('忘记这条事实？','<p>清除事实的可检索内容、索引、向量与缓存，并保留阻止自动重新学习的 tombstone。原始会话不会因此被删除。</p>',[button('保留','dialog-done'),button('确认忘记（模拟）','forget-confirm','danger')]),
 'forget-confirm':()=>{s.memForgotten=true;closeDialog();feedback('这条事实已模拟忘记。保留会话不代表允许自动重新学习。');},
 'new-bot':()=>openDialog('新建 Bot · 配置预览','<label class="field">名称<input class="input" value="个人研究助理" maxlength="60"></label><label class="field">职责<textarea class="input" rows="3">使用明确共享的来源进行研究；写入前等待审批。</textarea></label><p class="meta">原型只展示表单，不新增持久身份。生产须选择模型、权限、Skills 与记忆范围。</p>',[button('取消','dialog-done'),button('关闭配置预览','dialog-done','primary')]),
 'edit-bot':()=>actions['new-bot'](),
 'new-conversation':()=>{s.chatNew=true;s.messages=[];s.draft='';navigate('chat');},
 'team-scope':()=>openDialog('Team 共享范围','<p>成员身份、允许委派对象与资源授权是三个集合。临时执行者只获得公开参考，不能读取父会话的私人笔记或密钥。</p><p class="footer-note">@Bot 只表达路由；能力取交集，数据接收方逐项检查。</p>',[button('关闭','dialog-done','primary')]),
 'toggle-model':()=>{s.modelConfigured=!s.modelConfigured;render();announce(s.modelConfigured?'模型已模拟配置。':'模型未配置，发送受阻但服务与历史可用。');},
 'credential-info':()=>openDialog('凭据保护','<p>模型使用宿主提供的 credential reference；不同 Bot 不通过全局 process.env 轮换密钥。密钥不进入 settings、JSONL、错误栈、工具目录或导出。</p><p class="footer-note">无法保护持久化时采用仅会话内存或阻断，不静默明文保存。</p>',[button('关闭','dialog-done','primary')]),
 'skill-snapshot':()=>openDialog('Skill 快照','<dl class="kv"><dt>来源</dt><dd>已批准 HUHU resources 根</dd><dt>类型</dt><dd>Markdown Skill，不是可执行扩展</dd><dt>Revision</dt><dd class="mono">weekly-demo-v1 / hash-demo</dd><dt>更新</dt><dd>当前 attempt 保持稳定；下次安全边界生效</dd></dl>',[button('模拟检测到更新','skill-update'),button('关闭','dialog-done','primary')]),
 'skill-update':()=>{closeDialog();feedback('检测到 Skill revision 变化（模拟）。当前运行继续使用原快照，下一安全边界重验后生效。');},
 'mcp-toggle':()=>{if(s.mcp){s.mcp=false;render();return;}openDialog('显式启用 MCP · 演示','<p>生产只绑定 loopback，检查 Host / Origin、身份 token、资源范围、请求大小和速率。token 不放 URL 或日志。外部 grant 独立于内部 Bot。</p><p class="footer-note">本原型不会打开端口、执行 stdio command 或启动服务。</p>',[button('取消','dialog-done'),button('启用模拟状态','mcp-enable','primary')]);},
 'mcp-enable':()=>{s.mcp=true;closeDialog();render();announce('MCP 仅切换模拟显示，没有监听端口。');},
 'save-settings':()=>{const fields=$$('#budget-section input');if(fields.some(x=>!x.checkValidity())){fields.find(x=>!x.checkValidity()).reportValidity();return;}s.settingsSaved=true;feedback('设置已通过原型表单校验；未持久化、未改变任何运行中 attempt。');},
 'browser-fill':()=>{s.browserFilled=true;render();announce('示例 Page 已填入草稿，尚未提交。');},
 'browser-submit':()=>openDialog('提交前审批 · 同一 Page','<dl class="kv"><dt>对象</dt><dd>Space 工作 / Page demo-01</dd><dt>操作</dt><dd>向 example.invalid 示例站点提交周报</dd><dt>风险</dt><dd>外部提交可能不可逆；页面导航或参数变化须重批</dd></dl><p class="meta">这是虚构 Page，批准不会发出任何网络请求。</p>',[button('拒绝','dialog-done'),button('批准一次（模拟）','browser-approve','primary')]),
 'browser-approve':()=>{s.browserEffect='committed';closeDialog();render();announce('模拟提交回执生成，未发送真实数据。');},
 'auto-trigger':()=>{s.autoCount++;render();announce('同一 occurrence 仍只有一个模拟逻辑工作。');},
 'auto-receipt':()=>openDialog('自动化来源与回执','<dl class="kv"><dt>来源</dt><dd>周日行动计划 · 原自动化 occurrence</dd><dt>Idempotency</dt><dd class="mono">occ-demo-weekly-001</dd><dt>Run</dt><dd class="mono">run-demo-auto-001</dd><dt>结果</dt><dd>accepted 只是受理，不代表模型或写入完成</dd></dl>',[button('关闭','dialog-done','primary')]),
 'diagnostic-report':()=>feedback('诊断摘要仅含模拟状态、owner generation 与错误类别；不含真实路径、凭据或用户正文。'),
 'rebuild-index':()=>{if(s.diagnostic==='state')return;s.diagnostic='healthy';feedback('派生索引模拟重建完成。没有删除会话、审批、预算或效果账本。');},
 'backup':()=>openDialog('一致性备份方案','<p>通过受控关闭或 SQLite 支持的一致性快照取得控制库；会话/附件/审计配合稳定 ID、checkpoint 和校验清单。不能直接拷贝活跃 WAL 后声称完整备份。</p><p class="footer-note">本原型不读取、导出或下载用户数据。正式备份与恢复测试属于 T-14 / T-24。</p>',[button('关闭','dialog-done','primary')]),
 'old-data':()=>openDialog('旧数据保持不动','<p>代码可断代，但旧磁盘文件不会自动被迁移、覆盖或清空。新旧数据使用隔离目录；用户显式清理必须有独立范围预览。</p><p class="footer-note">本设计包不提供删除按钮，以避免把“删除旧代码”混同“清空用户数据”。</p>',[button('关闭','dialog-done','primary')]),
 'dialog-done':closeDialog,
 };
 document.addEventListener('click',e=>{
  const page=e.target.closest('[data-page]');if(page){closeDialog();navigate(page.dataset.page);return;}
  const a=e.target.closest('[data-action]');if(a&&!a.disabled){actions[a.dataset.action]?.();return;}
  const rv=e.target.closest('[data-run-view]');if(rv){s.runView=rv.dataset.runView;render();$(`[data-run-view="${s.runView}"]`).focus();return;}
  const mt=e.target.closest('[data-memory-tab]');if(mt){s.memoryTab=mt.dataset.memoryTab;render();$(`[data-memory-tab="${s.memoryTab}"]`).focus();return;}
  const c=e.target.closest('[data-conversation]');if(c){s.chatNew=false;if(c.dataset.conversation==='research')navigate('runs');else navigate('chat');}
 });
 document.addEventListener('change',e=>{
  if(e.target.id==='learning'){s.learning=e.target.checked;render();$('#learning').focus();}
  if(e.target.id==='diagnostic'){s.diagnostic=e.target.value;render();$('#diagnostic').focus();}
 });
 document.addEventListener('input',e=>{if(e.target.id==='composer')s.draft=e.target.value;});
 document.addEventListener('submit',e=>{if(e.target.id!=='composer-form')return;e.preventDefault();if(!s.modelConfigured)return;const text=$('#composer').value.trim();if(!text){$('#composer').focus();return;}s.messages.push({text,mode:$('#send-mode').value});s.draft='';render();$('#composer').focus();announce('输入已进入模拟队列，没有发送给模型。');});
 document.addEventListener('keydown',e=>{
  if(e.target.id==='composer'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();$('#composer-form').requestSubmit();}
  if(e.target.matches('[role=tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
   const tabs=$$('[role=tab]',e.target.parentElement);let i=tabs.indexOf(e.target);i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;e.preventDefault();tabs[i].click();
  }
 });
 $('#scenario').addEventListener('change',e=>{storeDraft();s.runState=e.target.value;if(s.runState==='unknown_effect')s.approval='unknown';else if(s.approval==='unknown')s.approval='pending';s.page='chat';location.hash='chat';render();announce('已切换演示状态。');});
 $('#theme').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('#theme').textContent=dark?'浅色':'深色';$('#theme').setAttribute('aria-label',dark?'切换浅色主题':'切换深色主题');});
 $('#touch').addEventListener('click',()=>{const on=document.documentElement.dataset.touch!=='true';document.documentElement.dataset.touch=String(on);$('#touch').setAttribute('aria-pressed',String(on));});
 $('#reset').addEventListener('click',()=>{closeDialog();s=initial();$('#scenario').value='waiting_approval';location.hash='chat';render();announce('已重置所有虚构演示数据。');});
 $('#new-chat').addEventListener('click',actions['new-conversation']);
 $('#search').addEventListener('input',e=>{let matches=0;$$('.conversation').forEach(b=>{b.hidden=!b.textContent.includes(e.target.value);if(!b.hidden)matches++;});announce(matches?`找到 ${matches} 个会话。`:'没有匹配会话，输入已保留。');});
 $('#nav-toggle').addEventListener('click',()=>openDialog('导航',`<nav class="nav-dialog" aria-label="工作台导航">${Object.entries(names).map(([id,name])=>`<button class="btn" data-page="${id}" ${s.page===id?'aria-current="page"':''}>${name}</button>`).join('')}</nav>`));
 $('#detail-toggle').addEventListener('click',()=>{if(s.page==='chat'&&$('#workspace').getBoundingClientRect().width>=1200){storeDraft();s.inspector=!s.inspector;render();}else openDialog('运行详情',inspector().replace('class="inspector"','class="detail-content"'),[button('关闭','dialog-done','primary')]);});
 window.addEventListener('hashchange',()=>{const key=location.hash.slice(1);if(key in names&&key!==s.page){storeDraft();s.page=key;s.feedback='';render();}});
 const hash=location.hash.slice(1);if(hash in names)s.page=hash;render();
})();
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/index.html -->
```html
<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>虎虎 BOT · Pi 重构交互原型 UI-001</title>
<link rel="stylesheet" href="styles.css">
</head>
<body class="huhu-ui">
<a class="skip" href="#main">跳到主要内容</a>
<div class="preview-bar" aria-label="原型预览控制">
 <span><strong>HUHU</strong><span class="preview-label">交互原型 · 示例数据 · 不操作真实 Vault</span></span>
 <div class="inline"><label class="sr-only" for="scenario">模拟运行状态</label><select id="scenario" class="input scenario"><option value="waiting_approval" selected>等待审批</option><option value="loading" >加载历史</option><option value="queued" >已排队</option><option value="running" >正在处理</option><option value="retrying" >重试中</option><option value="waiting_user" >等待回答</option><option value="waiting_children" >等待子任务</option><option value="read_only" >只读模式</option><option value="interrupted" >已中断</option><option value="failed" >失败保留输入</option><option value="cancelled" >已停止</option><option value="unknown_effect" >效果未知</option></select><button class="btn small" id="theme" aria-label="切换深色主题">深色</button><button class="btn small" id="touch" aria-pressed="false">触控尺寸</button><button class="btn small" id="reset">重置演示</button></div>
</div>
<div id="announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
<div id="workspace" class="workspace">
 <div class="shell">
  <nav class="rail" aria-label="工作台功能">
   <span class="brand" aria-label="HUHU 工作台">H</span>
   <button class="rail-button active" data-page="chat" aria-label="虎虎 BOT 会话" title="会话"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9H13a8.5 8.5 0 0 1 8 8v.5Z"/></svg></button>
   <button class="rail-button" data-page="runs" aria-label="运行与协作" title="运行与协作"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/></svg></button>
   <button class="rail-button" data-page="approvals" aria-label="审批中心" title="审批中心"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg></button>
   <button class="rail-button" data-page="memory" aria-label="长期记忆" title="长期记忆"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v16M12 5C9 2 3 3 3 3v16s6-1 9 2c3-3 9-2 9-2V3s-6-1-9 2Z"/></svg></button>
   <button class="rail-button" data-page="browser" aria-label="浏览器共作" title="浏览器共作"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg></button>
   <button class="rail-button" data-page="automation" aria-label="自动化交付" title="自动化交付"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></button>
   <div class="rail-bottom"><button class="rail-button" data-page="bots" aria-label="管理 Bot" title="管理 Bot"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-3-5"/></svg></button><button class="rail-button" data-page="settings" aria-label="Bot 设置" title="设置"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><circle cx="12" cy="12" r="5"/></svg></button><button class="rail-button" data-page="data" aria-label="数据与恢复" title="数据与恢复"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></svg></button></div>
  </nav>
  <aside class="sidebar" aria-label="Bot 与会话导航">
   <div class="sidebar-top"><button class="profile-switch" data-page="bots"><span class="avatar">虎</span><span><strong>虎虎 BOT</strong><small>个人工作空间</small></span><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9 4 4 4-4"/></svg></button><button class="btn outline full" id="new-chat"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg> 新建会话</button><label class="search-label"><span class="sr-only">搜索会话</span><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="search" placeholder="搜索会话" autocomplete="off"></label></div>
   <div class="sidebar-label">今天 <span>2</span></div>
   <button class="conversation selected" data-conversation="weekly"><span>整理下周的行动计划</span><small>等待确认 · 3 个来源</small></button>
   <button class="conversation" data-conversation="research"><span>研究个人知识管理方案</span><small>协作中 · 2 个子任务</small></button>
   <div class="sidebar-label">工作空间</div>
   <button class="side-link" data-page="runs"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/></svg> 运行与协作 <span class="count">2</span></button>
   <button class="side-link" data-page="approvals"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg> 待我审批 <span class="count" id="approval-count">1</span></button>
   <button class="side-link" data-page="memory"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v16M12 5C9 2 3 3 3 3v16s6-1 9 2c3-3 9-2 9-2V3s-6-1-9 2Z"/></svg> 长期记忆</button>
   <button class="side-link" data-page="browser"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg> 浏览器共作</button>
   <button class="side-link" data-page="automation"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> 自动化交付</button>
   <div class="sidebar-bottom"><p class="meta">页面关闭不会停止运行。</p><p class="meta">退出 Obsidian 后不继续执行。</p><div class="inline"><span class="status success">● 服务就绪</span><span class="meta">模拟</span></div></div>
  </aside>
  <div class="main-area">
   <header class="page-header"><div class="inline"><button class="btn icon nav-toggle" id="nav-toggle" aria-label="打开导航"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><span class="breadcrumb">虎虎 BOT</span><span class="separator">/</span><strong id="page-label">会话</strong></div><div class="inline"><span class="status neutral" id="top-status">等待审批</span><button class="btn icon" id="detail-toggle" aria-label="打开运行详情" title="运行详情"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg></button></div></header>
   <main id="main" tabindex="-1"></main>
  </div>
 </div>
</div>
<dialog id="dialog" aria-labelledby="dialog-title"><div class="dialog-top"><h2 id="dialog-title"></h2><button class="btn icon" id="dialog-close" aria-label="关闭对话框"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div id="dialog-body"></div><div id="dialog-actions" class="dialog-actions"></div></dialog>
<script src="app.js"></script>
</body></html>
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/styles.css -->
```css
/* Adapted preview tokens from the SAME REPOSITORY UI-001, dev 974105b.
   Production authority remains DESIGN-0002 / src/ui/styles/tokens.css.
   All colors here are offline-preview fallbacks, NOT host theme overrides. */
:root {
 color-scheme:light;--background-primary:#fff;--background-primary-alt:#f8f8f6;--background-secondary:#f1f1ee;--background-modifier-hover:#e9e9e5;--background-modifier-border:#deded9;
 --text-normal:#1f1f1d;--text-muted:#5b5b56;--text-on-accent:#fff;--text-error:#b3261e;--interactive-accent:#1d6b64;
 --color-green:#1c7436;--color-orange:#8a5300;--color-red:#b3261e;--color-blue:#1d5ea6;--color-yellow:#6f5a00;--input:#86867f;
 --bg:var(--background-primary);--surface:var(--background-primary-alt);--muted:var(--background-secondary);--border:var(--background-modifier-border);--fg:var(--text-normal);--quiet:var(--text-muted);--accent:var(--interactive-accent);
 --tint:color-mix(in srgb,var(--accent) 9%,var(--bg));--danger-tint:color-mix(in srgb,var(--color-red) 8%,var(--bg));--warning-tint:color-mix(in srgb,var(--color-orange) 9%,var(--bg));--success-tint:color-mix(in srgb,var(--color-green) 8%,var(--bg));
 --r-badge:6px;--r-control:8px;--r-panel:12px;--r-dialog:14px;--hit:32px;--control:36px;--duration:120ms;
 --font:"Geist",system-ui,-apple-system,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;--mono:"Geist Mono",ui-monospace,Consolas,"Noto Sans Mono CJK SC",monospace;
}
html[data-theme="dark"] {color-scheme:dark;--background-primary:#1c1c1a;--background-primary-alt:#222220;--background-secondary:#272725;--background-modifier-hover:#323230;--background-modifier-border:#3b3b38;--text-normal:#e9e9e5;--text-muted:#a9a9a2;--text-on-accent:#07201d;--text-error:#ff8d84;--interactive-accent:#62bfb3;--color-green:#6fcf8a;--color-orange:#f0b058;--color-red:#ff8d84;--color-blue:#7db7f2;--color-yellow:#dcc65a;--input:#8d8d86}
html[data-touch="true"]{--hit:44px;--control:44px}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 var(--font);min-width:320px}button,input,textarea,select{font:inherit}button{color:inherit}button,a,input,textarea,select,summary{touch-action:manipulation}button{cursor:pointer}h1,h2,h3,p{margin:0}h1{font-size:20px;line-height:28px;font-weight:650}h2{font-size:16px;line-height:24px;font-weight:600}h3{font-size:14px;line-height:22px;font-weight:600}button:disabled{opacity:.5;cursor:not-allowed}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:1px}a{color:var(--accent)}.i{width:18px;height:18px;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round;fill:none;flex:none}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.skip{position:fixed;left:8px;top:-100px;z-index:100;background:var(--bg);padding:12px}.skip:focus{top:8px}.inline{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.stack{display:flex;flex-direction:column;gap:12px}.meta,small{font-size:12px;line-height:18px;color:var(--quiet)}.subtle{color:var(--quiet);font-size:13px}.mono{font:13px/1.5 var(--mono);overflow-wrap:anywhere}.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:var(--control);min-width:var(--hit);padding:6px 12px;border:1px solid transparent;border-radius:var(--r-control);background:transparent;font-size:13px;font-weight:500;line-height:20px;transition:background-color var(--duration),border-color var(--duration),color var(--duration)}.btn:hover{background:var(--background-modifier-hover)}.btn.small{min-height:var(--hit);padding:4px 8px}.btn.icon{padding:6px;min-width:var(--control)}.btn.primary{background:var(--accent);color:var(--text-on-accent)}.btn.primary:hover{background:color-mix(in srgb,var(--accent) 90%,var(--fg))}.btn.outline{border-color:var(--input);background:var(--bg)}.btn.outline:hover{background:var(--muted)}.btn.danger{color:var(--color-red);border-color:var(--color-red)}.btn.full{width:100%}.btn:disabled:hover{background:inherit}.status,.tag{display:inline-flex;gap:6px;align-items:center;padding:3px 7px;border-radius:var(--r-badge);font-size:12px;font-weight:500;line-height:18px;max-width:100%;overflow-wrap:anywhere}.status.neutral,.tag{background:var(--muted);color:var(--quiet)}.status.success{color:var(--color-green);background:var(--success-tint)}.status.warning{color:var(--color-orange);background:var(--warning-tint)}.status.error{color:var(--color-red);background:var(--danger-tint)}.status.info{color:var(--color-blue);background:color-mix(in srgb,var(--color-blue) 8%,var(--bg))}.preview-bar{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 16px;min-height:48px;background:var(--surface);border-bottom:1px solid var(--border);font-size:12px;color:var(--quiet)}.preview-bar strong{font-size:13px;letter-spacing:1.5px;color:var(--fg);margin-right:16px}.preview-label{font-size:12px}.workspace{container-type:inline-size;container-name:workspace}.shell{display:grid;grid-template-columns:52px 280px minmax(0,1fr);min-height:calc(100vh - 49px)}.rail{background:var(--surface);border-right:1px solid var(--border);padding:12px 6px;display:flex;align-items:center;flex-direction:column;gap:8px}.brand{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:var(--fg);color:var(--bg);font-weight:700;margin-bottom:12px}.rail-button{display:flex;align-items:center;justify-content:center;width:36px;min-height:var(--control);border-radius:8px;border:1px solid transparent;background:transparent;color:var(--quiet)}.rail-button:hover{background:var(--muted)}.rail-button.active{color:var(--accent);background:var(--tint);border-color:color-mix(in srgb,var(--accent) 20%,transparent)}.rail-bottom{margin-top:auto;display:flex;flex-direction:column;gap:8px;padding-top:24px}.sidebar{background:var(--surface);border-right:1px solid var(--border);padding:16px 12px;display:flex;flex-direction:column;gap:4px}.sidebar-top{display:flex;flex-direction:column;gap:16px;margin-bottom:16px}.profile-switch{display:flex;align-items:center;gap:10px;padding:0;border:none;background:none;text-align:left;min-height:44px}.profile-switch>span:nth-child(2){flex:1;display:flex;flex-direction:column}.avatar{width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;background:var(--tint);color:var(--accent);font-weight:600;flex:none}.search-label{border:1px solid var(--input);background:var(--bg);border-radius:8px;display:flex;align-items:center;gap:8px;padding:6px 10px;color:var(--quiet)}.search-label input{min-width:0;width:100%;border:none;outline-offset:3px;background:transparent;color:var(--fg);font-size:13px}.sidebar-label{font-size:12px;color:var(--quiet);display:flex;justify-content:space-between;padding:16px 10px 4px}.conversation{display:flex;flex-direction:column;gap:4px;min-height:64px;padding:12px;text-align:left;border:1px solid transparent;border-radius:8px;background:transparent;font-size:13px}.conversation.selected{background:var(--tint);border-color:color-mix(in srgb,var(--accent) 22%,transparent)}.conversation:hover,.side-link:hover{background:var(--background-modifier-hover)}.side-link{min-height:var(--control);display:flex;align-items:center;gap:10px;padding:8px 10px;text-align:left;border:0;background:none;border-radius:8px;font-size:13px}.count{margin-left:auto;min-width:20px;text-align:center;font-size:12px;background:var(--muted);border-radius:6px}.sidebar-bottom{margin-top:auto;padding:32px 8px 8px;display:flex;flex-direction:column;gap:8px}.main-area{min-width:0}.page-header{height:44px;display:flex;align-items:center;justify-content:space-between;padding:4px 20px;gap:8px;border-bottom:1px solid var(--border);font-size:13px}.breadcrumb,.separator{color:var(--quiet)}.nav-toggle{display:none}main{outline:none;min-width:0}main:focus-visible{outline:none}.page{padding:28px 32px;max-width:1440px;margin:0 auto;container-type:inline-size;container-name:content}.page-intro{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:24px}.page-intro p{margin-top:6px;color:var(--quiet);font-size:13px}.chat-layout{display:grid;grid-template-columns:minmax(0,1fr) 288px;min-height:calc(100vh - 93px)}.chat-layout.no-inspector{grid-template-columns:minmax(0,1fr)}.chat-column{padding:28px 32px 16px;min-width:0;display:flex;flex-direction:column}.chat-title{margin-bottom:24px}.chat-title .inline{margin-top:8px}.message{margin-bottom:24px}.message-header{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;margin-bottom:10px}.message-header .avatar{width:28px;height:28px;font-size:12px}.message-body{padding-left:36px;line-height:1.75}.message.user .message-body{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;font-size:14px}.source-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);background:var(--bg);border-radius:6px;padding:4px 8px;font-size:12px;min-height:32px;max-width:100%;overflow-wrap:anywhere}.sources{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.plan-lines{list-style:none;margin:16px 0;padding:0;display:flex;flex-direction:column;gap:12px}.plan-lines li{display:flex;gap:12px}.step-num{height:24px;width:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;border:1px solid var(--border);border-radius:6px;flex:none;color:var(--quiet)}.approval-card{padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);margin-top:16px}.approval-card .card-head{margin-bottom:12px}.card-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.approval-card .actions{margin-top:16px}.actions{display:flex;gap:8px;flex-wrap:wrap}.kv{display:grid;grid-template-columns:92px 1fr;gap:8px 12px;font-size:13px;margin:12px 0}.kv dt{color:var(--quiet)}.kv dd{margin:0;min-width:0;overflow-wrap:anywhere}.composer-wrap{margin-top:auto;padding-top:12px}.composer{border:1px solid var(--input);border-radius:12px;padding:12px;background:var(--bg)}.composer:focus-within{outline:3px solid var(--accent);outline-offset:1px}.composer textarea{width:100%;border:0;background:transparent;color:var(--fg);min-height:60px;resize:vertical;outline:none;font-size:14px;line-height:1.6}.composer textarea:focus-visible{outline:none}.composer-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px}.composer-hint{text-align:center;margin-top:8px;font-size:12px;color:var(--quiet)}.inspector{border-left:1px solid var(--border);background:var(--surface);padding:24px 20px;min-width:0}.inspector>section{padding-bottom:20px;margin-bottom:20px;border-bottom:1px solid var(--border)}.inspector>section:last-child{border-bottom:0}.inspector h3{margin-bottom:12px}.inspector .kv{grid-template-columns:70px 1fr;font-size:12px}.progress-track{height:6px;background:var(--border);border-radius:6px;overflow:hidden;margin-top:12px}.progress-fill{height:100%;background:var(--accent);width:32%}.tiny-list{display:flex;flex-direction:column;gap:10px;list-style:none;margin:0;padding:0}.tiny-list li{font-size:13px;display:flex;justify-content:space-between;gap:8px}.callout{border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:16px;line-height:1.65;font-size:13px}.callout.warning{background:var(--warning-tint);border-color:color-mix(in srgb,var(--color-orange) 35%,var(--border))}.callout.error{background:var(--danger-tint);border-color:color-mix(in srgb,var(--color-red) 35%,var(--border))}.callout.success{background:var(--success-tint)}.callout.info{background:var(--surface)}.callout p{margin-top:4px}.callout .actions{margin-top:12px}.empty{padding:40px 20px;text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center;border:1px dashed var(--border);border-radius:12px}.section{margin-top:24px}.section h2{margin-bottom:12px}.surface{border:1px solid var(--border);border-radius:12px;padding:20px;background:var(--surface)}.surface p{margin-top:8px}.grid-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.item-list{list-style:none;padding:0;margin:0;border-top:1px solid var(--border)}.item-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;padding:16px 0;border-bottom:1px solid var(--border);align-items:center}.item-row p{font-size:13px;color:var(--quiet);margin-top:5px}.item-row .actions{justify-content:flex-end}.field{display:flex;flex-direction:column;gap:6px;font-size:13px;margin-bottom:16px}.input{width:100%;min-height:var(--control);border:1px solid var(--input);border-radius:8px;padding:8px 12px;background:var(--bg);color:var(--fg);min-width:0}.input[readonly]{background:var(--muted);border-style:dashed}.tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--border);margin-bottom:20px;padding-bottom:4px}.tab{min-height:var(--control);border:1px solid transparent;border-radius:8px;background:none;padding:6px 12px;font-size:13px}.tab[aria-selected="true"]{background:var(--tint);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 25%,transparent)}.run-list{list-style:none;padding:0;margin:0}.run-row{width:100%;padding:16px;display:flex;gap:12px;align-items:center;text-align:left;border:1px solid var(--border);border-radius:8px;background:var(--bg);margin-bottom:12px}.run-row:hover{background:var(--surface)}.run-row>span:nth-child(2){flex:1;min-width:0}.run-row small{display:block;margin-top:4px}.run-child{margin-left:24px;position:relative}.run-child:before{content:"";position:absolute;left:-16px;top:-13px;height:40px;width:12px;border-left:1px solid var(--border);border-bottom:1px solid var(--border)}.graph{position:relative;min-height:420px;border:1px solid var(--border);border-radius:12px;padding:24px;display:grid;grid-template-columns:1fr 1fr;gap:56px 32px;background:var(--surface)}.graph .run-row{margin:0;background:var(--bg);position:relative;z-index:1}.graph .root-node{grid-column:1/3;width:60%;justify-self:center}.graph .edges{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;stroke:var(--input);stroke-width:1.5;fill:none}.graph .edges .comm{stroke:var(--accent);stroke-dasharray:5 5}.graph .graph-note{grid-column:1/3;font-size:12px;color:var(--quiet)}.receipt{border:1px solid var(--border);border-radius:8px;padding:12px;margin-top:12px;background:var(--bg)}.receipt .mono{margin:6px 0}.diff{background:var(--muted);border:1px solid var(--border);border-radius:8px;padding:16px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.7 var(--mono)}.diff .add{color:var(--color-green)}.diff .remove{color:var(--color-red)}.switch-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.switch{appearance:none;width:40px;height:24px;background:var(--input);border:1px solid var(--input);border-radius:999px;position:relative;cursor:pointer;flex:none}.switch:before{content:"";height:18px;width:18px;background:var(--bg);border-radius:50%;position:absolute;left:2px;top:2px;transition:transform var(--duration)}.switch:checked{background:var(--accent);border-color:var(--accent)}.switch:checked:before{transform:translateX(16px)}.checkbox{width:18px;height:18px;accent-color:var(--accent)}.permission-line{display:flex;align-items:center;gap:8px;min-height:44px}.mock-browser{border:1px solid var(--border);border-radius:12px;overflow:hidden}.browser-toolbar{background:var(--muted);padding:12px;display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--border);flex-wrap:wrap}.address{flex:1;min-width:160px;border:1px solid var(--border);background:var(--bg);padding:6px 12px;border-radius:6px;font-size:12px}.browser-page{padding:24px;max-width:660px;margin:0 auto}.browser-page .field{margin-top:16px}.history-line{padding:12px 0 12px 20px;border-left:2px solid var(--border);margin-left:8px}.history-line.selected{border-color:var(--accent);background:var(--tint);border-radius:0 8px 8px 0}.history-line p{font-size:13px}.branch-indent{margin-left:28px}.dialog-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}dialog{border:1px solid var(--border);border-radius:14px;background:var(--bg);color:var(--fg);padding:24px;width:min(620px,calc(100% - 32px));max-height:calc(100% - 32px);overflow:auto;box-shadow:0 6px 20px rgb(0 0 0 / 18%)}dialog::backdrop{background:rgb(0 0 0 / 35%)}.dialog-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;border-top:1px solid var(--border);padding-top:16px;margin-top:20px}.dialog-body{line-height:1.6}.nav-dialog{display:flex;flex-direction:column;gap:4px}.nav-dialog button{justify-content:flex-start}.metric-value{font-size:24px;font-weight:650;margin:12px 0 4px}.split-options{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 0}.loading-bar{height:12px;background:var(--muted);border-radius:6px;margin:12px 0}.loading-bar:nth-child(2){width:72%}.loading-bar:nth-child(3){width:48%}.persistent-feedback{margin:0 0 16px}.footer-note{font-size:12px;color:var(--quiet);margin-top:16px}.text-link{border:none;background:none;text-decoration:underline;text-underline-offset:3px;color:var(--accent);min-height:var(--hit);font-size:13px;text-align:left}.settings-nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}.settings-nav a{font-size:13px;text-decoration:none;padding:6px 10px;border:1px solid var(--border);border-radius:6px;min-height:32px}.settings-nav a:hover{background:var(--surface)}.hidden,[hidden]{display:none}
@container workspace (max-width:1199px){.chat-layout{grid-template-columns:minmax(0,1fr)}.inspector{display:none}.chat-column{max-width:900px;margin:0 auto;width:100%}}
@container workspace (max-width:959px){.shell{grid-template-columns:52px minmax(0,1fr)}.sidebar{display:none}.nav-toggle{display:inline-flex}.page{padding:24px}.chat-column{padding:24px}.breadcrumb,.separator{display:none}}
@container workspace (max-width:599px){.shell{grid-template-columns:minmax(0,1fr)}.rail{display:none}.page-header{padding:4px 12px}.page{padding:20px 16px}.chat-column{padding:20px 16px}.chat-title{margin-bottom:20px}.message-body{padding-left:0}.page-intro{flex-direction:column;gap:12px}.preview-label{display:block;max-width:220px}.preview-bar{padding:8px 12px;align-items:flex-start}.preview-bar>.inline{gap:2px}.preview-bar .btn{font-size:12px}.message-header{margin-bottom:8px}.graph{gap:24px;padding:16px}.graph .root-node{width:100%}.graph .run-row{grid-column:1/3}.graph .edges{display:none}.composer-toolbar{gap:4px}.chat-layout{min-height:calc(100vh - 117px)}dialog{padding:16px}.preview-bar strong{margin:0}.item-row{align-items:start}.run-child{margin-left:16px}.run-row{flex-wrap:wrap}.run-row>.status{margin-left:36px}}
@container content (max-width:760px){.grid-two{grid-template-columns:minmax(0,1fr)}}
@container content (max-width:480px){.item-row{grid-template-columns:minmax(0,1fr);gap:12px}.item-row .actions{justify-content:flex-start}.kv{grid-template-columns:80px minmax(0,1fr)}.split-options{align-items:flex-start;flex-direction:column}.surface{padding:16px}}
@media (prefers-reduced-motion:reduce){.huhu-ui *,.huhu-ui *:before,.huhu-ui *:after{transition:none;animation:none;scroll-behavior:auto}}

.scenario{width:auto;max-width:140px;padding:4px 8px;min-height:32px;font-size:12px}.source-chip{min-height:var(--hit)}
html[data-touch="true"] .rail{padding-inline:4px}html[data-touch="true"] .rail-button{width:44px}html[data-touch="true"] .profile-switch{min-height:44px}html[data-touch="true"] .tab{min-height:44px}
@media(max-width:599px){.preview-bar{flex-wrap:wrap;padding:8px 12px}.preview-bar>span{width:100%}.preview-bar>.inline{justify-content:space-between;width:100%}.preview-bar strong{margin-right:8px}.preview-label{font-size:11px}.scenario{max-width:140px}.preview-bar .btn{padding-inline:6px;font-size:12px}}
```
<!-- /PROTOTYPE-FILE -->
