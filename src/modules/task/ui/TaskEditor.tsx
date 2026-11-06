import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { TaskDraft, TaskFields, TaskService, TaskResources, TaskCommand } from '../api';
import { validDate, validTime, validateTimezone, zonedStamp, TaskWallTimeError } from '../core/time';
import { t } from '../../../shared/i18n';
import { Input } from '../../../ui/components/input';
import { Textarea } from '../../../ui/components/textarea';
import { Button } from '../../../ui/components/button';
import { Choice } from '../../../ui/components/huhu/Choice';
import { FormField } from '../../../ui/components/huhu/FormField';
import { Notice } from '../../../ui/components/huhu/Notice';
import { DateField, DateTimeField, type DateTimeValue } from '../../../ui/components/huhu/date';
import { useLeafMetrics } from '../../../ui/react/use-leaf-metrics';
import { useOwnerWindow } from '../../../ui/react/hooks';
import { ResourcePicker } from './ResourcePicker';
import { strictTaskTime, taskDateTimeError } from './time-validation';

interface Props {
	tasks: TaskService;
	resources: TaskResources;
	id?: string;
	initial?: Partial<TaskDraft>;
	close(this: void): void;
	onSaved?(this: void): void;
	signal: AbortSignal;
	autoSave?: boolean;
	onDirtyChange?(this: void, dirty: boolean): void;
	logicalLeaf?: HTMLElement | null;
}
export const fieldsOf = (draft: TaskFields): TaskFields => ({
	title: draft.title,
	description: draft.description,
	timezone: draft.timezone,
	due: draft.due,
	planDate: draft.planDate,
	reminderAt: draft.reminderAt,
	relations: draft.relations,
});

