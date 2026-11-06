import { useId, type ComponentProps, type ReactNode } from 'react';
import { CircleCheck, CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

const tones = {
	info: { icon: Info, classes: 'bg-[var(--hu-info-soft)] text-[var(--hu-info)]' },
	success: { icon: CircleCheck, classes: 'bg-[var(--hu-success-soft)] text-[var(--hu-success)]' },
	warning: { icon: TriangleAlert, classes: 'bg-[var(--hu-warning-soft)] text-[var(--hu-warning)]' },
	error: { icon: CircleAlert, classes: 'bg-[var(--hu-danger-soft)] text-[var(--hu-danger)]' },
};

/** Caller supplies translated copy and recovery actions; errors announce assertively. */
export function Notice({
	title,
	children,
	tone = 'info',
	action,
	className,
	...props
}: Omit<ComponentProps<'div'>, 'title'> & {
	title: ReactNode;
	tone?: keyof typeof tones;
	action?: ReactNode;
}) {
	const titleId = useId();
	const Icon = tones[tone].icon;
	return (
		<div
			{...props}
			data-slot="notice"
			data-tone={tone}
			role={tone === 'error' ? 'alert' : 'status'}
			aria-live={tone === 'error' ? 'assertive' : 'polite'}
			aria-labelledby={titleId}
			className={cn('flex min-w-0 items-start gap-3 rounded-lg p-4', tones[tone].classes, className)}
		>
			<Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
			<div className="min-w-0 flex-1 space-y-1">
				<div id={titleId} className="text-sm font-semibold">
					{title}
				</div>
				{children != null && <div className="text-sm">{children}</div>}
				{action != null && <div className="flex flex-wrap gap-2 pt-2">{action}</div>}
			</div>
		</div>
	);
}
