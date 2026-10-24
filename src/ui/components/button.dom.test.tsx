import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Button } from './button';

const Icon = () => <svg data-testid="icon" width="16" height="16" />;

test('bare text becomes one ellipsising label and the button is capped at its container', () => {
	render(<Button>Create automation</Button>);
	const button = screen.getByRole('button');
	const label = button.firstElementChild as HTMLElement;
	expect(label.tagName).toBe('SPAN');
	expect(label.textContent).toBe('Create automation');
	expect(label.className).toContain('min-w-0');
	expect(label.className).toContain('overflow-hidden');
	expect(label.className).toContain('text-ellipsis');
	expect(button.children).toHaveLength(1);
	expect(button.className).toContain('max-w-full');
	expect(button.className).toContain('min-w-0');
});

test('consecutive text and numbers share one label next to an icon', () => {
	render(
		<Button>
			<Icon />
			Unresolved {3}
		</Button>,
	);
	const button = screen.getByRole('button', { name: 'Unresolved 3' });
	expect(button.children).toHaveLength(2);
	expect(screen.getByTestId('icon').parentElement).toBe(button);
	expect((button.lastElementChild as HTMLElement).textContent).toBe('Unresolved 3');
});

test('a button without text keeps its exact box and its children', () => {
	render(
		<Button size="icon-sm" aria-label="More">
			<Icon />
		</Button>,
	);
	const button = screen.getByRole('button', { name: 'More' });
	expect(button.firstElementChild).toBe(screen.getByTestId('icon'));
	expect(button.className).not.toContain('max-w-full');
	expect(button.className).toContain('shrink-0');
});

test('element labels are left alone', () => {
	render(
		<Button>
			<span className="truncate">Own label</span>
		</Button>,
	);
	const button = screen.getByRole('button');
	expect(button.children).toHaveLength(1);
	expect((button.firstElementChild as HTMLElement).className).toBe('truncate');
	expect(button.className).not.toContain('max-w-full');
});

test('a slotted element keeps its own children', () => {
	render(
		<Button asChild>
			<a href="https://example.com">Docs</a>
		</Button>,
	);
	const link = screen.getByRole('link', { name: 'Docs' });
	expect(link.children).toHaveLength(0);
	expect(link.textContent).toBe('Docs');
});

test('a wrapping button still wraps: the label inherits white-space from the button', () => {
	render(<Button className="h-auto whitespace-normal">A long label that may wrap</Button>);
	const label = screen.getByRole('button').firstElementChild as HTMLElement;
	expect(screen.getByRole('button').className).toContain('whitespace-normal');
	expect(label.className).not.toContain('whitespace-nowrap');
	expect(label.className).not.toContain('truncate');
});

test('empty and whitespace-only text adds no label', () => {
	render(
		<Button aria-label="Close">
			{' '}
			<Icon />
		</Button>,
	);
	const button = screen.getByRole('button', { name: 'Close' });
	expect(button.children).toHaveLength(1);
});
