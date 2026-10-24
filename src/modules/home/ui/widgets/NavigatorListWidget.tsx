import { useSyncExternalStore } from 'react';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { ObsidianIcon } from '../../../../ui/components/huhu/ObsidianIcon';
import { useT } from '../../../../ui/react/hooks';
import type { NavigatorLists, NavigatorListTarget, NavigatorListsSnapshot } from '../../../navigator/api';
import type { BoardStore } from '../../services/board-store';
import { FileGlyph, RowButton } from '../board/rows';

const TARGET_ICONS: Record<NavigatorListTarget['kind'], string> = {
	note: 'file-text',
	folder: 'folder',
	tag: 'tag',
	property: 'list-filter',
	search: 'search',
};

const none = () => undefined;

/** The navigator service while its module is active, with its latest lists. */
function useNavigatorLists(store: BoardStore): { lists: NavigatorLists | undefined; snapshot: NavigatorListsSnapshot | undefined } {
	const { navigatorLists: current, watchNavigatorLists } = store.widgets,
		lists = useSyncExternalStore(
			(listener: () => void) => watchNavigatorLists?.(listener) ?? none,
			() => current?.(),
		),
		snapshot = useSyncExternalStore(
			(listener: () => void) => lists?.subscribe(listener) ?? none,
			() => lists?.snapshot(),
		);
	return { lists, snapshot };
}

/**
 * Recent notes or shortcuts of the notes navigator. The lists belong to the navigator; this widget only shows them
 * and asks the navigator to open an entry.
 */
export function NavigatorListWidget({ store, mode }: { store: BoardStore; mode: 'recent' | 'shortcuts' }) {
	const t = useT(),
		{ lists, snapshot } = useNavigatorLists(store),
		items: ReadonlyArray<{ key: string; title: string; target: NavigatorListTarget }> = !snapshot
			? []
			: mode === 'recent'
				? snapshot.recent.map((item) => ({
						key: item.path,
						title: item.title,
						target: { kind: 'note', key: item.path },
					}))
				: snapshot.shortcuts.map((item) => ({
						key: `${item.kind}:${item.key}`,
						title: item.title,
						target: { kind: item.kind, key: item.key },
					}));
	return (
		<div className="flex h-full min-h-0 flex-col" data-nav-list={mode}>
			{!lists ? (
				<EmptyState
					className="h-full"
					size="sm"
					title={t('navWidget.unavailable')}
					description={t('navWidget.unavailableHint')}
					descriptionClassName="hidden [@container(min-height:12.5rem)]:block"
				/>
			) : items.length === 0 ? (
				<EmptyState
					className="h-full"
					size="sm"
					title={t(mode === 'recent' ? 'navWidget.noRecent' : 'navWidget.noShortcuts')}
					description={t(mode === 'recent' ? 'navWidget.noRecentHint' : 'navWidget.noShortcutsHint')}
					descriptionClassName="hidden [@container(min-height:12.5rem)]:block"
				/>
			) : (
				<ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-y-auto p-0">
					{items.map((item) => (
						<li key={item.key} className="shrink-0">
							<RowButton
								title={item.title}
								icon={
									item.target.kind === 'note' ? (
										<FileGlyph path={item.target.key} />
									) : (
										<ObsidianIcon name={TARGET_ICONS[item.target.kind]} className="text-muted-foreground" />
									)
								}
								onClick={() => lists.open(item.target)}
							>
								{item.title}
							</RowButton>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export const NavigatorRecentWidget = ({ store }: { store: BoardStore }) => (
	<NavigatorListWidget store={store} mode="recent" />
);
export const NavigatorShortcutsWidget = ({ store }: { store: BoardStore }) => (
	<NavigatorListWidget store={store} mode="shortcuts" />
);
