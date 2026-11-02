import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFixture } from './fixture.mjs';
import { parseOptions, summarize } from './sample.mjs';
test('fixed seed produces byte-identical complete fiction and different seeds change content',()=>{
 const first=generateFixture('small',42),again=generateFixture('small',42),other=generateFixture('small',43);
 assert.equal(first.bytes,again.bytes);assert.equal(first.digest,again.digest);assert.notEqual(first.digest,other.digest);
 assert.deepEqual(first.counts,{notes:100,comments:100,archives:10,tasks:100,history:200});
 for(const row of first.data.comments)assert.ok(first.data.notes[row.path]);
 for(const row of Object.values(first.data.history.entries))assert.ok(first.data.objects[row.hash]);
 const large=generateFixture('large',42);assert.equal(large.counts.notes,10000);assert.equal(large.counts.history,20000);
});
test('invalid/ambiguous arguments and unbounded workloads fail before launching a process',()=>{
 for(const args of [[],['--out','x','--runs','0'],['--out','x','--runs','101'],['--out','x','--seed','NaN'],['--out','x','--runs','1','--runs','2'],['--out','x','--fault','unknown']])assert.throws(()=>parseOptions(args));
 assert.equal(parseOptions(['--out','x']).seed,20261031);
});
test('failed samples never become percentile values or fabricated zero timings',()=>{
 const row={scenario:'page',measurement_kind:'fixture_interactive',value:7,unit:'ms',status:'ok'};
 const result=summarize([{mode:'cold',status:'ok',browser:{rows:[row]}},{mode:'cold',status:'failed',browser:{rows:[{...row,value:0}]}}]);
 assert.equal(result[0].count,1);assert.equal(result[0].p95,7);
 assert.equal(summarize([{mode:'cold',status:'failed',browser:{rows:[row]}}])[0].p50,null);
});
