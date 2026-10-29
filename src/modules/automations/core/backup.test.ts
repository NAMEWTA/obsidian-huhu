import { describe, expect, test, vi } from 'vitest';
import type { AutomationRun, AutomationSourcePort } from '../../../shared/automation/types';
import type { TextStorage } from '../../../shared/storage/ports';
import { AUTOMATION_RUNTIME_OWNER, AUTOMATION_DEFINITIONS_OWNER, isAutomationDefinitionPath } from '../api';
import { AutomationService, automationRecoveryOwners } from './service';

const sources: AutomationSourcePort = {
	list: async () => [],
	save: async () => {},
	remove: async () => {},
	open: async () => {},
	createTask: async () => {},
};
const run = (id: string, patch: Partial<AutomationRun> = {}): AutomationRun => ({
	id,
	automationId: 'a',
	revision: 1,
	title: `Run ${id}`,
	scheduledFor: 1,
	trigger: 'manual',
	status: 'succeeded',
	startedAt: 1,
	endedAt: 2,
	message: '',
	definition: {
		id: 'a',
		name: 'A',
		enabled: true,
		deviceId: 'device',
		revision: 1,
		schedule: { kind: 'manual' },
		action: { kind: 'notify', message: 'm' } as never,
		channels: ['in-app'],
		notifyOn: 'always',
		graceMinutes: 0,
		createdAt: 1,
		updatedAt: 1,
	},
	...patch,
});

function fixture(initial?: unknown) {
	const files = new Map<string, string>();
	if (initial) files.set('runtime.json', JSON.stringify(initial));
	let failWrites = false;
	let writes = 0;
	const storage: TextStorage = {
		exists: async (path) => files.has(path),
		read: async (path) => files.get(path)!,
		mkdir: async () => {},
		write: async (path, text) => {
			if (failWrites) throw new Error('disk full');
			writes++;
			files.set(path, text);
		},
	};
	const notify = vi.fn(async () => {});
	const definitions = { list: vi.fn(async () => []), save: vi.fn(async () => {}), remove: vi.fn(async () => {}) };
	const make = () =>
		new AutomationService(storage, 'runtime.json', 'device', sources, () => undefined, notify, true, {
			definitions,
		});
	return {
		files,
		notify,
		definitions,
		make,
		storage,
		writes: () => writes,
		fail: (value: boolean) => {
			failWrites = value;
		},
	};
}
const state = (runs: AutomationRun[], extra: Record<string, unknown> = {}) => ({
	definitions: [],
	runs,
	cursors: {},
	...extra,
});

