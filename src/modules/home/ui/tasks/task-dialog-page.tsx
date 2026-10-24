import type { AutomationComposer } from '../../../automations/api';
import type { CalendarService, CalendarTask } from '../../api';
import type { TaskDraft } from '../../../../shared/automation/task';
import { t } from '../../../../shared/i18n';
import { openReactDialog } from '../../../../ui/react/dialog';
import { TaskEditorForm } from '../../../../ui/components/huhu/calendar/TaskEditorForm';
export const taskDraft = (task: CalendarTask): TaskDraft => ({
	text: task.text,
	date: task.scheduled ?? task.due ?? task.start,
	time: task.scheduledTime ?? task.time,
	reminder: task.reminder,
	recurrence: task.recurrence,
});
export async function editTask(
	request: Parameters<NonNullable<CalendarService['openEditor']>>[0],
	calendar: CalendarService,
	composer?: AutomationComposer,
) {
	const initial = request.task
		? { ...taskDraft(request.task), recurrence: calendar.recurrenceFor?.(request.task) ?? request.task.recurrence }
		: { text: request.text ?? '', date: request.date };
	const save = async (draft: TaskDraft, following: boolean) => {
		const result = request.task
			? await calendar.updateTask(request.task, draft, following)
			: await calendar.createTask({ ...draft, date: draft.date ?? '', interactive: true });
		if ('code' in result) throw new Error(t(`calendarUnified.error.${result.code}`));
		request.onSaved?.();
		return true;
	};
	if (composer?.editTask)
		return composer.editTask({
			owner: request.owner,
			initial,
			repeating: !!request.task?.recurrence || !!request.task?.seriesId,
			save,
		});
	await new Promise<void>((resolve) => {
		openReactDialog(request.owner, {
			title: t('tasks.edit'),
			content: (close) => <TaskEditorForm initial={initial} save={save} close={close} />,
			onClose: resolve,
		});
	});
}
