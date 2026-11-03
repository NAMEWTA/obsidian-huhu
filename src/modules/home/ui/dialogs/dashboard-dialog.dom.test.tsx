import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { DashboardDialog } from './DashboardDialog';
afterEach(cleanup);

function Host() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button onClick={() => setOpen(true)}>open</button>
			{open && (
				<DashboardDialog title="Edit" onClose={() => setOpen(false)} onSave={() => setOpen(false)}>
					<input aria-label="name" />
				</DashboardDialog>
			)}
		</>
	);
}

test('closing a dashboard dialog returns focus to the control that opened it', async () => {
	render(
		<TestProviders>
			<Host />
		</TestProviders>,
	);
	const opener = screen.getByRole('button', { name: 'open' });
	opener.focus();
	fireEvent.click(opener);
	await screen.findByRole('dialog');
	fireEvent.click(screen.getByRole('button', { name: /cancel|取消/i }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	await waitFor(() => expect(document.activeElement).toBe(opener));
});
