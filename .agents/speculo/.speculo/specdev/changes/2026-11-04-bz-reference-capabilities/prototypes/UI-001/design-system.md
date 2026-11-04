---
{
  "schema_version": 3,
  "artifact": "ui-prototype",
  "change": "2026-11-04-bz-reference-capabilities",
  "design_id": "UI-001",
  "status": "ready",
  "project_kind": "existing",
  "platforms": [
    "desktop"
  ],
  "candidates": [
    {
      "id": "bz-huhu",
      "template_id": "bz-password-vault",
      "primary_reference": "huhu-baseline",
      "auxiliaries": [
        {
          "reference_id": "bz-diary",
          "dimension": "双页阅读与书内写作结构"
        },
        {
          "reference_id": "bz-belongings",
          "dimension": "KPI、状态筛选和物品卡片结构"
        }
      ],
      "rationale": "LOG-013/022 已指定唯一 bz 蓝本，HUHU 基线提供统一视觉语义。",
      "structural_difference": "唯一候选：单包九页，无平行替代方向。",
      "task_id": "bz-reference-capabilities",
      "entry": "comparison/variants/bz-huhu.html"
    }
  ],
  "candidate_count_override": {
    "count": 1,
    "request": "LOG.md#LOG-013 与 LOG-022；005-design-gate-r2 用户指示更正优先"
  },
  "selected_candidate": "bz-huhu",
  "sources": [
    {
      "id": "huhu-baseline",
      "locator": ".agents/speculo/.speculo/specdev/design/revisions/DESIGN-0002.md",
      "revision": "DESIGN-0002"
    },
    {
      "id": "huhu-components",
      "locator": "src/ui/components",
      "revision": "29644dc5833bb209e6282f84fa71441a5a1b99d4"
    },
    {
      "id": "bz-password-vault",
      "locator": "src/password-vault/render.ts",
      "url": "https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/password-vault/render.ts",
      "revision": "d76a0870329403247917a00c43019e203a2560a4",
      "license": "MIT",
      "digest": "04acc2ae6ec18bc0fa22624ec4684d15527b21856cac3a4aa530c82cec58b6bb"
    },
    {
      "id": "bz-belongings",
      "locator": "src/belongings/ui.ts",
      "url": "https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/belongings/ui.ts",
      "revision": "d76a0870329403247917a00c43019e203a2560a4",
      "license": "MIT",
      "digest": "abbacbf718f556deb00733faf989c6b9233cd8a0d872d2ccc0acb11fb28f8280"
    },
    {
      "id": "bz-diary",
      "locator": "src/diary/render.ts",
      "url": "https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/diary/render.ts",
      "revision": "d76a0870329403247917a00c43019e203a2560a4",
      "license": "MIT",
      "digest": "39a22601d7ce8d26679a21eb7e5db8e4865dbbb79cd587236cfd2471a4cc49ca"
    },
    {
      "id": "bz-people",
      "locator": "src/people/render.ts",
      "url": "https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/people/render.ts",
      "revision": "d76a0870329403247917a00c43019e203a2560a4",
      "license": "MIT",
      "digest": "4207359864e12dac904cc7cab85d55e2f57cd3873a43180421521ddd1cfe8a30"
    },
    {
      "id": "bz-checkup",
      "locator": "src/checkup/ui.ts",
      "url": "https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/checkup/ui.ts",
      "revision": "d76a0870329403247917a00c43019e203a2560a4",
      "license": "MIT",
      "digest": "d2d4b2e2528ce03369163c2638fa3455eb4c2863ed62847edb1d3eee13f42d71"
    },
    {
      "id": "bz-src-password-vault-quick-pick",
      "locator": "src/password-vault/quick-pick.ts",
      "url": "https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/password-vault/quick-pick.ts",
      "revision": "d76a0870329403247917a00c43019e203a2560a4",
      "license": "MIT",
      "digest": "488645b1ae3c7cd83fcc8e78eac5be3343cc6c3307eb1b4f3909edcbf790d11e"
    },
    {
      "id": "bz-src-belongings-layouts-poster-render",
      "locator": "src/belongings/layouts/poster/render.ts",
      "url": "https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/belongings/layouts/poster/render.ts",
      "revision": "d76a0870329403247917a00c43019e203a2560a4",
      "license": "MIT",
      "digest": "83fe31c52d17ad0524ad08e0b321ebd83a3ede19ba0675f02d4674bd5f7084ac"
    },
    {
      "id": "bz-src-belongings-report",
      "locator": "src/belongings/report.ts",
      "url": "https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/belongings/report.ts",
      "revision": "d76a0870329403247917a00c43019e203a2560a4",
      "license": "MIT",
      "digest": "4e8353f7ed7631be0016c5c578be4e14c20a7ea97d8e54efd2b17ac4140ece21"
    },
    {
      "id": "bz-diary-adr",
      "locator": "docs/adr/adr-0230-diary-book-ui.md",
      "url": "https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/docs/adr/adr-0230-diary-book-ui.md",
      "revision": "d76a0870329403247917a00c43019e203a2560a4",
      "license": "MIT"
    }
  ],
  "prototype_files": [
    "final/index.html",
    "final/styles.css",
    "final/app.js"
  ],
  "browser_evidence": "evidence/browser.json",
  "updated_at": "2026-11-04T12:46:16.164Z"
}
---





# UI-001 · bz 参考能力（单包九页）

设计规则唯一属于 change DESIGN.md。本包保存原型源码、检测、来源与观察证据。LOG-022 更正为单包九页；旧 TASK 五包文字不作为本轮交付组织。没有项目基线发布动作。

## Project Evidence

| 维度 | 实际项目事实与来源 | 结论 |
|---|---|---|
| 技术与组件 | package.json；src/ui/components/button.tsx、dialog.tsx；huhu/EmptyState.tsx、SettingsFormControls.tsx | React 19、Tailwind 4、shadcn/Radix；原型以原生离线控件投影语义，不声称运行了生产 React |
| 布局与任务 | src/modules/safe/ui/SafePage.tsx；archives/ui/generic/RecordEditor.tsx；navigator/ui/NavigatorRoot.tsx；docs/design-system.md | 已有工作台，只新增页面内容；保留单一 shell 和范围/列表/详情模式 |
| token 与密度 | src/ui/styles/tokens.css；永久 DESIGN-0002 DS-001–010、DS-013 | 保留 4px 网格、14px 正文、12px 辅助、8/12/14px 圆角、语义色、44px 页头和 52px 轨道；离线回退颜色只在 token 层 |
| 状态与无障碍 | .agents/skills/ui/references/motion-a11y.md、shell.md；DESIGN-0002 DS-005、DS-010 | 补齐失败保留数据、取消恢复、真实按钮、焦点、键盘、窄屏与减少动效 |

检测模式：项目 source-only；本次离线 HTML 的实际浏览器结果见 evidence/browser.json。用户为现有保险箱、档案、周期笔记使用者；高频任务是快速复制、查看物品、读写日记、查看人物和手动体检。排除生产密码学、真实数据写入、触屏手势与 Obsidian 多窗口验收。

保留：项目语义 token、共享组件语义和工作台边界。调整：bz 拟物细节映射到 HUHU 字体/密度/表面。替换：上游独立存储、收藏字段、AI/私密导入与图片素材。补齐：多币种、冲突、有限修复、加载范围、不可用/锁定等 Spec 明确状态。detected_style=hybrid：HUHU 高密度工具界面加内容阅读区域；证据来自实际源码，置信度高，生产运行结果未声明。

## Candidate Composition

唯一候选 bz-huhu：任务骨架来自已核对的 bz 单源 UI，视觉权威为 HUHU DESIGN-0002；没有生成第二个仅换色的方案。设计库 enterprise-data 的筛选/详情/失败保留选中纪律作为检查参考，未复制模板代码，也不让模板改变用户指定结构。候选数量覆盖来自 LOG-013；LOG-022 只更正来源与包组织。浅深预览、语言切换及状态工具位于原型说明区，不是生产产品新增功能。

源引用：password-vault/render.ts 的 deskHTML/acctCardHtml，belongings/ui.ts 的海报/KPI/卡片流程说明，diary/render.ts 的 bookPanelHTML/wsp，people/render.ts 的 detailPage（仅人物身份和分段阅读），checkup/ui.ts 的 renderIdle/renderReport。对应固定 URL、SHA 和读取文件摘要在 sources。只复刻交互与布局，不直接复制上游运行代码或图片，MIT 原文在 LICENSE-bz.txt。

## Approval Package

沿用 LOG.md 的 LOG-013 用户预先批准和 LOG-022 事实更正；审批快照由 approval-r2.md 固定绑定最终 DESIGN、原型和 DESIGN-0002 摘要。原型浏览器通过后才封板，无需再次逐页审批。此授权不扩展为生产提交、发布或永久基线改写。

## Prototype Sources

