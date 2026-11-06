import { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { GroupImperativeHandle } from 'react-resizable-panels';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable';

afterEach(() => vi.restoreAllMocks());

function measure() {
	vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
		return this.id === 'right' ? 532 : this.hasAttribute('data-separator') ? 500 : 0;
	});
	vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
		return this.id === 'bottom' ? 232 : this.hasAttribute('data-separator') ? 200 : 0;
	});
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
		return this.hasAttribute('data-panel') ? 500 : 1000;
	});
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
		return this.hasAttribute('data-panel') ? 200 : 400;
	});
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
		const separator = this.hasAttribute('data-separator');
		const vertical = this.closest('[data-group]')?.getAttribute('style')?.includes('column');
		const left = this.id === 'right' ? 532 : separator && !vertical ? 500 : 0;
		const top = this.id === 'bottom' ? 232 : separator && vertical ? 200 : 0;
		const width = separator && !vertical ? 32 : this.hasAttribute('data-panel') ? 500 : 1032;
		const height = separator && vertical ? 32 : this.hasAttribute('data-panel') ? 200 : 432;
		return {
			x: left,
			y: top,
			top,
			left,
			right: left + width,
			bottom: top + height,
			width,
			height,
			toJSON: () => ({}),
		};
	});
}

test('v4 id-keyed layout changes through real keyboard separator and imperative groupRef', async () => {
	measure();
	const groupRef = createRef<GroupImperativeHandle>();
	const changed = vi.fn();
	render(
		<ResizablePanelGroup orientation="horizontal" groupRef={groupRef} onLayoutChanged={changed}>
			<ResizablePanel id="left" defaultSize="50%" minSize="20%">
				Left
			</ResizablePanel>
			<ResizableHandle aria-label="Resize panes" withHandle />
			<ResizablePanel id="right" defaultSize="50%" minSize="20%">
				Right
			</ResizablePanel>
		</ResizablePanelGroup>,
	);
	const separator = await screen.findByRole('separator', { name: 'Resize panes' });
	await waitFor(() => expect(groupRef.current?.getLayout()).toEqual({ left: 50, right: 50 }));
	fireEvent.keyDown(separator, { key: 'ArrowRight' });
	await waitFor(() => expect(groupRef.current!.getLayout().left).toBeGreaterThan(50));
	expect(groupRef.current!.getLayout().right).toBeLessThan(50);
	expect(changed).toHaveBeenLastCalledWith(
		expect.objectContaining({ left: expect.any(Number) }),
		expect.objectContaining({ isUserInteraction: true }),
	);
	expect(separator.getAttribute('aria-orientation')).toBe('vertical');
	fireEvent.keyDown(separator, { key: 'Home' });
	await waitFor(() => expect(groupRef.current!.getLayout().left).toBeCloseTo(20));
});

test('numeric sizes are pixels and vertical orientation exposes a horizontal separator', async () => {
	measure();
	const groupRef = createRef<GroupImperativeHandle>();
	render(
		<ResizablePanelGroup orientation="vertical" groupRef={groupRef}>
			<ResizablePanel id="top" defaultSize={100}>
				Top
			</ResizablePanel>
			<ResizableHandle aria-label="Resize vertically" />
			<ResizablePanel id="bottom">Bottom</ResizablePanel>
		</ResizablePanelGroup>,
	);
	const separator = await screen.findByRole('separator');
	await waitFor(() => expect(groupRef.current?.getLayout().top).toBeCloseTo(25));
	expect(separator.getAttribute('aria-orientation')).toBe('horizontal');
	fireEvent.keyDown(separator, { key: 'ArrowDown' });
	await waitFor(() => expect(groupRef.current!.getLayout().top).toBeGreaterThan(25));
});
