import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { registerMessages, setLanguage } from '../../../shared/i18n';
import type { SettingsHandle } from '../../../shared/settings/store';
import { TestProviders } from '../../../ui/react/test-providers';
import { messages } from '../i18n';
import { safeSettings, type SafeSettings } from '../settings';
import { safeSettingsPage } from './settings-page';

beforeEach(() => { registerMessages(messages); setLanguage('zh'); });

function handle(initial: Partial<SafeSettings> = {}) {
	let value: SafeSettings = { ...safeSettings.defaults(), ...initial };
	const listeners = new Set<() => void>();
	const update = vi.fn(async (change: (draft: SafeSettings) => void) => { value = { ...value }; change(value); for (const listener of listeners) listener(); });
	const settings = { get: () => value, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, update } as unknown as SettingsHandle<SafeSettings>;
	return { settings, update, current: () => value };
}

test('defaults are 20 minutes, no lock on switching or closing, and quitting is always locked', () => {
	const { settings } = handle();
	const Page = safeSettingsPage(settings);
	render(<TestProviders><Page /></TestProviders>);
	expect(screen.getByRole('combobox', { name: '未操作多久后锁定' }).textContent).toContain('20 分钟');
	expect(screen.getByRole('switch', { name: '切换到其他页面或标签时锁定' }).getAttribute('aria-checked')).toBe('false');
	expect(screen.getByRole('switch', { name: '关闭保险箱页面时锁定' }).getAttribute('aria-checked')).toBe('false');
	const quit = screen.getByRole('switch', { name: '关闭 Obsidian 或卸载插件时锁定' });
	expect(quit.getAttribute('aria-checked')).toBe('true');
	expect((quit as HTMLButtonElement).disabled).toBe(true);
	expect(screen.queryByRole('spinbutton')).toBeNull();
});

test('the switches write their own setting and custom time appears only for the custom choice', async () => {
	const { settings, current } = handle({ idlePreset: 'custom', idleCustomMinutes: 45 });
	const Page = safeSettingsPage(settings);
	render(<TestProviders><Page /></TestProviders>);
	expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('45');
	await userEvent.click(screen.getByRole('switch', { name: '切换到其他页面或标签时锁定' }));
	await userEvent.click(screen.getByRole('switch', { name: '关闭保险箱页面时锁定' }));
	expect(current()).toMatchObject({ lockOnSwitch: true, lockOnClose: true, idlePreset: 'custom', idleCustomMinutes: 45 });
});
