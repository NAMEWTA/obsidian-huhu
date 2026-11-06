import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { resolveWidgetLabel } from '../../core/board/default-widget-label';
import { CountdownEditor } from './CountdownWidget';
afterEach(cleanup);
test('countdown saves local date and exact time without a zone conversion', () => {
	setLanguage('en');
	const save = vi.fn();
	render(
		<TestProviders>
			<CountdownEditor
				embedded
				initial={{ id: 'x', label: 'L', targetDate: '2026-09-15T08:30', displayMode: 'days', reminderDays: 0 }}
				onClose={() => {}}
				onSave={save}
			/>
		</TestProviders>,
	);
	const date = screen.getByLabelText(t('home.dashboard.date'));
	expect((date as HTMLInputElement).value).toBe('2026-09-15');
	expect((screen.getByLabelText(t('home.pipeline.time')) as HTMLInputElement).value).toBe('08:30');
	fireEvent.change(date, { target: { value: '2025-04-20' } });
	fireEvent.blur(date);
	fireEvent.change(screen.getByLabelText(t('home.pipeline.time')), { target: { value: '14:45' } });
	fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
	expect(save.mock.calls[0]?.[0].targetDate).toBe('2025-04-20T14:45');
});
test('countdown preserves localized default mode until its name is explicitly edited', () => {
	setLanguage('en');
	const initial = {
		id: 'cd-default',
		label: 'New Year',
		defaultLabel: true,
		targetDate: '2030-12-31T23:55',
		displayMode: 'hours' as const,
		reminderDays: 0,
	};
	const save = vi.fn();
	const draw = () => (
		<TestProviders>
			<CountdownEditor embedded initial={initial} onClose={() => {}} onSave={save} />
		</TestProviders>
	);
	const view = render(draw());
	fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
	expect(save.mock.calls[0]?.[0].defaultLabel).toBe(true);
	setLanguage('zh');
	expect(resolveWidgetLabel(save.mock.calls[0]![0], 'countdown')).toBe('新年');
	view.unmount();
	setLanguage('en');
	render(draw());
	fireEvent.change(screen.getByLabelText(t('home.dashboard.name')), { target: { value: 'Anniversary' } });
	fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
	expect(save.mock.calls[1]?.[0]).toMatchObject({ label: 'Anniversary', defaultLabel: false });
	setLanguage('zh');
	expect(resolveWidgetLabel(save.mock.calls[1]![0], 'countdown')).toBe('Anniversary');
});
