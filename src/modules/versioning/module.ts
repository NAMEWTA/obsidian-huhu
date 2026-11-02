import { FileSystemAdapter, MarkdownView, Notice, TFile } from 'obsidian';
import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { registerMessages, t } from '../../shared/i18n/index';
import { messages as commonStrings } from '../../shared/i18n/lazy/common';
import { VERSIONING_WORKBENCH, VERSION_HISTORY, NOTE_HISTORY_PANEL } from './api';
import { COMMENTS_DOCUMENT_CHANGES } from '../comments/api';
import { messages } from './i18n';
import { syncSettings } from './settings';
import type { Automatics } from './services/automatics';
import { describeReport } from './services/report';
import type { SyncService } from './services/sync-service';
import { syncWorkbench } from './services/workbench';
import { deviceId } from '../../host/obsidian/storage/device-id';
import { privateVaultStorage } from '../../host/obsidian/storage/private-storage';
import { HistoryQueryService } from './services/history-query';
import type { RestoreService } from './services/restore-service';
import type { NoteReviewService } from './services/note-review';
import type { NoteHistoryHost } from './services/history-host';
import type { AutomaticHistory } from './services/automatic-history';
import type { LocalHistoryStore } from './services/local-history-store';

registerMessages(commonStrings);
registerMessages(messages);

/**
 * Git sync module (desktop). Activation finds git and the repository and starts automatic sync; turning the
 * module off stops timers, cancels queued work and kills running git processes. Nothing here prompts on unload.
 */
