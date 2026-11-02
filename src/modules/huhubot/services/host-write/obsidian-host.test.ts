import { MarkdownView, TFile, TFolder, type App, type WorkspaceLeaf } from 'obsidian';
import { expect, it } from 'vitest';
import { initializeDevice } from '../../../../host/obsidian/storage/device-id';
import type { ApprovalPreview, BotMethod, BotMethodMap, HostInvoke, HostLease } from '../../api';
import { HapConnection, type HapTransport } from '../../core/protocol/connection';
import { encodeHapFrame, HapDecoder, type HapMessage } from '../../core/protocol/codec';
import { methodValidation } from '../../core/protocol/method-validation';
import { digest, utf8 } from '../../platform/obsidian/note-effects/primitives';
import { noteFingerprint } from '../../platform/obsidian/note-effects/fingerprint';
import { NOTE_WRITE_TOOL } from '../../platform/obsidian/note-effects/note-effects';
import { registerObsidianNoteHost } from './obsidian-host';

class Peer implements HapTransport {
	data: (bytes: Uint8Array) => void = () => {};
	ended: (error: Error) => void = () => {};
	messages: HapMessage[] = [];
	onData(run: (bytes: Uint8Array) => void) { this.data = run; return () => { this.data = () => {}; }; }
	onClose(run: (error: Error) => void) { this.ended = run; return () => { this.ended = () => {}; }; }
	async send(bytes: Uint8Array) { for (const frame of new HapDecoder().push(bytes)) this.messages.push(...(Array.isArray(frame) ? frame : [frame])); }
	close() { this.ended(new Error('EOF')); }
	reply(id: string, value: object) { this.data(encodeHapFrame({ jsonrpc: '2.0', id, result: value as never })); }
	async host<M extends BotMethod>(method: M, request: BotMethodMap[M]['params'], id: string) {
		this.data(encodeHapFrame({ jsonrpc: '2.0', id, method, params: request as never }));
		await expect.poll(() => this.messages.find(message => message.id === id)).toBeDefined();
		return this.messages.find(message => message.id === id)!;
	}
}

