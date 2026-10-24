import { act, fireEvent, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type DashboardPlugin from '../main';
import type { NativeSurfaceContext } from '../../ui/native-surface';
import { createSettingsPage } from './settings-page';

vi.mock('./settings-categories', () => ({ settingsCategories: () => [{ id: 'general' }, { id: 'appearance' }] }));
vi.mock('../settings/react/SettingsPage', () => ({
	SettingsPage: ({ category, navigate }: { category: string; navigate: (target: { feature: string; section?: string }) => void }) => (
		<>
			<p>{category}</p>
			<button onClick={() => navigate({ feature: 'content' })}>Browse content</button>
			<button onClick={() => navigate({ feature: 'settings', section: 'appearance' })}>Appearance</button>
		</>
	),
}));

test('settings routes content through its owner window and keeps category navigation local', async () => {
	const container = document.createElement('div');
	container.addClass = (...names) => container.classList.add(...names);
	container.removeClass = (...names) => container.classList.remove(...names);
	document.body.append(container);
	const openWorkbench = vi.fn(async () => {}), changed = vi.fn();
	const plugin = { openWorkbench, onModuleChanged: () => () => {} } as unknown as DashboardPlugin;
	const page = await createSettingsPage(plugin)({ contentEl: container, containerEl: container, changed } as unknown as NativeSurfaceContext, { feature: 'settings', section: 'general' }, {}, new AbortController().signal);
	page.surface.register = vi.fn();
	try {
		await act(() => page.surface.onOpen());
		fireEvent.click(screen.getByRole('button', { name: 'Browse content' }));
		expect(openWorkbench).toHaveBeenCalledExactlyOnceWith({ feature: 'content' }, window);
		expect(page.getTarget?.()).toMatchObject({ feature: 'settings', section: 'general' });
		expect(changed).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
		expect(page.getTarget?.()).toMatchObject({ feature: 'settings', section: 'appearance' });
		expect(changed).toHaveBeenCalledOnce();
		expect(openWorkbench).toHaveBeenCalledOnce();
	} finally {
		await act(() => page.surface.onClose());
		container.remove();
	}
});
