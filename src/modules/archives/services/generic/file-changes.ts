import { BELONGING_TYPE_ID, BELONGINGS_CHANGED } from '../../api';
import { FILE_CHANGES, type FileChangeBatch } from '../../../../host/obsidian/file-changes';
import type { DomainEvents } from '../../../../shared/events/domain-events';
import { ARCHIVES_DRAFT_ROOT } from '../../../../shared/storage/vault-layout';
import type { ArchiveRuntime, ArchiveDraftStore } from './runtime';

type Events = Pick<DomainEvents, 'on' | 'emit'>;
const publish = (events: Events, path: string, folder = false) => events.emit(FILE_CHANGES, {
	rescan: false, changes: [{ kind: 'invalidate', path, folder }],
});

/** The runtime parses raw Markdown and checks its read epoch/version; metadata cache contents are never an authority. */
export function bindArchiveFileChanges(runtime: ArchiveRuntime, events: Events, lifetime: { register(cleanup: () => void): void }): void {
	events.on(FILE_CHANGES, (batch: FileChangeBatch) => {
		if (batch.rescan) return runtime.rescan();
		for (const change of batch.changes) {
			if (change.kind === 'delete') { runtime.fileDeleted(change.path, change.folder); continue; }
			if (change.kind === 'rename' && change.oldPath) runtime.fileDeleted(change.oldPath, change.folder);
			if (change.folder) {
				if (change.kind === 'invalidate' || change.kind === 'rename') runtime.fileDeleted(change.path, true);
				for (const file of runtime.files.getMarkdownFiles())
					if (file.path.startsWith(change.path + '/')) runtime.fileChanged(file);
			} else {
				const file = runtime.files.getFileByPath(change.path);
				if (file) runtime.fileChanged(file);
				else runtime.fileDeleted(change.path);
			}
		}
		return undefined;
	}, { lifetime });
	lifetime.register(runtime.subscribeCommitted(path => {
		publish(events, path);
		const entity = runtime.index.entity(path);
		if (entity?.typeId === BELONGING_TYPE_ID) events.emit(BELONGINGS_CHANGED, { id: entity.id, contentHash: entity.contentHash });
	}));
}

/** Hidden adapter writes have no Vault events. Publish only after the repository has confirmed the write/removal. */
export function draftStoreWithInvalidation(store: ArchiveDraftStore, events: Events, signal: AbortSignal): ArchiveDraftStore {
	return {
		list: root => store.list(root),
		async write(root, id, value) {
			await store.write(root, id, value);
			if (!signal.aborted) publish(events, ARCHIVES_DRAFT_ROOT, true);
		},
		async remove(root, id) {
			await store.remove(root, id);
			if (!signal.aborted) publish(events, ARCHIVES_DRAFT_ROOT, true);
		},
	};
}
