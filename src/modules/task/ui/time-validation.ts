import { TaskWallTimeError, wallTime } from '../core/time';
import { t } from '../../../shared/i18n';
import type { DateTimeValue, DateTimeValidationError } from '../../../ui/components/huhu/date';

export function taskDateTimeError(value: DateTimeValue): DateTimeValidationError | null {
	try {
		wallTime(value.date, value.time, value.timeZone, { disambiguation: 'reject' });
		return null;
	} catch (error) {
		const code = error instanceof TaskWallTimeError ? error.reason : 'invalid-date-time';
		return { code, message: t(`task.${code}`) };
	}
}
export const strictTaskTime = (date: string, time: string, zone: string) =>
	wallTime(date, time, zone, { disambiguation: 'reject' });