export default function createVersioningModule(context: ModuleContext): ModuleInstance {
	const { app, shell } = context;
	const settings = context.settings.bind('versioning', syncSettings);
	let service: SyncService | undefined;
	let automatics: Automatics | undefined;
	let restores: RestoreService | undefined;
	let reviews: NoteReviewService | undefined;
	let localHistory: LocalHistoryStore | undefined;
	let automaticHistory: AutomaticHistory | undefined;
	let disposed = false;
	const queries = new HistoryQueryService(async () => {
		if (!service) throw new Error(t('sync.starting'));
		return service.versionAccess();
	}, () => localHistory);
	const listeners = new Set<() => void>();
	const changed = () => {
		for (const listener of [...listeners]) listener();
		shell.refresh();
	};
	const report = (error: unknown) => new Notice(error instanceof Error ? error.message : String(error));
	const syncPanel = syncWorkbench(
		() => service,
		(listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	);
	const workbench = { ...syncPanel, status: () => {
		const rows = [...syncPanel.status()];
		if (automaticHistory?.snapshot.phase === 'error') rows.push({ id: 'local-history', kind: 'error', label: t('versioning.localHistory.failed'), section: 'history' });
		return rows;
	} };
	const repoFolder = () =>
		settings
			.get()
			.repoSubPath.trim()
			.replace(/\\/g, '/')
			.replace(/^\/+|\/+$/g, '');
	const openSettings = () => void shell.open({ feature: 'settings', section: 'versioning' }).catch(report);
	const historyHost = (): NoteHistoryHost => {
		if (!service || !restores || !reviews) throw new Error(t('sync.starting'));
		return { documents: context.documents, queries, reviews, restores, sync: service, automaticHistory, openSettings };
	};
	const openHistory = async (ownerWindow?: Window) => {
		const owner =
			ownerWindow ??
			app.workspace.getActiveViewOfType(MarkdownView)?.containerEl.win ??
			app.workspace.getMostRecentLeaf()?.view.containerEl.win ??
			app.workspace.containerEl.win;
		let leaf = app.workspace
			.getLeavesOfType('huhu-comments-view')
			.find((candidate) => candidate.view.containerEl.win === owner);
		if (!leaf) {
			if (owner === app.workspace.containerEl.win) leaf = app.workspace.getRightLeaf(false) ?? undefined;
			else {
				// Obsidian's public getRightLeaf always targets the main window. Popouts use
				// a neighbouring pane anchored to the original note, preserving window ownership.
				const source = context.documents.current(owner);
				const anchor = source && context.documents.resolveLeaf(source.leafId);
				if (!anchor) throw new Error(t('versioning.source-closed'));
				leaf = app.workspace.createLeafBySplit(anchor, 'vertical');
			}
		}
		if (!leaf) return;
		await leaf.setViewState({ type: 'huhu-comments-view', active: true, state: { tab: 'history' } });
		if (leaf.view.containerEl.win !== owner) throw new Error(t('versioning.source-closed'));
		await app.workspace.revealLeaf(leaf);
	};
	const run = (work: (current: SyncService) => Promise<unknown>) => () => {
		if (!service) return void new Notice(t('sync.starting'));
		void work(service).catch(report);
	};
	/** The repository path of the active note, for the stage and unstage commands. */
	const activeRepoPath = (): string | null => {
		const file = app.workspace.getActiveFile();
		return file instanceof TFile ? (service?.snapshot.place?.toRepo(file.path) ?? null) : null;
	};

	return {
		services: [
			[VERSIONING_WORKBENCH, workbench],
			[VERSION_HISTORY, queries],
			[
				NOTE_HISTORY_PANEL,
				{
					mount(container: HTMLElement) {
						let closed = false,
							cleanup: (() => void) | undefined;
						void import('./ui/history/history-panel-page')
							.then(({ mountNoteHistoryPanel }) => {
								if (!closed && !disposed) cleanup = mountNoteHistoryPanel(container, historyHost());
							})
							.catch(report);
						return () => {
							closed = true;
							cleanup?.();
						};
					},
				},
			],
		],
		pages: {
			versioning: async () => {
				const { createSyncPage } = await import('./ui/workbench-page');
				return createSyncPage({
					service: () => service,
					queries: () => queries,
					repoFolder,
					openSettings,
					report,
				});
			},
			'revision-review': async () =>
				(await import('./ui/history/review-page')).createNoteReviewPage(historyHost()),
		},
		settingsPage: async () => (await import('./ui/settings-page')).syncSettingsPage(settings, () => service, app, () => automaticHistory),
		async activate() {
			const adapter = app.vault.adapter;
			if (!(adapter instanceof FileSystemAdapter)) throw new Error(t('sync.desktopOnly'));
			const [{ desktopGitHost }, { SyncService: Service }, { Automatics: Clock }, { syncDialogs }] =
				await Promise.all([
					import('./platform/desktop/host'),
					import('./services/sync-service'),
					import('./services/automatics'),
					import('./ui/dialog-factory'),
				]);
			const current = new Service({
				host: desktopGitHost(
					adapter.getBasePath(),
					deviceId(app),
					privateVaultStorage(app),
					app.vault.configDir,
				),
				settings,
				dialogs: syncDialogs(app),
				notify: (text, error) => void new Notice(text, error ? 10_000 : 5_000),
				describe: describeReport,
				restoreReview: {
					pending: () => restores?.pending() ?? [],
					confirm: async (receipts) =>
						(await import('./ui/history/restore-review-page')).confirmRestoreReview(app, receipts),
					acknowledge: async (ids) => {
						if (!restores || disposed) throw new Error('versioning.restore.closed');
						for (const id of ids) await restores.acknowledgePending(id);
					},
				},
			});
			service = current;
			const win = app.workspace.containerEl.win;
			const clock = new Clock(current, settings, win);
			automatics = clock;
			context.lifetime.register(current.subscribe(changed));
			context.lifetime.register(current.onDeviceChange(() => clock.schedule()));
			context.lifetime.register(settings.subscribe(() => clock.schedule()));
			const fileEvent = () => {
				if (current.writingFiles) return;
				clock.fileChanged();
				current.refreshSoon(win);
			};
			for (const name of ['modify', 'create', 'delete', 'rename'] as const)
				context.lifetime.registerEvent(app.vault.on(name as 'modify', fileEvent));
			await current.connect();
			const [
				{ RestoreService: Restores },
				{ CheckpointStore },
				{ createObsidianRestoreDocuments },
				{ NoteReviewService: Reviews },
			] = await Promise.all([
				import('./services/restore-service'),
				import('./services/checkpoint-store'),
				import('./platform/obsidian/restore-documents'),
				import('./services/note-review'),
			]);
			const recoveryStorage = privateVaultStorage(app), recoveryDevice = deviceId(app);
			const checkpoints = new CheckpointStore(recoveryStorage, recoveryDevice);
			restores = new Restores({
				documents: createObsidianRestoreDocuments(app, {
					lifetime: context.lifetime,
					resolveLeaf: (id) => context.documents.resolveLeaf(id),
					checkDrafts: (path, text) => context.documents.checkDrafts?.(path, text),
					allowPath: (path) => current.snapshot.place?.toRepo(path) != null,
				}),
				checkpoints,
				gate: current.restoreGate(),
				participant: () => context.services.peek(COMMENTS_DOCUMENT_CHANGES),
				assertHunkOrigin: origin => {
					const source = context.documents.get(origin.id);
					if (!source || source.path !== origin.path || source.leafId !== origin.leafId || source.generation !== origin.generation)
						throw new Error('versioning.restore.changed');
				},
			});
			await restores.initialize();
			if (current.ready && restores.pending().length) await restores.recoverPending().catch(report);
			reviews = new Reviews({
				documents: context.documents,
				queries,
				toRepo: (path) => current.snapshot.place?.toRepo(path) ?? null,
				captureTarget: async (source, signal) => {
					if (!current.ready || signal.aborted) return undefined;
					const target = await restores!.captureTarget(source.path, source.leafId);
					return signal.aborted ? undefined : target;
				},
				open: (id, owner) => shell.openFocus({ feature: 'revision-review', resourceId: id }, {}, owner),
			});
			const [{ LocalHistoryStore: HistoryStore }, { AutomaticHistory: HistoryClock }, { createHistoryCapture }, { assertLocalHistoryProtection }, { HistoryRetention }, { createRecoveryFiles }] = await Promise.all([
				import('./services/local-history-store'), import('./services/automatic-history'),
				import('./platform/obsidian/history-capture'), import('./platform/desktop/local-history-protection'),
				import('./services/history-retention'), import('./platform/desktop/recovery-files'),
			]);
			localHistory = new HistoryStore(recoveryStorage, recoveryDevice, undefined, checkpoints);
			const retention = new HistoryRetention(recoveryStorage, recoveryDevice, localHistory,
				createRecoveryFiles(adapter.getBasePath(), recoveryDevice), () => ({ days: settings.get().localHistoryRetentionDays,
					quotaBytes: settings.get().localHistoryQuotaMiB * 1024 * 1024 }));
			const captures = createHistoryCapture(app, () => settings.get().localHistoryEnabled);
			automaticHistory = new HistoryClock({ settings, history: localHistory, capture: captures.capture,
				timers: win, assertProtection: signal => assertLocalHistoryProtection(adapter.getBasePath(), settings.get().gitPath, signal),
				admit: (allocation, scope, signal) => retention.admit(allocation, scope, signal), maintain: signal => retention.collect(signal) });
			context.lifetime.register(automaticHistory.subscribe(changed));
			captures.attach(context.lifetime, automaticHistory, report);
			automaticHistory.start();
			context.lifetime.register(restores.subscribe(() => { void automaticHistory?.sample('important'); }));
			clock.start();

			const command = (id: string, nameKey: string, callback: () => void) =>
				context.commands.add({ id, name: t(nameKey), nameKey, callback });
			command('versioning-note-history', 'history.open', () => {
				void openHistory().catch(report);
			});
			context.lifetime.registerEvent(
				app.workspace.on('file-menu', (menu, file, _source, menuLeaf) => {
					const owner =
						menuLeaf?.getContainer().win ??
						app.workspace.getMostRecentLeaf()?.view.containerEl.win ??
						app.workspace.containerEl.win;
					if (file instanceof TFile && file.extension === 'md')
						menu.addItem((item) =>
							item
								.setTitle(t('history.open'))
								.setIcon('history')
								.onClick(() => {
									void (async () => {
										const source = context.documents.current(owner);
										const anchor = source && context.documents.resolveLeaf(source.leafId);
										if (anchor) app.workspace.setActiveLeaf(anchor, { focus: false });
										const leaf =
											app.workspace
												.getLeavesOfType('markdown')
												.find(
													(candidate) =>
														candidate.view instanceof MarkdownView &&
														candidate.view.file === file &&
														candidate.view.containerEl.win === owner,
												) ?? app.workspace.getLeaf('tab');
										await leaf.openFile(file);
										await app.workspace.revealLeaf(leaf);
										await openHistory(leaf.view.containerEl.win);
									})().catch(report);
								}),
						);
				}),
			);
			command(
				'sync-commit-and-sync',
				'sync.cmd.commitAndSync',
				run((s) => s.commitAndSync('all')),
			);
			command(
				'sync-commit-and-sync-staged',
				'sync.cmd.commitStagedAndSync',
				run((s) => s.commitAndSync('staged')),
			);
			command(
				'sync-commit',
				'sync.cmd.commit',
				run((s) => s.commit('smart')),
			);
			command(
				'sync-commit-staged',
				'sync.cmd.commitStaged',
				run((s) => s.commit('staged')),
			);
			command(
				'sync-commit-all',
				'sync.cmd.commitAll',
				run((s) => s.commit('all')),
			);
			command(
				'sync-pull',
				'sync.cmd.pull',
				run((s) => s.pull()),
			);
			command(
				'sync-push',
				'sync.cmd.push',
				run((s) => s.push()),
			);
			command(
				'sync-fetch',
				'sync.cmd.fetch',
				run((s) => s.fetch()),
			);
			command(
				'sync-pause-toggle',
				'sync.cmd.pause',
				run((s) =>
					s
						.setPaused(!s.snapshot.device.paused)
						.then(() => new Notice(s.snapshot.device.paused ? t('sync.paused') : t('sync.resumed'))),
				),
			);
			command(
				'sync-open',
				'sync.cmd.open',
				() => void shell.open({ feature: 'versioning', section: 'changes' }).catch(report),
			);
			context.commands.add({
				id: 'sync-stage-current-file',
				name: t('sync.cmd.stageCurrent'),
				nameKey: 'sync.cmd.stageCurrent',
				checkCallback: (checking) => {
					const path = activeRepoPath();
					if (!path || !service) return false;
					if (!checking) void service.stage([path]).catch(report);
					return true;
				},
			});
			context.commands.add({
				id: 'sync-unstage-current-file',
				name: t('sync.cmd.unstageCurrent'),
				nameKey: 'sync.cmd.unstageCurrent',
				checkCallback: (checking) => {
					const path = activeRepoPath();
					if (!path || !service) return false;
					if (!checking) void service.unstage([path]).catch(report);
					return true;
				},
			});
			const { conflictExtension } = await import('./ui/conflict-extension');
			context.editor.addExtension(conflictExtension());
		},
		async dispose() {
			disposed = true;
			const historyStopping = automaticHistory?.stop();
			automaticHistory = undefined;
			localHistory = undefined;
			automatics?.stop();
			automatics = undefined;
			reviews?.dispose();
			reviews = undefined;
			const restoresStopping = restores?.dispose();
			restores = undefined;
			const current = service;
			service = undefined;
			listeners.clear();
			const results = await Promise.allSettled([historyStopping, restoresStopping, current?.dispose()]);
			const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
			if (failures.length) throw new AggregateError(failures.map(result => result.reason as unknown), 'versioning cleanup failed');
		},
	};
}
