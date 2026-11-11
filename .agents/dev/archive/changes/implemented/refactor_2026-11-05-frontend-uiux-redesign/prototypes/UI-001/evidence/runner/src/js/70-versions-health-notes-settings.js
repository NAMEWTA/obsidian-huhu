/* ==========================================================================
   版本 · checkpoints, diff, restore
   ========================================================================== */
PAGES.versioning = {
  title: '版本', states: ['default', 'diff', 'restore-confirm', 'empty'], file: '产品周报.md', sel: 'c2',
  files: [['产品周报.md', 4], ['设计规范.md', 2], ['huhu/journal/2026-11-05.md', 3], ['读书笔记/设计中的设计.md', 1], ['空白草稿.md', 0]],
  enter(s) { this.applyState(s); },
  applyState(s) { this.file = s === 'empty' ? '空白草稿.md' : '产品周报.md'; this.sel = 'c2'; this.diff = s === 'diff' || s === 'restore-confirm'; if (s === 'restore-confirm') setTimeout(() => this.restore(), 0); },
  panel() { return h`<div class="panel-head"><h2>版本</h2><button class="btn btn-ghost btn-icon btn-sm" aria-label="立即创建检查点">${icon('git-commit-horizontal', 'ico-sm')}</button></div><div class="panel-search"><div class="input-group">${icon('search', 'ico-sm')}<input class="input" placeholder="搜索文件" aria-label="搜索有历史的文件"></div></div>
    <div class="panel-body hu-scroll"><div class="tree-group">最近修改</div>${this.files.map(([f, n]) => h`<button class="nav-item" data-action="ver-file" data-f="${f}" aria-current="${this.file === f}">${icon('file-text')}<span class="truncate grow">${f.split('/').pop()}</span><span class="count">${n || ''}</span></button>`)}</div>
    <div class="panel-foot"><p class="muted" style="font-size:12px">${icon('git-branch', 'ico-sm')} main · 3 个文件待提交</p></div>`; },
  main() {
    const list = this.file === '空白草稿.md' ? [] : DATA.versions;
    const head = pageHead(this.file, { sub: list.length ? `${list.length} 个检查点` : '', actions: h`<div class="seg" role="radiogroup" aria-label="视图"><button role="radio" aria-checked="${!this.diff}" data-action="ver-mode" data-v="list">${icon('list', 'ico-sm')}<span class="hide-sm">历史</span></button><button role="radio" aria-checked="${!!this.diff}" data-action="ver-mode" data-v="diff">${icon('git-compare', 'ico-sm')}<span class="hide-sm">比较</span></button></div>` });
    if (!list.length) return h`${head}<div class="page-body"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon('history', 'ico-lg')}</span><h2>这个文件还没有历史</h2><p>编辑停顿 2 分钟后会自动创建检查点，也可以手动创建。</p><button class="btn btn-secondary">${icon('git-commit-horizontal', 'ico-sm')}创建检查点</button></div></div>`;
    const timeline = h`<ol class="ver-list">${list.map(v => h`<li><button class="ver-item" data-action="ver-sel" data-id="${v.id}" aria-current="${this.sel === v.id}"><span class="ver-dot ${v.by === '手动' ? 'is-manual' : ''}"></span><span class="grow"><span class="ver-msg">${v.msg}</span><span class="ver-meta num">${v.at} · <span class="add">+${v.add}</span> <span class="del">−${v.del}</span></span></span></button></li>`)}</ol>`;
    const diff = h`<div class="diff card"><header class="card-head"><h3 class="card-title">${icon('git-compare')}今天 09:15 → 当前</h3><span class="spacer"></span><button class="btn btn-secondary btn-sm" data-action="ver-restore">${icon('undo-2', 'ico-sm')}恢复到此版本</button></header><div class="diff-body mono">
      <div class="dl ctx"><span class="ln">12</span><span>## 设计 token</span></div><div class="dl del"><span class="ln">13</span><span>- 按钮颜色沿用宿主默认强调色。</span></div><div class="dl add"><span class="ln">13</span><span>+ 按钮、选中与焦点统一使用 --hu-accent（默认墨青）。</span></div><div class="dl add"><span class="ln">14</span><span>+ 控件边界不低于 3:1，正文不低于 7:1。</span></div><div class="dl ctx"><span class="ln">15</span><span></span></div><div class="dl ctx"><span class="ln">16</span><span>## 下周计划</span></div><div class="dl del"><span class="ln">17</span><span>- 先做自动化独立详情页。</span></div><div class="dl add"><span class="ln">17</span><span>+ 自动化改为列表 + 右侧详情。</span></div></div></div>`;
    return h`${head}<div class="page-body hu-scroll"><div class="page-pad ver ${this.diff ? 'is-diff' : ''}">${timeline}${this.diff ? diff : h`<div class="card ver-preview"><header class="card-head"><h3 class="card-title">${icon('file-text')}${DATA.versions.find(v => v.id === this.sel).msg}</h3><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-action="ver-mode" data-v="diff">${icon('git-compare', 'ico-sm')}与当前比较</button><button class="btn btn-secondary btn-sm" data-action="ver-restore">恢复</button></header><div class="card-body reading" style="font-size:15px"><h3>产品周报 · 第 45 周</h3><p>本周完成了工作台设计系统的方向：暖中性的纸感底色，单一强调色，细线分隔。</p><p>自动化详情改为列表旁的右侧详情；档案二级栏改为类型到记录的目录树。</p></div></div>`}</div></div>`;
  },
  restore() { confirmDialog({ title: '恢复到“补充设计 token 小节”？', body: '当前内容会先保存为新的检查点，再用 今天 09:15 的版本替换正文。可以随时撤销。', confirm: '恢复', onConfirm: () => { S.state = 'default'; this.diff = false; renderMain(); toast('已恢复，原内容保存为检查点', { action: '撤销' }); } }); },
  actions: {
    'ver-file': el => { const P = PAGES.versioning; P.file = el.dataset.f; S.state = P.file === '空白草稿.md' ? 'empty' : 'default'; S.panelSheet = false; renderPanel(); renderMain(); },
    'ver-sel': el => { PAGES.versioning.sel = el.dataset.id; renderMain(); },
    'ver-mode': el => { PAGES.versioning.diff = el.dataset.v === 'diff'; S.state = PAGES.versioning.diff ? 'diff' : 'default'; renderMain(); },
    'ver-restore': () => PAGES.versioning.restore(),
  },
};

