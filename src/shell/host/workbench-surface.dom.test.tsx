import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import type { WorkbenchHost, WorkbenchLeafView, WorkbenchSurface } from '../../app/contracts/workbench-host';
import { NativeSurface } from '../../ui/native-surface';
import { t } from '../../shared/i18n';
import { createWorkbenchSurface } from './workbench-surface';

vi.mock('obsidian', async (original) => ({
	...(await original<typeof import('obsidian')>()),
	Component: class {
		private cleanups: (() => void)[] = [];
		register(cleanup: () => void) {
			this.cleanups.push(cleanup);
		}
		unload() {
			for (const cleanup of this.cleanups.splice(0)) cleanup();
		}
	},
}));
afterEach(() => vi.restoreAllMocks());

test('WorkbenchSurface.setVisible releases shell portals, forwards visibility and keeps independent pages alive', async () => {
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
		width: 800,
		height: 800,
		left: 0,
		top: 0,
		right: 800,
		bottom: 800,
		x: 0,
		y: 0,
		toJSON() {},
	});
	const contentEl = document.createElement('div');
	Object.assign(contentEl, {
		addClass: (...names: string[]) => contentEl.classList.add(...names),
		removeClass: (...names: string[]) => contentEl.classList.remove(...names),
		onWindowMigrated: () => () => {},
	});
	Object.defineProperty(contentEl, 'win', { value: window });
	document.body.appendChild(contentEl);
	const destination = document.createElement('input');
	document.body.appendChild(destination);
	const view = {
		contentEl,
		app: { workspace: { requestSaveLayout: vi.fn() } },
		addChild: (child: unknown) => child,
		removeChild: (child: { unload(): void }) => child.unload(),
	} as unknown as WorkbenchLeafView;
	class Page extends NativeSurface {
		getViewType() {
			return 'fixture';
		}
		getDisplayText() {
			return 'Fixture';
		}
		getIcon() {
			return 'file';
		}
		override onOpen = vi.fn(async () => {
			this.contentEl.textContent = 'Page stays mounted';
		});
		override onClose = vi.fn(async () => {});
		override setVisible = vi.fn();
	}
	let page!: Page;
	const host: WorkbenchHost = {
		contributions: [
			{
				id: 'settings',
				rail: { slot: 'bottom' },
				navigation: { id: 'settings', labelKey: 'workbench.settings', icon: 'settings' },
				availability: () => ({ enabled: true, supported: true, ready: true }),
				stateKeys: [],
				panel: () => ({ searchable: true, sections: [] }),
				create: async (context) => {
					page = new Page(context);
					return { surface: page, navigate: async () => {} };
				},
			},
		],
		subscribe: () => () => {},
		failed: () => false,
		report: vi.fn(),
		openSettings: vi.fn(),
		openFocus: async () => {},
		openInWorkbench: async () => {},
	};
	let surface!: WorkbenchSurface;
	await act(async () => {
		surface = createWorkbenchSurface(view, host, { target: { feature: 'settings' } });
		await surface.ensureActivePage();
	});
	try {
		const user = userEvent.setup();
		const slot = contentEl.querySelector('.huhu-shell-pages');
		const pageElement = page.contentEl;
		await user.click(screen.getByRole('button', { name: t('workbench.toggleNavigation') }));
		expect(screen.getByRole('dialog')).toBeTruthy();
		await act(async () => {
			surface.setVisible(false);
		});
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.body.style.pointerEvents).toBe('');
		expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
		expect(page.setVisible).toHaveBeenLastCalledWith(false);
		await user.click(destination);
		await user.keyboard('new leaf');
		await act(async () => surface.navigate({ feature: 'settings', section: 'other' }));
		expect(page.setVisible).toHaveBeenLastCalledWith(false);
		await act(async () => surface.setVisible(true));
		expect(page.setVisible).toHaveBeenLastCalledWith(true);
		expect(page.onOpen).toHaveBeenCalledTimes(1);
		expect(page.onClose).not.toHaveBeenCalled();
		expect(pageElement.isConnected).toBe(true);
		expect(contentEl.querySelector('.huhu-shell-pages')).toBe(slot);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.activeElement).toBe(destination);
		expect(destination.value).toBe('new leaf');
	} finally {
		await act(async () => surface.dispose());
		contentEl.remove();
		destination.remove();
	}
	await waitFor(() => expect(document.querySelector('.huhu-portal-root')).toBeNull());
});

test('a contribution that redirects a target never creates its own page: the target feature does', async () => {
	const contentEl = document.createElement('div');
	Object.assign(contentEl, {
		addClass: (...names: string[]) => contentEl.classList.add(...names),
		removeClass: (...names: string[]) => contentEl.classList.remove(...names),
		onWindowMigrated: () => () => {},
	});
	Object.defineProperty(contentEl, 'win', { value: window });
	document.body.appendChild(contentEl);
	const view = {
		contentEl,
		app: { workspace: { requestSaveLayout: vi.fn() } },
		addChild: (child: unknown) => child,
		removeChild: (child: { unload(): void }) => child.unload(),
	} as unknown as WorkbenchLeafView;
	class Page extends NativeSurface {
		getViewType() {
			return 'fixture';
		}
		getDisplayText() {
			return 'Fixture';
		}
		getIcon() {
			return 'file';
		}
	}
	const shown: string[] = [];
	const standalone = vi.fn(async () => {
		throw new Error('the redirected feature must not build a page');
	});
	let redirectTo: 'terminal' | undefined = 'terminal';
	const host: WorkbenchHost = {
		contributions: [
			{
				id: 'terminal',
				rail: { slot: 'top' },
				navigation: { id: 'terminal', labelKey: 'workbench.agent', icon: 'bot' },
				availability: () => ({ enabled: true, supported: true, ready: true }),
				stateKeys: [],
				create: async (context) => {
					const page = new Page(context);
					return {
						surface: page,
						navigate: async (target) => {
							shown.push(`${target.feature}:${target.section ?? ''}:${target.resourceId ?? ''}`);
						},
					};
				},
			},
			{
				id: 'automations',
				navigation: { id: 'automations', labelKey: 'workbench.automations', icon: 'workflow' },
				availability: () => ({ enabled: true, supported: true, ready: true }),
				stateKeys: [],
				redirect: (target) =>
					redirectTo && { feature: redirectTo, section: 'usage', resourceId: target.resourceId },
				create: standalone,
			},
		],
		subscribe: () => () => {},
		failed: () => false,
		report: vi.fn(),
		openSettings: vi.fn(),
		openFocus: async () => {},
		openInWorkbench: async () => {},
	};
	let surface!: WorkbenchSurface;
	await act(async () => {
		surface = createWorkbenchSurface(view, host, { target: { feature: 'terminal' } });
		await surface.ensureActivePage();
	});
	try {
		await act(async () => surface.navigate({ feature: 'automations', section: 'tasks', resourceId: 'abc' }));
		expect(shown).toEqual(['terminal::', 'terminal:usage:abc']);
		expect(standalone).not.toHaveBeenCalled();
		expect(surface.getState().target).toMatchObject({ feature: 'terminal', section: 'usage', resourceId: 'abc' });
		redirectTo = undefined;
		await expect(act(async () => surface.navigate({ feature: 'automations' }))).rejects.toThrow('must not build');
		expect(standalone).toHaveBeenCalledTimes(1);
	} finally {
		await act(async () => surface.dispose());
		contentEl.remove();
	}
});
