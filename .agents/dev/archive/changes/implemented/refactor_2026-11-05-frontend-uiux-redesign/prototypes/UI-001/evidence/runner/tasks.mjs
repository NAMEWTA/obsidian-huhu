import { launch, pause } from './harness.mjs'; import { pathToFileURL } from 'node:url';
const [,, dir] = process.argv; const b = await launch(); const ev = b.ev; const log = []; let fail = 0;
const ok = (c, label) => { log.push((c ? 'PASS ' : 'FAIL ') + label); if (!c) fail++; };
const url = pathToFileURL(dir + '/index.html').href; await b.open(url, 1440);
const go = async (p, s) => { await b.choose('#page-picker', p); if (s) await b.choose('#state-picker', s); };
// 1. Task completion: strike-through on title+note, pending, filter removal, toast undo
await go('tasks', 'default'); await b.choose('#state-picker', 'default');
await b.click('[data-task-check="t1"]'); ok(await ev('!!document.querySelector(\'[data-task="t1"].is-pending\')'), 'task: pending state while saving');
await pause(800); ok(await ev('getComputedStyle(document.querySelector(\'[data-task="t1"] .task-title\')).textDecorationLine.includes("line-through") && getComputedStyle(document.querySelector(\'[data-task="t1"] .task-note\')).textDecorationLine.includes("line-through")'), 'task: title and note struck through');
ok(await ev('!getComputedStyle(document.querySelector(\'[data-task="t1"] .due\')).textDecorationLine.includes("line-through")'), 'task: due date not struck');
ok(await ev('document.querySelector(".toast")?.textContent.includes("已完成")'), 'task: completion toast with undo');
await pause(1600); ok(await ev('!document.querySelector(\'[data-task="t1"]\')'), 'task: leaves 未完成 filter after success');
await ev('document.querySelector(".toast [data-toast-action]")?.click()'); await pause(150); ok(await ev('!!document.querySelector(\'[data-task="t1"]\')'), 'task: undo restores');
await b.choose('#state-picker', 'failed'); await b.click('[data-task-check="t2"]'); await pause(900); ok(await ev('!document.querySelector(\'[data-task="t2"] input\').checked && document.querySelector(".toast-error")?.textContent.includes("已恢复")'), 'task: failed write restores and reports');
// Task detail + DateField strict validation
await b.choose('#state-picker', 'detail'); ok(await ev('!!document.querySelector("#detail:not([hidden]) #td-due")'), 'task: inspector opens');
await b.input('#td-due', '2026-02-31'); await ev('document.querySelector("#td-due").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))'); await pause(100);
ok(await ev('document.querySelector("#td-due").getAttribute("aria-invalid")==="true" && document.querySelector("#td-due").value==="2026-02-31"'), 'date: invalid 2026-02-31 kept as draft, not rolled to March');
ok(await ev('!!document.getElementById(document.querySelector("#td-due").getAttribute("aria-describedby"))'), 'date: error linked via aria-describedby');
await b.input('#td-due', '2026-11-20'); await ev('document.querySelector("#td-due").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))'); await pause(100);
ok(await ev('document.querySelector("#td-due").getAttribute("aria-invalid")==="false"'), 'date: valid date accepted');
await ev('document.querySelector("#td-due").blur()'); await pause(200); await b.tap('#td-due'); ok(await ev('!!document.querySelector(".air-datepicker.hu-dp.-active-")'), 'date: calendar popover opens on pointer focus');
  await b.tap('.hu-dp.-active- .air-datepicker-cell.-day-[data-date="12"][data-month="10"]'); ok(await ev('document.querySelector("#td-due").value==="2026-11-12" && !document.querySelector(".hu-dp.-active-")'), 'date: picking a day writes yyyy-MM-dd and closes');
