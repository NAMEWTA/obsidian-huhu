import { useState } from 'react';
import type { TaskCalendarService, CalendarTask } from '../../../task/api';
import { openReactDialog } from '../../../../ui/react/dialog';
import { Button } from '../../../../ui/components/button';
import { Choice } from '../../../../ui/components/huhu/Choice';
import { t } from '../../../../shared/i18n';
export function removeTaskDialog(owner: HTMLElement, task: CalendarTask, calendar: TaskCalendarService) {
	const dialog = openReactDialog(owner, {
		title: t('tasks.remove'),
		content: (close) => <Remove task={task} calendar={calendar} close={close} />,
	});
	return dialog;
}
function Remove({
	task,
	calendar,
	close,
}: {
	task: CalendarTask;
	calendar: TaskCalendarService;
	close(this: void): void;
}) {
	const [following, setFollowing] = useState(false),
		[busy, setBusy] = useState(false),
		[error, setError] = useState('');
	return (
		<div className="grid gap-4">
			<p className="m-0 text-sm">{task.text}</p>
			{task.seriesId && (
				<Choice
					label={t('tasks.applyTo')}
					value={following ? 'following' : 'one'}
					options={['one', 'following'].map((key) => [key, t(`tasks.scope.${key}`)] as const)}
					onChange={(value) => setFollowing(value === 'following')}
					disabled={busy}
				/>
			)}
			{error && <p role="alert">{error}</p>}
			<div className="flex justify-end gap-2">
				<Button variant="outline" disabled={busy} onClick={close}>
					{t('common.cancel')}
				</Button>
				<Button
					variant="destructive"
					disabled={busy}
					onClick={() => {
						setBusy(true);
						void calendar
							.removeTask(task, following)
							.then((result) => {
								if ('code' in result) setError(t(`calendarUnified.error.${result.code}`));
								else close();
							})
							.catch(() => setError(t('calendarUnified.error.write-failed')))
							.finally(() => setBusy(false));
					}}
				>
					{t('tasks.remove')}
				</Button>
			</div>
		</div>
	);
}
