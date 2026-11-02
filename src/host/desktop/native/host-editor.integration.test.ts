import { mkdtemp, writeFile, rename, realpath, stat, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { requireControlTestBinaries } from '../../../../scripts/obsidian-acceptance/agent-workbench-control.mjs';
import type { NativeEditorLaunch, NativeLease } from '../../../shared/native/host';
import { NativeShutdownError } from '../../../shared/native/host';
import { PtyHelper } from './helper';

// Editor transactions need the helper's Linux foreground ownership (`foreground::supported()`); elsewhere the helper
// never advertises them and an editor launch must fail closed, which the last test proves on those platforms.
const editorPlatform = process.platform === 'linux';
const editorTest = test.skipIf(!editorPlatform);

test.runIf(!editorPlatform)('without native editor support the real helper does not advertise editor transactions and an editor launch starts nothing', async () => {
 const bins = await requireControlTestBinaries(), root = await mkdtemp(join(tmpdir(), 'huhu-editor-none-'));
 const entry = join(root, 'never.cjs'), marker = join(root, 'started');
 await writeFile(entry, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'started');`);
 const helper = await PtyHelper.start(bins.helper.path, { output() {}, exit() {}, closed() {} }, globalThis as unknown as Window, { HOME: root, XDG_RUNTIME_DIR: root });
 try {
  expect(helper.editorTransactions).toBeUndefined();
  const launch: NativeEditorLaunch = { identity: { runtimeId: 'unsupported' }, provider: 'pi', recipe: { version: 1, profileId: 'controlled-node-test', artifactDigest: 'a'.repeat(64), executable: await identity(process.execPath), entry: await identity(entry) } };
  await expect(helper.spawnSession(1, { file: process.execPath, args: [entry], cwd: root, env: {}, cols: 80, rows: 24, editor: launch })).rejects.toThrow('Native editor transactions are unavailable');
  expect(helper.editorBinding(1)).toBeUndefined();
  await new Promise(resolve => setTimeout(resolve, 200));
  await expect(stat(marker)).rejects.toMatchObject({ code: 'ENOENT' });
 } finally {
  await helper.dispose();
  await rm(root, { recursive: true, force: true });
 }
});

editorTest.each([false, true])('real Host retains EOF cleanup result (replaced endpoint: %s) and a confirmed failed generation can be explicitly replaced', async replace => {
 const bins = await requireControlTestBinaries(), root = await mkdtemp(join(tmpdir(), 'huhu-shutdown-'));
 const runtime = process.env.HUHU_TEST_EDITOR_RUNTIME_DIR ?? root, entry = join(root, 'endpoint.cjs');
 await writeFile(entry, "const fs=require('node:fs');const cap=JSON.parse(fs.readFileSync(process.env.HUHU_EDITOR_CAPABILITY_FILE));fs.writeFileSync('endpoint',cap.endpoint);process.exit(0);");
 let helper!: PtyHelper;
 const helpers: number[] = [], pids: number[] = [], events: unknown[] = [], fences = new Set<number>();
 const host = new NativeHost(async callbacks => { helper = await PtyHelper.start(bins.helper.path, callbacks, globalThis as unknown as Window, { HOME: root, XDG_RUNTIME_DIR: runtime });helpers.push(helper.pid);return helper; });
 let lease: NativeLease | undefined;
 let endpoint: string | undefined, original: Awaited<ReturnType<typeof stat>> | undefined, replacement: Awaited<ReturnType<typeof stat>> | undefined;
 const trace: Record<string, unknown> = { scope: 'real production Host/PtyHelper shutdown result, controlled Node not Pi gate', bins, replace, runtime, helpers, pids, events };
 let primary: unknown;
 try {
  lease = await host.acquire('pty', { output(sid, bytes) { lease!.value.acknowledge(sid, bytes.byteLength); }, exit(sid) { events.push({ type: 'exit', sid }); }, replySettled(sid) { fences.add(sid); } });
  const sid = lease.allocateSessionId(), launch: NativeEditorLaunch = { identity: { runtimeId: 'shutdown-original' }, provider: 'pi', recipe: { version: 1, profileId: 'controlled-node-test', artifactDigest: 'a'.repeat(64), executable: await identity(process.execPath), entry: await identity(entry) } };
  const spawning = lease.value.spawnSession(sid, { file: process.execPath, args: [entry], cwd: root, env: {}, cols: 80, rows: 24, editor: launch });
  const binding = lease.value.editorBinding!(sid)!;void binding.ready.catch(() => undefined);
  const pid = await spawning;if (pid !== null) pids.push(pid);
  await until(async () => fences.has(sid), 'final ordinary reply fence missing');await bounded(binding.closed, 'editor physical close missing');await binding.close();
  endpoint = await readFile(join(root, 'endpoint'), 'utf8');expect(endpoint.startsWith(runtime + '/')).toBe(true);original = await stat(endpoint);
  if (replace) { await rename(endpoint, endpoint + '.original');await writeFile(endpoint, 'own replacement sentinel', { mode: 0o600 });replacement = await stat(endpoint); }
  const release = lease.release();expect(lease.release()).toBe(release);
  if (replace) {
   const error = await release.catch((error: unknown) => error);expect(error).toBeInstanceOf(NativeShutdownError);
   const shutdown = error as NativeShutdownError;expect(shutdown.outcome).toMatchObject({ state: 'exited', code: 1, signal: null, forced: false, stdioClosed: true });expect(shutdown.outcome.diagnostic).toContain('identity changed');
   const retained = await stat(endpoint);expect([retained.dev, retained.ino]).toEqual([replacement!.dev, replacement!.ino]);expect(await readFile(endpoint, 'utf8')).toBe('own replacement sentinel');
   trace.shutdown = shutdown.outcome;trace.sentinel = { dev: retained.dev, ino: retained.ino, contents: 'own replacement sentinel' };await expect(lease.release()).rejects.toBe(error);
   const next = await host.acquire('cookies');expect(helpers).toHaveLength(2);await expect(lease.release()).rejects.toBe(error);await next.release();
  } else { await release;await expect(stat(endpoint)).rejects.toMatchObject({ code: 'ENOENT' });trace.normalEof = true; }
 } catch (error) { primary = error; }
 const cleanupErrors: unknown[] = [];
 try { await host.dispose(); } catch (error) { cleanupErrors.push(error); }
 if (process.env.HUHU_TEST_HOOK_EVIDENCE) await writeFile(join(process.env.HUHU_TEST_HOOK_EVIDENCE, 'f6-host-shutdown-' + crypto.randomUUID() + '.json'), JSON.stringify({ ...trace, primary: primary instanceof Error ? primary.message : primary, cleanupErrors: cleanupErrors.map(String), observedBeforeFixtureCleanup: true }, null, 2));
 if (endpoint && replacement) {
  for (const [path, owned] of [[endpoint, replacement], [endpoint + '.original', original!]] as const) {
   try { const current = await stat(path);if (current.dev === owned.dev && current.ino === owned.ino) await unlink(path);else cleanupErrors.push(Error('Own endpoint identity changed during fixture cleanup')); }
   catch (error) { cleanupErrors.push(error); }
  }
 }
 await rm(root, { recursive: true, force: true });
 if (primary || cleanupErrors.length) throw new AggregateError([...(primary ? [primary] : []), ...cleanupErrors], 'Real Host shutdown body and cleanup');
}, 20000);

async function identity(file: string) {
 const path = await realpath(file), info = await stat(path, { bigint: true });
 return { path, dev: String(info.dev), ino: String(info.ino) };
}
const bounded = async <T>(promise: Promise<T>, label: string): Promise<T> => {
 let timer: ReturnType<typeof setTimeout> | undefined;
 try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error(label)), 1000); })]); }
 finally { clearTimeout(timer); }
};

editorTest('real native rejection before app enrollment closes the pending local handle only at its final reply fence', async () => {
 const bins = await requireControlTestBinaries(), root = await mkdtemp(join(tmpdir(), 'huhu-editor-reject-'));
 const entry = join(root, 'controlled.cjs');
 await writeFile(entry, 'setInterval(()=>{},1000)');
 const launch: NativeEditorLaunch = { identity: { runtimeId: 'original-rejected-runtime' }, provider: 'pi', recipe: {
  version: 1, profileId: 'controlled-node-test', artifactDigest: 'a'.repeat(64), executable: await identity(process.execPath), entry: await identity(entry),
 } };
 await rename(entry, entry + '.original'); await writeFile(entry, 'throw Error("replacement must not execute")');
 let final!: () => void;
 const fence = new Promise<void>(resolve => { final = resolve; });
 const helper = await PtyHelper.start(bins.helper.path, { output() {}, exit() {}, closed() {}, replySettled: () => final() }, globalThis as unknown as Window, { HOME: root, XDG_RUNTIME_DIR: root });
 try {
  expect(helper.editorTransactions).toBe(1);
  const spawn = helper.spawnSession(1, { file: process.execPath, args: [entry], cwd: root, env: {}, cols: 80, rows: 24, editor: launch });
  const binding = helper.editorBinding(1)!; expect(binding).toBeDefined();
  const ready = binding.ready.catch(error => error as unknown);
  await expect(spawn).rejects.toMatchObject({ failure: { effect: 'none' } });
  await bounded(fence, 'missing final native reply fence');
  expect(helper.editorBinding(1)).toBeUndefined();
  expect(await bounded(ready, 'orphan pending ready')).toBeInstanceOf(Error);
  await expect(bounded(binding.closed, 'orphan pending closed')).resolves.toEqual({ reason: 'closed' });
  await bounded(binding.close(), 'orphan pending close');
  expect(binding.active).toBe(false);expect(helper.streamStats.editorOperations).toBe(0);
 } finally { await helper.dispose(); await rm(root, { recursive: true, force: true }); }
}, 20000);

// This controlled application proves transport ownership and liveness, independently of the official Pi gate tests.
const sourceInstance = '11111111-1111-4111-8111-111111111111';
import { editorEmbeddedCodecSource } from '../../../shared/native/control-wire-editor-codec.generated';
import { NativeHost } from './host';
import { readFile } from 'node:fs/promises';
const controlledApp = `
import fs from 'node:fs'; import net from 'node:net';
${editorEmbeddedCodecSource()}
const codec=HuhuEditorCodec,cap=codec.parseEditorCapability(fs.readFileSync(process.env.HUHU_EDITOR_CAPABILITY_FILE));
async function badRole(type,purpose){await new Promise((resolve,reject)=>{const client=net.createConnection(cap.endpoint);const timer=setTimeout(()=>{client.destroy();reject(Error('wrong-role peer was not rejected'));},1000);client.on('error',()=>{});client.on('close',()=>{clearTimeout(timer);resolve();});client.on('connect',()=>{const bytes=Buffer.from(JSON.stringify({type,version:1,sid:cap.sid,editorId:cap.editorId,purpose,token:cap.token,identity:cap.identity,sourceInstance:'${sourceInstance}'}));const frame=Buffer.alloc(bytes.length+5);frame.writeUInt32BE(bytes.length+1);frame[4]=1;frame.set(bytes,5);client.write(frame);});});}
// Deliberately malformed external peer probes: neither wire is emitted by the production codec.
await badRole('editor-auth','huhu-control');await badRole('control-auth','huhu-control');fs.writeFileSync('wrong-role-rejected','2');
const socket=net.createConnection(cap.endpoint);let buffer=Buffer.alloc(0),operation,body,offset=0;
process.title='pi';process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');process.stdin.on('data',data=>fs.appendFileSync('manual-observed',data));
function send(message){const encoded=codec.encodeEditorMessage({version:1,sid:cap.sid,editorId:cap.editorId,...message},'app-to-native');const frame=Buffer.alloc(encoded.byteLength+5);frame.writeUInt32BE(encoded.byteLength+1);frame[4]=1;frame.set(encoded.body,5);socket.write(frame);}
socket.on('connect',()=>send({type:'editor-auth',purpose:codec.EDITOR_PURPOSE,token:cap.token,identity:cap.identity,sourceInstance:'${sourceInstance}'}));
socket.on('data',chunk=>{buffer=Buffer.concat([buffer,chunk]);while(buffer.length>=4&&buffer.length>=buffer.readUInt32BE(0)+4){const size=buffer.readUInt32BE(0)+4,frame=buffer.subarray(0,size);buffer=buffer.subarray(size);if(frame[4]===1){const m=codec.parseEditorMessage(frame.subarray(5),'native-to-app');if(m.type==='editor-deliver'){operation=m;body=Buffer.alloc(m.totalBytes);offset=0;}if(m.type==='editor-close')socket.end();}else{const part=codec.parseEditorAppPart(frame);body.set(part.data,offset);offset+=part.data.byteLength;if(offset===body.length){fs.writeFileSync('body-observed',body);const op=operation.op;const finish=()=>{send({type:'editor-app-result',op,result:{state:'adapter-applied',effect:'completed'}});send({type:'editor-app-settled',op});};if(fs.existsSync('hold')){const timer=setInterval(()=>{if(fs.existsSync('release')){clearInterval(timer);finish();}},5);}else finish();body=undefined;}}}});
socket.on('error',()=>{});setInterval(()=>{},1000);
`;
async function until(check: () => Promise<boolean>, label: string) {
 const end = performance.now() + 3000;
 while (!(await check())) { if (performance.now() >= end) throw Error(label); await new Promise(resolve => setTimeout(resolve, 5)); }
}

editorTest('real Host/helper keep unknown dispatch charged while another SID, replies, ACK, cookies and stop stay live', async () => {
 const bins = await requireControlTestBinaries(), root = await mkdtemp(join(tmpdir(), 'huhu-editor-lifetime-')), entry = join(root, 'controlled.mjs');
 await writeFile(entry, controlledApp); await writeFile(join(root, 'hold'), '');
 const launch: NativeEditorLaunch = { identity: { runtimeId: 'controlled-runtime' }, provider: 'pi', recipe: {
  version: 1, profileId: 'controlled-node-test', artifactDigest: 'a'.repeat(64), executable: await identity(process.execPath), entry: await identity(entry),
 } };
 let helper!: PtyHelper;
 const host = new NativeHost(async events => (helper = await PtyHelper.start(bins.helper.path, events, globalThis as unknown as Window, { HOME: root, XDG_RUNTIME_DIR: root })));
 const output: number[] = [], exits: number[] = [], fences: number[] = [];
 const owner = await host.acquire('pty', { output(sid, bytes) { output.push(sid); owner.value.acknowledge(sid, bytes.byteLength); }, exit: sid => exits.push(sid), replySettled: sid => fences.push(sid) });
 const browser = await host.acquire('cookies'), sibling = await host.acquire('pty');
 try {
  const sid = owner.allocateSessionId();await owner.value.spawnSession(sid, { file: process.execPath, args: [entry], cwd: root, env: {}, cols: 80, rows: 24, editor: launch });
  const binding = owner.value.editorBinding!(sid)!;await bounded(binding.ready, 'app auth missing');expect(await readFile(join(root, 'wrong-role-rejected'), 'utf8')).toBe('2');
  expect(() => sibling.value.editorBinding!(sid)).toThrow('another native owner');
  const op = binding.submit('held until explicit app settlement', { sourceInstance, remainingMs: 250 });
  await op.queued;await until(async () => { try { return (await readFile(join(root, 'body-observed'), 'utf8')) === 'held until explicit app settlement'; } catch { return false; } }, 'app never received complete body');
  const queued = binding.submit('queued cancellation must never reach application', { sourceInstance, remainingMs: 2000 });
  expect(await queued.queued).toMatchObject({ state: 'queued' });queued.cancel();
  expect(await bounded(queued.finished, 'queued cancellation missing')).toMatchObject({ state: 'none', effect: 'none', reason: 'cancelled' });await queued.settled;
  expect(await readFile(join(root, 'body-observed'), 'utf8')).toBe('held until explicit app settlement');expect(helper.streamStats.editorOperations).toBe(1);
  expect(await bounded(op.finished, 'missing dispatch timeout')).toMatchObject({ state: 'unknown', effect: 'unknown' });
  let settled = false;void op.settled.then(() => { settled = true; });await Promise.resolve();expect(settled).toBe(false);expect(helper.streamStats.editorOperations).toBe(1);
  const cancel = new AbortController();cancel.abort();
  const none = binding.submit('cancelled before any body', { sourceInstance, remainingMs: 500, signal: cancel.signal });expect(await none.finished).toMatchObject({ state: 'none', reason: 'cancelled' });await none.settled;
  owner.value.reply!(sid, 'reply-lane');await until(async () => { try { return (await readFile(join(root, 'manual-observed'), 'utf8')).includes('reply-lane'); } catch { return false; } }, 'reply lane blocked behind editor');
  const second = owner.allocateSessionId();await owner.value.spawnSession(second, { file: process.execPath, args: ['-e', 'console.log("sibling output");setInterval(()=>{},1000)'], cwd: root, env: {}, cols: 80, rows: 24 });
  await until(async () => output.includes(second), 'other SID output/ACK blocked');
  await expect(browser.value.request('cookies', 'read', { path: join(root, 'missing-db'), kind: 'firefox' })).rejects.toBeDefined();expect(browser.value.alive).toBe(true);
  await writeFile(join(root, 'release'), '');await bounded(op.settled, 'late settlement did not release physical slot');expect(helper.streamStats.editorOperations).toBe(0);
  expect(await op.finished).toMatchObject({ state: 'unknown' });
  owner.value.requestStop!(second, { requestId: 'stop-sibling', force: true });await until(async () => exits.includes(second) && fences.includes(second), 'sibling stop/reply fence stalled');
  const closing = binding.close();expect(binding.active).toBe(false);await bounded(closing, 'app close unconfirmed');
  expect(await binding.submit('stale handle', { sourceInstance, remainingMs: 1000 }).finished).toMatchObject({ state: 'none', reason: 'closed' });
  console.log(JSON.stringify({ scope: 'controlled app transport, not Pi gate', helper: bins.helper, cli: bins.cli, sid, second, unknownRetainedUntilLateSettlement: true, replyCookieAckStopLive: true }));
 } finally { await owner.release();await sibling.release();await browser.release();await host.dispose();await rm(root, { recursive: true, force: true }); }
}, 20000);

editorTest('ordinary terminal fences retain a late editor close and the same real helper retires every original binding', async () => {
 const bins = await requireControlTestBinaries(), root = await mkdtemp(join(tmpdir(), 'huhu-editor-late-close-'));
 const entry = join(root, 'late-close.cjs');
 await writeFile(entry, `const fs=require('node:fs');const path=process.env.HUHU_EDITOR_CAPABILITY_FILE;fs.renameSync(path,path+'.original');fs.writeFileSync(path,'own-test-sentinel',{mode:0o600});fs.writeFileSync('cap-path-'+process.env.FIXTURE_ID,path);process.exit(0);`);
 const events: unknown[] = [], retired: number[] = [], pids: number[] = [];
 const editorRuntime = process.env.HUHU_TEST_EDITOR_RUNTIME_DIR ?? root;
 const fences = new Set<number>(), cleanup = new Set<number>(), exits = new Set<number>();
 let helper!: PtyHelper, displaced: string | undefined;
 helper = await PtyHelper.start(bins.helper.path, {
  output(sid, data) { helper.acknowledge(sid, data.byteLength); }, closed() {},
  exit(sid, code) { exits.add(sid);events.push({ type: 'exit', sid, code }); },
  termination(sid, notice) { if (notice.evidence.cleanup.state === 'confirmed') cleanup.add(sid);events.push({ type: 'termination', sid, evidence: notice.evidence }); },
  replySettled(sid) { fences.add(sid);events.push({ type: 'reply-settled', sid }); },
  editor(message) { events.push({ type: message.type, sid: message.sid }); },
 }, globalThis as unknown as Window, { HOME: root, XDG_RUNTIME_DIR: editorRuntime });
 const trace = { scope: 'real native F1 late-close regression, not Pi gate', bins, helperPid: helper.pid, events, pids, retired };
 try {
  for (const sid of [1, 2, 3]) {
   const launch: NativeEditorLaunch = { identity: { runtimeId: 'late-close-' + sid }, provider: 'pi', recipe: {
    version: 1, profileId: 'controlled-node-test', artifactDigest: 'a'.repeat(64), executable: await identity(process.execPath), entry: await identity(entry),
   } };
   const pid = await helper.spawnSession(sid, { file: process.execPath, args: [entry], cwd: root, env: { FIXTURE_ID: String(sid) }, cols: 80, rows: 24, editor: launch });
   if (pid !== null) pids.push(pid);
   const binding = helper.editorBinding(sid)!;expect(binding).toBeDefined();void binding.ready.catch(() => undefined);
   await until(async () => fences.has(sid) && cleanup.has(sid) && exits.has(sid), 'ordinary terminal fences missing');
   displaced = await readFile(join(root, 'cap-path-' + sid), 'utf8');
   if (Buffer.byteLength(editorRuntime) < 50) expect(displaced.startsWith(editorRuntime + '/')).toBe(true);
   expect(displaced).toMatch(/\/e[a-f0-9]{32}\.json$/);
   expect(await readFile(displaced, 'utf8')).toBe('own-test-sentinel');
   const original = await stat(displaced + '.original', { bigint: true });
   expect(helper.editorBinding(sid)).toBe(binding);expect(binding.active).toBe(false);
   expect(await binding.submit('old handle cannot reopen input', { sourceInstance, remainingMs: 1000 }).finished).toMatchObject({ state: 'none', reason: 'closed' });
   await expect(helper.request('cookies', 'read', { path: join(root, 'missing-cookie-db'), kind: 'firefox' })).rejects.toBeDefined();expect(helper.alive).toBe(true);
   events.push({ type: 'ordinary-fences-with-original-binding', sid, retained: helper.editorBinding(sid) === binding, statistics: helper.streamStats, originalInode: String(original.ino) });
   await unlink(displaced);await rename(displaced + '.original', displaced);
   expect((await stat(displaced, { bigint: true })).ino).toBe(original.ino);displaced = undefined;
   await bounded(binding.closed, 'restored capability did not close');await bounded(binding.close(), 'local editor frame IO did not settle');
   events.push({ type: 'after-editor-closed', sid, bindingRetained: !!helper.editorBinding(sid), statistics: helper.streamStats });
   expect(helper.editorBinding(sid)).toBeUndefined();expect(helper.streamStats.editorOperations).toBe(0);retired.push(sid);
  }
  expect([1, 2, 3].map(sid => helper.editorBinding(sid))).toEqual([undefined, undefined, undefined]);
  expect(helper.streamStats.sessionRoutes).toBe(0);
 } finally {
  if (displaced) { await unlink(displaced);await rename(displaced + '.original', displaced); }
  await helper.dispose();
  if (process.env.HUHU_TEST_HOOK_EVIDENCE) await writeFile(join(process.env.HUHU_TEST_HOOK_EVIDENCE, 'f1-late-close-' + crypto.randomUUID() + '.json'), JSON.stringify({ ...trace, helperAliveAfterDispose: helper.alive, lastStats: helper.streamStats }, null, 2));
  await rm(root, { recursive: true, force: true });
 }
}, 20000);
