import { expect, test, vi } from 'vitest';
import { CONTROL_LIMITS, ControlProtocolError } from '../../../../shared/native/control-wire';
import { HistoryCommands } from './history';
import type { NativeHistory } from '../../platform/history/service';
import type { NativeSessionSummary } from '../../platform/desktop/server/agent-data-client';

const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false };
const row = (key: string, spaceId?: string, extra: Partial<NativeSessionSummary> = {}): NativeSessionSummary => ({
	key,
	agentId: 'codex',
	accountKey: '{}',
	sessionId: key,
	cwd: '/vault',
	title: key,
	transcriptPath: key,
	modifiedAtMs: 1,
	usage,
	sourceStatus: 'available',
	sourceRef: key,
	spaceId,
	...extra,
});
interface Fake {
	rows: NativeSessionSummary[];
	pageSize?: number;
	revision?: number;
	stale?: boolean;
	annotations?: number;
	read?: (value: NativeSessionSummary) => Promise<unknown>;
}
function make(options: Fake, prepare?: () => Promise<void>) {
	const calls: Array<{ offset: number; revision: number | undefined }> = [];
	const state = { annotations: options.annotations ?? 1 };
	const history = {
		get stale() {
			return options.stale ?? false;
		},
		get metadataRevision() {
			return state.annotations;
		},
		meta: () => ({}),
		query: vi.fn(
			async (
				_q: string,
				offset: number,
				_signal: AbortSignal | undefined,
				_filter: string,
				_scope: string,
				fence?: { revision: number },
			) => {
				calls.push({ offset, revision: fence?.revision });
				return {
					rows: options.rows.slice(offset, offset + (options.pageSize ?? 100)),
					total: options.rows.length,
					usage,
					revision: options.revision ?? 3,
				};
			},
		),
		read: vi.fn(options.read ?? (async (value: NativeSessionSummary) => ({ ...value, text: 'preview' }))),
	} as unknown as NativeHistory;
	const commands = new HistoryCommands(() => history, { spaceFor: (value) => value.spaceId }, prepare);
	return { history, commands, calls, state };
}

test('history control requires an explicit Space, projects public fields and keeps preview read-only', async () => {
	const secret = row('a', 'space-a', {
		accountKey: '{"CLAUDE_CONFIG_DIR":"/secret"}',
		transcriptPath: '/secret/a.jsonl',
	});
	const { history, commands } = make({ rows: [secret, row('b', 'space-b')] });
	await expect(commands.list({ spaceId: '' })).rejects.toMatchObject({ code: 'TARGET_REQUIRED' });
	const page = await commands.list({ spaceId: 'space-a', limit: 1 });
	expect(page.rows.map((value) => value.key)).toEqual(['a']);
	expect(JSON.stringify(page)).not.toMatch(/secret|accountKey|transcriptPath/);
	const preview = await commands.preview({ spaceId: 'space-a', key: 'a', sourceRef: 'a' });
	expect(preview).toMatchObject({ status: 'available', text: 'preview' });
	expect(JSON.stringify(preview)).not.toMatch(/secret/);
	expect(history.read).toHaveBeenCalledTimes(1);
});

test('S-1: the cursor records the exact native offset, so a page full of owned rows loses none', async () => {
	const rows = Array.from({ length: 10 }, (_, i) => row(`a${i}`, 'space-a'));
	rows.splice(4, 0, row('other', 'space-b'), row('unbound'));
	const { commands, calls } = make({ rows, pageSize: 100 });
	const seen: string[] = [];
	let cursor: string | undefined;
	let pages = 0;
	do {
		const page = await commands.list({ spaceId: 'space-a', limit: 3, cursor });
		seen.push(...page.rows.map((value) => value.key));
		cursor = page.nextCursor;
		pages++;
	} while (cursor && pages < 10);
	expect(seen).toEqual(Array.from({ length: 10 }, (_, i) => `a${i}`));
	expect(new Set(seen).size).toBe(10);
	expect(pages).toBe(4);
	// Every continuation starts at the native offset of the first row not yet returned, under the first page's fence.
	expect(calls.map((call) => call.offset)).toEqual([0, 3, 8, 11]);
	expect(calls.slice(1).every((call) => call.revision === 3)).toBe(true);
});

