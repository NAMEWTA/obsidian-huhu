import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { TFile, type WorkspaceLeaf } from 'obsidian';
import type DashboardPlugin from '../../../../app/main';
import type { ModuleContext } from '../../../../app/contracts/module';
import type { WorkbenchHost } from '../../../../app/contracts/workbench-host';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { composeWorkbench } from '../../../../app/workbench/compose-workbench';
import { FEATURE_MODULES } from '../../../../app/contracts/workbench';
import { cleanPageState, normalizeTarget, normalizeWorkbenchState } from '../../../../shell/navigation-state';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { initializeDevice } from '../../../../host/obsidian/storage/device-id';
import { SettingsStore, type SettingsFile } from '../../../../shared/settings/store';
import { getLanguage, setLanguage } from '../../../../shared/i18n';
import { NAVIGATOR_PERIODIC, type NavigatorPeriodicService } from '../../api';
import * as feedback from '../../../../host/obsidian/feedback';
import { navigatorSchema } from '../../settings';
import createNavigatorModule from '../../module';

vi.mock('obsidian', async (original) => ({
	...await original<Record<string, unknown>>(),
	moment: (await import('../../../../../scripts/navigator-test-moment')).testMoment,
	parseYaml: (await import('yaml')).parse, getFrontMatterInfo: (await import('../../platform/simple-yaml')).getSimpleFrontMatterInfo,
}));
vi.mock('../../../../app/workbench/surfaces/obsidian-status', () => ({ registerObsidianStatus: () => ({ refresh() {}, dispose() {} }) }));
vi.mock('../../../../app/workbench/surfaces/ribbon', () => ({ registerWorkbenchRibbon() {} }));
vi.mock('../../../../app/workbench/workbench-leaf', () => ({
	WORKBENCH_VIEW_TYPE: 'huhu-workbench-view',
	WorkbenchView: class { constructor(_leaf: unknown, readonly host: WorkbenchHost) {} },
}));

const cleanups: Array<() => void | Promise<void>> = [];
afterEach(async () => { try { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); } finally { vi.restoreAllMocks(); } });

