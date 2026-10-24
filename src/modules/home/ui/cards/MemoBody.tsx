// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/renderer.ts
import { useEffect, useRef, useState } from 'react';
import { Component, MarkdownRenderer, Scope } from 'obsidian';
import type { BoardStore } from '../../services/board-store';
import { Textarea } from '../../../../ui/components/textarea';
import { cn } from '../../../../ui/lib/utils';
import { useT } from '../../../../ui/react/hooks';
import { useOwnerDocument } from '../../../../ui/react/contexts';
export function MarkdownBody({
	text,
	store,
	sourcePath,
	className,
}: {
	text: string;
	store: BoardStore;
	sourcePath?: string;
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null),
		doc = useOwnerDocument();
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const component = new Component();
		component.load();
		el.replaceChildren();
		void MarkdownRenderer.render(
			store.host.app,
			text,
			el,
			sourcePath ?? store.state.getState().path + '.md',
			component,
		);
		return () => {
			component.unload();
			el.replaceChildren();
		};
	}, [text, store, doc, sourcePath]);
	return (
		<div
			ref={ref}
			className={className ?? 'huhu-native markdown-rendered min-w-0 text-[.85em]'}
			onClick={(e) => {
				const link = (e.target as Element).closest<HTMLAnchorElement>('a.internal-link');
				if (link) {
					e.preventDefault();
					void store.openFile(link.dataset.href ?? link.getAttribute('href') ?? '', false, sourcePath);
				}
			}}
		/>
	);
}
export function MemoBody({
	store,
	text,
	onSave,
	cardId,
	fill = false,
	editToken = 0,
}: {
	store: BoardStore;
	text: string;
	/** Raised by the card's edit button: each new value starts editing in place. */
	editToken?: number;
	/** The card is a tile of its own: the whole body is the click target. */
	fill?: boolean;
	cardId: string;
	onSave(this: void, text: string, original: string): Promise<void>;
}) {
	const draftKey = store.memoDraftKey(cardId);
	const cancelled = useRef(false),
		saving = useRef(false);
	const save = () => {
		if (cancelled.current || saving.current) return;
		saving.current = true;
		void onSave(draft, original.current)
			.then(() => setEditing(false))
			.catch((cause: unknown) => setError(cause instanceof Error ? cause.message : t('workbench.failed')))
			.finally(() => {
				saving.current = false;
			});
	};
	const t = useT(),
		[editing, setEditing] = useState(() => store.memoDrafts.has(draftKey)),
		[draft, setDraft] = useState(() => store.memoDrafts.get(draftKey)?.text ?? text),
		[error, setError] = useState(''),
		original = useRef(store.memoDrafts.get(draftKey)?.original ?? text);
	const begin = () => {
		cancelled.current = false;
		original.current = text;
		setDraft(text);
		setError('');
		store.memoDrafts.set(draftKey, { original: text, text });
		setEditing(true);
	};
	const lastToken = useRef(editToken);
	useEffect(() => {
		if (editToken === lastToken.current) return;
		lastToken.current = editToken;
		if (!editing) begin();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only a new token starts an edit
	}, [editToken]);
	const field = useRef<HTMLTextAreaElement>(null),
		saveNow = useRef(save);
	saveNow.current = save;
	// Obsidian's own key handler sees Mod+Enter before the field does, so the field's shortcut is a scope of the app.
	useEffect(() => {
		if (!editing) return;
		const keymap = store.host.app.keymap,
			scope = new Scope(store.host.app.scope);
		scope.register(['Mod'], 'Enter', (event) => {
			const node = field.current;
			if (!node || node.ownerDocument.activeElement !== node || event.isComposing) return;
			saveNow.current();
			return false;
		});
		keymap.pushScope(scope);
		return () => keymap.popScope(scope);
	}, [editing, store]);
	if (editing)
		return (
			<div className={cn('flex min-h-0 flex-col gap-1', fill && 'flex-1')}>
				<Textarea
					ref={field}
					autoFocus
					aria-label={t('home.dashboard.memo')}
					className={cn('min-h-24 resize-none text-sm', fill && 'flex-1')}
					value={draft}
					onChange={(e) => {
						setDraft(e.target.value);
						store.memoDrafts.set(draftKey, {
							...store.memoDrafts.get(draftKey),
							original: original.current,
							text: e.target.value,
						});
					}}
					onBlur={() => {
						save();
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							cancelled.current = true;
							store.memoDrafts.delete(draftKey);
							setEditing(false);
						}
						if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.nativeEvent.isComposing) {
							save();
						}
					}}
				/>
				{error && (
					<p role="alert" className="m-0 text-xs text-destructive">
						{error}
					</p>
				)}
			</div>
		);
	return (
		<div
			className={cn('min-h-0 cursor-text overflow-y-auto', fill && 'flex-1')}
			role="button"
			tabIndex={0}
			aria-label={t('common.edit')}
			onKeyDown={(event) => {
				if (event.key === 'Enter') {
					begin();
				}
			}}
			onClick={(event) => {
				if ((event.target as Element).closest('a')) return;
				begin();
			}}
		>
			<MarkdownBody
				text={text}
				store={store}
				className="huhu-native markdown-rendered min-w-0 text-[13px] leading-5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
			/>
		</div>
	);
}
