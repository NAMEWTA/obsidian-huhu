import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedStartup, FixtureStartupTimeout } from './bounded-startup.mjs';
test('resolved startup retains its value',async()=>{assert.equal(await boundedStartup(Promise.resolve('ready'),20),'ready');});
test('rejected startup retains its original failure',async()=>{const error=new Error('fixture failure');await assert.rejects(boundedStartup(Promise.reject(error),20),e=>e===error);});
test('never resolving startup rejects explicitly',async()=>{await assert.rejects(boundedStartup(new Promise(()=>{}),20),e=>e instanceof FixtureStartupTimeout && e.message==='Timed out: fixture startup (20ms)');});
