---
schema_version: 3
artifact: "ui-prototype"
change: "2026-10-25-huhu-bot-architecture"
design_id: "UI-001"
status: "blocked"
project_kind: "existing"
platforms: ["desktop","web"]
candidates: [{"id":"candidate-a","template_id":"soft-personal-ai","primary_reference":"huhu-existing","auxiliaries":[{"reference_id":"deepseek","dimension":"协调者、@ 与后台任务的交互语义"},{"reference_id":"hana","dimension":"持久身份与临时线程的展示区分"}],"rationale":"用户在 LOG-040 明确确认 final 为唯一方案","structural_difference":"唯一结构：左侧 Bot/群聊目录、主对话内联协作摘要、独立任务详情页","task_id":"weekly-report","entry":"comparison/variants/candidate-a.html"}]
candidate_count_override: {"count":1,"request":"LOG-040：用户确认 UI-001/final，只要这一套的元素，并要求固化相关文档。"}
selected_candidate: "candidate-a"
sources: [{"id":"huhu-existing","locator":"src/shell/ShellRoot.tsx","revision":"66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"},{"id":"huhu-tokens","locator":"src/ui/styles/tokens.css","revision":"66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"},{"id":"huhu-pearl","locator":"src/theme/styles/presets.css","revision":"66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93"},{"id":"huhu-fonts","locator":"src/ui/fonts/LICENSE.txt","license":"SIL Open Font License 1.1"},{"id":"personal-ai","locator":".agents/speculo/workflows/specdev/specdev-p-prototype/design-library/templates/soft-personal-ai.md"},{"id":"hana","locator":".agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/learning/02_多Bot协作与记忆隔离.md","url":"https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/tools/subagent-tool.ts","revision":"9a6cabf8c513db5edc6cf8179a538c9075885c6e"},{"id":"deepseek","locator":".agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/learning/02_多Bot协作与记忆隔离.md","url":"https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/groups.js","revision":"1bebe826f74e9a72cabafd3b80602b05af867b38"},{"id":"huhu-published-design","locator":".agents/speculo/.speculo/specdev/design/revisions/DESIGN-0001.md","revision":"DESIGN-0001","digest":"ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331"}]
prototype_files: ["final/index.html","final/styles.css","final/app.js"]
browser_evidence: null
updated_at: "2026-10-25T03:25:37.663Z"
---

# HUHU Bot UI-001 已确认原型源码

本包只维护用户在 LOG-040 确认的一套 final。设计规则归 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path> revision 2；行为与验收归 spec.md。设计确认已记录，技术验收状态单独保留，不能把 blocked 解释为仍待用户选方案。

## Project Evidence

- **用户任务：** 在 HUHU 工作台选择 Bot 或群聊，附加资料，分派给已有 Bot 或临时子执行，查看结果并确认写入。
- **平台：** P1 桌面 Obsidian；窄叶子布局保留未来 Web 可复用的信息结构，不宣称已交付 Web 服务。
- **项目基底：** TypeScript/React、52px 工具轨、220–500px 侧栏（默认 280px）、960/600px 叶子断点、共享 token/组件及本地 Geist 字体。
- **依据：** <Path>src/shell/layout.ts</Path>、<Path>src/shell/ShellRoot.tsx</Path>、<Path>src/ui/styles/tokens.css</Path>、<Path>src/theme/styles/presets.css</Path>、<Path>src/ui/react/owner-document.ts</Path>。
- **身份边界：** <Path>src/modules/agent/ui/sidebar/AgentSidebar.tsx</Path> 现有对象是 CLI/WorkspaceTab，不等同于本 change 的持久 Bot。
- **实际基线：** 只读引用已发布 <Path>{roots.state}/specdev/design/revisions/DESIGN-0001.md</Path>。其 current 与不可变快照逐字一致，规则与 final 兼容。之前未发布的同名草案已移除，没有覆盖正式知识。
- **观察边界：** 源码事实已核对；用户明确接受 final。没有编造浏览器版本、操作矩阵、截图或生产验证。

### Keep, Adjust, Replace, Add

| 动作 | 当前处理 |
| --- | --- |
| Keep | 当前 HUHU 外壳、侧栏范围、主题语义、字体、密度、共享控件与叶子响应式 |
| Adjust | 左侧对象为 Bot 身份/职责/状态与单独群聊分组 |
| Replace | 本包的多方案入口和条件分支收敛为唯一 final；CLI 模块保持自己的对象模型 |
| Add | 内联协作摘要、已有/临时任务详情、记忆作用域、写入审批和清除核查 |

## Confirmed Composition

用户指定数量为 1，覆盖 P 缺省候选数。稳定选择 ID 保留 candidate-a，实际入口为 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/final/index.html</Path>。

唯一布局是工具轨＋Bot/群聊目录＋主对话，复杂任务通过内联摘要和独立任务页展开。保留原 final 的六页面、明暗与示例状态；删除其他候选及专用右侧检查器、首页任务优先分支。独立任务页是当前 final 原有功能，不随候选清理删除。

主视觉来自 HUHU，模板 soft-personal-ai 提供对话任务组合；DeepSeek 的协调者语义与 Hana 的身份/线程区分只用于理解交互对象。外部项目的品牌、实现和权限默认值均不进入本包。

comparison/index.html 仅保留旧链接导航，comparison/variants/candidate-a.html 是 final/index.html 替换资源相对路径后的生成投影，共用 final/styles.css 与 final/app.js。它们没有独立设计或状态实现。日常阅读、复制与后续实施只使用 final；其他候选文件已经删除。

## Confirmation and Baseline

- **真实决定：** LOG-040 与 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/confirmation-final.md</Path> 保留用户原文、清理范围和内容绑定；不重复索取相同批准。
- **设计合同：** DESIGN revision 2，采用已发布 DESIGN-0001，不发起新基线 bootstrap 或 promotion。
- **机械清理：** 移除未选分支和旧比较入口标签；产品任务区与交互使用原 final。最终源码与清理前选中内容的摘要分开记录，避免把修改后的字节冒充旧字节。
- **技术状态：** DESIGN 的 approved 表示用户接受；本包 blocked 仅表示尚缺可核验的浏览器记录。用户确认没有被转换成虚假的 browser.json。
- **绑定：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/bindings.json</Path> 固定 DESIGN、正式基线、final/原型和确认快照。

## Prototype Sources

下面三个具名源码块是 final 的字节权威。final/assets 的字体与许可来自本项目；所有运行依赖都在 final 内，复制整个 final 目录即可离线打开。旧地址的同源投影不另改源码，变更后由 final 重新生成。

