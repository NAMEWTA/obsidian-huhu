import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import type { Approval, BotClient } from '../../api';
import { messages as taskMessages } from '../../i18n';
import { ApprovalsPage, InlineApproval, type BotApprovalHost } from './ApprovalsPage';
import { WorkbenchClient } from '../../services/workbench/workbench-client';
const approval: Approval = {
	id: 'approval-a',
	revision: '7',
	runId: 'run-a',
	effectId: 'effect-a',
	expiresAt: '2026-10-27T01:00:00Z',
	status: 'pending',
	preview: {
		target: { workspaceId: 'ws', resourceId: 'note.md', operation: 'update', baseRevision: '4' },
		tool: {
			name: 'note.write',
			capability: 'write',
			capabilityVersion: '1',
			implementationVersion: '1',
			policyVersion: '1',
		},
		parametersHash: 'sha256:p',
		previewHash: 'sha256:preview',
		diff: '+new',
		content: 'new',
		sourceRefs: [],
	},
};
beforeEach(() => {
	registerMessages(taskMessages);
	setLanguage('en');
});
test('approval action binds the exact effect revision and preview hash', async () => {
	const resolve = vi.fn(async () => ({ ...approval, status: 'approved' as const, revision: '8' }));
	const client = {
		onClose: () => () => {},
		hello: { profile: { profileId: 'profile-a', commandEpoch: '1' } },
		approvals: { list: vi.fn(async () => ({ items: [approval] })), resolve },
	} as unknown as BotClient;
	const host: BotApprovalHost = { client: () => client };
	render(
		<TestProviders>
			<ApprovalsPage host={host} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByText('+new')).toBeTruthy());
	screen.getByRole('button', { name: 'Approve' }).click();
	await waitFor(() => expect(resolve).toHaveBeenCalledOnce());
	expect(resolve).toHaveBeenCalledWith(
		expect.objectContaining({
			id: 'approval-a',
			effectId: 'effect-a',
			expectedRevision: '7',
			decision: 'approve',
			previewHash: 'sha256:preview',
		}),
	);
	await waitFor(() => expect(screen.getAllByText('Approved').length).toBeGreaterThan(0));
});

test('a failed first approval read remains an error with an explicit retry instead of an empty success', async () => {
	const list = vi.fn(async () => {
		throw new Error('offline');
	});
	const client = {
		hello: { profile: { profileId: 'p', commandEpoch: '1' } },
		onClose: () => () => {},
		approvals: { list },
	} as unknown as BotClient;
	render(
		<TestProviders>
			<ApprovalsPage host={{ client: () => client }} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Could not load'));
	expect(screen.queryByText('No approvals are pending.')).toBeNull();
	screen.getByRole('button', { name: 'Retry' }).click();
	await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
});

test('permission invalidation removes cached approval body and a late refresh cannot restore it', async () => {
	let finish!: (page: { items: Approval[] }) => void;
	const list = vi.fn(async () => ({ items: [approval] }));
	const client = {
		hello: { profile: { profileId: 'p', commandEpoch: '1' } },
		onClose: () => () => {},
		approvals: { list },
	} as unknown as BotClient;
	const workspace = new WorkbenchClient({ client: () => client }, { after: () => () => {} });
	render(
		<TestProviders>
			<ApprovalsPage host={{ client: () => client, workspace }} />
		</TestProviders>,
	);
	await screen.findByText('+new');
	list.mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	screen.getByRole('button', { name: 'Refresh' }).click();
	await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
	act(() => workspace.permissionsChanged());
	expect(screen.queryByText('+new')).toBeNull();
	await act(async () => {
		finish({ items: [approval] });
		await Promise.resolve();
	});
	expect(screen.queryByText('+new')).toBeNull();
	expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
	workspace.dispose();
});

test('inline approval identity changes hide the old actionable preview before the new read resolves; close rejects late replies', async () => {
	let finish!: (approval: Approval) => void,
		close = () => {};
	const get = vi.fn(async () => approval);
	const client = {
		hello: { profile: { profileId: 'p', commandEpoch: '1' } },
		onClose: (callback: () => void) => {
			close = callback;
			return () => {};
		},
		approvals: { get },
	} as unknown as BotClient;
	const view = render(
		<TestProviders>
			<InlineApproval client={client} approvalId="approval-a" />
		</TestProviders>,
	);
	await screen.findByText('+new');
	get.mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	view.rerender(
		<TestProviders>
			<InlineApproval client={client} approvalId="approval-b" />
		</TestProviders>,
	);
	expect(screen.queryByText('+new')).toBeNull();
	expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
	act(() => close());
	await act(async () => {
		finish({ ...approval, id: 'approval-b' });
		await Promise.resolve();
	});
	expect(screen.queryByText('+new')).toBeNull();
});
