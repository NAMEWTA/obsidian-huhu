import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from './dialog';
import { Button } from './button';
import { TestProviders } from '../react/test-providers';
function DirtyDialog() {
	const [open, setOpen] = useState(false);
	return (
		<Dialog open={open} onOpenChange={setOpen} dirty>
			<DialogTrigger asChild>
				<Button>Open draft</Button>
			</DialogTrigger>
			<DialogContent aria-describedby={undefined}>
				<DialogTitle>Draft</DialogTitle>
				<input aria-label="Draft text" defaultValue="Unsaved" />
				<DialogClose asChild>
					<Button>Cancel draft</Button>
				</DialogClose>
			</DialogContent>
		</Dialog>
	);
}
test('dirty cancel, escape and outside close ask before discarding and return focus', async () => {
	const user = userEvent.setup();
	render(
		<TestProviders>
			<DirtyDialog />
		</TestProviders>,
	);
	const trigger = screen.getByRole('button', { name: 'Open draft' });
	await user.click(trigger);
	await user.click(screen.getByRole('button', { name: 'Cancel draft' }));
	expect(await screen.findByRole('alertdialog')).toBeTruthy();
	await user.click(screen.getByRole('button', { name: '继续编辑' }));
	expect((screen.getByRole('textbox', { name: 'Draft text' }) as HTMLInputElement).value).toBe('Unsaved');
	await user.keyboard('{Escape}');
	expect(await screen.findByRole('alertdialog')).toBeTruthy();
	await user.click(screen.getByRole('button', { name: '放弃修改' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	await waitFor(() => expect(document.activeElement).toBe(trigger));
});
