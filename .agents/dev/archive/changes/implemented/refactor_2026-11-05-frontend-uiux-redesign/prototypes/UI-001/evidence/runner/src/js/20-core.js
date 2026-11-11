/* ==========================================================================
   HUHU UI-001 prototype core. In-memory demo state only; nothing touches a
   real vault, process, network or system clipboard.
   ========================================================================== */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RAW = Symbol('raw');
const raw = s => ({ [RAW]: String(s) });
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function val(v) { if (v == null) return ''; if (v === false) return 'false'; if (Array.isArray(v)) return v.map(val).join(''); if (v && v[RAW] != null) return v[RAW]; return esc(v); }
function h(strings, ...vals) { let out = strings[0]; vals.forEach((v, i) => { out += val(v) + strings[i + 1]; }); return raw(out); }
const html = x => val(x);
function icon(name, cls = '') {
  const nodes = ICONS[name] || ICONS['circle'];
  return raw(`<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${nodes.map(n => `<${n}/>`).join('')}</svg>`);
}
const CHECK_SVG = raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>');
let uid = 0; const nextId = p => `${p}-${++uid}`;

/* ---------- Dates (local calendar days; never via UTC) ---------- */
const TODAY = new Date(2026, 10, 5);
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim()); if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3]; const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? dt : null;
}
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayDiff = (a, b) => Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(b.getFullYear(), b.getMonth(), b.getDate())) / 864e5);
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
function relDay(s) {
  const d = parseYmd(s); if (!d) return '';
  const n = dayDiff(d, TODAY);
  if (n === 0) return '今天'; if (n === 1) return '明天'; if (n === -1) return '昨天';
  if (n > 1 && n < 7) return WEEK[d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
const fmtLong = s => { const d = parseYmd(s); return d ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEK[d.getDay()]}` : ''; };

/* ---------- App state ---------- */
const PREF_KEY = 'huhu-ui001-prefs';
const S = {
  scene: 'workbench', page: 'home', state: 'default',
  theme: 'paper', mode: 'light', accent: 'teal', source: 'huhu', density: 'compact', uiSize: '14', motion: 'system', fontUi: 'geist',
  panelW: 272, panelSheet: false, detailOpen: false,
  width: 'wide', toasts: [],
};
try { Object.assign(S, JSON.parse(sessionStorage.getItem(PREF_KEY) || '{}')); } catch { /* prototype preference only */ }
function savePrefs() { try { const { theme, mode, accent, source, density, uiSize, motion, fontUi, panelW } = S; sessionStorage.setItem(PREF_KEY, JSON.stringify({ theme, mode, accent, source, density, uiSize, motion, fontUi, panelW })); } catch { /* ignore */ } }
function applyTheme() {
  const root = document.documentElement;
  const dark = S.mode === 'dark' || (S.mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  S.theme = dark ? 'ink' : 'paper';
  root.dataset.theme = S.theme; root.dataset.accent = S.accent; root.dataset.density = S.density; root.dataset.uiSize = S.uiSize;
  root.dataset.source = S.source; root.dataset.motion = S.motion === 'reduce' ? 'reduce' : 'system';
  root.style.setProperty('--hu-panel-w', `${S.panelW}px`);
  root.style.setProperty('--hu-font-ui', S.fontUi === 'system' ? '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif' : '');
  if (S.fontUi !== 'system') root.style.removeProperty('--hu-font-ui');
}

/* ---------- Pages registry ---------- */
const PAGES = {};
const RAIL = [
  ['home', '首页', 'house'], ['tasks', '任务', 'list-checks'], ['diary', '日记', 'notebook-pen'], ['archives', '档案', 'library'],
  ['automations', '自动化', 'workflow'], ['agent', '智能体', 'bot'], ['safe', '保险箱', 'lock-keyhole'], ['versioning', '版本', 'history'], ['health', '体检', 'heart-pulse'],
];
const RAIL_END = [['notifications', '通知', 'bell'], ['settings', '设置', 'settings']];
function page() { return PAGES[S.page]; }

/* ---------- Region rendering ---------- */
function setHTML(el, content) { if (typeof el === 'string') el = $(el); if (el) el.innerHTML = html(content); return el; }
function measure() {
  const w = window.innerWidth; S.width = w >= 960 ? 'wide' : w >= 600 ? 'medium' : 'narrow';
  const app = $('#app'); app.dataset.width = S.width;
  const mainW = w - (S.width === 'wide' ? 52 + (page()?.panel ? S.panelW : 0) : S.width === 'medium' ? 52 : 0);
  app.dataset.detailMode = mainW - 360 >= 640 ? 'inline' : 'sheet';
}
function render() {
  applyTheme(); measure();
  const p = page();
  $('#app').dataset.scene = S.scene;
  renderHostTabs(); renderStatus();
  const wb = $('#workbench');
  if (S.scene === 'notes') { setHTML(wb, PAGES.notes.scene()); PAGES.notes.mount?.(); syncProto(); return; }
  if (!$('#rail', wb)) setHTML(wb, h`<nav class="rail" id="rail" aria-label="HUHU 模块"></nav><aside class="panel" id="panel" aria-label="二级导航"></aside><main class="page" id="main" tabindex="-1"></main><aside class="detail" id="detail" aria-label="详情" hidden></aside><div class="scrim" id="scrim" hidden data-action="scrim"></div>`);
  renderRail(); renderPanel(); renderMain(); renderDetail();
  syncProto();
}
function renderRail() {
  const btn = ([id, label, ic]) => h`<button class="rail-btn" data-action="go" data-page="${id}" aria-label="${label}" data-tip="${label}" ${S.page === id ? raw('aria-current="page"') : ''}>${icon(ic)}${id === 'notifications' && DATA.unread() ? h`<span class="rail-badge">${DATA.unread()}</span>` : ''}${id === 'agent' ? raw('<span class="rail-dot" title="1 个会话等待回答"></span>') : ''}</button>`;
  setHTML('#rail', h`${RAIL.map(btn)}<div class="rail-end">${RAIL_END.map(btn)}</div>`);
}
function railInPanel() { return h`<div class="rail-in-panel" role="navigation" aria-label="模块">${[...RAIL, ...RAIL_END].map(([id, label, ic]) => h`<button class="rail-btn" data-action="go" data-page="${id}" aria-label="${label}" ${S.page === id ? raw('aria-current="page"') : ''}>${icon(ic)}</button>`)}</div>`; }
function renderPanel() {
  const p = page(), el = $('#panel');
  const content = p.panel ? p.panel() : null;
  const asSheet = S.width !== 'wide';
  const show = content && (!asSheet || S.panelSheet);
  el.hidden = !show;
  $('#scrim').hidden = !(asSheet && S.panelSheet) && !(S.detailOpen && $('#app').dataset.detailMode === 'sheet');
  if (!show) { el.innerHTML = ''; return; }
  setHTML(el, h`${railInPanel()}${content}${asSheet ? '' : raw('<div class="panel-resize" role="separator" aria-orientation="vertical" aria-label="调整二级栏宽度" tabindex="0" aria-valuemin="220" aria-valuemax="480" aria-valuenow="' + S.panelW + '"></div>')}`);
  p.mountPanel?.();
}
function panelToggle() { return page().panel ? h`<button class="btn btn-ghost btn-icon panel-toggle" data-action="toggle-panel" aria-label="打开导航" aria-expanded="${S.panelSheet}">${icon('panel-left')}</button>` : (S.width === 'narrow' ? h`<button class="btn btn-ghost btn-icon panel-toggle" data-action="toggle-panel" aria-label="打开导航" style="display:inline-flex">${icon('panel-left')}</button>` : ''); }
function renderMain() {
  const p = page(); const main = $('#main');
  main.dataset.page = S.page; main.dataset.state = S.state;
  setHTML(main, p.main());
  p.mount?.();
}
function renderDetail() {
  const p = page(), el = $('#detail');
  const content = p.detail ? p.detail() : null;
  S.detailOpen = !!content; el.hidden = !content;
  const sheet = $('#app').dataset.detailMode === 'sheet';
  $('#scrim').hidden = !(S.width !== 'wide' && S.panelSheet) && !(content && sheet);
  if (sheet && content) { el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); } else { el.removeAttribute('role'); el.removeAttribute('aria-modal'); }
  setHTML(el, content || '');
  p.mountDetail?.();
}
const pageHead = (title, { sub = '', actions = '', crumb = '' } = {}) => h`<header class="page-head">${panelToggle()}${crumb ? h`<div class="crumb">${crumb}</div>` : ''}<h1 id="page-title">${title}</h1>${sub ? h`<span class="sub">${sub}</span>` : ''}<div class="actions">${actions}</div></header>`;

/* ---------- Host chrome ---------- */
function renderHostTabs() {
  setHTML('#host-tabs', h`<div class="host-brand"><span class="logo">${icon('leaf')}</span><span>个人知识库</span></div>
  <button class="host-tab" role="tab" data-action="scene" data-scene="workbench" aria-selected="${S.scene === 'workbench'}">${icon('layout-grid')}<span>HUHU 工作台</span></button>
  <button class="host-tab" role="tab" data-action="scene" data-scene="notes" aria-selected="${S.scene === 'notes'}">${icon('file-text')}<span>产品周报.md</span></button>
  <div class="host-tools">
    <button class="btn btn-ghost btn-sm" data-action="cmd" aria-label="命令面板">${icon('search', 'ico-sm')}<span class="kbd">⌘K</span></button>
    <button class="btn btn-ghost btn-icon btn-sm" data-action="toggle-mode" aria-label="${S.theme === 'ink' ? '切换为浅色' : '切换为深色'}" data-tip="${S.theme === 'ink' ? '浅色' : '深色'}" data-tip-pos="bottom">${icon(S.theme === 'ink' ? 'sun' : 'moon', 'ico-sm')}</button>
    <button class="btn btn-ghost btn-sm" id="proto-btn" data-action="proto" aria-label="原型状态" aria-haspopup="dialog"><span class="proto-flag">原型</span></button>
  </div>`);
}
function renderStatus() {
  setHTML('#host-status', h`<span class="item left hide-narrow">${icon('leaf')}个人知识库</span>
  <button class="item hide-narrow" data-action="go" data-page="agent">${icon('bot')}Claude 34% · Codex 18%</button>
  <button class="item" data-action="go" data-page="automations">${icon('workflow')}3 项计划</button>
  <span class="item hide-narrow">${icon('git-commit-horizontal')}main · 3 待提交</span>
  <button class="item" data-action="go" data-page="notifications">${icon('bell')}${DATA.unread()} 未读</button>`);
}

/* ---------- Toast ---------- */
function toast(msg, { kind = 'success', action, onAction, duration = 4200 } = {}) {
  const id = nextId('t'); const wrap = $('#toasts');
  const el = document.createElement('div'); el.className = `toast toast-${kind}`; el.id = id; el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = html(h`${icon(kind === 'error' ? 'circle-alert' : kind === 'info' ? 'info' : 'circle-check')}<span class="toast-msg">${msg}</span>${action ? h`<button class="btn" data-toast-action>${action}</button>` : ''}<button class="btn btn-icon" aria-label="关闭通知" data-toast-close>${icon('x', 'ico-sm')}</button>`);
  wrap.appendChild(el);
  const close = () => el.remove();
  el.querySelector('[data-toast-close]').onclick = close;
  if (action) el.querySelector('[data-toast-action]').onclick = () => { close(); onAction?.(); };
  setTimeout(close, duration);
  return id;
}

/* ---------- Overlay stack: dialog / popover / command ---------- */
const layers = [];
function trapFocus(container, e) {
  const f = $$('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),a[href]', container).filter(x => x.offsetParent !== null || x === document.activeElement);
  if (!f.length) return; const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
}
function openLayer({ kind, content, anchor, className = '', onClose, label = '', modal = true, guard }) {
  const ret = document.activeElement;
  const host = document.createElement('div');
  let box;
  if (kind === 'dialog') {
    host.className = 'overlay'; host.innerHTML = html(h`<div class="dialog ${className}" role="dialog" aria-modal="true" aria-label="${label}">${content}</div>`);
    box = host.firstElementChild;
    host.addEventListener('mousedown', e => { if (e.target === host) closeTop(); });
  } else if (kind === 'popover') {
    host.className = `popover ${className}`; host.setAttribute('role', 'dialog'); host.setAttribute('aria-label', label); host.innerHTML = html(content); box = host;
  }
  document.body.appendChild(host);
  if (kind === 'popover' && anchor) placePopover(host, anchor);
  const layer = { kind, host, box, ret, onClose, modal, guard };
  layers.push(layer);
  requestAnimationFrame(() => { const t = box.querySelector('[autofocus],[data-autofocus]') || box.querySelector('input,select,textarea,button'); t?.focus(); });
  return layer;
}
function placePopover(el, anchor) {
  const r = anchor.getBoundingClientRect(); const w = el.offsetWidth, hgt = el.offsetHeight;
  let left = Math.min(Math.max(8, r.left), innerWidth - w - 8); let top = r.bottom + 6;
  if (top + hgt > innerHeight - 8) top = Math.max(8, r.top - hgt - 6);
  el.style.left = `${left}px`; el.style.top = `${top}px`;
}
function closeTop(force = false) {
  const l = layers[layers.length - 1]; if (!l) return false;
  if (!force && l.guard && l.guard() === false) return true;
  layers.pop(); l.host.remove(); l.onClose?.();
  if (l.ret && l.ret.isConnected) l.ret.focus();
  return true;
}
function closeAll() { while (layers.length) closeTop(true); }
function confirmDialog({ title, body, confirm = '确认', danger = false, onConfirm, cancel = '取消' }) {
  openLayer({ kind: 'dialog', className: 'dialog-sm', label: title, content: h`<div class="dialog-head">${danger ? h`<span class="dialog-danger-icon">${icon('triangle-alert')}</span>` : ''}<div><h2>${title}</h2><p>${body}</p></div></div>
    <div class="dialog-foot"><button class="btn btn-secondary" data-action="layer-close">${cancel}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="layer-confirm" data-autofocus>${confirm}</button></div>` });
  layers[layers.length - 1].onConfirm = onConfirm;
}
function menu(anchor, items, label = '更多操作') {
  const content = h`<div role="menu" aria-label="${label}">${items.map(it => it === '-' ? raw('<div class="menu-sep" role="separator"></div>') : h`<button class="menu-item ${it.danger ? 'danger' : ''}" role="menuitem" data-menu="${it.id}">${it.icon ? icon(it.icon) : ''}<span>${it.label}</span>${it.kbd ? h`<span class="kbd">${it.kbd}</span>` : ''}</button>`)}</div>`;
  const l = openLayer({ kind: 'popover', content, anchor, label });
  l.host.addEventListener('click', e => { const b = e.target.closest('[data-menu]'); if (!b) return; const it = items.find(x => x.id === b.dataset.menu); closeTop(true); it?.run?.(); });
  l.host.addEventListener('keydown', e => { if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return; const all = $$('[data-menu]', l.host); const i = all.indexOf(document.activeElement); all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length].focus(); e.preventDefault(); });
}

/* ---------- Command palette ---------- */
function openCommand() {
  if (layers.some(l => l.cmd)) return;
  const ret = document.activeElement;
  const host = document.createElement('div'); host.className = 'cmd-overlay';
  host.innerHTML = html(h`<div class="cmd" role="dialog" aria-modal="true" aria-label="命令面板"><div class="cmd-input">${icon('search', 'ico-lg')}<input id="cmd-q" placeholder="搜索页面、命令、档案与任务…" role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-autocomplete="list" autocomplete="off"><span class="kbd">Esc</span></div><div class="cmd-list" id="cmd-list" role="listbox"></div><div class="cmd-foot"><span><span class="kbd">↑</span><span class="kbd">↓</span>选择</span><span><span class="kbd">↵</span>打开</span><span><span class="kbd">Esc</span>关闭</span></div></div>`);
  document.body.appendChild(host);
  const layer = { kind: 'cmd', cmd: true, host, ret, box: host.firstElementChild };
  layers.push(layer);
  host.addEventListener('mousedown', e => { if (e.target === host) closeTop(); });
  const all = () => [
    ...[...RAIL, ...RAIL_END].map(([id, label, ic]) => ({ group: '前往', label, icon: ic, run: () => go(id) })),
    { group: '命令', label: '新建任务', icon: 'plus', hint: 'N', run: () => { go('tasks'); PAGES.tasks.newTask(); } },
    { group: '命令', label: '新建自动化', icon: 'workflow', run: () => { go('automations'); PAGES.automations.openNew(); } },
    { group: '命令', label: '快速取密', icon: 'key-round', hint: '⌘⇧P', run: () => { go('safe'); PAGES.safe.quick(); } },
    { group: '命令', label: '开始数据体检', icon: 'heart-pulse', run: () => { go('health'); PAGES.health.start(); } },
    { group: '命令', label: '切换浅色 / 深色', icon: 'moon', run: () => { S.mode = S.theme === 'ink' ? 'light' : 'dark'; savePrefs(); render(); } },
    { group: '命令', label: '外观设置', icon: 'palette', run: () => { go('settings'); } },
    ...DATA.tasks.slice(0, 6).map(t => ({ group: '任务', label: t.title, icon: t.done ? 'circle-check' : 'circle', run: () => { go('tasks'); PAGES.tasks.select(t.id); } })),
    ...DATA.records.slice(0, 8).map(r => ({ group: '档案', label: r.title, icon: DATA.typeOf(r.type).icon, hint: DATA.typeOf(r.type).name, run: () => { go('archives'); PAGES.archives.openRecord(r.id); } })),
  ];
  let sel = 0, items = [];
  const draw = () => {
    const q = $('#cmd-q').value.trim().toLowerCase();
    items = all().filter(x => !q || x.label.toLowerCase().includes(q) || (x.hint || '').toLowerCase().includes(q));
    sel = Math.min(sel, Math.max(0, items.length - 1));
    let g = '';
    $('#cmd-list').innerHTML = items.length ? items.map((x, i) => { const head = x.group !== g ? `<div class="cmd-group">${esc(x.group)}</div>` : ''; g = x.group; return head + html(h`<button class="cmd-item" role="option" id="cmd-opt-${i}" data-i="${i}" aria-selected="${i === sel}">${icon(x.icon)}<span class="truncate">${x.label}</span>${x.hint ? h`<span class="hint">${x.hint}</span>` : ''}</button>`); }).join('') : html(h`<div class="empty" style="min-height:160px"><p>没有匹配“${$('#cmd-q').value}”的结果</p></div>`);
    $('#cmd-q').setAttribute('aria-activedescendant', items.length ? `cmd-opt-${sel}` : '');
    $(`#cmd-opt-${sel}`)?.scrollIntoView({ block: 'nearest' });
  };
  const run = i => { const x = items[i]; if (!x) return; closeTop(true); x.run(); };
  $('#cmd-q').addEventListener('input', () => { sel = 0; draw(); });
  $('#cmd-q').addEventListener('keydown', e => {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown') { sel = (sel + 1) % Math.max(1, items.length); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = (sel - 1 + items.length) % Math.max(1, items.length); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') { run(sel); e.preventDefault(); }
  });
  $('#cmd-list').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) run(+b.dataset.i); });
  draw(); $('#cmd-q').focus();
}

