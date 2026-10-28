import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setLanguage, t } from '../../../../shared/i18n';
import { TestProviders } from '../../../../ui/react/test-providers';
import type { VaultBinding } from '../../core/space/model';
import { SpaceService } from '../../services/spaces/space-service';
import { SpaceForm } from './SpaceForm';
import { SpaceNavigation } from '../sidebar/SpaceNavigation';
import { SpaceChoices } from './SpacePicker';
import { SpaceEmptyState } from './SpaceEmptyState';
import type { WorkspaceService } from '../../services/workspace-service';

const vault: VaultBinding = { vaultId: 'v', deviceId: 'd', rootPath: '/vault', root: { canonicalPath: '/vault', dev: '1', ino: '2' } };
function fixture(wait?: Promise<void>) {
	const files = new Map<string, string>(), lost = new AbortController();
	const write = vi.fn(async (p: string, text: string) => { files.set(p, text); });
	const choose = vi.fn(async () => ({ selectedPath: '/external', target: { canonicalPath: '/external', dev: '1', ino: '3' }, vaultRoot: vault.root, deviceId: 'd' }));
	const acquire = vi.fn(async () => ({ instanceId: 'ui', port: 1, lost: lost.signal, assertHeld: async () => {}, close: async () => {} }));
	const spaces = new SpaceService({ instanceId: 'ui', report: vi.fn(), storage: { exists: async p => files.has(p), read: async p => files.get(p)!, write, mkdir: async () => {} },
		directories: { inspectVault: async () => { await wait; return vault; }, assertVault: async () => {}, bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: vault.root }), chooseExternalDirectory: choose, resolveDirectory: async () => ({ cwd: '/vault' }) }, owners: { acquire } });
	return { spaces, files, write, choose, acquire };
}
beforeEach(() => setLanguage('en'));

test('real form creates an empty Space by keyboard; rename keeps ID and IME Enter does not submit', async () => {
	const f = fixture(); await f.spaces.ready;
	const user = userEvent.setup(), finish = vi.fn();
	const view = render(<TestProviders><SpaceForm spaces={f.spaces} finish={finish} /></TestProviders>);
	const input = screen.getByLabelText(t('agent.spaces.name'));
	await user.type(input, 'Project');
	fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
	expect(finish).not.toHaveBeenCalled();
	await user.keyboard('{Enter}');
	await vi.waitFor(() => expect(finish).toHaveBeenCalledOnce());
	const id = f.spaces.list()[0]!.id;
	expect(Object.keys(f.spaces.store.getState().records.sessions)).toHaveLength(0);
	view.unmount();
	render(<TestProviders><SpaceForm spaces={f.spaces} existing={f.spaces.resolve({ spaceId: id })} finish={vi.fn()} /></TestProviders>);
	const rename = screen.getByLabelText(t('agent.spaces.name'));
	await user.clear(rename); await user.type(rename, 'Renamed{Enter}');
	await vi.waitFor(() => expect(f.spaces.resolve({ spaceId: id }).name).toBe('Renamed'));
	await f.spaces.dispose();
});

test('native directory selection remains uncommitted until Save; cancelling the form leaves no grant or Space', async () => {
	const f = fixture(); await f.spaces.ready;
	const finish = vi.fn(), user = userEvent.setup();
	const view = render(<TestProviders><SpaceForm spaces={f.spaces} finish={finish} /></TestProviders>);
	await user.type(screen.getByLabelText(t('agent.spaces.name')), 'External');
	await user.click(screen.getByRole('button', { name: t('agent.spaces.chooseExternal') }));
	expect(await screen.findByText(t('agent.spaces.externalConfirm', { path: '/external' }))).toBeTruthy();
	expect(f.choose).toHaveBeenCalledOnce();
	expect(f.acquire).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: t('common.cancel') }));
	view.unmount();
	expect(f.spaces.list()).toHaveLength(0);
	expect(Object.keys(f.spaces.store.getState().records.grants)).toHaveLength(0);
	await f.spaces.dispose();
});

test('loading/empty/error and long-name navigation keep controls named; arrows, Home/End and Enter select an exact ID', async () => {
	let release!: () => void;
	const f = fixture(new Promise(resolve => { release = resolve; }));
	const user = userEvent.setup();
	const view = render(<TestProviders><SpaceNavigation spaces={f.spaces} select={id => f.spaces.select(id)} /></TestProviders>);
	expect(screen.getByRole('status').textContent).toBe(t('agent.spaces.loading'));
	expect((screen.getByRole('button', { name: t('agent.spaces.create') }) as HTMLButtonElement).disabled).toBe(true);
	await act(async () => { release(); await f.spaces.ready; });
	expect(screen.getByText(t('agent.spaces.noSpaces'))).toBeTruthy();
	const a = await act(async () => f.spaces.create({ name: 'A'.repeat(200), relativePath: '' }));
	const b = await act(async () => f.spaces.create({ name: 'B', relativePath: '' }));
	const first = screen.getByRole('button', { name: a.name });
	first.focus();
	await user.keyboard('{End}{Enter}');
	await vi.waitFor(() => expect(f.spaces.store.getState().records.selectedSpaceId).toBe(b.id));
	await user.keyboard('{Home}{Enter}');
	await vi.waitFor(() => expect(f.spaces.store.getState().records.selectedSpaceId).toBe(a.id));
	expect(first.getAttribute('title')).toContain(a.id);
	view.unmount(); await f.spaces.dispose();
	const broken = fixture(); await broken.spaces.ready;
	broken.write.mockRejectedValue(new Error('full'));
	render(<TestProviders><SpaceForm spaces={broken.spaces} finish={vi.fn()} /></TestProviders>);
	await user.type(screen.getByLabelText(t('agent.spaces.name')), 'Failed{Enter}');
	expect((await screen.findByRole('alert')).textContent).toBe(t('agent.spaces.error.save'));
	expect(broken.spaces.list()).toHaveLength(0);
	expect(within(screen.getByRole('dialog')).getByRole('button', { name: t('common.save') })).toBeTruthy();
	await expect(broken.spaces.dispose()).rejects.toBeDefined();
});

