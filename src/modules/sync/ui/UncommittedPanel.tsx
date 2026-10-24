import { type App } from 'obsidian';
import { useState } from 'react';
import { Check, CheckCheck, Ellipsis, Minus, Plus, RefreshCw } from 'lucide-react';
import { t } from '../../../shared/i18n/index';
import { Button } from '../../../ui/components/button';
import { Textarea } from '../../../ui/components/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../../ui/components/dropdown-menu';
import type { ChangeCode, FileChange } from '../core/status';
import type { ChangeRow } from '../core/change-tree';
import type { SyncService, SyncSnapshot } from '../services/sync-service';
import { confirmAction } from './dialogs';
import { ChangeList, type ChangeView } from './ChangeList';

const codeLabels: Record<ChangeCode, string> = { '.': '', M: 'M', A: 'A', D: 'D', R: 'R', C: 'C', T: 'T', U: 'U' };
const VIEW_KEY = 'huhu-sync-change-view';

function loadView(app: App): ChangeView {
	try {
		return app.loadLocalStorage?.(VIEW_KEY) === 'tree' ? 'tree' : 'flat';
	} catch {
		return 'flat';
	}
}

export interface UncommittedProps {
	app: App;
	service: SyncService;
	snapshot: SyncSnapshot;
	message: string;
	setMessage: (value: string) => void;
	report: (error: unknown) => void;
}

/** What the "Uncommitted changes" row opens: a stopped-operation banner, the commit box and the file list. */
export function UncommittedPanel({ app, service, snapshot, message, setMessage, report }: UncommittedProps) {
	const status = snapshot.status;
	const [draft, setDraft] = useState(message);
	const [view, setView] = useState<ChangeView>(() => loadView(app));
	const changeView = (next: ChangeView) => {
		setView(next);
		try {
			app.saveLocalStorage?.(VIEW_KEY, next);
		} catch {
			// The choice is a convenience; it just won't be remembered.
		}
	};
	if (!status) return null;
	const busy = !!snapshot.running && snapshot.running !== 'refresh';
	const blocked = !!snapshot.operation || status.conflicted.length > 0;
	const conflicts: ChangeRow[] = status.conflicted.map((change) => ({ kind: 'conflict', path: change.path, code: `${change.index}${change.worktree}` }));
	const staged: ChangeRow[] = status.staged.map((change) => ({ kind: 'staged', path: change.path, from: change.from, code: codeLabels[change.index] }));
	const changed: ChangeRow[] = [
		...status.unstaged.map((change: FileChange): ChangeRow => ({ kind: 'changed', path: change.path, from: change.from, code: codeLabels[change.worktree] })),
		...status.untracked.map((path): ChangeRow => ({ kind: 'untracked', path, code: 'U' })),
	];
	const typed = () => draft.trim() || undefined;
	const after = (promise: Promise<unknown>) =>
		void promise
			.then(() => {
				setDraft('');
				setMessage('');
			})
			.catch(report);
	const toVault = (path: string) => snapshot.place?.toVault(path) ?? null;
	const abort = async () => {
		if (await confirmAction(app, { title: t('sync.abortTitle'), message: t('sync.abortConfirm', { operation: t(`sync.operation.${snapshot.operation ?? 'merge'}`) }), action: t('sync.abort'), danger: true })) await service.abortOperation();
	};
	return (
		<div className="space-y-3 py-3">
			{blocked && (
				<section className="space-y-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
					<div>
						<strong>{snapshot.operation ? t('sync.operationStopped', { operation: t(`sync.operation.${snapshot.operation}`) }) : t('sync.conflictsOnly')}</strong>
						<p>{status.conflicted.length ? t('sync.conflictHelp', { count: status.conflicted.length }) : t('sync.continueHelp')}</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{snapshot.operation && (
							<Button size="sm" variant="default" disabled={busy || status.conflicted.length > 0} onClick={() => void service.continueOperation().catch(report)}>
								{t('sync.continue')}
							</Button>
						)}
						{snapshot.operation && (
							<Button size="sm" variant="destructive" disabled={busy} onClick={() => void abort().catch(report)}>
								{t('sync.abort')}
							</Button>
						)}
					</div>
				</section>
			)}
			<section className="space-y-2">
				<Textarea
					className="min-h-14 w-full resize-none appearance-none rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground shadow-xs outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed dark:bg-input/30"
					rows={2}
					value={draft}
					placeholder={t('sync.messagePlaceholder')}
					aria-label={t('sync.message')}
					onChange={(event) => {
						setDraft(event.currentTarget.value);
						setMessage(event.currentTarget.value);
					}}
					onKeyDown={(event) => {
						if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) {
							event.preventDefault();
							if (!busy && !blocked) after(service.commitAndSync('all', { message: typed() }));
						}
					}}
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Button size="sm" variant="default" disabled={busy || blocked} onClick={() => after(service.commitAndSync('all', { message: typed() }))}>
						<RefreshCw />
						{t('sync.commitAndSync')}
					</Button>
					<Button size="sm" disabled={busy || blocked} onClick={() => after(service.commit('smart', { message: typed() }))}>
						<Check />
						{t('sync.commit')}
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon-sm" aria-label={t('sync.moreCommit')} disabled={busy || blocked}>
								<Ellipsis />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onSelect={() => after(service.commit('staged', { message: typed() }))}>
								<Check />
								{t('sync.commitStaged')}
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => after(service.commit('all', { message: typed() }))}>
								<CheckCheck />
								{t('sync.commitAll')}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onSelect={() => after(service.commitAndSync('staged', { message: typed() }))}>
								<RefreshCw />
								{t('sync.commitStagedAndSync')}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onSelect={() => void service.stageAll().catch(report)}>
								<Plus />
								{t('sync.stageAll')}
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => void service.unstageAll().catch(report)}>
								<Minus />
								{t('sync.unstageAll')}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</section>
			{!conflicts.length && !staged.length && !changed.length && <p className="py-4 text-center text-sm text-muted-foreground">{t('sync.clean')}</p>}
			<ChangeList {...{ app, service, toVault, busy, view }} host={{ report }} onViewChange={changeView} conflicts={conflicts} staged={staged} changed={changed} />
		</div>
	);
}
