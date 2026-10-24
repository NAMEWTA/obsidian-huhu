import type { PanelModel, PanelTree, WorkbenchTarget } from '../../../app/contracts/workbench';
import { t } from '../../../shared/i18n';
import type { ArchivesWorkbench } from '../api';
import { emptyQuery, type ContactsIndex } from '../core/index-store';
import type { ArchiveRecord, RecordKind } from '../core/model';

type TreeNode = PanelTree['nodes'][number];

/** The two group rows. Record rows use their file path as id, which never starts with `kind:`. */
const GROUP_PREFIX = 'kind:';
const KINDS: readonly RecordKind[] = ['person', 'company'];
const groupId = (kind: RecordKind) => GROUP_PREFIX + kind;

/** What the panel reads from the archives controller. */
export interface ArchivesPanelSource {
	readonly index: ContactsIndex;
	readonly loading: boolean;
	/** Starts the index load when nothing has asked for it yet. */
	ensureLoaded(): Promise<void>;
}

function recordNode(record: ArchiveRecord): TreeNode {
	const name = record.fields.name;
	return { id: record.path, label: name || record.path.split('/').at(-2) || record.path, avatar: [...name][0] ?? '?' };
}

/** The tree nodes: one group per kind with its records, in the index's name order. */
export function archiveTreeNodes(index: ContactsIndex): TreeNode[] {
	return KINDS.map((kind): TreeNode => {
		const records = index.query({ ...emptyQuery(), kind });
		return {
			id: groupId(kind),
			label: t(kind === 'person' ? 'workbench.people' : 'workbench.companies'),
			icon: kind === 'person' ? 'lucide-user' : 'lucide-building-2',
			badge: records.length,
			children: records.map(recordNode),
		};
	});
}

/** The row to highlight: the open record, or the group of the list being shown. */
export function archiveSelectedId(index: ContactsIndex, target: WorkbenchTarget): string {
	const resource = target.resourceId;
	const record = resource ? (index.get(resource) ?? index.byPath.get(resource)) : undefined;
	if (record) return record.path;
	return groupId(target.section === 'company' ? 'company' : 'person');
}

/** Where a clicked row goes: a group opens its list, a record opens its detail. */
export function archiveRowTarget(index: ContactsIndex, id: string): WorkbenchTarget | undefined {
	if (id.startsWith(GROUP_PREFIX)) {
		const kind = id.slice(GROUP_PREFIX.length);
		return kind === 'person' || kind === 'company' ? { feature: 'contacts', section: kind } : undefined;
	}
	const record = index.byPath.get(id);
	return record ? { feature: 'contacts', section: record.kind, resourceId: record.id || record.path } : undefined;
}

export function archiveTitle(target: WorkbenchTarget): string {
	return t(target.section === 'company' ? 'contacts.pageTitleCompany' : 'contacts.pageTitlePerson');
}

/** The `archives.workbench` service. `invalidate` is called whenever the index changes, so the tree is built once per change. */
export function archivesWorkbench(source: () => ArchivesPanelSource | undefined): ArchivesWorkbench & { invalidate(): void } {
	const listeners = new Set<() => void>();
	let cache: { index: ContactsIndex; loading: boolean; nodes: TreeNode[] } | undefined;
	return {
		invalidate() {
			cache = undefined;
			for (const listener of [...listeners]) listener();
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		title: archiveTitle,
		panel(target): PanelModel {
			const controller = source();
			if (!controller) return { sections: [] };
			void controller.ensureLoaded().catch(() => undefined);
			if (!cache || cache.index !== controller.index || cache.loading !== controller.loading) {
				cache = { index: controller.index, loading: controller.loading, nodes: archiveTreeNodes(controller.index) };
			}
			const { index } = controller;
			return {
				searchable: true,
				sections: [],
				tree: {
					label: t('workbench.contacts'),
					nodes: cache.nodes,
					selectedId: archiveSelectedId(index, target),
					defaultExpandedIds: KINDS.map(groupId),
					folderClick: 'expand',
					emptyText: controller.loading ? t('contacts.loading') : t('contacts.empty'),
					target: (id) => archiveRowTarget(index, id),
				},
			};
		},
	};
}
