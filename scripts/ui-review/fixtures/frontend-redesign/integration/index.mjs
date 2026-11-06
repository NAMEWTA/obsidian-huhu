/** Final component matrix: isolated executions of the existing production fixtures.
 * Controlled browser services and iframe documents do not prove native host integration.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const fixtureRoot = 'scripts/ui-review/fixtures/frontend-redesign';
const runner = 'scripts/ui-review/run.mjs';
// Verified against each fixture's actual production imports, not route names.
export const entries = Object.freeze([
 ['T-01','shared/theme',['src/theme/runtime.ts','src/ui/components/button.tsx']],
 ['T-02','T-02/index',['src/ui/components/huhu/DetailPane.tsx','src/ui/components/tree.tsx']],
 ['T-03','T-03/index',['src/ui/components/huhu/date/index.ts']],
 ['T-04','T-04/index',['src/shell/host/workbench-surface.tsx']],
 ['T-05','T-05/index',['src/modules/task/ui/TaskPage.tsx']],
 ['T-06','T-06/index',['src/modules/archives/ui/generic/workbench-page.tsx']],
 ['T-07','T-07/index',['src/modules/automations/ui/workbench-page.ts']],
 ['T-08','T-08/index',['src/modules/home/ui/DashboardPage.tsx']],
 ['T-09','T-09/index',['src/modules/agent/ui/AgentWorkspacePage.tsx']],
 ['T-10','T-10/index',['src/modules/navigator/ui/diary/DiaryWorkspace.tsx','src/modules/navigator/ui/NavigatorRoot.tsx']],
 ['T-11','T-11/index',['src/modules/notifications/ui/InboxPanel.tsx','src/modules/safe/ui/SafePage.tsx','src/modules/health/ui/HealthPage.tsx']],
 ['T-12','T-12/index',['src/app/settings/react/SettingsPage.tsx']],
 ['T-16','T-16/index',['src/modules/versioning/ui/DiffSurface.tsx','src/modules/versioning/ui/diff/ConflictDiffView.tsx','src/modules/versioning/ui/history/NoteHistoryPanel.tsx']],
].map(([ticket, fixture, production]) => Object.freeze({ ticket, fixture, production: Object.freeze(production) })));
const hash = data => createHash('sha256').update(data).digest('hex');
export function concurrency(value = '2') {
 if (!/^[123]$/.test(value)) throw Error('HUHU_UI_REVIEW_CONCURRENCY must be 1, 2 or 3');
 return Number(value);
}
export async function schedule(items, limit, task) {
 if (![1,2,3].includes(limit)) throw Error('Invalid concurrency');
 let next = 0;
 const results = [];
 await Promise.all(Array.from({length: limit}, async () => {
  while (next < items.length) {
   const index = next++;
   try { results[index] = await task(items[index], index); }
   catch (error) { results[index] = { ticket: items[index].ticket, errors: [String(error)] }; }
  }
 }));
 return results;
}
// Independent acceptance oracle for the existing runner's frozen 66-case contract.
export function expectedPlan() {
 const list = [];
 const add = sample => list.push({cssWidth:sample.width/sample.zoom,mobile:false,pointer:'fine',reducedMotion:false,...sample});
 for (const width of [320,390,600,820,960,1100,1440]) for (const language of ['en','zh']) for (const theme of ['paper','ink']) add({width,language,theme,zoom:1,accent:'teal',source:'huhu',density:'compact',uiSize:'14'});
 for (const theme of ['paper','ink']) for (const accent of ['teal','indigo','pine','ochre','plum','graphite']) for (const source of ['huhu','obsidian']) for (const hostMode of source === 'obsidian' ? ['safe','unsafe'] : ['none']) add({width:960,language:'zh',theme,accent,source,hostMode,zoom:1,density:'comfortable',uiSize:'15'});
 add({width:640,language:'zh',theme:'ink',accent:'plum',source:'huhu',zoom:2,density:'compact',uiSize:'13',motion:'reduce',reducedMotion:false});
 add({width:390,language:'zh',theme:'paper',accent:'teal',source:'huhu',zoom:1,density:'compact',uiSize:'14',motion:'system',pointer:'coarse',mobile:true,reducedMotion:true});
 return list;
}
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
export async function inputHash(root, file) {
 if (file.endsWith(':app.css')) {
  const bytes = await fs.readFile(file.slice(0,-8));
  const header = JSON.parse(bytes.subarray(16,16+bytes.readUInt32LE(12)).toString());
  const entry = header.files['app.css'];
  const offset = 8 + bytes.readUInt32LE(4) + Number(entry.offset);
  return hash(bytes.subarray(offset, offset+entry.size));
 }
 return hash(await fs.readFile(path.resolve(root,file)));
}
export async function validateChild({entry, child, result, root, check, shared = new Map(), readHash = file => inputHash(root,file), verifyScreenshots = true, output}) {
 const errors = [];
 const fail = message => errors.push(`${entry.ticket}: ${message}`);
 if (child.code !== 0 || child.signal || child.error) fail(`child failed: ${JSON.stringify(child)}`);
 if (!result) { fail('missing result'); return errors; }
 if (result.ticket !== entry.ticket || result.suite !== 'frontend-redesign' || result.matrix !== 'redesign') fail('wrong result identity');
 if (result.status !== (check ? 'preflight' : 'passed')) fail(`unexpected status ${result.status}`);
 if (!Array.isArray(result.errors) || result.errors.length) fail('child errors are not empty');
 const planned = expectedPlan();
 if (!same(result.plannedCases,planned)) fail('incomplete or changed planned matrix');
 if (!Array.isArray(result.cases) || result.cases.length !== (check ? 0 : 66)) fail('incomplete executed matrix');
 const sampleIds = new Set();
 if (!check && Array.isArray(result.cases)) for (const [index,sample] of result.cases.entries()) {
  const expected = planned[index];
  if (typeof sample.id !== 'string' || !/^[a-z0-9-]+$/.test(sample.id)) fail(`case ${index} missing or invalid sample id`);
  else {
   if (sampleIds.has(sample.id)) fail(`case ${index} duplicate sample id ${sample.id}`);
   sampleIds.add(sample.id);
   if (sample.screenshot !== `${sample.id}.png`) fail(`case ${index} sample id does not match main PNG`);
  }
  if (!expected || !Object.entries(expected).every(([key,value]) => sample[key] === value)) fail(`case ${index} does not match plan`);
  if (sample.failure || !Array.isArray(sample.assertions)) fail(`case ${index} failure or missing assertions`);
  const media = sample.actualMedia;
  if (!media || !['pointerFine','pointerCoarse','pointerNone','hover','hoverNone'].every(key => typeof media[key] === 'boolean')) fail(`case ${index} missing actual media`);
  if (verifyScreenshots) {
   try {
    if (typeof sample.screenshot !== 'string' || path.basename(sample.screenshot) !== sample.screenshot) throw Error('invalid screenshot path');
    const png = await fs.readFile(path.join(output,sample.screenshot));
    if (!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Error('invalid PNG');
   } catch (error) { fail(`case ${index} screenshot: ${error}`); }
  }
 }
 const inputs = Array.isArray(result.inputs) ? result.inputs : [];
 if (!inputs.length || new Set(inputs.map(input => input.path)).size !== inputs.length) fail('missing or duplicate inputs');
 const required = [...entry.production,`${fixtureRoot}/${entry.fixture}.tsx`,`${fixtureRoot}/${entry.fixture}.mjs`,runner,'scripts/ui-review/bounded-startup.mjs','styles.css'];
 for (const file of required) if (!inputs.some(input => input.path === file)) fail(`missing production/driver input ${file}`);
 const host = inputs.filter(input => typeof input.path === 'string' && input.path.endsWith(':app.css'));
 if (host.length !== 1) fail('missing or ambiguous ASAR app.css');
 if (result.inputDigest !== hash(JSON.stringify(inputs))) fail('input digest mismatch');
 for (const input of inputs) {
  try {
   if (!/^[a-f0-9]{64}$/.test(input.sha256) || await readHash(input.path) !== input.sha256) fail(`stale input ${input.path}`);
   if (shared.has(input.path) && shared.get(input.path) !== input.sha256) fail(`inconsistent shared input ${input.path}`);
   shared.set(input.path,input.sha256);
  } catch (error) { fail(`input ${input.path}: ${error}`); }
 }
 // An alternate host ASAR may never silently mix with the other children.
 if (host.length === 1) {
  const signature = `${host[0].path}:${host[0].sha256}`;
  if (shared.has(':host') && shared.get(':host') !== signature) fail('inconsistent host stylesheet');
  shared.set(':host', signature);
 }
 return errors;
}
export async function launchChild({root, entry, output, check, env = process.env}) {
 await fs.mkdir(output,{recursive:false}); // Fresh output: a prior result must never mask a failed child.
 const {HUHU_CDP_URL: _ignored, ...isolatedEnv} = env;
 const args = [path.join(root,runner),'--suite','frontend-redesign','--ticket',entry.ticket,'--matrix','redesign','--out',output,...(check ? ['--check'] : [])];
 const stdout = await fs.open(path.join(output,'stdout.log'),'wx');
 const stderr = await fs.open(path.join(output,'stderr.log'),'wx');
 try {
  return await new Promise(resolve => {
   const child = spawn(process.execPath,args,{cwd:root,env:isolatedEnv,stdio:['ignore',stdout.fd,stderr.fd]});
   child.once('error', error => resolve({code:null,error:String(error)}));
   child.once('close',(code,signal) => resolve({code,signal}));
  });
 } finally { await stdout.close(); await stderr.close(); }
}
export async function runIntegration({root, output, check = false}) {
 const result = {ticket:'T-14',suite:'frontend-redesign',matrix:'redesign',status:'failed',startedAt:new Date().toISOString(),cases:[],children:[],inputs:[],errors:[],boundaries:['Controlled production-component browser fixtures; not real Obsidian, PTY, clipboard or popout acceptance','Planned pointer labels are not actual media; each sample records matchMedia separately']};
 await fs.mkdir(output,{recursive:true});
 try {
  const ownPath = `${fixtureRoot}/integration/index.mjs`;
  const ownInput = {path:ownPath,sha256:await inputHash(root,ownPath)};
  const limit = concurrency(process.env.HUHU_UI_REVIEW_CONCURRENCY ?? '2');
  result.concurrency = limit;
  // Unique run directory preserves every old child result/log without reusing it.
  const runOutput = await fs.mkdtemp(path.join(output,'children-'));
  const shared = new Map();
  result.children = await schedule(entries,limit,async entry => {
   const childOutput = path.join(runOutput,entry.ticket);
   const child = await launchChild({root,entry,output:childOutput,check});
   let evidence, readError;
   try { evidence = JSON.parse(await fs.readFile(path.join(childOutput,'result.json'),'utf8')); }
   catch (error) { readError = String(error); }
   const errors = await validateChild({entry,child,result:evidence,root,check,shared,output:childOutput});
   if (readError) errors.push(`${entry.ticket}: ${readError}`);
   return {ticket:entry.ticket,fixture:entry.fixture,production:entry.production,output:childOutput,child,status:evidence?.status,plannedCases:evidence?.plannedCases?.length ?? 0,caseCount:evidence?.cases?.length ?? 0,inputDigest:evidence?.inputDigest,inputs:evidence?.inputs ?? [],actualMedia: evidence?.cases?.map(sample => sample.actualMedia) ?? [],errors};
  });
  for (const child of result.children) {
   result.errors.push(...child.errors);
   result.cases.push(...Array.from({length:child.caseCount ?? 0},(_,index) => ({ticket:child.ticket,index,result:path.join(child.output,'result.json')})));
  }
  result.inputs = [...shared].filter(([file]) => file !== ':host').map(([file,sha256]) => ({path:file,sha256})).sort((a,b) => a.path.localeCompare(b.path));
  result.inputs.push(ownInput);
  // Catch edits after an earlier child's validation, including later styles/driver drift.
  for (const input of result.inputs) if (await inputHash(root,input.path) !== input.sha256) result.errors.push(`Final input drift: ${input.path}`);
  result.inputDigest = hash(JSON.stringify(result.inputs));
  if (result.children.length !== 13 || result.cases.length !== (check ? 0 : 858)) result.errors.push('Incomplete aggregate matrix');
  if (!result.errors.length) result.status = check ? 'preflight' : 'passed';
 } catch (error) { result.errors.push(String(error)); }
 result.finishedAt = new Date().toISOString();
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n');
 if (result.status === 'failed') process.exitCode = 1;
 console.log(`T-14: ${result.status}; ${result.cases.length} matrix cases; ${output}/result.json`);
 return result;
}
