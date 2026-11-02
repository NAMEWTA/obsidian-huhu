import type { TextStorage } from '../../../shared/storage/ports';
import { textHash } from '../../../shared/storage/text-edits';

/** Collection requires every recovery copy to be understood; browsing's permissive backup fallback is separate. */
export async function readRecoveryCopies<T>(storage: TextStorage, path: string, valid: (value: unknown) => value is T, fallback: T) {
	const copies: Array<{ path: string; text: string; value: T }> = [];
	for (const file of [path, `${path}.backup`]) {
		if (!await storage.exists(file)) continue;
		const text = await storage.read(file);
		let value: unknown;
		try { value = JSON.parse(text); } catch { throw new Error('versioning.localHistory.retentionCorrupt'); }
		if (!valid(value)) throw new Error('versioning.localHistory.retentionCorrupt');
		copies.push({ path: file, text, value });
	}
	return { current: copies[0]?.value ?? fallback, copies,
		signature: await textHash(JSON.stringify(copies.map(copy => [copy.path, copy.text]))) };
}
