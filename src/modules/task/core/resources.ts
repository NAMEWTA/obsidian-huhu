import { TaskError, type TaskResource } from './model';

/** Vault-relative, visible resource paths only. Never interprets URLs, filesystem roots or traversal. */
export function validResourcePath(path: unknown): path is string {
	return (
		typeof path === 'string' &&
		path.length > 0 &&
		path.length <= 2048 &&
		!/[\\:*?"<>|]/.test(path) &&
		![...path].some((char) => char.charCodeAt(0) < 32) &&
		path.split('/').every((part) => !!part && part.trim() === part && !part.startsWith('.'))
	);
}
export function resourceKey(resource: TaskResource): string {
	return resource.kind === 'archive' ? `archive:${resource.id}` : `${resource.kind}:${resource.path}`;
}
export function normalizeResources(resources: unknown): TaskResource[] {
	if (!Array.isArray(resources) || resources.length > 100)
		throw new TaskError('invalid-input', 'At most 100 related resources');
	const result = new Map<string, TaskResource>();
	const entries: readonly unknown[] = resources;
	for (const entry of entries) {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry))
			throw new TaskError('invalid-input', 'Invalid resource');
		const resource = entry as Record<string, unknown>;
		if (resource.kind === 'archive') {
			if (
				typeof resource.id !== 'string' ||
				!resource.id ||
				resource.id.length > 256 ||
				/[\r\n\0]/.test(resource.id)
			)
				throw new TaskError('invalid-input', 'Invalid archive identity');
			const normalized: TaskResource = { kind: 'archive', id: resource.id };
			result.set(resourceKey(normalized), normalized);
		} else if ((resource.kind === 'file' || resource.kind === 'folder') && validResourcePath(resource.path)) {
			const normalized: TaskResource = { kind: resource.kind, path: resource.path };
			result.set(resourceKey(normalized), normalized);
		} else throw new TaskError('invalid-input', 'Invalid resource path');
	}
	return [...result.values()];
}
export function resourceMatches(item: TaskResource, query: TaskResource, recursive = false): boolean {
	if (resourceKey(item) === resourceKey(query)) return true;
	return recursive && query.kind === 'folder' && item.kind !== 'archive' && item.path.startsWith(`${query.path}/`);
}
export function renamedResource(resource: TaskResource, oldPath: string, path: string): TaskResource {
	if (resource.kind === 'archive') return resource;
	if (resource.path === oldPath) return { ...resource, path };
	return resource.path.startsWith(`${oldPath}/`)
		? { ...resource, path: path + resource.path.slice(oldPath.length) }
		: resource;
}
