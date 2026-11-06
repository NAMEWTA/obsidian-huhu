import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type React from 'react';
import { createRef, forwardRef } from 'react';
import userEvent from '@testing-library/user-event';
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

test('busy buttons expose progress, block duplicate actions and preserve an explicit button type', async () => {
	const user = userEvent.setup();
	const action = vi.fn();
	const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
	const { rerender } = render(
		<form onSubmit={submit}>
			<Button type="button" busy onClick={action}>
				Save
			</Button>
		</form>,
	);
	const button = screen.getByRole('button', { name: 'Save' });
	expect(button.getAttribute('aria-busy')).toBe('true');
	expect((button as HTMLButtonElement).disabled).toBe(true);
	await user.click(button);
	expect(action).not.toHaveBeenCalled();
	rerender(
		<form onSubmit={submit}>
			<Button type="button" onClick={action}>
				Save
			</Button>
		</form>,
	);
	await user.click(button);
	expect(action).toHaveBeenCalledOnce();
	expect(submit).not.toHaveBeenCalled();
});

test('busy slotted links cannot invoke either the child action or the wrapper action', async () => {
	const user = userEvent.setup();
	const child = vi.fn();
	const parent = vi.fn();
	render(
		<Button asChild busy onClick={parent}>
			<a href="#next" onClick={child}>
				Continue
			</a>
		</Button>,
	);
	const link = screen.getByRole('link', { name: 'Continue' });
	expect(link.getAttribute('aria-disabled')).toBe('true');
	await user.click(link);
	expect(child).not.toHaveBeenCalled();
	expect(parent).not.toHaveBeenCalled();
});

test('busy slotted native buttons retain a real disabled state', () => {
	render(
		<Button asChild busy>
			<button>Save</button>
		</Button>,
	);
	expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
});

test('slotted buttons receive the wrapper type and preserve an explicit child type', async () => {
	const user = userEvent.setup();
	const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
	render(
		<form onSubmit={submit}>
			<Button asChild type="button">
				<button>Cancel</button>
			</Button>
			<Button asChild type="submit">
				<button>Save</button>
			</Button>
			<Button asChild type="button">
				<button type="submit">Child submit</button>
			</Button>
		</form>,
	);
	await user.click(screen.getByRole('button', { name: 'Cancel' }));
	expect(submit).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Save' }));
	expect(submit).toHaveBeenCalledTimes(1);
	await user.click(screen.getByRole('button', { name: 'Child submit' }));
	expect(submit).toHaveBeenCalledTimes(2);
});

const ForwardedButton = forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>((props, ref) => (
	<button {...props} ref={ref} />
));
ForwardedButton.displayName = 'ForwardedButton';

test.each(['disabled', 'busy'] as const)(
	'slotted forwarding buttons preserve native %s and leave keyboard focus outside',
	async (state) => {
		const user = userEvent.setup();
		const action = vi.fn();
		const ref = createRef<HTMLButtonElement>();
		render(
			<>
				<button>Before</button>
				<Button asChild ref={ref} disabled={state === 'disabled'} busy={state === 'busy'} onClick={action}>
					<ForwardedButton disabled={false} onClick={action}>
						Save
					</ForwardedButton>
				</Button>
				<button>After</button>
			</>,
		);
		const control = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
		expect(ref.current).toBe(control);
		expect(control.disabled).toBe(true);
		await user.click(screen.getByRole('button', { name: 'Before' }));
		control.focus();
		expect(control.ownerDocument.activeElement).toBe(screen.getByRole('button', { name: 'Before' }));
		await user.tab();
		expect(control.ownerDocument.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
		await user.click(control);
		expect(action).not.toHaveBeenCalled();
	},
);

test('slotted busy content retains its name, ref and restored child events while showing progress', async () => {
	const user = userEvent.setup();
	const childAction = vi.fn();
	const parentAction = vi.fn();
	const ref = createRef<HTMLButtonElement>();
	const element = (busy: boolean) => (
		<Button asChild busy={busy} ref={ref} onClick={parentAction}>
			<ForwardedButton onClick={childAction}>Continue</ForwardedButton>
		</Button>
	);
	const { rerender } = render(element(true));
	const button = screen.getByRole('button', { name: 'Continue' });
	const spinner = button.querySelector('svg.animate-spin');
	expect(spinner).not.toBeNull();
	expect(spinner?.getAttribute('aria-hidden')).toBe('true');
	expect(spinner?.getAttribute('class')).toContain('motion-reduce:animate-none');
	expect(ref.current).toBe(button);
	await user.click(button);
	expect(childAction).not.toHaveBeenCalled();
	expect(parentAction).not.toHaveBeenCalled();
	rerender(element(false));
	expect(screen.getByRole('button', { name: 'Continue' })).toBe(button);
	expect(ref.current).toBe(button);
	expect(button.querySelector('svg.animate-spin')).toBeNull();
	await user.click(button);
	expect(childAction).toHaveBeenCalledOnce();
	expect(parentAction).toHaveBeenCalledOnce();
});
