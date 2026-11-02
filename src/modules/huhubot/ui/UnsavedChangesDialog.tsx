import { useVisible } from '../../../ui/react/contexts';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '../../../ui/components/alert-dialog';
import { useT } from '../../../ui/react/hooks';
export function UnsavedChangesDialog({
	open,
	onCancel,
	onDiscard,
}: {
	open: boolean;
	onCancel: () => void;
	onDiscard: () => void;
}) {
	const t = useT();
	const visible = useVisible();
	return (
		<AlertDialog
			open={visible && open}
			onOpenChange={(value) => {
				if (!value) onCancel();
			}}
		>
			<AlertDialogContent
				onCloseAutoFocus={(event) => {
					if (!visible) event.preventDefault();
				}}
			>
				<AlertDialogHeader>
					<AlertDialogTitle>{t('huhubot.common.discardTitle')}</AlertDialogTitle>
					<AlertDialogDescription>{t('huhubot.common.discardDescription')}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>{t('huhubot.common.keepEditing')}</AlertDialogCancel>
					<AlertDialogAction onClick={onDiscard}>{t('huhubot.common.discard')}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
