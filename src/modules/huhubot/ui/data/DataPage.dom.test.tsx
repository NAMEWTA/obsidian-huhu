import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import type { BotClient } from '../../api';
import { dataMessages } from '../../i18n/data';
import { DataPage, type BotDataHost } from './DataPage';

function fixture() {
	const client = {
		hello: { protocolVersion: '0.1', buildVersion: 'test', schemaVersion: 1, profile: { profileId: 'profile-a', commandEpoch: '1', revision: '4', createdAt: '2026-10-27T00:00:00Z' }, capabilities: [], limits: { maxFrameBytes: 1000, maxBatchItems: 100 } },
		profile: { deletePreview: vi.fn(async () => ({ token: 'purge-token', revision: '4', expiresAt: '2026-10-27T01:00:00Z', categories: [{ kind: 'profile', count: 1, retained: false }, { kind: 'unknown-effects', count: 1, retained: false, reason: 'RECONCILIATION_REQUIRED' }] })), delete: vi.fn(async () => ({ commandId: 'c', receiptId: 'receipt-delete', revision: '5' })) },
		portable: { export: vi.fn(async () => ({ artifact: { artifactId: 'artifact-a', mediaType: 'application/json', size: '100' } })), importPreview: vi.fn(async () => ({ token: 'import-token', conflicts: [{ id: 'agent-a', revision: '2', hash: 'sha256:x' }] })), import: vi.fn(async () => ({ commandId: 'c', receiptId: 'receipt-import', revision: '5' })) },
	} as unknown as BotClient;
	return { client, host: { client: () => client, report: vi.fn() } satisfies BotDataHost };
}

beforeEach(() => { registerMessages(dataMessages); setLanguage('en'); });

test('renders exact deletion preview and blocks unknown effects', async () => {
	const { client, host } = fixture();
	render(<TestProviders><DataPage host={host} /></TestProviders>);
	await waitFor(() => expect(screen.getByText('purge-token')).toBeTruthy());
	const deleteButton = screen.getByRole('button', { name: 'Delete Profile' }) as HTMLButtonElement;
	expect(deleteButton.disabled).toBe(true);
	expect(client.profile.delete).not.toHaveBeenCalled();
});

test('exports explicit IDs and imports only after conflict preview', async () => {
	const { client, host } = fixture();
	render(<TestProviders><DataPage host={host} /></TestProviders>);
	await waitFor(() => expect(screen.getByText('purge-token')).toBeTruthy());
	fireEvent.change(screen.getByLabelText('Bot IDs'), { target: { value: 'agent-a' } });
	await fireEvent.click(screen.getByRole('button', { name: 'Export selected data' }));
	await waitFor(() => expect(screen.getByText(/artifact-a/)).toBeTruthy());
	fireEvent.change(screen.getByLabelText('Artifact ID'), { target: { value: 'artifact-a' } });
	await fireEvent.click(screen.getByRole('button', { name: 'Preview import' }));
	await waitFor(() => expect(screen.getByText(/import-token/)).toBeTruthy());
	fireEvent.change(screen.getByLabelText('Resolution for agent-a'), { target: { value: 'copy' } });
	await fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }));
	await waitFor(() => expect(client.portable.import).toHaveBeenCalledOnce());
});

test('shows a restricted offline state without client-side deletion', () => {
	render(<TestProviders><DataPage host={{ client: () => undefined }} /></TestProviders>);
	expect(screen.getByText('Runner is unavailable. Data actions are paused.')).toBeTruthy();
});
