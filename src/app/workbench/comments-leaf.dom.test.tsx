import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { ViewStateResult, WorkspaceLeaf } from 'obsidian';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CommentsLeaf } from './comments-leaf';
import { setLanguage, t } from '../../shared/i18n';
import type { ServiceAccess, ServiceKey } from '../contracts/module';
import type { EditorContextAccess, EditorPanelContribution } from '../contracts/editor-context';
import { COMMENTS_PANEL } from '../../modules/comments/api';
import { NOTE_HISTORY_PANEL } from '../../modules/versioning/api';
import { ContainerProviders } from '../../ui/react/providers';

vi.mock('../../host/obsidian/workspace-title', () => ({ onLeafLanguageChanged: () => () => {} }));
vi.mock('obsidian', async importOriginal => {
	const actual = await importOriginal<Record<string, unknown>>();
	return { ...actual, ItemView: class {
		app = {}; contentEl = document.createElement('div');
		constructor(readonly leaf: WorkspaceLeaf) {
			this.contentEl.empty = () => this.contentEl.replaceChildren();
			this.contentEl.addClass = (...classes: string[]) => this.contentEl.classList.add(...classes);
			this.contentEl.removeClass = (...classes: string[]) => this.contentEl.classList.remove(...classes);
			document.body.append(this.contentEl);
		}
		register() {}
		setState() { return Promise.resolve(); }
	} };
});

const leaves: CommentsLeaf[] = [];
afterEach(async () => {
	for (const leaf of leaves.splice(0)) { await act(() => leaf.onClose()); leaf.contentEl.remove(); }
});

function fixture() {
	const panels = new Map<string, EditorPanelContribution>();
	const listeners = new Map<string, Set<() => void>>();
	let beforeWatch: (() => void) | undefined;
	const keyId = (key: ServiceKey<unknown>) => `${key.owner}:${key.id}`;
	const services: ServiceAccess = {
		peek<T>(key: ServiceKey<T>) { return panels.get(keyId(key)) as T | undefined; },
		acquire: async () => undefined,
		watch<T>(key: ServiceKey<T>, listener: (value: T | undefined) => void) {
			const arriving = beforeWatch; beforeWatch = undefined; arriving?.();
			const id = keyId(key), group = listeners.get(id) ?? new Set<() => void>();
			const notify = () => listener(services.peek(key));
			group.add(notify); listeners.set(id, group);
			return () => { group.delete(notify); };
		},
	};
	const documents: EditorContextAccess = {
		current: () => undefined, get: () => undefined,
		capture: () => { throw new Error('no document'); },
		resolveLeaf: () => undefined, resolveView: () => undefined,
		returnTo: async () => {}, subscribe: () => () => {},
	};
	const host = { services, documents, openWorkbenchSettings: vi.fn(async (_category?: string) => {}) };
	const leaf = new CommentsLeaf({} as WorkspaceLeaf, host); leaves.push(leaf);
	return {
		leaf, host,
		beforeNextWatch(action: () => void) { beforeWatch = action; },
		setPanel(key: ServiceKey<unknown>, next?: EditorPanelContribution) {
			const id = keyId(key);
			if (next) panels.set(id, next); else panels.delete(id);
			for (const listener of listeners.get(id) ?? []) listener();
		},
		watchers: (key: ServiceKey<unknown>) => listeners.get(keyId(key))?.size ?? 0,
	};
}

function panel(label: string) {
	const unmount = vi.fn();
	const mount = vi.fn((parent: HTMLElement, _documents: EditorContextAccess) => {
		const content = parent.ownerDocument.createElement('p'); content.textContent = label; parent.append(content);
		return () => { content.remove(); unmount(); };
	});
	return { mount, unmount };
}

function selectTab(name: string) {
	fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false });
}

test('unavailable panels open General settings and switch to a registered contribution with the shared editor context', async () => {
	setLanguage('en'); const f = fixture();
	await act(() => f.leaf.onOpen());
	fireEvent.click(await screen.findByRole('button', { name: 'Open settings' }));
	expect(f.host.openWorkbenchSettings).toHaveBeenCalledWith('general');
	expect(screen.getByRole('tab', { name: 'Comments' }).getAttribute('aria-selected')).toBe('true');
	const comments = panel('Active comments');
	act(() => f.setPanel(COMMENTS_PANEL, comments));
	await screen.findByText('Active comments');
	expect(comments.mount).toHaveBeenCalledExactlyOnceWith(expect.any(HTMLElement), f.host.documents);
	expect(document.querySelectorAll('.huhu-portal-root')).toHaveLength(1);
	act(() => f.setPanel(COMMENTS_PANEL));
	await screen.findByRole('button', { name: t('editorPanel.settings') });
	expect(comments.unmount).toHaveBeenCalledOnce();
	await act(() => f.leaf.onClose());
	expect(f.leaf.contentEl.childElementCount).toBe(0);
	expect(f.leaf.contentEl.classList.contains('huhu-ui')).toBe(false);
	expect(document.querySelector('.huhu-portal-root')).toBeNull();
	expect(f.watchers(COMMENTS_PANEL)).toBe(0);
	expect(f.watchers(NOTE_HISTORY_PANEL)).toBe(0);
});

