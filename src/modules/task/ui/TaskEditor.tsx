import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { TaskDraft, TaskFields, TaskService, TaskResources, TaskCommand } from '../api';
import { wallTime, zonedStamp } from '../core/time';
import { t } from '../../../shared/i18n';
import { Input } from '../../../ui/components/input';
import { Textarea } from '../../../ui/components/textarea';
import { Label } from '../../../ui/components/label';
import { Button } from '../../../ui/components/button';
import { Choice } from '../../../ui/components/huhu/Choice';
import { ResourcePicker } from './ResourcePicker';
interface Props {
	tasks: TaskService;
	resources: TaskResources;
	id?: string;
	initial?: Partial<TaskDraft>;
	close(this: void): void;
	onSaved?(this: void): void;
	signal: AbortSignal;
}
const fieldsOf = (draft: TaskFields): TaskFields => ({
	title: draft.title,
	description: draft.description,
	timezone: draft.timezone,
	due: draft.due,
	planDate: draft.planDate,
	reminderAt: draft.reminderAt,
	relations: draft.relations,
});
export function TaskEditor({ tasks, resources, id, initial, close, onSaved, signal }: Props) {
	const snapshot = useSyncExternalStore(tasks.subscribe, tasks.snapshot);
	const [original] = useState(() => (id ? tasks.get(id) : undefined));
	const [series] = useState(() => (original?.seriesId ? tasks.getSeries(original.seriesId) : undefined));
	const [draft, setDraft] = useState<TaskDraft>(() => ({
		title: '',
		description: '',
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		relations: [],
		...initial,
		...(original ? fieldsOf(original) : {}),
	}));
	const [reminder, setReminder] = useState(() =>
		draft.reminderAt === undefined ? '' : zonedStamp(draft.reminderAt, draft.timezone).replace(' ', 'T'),
	);
	const [following, setFollowing] = useState(false),
		[repeat, setRepeat] = useState(series || initial?.recurrence ? 'custom' : 'none');
	const [expression, setExpression] = useState(
		series?.rule.expression ?? initial?.recurrence?.expression ?? '0 9 * * *',
	);
	const [end, setEnd] = useState(series?.rule.end ?? initial?.recurrence?.end ?? '');
	const [busy, setBusy] = useState(false),
		[error, setError] = useState(''),
		[cancelConfirm, setCancelConfirm] = useState(false);
	const pending = useRef(false),
		commandId = useRef(crypto.randomUUID()),
		lastPayload = useRef(''),
		alive = useRef(true);
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);
	const send = async (command: TaskCommand) => {
		if (pending.current || signal.aborted) return;
		pending.current = true;
		setBusy(true);
		setError('');
		const payload = JSON.stringify({ ...command, commandId: undefined });
		if (lastPayload.current && lastPayload.current !== payload) commandId.current = crypto.randomUUID();
		lastPayload.current = payload;
		try {
			const result = await tasks.execute({ ...command, commandId: commandId.current }, signal);
			if (!alive.current || signal.aborted) return;
			if (!result.ok) {
				setError(t(`task.error.${result.error.code}`));
				return;
			}
			onSaved?.();
			close();
		} catch {
			if (alive.current) setError(t('task.error.write-failed'));
		} finally {
			pending.current = false;
			if (alive.current) setBusy(false);
		}
	};
	const submit = async () => {
		try {
			let value: TaskDraft = {
				...fieldsOf(draft),
				reminderAt: reminder ? wallTime(reminder.slice(0, 10), reminder.slice(11), draft.timezone) : undefined,
			};
			if (repeat !== 'none' && (!original || following)) {
				if (!draft.due) throw new Error('due required');
				const date = new Date(`${draft.due.date}T12:00:00Z`),
					[hour, minute] = (draft.due.time ?? '00:00').split(':').map(Number);
				const cron =
					repeat === 'daily'
						? `${minute} ${hour} * * *`
						: repeat === 'weekdays'
							? `${minute} ${hour} * * 1-5`
							: repeat === 'weekly'
								? `${minute} ${hour} * * ${date.getUTCDay()}`
								: repeat === 'monthly'
									? `${minute} ${hour} ${date.getUTCDate()} * *`
									: repeat === 'yearly'
										? `${minute} ${hour} ${date.getUTCDate()} ${date.getUTCMonth() + 1} *`
										: expression;
				value = {
					...value,
					recurrence: {
						expression: cron,
						start: wallTime(draft.due.date, draft.due.time ?? '00:00', draft.timezone),
						...(end ? { end } : {}),
					},
				};
			}
			await send(
				original
					? following && series
						? {
								kind: 'update-series',
								commandId: '',
								id: series.id,
								expectedRevision: series.revision,
								from: original.occurrenceAt!,
								draft: value,
							}
						: {
								kind: 'update',
								commandId: '',
								id: original.id,
								expectedRevision: original.revision,
								fields: fieldsOf(value),
							}
					: { kind: 'create', commandId: '', draft: value },
			);
		} catch {
			setError(t('task.error.invalid-input'));
		}
	};
	const disabled = busy || signal.aborted || snapshot.status !== 'ready' || original?.status === 'cancelled';
	if (id && !original) return <p role="alert">{t('task.error.not-found')}</p>;
	return (
		<form
			className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1"
			onSubmit={(event) => {
				event.preventDefault();
				void submit();
			}}
		>
			{original && (
				<div className="grid gap-1 text-xs text-muted-foreground">
					<span>
						{t('task.id')}: {original.id}
					</span>
					<span>
						{t('task.created')}: {zonedStamp(original.createdAt, original.timezone)} · {original.timezone}
					</span>
					{original.completedAt !== undefined && (
						<span>
							{t('task.completedAt')}: {zonedStamp(original.completedAt, original.timezone)}
						</span>
					)}
					{original.overdue && (
						<strong className="text-destructive">
							{t('task.overdueLabel')} · {t('task.daysLate')}: {original.overdueDays} ·{' '}
							{t('task.effective')}: {original.effectiveDate}
						</strong>
					)}
				</div>
			)}
			<Label className="grid gap-2">
				{t('task.titleLabel')}
				<Input
					autoFocus
					value={draft.title}
					onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
					disabled={disabled}
				/>
			</Label>
			<Label className="grid gap-2">
				{t('task.descriptionLabel')}
				<Textarea
					value={draft.description}
					onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })}
					disabled={disabled}
				/>
			</Label>
			<div className="grid grid-cols-2 gap-3">
				<Label className="grid gap-2">
					{t('task.due')}
					<Input
						type="date"
						value={draft.due?.date ?? ''}
						onChange={(event) =>
							setDraft({
								...draft,
								due: event.currentTarget.value
									? { ...draft.due, date: event.currentTarget.value }
									: undefined,
							})
						}
						disabled={disabled}
					/>
				</Label>
				<Label className="grid gap-2">
					{t('task.dueTime')}
					<Input
						type="time"
						value={draft.due?.time ?? ''}
						onChange={(event) =>
							setDraft({
								...draft,
								due: draft.due
									? { ...draft.due, time: event.currentTarget.value || undefined }
									: undefined,
							})
						}
						disabled={disabled || !draft.due}
					/>
				</Label>
			</div>
			<Label className="grid gap-2">
				{t('task.timezone')}
				<Input
					value={draft.timezone}
					onChange={(event) => setDraft({ ...draft, timezone: event.currentTarget.value })}
					disabled={disabled}
				/>
			</Label>
			<div className="grid grid-cols-2 gap-3">
				<Label className="grid gap-2">
					{t('task.reminder')}
					<Input
						type="datetime-local"
						value={reminder}
						onChange={(event) => setReminder(event.currentTarget.value)}
						disabled={disabled}
					/>
				</Label>
				<Label className="grid gap-2">
					{t('task.plan')}
					<Input
						type="date"
						value={draft.planDate ?? ''}
						onChange={(event) => setDraft({ ...draft, planDate: event.currentTarget.value || undefined })}
						disabled={disabled}
					/>
				</Label>
			</div>
			{series && (
				<Choice
					label={t('task.scope')}
					value={following ? 'following' : 'one'}
					options={['one', 'following'].map((key) => [key, t(`task.scope.${key}`)] as const)}
					onChange={(value) => setFollowing(value === 'following')}
					disabled={disabled}
				/>
			)}
			{(!original || following) && (
				<>
					<Choice
						label={t('task.repeat')}
						value={repeat}
						options={['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly', 'custom'].map(
							(key) => [key, t(`task.repeat.${key}`)] as const,
						)}
						onChange={setRepeat}
						disabled={disabled || !snapshot.capabilities.recurrence}
					/>
					{repeat !== 'none' && (
						<>
							<Label className="grid gap-2">
								{t('task.expression')}
								<Input
									value={expression}
									onChange={(event) => setExpression(event.currentTarget.value)}
									disabled={disabled || repeat !== 'custom'}
								/>
							</Label>
							<Label className="grid gap-2">
								{t('task.repeatEnd')}
								<Input
									type="date"
									value={end}
									onChange={(event) => setEnd(event.currentTarget.value)}
									disabled={disabled}
								/>
							</Label>
							<p className="m-0 text-xs text-muted-foreground">{t('task.repeatHint')}</p>
						</>
					)}
				</>
			)}
			{!snapshot.capabilities.reminders && (
				<p role="status" className="m-0 text-xs text-muted-foreground">
					{t('task.scheduleUnavailable')}
				</p>
			)}
			<ResourcePicker
				resources={resources}
				value={draft.relations}
				onChange={(relations) => setDraft({ ...draft, relations })}
				disabled={!!disabled}
			/>
			{original && (
				<details>
					<summary className="cursor-pointer text-sm">{t('task.history')}</summary>
					<div className="grid gap-1 pt-2 text-xs text-muted-foreground">
						{tasks.history(original.id, 0, 20).map((event, index) => (
							<div key={index}>
								{zonedStamp(event.at, original.timezone)} · {event.kind}
								{event.previousDue
									? ` · ${event.previousDue.date} → ${event.due?.date ?? t('task.none')}`
									: ''}
							</div>
						))}
					</div>
				</details>
			)}
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex flex-wrap justify-end gap-2">
				{original && original.status !== 'cancelled' && (
					<Button
						type="button"
						variant="outline"
						disabled={disabled}
						onClick={() => {
							void send({
								kind: original.status === 'open' ? 'complete' : 'reopen',
								commandId: '',
								id: original.id,
								expectedRevision: original.revision,
							});
						}}
					>
						{t(original.status === 'open' ? 'task.complete' : 'task.reopen')}
					</Button>
				)}
				{original && original.status !== 'cancelled' && (
					<Button
						type="button"
						variant="destructive"
						disabled={disabled}
						onClick={() => setCancelConfirm(!cancelConfirm)}
					>
						{t('task.cancel')}
					</Button>
				)}
				<Button type="button" variant="outline" onClick={close} disabled={busy}>
					{t('task.close')}
				</Button>
				<Button type="submit" disabled={disabled || !draft.title.trim()}>
					{t('task.save')}
				</Button>
			</div>
			{cancelConfirm && original && (
				<div className="grid gap-2 rounded-md border border-destructive p-3">
					<p className="text-sm">{t('task.cancelNotice')}</p>
					<Button
						type="button"
						variant="destructive"
						disabled={disabled}
						onClick={() => {
							void send(
								following && series
									? {
											kind: 'cancel-series',
											commandId: '',
											id: series.id,
											expectedRevision: series.revision,
											from: original.occurrenceAt!,
										}
									: {
											kind: 'cancel',
											commandId: '',
											id: original.id,
											expectedRevision: original.revision,
										},
							);
						}}
					>
						{t('task.confirmCancel')}
					</Button>
				</div>
			)}
		</form>
	);
}
