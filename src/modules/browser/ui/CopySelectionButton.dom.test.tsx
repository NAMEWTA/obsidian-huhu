import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { t } from '../../../shared/i18n';
import { CopySelectionButton } from './CopySelectionButton';
import { workspaceFixture } from './testing/workspace';

it('copies only an explicit bounded selection request and refuses a result after control revocation', async () => {
	const f = workspaceFixture(),
		lease = await f.api.takeover({ spaceId: 'space', viewerId: 'viewer', windowId: 'window' });
	const scope = { spaceId: 'space', pageId: 'page', viewerId: 'viewer', leaseId: lease.leaseId, epoch: lease.epoch };
	const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
	const report = vi.fn();
	const view = render(
		<TestProviders>
			<CopySelectionButton api={f.api} authority={() => scope} disabled={false} report={report} />
		</TestProviders>,
	);
	expect(clipboard).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.copySelection') }));
	await waitFor(() => expect(clipboard).toHaveBeenCalledWith('selected webpage text'));
	let finish!: (value: { text: string; truncated: boolean }) => void;
	vi.mocked(f.api.readSelection).mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.copySelection') }));
	const state = f.api.getState();
	f.set({ ...state, spaces: [{ ...state.spaces[0]!, control: { mode: 'paused', epoch: lease.epoch + 1 } }] });
	await act(async () => finish({ text: 'late selection', truncated: false }));
	expect(clipboard).toHaveBeenCalledTimes(1);
	expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'control_revoked' }));
	view.unmount();
	clipboard.mockRestore();
});
