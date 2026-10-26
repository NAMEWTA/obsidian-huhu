import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { HuhuProviders } from '../../../ui/react/providers';
import { t } from '../../../shared/i18n';
import { SpaceViewer } from './SpaceViewer';
import { workspaceFixture } from './testing/workspace';

const draw = vi.fn(),
	clear = vi.fn();
beforeEach(() => {
	class Image {
		naturalWidth = 1280;
		naturalHeight = 800;
		onload: (() => void) | null = null;
		onerror: (() => void) | null = null;
		set src(value: string) {
			if (value) queueMicrotask(() => this.onload?.());
		}
	}
	vi.stubGlobal('Image', Image);
	vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:viewer-test');
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
		drawImage: draw,
		clearRect: clear,
	} as unknown as CanvasRenderingContext2D);
	vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
		left: 0,
		top: 0,
		width: 800,
		height: 500,
		right: 800,
		bottom: 500,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	});
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	draw.mockClear();
	clear.mockClear();
});

async function human(f: ReturnType<typeof workspaceFixture>) {
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.takeover') }));
	await waitFor(() => expect(f.api.takeover).toHaveBeenCalledOnce());
	await waitFor(() => expect(screen.getByLabelText(t('browser.v2.textInput'))).toBeTruthy());
	const frame = f.frame();
	act(() => f.emit(frame));
	await waitFor(() => expect(f.ack).toHaveBeenCalledWith(frame.frameId));
	return frame;
}

it('opens as an observer, retains the stream during takeover, rejects stale frames and releases only its viewer on close', async () => {
	const f = workspaceFixture();
	const view = render(
		<TestProviders>
			<SpaceViewer api={f.api} spaceId="space" pageId="page" />
		</TestProviders>,
	);
	const canvas = screen.getByLabelText(t('browser.v2.canvas'));
	const old = f.frame();
	act(() => f.emit(old));
	await waitFor(() => expect(f.ack).toHaveBeenCalledWith(old.frameId));
	fireEvent.click(canvas, { clientX: 400, clientY: 250 });
	expect(f.api.humanInput).not.toHaveBeenCalled();
	const current = await human(f);
	expect(f.api.subscribeFrames).toHaveBeenCalledOnce();
	expect(f.disposeFrames).not.toHaveBeenCalled();
	expect(f.api.releaseViewer).not.toHaveBeenCalled();
	const paints = draw.mock.calls.length;
	act(() => f.emit({ ...old, frameId: 'late-old' }));
	await waitFor(() => expect(f.ack).toHaveBeenCalledWith('late-old'));
	expect(draw).toHaveBeenCalledTimes(paints);
	fireEvent.click(canvas, { clientX: 400, clientY: 250 });
	await waitFor(() =>
		expect(f.api.humanInput).toHaveBeenCalledWith(
			expect.objectContaining({
				frameId: current.frameId,
				epoch: 2,
				input: { kind: 'click', x: 640, y: 400, button: 'left', clickCount: 1 },
			}),
		),
	);
	view.unmount();
	expect(f.api.releaseViewer).toHaveBeenCalledWith('space', expect.any(String));
	expect(f.disposeFrames).toHaveBeenCalledOnce();
	expect(f.api.stopSpace).not.toHaveBeenCalled();
});

it('keeps Chinese composition and edited drafts until insertion succeeds, and never captures sibling host input', async () => {
	const f = workspaceFixture();
	let finish!: () => void;
	vi.mocked(f.api.humanInput).mockImplementation(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	);
	render(
		<TestProviders>
			<input aria-label="Obsidian note" />
			<SpaceViewer api={f.api} spaceId="space" pageId="page" />
		</TestProviders>,
	);
	await human(f);
	const host = screen.getByLabelText('Obsidian note');
	host.focus();
	fireEvent.keyDown(host, { key: 'a' });
	expect(f.api.humanInput).not.toHaveBeenCalled();
	const textarea = screen.getByLabelText(t('browser.v2.textInput')) as HTMLTextAreaElement;
	fireEvent.compositionStart(textarea);
	fireEvent.change(textarea, { target: { value: '中文测试' } });
	expect((screen.getByRole('button', { name: t('browser.v2.insertText') }) as HTMLButtonElement).disabled).toBe(true);
	fireEvent.compositionEnd(textarea);
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.insertText') }));
	expect(f.api.humanInput).toHaveBeenCalledWith(
		expect.objectContaining({ input: { kind: 'text', text: '中文测试' } }),
	);
	expect(textarea.value).toBe('中文测试');
	fireEvent.change(textarea, { target: { value: '继续输入' } });
	await act(async () => finish());
	expect(textarea.value).toBe('继续输入');
});

