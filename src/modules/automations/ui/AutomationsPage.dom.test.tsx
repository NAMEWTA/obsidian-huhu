import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { setLanguage, t } from '../../../shared/i18n';
import { EditorView } from './editor/EditorView';
import { newDraft, draftError } from './editor/draft';
import { AUTOMATION_TEMPLATES } from '../core/templates';
import type { AutomationRun } from '../../../shared/automation/types';

beforeEach(() => setLanguage('en'));
import { definition, fixture } from './test-fixture';
test('failed calendar history retries the original delivery and opens its receipt instead of launching a new manual task', async () => {
	const original = { ...definition('Calendar'), action: { kind: 'create-task' as const, target: 'calendar' as const, path: 'Board.md', text: 'Review' } };
	const failed: AutomationRun = { id: 'old-run', automationId: original.id, revision: 1, title: original.name,
		definition: original, status: 'failed', trigger: 'scheduled', scheduledFor: 1000, startedAt: 1000, message: '',
		taskDelivery: { effectKey: 'one-occurrence', date: '2026-10-23', timezone: 'Asia/Taipei', receipt: { id: 'task', path: 'Tasks.md', line: 4, date: '2026-10-23' } } };
	const f = fixture([original], [failed]), user = userEvent.setup();
	f.service.retryRun = vi.fn(async () => ({ ...failed, id: 'retried-run' }));
	f.host.openLink = vi.fn(async () => {});
	f.host.openCalendarSource = vi.fn(async () => {});
	f.listeners.forEach((listener) => listener());
	render(<f.Page />);
	await user.click(screen.getByRole('button', { name: 'Calendar' }));
	await user.click(screen.getByRole('tab', { name: t('automation.history') }));
	await user.click(screen.getByRole('button', { name: t('automation.viewOutput') }));
	expect(screen.getByText(/2026-10-23.*Asia\/Taipei/)).toBeTruthy();
	await user.click(screen.getByRole('button', { name: t('automation.calendarOpenSource') }));
	expect(f.host.openCalendarSource).toHaveBeenCalledWith(failed.taskDelivery, window);
	expect(f.host.openLink).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: t('automation.calendarRetry') }));
	await waitFor(() => expect(f.service.retryRun).toHaveBeenCalledWith(expect.objectContaining({ id: 'old-run' })));
	expect(f.service.run).not.toHaveBeenCalled();
	f.view.dispose();
});
test('search arrows select visible rows, Enter opens detail, modifiers and IME do not activate rows', async () => {
	const f = fixture();
	const { container } = render(<f.Page />);
	const search = screen.getByRole('textbox', { name: t('automation.searchAll') });
	fireEvent.keyDown(search, { key: 'ArrowDown' });
	expect(container.querySelector('[data-current=true]')?.getAttribute('data-automation-row-id')).toBe('Alpha');
	fireEvent.keyDown(search, { key: 'ArrowDown' });
	expect(container.querySelector('[data-current=true]')?.getAttribute('data-automation-row-id')).toBe('Beta');
	fireEvent.keyDown(search, { key: 'ArrowUp' });
	expect(container.querySelector('[data-current=true]')?.getAttribute('data-automation-row-id')).toBe('Alpha');
	fireEvent.keyDown(search, { key: 'Enter', isComposing: true });
	fireEvent.keyDown(search, { key: 'Enter', ctrlKey: true });
	expect(f.navigate).not.toHaveBeenCalled();
	fireEvent.change(search, { target: { value: 'body Beta' } });
	fireEvent.keyDown(search, { key: 'ArrowDown' });
	fireEvent.keyDown(search, { key: 'Enter' });
	expect(f.navigate).toHaveBeenLastCalledWith({ feature: 'automations', section: 'tasks', resourceId: 'Beta' });
	expect(await screen.findByRole('tab', { name: t('automation.overview') })).toBeTruthy();
	f.view.dispose();
});
test('row controls and portaled menu actions never open detail; status filter and pills can be removed', async () => {
	const user = userEvent.setup(),
		f = fixture();
	render(<f.Page />);
	await user.click(screen.getByRole('switch', { name: 'Pause Alpha' }));
	expect(f.service.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'Alpha', enabled: false }));
	expect(f.navigate).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Actions for Alpha' }));
	await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
	await waitFor(() => expect(document.querySelector('[data-automation-editor]')).not.toBeNull());
	expect(f.navigate).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Close' }));
	expect(document.querySelector('[data-automation-editor]')).toBeNull();
	await user.click(screen.getByRole('button', { name: 'Filter' }));
	await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Paused' }));
	expect(screen.queryByRole('button', { name: 'Alpha' })).toBeNull();
	await user.click(screen.getByRole('button', { name: 'Clear all' }));
	expect(screen.getByRole('button', { name: 'Alpha' })).toBeTruthy();
	f.view.dispose();
});
test('template opens a prefilled reminder, validates name, saves and runs with the saved revision', async () => {
	const f = fixture([]),
		user = userEvent.setup();
	render(<f.Page />);
	await user.click(screen.getByRole('button', { name: /Drink water/ }));
	await waitFor(() => expect(document.querySelector('[data-automation-editor]')).not.toBeNull());
	const dialog = document.querySelector<HTMLElement>('[data-automation-editor]')!;
	expect((within(dialog).getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Drink water');
	fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), { target: { value: '' } });
	expect((within(dialog).getByRole('button', { name: 'Create' }) as HTMLButtonElement).disabled).toBe(true);
	fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), { target: { value: 'Hydrate' } });
	await user.click(within(dialog).getByRole('button', { name: 'Save and run' }));
	await waitFor(() =>
		expect(f.service.save).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Hydrate',
				templateId: 'water',
				action: { kind: 'notify', body: 'Time for a glass of water.' },
			}),
		),
	);
	expect(f.service.run).toHaveBeenCalledTimes(1);
	f.view.dispose();
});
test('source reminder keeps task identity and source-provided title through save', async () => {
	const f = fixture(),
		close = vi.fn();
	const source = { kind: 'dashboard' as const, path: 'Board.md', id: 'task-id' };
	render(
		<TestProviders>
			<EditorView host={f.host} request={{ source, prefill: { name: 'Follow up' } }} onSaved={close} onClose={close} />
		</TestProviders>,
	);
	await userEvent.click(screen.getByRole('button', { name: 'Create' }));
	await waitFor(() =>
		expect(f.service.save).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Follow up', source, action: { kind: 'notify', body: 'Follow up' } }),
		),
	);
	f.view.dispose();
});
test('agent availability is rechecked and stale choices/user content are never replaced', () => {
	const agents = [
		{ id: 'claude-code', title: 'Claude Code', enabled: true, installed: false },
		{ id: 'codex', title: 'Codex', enabled: true, installed: true },
	];
	const draft = newDraft({}, 'device', '/vault', agents);
	expect(draft.action).toMatchObject({ kind: 'agent', agentId: 'codex' });
	draft.name = 'Original';
	if (draft.action.kind !== 'agent') throw Error('Expected agent');
	draft.action.prompt = 'Original prompt';
	// A new agent draft never starts with a guessed Space; saving needs the user's explicit choice.
	expect(draft.action.spaceId).toBeUndefined();
	expect(draftError(draft, agents, '/vault')).toBe(t('automation.spaceRequired'));
	draft.action.spaceId = 'space-a';
	expect(draftError(draft, agents, '/vault')).toBeUndefined();
	agents[1]!.installed = false;
	expect(draftError(draft, agents, '/vault')).toBe(t('automation.agentSelectionUnavailable'));
	expect(newDraft({ existing: draft }, 'device', '/vault', agents)).toEqual(draft);
	expect(AUTOMATION_TEMPLATES).toHaveLength(5);
});
test('forbidden extras remain visible in the editor and prevent saving; draft is localized without replacing text', async () => {
	const f = fixture(),
		close = vi.fn();
	f.service.agent = () => ({
		listAgents: () => [{ id: 'claude-code', title: 'Claude Code', enabled: true }],
		listSpaces: () => [{ id: 'space-a', name: 'Alpha space', directoryLabel: '/vault' }],
		listSessions: async () => [],
		start: vi.fn(),
		stop: vi.fn(),
		open: vi.fn(),
	});
	const d = definition('User title');
	d.action = {
		kind: 'agent',
		agentId: 'claude-code',
		prompt: 'User prompt',
		cwd: '/vault',
		sessionMode: 'fresh',
		spaceId: 'space-a',
		extraArgs: '--dangerously-skip-permissions',
	};
	const { rerender } = render(
		<TestProviders>
			<EditorView host={f.host} request={{ existing: d }} onSaved={close} onClose={close} />
		</TestProviders>,
	);
	expect(screen.getAllByText(/Rejected extra argument/).length).toBeGreaterThan(0);
	expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
	fireEvent.change(screen.getByRole('textbox', { name: 'Extra arguments' }), { target: { value: '--model opus' } });
	expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false);
	setLanguage('zh');
	rerender(
		<TestProviders>
			<EditorView host={f.host} request={{ existing: d }} onSaved={close} onClose={close} />
		</TestProviders>,
	);
	expect((screen.getByRole('textbox', { name: '名称' }) as HTMLInputElement).value).toBe('User title');
	expect((screen.getByRole('textbox', { name: '提示词 / 内容' }) as HTMLTextAreaElement).value).toBe('User prompt');
	cleanup();
	f.view.dispose();
	expect(f.listeners.size).toBe(0);
});

