import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../react/test-providers';
import { t } from '../../../../shared/i18n';
import { TaskComposer } from './TaskComposer';

afterEach(cleanup);
test('Enter explicitly submits the composer in hosts that consume native form submission', async () => {
	const add = vi.fn(async () => true);
	render(
		<TestProviders>
			<TaskComposer add={add} />
		</TestProviders>,
	);
	const field = screen.getByRole('textbox');
	fireEvent.change(field, { target: { value: 'One task' } });
	fireEvent.keyDown(field, { key: 'Enter' });
	await waitFor(() => expect(add).toHaveBeenCalledExactlyOnceWith('One task'));
	expect((field as HTMLInputElement).value).toBe('');
});
test('composer keeps unsaved input after failure and IME confirmation does not submit', async () => {
	const add = vi.fn(async () => {
		throw new Error('Write failed');
	});
	render(
		<TestProviders>
			<TaskComposer add={add} options={vi.fn()} />
		</TestProviders>,
	);
	const field = screen.getByRole('textbox');
	fireEvent.change(field, { target: { value: '我的待办' } });
	fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
	expect(add).not.toHaveBeenCalled();
	await userEvent.click(screen.getByRole('button', { name: t('calendarUnified.add') }));
	await screen.findByRole('alert');
	expect((field as HTMLInputElement).value).toBe('我的待办');
	expect(add).toHaveBeenCalledExactlyOnceWith('我的待办');
});
