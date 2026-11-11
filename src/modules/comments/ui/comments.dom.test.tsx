import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HuhuProviders } from '../../../ui/react/providers';
import { setLanguage } from '../../../shared/i18n';
import { Composer } from './popover/Composer';
import { CommentPopover } from './popover/CommentPopover';
import { mountCommentsPanel } from './panel/mount';
import { CommentsPanel } from './panel/CommentsPanel';
import { createOverlayChannel } from '../services/overlay';
import { createCommentsService } from '../services/comments';
import { createAnchor } from '../core/anchor';
import { CommentStore, type CommentFs } from '../core/store';
import { DEFAULT_COMMENTS_SETTINGS } from '../settings';
import type { CommentsEnv } from './env';
import type { EditorContextAccess, EditorDocumentContext } from '../../../app/contracts/editor-context';
vi.mock('obsidian', async importOriginal => {
	const actual = await importOriginal<Record<string, unknown>>();
	return { ...actual, Component: class { load() {} unload() {} }, MarkdownRenderer: { render: async (_app: unknown, text: string, el: HTMLElement) => { el.textContent = text; } }, Platform: { isPhone: false, isMobile: false } };
});
beforeAll(() => {
	Object.assign(HTMLElement.prototype, {
		empty() { (this as HTMLElement).replaceChildren(); },
		setText(value: string) { (this as HTMLElement).textContent = value; },
		createSpan(options?: { cls?: string; text?: string }) {
			const el = document.createElement('span');
			if (options?.cls) el.className = options.cls;
			if (options?.text) el.textContent = options.text;
			(this as HTMLElement).appendChild(el); return el;
		},
	});
});
afterEach(() => { vi.useRealTimers(); });
function fixture() {
	setLanguage('en');
	const files = new Map<string, string>();
	const fs: CommentFs = { exists: async p => files.has(p), read: async p => files.get(p)!, write: async (p, v) => { files.set(p, v); }, remove: async p => { files.delete(p); } };
	const store = new CommentStore(fs, { timers: { set: cb => window.setTimeout(cb, 1e6), clear: h => window.clearTimeout(h as number) } });
	const service = createCommentsService(store, () => DEFAULT_COMMENTS_SETTINGS);
	const channel = createOverlayChannel();
	const env = { app: { workspace: { containerEl: document.body }, vault: { getFileByPath: (path: string) => ({ path }) } }, service, editors: new Set(), alive: () => true, overlay: () => channel, open: (request: Parameters<typeof channel.open>[0]) => channel.open(request), openSettings: () => {}, exportHighlights: async () => 'huhu/导出/高亮/dummy.md' } as unknown as CommentsEnv;
	return { store, service, channel, env, fs, dispose: async () => { service.dispose(); channel.dispose(); await store.close(); } };
}
test('composer: whitespace, IME, Ctrl+Enter, pending duplicate, failed save retains draft and retries', async () => {
	setLanguage('en'); let finish!: () => void;
	const save = vi.fn().mockRejectedValueOnce(new Error('EIO')).mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
	const cancel = vi.fn();
	const view = render(<HuhuProviders ownerDocument={document}><Composer onSubmit={save} onCancel={cancel} /></HuhuProviders>);
	const input = await screen.findByRole('textbox');
	fireEvent.change(input, { target: { value: 'draft' } }); fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true, isComposing: true }); expect(save).not.toHaveBeenCalled();
	fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true }); await screen.findByRole('alert'); expect((input as HTMLTextAreaElement).value).toBe('draft');
	fireEvent.click(screen.getByRole('button', { name: 'Retry' })); fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true }); expect(save).toHaveBeenCalledTimes(2);
	await act(async () => finish()); fireEvent.keyDown(input, { key: 'Escape' }); expect(cancel).toHaveBeenCalledOnce(); view.unmount();
});
test('overlay open, submit, reply, inline edit, Escape twice, resolve/reopen and delete confirmation', async () => {
	const f = fixture();
	const request = { path: 'a.md', ownerDocument: document, rect: () => new DOMRect(30, 30, 80, 20), mode: 'compose' as const, anchor: createAnchor('alpha', 0, 5), pinned: true };
	f.channel.open(request);
	const view = render(<HuhuProviders ownerDocument={document}><CommentPopover env={f.env} channel={f.channel} /></HuhuProviders>);
	fireEvent.change(await screen.findByPlaceholderText('Write a comment…'), { target: { value: 'first' } }); fireEvent.click(screen.getByRole('button', { name: 'Comment' }));
	await waitFor(() => expect(f.channel.state.getState().request).toBeNull());
	const thread = f.store.threadsFor('a.md')[0]!;
	act(() => f.channel.open({ ...request, mode: 'threads', threadIds: [thread.id] }));
	await screen.findByText('first'); fireEvent.click(screen.getByRole('button', { name: 'Reply…' }));
	fireEvent.change(await screen.findByPlaceholderText('Write a comment…'), { target: { value: 'reply' } }); fireEvent.keyDown(screen.getByPlaceholderText('Write a comment…'), { key: 'Enter', ctrlKey: true });
	await waitFor(() => expect(thread.messages).toHaveLength(2)); await waitFor(() => expect(screen.queryByPlaceholderText('Write a comment…')).toBeNull());
	fireEvent.click(screen.getByRole('button', { name: 'Edit comment' })); fireEvent.change(await screen.findByPlaceholderText('Write a comment…'), { target: { value: 'edited' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' }));
	await screen.findByText('edited'); await waitFor(() => expect(screen.queryByPlaceholderText('Write a comment…')).toBeNull()); expect(thread.messages[0]?.editedAt).toBeTruthy();
	fireEvent.click(screen.getByRole('button', { name: 'Edit comment' })); await screen.findByPlaceholderText('Write a comment…');
	fireEvent.keyDown(screen.getByPlaceholderText('Write a comment…'), { key: 'Escape' }); await waitFor(() => expect(screen.queryByPlaceholderText('Write a comment…')).toBeNull()); expect(f.channel.state.getState().request).not.toBeNull();
	fireEvent.click(screen.getByRole('button', { name: 'Resolve' })); await screen.findByText('Resolved'); expect(f.channel.state.getState().request).not.toBeNull();
	fireEvent.click(screen.getByRole('button', { name: 'Reopen' })); await screen.findByText('edited');
	fireEvent.click(screen.getByRole('button', { name: 'Delete' })); await screen.findByText('Delete this comment and its 1 replies?'); fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
	await waitFor(() => expect(f.store.threadsFor('a.md')).toHaveLength(0)); view.unmount(); await f.dispose();
});
test('300ms close is cancelled on entry and suppressed while pinned or editing', () => {
	vi.useFakeTimers(); const channel = createOverlayChannel(); const request = { path: 'a.md', ownerDocument: document, rect: () => new DOMRect(), mode: 'threads' as const, pinned: false };
	channel.open(request); channel.scheduleClose(); vi.advanceTimersByTime(299); expect(channel.state.getState().request).not.toBeNull(); channel.cancelClose(); vi.advanceTimersByTime(500); expect(channel.state.getState().request).not.toBeNull();
	channel.setDraft(true); channel.scheduleClose(); vi.advanceTimersByTime(500); expect(channel.state.getState().request).not.toBeNull(); channel.setDraft(false); channel.pin(); channel.scheduleClose(); vi.advanceTimersByTime(500); expect(channel.state.getState().request).not.toBeNull();
	channel.close(false); channel.open(request); channel.scheduleClose(); vi.advanceTimersByTime(300); expect(channel.state.getState().request).toBeNull(); channel.dispose();
});
test('panel follows current note and lazily loads vault sections; filtering hides resolved discussions', async () => {
	const f = fixture(); const a = await f.store.add('a.md', { anchor: createAnchor('alpha', 0, 5), text: 'alpha-comment' });
	await f.store.add('b.md', { anchor: createAnchor('beta', 0, 4), text: 'beta-comment' });
	await f.store.resolve(a.id); await f.store.flush(); await f.service.refresh(); f.service.setPath('a.md');
	const view = render(<HuhuProviders ownerDocument={document}><CommentsPanel env={f.env} /></HuhuProviders>);
	await screen.findByRole('button', { name: 'Resolved' });
	expect(screen.queryByText('alpha-comment')).toBeNull();
	fireEvent.click(screen.getByRole('radio', { name: 'Vault' })); expect(screen.queryByText('beta-comment')).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: /b.md/ })); await screen.findByText('beta-comment');
	fireEvent.click(screen.getByRole('radio', { name: 'Current note' }));
	fireEvent.click(screen.getByRole('radio', { name: /Unresolved/ }));
	await waitFor(() => expect(screen.queryByRole('button', { name: 'Resolved' })).toBeNull());
	view.unmount(); await f.dispose();
});

