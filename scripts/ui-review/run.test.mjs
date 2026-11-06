import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const runner = path.join(import.meta.dirname, 'run.mjs');
test('rejects unknown matrix instead of silently dropping coverage', () => {
	const result = spawnSync(process.execPath, [runner, '--ticket', 'T-23', '--matrix', 'quick', '--out', '/unused'], { encoding: 'utf8' });
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Usage:/);
});
test('rejects fixture path traversal before writing output', () => {
	const result = spawnSync(process.execPath, [runner, '--ticket', '../T-23', '--matrix', 'standard', '--out', '/unused'], { encoding: 'utf8' });
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Usage:/);
});
test('missing fixture produces a nonpassing machine-readable result', async () => {
	const output = await mkdtemp(path.join(os.tmpdir(), 'huhu-review-cli-'));
	try {
		const run = spawnSync(process.execPath, [runner, '--ticket', 'T-999999', '--matrix', 'standard', '--out', output], { encoding: 'utf8' });
		assert.notEqual(run.status, 0);
		const result = JSON.parse(await readFile(path.join(output, 'result.json'), 'utf8'));
		assert.equal(result.status, 'failed');
		assert.deepEqual(result.cases, []);
		assert.match(result.errors[0].message, /T-999999/);
	} finally { await rm(output, { recursive: true, force: true }); }
});
test('frontend redesign suite resolves its isolated shared theme fixture and seven widths', async () => {
 const output = await mkdtemp(path.join(os.tmpdir(), 'huhu-redesign-cli-'));
 try {
  const run = spawnSync(process.execPath, [runner, '--suite', 'frontend-redesign', '--ticket', 'T-01', '--matrix', 'redesign', '--out', output, '--check'], {encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const result=JSON.parse(await readFile(path.join(output,'result.json'),'utf8'));
  assert.equal(result.status,'preflight');
  assert.equal(result.suite,'frontend-redesign');
  assert.deepEqual([...new Set(result.plannedCases.filter(item=>item.zoom===1).map(item=>item.width))],[320,390,600,820,960,1100,1440]);
  assert.ok(result.plannedCases.some(item=>item.mobile));
  assert.ok(result.plannedCases.some(item=>item.hostMode==='unsafe'));
  assert.ok(result.plannedCases.some(item=>item.motion==='reduce'&&!item.reducedMotion));
  assert.ok(result.plannedCases.some(item=>item.cssWidth===320&&item.zoom===2));
  assert.ok(result.inputs.some(item=>item.path.includes('frontend-redesign/shared')));
 } finally {await rm(output,{recursive:true,force:true});}
});
test('redesign suite never falls back to an identically numbered legacy fixture', async () => {
 const output=await mkdtemp(path.join(os.tmpdir(),'huhu-redesign-isolation-'));
 try {
  const run=spawnSync(process.execPath,[runner,'--suite','frontend-redesign','--ticket','T-23','--matrix','redesign','--out',output,'--check'],{encoding:'utf8'});
  assert.notEqual(run.status,0);
  const result=JSON.parse(await readFile(path.join(output,'result.json'),'utf8'));
  assert.equal(result.status,'failed');
  assert.match(result.errors[0].message,/frontend-redesign\/T-23\/index/);
 }finally{await rm(output,{recursive:true,force:true});}
});
test('suite and matrix names must be paired explicitly', () => {
 for(const args of [['--suite','frontend-redesign','--matrix','standard'],['--suite','unknown','--matrix','redesign'],['--matrix','redesign']]) {
  const run=spawnSync(process.execPath,[runner,...args,'--ticket','T-01','--out','/unused'],{encoding:'utf8'});
  assert.notEqual(run.status,0);assert.match(run.stderr,/Usage:/);
 }
});

test('redesign T14 delegates before ordinary fixture import and reports invalid integration concurrency', async () => {
 const output=await mkdtemp(path.join(os.tmpdir(),'huhu-redesign-integration-cli-'));
 try {
  const run=spawnSync(process.execPath,[runner,'--suite','frontend-redesign','--ticket','T-14','--matrix','redesign','--out',output,'--check'],{encoding:'utf8',env:{...process.env,HUHU_UI_REVIEW_CONCURRENCY:'4'}});
  assert.notEqual(run.status,0);
  const result=JSON.parse(await readFile(path.join(output,'result.json'),'utf8'));
  assert.equal(result.ticket,'T-14');assert.equal(result.status,'failed');assert.deepEqual(result.cases,[]);
  assert.match(result.errors.join('\n'),/CONCURRENCY/);assert.doesNotMatch(result.errors.join('\n'),/T-14\/index/);
 } finally {await rm(output,{recursive:true,force:true});}
});
