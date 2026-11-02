import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { AutoTextarea } from './AutoTextarea';

test('loaded, pasted and shortened notes resize without an internal scrollbar', () => {
	const height = vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLTextAreaElement) { return 24 + this.value.split('\n').length * 20; });
	try {
		const onChange = vi.fn();
		const view = render(<TestProviders><AutoTextarea aria-label="Notes" value={'one\ntwo\nthree'} onChange={onChange} /></TestProviders>);
		const field = screen.getByLabelText('Notes');
		const tall = Number.parseFloat(field.style.height);
		expect(tall).toBeGreaterThanOrEqual(84);
		expect(field.style.overflowY).toBe('hidden');
		view.rerender(<TestProviders><AutoTextarea aria-label="Notes" value="short" onChange={onChange} /></TestProviders>);
		expect(Number.parseFloat(field.style.height)).toBeLessThan(tall);
		fireEvent.change(field, { target: { value: 'paste\nmore' } });
		expect(onChange).toHaveBeenCalledTimes(1);
	} finally { height.mockRestore(); }
});
