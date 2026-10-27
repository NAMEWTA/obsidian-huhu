import type { ModuleManifest } from '../../app/contracts/module';
import { HOME_WIDGETS } from '../home/api';
import { AUTOMATION_SOURCES } from '../automations/api';
import { TASKS, TASK_RESOURCES, TASK_VIEWS, TASK_TOOLS, TASK_CALENDAR } from './api';
export const taskManifest: ModuleManifest = {
	id: 'task',
	order: 25,
	icon: 'list-checks',
	titleKey: 'modules.task',
	descriptionKey: 'modules.taskDesc',
	platforms: { desktop: true, mobile: true },
	defaultEnabled: true,
	activation: 'startup',
	provides: [TASKS, TASK_RESOURCES, TASK_VIEWS, TASK_TOOLS, TASK_CALENDAR],
	contributes: [HOME_WIDGETS, AUTOMATION_SOURCES],
	load: () => import('./module'),
};
