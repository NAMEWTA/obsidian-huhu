import { act, render, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import { useOwnerDocument, useVisible } from '../../../../ui/react/contexts';
import { BrowserTabView } from './BrowserTabView';
import type { BrowserTabData } from '../../core/workspace/model';
const fixture = vi.hoisted(() => ({ controller: {} as object }));
vi.mock('../workspace/workspace-context', () => ({ useWorkspaceUI: () => ({ controller: fixture.controller }) }));
it('adopts the shared viewer into another Document without creating or owning a Page', async () => {
	Object.defineProperty(document.body, 'win', { configurable: true, value: window });
	const container = document.body.appendChild(document.createElement('div'));
	const iframe = document.body.appendChild(document.createElement('iframe'));
	const target = iframe.contentDocument!;
	function Viewer() {
		const owner = useOwnerDocument(),
			visible = useVisible();
		return <span data-viewer-owner={owner === document ? 'main' : 'popout'} data-visible={visible} />;
	}
	const state = createStore(() => ({ spaces: [{ id: 'space', pages: [{ id: 'page', title: 'Fixture' }] }] }));
	const host = {
		getState: state.getState,
		subscribe: state.subscribe,
		renderViewer: vi.fn(async () => <Viewer />),
		createSpace: vi.fn(),
		stopSpace: vi.fn(),
		closePage: vi.fn(),
	};
	fixture.controller = {
		app: { workspace: { containerEl: document.body, on: vi.fn(), offref: vi.fn() } },
		browserWorkspace: () => host,
		workspace: { updateBrowser: vi.fn() },
	};
	const tab: BrowserTabData = {
		id: 'tab',
		spaceId: 'space',
		pageId: 'page',
		kind: 'browser',
		title: 'Fixture',
		createdAt: 1,
	};
	const content = (active: boolean) => (
		<TestProviders ownerDocument={document}>
			<BrowserTabView tab={tab} active={active} />
		</TestProviders>
	);
	const view = render(content(true), { container });
	await waitFor(() =>
		expect(container.querySelector('[data-viewer-owner]')?.getAttribute('data-viewer-owner')).toBe('main'),
	);
	await act(async () => {
		target.body.appendChild(container);
	});
	await waitFor(() =>
		expect(container.querySelector('[data-viewer-owner]')?.getAttribute('data-viewer-owner')).toBe('popout'),
	);
	await act(async () => {
		document.body.appendChild(container);
	});
	await waitFor(() =>
		expect(container.querySelector('[data-viewer-owner]')?.getAttribute('data-viewer-owner')).toBe('main'),
	);
	view.rerender(content(false));
	await waitFor(() => expect(container.querySelector('[data-visible]')?.getAttribute('data-visible')).toBe('false'));
	expect(host.renderViewer).toHaveBeenCalledOnce();
	expect(host.renderViewer).toHaveBeenCalledWith({ spaceId: 'space', pageId: 'page' });
	expect(host.createSpace).not.toHaveBeenCalled();
	view.unmount();
	iframe.remove();
	container.remove();
	expect(host.closePage).not.toHaveBeenCalled();
	expect(host.stopSpace).not.toHaveBeenCalled();
});
