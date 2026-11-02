import { isHostLeaseRenewal } from '../../../core/protocol/host-lease';
import { MarkdownView, TFile, TFolder, type App, type Component, type EventRef, type TAbstractFile, type WorkspaceLeaf } from 'obsidian';
import type { ApprovalPreview, EffectTarget, HostInvoke, HostLease, HostReceipt, HostReceiptQuery, NoteWriteBinding, ToolDescriptor } from '../../../api';
import { BotRpcError } from '../../../core/protocol/connection';
import { huhuName } from '../../../../../shared/storage/vault-layout';
import { storageWriteQueue } from '../../../../../shared/storage/write-queue';
import type { HostWriteSources, SourceWriteOrigin } from '../sources/port';
import { noteFingerprint } from './fingerprint';
import { BASELINE_BYTES, digest, hasControl, NOTE_BYTES, noteFault, notePath, opaque, sameJson, utf8 } from './primitives';
import { HostReceiptStore, type LocalNoteReceipt, type NoteLocator, type ReceiptObservation } from './receipt-store';
import type { CheckWriteRequest, NoteEffects, PrepareWriteRequest, PrepareWriteResult } from './port';

export const NOTE_WRITE_TOOL: Readonly<ToolDescriptor> = Object.freeze({ name: 'note.write', capability: 'note.write', capabilityVersion: '1', implementationVersion: '1', policyVersion: '1' });
const MAX_PREPARATIONS = 128;
const MAX_PREPARED_BYTES = 8_388_608;
const MAX_PREVIEW_JSON_BYTES = 262_144;
interface Target {
	target: EffectTarget; origin: SourceWriteOrigin; path: string; file?: TFile; parent?: TFolder; parentPath?: string;
	generation: number; valid: boolean; sourceHash: string;
}
interface Prepared extends Target { binding: NoteWriteBinding; baseline: string; content: string; diff: string }
export interface NoteEffectOptions {
	profileId: string; commandEpoch: string; deviceId: string; workspaceId: string; lifetime: Pick<Component, 'registerEvent'>;
}

function diff(path: string, before: string, after: string): string {
	if (before === after) return '';
	const left = before.split('\n'), right = after.split('\n'); let prefix = 0, suffix = 0;
	while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix++;
	while (suffix < left.length - prefix && suffix < right.length - prefix && left[left.length - suffix - 1] === right[right.length - suffix - 1]) suffix++;
	return [`--- ${path}`, `+++ ${path}`, `@@ -${prefix + 1},${left.length - prefix - suffix} +${prefix + 1},${right.length - prefix - suffix} @@`,
		...left.slice(prefix, left.length - suffix).map(line => `-${line}`), ...right.slice(prefix, right.length - suffix).map(line => `+${line}`),
		...(!before.endsWith('\n') ? ['\\ No newline at end of original file'] : []), ...(!after.endsWith('\n') ? ['\\ No newline at end of replacement file'] : [])].join('\n');
}

