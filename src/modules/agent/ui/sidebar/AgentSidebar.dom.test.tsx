import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setLanguage, t } from '../../../../shared/i18n';
import { pageTabFixture } from '../workspace/page-tabs.fixture';
import { AgentSidebar } from './AgentSidebar';
import type {
	ArchivePlan,
	ArchiveResult,
	StopResult,
	ManagedAttachResult,
	ManagedSessionSummary,
	ManagedSnapshot,
} from '../../core/workspace/managed-runtime';
import type { TerminalTabData } from '../../core/workspace/model';
import { openTab } from '../../core/workspace/ops';
import { createStore } from 'zustand/vanilla';
import { pickMaterial } from '../terminal/material-picker';

vi.mock('../../platform/desktop/files', () => ({ openPath: vi.fn() }));
vi.mock('../create/NewTabMenu', () => ({ NewTabMenu: () => null }));
vi.mock('../terminal/material-picker', () => ({ pickMaterial: vi.fn() }));
vi.mock('./SpaceNavigation', () => ({ SpaceNavigation: () => null }));
beforeEach(() => setLanguage('en'));
const entry = (name: string) => screen.getByRole('button', { name });
const tabs = (f: ReturnType<typeof pageTabFixture>) => f.workspace.store.getState().groups.flatMap((g) => g.tabIds);

test('board and usage open as tabs; a second click only activates the one that is open', async () => {
	const f = pageTabFixture();
	const user = userEvent.setup();
	render(f.wrap(<AgentSidebar />));
	await user.click(entry(t('agent.workspace.nav.board')));
	await user.click(entry(t('agent.workspace.nav.stats')));
	expect(tabs(f)).toEqual(['tab-page-board', 'tab-page-usage']);
	expect(f.workspace.active?.id).toBe('tab-page-usage');
	f.workspace.activate('tab-page-board');
	await user.click(entry(t('agent.workspace.nav.board')));
	await user.click(entry(t('agent.workspace.nav.board')));
	await user.click(entry(t('agent.workspace.nav.stats')));
	await user.click(entry(t('agent.workspace.nav.stats')));
	expect(tabs(f)).toEqual(['tab-page-board', 'tab-page-usage']);
	// The sidebar never switches to another page or opens a dialog on its own.
	expect(f.controller.open).not.toHaveBeenCalled();
	expect(screen.queryByRole('dialog')).toBeNull();
});
test('the entry of the page that is showing is marked, and pages are not listed as sessions', async () => {
	const f = pageTabFixture();
	render(f.wrap(<AgentSidebar />));
	expect(entry(t('agent.workspace.nav.board')).getAttribute('aria-current')).toBeNull();
	act(() => {
		f.workspace.openPage('board');
	});
	expect(entry(t('agent.workspace.nav.board')).getAttribute('aria-current')).toBe('page');
	expect(entry(t('agent.workspace.nav.stats')).getAttribute('aria-current')).toBeNull();
	act(() => {
		f.workspace.openPage('usage');
	});
	expect(entry(t('agent.workspace.nav.stats')).getAttribute('aria-current')).toBe('page');
	expect(entry(t('agent.workspace.nav.board')).getAttribute('aria-current')).toBeNull();
	expect(document.querySelector('[data-session-card]')).toBeNull();
});
test('the sidebar has no automations entry: automations are the automation board of the rail', () => {
	const f = pageTabFixture();
	render(f.wrap(<AgentSidebar />));
	expect(screen.queryByRole('button', { name: /自动化|Automation/ })).toBeNull();
	expect(document.querySelector('[data-page-entry="automations"]')).toBeNull();
});

