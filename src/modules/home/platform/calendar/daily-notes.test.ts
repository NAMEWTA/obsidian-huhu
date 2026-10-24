import { afterEach, expect, test, vi } from 'vitest';
import type { NavigatorPeriodic } from '../../../navigator/api';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { bindJournal, dailyNotePathFor, getDailyNotesConfig, getOrCreateDailyNote } from './daily-notes';

let unbind: (() => void) | undefined;
afterEach(() => { unbind?.(); unbind = undefined; });
function bind(vault: ReturnType<typeof memoryVault>, overrides: Partial<NavigatorPeriodic> = {}) {
	const path = (date: Date) => `Notes/Journal/日记/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.md`;
	const ensure = vi.fn<NavigatorPeriodic['ensure']>(async (_period, date) => vault.app.vault.create(path(date), '# Template'));
	const journal: NavigatorPeriodic = {
		root: () => 'Notes/Journal', template: () => undefined, weekStart: () => 1,
		display: () => ({ weeks: 6, weekNumbers: true, images: false }), subscribe: () => () => {},
		inspect: (period, date) => ({ period, date: '', path: path(date), title: '', status: vault.contents.has(path(date)) ? 'existing' : 'missing', active: false }),
		preview: async (period, date) => journal.inspect(period, date), prepare: async (_period, date) => ({ status: 'ready', path: path(date), content: '# Template' }), open: async () => true, active: () => undefined,
		ensure, ...overrides,
	};
	unbind = bindJournal(() => journal); return ensure;
}

test('read-only journal statistics keep the fixed default layout when the periodic capability is absent', () => {
	const { app } = memoryVault();
	expect(dailyNotePathFor(app, '2026-10-17')).toBe('huhu/日志/日记/2026/10/2026-10-17.md');
	expect(getDailyNotesConfig(app)).toEqual({ folder: 'huhu/日志/日记', format: 'YYYY/MM/YYYY-MM-DD' });
});

test('unavailable navigator never creates a blank default note or folder', async () => {
	const vault = memoryVault();
	expect(await getOrCreateDailyNote(vault.app, '2026-10-17')).toBeNull();
	expect(vault.contents.size).toBe(0); expect(vault.writes).toBe(0);
});

test('existing configured diary is reused untouched; creation delegates the selected date to the periodic service', async () => {
	const path = 'Notes/Journal/日记/2026/10/2026-10-17.md';
	const vault = memoryVault({ [path]: '' }); const ensure = bind(vault);
	expect(dailyNotePathFor(vault.app, '2026-10-17')).toBe(path);
	expect((await getOrCreateDailyNote(vault.app, '2026-10-17'))?.path).toBe(path);
	expect(ensure).not.toHaveBeenCalled(); expect(vault.contents.get(path)).toBe('');
	await getOrCreateDailyNote(vault.app, '2026-10-18');
	expect(ensure).toHaveBeenCalledWith('day', new Date(2026, 9, 18));
});

test('disabled periods and cancelled templates leave the source untouched', async () => {
	const vault = memoryVault();
	const ensure = bind(vault, { inspect: (period) => ({ period, date: '', path: 'disabled.md', title: '', status: 'disabled', active: false }) });
	expect(await getOrCreateDailyNote(vault.app, '2026-10-17')).toBeNull(); expect(ensure).not.toHaveBeenCalled();
	unbind?.(); bind(vault, { ensure: async () => undefined });
	expect(await getOrCreateDailyNote(vault.app, '2026-10-17')).toBeNull(); expect(vault.writes).toBe(0);
});