test('an old agent definition without a Space reads normally but cannot be saved until the user chooses one', async () => {
	const f = fixture(),
		close = vi.fn(),
		user = userEvent.setup();
	f.service.agent = () => ({
		listAgents: () => [{ id: 'codex', title: 'Codex', enabled: true, installed: true }],
		listSpaces: () => [
			{ id: 'space-a', name: 'Alpha space', directoryLabel: '/vault/a' },
			{ id: 'space-b', name: 'Beta space', directoryLabel: '/vault/b' },
		],
		listSessions: async () => [],
		start: vi.fn(),
		stop: vi.fn(),
		open: vi.fn(),
	});
	const d = definition('Legacy');
	d.action = { kind: 'agent', agentId: 'codex', prompt: 'Old prompt', cwd: '/vault', sessionMode: 'fresh' };
	render(
		<TestProviders>
			<EditorView host={f.host} request={{ existing: d }} onSaved={close} onClose={close} />
		</TestProviders>,
	);
	// Nothing is pre-selected even though two Spaces exist, and the problem is stated.
	expect(screen.getByRole('combobox', { name: 'Space' }).textContent).toContain(t('automation.select'));
	expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
	expect((screen.getByRole('textbox', { name: 'Prompt / content' }) as HTMLTextAreaElement).value).toBe('Old prompt');
	await user.click(screen.getByRole('combobox', { name: 'Space' }));
	await user.click(await screen.findByText('Beta space · /vault/b'));
	expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false);
	await user.click(screen.getByRole('button', { name: 'Save' }));
	await waitFor(() =>
		expect(f.service.save).toHaveBeenCalledWith(
			expect.objectContaining({ action: expect.objectContaining({ spaceId: 'space-b' }) }),
		),
	);
	cleanup();
	f.view.dispose();
});
test('a Space archived after it was chosen is shown as unavailable and blocks saving instead of switching Spaces', async () => {
	const f = fixture(),
		close = vi.fn();
	f.service.agent = () => ({
		listAgents: () => [{ id: 'codex', title: 'Codex', enabled: true, installed: true }],
		listSpaces: () => [{ id: 'space-b', name: 'Beta space', directoryLabel: '/vault/b' }],
		listSessions: async () => [],
		start: vi.fn(),
		stop: vi.fn(),
		open: vi.fn(),
	});
	const d = definition('Bound');
	d.action = { kind: 'agent', agentId: 'codex', prompt: 'P', cwd: '/vault', sessionMode: 'fresh', spaceId: 'space-gone' };
	render(
		<TestProviders>
			<EditorView host={f.host} request={{ existing: d }} onSaved={close} onClose={close} />
		</TestProviders>,
	);
	expect(screen.getByRole('combobox', { name: 'Space' }).textContent).toContain(t('automation.spaceUnavailableOption'));
	expect(screen.getAllByText(t('automation.spaceUnavailable')).length).toBeGreaterThan(0);
	await userEvent.click(screen.getByRole('button', { name: 'Save' }));
	await waitFor(() => expect(screen.getAllByText(t('automation.spaceUnavailable')).length).toBeGreaterThan(0));
	expect(f.service.save).not.toHaveBeenCalled();
	cleanup();
	f.view.dispose();
});

