import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { setLanguage } from '../../../../shared/i18n';
import { TestProviders } from '../../../../ui/react/test-providers';
import { EXCLUSION_CATEGORIES, type ManifestEntry } from '../../core/backup/format';
import { BackupError, type ImportReport, type PackageView, type PlanView } from '../../core/backup/model';
import type { BackupActions } from '../../services/backup/actions';
import { messages } from '../../../../shared/i18n/lazy/backup';
import { BackupSection } from './BackupSection';

beforeEach(() => setLanguage('en'));

const entry = (
	id: string,
	section: ManifestEntry['section'],
	device: string | null,
	count?: number,
): ManifestEntry => ({
	id,
	section,
	device,
	sha256: 'a'.repeat(64),
	bytes: 10,
	...(count === undefined ? {} : { count }),
	via: 'live',
});
const view = (devices = ['dev-a']): PackageView => ({
	createdAt: Date.UTC(2026, 9, 27),
	vaultName: 'Source vault',
	sourceDevice: 'dev-a',
	devices,
	digest: 'd'.repeat(64),
	manifest: {
		entries: [
			entry('e0', 'workbench-records', 'dev-a', 3),
			entry('e1', 'automation-runtime', 'dev-a', 4),
			entry('e2', 'automation-definition', null),
			entry('e3', 'automation-definition', null),
		],
		exclusions: EXCLUSION_CATEGORIES,
		notes: [{ code: 'definition-extra-files', count: 2 }],
	},
});
const plan = (over: Partial<PlanView> = {}): PlanView => ({
	adoptDevice: 'dev-a',
	problems: [],
	warnings: [{ code: 'automations-disabled', count: 2 }],
	outcomes: [
		{ section: 'workbench-records', device: 'dev-b', path: 'p', action: 'create', count: 3 },
		{ section: 'automation-definition', device: null, path: 'x', action: 'create' },
		{ section: 'automation-definition', device: null, path: 'y', action: 'create' },
	],
	batches: 2,
	unchanged: false,
	disabledAutomations: [],
	reauthorize: [],
	...over,
});
const report = (over: Partial<ImportReport> = {}): ImportReport => ({
	format: 1,
	packageDigest: 'd',
	finishedAt: 1,
	status: 'done',
	batches: [{ key: 'core-0', status: 'done' }],
	disabledAutomations: [{ id: 'a', name: 'Daily review' }],
	reauthorize: [{ spaceId: 's', name: 'External', path: '/home/x/project' }],
	warnings: [],
	...over,
});
function actions(over: Partial<BackupActions> = {}): BackupActions {
	return {
		device: 'dev-b',
		exportPackage: vi.fn(async () => ({ path: '.huhu/exports/huhu-backup-1.json', view: view() })),
		inspect: vi.fn(async () => view()),
		preflight: vi.fn(async () => plan()),
		runImport: vi.fn(async () => ({ status: 'done' as const, changed: 9, report: report() })),
		lastReport: vi.fn(async () => undefined),
		...over,
	};
}
const show = (load: () => Promise<BackupActions | undefined>) =>
	render(
		<TestProviders>
			<BackupSection load={load} />
		</TestProviders>,
	);
const choose = (name = 'huhu-backup.json') => {
	const input = screen.getByLabelText('Choose a backup file') as HTMLInputElement;
	const file = new File(['{"package":true}'], name, { type: 'application/json' });
	fireEvent.change(input, { target: { files: [file] } });
};

test('has a polite loading status, then the three areas; unavailable hosts explain themselves', async () => {
	let resolve!: (a: BackupActions) => void;
	const { unmount } = show(() => new Promise((r) => (resolve = r)));
	expect(screen.getByRole('status').textContent).toBe('Preparing…');
	resolve(actions());
	expect(await screen.findByRole('button', { name: 'Export a backup' })).toBeTruthy();
	expect(screen.getByText('No import has been run in this vault.')).toBeTruthy();
	unmount();
	show(async () => undefined);
	expect(await screen.findByText(/need the desktop app/)).toBeTruthy();
});

