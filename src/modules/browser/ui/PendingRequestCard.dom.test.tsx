import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { t } from '../../../shared/i18n';
import type { BrowserFile, PendingHumanRequest } from '../api';
import { PendingRequestCard } from './PendingRequestCard';
import { workspaceFixture } from './testing/workspace';

it('waits for the human epoch and rejects a file picker result after the request revision changes', async () => {
	const f = workspaceFixture(),
		lease = await f.api.takeover({ spaceId: 'space', viewerId: 'viewer', windowId: 'window' });
	const scope = { spaceId: 'space', pageId: 'page', viewerId: 'viewer', leaseId: lease.leaseId, epoch: lease.epoch };
	const request: PendingHumanRequest = {
		id: 'request',
		spaceId: 'space',
		pageId: 'page',
		runtimeId: 'runtime',
		documentId: 'document',
		epoch: lease.epoch - 1,
		revision: 1,
		kind: 'file-chooser',
		message: '<script>untrusted</script>',
		expiresAt: Date.now() + 60_000,
		status: 'pending',
	};
	f.set({ ...f.api.getState(), requests: [request] });
	const report = vi.fn();
	const content = (value: PendingHumanRequest) => (
		<TestProviders>
			<PendingRequestCard api={f.api} request={value} authority={() => scope} report={report} />
		</TestProviders>
	);
	const view = render(content(request));
	expect((screen.getByRole('button', { name: t('browser.v2.chooseFiles') }) as HTMLButtonElement).disabled).toBe(
		true,
	);
	expect(document.querySelector('script')).toBeNull();
	const fresh = { ...request, epoch: lease.epoch, revision: 2 };
	f.set({ ...f.api.getState(), requests: [fresh] });
	view.rerender(content(fresh));
	let finish!: (file: BrowserFile | undefined) => void;
	vi.mocked(f.api.chooseUpload).mockImplementation(
		() =>
			new Promise<BrowserFile | undefined>((resolve) => {
				finish = resolve;
			}),
	);
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.chooseFiles') }));
	f.set({ ...f.api.getState(), requests: [{ ...fresh, revision: 3 }] });
	await act(async () => finish(undefined));
	await waitFor(() =>
		expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'browser_stale_request' })),
	);
	expect(f.api.pageAction).not.toHaveBeenCalled();
	expect(f.api.chooseUpload).toHaveBeenCalledWith('space', 'human');
});
