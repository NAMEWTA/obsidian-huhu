import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink } from 'node:fs/promises';
import { afterEach, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import { BrowserMaterialFiles } from '../platform/desktop/browser-material';
import { browserMaterialConsumer } from './browser-material-consumer';
import { SessionMaterialService } from './session-material';
import type { AgentController } from './controller';
import type { TerminalSessions } from './terminal/sessions';
import { BROWSER_MATERIALS_ROOT } from '../../../shared/storage/vault-layout';
import { t } from '../../../shared/i18n';

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
	for (const cleanup of cleanups.splice(0)) await cleanup();
});
async function fixture() {
	const vault = await mkdtemp(path.join(os.tmpdir(), 'huhu-browser-material-'));
	const files = new BrowserMaterialFiles(vault);
	const abort = new AbortController();
	const session = {
		id: 'session',
		agentId: 'codex' as const,
		running: true,
		automated: false,
		activity: 'idle',
		title: 'Coding',
		inputReady: () => true,
		paste: vi.fn((_text: string) => {}),
	};
	const sessions = {
		get: (id: string) => (id === session.id ? session : undefined),
		list: () => [session],
	} as unknown as TerminalSessions;
	const app = { workspace: { containerEl: { win: { setInterval, clearInterval } } } } as unknown as App;
	const host = { app, sessions, show: vi.fn(), open: vi.fn(async () => {}) };
	const materials = new SessionMaterialService(
		host as unknown as Pick<AgentController, 'app' | 'sessions' | 'show' | 'open'>,
	);
	const consumer = browserMaterialConsumer({ sessions, materials }, files, abort.signal);
	cleanups.push(async () => {
		abort.abort();
		materials.dispose();
		await files.dispose();
		await rm(vault, { recursive: true, force: true });
	});
	return { vault, files, abort, session, consumer, host };
}
const material = {
	title: 'Web reference',
	text: 'Visible page semantic text',
	image: { mime: 'image/png' as const, data: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) },
};

it('delivers bounded private screenshot and semantic text to the existing unsent Agent input', async () => {
	const f = await fixture();
	expect(await f.consumer.targets()).toEqual([{ id: 'session', label: 'Coding' }]);
	await f.consumer.deliver('session', material);
	expect(f.session.paste).toHaveBeenCalledOnce();
	const text = f.session.paste.mock.calls[0]![0] as string;
	expect(text).toContain(t('agent.browserMaterial.untrusted'));
	expect(text).toContain('Visible page semantic text');
	const root = path.join(f.vault, BROWSER_MATERIALS_ROOT),
		directories = await readdir(root);
	const directory = path.join(root, directories[0]!),
		names = await readdir(directory),
		file = path.join(directory, names[0]!);
	expect(text).toContain(file);
	expect(await readFile(file)).toEqual(Buffer.from(material.image.data));
	if (process.platform !== 'win32') expect((await stat(file)).mode & 0o777).toBe(0o600);
	await f.files.dispose();
	await expect(stat(file)).rejects.toMatchObject({ code: 'ENOENT' });
});
it('rechecks the same target after copying and removes staged material when it becomes busy', async () => {
	const f = await fixture(),
		prepare = f.files.prepare.bind(f.files);
	vi.spyOn(f.files, 'prepare').mockImplementationOnce(async (image, signal) => {
		const copied = await prepare(image, signal);
		f.session.activity = 'running';
		return copied;
	});
	await expect(f.consumer.deliver('session', material)).rejects.toThrow('material_target_unavailable');
	expect(f.session.paste).not.toHaveBeenCalled();
	const root = path.join(f.vault, BROWSER_MATERIALS_ROOT),
		directories = await readdir(root);
	expect(await readdir(path.join(root, directories[0]!))).toEqual([]);
});
it('does not list automated or busy sessions and rejects copying after module cancellation', async () => {
	const f = await fixture();
	f.session.automated = true;
	expect(await f.consumer.targets()).toEqual([]);
	f.session.automated = false;
	f.session.activity = 'running';
	expect(await f.consumer.targets()).toEqual([]);
	f.session.activity = 'idle';
	f.abort.abort();
	await expect(f.consumer.deliver('session', material)).rejects.toThrow('material_target_unavailable');
	expect(f.session.paste).not.toHaveBeenCalled();
});
it('refuses a linked material directory rather than writing outside its owned vault tree', async () => {
	const f = await fixture(),
		outside = await mkdtemp(path.join(os.tmpdir(), 'huhu-browser-outside-'));
	cleanups.push(() => rm(outside, { recursive: true, force: true }));
	await mkdir(path.join(f.vault, '.huhu'), { recursive: true });
	await symlink(outside, path.join(f.vault, BROWSER_MATERIALS_ROOT), 'dir');
	await expect(f.files.prepare(material.image, f.abort.signal)).rejects.toThrow('symlink');
	expect(await readdir(outside)).toEqual([]);
	await f.files.dispose();
	expect(await readdir(outside)).toEqual([]);
});
