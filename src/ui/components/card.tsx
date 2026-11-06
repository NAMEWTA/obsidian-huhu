// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/card.tsx
import * as React from 'react';

import { cn } from '../lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card"
			className={cn(
				'flex flex-col gap-4 rounded-lg border border-[var(--hu-line)] bg-[var(--hu-raised)] py-[var(--hu-card-pad)] text-[var(--hu-fg)] shadow-[var(--hu-shadow-card)]',
				className,
			)}
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				'@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-[var(--hu-card-pad)] has-data-[slot=card-action]:grid-cols-[1fr_auto] min-h-11 [.border-b]:pb-4',
				className,
			)}
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot="card-title" className={cn('text-base font-semibold', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot="card-content" className={cn('px-[var(--hu-card-pad)]', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-footer"
			className={cn('flex items-center px-[var(--hu-card-pad)] [.border-t]:pt-4', className)}
			{...props}
		/>
	);
}
