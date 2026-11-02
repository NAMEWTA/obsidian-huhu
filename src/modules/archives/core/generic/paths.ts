import { huhuName, ARCHIVE_PATHS } from '../../../../shared/storage/vault-layout';
import type { Definition } from '../schema/model';
import { ArchiveError } from '../schema/model';
import { safeRelativePath } from '../schema/value';
export { ARCHIVE_PATHS } from '../../../../shared/storage/vault-layout';
const categories = ARCHIVE_PATHS.categories;
export function definitionPath(root: string, kind: Definition['kind'], id: string, revision?: string): string {
	return `${root}/${ARCHIVE_PATHS.definitions}/${categories[kind]}/${id}/${revision ? `${ARCHIVE_PATHS.revisions}/${revision}.md` : ARCHIVE_PATHS.current}`;
}
export function relationPath(root: string, typeId: string, id: string): string {
	return `${root}/${ARCHIVE_PATHS.relations}/${typeId}/${id}.md`;
}
export function migrationPath(root: string, id: string): string {
	return `${root}/${ARCHIVE_PATHS.migrations}/${id}.md`;
}
export function backupPath(root: string, migrationId: string, ownerId: string): string {
	return `${root}/${ARCHIVE_PATHS.migrations}/${migrationId}/${ARCHIVE_PATHS.originals}/${ownerId}.md`;
}
export function entityPath(root: string, folder: string, label: string, id: string): string {
	return `${root}/${folder}/${huhuName(label)}-${id}/${ARCHIVE_PATHS.entry}`;
}
export function underRoot(root: string, path: string): boolean {
	return safeRelativePath(root) && path.startsWith(root + '/');
}
export function isDiscoveryPath(root: string, path: string): boolean {
	if (!underRoot(root, path) || !/\.md$/i.test(path)) return false;
	const tail = path.slice(root.length + 1);
	// Protect recovery originals inside the selected root, without discovering old default roots.
	const parts = tail.split('/');
	if (parts.length === 4 && parts[0] === '迁移记录' && parts[1] && parts[2] === '原文') return false;
	// Backups contain real huhu-id/frontmatter and must never become a second entity.
	return !tail.startsWith(ARCHIVE_PATHS.migrations + '/') || tail.split('/').length === 2;
}
export function assertRoot(root: string): void {
	if (!safeRelativePath(root)) throw new ArchiveError('invalid-folder');
}
