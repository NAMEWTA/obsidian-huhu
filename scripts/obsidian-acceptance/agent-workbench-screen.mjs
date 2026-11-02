/** Real Chrome probe of production Session, parsed projection and TerminalView.
 * Runs with installed exact dependencies, without Obsidian, helper or provider E2E.
 * Usage: node scripts/obsidian-acceptance/agent-workbench-screen.mjs /tmp/unique-run-directory
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = path.resolve(process.argv[2] || `/tmp/huhu-screen-${Date.now()}`);
if (!directory.startsWith('/tmp/')) throw new Error('Evidence directory must be under /tmp');
await fs.mkdir(directory); // Never overwrite a previous red or green run.
const started = new Date().toISOString(), consoleEvents = [], commands = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let browser, connection, server, stderr;
let exitCode = 2;

async function browserFixture() {
 const checks = [], errors = [], resources = [];
 const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
 const raf = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
 const assert = (value, message, detail) => { if (!value) throw new Error(message + ' ' + JSON.stringify(detail ?? {})); };
 const check = async (name, run) => { const start = performance.now(); try { const detail = await run(); checks.push({ name, ok: true, detail, durationMs: performance.now() - start }); } catch (error) { checks.push({ name, ok: false, error: String(error), stack: error.stack }); } document.querySelector('#results').textContent = JSON.stringify(checks, null, 2); };
 const renderState = terminal => {
  const render = terminal._core._renderService, handler = render._syncOutputHandler, rect = terminal.element.getBoundingClientRect();
  return { paused: render._isPaused, timeout: handler._timeout ?? null, buffering: handler._isBuffering, mode: terminal.modes.synchronizedOutputMode, top: rect.top, bottom: rect.bottom, viewportHeight: innerHeight };
 };
 const until = async (predicate, deadline, message, detail) => {
  while (!predicate()) {
   assert(performance.now() < deadline, message, { deadline, observedAt: performance.now(), ...detail() });
   await raf();
  }
  const observedAt = performance.now();
  assert(observedAt <= deadline, message, { deadline, observedAt, ...detail() });
  return observedAt;
 };
 const visibilityReady = async (terminals, visible) => {
  const startedAt = performance.now(), deadline = startedAt + 2000, entries = new Map();
  const elements = terminals.map(terminal => terminal.element.querySelector('.xterm-screen'));
  const observer = new IntersectionObserver(changes => {
   for (const entry of changes) entries.set(entry.target, { intersecting: entry.isIntersecting, top: entry.boundingClientRect.top, bottom: entry.boundingClientRect.bottom, at: performance.now() });
  }, { threshold: 0 });
  elements.forEach(element => observer.observe(element));
  try {
   const observedAt = await until(() => elements.every(element => entries.get(element)?.intersecting === visible) && terminals.every(terminal => renderState(terminal).paused === !visible), deadline, 'renderer visibility did not become ready', () => ({ visible, entries: [...entries.values()], states: terminals.map(renderState) }));
   return { startedAt, deadline, observedAt, entries: elements.map(element => entries.get(element)), states: terminals.map(renderState) };
  } finally { observer.disconnect(); }
 };
 registerMessages(messages); setLanguage('en');
 Object.defineProperties(HTMLElement.prototype, {
  win: { configurable: true, get() { return this.ownerDocument.defaultView; } },
  createDiv: { configurable: true, value(options = {}) { const div = this.ownerDocument.createElement('div'); div.className = options.cls || ''; this.append(div); return div; } },
  toggleClass: { configurable: true, value(name, enabled) { this.classList.toggle(name, enabled); } },
 });
 let sequence = 0;
 function session(options = {}) {
  const inputs = [], replies = [], sizes = [], acknowledgements = [];
  const s = new TerminalSession({ id: 'browser-' + ++sequence, sid: sequence, kind: 'shell', title: 'Fixture', cwd: '/fixture', cols: 20, rows: 4, scrollback: 20, platform: 'linux', colors: () => ({ foreground: '#cccccc', background: '#111111', cursor: '#ffffff' }), ...options });
  const port = { input: (_, data) => inputs.push(typeof data === 'string' ? data : [...data]), reply: (_, data) => replies.push(data), resize: (_, cols, rows) => sizes.push({ cols, rows }), acknowledge: (_, bytes) => acknowledgements.push(bytes), end() {} };
  s.attach(port, 42); resources.push(() => s.dispose());
  return { s, inputs, replies, sizes, port, acknowledgements, async feed(data) { s.receive(typeof data === 'string' ? new TextEncoder().encode(data) : data); await s.whenParsed(); await Promise.resolve(); }, async source(buffer = 'normal') { const r = await s.readScreen({ expectedRuntimeId: s.id, buffer, maxRows: 200 }); assert(r.status === 'ok', 'source unavailable', r); return r.text; } };
 }
 function display(f, transform) {
  const el = document.createElement('div'); el.className = 'fixture-terminal'; document.querySelector('#terms').append(el);
  const terminal = new Terminal({ cols: f.s.cols, rows: f.s.rows, scrollback: 20, allowProposedApi: true, fontSize: 14, cursorBlink: false });
  const search = new SearchAddon(); terminal.loadAddon(search); terminal.open(el);
  const target = new XtermScreenTarget(terminal, search, f.s.getScreenProfile());
  const frames = [], presentation = new TerminalPresentation({ open: (options, sink) => f.s.openScreen(options, frame => { frame = transform?.(frame) ?? frame; frames.push(frame.kind); sink(frame); }), installSnapshot: s => target.installSnapshot(s), applyPatch: p => target.applyPatch(p), error: error => errors.push(String(error)) }, f.s.getScreenProfile());
  presentation.setVisible(true);
  const value = { terminal, target, search, presentation, frames, el, text(buffer = 'normal') { const b = buffer === 'normal' ? terminal.buffer.normal : terminal.buffer.alternate; return Array.from({ length: b.length }, (_, row) => b.getLine(row).translateToString(true)).join('\n'); }, dispose() { presentation.dispose(); target.dispose(); terminal.dispose(); el.remove(); } };
  resources.push(() => value.dispose()); return value;
 }
 const equivalent = async (f, ...targets) => { await Promise.resolve(); for (const name of ['normal', 'alternate']) { const source = await f.source(name); for (const target of targets) assert(target.text(name) === source, 'projected text differs', { name, source, target: target.text(name), mark: target.target.watermark }); } };
 await check('incomplete-CSI-UTF8-OSC-DCS-join-two-production-targets-and-one-reply', async () => {
  const f = session(); await f.feed('before\x1b['); const a = display(f), b = display(f); await f.feed('31mAFTER'); await equivalent(f, a, b);
  assert(a.terminal.buffer.normal.getLine(0).getCell(6).getFgColor() === 1, 'SGR attrs lost');
  await f.feed(new Uint8Array([0xe4, 0xb8])); a.presentation.setVisible(false); a.presentation.setVisible(true); await f.feed(new Uint8Array([0xad])); await equivalent(f, a, b);
  await f.feed('\x1b]8;;https://split.example/'); a.presentation.setVisible(false); a.presentation.setVisible(true); await f.feed('link\x07LINK\x1b]8;;\x07'); await equivalent(f, a, b);
  await f.feed('\x1bP$q'); a.presentation.setVisible(false); a.presentation.setVisible(true); const count = f.replies.length; await f.feed('m\x1b\\\x1b[6n'); await equivalent(f, a, b);
  assert(f.replies.length - count === 2, 'device replies duplicated', f.replies); return { replies: f.replies, marks: [a.target.watermark, b.target.watermark], frames: a.frames };
 });
 await check('structure-reflow-alt-reset-clear-savedcursor-charset', async () => {
  const f = session(), a = display(f), b = display(f);
  for (const raw of ['one\r\ntwo\r\nthree\r\nfour\r\nfive', '\x1b[2;1H\x1b[LINSERT\x1b[M', '\x1b7\x1b[H\x1b(0lqk\x1b(B\x1b8X', '\x1b[?1049hALT', '\x1b[?1049l']) { await f.feed(raw); await equivalent(f, a, b); }
  const lease = f.s.registerView('owner'); f.s.setViewVisible(lease, true); f.s.setViewFocused(lease, true);
  const result = await f.s.requestViewSize(lease, { cols: 12, rows: 3 }); await equivalent(f, a, b); assert(result.status === 'accepted' && a.terminal.cols === 12 && b.terminal.rows === 3, 'authoritative resize missing', result);
  f.s.clearScrollback(); await f.s.whenParsed(); await equivalent(f, a, b); f.s.reset(); await f.s.whenParsed(); await equivalent(f, a, b); f.s.unregisterView(lease); return { result, sizes: f.sizes, geometry: [a.terminal.cols, a.terminal.rows] };
 });
 await check('OSC8-two-buffer-owned-markers-resize-trim-reset-dispose', async () => {
  const f = session(), a = display(f);
  await f.feed('\x1b]8;;https://normal.example\x07NORMAL\x1b]8;;\x07\x1b[?1049h\x1b[H\x1b]8;;https://alt.example\x07ALT\x1b]8;;\x07');
  const c = a.terminal._core, registry = c._oscLinkService;
  const uri = name => { const b = name === 'normal' ? a.terminal.buffer.normal : a.terminal.buffer.alternate; const cell = b.getLine(0).getCell(0); return registry.getLinkData(cell.extended.urlId)?.uri; };
  assert(uri('normal') === 'https://normal.example' && uri('alternate') === 'https://alt.example', 'OSC8 URI/context mismatch', { normal: uri('normal'), alternate: uri('alternate') });
  assert(c.buffers.active === c.buffers.alt, 'link context leaked');
  const foreign = c.buffers.normal.addMarker(1);
  await f.feed('\x1b[?1049l'); assert(registry._dataByLinkId.size === 1 && !foreign.isDisposed, 'switch cleared wrong markers');
  await f.feed('\x1b[4;1H\x1b]8;;https://bottom.example\x07BOTTOM\x1b]8;;\x07\x1b[H');
  const lease = f.s.registerView('links-owner'); f.s.setViewVisible(lease, true); f.s.setViewFocused(lease, true); await f.s.requestViewSize(lease, { cols: 20, rows: 2 });
  assert([...registry._dataByLinkId.values()].every(e => e.lines.every(m => !m.isDisposed && m.line < c.buffers.normal.lines.length)), 'resize retained orphan marker');assert(!foreign.isDisposed,'resize replacement disposed a retained foreign marker');
  await f.feed('\r\n'.repeat(28)); assert(registry._dataByLinkId.size === 0, 'trim leaked entries');
  await f.feed('\x1b]8;;https://reset.example\x07R\x1b]8;;\x07'); f.s.reset(); await f.s.whenParsed(); assert(registry._dataByLinkId.size === 0, 'reset leaked own links');
  const ownFree = c.buffers.normal.addMarker(0); await f.feed('\x1b]8;;https://dispose.example\x07D\x1b]8;;\x07'); a.target.dispose(); assert(registry._dataByLinkId.size === 0 && !ownFree.isDisposed, 'dispose destroyed foreign marker'); f.s.unregisterView(lease);
  return { registryAfterDispose: registry._dataByLinkId.size, foreignAfterDispose: !ownFree.isDisposed };
 });
 await check('real-Search-cache-selection-local-scroll-no-fake-LF-extended-colors', async () => {
  const f = session(), a = display(f); await f.feed('ALPHA\r\nBETA'); await raf();
  assert(a.search.findNext('ALPHA'), 'search baseline'); let lf = 0; a.terminal.onLineFeed(() => lf++);
  a.terminal.select(0, 1, 4); await f.feed('\x1b[HOMEGA'); assert(a.search.findNext('OMEGA') && !a.search.findNext('ALPHA'), 'Search retained old cache');
  a.terminal.select(0, 1, 4); await f.feed('\x1b[1;10HX'); assert(a.terminal.getSelection() === 'BETA', 'ordinary patch cleared selection');
  await f.feed('\x1b[?1000h'); a.terminal.select(0, 1, 4); await f.feed('Y'); assert(a.terminal.getSelection() === 'BETA', 'same mouse protocol cleared selection');
  await f.feed('\x1b[?1000l\x1b[38;2;1;2;3;48;2;4;5;6;4:3;58:2::7:8:9mZ'); const row = a.terminal.buffer.normal.getLine(a.terminal.buffer.normal.cursorY), cell = row.getCell(a.terminal.buffer.normal.cursorX - 1);
  assert(cell.getFgColor() === 0x010203 && cell.getBgColor() === 0x040506 && cell.extended.underlineStyle === 3 && cell.extended.underlineColor === (0x03000000 | 0x070809), 'extended attributes lost', { fg: cell.getFgColor(), bg: cell.getBgColor(), extended: cell.extended });
  await f.feed('\r\n'.repeat(7)); a.terminal.scrollToTop(); const scroll = a.terminal.buffer.normal.viewportY; await f.feed('tail'); assert(a.terminal.buffer.normal.viewportY === scroll, 'local scroll lost'); assert(lf === 0, 'fake LF emitted'); return { lf, scroll, colors: [cell.getFgColor(), cell.getBgColor()], selectionPreserved: true };
 });
 await check('cursor-blink-12h-l-DECSCUSR-override-zero-restores-view-defaults', async () => {
  const f=session(),a=display(f),el=document.createElement('div');el.className='fixture-terminal';document.querySelector('#terms').append(el);const stock=new Terminal({cols:20,rows:4,allowProposedApi:true,cursorStyle:'underline',cursorBlink:true,fontSize:14});stock.open(el);resources.push(()=>{stock.dispose();el.remove()});a.terminal.options.cursorStyle='underline';a.terminal.options.cursorBlink=true;a.target.updateAppearance();
  const effective=t=>({style:t._core.coreService.decPrivateModes.cursorStyle??t.options.cursorStyle,blink:t._core.coreService.decPrivateModes.cursorBlink??t.options.cursorBlink});const rows=[];
  for(const raw of ['\x1b[?12l','\x1b[?12h','\x1b[5 q','\x1b[6 q','\x1b[0 q','\x1b[?12l','\x1b[2 q','\x1b[0 q']){await f.feed(raw);await new Promise(resolve=>stock.write(raw,resolve));await raf();const target=effective(a.terminal),baseline=effective(stock);rows.push({raw,target,baseline});assert(JSON.stringify(target)===JSON.stringify(baseline),'application cursor style/blink differs from stock',rows)}return rows;
 });
 await check('2026-real-render-timeout-same-token-and-resync', async () => {
  const f = session(), a = display(f); await raf(); await f.feed('\x1b[?2026h'); await raf();
  const c = a.terminal._core, first = c._renderService._syncOutputHandler._timeout; assert(first !== undefined, 'sync timeout absent');
  await sleep(350); await f.feed('ordinary'); const second = c._renderService._syncOutputHandler._timeout; assert(first === second, 'ordinary patch restarted sync timer');
  await sleep(800); assert(!c.coreService.decPrivateModes.synchronizedOutput, 'local sync timer not expired'); a.presentation.setVisible(false); a.presentation.setVisible(true); await Promise.resolve(); await raf();
  assert(!c.coreService.decPrivateModes.synchronizedOutput && c._renderService._syncOutputHandler._timeout === undefined, 'same-token resync restarted timeout');
  await f.feed('\x1b[?2026l\x1b[?2026h'); await raf(); assert(c._renderService._syncOutputHandler._timeout !== undefined, 'new enable did not start timer'); await f.feed('\x1b[?2026l'); await raf(); assert(c._renderService._syncOutputHandler._timeout === undefined, 'disable did not flush'); return { first, second, sameTokenResyncExpired: true };
 });
 await check('RIS-stock-selection-sync-normal-alt-raw-fragmented-menu', async () => {
  const cases = [];
  for (const buffer of ['normal', 'alternate']) for (const route of ['raw', 'fragmented', 'menu']) {
   const f = session(), a = display(f), el = document.createElement('div');
   el.className = 'fixture-terminal'; document.querySelector('#terms').append(el);
   const stock = new Terminal({ cols: 20, rows: 4, allowProposedApi: true, fontSize: 14, cursorBlink: false });
   stock.open(el); resources.push(() => { stock.dispose(); el.remove(); });
   const feed = async raw => { await f.feed(raw); await new Promise(resolve => stock.write(raw, resolve)); };
   el.scrollIntoView({ block: 'center' });
   const visibility = await visibilityReady([a.terminal, stock], true);
   await feed((buffer === 'alternate' ? '\x1b[?1049h' : '') + 'SELECTME\x1b[?2026h');
   a.terminal.select(0, 0, 8); stock.select(0, 0, 8);
   assert(a.terminal.getSelection() === 'SELECTME' && stock.getSelection() === 'SELECTME', 'selection fixture missing');
   if (route === 'menu') {
    f.s.reset(); await f.s.whenParsed(); await new Promise(resolve => stock.write('\x1bc', resolve)); await feed('NEW TEXT');
   } else if (route === 'fragmented') { await feed('\x1b'); await feed('cNEW TEXT'); }
   else await feed('\x1bcNEW TEXT');
   await raf();
   const detail = { buffer, route, visibility, selection: a.terminal.getSelection(), stockSelection: stock.getSelection(), sync: a.terminal.modes.synchronizedOutputMode, stockSync: stock.modes.synchronizedOutputMode, active: a.terminal.buffer.active.type, targetRender: renderState(a.terminal), stockRender: renderState(stock) };
   cases.push(detail);
   assert(!detail.targetRender.paused && !detail.stockRender.paused, 'visible RIS fixture became paused', detail);
   assert(!stock.hasSelection() && !a.terminal.hasSelection(), 'RIS retained a selection on replacement text', detail);
   assert(!detail.sync && detail.sync === detail.stockSync, 'RIS retained synchronized output', detail);
   assert(a.terminal._core._renderService._syncOutputHandler._timeout === undefined && stock._core._renderService._syncOutputHandler._timeout === undefined, 'RIS retained local render timeout', detail);
   assert(a.terminal.buffer.active.type === stock.buffer.active.type, 'RIS active buffer differs', detail);
   await equivalent(f, a);
   await feed('\x1b[?2026h\x1bc\x1b[?2026h\x1bc\x1b[?2026h'); await raf();
   assert(a.terminal.modes.synchronizedOutputMode === stock.modes.synchronizedOutputMode && stock.modes.synchronizedOutputMode, 'same-batch reset/sync order differs', detail);
   await feed('\x1bc'); await raf();
   assert(!a.terminal.modes.synchronizedOutputMode && a.terminal._core._renderService._syncOutputHandler._timeout === undefined, 'final RIS did not flush rendering', detail);
  }
  return cases;
 });
 await check('offscreen-RIS-natural-timeout-deadline-and-resumed-public-render', async () => {
  const f = session(), a = display(f), el = document.createElement('div'); el.className = 'fixture-terminal'; document.querySelector('#terms').append(el);
  const stock = new Terminal({ cols: 20, rows: 4, allowProposedApi: true, fontSize: 14, cursorBlink: false });
  stock.open(el); resources.push(() => { stock.dispose(); el.remove(); });
  const terminals = [a.terminal, stock], renders = [[], []];
  const renderListeners = terminals.map((terminal, index) => terminal.onRender(() => renders[index].push({ at: performance.now(), text: terminal.buffer.active.getLine(0)?.translateToString(true) })));
  const spacer = document.createElement('div'); spacer.style.height = '2400px'; document.body.append(spacer);
  try {
   el.scrollIntoView({ block: 'center' }); const visible = await visibilityReady(terminals, true);
   const enableStartedAt = performance.now();
   await f.feed('\x1b[?1049hSELECTME\x1b[?2026h'); await new Promise(resolve => stock.write('\x1b[?1049hSELECTME\x1b[?2026h', resolve)); await raf();
   const timerCapturedAt = performance.now(), startingTimers = terminals.map(renderState);
   assert(startingTimers.every(state => state.mode && state.timeout !== null), 'offscreen timer fixture was not armed', { visible, startingTimers });
   terminals.forEach(terminal => terminal.select(0, 0, 8));
   scrollTo(0, document.documentElement.scrollHeight); const offscreen = await visibilityReady(terminals, false);
   const beforeReset = terminals.map(renderState);
   assert(beforeReset.every((state, index) => state.timeout === startingTimers[index].timeout), 'initial sync timer expired before offscreen RIS', { startingTimers, beforeReset });
   f.s.reset(); await f.s.whenParsed(); await new Promise(resolve => stock.write('\x1bc', resolve));
   await f.feed('NEW TEXT'); await new Promise(resolve => stock.write('NEW TEXT', resolve)); await raf();
   const afterReset = terminals.map(renderState);
   assert(afterReset.every((state, index) => state.paused && !state.mode && state.timeout === startingTimers[index].timeout) && terminals.every(terminal => !terminal.hasSelection()), 'offscreen reset state differs', { startingTimers, afterReset });
   // The pinned xterm6 handler arms one 1000ms safety timer. This deadline also bounds fixture scheduling.
   const deadline = timerCapturedAt + 2000;
   const expiredAt = await until(() => terminals.every(terminal => renderState(terminal).timeout === null), deadline, 'offscreen sync timeout did not naturally release by deadline', () => ({ enableStartedAt, timerCapturedAt, startingTimers, states: terminals.map(renderState) }));
   const afterExpiry = terminals.map(renderState), beforeResumeRenders = renders.map(events => events.length);
   assert(afterExpiry.every(state => state.paused && !state.mode && state.timeout === null), 'expiry changed offscreen reset modes', afterExpiry);
   el.scrollIntoView({ block: 'center' }); const resumed = await visibilityReady(terminals, true);
   const renderDeadline = performance.now() + 2000;
   await until(() => renders.every((events, index) => events.length > beforeResumeRenders[index] && events.at(-1).text === 'NEW TEXT'), renderDeadline, 'resume did not publicly render reset output', () => ({ resumed, beforeResumeRenders, renders, states: terminals.map(renderState) }));
   const final = terminals.map(renderState);
   assert(final.every(state => !state.paused && !state.mode && state.timeout === null && !state.buffering), 'resume retained synchronized rendering state', final);
   return { visible, enableStartedAt, timerCapturedAt, deadline, expiredAt, startingTimers, offscreen, afterReset, afterExpiry, resumed, renderDeadline, renders, final };
  } finally { renderListeners.forEach(listener => listener.dispose()); spacer.remove(); }
 });
 await check('actual-Session-observer-gap-fault-restores-once-from-snapshot', async () => {
  const f=session();let injected=false;const a=display(f,frame=>{if(!injected&&frame.kind==='patch'){injected=true;return{...frame,from:{...frame.from,contentSequence:999}}}return frame});await f.feed('after-gap');await Promise.resolve();await f.s.whenParsed();await equivalent(f,a);await f.feed('healthy');await equivalent(f,a);assert(injected&&a.frames.filter(k=>k==='snapshot-begin').length===2,'gap recovery did not restore exactly once',a.frames);return{injected,frames:a.frames};
 });
 await check('actual-Session-parts-assembly-gap-finite-resync-and-slow-observer', async () => {
  const f = session({ cols: 100, rows: 20, screenProfile: { ...DEFAULT_SCREEN_PROFILE, maxFrameBytes: 4096, maxObserverBytes: 8192 } }); await f.feed('parts\r\n'.repeat(40)); const a = display(f); await Promise.resolve();
  await f.feed('\x1b[2J'); await equivalent(f, a); assert(a.frames.includes('patch-part'), 'multipart patch not exercised', a.frames);
  const slowFrames = [], slow = f.s.openScreen({}, frame => slowFrames.push(frame)); for (let i = 0; i < 20; i++) await f.feed('many-changes-' + i + '\r\n');
  assert(f.s.getScreenUsage().observerBytes <= f.s.getScreenProfile().maxObserverBytes * 2, 'slow observer unbounded', f.s.getScreenUsage()); slow.dispose(); return { frames: a.frames.length, partFrames: a.frames.filter(k => k === 'patch-part').length, slowFrames: slowFrames.map(frame => frame.kind), usage: f.s.getScreenUsage() };
 });
 let focusFixture;
 await check('production-bootstrap-late-failure-releases-lease-observer-renderer-and-listeners', async()=>{
  const f=session(),el=document.createElement('div');el.style.cssText='position:relative;width:400px;height:160px';document.querySelector('#terms').append(el);const registered=[],released=[],register=f.s.registerView.bind(f.s),unregister=f.s.unregisterView.bind(f.s);f.s.registerView=id=>{const lease=register(id);registered.push(lease);return lease};f.s.unregisterView=lease=>{released.push(lease);unregister(lease)};const settings={...DEFAULT_TERMINAL_SETTINGS,renderer:'dom',scrollback:20},old=window.ResizeObserver;let disconnected=0;window.ResizeObserver=class extends old{observe(){throw Error('deliberate fixture observer failure')}disconnect(){disconnected++;super.disconnect()}};const v=new TerminalView(el,f.s,{app:{},settings:()=>settings,retention:new HiddenRendererRetention(),vaultPath:()=>undefined,focused(){}});
  try{v.setVisible(true);assert(registered.length===1&&released.length===1&&registered[0]===released[0],'late bootstrap lease leak',{registered,released});assert(disconnected===1&&!v.el.querySelector('.xterm')&&!v.term&&!v.target&&!v.presentation,'partial renderer retained',{disconnected});const event=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:(()=>{const d=new DataTransfer();d.setData('text/plain','must-not-paste');return d})()});v.el.dispatchEvent(event);assert(!event.defaultPrevented&&f.inputs.length===0&&f.s.getScreenUsage().observers===0,'late bootstrap listener/observer retained');v.dispose();assert(released.length===1,'double unregister');return{registered:registered.length,released:released.length,disconnected,observers:f.s.getScreenUsage().observers}}finally{window.ResizeObserver=old;v.dispose();el.remove()}
 });
 await check('production-TerminalView-explicit-focus-size-owner-hidden-blur-dispose', async () => {
  const f = session(), settings = { ...DEFAULT_TERMINAL_SETTINGS, renderer: 'dom', scrollback: 20, fontSize: 14 }, retention = new HiddenRendererRetention();
  const host = { app: {}, settings: () => settings, retention, vaultPath: () => undefined, focused() {} };
  const make = width => { const el = document.createElement('div'); el.style.cssText = `position:relative;width:${width}px;height:160px`; document.querySelector('#terms').append(el); const v = new TerminalView(el, f.s, host); resources.push(() => { v.dispose(); el.remove(); }); return v; };
  const requests=[];const original=f.s.requestViewSize.bind(f.s);f.s.requestViewSize=(lease,grid)=>{requests.push({grid});return original(lease,grid).then(result=>{requests.at(-1).result=result;return result})};const a = make(400), b = make(540); a.setVisible(true); b.setVisible(true); await raf(); await raf(); assert(f.sizes.length === 0, 'mount/visibility acquired size lease');
  a.setFocused(true); a.focus(); for(let n=0;n<12&&!f.sizes.length;n++)await raf(); await f.s.whenParsed(); const first = f.sizes.at(-1); assert(first, 'explicit focus did not fit', {connected:f.s.connection,visible:a.visible,focused:a.focused,lease:a.lease,fit:a.fit.proposeDimensions(),client:[a.el.clientWidth,a.el.clientHeight],cols:f.s.cols,rows:f.s.rows,status:a.el.querySelector('[role=status]').textContent,requests,fitter:{frame:a.fitter.frame,win:!!a.fitter.win}});
  b.setFocused(true); b.focus(); for(let n=0;n<12&&f.sizes.length<2;n++)await raf(); await f.s.whenParsed(); const second = f.sizes.at(-1); assert(second && second.cols > first.cols, 'new size owner not applied', f.sizes);
  assert(a.el.querySelector('.xterm-screen').clientWidth === b.el.querySelector('.xterm-screen').clientWidth, 'follower geometry differs');
  const before = f.sizes.length; b.setVisible(false); a.applySettings(); b.applySettings(); await raf(); await raf(); assert(f.sizes.length === before, 'hidden/stale-fit resized');
  a.setFocused(true); a.focus(); a.el.querySelector('textarea').blur(); a.applySettings(); await raf(); await raf(); assert(f.sizes.length === before, 'blurred stale fit resized');
  b.dispose(); a.setFocused(true); a.focus(); await raf(); await raf(); focusFixture = { f, a }; return { sizes: f.sizes, explicitOnly: true };
 });
 await check('running-resize-diagnostics-three-failures-current-applied-two-views-dispose', async () => {
  const cases = [];
  for (const failure of ['throw', 'none', 'unknown']) {
   const f = session(), settings = { ...DEFAULT_TERMINAL_SETTINGS, renderer: 'dom', scrollback: 20, fontSize: 14 };
   const host = { app: {}, settings: () => settings, retention: new HiddenRendererRetention(), vaultPath: () => undefined, focused() {} };
   const views = [400, 540].map(width => {
    const el = document.createElement('div'); el.style.cssText = `position:relative;width:${width}px;height:160px`; document.querySelector('#terms').append(el);
    const view = new TerminalView(el, f.s, host); view.setVisible(true); resources.push(() => { view.dispose(); el.remove(); }); return view;
   });
   const [a, b] = views; a.setFocused(true); a.focus();
   for (let n = 0; n < 12 && !f.sizes.length; n++) await raf();
   await f.s.whenParsed(); await raf();
   assert(f.sizes.length > 0, 'resize diagnostic fixture has no explicit owner');
   let op = 100, finish;
   f.port.submitResize = () => {
    op++;
    if (op === 101) {
     if (failure === 'throw') throw Error('fixture native resize admission failure');
     const value = { op, state: failure, reason: failure === 'none' ? 'capacity' : 'transport-lost' };
     return { op, queued: Promise.resolve(value), finished: Promise.resolve(value), cancel() {} };
    }
    return { op, queued: Promise.resolve({ op, state: 'queued' }), finished: new Promise(resolve => { finish = resolve; }), cancel() {} };
   };
   const statuses = views.map(view => view.el.querySelector('[role=status]'));
   const request = () => f.s.requestViewSize(a.lease, { cols: f.s.cols + 1, rows: f.s.rows });
   assert((await request()).status === 'accepted', 'owner request rejected'); await f.s.whenParsed(); await Promise.resolve();
   const diagnostic = f.s.resizeDiagnostic;
   assert(f.s.running && diagnostic && statuses.every(status => !status.hidden && status.textContent.includes(diagnostic.message)), 'running resize failure hidden', { failure, diagnostic, statuses: statuses.map(s => s.textContent) });
   const follower = await f.s.requestViewSize(b.lease, { cols: f.s.cols + 2, rows: f.s.rows });
   assert(follower.status === 'rejected' && follower.reason === 'not-owner' && op === 101, 'diagnostic transferred size ownership', follower);
   await request(); await f.s.whenParsed();
   assert(statuses.every(status => status.textContent.includes(diagnostic.message)), 'requested resize falsely cleared unresolved failure');
   finish({ op: 102, state: 'applied' }); await Promise.resolve(); await f.s.whenParsed();
   assert(!f.s.resizeDiagnostic && statuses.every(status => status.hidden && !status.textContent), 'current applied did not clear both views');
   await request(); await f.s.whenParsed(); b.dispose(); const disposedText = statuses[1].textContent;
   finish({ op: 103, state: 'unknown', reason: 'transport-lost' }); await Promise.resolve(); await f.s.whenParsed();
   assert(!statuses[0].hidden && statuses[0].textContent.includes(f.s.resizeDiagnostic.message), 'remaining owner missed late current failure');
   assert(statuses[1].textContent === disposedText, 'disposed view received a diagnostic write');
   assert(f.s.getScreenUsage().observers === 1, 'disposed observer retained');
   cases.push({ failure, first: diagnostic, current: f.s.resizeDiagnostic, follower, status: statuses[0].textContent });
  }
  return cases;
 });
 await check('typed-reply-failure-sticky-visible-both-views-with-parse-ACK-and-sibling', async () => {
  const f = session(), healthy = session(), settings = { ...DEFAULT_TERMINAL_SETTINGS, renderer: 'dom', scrollback: 20 };
  const stops = [], host = { app: {}, settings: () => settings, retention: new HiddenRendererRetention(), vaultPath: () => undefined, focused() {} };
  const views = [0, 1].map(() => {
   const el = document.createElement('div'); el.style.cssText = 'position:relative;width:400px;height:160px'; document.querySelector('#terms').append(el);
   const view = new TerminalView(el, f.s, host); view.setVisible(true); resources.push(() => { view.dispose(); el.remove(); }); return view;
  });
  f.port.resourceLimit = reason => stops.push(reason);
  f.port.reply = () => { throw new NativeReplyError({ state: 'none', reason: 'capacity' }); };
  await f.feed('\x1b[5n'); const first = f.s.replyDiagnostic;
  assert(first?.state === 'none' && first.reason === 'capacity', 'typed reply failure lost', first);
  f.port.reply = (_, data) => f.replies.push(data);
  f.s.input('must-not-replay'); await f.feed('still parsed\x1b[5n'); await raf();
  assert(f.s.replyDiagnostic === first && stops.length === 1, 'first reply failure was cleared or stopped repeatedly', { first, stops });
  assert(f.inputs.length === 0 && f.replies.length === 1 && f.acknowledgements.length >= 2 && f.s.getScreenUsage().status === 'ok', 'reply fault blocked parse/ACK or bypassed input admission');
  for (const view of views) {
   const status = view.el.querySelector('[role=status]');
   assert(!status.hidden && status.textContent.includes(first.message) && status.textContent.includes(f.s.inputDiagnostic.message), 'independent reply/input message hidden', { status: status.textContent });
  }
  await healthy.feed('healthy\x1b[5n');
  assert(!healthy.s.replyDiagnostic && healthy.replies.length === 1 && healthy.s.running, 'reply fault affected sibling runtime');
  return { diagnostic: first, stops, replies: f.replies.length, acknowledgements: f.acknowledgements, siblingReplies: healthy.replies.length };
 });
 await check('production-target-cursor-composition-guard-and-stock-scrolled-IME-limitation', async () => {
  const f = session(), a = display(f), stock = new Terminal({ cols: 20, rows: 4, allowProposedApi: true, fontSize: 14 }); const el = document.createElement('div'); el.className = 'fixture-terminal'; document.querySelector('#terms').append(el); stock.open(el); resources.push(() => { stock.dispose(); el.remove(); });
  await f.feed('\x1b[3;4H中\x1b[3;4H'); await raf(); const ta = a.terminal.textarea, d = a.terminal._core._renderService.dimensions.css.cell;
  assert(Math.abs(parseFloat(ta.style.left) - d.width * 3) < 0.1 && Math.abs(parseFloat(ta.style.top) - d.height * 2) < 0.1 && Math.abs(parseFloat(ta.style.width) - d.width * 2) < 0.1, 'cursor bridge textarea dimensions', { style: ta.style.cssText, d });
  await new Promise(resolve => stock.write('\x1b[3;4H中\x1b[3;4H',resolve)); await raf(); for(const t of [a.terminal,stock])t.textarea.dispatchEvent(new CompositionEvent('compositionstart',{data:''})); await f.feed('\x1b[H'); await new Promise(resolve=>stock.write('\x1b[H',resolve)); await raf(); assert(a.terminal._core._compositionHelper.isComposing && stock._core._compositionHelper.isComposing && ta.style.top===stock.textarea.style.top && ta.style.left===stock.textarea.style.left, 'composition behavior differs from stock',{target:ta.style.cssText,stock:stock.textarea.style.cssText}); for(const t of [a.terminal,stock])t.textarea.dispatchEvent(new CompositionEvent('compositionend',{data:''})); stock.reset();
  f.s.reset(); await f.s.whenParsed(); const raw = '1\r\n2\r\n3\r\n4\r\n5\r\n6\x1b[1;2H'; await f.feed(raw); await new Promise(resolve => stock.write(raw, resolve)); a.terminal.scrollToTop(); stock.scrollToTop(); await raf();
  const projected = [ta.style.left, ta.style.top], baseline = [stock.textarea.style.left, stock.textarea.style.top]; assert(JSON.stringify(projected) === JSON.stringify(baseline), 'projection introduced scrolled IME position regression', { projected, baseline });
  window.imeBaseline = { projected: a.terminal, stock, f }; return { projected, baseline, limitation: 'Stock xterm does not include ybase-ydisp in textarea top; CDP is not a real OS IME.' };
 });
 window.screenProbe = { checks, errors, focusFixture, async visual(stage) {
  if(stage==='normal'){
   const f=session(),settings={...DEFAULT_TERMINAL_SETTINGS,renderer:'dom',fontSize:16,scrollback:20},retention=new HiddenRendererRetention(),host={app:{},settings:()=>settings,retention,vaultPath:()=>undefined,focused(){}};
   const wrap=document.createElement('div');wrap.id='visual-panes';wrap.style.cssText='display:flex;gap:16px;width:1000px;height:205px;margin:12px';document.body.prepend(wrap);
   const views=[450,520].map(width=>{const el=document.createElement('div');el.style.cssText=`position:relative;width:${width}px;height:200px;flex:none;border:1px solid #666`;wrap.append(el);const v=new TerminalView(el,f.s,host);v.setVisible(true);resources.push(()=>{v.dispose();el.remove()});return v});
   views[0].setFocused(true);views[0].focus();for(let i=0;i<4;i++)await raf();await f.feed('HUHU production screen\r\n\x1b[38;2;100;220;160mOne authority, two views\x1b[0m\r\nSelection and cursor stay local');views[0].selectLine();await raf();
   window.visualFixture={f,views,wrap};return{selector:'#visual-panes',detail:{geometry:[f.s.cols,f.s.rows],sizes:f.sizes,selection:views[0].hasSelection}};
  }
  if(stage==='input'){
   const {f,views}=visualFixture;f.port.inputAdmission=1;f.port.inputLimits=window.screenProbeLimits;f.port.submitInput=()=>{const value={op:8,state:'none',reason:'capacity'};return{op:8,queued:Promise.resolve(value),finished:Promise.resolve(value),cancel(){}}};f.s.input('capacity');await Promise.resolve();await Promise.resolve();await raf();return{selector:'#visual-panes',detail:{diagnostic:f.s.inputDiagnostic,status:views[0].el.querySelector('[role=status]').textContent}};
  }
  if(stage==='resize'){
   const {f,views}=visualFixture;
   f.port.submitResize=()=>{const value={op:9,state:'none',reason:'capacity'};return{op:9,queued:Promise.resolve(value),finished:Promise.resolve(value),cancel(){}}};
   await f.s.requestViewSize(views[0].lease,{cols:f.s.cols+1,rows:f.s.rows});await f.s.whenParsed();await raf();
   return{selector:'#visual-panes',detail:{diagnostic:f.s.resizeDiagnostic,statuses:views.map(view=>view.el.querySelector('[role=status]').textContent)}};
  }
  if(stage==='reply'){
   const {f,views}=visualFixture;const stops=[];f.port.resourceLimit=reason=>stops.push(reason);
   f.port.reply=()=>{throw new NativeReplyError({state:'none',reason:'capacity'})};await f.feed('\x1b[5n');await raf();
   return{selector:'#visual-panes',detail:{diagnostic:f.s.replyDiagnostic,stops,statuses:views.map(view=>view.el.querySelector('[role=status]').textContent)}};
  }
  const f=session({screenProfile:{...DEFAULT_SCREEN_PROFILE,maxCommandWork:8}}),settings={...DEFAULT_TERMINAL_SETTINGS,renderer:'dom',fontSize:16,scrollback:20},el=document.createElement('div');el.id='visual-resource';el.style.cssText='position:relative;width:980px;height:160px;margin:12px;border:1px solid #666';document.body.prepend(el);const v=new TerminalView(el,f.s,{app:{},settings:()=>settings,retention:new HiddenRendererRetention(),vaultPath:()=>undefined,focused(){}});v.setVisible(true);resources.push(()=>{v.dispose();el.remove()});const cleanup=[];f.port.resourceLimit=reason=>cleanup.push(reason);await f.feed('Retained screen before explicit resource error');await f.feed('\x1b[9b');await raf();return{selector:'#visual-resource',detail:{status:v.el.querySelector('[role=status]').textContent,usage:f.s.getScreenUsage().status,cleanup}};
 }, async finish() { for (const dispose of resources.reverse()) dispose(); return { ok: checks.every(check => check.ok) && errors.length === 0, checks, errors, userAgent: navigator.userAgent, limitation: 'Isolated real Chrome with production source and a fake native port. No Obsidian/helper/provider or real OS IME acceptance.' }; } };
 window.screenReady = true;
}

function connect(url) {
 return new Promise((resolve, reject) => {
  const socket = new WebSocket(url), pending = new Map(); let serial = 0;
  socket.addEventListener('open', () => resolve({ send(method, params = {}) { return new Promise((yes, no) => { const id = ++serial; pending.set(id, { yes, no }); socket.send(JSON.stringify({ id, method, params })); }); }, close() { socket.close(); } }));
  socket.addEventListener('error', reject);
  socket.addEventListener('message', event => { const value = JSON.parse(event.data); if (value.id) { const p = pending.get(value.id); if (p) { pending.delete(value.id); value.error ? p.no(Error(JSON.stringify(value.error))) : p.yes(value.result); } } else consoleEvents.push(value); });
 });
}
try {
 const imports = `import { NativeReplyError } from './src/shared/native/host';import { Terminal } from '@xterm/xterm';import { SearchAddon } from '@xterm/addon-search';import { TerminalSession } from './src/modules/agent/services/terminal/session';import { XtermScreenTarget } from './src/modules/agent/ui/terminal/terminal-screen-xterm';import { TerminalPresentation } from './src/modules/agent/ui/terminal/terminal-presentation';import { TerminalView } from './src/modules/agent/ui/terminal/terminal-view';import { HiddenRendererRetention } from './src/modules/agent/ui/terminal/hidden-renderer-retention';import { DEFAULT_SCREEN_PROFILE } from './src/modules/agent/core/terminal/frames-screen';import { DEFAULT_TERMINAL_SETTINGS } from './src/modules/agent/core/terminal/settings';import { registerMessages,setLanguage } from './src/shared/i18n';import { messages } from './src/modules/agent/i18n';`;
 const entry = imports + '\n(' + browserFixture.toString() + ')().catch(error=>{console.error(error);window.screenFatal=String(error)+error.stack;});';
 await fs.writeFile(path.join(directory, 'entry.js'), entry);
 const bundled = await build({ stdin: { contents: entry, resolveDir: root, sourcefile: 'screen-probe-entry.js' }, bundle: true, platform: 'browser', format: 'iife', target: 'chrome120', write: false, metafile: true, plugins: [{ name: 'desktop-boundaries', setup(build) {
  build.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'boundary' }));
  build.onResolve({ filter: /platform\/desktop\/files$/ }, () => ({ path: 'files', namespace: 'boundary' }));
  build.onLoad({ filter: /.*/, namespace: 'boundary' }, args => ({ contents: args.path === 'obsidian' ? "export const Platform={isWin:false,isMacOS:false};export class Notice{constructor(message){window.notices??=[];window.notices.push(message)}};export class TFile{};" : 'export const droppedFilePath=()=>undefined;export const openPath=async()=>{};export const resolveReference=async()=>null;export const vaultFilePath=(v,p)=>v+"/"+p;' }));
 } }] });
 await fs.writeFile(path.join(directory, 'fixture.js'), bundled.outputFiles[0].contents);
 const sourceFiles = [...new Set([fileURLToPath(import.meta.url), ...Object.keys(bundled.metafile.inputs).filter(p => !p.startsWith('boundary:') && p !== 'screen-probe-entry.js').map(p => path.resolve(root, p)), path.join(root, 'package.json'), path.join(root, 'pnpm-lock.yaml'),path.join(root,'node_modules/@xterm/xterm/css/xterm.css'),path.join(root,'src/modules/agent/styles/agent.css')])];
 const sources = [];
 for (const source of sourceFiles) { const bytes = await fs.readFile(source), relative = path.relative(root, source), copy = path.join(directory, 'source', relative); await fs.mkdir(path.dirname(copy), { recursive: true }); await fs.writeFile(copy, bytes); sources.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) }); }
 await fs.writeFile(path.join(directory, 'source.json'), JSON.stringify({ utc: new Date().toISOString(), sources, boundaries: ['Obsidian platform/Notice/TFile', 'desktop file open/drop/resolve only'], productionNotStubbed: ['TerminalSession', 'headless model', 'screen stream', 'TerminalPresentation', 'XtermScreenTarget', 'TerminalView', 'xterm', 'SearchAddon', 'FitAddon'] }, null, 2));
 const css = await fs.readFile(path.join(root, 'node_modules/@xterm/xterm/css/xterm.css'));const agentCss=await fs.readFile(path.join(root,'src/modules/agent/styles/agent.css'));
 const html = '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/xterm.css"><link rel="stylesheet" href="/agent.css"><style>body{--layer-popover:30;--background-primary:#222;--text-normal:#ddd;--text-selection:rgba(100,150,220,.5);--size-4-1:4px;--size-4-2:8px;background:#222;color:#ddd;font:14px monospace}.fixture-terminal{width:400px;height:90px;margin:6px}.huhu-terminal-view{position:absolute;inset:0;background:#222}.huhu-terminal-view.is-hidden{display:none}.huhu-terminal-view .xterm{height:100%}[role=status]{z-index:var(--layer-popover);position:absolute;bottom:0;left:0;right:0;background:#303030;color:#ddd;padding:4px;font:12px sans-serif;pointer-events:none}</style><div id="terms"></div><pre id="results"></pre><script src="/fixture.js"></script>';
 await fs.writeFile(path.join(directory, 'index.html'), html);
 server = createServer((request, response) => { if (request.url === '/fixture.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(bundled.outputFiles[0].contents); } else if (request.url === '/xterm.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); } else if(request.url==='/agent.css'){response.setHeader('Content-Type','text/css');response.end(agentCss);} else if (request.url === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); } else { response.statusCode = 404; response.end(); } });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const url = `http://127.0.0.1:${server.address().port}/`, chrome = process.env.HUHU_CHROME || '/usr/bin/google-chrome';
 const args = ['--headless=new', '--no-sandbox', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--no-default-browser-check', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--window-size=1200,1800', '--user-data-dir=' + path.join(directory, 'profile'), url];
 commands.push({ executable: chrome, args, utc: new Date().toISOString() });
 stderr = await fs.open(path.join(directory, 'chrome.stderr.log'), 'w');
 browser = spawn(chrome, args, { stdio: ['ignore', 'ignore', stderr.fd] });
 browser.on('exit', (code, signal) => { void fs.writeFile(path.join(directory, 'chrome-exit.json'), JSON.stringify({ code, signal, utc: new Date().toISOString() })); });
 let port; for (let i = 0; i < 100; i++) { try { port = (await fs.readFile(path.join(directory, 'profile', 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await delay(50); } }
 if (!port) throw new Error('Chrome debugging startup timeout');
 const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
 const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); connection = await connect(tabs.find(tab => tab.type === 'page' && tab.url.startsWith(url)).webSocketDebuggerUrl);
 await connection.send('Runtime.enable'); await connection.send('Log.enable');
 const evaluate = async expression => { const r = await connection.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
 for (let i = 0; i < 400; i++) { if (await evaluate('window.screenReady || window.screenFatal')) break; await delay(50); }
 await fs.writeFile(path.join(directory, 'browser-partial.json'), JSON.stringify(await evaluate('window.screenProbe ? {checks:screenProbe.checks,errors:screenProbe.errors} : null'), null, 2));
 const fatal = await evaluate('window.screenFatal'); if (fatal) throw Error(fatal); if (!await evaluate('window.screenReady')) throw Error('Browser check deadline');
 // CDP delivers trusted keys to the production TerminalView. The boundary records native submission.
 const trusted = await evaluate(`(async()=>{const p=screenProbe.focusFixture;if(!p)return {skipped:true};await p.f.feed('\\x1b[?1h\\x1b[?2004h');p.a.setFocused(true);p.a.focus();return {before:p.f.inputs.length};})()`);
 if (!trusted.skipped) {
  await connection.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await connection.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
  await evaluate(`screenProbe.focusFixture.a.el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:(()=>{const d=new DataTransfer();d.setData('text/plain','paste-text');return d})()}))`);
  const input = await evaluate(`({inputs:screenProbe.focusFixture.f.inputs.slice(${trusted.before}),diagnostic:screenProbe.focusFixture.f.s.inputDiagnostic,status:screenProbe.focusFixture.a.el.querySelector('[role=status]').textContent})`);
  const ok = input.inputs.includes('\x1bOA') && input.inputs.includes('\x1b[200~paste-text\x1b[201~') && input.diagnostic?.state === 'unknown' && !!input.status;
  await evaluate(`screenProbe.checks.push(${JSON.stringify({ name: 'trusted-Chrome-key-and-production-paste-input-modes-diagnostics', ok, detail: input })})`);
 }
 if (trusted.skipped) await evaluate(`screenProbe.checks.push({name:'trusted-Chrome-input',ok:false,error:'Production focus fixture did not complete'})`);
 if (!trusted.skipped) {
  const beforeFocus=await evaluate(`(async()=>{const p=screenProbe.focusFixture;await p.f.feed('\\x1b[?1004h');p.a.focus();return p.f.inputs.length})()`);
  await evaluate(`screenProbe.focusFixture.a.el.querySelector('textarea').blur();screenProbe.focusFixture.a.focus()`);
  const focus=await evaluate(`screenProbe.focusFixture.f.inputs.slice(${beforeFocus})`);
  await evaluate(`screenProbe.checks.push(${JSON.stringify({name:'production-sendFocus-live-blur-focus',ok:focus.filter(x=>x==='\x1b[O').length===1&&focus.filter(x=>x==='\x1b[I').length===1,detail:focus})})`);
  const point=await evaluate(`(async()=>{const p=screenProbe.focusFixture;await p.f.feed('\\x1b[?1000h\\x1b[?1006h');p.a.el.scrollIntoView({block:'center'});const r=p.a.el.querySelector('.xterm-screen').getBoundingClientRect();return{x:r.left+12,y:r.top+12,before:p.f.inputs.length}})()`);
  await connection.send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',buttons:1,clickCount:1});
  await connection.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',buttons:0,clickCount:1});
  const mouse=await evaluate(`screenProbe.focusFixture.f.inputs.slice(${point.before})`);
  await evaluate(`screenProbe.checks.push(${JSON.stringify({name:'trusted-Chrome-mouse-SGR-through-production-view',ok:mouse.some(x=>typeof x==='string'&&/^\x1b\[<0;[0-9]+;[0-9]+M$/.test(x)),detail:mouse})})`);
 }
 if (!trusted.skipped) {
  const none = await evaluate(`(async()=>{const p=screenProbe.focusFixture;p.f.port.inputAdmission=1;p.f.port.inputLimits=${JSON.stringify({operationBytes:262144,fragmentBytes:16384,sessionQueuedBytes:524288,sessionQueuedOperations:32,helperQueuedBytes:2097152,helperQueuedOperations:128,replyFrameBytes:4096,sessionReplyBytes:16384,helperReplyBytes:131072})};p.f.port.submitInput=()=>{const value={op:7,state:'none',reason:'capacity'};return{op:7,queued:Promise.resolve(value),finished:Promise.resolve(value),cancel(){}}};p.f.s.input('capacity-test');await Promise.resolve();await Promise.resolve();return{diagnostic:p.f.s.inputDiagnostic,status:p.a.el.querySelector('[role=status]').textContent}})()`);
  await evaluate(`screenProbe.checks.push(${JSON.stringify({name:'production-TerminalView-none-capacity-observable',ok:none.diagnostic?.state==='none'&&none.diagnostic?.reason==='capacity'&&none.status.includes('capacity'),detail:none})})`);
 }
 // Trusted composition state, then the first user key, against the stock baseline.
 if (await evaluate('!!window.imeBaseline')) for (const name of ['projected', 'stock']) {
  await evaluate(`imeBaseline.${name}.focus()`); await connection.send('Input.imeSetComposition', { text: '中', selectionStart: 1, selectionEnd: 1 });
  const during = await evaluate(`({left:imeBaseline.${name}.textarea.style.left,top:imeBaseline.${name}.textarea.style.top,viewport:imeBaseline.${name}.buffer.active.viewportY})`);
  await connection.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
  await connection.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', text: 'a', windowsVirtualKeyCode: 65 });
  await connection.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
  await delay(50); const after = await evaluate(`({left:imeBaseline.${name}.textarea.style.left,top:imeBaseline.${name}.textarea.style.top,viewport:imeBaseline.${name}.buffer.active.viewportY})`);
  await evaluate(`window.trustedIme??={};trustedIme.${name}=${JSON.stringify({ during, after })}`);
 }
 const ime = await evaluate('window.trustedIme || {}'); await evaluate(`screenProbe.checks.push(${JSON.stringify({ name: 'trusted-CDP-composition-and-scroll-on-input-stock-comparison', ok: !!ime.projected && !!ime.stock && JSON.stringify(ime.projected) === JSON.stringify(ime.stock), detail: ime })})`);
 const shot = await connection.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await fs.writeFile(path.join(directory, 'fixture.png'), Buffer.from(shot.data, 'base64'));
 const paneShots=[];
 await evaluate(`window.screenProbeLimits=${JSON.stringify({operationBytes:262144,fragmentBytes:16384,sessionQueuedBytes:524288,sessionQueuedOperations:32,helperQueuedBytes:2097152,helperQueuedOperations:128,replyFrameBytes:4096,sessionReplyBytes:16384,helperReplyBytes:131072})}`);
 for(const stage of ['normal','input','resize','reply','resource']){
  const state=await evaluate(`screenProbe.visual(${JSON.stringify(stage)})`);
  const rectangle=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(state.selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return{x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1}})()`);
  const shot=await connection.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:rectangle});const filename='pane-'+stage+'.png';await fs.writeFile(path.join(directory,filename),Buffer.from(shot.data,'base64'));paneShots.push({name:stage,file:filename,clip:rectangle,detail:state.detail,sha256:hash(Buffer.from(shot.data,'base64'))});
 }
 await fs.writeFile(path.join(directory,'pane-shots.json'),JSON.stringify(paneShots,null,2));
 const result = await evaluate('screenProbe.finish()'); await fs.writeFile(path.join(directory, 'results.json'), JSON.stringify(result, null, 2));
 const diagnostics=consoleEvents.filter(e=>e.method==='Runtime.consoleAPICalled'&&e.params.type==='error');const expected=diagnostics.filter(e=>e.params.args.some(a=>a.description?.startsWith('Error: Screen resource-limit')));const bootstrapExpected=diagnostics.filter(e=>e.params.args.some(a=>a.description?.startsWith('Error: deliberate fixture observer failure')));const unhandled=consoleEvents.filter(e=>e.method==='Runtime.exceptionThrown'||diagnostics.includes(e)&&!expected.includes(e)&&!bootstrapExpected.includes(e));result.expectedResourceDiagnostics=expected;result.expectedBootstrapDiagnostics=bootstrapExpected;result.unhandledBrowserEvents=unhandled;if(bootstrapExpected.length!==1)throw Error('Expected exactly one deliberate bootstrap diagnostic');if(expected.length!==1)throw Error('Expected exactly one deliberate resource-limit diagnostic; saw '+expected.length);exitCode = result.ok && !unhandled.length ? 0 : 1;await fs.writeFile(path.join(directory,'results.json'),JSON.stringify(result,null,2));
 const changed = []; for (const source of sources) { const current = await fs.readFile(path.join(root, source.path)); if (hash(current) !== source.sha256) changed.push(source.path); }
 await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ started, finished: new Date().toISOString(), argv: process.argv, commands, chromeVersion: execFileSync(chrome, ['--version'], { encoding: 'utf8' }).trim(), version, nodeVersion: process.version, exitCode, changedDuringRun: changed, screenshotSHA: hash(Buffer.from(shot.data, 'base64')), notObsidianOrHelperAcceptance: true }, null, 2));
 console.log(JSON.stringify({ directory, exitCode, checks: result.checks.length, failures: result.checks.filter(check => !check.ok), errors: result.errors, changedDuringRun: changed }, null, 2));
} catch (error) { await fs.writeFile(path.join(directory, 'fatal.json'), JSON.stringify({ error: String(error), stack: error.stack, utc: new Date().toISOString(), commands }, null, 2)); console.error(error); }
finally {
 await fs.writeFile(path.join(directory, 'console.json'), JSON.stringify(consoleEvents, null, 2)); connection?.close(); if (browser && browser.exitCode === null) { browser.kill('SIGTERM'); await Promise.race([new Promise(resolve => browser.once('exit', resolve)), delay(3000)]); }
 await stderr?.close();
 if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
 process.exitCode = exitCode;
}
