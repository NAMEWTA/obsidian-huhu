import { MarkdownView, type App, type EventRef, type TFile, type WorkspaceLeaf } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';
import { EditorContextService } from './context';

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

function windowStub(): Window {
	return { closed: false } as Window;
}

function workspaceFixture() {
	type Listener = (...args: unknown[]) => void;
	const listeners = new Map<string, Set<Listener>>();
	const refs = new Map<EventRef, { name: string; listener: Listener }>();
	const leaves: WorkspaceLeaf[] = [];
	let active: WorkspaceLeaf | null = null;
	const emit = (name: string, ...args: unknown[]) => {
		for (const listener of listeners.get(name) ?? []) listener(...args);
	};
	const revealLeaf = vi.fn(async (_leaf: WorkspaceLeaf): Promise<void> => {});
	const setActiveLeaf = vi.fn((leaf: WorkspaceLeaf, _options: { focus: boolean }) => {
		active = leaf;
		emit('active-leaf-change', leaf);
	});
	const offref = vi.fn((ref: EventRef) => {
		const event = refs.get(ref);
		if (event) listeners.get(event.name)?.delete(event.listener);
		refs.delete(ref);
	});
	const app = {
		workspace: {
			on: (name: string, listener: Listener) => {
				const ref = {} as EventRef;
				const group = listeners.get(name) ?? new Set<Listener>();
				group.add(listener);
				listeners.set(name, group);
				refs.set(ref, { name, listener });
				return ref;
			},
			offref,
			getActiveViewOfType: () => (active?.view instanceof MarkdownView ? active.view : null),
			getLeavesOfType: () => [...leaves],
			revealLeaf,
			setActiveLeaf,
		},
	} as unknown as App;
	return {
		app,
		emit,
		revealLeaf,
		setActiveLeaf,
		offref,
		add(path: string, text: string, ownerWindow: Window) {
			const leaf = {} as WorkspaceLeaf;
			const buffer = { text };
			const container = { win: ownerWindow };
			const view = Object.assign(Object.create(MarkdownView.prototype) as MarkdownView, {
				leaf,
				file: { path },
				containerEl: container,
				editor: { getValue: () => buffer.text },
			});
			leaf.view = view;
			leaves.push(leaf);
			return { leaf, view, buffer, container };
		},
		activate(leaf: WorkspaceLeaf | null) {
			active = leaf;
			emit('active-leaf-change', leaf);
		},
		remove(leaf: WorkspaceLeaf) {
			leaves.splice(leaves.indexOf(leaf), 1);
			emit('layout-change');
		},
		listenerCount: () => refs.size,
	};
}

