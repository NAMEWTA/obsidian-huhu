// Local-only native browser fixture shared by the retained capture/lifecycle probes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

export async function browserFixture(run) {
 const server = createServer((request, response) => {
  if (request.url === '/failure') { response.destroy(); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end('<!doctype html><title>Browser fixture</title><h1>Browser fixture</h1><button>Read me</button><input aria-label="Password" type="password" value="fixture-secret"><div style="height:1800px">Scrollable content</div>');
 });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const url = `http://127.0.0.1:${server.address().port}/`, rows = [], p = 'app.plugins.plugins.huhu';
 let runtime;
 const check = (name, passed, detail) => { rows.push({ name, passed, detail }); assert.ok(passed, name); };
 const evaluate = expression => runtime.connection.evaluate(/\bawait\b/.test(expression) ? `(async()=>{${expression}})()` : expression);
 const until = async expression => {
  const end = Date.now() + 25000;
  while (Date.now() < end) { if (await evaluate(expression)) return; await delay(80); }
  throw Error(expression);
 };
 try {
  runtime = await launchFreshVault({ root: process.argv[2], port: 9276, settings: { version: 1, namespaces: { app: { language: 'en', introSeen: true, modules: { browser: true, automations: true, home: false, agent: true, archives: false, notifications: false, icons: false, comments: false, sync: false } } } } });
  await evaluate(`app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();true`);
  // The retained browser engine is a service; a page is mounted into a fixed box over the workbench.
  await evaluate(`window.host=${p}.services.peek({owner:'browser',id:'host'});window.mountPage=(init)=>{const div=document.body.createDiv();div.style.cssText='position:fixed;top:120px;left:300px;width:640px;height:420px;pointer-events:none';const page=host.createPage(init);page.mount(div);return {page,div}};!!host`);
  const bind = async () => undefined;
  await run({ runtime, url, p, evaluate, until, check, bind, delay });
  check('no-host-errors', await evaluate('huhuAcceptanceErrors.length') === 0, await evaluate('huhuAcceptanceErrors'));
  await fs.writeFile(path.join(runtime.evidence, 'result.json'), JSON.stringify({ rows }, null, 2));
 } catch (error) {
  if (runtime) { await runtime.shot('failure').catch(() => {}); await fs.writeFile(path.join(runtime.evidence, 'partial.json'), JSON.stringify({ rows, error: String(error), body: await evaluate('document.body.innerText').catch(String) }, null, 2)); }
  throw error;
 } finally {
  if (runtime) { console.log(JSON.stringify({ evidence: runtime.evidence, checks: rows.length })); await runtime.stop(); }
  server.closeAllConnections(); server.close();
 }
}