const row = (
	id: string,
	phase: 'connected' | 'launch-pending' | 'failed' | 'cancelled' | 'restored' = 'connected',
): ManagedSessionSummary => ({
	spaceId: 'a',
	sessionId: `s-${id}`,
	kind: 'shell',
	title: id,
	createdAt: 1,
	viewState: phase === 'restored' ? 'restored' : 'background',
	runtime: phase === 'restored' ? undefined : { runtimeId: `r-${id}`, phase, activity: 'idle', inputReady: false },
});
const terminal = (id: string, ids: string[], panes = {}): TerminalTabData => ({
	id,
	kind: 'terminal',
	title: id,
	sessionIds: ids,
	focusedSessionId: ids[0]!,
	paneLayout: { kind: 'pane', session: ids[0]! },
	panes,
	state: 'idle',
	unread: false,
	createdAt: 1,
	updatedAt: 1,
});
function managedFixture(rows: ManagedSessionSummary[]) {
	const f = pageTabFixture();
	let snapshot: ManagedSnapshot = { revision: 1, sessions: rows };
	const listeners = new Set<() => void>(),
		off = vi.fn();
	const subscribeManaged = vi.fn((listener: () => void) => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
			off();
		};
	});
	const attach = vi.fn<() => Promise<ManagedAttachResult>>(async () => ({
		status: 'not-running',
		target: { spaceId: 'a', sessionId: 's' },
	}));
	Object.assign(f.controller, { spaces: { store: createStore(() => ({ records: { selectedSpaceId: 'a' } })) } });
	const openRecord = vi
		.spyOn(f.workspace, 'openManagedRecord')
		.mockResolvedValue({ status: 'opened', target: { spaceId: 'a', sessionId: 's-restored' }, tabId: 'read-only' });
	Object.assign(f.workspace, { getManagedSnapshot: () => snapshot, subscribeManaged, attachManaged: attach });
	return {
		...f,
		attach,
		openRecord,
		off,
		subscribeManaged,
		publish(rows: ManagedSessionSummary[]) {
			snapshot = { revision: snapshot.revision + 1, sessions: rows };
			listeners.forEach((listener) => listener());
		},
	};
}

test('managed rows deduplicate every current pane and restored target while an old generation cannot hide a new runtime', () => {
	const f = managedFixture([
		row('one'),
		row('two'),
		row('new'),
		row('restored', 'restored'),
		{ ...row('foreign'), spaceId: 'b' },
	]);
	f.workspace.store.setState(
		(state) =>
			openTab(
				openTab(
					state,
					undefined,
					terminal('live', ['r-one', 'r-two', 'old-new'], {
						'old-new': { spaceId: 'a', persistentSessionId: 's-new', cwd: '/vault' },
					}),
				),
				undefined,
				terminal('restored', ['old-restored'], {
					'old-restored': { spaceId: 'a', persistentSessionId: 's-restored', cwd: '/vault' },
				}),
			),
		true,
	);
	const view = render(f.wrap(<AgentSidebar />));
	expect(document.querySelectorAll('[data-managed-session]')).toHaveLength(1);
	expect(document.querySelector('[data-managed-session="s-new"]')).toBeTruthy();
	act(() => f.publish([row('new'), row('pending', 'launch-pending')]));
	expect(document.querySelectorAll('[data-managed-session]')).toHaveLength(2);
	expect(f.subscribeManaged).toHaveBeenCalledOnce();
	view.unmount();
	expect(f.off).toHaveBeenCalledOnce();
});

test('pending, cancelled, failed and restored remain discoverable and attach never falls through to launch', async () => {
	const f = managedFixture([
		row('pending', 'launch-pending'),
		row('failed', 'failed'),
		row('cancelled', 'cancelled'),
		row('restored', 'restored'),
	]);
	const restore = vi.spyOn(f.workspace, 'restore');
	const user = userEvent.setup();
	render(f.wrap(<AgentSidebar />));
	expect(screen.getByText(new RegExp(t('agent.managed.starting')))).toBeTruthy();
	expect(screen.getByText(new RegExp(t('agent.managed.failed')))).toBeTruthy();
	expect(screen.getByText(new RegExp(t('agent.managed.cancelled')))).toBeTruthy();
	expect(screen.getByText(t('agent.managed.restored'))).toBeTruthy();
	await user.click(screen.getByRole('button', { name: `${t('agent.managed.open')}: restored` }));
	await waitFor(() => expect(f.openRecord).toHaveBeenCalledWith({ spaceId: 'a', sessionId: 's-restored' }));
	expect(f.attach).not.toHaveBeenCalled();
	expect(f.openRecord).toHaveBeenCalledWith({ spaceId: 'a', sessionId: 's-restored' });
	expect(restore).not.toHaveBeenCalled();
	f.attach.mockResolvedValueOnce({
		status: 'pending',
		target: { spaceId: 'a', sessionId: 's-pending', runtimeId: 'r-pending' },
	});
	await user.click(screen.getByRole('button', { name: `${t('agent.managed.open')}: pending` }));
	await waitFor(() =>
		expect(f.attach).toHaveBeenLastCalledWith(
			{ spaceId: 'a', sessionId: 's-pending' },
			{ expectedRuntimeId: 'r-pending', focus: true },
		),
	);
	act(() => f.publish([row('pending')]));
	expect(f.attach).toHaveBeenCalledOnce();
});

