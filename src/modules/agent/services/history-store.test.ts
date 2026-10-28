import { expect, test, vi } from 'vitest';
import { HistoryStore } from './history-store';
import type { NativeHistory } from '../platform/history/service';
import type { NativeSessionSummary } from '../platform/desktop/server/agent-data-client';
import { transcriptDetails } from '../core/history/details';
import { t } from '../../../shared/i18n';

test('history pages stay metadata-only until an explicit preview and use canonical native scope', async () => {
	const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false };
	const rows: NativeSessionSummary[] = Array.from({ length: 11 }, (_, i) => ({
		key: String(i),
		agentId: 'codex',
		accountKey: '{}',
		sessionId: String(i),
		cwd: '/vault/link',
		title: String(i),
		transcriptPath: String(i),
		modifiedAtMs: 1,
		usage,
	}));
	let active = 0,
		maximum = 0,
		favorite = false;
	const read = vi.fn(async (row: NativeSessionSummary) => {
		maximum = Math.max(maximum, ++active);
		await Promise.resolve();
		active--;
		return { ...row, text: '## user\nFull prompt' };
	});
	const query = vi.fn(async (_q: string, offset: number, _s: AbortSignal, _f: string, _scope = 'vault') => {
		const result = rows;
		return { rows: result.slice(offset, offset + 3), total: result.length, usage, revision: 1 };
	});
	const history = {
		hasScanned: true,
		scan: async () => [],
		query,
		read,
		details: async (_r: NativeSessionSummary, text: string) => transcriptDetails(text),
		meta: () => ({ favorite }),
		update: async () => {
			favorite = true;
		},
	} as unknown as NativeHistory;
	const store = new HistoryStore(
		() => history,
		() => '/vault',
	);
	await store.refresh();
	expect(store.store.getState().rows).toHaveLength(11);
	expect(read).not.toHaveBeenCalled();
	// The store lists exactly what native admitted to the vault projection; there is no second account-wide pass.
	expect(store.store.getState().rows.every((r) => r.inVault)).toBe(true);
	expect(query.mock.calls.every((call) => call[4] === 'vault')).toBe(true);
	await store.preview('0');
	expect(read).toHaveBeenCalledTimes(1);
	await store.annotate('0', { favorite: true });
	await store.refresh(false);
	expect(read).toHaveBeenCalledTimes(1);
	expect(store.store.getState().rows[0]?.metadata.favorite).toBe(true);
	store.dispose();
	const count = query.mock.calls.length;
	await store.refresh();
	expect(query.mock.calls).toHaveLength(count);
});

test('disposing during a native read cancels work and does not publish late rows', async () => {
	let entered!: () => void;
	const started = new Promise<void>((resolve) => {
		entered = resolve;
	});
	const history = {
		hasScanned: false,
		scan: (signal: AbortSignal) =>
			new Promise((_resolve, reject) => {
				entered();
				signal.addEventListener('abort', () => reject(signal.reason), { once: true });
			}),
	} as unknown as NativeHistory;
	const store = new HistoryStore(
		() => history,
		() => '/vault',
	);
	const refresh = store.refresh();
	await started;
	store.dispose();
	await refresh;
	expect(store.store.getState().rows).toEqual([]);
	expect(store.store.getState().error).toBe('');
});

test('workspace history queries and reads only native vault-scoped rows', async () => {
	const own = {
		key: 'own',
		agentId: 'codex',
		cwd: '/vault/sub',
		modifiedAtMs: 1,
		usage: { input: 20, output: 3, cacheRead: 0, cacheWrite: 0, known: true, cost: null },
	} as NativeSessionSummary;
	const query = vi.fn(async (_q, _offset, _signal, _filter, scope) => {
		expect(scope).toBe('vault');
		return { rows: [own], total: 1 };
	});
	const read = vi.fn(async (row) => ({ ...row, text: '## user\nHello' }));
	const history = {
		hasScanned: true,
		query,
		read,
		details: async () => transcriptDetails(''),
		meta: () => ({}),
	} as unknown as NativeHistory;
	const store = new HistoryStore(
		() => history,
		() => '/vault',
		'vault',
	);
	await store.refresh(false);
	expect(query).toHaveBeenCalledTimes(1);
	expect(read).not.toHaveBeenCalled();
	await store.preview('own');
	expect(read).toHaveBeenCalledTimes(1);
	expect(store.store.getState().rows.map((r) => [r.key, r.inVault])).toEqual([['own', true]]);
	store.dispose();
});

