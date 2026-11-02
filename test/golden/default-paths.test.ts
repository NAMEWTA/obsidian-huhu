import { BoardStore } from '../../src/modules/home/services/board-store';
import type { HomeHost } from '../../src/modules/home/services/home-host';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../src/modules/home/core/board/types/model';
import { vaultContactsFiles } from '../../src/modules/archives/platform/vault-files';
import { ArchiveRuntime } from '../../src/modules/archives/services/generic/runtime';
import { ArchivesApplication } from '../../src/modules/archives/services/generic/application';
import { afterEach, expect, test, vi } from 'vitest';
import { temporaryVault } from './temporary-vault';
import { setLanguage } from '../../src/shared/i18n';
import { createHuhuNote } from '../../src/app/content/new-note';
import { createMemoFile } from '../../src/modules/home/platform/vault/memo-files';
import { createVaultNote } from '../../src/modules/home/platform/vault/vault-notes';
import { MarkdownCollectionStorage } from '../../src/host/obsidian/storage/document-collection';
import { expenseDocuments } from '../../src/modules/home/core/expense/documents';
import { habitDocuments } from '../../src/modules/home/core/habit/documents';
import { pomodoroDocuments } from '../../src/modules/home/core/pomodoro/documents';
import { readingDocuments } from '../../src/modules/home/core/reading/documents';
import { INBOX_ROOT, captureDayPathFor, VISIBLE_NAMES } from '../../src/shared/storage/vault-layout';
import { periodicNotePath } from '../../src/shared/periodic-paths';
import type { DocumentCollectionCodec } from '../../src/shared/storage/document-collection';
const habits: ReturnType<typeof habitDocuments.empty> = {
	version: 1,
	habits: [
		{ id: 'habit-0000-0000-read', name: '阅读', createdAt: '2026-09-01' },
		{ id: 'habit-0000-0000-walk', name: 'Walk: 30 min', createdAt: '2026-09-15' },
	],
	records: {
		'2026-10-01': ['habit-0000-0000-read'],
		'2026-10-02': ['habit-0000-0000-read', 'habit-0000-0000-walk'],
	},
};

const expenses: ReturnType<typeof expenseDocuments.empty> = {
	version: 1,
	records: [
		{
			id: 'exp-1',
			type: 'expense',
			amount: 32.5,
			category: 'food',
			note: '午饭 | 同事',
			date: '2026-10-01',
			createdAt: 1790000000000,
		},
		{ id: 'exp-2', type: 'income', amount: 1200, category: 'salary', date: '2026-10-01', createdAt: 1790000100000 },
		{ id: 'exp-3', type: 'expense', amount: 8, category: '咖啡', date: '2026-10-03', createdAt: 1790200000000 },
	],
	lastCategory: { expense: 'food', income: 'salary' },
	customCategories: { expense: ['咖啡'] },
	categoryOrder: { expense: ['咖啡', 'food'] },
	primaryCategories: { expense: ['日常'] },
	categoryParents: { expense: { 咖啡: '日常', food: '日常' } },
};

const pomodoro: ReturnType<typeof pomodoroDocuments.empty> = {
	version: 2,
	currentActivity: '写作',
	tags: [
		{ name: '写作', pinned: true },
		{ name: 'Review', pinned: false },
	],
	sessions: [
		{
			date: '2026-10-02',
			completed: 2,
			records: [
				{
					timestamp: '2026-10-02T09:00:00.000Z',
					activity: '写作',
					duration: 25,
					interruptions: 1,
					breakMinutes: 5,
					breakCompleted: true,
				},
				{ timestamp: '2026-10-02T10:00:00.000Z', activity: 'Review', duration: 20 },
			],
		},
	],
};

const reading: ReturnType<typeof readingDocuments.empty> = {
	activeBooks: [
		{
			id: 'book-0000-0000-dune',
			title: 'Dune: Book 1',
			author: 'Frank Herbert',
			coverUrl: '',
			isbn: '9780441013593',
			source: 'manual',
			currentPage: 120,
			totalPages: 612,
			finished: false,
		},
	],
	sessions: [
		{
			date: '2026-10-04',
			records: [
				{
					timestamp: '2026-10-04T20:00:00.000Z',
					bookTitle: 'Dune: Book 1',
					bookAuthor: 'Frank Herbert',
					coverUrl: '',
					durationSeconds: 1800,
					isbn: '9780441013593',
					startPage: 100,
					endPage: 120,
					finished: false,
				},
			],
		},
	],
};

afterEach(() => {
	vi.useRealTimers();
	setLanguage('zh');
});

