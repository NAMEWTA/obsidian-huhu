import { useState } from 'react';
import { DateTimeField } from '../../../../ui/components/huhu/date';
import { useT } from '../../../../ui/react/hooks';
import { automationTimeError, automationTimeValue, strictAutomationTime } from './time-values';
import { useDraftIssue, useEditorBoundary } from './draft-issues';
/** Automation-owned epoch adapter around the one shared DateTimeField; raw edits never commit an old valid epoch. */
export function AutomationTimeField({
	id,
	label,
	value,
	zone,
	required = false,
	onChange,
	description,
}: {
	id: string;
	label: string;
	value: number | undefined;
	zone: string;
	required?: boolean;
	onChange(this: void, at: number | undefined, zone: string): void;
	description?: string;
}) {
	const [displayZone, setDisplayZone] = useState(zone),
		[previousZone, setPreviousZone] = useState(zone),
		boundary = useEditorBoundary(),
		t = useT(),
		report = useDraftIssue(id);
	if (previousZone !== zone) {
		setPreviousZone(zone);
		setDisplayZone(zone);
	}
	const current = value === undefined ? null : automationTimeValue(value, displayZone);
	return (
		<DateTimeField
			label={label}
			description={description}
			value={current}
			initialTimeZone={displayZone}
			required={required}
			collisionBoundary={boundary}
			validateValue={automationTimeError}
			onDraftChange={(raw) => {
				if (!required && !raw.date && !raw.time) {
					report(
						value !== undefined && !Number.isFinite(value)
							? { dirty: false, error: t('automation.time.invalid-date-time') }
							: null,
					);
					return;
				}
				const issue = automationTimeError(raw);
				const dirty =
					raw.date !== (current?.date ?? '') ||
					raw.time !== (current?.time ?? '') ||
					raw.timeZone !== (current?.timeZone ?? displayZone);
				report({
					dirty,
					error:
						issue?.message ?? (required && !raw.date ? t('automation.time.invalid-date-time') : undefined),
				});
			}}
			onChange={(next) => {
				report(null);
				if (next) {
					setDisplayZone(next.timeZone);
					onChange(strictAutomationTime(next), next.timeZone);
				} else onChange(undefined, displayZone);
			}}
		/>
	);
}
