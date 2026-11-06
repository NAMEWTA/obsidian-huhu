// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/command.tsx
'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Command as CommandPrimitive } from 'cmdk';
import { SearchIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './dialog';
import type { DirtyModalProps } from '../react/dirty-modal';

import { useT } from '../react/hooks';
import { cn } from '../lib/utils';
import { useImeTextFieldProps } from '../react/ime';

const commandVariants = cva('flex h-full w-full flex-col overflow-hidden rounded-[var(--hu-radius-sm)]', {
	variants: {
		surface: {
			default: 'bg-popover text-popover-foreground',
			inline: 'bg-transparent text-foreground',
		},
		density: {
			default: '',
			// Why: matches DropdownMenuItem type so a searchable picker reads like its sibling menus.
			menu: '[&_[cmdk-empty]]:text-[12px] [&_[cmdk-input-wrapper]_svg]:size-3.5 [&_[cmdk-input]]:h-[var(--hu-ctl-h)] [&_[cmdk-input]]:text-[12px] [&_[cmdk-item]]:rounded-[var(--hu-radius-sm)] [&_[cmdk-item]]:py-[4px] [&_[cmdk-item]]:text-[12px] [&_[cmdk-item]]:leading-[18px] [&_[cmdk-item]]:font-medium',
		},
	},
	defaultVariants: { surface: 'default', density: 'default' },
});

function Command({
	className,
	surface,
	density,
	...props
}: React.ComponentProps<typeof CommandPrimitive> & VariantProps<typeof commandVariants>) {
	return (
		<CommandPrimitive
			data-slot="command"
			className={cn(commandVariants({ surface, density }), className)}
			{...props}
		/>
	);
}

function CommandDialog({
	children,
	title,
	description,
	shouldFilter,
	onOpenAutoFocus,
	onCloseAutoFocus,
	contentClassName,
	overlayClassName,
	commandProps,
	...props
}: DirtyModalProps & {
	title?: string;
	description?: string;
	shouldFilter?: boolean;
	onOpenAutoFocus?: (event: Event) => void;
	onCloseAutoFocus?: (event: Event) => void;
	contentClassName?: string;
	overlayClassName?: string;
	commandProps?: React.ComponentProps<typeof CommandPrimitive>;
}) {
	const t = useT();
	const { className, ...commandRootProps } = commandProps ?? {};
	return (
		<Dialog {...props}>
			<DialogContent
				showCloseButton={false}
				overlayClassName={overlayClassName}
				className={cn('w-[min(620px,calc(100%-32px))] gap-0 p-0', contentClassName)}
				onOpenAutoFocus={onOpenAutoFocus}
				onCloseAutoFocus={onCloseAutoFocus}
			>
				<DialogTitle className="sr-only">{title ?? t('ui.commandTitle')}</DialogTitle>
				<DialogDescription className="sr-only">{description ?? t('ui.commandDescription')}</DialogDescription>
				<Command shouldFilter={shouldFilter} className={className} {...commandRootProps}>
					{children}
				</Command>
			</DialogContent>
		</Dialog>
	);
}

const commandInputVariants = cva('flex items-center bg-[var(--hu-raised)] px-3 py-1', {
	variants: {
		variant: {
			default: 'border-b border-border',
			framed: 'rounded-[var(--hu-radius-sm)] border border-input',
		},
	},
	defaultVariants: { variant: 'default' },
});

function CommandInput({
	className,
	variant,
	wrapperClassName,
	iconClassName,
	trailing,
	ref,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Input> &
	VariantProps<typeof commandInputVariants> & {
		wrapperClassName?: string;
		iconClassName?: string;
		/** Rendered after the field, inside the input frame (e.g. a filter control). */
		trailing?: React.ReactNode;
	}) {
	const imeProps = useImeTextFieldProps<HTMLInputElement>(props);
	return (
		<div className={cn(commandInputVariants({ variant }), wrapperClassName)} data-cmdk-input-wrapper="">
			<SearchIcon className={cn('mr-2 h-4 w-4 shrink-0 opacity-50', iconClassName)} />
			<CommandPrimitive.Input
				ref={ref}
				data-slot="command-input"
				className={cn(
					'flex h-10 w-full rounded-[var(--hu-radius-sm)] bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
					className,
				)}
				{...props}
				{...imeProps}
			/>
			{trailing}
		</div>
	);
}

function CommandList({
	className,
	animateHeight = false,
	ref,
	...props
}: React.ComponentProps<typeof CommandPrimitive.List> & {
	/** Size to cmdk’s filtered height; HUHU does not animate layout properties. */
	animateHeight?: boolean;
}) {
	const internalRef = React.useRef<HTMLDivElement>(null);

	// Why: Radix Dialog applies react-remove-scroll which calls preventDefault()
	// on wheel events for portaled elements (e.g. Popover) outside the Dialog's
	// DOM tree. The scrollbar renders (CSS overflow works) but the browser never
	// scrolls because the native event is cancelled. A non-passive wheel listener
	// directly on the list takes over scrolling manually so it works regardless
	// of whether a scroll-lock is active.
	React.useEffect(() => {
		const el = internalRef.current;
		if (!el) {
			return;
		}
		const onWheel = (e: WheelEvent): void => {
			if (el.scrollHeight <= el.clientHeight) {
				return;
			}
			e.preventDefault();
			el.scrollTop += e.deltaY;
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	}, []);

	const mergedRef = React.useCallback(
		(node: HTMLDivElement | null) => {
			internalRef.current = node;
			if (typeof ref === 'function') {
				ref(node);
			} else if (ref) {
				ref.current = node;
			}
		},
		[ref],
	);

	return (
		<CommandPrimitive.List
			ref={mergedRef}
			data-slot="command-list"
			className={cn(
				'max-h-[min(400px,60vh)] overflow-y-auto overflow-x-hidden scrollbar-sleek scroll-pb-4 scroll-pt-4',
				animateHeight && 'h-[min(var(--cmdk-list-height),400px,60vh)]',
				className,
			)}
			{...props}
		/>
	);
}

function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
	return (
		<CommandPrimitive.Empty
			data-slot="command-empty"
			className={cn('py-6 text-center text-sm text-muted-foreground', className)}
			{...props}
		/>
	);
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			data-slot="command-group"
			className={cn(
				'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
				className,
			)}
			{...props}
		/>
	);
}

function CommandItem({ className, ref, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			ref={ref}
			data-slot="command-item"
			className={cn(
				'relative flex min-h-[var(--hu-ctl-h)] cursor-default gap-1.5 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[selected=true]:bg-[var(--hu-accent-soft)] data-[selected=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
				className,
			)}
			{...props}
		/>
	);
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
	return (
		<CommandPrimitive.Separator
			data-slot="command-separator"
			className={cn('-mx-1 h-px bg-border', className)}
			{...props}
		/>
	);
}

export { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator };
