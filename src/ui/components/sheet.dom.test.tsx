import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetClose } from './sheet';
import { Button } from './button';
import { TestProviders } from '../react/test-providers';
test('dirty Sheet cancellation stays mounted until confirmed and restores trigger focus', async () => {
	const user = userEvent.setup();
	render(
		<TestProviders>
			<Sheet dirty>
				<SheetTrigger asChild>
					<Button>Open sheet</Button>
				</SheetTrigger>
				<SheetContent aria-describedby={undefined}>
					<SheetTitle>Draft sheet</SheetTitle>
					<input aria-label="Sheet draft" defaultValue="Retain" />
					<SheetClose asChild>
						<Button>Cancel sheet</Button>
					</SheetClose>
				</SheetContent>
			</Sheet>
		</TestProviders>,
	);
	const trigger = screen.getByRole('button', { name: 'Open sheet' });
	await user.click(trigger);
	await user.click(screen.getByRole('button', { name: 'Cancel sheet' }));
	expect(await screen.findByRole('alertdialog')).toBeTruthy();
	await user.click(screen.getByRole('button', { name: '继续编辑' }));
	expect((screen.getByRole('textbox', { name: 'Sheet draft' }) as HTMLInputElement).value).toBe('Retain');
	await user.keyboard('{Escape}');
	expect(await screen.findByRole('alertdialog')).toBeTruthy();
	await user.click(screen.getByRole('button', { name: '放弃修改' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	await waitFor(() => expect(document.activeElement).toBe(trigger));
});

test('confirmation cancellation does not become a deferred parent outside dismissal', async () => {
	const user = userEvent.setup();
	render(
		<TestProviders>
			<Sheet dirty>
				<SheetTrigger asChild>
					<Button>Open barrier sheet</Button>
				</SheetTrigger>
				<SheetContent aria-describedby={undefined}>
					<SheetTitle>Barrier draft</SheetTitle>
					<input aria-label="Barrier field" defaultValue="Retain" />
				</SheetContent>
			</Sheet>
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Open barrier sheet' }));
	const field = screen.getByRole('textbox', { name: 'Barrier field' });
	field.focus();
	(field as HTMLInputElement).setSelectionRange(1, 4);
	let target: HTMLElement | undefined;
	const focus = HTMLElement.prototype.focus;
	const spy = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, ...args) {
		const result = focus.apply(this, args);
		// Pause at real autofocus: the parent still has its pre-child deferred outside listener.
		if (!target && this.textContent === '继续编辑') {
			target = this;
			fireEvent.pointerDown(this, { pointerType: 'mouse', button: 0 });
		}
		return result;
	});
	try {
		await user.keyboard('{Escape}');
		const keep = await screen.findByRole('button', { name: '继续编辑' });
		expect(target).toBe(keep);
		fireEvent.pointerUp(keep, { pointerType: 'mouse', button: 0 });
		fireEvent.click(keep, { button: 0 });
		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(field));
		expect(screen.getByRole('textbox', { name: 'Barrier field' })).toBe(field);
		expect([(field as HTMLInputElement).selectionStart, (field as HTMLInputElement).selectionEnd]).toEqual([1, 4]);
		// A new real outside interaction must still request dirty confirmation.
		await user.click(document.querySelector<HTMLElement>('[data-slot=sheet-overlay]')!);
		expect(await screen.findByRole('alertdialog')).toBeTruthy();
		await user.click(screen.getByRole('button', { name: '放弃修改' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		await waitFor(() =>
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open barrier sheet' })),
		);
	} finally {
		spy.mockRestore();
	}
});
