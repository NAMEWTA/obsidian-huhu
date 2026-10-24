import { EXPENSE_ROOT } from '../../../../shared/storage/vault-layout';
import { RecordStorage } from '../record-storage';
import type { App } from 'obsidian';
import { ExpenseApplication } from '../../core/expense/application';
import type { WidgetSettingsHost } from '../widget-settings-host';
/** Native focus synchronization and storage wiring for this application instance. */
export class ExpenseService extends ExpenseApplication {
	private focusDoc: Document;
	private readonly unsubscribe: () => void;
	private focusHandler = () => {
		if (this.focusDoc.visibilityState === 'visible') void this.syncFromDisk();
	};
	constructor(private plugin: WidgetSettingsHost) {
		const storage = new RecordStorage(plugin.app, `${EXPENSE_ROOT}/expense.json`);
		super(storage, EXPENSE_ROOT, () => plugin.settings.expenseCurrency);
		this.unsubscribe = storage.subscribeInvalidation(() => { void this.syncFromDisk(); });
		this.focusDoc = plugin.app.workspace.containerEl.ownerDocument;
		this.focusDoc.addEventListener('visibilitychange', this.focusHandler);
	}
	getApp(): App {
		return this.plugin.app;
	}
	override destroy(): void {
		this.unsubscribe();
		this.focusDoc.removeEventListener('visibilitychange', this.focusHandler);
		void this.shutdown().catch(() => undefined);
		super.destroy();
	}
}
