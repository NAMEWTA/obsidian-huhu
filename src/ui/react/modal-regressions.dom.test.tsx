import { createRef, StrictMode, useEffect, useState, type Ref } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogClose } from '../components/dialog';
import { Sheet, SheetContent, SheetTitle, SheetClose } from '../components/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogCancel } from '../components/alert-dialog';
import { DetailPane } from '../components/huhu/DetailPane';
import { restoreFocus } from './modal-layer';
import { TestProviders } from './test-providers';
afterEach(() => vi.restoreAllMocks());
const contents = [
	{
		name: 'Dialog',
		render: (ref: Ref<HTMLDivElement>) => (
			<Dialog defaultOpen>
				<DialogContent ref={ref} aria-describedby={undefined}>
					<DialogTitle>Ref</DialogTitle>
				</DialogContent>
			</Dialog>
		),
	},
	{
		name: 'Sheet',
		render: (ref: Ref<HTMLDivElement>) => (
			<Sheet defaultOpen>
				<SheetContent ref={ref} aria-describedby={undefined}>
					<SheetTitle>Ref</SheetTitle>
				</SheetContent>
			</Sheet>
		),
	},
	{
		name: 'AlertDialog',
		render: (ref: Ref<HTMLDivElement>) => (
			<AlertDialog defaultOpen>
				<AlertDialogContent ref={ref} aria-describedby={undefined}>
					<AlertDialogTitle>Ref</AlertDialogTitle>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
				</AlertDialogContent>
			</AlertDialog>
		),
	},
];
for (const content of contents) {
	test(`${content.name} composes React19 callback cleanup once per attachment including StrictMode`, () => {
		const cleanup = vi.fn();
		const callback = vi.fn((node: HTMLDivElement | null) => {
			if (node) return cleanup;
			return undefined;
		});
		const view = render(
			<StrictMode>
				<TestProviders>{content.render(callback)}</TestProviders>
			</StrictMode>,
		);
		view.unmount();
		expect(cleanup.mock.calls.length).toBe(callback.mock.calls.filter(([node]) => node !== null).length);
		expect(cleanup).toHaveBeenCalled();
		expect(callback.mock.calls.some(([node]) => node === null)).toBe(false);
	});
	test(`${content.name} keeps traditional callback and object refs attached then clears them`, () => {
		const object = createRef<HTMLDivElement>();
		let view = render(<TestProviders>{content.render(object)}</TestProviders>);
		expect(object.current?.isConnected).toBe(true);
		view.unmount();
		expect(object.current).toBe(null);
		const callback = vi.fn();
		view = render(<TestProviders>{content.render(callback)}</TestProviders>);
		view.unmount();
		expect(callback.mock.calls.at(-1)?.[0]).toBe(null);
	});
}
test('F6 skips hidden, inert, aria-hidden, CSS-hidden and disabled ancestors', async () => {
	const user = userEvent.setup();
	render(
		<TestProviders>
			<Dialog defaultOpen>
				<DialogContent aria-describedby={undefined}>
					<DialogTitle>Visibility</DialogTitle>
					<button>First</button>
					<div hidden>
						<button>Hidden</button>
					</div>
					<div inert>
						<button>Inert</button>
					</div>
					<div aria-hidden="true">
						<button>ARIA hidden</button>
					</div>
					<div style={{ display: 'none' }}>
						<button>CSS hidden</button>
					</div>
					<fieldset disabled>
						<button>Disabled group</button>
					</fieldset>
					<button>Next</button>
				</DialogContent>
			</Dialog>
		</TestProviders>,
	);
	screen.getByRole('button', { name: 'First' }).focus();
	await user.keyboard('{F6}');
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next' }));
	await user.keyboard('{Shift>}{F6}{/Shift}');
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));
});
test('removed or hidden source falls back past hidden candidates in its original region', async () => {
	function Probe() {
		const [show, setShow] = useState(true);
		return (
			<Dialog>
				<div hidden>
					<button>Hidden fallback</button>
				</div>
				<button>Visible fallback</button>
				{show && (
					<DialogTrigger asChild>
						<button onClick={() => setShow(false)}>Remove source</button>
					</DialogTrigger>
				)}
				<DialogContent aria-describedby={undefined}>
					<DialogTitle>Fallback</DialogTitle>
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
	await user.click(screen.getByRole('button', { name: 'Remove source' }));
	await user.keyboard('{Escape}');
	await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Visible fallback' })));
});
test('F6 with no available controls retains focus on the modal region', async () => {
	render(
		<TestProviders>
			<Dialog defaultOpen>
				<DialogContent aria-describedby={undefined} showCloseButton={false}>
					<DialogTitle>Region</DialogTitle>
					<div hidden>
						<button>Hidden</button>
					</div>
				</DialogContent>
			</Dialog>
		</TestProviders>,
	);
	const dialog = screen.getByRole('dialog');
	dialog.focus();
	fireEvent.keyDown(dialog, { key: 'F6' });
	expect(document.activeElement).toBe(dialog);
});
test('DetailPane retains the same child instance, local draft, input selection and scroll through1100↔999', async () => {
	let width = 1100;
	let resize = () => {};
	const mounted = vi.fn();
	const unmounted = vi.fn();
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
	vi.spyOn(window, 'ResizeObserver').mockImplementation(function (callback: ResizeObserverCallback) {
		resize = () => callback([], {} as ResizeObserver);
		return { observe() {}, disconnect() {}, unobserve() {} };
	} as unknown as typeof ResizeObserver);
	function Editor() {
		const [draft, setDraft] = useState('before');
		useEffect(() => {
			mounted();
			return () => {
				unmounted();
			};
		}, []);
		return (
			<>
				<input
					aria-label="Local draft"
					value={draft}
					onChange={(event) => setDraft(event.currentTarget.value)}
				/>
				<input aria-label="Uncontrolled" defaultValue="before" />
				<div style={{ height: 2000 }}>Scroll content</div>
			</>
		);
	}
	function Probe() {
		const [open, setOpen] = useState(true);
		return (
			<main>
				<div data-testid="list">List</div>
				<DetailPane leafWidth={1100} open={open} dirty onOpenChange={setOpen} title="Details">
					<Editor />
				</DetailPane>
			</main>
		);
	}
	const user = userEvent.setup();
	render(
		<TestProviders>
			<Probe />
		</TestProviders>,
	);
	expect(screen.getByRole('complementary', { name: 'Details' })).toBeTruthy();
	const input = screen.getByRole('textbox', { name: 'Local draft' }) as HTMLInputElement;
	fireEvent.change(input, { target: { value: 'unsaved' } });
	input.focus();
	input.setSelectionRange(1, 4);
	const uncontrolled = screen.getByRole('textbox', { name: 'Uncontrolled' }) as HTMLInputElement;
	fireEvent.change(uncontrolled, { target: { value: 'uncontrolled unsaved' } });
	const list = screen.getByTestId('list');
	const scroll = input.closest<HTMLElement>('[data-slot="detail-pane-scroll"]') ?? input.parentElement!;
	scroll.scrollTop = 73;
	width = 999;
	act(() => resize());
	expect(screen.getByRole('dialog', { name: 'Details' })).toBeTruthy();
	expect(screen.getByRole('textbox', { name: 'Local draft' })).toBe(input);
	expect(input.value).toBe('unsaved');
	expect(uncontrolled.value).toBe('uncontrolled unsaved');
	expect(input.selectionStart).toBe(1);
	expect(input.selectionEnd).toBe(4);
	expect(scroll.scrollTop).toBe(73);
	expect(screen.getByTestId('list')).toBe(list);
	width = 1100;
	act(() => resize());
	expect(screen.getByRole('textbox', { name: 'Local draft' })).toBe(input);
	expect(mounted).toHaveBeenCalledOnce();
	expect(unmounted).not.toHaveBeenCalled();
	expect(scroll.scrollTop).toBe(73);
	await user.click(screen.getByRole('button', { name: '关闭' }));
	expect(await screen.findByRole('alertdialog')).toBeTruthy();
	await user.click(screen.getByRole('button', { name: '继续编辑' }));
	expect(input.value).toBe('unsaved');
	await user.click(screen.getByRole('button', { name: '关闭' }));
	await user.click(screen.getByRole('button', { name: '放弃修改' }));
	await waitFor(() => expect(unmounted).toHaveBeenCalledOnce());
});
test('a connected opener that becomes hidden is skipped during restore', async () => {
	function Probe() {
		const [hide, setHide] = useState(false);
		return (
			<Dialog>
				<button>Visible target</button>
				<DialogTrigger asChild>
					<button hidden={hide} onClick={() => setHide(true)}>
						Hide source
					</button>
				</DialogTrigger>
				<DialogContent aria-describedby={undefined}>
					<DialogTitle>Hidden source</DialogTitle>
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
	await user.click(screen.getByRole('button', { name: 'Hide source' }));
	await user.keyboard('{Escape}');
	await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Visible target' })));
});
test('removed opener with no available controls restores the surviving region itself', async () => {
	function Probe() {
		const [show, setShow] = useState(true);
		return (
			<div className="huhu-ui" data-testid="empty-region">
				<Dialog>
					<div hidden>
						<button>Unavailable</button>
					</div>
					{show && (
						<DialogTrigger asChild>
							<button onClick={() => setShow(false)}>Remove last</button>
						</DialogTrigger>
					)}
					<DialogContent aria-describedby={undefined}>
						<DialogTitle>Region return</DialogTitle>
					</DialogContent>
				</Dialog>
			</div>
		);
	}
	const user = userEvent.setup();
	render(
		<TestProviders>
			<Probe />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Remove last' }));
	await user.keyboard('{Escape}');
	await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('empty-region')));
});

// Real FocusScope close events cover deferred restoration, not only the first focus transition.
test('cancelling discard after Sheet reparented to inline restores focus inside surviving details', async () => {
	let width = 999;
	let resize = () => {};
	const size = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
	const observer = vi.spyOn(window, 'ResizeObserver').mockImplementation(function (callback: ResizeObserverCallback) {
		resize = () => callback([], {} as ResizeObserver);
		return { observe() {}, disconnect() {}, unobserve() {} };
	} as unknown as typeof ResizeObserver);
	const style = document.createElement('style');
	style.textContent = '.huhu-portal-root{display:contents}';
	document.head.append(style);
	function Probe() {
		const [open, setOpen] = useState(true);
		return (
			<main>
				<DetailPane leafWidth={1100} open={open} dirty title="Details" onOpenChange={setOpen}>
					<input aria-label="Draft kept" defaultValue="unsaved" />
				</DetailPane>
			</main>
		);
	}
	try {
		render(
			<TestProviders>
				<button>Other owner first</button>
			</TestProviders>,
		);
		const user = userEvent.setup();
		const view = render(
			<TestProviders>
				<Probe />
			</TestProviders>,
		);
		expect(screen.getByRole('dialog', { name: 'Details' })).toBeTruthy();
		await user.click(screen.getByRole('button', { name: '关闭' }));
		expect(screen.getByRole('alertdialog')).toBeTruthy();
		width = 1100;
		act(() => resize());
		expect(document.querySelector('[data-slot="detail-pane"]')).not.toBeNull();
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
		await waitFor(() =>
			expect(
				document.querySelector('[data-slot="detail-pane"]')?.contains(document.activeElement),
				document.activeElement?.outerHTML,
			).toBe(true),
		);
		view.unmount();
	} finally {
		style.remove();
		size.mockRestore();
		observer.mockRestore();
	}
});

test('an empty display-contents preferred Portal cannot suppress a surviving HUHU-region fallback', () => {
	const view = render(
		<TestProviders>
			<button>Usable fallback</button>
		</TestProviders>,
	);
	const expected = screen.getByRole('button', { name: 'Usable fallback' });
	const portal = document.querySelector<HTMLElement>('.huhu-portal-root')!;
	portal.style.display = 'contents';
	restoreFocus(document, null, portal);
	const fromPortal = document.activeElement;
	restoreFocus(document, null, expected.closest<HTMLElement>('.huhu-ui'));
	expect(document.activeElement).toBe(expected);
	expect(fromPortal).toBe(expected);
	view.unmount();
});

test.each([580, 1100])('real dirty close at leaf%d disposes editor once and restores its opener', async (leaf) => {
	const size = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1100);
	const unmount = vi.fn();
	const discard = vi.fn();
	function Editor() {
		useEffect(
			() => () => {
				unmount();
			},
			[],
		);
		return <input aria-label="Lifetime draft" defaultValue="before" />;
	}
	function Probe() {
		const [open, setOpen] = useState(false);
		return (
			<main>
				<button onClick={() => setOpen(true)}>Open pane</button>
				<DetailPane
					leafWidth={leaf}
					open={open}
					dirty
					onDiscard={discard}
					title="Lifetime"
					onOpenChange={setOpen}
				>
					<Editor />
				</DetailPane>
			</main>
		);
	}
	try {
		const user = userEvent.setup();
		const view = render(
			<TestProviders>
				<Probe />
			</TestProviders>,
		);
		const opener = screen.getByRole('button', { name: 'Open pane' });
		await user.click(opener);
		expect(
			leaf === 580
				? screen.getByRole('dialog', { name: 'Lifetime' })
				: screen.getByRole('complementary', { name: 'Lifetime' }),
		).toBeTruthy();
		await user.click(screen.getByRole('button', { name: '关闭' }));
		await user.click(screen.getByRole('button', { name: '放弃修改' }));
		await waitFor(() => expect(unmount).toHaveBeenCalledOnce());
		expect(discard).toHaveBeenCalledOnce();
		await waitFor(() => expect(document.activeElement).toBe(opener));
		view.unmount();
		expect(unmount).toHaveBeenCalledOnce();
	} finally {
		size.mockRestore();
	}
});

function closedFocusScope(node: HTMLElement) {
	return new Promise<void>((resolve) =>
		node.addEventListener('focusScope.autoFocusOnUnmount', () => queueMicrotask(() => queueMicrotask(resolve)), {
			once: true,
		}),
	);
}
test.each([580, 1100])(
	'settled dirty-discard at leaf%d must not overwrite opener with an unrelated first control',
	async (leaf) => {
		const size = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1100);
		function Probe() {
			const [open, setOpen] = useState(false);
			return (
				<main>
					<button>Unrelated first control</button>
					<button onClick={() => setOpen(true)}>Distinct opener</button>
					<DetailPane leafWidth={leaf} open={open} dirty title="Settled" onOpenChange={setOpen}>
						<input aria-label="Settled draft" />
					</DetailPane>
				</main>
			);
		}
		try {
			const user = userEvent.setup();
			const view = render(
				<TestProviders>
					<Probe />
				</TestProviders>,
			);
			const opener = screen.getByRole('button', { name: 'Distinct opener' });
			await user.click(opener);
			await user.click(screen.getByRole('button', { name: '关闭' }));
			const done = closedFocusScope(screen.getByRole('alertdialog'));
			await user.click(screen.getByRole('button', { name: '放弃修改' }));
			await done;
			expect(document.activeElement).toBe(opener);
			view.unmount();
		} finally {
			size.mockRestore();
		}
	},
);
test.each([false, true])(
	'real root close lifecycle wholeRootRemoved=%s respects surviving ownership',
	async (wholeRootRemoved) => {
		const style = document.createElement('style');
		style.textContent = '.huhu-portal-root{display:contents}';
		document.head.append(style);
		function Probe() {
			const [show, setShow] = useState(true);
			return (
				<Dialog>
					<button>Own visible fallback</button>
					{show && (
						<DialogTrigger asChild>
							<button onClick={() => setShow(false)}>Real root opener</button>
						</DialogTrigger>
					)}
					<DialogContent aria-describedby={undefined}>
						<DialogTitle>Root to remove</DialogTitle>
						<input aria-label="Removed root input" />
					</DialogContent>
				</Dialog>
			);
		}
		const owning = render(
			<TestProviders>
				<Probe />
			</TestProviders>,
		);
		const other = render(
			<TestProviders>
				<button>Other first</button>
				<button>Already focused</button>
			</TestProviders>,
		);
		const user = userEvent.setup();
		await user.click(screen.getByRole('button', { name: 'Real root opener' }));
		const content = screen.getByRole('dialog', { name: 'Root to remove' });
		const done = closedFocusScope(content);
		if (wholeRootRemoved) {
			owning.unmount();
			const focused = screen.getByRole('button', { name: 'Already focused' });
			focused.focus();
			expect(document.activeElement).toBe(focused);
			await done;
			expect(document.activeElement).toBe(focused);
		} else {
			await user.keyboard('{Escape}');
			await done;
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Own visible fallback' }));
			owning.unmount();
		}
		other.unmount();
		style.remove();
	},
);

test('conditional Dialog component unmount still restores its opener in a live owner region', async () => {
	function Probe() {
		const [open, setOpen] = useState(false);
		return (
			<>
				<button>Unrelated first</button>
				<button onClick={() => setOpen(true)}>Conditional opener</button>
				{open && (
					<Dialog open onOpenChange={setOpen}>
						<DialogContent aria-describedby={undefined}>
							<DialogTitle>Conditional</DialogTitle>
						</DialogContent>
					</Dialog>
				)}
			</>
		);
	}
	const user = userEvent.setup();
	render(
		<TestProviders>
			<Probe />
		</TestProviders>,
	);
	const opener = screen.getByRole('button', { name: 'Conditional opener' });
	await user.click(opener);
	const done = closedFocusScope(screen.getByRole('dialog'));
	await user.keyboard('{Escape}');
	await done;
	expect(document.activeElement).toBe(opener);
});

describe('exact nested source with production Portal CSS', () => {
	let style: HTMLStyleElement;
	beforeEach(() => {
		style = document.createElement('style');
		style.textContent = '.huhu-portal-root{display:contents}';
		document.head.append(style);
	});
	afterEach(() => style.remove());
	function closed(node: HTMLElement) {
		return new Promise<void>((resolve) =>
			node.addEventListener(
				'focusScope.autoFocusOnUnmount',
				() => queueMicrotask(() => queueMicrotask(resolve)),
				{ once: true },
			),
		);
	}
	for (const kind of ['Dialog', 'Sheet'] as const) {
		test.each(['keep', 'escape'])(
			`${kind} dirty confirmation %s restores the exact still-visible request source after real exit`,
			async (how) => {
				const Root = kind === 'Dialog' ? Dialog : Sheet;
				const Content = kind === 'Dialog' ? DialogContent : SheetContent;
				const Title = kind === 'Dialog' ? DialogTitle : SheetTitle;
				const Close = kind === 'Dialog' ? DialogClose : SheetClose;
				const view = render(
					<TestProviders>
						<Root defaultOpen dirty>
							<Content aria-describedby={undefined}>
								<Title>Parent survives</Title>
								<input aria-label="Unrelated first field" />
								<Close asChild>
									<button>Exact dirty source</button>
								</Close>
							</Content>
						</Root>
					</TestProviders>,
				);
				const user = userEvent.setup();
				const source = screen.getByRole('button', { name: 'Exact dirty source' });
				await user.click(source);
				const alert = screen.getByRole('alertdialog');
				const done = closed(alert);
				if (how === 'keep') await user.click(screen.getByRole('button', { name: '继续编辑' }));
				else await user.keyboard('{Escape}');
				await done;
				expect(screen.getByRole('dialog', { name: 'Parent survives' })).toBeTruthy();
				expect(source.isConnected).toBe(true);
				expect(source.closest('[aria-hidden="true"]')).toBe(null);
				const settled = document.activeElement;
				restoreFocus(document, source, null);
				expect(document.activeElement).toBe(source);
				expect(settled, settled?.tagName).toBe(source);
				view.unmount();
			},
		);
	}
	test('ordinary nested Dialog close restores its exact trigger while parent remains open', async () => {
		const view = render(
			<TestProviders>
				<Dialog defaultOpen>
					<DialogContent aria-describedby={undefined}>
						<DialogTitle>Outer</DialogTitle>
						<input aria-label="Outer first" />
						<Dialog>
							<DialogTrigger asChild>
								<button>Exact nested source</button>
							</DialogTrigger>
							<DialogContent aria-describedby={undefined}>
								<DialogTitle>Child</DialogTitle>
								<button>Child first</button>
							</DialogContent>
						</Dialog>
					</DialogContent>
				</Dialog>
			</TestProviders>,
		);
		const user = userEvent.setup();
		const source = screen.getByRole('button', { name: 'Exact nested source' });
		await user.click(source);
		const done = closed(screen.getByRole('dialog', { name: 'Child' }));
		await user.keyboard('{Escape}');
		await done;
		expect(screen.getByRole('dialog', { name: 'Outer' })).toBeTruthy();
		const settled = document.activeElement;
		restoreFocus(document, source, null);
		expect(document.activeElement).toBe(source);
		expect(settled, settled?.tagName).toBe(source);
		view.unmount();
	});
});

test.each(['restore', 'owner-unmount', 'new-focus', 'new-modal', 'adopted-owner'] as const)(
	'actual parent close with a still-exiting confirmation respects %s',
	async (mode) => {
		const style = document.createElement('style');
		style.textContent =
			'.huhu-portal-root{display:contents}[data-slot="alert-dialog-content"][data-state="closed"]{animation-name:confirmation-exit;animation-duration:1s}';
		document.head.append(style);
		// Dirty is supplied on the real root; CSS keeps the child Presence mounted until its real animationend.
		function DirtyProbe() {
			return (
				<Dialog dirty>
					<button>Other first</button>
					<DialogTrigger asChild>
						<button>Parent source after child exit</button>
					</DialogTrigger>
					<DialogContent aria-describedby={undefined}>
						<DialogTitle>Deferred parent</DialogTitle>
						<DialogClose asChild>
							<button>Request close</button>
						</DialogClose>
					</DialogContent>
				</Dialog>
			);
		}
		let adoptedFrame: HTMLIFrameElement | undefined;
		let unmountAdopted: (() => void) | undefined;
		const user = userEvent.setup();
		try {
			const owning = render(
				<TestProviders>
					<DirtyProbe />
				</TestProviders>,
			);
			unmountAdopted = owning.unmount;
			const source = screen.getByRole('button', { name: 'Parent source after child exit' });
			await user.click(source);
			const parent = screen.getByRole('dialog');
			await user.click(screen.getByRole('button', { name: 'Request close' }));
			const confirmation = screen.getByRole('alertdialog');
			const parentClosed = closedFocusScope(parent);
			await user.click(screen.getByRole('button', { name: '放弃修改' }));
			await parentClosed;
			expect(confirmation.isConnected).toBe(true);
			expect(source.closest('[aria-hidden="true"]')).not.toBeNull();
			const childClosed = closedFocusScope(confirmation);
			let expected: HTMLElement = source;
			if (mode === 'owner-unmount' || mode === 'new-focus') {
				render(
					<TestProviders>
						<button>New owner intention</button>
					</TestProviders>,
				);
				expected = screen.getByRole('button', { name: 'New owner intention' });
				if (mode === 'owner-unmount') owning.unmount();
				expected.focus();
			} else if (mode === 'adopted-owner') {
				adoptedFrame = document.createElement('iframe');
				document.body.append(adoptedFrame);
				adoptedFrame.contentDocument!.body.append(owning.container);
				expected = document.body;
			} else if (mode === 'new-modal') {
				render(
					<TestProviders>
						<Dialog defaultOpen>
							<DialogContent aria-describedby={undefined}>
								<DialogTitle>New modal intention</DialogTitle>
								<input aria-label="New modal field" />
							</DialogContent>
						</Dialog>
					</TestProviders>,
				);
				expected = screen.getByRole('textbox', { name: 'New modal field' });
			}
			if (mode !== 'owner-unmount') {
				const event = new Event('animationend', { bubbles: true });
				Object.defineProperty(event, 'animationName', { value: 'confirmation-exit' });
				fireEvent(confirmation, event);
			}
			await childClosed;
			if (mode === 'restore') expect(source.closest('[aria-hidden="true"]')).toBeNull();
			expect(document.activeElement).toBe(expected);
			if (adoptedFrame)
				expect(adoptedFrame.contentDocument!.activeElement).toBe(adoptedFrame.contentDocument!.body);
		} finally {
			if (adoptedFrame) {
				unmountAdopted?.();
				adoptedFrame.remove();
			}
			style.remove();
		}
	},
);