test('panel uses its window document context while another leaf or sidebar changes global comment focus', async () => {
	const f = fixture();
	await f.store.add('a.md', { anchor: createAnchor('alpha', 0, 5), text: 'alpha-comment' });
	await f.store.add('b.md', { anchor: createAnchor('beta', 0, 4), text: 'beta-comment' });
	let context: EditorDocumentContext = { id: 'a:a.md', path: 'a.md', leafId: 'a', ownerWindow: window, generation: 0 };
	const listeners = new Set<() => void>();
	const documents = { current: vi.fn(() => context), subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); } } as unknown as EditorContextAccess;
	const container = document.createElement('div'); document.body.appendChild(container);
	const view = render(<HuhuProviders ownerDocument={document}><CommentsPanel env={f.env} documents={documents} container={container} /></HuhuProviders>, { container });
	await screen.findByText('alpha-comment');
	act(() => { f.service.setPath('b.md'); f.service.setPath(null); });
	expect(screen.getByText('alpha-comment')).toBeTruthy(); expect(screen.queryByText('beta-comment')).toBeNull();
	expect(documents.current).toHaveBeenCalledWith(window);
	act(() => { context = { ...context, id: 'b:b.md', leafId: 'b', path: 'b.md' }; for (const listener of listeners) listener(); });
	await screen.findByText('beta-comment'); expect(screen.queryByText('alpha-comment')).toBeNull();
	view.unmount(); expect(listeners.size).toBe(0); container.remove(); await f.dispose();
});

