import { HIDDEN_DOCUMENT_ROOTS } from './vault-layout';
import { validateHuhuPath } from './huhu-paths';

/** The hidden roots whose Markdown documents HUHU indexes itself. */
export const CONTENT_ROOTS: readonly string[] = HIDDEN_DOCUMENT_ROOTS;
const inContentRoot = (path: string) => CONTENT_ROOTS.some((root) => path === root || path.startsWith(root + '/'));

/** Classification and IO agree on both separators and the strict owned namespace. */
export function isContentPath(path: string): boolean {
	if (!path.startsWith('.huhu')) return false;
	try {
		return inContentRoot(validateHuhuPath(path));
	} catch {
		return false;
	}
}
export function contentPath(path: string): string {
	const normalized = validateHuhuPath(path);
	if (!inContentRoot(normalized)) throw new Error('huhu-content.invalid-path', { cause: path });
	return normalized;
}

/** Resolve a document before choosing managed IO or native Vault IO. Never route private paths as notes. */
export function vaultDocumentPath(input: string): string {
	const path = input.replaceAll('\\', '/');
	if (path === '.huhu' || path.startsWith('.huhu/')) return contentPath(path);
	if (
		!path ||
		path.startsWith('/') ||
		/^[a-z]:/i.test(path) ||
		[...path].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
		path.split('/').some((part) => !part || part.startsWith('.'))
	)
		throw new Error('huhu-content.invalid-path', { cause: path });
	return path;
}
