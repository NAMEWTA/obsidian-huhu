import type { App } from 'obsidian';
import { contentFiles } from '../../src/host/obsidian/storage/content-files';
import { TASK_STORE_PATH } from '../../src/shared/storage/vault-layout';
import { createTaskRepository } from '../../src/modules/task/platform/repository';
import { createTaskService } from '../../src/modules/task/services/service';
import { createTaskCalendar } from '../../src/modules/task/services/calendar';
import { createTaskTools } from '../../src/modules/task/services/tools';
import type { TaskViews } from '../../src/modules/task/api';
/** Test-only composition of the actual task service and Vault adapter, with no Home owner. */
export async function taskDomainFixture(
	app: App,
	views: TaskViews = { edit: async () => {}, open: async () => {}, mount: () => () => {} },
) {
	const files = contentFiles(app);
	const tasks = createTaskService({
		deviceId: 'test-task-device',
		repository: createTaskRepository({
			read: async () => {
				const file = files.getFileByPath(TASK_STORE_PATH);
				return file ? files.read(file) : null;
			},
			process: (change) => files.process(TASK_STORE_PATH, change),
		}),
	});
	await tasks.load();
	const calendar = createTaskCalendar(tasks, views),
		tools = createTaskTools(tasks);
	return {
		tasks,
		calendar,
		tools,
		views,
		async dispose() {
			calendar.dispose();
			await tasks.dispose();
		},
	};
}
