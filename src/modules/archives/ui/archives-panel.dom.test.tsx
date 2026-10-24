import { createRef } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../ui/react/test-providers';
import { SidePanel } from '../../../shell/panel/SidePanel';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import { setLanguage, t } from '../../../shared/i18n';
import { ContactsIndex } from '../core/index-store';
import { newRecord, type ArchiveRecord, type RecordKind } from '../core/model';
import { archivesWorkbench, type ArchivesPanelSource } from '../services/workbench';
import { navigateContacts, type ContactsNavigationSurface } from './navigate';
import { emptyPanelState, showContactKind } from './panel-state';

afterEach(() => setLanguage('zh'));

function record(name: string, kind: RecordKind = 'person'): ArchiveRecord {
	const value = newRecord(kind);
	value.fields.name = name;
	value.folderPath = `档案/${kind === 'person' ? '个人档案' : '企业档案'}/${name}`;
	value.path = value.folderPath + '/基本信息.md';
	return value;
}

function setup(records: ArchiveRecord[], target: WorkbenchTarget = { feature: 'contacts', section: 'person' }) {
	const index = new ContactsIndex();
	records.forEach((r) => index.set(r));
	const source: ArchivesPanelSource = { index, loading: false, ensureLoaded: vi.fn(async () => {}) };
	const service = archivesWorkbench(() => source);
	const navigate = vi.fn();
	const view = (next: WorkbenchTarget) =>
		render(
			<TestProviders>
				<SidePanel
					title="档案"
					model={service.panel(next)}
					current={next}
					customRef={createRef()}
					onNavigate={navigate}
					report={vi.fn()}
				/>
			</TestProviders>,
		);
	return { index, source, service, navigate, view: view(target), rerender: view };
}

test('the side panel is a tree of people and companies with counts and name-sorted records', () => {
	const { view } = setup([record('王五'), record('阿力'), record('张三'), record('示例科技', 'company')]);
	const tree = view.getByRole('tree', { name: t('workbench.contacts') });
	const rows = within(tree).getAllByRole('treeitem');
	expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
		t('workbench.people'),
		...[...['王五', '阿力', '张三']].sort((a, b) => a.localeCompare(b, 'zh', { numeric: true })),
		t('workbench.companies'),
		'示例科技',
	]);
	expect(within(rows[0]!).getByText('3')).toBeTruthy();
	expect(within(screen.getByRole('treeitem', { name: t('workbench.companies') })).getByText('1')).toBeTruthy();
	// Records show the first character as their avatar.
	expect(within(screen.getByRole('treeitem', { name: '张三' })).getByText('张')).toBeTruthy();
	// The current list's group is highlighted.
	expect(rows[0]!.getAttribute('aria-selected')).toBe('true');
});

test('clicking a record opens its detail through the contacts target; clicking a group opens that list', async () => {
	const user = userEvent.setup();
	const person = record('张三');
	const { navigate } = setup([person, record('示例科技', 'company')]);
	await user.click(screen.getByRole('treeitem', { name: '张三' }));
	await waitFor(() =>
		expect(navigate).toHaveBeenCalledWith({ feature: 'contacts', section: 'person', resourceId: person.id }),
	);
	await user.click(screen.getByRole('treeitem', { name: t('workbench.companies') }));
	await waitFor(() => expect(navigate).toHaveBeenLastCalledWith({ feature: 'contacts', section: 'company' }));
	// A group stays open when clicked again; only the chevron collapses it.
	expect(screen.getByRole('treeitem', { name: t('workbench.companies') }).getAttribute('aria-expanded')).toBe('true');
});

test('the tree selection follows the open record and the target drives the archives page to its detail', async () => {
	const user = userEvent.setup();
	const person = record('张三');
	const other = record('李四');
	const { index, navigate, rerender, view } = setup([person, other]);
	// A page navigated by the panel's target selects the record in the page.
	const surface: ContactsNavigationSurface = {
		controller: { ensureLoaded: async () => {}, index: { get: (id) => index.get(id), byPath: index.byPath } },
		changeKind: vi.fn(),
		select: vi.fn(),
	};
	navigate.mockImplementation((target: WorkbenchTarget) =>
		navigateContacts(surface, target, new AbortController().signal),
	);
	await user.click(screen.getByRole('treeitem', { name: '李四' }));
	await waitFor(() => expect(surface.select).toHaveBeenCalledWith(other.path));
	expect(surface.changeKind).toHaveBeenCalledWith('person');
	// The page reports its new target; the panel highlights the record, not the group.
	view.unmount();
	rerender({ feature: 'contacts', section: 'person', resourceId: other.id });
	expect(screen.getByRole('treeitem', { name: '李四' }).getAttribute('aria-selected')).toBe('true');
	expect(screen.getByRole('treeitem', { name: t('workbench.people') }).getAttribute('aria-selected')).toBe('false');
});