test('disabled execution blocks every mutation while preserving readable definitions and history', async () => {
	const f = fixture();
	Object.defineProperty(f.service, 'executionEnabled', { value: false });
	f.listeners.forEach((listener) => listener());
	const user = userEvent.setup();
	render(<f.Page />);
	expect(screen.getByRole('alert').textContent).toContain(t('automation.moduleOff'));
	expect((screen.getByRole('switch', { name: 'Pause Alpha' }) as HTMLButtonElement).disabled).toBe(true);
	expect((screen.getByRole('button', { name: t('automation.new') }) as HTMLButtonElement).disabled).toBe(true);
	await user.click(screen.getByRole('button', { name: 'Actions for Alpha' }));
	for (const item of screen.getAllByRole('menuitem')) expect(item.getAttribute('aria-disabled')).toBe('true');
	await user.keyboard('{Escape}');
	await user.click(screen.getByRole('button', { name: 'Alpha' }));
	expect(await screen.findByRole('tab', { name: t('automation.overview') })).toBeTruthy();
	expect((screen.getByRole('button', { name: t('automation.run') }) as HTMLButtonElement).disabled).toBe(true);
	expect(f.service.save).not.toHaveBeenCalled();
	expect(f.service.run).not.toHaveBeenCalled();
	f.view.dispose();
});

