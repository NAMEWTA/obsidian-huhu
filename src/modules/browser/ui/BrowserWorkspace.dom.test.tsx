import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { t } from '../../../shared/i18n';
import { BrowserWorkspace } from './BrowserWorkspace';
import { workspaceFixture } from './testing/workspace';
vi.mock('./SpaceViewer', () => ({ SpaceViewer: () => <div data-testid="shared-viewer" /> }));

it('offers source cleanup retry for a completed download without downloading or capturing it again', async () => {
	const f = workspaceFixture();
	vi.mocked(f.api.listFiles).mockReturnValue([{ id: 'file', name: 'download.txt', kind: 'download', state: 'ready', size: 10, sha256: 'a'.repeat(64), createdAt: 1, scope: { spaceId: 'space', execution: { kind: 'agent', runId: 'run' } } }]);
	vi.mocked(f.api.listDownloads).mockReturnValue([{ id: 'download', fileId: 'file', name: 'download.txt', pageId: 'page', scope: { spaceId: 'space', execution: { kind: 'agent', runId: 'run' } }, state: 'completed', cleanup: 'pending', receivedBytes: 10, totalBytes: 10 }]);
	render(<TestProviders><BrowserWorkspace api={f.api} selection={{ spaceId: 'space' }} onSelect={vi.fn()} /></TestProviders>);
	fireEvent.mouseDown(screen.getByRole('tab', { name: t('browser.v2.files') }), { button: 0, ctrlKey: false });
	fireEvent.click(await screen.findByRole('button', { name: t('browser.v2.downloadCleanupPending') }));
	await waitFor(() => expect(f.api.retryCleanup).toHaveBeenCalledWith('space')); expect(f.api.chooseUpload).not.toHaveBeenCalled(); expect(f.api.createSpace).not.toHaveBeenCalled();
});

it('retries a failed desired page without closing successful pages and reopens a faulted Space', async () => {
	const f = workspaceFixture(), initial = f.api.getState(), space = initial.spaces[0]!, first = space.pages[0]!;
	f.set({ ...initial, spaces: [{ ...space, pages: [first, { ...first, id: 'failed-page', title: 'Failed page', status: 'failed', error: 'synthetic_page_failure' }] }] });
	render(<TestProviders><BrowserWorkspace api={f.api} selection={{ spaceId: space.id, pageId: first.id }} onSelect={vi.fn()} /></TestProviders>);
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.retryPage') }));
	await waitFor(() => expect(f.api.retryPage).toHaveBeenCalledWith({ spaceId: space.id, pageId: 'failed-page' }));
	expect(f.api.closePage).not.toHaveBeenCalled(); expect(f.api.stopSpace).not.toHaveBeenCalled();
	act(() => f.set({ ...initial, spaces: [{ ...space, status: 'faulted' }] }));
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.start') }));
	await waitFor(() => expect(f.api.startSpace).toHaveBeenCalledWith(space.id));
});

async function openManualSave(f: ReturnType<typeof workspaceFixture>) {
	const state = f.api.getState(), space = state.spaces[0]!;
	f.set({ ...state, spaces: [{ ...space, control: { mode: 'human', epoch: 3, lease: { spaceId: space.id, runtimeId: space.runtimeId!, leaseId: 'human-lease', controllerId: 'viewer', viewerId: 'viewer', windowId: 'window', mode: 'human', epoch: 3, expiresAt: Date.now() + 60000 } } }] });
	render(<TestProviders><BrowserWorkspace api={f.api} selection={{ spaceId: space.id, pageId: space.pages[0]!.id }} onSelect={vi.fn()} /></TestProviders>);
	fireEvent.keyDown(screen.getAllByRole('button', { name: t('browser.v2.workspace') })[0]!, { key: 'ArrowDown' });
	fireEvent.click(await screen.findByRole('menuitem', { name: t('browser.v2.identityExport') }));
	fireEvent.change(screen.getByLabelText(t('browser.v2.identityName')), { target: { value: 'Manual synthetic identity' } });
}

