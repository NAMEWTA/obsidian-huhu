// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/badge.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as Slot from 'radix-ui/slot';

import { cn } from '../lib/utils';

const badgeVariants = cva(
	'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-1.5 text-xs font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)] [&>svg]:pointer-events-none [&>svg]:size-3',
	{
		variants: {
			variant: {
				neutral: 'border-[var(--hu-line)] bg-[var(--hu-sunken)] text-[var(--hu-fg-2)]',
				accent: 'bg-[var(--hu-accent-soft)] text-[var(--hu-accent-text)]',
				success: 'bg-[var(--hu-success-soft)] text-[var(--hu-success)]',
				warning: 'bg-[var(--hu-warning-soft)] text-[var(--hu-warning)]',
				error: 'bg-[var(--hu-danger-soft)] text-[var(--hu-danger)]',
			},
		},
		defaultVariants: { variant: 'neutral' },
	},
);

function Badge({
	className,
	variant = 'neutral',
	asChild = false,
	...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : 'span';

	return (
		<Comp
			data-slot="badge"
			data-variant={variant}
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