describe('automation recovery owner', () => {
	test('owns exactly the runtime file and the definition documents', () => {
		const f = fixture();
		const [runtime, definitions] = automationRecoveryOwners(f.make(), 'device');
		expect(runtime!.id).toBe(AUTOMATION_RUNTIME_OWNER);
		expect(definitions!.id).toBe(AUTOMATION_DEFINITIONS_OWNER);
		expect(runtime!.owns('.huhu/automation/device/runtime.json')).toBe(true);
		expect(runtime!.owns('.huhu/automation/other/runtime.json')).toBe(false);
		expect(isAutomationDefinitionPath('.huhu/automation/definitions/x-1234/操作.md')).toBe(true);
		for (const path of [
			'.huhu/automation/definitions/x/y/操作.md',
			'.huhu/automation/definitions/操作.md',
			'.huhu/automation/definitions/../x/操作.md',
			'.huhu/automation/definitions/x/other.md',
		])
			expect(definitions!.owns(path)).toBe(false);
	});

	test('active runs are reported busy and never stopped; the hold closes every state change visibly', async () => {
		const f = fixture(state([run('1', { status: 'running', endedAt: undefined })]));
		const service = f.make();
		await service.load();
		// The normal load interrupted it; put an active run back in memory the way a live launch would.
		service.state.runs.push(run('2', { status: 'running', endedAt: undefined, title: 'Working' }));
		expect(service.recoveryBusy()).toEqual(['Working']);
		service.quiesceWrites();
		await expect(service.clearHistory()).rejects.toThrow('automation-recovery-busy');
		expect(() =>
			service.invokeAgent({
				invocationId: 'i',
				title: 't',
				agentId: 'codex',
				source: { kind: 'widget', path: 'a', id: 'b' },
				destination: { kind: 'existing', sessionId: 's' },
				finalPrompt: 'p',
				files: [],
			}),
		).toThrow('automation-recovery-busy');
		await service.tick();
		expect(service.state.runs.find((r) => r.id === '2')!.status).toBe('running');
		service.resumeWrites();
		await service.clearHistory();
	});

	test('drain is strict: a failed persist rejects instead of being swallowed', async () => {
		const f = fixture(state([]));
		const service = f.make();
		await service.load();
		f.fail(true);
		await expect(service.clearHistory()).rejects.toThrow('disk full');
		await expect(service.drainWrites()).rejects.toThrow('disk full');
		f.fail(false);
	});

	test('adopting a restored file reads it without interrupting, committing or notifying', async () => {
		const f = fixture(state([]));
		const service = f.make();
		await service.load();
		const before = f.writes();
		f.files.set(
			'runtime.json',
			JSON.stringify(
				state([run('r1', { status: 'interrupted' }), run('r2', { status: 'failed' })], {
					restored: { r2: { at: 1 } },
				}),
			),
		);
		await service.adoptFromDisk();
		expect(service.state.runs.map((r) => r.id)).toEqual(['r1', 'r2']);
		expect(f.writes()).toBe(before);
		expect(f.notify).not.toHaveBeenCalled();
		expect(f.definitions.list).toHaveBeenCalledTimes(2);
		// The next edit merges against the restored bytes: the restored runs are not written back stale.
		await service.clearHistory();
		expect(JSON.parse(f.files.get('runtime.json')!).restored).toBeUndefined();
	});

	test('a restart never publishes a restored run, and the same file without the marker would', async () => {
		const unsent = run('r1', { status: 'failed' });
		const marked = fixture(state([unsent], { restored: { r1: { at: 1 } } }));
		const quiet = marked.make();
		await quiet.load();
		expect(marked.notify).not.toHaveBeenCalled();
		await quiet.shutdown();

		const plain = fixture(state([unsent]));
		const loud = plain.make();
		await loud.load();
		expect(plain.notify).toHaveBeenCalledTimes(1);
		await loud.shutdown();
	});

	test('restored markers of trimmed runs are pruned with them', async () => {
		const runs = Array.from({ length: 101 }, (_, i) => run(`r${i}`, { notificationAttempted: true }));
		const f = fixture(state(runs, { restored: { r0: { at: 1 }, r100: { at: 1 } } }));
		const service = f.make();
		await service.load();
		expect(Object.keys(JSON.parse(f.files.get('runtime.json')!).restored ?? {})).toEqual(['r100']);
	});

	test('a completion that reaches publish while held is kept and sent after the hold, once', async () => {
		const f = fixture(state([]));
		const service = f.make();
		await service.load();
		const finished = run('done-1', { status: 'failed' });
		service.state.runs.push(finished);
		const publish = (service as unknown as { publish(r: AutomationRun, d: unknown): Promise<void> }).publish.bind(
			service,
		);
		service.quiesceWrites();
		await publish(finished, finished.definition);
		expect(f.notify).not.toHaveBeenCalled();
		service.resumeWrites();
		await vi.waitFor(() => expect(f.notify).toHaveBeenCalledTimes(1));
	});

	test('a deferred notice for a run a restore replaced is not sent', async () => {
		const f = fixture(state([]));
		const service = f.make();
		await service.load();
		const finished = run('gone', { status: 'failed' });
		service.state.runs.push(finished);
		const publish = (service as unknown as { publish(r: AutomationRun, d: unknown): Promise<void> }).publish.bind(
			service,
		);
		service.quiesceWrites();
		await publish(finished, finished.definition);
		service.state.runs = [];
		service.resumeWrites();
		await Promise.resolve();
		expect(f.notify).not.toHaveBeenCalled();
	});

	test('a notice being sent counts as busy work', async () => {
		let release!: () => void;
		const f = fixture(state([]));
		f.notify.mockImplementation(() => new Promise<void>((resolve) => (release = resolve)));
		const service = f.make();
		await service.load();
		const finished = run('slow', { status: 'failed' });
		service.state.runs.push(finished);
		const publish = (service as unknown as { publish(r: AutomationRun, d: unknown): Promise<void> }).publish.bind(
			service,
		);
		const pending = publish(finished, finished.definition);
		await vi.waitFor(() => expect(service.recoveryBusy()).toEqual(['publish:1']));
		release();
		await pending;
		expect(service.recoveryBusy()).toEqual([]);
	});
});
