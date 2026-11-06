import { useState } from 'react';
import { DateField, parseDate, validateDate } from '../../../../ui/components/huhu/date';
import { Input } from '../../../../ui/components/input';
import { FormField } from '../../../../ui/components/huhu/FormField';
import { useT } from '../../../../ui/react/hooks';

export interface LocalDateTimeDraft {
	date: string;
	time: string;
}
export const localDateTimeDraft = (value: string): LocalDateTimeDraft => ({
	date: value.split('T')[0] ?? '',
	time: value.split('T')[1] ?? '00:00',
});
const validDraft = (draft: LocalDateTimeDraft) =>
	!!draft.date && !validateDate(draft.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time);
/** Countdown values are local civil components, without an IANA zone or epoch in their schema. */
export function LocalDateTimeField({
	value,
	label,
	onChange,
	onValidityChange,
	draft: controlled,
	onDraftChange,
}: {
	value: string;
	label: string;
	onChange(this: void, value: string): void;
	onValidityChange?(this: void, valid: boolean): void;
	draft?: LocalDateTimeDraft;
	onDraftChange?(this: void, draft: LocalDateTimeDraft): void;
}) {
	const t = useT(),
		[local, setLocal] = useState(() => localDateTimeDraft(value)),
		[previous, setPrevious] = useState(value);
	if (previous !== value) {
		setPrevious(value);
		if (!controlled) setLocal(localDateTimeDraft(value));
	}
	const draft = controlled ?? local;
	const updateDraft = (next: LocalDateTimeDraft) => {
		if (!controlled) setLocal(next);
		onDraftChange?.(next);
		onValidityChange?.(validDraft(next));
	};
	const commit = (next: LocalDateTimeDraft) => {
		updateDraft(next);
		onChange(validDraft(next) ? `${next.date}T${next.time}` : '');
	};
	return (
		<div className="grid min-w-0 gap-3">
			<DateField
				label={label}
				value={parseDate(value.split('T')[0] ?? '')}
				draftValue={draft.date}
				onDraftChange={(date) => updateDraft({ ...draft, date })}
				onChange={(date) => commit({ ...draft, date: date ?? '' })}
			/>
			<FormField label={t('home.pipeline.time')}>
				<Input
					type="time"
					value={draft.time}
					onChange={(event) => commit({ ...draft, time: event.currentTarget.value })}
				/>
			</FormField>
		</div>
	);
}
