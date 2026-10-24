import { Notice, TFile, type App } from 'obsidian';
import { useMemo, useState } from 'react';
import { List, ListTree, Minus, Plus, Check, FileDiff, Undo2, X } from 'lucide-react';
import { t } from '../../../shared/i18n/index';
import { defaultFileIcon, defaultFolderIcon, lucideIconId } from '../../../shared/file-type-icons';
import { cn } from '../../../ui/lib/utils';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { SegmentedControl } from '../../../ui/components/huhu/SettingsFormControls';
import { Tree, type TreeNode } from '../../../ui/components/tree';
import { buildChangeTree, type ChangeRow, type ChangeTreeNode } from '../core/change-tree';
import { hasConflictBlocks } from '../core/conflict-blocks';
import type { SyncService } from '../services/sync-service';
import { confirmAction } from './dialogs';
import { Diff } from './Diff';

export type ChangeView = 'flat' | 'tree';
type GroupKind = 'conflict' | 'staged' | 'changed';

export interface ChangeListHost {
	report: (error: unknown) => void;
}

export interface ChangeListProps {
	app: App;
	service: SyncService;
	conflicts: readonly ChangeRow[];
	staged: readonly ChangeRow[];
	changed: readonly ChangeRow[];
	view: ChangeView;
	onViewChange: (view: ChangeView) => void;
	toVault: (path: string) => string | null;
	busy: boolean;
	host: ChangeListHost;
}

const ROW_HEIGHT = 28;
const MAX_HEIGHT = 520;
const STATUS_TONE: Record<string, string> = {
	M: 'text-status-warning',
	A: 'text-status-success',
	U: 'text-status-success',
	D: 'text-destructive',
	R: 'text-status-info',
	C: 'text-status-info',
	T: 'text-status-warning',
};
const groupTitle: Record<GroupKind, string> = {
	conflict: 'sync.groupConflicts',
	staged: 'sync.groupStaged',
	changed: 'sync.groupChanges',
};

/** One-letter badge with the tone of VS Code's source control: modified yellow, added green, deleted red, renamed blue. */
export function StatusLetter({ code }: { code: string }) {
	const letter = code.length > 1 ? code : code || '·';
	const tone = code.length > 1 ? 'text-destructive' : (STATUS_TONE[code] ?? 'text-muted-foreground');
	const hint = t(`sync.status.${code}`);
	return (
		<span className={cn('w-4 text-center font-mono text-xs font-semibold', tone)} title={hint === `sync.status.${code}` ? code : hint}>
			{letter}
		</span>
	);
}

const fileId = (group: GroupKind, path: string) => `f:${group}:${path}`;
const dirId = (group: GroupKind, path: string) => `d:${group}:${path}`;
const groupId = (group: GroupKind) => `g:${group}`;

/**
 * Conflicts, staged changes and other changes in one compact tree (Orca / VS Code style): 28px rows, a colored
 * status letter on the right, and the row buttons only while the row is hovered or focused. The "flat" view lists
 * files with their folder in gray; the "tree" view groups them by folder with file counts.
 */
