import { useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Pencil } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { useT } from '../../../../ui/react/hooks';
import type { BoardStore } from '../../services/board-store';
import { boardEntries, boardLabel } from './board-names';

/**
 * The name of the board on screen, in the middle of the page header. Click it to rename: Enter or leaving the field
 * saves, Esc keeps the old name. An empty name goes back to "Board N".
 */
export function BoardTitle({ store }: { store: BoardStore }) {
	const { settings, path } = useStore(store.state),
		t = useT(),
		entry = boardEntries(settings).find((item) => item.file === path),
		label = entry ? boardLabel(entry, t) : t('workbench.home'),
		[editing, setEditing] = useState(false),
		[draft, setDraft] = useState(''),
		cancelled = useRef(false),
		saving = useRef(false);
	const commit = () => {
		if (cancelled.current || saving.current) return;
		saving.current = true;
		const next = draft.trim();
		const done = entry && next !== entry.name ? store.host.renameWorkspace(entry.file, next) : Promise.resolve();
		void done.finally(() => {
			saving.current = false;
			setEditing(false);
		});
	};
	if (editing)
		return (
			<Input
				autoFocus
				data-board-title-input
				className="h-8 w-48 max-w-full text-center text-sm font-medium"
				aria-label={t('home.dashboard.renameBoard')}
				placeholder={t('home.dashboard.boardNamePlaceholder')}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onFocus={(event) => event.currentTarget.select()}
				onBlur={commit}
				onKeyDown={(event) => {
					if (event.nativeEvent.isComposing) return;
					if (event.key === 'Escape') {
						cancelled.current = true;
						setEditing(false);
					}
					if (event.key === 'Enter') {
						event.preventDefault();
						commit();
					}
				}}
			/>
		);
	return (
		<Button
			variant="ghost"
			size="sm"
			data-board-title
			className="group/title max-w-full min-w-0 gap-1.5 px-2 text-sm font-medium"
			title={t('home.dashboard.renameBoard')}
			aria-label={`${label} - ${t('home.dashboard.renameBoard')}`}
			onClick={() => {
				cancelled.current = false;
				setDraft(entry?.name ?? '');
				setEditing(true);
			}}
		>
			<span className="min-w-0 truncate">{label}</span>
			<Pencil className="size-3 shrink-0 opacity-0 group-hover/title:opacity-60 group-focus-visible/title:opacity-60" />
		</Button>
	);
}
