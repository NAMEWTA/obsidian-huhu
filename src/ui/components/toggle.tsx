// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/toggle.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as TogglePrimitive from 'radix-ui/toggle';

import { cn } from '../lib/utils';

const toggleVariants = cva(
	"inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap text-[var(--hu-fg-2)] outline-none hover:bg-[var(--hu-hover)] hover:text-[var(--hu-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[var(--hu-accent-soft)] data-[state=on]:text-[var(--hu-accent-text)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: 'bg-transparent',
				outline: 'border border-[var(--hu-control-line)] bg-[var(--hu-raised)]',
				segmented:
					'rounded-sm bg-transparent data-[state=on]:bg-[var(--hu-raised)] data-[state=on]:text-[var(--hu-fg)] data-[state=on]:shadow-[var(--hu-shadow-card)]',
			},
			size: {
				md: 'h-[var(--hu-ctl-h)] min-w-[max(var(--hu-ctl-h),var(--hu-hit))] px-3',
				sm: 'h-[var(--hu-ctl-h)] min-w-[max(var(--hu-ctl-h),var(--hu-hit))] px-2',
				lg: 'h-[var(--hu-ctl-h-lg)] min-w-[max(var(--hu-ctl-h-lg),var(--hu-hit))] px-4',
			},
		},
		defaultVariants: { variant: 'default', size: 'md' },
	},
);

function Toggle({
	className,
	variant,
	size,
	ref,
	...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive.Root
			data-slot="toggle"
			data-hit-control
			ref={ref}
			className={cn(toggleVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Toggle, toggleVariants };
