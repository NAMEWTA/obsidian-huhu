// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/renderer.ts
import type { ComponentProps } from 'react';
import { Button } from '../../../../ui/components/button';
import { cn } from '../../../../ui/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
/** Apex sizes each control locally; keep shadcn's interaction and focus behavior. */
export function RecordButton({ className, ...props }: ComponentProps<typeof Button>) {
	const button = (
		<Button
			{...props}
			data-hit-control
			className={cn('min-h-[var(--hu-hit)] max-w-full justify-start whitespace-normal text-start', className)}
		/>
	);
	return props['aria-label'] ? (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent>{props['aria-label']}</TooltipContent>
		</Tooltip>
	) : (
		button
	);
}
