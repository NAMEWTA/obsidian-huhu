import { useVisible } from '../../../../ui/react/contexts';
import { useEffect, useId, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { AlertTriangle, Download, RefreshCw, Trash2, Upload } from 'lucide-react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '../../../../ui/components/alert-dialog';
import { Button } from '../../../../ui/components/button';
import { Checkbox } from '../../../../ui/components/checkbox';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useT } from '../../../../ui/react/hooks';
import type { ArtifactRef, BotClient, MemoryNamespace } from '../../api';
import { DataClient } from '../../services/workbench/data-client';
import { commandMeta, type WorkbenchClient } from '../../services/workbench/workbench-client';
import { BotBackButton } from '../BotNavigation';
import { deletionCategoryLabel } from '../deletion-category';
import { ImportPreviewPanel } from './ImportPreviewPanel';
export interface BotDataHost {
	openTarget?: (section: string, id?: string) => void;
	client: () => BotClient | undefined;
	report?: (error: unknown) => void;
	workspace?: WorkbenchClient;
	exportArtifact?: (artifact: ArtifactRef, owner: HTMLElement) => Promise<boolean>;
	importArtifact?: (owner: HTMLElement) => Promise<ArtifactRef | undefined>;
	cleanupCompleted?: () => Promise<void>;
}
function toggle(previous: string[], id: string): string[] {
	return previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id];
}
export function DataPage({ host }: { host: BotDataHost }) {
	const visible = useVisible();
	const t = useT(),
		id = useId(),
		root = useRef<HTMLElement>(null);
	const [data] = useState(() => new DataClient(host.client, host.workspace)),
		state = useStore(data.store);
	const [selection, setSelection] = useState({
		agents: [] as string[],
		sessions: [] as string[],
		memories: [] as string[],
	});
	const [confirmation, setConfirmation] = useState(false),
		[exported, setExported] = useState(false);
	const [resolutions, setResolutions] = useState<Record<string, 'keep' | 'replace' | 'copy'>>({});
	const selectingFile = useRef(false);
	const [fileDialogOpen, setFileDialogOpen] = useState(false);
	useEffect(() => {
		if (visible) void data.initialize();
	}, [data, visible]);
	useEffect(() => () => data.dispose(), [data]);
	const unknown = state.preview?.categories.some(
		(category) => category.kind === 'unknown-effects' && category.count > 0,
	);
	const busy = !!state.busy;
	const restricted = !!(state.cleanup?.profile || state.cleanup?.sessionIds.length);
	const exportSelected = async () => {
		setExported(false);
		await data.run('export', async (client) => {
			const result = await client.portable.export({
				...commandMeta(client),
				agentIds: selection.agents,
				sessionIds: selection.sessions,
				memoryIds: selection.memories,
			});
			data.setArtifact(result.artifact);
			if (host.exportArtifact && root.current)
				setExported(await host.exportArtifact(result.artifact, root.current));
		});
	};
	const selectImport = async () => {
		if (!host.importArtifact || !root.current || busy || selectingFile.current) return;
		selectingFile.current = true;
		setFileDialogOpen(true);
		try {
			const artifact = await host.importArtifact(root.current);
			if (artifact) {
				setResolutions({});
				await data.previewImport(artifact);
			}
		} catch (cause) {
			host.report?.(cause);
			await data.run('importPreview', () =>
				Promise.reject(cause instanceof Error ? cause : new Error('IMPORT_FILE_FAILED')),
			);
		} finally {
			selectingFile.current = false;
			setFileDialogOpen(false);
		}
	};
	if (!host.client() || host.client()?.state === 'closed')
		return (
			<section className="flex h-full min-h-0 flex-col gap-3 p-4">
				<BotBackButton open={host.openTarget ? () => host.openTarget!('chat') : undefined} />
				<EmptyState
					icon={<AlertTriangle />}
					title={t('huhubot.data.title')}
					description={t('huhubot.data.offline')}
				/>
				<Button variant="outline" onClick={() => void data.initialize()}>
					{t('huhubot.common.refresh')}
				</Button>
			</section>
		);
	return (
		<section
			ref={root}
			className="huhu-bot-data flex h-full min-h-0 flex-col gap-4 overflow-auto p-4 @container"
			aria-label={t('huhubot.data.title')}
		>
			<header className="flex flex-wrap items-start gap-3 border-b border-border pb-3">
				<BotBackButton open={host.openTarget ? () => host.openTarget!('chat') : undefined} />
				<div className="order-last min-w-0 basis-full @min-[42rem]:order-none @min-[42rem]:flex-1 @min-[42rem]:basis-0">
					<h1 className="m-0 text-base font-semibold">{t('huhubot.data.title')}</h1>
					<p className="m-0 mt-1 text-xs text-muted-foreground">{t('huhubot.data.description')}</p>
				</div>
				<Button variant="outline" size="sm" onClick={() => void data.initialize()} disabled={busy}>
					<RefreshCw aria-hidden />
					{t('huhubot.data.refresh')}
				</Button>
			</header>
			{state.error && (
				<p role="alert" className="m-0 text-xs text-destructive">
					{t(
						state.error === 'IMPORT_PREVIEW_TOO_LARGE'
							? 'huhubot.data.previewTooLarge'
							: state.error === 'export'
								? 'huhubot.data.exportFailed'
								: state.error === 'import'
									? 'huhubot.data.importFailed'
									: state.error === 'importPreview'
										? 'huhubot.data.importPreviewFailed'
										: state.error === 'delete'
											? 'huhubot.data.deleteFailed'
											: 'huhubot.data.previewFailed',
					)}
					<Button size="sm" variant="link" onClick={() => void data.initialize()}>
						{t('huhubot.common.refresh')}
					</Button>
				</p>
			)}
			{state.receipt && (
				<p role="status" className="m-0 text-xs text-status-success">
					{t('huhubot.data.receipt', { receipt: state.receipt })}
				</p>
			)}
			{restricted && (
				<p role="status" className="m-0 text-sm text-status-warning">
					{t('huhubot.data.cleanupPending')}
				</p>
			)}
			{!restricted && state.importUncertain && !state.importPreview && (
				<div className="rounded border border-border p-3">
					<p role="status" className="text-xs text-status-warning">
						{t('huhubot.chat.startUncertain')}
					</p>
					<Button disabled={busy} onClick={() => void data.import([])}>
						{t('huhubot.chat.retryOriginal')}
					</Button>
					<Button disabled={busy} variant="outline" onClick={() => data.abandonImport()}>
						{t('huhubot.common.abandonRequest')}
					</Button>
				</div>
			)}
			{state.sessionCleanup?.map((job) => (
				<article key={job.id} className="rounded-lg border border-border p-4">
					<p className="break-all text-sm">{t('huhubot.data.sessionCleanup', { id: job.id })}</p>
					<Button
						disabled={busy}
						onClick={() =>
							void data.retrySessionCleanup(job.id).then(async (done) => {
								if (done) {
									try {
										await host.cleanupCompleted?.();
										await data.initialize();
									} catch (error) {
										host.report?.(error);
									}
								}
							})
						}
					>
						{t('huhubot.data.retryCleanup')}
					</Button>
				</article>
			))}
			<div className="grid gap-4 @min-[960px]:grid-cols-2">
				<article className="rounded-lg border border-border p-4">
					<h2 className="m-0 text-sm font-semibold">{t('huhubot.data.deleteHeading')}</h2>
					<p className="text-xs text-muted-foreground">{t('huhubot.data.deleteDescription')}</p>
					{state.busy === 'preview' && (
						<p role="status" className="text-xs">
							{t('huhubot.data.loadingPreview')}
						</p>
					)}
					{state.preview && (
						<>
							<p className="break-all text-xs text-muted-foreground">
								{t('huhubot.data.previewToken')}: <code>{state.preview.token}</code> ·{' '}
								{state.preview.expiresAt}
							</p>
							<ul className="m-0 grid list-none gap-2 p-0">
								{state.preview.categories.map((category) => (
									<li key={category.kind} className="rounded border border-border p-2 text-xs">
										{deletionCategoryLabel(category.kind)}: {category.count} ·{' '}
										{category.retained ? t('huhubot.data.retained') : t('huhubot.data.willPurge')}
									</li>
								))}
							</ul>
							{unknown && (
								<p role="alert" className="text-xs text-status-warning">
									{t('huhubot.data.unknownGate')}
								</p>
							)}
							<Button
								variant="destructive"
								className="mt-4"
								disabled={busy || unknown}
								onClick={() => setConfirmation(true)}
							>
								<Trash2 aria-hidden />
								{t('huhubot.data.delete')}
							</Button>
						</>
					)}
				</article>
				{!restricted && (
					<div className="grid gap-4">
						<article className="rounded-lg border border-border p-4">
							<h2 className="m-0 text-sm font-semibold">{t('huhubot.data.portableHeading')}</h2>
							<p className="text-xs text-muted-foreground">{t('huhubot.data.portableDescription')}</p>
							{(['agents', 'sessions', 'memories'] as const).map((kind) => (
								<fieldset key={kind} className="mb-3">
									<legend className="text-xs font-medium">
										{t(
											kind === 'agents'
												? 'huhubot.chat.roster'
												: kind === 'sessions'
													? 'huhubot.chat.sessions'
													: 'huhubot.memory.title',
										)}
									</legend>
									{kind === 'memories' && (
										<select
											aria-label={t('huhubot.memory.scopeSelect')}
											className="h-9 max-w-full rounded border border-input bg-background px-2 text-xs"
											disabled={busy}
											value={state.memoryNamespace ? JSON.stringify(state.memoryNamespace) : ''}
											onChange={(event) =>
												void data.loadMemories(
													JSON.parse(event.currentTarget.value) as MemoryNamespace,
												)
											}
										>
											<option
												value={JSON.stringify({
													kind: 'global',
													id: host.client()!.hello.profile.profileId,
												})}
											>
												{t('huhubot.memory.globalScope')}
											</option>
											{state.agents.map((agent) => (
												<option
													key={agent.id}
													value={JSON.stringify({ kind: 'agent', id: agent.id })}
												>
													{agent.name}
												</option>
											))}
										</select>
									)}
									<div className="max-h-48 overflow-auto">
										{(kind === 'agents'
											? state.agents.map((agent) => ({ id: agent.id, label: agent.name }))
											: kind === 'sessions'
												? state.sessions.map((session) => ({
														id: session.id,
														label: session.title,
													}))
												: state.memories
														.filter((memory) => memory.state === 'active')
														.map((memory) => ({
															id: memory.id,
															label:
																memory.state === 'active'
																	? memory.body.text
																	: memory.id,
														}))
										).map((choice) => (
											<label
												key={choice.id}
												htmlFor={`${id}-${choice.id}`}
												className="flex min-h-11 items-center gap-2 text-xs"
											>
												<Checkbox
													id={`${id}-${choice.id}`}
													checked={selection[kind].includes(choice.id)}
													onCheckedChange={() =>
														setSelection((previous) => ({
															...previous,
															[kind]: toggle(previous[kind], choice.id),
														}))
													}
												/>
												<span className="min-w-0 break-words">{choice.label}</span>
											</label>
										))}
									</div>
									{(kind === 'agents'
										? state.agentCursor
										: kind === 'sessions'
											? state.sessionCursor
											: state.memoryCursor) && (
										<Button
											size="sm"
											variant="outline"
											disabled={busy}
											onClick={() => {
												if (kind === 'memories' && state.memoryNamespace)
													void data.loadMemories(state.memoryNamespace, true);
												else if (kind !== 'memories') void data.loadMore(kind);
											}}
										>
											{t('huhubot.common.more')}
										</Button>
									)}
								</fieldset>
							))}
							<Button
								variant="outline"
								disabled={busy || !Object.values(selection).some((values) => values.length)}
								onClick={() => void exportSelected()}
							>
								<Download aria-hidden />
								{state.busy === 'export' ? t('huhubot.data.working') : t('huhubot.data.export')}
							</Button>
							{exported && (
								<p role="status" className="text-xs text-status-success">
									{t('huhubot.data.exportedFile')}
								</p>
							)}
						</article>
						<article className="rounded-lg border border-border p-4">
							<h2 className="m-0 text-sm font-semibold">{t('huhubot.data.importHeading')}</h2>
							<p className="text-xs text-muted-foreground">{t('huhubot.data.regrantDescription')}</p>
							<Button
								variant="outline"
								disabled={busy || fileDialogOpen || state.importUncertain || !host.importArtifact}
								onClick={() => void selectImport()}
							>
								<Upload aria-hidden />
								{t('huhubot.data.chooseImportFile')}
							</Button>
							{state.importPreview && (
								<ImportPreviewPanel
									preview={state.importPreview}
									resolutions={resolutions}
									busy={busy}
									uncertain={state.importUncertain}
									onResolution={(id, action) =>
										setResolutions((previous) => ({ ...previous, [id]: action }))
									}
									onConfirm={(choices) => {
										void data.import(choices);
									}}
									onAbandon={() => data.abandonImport()}
								/>
							)}
						</article>
					</div>
				)}
			</div>
			<AlertDialog open={visible && confirmation} onOpenChange={setConfirmation}>
				<AlertDialogContent
					onCloseAutoFocus={(event) => {
						if (!visible) event.preventDefault();
					}}
				>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('huhubot.data.deleteConfirmTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('huhubot.data.deleteConfirmDescription', {
								token: state.preview?.token ?? '',
								expires: state.preview?.expiresAt ?? '',
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<p className="break-all text-xs">
						{state.preview?.categories
							.map((category) => `${deletionCategoryLabel(category.kind)}: ${category.count}`)
							.join(' · ')}
					</p>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('huhubot.data.cancel')}</AlertDialogCancel>
						<AlertDialogAction
							disabled={busy || unknown || !state.preview}
							onClick={(event) => {
								event.preventDefault();
								setConfirmation(false);
								void data.deleteProfile().then((deleted) => {
									if (deleted) host.workspace?.resetProfile();
								});
							}}
						>
							{t('huhubot.data.confirmDelete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
