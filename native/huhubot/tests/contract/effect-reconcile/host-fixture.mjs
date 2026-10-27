import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { TFile, TFolder, MarkdownView } from 'obsidian';
import { HapConnection } from '__REPO__/src/modules/huhubot/core/protocol/connection.ts';
import { HapDecoder } from '__REPO__/src/modules/huhubot/core/protocol/codec.ts';
import { registerObsidianNoteHost } from '__REPO__/src/modules/huhubot/services/host-write/obsidian-host.ts';
import { initializeDevice } from '__REPO__/src/host/obsidian/storage/device-id.ts';
const [binary, profileRoot] = process.argv.slice(2);
const notes = new Map(
	['Approve', 'Reject', 'Dirty', 'Changed', 'Lost', 'Cancel', 'Sibling', 'Other'].map((name) => [
		name + '.md',
		name === 'Other' ? 'UNRELATED SENTINEL' : 'before ' + name,
	]),
);
const files = new Map(
	[...notes].map(([path, text]) => [
		path,
		Object.assign(new TFile(), {
			path,
			extension: 'md',
			basename: path.slice(0, -3),
			stat: { mtime: 1, size: Buffer.byteLength(text) },
		}),
	]),
);
const root = Object.assign(new TFolder(), { path: '/', children: [...files.values()] });
const privateFiles = new Map(),
	dirs = new Set(),
	local = new Map(),
	mutations = new Map(),
	callbacks = new Set(),
	leaves = [];
let heldTarget, entered, releaseHeld;
const app = {
	loadLocalStorage: (key) => local.get(key),
	saveLocalStorage: (key, value) => (value === null ? local.delete(key) : local.set(key, structuredClone(value))),
	vault: {
		configDir: '.obsidian',
		getRoot: () => root,
		getAbstractFileByPath: (path) => (path === '/' ? root : files.get(path)),
		getFileByPath: (path) => files.get(path),
		read: async (file) => notes.get(file.path),
		process: async (file, change) => {
			const text = change(notes.get(file.path));
			notes.set(file.path, text);
			mutations.set(file.path, (mutations.get(file.path) || 0) + 1);
			if (file.path === heldTarget) {
				entered?.();
				await new Promise((resolve) => (releaseHeld = resolve));
			}
			return text;
		},
		create: async (path, text) => {
			if (files.has(path)) throw Error('exists');
			const file = Object.assign(new TFile(), {
				path,
				extension: 'md',
				basename: path.slice(0, -3),
				stat: { mtime: 1, size: Buffer.byteLength(text) },
			});
			files.set(path, file);
			notes.set(path, text);
			root.children.push(file);
			mutations.set(path, (mutations.get(path) || 0) + 1);
			return file;
		},
		on: (_name, fn) => {
			callbacks.add(fn);
			return fn;
		},
		offref: (fn) => callbacks.delete(fn),
		adapter: {
			exists: async (path) => privateFiles.has(path) || dirs.has(path),
			read: async (path) => {
				if (!privateFiles.has(path)) throw Error('missing');
				return privateFiles.get(path);
			},
			write: async (path, text) => privateFiles.set(path, text),
			mkdir: async (path) => dirs.add(path),
			stat: async (path) => (privateFiles.has(path) ? { size: Buffer.byteLength(privateFiles.get(path)) } : null),
		},
	},
	workspace: { iterateAllLeaves: (fn) => leaves.forEach(fn) },
};
const timers = {
	after(ms, fn) {
		const t = setTimeout(fn, ms);
		return () => clearTimeout(t);
	},
};
const owned = [];
let current,
	serial = 0,
	agent;
