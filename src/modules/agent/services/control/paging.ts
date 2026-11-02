import {
	CONTROL_LIMITS,
	ControlProtocolError,
	controlJsonBytes,
	type ControlJson,
	type ControlResponse,
} from '../../../../shared/native/control-wire';
import type { ManagedRuntimeRef } from '../../core/workspace/managed-runtime';
import type { TerminalSession } from '../terminal/session';
import type { InboxRecipient } from '../../core/inbox/model';

export function controlData(value: unknown): ControlJson {
	controlJsonBytes(value);
	return value as ControlJson;
}
export type ResponseEnvelope = Omit<Extract<ControlResponse, { ok: true }>, 'data'>;
interface PageToken {
	readonly key: string;
	readonly revision: number;
	readonly expires: number;
	readonly screen?: string;
	readonly recipient?: InboxRecipient;
	readonly highWaterSequence?: number;
	readonly generation?: number;
}
const TOKEN_LIMIT = 16,
	TTL = 10000;

/** Retains only bounded query/position fences, never a second Vault or screen snapshot. */
export class ControlPaging {
	private readonly tokens = new Map<string, PageToken>();
	clear(): void {
		this.tokens.clear();
	}
	private expire(): void {
		for (const [id, token] of this.tokens) if (token.expires <= Date.now()) this.tokens.delete(id);
	}
	private issue(token: PageToken): string {
		this.expire();
		if (this.tokens.size >= TOKEN_LIMIT)
			throw new ControlProtocolError('Read cursor capacity exceeded', 'CAPACITY_EXCEEDED');
		const id = crypto.randomUUID();
		this.tokens.set(id, token);
		return id;
	}
	private position(
		cursor: string,
		key: string,
		revision: number,
	): { id: string; token: PageToken; offset: number; row?: number } {
		this.expire();
		if (cursor.length > 128) throw new ControlProtocolError('Read cursor expired', 'STALE_RUNTIME');
		const [id, a, b, extra] = cursor.split('/'),
			token = this.tokens.get(id ?? '');
		if (
			!token ||
			token.key !== key ||
			token.revision !== revision ||
			extra !== undefined ||
			!/^\d+$/.test(a ?? '') ||
			(b !== undefined && !/^\d+$/.test(b))
		)
			throw new ControlProtocolError('Read cursor expired or query changed', 'STALE_RUNTIME');
		const first = Number(a),
			second = b === undefined ? undefined : Number(b);
		if (!Number.isSafeInteger(first) || !Number.isSafeInteger(second ?? 0))
			throw new ControlProtocolError('Invalid read cursor');
		return { id: id!, token, offset: second ?? first, ...(second === undefined ? {} : { row: first }) };
	}
	list(
		rows: Iterable<unknown>,
		options: { key: string; revision: number; cursor?: string; limit?: number },
		envelope: ResponseEnvelope,
	): ControlJson {
		const limit = options.limit ?? 100;
		if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
			throw new ControlProtocolError('Invalid list limit');
		const position = options.cursor ? this.position(options.cursor, options.key, options.revision) : undefined;
		if (position?.token.screen || position?.row !== undefined)
			throw new ControlProtocolError('Cursor kind mismatch', 'STALE_RUNTIME');
		const start = position?.offset ?? 0,
			selected: ControlJson[] = [];
		let index = 0,
			more = false;
		for (const row of rows) {
			if (index++ < start) continue;
			if (selected.length >= limit) {
				more = true;
				break;
			}
			const value = controlData(row);
			try {
				controlJsonBytes({
					...envelope,
					data: { rows: [...selected, value], nextCursor: 'x'.repeat(128), maxRows: limit },
				});
			} catch (error) {
				if (!(error instanceof ControlProtocolError) || error.code !== 'CAPACITY_EXCEEDED' || !selected.length)
					throw error;
				more = true;
				break;
			}
			selected.push(value);
		}
		if (index < start) throw new ControlProtocolError('List position is no longer retained', 'STALE_RUNTIME');
		const id = more
			? (position?.id ?? this.issue({ key: options.key, revision: options.revision, expires: Date.now() + TTL }))
			: undefined;
		return controlData({
			rows: selected,
			maxRows: limit,
			...(id ? { nextCursor: `${id}/${start + selected.length}` } : {}),
		});
	}
	/** Bounded inbox pages retain only recipient/high-water/generation fences in the local cursor owner. */
	listInbox(
		rows: Iterable<ControlJson>,
		options: {
			key: string;
			revision: number;
			recipient: InboxRecipient;
			highWaterSequence: number;
			generation: number;
			cursor?: string;
			limit?: number;
		},
		envelope: ResponseEnvelope,
	): ControlJson {
		const limit = options.limit ?? 100;
		if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
			throw new ControlProtocolError('Invalid list limit');
		const position = options.cursor ? this.position(options.cursor, options.key, options.generation) : undefined;
		if (position?.token.screen || position?.row !== undefined)
			throw new ControlProtocolError('Cursor kind mismatch', 'STALE_RUNTIME');
		if (position?.token.recipient &&
			(position.token.recipient.spaceId !== options.recipient.spaceId || position.token.recipient.sessionId !== options.recipient.sessionId))
			throw new ControlProtocolError('Read cursor query changed', 'STALE_RUNTIME');
		const highWater = position?.token.highWaterSequence ?? options.highWaterSequence;
		const selected: ControlJson[] = [];
		let start = position?.offset ?? 0;
		let index = 0;
		let more = false;
		for (const row of rows) {
			if (!row || typeof row !== 'object' || Array.isArray(row) || typeof (row as Record<string, unknown>).sendSequence !== 'number') continue;
			const sequence = (row as Record<string, unknown>).sendSequence as number;
			if (sequence > highWater) continue;
			if (index++ < start) continue;
			if (selected.length >= limit) {
				more = true;
				break;
			}
			const value = controlData(row);
			try {
				controlJsonBytes({
					...envelope,
					data: {
						items: [...selected, value],
						recipient: options.recipient,
						highWaterSequence: highWater,
						generation: options.generation,
						nextCursor: 'x'.repeat(128),
					},
				});
			} catch (error) {
				if (!(error instanceof ControlProtocolError) || error.code !== 'CAPACITY_EXCEEDED' || !selected.length) throw error;
				more = true;
				break;
			}
			selected.push(value);
		}
		if (index < start) throw new ControlProtocolError('List position is no longer retained', 'STALE_RUNTIME');
		const id = more
			? (position?.id ??
					this.issue({
						key: options.key,
						revision: options.generation,
						expires: Date.now() + TTL,
						recipient: { ...options.recipient },
						highWaterSequence: highWater,
						generation: options.generation,
					}))
			: undefined;
		return controlData({
			items: selected,
			recipient: { ...options.recipient },
			highWaterSequence: highWater,
			generation: options.generation,
			...(id ? { nextCursor: `${id}/${start + selected.length}` } : {}),
		});
	}
	async read(
		session: TerminalSession,
		ref: ManagedRuntimeRef,
		options: { key: string; cursor?: string; limit?: number; maxBytes?: number },
		envelope: ResponseEnvelope,
	): Promise<ControlJson> {
		const profile = session.getScreenProfile();
		const maxRows = Math.min(options.limit ?? profile.maxReadRows, profile.maxReadRows);
		if (!Number.isSafeInteger(maxRows) || maxRows < 1 || (options.limit ?? 1) > 1000)
			throw new ControlProtocolError('Invalid read limit');
		const position = options.cursor ? this.position(options.cursor, options.key, 0) : undefined;
		if (position && (position.row === undefined || !position.token.screen))
			throw new ControlProtocolError('Cursor kind mismatch', 'STALE_RUNTIME');
		const empty = {
			status: 'ok',
			at: { runtimeId: ref.runtimeId, contentSequence: Number.MAX_SAFE_INTEGER },
			buffer: 'alternate',
			range: {
				startRow: Number.MAX_SAFE_INTEGER,
				startOffset: Number.MAX_SAFE_INTEGER,
				endRow: Number.MAX_SAFE_INTEGER,
				endOffset: Number.MAX_SAFE_INTEGER,
			},
			text: '',
			truncated: true,
			output: 'truncated',
			cursor: 'x'.repeat(128),
			nextCursor: 'x'.repeat(128),
			maxRows,
			maxBytes: 65536,
		};
		const overhead = controlJsonBytes({ ...envelope, data: empty });
		const requested = options.maxBytes ?? profile.maxReadBytes;
		if (!Number.isSafeInteger(requested) || requested < 4 || requested > 65536)
			throw new ControlProtocolError('Invalid read byte limit');
		const maxBytes = Math.min(
			requested,
			profile.maxReadBytes,
			Math.floor((CONTROL_LIMITS.responseBytes - overhead) / 6),
		);
		if (maxBytes < 4)
			throw new ControlProtocolError('Screen metadata exceeds response capacity', 'CAPACITY_EXCEEDED');
		// Reserve the outer token before asking the model to retain a new snapshot.
		const id =
			position?.id ??
			this.issue({ key: options.key, revision: 0, expires: Date.now() + Math.min(TTL, profile.readTtlMs) });
		const result = await session.readScreen({
			expectedRuntimeId: ref.runtimeId,
			maxRows,
			maxBytes,
			...(position ? { cursor: `${position.token.screen}/${position.row}/${position.offset}` } : {}),
		});
		if (result.status !== 'ok') {
			if (!position) this.tokens.delete(id);
			throw new ControlProtocolError(
				result.reason,
				result.reason === 'resource-limit'
					? 'CAPACITY_EXCEEDED'
					: result.reason === 'invalid-limit'
						? 'INVALID_ARGUMENT'
						: 'STALE_RUNTIME',
			);
		}
		const raw = result.nextCursor?.split('/');
		if (!position && raw) this.tokens.set(id, { ...this.tokens.get(id)!, screen: raw[0] });
		// A completed first page has no retained model cursor to replay, so it needs no outer token.
		if (!position && !raw) this.tokens.delete(id);
		const data = controlData({
			...result,
			maxRows,
			maxBytes,
			...(raw ? { nextCursor: `${id}/${raw[1]}/${raw[2]}` } : { nextCursor: undefined }),
			...(position || raw ? { cursor: options.cursor ?? `${id}/0/0` } : {}),
		});
		controlJsonBytes({ ...envelope, data });
		return data;
	}
}
