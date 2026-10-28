import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage } from '../../../../shared/i18n';
import type { PortablePreview } from '../../api';
import { ImportPreviewPanel } from './ImportPreviewPanel';

beforeEach(() => setLanguage('en'));
const preview: PortablePreview = {
	token: 'frozen',
	mappingMode: 'copy-candidate',
	mappings: [{ kind: 'agent', from: 'imported', to: 'reserved-copy' }],
	conflicts: [],
};
test('shows a token-bound copy candidate even when the package has no conflicts', () => {
	render(
		<TestProviders>
			<ImportPreviewPanel
				preview={preview}
				resolutions={{}}
				busy={false}
				onResolution={vi.fn()}
				onConfirm={vi.fn()}
				onAbandon={vi.fn()}
			/>
		</TestProviders>,
	);
	expect(screen.getByText('Imported identity: imported')).toBeTruthy();
	expect(screen.getByText('New ID when copying: reserved-copy')).toBeTruthy();
	expect(screen.getByText(/No conflicts were reported/)).toBeTruthy();
});
test('lists every saved target, disables ambiguous overwrite and submits one resolution for the imported identity', () => {
	const confirm = vi.fn();
	const ambiguous: PortablePreview = {
		...preview,
		conflicts: ['first', 'second'].map((existingId) => ({
			id: 'imported',
			revision: '2',
			hash: 'sha256:x',
			kind: 'agent',
			existingId,
			reason: 'name',
			needsReview: true,
		})),
	};
	function Form() {
		const [choices, setChoices] = useState<Record<string, 'keep' | 'replace' | 'copy'>>({});
		return (
			<ImportPreviewPanel
				preview={ambiguous}
				resolutions={choices}
				busy={false}
				onResolution={(id, action) => setChoices({ [id]: action })}
				onConfirm={confirm}
				onAbandon={vi.fn()}
			/>
		);
	}
	render(
		<TestProviders>
			<Form />
		</TestProviders>,
	);
	expect(screen.getByText(/Saved target: first/)).toBeTruthy();
	expect(screen.getByText(/Saved target: second/)).toBeTruthy();
	expect(screen.getAllByLabelText('Resolution for imported')).toHaveLength(1);
	expect((screen.getByRole('option', { name: 'Replace after review' }) as HTMLOptionElement).disabled).toBe(true);
	expect((screen.getByRole('option', { name: 'Keep existing' }) as HTMLOptionElement).disabled).toBe(true);
	fireEvent.change(screen.getByLabelText('Resolution for imported'), { target: { value: 'copy' } });
	fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }));
	expect(confirm).toHaveBeenCalledWith([{ id: 'imported', action: 'copy' }]);
});
