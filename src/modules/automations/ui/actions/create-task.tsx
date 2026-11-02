import { CheckSquare } from 'lucide-react';
import { t as translate } from '../../../../shared/i18n';
import { useT } from '../../../../ui/react/hooks';
import { Input } from '../../../../ui/components/input';
import { Field } from '../parts';
import { TextContent } from './text-form';
import type { ActionFormProps, ActionView } from './types';
function Content({ action, update, showErrors, onTouch }: ActionFormProps<'create-task'>) {
	const t = useT();
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
				<Field label={t('automation.taskDueDate')} help={t('automation.taskDueDateHelp')}>
					{(id) => (
						<Input
							id={id}
							type="date"
							value={action.date ?? ''}
							onChange={(event) => {
								const value = event.currentTarget.value;
								update((next) => {
									next.date = value || undefined;
								});
							}}
						/>
					)}
				</Field>
				<Field label={t('automation.calendarTaskTime')}>
					{(id) => (
						<Input
							id={id}
							type="time"
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
