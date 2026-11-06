import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { AutomationService } from '../../core/service';
import { createAutomationViewStore } from '../../services/view-store';
import { definition } from '../test-fixture';
import type { AutomationViewHost } from '../panel-contract';
import { EditorView } from './EditorView';

const releases: Array<() => Promise<void>> = [];
beforeEach(() => {
	setLanguage('en');
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});
afterEach(async () => {
	cleanup();
	for (const release of releases.splice(0)) await release();
	vi.useRealTimers();
});
async function realEditor(kind: 'schedule' | 'reminder') {
	const m = memoryVault({}, window),
		service = new AutomationService(
			m.adapter,
			'.huhu/automation/test.json',
			'device',
			{
				list: async () => [],
				save: async () => {},
				remove: async () => {},
				open: async () => {},
				createTask: async () => {},
			},
			() => undefined,
			async () => {},
		);
	await service.load();
	const d = {
		...definition('Strict wall time'),
		schedule:
			kind === 'schedule'
				? { kind: 'once' as const, at: Date.parse('2030-01-02T09:30:00Z') }
				: { kind: 'manual' as const },
		action:
			kind === 'schedule'
				? { kind: 'notify' as const, body: 'Retained body' }
				: {
						kind: 'create-task' as const,
						text: 'Keep separate deadline',
						date: '2026-12-01',
						time: '12:00',
						timezone: 'UTC',
						reminderAt: Date.parse('2026-02-01T09:00:00Z'),
					},
	};
	await service.save(d);
	const view = createAutomationViewStore(service),
		host: AutomationViewHost = {
			service,
			store: view.store,
			inbox: () => {},
			retry: async () => {},
			refresh: async () => {},
			paths: () => [],
			commands: () => [],
			cwd: '/vault',
		};
	releases.push(async () => {
		view.dispose();
		await service.shutdown();
	});
	const saved = vi.fn();
	render(
		<TestProviders>
			<EditorView request={{ existing: service.definitions[0] }} host={host} onSaved={saved} onClose={() => {}} />
		</TestProviders>,
	);
	return { m, service, saved, label: t(kind === 'schedule' ? 'automation.time' : 'automation.taskReminder') };
}
function editWall(label: string, date: string, time: string, zone: string) {
	const dateInput = screen.getByLabelText(label),
		field = dateInput.closest('[data-slot="date-time-field"]')!;
	const zoneInput = within(field as HTMLElement).getByLabelText(t('ui.date.zone'));
	fireEvent.change(zoneInput, { target: { value: zone } });
	fireEvent.blur(zoneInput);
	fireEvent.change(dateInput, { target: { value: date } });
	fireEvent.blur(dateInput);
	const clock = within(field as HTMLElement).getByLabelText(t('ui.date.time'));
	fireEvent.change(clock, { target: { value: time } });
	fireEvent.blur(clock);
	return { dateInput, clock, zoneInput };
}
for (const kind of ['schedule', 'reminder'] as const)
	for (const [zone, date, time, reason, epoch] of [
		['America/New_York', '2026-03-08', '02:30', 'nonexistent-time', null],
		['America/New_York', '2026-11-01', '01:30', 'ambiguous-time', null],
		['UTC', '2026-03-08', '02:30', null, '2026-03-08T02:30:00Z'],
		['Asia/Shanghai', '2026-11-01', '01:30', null, '2026-10-31T17:30:00Z'],
	] as const)
		test(`actual ${kind} form and AutomationService enforce ${zone} ${date} ${time}`, async () => {
			const f = await realEditor(kind),
				before = f.m.writes,
				original = structuredClone(f.service.definitions[0]);
			const controls = editWall(f.label, date, time, zone);
			fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
				target: { value: 'Unrelated name edit' },
			});
			if (reason) {
				expect((controls.clock as HTMLInputElement).value).toBe(time);
				expect(
					within(controls.clock.closest('[data-slot="date-time-field"]') as HTMLElement).getByText(
						t(`automation.time.${reason}`),
					),
				).toBeTruthy();
				expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
				fireEvent.keyDown(screen.getByRole('textbox', { name: 'Name' }), { key: 'Enter', ctrlKey: true });
				expect(f.m.writes).toBe(before);
				expect(f.service.definitions[0]).toEqual(original);
				expect(f.saved).not.toHaveBeenCalled();
			} else {
				expect((controls.dateInput as HTMLInputElement).value).toBe(date);
				expect((controls.zoneInput as HTMLInputElement).value).toBe(zone);
				await userEvent.click(screen.getByRole('button', { name: 'Save' }));
				await waitFor(() => expect(f.saved).toHaveBeenCalledOnce());
				const actual = f.service.definitions[0]!;
				expect(actual.revision).toBe(2);
				expect(f.m.writes).toBeGreaterThan(before);
				if (kind === 'schedule') {
					expect(actual.schedule).toEqual({ kind: 'once', at: Date.parse(epoch!) });
					expect('timezone' in actual.schedule).toBe(false);
				} else {
					expect(actual.action).toMatchObject({
						kind: 'create-task',
						date: '2026-12-01',
						time: '12:00',
						timezone: 'UTC',
						reminderAt: Date.parse(epoch!),
					});
					expect(actual.schedule.kind).toBe('manual');
				}
			}
		});