<!-- PROTOTYPE-FILE: final/index.html -->
```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>HUHU Bot · 对话与协作原型</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="preview-bar" aria-label="原型检查工具">
    <span class="preview-brand">HUHU Bot</span>
    <span id="selection-label">已确认方案 · 对话与协作</span>
    <span class="preview-note">离线演示 · 不调用模型或修改笔记</span>
    <label class="scenario-label">场景 <select id="scenario" aria-label="切换原型场景">
      <option value="normal">正常 / 待审批</option><option value="empty">空会话</option><option value="loading">加载中</option><option value="error">服务失败</option><option value="offline">离线</option><option value="permission">权限不足</option><option value="recovery">崩溃后可恢复</option><option value="unknown">写入结果未知</option><option value="canceled">已取消</option><option value="long">长中文</option>
    </select></label>
    <button type="button" data-action="theme" aria-label="切换明暗主题" title="切换明暗主题">◐</button>
  </div>
  <div id="leaf" class="leaf-shell" data-size="wide">
    <button class="scrim" id="scrim" type="button" data-action="close-nav" aria-label="关闭导航" hidden></button>
    <div class="nav-zone" id="nav-zone">
      <nav class="rail" aria-label="HUHU 工作台">
        <div class="brand-mark" aria-label="HUHU">h.</div>
        <button type="button" data-action="home" aria-label="HUHU 主页" title="工作台主页"><span data-icon="home"></span></button>
        <button class="rail-active" type="button" data-action="chat" aria-label="Bot 工作台" title="Bot"><span data-icon="bot"></span></button>
        <button type="button" data-action="tasks" aria-label="查看协作任务" title="协作任务"><span data-icon="branch"></span></button>
        <div class="rail-spacer"></div>
        <button type="button" data-action="data" aria-label="本机数据" title="本机数据"><span data-icon="database"></span></button>
        <button type="button" data-action="settings" aria-label="Bot 设置" title="Bot 设置"><span data-icon="settings"></span></button>
      </nav>
      <aside class="sidebar" id="sidebar" aria-label="Bot 与群聊导航">
        <header class="sidebar-header"><strong>Bot</strong><span class="muted">我的助手</span><button class="icon-button" type="button" data-action="new-bot" aria-label="创建 Bot" title="创建 Bot"><span data-icon="plus"></span></button></header>
        <label class="search-box"><span data-icon="search"></span><input id="search" type="search" placeholder="搜索 Bot 或群聊" aria-label="搜索 Bot 或群聊"></label>
        <div class="sidebar-content" id="directory"></div>
        <footer class="sidebar-footer"><button type="button" class="nav-link" data-action="memory"><span data-icon="memory"></span>记忆<span class="tiny muted">私有 / 全局</span></button><div class="workspace-label"><span class="dot success"></span>个人知识库 <span>本机</span></div></footer>
      </aside>
      <div id="resize-handle" class="resize-handle" role="separator" aria-label="调整 Bot 侧栏宽度" aria-orientation="vertical" aria-valuenow="280" aria-valuemin="220" aria-valuemax="500" tabindex="0"></div>
    </div>
    <main id="workspace" class="workspace">
      <header class="page-header">
        <button id="menu-toggle" class="icon-button menu-toggle" type="button" data-action="toggle-nav" aria-label="打开 Bot 列表" aria-controls="nav-zone" aria-expanded="false"><span data-icon="menu"></span></button>
        <div class="page-heading"><h1 id="page-title">周报协作</h1><span id="page-subtitle" class="muted">协调员 · 3 位成员</span></div>
        <div class="header-actions"><button type="button" class="quiet" data-action="tasks"><span data-icon="branch"></span><span class="desktop-label">任务</span><span class="count">3</span></button><button type="button" class="icon-button" data-action="details" aria-label="查看当前 Bot 或群聊详情" title="详情"><span data-icon="info"></span></button></div>
      </header>
      <div id="page-body" class="page-body"><div class="messages"><div class="thread"><article class="message"><span class="avatar">协</span><div class="message-body"><h2>周报协作</h2><p>先核对两份附加资料，再整理周报。协作任务在对话中展开。</p><div class="collaboration-card"><div class="card-heading">周报整理 · 资料助手与写作助手</div><button type="button" class="task-row" data-action="tasks">查看成员进度与临时子任务</button></div></div></article></div></div></div>
    </main>
  </div>
  <dialog id="modal" aria-labelledby="modal-title"><form id="modal-form"><header class="modal-header"><h2 id="modal-title"></h2><button type="button" class="icon-button" data-action="close-modal" aria-label="关闭对话框"><span data-icon="close"></span></button></header><div id="modal-body" class="modal-body"></div><footer id="modal-actions" class="modal-actions"></footer></form></dialog>
  <div id="toast" role="status" aria-live="polite" class="toast" hidden></div>
  <script src="app.js"></script>
</body>
</html>
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/styles.css -->
```css
@font-face{font-family:Geist;src:url("assets/Geist-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"Geist Mono";src:url("assets/GeistMono-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
/* HUHU Pearl semantic values; an offline fixture, not a new production theme. */
:root{color-scheme:light;--background:#fff;--foreground:#0a0a0a;--card:#fff;--popover:#fff;--primary:#171717;--primary-foreground:#fafafa;--secondary:#f5f5f5;--muted-foreground:#6e6e6e;--accent:#f5f5f5;--border:#e5e5e5;--ring:#a1a1a1;--sidebar:#fafafa;--sidebar-accent:#f5f5f5;--danger:#e7000b;--success:#28734b;--warning:#8a5b0a;--info:#245f99;--radius:10px;--radius-sm:6px;--radius-md:8px;--radius-xl:14px;--rail-width:52px;--panel-width:280px;--shadow-floating:0 10px 24px rgb(0 0 0 / .18);--font-ui:Geist,Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
html[data-theme=dark]{color-scheme:dark;--background:#131416;--foreground:#d7d7db;--card:#1b1b1e;--popover:#1e1e20;--primary:#d0d0d6;--primary-foreground:#131416;--secondary:#2a2a2d;--muted-foreground:#97989d;--accent:#2e2f33;--border:#2c2d30;--ring:#85868b;--sidebar:#19191c;--sidebar-accent:#2c2c30;--danger:#f3625f;--success:#84c79e;--warning:#e9bd69;--info:#95bce8}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;min-width:280px}body{font:14px/1.6 var(--font-ui);color:var(--foreground);background:var(--background)}button,input,select,textarea{font:inherit;color:inherit}button,a,input,select,textarea{touch-action:manipulation}button{min-height:32px;border:1px solid var(--border);background:var(--background);border-radius:var(--radius-sm);padding:5px 10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;line-height:1.4}button:hover{background:var(--accent)}button:disabled{opacity:.5;cursor:not-allowed}button.primary{background:var(--primary);border-color:var(--primary);color:var(--primary-foreground)}button.primary:hover{opacity:.86}button.quiet,.icon-button{background:transparent;border-color:transparent}button.quiet:hover,.icon-button:hover{background:var(--accent)}button.danger{color:var(--danger)}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--ring);outline-offset:2px}input,select,textarea{border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--background);min-height:36px;padding:7px 10px;max-width:100%}textarea{resize:vertical;min-height:84px}input[type=checkbox]{min-height:16px;width:16px;accent-color:var(--primary)}a{color:inherit;text-underline-offset:3px}svg{width:16px;height:16px;flex:none;stroke:currentColor;stroke-width:1.7;fill:none;stroke-linecap:round;stroke-linejoin:round}h1,h2,h3,p{margin:0}h1{font-size:14px;font-weight:600}h2{font-size:18px;line-height:1.5}h3{font-size:14px}small,.small{font-size:12px}.muted{color:var(--muted-foreground)}.tiny{font-size:11px}.strong{font-weight:600}.icon-button{width:32px;padding:0;flex:none}.dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--muted-foreground);flex:none}.success{color:var(--success)}.warning{color:var(--warning)}.dot.success{background:var(--success)}.dot.warning{background:var(--warning)}.dot.working{background:var(--info)}.badge{display:inline-flex;align-items:center;gap:5px;padding:2px 6px;border:1px solid var(--border);border-radius:5px;font-size:11px;white-space:nowrap}.count{font-size:10px;background:var(--secondary);min-width:17px;border-radius:4px;padding:1px 4px}.preview-bar{min-height:40px;display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--border);padding:4px 12px;font-size:11px;background:var(--sidebar);flex-wrap:wrap}.preview-brand{font-weight:600}.preview-note{color:var(--muted-foreground);margin-right:auto}.preview-bar button,.preview-bar select{font-size:11px;min-height:28px;padding:3px 6px}.scenario-label{display:flex;gap:5px;align-items:center}.leaf-shell{height:calc(100dvh - 40px);min-height:420px;display:flex;position:relative;overflow:hidden;container-type:inline-size;container-name:leaf}.nav-zone{display:flex;flex:none;min-width:0;z-index:20}.rail{width:var(--rail-width);background:var(--sidebar);border-right:1px solid var(--border);display:flex;align-items:center;flex-direction:column;padding:10px 6px;gap:12px}.brand-mark{font-size:24px;font-weight:750;letter-spacing:-2px;line-height:32px;margin-bottom:10px}.rail button{width:36px;height:36px;padding:0;border-color:transparent;background:transparent;color:var(--muted-foreground)}.rail button.rail-active{background:var(--sidebar-accent);color:var(--foreground)}.rail button:hover{background:var(--accent);color:var(--foreground)}.rail-spacer{flex:1}.sidebar{width:var(--panel-width);background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;min-height:0}.sidebar-header{height:44px;padding:6px 12px 6px 16px;display:flex;align-items:center;gap:8px}.sidebar-header strong{font-size:14px}.sidebar-header .muted{font-size:11px}.sidebar-header button{margin-left:auto}.search-box{margin:8px 12px 16px;display:flex;align-items:center;gap:6px;color:var(--muted-foreground)}.search-box input{padding:6px 8px;min-height:30px;background:var(--background);width:100%;font-size:12px}.sidebar-content{flex:1;overflow:auto;padding:0 8px}.list-heading{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--muted-foreground);padding:0 8px;margin:8px 0 6px}.list-heading button{min-height:32px;width:32px}.directory-row{display:flex;width:100%;text-align:left;justify-content:flex-start;gap:10px;border:0;border-radius:var(--radius-md);background:transparent;padding:10px 8px;margin-bottom:3px;min-height:56px}.directory-row[aria-current=true]{background:var(--sidebar-accent);box-shadow:inset 2px 0 var(--primary)}.avatar{width:30px;height:30px;border-radius:8px;border:1px solid var(--border);background:var(--background);display:grid;place-items:center;font-size:13px;flex:none}.avatar.group{border-radius:9px;background:var(--secondary)}.row-copy{min-width:0;flex:1}.row-name{font-size:13px;font-weight:500;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.row-detail{display:block;font-size:11px;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}.row-end{align-self:center}.sidebar-footer{border-top:1px solid var(--border);padding:8px 12px 10px}.nav-link{border:0;background:transparent;justify-content:flex-start;width:100%;padding:7px 6px;font-size:12px}.nav-link .tiny{margin-left:auto}.workspace-label{display:flex;align-items:center;gap:6px;padding:8px 6px 0;font-size:11px;color:var(--muted-foreground)}.workspace-label>span:last-child{margin-left:auto}.resize-handle{width:3px;margin-left:-3px;cursor:col-resize;z-index:2}.resize-handle:hover{background:var(--ring)}.workspace{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--background)}.page-header{min-height:44px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;padding:4px 18px;flex:none}.page-heading{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.page-heading h1{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.page-heading .muted{font-size:11px;white-space:nowrap}.header-actions{display:flex;align-items:center;gap:4px}.header-actions button{font-size:12px}.menu-toggle{display:none}.page-body{flex:1;min-height:0;min-width:0;display:flex;flex-direction:column}.conversation-layout{display:flex;flex:1;min-height:0;min-width:0}.conversation-main{flex:1;min-width:0;display:flex;flex-direction:column}.messages{flex:1;min-height:0;overflow:auto;padding:32px 28px 24px;scroll-behavior:smooth}.thread{max-width:760px;margin:auto}.day-label{text-align:center;color:var(--muted-foreground);font-size:10px;margin-bottom:28px}.message{margin-bottom:28px;display:flex;gap:12px}.message.user{flex-direction:row-reverse}.message.user .message-body{background:var(--secondary);border-radius:var(--radius-xl) var(--radius-xl) 3px var(--radius-xl);padding:12px 16px;max-width:90%}.message-body{flex:1;min-width:0}.message-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px}.message-head time{font-size:10px;color:var(--muted-foreground)}.message-body p{line-height:1.8;overflow-wrap:anywhere}.message-body p+p{margin-top:10px}.message-body ul{padding-left:20px;margin:10px 0}.source-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.chip{font-size:11px;padding:3px 7px;border-radius:6px;border:1px solid var(--border);background:var(--background);display:inline-flex;align-items:center;gap:4px;min-width:0;max-width:100%;overflow-wrap:anywhere}.collaboration-card{border:1px solid var(--border);border-radius:var(--radius);margin:16px 0;overflow:hidden}.card-heading{display:flex;align-items:center;gap:8px;padding:11px 12px;background:var(--sidebar);font-size:12px}.card-heading .muted{margin-left:auto;font-size:11px}.task-row{display:flex;align-items:center;gap:10px;padding:12px;border-top:1px solid var(--border);width:100%;background:transparent;border-radius:0;border-left:0;border-right:0;border-bottom:0;text-align:left;justify-content:flex-start}.task-row .task-copy{flex:1;min-width:0}.task-row strong{display:block;font-size:12px;font-weight:500}.task-row small{display:block;color:var(--muted-foreground);font-size:11px;margin-top:3px}.task-state{font-size:11px;white-space:nowrap}.task-row .avatar{width:26px;height:26px;font-size:11px}.approval-box{padding:14px;border:1px solid color-mix(in srgb,var(--warning) 25%,var(--border));border-radius:var(--radius);margin:16px 0;background:color-mix(in srgb,var(--warning) 4%,var(--background))}.approval-box h3{display:flex;gap:6px;align-items:center;font-size:13px;margin-bottom:6px}.approval-box p{font-size:12px;color:var(--muted-foreground)}.inline-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}.inline-actions button{font-size:12px}.notice{max-width:760px;margin:0 auto 20px;border:1px solid var(--border);border-left:3px solid var(--warning);border-radius:var(--radius-sm);padding:12px 14px;font-size:12px}.notice strong{display:block;margin-bottom:3px}.notice p{color:var(--muted-foreground)}.notice .inline-actions{margin-top:8px}.composer-wrap{padding:10px 28px 16px;flex:none}.composer{max-width:760px;margin:auto;border:1px solid var(--border);border-radius:var(--radius-xl);background:var(--background);padding:10px 12px 8px;box-shadow:0 1px 3px rgb(0 0 0 / .03)}.composer textarea{border:0;resize:none;outline-offset:-2px;padding:6px 2px;min-height:62px;width:100%;max-height:160px;background:transparent;font-size:13px;line-height:1.6}.composer .source-chips{margin-top:0;margin-bottom:4px}.composer-tools{display:flex;align-items:center;gap:4px}.composer-tools .scope-button{font-size:11px;color:var(--muted-foreground);margin-right:auto}.composer-tools .send-button{width:32px;padding:0}.composer-hint{max-width:760px;display:flex;justify-content:space-between;gap:8px;margin:7px auto 0;font-size:10px;color:var(--muted-foreground)}.section-note{font-size:12px;color:var(--muted-foreground);line-height:1.7}.divider{height:1px;background:var(--border)}.content-page{overflow:auto;padding:28px;flex:1;min-width:0}.content-inner{max-width:900px;margin:auto}.section-title{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px}.section-title p{margin-top:6px;color:var(--muted-foreground);font-size:12px}.segments{display:flex;gap:2px;padding:3px;background:var(--secondary);border-radius:var(--radius-md);margin:20px 0;width:fit-content;max-width:100%;flex-wrap:wrap}.segments button{background:transparent;border-color:transparent;font-size:12px;padding:5px 12px}.segments button[aria-pressed=true]{background:var(--background);box-shadow:0 1px 3px rgb(0 0 0 / .08)}.memory-row,.setting-row{padding:16px 0;border-bottom:1px solid var(--border);display:flex;gap:14px;align-items:flex-start}.memory-row .memory-copy,.setting-copy{flex:1;min-width:0}.memory-row p{font-size:13px;overflow-wrap:anywhere}.memory-row small{display:block;color:var(--muted-foreground);font-size:11px;margin-top:5px}.memory-actions{display:flex;gap:4px}.memory-actions button{font-size:11px}.memory-tag{display:inline-block;border:1px solid var(--border);border-radius:4px;padding:0 5px;font-size:10px;margin-right:6px}.proposal{margin-top:20px;padding:16px;border:1px dashed var(--border);border-radius:var(--radius)}.proposal h3{font-size:13px;margin-bottom:8px}.proposal p{font-size:13px}.task-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:24px}.lane-title{font-size:11px;color:var(--muted-foreground);display:flex;align-items:center;gap:6px;margin-bottom:10px}.task-tile{border:1px solid var(--border);border-radius:var(--radius);padding:14px;background:var(--card);margin-bottom:10px}.task-tile h3{font-size:13px;margin:10px 0 6px}.task-tile p{font-size:12px;color:var(--muted-foreground)}.task-tile button{margin-top:12px;font-size:11px}.task-tile .badge{font-size:10px}.plan-outline{border-left:2px solid var(--border);padding-left:14px;margin:18px 0;color:var(--muted-foreground);font-size:12px}.empty-state{max-width:440px;margin:60px auto;text-align:center;padding:20px}.empty-symbol{width:48px;height:48px;display:grid;place-items:center;border:1px solid var(--border);border-radius:var(--radius-xl);margin:0 auto 20px;background:var(--sidebar)}.empty-symbol svg{width:22px;height:22px}.empty-state h2{font-size:17px}.empty-state p{font-size:13px;color:var(--muted-foreground);margin:10px 0 20px}.skeleton{height:14px;background:var(--secondary);border-radius:4px;margin-bottom:12px;max-width:80%}.skeleton.short{max-width:45%}.skeleton-block{margin:36px 0}.scrim{position:absolute;inset:0;background:rgb(0 0 0 / .25);border:0;border-radius:0;width:100%;height:100%;z-index:15}.scrim:hover{background:rgb(0 0 0 / .25)}dialog{border:1px solid var(--border);background:var(--popover);color:var(--foreground);border-radius:var(--radius-xl);width:min(560px,calc(100vw - 28px));max-height:calc(100dvh - 48px);padding:0;box-shadow:var(--shadow-floating)}dialog::backdrop{background:rgb(0 0 0 / .35)}.modal-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px 10px}.modal-header h2{font-size:16px}.modal-body{padding:4px 20px 20px;max-height:65dvh;overflow:auto}.modal-actions{border-top:1px solid var(--border);padding:12px 20px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.field{display:flex;flex-direction:column;gap:6px;margin-top:14px;font-size:12px}.field input,.field select{width:100%}.check-row{display:flex;gap:8px;align-items:flex-start;font-size:13px;padding:10px 0}.check-row input{margin-top:4px;flex:none}.diff{border:1px solid var(--border);border-radius:var(--radius-sm);overflow:auto;margin:16px 0;font:12px/1.8 "Geist Mono",ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px}.diff-add{color:var(--success);display:block}.diff-delete{color:var(--danger);display:block}.key-value{display:grid;grid-template-columns:90px 1fr;gap:9px;font-size:12px;margin:14px 0}.key-value dt{color:var(--muted-foreground)}.key-value dd{margin:0;overflow-wrap:anywhere}.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:100;padding:10px 16px;border:1px solid var(--border);background:var(--popover);border-radius:var(--radius-md);box-shadow:var(--shadow-floating);font-size:12px;width:max-content;max-width:calc(100vw - 32px)}[hidden]{display:none}.form-error{color:var(--danger);font-size:12px;margin-top:8px}.data-summary{margin:20px 0;border-top:1px solid var(--border)}.data-summary .setting-row{align-items:center}.data-summary button{font-size:12px}.review-hint{font-size:11px;color:var(--muted-foreground);margin-top:20px}
@container leaf (max-width:1100px){.page-heading .muted{display:none}.task-lanes{grid-template-columns:1fr}.messages{padding-inline:20px}.composer-wrap{padding-inline:20px}}
@container leaf (max-width:959px){.nav-zone{width:52px}.sidebar{position:absolute;left:52px;top:0;bottom:0;width:min(var(--panel-width),calc(88cqw - 52px));visibility:hidden;transform:translateX(-12px);opacity:0;transition:transform .15s,opacity .15s;box-shadow:var(--shadow-floating)}.leaf-shell.nav-open .sidebar{visibility:visible;transform:translateX(0);opacity:1}.resize-handle{display:none}.menu-toggle{display:inline-flex}.page-header{padding-inline:10px}.rail{height:100%}.content-page{padding:24px 20px}}
@container leaf (max-width:599px){.nav-zone{width:0}.rail{position:absolute;inset:0 auto 0 0;visibility:hidden}.leaf-shell.nav-open .rail{visibility:visible}.sidebar{width:min(280px,calc(88cqw - 52px))}.page-header{min-height:48px;padding-inline:8px;gap:4px}.page-heading{gap:4px}.header-actions .desktop-label{display:none}.header-actions button{min-width:36px}.messages{padding:22px 14px 16px}.message{gap:8px;margin-bottom:24px}.message>.avatar{width:25px;height:25px;font-size:11px}.message.user .message-body{max-width:100%}.composer-wrap{padding:8px 12px 12px}.composer-hint span:first-child{max-width:70%}.composer-hint span:last-child{display:none}.content-page{padding:22px 16px}.section-title{flex-direction:column;gap:10px}.memory-row{flex-wrap:wrap;gap:8px}.memory-actions{margin-left:auto}.task-state{max-width:72px;white-space:normal}.task-row{gap:7px}.card-heading .muted{max-width:90px;text-align:right}.empty-state{margin-block:36px}.sidebar-header .muted{display:none}.preview-note{display:none}.task-lanes{grid-template-columns:1fr}}
@media(max-width:600px){.preview-bar{gap:8px;min-height:44px}.preview-bar #selection-label{display:none}.scenario-label{margin-left:auto}.leaf-shell{height:calc(100dvh - 44px)}button{min-height:40px}.icon-button{width:40px}.composer-tools .send-button{width:40px}.rail button{width:40px;height:40px}.list-heading button{min-height:32px}.modal-actions button{min-height:44px}.preview-bar button,.preview-bar select{min-height:32px}.composer-tools .scope-button{font-size:10px;padding-inline:4px}}
@media(pointer:coarse){button,input,select{min-height:44px}.icon-button{width:44px}.directory-row{min-height:60px}}
@media(prefers-reduced-motion:reduce){.sidebar{transition:none}.messages{scroll-behavior:auto}}
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/app.js -->
```javascript
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {
    home:'<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
    bot:'<rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M8 12v2m8-2v2m-7 3h6M1 12h3m16 0h3"/>',
    branch:'<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="11" r="2"/><path d="M6 7v10m0-5h6a6 6 0 0 0 6-3"/>',
    database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
    settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="7" cy="18" r="2"/>',
    plus:'<path d="M12 4v16M4 12h16"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    memory:'<path d="M5 4h14v16H5zM8 8h8M8 12h5M8 16h7"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',close:'<path d="m5 5 14 14M5 19 19 5"/>',
    file:'<path d="M5 3h9l5 5v13H5zM14 3v5h5M8 13h8M8 17h6"/>',send:'<path d="M12 20V4m-7 7 7-7 7 7"/>',
    check:'<path d="m4 12 5 5L20 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6m0 4a5 5 0 0 1 5 5v2"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.bot}</svg>`;
  function decorate(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
  const bots = [
    {id:'coordinator',name:'协调员',initial:'协',description:'规划任务，把结果整理给你',model:'OpenAI · Responses',enabled:true},
    {id:'researcher',name:'资料助手',initial:'资',description:'从附加资料中提取事实与来源',model:'OpenAI · Chat Completions',enabled:true},
    {id:'writer',name:'写作助手',initial:'写',description:'把材料组织成清晰的文字',model:'Anthropic · Messages',enabled:true},
    {id:'reviewer',name:'审校助手',initial:'审',description:'核对表述、来源和遗漏',model:'OpenAI · Responses',enabled:true}
  ];
  const state = {page:'chat',selection:'weekly',group:true,scenario:'normal',run:'approval',drafts:{},messages:{},scope:'private',memoryOwner:'coordinator',auto:{},deletedSessions:new Set(),attachments:['项目周记.md','会议记录.md'],mentions:[],groups:[{id:'weekly',name:'周报协作',members:['coordinator','researcher','writer'],leader:'coordinator'},{id:'reading',name:'阅读小组',members:['coordinator','researcher'],leader:'coordinator'}],globalConfirmed:false,proposalDismissed:false,profileCleared:false,localRuns:{},runEpochs:{},forgotten:new Set(),corrected:{},childCanceled:false,retained:false,purged:false,epoch:0};
  const leaf = $('#leaf'), modal = $('#modal'), workspace = $('#workspace');
  let lastFocus = null, toastTimer, navLastFocus = null;
  const currentBot = () => bots.find(b => b.id === state.selection) || bots.find(b => b.id === state.memoryOwner) || bots[0] || {id:'none',name:'新的 Bot',initial:'新',description:'开始新的对话',model:'尚未配置模型',enabled:true};
  const currentGroup = () => state.groups.find(g => g.id === state.selection) || state.groups[0];
  const autoEnabled = id => state.auto[id] !== false;
  const invalidateRun = id => (state.runEpochs[id]=(state.runEpochs[id]||0)+1);
  const memoryText = key => state.corrected[key] || ({global:'偏好使用中文沟通，必要时保留技术术语。',coordinator:'整理周报时，先列结论，再列来源与下一步。',researcher:'来源核查需要保留笔记名称与内容版本。',writer:'输出偏好简洁中文，避免重复铺陈。',reviewer:'审校时优先标出不确定表述和缺失引用。'})[key] || '';
  const weeklyLabel = () => ({approval:'周报草稿 · 等你确认',running:'周报整理 · 进行中',completed:'周报整理 · 已完成',canceled:'周报整理 · 已停止',unknown:'笔记写入 · 待核查',interrupted:'周报整理 · 可恢复'})[state.run] || '周报协作 · 空闲';
  const btn = (action, text, cls = '', extra = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
  function toast(message) { const el=$('#toast'); clearTimeout(toastTimer); el.textContent=message; el.hidden=false; toastTimer=setTimeout(()=>{el.hidden=true;},4200); }
  function rememberDraft() { const el=$('#draft'); if(el) state.drafts[state.selection]=el.value; }
  function renderDirectory() {
    if(state.profileCleared){$('#directory').innerHTML='<p class="review-hint">本机 Profile 已清除。刷新可重置离线示例。</p>';return;}
    const search=$('#search').value.trim().toLowerCase();
    const visible=bots.filter(b => `${b.name}${b.description}`.toLowerCase().includes(search));
    const groups=state.groups.filter(g=>g.name.toLowerCase().includes(search));
    const long=state.scenario==='long';
    $('#directory').innerHTML=`<div class="list-heading"><span>我的 Bot <span class="count">${bots.length}</span></span>${btn('new-bot',icon('plus'),'icon-button','aria-label="创建 Bot"')}</div>${visible.map((b,i)=>`<button type="button" class="directory-row" data-action="select" data-id="${esc(b.id)}" aria-current="${state.selection===b.id}" title="${esc(b.name)}"><span class="avatar">${esc(b.initial)}</span><span class="row-copy"><span class="row-name">${esc(long&&i===1?'负责所有跨部门研究与超长文档来源核查的资料助手':b.name)}</span><span class="row-detail">${esc(!b.enabled?'已停用':b.description)}</span></span><span class="row-end dot ${b.id==='writer'&&state.run==='approval'?'warning':b.id==='researcher'?'success':''}" aria-label="${b.enabled?'可用':'已停用'}"></span></button>`).join('')}<div class="list-heading"><span>群聊</span>${btn('new-group',icon('plus'),'icon-button','aria-label="创建群聊"')}</div>${groups.map(g=>`<button type="button" class="directory-row" data-action="select-group" data-id="${esc(g.id)}" aria-current="${state.selection===g.id}"><span class="avatar group">${icon('people')}</span><span class="row-copy"><span class="row-name">${esc(g.name)}</span><span class="row-detail">${g.id==='weekly'?weeklyLabel():`${g.members.length} 位成员 · 空闲`}</span></span>${g.id==='weekly'&&['approval','unknown','interrupted'].includes(state.run)?'<span class="count">1</span>':''}</button>`).join('')}${!visible.length&&!groups.length?'<p class="section-note review-hint">没有匹配结果，试试 Bot 名称或职责。</p>':''}`;
  }
  function taskRows() {
    const done=state.run==='completed',cancel=state.run==='canceled';
    return `<button type="button" class="task-row" data-action="task-detail" data-task="research"><span class="avatar">资</span><span class="task-copy"><strong>提取本周进展</strong><small>已有 Bot · 资料助手</small></span><span class="task-state success">已完成</span>${icon('chevron')}</button><button type="button" class="task-row" data-action="task-detail" data-task="write"><span class="avatar">写</span><span class="task-copy"><strong>整理周报草稿</strong><small>协调员 → 写作助手</small></span><span class="task-state ${done?'success':'warning'}">${done?'已完成':cancel?'已取消':state.run==='unknown'?'待核查':state.run==='running'?'进行中':'待审批'}</span>${icon('chevron')}</button><button type="button" class="task-row" data-action="task-detail" data-task="temp"><span class="avatar">临</span><span class="task-copy"><strong>复核资料引用</strong><small>写作助手 → 临时 sub-agent</small></span><span class="task-state">${state.childCanceled||cancel?'已取消':done?'已完成':'等待上游'}</span>${icon('chevron')}</button>`;
  }
  function collaborationCard() { return `<div class="collaboration-card"><div class="card-heading">${icon('branch')}<strong>周报整理</strong><span class="muted">2 位 Bot · 1 个临时任务</span></div>${taskRows()}</div>`; }
  function banner() {
    const map={offline:['连接已断开','已保存的内容仍可阅读。连接恢复前不能发送或批准写入。','reconnect','重新连接'],error:['这次请求没有完成','模型服务暂时不可用，草稿和已返回内容已保留。','retry','重试'],permission:['需要资料授权','这次任务请求读取未附加资料。请先核对范围和接收方。','access','查看资料范围'],recovery:['任务可以恢复','已核查上下文与效果。继续会产生后续模型调用，由你决定。','resume','继续任务'],unknown:['笔记写入结果待核查','可能已经写入，暂时不能重复执行。可以先清除正文并保留最小核查记录。','reconcile','查看核查'],canceled:['任务已停止','已有结果保留。已发生的笔记改动不会回滚。','new-turn','发起新一轮']};
    const item=map[state.scenario] || (state.run==='canceled'?map.canceled:null);
    return item?`<div class="notice" role="status"><strong>${item[0]}</strong><p>${item[1]}</p><div class="inline-actions">${btn(item[2],item[3])}</div></div>`:'';
  }
  function messages() {
    const sent=state.messages[state.selection] || [];
    if(state.scenario==='loading') return '<div class="skeleton-block" role="status" aria-label="正在加载会话"><div class="skeleton"></div><div class="skeleton short"></div><div class="skeleton"></div><p class="section-note">正在读取已保存的对话…</p></div>';
    if(!sent.length&&(state.scenario==='empty'||state.deletedSessions.has(state.selection)||(state.group&&state.selection!=='weekly'))) return `<div class="empty-state"><div class="empty-symbol">${icon('bot')}</div><h2>${state.group?'一起把事情做好':'你好，我是'+esc(currentBot().name)}</h2><p>${state.retained?'会话正文已清除，仍保留一条未决效果核查记录。':'告诉我你想完成什么。可以附加笔记，或 @ 需要参与的 Bot。'}</p>${btn('draft-example','帮我整理本周进展','quiet')}</div>`;
    let content=state.group&&state.selection==='weekly'&&!state.deletedSessions.has('weekly')?`<div class="day-label">今天 · 10 月 25 日</div><article class="message user"><div class="message-body"><p>帮我整理本周项目进展，做成一份简洁的周报。请资料助手核对信息，写作助手整理成文。</p><div class="source-chips"><span class="chip">${icon('file')}项目周记.md</span><span class="chip">${icon('file')}会议记录.md</span></div></div></article><article class="message"><span class="avatar">协</span><div class="message-body"><div class="message-head"><strong>协调员</strong><span class="badge">协调者</span><time>10:24</time></div><p>我会先核对两份资料，再整理周报。写作助手会使用一个临时任务检查引用，完成后由我汇总给你。</p>${collaborationCard()}${state.run==='completed'?`<p>周报已整理完成，包含 <strong>本周完成、进行中的事项、下周计划</strong> 三部分。</p><div class="source-chips"><span class="chip">${icon('file')}项目周报.md</span><span class="badge success">已保存</span></div>`:state.run==='canceled'?'<p>这轮任务已停止。资料核对的结果保留，未完成部分可以另开一轮处理。</p>':state.run==='unknown'?'<p>写作助手未收到确定的写入回执，需要先核查结果。</p>':state.run==='running'?'<p role="status">成员正在继续工作，结果会在这里更新。</p>':`<div class="approval-box"><h3>${icon('shield')}周报草稿已就绪</h3><p>写作助手希望创建「项目周报.md」。请查看内容后决定是否写入。</p><div class="inline-actions">${btn('approval','查看并确认','primary')}${btn('reject','暂不写入','quiet')}</div></div>`}</div></article>`:`<div class="day-label">${state.group?esc(currentGroup().name):'与 '+esc(currentBot().name)+' 的单聊'}</div><article class="message"><span class="avatar">${esc(currentBot().initial)}</span><div class="message-body"><div class="message-head"><strong>${esc(currentBot().name)}</strong></div><p>${state.group?'这里是独立的群聊上下文；协调者负责默认回应，@ 后由选中成员回应。':'我可以'+esc(currentBot().description)+'。这段单聊使用我的独立上下文；需要协作时，我会说明任务和参与者。'}</p><div class="inline-actions">${btn('draft-example','整理一份周报','quiet')}${btn('new-group','邀请 Bot 建群','quiet')}</div></div></article>`;
    content += sent.map(m=>`<article class="message ${m.role==='user'?'user':''}">${m.role==='user'?'':'<span class="avatar">协</span>'}<div class="message-body">${m.role==='user'?'':'<div class="message-head"><strong>'+esc(state.group?'协调员':currentBot().name)+'</strong></div>'}<p>${esc(m.text)}</p></div></article>`).join('');
    return content;
  }
  const activeRun = () => state.selection==='weekly'?state.run:(state.localRuns[state.selection]||'idle');
  function composer() {
    const blocked=['offline','loading','recovery','unknown'].includes(state.scenario);
    return `<div class="composer-wrap"><div class="composer"><div class="source-chips">${state.attachments.map(n=>`<button type="button" class="chip" data-action="attachments">${icon('file')}${esc(n)}</button>`).join('')}${state.mentions.map(id=>`<span class="chip">@${esc(bots.find(b=>b.id===id)?.name || id)}</span>`).join('')}</div><label class="sr-only" hidden for="draft">消息</label><textarea id="draft" aria-label="发送给当前 Bot 或群聊的消息" placeholder="${state.group?'发给协调员，或 @ 指定成员…':'告诉我你想做什么…'}" ${blocked?'disabled':''}>${esc(state.drafts[state.selection]||'')}</textarea><div class="composer-tools">${btn('attachments',icon('plus'),'icon-button','aria-label="附加资料"')}${btn('mention','@','icon-button','aria-label="选择要回应的 Bot"')}${btn('access',state.attachments.length?'仅附加资料':'未附加资料','quiet scope-button')}${btn(activeRun()==='running'?'cancel':'send',icon(activeRun()==='running'?'stop':'send'),'primary send-button',`aria-label="${activeRun()==='running'?'停止任务':'发送消息'}" ${blocked?'disabled':''}`)}</div></div><div class="composer-hint"><span>${state.group?'协调员统筹 · 可按任务派遣其他 Bot':esc(currentBot().model)}${activeRun()==='running'?' · 运行中':''}</span><span>Enter 发送 · Shift + Enter 换行</span></div></div>`;
  }
  function chatView() {
    if(state.profileCleared)return `<div class="empty-state"><div class="empty-symbol">${icon('bot')}</div><h2>本机 Profile 已清除</h2><p>当前离线示例已清空。正式产品会进入初次配置；这里可重置并重新体验。</p>${btn('reset-demo','重置离线示例','primary')}</div>`;
    return `<div class="conversation-layout"><div class="conversation-main"><div class="messages"><div class="thread">${banner()}${messages()}</div></div>${composer()}</div></div>`;
  }
  function taskBoard() {
    return `<div class="section-title"><div><h2>整理本周项目进展</h2><p>协调员统筹 · 资料助手、写作助手参与 · 一次发送产生的任务</p></div>${btn('cancel','停止整项任务','quiet')}</div>${banner()}<div class="plan-outline">提取进展 → 整理草稿 → 核对引用 → 你确认后写入笔记</div><div class="task-lanes"><section><h3 class="lane-title"><span class="dot success"></span>已完成</h3><article class="task-tile"><span class="badge">已有 Bot · 资料助手</span><h3>提取本周进展</h3><p>核对两份资料，整理出 3 项完成、2 项进行中。</p>${btn('task-detail','查看结果','quiet','data-task="research"')}</article></section><section><h3 class="lane-title"><span class="dot warning"></span>${state.run==='completed'?'已完成':'需要处理'}</h3><article class="task-tile"><span class="badge">已有 Bot · 写作助手</span><h3>整理周报草稿</h3><p>${state.run==='completed'?'结果已保存并返回协调员。':state.run==='canceled'?'已取消。保留完成的草稿。':state.run==='unknown'?'写入回执丢失，需要先核查。':'草稿已就绪，等待确认写入「项目周报.md」。'}</p>${btn('task-detail','查看任务','quiet','data-task="write"')}</article></section><section><h3 class="lane-title"><span class="dot"></span>子任务</h3><article class="task-tile"><span class="badge">临时 sub-agent</span><h3>复核资料引用</h3><p>由写作助手创建，只使用本任务上下文。${state.childCanceled?'已停止。':''}</p>${btn('task-detail','查看关系','quiet','data-task="temp"')}</article></section></div><p class="review-hint">用量：根任务与所有子执行合并统计。当前示例不产生实际费用。</p>`;
  }
  function memoryView() {
    const bot=bots.find(b=>b.id===state.memoryOwner)||bots[0];
    const privateText=memoryText(bot.id);
    const global=state.scope==='global',short=state.scope==='short';
    const key=global?'global':bot.id;
    return `<div class="content-page"><div class="content-inner"><div class="section-title"><div><h2>记忆</h2><p>每个 Bot 有自己的记忆。全局记忆经你确认后共享。</p></div><label class="small">查看 Bot <select id="memory-owner" aria-label="选择记忆所属 Bot">${bots.map(b=>`<option value="${esc(b.id)}" ${b.id===bot.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></label></div><div class="segments" aria-label="记忆作用域">${[['private','私有长期'],['global','全局长期'],['short','本轮上下文']].map(([id,label])=>btn('memory-scope',label,'',`data-scope="${id}" aria-pressed="${state.scope===id}"`)).join('')}</div>${short?`<div class="notice"><strong>${esc(bot.name)} · 本轮工作上下文</strong><p>仅本线程使用。包含明确共享的任务、两份资料和工作摘要，不包含其他 Bot 的私聊。</p></div><div class="memory-row"><div class="memory-copy"><p>任务：整理周报；约束：简洁中文、附来源。</p><small>随任务保存以便恢复；不会自动成为全局记忆。</small></div></div>`:`<div class="setting-row"><div class="setting-copy"><h3>${global?'共享范围：当前本机 Profile':'自动维护私有记忆'}</h3><p class="section-note">${global?'所有 Bot 可在资料授权允许的范围内使用；任何变更都需确认。':'在交互后提炼有用信息，可能消耗模型额度。你可以暂停、纠正或忘记。'}</p></div>${global?'<span class="badge">需你确认</span>':btn('toggle-memory',autoEnabled(bot.id)?'已开启':'已暂停','',`aria-pressed="${autoEnabled(bot.id)}"`)}</div>${memoryText(key)&&!state.forgotten.has(key)?`<article class="memory-row"><div class="memory-copy"><p>${esc(global?memoryText('global'):privateText)}</p><small><span class="memory-tag">${global?'你已确认':state.corrected[key]?'你已固定':'自动提炼'}</span>${global?'Profile 共享':'仅 '+esc(bot.name)} · 来源：周报偏好对话 · 修订 ${state.corrected[key]?'2':'1'}</small></div><div class="memory-actions">${btn('memory-source','来源','quiet')}${btn('correct-memory','修正','quiet')}${btn('forget-memory','忘记','quiet')}</div></article>`:'<div class="empty-state"><h2>还没有有效记忆</h2><p>忘记的条目不会由旧提炼作业重新写回。</p></div>'}${global&&state.globalConfirmed?'<article class="memory-row"><div class="memory-copy"><p>每周五整理项目周报，包含完成、进行中和下一步。</p><small><span class="memory-tag">你已确认</span>来源：协调员提案 · Profile 共享</small></div></article>':''}${global&&!state.globalConfirmed&&!state.proposalDismissed?`<div class="proposal"><h3>协调员提议保存到全局</h3><p>每周五整理项目周报，包含完成、进行中和下一步。</p><p class="section-note">确认前，其他 Bot 不会召回这条提案。</p><div class="inline-actions">${btn('global-proposal','查看并确认','primary')}${btn('dismiss-proposal','拒绝','quiet')}</div></div>`:''}`}</div></div>`;
  }
  function agentView() {
    const b=currentBot();
    return `<div class="content-page"><div class="content-inner"><div class="section-title"><div><h2>${esc(b.name)}</h2><p>${esc(b.description)}</p></div>${btn('edit-bot','编辑 Bot','primary')}</div><div class="setting-row"><div class="setting-copy"><h3>模型</h3><p class="section-note">${esc(b.model)} · 新任务使用当前配置</p></div>${btn('model','管理','quiet')}</div><div class="setting-row"><div class="setting-copy"><h3>人格与职责</h3><p class="section-note">${esc(b.description)}。需要协作时发现已有 Bot，明确任务和资料范围。</p></div><span class="badge">修订 ${b.revision||1}</span></div><div class="setting-row"><div class="setting-copy"><h3>私有记忆</h3><p class="section-note">独立维护，其他 Bot 不能直接读取。</p></div>${btn('memory','查看','quiet')}</div><div class="setting-row"><div class="setting-copy"><h3>可用状态</h3><p class="section-note">停用前会检查活动任务。停用保留历史和记忆。</p></div>${btn('disable-bot',b.enabled?'停用 Bot':'重新启用','quiet')}</div></div></div>`;
  }
  function accessView() { return `<div class="content-page"><div class="content-inner"><div class="section-title"><div><h2>资料与权限</h2><p>限定资料，也限定接收资料的模型。协作不会自动扩大范围。</p></div>${btn('grant','增加授权','primary')}</div><div class="setting-row"><div class="setting-copy"><h3>当前只使用明确附加资料</h3><p class="section-note">${state.attachments.map(esc).join('、')||'尚未附加资料'}</p></div>${btn('attachments','调整','quiet')}</div><div class="setting-row"><div class="setting-copy"><h3>参与 Bot 的接收方</h3><p class="section-note">协调员：OpenAI Responses；资料助手：OpenAI Chat Completions；写作助手：Anthropic Messages。未授权目的地会在执行前停止。</p></div>${btn('model','查看模型','quiet')}</div><div class="setting-row"><div class="setting-copy"><h3>笔记写入</h3><p class="section-note">每个创建/改写动作先预览，由你逐次确认。</p></div><span class="badge">单次审批</span></div>${state.scenario==='permission'?'<div class="notice"><strong>尚未授予项目文件夹访问</strong><p>这次请求没有读取文件夹内容。可以明确授权，或只附加需要的文件。</p></div>':''}<div class="inline-actions">${btn('revoke','撤销本轮资料授权','quiet danger')}${btn('chat','返回对话','quiet')}</div></div></div>`; }
  function dataView() { return `<div class="content-page"><div class="content-inner"><div class="section-title"><div><h2>本机数据</h2><p>停用或卸载默认保留。永久清除前会列出范围与保留项。</p></div></div>${state.retained?'<div class="notice"><strong>正文已清除，仍保留 1 条核查记录</strong><p>写入结果尚未确定。核查后可清除剩余安全记录。</p></div>':''}<div class="data-summary"><div class="setting-row"><div class="setting-copy"><h3>当前会话</h3><p class="section-note">消息、子任务上下文、摘要和自动来源记忆</p></div>${btn('delete-session','永久清除…','danger')}</div><div class="setting-row"><div class="setting-copy"><h3>整个本机 Profile</h3><p class="section-note">所有 Bot、历史、记忆与受管副本；不包含 Vault 笔记</p></div>${btn('delete-profile','清除 Profile…','danger')}</div></div><p class="section-note">包含未知效果时，可以先清除会话正文。完整 Profile 清除须等待核查完成；用户导出和模型服务端的数据不在本机清除范围。</p></div></div>`; }
  function render() {
    const hadFocus=$('#page-body').contains(document.activeElement);
    const focusAction=document.activeElement?.dataset?.action;
    if(state.profileCleared)state.page='chat';
    renderDirectory();
    const titles={chat:state.group?currentGroup()?.name:currentBot()?.name,tasks:'协作任务',memory:'记忆',agent:currentBot()?.name,access:'资料与权限',data:'本机数据'};
    $('#page-title').textContent=state.profileCleared?'新的开始':titles[state.page]||'Bot';
    $('#page-subtitle').textContent=state.profileCleared?'离线示例已清除':state.page==='chat'?(state.group?`${bots.find(b=>b.id===currentGroup()?.leader)?.name||'协调员'} · ${currentGroup()?.members.length||0} 位成员`:currentBot()?.model):'Bot 工作台';
    $('#page-body').innerHTML=({chat:chatView,tasks:()=>`<div class="content-page"><div class="content-inner">${taskBoard()}<div class="inline-actions">${btn('chat','返回对话','quiet')}</div></div></div>`,memory:memoryView,agent:agentView,access:accessView,data:dataView}[state.page]||chatView)();
    const draft=$('#draft');
    draft?.addEventListener('input',()=>{state.drafts[state.selection]=draft.value;});
    draft?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();send();}});
    $('#memory-owner')?.addEventListener('change',e=>{state.memoryOwner=e.target.value;render();});
    decorate();
    if(hadFocus){const replacement=[...$('#page-body').querySelectorAll('[data-action]')].find(el=>el.dataset.action===focusAction);if(replacement)replacement.focus();else{$('#page-title').tabIndex=-1;$('#page-title').focus();}}
  }
  function go(page) { rememberDraft();state.page=page;closeNav();render();$('#page-title').tabIndex=-1;$('#page-title').focus(); }
  function showDialog(title,body,actions) { rememberDraft(); if(modal.open) modal.close();lastFocus=document.activeElement;$('#modal-title').textContent=title;$('#modal-body').innerHTML=body;$('#modal-actions').innerHTML=actions||btn('close-modal','关闭');decorate(modal);modal.showModal(); }
  function closeDialog() { if(modal.open)modal.close(); if(lastFocus?.isConnected)lastFocus.focus(); }
  modal.addEventListener('cancel',()=>{if(lastFocus?.isConnected)lastFocus.focus();});
  $('#modal-form').addEventListener('submit',e=>e.preventDefault());
  function closeNav() {leaf.classList.remove('nav-open');$('#scrim').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false');workspace.inert=false;$('#nav-zone').removeAttribute('role');$('#nav-zone').removeAttribute('aria-modal');applyLayout();}
  function openNav() {if(leaf.dataset.size==='wide')return;navLastFocus=document.activeElement;leaf.classList.add('nav-open');$('#scrim').hidden=false;$('#menu-toggle').setAttribute('aria-expanded','true');workspace.inert=true;$('#sidebar').inert=false;$('.rail').inert=false;$('#nav-zone').setAttribute('role','dialog');$('#nav-zone').setAttribute('aria-modal','true');$('#nav-zone').setAttribute('aria-label','Bot 导航');$('#search').focus();}
  function applyLayout() {const width=leaf.clientWidth;leaf.dataset.size=width>=960?'wide':width>=600?'medium':'narrow';const open=leaf.classList.contains('nav-open');$('#sidebar').inert=width<960&&!open;$('.rail').inert=width<600&&!open;if(width>=960&&open)closeNav();}
  new ResizeObserver(applyLayout).observe(leaf);
  document.addEventListener('keydown',e=>{if(!leaf.classList.contains('nav-open')||modal.open)return;if(e.key==='Escape'){e.preventDefault();closeNav();navLastFocus?.focus();}if(e.key==='Tab'){const all=[...$('#nav-zone').querySelectorAll('button,input,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!all.length)return;const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  let panelWidth=280;
  function resizePanel(width) { panelWidth=Math.max(220,Math.min(500,width));leaf.style.setProperty('--panel-width',`${panelWidth}px`);$('#resize-handle').setAttribute('aria-valuenow',String(panelWidth)); }
  // This style property is set by trusted local script; no user text enters CSS.
  $('#resize-handle').addEventListener('keydown',e=>{const choices={ArrowLeft:panelWidth-8,ArrowRight:panelWidth+8,Home:220,End:500};if(e.key in choices){e.preventDefault();resizePanel(choices[e.key]);}});
  $('#resize-handle').addEventListener('dblclick',()=>resizePanel(280));
  $('#resize-handle').addEventListener('pointerdown',e=>{e.currentTarget.setPointerCapture(e.pointerId);const origin=e.clientX,start=panelWidth;const move=ev=>resizePanel(start+ev.clientX-origin);const up=()=>{$('#resize-handle').removeEventListener('pointermove',move);};$('#resize-handle').addEventListener('pointermove',move);$('#resize-handle').addEventListener('pointerup',up,{once:true});$('#resize-handle').addEventListener('pointercancel',up,{once:true});});
  $('#search').addEventListener('input',renderDirectory);
  $('#scenario').addEventListener('change',e=>{rememberDraft();state.scenario=e.target.value;state.epoch++;state.run=({recovery:'interrupted',unknown:'unknown',canceled:'canceled'})[state.scenario]||'approval';state.purged=false;state.page='chat';render();});
  function send() {
    const draft=$('#draft'); if(!draft||draft.disabled)return;
    const text=draft.value.trim();if(!text){toast('先写下你想完成的事情。');draft.focus();return;}
    if(['running','approval','interrupted','unknown'].includes(activeRun())){toast('本轮仍在执行或等待处理。请先处理任务，草稿已保留。');return;}
    if(!state.group&&!currentBot().enabled){toast('这个 Bot 已停用，请先启用。');return;}
    const key=state.selection;state.messages[key]||=[];state.messages[key].push({role:'user',text});state.drafts[key]='';state.scenario='normal';if(key==='weekly')state.run='running';else state.localRuns[key]='running';$('#scenario').value='normal';const epoch=state.epoch,runEpoch=invalidateRun(key);render();
    setTimeout(()=>{if(state.epoch!==epoch||state.runEpochs[key]!==runEpoch)return;state.messages[key].push({role:'assistant',text:'已收到。本演示会把任务交给已有 Bot，并保留每个参与者的独立上下文。需要写笔记时，会先给你预览。'});if(key==='weekly')state.run='approval';else state.localRuns[key]='idle';render();},600);
  }
  document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el||el.disabled)return;const action=el.dataset.action;
    if(state.profileCleared&&!['theme','reset-demo','home','toggle-nav','close-nav','close-modal'].includes(action)){toast('Profile 已清除，请先重置离线示例。');return;}
    switch(action){
      case 'reset-demo':location.reload();break;
      case 'theme':document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';break;
      case 'toggle-nav':leaf.classList.contains('nav-open')?closeNav():openNav();break;
      case 'close-nav':closeNav();navLastFocus?.focus();break;
      case 'close-modal':closeDialog();break;
      case 'home':toast('此原型只包含 Bot 工作台，HUHU 其他模块沿用现有页面。');break;
      case 'chat':case 'tasks':case 'memory':case 'access':case 'data':go(action);break;
      case 'settings':go('agent');break;
      case 'select':rememberDraft();state.selection=el.dataset.id;state.memoryOwner=el.dataset.id;state.group=false;state.mentions=[];state.scenario='normal';go('chat');break;
      case 'select-group':rememberDraft();state.selection=el.dataset.id;state.group=true;state.mentions=[];state.scenario='normal';go('chat');break;
      case 'details':state.group?showDialog('群聊详情',`<p class="section-note">${esc(currentGroup().name)} · 协调者负责默认回应，成员也可以派遣任务。</p><dl class="key-value"><dt>协调者</dt><dd>${esc(bots.find(b=>b.id===currentGroup().leader)?.name)}</dd><dt>成员</dt><dd>${currentGroup().members.map(id=>esc(bots.find(b=>b.id===id)?.name||id)).join('、')}</dd><dt>消息路由</dt><dd>未 @ 时由协调者回应；@ 时仅选中成员回应。</dd></dl><p class="section-note">更换协调者前，请先结束当前活动任务。</p>`,btn('close-modal','关闭')+btn('new-group','创建另一个群聊','primary')):go('agent');break;
      case 'new-bot':case 'edit-bot':{const b=action==='edit-bot'?currentBot():null;showDialog(b?'编辑 Bot':'创建 Bot',`<p class="section-note">持久 Bot 会显示在左侧，并拥有独立记忆。临时 sub-agent 不需要在这里创建。</p><label class="field">名称<input id="bot-name" required maxlength="80" value="${esc(b?.name||'')}" placeholder="例如：阅读助手"></label><label class="field">职责描述<textarea id="bot-description" maxlength="600" placeholder="擅长什么，什么时候可以请它协作">${esc(b?.description||'')}</textarea></label><label class="field">模型协议<select id="bot-model"><option>OpenAI · Responses</option><option>OpenAI · Chat Completions</option><option>Anthropic · Messages</option></select></label><p id="form-error" class="form-error" role="alert"></p>`,btn('close-modal','取消')+btn('save-bot',b?'保存修订':'创建 Bot','primary',`data-edit="${b?esc(b.id):''}"`));if(b)$('#bot-model').value=b.model;break;}
      case 'save-bot':{const name=$('#bot-name').value.trim(),description=$('#bot-description').value.trim();if(!name||!description){$('#form-error').textContent='请填写名称和职责描述。';return;}const b=bots.find(b=>b.id===el.dataset.edit);if(b){b.name=name;b.description=description;b.model=$('#bot-model').value;b.revision=(b.revision||1)+1;}else{const id=`bot-${bots.length+1}`;bots.push({id,name,initial:name.slice(0,1),description,model:$('#bot-model').value,enabled:true});state.selection=id;state.memoryOwner=id;state.group=false;}closeDialog();go('agent');toast('Bot 配置已在本次演示中保存。');break;}
      case 'new-group':showDialog('创建协作群聊',`<label class="field">群聊名称<input id="group-name" maxlength="80" value="新的协作"></label><p class="section-note">选择已有 Bot。群聊使用独立工作线程，成员不会取得彼此私聊。</p>${bots.filter(b=>b.enabled).map(b=>`<label class="check-row"><input type="checkbox" name="member" value="${esc(b.id)}" ${b.id==='coordinator'||b.id==='writer'?'checked':''}>${esc(b.name)} <span class="muted small">${esc(b.description)}</span></label>`).join('')}<label class="field">协调者<select id="group-leader">${bots.filter(b=>b.enabled).map(b=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select></label><p id="form-error" class="form-error" role="alert"></p>`,btn('close-modal','取消')+btn('save-group','创建群聊','primary'));break;
      case 'save-group':{const members=[...modal.querySelectorAll('input[name=member]:checked')].map(n=>n.value),leader=$('#group-leader').value,name=$('#group-name').value.trim();if(!name||members.length<2||!members.includes(leader)){$('#form-error').textContent='请填写名称，选择至少两位成员，并把协调者包含在内。';return;}const id=`group-${state.groups.length+1}`;state.groups.push({id,name,members,leader});state.selection=id;state.group=true;state.scenario='empty';closeDialog();go('chat');break;}
      case 'model':showDialog('模型与接收方',`<p class="section-note">首版支持三种协议；更换接收方后重新核对资料授权。</p><label class="field">协议<select id="protocol"><option>OpenAI Chat Completions</option><option>OpenAI Responses</option><option>Anthropic Messages</option></select></label><label class="field">模型 ID<input value="演示模型" aria-describedby="model-help"></label><p id="model-help" class="section-note">这里没有密钥输入，也不会连接模型服务。</p>`,btn('close-modal','关闭')+btn('mock-model-test','演示连接检查','primary'));break;
      case 'mock-model-test':toast('演示反馈：配置检查完成；真实服务尚未连接或验证。');break;
      case 'disable-bot':{const b=currentBot();if(b.enabled&&(['running','approval','interrupted','unknown'].includes(state.localRuns[b.id])||(['running','approval','interrupted','unknown'].includes(state.run)&&state.groups[0].members.includes(b.id)))){toast('这个 Bot 还有活动任务，请先停止并完成收尾。');return;}b.enabled=!b.enabled;render();toast(b.enabled?'Bot 已启用。':'Bot 已停用，历史和记忆保留。');break;}
      case 'draft-example':state.drafts[state.selection]='请基于我附加的资料，整理本周项目进展。';state.scenario='normal';render();$('#draft')?.focus();break;
      case 'send':send();break;
      case 'mention':showDialog('选择回应的 Bot',`<p class="section-note">选中成员后，这条消息只唤醒他们；其他成员不会自动回复。</p>${bots.filter(b=>b.enabled&&(!state.group||currentGroup().members.includes(b.id))).map(b=>`<label class="check-row"><input name="mention" type="checkbox" value="${esc(b.id)}" ${state.mentions.includes(b.id)?'checked':''}>${esc(b.name)}</label>`).join('')}`,btn('close-modal','取消')+btn('save-mentions','加入消息','primary'));break;
      case 'save-mentions':state.mentions=[...modal.querySelectorAll('input[name=mention]:checked')].map(n=>n.value);closeDialog();render();$('#draft')?.focus();break;
      case 'attachments':showDialog('附加资料',`<p class="section-note">仅勾选的资料进入本轮上下文。此处为离线示例文件。</p>${['项目周记.md','会议记录.md','路线图.md'].map(n=>`<label class="check-row"><input type="checkbox" name="attachment" value="${esc(n)}" ${state.attachments.includes(n)?'checked':''}>${esc(n)}</label>`).join('')}`,btn('close-modal','取消')+btn('save-attachments','使用所选资料','primary'));break;
      case 'save-attachments':state.attachments=[...modal.querySelectorAll('input[name=attachment]:checked')].map(n=>n.value);closeDialog();render();break;
      case 'grant':showDialog('增加资料授权','<p class="section-note">本次可选择文件夹或全库，并明确接收方。授权可以撤销。</p><label class="field">范围<select id="grant-scope"><option>项目文件夹</option><option>整个知识库</option></select></label><label class="check-row"><input id="grant-recipient" type="checkbox">允许当前团队已配置的 OpenAI 与 Anthropic 模型接收所选资料</label><p id="form-error" class="form-error" role="alert"></p>',btn('close-modal','取消')+btn('save-grant','确认授权','primary'));break;
      case 'save-grant':if(!$('#grant-recipient').checked){$('#form-error').textContent='请明确是否授权这些接收方。';return;}closeDialog();state.scenario='normal';render();toast('演示授权已记录；后续执行仍检查范围与接收方。');break;
      case 'revoke':state.attachments=[];state.scenario='permission';invalidateRun(state.selection);render();toast('本轮资料授权已撤销，后续读取与外发停止。');break;
      case 'approval':showDialog('确认创建笔记',`<p class="section-note">写作助手 · 周报整理。仅这一次操作有效。</p><dl class="key-value"><dt>目标</dt><dd>项目周报.md</dd><dt>操作</dt><dd>创建新笔记 · 目标尚不存在</dd><dt>来源</dt><dd>项目周记.md、会议记录.md</dd></dl><pre class="diff"><span class="diff-add">+ # 本周项目进展
+
+ ## 已完成
+ - 完成需求梳理与协作流程设计。
+ ## 进行中
+ - 核对资料与工程接口。
+ ## 下一步
+ - 完成评审并推进实施。</span></pre><p class="section-note">如果目标文件或授权发生变化，需要重新确认。</p>`,btn('close-modal','返回')+btn('reject','拒绝本次','quiet')+btn('approve','确认创建','primary',state.scenario==='offline'?'disabled':''));break;
      case 'approve':{closeDialog();state.run='running';const epoch=state.epoch,runEpoch=invalidateRun('weekly');render();toast('已批准，正在等待写入回执。');setTimeout(()=>{if(state.epoch!==epoch||state.runEpochs.weekly!==runEpoch)return;state.run='completed';state.scenario='normal';render();toast('演示结果：笔记已保存，任务已完成。');},650);break;}
      case 'reject':closeDialog();state.run='canceled';invalidateRun('weekly');render();toast('已拒绝本次写入，草稿仍可阅读。');break;
      case 'cancel':showDialog('停止本轮任务？','<p>将停止本轮所有成员和临时子任务的新调用。已经发生的笔记改动不会回滚。</p><p class="section-note">其他会话中的任务不会受到影响。</p>',btn('close-modal','继续工作')+btn('confirm-cancel','停止本轮','primary'));break;
      case 'confirm-cancel':closeDialog();invalidateRun(state.page==='tasks'?'weekly':state.selection);if(state.selection!=='weekly'&&state.page!=='tasks'){state.localRuns[state.selection]='canceled';render();toast('当前单聊任务已停止，其他任务继续。');break;}state.run=state.scenario==='unknown'?'unknown':'canceled';if(state.scenario!=='unknown')state.scenario='canceled';render();toast('停止请求已处理。已有结果和未决效果保留。');break;
      case 'task-detail':{const temp=el.dataset.task==='temp',research=el.dataset.task==='research';showDialog(temp?'临时子任务 · 复核引用':research?'资料助手 · 提取进展':'写作助手 · 整理周报',`<dl class="key-value"><dt>执行者</dt><dd>${temp?'临时 sub-agent，任务结束后不加入 Bot 目录':research?'已有 Bot：资料助手':'已有 Bot：写作助手'}</dd><dt>发起者</dt><dd>${temp?'写作助手':'协调员'}</dd><dt>上下文</dt><dd>本任务描述与明确附加的两份资料；不含其他 Bot 私聊</dd><dt>状态</dt><dd>${research?'已完成':temp?(state.childCanceled||state.run==='canceled'?'已取消':state.run==='completed'?'已完成':'等待草稿'):state.run==='unknown'?'写入待核查':state.run==='completed'?'已完成':state.run==='canceled'?'已取消':state.run==='running'?'进行中':'等待审批'}</dd></dl>${research?'<p>已核对 3 项已完成、2 项进行中；来源为项目周记与会议记录。</p>':'<p class="section-note">只停止此任务不会停止其他独立会话。结果会回到发起任务。</p>'}`,btn('close-modal','关闭')+(research||['completed','canceled'].includes(state.run)?'':temp?btn('cancel-child','停止这个子任务','quiet'):btn(state.run==='unknown'?'reconcile':'approval',state.run==='unknown'?'查看核查':'查看写入预览','primary')));break;}
      case 'cancel-child':state.childCanceled=true;closeDialog();render();toast('这个子任务已停止，父任务会收到取消结果。');break;
      case 'resume':state.scenario='normal';state.run='approval';invalidateRun('weekly');render();toast('已继续核查通过的任务；已有结果不会重复执行。');break;
      case 'reconnect':case 'retry':state.scenario='normal';render();toast('演示连接已恢复，已保存状态重新加载。');break;
      case 'new-turn':state.scenario='empty';if(state.selection==='weekly')state.run='idle';else state.localRuns[state.selection]='idle';render();$('#draft')?.focus();break;
      case 'reconcile':showDialog('核查未知写入','<p>目标：项目周报.md。写入可能已经发生，但没有可信回执。</p><p class="section-note">先查执行回执，再比较目标后置条件。仅内容一致时标为“经核查”，不伪装成原执行回执。</p>',btn('close-modal','稍后处理')+btn('mock-reconcile','演示：确认目标已满足','primary'));break;
      case 'mock-reconcile':closeDialog();state.scenario='normal';state.run='completed';state.retained=false;render();toast('经核查：目标满足后置条件，未重复写入。安全记录可完整清除。');break;
      case 'memory-scope':state.scope=el.dataset.scope;render();break;
      case 'toggle-memory':state.auto[state.memoryOwner]=!autoEnabled(state.memoryOwner);render();toast(autoEnabled(state.memoryOwner)?'这个 Bot 的自动维护已开启，受额度和资料范围限制。':'这个 Bot 的自动维护已暂停，其他 Bot 不受影响。');break;
      case 'memory-source':showDialog('记忆来源','<dl class="key-value"><dt>来源</dt><dd>周报偏好对话 · 10 月 25 日</dd><dt>范围</dt><dd>当前 Profile；仍需满足模型接收方授权</dd><dt>版本</dt><dd>来源修订 1；条目修订 1</dd></dl><p class="section-note">删除或撤销来源后，自动派生条目会失去召回资格。</p>');break;
      case 'correct-memory':showDialog('修正记忆',`<label class="field">记忆内容<textarea id="memory-text">${esc(memoryText(state.scope==='global'?'global':state.memoryOwner))}</textarea></label><p class="section-note">保存形成新修订；自动维护不会静默覆盖你固定的内容。</p><p id="form-error" class="form-error" role="alert"></p>`,btn('close-modal','取消')+btn('save-memory','确认修正','primary'));break;
      case 'save-memory':{const text=$('#memory-text').value.trim();if(!text){$('#form-error').textContent='记忆内容不能为空；如需删除，请使用忘记。';return;}state.corrected[state.scope==='global'?'global':state.memoryOwner]=text;closeDialog();render();toast('修正已保存为新修订。');break;}
      case 'forget-memory':showDialog('忘记这条记忆？','<p>这条记忆将退出召回，旧提炼作业不会把它重新写回来。原始会话需要在数据管理中另行清除。</p>',btn('close-modal','取消')+btn('confirm-forget','确认忘记','danger'));break;
      case 'confirm-forget':state.forgotten.add(state.scope==='global'?'global':state.memoryOwner);closeDialog();render();toast('已忘记，相关召回和旧作业已失效。');break;
      case 'global-proposal':showDialog('确认写入全局记忆','<p>每周五整理项目周报，包含完成、进行中和下一步。</p><dl class="key-value"><dt>提议者</dt><dd>协调员</dd><dt>来源</dt><dd>本次周报偏好对话</dd><dt>共享范围</dt><dd>当前本机 Profile 的 Bot；仍按资料接收方授权使用</dd></dl>',btn('close-modal','取消')+btn('approve-global','确认共享','primary'));break;
      case 'approve-global':state.globalConfirmed=true;closeDialog();render();toast('全局记忆已确认，其他 Bot 现在可以在授权范围内使用。');break;
      case 'dismiss-proposal':state.proposalDismissed=true;render();toast('提案已拒绝，没有写入全局记忆。');break;
      case 'delete-session':showDialog('清除当前会话',`<p>将删除消息、子任务上下文、摘要和自动来源记忆。Vault 中已交付的笔记保留。</p><label class="check-row"><input type="checkbox" id="keep-pinned" checked>保留你独立固定或确认的记忆</label>${state.scenario==='unknown'||state.retained?'<div class="notice"><strong>还有一条未决效果</strong><p>只清除正文；保留效果 ID、目标定位、状态和核查依据，核查后可完整清除。</p></div>':'<p class="section-note">确认后，本演示无法恢复当前会话正文；刷新可重置示例。</p>'}`,btn('close-modal','取消')+btn('confirm-delete-session','永久清除正文','danger'));break;
      case 'confirm-delete-session':{const keepPinned=$('#keep-pinned').checked;state.retained=state.scenario==='unknown'||state.retained;state.deletedSessions.add(state.selection);state.messages[state.selection]=[];const owners=state.group?currentGroup().members:[state.selection];owners.forEach(id=>{if(!keepPinned||!state.corrected[id])state.forgotten.add(id);});if(!keepPinned){state.forgotten.add('global');state.globalConfirmed=false;}state.proposalDismissed=true;invalidateRun(state.selection);closeDialog();go('data');toast(state.retained?'正文已清除，最小核查记录暂时保留。':'会话正文与受管派生内容已清除。');break;}
      case 'delete-profile':if(state.scenario==='unknown'||state.retained){showDialog('完整清除尚不可用','<p>仍有一条未决效果。可以先清除正文，核查完成后再清除整个 Profile。</p>',btn('close-modal','返回')+btn('reconcile','去核查','primary'));}else showDialog('永久清除本机 Profile','<p>将清除所有 Bot、会话、记忆与本机受管副本。Vault 笔记、其他 Profile 和自行导出的文件保留。</p><label class="field">输入「清除」确认<input id="purge-confirm" autocomplete="off"></label><p id="form-error" class="form-error" role="alert"></p>',btn('close-modal','取消')+btn('confirm-purge','永久清除','danger'));break;
      case 'confirm-purge':if($('#purge-confirm').value!=='清除'){$('#form-error').textContent='请输入「清除」以确认范围。';return;}state.purged=true;state.profileCleared=true;state.retained=false;state.scenario='empty';state.epoch++;closeDialog();go('chat');toast('演示 Profile 已清除。刷新页面可重置全部示例。');break;
    }
  });
  if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark';
  decorate();render();applyLayout();
})();
```
<!-- /PROTOTYPE-FILE -->

## Validation and Handoff

当前实际结果在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/evidence/finalization-validation.md</Path>。LOG-039/static-validation.md 仅保留确认前历史观察，不作为本版本的有效摘要。

| 项目 | 当前含义 |
| --- | --- |
| 方案选择 | 用户已确认唯一 final；不再比较或选择其他候选 |
| DESIGN / 基线 | 批准记录绑定 revision 2 与已发布 DESIGN-0001；本轮不写永久知识 |
| materialize / 摘要 | 三源码块、final、旧 A 同源投影及绑定一起核对 |
| 浏览器 / check-preview | 缺少实际环境/视口/页面状态/键盘/截图记录；不能用静态通过代替 |
| Ready / Spec | 设计批准已满足；技术证据补齐并通过对应门后推进 |
| 产品实施 | 模型、Host、记忆/任务隔离与真实 Obsidian 仍按 Spec 验收 |

后续只处理具体缺陷或技术证据；影响设计的变更才核对新增批准范围。当前没有待回答的方案选择。尚未执行真实模型、宿主、生产代码修改、提交或发布。