test('S-1: paging also works when native pages are smaller than the limit', async () => {
	const rows = Array.from({ length: 9 }, (_, i) => row(`a${i}`, i % 3 === 0 ? 'space-b' : 'space-a'));
	const { commands } = make({ rows, pageSize: 2 });
	const all = await commands.list({ spaceId: 'space-a', limit: 100 });
	expect(all.rows.map((value) => value.key)).toEqual(['a1', 'a2', 'a4', 'a5', 'a7', 'a8']);
	expect(all.nextCursor).toBeUndefined();
});

test('S-6: errors carry machine-readable control codes', async () => {
	const { commands, state } = make({ rows: [row('a', 'space-a'), row('b', 'space-a')] });
	await expect(commands.list({ spaceId: 'space-a', limit: 0 })).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
	await expect(commands.list({ spaceId: 'space-a', limit: 1001 })).rejects.toMatchObject({
		code: 'INVALID_ARGUMENT',
	});
	await expect(commands.list({ spaceId: 'space-a', cursor: 'space-a:bad:1' })).rejects.toMatchObject({
		code: 'STALE_RUNTIME',
	});
	const first = await commands.list({ spaceId: 'space-a', limit: 1 });
	expect(first.nextCursor).toBeTruthy();
	// A different query cannot reuse the cursor; neither can a changed annotation set.
	await expect(commands.list({ spaceId: 'space-a', query: 'x', cursor: first.nextCursor })).rejects.toMatchObject({
		code: 'STALE_RUNTIME',
	});
	state.annotations++;
	await expect(commands.list({ spaceId: 'space-a', cursor: first.nextCursor })).rejects.toMatchObject({
		code: 'STALE_RUNTIME',
	});
	await expect(commands.preview({ spaceId: 'space-a', key: 'zzz' })).rejects.toMatchObject({
		code: 'TARGET_NOT_FOUND',
	});
});

test('native revision failures map to STALE_RUNTIME', async () => {
	const { commands, history } = make({ rows: [row('a', 'space-a')] });
	vi.mocked(history.query).mockRejectedValueOnce(new Error('history revision changed; refresh required'));
	await expect(commands.list({ spaceId: 'space-a' })).rejects.toMatchObject({ code: 'STALE_RUNTIME' });
});

test('provider filter narrows the Space rows', async () => {
	const { commands } = make({
		rows: [row('a', 'space-a'), row('b', 'space-a', { agentId: 'claude' })],
	});
	const page = await commands.list({ spaceId: 'space-a', provider: 'claude' });
	expect(page.rows.map((value) => value.key)).toEqual(['b']);
});

test('S-7: real-sized rows are shrunk to the response budget and every row is still reachable', async () => {
	const rows = Array.from({ length: 300 }, (_, i) =>
		row(`k${i}`.padEnd(300, 'k'), 'space-a', {
			accountKey: JSON.stringify({ CLAUDE_CONFIG_DIR: '/x'.repeat(500) }),
			cwd: '/vault/' + 'd'.repeat(400),
			title: 'T'.repeat(300),
			sourceRef: 'ref-'.padEnd(600, 'r') + i,
		}),
	);
	const { commands } = make({ rows });
	const seen = new Set<string>();
	let cursor: string | undefined;
	let pages = 0;
	do {
		const page = await commands.list({ spaceId: 'space-a', limit: 1000, cursor });
		expect(new TextEncoder().encode(JSON.stringify(page)).byteLength).toBeLessThan(CONTROL_LIMITS.responseBytes);
		for (const value of page.rows) seen.add(value.key);
		cursor = page.nextCursor;
		pages++;
	} while (cursor && pages < 100);
	expect(seen.size).toBe(300);
	expect(pages).toBeGreaterThan(1);
});

test('S-7: an oversized verified body is truncated with a partial status instead of failing', async () => {
	const body = 'line with "quotes" and 😀\n'.repeat(8000);
	const { commands } = make({
		rows: [row('a', 'space-a')],
		read: async (value) => ({ ...value, text: body }),
	});
	const result = await commands.preview({ spaceId: 'space-a', key: 'a' });
	expect(result.status).toBe('partial');
	expect(result.reason).toBe('response-capacity');
	expect(result.text.length).toBeGreaterThan(1000);
	expect(body.startsWith(result.text)).toBe(true);
	expect(new TextEncoder().encode(JSON.stringify(result)).byteLength).toBeLessThan(CONTROL_LIMITS.responseBytes);
});

