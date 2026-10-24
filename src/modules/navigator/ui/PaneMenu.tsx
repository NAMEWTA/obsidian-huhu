// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { useRef, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from '../../../ui/components/context-menu';
import { ObsidianIcon } from '../../../ui/components/huhu/ObsidianIcon';
import { cn } from '../../../ui/lib/utils';
import type { MenuEntry } from './menu-entry';

/** The icon of an entry: a lucide component of the navigator's own, or an Obsidian icon id of a host entry. */
function EntryGlyph({ entry }: { entry: MenuEntry }) {
	if (entry.icon) return <entry.icon aria-hidden />;
	if (entry.iconName) return <ObsidianIcon name={entry.iconName} className="size-3.5 text-muted-foreground" />;
	return null;
}

/** How long after opening a menu the release of the opening right click is told apart from a choice. */
const RELEASE_GUARD_MS = 250;

interface Guard { allow(event: Event): boolean }

function Entries({ entries, guard }: { entries: readonly MenuEntry[]; guard: Guard }) {
	return entries.map((entry) => (
		<span key={entry.id} className="contents">
			{entry.separatorBefore && <ContextMenuSeparator />}
			{entry.children ? (
				<ContextMenuSub>
					<ContextMenuSubTrigger disabled={entry.disabled}>
						<EntryGlyph entry={entry} />
						{entry.label}
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="min-w-44">
						<Entries entries={entry.children} guard={guard} />
					</ContextMenuSubContent>
				</ContextMenuSub>
			) : (
				<ContextMenuItem disabled={entry.disabled} variant={entry.danger ? 'destructive' : 'default'} onSelect={(event) => { if (!guard.allow(event)) { event.preventDefault(); return; } void Promise.resolve(entry.run()); }}>
					<EntryGlyph entry={entry} />
					{entry.label}
					{entry.checked && <Check aria-hidden className="ml-auto" />}
				</ContextMenuItem>
			)}
		</span>
	));
}

/**
 * One context menu for a whole pane: rows set `entries` in their `contextmenu` handler, which runs
 * before the trigger opens the menu, so the menu always shows the row that was clicked.
 */
export function PaneMenu({ entries, children, className }: { entries: readonly MenuEntry[]; children: ReactNode; className?: string }) {
	// The pointerup of the right click that opened the menu can land on an item (a long menu flips upward under the
	// pointer). Within a moment of opening, an item only counts when a new press happened inside the menu.
	const opened = useRef({ at: 0, pressed: false });
	const guard: Guard = { allow: () => opened.current.pressed || Date.now() - opened.current.at >= RELEASE_GUARD_MS };
	return (
		<ContextMenu onOpenChange={(open) => { if (open) opened.current = { at: Date.now(), pressed: false }; }}>
			<ContextMenuTrigger asChild>
				<div className={cn('min-h-0 flex-1', className)}>{children}</div>
			</ContextMenuTrigger>
			<ContextMenuContent className="min-w-44" onPointerDownCapture={() => { opened.current.pressed = true; }}>
				<Entries entries={entries} guard={guard} />
			</ContextMenuContent>
		</ContextMenu>
	);
}
