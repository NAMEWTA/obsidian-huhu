/* ==========================================================================
   档案 · type → record tree, record editor, belongings, person reading, studio
   ========================================================================== */
const mark = (text, q) => { if (!q) return esc(text); const i = text.toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return esc(text); return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length)); };
PAGES.archives = {
  title: '档案', states: ['default', 'record', 'belongings', 'person', 'studio', 'search', 'no-results', 'dirty', 'loading', 'error', 'empty'],
  sel: { kind: 'type', id: 'book' }, expanded: new Set(['book']), q: '', focusId: null, layout: 'table', dirty: false, itemFilter: 'all',
  enter(s) { this.applyState(s); },
  applyState(s) {
    this.q = ''; this.dirty = false; this.expanded = new Set(['book']); this.sel = { kind: 'type', id: 'book' }; this.itemFilter = 'all';
    if (s === 'record' || s === 'dirty') { this.sel = { kind: 'record', id: 'r-b1' }; this.dirty = s === 'dirty'; }
    if (s === 'belongings') { this.sel = { kind: 'type', id: 'item' }; this.expanded.add('item'); }
    if (s === 'person') { this.sel = { kind: 'record', id: 'r-p1' }; this.expanded.add('person'); }
    if (s === 'studio') this.sel = { kind: 'studio', id: 'studio' };
    if (s === 'search') this.q = '设计';
    if (s === 'no-results') this.q = '不存在的档案';
    if (s === 'empty') this.sel = { kind: 'type', id: 'project-empty' };
  },
  openRecord(id) { const r = DATA.records.find(x => x.id === id); if (!r) return; this.sel = { kind: 'record', id }; this.expanded.add(r.type); this.dirty = false; S.state = r.type === 'person' ? 'person' : 'record'; renderPanel(); renderMain(); },
  nodes() {
    const q = this.q.trim().toLowerCase(), out = [];
    out.push({ group: '类型' });
    for (const t of DATA.types) {
      const recs = DATA.records.filter(r => r.type === t.id); const hits = q ? recs.filter(r => r.title.toLowerCase().includes(q)) : recs;
      const typeHit = q && t.name.toLowerCase().includes(q);
      if (q && !hits.length && !typeHit) continue;
      const open = q ? true : this.expanded.has(t.id);
      out.push({ id: t.id, kind: 'type', label: t.name, icon: t.icon, lvl: 0, count: recs.length, open, parent: null, hasKids: true });
      if (open) (q ? hits : recs).forEach(r => out.push({ id: r.id, kind: 'record', label: r.title, icon: 'file-text', lvl: 1, parent: t.id }));
    }
    if (!q) {
      out.push({ group: '视图' });
      DATA.views.forEach(v => out.push({ id: v.id, kind: 'view', label: v.name, icon: 'bookmark', lvl: 0 }));
      out.push({ group: '管理' });
      out.push({ id: 'studio', kind: 'studio', label: '类型设计器', icon: 'shapes', lvl: 0 });
      out.push({ id: 'report', kind: 'report', label: '归物年度报告', icon: 'chart-column', lvl: 0 });
      out.push({ id: 'recovery', kind: 'recovery', label: '恢复中心', icon: 'undo-2', lvl: 0 });
    }
    return out;
  },
  isSel(n) { return this.sel.kind === n.kind && this.sel.id === n.id; },
  panel() {
    return h`<div class="panel-head"><h2>档案</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="arch-new" aria-label="新建记录">${icon('plus', 'ico-sm')}</button></div>
    <div class="panel-search"><div class="input-group">${icon('search', 'ico-sm')}<input class="input" id="arch-q" placeholder="搜索类型与记录" value="${this.q}" aria-label="搜索档案目录" aria-controls="arch-tree"></div></div>
    <div class="panel-body hu-scroll" id="arch-tree-wrap">${raw(this.treeHTML())}</div>`;
  },
  treeHTML() {
    const nodes = this.nodes(); const items = nodes.filter(n => !n.group);
    if (!items.length) return html(h`<div class="empty" style="min-height:160px;padding:24px 16px"><p>没有匹配“${this.q}”的类型或记录</p><button class="btn btn-secondary btn-sm" data-action="arch-clear-q">清除搜索</button></div>`);
    if (!this.focusId || !items.some(n => n.id === this.focusId)) this.focusId = (items.find(n => this.isSel(n)) || items[0]).id;
    return html(h`<div class="tree" role="tree" id="arch-tree" aria-label="档案目录">${nodes.map(n => n.group ? h`<div class="tree-group" role="presentation">${n.group}</div>` : h`<div class="tree-row" role="treeitem" id="tn-${n.id}" data-node="${n.id}" data-kind="${n.kind}" aria-level="${n.lvl + 1}" ${n.hasKids ? raw(`aria-expanded="${n.open}"`) : ''} aria-selected="${this.isSel(n)}" tabindex="${this.focusId === n.id ? 0 : -1}" style="--lvl:${n.lvl}">
      ${n.hasKids ? h`<span class="tree-twist" data-twist="${n.id}" aria-hidden="true">${icon('chevron-right')}</span>` : raw(`<span class="tree-twist leaf"></span>`)}${icon(n.icon)}<span class="tree-label">${raw(mark(n.label, this.q.trim()))}</span>${n.count != null ? h`<span class="tree-count">${n.count}</span>` : ''}</div>`)}
      ${this.q ? '' : raw('<p class="tree-more" style="--lvl:0">已加载全部 12 条 · 每类型按需分页</p>')}</div>`);
  },
  refreshTree() { const w = $('#arch-tree-wrap'); if (w) { w.innerHTML = this.treeHTML(); } },
  mountPanel() {
    const q = $('#arch-q'); q?.addEventListener('input', e => { this.q = e.target.value; this.refreshTree(); });
    q?.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { $('#arch-tree [tabindex="0"]')?.focus(); e.preventDefault(); } });
    const wrap = $('#arch-tree-wrap');
    wrap.addEventListener('click', e => {
      const tw = e.target.closest('[data-twist]'); const row = e.target.closest('[data-node]');
      if (tw) { e.stopPropagation(); this.toggleExpand(tw.dataset.twist); return; }
      if (row) this.activate(row.dataset.node, row.dataset.kind);
    });
    wrap.addEventListener('keydown', e => {
      const row = e.target.closest('[data-node]'); if (!row) return;
      const rows = $$('[data-node]', wrap); const i = rows.indexOf(row); const n = this.nodes().filter(x => !x.group).find(x => x.id === row.dataset.node);
      const focus = r => { if (!r) return; this.focusId = r.dataset.node; rows.forEach(x => x.tabIndex = -1); r.tabIndex = 0; r.focus(); };
      if (e.key === 'ArrowDown') { focus(rows[i + 1]); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { if (i === 0) $('#arch-q')?.focus(); else focus(rows[i - 1]); e.preventDefault(); }
      else if (e.key === 'Home') { focus(rows[0]); e.preventDefault(); }
      else if (e.key === 'End') { focus(rows[rows.length - 1]); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { if (n.hasKids && !n.open) this.toggleExpand(n.id, true); else if (n.hasKids) focus(rows[i + 1]); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { if (n.hasKids && n.open) this.toggleExpand(n.id, true); else if (n.parent) focus($(`[data-node="${n.parent}"]`, wrap)); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { this.activate(n.id, n.kind); e.preventDefault(); }
      else if (e.key.length === 1 && /\S/.test(e.key)) { const next = rows.slice(i + 1).concat(rows.slice(0, i)).find(r => r.textContent.trim().startsWith(e.key)); focus(next); }
    });
  },
  toggleExpand(id, keepFocus) {
    if (this.q) return; // search expansion is derived, never written back
    this.expanded.has(id) ? this.expanded.delete(id) : this.expanded.add(id);
    this.focusId = id; this.refreshTree(); if (keepFocus !== false) $(`#tn-${CSS.escape(id)}`)?.focus();
  },
  activate(id, kind) {
    const go2 = () => {
      this.focusId = id; this.dirty = false;
      if (kind === 'type') { this.sel = { kind, id }; this.expanded.add(id); S.state = id === 'item' ? 'belongings' : 'default'; }
      else if (kind === 'record') { this.sel = { kind, id }; const r = DATA.records.find(x => x.id === id); S.state = r.type === 'person' ? 'person' : 'record'; }
      else if (kind === 'view') { const v = DATA.views.find(x => x.id === id); this.sel = { kind: 'view', id }; S.state = 'default'; this.viewType = v.type; }
      else { this.sel = { kind, id }; S.state = kind === 'studio' ? 'studio' : 'default'; }
      S.panelSheet = false; renderPanel(); renderMain(); $(`#tn-${CSS.escape(id)}`)?.focus();
    };
    if (this.dirty) confirmDialog({ title: '放弃未保存的修改？', body: '这条记录有尚未保存的修改，离开后会丢失。', confirm: '放弃修改', danger: true, onConfirm: go2 }); else go2();
  },
  main() {
    const st = S.state;
    if (st === 'loading') return h`${pageHead('档案', { sub: '正在读取档案索引…' })}<div class="page-body" aria-busy="true"><div class="page-pad"><p class="sr-only" role="status">正在读取档案索引</p>${[1, 2, 3, 4, 5, 6].map(() => raw('<span class="skel skel-row"></span>'))}</div></div>`;
    if (st === 'error') return h`${pageHead('档案')}<div class="page-body"><div class="page-pad"><div class="notice notice-error">${icon('circle-alert')}<div><p class="notice-title">档案索引读取失败</p><p>索引文件损坏或被占用。原始记录文件没有被修改，可以重建索引。</p></div><button class="btn btn-secondary btn-sm" data-action="arch-retry">${icon('refresh-cw', 'ico-sm')}重建索引</button></div></div></div>`;
    const s = this.sel;
    if (s.kind === 'record') { const r = DATA.records.find(x => x.id === s.id); return r.type === 'person' ? this.personView(r) : this.recordView(r); }
    if (s.kind === 'studio') return this.studioView();
    if (s.kind === 'recovery') return h`${pageHead('恢复中心', { crumb: h`<span>档案</span>${icon('chevron-right', 'ico-sm')}` })}<div class="page-body hu-scroll"><div class="page-pad page-narrow"><div class="empty"><span class="empty-mark">${icon('undo-2', 'ico-lg')}</span><h2>没有需要恢复的修订</h2><p>删除或被覆盖的记录会在这里保留 30 天，可按修订恢复。</p></div></div></div>`;
    if (s.kind === 'report') return this.reportView();
    if (s.id === 'project-empty') return h`${pageHead('读书会')}<div class="page-body"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon('library', 'ico-lg')}</span><h2>“读书会”类型还没有记录</h2><p>记录会以 Markdown 文件保存在 huhu/档案/读书会/。</p><div class="row"><button class="btn btn-primary" data-action="arch-new">${icon('plus')}新建记录</button><button class="btn btn-secondary" data-action="arch-studio">编辑字段</button></div></div></div>`;
    const typeId = s.kind === 'view' ? this.viewType : s.id;
    if (typeId === 'item') return this.belongingsView();
    return this.typeView(DATA.typeOf(typeId), s.kind === 'view' ? DATA.views.find(v => v.id === s.id).name : null);
  },
  typeView(t, viewName) {
    const recs = DATA.records.filter(r => r.type === t.id).filter(r => !viewName || r.fields.状态 === '在读');
    const cols = Object.keys(recs[0]?.fields || {}).slice(0, 4);
    const cell = v => Array.isArray(v) ? v.join('、') : typeof v === 'number' ? '★'.repeat(v) + '☆'.repeat(5 - v) : (v || '—');
    return h`${pageHead(viewName || t.name, { sub: `${recs.length} 条记录`, crumb: viewName ? h`<span>视图</span>${icon('chevron-right', 'ico-sm')}` : '', actions: h`<div class="seg" role="radiogroup" aria-label="布局"><button role="radio" aria-checked="${this.layout === 'table'}" data-action="arch-layout" data-v="table" aria-label="表格">${icon('list', 'ico-sm')}</button><button role="radio" aria-checked="${this.layout === 'cards'}" data-action="arch-layout" data-v="cards" aria-label="卡片">${icon('layout-grid', 'ico-sm')}</button></div><button class="btn btn-primary" data-action="arch-new">${icon('plus')}<span class="hide-sm">新建记录</span></button>` })}
    <div class="page-toolbar"><div class="input-group search">${icon('search')}<input class="input" placeholder="在${t.name}中筛选" aria-label="筛选记录"></div><button class="btn btn-ghost">${icon('list-filter', 'ico-sm')}筛选</button><button class="btn btn-ghost">${icon('arrow-up-down', 'ico-sm')}最近修改</button></div>
    <div class="page-body hu-scroll"><div class="page-pad" style="padding-top:4px">${this.layout === 'table'
      ? h`<div class="table-wrap"><table class="table"><thead><tr><th>名称</th>${cols.map(c => h`<th>${c}</th>`)}<th class="num">修改</th></tr></thead><tbody>${recs.map(r => h`<tr data-action="arch-open" data-id="${r.id}" tabindex="0"><td class="primary"><span class="row">${icon(t.icon, 'ico-sm')}${r.title}</span></td>${cols.map(c => h`<td>${cell(r.fields[c])}</td>`)}<td class="num muted">${relDay(r.updated)}</td></tr>`)}</tbody></table></div>`
      : h`<div class="rec-cards">${recs.map(r => h`<button class="card card-interactive rec-card" data-action="arch-open" data-id="${r.id}"><span class="rec-card-icon" style="--c:${t.color}">${icon(t.icon)}</span><strong>${r.title}</strong><span class="muted">${cols.slice(0, 2).map(c => cell(r.fields[c])).join(' · ')}</span></button>`)}</div>`}</div></div>`;
  },
  recordView(r) {
    const t = DATA.typeOf(r.type);
    const field = (k, v) => {
      const id = 'f-' + k;
      if (/生日|购入|开始|保修至|退出/.test(k)) return h`<div class="field"><label class="field-label" for="${id}">${k}</label>${dateField({ id, value: v || '', label: k })}</div>`;
      if (k === '状态') return h`<div class="field"><label class="field-label" for="${id}">${k}</label><select class="select" id="${id}">${['想读', '在读', '已读', '使用中', '闲置', '已转卖'].filter(x => (r.type === 'book') === ['想读', '在读', '已读'].includes(x)).map(x => h`<option ${x === v ? raw('selected') : ''}>${x}</option>`)}</select></div>`;
      if (k === '评分') return h`<div class="field"><span class="field-label" id="${id}-l">${k}</span><div class="stars" role="radiogroup" aria-labelledby="${id}-l">${[1, 2, 3, 4, 5].map(n => h`<button role="radio" aria-checked="${n === v}" aria-label="${n} 星" class="${n <= v ? 'on' : ''}" data-action="arch-star" data-n="${n}">${icon('star')}</button>`)}</div></div>`;
      if (Array.isArray(v)) return h`<div class="field"><span class="field-label">${k}</span><div class="row" style="flex-wrap:wrap;gap:6px;min-height:32px">${v.map(x => h`<span class="badge">${x}</span>`)}<button class="btn btn-ghost btn-sm">${icon('plus', 'ico-sm')}添加</button></div></div>`;
      return h`<div class="field"><label class="field-label" for="${id}">${k}</label><input class="input ${/价格|回收/.test(k) ? 'num' : ''}" id="${id}" value="${v}"></div>`;
    };
    return h`${pageHead(r.title, { crumb: h`<button data-action="arch-type" data-id="${t.id}">${t.name}</button>${icon('chevron-right', 'ico-sm')}`, actions: h`<span class="save-state" id="rec-save">${this.dirty ? '有未保存的修改' : '已保存 · ' + relDay(r.updated)}</span><button class="btn btn-ghost btn-icon" data-action="arch-rec-menu" aria-label="更多操作">${icon('ellipsis')}</button>` })}
    <div class="page-body hu-scroll"><div class="page-pad record">
      <header class="record-head"><span class="rec-icon" style="--c:${t.color}">${icon(t.icon, 'ico-lg')}</span><div class="grow"><h2 class="record-title">${r.title}</h2><p class="muted">${t.name} · huhu/档案/${t.name}/${r.title}.md</p></div></header>
      <div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="true">字段</button><button class="tab" role="tab" aria-selected="false">关联 <span class="count">2</span></button><button class="tab" role="tab" aria-selected="false">修订 <span class="count">12</span></button></div>
      <form class="record-form" id="rec-form"><div class="field-grid">${Object.entries(r.fields).map(([k, v]) => field(k, v))}<div class="field span-2"><label class="field-label" for="f-note">笔记</label><textarea class="textarea" id="f-note" placeholder="写点什么…">${r.type === 'book' ? '第 4 章“信息的建筑”：设计是把信息整理成可感知的形式。' : ''}</textarea></div></div></form>
      <section class="relations"><div class="section-title">关联 <span class="muted">2</span></div><div class="rel-grid"><button class="link-card" data-action="go" data-page="tasks">${icon('list-checks')}<span class="grow truncate">读完《设计中的设计》第 4 章</span><span class="badge">任务</span></button><button class="link-card" data-action="arch-open" data-id="r-p1">${icon('user')}<span class="grow truncate">林知微</span><span class="badge">人物 · 推荐人</span></button></div></section>
    </div></div>
    ${this.dirty ? h`<div class="dirty-bar" role="region" aria-label="未保存的修改"><span>${icon('circle-dot', 'ico-sm')}有 1 处未保存的修改</span><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-action="arch-discard">放弃</button><button class="btn btn-primary btn-sm" data-action="arch-save">保存<span class="kbd">⌘S</span></button></div>` : ''}`;
  },
  personView(r) {
    const j = DATA.journal.filter(x => x.person === r.id);
    return h`${pageHead(r.title, { crumb: h`<button data-action="arch-type" data-id="person">人物</button>${icon('chevron-right', 'ico-sm')}`, actions: h`<button class="btn btn-secondary" data-action="arch-edit-person">${icon('pencil', 'ico-sm')}编辑资料</button><button class="btn btn-primary" data-action="journal-add">${icon('plus')}写纪事</button>` })}
    <div class="page-body hu-scroll"><div class="page-pad page-narrow person">
      <section class="person-hero"><span class="avatar avatar-lg">${r.title.slice(0, 1)}</span><div><h2 class="reading-title">${r.title}</h2><p class="fg2">${r.fields.关系} · ${r.fields.城市}</p><div class="row" style="margin-top:8px;flex-wrap:wrap">${r.fields.标签.map(x => h`<span class="badge">${x}</span>`)}</div></div></section>
      <div class="person-grid"><dl class="card card-body props"><div class="prop"><dt>生日</dt><dd>${r.fields.生日 ? fmtLong(r.fields.生日).split(' ')[0] : '—'}</dd></div><div class="prop"><dt>认识</dt><dd>2012 年 · 14 年</dd></div><div class="prop"><dt>上次联系</dt><dd>${relDay('2026-11-01')}</dd></div><div class="prop"><dt>同名</dt><dd class="muted">无（按稳定 ID r-p1 识别）</dd></div></dl>
      <section><div class="section-title">纪事 <span class="muted">${j.length}</span></div><ol class="timeline" id="journal">${j.map(x => h`<li class="tl-item"><span class="tl-dot"></span><div><p class="tl-date num">${fmtLong(x.date)}</p><h3>${x.title}</h3><p class="reading">${x.body}</p></div></li>`)}</ol></section></div>
    </div></div>`;
  },
  belongingsView() {
    const items = DATA.records.filter(r => r.type === 'item'); const f = this.itemFilter;
    const shown = items.filter(r => f === 'all' || r.fields.状态 === f);
    const badge = s => ({ 使用中: 'badge-success', 闲置: 'badge-warning', 已转卖: 'badge-info' }[s] || '');
    return h`${pageHead('归物', { sub: `${items.length} 件物品`, actions: h`<button class="btn btn-ghost" data-action="arch-report">${icon('chart-column', 'ico-sm')}年度报告</button><button class="btn btn-primary" data-action="arch-new">${icon('plus')}<span class="hide-sm">登记物品</span></button>` })}
    <div class="page-body hu-scroll"><div class="page-pad">
      <div class="kpis"><div class="kpi"><span class="kpi-label">在用</span><span class="kpi-value num">2</span></div><div class="kpi"><span class="kpi-label">闲置</span><span class="kpi-value num">1</span></div><div class="kpi"><span class="kpi-label">累计投入</span><span class="kpi-value num">¥6,697</span><span class="kpi-sub">CNY · 4 件</span></div><div class="kpi"><span class="kpi-label">日均成本</span><span class="kpi-value num">¥4.21</span><span class="kpi-sub">按持有天数</span></div></div>
      <div class="row" style="margin:20px 0 12px"><div class="seg" role="radiogroup" aria-label="状态">${['all', '使用中', '闲置', '已转卖'].map(x => h`<button role="radio" aria-checked="${f === x}" data-action="arch-item-filter" data-v="${x}">${x === 'all' ? '全部' : x}</button>`)}</div></div>
      <div class="item-grid">${shown.map(r => h`<button class="card card-interactive item-card" data-action="arch-open" data-id="${r.id}"><div class="item-thumb">${icon('package', 'ico-xl')}</div><div class="item-info"><div class="row"><strong class="truncate grow">${r.title}</strong><span class="badge ${badge(r.fields.状态)}">${r.fields.状态}</span></div><p class="muted num">${r.fields.价格} · ${r.fields.购入 ? '购于 ' + r.fields.购入 : ''}</p>${r.fields.位置 ? h`<p class="muted">${icon('map-pin', 'ico-sm')} ${r.fields.位置}</p>` : ''}</div></button>`)}</div>
    </div></div>`;
  },
  reportView() {
    const months = [1, 0, 2, 0, 1, 1, 0, 1, 0, 0, 1, 0];
    return h`${pageHead('归物年度报告', { crumb: h`<span>归物</span>${icon('chevron-right', 'ico-sm')}`, actions: h`<select class="select" style="width:auto" aria-label="年份"><option>2026</option><option>2025</option></select>` })}
    <div class="page-body hu-scroll"><div class="page-pad page-narrow"><div class="kpis"><div class="kpi"><span class="kpi-label">新增</span><span class="kpi-value num">3</span></div><div class="kpi"><span class="kpi-label">支出</span><span class="kpi-value num">¥3,897</span></div><div class="kpi"><span class="kpi-label">转卖回收</span><span class="kpi-value num">¥3,100</span></div><div class="kpi"><span class="kpi-label">净成本</span><span class="kpi-value num">¥797</span></div></div>
    <section class="card" style="margin-top:20px"><header class="card-head"><h3 class="card-title">${icon('chart-column')}每月新增</h3></header><div class="card-body"><div class="bars bars-lg">${months.map((v, i) => h`<span style="height:${v ? v * 33 + 8 : 4}%" title="${i + 1}月 ${v} 件"><i>${i + 1}</i></span>`)}</div></div></section></div></div>`;
  },
  studioView() {
    const fields = [['名称', 'text', '必填'], ['作者', 'text', ''], ['状态', 'select', '想读 / 在读 / 已读'], ['评分', 'rating', '0–5'], ['开始', 'date', '日精度'], ['推荐人', 'relation', '→ 人物']];
    const ti = { text: 'type', select: 'list', rating: 'star', date: 'calendar', relation: 'link' };
    return h`${pageHead('类型设计器', { crumb: h`<span>管理</span>${icon('chevron-right', 'ico-sm')}`, actions: h`<span class="save-state">草稿 · 未发布</span><button class="btn btn-secondary">预览</button><button class="btn btn-primary" data-action="arch-publish">发布修订</button>` })}
    <div class="page-body hu-scroll"><div class="page-pad studio"><div class="studio-list card"><header class="card-head"><h3 class="card-title">${icon('book')}书籍 · 字段</h3><span class="spacer"></span><button class="btn btn-ghost btn-sm">${icon('plus', 'ico-sm')}字段</button></header>
      <ul>${fields.map(([n, t, d], i) => h`<li class="studio-field ${i === 2 ? 'is-active' : ''}"><span class="grip" aria-hidden="true">${icon('grip-vertical', 'ico-sm')}</span>${icon(ti[t])}<span class="grow">${n}</span><span class="muted">${d}</span></li>`)}</ul></div>
      <div class="card card-body"><div class="section-title">字段 · 状态</div><div class="field"><label class="field-label" for="sf-name">名称</label><input class="input" id="sf-name" value="状态"></div><div class="field"><label class="field-label" for="sf-type">类型</label><select class="select" id="sf-type"><option>单选</option><option>多选</option></select></div><div class="field"><span class="field-label">选项</span><div class="row" style="flex-wrap:wrap;gap:6px">${['想读', '在读', '已读'].map(x => h`<span class="badge badge-outline">${x}</span>`)}<button class="btn btn-ghost btn-sm">${icon('plus', 'ico-sm')}</button></div></div>
      <div class="notice notice-info" style="margin-top:16px">${icon('info')}<span>发布后生成修订 r13。已有记录不会被改写；新字段的空值按“未填”显示。</span></div></div></div></div>`;
  },
  mount() { mountDateFields($('#main'), () => { this.markDirty(); }); $('#rec-form')?.addEventListener('input', () => this.markDirty()); },
  markDirty() {
    if (this.dirty) return; this.dirty = true; S.state = 'dirty'; $('#main').dataset.state = 'dirty';
    const s = $('#rec-save'); if (s) s.textContent = '有未保存的修改';
    if (!$('.dirty-bar')) $('#main').insertAdjacentHTML('beforeend', html(h`<div class="dirty-bar" role="region" aria-label="未保存的修改"><span>${icon('circle-dot', 'ico-sm')}有未保存的修改</span><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-action="arch-discard">放弃</button><button class="btn btn-primary btn-sm" data-action="arch-save">保存<span class="kbd">⌘S</span></button></div>`));
  },
  actions: {
    'arch-open': el => PAGES.archives.activate(el.dataset.id, 'record'),
    'arch-type': el => PAGES.archives.activate(el.dataset.id, 'type'),
    'arch-clear-q': () => { PAGES.archives.q = ''; $('#arch-q').value = ''; PAGES.archives.refreshTree(); $('#arch-q').focus(); },
    'arch-layout': el => { PAGES.archives.layout = el.dataset.v; renderMain(); },
    'arch-item-filter': el => { PAGES.archives.itemFilter = el.dataset.v; renderMain(); },
    'arch-report': () => PAGES.archives.activate('report', 'report'),
    'arch-studio': () => PAGES.archives.activate('studio', 'studio'),
    'arch-retry': () => { S.state = 'loading'; renderMain(); setTimeout(() => { S.state = 'default'; renderMain(); toast('索引已重建，共 12 条记录'); }, 700); },
    'arch-save': () => { PAGES.archives.dirty = false; S.state = 'record'; renderMain(); toast('记录已保存，生成修订 r13'); },
    'arch-discard': () => confirmDialog({ title: '放弃修改？', body: '恢复到上次保存的内容。', confirm: '放弃修改', danger: true, onConfirm: () => { PAGES.archives.dirty = false; S.state = 'record'; renderMain(); } }),
    'arch-star': () => PAGES.archives.markDirty(),
    'arch-publish': () => confirmDialog({ title: '发布“书籍”修订 r13？', body: '会新增 1 个字段并调整排序，已有 38 条记录保持原文件不变。', confirm: '发布', onConfirm: () => toast('已发布修订 r13') }),
    'arch-new': () => openLayer({ kind: 'dialog', label: '新建记录', content: h`<div class="dialog-head"><div><h2>新建记录</h2><p>选择类型后填写名称，其余字段可稍后补充。</p></div><button class="btn btn-ghost btn-icon btn-sm" data-action="layer-close" aria-label="关闭">${icon('x', 'ico-sm')}</button></div><div class="dialog-body"><div class="type-pick">${DATA.types.map((t, i) => h`<label class="type-opt"><input type="radio" name="nt" ${i === 2 ? raw('checked') : ''}><span class="rec-icon" style="--c:${t.color}">${icon(t.icon)}</span>${t.name}</label>`)}</div><div class="field" style="margin-top:16px"><label class="field-label" for="nr-title">名称</label><input class="input" id="nr-title" autofocus placeholder="例如：设计中的设计"></div></div><div class="dialog-foot"><button class="btn btn-secondary" data-action="layer-close">取消</button><button class="btn btn-primary" data-action="layer-close">创建</button></div>` }),
    'arch-rec-menu': el => menu(el, [{ id: 'open', label: '在笔记中打开', icon: 'external-link' }, { id: 'hist', label: '查看修订', icon: 'history' }, { id: 'dup', label: '复制为新记录', icon: 'copy' }, '-', { id: 'del', label: '删除记录', icon: 'trash-2', danger: true, run: () => confirmDialog({ title: '删除这条记录？', body: '文件会移到恢复中心，30 天内可恢复。', confirm: '删除', danger: true, onConfirm: () => { PAGES.archives.activate('book', 'type'); toast('已删除，可在恢复中心找回', { action: '撤销' }); } }) }]),
    'arch-edit-person': () => PAGES.archives.activate('r-p1', 'record'),
    'journal-add': () => openLayer({ kind: 'dialog', label: '写纪事', content: h`<div class="dialog-head"><div><h2>写纪事</h2><p>林知微</p></div></div><div class="dialog-body"><div class="field"><label class="field-label" for="jn-date">日期</label>${dateField({ id: 'jn-date', value: ymd(TODAY), label: '日期' })}</div><div class="field"><label class="field-label" for="jn-title">标题</label><input class="input" id="jn-title" autofocus></div><div class="field"><label class="field-label" for="jn-body">内容</label><textarea class="textarea" id="jn-body"></textarea></div></div><div class="dialog-foot"><button class="btn btn-secondary" data-action="layer-close">取消</button><button class="btn btn-primary" data-action="journal-save">保存</button></div>` }) && mountDateFields($('.dialog')),
    'journal-save': () => { const t = $('#jn-title').value.trim() || '无标题纪事'; DATA.journal.unshift({ id: nextId('j'), person: 'r-p1', date: $('#jn-date').value || ymd(TODAY), title: t, body: $('#jn-body').value }); closeTop(true); renderMain(); toast('纪事已保存'); },
  },
};

/* ==========================================================================
   自动化 · list stays mounted; inspector on the right; Switch toggles
   ========================================================================== */
const kindIcon = { agent: 'bot', script: 'square-terminal', sync: 'refresh-cw', notify: 'bell' };
const runBadge = s => ({ success: h`<span class="badge badge-success">${icon('circle-check')}成功</span>`, failed: h`<span class="badge badge-danger">${icon('circle-x')}失败</span>`, running: h`<span class="badge badge-warning"><span class="spinner" style="width:10px;height:10px;border-width:1.5px"></span>运行中</span>` }[s] || '');
PAGES.automations = {
  title: '自动化', states: ['default', 'detail', 'detail-runs', 'run-detail', 'editing', 'toggle-pending', 'toggle-failed', 'all-runs', 'new', 'empty', 'missing', 'loading', 'error'],
  filter: 'all', q: '', insp: null, pending: new Set(), failNext: false, mode: 'list',
  enter(s) { this.applyState(s); },
  applyState(s) {
    Object.assign(this, { filter: 'all', q: '', insp: null, failNext: false, mode: 'list' }); this.pending = new Set();
    if (['detail', 'editing', 'toggle-pending'].includes(s)) this.insp = { kind: 'definition', id: 'a1', tab: 'overview' };
    if (s === 'detail-runs') this.insp = { kind: 'definition', id: 'a1', tab: 'runs' };
    if (s === 'run-detail') this.insp = { kind: 'run', id: 'run-3', back: 'a1' };
    if (s === 'toggle-pending') this.pending.add('a1');
    if (s === 'toggle-failed') { this.failNext = true; this.insp = { kind: 'definition', id: 'a3', tab: 'overview' }; }
    if (s === 'all-runs') this.mode = 'runs';
    if (s === 'new') this.mode = 'new';
    if (s === 'missing') this.insp = { kind: 'definition', id: 'a-404', tab: 'overview' };
  },
  mount() { if (S.state === 'editing' && !this._editOpen) { this._editOpen = true; setTimeout(() => { this.openEdit('a1'); this._editOpen = false; }, 0); } this.bindList(); mountDateFields($('#main')); },
  visible() { const q = this.q.trim().toLowerCase(); return (S.state === 'empty' ? [] : DATA.automations).filter(a => this.filter === 'all' || (this.filter === 'on' ? a.enabled : !a.enabled)).filter(a => !q || a.name.toLowerCase().includes(q)); },
  main() {
    const st = S.state;
    if (this.mode === 'new') return this.newPage();
    if (this.mode === 'runs') return this.allRuns();
    const on = DATA.automations.filter(a => a.enabled).length, off = DATA.automations.length - on;
    const head = pageHead('自动化', { sub: st === 'empty' ? '' : `${on} 个启用 · ${off} 个停用`, actions: h`<button class="btn btn-ghost" data-action="auto-all-runs">${icon('history', 'ico-sm')}<span class="hide-sm">全部运行记录</span></button><button class="btn btn-primary" data-action="auto-new">${icon('plus')}<span class="hide-sm">新建自动化</span></button>` });
    if (st === 'loading') return h`${head}<div class="page-body" aria-busy="true"><div class="page-pad"><p class="loading-note" role="status"><span class="spinner"></span>正在读取自动化定义…</p>${[1, 2, 3, 4].map(() => raw('<span class="skel skel-row" style="height:56px"></span>'))}</div></div>`;
    if (st === 'error') return h`${head}<div class="page-body"><div class="page-pad"><div class="notice notice-error">${icon('circle-alert')}<div><p class="notice-title">调度服务没有响应</p><p>无法读取自动化定义。已有的计划不会因此停止。</p></div><button class="btn btn-secondary btn-sm" data-action="auto-retry">${icon('refresh-cw', 'ico-sm')}重试</button></div></div></div>`;
    if (st === 'empty') return h`${head}<div class="page-body"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon('workflow', 'ico-lg')}</span><h2>还没有自动化</h2><p>按时间或事件运行智能体、脚本与同步任务，结果会进入通知收件箱。</p><div class="row"><button class="btn btn-primary" data-action="auto-new">${icon('plus')}新建自动化</button></div></div></div>`;
    return h`${head}<div class="page-toolbar"><div class="input-group search">${icon('search')}<input class="input" id="auto-q" placeholder="搜索自动化" value="${this.q}" aria-label="搜索自动化"></div>
      <div class="seg" role="radiogroup" aria-label="启用状态">${[['all', '全部', DATA.automations.length], ['on', '启用', on], ['off', '停用', off]].map(([v, l, n]) => h`<button role="radio" aria-checked="${this.filter === v}" data-action="auto-filter" data-v="${v}">${l}<span class="count">${n}</span></button>`)}</div>
      <select class="select" style="width:auto" aria-label="排序"><option>按下次运行</option><option>按名称</option><option>按最近结果</option></select></div>
      ${this.failNext ? h`<div class="page-banner"><div class="notice notice-warning">${icon('triangle-alert')}<span>模拟写入失败已开启：下一次启停会失败并恢复原值。</span></div></div>` : ''}
      <div class="page-body hu-scroll" id="auto-scroll"><div class="auto-list" id="auto-list" role="list">${raw(this.listHTML())}</div></div>`;
  },
  listHTML() {
    const rows = this.visible();
    if (!rows.length) return html(h`<div class="empty"><span class="empty-mark">${icon('text-search', 'ico-lg')}</span><h2>没有匹配的自动化</h2><p>换个关键词，或切换启用状态筛选。</p></div>`);
    return rows.map(a => this.row(a)).join('');
  },
  row(a) {
    const sel = this.insp && (this.insp.id === a.id || this.insp.back === a.id);
    return html(h`<div class="list-row auto-row" role="listitem" data-auto="${a.id}" aria-selected="${!!sel}" tabindex="0">
      <span class="kind-tile kind-${a.kind}">${icon(kindIcon[a.kind])}</span>
      <div class="list-row-main"><span class="list-row-title truncate">${a.name}</span><span class="list-row-meta"><span>${icon('clock', 'ico-sm')} ${a.trigger}</span><span class="sep"></span><span class="auto-last st-${a.last.status}"><span class="dot ${a.last.status === 'success' ? 'dot-success' : a.last.status === 'failed' ? 'dot-danger' : 'dot-working'}"></span>${a.last.status === 'running' ? '运行中' : a.last.at}</span></span></div>
      <div class="list-row-end"><span class="next muted hide-sm num">${a.enabled ? '下次 ' + a.next : '已停用'}</span>${this.switchHTML(a)}</div></div>`);
  },
  switchHTML(a, id = '') {
    const busy = this.pending.has(a.id);
    return h`<span class="switch-row" data-no-row><span class="switch-label" aria-hidden="true">${busy ? '保存中' : a.enabled ? '启用' : '停用'}</span><button class="switch" role="switch" ${id ? raw(`id="${id}"`) : ''} aria-checked="${a.enabled}" aria-label="启用“${a.name}”" data-switch="${a.id}" ${busy ? raw('aria-busy="true" disabled') : ''}></button></span>`;
  },
  bindList() {
    const list = $('#auto-list'); if (!list || list.__b) return; list.__b = 1;
    $('#auto-q')?.addEventListener('input', e => { this.q = e.target.value; this.refresh(); });
    list.addEventListener('click', e => {
      const sw = e.target.closest('[data-switch]'); if (sw) { e.stopPropagation(); this.toggle(sw.dataset.switch); return; }
      if (e.target.closest('[data-no-row]')) return;
      const r = e.target.closest('[data-auto]'); if (r) this.open(r.dataset.auto);
    });
    list.addEventListener('keydown', e => { const r = e.target.closest('[data-auto]'); if (!r || e.target !== r) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.open(r.dataset.auto); } if (e.key === 'ArrowDown') { r.nextElementSibling?.focus(); e.preventDefault(); } if (e.key === 'ArrowUp') { r.previousElementSibling?.focus(); e.preventDefault(); } });
  },
  refresh() { const l = $('#auto-list'); if (l) l.innerHTML = this.listHTML(); },
  syncRow(id) { const old = $(`[data-auto="${id}"]`); const a = DATA.automations.find(x => x.id === id); if (old && a) { const tmp = document.createElement('div'); tmp.innerHTML = this.row(a); const had = old.contains(document.activeElement) ? document.activeElement.dataset.switch : null; old.replaceWith(tmp.firstElementChild); if (had) $(`[data-auto="${id}"] [data-switch]`)?.focus(); } },
  open(id) { this.insp = { kind: 'definition', id, tab: 'overview' }; if (S.state !== 'toggle-failed') S.state = 'detail'; $$('[data-auto]').forEach(r => r.setAttribute('aria-selected', r.dataset.auto === id)); renderDetail(); $('#detail .detail-head h2')?.focus(); },
  closeDetail() { const id = this.insp?.id || this.insp?.back; this.insp = null; S.state = 'default'; $$('[data-auto]').forEach(r => r.setAttribute('aria-selected', 'false')); renderDetail(); $(`[data-auto="${id}"]`)?.focus(); },
  toggle(id) {
    const a = DATA.automations.find(x => x.id === id); if (!a || this.pending.has(id)) return;
    const target = !a.enabled; this.pending.add(id); this.syncRow(id); if (this.insp?.id === id) renderDetail();
    setTimeout(() => {
      this.pending.delete(id);
      if (this.failNext) { this.failNext = false; toast(`没能${target ? '启用' : '停用'}“${a.name}”，已恢复为${a.enabled ? '启用' : '停用'}`, { kind: 'error', action: '重试', onAction: () => this.toggle(id) }); }
      else { a.enabled = target; a.next = target ? (a.next === '已停用' ? '今天 18:00' : a.next) : '已停用'; toast(target ? `已启用“${a.name}”` : `已停用“${a.name}”，进行中的运行不受影响`); }
      this.syncRow(id); if (this.insp?.id === id) renderDetail(); this.refreshHead();
    }, 700);
  },
  refreshHead() { const sub = $('#main .page-head .sub'); if (sub) { const on = DATA.automations.filter(a => a.enabled).length; sub.textContent = `${on} 个启用 · ${DATA.automations.length - on} 个停用`; } $$('[data-action="auto-filter"] .count').forEach((c, i) => { const on = DATA.automations.filter(a => a.enabled).length; c.textContent = [DATA.automations.length, on, DATA.automations.length - on][i]; }); },
  detail() {
    const I = this.insp; if (!I || this.mode !== 'list') return null;
    if (I.kind === 'run') {
      const r = DATA.runs.find(x => x.id === I.id), a = DATA.automations.find(x => x.id === r.auto);
      return h`<header class="detail-head"><button class="btn btn-ghost btn-icon btn-sm" data-action="auto-back" aria-label="返回${a.name}">${icon('arrow-left', 'ico-sm')}</button><h2 class="truncate" tabindex="-1">运行 · ${r.at}</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="auto-close" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header>
      <div class="detail-body hu-scroll"><div class="row" style="margin-bottom:12px">${runBadge(r.status)}<span class="muted">${a.name} · 用时 ${r.dur}</span></div>
      ${r.status === 'failed' ? h`<div class="notice notice-error" style="margin-bottom:12px">${icon('circle-alert')}<span>${r.out}</span></div>` : ''}
      <div class="section-title">输出</div><pre class="log">[08:00:00] 调度器触发 ${a.name}\n[08:00:01] 预检：设备“${a.device}”在线，工作目录 ${a.cwd}\n[08:00:02] ${a.action}\n${r.status === 'failed' ? '[08:00:05] ✕ ' + r.out : '[08:00:41] ✓ ' + r.out}\n[08:00:42] 结果已投递到通知收件箱</pre>
      <dl class="props" style="margin-top:16px"><div class="prop"><dt>触发方式</dt><dd>计划 · ${a.trigger}</dd></div><div class="prop"><dt>运行设备</dt><dd>${a.device}</dd></div><div class="prop"><dt>运行 ID</dt><dd class="mono">${r.id}</dd></div></dl></div>
      <footer class="detail-foot"><button class="btn btn-secondary" data-action="auto-back">${icon('arrow-left', 'ico-sm')}返回定义</button><span class="spacer"></span>${r.status === 'failed' ? h`<button class="btn btn-primary" data-action="auto-run" data-id="${a.id}">${icon('rotate-ccw', 'ico-sm')}重新运行</button>` : ''}</footer>`;
    }
    const a = DATA.automations.find(x => x.id === I.id);
    if (!a) return h`<header class="detail-head"><h2 tabindex="-1">找不到这个自动化</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="auto-close" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header><div class="detail-body"><div class="empty" style="min-height:200px"><span class="empty-mark">${icon('circle-x', 'ico-lg')}</span><h3>链接指向的自动化不存在</h3><p>它可能已被删除，或属于另一台设备。列表仍保留在左侧。</p><button class="btn btn-secondary btn-sm" data-action="auto-close">关闭</button></div></div>`;
    const runs = DATA.runs.filter(r => r.auto === a.id);
    return h`<header class="detail-head"><span class="kind-tile kind-${a.kind}">${icon(kindIcon[a.kind])}</span><h2 class="truncate" tabindex="-1">${a.name}</h2>${this.switchHTML(a, 'detail-switch')}<button class="btn btn-ghost btn-icon btn-sm" data-action="auto-close" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header>
    <div class="tabs detail-tabs" role="tablist"><button class="tab" role="tab" aria-selected="${I.tab === 'overview'}" data-action="auto-tab" data-v="overview">概览</button><button class="tab" role="tab" aria-selected="${I.tab === 'runs'}" data-action="auto-tab" data-v="runs">运行记录<span class="count">${runs.length}</span></button></div>
    <div class="detail-body hu-scroll">${I.tab === 'overview' ? h`
      <div class="last-run st-${a.last.status}"><div class="row">${runBadge(a.last.status)}<span class="muted">上次运行 · ${a.last.at}${a.last.dur ? ' · ' + a.last.dur : ''}</span></div>${a.last.error ? h`<p class="last-run-err">${a.last.error}</p>` : ''}</div>
      <dl class="props" style="margin-top:12px"><div class="prop"><dt>触发</dt><dd>${a.trigger}</dd></div><div class="prop"><dt>下次运行</dt><dd class="num">${a.enabled ? a.next : '已停用'}</dd></div><div class="prop"><dt>动作</dt><dd>${a.action}</dd></div><div class="prop"><dt>运行设备</dt><dd>${icon('laptop', 'ico-sm')} ${a.device}</dd></div><div class="prop"><dt>工作目录</dt><dd class="mono truncate">${a.cwd}</dd></div><div class="prop"><dt>结果投递</dt><dd>通知收件箱</dd></div></dl>
      <p class="field-help" style="margin-top:12px">启停只改变是否按计划触发，不会取消已经开始的运行。</p>`
      : h`<ul class="run-list">${runs.length ? runs.map(r => h`<li><button class="run-item" data-action="auto-run-open" data-id="${r.id}">${runBadge(r.status)}<span class="grow num">${r.at}</span><span class="muted num">${r.dur}</span>${icon('chevron-right', 'ico-sm')}</button></li>`) : raw('<p class="muted">还没有运行记录。</p>')}</ul><button class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="auto-all-runs">查看全部运行记录 ${icon('arrow-right', 'ico-sm')}</button>`}</div>
    <footer class="detail-foot"><button class="btn btn-primary" data-action="auto-run" data-id="${a.id}">${icon('play', 'ico-sm')}立即运行</button><button class="btn btn-secondary" data-action="auto-edit" data-id="${a.id}">${icon('pencil', 'ico-sm')}编辑</button><span class="spacer"></span><button class="btn btn-ghost btn-icon" data-action="auto-menu" data-id="${a.id}" aria-label="更多操作">${icon('ellipsis')}</button></footer>`;
  },
  mountDetail() {
    const d = $('#detail'); if (d.__b) return; d.__b = 1;
    d.addEventListener('click', e => { const sw = e.target.closest('[data-switch]'); if (sw) { e.stopPropagation(); this.toggle(sw.dataset.switch); } });
  },
  editForm(a, isNew) {
    return h`<div class="field"><label class="field-label" for="ae-name">名称<span class="req" aria-hidden="true">*</span></label><input class="input" id="ae-name" value="${a.name}" ${isNew ? raw('autofocus') : ''} placeholder="例如：每日晨间简报"></div>
      <div class="field"><span class="field-label" id="ae-trig-l">触发方式</span><div class="seg" role="radiogroup" aria-labelledby="ae-trig-l"><button type="button" role="radio" aria-checked="true">按计划</button><button type="button" role="radio" aria-checked="false">按间隔</button><button type="button" role="radio" aria-checked="false">文件变化</button></div></div>
      <div class="field-grid" style="margin-top:16px"><div class="field"><label class="field-label" for="ae-start">首次运行</label>${dateField({ id: 'ae-start', value: '2026-11-06 08:00', label: '首次运行', time: true, min: ymd(TODAY) })}<span class="field-help">时区：Asia/Shanghai（本机）</span></div>
        <div class="field"><label class="field-label" for="ae-until">结束日期</label>${dateField({ id: 'ae-until', value: '', label: '结束日期', min: ymd(TODAY) })}<span class="field-help">留空表示一直运行</span></div>
        <div class="field span-2"><span class="field-label">重复</span><div class="row weekdays" role="group" aria-label="每周重复">${['一', '二', '三', '四', '五', '六', '日'].map((d, i) => h`<button type="button" class="btn btn-sm ${i < 5 ? 'btn-primary' : 'btn-secondary'}" aria-pressed="${i < 5}">${d}</button>`)}</div></div></div>
      <div class="field" style="margin-top:16px"><label class="field-label" for="ae-action">动作</label><select class="select" id="ae-action"><option>运行智能体提示词</option><option>运行脚本</option><option>同步导入</option><option>发送通知</option></select></div>
      <div class="field"><label class="field-label" for="ae-cwd">工作目录</label><div class="input-group">${icon('folder', 'ico-sm')}<input class="input mono" id="ae-cwd" value="${a.cwd}"></div></div>
      <div class="field"><label class="choice"><button type="button" class="switch" role="switch" aria-checked="true" aria-label="失败时通知" onclick="this.setAttribute('aria-checked',this.getAttribute('aria-checked')!=='true')"></button><span class="choice-text"><span>失败时通知我</span><span class="field-help">结果写入通知收件箱，并可推送到系统通知</span></span></label></div>`;
  },
  openEdit(id) {
    const a = DATA.automations.find(x => x.id === id); let dirty = false;
    openLayer({ kind: 'dialog', className: 'dialog-lg', label: '编辑自动化', guard: () => { if (!dirty) return true; confirmDialog({ title: '放弃修改？', body: '编辑内容尚未保存。', confirm: '放弃', danger: true, onConfirm: () => closeTop(true) }); return false; },
      content: h`<form id="ae-form" novalidate><div class="dialog-head"><div><h2>编辑自动化</h2><p>${a.name}</p></div><button type="button" class="btn btn-ghost btn-icon btn-sm" data-action="layer-close" aria-label="关闭">${icon('x', 'ico-sm')}</button></div><div class="dialog-body">${this.editForm(a)}</div><div class="dialog-foot"><span class="left">保存后从下一次调度开始生效</span><button type="button" class="btn btn-secondary" data-action="layer-close">取消</button><button class="btn btn-primary" type="submit">保存</button></div></form>` });
    const f = $('#ae-form'); mountDateFields(f, () => { dirty = true; }); f.addEventListener('input', () => { dirty = true; });
    f.addEventListener('submit', e => { e.preventDefault(); const n = $('#ae-name').value.trim(); if (!n) { $('#ae-name').setAttribute('aria-invalid', 'true'); $('#ae-name').focus(); return; } a.name = n; a.cwd = $('#ae-cwd').value; closeTop(true); S.state = 'detail'; this.syncRow(a.id); renderDetail(); toast('已保存，下次调度生效'); });
  },
  newPage() {
    return h`${pageHead('新建自动化', { crumb: h`<button data-action="auto-cancel-new">自动化</button>${icon('chevron-right', 'ico-sm')}`, actions: h`<button class="btn btn-secondary" data-action="auto-cancel-new">取消</button><button class="btn btn-primary" data-action="auto-create">创建并启用</button>` })}
    <div class="page-body hu-scroll"><div class="page-pad"><div class="form-page"><section class="form-section"><div class="form-section-head"><h2>基本信息</h2><p>名称会出现在通知和运行记录里。</p></div><div class="card card-body" id="new-form">${this.editForm({ name: '', cwd: 'huhu/' }, true)}</div></section></div></div></div>`;
  },
  allRuns() {
    return h`${pageHead('全部运行记录', { crumb: h`<button data-action="auto-back-list">自动化</button>${icon('chevron-right', 'ico-sm')}`, actions: h`${dateRangeTrigger('runs-range', { from: '2026-10-29', to: ymd(TODAY) })}` })}
    <div class="page-body hu-scroll"><div class="page-pad"><div class="table-wrap"><table class="table"><thead><tr><th>自动化</th><th>结果</th><th>开始</th><th class="num">用时</th><th>设备</th></tr></thead><tbody>${DATA.runs.map(r => { const a = DATA.automations.find(x => x.id === r.auto); return h`<tr data-action="auto-run-row" data-id="${r.id}" tabindex="0"><td class="primary">${a.name}</td><td>${runBadge(r.status)}</td><td class="num">${r.at}</td><td class="num">${r.dur}</td><td class="muted">${a.device}</td></tr>`; })}</tbody></table></div></div></div>`;
  },
  actions: {
    'auto-filter': el => { const P = PAGES.automations; P.filter = el.dataset.v; $$('[data-action="auto-filter"]').forEach(b => b.setAttribute('aria-checked', b === el)); P.refresh(); },
    'auto-close': () => PAGES.automations.closeDetail(),
    'auto-tab': el => { PAGES.automations.insp.tab = el.dataset.v; S.state = el.dataset.v === 'runs' ? 'detail-runs' : 'detail'; renderDetail(); $(`#detail [data-v="${el.dataset.v}"]`)?.focus(); },
    'auto-run-open': el => { const r = DATA.runs.find(x => x.id === el.dataset.id); PAGES.automations.insp = { kind: 'run', id: r.id, back: r.auto }; S.state = 'run-detail'; renderDetail(); $('#detail .detail-head h2')?.focus(); },
    'auto-back': () => { const P = PAGES.automations; P.insp = { kind: 'definition', id: P.insp.back, tab: 'runs' }; S.state = 'detail-runs'; renderDetail(); },
    'auto-run': el => { const a = DATA.automations.find(x => x.id === el.dataset.id); el.classList.add('is-busy'); el.innerHTML = html(h`<span class="spinner" style="width:14px;height:14px;border-color:rgb(255 255 255 / .35);border-top-color:currentColor"></span>运行中`); a.last = { at: '刚刚', status: 'running', dur: '' }; PAGES.automations.syncRow(a.id);
      setTimeout(() => { a.last = { at: '刚刚', status: 'success', dur: '3 秒' }; const run = { id: nextId('run'), auto: a.id, at: '刚刚', status: 'success', dur: '3 秒', out: '手动运行完成。' }; DATA.runs.unshift(run); PAGES.automations.syncRow(a.id); if (S.page === 'automations' && PAGES.automations.insp) { PAGES.automations.insp = { kind: 'run', id: run.id, back: a.id }; S.state = 'run-detail'; renderDetail(); } toast(`“${a.name}”运行完成`); }, 1100); },
    'auto-edit': el => PAGES.automations.openEdit(el.dataset.id),
    'auto-menu': el => menu(el, [{ id: 'dup', label: '复制', icon: 'copy' }, { id: 'link', label: '复制深链', icon: 'link', run: () => toast('已复制深链（原型模拟）', { kind: 'info' }) }, '-', { id: 'del', label: '删除', icon: 'trash-2', danger: true, run: () => confirmDialog({ title: '删除这个自动化？', body: '计划会立即停止，运行记录保留。', confirm: '删除', danger: true, onConfirm: () => toast('已删除（原型未真正移除）', { kind: 'info' }) }) }]),
    'auto-all-runs': () => { PAGES.automations.mode = 'runs'; S.state = 'all-runs'; renderMain(); renderDetail(); },
    'auto-back-list': () => { PAGES.automations.mode = 'list'; S.state = 'default'; renderMain(); renderDetail(); },
    'auto-run-row': el => { const r = DATA.runs.find(x => x.id === el.dataset.id); const P = PAGES.automations; P.mode = 'list'; P.insp = { kind: 'run', id: r.id, back: r.auto }; S.state = 'run-detail'; renderMain(); renderDetail(); },
    'auto-new': () => PAGES.automations.openNew(),
    'auto-cancel-new': () => { PAGES.automations.mode = 'list'; S.state = 'default'; renderMain(); },
    'auto-create': () => { const n = $('#ae-name'); if (!n.value.trim()) { n.setAttribute('aria-invalid', 'true'); if (!$('#ae-name-err')) n.insertAdjacentHTML('afterend', html(h`<div class="field-error" id="ae-name-err">${icon('circle-alert')}<span>请填写名称</span></div>`)); n.setAttribute('aria-describedby', 'ae-name-err'); n.focus(); return; }
      const a = { id: nextId('a'), name: n.value.trim(), trigger: '工作日 08:00', kind: 'agent', action: '运行智能体提示词', device: '这台电脑', cwd: $('#ae-cwd').value, enabled: true, last: { at: '尚未运行', status: 'none', dur: '' }, next: '明天 08:00' };
      DATA.automations.unshift(a); const P = PAGES.automations; P.mode = 'list'; P.insp = { kind: 'definition', id: a.id, tab: 'overview' }; S.state = 'detail'; renderMain(); renderDetail(); toast('已创建并启用'); },
    'auto-retry': () => { S.state = 'loading'; renderMain(); setTimeout(() => { S.state = 'default'; renderMain(); }, 600); },
    daterange: el => openDateRange(el, { from: '2026-10-29', to: ymd(TODAY) }, () => toast('已按日期筛选（原型）', { kind: 'info' })),
  },
  openNew() { this.mode = 'new'; this.insp = null; S.state = 'new'; renderMain(); renderDetail(); mountDateFields($('#main')); $('#ae-name')?.focus(); },
};
