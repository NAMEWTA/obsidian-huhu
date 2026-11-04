import type { App, Component, EventRef } from 'obsidian';
import { contentFiles } from '../../../host/obsidian/storage/content-files';
import { DocumentMutationCoordinator } from '../../../host/obsidian/document-mutation';
import { DocumentMutationError, sameDocumentSnapshot, type DocumentSnapshot } from '../../../shared/storage/document-mutation';
import { ensureVaultFolder } from '../../../shared/vault-path';
import type { NavigatorPeriodicService } from '../api';

export type DiaryJournal = Pick<NavigatorPeriodicService, 'inspect' | 'prepare' | 'open' | 'subscribe'>;
export interface DiaryDraft { readonly date: string; readonly expected: DocumentSnapshot }
export type DiarySaveResult = { status: 'saved'; operationId: string; path: string } | { status: 'cancelled' | 'unavailable' | 'conflict' | 'failed' | 'empty' | 'busy' };
export function diaryDate(value: string): Date {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Invalid diary date');
	const date = new Date(2000, 0, 1); date.setFullYear(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)));
	if (`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` !== value) throw new RangeError('Invalid diary date');
	return date;
}
const append = (before: string, text: string) => before + (before ? before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n' : '') + text + '\n';

/** One page owns its coordinator and pending operation. No templates or writes happen in begin(). */
export function createDiaryWriting(app: App, journal: DiaryJournal) {
	const refs: EventRef[] = [];

	let alive = true, saving = false;
	let savingDraft: DiaryDraft | undefined;
	const sessions = new WeakSet<DiaryDraft>(), committed = new WeakSet<DiaryDraft>();
	const matches = (draft: DiaryDraft) => {
		const current = journal.inspect('day', diaryDate(draft.date));
		return alive && (current.status === 'existing' || current.status === 'missing') && current.path === draft.expected.path;
	};
	const documents = new DocumentMutationCoordinator(app, { lifetime: { registerEvent: (ref: EventRef) => refs.push(ref) } as unknown as Component, resolveLeaf: () => undefined, checkDrafts: (path, text) => {
		// The coordinator invokes this after async capture and immediately before its native mutation.
		if (savingDraft && path === savingDraft.expected.path && !matches(savingDraft)) throw new DocumentMutationError('identity-changed', path);
		try { contentFiles(app).checkEditor(path, text); } catch { throw new DocumentMutationError('editor-conflict', path); }
	} });
	return {
		async begin(date: string): Promise<DiaryDraft> {
			const info = journal.inspect('day', diaryDate(date));
			if (!alive || (info.status !== 'existing' && info.status !== 'missing')) throw new Error('Diary unavailable');
			const draft = { date, expected: await documents.capture(info.path) };
			if (!matches(draft)) throw new DocumentMutationError('identity-changed', info.path);
			sessions.add(draft); return draft;
		},
		async save(draft: DiaryDraft, text: string, signal?: AbortSignal): Promise<DiarySaveResult> {
			if (!text.trim()) return { status: 'empty' };
			if (saving || committed.has(draft)) return { status: 'busy' };
			if (!sessions.has(draft) || !matches(draft)) return { status: 'conflict' };
			if (signal?.aborted) return { status: 'cancelled' };
			saving = true; savingDraft = draft;
			try {
				const expected = draft.expected;
				if (expected.buffers.some(buffer => buffer.text.replace(/\r\n?/g, '\n') !== expected.diskText?.replace(/\r\n?/g, '\n'))) return { status: 'conflict' };
				let before = expected.text ?? '';
				if (!expected.exists) {
					const prepared = await journal.prepare('day', diaryDate(draft.date), { interactive: true, path: expected.path });
					if (prepared.status !== 'ready') return { status: prepared.status === 'cancelled' ? 'cancelled' : 'unavailable' };
					if (prepared.path !== expected.path) return { status: 'conflict' };
					before = prepared.content;
				}
				const operationId = crypto.randomUUID();
				return await documents.exclusive(expected.path, async () => {
					if (!matches(draft)) return { status: 'conflict' };
					if (signal?.aborted) return { status: 'cancelled' };
					if (!sameDocumentSnapshot(expected, await documents.capture(expected.path))) return { status: 'conflict' };
					if (!expected.exists) await ensureVaultFolder(app.vault, expected.path.slice(0, expected.path.lastIndexOf('/')));
					if (!matches(draft) || signal?.aborted) return { status: 'cancelled' };
					await documents.apply(expected, append(before, text), operationId);
					committed.add(draft);
					return { status: 'saved', operationId, path: expected.path };
				});
			} catch (error) { return { status: error instanceof DocumentMutationError && error.code !== 'write-unverified' ? 'conflict' : 'failed' }; }
			finally { saving = false; savingDraft = undefined; }
		},
		dispose() { alive = false; for (const ref of refs.splice(0)) app.workspace.offref(ref); },
	};
}
export type DiaryWriting = ReturnType<typeof createDiaryWriting>;
