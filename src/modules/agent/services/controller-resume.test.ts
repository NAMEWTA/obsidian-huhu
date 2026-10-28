import { expect, test, vi } from 'vitest';
import { AgentController } from './controller';
import { NativeResumeError } from './launch/native-resume';

vi.mock('electron', () => ({ shell: {}, webUtils: {} }));
vi.mock('../platform/desktop/agents/accounts', async (importOriginal) => ({
	...(await importOriginal<typeof import('../platform/desktop/agents/accounts')>()),
	accountEnv: vi.fn(async () => ({})),
	restoredAccountReference: vi.fn(
		async (_agent: unknown, env: Record<string, string>, _vault: string, _device: string, transcript?: string) => ({
			env,
			transcriptPath: transcript === '/t' ? '/remapped/t' : transcript,
		}),
	),
}));
vi.mock('../platform/desktop/agents/legacy-default', async (importOriginal) => ({
	...(await importOriginal<typeof import('../platform/desktop/agents/legacy-default')>()),
	inLegacyDefaultAccount: vi.fn(async () => false),
}));
vi.mock('../../../host/obsidian/storage/device-id', () => ({
	deviceId: () => 'device',
	vaultIdentity: () => ({ vaultId: 'vault', deviceId: 'device' }),
}));

const row = {
	key: 'k',
	agentId: 'codex',
	accountKey: '{}',
	sessionId: 'n1',
	sourceRef: 'ref',
	cwd: '/c',
	transcriptPath: '/t',
};
type Private = Record<string, (...args: unknown[]) => Promise<unknown>>;

test('Continue on an unassigned row runs every pre-check against the chosen Space before anything is imported', async () => {
	const order: string[] = [];
	const service = {
		preflight: vi.fn<() => Promise<void>>(async () => {
			order.push('preflight');
			throw new NativeResumeError('DIRECTORY_NOT_AUTHORIZED', 'cwd-not-authorized');
		}),
		importSource: vi.fn(async () => {
			order.push('import');
			return { spaceId: 'a', sessionId: 's', created: true };
		}),
		resumeSource: vi.fn(async () => ({ mode: 'resumed' })),
	};
	const self = {
		stopped: false,
		nativeResume: () => service,
		spaces: { historySpaceFor: () => undefined, requireSpace: async () => ({ id: 'a' }) },
	};
	await expect((AgentController.prototype as unknown as Private).resume!.call(self, row)).rejects.toMatchObject({
		reason: 'cwd-not-authorized',
	});
	expect(order).toEqual(['preflight']);
	expect(service.importSource).not.toHaveBeenCalled();
	expect(service.resumeSource).not.toHaveBeenCalled();
	// With the checks passing, the order is preflight, import, resume.
	service.preflight.mockImplementationOnce(async () => {
		order.push('preflight');
	});
	order.length = 0;
	await (AgentController.prototype as unknown as Private).resume!.call(self, row);
	expect(order).toEqual(['preflight', 'import']);
	expect(service.resumeSource).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'a', foreground: true }));
});

test('a tab restore takes the native claim before it can spawn, and a held conversation stops it with no process', async () => {
	const create = vi.fn();
	const guard = vi.fn(async () => {
		throw new NativeResumeError('OWNER_CONFLICT', 'occupied');
	});
	const self = {
		prepare: async () => {},
		vaultPath: () => '/vault',
		app: {},
		history: () => ({ scan: async () => {}, query: async () => ({ rows: [] }) }),
		nativeResume: () => ({ guard }),
		sessions: { create },
		captureLaunchHost: () => {
			throw new Error('must not build a launch host after a refused claim');
		},
	};
	const info = {
		spaceId: 'space',
		persistentSessionId: 'session',
		cwd: '/c',
		agentId: 'codex',
		accountId: '',
		nativeSessionId: 'n1',
		transcriptPath: '/t',
	};
	const runtime = { spaceId: 'space', sessionId: 'session', runtimeId: 'terminal-1' };
	await expect(
		(AgentController.prototype as unknown as Private).restoreSession!.call(self, info, 'title', undefined, {
			runtime,
		}),
	).rejects.toMatchObject({ code: 'OWNER_CONFLICT', reason: 'occupied' });
	expect(guard).toHaveBeenCalledWith({
		provider: 'codex',
		nativeSessionId: 'n1',
		transcriptPath: '/remapped/t',
		spaceId: 'space',
		sessionId: 'session',
		runtime,
	});
	expect(create).not.toHaveBeenCalled();
	// Without a reserved managed generation there is nothing to protect, so a native resume is refused outright.
	await expect(
		(AgentController.prototype as unknown as Private).restoreSession!.call(self, info, 'title'),
	).rejects.toMatchObject({ failure: { code: 'SOURCE_UNAVAILABLE' } });
});