/* ---------- DateField (spec: DayPicker v10 + Popover; prototype: Air Datepicker) ---------- */
const AIR_ZH = window.__airLocaleZh;
const pickers = new Set();
function dateField({ id, value = '', label = '日期', placeholder = '年-月-日', required = false, min = '', max = '', time = false, describedBy = '' }) {
  return h`<div class="datefield" data-datefield="${id}" data-min="${min}" data-max="${max}" data-time="${time ? '1' : ''}" data-required="${required ? '1' : ''}">${icon(time ? 'clock' : 'calendar')}
    <input class="input" id="${id}" value="${value}" placeholder="${time ? '年-月-日 时:分' : placeholder}" inputmode="numeric" autocomplete="off" aria-label="${label}" ${describedBy ? raw(`aria-describedby="${describedBy}"`) : ''} ${required ? raw('aria-required="true"') : ''}>
    <button type="button" class="df-clear" data-df-clear aria-label="清除${label}" ${value ? '' : raw('hidden')}>${icon('x', 'ico-sm')}</button></div>`;
}
function parseDateInput(s, time) {
  if (!time) return parseYmd(s);
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})$/.exec(String(s).trim()); if (!m) return null;
  const d = parseYmd(m[1]); const hh = +m[2], mm = +m[3]; if (!d || hh > 23 || mm > 59) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm);
}
const fmtDateInput = (d, time) => time ? `${ymd(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}` : ymd(d);
function mountDateFields(root = document, onChange = () => { }) {
  $$('[data-datefield]', root).forEach(wrap => {
    if (wrap.__dp) return;
    const input = wrap.querySelector('input'), clear = wrap.querySelector('[data-df-clear]');
    const time = !!wrap.dataset.time, min = parseYmd(wrap.dataset.min), max = parseYmd(wrap.dataset.max);
    const err = () => wrap.parentElement.querySelector('.field-error[data-for="' + input.id + '"]');
    const setError = msg => {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      let e = err();
      if (msg && !e) { e = document.createElement('div'); e.className = 'field-error'; e.dataset.for = input.id; e.id = input.id + '-err'; wrap.after(e); }
      if (e) { if (msg) { e.innerHTML = html(h`${icon('circle-alert')}<span>${msg}</span>`); input.setAttribute('aria-describedby', e.id); } else { e.remove(); input.removeAttribute('aria-describedby'); } }
    };
    const dp = new AirDatepicker(input, {
      locale: AIR_ZH, autoClose: !time, timepicker: time, dateFormat: 'yyyy-MM-dd', timeFormat: 'HH:mm', firstDay: 1,
      minDate: min || '', maxDate: max || '', classes: 'hu-dp', position: 'bottom left', keyboardNav: true, toggleSelected: false,
      buttons: [{ content: '今天', onClick: d => d.selectDate(TODAY) }, { content: '清除', onClick: d => { d.clear(); input.value = ''; commit(); d.hide(); } }],
      selectedDates: parseDateInput(input.value, time) ? [parseDateInput(input.value, time)] : [],
      onSelect: ({ date }) => { if (date) { input.value = fmtDateInput(date, time); commit(); } },
      onShow: () => { dp.$datepicker.classList.add('hu-dp'); },
    });
    let last = input.value.trim() || null;
    const emit = v => { if (v === last) return; last = v; onChange(input.id, v); };
    function commit() {
      if (!wrap.isConnected) return;
      const v = input.value.trim(); clear.hidden = !v;
      if (!v) { if (wrap.dataset.required) { setError('请填写日期'); return; } setError(''); emit(null); return; }
      const d = parseDateInput(v, time);
      if (!d) { setError(time ? '请输入有效日期时间，例如 2026-11-05 09:30' : '请输入有效日期，例如 2026-11-05'); return; }
      if (min && d < min) { setError(`不能早于 ${ymd(min)}`); return; }
      if (max && d > max) { setError(`不能晚于 ${ymd(max)}`); return; }
      setError(''); emit(fmtDateInput(d, time));
    }
    input.addEventListener('blur', () => setTimeout(() => { if (!dp.visible) commitTyped(); }, 120));
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { commitTyped(); if (dp.visible) dp.hide(); e.preventDefault(); } });
    // Esc closes only the calendar first; capture runs before Air and the page-level Esc handler.
    wrap.addEventListener('keydown', e => { if (e.key === 'Escape' && dp.visible) { dp.hide(); e.stopPropagation(); e.preventDefault(); } }, true);
    function commitTyped() { const d = parseDateInput(input.value, time); if (d) dp.selectDate(d, { silent: true }); commit(); }
    clear.addEventListener('click', () => { dp.clear({ silent: true }); input.value = ''; commit(); input.focus(); });
    wrap.__dp = dp; pickers.add(dp);
  });
}
function destroyPickers() { pickers.forEach(p => { try { if (!p.$el.isConnected) { p.destroy(); pickers.delete(p); } } catch { pickers.delete(p); } }); }
/* DateRangeField: one trigger, draft range, apply/cancel. */
function dateRangeTrigger(id, range) {
  const active = range.from || range.to;
  const label = active ? `${range.from ? relDay(range.from) : '…'} – ${range.to ? relDay(range.to) : '…'}` : '日期范围';
  return h`<span class="row" style="gap:2px"><button class="daterange" id="${id}" data-action="daterange" data-active="${!!active}" aria-haspopup="dialog" aria-label="日期范围：${active ? label : '未设置'}">${icon('calendar-days', 'ico-sm')}<span>${label}</span>${icon('chevron-down', 'ico-sm')}</button>${active ? h`<button class="btn btn-ghost btn-icon btn-sm" data-action="daterange-clear" aria-label="清除日期范围">${icon('x', 'ico-sm')}</button>` : ''}</span>`;
}
function openDateRange(anchor, range, onApply) {
  let draft = { ...range };
  const content = h`<div class="dr-pop"><div class="dr-presets">${[['今天', 0, 0], ['未来 7 天', 0, 6], ['本月', 'm'], ['过去 30 天', -29, 0]].map(([l, a, b]) => h`<button class="btn btn-secondary btn-sm" data-preset="${a}|${b ?? ''}">${l}</button>`)}</div>
    <div class="dr-fields"><input class="input input-sm" id="dr-from" placeholder="开始 年-月-日" value="${draft.from || ''}" aria-label="开始日期"><span class="muted">至</span><input class="input input-sm" id="dr-to" placeholder="结束 年-月-日" value="${draft.to || ''}" aria-label="结束日期"></div>
    <div class="dr-inline" id="dr-cal"></div><div class="field-error" id="dr-err" hidden></div>
    <div class="dr-foot"><button class="btn btn-ghost btn-sm" data-dr="clear">清除</button><span class="spacer"></span><button class="btn btn-secondary btn-sm" data-dr="cancel">取消</button><button class="btn btn-primary btn-sm" data-dr="apply">应用</button></div></div>`;
  const l = openLayer({ kind: 'popover', content, anchor, label: '选择日期范围' });
  const cal = new AirDatepicker($('#dr-cal', l.host), { inline: true, range: true, locale: AIR_ZH, firstDay: 1, classes: 'hu-dp', dynamicRange: true, toggleSelected: false,
    selectedDates: [parseYmd(draft.from), parseYmd(draft.to)].filter(Boolean),
    onSelect: ({ date }) => { const [a, b] = Array.isArray(date) ? date : [date]; draft = { from: a ? ymd(a) : null, to: b ? ymd(b) : null }; $('#dr-from', l.host).value = draft.from || ''; $('#dr-to', l.host).value = draft.to || ''; validate(); } });
  placePopover(l.host, anchor);
  const validate = () => {
    const f = $('#dr-from', l.host).value.trim(), t = $('#dr-to', l.host).value.trim(); const e = $('#dr-err', l.host);
    let msg = '';
    if (f && !parseYmd(f)) msg = '开始日期无效'; else if (t && !parseYmd(t)) msg = '结束日期无效'; else if (f && t && parseYmd(t) < parseYmd(f)) msg = '结束日期不能早于开始日期';
    e.hidden = !msg; e.innerHTML = msg ? html(h`${icon('circle-alert')}<span>${msg}</span>`) : '';
    $('[data-dr="apply"]', l.host).disabled = !!msg; draft = { from: f || null, to: t || null }; return !msg;
  };
  ['#dr-from', '#dr-to'].forEach(s => $(s, l.host).addEventListener('input', validate));
  l.host.addEventListener('click', e => {
    const p = e.target.closest('[data-preset]');
    if (p) { const [a, b] = p.dataset.preset.split('|'); let from, to; if (a === 'm') { from = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1); to = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0); } else { from = addDays(TODAY, +a); to = addDays(TODAY, +b); } cal.selectDate([from, to]); return; }
    const b = e.target.closest('[data-dr]'); if (!b) return;
    if (b.dataset.dr === 'cancel') closeTop(true);
    if (b.dataset.dr === 'clear') { closeTop(true); onApply({ from: null, to: null }); }
    if (b.dataset.dr === 'apply' && validate()) { closeTop(true); onApply(draft); }
  });
  l.onClose = () => cal.destroy();
}

