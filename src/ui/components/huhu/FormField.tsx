import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Label } from '../label';

type FieldControlProps = {
	id?: string;
	'aria-describedby'?: string;
	'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
};

/** Supply one labelable control; existing IDs and descriptions remain attached to that control. */
export function FormField({
	label,
	description,
	error,
	children,
	className,
	id,
}: {
	label: ReactNode;
	description?: ReactNode;
	error?: ReactNode;
	children: ReactElement<FieldControlProps>;
	className?: string;
	id?: string;
}) {
	const generated = useId();
	const controlId = children.props.id ?? id ?? generated;
	const hasDescription = description != null && description !== false;
	const hasError = error != null && error !== false && error !== '';
	const describedBy =
		[
			children.props['aria-describedby'],
			hasDescription && `${generated}-description`,
			hasError && `${generated}-error`,
		]
			.filter(Boolean)
			.join(' ') || undefined;
	return (
		<div data-slot="form-field" className={cn('flex min-w-0 flex-col gap-1.5', className)}>
			<Label htmlFor={controlId}>{label}</Label>
			{isValidElement(children) &&
				cloneElement(children, {
					id: controlId,
					'aria-describedby': describedBy,
					'aria-invalid': hasError || children.props['aria-invalid'],
				})}
			{hasDescription && (
				<p id={`${generated}-description`} className="m-0 text-xs text-[var(--hu-fg-3)]">
					{description}
				</p>
			)}
			{hasError && (
				<p id={`${generated}-error`} role="alert" className="m-0 text-xs text-[var(--hu-danger)]">
					{error}
				</p>
			)}
		</div>
	);
}
