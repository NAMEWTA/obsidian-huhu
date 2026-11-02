import { expect, test } from 'vitest';
import { memoryVault } from '../../scripts/fixtures/memory-vault';
import { taskDomainFixture } from '../../scripts/fixtures/task-domain';
import { deliverTask } from '../../src/modules/automations/services/task-delivery';
import { calendarDeliveryForRun } from '../../src/modules/automations/core/calendar-run';
import type {
	AutomationDefinition,
	AutomationRun,
	AutomationTaskExecution,
	CreateTaskAction,
} from '../../src/shared/automation/types';
const action: CreateTaskAction = {
	kind: 'create-task',
	text: 'Review',
	timezone: 'Asia/Singapore',
	date: '2026-09-30',
	time: '14:30',
};
function setup() {
	const run: AutomationRun = {
		id: 'run',
		automationId: 'automation',
		revision: 1,
		title: 'Create',
		scheduledFor: Date.UTC(2026, 8, 25),
		trigger: 'scheduled',
		status: 'running',
		startedAt: 1,
		message: '',
		taskDelivery: { effectKey: 'one-admitted-effect', date: '2026-09-25', timezone: 'Asia/Singapore' },
	};
	const execution: AutomationTaskExecution = {
		run,
		signal: new AbortController().signal,
		checkpoint: async (value) => {
			run.taskDelivery = value;
		},
	};
	return { run, execution };
}
test('delivery checkpoints the task command and retries without duplicate creation', async () => {
	const f = await taskDomainFixture(memoryVault().app),
		{ run, execution } = setup();
	await deliverTask(f.tasks, action, execution);
	expect(run.taskDelivery?.receipt?.taskId).toMatch(/^task:automation-/);
	expect(run.taskDelivery?.target).toMatchObject({
		version: 1,
		draft: { due: { date: '2026-09-30', time: '14:30' } },
	});
	const replay = await deliverTask(f.tasks, { ...action, text: 'Changed later' }, execution);
	expect(replay.errorCode).toBe('calendarAlreadyExists');
	expect(f.tasks.query({ filter: 'all' }).total).toBe(1);
	expect(f.tasks.query({ filter: 'all' }).items[0]?.title).toBe('Review');
	await f.dispose();
});
test('a checkpoint failure before the effect writes nothing', async () => {
	const f = await taskDomainFixture(memoryVault().app),
		{ execution } = setup();
	execution.checkpoint = async () => {
		throw Error('disk');
	};
	await expect(deliverTask(f.tasks, action, execution)).rejects.toThrow('disk');
	expect(f.tasks.query({ filter: 'all' }).total).toBe(0);
	await f.dispose();
});
test('receipt checkpoint failure after commit is recoverable and idempotent', async () => {
	const f = await taskDomainFixture(memoryVault().app),
		{ run, execution } = setup();
	let calls = 0;
	execution.checkpoint = async (value) => {
		calls++;
		if (calls === 2) throw Error('receipt');
		run.taskDelivery = value;
	};
	await expect(deliverTask(f.tasks, action, execution)).rejects.toThrow('receipt');
	expect(f.tasks.query({ filter: 'all' }).total).toBe(1);
	execution.checkpoint = async (value) => {
		run.taskDelivery = value;
	};
	await deliverTask(f.tasks, action, execution);
	expect(run.taskDelivery?.result).toBe('already-exists');
	await f.dispose();
});
test('disabled domain and aborted execution have no fallback writer', async () => {
	const { execution } = setup();
	await expect(deliverTask(undefined, action, execution)).rejects.toMatchObject({ code: 'calendarUnavailable' });
	const f = await taskDomainFixture(memoryVault().app);
	execution.signal = AbortSignal.abort();
	await expect(deliverTask(f.tasks, action, execution)).rejects.toMatchObject({ code: 'cancelled' });
	expect(f.tasks.query({ filter: 'all' }).total).toBe(0);
	await f.dispose();
});
test('admission dates use task timezone and are frozen separately from creation/deadline', () => {
	const { run } = setup();
	const definition = {
		id: 'definition',
		revision: 1,
		action: { ...action, date: undefined },
		schedule: { kind: 'manual' },
	} as AutomationDefinition;
	const delivery = calendarDeliveryForRun(definition, { ...run, scheduledFor: Date.UTC(2026, 8, 24, 20) });
	expect(delivery?.date).toBe('2026-09-25');
	expect(delivery?.timezone).toBe('Asia/Singapore');
});
