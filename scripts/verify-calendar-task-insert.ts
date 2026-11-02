import { strict as assert } from 'node:assert';
import { createTaskRepository } from '../src/modules/task/platform/repository';
import { createTaskService } from '../src/modules/task/services/service';
import { createTaskCalendar } from '../src/modules/task/services/calendar';
async function main() {
	let raw: string | null = null;
	const tasks = createTaskService({
		deviceId: 'verify',
		repository: createTaskRepository({
			read: async () => raw,
			process: async (change) => {
				raw = change(raw);
				return raw;
			},
		}),
	});
	await tasks.load();
	const calendar = createTaskCalendar(tasks, { edit: async () => {}, open: async () => {}, mount: () => () => {} });
	const result = await calendar.createTask({ date: '2026-09-30', text: 'Independent task', time: '14:30' });
	assert.equal(result.status, 'created');
	assert.equal(calendar.snapshot().byDay.get('2026-09-30')?.length, 1);
	const command = {
		kind: 'create' as const,
		commandId: 'stable-verification',
		draft: { title: 'Idempotent task', description: '', timezone: 'UTC', relations: [] },
	};
	assert.equal((await tasks.execute(command)).ok, true);
	const replay = await tasks.execute(command);
	assert.ok(replay.ok && replay.replayed);
	assert.equal(tasks.query({ filter: 'all' }).total, 2);
	calendar.dispose();
	await tasks.dispose();
	console.log('task calendar: domain writer, independent dates and durable replay passed');
}
void main();
