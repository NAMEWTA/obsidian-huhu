import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { t } from '../../../shared/i18n';
import { HandoffAgentButton } from './HandoffAgentButton';
import { workspaceFixture } from './testing/workspace';

function fixture() {
	const f = workspaceFixture(), state = f.api.getState(), space = state.spaces[0]!;
	const lease = { spaceId: space.id, runtimeId: space.runtimeId!, controllerId: 'run-A', leaseId: 'lease-A', epoch: 2, mode: 'agent' as const, expiresAt: Date.now() + 60000 };
	f.set({ ...state, spaces: [{ ...space, control: { mode: 'agent', epoch: 2, lease } }] });
	const view = render(<TestProviders><HandoffAgentButton api={f.api} spaceId="space" pageId="page" /></TestProviders>);
	return { ...f, ...view };
}
function fill() {
	fireEvent.change(screen.getByLabelText(t('browser.v2.handoff.agentId')), { target: { value: 'agent-B' } });
	fireEvent.change(screen.getByLabelText(t('browser.v2.handoff.externalRunId')), { target: { value: 'task-B' } });
}
it('requires explicit confirmation and preserves the original expected writer while the dialog is open', async () => {
	const f = fixture();
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.handoff') }));
	expect(f.api.handoffAgent).not.toHaveBeenCalled(); fill();
	const state = f.api.getState(), space = state.spaces[0]!;
	f.set({ ...state, spaces: [{ ...space, control: { ...space.control, epoch: 3, lease: { ...space.control.lease!, controllerId: 'run-C', epoch: 3 } } }] });
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.handoffConfirm') }));
	await waitFor(() => expect(f.api.handoffAgent).toHaveBeenCalledWith({ spaceId: 'space', pageId: 'page', runtimeId: 'runtime', fromRunId: 'run-A', expectedEpoch: 2, target: { consumerId: 'cli', agentId: 'agent-B', externalRunId: 'task-B', attemptId: '1' } }));
	expect(f.api.createSpace).not.toHaveBeenCalled(); expect(f.api.openPage).not.toHaveBeenCalled();
});
it('does not submit or change control when the user cancels', () => {
	const f = fixture(); fireEvent.click(screen.getByRole('button', { name: t('browser.v2.handoff') })); fill();
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.cancel') }));
	expect(f.api.handoffAgent).not.toHaveBeenCalled(); expect(f.api.pause).not.toHaveBeenCalled(); expect(screen.queryByRole('dialog')).toBeNull();
});
it('prevents duplicate confirmation while native handoff is pending and reports a failed boundary', async () => {
	const f = fixture(); let reject!: (reason: Error) => void;
	vi.mocked(f.api.handoffAgent).mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.handoff') })); fill();
	const button = screen.getByRole('button', { name: t('browser.v2.handoffConfirm') }); fireEvent.click(button); fireEvent.click(button);
	expect(f.api.handoffAgent).toHaveBeenCalledOnce(); expect((button as HTMLButtonElement).disabled).toBe(true);
	await act(async () => reject(new Error('control_unconfirmed')));
	expect(screen.getByRole('alert').textContent).toContain(t('browser.v2.failure.control_unconfirmed'));
	expect(screen.getByRole('dialog')).toBeDefined(); expect(f.api.resumeAgent).not.toHaveBeenCalled();
});
it('does not offer authorization for a personal Space or silently submit during composition', () => {
	const f = fixture(); const state = f.api.getState();
	f.set({ ...state, spaces: [{ ...state.spaces[0]!, kind: 'personal' }] });
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.handoff') })); expect(screen.queryByRole('dialog')).toBeNull();
	f.set(state); fireEvent.click(screen.getByRole('button', { name: t('browser.v2.handoff') })); fill();
	const input = screen.getByLabelText(t('browser.v2.handoff.agentId'));
	expect(fireEvent.keyDown(input, { key: 'Enter', isComposing: true })).toBe(false); expect(f.api.handoffAgent).not.toHaveBeenCalled();
});
