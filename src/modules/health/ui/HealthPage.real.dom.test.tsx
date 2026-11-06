import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { setLanguage } from '../../../shared/i18n';
import { HealthPage } from './HealthPage';
import { HealthScanService } from '../core/scanner';
import { HealthRepairService } from '../core/repair';
import { serviceKey } from '../../../app/contracts/module';
import type { HealthCheck, HealthRepairOwner } from '../api';

beforeEach(() => setLanguage('en'));
const fixtures: { repairs: HealthRepairService; scanner: HealthScanService }[] = [];
afterEach(async () => {
	cleanup();
	vi.restoreAllMocks();
	for (const f of fixtures.splice(0)) {
		f.repairs.dispose();
		await f.scanner.dispose();
	}
});
const gate = () => {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => (resolve = r));
	return { resolve, promise };
};
async function healthPage() {
	let seq = 0,
		now = Date.now();
	let previewWait: Promise<void> | undefined;
	const scanner = new HealthScanService(
		{
			providers: async () => [
				{ id: 'archives.integrity', scope: 'archives', service: serviceKey<HealthCheck>('health', 'review') },
			],
			acquire: async () => ({
				revoked: new AbortController().signal,
				value: {
					permission: async () => 'allowed',
					scan: async function* () {
						yield { checked: 1, total: 1, status: 'pass' };
					},
				},
			}),
			now: () => now,
			id: () => `scan-${++seq}`,
			yieldControl: async () => {},
		},
		() => ({ concurrency: 1, batchSize: 10, maxItems: 100, maxIssues: 20, freshnessMinutes: 60 }),
	);
	const repairs = new HealthRepairService({
		providers: async () => [
			{ providerId: 'archives.integrity', service: serviceKey<HealthRepairOwner>('health', 'review-repairs') },
		],
		acquire: async () => ({
			revoked: new AbortController().signal,
			value: {
				preview: async () => {
					await previewWait;
					return { id: 'proposal', kind: 'rebuild-index', expectedHash: 'a'.repeat(64), affected: 1 };
				},
				commit: async (input: Parameters<HealthRepairOwner['commit']>[0]) => ({
					operationId: input.operationId,
					kind: 'rebuild-index',
					committed: true,
					rechecked: true,
					status: 'verified',
				}),
				recover: async () => {
					throw new Error('unused');
				},
			},
		}),
		report: () => scanner.snapshot.report,
		now: () => now,
		id: () => `plan-${++seq}`,
		notify: async () => {},
	});
	fixtures.push({ scanner, repairs });
	await scanner.scan();
	const port = {
		scanner,
		repairs,
		getReport: (id?: string) => (!id || id === scanner.snapshot.report?.id ? scanner.snapshot.report : undefined),
		openNotifications: () => {},
	};
	const view = render(
		<TestProviders>
			<HealthPage port={port} section="repair" navigate={() => {}} />
		</TestProviders>,
	);
	return {
		scanner,
		repairs,
		port,
		view,
		setWait: (p: Promise<void>) => {
			previewWait = p;
		},
		advance: (ms: number) => {
			now += ms;
		},
	};
}
test('late plan error from old report cannot appear on an externally completed new scan', async () => {
	const f = await healthPage(),
		blocked = gate();
	f.setWait(blocked.promise);
	fireEvent.click(screen.getByRole('button', { name: 'Generate repair plan' }));
	const oldReport = f.scanner.snapshot.report!.id;
	const other = render(
		<TestProviders>
			<HealthPage port={f.port} navigate={() => {}} />
		</TestProviders>,
	);
	fireEvent.click(within(other.container).getByRole('button', { name: 'Rescan' }));
	await waitFor(() => expect(f.scanner.snapshot.report?.id).not.toBe(oldReport));
	await act(async () => {
		blocked.resolve();
	});
	await waitFor(() =>
		expect(
			within(f.view.container).getByRole('button', { name: 'Generate repair plan' }).hasAttribute('disabled'),
		).toBe(false),
	);
	expect(screen.queryByRole('alert')).toBeNull();
	expect(within(f.view.container).queryByText('Impact preview')).toBeNull();
	expect(within(f.view.container).queryByText('Cancelled')).toBeNull();
	fireEvent.click(within(f.view.container).getByRole('button', { name: 'Generate repair plan' }));
	await within(f.view.container).findByText('Impact preview');
});
test('expired repair preview is discarded with an explicit regeneration path', async () => {
	const f = await healthPage();
	fireEvent.click(screen.getByRole('button', { name: 'Generate repair plan' }));
	await screen.findByText('Impact preview');
	fireEvent.click(screen.getByRole('button', { name: 'Review confirmation' }));
	f.advance(300001);
	fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirm this repair' }));
	await screen.findByRole('alert');
	expect(screen.queryByText('Impact preview')).toBeNull();
	expect(screen.getByRole('alert').textContent).toContain('expired or the data changed');
	fireEvent.click(screen.getByRole('button', { name: 'Generate repair plan' }));
	await screen.findByText('Impact preview');
	fireEvent.click(screen.getByRole('button', { name: 'Review confirmation' }));
	fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirm this repair' }));
	await screen.findByRole('heading', { name: 'Repair and recheck complete' });
	expect(f.repairs.results).toHaveLength(1);
});

test('the preview deadline prevents opening an expired confirmation and preserves selections', async () => {
	const f = await healthPage();
	fireEvent.click(screen.getByRole('button', { name: 'Generate repair plan' }));
	await screen.findByText('Impact preview');
	vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300001);
	fireEvent.click(screen.getByRole('button', { name: 'Review confirmation' }));
	expect(screen.queryByRole('alertdialog')).toBeNull();
	expect(screen.queryByText('Impact preview')).toBeNull();
	expect(screen.getByRole('button', { name: 'Generate repair plan' })).toBeTruthy();
	expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
	expect(f.repairs.results).toEqual([]);
});

test('a new resolved report resets old repair exclusions and an ordinary rescan still navigates', async () => {
	const f = await healthPage();
	fireEvent.click(screen.getByRole('checkbox'));
	expect(screen.queryByRole('button', { name: 'Generate repair plan' })).toBeNull();
	const navigate = vi.fn();
	const other = render(
		<TestProviders>
			<HealthPage port={f.port} navigate={navigate} />
		</TestProviders>,
	);
	fireEvent.click(within(other.container).getByRole('button', { name: 'Rescan' }));
	await waitFor(() => expect(navigate).toHaveBeenCalledWith('scan', f.scanner.snapshot.report!.id));
	await waitFor(() =>
		expect(within(f.view.container).getByRole('checkbox').getAttribute('aria-checked')).toBe('true'),
	);
	expect(within(f.view.container).getByRole('button', { name: 'Generate repair plan' })).toBeTruthy();
});
