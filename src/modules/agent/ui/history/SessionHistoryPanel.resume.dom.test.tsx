import { expect, test, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'zustand/vanilla';
import { HuhuProviders } from '../../../../ui/react/providers';
import { t } from '../../../../shared/i18n';
import type { AgentController } from '../../services/controller';
import type { HistoryRow } from '../../services/history-store';
import { NativeResumeError } from '../../services/launch/native-resume';
import { SessionHistoryPanel } from './SessionHistoryPanel';

vi.mock('../sidebar/AgentSidebar', () => ({ shortPath: (path: string) => path }));
vi.mock('@tanstack/react-virtual', () => ({
	useVirtualizer: (options: { count: number; getItemKey: (index: number) => string }) => ({
		getTotalSize: () => options.count * 64,
		measureElement: () => {},
		getVirtualItems: () =>
			Array.from({ length: options.count }, (_, index) => ({
				index,
				key: options.getItemKey(index),
				start: index * 64,
			})),
	}),
}));

const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false };
const row = (key: string, sourceRef: string, extra: Partial<HistoryRow> = {}): HistoryRow =>
	({
		key,
		agentId: 'codex',
		accountKey: '{}',
		sessionId: key,
		cwd: '/work/project',
		title: `title-${key}`,
		transcriptPath: key,
		modifiedAtMs: 1,
		usage,
		sourceRef,
		sourceStatus: 'available',
		metadata: {},
		inVault: true,
		messageCount: 1,
		firstPrompt: '',
		turns: [],
		previewState: 'ready',
		...extra,
	}) as unknown as HistoryRow;

function fixture(rows: HistoryRow[]) {
	const spaces = createStore(() => ({
		records: { spaces: { a: { id: 'a', name: 'Alpha', archived: false } }, historyOwners: { 'ref-owned': 'a' } },
	}));
	const store = createStore(() => ({ rows, loading: false, error: '', warnings: [] as string[] }));
	const resume = vi.fn(async (_row: HistoryRow): Promise<unknown> => ({ mode: 'resumed' }));
	const importHistory = vi.fn(async (_row: HistoryRow): Promise<unknown> => ({ created: true }));
	const controller = {
		spaces: { store: spaces },
		historyStore: { store, refresh: vi.fn(async () => {}), preview: vi.fn(async () => {}), annotate: vi.fn() },
		resume,
		importHistory,
		workspace: { report: vi.fn() },
	} as unknown as AgentController;
	render(
		<HuhuProviders ownerDocument={document} visible>
			<SessionHistoryPanel controller={controller} close={() => {}} />
		</HuhuProviders>,
	);
	return { resume, importHistory };
}
const article = (key: string) => document.querySelector<HTMLElement>(`[data-history-row="${key}"]`)!;
async function open(user: ReturnType<typeof userEvent.setup>, key: string) {
	await user.click(article(key).querySelector('button[aria-expanded]')!);
	return article(key);
}

test('continue asks for confirmation naming the directory; cancel starts nothing, Escape cancels too', async () => {
	const f = fixture([row('owned', 'ref-owned')]);
	const user = userEvent.setup();
	const card = await open(user, 'owned');
	await user.click(within(card).getByRole('button', { name: t('agent.historyResume.continue') }));
	const group = within(card).getByRole('group', { name: t('agent.historyResume.confirmTitle') });
	expect(group.textContent).toContain('/work/project');
	// The confirm button takes focus so the flow works by keyboard alone.
	expect(document.activeElement).toBe(
		within(group).getByRole('button', { name: t('agent.historyResume.confirmAction') }),
	);
	await user.click(within(group).getByRole('button', { name: t('common.cancel') }));
	expect(within(card).queryByRole('group')).toBeNull();
	expect(f.resume).not.toHaveBeenCalled();
	await user.click(within(card).getByRole('button', { name: t('agent.historyResume.continue') }));
	await user.keyboard('{Escape}');
	expect(within(card).queryByRole('group')).toBeNull();
	expect(f.resume).not.toHaveBeenCalled();
});

