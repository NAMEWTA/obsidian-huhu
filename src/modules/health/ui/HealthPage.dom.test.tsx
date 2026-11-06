import { cleanup, render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import type { HealthReport, HealthSnapshot, HealthRepairPlan, HealthRepairResult } from '../api';
import { HealthPage } from './HealthPage';
import type { HealthPagePort } from './types';
import { getLanguage, setLanguage } from '../../../shared/i18n';
let previousLanguage = getLanguage();
beforeEach(() => {
	previousLanguage = getLanguage();
	setLanguage('en');
});
afterEach(() => {
	cleanup();
	setLanguage(previousLanguage);
});
const report: HealthReport = {
	id: 'report-one',
	startedAt: 1,
	finishedAt: 2,
	status: 'error',
	complete: true,
	stale: false,
	sections: [
		{
			providerId: 'archives.integrity',
			scope: 'archives',
			status: 'warning',
			checked: 8,
			total: 8,
			excluded: 2,
			complete: true,
			issues: [{ code: 'dangling-reference', count: 1, severity: 'warning', reference: 'a'.repeat(64) }],
		},
		{
			providerId: 'archives.belongings',
			scope: 'belongings',
			status: 'error',
			checked: 3,
			excluded: 0,
			complete: true,
			issues: [{ code: 'projection-mismatch', count: 1, severity: 'error', reference: 'b'.repeat(64) }],
		},
		{
			providerId: 'safe.container',
			scope: 'safe',
			status: 'locked',
			checked: 0,
			excluded: 1,
			complete: false,
			issues: [],
		},
	],
};
function fixture(initial?: HealthReport) {
	let snapshot: HealthSnapshot = { running: false, report: initial };
	const listeners = new Set<() => void>();
	const result: HealthRepairResult = {
		planId: 'plan',
		reportId: report.id,
		status: 'partial',
		items: [
			{
				operationId: 'op',
				kind: 'belonging-projection',
				committed: 'unknown',
				rechecked: false,
				status: 'failed',
				recoveryId: 'recovery',
			},
		],
	};
	const plan: HealthRepairPlan = {
		id: 'plan',
		reportId: report.id,
		expiresAt: Date.now() + 300000,
		items: [
			{
				id: 'proposal',
				providerId: 'archives.belongings',
				kind: 'belonging-projection',
				expectedHash: 'c'.repeat(64),
				affected: 1,
			},
		],
	};
	const port: HealthPagePort = {
		scanner: {
			get snapshot() {
				return structuredClone(snapshot);
			},
			providers: async () => [],
			scan: vi.fn(async () => {
				snapshot = { running: false, report };
				for (const listener of listeners) listener();
				return report;
			}),
			cancel: vi.fn(),
			subscribe: (listener) => {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
		},
		repairs: {
			results: [],
			plan: vi.fn(async () => plan),
			preview: vi.fn(() => ({ ...plan, confirmation: 'confirmation' })),
			confirm: vi.fn(async () => result),
			recover: vi.fn(async () => ({
				...result.items[0]!,
				committed: true,
				rechecked: true,
				status: 'rolled-back' as const,
			})),
		},
		getReport: (id) => (id && id !== snapshot.report?.id ? undefined : snapshot.report),
		openNotifications: vi.fn(),
	};
	return {
		port,
		listeners,
		result,
		publish: (next: HealthSnapshot) => {
			snapshot = next;
			for (const listener of listeners) listener();
		},
	};
}
test('manual-only scan, scoped report metadata, unsupported explanation and opaque location', async () => {
	const f = fixture(),
		user = userEvent.setup();
	render(
		<TestProviders>
			<HealthPage port={f.port} navigate={vi.fn()} />
		</TestProviders>,
	);
	expect(f.port.scanner.scan).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Start checkup' }));
	await screen.findByText('archives.integrity');
	expect(screen.getByText('Locked')).toBeTruthy();
	expect(screen.getByText(/Checked 8/).textContent).toContain('Excluded 2');
	const unsupported = screen.getByText(/Missing reference/).closest('[data-health-issue]')!;
	expect(within(unsupported as HTMLElement).queryByRole('button', { name: /repair/i })).toBeNull();
	await user.click(within(unsupported as HTMLElement).getByRole('button', { name: 'View location' }));
	expect((await screen.findByRole('dialog')).textContent).toContain('a'.repeat(64));
	await user.keyboard('{Escape}');
});
test('preview then explicit confirmation; cancellation never commits; unknown result and recovery stay distinct', async () => {
	const f = fixture(report),
		user = userEvent.setup();
	render(
		<TestProviders>
			<HealthPage port={f.port} section="repair" navigate={vi.fn()} />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Generate repair plan' }));
	await screen.findByText('Impact preview');
	expect(f.port.repairs.confirm).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Review confirmation' }));
	await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
	expect(f.port.repairs.confirm).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Review confirmation' }));
	await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirm this repair' }));
	await screen.findByText(/Commit status unknown/);
	expect(f.port.repairs.confirm).toHaveBeenCalledTimes(1);
	expect(screen.getByText('Partially complete')).toBeTruthy();
	expect(screen.queryByText('Not committed')).toBeNull();
	await user.click(screen.getByRole('button', { name: 'Review recovery' }));
	await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Restore backup' }));
	await waitFor(() =>
		expect(f.port.repairs.recover).toHaveBeenCalledWith(
			{ providerId: 'archives.belongings', recoveryId: 'recovery', action: 'rollback' },
			expect.anything(),
		),
	);
});
test('stale and unavailable notification reports require rescan; running provider progress is real', () => {
	const f = fixture({ ...report, stale: true });
	const view = render(
		<TestProviders>
			<HealthPage port={f.port} section="repair" navigate={vi.fn()} />
		</TestProviders>,
	);
	expect(screen.queryByRole('button', { name: 'Generate repair plan' })).toBeNull();
	expect(screen.getByText(/Data may have changed/)).toBeTruthy();
	view.rerender(
		<TestProviders>
			<HealthPage port={f.port} reportId="expired-report" navigate={vi.fn()} />
		</TestProviders>,
	);
	expect(screen.getByText(/report is no longer available/)).toBeTruthy();
	expect(f.port.scanner.scan).not.toHaveBeenCalled();
	view.unmount();
	expect(f.listeners.size).toBe(0);
	f.publish({
		running: true,
		progress: { finishedProviders: 1, totalProviders: 3, sections: [report.sections[0]!] },
	});
	render(
		<TestProviders>
			<HealthPage port={f.port} navigate={vi.fn()} />
		</TestProviders>,
	);
	expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('33');
	fireEvent.click(screen.getByRole('button', { name: 'Cancel scan' }));
	expect(f.port.scanner.cancel).toHaveBeenCalledTimes(1);
});

test('external navigation revokes an open confirmation, and a detached old action cannot execute', async () => {
	const f = fixture(report),
		user = userEvent.setup();
	const view = render(
		<TestProviders>
			<HealthPage port={f.port} section="repair" reportId={report.id} navigate={vi.fn()} />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Generate repair plan' }));
	await screen.findByText('Impact preview');
	await user.click(screen.getByRole('button', { name: 'Review confirmation' }));
	const staleAction = within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirm this repair' });
	view.rerender(
		<TestProviders>
			<HealthPage port={f.port} section="scan" reportId="another-report" navigate={vi.fn()} />
		</TestProviders>,
	);
	fireEvent.click(staleAction);
	expect(f.port.repairs.confirm).not.toHaveBeenCalled();
	await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
});

test('closing during plan creation aborts only the preview and ignores its late completion', async () => {
	const f = fixture(report);
	let finish!: (plan: HealthRepairPlan) => void;
	const waiting = new Promise<HealthRepairPlan>((resolve) => {
		finish = resolve;
	});
	f.port.repairs.plan = vi.fn(() => waiting);
	const view = render(
		<TestProviders>
			<HealthPage port={f.port} section="repair" navigate={vi.fn()} />
		</TestProviders>,
	);
	fireEvent.click(screen.getByRole('button', { name: 'Generate repair plan' }));
	view.unmount();
	const signal = vi.mocked(f.port.repairs.plan).mock.calls[0]![2]!;
	expect(signal.aborted).toBe(true);
	finish({ id: 'late-plan', reportId: report.id, expiresAt: 1, items: [] });
	await waiting;
	expect(f.port.repairs.preview).not.toHaveBeenCalled();
	expect(f.listeners.size).toBe(0);
});

test('unsupported-only diagnostics offer location and explanation without a repair plan action', () => {
	const f = fixture({ ...report, sections: [report.sections[0]!] });
	render(
		<TestProviders>
			<HealthPage port={f.port} section="repair" navigate={vi.fn()} />
		</TestProviders>,
	);
	expect(screen.queryByRole('button', { name: 'Generate repair plan' })).toBeNull();
	expect(screen.getByRole('button', { name: 'View location' })).toBeTruthy();
	expect(f.port.repairs.plan).not.toHaveBeenCalled();
});

test('a failed scan retains the last report and does not disclose the thrown source text', async () => {
	const f = fixture(report);
	f.port.scanner.scan = vi.fn(async () => {
		throw new Error('PRIVATE-SOURCE-TEXT');
	});
	render(
		<TestProviders>
			<HealthPage port={f.port} navigate={vi.fn()} />
		</TestProviders>,
	);
	const rescan = screen.getByRole('button', { name: 'Rescan' });
	fireEvent.click(rescan);
	fireEvent.click(rescan);
	await screen.findByRole('alert');
	expect(f.port.scanner.scan).toHaveBeenCalledTimes(1);
	expect(document.body.textContent).not.toContain('PRIVATE-SOURCE-TEXT');
	expect(screen.getByText('archives.integrity')).toBeTruthy();
});

test('real lazy page binding restores report routing and releases its React surface subscriptions', async () => {
	const { act } = await import('@testing-library/react');
	const { createHealthPage } = await import('./workbench-page');
	const { memoryVault } = await import('../../../../scripts/fixtures/memory-vault');
	const { normalizeTarget } = await import('../../../shell/navigation-state');
	const f = fixture(report),
		vault = memoryVault(),
		element = document.createElement('div');
	document.body.append(element);
	Object.assign(element, {
		addClass: (...names: string[]) => element.classList.add(...names),
		removeClass: (...names: string[]) => element.classList.remove(...names),
	});
	const context = {
		app: vault.app,
		contentEl: element,
		containerEl: element,
		changed: vi.fn(),
		close() {},
	} as unknown as import('../../../ui/native-surface').NativeSurfaceContext;
	const target = normalizeTarget({ feature: 'health', section: 'scan', resourceId: report.id });
	expect(target).toEqual({ feature: 'health', section: 'scan', resourceId: report.id });
	const binding = await createHealthPage(f.port)(context, target, {}, new AbortController().signal);
	try {
		await act(() => binding.surface.onOpen());
		await screen.findByText('archives.integrity');
		await act(() =>
			binding.navigate!(
				{ feature: 'health', section: 'repair', resourceId: report.id },
				new AbortController().signal,
			),
		);
		await screen.findByRole('button', { name: 'Generate repair plan' });
		expect(binding.getTarget?.().section).toBe('repair');
		expect(f.port.scanner.scan).not.toHaveBeenCalled();
	} finally {
		await act(() => binding.surface.onClose());
		element.remove();
	}
	expect(f.listeners.size).toBe(0);
});

test('the live page switches language with readable scope, counts and locked status', async () => {
	const { act } = await import('@testing-library/react');
	const f = fixture(report);
	render(
		<TestProviders>
			<HealthPage port={f.port} navigate={vi.fn()} />
		</TestProviders>,
	);
	await act(async () => setLanguage('zh'));
	expect(screen.getByRole('heading', { name: '数据体检' })).toBeTruthy();
	expect(screen.getByText(/已检查 8/).textContent).toContain('排除 2');
	expect(screen.getByText('已锁定')).toBeTruthy();
	expect(document.body.textContent).not.toContain('health.page.');
});

test('external navigation also revokes a stale recovery confirmation', async () => {
	const f = fixture(report),
		user = userEvent.setup(),
		port = { ...f.port, repairs: { ...f.port.repairs, results: [f.result] } };
	const view = render(
		<TestProviders>
			<HealthPage port={port} section="repair" reportId={report.id} navigate={vi.fn()} />
		</TestProviders>,
	);
	await user.click(screen.getByRole('button', { name: 'Review recovery' }));
	const staleRestore = within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Restore backup' });
	view.rerender(
		<TestProviders>
			<HealthPage port={port} reportId="another-report" navigate={vi.fn()} />
		</TestProviders>,
	);
	fireEvent.click(staleRestore);
	expect(port.repairs.recover).not.toHaveBeenCalled();
});

test('repair selection sends only the checked existing owner commands', async () => {
	const f = fixture(report);
	render(
		<TestProviders>
			<HealthPage port={f.port} section="repair" navigate={vi.fn()} />
		</TestProviders>,
	);
	const checkbox = screen.getAllByRole('checkbox')[0]!;
	fireEvent.click(checkbox);
	expect(screen.queryByRole('button', { name: 'Generate repair plan' })).toBeNull();
	expect(f.port.repairs.plan).not.toHaveBeenCalled();
	fireEvent.click(checkbox);
	fireEvent.click(screen.getByRole('button', { name: 'Generate repair plan' }));
	await waitFor(() => expect(f.port.repairs.plan).toHaveBeenCalledOnce());
	expect(vi.mocked(f.port.repairs.plan).mock.calls[0]![1]).toEqual([
		{ providerId: 'archives.belongings', kind: 'belonging-projection', reference: 'b'.repeat(64) },
	]);
});
