import { afterEach, expect, test, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import type { App } from 'obsidian';
import { registerMessages, setLanguage, t } from '../../../../shared/i18n';
import { messages } from '../../../../shared/i18n/lazy/appearance';
import { themeSettings } from '../../../../theme/settings';
import { mountStylePreview, PREVIEW_DOCUMENT } from './preview-document';

const host = vi.hoisted(() => ({ render: vi.fn(), load: vi.fn(), unload: vi.fn() }));
vi.mock('obsidian', () => ({
	getIcon: () => undefined,
	Component: class {
		load = host.load;
		unload = host.unload;
	},
	MarkdownRenderer: { render: host.render },
}));
registerMessages(messages);
afterEach(() => vi.clearAllMocks());

test('the preview uses the owning document CSS and resolver without changing that document', async () => {
	setLanguage('en');
	const source = document.implementation.createHTMLDocument('popout owner');
	const target = document.implementation.createHTMLDocument('preview');
	source.body.className = 'theme-dark community-choice huhu-themed huhu-theme--custom huhu-md-style--suliworld';
	source.body.style.setProperty('--nt-background', '#123456');
	source.body.style.setProperty('--font-text-override', 'User Font');
	const css = source.createElement('style');
	css.textContent = '.owner-only { color: red; }';
	source.head.appendChild(css);
	host.render.mockImplementation(async (_app: App, _markdown: string, element: HTMLElement) => {
		const link = target.createElement('a');
		link.href = '#sample';
		link.textContent = 'Sample link';
		const task = target.createElement('input');
		task.type = 'checkbox';
		element.append(link, task);
	});
	const settings = themeSettings.normalize({ preset: 'suliworld', editor: 'github', suliworldVariant: 'forest' });
	const cleanup = mountStylePreview({
		app: {} as App,
		source,
		target,
		settings,
		mode: 'light',
		narrow: false,
		language: 'en',
		t,
	});
	await waitFor(() => expect(target.querySelector('input')?.disabled).toBe(true));
	expect(host.render.mock.calls[0]?.[1]).toBe(t('appearance.previewMarkdown'));
	expect(host.render.mock.calls[0]?.[3]).toBe('');
	const rendered = host.render.mock.calls[0]![2] as HTMLElement;
	expect(rendered.ownerDocument).toBe(source);
	expect(rendered.isConnected).toBe(false);
	expect(target.querySelector('input')).not.toBe(rendered.querySelector('input'));
	expect(target.querySelector('style')?.textContent).toBe(css.textContent);
	expect(target.body.classList.contains('community-choice')).toBe(true);
	expect(target.body.classList.contains('theme-light')).toBe(true);
	expect(target.body.classList.contains('huhu-theme-variant--forest')).toBe(true);
	expect(target.body.classList.contains('huhu-md-style--github')).toBe(true);
	expect(target.body.classList.contains('huhu-md-style--suliworld')).toBe(false);
	expect(target.body.classList.contains('huhu-theme-cards')).toBe(false);
	expect(target.body.style.getPropertyValue('--nt-background')).toBe('');
	expect(target.body.style.getPropertyValue('--font-text-override')).toBe('User Font');
	expect(source.body.classList.contains('theme-dark')).toBe(true);
	expect(source.body.style.getPropertyValue('--nt-background')).toBe('#123456');
	expect(target.documentElement.lang).toBe('en');
	const link = target.querySelector('a')!;
	const click = new MouseEvent('click', { bubbles: true, cancelable: true });
	link.dispatchEvent(click);
	expect(click.defaultPrevented).toBe(true);
	cleanup();
	expect(host.unload).toHaveBeenCalledTimes(1);
	const afterCleanup = new MouseEvent('click', { bubbles: true, cancelable: true });
	link.dispatchEvent(afterCleanup);
	expect(afterCleanup.defaultPrevented).toBe(false);
});

test('a late renderer completion is unloaded and cannot update a disposed preview', async () => {
	let finish!: () => void;
	host.render.mockImplementation(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	);
	const target = document.implementation.createHTMLDocument('late preview');
	const cleanup = mountStylePreview({
		app: {} as App,
		source: document,
		target,
		settings: themeSettings.defaults(),
		mode: 'dark',
		narrow: true,
		language: 'zh',
		t,
	});
	expect(target.body.classList.contains('is-phone')).toBe(true);
	await waitFor(() => expect(host.render).toHaveBeenCalled());
	cleanup();
	finish();
	await waitFor(() => expect(host.unload).toHaveBeenCalledTimes(2));
	expect(target.querySelector('[role=status]')).not.toBeNull();
});

test.each(['synchronous', 'asynchronous'])('a %s renderer failure stays inside the preview', async (kind) => {
	host.render.mockImplementation(() => {
		if (kind === 'synchronous') throw new TypeError('host post-processor failed');
		return Promise.reject(new Error('host render failed'));
	});
	const target = document.implementation.createHTMLDocument('failed preview');
	const cleanup = mountStylePreview({
		app: {} as App,
		source: document,
		target,
		settings: themeSettings.defaults(),
		mode: 'light',
		narrow: false,
		language: 'en',
		t,
	});
	await waitFor(() =>
		expect(target.querySelector('[role=status]')?.textContent).toBe(t('appearance.previewUnavailable')),
	);
	expect(target.querySelector('.huhu-appearance-preview-sample')?.childNodes).toHaveLength(0);
	cleanup();
});

test('the fixed iframe document allows styles and offline fonts but no scripts or external samples', () => {
	expect(PREVIEW_DOCUMENT).toContain("default-src 'none'");
	expect(PREVIEW_DOCUMENT).toContain('img-src data:');
	expect(PREVIEW_DOCUMENT).not.toContain('<script');
	for (const language of ['en', 'zh'] as const) {
		expect(messages[language]['appearance.previewMarkdown']).not.toMatch(/https?:|!\[\[/);
		expect(messages[language]['appearance.previewMarkdown']).toContain('- [x]');
		expect(messages[language]['appearance.previewMarkdown']).toContain('- [X]');
		expect(messages[language]['appearance.previewMarkdown']).toContain('data-huhu-preview-embed');
		expect(messages[language]['appearance.previewMarkdown']).not.toContain('class="internal-embed');
	}
});
