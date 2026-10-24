import { useTransient } from '../use-transient';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogCancel,
} from '../../../../ui/components/alert-dialog';
import { Button } from '../../../../ui/components/button';
import { useT } from '../../../../ui/react/hooks';

/** Asks before the editor closes with changes that were not saved. */
export function DiscardDialog({
	name,
	onCancel,
	onConfirm,
}: {
	name: string;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	const t = useT(),
		layer = useTransient();
	return (
		<AlertDialog
			open
			onOpenChange={(open) => {
				if (!open) onCancel();
			}}
		>
			<AlertDialogContent onCloseAutoFocus={layer.onCloseAutoFocus} className="max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle className="text-sm">{t('automation.discardTitle')}</AlertDialogTitle>
					<AlertDialogDescription className="text-xs">{t('automation.discardBody', { name })}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t('automation.keepEditing')}</AlertDialogCancel>
					<Button variant="destructive" onClick={onConfirm}>
						{t('automation.discard')}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
