import { useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '../../button';
import { Input } from '../../input';
import { Popover, PopoverContent, PopoverTrigger } from '../../popover';
import { useLanguage, useT } from '../../../react/hooks';
import { DateInput, DatePopupViewport, useDateBoundary, useDateError, type DateFieldCommon } from './field-parts';
import { parseMonth, todayDate, validateMonth, type CalendarMonth } from './date-value';

export type MonthFieldProps = Omit<DateFieldCommon, 'min' | 'max' | 'today' | 'weekStartsOn'> & {
	value: CalendarMonth | null;
	onChange: (value: CalendarMonth | null) => void;
	onDraftChange?: (text: string) => void;
	min?: CalendarMonth;
	max?: CalendarMonth;
	clearable?: boolean;
};

/** A month is serialized directly, without inventing a day or passing through an instant. */
export function MonthField(props: MonthFieldProps) {
	const { value, onChange, disabled, readOnly } = props;
	const t = useT(),
		language = useLanguage();
	const [draft, setDraft] = useState(value ?? ''),
		[touched, setTouched] = useState(false),
		[open, setOpen] = useState(false);
	const [previousValue, setPreviousValue] = useState(value);
	const [year, setYear] = useState((value && parseMonth(value) ? value : todayDate()).slice(0, 4));
	const composing = useRef(false);
	const [triggerRef, boundary] = useDateBoundary(props.collisionBoundary);
	if (previousValue !== value) {
		setPreviousValue(value);
		setDraft(value ?? '');
		setTouched(!!props.required && value === null);
	}
	if ((disabled || readOnly) && open) setOpen(false);
	const ownError = useDateError(touched ? validateMonth(draft, props) : null, props);
	function commit() {
		if (disabled || readOnly || composing.current) return;
		setTouched(true);
		if (!validateMonth(draft, props) && (draft || null) !== value) onChange(draft || null);
	}
	function pick(next: CalendarMonth | null) {
		if (disabled || readOnly || (next !== null && validateMonth(next, props))) return;
		setDraft(next ?? '');
		props.onDraftChange?.(next ?? '');
		setTouched(true);
		onChange(next);
		setOpen(false);
	}
	const validYear = /^\d{4}$/.test(year);
	const formatter = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
		month: 'long',
		timeZone: 'UTC',
	});
	const shortFormatter = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
		month: 'short',
		timeZone: 'UTC',
	});
	return (
		<Popover
			open={open && !disabled && !readOnly}
			onOpenChange={(next) => {
				if (next) setYear((parseMonth(draft) ?? (value && parseMonth(value)) ?? todayDate()).slice(0, 4));
				setOpen(next);
			}}
		>
			<DateInput
				id={props.id}
				name={props.name}
				label={props.label}
				description={props.description}
				error={props.error || ownError}
				aria-label={props['aria-label'] ?? (props.label == null && !props.id ? t('ui.date.month') : undefined)}
				aria-describedby={props['aria-describedby']}
				value={draft}
				placeholder="YYYY-MM"
				required={props.required}
				disabled={disabled}
				readOnly={readOnly}
				leading={
					<PopoverTrigger asChild>
						<Button
							ref={triggerRef}
							type="button"
							variant="ghost"
							size="icon-md"
							disabled={disabled || readOnly}
							aria-label={t('ui.date.chooseMonth')}
						>
							<CalendarDays aria-hidden="true" />
						</Button>
					</PopoverTrigger>
				}
				onChange={(event) => {
					setDraft(event.currentTarget.value);
					props.onDraftChange?.(event.currentTarget.value);
				}}
				onBlur={commit}
				onCompositionStart={() => {
					composing.current = true;
				}}
				onCompositionEnd={() => {
					composing.current = false;
				}}
				onKeyDown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						commit();
					}
				}}
			>
				{props.clearable !== false && (
					<Button
						type="button"
						variant="ghost"
						size="icon-md"
						disabled={disabled || readOnly || !draft}
						aria-label={t('ui.date.clear')}
						onClick={() => pick(null)}
					>
						<X aria-hidden="true" />
					</Button>
				)}
			</DateInput>
			<PopoverContent
				align="start"
				collisionBoundary={boundary}
				collisionPadding={4}
				wheelScroll
				className="w-[280px] max-w-[calc(100vw-8px)] overflow-visible rounded-[var(--hu-radius-md)] border-0 p-0 [@media(pointer:coarse)]:w-[312px]"
			>
				<DatePopupViewport label={t('ui.date.chooseMonth')}>
					<div className="flex flex-col gap-3 rounded-[var(--hu-radius-md)] border border-[var(--hu-line)] bg-[var(--hu-raised)] p-3">
						<div className="flex items-center justify-between gap-3">
							<Button
								type="button"
								variant="ghost"
								size="icon-md"
								aria-label={t('ui.date.previousYear')}
								disabled={!validYear || Number(year) <= 0}
								onClick={() => setYear(String(Number(year) - 1).padStart(4, '0'))}
							>
								<ChevronLeft aria-hidden="true" />
							</Button>
							<Input
								aria-label={t('ui.date.year')}
								value={year}
								inputMode="numeric"
								maxLength={4}
								className="w-24 text-center tabular-nums"
								onChange={(event) => setYear(event.currentTarget.value)}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon-md"
								aria-label={t('ui.date.nextYear')}
								disabled={!validYear || Number(year) >= 9999}
								onClick={() => setYear(String(Number(year) + 1).padStart(4, '0'))}
							>
								<ChevronRight aria-hidden="true" />
							</Button>
						</div>
						<div role="group" aria-label={t('ui.date.month')} className="grid grid-cols-3 gap-3">
							{Array.from({ length: 12 }, (_, index) => {
								const month = `${year}-${String(index + 1).padStart(2, '0')}`;
								return (
									<Button
										key={index}
										type="button"
										variant={draft === month ? 'primary' : 'ghost'}
										aria-label={formatter.format(new Date(Date.UTC(2000, index, 1)))}
										aria-pressed={draft === month}
										disabled={!validYear || !!validateMonth(month, props)}
										onClick={() => pick(month)}
									>
										{shortFormatter.format(new Date(Date.UTC(2000, index, 1)))}
									</Button>
								);
							})}
						</div>
					</div>
				</DatePopupViewport>
			</PopoverContent>
		</Popover>
	);
}