/* ==========================================================================
   体检 · on-demand read-only scan, limited owner repairs
   ========================================================================== */
PAGES.health = {
  title: '体检', states: ['idle', 'scanning', 'results', 'repair-plan', 'partial', 'cancelled'], progress: 0,
  enter(s) { this.applyState(s); },
  applyState(s) { clearInterval(this._t); this.progress = s === 'scanning' ? 63 : 100; if (s === 'repair-plan') setTimeout(() => this.plan(), 0); },
  start() { S.state = 'scanning'; this.progress = 0; renderMain(); clearInterval(this._t); this._t = setInterval(() => { this.progress = Math.min(100, this.progress + 9); if (S.page !== 'health') { clearInterval(this._t); return; } if (this.progress >= 100) { clearInterval(this._t); S.state = 'results'; renderMain(); toast('体检完成：发现 5 个问题'); } else this.paintProgress(); }, 220); },
  leave() { clearInterval(this._t); },
  paintProgress() { const b = $('#hp-bar'); if (b) { b.style.width = this.progress + '%'; $('#hp-num').textContent = this.progress + '%'; $$('.scan-step').forEach((el, i) => { const done = this.progress >= (i + 1) * 20; el.classList.toggle('is-done', done); el.classList.toggle('is-active', !done && this.progress >= i * 20); }); } },
  main() {
    const st = S.state, owners = ['档案', '任务', '自动化', '日记', '保险箱'];
    const head = pageHead('数据体检', { sub: st === 'idle' ? '上次体检 · 11月1日' : '', actions: st === 'scanning' ? h`<button class="btn btn-secondary" data-action="hc-cancel">取消</button>` : h`<button class="btn ${st === 'idle' ? 'btn-primary' : 'btn-secondary'}" data-action="hc-start">${icon('scan-search', 'ico-sm')}${st === 'idle' ? '开始体检' : '重新体检'}</button>` });
    if (st === 'idle') return h`${head}<div class="page-body hu-scroll"><div class="page-pad page-narrow"><section class="hc-hero card"><span class="hc-mark">${icon('heart-pulse', 'ico-xl')}</span><div><h2>检查库内数据是否一致</h2><p class="fg2">只读扫描档案引用、重复任务、自动化目录和日记模板。发现问题后由各模块给出有限修复，执行前都会先给你看计划。</p><div class="row" style="margin-top:14px"><button class="btn btn-primary" data-action="hc-start">${icon('scan-search', 'ico-sm')}开始体检</button><span class="muted" style="font-size:12px">约 10 秒 · 不会修改任何文件</span></div></div></section>
      <div class="section-title" style="margin-top:24px">检查范围</div><div class="scope-grid">${owners.map(o => h`<div class="scope"><span class="dot dot-success"></span>${o}<span class="muted">上次正常</span></div>`)}</div></div></div>`;
    if (st === 'scanning') return h`${head}<div class="page-body hu-scroll"><div class="page-pad page-narrow"><section class="card card-body scan"><div class="row"><span class="spinner"></span><strong>正在扫描…</strong><span class="spacer"></span><span class="num" id="hp-num">${this.progress}%</span></div><div class="progress" style="margin:12px 0 16px"><span id="hp-bar" style="width:${this.progress}%"></span></div>
      <ol class="scan-steps">${owners.map((o, i) => h`<li class="scan-step ${this.progress >= (i + 1) * 20 ? 'is-done' : this.progress >= i * 20 ? 'is-active' : ''}">${icon('circle-check', 'ico-sm')}<span>${o}</span></li>`)}</ol><p class="field-help" style="margin-top:12px">取消后，已完成的检查结果会保留。</p></section></div></div>`;
    const sevBadge = s => ({ danger: h`<span class="badge badge-danger">需处理</span>`, warning: h`<span class="badge badge-warning">建议修复</span>`, info: h`<span class="badge">提示</span>` }[s]);
    const groups = [...new Set(DATA.health.map(x => x.owner))];
    return h`${head}<div class="page-body hu-scroll"><div class="page-pad page-narrow">
      ${st === 'partial' ? h`<div class="notice notice-warning" style="margin-bottom:16px">${icon('triangle-alert')}<div><p class="notice-title">部分修复完成：成功 2 项，失败 1 项</p><p>“重新生成下一次实例”失败：任务文件被其他窗口占用。其余修复已写入，未改动的数据保持原样。</p></div><button class="btn btn-secondary btn-sm" data-action="hc-plan">重试失败项</button></div>` : ''}
      ${st === 'cancelled' ? h`<div class="notice" style="margin-bottom:16px">${icon('circle-pause')}<span>体检已取消。已完成档案、任务两项检查，结果如下。</span><button class="btn btn-secondary btn-sm" data-action="hc-start">继续体检</button></div>` : ''}
      <div class="kpis"><div class="kpi"><span class="kpi-label">需处理</span><span class="kpi-value num" style="color:var(--hu-danger)">1</span></div><div class="kpi"><span class="kpi-label">建议修复</span><span class="kpi-value num" style="color:var(--hu-warning)">2</span></div><div class="kpi"><span class="kpi-label">提示</span><span class="kpi-value num">2</span></div><div class="kpi"><span class="kpi-label">可自动修复</span><span class="kpi-value num">3</span><button class="btn btn-primary btn-sm" style="margin-top:6px" data-action="hc-plan">预览修复计划</button></div></div>
      ${groups.filter(g => st !== 'cancelled' || ['档案', '任务'].includes(g)).map(g => h`<section class="hc-group"><div class="section-title">${g}<span class="muted">${DATA.health.filter(x => x.owner === g).length}</span></div><div class="card">${DATA.health.filter(x => x.owner === g).map(x => h`<div class="hc-item"><span class="dot dot-${x.sev === 'info' ? 'info' : x.sev}"></span><div class="grow"><p class="hc-title">${x.title}</p><p class="muted">${x.detail}</p></div>${sevBadge(x.sev)}${x.fix ? h`<button class="btn btn-ghost btn-sm" data-action="hc-plan">${x.fix}</button>` : h`<button class="btn btn-ghost btn-sm" data-action="go" data-page="${g === '自动化' ? 'automations' : 'archives'}">去查看</button>`}</div>`)}</div></section>`)}
    </div></div>`;
  },
  plan() {
    const fixes = DATA.health.filter(x => x.fix);
    openLayer({ kind: 'dialog', label: '修复计划', content: h`<div class="dialog-head"><div><h2>修复计划</h2><p>每项修复由对应模块执行，只改动下面列出的内容。</p></div><button class="btn btn-ghost btn-icon btn-sm" data-action="layer-close" aria-label="关闭">${icon('x', 'ico-sm')}</button></div>
      <div class="dialog-body"><ul class="plan-list">${fixes.map(x => h`<li><label class="choice"><span class="check"><input type="checkbox" checked aria-label="${x.fix}">${CHECK_SVG}</span><span class="choice-text"><span>${x.fix}</span><span class="field-help">${x.owner} · ${x.detail}</span></span></label></li>`)}</ul><div class="notice notice-info" style="margin-top:12px">${icon('info')}<span>执行前会为受影响文件创建检查点，可在“版本”中恢复。</span></div></div>
      <div class="dialog-foot"><button class="btn btn-secondary" data-action="layer-close">取消</button><button class="btn btn-primary" data-action="hc-run">执行 ${fixes.length} 项修复</button></div>` });
  },
  actions: {
    'hc-start': () => PAGES.health.start(),
    'hc-cancel': () => { clearInterval(PAGES.health._t); S.state = 'cancelled'; renderMain(); toast('体检已取消，已完成的结果保留', { kind: 'info' }); },
    'hc-plan': () => PAGES.health.plan(),
    'hc-run': () => { closeTop(true); S.state = 'partial'; renderMain(); toast('修复完成 2 项，失败 1 项', { kind: 'error', action: '查看' }); },
  },
};