export function ChangeList(props: ChangeListProps) {
	const { app, service, view, onViewChange, toVault, busy, host } = props;
	const [collapsed, setCollapsed] = useState<readonly string[]>([]);
	const [diff, setDiff] = useState<{ key: string; path: string; staged: boolean } | null>(null);

	const groups: ReadonlyArray<readonly [GroupKind, readonly ChangeRow[]]> = [
		['conflict', props.conflicts],
		['staged', props.staged],
		['changed', props.changed],
	];

	const openFile = (row: ChangeRow) => {
		const vaultPath = toVault(row.path);
		const file = vaultPath ? app.vault.getAbstractFileByPath(vaultPath) : null;
		if (file instanceof TFile) void app.workspace.getLeaf('tab').openFile(file).catch(host.report);
		else new Notice(t('sync.notInVault'));
	};
	const discard = async (row: ChangeRow) => {
		const untracked = row.kind === 'untracked';
		if (
			!(await confirmAction(app, {
				title: t('sync.discardTitle'),
				message: t(untracked ? 'sync.discardUntracked' : 'sync.discardConfirm', { path: row.path }),
				action: t('sync.discard'),
				danger: true,
			}))
		)
			return;
		const vaultPath = toVault(row.path);
		if (untracked) {
			const file = vaultPath ? app.vault.getAbstractFileByPath(vaultPath) : null;
			if (!(file instanceof TFile)) return void new Notice(t('sync.notInVault'));
			await app.fileManager.trashFile(file);
			await service.refresh();
		} else await service.discard([row.path]);
	};
	const resolve = async (row: ChangeRow) => {
		const vaultPath = toVault(row.path);
		const file = vaultPath ? app.vault.getAbstractFileByPath(vaultPath) : null;
		if (file instanceof TFile && file.extension === 'md' && hasConflictBlocks(await app.vault.read(file)))
			if (
				!(await confirmAction(app, {
					title: t('sync.resolveTitle'),
					message: t('sync.resolveMarkers', { path: row.path }),
					action: t('sync.markResolved'),
				}))
			)
				return;
		await service.markResolved([row.path]);
	};

	const rowActions = (row: ChangeRow, key: string) => (
		<>
			{row.kind !== 'untracked' && (
				<ActionButton
					size="icon-xs"
					label={diff?.key === key ? t('sync.hideDiff') : t('sync.showDiff')}
					aria-pressed={diff?.key === key}
					onClick={() => setDiff(diff?.key === key ? null : { key, path: row.path, staged: row.kind === 'staged' })}
				>
					<FileDiff />
				</ActionButton>
			)}
			{row.kind === 'staged' && (
				<ActionButton size="icon-xs" label={t('sync.unstage')} disabled={busy} onClick={() => void service.unstage([row.path]).catch(host.report)}>
					<Minus />
				</ActionButton>
			)}
			{(row.kind === 'changed' || row.kind === 'untracked') && (
				<ActionButton size="icon-xs" label={t('sync.discard')} disabled={busy} onClick={() => void discard(row).catch(host.report)}>
					<Undo2 />
				</ActionButton>
			)}
			{(row.kind === 'changed' || row.kind === 'untracked') && (
				<ActionButton size="icon-xs" label={t('sync.stage')} disabled={busy} onClick={() => void service.stage([row.path]).catch(host.report)}>
					<Plus />
				</ActionButton>
			)}
			{row.kind === 'conflict' && (
				<ActionButton size="icon-xs" label={t('sync.markResolved')} disabled={busy} onClick={() => void resolve(row).catch(host.report)}>
					<Check />
				</ActionButton>
			)}
		</>
	);

	const { nodes, rows, folderIds } = useMemo(() => {
		const rowsById = new Map<string, ChangeRow>();
		const folders: string[] = [];
		const fileNode = (group: GroupKind, row: ChangeRow, label: string, description?: string): TreeNode => {
			const id = fileId(group, row.path);
			rowsById.set(id, row);
			const icon = defaultFileIcon(row.path);
			return {
				id,
				label,
				description,
				icon: lucideIconId(icon.icon),
				iconColor: icon.color ?? undefined,
				badge: <StatusLetter code={row.code} />,
				title: row.from ? `${row.from} → ${row.path}` : row.path,
				actions: rowActions(row, id),
			};
		};
		const treeNodes = (group: GroupKind, list: readonly ChangeTreeNode[]): TreeNode[] =>
			list.map((node) => {
				if (!node.row) {
					const id = dirId(group, node.path);
					folders.push(id);
					const open = defaultFolderIcon(node.path, true);
					const closed = defaultFolderIcon(node.path, false);
					return {
						id,
						label: node.name,
						icon: lucideIconId(closed.icon),
						iconOpen: lucideIconId(open.icon),
						iconColor: closed.color ?? undefined,
						badge: node.count,
						title: node.path,
						children: treeNodes(group, node.children ?? []),
					};
				}
				return fileNode(group, node.row, node.name);
			});
		const result: TreeNode[] = [];
		for (const [group, list] of groups) {
			if (!list.length) continue;
			const id = groupId(group);
			folders.push(id);
			const children =
				view === 'tree'
					? treeNodes(group, buildChangeTree(list))
					: [...list]
							.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
							.map((row) => {
								const name = row.path.split('/').pop() ?? row.path;
								return fileNode(group, row, name, row.path.slice(0, row.path.length - name.length).replace(/\/$/, ''));
							});
			result.push({
				id,
				label: t(groupTitle[group]),
				icon: undefined,
				badge: list.length,
				children,
				actions:
					group === 'conflict' ? undefined : (
						<ActionButton
							size="icon-xs"
							label={group === 'staged' ? t('sync.unstageAll') : t('sync.stageAll')}
							disabled={busy}
							onClick={() => void (group === 'staged' ? service.unstageAll() : service.stageAll()).catch(host.report)}
						>
							{group === 'staged' ? <Minus /> : <Plus />}
						</ActionButton>
					),
			});
		}
		return { nodes: result, rows: rowsById, folderIds: folders };
		// eslint-disable-next-line react-hooks/exhaustive-deps -- the callbacks close over props that change with the lists
	}, [props.conflicts, props.staged, props.changed, view, busy, diff, service, toVault]);

	const expandedIds = useMemo(() => folderIds.filter((id) => !collapsed.includes(id)), [folderIds, collapsed]);
	// Visible rows decide the height: the tree is windowed, so it needs a bounded box.
	const visibleRows = useMemo(() => {
		const open = new Set(expandedIds);
		const count = (list: readonly TreeNode[]): number =>
			list.reduce((sum, node) => sum + 1 + (node.children && open.has(node.id) ? count(node.children) : 0), 0);
		return count(nodes);
	}, [nodes, expandedIds]);
	const total = props.conflicts.length + props.staged.length + props.changed.length;
	if (!total) return null;
	const height = Math.min(MAX_HEIGHT, visibleRows * ROW_HEIGHT + 8);

	return (
		<section className="space-y-2" aria-label={t('sync.groupChanges')}>
			<div className="flex items-center justify-end gap-2">
				<SegmentedControl<ChangeView>
					size="sm"
					ariaLabel={t('sync.view')}
					value={view}
					onChange={onViewChange}
					options={[
						{ value: 'flat', label: <List className="size-3.5" />, ariaLabel: t('sync.view.flat'), tooltip: t('sync.view.flat') },
						{ value: 'tree', label: <ListTree className="size-3.5" />, ariaLabel: t('sync.view.tree'), tooltip: t('sync.view.tree') },
					]}
				/>
			</div>
			<div className="rounded-lg border border-border" style={{ height }}>
				<Tree
					nodes={nodes}
					ariaLabel={t('sync.groupChanges')}
					expandedIds={expandedIds}
					onExpandedChange={(next) => setCollapsed(folderIds.filter((id) => !next.includes(id)))}
					virtualizeAfter={100}
					onSelect={(id) => {
						const row = rows.get(id);
						if (row) openFile(row);
					}}
				/>
			</div>
			{diff && (
				<div className="overflow-hidden rounded-lg border border-border">
					<header className="flex items-center gap-2 border-b border-border px-3 py-1 text-xs">
						<span className="min-w-0 flex-1 truncate font-mono" title={diff.path}>
							{diff.path}
						</span>
						<ActionButton size="icon-xs" label={t('sync.hideDiff')} onClick={() => setDiff(null)}>
							<X />
						</ActionButton>
					</header>
					<Diff service={service} path={diff.path} staged={diff.staged} />
				</div>
			)}
		</section>
	);
}

