import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { act, render, waitFor, fireEvent } from '@testing-library/react';
import { expect, test } from 'vitest';
import { TestProviders } from './test-providers';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../components/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '../components/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/tooltip';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '../components/context-menu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/select';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../components/hover-card';
const layer = (doc: Document, selector: string) => Number((doc.querySelector(selector) as HTMLElement).style.zIndex);
const sheet = (children?: ReactNode, doc = document) => (
	<TestProviders ownerDocument={doc}>
		<Sheet open>
			<SheetContent>
				<SheetTitle>Owner</SheetTitle>
				<SheetDescription>Navigation</SheetDescription>
				{children}
			</SheetContent>
		</Sheet>
	</TestProviders>
);
function popup(kind: string, open: boolean) {
	switch (kind) {
		case 'dropdown-menu':
			return (
				<DropdownMenu open={open}>
					<DropdownMenuTrigger>Source</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem>Action</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		case 'popover':
			return (
				<Popover open={open}>
					<PopoverTrigger>Source</PopoverTrigger>
					<PopoverContent>Action</PopoverContent>
				</Popover>
			);
		case 'tooltip':
			return (
				<Tooltip open={open}>
					<TooltipTrigger>Source</TooltipTrigger>
					<TooltipContent>Action</TooltipContent>
				</Tooltip>
			);
		case 'context-menu':
			return (
				<ContextMenu>
					<ContextMenuTrigger>Source</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuItem>Action</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			);
		case 'hover-card':
			return (
				<HoverCard open={open}>
					<HoverCardTrigger>Source</HoverCardTrigger>
					<HoverCardContent>Action</HoverCardContent>
				</HoverCard>
			);
		default:
			return (
				<Select open={open}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="a">Action</SelectItem>
					</SelectContent>
				</Select>
			);
	}
}
async function mountIndependent(doc: Document, kind: string) {
	const host = doc.createElement('div');
	doc.body.append(host);
	const root = createRoot(host);
	let change = (value: boolean) => {};
	function Probe() {
		const [open, setOpen] = useState(false);
		change = setOpen;
		return <TestProviders ownerDocument={doc}>{popup(kind, open)}</TestProviders>;
	}
	await act(async () => root.render(<Probe />));
	return {
		host,
		root,
		open: async () => {
			await act(async () => change(true));
			if (kind === 'context-menu')
				fireEvent.contextMenu(host.querySelector('[data-slot=context-menu-trigger]')!, {
					button: 2,
					clientX: 10,
					clientY: 10,
				});
		},
		close: async () => act(async () => change(false)),
		refresh: async () => act(async () => root.render(<Probe />)),
	};
}
test('ordinary ownerless popup remains31 below an unrelated document modal', async () => {
	const p = await mountIndependent(document, 'popover');
	await p.open();
	expect(layer(document, '[data-slot=popover-content]')).toBe(31);
	const view = render(sheet());
	await waitFor(() => expect(document.querySelector('[data-slot=sheet-content]')).not.toBeNull());
	expect(layer(document, '[data-slot=popover-content]')).toBe(31);
	expect(layer(document, '[data-slot=popover-content]')).toBeLessThan(layer(document, '[data-slot=sheet-content]'));
	view.unmount();
	await act(async () => p.root.unmount());
	p.host.remove();
});
for (const kind of ['dropdown-menu', 'popover', 'tooltip', 'context-menu', 'hover-card', 'select'])
	test(`retained ${kind} root derives only its physical Sheet owner`, async () => {
		const p = await mountIndependent(document, kind);
		const view = render(
			sheet(
				<div
					ref={(node) => {
						if (node) node.append(p.host);
					}}
				/>,
			),
		);
		try {
			await p.open();
			const selector = `[data-slot=${kind}-content]`;
			await waitFor(() => expect(document.querySelector(selector)).not.toBeNull());
			expect(layer(document, selector)).toBe(41);
			expect(layer(document, selector)).toBeGreaterThan(layer(document, '[data-slot=sheet-content]'));
		} finally {
			view.unmount();
			await act(async () => p.root.unmount());
			p.host.remove();
		}
		expect(document.querySelector(`[data-slot=${kind}-content]`)).toBeNull();
	});
test('same-root Popover and nested Tooltip retain successive layers above Sheet', async () => {
	const view = render(
		sheet(
			<Popover open>
				<PopoverTrigger>Source</PopoverTrigger>
				<PopoverContent>
					<Tooltip open>
						<TooltipTrigger>Inner</TooltipTrigger>
						<TooltipContent>Label</TooltipContent>
					</Tooltip>
				</PopoverContent>
			</Popover>,
		),
	);
	await waitFor(() => expect(document.querySelector('[data-slot=tooltip-content]')).not.toBeNull());
	expect(layer(document, '[data-slot=sheet-content]')).toBe(40);
	expect(layer(document, '[data-slot=popover-content]')).toBe(41);
	expect(layer(document, '[data-slot=tooltip-content]')).toBe(42);
	view.unmount();
});
test('owner hidden/detached or Sheet closed never promotes a retained root to unrelated modal', async () => {
	const p = await mountIndependent(document, 'popover');
	const view = render(
		sheet(
			<div
				ref={(node) => {
					if (node) node.append(p.host);
				}}
			/>,
		),
	);
	await p.open();
	expect(layer(document, '[data-slot=popover-content]')).toBe(41);
	p.host.hidden = true;
	await p.close();
	await p.open();
	expect(layer(document, '[data-slot=popover-content]')).toBe(31);
	p.host.hidden = false;
	p.host.remove();
	await p.close();
	await p.open();
	expect(layer(document, '[data-slot=popover-content]')).toBe(31);
	view.unmount();
	await act(async () => p.root.unmount());
	expect(document.querySelector('[data-slot=popover-content]')).toBeNull();
});
test('a second Document owns its own modal40 and retained popup41, unrelated first-Document popup stays31', async () => {
	const iframe = document.createElement('iframe');
	document.body.append(iframe);
	const doc = iframe.contentDocument!;
	Object.defineProperty(doc.body, 'createDiv', {
		value: (options?: { cls?: string }) => {
			const n = doc.createElement('div');
			n.className = options?.cls ?? '';
			doc.body.append(n);
			return n;
		},
	});
	const first = await mountIndependent(document, 'popover'),
		second = await mountIndependent(doc, 'popover');
	await first.open();
	const main = render(sheet());
	const container = doc.createElement('div');
	doc.body.append(container);
	const other = render(
		sheet(
			<div
				ref={(node) => {
					if (node) node.append(second.host);
				}}
			/>,
			doc,
		),
		{ container, baseElement: doc.body },
	);
	try {
		await second.open();
		expect(layer(document, '[data-slot=popover-content]')).toBe(31);
		expect(layer(doc, '[data-slot=sheet-content]')).toBe(40);
		expect(layer(doc, '[data-slot=popover-content]')).toBe(41);
	} finally {
		main.unmount();
		other.unmount();
		await act(async () => {
			first.root.unmount();
			second.root.unmount();
		});
		first.host.remove();
		second.host.remove();
		iframe.remove();
	}
});

test('popup owned by the lower Sheet stays41 below an unrelated later Sheet50', async () => {
	const p = await mountIndependent(document, 'popover');
	const owner = render(
		sheet(
			<div
				ref={(node) => {
					if (node) node.append(p.host);
				}}
			/>,
		),
	);
	await p.open();
	expect(layer(document, '[data-slot=popover-content]')).toBe(41);
	const unrelated = render(sheet());
	await waitFor(() => expect(document.querySelectorAll('[data-slot=sheet-content]').length).toBe(2));
	const layers = [...document.querySelectorAll<HTMLElement>('[data-slot=sheet-content]')].map((n) =>
		Number(n.style.zIndex),
	);
	expect(layers).toEqual([40, 50]);
	expect(layer(document, '[data-slot=popover-content]')).toBe(41);
	unrelated.unmount();
	owner.unmount();
	await act(async () => p.root.unmount());
	p.host.remove();
});