/* ==========================================================================
   宿主笔记场景 · navigator leaf + note + comments/version leaf (host leaves)
   ========================================================================== */
PAGES.notes = {
  title: '笔记（宿主）', states: ['default', 'comment-editing', 'empty'], tab: 'comments',
  scene() {
    const st = S.state;
    const tree = [['huhu', 0, 'folder-open'], ['journal', 1, 'folder'], ['档案', 1, 'folder'], ['产品周报.md', 0, 'file-text'], ['设计规范.md', 0, 'file-text'], ['读书笔记', 0, 'folder']];
    const comments = st === 'empty' ? [] : [{ who: '我', at: '今天 11:20', quote: '单一强调色', body: '默认墨青；设置里还提供靛蓝、松绿、赭石、梅紫、石墨。' }, { who: '我', at: '今天 10:02', quote: '右侧详情', body: '主区剩余不足 640px 时改为覆盖 Sheet。' }];
    return h`<div class="notes-scene"><aside class="leaf leaf-left" aria-label="导航器"><div class="leaf-head">${icon('folder', 'ico-sm')}导航器<span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" aria-label="新建笔记">${icon('square-pen', 'ico-sm')}</button></div>
      <div class="panel-search" style="padding-top:8px"><div class="input-group">${icon('search', 'ico-sm')}<input class="input" placeholder="搜索笔记" aria-label="搜索笔记"></div></div>
      <div class="tree hu-scroll" role="tree" aria-label="笔记">${tree.map(([n, l, ic]) => h`<div class="tree-row" role="treeitem" tabindex="${n === '产品周报.md' ? 0 : -1}" aria-selected="${n === '产品周报.md'}" style="--lvl:${l}"><span class="tree-twist ${ic === 'file-text' ? 'leaf' : ''}">${icon('chevron-right')}</span>${icon(ic)}<span class="tree-label">${n}</span></div>`)}</div></aside>
      <main class="editor" id="main" data-page="notes" data-state="${st}" tabindex="-1"><div class="editor-head">${icon('file-text', 'ico-sm')}<span>产品周报.md</span><span class="spacer"></span><span>阅读视图</span></div>
        <div class="editor-body hu-scroll"><article class="note reading"><h1 id="page-title">产品周报 · 第 45 周</h1><p>本周完成了工作台设计系统的方向：暖中性的纸感底色，<mark class="hl">单一强调色</mark>，细线分隔与低阴影。</p><h2>本周完成</h2><ul><li>自动化改为列表 + <mark class="hl">右侧详情</mark>，启停使用滑动开关。</li><li>档案二级栏改为“类型 → 记录”的目录树。</li><li>统一的日期字段替换浏览器原生日历。</li></ul><h2>下周计划</h2><p>把 token 落到 <code>src/ui/styles/tokens.css</code>，删除页面局部颜色。</p></article></div></main>
      <aside class="leaf leaf-right" aria-label="批注与版本"><div class="leaf-head"><div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="${this.tab === 'comments'}" data-action="nt-tab" data-v="comments">批注 <span class="count">${comments.length}</span></button><button class="tab" role="tab" aria-selected="${this.tab === 'history'}" data-action="nt-tab" data-v="history">版本</button></div></div>
        <div class="hu-scroll" style="flex:1;padding:12px">${this.tab === 'history' ? h`<ol class="ver-list">${DATA.versions.map(v => h`<li><button class="ver-item" data-action="go" data-page="versioning"><span class="ver-dot ${v.by === '手动' ? 'is-manual' : ''}"></span><span class="grow"><span class="ver-msg">${v.msg}</span><span class="ver-meta">${v.at}</span></span></button></li>`)}</ol>`
          : comments.length ? comments.map(c => h`<article class="comment card"><blockquote>${c.quote}</blockquote><p>${c.body}</p><footer class="muted">${c.who} · ${c.at}<span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" aria-label="批注操作">${icon('ellipsis', 'ico-sm')}</button></footer></article>`) : h`<div class="empty" style="min-height:200px"><span class="empty-mark">${icon('message-square', 'ico-lg')}</span><h3>还没有批注</h3><p>在正文中选中文字后添加批注，批注单独保存，不改动笔记正文。</p></div>`}
          ${this.tab === 'comments' ? (st === 'comment-editing' ? h`<form class="comment-composer card" id="cm-form"><blockquote>细线分隔与低阴影</blockquote><textarea class="textarea" id="cm-body" autofocus placeholder="写下批注…" aria-label="批注内容"></textarea><div class="row" style="justify-content:flex-end;margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" data-action="cm-cancel">取消</button><button class="btn btn-primary btn-sm" type="submit">添加批注</button></div></form>` : h`<button class="btn btn-secondary btn-block" style="margin-top:8px" data-action="cm-new">${icon('plus', 'ico-sm')}添加批注</button>`) : ''}</div></aside></div>`;
  },
  mount() { const f = $('#cm-form'); f?.addEventListener('submit', e => { e.preventDefault(); S.state = 'default'; render(); toast('批注已添加'); }); f && $('#cm-body').focus(); },
  actions: {
    'nt-tab': el => { PAGES.notes.tab = el.dataset.v; render(); },
    'cm-new': () => { S.state = 'comment-editing'; render(); },
    'cm-cancel': () => { S.state = 'default'; render(); },
  },
};

/* ==========================================================================
   设置 · appearance (live), general, icons, content, search
   ========================================================================== */
const ACCENTS = [['teal', '墨青', '#2C6669'], ['indigo', '靛蓝', '#3B57A3'], ['pine', '松绿', '#356E43'], ['ochre', '赭石', '#9A4E26'], ['plum', '梅紫', '#764689'], ['graphite', '石墨', '#34312D']];
PAGES.settings = {
  title: '设置', states: ['appearance', 'appearance-dark', 'follow-obsidian', 'general', 'icons', 'content', 'search'], section: 'appearance', q: '',
  sections: [['appearance', '外观', 'palette'], ['general', '通用', 'sliders-horizontal'], ['workbench', '工作台', 'layout-grid'], ['tasks', '任务', 'list-checks'], ['archives', '档案', 'library'], ['automations', '自动化', 'workflow'], ['agent', '智能体与账号', 'bot'], ['safe', '保险箱', 'lock-keyhole'], ['notify', '通知渠道', 'bell'], ['icons', '图标', 'shapes'], ['content', '内容与受管文件', 'files'], ['about', '关于', 'info']],
  enter(s) { this.applyState(s); },
  applyState(s) {
    this.q = ''; this.section = ['general', 'icons', 'content'].includes(s) ? s : 'appearance';
    S.mode = s === 'appearance-dark' ? 'dark' : 'light'; S.source = s === 'follow-obsidian' ? 'obsidian' : 'huhu';
    if (s === 'search') this.q = '通知';
  },
  leave() { savePrefs(); },
  panel() { return h`<div class="panel-head"><h2>设置</h2></div><div class="panel-search"><div class="input-group">${icon('search', 'ico-sm')}<input class="input" id="set-q" placeholder="搜索设置" value="${this.q}" aria-label="搜索设置"></div></div>
    <div class="panel-body hu-scroll">${this.sections.map(([id, n, ic]) => h`<button class="nav-item" data-action="set-sec" data-id="${id}" aria-current="${!this.q && this.section === id}">${icon(ic)}<span>${n}</span></button>`)}</div>`; },
  row(label, desc, control, { id = '' } = {}) { return h`<div class="set-row" ${id ? raw(`data-row="${id}"`) : ''}><div class="set-text"><span class="set-label">${label}</span>${desc ? h`<span class="set-desc">${desc}</span>` : ''}</div><div class="set-ctl">${control}</div></div>`; },
  sw(on, label) { return h`<button class="switch" role="switch" aria-checked="${on}" aria-label="${label}" data-action="set-switch"></button>`; },
  main() {
    if (this.q) return this.searchView();
    const sec = this.sections.find(s => s[0] === this.section);
    return h`${pageHead(sec[1], { crumb: h`<span>设置</span>${icon('chevron-right', 'ico-sm')}` })}<div class="page-body hu-scroll"><div class="page-pad settings">${this['sec_' + this.section] ? this['sec_' + this.section]() : this.sec_generic(sec)}</div></div>`;
  },
  sec_appearance() {
    const seg = (name, cur, opts) => h`<div class="seg" role="radiogroup" aria-label="${name}">${opts.map(([v, l, ic]) => h`<button role="radio" aria-checked="${cur === v}" data-action="set-pref" data-k="${name}" data-v="${v}">${ic ? icon(ic, 'ico-sm') : ''}${l}</button>`)}</div>`;
    return h`<div class="settings-grid"><div class="settings-col">
      <section class="set-section"><h2 class="set-h">主题</h2><div class="card">
        ${this.row('配色来源', 'HUHU 主题保证统一的对比度与层级；跟随 Obsidian 时改用宿主主题变量。', seg('source', S.source, [['huhu', 'HUHU 主题'], ['obsidian', '跟随 Obsidian']]))}
        ${this.row('明暗', '跟随系统时随操作系统切换。', seg('mode', S.mode, [['light', '浅色', 'sun'], ['dark', '深色', 'moon'], ['system', '跟随系统', 'monitor']]))}
        ${this.row('强调色', S.source === 'obsidian' ? '跟随 Obsidian 时使用宿主强调色。' : '用于主操作、选中与焦点。', h`<div class="swatches" role="radiogroup" aria-label="强调色">${ACCENTS.map(([v, l, c]) => h`<button class="swatch" role="radio" aria-checked="${S.accent === v}" aria-label="${l}" data-tip="${l}" data-tip-pos="bottom" data-action="set-pref" data-k="accent" data-v="${v}" style="--sw:${c}" ${S.source === 'obsidian' ? raw('disabled') : ''}></button>`)}</div>`)}
      </div>${S.source === 'obsidian' ? h`<div class="notice notice-info" style="margin-top:10px">${icon('info')}<span>当前使用 Obsidian 主题变量。若宿主主题对比度不足，HUHU 会对正文与控件边界回退到安全值。</span></div>` : ''}</section>
      <section class="set-section"><h2 class="set-h">排版与密度</h2><div class="card">
        ${this.row('界面字号', '只影响 HUHU 工作台，不改变笔记正文。', seg('uiSize', S.uiSize, [['13', '小'], ['14', '标准'], ['15', '大']]))}
        ${this.row('界面字体', '中文自动回退到系统字体。', h`<select class="select" style="width:180px" data-action-change="fontUi" aria-label="界面字体"><option value="geist" ${S.fontUi === 'geist' ? raw('selected') : ''}>Geist + 系统中文</option><option value="system" ${S.fontUi === 'system' ? raw('selected') : ''}>系统界面字体</option></select>`)}
        ${this.row('信息密度', '紧凑适合大量列表；舒适提供更大的行高与留白。', seg('density', S.density, [['compact', '紧凑'], ['comfortable', '舒适']]))}
        ${this.row('减少动效', '关闭过渡与动画；系统设置为减少动效时自动生效。', h`<button class="switch" role="switch" aria-checked="${S.motion === 'reduce'}" aria-label="减少动效" data-action="set-pref" data-k="motion" data-v="${S.motion === 'reduce' ? 'system' : 'reduce'}"></button>`)}
      </div></section>
      <section class="set-section"><h2 class="set-h">导入与恢复</h2><div class="card">${this.row('导出外观', '导出为当前格式的 JSON。', h`<button class="btn btn-secondary">${icon('download', 'ico-sm')}导出</button>`)}${this.row('恢复默认', '恢复为 HUHU 浅色 · 墨青 · 紧凑。', h`<button class="btn btn-secondary" data-action="set-reset">恢复默认</button>`)}</div></section>
    </div>
    <aside class="settings-preview" aria-label="实时预览"><div class="eyebrow" style="margin-bottom:8px">实时预览</div><div class="card preview-card"><div class="row"><strong>按钮</strong></div><div class="row" style="flex-wrap:wrap"><button class="btn btn-primary">${icon('plus')}主要操作</button><button class="btn btn-secondary">次要</button><button class="btn btn-ghost">幽灵</button></div>
      <div class="row" style="margin-top:14px"><strong>字段</strong></div><div class="input-group">${icon('search')}<input class="input" placeholder="搜索档案" aria-label="预览输入框"></div>${dateField({ id: 'pv-date', value: ymd(TODAY), label: '预览日期' })}
      <div class="row" style="margin-top:14px;justify-content:space-between"><span>启用自动化</span><button class="switch" role="switch" aria-checked="true" aria-label="预览开关" data-action="set-switch"></button></div>
      <div class="row"><div class="seg seg-sm"><button aria-pressed="true">列表</button><button aria-pressed="false">看板</button></div><span class="badge badge-accent">进行中</span><span class="badge badge-success">成功</span><span class="badge badge-danger">失败</span></div>
      <div class="list-row task-row" style="margin:10px -12px 0;cursor:default">${taskCheck({ id: 'pv1', title: '已完成的任务', done: true })}<div class="list-row-main">${taskContent({ title: '已完成的任务', note: '标题与说明划线', done: true })}</div></div>
      <div class="list-row task-row" style="margin:0 -12px;cursor:default">${taskCheck({ id: 'pv2', title: '未完成的任务', done: false })}<div class="list-row-main">${taskContent({ title: '未完成的任务', note: '截止明天', done: false })}</div></div></div></aside></div>`;
  },
  sec_general() { return h`<section class="set-section"><div class="card">${this.row('启动时打开', '打开 Obsidian 后默认进入的页面。', h`<select class="select" style="width:160px" aria-label="启动页面"><option>首页</option><option>上次的位置</option></select>`)}${this.row('周起始日', '日期选择器与日历使用。', h`<div class="seg"><button aria-pressed="true">周一</button><button aria-pressed="false">周日</button></div>`)}${this.row('日期格式', '中文界面固定使用年-月-日。', h`<span class="fg2 mono">2026-11-05</span>`)}${this.row('新建任务快捷键', '在工作台任意位置按下。', h`<span class="kbd">N</span>`)}${this.row('命令面板', '', h`<span class="row" style="gap:4px"><span class="kbd">⌘</span><span class="kbd">K</span></span>`)}${this.row('状态栏显示', '在 Obsidian 状态栏显示智能体额度与计划数。', this.sw(true, '状态栏显示'))}</div></section>`; },
  sec_icons() {
    const names = ['house', 'list-checks', 'notebook-pen', 'library', 'workflow', 'bot', 'lock-keyhole', 'history', 'heart-pulse', 'bell', 'book', 'package', 'user', 'folder', 'star', 'flag', 'tag', 'bookmark', 'calendar', 'clock', 'sparkles', 'feather', 'leaf', 'map-pin', 'wallet', 'credit-card', 'image', 'smile', 'layers', 'shapes', 'gauge', 'cpu'];
    return h`<section class="set-section"><p class="fg2" style="margin-bottom:12px">为模块、档案类型和看板选择图标。图标来自内置 Lucide 图标集。</p><div class="row" style="margin-bottom:12px"><div class="input-group search">${icon('search')}<input class="input" placeholder="搜索图标" aria-label="搜索图标" id="icon-q"></div><span class="muted" style="font-size:12px">${names.length} 个</span></div>
      <div class="icon-grid" role="radiogroup" aria-label="图标" id="icon-grid">${names.map((n, i) => h`<button class="icon-cell" role="radio" aria-checked="${i === 10}" aria-label="${n}" data-icon="${n}">${icon(n, 'ico-lg')}<span>${n}</span></button>`)}</div></section>`;
  },
  sec_content() { const files = [['huhu/', '用户内容根', '可见 · 1,284 个文件'], ['.huhu/settings.json', '设置', '隐藏 · 18 KB'], ['.huhu/dashboards/', '看板定义', '隐藏 · 3 个'], ['.huhu/automations/', '自动化定义', '隐藏 · 6 个'], ['.huhu/safe/', '加密保险箱', '隐藏 · 加密']];
    return h`<section class="set-section"><p class="fg2" style="margin-bottom:12px">HUHU 只在下面的位置读写数据。普通笔记、宿主数据和 Git 元数据保持原位。</p><div class="card">${files.map(([p, n, d]) => this.row(h`<span class="mono">${p}</span>`, `${n} · ${d}`, h`<button class="btn btn-ghost btn-sm">${icon('folder-open', 'ico-sm')}显示</button>`))}</div></section>`; },
  sec_generic(sec) { return h`<section class="set-section"><div class="card">${this.row(`${sec[1]}默认视图`, '打开该模块时的默认布局。', h`<select class="select" style="width:160px" aria-label="${sec[1]}默认视图"><option>列表</option><option>看板</option></select>`)}${this.row('在状态栏显示', '', this.sw(true, `${sec[1]} 在状态栏显示`))}${this.row('发送通知', '结果写入通知收件箱。', this.sw(sec[0] !== 'safe', `${sec[1]} 发送通知`))}</div></section>`; },
  searchView() {
    const all = [['通知渠道', '站内收件箱', '所有通知都会进入收件箱。'], ['通知渠道', '系统通知', '通过操作系统通知中心推送。'], ['自动化', '失败时通知', '运行失败时发送通知。'], ['通用', '状态栏显示', '在 Obsidian 状态栏显示智能体额度与计划数。'], ['保险箱', '复制后清除剪贴板', '30 秒后清除。']];
    const q = this.q.trim(); const hits = all.filter(r => r.join('').includes(q));
    return h`${pageHead(`搜索“${q}”`, { crumb: h`<span>设置</span>${icon('chevron-right', 'ico-sm')}`, sub: `${hits.length} 项` })}<div class="page-body hu-scroll"><div class="page-pad settings">${hits.length ? h`<div class="card">${hits.map(([s, l, d]) => this.row(raw(mark(l, q)), raw(`${esc(s)} · ${mark(d, q)}`), this.sw(true, l)))}</div>` : h`<div class="empty"><p>没有匹配的设置</p></div>`}</div></div>`;
  },
  mountPanel() { $('#set-q')?.addEventListener('input', e => { this.q = e.target.value; S.state = this.q ? 'search' : this.section; renderMain(); }); },
  mount() {
    mountDateFields($('#main'));
    $('[data-action-change="fontUi"]')?.addEventListener('change', e => { S.fontUi = e.target.value; savePrefs(); applyTheme(); });
    $('#icon-grid')?.addEventListener('click', e => { const b = e.target.closest('[data-icon]'); if (!b) return; $$('#icon-grid [data-icon]').forEach(x => x.setAttribute('aria-checked', x === b)); toast(`已选择图标 ${b.dataset.icon}`); });
    $('#icon-q')?.addEventListener('input', e => { const q = e.target.value.trim(); $$('#icon-grid [data-icon]').forEach(b => { b.hidden = q && !b.dataset.icon.includes(q); }); });
  },
  actions: {
    'set-sec': el => { const P = PAGES.settings; P.section = el.dataset.id; P.q = ''; S.state = ['general', 'icons', 'content'].includes(P.section) ? P.section : P.section === 'appearance' ? 'appearance' : 'general'; S.panelSheet = false; renderPanel(); renderMain(); },
    'set-pref': el => { const k = el.dataset.k, v = el.dataset.v; S[k] = v; if (k === 'mode') S.state = v === 'dark' ? 'appearance-dark' : 'appearance'; if (k === 'source') S.state = v === 'obsidian' ? 'follow-obsidian' : 'appearance'; savePrefs(); const sc = $('#main .page-body')?.scrollTop; render(); const b = $('#main .page-body'); if (b) b.scrollTop = sc; $(`[data-k="${k}"][data-v="${v}"],[data-k="${k}"]`)?.focus(); },
    'set-switch': el => { el.setAttribute('aria-checked', el.getAttribute('aria-checked') !== 'true'); },
    'set-reset': () => confirmDialog({ title: '恢复默认外观？', body: '主题、强调色、字号与密度会恢复为默认值。', confirm: '恢复默认', onConfirm: () => { Object.assign(S, { mode: 'light', accent: 'teal', source: 'huhu', density: 'compact', uiSize: '14', motion: 'system', fontUi: 'geist' }); savePrefs(); S.state = 'appearance'; render(); toast('已恢复默认外观'); } }),
  },
};

/* ---------- Boot ---------- */
(function boot() {
  buildProtoControls();
  const hash = location.hash.slice(1).split('/');
  if (hash[0] && PAGES[hash[0]]) { if (hash[0] === 'notes') { S.scene = 'notes'; S.state = hash[1] || 'default'; } else { S.page = hash[0]; S.state = hash[1] || PAGES[hash[0]].states[0]; PAGES[hash[0]].enter?.(S.state); } }
  render();
  document.documentElement.classList.add('is-ready');
})();
