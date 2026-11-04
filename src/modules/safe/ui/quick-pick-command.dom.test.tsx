import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { Command } from 'obsidian';
import type { ModuleContext } from '../../../app/contracts/module';
import { SettingsStore } from '../../../shared/settings/store';
import { setLanguage } from '../../../shared/i18n';
import createSafeModule from '../module';
import { createContainer } from '../platform/crypto';
import { makePayload } from '../core/model';
import { QUICK_PICK_ENTRIES, QUICK_PICK_MASTER, QUICK_PICK_SECRET } from './quick-pick.test-support';

const ports = vi.hoisted(() => ({ files: new Map<string, string>(), storage: {}, clipboard: '', writes: [] as string[], beforeWrite: undefined as ((value: string) => Promise<void>) | undefined }));
// Only the native filesystem and clipboard ports are replaced; module, command, session and modal stay real.
vi.mock('../../../host/obsidian/storage/private-storage', () => ({ desktopVaultRoot: () => '/safe-command-fixture', privateVaultStorage: () => ports.storage }));
vi.mock('../platform/desktop/cipher-files', () => ({ createCipherFiles: () => ({ read: async (name: string) => ports.files.get(name) ?? null, stage: async () => { throw new Error('Quick access must not write files'); }, publish: async () => { throw new Error('Quick access must not write files'); }, discard: async () => {} }) }));
vi.mock('../platform/desktop/actions', () => ({ createDesktopActions: () => ({ clipboard: { readText: async () => ports.clipboard, writeText: async (text: string) => { await ports.beforeWrite?.(text); ports.clipboard = text; ports.writes.push(text); } }, pickBackup: async () => null, pickExport: async () => null, exportCiphertext: async () => {}, openUrl: async () => {} }) }));

async function commandFixture() {
	setLanguage('en');
	const raw = (await createContainer(QUICK_PICK_MASTER, makePayload(QUICK_PICK_ENTRIES))).raw;
	ports.files.clear(); ports.files.set('vault.enc', raw); ports.files.set('vault.enc.backup', raw); ports.clipboard = ''; ports.writes = []; ports.beforeWrite = undefined;
	const owner = document.createElement('div'); Object.defineProperty(owner, 'win', { value: window }); document.body.append(owner);
	const commands: Command[] = [];
	const settings = new SettingsStore({ load: async () => null, save: async (_scope, file) => file }, { timers: { set: (run, ms) => window.setTimeout(run, ms), clear: handle => window.clearTimeout(Number(handle)) } });
	const module = await createSafeModule({ app: { workspace: { containerEl: owner, getActiveViewOfType: () => ({ containerEl: owner }) } }, env: { desktop: true }, settings, commands: { add: (command: Command) => { commands.push(command); return command; } } } as unknown as ModuleContext);
	await module.activate?.(new AbortController().signal);
	return { module, owner, commands, settings, dispose: async () => { await module.dispose('disabled'); owner.remove(); } };
}

test('the real registered quick command unlocks, copies and closes when its module is disabled', async () => {
	const f = await commandFixture();
	try {
		const command = f.commands.find(item => item.id === 'safe-quick-pick')!;
		expect(command.name).toBe('Quick access');
		await act(async () => command.callback?.());
		await screen.findByRole('dialog', { name: 'Quick access' });
		expect(screen.queryByRole('combobox')).toBeNull();
		const password = screen.getByLabelText('Master password');
		fireEvent.change(password, { target: { value: QUICK_PICK_MASTER } });
		fireEvent.submit(password.closest('form')!);
		const search = await screen.findByRole('combobox');
		fireEvent.keyDown(search, { key: 'Enter' });
		await waitFor(() => expect(ports.clipboard).toBe(QUICK_PICK_SECRET));
		await act(async () => f.module.dispose('disabled'));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect((search as HTMLInputElement).value).toBe('');
		expect(document.body.innerHTML).not.toContain(QUICK_PICK_SECRET);
	} finally { await act(async () => f.dispose()); }
});

test('repeated quick commands replace the previous request and leave only one modal', async () => {
	const f = await commandFixture();
	try {
		const command = f.commands.find(item => item.id === 'safe-quick-pick')!;
		await act(async () => { command.callback?.(); command.callback?.(); });
		await screen.findByRole('dialog', { name: 'Quick access' });
		expect(screen.getAllByRole('dialog')).toHaveLength(1);
		await act(async () => command.callback?.());
		await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
		expect(screen.getByLabelText('Master password')).toBeDefined();
	} finally { await act(async () => f.dispose()); }
});

test('module disable during a native clipboard write closes the modal and clears only its late copied value', async () => {
	const f = await commandFixture();
	let release!: () => void, entered!: () => void;
	const paused = new Promise<void>(resolve => { release = resolve; });
	const reached = new Promise<void>(resolve => { entered = resolve; });
	try {
		await act(async () => f.commands.find(item => item.id === 'safe-quick-pick')!.callback?.());
		const password = await screen.findByLabelText('Master password');
		fireEvent.change(password, { target: { value: QUICK_PICK_MASTER } }); fireEvent.submit(password.closest('form')!);
		const search = await screen.findByRole('combobox');
		ports.beforeWrite = async text => { if (text) { entered(); await paused; } };
		fireEvent.keyDown(search, { key: 'Enter' }); await reached;
		await act(async () => f.module.dispose('disabled'));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect((search as HTMLInputElement).value).toBe('');
		release();
		await waitFor(() => expect(ports.writes).toEqual([QUICK_PICK_SECRET, '']));
		expect(ports.clipboard).toBe('');
		expect(document.body.innerHTML).not.toContain(QUICK_PICK_SECRET);
	} finally { release(); await act(async () => f.dispose()); }
});

test('disabling immediately after a command prevents a late lazy UI from appearing', async () => {
	const f = await commandFixture();
	try {
		await act(async () => {
			f.commands.find(item => item.id === 'safe-quick-pick')!.callback?.();
			await f.module.dispose('disabled');
			await import('./quick-pick-dialog');
		});
		expect(screen.queryByRole('dialog')).toBeNull();
	} finally { await act(async () => f.dispose()); }
});
