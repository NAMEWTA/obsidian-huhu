import { readFileSync } from 'node:fs';
import { SettingsStore, type SettingsFile } from '../../../../shared/settings/store';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type DashboardPlugin from '../../../main';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { DEFAULT_CUSTOM } from '../../../../theme/custom';
import { themeSettings, type ThemeSettings } from '../../../../theme/settings';
import { AppearanceSettings } from './AppearanceSettings';

// The host renderer/iframe lifecycle is covered separately by preview-document.dom.test.tsx.
vi.mock('./StylePreview', () => ({ StylePreview: () => <div data-testid="reading-preview" /> }));

function fixture(initial: Partial<ThemeSettings> = {}) {
	let value: ThemeSettings = { ...themeSettings.defaults(), ...initial };
	const listeners = new Set<() => void>();
	const theme = {
		get: () => value,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		update: async (recipe: (draft: ThemeSettings) => void | ThemeSettings) => {
			const draft = structuredClone(value);
			value = themeSettings.normalize(recipe(draft) ?? draft);
			for (const listener of [...listeners]) listener();
		},
	};
	return { plugin: { theme } as unknown as DashboardPlugin, current: () => value, listeners };
}
const render_ = (plugin: DashboardPlugin) =>
	render(
		<TestProviders>
			<AppearanceSettings plugin={plugin} />
		</TestProviders>,
	);

test.each(['zh', 'en'] as const)(
	'paper/ink interface and independent editor remain selectable (%s)',
	async (language) => {
		setLanguage(language);
		const f = fixture();
		const view = render_(f.plugin);
		const themes = screen.getByRole('group', { name: t('appearance.theme') });
		expect(themes.querySelectorAll('button').length).toBe(3);
		fireEvent.click(within(themes).getByRole('button', { name: t('appearance.preset.ink') }));
		await waitFor(() => expect(f.current().preset).toBe('ink'));
		fireEvent.keyDown(screen.getByRole('combobox', { name: t('appearance.additionalEditors') }), {
			key: 'ArrowDown',
		});
		fireEvent.click(await screen.findByRole('option', { name: t('appearance.scheme.dracula') }));
		await waitFor(() => expect(f.current().editor).toBe('dracula'));
		expect(f.current().preset).toBe('ink');
		view.unmount();
		expect(f.listeners.size).toBe(0);
	},
);

test('SuliWorld decorations only follow the independent editor choice', async () => {
	setLanguage('en');
	const f = fixture({ preset: 'paper', editor: 'suliworld' });
	render_(f.plugin);
	fireEvent.click(screen.getByRole('switch', { name: t('appearance.plainQuotes') }));
	await waitFor(() => expect(f.current().suliworldPlainQuotes).toBe(true));
	expect(screen.getByRole('combobox', { name: t('appearance.suliworldVariant') })).not.toBeNull();
	expect(f.current().preset).toBe('paper');
});

test('custom editor colours keep incomplete drafts and separate light/dark values', async () => {
	setLanguage('en');
	const f = fixture({ editor: 'custom' });
	render_(f.plugin);
	const input = screen.getByRole('textbox', { name: t('appearance.customBackground') });
	fireEvent.change(input, { target: { value: '#12' } });
	expect((input as HTMLInputElement).value).toBe('#12');
	expect(f.current().custom.light.background).toBe('#ffffff');
	fireEvent.change(input, { target: { value: '#112233' } });
	await waitFor(() => expect(f.current().custom.light.background).toBe('#112233'));
	fireEvent.click(screen.getByRole('radio', { name: t('appearance.mode.dark') }));
	fireEvent.change(screen.getByLabelText(t('appearance.customPrimary'), { selector: 'input[type=color]' }), {
		target: { value: '#aabbcc' },
	});
	await waitFor(() => expect(f.current().custom.dark.primary).toBe('#aabbcc'));
	expect(f.current().custom.light.background).toBe('#112233');
});

