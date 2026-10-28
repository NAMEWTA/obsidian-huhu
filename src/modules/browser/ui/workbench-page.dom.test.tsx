import { expect, test, vi } from 'vitest';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import type { SharedBrowserPort } from '../../../app/contracts/shared-workspace';
import type { BrowserEngine } from '../services/host';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { t } from '../../../shared/i18n';
import { Notice } from 'obsidian';
import { BrowserCanvas, createBrowserPage } from './workbench-page';

vi.mock('obsidian', async (original) => ({ ...(await original<typeof import('obsidian')>()), Notice: vi.fn() }));

test('the Browser page binding removes its own persisted page on explicit close', async () => {
	const closePage = vi.fn(async () => {});
	const host = { closePage, getPage: () => undefined } as unknown as BrowserEngine;
	const shared = { activate: vi.fn() } as unknown as SharedBrowserPort;
	const binding = createBrowserPage(host, shared, {} as NativeSurfaceContext, {
		feature: 'browser',
		resourceId: 'p1',
	});
	await binding.closeResource!();
	expect(closePage).toHaveBeenCalledExactlyOnceWith('p1');
	closePage.mockRejectedValueOnce(new Error('x'));
	await expect(binding.closeResource!()).rejects.toThrow('x');
	const bare = createBrowserPage(host, shared, {} as NativeSurfaceContext, { feature: 'browser' });
	await bare.closeResource!();
	expect(closePage).toHaveBeenCalledTimes(2);
});

test('a page id without a record shows the empty state, mounts no other tab, and opens only on request', async () => {
	const other = {
		id: 'other',
		mount: vi.fn(),
		unmount: vi.fn(),
		store: { getState: () => ({}), subscribe: () => () => {} },
	};
	const created = { id: 'new', title: 'T', url: 'about:blank', profileId: 'default' };
	const tabs = [{ id: 'tab-o', pageId: 'other', title: '', url: '', profileId: 'default', zoom: 1, createdAt: 0 }];
	const host = {
		app: { workspace: { containerEl: { ownerDocument: document } } },
		getPage: vi.fn(() => other),
		createPage: vi.fn(() => created),
		disposePage: vi.fn(),
		renderChrome: vi.fn(async () => null),
	} as unknown as BrowserEngine;
	const open = vi.fn(async () => 'new');
	const shared = {
		list: () => tabs,
		subscribe: () => () => {},
		open,
		update: vi.fn(),
	} as unknown as SharedBrowserPort;
	render(<BrowserCanvas host={host} shared={shared} pageId="missing" />);
	expect(other.mount).not.toHaveBeenCalled();
	expect(open).not.toHaveBeenCalled();
	await userEvent.click(screen.getByRole('button', { name: t('browser.newTab') }));
	expect(host.createPage).toHaveBeenCalledWith({ restoreId: 'missing' });
	expect(open).toHaveBeenCalledWith(expect.objectContaining({ pageId: 'new' }));
});

function mountedBinding(downloads: { state: string }[]) {
	const closePage = vi.fn(async () => {});
	const page = {
		id: 'p1',
		mount: vi.fn(),
		unmount: vi.fn(),
		store: { getState: () => ({ downloads, profileId: 'default' }), subscribe: () => () => {} },
	};
	const tabs = [{ id: 'tab-1', pageId: 'p1', title: '', url: '', profileId: 'default', zoom: 1, createdAt: 0 }];
	const host = {
		app: { workspace: { containerEl: { ownerDocument: document } } },
		getPage: () => page,
		closePage,
		renderChrome: vi.fn(async () => null),
	} as unknown as BrowserEngine;
	const shared = {
		list: () => tabs,
		subscribe: () => () => {},
		update: vi.fn(),
		activate: vi.fn(),
	} as unknown as SharedBrowserPort;
	const contentEl = document.createElement('div');
	Object.assign(contentEl, {
		addClass: (...names: string[]) => contentEl.classList.add(...names),
		removeClass: (...names: string[]) => contentEl.classList.remove(...names),
	});
	document.body.appendChild(contentEl);
	const binding = createBrowserPage(
		host,
		shared,
		{ contentEl, containerEl: contentEl } as unknown as NativeSurfaceContext,
		{
			feature: 'browser',
			resourceId: 'p1',
		},
	);
	return { binding, closePage, contentEl };
}

