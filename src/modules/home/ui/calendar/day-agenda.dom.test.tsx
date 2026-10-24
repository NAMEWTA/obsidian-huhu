import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import type { VaultTask } from '../../platform/calendar/alltasks-scan';
import { DashboardRenderContext } from '../renderer/render-context';
import { DayAgendaPanel } from './CalendarModalPanel';

beforeEach(() => setLanguage('en'));
afterEach(cleanup);

const ISO = '2026-10-17';
const task = (text: string, over: Partial<VaultTask> = {}): VaultTask =>
	({
		path: 'Plan.md',
		line: 1,
		originalLine: `- [ ] ${text}`,
		checked: false,
		text,
		due: ISO,
		file: { basename: 'Plan', path: 'Plan.md' },
		...over,
	}) as VaultTask;

function scene(tasks: VaultTask[] = [], extra: Partial<Parameters<typeof DayAgendaPanel>[0]> = {}) {
	const { app } = memoryVault({}, window);
	const addTask = vi.fn(async (title: string, time: string) =>
		task(title, { time: time || undefined, reminder: time ? `${ISO} ${time}` : undefined }),
	);
	const removeTask = vi.fn(async (_task: VaultTask) => true);
	const onToggle = vi.fn(async () => {});
	const close = vi.fn();
	render(
		<TestProviders>
			<DayAgendaPanel
				app={app}
				context={new DashboardRenderContext(document.createElement('div'))}
				actions={{ onToggle }}
				iso={ISO}
				tasks={tasks}
				addTask={addTask}
				removeTask={removeTask}
				close={close}
				{...extra}
			/>
		</TestProviders>,
	);
	return { addTask, removeTask, onToggle, close };
}
const title = () => screen.getByRole('textbox', { name: t('calendarUnified.taskTitle') }) as HTMLInputElement;
const add = () => screen.getByRole('button', { name: t('calendarUnified.add') });

test('day agenda has a compact date header, no source path or summary, and an anchored composer', () => {
	const f = scene([task('Read', { time: '09:30' })]);
	expect(document.querySelector('[data-calendar-agenda] header')?.textContent).toContain(ISO);
	expect(screen.getByText('09:30')).toBeTruthy();
	expect(screen.queryByText('Plan.md')).toBeNull();
	expect(document.querySelector('[data-calendar-note-summary]')).toBeNull();
	expect(document.querySelector('input[type=time]')).toBeNull();
	expect(title().closest('form')?.className).toContain('mt-auto');
	fireEvent.click(screen.getByRole('button', { name: t('ui.close') }));
	expect(f.close).toHaveBeenCalledOnce();
});
test('default creation has no time and a successful save clears the draft', async () => {
	const f = scene();
	expect((add() as HTMLButtonElement).disabled).toBe(true);
	fireEvent.change(title(), { target: { value: '  Buy milk ' } });
	fireEvent.submit(title().closest('form')!);
	await waitFor(() => expect(f.addTask).toHaveBeenCalledExactlyOnceWith('Buy milk', ''));
	expect(title().value).toBe('');
});
test('time is optional and appears only after opening its control', async () => {
	const f = scene();
	fireEvent.click(screen.getByRole('button', { name: t('calendarUnified.taskTime') }));
	fireEvent.change(document.querySelector('input[type=time]')!, { target: { value: '17:45' } });
	fireEvent.change(title(), { target: { value: 'Call back' } });
	fireEvent.submit(title().closest('form')!);
	await waitFor(() => expect(f.addTask).toHaveBeenCalledWith('Call back', '17:45'));
});
test('completion targets its row and source/delete live in the row menu', async () => {
	const original = task('Read'),
		onOpenNote = vi.fn(),
		onToggle = vi.fn(async () => {});
	const f = scene([original], { actions: { onToggle, onOpenNote } });
	fireEvent.click(screen.getByRole('checkbox', { name: 'Read' }));
	await waitFor(() => expect(onToggle).toHaveBeenCalledExactlyOnceWith(original, true));
	const row = screen.getByText('Read').closest('li')!;
	expect(within(row).queryByRole('button', { name: t('calendarUnified.source') })).toBeNull();
	await userEvent.click(within(row).getByRole('button', { name: t('tasks.more') }));
	await userEvent.click(screen.getByRole('menuitem', { name: t('calendarUnified.source') }));
	expect(onOpenNote).toHaveBeenCalledExactlyOnceWith(original.file, 1, original);
	await userEvent.click(within(row).getByRole('button', { name: t('tasks.more') }));
	await userEvent.click(screen.getByRole('menuitem', { name: t('calendarUnified.remove') }));
	expect(f.removeTask).toHaveBeenCalledExactlyOnceWith(original);
});
test('a failed save keeps the text, prevents duplicate submits and reports a retryable error', async () => {
	let reject!: (error: Error) => void;
	const save = vi.fn(
		() =>
			new Promise<VaultTask | null>((_resolve, fail) => {
				reject = fail;
			}),
	);
	scene([], { addTask: save });
	fireEvent.change(title(), { target: { value: 'Keep my draft' } });
	fireEvent.submit(title().closest('form')!);
	fireEvent.submit(title().closest('form')!);
	expect(save).toHaveBeenCalledOnce();
	reject(new Error('disk full'));
	await screen.findByRole('alert');
	expect(title().value).toBe('Keep my draft');
	expect((add() as HTMLButtonElement).disabled).toBe(false);
});
test('the bell edits the task reminder, and stays absent when no editor is available', () => {
	const onRemind = vi.fn();
	scene([task('Pay rent', { line: 7, time: '08:30' })], { actions: { onToggle: vi.fn(async () => {}), onRemind } });
	fireEvent.click(screen.getByRole('button', { name: t('calendarUnified.remind') }));
	expect(onRemind).toHaveBeenCalledWith(expect.objectContaining({ text: 'Pay rent', line: 7 }), ISO);
	cleanup();
	scene([task('No reminder editor')]);
	expect(screen.queryByRole('button', { name: t('calendarUnified.remind') })).toBeNull();
});
