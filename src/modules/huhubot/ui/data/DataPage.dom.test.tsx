import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import type { BotClient } from '../../api';
import { messages as dataMessages } from '../../i18n';
import { DataPage, type BotDataHost } from './DataPage';

function fixture() {
	const client = {
		state: 'ready',
		onClose: () => () => {},
		hello: {
			protocolVersion: '0.1',
			buildVersion: 'test',
			schemaVersion: 1,
			profile: { profileId: 'profile-a', commandEpoch: '1', revision: '4', createdAt: '2026-10-27T00:00:00Z' },
			capabilities: [],
			limits: { maxFrameBytes: 1000, maxBatchItems: 100 },
		},
		service: { status: vi.fn(async () => ({ state: 'ready' })) },
		agents: {
			list: vi.fn(async () => ({
				items: [
					{
						id: 'agent-a',
						name: 'Aster',
						description: '',
						persona: '',
						enabled: true,
						revision: '1',
						personaRevision: '1',
						modelBindingRevision: '1',
						isDefault: false,
					},
				],
			})),
		},
		sessions: { list: vi.fn(async () => ({ items: [] })) },
		memory: { list: vi.fn(async () => ({ namespaceRevision: '1', items: [] })) },
		profile: {
			deletePreview: vi.fn(async () => ({
				token: 'purge-token',
				revision: '4',
				expiresAt: '2026-10-27T01:00:00Z',
				categories: [
					{ kind: 'profile', count: 1, retained: false },
					{ kind: 'unknown-effects', count: 1, retained: false, reason: 'RECONCILIATION_REQUIRED' },
				],
			})),
			delete: vi.fn(async () => ({ commandId: 'c', receiptId: 'receipt-delete', revision: '5' })),
		},
		portable: {
			export: vi.fn(async () => ({
				artifact: { artifactId: 'artifact-a', mediaType: 'application/json', size: '100' },
			})),
			importPreview: vi.fn(async () => ({
				token: 'import-token',
				mappingMode: 'copy-candidate',
				mappings: [{ kind: 'agent', from: 'agent-a', to: 'agent-copy' }],
				conflicts: [
					{
						id: 'agent-a',
						revision: '2',
						hash: 'sha256:x',
						kind: 'agent',
						existingId: 'existing-agent-a',
						reason: 'name',
						needsReview: true,
					},
				],
			})),
			import: vi.fn(async () => ({ commandId: 'c', receiptId: 'receipt-import', revision: '5' })),
		},
	} as unknown as BotClient;
	return {
		client,
		host: {
			client: () => client,
			report: vi.fn(),
			exportArtifact: vi.fn(async () => true),
			importArtifact: vi.fn(async () => ({
				artifactId: 'artifact-a',
				mediaType: 'application/json',
				size: '100',
			})),
		} satisfies BotDataHost,
	};
}

beforeEach(() => {
	registerMessages(dataMessages);
	setLanguage('en');
});

test('renders exact deletion preview and blocks unknown effects', async () => {
	const { client, host } = fixture();
	render(
		<TestProviders>
			<DataPage host={host} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByText('purge-token')).toBeTruthy());
	const deleteButton = screen.getByRole('button', { name: 'Delete Profile' }) as HTMLButtonElement;
	expect(deleteButton.disabled).toBe(true);
	expect(client.profile.delete).not.toHaveBeenCalled();
});

test('exports explicit IDs and imports only after conflict preview', async () => {
	const { client, host } = fixture();
	render(
		<TestProviders>
			<DataPage host={host} />
		</TestProviders>,
	);
	await waitFor(() => expect(screen.getByText('purge-token')).toBeTruthy());
	fireEvent.click(screen.getByRole('checkbox', { name: 'Aster' }));
	await fireEvent.click(screen.getByRole('button', { name: 'Export selected data' }));
	await waitFor(() =>
		expect(host.exportArtifact).toHaveBeenCalledWith(
			{ artifactId: 'artifact-a', mediaType: 'application/json', size: '100' },
			expect.any(HTMLElement),
		),
	);
	expect(client.portable.export).toHaveBeenCalledWith(
		expect.objectContaining({ agentIds: ['agent-a'], memoryIds: [], sessionIds: [] }),
	);
	await fireEvent.click(screen.getByRole('button', { name: 'Choose import file' }));
	await waitFor(() => expect(screen.getByLabelText('Resolution for agent-a')).toBeTruthy());
	expect(client.portable.import).not.toHaveBeenCalled();
	fireEvent.change(screen.getByLabelText('Resolution for agent-a'), { target: { value: 'copy' } });
	await fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }));
	await waitFor(() => expect(client.portable.import).toHaveBeenCalledOnce());
});

test('shows a restricted offline state without client-side deletion', () => {
	render(
		<TestProviders>
			<DataPage host={{ client: () => undefined }} />
		</TestProviders>,
	);
	expect(screen.getByText('Runner is unavailable. Data actions are paused.')).toBeTruthy();
});

test('keeps failed conversation cleanup reachable without requesting blocked business lists', async () => {
	const { client, host } = fixture();
	Object.assign(client.service, {
		status: vi.fn(async () => ({ cleanup: { profile: false, sessionIds: ['old-session'] } })),
	});
	Object.assign(client.sessions, {
		deletePreview: vi.fn(async () => ({
			token: 'original',
			revision: '5',
			expiresAt: '2026-10-28T20:00:00Z',
			categories: [],
		})),
		delete: vi.fn(async () => ({ receiptId: 'cleaned' })),
	});
	const restored = vi.fn(async () => {});
	render(
		<TestProviders>
			<DataPage host={{ ...host, cleanupCompleted: restored }} />
		</TestProviders>,
	);
	const retry = await screen.findByRole('button', { name: 'Retry cleanup' });
	expect(client.agents.list).not.toHaveBeenCalled();
	expect(screen.queryByRole('button', { name: 'Choose import file' })).toBeNull();
	fireEvent.click(retry);
	await waitFor(() => expect(restored).toHaveBeenCalledOnce());
	expect(client.sessions.delete).toHaveBeenCalledWith(
		expect.objectContaining({ id: 'old-session', previewToken: 'original' }),
	);
});
