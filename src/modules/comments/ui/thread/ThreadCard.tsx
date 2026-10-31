// Card presentation for both standalone highlights and historical discussion threads.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, Pencil, RotateCcw, Trash2, Pin, Archive, Palette, NotebookPen } from 'lucide-react';
import { toast } from 'sonner';
import type { CommentThread } from '../../core/model';
import { threadHighlightHex } from '../../core/highlight-colors';
import type { CommentsEnv } from '../env';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Textarea } from '../../../../ui/components/textarea';
import { Badge } from '../../../../ui/components/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { ConfirmDialog } from '../../../../ui/components/huhu/ConfirmDialog';
import { RelativeTime } from '../../../../ui/components/huhu/RelativeTime';
import { useT } from '../../../../ui/react/hooks';
import { Composer } from '../popover/Composer';
import { CommentBody } from './CommentBody';
import { HighlightPalette } from '../highlight-palette';
import { jumpToComment, reanchorFromSelection } from '../navigation';

export function Action({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
	return <Tooltip><TooltipTrigger asChild><Button type="button" size="icon-xs" variant="ghost" aria-label={label} onClick={onClick}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}
export function ThreadCard({ env, path, thread, onDraft, alwaysOpen = false, selected, onSelect, autoEditNote = false }: {
	env: CommentsEnv; path: string; thread: CommentThread; onDraft?: (key: string, active: boolean) => void; alwaysOpen?: boolean;
	selected?: boolean; onSelect?: (id: string, value: boolean) => void;
	autoEditNote?: boolean;
}) {
	const t = useT(), service = env.service, settings = service.settings();
	const [editing, setEditing] = useState<string | null>(null);
	const [replying, setReplying] = useState(false);
	const [attaching, setAttaching] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [error, setError] = useState(false);
	const [noteEditing, setNoteEditing] = useState(autoEditNote);
	const [noteDraft, setNoteDraft] = useState(thread.note ?? '');
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
		className={`group space-y-2 rounded-md border border-border bg-card p-3 text-card-foreground ${thread.archivedAt ? 'opacity-70' : ''}`}>
		<div className="flex min-w-0 items-start gap-2">
			{onSelect && <input type="checkbox" checked={!!selected} onChange={event => onSelect(thread.id, event.target.checked)} aria-label={t('editor.highlights.select')} className="mt-1 size-4" />}
			{thread.kind === 'range' && <span className="mt-1 h-4 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: hex }} aria-hidden="true" />}
			<button type="button" className="line-clamp-3 min-w-0 flex-1 whitespace-normal break-words text-left text-xs text-foreground focus-visible:ring-2 focus-visible:ring-ring"
				title={thread.anchor.text} onClick={jump} aria-label={t('editor.comments.jump')}>
				{thread.kind === 'line' && <span className="text-muted-foreground">{t('editor.comments.line', { line: thread.anchor.lineHint })} · </span>}{thread.anchor.text || t('editor.comments.line', { line: thread.anchor.lineHint })}
			</button>
		</div>
		<div className="flex flex-wrap items-center justify-between gap-1">
			<div className="flex flex-wrap items-center gap-1 text-2xs text-muted-foreground">
				<RelativeTime value={thread.createdAt} />
				{thread.archivedAt && <Badge variant="outline">{t('editor.highlights.archived')}</Badge>}
				{thread.messages.length > 0 && <Badge variant="outline">{thread.messages.length} {t('editor.highlights.discussion')}</Badge>}
			</div>
			<div className="flex flex-wrap items-center gap-0.5">
				{thread.kind === 'range' && <Action label={t('editor.highlights.recolor')} onClick={() => setColorsOpen(!colorsOpen)}><Palette /></Action>}
				<Action label={t('editor.highlights.editNote')} onClick={() => { setNoteDraft(thread.note ?? ''); setNoteEditing(true); }}><NotebookPen /></Action>
				<Action label={t('editor.highlights.pin')} onClick={() => run(() => service.pin(thread.id, !thread.pinnedAt))}><Pin className={thread.pinnedAt ? 'fill-current' : ''} /></Action>
				<Action label={t(thread.archivedAt ? 'editor.highlights.restore' : 'editor.highlights.archive')} onClick={() => run(() => service.archive(thread.id, !thread.archivedAt))}><Archive /></Action>
				<Action label={t('editor.comments.jump')} onClick={jump}><ArrowUpRight /></Action>
				<ConfirmDialog title={t('editor.comments.delete')} description={t('editor.comments.deleteConfirm', { count: Math.max(0, thread.messages.length - 1) })} destructive onConfirm={() => service.remove(thread.id)}>
					<Button type="button" variant="ghost" size="icon-xs" aria-label={t('editor.comments.delete')}><Trash2 /></Button>
				</ConfirmDialog>
			</div>
		</div>
		{colorsOpen && thread.kind === 'range' && <HighlightPalette settings={settings} selected={thread.color} onSelect={(color, colorHex) => {
			run(async () => { await service.recolor(thread.id, color, colorHex); setColorsOpen(false); });
		}} />}
		{noteEditing ? <div className="space-y-2">
			<Textarea autoFocus={autoEditNote} aria-label={t('editor.highlights.note')} value={noteDraft} onChange={event => setNoteDraft(event.target.value)} rows={3}
				onKeyDown={event => { if (!event.nativeEvent.isComposing && event.key === 'Escape') setNoteEditing(false); }} />
			<div className="flex justify-end gap-2"><Button size="xs" variant="ghost" onClick={() => setNoteEditing(false)}>{t('editor.comments.cancel')}</Button>
				<Button size="xs" onClick={() => run(async () => { await service.note(thread.id, noteDraft); setNoteEditing(false); })}>{t('editor.comments.save')}</Button></div>
		</div> : thread.note ? <div className="huhu-highlight-card-note border-l border-border pl-2 text-xs">
			<CommentBody app={env.app} path={path} text={thread.note} onEdit={() => { setNoteDraft(thread.note ?? ''); setNoteEditing(true); }} />
		</div> : <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => { setNoteDraft(''); setNoteEditing(true); }}>{t('editor.highlights.addNote')}</Button>}
		<div className="flex items-center gap-2">
			<span className="shrink-0 text-2xs text-muted-foreground">{t('editor.highlights.tags')}</span>
			<Input aria-label={t('editor.highlights.tags')} value={tagsDraft} onChange={event => setTagsDraft(event.target.value)}
				onBlur={saveTags} onKeyDown={event => { if (!event.nativeEvent.isComposing && event.key === 'Enter') { event.preventDefault(); saveTags(); } }}
				className="h-7 min-w-0 flex-1 text-xs" placeholder={t('editor.highlights.tagsHint')} />
		</div>
		{thread.status === 'orphaned' && <div className="space-y-1 text-xs">
			<Badge variant="outline" className="text-status-warning">{t('editor.comments.orphaned')}</Badge>
			<p className="text-muted-foreground">{t('editor.comments.orphanHint')}</p>
			<Button size="xs" variant="outline" onClick={() => setAttaching(true)}>{t('editor.comments.reanchor')}</Button>
			{attaching && <><p>{t('editor.comments.reattachHint')}</p><Button size="sm" onClick={() => run(async () => { await reanchorFromSelection(env, path, thread); setAttaching(false); })}>{t('editor.comments.confirmAnchor')}</Button></>}
		</div>}
		{collapsed ? <div className="flex items-center gap-2"><Button variant="ghost" size="xs" onClick={() => setExpanded(true)}>{t('editor.comments.resolved')}</Button>
			<Button variant="ghost" size="xs" onClick={() => run(() => service.status(thread.id, false))}>{t('editor.comments.reopen')}</Button></div> : <>
			{thread.messages.map((message, index) => {
				const canEdit = !message.author || message.author === settings.author;
				return <div key={message.id} className={index ? 'ml-3 space-y-1 border-l border-border pl-3' : 'space-y-1'}>
					<div className="flex flex-wrap items-center gap-2 text-2xs text-muted-foreground"><span className="text-xs font-medium text-foreground">{message.author || t('editor.comments.you')}</span><RelativeTime value={message.createdAt} />{message.editedAt && <span>{t('editor.comments.edited')}</span>}</div>
					{editing === message.id ? <Composer app={env.app} initial={message.text} submitLabel={t('editor.comments.save')} onDraft={draft} onCancel={() => setEditing(null)} onSubmit={async text => { await service.edit(thread.id, message.id, text); setEditing(null); }} />
						: <CommentBody app={env.app} path={path} text={message.text} onEdit={canEdit ? () => setEditing(message.id) : undefined} />}
					<div className={`flex justify-end gap-2 ${alwaysOpen ? '' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100'}`}>
						{index === 0 && thread.status !== 'orphaned' && <Action label={t(thread.status === 'resolved' ? 'editor.comments.reopen' : 'editor.comments.resolve')} onClick={() => run(() => service.status(thread.id, thread.status !== 'resolved'))}>{thread.status === 'resolved' ? <RotateCcw /> : <Check />}</Action>}
						{canEdit && !editing && <Action label={t(index ? 'editor.comments.editReply' : 'editor.comments.edit')} onClick={() => setEditing(message.id)}><Pencil /></Action>}
						{index > 0 && <Action label={t('editor.comments.deleteReply')} onClick={() => run(async () => {
							const removed = await service.removeReply(thread.id, message.id);
							if (removed) toast(t('editor.comments.deleted'), { duration: 5000, action: { label: t('editor.comments.undo'), onClick: () => run(() => service.restoreReply(thread.id, removed)) } });
						})}><Trash2 /></Action>}
					</div>
				</div>;
			})}
			{!editing && (replying ? <Composer app={env.app} submitLabel={t('editor.comments.reply')} onDraft={draft} onCancel={() => setReplying(false)}
				onSubmit={async (text, key) => { await service.reply(key, thread.id, text); setReplying(false); }} />
				: <Button variant="ghost" size="xs" className="w-full justify-start text-muted-foreground" onClick={() => setReplying(true)}>{t('editor.comments.reply')}…</Button>)}
		</>}
		{error && <p role="alert" className="text-xs text-destructive">{t('editor.comments.storageFailed')}</p>}
	</article>;
}
