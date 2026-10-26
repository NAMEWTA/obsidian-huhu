import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { t } from '../../../shared/i18n';
import type { IdentityImportPreview } from '../api';
import { IdentityImportActions } from './IdentityImportActions';
import { workspaceFixture, preview } from './testing/workspace';

it('reviews only safe counts/domains and requires explicit commit with exact domain choices', async () => {
	const f = workspaceFixture(),
		imported = vi.fn();
	render(
		<TestProviders>
			<IdentityImportActions api={f.api} label="Imported" persist onImported={imported} report={vi.fn()} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.pasteIdentity') }));
	const secret = '[{"name":"session-secret-name","value":"never-render-this-value"}]';
	fireEvent.change(screen.getByLabelText(t('browser.v2.identityText')), { target: { value: secret } });
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.reviewImport') }));
	await screen.findByRole('heading', { name: t('browser.v2.reviewTitle') });
	expect(f.api.commitIdentityImport).not.toHaveBeenCalled();
	expect(document.body.textContent).not.toContain('never-render-this-value');
	expect(screen.queryByDisplayValue(secret)).toBeNull();
	fireEvent.click(screen.getByRole('checkbox', { name: '.example.com · 1' }));
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.commitIdentity') }));
	await waitFor(() =>
		expect(f.api.commitIdentityImport).toHaveBeenCalledWith({
			planId: 'plan-1',
			persist: true,
			domains: ['example.com'],
		}),
	);
	expect(imported).toHaveBeenCalledOnce();
});

it('blocks invalid/unsupported input even after domain changes, and cancel discards the private plan', async () => {
	const f = workspaceFixture();
	vi.mocked(f.api.prepareIdentityFile).mockResolvedValue({
		...preview,
		counts: { ...preview.counts, unsupported: 1 },
		issues: [{ index: 3, code: 'unsupported_cookie' }],
	});
	render(
		<TestProviders>
			<IdentityImportActions api={f.api} label="Imported" persist={false} onImported={vi.fn()} report={vi.fn()} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.chooseIdentityFile') }));
	await screen.findByRole('heading', { name: t('browser.v2.reviewTitle') });
	fireEvent.click(screen.getByRole('checkbox', { name: '.example.com · 1' }));
	expect((screen.getByRole('button', { name: t('browser.v2.commitIdentity') }) as HTMLButtonElement).disabled).toBe(
		true,
	);
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.cancel') }));
	expect(f.api.discardIdentityImport).toHaveBeenCalledWith('plan-1');
	expect(f.api.commitIdentityImport).not.toHaveBeenCalled();
});

it('discards a late preflight result after the view closes without saving any identity', async () => {
	const f = workspaceFixture();
	let finish!: (value: IdentityImportPreview | undefined) => void;
	vi.mocked(f.api.prepareIdentityFile).mockImplementation(
		() =>
			new Promise<IdentityImportPreview | undefined>((resolve) => {
				finish = resolve;
			}),
	);
	const view = render(
		<TestProviders>
			<IdentityImportActions api={f.api} label="Imported" persist={false} onImported={vi.fn()} report={vi.fn()} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.chooseIdentityFile') }));
	view.unmount();
	await act(async () => finish(preview));
	expect(f.api.discardIdentityImport).toHaveBeenCalledWith('plan-1');
	expect(f.api.commitIdentityImport).not.toHaveBeenCalled();
});