/** Actual Vault.create/process adapter. Only a locally captured TFile/folder can become a write target. */
export class ObsidianNoteEffects implements NoteEffects {
	private lease?: HostLease;
	private generation = 0;
	private serial = 0n;
	private disposed = false;
	private preparedBytes = 0;
	private readonly createdTargets = new Map<string, Target>();
	private readonly preparations = new Map<string, Prepared>();
	private readonly preparing = new Set<Target>();
	private readonly inFlight = new Map<string, { fingerprint: string; operation: Promise<HostReceipt> }>();
	private readonly events: EventRef[] = [];
	constructor(private readonly app: App, private readonly sources: HostWriteSources, private readonly receipts: HostReceiptStore, private readonly options: NoteEffectOptions) {
		const invalidate = (file: TAbstractFile, oldPath?: string) => {
			for (const target of [...this.createdTargets.values(), ...this.preparations.values(), ...this.preparing]) if (file === target.file || file === target.parent ||
				[file.path, oldPath].some(path => path !== undefined && (target.path === path || target.path.startsWith(`${path}/`)))) target.valid = false;
		};
		this.events.push(app.vault.on('rename', invalidate), app.vault.on('delete', invalidate));
		for (const event of this.events) options.lifetime.registerEvent(event);
	}
	setLease(lease: HostLease | undefined): void {
		if (isHostLeaseRenewal(this.lease, lease)) {
			this.lease!.expiresAt = lease!.expiresAt; return;
		}
		this.generation++;
		for (const target of this.preparations.values()) target.valid = false;
		for (const target of this.preparing) target.valid = false;
		this.preparations.clear(); this.createdTargets.clear(); this.preparedBytes = 0;
		this.lease = lease ? structuredClone(lease) : undefined;
	}
	setCommandEpoch(epoch: string): void {
		if (!/^[1-9][0-9]*$/.test(epoch) || BigInt(epoch) < BigInt(this.options.commandEpoch)) throw noteFault('NOTE_PROFILE_MISMATCH');
		if (epoch === this.options.commandEpoch) return;
		this.options.commandEpoch = epoch;
		const lease = this.lease;
		this.setLease(undefined);
		this.setLease(lease);
	}
	private current(): HostLease {
		const lease = this.lease, expiry = lease ? Date.parse(lease.expiresAt) : NaN;
		if (this.disposed || !lease || !Number.isFinite(expiry) || expiry <= Date.now()) throw noteFault('HOST_OFFLINE', 'HOST_UNAVAILABLE');
		return lease;
	}
	private checkRequest(request: { profileId: string; commandEpoch: string; leaseId: string; hostConnectionId: string; leaseEpoch: string; workspaceId: string }): HostLease {
		const lease = this.current();
		if (request.profileId !== this.options.profileId || request.commandEpoch !== this.options.commandEpoch) throw noteFault('NOTE_PROFILE_MISMATCH');
		if (request.workspaceId !== this.options.workspaceId || request.workspaceId !== lease.workspaceId || request.leaseId !== lease.leaseId ||
			request.hostConnectionId !== lease.hostConnectionId || request.leaseEpoch !== lease.leaseEpoch || !lease.capabilities.includes('note.write'))
			throw noteFault('HOST_LEASE_MISMATCH', 'HOST_UNAVAILABLE');
		return lease;
	}
	private checkSignal(signal: AbortSignal): void { if (signal.aborted) throw noteFault('HOST_REQUEST_ABORTED', 'HOST_UNAVAILABLE'); }
	private safePath(path: string): string { return notePath(path, this.app.vault.configDir); }
	private checkOrigin(origin: SourceWriteOrigin, lease: HostLease): void {
		if (origin.workspaceId !== lease.workspaceId || origin.hostConnectionId !== lease.hostConnectionId ||
			origin.hostLeaseId !== lease.leaseId || origin.hostLeaseEpoch !== lease.leaseEpoch) throw noteFault('HOST_LEASE_MISMATCH', 'HOST_UNAVAILABLE');
	}
	private parentCurrent(target: Target): boolean {
		return !!target.parent && target.parent.path === target.parentPath &&
			(target.parent === this.app.vault.getRoot() || this.app.vault.getAbstractFileByPath(target.parentPath) === target.parent);
	}
	private assertTarget(target: Target, signal: AbortSignal): void {
		this.checkSignal(signal); this.current();
		if (!target.valid || target.generation !== this.generation) throw noteFault('SOURCE_CHANGED', 'SOURCE_CHANGED');
		this.safePath(target.path);
		if (target.file) {
			if (target.file.path !== target.path || this.app.vault.getAbstractFileByPath(target.path) !== target.file || target.file.extension !== 'md') throw noteFault('SOURCE_CHANGED', 'SOURCE_CHANGED');
		} else {
			if (!this.parentCurrent(target)) throw noteFault('SOURCE_CHANGED', 'SOURCE_CHANGED');
			const filename = target.path.split('/').at(-1)!;
			if (this.app.vault.getAbstractFileByPath(target.path) || target.parent!.children.some(child =>
				child.path.split('/').at(-1)!.normalize('NFC').toLowerCase() === filename.normalize('NFC').toLowerCase())) throw noteFault('NOTE_TARGET_EXISTS', 'CONFLICT');
		}
	}
	/** Explicit UI context only; a model/wire path is never accepted here or by prepareWrite. */
	captureCreate(parent: TFolder, filename: string, leaf: WorkspaceLeaf): EffectTarget {
		this.current();
		if (!(parent instanceof TFolder) || parent !== this.app.vault.getRoot() && this.app.vault.getAbstractFileByPath(parent.path) !== parent ||
			/[\\/:]/.test(filename) || hasControl(filename) || !filename || this.createdTargets.size >= MAX_PREPARATIONS) throw noteFault('NOTE_TARGET_INVALID');
		const name = `${huhuName(filename.replace(/\.md$/i, '').normalize('NFC'))}.md`;
		if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) throw noteFault('NOTE_TARGET_INVALID');
		const path = this.safePath(parent === this.app.vault.getRoot() ? name : `${parent.path}/${name}`);
		const origin = this.sources.captureWriteOrigin(leaf);
		this.checkOrigin(origin, this.current());
		const target: Target = { target: { workspaceId: this.options.workspaceId, resourceId: opaque('target'), operation: 'create', baseRevision: '0' },
			origin, path, parent, parentPath: parent.path, generation: this.generation, valid: true, sourceHash: '' };
		this.assertTarget(target, new AbortController().signal);
		this.createdTargets.set(target.target.resourceId, target);
		return structuredClone(target.target);
	}
	private leaves(): WorkspaceLeaf[] {
		const leaves: WorkspaceLeaf[] = [];
		this.app.workspace.iterateAllLeaves(leaf => { if (leaves.length >= 512) throw noteFault('NOTE_TASK_LIMIT', 'RESOURCE_LIMIT'); leaves.push(leaf); });
		return leaves;
	}
	private checkEditors(path: string, disk: string): void {
		for (const leaf of this.leaves()) {
			const view = leaf.view;
			if (view instanceof MarkdownView) {
				if (view.file?.path === path && view.editor.getValue() !== disk) throw noteFault('UNSAVED_EDITOR_CHANGES', 'UNSAVED_EDITOR_CHANGES');
			} else {
				const state = leaf.getViewState();
				if (state.type === 'markdown' && (!state.state?.file || state.state.file === path)) throw noteFault('UNSAVED_EDITOR_CHANGES', 'UNSAVED_EDITOR_CHANGES');
			}
		}
	}
	private async loadEditors(path: string): Promise<void> {
		for (const leaf of this.leaves()) if (leaf.isDeferred) {
			const state = leaf.getViewState();
			if (state.type === 'markdown' && state.state?.file === path) await leaf.loadIfDeferred();
		}
	}
	private async baseline(target: Target, signal: AbortSignal): Promise<string> {
		this.assertTarget(target, signal); await this.loadEditors(target.path); this.assertTarget(target, signal);
		const version = target.file ? { mtime: target.file.stat.mtime, size: target.file.stat.size } : undefined;
		const text = target.file ? await this.app.vault.read(target.file) : '';
		this.assertTarget(target, signal);
		if (utf8.encode(text).length > BASELINE_BYTES) throw noteFault('NOTE_SIZE_LIMIT', 'RESOURCE_LIMIT');
		this.checkEditors(target.path, text);
		const hash = await digest(text);
		this.assertTarget(target, signal);
		if (target.file && (target.file.stat.mtime !== version!.mtime || target.file.stat.size !== version!.size || hash !== target.sourceHash)) throw noteFault('SOURCE_CHANGED', 'SOURCE_CHANGED');
		this.checkEditors(target.path, text);
		return text;
	}
	async prepareWrite(request: PrepareWriteRequest, signal: AbortSignal): Promise<PrepareWriteResult> {
		const lease = this.checkRequest(request); this.checkSignal(signal);
		if (!sameJson(request.tool, NOTE_WRITE_TOOL) || request.target.workspaceId !== lease.workspaceId) throw noteFault('NOTE_BINDING_MISMATCH');
		if (utf8.encode(request.content).length > NOTE_BYTES) throw noteFault('NOTE_SIZE_LIMIT', 'RESOURCE_LIMIT');
		if (this.preparations.size >= MAX_PREPARATIONS) throw noteFault('NOTE_TASK_LIMIT', 'RESOURCE_LIMIT');
		let target: Target;
		if (request.target.operation === 'create') {
			const registered = this.createdTargets.get(request.target.resourceId);
			if (!registered || !sameJson(registered.target, request.target)) throw noteFault('NOTE_TARGET_INVALID');
			target = { ...registered };
		} else {
			const source = this.sources.resolveWriteTarget(request.target.resourceId, request.target.baseRevision);
			target = { target: structuredClone(request.target), origin: source.source, path: source.path, file: source.file,
				generation: this.generation, valid: true, sourceHash: source.fullHash };
		}
		this.checkOrigin(target.origin, lease);
		this.preparing.add(target);
		try {
			const version = target.file ? { mtime: target.file.stat.mtime, size: target.file.stat.size } : undefined;
			const baseline = await this.baseline(target, signal);
			const [baseHash, contentHash] = await Promise.all([digest(baseline), digest(request.content)]);
			this.assertTarget(target, signal);
			if (target.file && (target.file.stat.mtime !== version!.mtime || target.file.stat.size !== version!.size)) throw noteFault('SOURCE_CHANGED', 'SOURCE_CHANGED');
			if (this.lease !== lease) throw noteFault('HOST_LEASE_MISMATCH', 'HOST_UNAVAILABLE');
			const binding: NoteWriteBinding = { profileId: this.options.profileId, commandEpoch: this.options.commandEpoch, deviceId: this.options.deviceId,
				workspaceId: lease.workspaceId, originClientId: target.origin.originClientId, originViewId: target.origin.originViewId,
				leaseId: lease.leaseId, hostConnectionId: lease.hostConnectionId, leaseEpoch: lease.leaseEpoch,
				targetResourceId: target.target.resourceId, preparationId: opaque('prepare'), baseHash, contentHash, targetVersion: String(++this.serial),
				implementationVersion: '1', policyVersion: '1', capabilityVersion: '1' };
			const prepared: Prepared = { ...target, binding, baseline, content: request.content, diff: diff(target.path, baseline, request.content) };
			const result: PrepareWriteResult = { target: structuredClone(target.target), tool: { ...NOTE_WRITE_TOOL }, contentHash, diff: prepared.diff, lease: structuredClone(lease), binding };
			const bytes = utf8.encode(baseline).length + utf8.encode(request.content).length;
			if (this.preparations.size >= MAX_PREPARATIONS || this.preparedBytes + bytes > MAX_PREPARED_BYTES || utf8.encode(JSON.stringify(result)).length > MAX_PREVIEW_JSON_BYTES)
				throw noteFault('NOTE_SIZE_LIMIT', 'RESOURCE_LIMIT');
			this.preparations.set(binding.preparationId, prepared); this.preparedBytes += bytes;
			return structuredClone(result);
		} finally { this.preparing.delete(target); }
	}
	private binding(preview: ApprovalPreview, historical = false): NoteWriteBinding {
		const binding = preview.binding;
		const validEpoch = binding && /^[1-9][0-9]*$/.test(binding.commandEpoch) && (binding.commandEpoch === this.options.commandEpoch || historical && BigInt(binding.commandEpoch) < BigInt(this.options.commandEpoch));
		if (!binding || binding.profileId !== this.options.profileId || !validEpoch ||
			binding.deviceId !== this.options.deviceId || binding.workspaceId !== this.options.workspaceId || binding.targetResourceId !== preview.target.resourceId ||
			binding.capabilityVersion !== '1' || binding.implementationVersion !== '1' || binding.policyVersion !== '1' || !sameJson(preview.tool, NOTE_WRITE_TOOL))
			throw noteFault('NOTE_BINDING_MISMATCH');
		return binding;
	}
	private prepared(preview: ApprovalPreview, signal: AbortSignal): Prepared {
		const binding = this.binding(preview);
		const value = this.preparations.get(binding.preparationId);
		if (!value || !sameJson(value.binding, binding) || !sameJson(value.target, preview.target) || !sameJson(preview.tool, NOTE_WRITE_TOOL) ||
			preview.content !== value.content || preview.diff !== value.diff) throw noteFault('NOTE_BINDING_MISMATCH');
		this.assertTarget(value, signal);
		return value;
	}
	async checkWrite(request: CheckWriteRequest, signal: AbortSignal): Promise<{ valid: true }> {
		this.checkRequest(request);
		const prepared = this.prepared(request.preview, signal);
		if (await this.baseline(prepared, signal) !== prepared.baseline) throw noteFault('SOURCE_CHANGED', 'SOURCE_CHANGED');
		return { valid: true };
	}
	private result(receipt: LocalNoteReceipt): HostReceipt {
		return { effectId: receipt.effectId, fingerprint: receipt.fingerprint, status: receipt.phase === 'completed' ? 'committed' : receipt.phase === 'failed_no_effect' ? 'failed_no_effect' : 'unknown_outcome',
			...(receipt.phase === 'completed' ? { receiptId: receipt.receiptId } : {}), ...(receipt.reason ? { reason: receipt.reason } : {}) };
	}
	private async reconcile(request: HostReceiptQuery | HostInvoke, observation: ReceiptObservation, signal: AbortSignal): Promise<HostReceipt> {
		const binding = this.binding(request.preview, true);
		if (observation.state === 'verified' && observation.receipt.phase !== 'received') return this.result(observation.receipt);
		let locator: NoteLocator | undefined;
		if (observation.state === 'verified') locator = observation.receipt.locator;
		else {
			const prepared = this.preparations.get(binding.preparationId);
			if (prepared && sameJson(prepared.binding, binding)) locator = { path: prepared.path, operation: prepared.target.operation,
				baseHash: prepared.binding.baseHash, contentHash: prepared.binding.contentHash };
		}
		const unknown: HostReceipt = { effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' };
		if (!locator) return unknown;
		try {
			const path = this.safePath(locator.path), file = this.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile) || file.extension !== 'md' || file.stat.size > NOTE_BYTES) return unknown;
			this.checkSignal(signal);
			const text = await this.app.vault.read(file);
			const hash = await digest(text);
			this.checkSignal(signal); this.checkRequest(request);
			if (file.path !== path || this.app.vault.getAbstractFileByPath(path) !== file || utf8.encode(text).length > NOTE_BYTES || hash !== locator.contentHash) return unknown;
			return { ...unknown, status: 'reconciled' };
		} catch { return unknown; }
	}
	async queryReceipt(request: HostReceiptQuery, signal: AbortSignal): Promise<HostReceipt> {
		this.checkRequest(request); this.checkSignal(signal);
		return this.reconcile(request, await this.receipts.lookup({ effectId: request.effectId, fingerprint: request.fingerprint, binding: this.binding(request.preview, true) }), signal);
	}
	async invoke(request: HostInvoke, signal: AbortSignal): Promise<HostReceipt> {
		this.checkRequest(request); this.checkSignal(signal);
		const p = request.preview, b = this.binding(p);
		if (request.capability !== 'note.write' || request.resource.resourceId !== p.target.resourceId ||
			request.resource.revision !== undefined && request.resource.revision !== p.target.baseRevision ||
			request.expectedRevision !== undefined && request.expectedRevision !== p.target.baseRevision || request.content !== p.content ||
			b.leaseId !== request.leaseId || b.hostConnectionId !== request.hostConnectionId || b.leaseEpoch !== request.leaseEpoch ||
			b.profileId !== this.options.profileId || b.commandEpoch !== this.options.commandEpoch || b.deviceId !== this.options.deviceId ||
			b.workspaceId !== this.options.workspaceId || b.targetResourceId !== p.target.resourceId) throw noteFault('NOTE_BINDING_MISMATCH');
		if (await noteFingerprint(request) !== request.fingerprint) throw noteFault('EFFECT_FINGERPRINT_MISMATCH');
		const active = this.inFlight.get(request.effectId);
		if (active) { if (active.fingerprint !== request.fingerprint) throw noteFault('EFFECT_FINGERPRINT_MISMATCH'); return active.operation; }
		if (this.inFlight.size >= 8) throw noteFault('NOTE_TASK_LIMIT', 'RESOURCE_LIMIT');
		const operation = this.execute(request, signal);
		this.inFlight.set(request.effectId, { fingerprint: request.fingerprint, operation });
		try { return await operation; } finally { this.inFlight.delete(request.effectId); }
	}
	private async execute(request: HostInvoke, signal: AbortSignal): Promise<HostReceipt> {
		const claim = { effectId: request.effectId, fingerprint: request.fingerprint, binding: this.binding(request.preview) };
		const previous = await this.receipts.lookup(claim);
		if (previous.state !== 'missing') return this.reconcile(request, previous, signal);
		const prepared = this.prepared(request.preview, signal);
		const run = async (): Promise<HostReceipt> => {
			this.prepared(request.preview, signal);
			if (await this.baseline(prepared, signal) !== prepared.baseline) throw noteFault('SOURCE_CHANGED', 'SOURCE_CHANGED');
			const received: LocalNoteReceipt = { ...claim, type: 'receipt', version: 1, profileId: this.options.profileId, deviceId: this.options.deviceId,
				commandEpoch: this.options.commandEpoch, receiptId: opaque('receipt'), receivedAt: new Date().toISOString(), phase: 'received',
				locator: { path: prepared.path, operation: prepared.target.operation, baseHash: prepared.binding.baseHash, contentHash: prepared.binding.contentHash } };
			const admitted = await this.receipts.begin(received);
			if (!admitted.fresh) return this.reconcile(request, admitted.observation, signal);
			let dispatched = false;
			const beforeMutation = () => {
				this.checkRequest(request); this.assertTarget(prepared, signal);
				const expiry = Date.parse(request.expiresAt);
				if (!Number.isFinite(expiry) || expiry <= Date.now()) throw noteFault('HOST_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
			};
			try {
				beforeMutation();
				if (prepared.file) {
					await this.app.vault.process(prepared.file, current => {
						beforeMutation(); this.checkEditors(prepared.path, current);
						if (current !== prepared.baseline) throw noteFault('SOURCE_CHANGED', 'SOURCE_CHANGED');
						dispatched = true;
						return prepared.content;
					});
				} else {
					this.checkEditors(prepared.path, ''); dispatched = true;
					await this.app.vault.create(prepared.path, prepared.content);
				}
				// Cancellation after an uncancelable API call cannot erase its completed physical fact.
				await this.receipts.finish(received, { phase: 'completed', postHash: prepared.binding.contentHash });
				return this.result({ ...received, phase: 'completed' });
			} catch (error) {
				if (!dispatched) {
					const reason = error instanceof BotRpcError ? error.data.reason : 'HOST_REJECTED';
					await this.receipts.finish(received, { phase: 'failed_no_effect', reason });
					throw error instanceof BotRpcError ? error : noteFault('HOST_OFFLINE', 'HOST_UNAVAILABLE');
				}
				// A rejected Vault promise or failed completion write does not establish that nothing happened.
				return { effectId: request.effectId, fingerprint: request.fingerprint, status: 'unknown_outcome' };
			}
		};
		// The App and shared queue survive module reconnect/reload; an old physical write cannot lose its target lock.
		const targetKey = await digest(prepared.path);
		return storageWriteQueue(this.app).run(`huhubot-note-target:${targetKey}`, run, 'host-note-effect');
	}
	dispose(): void {
		if (this.disposed) return;
		this.setLease(undefined); this.disposed = true;
		for (const event of this.events) this.app.vault.offref(event);
	}
}