await b.tap('#td-due'); await b.key('Escape'); ok(await ev('!document.querySelector(".hu-dp.-active-") && !document.querySelector("#detail").hidden'), 'date: Esc closes calendar only, inspector stays');
await b.click('[data-action="close-detail"]'); ok(await ev('document.querySelector("#detail").hidden && document.activeElement?.dataset.task==="t1"'), 'task: close detail returns focus to row');
// Date range: reversed range blocked
await b.click('#task-range'); await b.input('#dr-from', '2026-11-10'); await b.input('#dr-to', '2026-11-02'); ok(await ev('document.querySelector(\'[data-dr="apply"]\').disabled && !document.querySelector("#dr-err").hidden'), 'range: reversed range blocks apply'); await b.key('Escape');
// 2. Automations: list stays mounted, scroll kept, switch isolated, failure revert, Esc focus
await go('automations', 'default'); await b.size(1440, 420); await ev('document.querySelector("#auto-scroll").scrollTop=120');
await ev('window.__list=document.querySelector("#auto-list");window.__row=document.querySelector(\'[data-auto="a4"]\')');
await b.click('[data-auto="a4"]'); ok(await ev('document.querySelector("#auto-list")===window.__list && document.querySelector("#auto-scroll").scrollTop===120'), 'auto: list DOM kept and scroll preserved on open');
ok(await ev('document.querySelector("#detail:not([hidden]) h2")?.textContent.includes("月末账单")'), 'auto: inspector shows selected definition');
await b.click('[data-auto="a2"]'); ok(await ev('document.querySelector("#auto-list")===window.__list && document.querySelector("#detail h2").textContent.includes("周五")'), 'auto: switching selection only updates inspector');
await b.size(1440, 900);
await ev('document.querySelector(\'#auto-list [data-switch="a6"]\').click()'); await pause(50); ok(await ev('document.querySelector("#detail h2").textContent.includes("周五")'), 'auto: switch click does not open row');
ok(await ev('document.querySelector(\'#auto-list [data-switch="a6"]\').getAttribute("aria-busy")==="true"'), 'auto: switch pending blocks repeat'); await pause(800);
ok(await ev('document.querySelector(\'#auto-list [data-switch="a6"]\').getAttribute("aria-checked")==="true"'), 'auto: switch persists on success');
await b.choose('#state-picker', 'toggle-failed'); await ev('document.querySelector("#detail-switch").click()'); await pause(850);
ok(await ev('document.querySelector("#detail-switch").getAttribute("aria-checked")==="false" && document.querySelector(\'#auto-list [data-switch="a3"]\').getAttribute("aria-checked")==="false" && !!document.querySelector(".toast-error")'), 'auto: failed toggle restores list+detail and reports');
await ev('document.querySelector(\'[data-auto="a3"]\').focus()'); await b.key('Escape'); ok(await ev('document.querySelector("#detail").hidden && document.activeElement?.dataset.auto==="a3"'), 'auto: Esc closes inspector, focus to source row');
await b.choose('#state-picker', 'missing'); ok(await ev('document.querySelector("#detail").textContent.includes("不存在") && !!document.querySelector("#auto-list")'), 'auto: missing deep link keeps list');
// Space toggles switch via keyboard
await b.choose('#state-picker', 'default'); await ev('document.querySelector(\'#auto-list [data-switch="a1"]\').focus()'); await b.key(' '); await pause(850); ok(await ev('document.querySelector(\'#auto-list [data-switch="a1"]\').getAttribute("aria-checked")==="false"'), 'auto: Space toggles switch');
// 3. Archive tree: expand vs select, keyboard, search ancestors, restore
await go('archives', 'default'); await ev('document.querySelector("#tn-person").focus()'); await b.key('ArrowRight'); await pause(80);
ok(await ev('document.querySelector("#tn-person").getAttribute("aria-expanded")==="true" && document.querySelector("#tn-person").getAttribute("aria-selected")==="false"'), 'tree: ArrowRight expands without selecting');
await b.key('ArrowDown'); ok(await ev('document.activeElement.id==="tn-r-p1"'), 'tree: ArrowDown moves focus');
await b.key('Enter'); await pause(120); ok(await ev('document.querySelector("#main").dataset.state==="person" && document.querySelector("#tn-r-p1").getAttribute("aria-selected")==="true"'), 'tree: Enter opens record');
await ev('document.querySelector(\'[data-twist="item"]\').click()'); await pause(80); ok(await ev('document.querySelector("#tn-item").getAttribute("aria-expanded")==="true" && document.querySelector("#main").dataset.state==="person"'), 'tree: chevron expands only');
await b.input('#arch-q', '键盘'); ok(await ev('!!document.querySelector("#tn-item") && document.querySelector("#tn-r-i2 mark")?.textContent==="键盘" && !document.querySelector("#tn-person")'), 'tree: search keeps ancestors and highlights');
await b.input('#arch-q', ''); ok(await ev('document.querySelector("#tn-person").getAttribute("aria-expanded")==="true" && document.querySelector("#tn-book").getAttribute("aria-expanded")==="true"'), 'tree: clearing search restores manual expansion');
await go('archives', 'record'); await b.input('#f-作者', '原研哉 (修订)'); ok(await ev('!!document.querySelector(".dirty-bar") && document.activeElement.id==="f-作者"'), 'record: edit shows unsaved bar without losing focus');
await ev('document.querySelector("#tn-r-b2")?.click() || document.querySelector(\'[data-node="r-b2"]\')?.click()'); await pause(100); ok(await ev('!!document.querySelector(".overlay .dialog") '), 'record: leaving dirty record asks to discard'); await b.key('Escape');
// 4. Settings: live theme
await go('settings', 'appearance'); await b.click('[data-k="accent"][data-v="plum"]'); ok(await ev('document.documentElement.dataset.accent==="plum" && getComputedStyle(document.documentElement).getPropertyValue("--hu-accent").trim()==="#764689"'), 'settings: accent applies live');
await b.click('[data-k="mode"][data-v="dark"]'); ok(await ev('document.documentElement.dataset.theme==="ink"'), 'settings: dark mode applies'); await b.click('[data-k="accent"][data-v="teal"]'); await b.click('[data-k="mode"][data-v="light"]');
await b.click('[data-k="density"][data-v="comfortable"]'); ok(await ev('getComputedStyle(document.documentElement).getPropertyValue("--hu-ctl-h").trim()==="36px"'), 'settings: density comfortable'); await b.click('[data-k="density"][data-v="compact"]');
// 5. Global: command palette, IME, focus trap, F6
await ev('document.dispatchEvent(new KeyboardEvent("keydown",{key:"k",ctrlKey:true,bubbles:true}))'); await pause(100); ok(await ev('document.activeElement.id==="cmd-q"'), 'cmd: Ctrl+K opens palette focused');
await b.input('#cmd-q', '自动化'); await ev('document.querySelector("#cmd-q").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",isComposing:true,bubbles:true}))'); await pause(80); ok(await ev('!!document.querySelector(".cmd-overlay")'), 'cmd: IME Enter does not run');
await b.key('Enter'); await pause(150); ok(await ev('document.querySelector("#main").dataset.page==="automations" && !document.querySelector(".cmd-overlay")'), 'cmd: Enter navigates');
await go('tasks', 'default'); await b.click('[data-action="new-task"]'); await b.key('Tab'); await b.key('Tab'); await b.key('Tab'); await b.key('Tab'); await b.key('Tab'); await b.key('Tab'); await b.key('Tab'); await b.key('Tab'); await b.key('Tab');
ok(await ev('!!document.activeElement.closest(".dialog")'), 'dialog: focus trapped'); await ev('document.querySelector("#nt-form").requestSubmit()'); await pause(80); ok(await ev('document.querySelector("#nt-title").getAttribute("aria-invalid")==="true"'), 'dialog: empty title shows field error');
await b.input('#nt-title', '测试'); await b.key('Escape'); await pause(80); ok(await ev('document.querySelectorAll(".overlay").length===2'), 'dialog: dirty Esc asks to discard'); await b.key('Escape'); await b.key('Escape'); await pause(50); await ev('document.querySelectorAll(".overlay").forEach(e=>e.remove())');
// Safe
await go('safe', 'locked'); await b.input('#safe-pw', 'wrong'); await ev('document.querySelector("#unlock-form").requestSubmit()'); await pause(100); ok(await ev('document.querySelector("#main").dataset.state==="error"'), 'safe: wrong password error'); await b.input('#safe-pw', 'huhu-demo'); await ev('document.querySelector("#unlock-form").requestSubmit()'); await pause(150); ok(await ev('document.querySelector("#main").dataset.state==="default"'), 'safe: demo password unlocks');
await b.click('[data-action="safe-lock"]'); ok(await ev('document.querySelector("#main").dataset.state==="locked" && !document.querySelector(".secret-val")'), 'safe: lock clears revealed content');
// Health
await go('health', 'idle'); await b.click('[data-action="hc-start"]'); await pause(400); ok(await ev('document.querySelector("#main").dataset.state==="scanning"'), 'health: scanning'); await b.click('[data-action="hc-cancel"]'); ok(await ev('document.querySelector("#main").dataset.state==="cancelled"'), 'health: cancel keeps partial results');
// Narrow: panel sheet and detail sheet
await b.size(390, 860); await go('archives', 'default'); ok(await ev('document.querySelector("#panel").hidden'), 'narrow: panel hidden by default'); await b.click('.panel-toggle'); ok(await ev('!document.querySelector("#panel").hidden && !document.querySelector("#scrim").hidden'), 'narrow: panel opens as sheet'); await b.key('Escape'); ok(await ev('document.querySelector("#panel").hidden && document.activeElement.classList.contains("panel-toggle")'), 'narrow: Esc closes sheet, focus returns');
await go('automations', 'detail'); ok(await ev('document.querySelector("#app").dataset.detailMode==="sheet" && document.querySelector("#detail").getAttribute("role")==="dialog"'), 'narrow: detail becomes modal sheet');
await b.size(1100, 860); await go('tasks', 'detail'); ok(await ev('document.querySelector("#app").dataset.detailMode==="sheet"'), 'mid: 1100px with panel, main-detail<640 uses sheet'); await go('automations', 'detail'); ok(await ev('document.querySelector("#app").dataset.detailMode==="inline"'), 'mid: 1100px without panel keeps inline');
await b.size(1440, 900); await go('automations', 'detail'); ok(await ev('document.querySelector("#app").dataset.detailMode==="inline"'), 'wide: inline inspector');
// Notes scene
await go('notes', 'default'); ok(await ev('!!document.querySelector(".notes-scene .leaf-left") && !!document.querySelector(".comment")'), 'notes: host leaves with comments');
console.log(log.join('\n')); console.log('errors', JSON.stringify(b.errors)); console.log('FAILED', fail); await b.close(); process.exit(fail ? 1 : 0);
