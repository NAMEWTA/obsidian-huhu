import { useId, useState, type ReactNode, type ComponentProps } from 'react';
import { Input } from '../../input';
import { cn } from '../../../lib/utils';
import { FormField } from '../FormField';
import { useT } from '../../../react/hooks';
import { type DateBounds, type DateError, type CalendarDate, type WeekStartsOn } from './date-value';

export type DateFieldCommon = DateBounds & {
	collisionBoundary?: Element | null;
	id?: string;
	name?: string;
	label?: ReactNode;
	description?: ReactNode;
	error?: ReactNode;
	'aria-label'?: string;
	'aria-describedby'?: string;
	disabled?: boolean;
	readOnly?: boolean;
	weekStartsOn?: WeekStartsOn;
	today?: CalendarDate;
};
export function useDateError(error: DateError | null, bounds: DateBounds): string | undefined {
	const t = useT();
	if (!error) return undefined;
	if (error === 'before-min') return t('ui.date.beforeMin', { date: bounds.min ?? '' });
	if (error === 'after-max') return t('ui.date.afterMax', { date: bounds.max ?? '' });
	return t(error === 'required' ? 'ui.date.required' : 'ui.date.invalid');
}
/** A labelable composite that forwards FormField associations to the actual input. */
function InputControl({
	leading,
	children,
	className,
	...props
}: ComponentProps<typeof Input> & { leading?: ReactNode; children?: ReactNode }) {
	return (
		<div className="relative min-w-0">
			<Input
				{...props}
				className={cn(
					leading && 'pl-[max(var(--hu-hit),var(--hu-ctl-h))]',
					children && 'pr-[max(var(--hu-hit),var(--hu-ctl-h))]',
					className,
				)}
			/>
			{leading && (
				<div className="absolute inset-y-0 left-0 flex w-[max(var(--hu-hit),var(--hu-ctl-h))] items-center justify-center">
					{leading}
				</div>
			)}
			{children && (
				<div className="absolute inset-y-0 right-0 flex w-[max(var(--hu-hit),var(--hu-ctl-h))] items-center justify-center">
					{children}
				</div>
			)}
		</div>
	);
}

export function DateInput({
	label,
	description,
	error,
	leading,
	children,
	...props
}: ComponentProps<typeof Input> & {
	label?: ReactNode;
	description?: ReactNode;
	error?: ReactNode;
	leading?: ReactNode;
	children?: ReactNode;
}) {
	const generated = useId();
	const errorId = `${generated}-error`,
		helpId = `${generated}-help`;
	const control = (
		<InputControl {...props} leading={leading}>
			{children}
		</InputControl>
	);
	if (label != null)
		return (
			<FormField label={label} description={description} error={error}>
				{control}
			</FormField>
		);
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<InputControl
				{...props}
				leading={leading}
				aria-invalid={!!error || props['aria-invalid']}
				aria-describedby={
					[props['aria-describedby'], description && helpId, error && errorId].filter(Boolean).join(' ') ||
					undefined
				}
			>
				{children}
			</InputControl>
			{description && (
				<p id={helpId} className="m-0 text-xs text-[var(--hu-fg-3)]">
					{description}
				</p>
			)}
			{error && (
				<p id={errorId} role="alert" className="m-0 text-xs text-[var(--hu-danger)]">
					{error}
				</p>
			)}
		</div>
	);
}

/** Portaled dialog callers pass their logical leaf explicitly; a portal root has no layout box. */
export function useDateBoundary(explicit: Element | null | undefined) {
	const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
	return [
		setTrigger,
		explicit !== undefined ? explicit : (trigger?.closest('[data-huhu-leaf]') ?? undefined),
	] as const;
}

/** Four-pixel paint bleed protects the standard outer focus ring; native vertical scroll has no width-taking gutter. */
export function DatePopupViewport({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div
			data-slot="date-scroll-viewport"
			role="region"
			aria-label={label}
			className="-mx-1 box-border max-h-[var(--radix-popover-content-available-height)] w-[calc(100%+8px)] overflow-x-hidden overflow-y-auto overscroll-contain scroll-p-1 px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
		>
			{children}
		</div>
	);
}
