import { expect, test } from 'vitest';
import { NativeHost } from '../../../../host/desktop/native/host';
import { NativeReleaseError, type NativeEvents, type NativeTransport } from '../../../../shared/native/host';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import { TerminalSessions } from './sessions';

/** History reads share the PTY helper. Terminal cleanup must not drop an admitted read or open a second helper. */
/** A history request that owns its lease through release, like the production readers. */
async function readHistory(host: NativeHost, payload: Record<string, unknown>) {
	const abort = new AbortController();
	const lease = await host.acquire('history', undefined, abort.signal);
	try {
		return await lease.value.request<{ rows: Array<Record<string, unknown>> }>('history', 'query', payload, abort.signal);
	} finally {
		await lease.release();
	}
}
async function fixture(protocol: 'confirmed' | 'legacy') {
	let complete!: (value: { rows: Array<Record<string, unknown>> }) => void;
	let admitted!: () => void;
	const accepted = new Promise<void>((resolve) => {
		admitted = resolve;
	});
	let connected = false,
		starts = 0;
	const ended: number[] = [];
	const host = new NativeHost(async (events: NativeEvents) => {
		connected = true;
		starts++;
		const end = (sid: number) => {
			ended.push(sid);
			if (protocol === 'confirmed')
				events.termination?.(sid, {
					version: 1,
					sequence: 1,
					evidence: {
						root: { state: 'exited', code: 0, signal: null },
						cleanup: {
							state: 'confirmed',
							scope: process.platform === 'win32' ? 'windows-job' : 'unix-session',
							remainingKnown: 0,
						},
						output: 'drained',
					},
				});
			events.exit(sid, 0, null);
		};
		return {
			...(protocol === 'confirmed'
				? { terminalTermination: 1 as const, requestStop: (sid: number) => end(sid) }
				: {}),
			get alive() {
				return connected;
			},
			version: 'fixture',
			spawnSession: async () => 42,
			input: () => {},
			resize: () => {},
			acknowledge: () => {},
			end,
			history: async <T>() => [] as T,
			request: <T>() => {
				admitted();
				return new Promise<T>((resolve) => {
					complete = (value) => resolve(value as T);
				});
			},
			dispose: async () => {
				connected = false;
				events.closed('closed');
			},
		} satisfies NativeTransport;
	});
	return {
		host,
		accepted,
		complete: (rows: { rows: Array<Record<string, unknown>> }) => complete(rows),
		get connected() {
			return connected;
		},
		get starts() {
			return starts;
		},
		ended,
		async dispose() {
			await host.dispose();
		},
	};
}

for (const protocol of ['confirmed', 'legacy'] as const)
	test(`an admitted history read survives ${protocol} terminal cleanup on the same helper`, async () => {
		const f = await fixture(protocol);
		const agent = new TerminalSessions({
			native: f.host,
			environment: async () => ({}),
			platform: 'linux',
			settings: () => normalizeTerminalSettings({}),
			colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
		});
		let stopping: Promise<void> | undefined;
		try {
			expect(f.starts).toBe(0);
			const session = await agent.create({ kind: 'shell', title: 'shell', file: 'sh', args: [], cwd: '/vault' });
			const reading = readHistory(f.host, { vault: '/snapshot' });
			await f.accepted;
			stopping = agent.dispose();
			if (protocol === 'confirmed') await expect(stopping).resolves.toBeUndefined();
			else {
				await expect(stopping).rejects.toBeInstanceOf(AggregateError);
				await expect(stopping).rejects.toMatchObject({ errors: [expect.any(NativeReleaseError)] });
				await expect(stopping).rejects.toMatchObject({
					errors: [{ outcomes: [{ sid: session.sid, notice: undefined, reason: 'cleanup-incomplete' }] }],
				});
			}
			expect(f.ended).toContain(session.sid);
			expect(f.connected).toBe(true);
			expect(f.starts).toBe(1);
			f.complete({ rows: [{ name: 'history-survives' }] });
			await expect(reading).resolves.toEqual({ rows: [{ name: 'history-survives' }] });
			expect(f.connected).toBe(false);
			expect(f.starts).toBe(1);
		} finally {
			try {
				if (stopping && protocol === 'legacy') await expect(stopping).rejects.toBeInstanceOf(AggregateError);
				else await agent.dispose();
			} finally {
				await f.dispose();
			}
		}
	});