test('the panel search filters records by name and keeps their group open', async () => {
	const user = userEvent.setup();
	setup([record('张三'), record('张伟'), record('李四')]);
	await user.type(screen.getByRole('textbox', { name: t('workbench.searchPanel') }), '张');
	const names = screen.getAllByRole('treeitem').map((row) => row.getAttribute('aria-label'));
	expect(names).toContain('张三');
	expect(names).toContain('张伟');
	expect(names).not.toContain('李四');
	await user.clear(screen.getByRole('textbox', { name: t('workbench.searchPanel') }));
	await user.type(screen.getByRole('textbox', { name: t('workbench.searchPanel') }), '没有这个人');
	expect(screen.queryByRole('tree')).toBeNull();
	expect(screen.getByRole('status').textContent).toBe(t('workbench.noResults'));
});

test('titles name the archive type and the service reports index changes', () => {
	const { service } = setup([]);
	expect(service.title({ feature: 'contacts', section: 'company' })).toBe('企业档案');
	expect(service.title({ feature: 'contacts' })).toBe('个人档案');
	setLanguage('en');
	expect(service.title({ feature: 'contacts', section: 'company' })).toBe('Company archives');
	const listener = vi.fn();
	const off = service.subscribe(listener);
	service.invalidate();
	expect(listener).toHaveBeenCalledOnce();
	off();
	service.invalidate();
	expect(listener).toHaveBeenCalledOnce();
});

test.each(['person', 'company'] as const)('category navigation waits for the draft decision before changing %s selection', async (kind) => {
	let decide!: (value: boolean) => void;
	const surface: ContactsNavigationSurface = {
		leaveEditor: vi.fn(() => new Promise<boolean>((resolve) => { decide = resolve; })),
		changeKind: vi.fn(), select: vi.fn(),
	};
	const signal = new AbortController();
	const pending = navigateContacts(surface, { feature: 'contacts', section: kind }, signal.signal);
	expect(surface.changeKind).not.toHaveBeenCalled();
	decide(false); await pending;
	expect(surface.changeKind).not.toHaveBeenCalled();
	expect(surface.select).not.toHaveBeenCalled();
	const next = navigateContacts(surface, { feature: 'contacts', section: kind }, signal.signal);
	decide(true); await next;
	expect(surface.changeKind).toHaveBeenCalledExactlyOnceWith(kind);
	const superseded = navigateContacts(surface, { feature: 'contacts', section: kind }, signal.signal);
	signal.abort(); decide(true); await superseded;
	expect(surface.changeKind).toHaveBeenCalledOnce();
});

test('returning from detail to its category keeps filters, card mode and browsing position', () => {
	const state = emptyPanelState({ person: 'card' });
	state.query.search = '张'; state.query.tags = ['客户']; state.page = 2; state.scroll = 480;
	state.selectedPath = 'huhu/档案/个人档案/张三/基本信息.md'; state.selectedId = 'selected';
	const same = showContactKind(state, 'person');
	expect(same).toMatchObject({ query: state.query, layout: { person: 'card' }, page: 2, scroll: 480, selectedPath: '', selectedId: '' });
	const other = showContactKind(state, 'company');
	expect(other).toMatchObject({ query: { kind: 'company', search: '', tags: [] }, page: 0, scroll: 0 });
	expect(other.layout).toEqual(state.layout);
});

test('a large archive renders as a window of rows and still opens a record by click', async () => {
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(400);
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(260);
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: 260,
		bottom: 400,
		width: 260,
		height: 400,
		toJSON: () => ({}),
	});
	const many = Array.from({ length: 3000 }, (_, i) => record(`人物${String(i).padStart(4, '0')}`));
	const { navigate } = setup(many);
	const rows = screen.getAllByRole('treeitem');
	expect(rows.length).toBeLessThan(80);
	expect(rows[0]!.getAttribute('aria-setsize')).toBe('2');
	await userEvent.setup().click(rows[1]!);
	await waitFor(() =>
		expect(navigate).toHaveBeenCalledWith(
			expect.objectContaining({ feature: 'contacts', section: 'person', resourceId: expect.any(String) }),
		),
	);
	vi.restoreAllMocks();
});