test('duplicate name choices expose full stable IDs and require an explicit click or keyboard activation', async () => {
	const choose = vi.fn(), user = userEvent.setup();
	render(<TestProviders><SpaceChoices choices={[{ id: 'space-a', name: 'same', directoryLabel: '/vault' }, { id: 'space-b', name: 'same', directoryLabel: '/vault' }]} choose={choose} /></TestProviders>);
	expect(choose).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: /space-b/ }));
	expect(choose).toHaveBeenCalledWith('space-b');
});

test('an empty chooser offers Create Space and returns the new Space as the choice; with Spaces there is no create action', async () => {
	const f = fixture(); await f.spaces.ready;
	const user = userEvent.setup(), choose = vi.fn();
	const view = render(<TestProviders><SpaceChoices choices={[]} choose={choose} spaces={f.spaces} /></TestProviders>);
	expect(screen.getByText(t('agent.spaces.noSpacesHint'))).toBeTruthy();
	await user.click(screen.getByRole('button', { name: t('agent.spaces.create') }));
	await user.type(screen.getByLabelText(t('agent.spaces.name')), 'First{Enter}');
	await vi.waitFor(() => expect(choose).toHaveBeenCalledOnce());
	expect(choose).toHaveBeenCalledWith(f.spaces.list()[0]!.id);
	view.unmount();
	render(<TestProviders><SpaceChoices choices={[{ id: 'space-a', name: 'A', directoryLabel: '/vault' }]} choose={choose} spaces={f.spaces} /></TestProviders>);
	expect(screen.queryByRole('button', { name: t('agent.spaces.create') })).toBeNull();
	await f.spaces.dispose();
});

test('pending save ignores Escape/close; a failed save stays visible and explicit retry restores both data and navigation', async () => {
	const f = fixture(); await f.spaces.ready;
	let reject!: (error: Error) => void, entered!: () => void;
	const waiting = new Promise<void>(resolve => { entered = resolve; });
	f.write.mockImplementationOnce(async () => { entered(); await new Promise<void>((_resolve, fail) => { reject = fail; }); });
	const user = userEvent.setup(), finish = vi.fn();
	const view = render(<TestProviders><SpaceForm spaces={f.spaces} finish={finish} /></TestProviders>);
	await user.type(screen.getByLabelText(t('agent.spaces.name')), 'Retry{Enter}');
	await waiting;
	await user.keyboard('{Escape}');
	expect(screen.getByRole('dialog')).toBeTruthy();
	const close = within(screen.getByRole('dialog')).getByRole('button', { name: /close/i });
	await user.click(close);
	expect(screen.getByRole('dialog')).toBeTruthy();
	expect(finish).not.toHaveBeenCalled();
	await act(async () => { reject(new Error('disk full')); });
	expect(await screen.findByRole('alert')).toBeTruthy();
	view.unmount();
	const nav = render(<TestProviders><SpaceNavigation spaces={f.spaces} select={id => f.spaces.select(id)} /></TestProviders>);
	const create = screen.getByRole('button', { name: t('agent.spaces.create') });
	expect((create as HTMLButtonElement).disabled).toBe(false);
	await user.click(create);
	await user.type(screen.getByLabelText(t('agent.spaces.name')), 'Recovered{Enter}');
	await vi.waitFor(() => expect(f.spaces.list()[0]?.name).toBe('Recovered'));
	await f.spaces.flush();
	nav.unmount(); await f.spaces.dispose();
});

test('production empty-state actions keep Browser available without a Space and freeze the selected ID for terminal creation', async () => {
	const f = fixture(); await f.spaces.ready;
	const user = userEvent.setup();
	const actions = { browserAvailable: true, newBrowser: vi.fn(), newTerminal: vi.fn(async () => undefined), selectSpace: (id: string) => f.spaces.select(id), report: vi.fn() };
	render(<TestProviders><SpaceEmptyState spaces={f.spaces} workspace={actions as unknown as WorkspaceService} /></TestProviders>);
	expect(screen.getByText(t('agent.spaces.noSpaces'))).toBeTruthy();
	await user.click(screen.getByRole('button', { name: t('agent.workspace.newBrowser') }));
	expect(actions.newBrowser).toHaveBeenCalledOnce();
	expect(actions.newTerminal).not.toHaveBeenCalled();
	const a = await act(async () => f.spaces.create({ name: 'A', relativePath: '' }));
	await act(async () => { await f.spaces.select(a.id); });
	expect(screen.getByText(t('agent.spaces.empty'))).toBeTruthy();
	await user.click(screen.getByRole('button', { name: t('agent.workspace.newTerminal') }));
	expect(actions.newTerminal).toHaveBeenCalledWith({ spaceId: a.id });
	await f.spaces.dispose();
});