test('fonts: presets, a custom family list committed on blur, size and line height with reset', async () => {
	setLanguage('en');
	const f = fixture({ fontText: 'custom', fontSize: 18 });
	render_(f.plugin);
	const family = screen.getByRole('textbox', {
		name: t('appearance.fontCustomLabel', { font: t('appearance.fontText') }),
	});
	fireEvent.change(family, { target: { value: 'Lora; Georgia' } });
	expect(f.current().fontTextCustom).toBe('');
	fireEvent.blur(family);
	await waitFor(() => expect(f.current().fontTextCustom).toBe('Lora Georgia'));
	expect(screen.getByText('18px')).not.toBeNull();
	fireEvent.click(
		screen
			.getAllByRole('button', { name: t('appearance.useDefault') })
			.find((button) => !button.hasAttribute('aria-pressed'))!,
	);
	await waitFor(() => expect(f.current().fontSize).toBe(0));
});

test('reset restores the defaults', async () => {
	setLanguage('en');
	const f = fixture({ preset: 'paper', editor: 'nord', fontMono: 'fira', lineHeight: 1.8 });
	render_(f.plugin);
	fireEvent.click(screen.getByRole('button', { name: t('appearance.reset') }));
	await waitFor(() => expect(f.current()).toEqual(themeSettings.defaults()));
});

test('reset style leaves user typography and selected styles intact', async () => {
	setLanguage('en');
	const f = fixture({
		preset: 'ink',
		editor: 'suliworld',
		suliworldVariant: 'forest',
		suliworldCards: 'always',
		suliworldPlainEmbeds: true,
		headings: 'plain',
		fontText: 'kai',
		fontSize: 19,
		lineHeight: 1.9,
	});
	render_(f.plugin);
	fireEvent.click(screen.getByRole('button', { name: t('appearance.resetStyle') }));
	await waitFor(() =>
		expect(f.current()).toMatchObject({
			preset: 'ink',
			editor: 'suliworld',
			suliworldVariant: 'forest',
			suliworldCards: 'always',
			suliworldPlainEmbeds: false,
			headings: 'scheme',
			fontText: 'kai',
			fontSize: 19,
			lineHeight: 1.9,
		}),
	);
});

test('invalid import preserves the active appearance; export uses the new version', async () => {
	setLanguage('en');
	const f = fixture({ preset: 'ink', suliworldVariant: 'forest', fontMono: 'fira' });
	const original = structuredClone(f.current());
	const read = vi
		.spyOn(navigator.clipboard, 'readText')
		.mockResolvedValue(
			JSON.stringify({ kind: 'huhu-appearance', version: 2, settings: { preset: 'future-theme' } }),
		);
	const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
	render_(f.plugin);
	fireEvent.click(screen.getByRole('button', { name: t('appearance.import') }));
	await waitFor(() => expect(read).toHaveBeenCalled());
	expect(f.current()).toEqual(original);
	fireEvent.click(screen.getByRole('button', { name: t('appearance.export') }));
	await waitFor(() => expect(write).toHaveBeenCalled());
	expect(JSON.parse(write.mock.calls[0]![0])).toEqual({ kind: 'huhu-appearance', version: 2, settings: original });
	read.mockRestore();
	write.mockRestore();
});

test('appearance owns persistent failure, one pending save, retained draft and explicit retry', async () => {
	setLanguage('en');
	const f = fixture({ fontText: 'custom' });
	const update = f.plugin.theme.update.bind(f.plugin.theme);
	let reject!: (error: Error) => void;
	const save = vi
		.spyOn(f.plugin.theme, 'update')
		.mockImplementationOnce(
			() =>
				new Promise((_resolve, no) => {
					reject = no;
				}),
		)
		.mockImplementation(update);
	render_(f.plugin);
	const input = screen.getByRole('textbox', {
		name: t('appearance.fontCustomLabel', { font: t('appearance.fontText') }),
	});
	fireEvent.change(input, { target: { value: 'Example Font' } });
	fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
	expect(save).not.toHaveBeenCalled();
	fireEvent.keyDown(input, { key: 'Enter' });
	fireEvent.blur(input);
	await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
	expect(input.closest('fieldset')?.disabled).toBe(true);
	reject(new Error('disk unavailable'));
	const alert = await screen.findByRole('alert');
	expect(alert.textContent).toContain(t('settings.writeFailed'));
	expect((input as HTMLInputElement).value).toBe('Example Font');
	expect(f.current().fontTextCustom).toBe('');
	fireEvent.click(within(alert).getByRole('button', { name: t('workbench.retry') }));
	await waitFor(() => expect(f.current().fontTextCustom).toBe('Example Font'));
	expect(save).toHaveBeenCalledTimes(2);
	expect(screen.queryByRole('alert')).toBeNull();
	expect(input.closest('.huhu-design')).not.toBeNull();
});

