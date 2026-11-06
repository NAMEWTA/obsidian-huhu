import { useId, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Button } from '../../button';
import { Popover, PopoverContent, PopoverTrigger } from '../../popover';
import { useT } from '../../../react/hooks';
import { Calendar } from './Calendar';
import { DateInput, DatePopupViewport, useDateError, useDateBoundary, type DateFieldCommon } from './field-parts';
import { presetRange, todayDate, validateDate, type DateRangeValue, type RangePreset } from './date-value';

export type DateRangeFieldProps = DateFieldCommon & {
	value: DateRangeValue;
	onChange: (value: DateRangeValue) => void;
};
export function DateRangeField(props: DateRangeFieldProps) {
	const { value, onChange, disabled, readOnly, min, max, required, weekStartsOn, today } = props;
	const t = useT(),
		generated = useId();
	const [triggerRef, collisionBoundary] = useDateBoundary(props.collisionBoundary);
	const [open, setOpen] = useState(false),
		[draft, setDraft] = useState(value);
	const [from, setFrom] = useState(value.from ?? ''),
		[to, setTo] = useState(value.to ?? '');
	// Controlled changes always replace pending edits, including while the calendar is open.
	const [previousValue, setPreviousValue] = useState({ from: value.from, to: value.to });
	if (previousValue.from !== value.from || previousValue.to !== value.to) {
		setPreviousValue({ from: value.from, to: value.to });
		setDraft(value);
		setFrom(value.from ?? '');
		setTo(value.to ?? '');
	}
	if ((disabled || readOnly) && open) setOpen(false);
	const fromError = useDateError(validateDate(from, props), props),
		toError = useDateError(validateDate(to, props), props);
	const rangeError =
		from && to && !validateDate(from, props) && !validateDate(to, props) && from > to
			? t('ui.date.reversed')
			: undefined;
	const error = props.error || fromError || toError || rangeError;
	const inactive = disabled || readOnly;
	function reset(next: DateRangeValue) {
		setDraft(next);
		setFrom(next.from ?? '');
		setTo(next.to ?? '');
	}
	function opening(next: boolean) {
		reset(value);
		setOpen(next);
	}
	function apply() {
		if (inactive || error) return;
		onChange({ from: from || null, to: to || null });
		setOpen(false);
	}
	function preset(preset: RangePreset) {
		reset(presetRange(preset, today ?? todayDate()));
	}
	const describedBy =
		[props['aria-describedby'], props.description && `${generated}-help`, error && `${generated}-error`]
			.filter(Boolean)
			.join(' ') || undefined;
	return (
		<div data-slot="date-range-field" className="flex min-w-0 flex-col gap-1.5">
			{props.label != null && (
				<label htmlFor={props.id ?? generated} className="text-sm font-medium">
					{props.label}
				</label>
			)}
			<Popover open={open && !inactive} onOpenChange={opening}>
				<div className="flex min-w-0 items-center gap-3">
					<PopoverTrigger asChild>
						<Button
							ref={triggerRef}
							type="button"
							id={props.id ?? generated}
							variant="secondary"
							disabled={inactive}
							aria-describedby={describedBy}
							aria-invalid={!!error}
							aria-label={props['aria-label']}
						>
							<CalendarDays aria-hidden="true" />
							{value.from || value.to ? `${value.from ?? '…'} – ${value.to ?? '…'}` : t('ui.date.range')}
						</Button>
					</PopoverTrigger>
					<Button
						type="button"
						variant="ghost"
						size="icon-md"
						disabled={inactive || (!value.from && !value.to)}
						aria-label={t('ui.date.clear')}
						onClick={() => {
							onChange({ from: null, to: null });
							reset({ from: null, to: null });
						}}
					>
						<X aria-hidden="true" />
					</Button>
				</div>
				{props.name && (
					<>
						<input type="hidden" name={`${props.name}.from`} value={value.from ?? ''} disabled={disabled} />
						<input type="hidden" name={`${props.name}.to`} value={value.to ?? ''} disabled={disabled} />
					</>
				)}
				<PopoverContent
					align="start"
					collisionBoundary={collisionBoundary}
					collisionPadding={4}
					wheelScroll
					className="w-[280px] max-w-[calc(100vw-8px)] overflow-visible rounded-[var(--hu-radius-md)] border-0 p-0 [@media(pointer:coarse)]:w-[312px]"
				>
					<DatePopupViewport label={t('ui.date.range')}>
						<div className="flex flex-wrap gap-3 p-2">
							{(['today', 'next7', 'month', 'past30'] as const).map((key) => (
								<Button type="button" key={key} variant="ghost" size="sm" onClick={() => preset(key)}>
									{t(`ui.date.${key}`)}
								</Button>
							))}
						</div>
						<div className="grid min-w-0 grid-cols-1 gap-3 p-2 [@media(min-width:600px)]:grid-cols-2">
							<DateInput
								label={t('ui.date.start')}
								value={from}
								placeholder="YYYY-MM-DD"
								required={required}
								aria-invalid={!!fromError}
								aria-describedby={describedBy}
								onChange={(event) => {
									setFrom(event.target.value);
									setDraft((current) => ({
										...current,
										from:
											!validateDate(event.target.value) && event.target.value
												? event.target.value
												: null,
									}));
								}}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										apply();
									}
								}}
							/>
							<DateInput
								label={t('ui.date.end')}
								value={to}
								placeholder="YYYY-MM-DD"
								required={required}
								aria-invalid={!!toError}
								aria-describedby={describedBy}
								onChange={(event) => {
									setTo(event.target.value);
									setDraft((current) => ({
										...current,
										to:
											!validateDate(event.target.value) && event.target.value
												? event.target.value
												: null,
									}));
								}}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										apply();
									}
								}}
							/>
						</div>
						<Calendar mode="range" value={draft} onChange={reset} {...{ min, max, weekStartsOn, today }} />
						<div className="flex flex-wrap justify-end gap-3 p-2">
							<Button
								type="button"
								variant="secondary"
								onClick={() => {
									opening(false);
								}}
							>
								{t('ui.cancel')}
							</Button>
							<Button type="button" disabled={!!error} onClick={apply}>
								{t('ui.date.apply')}
							</Button>
						</div>
					</DatePopupViewport>
				</PopoverContent>
			</Popover>
			{props.description && (
				<p id={`${generated}-help`} className="m-0 text-xs text-[var(--hu-fg-3)]">
					{props.description}
				</p>
			)}
			{error && (
				<p id={`${generated}-error`} role="alert" className="m-0 text-xs text-[var(--hu-danger)]">
					{error}
				</p>
			)}
		</div>
	);
}
