import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../ui/react/test-providers';
import { DesignScope } from '../../../ui/react/design-scope';
import { t } from '../../../shared/i18n';
import type { NotificationRecord } from '../api';
import { InboxPanel } from './InboxPanel';
test('inbox preserves filtering, opener availability and read/clear actions', async () => {
	const records: NotificationRecord[] = [
		{
			id: '1',
			title: 'Older',
			body: 'Body',
			channels: ['in-app'],
			deliveries: { 'in-app': 'sent' },
			createdAt: 1,
			read: true,
		},
		{
			id: '2',
			title: 'Latest',
			body: 'Latest detail',
			channels: ['in-app'],
			deliveries: { 'in-app': 'failed' },
			createdAt: 2,
			read: false,
		},
	];
	const markRead = vi.fn(),
		clearRead = vi.fn(),
		open = vi.fn(),
		user = userEvent.setup();
	const props = { records, markRead, clearRead, open, openable: new Set(['2']) };
	const mounted = render(
		<TestProviders>
			<DesignScope><InboxPanel {...props} filter="all" /></DesignScope>
		</TestProviders>,
	);
	expect(screen.getAllByRole('listitem').map((e) => e.textContent)).toEqual([
		expect.stringContaining('Latest'),
		expect.stringContaining('Older'),
	]);
	await user.click(screen.getByRole('button', { name: t('automation.open') }));
	expect(open).toHaveBeenCalledWith(records[1]);
	await user.click(screen.getByRole('button', { name: t('automation.read') }));
	expect(markRead).toHaveBeenCalledWith('2');
	await user.click(screen.getByRole('button', { name: t('automation.readAll') }));
	expect(markRead).toHaveBeenCalledWith();
	await user.click(screen.getByRole('button', { name: t('automation.clearRead') }));
	expect(clearRead).toHaveBeenCalledOnce();
	mounted.rerender(
		<TestProviders>
			<DesignScope><InboxPanel {...props} filter="unread" /></DesignScope>
		</TestProviders>,
	);
	expect(screen.queryByText('Older')).toBeNull();
	mounted.rerender(
		<TestProviders>
			<DesignScope><InboxPanel {...props} records={records.map((r) => ({ ...r, read: true }))} filter="unread" /></DesignScope>
		</TestProviders>,
	);
	expect(screen.getByText(t('workbench.noUnread'))).toBeTruthy();
});
test('details resolve the current name by stable id, mark deleted targets, copy ids and keep action errors visible', async () => {
	const base = { body: 'Failed: boom', channels: ['in-app' as const], deliveries: {}, createdAt: 1, read: false };
	const records: NotificationRecord[] = [
		{ ...base, id: 'a', title: 'Old name', target: { runId: 'run-a', automationId: 'auto-a' } },
		{ ...base, id: 'b', title: 'Gone', target: { runId: 'run-b', automationId: 'auto-b' } },
	];
	const names = new Map<string, { state: 'current'; name: string } | { state: 'deleted' }>([
		['a', { state: 'current', name: 'New name' }],
		['b', { state: 'deleted' }],
	]);
	const dismiss = vi.fn(),
		user = userEvent.setup();
	const writeText = vi.fn(async () => {});
	Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText } });
	render(
		<TestProviders>
			<DesignScope>
				<InboxPanel records={records} filter="all" markRead={vi.fn()} clearRead={vi.fn()} open={vi.fn()} openable={new Set()} names={names} error="disk full" dismissError={dismiss} />
			</DesignScope>
		</TestProviders>,
	);
	expect(screen.getByRole('alert').textContent).toContain('disk full');
	for (const button of screen.getAllByRole('button', { name: t('notification.details') })) await user.click(button);
	expect(screen.getByText('New name')).toBeTruthy();
	expect(screen.getByText(t('notification.targetDeleted'))).toBeTruthy();
	expect(screen.getByText('Old name')).toBeTruthy();
	await user.click(screen.getAllByRole('button', { name: t('notification.copy', { label: t('notification.automationId') }) })[0]!);
	expect(writeText).toHaveBeenCalledWith('auto-b');
	await user.click(screen.getByRole('button', { name: t('notification.dismissError') }));
	expect(dismiss).toHaveBeenCalledOnce();
});