test('NL1: a running fresh launch claims its conversation once the native id and transcript are known, once', async () => {
	const guard = vi.fn(async () => ({ release: async () => {} }));
	const running = {
		id: 'terminal-1',
		kind: 'agent',
		running: true,
		agentId: 'codex',
		nativeSessionId: 'n1',
		transcriptPath: '/log/n1.jsonl',
	};
	const early = { ...running, id: 'terminal-2', nativeSessionId: undefined };
	const shell = { ...running, id: 'terminal-3', kind: 'shell' };
	const unmanaged = { ...running, id: 'terminal-4' };
	const self = {
		stopped: false,
		claimedNative: new Set<string>(),
		sessions: {
			list: () => [running, early, shell, unmanaged],
			managedRef: (id: string) =>
				id === 'terminal-4' ? undefined : { spaceId: 'space', sessionId: 'session', runtimeId: id },
		},
		nativeResume: () => ({ guard }),
	};
	const claim = (AgentController.prototype as unknown as Record<string, (this: unknown) => void>).claimRunningNative!;
	claim.call(self);
	claim.call(self);
	await Promise.resolve();
	expect(guard).toHaveBeenCalledTimes(1);
	expect(guard).toHaveBeenCalledWith({
		provider: 'codex',
		nativeSessionId: 'n1',
		transcriptPath: '/log/n1.jsonl',
		spaceId: 'space',
		sessionId: 'session',
		runtime: { spaceId: 'space', sessionId: 'session', runtimeId: 'terminal-1' },
	});
	// Once the id arrives later, the early session is claimed too.
	(early as { nativeSessionId?: string }).nativeSessionId = 'n2';
	claim.call(self);
	expect(guard).toHaveBeenCalledTimes(2);
});

test('NR3: claimed sessions are pruned when they end and a transient claim failure is retried, a refusal is not', async () => {
	let failure: unknown = new Error('index offline');
	const guard = vi.fn(async () => {
		throw failure;
	});
	const running = {
		id: 'terminal-1',
		kind: 'agent',
		running: true,
		agentId: 'codex',
		nativeSessionId: 'n1',
		transcriptPath: '/t',
	};
	let list: unknown[] = [running];
	const self = {
		stopped: false,
		claimedNative: new Set<string>(),
		sessions: { list: () => list, managedRef: (id: string) => ({ spaceId: 's', sessionId: 'x', runtimeId: id }) },
		nativeResume: () => ({ guard }),
	};
	const claim = (AgentController.prototype as unknown as Record<string, (this: unknown) => void>).claimRunningNative!;
	claim.call(self);
	await new Promise((resolve) => setTimeout(resolve, 5));
	claim.call(self);
	expect(guard).toHaveBeenCalledTimes(2);
	failure = new NativeResumeError('OWNER_CONFLICT', 'occupied');
	claim.call(self);
	await new Promise((resolve) => setTimeout(resolve, 5));
	claim.call(self);
	expect(guard).toHaveBeenCalledTimes(3);
	list = [];
	claim.call(self);
	expect(self.claimedNative.size).toBe(0);
});
