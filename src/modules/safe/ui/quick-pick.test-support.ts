import { FeedbackHost } from '../../../host/obsidian/feedback';
import { WriteQueue } from '../../../shared/storage/write-queue';
import { createEntry, makePayload } from '../core/model';
import { createContainer } from '../platform/crypto';
import { CipherRepository } from '../services/cipher-repository';
import { SafeService } from '../services/safe-service';

export const QUICK_PICK_MASTER = 'a long quick pick master password';
export const QUICK_PICK_SECRET = 'PRIVATE-SECRET-SENTINEL';
const credential = (n: number, username: string, password: string) => ({
	id: `c000000${n}-1111-4111-8111-111111111111`,
	username,
	password,
	notes: 'do-not-search-notes',
	phone: '',
	email: '',
	relations: [],
});
export const QUICK_PICK_ENTRIES = [
	createEntry(
		{
			title: 'GitHub workspace',
			url: 'https://github.com',
			icon: null,
			notes: '',
			tags: ['favorite'],
			credentials: [
				credential(1, 'source@example.test', QUICK_PICK_SECRET),
				credential(2, 'work-account', 'OTHER-PRIVATE-SECRET'),
			],
		},
		'e0000001-1111-4111-8111-111111111111',
		Date.parse('2026-11-04T00:00:00Z'),
	),
	createEntry(
		{
			title: 'Service portal',
			url: 'https://portal.example.test',
			icon: null,
			notes: '',
			tags: [],
			credentials: [credential(3, 'cloud@example.test', 'CLOUD-PRIVATE-SECRET')],
		},
		'e0000002-1111-4111-8111-111111111111',
		Date.parse('2026-11-04T00:00:00Z'),
	),
];
let seed: Promise<string> | undefined;

/** Real crypto/repository/service; only files, clipboard and feedback presentation are in-memory host ports. */
export async function quickPickFixture(
	win: Window,
	unlocked = true,
	ports: { pickBackup?: () => Promise<string | null> } = {},
) {
	seed ??= createContainer(QUICK_PICK_MASTER, makePayload(QUICK_PICK_ENTRIES)).then((value) => value.raw);
	const raw = await seed;
	const files = new Map([
		['vault.enc', raw],
		['vault.enc.backup', raw],
	]);
	const publications: string[] = [];
	const io = { beforeRead: undefined as ((name: string) => Promise<void>) | undefined };
	const clipboard = {
		text: '',
		writes: [] as string[],
		fail: false,
		beforeWrite: undefined as ((text: string) => Promise<void>) | undefined,
	};
	const feedback: string[] = [];
	const host = new FeedbackHost({
		mount: async () => {
			throw new Error('Use the native notice port');
		},
		notice: () => {
			const containerEl = win.document.createElement('div');
			return {
				containerEl,
				setMessage: (text) => {
					feedback.push(typeof text === 'string' ? text : (text.textContent ?? ''));
					containerEl.replaceChildren(text);
					return {} as never;
				},
				hide: () => containerEl.remove(),
			};
		},
	});
	host.bind(win);
	let stageSequence = 0;
	const service = new SafeService({
		repository: new CipherRepository({
			read: async (name) => {
				await io.beforeRead?.(name);
				return files.get(name) ?? null;
			},
			stage: async (text) => {
				const id = `stage-${++stageSequence}`;
				files.set(id, text);
				return id;
			},
			publish: async (stage, name) => {
				publications.push(name);
				files.set(name, files.get(stage)!);
				files.delete(stage);
			},
			discard: async (name) => {
				files.delete(name);
			},
		}),
		queue: new WriteQueue(),
		timers: { set: (run, ms) => win.setTimeout(run, ms), clear: (id) => win.clearTimeout(id) },
		actions: () => ({
			clipboard: {
				readText: async () => clipboard.text,
				writeText: async (value) => {
					await clipboard.beforeWrite?.(value);
					if (clipboard.fail) throw new Error(QUICK_PICK_SECRET);
					clipboard.text = value;
					clipboard.writes.push(value);
				},
			},
			pickBackup: ports.pickBackup ?? (async () => null),
			pickExport: async () => null,
			exportCiphertext: async () => {},
			openUrl: async () => {},
		}),
	});
	await service.probe();
	if (unlocked) await service.unlock(QUICK_PICK_MASTER);
	return {
		service,
		files,
		publications,
		clipboard,
		feedback,
		io,
		dispose: () => {
			service.dispose();
			host.dispose();
		},
	};
}