test('panel menu exposes sorting, settings and the resolve-all confirmation request', async () => {
	const f = fixture(); f.service.setPath('a.md'); f.env.openSettings = vi.fn();
	const view = render(<HuhuProviders ownerDocument={document}><CommentsPanel env={f.env} /></HuhuProviders>);
	const openMenu = () => fireEvent.pointerDown(screen.getByRole('button', { name: 'More comment actions' }), { button: 0, ctrlKey: false, pointerType: 'mouse' });
	openMenu(); await screen.findByRole('menuitemradio', { name: 'Position in note' });
	fireEvent.click(screen.getByRole('menuitemradio', { name: 'Recent activity' }));
	openMenu(); expect((await screen.findByRole('menuitemradio', { name: 'Recent activity' })).getAttribute('aria-checked')).toBe('true');
	fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' })); expect(f.env.openSettings).toHaveBeenCalledOnce();
	openMenu(); fireEvent.click(await screen.findByRole('menuitem', { name: 'Resolve all comments in this note' }));
	expect(f.channel.state.getState().request).toMatchObject({ mode: 'resolve-all', path: 'a.md' });
	view.unmount(); await f.dispose();
});

test('vault export loads collapsed files and refuses a partial export after a read failure', async () => {
	const f = fixture();
	await f.store.highlight('a.md', { anchor: createAnchor('alpha', 0, 5), color: 'yellow' });
	await f.store.highlight('b.md', { anchor: createAnchor('beta', 0, 4), color: 'blue' });
	await f.store.flush(); await f.service.refresh();
	const exported = vi.fn(async (_rows: Parameters<CommentsEnv['exportHighlights']>[0]) => 'export.md'); f.env.exportHighlights = exported;
	const load = vi.spyOn(f.service, 'load');
	const view = render(<HuhuProviders ownerDocument={document}><CommentsPanel env={f.env} /></HuhuProviders>);
	fireEvent.click(screen.getByRole('radio', { name: 'Vault' }));
	const exportMenu = async () => {
		fireEvent.pointerDown(screen.getByRole('button', { name: 'More comment actions' }), { button: 0, ctrlKey: false, pointerType: 'mouse' });
		fireEvent.click(await screen.findByRole('menuitem', { name: /Export/ }));
	};
	await exportMenu();
	await waitFor(() => expect(exported).toHaveBeenCalledOnce());
	expect(load.mock.calls.map(call => call[0])).toEqual(['a.md', 'b.md']);
	expect(exported.mock.calls[0]?.[0]).toHaveLength(2);
	exported.mockClear(); load.mockRejectedValueOnce(new Error('read failed'));
	await exportMenu();
	await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/export/i));
	expect(exported).not.toHaveBeenCalled();
	view.unmount(); await f.dispose();
});