test('delete confirmation preference survives a page remount and deletion preserves the service history', async () => {
	const f = fixture(),
		user = userEvent.setup();
	let skip = false;
	f.host.skipDeleteConfirmation = () => skip;
	f.host.setSkipDeleteConfirmation = vi.fn(async (value) => {
		skip = value;
	});
	const page = render(<f.Page />);
	await user.click(screen.getByRole('button', { name: 'Actions for Alpha' }));
	await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
	const dialog = await screen.findByRole('alertdialog');
	await user.click(within(dialog).getByRole('checkbox'));
	await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
	await waitFor(() => expect(f.host.setSkipDeleteConfirmation).toHaveBeenCalledWith(true));
	expect(f.service.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'Alpha' }));
	page.unmount();
	render(<f.Page />);
	await user.click(screen.getByRole('button', { name: 'Actions for Beta' }));
	await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
	await waitFor(() => expect(f.service.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'Beta' })));
	expect(screen.queryByRole('alertdialog')).toBeNull();
	f.view.dispose();
});

test.each(['Filter', 'Actions for Alpha'])(
	'hiding a leaf closes %s, releases locks, and retains page state',
	async (label) => {
		const f = fixture(),
			user = userEvent.setup();
		const page = render(<f.Page />);
		fireEvent.change(screen.getByRole('textbox', { name: t('automation.searchAll') }), {
			target: { value: 'Alpha' },
		});
		await user.click(screen.getByRole('button', { name: label }));
		expect(await screen.findByRole('menu')).toBeTruthy();
		page.rerender(<f.Page visible={false} />);
		await waitFor(() => {
			expect(screen.queryByRole('menu')).toBeNull();
			expect(document.body.style.pointerEvents).not.toBe('none');
			expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
		});
		page.rerender(<f.Page />);
		expect((screen.getByRole('textbox', { name: t('automation.searchAll') }) as HTMLInputElement).value).toBe(
			'Alpha',
		);
		expect(screen.queryByRole('menu')).toBeNull();
		await user.click(screen.getByRole('button', { name: 'Alpha' }));
		expect(await screen.findByRole('tab', { name: t('automation.overview') })).toBeTruthy();
		f.view.dispose();
	},
);
test('hiding the page with an open picker releases the picker layer; the editor and its edits stay', async () => {
	const f = fixture(),
		user = userEvent.setup();
	const page = render(<f.Page />);
	await user.click(screen.getByRole('button', { name: 'Actions for Alpha' }));
	await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
	await waitFor(() => expect(document.querySelector('[data-automation-editor]')).not.toBeNull());
	fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Renamed' } });
	await user.click(screen.getAllByRole('combobox')[0]!);
	page.rerender(<f.Page visible={false} />);
	await waitFor(() => {
		expect(screen.queryByRole('listbox')).toBeNull();
		expect(document.body.style.pointerEvents).not.toBe('none');
		expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
	});
	page.rerender(<f.Page />);
	expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Renamed');
	// Closing with edits asks first; keeping them leaves the editor open.
	await user.click(screen.getByRole('button', { name: 'Close' }));
	await user.click(await screen.findByRole('button', { name: t('automation.keepEditing') }));
	expect(document.querySelector('[data-automation-editor]')).not.toBeNull();
	await user.click(screen.getByRole('button', { name: 'Close' }));
	await user.click(await screen.findByRole('button', { name: t('automation.discard') }));
	expect(document.querySelector('[data-automation-editor]')).toBeNull();
	f.view.dispose();
});

test('detail rows name the bound Space, hint when unset, and say unavailable when it is gone', async () => {
	const { agentView, bindSpaceLookup } = await import('./actions/agent');
	const action = { kind: 'agent' as const, agentId: 'codex', prompt: 'P', cwd: '/vault', sessionMode: 'fresh' as const };
	const spaceRow = (spaceId?: string) =>
		agentView.facts!({ ...action, ...(spaceId ? { spaceId } : {}) }).find((row) => row.label === t('automation.space'))?.value;
	bindSpaceLookup(() => [{ id: 'space-a', name: 'Alpha space' }]);
	expect(spaceRow('space-a')).toBe(t('automation.spaceTarget', { name: 'Alpha space' }));
	expect(spaceRow()).toBe(t('automation.spaceRequired'));
	expect(spaceRow('space-gone')).toBe(t('automation.spaceUnavailableOption'));
	// Agent module off: the list is unknown, so the stored id is shown rather than claiming the Space is gone.
	bindSpaceLookup(() => undefined);
	expect(spaceRow('space-a')).toBe(t('automation.spaceTarget', { name: 'space-a' }));
});
