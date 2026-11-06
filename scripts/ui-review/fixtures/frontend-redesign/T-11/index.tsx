import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { readyDocuments } from '../shared/ready-documents';
import { HuhuProviders } from '../../../../../src/ui/react/providers';
import { DesignScope } from '../../../../../src/ui/react/design-scope';
import { InboxPanel } from '../../../../../src/modules/notifications/ui/InboxPanel';
import { NotificationService } from '../../../../../src/modules/notifications/core/service';
import { SafePage } from '../../../../../src/modules/safe/ui/SafePage';
import { quickPickFixture, QUICK_PICK_MASTER } from '../../../../../src/modules/safe/ui/quick-pick.test-support';
import { safeSettingsPage } from '../../../../../src/modules/safe/ui/settings-page';
import { safeSettings } from '../../../../../src/modules/safe/settings';
import { HealthPage } from '../../../../../src/modules/health/ui/HealthPage';
import { HealthScanService } from '../../../../../src/modules/health/core/scanner';
import { HealthRepairService } from '../../../../../src/modules/health/core/repair';
import type {
	HealthCheck,
	HealthProvider,
	HealthRepairOwner,
	HealthRepairSelection,
	HealthScope,
} from '../../../../../src/modules/health/api';
import { serviceKey } from '../../../../../src/app/contracts/module';
import { registerMessages, setLanguage, t } from '../../../../../src/shared/i18n';
import { messages as notificationMessages } from '../../../../../src/modules/notifications/i18n';
import { messages as safeMessages } from '../../../../../src/modules/safe/i18n';
import { installFixtureTheme } from '../shared/fixture-theme';
registerMessages(notificationMessages);
registerMessages(safeMessages);
const states = [
	'notifications',
	'notifications-unread',
	'notifications-empty',
	'safe-locked',
	'safe-unlocked',
	'safe-empty',
	'safe-create',
	'safe-corrupt',
	'safe-settings',
	'safe-detail',
	'safe-new',
	'safe-quick',
	'safe-import',
	'safe-restore',
	'safe-password',
	'health-empty',
	'health-results',
	'health-repair',
	'health-stale',
	'health-scanning',
];
async function bootstrap() {
	const docs = await readyDocuments(document);
 const fixtureTheme = await installFixtureTheme(docs);
	const owners: Record<string, Awaited<ReturnType<typeof mount>>> = {};
	async function mount(doc: Document) {
		const win = doc.defaultView!;
		Object.defineProperty(win.HTMLElement.prototype, 'win', {
			configurable: true,
			get(this: HTMLElement) {
				return this.ownerDocument.defaultView;
			},
		});
		Object.defineProperty(win.HTMLElement.prototype, 'createDiv', {
			configurable: true,
			value(this: HTMLElement, options: { cls?: string } = {}) {
				const child = this.ownerDocument.createElement('div');
				child.className = options.cls ?? '';
				this.append(child);
				return child;
			},
		});
		const host = doc.createElement('main');
		host.className = 'huhu-ui';
		host.dataset.huhuLeaf = '';
		host.style.cssText = 'display:flex;height:100vh;min-width:0';
		doc.body.append(host);
		let backupRaw: string | null = null;
		const root = createRoot(host),
			safe = await quickPickFixture(win, false, { pickBackup: async () => backupRaw });
		const initialFiles = new Map(safe.files);
		backupRaw = initialFiles.get('vault.enc') ?? null;
		const memory = new Map<string, string>();
		let fail = false,
			pending: (() => void) | undefined,
			delay = false;
		const wait = () =>
			delay
				? new Promise<void>((resolve) => {
						pending = resolve;
					})
				: Promise.resolve();
		const storage = {
			exists: async (path: string) => memory.has(path),
			read: async (path: string) => memory.get(path)!,
			write: async (path: string, value: string) => {
				await wait();
				if (fail) throw Error('Test write failed');
				memory.set(path, value);
			},
			mkdir: async () => {},
		};
		const opened: string[] = [];
		const notifications = new NotificationService(
			storage,
			'fixture-notifications.json',
			async (record) => {
				await wait();
				opened.push(record.id);
			},
			{ available: () => true, send: async () => {}, dispose() {} },
			async () => true,
			async (record) => ({ state: 'current', name: record.title }),
		);
		await notifications.load();
		for (let index = 0; index < 65; index++)
			await notifications.send({
				id: `review-${index}`,
				title: `Notification ${index + 1} · 通知`,
				body: 'Production notification service, delivery receipt and source navigation.',
				channels: ['in-app'],
				target: { runId: `run-${index}`, automationId: `automation-${index}` },
			});
		let seq = 0,
			held = false,
			releaseScan: (() => void) | undefined,
			mode = 'notifications',
			visible = true,
			section: 'scan' | 'repair' = 'scan',
			reportId: string | undefined;
		const scopes: HealthScope[] = ['archives', 'belongings', 'periodic', 'safe'];
		const ids = ['archives.integrity', 'archives.belongings', 'periodic.integrity', 'safe.integrity'];
		const providers: HealthProvider[] = ids.map((id, index) => ({
			id,
			scope: scopes[index]!,
			service: serviceKey<HealthCheck>('health', id),
		}));
		const scanner = new HealthScanService(
			{
				providers: async () => providers,
				now: () => Date.now(),
				id: () => `scan-${++seq}`,
				yieldControl: async () => {},
				acquire: async (provider) => ({
					revoked: new AbortController().signal,
					value: {
						permission: async () => (provider.scope === 'safe' ? 'locked' : 'allowed'),
						scan: async function* (context) {
							yield { checked: 1, total: 2 };
							if (held)
								await new Promise<void>((resolve) => {
									releaseScan = resolve;
									context.signal.addEventListener('abort', () => resolve(), { once: true });
								});
							yield {
								checked: 1,
								total: 2,
								status: provider.scope === 'belongings' ? 'warning' : 'pass',
								issues:
									provider.scope === 'belongings'
										? [
												{
													code: 'projection-mismatch',
													severity: 'warning',
													count: 1,
													reference: 'a'.repeat(64),
												},
											]
										: [],
							};
						},
					},
				}),
			},
			() => ({ concurrency: 1, batchSize: 1, maxItems: 100, maxIssues: 20, freshnessMinutes: 5 }),
		);
		const proposals = new Map<string, HealthRepairSelection>();
		let commits = 0;
		const repairOwner: HealthRepairOwner = {
			preview: async (selection) => {
				await wait();
				const id = `proposal-${++seq}`;
				proposals.set(id, selection);
				return { id, kind: selection.kind, expectedHash: 'b'.repeat(64), affected: 1 };
			},
			commit: async (input) => {
				await wait();
				commits++;
				return {
					operationId: input.operationId,
					kind: proposals.get(input.proposalId)!.kind,
					status: commits % 2 ? 'verified' : 'failed',
					committed: commits % 2 === 1,
					rechecked: commits % 2 === 1,
					...(commits % 2 === 0 ? { recoveryId: 'fixture-recovery' } : {}),
				};
			},
			recover: async () => ({
				operationId: 'fixture-recovery',
				kind: 'belonging-projection',
				status: 'verified',
				committed: true,
				rechecked: true,
			}),
		};
		const emptyScanner = new HealthScanService(
			{
				providers: async () => [],
				acquire: async () => undefined,
				now: () => Date.now(),
				id: () => 'empty-scan',
				yieldControl: async () => {},
			},
			() => ({ concurrency: 1, batchSize: 1, maxItems: 100, maxIssues: 20, freshnessMinutes: 5 }),
		);
		const repairs = new HealthRepairService({
			providers: async () =>
				ids.slice(0, 2).map((providerId) => ({
					providerId,
					service: serviceKey<HealthRepairOwner>('health', providerId),
				})),
			acquire: async () => ({ value: repairOwner, revoked: new AbortController().signal }),
			report: () => scanner.snapshot.report,
			now: () => Date.now(),
			id: () => `repair-${++seq}`,
			notify: async () => {},
		});
		let settingsValue = safeSettings.defaults(),
			view = 'list' as 'list' | 'cards';
		const settingsListeners = new Set<() => void>();
		const Settings = safeSettingsPage({
			select: (select, listener, equal = Object.is) => {
				let previous = select(settingsValue);
				const changed = () => {
					const next = select(settingsValue);
					if (!equal(previous, next)) {
						const old = previous;
						previous = next;
						listener(next, old);
					}
				};
				settingsListeners.add(changed);
				return () => {
					settingsListeners.delete(changed);
				};
			},
			touch: async () => {},
			get: () => settingsValue,
			subscribe: (listener) => {
				settingsListeners.add(listener);
				return () => {
					settingsListeners.delete(listener);
				};
			},
			update: async (change) => {
				await wait();
				if (fail) throw Error('Test settings failure');
				const draft = structuredClone(settingsValue);
				change(draft);
				settingsValue = draft;
				for (const listener of settingsListeners) listener();
			},
		});
		function Inbox() {
			const [, update] = useState(0),
				[busy, setBusy] = useState(false),
				[error, setError] = useState('');
			useEffect(() => notifications.subscribe(() => update((value) => value + 1)), []);
			const run = async (work: () => Promise<void>) => {
				if (busy) return;
				setBusy(true);
				try {
					await work();
				} catch {
					setError(t('notification.operationFailed'));
				} finally {
					setBusy(false);
				}
			};
			return (
				<DesignScope className="h-full min-h-0">
					<InboxPanel
						records={mode === 'notifications-empty' ? [] : notifications.records}
						filter={mode === 'notifications-unread' ? 'unread' : 'all'}
						markRead={(id) => {
							void run(() => notifications.markRead(id));
						}}
						clearRead={() => {
							void run(() => notifications.clearRead());
						}}
						open={(record) => {
							void run(() => notifications.open(record));
						}}
						openable={new Set(notifications.records.map((row) => row.id))}
						error={error}
						dismissError={() => setError('')}
						busy={busy}
					/>
				</DesignScope>
			);
		}
		function render() {
			flushSync(() =>
				root.render(
					<HuhuProviders ownerDocument={doc} visible={visible}>
						<div data-review-state={mode} className="h-full min-h-0 w-full min-w-0">
							{mode.startsWith('notifications') ? (
								<Inbox />
							) : mode === 'safe-settings' ? (
								<DesignScope className="h-full overflow-auto p-5">
									<Settings />
								</DesignScope>
							) : mode.startsWith('safe') ? (
								<SafePage
									service={safe.service}
									preferences={{
										viewMode: () => view,
										setViewMode: (next) => {
											view = next;
											render();
										},
										subscribe: () => () => {},
									}}
								/>
							) : (
								<HealthPage
									port={{
										scanner: mode === 'health-empty' ? emptyScanner : scanner,
										repairs,
										getReport: (id) =>
											mode === 'health-empty'
												? undefined
												: !id || scanner.snapshot.report?.id === id
													? scanner.snapshot.report
													: undefined,
										openNotifications: () => {
											mode = 'notifications';
											render();
										},
									}}
									section={section}
									reportId={reportId}
									navigate={(next, id) => {
										section = next;
										reportId = id;
										render();
									}}
								/>
							)}
						</div>
					</HuhuProviders>,
				),
			);
		}
		render();
		return {
			host,
			safe,
			notifications,
			scanner,
			repairs,
			opened,
			get commits() {
				return commits;
			},
			async show(next: string) {
				held = false;
				releaseScan?.();
				scanner.cancel();
				mode = next;
				if (next === 'health-repair') commits = 0;
				if (next === 'notifications')
					await notifications.send({
						id: `review-session-${++seq}`,
						title: 'New system event',
						body: 'Production delivery receipt',
						channels: ['in-app'],
					});
				reportId = undefined;
				section = next === 'health-repair' ? 'repair' : 'scan';
				if (next.startsWith('safe')) {
					safe.service.lock();
					safe.files.clear();
					for (const [path, value] of initialFiles) safe.files.set(path, value);
					if (next === 'safe-create') safe.files.clear();
					if (next === 'safe-corrupt') safe.files.set('vault.enc', '{corrupt test ciphertext}');
					await safe.service.probe();
					if (
						[
							'safe-unlocked',
							'safe-empty',
							'safe-detail',
							'safe-new',
							'safe-quick',
							'safe-import',
							'safe-restore',
							'safe-password',
						].includes(next)
					) {
						await safe.service.unlock(QUICK_PICK_MASTER);
						if (next === 'safe-empty')
							for (const entry of [...safe.service.store.getState().entries])
								await safe.service.trashEntry(entry);
					}
				}
				if (['health-results', 'health-repair', 'health-stale'].includes(next)) {
					const result = await scanner.scan();
					reportId = result.id;
					if (next === 'health-stale') scanner.invalidate();
				}
				if (next === 'health-scanning') {
					held = true;
					void scanner.scan().catch(() => {});
				}
				render();
			},
			render,
			setPending(value: boolean) {
				delay = value;
			},
			release() {
				delay = false;
				pending?.();
				pending = undefined;
			},
			setFail(value: boolean) {
				fail = value;
			},
			hide(value: boolean) {
				visible = !value;
				render();
			},
			async dispose() {
				delay = false;
				pending?.();
				releaseScan?.();
				flushSync(() => root.unmount());
				safe.dispose();
				repairs.dispose();
				await scanner.dispose();
				await emptyScanner.dispose();
				await notifications.shutdown();
				host.remove();
			},
		};
	}
	for (const [name, doc] of Object.entries(docs)) owners[name] = await mount(doc);
	Object.assign(globalThis, {
		uiReview: {
			docs,
			owners,
			states,
			text: t,
			show: (name: string, state: string) => owners[name]!.show(state),
			async configure(sample: Record<string, unknown>) { setLanguage(sample.language === 'zh' ? 'zh' : 'en'); await fixtureTheme.configure(sample); for(const owner of Object.values(owners)) owner.render(); },
			dispose: async () => {await Promise.all(Object.values(owners).map((owner) => owner.dispose()));await fixtureTheme.dispose();},
		},
	});
}
Object.assign(globalThis, { uiReviewStartup: bootstrap() });
