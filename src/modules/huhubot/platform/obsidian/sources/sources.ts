import { isHostLeaseRenewal } from '../../../core/protocol/host-lease';
import { MarkdownView, TFile, TFolder, type App, type WorkspaceLeaf } from 'obsidian';
import type { HostLease, HostSearchRequest, HostSearchResult, SourceIdentity, SourceOpenResult, SourceRange, SourceScope, SourceSnapshot } from '../../../api';
import { BotRpcError, type ProtocolTimers } from '../../../core/protocol/connection';
import { truncateUtf8, type HostSources, type HostWriteSources, type SourceContent, type SourceWriteOrigin, type SourceWriteTarget } from './port';

const MAX_SOURCE_BYTES = 1_048_576;
const MAX_CACHE_BYTES = 8_388_608;
const MAX_RECORDS = 128;
const MAX_SCOPE_FILES = 10_000;
const utf8 = new TextEncoder();
interface RecordEntry { source: SourceSnapshot; text: string; file: TFile; path: string; view?: MarkdownView; fullHash: string }
interface FileVersion { path: string; mtime: number; size: number }
interface ScopeFile { file: TFile; path: string }
interface ScopeEntry { source: SourceScope; files: readonly ScopeFile[] }
interface CursorEntry { fingerprint: string; index: number }
export interface ObsidianSourceOptions { workspaceId: string; originClientId: string; timers: ProtocolTimers }

