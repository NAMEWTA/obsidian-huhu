import { useId, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../button';
import { useT } from '../../../react/hooks';
import { DateField } from './DateField';
import { DateInput, useDateError, type DateFieldCommon } from './field-parts';
import { isTimeZone, validateDate, validateTime, type DateTimeValue, type CalendarDate } from './date-value';

export type DateTimeValidationError = { code: string; message: string };
export type DateTimeFieldProps = DateFieldCommon & {
	value: DateTimeValue | null;
	onChange: (value: DateTimeValue | null) => void;
	initialTimeZone: string;
	/** Caller owns domain interpretation, including gaps/folds. Return translated user feedback. */
	validateValue: (value: DateTimeValue) => DateTimeValidationError | null;
	/** Raw edits include incomplete values so a containing form can pause unrelated saves. */
	onDraftChange?: (draft: { date: string; time: string; timeZone: string }) => void;
};
export function DateTimeField(props: DateTimeFieldProps) {
	const { value, onChange, onDraftChange, disabled, readOnly } = props;
	const t = useT();
	const generated = useId(),
		composing = useRef(false);
	const errorId = `${generated}-error`;
	const [date, setDate] = useState<CalendarDate | null>(value?.date ?? null),
		[time, setTime] = useState(value?.time ?? ''),
		[zone, setZone] = useState(value?.timeZone ?? props.initialTimeZone);
	const [touched, setTouched] = useState(false);
	const [draftRevision, setDraftRevision] = useState(0);
	const [dateDraft, setDateDraft] = useState(value?.date ?? '');
	const controlledKey = JSON.stringify([value, props.initialTimeZone]);
	const [previousKey, setPreviousKey] = useState(controlledKey);
	if (previousKey !== controlledKey) {
		setPreviousKey(controlledKey);
		setDraftRevision((revision) => revision + 1);
		setDate(value?.date ?? null);
		setDateDraft(value?.date ?? '');
		setTime(value?.time ?? '');
		setZone(value?.timeZone ?? props.initialTimeZone);
		setTouched(!!props.required && value === null);
	}
	const notifiedDraft = useRef<string | undefined>(undefined);
	useLayoutEffect(() => {
		if (!onDraftChange) {
			notifiedDraft.current = undefined;
			return;
		}
		const key = JSON.stringify([dateDraft, time, zone]);
		// Parent callbacks may be inline; repeating the same raw state would create an update loop.
		if (notifiedDraft.current === key) return;
		notifiedDraft.current = key;
		onDraftChange({ date: dateDraft, time, timeZone: zone });
	}, [dateDraft, time, zone, onDraftChange]);
	const dateError = useDateError(touched ? validateDate(dateDraft, { ...props, required: true }) : null, props);
	const empty = !date && !time;
	const syntaxError =
		touched && (!empty || props.required)
			? dateError ||
				(!validateTime(time)
					? t('ui.date.invalidTime')
					: !isTimeZone(zone)
						? t('ui.date.invalidZone')
						: undefined)
			: undefined;
	const candidate =
		date && dateDraft === date && !validateDate(dateDraft, props) && validateTime(time) && isTimeZone(zone)
			? { date, time, timeZone: zone }
			: null;
	const domainError = candidate && touched ? props.validateValue(candidate) : null;
	const error = props.error || syntaxError || domainError?.message;
	function commit(nextDate = date, nextDraft = dateDraft) {
		if (disabled || readOnly || composing.current) return;
		setTouched(true);
		if (!nextDate && !time) {
			if (!props.required) onChange(null);
			return;
		}
		if (
			!nextDate ||
			validateDate(nextDraft, { ...props, required: true }) ||
			nextDraft !== nextDate ||
			validateDate(nextDate, props) ||
			!validateTime(time) ||
			!isTimeZone(zone)
		)
			return;
		const next = { date: nextDate, time, timeZone: zone };
		if (
			!props.validateValue(next) &&
			(next.date !== value?.date || next.time !== value?.time || next.timeZone !== value?.timeZone)
		)
			onChange(next);
	}
	const common = {
		disabled,
		readOnly,
		required: props.required,
		'aria-describedby': [props['aria-describedby'], error && errorId].filter(Boolean).join(' ') || undefined,
		onCompositionStart: () => {
			composing.current = true;
		},
		onCompositionEnd: () => {
			composing.current = false;
		},
	};
	return (
		<div data-slot="date-time-field" data-error-code={domainError?.code} className="flex min-w-0 flex-col gap-3">
			<DateField
				clearable={false}
				{...props}
				draftResetKey={draftRevision}
				name={undefined}
				value={date}
				label={props.label}
				description={props.description}
				error={undefined}
				aria-describedby={common['aria-describedby']}
				onDraftChange={setDateDraft}
				onChange={(next) => {
					setDate(next);
					setDateDraft(next ?? '');
					if (next === null) {
						setTime('');
						setTouched(true);
						onChange(null);
					} else commit(next, next);
				}}
			/>
			<div className="grid min-w-0 grid-cols-1 gap-3 [@media(min-width:600px)]:grid-cols-2">
				<DateInput
					{...common}
					id={props.id ? `${props.id}-time` : undefined}
					label={t('ui.date.time')}
					value={time}
					placeholder="HH:mm"
					aria-invalid={!!error}
					onChange={(event) => setTime(event.target.value)}
					onBlur={() => commit()}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							commit();
						}
					}}
				/>
				<DateInput
					{...common}
					id={props.id ? `${props.id}-zone` : undefined}
					label={t('ui.date.zone')}
					value={zone}
					aria-invalid={!!error}
					onChange={(event) => setZone(event.target.value)}
					onBlur={() => commit()}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							commit();
						}
					}}
				/>
			</div>
			<Button
				type="button"
				variant="ghost"
				className="self-start"
				disabled={disabled || readOnly || (!dateDraft && !time)}
				onClick={() => {
					setDate(null);
					setDateDraft('');
					setTime('');
					setTouched(true);
					setDraftRevision((revision) => revision + 1);
					onChange(null);
				}}
			>
				<X aria-hidden="true" />
				{t('ui.date.clear')}
			</Button>
			{error && (
				<p id={errorId} role="alert" className="m-0 text-xs text-[var(--hu-danger)]">
					{error}
				</p>
			)}
			{props.name && (
				<>
					<input type="hidden" name={`${props.name}.date`} value={value?.date ?? ''} disabled={disabled} />
					<input type="hidden" name={`${props.name}.time`} value={value?.time ?? ''} disabled={disabled} />
					<input
						type="hidden"
						name={`${props.name}.timeZone`}
						value={value?.timeZone ?? ''}
						disabled={disabled}
					/>
				</>
			)}
		</div>
	);
}
