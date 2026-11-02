import { act, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { App } from 'obsidian';
import { IntroModal } from './intro-modal';
import { setLanguage, t } from '../shared/i18n';
vi.mock('obsidian', async (original) => ({
	...(await original<typeof import('obsidian')>()),
	Modal: class {
		contentEl = document.createElement('div');
		constructor() {
			document.body.append(this.contentEl);
			Object.assign(this.contentEl, { empty: () => this.contentEl.replaceChildren() });
		}
		close() {
			(this as unknown as IntroModal).onClose();
		}
	},
}));
test('intro mounts a scoped owner root and closes exactly once without leaving portals', async () => {
	const seen = vi.fn(),
		modal = new IntroModal({} as App, seen);
	await act(async () => modal.onOpen());
	await waitFor(() => expect(modal.contentEl.querySelector('button')).not.toBeNull());
	const button = modal.contentEl.querySelector('button')!;
	expect(button.textContent).toBe(t('intro.ok'));
	expect(button.closest('.huhu-design')).not.toBeNull();
	await act(async () => setLanguage('en'));
	expect(button.textContent).toBe(t('intro.ok'));
	await act(async () => setLanguage('zh'));
	expect(button.textContent).toBe(t('intro.ok'));
	expect(document.querySelector('.huhu-design.huhu-portal-root')).not.toBeNull();
	fireEvent.click(button);
	await waitFor(() => expect(modal.contentEl.childElementCount).toBe(0));
	modal.onClose();
	expect(seen).toHaveBeenCalledOnce();
	expect(document.querySelector('.huhu-design.huhu-portal-root')).toBeNull();
	modal.contentEl.remove();
});

test('close before a late content import cannot mount, while a reopened generation owns one root', async () => {
	const seen = vi.fn(),
		modal = new IntroModal({} as App, seen);
	await act(async () => {
		modal.onOpen();
		modal.onClose();
	});
	expect(modal.contentEl.childElementCount).toBe(0);
	expect(document.querySelector('.huhu-design.huhu-portal-root')).toBeNull();
	expect(seen).toHaveBeenCalledTimes(1);
	await act(async () => {
		modal.onOpen();
		modal.onClose();
		modal.onOpen();
	});
	await waitFor(() => expect(modal.contentEl.querySelectorAll('button').length).toBe(1));
	expect(document.querySelectorAll('.huhu-design.huhu-portal-root').length).toBe(1);
	await act(async () => modal.onClose());
	expect(seen).toHaveBeenCalledTimes(3);
	expect(document.querySelector('.huhu-design.huhu-portal-root')).toBeNull();
	modal.contentEl.remove();
});
