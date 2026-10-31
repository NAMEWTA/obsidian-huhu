// User-run only: NEW disposable Vault, production Host/Vault adapters, test-only model Engine.
// First build the controlled Go child when the Go owner has frozen its inputs:
// (cd native/huhubot && GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 go test -c -o /absolute/note-effect-child ./tests/contract/effect-reconcile)
// HUHU_NOTE_EFFECT_TEST_BINARY=/absolute/note-effect-child HUHU_OBSIDIAN_EXECUTABLE=/absolute/obsidian
//   node scripts/obsidian-acceptance/huhu-bot-note-effects.mjs /absolute/NEW-root
// --check only bundles this entry; it never launches Obsidian, a Runner, or a model.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { launchFreshVault } from './fresh-vault.mjs';

const entry = `
import { spawn } from 'node:child_process';
import { HapConnection } from './src/modules/huhubot/core/protocol/connection.ts';
import { HapDecoder } from './src/modules/huhubot/core/protocol/codec.ts';
import { registerObsidianNoteHost } from './src/modules/huhubot/services/host-write/obsidian-host.ts';
import { initializeDevice } from './src/host/obsidian/storage/device-id.ts';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (value, label) => { if (!value) throw Error(label); };
export async function run(app, binary, profileRoot, profile, home) {
  await initializeDevice(app, { machineIdentity: async () => 'disposable-note-effect-probe', label: 'note-effect-probe', chooseDevice: async () => ({ label: 'note-effect-probe' }) });
  const timers = { after: (ms, run) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } };
  const workspaceId = 'probe:workspace', children = [], mutations = {}, observations = [];
  const originalProcess = app.vault.process, originalCreate = app.vault.create;
  app.vault.process = async function(file, change) { let applied = false; const value = await originalProcess.call(this, file, text => { const next = change(text); applied = true; return next; }); if (applied) mutations[file.path] = (mutations[file.path] || 0) + 1; return value; };
  app.vault.create = async function(file, text) { const result = await originalCreate.call(this, file, text); mutations[file] = (mutations[file] || 0) + 1; return result; };
  let serial = 0, current;
  const open = async () => {
    // This is the probe's owned test child, not a second production process manager.
    const env = { HOME: home, USERPROFILE: home, XDG_STATE_HOME: home, XDG_CONFIG_HOME: home, HUHU_NOTE_EFFECT_CHILD: '1', HUHU_NOTE_EFFECT_PROFILE_ROOT: profileRoot, HUHU_NOTE_EFFECT_PROFILE: profile };
    for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP']) if (process.env[key]) env[key] = process.env[key];
    const child = spawn(binary, ['-test.run=^TestNoteEffectChild$'], { env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let exitCode, stopped = false, stderrBytes = 0, queuedBytes = 0, queuedFrames = 0, tail = Promise.resolve(), dropped, host, connection, stopping;
    const data = new Set(), closed = new Set();
    const exited = new Promise(resolve => { child.once('error', () => resolve(-1)); child.once('close', code => { exitCode = code; for (const run of closed) run(Error('Owned Runner EOF')); resolve(code); }); });
    child.stderr.on('data', bytes => { stderrBytes += bytes.length; }); // Never report untrusted stderr contents.
    child.stdin.on('error', () => {}); // Failed writes settle their callbacks; never leave an unhandled EPIPE.
    child.stdout.on('data', bytes => { for (const run of data) run(new Uint8Array(bytes)); });
    const transport = {
      onData(run) { data.add(run); return () => data.delete(run); },
      onClose(run) { closed.add(run); return () => closed.delete(run); },
      send(bytes) {
        if (stopped) return Promise.reject(Error('Owned Runner stopped'));
        for (const frame of new HapDecoder().push(bytes)) for (const message of Array.isArray(frame) ? frame : [frame]) {
          if (dropped && 'result' in message && message.result?.status === 'committed') { dropped(); dropped = undefined; stopped = true; child.stdin.end(); return Promise.resolve(); }
        }
        if (queuedFrames >= 32 || queuedBytes + bytes.length > 2097152) { child.stdin.destroy(); return Promise.reject(Error('Probe transport bound')); }
        queuedFrames++; queuedBytes += bytes.length;
        const sending = tail.then(() => new Promise((resolve, reject) => child.stdin.write(bytes, error => error ? reject(error) : resolve())));
        tail = sending.catch(() => {});
        return sending.finally(() => { queuedFrames--; queuedBytes -= bytes.length; });
      },
      close() { stopped = true; child.stdin.end(); },
    };
    const stop = () => stopping ??= (async () => {
      host?.dispose(); connection?.close(); child.stdin.end();
      let timer; await Promise.race([exited, new Promise(resolve => { timer = setTimeout(resolve, 4000); })]); clearTimeout(timer);
      if (exitCode === undefined) child.kill('SIGKILL'); await exited; await host?.writes.drained(); await tail;
      return { exitCode, stderrBytes, queuedFrames, queuedBytes };
    })();
    const owned = { stop, drop: () => new Promise(resolve => { dropped = resolve; }) }; children.push(owned);
    try {
      connection = new HapConnection(transport, timers); const client = await connection.connect({ name: 'note-effects-host-probe', version: '1' });
      host = await registerObsidianNoteHost(app, client, { workspaceId, originClientId: 'probe:client', timers, lifetime: { registerEvent() {} } });
      await client.host.attach({ workspaceId, capabilities: ['note.write', 'note.read', 'note.search'] });
      return Object.assign(owned, { client, host });
    } catch (error) { await stop(); throw error; }
  };
  const waitFor = async (read, accept, label) => { const deadline = Date.now() + 15000; while (Date.now() < deadline) { const value = await read(); if (accept(value)) return value; await sleep(50); } throw Error(label); };
  const meta = () => { const id = 'probe:' + (++serial); return { profileId: current.client.hello.profile.profileId, commandEpoch: current.client.hello.profile.commandEpoch, commandId: id, idempotencyKey: id }; };
  const approval = async runId => waitFor(() => current.client.approvals.list({ profileId: current.client.hello.profile.profileId, limit: 100 }), page => page.items.some(item => item.runId === runId && item.status === 'pending'), 'Approval did not become pending').then(page => page.items.find(item => item.runId === runId && item.status === 'pending'));
  const effect = id => current.client.effects.get({ profileId: current.client.hello.profile.profileId, id });
  const start = async (target, content) => {
    const session = await current.client.sessions.create({ ...meta(), kind: 'direct', title: 'Disposable note effect probe', memberIds: [agent.id], workspaceId });
    const run = await current.client.runs.start({ ...meta(), sessionId: session.id, expectedRevision: session.revision, intent: JSON.stringify({ target, content }), sourceRefs: [], workspaceId });
    return approval(run.runId);
  };
  const resolve = (item, decision) => current.client.approvals.resolve({ ...meta(), id: item.id, effectId: item.effectId, expectedRevision: item.revision, previewHash: item.preview.previewHash, decision });
  const target = async name => { const file = app.vault.getFileByPath(name); check(file, 'Missing probe note'); const leaf = app.workspace.getLeaf('tab'); await leaf.openFile(file); const source = await current.host.sources.captureNote(file, leaf); return { file, leaf, target: { workspaceId, resourceId: source.resourceId, baseRevision: source.revision, operation: 'update' } }; };
  let agent;
  try {
    current = await open();
    agent = await current.client.agents.create({ ...meta(), draft: { name: 'Disposable writer', description: '', persona: 'Controlled test Engine', allowedTools: ['note.write'] } });
    const budget = await current.client.collaboration.budget({ profileId: current.client.hello.profile.profileId });
    check(['rootTokenLimit', 'profileTokenLimit', 'maintenanceTokenLimit'].every(key => budget.policy[key] === '0'), 'Initial budget must use decimal zero');
    const one = await target('Approve.md'), accepted = await start(one.target, 'approved exact 中文😀\\n');
    await resolve(accepted, 'approve'); await waitFor(() => effect(accepted.effectId), item => item.status === 'committed', 'Approved write did not commit');
    check(await app.vault.read(one.file) === 'approved exact 中文😀\\n' && mutations['Approve.md'] === 1, 'Approved update exact once'); observations.push('approve-update-once');
    const two = await target('Reject.md'), rejected = await start(two.target, 'must not write'); await resolve(rejected, 'reject');
    await waitFor(() => effect(rejected.effectId), item => item.status === 'rejected', 'Reject did not settle'); check(!mutations['Reject.md'], 'Rejected write mutated'); observations.push('reject-no-write');
    const three = await target('Dirty.md'), dirty = await start(three.target, 'must not overwrite editor');
    three.leaf.view.editor.setValue('unsaved user edit');
    let dirtyReason; try { await resolve(dirty, 'approve'); } catch (error) { dirtyReason = error?.data?.reason; }
    const refused = dirtyReason ? await effect(dirty.effectId) : await waitFor(() => effect(dirty.effectId), item => ['failed_no_effect', 'unknown_outcome', 'rejected'].includes(item.status), 'Dirty target did not refuse');
    check(!mutations['Dirty.md'] && ['UNSAVED_EDITOR_CHANGES', 'SOURCE_CHANGED'].includes(dirtyReason ?? refused.reason), 'Dirty editor must prevent tool write'); observations.push('dirty-editor-no-tool-write');
    const createLeaf = one.leaf, createdTarget = current.host.effects.captureCreate(app.vault.getRoot(), 'Created.md', createLeaf);
    const created = await start(createdTarget, 'created exact'); await resolve(created, 'approve');
    await waitFor(() => effect(created.effectId), item => item.status === 'committed', 'Create did not commit'); check(mutations['Created.md'] === 1 && await app.vault.read(app.vault.getFileByPath('Created.md')) === 'created exact', 'Create exact once'); observations.push('create-exact-once');
    const four = await target('Lost.md'), lost = await start(four.target, 'committed before lost reply');
    const dropped = current.drop(); await resolve(lost, 'approve').catch(() => {}); let lostTimer;
    try { await Promise.race([dropped, new Promise((_, reject) => { lostTimer = setTimeout(() => reject(Error('Committed reply was not observed')), 15000); })]); } finally { clearTimeout(lostTimer); }
    const firstExit = await current.stop(); current = await open();
    const uncertain = await effect(lost.effectId);
    const recovered = await current.client.effects.reconcile({ ...meta(), id: lost.effectId, expectedRevision: uncertain.revision });
    check(recovered.status === 'committed' && mutations['Lost.md'] === 1, 'Authenticated completed evidence must reconcile without reexecution'); observations.push('lost-reply-restart-committed-once');
    check(await app.vault.read(app.vault.getFileByPath('Other.md')) === 'UNRELATED SENTINEL\\n' && !mutations['Other.md'], 'Unrelated note changed');
    return { observations, mutations, recoveredStatus: recovered.status, firstExit, initialBudget: budget.policy, model: 'controlled-test-Engine', host: 'real-Obsidian', bodyLogged: false };
  } finally {
    try { const stopped = await Promise.allSettled(children.reverse().map(child => child.stop())); check(stopped.every(item => item.status === 'fulfilled'), 'Owned child cleanup failed'); }
    finally { app.vault.process = originalProcess; app.vault.create = originalCreate; }
  }
}
`;

