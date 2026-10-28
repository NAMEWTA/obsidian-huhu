import { expect, test, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { t } from '../../../../shared/i18n';
import { emptyWorkspace } from '../../core/workspace/model';
import type { AgentController } from '../../services/controller';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import { Omnibox } from './Omnibox';
import type { ManagedCreateResult } from '../../core/workspace/managed-runtime';
import { AGENT_CATALOG } from '../../core/launch/catalog';
const created: ManagedCreateResult = { status: 'created', effect: 'completed', session: { spaceId: 'space-a', sessionId: 'saved', title: 'Shell', kind: 'shell', createdAt: 1, viewState: 'background', runtime: { runtimeId: 'runtime', phase: 'connected', activity: 'idle', inputReady: false } } };
function fixture(allProviders = false) {
	const spaces = createStore(() => ({ records: { selectedSpaceId: 'space-a' as string | undefined } }));
	const workspace = {
		store: createStore(emptyWorkspace),
		browserAvailable: false,
		newTerminal: vi.fn(async () => 'session'),
		newAgent: vi.fn(async () => 'agent-session'),
		createManagedInteractive: vi.fn<() => Promise<ManagedCreateResult>>(async () => created),
		newBrowser: vi.fn(() => {
			throw new Error(t('agent.workspace.browserDisabled'));
		}),
		activate: vi.fn(),
	};
	const settings=normalizeTerminalSettings(undefined);
 const agents=allProviders ? AGENT_CATALOG.map(agent => ({ ...agent, installed: true, enabled: true })) : [{id:'claude-code',title:'Claude Code',installed:true,enabled:true}];
 const controller = {
		workspace,
		spaces: { store: spaces },
		runtime: { listAgents: () => [{ id: 'claude-code', title: 'Claude Code', installed: true, enabled: true }] },
		settings: { get: () => settings, subscribe: () => () => {} },
  agents: {store:createStore(()=>({detected:{},refreshing:false,failed:false})),list:()=>agents},
		agentTitle: (id: string) => agents.find(agent => agent.id === id)?.title ?? id,
		shells: () => [{ choice: 'default', title: 'Shell' }],
		open: vi.fn(async () => {}),
	} as unknown as AgentController;
	const done = vi.fn();
	render(
		<TestProviders>
			<Omnibox controller={controller} groupId="group" onDone={done} />
		</TestProviders>,
	);
	return { workspace, spaces, done, input: screen.getByRole('combobox') };
}
test('empty Enter opens the default terminal in the current group', async () => {
	const f = fixture(),
		user = userEvent.setup();
	f.input.focus();
	await user.keyboard('{Enter}');
	await waitFor(() => expect(f.workspace.createManagedInteractive).toHaveBeenCalledWith({ kind: 'shell', groupId: 'group', spaceId: 'space-a', foreground: true, title: undefined, shell: undefined }));
	expect(f.done).toHaveBeenCalledOnce();
});
test('agent alias Enter launches and browser failure retains input and menu', async () => {
	const f = fixture(),
		user = userEvent.setup();
	await user.type(f.input, 'claude');
	await user.keyboard('{Enter}');
	await waitFor(() => expect(f.workspace.createManagedInteractive).toHaveBeenCalledWith({ kind: 'agent', agentId: 'claude-code', groupId: 'group', spaceId: 'space-a', foreground: true, title: undefined }));
	await user.clear(f.input);
	await user.type(f.input, 'example.com');
	await user.keyboard('{Enter}');
	await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(t('agent.workspace.browserDisabled')));
	expect((f.input as HTMLInputElement).value).toBe('example.com');
	expect(f.workspace.newBrowser).toHaveBeenCalledWith('https://example.com/', { groupId: 'group' });
});
test('Arrow keys select static actions; composition Enter never launches', async () => {
	const f = fixture(),
		user = userEvent.setup();
	f.input.focus();
	fireEvent.keyDown(f.input, { key: 'Enter', isComposing: true });
	expect(f.workspace.createManagedInteractive).not.toHaveBeenCalled();
	await user.type(f.input, 'claude');
	await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');
	await waitFor(() => expect(f.workspace.createManagedInteractive).toHaveBeenCalledOnce());
});

test('empty input still executes a static action selected with arrow keys', async () => {
	const f = fixture(),
		user = userEvent.setup();
	f.input.focus();
	await user.keyboard('{ArrowDown}{Enter}');
	await waitFor(() => expect(f.workspace.createManagedInteractive).toHaveBeenCalledWith(expect.objectContaining({ kind: 'agent', agentId: 'claude-code' })));
	expect(f.workspace.newTerminal).not.toHaveBeenCalled();
});