/* ---------- Navigation ---------- */
function go(id, { state = null } = {}) {
  closeAll();
  if (S.page !== id) { PAGES[S.page]?.leave?.(); }
  S.scene = id === 'notes' ? 'notes' : 'workbench';
  if (id !== 'notes') S.page = id;
  S.panelSheet = false;
  const p = PAGES[id];
  S.state = state || p.states[0];
  p.enter?.(S.state);
  render(); destroyPickers();
  if (id !== 'notes') $('#main')?.focus({ preventScroll: true });
}
function setState(state) { const p = S.scene === 'notes' ? PAGES.notes : page(); S.state = state; p.applyState?.(state); render(); destroyPickers(); }

/* ---------- Prototype state controls (not product UI) ---------- */
function syncProto() {
  const pp = $('#page-picker'), sp = $('#state-picker'); if (!pp) return;
  const cur = S.scene === 'notes' ? 'notes' : S.page;
  pp.value = cur; const p = PAGES[cur];
  sp.innerHTML = p.states.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join(''); sp.value = S.state;
}
function buildProtoControls() {
  const box = document.createElement('div'); box.id = 'proto-controls'; box.hidden = true;
  box.innerHTML = html(h`<div class="field"><label class="field-label" for="page-picker">页面</label><select class="select" id="page-picker">${Object.entries(PAGES).map(([id, p]) => h`<option value="${id}">${p.title}（${id}）</option>`)}</select></div>
    <div class="field"><label class="field-label" for="state-picker">状态</label><select class="select" id="state-picker"></select></div>
    <div class="field"><label class="field-label" for="width-note">尺寸</label><p class="field-help" id="width-note">按所属叶子宽度重排：≥960 宽、600–959 中、&lt;600 窄。调整浏览器窗口宽度即可预览。</p></div>`);
  document.body.appendChild(box);
  $('#page-picker').addEventListener('change', e => go(e.target.value));
  $('#state-picker').addEventListener('change', e => setState(e.target.value));
}
function openProto(anchor) {
  const box = $('#proto-controls');
  const l = openLayer({ kind: 'popover', content: '', anchor, className: 'proto-pop', label: '原型状态', modal: false });
  box.hidden = false; l.host.appendChild(box); placePopover(l.host, anchor);
  l.onClose = () => { box.hidden = true; document.body.appendChild(box); };
}

