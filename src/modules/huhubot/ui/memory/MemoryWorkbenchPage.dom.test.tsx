import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import type { Agent, BotClient, MemoryGet, MemoryItem, MemoryNamespace, MemoryQuery } from '../../api';
import { messages as memoryMessages } from '../../i18n';
import { MemoryWorkbenchPage, type MemoryWorkbenchHost } from './MemoryWorkbenchPage';
import { WorkbenchClient } from '../../services/workbench/workbench-client';
import { MethodValidation } from '../../core/protocol/method-validation';

const namespace: MemoryNamespace = { kind: 'agent', id: 'agent-a' };
const item: Extract<MemoryItem, { state: 'active' }> = {
	id: 'memory-a',
	revision: '2',
	namespace,
	scope: { kind: 'profile' },
	pinned: false,
	state: 'active',
	revisionId: 'rev-2',
	body: {
		text: 'Use the concise format.',
		hash: 'sha256:memory',
		provenance: 'user',
		creatorKind: 'user',
		sourceRefs: [],
		sourceScopes: [],
		derived: [],
	},
};
function fixture() {
	const client = {
		hello: {
			protocolVersion: '0.1',
			buildVersion: 'test',
			schemaVersion: 1,
			profile: { profileId: 'profile-a', commandEpoch: '1', revision: '2', createdAt: '2026-10-27T00:00:00Z' },
			capabilities: [],
			limits: { maxFrameBytes: 1000, maxBatchItems: 100 },
		},
		state: 'ready',
		onClose: () => () => {},
		memory: {
			list: vi.fn(async () => ({
				namespaceRevision: '2',
				settings: { namespace, revision: '2', enabled: false, eligible: true },
				items: [{ kind: 'item', item }],
			})),
			pin: vi.fn(async () => item),
			forget: vi.fn(async () => ({ ...item, state: 'forgotten' })),
			correct: vi.fn(async () => item),
			setAutoMaintenance: vi.fn(async () => ({ namespace, revision: '3', enabled: true, eligible: true })),
			proposeGlobal: vi.fn(async () => ({
				id: 'proposal-a',
				revision: '3',
				operation: 'create',
				scope: { kind: 'profile' },
				previewHash: 'sha256:proposal',
				expiresAt: '2026-10-28T00:00:00Z',
				state: 'pending',
				body: item.body,
			})),
			resolveGlobal: vi.fn(async () => ({ commandId: 'c', receiptId: 'r', revision: '4' })),
		},
	} as unknown as BotClient;
	return {
		client,
		host: { client: () => client, namespace: () => namespace, report: vi.fn() } satisfies MemoryWorkbenchHost,
	};
}
beforeEach(() => {
	registerMessages(memoryMessages);
	setLanguage('en');
});

test('renders scoped memory with provenance and pin action', async () => {
	const f = fixture();
	render(
		<TestProviders>
			<MemoryWorkbenchPage host={f.host} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByText('Use the concise format.')).toBeTruthy());
	expect(screen.getByText('Provenance: user')).toBeTruthy();
	await fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
	await waitFor(() =>
		expect(f.client.memory.pin).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'memory-a', expectedRevision: '2', namespace }),
		),
	);
});

test('keeps a correction draft until the command succeeds', async () => {
	const f = fixture();
	render(
		<TestProviders>
			<MemoryWorkbenchPage host={f.host} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByText('Use the concise format.')).toBeTruthy());
	await fireEvent.click(screen.getByRole('button', { name: 'Correct' }));
	const field = screen.getByRole('textbox', { name: 'Correct' });
	fireEvent.change(field, { target: { value: 'Use short paragraphs.' } });
	await fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));
	await waitFor(() =>
		expect(f.client.memory.correct).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'memory-a', text: 'Use short paragraphs.' }),
		),
	);
});

test('shows global proposal as pending until explicitly resolved', async () => {
	const f = fixture();
	render(
		<TestProviders>
			<MemoryWorkbenchPage host={{ ...f.host, namespace: () => ({ kind: 'global', id: 'global' }) }} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByText('Use the concise format.')).toBeTruthy());
	const field = screen.getByRole('textbox', { name: 'Describe the global memory to propose…' });
	fireEvent.change(field, { target: { value: 'Keep answers concise.' } });
	await fireEvent.click(screen.getByRole('button', { name: 'Propose global memory' }));
	await waitFor(() => expect(screen.getByText('Pending confirmation')).toBeTruthy());
	expect(screen.getByText(/This proposal is not active until you confirm it/)).toBeTruthy();
	await fireEvent.click(screen.getByRole('button', { name: 'Confirm proposal' }));
	await waitFor(() =>
		expect(f.client.memory.resolveGlobal).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'proposal-a', decision: 'approve' }),
		),
	);
});

