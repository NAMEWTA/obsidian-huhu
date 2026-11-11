/* ==========================================================================
   首页 · Dashboard
   ========================================================================== */
const prioMeta = { high: ['高', 'danger', 'flag'], mid: ['中', 'warning', 'flag'], low: ['低', 'info', 'flag'], none: ['无', '', 'minus'] };
function taskCheck(t, { pending = false } = {}) {
  return h`<span class="check check-round ${pending ? 'is-pending' : ''}"><input type="checkbox" data-task-check="${t.id}" ${t.done ? raw('checked') : ''} aria-label="${t.done ? '重新打开' : '完成'}：${t.title}" ${pending ? raw('aria-busy="true"') : ''}>${CHECK_SVG}</span>`;
}
/* TaskContent: the single completion presentation shared by list, board, calendar and home. */
function taskContent(t, { note = true } = {}) {
  return h`<span class="task-content ${t.done ? 'is-done' : ''}"><span class="task-title">${t.title}</span>${note && t.note ? h`<span class="task-note">${t.note}</span>` : ''}</span>`;
}
function dueChip(t) {
  if (!t.due) return '';
  const d = parseYmd(t.due), n = dayDiff(d, TODAY);
  const cls = t.done ? '' : n < 0 ? 'is-overdue' : n === 0 ? 'is-today' : '';
  return h`<span class="due ${cls}">${icon('calendar', 'ico-sm')}${n < 0 && !t.done ? `逾期 · ${relDay(t.due)}` : relDay(t.due)}</span>`;
}

