import type { CalendarService, CalendarFailure } from '../../home/api';
import { AutomationError } from '../../../shared/automation/errors';
import type { AutomationMessage, AutomationTaskExecution, CreateTaskAction } from '../../../shared/automation/types';

const failureCodes: Record<CalendarFailure['code'], string> = {
	'invalid-input': 'calendarInvalidInput',
	'invalid-target': 'calendarInvalidTarget',
	'source-excluded': 'calendarSourceExcluded',
	'source-missing': 'sourceMissing',
	'period-disabled': 'calendarPeriodDisabled',
	'periodic-unavailable': 'calendarPeriodicUnavailable',
	'template-missing': 'calendarTemplateMissing',
	'template-input-required': 'calendarTemplateInputRequired',
	'template-engine-unavailable': 'calendarTemplateEngineUnavailable',
	'template-invalid': 'calendarTemplateInvalid',
	'conflict': 'calendarConflict',
	'write-failed': 'calendarWriteFailed',
	'stopped': 'calendarUnavailable',
};

/** Destination and receipt checkpoints bracket the effect; replay always reuses the first destination. */
export async function deliverCalendarTask(
	calendar: CalendarService | undefined,
	action: Extract<CreateTaskAction, { target: 'calendar' }>,
	execution: AutomationTaskExecution | undefined,
): Promise<AutomationMessage> {
	if (!calendar) throw new AutomationError('calendarUnavailable');
	if (!execution?.run.taskDelivery) throw new AutomationError('calendarInvalidTarget');
	const { run, signal, checkpoint } = execution;
	const delivery = run.taskDelivery;
	if (!delivery || typeof delivery.effectKey !== 'string' || !delivery.effectKey ||
		typeof delivery.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(delivery.date) ||
		typeof delivery.timezone !== 'string' || !delivery.timezone)
		throw new AutomationError('calendarInvalidTarget');
	const assertRunning = () => {
		if (signal.aborted) throw new AutomationError('cancelled');
	};
	assertRunning();
	const input = {
		boardPath: action.path, date: delivery.date, text: action.text, time: action.time,
		reminder: action.reminderTime ? `${delivery.date} ${action.reminderTime}` : undefined,
		effectKey: delivery.effectKey, runId: run.id, interactive: false, signal,
	};
	let target = delivery.target;
	if (target === undefined) {
		const resolved = await calendar.resolveTarget(input);
		if (resolved.status !== 'ready') throw new AutomationError(failureCodes[resolved.code], { detail: resolved.message ?? resolved.code });
		target = resolved.target;
		assertRunning();
		await checkpoint({ ...delivery, target });
	}
	assertRunning();
	const result = await calendar.createTask({ ...input, target });
	if ('code' in result) throw new AutomationError(failureCodes[result.code], { detail: result.message ?? result.code });
	// A committed task remains committed even when refreshing the in-memory index failed.
	await checkpoint({ ...delivery, target: result.target, receipt: result.receipt, result: result.status });
	const errorCode = result.status === 'written-pending-refresh'
		? 'calendarWrittenPendingRefresh'
		: result.status === 'already-exists' ? 'calendarAlreadyExists' : 'calendarCreated';
	return { message: '', errorCode, errorParams: { date: delivery.date, path: result.receipt.path } };
}
