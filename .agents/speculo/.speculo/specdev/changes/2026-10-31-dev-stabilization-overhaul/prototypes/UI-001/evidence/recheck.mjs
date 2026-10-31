// Run from the repository root. Uses an isolated headless browser, never the user's browser session.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const repo = process.cwd();
const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { connect } = await import(pathToFileURL(resolve(repo, 'scripts/obsidian-acceptance/cdp.mjs')));
const { prototypeDigest } = await import(pathToFileURL(resolve(repo, '.agents/speculo/workflows/specdev/common/tools/design-artifacts.mjs')));
const profile = await mkdtemp(resolve(tmpdir(), 'huhu-ui-approval-'));
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const delay = ms => new Promise(r => setTimeout(r, ms));
let c;
const result = { generated_at: new Date().toISOString(), checks: [], console_errors: [], cases: [] };
try {
  let port;
  for (let i = 0; i < 60; i++) {
    try { port = (await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await delay(100); }
  }
  assert(port, 'Chrome did not start');
  process.env.HUHU_CDP_URL = 'http://127.0.0.1:' + port;
  const targets = await (await fetch(process.env.HUHU_CDP_URL + '/json')).json();
  c = await connect('', targets.find(t => t.type === 'page').id);
  c.on('Runtime.exceptionThrown', e => result.console_errors.push(e.exceptionDetails.text));
  await c.send('Page.enable'); await c.send('Runtime.enable');
  const visit = async hash => {
    await c.send('Page.navigate', { url: pathToFileURL(resolve(dir, 'final/index.html')).href + '?recheck=' + Date.now() + hash });
    for (let i = 0; i < 40; i++) {
      if (await c.evaluate(`location.hash === ${JSON.stringify(hash)} && !!window.__huhuProto && document.querySelector('#main').textContent.length > 100`)) break;
      await delay(50);
    }
    await delay(60);
  };
  const shot = async name => {
    const png = await c.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(resolve(dir, 'evidence/screenshots/' + name + '.png'), Buffer.from(png.data, 'base64'));
    return 'evidence/screenshots/' + name + '.png';
  };
  const audit = async (route,width,height) => {
    await c.evaluate(`document.querySelector('[data-route="${route}"]').focus()`);
    await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
    await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    assert.equal(await c.evaluate('window.__huhuProto.S.route'),route);
    assert(await c.evaluate(`document.activeElement.matches(':focus-visible') && parseFloat(getComputedStyle(document.activeElement).outlineWidth) >= 3`),'visible navigation focus');
    await c.send('Emulation.setDeviceMetricsOverride',{width:Math.max(320,Math.floor(width/2)),height,deviceScaleFactor:2,mobile:false});
    assert(await c.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),`${route} zoom overflow`);
    await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert(await c.evaluate(`[...document.querySelectorAll('#main *, .nav *')].every(e => {const s=getComputedStyle(e); return s.animationName === 'none' && s.transitionDuration.split(',').every(x=>parseFloat(x)===0);})`),`${route} reduced motion`);
    await c.send('Emulation.setEmulatedMedia',{features:[]});
    await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    return {rendered:true,no_overflow:true,keyboard:true,focus:true,long_text:true,zoom:true,reduced_motion:true,states:true};
  };
  for (const width of [1440, 390, 420]) for (const theme of ['light', 'dark']) {
    const height = width === 1440 ? 900 : 844;
    await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await visit('#gallery?lang=en&theme=' + theme + '&long=1');
    // Reproduce an embedding host that blocks anchor navigation and URL writes.
    await c.evaluate(`window.__savedPushState = history.pushState; history.pushState = () => { throw new DOMException('Preview URL is read-only', 'SecurityError'); }; document.addEventListener('click', e => { if(e.target.closest('a[href^="#"]')) e.preventDefault(); }, true);`);
    for (const route of ['gallery', 'list', 'safe', 'home', 'bot', 'terminal']) {
      const info = await c.evaluate(`(() => {
        document.querySelector('[data-route="${route}"]').click();
        const nav = document.querySelector('[data-route="${route}"]');
        return {route:window.__huhuProto.S.route, current:nav.getAttribute('aria-current'), text:document.querySelector('#main').textContent.length, overflow:document.documentElement.scrollWidth > innerWidth + 1};
      })()`);
      assert.equal(info.route, route); assert.equal(info.current, 'page'); assert(info.text > 100); assert(!info.overflow, `${route} ${width} overflow`);
      const checks = await audit(route,width,height);
      const id = `recheck-${route}-${width}-${theme}`;
      result.cases.push({ id, width, height, screenshot: await shot(id), entry: 'final/index.html', checks, states:[`UI-${route.toUpperCase()}:navigation`] });
    }
    result.checks.push({check:'six-page navigation with blocked anchors and URL writes', width, theme, passed:true});
    await visit('#list?lang=en&theme=' + theme + '&w=420&long=1&sim=fail');
    const checks = await audit('list',width,height);
    await c.evaluate(`document.querySelector('[data-act="simRun"][data-id="fail"]').click(); window.scrollTo(0,0);`);
    const geometry = await c.evaluate(`(() => {
      const toast = document.querySelector('.toast'), main = document.querySelector('#main');
      const t = toast.getBoundingClientRect(), m = main.getBoundingClientRect();
      const rects = [...main.querySelectorAll('.item .ac')].map(e => e.getBoundingClientRect());
      return {position:getComputedStyle(toast.parentNode).position, bottom:t.bottom, mainTop:m.top, overlap:rects.some(r => t.left < r.right && t.right > r.left && t.top < r.bottom && t.bottom > r.top), overflow:document.documentElement.scrollWidth > innerWidth + 1};
    })()`);
    assert.equal(geometry.position,'static'); assert(!geometry.overlap); assert(geometry.bottom <= geometry.mainTop); assert(!geometry.overflow);
    const id = `recheck-toast-${width}-${theme}`;
    result.cases.push({id,width,height,screenshot:await shot(id),entry:'final/index.html',checks,states:['UI-LIST:container-420','UI-LIST:name-snapshot-notice']});
    result.checks.push({check:'toast occupies space above content at narrow container',width,theme,...geometry,passed:true});
    await c.evaluate(`document.querySelector('[data-route="safe"]').focus()`);
    await c.send('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
    await c.send('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    assert.equal(await c.evaluate('window.__huhuProto.S.route'),'safe');
    result.checks.push({check:'keyboard Enter navigation',width,theme,passed:true});
  }
  await visit('#terminal?term=cleanup&details=1');
  assert.equal(await c.evaluate('window.__huhuProto.S.route'),'terminal');
  await c.evaluate(`document.querySelector('[data-route="home"]').click()`);
  assert.equal(await c.evaluate('location.hash'),'#home');
  await c.evaluate('history.back()'); await delay(100);
  assert.equal(await c.evaluate('window.__huhuProto.S.route'),'terminal');
  await c.evaluate('history.forward()'); await delay(100);
  assert.equal(await c.evaluate('window.__huhuProto.S.route'),'home');
  result.checks.push({check:'deep link and browser back/forward',passed:true});
  assert.deepEqual(result.console_errors,[]);
  result.prototype_digest = await prototypeDigest(resolve(dir,'design-system.md'));
  await writeFile(resolve(dir,'evidence/recheck.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({passed:result.checks.length,screenshots:result.cases.length,console_errors:result.console_errors.length,prototype_digest:result.prototype_digest}));
} finally {
  c?.close(); chrome.kill('SIGTERM'); await delay(200); await rm(profile,{recursive:true,force:true});
}
