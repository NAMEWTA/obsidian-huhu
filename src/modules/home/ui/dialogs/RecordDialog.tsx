// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/pomodoro-stats-modal.ts, src/expense-stats-modal.ts
import { useRef, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../../ui/components/dialog';
import { useOwnerDocument, useVisible } from '../../../../ui/react/contexts';
import { useDashboardAppearance, useDashboardLayout } from '../theme/ThemeBridge';
import { widgetClasses } from '../theme/widget-classes';

/** Keep Apex's content/header dimensions while Radix owns focus, Escape and the document portal. */
export function RecordDialog({
	title,
	classes,
	onClose,
	children,
}: {
	title: string;
	classes: string;
	onClose(this: void): void;
	children: ReactNode;
}) {
	const appearanceRef = useDashboardAppearance();
	const doc = useOwnerDocument(),
		opener = useRef(doc.activeElement as HTMLElement | null);
	const size = classes.includes('fortune-card--result')
		? 'w-auto sm:max-w-[280px]'
		: classes.includes('fortune-card')
			? 'w-auto sm:max-w-[300px]'
			: classes.includes('calendar-fullscreen')
				? 'sm:max-w-[1100px] max-h-[85vh] p-[16px] pt-[calc(16px+0.75em)] overflow-auto border-0 shadow-none [background:transparent]'
				: classes.includes('ledger-modal')
					? 'sm:max-w-[1080px]'
					: classes.includes('--wide')
						? 'h-[min(90vh,900px)] max-h-[90vh] w-[calc(100vw-2rem)] sm:max-w-[1100px] overflow-hidden p-0'
						: classes.includes('habit-stats')
							? 'sm:max-w-[480px]'
							: classes.includes('reading-book')
								? 'sm:max-w-[440px]'
								: classes.includes('day-agenda')
									? 'sm:max-w-[480px]'
									: 'sm:max-w-[440px]';
	const visible = useVisible(),
		layout = useDashboardLayout();
	return (
		<Dialog
			open={visible}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				ref={appearanceRef}
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					if (opener.current?.isConnected) opener.current.focus();
				}}
				showCloseButton={false}
				className={widgetClasses(
					`huhu-dashboard-root block gap-0 md:backdrop-blur-none ${classes.includes('--wide') ? '' : classes} ${size} [position:fixed] [font-size:inherit] [font-family:var(--db-font)]`,
				)}
				overlayClassName="md:backdrop-blur-none"
				data-dashboard-layout={layout}
			>
				<DialogTitle className="sr-only">{title}</DialogTitle>
				<DialogDescription className="sr-only">{title}</DialogDescription>
				{children}
			</DialogContent>
		</Dialog>
	);
}
