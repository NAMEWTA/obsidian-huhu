import { afterEach, expect, test, vi } from 'vitest';
import type { ModuleContext } from '../../../app/contracts/module';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { initializeDevice } from '../../../host/obsidian/storage/device-id';
import { SettingsStore, type SettingsFile } from '../../../shared/settings/store';
import { NAVIGATOR_PERIODIC, type NavigatorPeriodicService } from '../api';
import { navigatorSchema } from '../settings';
import createNavigatorModule from '../module';

vi.mock('obsidian', async (original) => ({
	...await original<Record<string, unknown>>(),
	moment: (await import('../../../../scripts/navigator-test-moment')).testMoment,
}));

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { try { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); } finally { vi.restoreAllMocks(); } });

async function fixture(initial: Record<string, string> = {}) {
	const vault = memoryVault(initial, window);
	const app = vault.app;
	Object.assign(app.vault, { getAllLoadedFiles: () => app.vault.getFiles(), cachedRead: app.vault.read });
	Object.assign(app.metadataCache, { on: app.vault.on, getFileCache: () => ({}) });
	Object.assign(app.workspace, {
		containerEl: document.createElement('div'), getActiveFile: () => null,
		on: app.vault.on, onLayoutReady: (callback: () => void) => callback(),
		ensureSideLeaf: async () => ({}), detachLeavesOfType: () => {},
	});
	await initializeDevice(app, { machineIdentity: async () => undefined, label: 'Test', chooseDevice: async () => ({ label: 'Test' }) });
	const saved: Record<string, SettingsFile | null> = { vault: null, device: null };
	const store = new SettingsStore({ load: async (scope) => saved[scope] ?? null, save: async (scope, value) => { saved[scope] = value; return value; } }, { timers: { set: (callback) => { queueMicrotask(callback); return 0; }, clear: () => {} } });
	cleanups.push(() => store.dispose());
	await store.load();
	const settings = store.bind('navigator', navigatorSchema);
	await settings.update((draft) => { draft.periodicRoot = 'Notes/Journal'; draft.calendarWeekStart = 'monday'; draft.indexInBackground = false; });
	const release: Array<() => void> = [];
	const context = {
		app, settings: store,
		lifetime: { register: (cleanup: () => void) => release.push(cleanup), registerEvent: (ref: Parameters<typeof app.vault.offref>[0]) => release.push(() => app.vault.offref(ref)) },
		commands: { add: () => {}, remove: () => {} },
		services: { peek: () => undefined, watch: () => () => {} },
	} as unknown as ModuleContext;
	const instance = createNavigatorModule(context);
	let stopped = false;
	const stop = async () => { if (stopped) return; stopped = true; await instance.dispose('disabled'); for (const cleanup of release.splice(0).reverse()) cleanup(); };
	cleanups.push(stop);
	await instance.activate?.(new AbortController().signal);
	const periodic = instance.services!.find(([key]) => key === NAVIGATOR_PERIODIC)![1] as NavigatorPeriodicService;
	const writes = [
		vi.spyOn(app.vault, 'create'), vi.spyOn(app.vault, 'process'), vi.spyOn(app.vault, 'createFolder'),
		vi.spyOn(vault.adapter, 'write'), vi.spyOn(vault.adapter, 'writeBinary'), vi.spyOn(vault.adapter, 'mkdir'),
		vi.spyOn(vault.adapter, 'remove'), vi.spyOn(vault.adapter, 'rename'), vi.spyOn(vault.adapter, 'copy'), vi.spyOn(vault.adapter, 'process'),
	];
	const before = new Map(vault.contents);
	const assertReadOnly = (expected = before) => { for (const write of writes) expect(write).not.toHaveBeenCalled(); expect(vault.contents).toEqual(expected); };
	return { periodic, vault, settings, stop, assertReadOnly };
}

test('the provided batch service lists only existing daily notes at both inclusive range boundaries without writes', async () => {
	const f = await fixture({
		'Notes/Journal/daily/2026/12/2026-12-30.md': 'Outside',
		'Notes/Journal/daily/2026/12/2026-12-31.md': 'Last day of the year',
		'Notes/Journal/daily/2027/01/2027-01-02.md': 'First entry this year',
		'Notes/Journal/daily/2027/01/2027-01-03.md': 'Outside',
		'Other/2027-01-01.md': 'Unrelated',
	});
	expect(typeof f.periodic.list).toBe('function');
	const entries = await f.periodic.list('day', new Date(2026, 11, 31, 23), new Date(2027, 0, 2, 1));
	expect(entries.map(({ path, date, summary, summaryStatus }) => ({ path, date, summary, summaryStatus }))).toEqual([
		{ path: 'Notes/Journal/daily/2027/01/2027-01-02.md', date: '2027-01-02', summary: 'First entry this year', summaryStatus: 'ready' },
		{ path: 'Notes/Journal/daily/2026/12/2026-12-31.md', date: '2026-12-31', summary: 'Last day of the year', summaryStatus: 'ready' },
	]);
	f.assertReadOnly();
});

test('a successfully read empty note has a ready empty summary', async () => {
	const f = await fixture({ 'Notes/Journal/daily/2027/01/2027-01-02.md': '' });
	expect(await f.periodic.list('day', new Date(2027, 0, 2), new Date(2027, 0, 2))).toEqual([
		expect.objectContaining({ status: 'existing', summary: '', summaryStatus: 'ready' }),
	]);
	f.assertReadOnly();
});

