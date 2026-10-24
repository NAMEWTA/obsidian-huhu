import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { toast } from 'sonner';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { nowMoment } from '../../../../host/obsidian/datetime';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
import { setLanguage, t } from '../../../../shared/i18n';
import { TestProviders } from '../../../../ui/react/test-providers';
import { generateDefaultMarkdown } from '../../core/board/parser/default-document';
import { DEFAULT_DASHBOARD_SETTINGS } from '../../core/board/types/model';
import { BoardStore } from '../../services/board-store';
import type { HomeHost } from '../../services/home-host';
import { InboxSection } from './InboxSection';

vi.mock('sonner', () => ({ toast: vi.fn(), Toaster: () => null }));
vi.mock('../../services/instances', () => ({ homeServices: {} }));

const board = '.huhu/dashboards/board.md';
const stores: BoardStore[] = [];
const day = () => nowMoment().format('YYYY-MM-DD');
const properties = '---\n状态: 在用\ntags:\n  - \n---\n';

beforeEach(() => vi.mocked(toast).mockClear());
afterEach(async () => {
	cleanup();
	for (const store of stores.splice(0)) await store.dispose();
});

async function scene(initial: Record<string, string> = {}, memoSavePath = 'huhu/收件箱') {
	setLanguage('zh');
	const vault = memoryVault({ [board]: generateDefaultMarkdown(), ...initial }, window);
	await contentFiles(vault.app).refresh();
	const host = {
		app: vault.app,
		settings: { ...structuredClone(DEFAULT_DASHBOARD_SETTINGS), memoSavePath },
		subscribeSettings: () => () => {},
		workbenchRefresh: () => {},
	} as unknown as HomeHost;
	const store = new BoardStore(host, '.huhu/dashboards/board', window);
	stores.push(store);
	await store.init();
	const open = vi.spyOn(store, 'openFile').mockResolvedValue();
	const trash = vi.spyOn(store, 'trash').mockResolvedValue();
	const view = render(
		<TestProviders>
			<InboxSection store={store} />
		</TestProviders>,
	);
	return { vault, store, open, trash, view };
}
const rows = () => [...document.querySelectorAll<HTMLElement>('[data-inbox-item]')];

test('the list is the files of the inbox folder, most recently modified first; day files are marked; a click opens in a new tab', async () => {
	const { vault, open } = await scene({
		'huhu/收件箱/2026-09-02-0830-旧的.md': '',
		'huhu/收件箱/2026-10-19-1405-买牛奶.md': '',
		'huhu/收件箱/2026-10-20-闪念.md': '- 09:00 想法\n',
		'其他/2026-10-20-0900-无关.md': '',
	});
	expect(vault.contents.size).toBe(5);
	expect(rows()).toHaveLength(3);
	const capture = rows().find((row) => row.hasAttribute('data-capture-file'))!;
	expect(capture.textContent).toContain(t('home.inbox.captureDay', { date: '2026-10-20' }));
	expect(rows().map((row) => row.textContent).join('|')).toContain('买牛奶');
	expect(document.body.textContent).not.toContain('无关');
	fireEvent.click(within(rows().find((row) => row.textContent?.includes('买牛奶'))!).getByText('买牛奶'));
	expect(open).toHaveBeenCalledWith('huhu/收件箱/2026-10-19-1405-买牛奶.md');
});

test('an empty inbox says so in one line and the capture strip stays at the foot', async () => {
	const { view } = await scene();
	expect(rows()).toHaveLength(0);
	expect(view.container.querySelector('[data-inbox-empty]')?.textContent).toBe(t('home.inbox.empty'));
	const root = view.container.querySelector('[data-inbox]')!;
	const children = [...root.children].filter((child) => !child.hasAttribute('data-slot'));
	expect(children.at(-1)?.hasAttribute('data-capture-composer')).toBe(true);
	expect(screen.getByRole('textbox', { name: t('home.inbox.composer') })).toBeTruthy();
});

test('New item opens a field at the top of the list: Enter creates the dated note with the default properties and opens it, Escape cancels', async () => {
	const { vault, open } = await scene();
	fireEvent.click(screen.getByRole('button', { name: t('home.inbox.new') }));
	const field = screen.getByRole('textbox', { name: t('home.inbox.newLabel') });
	fireEvent.keyDown(field, { key: 'Escape' });
	expect(screen.queryByRole('textbox', { name: t('home.inbox.newLabel') })).toBeNull();
	expect(open).not.toHaveBeenCalled();

	fireEvent.click(screen.getByRole('button', { name: t('home.inbox.new') }));
	const named = screen.getByRole('textbox', { name: t('home.inbox.newLabel') });
	fireEvent.change(named, { target: { value: '买 牛奶' } });
	fireEvent.keyDown(named, { key: 'Enter', isComposing: true });
	expect(open).not.toHaveBeenCalled();
	fireEvent.keyDown(named, { key: 'Enter' });
	await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
	const made = [...vault.contents.keys()].filter((path) => path.startsWith('huhu/收件箱/'));
	expect(made).toHaveLength(1);
	expect(made[0]).toMatch(/^huhu\/收件箱\/\d{4}-\d{2}-\d{2}-\d{4}-买-牛奶\.md$/);
	expect(vault.contents.get(made[0]!)).toBe(properties);
	expect(open).toHaveBeenCalledWith(made[0]);
	expect(screen.queryByRole('textbox', { name: t('home.inbox.newLabel') })).toBeNull();

	fireEvent.click(screen.getByRole('button', { name: t('home.inbox.new') }));
	fireEvent.keyDown(screen.getByRole('textbox', { name: t('home.inbox.newLabel') }), { key: 'Enter' });
	await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
	expect([...vault.contents.keys()].some((path) => new RegExp(`-${t('home.inbox.defaultTitle')}\\.md$`).test(path))).toBe(true);
});

