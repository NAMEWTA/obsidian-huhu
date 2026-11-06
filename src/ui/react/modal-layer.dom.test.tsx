import { useLayoutEffect, useState, type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '../components/dialog';
import { CommandDialog, CommandInput, CommandList, CommandItem } from '../components/command';
import { ConfirmDialog } from '../components/huhu/ConfirmDialog';
import { Button } from '../components/button';
import { TestProviders } from './test-providers';
import { openReactDialog } from './dialog';
import { ModalLayer, useModalContent } from './modal-layer';
function Nested() {
	const [command, setCommand] = useState(false);
	return (
		<>
			<Button onClick={() => setCommand(true)}>Open command</Button>
			<CommandDialog open={command} onOpenChange={setCommand}>
				<CommandInput aria-label="Search" />
				<CommandList>
					<CommandItem value="entry">Entry</CommandItem>
				</CommandList>
				<ConfirmDialog title="Confirm nested" description="Review" onConfirm={() => {}}>
					<Button>Nested confirmation</Button>
				</ConfirmDialog>
			</CommandDialog>
		</>
	);
}
test('Command confirmation is above its parent and Esc/F6 stay in the top modal', async () => {
	const user = userEvent.setup();
	render(
		<TestProviders>
			<Nested />
		</TestProviders>,
	);
	const trigger = screen.getByRole('button', { name: 'Open command' });
	await user.click(trigger);
	await user.click(screen.getByRole('button', { name: 'Nested confirmation' }));
	const child = await screen.findByRole('alertdialog');
	const parent = document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;
	expect(Number((child as HTMLElement).style.zIndex)).toBeGreaterThan(Number(parent.style.zIndex));
	const escape = vi.fn();
	document.addEventListener('keydown', escape);
	fireEvent.keyDown(child, { key: 'F6' });
	expect(child.contains(document.activeElement)).toBe(true);
	expect(escape).not.toHaveBeenCalled();
	document.removeEventListener('keydown', escape);
	await user.keyboard('{Escape}');
	await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
	expect(screen.getByRole('dialog')).toBeTruthy();
	await user.keyboard('{Escape}');
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	await waitFor(() => expect(document.activeElement).toBe(trigger));
});
test('outside pointer close of a dirty dialog opens the shared discard confirmation', async () => {
	const user = userEvent.setup();
	render(
		<TestProviders>
			<Dialog defaultOpen dirty>
				<DialogContent aria-describedby={undefined}>
					<DialogTitle>Dirty outside</DialogTitle>
					<input aria-label="Keep" defaultValue="draft" />
				</DialogContent>
			</Dialog>
		</TestProviders>,
	);
	await user.click(document.querySelector('[data-slot="dialog-overlay"]')!);
	expect(await screen.findByRole('alertdialog')).toBeTruthy();
	expect((document.querySelector('input[aria-label="Keep"]') as HTMLInputElement).value).toBe('draft');
});
test('if the opener unmounts, closing falls back within its original HUHU region', async () => {
	function Probe() {
		const [show, setShow] = useState(true);
		return (
			<Dialog>
				<Button variant="secondary">Region fallback</Button>
				{show && (
					<DialogTrigger asChild>
						<Button onClick={() => setShow(false)}>Remove opener</Button>
					</DialogTrigger>
				)}
				<DialogContent aria-describedby={undefined}>
					<DialogTitle>Transient opener</DialogTitle>
				</DialogContent>
			</Dialog>
		);
	}
	const user = userEvent.setup();
	render(
		<TestProviders>
			<Probe />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Remove opener' }));
	await user.keyboard('{Escape}');
	await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Region fallback' })));
});
test('imperative content close uses the same dirty guard while owner disposal remains unconditional', async () => {
	const user = userEvent.setup();
	const owner = document.createElement('div');
	owner.className = 'huhu-ui';
	document.body.append(owner);
	let result: ReturnType<typeof openReactDialog>;
	result = openReactDialog(owner, {
		title: 'Imperative dirty',
		isDirty: () => true,
		content: (close) => <Button onClick={close}>Cancel imperative</Button>,
	});
	await user.click(await screen.findByRole('button', { name: 'Cancel imperative' }));
	expect(await screen.findByRole('alertdialog')).toBeTruthy();
	await user.click(screen.getByRole('button', { name: '继续编辑' }));
	result.close();
	expect(await screen.findByRole('alertdialog')).toBeTruthy();
	owner.remove();
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
test('imperative close requested before the first React mount is not lost', async () => {
	const owner = document.createElement('div');
	owner.className = 'huhu-ui';
	document.body.append(owner);
	const closed = vi.fn();
	const dialog = openReactDialog(owner, { title: 'Immediate close', content: () => null, onClose: closed });
	dialog.close();
	await waitFor(() => expect(closed).toHaveBeenCalledOnce());
	expect(screen.queryByRole('dialog')).toBeNull();
	owner.remove();
});

test('pointer owner is the captured same-Document ancestry, even after adoption and rerender', () => {
	const handlers = new Map<string, ReturnType<typeof useModalContent>>();
	function Probe({ id, children }: { id: string; children?: ReactNode }) {
		const modal = useModalContent();
		useLayoutEffect(() => {
			handlers.set(id, modal);
		});
		return (
			<div ref={modal.ref} data-testid={id} onPointerDownCapture={modal.onPointerDownCapture}>
				{children}
			</div>
		);
	}
	const view = (doc: Document) => (
		<TestProviders ownerDocument={doc}>
			<ModalLayer open>
				<Probe id="owner-parent">
					<ModalLayer open>
						<Probe id="owner-child" />
					</ModalLayer>
				</Probe>
			</ModalLayer>
			<ModalLayer open>
				<Probe id="owner-peer" />
			</ModalLayer>
		</TestProviders>
	);
	const ui = render(view(document));
	const parent = screen.getByTestId('owner-parent');
	const child = screen.getByTestId('owner-child');
	const home = parent.parentElement!;
	const down = new PointerEvent('pointerdown', { bubbles: true, button: 0 });
	fireEvent(child, down);
	// Browsers may clear composedPath after dispatch; the ownership snapshot must not need it.
	vi.spyOn(down, 'composedPath').mockReturnValue([]);
	const outside = () => new CustomEvent('pointerOutside', { cancelable: true, detail: { originalEvent: down } });
	const unrelated = outside();
	handlers.get('owner-peer')!.onPointerDownOutside(unrelated);
	expect(unrelated.defaultPrevented).toBe(false);
	const independent = render(
		<TestProviders>
			<ModalLayer open>
				<Probe id="independent-owner" />
			</ModalLayer>
		</TestProviders>,
	);
	const independentDown = new PointerEvent('pointerdown', { bubbles: true, button: 0 });
	fireEvent(screen.getByTestId('independent-owner'), independentDown);
	const crossRoot = new CustomEvent('pointerOutside', { cancelable: true, detail: { originalEvent: independentDown } });
	handlers.get('owner-parent')!.onPointerDownOutside(crossRoot);
	expect(crossRoot.defaultPrevented).toBe(true);
	independent.unmount();
	const foreignDocument = document.implementation.createHTMLDocument('separate owner');
	const foreignRoot = render(
		<TestProviders ownerDocument={foreignDocument}>
			<ModalLayer open>
				<Probe id="foreign-owner" />
			</ModalLayer>
		</TestProviders>,
		{ container: foreignDocument.body },
	);
	const capturedForeignDown = new PointerEvent('pointerdown', { bubbles: true });
	fireEvent(foreignRoot.getByTestId('foreign-owner'), capturedForeignDown);
	const foreignOutside = new CustomEvent('pointerOutside', {
		cancelable: true,
		detail: { originalEvent: capturedForeignDown },
	});
	handlers.get('owner-parent')!.onPointerDownOutside(foreignOutside);
	expect(foreignOutside.defaultPrevented).toBe(false);
	foreignRoot.unmount();
	// The originating child can detach before Radix delivers its deferred outside event.
	child.remove();
	const detached = outside();
	handlers.get('owner-parent')!.onPointerDownOutside(detached);
	expect(detached.defaultPrevented).toBe(true);
	parent.append(child);
	const otherDocument = document.implementation.createHTMLDocument('owner migration');
	otherDocument.body.append(parent);
	try {
		ui.rerender(view(otherDocument));
		expect(parent.ownerDocument).toBe(otherDocument);
		const migrated = outside();
		handlers.get('owner-parent')!.onPointerDownOutside(migrated);
		expect(migrated.defaultPrevented).toBe(true);
		// An uncaptured event from another Document has no authority to establish modal ancestry.
		const foreignTarget = otherDocument.createElement('button');
		otherDocument.body.append(foreignTarget);
		const foreignDown = new PointerEvent('pointerdown', { bubbles: true });
		fireEvent(foreignTarget, foreignDown);
		const foreign = new CustomEvent('pointerOutside', { cancelable: true, detail: { originalEvent: foreignDown } });
		handlers.get('owner-parent')!.onPointerDownOutside(foreign);
		expect(foreign.defaultPrevented).toBe(false);
	} finally {
		home.append(parent);
		ui.rerender(view(document));
	}
});
