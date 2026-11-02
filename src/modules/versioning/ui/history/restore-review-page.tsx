import type { App } from 'obsidian';
import type { RestoreReceipt } from '../../core/restore';
import { t } from '../../../../shared/i18n';
import { Button } from '../../../../ui/components/button';
import { dialogOwner, openReactDialog } from '../../../../ui/react/dialog';

/** Acknowledgement records human review; it never rewrites an uncertain journal as verified. */
export function confirmRestoreReview(app: App, receipts: readonly RestoreReceipt[]): Promise<boolean> {
	return new Promise((resolve) => {
		let confirmed = false;
		openReactDialog(dialogOwner(app), {
			title: t('review.pendingTitle'),
			description: t('review.pendingDescription'),
			content: (close) => (
				<div className="space-y-4">
					<ul className="m-0 max-h-64 list-none space-y-2 overflow-auto p-0">
						{receipts.map((receipt) => (
							<li key={receipt.id} className="rounded-md border p-3 text-sm">
								<p className="m-0 break-all font-medium">{receipt.path}</p>
								<p className="mb-0 mt-1 text-xs text-muted-foreground">
									{t(`review.stage.${receipt.stage}`)}
								</p>
							</li>
						))}
					</ul>
					<p className="text-xs text-muted-foreground">{t('review.pendingRetention')}</p>
					<div className="flex flex-wrap justify-end gap-2">
						<Button variant="outline" onClick={close}>
							{t('review.cancel')}
						</Button>
						<Button
							onClick={() => {
								confirmed = true;
								close();
							}}
						>
							{t('review.pendingConfirm')}
						</Button>
					</div>
				</div>
			),
			onClose: () => resolve(confirmed),
		});
	});
}
