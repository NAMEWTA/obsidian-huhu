import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { DetailPane } from './DetailPane';
import { Tabs, TabsList, TabsTrigger } from '../tabs';
import { TestProviders } from '../../react/test-providers';
afterEach(() => vi.restoreAllMocks());
test('detail pane uses inline aside only when main minus360 leaves640 and otherwise uses the shared Sheet', () => {
	let width = 1100;
	let resize = () => {};
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
	vi.spyOn(window, 'ResizeObserver').mockImplementation(function (callback: ResizeObserverCallback) {
		resize = () => callback([], {} as ResizeObserver);
		return { observe() {}, disconnect() {}, unobserve() {} };
	} as unknown as typeof ResizeObserver);
	const changed = vi.fn();
	render(
		<TestProviders>
			<main>
				<div data-testid="list">Retained list</div>
				<DetailPane leafWidth={1100} open onOpenChange={changed} title="Details">
					<input aria-label="Detail field" />
				</DetailPane>
			</main>
		</TestProviders>,
	);
	const list = screen.getByTestId('list');
	expect(screen.getByRole('complementary', { name: 'Details' })).toBeTruthy();
	expect(screen.queryByRole('dialog')).toBeNull();
	width = 999;
	act(() => resize());
	expect(screen.getByRole('dialog', { name: 'Details' })).toBeTruthy();
	expect(screen.getByTestId('list')).toBe(list);
});

for (const { leafWidth, mainWidth, inline, full } of [
	{ leafWidth: 620, mainWidth: 568, inline: false, full: false },
	{ leafWidth: 580, mainWidth: 528, inline: false, full: true },
	{ leafWidth: 959, mainWidth: 1100, inline: false, full: false },
	{ leafWidth: 960, mainWidth: 1000, inline: true, full: false },
	{ leafWidth: 1100, mainWidth: 999, inline: false, full: false },
]) {
	test(`leaf${leafWidth}/main${mainWidth} uses ${inline ? 'inline' : full ? 'fullwidth Sheet' : '360 Sheet'}`, () => {
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(mainWidth);
		render(
			<TestProviders>
				<main>
					<DetailPane leafWidth={leafWidth} open onOpenChange={() => {}} title="Metrics">
						<input aria-label="Metric field" />
					</DetailPane>
				</main>
			</TestProviders>,
		);
		if (inline) {
			expect(screen.getByRole('complementary', { name: 'Metrics' })).toBeTruthy();
			expect(screen.queryByRole('dialog')).toBeNull();
		} else {
			const sheet = screen.getByRole('dialog', { name: 'Metrics' });
			expect(sheet.classList.contains('w-full')).toBe(full);
			expect(sheet.classList.contains('w-[var(--hu-detail-w)]')).toBe(!full);
		}
	});
}

test('leaf-only presentation transitions retain the editor, draft, focus, selection and scroll', async () => {
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1100);
	const changed = vi.fn();
	const view = (leafWidth: number) => (
		<TestProviders>
			<main>
				<DetailPane leafWidth={leafWidth} open dirty onOpenChange={changed} title="Retained">
					<input aria-label="Retained draft" defaultValue="before" />
				</DetailPane>
			</main>
		</TestProviders>
	);
	const { rerender } = render(view(960));
	const field = screen.getByRole('textbox', { name: 'Retained draft' }) as HTMLInputElement;
	const scroll = field.closest<HTMLElement>('[data-slot="detail-pane-scroll"]')!;
	field.value = 'unsaved';
	field.focus();
	field.setSelectionRange(1, 4);
	scroll.scrollTop = 75;
	for (const width of [959, 960, 580, 960]) {
		await act(async () => {
			rerender(view(width));
		});
		expect(screen.getByRole('textbox', { name: 'Retained draft' })).toBe(field);
		expect(field.value).toBe('unsaved');
		expect(document.activeElement).toBe(field);
		expect([field.selectionStart, field.selectionEnd]).toEqual([1, 4]);
		expect(scroll.scrollTop).toBe(75);
	}
	expect(changed).not.toHaveBeenCalled();
	expect(screen.queryByRole('alertdialog')).toBeNull();
});


test('Sheet to inline transfers retained Tabs focus after the old modal trap is removed', async () => {
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1100);
	const content = (width: number) => (
		<TestProviders>
			<main>
				<DetailPane leafWidth={width} open onOpenChange={() => {}} title="Tools">
					<Tabs defaultValue="control">
						<TabsList>
							<TabsTrigger value="control">Control</TabsTrigger>
							<TabsTrigger value="inbox">Inbox</TabsTrigger>
						</TabsList>
						<input aria-label="Retained text" defaultValue="unsaved" />
					</Tabs>
				</DetailPane>
			</main>
		</TestProviders>
	);
	const ui = render(content(580));
	const tab = screen.getByRole('tab', { name: 'Control' });
	const host = tab.closest('[data-slot="detail-pane-scroll"]');
	act(() => tab.focus());
	let trapRemoved = false;
	const remove = document.removeEventListener;
	vi.spyOn(document, 'removeEventListener').mockImplementation(function (...args) {
		if (args[0] === 'focusout') trapRemoved = true;
		return remove.apply(document, args);
	});
	const unexpectedFocus: string[] = [];
	const focus = HTMLElement.prototype.focus;
	vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, ...args) {
		// Bound the old synchronous loop while recording the actual ordering violation.
		if (this.closest('[data-slot="detail-pane"]') && !trapRemoved) {
			unexpectedFocus.push(this.tagName);
			return;
		}
		return focus.apply(this, args);
	});
	await act(async () => ui.rerender(content(1100)));
	expect(screen.queryByRole('dialog')).toBeNull();
	expect(screen.getByRole('tab', { name: 'Control' })).toBe(tab);
	expect(tab.closest('[data-slot="detail-pane-scroll"]')).toBe(host);
	expect(unexpectedFocus).toEqual([]);
	expect(document.activeElement).toBe(tab);
	expect(screen.getByRole('textbox', { name: 'Retained text' })).toHaveProperty('value', 'unsaved');
});
