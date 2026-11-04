/* Shared fixture for the three candidate pages and the comparison index.
 * Same task and fictional data in every candidate; only structure and visual language differ.
 * Mock only: no network, no persistence. */
(function () {
  'use strict';
  var D = {
    zh: {
      title: '自动化', sub: '同一任务：420px 窄容器里的长名称、启停、运行、编辑，以及运行完成通知（名称快照）。',
      search: '搜索自动化', filter: '筛选', add: '新建', run: '运行', edit: '编辑', more: '更多', on: '已启用', off: '已停用',
      ok: '成功', fail: '失败', never: '从未运行', sched: '定时 · 每天 08:00', file: '文件变更', manual: '手动', untitled: '未命名自动化',
      n2: '每日闪念整理', n1: 'Daily digest: summarize the inbox and weekly review notes into the journal', n4: 'Backup vault snapshots to the external drive every Sunday night',
      n5: 'Sync-reading-list-to-the-RSS-collection-and-notify-when-new-items-arrive-from-the-folder-Reading-2026-Q4-unbroken-token',
      ago12: '12 分钟前', ago95: '2 小时前', ago25: '25 小时前', notiH: '通知', notiMain: 'Daily digest: summarize the inbox and weekly review notes into the journal · 成功',
      notiSnap: '运行时名称', notiNow: '当前名称', notiNowV: '每日摘要（已改名）', notiId: 'ID', copy: '复制 ID', notiNote: '主文案是那一次运行时的名称快照；详情按稳定 ID 显示现名。',
      lang: '语言', theme: '主题', light: '亮', dark: '暗', back: '返回比较页', trigger: '触发', last: '上次运行', state: '状态', name: '名称', actions: '操作', inspector: '检查器', expand: '展开', full: '完整名称',
      cand: '候选'
    },
    en: {
      title: 'Automations', sub: 'Same task: long names, enable, run and edit in a 420px container, plus a run-complete notification (name snapshot).',
      search: 'Search automations', filter: 'Filter', add: 'New', run: 'Run', edit: 'Edit', more: 'More', on: 'Enabled', off: 'Disabled',
      ok: 'Succeeded', fail: 'Failed', never: 'Never ran', sched: 'Schedule · daily 08:00', file: 'File change', manual: 'Manual', untitled: 'Untitled automation',
      n2: 'Flash note sorting', n1: 'Daily digest: summarize the inbox and weekly review notes into the journal', n4: 'Backup vault snapshots to the external drive every Sunday night',
      n5: 'Sync-reading-list-to-the-RSS-collection-and-notify-when-new-items-arrive-from-the-folder-Reading-2026-Q4-unbroken-token',
      ago12: '12 min ago', ago95: '2 h ago', ago25: '25 h ago', notiH: 'Notifications', notiMain: 'Daily digest: summarize the inbox and weekly review notes into the journal · succeeded',
      notiSnap: 'Name at run time', notiNow: 'Current name', notiNowV: 'Daily digest (renamed)', notiId: 'ID', copy: 'Copy ID', notiNote: 'The headline keeps the name at that run; details resolve the current name by stable ID.',
      lang: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark', back: 'Back to comparison', trigger: 'Trigger', last: 'Last run', state: 'State', name: 'Name', actions: 'Actions', inspector: 'Inspector', expand: 'Expand', full: 'Full name',
      cand: 'Candidate'
    }
  };
  var lang = 'zh', theme = 'light';
  var q = new URLSearchParams(location.search);
  if (q.get('lang') === 'en') lang = 'en';
  if (q.get('theme') === 'dark') theme = 'dark';
  function apply() {
    var root = document.documentElement;
    root.lang = lang === 'zh' ? 'zh-CN' : 'en'; root.dataset.theme = theme;
    document.querySelectorAll('[data-i18n]').forEach(function (e) { e.textContent = D[lang][e.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (e) { e.setAttribute('aria-label', D[lang][e.dataset.i18nAria] + (e.dataset.for ? ' ' + D[lang][e.dataset.for] : '')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (e) { e.placeholder = D[lang][e.dataset.i18nPh]; });
    document.querySelectorAll('[data-ctl="lang"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === lang)); });
    document.querySelectorAll('[data-ctl="theme"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === theme)); });
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-ctl]');
    if (c) { if (c.dataset.ctl === 'lang') lang = c.dataset.v; else theme = c.dataset.v; apply(); return; }
    var s = e.target.closest('[data-switch]');
    if (s) { var on = s.getAttribute('aria-checked') !== 'true'; s.setAttribute('aria-checked', String(on)); return; }
    var r = e.target.closest('[data-run]');
    if (r && r.getAttribute('aria-busy') !== 'true') { r.setAttribute('aria-busy', 'true'); setTimeout(function () { r.removeAttribute('aria-busy'); }, 900); }
  });
  document.addEventListener('keydown', function (e) {
    var s = e.target.closest && e.target.closest('[data-switch]');
    if (s && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); s.click(); }
  });
  apply();
})();
