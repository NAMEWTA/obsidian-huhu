import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../react/test-providers';
import { PathPicker, type PathPickerItem } from './PathPicker';

const items: PathPickerItem[] = [
	{ path: 'Projects', kind: 'folder' },
	{ path: 'Projects/Notes', kind: 'folder' },
	{ path: '日志', kind: 'folder' },
	{ path: '日志/日记', kind: 'folder' },
	{ path: 'Projects/readme.md', kind: 'file' },
];

function Harness({ onChange, kind = 'folder' as const, start = '' }: { onChange: (path: string) => void; kind?: 'folder' | 'file'; start?: string }) {
	const [value, setValue] = useState(start);
	return (
		<TestProviders>
			<PathPicker
				label="Folder"
				kind={kind}
				value={value}
				items={items}
				onChange={(path) => {
					setValue(path);
					onChange(path);
				}}
			/>
		</TestProviders>
	);
}
const field = () => screen.getByRole<HTMLInputElement>('combobox', { name: 'Folder' });

test('typing fuzzy-matches vault folders, highlights the match and Enter picks the highlighted suggestion', async () => {
	const onChange = vi.fn();
	const user = userEvent.setup();
	render(<Harness onChange={onChange} />);
	await user.click(field());
	await user.type(field(), 'pn');
	const options = await screen.findAllByRole('option');
	expect(options[0]!.textContent).toContain('Projects/Notes');
	// Files are not offered for a folder field.
	expect(options.some((option) => option.textContent?.includes('readme'))).toBe(false);
	expect(options[0]!.querySelector('.font-semibold')).toBeTruthy();
	await user.keyboard('{Enter}');
	expect(onChange).toHaveBeenCalledWith('Projects/Notes');
	expect(field().value).toBe('Projects/Notes');
});

test('arrow keys move the highlight, Chinese names match, and a click picks a row', async () => {
	const onChange = vi.fn();
	const user = userEvent.setup();
	render(<Harness onChange={onChange} />);
	await user.click(field());
	await user.type(field(), '日');
	const options = await screen.findAllByRole('option');
	// The typed text is always offered last as a new folder.
	expect(options.map((option) => option.textContent?.slice(0, 5))).toEqual(['日志', '日志/日记', '新建“日”']);
	await user.keyboard('{ArrowDown}');
	expect(screen.getAllByRole('option')[1]!.getAttribute('aria-selected')).toBe('true');
	await user.click(screen.getAllByRole('option')[1]!);
	expect(onChange).toHaveBeenCalledWith('日志/日记');
});

test('a hand-typed path is read from the vault root, and an unknown folder is offered as new', async () => {
	const onChange = vi.fn();
	const user = userEvent.setup();
	render(<Harness onChange={onChange} />);
	await user.click(field());
	await user.type(field(), '/./Archive//2026/');
	const create = await screen.findByRole('option', { name: /Archive\/2026/ });
	expect(create.textContent).toContain('Archive/2026');
	await user.keyboard('{ArrowDown}{Enter}');
	await waitFor(() => expect(onChange).toHaveBeenCalledWith('Archive/2026'));
});

test('traversal is refused with a message and never reaches the caller; blur restores the last good value', async () => {
	const onChange = vi.fn();
	const user = userEvent.setup();
	render(<Harness onChange={onChange} start="Projects" />);
	await user.click(field());
	await user.clear(field());
	await user.type(field(), '../outside');
	expect(await screen.findByRole('alert')).toBeTruthy();
	expect(field().getAttribute('aria-invalid')).toBe('true');
	await user.keyboard('{Enter}');
	expect(onChange).not.toHaveBeenCalled();
	await user.tab();
	expect(field().value).toBe('Projects');
	expect(onChange).not.toHaveBeenCalled();
});

test('a file field only accepts files that exist', async () => {
	const onChange = vi.fn();
	const user = userEvent.setup();
	render(<Harness onChange={onChange} kind="file" start="Projects/readme.md" />);
	await user.click(field());
	await user.clear(field());
	await user.type(field(), 'nothing.md');
	await user.keyboard('{Enter}');
	expect(onChange).not.toHaveBeenCalled();
	await user.tab();
	expect(field().value).toBe('Projects/readme.md');
});
