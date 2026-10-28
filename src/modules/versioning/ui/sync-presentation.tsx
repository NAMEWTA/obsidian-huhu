// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.
// Original: src/renderer/src/components/right-sidebar/source-control/commit/commit-message-composer.tsx; sync/git-history-row.tsx
// HUHU retains its Git service/actions and uses a 32px minimum target instead of Orca’s 26px history row.
import { moment, Notice, type App } from 'obsidian';
import { ReactSurface } from '../../../ui/react/surface';
import { useOwnerWindow } from '../../../ui/react/hooks';
import { onLanguageChanged, t } from '../../../shared/i18n/index';
import { Button } from '../../../ui/components/button';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../ui/components/collapsible';
import { GitBranch, Loader2, TriangleAlert } from 'lucide-react';
import { type NativeSurfaceContext } from '../../../ui/native-surface';
import { errorText, lastRunText } from '../services/report';
import type { RunReport } from '../services/sync-service';
import type { SyncService, SyncSnapshot } from '../services/sync-service';
import { askText, confirmAction } from './dialogs';
import { CloneRepository } from './CloneRepository';
import type { VersioningQueries } from '../core/history';
import { GitWorkbench, type WorkbenchMode } from './GitWorkbench';
import { SyncToolbar } from './SyncToolbar';

export interface SyncPageHost {
	service: () => SyncService | undefined;
	queries?: () => VersioningQueries | undefined;
	createWorker?: (ownerWindow: Window) => Worker;
	/** The vault folder that holds (or will hold) the repository: '' for the vault itself. */
	repoFolder: () => string;
	openSettings: () => void;
	report: (error: unknown) => void;
}

/** Repository actions surround a stable navigator and the shared source comparison. */
export class SyncPresentation extends ReactSurface {
	private message = '';
	/** Bumped when something asks for the uncommitted changes (a status bar click, the open command). */
	private changesRequests = 0;
	private mode: WorkbenchMode = 'changes';
	constructor(
		context: NativeSurfaceContext,
		private readonly host: SyncPageHost,
		mode: WorkbenchMode,
	) {
		super(context);
		this.mode = mode;
	}
	getViewType(): string {
		return 'huhu-sync-page';
	}
	getDisplayText(): string {
		return t('workbench.sync');
	}
	getIcon(): string {
		return 'git-branch';
	}
	onOpen(): Promise<void> {
		void super.onOpen();
		const service = this.host.service();
		if (service) this.register(service.subscribe(() => this.rerender()));
		this.register(onLanguageChanged(() => this.rerender()));
		this.rerender();
		void service?.refresh().catch(this.host.report);
		return Promise.resolve();
	}
	showChanges(): void {
		this.showMode('changes');
	}
	showMode(mode: WorkbenchMode): void {
		this.mode = mode;
		this.changesRequests++;
		this.rerender();
	}
	getState(): Record<string, unknown> {
		return { message: this.message, mode: this.mode };
	}
	setState(state: Record<string, unknown>): Promise<void> {
		if (typeof state.message === 'string') this.message = state.message;
		if (state.mode === 'changes' || state.mode === 'history' || state.mode === 'compare') this.mode = state.mode;
		this.rerender();
		return Promise.resolve();
	}
	protected renderContent() {
		const service = this.host.service();
		return service ? (
			<SyncPage
				app={this.app}
				service={service}
				snapshot={service.snapshot}
				openChanges={this.changesRequests}
				requestedMode={this.mode}
				onModeChange={(mode) => {
					this.mode = mode;
					this.context.changed?.();
				}}
				message={this.message}
				setMessage={(value) => {
					this.message = value;
					this.rerender();
				}}
				host={this.host}
			/>
		) : (
			<EmptyState icon={<GitBranch />} title={t('workbench.sync')} description={t('sync.starting')} />
		);
	}
	onClose(): Promise<void> {
		return super.onClose();
	}
}

interface PageProps {
	app: App;
	service: SyncService;
	snapshot: SyncSnapshot;
	/** Changes whenever the uncommitted changes should be opened. */
	openChanges?: number;
	requestedMode?: WorkbenchMode;
	onModeChange?: (mode: WorkbenchMode) => void;
	message: string;
	setMessage: (value: string) => void;
	host: SyncPageHost;
}

export function SyncPage(props: PageProps) {
	const { snapshot, host } = props;
	if (snapshot.phase === 'starting')
		return <EmptyState icon={<Loader2 />} title={t('workbench.sync')} description={t('sync.starting')} />;
	if (snapshot.phase === 'no-git')
		return (
			<EmptyState
				icon={<TriangleAlert />}
				title={t('sync.noGit')}
				description={t('sync.noGitHelp')}
				action={<Button onClick={() => host.openSettings()}>{t('sync.openSettings')}</Button>}
			/>
		);
	if (snapshot.phase === 'no-repo') return <NoRepository {...props} />;
	return <ReadyPage {...props} />;
}

function ReadyPage({
	app,
	service,
	snapshot,
	host,
	message,
	setMessage,
	openChanges = 0,
	requestedMode,
	onModeChange,
}: PageProps) {
	const ownerWindow = useOwnerWindow();
	return (
		<div className="flex h-full min-h-0 w-full flex-col">
			<SyncToolbar service={service} snapshot={snapshot} report={host.report} />
			<Notices app={app} service={service} snapshot={snapshot} />
			{snapshot.protection?.removed.length ? (
				<p role="status" className="m-0 border-b border-border px-3 py-2 text-xs text-muted-foreground">
					{t('sync.untrackedPrivate', {
						count: snapshot.protection.removed.length,
						path: snapshot.protection.recovery ?? '',
					})}
				</p>
			) : null}
			<GitWorkbench
				{...{ app, service, snapshot, message, setMessage, requestedMode, onModeChange }}
				requestId={openChanges}
				queries={host.queries?.()}
				createWorker={host.createWorker ? () => host.createWorker!(ownerWindow) : undefined}
				report={host.report}
			/>
		</div>
	);
}

