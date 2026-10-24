import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { File, FilePlus, Folder, FolderPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../input';
import { Popover, PopoverAnchor, PopoverContent } from '../popover';
import { useT } from '../../react/hooks';
import { fuzzyPathMatch, normalizeVaultPath, type FuzzyHit, type VaultPathItem } from '../../../shared/vault-path';

export type PathPickerItem = VaultPathItem;

const MAX_ROWS = 50;

/** The matched characters of `text` set in bold, like the suggestions of Obsidian's own folder picker. */
function Highlighted({ text, hit }: { text: string; hit: FuzzyHit | null }) {
	if (!hit?.ranges.length) return <>{text}</>;
	const parts: ReactNode[] = [];
	let at = 0;
	hit.ranges.forEach(([start, end], index) => {
		if (start > at) parts.push(text.slice(at, start));
		parts.push(
			<span key={index} className="font-semibold text-foreground">
				{text.slice(start, end)}
			</span>,
		);
		at = end;
	});
	if (at < text.length) parts.push(text.slice(at));
	return <>{parts}</>;
}

interface Row {
	key: string;
	path: string;
	kind: 'file' | 'folder';
	create?: boolean;
	hit: FuzzyHit | null;
}

/**
 * A vault path field in the manner of Obsidian's folder suggestions: type, and the vault's folders (or files) are
 * fuzzy-matched below the field; arrow keys and Enter choose, the matched characters are highlighted. A path
 * typed by hand is always read from the vault root (no leading `/`, no `..`); one that does not exist yet is
 * offered as a new folder and created when the value is saved. The caller supplies the vault entries; this
 * presentation never reads the filesystem.
 */
export function PathPicker({
	value,
	items,
	onChange,
	kind,
	disabled,
	label,
	placeholder,
	allowCreate,
	className,
}: {
	value: string;
	items: readonly PathPickerItem[];
	/** Called with the normalised, vault-relative path (`''` is the vault root). */
	onChange: (path: string) => void;
	kind?: PathPickerItem['kind'];
	disabled?: boolean;
	label?: string;
	placeholder?: string;
	/** Accept a path that is not in `items` (offered as a new folder). Defaults to on, except for files. */
	allowCreate?: boolean;
	className?: string;
}) {
	const t = useT();
	const listId = useId();
	const input = useRef<HTMLInputElement>(null);
	// What the user is typing; null follows `value`, so a value changed from outside shows up unless they are typing.
	const [typed, setTyped] = useState<string | null>(null);
	const draft = typed ?? value;
	const [open, setOpen] = useState(false);
	// The highlighted row belongs to one draft: typing starts from the best match again.
	const [highlight, setHighlight] = useState({ draft: '', index: 0 });
	const active = highlight.draft === draft ? highlight.index : 0;
	const setActive = (next: number | ((current: number) => number)) =>
		setHighlight({ draft, index: typeof next === 'function' ? next(active) : next });
	const canCreate = allowCreate ?? kind !== 'file';

	const normalized = normalizeVaultPath(draft);
	const invalid = !normalized.ok;
	const rows = useMemo<Row[]>(() => {
		const query = normalized.ok ? normalized.path : draft;
		const scored: Row[] = [];
		for (const item of items) {
			if (kind && item.kind !== kind) continue;
			const hit = fuzzyPathMatch(query, item.path);
			if (hit) scored.push({ key: `${item.kind}:${item.path}`, path: item.path, kind: item.kind, hit });
		}
		scored.sort((a, b) => (b.hit?.score ?? 0) - (a.hit?.score ?? 0) || a.path.length - b.path.length || a.path.localeCompare(b.path));
		const result = scored.slice(0, MAX_ROWS);
		if (canCreate && normalized.ok && normalized.path && !items.some((item) => item.path === normalized.path && (!kind || item.kind === kind)))
			result.push({ key: `create:${normalized.path}`, path: normalized.path, kind: kind === 'file' ? 'file' : 'folder', create: true, hit: null });
		return result;
	}, [items, kind, draft, normalized.ok, normalized.ok ? normalized.path : '', canCreate]); // eslint-disable-line react-hooks/exhaustive-deps -- `normalized` is derived from `draft`

	const commit = (path: string) => {
		setTyped(null);
		setOpen(false);
		if (path !== value) onChange(path);
	};
	const accept = (): boolean => {
		if (!normalized.ok) return false;
		const known = items.some((item) => item.path === normalized.path && (!kind || item.kind === kind));
		if (normalized.path !== '' && !known && !canCreate) return false;
		commit(normalized.path);
		return true;
	};
	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.nativeEvent.isComposing) return;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!open) return setOpen(true);
			if (rows.length) setActive((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			const row = open ? rows[active] : undefined;
			if (row) commit(row.path);
			else accept();
		} else if (event.key === 'Tab' && open && rows[active]) {
			// Tab completes the highlighted suggestion and keeps going, like the editor's own suggest popups.
			commit(rows[active].path);
		}
	};

	return (
		<Popover open={open && !disabled && (rows.length > 0 || invalid)} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<div className={cn('min-w-0 max-w-full', className)}>
					<Input
						ref={input}
						value={draft}
						disabled={disabled}
						spellCheck={false}
						autoComplete="off"
						role="combobox"
						aria-expanded={open}
						aria-controls={listId}
						aria-autocomplete="list"
						aria-activedescendant={open && rows[active] ? `${listId}-${active}` : undefined}
						aria-label={label ?? t('ui.choosePath')}
						aria-invalid={invalid || undefined}
						placeholder={placeholder ?? t('ui.pathPlaceholder')}
						onChange={(event) => {
							setTyped(event.currentTarget.value);
							setOpen(true);
						}}
						onFocus={() => setOpen(true)}
						onBlur={() => {
							setOpen(false);
							// A path that cannot be used goes back to the last good value.
							if (!accept()) setTyped(null);
						}}
						onKeyDown={onKeyDown}
					/>
					{invalid && (
						<p role="alert" className="mt-1 text-xs text-destructive">
							{t('ui.pathInvalid')}
						</p>
					)}
				</div>
			</PopoverAnchor>
			<PopoverContent
				align="start"
				className="w-[var(--radix-popover-trigger-width)] min-w-64 max-w-[calc(100vw-2rem)] p-1"
				// Focus stays in the field; the list is only a view of what typing finds.
				onOpenAutoFocus={(event) => event.preventDefault()}
				onCloseAutoFocus={(event) => event.preventDefault()}
				onInteractOutside={(event) => {
					if (event.target instanceof Node && input.current?.contains(event.target)) event.preventDefault();
				}}
			>
				<div id={listId} role="listbox" aria-label={label ?? t('ui.choosePath')} className="max-h-64 overflow-y-auto scrollbar-sleek">
					{rows.map((row, index) => (
						<div
							key={row.key}
							id={`${listId}-${index}`}
							role="option"
							aria-selected={index === active}
							data-active={index === active || undefined}
							className={cn(
								'flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground',
								index === active && 'bg-accent text-accent-foreground',
							)}
							// A mousedown would blur the field and close the list before the click lands.
							onMouseDown={(event) => event.preventDefault()}
							title={row.create ? t(row.kind === 'file' ? 'ui.pathCreateFileHint' : 'ui.pathCreateHint') : row.path}
							onMouseEnter={() => setActive(index)}
							onClick={() => commit(row.path)}
						>
							{row.create ? row.kind === 'file' ? <FilePlus className="size-4 shrink-0" /> : <FolderPlus className="size-4 shrink-0" /> : row.kind === 'folder' ? <Folder className="size-4 shrink-0" /> : <File className="size-4 shrink-0" />}
							<span className="min-w-0 flex-1 truncate">
								{row.create ? t('ui.pathCreate', { path: row.path }) : <Highlighted text={row.path} hit={row.hit} />}
							</span>
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