test('attached session cards retain their original actions including true end and material attachment', async () => {
	const f = pageTabFixture(),
		user = userEvent.setup();
	Object.assign(f.controller.sessions, { get: () => ({ id: 'r', running: true, agentId: 'codex' }) });
	f.workspace.store.setState(
		(state) =>
			openTab(state, undefined, {
				...terminal('attached', ['r'], { r: { cwd: '/vault' } }),
				agentId: 'codex',
				state: 'working',
			}),
		true,
	);
	const end = vi.spyOn(f.workspace, 'end').mockResolvedValue();
	render(f.wrap(<AgentSidebar />));
	await user.click(screen.getByRole('button', { name: t('agent.more') }));
	for (const key of [
		'agent.rename',
		'agent.workspace.split.right',
		'agent.workspace.split.down',
		'agent.copyId',
		'agent.copyPath',
		'agent.reveal',
		'agent.attach',
		'agent.end',
		'agent.managed.closeView',
	])
		expect(screen.getByRole('menuitem', { name: t(key) })).toBeTruthy();
	await user.click(screen.getByRole('menuitem', { name: t('agent.attach') }));
	expect(pickMaterial).toHaveBeenCalledWith(f.controller, 'r');
	await user.click(screen.getByRole('button', { name: t('agent.more') }));
	await user.click(screen.getByRole('menuitem', { name: t('agent.end') }));
	expect(end).toHaveBeenCalledWith('attached', f.confirm);
});

const stopped = (runtimeId: string): StopResult => ({
	target: { spaceId: 'a', sessionId: 's-target', runtimeId },
	status: 'stopped',
	effect: 'completed',
	persisted: true,
	termination: {
		root: { state: 'exited', code: 0, signal: null },
		cleanup: { state: 'confirmed', scope: 'unix-session', remainingKnown: 0 },
		output: 'drained',
	},
});

test('stop confirmation captures an exact runtime before names change; duplicate submission is ignored', async () => {
	const f = managedFixture([row('target')]),
		user = userEvent.setup();
	let confirm!: (yes: boolean) => void;
	f.confirm.mockImplementation(
		() =>
			new Promise((resolve) => {
				confirm = resolve;
			}),
	);
	const stop = vi.spyOn(f.workspace, 'stopManaged').mockResolvedValue(stopped('r-target'));
	render(f.wrap(<AgentSidebar />));
	const button = screen.getByRole('button', { name: t('agent.managed.stop') });
	await user.click(button);
	await user.click(button);
	expect(f.confirm).toHaveBeenCalledOnce();
	expect(f.confirm.mock.calls[0]?.[0]).toContain('r-target');
	expect(f.confirm.mock.calls[0]?.[0]).toContain('s-target');
	act(() => f.publish([{ ...row('target'), title: 'Renamed after confirmation' }]));
	await act(async () => {
		confirm(true);
	});
	await waitFor(() =>
		expect(stop).toHaveBeenCalledWith(
			{ spaceId: 'a', sessionId: 's-target', runtimeId: 'r-target' },
			expect.anything(),
		),
	);
	expect(stop).toHaveBeenCalledOnce();
	expect(screen.getByText(t('agent.managed.stopConfirmed'))).toBeTruthy();
});