function describeError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** The vault is not in a repository: what that means and how to start. */
function NoRepository({ app, service, snapshot, host }: PageProps) {
	const init = async () => {
		if (
			!(await confirmAction(app, {
				title: t('sync.initTitle'),
				message: t('sync.initConfirm', { path: snapshot.place?.cwd ?? '' }),
				action: t('sync.init'),
			}))
		)
			return;
		try {
			await service.init();
			new Notice(t('sync.initDone'));
		} catch (error) {
			host.report(error);
		}
	};
	return (
		<div className="mx-auto w-full max-w-3xl space-y-4 p-6">
			<EmptyState
				icon={<GitBranch />}
				title={t('sync.noRepo')}
				description={
					snapshot.error
						? errorText(snapshot.error.kind)
						: t(snapshot.place?.parentRoot ? 'sync.parentRepo' : 'sync.noRepoHelp', {
								path: snapshot.place?.cwd ?? '',
							})
				}
			/>
			<div className="flex flex-wrap items-center gap-2">
				<Button variant="default" disabled={!!snapshot.running || !snapshot.place} onClick={() => void init()}>
					<GitBranch />
					{t('sync.init')}
				</Button>
				<Button onClick={() => host.openSettings()}>{t('sync.openSettings')}</Button>
			</div>
			<CloneRepository app={app} service={service} snapshot={snapshot} report={host.report} />
		</div>
	);
}

/** The last run and anything that needs setting up first, in a strip under the toolbar. */
function Notices({ app, service, snapshot }: { app: App; service: SyncService; snapshot: SyncSnapshot }) {
	const busy = !!snapshot.running && snapshot.running !== 'refresh';
	const last = snapshot.last;
	const addRemote = async () => {
		const url = await askText(app, t('sync.addRemote'), t('sync.remoteUrl'), '', 'git@github.com:user/vault.git');
		if (url)
			await service
				.addRemote(snapshot.remotes.includes('origin') ? `remote${snapshot.remotes.length + 1}` : 'origin', url)
				.catch((error: unknown) => new Notice(describeError(error)));
	};
	const setIdentity = async () => {
		const name = await askText(app, t('sync.identity'), t('sync.identityName'), snapshot.identity.name);
		if (!name) return;
		const email = await askText(app, t('sync.identity'), t('sync.identityEmail'), snapshot.identity.email);
		if (email) await service.setIdentity(name, email).catch((error: unknown) => new Notice(describeError(error)));
	};
	const banner = 'flex flex-wrap items-center gap-2 rounded-md bg-muted px-2 py-1';
	return (
		<section className="shrink-0 space-y-1 border-b border-border px-3 py-1.5 text-xs" aria-live="polite">
			<div className={last && !last.ok && !busy ? 'text-destructive' : 'text-muted-foreground'}>
				{busy ? t('sync.status.running', { action: t(`sync.action.${snapshot.running!}`) }) : lastRunText(last)}
				{last && !busy && <span className="text-muted-foreground"> · {moment(last.at).fromNow()}</span>}
			</div>
			{last && !last.ok && !busy && <RawOutput raw={failureRaw(last)} />}
			{snapshot.device.paused && (
				<div className={banner}>
					{snapshot.device.paused === 'failures' ? t('sync.status.pausedFailures') : t('sync.paused')}
					<Button size="xs" onClick={() => void service.setPaused(false)}>
						{t('sync.resume')}
					</Button>
				</div>
			)}
			{snapshot.error && (
				<div className="space-y-1 rounded-md bg-destructive/10 px-2 py-1 text-destructive">
					<div>{errorText(snapshot.error.kind)}</div>
					<RawOutput raw={snapshot.error.raw ?? snapshot.error.detail} />
				</div>
			)}
			{snapshot.locked && <div className={banner}>{t('sync.error.locked')}</div>}
			{!snapshot.remotes.length && (
				<div className={banner}>
					{t('sync.noRemote')}
					<Button size="xs" onClick={() => void addRemote()}>
						{t('sync.addRemote')}
					</Button>
				</div>
			)}
			{(!snapshot.identity.name || !snapshot.identity.email) && (
				<div className={banner}>
					{t('sync.noIdentity')}
					<Button size="xs" onClick={() => void setIdentity()}>
						{t('sync.setIdentity')}
					</Button>
				</div>
			)}
		</section>
	);
}

/** git's own output for the first failed step (the notice and summary say what it means; this is the evidence). */
function failureRaw(report: RunReport): string {
	const error = report.steps.find((step) => step.error)?.error;
	return error?.raw ?? error?.detail ?? '';
}

/** Expandable raw git output. */
function RawOutput({ raw }: { raw: string }) {
	if (!raw.trim()) return null;
	return (
		<Collapsible>
			<CollapsibleTrigger className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline">
				{t('sync.rawOutput')}
			</CollapsibleTrigger>
			<CollapsibleContent>
				<pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-2 font-mono text-xs text-foreground">
					{raw}
				</pre>
			</CollapsibleContent>
		</Collapsible>
	);
}
