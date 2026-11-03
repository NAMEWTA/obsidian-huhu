import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { t } from '../../../../shared/i18n';
import { emptyWorkspace } from '../../core/workspace/model';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import type { ManagedCreateResult } from '../../core/workspace/managed-runtime';
import type { AgentController } from '../../services/controller';
import { NewTabMenu } from './NewTabMenu';

afterEach(() => vi.restoreAllMocks());
function fixture() {
	vi.spyOn(document, 'hasFocus').mockReturnValue(true);
	const settings = normalizeTerminalSettings(undefined);
	const workspace = {
		store: createStore(emptyWorkspace), active: { kind: 'terminal', id: 'tab', focusedSessionId: 'original' },
		createManagedInteractive: vi.fn<() => Promise<ManagedCreateResult>>(),
	};
	const controller = { workspace, settings: { get: () => settings, subscribe: () => () => {} }, agents: { store: createStore(() => ({ detected: {} })), list: () => [] }, runtime: { listAgents: () => [] }, shells: () => [], agentTitle: () => '' } as unknown as AgentController;
	render(<TestProviders><button type="button">Other target</button><div data-terminal-host="original"><textarea aria-label="Original terminal" /></div><NewTabMenu controller={controller} /></TestProviders>);
	return { workspace, trigger: screen.getByRole('button', { name: t('agent.workspace.newTab') }), outside: screen.getByRole('button', { name: 'Other target' }) };
}

test('Escape returns to the original trigger instead of querying and focusing a terminal', async () => {
	const f = fixture(), user = userEvent.setup();
	await user.click(f.trigger);
	await screen.findByRole('combobox');
	await user.keyboard('{Escape}');
	await waitFor(() => expect(document.activeElement).toBe(f.trigger));
	expect(document.activeElement).not.toBe(screen.getByRole('textbox', { name: 'Original terminal' }));
});

test('outside focus and a late created result never pull focus back from the new target', async () => {
	const f = fixture(), user = userEvent.setup();
	let release!: (result: ManagedCreateResult) => void;
	f.workspace.createManagedInteractive.mockImplementation(() => new Promise(resolve => { release = resolve; }));
	await user.click(f.trigger); await screen.findByRole('combobox');
	await user.keyboard('{Enter}');
	await user.click(f.outside);
	await waitFor(() => expect(document.activeElement).toBe(f.outside));
	await act(async () => release({ status: 'created', effect: 'completed', session: { spaceId: 'a', sessionId: 's', title: 'Background', kind: 'shell', createdAt: 1, viewState: 'background', runtime: { runtimeId: 'r', phase: 'connected', activity: 'idle', inputReady: false } } }));
	expect(document.activeElement).toBe(f.outside);
});

test('name field isolates command Enter and IME while retaining Tab and Escape navigation', async () => {
	const f = fixture(), user = userEvent.setup();
	await user.click(f.trigger);
	const name = screen.getByRole('textbox', { name: t('agent.managed.name') });
	await user.click(name); await user.type(name, 'worker'); await user.keyboard('{Enter}');
	expect(f.workspace.createManagedInteractive).not.toHaveBeenCalled();
	await user.tab();
	expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: t('agent.managed.backgroundChoice') }));
	await user.keyboard('{Escape}');
	await waitFor(() => expect(document.activeElement).toBe(f.trigger));
});

test('a late background result after window blur never restores the old trigger or terminal', async () => {
	const f = fixture(), user = userEvent.setup();
	let release!: (result: ManagedCreateResult) => void;
	f.workspace.createManagedInteractive.mockImplementation(() => new Promise(resolve => { release = resolve; }));
	await user.click(f.trigger); await screen.findByRole('combobox'); await user.keyboard('{Enter}');
	vi.mocked(document.hasFocus).mockReturnValue(false);
	window.dispatchEvent(new Event('blur'));
	await act(async () => release({ status: 'created', effect: 'completed', session: { spaceId: 'a', sessionId: 's', title: 'Background', kind: 'shell', createdAt: 1, viewState: 'background', runtime: { runtimeId: 'r', phase: 'connected', activity: 'idle', inputReady: false } } }));
	await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull());
	expect(document.activeElement).not.toBe(f.trigger);
	expect(document.activeElement).not.toBe(screen.getByRole('textbox', { name: 'Original terminal' }));
});

test('an old pending create cannot close or change a later reopened menu instance', async () => {
	const f = fixture(), user = userEvent.setup();
	let release!: (result: ManagedCreateResult) => void;
	f.workspace.createManagedInteractive.mockImplementation(() => new Promise(resolve => { release = resolve; }));
	await user.click(f.trigger); await screen.findByRole('combobox'); await user.keyboard('{Enter}');
	await user.keyboard('{Escape}');
	await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull());
	await user.click(f.trigger); await screen.findByRole('combobox');
	const name = screen.getByRole('textbox', { name: t('agent.managed.name') });
	await user.type(name, 'new menu draft');
	await act(async () => release({ status: 'created', effect: 'completed', session: { spaceId: 'a', sessionId: 's', title: 'Background', kind: 'shell', createdAt: 1, viewState: 'background', runtime: { runtimeId: 'r', phase: 'connected', activity: 'idle', inputReady: false } } }));
	expect(screen.queryByRole('combobox')).not.toBeNull();
	expect((screen.getByRole('textbox', { name: t('agent.managed.name') }) as HTMLInputElement).value).toBe('new menu draft');
	expect(f.workspace.createManagedInteractive).toHaveBeenCalledOnce();
});
