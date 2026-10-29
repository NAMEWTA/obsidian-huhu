import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Notice } from 'obsidian';
import { expect, test, vi } from 'vitest';
import { getLanguage, setLanguage } from '../../../shared/i18n';
import { createNativeHost } from './runtime';

for (const language of ['en', 'zh'] as const) test(`independent native installation keeps ${language} progress and checksum failure feedback`, async () => {
	const vault = await mkdtemp(join(tmpdir(), 'huhu-native-feedback-'));
	const previous = getLanguage();
	const notices = (Notice as unknown as { messages: string[] }).messages;
	const before = notices.length;
	const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
	setLanguage(language);
	const host = createNativeHost(() => ({ vault, device: 'test-device', version: '0.0.1', platform: 'linux', arch: 'x64', offline: false, fetch: async () => Buffer.from('invalid checksum') }), globalThis as unknown as Window);
	try {
		await expect(host.acquire('cookies')).rejects.toThrow('checksum');
		const messages = notices.slice(before);
		expect(messages).toContain(language === 'en' ? 'Downloading the terminal helper…' : '正在下载终端组件…');
		expect(messages.at(-1)).toBe(language === 'en' ? 'The terminal helper is not available: the published checksum is missing or invalid' : '终端组件不可用：发布的校验值缺失或无效');
	} finally { await host.dispose(); setLanguage(previous); warning.mockRestore(); await rm(vault, { recursive: true, force: true }); }
});
