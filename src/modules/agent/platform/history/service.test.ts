import type { App } from 'obsidian';
import { expect, test } from 'vitest';
import { initializeTestDevice } from '../../../../../test/fixtures/vault-storage';
import { NativeHistory } from './service';

const device = '00000000-0000-0000-0000-000000000000';
const file = `.huhu/terminal-agent/${device}/history.json`;
const key = JSON.stringify(['codex', '', 's1']);

async function fixture() {
	const files = new Map<string, string>();
	let failWrite = false;
	const adapter = {
		exists: async (p: string) => files.has(p),
		read: async (p: string) => {
			const text = files.get(p);
			if (text === undefined) throw new Error('missing');
			return text;
		},
		write: async (p: string, text: string) => {
			if (failWrite && p === file) throw new Error('ENOSPC');
			files.set(p, text);
		},
		mkdir: async () => {},
	};
	const app = {
		vault: { adapter },
		workspace: { containerEl: { win: {} } },
		loadLocalStorage: () => device,
	} as unknown as App;
	await initializeTestDevice(app);
	const history = new NativeHistory(app, {} as never, () => ({}) as never);
	return {
		files,
		history,
		fail: (v: boolean) => {
			failWrite = v;
		},
	};
}

test('recovery: quiesced annotation writes fail visibly and resume restores them', async () => {
	const f = await fixture();
	await f.history.drainWrites();
	f.history.quiesceWrites();
	await expect(f.history.update(key, { title: 'x' } as never)).rejects.toThrow('history-writes-closed');
	expect(f.files.has(file)).toBe(false);
	f.history.resumeWrites();
	await f.history.update(key, { title: 'x' } as never);
	expect(JSON.parse(f.files.get(file)!)[key]).toMatchObject({ title: 'x' });
});

test('recovery: strict drain rejects on a failed annotation write', async () => {
	const f = await fixture();
	await f.history.drainWrites();
	f.fail(true);
	await expect(f.history.update(key, { title: 'x' } as never)).rejects.toThrow('ENOSPC');
	await expect(f.history.drainWrites()).rejects.toThrow('ENOSPC');
	f.fail(false);
});

test('recovery: reload adopts restored bytes so the next annotation edit does not write back the stale cache', async () => {
	const f = await fixture();
	const other = JSON.stringify(['codex', '', 's2']);
	await f.history.update(key, { title: 'old' } as never);
	f.files.set(file, JSON.stringify({ [other]: { title: 'restored' } }));
	await f.history.reloadFromDisk();
	expect(f.history.meta(other)).toMatchObject({ title: 'restored' });
	expect(f.history.meta(key)).toEqual({});
	await f.history.update(key, { title: 'new' } as never);
	const written = JSON.parse(f.files.get(file)!) as Record<string, { title: string }>;
	expect(written[other]).toMatchObject({ title: 'restored' });
	expect(written[key]).toMatchObject({ title: 'new' });
});
