import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { t } from '../../../shared/i18n';
import { calculateDiff } from './diff-model';
import { HunkRestoreControls } from './HunkRestoreControls';

test.each(['approximate', 'truncated', 'oversized'] as const)('selective recovery explains and rejects %s comparisons', kind => {
	const source = kind === 'oversized' ? 'a'.repeat(2_000_001) : 'old\n', target = 'new\n';
	const exact = calculateDiff({ id: 'control', left: 'old\n', right: target });
	const diff = kind === 'approximate' ? { ...exact, precise: false } : kind === 'truncated' ? { ...exact, right: 'partial' }
		: { ...exact, left: source };
	const prepare = vi.fn();
	render(<TestProviders><HunkRestoreControls identity="fixed" source={source} target={target} diff={diff}
		action={{ prepare }} reveal={() => {}} /></TestProviders>);
	expect(screen.getByRole('status').textContent).toBe(t('versioning.restore.hunks-unavailable'));
	const button = screen.getByRole<HTMLButtonElement>('button', { name: t('review.hunks.restore', { count: 0 }) });
	expect(button.disabled).toBe(true); fireEvent.click(button);
	expect(prepare).not.toHaveBeenCalled();
});
