import { useState } from 'react';
import { DateField, MonthField, parseDate, parseMonth } from '../../../../ui/components/huhu/date';
import { SegmentedControl } from '../../../../ui/components/huhu/SegmentedControl';
import { useLeafMetrics } from '../../../../ui/react/use-leaf-metrics';
import { at } from './common';

/** A precision choice changes the archive string, never an invented first day or UTC instant. */
export function PrecisionDateControl({
	value,
	label,
	onChange,
	precision = 'mixed',
	disabled,
	id,
	error,
}: {
	value: string;
	label: string;
	onChange: (value: string) => void;
	precision?: 'day' | 'month' | 'mixed';
	disabled?: boolean;
	id?: string;
	error?: boolean;
}) {
	const { element: leafElement, ref: leafRef } = useLeafMetrics();
	const [mode, setMode] = useState<'day' | 'month'>(() =>
		precision === 'month' || (precision === 'mixed' && !!parseMonth(value)) ? 'month' : 'day',
	);
	const [previous, setPrevious] = useState(value);
	const [emitted, setEmitted] = useState<string | undefined>(undefined);
	if (previous !== value) {
		setPrevious(value);
		if (value !== emitted) {
			if (parseMonth(value)) setMode('month');
			else if (parseDate(value)) setMode('day');
		}
		setEmitted(undefined);
	}
	const emit = (next: string) => {
		setEmitted(next);
		onChange(next);
	};
	const active = precision === 'mixed' ? mode : precision;
	const common = {
		id,
		disabled,
		label,
		'aria-label': label,
		collisionBoundary: leafElement,
		error: error ? at('invalidValues') : undefined,
	};
	return (
		<div ref={leafRef} className="min-w-0 space-y-2">
			{precision === 'mixed' && (
				<SegmentedControl
					ariaLabel={`${label} · ${at('mixed')}`}
					value={mode}
					options={(['day', 'month'] as const).map((value) => ({ value, label: at(value), disabled }))}
					onChange={(next) => {
						setMode(next);
						if (next === 'month' && parseDate(value)) emit(value.slice(0, 7));
						else if (next === 'day' && parseMonth(value)) emit(value + '-');
					}}
				/>
			)}
			{active === 'month' ? (
				<MonthField
					{...common}
					value={value || null}
					onDraftChange={emit}
					onChange={(next) => emit(next ?? '')}
				/>
			) : (
				<DateField
					{...common}
					value={value || null}
					onDraftChange={emit}
					onChange={(next) => emit(next ?? '')}
				/>
			)}
		</div>
	);
}
