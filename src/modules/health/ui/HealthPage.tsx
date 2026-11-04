// Interaction design adapted from https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/checkup/ui.ts
// Copyright (c) 2026 叫我包仔 (MIT). HUHU: workbench React, redacted reports, finite owner repair and explicit recovery.
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../ui/components/button';
import { Badge } from '../../../ui/components/badge';
import { Progress } from '../../../ui/components/progress';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '../../../ui/components/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogTrigger } from '../../../ui/components/alert-dialog';
import { useT, useOwnerWindow } from '../../../ui/react/hooks';
import { DesignScope } from '../../../ui/react/design-scope';
import { useVisible } from '../../../ui/react/contexts';
import { registerMessages } from '../../../shared/i18n';
import { messages as baseMessages } from '../i18n';
import { messages } from './messages';
import type { HealthRepairPlan, HealthRepairReceipt, HealthRepairResult, HealthRepairSelection, HealthIssue, HealthSection } from '../api';
import type { HealthPageProps } from './types';
registerMessages(baseMessages); registerMessages(messages);
const control = 'h-auto min-h-9 max-w-full whitespace-normal py-2 @max-[600px]:[--nd-hit-size:44px]';
const panel = 'min-w-0 space-y-4 rounded-[var(--ui-radius-panel)] border border-border bg-card p-4';
export function supportedRepairs(sections: readonly HealthSection[]): HealthRepairSelection[] {
	return sections.filter(section => section.complete && !['locked', 'unavailable', 'cancelled', 'incomplete'].includes(section.status)).flatMap<HealthRepairSelection>(section =>
		section.providerId === 'archives.integrity' && section.status === 'pass' && !section.issues.length ? [{ providerId: section.providerId, kind: 'rebuild-index' as const }] :
		section.providerId === 'archives.belongings' ? section.issues.filter(issue => issue.code === 'projection-mismatch' && issue.reference).map(issue => ({ providerId: section.providerId, kind: 'belonging-projection' as const, reference: issue.reference })) : []);
}
export function HealthPage({ port, section = 'scan', reportId, navigate }: HealthPageProps) {
	const t = useT(), win = useOwnerWindow(), visible = useVisible();
	const [snapshot, setSnapshot] = useState(() => port.scanner.snapshot);
	const [preview, setPreview] = useState<(HealthRepairPlan & { confirmation: string })>();
	const [activity, setActivity] = useState<'scan' | 'plan' | 'commit' | 'recover'>('scan');
	const [busy, setBusy] = useState(false), [error, setError] = useState(''), [cancelled, setCancelled] = useState(false);
	const [result, setResult] = useState<HealthRepairResult>();
	const [location, setLocation] = useState<{ provider: string; issue: HealthIssue }>();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [recovering, setRecovering] = useState<HealthRepairReceipt>();
	const [restored, setRestored] = useState<Record<string, HealthRepairReceipt>>({});
	const locationOrigin = useRef<{ button: HTMLButtonElement; route: string } | undefined>(undefined), recoveryOrigin = useRef<{ button: HTMLButtonElement; route: string } | undefined>(undefined);
	const route = useRef(''), previewRoute = useRef(''), shown = useRef(visible);
	route.current = `${section}:${reportId ?? ''}`; shown.current = visible;
	const admitted = useRef(false);
	const lifecycle = useRef({ alive: true, generation: 0, readOnly: false, controller: undefined as AbortController | undefined }).current;
	const report = reportId ? port.getReport(reportId) : snapshot.report;
	const results = result && result.reportId === report?.id ? [result] : port.repairs.results.filter(row => row.reportId === report?.id);
	const eligible = supportedRepairs(report?.sections ?? []), selections = eligible.slice(0, 100);
	useEffect(() => { lifecycle.alive = true; return () => { lifecycle.alive = false; lifecycle.generation++; if (lifecycle.readOnly) lifecycle.controller?.abort(); }; }, [lifecycle]);
	useEffect(() => { const refresh = () => setSnapshot(port.scanner.snapshot); const unsubscribe = port.scanner.subscribe(refresh); refresh(); return unsubscribe; }, [port.scanner]);
	useEffect(() => { if (!visible) return; const timer = win.setInterval(() => setSnapshot(port.scanner.snapshot), 30000); return () => win.clearInterval(timer); }, [port.scanner, visible, win]);
	useEffect(() => { lifecycle.generation++; setPreview(undefined); setConfirmOpen(false); setLocation(undefined); setRecovering(undefined); setError(''); setCancelled(false); }, [reportId, section, lifecycle]);
	useEffect(() => { if (!visible) { setConfirmOpen(false); setLocation(undefined); setRecovering(undefined); } }, [visible]);
	const run = async (work: (signal: AbortSignal) => Promise<void>, readOnly = false, action: typeof activity = readOnly ? 'plan' : 'commit') => {
		if (admitted.current) return;
		admitted.current = true; setActivity(action); lifecycle.readOnly = readOnly; lifecycle.controller = new AbortController(); setBusy(true); setError(''); setCancelled(false);
		try { await work(lifecycle.controller.signal); }
		catch { if (lifecycle.alive) { if (readOnly && lifecycle.controller.signal.aborted) setCancelled(true); else setError(t('health.page.error')); } }
		finally { admitted.current = false; if (lifecycle.alive) setBusy(false); }
	};
	const scan = () => { void run(async () => { const next = await port.scanner.scan(); if (lifecycle.alive) { setPreview(undefined); setResult(undefined); navigate('scan', next.id); } }, false, 'scan'); };
	const plan = () => { const revision = lifecycle.generation; void run(async signal => {
		if (!report || report.stale) return;
		const next = await port.repairs.plan(report.id, selections, signal);
		signal.throwIfAborted();
		if (lifecycle.alive && revision === lifecycle.generation) { previewRoute.current = route.current; setPreview(port.repairs.preview(next.id)); }
	}, true); };
	const commit = () => { const owned = preview, revision = lifecycle.generation; if (!lifecycle.alive || !shown.current || previewRoute.current !== route.current || !owned || port.scanner.snapshot.running || !port.getReport(owned.reportId) || port.getReport(owned.reportId)?.stale || report?.stale || owned.reportId !== report?.id) return; setConfirmOpen(false); void run(async signal => {
		const next = await port.repairs.confirm({ planId: owned.id, confirmation: owned.confirmation }, signal);
		if (lifecycle.alive && revision === lifecycle.generation) { setResult(next); setPreview(undefined); }
	}); };
	const recover = (action: 'resume' | 'rollback') => { const item = recovering; if (!lifecycle.alive || !shown.current || recoveryOrigin.current?.route !== route.current || !item?.recoveryId) return; setRecovering(undefined); void run(async signal => {
		const receipt = await port.repairs.recover({ providerId: 'archives.belongings', recoveryId: item.recoveryId!, action }, signal);
		if (lifecycle.alive) setRestored(previous => ({ ...previous, [item.operationId]: receipt }));
	}, false, 'recover'); };
	const restoreFocus = (event: { preventDefault(): void }, origin: typeof locationOrigin.current) => {
		event.preventDefault();
		if (lifecycle.alive && shown.current && origin?.route === route.current && origin.button.isConnected && !origin.button.disabled) origin.button.focus();
	};
	const counts = snapshot.running ? snapshot.progress?.sections ?? [] : report?.sections ?? [];
	const issueRows = (rows: readonly HealthSection[]) => rows.map(row => <section key={row.providerId} className={panel} aria-label={row.providerId}>
		<div className="flex min-w-0 flex-col items-start justify-between gap-2 @min-[400px]:flex-row"><div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{row.titleKey ? t(row.titleKey) : row.scope ? t(`health.page.scope.${row.scope}`) : row.providerId}</h3><p className="break-all font-mono text-xs text-muted-foreground">{row.providerId}</p></div><Badge variant="outline">{t(`health.${row.status}`)}</Badge></div>
		<p className="text-sm">{t('health.page.counts', { checked: row.checked, total: row.total ?? t('health.page.unknownTotal'), excluded: row.excluded })}</p>
		{row.issues.map((issue, index) => <div key={`${issue.reference ?? issue.code}-${index}`} data-health-issue className="flex min-w-0 flex-col items-start justify-between gap-3 @min-[600px]:flex-row border-t border-border pt-3">
			<div className="min-w-0 flex-1"><p className="font-medium">{t(`health.page.issue.${issue.code}`)} · {issue.count}</p>{!(row.providerId === 'archives.belongings' && issue.code === 'projection-mismatch' && issue.reference) && <p className="mt-1 text-sm text-muted-foreground">{t('health.page.unsupported')}</p>}</div>
			<div className="flex max-w-full flex-wrap gap-2">{row.providerId === 'archives.belongings' && issue.code === 'projection-mismatch' && issue.reference && <Button variant="outline" className={control} disabled={busy || snapshot.running || report?.stale} onClick={() => navigate('repair', report?.id)}>{t('health.page.previewRepair')}</Button>}
			<Button variant="outline" className={control} onClick={event => { locationOrigin.current = { button: event.currentTarget, route: route.current }; setLocation({ provider: row.providerId, issue }); }}>{t('health.page.location')}</Button></div>
		</div>)}
	</section>);
	return <DesignScope data-health-page data-page-id={section === 'repair' ? 'HEALTH-REPAIR' : 'HEALTH-SCAN'} className="@container mx-auto w-full min-w-0 max-w-6xl space-y-5 p-4 text-sm @min-[960px]:p-6 [&_p]:break-words">
		<header className="space-y-2"><h2 className="text-xl font-semibold">{t(section === 'repair' ? 'health.page.repairTab' : 'health.page.title')}</h2><p className="text-muted-foreground">{t('health.page.subtitle')}</p></header>
		<nav aria-label={t('health.page.title')} className="flex flex-wrap gap-2">
			{(['scan', 'repair'] as const).map(tab => <Button key={tab} className={control} variant={tab === section ? 'secondary' : 'ghost'} aria-current={tab === section ? 'page' : undefined} disabled={busy} onClick={() => navigate(tab, reportId)}>{t(tab === 'scan' ? 'health.page.scanTab' : 'health.page.repairTab')}</Button>)}
			<Button variant="ghost" className={control} onClick={() => port.openNotifications()}>{t('health.page.notifications')}</Button>
		</nav>
		{error && <p role="alert" className="rounded-[var(--ui-radius-panel)] border border-destructive p-4 text-destructive">{error}</p>}
		{reportId && !report && <p role="status" className={panel}>{t('health.page.expired')}</p>}
		{report?.stale && <p role="status" className="rounded-[var(--ui-radius-panel)] border border-border bg-muted p-4">{t('health.page.stale')}</p>}
		{snapshot.running && <section className={panel} aria-busy="true"><h3>{t('health.page.providers', { finished: snapshot.progress?.finishedProviders ?? 0, total: snapshot.progress?.totalProviders ?? 0 })}</h3><Progress aria-label={t('health.page.progress')} value={Math.floor(100 * (snapshot.progress?.finishedProviders ?? 0) / Math.max(1, snapshot.progress?.totalProviders ?? 0))} /><Button variant="outline" className={control} onClick={() => port.scanner.cancel()}>{t('health.page.cancelScan')}</Button></section>}
		{!report && !snapshot.running && <EmptyState title={t(reportId ? 'health.unavailable' : 'health.page.empty')} description={t('health.page.subtitle')} action={<Button className={control} disabled={busy} onClick={scan}>{t(reportId ? 'health.page.rescan' : 'health.page.start')}</Button>} />}
		{(report || snapshot.running) && <>
			<dl className="grid min-w-0 grid-cols-1 gap-3 @min-[400px]:grid-cols-2 @min-[960px]:grid-cols-4">
				{[[t('health.page.scope'), snapshot.running ? snapshot.progress?.totalProviders ?? 0 : counts.length], [t('health.page.checked'), counts.reduce((sum, row) => sum + row.checked, 0)], [t('health.page.excluded'), `${counts.reduce((sum, row) => sum + row.excluded, 0)} / ${counts.filter(row => row.status === 'locked').length}`], [t('health.page.time'), !snapshot.running && report ? new Date(report.finishedAt).toLocaleString() : '—']].map(([label, value]) => <div key={label} className={panel}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="m-0 min-w-0 break-words font-semibold tabular-nums">{value}</dd></div>)}
			</dl>
			{report && !snapshot.running && <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-3"><Badge variant="outline">{t(`health.${report.status}`)}</Badge><p>{t('health.page.notPassed')}</p><p>{t('health.page.unchecked', { count: report.sections.filter(row => !row.complete).length })}</p><p>{t('health.page.providers', { finished: report.sections.filter(row => row.complete).length, total: report.sections.length })}</p></div>}
			{section === 'scan' ? <section className="space-y-3" aria-label={t('health.page.results')}><h3 className="font-semibold">{t('health.page.results')}</h3>{issueRows(counts)}</section> : <>
				<section className={panel}><h3 className="font-semibold">{preview ? t('health.page.preview') : t('health.page.repairTab')}</h3><p>{t('health.page.planOrder')}</p>{eligible.length > 100 && <p>{t('health.page.batchLimit')}</p>}
					{preview ? preview.items.map(item => <div key={item.id} className="space-y-1 border-t border-border pt-3"><h4>{t(item.kind === 'rebuild-index' ? 'health.page.index' : 'health.page.projection')}</h4><p>{t('health.page.affected', { count: item.affected })}</p><p className="break-all font-mono text-xs text-muted-foreground">{item.id}</p></div>) : selections.length ? <>{selections.some(item => item.kind === 'rebuild-index') && <p>{t('health.page.index')} · {t('health.page.indexHelp')}</p>}{selections.some(item => item.kind === 'belonging-projection') && <p>{t('health.page.projection')} · {t('health.page.projectionHelp')}</p>}</> : <p>{t('health.page.noRepair')}</p>}
					{busy && <p role="status">{t(activity === 'scan' ? 'health.scanning' : activity === 'plan' ? 'health.page.planning' : activity === 'recover' ? 'health.page.recovering' : 'health.page.validating')}</p>}{cancelled && <p role="status">{t('health.page.cancelled')}</p>}
					<div className="flex flex-wrap gap-2">{!preview && report && !report.stale && selections.length > 0 && <Button className={control} disabled={busy || snapshot.running} onClick={plan}>{t('health.page.plan')}</Button>}
					{preview && <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogTrigger asChild><Button className={control} disabled={busy || snapshot.running || report?.stale}>{t('health.page.review')}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('health.page.confirm')}</AlertDialogTitle><AlertDialogDescription>{t('health.page.confirmText')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="h-auto min-h-11 max-w-full whitespace-normal [--nd-hit-size:44px]">{t('health.page.cancel')}</AlertDialogCancel><AlertDialogAction className="h-auto min-h-11 max-w-full whitespace-normal [--nd-hit-size:44px]" disabled={busy || snapshot.running || report?.stale} onClick={commit}>{t('health.page.confirm')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
					{(preview || busy && !snapshot.running) && <Button variant="outline" className={control} onClick={() => { if (busy) lifecycle.controller?.abort(); else { setPreview(undefined); setCancelled(true); } }}>{t('health.page.cancel')}</Button>}</div>
				</section>
				{results.map(batch => <section className={panel} key={batch.planId} aria-label={t(`health.page.batch.${batch.status}`)}><h3 className="font-semibold">{t(`health.page.batch.${batch.status}`)}</h3>{batch.items.map(original => { const item = restored[original.operationId] ?? original; return <div key={item.operationId} className="space-y-2 border-t border-border pt-3"><p>{t(item.kind === 'rebuild-index' ? 'health.page.index' : 'health.page.projection')}</p><p className="font-medium">{t(item.committed === 'unknown' ? 'health.page.unknownCommit' : item.committed === true ? 'health.page.committed' : 'health.page.notCommitted')} · {t(`health.page.receipt.${item.status}`)}</p><p>{t(item.rechecked ? 'health.page.rechecked' : 'health.page.notRechecked')}</p><p className="break-all font-mono text-xs text-muted-foreground">{item.operationId}</p>{item.recoveryId && <Button className={control} variant="outline" disabled={busy} onClick={event => { recoveryOrigin.current = { button: event.currentTarget, route: route.current }; setRecovering(item); }}>{t('health.page.recovery')}</Button>}</div>; })}</section>)}
				{issueRows((report?.sections ?? []).filter(row => row.issues.some(issue => issue.code !== 'projection-mismatch')))}
			</>}
			{!snapshot.running && <Button variant="outline" className={control} disabled={busy} onClick={scan}>{t('health.page.rescan')}</Button>}
		</>}
		<Dialog open={!!location} onOpenChange={open => { if (!open) setLocation(undefined); }}><DialogContent showCloseButton={false} onCloseAutoFocus={event => restoreFocus(event, locationOrigin.current)}><DialogHeader><DialogTitle>{t('health.page.locationTitle')}</DialogTitle><DialogDescription>{t('health.page.subtitle')}</DialogDescription></DialogHeader><p className="break-all font-mono text-xs">{location?.provider} · {location?.issue.reference ?? location?.issue.code}</p><p>{t(location?.provider === 'archives.belongings' && location.issue.code === 'projection-mismatch' ? 'health.page.projectionHelp' : 'health.page.unsupported')}</p><DialogClose asChild><Button variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal [--nd-hit-size:44px]">{t('ui.close')}</Button></DialogClose></DialogContent></Dialog>
		<AlertDialog open={!!recovering} onOpenChange={open => { if (!open) setRecovering(undefined); }}><AlertDialogContent onCloseAutoFocus={event => restoreFocus(event, recoveryOrigin.current)}><AlertDialogHeader><AlertDialogTitle>{t('health.page.recoveryTitle')}</AlertDialogTitle><AlertDialogDescription>{t('health.page.recoveryHelp')}</AlertDialogDescription></AlertDialogHeader><p className="break-all font-mono text-xs">{recovering?.recoveryId}</p><AlertDialogFooter><AlertDialogCancel className="h-auto min-h-11 max-w-full whitespace-normal [--nd-hit-size:44px]">{t('health.page.cancel')}</AlertDialogCancel><AlertDialogAction className="h-auto min-h-11 max-w-full whitespace-normal [--nd-hit-size:44px]" onClick={() => recover('resume')}>{t('health.page.resume')}</AlertDialogAction><AlertDialogAction className="h-auto min-h-11 max-w-full whitespace-normal [--nd-hit-size:44px]" onClick={() => recover('rollback')}>{t('health.page.restore')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
	</DesignScope>;
}