test('confirming shows a loading state, ignores a second activation, then reports the outcome', async () => {
	const f = fixture([row('owned', 'ref-owned')]);
	let finish!: (value: unknown) => void;
	f.resume.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
	const user = userEvent.setup();
	const card = await open(user, 'owned');
	await user.click(within(card).getByRole('button', { name: t('agent.historyResume.continue') }));
	await user.click(within(card).getByRole('button', { name: t('agent.historyResume.confirmAction') }));
	expect(within(card).getByRole('status').textContent).toBe(t('agent.historyResume.working'));
	const button = within(card).getByRole('button', { name: t('agent.historyResume.continue') }) as HTMLButtonElement;
	expect(button.disabled).toBe(true);
	await user.click(button);
	expect(f.resume).toHaveBeenCalledTimes(1);
	await act(async () => finish({ mode: 'attached' }));
	expect(within(card).getByRole('status').textContent).toContain(t('agent.historyResume.attached'));
});

test('a conflict or refusal is an explicit alert that can be dismissed, and the row stays', async () => {
	const f = fixture([row('owned', 'ref-owned')]);
	f.resume.mockRejectedValueOnce(new NativeResumeError('OWNER_CONFLICT', 'occupied'));
	const user = userEvent.setup();
	const card = await open(user, 'owned');
	await user.click(within(card).getByRole('button', { name: t('agent.historyResume.continue') }));
	await user.click(within(card).getByRole('button', { name: t('agent.historyResume.confirmAction') }));
	const alert = await within(card).findByRole('alert', {}, { timeout: 2000 });
	expect(alert.textContent).toContain(t('agent.historyResume.error.occupied'));
	await user.click(within(alert).getByRole('button', { name: t('agent.historyResume.dismiss') }));
	expect(within(card).queryByRole('alert')).toBeNull();
	expect(article('owned')).toBeTruthy();
});

test('an unassigned row offers explicit import; an owned row does not; a missing source cannot be continued', async () => {
	const f = fixture([
		row('free', 'ref-free'),
		row('owned', 'ref-owned'),
		row('lost', 'ref-lost', { sourceStatus: 'missing' }),
	]);
	const user = userEvent.setup();
	const free = await open(user, 'free');
	expect(within(free).getByText(t('agent.historyResume.unassignedNote'))).toBeTruthy();
	await user.click(within(free).getByRole('button', { name: t('agent.historyResume.import') }));
	expect(f.importHistory).toHaveBeenCalledTimes(1);
	expect(await within(free).findByText(t('agent.historyResume.imported'))).toBeTruthy();
	const owned = await open(user, 'owned');
	expect(within(owned).queryByRole('button', { name: t('agent.historyResume.import') })).toBeNull();
	const lost = await open(user, 'lost');
	expect(
		(within(lost).getByRole('button', { name: t('agent.historyResume.continue') }) as HTMLButtonElement).disabled,
	).toBe(true);
	// A cancelled chooser (undefined result) leaves no message and no error.
	f.importHistory.mockResolvedValueOnce(undefined);
	await user.click(within(free).getByRole('button', { name: t('agent.historyResume.import') }));
	expect(f.importHistory).toHaveBeenCalledTimes(2);
});

test('L5: cancel and Escape return focus to Continue, and the row menu cannot start an unavailable source', async () => {
	const f = fixture([row('owned', 'ref-owned'), row('lost', 'ref-lost', { sourceStatus: 'missing' })]);
	const user = userEvent.setup();
	const card = await open(user, 'owned');
	const trigger = within(card).getByRole('button', { name: t('agent.historyResume.continue') });
	await user.click(trigger);
	await user.click(within(card).getByRole('button', { name: t('common.cancel') }));
	expect(document.activeElement).toBe(trigger);
	await user.click(trigger);
	await user.keyboard('{Escape}');
	expect(document.activeElement).toBe(trigger);
	expect(f.resume).not.toHaveBeenCalled();
	// The row menu mirrors the button: no Continue for a missing source.
	await user.click(within(article('lost')).getByRole('button', { name: t('agent.historyUI.actions') }));
	const item = await screen.findByRole('menuitem', { name: t('agent.historyResume.continue') });
	expect(item.getAttribute('aria-disabled') ?? item.getAttribute('data-disabled')).not.toBeNull();
});
