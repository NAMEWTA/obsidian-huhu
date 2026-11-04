import { expect, test, vi } from 'vitest';
import { MarkdownView, type Editor, type WorkspaceLeaf } from 'obsidian';
import { contentFiles } from '../../../host/obsidian/storage/content-files';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { createDiaryWriting, type DiaryJournal } from './diary-writing';

function fixture(initial: Record<string, string> = { 'Journal/2026-11-04.md': 'Original body' }) {
	const vault = memoryVault(initial), path = 'Journal/2026-11-04.md';
	const leaves: WorkspaceLeaf[] = [];
	Object.assign(vault.app.workspace, { on: vault.app.vault.on, offref: vault.app.vault.offref, getLeavesOfType: () => leaves });
	const prepare = vi.fn<DiaryJournal['prepare']>(async () => ({ status: 'ready', path, content: '# Template' }));
	const journal: DiaryJournal = { inspect: () => ({ period: 'day', date: '2026-11-04', title: 'Day', path, status: vault.contents.has(path) ? 'existing' : 'missing', active: false }), prepare, open: async () => true, subscribe: () => () => {} };
	const service = createDiaryWriting(vault.app, journal);
	const create = vi.spyOn(vault.app.vault, 'create'), process = vi.spyOn(vault.app.vault, 'process'), mkdir = vi.spyOn(vault.app.vault, 'createFolder');
	return { vault, path, leaves, prepare, journal, service, create, process, mkdir };
}

test('begin and empty save never write; existing save appends once through the actual coordinator', async () => {
	const f = fixture();
	try {
		const draft = await f.service.begin('2026-11-04');
		expect(await f.service.save(draft, ' ')).toEqual({ status: 'empty' });
		expect(f.create).not.toHaveBeenCalled(); expect(f.process).not.toHaveBeenCalled(); expect(f.mkdir).not.toHaveBeenCalled();
		expect(await f.service.save(draft, 'New note')).toMatchObject({ status: 'saved', path: f.path });
		expect(f.vault.contents.get(f.path)).toBe('Original body\n\nNew note\n');
		expect(f.prepare).not.toHaveBeenCalled(); expect(f.process).toHaveBeenCalledOnce();
		expect(await f.service.save(draft, 'New note')).toEqual({ status: 'busy' });
	} finally { f.service.dispose(); }
});

test('a missing day prepares once and creates template plus real text once, including simultaneous clicks', async () => {
	const f = fixture({});
	try {
		const draft = await f.service.begin('2026-11-04');
		expect(f.prepare).not.toHaveBeenCalled(); expect(f.create).not.toHaveBeenCalled();
		const pending = f.service.save(draft, 'First entry');
		expect(await f.service.save(draft, 'First entry')).toEqual({ status: 'busy' });
		expect(await pending).toMatchObject({ status: 'saved' });
		expect(f.prepare).toHaveBeenCalledOnce(); expect(f.create).toHaveBeenCalledOnce();
		expect(f.vault.contents.get(f.path)).toBe('# Template\n\nFirst entry\n');
	} finally { f.service.dispose(); }
});

test('template cancellation and unavailability never create empty files or folders', async () => {
	for (const status of ['cancelled', 'unavailable'] as const) {
		const f = fixture({});
		try {
			f.prepare.mockResolvedValue({ status, code: 'template-input-required' });
			const draft = await f.service.begin('2026-11-04');
			expect(await f.service.save(draft, 'Keep my draft')).toEqual({ status });
			expect(f.create).not.toHaveBeenCalled(); expect(f.mkdir).not.toHaveBeenCalled(); expect(f.vault.writes).toBe(0);
		} finally { f.service.dispose(); }
	}
});

test('disk changes and unsaved native editors are rejected without touching either source', async () => {
	const f = fixture();
	try {
		const draft = await f.service.begin('2026-11-04');
		f.vault.contents.set(f.path, 'External edit');
		expect(await f.service.save(draft, 'Append')).toEqual({ status: 'conflict' });
		expect(f.vault.contents.get(f.path)).toBe('External edit');
		const transaction = vi.fn(), save = vi.fn();
		f.leaves.push({ view: Object.assign(Object.create(MarkdownView.prototype) as MarkdownView, { file: f.vault.file(f.path), editor: { getValue: () => 'Unsaved editor', transaction } as unknown as Editor, save }) } as unknown as WorkspaceLeaf);
		const dirty = await f.service.begin('2026-11-04');
		expect(await f.service.save(dirty, 'Append')).toEqual({ status: 'conflict' });
		expect(f.process).not.toHaveBeenCalled(); expect(transaction).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
	} finally { f.service.dispose(); }
});


test('a managed editor draft appearing after begin blocks the real mutation without writes', async () => {
	const f = fixture();
	const draft = await f.service.begin('2026-11-04');
	const lease = contentFiles(f.vault.app).claimDraft(f.path, () => 'Another unsaved draft');
	try {
		expect(await f.service.save(draft, 'Append')).toEqual({ status: 'conflict' });
		expect(f.vault.contents.get(f.path)).toBe('Original body');
		expect(f.process).not.toHaveBeenCalled();
	} finally { lease.release(); f.service.dispose(); }
});

test('cancellation while a template is preparing prevents creation and a changed root cannot retarget the draft', async () => {
	const f = fixture({});
	let finish!: (value: Awaited<ReturnType<DiaryJournal['prepare']>>) => void;
	try {
		f.prepare.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
		const draft = await f.service.begin('2026-11-04'), controller = new AbortController();
		const pending = f.service.save(draft, 'Draft', controller.signal);
		controller.abort(); finish({ status: 'ready', path: f.path, content: '# Template' });
		expect(await pending).toEqual({ status: 'cancelled' });
		expect(f.create).not.toHaveBeenCalled(); expect(f.mkdir).not.toHaveBeenCalled();
		f.journal.inspect = () => ({ period: 'day', date: draft.date, title: 'Other', path: 'Other/2026-11-04.md', status: 'missing', active: false });
		expect(await f.service.save(draft, 'Draft')).toEqual({ status: 'conflict' });
		expect(f.create).not.toHaveBeenCalled();
	} finally { f.service.dispose(); }
});

test('a periodic root change during the coordinator recheck cannot commit to the old file', async () => {
	const f = fixture();
	try {
		const draft = await f.service.begin('2026-11-04'), read = f.vault.app.vault.read;
		let reads = 0;
		vi.spyOn(f.vault.app.vault, 'read').mockImplementation(async file => {
			const text = await read(file);
			if (++reads === 2) f.journal.inspect = () => ({ period: 'day', date: draft.date, title: 'Other', path: 'Other/2026-11-04.md', status: 'missing', active: false });
			return text;
		});
		expect(await f.service.save(draft, 'Append')).toEqual({ status: 'conflict' });
		expect(f.vault.contents.get(f.path)).toBe('Original body'); expect(f.process).not.toHaveBeenCalled();
	} finally { f.service.dispose(); }
});