test('a failing load shows an alert, not an empty page', async () => {
	show(() => Promise.reject(new Error('no host')));
	expect((await screen.findByRole('alert')).textContent).toContain('no host');
});

test('export shows where the file is and the real manifest with every omission', async () => {
	const a = actions();
	show(async () => a);
	fireEvent.click(await screen.findByRole('button', { name: 'Export a backup' }));
	expect(await screen.findByText('Saved to .huhu/exports/huhu-backup-1.json')).toBeTruthy();
	expect(screen.getByText(/Spaces, sessions, layouts, mailbox and acknowledgements · dev-a · 3 items/)).toBeTruthy();
	// Definition documents are one line, not one per document.
	expect(screen.getAllByText(/Automation definitions · shared · 2 items/)).toHaveLength(1);
	for (const category of EXCLUSION_CATEGORIES)
		expect(
			screen.getByText(messages.en[`agent.backup.exclusion.${category}` as keyof typeof messages.en]),
		).toBeTruthy();
	expect(screen.getByText('2 extra files next to definitions were left out.')).toBeTruthy();
});

test('a failed export keeps a retry entry with the reason and the recovery location', async () => {
	const exportPackage = vi
		.fn<BackupActions['exportPackage']>()
		.mockRejectedValueOnce(new BackupError('busy', { busy: ['Running now'] }))
		.mockResolvedValueOnce({ path: 'p.json', view: view() });
	show(async () => actions({ exportPackage }));
	fireEvent.click(await screen.findByRole('button', { name: 'Export a backup' }));
	const alert = await screen.findByRole('alert');
	expect(alert.textContent).toContain('Stop the running work first: Running now.');
	expect(alert.textContent).toContain('(busy)');
	expect(alert.textContent).toContain('.huhu/recovery/transaction/');
	fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
	expect(await screen.findByText('Saved to p.json')).toBeTruthy();
	expect(screen.queryByRole('alert')).toBeNull();
});

test('import: verify, choose the source device, check, then import; nothing is imported before the check passes', async () => {
	const a = actions({ inspect: vi.fn(async () => view(['dev-a', 'dev-c'])) });
	show(async () => a);
	await screen.findByRole('button', { name: 'Export a backup' });
	choose();
	expect(await screen.findByText('Contents of the file')).toBeTruthy();
	const run = screen.getByRole('button', { name: 'Import now' }) as HTMLButtonElement;
	expect(run.disabled).toBe(true);
	// This device is not in the file and there are two devices: the choice is explicit.
	const select = screen.getByLabelText('Use the data of device') as HTMLSelectElement;
	expect(select.value).toBe('');
	fireEvent.change(select, { target: { value: 'dev-a' } });
	fireEvent.click(screen.getByLabelText('Also restore the other devices as separate archives'));
	fireEvent.click(screen.getByRole('button', { name: 'Check before importing' }));
	await screen.findByText('What will happen');
	expect(a.preflight).toHaveBeenCalledWith('{"package":true}', {
		adoptDevice: 'dev-a',
		includeDevices: ['dev-c'],
		archiveMissingDirectories: false,
	});
	expect(a.runImport).not.toHaveBeenCalled();
	expect(screen.getByText(/2 automations were enabled in the file/)).toBeTruthy();
	expect(screen.getByText('Spaces, sessions, layouts, mailbox and acknowledgements: will be created')).toBeTruthy();
	expect(screen.getByText('Automation definitions ×2: will be created')).toBeTruthy();
	expect(run.disabled).toBe(false);
	// Changing a choice invalidates the check.
	fireEvent.click(screen.getByLabelText('Import Spaces whose folder is missing here as archived'));
	expect(screen.queryByText('What will happen')).toBeNull();
	expect(run.disabled).toBe(true);
	fireEvent.click(screen.getByRole('button', { name: 'Check before importing' }));
	await screen.findByText('What will happen');
	fireEvent.click(run);
	expect(await screen.findByText('Imported. 9 files were replaced; nothing was started or sent.')).toBeTruthy();
	expect(a.runImport).toHaveBeenCalledTimes(1);
	expect(a.lastReport).toHaveBeenCalledTimes(2);
});

