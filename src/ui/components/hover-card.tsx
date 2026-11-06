// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/hover-card.tsx
'use client';

import * as React from 'react';
import * as HoverCardPrimitive from 'radix-ui/hover-card';
import { cva, type VariantProps } from 'class-variance-authority';

import { usePortalContainer } from '../react/contexts';
import { useOverlayStyle, FloatingLayer, FloatingOwner } from '../react/modal-layer';
import { cn } from '../lib/utils';

function HoverCard({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
	return (
		<FloatingOwner>
			<HoverCardPrimitive.Root data-slot="hover-card" {...props} />
		</FloatingOwner>
	);
}

function HoverCardTrigger({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
	return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

const hoverCardContentVariants = cva('', {
	variants: {
		variant: {
			default: 'w-64 p-4',
			'workspace-details':
				'w-[360px] max-w-[calc(100vw-2rem)] max-h-[28rem] overflow-y-auto p-3 text-xs scrollbar-sleek',
		},
	},
	defaultVariants: { variant: 'default' },
});

function HoverCardContent({
	className,
	variant,
	align = 'center',
	sideOffset = 4,
	style,
	...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content> & VariantProps<typeof hoverCardContentVariants>) {
	return (
		<FloatingLayer>
			<HoverCardPrimitive.Portal container={usePortalContainer()} data-slot="hover-card-portal">
				<HoverCardPrimitive.Content
					data-slot="hover-card-content"
					style={useOverlayStyle(style, 1)}
					align={align}
					sideOffset={sideOffset}
					// HUHU semantic surfaces come from the approved theme palette.
					className={cn(
						'z-[var(--hu-overlay-layer)] origin-(--radix-hover-card-content-transform-origin) rounded-[var(--hu-radius-lg)] border border-[var(--hu-line)] bg-[var(--hu-raised)] text-popover-foreground shadow-floating  outline-hidden    data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
						hoverCardContentVariants({ variant }),
						className,
					)}
					{...props}
				/>
			</HoverCardPrimitive.Portal>
		</FloatingLayer>
	);
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
