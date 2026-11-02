import type { TaskService, TaskDraft } from '../../task/api';
import type { AutomationMessage, AutomationTaskExecution, CreateTaskAction } from '../../../shared/automation/types';
import { AutomationError } from '../../../shared/automation/errors';
/** Admitted run identity becomes a bounded task command ID; retries keep the frozen payload. */
export async function deliverTask(
	tasks: TaskService | undefined,
	action: CreateTaskAction,
	execution: AutomationTaskExecution | undefined,
): Promise<AutomationMessage> {
	if (!tasks || tasks.snapshot().status === 'unavailable') throw new AutomationError('calendarUnavailable');
	const delivery = execution?.run.taskDelivery;
	if (!execution || !delivery?.effectKey || !delivery.date || !delivery.timezone)
		throw new AutomationError('calendarInvalidTarget');
	const { signal, checkpoint } = execution;
	if (signal.aborted) throw new AutomationError('cancelled');
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(delivery.effectKey));
	const commandId = `automation-${Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('')}`;
	let draft: TaskDraft;
	if (delivery.target !== undefined) {
		const frozen = delivery.target as { version?: number; commandId?: string; draft?: TaskDraft };
		if (!frozen || frozen.version !== 1 || frozen.commandId !== commandId || !frozen.draft)
			throw new AutomationError('calendarInvalidTarget');
		draft = frozen.draft;
	} else {
		draft = {
			title: action.text,
			description: '',
			timezone: action.timezone,
			due: { date: action.date ?? delivery.date, ...(action.time ? { time: action.time } : {}) },
			relations: [],
			...(action.reminderAt !== undefined ? { reminderAt: action.reminderAt } : {}),
		};
		await checkpoint({ ...delivery, target: { version: 1, commandId, draft } });
	}
	if (signal.aborted) throw new AutomationError('cancelled');
	const result = await tasks.execute({ kind: 'create', commandId, draft }, signal);
	if (!result.ok)
		throw new AutomationError(
			result.error.code === 'conflict'
				? 'calendarConflict'
				: result.error.code === 'invalid-input'
					? 'calendarInvalidInput'
					: 'calendarWriteFailed',
			{ detail: result.error.message },
		);
	await checkpoint({
		...delivery,
		target: { version: 1, commandId, draft },
		receipt: result.receipt,
		result: result.replayed ? 'already-exists' : 'created',
	});
	return {
		message: '',
		errorCode: result.replayed ? 'calendarAlreadyExists' : 'calendarCreated',
		errorParams: { date: draft.due?.date ?? '', path: result.receipt.taskId ?? '' },
	};
}
