import { CheckSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '../../../../ui/react/hooks';
import { t as translate } from '../../../../shared/i18n';
import { Choice, Field, SearchChoice } from '../parts';
import { Input } from '../../../../ui/components/input';
import { Button } from '../../../../ui/components/button';
import type { AutomationCalendarTarget } from '../../api';
import { systemTimeZone } from '../../core/schedule';
import type { AutomationViewHost, TaskTarget } from '../panel-contract';
import { TextContent } from './text-form';
import type { ActionFormProps, ActionView } from './types';

function Content({ action, draft, update, onChange, host, showErrors, onTouch }: ActionFormProps<'create-task'>) {
	const t = useT();
	const [targets, setTargets] = useState<TaskTarget[]>([]);
	const [calendars, setCalendars] = useState<AutomationCalendarTarget[]>([]);
	const [errors, setErrors] = useState({ cards: '', calendars: '' });
	const [generation, setGeneration] = useState(0);
	const [loaded, setLoaded] = useState<{ host: AutomationViewHost; generation: number }>();
	const loading = loaded?.host !== host || loaded?.generation !== generation;
	const isCalendar = action.target === 'calendar';
	useEffect(() => {
		let cancelled = false;
		void Promise.allSettled([
			host.taskTargets?.() ?? Promise.resolve([]), host.calendarTargets?.() ?? Promise.resolve([]),
		]).then(([cards, days]) => {
			if (cancelled) return;
			setTargets(cards.status === 'fulfilled' ? cards.value : []);
			setCalendars(days.status === 'fulfilled' ? days.value : []);
			setErrors({ cards: cards.status === 'rejected' ? String(cards.reason) : '', calendars: days.status === 'rejected' ? String(days.reason) : '' });
			setLoaded({ host, generation });
		});
		return () => {
			cancelled = true;
		};
	}, [host, generation]);
	const error = isCalendar ? errors.calendars : errors.cards;
	const selectedCalendar = calendars.find((target) => target.path === action.path);
	const timezone = (draft.schedule.kind === 'recurring' && draft.schedule.timezone) || systemTimeZone();
	return (
		<>
			<div className="flex flex-col gap-4">
				<Field label={t('automation.taskDestination')}>
					{(id) => <Choice id={id} label={t('automation.taskDestination')} value={isCalendar ? 'calendar' : 'board-card'}
						options={[{ value: 'board-card', label: t('automation.card') }, { value: 'calendar', label: t('automation.calendarTarget') }]}
						onChange={(target) => onChange((next) => {
							next.action = target === 'calendar'
								? { kind: 'create-task', target: 'calendar', path: action.path, text: action.text }
								: { kind: 'create-task', target: 'board-card', path: action.path, cardId: '', text: action.text };
						})} />}
				</Field>
				<Field label={t('automation.board')}>
					{(id) => (
						<SearchChoice
							id={id}
							label={t('automation.board')}
							clearable
							value={action.path}
							disabled={loading}
							options={isCalendar ? calendars.map((target) => ({ value: target.path, label: `${target.title} · ${target.path}` })) : [...new Set(targets.map((target) => target.path))].map((value) => ({
								value,
								label: value,
							}))}
							onChange={(value) =>
								update((a) => {
									a.path = value;
									if (a.target !== 'calendar') a.cardId = '';
								})
							}
						/>
					)}
				</Field>
				{action.target !== 'calendar' && <Field label={t('automation.card')}>
					{(id) => (
						<SearchChoice
							id={id}
							label={t('automation.card')}
							clearable
							value={action.cardId}
							options={targets
								.filter((target) => target.path === action.path)
								.map((target) => ({ value: target.cardId, label: target.title }))}
							onChange={(value) =>
								update((a) => {
									if (a.target !== 'calendar') a.cardId = value;
								})
							}
						/>
					)}
				</Field>}
				{action.target === 'calendar' && <>
					<div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs leading-5">
						<p>{t('automation.calendarSharedStorage')}</p>
						{selectedCalendar && <p className="break-words">
							{t(`automation.calendarStorage.${selectedCalendar.storage.kind}`)}
							{selectedCalendar.storage.path ? ` · ${selectedCalendar.storage.path}` : ''}
						</p>}
						<p>{t('automation.calendarDateHelp', { timezone })}</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field label={t('automation.calendarTaskTime')} help={t('automation.calendarTaskTimeHelp')}>
							{(id) => <Input id={id} type="time" value={action.time ?? ''} onChange={(event) => {
								const value = event.currentTarget.value;
								update((next) => { if (next.target === 'calendar') next.time = value || undefined; });
							}} />}
						</Field>
						<Field label={t('automation.calendarReminderTime')} help={t('automation.calendarReminderTimeHelp')}>
							{(id) => <Input id={id} type="time" value={action.reminderTime ?? ''} onChange={(event) => {
								const value = event.currentTarget.value;
								update((next) => { if (next.target === 'calendar') next.reminderTime = value || undefined; });
							}} />}
						</Field>
					</div>
				</>}
				{loading && <p role="status" className="text-xs text-muted-foreground">{t('automation.loadingTaskTargets')}</p>}
				{!loading && !error && !(isCalendar ? calendars.length : targets.length) && (
					<p className="text-xs leading-4 text-muted-foreground">{t(isCalendar ? 'automation.noCalendarTargets' : 'automation.noTaskTargets')}</p>
				)}
				{!loading && error && (
					<div role="alert" className="space-y-2 text-xs text-destructive">
						<p>{error}</p><Button type="button" variant="outline" size="sm" onClick={() => setGeneration((value) => value + 1)}>{t('automation.retry')}</Button>
					</div>
				)}
			</div>
			<TextContent
				label={t('automation.todoText')}
				value={action.text}
				error={showErrors && !action.text.trim() ? t('automation.contentRequired') : undefined}
				className="min-h-24"
				onChange={(text) => {
					onTouch();
					update((a) => {
						a.text = text;
					});
				}}
				onTouch={onTouch}
			/>
		</>
	);
}

export const createTaskView: ActionView<'create-task'> = {
	kind: 'create-task',
	Icon: CheckSquare,
	Content,
	facts: (action) => [
		{ label: translate('automation.taskDestination'), value: translate(action.target === 'calendar' ? 'automation.calendarTarget' : 'automation.card') },
		{ label: translate('automation.board'), value: action.path || '—' },
	],
	// The card may have been removed or changed since the form was filled in.
	beforeSave: async (action, host) => {
		const valid = action.target === 'calendar'
			? (await host.calendarTargets?.())?.some((row) => row.path === action.path)
			: (await host.taskTargets?.())?.some((row) => row.path === action.path && row.cardId === action.cardId);
		if (!valid) throw new Error(translate('automation.targetRequired'));
	},
};