test('real SettingsStore publishes before failed persistence and Retry persists the retained value', async () => {
	setLanguage('en');
	const original = { ...themeSettings.defaults(), fontText: 'custom' as const };
	const files: Record<string, SettingsFile | null> = {
		vault: { version: 1, namespaces: { theme: original } },
		device: null,
	};
	let reject!: (error: Error) => void;
	let first = true;
	const save = vi.fn(async (scope: string, file: SettingsFile) => {
		if (first) {
			first = false;
			await new Promise<void>((_resolve, no) => {
				reject = no;
			});
		}
		files[scope] = structuredClone(file);
		return structuredClone(file);
	});
	const store = new SettingsStore(
		{ load: async (scope) => files[scope] ?? null, save },
		{
			timers: {
				set: (fn, ms) => window.setTimeout(fn, ms),
				clear: (timer) => window.clearTimeout(timer as number),
			},
			debounceMs: 0,
		},
	);
	await store.load();
	const theme = store.bind('theme', themeSettings);
	const update = vi.spyOn(theme, 'update');
	const view = render_({ theme } as unknown as DashboardPlugin);
	const input = screen.getByRole('textbox', {
		name: t('appearance.fontCustomLabel', { font: t('appearance.fontText') }),
	});
	try {
		fireEvent.change(input, { target: { value: 'Committed Memory Font' } });
		fireEvent.keyDown(input, { key: 'Enter' });
		fireEvent.blur(input);
		await waitFor(() => expect(save).toHaveBeenCalledOnce());
		expect(update).toHaveBeenCalledOnce();
		expect(theme.get().fontTextCustom).toBe('Committed Memory Font');
		expect(files.vault!.namespaces.theme!.fontTextCustom).toBe('');
		reject(new Error('disk full'));
		const alert = await screen.findByRole('alert');
		expect(store.status).toBe('error');
		expect((input as HTMLInputElement).value).toBe('Committed Memory Font');
		expect(theme.get().fontTextCustom).toBe('Committed Memory Font');
		expect(files.vault!.namespaces.theme!.fontTextCustom).toBe('');
		fireEvent.click(within(alert).getByRole('button', { name: t('workbench.retry') }));
		await waitFor(() => expect(store.status).toBe('idle'));
		expect(update).toHaveBeenCalledTimes(2);
		expect(files.vault!.namespaces.theme!.fontTextCustom).toBe('Committed Memory Font');
		expect(screen.queryByRole('alert')).toBeNull();
	} finally {
		view.unmount();
		await store.dispose();
	}
});

test('continuous slider input preserves the last value while real persistence is pending', async () => {
	setLanguage('en');
	const files: Record<string, SettingsFile | null> = {
		vault: { version: 1, namespaces: { theme: { ...themeSettings.defaults(), fontSize: 18 } } },
		device: null,
	};
	let release: (() => void) | undefined;
	let first = true;
	const save = vi.fn(async (scope: string, file: SettingsFile) => {
		if (first) {
			first = false;
			await new Promise<void>((resolve) => {
				release = resolve;
			});
		}
		files[scope] = structuredClone(file);
		return structuredClone(file);
	});
	const store = new SettingsStore(
		{ load: async (scope) => files[scope] ?? null, save },
		{
			timers: {
				set: (fn, ms) => window.setTimeout(fn, ms),
				clear: (timer) => window.clearTimeout(timer as number),
			},
			debounceMs: 0,
		},
	);
	await store.load();
	const theme = store.bind('theme', themeSettings);
	const view = render_({ theme } as unknown as DashboardPlugin);
	try {
		const slider = screen.getAllByRole('slider')[0]!;
		fireEvent.keyDown(slider, { key: 'ArrowRight' });
		await waitFor(() => expect(save).toHaveBeenCalledOnce());
		expect(theme.get().fontSize).toBe(19);
		fireEvent.keyDown(slider, { key: 'ArrowRight' });
		await waitFor(() => expect(theme.get().fontSize).toBe(20));
		release!();
		await waitFor(() => expect(files.vault!.namespaces.theme!.fontSize).toBe(20));
		await waitFor(() => expect(store.status).toBe('idle'));
	} finally {
		release?.();
		view.unmount();
		await store.dispose();
	}
});

