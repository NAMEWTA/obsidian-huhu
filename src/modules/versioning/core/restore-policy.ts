import { readMarkdownDocument, readYaml } from '../../../shared/storage/markdown-document';

/** Managed records carry identities and invariants that a whole-text restore cannot reconstruct. */
export function assertOrdinaryRestore(before: string | null, after: string | null): void {
	for (const text of [before, after]) {
		if (text === null) continue;
		try {
			const document = readYaml(readMarkdownDocument(text).yaml);
			if (document.has('huhu-type')) throw new Error('versioning.restore.managed-record');
		} catch {
			throw new Error('versioning.restore.managed-record');
		}
	}
}