test('a capture goes to the day file, clears the draft, says so and shows up in today\'s column and the count; the newest is on top', async () => {
	const { vault } = await scene();
	const box = screen.getByRole('textbox', { name: t('home.inbox.composer') }) as HTMLTextAreaElement;
	const send = screen.getByRole('button', { name: t('home.inbox.send') });
	expect((send as HTMLButtonElement).disabled).toBe(true);
	fireEvent.change(box, { target: { value: '第一条' } });
	fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
	fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
	expect([...vault.contents.keys()].some((path) => path.endsWith('闪念.md'))).toBe(false);
	fireEvent.keyDown(box, { key: 'Enter' });
	const path = `huhu/收件箱/${day()}-闪念.md`;
	await waitFor(() => expect(vault.contents.get(path)).toMatch(/- \d{2}:\d{2} 第一条\n$/));
	expect(vault.contents.get(path)!.startsWith(properties)).toBe(true);
	await waitFor(() => expect(box.value).toBe(''));
	expect(toast).toHaveBeenCalledWith(t('home.inbox.captured'));
	fireEvent.change(box, { target: { value: '第二条\n换行' } });
	fireEvent.click(send);
	await waitFor(() => expect(vault.contents.get(path)).toMatch(/第一条\n- \d{2}:\d{2} 第二条\n {2}换行\n$/));
	await waitFor(() => expect(document.querySelector('[data-inbox-captures]')?.querySelectorAll('button')).toHaveLength(2));
	const today = document.querySelector('[data-inbox-captures]') as HTMLElement;
	const entries = within(today).getAllByRole('button').map((entry) => entry.textContent ?? '');
	expect(entries[0]).toContain('第二条');
	expect(entries[1]).toContain('第一条');
	expect(screen.getByRole('button', { name: t('home.inbox.todayCount', { count: 2 }) })).toBeTruthy();
	// the day file is one more row of the list, marked as captures
	await waitFor(() => expect(rows().some((row) => row.hasAttribute('data-capture-file'))).toBe(true));
});

test('today\'s column reads the day file that is already there, and clicking an entry opens that file', async () => {
	const path = `huhu/收件箱/${day()}-闪念.md`;
	const { open } = await scene({ [path]: `${properties}- 09:12 买牛奶\n- 10:30 第一行\n  第二行\n` });
	await waitFor(() => expect(document.querySelector('[data-inbox-captures]')).toBeTruthy());
	const today = document.querySelector('[data-inbox-captures]') as HTMLElement;
	const entries = within(today).getAllByRole('button');
	expect(entries).toHaveLength(2);
	expect(entries[0]!.textContent).toContain('10:30');
	expect(entries[0]!.textContent).toContain('第一行');
	expect(entries[1]!.textContent).toContain('买牛奶');
	fireEvent.click(entries[1]!);
	expect(open).toHaveBeenCalledWith(path);
});

test('the draft survives a remount and a failed capture keeps it', async () => {
	const { store, view } = await scene();
	vi.spyOn(store, 'capture').mockRejectedValue(new Error('offline'));
	const box = () => screen.getByRole('textbox', { name: t('home.inbox.composer') }) as HTMLTextAreaElement;
	fireEvent.change(box(), { target: { value: '没发出去' } });
	view.unmount();
	render(
		<TestProviders>
			<InboxSection store={store} />
		</TestProviders>,
	);
	expect(box().value).toBe('没发出去');
	fireEvent.keyDown(box(), { key: 'Enter' });
	await waitFor(() => expect(toast).toHaveBeenCalledWith(t('storage.unsaved')));
	expect(box().value).toBe('没发出去');
});

test('delete asks first, then moves the file to the trash', async () => {
	const { trash } = await scene({ 'huhu/收件箱/2026-10-19-1405-买牛奶.md': '' });
	const row = rows()[0]!;
	fireEvent.click(within(row).getByRole('button', { name: t('home.inbox.delete') }));
	expect(trash).not.toHaveBeenCalled();
	const dialog = await screen.findByRole('alertdialog');
	expect(dialog.textContent).toContain(t('home.inbox.deleteConfirm', { name: '买牛奶' }));
	fireEvent.click(within(dialog).getByRole('button', { name: t('common.confirm') }));
	await waitFor(() => expect(trash).toHaveBeenCalledTimes(1));
	expect(trash.mock.calls[0]![0]).toMatchObject({ path: 'huhu/收件箱/2026-10-19-1405-买牛奶.md' });
});

test('the inbox folder is the one in the board settings, for items and for the day file alike', async () => {
	const { vault, store } = await scene({ 'Notes/Memos/2026-10-19-1405-别处.md': '' }, 'Notes/Memos');
	expect(rows()).toHaveLength(1);
	await store.capture('这里');
	expect([...vault.contents.keys()].some((path) => path === `Notes/Memos/${day()}-闪念.md`)).toBe(true);
});
