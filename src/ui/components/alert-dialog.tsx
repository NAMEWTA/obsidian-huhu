// Adapted from shadcn/ui new-york-v4 (MIT), Copyright (c) 2023 shadcn.
// Source recipe: shadcn-ui/ui, apps/v4/registry/new-york-v4/ui/alert-dialog.tsx.
// Recipe adaptation (no upstream revision recorded); React 19 / Radix UI 1.6.7, resizable 3.0.6.
import { useState, type ComponentProps } from 'react';
import * as AlertDialogPrimitive from 'radix-ui/alert-dialog';
import { useComposedRefs } from '../lib/compose-refs';
import { cn } from '../lib/utils';
import { buttonVariants } from './button';
import { usePortalContainer } from '../react/contexts';
import { ModalLayer, useOverlayStyle, useModalContent, useModalOpener } from '../react/modal-layer';
import { handleImeOverlayEscape } from '../react/ime';
export function AlertDialog({
	open: controlled,
	defaultOpen = false,
	onOpenChange,
	children,
	...props
}: ComponentProps<typeof AlertDialogPrimitive.Root>) {
	const [local, setLocal] = useState(defaultOpen);
	const open = controlled ?? local;
	return (
		<ModalLayer open={open}>
			<AlertDialogPrimitive.Root
				{...props}
				open={open}
				onOpenChange={(value) => {
					setLocal(value);
					onOpenChange?.(value);
				}}
			>
				{children}
			</AlertDialogPrimitive.Root>
		</ModalLayer>
	);
}

export function AlertDialogTrigger({ onClickCapture, ...props }: ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
	const capture = useModalOpener();
	return (
		<AlertDialogPrimitive.Trigger
			data-slot="alert-dialog-trigger"
			{...props}
			onClickCapture={(event) => {
				capture();
				onClickCapture?.(event);
			}}
		/>
	);
}

export function AlertDialogPortal(props: ComponentProps<typeof AlertDialogPrimitive.Portal>) {
	return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} container={usePortalContainer()} />;
}
export function AlertDialogOverlay({
	className,
	style,
	...props
}: ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
	return (
		<AlertDialogPrimitive.Overlay
			data-slot="alert-dialog-overlay"
			style={useOverlayStyle(style)}
			className={cn(
				'fixed inset-0 z-[var(--hu-overlay-layer)] bg-[var(--hu-overlay)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
				className,
			)}
			{...props}
		/>
	);
}
export function AlertDialogTitle({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Title>) {
	return (
		<AlertDialogPrimitive.Title
			data-slot="alert-dialog-title"
			className={cn('text-lg font-semibold', className)}
			{...props}
		/>
	);
}
export function AlertDialogDescription({
	className,
	...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
	return (
		<AlertDialogPrimitive.Description
			data-slot="alert-dialog-description"
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	);
}
export function AlertDialogContent({
	className,
	style,
	ref,
	...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) {
	const modal = useModalContent();
	const contentRef = useComposedRefs<HTMLDivElement>(modal.ref, ref);
	const layer = useOverlayStyle(style);
	return (
		<AlertDialogPortal>
			<AlertDialogOverlay />
			<AlertDialogPrimitive.Content
				data-slot="alert-dialog-content"
				className={cn(
					'fixed top-[50%] left-[50%] z-[var(--hu-overlay-layer)] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[var(--hu-radius-xl)] border border-[var(--hu-line)] bg-[var(--hu-raised)] p-5 text-[var(--hu-fg)] shadow-floating duration-[var(--hu-dur-base)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-lg',
					className,
				)}
				{...props}
				style={layer}
				ref={contentRef}
				onPointerDownCapture={(event) => {
					modal.onPointerDownCapture(event);
					props.onPointerDownCapture?.(event);
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
			/>
		</AlertDialogPortal>
	);
}
export function AlertDialogHeader({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div data-slot="alert-dialog-header" className={cn('flex flex-col gap-2 text-left', className)} {...props} />
	);
}
export function AlertDialogFooter({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-dialog-footer"
			className={cn('flex flex-row flex-wrap justify-end gap-2', className)}
			{...props}
		/>
	);
}
export function AlertDialogAction({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Action>) {
	return <AlertDialogPrimitive.Action className={cn(buttonVariants({ variant: 'primary' }), className)} {...props} />;
}
export function AlertDialogCancel({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
	return (
		<AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'secondary' }), className)} {...props} />
	);
}