PAGES.home = {
  title: '首页', states: ['default', 'editing', 'empty', 'loading'],
  editing: false, board: 'b1',
  boards: [{ id: 'b1', name: '我的工作台', icon: 'layout-grid' }, { id: 'b2', name: '项目周报', icon: 'chart-column' }, { id: 'b3', name: '阅读与写作', icon: 'book-open' }],
  widgets: ['tasks', 'calendar', 'focus', 'usage', 'automations', 'capture', 'archives'],
  applyState(s) { this.editing = s === 'editing'; },
  panel() {
    return h`<div class="panel-head"><h2>看板</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="new-board" aria-label="新建看板">${icon('plus', 'ico-sm')}</button></div>
    <div class="panel-body hu-scroll">${this.boards.map(b => h`<button class="nav-item" data-action="board" data-id="${b.id}" aria-current="${this.board === b.id}">${icon(b.icon)}<span class="truncate">${b.name}</span></button>`)}
    <div class="tree-group">快速入口</div>
    <button class="nav-item" data-action="go" data-page="tasks">${icon('list-checks')}<span>今天的任务</span><span class="count">4</span></button>
    <button class="nav-item" data-action="go" data-page="diary">${icon('notebook-pen')}<span>今天的日记</span></button>
    <button class="nav-item" data-action="go" data-page="notifications">${icon('inbox')}<span>收件箱</span><span class="count">${DATA.unread()}</span></button></div>`;
  },
  main() {
    const st = S.state, b = this.boards.find(x => x.id === this.board);
    const open = DATA.tasks.filter(t => !t.done), overdue = open.filter(t => t.due && parseYmd(t.due) < TODAY).length;
    const actions = this.editing
      ? h`<button class="btn btn-secondary" data-action="add-widget">${icon('plus')}添加小组件</button><button class="btn btn-primary" data-action="done-edit">${icon('check')}完成</button>`
      : h`<button class="btn btn-ghost" data-action="edit-layout">${icon('layout-grid')}编辑布局</button><button class="btn btn-primary" data-action="quick-task">${icon('plus')}新建任务<span class="kbd">N</span></button>`;
    if (st === 'empty') return h`${pageHead('新看板', { actions: h`<button class="btn btn-primary" data-action="add-widget">${icon('plus')}添加小组件</button>` })}<div class="page-body hu-scroll"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon('layout-grid', 'ico-lg')}</span><h2>这个看板还是空的</h2><p>从任务、日历、专注计时、智能体用量等小组件开始，按自己的节奏布置。</p><div class="row"><button class="btn btn-primary" data-action="add-widget">${icon('plus')}添加小组件</button><button class="btn btn-secondary" data-action="board" data-id="b1">使用默认布局</button></div></div></div>`;
    return h`${pageHead(b.name, { actions })}
    <div class="page-body hu-scroll"><div class="page-pad home">
      <section class="greet"><div><p class="eyebrow">${fmtLong(ymd(TODAY))}</p><h2 class="greet-title">下午好，今天有 ${open.filter(t => t.due === ymd(TODAY)).length + overdue} 件事值得先做</h2>
      <p class="greet-sub">${overdue ? h`<span class="badge badge-danger">${overdue} 项逾期</span>` : ''}<span>2 个会话在运行</span><span class="sep"></span><span>下一个自动化 · 明天 08:00 晨间简报</span></p></div></section>
      ${this.editing ? h`<div class="notice notice-info" style="margin-bottom:16px">${icon('info')}<span>拖动手柄调整顺序，拖动右下角调整尺寸。原型中用“上移 / 下移”按钮演示排序。</span></div>` : ''}
      <div class="widgets ${this.editing ? 'is-editing' : ''}">${this.widgets.map((w, i) => this.widget(w, i, st === 'loading'))}</div>
    </div></div>`;
  },
  widget(w, i, loading) {
    const W = {
      tasks: ['今日任务', 'list-checks', 'w-7 h-2'], calendar: ['日历', 'calendar-days', 'w-5 h-2'], focus: ['专注', 'timer', 'w-3'], usage: ['智能体用量', 'activity', 'w-4'],
      automations: ['自动化', 'workflow', 'w-5'], capture: ['闪念', 'feather', 'w-5'], archives: ['最近档案', 'library', 'w-7'],
    }[w];
    const tools = this.editing
      ? h`<button class="btn btn-ghost btn-icon btn-sm" data-action="w-up" data-i="${i}" aria-label="上移 ${W[0]}" ${i === 0 ? raw('disabled') : ''}>${icon('chevron-up', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-action="w-down" data-i="${i}" aria-label="下移 ${W[0]}" ${i === this.widgets.length - 1 ? raw('disabled') : ''}>${icon('chevron-down', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-action="w-remove" data-i="${i}" aria-label="移除 ${W[0]}">${icon('x', 'ico-sm')}</button>`
      : h`<button class="btn btn-ghost btn-icon btn-sm" data-action="w-menu" data-w="${w}" aria-label="${W[0]} 更多操作">${icon('ellipsis', 'ico-sm')}</button>`;
    const body = loading ? h`<div class="card-body"><span class="skel skel-line" style="width:60%"></span><span class="skel skel-row"></span><span class="skel skel-row"></span></div>` : this['w_' + w]();
    return h`<section class="card widget ${W[2]}" aria-label="${W[0]}"><header class="card-head">${this.editing ? h`<span class="grip" aria-hidden="true">${icon('grip-vertical', 'ico-sm')}</span>` : ''}<h3 class="card-title">${icon(W[1])}${W[0]}</h3><span class="spacer"></span>${tools}</header>${body}</section>`;
  },
  w_tasks() {
    const list = DATA.tasks.filter(t => !t.done || t.doneAt === ymd(TODAY)).slice(0, 6);
    return h`<div class="card-body flush"><ul class="mini-tasks">${list.map(t => h`<li class="mini-task">${taskCheck(t, { pending: PAGES.tasks.pending.has(t.id) })}${taskContent(t, { note: false })}<span class="spacer"></span>${dueChip(t)}</li>`)}</ul>
      <form class="mini-add" data-form="home-add"><span class="ico-slot">${icon('plus', 'ico-sm')}</span><input class="input input-sm" name="title" placeholder="添加任务，回车保存" aria-label="添加任务"></form></div>`;
  },
  w_calendar() {
    const y = TODAY.getFullYear(), m = TODAY.getMonth(); const first = new Date(y, m, 1); const offset = (first.getDay() + 6) % 7; const days = new Date(y, m + 1, 0).getDate();
    const has = new Set(DATA.tasks.filter(t => t.due).map(t => t.due));
    const cells = []; for (let i = 0; i < offset; i++) cells.push(raw('<span></span>'));
    for (let d = 1; d <= days; d++) { const s = ymd(new Date(y, m, d)); cells.push(h`<button class="cal-cell ${s === ymd(TODAY) ? 'is-today' : ''}" aria-label="${m + 1}月${d}日${has.has(s) ? '，有任务' : ''}" data-action="go" data-page="diary">${d}${has.has(s) ? raw('<i></i>') : ''}</button>`); }
    const agenda = DATA.tasks.filter(t => t.due && !t.done && dayDiff(parseYmd(t.due), TODAY) >= 0).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);
    return h`<div class="card-body"><div class="mini-cal-head"><strong>${y}年${m + 1}月</strong><span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" aria-label="上个月">${icon('chevron-left', 'ico-sm')}</button><button class="btn btn-ghost btn-sm">今天</button><button class="btn btn-ghost btn-icon btn-sm" aria-label="下个月">${icon('chevron-right', 'ico-sm')}</button></div>
      <div class="mini-cal">${['一', '二', '三', '四', '五', '六', '日'].map(d => h`<span class="dow">${d}</span>`)}${cells}</div>
      <ul class="agenda">${agenda.map(t => h`<li><span class="agenda-day">${relDay(t.due)}</span><span class="truncate">${t.title}</span></li>`)}</ul></div>`;
  },
  w_focus() {
    return h`<div class="card-body focus"><div class="focus-ring" role="timer" aria-label="专注剩余 25 分钟"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="track"/><circle cx="60" cy="60" r="52" class="bar" style="stroke-dashoffset:${327 * 0.28}"/></svg><span class="focus-time num">18:04</span></div>
      <p class="muted" style="text-align:center">确认右侧详情阈值</p><div class="row" style="justify-content:center"><button class="btn btn-secondary btn-icon btn-sm" aria-label="暂停">${icon('pause', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" aria-label="重置">${icon('rotate-ccw', 'ico-sm')}</button></div></div>`;
  },
  w_usage() {
    const bars = [34, 52, 41, 63, 48, 72, 58];
    return h`<div class="card-body"><div class="stat"><span class="stat-value num">34,770</span><span class="stat-label">本周 Tokens</span></div>
      <div class="bars" aria-label="近 7 天用量">${bars.map((v, i) => h`<span style="height:${v}%" class="${i === 6 ? 'is-today' : ''}" title="${v}%"></span>`)}</div>
      <div class="row muted" style="font-size:12px;margin-top:8px"><span>Claude 34%</span><span class="sep"></span><span>Codex 18%</span></div></div>`;
  },
  w_automations() {
    return h`<div class="card-body flush"><ul class="mini-list">${DATA.automations.slice(0, 4).map(a => h`<li><span class="dot ${a.last.status === 'success' ? 'dot-success' : a.last.status === 'failed' ? 'dot-danger' : a.last.status === 'running' ? 'dot-working' : ''}" aria-hidden="true"></span><span class="truncate grow">${a.name}</span><span class="muted num">${a.enabled ? a.next : '已停用'}</span></li>`)}</ul></div>`;
  },
  w_capture() {
    return h`<div class="card-body"><textarea class="textarea capture" placeholder="写下此刻的想法…  ⌘↵ 保存到收件箱" aria-label="闪念"></textarea><div class="row" style="margin-top:8px"><span class="muted" style="font-size:12px">今天已记录 3 条</span><span class="spacer"></span><button class="btn btn-secondary btn-sm" data-action="capture-save">保存</button></div></div>`;
  },
  w_archives() {
    return h`<div class="card-body flush"><ul class="mini-list">${DATA.records.slice().sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 4).map(r => { const t = DATA.typeOf(r.type); return h`<li><button class="mini-link" data-action="open-record" data-id="${r.id}">${icon(t.icon)}<span class="truncate grow">${r.title}</span><span class="badge">${t.name}</span><span class="muted num">${relDay(r.updated)}</span></button></li>`; })}</ul></div>`;
  },
  mount() { bindTaskChecks($('#main')); const f = $('[data-form="home-add"]'); f?.addEventListener('submit', e => { e.preventDefault(); const v = f.title.value.trim(); if (!v) return; DATA.tasks.unshift({ id: nextId('t'), title: v, note: '', due: ymd(TODAY), project: 'p-huhu', prio: 'none', tags: [], done: false }); toast('已添加到今天'); renderMain(); $('[data-form="home-add"] input')?.focus(); }); },
  actions: {
    'edit-layout': () => { S.state = 'editing'; PAGES.home.editing = true; renderMain(); },
    'done-edit': () => { S.state = 'default'; PAGES.home.editing = false; renderMain(); toast('布局已保存'); },
    'w-up': el => { const w = PAGES.home.widgets, i = +el.dataset.i; [w[i - 1], w[i]] = [w[i], w[i - 1]]; renderMain(); },
    'w-down': el => { const w = PAGES.home.widgets, i = +el.dataset.i; [w[i + 1], w[i]] = [w[i], w[i + 1]]; renderMain(); },
    'w-remove': el => { const w = PAGES.home.widgets.splice(+el.dataset.i, 1)[0]; renderMain(); toast('已移除小组件', { action: '撤销', onAction: () => { PAGES.home.widgets.splice(+el.dataset.i, 0, w); renderMain(); } }); },
    'w-menu': el => menu(el, [{ id: 'cfg', label: '配置', icon: 'sliders-horizontal' }, { id: 'full', label: '打开完整页面', icon: 'maximize-2', run: () => go({ tasks: 'tasks', automations: 'automations', usage: 'agent', archives: 'archives' }[el.dataset.w] || 'home') }, '-', { id: 'rm', label: '移除', icon: 'trash-2', danger: true, run: () => { PAGES.home.widgets = PAGES.home.widgets.filter(x => x !== el.dataset.w); renderMain(); } }]),
    'add-widget': el => menu(el, ['tasks', 'calendar', 'focus', 'usage', 'automations', 'capture', 'archives'].filter(w => !PAGES.home.widgets.includes(w)).map(w => ({ id: w, label: { tasks: '今日任务', calendar: '日历', focus: '专注', usage: '智能体用量', automations: '自动化', capture: '闪念', archives: '最近档案' }[w], icon: 'plus', run: () => { PAGES.home.widgets.push(w); if (S.state === 'empty') S.state = 'editing'; PAGES.home.editing = true; renderMain(); } })).concat(PAGES.home.widgets.length === 7 ? [{ id: 'none', label: '全部小组件都已添加', icon: 'check' }] : []), '添加小组件'),
    board: el => { PAGES.home.board = el.dataset.id; S.state = 'default'; PAGES.home.editing = false; renderPanel(); renderMain(); },
    'new-board': () => { const id = nextId('b'); PAGES.home.boards.push({ id, name: '新看板', icon: 'layout-grid' }); PAGES.home.board = id; S.state = 'empty'; renderPanel(); renderMain(); },
    'quick-task': () => { go('tasks'); PAGES.tasks.newTask(); },
    'capture-save': () => { const t = $('.capture'); if (!t.value.trim()) { t.focus(); return; } t.value = ''; toast('已保存到收件箱'); },
    'open-record': el => { go('archives'); PAGES.archives.openRecord(el.dataset.id); },
  },
};