test('editor hover waits 350ms, carries overlapping ids, and destroy removes listeners/timers', async () => {
	const { HoverTracker } = await import('./editor/hover');
	const { EditorState } = await import('@codemirror/state');
	const { editorInfoField } = await import('obsidian');
	const f = fixture(); const thread = await f.store.add('a.md', { anchor: createAnchor('alpha', 0, 5), text: 'one' });
	const second = await f.store.add('a.md', { anchor: createAnchor('alpha', 0, 5), text: 'two' });
	const dom = document.createElement('div'); dom.innerHTML = `<span class="huhu-comment-hl" data-comment-ids="${thread.id} ${second.id}">alpha</span>`; document.body.appendChild(dom);
	const state = EditorState.create({ doc: 'alpha', extensions: [editorInfoField.init(() => ({ file: { path: 'a.md' } }) as never)] });
	const view = { dom, scrollDOM: dom, state, focus() {} } as unknown as import('@codemirror/view').EditorView;
	const tracker = new HoverTracker(view, f.env);
	vi.useFakeTimers();
	fireEvent.mouseOver(dom.firstElementChild!); vi.advanceTimersByTime(349); expect(f.channel.state.getState().request).toBeNull(); vi.advanceTimersByTime(1); expect(f.channel.state.getState().request?.threadIds).toEqual([thread.id, second.id]);
	fireEvent.mouseOut(dom.firstElementChild!); f.channel.setHovered(true); vi.advanceTimersByTime(400); expect(f.channel.state.getState().request).not.toBeNull();
	f.channel.close(false); fireEvent.mouseOver(dom.firstElementChild!); tracker.destroy(); vi.advanceTimersByTime(400); expect(f.channel.state.getState().request).toBeNull();
	fireEvent.mouseOver(dom.firstElementChild!); vi.advanceTimersByTime(400); expect(f.channel.state.getState().request).toBeNull(); dom.remove(); vi.useRealTimers(); await f.dispose();
});

test('overlay host mounts at most one React root per document and removes it on dispose', async () => {
	const { CommentsOverlays } = await import('./popover/overlay-host');
	const f = fixture(); const hosts = new CommentsOverlays(f.env);
	const channel = hosts.get(document); expect(hosts.get(document)).toBe(channel);
	act(() => channel.open({ path: 'a.md', ownerDocument: document, rect: () => new DOMRect(), mode: 'compose', anchor: createAnchor('alpha', 0, 5), pinned: true }));
	await waitFor(() => expect(document.querySelectorAll('.huhu-comments-overlay-root')).toHaveLength(1));
	await screen.findByRole('textbox'); act(() => hosts.dispose()); expect(document.querySelector('.huhu-comments-overlay-root')).toBeNull(); await f.dispose();
});

test('editor reconfiguration retains its scoped class and removes it when disabled', async () => {
	const { EditorView } = await import('@codemirror/view');
	const { StateEffect } = await import('@codemirror/state');
	const { commentsCmExtension } = await import('./editor/extension');
	const f = fixture(), parent = document.createElement('div'); document.body.appendChild(parent);
	const view = new EditorView({ doc: 'alpha', parent, extensions: commentsCmExtension(f.env) });
	expect(view.dom.classList.contains('huhu-comments-editor')).toBe(true);
	view.dispatch({ effects: StateEffect.reconfigure.of(commentsCmExtension(f.env)) });
	expect(view.dom.classList.contains('huhu-comments-editor')).toBe(true);
	view.dispatch({ effects: StateEffect.reconfigure.of([]) });
	expect(view.dom.classList.contains('huhu-comments-editor')).toBe(false);
	expect(f.env.editors.size).toBe(0); view.destroy(); parent.remove(); await f.dispose();
});

test('one-click palette keeps the selection request and creates a pure color highlight', async () => {
	const f = fixture();
	act(() => f.channel.open({ path: 'a.md', ownerDocument: document, rect: () => new DOMRect(30, 30, 80, 20),
		mode: 'selection', anchor: createAnchor('alpha beta', 0, 5), pinned: false }));
	const ui = render(<HuhuProviders ownerDocument={document}><CommentPopover env={f.env} channel={f.channel} /></HuhuProviders>);
	const color = await screen.findByRole('button', { name: 'Yellow' });
	expect(f.channel.state.getState().request?.mode).toBe('selection');
	expect(fireEvent.mouseDown(color)).toBe(false);
	fireEvent.click(color);
	await waitFor(() => expect(f.store.threadsFor('a.md')).toHaveLength(1));
	expect(f.store.threadsFor('a.md')[0]).toMatchObject({ color: 'yellow', messages: [] });
	await waitFor(() => expect(f.channel.state.getState().request).toBeNull());
	ui.unmount(); await f.dispose();
});