test('closing a mounted page with running downloads asks first: cancel keeps it, confirm removes it', async () => {
	const { binding, closePage } = mountedBinding([{ state: 'progressing' }]);
	await act(async () => binding.surface.onOpen());
	let result: Promise<boolean | void> = Promise.resolve();
	await act(async () => {
		result = binding.closeResource!();
	});
	await waitFor(() => expect(screen.getByRole('alertdialog')).toBeTruthy());
	expect(screen.getByRole('alertdialog').textContent).toContain(t('browser.closeDownloads', { count: 1 }));
	await userEvent.click(screen.getByRole('button', { name: t('ui.cancel') }));
	await expect(result).resolves.toBe(false);
	expect(closePage).not.toHaveBeenCalled();
	await act(async () => {
		result = binding.closeResource!();
	});
	await waitFor(() => expect(screen.getByRole('alertdialog')).toBeTruthy());
	await userEvent.click(screen.getByRole('button', { name: t('browser.close') }));
	await expect(result).resolves.toBe(true);
	expect(closePage).toHaveBeenCalledExactlyOnceWith('p1');
	await act(async () => binding.surface.onClose());
});

test('closing without running downloads needs no confirmation, and without a dialog downloads keep the page', async () => {
	const quiet = mountedBinding([{ state: 'completed' }]);
	await expect(quiet.binding.closeResource!()).resolves.toBe(true);
	expect(quiet.closePage).toHaveBeenCalledTimes(1);
	const unmounted = mountedBinding([{ state: 'progressing' }]);
	await expect(unmounted.binding.closeResource!()).resolves.toBe(false);
	expect(unmounted.closePage).not.toHaveBeenCalled();
});

function emptyCanvas(overrides: { createPage?: () => unknown; open?: () => Promise<string> }) {
	const created = { id: 'new', title: 'T', url: 'about:blank', profileId: 'default' };
	const host = {
		app: { workspace: { containerEl: { ownerDocument: document } } },
		getPage: vi.fn(),
		createPage: vi.fn(overrides.createPage ?? (() => created)),
		disposePage: vi.fn(),
	} as unknown as BrowserEngine;
	const open = vi.fn(overrides.open ?? (async () => 'new'));
	const shared = { list: () => [], subscribe: () => () => {}, open } as unknown as SharedBrowserPort;
	render(<BrowserCanvas host={host} shared={shared} pageId="missing" />);
	return { host, open };
}

test('the New tab button is disabled while opening, so one page never gets two records', async () => {
	let finish!: (id: string) => void;
	const { open } = emptyCanvas({ open: () => new Promise<string>((resolve) => (finish = resolve)) });
	const button = screen.getByRole('button', { name: t('browser.newTab') });
	await userEvent.click(button);
	await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(true));
	await userEvent.click(button);
	expect(open).toHaveBeenCalledTimes(1);
	await act(async () => finish('new'));
	await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
});

test('New tab failures are reported and release the page', async () => {
	vi.mocked(Notice).mockClear();
	const failing = emptyCanvas({ open: async () => Promise.reject(new Error('layout busy')) });
	await userEvent.click(screen.getByRole('button', { name: t('browser.newTab') }));
	await waitFor(() => expect(failing.host.disposePage).toHaveBeenCalledWith('new'));
	expect(Notice).toHaveBeenCalledWith('layout busy');
});

test('a synchronous page creation failure is reported', async () => {
	vi.mocked(Notice).mockClear();
	emptyCanvas({
		createPage: () => {
			throw new Error('profile deleting');
		},
	});
	await userEvent.click(screen.getByRole('button', { name: t('browser.newTab') }));
	await waitFor(() => expect(Notice).toHaveBeenCalledWith('profile deleting'));
});