async function fixture(withTemplate = false) {
	const language = getLanguage(); setLanguage('en'); cleanups.push(() => setLanguage(language));
	const path = (date: string) => `Notes/Journal/daily/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.md`;
	const vault = memoryVault({ 'Notes/Journal/monthly/2026/2026-11.md': 'Monthly body real service', [path('2026-11-04')]: 'Fourth day full body', [path('2026-11-03')]: 'Third day full body', 'Different/daily/2026/11/2026-11-04.md': 'Different root body', ...(withTemplate ? { 'Templates/Daily.md': '# Daily template' } : {}) }, window);
	const app = vault.app;
	const abstract = app.vault.getAbstractFileByPath;
	app.vault.getAbstractFileByPath = path => { const value = abstract(path); return value && !(value instanceof TFile) ? Object.assign(value, { children: [] }) : value; };
	const openFile = vi.fn(async (_file: TFile) => {});
	Object.assign(app.vault, { getAllLoadedFiles: () => app.vault.getFiles(), cachedRead: app.vault.read });
	Object.assign(app.metadataCache, { on: app.vault.on, getFileCache: () => ({}) });
	Object.assign(app.workspace, {
		containerEl: document.createElement('div'), getActiveFile: () => null,
		on: app.vault.on, offref: app.vault.offref, onLayoutReady: (callback: () => void) => callback(),
		ensureSideLeaf: async () => ({}), detachLeavesOfType: () => {},
		getLeaf: () => ({ openFile }), getMostRecentLeaf: () => null, setActiveLeaf() {},
	});
	await initializeDevice(app, { machineIdentity: async () => undefined, label: 'Test', chooseDevice: async () => ({ label: 'Test' }) });
	const saved: Record<string, SettingsFile | null> = { vault: null, device: null };
	const store = new SettingsStore({ load: async (scope) => saved[scope] ?? null, save: async (scope, value) => { saved[scope] = value; return value; } }, { timers: { set: (callback) => { queueMicrotask(callback); return 0; }, clear: () => {} } });
	cleanups.push(() => store.dispose()); await store.load();
	await store.bind('navigator', navigatorSchema).update((draft) => { draft.periodicRoot = 'Notes/Journal'; draft.calendarWeekStart = 'monday'; draft.indexInBackground = false; if (withTemplate) { draft.periods.day.template = 'Templates/Daily.md'; draft.templateEngine = 'builtin'; } });
	const release: Array<() => void> = [];
	const instance = createNavigatorModule({
		app, settings: store,
		lifetime: { register: (cleanup: () => void) => release.push(cleanup), registerEvent: (ref: Parameters<typeof app.vault.offref>[0]) => release.push(() => app.vault.offref(ref)) },
		commands: { add: () => {}, remove: () => {} }, services: { peek: () => undefined, watch: () => () => {} },
	} as unknown as ModuleContext);
	let activated = false, enabled = true;
	cleanups.push(async () => { await instance.dispose('disabled'); for (const cleanup of release.reverse()) cleanup(); });
	const activate = vi.fn(async () => { if (!activated) { await instance.activate?.(new AbortController().signal); activated = true; } return instance; });
	let viewFactory!: (leaf: WorkspaceLeaf) => { host: WorkbenchHost };
	const plugin = {
		app, services: { peek: () => undefined, watch: () => () => {} },
		moduleEnabled: () => enabled, moduleState: () => activated ? 'active' : 'idle', activateModule: activate,
		registerView: (_type: string, create: typeof viewFactory) => { viewFactory = create; },
		register: (cleanup: () => void) => cleanups.push(cleanup), onModuleChanged: () => () => {},
		appSettings: { subscribe: () => () => {} },
	} as unknown as DashboardPlugin;
	composeWorkbench(plugin);
	const contribution = viewFactory({} as WorkspaceLeaf).host.contributions.find(item => item.id === 'navigator')!;
	const before = new Map(vault.contents);
	const writes = [vi.spyOn(app.vault, 'create'), vi.spyOn(app.vault, 'process'), vi.spyOn(app.vault, 'createFolder'),
		vi.spyOn(vault.adapter, 'write'), vi.spyOn(vault.adapter, 'writeBinary'), vi.spyOn(vault.adapter, 'mkdir'),
		vi.spyOn(vault.adapter, 'remove'), vi.spyOn(vault.adapter, 'rename'), vi.spyOn(vault.adapter, 'copy'), vi.spyOn(vault.adapter, 'process')];
	const mount = async (resourceId?: string, state: Record<string, unknown> = {}) => {
		const el = document.createElement('div'); document.body.append(el);
		Object.assign(el, { addClass: (...names: string[]) => el.classList.add(...names), removeClass: (...names: string[]) => el.classList.remove(...names) });
		const changed = vi.fn();
		const context = { app, contentEl: el, containerEl: el, changed, close() {} } as unknown as NativeSurfaceContext;
		const target = normalizeTarget({ feature: 'navigator', section: 'diary', resourceId });
		const binding = await contribution.create(context, target, cleanPageState(state, contribution.stateKeys), new AbortController().signal);
		let closed = false;
		const close = async () => { if (closed) return; closed = true; await act(() => binding.surface.onClose()); el.remove(); };
		cleanups.push(close);
		await act(() => binding.surface.onOpen());
		return { binding, changed, close };
	};
	return { contribution, activate, mount, path, openFile, vault, writes, periodic: instance.services!.find(([key]) => key === NAVIGATOR_PERIODIC)![1] as NavigatorPeriodicService, changeRoot: () => store.bind('navigator', navigatorSchema).update(draft => { draft.periodicRoot = 'Different'; }), disable: () => { enabled = false; }, assertReadOnly: () => { for (const write of writes) expect(write).not.toHaveBeenCalled(); expect(vault.contents).toEqual(before); } };
}

test('the production rail opens the real lazy module page and the identical periodic note without writes', async () => {
	const f = await fixture();
	expect(f.contribution).toBeDefined();
	expect(FEATURE_MODULES.navigator).toBe('navigator');
	expect(f.contribution.rail).toEqual({ slot: 'top' });
	expect(f.contribution.navigation.target).toEqual({ feature: 'navigator', section: 'diary' });
	expect(f.activate).not.toHaveBeenCalled();
	const page = await f.mount('2026-11-03', { date: '2026-11-04', body: 'unsaved draft' });
	await screen.findByText('Third day full body');
	expect(f.activate).toHaveBeenCalledWith('navigator');
	fireEvent.click(screen.getByRole('button', { name: 'Open original' }));
	await waitFor(() => expect(f.openFile).toHaveBeenCalled());
	expect(f.openFile.mock.calls[0]?.[0]).toMatchObject({ path: f.path('2026-11-03') });
	await page.close();
	f.disable(); expect(f.contribution.availability().enabled).toBe(false);
	f.assertReadOnly();
});