test('selection add-note action opens the annotation editor without a second click', async () => {
	const f = fixture();
	act(() => f.channel.open({ path: 'a.md', ownerDocument: document, rect: () => new DOMRect(20, 20, 80, 16),
		mode: 'selection', anchor: createAnchor('alpha beta', 0, 5), pinned: false }));
	const ui = render(<HuhuProviders ownerDocument={document}><CommentPopover env={f.env} channel={f.channel} /></HuhuProviders>);
	fireEvent.click(await screen.findByRole('button', { name: 'Add note' }));
	const editor = await screen.findByRole('textbox', { name: 'Highlight note' });
	fireEvent.change(editor, { target: { value: 'My note' } });
	fireEvent.click(screen.getByRole('button', { name: 'Save' }));
	await waitFor(() => expect(f.store.threadsFor('a.md')[0]?.note).toBe('My note'));
	ui.unmount(); await f.dispose();
});

test('a selection request survives hover timers, and hover only replaces it away from the button', async () => {
	const { HoverTracker } = await import('./editor/hover');
	const { EditorState } = await import('@codemirror/state');
	const { editorInfoField } = await import('obsidian');
	const f = fixture(); const thread = await f.store.add('a.md', { anchor: createAnchor('alpha', 0, 5), text: 'one' });
	const dom = document.createElement('div'); dom.innerHTML = `<span class="huhu-comment-hl" data-comment-ids="${thread.id}">alpha</span><div data-comments-overlay="selection"></div>`; document.body.appendChild(dom);
	const popover = dom.querySelector('[data-comments-overlay]')!; popover.getBoundingClientRect = () => new DOMRect(100, 100, 60, 24);
	const state = EditorState.create({ doc: 'alpha', extensions: [editorInfoField.init(() => ({ file: { path: 'a.md' } }) as never)] });
	const view = { dom, scrollDOM: dom, state, focus() {} } as unknown as import('@codemirror/view').EditorView;
	const tracker = new HoverTracker(view, f.env);
	const base = { path: 'a.md', ownerDocument: document, rect: () => new DOMRect(98, 130, 1, 16), anchor: createAnchor('alpha', 0, 5) };
	f.channel.open({ ...base, mode: 'selection', pinned: false });
	vi.useFakeTimers();
	fireEvent.mouseMove(dom, { clientX: 120, clientY: 140 }); fireEvent.mouseOver(dom.firstElementChild!); vi.advanceTimersByTime(400);
	expect(f.channel.state.getState().request?.mode).toBe('selection');
	f.channel.scheduleClose(); vi.advanceTimersByTime(400); expect(f.channel.state.getState().request?.mode).toBe('selection');
	fireEvent.mouseMove(dom, { clientX: 400, clientY: 400 }); fireEvent.mouseOut(dom.firstElementChild!); fireEvent.mouseOver(dom.firstElementChild!); vi.advanceTimersByTime(400);
	expect(f.channel.state.getState().request?.mode).toBe('threads');
	tracker.destroy(); dom.remove(); vi.useRealTimers(); await f.dispose();
});

test('closing the selection button does not restore the old selection', async () => {
	const f = fixture(), focus = vi.fn();
	f.channel.open({ path: 'a.md', ownerDocument: document, rect: () => new DOMRect(30, 30, 1, 20), mode: 'selection', anchor: createAnchor('alpha', 0, 5), pinned: false, focus });
	const view = render(<HuhuProviders ownerDocument={document}><CommentPopover env={f.env} channel={f.channel} /></HuhuProviders>);
	await screen.findByRole('button', { name: 'Yellow' });
	act(() => f.channel.close(false));
	await new Promise(resolve => window.setTimeout(resolve, 50));
	expect(focus).not.toHaveBeenCalled(); view.unmount(); await f.dispose();
});