it('hidden presentation releases its human lease and cannot emit input', async () => {
	const f = workspaceFixture();
	const content = (visible: boolean) => (
		<HuhuProviders ownerDocument={document} visible={visible}>
			<SpaceViewer api={f.api} spaceId="space" pageId="page" />
		</HuhuProviders>
	);
	const view = render(content(true));
	await human(f);
	view.rerender(content(false));
	await waitFor(() => expect(f.api.releaseViewer).toHaveBeenCalled());
	fireEvent.keyDown(screen.getByLabelText(t('browser.v2.canvas')), { key: 'x' });
	expect(f.api.humanInput).not.toHaveBeenCalled();
});

it('clears old geometry before zoom and keeps a fresh static frame delivered before command completion', async () => {
	const f = workspaceFixture();
	render(
		<TestProviders>
			<SpaceViewer api={f.api} spaceId="space" pageId="page" />
		</TestProviders>,
	);
	await human(f);
	let freshId = '';
	vi.mocked(f.api.pageAction).mockImplementation(async (request) => {
		expect(request.command).toEqual({ kind: 'zoom', factor: 1.25 });
		const state = f.api.getState(),
			space = state.spaces[0]!;
		f.set({ ...state, spaces: [{ ...space, pages: [{ ...space.pages[0]!, zoom: 1.25, viewportVersion: 2 }] }] });
		const fresh = f.frame({ cssWidth: 1024, cssHeight: 640 });
		freshId = fresh.frameId;
		f.emit(fresh);
		await Promise.resolve();
		await Promise.resolve();
		return { viewportVersion: 2 };
	});
	fireEvent.keyDown(screen.getByRole('combobox', { name: t('browser.v2.zoom') }), { key: 'ArrowDown' });
	fireEvent.keyDown(await screen.findByRole('option', { name: '125%' }), { key: 'Enter' });
	await waitFor(() => expect(f.api.pageAction).toHaveBeenCalledOnce());
	await waitFor(() => expect(f.ack).toHaveBeenCalledWith(freshId));
	expect(screen.queryByText(t('browser.v2.waitingFrame'))).toBeNull();
	fireEvent.click(screen.getByLabelText(t('browser.v2.canvas')), { clientX: 400, clientY: 250 });
	await waitFor(() =>
		expect(f.api.humanInput).toHaveBeenCalledWith(
			expect.objectContaining({
				frameId: freshId,
				input: { kind: 'click', x: 512, y: 320, button: 'left', clickCount: 1 },
			}),
		),
	);
});

it('copies a scoped Agent connection only after explicit click, with task creation disabled by default', async () => {
	const f = workspaceFixture(),
		state = f.api.getState();
	f.set({ ...state, spaces: [{ ...state.spaces[0]!, control: { mode: 'agent', epoch: 2 } }] });
	const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
	render(
		<TestProviders>
			<SpaceViewer api={f.api} spaceId="space" pageId="page" />
		</TestProviders>,
	);
	expect(clipboard).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('button', { name: t('browser.v2.copyConnection') }));
	await waitFor(() => expect(clipboard).toHaveBeenCalledWith('private-connection'));
	expect(f.api.copyAgentConnection).toHaveBeenCalledWith('space', { allowTaskCreation: false });
	expect(document.body.textContent).not.toContain('private-connection');
});

it('resolves address input and leaves revocation usable while page navigation is pending', async () => {
	const f = workspaceFixture();
	let finish!: () => void;
	vi.spyOn(f.api, 'resolveInput').mockReturnValue('https://example.org/');
	vi.mocked(f.api.navigate).mockImplementation(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	);
	render(
		<TestProviders>
			<SpaceViewer api={f.api} spaceId="space" pageId="page" />
		</TestProviders>,
	);
	await human(f);
	const address = screen.getByLabelText(t('browser.v2.address'));
	fireEvent.change(address, { target: { value: 'example.org' } });
	fireEvent.submit(address.closest('form')!);
	expect(f.api.resolveInput).toHaveBeenCalledWith('example.org');
	expect(f.api.navigate).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://example.org/' }));
	const release = screen.getByRole('button', { name: t('browser.v2.release') }) as HTMLButtonElement;
	expect(release.disabled).toBe(false);
	fireEvent.click(release);
	await waitFor(() => expect(f.api.releaseViewer).toHaveBeenCalledWith('space', expect.any(String)));
	await act(async () => finish());
});
