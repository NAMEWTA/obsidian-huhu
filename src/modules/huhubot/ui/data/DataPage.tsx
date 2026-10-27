import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Download, LoaderCircle, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../../../../ui/components/alert-dialog';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useT } from '../../../../ui/react/hooks';
import { registerMessages } from '../../../../shared/i18n';
import type { BotClient, CommandMeta, DeletionPreview, PortablePreview, ArtifactRef } from '../../api';
import { dataMessages } from '../../i18n/data';
import '../../styles/data.css';

registerMessages(dataMessages);

export interface BotDataHost {
	client: () => BotClient | undefined;
	report?: (error: unknown) => void;
}

type BusyAction = 'preview' | 'delete' | 'export' | 'importPreview' | 'import' | undefined;

function commandMeta(client: BotClient): CommandMeta {
	const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
	return { commandId: id, idempotencyKey: id, profileId: client.hello.profile.profileId, commandEpoch: client.hello.profile.commandEpoch };
}

function classifyUnknown(preview: DeletionPreview | undefined): boolean {
	return !!preview?.categories.some(category => category.kind === 'unknown-effects' && category.count > 0);
}

export function DataPage({ host }: { host: BotDataHost }) {
	const t = useT();
	const client = host.client();
	const [preview, setPreview] = useState<DeletionPreview>();
	const [previewError, setPreviewError] = useState<string>();
	const [busy, setBusy] = useState<BusyAction>();
	const [retainText, setRetainText] = useState('');
	const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
	const [receipt, setReceipt] = useState<string>();
	const [exportIds, setExportIds] = useState({ agents: '', sessions: '', memories: '' });
	const [artifact, setArtifact] = useState<ArtifactRef>({ artifactId: '', mediaType: 'application/json', size: '0' });
	const [exportedArtifact, setExportedArtifact] = useState<ArtifactRef>();
	const [portablePreview, setPortablePreview] = useState<PortablePreview>();
	const [resolutions, setResolutions] = useState<Record<string, 'keep' | 'replace' | 'copy'>>({});
	const [error, setError] = useState<string>();

	const loadPreview = useCallback(async () => {
		const current = host.client();
		if (!current) { setPreviewError(t('huhubot.data.offline')); return; }
		setBusy('preview');
		setPreviewError(undefined);
		setError(undefined);
		try {
			setPreview(await current.profile.deletePreview({ profileId: current.hello.profile.profileId }));
		} catch (cause) {
			setPreviewError(t('huhubot.data.previewFailed'));
			setError(t('huhubot.data.retryHint'));
			host.report?.(cause);
		} finally { setBusy(undefined); }
	}, [host, t]);

	useEffect(() => { void loadPreview(); }, [loadPreview]);

	const unknown = useMemo(() => classifyUnknown(preview), [preview]);
	const retainMemoryIds = useMemo(() => retainText.split(',').map(value => value.trim()).filter(Boolean).slice(0, 128), [retainText]);

	const deleteProfile = async () => {
		const current = host.client();
		if (!current || !preview || busy || unknown) return;
		setBusy('delete');
		setError(undefined);
		try {
			const result = await current.profile.delete({ ...commandMeta(current), previewToken: preview.token, retainMemoryIds });
			setReceipt(result.receiptId);
		} catch (cause) {
			setError(t('huhubot.data.deleteFailed'));
			host.report?.(cause);
		} finally { setBusy(undefined); }
	};

	const exportPortable = async () => {
		const current = host.client();
		if (!current || busy) return;
		setBusy('export');
		setError(undefined);
		try {
			const result = await current.portable.export({
				...commandMeta(current),
				agentIds: splitIds(exportIds.agents),
				sessionIds: splitIds(exportIds.sessions),
				memoryIds: splitIds(exportIds.memories),
			});
			setExportedArtifact(result.artifact);
			setArtifact(result.artifact);
		} catch (cause) {
			setError(t('huhubot.data.exportFailed'));
			host.report?.(cause);
		} finally { setBusy(undefined); }
	};

	const previewImport = async () => {
		const current = host.client();
		if (!current || busy || !artifact.artifactId.trim()) return;
		setBusy('importPreview');
		setError(undefined);
		try {
			const result = await current.portable.importPreview({ profileId: current.hello.profile.profileId, artifact: normalizeArtifact(artifact) });
			setPortablePreview(result);
			setResolutions({});
		} catch (cause) {
			setError(t('huhubot.data.importPreviewFailed'));
			host.report?.(cause);
		} finally { setBusy(undefined); }
	};

	const importPortable = async () => {
		const current = host.client();
		if (!current || busy || !portablePreview) return;
		setBusy('import');
		setError(undefined);
		try {
			const result = await current.portable.import({ ...commandMeta(current), previewToken: portablePreview.token, resolutions: portablePreview.conflicts.map(conflict => ({ id: conflict.id, action: resolutions[conflict.id] ?? 'copy' })) });
			setReceipt(result.receiptId);
		} catch (cause) {
			setError(t('huhubot.data.importFailed'));
			host.report?.(cause);
		} finally { setBusy(undefined); }
	};

	const unresolvedConflicts = portablePreview?.conflicts.some(conflict => !resolutions[conflict.id]) ?? false;

	if (!client) return <div className="flex h-full min-h-0 items-center justify-center p-6"><EmptyState icon={<AlertTriangle />} title={t('huhubot.data.title')} description={t('huhubot.data.offline')} /></div>;

	return <section className="huhu-bot-data flex h-full min-h-0 flex-col overflow-auto p-4 sm:p-6" aria-label={t('huhubot.data.title')}>
		<header className="flex flex-wrap items-start gap-3 border-b border-border pb-4"><div className="min-w-0 flex-1"><h1 className="m-0 text-base font-semibold">{t('huhubot.data.title')}</h1><p className="m-0 mt-1 text-xs text-muted-foreground">{t('huhubot.data.description')}</p></div><Button variant="outline" size="sm" onClick={() => void loadPreview()} disabled={!!busy}><RefreshCw className={busy === 'preview' ? 'animate-spin' : ''} aria-hidden />{t('huhubot.data.refresh')}</Button></header>
		{(error || previewError) && <p role="alert" className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{error ?? previewError}</p>}
		{receipt && <p role="status" className="mt-3 flex items-center gap-2 rounded-md border border-status-success/40 bg-status-success/5 p-3 text-xs text-status-success"><Check aria-hidden />{t('huhubot.data.receipt', { receipt })}</p>}
		<div className="mt-5 grid gap-5 @3xl:grid-cols-2">
			<section className="rounded-lg border border-border bg-card p-4" aria-labelledby="huhubot-data-delete-heading">
				<div className="flex items-start gap-3"><Trash2 className="mt-0.5 size-4 text-status-warning" aria-hidden /><div><h2 id="huhubot-data-delete-heading" className="m-0 text-sm font-semibold">{t('huhubot.data.deleteHeading')}</h2><p className="m-0 mt-1 text-xs text-muted-foreground">{t('huhubot.data.deleteDescription')}</p></div></div>
				{busy === 'preview' && <p role="status" className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="animate-spin" aria-hidden />{t('huhubot.data.loadingPreview')}</p>}
				{preview && <><dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-xs"><dt className="text-muted-foreground">{t('huhubot.data.previewToken')}</dt><dd className="m-0 break-all font-mono">{preview.token}</dd><dt className="text-muted-foreground">{t('huhubot.data.expires')}</dt><dd className="m-0">{preview.expiresAt}</dd></dl><ul className="mt-4 grid list-none gap-2 p-0">{preview.categories.map(category => <li key={category.kind} className="rounded-md border border-border/70 p-2 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{category.kind}</span><Badge variant={category.retained ? 'secondary' : category.count > 0 ? 'destructive' : 'outline'}>{category.count}</Badge></div><p className="m-0 mt-1 text-muted-foreground">{category.retained ? t('huhubot.data.retained') : category.reason ?? t('huhubot.data.willPurge')}</p></li>)}</ul><div className="mt-4 grid gap-2"><Label htmlFor="huhubot-data-retain">{t('huhubot.data.retainMemory')}</Label><Input id="huhubot-data-retain" value={retainText} onChange={event => setRetainText(event.currentTarget.value)} placeholder={t('huhubot.data.retainMemoryHint')} /><p className="m-0 text-[11px] text-muted-foreground">{t('huhubot.data.retainMemoryDescription')}</p></div>{unknown && <p role="alert" className="mt-3 rounded-md border border-status-warning/40 bg-status-warning/5 p-3 text-xs">{t('huhubot.data.unknownGate')}</p>}<AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}><AlertDialogTrigger asChild><Button className="mt-4" variant="destructive" disabled={!!busy || unknown || !preview}><Trash2 aria-hidden />{t('huhubot.data.delete')}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('huhubot.data.deleteConfirmTitle')}</AlertDialogTitle><AlertDialogDescription>{t('huhubot.data.deleteConfirmDescription', { token: preview.token, expires: preview.expiresAt })}</AlertDialogDescription></AlertDialogHeader><dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-xs"><dt className="text-muted-foreground">{t('huhubot.data.retainMemory')}</dt><dd className="m-0 break-all">{retainMemoryIds.length ? retainMemoryIds.join(', ') : t('huhubot.data.none')}</dd><dt className="text-muted-foreground">{t('huhubot.data.deleteScope')}</dt><dd className="m-0">{preview.categories.map(category => `${category.kind}: ${category.count}`).join(' · ')}</dd></dl><AlertDialogFooter><AlertDialogCancel>{t('huhubot.data.cancel')}</AlertDialogCancel><AlertDialogAction onClick={event => { event.preventDefault(); setDeleteConfirmationOpen(false); void deleteProfile(); }}>{t('huhubot.data.confirmDelete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>}
			</section>
			<section className="rounded-lg border border-border bg-card p-4" aria-labelledby="huhubot-data-portable-heading">
				<div className="flex items-start gap-3"><Download className="mt-0.5 size-4" aria-hidden /><div><h2 id="huhubot-data-portable-heading" className="m-0 text-sm font-semibold">{t('huhubot.data.portableHeading')}</h2><p className="m-0 mt-1 text-xs text-muted-foreground">{t('huhubot.data.portableDescription')}</p></div></div>
				<div className="mt-4 grid gap-3"><IdInput label={t('huhubot.data.agentIds')} value={exportIds.agents} onChange={value => setExportIds(current => ({ ...current, agents: value }))} /><IdInput label={t('huhubot.data.sessionIds')} value={exportIds.sessions} onChange={value => setExportIds(current => ({ ...current, sessions: value }))} /><IdInput label={t('huhubot.data.memoryIds')} value={exportIds.memories} onChange={value => setExportIds(current => ({ ...current, memories: value }))} /><Button variant="outline" onClick={() => void exportPortable()} disabled={!!busy}><Download aria-hidden />{busy === 'export' ? t('huhubot.data.working') : t('huhubot.data.export')}</Button>{exportedArtifact && <p role="status" className="m-0 break-all rounded-md border border-status-success/40 p-2 text-xs text-status-success">{t('huhubot.data.artifactReady', { id: exportedArtifact.artifactId })}</p>}</div>
			</section>
			<section className="rounded-lg border border-border bg-card p-4 @3xl:col-span-2" aria-labelledby="huhubot-data-import-heading">
				<div className="flex items-start gap-3"><Upload className="mt-0.5 size-4" aria-hidden /><div><h2 id="huhubot-data-import-heading" className="m-0 text-sm font-semibold">{t('huhubot.data.importHeading')}</h2><p className="m-0 mt-1 text-xs text-muted-foreground">{t('huhubot.data.importDescription')}</p></div></div>
				<div className="mt-4 grid gap-3 @3xl:grid-cols-3"><IdInput label={t('huhubot.data.artifactId')} value={artifact.artifactId} onChange={value => setArtifact(current => ({ ...current, artifactId: value }))} /><IdInput label={t('huhubot.data.mediaType')} value={artifact.mediaType} onChange={value => setArtifact(current => ({ ...current, mediaType: value }))} /><IdInput label={t('huhubot.data.artifactSize')} value={artifact.size} onChange={value => setArtifact(current => ({ ...current, size: value }))} /><Button variant="outline" onClick={() => void previewImport()} disabled={!!busy || !artifact.artifactId.trim()}><ShieldCheck aria-hidden />{busy === 'importPreview' ? t('huhubot.data.working') : t('huhubot.data.previewImport')}</Button></div>
				{portablePreview && <div className="mt-4 rounded-md border border-status-warning/40 bg-status-warning/5 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="m-0 text-xs font-medium">{t('huhubot.data.conflictHeading')}</p><Badge variant="secondary">{portablePreview.conflicts.length}</Badge></div><p className="m-0 mt-1 break-all text-[11px] text-muted-foreground">{t('huhubot.data.importToken', { token: portablePreview.token })}</p><p className="m-0 mt-2 text-xs text-muted-foreground">{t('huhubot.data.regrantDescription')}</p>{portablePreview.conflicts.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">{t('huhubot.data.noConflicts')}</p> : <ul className="mt-3 grid list-none gap-2 p-0">{portablePreview.conflicts.map(conflict => <li key={conflict.id} className="flex flex-wrap items-center gap-2 rounded border border-border/70 p-2 text-xs"><span className="min-w-0 flex-1 break-all">{conflict.id} · {t('huhubot.data.conflictRevision', { revision: conflict.revision })} · {conflict.hash}</span><select aria-label={t('huhubot.data.resolutionFor', { id: conflict.id })} value={resolutions[conflict.id] ?? ''} onChange={event => { const action = event.currentTarget.value as 'keep' | 'replace' | 'copy'; setResolutions(current => ({ ...current, [conflict.id]: action })); }}><option value="">{t('huhubot.data.chooseResolution')}</option><option value="keep">{t('huhubot.data.keep')}</option><option value="replace">{t('huhubot.data.replace')}</option><option value="copy">{t('huhubot.data.copy')}</option></select></li>)}</ul>}<Button className="mt-3" onClick={() => void importPortable()} disabled={!!busy || unresolvedConflicts}><Upload aria-hidden />{busy === 'import' ? t('huhubot.data.working') : t('huhubot.data.import')}</Button></div>}
			</section>
		</div>
	</section>;
}

function IdInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
	const id = `huhubot-data-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
	return <div className="grid gap-1"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} onChange={event => onChange(event.currentTarget.value)} placeholder="id-1, id-2" /></div>;
}

function splitIds(value: string): string[] {
	return value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 256);
}

function normalizeArtifact(value: ArtifactRef): ArtifactRef {
	return { artifactId: value.artifactId.trim(), mediaType: value.mediaType.trim() || 'application/json', size: value.size.trim() || '0' };
}