const bundled = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', target: 'es2021', external: ['obsidian'], write: false, logLevel: 'error' });
const bundle = bundled.outputFiles[0].text, bundleHash = createHash('sha256').update(bundle).digest('hex');
if (process.argv[2] === '--check') {
	console.log(JSON.stringify({ mode: 'bundle-check', bundleHash, bytes: Buffer.byteLength(bundle), hostRun: false, runnerRun: false }));
} else {
	const root = process.argv[2], binary = process.env.HUHU_NOTE_EFFECT_TEST_BINARY;
	assert.ok(root && path.isAbsolute(root), 'Pass an absolute NEW fixture root, or --check');
	assert.ok(binary && path.isAbsolute(binary), 'HUHU_NOTE_EFFECT_TEST_BINARY must name the controlled Go test child');
	await fs.access(binary);
	const pluginMain = await fs.readFile(path.join(process.env.HUHU_PLUGIN_SOURCE || process.cwd(), 'main.js'), 'utf8');
	const runtime = await launchFreshVault({ root, port: 9299, files: {
		'.obsidian/plugins/huhu/main.js': 'window.huhuNoteEffectsProbeRequire = require;\n' + pluginMain,
		'Approve.md': 'before approve\n', 'Reject.md': 'before reject\n', 'Dirty.md': 'before dirty\n', 'Lost.md': 'before lost\n', 'Other.md': 'UNRELATED SENTINEL\n',
	} });
	try {
		const profileRoot = path.join(root, 'bot-profiles'); await fs.mkdir(profileRoot, { mode: 0o700 });
		const result = await runtime.connection.evaluate(`(async () => { const module = { exports: {} }; new Function('require', 'module', 'exports', ${JSON.stringify(bundle)})(window.huhuNoteEffectsProbeRequire, module, module.exports); return module.exports.run(app, ${JSON.stringify(binary)}, ${JSON.stringify(profileRoot)}, ${JSON.stringify(path.join(profileRoot, 'one'))}, ${JSON.stringify(path.join(root, 'home'))}); })()`);
		assert.equal(result.observations.length, 5); assert.equal(result.recoveredStatus, 'committed');
		await fs.writeFile(path.join(runtime.evidence, 'huhu-bot-note-effects.json'), JSON.stringify({ bundleHash, result }, null, 2));
		console.log(JSON.stringify({ mode: 'host-probe', bundleHash, passed: true, evidence: runtime.evidence }));
	} finally { await runtime.stop(); }
}