test('optional title and GUI background choice use the interactive structured entry with the captured Space', async () => {
	const f = fixture(), user = userEvent.setup();
	await user.type(screen.getByRole('textbox', { name: t('agent.managed.name') }), 'worker');
	await user.click(screen.getByRole('checkbox', { name: t('agent.managed.backgroundChoice') }));
	await user.click(screen.getByRole('option', { name: new RegExp(t('agent.workspace.newTerminal')) }));
	await waitFor(() => expect(f.workspace.createManagedInteractive).toHaveBeenCalledWith({ kind: 'shell', groupId: 'group', spaceId: 'space-a', shell: undefined, title: 'worker', foreground: false }));
	expect(f.done).toHaveBeenCalledOnce();
});

test('cancelled and failed structured results retain input without onDone or automatic retries', async () => {
	const f = fixture(), user = userEvent.setup();
	f.workspace.createManagedInteractive.mockResolvedValueOnce({ status: 'cancelled', effect: 'none', reason: 'space-selection' });
	await user.type(f.input, 'claude'); await user.keyboard('{Enter}');
	await waitFor(() => expect((f.input as HTMLInputElement).readOnly).toBe(false));
	expect(f.done).not.toHaveBeenCalled();
	expect((f.input as HTMLInputElement).value).toBe('claude');
	f.workspace.createManagedInteractive.mockResolvedValueOnce({ status: 'failed', effect: 'unknown', error: { code: 'EFFECT_UNKNOWN', reason: 'spawn-result-lost', messageKey: 'agent.managed.effectUnknown', nextAction: 'inspect-runtime', details: {} } });
	await user.keyboard('{Enter}');
	await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t('agent.managed.effectUnknown')));
	expect(f.done).not.toHaveBeenCalled();
	expect(f.workspace.createManagedInteractive).toHaveBeenCalledTimes(2);
});

test('pending blocks duplicate submits and keeps the initial Space while selection changes', async () => {
	const f = fixture(), user = userEvent.setup();
	let release!: (result: ManagedCreateResult) => void;
	f.workspace.createManagedInteractive.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
	f.input.focus(); await user.keyboard('{Enter}{Enter}');
	expect(f.workspace.createManagedInteractive).toHaveBeenCalledOnce();
	f.spaces.setState({ records: { selectedSpaceId: 'space-b' } });
	release(created);
	await waitFor(() => expect(f.done).toHaveBeenCalledOnce());
	expect(f.workspace.createManagedInteractive).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'space-a' }));
});

test.each(AGENT_CATALOG)('the retained $id entry reaches the same managed interactive path', async provider => {
	const f = fixture(true), user = userEvent.setup();
	await user.click(screen.getByRole('option', { name: name => name.includes(provider.title) }));
	await waitFor(() => expect(f.workspace.createManagedInteractive).toHaveBeenCalledWith(expect.objectContaining({ kind: 'agent', agentId: provider.id, foreground: true, spaceId: 'space-a' })));
});

test('no selected Space is passed to the existing interactive selection port without inventing a target', async () => {
	const f = fixture(), user = userEvent.setup();
	f.spaces.setState({ records: { selectedSpaceId: undefined } });
	f.workspace.createManagedInteractive.mockResolvedValueOnce({ status: 'cancelled', effect: 'none', reason: 'space-selection' });
	f.input.focus(); await user.keyboard('{Enter}');
	await waitFor(() => expect(f.workspace.createManagedInteractive).toHaveBeenCalledWith(expect.objectContaining({ spaceId: undefined })));
	expect(f.done).not.toHaveBeenCalled();
});

test('static terminal actions, agents and settings retain Orca groups and separators', () => {
	fixture();
	expect(screen.getByRole('group', { name: t('agent.workspace.menu.actions') }).textContent).toContain(
		t('agent.workspace.newTerminal'),
	);
	expect(screen.getByRole('group', { name: t('agent.workspace.menu.agents') }).textContent).toContain('Claude Code');
	expect(screen.getByRole('group', { name: t('agent.workspace.menu.settings') }).textContent).toContain(
		t('agent.workspace.agentSettings'),
	);
	expect(document.querySelectorAll('[cmdk-separator]')).toHaveLength(2);
});
