import {
	TaskError,
	type Task,
	type TaskCommand,
	type TaskDraft,
	type TaskReceipt,
	type TaskSchedule,
	type TaskState,
} from './model';
import { commandFingerprint, validateCommand, validateDraft, validateFields } from './validation';
import { nextOccurrence, occurrenceAllowed, occurrenceId, makeOccurrence } from './recurrence';

interface CommandContext {
	now: number;
	deviceId: string;
	schedule?: TaskSchedule;
}
const has = (object: object, key: string) => Object.hasOwn(object, key);
function create(state: TaskState, draft: TaskDraft, commandId: string, context: CommandContext): Task {
	const normalized = validateDraft(draft),
		{ recurrence, ...fields } = normalized;
	const id = `task:${commandId}`;
	if (has(state.tasks, id)) throw new TaskError('idempotency-conflict', 'Task identity already exists');
	const task: Task = {
		...fields,
		id,
		revision: 1,
		status: 'open',
		createdAt: context.now,
		updatedAt: context.now,
		deviceId: context.deviceId,
	};
	if (recurrence) {
		if (!context.schedule) throw new TaskError('schedule-unavailable');
		context.schedule.validate(recurrence, fields.timezone);
		const seriesId = `series:${id}`;
		const series = {
			id: seriesId,
			revision: 1,
			template: structuredClone(fields),
			rule: recurrence,
			deviceId: context.deviceId,
			createdAt: context.now,
			updatedAt: context.now,
			nextAt: null as number | null,
			stopped: false,
		};
		series.nextAt = nextOccurrence(series, context.schedule, recurrence.start);
		state.series[seriesId] = series;
		task.seriesId = seriesId;
		task.occurrenceAt = recurrence.start;
	}
	state.tasks[id] = task;
	return task;
}
function requireTask(state: TaskState, id: string, revision: number): Task {
	const task = has(state.tasks, id) ? state.tasks[id] : undefined;
	if (!task) throw new TaskError('not-found');
	if (task.revision !== revision) throw new TaskError('conflict', 'Task changed since it was read', task.revision);
	return task;
}
function truncateSeries(state: TaskState, id: string, revision: number, from: number, now: number): void {
	const series = has(state.series, id) ? state.series[id] : undefined;
	if (!series) throw new TaskError('not-found');
	if (series.revision !== revision)
		throw new TaskError('conflict', 'Series changed since it was read', series.revision);
	if (from < series.rule.start) throw new TaskError('invalid-input', 'Boundary precedes the series');
	series.until = Math.min(series.until ?? Infinity, from);
	if (series.nextAt !== null && series.nextAt >= series.until) series.nextAt = null;
	series.stopped = series.nextAt === null;
	series.revision++;
	series.updatedAt = now;
	for (const task of Object.values(state.tasks)) {
		if (task.seriesId !== id || task.status !== 'open' || (task.occurrenceAt ?? 0) < from) continue;
		task.status = 'cancelled';
		task.cancelledAt = now;
		task.updatedAt = now;
		task.revision++;
		state.events.push({ kind: 'cancel', at: now, taskId: task.id, seriesId: id });
	}
}
/** One reducer and receipt ledger for UI, calendar, automation and agent commands. */
export function applyTaskCommand(
	state: TaskState,
	command: TaskCommand,
	context: CommandContext,
): { receipt: TaskReceipt; replayed: boolean } {
	validateCommand(command);
	const fingerprint = commandFingerprint(command);
	const previous = has(state.receipts, command.commandId) ? state.receipts[command.commandId] : undefined;
	if (previous) {
		if (previous.fingerprint !== fingerprint)
			throw new TaskError('idempotency-conflict', 'Command ID was already used with a different payload');
		return { receipt: previous.receipt, replayed: true };
	}
	let task: Task | undefined, seriesId: string | undefined;
	if (command.kind === 'create') task = create(state, command.draft, command.commandId, context);
	else if (command.kind === 'materialize') {
		const series = has(state.series, command.id) ? state.series[command.id] : undefined;
		if (!series) throw new TaskError('not-found');
		if (series.revision !== command.expectedRevision)
			throw new TaskError('conflict', 'Series changed since preview', series.revision);
		if (!context.schedule) throw new TaskError('schedule-unavailable');
		if (
			command.at <= series.rule.start ||
			!occurrenceAllowed(series, command.at) ||
			context.schedule.next(series.rule, series.template.timezone, command.at - 1) !== command.at
		)
			throw new TaskError('invalid-input', 'Not an active occurrence of this series');
		const id = occurrenceId(series.id, command.at);
		task = has(state.tasks, id) ? state.tasks[id] : undefined;
		if (!task) {
			task = makeOccurrence(series, command.at, context.now);
			state.tasks[id] = task;
		}
		seriesId = series.id;
		state.events.push({ at: context.now, kind: 'materialize', taskId: id, seriesId, commandId: command.commandId });
	} else if (command.kind === 'update-series' || command.kind === 'cancel-series') {
		truncateSeries(state, command.id, command.expectedRevision, command.from, context.now);
		seriesId = command.id;
		if (command.kind === 'update-series') task = create(state, command.draft, command.commandId, context);
	} else {
		task = requireTask(state, command.id, command.expectedRevision);
		if (task.status === 'cancelled') throw new TaskError('invalid-transition', 'Cancelled tasks cannot be changed');
		const previousDue = task.due ? { ...task.due } : undefined;
		if (command.kind === 'update') {
			const fields = validateFields(command.fields);
			// Replacing editable fields must also clear explicitly unset optional dates.
			delete task.due;
			delete task.planDate;
			delete task.reminderAt;
			Object.assign(task, fields);
		} else if (command.kind === 'complete') {
			if (task.status !== 'open') throw new TaskError('invalid-transition');
			task.status = 'completed';
			task.completedAt = context.now;
		} else if (command.kind === 'reopen') {
			if (task.status !== 'completed') throw new TaskError('invalid-transition');
			task.status = 'open';
			delete task.completedAt;
			// Reopening is not permission to replay a past notification.
			if (task.reminderAt !== undefined && task.reminderAt <= context.now) delete task.reminderAt;
		} else {
			task.status = 'cancelled';
			task.cancelledAt = context.now;
		}
		task.revision++;
		task.updatedAt = context.now;
		state.events.push({
			at: context.now,
			kind: command.kind,
			taskId: task.id,
			commandId: command.commandId,
			previousDue,
			due: task.due,
		});
	}
	if (command.kind === 'create' || command.kind === 'update-series' || command.kind === 'cancel-series')
		state.events.push({
			at: context.now,
			kind: command.kind,
			taskId: task?.id,
			seriesId: task?.seriesId ?? seriesId,
			commandId: command.commandId,
		});
	const receipt: TaskReceipt = {
		commandId: command.commandId,
		kind: command.kind,
		taskId: task?.id,
		taskRevision: task?.revision,
		seriesId: task?.seriesId ?? seriesId,
		committedAt: context.now,
	};
	state.receipts[command.commandId] = { fingerprint, receipt };
	return { receipt, replayed: false };
}
