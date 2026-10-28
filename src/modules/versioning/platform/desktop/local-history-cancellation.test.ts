import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { SettingsStore } from '../../../../shared/settings/store';
import type { TextStorage } from '../../../../shared/storage/ports';
import { syncSettings } from '../../settings';
import { AutomaticHistory } from '../../services/automatic-history';
import { LocalHistoryStore } from '../../services/local-history-store';
import { assertLocalHistoryProtection } from './local-history-protection';
import { gitEnvironment } from './git-environment';

const roots: string[] = [];
const pids = new Set<number>();
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
afterEach(async () => {
	for (const pid of pids) if (alive(pid)) process.kill(pid, 'SIGKILL');
	await vi.waitFor(() => expect([...pids].some(alive)).toBe(false)); pids.clear();
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(stage: string) {
	const root = mkdtempSync(path.join(tmpdir(), 'huhu-cancel-history-')); roots.push(root);
	execFileSync('git', ['init', '-q'], { cwd: root, env: gitEnvironment(), stdio: ['ignore', 'pipe', 'pipe'] });
	const control = path.join(root, 'stage'); writeFileSync(control, stage);
	const executable = path.join(root, 'git-fixture');
	// A real POSIX child with deterministic readiness. Windows taskkill remains a user-owned platform check.
	writeFileSync(executable, `#!${process.execPath}\nconst fs = require('node:fs');
const root = ${JSON.stringify(root)};
const args = process.argv.slice(2);
const stage = args.includes('--version') ? 'discover' : args.includes('rev-parse') ? 'root' : args.includes('ls-files') ? 'tracked' : 'ignored';
if (fs.readFileSync(root + '/stage', 'utf8') === stage) {
 fs.writeFileSync(root + '/' + stage + '.pid', String(process.pid));
 setInterval(() => {}, 1000);
} else {
 if (stage === 'discover') process.stdout.write('git version 2.51.0\\n');
 if (stage === 'root') process.stdout.write(root + '\\n');
}
`);
	chmodSync(executable, 0o700);
	return { root, executable, control, async started() {
		const marker = path.join(root, `${stage}.pid`);
		await vi.waitFor(() => expect(existsSync(marker)).toBe(true));
		const pid = Number(readFileSync(marker, 'utf8')); pids.add(pid); return pid;
	} };
}

test.skipIf(process.platform === 'win32').each(['discover', 'root', 'tracked', 'ignored'])('cancel reaches the real %s preflight child and waits for its exit', async stage => {
	const f = fixture(stage), controller = new AbortController();
	const pending = assertLocalHistoryProtection(f.root, f.executable, controller.signal);
	const rejected = expect(pending).rejects.toMatchObject({ kind: 'cancelled' });
	const pid = await f.started(); controller.abort(); await rejected;
	expect(alive(pid)).toBe(false);
});

test.skipIf(process.platform === 'win32')('closing automatic history terminates discovery and reopening can sample with no old process, clock or subscription', async () => {
	const f = fixture('discover');
	const settingsStore = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, {
		timers: { set: (run, ms) => setTimeout(run, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) },
	});
	const settings = settingsStore.bind('versioning', syncSettings);
	await settings.update(value => { value.localHistoryEnabled = true; }, { persist: 'immediate' });
	let subscriptions = 0;
	const subscribe = settings.subscribe.bind(settings);
	settings.subscribe = listener => { subscriptions++; const off = subscribe(listener); return () => { subscriptions--; off(); }; };
	const files = new Map<string, string>(), dirs = new Set<string>(), clocks = new Set<number>();
	const storage: TextStorage = { exists: async path => files.has(path) || dirs.has(path), read: async path => files.get(path)!,
		write: async (path, text) => { files.set(path, text); }, mkdir: async path => { dirs.add(path); } };
	const history = new LocalHistoryStore(storage, 'device-1');
	const automatic = new AutomaticHistory({ settings, history, capture: () => [{ path: 'note.md', text: 'unsaved', sourceId: 'leaf' }],
		assertProtection: signal => assertLocalHistoryProtection(f.root, f.executable, signal),
		timers: { setTimeout: () => { clocks.add(1); return 1; }, clearTimeout: (id: number) => { clocks.delete(id); } } as unknown as Window });
	try {
		automatic.start(); const sampling = automatic.sample('interval');
		const pid = await f.started(); await automatic.stop(); await sampling;
		expect(alive(pid)).toBe(false); expect(clocks.size).toBe(0); expect(subscriptions).toBe(0); expect(files.size).toBe(0);
		writeFileSync(f.control, 'none');
		automatic.start(); await automatic.sample('important');
		expect(automatic.snapshot.phase).toBe('ready'); expect(await history.list('note.md')).toHaveLength(1);
		expect(clocks.size).toBe(1); expect(subscriptions).toBe(1);
	} finally { await automatic.stop(); }
	expect(clocks.size).toBe(0); expect(subscriptions).toBe(0);
});
