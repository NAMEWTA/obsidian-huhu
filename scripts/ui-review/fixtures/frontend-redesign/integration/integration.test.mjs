import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { concurrency, entries, expectedPlan, schedule, validateChild, launchChild, inputHash } from './index.mjs';
const hash = data => createHash('sha256').update(data).digest('hex');
const entry = entries[0];
const sha = hash('current');
const fixtureRoot = 'scripts/ui-review/fixtures/frontend-redesign';
function evidence(check = false) {
 const inputs = [...entry.production,`${fixtureRoot}/${entry.fixture}.tsx`,`${fixtureRoot}/${entry.fixture}.mjs`,'scripts/ui-review/run.mjs','scripts/ui-review/bounded-startup.mjs','styles.css','/test/obsidian.asar:app.css'].map(file => ({path:file,sha256:sha}));
 return {ticket:entry.ticket,suite:'frontend-redesign',matrix:'redesign',status:check?'preflight':'passed',errors:[],plannedCases:expectedPlan(),cases:check?[]:expectedPlan().map((sample,index)=>({...sample,id:`case-${index}`,assertions:[{name:'actual verification'}],actualMedia:{pointerFine:false,pointerCoarse:false,pointerNone:true,hover:false,hoverNone:true},screenshot:`case-${index}.png`})),inputs,inputDigest:hash(JSON.stringify(inputs))};
}
const validate = (result, more = {}) => validateChild({entry,child:{code:0,signal:null},result,root:'/unused',check:false,readHash:async()=>sha,verifyScreenshots:false,...more});
test('fixed independent ticket list excludes T13/T14/T15 and preserves exactly 858 planned samples', () => {
 assert.deepEqual(entries.map(entry=>entry.ticket),[...Array.from({length:12},(_,i)=>`T-${String(i+1).padStart(2,'0')}`),'T-16']);
 assert.equal(expectedPlan().length,66); assert.equal(entries.length*expectedPlan().length,858);
});
test('default concurrency and invalid values cannot oversubscribe the machine', () => {
 assert.equal(concurrency(),2);
 for (const value of ['0','4','-1','2.5','2x','',' 2','03']) assert.throws(()=>concurrency(value));
 for (const value of ['1','2','3']) assert.equal(concurrency(value),Number(value));
});
test('scheduler bounds simultaneous work and retains every failed job', async () => {
 let active=0,max=0;
 const results=await schedule(entries,2,async entry=>{active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,2));active--;if(entry.ticket==='T-07')throw Error('child failure');return {ticket:entry.ticket};});
 assert.equal(max,2);assert.equal(active,0);assert.equal(results.length,13);assert.match(results[6].errors[0],/child failure/);
 assert.deepEqual(results.map(result=>result.ticket),entries.map(entry=>entry.ticket));
});
test('complete current evidence is accepted; planned fine does not impersonate actual fine', async () => {
 assert.deepEqual(await validate(evidence()),[]);
 const inlineAssertions=evidence();inlineAssertions.cases[0].assertions=[];assert.deepEqual(await validate(inlineAssertions),[]); // T11 throws Node assertions directly; preserve its original result array.
});
test('missing child result, nonzero exit and wrong status are rejected', async () => {
 assert.match((await validate(undefined)).join('\n'),/missing result/);
 assert.match((await validate(evidence(),{child:{code:1}})).join('\n'),/child failed/);
 const result=evidence();result.status='failed';result.errors.push({message:'failure'});
 assert.match((await validate(result)).join('\n'),/unexpected status/);
});
test('missing real production entry is rejected even with updated input digest', async () => {
 const result=evidence();result.inputs=result.inputs.filter(input=>input.path!==entry.production[0]);result.inputDigest=hash(JSON.stringify(result.inputs));
 assert.match((await validate(result)).join('\n'),/missing production\/driver input/);
});
test('incomplete planned or executed matrix, failures, missing actual media and missing assertions reject passed strings', async () => {
 for(const mutate of [r=>r.plannedCases.pop(),r=>r.cases.pop(),r=>r.cases[0].width=999,r=>r.cases[0].failure='broken',r=>delete r.cases[0].actualMedia,r=>delete r.cases[0].assertions]) {
  const result=evidence();mutate(result);assert.ok((await validate(result)).length);
 }
});
test('all input drift including ASAR host CSS, styles and driver is rejected', async () => {
 for (const file of ['styles.css','/test/obsidian.asar:app.css',`${fixtureRoot}/${entry.fixture}.mjs`]) {
  assert.match((await validate(evidence(),{readHash:async current=>current===file?hash('changed'):sha})).join('\n'),/stale input/);
 }
});
test('inconsistent shared styles/host inputs and a tampered input digest reject acceptance', async () => {
 for(const file of ['styles.css','scripts/ui-review/run.mjs']) assert.match((await validate(evidence(),{shared:new Map([[file,hash('other')]])})).join('\n'),/inconsistent shared input/);
 assert.match((await validate(evidence(),{shared:new Map([[':host','other.asar:otherhash']])})).join('\n'),/inconsistent host stylesheet/);
 const result=evidence();result.inputDigest=hash('tampered');assert.match((await validate(result)).join('\n'),/input digest mismatch/);
});
test('check is preflight with zero actual cases and cannot become E2E passed', async () => {
 assert.deepEqual(await validate(evidence(true),{check:true}),[]);
 assert.ok((await validate(evidence(true))).length);
 assert.ok((await validate(evidence(),{check:true})).length);
 const result=evidence(true);result.status='passed';assert.ok((await validate(result,{check:true})).length);
});
test('screenshots must be actual child PNG files; missing or traversal paths are rejected', async () => {
 const output=await fs.mkdtemp(path.join(os.tmpdir(),'huhu-integration-png-'));
 try {
  assert.match((await validate(evidence(),{verifyScreenshots:true,output})).join('\n'),/screenshot/);
  // A signature-only file is sufficient for this filesystem boundary test, not product evidence.
  for (const sample of evidence().cases) await fs.writeFile(path.join(output,sample.screenshot),Buffer.from([137,80,78,71,13,10,26,10]));
  assert.deepEqual(await validate(evidence(),{verifyScreenshots:true,output}),[]);
  const result=evidence();result.cases[0].screenshot='../actual.png';assert.match((await validate(result,{verifyScreenshots:true,output})).join('\n'),/invalid screenshot path/);
 } finally {await fs.rm(output,{recursive:true,force:true});}
});
test('child CLI forwards --check and fixed ticket with CDP removed, separate outputs, and real nonzero exit retained', async () => {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'huhu-integration-child-'));
 try {
  await fs.mkdir(path.join(root,'scripts/ui-review'),{recursive:true});
  await fs.writeFile(path.join(root,'scripts/ui-review/run.mjs'),`import fs from 'node:fs';\nconsole.log(JSON.stringify({args:process.argv.slice(2),cdp:process.env.HUHU_CDP_URL??null}));\nprocess.exitCode=Number(process.env.TEST_EXIT??0);`);
  for (const [index,entry] of entries.slice(0,2).entries()) {
   const output=path.join(root,entry.ticket);
   const child=await launchChild({root,entry,output,check:true,env:{...process.env,HUHU_CDP_URL:'http://user-cdp',TEST_EXIT:String(index)}});
   assert.equal(child.code,index);
   const record=JSON.parse(await fs.readFile(path.join(output,'stdout.log'),'utf8'));
   assert.equal(record.cdp,null);assert.deepEqual(record.args,['--suite','frontend-redesign','--ticket',entry.ticket,'--matrix','redesign','--out',output,'--check']);
   await assert.rejects(()=>launchChild({root,entry,output,check:true}),/EEXIST/);
  }
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
test('ASAR app.css hash reads the stylesheet bytes rather than the entire archive', async () => {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'huhu-integration-asar-'));
 try {
  const css=Buffer.from('body{color:red}');const header=Buffer.from(JSON.stringify({files:{'app.css':{offset:'0',size:css.length}}}));
  const prefix=Buffer.alloc(16);prefix.writeUInt32LE(header.length,12);prefix.writeUInt32LE(header.length+8,4);
  const file=path.join(root,'host.asar');await fs.writeFile(file,Buffer.concat([prefix,header,css]));
  assert.equal(await inputHash(root,`${file}:app.css`),hash(css));
 } finally {await fs.rm(root,{recursive:true,force:true});}
});

test('sample identity must be present, unique and correspond to the main PNG', async () => {
 assert.deepEqual(await validate(evidence()),[]);
 for (const mutate of [r=>delete r.cases[0].id,r=>r.cases[0].id='',r=>r.cases[0].id='invalid.png']) {
  const result=evidence();mutate(result);assert.match((await validate(result)).join('\n'),/missing or invalid sample id/);
 }
 const duplicate=evidence();duplicate.cases[1].id=duplicate.cases[0].id;duplicate.cases[1].screenshot=duplicate.cases[0].screenshot;
 assert.match((await validate(duplicate)).join('\n'),/duplicate sample id/);
 const mismatch=evidence();mismatch.cases[0].screenshot='unrelated.png';
 assert.match((await validate(mismatch)).join('\n'),/sample id does not match main PNG/);
});