it.each(['cancelled', 'committed'] as const)('manual save offers cancellation and reports the confirmed %s fact', async outcome => {
	const f = workspaceFixture(), receipt = { ...await f.api.commitIdentityImport({ planId: 'fixture', persist: true }), source: 'manual-login' as const }; let finish!: () => void;
	vi.mocked(f.api.saveIdentity).mockImplementation(() => new Promise((resolve, reject) => { finish = () => outcome === 'committed' ? resolve(receipt) : reject(new Error('cancelled')); }));
	await openManualSave(f); fireEvent.click(screen.getByRole('button', { name: t('browser.v2.save') }));
	const cancel = screen.getByRole('button', { name: t('browser.v2.cancel') }) as HTMLButtonElement; expect(cancel.disabled).toBe(false);
	fireEvent.click(cancel); expect(vi.mocked(f.api.saveIdentity).mock.calls[0]![0].signal?.aborted).toBe(true); expect(screen.getByRole('status').textContent).toBe(t('browser.v2.identityCancelling'));
	await act(async () => finish());
	expect(screen.getByRole('status').textContent).toBe(t(outcome === 'committed' ? 'browser.v2.identitySavedAfterCancel' : 'browser.v2.identityCancelled', { count: outcome === 'committed' ? receipt.cookieCount : 0 })); expect(f.api.saveIdentity).toHaveBeenCalledOnce();
});

it('keeps manual publication visible and retries only the list after a directory refresh failure', async () => {
	const f = workspaceFixture(), receipt = { ...await f.api.commitIdentityImport({ planId: 'fixture', persist: true }), source: 'manual-login' as const, catalogRefresh: 'pending' as const };
	vi.mocked(f.api.saveIdentity).mockImplementation(async () => { f.set({ ...f.api.getState(), identityRefreshPending: true }); return receipt; });
	vi.mocked(f.api.listIdentities).mockReturnValue([receipt]);
	vi.mocked(f.api.refreshIdentities).mockImplementation(async () => { f.set({ ...f.api.getState(), identityRefreshPending: false }); });
	await openManualSave(f); fireEvent.click(screen.getByRole('button', { name: t('browser.v2.save') }));
	await screen.findByText(t('browser.v2.identitySaved', { count: receipt.cookieCount })); expect(screen.getByRole('alert').textContent).toBe(t('browser.v2.identityListPending'));
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.reloadIdentities') })); await waitFor(() => expect(f.api.refreshIdentities).toHaveBeenCalledOnce());
	expect(f.api.saveIdentity).toHaveBeenCalledOnce(); expect(screen.queryByText(t('browser.v2.identityListPending'))).toBeNull();
});

it('keeps a file-import receipt visible while reloading its incomplete identity list without another commit', async () => {
	const f = workspaceFixture(), receipt = { ...await f.api.commitIdentityImport({ planId: 'fixture', persist: true }), catalogRefresh: 'pending' as const };
	vi.mocked(f.api.commitIdentityImport).mockClear();
	vi.mocked(f.api.commitIdentityImport).mockImplementation(async () => { vi.mocked(f.api.listIdentities).mockReturnValue([receipt]); f.set({ ...f.api.getState(), identityRefreshPending: true }); return receipt; });
	vi.mocked(f.api.refreshIdentities).mockImplementation(async () => { f.set({ ...f.api.getState(), identityRefreshPending: false }); });
	render(<TestProviders><BrowserWorkspace api={f.api} selection={{}} onSelect={vi.fn()} /></TestProviders>);
	fireEvent.mouseDown(screen.getByRole('tab', { name: t('browser.v2.identities') }), { button: 0, ctrlKey: false });
	fireEvent.change(screen.getByLabelText(t('browser.v2.identityName')), { target: { value: 'Synthetic file import' } }); fireEvent.click(screen.getByRole('button', { name: t('browser.v2.chooseIdentityFile') }));
	await screen.findByRole('heading', { name: t('browser.v2.reviewTitle') }); fireEvent.click(screen.getByRole('button', { name: t('browser.v2.commitIdentity') }));
	await screen.findByText(t('browser.v2.identitySaved', { count: receipt.cookieCount })); expect(screen.getByRole('alert').textContent).toBe(t('browser.v2.identityListPending'));
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.reloadIdentities') })); await waitFor(() => expect(f.api.refreshIdentities).toHaveBeenCalledOnce()); expect(f.api.commitIdentityImport).toHaveBeenCalledOnce(); expect(f.api.saveIdentity).not.toHaveBeenCalled();
});

