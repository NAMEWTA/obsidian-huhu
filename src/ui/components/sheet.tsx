// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/sheet.tsx
'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';
import * as SheetPrimitive from 'radix-ui/dialog';
import { cva, type VariantProps } from 'class-variance-authority';

import { usePortalContainer } from '../react/contexts';
import { useComposedRefs } from '../lib/compose-refs';
import { cn } from '../lib/utils';
import { ModalLayer, useOverlayStyle, useModalContent, useModalOpener } from '../react/modal-layer';
import { useDirtyModal, type DirtyModalProps } from '../react/dirty-modal';
import { handleImeOverlayEscape } from '../react/ime';
import { useT } from '../react/hooks';

function Sheet({ children, dirty, onDiscard, open, defaultOpen, onOpenChange, ...props }: DirtyModalProps) {
	const modal = useDirtyModal({ open, defaultOpen, onOpenChange, dirty, onDiscard });
	return (
		<ModalLayer open={modal.open} modal={props.modal !== false}>
			<SheetPrimitive.Root {...props} open={modal.open} onOpenChange={modal.requestOpen}>
				{children}
				{modal.confirmation}
			</SheetPrimitive.Root>
		</ModalLayer>
	);
}

function SheetTrigger({ onClickCapture, ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
	const capture = useModalOpener();
	return (
		<SheetPrimitive.Trigger
			data-slot="sheet-trigger"
			{...props}
			onClickCapture={(event) => {
				capture();
				onClickCapture?.(event);
			}}
		/>
	);
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
	return <SheetPrimitive.Portal container={usePortalContainer()} data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, style, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
	return (
		<SheetPrimitive.Overlay
			data-slot="sheet-overlay"
			// HUHU semantic surfaces come from the approved theme palette.
			className={cn(
				'fixed inset-0 z-[var(--hu-overlay-layer)] bg-[var(--hu-overlay)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
				className,
			)}
			// Why: Electron's OS-level drag hit-test ignores z-index. Without
			// no-drag, the overlay is transparent to clicks in the titlebar's
			// drag strip, so clicking the sheet header buttons drags the window.
			style={{ ...useOverlayStyle(style), WebkitAppRegion: 'no-drag' } as React.CSSProperties}
			{...props}
		/>
	);
}

const sheetContentVariants = cva(
	// HUHU semantic surfaces come from the approved theme palette.
	'fixed z-[var(--hu-overlay-layer)] flex flex-col gap-0 rounded-[var(--hu-radius-xl)] bg-[var(--hu-raised)] text-[var(--hu-fg)] shadow-floating outline-none transition-[transform,opacity] ease-in-out   data-[state=closed]:animate-out data-[state=closed]:duration-[var(--hu-dur-fast)] data-[state=open]:animate-in data-[state=open]:duration-[var(--hu-dur-base)]',
	{
		variants: {
			side: {
				right: 'inset-y-0 right-0 h-full w-[min(440px,100%)] border-l border-border  data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right max-w-full',
				left: 'inset-y-0 left-0 h-full w-[min(440px,100%)] border-r border-border  data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left max-w-full',
				top: 'inset-x-0 top-0 h-auto border-b border-border  data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
				bottom: 'inset-x-0 bottom-0 h-auto border-t border-border  data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
			},
		},
		defaultVariants: {
			side: 'right',
		},
	},
);

function SheetContent({
	className,
	children,
	side = 'right',
	showCloseButton = true,
	overlayClassName,
	overlayStyle,
	style,
	ref,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Content> &
	VariantProps<typeof sheetContentVariants> & {
		showCloseButton?: boolean;
		overlayClassName?: string;
		overlayStyle?: React.CSSProperties;
	}) {
	const t = useT();
	const modal = useModalContent();
	const contentRef = useComposedRefs<HTMLDivElement>(modal.ref, ref);
	const layer = useOverlayStyle(style);
	return (
		<SheetPortal>
			<SheetOverlay className={overlayClassName} style={overlayStyle} />
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(sheetContentVariants({ side }), className)}
				// Why: same as SheetOverlay — the sheet content portals to the
				// document root and its header overlaps the titlebar drag strip.
				style={{ ...layer, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
				{...props}
				ref={contentRef}
				onPointerDownCapture={(event) => {
					modal.onPointerDownCapture(event);
					props.onPointerDownCapture?.(event);
				}}
				onPointerDownOutside={(event) => {
					props.onPointerDownOutside?.(event);
					if (!event.defaultPrevented) modal.onPointerDownOutside(event);
				}}
				onKeyDownCapture={(event) => {
					props.onKeyDownCapture?.(event);
					if (!event.defaultPrevented) modal.onKeyDownCapture(event);
				}}
				onOpenAutoFocus={(event) => {
					modal.onOpenAutoFocus();
					props.onOpenAutoFocus?.(event);
				}}
				onCloseAutoFocus={(event) => {
					props.onCloseAutoFocus?.(event);
					if (!event.defaultPrevented) modal.onCloseAutoFocus(event);
				}}
				onEscapeKeyDown={(event) => {
					handleImeOverlayEscape(event, props.onEscapeKeyDown);
					event.stopPropagation();
				}}
			>
				{children}
				{showCloseButton && (
					<SheetPrimitive.Close
						data-slot="sheet-close"
						data-hit-control
						aria-label={t('ui.close')}
						className="huhu-close-target absolute top-4 right-4 flex size-8 items-center justify-center rounded-[var(--hu-radius-sm)] [&_svg]:size-4 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
					>
						<XIcon />
						<span className="sr-only">{t('ui.close')}</span>
					</SheetPrimitive.Close>
				)}
			</SheetPrimitive.Content>
		</SheetPortal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn('text-base font-semibold text-foreground', className)}
			{...props}
		/>
	);
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
};
