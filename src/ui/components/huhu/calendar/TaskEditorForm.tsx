import { useRef, useState } from 'react';
import { taskDraftError, type TaskDraft } from '../../../../shared/automation/task';
import { t } from '../../../../shared/i18n';
import { Button } from '../../button';
import { Input } from '../../input';
import { Label } from '../../label';
import { Choice } from '../Choice';

export interface TaskEditorOptions {
	initial: TaskDraft;
	repeating?: boolean;
	save(this: void, draft: TaskDraft, following: boolean): Promise<boolean>;
	resolve?(this: void, stamp: string, timezone: string): number;
	validate?(this: void, draft: TaskDraft): void;
	close(this: void): void;
}
/** Task time and reminder remain explicit, independently labelled controls. */
export function TaskEditorForm({ initial, repeating, save, resolve, validate, close }: TaskEditorOptions) {
	const [draft, setDraft] = useState(initial),
		[busy, setBusy] = useState(false),
		[message, setMessage] = useState('');
	const [repeat, setRepeat] = useState(initial.recurrence ? 'custom' : 'none'),
		[following, setFollowing] = useState(false);
	const [expression, setExpression] = useState(initial.recurrence?.expression ?? ''),
		[end, setEnd] = useState(initial.recurrence?.end ?? '');
	const [timezone, setTimezone] = useState(
		initial.recurrence?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
	);
	const pending = useRef(false);
	const submit = async () => {
		if (pending.current) return;
		let value = { ...draft, recurrence: undefined } as TaskDraft;
		try {
			if (repeat !== 'none') {
				if (!draft.date || !resolve) {
					setMessage(t('tasks.error.recurrence'));
					return;
				}
				const date = new Date(`${draft.date}T12:00:00Z`),
					[hour, minute] = (draft.time || '00:00').split(':').map(Number);
				const cron =
					repeat === 'daily'
						? `${minute} ${hour} * * *`
						: repeat === 'workdays'
							? `${minute} ${hour} * * 1-5`
							: repeat === 'weekly'
								? `${minute} ${hour} * * ${date.getUTCDay()}`
								: repeat === 'monthly'
									? `${minute} ${hour} ${date.getUTCDate()} * *`
									: repeat === 'yearly'
										? `${minute} ${hour} ${date.getUTCDate()} ${date.getUTCMonth() + 1} *`
										: expression;
				value = {
					...draft,
					recurrence: {
						expression: cron,
						start: resolve(`${draft.date} ${draft.time || '00:00'}`, timezone),
						timezone,
						end: end || undefined,
					},
				};
			}
			const error = taskDraftError(value);
			if (error) {
				setMessage(t(`tasks.error.${error}`));
				return;
			}
			validate?.(value);
			pending.current = true;
			setBusy(true);
			setMessage('');
			if (await save(value, following)) close();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t('calendarUnified.error.write-failed'));
		} finally {
			pending.current = false;
			setBusy(false);
		}
	};
	return (
		<form
			className="grid gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				void submit();
			}}
			onKeyDown={(event) => {
				if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
			}}
		>
			<Label className="grid gap-2">
				{t('calendarUnified.taskTitle')}
				<Input
					autoFocus
					value={draft.text}
					onChange={(event) => setDraft({ ...draft, text: event.currentTarget.value })}
					disabled={busy}
				/>
			</Label>
			<div className="grid grid-cols-2 gap-3">
				<Label className="grid gap-2">
					{t('tasks.date')}
					<Input
						type="date"
						value={draft.date || ''}
						onChange={(event) => {
							const date = event.currentTarget.value || undefined;
							setDraft({
								...draft,
								date,
								time: date ? draft.time : undefined,
								reminder: date ? draft.reminder : undefined,
							});
							if (!date) setRepeat('none');
						}}
						disabled={busy}
					/>
				</Label>
				<Label className="grid gap-2">
					{t('calendarUnified.taskTime')}
					<Input
						type="time"
						value={draft.time || ''}
						onChange={(event) => setDraft({ ...draft, time: event.currentTarget.value || undefined })}
						disabled={busy || !draft.date}
					/>
				</Label>
			</div>
			<Label className="grid gap-2">
				{t('tasks.reminderTime')}
				<Input
					type="datetime-local"
					value={draft.reminder?.replace(' ', 'T') || ''}
					max={draft.date ? `${draft.date}T${draft.time || '23:59'}` : undefined}
					onChange={(event) =>
						setDraft({ ...draft, reminder: event.currentTarget.value.replace('T', ' ') || undefined })
					}
					disabled={busy || !draft.date}
				/>
			</Label>
			<Choice
				label={t('tasks.repeat')}
				value={repeat}
				options={['none', 'daily', 'workdays', 'weekly', 'monthly', 'yearly', 'custom'].map(
					(key) => [key, t(`tasks.repeat.${key}`)] as const,
				)}
				onChange={setRepeat}
				disabled={busy || !draft.date || !resolve}
			/>
			{repeat !== 'none' && (
				<div className="grid gap-3">
					{repeat === 'custom' && (
						<Label className="grid gap-2">
							{t('tasks.expression')}
							<Input
								value={expression}
								onChange={(event) => setExpression(event.currentTarget.value)}
								disabled={busy}
							/>
						</Label>
					)}
					<div className="grid grid-cols-2 gap-3">
						<Label className="grid gap-2">
							{t('tasks.until')}
							<Input
								type="date"
								min={draft.date}
								value={end}
								onChange={(event) => setEnd(event.currentTarget.value)}
								disabled={busy}
							/>
						</Label>
						<Label className="grid gap-2">
							{t('tasks.timezone')}
							<Input
								value={timezone}
								onChange={(event) => setTimezone(event.currentTarget.value)}
								disabled={busy}
							/>
						</Label>
					</div>
				</div>
			)}
			{repeating && (
				<Choice
					label={t('tasks.applyTo')}
					value={following ? 'following' : 'one'}
					options={['one', 'following'].map((key) => [key, t(`tasks.scope.${key}`)] as const)}
					onChange={(value) => setFollowing(value === 'following')}
					disabled={busy}
				/>
			)}
			{message && (
				<p role="alert" className="m-0 text-sm text-destructive">
					{message}
				</p>
			)}
			<div className="flex justify-end gap-2">
				<Button variant="outline" type="button" onClick={close} disabled={busy}>
					{t('common.cancel')}
				</Button>
				<Button type="submit" disabled={busy || !draft.text.trim()}>
					{t('common.save')}
				</Button>
			</div>
		</form>
	);
}