<!-- PROTOTYPE-FILE: final/index.html -->
```html
<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HUHU · bz 参考能力</title><link rel="stylesheet" href="styles.css"><script defer src="app.js"></script></head>
<body class="huhu-ui huhu-design"><a class="skip" href="#content">跳到内容 / Skip to content</a>
<div class="preview-bar"><strong>HUHU · 离线原型 / Offline prototype</strong><span>虚构数据 · 不写入文件 / Fictional data · No file writes</span><button data-action="language" id="language">English</button><button data-action="theme" id="theme">深色 / Dark</button></div>
<div class="shell"><nav class="rail" aria-label="功能 / Features"><span class="brand" aria-label="HUHU">虎</span><button data-page="SAFE-WORKSPACE" title="密码本 / Vault">钥</button><button data-page="BELONGINGS" title="归物本 / Belongings">物</button><button data-page="DIARY-READER" title="日记 / Diary">书</button><button data-page="PERSON-READING" title="人物 / People">人</button><button data-page="HEALTH-SCAN" title="体检 / Checkup">检</button></nav>
<div class="workspace"><header><button id="menu" data-action="menu" aria-label="页面导航 / Page navigation">☰</button><h1 id="page-title">密码本</h1><span class="header-note" id="identity">HUHU</span><button data-action="page-menu" aria-label="页面菜单 / Page menu">···</button></header>
<main id="content" tabindex="-1"><div id="view"></div></main></div></div>
<aside class="inspector" aria-label="原型状态工具 / Prototype state tools"><label>页面 / Page <select id="page-picker"></select></label><label>演示状态 / Scenario <select id="state-picker"></select></label><span id="state-id"></span><details><summary>验证说明 / Preview notes</summary><p>这是单一候选的九个任务页面；状态切换只改变演示内存。主界面中的按钮同样可操作。These are nine task pages in one candidate. All actions affect preview memory only.</p></details></aside>
<dialog id="dialog" aria-labelledby="dialog-title"><div class="dialog-head"><h2 id="dialog-title"></h2><button data-action="close-dialog" aria-label="关闭 / Close">×</button></div><div id="dialog-body"></div></dialog>
</body></html>
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/styles.css -->
```css
/* Original offline adaptation of bz UI structure, MIT © 2026 叫我包仔. HUHU semantic projection; no upstream assets. */
:root{color-scheme:light;--background-primary:#fafaf8;--background-secondary:#efefeb;--background-primary-alt:#fff;--text-normal:#252723;--text-muted:#5c6058;--interactive-accent:#395d4a;--text-on-accent:#fff;--background-modifier-border:#d4d7cf;--background-modifier-hover:#e4e9df;--color-red:#a12f35;--color-orange:#855221;--color-green:#286340;--color-blue:#365a83;--layer-modal:100;--layer-notice:110}
:root[data-theme=dark]{color-scheme:dark;--background-primary:#1d211e;--background-secondary:#252b26;--background-primary-alt:#222723;--text-normal:#edf1e9;--text-muted:#b3bcaf;--interactive-accent:#afd1b4;--text-on-accent:#14261a;--background-modifier-border:#444e44;--background-modifier-hover:#354236;--color-red:#ffb1b4;--color-orange:#ebc38d;--color-green:#a3d2a8;--color-blue:#aac7f1}
.huhu-ui{--background:var(--background-primary);--foreground:var(--text-normal);--card:var(--background-primary-alt);--muted:var(--background-secondary);--muted-foreground:var(--text-muted);--primary:var(--interactive-accent);--primary-foreground:var(--text-on-accent);--border:var(--background-modifier-border);--ring:var(--interactive-accent);--input:var(--text-muted);--nd-font-sans:Geist,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;--nd-font-mono:"Geist Mono",Consolas,monospace;--ui-radius-control:8px;--ui-radius-panel:12px;--ui-radius-dialog:14px;color:var(--foreground);background:var(--background);font:14px/1.5 var(--nd-font-sans)}
*{box-sizing:border-box}body{margin:0}button,input,textarea,select{font:inherit;color:inherit;max-width:100%;min-width:0}button,input,select{min-height:36px}button{border:1px solid var(--border);border-radius:var(--ui-radius-control);background:var(--card);padding:6px 12px;cursor:pointer;overflow-wrap:anywhere;transition:opacity 120ms}button:hover{background:var(--background-modifier-hover)}button:disabled{opacity:.5;cursor:default}.primary{color:var(--primary-foreground);background:var(--primary);border-color:var(--primary)}.primary:hover{opacity:.85;background:var(--primary)}.danger{color:var(--color-red)}input,select,textarea{background:var(--card);border:1px solid var(--input);border-radius:8px;padding:8px 12px;width:100%}input[type=checkbox]{width:20px;min-height:20px}textarea{min-height:180px;resize:vertical}label{display:grid;gap:4px;font-size:13px;color:var(--muted-foreground)}:focus-visible{outline:3px solid var(--ring);outline-offset:1px}h1{font-size:20px;margin:0}h2{font-size:20px;line-height:1.35;margin:0 0 12px}h3{font-size:16px;margin:0 0 8px}p{margin:8px 0 16px;overflow-wrap:anywhere}small,.muted{color:var(--muted-foreground);font-size:12px}.mono{font-family:var(--nd-font-mono);overflow-wrap:anywhere}.skip{position:absolute;transform:translateY(-200%);background:var(--card);color:var(--foreground);padding:12px}.skip:focus{transform:none;z-index:var(--layer-notice)}.preview-bar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:8px 16px;border-bottom:1px solid var(--border);background:var(--muted);font-size:12px}.preview-bar strong{margin-right:auto}.shell{display:grid;grid-template-columns:52px minmax(0,1fr);min-height:calc(100vh - 170px)}.rail{border-right:1px solid var(--border);background:var(--muted);display:flex;align-items:center;flex-direction:column;gap:12px;padding:12px 4px}.rail button{width:36px;height:36px;padding:0}.brand{font-weight:700;font-size:20px;margin-bottom:12px}.rail button[aria-current=page]{background:var(--primary);color:var(--primary-foreground)}.workspace{min-width:0}.workspace>header{min-height:44px;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:center;padding:4px 16px;flex-wrap:wrap}.workspace>header h1{font-size:16px}.header-note{margin-left:auto;color:var(--muted-foreground);font-size:12px}main{padding:24px;min-width:0}.eyebrow{text-transform:uppercase;font-size:12px;letter-spacing:.14em;color:var(--muted-foreground);margin-bottom:8px}.page-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:24px}.toolbar,.actions,.segments,.chips{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.toolbar{margin:16px 0}.toolbar label{flex:1 1 140px}.toolbar button{align-self:end}.segments{margin:16px 0}.segments button[aria-pressed=true],.chips button[aria-pressed=true],.row[aria-pressed=true]{background:var(--background-modifier-hover);border-color:var(--primary)}.badge{display:inline-block;background:var(--muted);border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:12px}.panel{padding:20px;border:1px solid var(--border);border-radius:12px;background:var(--card);min-width:0}.stack{display:grid;gap:16px}.cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:20px}.kpi{padding:16px;border:1px solid var(--border);border-radius:12px}.kpi strong{display:block;font-size:24px;font-weight:600;font-variant-numeric:tabular-nums}.kpi small{display:block}.notice{border-left:3px solid var(--primary);padding:12px 16px;background:var(--muted);border-radius:8px;margin:12px 0}.notice.error{border-color:var(--color-red)}.notice.warn{border-color:var(--color-orange)}.notice p{margin:4px 0}.empty{text-align:center;padding:48px 20px;border:1px dashed var(--border);border-radius:12px}.empty p{max-width:540px;margin:12px auto 20px}.item-list{display:grid;gap:8px}.row{display:flex;align-items:center;gap:12px;text-align:left;width:100%;padding:12px}.row>span:first-child{flex:1;min-width:0}.row b{display:block}.row small{display:block;overflow-wrap:anywhere}.avatar{display:grid;place-items:center;background:var(--muted);border:1px solid var(--border);border-radius:12px;width:48px;height:48px;font-size:20px;flex-shrink:0}.safe-grid{display:grid;grid-template-columns:200px 280px minmax(0,1fr);border:1px solid var(--border);border-radius:12px;overflow:hidden}.scope,.entries,.account{padding:20px;min-width:0}.scope,.entries{border-right:1px solid var(--border)}.scope{background:var(--muted)}.scope .item-list button{background:transparent}.entries .item-list{margin-top:16px}.fields{display:grid;grid-template-columns:120px minmax(0,1fr);gap:12px;margin:20px 0}.fields dt{color:var(--muted-foreground)}.fields dd{margin:0;overflow-wrap:anywhere}.note{max-height:180px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:12px}.sticky-actions{position:sticky;bottom:0;padding:12px 0;background:var(--card);border-top:1px solid var(--border)}.quick{max-width:660px;margin:20px auto}.quick .item-list{margin-top:16px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.object-card{padding:0;overflow:hidden;border:1px solid var(--border);border-radius:12px;background:var(--card);text-align:left;display:block;width:100%}.object-card .placeholder{height:120px;display:grid;place-items:center;background:var(--muted);color:var(--muted-foreground);font-size:13px;border-bottom:1px solid var(--border)}.object-card .card-body{padding:16px}.object-card h3{margin-top:8px}.price{font-size:22px;font-variant-numeric:tabular-nums}.flow{border-left:2px solid var(--border);padding-left:20px;display:grid;gap:16px;margin:20px 0}.chart{display:grid;gap:12px}.bar-row{display:grid;grid-template-columns:70px minmax(0,1fr) 80px;gap:12px;align-items:center}.track{height:12px;background:var(--muted);border-radius:6px;overflow:hidden}.bar{height:100%;background:var(--primary);border-radius:6px}.book-wrap{position:relative;background:var(--muted);padding:32px;border-radius:12px}.book{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));background:var(--card);border:1px solid var(--border);border-radius:12px;min-height:440px}.leaf{padding:32px;min-width:0;line-height:1.8}.leaf+.leaf{border-left:1px solid var(--border)}.leaf .date{font-size:28px;font-weight:500;margin:8px 0 24px}.month-index{margin:12px 0}.book-footer{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:20px}.writer{padding:24px;background:var(--card);border:1px solid var(--border);border-radius:12px}.writer textarea{min-height:260px;margin:16px 0}.person-top{display:grid;grid-template-columns:160px minmax(0,1fr);gap:24px;padding:24px;background:var(--muted);border-radius:12px}.portrait{min-height:150px;display:grid;place-items:center;border:1px dashed var(--border);border-radius:12px;color:var(--muted-foreground)}.person-body{max-width:920px;margin:24px auto}.result-row{display:grid;grid-template-columns:150px minmax(0,1fr) auto;gap:16px;padding:16px 0;border-bottom:1px solid var(--border);align-items:start}.result-row:last-child{border:0}.result-row p{margin:4px 0}.status{font-size:12px;border-radius:6px;background:var(--muted);padding:4px 8px;display:inline-block}.status.error{color:var(--color-red)}.status.warn{color:var(--color-orange)}.status.ok{color:var(--color-green)}progress{width:100%;accent-color:var(--primary);height:12px;margin:12px 0}.inspector{border-top:1px solid var(--border);padding:12px 16px;display:flex;gap:12px;flex-wrap:wrap;align-items:end;background:var(--muted)}.inspector label{flex:1 1 180px}.inspector span{font:12px var(--nd-font-mono);overflow-wrap:anywhere}.inspector details{flex-basis:100%;font-size:12px}.inspector summary{cursor:pointer}dialog{background:var(--card);color:var(--foreground);border:1px solid var(--border);border-radius:14px;padding:24px;max-width:min(600px,calc(100vw - 32px));width:600px;max-height:85vh;overflow:auto;box-shadow:0 16px 50px #0003}dialog::backdrop{background:#0007}.dialog-head{display:flex;gap:16px;justify-content:space-between;align-items:start;margin-bottom:16px}.dialog-head h2{font-size:20px}.dialog-head button{min-width:36px}.dialog-head+div label{margin:12px 0}.menu-grid{display:grid;gap:8px}.menu-grid button{text-align:left}.mobile-back,.mobile-scope{display:none}.skeleton{min-height:150px;background:var(--muted);border-radius:12px;border:1px solid var(--border);padding:24px}
@media(max-width:1100px){.safe-grid{grid-template-columns:160px 220px minmax(0,1fr)}.scope,.entries,.account{padding:16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:959px){.mobile-scope{display:flex;margin-bottom:16px}.safe-grid{grid-template-columns:260px minmax(0,1fr)}.scope{display:none}.fields{grid-template-columns:100px minmax(0,1fr)}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.leaf{padding:24px}.book-wrap{padding:20px}.cols{grid-template-columns:1fr}}
@media(max-width:599px){.shell{display:block}.rail{display:none}main{padding:16px}.preview-bar{padding:8px 12px;gap:8px}.preview-bar>span{flex-basis:100%}.workspace>header{padding:8px 12px}.header-note{display:none}button,input,select{min-height:44px}.preview-bar button{min-height:44px}.toolbar{align-items:stretch}.toolbar label{flex-basis:100%}.toolbar button{align-self:auto}.page-top{flex-direction:column}.grid{grid-template-columns:1fr}.safe-grid{display:block}.safe-grid .entries{border:0}.safe-grid .account{display:none}.safe-grid.detail-open .account{display:block}.safe-grid.detail-open .entries{display:none}.mobile-back{display:inline-block}.fields{grid-template-columns:1fr;gap:4px}.fields dd{margin-bottom:12px}.kpi{padding:12px}.kpi strong{font-size:22px}.person-top{grid-template-columns:1fr;padding:20px}.portrait{min-height:96px}.book-wrap{padding:12px}.book{display:block;min-height:0}.leaf{padding:20px}.leaf+.leaf{border-left:0;border-top:1px solid var(--border)}.result-row{grid-template-columns:minmax(0,1fr)}.inspector{padding:12px}.bar-row{grid-template-columns:40px minmax(0,1fr) 65px;gap:8px}.segments button{flex:1 1 auto}.actions button{flex:1 1 auto}}
@media(prefers-reduced-motion:reduce){.huhu-ui *{transition:none;animation:none;scroll-behavior:auto}}
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/app.js -->
```javascript
// Layout adaptation: bz d76a087, MIT © 2026 叫我包仔. Rewritten local fixtures; no storage or upstream runtime.
(() => {
'use strict';
const pages = [{"id": "SAFE-QUICK", "title": "快速取密", "en": "Quick access", "states": ["default", "locked", "loading", "no-results", "generated", "copied", "closed", "error"], "acceptance": ["AC-201", "AC-202", "AC-203", "AC-204"]}, {"id": "SAFE-WORKSPACE", "title": "密码本", "en": "Password vault", "states": ["default", "empty", "loading", "error", "detail", "relations", "invalid-relation", "locked"], "acceptance": ["AC-211", "AC-212", "AC-213", "AC-214"]}, {"id": "BELONGINGS", "title": "归物本", "en": "Belongings", "states": ["default", "empty", "no-results", "loading", "error", "detail", "transition", "resold", "discarded", "returned", "undo", "conflict", "money-edge"], "acceptance": ["AC-301", "AC-302", "AC-303", "AC-304", "AC-305", "AC-311", "AC-312", "AC-313"]}, {"id": "BELONGINGS-REPORT", "title": "年度报告", "en": "Annual report", "states": ["default", "empty", "loading", "error", "historical", "money-edge"], "acceptance": ["AC-304", "AC-305", "AC-321"]}, {"id": "DIARY-READER", "title": "书页日记", "en": "Diary book", "states": ["default", "loading", "empty-date", "error", "next-page", "calendar", "month-index", "fallback", "hidden"], "acceptance": ["AC-401", "AC-402", "AC-411", "AC-412", "AC-413", "AC-414"]}, {"id": "DIARY-SEARCH-WRITE", "title": "搜索与写作", "en": "Search and write", "states": ["default", "indexing", "partial-range", "no-results", "editing", "saving", "saved", "discard-confirm", "template-cancelled", "template-unavailable", "conflict", "error"], "acceptance": ["AC-421", "AC-422", "AC-423"]}, {"id": "PERSON-READING", "title": "人物档案", "en": "Person profile", "states": ["default", "loading", "empty", "error", "profile", "relations", "journal", "journal-edit", "journal-delete", "conflict", "same-name", "generic"], "acceptance": ["AC-501", "AC-502", "AC-503", "AC-504"]}, {"id": "HEALTH-SCAN", "title": "数据体检", "en": "Data checkup", "states": ["default", "running", "complete", "cancelled", "incomplete", "provider-error", "unavailable", "locked", "stale", "notification"], "acceptance": ["AC-601", "AC-602", "AC-603", "AC-604", "AC-611", "AC-612", "AC-631"]}, {"id": "HEALTH-REPAIR", "title": "有限修复", "en": "Limited repair", "states": ["default", "preview", "confirm", "revalidating", "complete", "stale", "partial", "restore", "cancelled", "unsupported"], "acceptance": ["AC-621", "AC-622", "AC-623", "AC-624", "AC-631"]}];
let lang='zh', page='SAFE-WORKSPACE', state='default', quickQuery='', selected=0, noteDraft='', journalDraft='', objectStatus='使用中', currentDay=4, personTab='overview', entity='person-001', filter='all', quickOpen=true, generation=0;
let exitDate='2026-11-04', resalePrice='', lastTransition=null, currentMonth='11';
const lifeEvents=[{rowId:'row-001',date:'2025-03-02',label:'购入 / Purchased'}], diaryEntries={}, journalTitles={'person-001':'书店散步 / Bookshop walk','person-002':'同名人物的独立纪事 / Independent journal'}, journalDeleted={};
const $=s=>document.querySelector(s), esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(zh,en)=>lang==='zh'?zh:en;
const btn=(zh,en,action,cls='',extra='')=>`<button type="button" class="${cls}" data-action="${action}" ${extra}>${t(zh,en)}</button>`;
const go=(id,zh,en)=>`<button type="button" data-page="${id}">${t(zh,en)}</button>`;
const badge=(zh,en)=>`<span class="badge">${t(zh,en)}</span>`;
const notice=(zh,en,tone='')=>`<div class="notice ${tone}" role="status">${t(zh,en)}</div>`;
const empty=(zh,en,body,bodyEn,action='retry')=>`<section class="empty" data-slot="empty-state"><h3>${t(zh,en)}</h3><p>${t(body,bodyEn)}</p>${btn(action==='generate'?'生成新密码':'重试',action==='generate'?'Generate password':'Retry',action,'primary')}</section>`;
const top=(zh,en,sub,subEn,acts='')=>`<div class="page-top"><div><div class="eyebrow">HUHU · ${page}</div><h2>${t(zh,en)}</h2><p class="muted">${t(sub,subEn)}</p></div><div class="actions">${acts}</div></div>`;
const kpi=(zh,en,n,sub='')=>`<div class="kpi"><small>${t(zh,en)}</small><strong>${n}</strong><small>${sub}</small></div>`;
const input=(id,zh,en,value='',type='text')=>`<label for="${id}">${t(zh,en)}<input id="${id}" type="${type}" value="${esc(value)}"></label>`;
const accountRows=()=>['GitHub','Mail','Cloud'].map((name,i)=>({name,i})).filter(({name,i})=>page!=='SAFE-QUICK'||(name+' '+['demo@example.test','reader@example.test','work@example.test'][i]).toLowerCase().includes(quickQuery.toLowerCase())).filter(({i})=>page!=='SAFE-WORKSPACE'||(filter!=='fav'||i===0)&&(filter!=='work'||i!==1)).map(({name,i})=>`<button type="button" class="row" data-action="pick-account" data-index="${i}" aria-pressed="${selected===i}"><span><b>${name}</b><small>${i===0?'demo@example.test':i===1?'reader@example.test':'work@example.test'}</small></span><span class="muted">${t('账号','Account')} 0${i+1}</span></button>`).join('');
function quick(){
 let content='';
 if(state==='locked')content=`<section class="panel"><h3>${t('保险箱已锁定','Vault locked')}</h3><p>${t('先解锁，再搜索和复制。','Unlock before searching or copying.')}</p>${input('unlock','主密码（演示不校验）','Master password (preview only)','','password')}${btn('解锁','Unlock','unlock','primary')}</section>`;
 else if(state==='closed')content=empty('选择器已关闭','Picker closed','查询已清空，晚到结果已失效。','Query cleared. Late results are discarded.','open-quick');
 else if(state==='loading')content=notice('正在读取条目；取消不会复制任何内容。','Loading entries; cancellation copies nothing.')+btn('取消','Cancel','close-quick');
 else if(state==='no-results'||state==='generated')content=input('quick-search','搜索平台、条目、账号','Search platform, entry or account',quickQuery||'no-match')+empty('没有匹配的条目','No matching entry','不会自动生成、保存或覆盖。','Nothing is generated, saved or overwritten automatically.','generate')+(state==='generated'?`<div class="panel"><h3>${t('新密码 · 未保存','New password · Not saved')}</h3><output id="generated" class="mono">${esc(window.generatedPreview||'')}</output><p>${t('12 位，包含大写、小写、数字和符号。仅在本演示内存中。','12 characters: upper/lowercase, digits and symbols. Preview memory only.')}</p></div>`:'');
 else content=`${input('quick-search','搜索平台、条目、账号','Search platform, entry or account',quickQuery)}<div class="item-list" role="group" aria-label="${t('搜索结果','Search results')}">${accountRows()}</div><p class="muted">↑ ↓ ${t('选择','Select')} · Enter ${t('复制密码','Copy password')} · Esc ${t('关闭','Close')}</p>${state==='copied'?notice('已模拟复制密码；30 秒后仅在剪贴板仍为该值时清理。','Password copy simulated; clear after 30 seconds only if clipboard is unchanged.'):''}${state==='error'?notice('复制未完成。选择与查询仍保留，请重试。','Copy failed. Selection and query are preserved. Retry.','error'):''}<div class="actions">${btn('复制所选密码','Copy selected password','copy-secret','primary')}${btn('锁定','Lock','lock')}${btn('关闭','Close','close-quick')}</div>`;
 return top('快速取密','Quick access','不搜索密码；结果列表不显示明文。','Passwords are excluded from search and result lists.',go('SAFE-WORKSPACE','返回密码本','Back to vault'))+`<section class="quick stack">${content}</section>`;
}
function safe(){
 if(state==='locked')return top('密码本','Password vault','会话已锁定。','Session locked.')+empty('请先解锁','Unlock to continue','不展示缓存详情或秘密。','Cached details and secrets stay hidden.','unlock-workspace');
 if(['empty','loading'].includes(state))return top('密码本','Password vault','全部条目','All entries',go('SAFE-QUICK','快速取密','Quick access'))+(state==='empty'?empty('还没有条目','No entries yet','新增条目后在这里选择账号。','Add an entry to select accounts here.','add-account'):`<div class="skeleton" role="status">${t('正在载入条目…','Loading entries…')}</div>`);
 const related=state==='relations'||state==='invalid-relation';
 return top('密码本','Password vault','范围 → 条目与账号 → 详情与关系','Scope → entries and accounts → details and relations',go('SAFE-QUICK','快速取密','Quick access')+btn('锁定','Lock','lock-workspace'))+(state==='error'?notice('刷新失败，保留上次有效条目与当前选择。','Refresh failed. Last valid entries and selection are preserved.','error')+btn('重试','Retry','retry'):'')+`<div class="safe-grid ${state==='detail'||related?'detail-open':''}"><aside class="scope"><h3>${t('范围与标签','Scope and tags')}</h3><div class="item-list">${btn('全部条目 · 3','All entries · 3','scope-all')}${btn('收藏 · 1','Favorites · 1','scope-fav')}${btn('工作 · 2','Work · 2','scope-work')}${btn('回收站','Trash','trash')}${btn('备份与恢复','Backup and restore','backup')}</div></aside><section class="entries"><nav class="mobile-scope actions" aria-label="Scope / 范围">${btn('全部','All','scope-all')}${btn('收藏','Favorites','scope-fav')}${btn('工作','Work','scope-work')}${btn('回收站','Trash','trash')}</nav><h3>${t(filter==='fav'?'收藏条目':'全部条目',filter==='fav'?'Favorites':'All entries')}</h3>${input('safe-search','搜索条目','Search entries')}<div class="item-list">${accountRows()}</div>${btn('新增账号','Add account','add-account')}</section><section class="account"><div class="actions">${btn('返回列表','Back to list','back-list','mobile-back')}${badge('收藏标签','Favorite tag')}</div><h2>${['GitHub','Mail','Cloud'][selected]}</h2><p class="mono">${['demo@example.test','reader@example.test','work@example.test'][selected]}</p><dl class="fields"><dt>${t('密码','Password')}</dt><dd>••••••••••••</dd><dt>${t('手机号','Phone')}</dt><dd>+886 900 000 000</dd><dt>${t('邮箱','Email')}</dt><dd>demo@example.test</dd><dt>${t('账号 ID','Account ID')}</dt><dd class="mono">account-00${selected+1}</dd></dl><h3>${t('账号备注','Account note')}</h3><div class="note" tabindex="0">${t('用于个人开源项目的演示账号。请在可靠设备上操作。此处是一段较长的虚构备注，用于验证备注滚动、长中文换行和操作栏始终可达。'.repeat(5),'Fictional account for open source projects. Use a trusted device. This long note verifies wrapping, controlled scrolling and reachable actions. '.repeat(7))}</div><h3 style="margin-top:20px">${t('关系与反向引用','Links and backlinks')}</h3><div class="item-list">${btn('恢复邮箱 → Mail','Recovery email → Mail','relation')}${btn('反向引用：Cloud','Backlink: Cloud','backlink')}</div>${state==='invalid-relation'?notice('关联目标 account-missing 不存在。保留关系供诊断，不跳转。','Target account-missing is missing. Keep this link for diagnosis.','warn'):''}<div class="sticky-actions actions">${btn('复制账号','Copy account','copy-account')}${btn('复制密码','Copy password','copy-secret','primary')}${btn('编辑','Edit','edit-account')}</div></section></div>`;
}
const items=[['随身相机','Camera','CNY 3,200.00','摄影 · 2025-03-02','Photography · 2025-03-02'],['阅读器','E-reader','CNY 899.00','数码 · 2024-06','Devices · 2024-06'],['通勤背包','Commuter bag','USD 89.00','日用 · 2026-01-12','Everyday · 2026-01-12']];
function itemDetail(){return `<div class="panel"><h3>${t('随身相机','Camera')}</h3><span class="status">${t(objectStatus,({'使用中':'In use','已转卖':'Resold','已丢弃':'Discarded','闲置':'Idle'})[objectStatus]||'In use')}</span><dl class="fields"><dt>${t('购入','Purchased')}</dt><dd>CNY 3,200.00 · 2025-03-02</dd><dt>${t('规格与备注','Specifications and notes')}</dt><dd>${t('黑色 · 备用电池一块','Black · One spare battery')}</dd><dt>${t('所有者','Owner')}</dt><dd>${t('林青（person-001）','Lin Qing (person-001)')}</dd><dt>${t('凭证','Receipt')}</dt><dd>receipt-camera.pdf</dd><dt>${t('当前出离日期','Exit date')}</dt><dd>${exitDate}</dd><dt>${t('售价','Resale price')}</dt><dd>${resalePrice===''?t('未知（不是 0）','Unknown (not zero)'):'CNY '+esc(resalePrice)}</dd></dl><div class="actions">${btn('使用中','In use','status-in')}${btn('闲置','Idle','status-idle')}${btn('已转卖','Resold','status-resold')}${btn('已丢弃','Discarded','status-discarded')}</div><div class="flow">${lifeEvents.map(e=>`<div><strong>${esc(e.date)}</strong> · ${esc(e.label)} <small class="mono">${esc(e.rowId)}</small></div>`).join('')}</div>${btn('编辑完整档案','Edit archive','edit-item')}${btn('返库','Return to inventory','return-item')}</div>`;}
function moneyEdge(){return notice('不同币种分别统计，不换汇、不求总额。','Currencies are reported separately; no conversion or combined total.')+`<div class="cols"><div class="panel"><h3>CNY</h3><p>${t('售价未知 ≠ 0；月精度日期不计算精确天数。','Unknown resale price ≠ 0. Month-only dates have no exact holding days.')}</p><p>${t('零天持有：日均成本不可计算。','Zero holding days: daily cost unavailable.')}</p></div><div class="panel"><h3>USD</h3><p>${t('回收超过购入：净成本 −12.00，单独标注。','Recovery exceeds purchase: net cost −12.00, shown explicitly.')}</p></div></div>`;}
function belongings(){
 let out=top('归物本','Belongings','物有所归，轻装生活。','A place for your things.',go('BELONGINGS-REPORT','年度报告','Annual report')+btn('记一件','Add item','new-item','primary'))+`<div class="kpis">${kpi('在库件数','In inventory','3')}${kpi('在库投入','Inventory cost','CNY 4,099','USD 89.00')}${kpi('日均净成本','Daily net cost','CNY 5.23',t('仅精确日期','Exact dates only'))}${kpi('已离场 / 回收','Exited / Recovered','0 / CNY 0',t('当前示例快照','Current fixture snapshot'))}</div><div class="chips">${['all','in','idle','resold','discarded'].map((s,i)=>`<button data-action="filter-item" data-filter="${s}" aria-pressed="${filter===s}">${t(['全部','使用中','闲置','已转卖','已丢弃'][i],['All','In use','Idle','Resold','Discarded'][i])}</button>`).join('')}</div><div class="toolbar">${input('bel-search','搜索物品','Search items')}<label>${t('年份','Year')}<select id="bel-year"><option>2026</option><option>2025</option><option>2024</option></select></label><label>${t('排序','Sort')}<select id="bel-sort"><option>${t('最近购入','Newest purchase')}</option><option>${t('购入金额','Purchase price')}</option></select></label></div>`;
 if(state==='loading')return out+`<div class="skeleton" role="status">${t('正在读取档案…','Loading archives…')}</div>`;
 if(['empty','no-results'].includes(state))return out+empty(state==='empty'?'还没有物品':'没有匹配的物品',state==='empty'?'No belongings yet':'No matching items','保留筛选，可清除后重试。','Filters are preserved. Clear them and retry.','clear-item-filter');
 if(state==='error')out+=notice('读取失败。保留上次有效卡片。','Read failed. Last valid cards remain visible.','error')+btn('重试','Retry','retry');
 if(state==='money-edge')return out+moneyEdge();
 if(state==='conflict')out+=notice('对象已被其他位置修改。旧哈希迁移或撤销已拒绝，未覆盖新状态。','The object changed elsewhere. Stale transition or undo rejected; current data preserved.','error')+btn('重新读取','Reload','retry');
 if(['resold','discarded','returned','undo'].includes(state))out+=notice(state==='undo'?'已撤销本次流转；历史仍可追溯。':'流转已提交，历史已追加。',state==='undo'?'Transition undone; history remains traceable.':'Transition committed and appended to history.')+btn('撤销本次操作','Undo this operation','undo-item');
 if(['detail','transition','resold','discarded','returned','undo','conflict'].includes(state))return out+itemDetail();
 return out+`<div class="grid">${items.map((x,i)=>`<button class="object-card" data-action="item-detail" data-index="${i}"><div class="placeholder" role="img" aria-label="${t('图片占位，不复制素材','Image placeholder, no copied asset')}">${t('图片占位','Image placeholder')} 0${i+1}</div><div class="card-body"><div class="actions"><span class="mono muted">NO.0${i+1}</span>${badge(i===1?'闲置':'使用中',i===1?'Idle':'In use')}</div><h3>${t(x[0],x[1])}</h3><div class="price">${x[2]}</div><p class="muted">${t(x[3],x[4])}</p></div></button>`).join('')}</div>`;
}
function report(){let year=state==='historical'?'2025':'2026';const cny=year==='2025'?3200:0,usd=year==='2026'?89:0;return top('年度报告','Annual report',year+' · 按事件发生时重放，不套用今日状态。',year+' · Replayed from events, not today’s status.',go('BELONGINGS','返回归物本','Back to belongings'))+`<div class="toolbar"><label>${t('报告年份','Report year')}<select id="report-year"><option ${year==='2026'?'selected':''}>2026</option><option ${year==='2025'?'selected':''}>2025</option></select></label>${btn('更新报告','Update report','report-update')}</div>`+(state==='loading'?notice('正在按历史事件计算…','Calculating from historical events…'):state==='empty'?empty('这一年没有记录','No records for this year','选择其他年份查看。','Choose another year.','report-update'):`${state==='error'?notice('报告读取失败，保留上一份有效报告。','Report read failed. Previous valid report is preserved.','error'):''}<div class="kpis">${kpi('购入 / 离场','Purchased / Exited','1 / 0')}${kpi('购入金额','Purchase cost','CNY '+cny,'USD '+usd.toFixed(2))}${kpi('回收金额','Recovered','CNY 0',t('无离场事件','No exit events'))}${kpi('中位持有天数','Median holding days',year==='2025'?'612':'296',t('排除月精度和未知日期','Excludes month-only and unknown dates'))}</div><div class="cols"><section class="panel"><h3>${t('月度购入金额 · ','Monthly purchases · ')+(cny?'CNY':'USD')}</h3><div class="chart">${[usd,0,cny,0,0,0,0,0,0,0,0,0].map((n,i)=>`<div class="bar-row"><span>${i+1}${t('月',' mo')}</span><div class="track"><div class="bar" style="width:${n/Math.max(cny,usd,1)*100}%"></div></div><span>${n}</span></div>`).join('')}</div></section><section class="panel"><h3>${t('分类分布','Category distribution')}</h3><p>${t(year==='2025'?'摄影 1':'日用 1',year==='2025'?'Photography 1':'Everyday 1')}</p><h3>${t('币种独立列示','Currencies reported separately')}</h3><p>CNY ${cny.toFixed(2)}</p><p>USD ${usd.toFixed(2)}</p><p class="muted">${t('购入、离场、回收、持有时间均与卡片共用统计口径。','Purchases, exits, recovery and holding time use the same calculation as item cards.')}</p></section></div>${state==='money-edge'?moneyEdge():''}`);}
function reader(){
 let out=top('书页日记','Diary book','第 '+Number(currentMonth)+' 卷 · 2026 年 '+Number(currentMonth)+' 月 · 只读浏览不建文件','Volume '+Number(currentMonth)+' · 2026-'+currentMonth+' · Browsing creates no files',go('DIARY-SEARCH-WRITE','搜索 / 写一笔','Search / Write'));
 if(state==='loading')return out+notice('正在载入当前卷，已读取 12 / 30 天。','Loading current volume: 12 / 30 days.')+btn('取消','Cancel','reader-cancel');
 if(state==='hidden')return out+empty('页面已隐藏','Page hidden','动画与预取已暂停，返回保留当前日期。','Animation and prefetch paused. Date is preserved.','reader-resume');
 if(state==='error')out+=notice('当前卷读取失败；保留已加载内容，可重试。','Current volume failed. Loaded content remains available.','error')+btn('重试','Retry','retry');
 if(state==='fallback')out+=notice('翻页引擎不可用，已切换为无动画阅读。','Page engine unavailable. Switched to no-animation reading.');
 return out+`<div class="toolbar">${btn('月份索引','Month index','month-index')}${input('jump-date','日历跳日','Jump to date','2026-'+currentMonth+'-'+String(currentDay).padStart(2,'0'),'date')}${btn('跳转','Go','jump-date')}${btn('打开原文','Open original','open-original')}</div>${state==='calendar'?notice('已定位同一周期笔记：huhu/diary/2026-11-04.md。','Located the same periodic note: huhu/diary/2026-11-04.md.'):''}${state==='month-index'?`<nav class="month-index actions" aria-label="${t('书口月份索引','Book month index')}">${['09','10','11','12'].map(m=>btn(m+t('月',' month'),m+' month','month-'+m)).join('')}</nav>`:''}<section class="book-wrap"><div class="book"><article class="leaf"><div class="eyebrow">2026 · ${currentMonth}</div><div class="date">${currentDay.toString().padStart(2,'0')} <small>${t('星期三','Wednesday')}</small></div><h3>${t('慢一点，记下来','Slow down, write it down')}</h3>${state==='empty-date'?`<p>${t('这一天还没有笔记。阅读不会创建文件。','There is no note for this day. Reading creates no file.')}</p>${go('DIARY-SEARCH-WRITE','写一笔','Write a note')}`:`<p>${t('早上沿着河边走了很长一段路。天色清亮，风把树影轻轻推到水面上。','A long walk by the river this morning. Clear skies, with shadows drifting over the water.')}</p><p>${t('想把日子里这些细微的变化留下来，不必每一件事都有答案。','I want to keep these small changes in the day. Not everything needs an answer.')}</p><p class="muted mono">huhu/diary/2026-${currentMonth}-${currentDay.toString().padStart(2,'0')}.md</p>`}</article><article class="leaf"><div class="eyebrow">${t('继续阅读','CONTINUE READING')}</div><div class="date">${(currentDay+1).toString().padStart(2,'0')}</div><p>${t('下午整理了书桌，读完一本搁了很久的书。窗外的雨停了。','Tidied the desk and finished a book I had set aside. The rain stopped outside.')}</p><p>${t('给自己留一点空白，也是一种记录。','Leaving some room is also a way to remember.')}</p>${diaryEntries['2026-'+currentMonth+'-'+String(currentDay).padStart(2,'0')]?'<p>'+esc(diaryEntries['2026-'+currentMonth+'-'+String(currentDay).padStart(2,'0')])+'</p>':''}${badge('图片占位','Image placeholder')}</article></div><div class="book-footer">${btn('← 上一页','← Previous','prev-page')}<span class="muted">${t('当前卷 2 页 · 有限预取','2 pages mounted · Bounded prefetch')}</span>${btn('下一页 →','Next →','next-page')}</div></section>`;
}
function searchWrite(){
 let out=top('搜索与写作','Search and write','正文仍是同一份周期笔记。','The same periodic note remains the source.',go('DIARY-READER','返回书页','Back to book'));
 const editing=['editing','saving','saved','discard-confirm','template-cancelled','template-unavailable','conflict','error'].includes(state);
 if(!editing){let text=state==='indexing'?t('建立索引中 · 12 / 30 天，尚不能判断无结果。','Indexing · 12 / 30 days; no-results is not yet known.'):state==='partial-range'?t('仅已加载范围 · 2026-11-01 至 11-12。','Loaded range only · 2026-11-01 through 11-12.'):t('全部范围 · 2026 年，30 天已扫描。','Entire range · 2026, 30 days scanned.');return out+`<div class="toolbar">${input('diary-search','搜索正文','Search diary text')}${btn('搜索','Search','search-diary','primary')}${btn('写一笔','Write a note','write-diary')}</div>${notice(text,text)}${state==='no-results'?empty('全部范围没有匹配','No matches in entire range','扫描已完成。可换个关键词。','Scan complete. Try another query.','clear-diary-search'):`<div class="item-list">${btn('2026-11-04 · 河边的早晨','2026-11-04 · Morning by the river','search-hit')}${btn('2026-11-05 · 雨后的书桌','2026-11-05 · Desk after the rain','search-hit')}</div>`}`;}
 let message={saving:['保存中，请勿重复提交。','Saving. Duplicate submission is disabled.'],saved:['已追加到周期笔记，原有正文保留。','Appended to periodic note; existing text preserved.'], 'template-cancelled':['模板准备已取消，未创建空白文件；草稿仍保留。','Template preparation cancelled. No blank file created; draft retained.'], 'template-unavailable':['模板不可用，未创建文件；请配置模板后重试。','Template unavailable. No file created; configure template and retry.'],conflict:['检测到未保存编辑器或外部修改，未覆盖。请核对原文后合并。','Unsaved editor or external change detected. Nothing overwritten; review original and merge.'],error:['保存失败；日期和草稿均保留。','Save failed. Date and draft are preserved.']}[state];
 return out+`<section class="book-wrap"><div class="writer">${input('write-date','写作日期','Writing date','2026-11-04','date')}<label for="draft">${t('正文','Text')}<textarea id="draft" placeholder="${t('写下今天的一笔…','Write a note for today…')}">${esc(noteDraft||t('今天想记住的一件小事。','One small thing to remember today.'))}</textarea></label>${message?notice(message[0],message[1],['error','conflict','template-unavailable'].includes(state)?'error':''):''}<div class="actions">${btn('放弃','Discard','discard-diary')}${btn('打开原文','Open original','open-original')}${btn(state==='saved'?'已保存':'保存',state==='saved'?'Saved':'Save','save-diary','primary',state==='saving'?'disabled':'')}</div></div></section>${state==='discard-confirm'?notice('草稿尚未保存。选择继续写作，或明确放弃。','Draft is unsaved. Continue writing or explicitly discard.')+btn('继续写作','Keep writing','keep-writing')+btn('确认放弃','Discard draft','confirm-discard','danger'):''}`;
}
function person(){
 if(state==='generic')return top('企业档案','Company archive','企业与自定义类型仍用通用动态表单。','Companies and custom types retain the generic form.')+`<section class="panel"><h3>${t('示例工作室','Example studio')}</h3>${input('company-name','名称','Name',t('示例工作室','Example studio'))}${input('company-address','地址','Address','Taipei')}${btn('保存资料','Save profile','save-person','primary')}</section>`;
 if(state==='loading')return notice('正在读取人物档案…','Loading person archive…');
 if(state==='empty')return empty('暂无人物档案','No person profiles','先在档案中创建人物。','Create a person in Archives.','person-new');
 let tab=state==='profile'?'profile':state==='relations'?'relations':['journal','journal-edit','journal-delete'].includes(state)?'journal':personTab;
 let out=top('人物档案','Person profile','以人物 ID 定位，不以姓名合并。','Identity is based on person ID, not display name.')+`<section class="person-top"><div class="portrait" role="img" aria-label="${t('人物头像占位','Portrait placeholder')}">${t('头像占位','Portrait placeholder')}</div><div><div class="eyebrow">PERSON · ${entity}</div><h2>${t('林青','Lin Qing')}</h2><div class="chips">${badge('朋友','Friend')}${badge('阅读','Reading')}</div><p>${t('喜欢慢慢走路、读书，也记录身边的人和事。','Enjoys walks, books, and keeping track of people and moments.')}</p><p class="muted">${t('资料修订','Profile revision')} 3 · schemaRevision 2</p>${btn('切换同名人物','Switch same-name person','same-name')}</div></section><nav class="segments" aria-label="${t('人物视图','Person views')}">${['overview','profile','relations','journal'].map((x,i)=>`<button data-action="person-tab" data-tab="${x}" aria-pressed="${tab===x}">${t(['概览','资料','关系','纪事'][i],['Overview','Profile','Relations','Journal'][i])}</button>`).join('')}</nav>`;
 if(state==='error'||state==='conflict')out+=notice(state==='conflict'?'档案已变化，保存被拒绝；保留草稿与自由正文。':'读取失败，保留上次有效资料。',state==='conflict'?'Archive changed. Save rejected; draft and free text retained.':'Read failed. Last valid profile retained.','error')+btn('重新读取','Reload','retry');
 if(state==='same-name')out+=notice('当前为 person-002；同名人物的纪事独立。','Now person-002. Same-name people have separate journals.');
 let body=tab==='overview'?`<div class="cols"><section class="panel"><h3>${t('最近纪事','Recent notes')}</h3><p>2026-10-18 · ${t('一起逛了书店','Visited a bookshop together')}</p>${btn('查看全部纪事','View all notes','person-journal')}</section><section class="panel"><h3>${t('关系概览','Relationships')}</h3><p>${t('朋友 2 · 关联企业 1','2 friends · 1 linked company')}</p>${btn('查看关系','View relationships','person-relations')}</section></div>`:tab==='profile'?`<section class="panel"><h3>${t('资料','Profile')}</h3>${input('person-name','姓名','Name',t('林青','Lin Qing'))}${input('person-city','城市','City','Taipei')}<label>${t('备注','Notes')}<textarea>${t('使用档案定义中的字段。','Fields come from the archive definition.')}</textarea></label>${btn('保存资料','Save profile','save-person','primary')}</section>`:tab==='relations'?`<section class="panel"><h3>${t('关系','Relationships')}</h3>${btn('陈远 · 朋友 · person-003','Chen Yuan · Friend · person-003','person-link')}<p class="muted">${t('关系使用独立记录，跳转保持稳定 ID。','Links use independent records and stable IDs.')}</p></section>`:`<section class="panel"><div class="page-top"><h3>${t('手工纪事','Manual journal')}</h3>${btn('新增纪事','Add note','journal-add','primary')}</div><div class="flow"><article ${journalDeleted[entity]?'hidden':''}><small class="mono">${entity} · row-note-001</small><h3>2026-10-18 · ${esc(journalTitles[entity]||t('书店散步','Bookshop walk'))}</h3><p>${t('在河边的书店读了一整个下午。','Read all afternoon at a bookshop by the river.')}</p><div class="actions">${btn('编辑','Edit','journal-edit')}${btn('删除','Delete','journal-delete','danger')}</div></article></div>${state==='journal-edit'?`${input('journal-date','日期','Date','2026-10-18','date')}${input('journal-title','标题','Title',journalTitles[entity]||t('书店散步','Bookshop walk'))}<label>${t('内容','Content')}<textarea id="journal-text">${t('保留未涉及字段与原有正文。','Preserve untouched fields and existing free text.')}</textarea></label>${input('journal-link','关联实体 ID','Linked entity ID','person-003')}${btn('保存纪事','Save note','journal-save','primary')}`:''}${state==='journal-delete'?notice('仅删除 row-note-001，不影响人物自由正文。','Delete only row-note-001; preserve person free text.')+btn('确认删除','Confirm delete','journal-confirm-delete','danger'):''}</section>`;
 return out+`<div class="person-body">${body}</div>`;
}
const healthRows=()=>[
 ['archives','档案','Archives','警告','Warning','重复 ID 1；关系缺失端点 1。','1 duplicate ID; 1 missing relationship endpoint.','warn'],
 ['belongings','归物','Belongings','错误','Error','状态投影与生命周期不一致 1。','1 projection differs from lifecycle.','error'],
 ['periodic','周期日记','Periodic diary',state==='unavailable'?'不可用':'通过',state==='unavailable'?'Unavailable':'Passed','路径与模板引用检查。','Paths and template references checked.','ok'],
 ['safe','保险箱','Vault','锁定','Locked','仅检查容器存在、版本和大小；不解密。','Container existence, version and size only. No decryption.','warn']
].map((r,i)=>`<div class="result-row"><strong>${t(r[1],r[2])}</strong><div><span class="status ${state==='provider-error'&&i===0?'error':r[7]}">${state==='provider-error'&&i===0?t('失败','Failed'):t(r[3],r[4])}</span><p>${state==='provider-error'&&i===0?t('此检查失败，其余检查继续。','This provider failed; other checks continued.'):t(r[5],r[6])}</p><small class="mono">${r[0]} · ${i+1} ${t('项','checks')}</small></div>${i===1?go('HEALTH-REPAIR','预览修复','Preview repair'):btn('查看定位','View location','health-location','','data-provider="'+r[0]+'"')}</div>`).join('');
function health(){
 let out=top('数据体检','Data checkup','手动、只读、有限范围；报告不包含正文或账号名。','Manual, read-only and scoped. No content or account names in reports.');
 if(state==='default')return out+`<section class="empty"><h3>${t('还没体检过','No checkup yet')}</h3><p>${t('检查档案、归物、周期日记和保险箱容器。扫描不会修改文件。','Check Archives, Belongings, periodic notes and the vault container. Scanning does not modify files.')}</p>${btn('开始体检','Start checkup','scan','primary')}</section>`;
 if(state==='running')return out+`<section class="panel"><h3>${t('扫描中 · 2 / 4 组','Scanning · 2 / 4 providers')}</h3><progress max="4" value="2" aria-label="${t('扫描进度','Scan progress')}"></progress><p>${t('档案 128 / 256；归物等待中。','Archives 128 / 256; Belongings queued.')}</p>${btn('取消扫描','Cancel scan','cancel-scan')}${btn('完成本次演示扫描','Finish preview scan','finish-scan')}</section>`;
 if(state==='stale')out+=notice('检查结果已过期，数据可能已变化。请重新扫描。','Results are stale. Data may have changed; rescan before repairing.','warn');
 if(state==='cancelled'||state==='incomplete')out+=notice(state==='cancelled'?'已取消，2 / 4 组完成；未完成项不算通过。':'扫描未完成，保留已确认结果；未完成项不算通过。',state==='cancelled'?'Cancelled, 2 / 4 providers completed. Remaining checks are not passed.':'Incomplete. Confirmed results retained; remaining checks are not passed.','warn');
 if(state==='notification')out+=notice('通知中心 · 体检结果已可回看，打开回到此报告。','Notification center · Checkup results available; opening returns to this report.')+btn('从通知打开报告','Open report from notification','open-health-notification');
 return out+`<div class="kpis">${kpi('检查范围','Scope','4',t('仅所需 provider','Required providers only'))}${kpi('已检查','Checked','260')}${kpi('排除 / 锁定','Excluded / Locked','2 / 1')}${kpi('检查时间','Checked at','10:30',state==='stale'?t('已过期','Stale'):'2026-11-04')}</div>${notice('存在需要处理的问题；锁定、不可用和跳过均未计为通过。','Issues need attention. Locked, unavailable and skipped checks are not counted as passed.','warn')}<section class="panel"><h3>${t('检查结果','Check results')}</h3>${healthRows()}<div class="result-row"><strong>${t('排除项','Exclusions')}</strong><p>${t('用户排除目录 2；未来版本 1 项跳过，不算通过。','2 user-excluded directories; 1 future-version item skipped, not passed.')}</p><span class="status">${t('跳过','Skipped')}</span></div></section><div class="toolbar">${btn('重新扫描','Rescan','scan','primary')}${go('HEALTH-REPAIR','有限修复','Limited repair')}${btn('通知中心','Notifications','health-notification')}</div>`;
}
function repair(){let out=top('有限修复','Limited repair','所有修改交回数据 owner；先预览，再确认。','Changes return to the data owner. Preview before confirming.',go('HEALTH-SCAN','返回体检','Back to checkup'));
 if(state==='unsupported')return out+notice('坏文件、无端点关系、孤儿密文和迁移备份只提供定位，不允许自动清理。','Bad files, missing endpoints, orphan ciphertext and migration backups are location-only; no automatic cleanup.','warn')+`<section class="panel"><h3>${t('关系端点缺失','Missing relationship endpoint')}</h3><p class="mono">archive-017 · relation-008</p><p>${t('请回档案核对。此处没有修复按钮。','Review in Archives. There is no repair action here.')}</p></section>`;
 let stage={default:['可生成计划','Ready to plan'],preview:['影响预览','Impact preview'],confirm:['等待确认','Awaiting confirmation'],revalidating:['正在重新校验当前哈希','Revalidating current hashes'],complete:['修复与复查已完成','Repair and recheck complete'],stale:['拒绝旧哈希，未修改','Stale hash rejected, nothing changed'],partial:['部分提交，存在未完成项','Partially committed, unfinished items remain'],restore:['恢复事务可用','Recovery transaction available'],cancelled:['已取消，未执行修复','Cancelled, no repair executed']}[state]||['影响预览','Impact preview'];
 out+=notice(stage[0],stage[1],['stale','partial'].includes(state)?'error':'')+`<section class="panel"><h3>${t('计划范围','Plan scope')}</h3><div class="result-row"><strong>${t('档案索引重建','Rebuild archive index')}</strong><p>${t('重建派生索引，不修改档案 Markdown。','Rebuild derived index; archive Markdown is unchanged.')}</p><span class="mono">plan-index-01</span></div><div class="result-row"><strong>${t('归物投影纠正','Correct belongings projection')}</strong><p>${t('依据生命周期重算 1 件当前状态，保留历史事件。','Recompute 1 current state from lifecycle; preserve events.')}</p><span class="mono">plan-projection-01</span></div><p>${t('执行顺序：owner 哈希重验 → 备份 / 恢复事务 → 修改 → 逐项复查。','Order: owner hash validation → backup / recovery transaction → change → per-item recheck.')}</p><p class="mono">operationId: repair-demo-001 · expectedHash: snapshot-01</p>${state==='partial'?`<p>${t('已提交：索引重建，复查通过。未提交：归物投影，写入失败。','Committed: index rebuild, recheck passed. Not committed: projection, write failed.')}</p>${btn('查看恢复事务','View recovery transaction','restore')}`:''}${state==='restore'?`<p class="mono">recovery-demo-001</p><p>${t('可核对备份及已提交项；恢复由数据 owner 执行。','Review backup and committed items; recovery is performed by the owner.')}</p>`:''}<div class="actions">${state==='default'?btn('生成修复计划','Generate repair plan','repair-plan','primary'):state==='preview'?btn('继续确认','Review confirmation','repair-confirm','primary'):state==='confirm'?btn('确认本次修复','Confirm this repair','repair-execute','primary'):state==='revalidating'?btn('校验中','Validating','noop','primary','disabled'):state==='stale'?go('HEALTH-SCAN','重新扫描','Rescan'):state==='complete'?go('HEALTH-SCAN','查看复查报告','View recheck report'):''}${btn('取消','Cancel','cancel-repair')}</div></section>${state==='confirm'?notice('将执行以上两项限定修复。未确认前不会修改数据。','Only the two listed repairs will run. No changes before confirmation.','warn'):''}`;
 return out;
}
function render(){
 const p=pages.find(p=>p.id===page);document.documentElement.lang=lang==='zh'?'zh-CN':'en';$('#page-title').textContent=t(p.title,p.en);$('#language').textContent=lang==='zh'?'English':'中文';$('#theme').textContent=t('切换亮暗','Toggle theme');$('#page-picker').innerHTML=pages.map(x=>`<option value="${x.id}" ${x.id===page?'selected':''}>${t(x.title,x.en)} · ${x.id}</option>`).join('');$('#state-picker').innerHTML=p.states.map(x=>`<option ${x===state?'selected':''}>${x}</option>`).join('');$('#state-id').textContent=page+':'+state;
 $('#view').innerHTML=({'SAFE-QUICK':quick,'SAFE-WORKSPACE':safe,'BELONGINGS':belongings,'BELONGINGS-REPORT':report,'DIARY-READER':reader,'DIARY-SEARCH-WRITE':searchWrite,'PERSON-READING':person,'HEALTH-SCAN':health,'HEALTH-REPAIR':repair}[page])();
 document.querySelectorAll('.rail button').forEach(b=>b.setAttribute('aria-current',b.dataset.page===page?'page':'false'));
 $('#view').dataset.page=page;$('#view').dataset.state=state;
}
function set(s){state=s;render();}
function navigate(p){if(noteDraft&&page==='DIARY-SEARCH-WRITE'&&p!==page){pendingPage=p;set('discard-confirm');return;}page=p;state='default';selected=0;filter='all';quickQuery='';quickOpen=true;personTab='overview';render();}
let pendingPage=null,dialogReturn=null;
function dialog(title,body){dialogReturn=document.activeElement;$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=body;$('#dialog').showModal();$('#dialog').querySelector('input,button,select,textarea')?.focus();}
function closeDialog(){if($('#dialog').open)$('#dialog').close();dialogReturn?.focus();}
function generated(){const groups=['ABCDEFGHJKLMNPQRSTUVWXYZ','abcdefghijkmnopqrstuvwxyz','23456789','!@#$%&*?'];const rand=n=>{const a=new Uint32Array(1);const limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;};let result=groups.map(g=>g[rand(g.length)]);const all=groups.join('');while(result.length<12)result.push(all[rand(all.length)]);for(let i=11;i>0;i--){const j=rand(i+1);[result[i],result[j]]=[result[j],result[i]];}window.generatedPreview=result.join('');set('generated');}
const actions={
 'language':()=>{lang=lang==='zh'?'en':'zh';render();},'theme':()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';},
 'menu':()=>dialog(t('页面导航','Page navigation'),`<nav class="menu-grid">${pages.map(p=>go(p.id,p.title,p.en)).join('')}</nav>`),
 'page-menu':()=>dialog(t('页面菜单','Page menu'),go(page,t('在工作台中打开','Open in workbench'),t('在工作台中打开','Open in workbench'))+btn('关闭菜单','Close menu','close-dialog')),
 'close-dialog':closeDialog,'unlock':()=>{quickOpen=true;quickQuery='';set('default');$('#quick-search')?.focus();},'unlock-workspace':()=>set('default'),
 'lock':()=>{generation++;quickQuery='';quickOpen=false;window.generatedPreview='';set('closed');},'lock-workspace':()=>set('locked'),'close-quick':()=>{generation++;quickOpen=false;quickQuery='';window.generatedPreview='';set('closed');},'open-quick':()=>{quickOpen=true;set('default');},
 'copy-secret':()=>{if(page==='SAFE-QUICK'&&!quickOpen)return;const mine=++generation;setTimeout(()=>{if(mine!==generation)return;if(page==='SAFE-QUICK'&&quickOpen)set('copied');else if(page==='SAFE-WORKSPACE')dialog(t('复制结果','Copy result'),notice('已模拟复制密码；真实剪贴板由后续实现验证。','Password copy simulated; real clipboard requires implementation verification.'));},80);},
 'copy-account':()=>dialog(t('复制结果','Copy result'),notice('已模拟复制账号。','Account copy simulated.')),'generate':generated,
 'pick-account':el=>{selected=Number(el.dataset.index);if(page==='SAFE-QUICK')render();else set('detail');},'back-list':()=>set('default'),
 'scope-all':()=>{filter='all';render();},'scope-fav':()=>{filter='fav';render();},'scope-work':()=>{filter='work';render();},'relation':()=>{selected=1;set('relations');},'backlink':()=>{selected=2;set('relations');},
 'trash':()=>dialog(t('回收站','Trash'),empty('回收站为空','Trash is empty','当前没有已删除条目。','No deleted entries.','close-dialog')),
 'backup':()=>dialog(t('备份与恢复','Backup and restore'),notice('沿用现有保险箱备份与恢复入口，不更改密文格式。','Use existing vault backup and recovery. Ciphertext format is unchanged.')),
 'add-account':()=>dialog(t('新增账号','Add account'),input('new-account','账号','Account')+input('new-pass','密码','Password','','password')+btn('保存','Save','form-save','primary')),
 'edit-account':()=>dialog(t('编辑账号','Edit account'),input('edit-phone','手机号','Phone','+886 900 000 000')+input('edit-email','邮箱','Email','demo@example.test')+btn('保存','Save','form-save','primary')),
 'form-save':()=>{closeDialog();dialog(t('演示结果','Preview result'),notice('演示已更新；不会写入文件。','Preview updated. No file is written.'));},
 'new-item':()=>dialog(t('记录物品','Add belonging'),input('item-name','名称','Name')+input('item-price','购入金额','Purchase price')+input('item-currency','币种','Currency','CNY')+btn('保存','Save','form-save','primary')),
 'edit-item':()=>dialog(t('完整档案','Full archive'),notice('通用档案表单保留现有字段与修订合并。','Generic archive form preserves existing fields and revision merging.')+input('object-name','名称','Name',t('随身相机','Camera'))+btn('保存','Save','form-save','primary')),
 'item-detail':()=>set('detail'),'filter-item':el=>{filter=el.dataset.filter;render();},'clear-item-filter':()=>{filter='all';set('default');},
 'status-in':()=>{objectStatus='使用中';set('returned');},'status-idle':()=>{objectStatus='闲置';set('returned');},'status-resold':()=>transition('已转卖','resold'),'status-discarded':()=>transition('已丢弃','discarded'),'return-item':()=>{objectStatus='使用中';lifeEvents.push({rowId:'row-'+String(lifeEvents.length+1).padStart(3,'0'),date:'2026-11-04',label:t('返库','Returned')});set('returned');},'undo-item':()=>{if(lastTransition){objectStatus=lastTransition.status;exitDate=lastTransition.date;resalePrice=lastTransition.price;lifeEvents.push({rowId:'row-'+String(lifeEvents.length+1).padStart(3,'0'),date:'2026-11-04',label:t('撤销上次流转','Previous transition undone')});lastTransition=null;}set('undo');},
 'commit-transition':()=>{lastTransition={status:objectStatus,date:exitDate,price:resalePrice};exitDate=$('#exit-date').value||exitDate;resalePrice=$('#resale-price').value;objectStatus=pendingStatus;lifeEvents.push({rowId:'row-'+String(lifeEvents.length+1).padStart(3,'0'),date:exitDate,label:pendingStatus});closeDialog();set(pendingState);},'report-update':()=>set('default'),
 'next-page':()=>{currentDay=Math.min(currentDay+2,28);set('next-page');},'prev-page':()=>{currentDay=Math.max(currentDay-2,1);set('next-page');},'jump-date':()=>{currentMonth=$('#jump-date').value.slice(5,7)||'11';currentDay=Number($('#jump-date').value.slice(-2))||4;set('calendar');},'month-index':()=>set('month-index'),'reader-cancel':()=>set('hidden'),'reader-resume':()=>set('default'),
 'month-09':()=>{currentMonth='09';currentDay=1;set('calendar');},'month-10':()=>{currentMonth='10';currentDay=1;set('calendar');},'month-11':()=>{currentMonth='11';currentDay=4;currentMonth='11';set('calendar');},'month-12':()=>{currentMonth='12';currentDay=1;set('empty-date');},
 'open-original':()=>dialog(t('打开原文','Open original'),`<p class="mono">huhu/diary/2026-${currentMonth}-${currentDay.toString().padStart(2,'0')}.md</p>`+notice('生产实现通过现有周期笔记入口打开同一文件。','Implementation opens this same file through the periodic-note service.')),
 'write-diary':()=>set('editing'),'search-diary':()=>set($('#diary-search').value==='missing'?'no-results':'partial-range'),'clear-diary-search':()=>set('default'),'search-hit':()=>{page='DIARY-READER';currentDay=4;currentMonth='11';set('calendar');},
 'save-diary':()=>{noteDraft=$('#draft')?.value||noteDraft;const date=$('#write-date').value;diaryEntries[date]=(diaryEntries[date]||'')+'\n'+noteDraft;currentMonth=date.slice(5,7);currentDay=Number(date.slice(-2));set('saving');setTimeout(()=>{if(page==='DIARY-SEARCH-WRITE'&&state==='saving'){noteDraft='';set('saved');}},300);},'discard-diary':()=>{noteDraft=$('#draft')?.value||noteDraft;set('discard-confirm');},'keep-writing':()=>set('editing'),'confirm-discard':()=>{noteDraft='';if(pendingPage){page=pendingPage;pendingPage=null;}set('default');},
 'person-tab':el=>{personTab=el.dataset.tab;set(personTab==='overview'?'default':personTab);},'same-name':()=>{entity=entity==='person-001'?'person-002':'person-001';set('same-name');},'person-journal':()=>{personTab='journal';set('journal');},'person-relations':()=>{personTab='relations';set('relations');},'person-link':()=>dialog(t('关联人物','Linked person'),'<p class="mono">person-003</p>'+notice('按稳定 ID 跳转，不按姓名定位。','Navigate by stable ID, not name.')),
 'journal-add':()=>set('journal-edit'),'journal-edit':()=>set('journal-edit'),'journal-delete':()=>set('journal-delete'),'journal-save':()=>{journalTitles[entity]=$('#journal-title').value;journalDeleted[entity]=false;set('journal');},'journal-confirm-delete':()=>{journalDeleted[entity]=true;set('journal');},'save-person':()=>dialog(t('保存结果','Save result'),notice('已模拟 owner 提交回执，原有自由正文保留。','Owner commit receipt simulated; free text preserved.')),'person-new':()=>set('profile'),
 'scan':()=>set('running'),'cancel-scan':()=>set('cancelled'),'finish-scan':()=>set('complete'),'health-notification':()=>set('notification'),'open-health-notification':()=>set('complete'),
 'health-location':el=>dialog(t('脱敏定位','Redacted location'),`<p class="mono">provider: ${el.dataset.provider} · object-017</p>`+notice('不含正文、账号名或秘密。','No content, account names or secrets.')),
 'repair-plan':()=>set('preview'),'repair-confirm':()=>set('confirm'),'repair-execute':()=>{set('revalidating');setTimeout(()=>{if(page==='HEALTH-REPAIR'&&state==='revalidating')set('complete');},300);},'cancel-repair':()=>set('cancelled'),'restore':()=>set('restore'),'noop':()=>{},'retry':()=>set('default')
};
let pendingStatus='',pendingState='';
function transition(status,next){pendingStatus=status;pendingState=next;set('transition');dialog(t('确认状态流转','Confirm transition'),input('exit-date','出离日期（可修改）','Exit date (editable)',exitDate,'date')+input('resale-price','售价（留空为未知）','Resale price (blank is unknown)')+notice('离场态互换保留日期；追加 rowId 事件，不覆盖历史。','Switching exit states preserves date; append a rowId event, never overwrite history.')+btn('取消','Cancel','close-dialog')+btn('确认流转','Confirm transition','commit-transition','primary'));}
document.addEventListener('click',event=>{const el=event.target.closest('button');if(!el)return;if(el.dataset.page){closeDialog();navigate(el.dataset.page);return;}actions[el.dataset.action]?.(el);});
$('#page-picker').addEventListener('change',e=>navigate(e.target.value));$('#state-picker').addEventListener('change',e=>{generation++;state=e.target.value;if(state==='generated'&&!window.generatedPreview){generated();return;}if(state==='closed'){quickQuery='';quickOpen=false;}if(state==='default')quickOpen=true;render();});
document.addEventListener('input',e=>{if(e.target.id==='quick-search'){quickQuery=e.target.value;state=['GitHub demo@example.test','Mail reader@example.test','Cloud work@example.test'].some(x=>x.toLowerCase().includes(quickQuery.toLowerCase()))?'default':'no-results';const pos=e.target.selectionStart;render();$('#quick-search')?.focus();$('#quick-search')?.setSelectionRange(pos,pos);}if(e.target.id==='draft')noteDraft=e.target.value;if(e.target.id==='bel-search'&&e.target.value==='missing')set('no-results');if(e.target.id==='safe-search'){document.querySelectorAll('.entries .row').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(e.target.value.toLowerCase()));}});
document.addEventListener('change',e=>{if(e.target.id==='report-year')set(e.target.value==='2025'?'historical':'default');});
document.addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Escape'&&$('#dialog').open)return;if(page==='SAFE-QUICK'&&quickOpen){if(e.key==='Escape'){actions['close-quick']();e.preventDefault();}if(e.key==='ArrowDown'||e.key==='ArrowUp'){selected=(selected+(e.key==='ArrowDown'?1:2))%3;render();$('#quick-search')?.focus();e.preventDefault();}if(e.key==='Enter'&&e.target.id==='quick-search'){actions['copy-secret']();e.preventDefault();}}if(page==='DIARY-READER'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){if(e.key==='ArrowRight'){actions['next-page']();e.preventDefault();}if(e.key==='ArrowLeft'){actions['prev-page']();e.preventDefault();}}});
$('#dialog').addEventListener('close',()=>dialogReturn?.focus());
render();
})();
```
<!-- /PROTOTYPE-FILE -->

## Validation and Handoff

具体命令、退出码和实际浏览器观察见 evidence/report-validation.md；批准备忘见 approval-r2.md。Comparison: comparison/index.html；final: final/index.html。下游读取 change DESIGN 的同一 revision/digest/page/AC，不自行选风格。真实宿主与安全数据路径由实施票验证，本包不冒充生产验收。
