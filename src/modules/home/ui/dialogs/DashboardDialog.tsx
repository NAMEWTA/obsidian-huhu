// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/modal-theme.ts
import { useRef, useState, type ReactNode } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from '../../../../ui/components/dialog';
import { Button } from '../../../../ui/components/button';
import { useOwnerDocument, useVisible } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import { useDashboardAppearance, useDashboardLayout } from '../theme/ThemeBridge';
export function DashboardDialog({
	title,
	children,
	onClose,
	onSave,
	wide = false,
	busy = false,
	danger = false,
	confirmLabel,
	cancelLabel,
	embedded = false,
	disabled = false,
}: {
	title: string;
	children: ReactNode;
	onClose(this: void): void;
	onSave?(this: void): void | Promise<void>;
	wide?: boolean;
	busy?: boolean;
	danger?: boolean;
	confirmLabel?: string;
	cancelLabel?: string;
	embedded?: boolean;
	disabled?: boolean;
}) {
	const [pending, setPending] = useState(false),
		[error, setError] = useState('');
	const locked = busy || pending;
	const save = async () => {
		if (locked || disabled || !onSave) return;
		const invalid = appearanceRef.current?.querySelector<HTMLInputElement>('[aria-invalid=true]');
		if (invalid) {
			invalid.focus();
			return;
		}
		setPending(true);
		setError('');
		try {
			await onSave();
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error));
		} finally {
			setPending(false);
		}
	};
	const appearanceRef = useDashboardAppearance();
	const visible = useVisible();
	const cancel = useRef<HTMLButtonElement>(null);
	const doc = useOwnerDocument(),
		opener = useRef(doc.activeElement as HTMLElement | null);
	const layout = useDashboardLayout(),
		t = useT();
	if (embedded)
		return (
			<section ref={appearanceRef} className="huhu-dashboard-root grid gap-4 p-4" aria-label={title}>
				<h2 className="m-0 text-lg font-semibold">{title}</h2>
				<div className="grid gap-4">{children}</div>
				{error && (
					<p role="alert" className="text-sm text-[var(--hu-danger)]">
						{error}
					</p>
				)}
				<div className="flex flex-wrap justify-end gap-2">
					<Button variant="secondary" disabled={locked} onClick={onClose}>
						{cancelLabel ?? t('common.cancel')}
					</Button>
					{onSave && (
						<Button
							variant={danger ? 'danger' : 'primary'}
							busy={locked}
							disabled={disabled}
							onClick={() => void save()}
						>
							{confirmLabel ?? t('common.save')}
						</Button>
					)}
				</div>
			</section>
		);
	return (
		<Dialog
			open={visible}
			onOpenChange={(open) => {
				if (!open && !locked) onClose();
			}}
		>
			<DialogContent
				ref={appearanceRef}
				overlayClassName={layout === 'mobile' ? 'md:backdrop-blur-none' : undefined}
				className={`huhu-dashboard-root ${layout === 'mobile' ? 'md:backdrop-blur-none' : ''} ${wide ? 'sm:max-w-4xl' : 'sm:max-w-xl'} max-h-[85vh] overflow-y-auto bg-popover text-popover-foreground`}
				data-dashboard-layout={layout}
				onCloseAutoFocus={(e) => {
					e.preventDefault();
					if (opener.current?.isConnected) opener.current.focus();
				}}
				onOpenAutoFocus={(e) => {
					if (!onSave || danger) {
						e.preventDefault();
						cancel.current?.focus();
					}
				}}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className="sr-only">{title}</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4">{children}</div>
				{error && (
					<p role="alert" className="text-sm text-[var(--hu-danger)]">
						{error}
					</p>
				)}
				<DialogFooter>
					<Button ref={cancel} variant="secondary" disabled={locked} onClick={onClose}>
						{cancelLabel ?? t('common.cancel')}
					</Button>
					{onSave && (
						<Button
							variant={danger ? 'danger' : 'primary'}
							busy={locked}
							disabled={disabled}
							onClick={() => void save()}
						>
							{confirmLabel ?? t('common.save')}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
