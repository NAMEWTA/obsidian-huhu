import { act, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { FeedbackHost, reportOperationFailure } from './feedback';
import { mountFeedbackRenderer } from '../../app/main';
import { setLanguage } from '../../shared/i18n';

vi.mock('obsidian', async importOriginal => ({
	...await importOriginal<typeof import('obsidian')>(),
	Plugin: class {}, ItemView: class {},
}));

const cleanup: Array<() => void> = [];
afterEach(async () => {
	await act(async () => { for (const dispose of cleanup.splice(0).reverse()) dispose(); });
	vi.restoreAllMocks();
});

function fixture() {
	setLanguage('en');
	const frame = document.createElement('iframe');
	document.body.append(frame);
	const other = frame.contentWindow!;
	for (const doc of [document, other.document]) {
		const workbench = doc.createElement('div');
		workbench.className = 'huhu-workbench-view';
		doc.body.append(workbench);
		cleanup.push(() => workbench.remove());
	}
	cleanup.push(() => frame.remove());
	const host = new FeedbackHost({ mount: mountFeedbackRenderer });
	host.bind(window);
	host.bind(other);
	cleanup.push(() => host.dispose());
	return { host, other };
}

test('real sonner renders 100 updates in one instance and isolates two Documents through window close', async () => {
	const { host, other } = fixture();
	await act(async () => {
		for (let completed = 0; completed < 100; completed++) host.publish(window, { operationId: 'main', source: 'archives', message: { key: 'archives.saveActive' }, progress: { completed, total: 100 } });
		host.publish(other, { operationId: 'other', source: 'safe', message: { key: 'safe.error.clipboard' }, outcome: 'failed' });
	});
	await waitFor(() => {
		expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);
		expect(other.document.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);
		expect(document.querySelector('.huhu-feedback-root')?.textContent).toContain('99 / 100');
	});
	expect(document.querySelector('.huhu-feedback-root')?.textContent).not.toContain('The clipboard could not');
	expect(other.document.querySelector('.huhu-feedback-root')?.textContent).not.toContain('Save active');
	await act(async () => host.publish(window, { operationId: 'main', source: 'archives', message: { key: 'archives.draftSaved' }, outcome: 'success', receipt: { committed: true } }));
	await waitFor(() => {
		expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);
		expect(document.querySelector('[data-sonner-toast]')?.getAttribute('data-type')).toBe('success');
		expect(document.querySelector('.huhu-feedback-root')?.textContent).not.toContain('99 / 100');
	});
	await act(async () => { other.dispatchEvent(new Event('unload')); });
	expect(other.document.querySelector('.huhu-feedback-root')).toBeNull();
	expect(document.querySelectorAll('.huhu-feedback-root')).toHaveLength(1);
	await act(async () => host.dispose());
	expect(document.querySelector('.huhu-feedback-root')).toBeNull();
});

test('native fallback stays in its target Document and reports without a notifications runtime', () => {
	const notices: HTMLElement[] = [];
	const host = new FeedbackHost({ mount: mountFeedbackRenderer, notice: text => {
		const containerEl = document.createElement('div');
		notices.push(containerEl);
		containerEl.textContent = text;
		return { containerEl, setMessage: message => { containerEl.replaceChildren(message); return {} as never; }, hide: () => containerEl.remove() };
	} });
	cleanup.push(() => host.dispose());
	host.bind(window);
	reportOperationFailure(window, 'archives', 'archives.saveFailed');
	expect(notices).toHaveLength(1);
	expect(notices[0]?.textContent).toContain('could not be saved');
	expect(notices[0]?.ownerDocument).toBe(document);
	host.dispose();
	expect(document.querySelector('.notices-container')).toBeNull();
});

