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
