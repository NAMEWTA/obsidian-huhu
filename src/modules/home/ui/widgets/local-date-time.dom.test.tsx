import { VisibilityContext } from '../../../../ui/react/contexts';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { CountdownEditor } from './CountdownWidget';
import { LocalDateTimeField } from './LocalDateTimeField';
afterEach(cleanup);
test('invalid countdown date text prevents unrelated fields from saving the old target, and clearing stays invalid', () => {
	setLanguage('en');
	const save = vi.fn();
	render(
		<TestProviders>
			<CountdownEditor
				initial={{
					id: 'a',
					label: 'Original',
					targetDate: '2030-01-01T09:30',
					displayMode: 'hours',
					reminderDays: 0,
				}}
				onClose={() => {}}
				onSave={save}
			/>
		</TestProviders>,
	);
	const date = screen.getByLabelText(t('home.dashboard.date'));
	fireEvent.change(date, { target: { value: '2030-02-30' } });
	fireEvent.change(screen.getByLabelText(t('home.dashboard.name')), { target: { value: 'New label' } });
	fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
	expect(save).not.toHaveBeenCalled();
	expect((date as HTMLInputElement).value).toBe('2030-02-30');
	fireEvent.change(date, { target: { value: '' } });
	fireEvent.blur(date);
	fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
	expect(save).not.toHaveBeenCalled();
});
test('local civil date and time compose without epoch or zone conversion', () => {
	const changed = vi.fn();
	function Probe() {
		const [value, setValue] = useState('2030-01-01T09:30');
		return (
			<LocalDateTimeField
				value={value}
				label="Target"
				onChange={(value) => {
					changed(value);
					setValue(value);
				}}
			/>
		);
	}
	render(
		<TestProviders>
			<Probe />
		</TestProviders>,
	);
	fireEvent.change(screen.getByLabelText(t('home.pipeline.time')), { target: { value: '12:45' } });
	expect(changed).toHaveBeenLastCalledWith('2030-01-01T12:45');
	const date = screen.getByLabelText('Target');
	fireEvent.change(date, { target: { value: '2030-01-03' } });
	fireEvent.blur(date);
	expect(changed).toHaveBeenLastCalledWith('2030-01-03T12:45');
});

test('an invalid raw countdown date remains a draft after hide/show and cannot save the old target', () => {
	setLanguage('en');
	const save = vi.fn();
	const initial = {
		id: 'counter',
		label: 'Countdown',
		targetDate: '2030-01-01T09:30',
		displayMode: 'days' as const,
		reminderDays: 0,
	};
	const body = (visible: boolean) => (
		<TestProviders>
			<VisibilityContext value={visible}>
				<CountdownEditor initial={initial} onSave={save} onClose={() => {}} />
			</VisibilityContext>
		</TestProviders>
	);
	const view = render(body(true));
	const date = screen.getByLabelText(t('home.dashboard.date'));
	fireEvent.change(date, { target: { value: '2030-02-30' } });
	expect((screen.getByRole('button', { name: t('common.save') }) as HTMLButtonElement).disabled).toBe(true);
	view.rerender(body(false));
	view.rerender(body(true));
	expect.soft((screen.getByLabelText(t('home.dashboard.date')) as HTMLInputElement).value).toBe('2030-02-30');
	expect(screen.getByLabelText(t('home.dashboard.date')).getAttribute('aria-invalid')).toBe('true');
	fireEvent.click(screen.getByRole('button', { name: t('common.save') }));
	expect(save).not.toHaveBeenCalled();
});
