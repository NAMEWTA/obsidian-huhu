// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/toggle-group.tsx
'use client';

import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import * as ToggleGroupPrimitive from 'radix-ui/toggle-group';

import { cn } from '../lib/utils';
import { toggleVariants } from './toggle';

const ToggleGroupContext = React.createContext<
	VariantProps<typeof toggleVariants> & {
		spacing?: number;
	}
>({
	size: 'md',
	variant: 'default',
	spacing: 0,
});

function ToggleGroup({
	className,
	variant,
	size,
	spacing = 0,
	children,
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
	VariantProps<typeof toggleVariants> & {
		spacing?: number;
	}) {
	const contextValue = React.useMemo(() => ({ variant, size, spacing }), [variant, size, spacing]);

	// Leave a token gap between expanded hit cells, including wrapped rows with raised focus outlines.
	return (
		<ToggleGroupPrimitive.Root
			data-slot="toggle-group"
			data-hit-group={spacing === 0 || undefined}
			data-variant={variant}
			data-size={size}
			data-spacing={spacing}
			style={{ '--gap': spacing } as React.CSSProperties}
			className={cn(
				'group/toggle-group flex w-fit max-w-full items-center rounded-md gap-x-[calc(var(--gap)*4px)]',
				'gap-y-[max(calc(var(--gap)*4px),calc(var(--hu-hit)_-_var(--hu-ctl-h)_+_var(--hu-space-0-5)))] py-[max(0px,calc((var(--hu-hit)_-_var(--hu-ctl-h))/2))]',
				'data-[variant=segmented]:gap-x-0.5 data-[variant=segmented]:gap-y-[max(2px,calc(var(--hu-hit)_-_var(--hu-ctl-h)_+_var(--hu-space-0-5)))] data-[variant=segmented]:bg-[var(--hu-sunken)] data-[variant=segmented]:px-0.5 data-[variant=segmented]:py-[max(2px,calc((var(--hu-hit)_-_var(--hu-ctl-h))/2))]',
				className,
			)}
			{...props}
		>
			<ToggleGroupContext.Provider value={contextValue}>{children}</ToggleGroupContext.Provider>
		</ToggleGroupPrimitive.Root>
	);
}

function ToggleGroupItem({
	className,
	children,
	variant,
	size,
	ref,
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
	const context = React.useContext(ToggleGroupContext);
	// Inset the required target square from the paint edges of horizontally joined items.

	return (
		<ToggleGroupPrimitive.Item
			data-slot="toggle-group-item"
			data-hit-control
			ref={ref}
			data-variant={context.variant || variant}
			data-size={context.size || size}
			data-spacing={context.spacing}
			className={cn(
				toggleVariants({
					variant: context.variant || variant,
					size: context.size || size,
				}),
				'w-auto shrink-0 focus:z-10 focus-visible:z-10',
				'min-w-[max(var(--hu-ctl-h),calc(var(--hu-hit)_+_var(--hu-space-0-5)))] data-[size=lg]:min-w-[max(var(--hu-ctl-h-lg),calc(var(--hu-hit)_+_var(--hu-space-0-5)))]',
				'data-[spacing=0]:data-[variant=outline]:rounded-none data-[spacing=0]:data-[variant=outline]:border-l-0',
				'data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:first:border-l',
				className,
			)}
			{...props}
		>
			{children}
		</ToggleGroupPrimitive.Item>
	);
}

export { ToggleGroup, ToggleGroupItem };