test('diary routes survive shell normalization and restore the selected date after navigation and reopening', async () => {
	const f = await fixture();
	const raw = { feature: 'navigator', section: 'diary', resourceId: '2026-11-04' };
	expect(normalizeWorkbenchState({ schema: 'huhu-workbench-ui/1', route: raw, navigation: { lastRoutes: { navigator: raw } } }).navigation.lastRoutes.navigator).toEqual(raw);
	expect(normalizeTarget({ feature: 'navigator', section: 'unknown' })).toEqual({ feature: 'navigator', section: 'unknown' });
	const page = await f.mount('2026-11-04');
	await screen.findByText('Fourth day full body');
	fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
	await screen.findByText('Third day full body');
	expect(page.binding.getState?.()).toEqual({ date: '2026-11-03' });
	expect(page.binding.getTarget?.()).toMatchObject({ resourceId: '2026-11-03' });
	expect(page.changed).toHaveBeenCalled();
	const saved = cleanPageState(page.binding.getState?.(), f.contribution.stateKeys);
	await page.close();
	const reopened = await f.mount(undefined, saved);
	await screen.findByText('Third day full body');
	await act(() => reopened.binding.navigate({ feature: 'navigator', section: 'diary', resourceId: '2026-11-04' }, new AbortController().signal));
	await screen.findByText('Fourth day full body');
	await act(() => reopened.binding.surface.setVisible(false));
	await screen.findByText('Reading paused');
	await act(() => reopened.binding.surface.setVisible(true));
	await screen.findByText('Fourth day full body');
	f.assertReadOnly();
});


test('changing the real periodic root replaces the displayed file before opening its original', async () => {
	const f = await fixture();
	await f.mount('2026-11-04');
	await screen.findByText('Fourth day full body');
	await act(() => f.changeRoot());
	await screen.findByText('Different root body');
	expect(screen.queryByText('Fourth day full body')).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: 'Open original' }));
	await waitFor(() => expect(f.openFile).toHaveBeenCalled());
	expect(f.openFile.mock.calls[0]?.[0]).toMatchObject({ path: 'Different/daily/2026/11/2026-11-04.md' });
	f.assertReadOnly();
});


test('the real book tools append once and publish a committed feedback receipt without replacing old text', async () => {
	const f = await fixture(), publish = vi.spyOn(feedback, 'publishFeedback');
	await f.mount('2026-11-04'); await screen.findByText('Fourth day full body');
	fireEvent.click(screen.getByRole('button', { name: 'Search / Write' }));
	fireEvent.click(screen.getByRole('button', { name: 'Write a note' }));
	await screen.findByText('New text will be appended; existing text stays intact.');
	fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Keep this new line' } });
	fireEvent.click(screen.getByRole('button', { name: 'Save' }));
	fireEvent.click(screen.getByRole('button', { name: 'Save' }));
	await screen.findByText('Appended to periodic note; existing text preserved.');
	expect(f.vault.contents.get(f.path('2026-11-04'))).toBe('Fourth day full body\n\nKeep this new line\n');
	expect(f.writes[1]).toHaveBeenCalledOnce(); expect(f.writes[0]).not.toHaveBeenCalled();
	expect(publish).toHaveBeenCalledWith(window, expect.objectContaining({ outcome: 'success', receipt: { committed: true } }));
	expect(JSON.stringify(publish.mock.calls.map(call => call[1]))).not.toContain('Keep this new line');
});

test('a blank date stays unwritten until a real save prepares once and creates once', async () => {
	const f = await fixture(), prepare = vi.spyOn(f.periodic, 'prepare');
	await f.mount('2026-11-02'); await screen.findByText('No note for this date');
	fireEvent.click(screen.getByRole('button', { name: 'Search / Write' }));
	fireEvent.click(screen.getByRole('button', { name: 'Write a note' }));
	await screen.findByText('New text will be appended; existing text stays intact.');
	expect(prepare).not.toHaveBeenCalled(); expect(f.writes[0]).not.toHaveBeenCalled();
	fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'First real entry' } });
	fireEvent.click(screen.getByRole('button', { name: 'Save' }));
	await screen.findByText('Appended to periodic note; existing text preserved.');
	expect(prepare).toHaveBeenCalledOnce(); expect(f.writes[0]).toHaveBeenCalledOnce();
	expect(f.vault.contents.get(f.path('2026-11-02'))).toBe('First real entry\n');
});