/* ==========================================================================
   任务 · list / board / calendar + inspector
   ========================================================================== */
function bindTaskChecks(root) {
  $$('[data-task-check]', root).forEach(cb => cb.addEventListener('click', e => { e.stopPropagation(); }));
  $$('[data-task-check]', root).forEach(cb => cb.addEventListener('change', () => PAGES.tasks.toggle(cb.dataset.taskCheck, cb.checked)));
}
PAGES.tasks = {
  title: '任务', states: ['default', 'board', 'calendar', 'detail', 'completed', 'pending', 'failed', 'empty', 'no-results', 'loading', 'error'],
  list: 'all', view: 'list', status: 'open', range: { from: null, to: null }, q: '', selected: null, pending: new Set(), failNext: false, leaving: new Set(),
  enter(s) { this.applyState(s); },
  applyState(s) {
    Object.assign(this, { view: 'list', status: 'open', q: '', selected: null, failNext: false, range: { from: null, to: null }, list: 'all' }); this.pending = new Set();
    if (s === 'board') this.view = 'board';
    if (s === 'calendar') this.view = 'calendar';
    if (s === 'detail') this.selected = 't1';
    if (s === 'completed') this.status = 'done';
    if (s === 'pending') this.pending.add('t2');
    if (s === 'failed') { this.failNext = true; }
    if (s === 'no-results') this.q = '季度预算';
    if (s === 'empty') this.list = 'p-empty';
  },
  lists() { return [['today', '今天', 'sun'], ['week', '未来 7 天', 'calendar-days'], ['inbox', '收件箱', 'inbox'], ['all', '全部', 'list-todo'], ['done', '已完成', 'circle-check']]; },
  inList(t) {
    const l = this.list, d = t.due ? parseYmd(t.due) : null;
    if (l === 'today') return d && dayDiff(d, TODAY) <= 0 && !t.done;
    if (l === 'week') return d && dayDiff(d, TODAY) >= 0 && dayDiff(d, TODAY) < 7;
    if (l === 'inbox') return !t.project;
    if (l === 'done') return t.done;
    if (l === 'p-empty') return false;
    if (l.startsWith('p-')) return t.project === l;
    if (l.startsWith('tag:')) return t.tags.includes(l.slice(4));
    return true;
  },
  visible() {
    const q = this.q.trim().toLowerCase();
    return DATA.tasks.filter(t => this.inList(t))
      .filter(t => this.status === 'all' || (this.status === 'done' ? t.done : (!t.done || this.leaving.has(t.id) || this.pending.has(t.id))))
      .filter(t => !q || (t.title + t.note).toLowerCase().includes(q))
      .filter(t => { if (!this.range.from && !this.range.to) return true; if (!t.due) return false; return (!this.range.from || t.due >= this.range.from) && (!this.range.to || t.due <= this.range.to); });
  },
  listName() { const l = this.lists().find(x => x[0] === this.list); if (l) return l[1]; if (this.list === 'p-empty') return '季度复盘'; const p = DATA.project(this.list); if (p) return p.name; const t = DATA.tags.find(x => 'tag:' + x.id === this.list); return t ? '#' + t.name : '任务'; },
  panel() {
    const cnt = id => { const keep = this.list; this.list = id; const n = DATA.tasks.filter(t => this.inList(t) && (id === 'done' || !t.done)).length; this.list = keep; return n; };
    return h`<div class="panel-head"><h2>任务</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="new-task" aria-label="新建任务">${icon('plus', 'ico-sm')}</button></div>
    <div class="panel-body hu-scroll">${this.lists().map(([id, n, ic]) => h`<button class="nav-item" data-action="task-list" data-id="${id}" aria-current="${this.list === id}">${icon(ic)}<span>${n}</span><span class="count">${cnt(id) || ''}</span></button>`)}
      <div class="tree-group">项目<button class="btn btn-ghost btn-icon btn-sm" aria-label="新建项目">${icon('plus', 'ico-sm')}</button></div>
      ${DATA.projects.map(p => h`<button class="nav-item" data-action="task-list" data-id="${p.id}" aria-current="${this.list === p.id}"><span class="tag-color" style="background:${p.color}"></span><span class="truncate">${p.name}</span><span class="count">${cnt(p.id) || ''}</span></button>`)}
      <button class="nav-item" data-action="task-list" data-id="p-empty" aria-current="${this.list === 'p-empty'}"><span class="tag-color" style="background:var(--hu-fg-4)"></span><span class="truncate">季度复盘</span></button>
      <div class="tree-group">标签</div>
      ${DATA.tags.map(t => h`<button class="nav-item" data-action="task-list" data-id="tag:${t.id}" aria-current="${this.list === 'tag:' + t.id}">${icon('hash')}<span>${t.name}</span></button>`)}</div>`;
  },
  main() {
    const st = S.state;
    const views = h`<div class="seg" role="radiogroup" aria-label="视图">${[['list', '列表', 'list'], ['board', '看板', 'square-kanban'], ['calendar', '日历', 'calendar-days']].map(([v, l, ic]) => h`<button role="radio" aria-checked="${this.view === v}" data-action="task-view" data-v="${v}">${icon(ic, 'ico-sm')}<span class="hide-sm">${l}</span></button>`)}</div>`;
    const open = DATA.tasks.filter(t => this.inList(t) && !t.done).length;
    const head = pageHead(this.listName(), { sub: `${open} 项未完成`, actions: h`${views}<button class="btn btn-primary" data-action="new-task">${icon('plus')}<span class="hide-sm">新建任务</span></button>` });
    const toolbar = h`<div class="page-toolbar"><div class="input-group search">${icon('search')}<input class="input" id="task-q" placeholder="搜索任务" value="${this.q}" aria-label="搜索任务"></div>
      <div class="seg" role="radiogroup" aria-label="完成状态">${[['open', '未完成'], ['all', '全部'], ['done', '已完成']].map(([v, l]) => h`<button role="radio" aria-checked="${this.status === v}" data-action="task-status" data-v="${v}">${l}</button>`)}</div>
      ${dateRangeTrigger('task-range', this.range)}
      <button class="btn btn-ghost" data-action="task-sort" aria-haspopup="menu">${icon('arrow-up-down', 'ico-sm')}<span class="hide-sm">按截止日期</span></button></div>`;
    let body;
    if (st === 'loading') body = h`<div class="page-pad" aria-busy="true"><p class="loading-note" role="status"><span class="spinner"></span>正在读取任务…</p>${[1, 2, 3, 4, 5].map(() => raw('<span class="skel skel-row"></span>'))}</div>`;
    else if (st === 'error') body = h`<div class="page-pad"><div class="notice notice-error">${icon('circle-alert')}<div><p class="notice-title">任务读取失败</p><p>任务文件暂时无法读取，现有数据没有被修改。</p></div><button class="btn btn-secondary btn-sm" data-action="task-retry">${icon('refresh-cw', 'ico-sm')}重试</button></div></div>`;
    else body = h`<div id="task-body">${raw(this.bodyHTML())}</div>`;
    return h`${head}${toolbar}${st === 'failed' ? h`<div class="page-banner"><div class="notice notice-warning">${icon('triangle-alert')}<span>模拟写入失败已开启：下一次勾选完成会失败并恢复原状态。</span><button class="btn btn-ghost btn-sm" data-action="task-fail-off">关闭模拟</button></div></div>` : ''}<div class="page-body hu-scroll" id="task-scroll">${body}</div>`;
  },
  bodyHTML() {
    const items = this.visible();
    if (this.list === 'p-empty') return html(h`<div class="empty"><span class="empty-mark">${icon('list-todo', 'ico-lg')}</span><h2>这个项目还没有任务</h2><p>把项目拆成几件具体可做的事，完成时会划线保留在“全部”里。</p><div class="row"><button class="btn btn-primary" data-action="new-task">${icon('plus')}新建任务</button></div></div>`);
    if (!items.length) return html(h`<div class="empty"><span class="empty-mark">${icon('text-search', 'ico-lg')}</span><h2>没有符合条件的任务</h2><p>${this.q ? `没有找到包含“${this.q}”的任务。` : '当前筛选下没有任务。'}</p><div class="row"><button class="btn btn-secondary" data-action="task-clear">清除筛选</button></div></div>`);
    if (this.view === 'board') return html(this.board(items));
    if (this.view === 'calendar') return html(this.calendar(items));
    const groups = [['overdue', '逾期'], ['today', '今天'], ['tomorrow', '明天'], ['later', '之后'], ['none', '无日期'], ['done', '已完成']];
    const key = t => { if (t.done && !this.leaving.has(t.id)) return 'done'; if (!t.due) return 'none'; const n = dayDiff(parseYmd(t.due), TODAY); return n < 0 ? 'overdue' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'later'; };
    const sorted = items.slice().sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
    return html(h`<div class="task-list" role="list">${groups.map(([g, label]) => { const rows = sorted.filter(t => key(t) === g); if (!rows.length) return ''; return h`<div class="list-group-head">${label}<span class="count">${rows.length}</span></div>${rows.map(t => this.row(t))}`; })}
      <form class="task-add" data-form="task-add"><span class="ico-slot">${icon('plus')}</span><input class="input" name="title" placeholder="添加任务到“${this.listName()}”，回车保存" aria-label="快速添加任务"></form></div>`);
  },
  row(t) {
    const p = DATA.project(t.project), pend = this.pending.has(t.id);
    return h`<div class="list-row task-row ${pend ? 'is-pending' : ''} ${this.leaving.has(t.id) ? 'is-leaving' : ''}" role="listitem" data-task="${t.id}" aria-selected="${this.selected === t.id}" tabindex="0">${taskCheck(t, { pending: pend })}
      <div class="list-row-main">${taskContent(t)}<div class="list-row-meta">${dueChip(t)}${t.repeat ? h`<span class="meta-chip">${icon('refresh-cw', 'ico-sm')}${t.repeat}</span>` : ''}${p ? h`<span class="meta-chip"><span class="tag-color" style="background:${p.color}"></span>${p.name}</span>` : ''}${t.link ? h`<span class="meta-chip">${icon('link', 'ico-sm')}${t.link}</span>` : ''}${pend ? h`<span class="meta-chip pending-chip"><span class="spinner" style="width:12px;height:12px"></span>正在保存</span>` : ''}</div></div>
      <div class="list-row-end">${t.prio !== 'none' && t.prio && !t.done ? h`<span class="prio prio-${t.prio}" title="优先级${prioMeta[t.prio][0]}">${icon('flag', 'ico-sm')}<span class="sr-only">优先级${prioMeta[t.prio][0]}</span></span>` : ''}<button class="btn btn-ghost btn-icon btn-sm row-actions" data-action="task-menu" data-id="${t.id}" aria-label="${t.title} 更多操作">${icon('ellipsis', 'ico-sm')}</button></div></div>`;
  },
  board(items) {
    const cols = [['todo', '待办', items.filter(t => !t.done && !t.due)], ['doing', '本周', items.filter(t => !t.done && t.due)], ['done', '已完成', items.filter(t => t.done)]];
    return h`<div class="board">${cols.map(([id, name, list]) => h`<section class="board-col" aria-label="${name}"><header class="board-col-head"><span class="dot ${id === 'done' ? 'dot-success' : id === 'doing' ? 'dot-accent' : ''}"></span>${name}<span class="count">${list.length}</span><span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" data-action="new-task" aria-label="在${name}中新建">${icon('plus', 'ico-sm')}</button></header>
      <div class="board-cards">${list.map(t => h`<article class="card card-interactive board-card" data-task="${t.id}" aria-selected="${this.selected === t.id}" tabindex="0"><div class="row" style="align-items:flex-start">${taskCheck(t)}${taskContent(t)}</div><div class="list-row-meta" style="margin-top:8px;padding-left:28px">${dueChip(t)}${DATA.project(t.project) ? h`<span class="meta-chip"><span class="tag-color" style="background:${DATA.project(t.project).color}"></span>${DATA.project(t.project).name}</span>` : ''}</div></article>`)}${list.length ? '' : raw('<p class="board-empty">拖动任务到这里</p>')}</div></section>`)}</div>`;
  },
  calendar(items) {
    const y = TODAY.getFullYear(), m = TODAY.getMonth(), first = new Date(y, m, 1), off = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    const cells = []; for (let i = 0; i < off; i++) cells.push(raw('<div class="mcal-cell is-out"></div>'));
    for (let d = 1; d <= days; d++) { const s = ymd(new Date(y, m, d)); const ts = items.filter(t => t.due === s); cells.push(h`<div class="mcal-cell ${s === ymd(TODAY) ? 'is-today' : ''}"><span class="mcal-day num">${d}</span>${ts.slice(0, 3).map(t => h`<button class="mcal-task ${t.done ? 'is-done' : ''}" data-task="${t.id}">${taskContent(t, { note: false })}</button>`)}${ts.length > 3 ? h`<span class="muted" style="font-size:11px">+${ts.length - 3}</span>` : ''}</div>`); }
    while (cells.length % 7) cells.push(raw('<div class="mcal-cell is-out"></div>'));
    return h`<div class="page-pad" style="padding-top:4px"><div class="mcal-head"><h2>${y}年${m + 1}月</h2><span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" aria-label="上个月">${icon('chevron-left', 'ico-sm')}</button><button class="btn btn-secondary btn-sm">今天</button><button class="btn btn-ghost btn-icon btn-sm" aria-label="下个月">${icon('chevron-right', 'ico-sm')}</button></div>
      <div class="mcal">${['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(d => h`<div class="mcal-dow">${d}</div>`)}${cells}</div></div>`;
  },
  detail() {
    const t = DATA.tasks.find(x => x.id === this.selected); if (!t) return null;
    return h`<header class="detail-head">${taskCheck(t, { pending: this.pending.has(t.id) })}<h2 class="truncate">任务详情</h2><span class="save-state" id="task-save" aria-live="polite">已保存</span><button class="btn btn-ghost btn-icon btn-sm" data-action="task-menu" data-id="${t.id}" aria-label="更多操作">${icon('ellipsis', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-action="close-detail" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header>
    <div class="detail-body hu-scroll"><textarea class="title-input ${t.done ? 'is-done' : ''}" id="td-title" rows="2" aria-label="任务标题">${t.title}</textarea>
      ${t.done ? h`<div class="notice notice-success" style="margin:8px 0 4px">${icon('circle-check')}<span>已于 ${relDay(t.doneAt || ymd(TODAY))} 完成</span><button class="btn btn-ghost btn-sm" data-action="task-reopen" data-id="${t.id}">重新打开</button></div>` : ''}
      <dl class="props" style="margin-top:12px">
        <div class="prop"><dt>截止日期</dt><dd>${dateField({ id: 'td-due', value: t.due || '', label: '截止日期' })}</dd></div>
        <div class="prop"><dt>提醒</dt><dd>${dateField({ id: 'td-remind', value: t.remind || '', label: '提醒时间', time: true })}</dd></div>
        <div class="prop"><dt>优先级</dt><dd><div class="seg seg-sm" role="radiogroup" aria-label="优先级">${['high', 'mid', 'low', 'none'].map(p => h`<button role="radio" aria-checked="${(t.prio || 'none') === p}" data-action="task-prio" data-p="${p}">${prioMeta[p][0]}</button>`)}</div></dd></div>
        <div class="prop"><dt>项目</dt><dd><select class="select" id="td-project" aria-label="项目"><option value="">收件箱</option>${DATA.projects.map(p => h`<option value="${p.id}" ${t.project === p.id ? raw('selected') : ''}>${p.name}</option>`)}</select></dd></div>
        <div class="prop"><dt>重复</dt><dd><span class="fg2">${t.repeat || '不重复'}</span></dd></div>
        <div class="prop"><dt>标签</dt><dd class="row" style="flex-wrap:wrap;gap:6px">${t.tags.map(id => { const g = DATA.tags.find(x => x.id === id); return h`<span class="badge"><span class="tag-color" style="background:${g.color}"></span>${g.name}</span>`; })}<button class="btn btn-ghost btn-sm">${icon('plus', 'ico-sm')}添加</button></dd></div>
      </dl>
      <div class="field" style="margin-top:16px"><label class="field-label" for="td-note">备注</label><textarea class="textarea" id="td-note" placeholder="补充说明、链接或检查清单">${t.note}</textarea></div>
      <div class="section-title" style="margin-top:20px">关联资料</div>
      ${t.link ? h`<button class="link-card" data-action="go" data-page="archives">${icon('file-text')}<span class="grow truncate">${t.link}</span>${icon('arrow-up-right', 'ico-sm')}</button>` : h`<p class="muted" style="font-size:13px">还没有关联档案或笔记。</p>`}
      <p class="muted" style="font-size:12px;margin-top:20px">创建于 11月1日 · 最近修改 今天 10:24</p>
    </div>
    <footer class="detail-foot"><button class="btn btn-danger-ghost" data-action="task-delete" data-id="${t.id}">${icon('trash-2')}删除</button><span class="spacer"></span><button class="btn btn-secondary" data-action="close-detail">关闭</button></footer>`;
  },
  mount() {
    const main = $('#main');
    bindTaskChecks(main);
    $('#task-q')?.addEventListener('input', e => { this.q = e.target.value; this.refreshList(); });
    const f = $('[data-form="task-add"]'); f?.addEventListener('submit', e => { e.preventDefault(); const v = f.title.value.trim(); if (!v) return; DATA.tasks.push({ id: nextId('t'), title: v, note: '', due: null, project: this.list.startsWith('p-') ? this.list : null, prio: 'none', tags: [], done: false }); this.refreshList(); renderPanel(); $('[data-form="task-add"] input').focus(); toast('任务已添加'); });
    main.addEventListener('keydown', e => { const r = e.target.closest?.('[data-task]'); if (r && (e.key === 'Enter' || e.key === ' ') && e.target === r) { e.preventDefault(); this.select(r.dataset.task); } });
    main.onclick = e => { const r = e.target.closest('[data-task]'); if (!r || e.target.closest('button,input,.check')) { if (r && e.target.closest('.mcal-task')) this.select(r.dataset.task); return; } this.select(r.dataset.task); };
    if (S.state === 'failed' && !this._toasted) { this._toasted = true; }
  },
  mountDetail() {
    const t = DATA.tasks.find(x => x.id === this.selected); if (!t) return;
    bindTaskChecks($('#detail'));
    const saved = () => { const s = $('#task-save'); if (s) { s.textContent = '正在保存…'; clearTimeout(this._sv); this._sv = setTimeout(() => { s.textContent = '已保存'; }, 450); } };
    $('#td-title').addEventListener('input', e => { t.title = e.target.value.replace(/\n/g, ' '); saved(); const row = $(`[data-task="${t.id}"] .task-title`); if (row) row.textContent = t.title; });
    $('#td-note').addEventListener('input', e => { t.note = e.target.value; saved(); });
    $('#td-project').addEventListener('change', e => { t.project = e.target.value || null; saved(); this.refreshList(); });
    mountDateFields($('#detail'), (id, v) => { if (id === 'td-due') t.due = v; if (id === 'td-remind') t.remind = v; saved(); this.refreshList(); });
  },
  refreshList() { const b = $('#task-body'); if (b) { const sc = $('#task-scroll').scrollTop; const fid = b.contains(document.activeElement) ? document.activeElement.closest('[data-task]')?.dataset.task : null; b.innerHTML = this.bodyHTML(); bindTaskChecks(b); const f = $('[data-form="task-add"]'); if (f) f.onsubmit = null; $('#task-scroll').scrollTop = sc; this.rebindAdd(); if (fid) $(`#task-body [data-task="${fid}"]`)?.focus(); } },
  rebindAdd() { const f = $('[data-form="task-add"]'); if (!f || f.__b) return; f.__b = 1; f.addEventListener('submit', e => { e.preventDefault(); const v = f.title.value.trim(); if (!v) return; DATA.tasks.push({ id: nextId('t'), title: v, note: '', due: null, project: this.list.startsWith('p-') ? this.list : null, prio: 'none', tags: [], done: false }); this.refreshList(); renderPanel(); $('[data-form="task-add"] input').focus(); toast('任务已添加'); }); },
  select(id) { this.selected = id; if (S.page === 'tasks') { $$('[data-task]').forEach(r => r.setAttribute('aria-selected', r.dataset.task === id)); renderDetail(); $('#td-title')?.focus(); } },
  closeDetail() { const id = this.selected; this.selected = null; renderDetail(); $(`[data-task="${id}"]`)?.focus(); },
  toggle(id, checked) {
    const t = DATA.tasks.find(x => x.id === id); if (!t || this.pending.has(id)) return;
    this.pending.add(id); this.repaint();
    setTimeout(() => {
      this.pending.delete(id);
      if (this.failNext) { this.failNext = false; toast(`没能${checked ? '完成' : '重新打开'}“${t.title}”，已恢复原状态`, { kind: 'error', action: '重试', onAction: () => this.toggle(id, checked) }); this.repaint(); return; }
      t.done = checked; t.doneAt = checked ? ymd(TODAY) : null;
      if (checked && this.status === 'open') { this.leaving.add(id); setTimeout(() => { this.leaving.delete(id); this.repaint(); }, 1400); }
      this.repaint(); renderPanel();
      if (checked) toast(t.repeat ? `已完成，下一次：${t.repeat}` : '已完成', { action: '撤销', onAction: () => { t.done = false; t.doneAt = null; this.repaint(); renderPanel(); } });
    }, 650);
  },
  repaint() { if (S.page === 'tasks') { this.refreshList(); if (this.selected) { renderDetail(); } } else if (S.page === 'home') renderMain(); },
  newTask() {
    let draft = { title: '', due: ymd(TODAY), project: 'p-huhu', prio: 'none' }, dirty = false;
    openLayer({ kind: 'dialog', label: '新建任务', guard: () => { if (!dirty) return true; confirmDialog({ title: '放弃这个任务？', body: '已输入的内容不会保存。', confirm: '放弃', danger: true, onConfirm: () => closeTop(true) }); return false; },
      content: h`<form id="nt-form" novalidate><div class="dialog-head"><div><h2>新建任务</h2><p>添加到“${this.listName()}”</p></div><button type="button" class="btn btn-ghost btn-icon btn-sm" data-action="layer-close" aria-label="关闭">${icon('x', 'ico-sm')}</button></div>
      <div class="dialog-body"><div class="field"><label class="field-label" for="nt-title">标题<span class="req" aria-hidden="true">*</span></label><input class="input" id="nt-title" autofocus aria-required="true" placeholder="要做什么？"></div>
      <div class="field-grid" style="margin-top:16px"><div class="field"><label class="field-label" for="nt-due">截止日期</label>${dateField({ id: 'nt-due', value: draft.due, label: '截止日期' })}</div>
      <div class="field"><label class="field-label" for="nt-project">项目</label><select class="select" id="nt-project">${DATA.projects.map(p => h`<option value="${p.id}">${p.name}</option>`)}</select></div>
      <div class="field span-2"><span class="field-label" id="nt-prio-l">优先级</span><div class="seg" role="radiogroup" aria-labelledby="nt-prio-l">${['high', 'mid', 'low', 'none'].map(p => h`<button type="button" role="radio" aria-checked="${p === 'none'}" data-p="${p}">${prioMeta[p][0]}</button>`)}</div></div></div></div>
      <div class="dialog-foot"><span class="left"><span class="kbd">⌘</span><span class="kbd">↵</span> 保存</span><button type="button" class="btn btn-secondary" data-action="layer-close">取消</button><button class="btn btn-primary" type="submit">创建任务</button></div></form>` });
    const form = $('#nt-form');
    mountDateFields(form, (id, v) => { draft.due = v; dirty = true; });
    form.addEventListener('input', () => { dirty = true; });
    form.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; $$('[data-p]', form).forEach(x => x.setAttribute('aria-checked', x === b)); draft.prio = b.dataset.p; });
    form.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.isComposing) form.requestSubmit(); });
    form.addEventListener('submit', e => {
      e.preventDefault(); const title = $('#nt-title').value.trim();
      if (!title) { const i = $('#nt-title'); i.setAttribute('aria-invalid', 'true'); if (!$('#nt-title-err')) i.insertAdjacentHTML('afterend', html(h`<div class="field-error" id="nt-title-err">${icon('circle-alert')}<span>请填写任务标题</span></div>`)); i.setAttribute('aria-describedby', 'nt-title-err'); i.focus(); return; }
      if ($('#nt-due').getAttribute('aria-invalid') === 'true') { $('#nt-due').focus(); return; }
      const t = { id: nextId('t'), title, note: '', due: draft.due, project: $('#nt-project').value, prio: draft.prio, tags: [], done: false };
      DATA.tasks.push(t); closeTop(true); this.selected = t.id; if (S.page === 'tasks') { this.refreshList(); renderPanel(); renderDetail(); } toast('任务已创建');
    });
  },
  actions: {
    'task-list': el => { const P = PAGES.tasks; P.list = el.dataset.id; P.selected = null; S.state = el.dataset.id === 'p-empty' ? 'empty' : 'default'; if (el.dataset.id === 'done') P.status = 'done'; else if (P.status === 'done') P.status = 'open'; S.panelSheet = false; renderPanel(); renderMain(); renderDetail(); },
    'task-view': el => { PAGES.tasks.view = el.dataset.v; renderMain(); },
    'task-status': el => { PAGES.tasks.status = el.dataset.v; $$('[data-action="task-status"]').forEach(b => b.setAttribute('aria-checked', b === el)); PAGES.tasks.refreshList(); },
    'new-task': () => PAGES.tasks.newTask(),
    'close-detail': () => PAGES.tasks.closeDetail(),
    'task-clear': () => { Object.assign(PAGES.tasks, { q: '', range: { from: null, to: null }, status: 'all', list: 'all' }); S.state = 'default'; renderPanel(); renderMain(); },
    'task-retry': () => { S.state = 'loading'; renderMain(); setTimeout(() => { S.state = 'default'; renderMain(); }, 600); },
    'task-fail-off': () => { PAGES.tasks.failNext = false; S.state = 'default'; renderMain(); },
    daterange: el => openDateRange(el, PAGES.tasks.range, r => { PAGES.tasks.range = r; renderMain(); $('#task-range')?.focus(); }),
    'daterange-clear': () => { PAGES.tasks.range = { from: null, to: null }; renderMain(); $('#task-range')?.focus(); },
    'task-sort': el => menu(el, [{ id: 'due', label: '按截止日期', icon: 'calendar' }, { id: 'prio', label: '按优先级', icon: 'flag' }, { id: 'created', label: '按创建时间', icon: 'clock' }], '排序'),
    'task-prio': el => { const t = DATA.tasks.find(x => x.id === PAGES.tasks.selected); t.prio = el.dataset.p; $$('[data-action="task-prio"]').forEach(b => b.setAttribute('aria-checked', b === el)); PAGES.tasks.refreshList(); },
    'task-reopen': el => PAGES.tasks.toggle(el.dataset.id, false),
    'task-menu': el => { const t = DATA.tasks.find(x => x.id === el.dataset.id); menu(el, [{ id: 'open', label: '打开详情', icon: 'panel-right', run: () => PAGES.tasks.select(t.id) }, { id: 'today', label: '改到今天', icon: 'sun', run: () => { t.due = ymd(TODAY); PAGES.tasks.repaint(); toast('已改到今天'); } }, { id: 'copy', label: '复制链接', icon: 'link', run: () => toast('已复制任务链接（原型模拟）', { kind: 'info' }) }, '-', { id: 'del', label: '删除', icon: 'trash-2', danger: true, run: () => PAGES.tasks.actions['task-delete'](el) }]); },
    'task-delete': el => { const t = DATA.tasks.find(x => x.id === el.dataset.id); confirmDialog({ title: '删除这个任务？', body: `“${t.title}”会移到回收站，30 天内可恢复。`, confirm: '删除', danger: true, onConfirm: () => { const i = DATA.tasks.indexOf(t); DATA.tasks.splice(i, 1); PAGES.tasks.selected = null; PAGES.tasks.refreshList(); renderDetail(); renderPanel(); toast('已删除任务', { action: '撤销', onAction: () => { DATA.tasks.splice(i, 0, t); PAGES.tasks.refreshList(); renderPanel(); } }); } }); },
  },
};
