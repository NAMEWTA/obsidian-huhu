import { TaskError, type TaskFields, type TaskDraft, type TaskState, type TaskCommand } from './model';
import { deadline, validDate, validTime, validateTimezone, wallTime } from './time';
import { normalizeResources } from './resources';

export function validateFields(fields: TaskFields): TaskFields {
	if (
		!fields ||
		typeof fields !== 'object' ||
		typeof fields.title !== 'string' ||
		!fields.title.trim() ||
		fields.title.length > 1000 ||
		/[\r\n\0]/.test(fields.title) ||
		typeof fields.description !== 'string' ||
		fields.description.length > 100_000
	)
		throw new TaskError('invalid-input', 'Invalid task title/description');
	validateTimezone(fields.timezone);
	if (
		fields.due &&
		(typeof fields.due !== 'object' ||
			!validDate(fields.due.date) ||
			(fields.due.time !== undefined && !validTime(fields.due.time)))
	)
		throw new TaskError('invalid-input', 'Invalid due time');
	const end = deadline(fields.due, fields.timezone);
	if (fields.planDate !== undefined && !validDate(fields.planDate))
		throw new TaskError('invalid-input', 'Invalid plan date');
	if (
		fields.reminderAt !== undefined &&
		(!Number.isSafeInteger(fields.reminderAt) ||
			fields.reminderAt < 0 ||
			(end !== undefined && fields.reminderAt > end))
	)
		throw new TaskError('invalid-input', 'Reminder must not be after the deadline');
	return {
		title: fields.title.trim(),
		description: fields.description,
		timezone: fields.timezone,
		...(fields.due ? { due: { ...fields.due } } : {}),
		...(fields.planDate ? { planDate: fields.planDate } : {}),
		...(fields.reminderAt !== undefined ? { reminderAt: fields.reminderAt } : {}),
		relations: normalizeResources(fields.relations),
	};
}
export function validateDraft(draft: TaskDraft): TaskDraft {
	const fields = validateFields(draft);
	if (!draft.recurrence) return fields;
	const rule = draft.recurrence;
	if (
		!fields.due ||
		typeof rule.expression !== 'string' ||
		!rule.expression.trim() ||
		rule.expression.length > 200 ||
		!Number.isSafeInteger(rule.start) ||
		rule.start !== wallTime(fields.due.date, fields.due.time ?? '00:00', fields.timezone) ||
		(rule.end !== undefined && (!validDate(rule.end) || rule.end < fields.due.date))
	)
		throw new TaskError('invalid-input', 'Invalid recurrence');
	return {
		...fields,
		recurrence: { expression: rule.expression.trim(), start: rule.start, ...(rule.end ? { end: rule.end } : {}) },
	};
}
export function commandFingerprint(command: TaskCommand): string {
	const canonical = (value: unknown): unknown => {
		if (Array.isArray(value)) return value.map(canonical);
		if (value && typeof value === 'object')
			return Object.fromEntries(
				Object.entries(value)
					.filter(([, field]) => field !== undefined)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([key, field]) => [key, canonical(field)]),
			);
		return value;
	};
	return JSON.stringify(canonical(command));
}
export function validateCommand(command: TaskCommand): void {
	if (
		!command ||
		typeof command !== 'object' ||
		typeof command.commandId !== 'string' ||
		!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(command.commandId)
	)
		throw new TaskError('invalid-input', 'Invalid command ID');
	if (command.kind === 'create') {
		validateDraft(command.draft);
		return;
	}
	if (
		typeof command.id !== 'string' ||
		!command.id ||
		command.id.length > 512 ||
		!Number.isSafeInteger(command.expectedRevision) ||
		command.expectedRevision < 1
	)
		throw new TaskError('invalid-input', 'ID and expectedRevision are required');
	if (command.kind === 'update') validateFields(command.fields);
	else if (command.kind === 'update-series') validateDraft(command.draft);
	else if (command.kind === 'materialize') {
		if (!Number.isSafeInteger(command.at) || command.at < 0)
			throw new TaskError('invalid-input', 'Invalid occurrence instant');
	} else if (!['complete', 'reopen', 'cancel', 'cancel-series'].includes(command.kind))
		throw new TaskError('invalid-input', 'Unknown command');
	if (
		(command.kind === 'update-series' || command.kind === 'cancel-series') &&
		(!Number.isSafeInteger(command.from) || command.from < 0)
	)
		throw new TaskError('invalid-input', 'Invalid series boundary');
}
/** Strict versioned decoding: never repairs a damaged repository by replacing it with an empty one. */
export function decodeTaskState(raw: string): TaskState {
	try {
		const state = JSON.parse(raw) as TaskState;
		const dictionary = (value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value);
		const stamp = (value: unknown) =>
			typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8_640_000_000_000_000;
		const identity = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 512;
		const eventKinds = [
			'create',
			'update',
			'complete',
			'reopen',
			'cancel',
			'update-series',
			'cancel-series',
			'materialize',
			'occurrence',
			'resource-renamed',
		];
		if (
			!state ||
			state.version !== 1 ||
			!Number.isSafeInteger(state.revision) ||
			state.revision < 0 ||
			!dictionary(state.tasks) ||
			!dictionary(state.series) ||
			!dictionary(state.receipts) ||
			!Array.isArray(state.events)
		)
			throw new Error('Invalid state');
		for (const [id, task] of Object.entries(state.tasks)) {
			if (
				!task ||
				!identity(id) ||
				task.id !== id ||
				!Number.isSafeInteger(task.revision) ||
				task.revision < 1 ||
				!['open', 'completed', 'cancelled'].includes(task.status) ||
				!stamp(task.createdAt) ||
				!stamp(task.updatedAt) ||
				!identity(task.deviceId)
			)
				throw new Error('Invalid task');
			validateFields(task);
			if (
				(task.seriesId !== undefined &&
					(!identity(task.seriesId) ||
						!Object.hasOwn(state.series, task.seriesId) ||
						!stamp(task.occurrenceAt))) ||
				(task.seriesId === undefined && task.occurrenceAt !== undefined) ||
				(task.status === 'open' && task.completedAt !== undefined) ||
				(task.status !== 'cancelled' && task.cancelledAt !== undefined)
			)
				throw new Error('Invalid task state');
			if (task.status === 'completed' && !stamp(task.completedAt)) throw new Error('Invalid completion');
			if (task.status === 'cancelled' && !stamp(task.cancelledAt)) throw new Error('Invalid cancellation');
		}
		for (const [id, series] of Object.entries(state.series)) {
			if (
				!series ||
				!identity(id) ||
				series.id !== id ||
				!Number.isSafeInteger(series.revision) ||
				series.revision < 1 ||
				!identity(series.deviceId) ||
				!stamp(series.createdAt) ||
				!stamp(series.updatedAt) ||
				typeof series.stopped !== 'boolean' ||
				(series.until !== undefined && !stamp(series.until)) ||
				(series.nextAt !== null && !stamp(series.nextAt))
			)
				throw new Error('Invalid series');
			validateDraft({ ...series.template, recurrence: series.rule });
		}
		for (const [id, entry] of Object.entries(state.receipts)) {
			if (
				!entry ||
				typeof entry.fingerprint !== 'string' ||
				entry.receipt?.commandId !== id ||
				!stamp(entry.receipt.committedAt) ||
				!eventKinds.includes(entry.receipt.kind)
			)
				throw new Error('Invalid receipt');
		}
		for (const event of state.events) {
			if (
				!event ||
				!stamp(event.at) ||
				!eventKinds.includes(event.kind) ||
				(event.taskId !== undefined && !identity(event.taskId)) ||
				(event.seriesId !== undefined && !identity(event.seriesId))
			)
				throw new Error('Invalid event');
		}
		return state;
	} catch (error) {
		throw new TaskError('corrupt-store', error instanceof Error ? error.message : 'Invalid task repository');
	}
}