test('this device is preselected when the file has it; conflicts block the import and are explained', async () => {
	const conflicting = plan({
		problems: [
			{
				code: 'identity-collision',
				section: 'notifications-inbox',
				device: 'dev-a',
				subject: '.huhu/notifications/dev-b/inbox.json',
			},
		],
	});
	const a = actions({ inspect: vi.fn(async () => view(['dev-b'])), preflight: vi.fn(async () => conflicting) });
	show(async () => a);
	await screen.findByRole('button', { name: 'Export a backup' });
	choose();
	await screen.findByText('Contents of the file');
	expect((screen.getByLabelText('Use the data of device') as HTMLSelectElement).value).toBe('dev-b');
	expect(screen.queryByLabelText('Also restore the other devices as separate archives')).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: 'Check before importing' }));
	const alert = await screen.findByRole('alert');
	expect(alert.textContent).toContain('already has different data in .huhu/notifications/dev-b/inbox.json');
	expect((screen.getByRole('button', { name: 'Import now' }) as HTMLButtonElement).disabled).toBe(true);
});

test('a damaged file is refused with its reason and no import controls', async () => {
	const a = actions({
		inspect: vi.fn(async () => {
			throw new BackupError('package-invalid', { packageCode: 'digest-mismatch' });
		}),
	});
	show(async () => a);
	await screen.findByRole('button', { name: 'Export a backup' });
	choose('broken.json');
	const alert = await screen.findByRole('alert');
	expect(alert.textContent).toContain('damaged or was edited: its digest does not match');
	expect(screen.queryByRole('button', { name: 'Import now' })).toBeNull();
});

test('a partial import says how far it got and the retry continues it', async () => {
	const runImport = vi
		.fn<BackupActions['runImport']>()
		.mockRejectedValueOnce(new BackupError('partial-import', { done: 2, total: 4, failure: 'write-failed' }))
		.mockResolvedValueOnce({ status: 'done', changed: 5, report: report() });
	const lastReport = vi
		.fn<BackupActions['lastReport']>()
		.mockResolvedValueOnce(undefined)
		.mockResolvedValueOnce(
			report({
				status: 'partial',
				errorCode: 'write-failed',
				batches: [
					{ key: 'a', status: 'done' },
					{ key: 'b', status: 'pending' },
				],
			}),
		)
		.mockResolvedValue(report());
	show(async () => actions({ runImport, lastReport }));
	await screen.findByRole('button', { name: 'Export a backup' });
	choose();
	await screen.findByText('Contents of the file');
	fireEvent.click(screen.getByRole('button', { name: 'Check before importing' }));
	await screen.findByText('What will happen');
	fireEvent.click(screen.getByRole('button', { name: 'Import now' }));
	const alert = await screen.findByRole('alert');
	expect(alert.textContent).toContain('The import stopped after 2 of 4 steps.');
	expect(alert.textContent).toContain('partial-import:write-failed');
	expect(alert.textContent).toContain('Running the same import again continues after them.');
	expect(await screen.findByText(/Stopped part-way/)).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
	expect(await screen.findByText('Imported. 5 files were replaced; nothing was started or sent.')).toBeTruthy();
	await waitFor(() => expect(screen.getByText('Folders to authorize again:')).toBeTruthy());
	expect(screen.getByText('Daily review')).toBeTruthy();
	expect(screen.getByText(/External — \/home\/x\/project/)).toBeTruthy();
});

test('the Chinese dictionary has exactly the English keys and the same placeholders', () => {
	expect(Object.keys(messages.zh).sort()).toEqual(Object.keys(messages.en).sort());
	const holes = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
	for (const key of Object.keys(messages.en) as Array<keyof typeof messages.en>)
		expect(holes(messages.zh[key]), key).toEqual(holes(messages.en[key]));
	setLanguage('zh');
	show(async () => actions());
	return screen.findByRole('button', { name: '导出备份' });
});
