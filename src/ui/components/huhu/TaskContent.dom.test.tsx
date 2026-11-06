import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { TaskContent } from './TaskContent';

test('completed task strikes title and description while metadata remains separate', () => {
	const { rerender } = render(
		<TaskContent completed title="Read notes" description="Compare sources" metadata={<time>Today</time>} />,
	);
	expect(screen.getByText('Read notes').className).toContain('line-through');
	expect(screen.getByText('Compare sources').className).toContain('line-through');
	expect(screen.getByText('Today').closest('.line-through')).toBeNull();
	rerender(<TaskContent title="Read notes" description="Compare sources" />);
	expect(screen.getByText('Read notes').className).not.toContain('line-through');
	expect(screen.getByText('Compare sources').className).not.toContain('line-through');
});