test('external edits cause a persistent conflict and retain the date and text draft', async () => {
	const f = await fixture();
	await f.mount('2026-11-04'); await screen.findByText('Fourth day full body');
	fireEvent.click(screen.getByRole('button', { name: 'Search / Write' }));
	fireEvent.click(screen.getByRole('button', { name: 'Write a note' }));
	await screen.findByText('New text will be appended; existing text stays intact.');
	fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Retained draft' } });
	f.vault.contents.set(f.path('2026-11-04'), 'External replacement');
	fireEvent.click(screen.getByRole('button', { name: 'Save' }));
	await screen.findByRole('alert');
	expect(screen.getByLabelText('Text')).toHaveProperty('value', 'Retained draft');
	expect(screen.getByLabelText('Writing date')).toHaveProperty('value', '2026-11-04');
	expect(f.vault.contents.get(f.path('2026-11-04'))).toBe('External replacement');
	expect(f.writes[1]).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: 'Back to book' }));
	await screen.findByRole('alertdialog');
	fireEvent.click(screen.getByRole('button', { name: 'Keep writing' }));
	expect(screen.getByLabelText('Text')).toHaveProperty('value', 'Retained draft');
	fireEvent.click(screen.getByRole('button', { name: 'Back to book' }));
	fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
	await screen.findByText('External replacement');
});

test('partial search never claims no results, and a completed real range can do so', async () => {
	const f = await fixture();
	await f.mount('2026-11-04'); await screen.findByText('Fourth day full body');
	fireEvent.click(screen.getByRole('button', { name: 'Search / Write' }));
	fireEvent.change(screen.getByLabelText('Search diary text'), { target: { value: 'no such phrase' } });
	await screen.findByText(/Loaded range only/);
	expect(screen.queryByText('No matches in the completed range')).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: 'Scan entire range' }));
	await screen.findByText(/Entire range scanned/);
	await screen.findByText('No matches in the completed range');
	f.assertReadOnly();
});

test('IME cannot submit, and deep-link navigation waits for a decision about the unsaved draft', async () => {
	const f = await fixture();
	const page = await f.mount('2026-11-04'); await screen.findByText('Fourth day full body');
	fireEvent.click(screen.getByRole('button', { name: 'Search / Write' }));
	fireEvent.click(screen.getByRole('button', { name: 'Write a note' }));
	await screen.findByText('New text will be appended; existing text stays intact.');
	const input = screen.getByLabelText('Text');
	fireEvent.change(input, { target: { value: 'IME draft' } });
	fireEvent.compositionStart(input); fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true, isComposing: true });
	expect(f.writes[1]).not.toHaveBeenCalled(); fireEvent.compositionEnd(input);
	let pending!: Promise<void>;
	act(() => { pending = page.binding.navigate({ feature: 'navigator', section: 'diary', resourceId: '2026-11-03' }, new AbortController().signal); });
	await screen.findByRole('alertdialog');
	fireEvent.click(screen.getByRole('button', { name: 'Keep writing' }));
	await act(() => pending);
	expect(screen.getByLabelText('Text')).toHaveProperty('value', 'IME draft');
	expect(page.binding.getState?.()).toEqual({ date: '2026-11-04' });
	act(() => { pending = page.binding.navigate({ feature: 'navigator', section: 'diary', resourceId: '2026-11-03' }, new AbortController().signal); });
	await screen.findByRole('alertdialog'); fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
	await act(() => pending); await screen.findByText('Third day full body');
	f.assertReadOnly();
});

test('template cancellation and unavailability retain the draft without creating a note', async () => {
	for (const status of ['cancelled', 'unavailable'] as const) {
		const f = await fixture(); const page = await f.mount('2026-11-02');
		vi.spyOn(f.periodic, 'prepare').mockResolvedValue({ status, code: 'template-input-required' });
		await screen.findByText('No note for this date');
		fireEvent.click(screen.getByRole('button', { name: 'Search / Write' }));
		fireEvent.click(screen.getByRole('button', { name: 'Write a note' }));
		await screen.findByText('New text will be appended; existing text stays intact.');
		fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Retain even when cancelled' } });
		fireEvent.click(screen.getByRole('button', { name: 'Save' }));
		await screen.findByText(status === 'cancelled' ? 'Template preparation cancelled. No blank file created; draft retained.' : 'Template or diary unavailable. No file created; draft retained.');
		expect(screen.getByLabelText('Text')).toHaveProperty('value', 'Retain even when cancelled');
		f.assertReadOnly(); await page.close();
	}
});


