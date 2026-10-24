import type { AutomationComposer } from '../api';
import { TaskEditorForm } from '../../../ui/components/huhu/calendar/TaskEditorForm';
import { openReactDialog } from '../../../ui/react/dialog';
import { t, registerMessages } from '../../../shared/i18n';
import { messages } from '../../../shared/i18n/lazy/calendar';
registerMessages(messages);
import { validateSchedule } from '../core/schedule';
import { resolveWallTime } from '../core/schedule/zoned-occurrences';
export function openTaskEditor(
	request: Parameters<NonNullable<AutomationComposer['editTask']>>[0],
	signal: AbortSignal,
): Promise<void> {
	return new Promise((resolve) => {
		const dialog = openReactDialog(request.owner, {
			title: t('tasks.edit'),
			content: (close) => (
				<TaskEditorForm
					{...request}
					close={close}
					resolve={resolveWallTime}
					validate={(draft) => {
						if (draft.recurrence) {
							try {
								validateSchedule({ kind: 'recurring', ...draft.recurrence });
							} catch {
								throw new Error(t('tasks.error.recurrence'));
							}
						}
					}}
				/>
			),
			onClose: () => {
				signal.removeEventListener('abort', dialog.close);
				resolve();
			},
		});
		signal.addEventListener('abort', dialog.close, { once: true });
	});
}
