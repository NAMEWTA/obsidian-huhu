import type { App } from 'obsidian';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { MarkdownContent } from './MarkdownContent';

const mock = vi.hoisted(() => ({ render: vi.fn(), unload: vi.fn() }));
vi.mock('obsidian', () => ({
	Component: class { load() {} unload() { mock.unload(); } },
	MarkdownRenderer: { render: mock.render },
}));

test('late Markdown rendering is isolated and links retain the source path; each owner unloads', async () => {
	const pending: { element: HTMLElement; finish: () => void }[] = [];
	mock.render.mockImplementation((_app, _text, element) => new Promise<void>((finish) => pending.push({ element, finish })));
	mock.unload.mockClear();
	const openLinkText = vi.fn(async () => {}), app = { workspace: { openLinkText } } as unknown as App;
	const view = render(<MarkdownContent app={app} path="first.md" text="old" />);
	view.rerender(<MarkdownContent app={app} path="archives/record.md" text="new" />);
	await act(async () => {
		pending[1]!.element.innerHTML = '<strong>new</strong><a class="internal-link" data-href="Target">Target</a>';
		pending[1]!.finish();
		pending[0]!.element.textContent = 'old late content'; pending[0]!.finish();
	});
	expect(view.container.textContent).toBe('newTarget');
	fireEvent.click(view.getByText('Target'), { ctrlKey: true });
	expect(openLinkText).toHaveBeenCalledWith('Target', 'archives/record.md', true);
	view.unmount();
	expect(mock.unload).toHaveBeenCalledTimes(2);
});

test('renderer failure falls back to readable text', async () => {
	mock.render.mockRejectedValueOnce(new Error('render failed'));
	const view = render(<MarkdownContent app={{} as App} path="note.md" text="**retained**" />);
	await waitFor(() => expect(view.container.textContent).toBe('**retained**'));
	view.unmount();
});