test('the real configured builtin template is rendered and committed with the first entry in one create', async () => {
	const f = await fixture(true), prepare = vi.spyOn(f.periodic, 'prepare');
	await f.mount('2026-11-02'); await screen.findByText('No note for this date');
	fireEvent.click(screen.getByRole('button', { name: 'Search / Write' })); fireEvent.click(screen.getByRole('button', { name: 'Write a note' }));
	await screen.findByText('New text will be appended; existing text stays intact.');
	fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'First templated entry' } });
	fireEvent.click(screen.getByRole('button', { name: 'Save' }));
	await screen.findByText('Appended to periodic note; existing text preserved.');
	expect(prepare).toHaveBeenCalledOnce(); expect(f.writes[0]).toHaveBeenCalledOnce();
	expect(f.vault.contents.get(f.path('2026-11-02'))).toBe('# Daily template\n\nFirst templated entry\n');
});

test('a cancelled deep link cannot apply after the discard decision arrives', async () => {
	const f = await fixture(), page = await f.mount('2026-11-04');
	await screen.findByText('Fourth day full body');
	fireEvent.click(screen.getByRole('button', { name: 'Search / Write' })); fireEvent.click(screen.getByRole('button', { name: 'Write a note' }));
	await screen.findByText('New text will be appended; existing text stays intact.');
	fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Unsaved draft' } });
	const controller = new AbortController(); let pending!: Promise<void>;
	act(() => { pending = page.binding.navigate({ feature: 'navigator', section: 'diary', resourceId: '2026-11-03' }, controller.signal); });
	await screen.findByRole('alertdialog'); controller.abort(); fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
	await act(() => pending);
	expect(page.binding.getState?.()).toEqual({ date: '2026-11-04' });
	f.assertReadOnly();
});

test('a loaded text hit returns to the matching book date and a new search starts with an empty query', async () => {
	const f = await fixture(); await f.mount('2026-11-04'); await screen.findByText('Fourth day full body');
	fireEvent.click(screen.getByRole('button', { name: 'Search / Write' }));
	fireEvent.change(screen.getByLabelText('Search diary text'), { target: { value: 'Fourth' } });
	const hit = await screen.findByRole('button', { name: /2026-11-04 · Fourth day full body/ });
	fireEvent.click(hit);
	await screen.findByText('Fourth day full body');
	fireEvent.click(screen.getByRole('button', { name: 'Search / Write' }));
	expect(screen.getByLabelText('Search diary text')).toHaveProperty('value', '');
	expect(screen.queryByRole('button', { name: /2026-11-04 · Fourth day full body/ })).toBeNull();
	f.assertReadOnly();
});


test.each([true, false])('writing raw dates preserve the requested identity, invalid=%s', async invalid => {
 const f = await fixture();
 const published = vi.spyOn(feedback, 'publishFeedback');
 await f.mount('2026-11-04'); await screen.findByText('Fourth day full body');
 fireEvent.click(screen.getByRole('button', { name: 'Search / Write' }));
 fireEvent.click(screen.getByRole('button', { name: 'Write a note' }));
 fireEvent.change(screen.getByLabelText('Writing date'), { target: { value: invalid ? '2026-02-31' : '2026-11-04' } });
 fireEvent.blur(screen.getByLabelText('Writing date'));
 fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Counter appended marker' } });
 if (invalid) expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
 else await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', false));
 fireEvent.click(screen.getByRole('button', { name: 'Save' }));
 await waitFor(() => expect(screen.queryByText('Saving. Duplicate submission is disabled.')).toBeNull());
 await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 30)); });
 expect(f.vault.contents.get(f.path('2026-11-04'))?.includes('Counter appended marker')).toBe(!invalid);
 if (invalid) expect(published.mock.calls.some(([, message]) => message.outcome === 'success')).toBe(false);
});

test.each(['2026-11-17', '2026-11-01'])('monthly book reads the containing periodic file when selecting %s', async date => {
 const f = await fixture(); await f.mount('2026-11-04'); await screen.findByText('Fourth day full body');
 fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
 fireEvent.click(await screen.findByRole('option', { name: 'Monthly' }));
 await screen.findByText('Monthly body real service');
 fireEvent.change(screen.getByLabelText('Jump to date'), { target: { value: date } });
 fireEvent.blur(screen.getByLabelText('Jump to date'));
 fireEvent.click(screen.getByRole('button', { name: 'Go' }));
 expect(await screen.findByText('Monthly body real service')).toBeTruthy();
 f.assertReadOnly();
});