function fault(reason: string, kind: 'CAPABILITY_DENIED' | 'SOURCE_CHANGED' | 'RESOURCE_LIMIT' | 'HOST_UNAVAILABLE' = 'CAPABILITY_DENIED'): BotRpcError {
	return new BotRpcError(-32000, { kind, reason, retryable: false, correlationId: 'host-sources' });
}
function opaque(prefix: string): string {
	return `${prefix}:${Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
async function hash(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', utf8.encode(text));
	return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
function same(left: unknown, right: unknown): boolean {
	if (left === right) return true;
	if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
	if (Array.isArray(left) !== Array.isArray(right)) return false;
	const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
	const keys = Object.keys(a);
	return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && same(a[key], b[key]));
}
function validOffset(text: string, offset: number): boolean {
	if (!Number.isInteger(offset) || offset < 0 || offset > text.length) return false;
	const before = text.charCodeAt(offset - 1), after = text.charCodeAt(offset);
	return !(before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff);
}
/** Only explicit host objects enter this registry. Wire paths never resolve to a Vault file. */
export class ObsidianSources implements HostSources, HostWriteSources {
	private lease?: HostLease;
	private generation = 0;
	private serial = 0n;
	private cachedBytes = 0;
	private active = 0;
	private disposed = false;
	private readonly records = new Map<string, RecordEntry>();
	private readonly scopes = new Map<string, ScopeEntry>();
	private readonly cursors = new Map<string, CursorEntry>();
	private readonly views = new WeakMap<object, string>();
	private readonly controllers = new Set<AbortController>();
	constructor(private readonly app: App, private readonly options: ObsidianSourceOptions) {}

	setLease(lease: HostLease | undefined): void {
		if (isHostLeaseRenewal(this.lease, lease)) {
			this.lease!.expiresAt = lease!.expiresAt; return;
		}
		this.generation++;
		this.lease = undefined;
		this.records.clear(); this.scopes.clear(); this.cursors.clear(); this.cachedBytes = 0;
		for (const controller of this.controllers) controller.abort();
		if (lease && lease.workspaceId !== this.options.workspaceId) throw fault('WORKSPACE_MISMATCH');
		this.lease = lease ? structuredClone(lease) : undefined;
	}
	private current(): HostLease {
		const lease = this.lease;
		const expiry = lease ? Date.parse(lease.expiresAt) : NaN;
		if (this.disposed || !lease || !Number.isFinite(expiry) || expiry <= Date.now()) throw fault('SOURCE_LEASE_UNAVAILABLE', 'HOST_UNAVAILABLE');
		return lease;
	}
	private origin(leaf: WorkspaceLeaf): string {
		if (leaf.view.app !== this.app) throw fault('SOURCE_ORIGIN_INVALID');
		let originViewId = this.views.get(leaf.view);
		if (!originViewId) { originViewId = opaque('view'); this.views.set(leaf.view, originViewId); }
		return originViewId;
	}
	private identity(originViewId: string, resourceId: string, digest: string): SourceIdentity {
		const lease = this.current();
		return { resourceId, workspaceId: lease.workspaceId, originClientId: this.options.originClientId, originViewId,
			hostConnectionId: lease.hostConnectionId, hostLeaseId: lease.leaseId, hostLeaseEpoch: lease.leaseEpoch,
			revision: String(++this.serial), hash: digest };
	}
	private validFile(file: TFile, enforceSize = true): void {
		if (!(file instanceof TFile) || file.extension !== 'md' || this.privatePath(file.path) ||
			this.app.vault.getAbstractFileByPath(file.path) !== file) throw fault('SOURCE_FILE_INVALID');
		if (enforceSize && file.stat.size > MAX_SOURCE_BYTES) throw fault('SOURCE_SIZE_LIMIT', 'RESOURCE_LIMIT');
	}
	private unchangedFile(file: TFile, version: FileVersion): void {
		if (file.path !== version.path || file.stat.mtime !== version.mtime || file.stat.size !== version.size ||
			this.app.vault.getAbstractFileByPath(version.path) !== file) throw fault('SOURCE_CHANGED', 'SOURCE_CHANGED');
	}
	private privatePath(path: string): boolean {
		const config = this.app.vault.configDir;
		return path.startsWith('/') || path.includes('\\') || path.includes(':') || path.includes('\0') ||
			path.split('/').some((segment) => segment === '..' || ['.huhu', '.git'].includes(segment)) ||
			!!config && (path === config || path.startsWith(`${config}/`));
	}
	private async task<T>(run: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
		this.current();
		if (signal?.aborted) throw fault('SOURCE_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
		if (this.active >= 8) throw fault('SOURCE_TASK_LIMIT', 'RESOURCE_LIMIT');
		this.active++;
		const generation = this.generation;
		const controller = new AbortController(); this.controllers.add(controller);
		const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true });
		const cancel = this.options.timers.after(3000, abort);
		let rejectAbort: (() => void) | undefined;
		const aborted = new Promise<never>((_resolve, reject) => {
			rejectAbort = () => reject(fault('SOURCE_REQUEST_ABORTED', 'HOST_UNAVAILABLE'));
			controller.signal.addEventListener('abort', rejectAbort, { once: true });
		});
		// The underlying Vault read cannot be canceled. Keep its quota until it really settles.
		const operation = Promise.resolve().then(() => run(controller.signal)).finally(() => { this.active--; });
		try {
			const result = await Promise.race([operation, aborted]);
			this.current();
			if (generation !== this.generation || controller.signal.aborted) throw fault('SOURCE_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
			return result;
		} catch (error) {
			if (error instanceof BotRpcError) throw error;
			throw fault('SOURCE_READ_FAILED', 'HOST_UNAVAILABLE');
		} finally {
			cancel(); signal?.removeEventListener('abort', abort);
			if (rejectAbort) controller.signal.removeEventListener('abort', rejectAbort);
			this.controllers.delete(controller);
		}
	}
	private async save(file: TFile, originViewId: string, text: string, fullText: string, kind: 'note' | 'selection', range?: SourceRange,
		scopeResourceIds: string[] = [], view?: MarkdownView, signal?: AbortSignal, fileVersion?: FileVersion, capturedPath = fileVersion?.path ?? file.path): Promise<SourceSnapshot> {
		if (utf8.encode(fullText).length > MAX_SOURCE_BYTES || utf8.encode(text).length + this.cachedBytes > MAX_CACHE_BYTES ||
			this.records.size + this.scopes.size >= MAX_RECORDS) throw fault('SOURCE_CACHE_LIMIT', 'RESOURCE_LIMIT');
		const generation = this.generation;
		const [digest, fullHash] = await Promise.all([hash(text), hash(fullText)]);
		if (signal?.aborted || generation !== this.generation) throw fault('SOURCE_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
		// Hashing yields too: a background read remains tied to the original Vault object until publication.
		if (fileVersion) this.unchangedFile(file, fileVersion);
		const source: SourceSnapshot = { ...this.identity(originViewId, opaque('source'), digest), kind, scopeResourceIds,
			title: Array.from(file.basename).slice(0, 256).join(''), ...(range ? { range } : {}) };
		if (utf8.encode(text).length + this.cachedBytes > MAX_CACHE_BYTES || this.records.size + this.scopes.size >= MAX_RECORDS)
			throw fault('SOURCE_CACHE_LIMIT', 'RESOURCE_LIMIT');
		this.records.set(source.resourceId, { source: structuredClone(source), file, path: capturedPath, text, view, fullHash });
		this.cachedBytes += utf8.encode(text).length;
		return structuredClone(source);
	}
	async captureSelection(view: MarkdownView, signal?: AbortSignal): Promise<SourceSnapshot> {
		if (!(view instanceof MarkdownView) || view.app !== this.app || view.leaf.view !== view || !view.file) return Promise.reject(fault('SOURCE_ORIGIN_INVALID'));
		this.validFile(view.file);
		const selections = view.editor.listSelections();
		if (selections.length !== 1) return Promise.reject(fault('SOURCE_SELECTION_REQUIRED'));
		const selected = selections[0]!;
		const from = view.editor.posToOffset(selected.anchor), to = view.editor.posToOffset(selected.head);
		const range = { start: Math.min(from, to), end: Math.max(from, to) };
		const fullText = view.editor.getValue();
		if (range.start === range.end || !validOffset(fullText, range.start) || !validOffset(fullText, range.end)) return Promise.reject(fault('SOURCE_SELECTION_REQUIRED'));
		const file = view.file;
		const capturedPath = file.path;
		const originViewId = this.origin(view.leaf);
		return this.task((active) => this.save(file, originViewId, fullText.slice(range.start, range.end), fullText, 'selection', range, [], view, active, undefined, capturedPath), signal);
	}
	async captureNote(file: TFile, leaf: WorkspaceLeaf, signal?: AbortSignal): Promise<SourceSnapshot> {
		this.validFile(file);
		const view = leaf.view instanceof MarkdownView && leaf.view.file === file ? leaf.view : undefined;
		const captured = view?.editor.getValue();
		const originViewId = this.origin(leaf);
		const fileVersion = { path: file.path, mtime: file.stat.mtime, size: file.stat.size };
		return this.task(async (active) => {
			if (file.path !== fileVersion.path || file.stat.mtime !== fileVersion.mtime || file.stat.size !== fileVersion.size)
				throw fault('SOURCE_CHANGED', 'SOURCE_CHANGED');
			// Editor text is already a synchronous snapshot; only background Vault reads resolve a live file.
			if (captured === undefined) this.unchangedFile(file, fileVersion);
			const text = captured ?? await this.app.vault.read(file);
			if (active.aborted) throw fault('SOURCE_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
			if (captured === undefined) this.unchangedFile(file, fileVersion);
			return this.save(file, originViewId, text, text, 'note', undefined, [], view, active, captured === undefined ? fileVersion : undefined, fileVersion.path);
		}, signal);
	}
	async captureFolder(folder: TFolder, leaf: WorkspaceLeaf, signal?: AbortSignal): Promise<SourceScope> {
		if (!(folder instanceof TFolder) || this.privatePath(folder.path) ||
			this.app.vault.getAbstractFileByPath(folder.path) !== folder) return Promise.reject(fault('SOURCE_FOLDER_INVALID'));
		const files: TFile[] = [], pending = [...folder.children];
		while (pending.length) {
			const child = pending.pop()!;
			if (child instanceof TFolder) pending.push(...child.children);
			else if (child instanceof TFile && child.extension === 'md') files.push(child);
			if (files.length + pending.length > MAX_SCOPE_FILES) return Promise.reject(fault('SOURCE_SCOPE_LIMIT', 'RESOURCE_LIMIT'));
		}
		return this.captureScope('folder', files, leaf, signal);
	}
	async captureVault(leaf: WorkspaceLeaf, signal?: AbortSignal): Promise<SourceScope> {
		return this.captureScope('vault', this.app.vault.getMarkdownFiles(), leaf, signal);
	}
	private captureScope(kind: SourceScope['kind'], candidates: TFile[], leaf: WorkspaceLeaf, signal?: AbortSignal): Promise<SourceScope> {
		const originViewId = this.origin(leaf);
		const files = candidates.filter((file) => {
			try { this.validFile(file, false); return true; } catch { return false; }
		}).sort((a, b) => a.path.localeCompare(b.path));
		if (files.length > MAX_SCOPE_FILES || this.records.size + this.scopes.size >= MAX_RECORDS) return Promise.reject(fault('SOURCE_SCOPE_LIMIT', 'RESOURCE_LIMIT'));
		const metadata = files.map((file) => `${file.path}\0${file.stat.mtime}\0${file.stat.size}`).join('\n');
		const members = files.map((file) => ({ file, path: file.path }));
		return this.task(async (active) => {
			if (utf8.encode(metadata).length > MAX_SOURCE_BYTES) throw fault('SOURCE_SCOPE_LIMIT', 'RESOURCE_LIMIT');
			const digest = await hash(metadata);
			if (active.aborted) throw fault('SOURCE_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
			if (this.records.size + this.scopes.size >= MAX_RECORDS) throw fault('SOURCE_SCOPE_LIMIT', 'RESOURCE_LIMIT');
			const source: SourceScope = { ...this.identity(originViewId, opaque('scope'), digest), kind };
			this.scopes.set(source.resourceId, { source: structuredClone(source), files: members });
			return structuredClone(source);
		}, signal);
	}
	async readSnapshot(source: SourceSnapshot, signal: AbortSignal): Promise<SourceContent> {
		this.current();
		const entry = this.records.get(source.resourceId);
		if (signal.aborted || !entry || !same(source, entry.source)) throw fault('SOURCE_SNAPSHOT_INVALID');
		return { source: structuredClone(entry.source), text: entry.text };
	}
	/** Writing requires current live identity; reading the immutable captured editor snapshot does not. */
	captureWriteOrigin(leaf: WorkspaceLeaf): SourceWriteOrigin {
		const lease = this.current();
		return { workspaceId: lease.workspaceId, originClientId: this.options.originClientId, originViewId: this.origin(leaf),
			hostConnectionId: lease.hostConnectionId, hostLeaseId: lease.leaseId, hostLeaseEpoch: lease.leaseEpoch };
	}
	resolveWriteTarget(resourceId: string, revision: string): SourceWriteTarget {
		this.current();
		const entry = this.records.get(resourceId);
		if (!entry) throw fault('NOTE_TARGET_INVALID');
		if (revision !== entry.source.revision || entry.file.path !== entry.path || this.app.vault.getAbstractFileByPath(entry.path) !== entry.file)
			throw fault('SOURCE_CHANGED', 'SOURCE_CHANGED');
		this.validFile(entry.file);
		return { source: structuredClone(entry.source), file: entry.file, path: entry.path, fullHash: entry.fullHash };
	}
	async searchSnapshots(request: HostSearchRequest, signal: AbortSignal): Promise<HostSearchResult> {
		this.current();
		if (!request.sources.length && !request.scopes.length) throw fault('SOURCE_SCOPE_INVALID');
		const generation = this.generation;
		const selected = request.sources.map((source) => {
			const entry = this.records.get(source.resourceId);
			if (!entry || !same(entry.source, source)) throw fault('SOURCE_SNAPSHOT_INVALID');
			return entry;
		});
		const scopes = request.scopes.map((scope) => {
			const entry = this.scopes.get(scope.resourceId);
			if (!entry || !same(entry.source, scope)) throw fault('SOURCE_SCOPE_INVALID');
			return entry;
		});
		const fingerprint = await hash(JSON.stringify({ ...request, cursor: undefined }));
		if (signal.aborted || generation !== this.generation) throw fault('SOURCE_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
		const cursor = request.cursor ? this.cursors.get(request.cursor) : undefined;
		if (request.cursor && (!cursor || cursor.fingerprint !== fingerprint)) throw fault('SOURCE_CURSOR_INVALID');
		const candidates: Array<RecordEntry | { file: TFile; path: string; scope: ScopeEntry }> = [...selected];
		const seen = new Set(selected.filter((entry) => entry.source.kind === 'note').map((entry) => entry.file));
		for (const scope of scopes) for (const member of scope.files) if (!seen.has(member.file)) { seen.add(member.file); candidates.push({ ...member, scope }); }
		const matches: HostSearchResult['matches'] = [];
		let index = cursor?.index ?? 0, bytes = 0, inspected = 0;
		for (; index < candidates.length && inspected < 32; index++, inspected++) {
			if (signal.aborted || generation !== this.generation) throw fault('SOURCE_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
			const candidate = candidates[index]!;
			let entry: RecordEntry;
			if ('scope' in candidate) {
				if (candidate.file.path !== candidate.path) throw fault('SOURCE_CHANGED', 'SOURCE_CHANGED');
				this.validFile(candidate.file);
				const version = { path: candidate.path, mtime: candidate.file.stat.mtime, size: candidate.file.stat.size };
				const text = await this.task(() => {
					this.unchangedFile(candidate.file, version);
					return this.app.vault.read(candidate.file);
				}, signal);
				this.unchangedFile(candidate.file, version);
				if (!text.includes(request.query)) continue;
				const source = await this.task((active) => this.save(candidate.file, candidate.scope.source.originViewId, text, text, 'note', undefined,
					[candidate.scope.source.resourceId], undefined, active, version), signal);
				entry = this.records.get(source.resourceId)!;
			} else entry = candidate;
			const start = entry.text.indexOf(request.query);
			if (start < 0) continue;
			const excerpt = Array.from(entry.text.slice(start)).slice(0, 256).join('');
			const text = truncateUtf8(excerpt, request.maxBytes - bytes);
			if (!text) throw fault('SOURCE_SIZE_LIMIT', 'RESOURCE_LIMIT');
			const absoluteStart = (entry.source.range?.start ?? 0) + start;
			matches.push({ source: structuredClone(entry.source), text, range: { start: absoluteStart, end: absoluteStart + text.length } });
			bytes += utf8.encode(text).length;
			if (matches.length >= request.limit || bytes >= request.maxBytes) { index++; break; }
		}
		this.current();
		if (signal.aborted || generation !== this.generation) throw fault('SOURCE_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
		let nextCursor: string | undefined;
		if (request.cursor) this.cursors.delete(request.cursor);
		if (index < candidates.length) {
			if (this.cursors.size >= MAX_RECORDS) throw fault('SOURCE_CURSOR_LIMIT', 'RESOURCE_LIMIT');
			nextCursor = opaque('cursor'); this.cursors.set(nextCursor, { fingerprint, index });
		}
		return { matches, truncated: index < candidates.length, ...(nextCursor ? { nextCursor } : {}) };
	}
	async openSource(source: SourceSnapshot, signal?: AbortSignal): Promise<SourceOpenResult> {
		return this.task(async (active) => {
			const entry = this.records.get(source.resourceId);
			if (!entry || !same(source, entry.source)) throw fault('SOURCE_SNAPSHOT_INVALID');
			this.validFile(entry.file);
			const live = entry.view?.file === entry.file ? entry.view.editor.getValue() : await this.app.vault.read(entry.file);
			const changed = await hash(live) !== entry.fullHash;
			if (active.aborted) throw fault('SOURCE_REQUEST_ABORTED', 'HOST_UNAVAILABLE');
			const leaf = this.app.workspace.getLeaf('tab');
			await leaf.openFile(entry.file);
			if (!changed && source.range && leaf.view instanceof MarkdownView)
				leaf.view.editor.setSelection(leaf.view.editor.offsetToPos(source.range.start), leaf.view.editor.offsetToPos(source.range.end));
			return { source: structuredClone(source), changed };
		}, signal);
	}
	dispose(): void { this.setLease(undefined); this.disposed = true; }
}
