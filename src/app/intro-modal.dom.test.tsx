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
			Object.assign(this.contentEl, {
				empty: () => this.contentEl.replaceChildren(),
				createEl: (tag: string, options: { text?: string; attr?: Record<string, string> } = {}) => {
					const node = this.contentEl.ownerDocument.createElement(tag);
					node.textContent = options.text ?? '';
					for (const [key, value] of Object.entries(options.attr ?? {})) node.setAttribute(key, value);
					this.contentEl.append(node);
					return node;
				},
			});
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
	expect(seen).not.toHaveBeenCalled();
	await act(async () => {
		modal.onOpen();
		modal.onClose();
		modal.onOpen();
	});
	await waitFor(() => expect(modal.contentEl.querySelectorAll('button').length).toBe(1));
	expect(document.querySelectorAll('.huhu-design.huhu-portal-root').length).toBe(1);
	await act(async () => modal.onClose());
	expect(seen).toHaveBeenCalledTimes(1);
	expect(document.querySelector('.huhu-design.huhu-portal-root')).toBeNull();
	modal.contentEl.remove();
});

test('plugin cancellation before lazy mount cannot mark seen or create a late root', async () => {
	const seen = vi.fn(),
		modal = new IntroModal({} as App, seen);
	await act(async () => {
		modal.onOpen();
		modal.cancel();
	});
	expect(modal.contentEl.childElementCount).toBe(0);
	expect(seen).not.toHaveBeenCalled();
	expect(document.querySelector('.huhu-design.huhu-portal-root')).toBeNull();
	await act(async () => {
		modal.onOpen();
		modal.cancel();
	});
	expect(modal.contentEl.childElementCount).toBe(0);
	expect(seen).not.toHaveBeenCalled();
	modal.contentEl.remove();
});
test('plugin cancellation disposes a mounted intro once without marking seen', async () => {
	const seen = vi.fn(),
		modal = new IntroModal({} as App, seen);
	await act(async () => modal.onOpen());
	await waitFor(() => expect(modal.contentEl.querySelector('button')).not.toBeNull());
	await act(async () => {
		modal.cancel();
		modal.cancel();
	});
	expect(modal.contentEl.childElementCount).toBe(0);
	expect(seen).not.toHaveBeenCalled();
	expect(document.querySelector('.huhu-design.huhu-portal-root')).toBeNull();
	modal.contentEl.remove();
});

test('a failed lazy import closes without acknowledging content and a later retry can acknowledge once', async () => {
	vi.doMock('./intro-content', () => {
		throw new Error('Rejected intro import');
	});
	const seen = vi.fn(),
		modal = new IntroModal({} as App, seen);
	try {
		await act(async () => modal.onOpen());
		await waitFor(() => expect(modal.contentEl.querySelector('[role=alert]')).not.toBeNull());
		await act(async () => modal.close());
		expect(seen).not.toHaveBeenCalled();
		await act(async () => modal.onOpen());
		await waitFor(() => expect(modal.contentEl.querySelector('[role=alert]')).not.toBeNull());
		vi.doUnmock('./intro-content');
		await act(async () => fireEvent.click(modal.contentEl.querySelector('button')!));
		await waitFor(() => expect(modal.contentEl.querySelector('.huhu-design button')).not.toBeNull());
		await act(async () => fireEvent.click(modal.contentEl.querySelector('.huhu-design button')!));
		expect(seen).toHaveBeenCalledTimes(1);
		expect(modal.contentEl.childElementCount).toBe(0);
		vi.doMock('./intro-content', () => {
			throw new Error('Rejected reopened intro import');
		});
		await act(async () => modal.onOpen());
		await waitFor(() => expect(modal.contentEl.querySelector('[role=alert]')).not.toBeNull());
		await act(async () => modal.close());
		expect(seen).toHaveBeenCalledTimes(1);
	} finally {
		vi.doUnmock('./intro-content');
		await act(async () => modal.cancel());
		modal.contentEl.remove();
	}
});

test('owner cancellation of a failed intro releases retry UI without acknowledging it', async () => {
	vi.doMock('./intro-content', () => {
		throw new Error('Rejected intro import');
	});
	const seen = vi.fn(),
		modal = new IntroModal({} as App, seen);
	try {
		await act(async () => modal.onOpen());
		await waitFor(() => expect(modal.contentEl.querySelector('[role=alert]')).not.toBeNull());
		await act(async () => modal.cancel());
		expect(seen).not.toHaveBeenCalled();
		expect(modal.contentEl.childElementCount).toBe(0);
	} finally {
		vi.doUnmock('./intro-content');
		modal.contentEl.remove();
	}
});