test('late UI loading after a target closes cannot recreate its Portal', async () => {
	let release!: () => void;
	const barrier = new Promise<void>(resolve => { release = resolve; });
	const host = new FeedbackHost({ mount: async (container, id) => {
		await barrier;
		return mountFeedbackRenderer(container, id);
	} });
	const workbench = document.createElement('div');
	workbench.className = 'huhu-workbench-view';
	document.body.append(workbench);
	cleanup.push(() => workbench.remove(), () => host.dispose());
	host.bind(window);
	host.publish(window, { operationId: 'late', source: 'safe', message: { key: 'safe.error.clipboard' }, outcome: 'failed' });
	host.close(window);
	await act(async () => { release(); await barrier; });
	expect(document.querySelector('.huhu-feedback-root')).toBeNull();
});

test('UI loader failure falls back for the first and subsequent operations in the owning Document', async () => {
	const frame = document.createElement('iframe');
	document.body.append(frame);
	const other = frame.contentWindow!;
	other.document.body.innerHTML = '<div class="huhu-workbench-view"></div>';
	const notices: HTMLElement[] = [];
	const host = new FeedbackHost({
		mount: async () => { throw new Error('PRIVATE-LOADER-ERROR'); },
		notice: () => {
			const containerEl = document.createElement('div');
			notices.push(containerEl);
			return { containerEl, setMessage: message => { containerEl.replaceChildren(message); return {} as never; }, hide: () => containerEl.remove() };
		},
	});
	cleanup.push(() => frame.remove(), () => host.dispose());
	host.bind(other);
	host.publish(other, { operationId: 'first', source: 'archives', message: { key: 'archives.saveFailed' }, outcome: 'failed' });
	await waitFor(() => expect(notices).toHaveLength(1));
	host.publish(other, { operationId: 'second', source: 'archives', message: { key: 'archives.saveFailed' }, outcome: 'failed' });
	expect(notices).toHaveLength(2);
	expect(notices.every(node => node.ownerDocument === other.document && node.isConnected)).toBe(true);
	expect(other.document.body.textContent).not.toContain('PRIVATE-');
	expect(other.document.querySelector('.huhu-feedback-root')).toBeNull();
	host.close(other);
	expect(notices.every(node => !node.isConnected)).toBe(true);
});

test('closing the last workbench removes the old sonner progress before showing its result in Notice', async () => {
	setLanguage('en');
	const workbench = document.createElement('div');
	workbench.className = 'huhu-workbench-view';
	document.body.append(workbench);
	const removals: string[] = [];
	const notices: HTMLElement[] = [];
	let removedBeforeNotice = false;
	const host = new FeedbackHost({
		mount: async (container, id) => {
			const renderer = await mountFeedbackRenderer(container, id);
			return { ...renderer, remove: feedbackId => { removals.push(feedbackId); renderer.remove(feedbackId); } };
		},
		notice: () => {
			removedBeforeNotice = removals.length === 1;
			const containerEl = document.createElement('div');
			notices.push(containerEl);
			return { containerEl, setMessage: message => { containerEl.replaceChildren(message); return {} as never; }, hide: () => containerEl.remove() };
		},
	});
	cleanup.push(() => workbench.remove(), () => host.dispose());
	host.bind(window);
	await act(async () => host.publish(window, { operationId: 'switch', source: 'archives', message: { key: 'archives.saveActive' }, progress: { completed: 1, total: 10 } }));
	await waitFor(() => expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(1));
	expect(document.querySelector('.huhu-feedback-root')?.textContent).toContain('1 / 10');
	workbench.remove();
	await act(async () => host.publish(window, { operationId: 'switch', source: 'archives', message: { key: 'archives.saveFailed' }, outcome: 'failed' }));
	expect(removedBeforeNotice).toBe(true);
	expect(notices).toHaveLength(1);
	expect(notices[0]?.textContent).toBe('The record could not be saved. Keep your changes and try again.');
	await waitFor(() => expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(0));
	expect(notices[0]?.isConnected).toBe(true);
	expect(notices[0]?.querySelector('progress')).toBeNull();
});