it('requires explicit temporary-storage consent and records it before creating an ephemeral Space', async () => {
	const f = workspaceFixture();
	f.set({ ...f.api.getState(), persistence: 'unavailable' });
	render(
		<TestProviders>
			<BrowserWorkspace api={f.api} selection={{}} onSelect={vi.fn()} navigationRevision={0} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.newSpace') }));
	fireEvent.change(screen.getByLabelText(t('browser.v2.name')), { target: { value: 'Temporary research' } });
	const create = screen.getByRole('button', { name: t('browser.v2.create') }) as HTMLButtonElement;
	expect(create.disabled).toBe(true);
	expect(f.api.consentEphemeral).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('checkbox', { name: t('browser.v2.ephemeralConsent') }));
	fireEvent.click(create);
	await waitFor(() =>
		expect(f.api.createSpace).toHaveBeenCalledWith(
			expect.objectContaining({ ephemeral: true, label: 'Temporary research' }),
		),
	);
	expect(vi.mocked(f.api.consentEphemeral).mock.invocationCallOrder[0]).toBeLessThan(
		vi.mocked(f.api.createSpace).mock.invocationCallOrder[0]!,
	);
});

it.each(['cancelled', 'committed'] as const)('keeps new-space %s publication facts distinct from a cancellation request', async outcome => {
	const f = workspaceFixture(); let finish!: () => void;
	vi.mocked(f.api.createSpace).mockImplementation(() => new Promise((resolve, reject) => { finish = () => outcome === 'committed' ? resolve(f.api.getState().spaces[0]!) : reject(new Error('start_cancelled')); }));
	render(<TestProviders><BrowserWorkspace api={f.api} selection={{}} onSelect={vi.fn()} /></TestProviders>);
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.newSpace') })); fireEvent.change(screen.getByLabelText(t('browser.v2.name')), { target: { value: 'Synthetic space' } });
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.create') }));
	const signal = vi.mocked(f.api.createSpace).mock.calls[0]![0].signal; fireEvent.click(screen.getByRole('button', { name: t('browser.v2.cancel') })); expect(signal?.aborted).toBe(true);
	expect(screen.getByRole('status').textContent).toBe(t('browser.v2.identityCancelling')); await act(async () => finish());
	expect(screen.getByRole('status').textContent).toBe(t(outcome === 'committed' ? 'browser.v2.spaceCreatedAfterCancel' : 'browser.v2.identityCancelled'));
});

it('presents actual target verification and published counts without claiming website login', async () => {
	const f = workspaceFixture(), original = f.api.getState(), space = original.spaces[0]!;
	f.set({ ...original, spaces: [{ ...space, status: 'provisioning', identityImport: { phase: 'target' } }] });
	render(<TestProviders><BrowserWorkspace api={f.api} selection={{ spaceId: space.id }} onSelect={vi.fn()} /></TestProviders>);
	expect(screen.getByRole('status').textContent).toBe(t('browser.v2.identityPhase.target'));
	await act(async () => f.set({ ...original, spaces: [{ ...space, identityImport: { phase: 'verified', importedCount: 2, naturallyExpired: 1, loginStatus: 'not-verified' } }] }));
	expect(screen.getByRole('status').textContent).toBe(t('browser.v2.identityVerified', { count: 2, expired: 1 }));
	await act(async () => f.set({ ...f.api.getState(), spaces: [{ ...f.api.getState().spaces[0]!, status: 'stopped' }] }));
	expect(screen.getByRole('status').textContent).toBe(t('browser.v2.identityVerified', { count: 2, expired: 1 }));
});
it('authorizes upload files explicitly for the currently running Agent, never an ambient human lease', async () => {
	const f = workspaceFixture(),
		state = f.api.getState();
	f.set({ ...state, spaces: [{ ...state.spaces[0]!, control: { mode: 'agent', epoch: 2 } }] });
	render(
		<TestProviders>
			<BrowserWorkspace
				api={f.api}
				selection={{ spaceId: 'space', pageId: 'page' }}
				onSelect={vi.fn()}
				navigationRevision={0}
			/>
		</TestProviders>,
	);
	fireEvent.mouseDown(screen.getByRole('tab', { name: t('browser.v2.files') }), { button: 0, ctrlKey: false });
	fireEvent.click(await screen.findByRole('button', { name: t('browser.v2.chooseAgentUpload') }));
	await waitFor(() => expect(f.api.chooseUpload).toHaveBeenCalledWith('space', 'agent'));
});
