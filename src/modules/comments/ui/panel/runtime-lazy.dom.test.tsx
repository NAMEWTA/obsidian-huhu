import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { ModuleContext } from '../../../../app/contracts/module';
import type { EditorContextAccess } from '../../../../app/contracts/editor-context';
import { setLanguage } from '../../../../shared/i18n';
import { memoryVault } from '../../../../../scripts/fixtures/memory-vault';
import { DEFAULT_COMMENTS_SETTINGS } from '../../settings';
import { createCommentsRuntime } from '../runtime';

const lazy = vi.hoisted(() => {
 let release!: () => void;
 const gate = new Promise<void>(resolve => { release = resolve; });
 return { gate, release, calls: [] as boolean[] };
});
vi.mock('./mount', async importOriginal => {
 await lazy.gate;
 const actual = await importOriginal<typeof import('./mount')>();
 return { ...actual, mountCommentsPanel: (...args: Parameters<typeof actual.mountCommentsPanel>) => {
  lazy.calls.push(args[3]); return actual.mountCommentsPanel(...args);
 } };
});
const cleanup: Array<() => void | Promise<void>> = [];
afterEach(async () => { lazy.release(); for (const dispose of cleanup.splice(0).reverse()) await dispose(); });

test('a real comments runtime forwards latest visibility to a late independent mount and releases it', async () => {
 setLanguage('en');
 const mem = memoryVault({}, window);
 Object.assign(mem.app.workspace, { containerEl: document.body, getActiveFile: () => null, on: mem.app.vault.on, offref: mem.app.vault.offref, getLeavesOfType: () => [] });
 const refs: Array<Parameters<typeof mem.app.vault.offref>[0]> = [], disposables: Array<() => void> = [];
 const context = { app: mem.app, lifetime: { register: (dispose: () => void) => disposables.push(dispose), registerEvent: (ref: Parameters<typeof mem.app.vault.offref>[0]) => refs.push(ref) }, editor: { addExtension() {}, addPostProcessor() {} }, commands: { add() {} }, shell: { open: async () => {} } } as unknown as ModuleContext;
 const settings = { get: () => DEFAULT_COMMENTS_SETTINGS, subscribe: () => () => {} } as unknown as Parameters<typeof createCommentsRuntime>[1];
 const runtime = await createCommentsRuntime(context, settings);
 cleanup.push(() => { runtime.dispose(); for (const ref of refs) mem.app.vault.offref(ref); for (const dispose of disposables) dispose(); });
 const container = document.createElement('div'); document.body.append(container);
 Object.assign(container, { addClass: (...names: string[]) => container.classList.add(...names), removeClass: (...names: string[]) => container.classList.remove(...names) });
 cleanup.push(() => container.remove());
 const documents: EditorContextAccess = { current: () => undefined, get: () => undefined, capture: () => { throw Error('No editor'); }, resolveLeaf: () => undefined, resolveView: () => undefined, returnTo: async () => {}, subscribe: () => () => {} };
 const handle = runtime.panel.mount(container, documents, true);
 handle.setVisible(false);
 await act(async () => { lazy.release(); await Promise.resolve(); });
 await screen.findByRole('heading', { name: /Highlights/ });
 expect(lazy.calls).toEqual([false]);
 await act(async () => handle.setVisible(true));
 await act(async () => handle.dispose());
 expect(container.childElementCount).toBe(0);
 expect(container.classList.contains('huhu-ui')).toBe(false);
 const cancelled = runtime.panel.mount(container, documents, true);
 cancelled.dispose();
 await act(async () => { await Promise.resolve(); });
 expect(lazy.calls).toEqual([false]);
 expect(container.childElementCount).toBe(0);
 await act(async () => handle.dispose());
 await waitFor(() => expect(document.querySelector('.huhu-portal-root')).toBeNull());
});
