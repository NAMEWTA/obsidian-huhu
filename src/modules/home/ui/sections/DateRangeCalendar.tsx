import { DateRangeField, parseDate } from '../../../../ui/components/huhu/date';
import { useT } from '../../../../ui/react/hooks';
export function DateRangeCalendar({
	start,
	end,
	onChange,
}: {
	start: string;
	end: string;
	onChange(this: void, start: string, end: string): void;
}) {
	const t = useT();
	return (
		<DateRangeField
			label={t('library.filterDateRange')}
			value={{ from: parseDate(start), to: parseDate(end) }}
			onChange={(range) => onChange(range.from ?? '', range.to ?? '')}
		/>
	);
}