test('cancelled or unmounted confirmation cannot stop a replacement generation', async () => {
	const f = managedFixture([row('target')]),
		user = userEvent.setup();
	const stop = vi.spyOn(f.workspace, 'stopManaged').mockResolvedValue(stopped('r-target'));
	f.confirm.mockResolvedValueOnce(false);
	const view = render(f.wrap(<AgentSidebar />));
	await user.click(screen.getByRole('button', { name: t('agent.managed.stop') }));
	expect(stop).not.toHaveBeenCalled();
	let confirm!: (yes: boolean) => void;
	f.confirm.mockImplementation(
		() =>
			new Promise((resolve) => {
				confirm = resolve;
			}),
	);
	await user.click(screen.getByRole('button', { name: t('agent.managed.stop') }));
	act(() => f.publish([{ ...row('target'), runtime: { ...row('target').runtime!, runtimeId: 'r-new' } }]));
	await act(async () => {
		confirm(true);
	});
	expect(stop).not.toHaveBeenCalled();
	view.unmount();
});

test('session archive submits the original preview and preserves incomplete rows and localized evidence', async () => {
	const f = managedFixture([row('target')]),
		user = userEvent.setup();
	const plan: ArchivePlan = {
		scope: { kind: 'session', spaceId: 'a', sessionId: 's-target' },
		members: [{ spaceId: 'a', sessionId: 's-target', runtimeId: 'r-target' }],
		fingerprint: 'frozen',
	};
	const preview = vi.spyOn(f.workspace, 'previewArchive').mockResolvedValue(plan);
	const result: ArchiveResult = {
		scope: plan.scope,
		status: 'incomplete',
		effect: 'partial',
		rows: [
			{
				target: plan.members[0]!,
				status: 'incomplete',
				effect: 'partial',
				persisted: false,
				termination: {
					root: { state: 'exited', code: 0, signal: null },
					cleanup: {
						state: 'partial',
						scope: 'unix-session',
						remainingKnown: 1,
						reason: 'residuals-present',
					},
					output: 'truncated',
				},
			},
		],
	};
	const archive = vi.spyOn(f.workspace, 'archiveManaged').mockResolvedValue(result);
	render(f.wrap(<AgentSidebar />));
	await user.click(screen.getByRole('button', { name: t('agent.managed.archive') }));
	await waitFor(() => expect(archive).toHaveBeenCalledWith(plan, expect.anything()));
	expect(preview).toHaveBeenCalledWith(plan.scope);
	expect(f.confirm.mock.calls[0]?.[0]).toContain('r-target');
	expect(screen.getByText(t('agent.managed.archiveIncomplete'))).toBeTruthy();
	expect(screen.getByText(new RegExp(t('agent.managed.rootExited')))).toBeTruthy();
	expect(screen.getByText(new RegExp(t('agent.managed.outputTruncated')))).toBeTruthy();
	expect(document.querySelector('[data-managed-session="s-target"]')).toBeTruthy();
});

