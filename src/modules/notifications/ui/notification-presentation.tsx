import { ReactSurface } from '../../../ui/react/surface';
import { DesignScope } from '../../../ui/react/design-scope';
import { t, onLanguageChanged } from '../../../shared/i18n';
import type { NotificationService } from '../core/service';
import type { NotificationTargetName } from '../api';
import { type NativeSurfaceContext } from '../../../ui/native-surface';
import { InboxPanel } from './InboxPanel';

/** Inbox page: `section` `unread` shows unread records only, anything else shows all. */
export class NotificationPresentation extends ReactSurface {
	private generation = 0;
	private active = false;
	private openable = new Set<string>();
	private names = new Map<string, NotificationTargetName | undefined>();
	private error = '';
	private busy = false;
	constructor(
		context: NativeSurfaceContext,
		private readonly service: NotificationService,
		private readonly report: (error: unknown) => void,
		private filter: 'all' | 'unread' = 'all',
	) {
		super(context);
	}
	getViewType(): string {
		return 'huhu-notification-surface';
	}
	getDisplayText(): string {
		return t('workbench.notifications');
	}
	getIcon(): string {
		return 'bell';
	}
	onOpen(): Promise<void> {
		this.active = true;
		void super.onOpen();
		this.register(this.service.subscribe(() => this.draw()));
		this.register(onLanguageChanged(() => this.draw()));
		this.draw();
		return Promise.resolve();
	}
	setFilter(filter: 'all' | 'unread'): void {
		if (filter === this.filter) return;
		this.filter = filter;
		this.draw();
	}
	private draw(): void {
		const generation = ++this.generation;
		const records = this.service.records;
		void Promise.all(
			records.map(async (record) => ({
				id: record.id,
				openable: await this.service.canOpen(record),
				name: record.target ? await this.service.describe(record) : undefined,
			})),
		)
			.then((rows) => {
				if (!this.active || generation !== this.generation) return;
				this.openable = new Set(rows.filter((row) => row.openable).map((row) => row.id));
				this.names = new Map(rows.map((row) => [row.id, row.name]));
				this.rerender();
			})
			.catch(this.report);
		this.rerender();
	}
	protected renderContent() {
		return (
			<DesignScope className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
				<InboxPanel
					records={this.service.records}
					filter={this.filter}
					markRead={(id) => this.perform(() => this.service.markRead(id))}
					clearRead={() => this.perform(() => this.service.clearRead())}
					open={(record) => this.perform(() => this.service.open(record))}
					openable={this.openable}
					names={this.names}
					error={this.error}
					busy={this.busy}
					dismissError={() => {
						this.error = '';
						this.rerender();
					}}
				/>
			</DesignScope>
		);
	}
	/** Run one action; a failure stays visible in the page until dismissed, and is also reported. */
	private perform(operation: () => Promise<void>): void {
		if (this.busy || !this.active) return;
		this.busy = true;
		this.error = '';
		this.rerender();
		void Promise.resolve()
			.then(operation)
			.catch((error) => {
				if (this.active) this.error = t('notification.operationFailed');
				this.report(error);
			})
			.finally(() => {
				this.busy = false;
				if (this.active) this.rerender();
			});
	}
	onClose(): Promise<void> {
		this.active = false;
		this.generation++;
		return super.onClose();
	}
}