test('history refresh binds every page to the first native revision', async () => {
	const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false };
	const rows = Array.from(
		{ length: 2 },
		(_, i) =>
			({
				key: String(i),
				agentId: 'codex',
				accountKey: '{}',
				sessionId: String(i),
				cwd: '/vault',
				title: String(i),
				transcriptPath: String(i),
				modifiedAtMs: i,
				usage,
			}) as NativeSessionSummary,
	);
	const revisions: unknown[] = [];
	const history = {
		hasScanned: true,
		scan: async () => [],
		query: vi.fn(
			async (
				_q: string,
				offset: number,
				_signal: AbortSignal,
				_filter: string,
				scope: string,
				fence?: { revision: number },
			) => {
				if (scope === 'vault') revisions.push(fence?.revision);
				return { rows: rows.slice(offset, offset + 1), total: rows.length, usage, revision: 7 };
			},
		),
		meta: () => ({}),
	} as unknown as NativeHistory;
	const store = new HistoryStore(
		() => history,
		() => '/vault',
	);
	await store.refresh(false);
	expect(revisions).toEqual([undefined, 7]);
	store.dispose();
});

test('metadata-only rows keep annotations and show source status without reading a body', async () => {
	const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false };
	const rows: NativeSessionSummary[] = [
		{
			key: 'gone',
			agentId: 'codex',
			accountKey: '{}',
			sessionId: 'gone',
			cwd: '/v',
			title: 'gone',
			transcriptPath: 'g',
			modifiedAtMs: 1,
			usage,
			sourceStatus: 'permission-denied',
			sourceRef: 'r',
		},
		{
			key: 'ok',
			agentId: 'codex',
			accountKey: '{}',
			sessionId: 'ok',
			cwd: '/v',
			title: 'ok',
			transcriptPath: 'o',
			modifiedAtMs: 1,
			usage,
			sourceStatus: 'available',
			sourceRef: 'r2',
		},
	];
	const read = vi.fn(async (row: NativeSessionSummary) => ({ ...row, text: '## user\nhi' }));
	const history = {
		hasScanned: true,
		scan: async () => [],
		query: async () => ({ rows, total: 2, usage, revision: 1 }),
		read,
		details: async (_r: NativeSessionSummary, text: string) => transcriptDetails(text),
		meta: (key: string) => (key === 'gone' ? { title: 'Kept title', favorite: true } : {}),
	} as unknown as NativeHistory;
	const store = new HistoryStore(
		() => history,
		() => '/v',
	);
	await store.refresh();
	await store.preview('gone');
	await store.preview('ok');
	const [gone, ok] = store.store.getState().rows;
	expect(gone).toMatchObject({ previewState: 'unavailable', metadata: { title: 'Kept title', favorite: true } });
	expect(gone!.readError).toBeTruthy();
	expect(ok!.previewState).toBe('ready');
	expect(read).toHaveBeenCalledTimes(1);
});

const usage0 = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false };
const summary = (key: string, extra: Partial<NativeSessionSummary> = {}): NativeSessionSummary => ({
	key,
	agentId: 'codex',
	accountKey: '{}',
	sessionId: key,
	cwd: '/v',
	title: key,
	transcriptPath: key,
	modifiedAtMs: 1,
	usage: usage0,
	sourceStatus: 'available',
	sourceRef: `ref-${key}`,
	...extra,
});
function vaultStore(
	rows: NativeSessionSummary[],
	read: (row: NativeSessionSummary) => Promise<unknown>,
	bind?: (rows: readonly NativeSessionSummary[]) => Promise<string[] | void>,
) {
	const details = vi.fn(async () => transcriptDetails('from-disk'));
	const history = {
		hasScanned: true,
		stale: false,
		scan: async () => [],
		query: async () => ({ rows, total: rows.length, usage: usage0, revision: 1 }),
		read: vi.fn(read),
		details,
		meta: () => ({ title: 'Kept', favorite: true }),
	} as unknown as NativeHistory;
	return {
		store: new HistoryStore(
			() => history,
			() => '/v',
			'vault',
			bind,
		),
		history,
		details,
	};
}

test('S-2: a status reported by native read is shown as unavailable and no second file read happens', async () => {
	for (const status of ['changed', 'missing', 'permission-denied'] as const) {
		const f = vaultStore([summary('a')], async (row) => ({
			...(row as NativeSessionSummary),
			text: '',
			sourceStatus: status,
			sourceReason: 'why',
		}));
		await f.store.refresh();
		await f.store.preview('a');
		const row = f.store.store.getState().rows[0]!;
		expect(row.previewState).toBe('unavailable');
		expect(row.readError).toBe(t(`agent.historyUI.source.${status}`));
		expect(row).toMatchObject({
			sourceStatus: status,
			sourceReason: 'why',
			metadata: { title: 'Kept', favorite: true },
		});
		expect(f.details).not.toHaveBeenCalled();
	}
});