describe('EditorContextService', () => {
	it('keeps the source editor through review focus and null file-open events', () => {
		const host = workspaceFixture(),
			win = windowStub();
		const note = host.add('notes/a.md', 'unsaved buffer', win);
		host.activate(note.leaf);
		const service = new EditorContextService(host.app);
		const source = service.current(win)!;
		host.activate({ view: {} } as WorkspaceLeaf);
		host.emit('file-open', null);
		host.activate(null);
		expect(service.current(win)).toEqual(source);
		expect(service.capture(source.id).text).toBe('unsaved buffer');
		service.dispose();
	});

	it('isolates same-path editors in different windows and tracks each live buffer', () => {
		const host = workspaceFixture(),
			firstWindow = windowStub(),
			secondWindow = windowStub();
		const first = host.add('shared.md', 'first unsaved buffer', firstWindow);
		const second = host.add('shared.md', 'second unsaved buffer', secondWindow);
		host.activate(first.leaf);
		const service = new EditorContextService(host.app);
		const firstId = service.current(firstWindow)!.id;
		host.activate(second.leaf);
		const secondId = service.current(secondWindow)!.id;
		expect(firstId).not.toBe(secondId);
		expect(service.current(firstWindow)?.id).toBe(firstId);
		expect(service.capture(firstId).text).toBe('first unsaved buffer');
		expect(service.capture(secondId).text).toBe('second unsaved buffer');
		first.buffer.text = 'first changed';
		host.emit('editor-change', first.view.editor, first.view);
		expect(service.capture(firstId)).toMatchObject({ text: 'first changed', context: { generation: 1 } });
		expect(service.get(secondId)?.generation).toBe(0);
		service.dispose();
	});

	it('invalidates old document IDs when a leaf switches files, including a later return to that path', () => {
		const host = workspaceFixture(),
			win = windowStub();
		const note = host.add('a.md', 'A', win);
		host.activate(note.leaf);
		const service = new EditorContextService(host.app);
		const first = service.current(win)!;
		note.view.file = { path: 'b.md' } as TFile;
		note.buffer.text = 'B';
		host.emit('file-open', note.view.file);
		const second = service.current(win)!;
		expect(second.leafId).toBe(first.leafId);
		expect(second.id).not.toBe(first.id);
		expect(service.get(first.id)).toBeUndefined();
		expect(() => service.capture(first.id)).toThrow('versioning.source-closed');
		note.view.file = { path: 'a.md' } as TFile;
		host.emit('file-open', note.view.file);
		expect(service.current(win)?.id).not.toBe(first.id);
		expect(service.get(first.id)).toBeUndefined();
		expect(service.get(second.id)).toBeUndefined();
		service.dispose();
	});

	it('assigns a fresh source when a leaf moves windows and clears its old window binding', () => {
		const host = workspaceFixture(),
			firstWindow = windowStub(),
			secondWindow = windowStub();
		const note = host.add('a.md', 'A', firstWindow);
		host.activate(note.leaf);
		const service = new EditorContextService(host.app);
		const first = service.current(firstWindow)!;
		note.container.win = secondWindow;
		host.activate(note.leaf);
		const second = service.current(secondWindow)!;
		expect(second.id).not.toBe(first.id);
		expect(second.leafId).toBe(first.leafId);
		expect(second.ownerWindow).toBe(secondWindow);
		expect(service.current(firstWindow)).toBeUndefined();
		expect(service.get(first.id)).toBeUndefined();
		service.dispose();
	});

	it('returns to the captured source leaf even after a different note becomes active', async () => {
		const host = workspaceFixture(),
			win = windowStub();
		const first = host.add('a.md', 'A', win),
			second = host.add('b.md', 'B', win);
		host.activate(first.leaf);
		const service = new EditorContextService(host.app);
		const id = service.current(win)!.id;
		host.activate(second.leaf);
		await service.returnTo(id);
		expect(host.revealLeaf).toHaveBeenCalledExactlyOnceWith(first.leaf);
		expect(host.setActiveLeaf).toHaveBeenCalledExactlyOnceWith(first.leaf, { focus: true });
		expect(service.current(win)?.id).toBe(id);
		service.dispose();
	});

	it.each(['switch', 'close'] as const)(
		'does not focus a stale source if it changes during reveal: %s',
		async (change) => {
			const host = workspaceFixture(),
				win = windowStub();
			const note = host.add('a.md', 'A', win);
			host.activate(note.leaf);
			const service = new EditorContextService(host.app);
			const opening = deferred<void>();
			host.revealLeaf.mockImplementationOnce(() => opening.promise);
			const returning = service.returnTo(service.current(win)!.id);
			if (change === 'close') host.remove(note.leaf);
			else {
				note.view.file = { path: 'b.md' } as TFile;
				host.emit('file-open', note.view.file);
			}
			opening.resolve();
			await expect(returning).rejects.toThrow('versioning.source-closed');
			expect(host.setActiveLeaf).not.toHaveBeenCalled();
			service.dispose();
		},
	);

	it('prunes closed editors and disposes event subscriptions without resurrecting contexts', () => {
		const host = workspaceFixture(),
			win = windowStub();
		const note = host.add('a.md', 'A', win);
		host.activate(note.leaf);
		const service = new EditorContextService(host.app);
		const id = service.current(win)!.id;
		const listener = vi.fn(),
			unsubscribe = service.subscribe(listener);
		host.remove(note.leaf);
		expect(service.current(win)).toBeUndefined();
		expect(service.get(id)).toBeUndefined();
		expect(listener).toHaveBeenCalledOnce();
		unsubscribe();
		service.dispose();
		expect(host.offref).toHaveBeenCalledTimes(4);
		expect(host.listenerCount()).toBe(0);
		const next = host.add('b.md', 'B', win);
		host.activate(next.leaf);
		host.emit('editor-change', next.view.editor, next.view);
		expect(service.current(win)).toBeUndefined();
		expect(listener).toHaveBeenCalledOnce();
	});
});