test('a model-created pending global proposal can be recovered from durable queries and confirmed after reopening', async () => {
	const f = fixture();
	const proposal = {
		id: 'model-proposal',
		revision: '4',
		operation: 'create' as const,
		scope: { kind: 'profile' as const },
		previewHash: 'sha256:proposal',
		expiresAt: '2026-10-29T00:00:00Z',
		state: 'pending' as const,
		body: { ...item.body, text: 'Model proposed fact' },
	};
	(f.client.memory.list as ReturnType<typeof vi.fn>).mockImplementation(async (query: { kind: string }) => ({
		namespaceRevision: '2',
		items: query.kind === 'proposal' ? [{ kind: 'proposal', proposal }] : [],
	}));
	render(
		<TestProviders>
			<MemoryWorkbenchPage host={{ ...f.host, namespace: () => ({ kind: 'global', id: 'profile-a' }) }} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByText('Model proposed fact')).toBeTruthy());
	fireEvent.click(screen.getByRole('button', { name: 'Confirm proposal' }));
	await waitFor(() =>
		expect(f.client.memory.resolveGlobal).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'model-proposal',
				expectedRevision: '4',
				previewHash: 'sha256:proposal',
				decision: 'approve',
			}),
		),
	);
});

test('a pending correction candidate applies to its exact target and both observed revisions', async () => {
	const f = fixture();
	(f.client.memory.list as ReturnType<typeof vi.fn>).mockImplementation(async (query: { kind: string }) => ({
		namespaceRevision: '8',
		items:
			query.kind === 'candidate'
				? [
						{
							kind: 'candidate',
							candidate: {
								id: 'candidate-a',
								revision: '4',
								namespace,
								scope: { kind: 'profile' },
								jobId: 'job-a',
								operation: 'correct',
								targetItemId: item.id,
								targetRevision: item.revision,
								state: 'pending',
								body: { ...item.body, text: 'Use verified short paragraphs.' },
							},
						},
					]
				: query.kind === 'item'
					? [{ kind: 'item', item }]
					: [],
	}));
	render(
		<TestProviders>
			<MemoryWorkbenchPage host={f.host} />
		</TestProviders>,
	);
	await screen.findByText('Use verified short paragraphs.');
	fireEvent.click(screen.getByRole('button', { name: 'Apply candidate' }));
	await waitFor(() =>
		expect(f.client.memory.correct).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'apply_candidate',
				id: item.id,
				expectedRevision: '2',
				candidateId: 'candidate-a',
				candidateRevision: '4',
				namespace,
			}),
		),
	);
});

test('revoking access clears local global proposals and late mutation replies cannot resurrect them', async () => {
	const f = fixture();
	const workspace = new WorkbenchClient({ client: () => f.client }, { after: () => () => {} });
	let finish!: (proposal: Awaited<ReturnType<BotClient['memory']['proposeGlobal']>>) => void;
	(f.client.memory.proposeGlobal as ReturnType<typeof vi.fn>).mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	render(
		<TestProviders>
			<MemoryWorkbenchPage
				host={{ ...f.host, workspace, namespace: () => ({ kind: 'global', id: 'profile-a' }) }}
			/>
		</TestProviders>,
	);
	const input = await screen.findByRole('textbox', { name: 'Describe the global memory to propose…' });
	fireEvent.change(input, { target: { value: 'Private pending fact' } });
	fireEvent.click(screen.getByRole('button', { name: 'Propose global memory' }));
	await waitFor(() => expect(f.client.memory.proposeGlobal).toHaveBeenCalledOnce());
	act(() => workspace.permissionsChanged());
	await act(async () => {
		finish({
			id: 'late',
			revision: '1',
			operation: 'create',
			scope: { kind: 'profile' },
			previewHash: 'hash',
			expiresAt: '2026-10-29T00:00:00Z',
			state: 'pending',
			body: { ...item.body, text: 'Private pending fact' },
		});
		await Promise.resolve();
	});
	expect(screen.queryByText('Private pending fact')).toBeNull();
	expect(screen.queryByRole('button', { name: 'Confirm proposal' })).toBeNull();
	workspace.dispose();
});

