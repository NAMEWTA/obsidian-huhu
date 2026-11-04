// Interaction/layout adapted from yeshimei/bz d76a0870329403247917a00c43019e203a2560a4 (MIT), src/diary/render.ts: bookPanelHTML.
// Copyright (c) 2026 叫我包仔. Changes: React/HUHU tokens, periodic-note identity, bounded pages, accessible controls; no assets or writer.
import { registerMessages } from '../../../../shared/i18n';
import { messages } from './i18n';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { DesignScope } from '../../../../ui/react/design-scope';
import { useOwnerWindow, useT } from '../../../../ui/react/hooks';
import { useVisible } from '../../../../ui/react/contexts';
import { splitVolumes, volumeOf, monthSpans } from '../../core/diary-volumes';
import type { PeriodicNoteListEntry } from '../../api';
import type { DiarySearchEntry } from '../../services/diary-search';
import type { DiaryPort, TurnEngine } from './types';
import { loadTurnEngine } from './flip-engine';

registerMessages(messages);

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const localDate = (value: string): Date => { const date = new Date(2000, 0, 1); date.setFullYear(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10))); return date; };

export function DiaryReader({ port, initialDate, engineLoader = loadTurnEngine, onDateChange, actions, onLoaded }: { port: DiaryPort; initialDate?: string; engineLoader?: () => Promise<TurnEngine>; onDateChange?: (date: string) => void; actions?: ReactNode; onLoaded?: (entries: DiarySearchEntry[]) => void }) {
	const t = useT(), win = useOwnerWindow(), visible = useVisible();
	const inputId = useId();
	const root = useRef<HTMLDivElement>(null), overlay = useRef<HTMLDivElement>(null);
	const [element, setElement] = useState<HTMLDivElement | null>(null);
	const attachRoot = useCallback((node: HTMLDivElement | null) => { root.current = node; setElement(node); }, []);
	const transition = useRef<AbortController | null>(null);
	const [width, setWidth] = useState(0), [reduced, setReduced] = useState(false);
	const [selected, setSelected] = useState(initialDate ?? ''), [jump, setJump] = useState(initialDate ?? iso(new Date()));
	const [year, setYear] = useState(initialDate ? Number(initialDate.slice(0, 4)) : new Date().getFullYear());
	const [entries, setEntries] = useState<PeriodicNoteListEntry[]>([]), [loading, setLoading] = useState(true);
	const [error, setError] = useState(false), [retry, setRetry] = useState(0), [months, setMonths] = useState(false);
	const [fallback, setFallback] = useState(false), [turning, setTurning] = useState(false);
	const [paused, setPaused] = useState(false);
	const epoch = useRef(0), stale = useRef(false);
	const [revision, setRevision] = useState(0);
	const cache = useRef(new Map<string, string>());
	const [bodies, setBodies] = useState(new Map<string, string>()), [bodyError, setBodyError] = useState(false);
	const narrow = width < 600, step = narrow ? 1 : 2;
	const volumes = useMemo(() => splitVolumes(entries.map((entry) => entry.date), 50), [entries]);
	const index = entries.findIndex((entry) => entry.date === selected);
	const spans = useMemo(() => monthSpans(entries.map((entry) => entry.date), volumes), [entries, volumes]);
	const pages = index < 0 ? [] : entries.slice(index, index + step);
	const first = `${year}-01-01`, last = `${year}-12-31`;
	useEffect(() => { if (selected) onDateChange?.(selected); }, [selected, onDateChange]);
	useEffect(() => { onLoaded?.(entries.flatMap(entry => bodies.has(entry.path) ? [{ date: entry.date, path: entry.path, text: bodies.get(entry.path)! }] : [])); }, [entries, bodies, onLoaded]);

	useEffect(() => {
		if (!element) return;
		const measure = () => setWidth(element.getBoundingClientRect().width);
		measure();
		const observer = new (win as Window & { ResizeObserver: typeof ResizeObserver }).ResizeObserver(measure);
		observer.observe(element);
		const query = win.matchMedia('(prefers-reduced-motion: reduce)');
		const motion = () => setReduced(query.matches);
		motion(); query.addEventListener('change', motion);
		return () => { observer.disconnect(); query.removeEventListener('change', motion); };
	}, [win, element]);
	useEffect(() => { if (!visible || narrow || reduced) { transition.current?.abort(); transition.current = null; setTurning(false); } return () => transition.current?.abort(); }, [visible, narrow, reduced]);
	useEffect(() => (port.changes ?? (listener => port.periodic.subscribe(listener)))(() => {
		epoch.current++; stale.current = true;
		transition.current?.abort(); transition.current = null; setTurning(false);
		cache.current.clear(); setBodies(new Map()); setEntries([]);
		setLoading(true); setRevision(epoch.current);
	}), [port]);
	useEffect(() => {
		if (!visible || paused) return;
		let active = true;
		const generation = epoch.current;
		setLoading(true); setError(false);
		void port.periodic.list('day', localDate(first), localDate(last)).then((notes) => {
			if (!active || generation !== epoch.current) return;
			stale.current = false;
			const ordered = [...notes].sort((a, b) => b.date.localeCompare(a.date));
			setEntries(ordered);
			setSelected((previous) => previous || ordered[0]?.date || iso(new Date()));
		}, () => { if (active && generation === epoch.current) setError(true); }).finally(() => { if (active && generation === epoch.current) setLoading(false); });
		return () => { active = false; };
	}, [port, first, last, retry, visible, paused, revision]);
	useEffect(() => {
		if (!visible || index < 0 || stale.current) return;
		let active = true;
		const generation = epoch.current;
		setBodyError(false);
		const wanted = entries.slice(index, index + step + 2);
		const needed = new Set(wanted.map((entry) => entry.path));
		for (const path of cache.current.keys()) if (!needed.has(path)) cache.current.delete(path);
		setBodies(new Map(cache.current));
		void (async () => {
			for (const entry of wanted) {
				if (!active || generation !== epoch.current) return;
				if (cache.current.has(entry.path) && retry === 0) continue;
				try {
					const text = await port.read(entry.path);
					if (!active || generation !== epoch.current) return;
					cache.current.set(entry.path, text);
					setBodies(new Map(cache.current));
				} catch { if (active && generation === epoch.current && wanted.indexOf(entry) < step) setBodyError(true); }
			}
		})();
		return () => { active = false; };
	}, [entries, index, port, retry, step, visible, volumes]);

	const selectDate = (value: string) => {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
		const date = localDate(value);
		if (!Number.isFinite(date.getTime()) || iso(date) !== value) return;
		transition.current?.abort(); transition.current = null; setTurning(false);
		setSelected(value); setJump(value); setYear(date.getFullYear());
	};
	const go = async (direction: number) => {
		if (transition.current || stale.current || loading || !visible || !entries.length) return;
		const next = index < 0 ? 0 : Math.max(0, Math.min(entries.length - 1, index + direction * step));
		if (next === index) return;
		const controller = new AbortController(); transition.current = controller; setTurning(true);
		try {
			if (!narrow && !reduced && !fallback && overlay.current) {
				try {
					const engine = await engineLoader();
					if (!controller.signal.aborted && overlay.current) await engine.turn(overlay.current, [...root.current!.querySelectorAll<HTMLElement>('[data-diary-page]')], direction < 0, controller.signal);
				} catch { if (!controller.signal.aborted) setFallback(true); }
			}
			if (!controller.signal.aborted) { setSelected(entries[next]!.date); setJump(entries[next]!.date); }
		} finally { if (transition.current === controller) { transition.current = null; setTurning(false); } }
	};
	const open = () => {
		const entry = entries[index], current = port.periodic.inspect('day', localDate(selected));
		if (stale.current || loading || !entry || current.status !== 'existing' || current.path !== entry.path) return;
		void port.periodic.open('day', localDate(selected), { create: false }).then((opened) => { if (!opened) setBodyError(true); }, () => setBodyError(true)); };
	const actionClass = 'min-h-9 @max-[600px]:min-h-11';
	return <DesignScope className="h-full min-w-0 overflow-auto bg-background text-foreground">
		<div ref={attachRoot} style={narrow ? { '--nd-hit-size': '44px' } as CSSProperties : undefined} data-diary-reader data-layout={narrow ? 'single' : 'double'} className="@container min-w-0 space-y-5 p-6 @max-[600px]:p-4" onKeyDown={(event) => {
			if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return;
			if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); void go(event.key === 'ArrowRight' ? 1 : -1); }
		}}>
			<header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="m-0 text-xl font-semibold">{t('navigator.diary.title')}</h1><p className="mt-2 text-sm text-muted-foreground">{t('navigator.diary.subtitle')}</p></div><span className="text-xs text-muted-foreground">{t('navigator.diary.volume', { volume: Math.max(1, volumeOf(volumes, index)), total: Math.max(1, volumes.length) })}</span>{actions}</header>
			{!visible ? <EmptyState title={t('navigator.diary.hidden')} description={t('navigator.diary.hiddenDetail')} /> : <>
				<form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); selectDate(jump); }}>
					<Button className={actionClass} type="button" variant="outline" aria-expanded={months} onClick={() => setMonths(!months)}>{t('navigator.diary.months')}</Button>
					<div className="min-w-0 space-y-1"><Label htmlFor={inputId}>{t('navigator.diary.date')}</Label><Input id={inputId} type="date" required value={jump} onChange={(event) => setJump(event.target.value)} /></div>
					<Button className={actionClass} type="submit">{t('navigator.diary.go')}</Button>
					<Button className={actionClass} type="button" variant="outline" disabled={index < 0 || loading} onClick={open}>{t('navigator.diary.open')}</Button>
					<Button className={actionClass} type="button" variant="ghost" onClick={() => { setPaused(false); setRetry(retry + 1); }}>{t('navigator.diary.retry')}</Button>
				</form>
				<p className="text-xs text-muted-foreground">{t('navigator.diary.range', { from: first, to: last })}</p>
				{months && <nav aria-label={t('navigator.diary.months')} className="flex flex-wrap gap-2">{spans.map((span) => <Button key={span.key} className={actionClass} variant="outline" aria-pressed={selected.startsWith(span.key)} onClick={() => selectDate(entries[span.first]!.date)}>{span.key}</Button>)}</nav>}
				{error && <div role="alert" className="rounded-lg border border-border bg-muted p-4 text-sm">{t('navigator.diary.error')}</div>}
				{bodyError && <div role="alert" className="rounded-lg border border-border bg-muted p-4 text-sm">{t('navigator.diary.readError')}</div>}
				{fallback && <p role="status" className="rounded-lg border border-border bg-muted p-4 text-sm">{t('navigator.diary.fallbackDetail')}</p>}
				{loading && <div role="status" aria-busy="true" className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-6 text-sm">{t('navigator.diary.loading')}<Button variant="outline" className={actionClass} onClick={() => { setPaused(true); setLoading(false); }}>{t('navigator.diary.cancel')}</Button></div>}
				{paused && <p role="status">{t('navigator.diary.hidden')}</p>}
				<section aria-label={t('navigator.diary.pages')} aria-busy={turning} className="relative rounded-xl bg-muted p-8 @max-[600px]:p-3">
					<div data-diary-book className={narrow ? 'min-w-0 rounded-xl border border-border bg-card' : 'grid min-h-[440px] min-w-0 grid-cols-2 rounded-xl border border-border bg-card'}>
						{!loading && !pages.length ? <EmptyState title={t('navigator.diary.empty')} description={t('navigator.diary.emptyDetail')} /> : pages.map((entry) => <article key={entry.path} data-diary-page className="min-w-0 overflow-auto border-border p-8 text-sm leading-8 text-card-foreground @max-[600px]:p-5 [&+article]:border-l">
							<p className="font-mono text-xs text-muted-foreground">{entry.date.slice(0, 7)}</p><h2 className="my-6 text-3xl font-medium"><time dateTime={entry.date}>{entry.date}</time></h2>
							{bodies.has(entry.path) ? <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{bodies.get(entry.path)}</div> : <p role={bodyError ? 'alert' : 'status'}>{t(bodyError ? 'navigator.diary.readError' : 'navigator.diary.loading')}</p>}
						</article>)}
					</div>
					<div ref={overlay} aria-hidden="true" inert className="pointer-events-none absolute inset-8 overflow-hidden [&_.stf__parent]:relative [&_.stf__wrapper]:relative [&_.stf__wrapper]:h-full [&_.stf__wrapper]:w-full [&_.stf__block]:absolute [&_.stf__block]:inset-0 [&_.stf__block]:h-full [&_.stf__block]:w-full [&_.stf__block]:[perspective:2000px] [&_.stf__item]:absolute [&_.stf__item]:hidden [&_.stf__item]:bg-card [&_.stf__item]:[transform-style:preserve-3d]" />
					<footer className="mt-5 flex flex-wrap justify-between gap-2"><Button className={actionClass} variant="outline" disabled={loading || turning || index <= 0} onClick={() => { void go(-1); }}>{t('navigator.diary.previous')}</Button><Button className={actionClass} variant="outline" disabled={loading || turning || index + step >= entries.length} onClick={() => { void go(1); }}>{t('navigator.diary.next')}</Button></footer>
				</section>
			</>}
		</div>
	</DesignScope>;
}
