import { act, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import { createAnchor } from '../../core/anchor';
import { CommentStore } from '../../core/store';
import { createCommentsService } from '../../services/comments';
import { DEFAULT_COMMENTS_SETTINGS } from '../../settings';
import type { CommentsEnv } from '../env';
import { commentGutter } from './gutter';

test('native gutter marks expose status without a small interactive target', async () => {
 const files = new Map<string, string>();
 const store = new CommentStore({ exists: async path => files.has(path), read: async path => files.get(path)!, write: async (path, text) => { files.set(path, text); }, remove: async path => { files.delete(path); } }, { timers: { set: callback => window.setTimeout(callback, 1e6), clear: timer => window.clearTimeout(timer as number) } });
 const service = createCommentsService(store, () => DEFAULT_COMMENTS_SETTINGS);
 const open = vi.fn();
 const env = { service, alive: () => true, open } as unknown as CommentsEnv;
 await store.add('a.md', { anchor: createAnchor('alpha', 0, 5), text: 'A comment' });
 const factory = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'createSpan');
 Object.defineProperty(HTMLElement.prototype, 'createSpan', { configurable: true, value(this: HTMLElement, options?: { cls?: string; text?: string }) { const span = this.ownerDocument.createElement('span'); span.className = options?.cls ?? ''; span.textContent = options?.text ?? ''; this.append(span); return span; } });
 const parent = document.createElement('div'); document.body.append(parent);
 const state = EditorState.create({ doc: 'alpha', extensions: [editorInfoField.init(() => ({ file: { path: 'a.md' } }) as never), commentGutter(env)] });
 let view!: EditorView;
 try {
  await act(async () => { view = new EditorView({ state, parent }); });
  await waitFor(() => expect(parent.querySelector('.huhu-comment-marker')).toBeTruthy());
  const marker = parent.querySelector<HTMLElement>('.huhu-comment-marker')!;
  expect(marker.tagName).toBe('SPAN');
  expect(marker.getAttribute('role')).toBe('img');
  expect(marker.getAttribute('aria-label')).toBeTruthy();
  expect(marker.querySelector('button,[role=button],[tabindex]')).toBeNull();
  expect(marker.tabIndex).toBe(-1);
  fireEvent.click(marker); fireEvent.keyDown(marker, { key: 'Enter' });
  expect(open).not.toHaveBeenCalled();
 } finally { view?.destroy(); parent.remove(); service.dispose(); await store.close(); if (factory) Object.defineProperty(HTMLElement.prototype, 'createSpan', factory); else Reflect.deleteProperty(HTMLElement.prototype, 'createSpan'); }
});
