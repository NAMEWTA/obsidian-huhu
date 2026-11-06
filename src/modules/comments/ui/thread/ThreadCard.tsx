// Card presentation for both standalone highlights and historical discussion threads.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, Pencil, RotateCcw, Trash2, Pin, Archive, Palette, NotebookPen } from 'lucide-react';
import type { CommentThread } from '../../core/model';
import { threadHighlightHex } from '../../core/highlight-colors';
import type { CommentsEnv } from '../env';
import { Button } from '../../../../ui/components/button';
import { Checkbox } from '../../../../ui/components/checkbox';
import { Input } from '../../../../ui/components/input';
import { Textarea } from '../../../../ui/components/textarea';
import { Badge } from '../../../../ui/components/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { ConfirmDialog } from '../../../../ui/components/huhu/ConfirmDialog';
import { RelativeTime } from '../../../../ui/components/huhu/RelativeTime';
import { useT } from '../../../../ui/react/hooks';
import { useDesignNotice } from '../../../../ui/react/design-scope';
import { Composer } from '../popover/Composer';
import { CommentBody } from './CommentBody';
import { HighlightPalette } from '../highlight-palette';
import { jumpToComment, reanchorFromSelection } from '../navigation';

export function Action({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
	return <Tooltip><TooltipTrigger asChild><Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" type="button" size="icon-sm" variant="ghost" aria-label={label} onClick={onClick}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}
export function ThreadCard({ env, path, thread, onDraft, selected, onSelect, autoEditNote = false }: {
	env: CommentsEnv; path: string; thread: CommentThread; onDraft?: (key: string, active: boolean) => void; 
	selected?: boolean; onSelect?: (id: string, value: boolean) => void;
	autoEditNote?: boolean;
}) {
	const t = useT(), notice = useDesignNotice(), service = env.service, settings = service.settings();
	const [editing, setEditing] = useState<string | null>(null);
	const [replying, setReplying] = useState(false);
	const [attaching, setAttaching] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [error, setError] = useState(false);
	const [noteEditing, setNoteEditing] = useState(autoEditNote);
	const [noteDraft, setNoteDraft] = useState(thread.note ?? '');
	const noteRevision = useRef(0), owner = useRef({ env, path, id: thread.id });
	const alive = useRef(true);
	useLayoutEffect(() => { owner.current = { env, path, id: thread.id }; }, [env, path, thread.id]);
	useLayoutEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
	const changeNoteDraft = (value: string) => { noteRevision.current++; setNoteDraft(value); };
	const saveNote = async () => {
		const revision = noteRevision.current, identity = owner.current;
		await service.note(thread.id, noteDraft);
		if (alive.current && owner.current.env === identity.env && owner.current.path === identity.path && owner.current.id === identity.id && noteRevision.current === revision) setNoteEditing(false);
	};
	const [tagsDraft, setTagsDraft] = useState((thread.tags ?? []).join(', '));
	const [colorsOpen, setColorsOpen] = useState(false);
	const draft = useCallback((active: boolean) => onDraft?.(thread.id, active), [onDraft, thread.id]);
	useEffect(() => { if (!noteEditing) return; draft(true); return () => draft(false); }, [noteEditing, draft]);
	const run = (action: () => Promise<unknown>) => { setError(false); void action().catch(() => setError(true)); };
	const jump = () => { for (const view of env.editors) env.overlay(view.dom.ownerDocument).close(false); void jumpToComment(env, path, thread); };
	const collapsed = thread.messages.length > 0 && thread.status === 'resolved' && !expanded;
	const hex = threadHighlightHex(thread, settings);
	const saveTags = () => {
		const tags = [...new Set(tagsDraft.split(',').map(tag => tag.trim()).filter(Boolean))];
		if (tags.join('|') !== (thread.tags ?? []).join('|')) run(() => service.tags(thread.id, tags));
	};
	return <article data-thread-id={thread.id} data-status={thread.status} data-color={thread.color ?? 'legacy'}
		className={`group space-y-2 rounded-md border border-[var(--hu-line)] bg-[var(--hu-surface)] p-3 text-[var(--hu-fg)] ${thread.archivedAt ? 'opacity-70' : ''}`}>
		<div className="flex min-w-0 items-start gap-2">
			{onSelect && <Checkbox checked={!!selected} onCheckedChange={value => onSelect(thread.id, value === true)} aria-label={t('editor.highlights.select')} className="mt-1" />}
			{thread.kind === 'range' && <span className="mt-1 h-4 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: hex }} aria-hidden="true" />}
			<button type="button" className="min-h-8 [@media(pointer:coarse)]:min-h-11 line-clamp-3 min-w-0 flex-1 whitespace-normal break-words text-left text-xs text-[var(--hu-fg)] focus-visible:outline-2 focus-visible:outline-[var(--hu-accent)]"
				title={thread.anchor.text} onClick={jump} aria-label={t('editor.comments.jump')}>
				{thread.kind === 'line' && <span className="text-[var(--hu-fg-3)]">{t('editor.comments.line', { line: thread.anchor.lineHint })} · </span>}{thread.anchor.text || t('editor.comments.line', { line: thread.anchor.lineHint })}
			</button>
		</div>
		<div className="flex flex-wrap items-center justify-between gap-1">
			<div className="flex flex-wrap items-center gap-1 text-xs text-[var(--hu-fg-3)]">
				<RelativeTime value={thread.createdAt} />
				{thread.archivedAt && <Badge variant="neutral">{t('editor.highlights.archived')}</Badge>}
				{thread.messages.length > 0 && <Badge variant="neutral">{thread.messages.length} {t('editor.highlights.discussion')}</Badge>}
			</div>
			<div className="flex flex-wrap items-center gap-1">
				{thread.kind === 'range' && <Action label={t('editor.highlights.recolor')} onClick={() => setColorsOpen(!colorsOpen)}><Palette /></Action>}
				<Action label={t('editor.highlights.editNote')} onClick={() => { changeNoteDraft(thread.note ?? ''); setNoteEditing(true); }}><NotebookPen /></Action>
				<Action label={t('editor.highlights.pin')} onClick={() => run(() => service.pin(thread.id, !thread.pinnedAt))}><Pin className={thread.pinnedAt ? 'fill-current' : ''} /></Action>
				<Action label={t(thread.archivedAt ? 'editor.highlights.restore' : 'editor.highlights.archive')} onClick={() => run(() => service.archive(thread.id, !thread.archivedAt))}><Archive /></Action>
				<Action label={t('editor.comments.jump')} onClick={jump}><ArrowUpRight /></Action>
				<ConfirmDialog title={t('editor.comments.delete')} description={t('editor.comments.deleteConfirm', { count: Math.max(0, thread.messages.length - 1) })} destructive onConfirm={() => service.remove(thread.id)}>
					<Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" type="button" variant="ghost" size="icon-sm" aria-label={t('editor.comments.delete')}><Trash2 /></Button>
				</ConfirmDialog>
			</div>
		</div>
		{colorsOpen && thread.kind === 'range' && <HighlightPalette settings={settings} selected={thread.color} onSelect={(color, colorHex) => {
			run(async () => { await service.recolor(thread.id, color, colorHex); setColorsOpen(false); });
		}} />}
		{noteEditing ? <div className="space-y-2">
			<Textarea autoFocus={autoEditNote} aria-label={t('editor.highlights.note')} value={noteDraft} onChange={event => changeNoteDraft(event.target.value)} rows={3}
				onKeyDown={event => { if (!event.nativeEvent.isComposing && event.key === 'Escape') { noteRevision.current++; setNoteEditing(false); } }} />
			<div className="flex justify-end gap-2"><Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" size="sm" variant="ghost" onClick={() => { noteRevision.current++; setNoteEditing(false); }}>{t('editor.comments.cancel')}</Button>
				<Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" size="sm" onClick={() => run(saveNote)}>{t('editor.comments.save')}</Button></div>
		</div> : thread.note ? <div className="huhu-highlight-card-note border-l border-[var(--hu-line)] pl-2 text-xs">
			<CommentBody app={env.app} path={path} text={thread.note} onEdit={() => { changeNoteDraft(thread.note ?? ''); setNoteEditing(true); }} />
		</div> : <Button size="sm" variant="ghost" className="text-[var(--hu-fg-3)] min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" onClick={() => { changeNoteDraft(''); setNoteEditing(true); }}>{t('editor.highlights.addNote')}</Button>}
		<div className="flex items-center gap-2">
			<span className="shrink-0 text-xs text-[var(--hu-fg-3)]">{t('editor.highlights.tags')}</span>
			<Input aria-label={t('editor.highlights.tags')} value={tagsDraft} onChange={event => setTagsDraft(event.target.value)}
				onBlur={saveTags} onKeyDown={event => { if (!event.nativeEvent.isComposing && event.key === 'Enter') { event.preventDefault(); saveTags(); } }}
				className="min-w-0 flex-1 text-xs" placeholder={t('editor.highlights.tagsHint')} />
		</div>
		{thread.status === 'orphaned' && <div className="space-y-1 text-xs">
			<Badge variant="neutral" className="text-[var(--hu-warning)]">{t('editor.comments.orphaned')}</Badge>
			<p className="text-[var(--hu-fg-3)]">{t('editor.comments.orphanHint')}</p>
			<Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" size="sm" variant="secondary" onClick={() => setAttaching(true)}>{t('editor.comments.reanchor')}</Button>
			{attaching && <><p>{t('editor.comments.reattachHint')}</p><Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" size="sm" onClick={() => run(async () => { await reanchorFromSelection(env, path, thread); setAttaching(false); })}>{t('editor.comments.confirmAnchor')}</Button></>}
		</div>}
		{collapsed ? <div className="flex flex-wrap items-center gap-2"><Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" variant="ghost" size="sm" onClick={() => setExpanded(true)}>{t('editor.comments.resolved')}</Button>
			<Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" variant="ghost" size="sm" onClick={() => run(() => service.status(thread.id, false))}>{t('editor.comments.reopen')}</Button></div> : <>
			{thread.messages.map((message, index) => {
				const canEdit = !message.author || message.author === settings.author;
				return <div key={message.id} className={index ? 'ml-3 space-y-1 border-l border-[var(--hu-line)] pl-3' : 'space-y-1'}>
					<div className="flex flex-wrap items-center gap-2 text-xs text-[var(--hu-fg-3)]"><span className="text-xs font-medium text-[var(--hu-fg)]">{message.author || t('editor.comments.you')}</span><RelativeTime value={message.createdAt} />{message.editedAt && <span>{t('editor.comments.edited')}</span>}</div>
					{editing === message.id ? <Composer app={env.app} initial={message.text} submitLabel={t('editor.comments.save')} onDraft={draft} onCancel={() => setEditing(null)} onSubmit={async text => { await service.edit(thread.id, message.id, text); setEditing(null); }} />
						: <CommentBody app={env.app} path={path} text={message.text} onEdit={canEdit ? () => setEditing(message.id) : undefined} />}
					<div className="flex flex-wrap justify-end gap-2">
						{index === 0 && thread.status !== 'orphaned' && <Action label={t(thread.status === 'resolved' ? 'editor.comments.reopen' : 'editor.comments.resolve')} onClick={() => run(() => service.status(thread.id, thread.status !== 'resolved'))}>{thread.status === 'resolved' ? <RotateCcw /> : <Check />}</Action>}
						{canEdit && !editing && <Action label={t(index ? 'editor.comments.editReply' : 'editor.comments.edit')} onClick={() => setEditing(message.id)}><Pencil /></Action>}
						{index > 0 && <Action label={t('editor.comments.deleteReply')} onClick={() => run(async () => {
							const removed = await service.removeReply(thread.id, message.id);
							if (removed) notice(t('editor.comments.deleted'), { duration: 5000, action: { label: t('editor.comments.undo'), onClick: () => run(() => service.restoreReply(thread.id, removed)) } });
						})}><Trash2 /></Action>}
					</div>
				</div>;
			})}
			{!editing && (replying ? <Composer app={env.app} submitLabel={t('editor.comments.reply')} onDraft={draft} onCancel={() => setReplying(false)}
				onSubmit={async (text, key) => { await service.reply(key, thread.id, text); setReplying(false); }} />
				: <Button variant="ghost" size="sm" className="w-full justify-start text-[var(--hu-fg-3)] min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" onClick={() => setReplying(true)}>{t('editor.comments.reply')}…</Button>)}
		</>}
		{error && <p role="alert" className="break-words text-xs text-[var(--hu-danger)]">{t('editor.comments.storageFailed')}</p>}
	</article>;
}
