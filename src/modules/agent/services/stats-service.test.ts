import { expect, test, vi } from 'vitest';
import { StatsService } from './stats-service';
import type { TerminalSessions } from './terminal/sessions';
test('counts one launch, splits work at midnight and persists on disposal', async () => {
	const data = new Map<string, string>(),
		dirs = new Set<string>(),
		listeners = new Set<() => void>();
	const storage = {
		exists: async (p: string) => data.has(p) || dirs.has(p),
		read: async (p: string) => data.get(p)!,
		write: async (p: string, s: string) => {
			data.set(p, s);
		},
		mkdir: async (p: string) => {
			dirs.add(p);
		},
	};
	const session = { id: 'one', agentId: 'codex', connection: 'connected', running: true, activity: 'idle' };
	const sessions = {
		list: () => [session],
		subscribe: (fn: () => void) => {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
	} as unknown as TerminalSessions;
	const timers = new Map<number, () => void>();
	let id = 0;
	const clock = {
		setTimeout: (fn: () => void) => {
			timers.set(++id, fn);
			return id;
		},
		clearTimeout: (id: number) => {
			timers.delete(id);
		},
	} as unknown as Window;
	const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-01T23:59:59Z')),
		report = vi.fn();
	try {
		const service = new StatsService(storage, 'test', clock, sessions, report);
		await service.ready;
		session.activity = 'running';
		listeners.forEach((fn) => fn());
		listeners.forEach((fn) => fn());
		now.mockReturnValue(Date.parse('2026-10-02T00:00:01Z'));
		await service.dispose();
		expect(service.store.getState()).toMatchObject({
			agentsLaunched: 1,
			agentWorkMs: 2000,
			daily: { '2026-10-01': { launched: 1, workMs: 1000 }, '2026-10-02': { launched: 0, workMs: 1000 } },
		});
		expect(JSON.parse(data.get('.huhu/terminal-agent/test/stats.json')!).agentWorkMs).toBe(2000);
		expect(listeners.size).toBe(0);
		expect(timers.size).toBe(0);
		expect(report).not.toHaveBeenCalled();
	} finally {
		now.mockRestore();
	}
});

test('workspace counters start independently and ignore terminals outside the canonical workspace', async () => {
	const legacy = JSON.stringify({
		version: 1,
		agentsLaunched: 900,
		agentWorkMs: 10000,
		firstEventAt: 1,
		byAgent: {},
		daily: {},
	});
	const data = new Map([['.huhu/terminal-agent/test/stats.json', legacy]]);
	const storage = {
		exists: async (p: string) => data.has(p),
		read: async (p: string) => data.get(p)!,
		write: async (p: string, v: string) => {
			data.set(p, v);
		},
		mkdir: async () => {},
	};
	const sessions = {
		list: () => [
			{ id: 'inside', cwd: '/vault/sub', agentId: 'codex', connection: 'connected', running: false },
			{ id: 'sibling', cwd: '/vault-other', agentId: 'codex', connection: 'connected', running: true },
			{ id: 'link', cwd: '/vault/escaped-link', agentId: 'codex', connection: 'connected', running: true },
		],
		subscribe: () => () => {},
	} as unknown as TerminalSessions;
	const clock = { setTimeout: () => 1, clearTimeout: () => {} } as unknown as Window,
		report = vi.fn();
	const service = new StatsService(storage, 'test', clock, sessions, report, async (cwd) => cwd === '/vault/sub');
	await service.ready;
	await service.dispose();
	expect(service.store.getState().agentsLaunched).toBe(1);
	expect(data.get('.huhu/terminal-agent/test/stats.json')).toBe(legacy);
	expect(JSON.parse(data.get('.huhu/terminal-agent/test/workspace-stats.json')!).agentsLaunched).toBe(1);
	expect(report).not.toHaveBeenCalled();
});

function recoveryFixture() {
	const data = new Map<string, string>(), listeners = new Set<() => void>();
	let failWrites = false;
	const storage = {
		exists: async (p: string) => data.has(p) || p.endsWith('test'),
		read: async (p: string) => data.get(p)!,
		write: async (p: string, s: string) => {
			if (failWrites) throw new Error('ENOSPC');
			data.set(p, s);
		},
		mkdir: async () => {},
	};
	const session = { id: 'one', agentId: 'codex', connection: 'connected', running: true, activity: 'idle' };
	const sessions = { list: () => [session], subscribe: (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn)) } as unknown as TerminalSessions;
	const clock = { setTimeout: () => 1, clearTimeout: () => {} } as unknown as Window;
	return { data, storage, sessions, clock, session, fail: (v: boolean) => { failWrites = v; } };
}
const statsPath = '.huhu/terminal-agent/test/stats.json';
const valid = (launched: number) => JSON.stringify({ version: 1, firstEventAt: 1, agentsLaunched: launched, agentWorkMs: 0, daily: {}, byAgent: {} });

test('recovery: strict drain rejects on write failure where flush only reports', async () => {
	const f = recoveryFixture(), report = vi.fn();
	f.fail(true);
	const service = new StatsService(f.storage, 'test', f.clock, f.sessions, report);
	await service.ready;
	// The connected session counted one launch, so the state is dirty and every write fails.
	await service.flush();
	expect(report).toHaveBeenCalledTimes(1);
	await expect(service.drain()).rejects.toThrow(/ENOSPC/);
	f.fail(false);
	await service.drain();
	expect(JSON.parse(f.data.get(statsPath)!).agentsLaunched).toBe(1);
});

test('recovery: counts during quiesce are held, restored bytes become the baseline and held counts apply on resume', async () => {
	const f = recoveryFixture(), report = vi.fn();
	f.data.set(statsPath, valid(2));
	const service = new StatsService(f.storage, 'test', f.clock, f.sessions, report);
	await service.ready;
	expect(service.store.getState().agentsLaunched).toBe(3);
	await service.drain();
	service.quiesceWrites();
	f.session.id = 'late';
	f.session.connection = 'connected';
	(service as unknown as { capture(): Promise<void> }).capture();
	await (service as unknown as { captures: Promise<void> }).captures;
	// The held launch is not in the store and cannot be written while quiesced.
	expect(service.store.getState().agentsLaunched).toBe(3);
	f.data.set(statsPath, valid(10));
	await service.reloadFromDisk();
	expect(service.store.getState().agentsLaunched).toBe(10);
	service.resumeWrites();
	expect(service.store.getState().agentsLaunched).toBe(11);
	await service.drain();
	expect(JSON.parse(f.data.get(statsPath)!).agentsLaunched).toBe(11);
	expect(report).not.toHaveBeenCalled();
});
