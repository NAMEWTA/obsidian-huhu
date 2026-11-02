import { expect, test, vi } from 'vitest';
import type { ModuleContext } from '../../app/contracts/module';
import { TASKS, TASK_TOOLS, TASK_CALENDAR, type TaskService } from './api';
import createTaskModule from './module';
const disk = vi.hoisted(() => ({ raw: null as string | null, listeners: new Set<(...args: unknown[]) => void>() }));
vi.mock('../../host/obsidian/storage/device-id', () => ({ deviceId: () => 'module-device' }));
vi.mock('../../host/obsidian/storage/content-files', () => ({
	contentFiles: () => ({
		getFileByPath: () => (disk.raw === null ? null : { path: 'huhu/任务/tasks.json' }),
		read: async () => disk.raw,
		process: async (_path: string, change: (raw: string | null) => string) => {
			disk.raw = change(disk.raw);
			return disk.raw;
		},
		subscribe: (listener: (...args: unknown[]) => void) => {
			disk.listeners.add(listener);
			return () => disk.listeners.delete(listener);
		},
	}),
}));
vi.mock('../home/module', () => {
	throw new Error('Task must never activate or import Home implementation');
});
test('Task activates and writes without Home, Navigator or Automations; disposal refuses late writes', async () => {
	disk.raw = null;
	const disposers: Array<() => void> = [],
		peek = vi.fn(() => undefined);
	const instance = createTaskModule({
		app: { workspace: { containerEl: { ownerDocument: { defaultView: null } } } },
		lifetime: { register: (dispose: () => void) => disposers.push(dispose) },
		services: { peek, watch: () => () => {} },
		shell: { open: async () => {} },
		commands: { add: () => {} },
	} as unknown as ModuleContext);
	await instance.activate?.(new AbortController().signal);
	const task = instance.services!.find(([key]) => key === TASKS)![1] as TaskService;
	expect(instance.services!.map(([key]) => key)).toEqual(expect.arrayContaining([TASKS, TASK_TOOLS, TASK_CALENDAR]));
	expect(task.snapshot()).toMatchObject({ status: 'ready', capabilities: { recurrence: false, reminders: false } });
	expect(
		await task.execute({
			kind: 'create',
			commandId: 'without-home',
			draft: { title: 'Independent', description: '', timezone: 'UTC', relations: [] },
		}),
	).toMatchObject({ ok: true });
	const bytes = disk.raw;
	await instance.dispose('disabled');
	for (const dispose of disposers) dispose();
	expect(task.snapshot().status).toBe('unavailable');
	expect(disk.listeners.size).toBe(0);
	expect(
		await task.execute({ kind: 'complete', commandId: 'late', id: 'task:without-home', expectedRevision: 1 }),
	).toMatchObject({ ok: false, error: { code: 'unavailable' } });
	expect(disk.raw).toBe(bytes);
});
