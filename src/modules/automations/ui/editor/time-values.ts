import type { DateTimeValue, DateTimeValidationError } from '../../../../ui/components/huhu/date';
import { t } from '../../../../shared/i18n';
import { AutomationWallTimeError, resolveWallTime } from '../../core/schedule/zoned-occurrences';

export function strictAutomationTime(value: DateTimeValue): number {
	return resolveWallTime(`${value.date}T${value.time}`, value.timeZone, { disambiguation: 'reject' });
}
export function automationTimeError(value: DateTimeValue): DateTimeValidationError | null {
	try {
		strictAutomationTime(value);
		return null;
	} catch (cause) {
		const code = cause instanceof AutomationWallTimeError ? cause.reason : 'invalid-date-time';
		return { code, message: t(`automation.time.${code}`) };
	}
}
/** Display only. once.at stores no IANA zone; callers retain an explicit ephemeral display zone. */
export function automationTimeValue(at: number, zone: string): DateTimeValue | null {
	if (!Number.isFinite(at)) return null;
	try {
		const parts = Object.fromEntries(
			new Intl.DateTimeFormat('en-CA', {
				timeZone: zone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				hourCycle: 'h23',
			})
				.formatToParts(at)
				.map((part) => [part.type, part.value]),
		);
		return {
			date: `${parts.year}-${parts.month}-${parts.day}`,
			time: `${parts.hour}:${parts.minute}`,
			timeZone: zone,
		};
	} catch {
		return null;
	}
}
