import { t } from '../../../../shared/i18n';
import { CONTROL_LIMITS, ControlProtocolError } from '../../../../shared/native/control-wire';
import type {
	HistoryFence,
	HistoryPage,
	NativeSession,
	NativeSessionSummary,
} from '../../platform/desktop/server/agent-data-client';
import type { NativeHistory } from '../../platform/history/service';
import { NativeResumeError, type ImportResult, type OpenResult, type ResumeResult } from '../launch/native-resume';
import type { NativeResumeService } from '../launch/native-resume';

/** Explicit Space-bound read requests. A missing space is rejected instead of using UI focus/cwd. */
export interface HistoryListRequest {
	/** Required unless `unassigned` is set. */
	spaceId?: string;
	/** List the rows of the vault projection that no Space owns yet (the candidates for an explicit import). */
	unassigned?: boolean;
	query?: string;
	filter?: 'all' | 'active' | 'archived' | 'favorite';
	provider?: string;
	cursor?: string;
	limit?: number;
}
export interface HistoryPreviewRequest {
	spaceId: string;
	key: string;
	sourceRef?: string;
}
/** Public projection of one history row: no account environment, transcript path or provider source list. */
export interface HistoryRowView {
	key: string;
	sourceRef?: string;
	agentId: string;
	sessionId: string;
	title: string;
	cwd: string;
	modifiedAtMs: number;
	/** Absent for an unassigned row. */
	spaceId?: string;
	sourceStatus: NonNullable<NativeSessionSummary['sourceStatus']>;
	sourceReason?: string;
	favorite?: boolean;
	archived?: boolean;
}
export interface HistoryListResult {
	rows: HistoryRowView[];
	nextCursor?: string;
	revision: number;
}
export interface HistoryPreviewResult {
	row: HistoryRowView;
	text: string;
	status: 'available' | 'partial' | 'unavailable';
	sourceStatus?: NativeSessionSummary['sourceStatus'];
	sourceReason?: string;
	reason?: string;
	diagnostic?: string;
}
export interface HistorySpaceOwner {
	/** A missing result is not inferred from cwd; only the durable Space owner may admit a row. */
	spaceFor(row: NativeSessionSummary): string | undefined;
}
/** Leaves room for the response envelope around `data`. */
const ENVELOPE_MARGIN = 4096;
const DATA_BUDGET = CONTROL_LIMITS.responseBytes - ENVELOPE_MARGIN;
const MAX_LIMIT = 1000;
const encoder = new TextEncoder();
const bytes = (value: unknown) => encoder.encode(JSON.stringify(value)).byteLength;
const clip = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

function requireSpace(spaceId: string): string {
	if (!spaceId.trim()) throw new ControlProtocolError(t('agent.historyControl.needSpace'), 'TARGET_REQUIRED');
	return spaceId;
}
function stale(message: string): ControlProtocolError {
	return new ControlProtocolError(message, 'STALE_RUNTIME');
}
/** Native fence failures are reported by the helper as plain text; they still mean "refresh and retry". */
function nativeFailure(error: unknown): unknown {
	const message = error instanceof Error ? error.message : String(error);
	return /revision changed|refresh required|expired/i.test(message)
		? stale(t('agent.historyControl.revisionChanged'))
		: error;
}
interface Position {
	offset: number;
	revision: number;
	annotations: number;
	filter: string;
}
function filterTag(request: HistoryListRequest): string {
	return encodeURIComponent(JSON.stringify([request.query ?? '', request.filter ?? 'all', request.provider ?? '']));
}
function decodeCursor(cursor: string | undefined, spaceId: string, tag: string): Position | undefined {
	if (!cursor) return undefined;
	if (cursor.length > 1024) throw stale(t('agent.historyControl.cursorExpired'));
	const [encodedSpace, revision, offset, annotations, encodedTag, extra] = cursor.split(':');
	if (
		extra !== undefined ||
		encodedSpace !== encodeURIComponent(spaceId) ||
		!/^\d+$/.test(revision ?? '') ||
		!/^\d+$/.test(offset ?? '') ||
		!/^\d+$/.test(annotations ?? '') ||
		encodedTag !== tag
	)
		throw stale(t('agent.historyControl.cursorExpired'));
	return { revision: Number(revision), offset: Number(offset), annotations: Number(annotations), filter: tag };
}
/** The cursor names the exact native row offset of the first row not yet returned. */
function encodeCursor(spaceId: string, position: Position): string {
	return `${encodeURIComponent(spaceId)}:${position.revision}:${position.offset}:${position.annotations}:${position.filter}`;
}
function abortable<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
	if (!signal) return work;
	if (signal.aborted)
		return Promise.reject(new ControlProtocolError(t('agent.historyControl.cancelled'), 'WAIT_CANCELLED'));
	return new Promise<T>((resolve, reject) => {
		const cancel = () => reject(new ControlProtocolError(t('agent.historyControl.cancelled'), 'WAIT_CANCELLED'));
		signal.addEventListener('abort', cancel, { once: true });
		work.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
	});
}
/**
 * Read-only history adapter for control/CLI callers. It deliberately consumes the
 * existing NativeHistory owner and never starts a runtime or writes a second index.
 */
