import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { AnniversaryEditor } from './AnniversaryEditor';
import type { AnniversaryConfig } from '../../core/board/types';
afterEach(cleanup);
test('custom anniversary foreground survives save/reopen and cancelled edits leave the stored value intact', () => {
	setLanguage('en');
	const initial: AnniversaryConfig = {
		id: 'test',
		label: 'Test',
		startDate: '2020-01-01',
		precision: 'days',
		annualReminder: false,
		background: { image: 'cover.png', opacity: 100, dim: 30, blur: 0, foreground: '#123456' },
	};
	const save = vi.fn(),
		close = vi.fn();
	const draw = (value: AnniversaryConfig) => (
		<TestProviders>
			<AnniversaryEditor initial={value} onSave={save} onClose={close} />
		</TestProviders>
	);
	const view = render(draw(initial));
	expect(screen.getByRole('combobox', { name: t('wbg.foreground') }).textContent).toContain(t('wbg.fgCustom'));
	fireEvent.change(screen.getByLabelText(t('wbg.fgCustom')), { target: { value: '#abcdef' } });
	fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
	expect(save.mock.calls[0]?.[0].background.foreground).toBe('#abcdef');
	view.unmount();
	const saved = save.mock.calls[0]![0] as AnniversaryConfig;
	render(draw(saved));
	expect((screen.getByLabelText(t('wbg.fgCustom')) as HTMLInputElement).value).toBe('#abcdef');
	fireEvent.change(screen.getByLabelText(t('wbg.fgCustom')), { target: { value: '#ffffff' } });
	fireEvent.click(screen.getByRole('button', { name: t('common.cancel') }));
	expect(close).toHaveBeenCalledOnce();
	expect(save).toHaveBeenCalledOnce();
	expect(saved.background?.foreground).toBe('#abcdef');
});
test('editing a localized default label makes it explicit while cancelling preserves original', () => {
	setLanguage('en');
	const initial: AnniversaryConfig = {
			id: 'test',
			label: 'Anniversary',
			defaultLabel: true,
			startDate: '2020-01-01',
			precision: 'days',
			annualReminder: false,
		},
		save = vi.fn();
	render(
		<TestProviders>
			<AnniversaryEditor initial={initial} onSave={save} onClose={() => {}} />
		</TestProviders>,
	);
	fireEvent.change(screen.getByLabelText(t('anniversary.label')), { target: { value: 'Wedding' } });
	fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
	expect(save.mock.calls[0]?.[0]).toMatchObject({ label: 'Wedding', defaultLabel: false });
	expect(initial.defaultLabel).toBe(true);
});

for (const invalid of [false, true])
	test(`solar draft cannot revive the old date on calendar switch: invalid=${invalid}`, async () => {
		setLanguage('en');
		const save = vi.fn();
		const initial = {
			id: 'raw',
			label: 'Anniversary',
			startDate: '2020-01-01T12:34:56.120+08:00',
			precision: 'hours' as const,
			annualReminder: true,
		};
		render(
			<TestProviders>
				<AnniversaryEditor initial={initial} onSave={save} onClose={() => {}} />
			</TestProviders>,
		);
		if (invalid)
			fireEvent.change(screen.getByLabelText(t('anniversary.startDate')), { target: { value: '2020-02-30' } });
		await userEvent.click(screen.getByRole('combobox', { name: t('anniversary.calendar') }));
		await userEvent.click(screen.getByRole('option', { name: t('anniversary.lunar') }));
		if (invalid) {
			expect((screen.getByLabelText(t('anniversary.startDate')) as HTMLInputElement).value).toBe('2020-02-30');
			expect(screen.getByRole('combobox', { name: t('anniversary.calendar') }).textContent).toContain(
				t('anniversary.solar'),
			);
			fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
			expect(save).not.toHaveBeenCalled();
		} else {
			await waitFor(() => expect(screen.queryByText(t('anniversary.loading'))).toBeNull());
			fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
			expect(save).toHaveBeenCalledWith(
				expect.objectContaining({ startDate: initial.startDate, calendar: 'lunar' }),
			);
		}
	});

test.each(['2020-01-01', '2020-01-01T12:34:56.120+08:00'])(
	'valid raw day saves current input and preserves civil precision: %s',
	(startDate) => {
		setLanguage('en');
		const save = vi.fn();
		render(
			<TestProviders>
				<AnniversaryEditor
					initial={{ id: 'precision', label: 'Date', startDate, precision: 'hours', annualReminder: false }}
					onClose={() => {}}
					onSave={save}
				/>
			</TestProviders>,
		);
		fireEvent.change(screen.getByLabelText(t('anniversary.startDate')), { target: { value: '2020-01-02' } });
		fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
		expect(save).toHaveBeenCalledWith(
			expect.objectContaining({ startDate: startDate.replace('2020-01-01', '2020-01-02') }),
		);
	},
);
