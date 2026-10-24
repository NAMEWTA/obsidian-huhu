import type { AutomationDefinition } from '../../../../shared/automation/types';
import type { AutomationSchedule } from '../../../automations/api';
import type { CalendarTask } from '../../api';
import { taskDraftError } from '../../../../shared/automation/task';
/** Late notifications are never admitted, including after offline recovery. */
export function taskReminder(
	task: CalendarTask,
	deviceId: string,
	engine?: AutomationSchedule,
	now = Date.now(),
): AutomationDefinition | undefined {
	const date = task.scheduled ?? task.due ?? task.start,
		time = task.scheduledTime ?? task.time;
	const embedded = task.automation?.schedule.kind === 'once' ? task.automation : undefined;
	if (task.checked || task.cancelled || task.virtual || !task.id || !date) return undefined;
	const reminder = task.reminder;
	if (!reminder && !embedded) return undefined;
	if (reminder && taskDraftError({ text: task.text, date, time, reminder })) return undefined;
	const at = (stamp: string) =>
		task.timezone && engine ? engine.wallTime(stamp, task.timezone) : new Date(stamp.replace(' ', 'T')).getTime();
	let deadline: number, when: number;
	try {
		deadline = at(`${date} ${time || '23:59'}`) + 59_999;
		when = reminder ? at(reminder) : embedded!.schedule.kind === 'once' ? embedded!.schedule.at : NaN;
	} catch {
		return undefined;
	}
	if (!Number.isFinite(when) || when > deadline || now > deadline) return undefined;
	return {
		id: embedded?.id ?? `task-reminder:${task.id}`,
		name: task.text,
		enabled: embedded?.enabled ?? true,
		deviceId: embedded?.deviceId ?? task.deviceId ?? deviceId,
		revision: when,
		schedule: { kind: 'once', at: when },
		action: { kind: 'notify', body: task.text },
		channels: embedded?.channels ?? ['in-app'],
		notifyOn: 'always',
		graceMinutes: Math.max(0, Math.ceil((deadline - when) / 60000)),
		source: { kind: 'dashboard', path: task.path, id: `task:${task.id}` },
		createdAt: when,
		updatedAt: when,
	};
}
