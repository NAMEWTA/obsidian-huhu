import { useState, type ComponentProps, type ReactNode } from 'react';
import type * as DialogPrimitive from 'radix-ui/dialog';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from '../components/alert-dialog';
import { buttonVariants } from '../components/button';
import { useT } from './hooks';
export type DirtyModalProps = ComponentProps<typeof DialogPrimitive.Root> & {
	dirty?: boolean | (() => boolean);
	onDiscard?: () => void;
};
/** Close requests keep the original form mounted until the user explicitly discards its draft. */
export function useDirtyModal({
	open: controlled,
	defaultOpen = false,
	onOpenChange,
	dirty = false,
	onDiscard,
}: DirtyModalProps): { open: boolean; requestOpen: (value: boolean) => void; confirmation: ReactNode } {
	const [local, setLocal] = useState(defaultOpen);
	const [confirm, setConfirm] = useState(false);
	const open = controlled ?? local;
	const t = useT();
	const commit = (value: boolean) => {
		setLocal(value);
		onOpenChange?.(value);
	};
	if (!open && confirm) setConfirm(false);
	const requestOpen = (value: boolean) => {
		if (!value && (typeof dirty === 'function' ? dirty() : dirty) && open) {
			setConfirm(true);
			return;
		}
		setConfirm(false);
		commit(value);
	};
	const confirmation = (
		<AlertDialog open={confirm && open} onOpenChange={setConfirm}>
			<AlertDialogContent
				onCloseAutoFocus={(event) => {
					// Actual parent close owns restoration; cancelling only the confirmation still restores normally.
					if (!open) event.preventDefault();
				}}
			>
				<AlertDialogTitle>{t('ui.discardTitle')}</AlertDialogTitle>
				<AlertDialogDescription>{t('ui.discardDescription')}</AlertDialogDescription>
				<AlertDialogFooter>
					<AlertDialogCancel>{t('ui.keepEditing')}</AlertDialogCancel>
					<AlertDialogAction
						className={buttonVariants({ variant: 'danger' })}
						onClick={() => {
							onDiscard?.();
							setConfirm(false);
							commit(false);
						}}
					>
						{t('ui.discardChanges')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
	return { open, requestOpen, confirmation };
}