const observe = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function wait(read, predicate, label) {
	const end = Date.now() + 8000;
	while (Date.now() < end) {
		const value = await read();
		if (predicate(value)) return value;
		await sleep(5);
	}
	throw Error(label);
}
function meta(revision) {
	const commandId = 'fixture:' + ++serial;
	return {
		profileId: current.client.hello.profile.profileId,
		commandEpoch: current.client.hello.profile.commandEpoch,
		commandId,
		idempotencyKey: commandId,
		...(revision ? { expectedRevision: revision } : {}),
	};
}
async function open() {
	const child = spawn(binary, ['-test.run=^TestNoteEffectChild$'], {
		env: {
			...process.env,
			HUHU_NOTE_EFFECT_CHILD: '1',
			HUHU_NOTE_EFFECT_PROFILE_ROOT: profileRoot,
			HUHU_NOTE_EFFECT_PROFILE: profileRoot + '/one',
		},
		stdio: ['pipe', 'pipe', 'pipe'],
	});
	let exitCode,
		stderrBytes = 0,
		drop = false,
		dropResolve,
		host,
		connection,
		stopping,
		forced = false;
	const listeners = new Set(),
		closed = new Set();
	const exited = new Promise((resolve) => {
		child.once('error', () => resolve(-1));
		child.once('close', (code) => {
			exitCode = code;
			for (const fn of closed) fn(Error('EOF'));
			resolve(code);
		});
	});
	child.stderr.on('data', (b) => (stderrBytes += b.length));
	child.stdin.on('error', () => {});
	child.stdout.on('data', (b) => listeners.forEach((fn) => fn(new Uint8Array(b))));
	const transport = {
		onData(fn) {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		onClose(fn) {
			closed.add(fn);
			return () => closed.delete(fn);
		},
		send(bytes) {
			for (const f of new HapDecoder().push(bytes))
				for (const m of Array.isArray(f) ? f : [f])
					if (drop && 'result' in m && m.result?.status === 'committed') {
						drop = false;
						dropResolve();
						child.stdin.end();
						return Promise.resolve();
					}
			return new Promise((resolve, reject) => child.stdin.write(bytes, (e) => (e ? reject(e) : resolve())));
		},
		close() {
			child.stdin.end();
		},
	};
	const stop = () =>
		(stopping ??= (async () => {
			host?.dispose();
			connection?.close();
			child.stdin.end();
			let timer;
			await Promise.race([exited, new Promise((resolve) => (timer = setTimeout(resolve, 4000)))]);
			clearTimeout(timer);
			if (exitCode === undefined) {
				forced = true;
				child.kill('SIGKILL');
			}
			await exited;
			await host?.writes.drained();
			assert.equal(forced, false, 'child needed force kill');
			assert.equal(stderrBytes, 0, 'child emitted untrusted stderr');
			return exitCode;
		})());
	const item = {
		stop,
		drop: () =>
			new Promise((resolve) => {
				drop = true;
				dropResolve = resolve;
			}),
	};
	owned.push(item);
	try {
		connection = new HapConnection(transport, timers);
		const client = await connection.connect({ name: 'actual-note-contract', version: '1' });
		host = await registerObsidianNoteHost(app, client, {
			workspaceId: 'vault',
			originClientId: 'fixture-client',
			timers,
			lifetime: { registerEvent() {} },
		});
		await client.host.attach({ workspaceId: 'vault', capabilities: ['note.read', 'note.search', 'note.write'] });
		return Object.assign(item, { client, host });
	} catch (e) {
		await stop();
		throw e;
	}
}
async function target(name) {
	const file = files.get(name + '.md'),
		leaf = {};
	const view = Object.assign(new MarkdownView(), {
		app,
		leaf,
		file,
		editor: { getValue: () => leaf.dirty ?? notes.get(file.path) },
	});
	Object.assign(leaf, { view, isDeferred: false });
	leaves.push(leaf);
	const source = await current.host.sources.captureNote(file, leaf);
	return {
		file,
		leaf,
		target: {
			workspaceId: 'vault',
			resourceId: source.resourceId,
			operation: 'update',
			baseRevision: source.revision,
		},
	};
}
async function start(target, content, mode) {
	const session = await current.client.sessions.create({
		...meta(),
		kind: 'direct',
		title: 'isolated note fixture',
		memberIds: [agent.id],
		workspaceId: 'vault',
	});
	const run = await current.client.runs.start({
		...meta(session.revision),
		sessionId: session.id,
		intent: JSON.stringify({ target, content, mode }),
		sourceRefs: [],
		workspaceId: 'vault',
	});
	if (mode === 'wait') return run;
	return wait(
		() => current.client.approvals.list({ profileId: meta().profileId, limit: 100 }),
		(p) => p.items.some((a) => a.runId === run.runId && a.status === 'pending'),
		'pending approval',
	).then((p) => p.items.find((a) => a.runId === run.runId && a.status === 'pending'));
}
const getEffect = (id) => current.client.effects.get({ profileId: meta().profileId, id });
const resolve = (a, decision) =>
	current.client.approvals.resolve({
		...meta(a.revision),
		id: a.id,
		effectId: a.effectId,
		previewHash: a.preview.previewHash,
		decision,
	});
const safety = setTimeout(() => {
	releaseHeld?.();
	void Promise.allSettled(owned.map((item) => item.stop())).then(() => {
		process.exitCode = 1;
	});
}, 30000);
(async () => {
	try {
		await initializeDevice(app, {
			machineIdentity: async () => 'controlled-note-fixture',
			label: 'fixture',
			chooseDevice: async () => ({ label: 'fixture' }),
		});
		current = await open();
		agent = await current.client.agents.create({
			...meta(),
			draft: {
				name: 'writer',
				description: '',
				persona: 'controlled model boundary',
				allowedTools: ['note.write'],
			},
		});
		const initial = await current.client.collaboration.budget({ profileId: meta().profileId });
		assert.deepEqual(
			[initial.policy.rootTokenLimit, initial.policy.profileTokenLimit, initial.policy.maintenanceTokenLimit],
			['0', '0', '0'],
		);
		observe.push('unconfigured-budget-zero');
		const one = await target('Approve'),
			a = await start(one.target, 'exact 中文😀\n');
		await resolve(a, 'approve');
		await wait(
			() => getEffect(a.effectId),
			(e) => e.status === 'committed',
			'committed',
		);
		assert.equal(notes.get('Approve.md'), 'exact 中文😀\n');
		assert.equal(mutations.get('Approve.md'), 1);
		observe.push('approve-exact-once');
		const r = await start((await target('Reject')).target, 'REJECT');
		await resolve(r, 'reject');
		await wait(
			() => getEffect(r.effectId),
			(e) => e.status === 'rejected',
			'rejected',
		);
		assert.equal(mutations.has('Reject.md'), false);
		observe.push('reject-no-mutation');
		const dirty = await target('Dirty'),
			d = await start(dirty.target, 'OVERWRITE');
		dirty.leaf.dirty = 'UNSAVED PRIVATE';
		await resolve(d, 'approve');
		const dirtyEffect = await wait(
			() => getEffect(d.effectId),
			(e) => e.status === 'failed_no_effect',
			'dirty effect',
		);
		assert.equal(dirtyEffect.reason, 'UNSAVED_EDITOR_CHANGES');
		assert.equal(mutations.has('Dirty.md'), false);
		observe.push('dirty-safe-refusal');
		const changed = await target('Changed'),
			ch = await start(changed.target, 'STALE');
		notes.set('Changed.md', 'external edit');
		await resolve(ch, 'approve');
		const changedEffect = await wait(
			() => getEffect(ch.effectId),
			(e) => e.status === 'failed_no_effect',
			'changed effect',
		);
		assert.equal(changedEffect.reason, 'SOURCE_CHANGED');
		assert.equal(mutations.has('Changed.md'), false);
		observe.push('source-change-refusal');
		const ct = current.host.effects.captureCreate(root, 'Created.md', one.leaf),
			c = await start(ct, 'new exact');
		await resolve(c, 'approve');
		await wait(
			() => getEffect(c.effectId),
			(e) => e.status === 'committed',
			'created',
		);
		assert.equal(notes.get('Created.md'), 'new exact');
		assert.equal(mutations.get('Created.md'), 1);
		observe.push('create-exact-once');
		const conflict = current.host.effects.captureCreate(root, 'Conflict.md', one.leaf),
			cf = await start(conflict, 'new denied');
		await app.vault.create('Conflict.md', 'external owner');
		await resolve(cf, 'approve');
		const conflictEffect = await wait(
			() => getEffect(cf.effectId),
			(e) => e.status === 'failed_no_effect',
			'conflict effect',
		);
		assert.equal(conflictEffect.reason, 'NOTE_TARGET_EXISTS');
		assert.equal(mutations.get('Conflict.md'), 1);
		assert.equal(notes.get('Conflict.md'), 'external owner');
		observe.push('create-conflict-refusal');
		const lost = await start((await target('Lost')).target, 'written before lost receipt');
		observe.push('lost-pending');
		const dropped = current.drop();
		await resolve(lost, 'approve').catch(() => {});
		await dropped;
		observe.push('lost-reply-dropped');
		await current.stop();
		current = await open();
		observe.push('lost-reopened');
		const old = await getEffect(lost.effectId);
		const oldRun = await current.client.runs.get({ profileId: meta().profileId, id: lost.runId });
		observe.push('lost-effect-read');
		const reconciled = await current.client.effects.reconcile({ ...meta(old.revision), id: old.id });
		observe.push('lost-effect-reconciled');
		assert.equal(reconciled.status, 'committed');
		assert.equal(mutations.get('Lost.md'), 1);
		assert.equal(
			(await current.client.runs.get({ profileId: meta().profileId, id: lost.runId })).status,
			oldRun.status,
		);
		const replayCommand = { ...meta(reconciled.revision), id: old.id };
		const replay = await current.client.effects.reconcile(replayCommand);
		assert.deepEqual(await current.client.effects.reconcile(replayCommand), replay);
		assert.equal(mutations.get('Lost.md'), 1);
		observe.push('lost-receipt-reopen-authenticated-no-rewrite');
		// A noncancelable Vault operation stays alive after its logical reverse call is
		// canceled. The sibling uses the same physical HAP connection and keeps working.
		const cancel = await start((await target('Cancel')).target, 'late canceled write');
		heldTarget = 'Cancel.md';
		const reached = new Promise((resolve) => (entered = resolve));
		await resolve(cancel, 'approve');
		await reached;
		const running = await current.client.runs.get({ profileId: meta().profileId, id: cancel.runId });
		await current.client.runs.cancel({ ...meta(running.revision), id: running.id });
		const sibling = await start((await target('Sibling')).target, 'sibling survives');
		await resolve(sibling, 'approve');
		await wait(
			() => getEffect(sibling.effectId),
			(e) => e.status === 'committed',
			'sibling after cancel',
		);
		assert.equal(notes.get('Sibling.md'), 'sibling survives');
		releaseHeld();
		heldTarget = undefined;
		await current.host.writes.drained();
		await current.client.service.health({});
		const canceledEffect = await getEffect(cancel.effectId);
		assert.equal(canceledEffect.status, 'unknown_outcome');
		assert.equal(notes.get('Cancel.md'), 'late canceled write');
		const late = await current.client.effects.reconcile({
			...meta(canceledEffect.revision),
			id: canceledEffect.id,
		});
		assert.equal(late.status, 'committed');
		assert.equal(mutations.get('Cancel.md'), 1);
		assert.equal(
			(await current.client.runs.get({ profileId: meta().profileId, id: cancel.runId })).status,
			'canceled',
		);
		observe.push('single-request-cancel-sibling-and-late-vault');
		assert.equal(notes.get('Other.md'), 'UNRELATED SENTINEL');
		assert.equal(mutations.has('Other.md'), false);
		console.log(
			JSON.stringify({
				observations: observe,
				model: 'controlled-test-Engine',
				host: 'controlled-App-Vault-boundary',
				bodyLogged: false,
			}),
		);
	} finally {
		clearTimeout(safety);
		releaseHeld?.();
		for (const item of owned.reverse()) await item.stop();
		assert.equal(callbacks.size, 0, 'Host listeners leaked');
	}
})().catch((error) => {
	console.error(JSON.stringify({ completed: observe }));
	console.error(error);
	process.exitCode = 1;
});
