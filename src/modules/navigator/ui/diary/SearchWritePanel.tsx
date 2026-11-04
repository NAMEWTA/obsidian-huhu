// Interaction adapted from yeshimei/bz d76a0870329403247917a00c43019e203a2560a4 (MIT), src/diary/ui.ts: search and book writing.
// Copyright (c) 2026 叫我包仔. Changes: React/HUHU controls, scoped search coverage, periodic identity and guarded append; no upstream storage or decoration.
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useStore } from 'zustand';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../../../../ui/components/alert-dialog';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Textarea } from '../../../../ui/components/textarea';
import { Label } from '../../../../ui/components/label';
import { useOwnerWindow, useT } from '../../../../ui/react/hooks';
import { useVisible } from '../../../../ui/react/contexts';
import { publishFeedback } from '../../../../host/obsidian/feedback';
import { DocumentMutationError } from '../../../../shared/storage/document-mutation';
import { diaryDate, type DiaryDraft, type DiarySaveResult, type DiaryWriting } from '../../services/diary-writing';
import type { DiarySearch, DiarySearchEntry } from '../../services/diary-search';
import type { DiaryPort } from './types';

export function SearchWritePanel({ search, writing, port, date, loaded, onBack, onSelect, onSaved, registerGuard }: {
	search: DiarySearch; writing: DiaryWriting; port: DiaryPort; date: string; loaded: readonly DiarySearchEntry[];
	onBack: () => void; onSelect: (date: string) => void; onSaved?: (date: string) => void; registerGuard?: (guard: () => Promise<boolean>) => () => void;
}) {
	const t = useT(), win = useOwnerWindow(), visible = useVisible(), id = useId();
	const scan = useStore(search.store);
	const [loadedSnapshot] = useState(loaded), [loadedRevision] = useState(search.revision);
	const [element, setElement] = useState<HTMLElement | null>(null), [narrow, setNarrow] = useState(true), [compact, setCompact] = useState(false);
	useEffect(() => {
		if (!element) return;
		const measure = () => { const width = element.getBoundingClientRect().width; setNarrow(width < 600); setCompact(width < 300); }; measure();
		const observer = new (win as Window & { ResizeObserver: typeof ResizeObserver }).ResizeObserver(measure); observer.observe(element);
		return () => observer.disconnect();
	}, [element, win]);
	const [query, setQuery] = useState(''), [from, setFrom] = useState(`${date.slice(0, 4)}-01-01`), [to, setTo] = useState(`${date.slice(0, 4)}-12-31`);
	const [editing, setEditing] = useState(false), [writeDate, setWriteDate] = useState(date), [text, setText] = useState('');
	const [draft, setDraft] = useState<DiaryDraft>(), [status, setStatus] = useState<DiarySaveResult['status'] | 'editing' | 'saving' | 'loading'>('editing');
	const [refresh, setRefresh] = useState(0), [confirm, setConfirm] = useState(false);
	const busy = useRef(false), composing = useRef(false), request = useRef<AbortController | null>(null);
	const pendingLeave = useRef<((accepted: boolean) => void) | null>(null);
	const dirty = editing && !!text.trim() && status !== 'saved';
	useEffect(() => registerGuard?.(() => {
		if (busy.current) return Promise.resolve(false);
		if (!dirty) return Promise.resolve(true);
		pendingLeave.current?.(false); setConfirm(true);
		return new Promise<boolean>(resolve => { pendingLeave.current = resolve; });
	}), [dirty, registerGuard]);
	useEffect(() => () => { pendingLeave.current?.(false); }, []);
	useEffect(() => { if (!visible) { search.cancel(); request.current?.abort(); } return () => { search.cancel(); request.current?.abort(); }; }, [search, visible]);
	useEffect(() => {
		if (!editing) return;
		let active = true; setDraft(undefined); setStatus('loading');
		void writing.begin(writeDate).then(value => { if (active) { setDraft(value); setStatus('editing'); } }, error => { if (active) setStatus(error instanceof DocumentMutationError ? 'conflict' : 'unavailable'); });
		return () => { active = false; };
	}, [editing, writeDate, refresh, writing]);
	const leave = () => { if (busy.current) return; if (dirty) setConfirm(true); else onBack(); };
	const save = async () => {
		if (busy.current || composing.current || !draft || !text.trim() || status === 'saved') return;
		busy.current = true; const controller = new AbortController(); request.current = controller; setStatus('saving');
		try {
			const result = await writing.save(draft, text, controller.signal);
			if (controller.signal.aborted) { setStatus(result.status === 'saved' ? 'saved' : 'cancelled'); return; }
			setStatus(result.status);
			if (result.status === 'saved') onSaved?.(draft.date);
			publishFeedback(win, result.status === 'saved' ? { source: 'navigator.diary', operationId: result.operationId, message: { key: 'navigator.diary.write.saved' }, outcome: 'success', receipt: { committed: true } } : { source: 'navigator.diary', operationId: crypto.randomUUID(), message: { key: `navigator.diary.write.${result.status}` }, outcome: result.status === 'cancelled' ? 'cancelled' : 'failed' });
		} catch { setStatus('failed'); publishFeedback(win, { source: 'navigator.diary', operationId: crypto.randomUUID(), message: { key: 'navigator.diary.write.failed' }, outcome: 'failed' }); }
		finally { busy.current = false; request.current = null; }
	};
	const openOriginal = async () => {
		if (!draft || draft.date !== writeDate) return;
		try {
			const date = diaryDate(draft.date), current = port.periodic.inspect('day', date);
			if (current.status !== 'existing' || current.path !== draft.expected.path || !await port.periodic.open('day', date, { create: false })) setStatus('conflict');
		} catch { setStatus('failed'); }
	};
	return <section ref={setElement} style={narrow ? { '--nd-hit-size': '44px' } as CSSProperties : undefined} data-diary-tools className={compact ? 'min-w-0 space-y-4 py-4' : narrow ? 'min-w-0 space-y-4 p-4' : 'min-w-0 space-y-4 p-6'} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={event => {
		if (event.nativeEvent.isComposing || composing.current) return;
		if (editing && (event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void save(); }
		if (!confirm && event.key === 'Escape') { event.preventDefault(); leave(); }
	}}>
		<header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">{t('navigator.diary.tools.title')}</h1><Button variant="outline" onClick={leave} disabled={status === 'saving'}>{t('navigator.diary.tools.back')}</Button></header>
		{!editing ? <>
			<form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); if (!composing.current) search.loaded(query, loadedSnapshot, loadedRevision); }}>
				<div className="min-w-0 flex-1 space-y-1"><Label htmlFor={`${id}-query`}>{t('navigator.diary.search.query')}</Label><Input id={`${id}-query`} value={query} onChange={event => { setQuery(event.target.value); search.loaded(event.target.value, loadedSnapshot, loadedRevision); }} /></div>
				<Button type="submit">{t('navigator.diary.search.loadedAction')}</Button><Button type="button" variant="outline" onClick={() => setEditing(true)}>{t('navigator.diary.write.action')}</Button>
			</form>
			<div className="flex flex-wrap items-end gap-2"><div className="min-w-0 max-w-full space-y-1"><Label htmlFor={`${id}-from`}>{t('navigator.diary.search.from')}</Label><Input id={`${id}-from`} type="date" value={from} onChange={event => { setFrom(event.target.value); search.cancel(); }} /></div><div className="min-w-0 max-w-full space-y-1"><Label htmlFor={`${id}-to`}>{t('navigator.diary.search.to')}</Label><Input id={`${id}-to`} type="date" value={to} onChange={event => { setTo(event.target.value); search.cancel(); }} /></div><Button variant="outline" disabled={!query.trim() || scan.status === 'indexing'} onClick={() => { void search.scan(query, from, to); }}>{t('navigator.diary.search.scan')}</Button>{scan.status === 'indexing' && <Button variant="ghost" onClick={search.cancel}>{t('navigator.diary.cancel')}</Button>}</div>
			<p role="status" className="rounded-lg bg-muted p-4 text-sm">{t(`navigator.diary.search.${scan.status}`, { from: scan.from || '—', to: scan.to || '—', scanned: scan.scanned, total: scan.total })}{scan.failed > 0 && <span> {t('navigator.diary.search.incomplete')}</span>}</p>
			{scan.status === 'complete' && scan.query.trim() && !scan.hits.length && <p>{t('navigator.diary.search.empty')}</p>}
			<div className="space-y-2">{scan.hits.slice(0, 50).map(hit => <Button key={hit.path} variant="outline" className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => { const current = port.periodic.inspect('day', diaryDate(hit.date)); if (current.status === 'existing' && current.path === hit.path) onSelect(hit.date); }}><span className="min-w-0 break-words">{hit.date} · {hit.text.slice(0, 120)}</span></Button>)}</div>
			{scan.hits.length > 50 && <p>{t('navigator.diary.search.limit', { total: scan.hits.length })}</p>}
		</> : <section className={compact ? 'min-w-0 rounded-xl bg-muted' : narrow ? 'min-w-0 rounded-xl bg-muted p-4' : 'min-w-0 rounded-xl bg-muted p-6'}><div className={compact ? 'min-w-0 space-y-4 rounded-xl border border-border bg-card py-4' : narrow ? 'min-w-0 space-y-4 rounded-xl border border-border bg-card p-4' : 'min-w-0 space-y-4 rounded-xl border border-border bg-card p-6'}>
			<Label htmlFor={`${id}-date`}>{t('navigator.diary.write.date')}</Label><Input id={`${id}-date`} type="date" value={writeDate} disabled={status === 'saving' || status === 'saved'} onChange={event => setWriteDate(event.target.value)} />
			<Label htmlFor={`${id}-text`}>{t('navigator.diary.write.text')}</Label><Textarea id={`${id}-text`} className="min-h-64" value={text} disabled={status === 'saving' || status === 'saved'} onChange={event => setText(event.target.value)} />
			<p role={['conflict', 'failed', 'unavailable'].includes(status) ? 'alert' : 'status'}>{t(`navigator.diary.write.${status}`)}</p>
			<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={status === 'saving'} onClick={leave}>{t('navigator.diary.write.discard')}</Button><Button variant="outline" disabled={!draft} onClick={() => { void openOriginal(); }}>{t('navigator.diary.open')}</Button><Button disabled={!draft || !text.trim() || status === 'saving' || status === 'saved'} onClick={() => { void save(); }}>{t('navigator.diary.write.save')}</Button>{['conflict', 'failed', 'unavailable', 'cancelled'].includes(status) && <Button variant="outline" onClick={() => setRefresh(value => value + 1)}>{t('navigator.diary.write.recheck')}</Button>}</div>
		</div></section>}
		<AlertDialog open={confirm && visible} onOpenChange={open => { setConfirm(open); if (!open) { pendingLeave.current?.(false); pendingLeave.current = null; } }}><AlertDialogContent style={narrow ? { '--nd-hit-size': '44px' } as CSSProperties : undefined}><AlertDialogTitle>{t('navigator.diary.write.unsaved')}</AlertDialogTitle><AlertDialogDescription>{t('navigator.diary.write.confirm')}</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>{t('navigator.diary.write.keep')}</AlertDialogCancel><AlertDialogAction onClick={() => { setText(''); setConfirm(false); const resolve = pendingLeave.current; pendingLeave.current = null; if (resolve) resolve(true); else onBack(); }}>{t('navigator.diary.write.confirmDiscard')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
	</section>;
}