export class HistoryCommands {
	constructor(
		private readonly history: () => NativeHistory,
		private readonly owner: HistorySpaceOwner,
		/** Brings the index current (bounded scan plus owner binding) when this session never scanned it. */
		private readonly prepare?: () => Promise<void>,
		/** Explicit import / continue / open. Absent only in read-only fixtures. */
		private readonly actions?: () => NativeResumeService,
	) {}
	private async ready(signal?: AbortSignal): Promise<void> {
		if (this.prepare && this.history().stale) await abortable(this.prepare(), signal);
	}
	private view(row: NativeSessionSummary, spaceId?: string): HistoryRowView {
		const meta = this.history().meta(row.key);
		return {
			key: row.key,
			...(row.sourceRef ? { sourceRef: row.sourceRef } : {}),
			agentId: row.agentId,
			sessionId: row.sessionId,
			title: clip(meta.title || row.title, 200),
			cwd: clip(row.cwd, 512),
			modifiedAtMs: row.modifiedAtMs,
			...(spaceId ? { spaceId } : {}),
			sourceStatus: row.sourceStatus ?? 'unknown',
			...(row.sourceReason ? { sourceReason: clip(row.sourceReason, 256) } : {}),
			...(meta.favorite ? { favorite: true } : {}),
			...(meta.archived ? { archived: true } : {}),
		};
	}
	async list(request: HistoryListRequest, signal?: AbortSignal): Promise<HistoryListResult> {
		const unassigned = request.unassigned === true;
		if (unassigned && request.spaceId) throw new ControlProtocolError(t('agent.historyControl.unassignedScope'));
		// An unassigned listing is scoped by this token instead of a Space; it never names a Space.
		const spaceId = unassigned ? undefined : requireSpace(request.spaceId ?? '');
		const scope = spaceId ?? '*unassigned*';
		const limit = request.limit ?? 100;
		if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT)
			throw new ControlProtocolError(t('agent.historyControl.invalidLimit'));
		const tag = filterTag(request);
		const cursor = decodeCursor(request.cursor, scope, tag);
		await this.ready(signal);
		const history = this.history();
		const annotations = history.metadataRevision;
		if (cursor && cursor.annotations !== annotations) throw stale(t('agent.historyControl.revisionChanged'));
		const rows: HistoryRowView[] = [];
		let offset = cursor?.offset ?? 0;
		let fence: HistoryFence | undefined = cursor ? { revision: cursor.revision } : undefined;
		let revision = cursor?.revision ?? 0;
		let next: number | undefined;
		try {
			scan: for (;;) {
				const page: HistoryPage = await history.query(
					request.query ?? '',
					offset,
					signal,
					request.filter ?? 'all',
					'vault',
					fence,
				);
				fence ??= { revision: page.revision };
				revision = page.revision;
				for (const [index, native] of page.rows.entries()) {
					if ((this.owner.spaceFor(native) ?? undefined) !== spaceId) continue;
					if (request.provider && native.agentId !== request.provider) continue;
					const view = this.view(native, spaceId);
					if (
						rows.length >= limit ||
						bytes({ rows: [...rows, view], revision, nextCursor: 'x'.repeat(256) }) > DATA_BUDGET
					) {
						next = offset + index;
						break scan;
					}
					rows.push(view);
				}
				offset += page.rows.length;
				if (!page.rows.length || offset >= page.total) break;
			}
		} catch (error) {
			throw nativeFailure(error);
		}
		if (next === undefined) return { rows, revision };
		return {
			rows,
			revision,
			nextCursor: encodeCursor(scope, { offset: next, revision, annotations, filter: tag }),
		};
	}
	/**
	 * Find one indexed row by its exact source reference, whoever owns it. Internal: the result carries the
	 * account environment and transcript path and must never be returned to a caller.
	 */
	private async locate(sourceRef: string, signal?: AbortSignal): Promise<NativeSessionSummary> {
		await this.ready(signal);
		const history = this.history();
		let offset = 0;
		let fence: HistoryFence | undefined;
		try {
			for (;;) {
				const page = await history.query('', offset, signal, 'all', 'vault', fence);
				fence ??= { revision: page.revision };
				const row = page.rows.find((candidate) => candidate.sourceRef === sourceRef);
				if (row) return row;
				offset += page.rows.length;
				if (!page.rows.length || offset >= page.total) break;
			}
		} catch (error) {
			throw nativeFailure(error);
		}
		throw new ControlProtocolError(t('agent.historyControl.notIndexed'), 'TARGET_NOT_FOUND');
	}
	private service(): NativeResumeService {
		if (!this.actions)
			throw new ControlProtocolError(t('agent.historyControl.unavailable'), 'CAPABILITY_UNAVAILABLE');
		return this.actions();
	}
	/** Explicitly bind an exact source to a Space. Re-importing the same source returns the same Session. */
	async importSource(request: { spaceId: string; source: string }, signal?: AbortSignal): Promise<ImportResult> {
		const spaceId = requireSpace(request.spaceId);
		const row = await this.locate(request.source, signal);
		return this.guard(() => this.service().importSource({ spaceId, row }));
	}
	/** Attach a running conversation or resume an ended one as a new generation of its Session. */
	async resumeSource(request: { spaceId: string; source: string }, signal?: AbortSignal): Promise<ResumeResult> {
		const spaceId = requireSpace(request.spaceId);
		const row = await this.locate(request.source, signal);
		return this.guard(() => this.service().resumeSource({ spaceId, row, foreground: false }));
	}
	async openSession(request: { sessionId: string; spaceId?: string }): Promise<OpenResult> {
		return this.guard(() => this.service().open({ ...request, foreground: false }));
	}
	/** The control layer reports stable codes; the localized text travels as the message. */
	private async guard<T>(work: () => Promise<T>): Promise<T> {
		try {
			return await work();
		} catch (error) {
			if (error instanceof NativeResumeError) throw new ControlProtocolError(error.message, error.code);
			throw error;
		}
	}
	async preview(request: HistoryPreviewRequest, signal?: AbortSignal): Promise<HistoryPreviewResult> {
		const spaceId = requireSpace(request.spaceId);
		await this.ready(signal);
		const history = this.history();
		let offset = 0;
		let fence: HistoryFence | undefined;
		let row: NativeSessionSummary | undefined;
		try {
			for (;;) {
				const page = await history.query('', offset, signal, 'all', 'vault', fence);
				fence ??= { revision: page.revision };
				row = page.rows.find(
					(candidate) => candidate.key === request.key && this.owner.spaceFor(candidate) === spaceId,
				);
				offset += page.rows.length;
				if (row || !page.rows.length || offset >= page.total) break;
			}
		} catch (error) {
			throw nativeFailure(error);
		}
		if (!row || (request.sourceRef && row.sourceRef !== request.sourceRef))
			throw new ControlProtocolError(t('agent.historyControl.notAdmitted'), 'TARGET_NOT_FOUND');
		const view = this.view(row, spaceId);
		// A row already known to be unreadable never reaches the helper for a body.
		if (row.sourceStatus && row.sourceStatus !== 'available') return this.unavailable(view, row);
		let value: NativeSession;
		try {
			value = await history.read(row, signal);
		} catch (error) {
			return {
				row: view,
				text: '',
				status: 'unavailable',
				diagnostic: clip(error instanceof Error ? error.message : String(error), 256),
			};
		}
		// The helper re-verifies the source at read time and may report a status instead of a body.
		if (value.sourceStatus && value.sourceStatus !== 'available')
			return this.unavailable(this.view({ ...row, ...value }, spaceId), value);
		return this.fit(view, value.text);
	}
	private unavailable(view: HistoryRowView, source: NativeSessionSummary): HistoryPreviewResult {
		return {
			row: view,
			text: '',
			status: 'unavailable',
			sourceStatus: source.sourceStatus,
			...(source.sourceReason ? { sourceReason: clip(source.sourceReason, 256) } : {}),
		};
	}
	/** The verified body is cut to the response budget, with an explicit partial status instead of a capacity failure. */
	private fit(row: HistoryRowView, text: string): HistoryPreviewResult {
		const make = (body: string, partial: boolean): HistoryPreviewResult => ({
			row,
			text: body,
			status: partial ? 'partial' : 'available',
			...(partial ? { reason: 'response-capacity' } : {}),
		});
		if (bytes(make(text, false)) <= DATA_BUDGET) return make(text, false);
		let low = 0,
			high = text.length;
		while (low < high) {
			const mid = Math.ceil((low + high) / 2);
			if (bytes(make(text.slice(0, mid), true)) <= DATA_BUDGET) low = mid;
			else high = mid - 1;
		}
		// Do not split a surrogate pair.
		const code = text.charCodeAt(low - 1);
		return make(text.slice(0, code >= 0xd800 && code <= 0xdbff ? low - 1 : low), true);
	}
}
