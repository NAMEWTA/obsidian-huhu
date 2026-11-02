import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { t } from '../../../../shared/i18n';
import { TestProviders } from '../../../../ui/react/test-providers';
import { SpaceService } from '../../services/spaces/space-service';
import type { ArchivePlan, ArchiveResult } from '../../core/workspace/managed-runtime';
import type { WorkspaceService, ConfirmFn } from '../../services/workspace-service';
import { SpaceNavigation } from './SpaceNavigation';

async function fixture() {
 const files = new Map<string, string>(), lost = new AbortController();
 const root = { canonicalPath: '/vault', dev: '1', ino: '2' }, vault = { vaultId: 'v', deviceId: 'd', rootPath: '/vault', root };
 const spaces = new SpaceService({ instanceId: 'test', report: vi.fn(), storage: { exists: async p => files.has(p), read: async p => files.get(p)!, write: async (p, v) => { files.set(p, v); }, mkdir: async () => {} }, directories: { inspectVault: async () => vault, assertVault: async () => {}, bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: root }), chooseExternalDirectory: async () => undefined, resolveDirectory: async () => ({ cwd: '/vault' }) }, owners: { acquire: async () => ({ instanceId: 'test', port: 1, lost: lost.signal, assertHeld: async () => {}, close: async () => {} }) } });
 await spaces.ready;
 const a = await spaces.create({ name: 'A', relativePath: '' }), b = await spaces.create({ name: 'B', relativePath: '' });
 await spaces.select(a.id);
 const plan: ArchivePlan = { scope: { kind: 'space', spaceId: a.id }, members: [{ spaceId: a.id, sessionId: 's', runtimeId: 'r-original' }], fingerprint: 'fixed' };
 const previewArchive = vi.fn(async () => plan), archiveManaged = vi.fn(async (): Promise<ArchiveResult> => ({ scope: plan.scope, status: 'archived', effect: 'completed', rows: [] }));
 const workspace = { previewArchive, archiveManaged, getManagedSnapshot: () => ({ revision: 1, sessions: [] }) } as unknown as WorkspaceService;
 const confirm = vi.fn<ConfirmFn>(async () => false);
 return { spaces, a, b, plan, workspace, previewArchive, archiveManaged, confirm };
}

test('Space archive previews exact membership, cancellation is inert, and confirmation reuses that original plan after selection changes', async () => {
 const f = await fixture(), user = userEvent.setup();
 const view = render(<TestProviders><SpaceNavigation spaces={f.spaces} select={id => f.spaces.select(id)} workspace={f.workspace} confirm={f.confirm} /></TestProviders>);
 try {
  const archiveButtons = () => screen.getAllByRole('button', { name: new RegExp(t('agent.managed.archiveSpace')) });
  await user.click(archiveButtons()[0]!);
  expect(f.previewArchive).toHaveBeenCalledWith({ kind: 'space', spaceId: f.a.id });
  expect(f.confirm.mock.calls[0]?.[0]).toContain('r-original');
  expect(f.archiveManaged).not.toHaveBeenCalled();
  let accept!: (yes: boolean) => void;
  f.confirm.mockImplementation(() => new Promise(resolve => { accept = resolve; }));
  await user.click(archiveButtons()[0]!);
  await act(async () => { await f.spaces.select(f.b.id); });
  await act(async () => { accept(true); });
  await waitFor(() => expect(f.archiveManaged).toHaveBeenCalledWith(f.plan, expect.anything()));
  expect(f.archiveManaged).toHaveBeenCalledOnce();
  expect(f.spaces.store.getState().records.selectedSpaceId).toBe(f.b.id);
 } finally { view.unmount(); await f.spaces.dispose(); }
});

test('failed archive retains scoped results and does not silently preview or retry another Space', async () => {
 const f = await fixture(), user = userEvent.setup();
 f.confirm.mockResolvedValue(true);
 f.archiveManaged.mockResolvedValue({ scope: f.plan.scope, status: 'failed', effect: 'none', rows: [], error: { code: 'STALE_RUNTIME', reason: 'archive-changed', messageKey: 'agent.managed.staleRuntime', nextAction: 'inspect-runtime', details: {} } });
 const view = render(<TestProviders><SpaceNavigation spaces={f.spaces} select={id => f.spaces.select(id)} workspace={f.workspace} confirm={f.confirm} /></TestProviders>);
 try {
  await user.click(screen.getAllByRole('button', { name: new RegExp(t('agent.managed.archiveSpace')) })[0]!);
  expect(await screen.findByText(t('agent.managed.archiveChanged'))).toBeTruthy();
  expect(screen.getByText(t('agent.managed.archiveIncomplete'))).toBeTruthy();
  expect(f.previewArchive).toHaveBeenCalledOnce(); expect(f.archiveManaged).toHaveBeenCalledOnce();
  expect(f.spaces.list()).toHaveLength(2);
 } finally { view.unmount(); await f.spaces.dispose(); }
});
