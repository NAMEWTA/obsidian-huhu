import { beforeEach, expect, test } from 'vitest';
import { setLanguage } from '../../../../shared/i18n';
import { render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import type { LegacyImportState, LegacyImportView } from '../../services/migrations/legacy-workbench';
import { LegacyImportSection } from './LegacyImportSection';

beforeEach(() => setLanguage('en'));
const source = (state: 'absent' | 'present') => ({ path: 'p', state, copied: false });
const state = (overrides: Partial<LegacyImportState> = {}): LegacyImportState => ({
	version: 1,
	operationId: 'o',
	completedAt: 1,
	deviceId: 'd',
	vaultId: 'v',
	sources: {
		workspace: source('present'),
		history: source('present'),
		stats: source('absent'),
		workspaceStats: source('absent'),
		automationSessions: source('absent'),
		accountIndex: source('present'),
	},
	layout: {
		status: 'importable',
		counts: { tabs: 4, terminal: 2, browser: 1, page: 1, groups: 2, closedTabs: 1, panes: 4 },
		spaceId: 'legacy-import-x',
		spaceCreated: true,
	},
	annotations: { total: 3, attributable: 2, unattributable: 1 },
	unboundBusinessKept: true,
	...overrides,
});
const view = (s = state(), sourceChanged = false): LegacyImportView => ({ state: s, sourceChanged });
const problem = (p: NonNullable<LegacyImportView['problem']>): LegacyImportView => ({
	sourceChanged: false,
	problem: p,
});
const show = (load: () => Promise<LegacyImportView | undefined>) =>
	render(
		<TestProviders>
			<LegacyImportSection load={load} />
		</TestProviders>,
	);

test('shows a polite loading status, then the counted report, kept items, unbound notice and rollback guidance', async () => {
	let resolve!: (v: LegacyImportView) => void;
	show(
		() =>
			new Promise((r) => {
				resolve = r;
			}),
	);
	expect(screen.getByRole('status').textContent).toMatch(/Reading the import report/);
	resolve(view());
	await waitFor(() =>
		expect(screen.getByText(/Imported 4 tabs in 2 groups \(2 terminal, 1 web, 1 page\)/)).toBeTruthy(),
	);
	expect(screen.getByText(/1 of 3 history annotations have no known account/)).toBeTruthy();
	expect(screen.getByText(/Web tabs are in the Import Space/)).toBeTruthy();
	expect(screen.getByText(/retired account index/)).toBeTruthy();
	expect(screen.getByText(/stay unbound/)).toBeTruthy();
	expect(screen.getByText(/Nothing was deleted/)).toBeTruthy();
	expect(screen.queryByText(/changed after the import/)).toBeNull();
});

test('empty state when nothing was imported', async () => {
	show(async () => undefined);
	await waitFor(() => expect(screen.getByText(/No legacy workbench data/)).toBeTruthy());
});

test('a damaged legacy layout is explained and a changed source is flagged', async () => {
	const damaged = state({
		layout: {
			status: 'corrupt',
			counts: { tabs: 0, terminal: 0, browser: 0, page: 0, groups: 0, closedTabs: 0, panes: 0 },
			spaceCreated: false,
		},
	});
	show(async () => view(damaged, true));
	await waitFor(() => expect(screen.getByText(/old layout is damaged/)).toBeTruthy());
	expect(screen.getByText(/changed after the import/)).toBeTruthy();
});

test('a failing read is announced as an alert', async () => {
	show(async () => {
		throw new Error('disk offline');
	});
	await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/disk offline/));
});

test('the Chinese dictionary is complete for the report', async () => {
	setLanguage('zh');
	show(async () => view());
	await waitFor(() => expect(screen.getByText(/已将 2 个分组中的 4 个标签/)).toBeTruthy());
	expect(screen.getByText(/保持未绑定/)).toBeTruthy();
});

test.each([
	[{ kind: 'refused', reason: 'records-scope-mismatch' }, /identity of this vault changed.*Nothing was changed/],
	[{ kind: 'refused', reason: 'records-invalid' }, /workbench-v2.json is missing, damaged or from a newer version/],
	[{ kind: 'marker-unreadable' }, /legacy-import.json is unreadable/],
	[{ kind: 'busy' }, /Another HUHU window.*postponed/],
	[{ kind: 'failed', code: 'WRITE_FAILED' }, /failed and was rolled back \(WRITE_FAILED\)/],
	[{ kind: 'pending' }, /not been imported yet/],
] as const)('a refused or failed import is explained as an alert with the next step: %j', async (p, text) => {
	show(async () => problem(p));
	await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(text));
	expect(screen.queryByText(/No legacy workbench data/)).toBeNull();
});

test('a damaged legacy source shows how to import again after repairing it', async () => {
	const damaged = state({
		layout: {
			status: 'corrupt',
			counts: { tabs: 0, terminal: 0, browser: 0, page: 0, groups: 0, closedTabs: 0, panes: 0 },
			spaceCreated: false,
		},
	});
	show(async () => view(damaged));
	await waitFor(() => expect(screen.getByText(/delete legacy-import.json/)).toBeTruthy());
});

test('the problem texts exist in Chinese', async () => {
	setLanguage('zh');
	show(async () => problem({ kind: 'refused', reason: 'records-scope-mismatch' }));
	await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/没有导入.*身份变了/));
});
