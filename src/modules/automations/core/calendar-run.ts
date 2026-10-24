import type { AutomationDefinition, AutomationRun, AutomationTaskDelivery } from '../../../shared/automation/types';
import { systemTimeZone } from './schedule';

/** Resolve once, before admission: delayed execution and retries keep the planned local date. */
export function calendarDeliveryForRun(
	definition: AutomationDefinition,
	run: Pick<AutomationRun, 'id' | 'scheduledFor' | 'trigger'>,
): AutomationTaskDelivery | undefined {
	if (definition.action.kind !== 'create-task' || definition.action.target !== 'calendar') return undefined;
	const timezone = (definition.schedule.kind === 'recurring' && definition.schedule.timezone) || systemTimeZone();
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone, calendar: 'iso8601', numberingSystem: 'latn', year: 'numeric', month: '2-digit', day: '2-digit',
	}).formatToParts(new Date(run.scheduledFor));
	const field = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)!.value;
	return {
		effectKey: run.trigger === 'manual'
			? `calendar:manual:${run.id}`
			: `calendar:${encodeURIComponent(definition.id)}:${definition.revision}:${run.scheduledFor}`,
		date: `${field('year')}-${field('month')}-${field('day')}`,
		timezone,
	};
}

/** Retry is offered only for a previously admitted calendar delivery with a durable identity. */
export function canRetryCalendarDelivery(run: AutomationRun): boolean {
	return (run.status === 'failed' || run.status === 'interrupted') &&
		run.definition?.action.kind === 'create-task' && run.definition.action.target === 'calendar' &&
		!!run.taskDelivery?.effectKey;
}