test.each(['en', 'zh'] as const)(
	'real temporary %s vault uses stable defaults, reopens and leaves old trees byte-identical',
	async (language) => {
		vi.useFakeTimers({ now: new Date('2026-10-31T12:00:00'), toFake: ['Date'] });
		setLanguage(language);
		const old = {
			'huhu/笔记/旧.md': '旧内容\r\n',
			'huhu/收件箱/旧.md': 'inbox old',
			'huhu/记账/分类.md': 'expenses old',
			'huhu/档案/个人档案/人/基本信息.md': 'archive old',
		};
		const vault = temporaryVault(old);
		try {
			const first = await createHuhuNote(vault.app);
			expect(first.path).toBe('huhu/notes/2026-10-31-new-note.md');
			await vault.app.vault.createFolder('huhu/notes/2026-10-31-new-note-2.md');
			setLanguage(language === 'en' ? 'zh' : 'en');
			expect((await createHuhuNote(vault.app)).path).toBe('huhu/notes/2026-10-31-new-note-3.md');
			expect((await createMemoFile(vault.app, INBOX_ROOT, '')).path).toBe(
				'huhu/inbox/2026-10-31-1200-untitled.md',
			);
			expect((await createMemoFile(vault.app, '我的 文件夹/子目录', '我的 标题', '原文 内容')).path).toBe(
				'我的 文件夹/子目录/2026-10-31-1200-我的-标题.md',
			);
			expect(vault.read('我的 文件夹/子目录/2026-10-31-1200-我的-标题.md')).toContain('原文 内容');
			expect((await createVaultNote(vault.app, '我的 文件夹', '...')).path).toBe('我的 文件夹/untitled.md');
			expect(captureDayPathFor(INBOX_ROOT, '2026-10-31')).toBe('huhu/inbox/2026-10-31-captures.md');
			const host = {
				app: vault.app,
				settings: { ...DEFAULT_DASHBOARD_SETTINGS, modules: { dashboard: true } },
				subscribeSettings: () => () => {},
				workbenchRefresh: () => {},
			} as unknown as HomeHost;
			const board = new BoardStore(host, '.huhu/dashboards/dashboard');
			await board.capture('第一条');
			await board.capture('Second');
			await board.dispose();
			expect(vault.read('huhu/inbox/2026-10-31-captures.md')).toContain('- 12:00 第一条\n- 12:00 Second');
			expect(periodicNotePath('我的 日志', 'week', new Date(2026, 9, 31), 1)).toBe(
				'我的 日志/weekly/2026/2026-w44.md',
			);
			async function collection<T>(codec: DocumentCollectionCodec<T>, file: string, data: T) {
				const key = `${codec.root}/${file}`;
				const storage = new MarkdownCollectionStorage(vault.app, codec, key);
				await storage.read(key);
				await storage.write(key, JSON.stringify(data));
				storage.dispose();
				const reopened = new MarkdownCollectionStorage(vault.app, codec, key);
				expect(JSON.parse(await reopened.read(key))).toEqual(data);
				reopened.dispose();
			}
			await collection(expenseDocuments, VISIBLE_NAMES.json.expense, expenses);
			await collection(habitDocuments, VISIBLE_NAMES.json.habit, habits);
			await collection(pomodoroDocuments, VISIBLE_NAMES.json.pomodoro, pomodoro);
			await collection(readingDocuments, VISIBLE_NAMES.json.reading, reading);
			expect(vault.read('huhu/expenses/categories.md')).toContain('expense-settings');
			expect(vault.read('huhu/pomodoro/activities.md')).toContain('pomodoro');
			const port = vaultContactsFiles(vault.app, () => 'guide');
			const runtime = await ArchiveRuntime.create(port, () => 'huhu/archives');
			const application = new ArchivesApplication(runtime);
			await application.commands.initialize();
			const person = await application.commands.create({
				operationId: 'person-one',
				typeId: 'type-person',
				values: { name: '我的 客户' },
			});
			expect(person.path).toBe('huhu/archives/people/我的-客户-person-one/profile.md');
			const blank = await application.commands.create({
				operationId: 'person-draft',
				typeId: 'type-person',
				values: {},
				lifecycle: 'draft',
			});
			expect(blank.path).toBe('huhu/archives/people/untitled-person-draft/profile.md');
			const schema = runtime.index.definition('type-person');
			expect(schema).toBeDefined();
			expect(schema!.revisionId).toBe('preset-type-person-v2');
			expect(schema!.contentHash).toBeTruthy();
			const originalRecord = runtime.index.get(person.id);
			expect(originalRecord).toBeDefined();
			expect(runtime.index.schema(originalRecord!.schemaRevisionId)).toEqual(schema);
			runtime.dispose();
			setLanguage(language);
			const reopened = await ArchiveRuntime.create(port, () => 'huhu/archives');
			await reopened.ensureLoaded();
			const restoredSchema = reopened.index.definition('type-person');
			expect(restoredSchema).toBeDefined();
			expect(restoredSchema!.revisionId).toBe(schema!.revisionId);
			expect(restoredSchema!.contentHash).toBe(schema!.contentHash);
			expect(restoredSchema).toEqual(schema);
			for (const id of ['person-one', 'person-draft']) {
				const record = reopened.index.get(id);
				expect(record).toBeDefined();
				expect(record!.schemaRevisionId).toBe(restoredSchema!.revisionId);
				expect(reopened.index.schema(record!.schemaRevisionId)).toEqual(restoredSchema);
			}
			expect(reopened.index.get('person-one')?.path).toBe(person.path);
			reopened.dispose();
			// Vault index enumeration may expose old file metadata; no targeted read/write/detection of the old roots occurs.
			expect(
				vault.operations.filter(
					({ op, path }) =>
						op !== 'lookup' &&
						Object.keys(old).some(
							(oldPath) => path === oldPath || path === oldPath.slice(0, oldPath.lastIndexOf('/')),
						),
				),
			).toEqual([]);
			for (const [path, text] of Object.entries(old)) expect(vault.read(path)).toBe(text);
		} finally {
			vault.close();
		}
	},
);