test('tabs mount only their current contribution and preserve the selected tab in leaf state', async () => {
	setLanguage('en'); const f = fixture(), comments = panel('Comment contribution'), history = panel('History contribution');
	f.setPanel(COMMENTS_PANEL, comments); f.setPanel(NOTE_HISTORY_PANEL, history);
	await act(() => f.leaf.onOpen());
	await screen.findByText('Comment contribution');
	expect(history.mount).not.toHaveBeenCalled();
	expect(f.watchers(COMMENTS_PANEL)).toBe(1);
	expect(f.watchers(NOTE_HISTORY_PANEL)).toBe(0);
	selectTab('History');
	await screen.findByText('History contribution');
	expect(comments.unmount).toHaveBeenCalledOnce();
	expect(history.mount).toHaveBeenCalledExactlyOnceWith(expect.any(HTMLElement), f.host.documents);
	expect(screen.queryByText('Comment contribution')).toBeNull();
	expect(f.watchers(COMMENTS_PANEL)).toBe(0);
	expect(f.watchers(NOTE_HISTORY_PANEL)).toBe(1);
	expect(f.leaf.getState()).toEqual({ tab: 'history' });
	selectTab('Comments');
	await screen.findByText('Comment contribution');
	expect(history.unmount).toHaveBeenCalledOnce();
	expect(comments.mount).toHaveBeenCalledTimes(2);
	expect(f.leaf.getState()).toEqual({ tab: 'comments' });
});

test('service changes remount the active contribution without remounting for inactive service changes', async () => {
	setLanguage('en'); const f = fixture(), first = panel('First comments'), replacement = panel('Replacement comments');
	const history = panel('History contribution');
	f.setPanel(COMMENTS_PANEL, first);
	await act(() => f.leaf.onOpen());
	await screen.findByText('First comments');
	act(() => f.setPanel(NOTE_HISTORY_PANEL, history));
	expect(first.mount).toHaveBeenCalledOnce();
	expect(first.unmount).not.toHaveBeenCalled();
	expect(history.mount).not.toHaveBeenCalled();
	act(() => f.setPanel(COMMENTS_PANEL, replacement));
	await screen.findByText('Replacement comments');
	expect(first.unmount).toHaveBeenCalledOnce();
	expect(replacement.mount).toHaveBeenCalledOnce();
	selectTab('History');
	await screen.findByText('History contribution');
	expect(replacement.unmount).toHaveBeenCalledOnce();
	act(() => f.setPanel(COMMENTS_PANEL));
	expect(history.mount).toHaveBeenCalledOnce();
	expect(history.unmount).not.toHaveBeenCalled();
});

test('observes a contribution that arrives between the first render and service subscription', async () => {
	setLanguage('en'); const f = fixture(), comments = panel('Arrived during mount');
	f.beforeNextWatch(() => f.setPanel(COMMENTS_PANEL, comments));
	await act(() => f.leaf.onOpen());
	await screen.findByText('Arrived during mount');
	expect(comments.mount).toHaveBeenCalledOnce();
	expect(screen.queryByRole('button', { name: 'Open settings' })).toBeNull();
});

test('setState restores History before or after the lazy host mounts and invalid states return to Comments', async () => {
	setLanguage('en'); const f = fixture(), history = panel('Restored history');
	f.setPanel(NOTE_HISTORY_PANEL, history);
	await act(async () => {
		await f.leaf.setState({ tab: 'history' }, {} as ViewStateResult);
		await f.leaf.onOpen();
	});
	await screen.findByText('Restored history');
	expect(screen.getByRole('tab', { name: 'History' }).getAttribute('aria-selected')).toBe('true');
	expect(f.leaf.getState()).toEqual({ tab: 'history' });
	expect(history.mount).toHaveBeenCalledOnce();
	await act(() => f.leaf.setState({ tab: 'unexpected' }, {} as ViewStateResult));
	await screen.findByRole('button', { name: 'Open settings' });
	expect(screen.getByRole('tab', { name: 'Comments' }).getAttribute('aria-selected')).toBe('true');
	expect(history.unmount).toHaveBeenCalledOnce();
	await act(() => f.leaf.setState({ tab: 'history' }, {} as ViewStateResult));
	await screen.findByText('Restored history');
	expect(history.mount).toHaveBeenCalledTimes(2);
});

test('closing before the lazy host resolves mounts neither a contribution nor a React root', async () => {
	const f = fixture(), history = panel('Should not mount');
	f.setPanel(NOTE_HISTORY_PANEL, history);
	await act(async () => { void f.leaf.onOpen(); void f.leaf.setState({ tab: 'history' }, {} as ViewStateResult); void f.leaf.onClose(); });
	await waitFor(() => expect(f.leaf.contentEl.childElementCount).toBe(0));
	expect(history.mount).not.toHaveBeenCalled();
	expect(document.querySelector('.huhu-portal-root')).toBeNull();
	expect(f.watchers(COMMENTS_PANEL)).toBe(0);
	expect(f.watchers(NOTE_HISTORY_PANEL)).toBe(0);
});

test('closing a React contribution releases both root lifetimes and the shared portal', async () => {
	setLanguage('en'); const f = fixture(), cleanup = vi.fn();
	function ChildPanel() {
		useEffect(() => cleanup, []);
		return <p>Nested React panel</p>;
	}
	f.setPanel(COMMENTS_PANEL, { mount: container => {
		const root = createRoot(container);
		root.render(<ContainerProviders container={container}><ChildPanel /></ContainerProviders>);
		return () => root.unmount();
	} });
	await act(() => f.leaf.onOpen());
	await screen.findByText('Nested React panel');
	expect(document.querySelectorAll('.huhu-portal-root')).toHaveLength(1);
	await act(() => f.leaf.onClose());
	expect(cleanup).toHaveBeenCalledOnce();
	expect(f.leaf.contentEl.childElementCount).toBe(0);
	expect(document.querySelector('.huhu-portal-root')).toBeNull();
});
