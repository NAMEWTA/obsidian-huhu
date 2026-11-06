import { CheckSquare } from 'lucide-react';
import { t as translate } from '../../../../shared/i18n';
import { useT } from '../../../../ui/react/hooks';
import { DateField, parseDate } from '../../../../ui/components/huhu/date';
import { AutomationTimeField } from '../editor/AutomationTimeField';
import { useDraftIssue, useEditorBoundary } from '../editor/draft-issues';
import { Input } from '../../../../ui/components/input';
import { Field } from '../parts';
import { TextContent } from './text-form';
import type { ActionFormProps, ActionView } from './types';
function Content({ action, update, showErrors, onTouch }: ActionFormProps<'create-task'>) {
	const t = useT(),
		reportDate = useDraftIssue('task-date'),
		boundary = useEditorBoundary();
	return (
		<div className="grid gap-4">
			<p className="text-sm text-muted-foreground">{t('automation.taskDomainHelp')}</p>
			<TextContent
				label={t('automation.todoText')}
				value={action.text}
				error={showErrors && !action.text.trim() ? t('automation.contentRequired') : undefined}
				onChange={(text) => {
					onTouch();
					update((next) => {
						next.text = text;
					});
				}}
				onTouch={onTouch}
			/>
			<div className="grid grid-cols-2 gap-3">
				<DateField
					label={t('automation.taskDueDate')}
					description={t('automation.taskDueDateHelp')}
					value={action.date ?? null}
					collisionBoundary={boundary}
					onDraftChange={(raw) =>
						reportDate(
							raw && !parseDate(raw)
								? { dirty: true, error: t('automation.time.invalid-date-time') }
								: raw !== (action.date ?? '')
									? { dirty: true }
									: null,
						)
					}
					onChange={(value) => {
						reportDate(null);
						update((next) => {
							next.date = value ?? undefined;
						});
					}}
				/>
				<Field label={t('automation.calendarTaskTime')}>
					{(id) => (
						<Input
							id={id}
							placeholder="HH:mm"
							inputMode="numeric"
							value={action.time ?? ''}
							onChange={(event) => {
								const value = event.currentTarget.value;
								update((next) => {
									next.time = value || undefined;
								});
							}}
						/>
					)}
				</Field>
			</div>
			<Field label={t('automation.timezone')}>
				{(id) => (
					<Input
						id={id}
						value={action.timezone}
						onChange={(event) => {
							const value = event.currentTarget.value;
							update((next) => {
								next.timezone = value;
							});
						}}
					/>
				)}
			</Field>
			<AutomationTimeField
				id="task-reminder"
				label={t('automation.taskReminder')}
				description={t('automation.taskReminderHelp')}
				value={action.reminderAt}
				zone={action.timezone}
				onChange={(at) =>
					update((next) => {
						next.reminderAt = at;
					})
				}
			/>
		</div>
	);
}
export const createTaskView: ActionView<'create-task'> = {
	kind: 'create-task',
	Icon: CheckSquare,
	Content,
	facts: (action) => [
		{ label: translate('automation.taskDestination'), value: translate('automation.taskDomain') },
		{ label: translate('automation.taskDueDate'), value: action.date ?? translate('automation.taskRunDate') },
	],
};
