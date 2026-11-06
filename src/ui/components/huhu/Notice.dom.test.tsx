import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Notice } from './Notice';
import { Button } from '../button';

test('failure notices announce a labelled error and retain the recovery action', () => {
	render(
		<Notice tone="error" title="Save failed" action={<Button>Retry</Button>}>
			Your draft is retained.
		</Notice>,
	);
	const notice = screen.getByRole('alert');
	expect(notice.getAttribute('aria-labelledby')).toBeTruthy();
	expect(notice.ownerDocument.getElementById(notice.getAttribute('aria-labelledby')!)?.textContent).toBe(
		'Save failed',
	);
	expect(notice.textContent).toContain('Your draft is retained.');
	expect(screen.getByRole('button', { name: 'Retry' }).closest('[role=alert]')).toBe(notice);
});

test('informational notices announce without interrupting', () => {
	render(<Notice title="Refreshing">Existing rows remain visible.</Notice>);
	expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
});
