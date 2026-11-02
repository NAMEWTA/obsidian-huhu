import { textHash } from '../../../shared/storage/text-edits';
import type { ResolvedEndpoint, RevisionRef, TextSnapshot } from '../core/history';
import { GitError } from '../core/errors';

export const isInlineRevision = (ref: RevisionRef): ref is Extract<RevisionRef, { kind: 'editor-buffer' | 'local-snapshot' | 'empty' }> =>
	ref.kind === 'editor-buffer' || ref.kind === 'local-snapshot' || ref.kind === 'empty';

/** Local/editor sources need neither a Git process nor a repository; exact text and UTF-8 limits still apply. */
export async function resolveInlineRevision(ref: RevisionRef, repositoryId: string, signal?: AbortSignal): Promise<ResolvedEndpoint> {
	if (!isInlineRevision(ref)) throw new GitError('not-repo');
	if (signal?.aborted) throw new GitError('cancelled');
	const base = { repositoryId, ref: Object.freeze({ ...ref }), path: ref.path, label: ref.kind, id: `${repositoryId}:${ref.kind}:${ref.path}` };
	if (ref.kind === 'empty') return { ...base, status: 'missing', reason: 'empty' };
	const bytes = new TextEncoder().encode(ref.text);
	const limit = 2 * 1024 * 1024;
	if (bytes.byteLength > limit) return { ...base, status: 'too-large', byteLength: bytes.byteLength, limit };
	if (bytes.includes(0)) return { ...base, status: 'binary', byteLength: bytes.byteLength, reason: 'nul' };
	if (new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes) !== ref.text)
		return { ...base, status: 'error', code: 'encoding', message: 'versioning.localHistory.encoding' };
	const hash = await textHash(ref.text);
	if (signal?.aborted) throw new GitError('cancelled');
	const endings = new Set(ref.text.match(/\r\n|\r|\n/g) ?? []);
	const eol: TextSnapshot['eol'] = endings.size > 1 ? 'mixed' : endings.has('\r\n') ? 'crlf' : endings.has('\r') ? 'cr' : endings.has('\n') ? 'lf' : 'none';
	return Object.freeze({ ...base, id: `${base.id}:${ref.kind === 'editor-buffer' ? ref.generation : ref.snapshotId}:${hash}`, status: 'text',
		snapshot: Object.freeze({ text: ref.text, hash, byteLength: bytes.byteLength, encoding: 'utf-8', eol,
			hasBom: ref.text.startsWith('\ufeff'), endsWithNewline: /[\r\n]$/.test(ref.text) }) });
}