test('S-2: a status reported at read time is returned as unavailable, never as an empty available body', async () => {
	for (const [status, reason] of [
		['changed', 'source identity can no longer be verified'],
		['missing', 'source file is gone'],
		['permission-denied', 'source is not readable'],
	] as const) {
		const { commands } = make({
			rows: [row('a', 'space-a')],
			read: async (value) => ({ ...value, text: '', sourceStatus: status, sourceReason: reason }),
		});
		const result = await commands.preview({ spaceId: 'space-a', key: 'a' });
		expect(result).toMatchObject({ status: 'unavailable', text: '', sourceStatus: status, sourceReason: reason });
	}
});

test('a source already known to be unreadable is not read again', async () => {
	const { commands, history } = make({
		rows: [row('a', 'space-a', { sourceStatus: 'missing', sourceReason: 'gone' })],
	});
	expect(await commands.preview({ spaceId: 'space-a', key: 'a' })).toMatchObject({
		status: 'unavailable',
		sourceStatus: 'missing',
		sourceReason: 'gone',
	});
	expect(history.read).not.toHaveBeenCalled();
});

test('preview refuses an unbound or mismatched source even when cwd is inside the Vault', async () => {
	const { commands } = make({ rows: [row('a'), row('b', 'space-a')] });
	await expect(commands.preview({ spaceId: 'space-a', key: 'a' })).rejects.toMatchObject({
		code: 'TARGET_NOT_FOUND',
	});
	await expect(commands.preview({ spaceId: 'space-a', key: 'b', sourceRef: 'other' })).rejects.toMatchObject({
		code: 'TARGET_NOT_FOUND',
	});
});

test('P-5: a stale index is brought current once before listing', async () => {
	const prepare = vi.fn(async () => {});
	const stale = make({ rows: [row('a', 'space-a')], stale: true }, prepare);
	await stale.commands.list({ spaceId: 'space-a' });
	await stale.commands.preview({ spaceId: 'space-a', key: 'a' });
	expect(prepare).toHaveBeenCalledTimes(2);
	const fresh = make({ rows: [row('a', 'space-a')] }, prepare);
	prepare.mockClear();
	await fresh.commands.list({ spaceId: 'space-a' });
	expect(prepare).not.toHaveBeenCalled();
});


test('read cancellation preserves its control classification', async () => {
	const { commands } = make({
		rows: [row('a', 'space-a')],
		read: async () => { throw new ControlProtocolError('cancelled', 'WAIT_CANCELLED'); },
	});
	await expect(commands.preview({ spaceId: 'space-a', key: 'a' })).rejects.toMatchObject({ code: 'WAIT_CANCELLED' });
});


test('an abort during the body read remains cancellation even for an unclassified native error', async () => {
	const abort = new AbortController();
	const { commands } = make({ rows: [row('a', 'space-a')], read: async () => { abort.abort(); throw new Error('cancelled'); } });
	await expect(commands.preview({ spaceId: 'space-a', key: 'a' }, abort.signal)).rejects.toMatchObject({ code: 'WAIT_CANCELLED' });
});

test('a native body cap remains visible in the public history preview', async () => {
	const { commands } = make({ rows: [row('a', 'space-a')], read: async (value) => ({ ...value, text: 'prefix', usage: { ...usage, partial: true } }) });
	await expect(commands.preview({ spaceId: 'space-a', key: 'a' })).resolves.toMatchObject({ status: 'partial', text: 'prefix', reason: 'source-capacity' });
});

test('control preview rejects a different source body even when its opaque key matches', async () => {
	const a = row('same', 'space-a', { transcriptPath: '/a.jsonl', sourceRef: 'source-a' });
	const { commands } = make({ rows: [a], read: async () => ({ ...a, transcriptPath: '/b.jsonl', sourceRef: 'source-b', text: 'B body' }) });
	const preview = await commands.preview({ spaceId: 'space-a', key: 'same', sourceRef: 'source-a' });
	expect(preview).toMatchObject({ status: 'unavailable', sourceStatus: 'changed', text: '' });
	expect(JSON.stringify(preview)).not.toContain('B body');
});