it('registers the production source/write Host factory and carries real Vault mutations and dirty errors through strict HAP', async () => {
	const notes = new Map<string, string>([['One.md', 'before 中文😀'], ['Other.md', 'UNRELATED']]), privateFiles = new Map<string, string>(), directories = new Set<string>(), local = new Map<string, unknown>();
	const files = new Map([...notes].map(([path, text]) => [path, Object.assign(Object.create(TFile.prototype) as TFile, { path, extension: 'md', basename: path.slice(0, -3), stat: { mtime: 1, size: utf8.encode(text).length } })]));
	const root = Object.assign(Object.create(TFolder.prototype) as TFolder, { path: '/', children: [...files.values()] });
	let dirty: string | undefined, mutations = 0; const leaf = {} as WorkspaceLeaf;
	const callbacks = new Set<unknown>();
	const app = { loadLocalStorage: (key: string) => local.get(key), saveLocalStorage: (key: string, value: unknown) => { if (value === null) local.delete(key); else local.set(key, structuredClone(value)); },
		vault: { configDir: '.obsidian', getRoot: () => root, getAbstractFileByPath: (path: string) => files.get(path), read: async (file: TFile) => notes.get(file.path)!,
			process: async (file: TFile, change: (text: string) => string) => { const text = change(notes.get(file.path)!); notes.set(file.path, text); mutations++; return text; },
			create: async () => { throw new Error('not used'); }, on: (_name: string, run: unknown) => { callbacks.add(run); return run; }, offref: (run: unknown) => { callbacks.delete(run); },
			adapter: { exists: async (path: string) => privateFiles.has(path) || directories.has(path), read: async (path: string) => { const value = privateFiles.get(path); if (value === undefined) throw new Error('missing'); return value; },
				write: async (path: string, text: string) => { privateFiles.set(path, text); }, mkdir: async (path: string) => { directories.add(path); },
				stat: async (path: string) => privateFiles.has(path) ? { size: utf8.encode(privateFiles.get(path)!).length } : null } },
		workspace: { iterateAllLeaves: (run: (leaf: WorkspaceLeaf) => void) => { run(leaf); } } } as unknown as App;
	const view = Object.assign(Object.create(MarkdownView.prototype) as MarkdownView, { app, leaf, file: files.get('One.md'), editor: { getValue: () => dirty ?? notes.get('One.md')! } });
	Object.assign(leaf, { view, isDeferred: false });
	await initializeDevice(app, { machineIdentity: async () => 'isolated-controlled-host', label: 'test', chooseDevice: async () => ({ label: 'test' }) });
	const peer = new Peer(), timers = { after: (ms: number, run: () => void) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } };
	const connection = new HapConnection(peer, timers), opening = connection.connect({ name: 'host-test', version: '1' });
	const profile = { profileId: 'profile:one', commandEpoch: '1', revision: '1', createdAt: '2026-10-25T00:00:00Z' };
	peer.reply('c:1', { protocolVersion: '0.1', buildVersion: '0.1.0-dev', schemaVersion: 1, profile, capabilities: [], limits: { maxFrameBytes: 1048576, maxBatchItems: 8 } });
	const client = await opening, registered = await registerObsidianNoteHost(app, client, { workspaceId: 'workspace:one', originClientId: 'client:one', timers, lifetime: { registerEvent: () => {} } });
	const lease: HostLease = { leaseId: 'lease:one', hostConnectionId: 'connection:one', leaseEpoch: '1', workspaceId: 'workspace:one', capabilities: ['note.write', 'note.read'], expiresAt: '2099-01-01T00:00:00Z' };
	const auth = { profileId: profile.profileId, commandEpoch: profile.commandEpoch, leaseId: lease.leaseId, hostConnectionId: lease.hostConnectionId, leaseEpoch: lease.leaseEpoch, workspaceId: lease.workspaceId };
	const attaching = client.host.attach({ workspaceId: lease.workspaceId, capabilities: lease.capabilities }); peer.reply('c:2', lease); await attaching;
	try {
		const source = await registered.sources.captureNote(files.get('One.md')!, leaf);
		const prepared = await peer.host('host.prepareWrite', { ...auth, target: { workspaceId: lease.workspaceId, resourceId: source.resourceId, operation: 'update', baseRevision: source.revision }, tool: { ...NOTE_WRITE_TOOL }, content: 'after exact 中文😀' }, 's:prepare');
		if ('method' in prepared || !methodValidation.validate('host.prepareWrite', 'result', prepared.result)) throw new Error('Missing strict prepare result');
		const preview: ApprovalPreview = { target: prepared.result.target, tool: prepared.result.tool, binding: prepared.result.binding, diff: prepared.result.diff,
			content: 'after exact 中文😀', parametersHash: await digest('params'), previewHash: await digest('preview'), sourceRefs: [source] };
		const checked = await peer.host('host.checkWrite', { ...auth, preview }, 's:check'); expect(checked).toMatchObject({ result: { valid: true } });
		const invoke: HostInvoke = { ...auth, capability: 'note.write', effectId: 'effect:one', runId: 'run:one', approvalId: 'approval:one', approvalRevision: '1',
			expiresAt: '2099-01-01T00:00:00Z', resource: { resourceId: source.resourceId, revision: source.revision }, content: preview.content, preview, fingerprint: '' }; invoke.fingerprint = await noteFingerprint(invoke);
		expect(await peer.host('host.invoke', invoke, 's:invoke')).toMatchObject({ result: { status: 'committed', effectId: invoke.effectId, fingerprint: invoke.fingerprint } });
		expect(notes.get('One.md')).toBe(preview.content); expect(notes.get('Other.md')).toBe('UNRELATED'); expect(mutations).toBe(1);
		expect(await peer.host('host.invoke', invoke, 's:duplicate')).toMatchObject({ result: { status: 'committed' } }); expect(mutations).toBe(1);
		dirty = 'UNSAVED PRIVATE INPUT';
		expect(await peer.host('host.checkWrite', { ...auth, preview }, 's:dirty')).toMatchObject({ error: { data: { kind: 'UNSAVED_EDITOR_CHANGES', reason: 'UNSAVED_EDITOR_CHANGES' } } });
		expect(mutations).toBe(1); expect(JSON.stringify(peer.messages)).not.toContain(dirty);
	} finally { registered.dispose(); await registered.writes.drained(); client.close(); expect(callbacks.size).toBe(0); }
});
