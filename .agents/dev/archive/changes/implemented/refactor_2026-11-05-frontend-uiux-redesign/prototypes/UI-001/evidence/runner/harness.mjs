import fs from 'node:fs/promises'; import path from 'node:path'; import os from 'node:os'; import { spawn } from 'node:child_process'; import { pathToFileURL } from 'node:url';
const REPO = '/home/wta/projects/obsidian-huhu';
const { connect } = await import(pathToFileURL(path.join(REPO, 'scripts/obsidian-acceptance/cdp.mjs')));
export const pause = n => new Promise(r => setTimeout(r, n));
export async function launch() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-ui001-'));
  const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let cdp; for (let i = 0; i < 100; i++) { try { const port = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; process.env.HUHU_CDP_URL = `http://127.0.0.1:${port}`; cdp = await connect('about:blank'); break; } catch { await pause(60); } }
  const errors = [];
  cdp.on('Runtime.exceptionThrown', e => errors.push(e.exceptionDetails?.exception?.description || e.exceptionDetails?.text));
  cdp.on('Runtime.consoleAPICalled', e => { if (e.type === 'error') errors.push(e.args.map(a => a.value || a.description).join(' ')); });
  cdp.on('Network.requestWillBeSent', e => { if (/^https?:/.test(e.request.url)) errors.push('network ' + e.request.url); });
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable'); await cdp.send('Network.enable');
  const ev = s => cdp.evaluate(s);
  const api = {
    cdp, errors, ev,
    async open(url, width = 1440, height = 900) { await api.size(width, height); await cdp.send('Page.navigate', { url }); for (let i = 0; i < 100; i++) { if (await ev('document.readyState==="complete" && !!document.querySelector("#rail,.notes-scene")').catch(() => false)) break; await pause(50); } await pause(150); },
    async size(width, height = 900, scale = 1) { await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false }); await pause(150); },
    async choose(sel, value) { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`); await pause(120); },
    async click(sel) { const ok = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.focus();e.click();return true})()`); if (!ok) throw Error('missing ' + sel); await pause(120); },
    async input(sel, value) { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.focus();e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`); await pause(80); },
    async key(key, mods = 0) { const code = { Tab: 9, Enter: 13, Escape: 27, ArrowDown: 40, ArrowUp: 38, ArrowRight: 39, ArrowLeft: 37, ' ': 32, Home: 36, End: 35, F6: 117 }[key] || 0; const text = key === ' ' ? ' ' : key === 'Enter' ? '\r' : undefined; await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key === ' ' ? 'Space' : key, windowsVirtualKeyCode: code, modifiers: mods, ...(text ? { text } : {}) }); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, modifiers: mods }); await pause(80); },
    async tap(sel) { const r = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const b=e.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2]})()`); if (!r) throw Error('missing ' + sel); for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: r[0], y: r[1], button: 'left', clickCount: 1 }); await pause(250); },
    async shot(file) { const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(file, Buffer.from(r.data, 'base64')); return file; },
    overflow: () => ev('document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1'),
    async close() { try { await cdp.send('Browser.close'); } catch { } chrome.kill(); },
  };
  return api;
}
