// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/tabs.tsx
'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as TabsPrimitive from 'radix-ui/tabs';

import { cn } from '../lib/utils';
import { SettingsIndexingContext } from '../react/settings-search';

function Tabs({ className, orientation = 'horizontal', ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			data-orientation={orientation}
			orientation={orientation}
			className={cn('group/tabs flex gap-2 data-[orientation=horizontal]:flex-col', className)}
			{...props}
		/>
	);
}

const tabsListVariants = cva(
	'group/tabs-list inline-flex w-fit max-w-full items-center gap-2 border-b border-[var(--hu-line)] text-[var(--hu-fg-3)] group-data-[orientation=vertical]/tabs:flex-col',
	{ variants: { variant: { line: 'bg-transparent' } }, defaultVariants: { variant: 'line' } },
);

function TabsList({
	className,
	variant = 'line',
	...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			data-variant={variant}
			className={cn(tabsListVariants({ variant }), className)}
			{...props}
		/>
	);
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			data-hit-control
			className={cn(
				'relative inline-flex h-[var(--hu-ctl-h)] min-w-0 shrink-0 items-center justify-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap text-[var(--hu-fg-3)] outline-none hover:text-[var(--hu-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-[var(--hu-accent)] data-[state=active]:text-[var(--hu-accent-text)] group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start [&_svg]:size-4 [&_svg]:shrink-0',
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
	const indexing = React.useContext(SettingsIndexingContext);
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			forceMount={indexing ? true : undefined}
			className={cn('flex-1 outline-none', className)}
			{...props}
		/>
	);
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