test('clicking a highlight pins its threads, but a click that ends a drag-selection is ignored', async () => {
	const { HoverTracker } = await import('./editor/hover');
	const { EditorState } = await import('@codemirror/state');
	const { editorInfoField } = await import('obsidian');
	const f = fixture(); const thread = await f.store.add('a.md', { anchor: createAnchor('alpha', 0, 5), text: 'one' });
	const dom = document.createElement('div'); dom.innerHTML = `<span class="huhu-comment-hl" data-comment-ids="${thread.id}">alpha</span>`; document.body.appendChild(dom);
	const make = (selection?: { anchor: number; head: number }) => EditorState.create({ doc: 'alpha', selection, extensions: [editorInfoField.init(() => ({ file: { path: 'a.md' } }) as never)] });
	const view = { dom, scrollDOM: dom, state: make(), focus() {} } as unknown as import('@codemirror/view').EditorView & { state: ReturnType<typeof make> };
	const tracker = new HoverTracker(view, f.env);
	view.state = make({ anchor: 0, head: 3 }); fireEvent.click(dom.firstElementChild!);
	expect(f.channel.state.getState().request).toBeNull();
	view.state = make({ anchor: 2, head: 2 }); fireEvent.click(dom.firstElementChild!);
	expect(f.channel.state.getState().request).toMatchObject({ mode: 'threads', pinned: true, threadIds: [thread.id] });
	tracker.destroy(); dom.remove(); await f.dispose();
});

test('panel separates empty from no-results, offers clearing filters, and runs inside a design scope', async () => {
	const f = fixture(); const a = await f.store.add('a.md', { anchor: createAnchor('alpha', 0, 5), text: 'alpha-comment' });
	await f.store.flush(); await f.service.refresh(); f.service.setPath('a.md'); void a;
	const view = render(<HuhuProviders ownerDocument={document}><CommentsPanel env={f.env} /></HuhuProviders>);
	await screen.findByText('alpha-comment');
	expect(view.container.querySelector('.huhu-design.huhu-comments-panel')).not.toBeNull();
	fireEvent.change(screen.getByRole('textbox', { name: 'Search highlights and notes' }), { target: { value: 'zzz' } });
	await screen.findByText('No highlights match the current search or filters.');
	expect(screen.queryByText(/No highlights yet/)).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
	await screen.findByText('alpha-comment');
	view.unmount(); await f.dispose();
});

test('panel storage failure is persistent and retry reloads the list', async () => {
	const f = fixture(); f.service.setPath('a.md');
	const refresh = vi.spyOn(f.service, 'refresh'); f.service.state.setState({ error: true });
	const view = render(<HuhuProviders ownerDocument={document}><CommentsPanel env={f.env} /></HuhuProviders>);
	await screen.findByRole('alert');
	fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
	expect(refresh).toHaveBeenCalled();
	view.unmount(); await f.dispose();
});

test('an accepted highlight result cannot close a later request in the same window', async () => {
 const f = fixture();
 let release!: (id: string) => void;
 vi.spyOn(f.service, 'highlight').mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
 f.channel.open({ path: 'a.md', ownerDocument: document, rect: () => new DOMRect(30, 30, 1, 20), mode: 'selection', anchor: createAnchor('alpha', 0, 5), pinned: false });
 const view = render(<HuhuProviders ownerDocument={document}><CommentPopover env={f.env} channel={f.channel} /></HuhuProviders>);
 fireEvent.click(await screen.findByRole('button', { name: 'Yellow' }));
 const later = { path: 'b.md', ownerDocument: document, rect: () => new DOMRect(60, 60, 1, 20), mode: 'threads' as const, threadIds: [], pinned: true };
 act(() => { f.channel.close(false); f.channel.open(later); });
 await act(async () => release('new-highlight'));
 expect(f.channel.state.getState().request).toBe(later);
 view.unmount(); await f.dispose();
});

