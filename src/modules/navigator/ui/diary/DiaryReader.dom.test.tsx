import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { getLanguage, setLanguage } from '../../../../shared/i18n';
import { TestProviders } from '../../../../ui/react/test-providers';
import type { NavigatorPeriodicService, PeriodicNoteListEntry } from '../../api';
import { DiaryReader } from './DiaryReader';
import { VisibilityContext } from '../../../../ui/react/contexts';
import { loadTurnEngine } from './flip-engine';

let language = getLanguage();
beforeEach(() => { language = getLanguage(); setLanguage('en'); });
afterEach(() => { cleanup(); setLanguage(language); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const notes: PeriodicNoteListEntry[] = ['2026-11-04', '2026-11-03', '2026-10-31', '2026-10-30'].map((date) => ({
	period: 'day', date, path: `Journal/${date}.md`, title: date, status: 'existing', active: false, summary: date, summaryStatus: 'ready',
}));
function fixture(entries = notes) {
	const open = vi.fn(async () => true), read = vi.fn(async (path: string) => `Full diary body ${path}`);
	const periodic = {
		list: vi.fn(async () => entries), open, subscribe: () => () => {},
		inspect: (_period, date) => entries.find((note) => note.date === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`) ?? { status: 'missing' },
	} as Pick<NavigatorPeriodicService, 'list' | 'open' | 'subscribe' | 'inspect'>;
	return { port: { periodic, read }, open, read };
}
test('reads full diary pages, turns with buttons and opens the identical periodic file', async () => {
	const f = fixture();
	render(<TestProviders><DiaryReader port={f.port} initialDate="2026-11-04" /></TestProviders>);
	await screen.findByText('Full diary body Journal/2026-11-04.md');
	fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
	await screen.findByText('Full diary body Journal/2026-11-03.md');
	fireEvent.click(screen.getByRole('button', { name: 'Open original' }));
	await waitFor(() => expect(f.open).toHaveBeenCalledWith('day', new Date(2026, 10, 3), { create: false }));
});

test('calendar blank dates never create files, and month index jumps back to existing pages', async () => {
	const f = fixture();
	render(<TestProviders><DiaryReader port={f.port} initialDate="2026-11-04" /></TestProviders>);
	await screen.findByText('Full diary body Journal/2026-11-04.md');
	fireEvent.change(screen.getByLabelText('Jump to date'), { target: { value: '2026-11-02' } });
	fireEvent.click(screen.getByRole('button', { name: 'Go' }));
	await screen.findByText('No note for this date');
	expect(screen.getByRole('button', { name: 'Open original' })).toHaveProperty('disabled', true);
	fireEvent.click(screen.getByRole('button', { name: 'Month index' }));
	fireEvent.click(screen.getByRole('button', { name: '2026-10' }));
	await screen.findByText('Full diary body Journal/2026-10-31.md');
	expect(f.open).not.toHaveBeenCalled();
});

test('a wide reader falls back after an engine load failure and keeps keyboard navigation', async () => {
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 600, x: 0, y: 0, top: 0, left: 0, bottom: 600, right: 1000, toJSON: () => ({}) });
	const f = fixture(), loader = vi.fn(async () => { throw new Error('unavailable engine'); });
	const view = render(<TestProviders><DiaryReader port={f.port} initialDate="2026-11-04" engineLoader={loader} /></TestProviders>);
	await screen.findByText('Full diary body Journal/2026-11-04.md');
	expect(view.container.querySelectorAll('[data-diary-page]')).toHaveLength(2);
	fireEvent.keyDown(view.container.querySelector('[data-diary-reader]')!, { key: 'ArrowRight' });
	await screen.findByText('The page engine is unavailable. Buttons and keyboard navigation still work.');
	await screen.findByText('Full diary body Journal/2026-10-31.md');
	expect(loader).toHaveBeenCalledTimes(1);
});

test('reduced motion never loads an animation engine and arrows in the date input do not turn pages', async () => {
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 600, x: 0, y: 0, top: 0, left: 0, bottom: 600, right: 1000, toJSON: () => ({}) });
	vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
	const f = fixture(), loader = vi.fn(loadTurnEngine);
	const view = render(<TestProviders><DiaryReader port={f.port} initialDate="2026-11-04" engineLoader={loader} /></TestProviders>);
	await screen.findByText('Full diary body Journal/2026-11-04.md');
	fireEvent.keyDown(screen.getByLabelText('Jump to date'), { key: 'ArrowRight' });
	expect(screen.getByText('Full diary body Journal/2026-11-04.md')).toBeTruthy();
	fireEvent.keyDown(view.container.querySelector('[data-diary-reader]')!, { key: 'ArrowRight' });
	await screen.findByText('Full diary body Journal/2026-10-31.md');
	expect(loader).not.toHaveBeenCalled();
});

test('a thousand notes keep two or fewer mounted pages and at most four body reads per position; hidden pauses work', async () => {
	const many = Array.from({ length: 1000 }, (_, index) => {
		const date = new Date(2026, 10, 4 - index), iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
		return { ...notes[0]!, date: iso, path: `Journal/${iso}.md` };
	});
	const f = fixture(many);
	const view = render(<TestProviders><VisibilityContext.Provider value={true}><DiaryReader port={f.port} initialDate="2026-11-04" /></VisibilityContext.Provider></TestProviders>);
	await screen.findByText('Full diary body Journal/2026-11-04.md');
	await act(async () => {});
	expect(view.container.querySelectorAll('[data-diary-page]').length).toBeLessThanOrEqual(2);
	expect(f.read.mock.calls.length).toBeLessThanOrEqual(4);
	view.rerender(<TestProviders><VisibilityContext.Provider value={false}><DiaryReader port={f.port} initialDate="2026-11-04" /></VisibilityContext.Provider></TestProviders>);
	const count = f.read.mock.calls.length;
	await screen.findByText('Reading paused');
	await act(async () => {});
	expect(f.read).toHaveBeenCalledTimes(count);
	expect(view.container.querySelectorAll('[data-diary-page]')).toHaveLength(0);
});

test('the real embedded page engine has no idle frames or style injection and abort cancels its finite driver', async () => {
	const pending = new Map<number, FrameRequestCallback>(); let next = 0;
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { pending.set(++next, callback); return next; });
	vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { pending.delete(id); });
	const before = document.querySelectorAll('style').length;
	const engine = await loadTurnEngine();
	expect(pending.size).toBe(0);
	expect(document.querySelectorAll('style')).toHaveLength(before);
	const host = document.createElement('div'); document.body.append(host);
	const controller = new AbortController();
	try {
		const turn = engine.turn(host, [document.createElement('article'), document.createElement('article')], false, controller.signal);
		expect(pending.size).toBe(1);
		controller.abort(); await turn;
		expect(pending.size).toBe(0);
		expect(host.children).toHaveLength(0);
	} finally { controller.abort(); host.remove(); }
});

test('hiding a reader during a real engine turn cancels frames and preserves the selected date', async () => {
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 600, x: 0, y: 0, top: 0, left: 0, bottom: 600, right: 1000, toJSON: () => ({}) });
	const pending = new Map<number, FrameRequestCallback>(); let next = 0;
	vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { pending.set(++next, callback); return next; });
	vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { pending.delete(id); });
	const f = fixture();
	const page = (visible: boolean) => <TestProviders><VisibilityContext.Provider value={visible}><DiaryReader port={f.port} initialDate="2026-11-04" /></VisibilityContext.Provider></TestProviders>;
	const view = render(page(true));
	await screen.findByText('Full diary body Journal/2026-11-04.md');
	fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
	await waitFor(() => expect(pending.size).toBe(1));
	view.rerender(page(false));
	await screen.findByText('Reading paused');
	expect(pending.size).toBe(0);
	view.rerender(page(true));
	await screen.findByText('Full diary body Journal/2026-11-04.md');
});

test('a failed refresh preserves already loaded pages and offers a persistent retry', async () => {
	const f = fixture();
	render(<TestProviders><DiaryReader port={f.port} initialDate="2026-11-04" /></TestProviders>);
	await screen.findByText('Full diary body Journal/2026-11-04.md');
	f.read.mockRejectedValue(new Error('read failed'));
	fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
	await screen.findByText('This page could not be read. Retry or open the original.');
	expect(screen.getByText('Full diary body Journal/2026-11-04.md')).toBeTruthy();
});

test('an original cannot open when live inspection no longer matches the displayed path', async () => {
	const f = fixture();
	render(<TestProviders><DiaryReader port={f.port} initialDate="2026-11-04" /></TestProviders>);
	await screen.findByText('Full diary body Journal/2026-11-04.md');
	f.port.periodic.inspect = () => ({ ...notes[0]!, path: 'Different/2026-11-04.md' });
	fireEvent.click(screen.getByRole('button', { name: 'Open original' }));
	expect(f.open).not.toHaveBeenCalled();
});

test('journal invalidation drops late old bodies, rereads the current path and releases its subscription', async () => {
	const f = fixture();
	let notify = () => {};
	const release = vi.fn();
	f.port.periodic.subscribe = listener => { notify = listener; return release; };
	let finishOld!: (text: string) => void;
	f.read.mockImplementationOnce(() => new Promise<string>(resolve => { finishOld = resolve; }));
	const view = render(<TestProviders><DiaryReader port={f.port} initialDate="2026-11-04" /></TestProviders>);
	await waitFor(() => expect(f.read).toHaveBeenCalled());
	await act(async () => { notify(); });
	await screen.findByText('Full diary body Journal/2026-11-04.md');
	await act(async () => { finishOld('Stale body from before the journal change'); });
	expect(screen.queryByText('Stale body from before the journal change')).toBeNull();
	view.unmount(); expect(release).toHaveBeenCalledOnce();
});
