import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
export function EmptyState({
	icon,
	title,
	description,
	action,
	className,
	size = 'default',
	descriptionClassName,
}: {
	icon?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
	/** `sm` for the inside of a card or a list: small type and tight spacing instead of a page-sized message. */
	size?: 'default' | 'sm';
	/** Classes of the description paragraph, e.g. to show it only when there is room. */
	descriptionClassName?: string;
}) {
	const small = size === 'sm';
	return (
		<div
			data-slot="empty-state"
			data-size={size}
			className={cn(
				'flex flex-col items-center justify-center text-center',
				small ? 'gap-1.5 p-3' : 'gap-3 p-8',
				className,
			)}
		>
			{(icon || !small) && (
				<div className={cn('text-muted-foreground', small ? '[&_svg]:size-5' : '[&_svg]:size-7')}>{icon}</div>
			)}
			<h3 className={small ? 'm-0 text-sm font-medium' : 'text-base font-semibold'}>{title}</h3>
			{description && (
				<p className={cn('max-w-sm text-muted-foreground', small ? 'm-0 text-xs' : 'text-sm', descriptionClassName)}>
					{description}
				</p>
			)}
			{action}
		</div>
	);
}
