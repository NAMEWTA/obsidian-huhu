import { beforeEach, expect, test, vi } from 'vitest';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { taskMetaSuffix } from '../../../shared/automation/metadata';
import { openNoteAt } from '../../../host/obsidian/open-note';
import { openCalendarSource } from './action-host';

vi.mock('../../../host/obsidian/open-note', () => ({ openNoteAt: vi.fn(async () => {}) }));
beforeEach(() => vi.clearAllMocks());

const receipt = { id: 'original', effectKey: 'weekly-friday', path: 'Tasks.md', line: 0, date: '2026-10-23' };
const delivery = { effectKey: receipt.effectKey, date: receipt.date, timezone: 'Asia/Taipei', receipt };
const line = (text = 'Original') => `- [x] ${text}${taskMetaSuffix(receipt)}`;

test('calendar history opens the current task line in its owner window after newer tasks are prepended', async () => {
	const vault = memoryVault({ 'Tasks.md': `# Header\r\n- [ ] New task\r\n${line('Edited title')}\r\n` });
	const owner = {} as Window;
	await openCalendarSource(vault.app, delivery, owner);
	expect(openNoteAt).toHaveBeenCalledWith(vault.app, vault.app.vault.getFileByPath('Tasks.md'), { owner, line: 2 });
	expect(receipt.line).toBe(0);
});

test.each([
	'- [ ] Unrelated task\n',
	`${line()}\n${line()}\n`,
])('calendar history refuses a missing or ambiguous task instead of opening its former line', async (content) => {
	const vault = memoryVault({ 'Tasks.md': content });
	await expect(openCalendarSource(vault.app, delivery)).rejects.toMatchObject({ code: 'calendarSourceChanged' });
	expect(openNoteAt).not.toHaveBeenCalled();
});

test('a removed source file is reported without opening another file', async () => {
	const vault = memoryVault({});
	await expect(openCalendarSource(vault.app, delivery)).rejects.toMatchObject({ code: 'sourceMissing' });
	expect(openNoteAt).not.toHaveBeenCalled();
});

test('calendar history uses the delivery identity when a legacy receipt omits its effect key', async () => {
	const vault = memoryVault({ 'Tasks.md': line() });
	await openCalendarSource(vault.app, { ...delivery, receipt: { ...receipt, effectKey: undefined } });
	expect(openNoteAt).toHaveBeenCalledWith(vault.app, vault.file('Tasks.md'), { owner: undefined, line: 0 });
});

test.each([
	{ ...delivery, receipt: { ...receipt, id: '' } },
	{ ...delivery, effectKey: '' },
	{ ...delivery, receipt: { ...receipt, effectKey: 'different-run' } },
	{ ...delivery, receipt: undefined },
])('invalid or mismatched delivery identities cannot fall back to a recorded line', async (invalid) => {
	const vault = memoryVault({ 'Tasks.md': line() });
	await expect(openCalendarSource(vault.app, invalid)).rejects.toMatchObject({ code: 'calendarSourceChanged' });
	expect(openNoteAt).not.toHaveBeenCalled();
});

test('calendar history rereads a source that changed while its first snapshot was loading', async () => {
	const vault = memoryVault({ 'Tasks.md': line() });
	const read = vault.app.vault.read.bind(vault.app.vault);
	vi.spyOn(vault.app.vault, 'read').mockImplementationOnce(async (file) => {
		const snapshot = await read(file);
		await vault.adapter.write(file.path, `- [ ] New task\n${snapshot}`);
		return snapshot;
	});
	await openCalendarSource(vault.app, delivery);
	expect(vault.app.vault.read).toHaveBeenCalledTimes(2);
	expect(openNoteAt).toHaveBeenCalledWith(vault.app, vault.file('Tasks.md'), { owner: undefined, line: 1 });
});

test('a source that keeps changing is reported instead of opening an unstable line', async () => {
	const vault = memoryVault({ 'Tasks.md': line() });
	const read = vault.app.vault.read.bind(vault.app.vault);
	vi.spyOn(vault.app.vault, 'read').mockImplementation(async (file) => {
		const snapshot = await read(file);
		await vault.adapter.write(file.path, `- [ ] New task\n${snapshot}`);
		return snapshot;
	});
	await expect(openCalendarSource(vault.app, delivery)).rejects.toMatchObject({ code: 'calendarSourceChanged' });
	expect(vault.app.vault.read).toHaveBeenCalledTimes(2);
	expect(openNoteAt).not.toHaveBeenCalled();
});

test('closing the requesting window during the read does not redirect navigation to another window', async () => {
	const vault = memoryVault({ 'Tasks.md': line() });
	const owner = { closed: false };
	const read = vault.app.vault.read.bind(vault.app.vault);
	vi.spyOn(vault.app.vault, 'read').mockImplementationOnce(async (file) => {
		const snapshot = await read(file);
		owner.closed = true;
		return snapshot;
	});
	await expect(openCalendarSource(vault.app, delivery, owner as Window)).rejects.toMatchObject({ code: 'cancelled' });
	expect(openNoteAt).not.toHaveBeenCalled();
});

test('removing the source during the read does not open a stale file object', async () => {
	const vault = memoryVault({ 'Tasks.md': line() });
	const read = vault.app.vault.read.bind(vault.app.vault);
	vi.spyOn(vault.app.vault, 'read').mockImplementationOnce(async (file) => {
		const snapshot = await read(file);
		await vault.adapter.remove(file.path);
		return snapshot;
	});
	await expect(openCalendarSource(vault.app, delivery)).rejects.toMatchObject({ code: 'sourceMissing' });
	expect(openNoteAt).not.toHaveBeenCalled();
});
