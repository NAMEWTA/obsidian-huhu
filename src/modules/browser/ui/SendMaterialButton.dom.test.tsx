import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { t } from '../../../shared/i18n';
import { SendMaterialButton } from './SendMaterialButton';
import { workspaceFixture } from './testing/workspace';

async function fixture() {
	const f = workspaceFixture(), lease = await f.api.takeover({ spaceId: 'space', viewerId: 'viewer', windowId: 'window' });
	vi.mocked(f.api.listMaterialTargets).mockResolvedValue([{ id: 'consumer:chosen-session', label: 'Chosen session' }]);
	const authority = () => ({ spaceId: 'space', pageId: 'page', viewerId: 'viewer', leaseId: lease.leaseId, epoch: lease.epoch }), report = vi.fn();
	const rendered = render(<TestProviders><SendMaterialButton api={f.api} authority={authority} disabled={false} report={report} /></TestProviders>);
	return { ...f, ...rendered, report };
}
async function choose(label: string, option: string) {
	fireEvent.click(screen.getByRole('combobox', { name: label }));
	fireEvent.click(await screen.findByRole('option', { name: option }));
}
async function open() {
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.sendMaterial') }));
	await screen.findByRole('combobox', { name: t('browser.v2.materialElement') });
	await choose(t('browser.v2.materialTarget'), 'Chosen session');
	await choose(t('browser.v2.materialElement'), 'button: Selected element (main)');
}
it('delivers the selected opaque ref to the explicitly chosen session from the existing dialog', async () => {
	const f = await fixture(); await open();
	fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('browser.v2.sendMaterial') }));
	await waitFor(() => expect(f.api.sendMaterial).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'consumer:chosen-session', observationId: 'observation', ref: 'selected-ref', signal: expect.any(AbortSignal) })));
	await screen.findByText(t('browser.v2.materialSent')); expect(f.report).not.toHaveBeenCalled();
});
it('requests cancellation while delivery is waiting and confirms it before allowing another capture', async () => {
	const f = await fixture(); let reject!: (error: Error) => void;
	vi.mocked(f.api.sendMaterial).mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })); await open();
	fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('browser.v2.sendMaterial') }));
	await waitFor(() => expect(f.api.sendMaterial).toHaveBeenCalledOnce()); const signal = vi.mocked(f.api.sendMaterial).mock.calls[0]![0].signal!;
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.cancel') })); expect(signal.aborted).toBe(true); expect(screen.getByRole('dialog')).toBeTruthy();
	await act(async () => reject(Error('cancelled'))); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(f.report).not.toHaveBeenCalled(); expect(f.api.sendMaterial).toHaveBeenCalledOnce();
});
it('aborts the unique capture when the viewer unmounts and does not report a late success', async () => {
	const f = await fixture(); let resolve!: () => void; vi.mocked(f.api.sendMaterial).mockImplementationOnce(() => new Promise(done => { resolve = done; })); await open();
	fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('browser.v2.sendMaterial') })); await waitFor(() => expect(f.api.sendMaterial).toHaveBeenCalledOnce()); const signal = vi.mocked(f.api.sendMaterial).mock.calls[0]![0].signal!;
	f.unmount(); expect(signal.aborted).toBe(true); await act(async () => resolve()); expect(f.report).not.toHaveBeenCalled();
});
