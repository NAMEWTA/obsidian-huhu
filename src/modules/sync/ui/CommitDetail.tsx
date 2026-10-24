import { moment, Notice, TFile, type App } from 'obsidian';
import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { t } from '../../../shared/i18n/index';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import type { CommitDetail as Detail, CommitFile } from '../core/repo';
import type { SyncService } from '../services/sync-service';
import { StatusLetter } from './ChangeList';
import { Diff } from './Diff';

/** What a click on a commit row opens below it: the message, author, parents and the files it changed. */
/** Mount with `key={hash}` so each commit starts from a clean state. */
export function CommitDetail({ app, service, hash, toVault, report, loaded, onParent }: { app: App; service: SyncService; hash: string; toVault: (path: string) => string | null; report: (error: unknown) => void; loaded: ReadonlySet<string>; onParent: (hash: string) => void }) {
	const [detail, setDetail] = useState<Detail | null>(null);
	const [files, setFiles] = useState<CommitFile[] | null>(null);
	const [open, setOpen] = useState('');
	useEffect(() => {
		let live = true;
		service.commitDetail(hash).then((value) => live && setDetail(value), () => live && setDetail(null));
		service.commitFiles(hash).then((value) => live && setFiles(value), () => live && setFiles([]));
		return () => {
			live = false;
		};
	}, [hash, service]);
	const openFile = (path: string) => {
		const vaultPath = toVault(path);
		const file = vaultPath ? app.vault.getAbstractFileByPath(vaultPath) : null;
		if (file instanceof TFile) void app.workspace.getLeaf('tab').openFile(file).catch(report);
		else new Notice(t('sync.notInVault'));
	};
	return (
		<div className="space-y-2 py-2 text-xs">
			{detail ? (
				<div className="space-y-1">
					<p className="whitespace-pre-wrap break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">{detail.message}</p>
					<p className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
						<span>
							{detail.author} &lt;{detail.email}&gt;
						</span>
						<span>{moment(detail.time * 1000).format('YYYY-MM-DD HH:mm:ss')}</span>
						<span className="font-mono">{detail.hash.slice(0, 12)}</span>
						{detail.parents.length > 0 && (
							<span>
								{t('sync.detail.parents')}:{' '}
								{detail.parents.map((parent) => (
									<button key={parent} type="button" disabled={!loaded.has(parent)} className="mr-1 inline cursor-pointer border-0 bg-transparent p-0 font-mono text-xs text-status-info shadow-none underline-offset-2 hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline" onClick={() => onParent(parent)}>
										{parent.slice(0, 7)}
									</button>
								))}
							</span>
						)}
					</p>
				</div>
			) : (
				<p className="text-muted-foreground">{t('sync.loading')}</p>
			)}
			{files && (
				<div>
					<p className="mb-1 text-muted-foreground">{t('sync.detail.files', { count: files.length })}</p>
					<ul className="m-0 max-h-72 list-none overflow-auto rounded-md p-0 border border-border bg-background scrollbar-sleek">
						{files.map((file) => {
							const slash = file.path.lastIndexOf('/');
							return (
								<li key={file.path} className="m-0 min-w-0 list-none border-b border-border p-0 last:border-b-0">
									<div className="group flex h-6 items-center gap-1 pr-1 hover:bg-accent/40 focus-within:bg-accent/40">
										<div
											role="button"
											tabIndex={0}
											onKeyDown={(event) => {
												if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
													event.preventDefault();
													setOpen(open === file.path ? '' : file.path);
												}
											}}
											className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 text-left outline-none focus-visible:ring-1 focus-visible:ring-ring"
											aria-expanded={open === file.path}
											onClick={() => setOpen(open === file.path ? '' : file.path)}
										>
											<StatusLetter code={file.status[0] ?? ''} />
											<span className="truncate">
												{file.path.slice(slash + 1)}
												{slash > 0 && <span className="ml-1.5 text-muted-foreground">{file.path.slice(0, slash)}</span>}
											</span>
										</div>
										{file.status[0] !== 'D' && (
											<ActionButton label={t('sync.openFile')} size="icon-xs" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => openFile(file.path)}>
												<ExternalLink />
											</ActionButton>
										)}
									</div>
									{open === file.path && <Diff service={service} path={file.path} commit={hash} />}
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</div>
	);
}