test('S-2: preview details come from the verified native text, not from the file', async () => {
	const f = vaultStore([summary('a')], async (row) => ({
		...(row as NativeSessionSummary),
		text: '## user\nverified prompt\n\n## assistant\nanswer',
	}));
	await f.store.refresh();
	await f.store.preview('a');
	const row = f.store.store.getState().rows[0]!;
	expect(row.previewState).toBe('ready');
	expect(row.firstPrompt).toContain('verified prompt');
	expect(f.details).not.toHaveBeenCalled();
});

test('P-6: a refresh keeps an already previewed row ready while its source is unchanged', async () => {
	const f = vaultStore([summary('a')], async (row) => ({ ...(row as NativeSessionSummary), text: '## user\nhello' }));
	await f.store.refresh();
	await f.store.preview('a');
	await f.store.refresh();
	expect(f.store.store.getState().rows[0]).toMatchObject({
		previewState: 'ready',
		firstPrompt: expect.stringContaining('hello'),
	});
	expect(f.history.read).toHaveBeenCalledTimes(1);
});

test('S-4: owner binding failures never fail the refresh and are summarized as diagnostics', async () => {
	const throwing = vaultStore(
		[summary('a')],
		async (row) => row,
		async () => {
			throw new Error('PERSISTENCE_FAILED:commit-failed');
		},
	);
	await throwing.store.refresh();
	expect(throwing.store.store.getState()).toMatchObject({ error: '', rows: [{ key: 'a' }] });
	expect(throwing.store.store.getState().warnings).toEqual(['history-owner:PERSISTENCE_FAILED:commit-failed']);
	const skipped = vaultStore(
		[summary('a')],
		async (row) => row,
		async () => ['history-source-invalid', 'history-source-invalid'],
	);
	await skipped.store.refresh();
	expect(skipped.store.store.getState().warnings).toEqual(['history-owner:history-source-invalid']);
	expect(skipped.store.store.getState().rows).toHaveLength(1);
});

test('N-1: the drawer row keeps native model, messageCount and createdAt before any preview', async () => {
	const f = vaultStore(
		[
			summary('old', { model: 'gpt-5', messageCount: 4, createdAtMs: 100 }),
			summary('new', { model: null, messageCount: 2, createdAtMs: 300 }),
			summary('empty', { messageCount: 0 }),
		],
		async (row) => ({ ...(row as NativeSessionSummary), text: '## user\nhi' }),
	);
	await f.store.refresh();
	const rows = f.store.store.getState().rows;
	expect(rows[0]).toMatchObject({ model: 'gpt-5', messageCount: 4, createdAt: 100, previewState: 'idle' });
	expect(rows[1]).toMatchObject({ model: null, messageCount: 2, createdAt: 300 });
	// What the panel's hide-empty and created-sort use.
	expect(rows.filter((row) => row.messageCount > 0).map((row) => row.key)).toEqual(['old', 'new']);
	expect([...rows].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).map((row) => row.key)).toEqual([
		'new',
		'old',
		'empty',
	]);
	// Only preview details override them.
	await f.store.preview('old');
	// Preview refines the message count but must not erase scan-time model and creation time.
	expect(f.store.store.getState().rows[0]).toMatchObject({
		model: 'gpt-5',
		createdAt: 100,
		messageCount: 1,
		previewState: 'ready',
	});
	// ...and they survive a refresh that reuses the previewed row.
	await f.store.refresh();
	expect(f.store.store.getState().rows[0]).toMatchObject({
		model: 'gpt-5',
		createdAt: 100,
		messageCount: 1,
		previewState: 'ready',
	});
});

test('L-11: a truncated body keeps the native message count', async () => {
	const f = vaultStore([summary('big', { model: 'm', messageCount: 40, createdAtMs: 5 })], async (row) => ({
		...(row as NativeSessionSummary),
		text: '## user\nhi',
		usage: { ...usage0, partial: true },
	}));
	await f.store.refresh();
	await f.store.preview('big');
	expect(f.store.store.getState().rows[0]).toMatchObject({ messageCount: 40, model: 'm', createdAt: 5 });
});