test('stop progress, root exit, unverified cleanup and read-only recheck stay distinct; a failed checkpoint is not success', async () => {
	const termination = {
		root: { state: 'exited' as const, code: 0, signal: null },
		cleanup: {
			state: 'unknown' as const,
			scope: 'unix-session' as const,
			remainingKnown: null,
			reason: 'transport-lost' as const,
		},
		output: 'unknown' as const,
	};
	const target: ManagedSessionSummary = {
		...row('target'),
		runtime: {
			...row('target').runtime!,
			stop: { phase: 'stop-requested', requestedAt: 1, requestId: 'stop', force: false },
			termination,
		},
	};
	const f = managedFixture([target]),
		user = userEvent.setup();
	const stop = vi.spyOn(f.workspace, 'stopManaged').mockResolvedValue(stopped('r-target'));
	const wait = vi.spyOn(f.workspace, 'waitManagedStop').mockResolvedValue({
		...stopped('r-target'),
		status: 'pending',
		effect: 'unknown',
		persisted: false,
		termination,
		error: {
			code: 'WAIT_TIMEOUT',
			reason: 'wait-timeout',
			messageKey: 'agent.managed.waitTimeout',
			nextAction: 'inspect-runtime',
			details: {},
		},
	});
	render(f.wrap(<AgentSidebar />));
	expect(screen.getByText(t('agent.managed.stopRequested'))).toBeTruthy();
	expect(screen.queryByText(t('agent.managed.stopConfirmed'))).toBeNull();
	expect(screen.getByText(new RegExp(t('agent.managed.rootExited')))).toBeTruthy();
	await user.click(screen.getByRole('button', { name: t('agent.managed.checkStop') }));
	expect(await screen.findByText(t('agent.managed.waitTimeout'))).toBeTruthy();
	expect(stop).not.toHaveBeenCalled();
	expect(wait).toHaveBeenCalledOnce();
	stop.mockResolvedValue({
		...stopped('r-target'),
		status: 'failed',
		effect: 'partial',
		persisted: false,
		error: {
			code: 'PERSISTENCE_FAILED',
			reason: 'save-failed',
			messageKey: 'agent.spaces.error.save',
			nextAction: 'retry-explicitly',
			details: {},
		},
	});
	await user.click(screen.getByRole('button', { name: t('agent.managed.forceStop') }));
	await waitFor(() =>
		expect(stop).toHaveBeenCalledWith(
			{ spaceId: 'a', sessionId: 's-target', runtimeId: 'r-target' },
			expect.objectContaining({ force: true }),
		),
	);
	expect(screen.queryByText(t('agent.managed.stopConfirmed'))).toBeNull();
	expect(screen.getAllByText(t('agent.spaces.error.save')).length).toBeGreaterThan(0);
});

test('attached current runtime exposes exact stop/archive and retains view-only close and prior actions', async () => {
	const f = managedFixture([row('target')]),
		user = userEvent.setup();
	Object.assign(f.controller.sessions, { get: () => ({ id: 'r-target', running: true, agentId: 'codex' }) });
	f.workspace.store.setState(
		(state) =>
			openTab(state, undefined, {
				...terminal('attached', ['r-target'], {
					'r-target': { spaceId: 'a', persistentSessionId: 's-target', cwd: '/vault' },
				}),
				agentId: 'codex',
				state: 'working',
			}),
		true,
	);
	const stop = vi.spyOn(f.workspace, 'stopManaged').mockResolvedValue(stopped('r-target'));
	const close = vi.spyOn(f.workspace, 'close');
	render(f.wrap(<AgentSidebar />));
	await user.click(screen.getByRole('button', { name: t('agent.more') }));
	for (const key of [
		'agent.rename',
		'agent.attach',
		'agent.end',
		'agent.managed.stop',
		'agent.managed.archive',
		'agent.managed.checkStop',
		'agent.managed.closeView',
	])
		expect(screen.getByRole('menuitem', { name: t(key) })).toBeTruthy();
	await user.click(screen.getByRole('menuitem', { name: t('agent.managed.stop') }));
	await waitFor(() => expect(stop).toHaveBeenCalledOnce());
	await user.click(screen.getByRole('button', { name: t('agent.more') }));
	await user.click(screen.getByRole('menuitem', { name: t('agent.managed.closeView') }));
	expect(close).toHaveBeenCalledWith('attached', f.confirm);
	expect(stop).toHaveBeenCalledOnce();
});

test('the original stop trigger stays focusable while confirmation is pending, with a synchronous duplicate guard', async () => {
	const f = managedFixture([row('target')]),
		user = userEvent.setup();
	let finish!: (yes: boolean) => void;
	f.confirm.mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const stop = vi.spyOn(f.workspace, 'stopManaged').mockResolvedValue(stopped('r-target'));
	render(f.wrap(<AgentSidebar />));
	const button = screen.getByRole('button', { name: t('agent.managed.stop') }) as HTMLButtonElement;
	button.focus();
	await user.click(button);
	expect(button.disabled).toBe(false);
	await user.click(button);
	expect(f.confirm).toHaveBeenCalledOnce();
	await act(async () => {
		finish(false);
	});
	expect(stop).not.toHaveBeenCalled();
});