test('empty dates, reversed ranges and disabled periods return no notes and invalid dates reject without writes', async () => {
	const f = await fixture();
	const from = new Date(2026, 11, 31, 23), to = new Date(2027, 0, 2, 1);
	const originals = [from.getTime(), to.getTime()];
	expect(await f.periodic.list('day', from, to)).toEqual([]);
	expect([from.getTime(), to.getTime()]).toEqual(originals);
	expect(await f.periodic.list('day', to, from)).toEqual([]);
	await expect(f.periodic.list('day', new Date(NaN), to)).rejects.toBeInstanceOf(RangeError);
	await expect(f.periodic.list('day', from, new Date(NaN))).rejects.toBeInstanceOf(RangeError);
	await f.settings.update((draft) => { draft.periods.day.enabled = false; });
	expect(await f.periodic.list('day', from, to)).toEqual([]);
	await f.stop();
	expect(await f.periodic.list('day', from, to)).toEqual([]);
	f.assertReadOnly();
});

test('weekly and monthly batches use period starts once each across the year boundary', async () => {
	const f = await fixture({
		'Notes/Journal/weekly/2026/2026-w53.md': 'Week across two years',
		'Notes/Journal/monthly/2026/2026-12.md': 'December',
		'Notes/Journal/monthly/2027/2027-01.md': 'January',
	});
	const from = new Date(2026, 11, 31), to = new Date(2027, 0, 2);
	expect((await f.periodic.list('week', from, to)).map(({ date, summary }) => ({ date, summary }))).toEqual([
		{ date: '2026-12-28', summary: 'Week across two years' },
	]);
	expect((await f.periodic.list('month', from, to)).map(({ date, summary }) => ({ date, summary }))).toEqual([
		{ date: '2027-01-01', summary: 'January' }, { date: '2026-12-01', summary: 'December' },
	]);
	f.assertReadOnly();
});

test('disabling a period hides its existing notes without reading or changing their content', async () => {
	const f = await fixture({ 'Notes/Journal/daily/2027/01/2027-01-02.md': 'Existing body' });
	await f.settings.update((draft) => { draft.periods.day.enabled = false; });
	const read = vi.spyOn(f.vault.app.vault, 'cachedRead');
	expect(await f.periodic.list('day', new Date(2027, 0, 2), new Date(2027, 0, 2))).toEqual([]);
	expect(read).not.toHaveBeenCalled();
	f.assertReadOnly();
});

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => { resolve = done; });
	return { promise, resolve };
}

test.each(['shutdown', 'root', 'week-start'] as const)('a pending batch discards results after %s changes', async (change) => {
	const path = 'Notes/Journal/daily/2027/01/2027-01-01.md';
	const f = await fixture({ [path]: 'Older body', 'Notes/Journal/daily/2027/01/2027-01-02.md': 'Newer body' });
	const started = deferred(), resume = deferred();
	const read = f.vault.app.vault.cachedRead.bind(f.vault.app.vault);
	vi.spyOn(f.vault.app.vault, 'cachedRead').mockImplementation(async (file) => {
		const text = await read(file);
		if (file.path === path) { started.resolve(); await resume.promise; }
		return text;
	});
	const request = f.periodic.list('day', new Date(2027, 0, 1), new Date(2027, 0, 2));
	try {
		await started.promise;
		if (change === 'shutdown') await f.stop();
		else await f.settings.update((draft) => { if (change === 'root') draft.periodicRoot = 'Different'; else draft.calendarWeekStart = 'sunday'; });
	} finally { resume.resolve(); }
	expect(await request).toEqual([]);
	f.assertReadOnly();
});

test('a note deleted while its preview is being read is omitted without recreating it', async () => {
	const path = 'Notes/Journal/daily/2027/01/2027-01-02.md';
	const f = await fixture({ [path]: 'Diary body' });
	const started = deferred(), resume = deferred();
	const read = f.vault.app.vault.cachedRead.bind(f.vault.app.vault);
	vi.spyOn(f.vault.app.vault, 'cachedRead').mockImplementationOnce(async (file) => {
		const text = await read(file);
		started.resolve();
		await resume.promise;
		return text;
	});
	const request = f.periodic.list('day', new Date(2027, 0, 2), new Date(2027, 0, 2));
	try { await started.promise; f.vault.contents.delete(path); } finally { resume.resolve(); }
	expect(await request).toEqual([]);
	f.assertReadOnly(new Map(f.vault.contents));
});

test.each(['rejected', 'timeout'] as const)('real runtime marks the summary unavailable after a %s read', async (failure) => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
	let f: Awaited<ReturnType<typeof fixture>> | undefined;
	let resume!: (text: string) => void;
	const delayed = new Promise<string>((resolve) => { resume = resolve; });
	try {
		f = await fixture({ 'Notes/Journal/daily/2027/01/2027-01-02.md': 'Body cannot be read in time' });
		const read = vi.spyOn(f.vault.app.vault, 'cachedRead');
		if (failure === 'rejected') read.mockRejectedValue(new Error('read-denied'));
		else read.mockReturnValue(delayed);
		let settled = false;
		const request = f.periodic.list('day', new Date(2027, 0, 2), new Date(2027, 0, 2)).then((entries) => { settled = true; return entries; });
		await vi.advanceTimersByTimeAsync(4999);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		expect(await request).toEqual([expect.objectContaining({
			path: 'Notes/Journal/daily/2027/01/2027-01-02.md', date: '2027-01-02', status: 'existing',
			summary: undefined, summaryStatus: 'unavailable',
		})]);
		expect(read).toHaveBeenCalledTimes(1);
		f.assertReadOnly();
	} finally {
		resume('Late body');
		try { await f?.stop(); } finally { vi.useRealTimers(); }
	}
});
