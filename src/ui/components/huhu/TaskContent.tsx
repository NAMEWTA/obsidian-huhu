import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../lib/utils';

/** Only title and description reflect completion; dates and relations belong in metadata. */
export function TaskContent({
	title,
	description,
	completed = false,
	metadata,
	className,
	...props
}: Omit<ComponentProps<'div'>, 'title'> & {
	title: ReactNode;
	description?: ReactNode;
	completed?: boolean;
	metadata?: ReactNode;
}) {
	const completedClass = completed && 'text-[var(--hu-fg-3)] line-through';
	return (
		<div
			{...props}
			data-slot="task-content"
			data-completed={completed}
			className={cn('min-w-0 space-y-1', className)}
		>
			<div className={cn('break-words text-sm font-medium text-[var(--hu-fg)]', completedClass)}>{title}</div>
			{description != null && (
				<div className={cn('break-words text-sm text-[var(--hu-fg-2)]', completedClass)}>{description}</div>
			)}
			{metadata != null && (
				<div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-[var(--hu-fg-3)]">
					{metadata}
				</div>
			)}
		</div>
	);
}
