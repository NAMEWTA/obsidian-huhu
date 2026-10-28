import { expect, test } from 'vitest';
import { DocumentMutationCoordinator } from '../../src/host/obsidian/document-mutation';
import { restoreHunks } from '../../src/modules/versioning/core/hunk-restore';
import { CheckpointStore } from '../../src/modules/versioning/services/checkpoint-store';
import { RestoreService } from '../../src/modules/versioning/services/restore-service';
import { calculateDiff } from '../../src/modules/versioning/ui/diff-model';
import { sameDocumentSnapshot, type DocumentMutationPort, type DocumentSnapshot } from '../../src/shared/storage/document-mutation';
import type { TextStorage } from '../../src/shared/storage/ports';

/** Actual native text conversion, with explicit in-memory document/storage ports; no Obsidian instance is started. */
function fixture(before: string) {
	const files = new Map<string, string>(), notes = new Map<string, DocumentSnapshot>();
	const events: string[] = [];
	notes.set('note.md', { path: 'note.md', exists: true, documentKey: 'original', text: before, diskText: before,
		originLeafId: 'leaf', buffers: [{ id: 'editor', generation: 1, text: before }] });
	const storage: TextStorage = {
		exists: async path => files.has(path), mkdir: async () => {},
		read: async path => { if (!files.has(path)) throw new Error('ENOENT'); return files.get(path)!; },
		write: async (path, text) => { files.set(path, text); },
	};
	const documents: DocumentMutationPort = {
		capture: async path => structuredClone(notes.get(path) ?? { path, exists: false, documentKey: `missing:${path}`,
			text: null, diskText: null, buffers: [] }),
		exclusive: (_path, work) => work(),
		editableText: DocumentMutationCoordinator.prototype.editableText,
		apply: async (expected, text) => {
			expect(sameDocumentSnapshot(expected, await documents.capture(expected.path))).toBe(true);
			events.push('write');
			const after: DocumentSnapshot = { ...expected, exists: text !== null, text, diskText: text,
				documentKey: text === null ? `missing:${expected.path}` : expected.exists ? expected.documentKey : 'created',
				buffers: text === null ? [] : expected.buffers.map(buffer => ({ ...buffer, generation: buffer.generation + 1, text })) };
			notes.set(expected.path, after); return structuredClone(after);
		},
	};
	const participant = {
		prepare: async () => { events.push('annotations-prepare'); return {}; },
		commit: async () => { events.push('annotations-commit'); return {}; }, abort: async () => {},
	};
	const service = new RestoreService({ documents, checkpoints: new CheckpointStore(storage, 'newlines'),
		gate: { run: (_id, work) => work(), capture: async () => 'same HEAD/index',
			hold: async () => { events.push('hold'); }, assertCheckpointProtection: async () => {} },
		participant: () => participant, assertHunkOrigin: () => {},
	});
	return { service, documents, files, notes, events };
}
const request = (text: string) => ({ source: { id: 'history', text }, targetPath: 'note.md', originLeafId: 'leaf', mode: 'replace-current' as const });
const origin = { id: 'context', path: 'note.md', leafId: 'leaf', generation: 1 };

test('actual CM proof and native conversion reject the minimal cross-boundary CR/LF merge before any writes', async () => {
	const source = 'old\r\rkeep', before = 'new\n\nkeep', f = fixture(before);
	try {
		const diff = calculateDiff({ id: 'minimal', left: source, right: before });
		const selected = restoreHunks(source, before, diff).map(hunk => hunk.id);
		expect(diff.precise).toBe(true); expect(selected).toEqual(['0:4:0:4']);
		const target = await f.service.captureTarget('note.md', 'leaf');
		// The pre-fix raw splice loses an unselected blank line through the real native conversion.
		expect(f.documents.editableText('old\r\nkeep', target)).toBe('old\nkeep');
		await expect(f.service.prepare({ ...request(source), hunks: { target, origin, diff, selected } }))
			.rejects.toThrow('versioning.restore.hunks-unavailable');
		expect(f.notes.get('note.md')!.text).toBe(before); expect(f.files.size).toBe(0); expect(f.events).toEqual([]);
	} finally { await f.service.dispose(); }
});

const unchanged = Array.from({ length: 10 }, (_, i) => `保持😀${i}\n`).join('');
test.each(['old\r\r', 'old\r\r\n', 'old\r\n\r\n', 'old\n\r', 'old\r\n\n'])(
	'actual prepare/apply preserves adjacent blank lines after native conversion: %j', async prefix => {
		const source = `\uFEFF${prefix}${unchanged}旧尾\r\n`, before = `\uFEFFnew\n\n${unchanged}新尾\n`;
		const unsafe = prefix === 'old\r\r' || prefix === 'old\r\r\n';
		for (const selection of ['first', 'last', 'both'] as const) {
			const f = fixture(before);
			try {
				const diff = calculateDiff({ id: selection, left: source, right: before });
				const hunks = restoreHunks(source, before, diff); expect(hunks).toHaveLength(2);
				const selected = (selection === 'both' ? hunks : [hunks[selection === 'first' ? 0 : 1]!]).map(hunk => hunk.id);
				const target = await f.service.captureTarget('note.md', 'leaf');
				const preparing = f.service.prepare({ ...request(source), hunks: { target, origin, diff, selected } });
				if (unsafe && selection !== 'last') {
					await expect(preparing).rejects.toThrow('versioning.restore.hunks-unavailable');
					expect(f.notes.get('note.md')!.text).toBe(before); expect(f.files.size).toBe(0); expect(f.events).toEqual([]);
					continue;
				}
				const plan = await preparing;
				const expected = `\uFEFF${selection === 'last' ? 'new' : 'old'}\n\n${unchanged}${selection === 'first' ? '新尾' : '旧尾'}\n`;
				expect(plan.afterText).toBe(expected);
				expect(f.documents.editableText(plan.afterText!, target)).toBe(expected);
				const receipt = await f.service.apply(plan.id);
				expect(f.notes.get('note.md')!.text).toBe(expected); expect(receipt.selectedHunks).toEqual(selected);
				expect(await f.service.readSnapshot(receipt.beforeObject!)).toBe(before);
				expect(f.events).toEqual(['hold', 'annotations-prepare', 'write', 'annotations-commit']);
				await f.service.undo(receipt.id); expect(f.notes.get('note.md')!.text).toBe(before);
			} finally { await f.service.dispose(); }
		}
	},
);

test('rejecting an unsafe partial splice does not prohibit whole restore or copy of the original historical text', async () => {
	for (const mode of ['replace-current', 'create-copy'] as const) {
		const f = fixture('new\n\nkeep');
		try {
			const plan = await f.service.prepare({ ...request('old\r\rkeep'), mode, copyPath: 'copy.md' });
			expect(plan.afterText).toBe(mode === 'replace-current' ? 'old\n\nkeep' : 'old\r\rkeep');
			const receipt = await f.service.apply(plan.id);
			expect(f.notes.get(mode === 'replace-current' ? 'note.md' : 'copy.md')!.text).toBe(plan.afterText);
			if (mode === 'create-copy') expect(f.notes.get('note.md')!.text).toBe('new\n\nkeep');
			await f.service.undo(receipt.id); expect(f.notes.get('note.md')!.text).toBe('new\n\nkeep');
		} finally { await f.service.dispose(); }
	}
});