/** A serialized writer snapshots the latest draft, never applies a receipt over newer user input. */
export function TaskEditor({
	tasks,
	resources,
	id,
	initial,
	close,
	onSaved,
	signal,
	autoSave = false,
	onDirtyChange,
	logicalLeaf,
}: Props) {
	const snapshot = useSyncExternalStore(tasks.subscribe, tasks.snapshot);
	const win = useOwnerWindow();
	const leaf = useLeafMetrics(logicalLeaf);
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
	const [reminder, setReminder] = useState<DateTimeValue | null>(() =>
		draft.reminderAt === undefined
			? null
			: {
					date: zonedStamp(draft.reminderAt, draft.timezone).slice(0, 10),
					time: zonedStamp(draft.reminderAt, draft.timezone).slice(11),
					timeZone: draft.timezone,
				},
	);
	const raw = useRef({
		due: draft.due?.date ?? '',
		plan: draft.planDate ?? '',
		end: series?.rule.end ?? initial?.recurrence?.end ?? '',
		reminder: reminder ? { ...reminder } : { date: '', time: '', timeZone: draft.timezone },
	});
	const [following, setFollowing] = useState(false),
		[repeat, setRepeat] = useState(series || initial?.recurrence ? 'custom' : 'none');
	const [expression, setExpression] = useState(
		series?.rule.expression ?? initial?.recurrence?.expression ?? '0 9 * * *',
	);
	const [end, setEnd] = useState(series?.rule.end ?? initial?.recurrence?.end ?? '');
	const [busy, setBusy] = useState(false),
		[error, setError] = useState(''),
		[dirty, setDirty] = useState(false),
		[edits, setEdits] = useState(0),
		[cancelConfirm, setCancelConfirm] = useState(false);
	const revision = useRef(original?.revision ?? 0),
		version = useRef(0),
		pending = useRef(false),
		alive = useRef(true),
		savedVersion = useRef(0);
	const retry = useRef<{ payload: string; commandId: string } | undefined>(undefined);
	const saveRef = useRef<() => Promise<void>>(async () => {});
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);

	const markDirty = (value: boolean) => {
		setDirty(value);
		onDirtyChange?.(value);
	};
	const changed = () => {
		version.current++;
		setEdits(version.current);
		markDirty(true);
		setError('');
	};
	const update = (next: TaskDraft) => {
		setDraft(next);
		changed();
	};
	const liveTask = id ? tasks.get(id) : undefined;
	const disabled =
		signal.aborted || snapshot.status !== 'ready' || liveTask?.status === 'cancelled' || (!autoSave && busy);
	const build = (): TaskDraft => {
		if (!draft.title.trim()) throw new Error(t('task.error.invalid-input'));
		validateTimezone(draft.timezone);
		if (
			raw.current.due !== (draft.due?.date ?? '') ||
			raw.current.plan !== (draft.planDate ?? '') ||
			raw.current.end !== end
		)
			throw new Error(t('task.invalid-date-time'));
		if (draft.due?.time && (!validTime(draft.due.time) || !draft.due.date))
			throw new Error(t('task.invalid-date-time'));
		if (draft.due?.time) strictTaskTime(draft.due.date, draft.due.time, draft.timezone);
		const r = raw.current.reminder;
		if ((r.date || r.time) && (!validDate(r.date) || !validTime(r.time)))
			throw new Error(t('task.invalid-date-time'));
		const value: TaskDraft = {
			...fieldsOf(draft),
			reminderAt: r.date || r.time ? strictTaskTime(r.date, r.time, r.timeZone) : undefined,
		};
		if (repeat !== 'none' && (!original || following)) {
			if (!draft.due) throw new Error(t('task.error.invalid-input'));
			const d = new Date(`${draft.due.date}T12:00:00Z`),
				[hour, minute] = (draft.due.time ?? '00:00').split(':').map(Number);
			const cron =
				repeat === 'daily'
					? `${minute} ${hour} * * *`
					: repeat === 'weekdays'
						? `${minute} ${hour} * * 1-5`
						: repeat === 'weekly'
							? `${minute} ${hour} * * ${d.getUTCDay()}`
							: repeat === 'monthly'
								? `${minute} ${hour} ${d.getUTCDate()} * *`
								: repeat === 'yearly'
									? `${minute} ${hour} ${d.getUTCDate()} ${d.getUTCMonth() + 1} *`
									: expression;
			value.recurrence = {
				expression: cron,
				start: strictTaskTime(draft.due.date, draft.due.time ?? '00:00', draft.timezone),
				...(end ? { end } : {}),
			};
		}
		return value;
	};
	const send = async (command: TaskCommand): Promise<boolean> => {
		const payload = JSON.stringify({ ...command, commandId: undefined });
		if (retry.current?.payload !== payload) retry.current = { payload, commandId: crypto.randomUUID() };
		const result = await tasks.execute({ ...command, commandId: retry.current.commandId }, signal);
		if (!alive.current || signal.aborted) return false;
		if (!result.ok) {
			setError(t(`task.error.${result.error.code}`));
			return false;
		}
		if (result.receipt.taskRevision) revision.current = result.receipt.taskRevision;
		retry.current = undefined;
		onSaved?.();
		return true;
	};
	saveRef.current = async () => {
		if (
			pending.current ||
			signal.aborted ||
			tasks.snapshot().status !== 'ready' ||
			(id && tasks.get(id)?.status === 'cancelled')
		)
			return;
		let value: TaskDraft;
		try {
			value = build();
		} catch (cause) {
			setError(cause instanceof TaskWallTimeError ? t(`task.${cause.reason}`) : t('task.error.invalid-input'));
			return;
		}
		const captured = version.current;
		pending.current = true;
		setBusy(true);
		setError('');
		try {
			const command: TaskCommand = original
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
							expectedRevision: revision.current,
							fields: fieldsOf(value),
						}
				: { kind: 'create', commandId: '', draft: value };
			if (await send(command)) {
				savedVersion.current = captured;
				if (version.current === captured) {
					markDirty(false);
					if (!autoSave || following) close();
				}
			}
		} catch {
			if (alive.current && !signal.aborted) setError(t('task.error.write-failed'));
		} finally {
			pending.current = false;
			if (alive.current) setBusy(false);
		}
	};
	// An edit made while a write was pending is saved only after that write's revision arrives.
	useEffect(() => {
		if (autoSave && !following && !busy && dirty && !error && version.current > savedVersion.current && edits > 0) {
			const timer = win.setTimeout(() => {
				void saveRef.current();
			}, 450);
			return () => win.clearTimeout(timer);
		}
		return undefined;
	}, [autoSave, following, busy, dirty, error, edits, win]);
	const action = async (kind: 'complete' | 'reopen' | 'cancel') => {
		if (pending.current || disabled) return;
		if (autoSave && version.current > savedVersion.current) {
			await saveRef.current();
			if (version.current > savedVersion.current) return;
		}
		pending.current = true;
		setBusy(true);
		setError('');
		try {
			if (
				await send(
					kind === 'cancel' && following && series
						? {
								kind: 'cancel-series',
								commandId: '',
								id: series.id,
								expectedRevision: series.revision,
								from: original!.occurrenceAt!,
							}
						: { kind, commandId: '', id: original!.id, expectedRevision: revision.current },
				)
			) {
				setCancelConfirm(false);
				if (!autoSave || following) close();
			}
		} catch {
			if (alive.current) setError(t('task.error.write-failed'));
		} finally {
			pending.current = false;
			if (alive.current) setBusy(false);
		}
	};
	if (id && !original) return <Notice tone="error" title={t('task.error.not-found')} />;
	return (
		<form
			ref={leaf.ref}
			className="flex min-w-0 flex-col gap-4"
			data-task-editor
			onSubmit={(e) => {
				e.preventDefault();
				void saveRef.current();
			}}
		>
			<div role="status" aria-live="polite" className="text-xs text-[var(--hu-fg-3)]">
				{busy ? t('task.saving') : dirty ? t('task.unsaved') : t('task.savedState')}
			</div>
			{liveTask?.status === 'cancelled' && <Notice title={t('task.cancelledReadOnly')} />}
			<FormField label={t('task.titleLabel')}>
				<Input
					autoFocus
					value={draft.title}
					onChange={(e) => update({ ...draft, title: e.currentTarget.value })}
					disabled={disabled}
				/>
			</FormField>
			<FormField label={t('task.descriptionLabel')}>
				<Textarea
					value={draft.description}
					onChange={(e) => update({ ...draft, description: e.currentTarget.value })}
					disabled={disabled}
				/>
			</FormField>
			<DateField
				label={t('task.due')}
				value={draft.due?.date ?? null}
				onDraftChange={(v) => {
					if (raw.current.due !== v) {
						raw.current.due = v;
						changed();
					}
				}}
				onChange={(v) => update({ ...draft, due: v ? { ...draft.due, date: v } : undefined })}
				disabled={disabled}
				collisionBoundary={leaf.element}
			/>
			<FormField label={t('task.dueTime')}>
				<Input
					placeholder="HH:mm"
					value={draft.due?.time ?? ''}
					onChange={(e) =>
						update({
							...draft,
							due: draft.due ? { ...draft.due, time: e.currentTarget.value || undefined } : undefined,
						})
					}
					disabled={disabled || !draft.due}
				/>
			</FormField>
			<FormField label={t('task.timezone')}>
				<Input
					value={draft.timezone}
					onChange={(e) => update({ ...draft, timezone: e.currentTarget.value })}
					disabled={disabled}
				/>
			</FormField>
			<DateField
				label={t('task.plan')}
				value={draft.planDate ?? null}
				onDraftChange={(v) => {
					if (raw.current.plan !== v) {
						raw.current.plan = v;
						changed();
					}
				}}
				onChange={(v) => update({ ...draft, planDate: v ?? undefined })}
				disabled={disabled}
				collisionBoundary={leaf.element}
			/>
			<DateTimeField
				label={t('task.reminder')}
				value={reminder}
				initialTimeZone={draft.timezone}
				validateValue={taskDateTimeError}
				onDraftChange={(v) => {
					if (JSON.stringify(raw.current.reminder) !== JSON.stringify(v)) {
						raw.current.reminder = v;
						changed();
					}
				}}
				onChange={(v) => {
					setReminder(v);
					raw.current.reminder = v ? { ...v } : { date: '', time: '', timeZone: draft.timezone };
					changed();
				}}
				disabled={disabled || !snapshot.capabilities.reminders}
				collisionBoundary={leaf.element}
			/>
			{series && (
				<Choice
					label={t('task.scope')}
					value={following ? 'following' : 'one'}
					options={['one', 'following'].map((v) => [v, t(`task.scope.${v}`)] as const)}
					onChange={(v) => {
						setFollowing(v === 'following');
					}}
					disabled={disabled}
				/>
			)}
			{series && !following && (
				<p className="text-xs text-[var(--hu-fg-3)]">
					{t('task.repeat')}: {series.rule.expression} {series.rule.end}
				</p>
			)}
			{(!original || following) && (
				<>
					<Choice
						label={t('task.repeat')}
						value={repeat}
						options={['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly', 'custom'].map(
							(v) => [v, t(`task.repeat.${v}`)] as const,
						)}
						onChange={(v) => {
							setRepeat(v);
							changed();
						}}
						disabled={disabled || !snapshot.capabilities.recurrence}
					/>
					{repeat !== 'none' && (
						<>
							<FormField label={t('task.expression')}>
								<Input
									value={expression}
									onChange={(e) => {
										setExpression(e.currentTarget.value);
										changed();
									}}
									disabled={disabled || repeat !== 'custom'}
								/>
							</FormField>
							<DateField
								label={t('task.repeatEnd')}
								value={end || null}
								min={draft.due?.date}
								onDraftChange={(v) => {
									if (raw.current.end !== v) {
										raw.current.end = v;
										changed();
									}
								}}
								onChange={(v) => {
									setEnd(v ?? '');
									changed();
								}}
								disabled={disabled}
								collisionBoundary={leaf.element}
							/>
							<p className="text-xs text-[var(--hu-fg-3)]">{t('task.repeatHint')}</p>
						</>
					)}
				</>
			)}
			{(!snapshot.capabilities.reminders || !snapshot.capabilities.recurrence) && (
				<Notice title={t('task.scheduleUnavailable')} />
			)}
			<ResourcePicker
				resources={resources}
				value={draft.relations}
				onChange={(v) => update({ ...draft, relations: v })}
				disabled={disabled}
			/>
			{original && (
				<details>
					<summary>{t('task.history')}</summary>
					<div className="space-y-1 text-xs text-[var(--hu-fg-3)]">
						{tasks.history(original.id, 0, 20).map((event, i) => (
							<div key={i}>
								{zonedStamp(event.at, original.timezone)} · {event.kind}
								{event.previousDue
									? ` · ${event.previousDue.date} → ${event.due?.date ?? t('task.none')}`
									: ''}
							</div>
						))}
						<div>
							{t('task.created')}: {zonedStamp(original.createdAt, original.timezone)}
						</div>
						<div>
							{t('task.updated')}:{' '}
							{zonedStamp(liveTask?.updatedAt ?? original.updatedAt, original.timezone)}
						</div>
					</div>
				</details>
			)}
			{error && (
				<Notice
					tone="error"
					title={error}
					action={
						<Button
							type="button"
							variant="secondary"
							disabled={busy}
							onClick={() => {
								void tasks
									.refresh()
									.then(() => saveRef.current())
									.catch(() => setError(t('task.error.write-failed')));
							}}
						>
							{t('task.retrySave')}
						</Button>
					}
				/>
			)}
			<div className="flex flex-wrap justify-end gap-2">
				{original && liveTask?.status !== 'cancelled' && (
					<>
						<Button
							type="button"
							variant="secondary"
							disabled={disabled || busy}
							onClick={() => {
								void action(liveTask?.status === 'open' ? 'complete' : 'reopen');
							}}
						>
							{t(liveTask?.status === 'open' ? 'task.complete' : 'task.reopen')}
						</Button>
						<Button
							type="button"
							variant="danger-ghost"
							disabled={disabled || busy}
							onClick={() => setCancelConfirm((v) => !v)}
						>
							{t('task.cancel')}
						</Button>
					</>
				)}
				{!autoSave && (
					<Button type="button" variant="secondary" onClick={close} disabled={busy}>
						{t('task.close')}
					</Button>
				)}
				{(!autoSave || following) && (
					<Button type="submit" busy={busy} disabled={disabled || !draft.title.trim()}>
						{t('task.save')}
					</Button>
				)}
			</div>
			{cancelConfirm && original && (
				<Notice
					tone="warning"
					title={t('task.cancelNotice')}
					action={
						<Button
							type="button"
							variant="danger"
							disabled={disabled || busy}
							onClick={() => {
								void action('cancel');
							}}
						>
							{t('task.confirmCancel')}
						</Button>
					}
				/>
			)}
		</form>
	);
}
