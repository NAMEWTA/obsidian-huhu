// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/dialog.tsx
'use client';

import * as React from 'react';
import { Minus, XIcon } from 'lucide-react';
import * as DialogPrimitive from 'radix-ui/dialog';

import { usePortalContainer } from '../react/contexts';
import { useComposedRefs } from '../lib/compose-refs';
import { cn } from '../lib/utils';
import { ModalLayer, useOverlayStyle, useModalContent, useModalOpener } from '../react/modal-layer';
import { useDirtyModal, type DirtyModalProps } from '../react/dirty-modal';
import { handleImeOverlayEscape } from '../react/ime';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { useT } from '../react/hooks';

const DialogRequestContext = React.createContext<((value: boolean) => void) | null>(null);
export function useDialogClose(): () => void {
	const request = React.useContext(DialogRequestContext);
	if (!request) throw new Error('Dialog close requires Dialog');
	return () => request(false);
}
function Dialog({ children, dirty, onDiscard, open, defaultOpen, onOpenChange, ...props }: DirtyModalProps) {
	const modal = useDirtyModal({ open, defaultOpen, onOpenChange, dirty, onDiscard });
	return (
		<ModalLayer open={modal.open} modal={props.modal !== false}>
			<DialogRequestContext.Provider value={modal.requestOpen}>
				<DialogPrimitive.Root {...props} open={modal.open} onOpenChange={modal.requestOpen}>
					{children}
					{modal.confirmation}
				</DialogPrimitive.Root>
			</DialogRequestContext.Provider>
		</ModalLayer>
	);
}

function DialogTrigger({ onClickCapture, ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	const capture = useModalOpener();
	return (
		<DialogPrimitive.Trigger
			data-slot="dialog-trigger"
			{...props}
			onClickCapture={(event) => {
				capture();
				onClickCapture?.(event);
			}}
		/>
	);
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal container={usePortalContainer()} data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, style, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			style={useOverlayStyle(style)}
			// HUHU semantic surfaces come from the approved theme palette.
			className={cn(
				'fixed inset-0 z-[var(--hu-overlay-layer)] bg-[var(--hu-overlay)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
				className,
			)}
			{...props}
		/>
	);
}

function DialogContentCloseButton({ variant }: { variant: 'close' | 'minimize' }) {
	const t = useT();
	const label = variant === 'minimize' ? t('ui.minimize') : t('ui.close');
	// Inside the content padding, centred on the first title line (shadcn: absolute top/right of the padding box).
	const button = (
		<DialogPrimitive.Close asChild>
			<Button
				data-slot="dialog-close"
				aria-label={label}
				data-hit-control
				type="button"
				variant="ghost"
				size="icon-sm"
				className="huhu-close-target absolute top-4 right-4"
			>
				{variant === 'minimize' ? <Minus className="size-3.5" /> : <XIcon />}
				<span className="sr-only">{label}</span>
			</Button>
		</DialogPrimitive.Close>
	);
	return variant === 'minimize' ? (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent side="top" sideOffset={4}>
				{label}
			</TooltipContent>
		</Tooltip>
	) : (
		button
	);
}

function DialogContent({
	className,
	children,
	overlayClassName,
	showCloseButton = true,
	closeButtonVariant = 'close',
	style,
	ref,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
	overlayClassName?: string;
	showCloseButton?: boolean;
	closeButtonVariant?: 'close' | 'minimize';
}) {
	const layer = useOverlayStyle(style);
	const modal = useModalContent();
	const contentRef = useComposedRefs<HTMLDivElement>(modal.ref, ref);
	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay className={overlayClassName} />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				// HUHU semantic surfaces come from the approved theme palette.
				className={cn(
					'fixed top-1/2 left-1/2 z-[var(--hu-overlay-layer)] grid w-[min(512px,calc(100%-32px))] max-h-[calc(100%-32px)] min-w-0 grid-cols-[minmax(0,1fr)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto scrollbar-sleek rounded-[var(--hu-radius-xl)] border border-[var(--hu-line)] bg-[var(--hu-raised)] p-5 text-[var(--hu-fg)] shadow-floating outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
					// The title never runs under the close button.
					showCloseButton && '[&>[data-slot=dialog-header]]:pe-9',
					className,
				)}
				{...props}
				style={layer}
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
				{showCloseButton && <DialogContentCloseButton variant={closeButtonVariant} />}
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot="dialog-header" className={cn('flex flex-col gap-2 text-left', className)} {...props} />;
}

function DialogFooter({
	className,
	showCloseButton = false,
	children,
	...props
}: React.ComponentProps<'div'> & {
	showCloseButton?: boolean;
}) {
	const t = useT();
	return (
		<div
			data-slot="dialog-footer"
			className={cn('flex flex-row flex-wrap justify-end gap-2', className)}
			{...props}
		>
			{children}
			{showCloseButton && (
				<DialogPrimitive.Close asChild>
					<Button variant="secondary">{t('ui.close')}</Button>
				</DialogPrimitive.Close>
			)}
		</div>
	);
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn('m-0 text-lg leading-[var(--hu-lh-lg)] font-semibold break-words', className)}
			{...props}
		/>
	);
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