test.each([true,false])('note acknowledgement preserves edits made during durable write, changed=%s',async changed=>{
 const f=fixture();let release=()=>{};let unmount=()=>{};try{
 const thread=await f.store.highlight('a.md',{anchor:createAnchor('alpha',0,5),color:'yellow'});await f.store.flush();await f.service.refresh();f.service.setPath('a.md');
 const view=render(<HuhuProviders ownerDocument={document}><CommentsPanel env={f.env}/></HuhuProviders>);unmount=view.unmount;
 fireEvent.click(await screen.findByRole('button',{name:'Edit note'}));const input=screen.getByRole('textbox',{name:'Highlight note'});fireEvent.change(input,{target:{value:'First note'}});
 let begin=()=>{};const started=new Promise<void>(r=>{begin=r}),gate=new Promise<void>(r=>{release=r});const write=f.fs.write;f.fs.write=async(...args)=>{begin();await gate;await write(...args);};
 fireEvent.click(screen.getByRole('button',{name:'Save'}));await started;if(changed)fireEvent.change(screen.getByRole('textbox',{name:'Highlight note'}),{target:{value:'Latest note draft'}});
 await act(async()=>{release();await f.store.flush();});
 const editor=screen.queryByRole('textbox',{name:'Highlight note'})as HTMLTextAreaElement|null;console.log('NOTE_ACK',JSON.stringify({changed,editor:editor?.value??null,persisted:f.store.threadsFor('a.md')[0]?.note}));
 if(changed)expect(editor?.value).toBe('Latest note draft');else{expect(editor).toBeNull();expect(f.store.threadsFor('a.md')[0]?.note).toBe('First note');}
 }finally{release();unmount();await f.dispose();}
});

test.each([true,false])('highlight idempotency belongs to each selection request, overlap=%s',async overlap=>{
 const f=fixture();let release=()=>{};let unmount=()=>{};try{
 let begin=()=>{};const started=new Promise<void>(r=>{begin=r}),gate=new Promise<void>(r=>{release=r});const write=f.fs.write;f.fs.write=async(...args)=>{begin();await gate;await write(...args);};
 const request=(path:string)=>({path,ownerDocument:document,rect:()=>new DOMRect(20,20,50,20),mode:'selection' as const,anchor:createAnchor('alpha',0,5),pinned:false});f.channel.open(request('a.md'));
 const v=render(<HuhuProviders ownerDocument={document}><CommentPopover env={f.env} channel={f.channel}/></HuhuProviders>);unmount=v.unmount;fireEvent.click(await screen.findByRole('button',{name:'Yellow'}));await started;
 if(!overlap)await act(async()=>{release();await f.store.flush();});
 act(()=>f.channel.open(request('b.md')));fireEvent.click(await screen.findByRole('button',{name:'Yellow'}));
 await act(async()=>{release();await f.store.flush();});
 console.log('HIGHLIGHT_REQUEST',JSON.stringify({overlap,a:f.store.threadsFor('a.md').length,b:f.store.threadsFor('b.md').length,request:f.channel.state.getState().request?.path??null}));expect(f.store.threadsFor('b.md')).toHaveLength(1);
 }finally{release();unmount();await f.dispose();}
});


test('the independent comments root pauses lazy file loads while hidden and resumes the same filters', async () => {
 const f = fixture();
 await f.store.add('a.md', { anchor: createAnchor('alpha', 0, 5), text: 'needle in A' });
 await f.store.flush(); await f.service.refresh(); f.service.setPath('a.md');
 const container = document.createElement('div'); document.body.append(container);
 Object.assign(container, { addClass: (...names: string[]) => container.classList.add(...names), removeClass: (...names: string[]) => container.classList.remove(...names) });
 const docs: EditorContextAccess = { current: () => ({ id: 'a', path: 'a.md', leafId: 'a', ownerWindow: window, generation: 0 }), get: () => undefined, capture: () => { throw Error('No editor'); }, resolveLeaf: () => undefined, resolveView: () => undefined, returnTo: async () => {}, subscribe: () => () => {} };
 const load = vi.spyOn(f.service, 'load');
 let handle!: ReturnType<typeof mountCommentsPanel>;
 try {
  await act(async () => { handle = mountCommentsPanel(container, f.env, docs, true); });
  fireEvent.click(await screen.findByRole('radio', { name: 'Vault' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Search highlights and notes' }), { target: { value: 'needle' } });
  await waitFor(() => expect(load).toHaveBeenCalledWith('a.md'));
  await act(async () => handle.setVisible(false)); load.mockClear();
  await act(async () => { await f.store.add('b.md', { anchor: createAnchor('beta', 0, 4), text: 'needle in B' }); await f.store.flush(); await f.service.refresh(); });
  expect(load).not.toHaveBeenCalled();
  await act(async () => handle.setVisible(true));
  await waitFor(() => expect(load).toHaveBeenCalledWith('b.md'));
  expect(screen.getByRole('textbox', { name: 'Search highlights and notes' })).toHaveProperty('value', 'needle');
 } finally { await act(async () => handle?.dispose()); container.remove(); await f.dispose(); }
});