test('connection close removes an already displayed local proposal body', async () => {
	const f = fixture();
	let close = () => {};
	Object.assign(f.client, {
		onClose: (callback: () => void) => {
			close = callback;
			return () => {};
		},
	});
	(f.client.memory.proposeGlobal as ReturnType<typeof vi.fn>).mockResolvedValue({
		id: 'local',
		revision: '1',
		operation: 'create',
		scope: { kind: 'profile' },
		previewHash: 'hash',
		expiresAt: '2026-10-29T00:00:00Z',
		state: 'pending',
		body: { ...item.body, text: 'Sensitive local proposal' },
	});
	render(
		<TestProviders>
			<MemoryWorkbenchPage host={{ ...f.host, namespace: () => ({ kind: 'global', id: 'profile-a' }) }} />
		</TestProviders>,
	);
	fireEvent.change(await screen.findByRole('textbox', { name: 'Describe the global memory to propose…' }), {
		target: { value: 'Propose fact' },
	});
	fireEvent.click(screen.getByRole('button', { name: 'Propose global memory' }));
	await screen.findByText('Sensitive local proposal');
	act(() => close());
	expect(screen.queryByText('Sensitive local proposal')).toBeNull();
});

test('a long execution context follows the per-Run parts cursor without replacing its first fragment', async () => {
	const f = fixture();
	const validation = new MethodValidation();
	const context = {
		runId: 'context-run',
		runRevision: '3',
		namespace,
		scope: { kind: 'session', id: 's' },
		state: 'sealed',
		manifestRevision: '1',
		nextCursor: 'parts-2',
		entries: [
			{
				id: 'intent',
				partIndex: 0,
				partCount: 2,
				kind: 'intent',
				representation: 'full',
				revision: '1',
				scope: { kind: 'session', id: 's' },
				state: 'readable',
				text: 'First fragment',
				creatorKind: 'user',
				preparationKind: 'explicit',
			},
		],
	};
	(f.client.memory.list as ReturnType<typeof vi.fn>).mockImplementation(async (query: { kind: string }) => {
		expect(validation.validate('memory.list', 'params', query)).toBe(true);
		return {
			namespaceRevision: '2',
			items:
				query.kind === 'context'
					? [{ kind: 'context', context: { ...context, entries: [], nextCursor: undefined } }]
					: [],
		};
	});
	const get = vi.fn(async (query: { cursor?: string }) => ({
		kind: 'context',
		context: query.cursor
			? {
					...context,
					nextCursor: undefined,
					entries: [{ ...context.entries[0], partIndex: 1, text: 'Last fragment' }],
				}
			: context,
	}));
	Object.assign(f.client.memory, { get });
	const workspace = new WorkbenchClient({ client: () => f.client }, { after: () => () => {} });
	workspace.store.setState({
		loaded: true,
		sessions: [
			{
				id: 's',
				revision: '1',
				kind: 'direct',
				title: 'My conversation',
				memberIds: ['agent-a'],
				archived: false,
			},
		],
	});
	const view = render(
		<TestProviders>
			<MemoryWorkbenchPage host={{ ...f.host, workspace }} />
		</TestProviders>,
	);
	await screen.findByLabelText('Execution context scope');
	expect(get).not.toHaveBeenCalled();
	expect(
		(f.client.memory.list as ReturnType<typeof vi.fn>).mock.calls.every(([query]) => query.kind !== 'context'),
	).toBe(true);
	fireEvent.change(screen.getByLabelText('Execution context scope'), { target: { value: 'session:s' } });
	fireEvent.click(await screen.findByRole('button', { name: 'Inspect execution context' }));
	await screen.findByText('First fragment');
	fireEvent.click(screen.getByRole('button', { name: 'Load more context' }));
	await screen.findByText('Last fragment');
	expect(screen.getByText('First fragment')).toBeTruthy();
	expect(get).toHaveBeenCalledWith(
		expect.objectContaining({ kind: 'context', id: 'context-run', cursor: 'parts-2', namespace, limit: 50 }),
		expect.objectContaining({ signal: expect.any(AbortSignal) }),
	);
	view.unmount();
	workspace.dispose();
});

