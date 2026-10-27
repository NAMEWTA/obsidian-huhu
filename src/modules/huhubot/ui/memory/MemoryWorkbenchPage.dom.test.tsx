import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { registerMessages, setLanguage } from '../../../../shared/i18n';
import type { BotClient, MemoryItem, MemoryNamespace } from '../../api';
import { memoryMessages } from '../../i18n/memory';
import { MemoryWorkbenchPage, type MemoryWorkbenchHost } from './MemoryWorkbenchPage';

const namespace: MemoryNamespace = { kind: 'agent', id: 'agent-a' };
const item: Extract<MemoryItem, { state: 'active' }> = { id: 'memory-a', revision: '2', namespace, scope: { kind: 'profile' }, pinned: false, state: 'active', revisionId: 'rev-2', body: { text: 'Use the concise format.', hash: 'sha256:memory', provenance: 'user', creatorKind: 'user', sourceRefs: [], sourceScopes: [], derived: [] } };
function fixture() {
  const client = { hello: { protocolVersion: '0.1', buildVersion: 'test', schemaVersion: 1, profile: { profileId: 'profile-a', commandEpoch: '1', revision: '2', createdAt: '2026-10-27T00:00:00Z' }, capabilities: [], limits: { maxFrameBytes: 1000, maxBatchItems: 100 } }, state: 'ready', onClose: () => () => {}, memory: { list: vi.fn(async () => ({ namespaceRevision: '2', settings: { namespace, revision: '2', enabled: false, eligible: true }, items: [{ kind: 'item', item }] })), pin: vi.fn(async () => item), forget: vi.fn(async () => ({ ...item, state: 'forgotten' })), correct: vi.fn(async () => item), setAutoMaintenance: vi.fn(async () => ({ namespace, revision: '3', enabled: true, eligible: true })), proposeGlobal: vi.fn(async () => ({ id: 'proposal-a', revision: '3', operation: 'create', scope: { kind: 'profile' }, previewHash: 'sha256:proposal', expiresAt: '2026-10-28T00:00:00Z', state: 'pending', body: item.body })), resolveGlobal: vi.fn(async () => ({ commandId: 'c', receiptId: 'r', revision: '4' })) } } as unknown as BotClient;
  return { client, host: { client: () => client, namespace: () => namespace, report: vi.fn() } satisfies MemoryWorkbenchHost };
}
beforeEach(() => { registerMessages(memoryMessages); setLanguage('en'); });

test('renders scoped memory with provenance and pin action', async () => {
  const f = fixture(); render(<TestProviders><MemoryWorkbenchPage host={f.host} /></TestProviders>);
  await waitFor(() => expect(screen.getByText('Use the concise format.')).toBeTruthy());
  expect(screen.getByText('Provenance: user')).toBeTruthy();
  await fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
  await waitFor(() => expect(f.client.memory.pin).toHaveBeenCalledWith(expect.objectContaining({ id: 'memory-a', expectedRevision: '2', namespace }))); 
});

test('keeps a correction draft until the command succeeds', async () => {
  const f = fixture(); render(<TestProviders><MemoryWorkbenchPage host={f.host} /></TestProviders>);
  await waitFor(() => expect(screen.getByText('Use the concise format.')).toBeTruthy());
  await fireEvent.click(screen.getByRole('button', { name: 'Correct' }));
  const field = screen.getByRole('textbox', { name: 'Correct' }); fireEvent.change(field, { target: { value: 'Use short paragraphs.' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));
  await waitFor(() => expect(f.client.memory.correct).toHaveBeenCalledWith(expect.objectContaining({ id: 'memory-a', text: 'Use short paragraphs.' })));
});

test('shows global proposal as pending until explicitly resolved', async () => {
  const f = fixture(); render(<TestProviders><MemoryWorkbenchPage host={{ ...f.host, namespace: () => ({ kind: 'global', id: 'global' }) }} /></TestProviders>);
  await waitFor(() => expect(screen.getByText('Use the concise format.')).toBeTruthy());
  const field = screen.getByRole('textbox', { name: 'Describe the global memory to propose…' }); fireEvent.change(field, { target: { value: 'Keep answers concise.' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Propose global memory' }));
  await waitFor(() => expect(screen.getByText('Pending confirmation')).toBeTruthy());
  expect(screen.getByText(/This proposal is not active until you confirm it/)).toBeTruthy();
  await fireEvent.click(screen.getByRole('button', { name: 'Confirm proposal' }));
  await waitFor(() => expect(f.client.memory.resolveGlobal).toHaveBeenCalledWith(expect.objectContaining({ id: 'proposal-a', decision: 'approve' })));
});
