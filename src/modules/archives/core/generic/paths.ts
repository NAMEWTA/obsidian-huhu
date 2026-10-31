import { huhuName, ARCHIVE_PATHS } from '../../../../shared/storage/vault-layout';
import type { Definition } from '../schema/model';
import { ArchiveError } from '../schema/model';
import { safeRelativePath } from '../schema/value';
export { ARCHIVE_PATHS } from '../../../../shared/storage/vault-layout';
const categories: Record<Definition['kind'], string> = {
	type: '类型',
	form: '表单',
	template: '记录模板',
	'relation-type': '关系',
	view: '视图',
};
export function definitionPath(root: string, kind: Definition['kind'], id: string, revision?: string): string {
	return `${root}/${ARCHIVE_PATHS.definitions}/${categories[kind]}/${id}/${revision ? `修订/${revision}.md` : '当前.md'}`;
}
export function relationPath(root: string, typeId: string, id: string): string {
	return `${root}/${ARCHIVE_PATHS.relations}/${typeId}/${id}.md`;
}
export function migrationPath(root: string, id: string): string {
	return `${root}/${ARCHIVE_PATHS.migrations}/${id}.md`;
}
export function backupPath(root: string, migrationId: string, ownerId: string): string {
	return `${root}/${ARCHIVE_PATHS.migrations}/${migrationId}/原文/${ownerId}.md`;
}
export function entityPath(root: string, folder: string, label: string, id: string): string {
	return `${root}/${folder}/${huhuName(label)}-${id}/基本信息.md`;
}
export function underRoot(root: string, path: string): boolean {
	return safeRelativePath(root) && path.startsWith(root + '/');
}
export function isDiscoveryPath(root: string, path: string): boolean {
	if (!underRoot(root, path) || !/\.md$/i.test(path)) return false;
	const tail = path.slice(root.length + 1);
	// Backups contain real huhu-id/frontmatter and must never become a second entity.
	return !tail.startsWith(ARCHIVE_PATHS.migrations + '/') || tail.split('/').length === 2;
}
export function assertRoot(root: string): void {
	if (!safeRelativePath(root)) throw new ArchiveError('invalid-folder');
}