test('a temporary task uses its actual Run get instead of an unauthorized visible-session scope', async () => {
	const f = fixture(),
		validation = new MethodValidation();
	const temporary: MemoryNamespace = { kind: 'temporary', id: 'temporary:child' };
	const list = vi.fn(async (query: MemoryQuery) => {
		expect(validation.validate('memory.list', 'params', query)).toBe(true);
		expect(query.kind).not.toBe('context');
		return { namespaceRevision: '2', items: [] };
	});
	const get = vi.fn(async (query: MemoryGet) => {
		expect(validation.validate('memory.get', 'params', query)).toBe(true);
		return {
			kind: 'context',
			context: {
				runId: 'temporary-run',
				runRevision: '3',
				namespace: temporary,
				scope: { kind: 'work_thread', id: 'original-thread' },
				state: 'sealed',
				manifestRevision: '1',
				entries: [
					{
						id: 'intent',
						revision: '1',
						scope: { kind: 'work_thread', id: 'original-thread' },
						state: 'readable',
						kind: 'intent',
						representation: 'full',
						text: 'Temporary execution input',
						creatorKind: 'user',
						preparationKind: 'explicit',
					},
				],
			},
		};
	});
	Object.assign(f.client.memory, { list, get });
	const workspace = new WorkbenchClient({ client: () => f.client }, { after: () => () => {} });
	workspace.store.setState({
		loaded: true,
		sessions: [
			{
				id: 'visible-session',
				revision: '1',
				kind: 'direct',
				title: 'Forbidden temporary session scope',
				memberIds: [temporary.id],
				archived: false,
			},
		],
	});
	workspace.acceptDelegations([
		{
			id: 'child',
			revision: '1',
			parentRunId: 'parent',
			rootRunId: 'parent',
			childRunId: 'temporary-run',
			requesterAgentId: 'sponsor',
			executorAgentId: temporary.id,
			workThreadId: 'original-thread',
			status: 'succeeded',
		},
	]);
	const view = render(
		<TestProviders>
			<MemoryWorkbenchPage host={{ ...f.host, workspace, namespace: () => temporary }} />
		</TestProviders>,
	);
	const select = await screen.findByLabelText('Execution context scope');
	expect(screen.queryByRole('option', { name: 'Forbidden temporary session scope' })).toBeNull();
	expect(get).not.toHaveBeenCalled();
	fireEvent.change(select, { target: { value: 'run:temporary-run' } });
	await screen.findByText('Temporary execution input');
	expect(get).toHaveBeenCalledWith(
		expect.objectContaining({ namespace: temporary, kind: 'context', id: 'temporary-run', limit: 50 }),
		expect.anything(),
	);
	act(() => workspace.permissionsChanged());
	await waitFor(() => expect(screen.queryByText('Temporary execution input')).toBeNull());
	view.unmount();
	workspace.dispose();
});

test('memory scope names distinguish duplicate Bots and temporary tasks while preserving exact namespace IDs', async () => {
	const f = fixture();
	(f.client.memory.list as ReturnType<typeof vi.fn>).mockResolvedValue({ namespaceRevision: '2', items: [] });
	const base: Agent = {
		id: 'agent:one12345678',
		name: 'Reviewer',
		description: '',
		persona: '',
		enabled: true,
		isDefault: false,
		revision: '1',
		personaRevision: '1',
		modelBindingRevision: '1',
	};
	const workspace = new WorkbenchClient({ client: () => f.client }, { after: () => () => {} });
	workspace.store.setState({ loaded: true, agents: [base, { ...base, id: 'agent:two12345678' }] });
	workspace.acceptDelegations(
		[1, 2].map((index) => ({
			id: `task:${index}`,
			revision: '1',
			parentRunId: 'parent',
			rootRunId: 'parent',
			childRunId: `child:${index}`,
			requesterAgentId: 'sponsor',
			executorAgentId: `temporary:${index}`,
			workThreadId: `thread:${index}`,
			status: 'succeeded' as const,
		})),
	);
	const view = render(
		<TestProviders>
			<MemoryWorkbenchPage
				host={{ ...f.host, workspace, namespace: () => ({ kind: 'global', id: 'profile-a' }) }}
			/>
		</TestProviders>,
	);
	const select = await screen.findByLabelText('Memory scope');
	const duplicates = screen.getAllByRole('option', { name: /^Bot memory · Reviewer · / });
	expect(duplicates).toHaveLength(2);
	expect(new Set(duplicates.map((option) => option.textContent)).size).toBe(2);
	expect(screen.getByRole('option', { name: 'Temporary context · child:1' })).toBeTruthy();
	expect(screen.getByRole('option', { name: 'Temporary context · child:2' })).toBeTruthy();
	fireEvent.change(select, { target: { value: `agent:${base.id}` } });
	await waitFor(() =>
		expect(f.client.memory.list).toHaveBeenCalledWith(
			expect.objectContaining({ namespace: { kind: 'agent', id: base.id } }),
			expect.anything(),
		),
	);
	view.unmount();
	workspace.dispose();
});