function blockedActivity(runtimeId: string): import('../../core/workspace/managed-runtime').RuntimeActivitySnapshot {
	const fact = {
		state: 'permission' as const,
		observedAt: 100,
		event: 'PermissionRequest',
		blocking: { state: 'blocked' as const, reason: 'permission' as const },
	};
	return {
		at: { runtimeId, activitySequence: 4 },
		revision: 5,
		state: 'unknown',
		observedAt: 100,
		source: {
			health: 'unknown',
			reason: 'source-mismatch',
			capabilities: { activity: 'unknown', blocking: 'unknown', foreground: 'unknown' },
		},
		sources: [
			{
				bindingId: 'one',
				programEpoch: 'epoch',
				meta: {
					provider: 'claude-code',
					kind: 'native-hook',
					adapterRevision: 'test-1',
					lifetime: { kind: 'unproven' },
				},
				health: 'unknown',
				reason: 'legacy-unattributed',
				capabilities: { activity: 'unknown', blocking: 'unknown', foreground: 'unknown' },
				lastFact: fact,
			},
		],
		blocking: { state: 'unknown' },
		promptEvidence: { foreground: 'unknown', inputReady: false },
		seenThrough: 0,
		unreadCompletion: false,
	};
}

test('all-Vault attention retains an attached foreign-space historical block and keyboard opens its exact runtime without marking seen', async () => {
	const target = {
		...row('blocked'),
		spaceId: 'b',
		runtime: { ...row('blocked').runtime!, activityDetail: blockedActivity('r-blocked') },
	};
	const f = managedFixture([target]);
	f.workspace.store.setState(
		(state) =>
			openTab(
				state,
				undefined,
				terminal('split', ['r-first', 'r-blocked'], {
					'r-blocked': { spaceId: 'b', persistentSessionId: 's-blocked', cwd: '/foreign' },
				}),
			),
		true,
	);
	const seen = vi.spyOn(f.workspace, 'markManagedSeen');
	const user = userEvent.setup();
	render(f.wrap(<AgentSidebar />));
	expect(screen.getByRole('heading', { name: t('agent.activityEvidence.pending') })).toBeTruthy();
	expect(screen.getByText(t('agent.activityEvidence.historicalBlocked'))).toBeTruthy();
	expect(screen.getByText(t('agent.activityEvidence.foregroundUnknown'))).toBeTruthy();
	const button = screen.getByRole('button', { name: `${t('agent.activityEvidence.viewTerminal')}: blocked` });
	button.focus();
	await user.keyboard('{Enter}');
	expect(f.attach).toHaveBeenCalledWith(
		{ spaceId: 'b', sessionId: 's-blocked' },
		{ expectedRuntimeId: 'r-blocked', focus: true },
	);
	expect(seen).not.toHaveBeenCalled();
	expect(screen.queryByRole('button', { name: /Approve|Allow|批准|允许/ })).toBeNull();
});

test('attention entries support arrow and Home/End navigation without attaching until activation', async () => {
	const rows = ['first', 'second'].map((id) => ({
		...row(id),
		runtime: { ...row(id).runtime!, activityDetail: blockedActivity(`r-${id}`) },
	}));
	const f = managedFixture(rows),
		user = userEvent.setup();
	render(f.wrap(<AgentSidebar />));
	const first = screen.getByRole('button', { name: `${t('agent.activityEvidence.viewTerminal')}: first` });
	const second = screen.getByRole('button', { name: `${t('agent.activityEvidence.viewTerminal')}: second` });
	first.focus();
	await user.keyboard('{End}');
	expect(document.activeElement).toBe(second);
	await user.keyboard('{Home}');
	expect(document.activeElement).toBe(first);
	await user.keyboard('{ArrowDown}');
	expect(document.activeElement).toBe(second);
	expect(f.attach).not.toHaveBeenCalled();
	await user.keyboard(' ');
	expect(f.attach).toHaveBeenCalledOnce();
});