test('closing appearance before clipboard resolution prevents a late import write', async () => {
	setLanguage('en');
	const f = fixture();
	let finish!: (text: string) => void;
	const read = vi.spyOn(navigator.clipboard, 'readText').mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const update = vi.spyOn(f.plugin.theme, 'update');
	const view = render_(f.plugin);
	fireEvent.click(screen.getByRole('button', { name: t('appearance.import') }));
	await waitFor(() => expect(read).toHaveBeenCalledOnce());
	view.unmount();
	finish(
		JSON.stringify({
			kind: 'huhu-appearance',
			version: 2,
			settings: { ...themeSettings.defaults(), preset: 'ink' },
		}),
	);
	await Promise.resolve();
	await Promise.resolve();
	expect(update).not.toHaveBeenCalled();
	expect(f.current().preset).toBe('system');
	read.mockRestore();
});

test('interface preview date and popover never persist settings', async () => {
	setLanguage('en');
	const f = fixture();
	const update = vi.spyOn(f.plugin.theme, 'update');
	render_(f.plugin);
	const preview = document.querySelector('[data-interface-preview]') as HTMLElement;
	const input = within(preview).getByRole('textbox', { name: t('appearance.previewDate') });
	fireEvent.change(input, { target: { value: '2026-11-06' } });
	fireEvent.blur(input);
	fireEvent.click(within(preview).getByRole('button', { name: t('appearance.previewAction') }));
	await screen.findByRole('dialog');
	expect(update).not.toHaveBeenCalled();
	expect(preview.querySelector('.huhu-portal-root [role=dialog]')).not.toBeNull();
});


test.each(['reset', 'copy'] as const)('custom %s persists only the selected mode colors with the real Store', async (action) => {
	setLanguage('en');
	const original: ThemeSettings = {
		...themeSettings.defaults(), preset: 'ink', editor: 'custom', source: 'obsidian', accent: 'plum',
		fontInterface: 'custom', fontInterfaceCustom: 'Interface Font', fontText: 'kai',
		fontMono: 'fira', fontSize: 22, lineHeight: 1.8,
		custom: { light: { background: '#123456', foreground: '#234567', primary: '#345678', border: '#456789', sidebar: '#56789a' },
			dark: { background: '#112233', foreground: '#223344', primary: '#ff0000', border: '#445566', sidebar: '#556677' } },
	};
	const files: Record<string, SettingsFile | null> = { vault: { version: 1, namespaces: { theme: structuredClone(original) } }, device: null };
	const store = new SettingsStore({ load: async scope => files[scope] ?? null, save: async (scope, file) => { files[scope] = structuredClone(file); return file; } }, {
		timers: { set: (fn, ms) => window.setTimeout(fn, ms), clear: timer => window.clearTimeout(timer as number) }, debounceMs: 0,
	});
	await store.load();
	const theme = store.bind('theme', themeSettings);
	const style = document.createElement('style');
	style.textContent = readFileSync('src/theme/styles/editor-schemes.css', 'utf8');
	document.head.append(style);
	const view = render_({ theme } as unknown as DashboardPlugin);
	try {
		if (action === 'reset') {
			const row = screen.getByText(t('appearance.customReset')).closest('[data-slot=settings-row]')!;
			fireEvent.click(within(row as HTMLElement).getByRole('button', { name: t('appearance.useDefault') }));
		} else {
			fireEvent.keyDown(screen.getByRole('combobox', { name: t('appearance.customFrom') }), { key: 'ArrowDown' });
			fireEvent.click(await screen.findByRole('option', { name: t('appearance.scheme.suliworld') }));
		}
		const expected = structuredClone(original);
		expected.custom.light = action === 'reset' ? { ...DEFAULT_CUSTOM.light } : {
			background: '#fbf7f0', foreground: '#1b1a17', primary: '#a13816', border: '#b8431c', sidebar: '#1b1a17',
		};
		await waitFor(() => expect(theme.get()).toEqual(expected));
		await waitFor(() => expect(files.vault!.namespaces.theme).toEqual(expected));
		expect(document.querySelector('body > .huhu-editor--suliworld')).toBeNull();
	} finally { view.unmount(); style.remove(); await store.dispose(); }
});
