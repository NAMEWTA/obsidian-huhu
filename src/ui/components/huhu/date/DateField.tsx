import { useRef, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Button } from '../../button';
import { Popover, PopoverContent, PopoverTrigger } from '../../popover';
import { useT } from '../../../react/hooks';
import { Calendar } from './Calendar';
import { DateInput, DatePopupViewport, useDateError, useDateBoundary, type DateFieldCommon } from './field-parts';
import { todayDate, validateDate, type CalendarDate } from './date-value';

export type DateFieldProps = DateFieldCommon & {
	value: CalendarDate | null;
	onChange: (value: CalendarDate | null) => void;
	/** Parent-owned raw input. Pair with onDraftChange to retain invalid text across remounts. */
	draftValue?: string;
	onDraftChange?: (text: string) => void;
	/** Reset the local text when a containing compound field receives a controlled reset. */
	draftResetKey?: string | number;
	clearable?: boolean;
};
export function DateField(props: DateFieldProps) {
	const {
		value,
		onChange,
		label,
		description,
		error,
		id,
		name,
		required,
		disabled,
		readOnly,
		min,
		max,
		weekStartsOn,
		today,
	} = props;
	const t = useT();
	const [triggerRef, collisionBoundary] = useDateBoundary(props.collisionBoundary);
	const [localDraft, setDraft] = useState(value ?? ''),
		[touched, setTouched] = useState(props.draftValue !== undefined && props.draftValue !== (value ?? '')),
		[open, setOpen] = useState(false);
	const draft = props.draftValue ?? localDraft;
	const composing = useRef(false);
	const [previousValue, setPreviousValue] = useState(value);
	const [previousResetKey, setPreviousResetKey] = useState(props.draftResetKey);
	if (previousValue !== value || previousResetKey !== props.draftResetKey) {
		setPreviousValue(value);
		setPreviousResetKey(props.draftResetKey);
		if (props.draftValue === undefined) {
			setDraft(value ?? '');
			setTouched(!!required && value === null);
		}
	}
	if ((disabled || readOnly) && open) setOpen(false);
	const ownError = useDateError(touched ? validateDate(draft, props) : null, props);
	function commit() {
		if (disabled || readOnly || composing.current) return;
		setTouched(true);
		if (!validateDate(draft, props) && (draft || null) !== value) onChange(draft || null);
	}
	function pick(next: CalendarDate | null) {
		setDraft(next ?? '');
		props.onDraftChange?.(next ?? '');
		setTouched(true);
		if (next === null || !validateDate(next, props)) onChange(next);
		setOpen(false);
	}
	return (
		<Popover open={open && !disabled && !readOnly} onOpenChange={setOpen}>
			<DateInput
				id={id}
				name={name}
				label={label}
				description={description}
				error={error || ownError}
				aria-label={props['aria-label'] ?? (label == null && !id ? t('ui.date.date') : undefined)}
				aria-describedby={props['aria-describedby']}
				leading={
					<PopoverTrigger asChild>
						<Button
							ref={triggerRef}
							type="button"
							variant="ghost"
							size="icon-md"
							disabled={disabled || readOnly}
							aria-label={t('ui.date.calendar')}
						>
							<CalendarDays aria-hidden="true" />
						</Button>
					</PopoverTrigger>
				}
				value={draft}
				placeholder="YYYY-MM-DD"
				required={required}
				disabled={disabled}
				readOnly={readOnly}
				onChange={(event) => {
					setDraft(event.target.value);
					props.onDraftChange?.(event.target.value);
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
				collisionBoundary={collisionBoundary}
				collisionPadding={4}
				wheelScroll
				className="w-[280px] max-w-[calc(100vw-8px)] overflow-visible rounded-[var(--hu-radius-md)] border-0 p-0 [@media(pointer:coarse)]:w-[312px]"
			>
				<DatePopupViewport label={t('ui.date.calendar')}>
					<Calendar
						value={!validateDate(draft) && draft ? draft : value}
						onChange={pick}
						{...{ min, max, weekStartsOn, today, required }}
					/>
					<div
						data-slot="date-footer"
						className="flex justify-between gap-3 border-t border-[var(--hu-line)] p-2"
					>
						<Button
							type="button"
							variant="ghost"
							className="text-[var(--hu-accent-text)]"
							size="sm"
							disabled={disabled || readOnly || !!validateDate(today ?? todayDate(), props)}
							onClick={() => pick(today ?? todayDate())}
						>
							{t('ui.date.today')}
						</Button>
						{props.clearable !== false && (
							<Button
								type="button"
								variant="ghost"
								className="text-[var(--hu-accent-text)]"
								size="sm"
								disabled={disabled || readOnly || !draft}
								onClick={() => pick(null)}
							>
								{t('ui.date.clear')}
							</Button>
						)}
					</div>
				</DatePopupViewport>
			</PopoverContent>
		</Popover>
	);
}
