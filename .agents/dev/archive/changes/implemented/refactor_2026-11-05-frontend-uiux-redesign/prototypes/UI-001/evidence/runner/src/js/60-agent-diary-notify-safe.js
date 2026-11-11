/* ==========================================================================
   智能体 · sessions, terminal tabs/split, inbox, history, usage
   ========================================================================== */
const agentMark = s => h`<span class="agent-mark agent-${s.agent.toLowerCase()}" aria-hidden="true">${s.agent.slice(0, 1)}</span>`;
const sessDot = st => ({ working: 'dot-working', blocked: 'dot-warning', idle: 'dot-success' }[st] || '');
const sessLabel = st => ({ working: '运行中', blocked: '等待你的回答', idle: '空闲' }[st]);
PAGES.agent = {
  title: '智能体', states: ['default', 'split', 'blocked', 'info', 'history', 'usage', 'empty'],
  active: 's1', split: false, view: 'terminal', info: false,
  enter(s) { this.applyState(s); },
  applyState(s) { this.view = s === 'history' ? 'history' : s === 'usage' ? 'usage' : 'terminal'; this.split = s === 'split'; this.active = s === 'blocked' ? 's2' : 's1'; this.info = s === 'info'; },
  sessions() { return S.state === 'empty' ? [] : DATA.sessions; },
  panel() {
    const ss = this.sessions(); const ws = [...new Set(ss.map(s => s.ws))];
    return h`<div class="panel-head"><h2>智能体</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="agent-new" aria-label="新建会话">${icon('plus', 'ico-sm')}</button></div>
    <div class="panel-body hu-scroll">${ws.map(w => h`<div class="tree-group">${icon('folder', 'ico-sm')}${w}</div>${ss.filter(s => s.ws === w).map(s => h`<button class="nav-item sess-item" data-action="agent-open" data-id="${s.id}" aria-current="${this.view === 'terminal' && this.active === s.id}">${agentMark(s)}<span class="truncate grow">${s.title}</span><span class="dot ${sessDot(s.status)}" title="${sessLabel(s.status)}"></span><span class="sr-only">${sessLabel(s.status)}</span></button>`)}`)}
      ${ss.length ? '' : raw('<p class="muted" style="padding:8px 16px;font-size:13px">没有运行中的会话</p>')}
      <div class="tree-group">工具</div>
      <button class="nav-item" data-action="agent-view" data-v="history" aria-current="${this.view === 'history'}">${icon('history')}<span>历史会话</span></button>
      <button class="nav-item" data-action="go" data-page="notifications">${icon('inbox')}<span>智能体收件箱</span><span class="count">1</span></button>
      <button class="nav-item" data-action="agent-view" data-v="usage" aria-current="${this.view === 'usage'}">${icon('activity')}<span>用量</span></button>
      <button class="nav-item" data-action="go" data-page="settings">${icon('user')}<span>账号与 CLI</span></button></div>`;
  },
  main() {
    if (this.view === 'history') return this.history();
    if (this.view === 'usage') return this.usage();
    const ss = this.sessions();
    if (!ss.length) return h`${pageHead('智能体')}<div class="page-body"><div class="empty" style="min-height:64vh"><span class="empty-mark">${icon('bot', 'ico-lg')}</span><h2>开始一个会话</h2><p>在库内目录中运行 Claude Code、Codex 或普通终端。会话在关闭工作台后继续保留。</p><div class="row"><button class="btn btn-primary" data-action="agent-new">${icon('plus')}新建会话</button><button class="btn btn-secondary" data-action="agent-view" data-v="history">打开历史会话</button></div></div></div>`;
    const cur = ss.find(s => s.id === this.active) || ss[0];
    const tabs = h`<div class="term-tabs" role="tablist" aria-label="会话">${ss.map(s => h`<div class="term-tab" role="tab" aria-selected="${s.id === cur.id}" data-action="agent-open" data-id="${s.id}" tabindex="${s.id === cur.id ? 0 : -1}">${agentMark(s)}<span class="truncate">${s.title}</span><span class="dot ${sessDot(s.status)}"></span><button class="term-tab-x" aria-label="关闭 ${s.title}" data-action="agent-close" data-id="${s.id}">${icon('x', 'ico-sm')}</button></div>`)}<button class="btn btn-ghost btn-icon btn-sm" data-action="agent-new" aria-label="新建会话">${icon('plus', 'ico-sm')}</button></div>`;
    const tools = h`<button class="btn btn-ghost btn-icon btn-sm" data-action="agent-split" aria-pressed="${this.split}" aria-label="左右分屏">${icon('columns-2', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" aria-label="在终端中搜索">${icon('search', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-action="agent-info" aria-pressed="${this.info}" aria-label="会话信息">${icon('panel-right', 'ico-sm')}</button>`;
    const pane = s => h`<section class="term-pane" aria-label="${s.title}"><header class="term-bar">${agentMark(s)}<span class="truncate">${s.agent} · ${s.model}</span><span class="muted mono truncate">${s.cwd}</span><span class="spacer"></span><span class="badge ${s.status === 'blocked' ? 'badge-warning' : s.status === 'working' ? 'badge-accent' : ''}"><span class="dot ${sessDot(s.status)}"></span>${sessLabel(s.status)}</span></header><div class="term hu-scroll" tabindex="0" aria-label="${s.title} 终端输出" role="log">${raw(this.termText(s))}</div></section>`;
    const blocked = ss.find(s => s.status === 'blocked');
    return h`<header class="page-head term-head">${panelToggle()}<h1 id="page-title" class="sr-only">智能体会话 · ${cur.title}</h1>${tabs}<div class="actions">${tools}</div></header>
      ${blocked && (S.state === 'blocked' || cur.id !== blocked.id) ? h`<div class="page-banner"><div class="notice notice-warning">${icon('message-square-text')}<div class="grow"><p class="notice-title">${blocked.agent} 请求运行 <span class="mono">pnpm test</span></p><p>会话“${blocked.title}”正在等待你的确认。回答会直接发送到该终端。</p></div>${cur.id !== blocked.id ? h`<button class="btn btn-secondary btn-sm" data-action="agent-open" data-id="${blocked.id}">前往会话</button>` : h`<button class="btn btn-secondary btn-sm" data-action="agent-answer" data-v="no">拒绝</button><button class="btn btn-primary btn-sm" data-action="agent-answer" data-v="yes">允许一次</button>`}</div></div>` : ''}
      <div class="page-body term-area ${this.split ? 'is-split' : ''}">${pane(cur)}${this.split ? pane(ss.find(s => s.id !== cur.id) || cur) : ''}</div>`;
  },
  termText(s) {
    const L = (cls, t) => `<div class="tl ${cls}">${esc(t)}</div>`;
    if (s.id === 's2') return [L('dim', '› review the virtual scrolling in src/ui/components/tree.tsx'), L('', '读取 tree.tsx、tree.dom.test.tsx …'), L('ok', '✓ 行高估算 28px 与 CSS 一致'), L('warn', '! 改为 32px 时 estimateSize 需要同步，否则焦点行会错位'), L('', ''), L('ask', '需要运行测试来确认：'), L('ask', '  $ pnpm exec vitest run --project dom src/ui/components/tree.dom.test.tsx'), L('ask', '  允许运行？ [y] 允许一次  [a] 本会话总是允许  [n] 拒绝'), `<div class="tl cursor">› <span class="caret"></span></div>`].join('');
    if (s.id === 's3') return [L('dim', '› 根据本周日记和任务写一份周报草稿'), L('', '已读取 7 篇日记、12 项任务。'), L('ok', '✓ 草稿写入 huhu/journal/2026-W45 周报.md'), `<div class="tl cursor">› <span class="caret"></span></div>`].join('');
    return [L('dim', '› 把 tokens.css 里的局部颜色收敛到语义 token'), L('', '搜索 src/ 下的颜色字面量 …  共 47 处'), L('ok', '✓ 按钮、字段、Switch 已改为 --hu-accent / --hu-control-line'), L('ok', '✓ 删除 3 个只服务旧布局的选择器'), L('', '  src/ui/styles/tokens.css   +38 −61'), L('', '  src/ui/components/button.tsx  +6 −14'), L('warn', '! 看板 --db-* 仍是派生变量，保持不动'), L('', ''), L('run', '● 运行 pnpm run lint:css …'), `<div class="tl cursor">› <span class="caret"></span></div>`].join('');
  },
  detail() {
    if (!this.info || this.view !== 'terminal') return null;
    const s = this.sessions().find(x => x.id === this.active); if (!s) return null;
    return h`<header class="detail-head">${agentMark(s)}<h2 class="truncate">会话信息</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="agent-info" aria-label="关闭会话信息">${icon('x', 'ico-sm')}</button></header>
    <div class="detail-body hu-scroll"><dl class="props"><div class="prop"><dt>状态</dt><dd><span class="badge"><span class="dot ${sessDot(s.status)}"></span>${sessLabel(s.status)}</span></dd></div><div class="prop"><dt>智能体</dt><dd>${s.agent} · ${s.model}</dd></div><div class="prop"><dt>工作目录</dt><dd class="mono truncate">${s.cwd}</dd></div><div class="prop"><dt>本次 Tokens</dt><dd class="num">${s.tokens}</dd></div><div class="prop"><dt>开始于</dt><dd>今天 10:12</dd></div><div class="prop"><dt>账号</dt><dd>个人 · 额度 34%</dd></div></dl>
    <div class="section-title" style="margin-top:20px">改动的文件</div><ul class="mini-list">${['src/ui/styles/tokens.css', 'src/ui/components/button.tsx', 'src/ui/components/switch.tsx'].map(f => h`<li class="mono" style="font-size:12px">${icon('file-text', 'ico-sm')}<span class="truncate grow">${f}</span></li>`)}</ul></div>
    <footer class="detail-foot"><button class="btn btn-secondary">${icon('history', 'ico-sm')}导出记录</button><span class="spacer"></span><button class="btn btn-danger-ghost">结束会话</button></footer>`;
  },
  history() {
    const rows = [['设计 token 收敛', 'Claude', '今天 10:12', '18.2k', '进行中'], ['tree 虚拟滚动评审', 'Codex', '今天 09:40', '9.4k', '等待回答'], ['周报草稿', 'Claude', '昨天 21:05', '3.1k', '已结束'], ['自动化详情布局', 'Claude', '11月3日', '27.9k', '已结束'], ['日期组件选型', 'Codex', '11月2日', '12.6k', '已结束']];
    return h`${pageHead('历史会话', { sub: '最近 30 天 · 24 个会话', actions: dateRangeTrigger('hist-range', { from: '2026-10-07', to: ymd(TODAY) }) })}
    <div class="page-toolbar"><div class="input-group search">${icon('search')}<input class="input" placeholder="搜索会话标题与内容" aria-label="搜索历史会话"></div><div class="seg" role="radiogroup" aria-label="智能体"><button role="radio" aria-checked="true">全部</button><button role="radio" aria-checked="false">Claude</button><button role="radio" aria-checked="false">Codex</button></div></div>
    <div class="page-body hu-scroll"><div class="page-pad" style="padding-top:4px"><div class="table-wrap"><table class="table"><thead><tr><th>会话</th><th>智能体</th><th>开始</th><th class="num">Tokens</th><th>状态</th></tr></thead><tbody>${rows.map(r => h`<tr tabindex="0"><td class="primary">${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td><td><span class="badge ${r[4] === '进行中' ? 'badge-accent' : r[4] === '等待回答' ? 'badge-warning' : ''}">${r[4]}</span></td></tr>`)}</tbody></table></div></div></div>`;
  },
  usage() {
    const days = [['10/30', 22, 9], ['10/31', 31, 12], ['11/1', 18, 6], ['11/2', 40, 20], ['11/3', 52, 15], ['11/4', 36, 22], ['11/5', 44, 18]];
    return h`${pageHead('用量', { sub: '本周', actions: h`<div class="seg"><button aria-pressed="false">今天</button><button aria-pressed="true">本周</button><button aria-pressed="false">本月</button></div>` })}
    <div class="page-body hu-scroll"><div class="page-pad page-narrow"><div class="kpis"><div class="kpi"><span class="kpi-label">Tokens</span><span class="kpi-value num">34,770</span><span class="kpi-sub up">较上周 +12%</span></div><div class="kpi"><span class="kpi-label">会话</span><span class="kpi-value num">24</span></div><div class="kpi"><span class="kpi-label">Claude 额度</span><span class="kpi-value num">34%</span><div class="progress"><span style="width:34%"></span></div></div><div class="kpi"><span class="kpi-label">Codex 额度</span><span class="kpi-value num">18%</span><div class="progress"><span style="width:18%"></span></div></div></div>
    <section class="card" style="margin-top:20px"><header class="card-head"><h3 class="card-title">${icon('chart-column')}每日用量</h3><span class="spacer"></span><span class="legend"><i style="background:var(--hu-chart-1)"></i>Claude</span><span class="legend"><i style="background:var(--hu-chart-2)"></i>Codex</span></header><div class="card-body"><div class="stack-bars" role="img" aria-label="近 7 天每日用量，11月3日最高">${days.map(([d, a, b]) => h`<div class="sb"><div class="sb-col"><span style="height:${b}%;background:var(--hu-chart-2)"></span><span style="height:${a}%;background:var(--hu-chart-1)"></span></div><span class="sb-l num">${d}</span></div>`)}</div></div></section></div></div>`;
  },
  actions: {
    'agent-open': (el, e) => { if (e.target.closest('[data-action="agent-close"]')) return; const P = PAGES.agent; P.active = el.dataset.id; P.view = 'terminal'; S.state = DATA.sessions.find(s => s.id === el.dataset.id)?.status === 'blocked' ? 'blocked' : 'default'; S.panelSheet = false; renderPanel(); renderMain(); renderDetail(); },
    'agent-close': el => confirmDialog({ title: '关闭这个会话？', body: '终端进程会结束，输出会保存到历史会话。', confirm: '关闭会话', danger: true, onConfirm: () => toast('会话已关闭（原型未真正结束进程）', { kind: 'info' }) }),
    'agent-split': () => { PAGES.agent.split = !PAGES.agent.split; S.state = PAGES.agent.split ? 'split' : 'default'; renderMain(); },
    'agent-info': () => { PAGES.agent.info = !PAGES.agent.info; S.state = PAGES.agent.info ? 'info' : 'default'; renderMain(); renderDetail(); },
    'agent-view': el => { PAGES.agent.view = el.dataset.v; S.state = el.dataset.v; S.panelSheet = false; PAGES.agent.info = false; renderPanel(); renderMain(); renderDetail(); },
    'agent-new': el => menu(el, [{ id: 'c', label: 'Claude Code', icon: 'sparkles', run: () => toast('已在 ~/vault 启动 Claude Code（原型）', { kind: 'info' }) }, { id: 'x', label: 'Codex', icon: 'bot', run: () => toast('已启动 Codex（原型）', { kind: 'info' }) }, { id: 's', label: '普通终端', icon: 'square-terminal' }, '-', { id: 'cwd', label: '选择工作目录…', icon: 'folder-open' }], '新建会话'),
    'agent-answer': el => { const s = DATA.sessions.find(x => x.id === 's2'); s.status = el.dataset.v === 'yes' ? 'working' : 'idle'; S.state = 'default'; renderPanel(); renderMain(); toast(el.dataset.v === 'yes' ? '已允许一次，Codex 继续运行' : '已拒绝，Codex 会给出替代方案'); },
  },
};

/* ==========================================================================
   日记 · book page reading / writing (periodic notes projection)
   ========================================================================== */
PAGES.diary = {
  title: '日记', states: ['default', 'writing', 'empty-date'], date: ymd(TODAY),
  entries: {
    '2026-11-05': '早上把工作台的配色重新定了一遍：纸一样的米白，墨色的字，只留一种强调色。克制之后，页面反而安静下来，信息自己浮上来。\n\n下午把自动化列表和右侧详情放在一起，终于不用来回跳页面了。记一笔：右详情宽度不够时就变成覆盖层，不要硬挤成四列。',
    '2026-11-04': '整理了档案的目录树。展开和选中分开以后，键盘操作顺手很多。晚上读了半章《设计中的设计》。',
    '2026-11-02': '雨天。在家把净水器滤芯的型号记进了归物本。',
  },
  enter(s) { this.applyState(s); },
  applyState(s) { this.date = s === 'empty-date' ? '2026-11-03' : ymd(TODAY); this.writing = s === 'writing'; },
  panel() {
    const y = 2026, m = 10, first = new Date(y, m, 1), off = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(); const cells = [];
    for (let i = 0; i < off; i++) cells.push(raw('<span></span>'));
    for (let d = 1; d <= days; d++) { const s = ymd(new Date(y, m, d)); cells.push(h`<button class="cal-cell ${s === ymd(TODAY) ? 'is-today' : ''} ${s === this.date ? 'is-sel' : ''}" data-action="diary-day" data-d="${s}" aria-label="${m + 1}月${d}日${this.entries[s] ? '，有日记' : ''}" aria-pressed="${s === this.date}">${d}${this.entries[s] ? raw('<i></i>') : ''}</button>`); }
    return h`<div class="panel-head"><h2>日记</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="diary-today" aria-label="回到今天">${icon('sun', 'ico-sm')}</button></div>
    <div class="panel-body hu-scroll"><div class="diary-cal"><div class="mini-cal-head"><strong>2026年11月</strong><span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" aria-label="上个月">${icon('chevron-left', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" aria-label="下个月">${icon('chevron-right', 'ico-sm')}</button></div><div class="mini-cal">${['一', '二', '三', '四', '五', '六', '日'].map(d => h`<span class="dow">${d}</span>`)}${cells}</div></div>
      <div class="tree-group">本月</div>${Object.keys(this.entries).map(d => h`<button class="nav-item" data-action="diary-day" data-d="${d}" aria-current="${this.date === d}">${icon('file-text')}<span class="grow">${relDay(d)}</span><span class="muted num" style="font-size:11px">${d.slice(5)}</span></button>`)}
      <div class="tree-group">回顾</div><button class="nav-item">${icon('history')}<span>去年今日</span></button><button class="nav-item" data-action="go" data-page="tasks">${icon('list-checks')}<span>本周回顾</span></button></div>`;
  },
  main() {
    const d = this.date, text = this.entries[d], prev = ymd(addDays(parseYmd(d), -1)), next = ymd(addDays(parseYmd(d), 1));
    const nav = h`<button class="btn btn-ghost btn-icon" data-action="diary-day" data-d="${prev}" aria-label="前一天">${icon('chevron-left')}</button><button class="btn btn-ghost btn-icon" data-action="diary-day" data-d="${next}" aria-label="后一天" ${d >= ymd(TODAY) ? raw('disabled') : ''}>${icon('chevron-right')}</button>`;
    const actions = this.writing ? h`<span class="save-state" id="diary-save">已自动保存</span><button class="btn btn-primary" data-action="diary-done">${icon('check')}完成</button>` : h`${nav}<button class="btn btn-secondary" data-action="diary-write">${icon('pen-line', 'ico-sm')}${text ? '继续写' : '写日记'}</button>`;
    let body;
    if (!text && !this.writing) body = h`<div class="book-empty"><span class="empty-mark">${icon('feather', 'ico-lg')}</span><h2>这一天还没有日记</h2><p>写下来的内容会保存为 huhu/journal/${d}.md，使用你的周期笔记模板。</p><button class="btn btn-primary" data-action="diary-write">${icon('pen-line', 'ico-sm')}写这一天</button></div>`;
    else if (this.writing) body = h`<textarea class="book-editor" id="diary-editor" aria-label="${fmtLong(d)} 日记正文" placeholder="今天……">${text || ''}</textarea>`;
    else body = h`<div class="reading book-text">${text.split('\n\n').map(p => h`<p>${p}</p>`)}</div>`;
    return h`${pageHead(fmtLong(d), { actions })}<div class="page-body hu-scroll"><div class="book-wrap"><article class="book" aria-label="日记页"><header class="book-head"><span class="eyebrow">第 ${dayDiff(parseYmd(d), new Date(2026, 0, 1)) + 1} 天 · 2026</span><h2 class="reading-title">${relDay(d) === '今天' ? '今天' : `${parseYmd(d).getMonth() + 1}月${parseYmd(d).getDate()}日`}</h2><p class="muted">${WEEK[parseYmd(d).getDay()]} · 杭州 · 小雨</p></header>${body}<footer class="book-foot"><span class="num">${(text || '').length} 字</span><span class="spacer"></span><span>huhu/journal/${d}.md</span></footer></article></div></div>`;
  },
  mount() { const e = $('#diary-editor'); if (e) { e.focus(); e.addEventListener('input', () => { this.entries[this.date] = e.value; const s = $('#diary-save'); s.textContent = '正在保存…'; clearTimeout(this._t); this._t = setTimeout(() => { s.textContent = '已自动保存'; }, 500); }); } },
  actions: {
    'diary-day': el => { const P = PAGES.diary; P.date = el.dataset.d; P.writing = false; S.state = P.entries[P.date] ? 'default' : 'empty-date'; S.panelSheet = false; renderPanel(); renderMain(); },
    'diary-today': () => PAGES.diary.actions['diary-day']({ dataset: { d: ymd(TODAY) } }),
    'diary-write': () => { PAGES.diary.writing = true; S.state = 'writing'; renderMain(); },
    'diary-done': () => { const P = PAGES.diary; P.writing = false; if (!P.entries[P.date]?.trim()) delete P.entries[P.date]; S.state = P.entries[P.date] ? 'default' : 'empty-date'; renderPanel(); renderMain(); toast('日记已保存'); },
  },
};

/* ==========================================================================
   通知 · inbox list + inspector
   ========================================================================== */
PAGES.notifications = {
  title: '通知', states: ['default', 'detail', 'empty', 'error'], filter: 'all', sel: null,
  enter(s) { this.applyState(s); }, applyState(s) { this.sel = s === 'detail' ? 'n1' : null; },
  main() {
    const st = S.state, list = st === 'empty' ? [] : DATA.notifications.filter(n => this.filter === 'all' || !n.read);
    const head = pageHead('通知', { sub: `${DATA.unread()} 条未读`, actions: h`<div class="seg" role="radiogroup" aria-label="筛选"><button role="radio" aria-checked="${this.filter === 'unread'}" data-action="nt-filter" data-v="unread">未读</button><button role="radio" aria-checked="${this.filter === 'all'}" data-action="nt-filter" data-v="all">全部</button></div><button class="btn btn-ghost" data-action="nt-readall" ${DATA.unread() ? '' : raw('disabled')}>${icon('check', 'ico-sm')}<span class="hide-sm">全部已读</span></button><button class="btn btn-ghost btn-icon" data-action="go" data-page="settings" aria-label="通知设置">${icon('sliders-horizontal')}</button>` });
    if (st === 'error') return h`${head}<div class="page-body"><div class="page-pad"><div class="notice notice-error">${icon('circle-alert')}<div><p class="notice-title">收件箱读取失败</p><p>通知不会丢失，恢复后会按时间顺序补齐。</p></div><button class="btn btn-secondary btn-sm" data-action="nt-retry">重试</button></div></div></div>`;
    if (!list.length) return h`${head}<div class="page-body"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon('inbox', 'ico-lg')}</span><h2>${this.filter === 'unread' && st !== 'empty' ? '没有未读通知' : '收件箱是空的'}</h2><p>自动化结果、智能体提问和提醒都会出现在这里。</p></div></div>`;
    return h`${head}<div class="page-body hu-scroll"><div class="page-pad page-narrow" style="padding-top:12px"><div class="list nt-list" role="list">${list.map(n => h`<div class="list-row nt-row ${n.read ? '' : 'is-unread'}" role="listitem" tabindex="0" data-action="nt-open" data-id="${n.id}" aria-selected="${this.sel === n.id}"><span class="nt-icon nt-${n.kind}">${icon(n.icon)}</span><div class="list-row-main"><span class="list-row-title truncate">${n.title}</span><span class="list-row-meta"><span>${n.source}</span><span class="sep"></span><span>${n.at}</span></span></div>${n.read ? '' : raw('<span class="dot dot-accent" aria-label="未读"></span>')}</div>`)}</div></div></div>`;
  },
  detail() {
    const n = DATA.notifications.find(x => x.id === this.sel); if (!n) return null;
    return h`<header class="detail-head"><span class="nt-icon nt-${n.kind}">${icon(n.icon)}</span><h2 class="truncate" tabindex="-1">${n.source}</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="nt-close" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header>
    <div class="detail-body hu-scroll"><h3 class="detail-title">${n.title}</h3><p class="muted" style="margin:4px 0 12px">${n.at}</p><p class="fg2">${n.body}</p>${n.kind === 'danger' ? h`<div class="notice notice-error" style="margin-top:16px">${icon('circle-alert')}<span>投递回执：已写入收件箱 · 系统通知已发送</span></div>` : ''}</div>
    <footer class="detail-foot"><button class="btn btn-primary" data-action="go" data-page="${n.target}">打开来源 ${icon('arrow-right', 'ico-sm')}</button><span class="spacer"></span><button class="btn btn-ghost" data-action="nt-unread" data-id="${n.id}">标为未读</button></footer>`;
  },
  closeDetail() { const id = this.sel; this.sel = null; S.state = 'default'; $$('.nt-row').forEach(r => r.setAttribute('aria-selected', 'false')); renderDetail(); $(`[data-id="${id}"]`)?.focus(); },
  actions: {
    'nt-open': el => { const P = PAGES.notifications, n = DATA.notifications.find(x => x.id === el.dataset.id); P.sel = n.id; n.read = true; S.state = 'detail'; renderRail(); renderStatus(); renderMain(); renderDetail(); },
    'nt-close': () => PAGES.notifications.closeDetail(),
    'nt-filter': el => { PAGES.notifications.filter = el.dataset.v; renderMain(); },
    'nt-readall': () => { DATA.notifications.forEach(n => { n.read = true; }); renderRail(); renderStatus(); renderMain(); toast('已全部标为已读'); },
    'nt-unread': el => { DATA.notifications.find(x => x.id === el.dataset.id).read = false; renderRail(); renderStatus(); renderMain(); },
    'nt-retry': () => { S.state = 'default'; renderMain(); },
  },
};

/* ==========================================================================
   保险箱 · locked → list/detail; quick pick
   ========================================================================== */
const SAFE_CATS = [['login', '登录', 'key-round'], ['card', '银行卡', 'credit-card'], ['note', '安全笔记', 'sticky-note'], ['id', '证件', 'id-card']];
PAGES.safe = {
  title: '保险箱', states: ['locked', 'error', 'default', 'detail', 'revealed', 'quick-pick', 'empty'], unlocked: false, cat: 'login', sel: null, reveal: false,
  enter(s) { this.applyState(s); },
  applyState(s) { this.unlocked = !['locked', 'error'].includes(s); this.cat = s === 'empty' ? 'id' : 'login'; this.sel = ['detail', 'revealed'].includes(s) ? 'v-1' : null; this.reveal = s === 'revealed'; if (s === 'quick-pick') setTimeout(() => this.quick(), 0); },
  panel() {
    if (!this.unlocked) return null;
    return h`<div class="panel-head"><h2>保险箱</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="safe-lock" aria-label="立即锁定">${icon('lock', 'ico-sm')}</button></div>
    <div class="panel-body hu-scroll">${SAFE_CATS.map(([id, n, ic]) => h`<button class="nav-item" data-action="safe-cat" data-id="${id}" aria-current="${this.cat === id}">${icon(ic)}<span>${n}</span><span class="count">${DATA.vault.filter(v => v.cat === id).length || ''}</span></button>`)}
    <div class="tree-group">安全</div><button class="nav-item" data-action="safe-quick-btn">${icon('zap')}<span>快速取密</span><span class="kbd" style="margin-left:auto">⌘⇧P</span></button><button class="nav-item">${icon('shield-check')}<span>密码体检</span></button></div>
    <div class="panel-foot"><p class="muted" style="font-size:12px">${icon('timer', 'ico-sm')} 4 分钟无操作后自动锁定</p></div>`;
  },
  main() {
    if (!this.unlocked) return h`${pageHead('保险箱')}<div class="page-body"><div class="lock-screen"><form class="card lock-card" id="unlock-form"><span class="lock-mark">${icon('lock-keyhole', 'ico-xl')}</span><h2>保险箱已锁定</h2><p class="muted">输入主密码解锁。解锁内容只保留在内存中。</p>
      <div class="field" style="width:100%;margin-top:8px"><label class="sr-only" for="safe-pw">主密码</label><div class="input-group"><input class="input input-lg" type="password" id="safe-pw" placeholder="主密码" autocomplete="off" ${S.state === 'error' ? raw('aria-invalid="true" aria-describedby="pw-err"') : ''} autofocus><span class="input-suffix"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-action="safe-pw-eye" aria-label="显示密码">${icon('eye', 'ico-sm')}</button></span></div>${S.state === 'error' ? h`<div class="field-error" id="pw-err">${icon('circle-alert')}<span>主密码不正确，还可以再试 4 次</span></div>` : ''}</div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('lock-open')}解锁</button><p class="field-help">演示密码：<span class="mono">huhu-demo</span>，请勿输入真实凭据。</p></form></div></div>`;
    const list = DATA.vault.filter(v => v.cat === this.cat), cat = SAFE_CATS.find(c => c[0] === this.cat);
    const head = pageHead(cat[1], { sub: `${list.length} 项`, actions: h`<button class="btn btn-ghost" data-action="safe-quick-btn">${icon('zap', 'ico-sm')}<span class="hide-sm">快速取密</span></button><button class="btn btn-primary" data-action="safe-new">${icon('plus')}<span class="hide-sm">新建</span></button>` });
    if (!list.length) return h`${head}<div class="page-body"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon(cat[2], 'ico-lg')}</span><h2>还没有${cat[1]}</h2><p>条目使用主密码加密保存在 .huhu/safe/，不会出现在笔记搜索中。</p><div class="row"><button class="btn btn-primary" data-action="safe-new">${icon('plus')}新建${cat[1]}</button></div></div></div>`;
    return h`${head}<div class="page-toolbar"><div class="input-group search">${icon('search')}<input class="input" placeholder="搜索名称、用户名或网址" aria-label="搜索保险箱"></div></div><div class="page-body hu-scroll"><div class="list safe-list" role="list" style="padding:0 12px 24px">${list.map(v => h`<div class="list-row" role="listitem" tabindex="0" data-action="safe-open" data-id="${v.id}" aria-selected="${this.sel === v.id}"><span class="avatar avatar-sq">${v.title.slice(0, 1)}</span><div class="list-row-main"><span class="list-row-title truncate">${v.title}</span><span class="list-row-meta">${v.user}${v.url ? h`<span class="sep"></span>${v.url}` : ''}</span></div><span class="muted num" style="font-size:12px">${v.updated}</span><button class="btn btn-ghost btn-icon btn-sm row-actions" data-action="safe-copy" data-id="${v.id}" aria-label="复制 ${v.title} 的密码">${icon('copy', 'ico-sm')}</button></div>`)}</div></div>`;
  },
  detail() {
    if (!this.unlocked) return null; const v = DATA.vault.find(x => x.id === this.sel); if (!v) return null;
    const row = (label, value, { secret = false, mono = false } = {}) => h`<div class="secret-row"><span class="secret-label">${label}</span><span class="secret-val ${mono || secret ? 'mono' : ''}">${secret && !this.reveal ? '••••••••••••' : value}</span>${secret ? h`<button class="btn btn-ghost btn-icon btn-sm" data-action="safe-reveal" aria-label="${this.reveal ? '隐藏' : '显示'}${label}" aria-pressed="${this.reveal}">${icon(this.reveal ? 'eye-off' : 'eye', 'ico-sm')}</button>` : ''}<button class="btn btn-ghost btn-icon btn-sm" data-action="safe-copy" data-id="${v.id}" aria-label="复制${label}">${icon('copy', 'ico-sm')}</button></div>`;
    return h`<header class="detail-head"><span class="avatar avatar-sq">${v.title.slice(0, 1)}</span><h2 class="truncate" tabindex="-1">${v.title}</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="safe-close" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header>
    <div class="detail-body hu-scroll"><div class="secret-card">${row('用户名', v.user)}${row(v.cat === 'card' ? '卡号' : '密码', v.secret, { secret: true })}${v.url ? row('网址', v.url) : ''}</div>
    ${v.note ? h`<div class="section-title" style="margin-top:16px">备注</div><p class="fg2" style="font-size:13px">${v.note}</p>` : ''}
    <dl class="props" style="margin-top:16px"><div class="prop"><dt>修改</dt><dd>${v.updated}</dd></div><div class="prop"><dt>密码强度</dt><dd><span class="badge badge-success">强</span></dd></div><div class="prop"><dt>关联</dt><dd><button class="link-card" style="width:100%">${icon('user', 'ico-sm')}<span class="grow truncate">个人账号</span></button></dd></div></dl></div>
    <footer class="detail-foot"><button class="btn btn-secondary">${icon('pencil', 'ico-sm')}编辑</button><span class="spacer"></span><button class="btn btn-danger-ghost">${icon('trash-2', 'ico-sm')}删除</button></footer>`;
  },
  closeDetail() { const id = this.sel; this.sel = null; this.reveal = false; S.state = 'default'; renderMain(); renderDetail(); $(`[data-id="${id}"]`)?.focus(); },
  mount() {
    $('#unlock-form')?.addEventListener('submit', e => { e.preventDefault(); const pw = $('#safe-pw').value; if (pw === 'huhu-demo') { this.unlocked = true; S.state = 'default'; render(); toast('已解锁，4 分钟后自动锁定'); } else { S.state = 'error'; renderMain(); $('#safe-pw').focus(); } });
  },
  quick() {
    if (!this.unlocked) { toast('请先解锁保险箱', { kind: 'info' }); return; }
    let sel = 0, items = DATA.vault;
    openLayer({ kind: 'dialog', className: 'dialog-sm quick', label: '快速取密', content: h`<div class="cmd-input">${icon('key-round', 'ico-lg')}<input id="qp-q" placeholder="搜索并按回车复制密码" autocomplete="off" aria-label="搜索保险箱条目" role="combobox" aria-expanded="true" aria-controls="qp-list"></div><div class="cmd-list" id="qp-list" role="listbox"></div><div class="cmd-foot"><span><span class="kbd">↵</span>复制密码</span><span><span class="kbd">⇧↵</span>复制用户名</span><span>剪贴板 30 秒后清除</span></div>` });
    const draw = () => { const q = $('#qp-q').value.trim().toLowerCase(); items = DATA.vault.filter(v => !q || (v.title + v.user + v.url).toLowerCase().includes(q)); sel = Math.min(sel, Math.max(0, items.length - 1)); $('#qp-list').innerHTML = items.length ? items.map((v, i) => html(h`<button class="cmd-item" role="option" data-i="${i}" aria-selected="${i === sel}"><span class="avatar avatar-sq" style="width:22px;height:22px;font-size:11px">${v.title.slice(0, 1)}</span><span class="truncate">${v.title}</span><span class="hint">${v.user}</span></button>`)).join('') : html(h`<div class="empty" style="min-height:120px"><p>没有匹配的条目</p></div>`); };
    const pick = (i, user) => { const v = items[i]; if (!v) return; closeTop(true); toast(`已复制 ${v.title} 的${user ? '用户名' : '密码'}（模拟），30 秒后清除`); };
    $('#qp-q').addEventListener('input', () => { sel = 0; draw(); });
    $('#qp-q').addEventListener('keydown', e => { if (e.isComposing) return; if (e.key === 'ArrowDown') { sel = (sel + 1) % Math.max(1, items.length); draw(); e.preventDefault(); } if (e.key === 'ArrowUp') { sel = (sel - 1 + items.length) % Math.max(1, items.length); draw(); e.preventDefault(); } if (e.key === 'Enter') { pick(sel, e.shiftKey); e.preventDefault(); } });
    $('#qp-list').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) pick(+b.dataset.i); });
    draw();
  },
  actions: {
    'safe-open': (el, e) => { if (e.target.closest('[data-action="safe-copy"]')) return; const P = PAGES.safe; P.sel = el.dataset.id; P.reveal = false; S.state = 'detail'; $$('.safe-list .list-row').forEach(r => r.setAttribute('aria-selected', r.dataset.id === P.sel)); renderDetail(); },
    'safe-close': () => PAGES.safe.closeDetail(),
    'safe-cat': el => { const P = PAGES.safe; P.cat = el.dataset.id; P.sel = null; S.state = DATA.vault.some(v => v.cat === P.cat) ? 'default' : 'empty'; S.panelSheet = false; renderPanel(); renderMain(); renderDetail(); },
    'safe-lock': () => { const P = PAGES.safe; P.unlocked = false; P.sel = null; P.reveal = false; S.state = 'locked'; closeAll(); render(); toast('保险箱已锁定，内存中的明文已清除', { kind: 'info' }); },
    'safe-reveal': () => { PAGES.safe.reveal = !PAGES.safe.reveal; S.state = PAGES.safe.reveal ? 'revealed' : 'detail'; renderDetail(); $('[data-action="safe-reveal"]')?.focus(); },
    'safe-copy': el => { const v = DATA.vault.find(x => x.id === el.dataset.id); toast(`已复制 ${v.title}（模拟），30 秒后清除剪贴板`); },
    'safe-quick-btn': () => PAGES.safe.quick(),
    'safe-new': () => toast('新建条目表单与编辑表单相同（原型略）', { kind: 'info' }),
    'safe-pw-eye': el => { const i = $('#safe-pw'); i.type = i.type === 'password' ? 'text' : 'password'; el.setAttribute('aria-label', i.type === 'password' ? '显示密码' : '隐藏密码'); },
  },
};