/* ---------- Global events ---------- */
const ACTIONS = {
  go: el => go(el.dataset.page),
  scene: el => { if (el.dataset.scene === 'notes') { closeAll(); S.scene = 'notes'; S.state = PAGES.notes.states[0]; render(); } else go(S.page); },
  cmd: () => openCommand(),
  proto: el => openProto(el),
  'toggle-mode': () => { S.mode = S.theme === 'ink' ? 'light' : 'dark'; savePrefs(); render(); },
  'toggle-panel': () => { S.panelSheet = !S.panelSheet; renderPanel(); if (S.panelSheet) $('#panel button,#panel input')?.focus(); },
  scrim: () => { if (S.panelSheet) { S.panelSheet = false; renderPanel(); $('.panel-toggle')?.focus(); } else page().closeDetail?.(); },
  'layer-close': () => closeTop(),
  'layer-confirm': () => { const l = layers[layers.length - 1]; const fn = l?.onConfirm; closeTop(true); fn?.(); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el || el.disabled) return;
  const name = el.dataset.action;
  const fn = ACTIONS[name] || (S.scene === 'notes' ? PAGES.notes : page()).actions?.[name];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('keydown', e => {
  if (e.isComposing) return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); openCommand(); return; }
  if (mod && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); go('safe'); PAGES.safe.quick(); return; }
  if (e.key === 'Escape') {
    if (layers.length) { e.preventDefault(); closeTop(); return; }
    if (S.panelSheet) { S.panelSheet = false; renderPanel(); $('.panel-toggle')?.focus(); return; }
    if (S.detailOpen && page().closeDetail) { page().closeDetail(); return; }
  }
  if (e.key === 'Tab' && layers.length && layers[layers.length - 1].modal !== false) trapFocus(layers[layers.length - 1].box || layers[layers.length - 1].host, e);
  if (e.key === 'F6') { e.preventDefault(); const regions = ['#rail', '#panel:not([hidden])', '#main', '#detail:not([hidden])'].map(s => $(s)).filter(Boolean); const i = regions.findIndex(r => r.contains(document.activeElement)); const n = regions[(i + (e.shiftKey ? -1 : 1) + regions.length) % regions.length]; (n.querySelector('button,input,[tabindex="0"]') || n).focus(); }
});
/* Panel resize: drag, double-click reset, arrow keys step 8px */
document.addEventListener('pointerdown', e => {
  const hnd = e.target.closest('.panel-resize'); if (!hnd) return;
  e.preventDefault(); hnd.classList.add('dragging'); const x0 = e.clientX, w0 = S.panelW;
  const mv = ev => { S.panelW = Math.max(220, Math.min(480, w0 + ev.clientX - x0)); document.documentElement.style.setProperty('--hu-panel-w', S.panelW + 'px'); hnd.setAttribute('aria-valuenow', S.panelW); };
  const up = () => { hnd.classList.remove('dragging'); removeEventListener('pointermove', mv); removeEventListener('pointerup', up); savePrefs(); measure(); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
});
document.addEventListener('dblclick', e => { if (e.target.closest('.panel-resize')) { S.panelW = 272; savePrefs(); applyTheme(); } });
document.addEventListener('keydown', e => { const hnd = e.target.closest?.('.panel-resize'); if (!hnd || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return; S.panelW = Math.max(220, Math.min(480, S.panelW + (e.key === 'ArrowRight' ? 8 : -8))); hnd.setAttribute('aria-valuenow', S.panelW); applyTheme(); savePrefs(); e.preventDefault(); });
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const before = S.width + $('#app').dataset.detailMode; measure(); if (before !== S.width + $('#app').dataset.detailMode) render(); }, 60); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (S.mode === 'system') render(); });
