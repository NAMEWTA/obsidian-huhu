import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const evidenceRoot=dirname(fileURLToPath(import.meta.url));
const packageRoot=resolve(evidenceRoot,'../..');
const projectRoot=resolve(packageRoot,'../../../../../../../..');
const {assertSchema,readDesign,prototypeDigest,safePath}=await import(pathToFileURL(resolve(projectRoot,'.agents/speculo/workflows/specdev/common/tools/design-artifacts.mjs')).href);
const browser=JSON.parse(await readFile(resolve(evidenceRoot,'browser.json'),'utf8'));
const observations=JSON.parse(await readFile(resolve(evidenceRoot,'observations.json'),'utf8'));
const design=await readDesign(resolve(packageRoot,'../../DESIGN.md'));
assertSchema('browserEvidence',browser);
const digest=await prototypeDigest(resolve(packageRoot,'design-system.md'));
if(browser.prototype_digest!==digest)throw Error('Browser evidence digest differs from actual source');
if(observations.findings.length||observations.errors.length)throw Error('Observed failures remain');
const missing=design.meta.pages.flatMap(page=>page.states.filter(state=>!browser.cases.some(c=>c.entry==='final/index.html'&&c.states.includes(`${page.id}:${state}`))).map(state=>`${page.id}:${state}`));
if(missing.length)throw Error(`Missing states: ${missing.join(',')}`);
for(const entry of ['final/index.html','comparison/variants/candidate-a.html'])for(const width of [1440,390])if(!browser.cases.some(c=>c.entry===entry&&c.width===width))throw Error(`Missing ${entry} ${width}px`);
for(const c of browser.cases){
  const png=await readFile(await safePath(packageRoot,c.screenshot));
  if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png.readUInt32BE(16)<c.width||png.readUInt32BE(20)<c.height)throw Error(`Invalid screenshot ${c.id}`);
}
for(const locator of [browser.design_review,browser.technical_review])if((await readFile(await safePath(packageRoot,locator),'utf8')).trim().length<80)throw Error(`Missing substantive review ${locator}`);
if(JSON.stringify(observations.sourceHashes.before)!==JSON.stringify(observations.sourceHashes.after))throw Error('Source bytes changed during verification');
console.log(JSON.stringify({schema:'pass',caseCount:browser.cases.length,pageStateCount:design.meta.pages.reduce((n,p)=>n+p.states.length,0),missingStates:missing,digest,findings:observations.findings.length,consoleErrors:observations.errors.length,pngs:'all valid',sourceBytes:'unchanged',approval:'not asserted; original approval still has its original digest'},null,2));
